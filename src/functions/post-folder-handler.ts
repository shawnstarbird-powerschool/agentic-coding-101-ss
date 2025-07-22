import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { EventBridge } from '@aws-sdk/client-eventbridge';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import { getOriginHandler } from '@ps-refarch/lambda-utils';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { FOLDER_EVENT_TYPE, FolderEvent } from '../models/events';
import {
  PostFolderRequestPayload,
  PostFolderResponse
} from '../models/post-folder';
import { Folder, Product, ProductType } from '../util/db-schema';
import { getBucketEnvName } from '../util/env-var-utils';
import { ensureSubfoldersExist } from '../util/s3-utils';

// Initialize Logger
const logger = new Logger({
  serviceName: 'folder-service',
  logLevel: process.env.LOG_LEVEL || ('INFO' as any)
});

const eventBridge = new EventBridge({ region: process.env.AWS_REGION });

// Initialize Tracer
const tracer = new Tracer({
  serviceName: 'folder-service'
});

/**
 * Handler for POST /folders endpoint
 * Creates a new folder for the tenant
 */
export const lambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.info('Received event', { event });
  try {
    // Extract tenantId from authorizer context
    const tenantId = event.requestContext.authorizer?.district_uid;
    if (!tenantId) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: true,
          message: 'Unauthorized: Missing tenant ID',
          code: 'MISSING_TENANT_ID'
        })
      };
    }

    // Parse the request body
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: 'Bad request: Missing request body',
          code: 'MISSING_REQUEST_BODY'
        })
      };
    }

    const requestPayload: PostFolderRequestPayload = JSON.parse(event.body);

    // Validate required fields
    if (!requestPayload.productCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: 'Bad request: Missing productCode',
          code: 'MISSING_PRODUCT_CODE'
        })
      };
    }

    const productCode = requestPayload.productCode.trim().toUpperCase();

    if (!requestPayload.use) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: 'Bad request: Missing use',
          code: 'MISSING_USE'
        })
      };
    }

    if (!requestPayload.path) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: 'Bad request: Missing path',
          code: 'MISSING_PATH'
        })
      };
    }

    // Trim spaces from path
    requestPayload.path = requestPayload.path.trim();

    // Check if path is empty after trimming
    if (!requestPayload.path) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: 'Bad request: Path cannot be empty',
          code: 'EMPTY_PATH'
        })
      };
    }

    if (
      !requestPayload.accessType ||
      !['inbound', 'outbound'].includes(requestPayload.accessType)
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: "Bad request: accessType must be 'inbound' or 'outbound'",
          code: 'INVALID_ACCESS_TYPE'
        })
      };
    }

    // Find the product by productCode
    const products = await Product.find(
      {
        GSI1PK: 'ALL_PRODUCTS'
      },
      { index: 'GSI1' }
    );

    const product = products.find((p) => p.productCode === productCode) as
      | ProductType
      | undefined;

    if (!product) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: true,
          message: `Product with code ${productCode} not found`,
          code: 'PRODUCT_NOT_FOUND'
        })
      };
    }

    // Validate that the use is valid for this product
    if (!product.uses.map((u) => u.name).includes(requestPayload.use)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: `Invalid use '${requestPayload.use}' for product ${productCode}`,
          code: 'INVALID_USE'
        })
      };
    }

    // Check for duplicate folder paths within the same tenant and product
    const existingFolders = await Folder.find({
      PK: `TENANT#${tenantId}`
    });

    const duplicateFolder = existingFolders.find(
      (f) => f.productId === product.id && f.path === requestPayload.path
    );

    if (duplicateFolder) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: `A folder with path '${requestPayload.path}' already exists for product ${productCode}`,
          code: 'DUPLICATE_FOLDER_PATH'
        })
      };
    }

    // Create the folder with source property
    const folderData = {
      tenantId,
      productId: product.id,
      use: requestPayload.use,
      path: requestPayload.path,
      accessType: requestPayload.accessType,
      active:
        requestPayload.active !== undefined ? requestPayload.active : true,

      source: 'post-folder-handler.ts',
      expires: 0 // Default to not expiring
    };

    // Handle temporary folder expiration
    if (requestPayload.temporary) {
      folderData.expires = Math.floor(Date.now() / 1000) + 6 * 60 * 60; // 6 hours in seconds
    }

    const folder = await Folder.create(folderData);

    // Pre-create folders in both EXT and INT buckets regardless of accessType
    const extBucketEnvVar = getBucketEnvName(productCode, 'ext');
    const intBucketEnvVar = getBucketEnvName(productCode, 'int');
    const extBucketName = process.env[extBucketEnvVar];
    const intBucketName = process.env[intBucketEnvVar];

    // Validate both buckets exist
    if (!extBucketName) {
      throw new Error(
        `External bucket environment variable ${extBucketEnvVar} is not set or empty`
      );
    }

    if (!intBucketName) {
      throw new Error(
        `Internal bucket environment variable ${intBucketEnvVar} is not set or empty`
      );
    }

    // Create folder in external bucket
    logger.info('Creating folder in external S3 bucket', {
      bucketName: extBucketName,
      tenantId,
      path: requestPayload.path
    });
    await ensureSubfoldersExist(extBucketName, tenantId, [requestPayload.path]);

    // Create folder in internal bucket
    logger.info('Creating folder in internal S3 bucket', {
      bucketName: intBucketName,
      tenantId,
      path: requestPayload.path
    });
    await ensureSubfoldersExist(intBucketName, tenantId, [requestPayload.path]);

    // Send folder creation event
    const eventPayload: FolderEvent = {
      metadata: {
        version: '1.0',
        timestamp: Math.floor(new Date().getTime() / 1000),
        source: 'powerschool.ftp.folder-service',
        accountId: process.env.AWS_ACCOUNT_ID || '',
        region: process.env.AWS_REGION || '',
        districtId: folder.tenantId,
        productCode,
        envName: process.env.PS_ENVIRONMENT || '',
        namespace: process.env.PS_NAMESPACE || ''
      },
      data: {
        id: folder.id,
        action: 'created',
        path: folder.path,
        use: folder.use,
        userId: event.requestContext.authorizer?.sub || ''
      }
    };

    try {
      await eventBridge.putEvents({
        Entries: [
          {
            EventBusName: process.env.EVENT_BUS_ARN,
            Source: eventPayload.metadata.source,
            DetailType: FOLDER_EVENT_TYPE,
            Detail: JSON.stringify(eventPayload)
          }
        ]
      });
      logger.info('Successfully sent folder creation event', { eventPayload });
    } catch (error) {
      logger.error('Failed to send folder creation event', {
        error,
        eventPayload
      });
      // Continue with returning the response even if event sending fails
    }

    // Return the created folder
    return {
      statusCode: 201,
      body: JSON.stringify({
        folder: {
          id: folder.id,
          tenantId: folder.tenantId,
          productId: folder.productId,
          productCode,
          use: folder.use,
          path: folder.path,
          accessType: folder.accessType,
          active: folder.active !== false, // Default to true if not set
          created: folder.created ? folder.created.toISOString() : undefined
        }
      } as PostFolderResponse)
    };
  } catch (error) {
    logger.error('Error creating folder', { error });
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: true,
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      })
    };
  }
};

// Export the handler wrapped with the tracer
export const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(
    cors({
      getOrigin: getOriginHandler(process.env),
      headers: process.env.PS_CORS_HEADERS,
      credentials: true
    })
  );
