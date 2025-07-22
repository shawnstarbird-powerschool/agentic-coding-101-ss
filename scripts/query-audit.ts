#!/usr/bin/env node
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { cleanName, getBranch } from '@ps-refarch/cdk-utils';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

interface Arguments {
  type: string;
  id: string;
  environment?: string;
  property?: string;
  [key: string]: unknown; // Allows for other yargs-specific properties
}

const argv = yargs(hideBin(process.argv))
  .option('type', {
    alias: 't',
    description: 'Entity type (e.g., USER, FOLDER)',
    type: 'string',
    demandOption: true,
  })
  .option('id', {
    alias: 'i',
    description: 'Entity ID',
    type: 'string',
    demandOption: true,
  })
  .option('environment', {
    alias: 'e',
    description: 'Environment name (e.g., dev, staging, prod)',
    type: 'string',
  })
  .option('property', {
    alias: 'p',
    description: 'Specific properties to display from newImage (comma-separated, e.g., username,folders,ipWhitelist)',
    type: 'string',
  })
  .help()
  .alias('help', 'h')
  .parseSync() as Arguments;

/**
 * Extract a property value from an object using a property path
 * @param obj The object to extract from
 * @param path The property path (e.g., 'user.address.city')
 * @returns The property value or undefined if not found
 */
function getPropertyByPath(obj: any, path: string): any {
  const propertyPath = path.split('.');
  let value = obj;
  
  // Navigate through nested properties
  for (const prop of propertyPath) {
    if (value && typeof value === 'object' && prop in value) {
      value = value[prop];
    } else {
      return undefined;
    }
  }
  
  return value;
}

async function queryAuditTable() {
  try {
    // Get environment name from args or current branch
    const envName = argv.environment || cleanName(await getBranch());
    const cleanEnvName = cleanName(envName, true);
    console.log(`Environment name: ${envName} (clean: ${cleanEnvName})`);

    // Determine audit table name based on environment
    const auditTableName = `power-ftp-${cleanEnvName}-audit`;
    console.log(`Audit table name: ${auditTableName}`);

    // Initialize DynamoDB DocumentClient
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    const documentClient = DynamoDBDocumentClient.from(client);

    // Create the partition key for the query
    const partitionKey = `AUDIT#${argv.type.toUpperCase()}#${argv.id}`;
    console.log(`Querying audit records with partition key: ${partitionKey}`);

    // Query the audit table
    const queryParams = {
      TableName: auditTableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': partitionKey
      },
      ScanIndexForward: true // Sort in ascending order (oldest first)
    };

    const result = await documentClient.send(new QueryCommand(queryParams));

    console.log(`Found ${result.Items?.length || 0} audit records`);

    // Process and display the results
    if (result.Items && result.Items.length > 0) {
      result.Items.forEach(item => {
        // Extract timestamp from the sort key (SK format: timestamp#ulid)
        const timestamp = item.SK.split('#')[0];
        
        // Parse the newImage JSON if it exists and convert from DynamoDB format to JS object
        let newImage: any = null;
        if (item.newImage) {
          try {
            // Parse the JSON string to get the DynamoDB native format
            const parsedImage = JSON.parse(item.newImage);
            // Convert from DynamoDB native format to JS object
            newImage = unmarshall(parsedImage);
          } catch (error) {
            console.error('Error parsing or unmarshalling newImage JSON:', error);
          }
        }

        console.log('\n---------------------------------------------------');
        console.log(`Timestamp: ${timestamp}`);
        console.log(`Event: ${item.eventName}`);
        console.log(`Entity Type: ${item.entityType}`);
        console.log(`Entity ID: ${item.entityId}`);
        console.log(`Tenant ID: ${item.tenantId}`);
        
        // If specific properties were requested, only display those properties
        if (argv.property && newImage) {
          const properties = argv.property.split(',').map(p => p.trim());
          
          console.log('Properties:');
          const extractedProperties: Record<string, any> = {};
          
          properties.forEach(prop => {
            const value = getPropertyByPath(newImage, prop);
            extractedProperties[prop] = value;
            console.log(`${prop}: ${JSON.stringify(value)}`);
          });
        } else {
          // Display the entire newImage
          console.log('New Image:');
          console.log(JSON.stringify(newImage, null, 2));
        }
      });
    } else {
      console.log('No audit records found for the specified type and ID');
    }
  } catch (error) {
    console.error('Error querying audit table:', error);
    process.exit(1);
  }
}

queryAuditTable();