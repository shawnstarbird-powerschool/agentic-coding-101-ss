import * as aws4 from 'aws4';
import axios from 'axios';
import { URL } from 'url';
import * as yargs from 'yargs';
import { getDirectHostname } from './integration-test-support';

// AWS region for API calls
const region = 'us-east-1';

/**
 * Makes an API request with AWS SigV4 authentication
 */
async function makeSignedRequest(
  url: string,
  method: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<any> {
  const urlObj = new URL(url);
  
  // Prepare the request options for aws4.sign
  const options: aws4.Request = {
    host: urlObj.host,
    path: urlObj.pathname + urlObj.search,
    method,
    headers: {
      ...headers,
      'Content-Type': headers['Content-Type'] || 'application/json'
    },
    region,
    service: 'execute-api'
  };
  
  // Add body if provided
  if (body) {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    options.body = bodyStr;
    
    if (!options.headers) {
      options.headers = {};
    }
    options.headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();
  }
  
  // Sign the request
  const signedRequest = aws4.sign(options);
  
  // Make the request with axios
  const axiosConfig: any = {
    url,
    method,
    headers: signedRequest.headers,
    data: body
  };
  
  // Return the axios response
  return axios(axiosConfig);
}

async function main() {
  // Parse command line arguments
  const argv = yargs
    .option('productCode', {
      description: 'Product code',
      type: 'string',
      required: true
    })
    .option('districtId', {
      description: 'District ID',
      type: 'string', 
      required: true
    })
    .option('publicKey', {
      description: 'SSH public key',
      type: 'string',
      required: true
    })
    .option('envName', {
      description: 'Environment name',
      type: 'string',
      required: true
    })
    .help()
    .argv as any;

  try {
    // Get the API hostname
    const hostname = await getDirectHostname(argv.envName);
    
    console.log(`Using API hostname: ${hostname}`);
    console.log(`Creating/updating product user for district ${argv.districtId}...`);

    const payload = {
      productCode: argv.productCode,
      districtId: argv.districtId,
      publicKey: argv.publicKey
    };

    // Make the API call
    const response = await makeSignedRequest(
      `https://${hostname}/products`,
      'POST',
      {
        'Content-Type': 'application/json'
      },
      payload
    );

    // Check status code
    if (response.status !== 201) {
      console.error(`Error: Expected status code 201, but got ${response.status}`);
      process.exit(1);
    }

    console.log('Success! Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);