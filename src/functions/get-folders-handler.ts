import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import { getOriginHandler } from '@ps-refarch/lambda-utils';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetFolderResponseElement } from '../models/get-folders';
import {
  Folder,
  FolderType,
  Product,
  ProductType,
  Tenant,
  User,
  UserType
} from '../util/db-schema';

// Initialize Logger
const logger = new Logger({
  serviceName: 'folder-service',
  logLevel: process.env.LOG_LEVEL || ('INFO' as any)
});

// Initialize Tracer
const tracer = new Tracer({
  serviceName: 'folder-service'
});

/**
 * Handler for GET /folders and GET /folders/{id} endpoints
 * Gets all folders or a specific folder by ID
 */
export const lambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.info('Received event', { event });
  try {
    // Extract tenantId from authorizer context first (for session auth), then fall back to path parameters (for IAM auth)
    let tenantId: string | undefined;

    // First check for tenant ID in the session authorizer context (takes precedence for security)
    tenantId = event.requestContext.authorizer?.district_uid;

    if (tenantId) {
      logger.info('Using district ID from authorizer context', { tenantId });
    } else {
      // Fall back to path parameters for IAM auth if no authorizer context
      tenantId = event.pathParameters?.districtId;

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

      logger.info('Using district ID from path parameters', { tenantId });
    }

    // Check if the tenant exists
    const tenant = await Tenant.get({
      id: tenantId
    });

    if (!tenant) {
      logger.info('Tenant not found', { tenantId });
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: true,
          message: 'Tenant not found',
          code: 'TENANT_NOT_FOUND'
        })
      };
    }

    // Check if we should include inactive folders
    const includeInactive = event.queryStringParameters?.include === 'inactive';
    logger.info('Query parameters', {
      includeInactive,
      queryParams: event.queryStringParameters
    });

    // Check if we're getting a specific folder or listing all folders
    const folderId = event.pathParameters?.id;

    // Create a map to store product information
    const productMap: Record<string, ProductType> = {};

    // Might be only one
    const folders: FolderType[] = [];
    if (folderId) {
      // Get a specific folder
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

      // Include the folder if it's active OR if we're specifically requesting it by ID
      // When requesting by ID, we always return it regardless of active status
      folders.push(folder);
    } else {
      // List all folders for the tenant using GSI1
      const allFolders = await Folder.find(
        {
          tenantId
        },
        { index: 'GSI1' }
      );

      // Filter based on includeInactive parameter
      if (includeInactive) {
        folders.push(...allFolders);
      } else {
        // Filter to only include active folders
        folders.push(...allFolders.filter((folder) => folder.active !== false));
      }
    }

    // Get product information for all folders
    const productIds = [...new Set(folders.map((folder) => folder.productId))];

    // Fetch all products in one go
    const products = (await Product.find(
      {
        GSI1PK: 'ALL_PRODUCTS'
      },
      { index: 'GSI1' }
    )) as ProductType[];

    // Create a map of product ID to product
    // eslint-disable-next-line no-restricted-syntax
    for (const product of products) {
      if (productIds.includes(product.id)) {
        productMap[product.id] = product;
      }
    }

    // Map folders to response format
    const responseFolders: GetFolderResponseElement[] = folders.map(
      (folder) => {
        const product = productMap[folder.productId];
        const responseFolder: GetFolderResponseElement = {
          id: folder.id,
          tenantId: folder.tenantId,
          productId: folder.productId,
          productCode: product?.productCode || 'unknown',
          use: folder.use,
          path: folder.path,
          accessType: folder.accessType,
          active: folder.active !== false, // Default to true if not set
          created: folder.created ? folder.created.toISOString() : undefined,
          updated: folder.updated ? folder.updated.toISOString() : undefined
        };

        if (folder.expires && folder.expires > 0) {
          responseFolder.expires = folder.expires;
        }
        return responseFolder;
      }
    );

    // Return response, single or multiple
    if (folderId) {
      // For single folder requests, find users who have this folder in their folders array
      if (responseFolders.length > 0) {
        try {
          // Find all users for this tenant
          const users = await User.find({
            tenantId
          });

          // Filter users who have this folder in their folders array
          const folderUsers = users.filter(
            (user: UserType) =>
              user.folders &&
              Array.isArray(user.folders) &&
              user.folders.includes(folderId)
          );

          // Add user information to the response
          if (folderUsers.length > 0) {
            responseFolders[0].users = folderUsers.map((user: UserType) => ({
              id: user.id,
              username: user.username
            }));
          } else {
            // Include empty array if no users have access to this folder
            responseFolders[0].users = [];
          }

          logger.info(
            `Found ${folderUsers.length} users with access to folder ${folderId}`
          );
        } catch (error) {
          logger.warn('Error finding users for folder', { error, folderId });
          // Continue without user information if there's an error
          responseFolders[0].users = [];
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          folder: responseFolders[0]
        })
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({
        folders: responseFolders,
        count: responseFolders.length
      })
    };
  } catch (error) {
    logger.error('Error getting folders', { error });
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
