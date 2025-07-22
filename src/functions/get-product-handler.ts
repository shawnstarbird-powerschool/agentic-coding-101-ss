import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import { getOriginHandler } from '@ps-refarch/lambda-utils';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Product, ProductType, TenantProduct } from '../util/db-schema';
import { getProductFolders } from '../util/db-utils';

// Initialize Logger
const logger = new Logger({
  serviceName: 'product-service',
  logLevel: process.env.LOG_LEVEL || ('INFO' as any)
});

// Initialize Tracer
const tracer = new Tracer({
  serviceName: 'product-service'
});

/**
 * Handler for GET /products and GET /service/products endpoints
 * Gets all product records, optionally filtered by tenant
 * When called from /products endpoint, filters by tenant
 * When called from /service/products endpoint, returns all products unfiltered
 */
export const lambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.info('Received event', { event });
  try {
    // Determine if this is a service endpoint call (IAM auth) or a regular call (session auth)
    const isServiceEndpoint = event.resource === '/service/products';
    logger.info(
      `Request type: ${
        isServiceEndpoint ? 'service endpoint' : 'regular endpoint'
      }`
    );

    let tenantId: string | undefined;
    let filteredProducts: ProductType[] = [];

    // Find all products using the GSI1 index
    const allProducts = (await Product.find(
      {
        GSI1PK: 'ALL_PRODUCTS'
      },
      { index: 'GSI1' }
    )) as ProductType[];

    logger.info('Retrieved all products', { count: allProducts.length });

    if (!isServiceEndpoint) {
      // For regular endpoint, extract tenantId from authorizer context and filter products
      tenantId = event.requestContext.authorizer?.district_uid;
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

      logger.info('Filtering products by tenant', { tenantId });

      // Get all TenantProduct records for this tenant
      const tenantProducts = await TenantProduct.find({
        PK: `TENANT#${tenantId}`
      });

      logger.info('Found tenant products', { count: tenantProducts.length });

      // Create a set of product IDs that are enabled for this tenant
      const enabledProductIds = new Set(
        tenantProducts.map((tp) => tp.productId)
      );

      // Filter the products to only include those enabled for this tenant
      filteredProducts = allProducts.filter((product) =>
        enabledProductIds.has(product.id)
      );

      logger.info('Filtered products by tenant', {
        tenantId,
        totalProducts: allProducts.length,
        filteredCount: filteredProducts.length
      });
    } else {
      // For service endpoint, return all products unfiltered
      filteredProducts = allProducts;
    }

    // Fetch folders for each product and prepare response
    const respProductsPromises = filteredProducts.map(async (product) => {
      // Get folders for this product (only active ones)
      const folders = tenantId
        ? await getProductFolders({ tenantId, product, activeOnly: true })
        : []; // Only fetch folders if we have a tenantId (regular endpoint)

      // Map folders to the required format (id, path, use)
      const simplifiedFolders = folders.map((folder) => ({
        id: folder.id,
        path: folder.path,
        use: folder.use
      }));

      return {
        id: product.id,
        productCode: product.productCode,
        name: product.name || product.productCode, // Include name field with fallback to code
        folders: simplifiedFolders,
        multiTenant: product.multiTenant,
        ipWhitelist: product.ipWhitelist,
        uses: product.uses,
        created: product.created,
        updated: product.updated
      };
    });

    // Wait for all product folder fetches to complete
    const respProducts = await Promise.all(respProductsPromises);

    return {
      statusCode: 200,
      body: JSON.stringify({
        products: respProducts,
        count: respProducts.length
      })
    };
  } catch (error) {
    logger.error('Error getting products', { error });
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
