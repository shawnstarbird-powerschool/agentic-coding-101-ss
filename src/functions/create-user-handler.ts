import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import { getOriginHandler } from '@ps-refarch/lambda-utils';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as bcrypt from 'bcryptjs';
import { PostUserRequestPayload } from '../models/post-user';
import {
  Folder,
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
 * Handler for POST /users endpoint
 * Creates a new user
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

    const requestBody = JSON.parse(event.body) as PostUserRequestPayload;

    // Validate required fields
    const requiredFields = [
      'username',
      'authenticationType',
      'folders',
      'access',
      'productCode' // Add productCode as a required field
    ];

    const missingFields = requiredFields.filter(
      (field) => !(requestBody as any)[field]
    );
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: `Bad request: Missing required fields: ${missingFields.join(
            ', '
          )}`,
          code: 'MISSING_REQUIRED_FIELDS'
        })
      };
    }

    // Validate authentication type
    const {
      authenticationType,
      access,
      folders,
      productCode,
      username,
      ipWhitelist,
      name,
      password,
      publicKey,
      temporary
    } = requestBody;
    if (
      ![USER_AUTH_TYPE_PASSWORD, USER_AUTH_TYPE_SSH_KEY].includes(
        authenticationType
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

    // Validate access type
    if (!UserAccessEnum.includes(access)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: `Bad request: Invalid access type. Must be one of: ${UserAccessEnum}`,
          code: 'INVALID_ACCESS_TYPE'
        })
      };
    }

    // Normalize username to lowercase for case-insensitive comparison
    const normalizedUsername = username.toLowerCase();

    // Check if username already exists (using exact match on lowercase username)
    const existingUsers = (await User.find(
      {
        GSI1PK: 'ALL_USERS',
        GSI1SK: `USER#${normalizedUsername}`
      },
      { index: 'GSI1' }
    )) as UserType[];

    // If any users are found with this exact lowercase username, it exists
    const usernameExists = existingUsers.length > 0;

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

    // Look up the product by product code to get its ID
    logger.info('Looking up product by code', { productCode });
    const product = await getProductByCode(productCode);

    try {
      // Verify that all folders have the same productId as the user
      if (folders && folders.length > 0) {
        // Get all folders for this tenant
        const allFolders =
          (await Folder.find({
            PK: `TENANT#${tenantId}`
          })) || [];

        // Check if any folder has a different productId
        const invalidFolders = folders.filter((folderId: string) => {
          const folder = allFolders.find((f: any) => f.id === folderId);
          return !folder || folder.productId !== product.id;
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
      }
    } catch (folderError) {
      // If there's an error checking folders, log it but continue with user creation
      logger.warn('Error checking folder product IDs', { folderError });
    }

    // Prepare user data with all possible fields
    const userData: {
      tenantId: string;
      name?: string;
      username: string;
      authenticationType: string;
      folders: string[];
      productId: string; // Make productId required
      access: UserAccess;
      passwordHash?: string;
      publicKey?: string;
      ipWhitelist?: string[];
      source: string; // Add source property
      expires?: number;
    } = {
      tenantId,
      name,
      username: normalizedUsername, // Store username in lowercase
      authenticationType,
      folders,
      productId: product.id,
      access,
      ipWhitelist: undefined,
      source: 'create-user-handler.ts' // Set source to the basename of this file
    };

    // Handle IP whitelist if provided
    if (ipWhitelist) {
      // Check if any of the IPs are private
      const privateIps = ipWhitelist.filter((ip: string) => isPrivateIp(ip));

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

      userData.ipWhitelist = validateAndNormalizeIpList(ipWhitelist);
    }

    // Handle password or SSH key based on authentication type
    if (authenticationType === USER_AUTH_TYPE_PASSWORD && password) {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      userData.passwordHash = await bcrypt.hash(password, salt);
    } else if (authenticationType === USER_AUTH_TYPE_SSH_KEY && publicKey) {
      userData.publicKey = publicKey;
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: `Bad request: Missing ${
            authenticationType === USER_AUTH_TYPE_PASSWORD
              ? 'password'
              : 'publicKey'
          } for the selected authentication type`,
          code: 'MISSING_AUTH_CREDENTIALS'
        })
      };
    }

    // Handle temporary user expiration
    if (temporary) {
      userData.expires = Math.floor(Date.now() / 1000) + 6 * 60 * 60; // 6 hours in seconds
    } else {
      userData.expires = 0; // Does not expire
    }

    logger.info('Creating user with data', { userData });

    // Create user - use type assertion to bypass TypeScript type checking
    const newUser = await User.create(userData);

    // Remove sensitive fields from response but keep publicKey
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutSensitiveData } = newUser;

    return {
      statusCode: 201,
      body: JSON.stringify(userWithoutSensitiveData)
    };
  } catch (_error) {
    logger.error('Error creating user', { error: _error });
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
