import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import { getOriginHandler } from '@ps-refarch/lambda-utils';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as bcrypt from 'bcryptjs';
import { UpdateUserRequestPayload } from '../models/update-user';
import {
  Folder,
  Product,
  ProductType,
  User,
  USER_AUTH_TYPE_PASSWORD,
  USER_AUTH_TYPE_SSH_KEY,
  UserAccess,
  UserAccessEnum,
  UserType
} from '../util/db-schema';
import { getProductByCode } from '../util/db-utils';
import { isPrivateIp, validateAndNormalizeIpList } from '../util/ip-utils';

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
 * Handler for PUT /users/{id} endpoint
 * Updates an existing user
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

    // Get user ID from path parameters
    const userId = event.pathParameters?.id;
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: 'Bad request: Missing user ID',
          code: 'MISSING_USER_ID'
        })
      };
    }

    // Parse request body
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

    const requestBody = JSON.parse(event.body) as UpdateUserRequestPayload;

    // Check if user exists
    const existingUser = (await User.get({
      tenantId,
      id: userId
    })) as UserType | null;

    if (!existingUser) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: true,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        })
      };
    }

    // Prepare update data
    const updateData: {
      tenantId: string;
      id: string;
      name?: string;
      username?: string;
      authenticationType?: string;
      folders?: string[];
      productId?: string;
      access?: UserAccess;
      passwordHash?: string;
      publicKey?: string;
      ipWhitelist?: string[];
      active?: boolean;
      source: string; // Add source property
      expires?: number;
    } = {
      tenantId,
      id: userId,
      source: 'update-user-handler.ts' // Set source to the basename of this file
    };

    // Update fields if provided
    if (requestBody.name) {
      updateData.name = requestBody.name;
    }

    if (requestBody.username) {
      // Check if username is being changed
      const normalizedUsername = requestBody.username.toLowerCase();
      if (normalizedUsername !== existingUser.username.toLowerCase()) {
        // Check if new username already exists (using exact match on lowercase username)
        const existingUsers = (await User.find(
          {
            GSI1PK: 'ALL_USERS',
            GSI1SK: `USER#${normalizedUsername}`
          },
          { index: 'GSI1' }
        )) as UserType[];

        // We still need to check the ID because there could be multiple users with the same username
        // but different casing in the database (from before this change)
        const usernameExists = existingUsers.some((user) => user.id !== userId);

        if (usernameExists) {
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: true,
              message: 'Username already exists',
              code: 'DUPLICATE_USERNAME'
            })
          };
        }

        updateData.username = normalizedUsername;
      }
    }

    if (requestBody.access && UserAccessEnum.includes(requestBody.access)) {
      updateData.access = requestBody.access;
    } else if (requestBody.access) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: `Bad request: Invalid access type. Must be one of: ${UserAccessEnum}`,
          code: 'INVALID_ACCESS_TYPE'
        })
      };
    }

    // Handle productCode if provided
    let product: ProductType | undefined;
    if (requestBody.productCode) {
      logger.info('Looking up product by code', {
        productCode: requestBody.productCode
      });
      product = await getProductByCode(requestBody.productCode);
      updateData.productId = product.id;
    } else {
      // Use Product.find instead of Product.get since Product doesn't have a get method
      const products = await Product.find(
        {
          GSI1PK: 'ALL_PRODUCTS'
        },
        { index: 'GSI1' }
      );
      product = products.find((p) => p.id === existingUser.productId);
      if (!product) {
        // Should never happen
        throw new Error('Product not found for existing user');
      }
    }

    // Handle folders if provided
    if (requestBody.folders) {
      // Get the product ID we're using (either from the request or the existing user)
      const targetProductId = updateData.productId || existingUser.productId;

      // Get all folders for this tenant
      const allFolders = await Folder.find({
        PK: `TENANT#${tenantId}`
      });

      // Check if any folder has a different productId
      const invalidFolders = requestBody.folders.filter((folderId: string) => {
        const folder = allFolders.find((f: any) => f.id === folderId);
        return !folder || folder.productId !== targetProductId;
      });

      if (invalidFolders.length > 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message: 'Folders must belong to the same product as the user',
            invalidFolders,
            code: 'INVALID_FOLDER_PRODUCT'
          })
        };
      }

      // Save them as-is. The input payload was folder ids (were in output also).
      updateData.folders = requestBody.folders;
    }

    // Handle IP whitelist if provided
    if (requestBody.ipWhitelist) {
      // Check if any of the IPs are private
      const privateIps = requestBody.ipWhitelist.filter((ip: string) =>
        isPrivateIp(ip)
      );

      if (privateIps.length > 0) {
        logger.info('Private IP addresses detected in whitelist', {
          privateIps
        });
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message: 'Private IP addresses are not allowed in the whitelist',
            privateIps,
            code: 'PRIVATE_IP_NOT_ALLOWED'
          })
        };
      }

      updateData.ipWhitelist = validateAndNormalizeIpList(
        requestBody.ipWhitelist
      );
    }

    // Handle authentication type changes
    if (requestBody.authenticationType) {
      if (
        ![USER_AUTH_TYPE_PASSWORD, USER_AUTH_TYPE_SSH_KEY].includes(
          requestBody.authenticationType
        )
      ) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message: `Bad request: Invalid authentication type. Must be one of: ${USER_AUTH_TYPE_PASSWORD}, ${USER_AUTH_TYPE_SSH_KEY}`,
            code: 'INVALID_AUTH_TYPE'
          })
        };
      }

      updateData.authenticationType = requestBody.authenticationType;

      // Handle password or SSH key based on new authentication type
      if (
        requestBody.authenticationType === USER_AUTH_TYPE_PASSWORD &&
        requestBody.password
      ) {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        updateData.passwordHash = await bcrypt.hash(requestBody.password, salt);
        updateData.publicKey = undefined; // Remove public key if switching to password
      } else if (
        requestBody.authenticationType === USER_AUTH_TYPE_SSH_KEY &&
        requestBody.publicKey
      ) {
        updateData.publicKey = requestBody.publicKey;
        updateData.passwordHash = undefined; // Remove password hash if switching to SSH key
      } else if (
        requestBody.authenticationType !== existingUser.authenticationType
      ) {
        // If changing auth type but not providing new credentials
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message: `Bad request: Missing ${
              requestBody.authenticationType === USER_AUTH_TYPE_PASSWORD
                ? 'password'
                : 'publicKey'
            } for the selected authentication type`,
            code: 'MISSING_AUTH_CREDENTIALS'
          })
        };
      }
    } else if (
      existingUser.authenticationType === USER_AUTH_TYPE_PASSWORD &&
      requestBody.password
    ) {
      // If not changing auth type but updating password
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(requestBody.password, salt);
    } else if (
      existingUser.authenticationType === USER_AUTH_TYPE_SSH_KEY &&
      requestBody.publicKey
    ) {
      // If not changing auth type but updating SSH key
      updateData.publicKey = requestBody.publicKey;
    }

    // Handle active status if provided
    if (requestBody.active !== undefined) {
      updateData.active = requestBody.active;
      logger.info('Updating user active status', {
        userId,
        active: requestBody.active
      });
    }

    // Handle temporary user expiration if provided
    if (requestBody.temporary === true) {
      updateData.expires = Math.floor(Date.now() / 1000) + 6 * 60 * 60; // 6 hours in seconds
    } else if (requestBody.temporary === false) {
      updateData.expires = 0; // Does not expire
    }

    const updatedUser = await User.update(updateData);

    // Remove sensitive fields from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutSensitiveData } = updatedUser;

    return {
      statusCode: 200,
      body: JSON.stringify(userWithoutSensitiveData)
    };
  } catch (_error) {
    logger.error('Error updating user', { error: _error });
    const error = _error as Error;
    if (error.name === 'ProductNotFoundError') {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: error.message,
          code: 'INVALID_PRODUCT_CODE'
        })
      };
    }

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
