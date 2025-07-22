#!/usr/bin/env node
import { APIGatewayProxyEvent } from 'aws-lambda';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

interface Arguments {
  district: string;
  environment: string;
  [key: string]: unknown; // Allows for other yargs-specific properties
}

const argv = yargs(hideBin(process.argv))
  .option('district', {
    alias: 'd',
    description: 'District ID to be set in the authorizer context',
    type: 'string',
    demandOption: true,
  })
  .option('environment', {
    alias: 'e',
    description: 'Value for APP_TABLE_NAME environment variable (e.g., dev-powerftp-app-AppTable)',
    type: 'string',
    demandOption: true,
  })
  .help()
  .alias('help', 'h')
  .parseSync() as Arguments;

// Set the environment variable
process.env.APP_TABLE_NAME = `power-ftp-${argv.environment}`;

import { lambdaHandler as getFoldersHandler } from '../src/functions/get-folders-handler';

// Prepare the event object for the handler
const event: Partial<APIGatewayProxyEvent> = {
  requestContext: {
    authorizer: {
      district_uid: argv.district,
    },
  } as any, // Cast to any to satisfy APIGatewayProxyEvent structure for this specific use case
  // Add other necessary event properties if your handler expects them
  // For example:
  // httpMethod: 'GET',
  // path: '/folders',
  // headers: {},
  // queryStringParameters: null,
  // pathParameters: null,
  // stageVariables: null,
  // body: null,
  // isBase64Encoded: false,
};

async function main() {
  try {
    console.log(`Calling get-folders-handler with districtId: ${argv.district} and APP_TABLE_NAME: ${process.env.APP_TABLE_NAME}`);
    // @ts-ignore // Handler expects a full APIGatewayProxyEvent, but we only need parts for this script
    const result = await getFoldersHandler(event, {} as any, () => {});
    console.log('Handler response:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error calling handler:', error);
    process.exit(1);
  }
}

main();