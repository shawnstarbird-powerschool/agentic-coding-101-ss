import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import { getOriginHandler } from '@ps-refarch/lambda-utils';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetTenantResponse } from '../models/get-tenant';
import { Tenant } from '../util/db-schema';

// Initialize Logger
const logger = new Logger({
  serviceName: 'tenant-service',
  logLevel: process.env.LOG_LEVEL || ('INFO' as any)
});

// Initialize Tracer
const tracer = new Tracer({
  serviceName: 'tenant-service'
});

/**
 * Handler for GET /service/tenants/{tenantId} endpoint
 * Gets a specific tenant by ID using IAM authentication
 */
export const lambdaHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.info('Received event', { event });
  try {
    // Extract tenantId from path parameters for IAM auth
    const tenantId = event.pathParameters?.tenantId;

    if (!tenantId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: true,
          message: 'Bad Request: Missing tenant ID',
          code: 'MISSING_TENANT_ID'
        })
      };
    }

    logger.info('Getting tenant by ID using IAM auth', { tenantId });

    // Get the tenant from the database
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

    // Format the response
    const response: GetTenantResponse = {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        districtId: tenant.districtId,
        created: tenant.created?.toISOString() || new Date().toISOString(),
        updated: tenant.updated?.toISOString() || new Date().toISOString()
      }
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };
  } catch (error) {
    logger.error('Error getting tenant', { error });
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

// Export the handler wrapped with the tracer and CORS
export const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(
    cors({
      getOrigin: getOriginHandler(process.env),
      headers: process.env.PS_CORS_HEADERS,
      credentials: true
    })
  );
