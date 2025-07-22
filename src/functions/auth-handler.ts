import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  TransferFamilyAuthorizerResult
} from 'aws-lambda';
import {
  Product,
  ProductType,
  User,
  USER_AUTH_TYPE_PASSWORD,
  UserType
} from '../util/db-schema';
import { getFolderById } from '../util/db-utils';
import { getBucketEnvName } from '../util/env-var-utils';
import { isIpInCidrList } from '../util/ip-utils';
import { ensureSubfoldersExist } from '../util/s3-utils';
import { verifyPassword } from '../util/user-utils';

// Initialize Logger
const logger = new Logger({
  serviceName: 'auth-service',
  logLevel: process.env.LOG_LEVEL || ('INFO' as any)
});

// Initialize Tracer
const tracer = new Tracer({
  serviceName: 'auth-service'
});

/**
 * Validates a user's password against the stored hash
 * @param user The user object containing the passwordHash
 * @param password The plain text password to verify
 * @returns A promise that resolves to true if the password is valid, false otherwise
 */
async function validateUserPassword(
  user: UserType,
  password: string
): Promise<boolean> {
  // If the user doesn't have a password hash, authentication fails
  if (!user.passwordHash) {
    logger.info('User does not have a password hash');
    return false;
  }

  try {
    // Use the verifyPassword function from user-utils.ts to verify the password
    const isValid = await verifyPassword(password, user.passwordHash);
    return isValid;
  } catch (error) {
    logger.error('Error validating password:', { error });
    return false;
  }
}

/**
 * Looks up a user by username in the database
 * @param username The username to look up
 * @returns The user object if found, null otherwise
 */
async function getUserByUsername(
  username: string
): Promise<UserType | undefined> {
  logger.info('Looking up user by username', { username });

  // Use the GSI1 index to find the user by username
  const users = await User.find(
    {
      GSI1PK: 'ALL_USERS',
      GSI1SK: `USER#${username}`
    },
    { index: 'GSI1' }
  );

  if (!users || users.length === 0) {
    logger.info('No user found with username', { username });
    return undefined;
  }

  logger.info('Found user', { user: users[0] });
  return users[0] as unknown as UserType;
}

/**
 * Fetch product information from the database
 * @param productCode The product code to look up
 * @returns True if the product is multi-tenant, false otherwise
 */
/**
 * Get a product by its ID
 * @param productId The ID of the product to look up
 * @returns The product object if found, null otherwise
 */
async function getProductById(productId: string) {
  try {
    const product = await Product.get({
      id: productId,
      PK: `PRODUCT#${productId}`
    });
    return product;
  } catch (error) {
    logger.error('Error getting product by ID:', {
      error,
      productId
    });
    return null;
  }
}

export type UserAuthorizationType =
  | 'product-multi-tenant'
  | 'product-single-tenant'
  | 'human';

function getUserAuthorizationType(
  user: UserType,
  product: ProductType
): UserAuthorizationType {
  if (user.isProductUser) {
    return product.multiTenant
      ? 'product-multi-tenant'
      : 'product-single-tenant';
  }
  return 'human';
}

/**
 * Returns the longest common ancestor path from an array of folder paths. This is used
 * when the user has multiple folders and we need to find the common ancestor path.
 * @param paths An array of folder paths
 * @returns The common ancestor path
 */
export function findCommonAncestorPath(paths: string[]): string {
  if (paths.length === 0) throw new Error('No paths provided');

  // Split all paths into their components
  const splitPaths = paths.map((path) => path.split('/').filter(Boolean));

  // Initialize result as an array to build common parts
  const commonParts: string[] = [];

  // Iterate over the shortest path length
  const minLength = Math.min(...splitPaths.map((parts) => parts.length));
  for (let i = 0; i < minLength; i += 1) {
    const part = splitPaths[0][i];
    if (splitPaths.every((p) => p[i] === part)) {
      commonParts.push(part);
    } else {
      break;
    }
  }

  if (commonParts.length === 0) {
    return ''; // No common ancestor found
  }

  return `${commonParts.join('/')}`;
}

async function getUserFolders(props: {
  tenantId: string;
  folderIds: string[];
}): Promise<string[]> {
  const { tenantId, folderIds: folders } = props;

  const folderPaths: string[] = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const id of folders) {
    // eslint-disable-next-line no-await-in-loop
    const folder = await getFolderById({ tenantId, id });
    logger.info('Processing folderId:', { id, folder });

    if (!folder) {
      throw new Error(`Folder ${folder} not found for user: ${id}`);
    }

    // Skip inactive folders
    if (folder.active !== false) {
      // Strip the leading slash if it exists
      const path = folder.path.startsWith('/')
        ? folder.path.slice(1)
        : folder.path;

      folderPaths.push(path);
    }
  }

  return folderPaths;
}

/**
 * Determines the S3 actions to allow based on the user's access level
 * @param access The user's access level ('read', 'write', or 'readwrite')
 * @returns An array of S3 actions to allow
 */
function determineS3Actions(access: string): string[] {
  logger.info('Determining S3 actions based on access level', { access });
  switch (access) {
    case 'read':
      return ['s3:GetObject'];
    case 'write':
      return ['s3:PutObject', 's3:DeleteObject'];
    case 'readwrite':
      return ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'];
    default:
      // Default to read-only access for safety
      logger.warn('Unknown access level, defaulting to read-only', { access });
      return ['s3:GetObject'];
  }
}

/**
 * Generates AWS Transfer Family authorization information for a user based on their type and access level.
 * This function determines the appropriate S3 bucket access policies, home directory path, and folder permissions
 * based on whether the user is a product user (multi-tenant or single-tenant) or a human user.
 *
 * @param {Object} props - The properties object containing user, product, and bucket information
 * @param {UserType} props.user - The user object containing authentication and access information
 * @param {ProductType} props.product - The product object associated with the user
 * @param {string} props.bucketName - The name of the S3 bucket to grant access to
 *
 * @returns {Promise<Object>} A promise that resolves to an object containing:
 *   - homeDirectory {string} - The user's home directory path in the S3 bucket
 *   - policy {string} - A JSON string containing the IAM policy for S3 access
 *   - folderPaths {string[]} - An array of folder paths the user has access to
 *
 * @throws {Error} Throws an error if:
 *   - User folders is not an array
 *   - A folder specified in user.folders is not found
 *   - The user authorization type is unknown
 */
export async function getUserAuthorizationInfo(props: {
  user: UserType;
  product: ProductType;
  bucketName: string;
}): Promise<{ homeDirectory: string; policy: string; folderPaths: string[] }> {
  const { user, product, bucketName } = props;

  const userAuthType = getUserAuthorizationType(user, product);
  const { tenantId } = user;

  let homeDirectory: string;
  let policy: string;
  let folderPaths: string[] = [];

  if (userAuthType === 'product-multi-tenant') {
    homeDirectory = `/${props.bucketName}`;
    policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowListingOfUserFolder',
          Effect: 'Allow',
          Action: ['s3:ListBucket'],
          Resource: [`arn:aws:s3:::${bucketName}`],
          Condition: {
            StringLike: {
              's3:prefix': '*'
            }
          }
        },
        {
          Sid: 'HomeDirObjectAccess',
          Effect: 'Allow',
          Action: determineS3Actions(user.access),
          Resource: [`arn:aws:s3:::${bucketName}/*`]
        }
      ]
    });
  } else if (userAuthType === 'product-single-tenant') {
    homeDirectory = `/${props.bucketName}/${tenantId}`;
    policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowListingOfUserFolder',
          Effect: 'Allow',
          Action: ['s3:ListBucket'],
          Resource: [`arn:aws:s3:::${bucketName}`],
          Condition: {
            StringLike: {
              's3:prefix': [`${tenantId}/*`, `${tenantId}`]
            }
          }
        },
        {
          Sid: 'HomeDirObjectAccess',
          Effect: 'Allow',
          Action: determineS3Actions(user.access),
          Resource: [
            `arn:aws:s3:::${bucketName}/${tenantId}/*`,
            `arn:aws:s3:::${bucketName}/${tenantId}`
          ]
        }
      ]
    });
  } else if (userAuthType === 'human') {
    // Human user, get the longest common prefix
    const folderIds = user.folders || [];
    if (!Array.isArray(folderIds)) {
      throw new Error('User folders should be an array');
    }

    folderPaths = await getUserFolders({
      tenantId,
      folderIds
    });

    // Works for one or multiple folders
    const commonPath = findCommonAncestorPath(folderPaths);
    const commonPathWithSlashIfNotEmpty =
      commonPath !== '' ? `/${commonPath}` : commonPath;

    homeDirectory = `/${props.bucketName}/${user.tenantId}${commonPathWithSlashIfNotEmpty}`;
    policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowListingOfUserFolder',
          Effect: 'Allow',
          Action: ['s3:ListBucket'],
          Resource: [`arn:aws:s3:::${bucketName}`],
          Condition: {
            StringLike: {
              's3:prefix': [
                `${tenantId}${commonPathWithSlashIfNotEmpty}`,
                `${tenantId}${commonPathWithSlashIfNotEmpty}/*`
              ]
            }
          }
        },
        {
          Sid: 'HomeDirObjectAccess',
          Effect: 'Allow',
          Action: determineS3Actions(user.access),
          Resource: folderPaths.flatMap((folderPath) => [
            `arn:aws:s3:::${bucketName}/${user.tenantId}/${folderPath}/*`,
            `arn:aws:s3:::${bucketName}/${user.tenantId}/${folderPath}`
          ])
        }
      ]
    });
  } else {
    logger.error('Unknown user authorization type', { userAuthType });
    throw new Error('Unknown user authorization type');
  }

  return {
    homeDirectory,
    policy,
    folderPaths
  };
}

// This is the raw handler function that will be used by tests
export const lambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.info('Received event 3', { event });
  try {
    const { serverId, username: rawUsername } = event.pathParameters || {};

    if (!serverId || !rawUsername) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Missing required path parameters: serverId and username'
        })
      };
    }

    const username = decodeURIComponent(rawUsername);

    // Check if this is password-based authentication
    logger.info('headers', {
      headers: event.headers,
      password: event.headers?.Password
    });
    const password = event.headers ? event.headers.Password : undefined;
    const isRequestPasswordAuth = password != null && password.length > 0;

    // Check if the user exists in the database
    const user = await getUserByUsername(username);
    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: 'User not found'
        })
      };
    }

    // Check if the user is active
    if (user.active === false) {
      logger.info('User is inactive', { username, securityEvent: true });
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: 'User account is inactive'
        })
      };
    }

    // Check IP whitelist if configured
    const sourceIp = event.headers?.SourceIP;
    if (user.ipWhitelist && user.ipWhitelist.length > 0 && sourceIp) {
      const isIpAllowed = isIpInCidrList(sourceIp, user.ipWhitelist);
      if (!isIpAllowed) {
        logger.info('IP address not in whitelist', {
          username,
          sourceIp,
          ipWhitelist: user.ipWhitelist,
          securityEvent: true
        });
        return {
          statusCode: 403,
          body: JSON.stringify({
            message: 'Access denied: IP address not in whitelist'
          })
        };
      }
    }

    logger.info('User found', { user });

    const isUserDefPasswordAuth =
      user.authenticationType === USER_AUTH_TYPE_PASSWORD;

    // Authenticate user based on authentication method
    const { publicKey } = user;

    // Log authentication method details
    logger.info('Authentication method', {
      isRequestPasswordAuth,
      isUserDefPasswordAuth,
      user,
      publicKey
    });

    // Check if the user is using password authentication
    if (isRequestPasswordAuth !== isUserDefPasswordAuth) {
      logger.error('Invalid authentication method', {
        username,
        isRequestPasswordAuth,
        isUserDefPasswordAuth,
        sourceIp: event.headers?.SourceIP,
        securityEvent: true
      });
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Invalid authentication method'
        })
      };
    }

    if (isRequestPasswordAuth) {
      // For password authentication
      const isValidPassword = await validateUserPassword(user, password);
      if (!isValidPassword) {
        logger.info('Invalid password attempt', {
          username,
          sourceIp: event.headers?.SourceIP,
          securityEvent: true
        });
        return {
          statusCode: 401,
          body: JSON.stringify({
            message: 'Invalid credentials'
          })
        };
      }
    } else if (!publicKey) {
      // For SSH key authentication, check if the public key is present
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Public key is required for SSH key authentication'
        })
      };
    }

    // Determine which product the user belongs to
    let product: ProductType | undefined;

    // Get the product using the productId field
    if (user.productId) {
      logger.info('Looking up product using productId', {
        productId: user.productId
      });
      const tempProduct = await getProductById(user.productId);
      if (tempProduct) {
        product = tempProduct;
        logger.info('Found product using productId', {
          productId: user.productId,
          productCode: product.productCode
        });
      }
    }

    if (product == null) {
      throw new Error('User does not have a valid productId');
    }

    // Determine which bucket to use based on user type
    const bucketSuffix = user.isProductUser ? 'int' : 'ext';
    const { productCode } = product;
    const bucketEnvVar = getBucketEnvName(productCode, bucketSuffix);
    const bucketName = process.env[bucketEnvVar];

    if (!bucketName) {
      logger.error('Bucket not found for product', {
        productCode,
        bucketEnvVar
      });
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: `Internal server error: Product bucket not configured for ${bucketEnvVar}`
        })
      };
    }

    // Get pieces of the response based on user type (product or human)
    const { homeDirectory, policy, folderPaths } =
      await getUserAuthorizationInfo({
        user,
        product,
        bucketName
      });

    // Get the final response from the authorization function
    const authConfig: TransferFamilyAuthorizerResult = {
      Role: process.env.TRANSFER_USER_ROLE_ARN,
      HomeDirectory: homeDirectory,
      Policy: policy
    };

    // Ensure their home directory(s) exist in the bucket
    await ensureSubfoldersExist(bucketName, user.tenantId, folderPaths);

    // Only include public keys for SSH key authentication
    if (publicKey) {
      authConfig.PublicKeys = [publicKey];
    }

    // Update the lastLogin timestamp
    try {
      await User.update({
        tenantId: user.tenantId,
        id: user.id,
        lastLogin: Date.now(),
        source: 'auth-handler.ts'
      });
      logger.info('Updated lastLogin timestamp', { username });
    } catch (updateError) {
      // Log the error but don't fail the authentication
      logger.error('Failed to update lastLogin timestamp', {
        error: updateError,
        username
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify(authConfig)
    };
  } catch (error) {
    // If it's a FolderNotFoundError, return a 403
    if ((error as Error).name === 'FolderNotFoundError') {
      logger.error('Folder not found', { error });
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: 'Access denied: Folder not found'
        })
      };
    }

    logger.error('Error in auth handler', { error });
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error'
      })
    };
  }
};

// Export both the raw handler (for tests) and the middleware-wrapped handler
export const handler = middy(lambdaHandler).use(captureLambdaHandler(tracer));
