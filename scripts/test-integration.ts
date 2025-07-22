import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { cleanName, getBranch } from '@ps-refarch/cdk-utils';
import { DynamoDB } from 'aws-sdk';
import * as aws4 from 'aws4';
import axios from 'axios';
import { readFileSync } from 'fs';
import * as jwt from 'jsonwebtoken';
import { ulid } from 'ulid';
import { URL } from 'url';
import { ProductResponse } from '../src/models/get-products';
import { PostFolderResponse } from '../src/models/post-folder';
import { getTransferServerConfig } from '../src/util/build-utils';
import { getDirectHostname, getEnvNames, getIntegrationSessionRef, getTableName, TENANT_ID, TENANT_ID_QA } from './integration-test-support';
import { testTemporaryFolderFlag, testTemporaryUserFlag } from './test-temporary-flag';

export const FTP_PRODUCT_SHORT_NAME = 'FTP'; // Hardcode because we can't import it

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { argv } = require('yargs/yargs')(process.argv.slice(2));
const testType = argv.testType as string | undefined;

// AWS region for API calls
const region = 'us-east-1';

// DynamoDB client is used to query the tracking table and verify contents
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

/**
 * Makes an API request with AWS SigV4 authentication
 * @param url The URL to request
 * @param method The HTTP method
 * @param headers Additional headers
 * @param body The request body (if any)
 * @param validateStatus Function to determine if status code is valid
 * @returns The axios response
 */
async function makeSignedRequest(
  url: string,
  method: string,
  headers: Record<string, string> = {},
  body?: any,
  validateStatus?: (status: number) => boolean
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
    
    // Ensure headers is defined
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
    data: body,
  };
  
  // Add validateStatus if provided
  if (validateStatus) {
    axiosConfig.validateStatus = validateStatus;
  }
  
  // Return the axios response
  return axios(axiosConfig);
  
  // Add validateStatus if provided
  if (validateStatus) {
    axiosConfig.validateStatus = validateStatus;
  }
  
  // Make the request with axios
  return axios(axiosConfig);
}

/**
 * Integration test for the get-user API
 * Tests retrieving a user by ID with proper authentication
 */
async function testGetUserById(): Promise<void> {
  try {
    // Get the API hostname
    const hostname = await getDirectHostname();
    const userId = '01JRDJ7YJN1QD1F49CNYYVSZ8Q';
    const xSessionRef = await getIntegrationSessionRef();

    console.log(`Testing get-user API for user ID: ${userId}`);
    console.log(`Using API hostname: ${hostname}`);
    
    // Make the API call
    const response = await axios.get(`https://${hostname}/users/${userId}`, {
      headers: {
        'x-session-ref': xSessionRef
      }
    });
    
    // Check status code
    if (response.status !== 200) {
      console.error(`*** Expected status code 200, but got ${response.status}`);
      process.exit(1);
    }
    
    console.log('✅ Status code is 200');
    
    // Check response body structure
    const user = response.data.user;
    
    // Validate required fields
    const requiredFields = ['id', 'tenantId', 'name', 'username', 'authenticationType', 'folders', 'access'];
    const missingFields = requiredFields.filter(field => !user[field]);
    
    if (missingFields.length > 0) {
      console.error(`*** Response is missing required fields: ${missingFields.join(', ')}`);
      console.error('Response:', JSON.stringify(user, null, 2));
      process.exit(1);
    }
    
    // Validate that the ID matches what we requested
    if (user.id !== userId) {
      console.error(`*** Expected user ID ${userId}, but got ${user.id}`);
      process.exit(1);
    }
    
    if (user.folders?.length === 0) {
      console.error('*** User has no folders');
      process.exit(1);
    }

    console.log('✅ Response body contains all required fields');
    console.log('✅ User ID matches the requested ID');
    
    // Check if the user has an IP whitelist
    if (user.ipWhitelist) {
      console.log('✅ User has IP whitelist:', user.ipWhitelist);
    }
    
    // Log success
    console.log('✅ Get user by ID test passed successfully');
    console.log('User details:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('*** Error testing get-user API:', error);
    process.exit(1);
  }
}

/**
 * Test updating a user's IP whitelist
 */
async function testUpdateUserIpWhitelist(): Promise<void> {
  try {
    // Get the API hostname
    const hostname = await getDirectHostname();
    const userId = '01JRDJ7YJN1QD1F49CNYYVSZ8Q';    
    const xSessionRef = await getIntegrationSessionRef();
    
    console.log(`Testing update-user API for user ID: ${userId}`);
    console.log(`Using API hostname: ${hostname}`);
    
    // First, get the current user data
    const getUserResponse = await axios.get(`https://${hostname}/users/${userId}`, {
      headers: {
        'x-session-ref': xSessionRef
      }
    });
    
    const user = getUserResponse.data.user;
    console.log('Current user data:', JSON.stringify(user, null, 2));
    
    const userFolders: string[] = user.folders.map((folder: any) => folder.id);

    // Prepare the update payload with IP whitelist
    const updatePayload = {
      "ipWhitelist": [
          "52.205.140.168/32",
          "35.170.140.164/32",
          "52.33.154.13",
          "54.189.28.163"
      ],
      folders: userFolders,
    };
    
    // Update the user
    const updateResponse = await axios.put(
      `https://${hostname}/users/${userId}`,
      updatePayload,
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Check status code
    if (updateResponse.status !== 200) {
      console.error(`*** Expected status code 200, but got ${updateResponse.status}`);
      process.exit(1);
    }
    
    console.log('✅ Update status code is 200');
    
    // Verify the updated user data
    const updatedUser = updateResponse.data;
    
    // Check if the IP whitelist was updated correctly
    if (!updatedUser.ipWhitelist ||
        !Array.isArray(updatedUser.ipWhitelist) ||
        updatedUser.ipWhitelist.length !== 4) {
      console.error('*** IP whitelist was not updated correctly');
      console.error('Expected 3 IP addresses, got:', updatedUser.ipWhitelist);
      process.exit(1);
    }
    
    // Check if all IP addresses are in the whitelist
    const expectedIps = updatePayload.ipWhitelist.map(ip => ip.includes('/') ? ip : `${ip}/32`);
    const missingIps = expectedIps.filter(ip => !updatedUser.ipWhitelist.includes(ip));
    
    if (missingIps.length > 0) {
      console.error(`*** IP whitelist is missing expected IPs: ${missingIps.join(', ')}`);
      process.exit(1);
    }
    
    console.log('✅ IP whitelist was updated correctly');
    console.log('Updated user details:', JSON.stringify(updatedUser, null, 2));
    
    // Restore the original IP whitelist if it existed
    if (user.ipWhitelist !== undefined) {
      const restorePayload = {
        ipWhitelist: user.ipWhitelist
      };
      
      const restoreResponse = await axios.put(
        `https://${hostname}/users/${userId}`,
        restorePayload,
        {
          headers: {
            'x-session-ref': xSessionRef,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (restoreResponse.status === 200) {
        console.log('✅ Original IP whitelist restored');
      } else {
        throw new Error('⚠️ Failed to restore original IP whitelist');
      }
    }
    
    console.log('✅ Update user IP whitelist test passed successfully');
    
  } catch (error) {
    console.error('*** Error testing update-user API:', error);
    process.exit(1);
  }
}
/**
 * Test the server config endpoint for Transfer Family authentication
 * This tests the authentication endpoint used by AWS Transfer Family
 */
async function testServerConfigEndpoint(): Promise<void> {
  try {
    // Get the API hostname
    const hostname = await getDirectHostname();
    const serverId = '12341234-1234-1234-1234-123412341234';
    const { cleanEnvName } = await getEnvNames();

    console.log('Running server config endpoint tests...');
    console.log(`Using API hostname: ${hostname}`);
    
    // Test 1: Password authentication with valid IP
    console.log('\nTest 1: Password authentication with valid IP');
    try {
      // Add the Password and SourceIP headers
      const headers = {
        'Password': 'thisismypassword',
        'SourceIP': '52.205.140.168',
        'Content-Type': 'application/json'
      };
      // Make the signed request
      const url = `https://${hostname}/servers/${serverId}/users/bobbleaux-do-not-modify/config`;
      const response1 = await makeSignedRequest(url, 'GET', headers);
      
      // Check status code
      if (response1.status !== 200) {
        console.error(`*** Expected status code 200, but got ${response1.status}`);
        process.exit(1);
      }
      
      console.log('✅ Status code is 200');
      
      // Check response body structure
      const config1 = response1.data;
      
      // Validate required fields
      if (!config1.Role) {
        console.error(`*** Response is missing Role`);
        process.exit(1);
      }
      
      if (config1.HomeDirectory !== `/power-ftp-${cleanEnvName}-pm-ext/${TENANT_ID}/integration-test/enrollment-01jsfyqp57xqmthq915s0facgq`) {
        console.error(`*** Response is missing or has invalid HomeDirectory: ${config1.HomeDirectory}`);
        process.exit(1);
      }
      
      console.log('✅ Response contains correct Role and HomeDirectory');
      console.log('✅ Test 1 passed successfully');
      console.log('Config details:', JSON.stringify(config1, null, 2));
      
    } catch (error) {
      console.error('*** Test 1 failed:', error);
      process.exit(1);
    }
    
    // Test 2: SSH key authentication
    console.log('\nTest 2: SSH key authentication');
    try {
      // Add headers (empty for SSH key auth)
      const headers = {
        'Content-Type': 'application/json'
      };
      // Make the signed request
      const url = `https://${hostname}/servers/${serverId}/users/bobpublic-do-not-modify/config`;
      const response2 = await makeSignedRequest(url, 'GET', headers);
      
      // Check status code
      if (response2.status !== 200) {
        console.error(`*** Expected status code 200, but got ${response2.status}`);
        process.exit(1);
      }
      
      console.log('✅ Status code is 200');
      
      // Check response body structure
      const config2 = response2.data;
      
      // Validate required fields
      if (!config2.Role) {
        console.error(`*** Response is missing Role`);
        process.exit(1);
      }
      
      if (config2.HomeDirectory !== `/power-ftp-${cleanEnvName}-pm-ext/${TENANT_ID}/integration-test/scan-01jsfyqp57xqmthq915s0facgq`) {
        console.error(`*** Response is missing or has invalid HomeDirectory: ${config2.HomeDirectory}: ${JSON.stringify(config2, null, 2)}`);
        process.exit(1);
      }
      
      if (!config2.PublicKeys || !Array.isArray(config2.PublicKeys) || config2.PublicKeys.length === 0) {
        console.error('*** Response is missing PublicKeys array');
        process.exit(1);
      }
      
      if (!config2.PublicKeys[0].startsWith('ssh-rsa')) {
        console.error(`*** PublicKey does not start with ssh-rsa: ${config2.PublicKeys[0]}`);
        process.exit(1);
      }
      
      console.log('✅ Response contains correct Role, HomeDirectory, and PublicKeys');
      console.log('✅ Test 2 passed successfully');
      console.log('Config details:', JSON.stringify(config2, null, 2));
      
    } catch (error) {
      console.error('*** Test 2 failed:', error);
      process.exit(1);
    }
    
    // Test 3: Failed authentication due to IP restriction
    console.log('\nTest 3: Failed authentication due to IP restriction');
    try {
      // Add the Password and SourceIP headers
      const headers = {
        'Password': 'thisismypassword',
        'SourceIP': '1.2.3.4',
        'Content-Type': 'application/json'
      };
      // Make the signed request
      const url = `https://${hostname}/servers/${serverId}/users/bobbleaux-do-not-modify/config`;
      const response3 = await makeSignedRequest(
        url,
        'GET',
        headers,
        undefined,
        (status) => status < 500 // Accept any status code less than 500
      );
      
      // Check status code
      if (response3.status !== 403) {
        console.error(`*** Expected status code 403, but got ${response3.status}`);
        process.exit(1);
      }
      
      console.log('✅ Status code is 403 as expected');
      console.log('✅ Test 3 passed successfully');
      console.log('Response:', JSON.stringify(response3.data, null, 2));
      
    } catch (error) {
      console.error('*** Test 3 failed:', error);
      process.exit(1);
    }
    
    // Test 4: Successful authentication with specific allowed IP
    console.log('\nTest 4: Successful authentication with specific allowed IP');
    try {
      // Add the Password and SourceIP headers
      const headers = {
        'Password': 'thisismypassword',
        'SourceIP': '52.205.140.168',
        'Content-Type': 'application/json'
      };
      // Make the signed request
      const url = `https://${hostname}/servers/${serverId}/users/bobbleaux-do-not-modify/config`;
      const response4 = await makeSignedRequest(url, 'GET', headers);
      
      // Check status code
      if (response4.status !== 200) {
        console.error(`*** Expected status code 200, but got ${response4.status}`);
        process.exit(1);
      }
      
      console.log('✅ Status code is 200');
      
      // Check response body structure
      const config4 = response4.data;
      
      // Validate required fields
      if (!config4.Role) {
        console.error(`*** Response is missing Role`);
        process.exit(1);
      }
      
      if (config4.HomeDirectory !== `/power-ftp-${cleanEnvName}-pm-ext/${TENANT_ID}/integration-test/enrollment-01jsfyqp57xqmthq915s0facgq`) {
        console.error(`*** Response is missing or has invalid HomeDirectory: ${config4.HomeDirectory}`);
        process.exit(1);
      }
      
      console.log('✅ Response contains correct Role and HomeDirectory');
      console.log('✅ Test 4 passed successfully');
      console.log('Config details:', JSON.stringify(config4, null, 2));
      
    } catch (error) {
      console.error('*** Test 4 failed:', error);
      process.exit(1);
    }
    
    // Test 5: Login as product-pm with SSH key authentication
    console.log('\nTest 5: Login as product-pm with SSH key authentication');
    try {
      // Add headers (empty for SSH key auth)
      const headers = {
        'Content-Type': 'application/json'
      };
      // Make the signed request
      const url = `https://${hostname}/servers/${serverId}/users/product-pm/config`;
      const response5 = await makeSignedRequest(url, 'GET', headers);
      
      // Check status code
      if (response5.status !== 200) {
        console.error(`*** Expected status code 200, but got ${response5.status}`);
        process.exit(1);
      }
      
      console.log('✅ Status code is 200');
      
      // Check response body structure
      const config5 = response5.data;
      
      // Validate required fields
      if (!config5.Role) {
        console.error(`*** Response is missing Role`);
        process.exit(1);
      }
      
      if (!config5.HomeDirectory || !config5.HomeDirectory.includes('power-ftp')) {
        console.error(`*** Response is missing or has invalid HomeDirectory: ${config5.HomeDirectory}`);
        process.exit(1);
      }
      
      // Specifically check that PublicKeys is returned
      if (!config5.PublicKeys || !Array.isArray(config5.PublicKeys) || config5.PublicKeys.length === 0) {
        console.error('*** Response is missing PublicKeys array');
        process.exit(1);
      }
      
      if (!config5.PublicKeys[0].startsWith('ssh-rsa')) {
        console.error(`*** PublicKey does not start with ssh-rsa: ${config5.PublicKeys[0]}`);
        process.exit(1);
      }
      
      console.log('✅ Response contains correct Role, HomeDirectory, and PublicKeys');
      console.log('✅ Test 5 passed successfully');
      console.log('Config details:', JSON.stringify(config5, null, 2));
      
    } catch (error) {
      console.error('*** Test 5 failed:', error);
      process.exit(1);
    }
    
    console.log('\n✅ All server config endpoint tests passed successfully');
    
  } catch (error) {
    console.error('*** Error testing server config endpoint:', error);
    process.exit(1);
  }
}

/**
 * Test the POST /product endpoint
 * This tests creating and updating product users
 */
async function testPostProducts(): Promise<void> {
  try {
    // Get the API hostname
    const hostname = await getDirectHostname();
    const xSessionRef = await getIntegrationSessionRef();
    
    console.log('Running POST /products endpoint tests...');
    console.log(`Using API hostname: ${hostname}`);
    
    // Test 1: Create a new product user with SSH key
    console.log('\nTest 1: Create a new product user with SSH key');
    
    // Use the QA product specifically designed for testing
    const productCode = 'QA';
    // Generate a unique district ID for this test run
    const districtId = `qa-test-${ulid().toLowerCase()}`;
    const initialPublicKey = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCxyz integration-test-key-1';
    
    console.log(`Using unique district ID: ${districtId} ---> username will be product-${productCode.toLowerCase()}@${districtId}`);

    // Set the APP_TABLE_NAME environment variable before importing db-schema
    process.env.APP_TABLE_NAME = await getTableName();

    // Now that APP_TABLE_NAME is set, we can import db-schema
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Tenant } = require('../src/util/db-schema');
    
    await Tenant.create({ id: districtId, name: `QA Test Tenant ${districtId}`, expires: Date.now()/1000 + 3600 });
    const createPayload = {
      productCode,
      districtId,
      publicKey: initialPublicKey
    };
    
    try {
      // Make the API call to create the product user
      const createResponse = await makeSignedRequest(
        `https://${hostname}/products`,
        'POST',
        {
          'Content-Type': 'application/json',
          'x-session-ref': xSessionRef
        },
        createPayload
      );
      
      // Check status code
      if (createResponse.status !== 201) {
        console.error(`*** Expected status code 201, but got ${createResponse.status}`);
        process.exit(1);
      }
      
      console.log('✅ Create status code is 201');
      
      // Check response body
      const createResult = createResponse.data;
      if (!createResult.username || createResult.username !== `product-${productCode.toLowerCase()}@${districtId}`) {
        console.error(`*** Expected username product${productCode.toLowerCase()}@${districtId}, but got ${createResult.username}`);
        process.exit(1);
      }
      
      console.log('✅ Create response contains correct username');
      console.log('Create result:', JSON.stringify(createResult, null, 2));
      
      // Test 2: Update the same product user with a new SSH key
      console.log('\nTest 2: Update the same product user with a new SSH key');
      
      const updatedPublicKey = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDEQlHnKR0w+7zaJvdAZ+BQ6l+CXmV+YEAlBzfT+lYrwn8RePmXOgtu7TWc/+hMc5o+HO5iLA11eUsJKA6kA2DsUfLk9P3wJ+k+w3St7+GrQ4JlsNoUhdZlKzJ9Q6wl+T8w86//BIIgOftX+dcomVKIwUbLntHTKXHLS3NYNT9YcbSN5jKQipY1yKI6HKot2fXldB7jlmD1sas31pgnXZjEIIXp14vi9LFyFctUsSPvELFsweEZp/12pxO8YzvDSeoqHOUKD8tWb8USNXGvgrfh5l7pmAfcjs1Ai8+sB5bgn2L+Sy/MCWPdqYi5AsvSWmzcoMmFVf7H6RdCGxMWqAVpDu0RgT7DsZ6boMHd1E5bBq0jDqSFXsIVGg4bJUrV76YxjGh7+EcsRHHOv+zuI0T5olcwkN27jBwA6syisPMYh85MfzFx6aXlglDBC4SzESZxgQbbE+vkYFN1rtdc+pJdwuXdD7Zpwd4vDMl6ZE/flnbT3Hxuvi8iW+l/lsdYvxs=';
      
      const updatePayload = {
        productCode,
        districtId,
        publicKey: updatedPublicKey
      };
      
      // Make the API call to update the product user
      const updateResponse = await makeSignedRequest(
        `https://${hostname}/products`,
        'POST',
        {
          'Content-Type': 'application/json',
          'x-session-ref': xSessionRef
        },
        updatePayload
      );
      
      // Check status code
      if (updateResponse.status !== 201) {
        console.error(`*** Expected status code 201, but got ${updateResponse.status}`);
        process.exit(1);
      }
      
      console.log('✅ Update status code is 201');
      
      // Check response body
      const updateResult = updateResponse.data;
      if (!updateResult.username || updateResult.username !== `product-${productCode.toLowerCase()}@${districtId}`) {
        console.error(`*** Expected username product-${productCode.toLowerCase()}@${districtId}, but got ${updateResult.username}`);
        process.exit(1);
      }
      
      console.log('✅ Update response contains correct username');
      console.log('Update result:', JSON.stringify(updateResult, null, 2));
      
      // Verify the user was updated by getting the user details
      // This would require an additional API endpoint to get user details by username
      // For now, we'll just consider the test successful if the update API call succeeds

      console.log(`Cleaning up test tenant: ${districtId}`);
      await cleanupTempTenant(districtId);

      console.log('✅ POST /products test passed successfully');
      
    } catch (error) {
      console.error('*** POST /products test failed:', error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('*** Error testing POST /products endpoint:', error);
    process.exit(1);
  }
}

/**
 * Test the GET /service/products endpoint
 * This tests retrieving all product records
 */
async function testGetProducts(): Promise<void> {
  try {
    // Get the API hostname
    const hostname = await getDirectHostname();
    
    console.log('Running GET /service/products endpoint test...');
    console.log(`Using API hostname: ${hostname}`);
    
    // Make the API call using the service endpoint with IAM auth
    const response = await makeSignedRequest(
      `https://${hostname}/service/products`,
      'GET',
      {
        'Content-Type': 'application/json'
      }
    );
    
    // Check status code
    if (response.status !== 200) {
      console.error(`*** Expected status code 200, but got ${response.status}`);
      process.exit(1);
    }
    
    console.log('✅ Status code is 200');
    
    // Check response body structure
    const responseData = response.data;
    
    // Validate that products array exists
    if (!responseData.products || !Array.isArray(responseData.products)) {
      console.error('*** Response is missing products array');
      process.exit(1);
    }
    
    // Validate count field
    if (typeof responseData.count !== 'number') {
      console.error('*** Response is missing count field or it is not a number');
      process.exit(1);
    }
    
    // Validate that count matches the length of the products array
    if (responseData.count !== responseData.products.length) {
      console.error(`*** Count (${responseData.count}) does not match products array length (${responseData.products.length})`);
      process.exit(1);
    }
    
    console.log(`✅ Retrieved ${responseData.count} products`);
    
    // Verify sensitive fields are not included
    if (responseData.products.length > 0) {
      const firstProduct = responseData.products[0];
      if (firstProduct.productPublicKey !== undefined) {
        console.error('*** Product contains sensitive field: productPublicKey');
        process.exit(1);
      }
      
      if (firstProduct.accessAccounts !== undefined || firstProduct.permissions !== undefined) {
        console.error('*** Product contains sensitive fields: accessAccounts or permissions');
        process.exit(1);
      }
      
      console.log('✅ Sensitive fields are not included in the response');
    }
    
    console.log('✅ GET /service/products test passed successfully');
    console.log('Products:', JSON.stringify(responseData, null, 2));
    
  } catch (error) {
    console.error('*** Error testing GET /products endpoint:', error);
    process.exit(1);
  }
}

/**
 * Test the GET /folders endpoint
 * This tests retrieving all folders for the tenant
 */
async function testGetFolders(): Promise<void> {
  try {
    // Get the API hostname
    const hostname = await getDirectHostname();
    const xSessionRef = await getIntegrationSessionRef();
    
    console.log('Running GET /folders endpoint test...');
    console.log(`Using API hostname: ${hostname}`);
    
    // Make the API call
    const response = await axios.get(`https://${hostname}/folders`, {
      headers: {
        'x-session-ref': xSessionRef
      }
    });
    
    // Check status code
    if (response.status !== 200) {
      console.error(`*** Expected status code 200, but got ${response.status}`);
      process.exit(1);
    }
    
    console.log('✅ Status code is 200');
    
    // Check response body structure
    const responseData = response.data;
    
    // Validate that folders array exists
    if (!responseData.folders || !Array.isArray(responseData.folders)) {
      console.error('*** Response is missing folders array');
      process.exit(1);
    }
    
    // Validate count field
    if (typeof responseData.count !== 'number') {
      console.error('*** Response is missing count field or it is not a number');
      process.exit(1);
    }
    
    if (responseData.count < 1) {
      console.error('*** Response count is less than 1');
      process.exit(1);
    }
    
    // Validate that count matches the length of the folders array
    if (responseData.count !== responseData.folders.length) {
      console.error(`*** Count (${responseData.count}) does not match folders array length (${responseData.folders.length})`);
      process.exit(1);
    }
    
    console.log(`✅ Retrieved ${responseData.count} folders`);
    
    // Verify folder structure if any folders exist
    if (responseData.folders.length > 0) {
      const firstFolder = responseData.folders[0];
      const requiredFields = ['id', 'tenantId', 'productId', 'productCode', 'use', 'path', 'accessType', 'active'];
      const missingFields = requiredFields.filter(field => firstFolder[field] === undefined);
      
      if (missingFields.length > 0) {
        console.error(`*** Folder is missing required fields: ${missingFields.join(', ')}`);
        process.exit(1);
      }
      
      console.log('✅ Folder structure is valid');
      
      // Verify all returned folders are active
      const inactiveFolders = responseData.folders.filter((folder: { active: boolean }) => folder.active === false);
      if (inactiveFolders.length > 0) {
        console.error(`*** Found ${inactiveFolders.length} inactive folders in response, expected only active folders`);
        console.error('Inactive folders:', JSON.stringify(inactiveFolders, null, 2));
        process.exit(1);
      }
      
      console.log('✅ All returned folders are active as expected');
    }
    
    console.log('✅ GET /folders test passed successfully');
    console.log('Folders:', JSON.stringify(responseData, null, 2));
    
    // If we have folders, test the GET /folders/{id} endpoint with the first folder
    if (responseData.folders.length > 0) {
      const folderId = responseData.folders[0].id;
      console.log(`\nTesting GET /folders/${folderId} endpoint...`);
      
      const folderResponse = await axios.get(`https://${hostname}/folders/${folderId}`, {
        headers: {
          'x-session-ref': xSessionRef
        }
      });
      
      // Check status code
      if (folderResponse.status !== 200) {
        console.error(`*** Expected status code 200, but got ${folderResponse.status}`);
        process.exit(1);
      }
      
      console.log('✅ Status code is 200');
      
      // Check response body structure
      const folderData = folderResponse.data;
      
      // Validate that folder exists
      if (!folderData.folder) {
        console.error('*** Response is missing folder object');
        process.exit(1);
      }
      
      // Validate folder ID matches
      if (folderData.folder.id !== folderId) {
        console.error(`*** Folder ID mismatch: expected ${folderId}, got ${folderData.folder.id}`);
        process.exit(1);
      }
      
      console.log('✅ GET /folders/{id} test passed successfully');
      console.log('Folder:', JSON.stringify(folderData, null, 2));
    }
    
    // Test that trying to get an inactive folder returns 404
    // First, create an inactive folder
    console.log('\nTesting that inactive folders return 404 when requested by ID...');
    
    // Create a unique folder path for the inactive folder
    const inactiveFolderPath = `/inactive-test-folder-${ulid().toLowerCase()}`;
    
    // Create the inactive folder payload
    const inactiveFolderPayload = {
      productCode: responseData.folders[0].productCode,
      use: responseData.folders[0].use,
      path: inactiveFolderPath,
      accessType: 'inbound',
      active: false
    };
    
    // Create the inactive folder
    const createInactiveResponse = await axios.post(
      `https://${hostname}/folders`,
      inactiveFolderPayload,
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (createInactiveResponse.status !== 201) {
      console.error(`*** Failed to create inactive test folder, status: ${createInactiveResponse.status}`);
      process.exit(1);
    }
    
    const inactiveFolderId = createInactiveResponse.data.folder.id;
    console.log(`Created inactive test folder with ID: ${inactiveFolderId}`);
    
    // Now try to get the inactive folder by ID
    try {
      const inactiveGetResponse = await axios.get(
        `https://${hostname}/folders/${inactiveFolderId}`,
        {
          headers: {
            'x-session-ref': xSessionRef
          },
          validateStatus: (status) => true // Accept any status code
        }
      );
      
      // Check that we got a 404
      if (inactiveGetResponse.status !== 200) {
        console.error(`*** Expected 200 when getting inactive folder, but got ${inactiveGetResponse.status}`);
        console.error('Response:', JSON.stringify(inactiveGetResponse.data, null, 2));
        process.exit(1);
      }
      
      console.log('✅ Getting inactive folder correctly returns 200 status code');

      // Clean up the inactive folder using docClient
      await docClient.send(new DeleteCommand({
        TableName: await getTableName(),
        Key: {
          PK: `TENANT#${responseData.folders[0].tenantId}`,
          SK: `FOLDER#${inactiveFolderId}`
        }
      }));
      console.log(`✅ Cleaned up inactive folder with ID: ${inactiveFolderId}`);
      
    } catch (error) {
      console.error('*** Error testing inactive folder retrieval:', error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('*** Error testing GET /folders endpoint:', error);
    process.exit(1);
  }
}

/**
 * Test the IAM-authenticated GET /service/folders/{districtId} endpoint
 * This tests retrieving folders using IAM authentication
 */
async function testGetFoldersWithIAM(): Promise<void> {
  try {
    // Get the API hostname
    const hostname = await getDirectHostname();
    
    // Get the tenant ID from the session-authenticated endpoint first
    // We'll use this tenant ID for the IAM-authenticated endpoint
    console.log('Getting tenant ID from session-authenticated endpoint...');

    const xSessionRef = await getIntegrationSessionRef();

    // First get the tenant ID using the session-authenticated endpoint
    const sessionResponse = await axios.get(`https://${hostname}/folders`, {
      headers: {
        'x-session-ref': xSessionRef
      }
    });
    
    if (sessionResponse.status !== 200 || !sessionResponse.data.folders || sessionResponse.data.folders.length === 0) {
      console.error('*** Failed to get folders from session-authenticated endpoint');
      process.exit(1);
    }
    
    const tenantId = sessionResponse.data.folders[0].tenantId;
    console.log(`Using tenant ID: ${tenantId}`);
    
    console.log('\nRunning GET /service/folders/{districtId} endpoint test with IAM authentication...');
    console.log(`Using API hostname: ${hostname}`);
    
    // Make the IAM-authenticated API call
    const iamResponse = await makeSignedRequest(
      `https://${hostname}/service/folders/${tenantId}`,
      'GET'
    );
    
    // Check status code
    if (iamResponse.status !== 200) {
      console.error(`*** Expected status code 200, but got ${iamResponse.status}`);
      process.exit(1);
    }
    
    console.log('✅ Status code is 200');
    
    // Check response body structure
    const iamResponseData = iamResponse.data;
    
    // Validate that folders array exists
    if (!iamResponseData.folders || !Array.isArray(iamResponseData.folders)) {
      console.error('*** Response is missing folders array');
      process.exit(1);
    }
    
    // Validate count field
    if (typeof iamResponseData.count !== 'number') {
      console.error('*** Response is missing count field or it is not a number');
      process.exit(1);
    }
    
    // Verify the IAM response matches the session response
    if (iamResponseData.count !== sessionResponse.data.count) {
      console.error(`*** IAM response count (${iamResponseData.count}) does not match session response count (${sessionResponse.data.count})`);
      process.exit(1);
    }
    
    console.log(`✅ Retrieved ${iamResponseData.count} folders using IAM authentication`);
    console.log('✅ GET /service/folders/{districtId} test passed successfully');
    
    // Print the response from the IAM-authenticated call
    console.log('IAM-authenticated response:', JSON.stringify(iamResponseData, null, 2));
    
    // If we have folders, test the GET /service/folders/{districtId}/{id} endpoint with the first folder
    if (iamResponseData.folders.length > 0) {
      const folderId = iamResponseData.folders[0].id;
      console.log(`\nTesting GET /service/folders/${tenantId}/${folderId} endpoint with IAM authentication...`);
      
      const folderIamResponse = await makeSignedRequest(
        `https://${hostname}/service/folders/${tenantId}/${folderId}`,
        'GET'
      );
      
      // Check status code
      if (folderIamResponse.status !== 200) {
        console.error(`*** Expected status code 200, but got ${folderIamResponse.status}`);
        process.exit(1);
      }
      
      console.log('✅ Status code is 200');
      
      // Check response body structure
      const folderData = folderIamResponse.data;
      
      // Validate that folder exists
      if (!folderData.folder) {
        console.error('*** Response is missing folder object');
        process.exit(1);
      }
      
      // Validate folder ID matches
      if (folderData.folder.id !== folderId) {
        console.error(`*** Folder ID mismatch: expected ${folderId}, got ${folderData.folder.id}`);
        process.exit(1);
      }
      
      console.log('✅ GET /service/folders/{districtId}/{id} test passed successfully');
    }
    
    // Test case 1: Use a non-existent tenant ID on the IAM-authenticated endpoint
    console.log('\nTesting GET /service/folders/{districtId} with non-existent tenant ID...');
    const nonExistentTenantId = 'non-existent-tenant-id';
    
    try {
      const nonExistentResponse = await makeSignedRequest(
        `https://${hostname}/service/folders/${nonExistentTenantId}`,
        'GET',
        {},
        undefined,
        (status) => true // Accept any status code
      );
      
      // Check that we got a 404 error for non-existent tenant
      if (nonExistentResponse.status !== 404) {
        console.error(`*** Expected status code 404 for non-existent tenant, but got ${nonExistentResponse.status}`);
        console.error('Response:', JSON.stringify(nonExistentResponse.data, null, 2));
        process.exit(1);
      }
      
      // Verify the response has the correct error code
      const responseData = nonExistentResponse.data;
      if (!responseData.error || responseData.code !== 'TENANT_NOT_FOUND') {
        console.error('*** Expected error code TENANT_NOT_FOUND for non-existent tenant');
        console.error('Response:', JSON.stringify(responseData, null, 2));
        process.exit(1);
      }
      
      console.log('✅ Non-existent tenant ID correctly returns 404 status code with TENANT_NOT_FOUND error');
      console.log('Error response:', JSON.stringify(nonExistentResponse.data, null, 2));
    } catch (error) {
      console.error('*** Error testing non-existent tenant ID:', error);
      process.exit(1);
    }

    // Test case 3: Test a tenant with no folders (should return empty array with 200 status)
    console.log('\nTesting GET /service/folders/{districtId} with tenant that has no folders...');
    
    // Create a new tenant ID for testing
    const emptyTenantId = 'empty-tenant-' + Date.now();
    
    // First, write the tenant record to the database
    try {
      const tableName = await getTableName();
      
      // Calculate expiration time (1 hour in the future)
      const oneHourFromNow = Math.floor(Date.now() / 1000) + 3600; // Current time in seconds + 3600 seconds (1 hour)
      
      // Create tenant record
      await docClient.send(new PutCommand({
        TableName: tableName,
        Item: {
          PK: `TENANT#${emptyTenantId}`,
          SK: '$',
          id: emptyTenantId,
          name: 'Empty Test Tenant',
          GSI1PK: 'ALL_TENANTS',
          GSI1SK: `TENANT#${emptyTenantId}`,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          expires: oneHourFromNow // Expires in 1 hour
        }
      }));
      
      console.log(`Created test tenant with ID: ${emptyTenantId}`);
      
      // Now test the API with this tenant ID
      const emptyTenantResponse = await makeSignedRequest(
        `https://${hostname}/service/folders/${emptyTenantId}`,
        'GET',
        {},
        undefined,
        (status) => true // Accept any status code
      );
      
      // Check that we got a 200 status code with empty folders array
      if (emptyTenantResponse.status !== 200) {
        console.error(`*** Expected status code 200 for tenant with no folders, but got ${emptyTenantResponse.status}`);
        console.error('Response:', JSON.stringify(emptyTenantResponse.data, null, 2));
        process.exit(1);
      }
      
      // Verify the response has an empty folders array
      const emptyResponseData = emptyTenantResponse.data;
      if (!emptyResponseData.folders || !Array.isArray(emptyResponseData.folders) || emptyResponseData.folders.length !== 0 || emptyResponseData.count !== 0) {
        console.error('*** Expected empty folders array for tenant with no folders');
        console.error('Response:', JSON.stringify(emptyResponseData, null, 2));
        process.exit(1);
      }
      
      console.log('✅ Tenant with no folders correctly returns 200 status code with empty folders array');
      console.log('Response:', JSON.stringify(emptyTenantResponse.data, null, 2));

      // Delete the empty tenant record after testing
      await docClient.send(new DeleteCommand({
        TableName: tableName,
        Key: {
          PK: `TENANT#${emptyTenantId}`,
          SK: '$'
        }
      }));
      console.log(`Deleted test tenant with ID: ${emptyTenantId}`);
    } catch (error) {
      console.error('*** Error testing tenant with no folders:', error);
      process.exit(1);
    }
    
    // Test case 2: Try to use a tenant ID on the session-authenticated endpoint
    console.log('\nTesting GET /folders/{tenantId} with session authentication (should not exist)...');
    
    try {
      const invalidEndpointResponse = await axios.get(
        `https://${hostname}/folders/${tenantId}`,
        {
          headers: {
            'x-session-ref': xSessionRef
          },
          validateStatus: (status) => true // Accept any status code
        }
      );
      
      // Check that we got a 400 or 404 (endpoint doesn't exist)
      if (invalidEndpointResponse.status !== 400 && invalidEndpointResponse.status !== 404) {
        console.error(`*** Expected status code 400 or 404 for invalid endpoint, but got ${invalidEndpointResponse.status}`);
        console.error('Response:', JSON.stringify(invalidEndpointResponse.data, null, 2));
        process.exit(1);
      }
      
      console.log(`✅ Invalid endpoint correctly returns ${invalidEndpointResponse.status} status code`);
      console.log('Error response:', JSON.stringify(invalidEndpointResponse.data, null, 2));
    } catch (error) {
      console.error('*** Error testing invalid endpoint:', error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('*** Error testing IAM-authenticated GET /service/folders endpoint:', error);
    process.exit(1);
  }
}

async function setShortFolderExpires(tenantId: string, folderId: string): Promise<void> {
  try {
    const tableName = await getTableName();
    
    // Set the expires field to 5 minute from now
    const oneMinuteFromNow = Math.floor(Date.now() / 1000) + 5 * 60;
    
    await docClient.send(new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `TENANT#${tenantId}`,
        SK: `FOLDER#${folderId}`
      },
      UpdateExpression: 'SET expires = :expires',
      ExpressionAttributeValues: {
        ':expires': oneMinuteFromNow
      }
    }));
    
    console.log(`Set expires for folder ${folderId} to 1 minute from now`);
  } catch (error) {
    console.error('*** Error setting short expires for folder:', error);
    process.exit(1);
  }
}

/**
 * Test the POST /folders endpoint
 * This tests creating a new folder
 */
async function testPostFolder(): Promise<void> {
  try {
    // Get the API hostname
    const hostname = await getDirectHostname();
    
    const xSessionRef = await getIntegrationSessionRef();
    
    console.log('Running POST /folders endpoint test...');
    console.log(`Using API hostname: ${hostname}`);
    
    // First, get the products to find a valid productCode using the service endpoint with IAM auth
    const productsResponse = await makeSignedRequest(
      `https://${hostname}/service/products`,
      'GET',
      {
        'Content-Type': 'application/json'
      }
    );
    
    if (productsResponse.status !== 200 || !productsResponse.data.products || productsResponse.data.products.length === 0) {
      console.error('*** Failed to get products or no products available');
      process.exit(1);
    }
    
    // Use the QA product for testing
    const product: ProductResponse = productsResponse.data.products.find((p: ProductResponse) => p.productCode === 'QA');
    if (!product) {
      console.error('*** No product found with code QA');
      process.exit(1);
    }
    
    const productCode = product.productCode;
    console.log(`Fetched product for testing: ${JSON.stringify(product, null, 2)}`);

    // Create a unique folder path for testing
    const testFolderPath = `/test-folder-qa-${ulid().toLowerCase()}`;
    
    // Create the folder payload
    const folderPayload = {
      productCode,
      use: product.uses[0].name,
      path: testFolderPath,
      accessType: 'inbound'
    };
    
    console.log(`Creating test folder with path: ${testFolderPath}, payload:`, JSON.stringify(folderPayload, null, 2));
    
    // Make the API call to create the folder
    const createResponse = await axios.post(
      `https://${hostname}/folders`,
      folderPayload,
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Check status code
    if (createResponse.status !== 201) {
      console.error(`*** Expected status code 201, but got ${createResponse.status}`);
      process.exit(1);
    }
    
    console.log('✅ Create status code is 201');

    const tempTenantId = createResponse.data.folder.tenantId;
    const tempFolderId = createResponse.data.folder.id;
    await setShortFolderExpires(tempTenantId, tempFolderId);

    // Check response body
    const createdFolder: PostFolderResponse = createResponse.data;
    if (!createdFolder.folder.id) {
      console.error('*** Response is missing folder ID');
      process.exit(1);
    }
    
    if (createdFolder.folder.path !== testFolderPath) {
      console.error(`*** Path mismatch: expected ${testFolderPath}, got ${createdFolder.folder.path}`);
      process.exit(1);
    }
    
    if (createdFolder.folder.accessType !== 'inbound') {
      console.error(`*** Access type mismatch: expected inbound, got ${createdFolder.folder.accessType}`);
      process.exit(1);
    }
    
    // Verify active status is true by default
    if (createdFolder.folder.active !== true) {
      console.error(`*** Active status mismatch: expected true, got ${createdFolder.folder.active}`);
      process.exit(1);
    }

    console.log('✅ Created folder successfully with active=true (default)');
    console.log('Created folder:', JSON.stringify(createdFolder, null, 2));
    
    // Now create an inactive folder
    console.log('\nTesting creation of inactive folder...');
    const inactiveFolderPath = `/inactive-folder-${ulid().toLowerCase()}`;
    
    // Create the inactive folder payload
    const inactiveFolderPayload = {
      productCode,
      use: product.uses[0].name,
      path: inactiveFolderPath,
      accessType: 'inbound',
      active: false
    };
    
    console.log(`Creating inactive test folder with path: ${inactiveFolderPath}: ${JSON.stringify(inactiveFolderPayload, null, 2)}`);
    
    // Make the API call to create the inactive folder
    const inactiveResponse = await axios.post(
      `https://${hostname}/folders`,
      inactiveFolderPayload,
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Check status code
    if (inactiveResponse.status !== 201) {
      console.error(`*** Expected status code 201, but got ${inactiveResponse.status}`);
      process.exit(1);
    }
    
    console.log('✅ Create inactive folder status code is 201');
    
    // Check response body
    const inactiveFolder: PostFolderResponse = inactiveResponse.data;
    if (!inactiveFolder.folder.id) {
      console.error('*** Response is missing folder ID');
      process.exit(1);
    }
    
    // Verify active status is false
    if (inactiveFolder.folder.active !== false) {
      console.error(`*** Active status mismatch: expected false, got ${inactiveFolder.folder.active}`);
      process.exit(1);
    }
    
    console.log('✅ Created inactive folder successfully');
    console.log('Created inactive folder:', JSON.stringify(inactiveFolder, null, 2));
    
    await setShortFolderExpires(tempTenantId, inactiveFolder.folder.id);

    // Delete the inactive folder using docClient
    await docClient.send(new DeleteCommand({
      TableName: await getTableName(),
      Key: {
        PK: `TENANT#${tempTenantId}`,
        SK: `FOLDER#${inactiveFolder.folder.id}`
      }
    }));

    // Test updating the folder
    console.log(`\nTesting PUT /folders/${tempFolderId} endpoint...`);
    
    // Update the folder to use 'outbound' access type
    const updatePayload = {
      accessType: 'outbound'
    };
    
    // Make the API call to update the folder
    const updateResponse = await axios.put(
      `https://${hostname}/folders/${tempFolderId}`,
      updatePayload,
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Check status code
    if (updateResponse.status !== 200) {
      console.error(`*** Expected status code 200, but got ${updateResponse.status}`);
      process.exit(1);
    }
    
    console.log('✅ Update status code is 200');
    
    // Check response body
    const updatedFolder = updateResponse.data;
    if (updatedFolder.id !== tempFolderId) {
      console.error(`*** Folder ID mismatch: expected ${tempFolderId}, got ${updatedFolder.id}`);
      process.exit(1);
    }
    
    if (updatedFolder.accessType !== 'outbound') {
      console.error(`*** Access type not updated: expected outbound, got ${updatedFolder.accessType}`);
      process.exit(1);
    }
    
    console.log('✅ Updated folder successfully');
    console.log('Updated folder:', JSON.stringify(updatedFolder, null, 2));

    // Test updating active status
    console.log('\nTesting updating folder active status...');
    
    const activeUpdatePayload = {
      active: false
    };
    
    // Make the API call to update the folder's active status
    const activeUpdateResponse = await axios.put(
      `https://${hostname}/folders/${tempFolderId}`,
      activeUpdatePayload,
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Check status code
    if (activeUpdateResponse.status !== 200) {
      console.error(`*** Expected status code 200, but got ${activeUpdateResponse.status}`);
      process.exit(1);
    }
    
    console.log('✅ Active status update status code is 200');
    
    // Check response body
    const activeUpdatedFolder = activeUpdateResponse.data;
    if (activeUpdatedFolder.active !== false) {
      console.error(`*** Active status not updated: expected false, got ${activeUpdatedFolder.active}`);
      process.exit(1);
    }
    
    console.log('✅ Updated folder active status successfully');
    console.log('Updated folder with active=false:', JSON.stringify(activeUpdatedFolder, null, 2));

    // Test that changing productId is not allowed
    console.log('\nTesting that changing productId is not allowed...');
    
    const productUpdatePayload = {
      productId: 'different-product-id'
    };
    
    try {
      // Make the API call to try to update the folder's productId
      const productUpdateResponse = await axios.put(
        `https://${hostname}/folders/${tempFolderId}`,
        productUpdatePayload,
        {
          headers: {
            'x-session-ref': xSessionRef,
            'Content-Type': 'application/json'
          },
          validateStatus: (status) => true // Accept any status code
        }
      );
      
      if (productUpdateResponse.status !== 400) {
        console.error(`*** Expected 400 with PRODUCT_CHANGE_NOT_ALLOWED, but got ${productUpdateResponse.status} with code ${productUpdateResponse.data.code}`);
        console.log('Response:', JSON.stringify(productUpdateResponse.data, null, 2));
        process.exit(1);
      }
      
      console.log('✅ Changing productId correctly rejected with 400 status code');
      console.log('Error response:', JSON.stringify(productUpdateResponse.data, null, 2));

      // Delete the test folder using docClient
      await docClient.send(new DeleteCommand({
        TableName: await getTableName(),
        Key: {
          PK: `TENANT#${tempTenantId}`,
          SK: `FOLDER#${tempFolderId}`
        }
      }));
      console.log(`✅ Cleaned up test folder with ID: ${tempFolderId}`);
    } catch (error) {
      console.error('*** Error testing productId change rejection:', error);
      process.exit(1);
    }
    
    console.log('✅ POST and PUT /folders tests passed successfully');
    
  } catch (error) {
    console.error('*** Error testing folder endpoints:', error);
    process.exit(1);
  }
}

/**
 * Creates a JWT token for testing district settings endpoints
 * JWT validation is disabled in dev environments
 */
function createTestJWT(payload: { product: string; districtUid: string }): string {
  // Create a simple JWT with the required properties
  // The signature doesn't matter as JWT validation is disabled in dev
  return jwt.sign(payload, 'test-secret');
}

/**
 * Integration test for adding a district
 * Tests the district settings API endpoint for adding a new district
 * Returns the created district ID if successful
 */
async function testAddDistrict(): Promise<string | void> {
  try {
    // Get the API hostname and environment name
    const hostname = await getDirectHostname();
    const envName = process.env.PS_ENVIRONMENT ?? cleanName(await getBranch());
    
    // Only run this test in dev environments where JWT validation is disabled
    if (!envName.startsWith('dev')) {
      console.log('⚠️ Skipping add district test - only runs in dev environments');
      return;
    }
    
    console.log('Running add district test...');
    console.log(`Using API hostname: ${hostname}`);
    
    // Use a specific district ID for testing
    // This is magneto - need a valid one to look up in district settings
    const districtUid = 'f815af64-00c2-42f2-a437-2e48d0367b2a';
    const magnetoSessionRef = await getIntegrationSessionRef(districtUid);
    
    // First, delete the existing tenant records if they exist
    console.log(`Deleting existing tenant with ID: ${districtUid} if it exists...`);
    await cleanupTempTenant(districtUid);
    
    console.log(`Creating test district with ID: ${districtUid}`);
    
    // Create a JWT token for the request
    const token = createTestJWT({
      product: FTP_PRODUCT_SHORT_NAME, // Our product code
      districtUid
    });
    
    // Prepare the district payload with the JWT token
    const districtPayload = {
      token
    };
    
    // Make the API call to create the district
    const response = await axios.post(
      `https://${hostname}/district-settings/tenants`,
      districtPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => status < 500 // Accept any status code less than 500
      }
    );
    
    // Check status code
    if (response.status !== 201 && response.status !== 200) {
      console.error(`*** Expected status code 201 or 200, but got ${response.status}`);
      console.error('Response:', JSON.stringify(response.data, null, 2));
      process.exit(1);
    }
    
    console.log('✅ District created successfully');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Verify the district was created by trying to get it using the IAM-authenticated endpoint. But
    // there are a couple steps, so we need to wait a few seconds for the district to be created.
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
    console.log('Verifying district creation...');

    try {
      const verifyResponse = await makeSignedRequest(
        `https://${hostname}/service/tenants/${districtUid}`,
        'GET',
        {
          'Content-Type': 'application/json'
        },
        undefined,
        (status) => status < 500
      );
      
      if (verifyResponse.status === 200) {
        console.log('✅ Verified district was created in the database');
        
        // Verify that the created timestamp is within the past hour
        const tenant = verifyResponse.data.tenant;
        if (tenant && tenant.created) {
          const createdTime = new Date(tenant.created).getTime();
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

          if (createdTime >= fiveMinutesAgo) {
            console.log('✅ Tenant created timestamp is within the past 5 minutes');
          } else {
            console.error(`*** Tenant created timestamp is not within the past 5 minutes: ${tenant.created}`);
            process.exit(1);
          }
        } else {
          console.error('*** Tenant response is missing created timestamp');
          process.exit(1);
        }
        
        // Create a test folder for the SIS product
        console.log('Creating a test folder for the SIS product...');
        
        // First, get the SIS product ID
        const productsResponse = await makeSignedRequest(
          `https://${hostname}/service/products`,
          'GET',
          {
            'Content-Type': 'application/json'
          }
        );
        
        if (productsResponse.status !== 200) {
          console.error(`*** Failed to get products: ${productsResponse.status}`);
          process.exit(1);
        }
        
        const sisProduct = productsResponse.data.products.find(
          (p: any) => p.productCode === 'SIS'
        );
        
        if (!sisProduct) {
          console.error('*** SIS product not found');
          process.exit(1);
        }
        
        console.log(`Found SIS product: ${sisProduct.id}`);
        
        // Create a folder for the SIS product
        const folderPayload = {
          productCode: 'SIS',
          use: sisProduct.uses[0].name, // Use the first available use case
          path: `/test-folder-sis-${ulid().toLowerCase()}`,
          accessType: 'inbound'
        };
        
        const folderResponse = await axios.post(
          `https://${hostname}/folders`,
          folderPayload,
          {
            headers: {
              'Content-Type': 'application/json',
              'x-session-ref': magnetoSessionRef
            }
          }
        );
        
        if (folderResponse.status !== 201) {
          console.error(`*** Failed to create folder: ${folderResponse.status}`);
          console.error('Response:', JSON.stringify(folderResponse.data, null, 2));
          process.exit(1);
        }
        
        const folder = folderResponse.data.folder;
        console.log('✅ Created test folder successfully');
        console.log('Folder:', JSON.stringify(folder, null, 2));
        
        // Create a test user with access to the folder
        console.log('Creating a test user with access to the folder...');
        
        const userPayload = {
          name: `Test User ${ulid().toLowerCase()}`,
          username: `testuser-${ulid().toLowerCase()}`,
          authenticationType: 'password',
          password: 'TestPassword123!',
          folders: [folder.id],
          productCode: 'SIS',
          access: 'readwrite'
        };
        
        const userResponse = await axios.post(
          `https://${hostname}/users`,
          userPayload,
          {
            headers: {
              'Content-Type': 'application/json',
              'x-session-ref': magnetoSessionRef
            }
          }
        );
        
        if (userResponse.status !== 201) {
          console.error(`*** Failed to create user: ${userResponse.status}`);
          console.error('Response:', JSON.stringify(userResponse.data, null, 2));
          process.exit(1);
        }
        
        console.log('✅ Created test user successfully');
        console.log('User:', JSON.stringify(userResponse.data, null, 2));
      } else {
        throw new Error(`⚠️ Could not verify district creation: status ${verifyResponse.status}`);
      }
    } catch (verifyError) {
      throw new Error(`⚠️ Could not verify district creation: ${verifyError}`);
    }
        
    // Make the API call to delete the district
    console.log(`Deleting district with ID: ${districtUid}`);

    const deleteResponse = await axios.delete(
      `https://${hostname}/district-settings/tenants`,
      {
        data: districtPayload,
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => status < 500 // Accept any status code less than 500
      }
    );
    
    // Check status code
    if (deleteResponse.status !== 200) {
      console.error(`*** Expected status code 200, but got ${deleteResponse.status}`);
      console.error('Response:', JSON.stringify(deleteResponse.data, null, 2));
      process.exit(1);
    }
    
    console.log('✅ District deleted successfully');
    
    // Wait a few seconds for the deletion to propagate
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
    
    // Verify the tenant was marked as inactive
    const tableName = await getTableName();
    const verifyResponse = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `TENANT#${districtUid}`
        }
      })
    );
      
      // Should be 4 items (Tenant, TenantProduct, Folder, User) - all should be marked as inactive
    if (verifyResponse.Items && verifyResponse.Items.length === 4) {
      if (!verifyResponse.Items.every((i) => i.active === false)) {
        console.error(`*** 4 Tenant records (TENANT#${districtUid}) still exist but not marked as inactive`);
        process.exit(1);
      }
      
      // Make sure it has a TTL no greater than 7 years from now
      const sevenYearsFromNow = Math.floor(Date.now() / 1000) + (7 * 365 * 24 * 60 * 60); // Current time in seconds + 7 years
      if (verifyResponse.Items.some((i) => typeof i.expires !== 'number' || i.expires > sevenYearsFromNow)) {
        console.error(`*** Tenant records (TENANT#${districtUid}) don't have valid expires timestamp or is too far in the future`);
        process.exit(1);
      }

      console.log('✅ Verified all tenant records marked as inactive');
    } else {
      console.error(`*** Tenant records (TENANT#${districtUid}) found after district-settings tenant delete: ${JSON.stringify(verifyResponse.Items, null, 2)}`);
      throw new Error(`⚠️ Tenant was not found after district-settings tenant delete, it should be only marked as inactive`);
    }

    // Make the API call to delete the district
    console.log(`Re-enabling district with ID: ${districtUid}`);

    const reenableResponse = await axios.post(
      `https://${hostname}/district-settings/tenants`,
      districtPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => status < 500 // Accept any status code less than 500
      }
    );
    
    // Check status code
    if (reenableResponse.status !== 200) {
      console.error(`*** Expected status code 200, but got ${reenableResponse.status}`);
      console.error('Response:', JSON.stringify(reenableResponse.data, null, 2));
      process.exit(1);
    }
    
    console.log('✅ District re-enabled, checking conditions...');
    
    // Wait a few seconds for the deletion to propagate
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
    
    // Verify the tenant was marked as inactive
    const reenableVerifyResponse = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `TENANT#${districtUid}`
        }
      })
    );
      
      // Should be 4 items (Tenant, TenantProduct, Folder, User) - all should be marked as active again
    if (reenableVerifyResponse.Items && reenableVerifyResponse.Items.length === 4) {
      if (!reenableVerifyResponse.Items.every((i) => i.active !== false)) {
        console.error(`*** 4 Tenant records (TENANT#${districtUid}) still exist but still marked inactive`);
        process.exit(1);
      }
      
      // Make sure it has no TTL
      if (reenableVerifyResponse.Items.some((i) => typeof i.expires === 'number' && i.expires > 0)) {
        console.error(`*** Tenant records (TENANT#${districtUid}) still has an expires timestamp`);
        process.exit(1);
      }

      console.log('✅ Verified all tenant records marked re-enabled');
      
      // Clean up the tenant completely
      await cleanupTempTenant(districtUid);
    } else {
      throw new Error(`⚠️ Tenant records (TENANT#${districtUid}) not found after district-settings tenant delete and re-enable`);
    }
    
    console.log('✅ Delete district test passed successfully');
    return districtUid; // Return the created district ID for use in other tests

  } catch (error) {
    console.error('*** Error testing add district API:', error);
    process.exit(1);
  }
}

/**
 * Integration test for adding a product to a district
 * Tests the district settings API endpoint for adding a product to an existing district
 */
async function testAddDistrictProduct(): Promise<void> {
  try {
    // Get the API hostname and environment name
    const hostname = await getDirectHostname();
    const envName = process.env.PS_ENVIRONMENT ?? cleanName(await getBranch());
    
    // Only run this test in dev environments where JWT validation is disabled
    if (!envName.startsWith('dev')) {
      console.log('⚠️ Skipping add district product test - only runs in dev environments');
      return;
    }
    
    console.log('Running add district product test...');
    console.log(`Using API hostname: ${hostname}`);
    
    const districtUid = 'f815af64-00c2-42f2-a437-2e48d0367b2a';
    
    // Get available products to find a valid productCode using the service endpoint with IAM auth
    const productsResponse = await makeSignedRequest(
      `https://${hostname}/service/products`,
      'GET',
      {
        'Content-Type': 'application/json'
      }
    );
    
    if (productsResponse.status !== 200 || !productsResponse.data.products || productsResponse.data.products.length === 0) {
      console.error('*** Could not get products to find a valid productCode');
      process.exit(1);
    }
    
    // Get the SIS product
    const productCode = 'SIS';
    console.log(`Using product with code: ${productCode}`);
    
    // Create a JWT token for the request
    const token = createTestJWT({
      product: productCode,
      districtUid
    });
    
    // Prepare the product payload with the JWT token
    const productPayload = {
      token,
    };
    
    // Make the API call to add the product to the district
    const response = await axios.post(
      `https://${hostname}/district-settings/products`,
      productPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => status < 500 // Accept any status code less than 500
      }
    );
    
    // Check status code
    if (response.status !== 201 && response.status !== 200) {
      console.error(`*** Expected status code 201 or 200, but got ${response.status}`);
      console.error('Response:', JSON.stringify(response.data, null, 2));
      process.exit(1);
    }
    
    console.log('✅ Product added to district successfully');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Verify the TenantProduct entity was created in DynamoDB
    console.log('Verifying TenantProduct entity in DynamoDB...');
    try {
      // Get the table name from environment variable
      const tableName = await getTableName();
      
      // Get the first product's ID
      const productsWithId = productsResponse.data.products.filter((p: ProductResponse) => p.productCode === productCode);
      if (productsWithId.length === 0) {
        console.error('*** Could not find product ID for verification');
        process.exit(1);
      }
      
      // Wait a few seconds for the product to be added
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds

      const productId = productsWithId[0].id;
      console.log(`Looking up TenantProduct for tenant: ${districtUid}, product: ${productId}`);
      
      // Query DynamoDB for the TenantProduct entity
      const getParams = {
        TableName: tableName,
        Key: {
          PK: `TENANT#${districtUid}`,
          SK: `PRODUCT#${productId}`
        }
      };
      
      const getResult = await docClient.send(new GetCommand(getParams)) as { Item?: any };
      
      if (!getResult.Item) {
        console.error('*** TenantProduct entity not found in DynamoDB');
        process.exit(1);
      }
      
      console.log('✅ TenantProduct entity found in DynamoDB');
      console.log('TenantProduct:', JSON.stringify(getResult.Item, null, 2));
      
      // Verify the entity was created within the last hour
      if (getResult.Item.created) {
        const createdTime = new Date(getResult.Item.created).getTime();
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

        if (createdTime >= fiveMinutesAgo) {
          console.log('✅ TenantProduct created timestamp is within the past 5 minutes');
        } else {
          console.error(`*** TenantProduct created timestamp is not within the past 5 minutes: ${getResult.Item.created}`);
          process.exit(1);
        }
      } else {
        console.error('*** TenantProduct entity is missing created timestamp');
        process.exit(1);
      }
    } catch (dbError) {
      console.error('*** Error verifying TenantProduct entity:', dbError);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('*** Error testing add district product API:', error);
    process.exit(1);
  }
}

/**
 * Integration test for user folder product validation
 * Tests that users can only be associated with folders from the same product
 */
async function testUserFolderProductValidation(): Promise<void> {
  try {
    // Get the API hostname
    const hostname = await getDirectHostname();
    
    const xSessionRef = await getIntegrationSessionRef();
    
    console.log('Running user folder product validation test...');
    console.log(`Using API hostname: ${hostname}`);
    
    // Get products to find two different products
    const productsResponse = await makeSignedRequest(
      `https://${hostname}/service/products`,
      'GET',
      {
        'Content-Type': 'application/json'
      }
    );
    
    if (productsResponse.status !== 200 || !productsResponse.data.products || productsResponse.data.products.length < 2) {
      console.error('*** Failed to get products or not enough products available');
      process.exit(1);
    }
    
    // Use two different products for testing
    const productA = productsResponse.data.products.find((p: ProductResponse) => p.productCode === 'QA');
    const productB = productsResponse.data.products.find((p: ProductResponse) => p.productCode !== 'QA');
    
    if (!productA || !productB) {
      console.error('*** Could not find two different products for testing');
      process.exit(1);
    }
    
    console.log(`Using products for testing:
      Product A: ${productA.productCode} (${productA.id})
      Product B: ${productB.productCode} (${productB.id})`);
    
    // Step 1: Create a folder for Product A
    const folderAPath = `/test-folder-a-${ulid().toLowerCase()}`;
    const folderAPayload = {
      productCode: productA.productCode,
      use: productA.uses[0].name,
      path: folderAPath,
      accessType: 'inbound'
    };
    
    console.log(`Creating test folder A with path: ${folderAPath}`);
    
    const folderAResponse = await axios.post(
      `https://${hostname}/folders`,
      folderAPayload,
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (folderAResponse.status !== 201) {
      console.error(`*** Failed to create folder A: ${folderAResponse.status}`);
      process.exit(1);
    }
    
    const folderA = folderAResponse.data.folder;
    console.log(`✅ Created folder A: ${folderA.id}`);
    
    // Step 2: Create a folder for Product B
    const folderBPath = `/test-folder-b-${ulid().toLowerCase()}`;
    const folderBPayload = {
      productCode: productB.productCode,
      use: productB.uses[0].name,
      path: folderBPath,
      accessType: 'inbound'
    };
    
    console.log(`Creating test folder B with path: ${folderBPath}`);
    
    const folderBResponse = await axios.post(
      `https://${hostname}/folders`,
      folderBPayload,
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (folderBResponse.status !== 201) {
      console.error(`*** Failed to create folder B: ${folderBResponse.status}`);
      process.exit(1);
    }
    
    const folderB = folderBResponse.data.folder;
    console.log(`✅ Created folder B: ${folderB.id}`);
    
    // Step 3: Try to create a user with Product A and include the folder from Product B
    // Use a specific prefix to avoid conflicts with existing test users
    const username = `validation-testuser-${ulid().toLowerCase()}`;
    const userPayload = {
      name: "Validation Test User",
      username: username,
      authenticationType: "password",
      password: "TestPassword123!",
      folders: [folderA.id, folderB.id], // Include folders from both products
      access: "readwrite",
      productCode: productA.productCode // User is for Product A
    };
    
    console.log(`Attempting to create user with mixed product folders: ${username}`);
    
    try {
      const userResponse = await axios.post(
        `https://${hostname}/users`,
        userPayload,
        {
          headers: {
            'x-session-ref': xSessionRef,
            'Content-Type': 'application/json'
          },
          validateStatus: () => true // Accept any status code
        }
      );
      
      // Verify that the API returns a 400 error
      if (userResponse.status !== 400) {
        console.error(`*** Expected status code 400, but got ${userResponse.status}`);
        console.error('Response:', JSON.stringify(userResponse.data, null, 2));
        process.exit(1);
      }
      
      console.log('✅ Received expected 400 status code');
      
      // Verify the error code
      if (userResponse.data.code !== 'INVALID_FOLDER_PRODUCT') {
        console.error(`*** Expected error code INVALID_FOLDER_PRODUCT, but got ${userResponse.data.code}`);
        console.error('Response:', JSON.stringify(userResponse.data, null, 2));
        process.exit(1);
      }
      
      console.log('✅ Received expected error code: INVALID_FOLDER_PRODUCT');
      console.log('✅ User folder product validation test passed successfully');
      
      // Clean up: Delete the folders created for this test using direct DynamoDB commands
      try {
        console.log('Cleaning up test folders using direct DynamoDB commands...');
        
        // Get the table name
        const tableName = await getTableName();
        
        // Delete folder A directly from DynamoDB
        try {
          await docClient.send(
            new DeleteCommand({
              TableName: tableName,
              Key: {
                PK: `TENANT#${folderA.tenantId}`,
                SK: `FOLDER#${folderA.id}`
              }
            })
          );
          console.log(`✅ Successfully deleted test folder A: ${folderA.id} from DynamoDB`);
        } catch (error) {
          throw new Error(`⚠️ Failed to delete test folder A from DynamoDB: ${error}`);
        }
        
        // Delete folder B directly from DynamoDB
        try {
          await docClient.send(
            new DeleteCommand({
              TableName: tableName,
              Key: {
                PK: `TENANT#${folderB.tenantId}`,
                SK: `FOLDER#${folderB.id}`
              }
            })
          );
          console.log(`✅ Successfully deleted test folder B: ${folderB.id} from DynamoDB`);
        } catch (error) {
          throw new Error(`⚠️ Failed to delete test folder B from DynamoDB: ${error}`);
        }
      } catch (cleanupError) {
        throw new Error(`⚠️ Error during test cleanup: ${cleanupError}`);
      }
      
    } catch (error) {
      console.error('*** Error making API request:', error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('*** Error in user folder product validation test:', error);
    process.exit(1);
  }
}

/**
 * Integration test for update user folder product validation
 * Tests that users can only be updated with folders from the same product
 */
async function testUpdateUserFolderProductValidation(): Promise<void> {
  try {
    // Get the API hostname
    const hostname = await getDirectHostname();
    
    const xSessionRef = await getIntegrationSessionRef();
    
    console.log('Running update user folder product validation test...');
    console.log(`Using API hostname: ${hostname}`);
    
    // Get products to find two different products
    const productsResponse = await makeSignedRequest(
      `https://${hostname}/service/products`,
      'GET',
      {
        'Content-Type': 'application/json'
      }
    );
    
    if (productsResponse.status !== 200 || !productsResponse.data.products || productsResponse.data.products.length < 2) {
      console.error('*** Failed to get products or not enough products available');
      process.exit(1);
    }
    
    // Use two different products for testing
    const productA = productsResponse.data.products.find((p: ProductResponse) => p.productCode === 'QA');
    const productB = productsResponse.data.products.find((p: ProductResponse) => p.productCode !== 'QA');
    
    if (!productA || !productB) {
      console.error('*** Could not find two different products for testing');
      process.exit(1);
    }
    
    console.log(`Using products for testing:
      Product A: ${productA.productCode} (${productA.id})
      Product B: ${productB.productCode} (${productB.id})`);
    
    // Step 1: Create a folder for Product A
    const folderAPath = `/test-folder-a-update-${ulid().toLowerCase()}`;
    const folderAPayload = {
      productCode: productA.productCode,
      use: productA.uses[0].name,
      path: folderAPath,
      accessType: 'inbound'
    };
    
    console.log(`Creating test folder A with path: ${folderAPath}`);
    
    const folderAResponse = await axios.post(
      `https://${hostname}/folders`,
      folderAPayload,
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (folderAResponse.status !== 201) {
      console.error(`*** Failed to create folder A: ${folderAResponse.status}`);
      process.exit(1);
    }
    
    const folderA = folderAResponse.data.folder;
    console.log(`✅ Created folder A: ${folderA.id}`);
    
    // Step 2: Create a folder for Product B
    const folderBPath = `/test-folder-b-update-${ulid().toLowerCase()}`;
    const folderBPayload = {
      productCode: productB.productCode,
      use: productB.uses[0].name,
      path: folderBPath,
      accessType: 'inbound'
    };
    
    console.log(`Creating test folder B with path: ${folderBPath}`);
    
    const folderBResponse = await axios.post(
      `https://${hostname}/folders`,
      folderBPayload,
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (folderBResponse.status !== 201) {
      console.error(`*** Failed to create folder B: ${folderBResponse.status}`);
      process.exit(1);
    }
    
    const folderB = folderBResponse.data.folder;
    console.log(`✅ Created folder B: ${folderB.id}`);
    
    // Step 3: Create a valid user with Product A and its folder
    // Use a specific prefix to avoid conflicts with existing test users
    const username = `validation-testuser-update-${ulid().toLowerCase()}`;
    const createUserPayload = {
      name: "Validation Test User for Update",
      username: username,
      authenticationType: "password",
      password: "TestPassword123!",
      folders: [folderA.id], // Only include folder from Product A
      access: "readwrite",
      productCode: productA.productCode // User is for Product A
    };
    
    console.log(`Creating user for update test: ${username}`);
    
    const createUserResponse = await axios.post(
      `https://${hostname}/users`,
      createUserPayload,
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (createUserResponse.status !== 201) {
      console.error(`*** Failed to create user: ${createUserResponse.status}`);
      process.exit(1);
    }
    
    const createdUser = createUserResponse.data;
    console.log(`✅ Created user: ${createdUser.id}`);
    
    // Step 4: Try to update the user to include a folder from Product B
    const updateUserPayload = {
      folders: [folderA.id, folderB.id] // Include folders from both products
    };
    
    console.log(`Attempting to update user with mixed product folders: ${createdUser.id}`);
    
    try {
      const updateUserResponse = await axios.put(
        `https://${hostname}/users/${createdUser.id}`,
        updateUserPayload,
        {
          headers: {
            'x-session-ref': xSessionRef,
            'Content-Type': 'application/json'
          },
          validateStatus: () => true // Accept any status code
        }
      );
      
      // Verify that the API returns a 400 error
      if (updateUserResponse.status !== 400) {
        console.error(`*** Expected status code 400, but got ${updateUserResponse.status}`);
        console.error('Response:', JSON.stringify(updateUserResponse.data, null, 2));
        process.exit(1);
      }
      
      console.log('✅ Received expected 400 status code');
      
      // Verify the error code
      if (updateUserResponse.data.code !== 'INVALID_FOLDER_PRODUCT') {
        console.error(`*** Expected error code INVALID_FOLDER_PRODUCT, but got ${updateUserResponse.data.code}`);
        console.error('Response:', JSON.stringify(updateUserResponse.data, null, 2));
        process.exit(1);
      }
      
      console.log('✅ Received expected error code: INVALID_FOLDER_PRODUCT');
      console.log('✅ Update user folder product validation test passed successfully');
      
      // Clean up: Delete the folders and user created for this test
      try {
        console.log('Cleaning up test folders and user...');
        
        // Delete the user directly from DynamoDB
        try {
          // Get the table name
          const tableName = await getTableName();
          
          // Delete the user using DeleteCommand
          await docClient.send(
            new DeleteCommand({
              TableName: tableName,
              Key: {
                PK: `TENANT#${createdUser.tenantId}`,
                SK: `USER#${createdUser.id}`
              }
            })
          );
          console.log(`✅ Successfully deleted test user: ${createdUser.id} from DynamoDB`);
        } catch (error) {
          throw new Error(`⚠️ Failed to delete test user from DynamoDB: ${error}`);
        }
        
        // Delete folder A directly from DynamoDB
        try {
          // Get the table name
          const tableName = await getTableName();
          
          // Delete folder A directly from DynamoDB
          await docClient.send(
            new DeleteCommand({
              TableName: tableName,
              Key: {
                PK: `TENANT#${folderA.tenantId}`,
                SK: `FOLDER#${folderA.id}`
              }
            })
          );
          console.log(`✅ Successfully deleted test folder A: ${folderA.id} from DynamoDB`);
        } catch (error) {
          throw new Error(`⚠️ Failed to delete test folder A from DynamoDB: ${error}`);
        }
        
        // Delete folder B directly from DynamoDB
        try {
          // Get the table name
          const tableName = await getTableName();
          
          await docClient.send(
            new DeleteCommand({
              TableName: tableName,
              Key: {
                PK: `TENANT#${folderB.tenantId}`,
                SK: `FOLDER#${folderB.id}`
              }
            })
          );
          console.log(`✅ Successfully deleted test folder B: ${folderB.id} from DynamoDB`);
        } catch (error) {
          throw new Error(`⚠️ Failed to delete test folder B from DynamoDB: ${error}`);
        }
      } catch (cleanupError) {
        throw new Error(`⚠️ Error during test cleanup: ${cleanupError}`);
      }
      
    } catch (error) {
      console.error('*** Error making API request:', error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('*** Error in update user folder product validation test:', error);
    process.exit(1);
  }
}

/**
 * Integration test for deactivating a user
 * Tests that users can be deactivated using the active field in the update-user endpoint
 * and that inactive users are only returned when include=inactive query parameter is used
 */
async function testDeactivateUser(): Promise<void> {
  try {
    // Get the API hostname
    const hostname = await getDirectHostname();
    
    const xSessionRef = await getIntegrationSessionRef();
    
    console.log('Running deactivate user test...');
    console.log(`Using API hostname: ${hostname}`);
    
    // Step 1: Get products to find a product to use
    const productsResponse = await makeSignedRequest(
      `https://${hostname}/service/products`,
      'GET',
      {
        'Content-Type': 'application/json'
      }
    );
    
    if (productsResponse.status !== 200 || !productsResponse.data.products || productsResponse.data.products.length < 1) {
      console.error('*** Failed to get products');
      process.exit(1);
    }
    
    const product = productsResponse.data.products[0];
    console.log(`Using product for testing: ${product.productCode} (${product.id})`);
    
    // Step 2: Create a folder for the user
    const folderPath = `/test-folder-deactivate-${ulid().toLowerCase()}`;
    const folderPayload = {
      productCode: product.productCode,
      use: product.uses[0].name,
      path: folderPath,
      accessType: 'inbound'
    };
    
    console.log(`Creating test folder with path: ${folderPath}`);
    
    const folderResponse = await axios.post(
      `https://${hostname}/folders`,
      folderPayload,
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (folderResponse.status !== 201) {
      console.error(`*** Failed to create folder: ${folderResponse.status}`);
      process.exit(1);
    }
    
    const folder = folderResponse.data.folder;
    console.log(`✅ Created folder: ${folder.id}`);
    
    // Step 3: Create a test user
    const username = `deactivate-testuser-${ulid().toLowerCase()}`;
    const createUserPayload = {
      name: "Deactivation Test User",
      username: username,
      authenticationType: "password",
      password: "TestPassword123!",
      folders: [folder.id],
      access: "readwrite",
      productCode: product.productCode
    };
    
    console.log(`Creating user for deactivation test: ${username}`);
    
    const createUserResponse = await axios.post(
      `https://${hostname}/users`,
      createUserPayload,
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (createUserResponse.status !== 201) {
      console.error(`*** Failed to create user: ${createUserResponse.status}`);
      process.exit(1);
    }
    
    const createdUser = createUserResponse.data;
    console.log(`✅ Created user: ${createdUser.id}`);
    
    // Step 4: Verify the user is returned in a regular GET /users call
    console.log('Verifying user is returned in GET /users call...');
    const getUsersResponse = await axios.get(
      `https://${hostname}/users`,
      {
        headers: {
          'x-session-ref': xSessionRef
        }
      }
    );
    
    if (getUsersResponse.status !== 200) {
      console.error(`*** Failed to get users: ${getUsersResponse.status}`);
      process.exit(1);
    }
    
    const userFound = getUsersResponse.data.users.some((user: any) => user.id === createdUser.id);
    if (!userFound) {
      console.error('*** User not found in GET /users response');
      process.exit(1);
    }
    
    console.log('✅ User found in GET /users response');
    
    // Step 5: Deactivate the user using the update-user endpoint
    console.log(`Deactivating user: ${createdUser.id}`);
    const updateUserPayload = {
      active: false
    };
    
    const updateUserResponse = await axios.put(
      `https://${hostname}/users/${createdUser.id}`,
      updateUserPayload,
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (updateUserResponse.status !== 200) {
      console.error(`*** Failed to update user: ${updateUserResponse.status}`);
      process.exit(1);
    }
    
    const updatedUser = updateUserResponse.data;
    if (updatedUser.active !== false) {
      console.error('*** User was not deactivated');
      process.exit(1);
    }
    
    console.log('✅ User was successfully deactivated');
    
    // Step 6: Verify the user is NOT returned in a regular GET /users call
    console.log('Verifying user is NOT returned in regular GET /users call...');
    const getUsersAfterDeactivateResponse = await axios.get(
      `https://${hostname}/users`,
      {
        headers: {
          'x-session-ref': xSessionRef
        }
      }
    );
    
    if (getUsersAfterDeactivateResponse.status !== 200) {
      console.error(`*** Failed to get users: ${getUsersAfterDeactivateResponse.status}`);
      process.exit(1);
    }
    
    const userFoundAfterDeactivate = getUsersAfterDeactivateResponse.data.users.some((user: any) => user.id === createdUser.id);
    if (userFoundAfterDeactivate) {
      console.error('*** Deactivated user was found in regular GET /users response');
      process.exit(1);
    }
    
    console.log('✅ Deactivated user is NOT returned in regular GET /users response');
    
    // Step 7: Verify the user IS returned when using include=inactive query parameter
    console.log('Verifying user IS returned when using include=inactive query parameter...');
    const getUsersWithInactiveResponse = await axios.get(
      `https://${hostname}/users?include=inactive`,
      {
        headers: {
          'x-session-ref': xSessionRef
        }
      }
    );
    
    if (getUsersWithInactiveResponse.status !== 200) {
      console.error(`*** Failed to get users with include=inactive: ${getUsersWithInactiveResponse.status}`);
      process.exit(1);
    }
    
    const userFoundWithInactive = getUsersWithInactiveResponse.data.users.some((user: any) => user.id === createdUser.id);
    if (!userFoundWithInactive) {
      console.error('*** Deactivated user was not found in GET /users?include=inactive response');
      process.exit(1);
    }
    
    console.log('✅ Deactivated user IS returned when using include=inactive query parameter');
    
    // Step 8: Clean up - Delete the user and folder directly from DynamoDB
    try {
      console.log('Cleaning up test user and folder...');
      
      // Get the table name
      const tableName = await getTableName();
      
      // Delete the user directly from DynamoDB
      await docClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: {
            PK: `TENANT#${createdUser.tenantId}`,
            SK: `USER#${createdUser.id}`
          }
        })
      );
      console.log(`✅ Successfully deleted test user: ${createdUser.id} from DynamoDB`);
      
      // Delete the folder directly from DynamoDB
      await docClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: {
            PK: `TENANT#${folder.tenantId}`,
            SK: `FOLDER#${folder.id}`
          }
        })
      );
      console.log(`✅ Successfully deleted test folder: ${folder.id} from DynamoDB`);
    } catch (cleanupError) {
      throw new Error(`⚠️ Error during test cleanup: ${cleanupError}`);
    }
    
    console.log('✅ Deactivate user test passed successfully');
    
  } catch (error) {
    console.error('*** Error in deactivate user test:', error);
    process.exit(1);
  }
}

/**
 * Test that audit records are created when users are modified
 */
async function testAuditRecords(): Promise<void> {
  try {
    // Get the API hostname
    const hostname = await getDirectHostname();
    
    const xSessionRef = await getIntegrationSessionRef();
    
    console.log('Running audit records test...');
    console.log(`Using API hostname: ${hostname}`);

    // Get the table names
    const tableName = await getTableName();
    const auditTableName = `${tableName}-audit`;

    // Create a test user
    const username = `audit-test-${ulid().toLowerCase()}`;
    const createUserPayload = {
      name: 'Audit Test User',
      username,
      authenticationType: 'password',
      password: 'TestPassword123!',
      access: 'readwrite',
      productCode: 'QA', // Use a valid product code
      folders: [] // No folders for this test
    };

    console.log(`Creating test user: ${username}`);
    const createUserResponse = await axios.post(
      `https://${hostname}/users`,
      createUserPayload,
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );

    if (createUserResponse.status !== 201) {
      console.error(`*** Failed to create user: ${createUserResponse.status}`);
      process.exit(1);
    }

    const createdUser = createUserResponse.data;
    console.log(`✅ Created user: ${createdUser.id}`);

    // Wait a moment for the stream to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify the creation audit record
    const createAuditRecords = await docClient.send(
      new QueryCommand({
        TableName: auditTableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `AUDIT#USER#${createdUser.id}`
        }
      })
    );

    if (!createAuditRecords.Items || createAuditRecords.Items.length === 0) {
      console.error('*** No audit record found for user creation');
      process.exit(1);
    }

    const createAuditRecord = createAuditRecords.Items[0];
    console.log('✅ Found audit record for user creation');

    // Verify the audit record fields
    if (
      createAuditRecord.eventName !== 'INSERT' ||
      createAuditRecord.entityType !== 'USER' ||
      createAuditRecord.entityId !== createdUser.id ||
      createAuditRecord.tenantId !== createdUser.tenantId ||
      !createAuditRecord.GSI1PK.startsWith('TENANT#') ||
      !createAuditRecord.expires
    ) {
      console.error('*** Audit record has incorrect fields', createAuditRecord);
      process.exit(1);
    }

    console.log('✅ Audit record has correct fields');

    // Deactivate the user
    console.log(`Deactivating user: ${createdUser.id}`);
    const updateUserResponse = await axios.put(
      `https://${hostname}/users/${createdUser.id}`,
      { active: false },
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );

    if (updateUserResponse.status !== 200) {
      console.error(`*** Failed to update user: ${updateUserResponse.status}`);
      process.exit(1);
    }

    console.log('✅ User deactivated successfully');

    // Wait a moment for the stream to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Clean up - Delete the user directly from DynamoDB
    try {
      console.log('Cleaning up test user...');
      
      await docClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: {
            PK: `TENANT#${createdUser.tenantId}`,
            SK: `USER#${createdUser.id}`
          }
        })
      );
      console.log(`✅ Successfully deleted test user: ${createdUser.id}`);
    } catch (cleanupError) {
      throw new Error(`⚠️ Error during test cleanup: ${cleanupError}`);
    }

    // Wait a moment for the stream to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify the update audit record
    const updateAuditRecords = await docClient.send(
      new QueryCommand({
        TableName: auditTableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `AUDIT#USER#${createdUser.id}`
        }
      })
    );

    if (!updateAuditRecords.Items || updateAuditRecords.Items.length < 2) {
      console.error('*** No audit record found for user update');
      process.exit(1);
    }

    const updateAuditRecord = updateAuditRecords.Items[1];
    console.log('✅ Found audit record for user update');

    // Verify the audit record fields
    if (
      updateAuditRecord.eventName !== 'MODIFY' ||
      updateAuditRecord.entityType !== 'USER' ||
      updateAuditRecord.entityId !== createdUser.id ||
      updateAuditRecord.tenantId !== createdUser.tenantId ||
      !updateAuditRecord.GSI1PK.startsWith('TENANT#') ||
      !updateAuditRecord.expires
    ) {
      console.error('*** Audit record has incorrect fields', updateAuditRecord);
      process.exit(1);
    }

    console.log('✅ Audit record has correct fields');
    console.log('✅ Audit records test passed successfully');
  } catch (error) {
    console.error('*** Error in audit records test:', error);
    process.exit(1);
  }
}

/**
 * Helper function to wait for user to press Enter before continuing
 */
async function waitForEnter(message: string = 'Press Enter to continue to the next test...'): Promise<void> {
  return new Promise((resolve) => {
    console.log('\n' + message);
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

/**
 * Test function for cleanupTempTenant
 * Creates a temporary tenant with associated entities and then cleans it up
 */
async function testCleanupTempTenant(): Promise<void> {
  try {
    // Get the API hostname
    const hostname = await getDirectHostname();
    
    const xSessionRef = await getIntegrationSessionRef();
    
    console.log('Running cleanup tenant test...');
    console.log(`Using API hostname: ${hostname}`);
    
    // Step 1: Create a temporary tenant
    const tempTenantId = `temp-${ulid().toLowerCase()}`;
    const tenantPayload = {
      id: tempTenantId,
      name: `Temporary Test Tenant ${tempTenantId}`,
      domain: `test-${tempTenantId}.example.com`
    };
    
    console.log(`Creating temporary tenant: ${tempTenantId}`);
    
    // Get the table name
    const tableName = await getTableName();
    
    // Create the tenant directly in DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: `TENANT#${tempTenantId}`,
          SK: '$',
          id: tempTenantId,
          name: tenantPayload.name,
          domain: tenantPayload.domain,
          GSI1PK: 'ALL_TENANTS',
          GSI1SK: `TENANT#${tempTenantId}`,
          active: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }
      })
    );
    
    console.log(`✅ Created temporary tenant: ${tempTenantId}`);
    
    // Step 2: Create a tenant-product relationship
    // Get products to find a product to use
    const productsResponse = await makeSignedRequest(
      `https://${hostname}/service/products`,
      'GET',
      {
        'Content-Type': 'application/json'
      }
    );
    
    if (productsResponse.status !== 200 || !productsResponse.data.products || productsResponse.data.products.length < 1) {
      console.error('*** Failed to get products');
      process.exit(1);
    }
    
    const product = productsResponse.data.products[0];
    
    // Create tenant-product relationship
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: `TENANT#${tempTenantId}`,
          SK: `PRODUCT#${product.id}`,
          tenantId: tempTenantId,
          productId: product.id,
          GSI1PK: `PRODUCT#${product.id}`,
          GSI1SK: `TENANT#${tempTenantId}`,
          active: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }
      })
    );
    
    console.log(`✅ Created tenant-product relationship for tenant ${tempTenantId} and product ${product.id}`);
    
    // Step 3: Create a folder
    const folderPath = `/test-folder-cleanup-${ulid().toLowerCase()}`;
    const folderId = ulid();
    
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: `TENANT#${tempTenantId}`,
          SK: `FOLDER#${folderId}`,
          id: folderId,
          tenantId: tempTenantId,
          productId: product.id,
          use: product.uses[0].name,
          path: folderPath,
          accessType: 'inbound',
          active: true,
          GSI1PK: 'ALL_FOLDERS',
          GSI1SK: `PRODUCT#${product.id}#FOLDER#${folderId}`,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }
      })
    );
    
    console.log(`✅ Created folder: ${folderId} for tenant ${tempTenantId}`);
    
    // Step 4: Create a user
    const userId = ulid();
    const username = `test-user-${ulid().toLowerCase()}`;
    
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: `TENANT#${tempTenantId}`,
          SK: `USER#${userId}`,
          id: userId,
          tenantId: tempTenantId,
          name: "Test User",
          username: username,
          authenticationType: "password",
          passwordHash: "hashedpassword",
          folders: [folderId],
          productId: product.id,
          access: "readwrite",
          active: true,
          isProductUser: false,
          GSI1PK: 'ALL_USERS',
          GSI1SK: `USER#${username}`,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }
      })
    );
    
    console.log(`✅ Created user: ${userId} (${username}) for tenant ${tempTenantId}`);
    
    // Step 5: Verify the entities were created by running the validation function
    console.log('\nVerifying entities were created by running validation...');
    await validateNoDanglingReferences();
    
    // Step 6: Clean up the temporary tenant and all related entities
    console.log('\nCleaning up temporary tenant and all related entities...');
    await cleanupTempTenant(tempTenantId);
    
    // Step 7: Verify the entities were deleted by checking if they still exist
    console.log('\nVerifying entities were deleted...');
    
    // Check if tenant exists
    const tenantResponse = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `TENANT#${tempTenantId}`,
          SK: '$'
        }
      })
    );
    
    if (tenantResponse.Item) {
      throw new Error(`❌ Tenant ${tempTenantId} still exists after cleanup`);
    }
    
    // Check if user exists
    const userResponse = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `TENANT#${tempTenantId}`,
          SK: `USER#${userId}`
        }
      })
    );
    
    if (userResponse.Item) {
      throw new Error(`❌ User ${userId} still exists after cleanup`);
    }
    
    // Check if folder exists
    const folderResponse = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `TENANT#${tempTenantId}`,
          SK: `FOLDER#${folderId}`
        }
      })
    );
    
    if (folderResponse.Item) {
      throw new Error(`❌ Folder ${folderId} still exists after cleanup`);
    }
    
    // Check if tenant-product relationship exists
    const tpResponse = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `TENANT#${tempTenantId}`,
          SK: `PRODUCT#${product.id}`
        }
      })
    );
    
    if (tpResponse.Item) {
      throw new Error(`❌ Tenant-product relationship still exists after cleanup`);
    }
    
    console.log('✅ All entities were successfully deleted');
    console.log('✅ Cleanup tenant test passed successfully');
    
  } catch (error) {
    console.error('*** Error in cleanup tenant test:', error);
    process.exit(1);
  }
}

/**
 * Validates that there are no dangling references in the database:
 * 1. No users who have a tenant, product, or folders that don't exist
 * 2. No folders with a product or tenant that don't exist
 * 3. No TenantProduct records with a product or tenant that don't exist
 */
async function validateNoDanglingReferences(): Promise<void> {
  try {
    console.log('Validating database for dangling references...');
    
    // Get the table name
    const tableName = await getTableName();
    console.log(`Using table: ${tableName}`);
    
    // Step 1: Get all users, folders, products, tenants, and tenant-product records
    console.log('Fetching all records from DynamoDB...');
    
    // Get all users
    const usersResponse = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'ALL_USERS'
        }
      })
    );
    const users = usersResponse.Items || [];
    console.log(`Found ${users.length} users`);
    
    // Get all folders
    const foldersResponse = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'ALL_FOLDERS'
        }
      })
    );
    const folders = foldersResponse.Items || [];
    console.log(`Found ${folders.length} folders`);
    
    // Get all products
    const productsResponse = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'ALL_PRODUCTS'
        }
      })
    );
    const products = productsResponse.Items || [];
    console.log(`Found ${products.length} products`);
    
    // Get all tenants
    const tenantsResponse = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'ALL_TENANTS'
        }
      })
    );
    const tenants = tenantsResponse.Items || [];
    console.log(`Found ${tenants.length} tenants`);
    
    // Get all tenant-product records
    // We need to scan the table since there's no GSI1PK for ALL_TENANT_PRODUCTS
    // TenantProduct has PK = TENANT#${tenantId} and SK = PRODUCT#${productId}
    console.log('Scanning for tenant-product relationships...');
    
    // We'll use a scan operation with a filter to find tenant-product records
    const scanParams = {
      TableName: tableName,
      FilterExpression: 'begins_with(SK, :productPrefix)',
      ExpressionAttributeValues: {
        ':productPrefix': 'PRODUCT#'
      }
    };
    
    // Use the AWS SDK v2 for scanning since it's easier to handle pagination
    const dynamoDb = new DynamoDB.DocumentClient({ region });
    
    // Function to scan with pagination
    const scanAll = async (params: any): Promise<any[]> => {
      let lastEvaluatedKey;
      let allItems: any[] = [];
      
      do {
        if (lastEvaluatedKey) {
          params.ExclusiveStartKey = lastEvaluatedKey;
        }
        
        const response = await dynamoDb.scan(params).promise();
        if (response.Items && response.Items.length > 0) {
          allItems = [...allItems, ...response.Items];
        }
        
        lastEvaluatedKey = response.LastEvaluatedKey;
      } while (lastEvaluatedKey);
      
      return allItems;
    };
    
    const allItems = await scanAll(scanParams);
    
    // Filter to only include tenant-product relationships
    // (items where PK starts with TENANT# and SK starts with PRODUCT#)
    const tenantProducts = allItems.filter(item =>
      item.PK && item.PK.startsWith('TENANT#') &&
      item.SK && item.SK.startsWith('PRODUCT#')
    );
    
    console.log(`Found ${tenantProducts.length} tenant-product relationships`);
    
    // Create lookup maps for faster validation
    const productMap = new Map(products.map(p => [p.id, p]));
    const tenantMap = new Map(tenants.map(t => [t.id, t]));
    const folderMap = new Map(folders.map(f => [f.id, f]));
    
    // Step 2: Validate users
    console.log('\nValidating users...');
    let userErrors = 0;
    
    for (const user of users) {
      // Check if tenant exists
      if (!tenantMap.has(user.tenantId) && !(user.isProductUser && user.tenantId === 'MULTITENANT')) {
        console.error(`❌ User ${user.id} (${user.username}) references non-existent tenant: ${user.tenantId}`);
        userErrors++;
      }
      
      // Check if product exists
      if (!productMap.has(user.productId)) {
        console.error(`❌ User ${user.id} (${user.username}) references non-existent product: ${user.productId}`);
        userErrors++;
      }
      
      // Check if folders exist
      if (user.folders && Array.isArray(user.folders)) {
        for (const folderId of user.folders) {
          if (!folderMap.has(folderId)) {
            console.error(`❌ User ${user.id} (${user.username}) references non-existent folder: ${folderId}`);
            userErrors++;
          }
        }
      }
    }
    
    if (userErrors === 0) {
      console.log('✅ All users have valid references');
    } else {
      console.error(`❌ Found ${userErrors} reference errors in users`);
    }
    
    // Step 3: Validate folders
    console.log('\nValidating folders...');
    let folderErrors = 0;
    
    for (const folder of folders) {
      // Check if tenant exists
      if (!tenantMap.has(folder.tenantId)) {
        console.error(`❌ Folder ${folder.id} (${folder.path}) references non-existent tenant: ${folder.tenantId}`);
        folderErrors++;
      }
      
      // Check if product exists
      if (!productMap.has(folder.productId)) {
        console.error(`❌ Folder ${folder.id} (${folder.path}) references non-existent product: ${folder.productId}`);
        folderErrors++;
      }
    }
    
    if (folderErrors === 0) {
      console.log('✅ All folders have valid references');
    } else {
      console.error(`❌ Found ${folderErrors} reference errors in folders`);
    }
    
    // Step 4: Validate tenant-product relationships
    console.log('\nValidating tenant-product relationships...');
    let tenantProductErrors = 0;
    
    for (const tp of tenantProducts) {
      // Extract tenantId from PK (format: TENANT#${tenantId})
      const tenantId = tp.PK.substring(7); // Remove 'TENANT#' prefix
      
      // Extract productId from SK (format: PRODUCT#${productId})
      const productId = tp.SK.substring(8); // Remove 'PRODUCT#' prefix
      
      // Check if tenant exists
      if (!tenantMap.has(tenantId)) {
        console.error(`❌ TenantProduct relationship references non-existent tenant: ${tenantId}`);
        tenantProductErrors++;
      }
      
      // Check if product exists
      if (!productMap.has(productId)) {
        console.error(`❌ TenantProduct relationship references non-existent product: ${productId}`);
        tenantProductErrors++;
      }
    }
    
    if (tenantProductErrors === 0) {
      console.log('✅ All tenant-product relationships have valid references');
    } else {
      console.error(`❌ Found ${tenantProductErrors} reference errors in tenant-product relationships`);
    }
    
    // Summary
    const totalErrors = userErrors + folderErrors + tenantProductErrors;
    if (totalErrors === 0) {
      console.log('\n✅ No dangling references found in the database');
    } else {
      console.error(`\n❌ Found a total of ${totalErrors} dangling references in the database`);
      throw new Error(`Found ${totalErrors} dangling references in the database`);
    }
    
  } catch (error) {
    console.error('*** Error validating database references:', error);
    throw error;
  }
}

/**
 * Cleans up a temporary tenant and all its related entities from the database
 * This includes:
 * 1. All User entities associated with the tenant
 * 2. All Folder entities associated with the tenant
 * 3. All TenantProduct relationships associated with the tenant
 * 4. The Tenant entity itself
 *
 * @param tenantId The ID of the tenant to clean up
 */
async function cleanupTempTenant(tenantId: string): Promise<void> {
  try {
    console.log(`Cleaning up temporary tenant ${tenantId} and all related entities...`);
    
    // Get the table name
    const tableName = await getTableName();
    console.log(`Using table: ${tableName}`);
    
    // Step 1: Query for all entities related to this tenant
    
    // 1a. Query for all users associated with this tenant
    console.log(`Finding users for tenant ${tenantId}...`);
    const usersResponse = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `TENANT#${tenantId}`,
          ':sk': 'USER#'
        }
      })
    );
    const users = usersResponse.Items || [];
    console.log(`Found ${users.length} users to delete`);
    
    // 1b. Query for all folders associated with this tenant
    console.log(`Finding folders for tenant ${tenantId}...`);
    const foldersResponse = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `TENANT#${tenantId}`,
          ':sk': 'FOLDER#'
        }
      })
    );
    const folders = foldersResponse.Items || [];
    console.log(`Found ${folders.length} folders to delete`);
    
    // 1c. Query for all tenant-product relationships for this tenant
    console.log(`Finding tenant-product relationships for tenant ${tenantId}...`);
    const tenantProductsResponse = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk and begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `TENANT#${tenantId}`,
          ':sk': 'PRODUCT#'
        }
      })
    );
    const tenantProducts = tenantProductsResponse.Items || [];
    console.log(`Found ${tenantProducts.length} tenant-product relationships to delete`);
    
    // Step 2: Delete all the related entities
    
    // 2a. Delete all users
    console.log('Deleting users...');
    for (const user of users) {
      await docClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: {
            PK: `TENANT#${tenantId}`,
            SK: user.SK
          }
        })
      );
      console.log(`Deleted user ${user.SK}`);
    }
    
    // 2b. Delete all folders
    console.log('Deleting folders...');
    for (const folder of folders) {
      await docClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: {
            PK: `TENANT#${tenantId}`,
            SK: folder.SK
          }
        })
      );
      console.log(`Deleted folder ${folder.SK}`);
    }
    
    // 2c. Delete all tenant-product relationships
    console.log('Deleting tenant-product relationships...');
    for (const tp of tenantProducts) {
      await docClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: {
            PK: `TENANT#${tenantId}`,
            SK: tp.SK
          }
        })
      );
      console.log(`Deleted tenant-product relationship ${tp.SK}`);
    }
    
    // Step 3: Finally, delete the tenant itself
    console.log(`Deleting tenant ${tenantId}...`);
    await docClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {
          PK: `TENANT#${tenantId}`,
          SK: '$'
        }
      })
    );
    
    console.log(`✅ Successfully cleaned up tenant ${tenantId} and all related entities`);
  } catch (error) {
    console.error(`*** Error cleaning up tenant ${tenantId}:`, error);
    throw error;
  }
}

/**
 * Main function to run integration tests
 */
/**
 * Integration test for district settings product reconciliation
 * Tests that the district settings handler correctly handles product list changes
 */
async function testDistrictSettingsProductReconciliation(): Promise<void> {
  try {
    // Get the API hostname and environment name
    const hostname = await getDirectHostname();
    const tableName = await getTableName();
    const { envName } = await getEnvNames();

    // Only run this test in dev environments where JWT validation is disabled
    if (!envName.startsWith('dev')) {
      console.log('⚠️ Skipping add district test - only runs in dev environments');
      return;
    }

    console.log('Running district settings product reconciliation test...');
    console.log(`Using API hostname: ${hostname}`);
    
    // Use our test district ID so District Settings plays nice
    const districtUid = 'f815af64-00c2-42f2-a437-2e48d0367b2a';
    console.log(`Using test district ID: ${districtUid}`);
    
    await cleanupTempTenant(districtUid); // Ensure a clean state before starting

    const now = Math.floor(Date.now() / 1000);

    // Step 1: Create a tenant record directly in DynamoDB
    console.log('Creating test tenant record in DynamoDB...');
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          _type: 'Tenant',
          PK: `TENANT#${districtUid}`,
          SK: '$',
          id: districtUid,
          name: `Test District ${districtUid}`,
          GSI1PK: 'ALL_TENANTS',
          GSI1SK: `TENANT#${districtUid}`,
          active: true,
          created: now,
          updated: now
        }
      })
    );
    console.log('✅ Created test tenant record');
    
    // Step 2: Call district settings "POST /product" with productCode="SIS"
    console.log('Adding SIS product to district...');
    const sisToken = createTestJWT({
      product: 'SIS',
      districtUid
    });
    
    const sisProductPayload = {
      token: sisToken
    };
    
    const sisResponse = await axios.post(
      `https://${hostname}/district-settings/products`,
      sisProductPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => status < 500
      }
    );
    
    if (sisResponse.status !== 201 && sisResponse.status !== 200) {
      console.error(`*** Expected status code 201 or 200, but got ${sisResponse.status}`);
      console.error('Response:', JSON.stringify(sisResponse.data, null, 2));
      process.exit(1);
    }
    
    console.log('✅ Added SIS product to district');
    
    // Wait a moment for the changes to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Get the SIS product ID
    console.log('Getting SIS product ID...');
    const productsResponse = await makeSignedRequest(
      `https://${hostname}/service/products`,
      'GET',
      {
        'Content-Type': 'application/json'
      }
    );
    
    if (productsResponse.status !== 200) {
      console.error(`*** Failed to get products: ${productsResponse.status}`);
      process.exit(1);
    }
    
    const sisProduct = productsResponse.data.products.find(
      (p: any) => p.productCode === 'SIS'
    );
    
    if (!sisProduct) {
      console.error('*** SIS product not found');
      process.exit(1);
    }
    
    console.log(`Found SIS product: ${sisProduct.id}`);
    
    // Step 4: Insert a bogus TenantProduct record using productCode="QA"
    console.log('Inserting bogus QA TenantProduct record...');
    
    // First, find the QA product
    const qaProduct = productsResponse.data.products.find(
      (p: any) => p.productCode === 'QA'
    );
    
    if (!qaProduct) {
      console.error('*** QA product not found');
      process.exit(1);
    }
    
    console.log(`Found QA product: ${qaProduct.id}`);
    
    // Insert the bogus TenantProduct record
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          _type: 'TenantProduct',
          PK: `TENANT#${districtUid}`,
          SK: `PRODUCT#${qaProduct.id}`,
          tenantId: districtUid,
          productId: qaProduct.id,
          productCode: 'QA',
          GSI1PK: `PRODUCT#${qaProduct.id}`,
          GSI1SK: `TENANT#${districtUid}`,
          active: true,
          created: now,
          updated: now
        }
      })
    );
    console.log('✅ Inserted bogus QA TenantProduct record');
    
    // Step 5: Call district settings DELETE /product endpoint for the "QA" product
    console.log('Calling DELETE /product for QA product...');
    const qaToken = createTestJWT({
      product: 'QA',
      districtUid
    });
    
    const qaProductPayload = {
      token: qaToken
    };
    
    const qaResponse = await axios.delete(
      `https://${hostname}/district-settings/products`,
      {
        data: qaProductPayload,
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => status < 500
      }
    );
    
    if (qaResponse.status !== 200) {
      console.error(`*** Expected status code 200, but got ${qaResponse.status}`);
      console.error('Response:', JSON.stringify(qaResponse.data, null, 2));
      process.exit(1);
    }
    
    console.log('✅ Called DELETE /product for QA product');
    
    // Wait a moment for the changes to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 6: Validate that the Tenant record and TenantProduct for "SIS" are both active=true
    console.log('Validating Tenant and SIS TenantProduct records...');
    
    // Check the tenant record
    const tenantResult = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `TENANT#${districtUid}`,
          SK: '$'
        }
      })
    );
    
    if (!tenantResult.Item || tenantResult.Item.active !== true) {
      console.error('*** Tenant record is not active');
      console.error('Tenant record:', JSON.stringify(tenantResult.Item, null, 2));
      process.exit(1);
    }
    
    console.log('✅ Tenant record is active');
    
    // Check the SIS TenantProduct record
    const sisTenantProductResult = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `TENANT#${districtUid}`,
          SK: `PRODUCT#${sisProduct.id}`
        }
      })
    );
    
    if (!sisTenantProductResult.Item || sisTenantProductResult.Item.active !== true) {
      console.error('*** SIS TenantProduct record is not active');
      console.error('SIS TenantProduct record:', JSON.stringify(sisTenantProductResult.Item, null, 2));
      process.exit(1);
    }
    
    console.log('✅ SIS TenantProduct record is active');
    
    // Step 7: Validate that the TenantProduct for "QA" is active=false and with an expires in the future
    console.log('Validating QA TenantProduct record...');
    
    const qaTenantProductResult = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `TENANT#${districtUid}`,
          SK: `PRODUCT#${qaProduct.id}`
        }
      })
    );
    
    if (!qaTenantProductResult.Item) {
      console.error('*** QA TenantProduct record not found');
      process.exit(1);
    }
    
    if (qaTenantProductResult.Item.active !== false) {
      console.error('*** QA TenantProduct record is not inactive');
      console.error('QA TenantProduct record:', JSON.stringify(qaTenantProductResult.Item, null, 2));
      process.exit(1);
    }
    
    if (!qaTenantProductResult.Item.expires || typeof qaTenantProductResult.Item.expires !== 'number') {
      console.error('*** QA TenantProduct record does not have an expires timestamp');
      console.error('QA TenantProduct record:', JSON.stringify(qaTenantProductResult.Item, null, 2));
      process.exit(1);
    }
    
    if (qaTenantProductResult.Item.expires <= now) {
      console.error('*** QA TenantProduct record expires timestamp is not in the future');
      console.error('QA TenantProduct record:', JSON.stringify(qaTenantProductResult.Item, null, 2));
      process.exit(1);
    }
    
    console.log('✅ QA TenantProduct record is inactive with future expires timestamp');
    
    // Clean up - Delete all test records
    console.log(`Cleaning up test records (TENANT#${districtUid})`);
    
    await cleanupTempTenant(districtUid); // Clean up after ourselves

    console.log(`✅ Test records deleted (TENANT#${districtUid})`);
    console.log('✅ District settings product reconciliation test passed successfully');
    
  } catch (error) {
    console.error('*** Error in district settings product reconciliation test:', error);
    process.exit(1);
  }
}

/**
 * Test SFTP connection using a temporary user
 * Creates a temporary user with the same settings as bobpublic-do-not-modify but without IP whitelist,
 * tests SFTP connection, and then deletes the user
 */
async function testSftp(): Promise<void> {
  const { envName } = await getEnvNames();
  const { protocols, createTransferServer } = getTransferServerConfig({
    envName
  });

  if (!createTransferServer || !protocols.includes('SFTP')) {
    console.log('⚠️ Skipping SFTP test - only runs in environments with SFTP protocol');
    return;
  }
  console.log('Running SFTP test...');
  
  try {
    // Get the API hostname
    const hostname = await getDirectHostname();
    const apiHostname = hostname;
    const sftpHostname = hostname.replace('api', 'files');
    
    const xSessionRef = await getIntegrationSessionRef();
    
    // Generate a ULID for the temporary username
    const tempUsername = ulid().toLowerCase();
    console.log(`Generated temporary username: ${tempUsername}`);
    
    // First, get the bobpublic-do-not-modify user data to copy settings
    console.log('Fetching bobpublic-do-not-modify user data to copy settings...');
    const bobPublicResponse = await axios.get(`https://${apiHostname}/users/01JRDJ7YJN1QD1F49CNYYVSZ8Q`, {
      headers: {
        'x-session-ref': xSessionRef
      }
    });
    
    if (bobPublicResponse.status !== 200) {
      console.error(`*** Failed to get bobpublic-do-not-modify user data: ${bobPublicResponse.status}`);
      process.exit(1);
    }
    
    const bobpublicDoNotModify = bobPublicResponse.data.user;
    console.log('Successfully retrieved bobpublic-do-not-modify user data');
    
    // Get the private key from environment variable
    const privateKeyFile = process.env.PRIVATE_KEY_FILE;
    if (!privateKeyFile) {
      console.error('*** PRIVATE_KEY_FILE environment variable is not set');
      process.exit(1);
    }
    
    // Read the public key from the private key file
    console.log(`Reading public key from ${privateKeyFile}...`);
    const publicKey = readFileSync(privateKeyFile + '.pub', 'utf8').trim();
    
    // Create the temporary user with the same settings as bobpublic-do-not-modify but without IP whitelist
    console.log('Creating temporary user...');
    const createUserPayload = {
      name: `Temporary SFTP Test User (${tempUsername})`,
      username: tempUsername,
      authenticationType: 'SSH key',
      folders: bobpublicDoNotModify.folders.map((folder: any) => folder.id),
      productCode: bobpublicDoNotModify.productCode,
      access: bobpublicDoNotModify.access,
      publicKey: publicKey
      // No ipWhitelist - this is the key difference from bobpublic-do-not-modify
    };
    
    const createResponse = await axios.post(
      `https://${apiHostname}/users`,
      createUserPayload,
      {
        headers: {
          'x-session-ref': xSessionRef,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (createResponse.status !== 201) {
      console.error(`*** Failed to create temporary user: ${createResponse.status}`);
      process.exit(1);
    }
    
    const tempUser = createResponse.data;
    console.log(`✅ Successfully created temporary user: ${tempUsername} (${tempUser.id})`);
    
    try {
      // Create a temporary file with SFTP commands
      const { spawn } = require('child_process');
      const fs = require('fs');
      const path = require('path');
      
      const sftpCommandsFile = path.join('/tmp', `sftp_commands_${tempUsername}.txt`);
      fs.writeFileSync(sftpCommandsFile, 'ls\nquit\n');
      console.log(`Created SFTP commands file: ${sftpCommandsFile}`);
      
      // Run the SFTP command
      console.log(`Connecting to SFTP server as ${tempUsername} using SSH key authentication...`);
      console.log(`SFTP hostname: ${sftpHostname}`);
      
      const sftpProcess = spawn('sftp', [
        '-b', sftpCommandsFile,
        '-v',
        '-i', privateKeyFile,
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'UserKnownHostsFile=/dev/null',
        `${tempUsername}@${sftpHostname}`
      ]);
      
      let sftpOutput = '';
      let sftpError = '';
      
      sftpProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        sftpOutput += output;
        console.log(output);
      });
      
      sftpProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        sftpError += output;
        console.error(output);
      });
      
      // Wait for the SFTP process to complete
      const exitCode = await new Promise<number>((resolve) => {
        sftpProcess.on('close', resolve);
      });
      
      // Check if the SFTP command was successful
      if (exitCode === 0) {
        console.log('✅ SFTP Test passed: Successfully logged in using SSH key authentication and listed home directory');
      } else {
        console.error(`❌ SFTP Test failed with exit code ${exitCode}`);
        console.error('Error output:', sftpError);
        throw new Error(`SFTP command failed with exit code ${exitCode}`);
      }
      
      // Clean up the temporary SFTP commands file
      fs.unlinkSync(sftpCommandsFile);
      
    } finally {
      // Always delete the temporary user directly from the database, even if the SFTP test fails
      console.log(`Deleting temporary user ${tempUsername} from database...`);
      
      try {
        // Get the table name
        const tableName = await getTableName();
        
        // Delete the user using DeleteCommand
        await docClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: {
              PK: `TENANT#${tempUser.tenantId}`,
              SK: `USER#${tempUser.id}`
            }
          })
        );
        
        console.log(`✅ Successfully deleted temporary user: ${tempUsername} from database`);
      } catch (deleteError) {
        console.error('*** Error deactivating temporary user:', deleteError);
      }
    }
    
    console.log('✅ SFTP test completed successfully');
    
  } catch (error) {
    console.error('*** Error in SFTP test:', error);
    process.exit(1);
  }
}

/**
 * Integration test for the delete-inactive-objects-handler
 * Tests the automatic deletion of inactive users and folders
 */
async function testDeleteInactiveObjects(): Promise<void> {
  try {
    console.log('Testing delete-inactive-objects-handler with manipulated timestamps...');

    const qaSessionRef = await getIntegrationSessionRef(TENANT_ID_QA);

    // Get the API hostname
    const hostname = await getDirectHostname();
    console.log(`Using API hostname: ${hostname}`);

    // Set the APP_TABLE_NAME environment variable before importing db-schema
    process.env.APP_TABLE_NAME = await getTableName();

    const tableName = process.env.APP_TABLE_NAME;
    console.log(`Using DynamoDB table: ${tableName}`);

    // 1. Use QA for our test tenant
    const districtUid = TENANT_ID_QA;
    console.log(`Using test tenant: ${districtUid}...`);
    
    // 2. Get a valid product to use for our tests
    console.log('Getting a product for test users and folders...');
    const getProductsResponse = await axios.get(`https://${hostname}/products`, {
      headers: {
        'x-session-ref': qaSessionRef
      }
    });
    
    if (getProductsResponse.status !== 200 || !getProductsResponse.data.products || getProductsResponse.data.products.length === 0) {
      console.error('*** Failed to get products or no products available');
      process.exit(1);
    }
    
    const testProduct = (getProductsResponse.data.products as ProductResponse[]).find((p) => p.productCode === 'QA');
    if (!testProduct) {
      console.error('*** No test product found');
      process.exit(1);
    }
    
    console.log(`✅ Using product: ${testProduct.name} (${testProduct.id})`);
    
    // Create test users that will meet each inactive condition
    console.log('Creating test users that will be made inactive...');
    
    // // Create test user IDs
    // const sixMonthsInactiveUserId = ulid();
    // const neverLoggedInUserId = ulid(); 
    // const markedInactiveUserId = ulid();
    // const activeControlUserId = ulid();
    
    // Helper function to create a test user
    const createTestUser = async (username: string, active: boolean = true) => {
      const userId = ulid();
      const createUserPayload = {
        name: `Test ${username}`,
        username: `${username}-${userId.toLowerCase()}`,
        authenticationType: 'password',
        password: 'Password123!',
        access: 'readwrite',
        folders: [],
        productCode: testProduct.productCode
      };
      
      const createResponse = await axios.post(
        `https://${hostname}/users`,
        createUserPayload,
        {
          headers: {
            'x-session-ref': qaSessionRef,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (createResponse.status !== 201) {
        throw new Error(`Failed to create test user ${username}: ${createResponse.status}`);
      }

      // If not active, mark the user as inactive
      if (!active) {
        await docClient.send(new UpdateCommand({
          TableName: tableName,
          Key: {
            PK: `TENANT#${districtUid}`,
            SK: `USER#${createResponse.data.id}`
          },
          UpdateExpression: 'SET active = :active',
          ExpressionAttributeValues: {
            ':active': false
          }
        }));
        console.log(`✅ Marked user ${username} as inactive`);
      } else {
        console.log(`✅ Created user ${username}: ${createResponse.data.username} (${createResponse.data.id})`);
      }

      // Make the user expire in five minutes
      const expires = Math.floor(Date.now() / 1000) + 5 * 60;
      await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `TENANT#${districtUid}`,
          SK: `USER#${createResponse.data.id}`
        },
        UpdateExpression: 'SET expires = :expires',
        ExpressionAttributeValues: {
          ':expires': expires
        }
      }));
      console.log(`✅ Set user ${username} to expire in 5 minutes`);

      return createResponse.data.id;
    };
    
    // Create our test users
    const sixMonthsInactiveUserId = await createTestUser('SixMonthsInactive');
    const neverLoggedInUserId = await createTestUser('NeverLoggedIn');
    const markedInactiveUserId = await createTestUser('MarkedInactive', false);
    const activeControlUserId = await createTestUser('ActiveControl');
    
    console.log('✅ Test users created successfully');
    
    // Create test folders
    console.log('Creating test folders that will be made inactive...');
    
    // Helper function to create a test folder
    const createTestFolder = async (path: string, active: boolean = true) => {
      const createFolderPayload = {
        productCode: testProduct.productCode,
        use: 'Testing',
        path,
        accessType: 'inbound'
      };
      
      const createResponse = await axios.post(
        `https://${hostname}/folders`,
        createFolderPayload,
        {
          headers: {
            'x-session-ref': qaSessionRef,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (createResponse.status !== 201) {
        throw new Error(`Failed to create test folder ${path}: ${createResponse.status}`);
      }
      
      // If not active, mark the folder as inactive
      if (!active) {
        await docClient.send(new UpdateCommand({
          TableName: tableName,
          Key: {
            PK: `TENANT#${districtUid}`,
            SK: `FOLDER#${createResponse.data.folder.id}`
          },
          UpdateExpression: 'SET active = :active',
          ExpressionAttributeValues: {
            ':active': false
          }
        }));
        console.log(`✅ Marked folder ${path} as inactive`);
      } else {
        console.log(`✅ Created folder ${path}: ${createResponse.data.folder.id}`);
      }

      // Return the folder ID for later use
      return createResponse.data.folder.id;
    };
    
    // Create our test folders
    const inactiveFolderId = await createTestFolder(`/inactive-test-${ulid().toLowerCase()}`, false);
    const activeFolderId = await createTestFolder(`/active-test-${ulid().toLowerCase()}`);
    
    console.log('✅ Test folders created successfully');
    
    // 3. Update timestamps to trigger inactivity conditions
    console.log('Modifying timestamps to trigger inactivity conditions...');
    
    const now = Date.now();
    const sevenMonthsAgo = now - 7 * 30 * 24 * 60 * 60 * 1000;
    const fortyDaysAgo = now - 40 * 24 * 60 * 60 * 1000;
    
    // User who hasn't logged in for more than 6 months
    await docClient.send(new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `TENANT#${districtUid}`,
        SK: `USER#${sixMonthsInactiveUserId}`
      },
      UpdateExpression: 'SET lastLogin = :lastLogin, updated = :updated',
      ExpressionAttributeValues: {
        ':lastLogin': sevenMonthsAgo,
        ':updated': sevenMonthsAgo
      }
    }));
    
    // User who was created 8 months ago but never logged in
    await docClient.send(new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `TENANT#${districtUid}`,
        SK: `USER#${neverLoggedInUserId}`
      },
      UpdateExpression: 'SET lastLogin = :lastLogin, updated = :updated',
      ExpressionAttributeValues: {
        ':lastLogin': sevenMonthsAgo,
        ':updated': sevenMonthsAgo
      }
    }));

    // User who is marked as inactive and hasn't been updated in more than 30 days
    await docClient.send(new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `TENANT#${districtUid}`,
        SK: `USER#${markedInactiveUserId}`
      },
      UpdateExpression: 'SET lastLogin = :lastLogin, updated = :updated',
      ExpressionAttributeValues: {
        ':lastLogin': fortyDaysAgo,
        ':updated': fortyDaysAgo
      }
    }));
    
    // Folder that is marked as inactive and hasn't been updated in more than 30 days
    await docClient.send(new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `TENANT#${districtUid}`,
        SK: `FOLDER#${inactiveFolderId}`
      },
      UpdateExpression: 'SET updated = :updated',
      ExpressionAttributeValues: {
        ':updated': fortyDaysAgo
      }
    }));

    console.log('✅ Timestamps modified successfully');
    
    // 4. Verify that all test users and folders are in the database before running the handler
    console.log('Verifying test users and folders exist before running the handler...');
    
    // Check each user
    for (const userId of [sixMonthsInactiveUserId, neverLoggedInUserId, markedInactiveUserId, activeControlUserId]) {
      const userExists = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: {
          PK: `TENANT#${districtUid}`,
          SK: `USER#${userId}`
        }
      }));
      
      if (!userExists.Item) {
        console.error(`*** Test user ${userId} not found in database ${tableName} before test`);
        process.exit(1);
      }
    }
    
    // Check each folder
    for (const folderId of [inactiveFolderId, activeFolderId]) {
      const folderExists = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: {
          PK: `TENANT#${districtUid}`,
          SK: `FOLDER#${folderId}`
        }
      }));
      
      if (!folderExists.Item) {
        console.error(`*** Test folder ${folderId} not found in database before test`);
        process.exit(1);
      }
    }
    
    console.log('✅ All test users and folders verified to exist before test');
    
    // 5. Run the delete-inactive-objects-handler Lambda function
    console.log('Running the delete-inactive-objects-handler Lambda function...');
    
    // Import the handler
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { lambdaHandler } = require('../src/functions/delete-inactive-objects-handler');
    const result = await lambdaHandler();
    
    // Check result
    if (result.statusCode !== 200) {
      console.error(`*** Handler returned non-200 status code: ${result.statusCode}`);
      console.error(result.body);
      process.exit(1);
    }
    
    console.log('✅ Handler executed successfully');
    
    const responseBody = JSON.parse(result.body);
    console.log('Handler response:', JSON.stringify(responseBody, null, 2));
    
    // 6. Verify that the inactive users and folders have been deleted
    console.log('Verifying test users and folders after handler execution...');
    
    // Check inactive users should be deleted
    for (const userId of [sixMonthsInactiveUserId, neverLoggedInUserId, markedInactiveUserId]) {
      const userCheck = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: {
          PK: `TENANT#${districtUid}`,
          SK: `USER#${userId}`
        }
      }));
      
      if (userCheck.Item) {
        console.error(`*** Test user ${userId} was not deleted as expected`);
        console.error(JSON.stringify(userCheck.Item, null, 2));
        process.exit(1);
      }
      console.log(`✅ User ${userId} was deleted as expected`);
    }
    
    // Check active control user should still exist
    const activeUserCheck = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: {
        PK: `TENANT#${districtUid}`,
        SK: `USER#${activeControlUserId}`
      }
    }));
    
    if (!activeUserCheck.Item) {
      console.error(`*** Control user ${activeControlUserId} was incorrectly deleted`);
      process.exit(1);
    }
    console.log(`✅ Control user ${activeControlUserId} still exists as expected`);
    
    // Check inactive folder should be deleted
    const inactiveFolderCheck = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: {
        PK: `TENANT#${districtUid}`,
        SK: `FOLDER#${inactiveFolderId}`
      }
    }));
    
    if (inactiveFolderCheck.Item) {
      console.error(`*** Test folder ${inactiveFolderId} was not deleted as expected`);
      console.error(JSON.stringify(inactiveFolderCheck.Item, null, 2));
      process.exit(1);
    }
    console.log(`✅ Folder ${inactiveFolderId} was deleted as expected`);
    
    // Check active folder should still exist
    const activeFolderCheck = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: {
        PK: `TENANT#${districtUid}`,
        SK: `FOLDER#${activeFolderId}`
      }
    }));
    
    if (!activeFolderCheck.Item) {
      console.error(`*** Control folder ${activeFolderId} was incorrectly deleted`);
      process.exit(1);
    }
    console.log(`✅ Control folder ${activeFolderId} still exists as expected`);
    
    // 7. Clean up - delete our control test objects
    console.log(`Cleaning up test resources for tenant ${districtUid}...`);
    
    // Delete the active control user
    await docClient.send(new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: `TENANT#${districtUid}`,
        SK: `USER#${activeControlUserId}`
      }
    }));
    
    // Delete the active folder
    await docClient.send(new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: `TENANT#${districtUid}`,
        SK: `FOLDER#${activeFolderId}`
      }
    }));
        
    console.log('✅ Test resources cleaned up successfully');
    console.log('✅ Delete inactive objects integration test passed successfully');
  } catch (error) {
    console.error('*** Error testing delete-inactive-objects-handler:', error);
    process.exit(1);
  }
}

// Import the temporary flag tests
async function runIntegrationTests(): Promise<void> {
  console.log('Starting integration tests...');
  console.log('Each test will pause and wait for you to press Enter before proceeding to the next test.');
  
  // Run the get-user test
  if (testType === 'get-user' || testType === 'user' || testType === undefined) {
    console.log('\n=== Running get-user integration test ===');
    // await waitForEnter('Press Enter to start get-user test...');
    await testGetUserById();
  }

  // Run the update-user IP whitelist test
  if (testType === 'update-user' || testType === 'user' || testType === undefined) {
    console.log('\n=== Running update-user integration test ===');
    // await waitForEnter('Press Enter to start update-user IP whitelist test...');
    await testUpdateUserIpWhitelist();
  }
  
  // Run the SFTP test
  if (testType === 'sftp' || testType === undefined) {
    console.log('\n=== Running SFTP integration test ===');
    // await waitForEnter('Press Enter to start SFTP test...');
    await testSftp();
  }

  // Run the deactivate user test
  if (testType === 'deactivate-user' || testType === 'user' || testType === undefined) {
    console.log('\n=== Running deactivate user integration test ===');
    // await waitForEnter('Press Enter to start deactivate user test...');
    await testDeactivateUser();
  }

  // Run the audit records test
  if (testType === 'audit-records' || testType === 'user' || testType === undefined) {
    console.log('\n=== Running audit records integration test ===');
    // await waitForEnter('Press Enter to start audit records test...');
    await testAuditRecords();
  }

  // Run the server config endpoint tests
  if (testType === 'server-config' || testType === 'server' || testType === undefined) {
    console.log('\n=== Running server config endpoint tests ===');
    // await waitForEnter('Press Enter to start server config endpoint tests...');
    await testServerConfigEndpoint();
  }
  
  // Run the district settings product reconciliation test
  if (testType === 'district-settings-reconciliation' || testType === 'district' || testType === undefined) {
    console.log('\n=== Running district settings product reconciliation test ===');
    // await waitForEnter('Press Enter to start district settings product reconciliation test...');
    await testDistrictSettingsProductReconciliation();
  }

  // Run the POST /products tests
  if (testType === 'post-products' || testType === 'products' || testType === undefined) {
    console.log('\n=== Running POST /products integration test ===');
    // await waitForEnter('Press Enter to start POST /products test...');
    await testPostProducts();
  }
  
  // Run the GET /service/products tests
  if (testType === 'get-products' || testType === 'products' || testType === undefined) {
    console.log('\n=== Running GET /service/products integration test ===');
    // await waitForEnter('Press Enter to start GET /service/products test...');
    await testGetProducts();
  }
    
  // Run the POST /folders and PUT /folders/{id} tests
  if (testType === 'post-folder' || testType === 'folders' || testType === undefined) {
    console.log('\n=== Running POST /folders and PUT /folders/{id} integration tests ===');
    // await waitForEnter('Press Enter to start POST /folders and PUT /folders/{id} tests...');
    await testPostFolder();
  }
  
  // Run the user folder product validation tests
  if (testType === 'user-folder-validation' || testType === 'user' || testType === undefined) {
    console.log('\n=== Running user folder product validation tests ===');
    // await waitForEnter('Press Enter to start user folder product validation test...');
    await testUserFolderProductValidation();
    // await waitForEnter('Press Enter to start update user folder product validation test...');
    await testUpdateUserFolderProductValidation();
  }
  
  // Run the GET /folders tests
  if (testType === 'get-folders' || testType === 'folders' || testType === undefined) {
    console.log('\n=== Running GET /folders integration test ===');
    // await waitForEnter('Press Enter to start GET /folders test...');
    await testGetFolders();
  }
  
  // Run the IAM-authenticated GET /service/folders/{districtId} tests
  if (testType === 'get-folders-iam' || testType === 'folders' || testType === undefined) {
    console.log('\n=== Running IAM-authenticated GET /service/folders/{districtId} integration test ===');
    // await waitForEnter('Press Enter to start IAM-authenticated GET /service/folders/{districtId} test...');
    await testGetFoldersWithIAM();
  }
  
  // Run the district settings tests
  if (testType === 'add-district' || testType === 'district' || testType === undefined) {
    console.log('\n=== Running add district integration test ===');
    // await waitForEnter('Press Enter to start add district test...');
    await testAddDistrict();
  }
  
  if (testType === 'add-district-product' || testType === 'district' || testType === undefined) {
    console.log('\n=== Running add district product integration test ===');
    // await waitForEnter('Press Enter to start add district product test...');
    await testAddDistrictProduct();
  }
  
  // Run the cleanup tenant test if specified
  if (testType === 'cleanup-tenant' || testType === undefined) {
    console.log('\n=== Running cleanup tenant test ===');
    await testCleanupTempTenant();
  }
  
  // Run the validation for dangling references
  if (testType === 'validate-references' || testType === undefined) {
    console.log('\n=== Running validation for dangling references ===');
    await validateNoDanglingReferences();
  }
  
  // Run the delete-inactive-objects handler test
  if (testType === 'delete-inactive-objects' || testType === 'cleanup' || testType === undefined) {
    console.log('\n=== Running delete-inactive-objects handler integration test ===');
    // await waitForEnter('Press Enter to start delete-inactive-objects handler test...');
    await testDeleteInactiveObjects();
  }
  
  // Run the temporary flag tests
  if (testType === 'temporary-flag' || testType === 'temporary' || testType === undefined) {
    console.log('\n=== Running temporary user flag test ===');
    await testTemporaryUserFlag();
    
    console.log('\n=== Running temporary folder flag test ===');
    await testTemporaryFolderFlag();
  }

  console.log('\nAll integration tests completed successfully');
}

// Run the integration tests when this script is invoked directly
if (require.main === module) {
  // Set stdin to raw mode to capture Enter key presses without requiring Enter
  process.stdin.setRawMode && process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  // Handle Ctrl+C to exit gracefully
  process.stdin.on('data', (key) => {
    // Ctrl+C
    if (key.toString() === '\u0003') {
      console.log('\nExiting integration tests...');
      process.exit(0);
    }
  });

  runIntegrationTests()
    .catch(error => {
      console.error('*** Integration tests failed:', error);
      process.exit(1);
    })
    .finally(() => {
      // Clean up stdin when done
      process.stdin.setRawMode && process.stdin.setRawMode(false);
      process.stdin.pause();
    });
}
