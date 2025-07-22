import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import { cleanName } from '@ps-refarch/cdk-utils';
import { getOriginHandler } from '@ps-refarch/lambda-utils';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  Product,
  ProductType,
  Tenant,
  User,
  USER_AUTH_TYPE_PASSWORD,
  USER_AUTH_TYPE_SSH_KEY
} from '../util/db-schema';
import { hashPassword } from '../util/user-utils';

// Initialize Logger
const logger = new Logger({
  serviceName: 'product-service',
  logLevel: process.env.LOG_LEVEL || ('INFO' as any)
});

// Initialize Tracer
const tracer = new Tracer({
  serviceName: 'product-service'
});

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Interface for the POST /product request body
 */
interface PostProductRequest {
  productCode: string;
  districtId: string;
  publicKey?: string;
  password?: string;
}

/**
 * Create a placeholder file in the specified bucket
 */
async function createPlaceholderInBucket(
  bucketName: string,
  placeholderKey: string,
  tenantId: string
): Promise<void> {
  try {
    logger.info(
      `Checking if placeholder exists in bucket: ${bucketName} for tenant: ${tenantId}`
    );
    // Check if the placeholder already exists
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: placeholderKey
      })
    );

    logger.info(
      `Tenant path already exists in bucket: ${bucketName} for tenant: ${tenantId}`
    );
  } catch (error) {
    // If the object doesn't exist, create it
    if ((error as any).name === 'NotFound') {
      logger.info(
        `Creating placeholder in bucket: ${bucketName} for tenant: ${tenantId}`
      );
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: placeholderKey,
          Body: 'This is a placeholder file to establish the tenant directory structure.',
          ContentType: 'text/plain'
        })
      );

      logger.info(
        `Successfully created tenant path in bucket: ${bucketName} for tenant: ${tenantId}`
      );
    } else {
      // If it's another error, throw it
      throw error;
    }
  }
}

/**
 * Create tenant-specific paths in the S3 bucket
 */
async function createTenantPathsInS3(
  packageName: string,
  cleanEnvName: string,
  productCode: string,
  tenantId: string
): Promise<void> {
  try {
    // Construct the bucket names for internal and external buckets
    const internalBucketName = `${packageName}-${cleanEnvName}-${productCode.toLowerCase()}-int`;
    const externalBucketName = `${packageName}-${cleanEnvName}-${productCode.toLowerCase()}-ext`;

    // Create a placeholder object to establish the tenant directory in both buckets
    const placeholderKey = `${tenantId}/.placeholder`;

    // Create tenant path in internal bucket
    await createPlaceholderInBucket(
      internalBucketName,
      placeholderKey,
      tenantId
    );

    // Create tenant path in external bucket
    await createPlaceholderInBucket(
      externalBucketName,
      placeholderKey,
      tenantId
    );
  } catch (error) {
    logger.error(
      `Error creating tenant paths in S3 for tenant ${tenantId} and product ${productCode}:`,
      { error }
    );
    throw error;
  }
}

/**
 * Check if a product exists and is not multi-tenant
 */
async function validateProduct(
  productCode: string
): Promise<ProductType | false> {
  // Find all products
  const products = await Product.find(
    {
      GSI1PK: 'ALL_PRODUCTS'
    },
    { index: 'GSI1' }
  );

  // Find the product with the matching product code
  const product = products.find((p) => p.productCode === productCode);

  if (!product || !product.active) {
    logger.error('No product found with code or inactive', {
      productCode,
      product
    });
    return false;
  }

  // Check if the product is multi-tenant
  if (product.multiTenant) {
    logger.error('Product is multi-tenant, cannot create single-tenant user', {
      product
    });
    return false;
  }

  // Return the product configuration
  return product;
}

/**
 * Create a user for a single-tenant product
 */
async function createProductUser(
  productCode: string,
  tenantId: string,
  publicKey?: string,
  password?: string
): Promise<string> {
  try {
    // Determine authentication type based on provided credentials
    const authenticationType = publicKey
      ? USER_AUTH_TYPE_SSH_KEY
      : USER_AUTH_TYPE_PASSWORD;

    // Create username in the format product-productCode@tenantId for single-tenant products
    // Prefix with "product-" to ensure minimum username length of 3 characters for AWS Transfer Family
    const username = `product-${productCode.toLowerCase()}@${tenantId}`;

    // Get product configuration to access ipWhitelist and product ID
    const product = await validateProduct(productCode);
    if (!product) {
      throw new Error(`Product ${productCode} not found`);
    }

    // Extract IP whitelist from product configuration if available
    const productIpWhitelist = product.ipWhitelist || [];
    const productId = product.id;

    // Check if user already exists
    const existingUsers = await User.find(
      {
        GSI1PK: 'ALL_USERS',
        GSI1SK: `USER#${username}`
      },
      { index: 'GSI1' }
    );

    // Prepare password hash if using password authentication
    let passwordHash;
    if (authenticationType === USER_AUTH_TYPE_PASSWORD && password) {
      passwordHash = await hashPassword(password);
    }

    if (existingUsers && existingUsers.length > 0) {
      logger.info('User already exists, updating information', { username });

      // Update the existing user with new credentials and information
      const existingUser = existingUsers[0];
      await User.update({
        id: existingUser.id,
        tenantId,
        name: `${productCode} Service Account`,
        username,
        authenticationType,
        publicKey: publicKey || '',
        passwordHash: passwordHash || '',
        productId,
        // Product users don't have folders - comes from the product's item collection
        access: 'readwrite',
        active: true,
        isProductUser: true,
        ipWhitelist: productIpWhitelist, // Add IP whitelist from product configuration
        source: 'post-product-handler.ts' // Add source property
      });

      logger.info('Updated product user', {
        username,
        userId: existingUser.id,
        productId
      });
      return username;
    }

    // Create the user
    const user = await User.create({
      tenantId,
      name: `${productCode} Service Account`,
      username,
      authenticationType,
      publicKey: publicKey || '',
      passwordHash: passwordHash || '',
      productId,
      // Product users don't have folders - comes from the product's item collection
      access: 'readwrite',
      active: true,
      isProductUser: true,
      ipWhitelist: productIpWhitelist, // Add IP whitelist from product configuration
      source: 'post-product-handler.ts' // Add source property
    });

    logger.info('Created product user', {
      username,
      userId: user.id,
      productId
    });
    return username;
  } catch (error) {
    logger.error('Error creating product user:', {
      error,
      productCode,
      tenantId
    });
    throw error;
  }
}

// This is the raw handler function that will be used by tests
export const lambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.info('Received event', { event });
  try {
    // Parse the request body
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Missing request body'
        })
      };
    }

    const requestBody: PostProductRequest = JSON.parse(event.body);
    const { productCode, districtId, publicKey, password } = requestBody;

    // Validate required fields
    if (!productCode || !districtId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Missing required fields: productCode and districtId'
        })
      };
    }

    // Validate authentication method
    if (!publicKey && !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Either publicKey or password must be provided'
        })
      };
    }

    // Validate that the product exists and is not multi-tenant
    const isValidProduct = await validateProduct(productCode);
    if (!isValidProduct) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Product not found or is multi-tenant'
        })
      };
    }

    // Validate the districtId
    const tenant = await Tenant.get({ id: districtId });
    if (!tenant || !tenant.active) {
      logger.error('Tenant not found or inactive', { districtId, tenant });
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: `Tenant ${districtId} not found or inactive`
        })
      };
    }

    // Get package name and namespace for S3 paths
    const packageName = process.env.PS_PACKAGE_NAME;
    const namespace = process.env.PS_NAMESPACE;
    const cleanEnvName = cleanName(process.env.PS_ENVIRONMENT, true);

    if (!packageName || !namespace) {
      logger.error(
        'Missing environment variables for package name or namespace'
      );
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Internal server error'
        })
      };
    }

    // Create tenant-specific paths in S3
    await createTenantPathsInS3(
      packageName,
      cleanEnvName,
      productCode,
      districtId
    );

    // Create the product user
    const username = await createProductUser(
      productCode,
      districtId,
      publicKey,
      password
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Product user created successfully',
        username
      })
    };
  } catch (error) {
    logger.error('Error in post-product handler', { error });
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error'
      })
    };
  }
};

// Export both the raw handler (for tests) and the middleware-wrapped handler
export const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(
    cors({
      getOrigin: getOriginHandler(process.env),
      headers: process.env.PS_CORS_HEADERS,
      credentials: true
    })
  );
