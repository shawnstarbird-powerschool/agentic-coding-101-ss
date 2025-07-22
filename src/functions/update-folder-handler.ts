import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { EventBridge } from '@aws-sdk/client-eventbridge';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import { getOriginHandler } from '@ps-refarch/lambda-utils';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { FOLDER_EVENT_TYPE, FolderEvent } from '../models/events';
import { UpdateFolderRequestPayload } from '../models/update-folder';
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
 * Handler for PUT /folders/{id} endpoint
 * Updates an existing folder
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

    // Get the folder ID from the path parameters
    const folderId = event.pathParameters?.id;
    if (!folderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: 'Bad request: Missing folder ID',
          code: 'MISSING_FOLDER_ID'
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

    const rawPayload = JSON.parse(event.body);
    const requestPayload: UpdateFolderRequestPayload = rawPayload;

    // Check if productId is being changed, which is not allowed
    if ('productId' in rawPayload) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: 'Bad request: Changing productId is not allowed',
          code: 'PRODUCT_CHANGE_NOT_ALLOWED'
        })
      };
    }

    // Validate accessType if provided
    if (
      requestPayload.accessType &&
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

    // Get the specific folder by ID
    const folder = await Folder.get({
      tenantId,
      id: folderId
    });

    if (!folder) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: true,
          message: 'Folder not found',
          code: 'FOLDER_NOT_FOUND'
        })
      };
    }

    // Verify that the folder belongs to the current tenant
    if (folder.tenantId !== tenantId) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: true,
          message: 'Folder not found',
          code: 'FOLDER_NOT_FOUND'
        })
      };
    }

    // Get the product for this folder
    const product = (await Product.get({
      id: folder.productId
    })) as ProductType;

    // Trim spaces from path if provided
    if (requestPayload.path) {
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
    }

    // If use is provided, validate that it's valid for this product
    if (
      requestPayload.use &&
      !product.uses.map((u) => u.name).includes(requestPayload.use)
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: `Invalid use '${requestPayload.use}' for product ${product.productCode}`,
          code: 'INVALID_USE'
        })
      };
    }

    // Check for duplicate folder paths within the same tenant and product
    // Only check if the path is being changed
    if (requestPayload.path && requestPayload.path !== folder.path) {
      const existingFolders = await Folder.find({
        PK: `TENANT#${tenantId}`
      });

      const duplicateFolder = existingFolders.find(
        (f) =>
          f.productId === folder.productId &&
          f.path === requestPayload.path &&
          f.id !== folder.id // Exclude the current folder
      );

      if (duplicateFolder) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message: `A folder with path '${requestPayload.path}' already exists for product ${product.productCode}`,
            code: 'DUPLICATE_FOLDER_PATH'
          })
        };
      }
    }

    // Update the folder
    const updateData: any = {
      tenantId,
      id: folder.id,
      productId: folder.productId,
      source: 'update-folder-handler.ts'
    };

    if (requestPayload.use) {
      updateData.use = requestPayload.use;
    }
    if (requestPayload.path) {
      updateData.path = requestPayload.path;
    }
    if (requestPayload.accessType) {
      updateData.accessType = requestPayload.accessType;
    }
    if (requestPayload.active !== undefined) {
      updateData.active = requestPayload.active;
    }

    // Handle temporary folder expiration if provided
    if (requestPayload.temporary === true) {
      updateData.expires = Math.floor(Date.now() / 1000) + 6 * 60 * 60; // 6 hours in seconds
    } else if (requestPayload.temporary === false) {
      updateData.expires = 0; // Does not expire
    }

    const updatedFolder = await Folder.update(updateData);

    // If path is updated or accessType is changed, ensure the folder exists in both S3 buckets
    if (requestPayload.path || requestPayload.accessType) {
      const folderPath = requestPayload.path || folder.path;
      const { productCode } = product;

      // Get both bucket names
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
      logger.info('Creating/updating folder in external S3 bucket', {
        bucketName: extBucketName,
        tenantId,
        path: folderPath
      });
      await ensureSubfoldersExist(extBucketName, tenantId, [folderPath]);

      // Create folder in internal bucket
      logger.info('Creating/updating folder in internal S3 bucket', {
        bucketName: intBucketName,
        tenantId,
        path: folderPath
      });
      await ensureSubfoldersExist(intBucketName, tenantId, [folderPath]);
    }

    // Send folder deactivation event if folder was deactivated
    if (requestPayload.active === false) {
      const eventPayload: FolderEvent = {
        metadata: {
          version: '1.0',
          timestamp: Math.floor(new Date().getTime() / 1000),
          source: 'powerschool.ftp.folder-service',
          accountId: process.env.AWS_ACCOUNT_ID || '',
          region: process.env.AWS_REGION || '',
          districtId: tenantId || '',
          productCode: product.productCode,
          envName: process.env.PS_ENVIRONMENT || '',
          namespace: process.env.PS_NAMESPACE || ''
        },
        data: {
          id: updatedFolder.id,
          action: 'deactivated',
          path: updatedFolder.path,
          use: updatedFolder.use,
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
        logger.info('Successfully sent folder deactivation event', {
          eventPayload
        });
      } catch (error) {
        logger.error('Failed to send folder deactivation event', {
          error,
          eventPayload
        });
        // Continue with returning the response even if event sending fails
      }
    }

    // Return the updated folder
    return {
      statusCode: 200,
      body: JSON.stringify({
        id: updatedFolder.id,
        tenantId: updatedFolder.tenantId,
        productId: updatedFolder.productId,
        productCode: product.productCode,
        use: updatedFolder.use,
        path: updatedFolder.path,
        accessType: updatedFolder.accessType,
        active: updatedFolder.active !== false, // Default to true if not set
        created: updatedFolder.created
          ? updatedFolder.created.toISOString()
          : undefined,
        updated: updatedFolder.updated
          ? updatedFolder.updated.toISOString()
          : undefined
      })
    };
  } catch (error) {
    logger.error('Error updating folder', { error });
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
