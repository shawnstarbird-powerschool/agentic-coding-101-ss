import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import { getOriginHandler } from '@ps-refarch/lambda-utils';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetUserResponseElement } from '../models/get-users';
import { FolderType, ProductType, User, UserType } from '../util/db-schema';
import { getProductAndFoldersById } from '../util/db-utils';

// Initialize Logger
const logger = new Logger({
  serviceName: 'user-service',
  logLevel: process.env.LOG_LEVEL || ('INFO' as any)
});

// Initialize Tracer
const tracer = new Tracer({
  serviceName: 'user-service'
});

/**
 * Handler for GET /users and GET /users/{id} endpoints
 * Gets all users or a specific user by ID
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

    // Check if we're getting a specific user or listing all users
    const userId = event.pathParameters?.id;

    // Might be only one
    const users: UserType[] = [];
    let totalUsersCount = 0;
    if (userId) {
      // Get a specific user
      const user = (await User.get({
        tenantId,
        id: userId
      })) as UserType | null;

      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: true,
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          })
        };
      }
      users.push(user);
      totalUsersCount = 1;
    } else {
      // List all users for the tenant
      const tempUsers = (await User.find({
        PK: `TENANT#${tenantId}`,
        SK: { begins: 'USER#' }
      })) as UserType[];

      // Check if we should include inactive users
      const includeInactive =
        event.queryStringParameters?.include === 'inactive';
      logger.info('Query parameters', {
        includeInactive,
        queryParams: event.queryStringParameters
      });

      // Filter out inactive users unless specifically requested
      users.push(
        ...(includeInactive
          ? tempUsers
          : tempUsers.filter((user) => user.active !== false))
      );
      totalUsersCount = tempUsers.length;
    }

    // Remove sensitive fields from all users and do mappings
    const responseUsers: GetUserResponseElement[] = [];
    const productAndFolders: Record<
      string,
      { product: ProductType; folders: FolderType[] }
    > = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const user of users) {
      // Don't list product users
      if (!user.isProductUser) {
        // Get the product and folder names
        if (!productAndFolders[user.productId]) {
          // eslint-disable-next-line no-await-in-loop
          const { product, folders } = await getProductAndFoldersById({
            tenantId: user.tenantId,
            productId: user.productId,
            activeOnly: true
          });
          productAndFolders[user.productId] = {
            product,
            folders
          };
        }

        const { product, folders } = productAndFolders[user.productId];
        const userFolders = folders.filter((folder) =>
          user.folders?.includes(folder.id)
        );
        logger.info('User folders', {
          user,
          product,
          productFolders: folders,
          userFolders
        });

        const responseUser: GetUserResponseElement = {
          access: user.access,
          active: user.active !== false,
          authenticationType: user.authenticationType,
          id: user.id,
          ipWhitelist: user.ipWhitelist,
          lastLogin: user.lastLogin,
          name: user.name,
          productCode: product.productCode,
          productName: product.name,
          tenantId: user.tenantId,
          username: user.username,
          folders: userFolders.map((folder) => ({
            id: folder.id,
            path: folder.path,
            use: folder.use,
            accessType: folder.accessType
          })),
          created: user.created ? user.created.toISOString() : undefined,
          updated: user.updated ? user.updated.toISOString() : undefined
        };

        if (user.expires && user.expires > 0) {
          responseUser.expires = user.expires;
        }
        responseUsers.push(responseUser);
      }
    }

    // Return response, single or multiple
    if (userId) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          user: responseUsers[0]
        })
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({
        users: responseUsers,
        count: responseUsers.length,
        total: totalUsersCount,
        filtered: totalUsersCount - responseUsers.length
      })
    };
  } catch (error) {
    logger.error('Error getting users', { error });
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
