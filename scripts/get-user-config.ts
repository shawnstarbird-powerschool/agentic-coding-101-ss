import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import axios from 'axios';
import aws4 from 'aws4';
import { URL } from 'url';
import { cleanName, getBranch, getNamespace } from '@ps-refarch/cdk-utils';
import { getDirectHostname } from './integration-test-support';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('server', {
    description: 'Server identifier to use in the API path',
    type: 'string',
    default: '1234',
  })
  .option('host', {
    description: 'API hostname (if not provided, will be calculated based on environment)',
    type: 'string',
    demandOption: false,
  })
  .option('envName', {
    description: 'Environment name to use for API hostname calculation',
    type: 'string',
  })
  .option('user', {
    description: 'Username',
    type: 'string',
    demandOption: true,
  })
  .option('password', {
    description: 'Password to send in the request',
    type: 'string',
  })
  .option('source-ip', {
    description: 'SourceIP HTTP header value',
    type: 'string',
    default: '52.205.140.168',
  })
  .help()
  .alias('help', 'h')
  .parseSync();

async function getUserConfig() {
  const { server, host, user, password, envName } = argv;
  const sourceIp = argv['source-ip'];
  
  // Construct the API path
  const path = `/servers/${server}/users/${user}/config`;
  
  // Get hostname - either from the provided host or calculate it
  let hostname: string;
  if (host) {
    // Parse the host to get hostname
    const url = new URL(`https://${host}`);
    hostname = url.hostname;
  } else {
    // Calculate hostname based on environment
    hostname = await getDirectHostname(envName);
    console.log(`Using calculated hostname: ${hostname}`);
  }
  
  // Prepare request options for signing
  const options: aws4.Request = {
    host: hostname,
    path,
    method: 'GET',
    headers: {
      'SourceIP': sourceIp,
    },
    service: 'execute-api', // AWS API Gateway service
    region: 'us-east-1',    // Default region, can be made configurable if needed
  };
  
  // Add password to headers if provided
  if (password) {
    options.headers = {
      ...options.headers,
      'Password': password,
    };
  }
  
  // Sign the request with AWS SigV4
  aws4.sign(options);
  
  try {
    // Make the API call using axios
    // Convert aws4 headers to a plain object for axios
    const headers: Record<string, string> = {};
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = value;
        } else if (Array.isArray(value)) {
          headers[key] = value.join(',');
        }
      });
    }
    
    const response = await axios({
      method: 'GET',
      url: `https://${hostname}${path}`,
      headers,
    });
    
    // Output the response
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API request failed:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', error.response.data);
      }
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  }
}

// Execute the function
getUserConfig();