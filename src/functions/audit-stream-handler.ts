import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import middy from '@middy/core';
import { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import { ulid } from 'ulid';

// Initialize Logger
const logger = new Logger({
  serviceName: 'audit-service',
  logLevel: process.env.LOG_LEVEL || ('INFO' as any)
});

// Initialize Tracer
const tracer = new Tracer({
  serviceName: 'audit-service'
});

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Get the audit table name from environment variables
const { AUDIT_TABLE_NAME } = process.env;
if (!AUDIT_TABLE_NAME) {
  throw new Error('AUDIT_TABLE_NAME environment variable is not set');
}

/**
 * Process a DynamoDB Stream record and create an audit entry
 * @param record The DynamoDB Stream record
 */
async function processRecord(record: DynamoDBRecord): Promise<void> {
  // Skip if this is not a MODIFY, INSERT, or REMOVE event
  if (
    !record.eventName ||
    !['MODIFY', 'INSERT', 'REMOVE'].includes(record.eventName)
  ) {
    logger.info('Skipping record with unsupported event type', {
      eventName: record.eventName
    });
    return;
  }

  // Skip if there's no NewImage or OldImage
  if (!record.dynamodb) {
    logger.info('Skipping record with no dynamodb data');
    return;
  }

  // Extract the entity type from the SK (e.g., USER#123 -> USER)
  let entityType = 'Unknown';
  let entityId = 'Unknown';
  let tenantId = 'Unknown';

  // Try to extract entity type and ID from the sort key
  if (record.dynamodb.Keys?.SK?.S) {
    const sk = record.dynamodb.Keys.SK.S;
    const skParts = sk.split('#');
    if (skParts.length > 1) {
      const [type, ...idParts] = skParts;
      entityType = type;
      entityId = idParts.join('#');
    }
  }

  // Try to extract tenant ID from the partition key
  if (record.dynamodb.Keys?.PK?.S) {
    const pk = record.dynamodb.Keys.PK.S;
    const pkParts = pk.split('#');
    if (pkParts.length > 1 && pkParts[0] === 'TENANT') {
      tenantId = pkParts.slice(1).join('#');
    }
  }

  // Calculate expiration timestamp (7 days from now)
  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(now.getDate() + 7);

  // Create the audit record
  const auditRecord = {
    id: ulid(), // Generate a unique ID for the audit record
    timestamp: now.toISOString(),
    eventName: record.eventName,
    entityType,
    entityId,
    tenantId,
    oldImage: record.dynamodb.OldImage
      ? JSON.stringify(record.dynamodb.OldImage)
      : null,
    newImage: record.dynamodb.NewImage
      ? JSON.stringify(record.dynamodb.NewImage)
      : null,
    // Use PK and SK format for the audit table
    PK: `AUDIT#${entityType}#${entityId}`,
    SK: `${now.toISOString()}#${ulid()}`,
    // Add GSI1 fields for querying on original PK and SK
    GSI1PK: record.dynamodb.Keys?.PK?.S,
    GSI1SK: record.dynamodb.Keys?.SK?.S,
    // Add TTL field (in seconds since epoch)
    expires: Math.floor(sevenDaysFromNow.getTime() / 1000)
  };

  // Log the audit record
  logger.info('Creating audit record', { auditRecord });

  // Write the audit record to the audit table
  try {
    await docClient.send(
      new PutCommand({
        TableName: AUDIT_TABLE_NAME,
        Item: auditRecord
      })
    );
    logger.info('Successfully created audit record', { id: auditRecord.id });
  } catch (error) {
    logger.error('Failed to create audit record', { error, auditRecord });
    throw error;
  }
}

/**
 * Lambda handler for processing DynamoDB Stream events
 * @param event The DynamoDB Stream event
 */
export const lambdaHandler = async (
  event: DynamoDBStreamEvent
): Promise<void> => {
  logger.info('Received DynamoDB Stream event', {
    recordCount: event.Records.length
  });

  // Process all records in parallel
  await Promise.all(
    event.Records.map(async (record) => {
      try {
        await processRecord(record);
      } catch (error) {
        logger.error('Error processing record', { error, record });
        // Continue processing other records even if one fails
      }
    })
  );

  logger.info('Finished processing DynamoDB Stream event');
};

// Export the handler wrapped with the tracer
export const handler = middy(lambdaHandler).use(captureLambdaHandler(tracer));
