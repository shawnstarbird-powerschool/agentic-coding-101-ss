import {
  AuthenticationType,
  BFFApi,
  SessionAuthorizerProps
} from '@ps-refarch/bff-api';
import {
  BACKEND,
  cleanName,
  EventRouter,
  EventRouterAccountEnvProps,
  FRONTEND,
  FrontEnd,
  getNamespace,
  MFEDomain,
  WAFRules
} from '@ps-refarch/cdk-utils';
import { DistrictSettings } from '@ps-refarch/district-settings';
import { CoreStack } from '@ps-refarch/serverless-constructs';
import { CfnOutput, Duration, Fn, RemovalPolicy, Tags } from 'aws-cdk-lib';
import { OriginRequestPolicy } from 'aws-cdk-lib/aws-cloudfront';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as events from 'aws-cdk-lib/aws-events';
import { Rule, RuleTargetInput } from 'aws-cdk-lib/aws-events';
import * as eventTargets from 'aws-cdk-lib/aws-events-targets';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Runtime, StartingPosition, Tracing } from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as transfer from 'aws-cdk-lib/aws-transfer';
import { createHash } from 'crypto';

import { Construct } from 'constructs';
import { join } from 'path';

import { AlertNotifier } from '@ps-refarch/alert-notifications';
import { FeatureFlags } from '@ps-refarch/feature-flag';
import { TenantsV2 } from '@ps-refarch/tenants';
import {
  Certificate,
  CertificateValidation
} from 'aws-cdk-lib/aws-certificatemanager';
import {
  MonitoringFacade,
  SnsAlarmActionStrategy
} from 'cdk-monitoring-constructs';
import {
  FILE_TRANSFER_EVENT_TYPE,
  FOLDER_EVENT_TYPE
} from '../../models/events';
import { getTransferServerConfig } from '../../util/build-utils';
import {
  getBucketEnvNameForKey,
  getBucketNameKey
} from '../../util/env-var-utils';
import {
  getAPIGatewayAlarmConfig,
  getLambdaFunctionAlarmConfig
} from './components/monitoring';
import { MainStackProps } from './main-stack-props';
/* eslint-disable no-new */

export class MainStack extends CoreStack {
  public constructor(
    scope: Construct,
    id: string,
    appStackProps: MainStackProps
  ) {
    if (appStackProps.env == null) {
      throw new Error('must pass fixed environment');
    }

    const { acctEnvProps, packageName, envName } = appStackProps;
    const { isProduction, sharedServiceEnv, caching } = acctEnvProps;
    const namespace = getNamespace(envName);
    const { region } = acctEnvProps.env;
    const isFeatureBranch = envName !== namespace;
    const isDev = namespace === 'dev';
    const cleanEnvName = cleanName(envName, true);

    super(scope, id, {
      ...appStackProps,
      isFeatureBranch,
      selfDestruct: Duration.days(3) // 3 days should be plenty for this project
    });

    // Apply stack-level tags - these will propagate to all resources in the stack
    Tags.of(this).add('application', packageName);
    Tags.of(this).add('environment', envName);
    Tags.of(this).add('managed-by', 'CDK');
    Tags.of(this).add('owner', 'PowerSchoolFTP Team');
    Tags.of(this).add('service', 'Transfer');

    // Check required fields in acct env
    if (
      acctEnvProps.hostedZoneId == null ||
      acctEnvProps.hostedZoneName == null
    ) {
      throw new Error(
        `invalid props for environment ${envName}: ${JSON.stringify(
          acctEnvProps
        )}`
      );
    }

    // Need to specify the session table account right now. Like to fix this in the
    // future.
    if (acctEnvProps.sessionTable?.account == null) {
      throw new Error(
        `account-env.ts must specify sessionTable.account for environment ${envName}`
      );
    }

    // Need to specify the shared services environment.
    if (sharedServiceEnv == null) {
      throw new Error(
        `account-env.ts must specify sharedServiceEnv for environment ${envName}`
      );
    }

    const flags = new FeatureFlags(this, 'feature flags', {
      namespace,
      envName,
      defaultLambdaVars: appStackProps.lambdaVars
      // sdkKey: 'sdk-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX' // Override key if not use Param Store
    });

    // Build everything that has to do with the MFE's domain.
    const domain = new MFEDomain(this, 'MFE domain', {
      envName,
      region,
      hostedZoneId: acctEnvProps.hostedZoneId,
      hostedZoneName: acctEnvProps.hostedZoneName,
      isProduction
    });

    // Set up CloudWatch monitoring and alerting. This is technically optional, but every
    // MFE or service we deploy will need to have these before going to production, and preferably
    // right from the beginning.
    const notifier = new AlertNotifier(this, 'Alert Notifications', {
      namespace,
      region
    });

    const monitoringFacade = new MonitoringFacade(
      this,
      `${cleanName(packageName, true)}-${cleanEnvName}`,
      {
        // Defaults are provided for these, but they can be customized as desired
        metricFactoryDefaults: {
          period: Duration.minutes(10)
        },
        alarmFactoryDefaults: {
          actionsEnabled: true,
          action: new SnsAlarmActionStrategy({
            onAlarmTopic: notifier.alertTopic
          }),
          alarmNamePrefix: `${packageName}-${namespace}`
        }
      }
    );

    // Get the stream ARN from CloudFormation exports
    const appTableStreamArn = Fn.importValue(
      `${packageName}-${cleanEnvName}-AppTableStreamArn`
    );

    // Reference the existing DynamoDB table created by the PermanentResourcesStack
    const appTable = dynamodb.Table.fromTableAttributes(this, 'AppTable', {
      tableName: `${packageName}-${cleanEnvName}`,
      tableStreamArn: appTableStreamArn
    });

    // Reference the SQS queues created by the PermanentResourcesStack
    const externalToInternalQueue = sqs.Queue.fromQueueAttributes(
      this,
      'ExternalToInternalQueue',
      {
        queueName: `${packageName}-${cleanEnvName}-ext-to-int`,
        queueArn: Fn.importValue(
          `${packageName}-${cleanEnvName}-ExternalToInternalQueueArn`
        )
      }
    );

    const internalToExternalQueue = sqs.Queue.fromQueueAttributes(
      this,
      'InternalToExternalQueue',
      {
        queueName: `${packageName}-${cleanEnvName}-int-to-ext`,
        queueArn: Fn.importValue(
          `${packageName}-${cleanEnvName}-InternalToExternalQueueArn`
        )
      }
    );

    const deadLetterQueue = sqs.Queue.fromQueueAttributes(
      this,
      'DeadLetterQueue',
      {
        queueName: `${packageName}-${cleanEnvName}-file-transfer-dlq`,
        queueArn: Fn.importValue(
          `${packageName}-${cleanEnvName}-DeadLetterQueueArn`
        )
      }
    );

    // Reference the existing S3 buckets created by the PermanentResourcesStack
    const productBuckets: Record<string, s3.IBucket> = {};

    // Get product configurations from account environment properties
    const productConfigs = acctEnvProps.products || {};

    // Reference buckets for each product
    Object.entries(productConfigs).forEach(([productCode]) => {
      // Reference the existing internal S3 bucket for this product (for product users)
      const internalBucket = s3.Bucket.fromBucketName(
        this,
        `${productCode}InternalBucket`,
        `${packageName}-${cleanEnvName}-${productCode.toLowerCase()}-int`
      );

      // Reference the existing external S3 bucket for this product (for human users)
      const externalBucket = s3.Bucket.fromBucketName(
        this,
        `${productCode}ExternalBucket`,
        `${packageName}-${cleanEnvName}-${productCode.toLowerCase()}-ext`
      );

      // Store the bucket references for later use
      productBuckets[getBucketNameKey(productCode, 'int')] = internalBucket;
      productBuckets[getBucketNameKey(productCode, 'ext')] = externalBucket;
    });

    // Reference the audit table created by the PermanentResourcesStack
    const auditTable = dynamodb.Table.fromTableAttributes(this, 'AuditTable', {
      tableName: `${packageName}-${cleanEnvName}-audit`
    });

    // Look up the default EventBridge bus
    const eventBus = events.EventBus.fromEventBusArn(
      this,
      'DefaultEventBus',
      `arn:aws:events:${region}:${this.account}:event-bus/default`
    );

    // Create an EventRouter to forward events if the products are configured for it.
    const allForwardEvents: {
      productCode: string;
      account: string;
    }[] = [];
    Object.values(productConfigs).forEach((productConfig) => {
      const { productCode, forwardEvents, accessAccounts } = productConfig;
      if (Array.isArray(forwardEvents) && forwardEvents.length > 0) {
        forwardEvents.forEach((account) => {
          allForwardEvents.push({
            productCode,
            account
          });
        });
      } else if (forwardEvents && accessAccounts.length > 0) {
        accessAccounts.forEach((account) => {
          allForwardEvents.push({
            productCode,
            account
          });
        });
      }
    });

    if (
      allForwardEvents.length > 0 &&
      (!isFeatureBranch || envName.endsWith('-e'))
    ) {
      const acctName = `powerftp-${cleanEnvName}`;
      const metadata = {
        accounts: [
          ...allForwardEvents.map((fe) => ({
            name: `account-${fe.productCode}`,
            account: fe.account
          })),
          {
            name: acctName,
            account: this.account
          }
        ]
      };
      const routerProps: EventRouterAccountEnvProps = {
        env: acctEnvProps.env,
        names: [namespace],
        forwardEvents: allForwardEvents.map((fe) => ({
          filter: {
            detailType: [FOLDER_EVENT_TYPE, FILE_TRANSFER_EVENT_TYPE],
            detail: {
              metadata: {
                envName: [envName],
                productCode: [fe.productCode]
              }
            }
          },
          targets: [
            {
              account: fe.account
            },
            ...(isProduction
              ? []
              : [
                  {
                    service: 'logs' as const,
                    filter: false
                  }
                ])
          ]
        }))
      };

      let prefixClause: { prefix?: string } = {};
      if (isFeatureBranch) {
        const shortHash = createHash('sha256')
          .update(cleanEnvName)
          .digest('hex')
          .slice(0, 8);

        prefixClause = { prefix: `${packageName}-${shortHash}` };
      }

      new EventRouter(this, 'cross-account router', {
        acctEnvProps: routerProps,
        acctName,
        env: acctEnvProps.env,
        packageName,
        metadata,
        showRouting: true,
        ...prefixClause
      });
    } else {
      console.log(`✅ Skipping EventRouter creation.`);
    }

    // Common lambda environment variables
    const environment = {
      ...flags.lambdaVars,
      AWS_ACCOUNT_ID: this.account,
      PS_ENVIRONMENT: envName,
      PS_NAMESPACE: namespace,
      PS_PACKAGE_NAME: packageName,
      PS_SHARED_SERVICE_ENV: sharedServiceEnv,
      APP_TABLE_NAME: appTable.tableName,
      AUDIT_TABLE_NAME: auditTable.tableName,
      PRODUCT_CONFIGS: JSON.stringify(productConfigs),
      EVENT_BUS_ARN: eventBus.eventBusArn,
      // Pass product bucket names as environment variables
      ...Object.entries(productBuckets).reduce((env, [bucketKey, bucket]) => {
        // eslint-disable-next-line no-param-reassign
        env[getBucketEnvNameForKey(bucketKey)] = bucket.bucketName;
        return env;
      }, {} as Record<string, string>)
    };

    // Create the audit stream processor Lambda function
    const auditStreamProcessor = new NodejsFunction(
      this,
      'AuditStreamProcessor',
      {
        entry: join(__dirname, '../../functions/audit-stream-handler.ts'),
        handler: 'handler',
        runtime: Runtime.NODEJS_22_X,
        timeout: Duration.seconds(30),
        memorySize: 256,
        tracing: Tracing.ACTIVE,
        logRetention: logs.RetentionDays.ONE_WEEK,
        environment,
        bundling: {
          minify: true,
          sourceMap: true,
          externalModules: ['aws-sdk']
        }
      }
    );

    // Grant the Lambda function permission to write to the audit table
    auditTable.grantWriteData(auditStreamProcessor);

    // Create the event source mapping to trigger the Lambda from the DynamoDB stream
    auditStreamProcessor.addEventSource(
      new lambdaEventSources.DynamoEventSource(appTable, {
        startingPosition: StartingPosition.LATEST,
        batchSize: 100,
        retryAttempts: 3,
        enabled: true
      })
    );

    // Add monitoring for the audit stream processor
    monitoringFacade.monitorLambdaFunction({
      lambdaFunction: auditStreamProcessor,
      alarmFriendlyName: 'AuditStreamProcessor',
      ...getLambdaFunctionAlarmConfig({ namespace })
    });

    // Create IAM roles for Transfer Family
    const transferUserRole = new iam.Role(this, 'TransferUserRole', {
      assumedBy: new iam.ServicePrincipal('transfer.amazonaws.com'),
      description: 'IAM role for Transfer Family SFTP users'
    });

    // Add permissions for Transfer Family to access all product buckets
    if (Object.keys(productBuckets).length > 0) {
      const bucketResources: string[] = [];

      // Collect all bucket ARNs and their contents
      Object.values(productBuckets).forEach((bucket) => {
        bucketResources.push(bucket.bucketArn);
        bucketResources.push(`${bucket.bucketArn}/*`);
      });

      // Add a policy allowing Transfer Family to access all buckets
      transferUserRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            's3:PutObject',
            's3:GetObject',
            's3:DeleteObject',
            's3:DeleteObjectVersion',
            's3:GetBucketLocation',
            's3:ListBucket',
            's3:ListBucketMultipartUploads',
            's3:HeadObject' // Add permission to check if objects exist
          ],
          resources: bucketResources
        })
      );
    } else {
      // If no products are configured, log a warning
      console.warn('No product configurations found. No S3 buckets created.');
    }

    const transferInvocationRole = new iam.Role(
      this,
      'TransferInvocationRole',
      {
        assumedBy: new iam.ServicePrincipal('transfer.amazonaws.com'),
        description:
          'Role for Transfer Family to invoke API Gateway for custom identity provider'
      }
    );

    // Configure Session authentication properties
    const cookieMappingDomain = isProduction
      ? 'powerschool.com'
      : 'powerschoolcorp.com';
    const sessionAuthorizerProps: SessionAuthorizerProps = {
      account: acctEnvProps.sessionTable?.account,
      region: this.region,
      envName: sharedServiceEnv,
      appCookieMappings: {
        [`admin.${cookieMappingDomain}`]: 'adminsessiontoken',
        'fileshare.powerschoolcorp.com': 'adminsessiontoken' // For standalone testing
      }
    };

    // Create policy statements for Lambda functions
    const dynamoDbPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:Query',
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem'
      ],
      resources: [
        appTable.tableArn,
        `${appTable.tableArn}/index/*`,
        auditTable.tableArn,
        `${auditTable.tableArn}/index/*`
      ]
    });

    const s3PolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:HeadObject',
        's3:PutObject',
        's3:GetObject',
        's3:ListBucket',
        's3:GetObjectTagging',
        's3:PutObjectTagging',
        's3:DeleteObject'
      ],
      resources: Object.values(productBuckets).flatMap((bucket) => [
        bucket.bucketArn,
        `${bucket.bucketArn}/*`
      ])
    });

    // Create policy for Lambda functions to access SQS queues
    const sqsPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sqs:ReceiveMessage',
        'sqs:DeleteMessage',
        'sqs:GetQueueAttributes',
        'sqs:ChangeMessageVisibility',
        'sqs:SendMessage'
      ],
      resources: [
        externalToInternalQueue.queueArn,
        internalToExternalQueue.queueArn,
        deadLetterQueue.queueArn
      ]
    });

    // Create policy for Lambda functions to write to the default EventBridge bus
    const eventBridgePolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['events:PutEvents'],
      resources: [eventBus.eventBusArn]
    });

    // Collect all unique access accounts from products
    const productAccessAccounts = Object.values(acctEnvProps.products || {})
      .flatMap((product) => product.accessAccounts || [])
      .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

    const bffApi = new BFFApi(this, 'BFFs', {
      domain,
      apiName: `${packageName} ${envName} Rest Api`,
      accessAccounts: [this.account, ...productAccessAccounts],
      enableOpenApi: true,
      // Commenting out the doc viewer because it's failing with a weird error:
      // Received response status [FAILED] from custom resource. Message returned: Command '['/opt/awscli/aws', 's3', 'sync', '--delete', '/tmp/tmpm43deuvx/contents', 's3://power-f
      // tp-dev-clnst-7281--bffsapidocviewerusersapi-ligjwjpujfex/']' died with <Signals.SIGKILL: 9>. (RequestId: c9ca2546-b9eb-400b-a298-9cd1565905f4)
      // buildApiDocViewer: true,
      description: `
This is the API for the FTP service. It has endpoints that fall into two categories:
1. GET /servers/{serverId}/users/{username}/config endpoint for the Transfer Family service to call
    to authenticate users. This is a custom identity provider for Transfer Family.
2. POST endpoints to manage the FTP service. These endpoints are used by the front end and
    other products to manage the FTP service.
3. User management endpoints for CRUD operations on users.
`,
      functions: {
        'GET /servers/{serverId}/users/{username}/config': {
          path: 'auth-handler',
          handler: 'handler',
          authenticationType: AuthenticationType.IAM,
          props: {
            environment: {
              ...environment,
              TRANSFER_USER_ROLE_ARN: transferUserRole.roleArn
            }
          }
        },
        'POST /products': {
          path: 'post-product-handler',
          handler: 'handler',
          authenticationType: AuthenticationType.IAM,
          description:
            'Create a new product with specified configuration details',
          requestModels: { 'application/json': 'PostProduct' }
        },
        // User CRUD endpoints with Session authentication
        'GET /users': {
          path: 'get-users-handler',
          handler: 'handler',
          authenticationType: AuthenticationType.Session,
          description: 'List all users for the tenant',
          cors: true,
          methodResponses: [
            {
              statusCode: '200',
              responseModels: {
                'application/json': 'GetUserResponse'
              }
            }
          ]
        },
        'GET /users/{id}': {
          path: 'get-users-handler',
          handler: 'handler',
          authenticationType: AuthenticationType.Session,
          description: 'Get a specific user by ID',
          cors: true,
          methodResponses: [
            {
              statusCode: '200',
              responseModels: {
                'application/json': 'GetUsersResponse'
              }
            }
          ]
        },
        'POST /users': {
          path: 'create-user-handler',
          handler: 'handler',
          authenticationType: AuthenticationType.Session,
          description: 'Create a new user',
          cors: true,
          requestModels: { 'application/json': 'PostUserRequestPayload' }
        },
        'PUT /users/{id}': {
          path: 'update-user-handler',
          handler: 'handler',
          authenticationType: AuthenticationType.Session,
          description: 'Update an existing user',
          cors: true,
          requestModels: { 'application/json': 'UpdateUserRequestPayload' }
        },
        'GET /products': {
          path: 'get-product-handler',
          handler: 'handler',
          authenticationType: AuthenticationType.Session,
          description: 'Get all product records',
          cors: true,
          methodResponses: [
            {
              statusCode: '200',
              responseModels: {
                'application/json': 'GetProductsResponse'
              }
            }
          ]
        },
        'GET /service/products': {
          path: 'get-product-handler',
          handler: 'handler',
          authenticationType: AuthenticationType.IAM,
          description: 'Get all product records (service-to-service)',
          methodResponses: [
            {
              statusCode: '200',
              responseModels: {
                'application/json': 'GetProductsResponse'
              }
            }
          ]
        },
        // Folder CRUD endpoints with Session authentication
        'GET /folders': {
          path: 'get-folders-handler',
          handler: 'handler',
          authenticationType: AuthenticationType.Session,
          description: 'List all folders for the tenant',
          cors: true,
          methodResponses: [
            {
              statusCode: '200',
              responseModels: {
                'application/json': 'GetFoldersResponse'
              }
            }
          ]
        },
        'GET /folders/{id}': {
          path: 'get-folders-handler',
          handler: 'handler',
          authenticationType: AuthenticationType.Session,
          description: 'Get a specific folder by ID',
          cors: true,
          methodResponses: [
            {
              statusCode: '200',
              responseModels: {
                'application/json': 'GetFolderResponse'
              }
            }
          ]
        },
        'POST /folders': {
          path: 'post-folder-handler',
          handler: 'handler',
          authenticationType: AuthenticationType.Session,
          description: 'Create a new folder',
          cors: true,
          requestModels: { 'application/json': 'PostFolderRequestPayload' }
        },
        'PUT /folders/{id}': {
          path: 'update-folder-handler',
          handler: 'handler',
          authenticationType: AuthenticationType.Session,
          description: 'Update an existing folder',
          cors: true,
          requestModels: { 'application/json': 'UpdateFolderRequestPayload' }
        },
        // New IAM-authenticated endpoint for service-to-service access
        'GET /service/folders/{districtId}': {
          path: 'get-folders-handler',
          handler: 'handler',
          authenticationType: AuthenticationType.IAM,
          description:
            'List all folders for a specific tenant (service-to-service)',
          methodResponses: [
            {
              statusCode: '200',
              responseModels: {
                'application/json': 'GetFoldersResponse'
              }
            }
          ]
        },
        'GET /service/folders/{districtId}/{id}': {
          path: 'get-folders-handler',
          handler: 'handler',
          authenticationType: AuthenticationType.IAM,
          description:
            'Get a specific folder by ID for a specific tenant (service-to-service)',
          methodResponses: [
            {
              statusCode: '200',
              responseModels: {
                'application/json': 'GetFolderResponse'
              }
            }
          ]
        },
        'GET /service/tenants/{tenantId}': {
          path: 'get-tenant-handler',
          handler: 'handler',
          authenticationType: AuthenticationType.IAM,
          description: 'Get a specific tenant by ID (service-to-service)',
          methodResponses: [
            {
              statusCode: '200',
              responseModels: {
                'application/json': 'GetTenantResponse'
              }
            }
          ]
        },
        // New endpoint for session handling
        'GET /session': {
          path: 'session-handler',
          handler: 'handler',
          unauthenticated: true,
          description:
            'Sets a session cookie and redirects to the non-API hostname',
          cors: true
        }
      },
      baseDir: join(__dirname, '../../functions'),
      isFeatureBranch,
      isProduction,
      sessionAuthorizerProps,

      // Enable and configure monitoring and alerting. This is technically optional, but all
      // services going to production will need to have this in some form or another.
      monitoringFacade,
      apiGatewayAlarmConfig: getAPIGatewayAlarmConfig({
        namespace,
        prefix: packageName
      }),
      lambdaFunctionAlarmConfig: getLambdaFunctionAlarmConfig({ namespace }),

      // Default environment variables added to every lambda. These include among other things
      // feature flag configuration.
      props: {
        environment,
        tracing: Tracing.ACTIVE,
        runtime: Runtime.NODEJS_22_X,
        // This memory size is very variable. It appears with node18 it is more sensitive to memory
        // size; in some cases, we found the lambda would hang in initialization (probably thrashing),
        // until the API Gateway timed it out at 29 seconds. Range is 128 (the default) to 10240.
        // You should start with some number that is reasonably large, then you can optimize it.
        memorySize: 2048,
        initialPolicy: [
          dynamoDbPolicyStatement,
          s3PolicyStatement,
          sqsPolicyStatement,
          eventBridgePolicyStatement
        ],
        // In case it gets rate limited
        logRetentionRetryOptions: {
          maxRetries: 10
        }
      },
      modelsDir: join(__dirname, '../../models'),
      tsConfig: join(__dirname, '../', 'tsconfig.json')
    });

    // WAF rule that blocks everything that isn't from the US or India
    new WAFRules(this, 'GeoRestrictionWAF', {
      classKey: 'GeoRestriction',
      appKey: `${packageName}-${cleanEnvName}`,
      dependencyArns: [], // No dependencies
      rules: {
        GeoRestrictionRule: {
          scope: 'REGIONAL',
          Action: {
            Block: {}
          },
          Statement: {
            AndStatement: {
              Statements: [
                {
                  ByteMatchStatement: {
                    PositionalConstraint: 'EXACTLY',
                    SearchString: new TextEncoder().encode(
                      domain.getDomainName(BACKEND)
                    ),
                    FieldToMatch: {
                      SingleHeader: {
                        Name: 'Host'
                      }
                    },
                    TextTransformations: [
                      {
                        Priority: 0,
                        Type: 'NONE'
                      }
                    ]
                  }
                },
                {
                  NotStatement: {
                    Statement: {
                      GeoMatchStatement: {
                        CountryCodes: ['US', 'IN'], // Block everything except US and India
                        ForwardedIPConfig: {
                          HeaderName: 'X-Forwarded-For',
                          FallbackBehavior: 'NO_MATCH'
                        }
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      }
    });

    // Access (or create) the tenants table
    const tenants = new TenantsV2(this, 'Tenants Table', {
      env: appStackProps.env,
      environmentName: envName,
      namespace,
      lambdaVars: flags.lambdaVars
    });

    // Create the district settings webhook. Note that for dev environments,
    // there won't be any verification of the JWT. This makes testing easier.
    const districtSettings = new DistrictSettings(this, 'District Settings', {
      environmentName: envName,
      namespace,
      isProduction,
      lambdaVars: flags.lambdaVars,
      tenantsTable: tenants.tenantsTable,
      testOnlyNoVerifyJWT: envName.startsWith('dev'),
      sharedServiceEnv,
      fillFromDistrictSettings: true,
      api: bffApi.api,
      // eslint-disable-next-line no-underscore-dangle
      resourcePolicy: bffApi._policy
    });

    // Create the district settings handler Lambda function
    const districtSettingsHandler = new NodejsFunction(
      this,
      'DistrictSettingsHandler',
      {
        runtime: Runtime.NODEJS_22_X,
        entry: join(__dirname, '../../functions/handle-district-settings.ts'),
        handler: 'handler',
        timeout: Duration.seconds(30),
        memorySize: 512,
        environment,
        tracing: Tracing.ACTIVE,
        initialPolicy: [dynamoDbPolicyStatement]
      }
    );

    // Add the Lambda function as a target for district settings events
    districtSettings.addLambdaTarget(districtSettingsHandler);

    new CfnOutput(this, 'DistrictSettingsAPI', {
      value: districtSettings.api.domainName?.domainName || 'UNKNOWN-DOMAIN'
    });

    // Create the delete cleanup handler Lambda function
    const cleanupHandler = new NodejsFunction(this, 'CleanupHandler', {
      runtime: Runtime.NODEJS_22_X,
      entry: join(
        __dirname,
        '../../functions/delete-inactive-objects-handler.ts'
      ),
      handler: 'handler',
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment,
      tracing: Tracing.ACTIVE,
      initialPolicy: [dynamoDbPolicyStatement, s3PolicyStatement]
    });

    // Create an EventBridge rule to trigger the cleanup handler daily at midnight UTC
    const rule = new events.Rule(this, 'DailyInactiveObjectsCleanupRule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '0' }), // Run at midnight UTC every day
      description:
        'Triggers the cleanup handler to delete inactive objects (users, folders, etc.) daily at midnight'
    });

    // Add the Lambda function as a target for the EventBridge rule
    rule.addTarget(new eventTargets.LambdaFunction(cleanupHandler));

    new CfnOutput(this, 'CleanupHandlerName', {
      value: cleanupHandler.functionName,
      description: 'Name of the cleanup handler Lambda function'
    });

    // Build the front end. Note that we actually do NOT create Real User Monitoring in production.
    // This seems counter-intuitive, but we use it in pre-prod for Fake User Monitoring, and in
    // production, RUM is handled by the Host Application. This might not be what you want: if you
    // are in the staging environment for example, we don't want each MFE to have its own RUM.
    // const createRUM = !isProduction && !isFeatureBranch;
    const createRUM = false;

    new FrontEnd(this, 'Front End', {
      domain,
      envName,
      webRoot: join(__dirname, '../../../ui/dist'),
      isProduction,
      createRUM,
      compress: !isDev,
      // restrictAccess: {
      //   allowPaths: ['users', 'folders', 'edit']
      // },
      cache: caching, // Defaults to undefined (cache in production only), but you can set this in the account-env.ts
      // Reuse origin request policy. Without this, you may run out of these in an account
      passHeadersToOrigins: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      backEndAPI: [
        // Connect the BFF API to the front end. This is so it can receive local
        // testing calls. However, we need to remove the API indicator component
        // of the URI with a CF function. Generally we don't want to do this (we
        // want to connect directly to the backend to allow multi-region deployment)
        // so for new projects this is commented out.
        // {
        //   apiGatewayResource: bffApi.api,
        //   path: '/api/*',
        //   cfFunction: readFileSync(
        //     join(__dirname, 'cf-functions/unmfe-uri.js')
        //   ).toString()
        // }
      ]
    });

    // Create the inbound file pusher Lambda function
    const inboundFilePusherFunction = new NodejsFunction(
      this,
      'InboundFilePusherFunction',
      {
        runtime: Runtime.NODEJS_22_X,
        entry: join(
          __dirname,
          '../../functions/inbound-file-pusher-handler.ts'
        ),
        handler: 'handler',
        timeout: Duration.seconds(300), // 5 minutes
        memorySize: 1024,
        environment: {
          ...environment
        },
        tracing: Tracing.ACTIVE,
        initialPolicy: [
          s3PolicyStatement,
          sqsPolicyStatement,
          eventBridgePolicyStatement
        ]
      }
    );

    // Add SQS trigger for inbound file pusher
    inboundFilePusherFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(externalToInternalQueue, {
        batchSize: 10,
        maxBatchingWindow: Duration.seconds(30)
      })
    );

    // Create the outbound file pusher Lambda function
    const outboundFilePusherFunction = new NodejsFunction(
      this,
      'OutboundFilePusherFunction',
      {
        runtime: Runtime.NODEJS_22_X,
        entry: join(
          __dirname,
          '../../functions/outbound-file-pusher-handler.ts'
        ),
        handler: 'handler',
        timeout: Duration.seconds(300), // 5 minutes
        memorySize: 1024,
        environment: {
          ...environment
        },
        tracing: Tracing.ACTIVE,
        initialPolicy: [s3PolicyStatement, sqsPolicyStatement]
      }
    );

    // Add SQS trigger for outbound file pusher
    outboundFilePusherFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(internalToExternalQueue, {
        batchSize: 10,
        maxBatchingWindow: Duration.seconds(30)
      })
    );

    // Grant permissions to the Lambda functions to log transfers
    appTable.grantReadWriteData(inboundFilePusherFunction);
    appTable.grantReadWriteData(outboundFilePusherFunction);

    if (monitoringFacade) {
      // Add monitoring for the Lambda functions
      monitoringFacade.monitorLambdaFunction({
        lambdaFunction: inboundFilePusherFunction
      });
      monitoringFacade.monitorLambdaFunction({
        lambdaFunction: outboundFilePusherFunction
      });

      // Add monitoring for the SQS queues
      monitoringFacade.monitorSqsQueue({
        queue: externalToInternalQueue
      });
      monitoringFacade.monitorSqsQueue({
        queue: internalToExternalQueue
      });
    }

    // Output the Lambda function ARNs
    new CfnOutput(this, 'InboundFilePusherFunctionArn', {
      value: inboundFilePusherFunction.functionArn,
      description: 'ARN of the inbound file pusher Lambda function'
    });

    new CfnOutput(this, 'OutboundFilePusherFunctionArn', {
      value: outboundFilePusherFunction.functionArn,
      description: 'ARN of the outbound file pusher Lambda function'
    });

    new CfnOutput(this, 'Rest API Info', {
      value: `Rest API Id: ${bffApi.api.restApiId}, Name: ${bffApi.api.restApiName}, Url: ${bffApi.api.url},`
    });

    // Grant Transfer Family role permission to invoke API Gateway endpoint
    transferInvocationRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['execute-api:Invoke'],
        resources: [bffApi.api.arnForExecuteApi('GET', '/*', 'prod')]
      })
    );

    new CfnOutput(this, 'Front End DNS', {
      value: domain.getDomainName(FRONTEND)
    });

    new CfnOutput(this, 'Back End DNS', {
      value: domain.getDomainName(BACKEND)
    });

    // Create CloudWatch log group for SFTP server
    const sftpLogGroup = new logs.LogGroup(this, 'SFTPLogGroup', {
      logGroupName: `/aws/transfer/${packageName}-${cleanEnvName}`,
      retention: isProduction
        ? logs.RetentionDays.ONE_YEAR
        : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY
    });

    // Create IAM role for SFTP server logging
    const sftpLoggingRole = new iam.Role(this, 'SFTPLoggingRole', {
      assumedBy: new iam.ServicePrincipal('transfer.amazonaws.com')
    });

    sftpLoggingRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogStream',
          'logs:DescribeLogStreams',
          'logs:CreateLogGroup',
          'logs:PutLogEvents'
        ],
        resources: ['arn:aws:logs:*:*:log-group:/aws/transfer/*']
      })
    );

    // Allow SFTP server to send messages to the external-to-internal queue
    sftpLoggingRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sqs:SendMessage'],
        resources: [externalToInternalQueue.queueArn]
      })
    );

    new CfnOutput(this, 'API URL', {
      value: bffApi.api.url
    });

    // Use the VPC created in account-stack.ts
    // Try to get vpcId from props first, if not available, import from CloudFormation exports
    let vpc: ec2.IVpc;
    if (acctEnvProps.vpcId) {
      // If we have a concrete VPC ID, use fromLookup
      vpc = ec2.Vpc.fromLookup(this, 'ImportedVpc', {
        vpcId: acctEnvProps.vpcId
      });
    } else {
      // If we need to import from CloudFormation exports, use fromVpcAttributes
      const vpcId = Fn.importValue(`${this.account}-${this.region}-vpc-id`);
      const privateSubnetIds = Fn.split(
        ',',
        Fn.importValue(`${this.account}-${this.region}-private-subnet-ids`)
      );
      const publicSubnetIds = Fn.split(
        ',',
        Fn.importValue(`${this.account}-${this.region}-public-subnet-ids`)
      );

      vpc = ec2.Vpc.fromVpcAttributes(this, 'ImportedVpc', {
        vpcId,
        availabilityZones: Fn.getAzs(),
        privateSubnetIds,
        publicSubnetIds
      });
    }

    // Create a security group for the Transfer Family server
    const transferSecurityGroup = new ec2.SecurityGroup(
      this,
      'TransferSecurityGroup',
      {
        vpc,
        description: 'Security group for Transfer Family server',
        securityGroupName: `${packageName}-${cleanEnvName}-transfer-sg`,
        allowAllOutbound: true
      }
    );

    // Add inbound rules for SFTP (port 22) and FTPS (ports 21, 990, and passive port range)
    transferSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SFTP traffic'
    );
    transferSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(21),
      'Allow FTPS control channel'
    );
    transferSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(990),
      'Allow FTPS implicit SSL'
    );
    transferSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcpRange(8000, 9000),
      'Allow FTPS passive port range'
    );

    // Add a Name tag to the security group
    Tags.of(transferSecurityGroup).add(
      'Name',
      `${packageName}-${cleanEnvName}-transfer-sg`
    );

    // Output the security group ID
    new CfnOutput(this, 'TransferSecurityGroupId', {
      description: 'Security Group ID for Transfer Family server',
      value: transferSecurityGroup.securityGroupId
    });

    // Create a reference to the existing hosted zone
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      'HostedZone',
      {
        hostedZoneId: acctEnvProps.hostedZoneId,
        zoneName: acctEnvProps.hostedZoneName
      }
    );

    // Determine if we should create the Transfer Family server and with which protocols
    const { protocols, createTransferServer } = getTransferServerConfig({
      envName
    });

    // Create Transfer Family server if needed
    if (createTransferServer) {
      const customTransferFamilyHostname = `files.${cleanEnvName}.${acctEnvProps.hostedZoneName}`;

      // Create a certificate for FTPS server with automatic DNS validation
      const ftpsCertificate = new Certificate(this, 'FTPSCertificate', {
        domainName: customTransferFamilyHostname,
        validation: CertificateValidation.fromDns(hostedZone),
        certificateName: `${packageName}-${cleanEnvName}-ftps-certificate`
      });

      // When using an imported VPC, we need to use the explicitly imported subnet IDs
      // rather than calling selectSubnets() which doesn't work reliably on imported VPCs
      const publicSubnetIds = Fn.split(
        ',',
        Fn.importValue(`${this.account}-${this.region}-public-subnet-ids`)
      );

      const numAZs = 2;

      // Create a fixed set of EIPs, one for each expected subnet
      const transferEips: ec2.CfnEIP[] = [];

      // Create EIPs with explicit iteration to ensure proper matching
      for (let i = 0; i < numAZs; i += 1) {
        transferEips.push(
          new ec2.CfnEIP(this, `TransferEIP${i}`, {
            domain: 'vpc',
            tags: [
              {
                key: 'Name',
                value: `${packageName}-${cleanEnvName}-transfer-eip-${i + 1}`
              }
            ]
          })
        );
      }

      // Get the allocation IDs from the created EIPs
      const eipAllocationIds = transferEips.map((eip) => eip.attrAllocationId);

      console.log(
        `Created ${eipAllocationIds.length} EIPs for Transfer server`
      );
      // Create a server only if we have EIPs
      if (transferEips.length === 0) {
        throw new Error('No EIPs created for Transfer server');
      }

      // Create a Route53 CNAME record pointing to the Transfer server endpoint

      const transferServer = new transfer.CfnServer(this, 'TransferServer', {
        protocols,
        identityProviderType: 'API_GATEWAY',
        endpointType: 'VPC',
        endpointDetails: {
          vpcId: vpc.vpcId,
          subnetIds: [
            Fn.select(0, publicSubnetIds),
            Fn.select(1, publicSubnetIds)
          ],
          securityGroupIds: [transferSecurityGroup.securityGroupId],
          addressAllocationIds: eipAllocationIds
        },
        loggingRole: sftpLoggingRole.roleArn,
        domain: 'S3',
        identityProviderDetails: {
          url: bffApi.api.url,
          invocationRole: transferInvocationRole.roleArn
        },
        structuredLogDestinations: [sftpLogGroup.logGroupArn],
        certificate: ftpsCertificate.certificateArn, // Add a certificate for FTPS
        protocolDetails: {
          // Configure passive port range for FTPS
          passiveIp: 'AUTO', // AWS will automatically assign IP addresses
          tlsSessionResumptionMode: 'ENFORCED' // Enforce TLS session resumption for better security
        },
        tags: [
          {
            key: 'Name',
            value: `${packageName}-${cleanEnvName}-transfer-server`
          },
          {
            key: 'transfer:route53HostedZoneId',
            value: `/hostedzone/${acctEnvProps.hostedZoneId}`
          },
          {
            key: 'transfer:customHostname',
            value: customTransferFamilyHostname
          }
        ]
      });

      // For VPC endpoints, we need to create the DNS name based on the server ID
      // Format: server-id.server.transfer.region.amazonaws.com
      const transferEndpointDns = `${transferServer.attrServerId}.server.transfer.${region}.amazonaws.com`;

      new route53.CnameRecord(this, 'TransferServerDnsRecord', {
        zone: hostedZone,
        recordName: customTransferFamilyHostname,
        domainName: transferEndpointDns,
        ttl: Duration.minutes(5),
        comment: `CNAME record for ${packageName}-${cleanEnvName} Transfer Family server`
      });

      // Add output for Transfer server custom hostname
      new CfnOutput(this, 'Transfer Server Hostname', {
        value: customTransferFamilyHostname
      });

      // Output Transfer server endpoint ID (not a full domain with VPC endpoints)
      new CfnOutput(this, 'Transfer Server ID', {
        value: transferServer.attrServerId
      });

      // Output the certificate ARN for reference
      new CfnOutput(this, 'FTPS Certificate ARN', {
        value: ftpsCertificate.certificateArn
      });

      // Output the Elastic IP addresses for reference
      transferEips.forEach((eip, index) => {
        new CfnOutput(this, `TransferEIPOutput${index + 1}`, {
          value: eip.ref,
          description: `Elastic IP ${
            index + 1
          } associated with the Transfer server`
        });
      });
    }

    // --- GuardDuty Malware Scan Result Processing ---
    const guarddutyMalwareResultHandler = new NodejsFunction(
      this,
      'GuardDutyMalwareResultHandler',
      {
        runtime: Runtime.NODEJS_22_X,
        entry: join(
          __dirname,
          '../../functions/guardduty-malware-result-handler.ts'
        ),
        handler: 'handler',
        timeout: Duration.seconds(60),
        memorySize: 256,
        environment,
        initialPolicy: [s3PolicyStatement, dynamoDbPolicyStatement],
        logRetention: logs.RetentionDays.ONE_WEEK,
        tracing: Tracing.ACTIVE,
        bundling: {
          minify: true,
          sourceMap: true,
          externalModules: ['aws-sdk']
        }
      }
    );

    // EventBridge rule for GuardDuty malware scan results
    const guarddutyMalwareResultRule = new Rule(
      this,
      'GuardDutyMalwareResultRule',
      {
        eventPattern: {
          source: ['aws.guardduty'],
          detailType: ['GuardDuty Malware Protection Object Scan Result']
        }
      }
    );
    guarddutyMalwareResultRule.addTarget(
      new LambdaFunction(guarddutyMalwareResultHandler, {
        event: RuleTargetInput.fromEventPath('$')
      })
    );

    // --- CloudWatch Alarm for GuardDuty Malware Detection ---
    const malwareDetectedAlarm = new cloudwatch.Alarm(
      this,
      'GuardDutyMalwareDetectedAlarm',
      {
        alarmName: `${packageName}-${cleanEnvName}-GuardDutyMalwareDetected`,
        metric: new cloudwatch.Metric({
          namespace: 'PowerFTP/GuardDuty',
          metricName: 'GuardDutyInfectedObject',
          statistic: 'Sum',
          period: Duration.minutes(5),
          dimensionsMap: {} // All buckets
        }),
        threshold: 1,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        alarmDescription:
          'Alarm if malware is detected in any S3 object by GuardDuty',
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      }
    );
    new CfnOutput(this, 'GuardDutyMalwareDetectedAlarmName', {
      value: malwareDetectedAlarm.alarmName,
      description: 'CloudWatch alarm for GuardDuty malware detection'
    });
  }
}
