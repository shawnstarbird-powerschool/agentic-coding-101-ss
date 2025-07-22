import { cleanName } from '@ps-refarch/cdk-utils';
import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps
} from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Rule, RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { CfnMalwareProtectionPlan } from 'aws-cdk-lib/aws-guardduty';
import * as iam from 'aws-cdk-lib/aws-iam';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy
} from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { MainAccountEnvProps } from './main-stack-props';

// Default S3 permissions if not specified in the product configuration
export const DEFAULT_S3_PERMISSIONS = [
  's3:GetObject',
  's3:PutObject',
  's3:ListBucket',
  's3:DeleteObject'
];

/* eslint-disable no-new */

/**
 * Properties for the PermanentResourcesStack
 */
export interface PermanentResourcesStackProps extends StackProps {
  /**
   * The environment name. This is either something like `dev`, `qa`, `prod`, etc.
   * or a feature branch name.
   */
  envName: string;

  /**
   * The namespace name. This is either something like `dev`, `qa`, `prod`, etc.
   */
  namespace: string;

  /**
   * The package name, according to package.json. This is normally the MFE id.
   */
  packageName: string;

  /**
   * The basic account environment. Taken from account-env.ts.
   */
  acctEnvProps: MainAccountEnvProps;
}

/**
 * Stack for creating permanent resources that should only be created once per namespace.
 * This includes (maybe) S3 buckets and DynamoDB tables.
 */
export class PermanentResourcesStack extends Stack {
  /**
   * Map of product code to S3 buckets
   * Keys are in the format: productCode-int or productCode-ext
   */
  public readonly productBuckets: Record<string, s3.IBucket> = {};

  /**
   * SQS queue for external-to-internal file transfers
   */
  public readonly externalToInternalQueue: sqs.Queue;

  /**
   * SQS queue for internal-to-external file transfers
   */
  public readonly internalToExternalQueue: sqs.Queue;

  /**
   * Dead letter queue for failed file transfers
   */
  public readonly deadLetterQueue: sqs.Queue;

  /**
   * DynamoDB table for the application
   */
  public readonly appTable: dynamodb.ITable;

  /**
   * DynamoDB table for audit logs
   */
  public readonly auditTable: dynamodb.ITable;

  constructor(
    scope: Construct,
    id: string,
    props: PermanentResourcesStackProps
  ) {
    super(scope, id, props);

    const { envName, packageName, acctEnvProps } = props;
    const { isProduction } = acctEnvProps;
    const cleanEnvName = cleanName(envName, true);

    // Note: ALL permanent resources are now based on the envName,
    // not the namespace. This is proving to be easier to manage.

    // Create SQS queues for file transfer operations
    this.deadLetterQueue = new sqs.Queue(this, 'DeadLetterQueue', {
      queueName: `${packageName}-${cleanEnvName}-file-transfer-dlq`,
      retentionPeriod: isProduction
        ? Duration.days(14) // 14 days for production
        : Duration.days(4), // 4 days for non-production
      visibilityTimeout: Duration.seconds(300) // 5 minutes
    });

    // Create external-to-internal queue
    this.externalToInternalQueue = new sqs.Queue(
      this,
      'ExternalToInternalQueue',
      {
        queueName: `${packageName}-${cleanEnvName}-ext-to-int`,
        visibilityTimeout: Duration.seconds(300), // 5 minutes
        deadLetterQueue: {
          queue: this.deadLetterQueue,
          maxReceiveCount: 5 // Allow 5 retries before sending to DLQ
        }
      }
    );

    // Create EventBridge rule for AWS Transfer events
    const transferEventRule = new Rule(this, 'TransferEventRule', {
      eventPattern: {
        source: ['aws.transfer']
      }
    });

    // Grant EventBridge permission to send messages to the queue
    this.externalToInternalQueue.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('events.amazonaws.com')],
        actions: ['sqs:SendMessage'],
        resources: [this.externalToInternalQueue.queueArn],
        conditions: {
          ArnEquals: {
            'aws:SourceArn': transferEventRule.ruleArn
          }
        }
      })
    );

    // Add the SQS queue as a target
    transferEventRule.addTarget(
      new SqsQueue(this.externalToInternalQueue, {
        message: RuleTargetInput.fromEventPath('$')
      })
    );

    // Create internal-to-external queue
    this.internalToExternalQueue = new sqs.Queue(
      this,
      'InternalToExternalQueue',
      {
        queueName: `${packageName}-${cleanEnvName}-int-to-ext`,
        visibilityTimeout: Duration.seconds(300), // 5 minutes
        deadLetterQueue: {
          queue: this.deadLetterQueue,
          maxReceiveCount: 5 // Allow 5 retries before sending to DLQ
        }
      }
    );

    // Output the queue URLs and ARNs
    new CfnOutput(this, 'ExternalToInternalQueueUrl', {
      value: this.externalToInternalQueue.queueUrl,
      description: 'URL of the external-to-internal SQS queue'
    });

    new CfnOutput(this, 'ExternalToInternalQueueArn', {
      value: this.externalToInternalQueue.queueArn,
      description: 'ARN of the external-to-internal SQS queue',
      exportName: `${packageName}-${cleanEnvName}-ExternalToInternalQueueArn`
    });

    new CfnOutput(this, 'InternalToExternalQueueUrl', {
      value: this.internalToExternalQueue.queueUrl,
      description: 'URL of the internal-to-external SQS queue'
    });

    new CfnOutput(this, 'InternalToExternalQueueArn', {
      value: this.internalToExternalQueue.queueArn,
      description: 'ARN of the internal-to-external SQS queue',
      exportName: `${packageName}-${cleanEnvName}-InternalToExternalQueueArn`
    });

    new CfnOutput(this, 'DeadLetterQueueUrl', {
      value: this.deadLetterQueue.queueUrl,
      description: 'URL of the dead letter queue for failed transfers'
    });

    new CfnOutput(this, 'DeadLetterQueueArn', {
      value: this.deadLetterQueue.queueArn,
      description: 'ARN of the dead letter queue for failed transfers',
      exportName: `${packageName}-${cleanEnvName}-DeadLetterQueueArn`
    });

    // Get product configurations from account environment properties
    const productConfigs = acctEnvProps.products || {};

    // Create a GuardDuty malware protection role (one per stack/namespace)
    const guardDutyRole = new Role(
      this,
      `${packageName}-GuardDutyMalwareProtectionRole-${cleanEnvName}`,
      {
        assumedBy: new ServicePrincipal(
          'malware-protection-plan.guardduty.amazonaws.com'
        ),
        description: 'Role for GuardDuty Malware Protection to scan S3 buckets'
      }
    );
    const guardDutyPolicyStatement = new PolicyStatement({
      actions: [
        's3:GetObject',
        's3:ListBucket',
        's3:GetBucketLocation',
        'kms:Decrypt',
        'kms:DescribeKey',
        's3:GetObjectVersion',
        's3:GetObjectTagging',
        's3:GetObjectVersionTagging'
      ],
      resources: ['*'] // GuardDuty needs access to scan all S3 objects in the bucket
    });
    guardDutyRole.addToPolicy(guardDutyPolicyStatement);

    // Add required EventBridge permissions for GuardDuty
    guardDutyRole.addToPolicy(
      new PolicyStatement({
        actions: [
          'events:PutRule',
          'events:DeleteRule',
          'events:PutTargets',
          'events:RemoveTargets'
        ],
        resources: [
          `arn:aws:events:${this.region}:${this.account}:rule/*`,
          `arn:aws:events:${this.region}:${this.account}:event-bus/default`
        ]
      })
    );

    // Workaround to ensure the role is propagated before use
    const waitForRolePropagation = new AwsCustomResource(
      this,
      `WaitForGuardDutyRolePropagation-${cleanEnvName}`,
      {
        onUpdate: {
          service: 'IAM',
          action: 'getRole',
          parameters: {
            RoleName: guardDutyRole.roleName
          },
          physicalResourceId: { id: guardDutyRole.roleArn }
        },
        policy: AwsCustomResourcePolicy.fromSdkCalls({
          resources: [guardDutyRole.roleArn]
        })
      }
    );

    // Create a logging bucket for S3 server access logs
    const loggingBucket = new s3.Bucket(this, 'AccessLogsBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: isProduction
        ? RemovalPolicy.RETAIN
        : RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      bucketName: `${packageName}-${cleanEnvName}-access-logs`,
      lifecycleRules: [
        {
          id: 'AccessLogsRetentionPolicy',
          expiration: Duration.days(isProduction ? 90 : 30), // Keep logs longer in production
          enabled: true
        }
      ]
    });

    // Output the logging bucket name for reference
    // eslint-disable-next-line no-new
    new CfnOutput(this, 'AccessLogsBucketName', {
      value: loggingBucket.bucketName,
      description: 'S3 bucket for server access logs from external buckets'
    });

    // Create buckets for each product
    Object.entries(productConfigs).forEach(([productCode, config]) => {
      // Create an internal S3 bucket for this product (for product users)
      const internalBucket = new s3.Bucket(
        this,
        `${productCode}InternalBucket`,
        {
          encryption: s3.BucketEncryption.S3_MANAGED,
          enforceSSL: true,
          removalPolicy: isProduction
            ? RemovalPolicy.RETAIN
            : RemovalPolicy.DESTROY,
          autoDeleteObjects: !isProduction,
          publicReadAccess: false,
          blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
          bucketName: `${packageName}-${cleanEnvName}-${productCode.toLowerCase()}-int`,
          lifecycleRules: [
            {
              id: '24HourRetentionPolicy-InternalBucket',
              expiration: Duration.days(1),
              enabled: true
            }
          ]
        }
      );

      // Create an external S3 bucket for this product (for human users)
      const externalBucket = new s3.Bucket(
        this,
        `${productCode}ExternalBucket`,
        {
          encryption: s3.BucketEncryption.S3_MANAGED,
          enforceSSL: true,
          removalPolicy: isProduction
            ? RemovalPolicy.RETAIN
            : RemovalPolicy.DESTROY,
          autoDeleteObjects: !isProduction,
          publicReadAccess: false,
          blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
          bucketName: `${packageName}-${cleanEnvName}-${productCode.toLowerCase()}-ext`,
          lifecycleRules: [
            {
              id: '24HourRetentionPolicy-ExternalBucket',
              expiration: Duration.days(1),
              enabled: true
            }
          ],
          // Enable server access logging for external buckets
          serverAccessLogsBucket: loggingBucket,
          serverAccessLogsPrefix: `${productCode.toLowerCase()}-ext/`
        }
      );

      // Enable GuardDuty malware protection for the external bucket
      const malwareProtectionPlan = new CfnMalwareProtectionPlan(
        this,
        `${productCode}GuardDutyMalwareProtectionPlan-${cleanEnvName}`,
        {
          protectedResource: {
            s3Bucket: {
              bucketName: externalBucket.bucketName
            }
          },
          role: guardDutyRole.roleArn,
          actions: {
            tagging: {
              status: 'ENABLED'
            }
          }
        }
      );
      malwareProtectionPlan.node.addDependency(waitForRolePropagation);

      // Add required S3 bucket notification permissions for GuardDuty
      guardDutyRole.addToPolicy(
        new PolicyStatement({
          actions: [
            's3:GetBucketNotification',
            's3:PutBucketNotification',
            's3:PutBucketNotificationConfiguration',
            's3:GetBucketPolicy',
            's3:PutBucketPolicy',
            's3:GetBucketLocation',
            's3:GetBucketTagging',
            's3:GetBucketAcl',
            's3:PutBucketAcl'
          ],
          resources: [externalBucket.bucketArn]
        })
      );

      // Add required S3 object put permissions for GuardDuty validation
      guardDutyRole.addToPolicy(
        new PolicyStatement({
          actions: ['s3:PutObject', 's3:PutObjectAcl'],
          resources: [externalBucket.bucketArn, `${externalBucket.bucketArn}/*`]
        })
      );

      // --- GuardDuty Recommended Policy Statements ---
      const { region } = this;
      const { account } = this;
      const { bucketName } = externalBucket;
      const { bucketArn } = externalBucket;
      const objectArn = `${bucketArn}/*`;
      const validationObjectArn = `arn:aws:s3:::${bucketName}/malware-protection-resource-validation-object`;
      const guarddutyRuleArn = `arn:aws:events:${region}:${account}:rule/DO-NOT-DELETE-AmazonGuardDutyMalwareProtectionS3*`;

      // 1. AllowManagedRuleToSendS3EventsToGuardDuty
      guardDutyRole.addToPolicy(
        new PolicyStatement({
          sid: `AllowManagedRuleToSendS3EventsToGuardDuty${bucketName.replace(
            /[^A-Za-z0-9]/g,
            ''
          )}`,
          actions: [
            'events:PutRule',
            'events:DeleteRule',
            'events:PutTargets',
            'events:RemoveTargets'
          ],
          resources: [guarddutyRuleArn],
          conditions: {
            StringLike: {
              'events:ManagedBy':
                'malware-protection-plan.guardduty.amazonaws.com'
            }
          }
        })
      );

      // 2. AllowGuardDutyToMonitorEventBridgeManagedRule
      guardDutyRole.addToPolicy(
        new PolicyStatement({
          sid: `AllowGuardDutyToMonitorEventBridgeManagedRule${bucketName.replace(
            /[^A-Za-z0-9]/g,
            ''
          )}`,
          actions: ['events:DescribeRule', 'events:ListTargetsByRule'],
          resources: [guarddutyRuleArn]
        })
      );

      // 3. AllowPostScanTag
      guardDutyRole.addToPolicy(
        new PolicyStatement({
          sid: `AllowPostScanTag${bucketName.replace(/[^A-Za-z0-9]/g, '')}`,
          actions: [
            's3:PutObjectTagging',
            's3:GetObjectTagging',
            's3:PutObjectVersionTagging',
            's3:GetObjectVersionTagging'
          ],
          resources: [objectArn]
        })
      );

      // 4. AllowEnableS3EventBridgeEvents
      guardDutyRole.addToPolicy(
        new PolicyStatement({
          sid: `AllowEnableS3EventBridgeEvents${bucketName.replace(
            /[^A-Za-z0-9]/g,
            ''
          )}`,
          actions: ['s3:PutBucketNotification', 's3:GetBucketNotification'],
          resources: [bucketArn]
        })
      );

      // 5. AllowPutValidationObject
      guardDutyRole.addToPolicy(
        new PolicyStatement({
          sid: `AllowPutValidationObject${bucketName.replace(
            /[^A-Za-z0-9]/g,
            ''
          )}`,
          actions: ['s3:PutObject'],
          resources: [validationObjectArn]
        })
      );

      // 6. AllowCheckBucketOwnership
      guardDutyRole.addToPolicy(
        new PolicyStatement({
          sid: `AllowCheckBucketOwnership${bucketName.replace(
            /[^A-Za-z0-9]/g,
            ''
          )}`,
          actions: ['s3:ListBucket'],
          resources: [bucketArn]
        })
      );

      // 7. AllowMalwareScan
      guardDutyRole.addToPolicy(
        new PolicyStatement({
          sid: `AllowMalwareScan${bucketName.replace(/[^A-Za-z0-9]/g, '')}`,
          actions: ['s3:GetObject', 's3:GetObjectVersion'],
          resources: [objectArn]
        })
      );

      // Store the bucket references for later use
      this.productBuckets[`${productCode}-int`] = internalBucket;
      this.productBuckets[`${productCode}-ext`] = externalBucket;

      // Configure S3 event notifications for file creation
      // External bucket notifications go to external-to-internal queue
      externalBucket.addEventNotification(
        s3.EventType.OBJECT_CREATED,
        new s3n.SqsDestination(this.externalToInternalQueue)
      );

      // Internal bucket notifications go to internal-to-external queue
      internalBucket.addEventNotification(
        s3.EventType.OBJECT_CREATED,
        new s3n.SqsDestination(this.internalToExternalQueue)
      );

      // Get the permissions from the product configuration or use defaults
      const permissions = config.permissions || DEFAULT_S3_PERMISSIONS;

      // Create a resource policy to allow the specified AWS accounts to access the internal bucket
      console.log({
        message: '*** creating bucket policy for internal bucket',
        accounts: config.accessAccounts,
        permissions,
        bucket: internalBucket.bucketArn
      });

      // Add a policy statement for each access account
      config.accessAccounts.forEach((accountNumber) => {
        const internalPolicyStatement = new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [new iam.AccountPrincipal(accountNumber)],
          actions: permissions,
          resources: [internalBucket.bucketArn, `${internalBucket.bucketArn}/*`]
        });

        // Add the policy to the internal bucket only
        internalBucket.addToResourcePolicy(internalPolicyStatement);
      });

      // Output the bucket names for reference
      new CfnOutput(this, `${productCode}InternalBucketName`, {
        value: internalBucket.bucketName,
        description: `Internal S3 bucket for ${productCode} product (product users)`
      });

      new CfnOutput(this, `${productCode}ExternalBucketName`, {
        value: externalBucket.bucketName,
        description: `External S3 bucket for ${productCode} product (human users)`
      });
    });

    // Create a DynamoDB table for the application.
    this.appTable = new dynamodb.Table(this, 'AppTable', {
      tableName: `${packageName}-${cleanEnvName}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProduction
        ? RemovalPolicy.RETAIN
        : RemovalPolicy.DESTROY,
      pointInTimeRecovery: isProduction,
      deletionProtection: isProduction,
      timeToLiveAttribute: 'expires', // Add TTL based on the 'expires' attribute
      // Enable DynamoDB Streams with NEW_AND_OLD_IMAGES to capture changes for audit logging
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
    });

    // Add GSI1 for "all" relationships
    (this.appTable as dynamodb.Table).addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING }
    });

    // Output the table name for reference
    new CfnOutput(this, 'AppTableName', {
      value: this.appTable.tableName,
      description: 'DynamoDB table name'
    });

    // Export the stream ARN for use in the main stack
    new CfnOutput(this, 'AppTableStreamArn', {
      value: (this.appTable as dynamodb.Table).tableStreamArn || '',
      description: 'DynamoDB table stream ARN',
      exportName: `${packageName}-${cleanEnvName}-AppTableStreamArn`
    });

    // Create a DynamoDB table for audit logs
    this.auditTable = new dynamodb.Table(this, 'AuditTable', {
      tableName: `${packageName}-${cleanEnvName}-audit`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProduction
        ? RemovalPolicy.RETAIN
        : RemovalPolicy.DESTROY,
      pointInTimeRecovery: isProduction,
      deletionProtection: isProduction,
      // Add TTL for audit records - automatically expire after 7 years (regulatory compliance)
      timeToLiveAttribute: 'expires'
    });

    // Add GSI1 for querying audit logs by original PK and SK
    (this.auditTable as dynamodb.Table).addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING }
    });

    // Output the audit table name for reference
    new CfnOutput(this, 'AuditTableName', {
      value: this.auditTable.tableName,
      description: 'DynamoDB audit table name'
    });
  }
}
