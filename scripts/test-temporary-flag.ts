import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import axios from 'axios';
import { ulid } from 'ulid';
import { getDirectHostname, getIntegrationSessionRef, getTableName } from './integration-test-support';

// AWS region for API calls
const region = 'us-east-1';

// DynamoDB client is used to query the table and verify contents
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

function getExpectedExpires(): { expectedExpires: number; expiresMargin: number } {
    const now = Math.floor(Date.now() / 1000);
    const sixHoursInSeconds = 6 * 60 * 60;
    const expectedExpires = now + sixHoursInSeconds;
    const expiresMargin = 60; // Allow 1 minute margin for test execution time
    return {
      expectedExpires,
      expiresMargin
    };
}

/**
 * Test the temporary flag functionality for users
 * This tests creating and updating users with the temporary flag
 */
async function testTemporaryUserFlag(): Promise<void> {
  try {
    // Get the API hostname
    const hostname = await getDirectHostname();
    
    const xSessionRef = await getIntegrationSessionRef();

    console.log('Running temporary user flag test...');
    console.log(`Using API hostname: ${hostname}`);
    
    // First, get the products to find a valid productCode
    const productsResponse = await axios.get(`https://${hostname}/products`, {
      headers: {
        'x-session-ref': xSessionRef
      }
    });
    
    if (productsResponse.status !== 200 || !productsResponse.data.products || productsResponse.data.products.length === 0) {
      console.error('*** Failed to get products or no products available');
      process.exit(1);
    }
    
    // Use the first product for testing
    const product = productsResponse.data.products[0];
    const productCode = product.productCode;
    
    // Get folders for this product
    const foldersResponse = await axios.get(`https://${hostname}/folders`, {
      headers: {
        'x-session-ref': xSessionRef
      }
    });
    
    if (foldersResponse.status !== 200 || !foldersResponse.data.folders || foldersResponse.data.folders.length === 0) {
      console.error('*** Failed to get folders or no folders available');
      process.exit(1);
    }
    
    // Use the first folder for testing
    const folder = foldersResponse.data.folders[0];
    
    // Create a unique username for testing
    const testUsername = `test-user-${ulid().toLowerCase()}`;
    
    // Create a user with temporary flag set to true
    const createUserPayload = {
      username: testUsername,
      productCode,
      folders: [folder.id],
      authenticationType: 'password',
      access: 'read',
      password: 'Test@123456',
      name: 'Test Temporary User',
      temporary: true
    };
    
    console.log(`Creating test user with username: ${testUsername}, temporary: true`);
    
    // Make the API call to create the user
    const createResponse = await axios.post(
      `https://${hostname}/users`,
      createUserPayload,
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
    
    console.log('✅ Create user status code is 201');
    
    // Get the created user ID
    const userId = createResponse.data.id;
    
    // Get the user from the database to check the expires field
    const tableName = await getTableName();

    console.log(`Using DynamoDB table: ${tableName}`);
    const userDbResponse = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: {
        PK: `TENANT#${createResponse.data.tenantId}`,
        SK: `USER#${userId}`
      }
    }));
    
    const userDbItem = userDbResponse.Item;
    
    // Check if the expires field is set and is approximately 6 hours in the future
    if (!userDbItem || !userDbItem.expires) {
      console.error('*** User does not have an expires field');
      process.exit(1);
    }
    
    const { expectedExpires, expiresMargin } = getExpectedExpires();
    
    if (Math.abs(userDbItem.expires - expectedExpires) > expiresMargin) {
      console.error(`*** Expected expires to be around ${expectedExpires}, but got ${userDbItem.expires}`);
      process.exit(1);
    }
    
    console.log(`✅ User has expires field set to approximately 6 hours in the future: ${new Date(userDbItem.expires * 1000).toISOString()}`);
    
    // Now get the user via the API to check if expires is returned
    const getUserResponse = await axios.get(`https://${hostname}/users/${userId}`, {
      headers: {
        'x-session-ref': xSessionRef
      }
    });
    
    if (getUserResponse.status !== 200) {
      console.error(`*** Expected status code 200, but got ${getUserResponse.status}`);
      process.exit(1);
    }
    
    const retrievedUser = getUserResponse.data;
    
    // Check if the expires field is present in the API response
    if (!retrievedUser.user.expires) {
      console.error('*** User API response does not include expires field');
      console.error('Response:', JSON.stringify(retrievedUser, null, 2));
      process.exit(1);
    }
    
    console.log(`✅ User API response includes expires field: ${retrievedUser.expires}`);
    
    // Update the user to set temporary to false
    const updateUserPayload = {
      temporary: false
    };
    
    console.log(`Updating user ${userId} to set temporary: false`);
    
    // Make the API call to update the user
    const updateResponse = await axios.put(
      `https://${hostname}/users/${userId}`,
      updateUserPayload,
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
    
    console.log('✅ Update user status code is 200');
    
    // Get the updated user from the database to check the expires field
    const updatedUserDbResponse = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: {
        PK: `TENANT#${createResponse.data.tenantId}`,
        SK: `USER#${userId}`
      }
    }));
    
    const updatedUserDbItem = updatedUserDbResponse.Item;
    
    // Check if the expires field is set to 0
    if (!updatedUserDbItem || updatedUserDbItem.expires !== 0) {
      console.error(`*** Expected expires to be 0, but got ${updatedUserDbItem?.expires}`);
      process.exit(1);
    }
    
    console.log('✅ User has expires field set to 0 after update');
    
    // Clean up by deleting the user directly from DynamoDB
    console.log(`Cleaning up - deleting test user ${userId} from DynamoDB`);
    const deleteUserResponse = await docClient.send(new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: `TENANT#${createResponse.data.tenantId}`,
        SK: `USER#${userId}`
      }
    }));
    
    console.log('✅ Test user deleted from DynamoDB');
    console.log('✅ Temporary user flag test passed successfully');
    
  } catch (error) {
    console.error('*** Error testing temporary user flag:', error);
    process.exit(1);
  }
}

/**
 * Test the temporary flag functionality for folders
 * This tests creating and updating folders with the temporary flag
 */
async function testTemporaryFolderFlag(): Promise<void> {
  try {
    // Get the API hostname
    const hostname = await getDirectHostname();
    
    const xSessionRef = await getIntegrationSessionRef();
    
    console.log('Running temporary folder flag test...');
    console.log(`Using API hostname: ${hostname}`);
    
    // First, get the products to find a valid productCode
    const productsResponse = await axios.get(`https://${hostname}/products`, {
      headers: {
        'x-session-ref': xSessionRef
      }
    });
    
    if (productsResponse.status !== 200 || !productsResponse.data.products || productsResponse.data.products.length === 0) {
      console.error('*** Failed to get products or no products available');
      process.exit(1);
    }
    
    // Use the first product for testing
    const product = productsResponse.data.products[0];
    const productCode = product.productCode;
    
    // Create a unique folder path for testing
    const testFolderPath = `/test-folder-temp-${ulid().toLowerCase()}`;
    
    // Create a folder with temporary flag set to true
    const createFolderPayload = {
      productCode,
      use: product.uses[0].name,
      path: testFolderPath,
      accessType: 'inbound',
      temporary: true
    };
    
    console.log(`Creating test folder with path: ${testFolderPath}, temporary: true`);
    
    // Make the API call to create the folder
    const createResponse = await axios.post(
      `https://${hostname}/folders`,
      createFolderPayload,
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
    
    console.log('✅ Create folder status code is 201');
    
    // Get the created folder ID
    const folderId = createResponse.data.folder.id;
    const tenantId = createResponse.data.folder.tenantId;
    
    // Get the folder from the database to check the expires field
    const tableName = await getTableName();
    const folderDbResponse = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: {
        PK: `TENANT#${tenantId}`,
        SK: `FOLDER#${folderId}`
      }
    }));
    
    const folderDbItem = folderDbResponse.Item;
    
    // Check if the expires field is set and is approximately 6 hours in the future
    if (!folderDbItem || !folderDbItem.expires) {
      console.error('*** Folder does not have an expires field');
      process.exit(1);
    }
    
    const { expectedExpires, expiresMargin } = getExpectedExpires();

    if (Math.abs(folderDbItem.expires - expectedExpires) > expiresMargin) {
      console.error(`*** Expected expires to be around ${expectedExpires}, but got ${folderDbItem.expires}`);
      process.exit(1);
    }
    
    console.log(`✅ Folder has expires field set to approximately 6 hours in the future: ${new Date(folderDbItem.expires * 1000).toISOString()}`);
    
    // Now get the folder via the API to check if expires is returned
    const getFolderResponse = await axios.get(`https://${hostname}/folders/${folderId}`, {
      headers: {
        'x-session-ref': xSessionRef
      }
    });
    
    if (getFolderResponse.status !== 200) {
      console.error(`*** Expected status code 200, but got ${getFolderResponse.status}`);
      process.exit(1);
    }
    
    const retrievedFolder = getFolderResponse.data;
    
    // Check if the expires field is present in the API response
    if (!retrievedFolder.folder.expires) {
      console.error('*** Folder API response does not include expires field');
      console.error('Response:', JSON.stringify(retrievedFolder, null, 2));
      process.exit(1);
    }
    
    console.log(`✅ Folder API response includes expires field: ${retrievedFolder.expires}`);
    
    // Update the folder to set temporary to false
    const updateFolderPayload = {
      temporary: false
    };
    
    console.log(`Updating folder ${folderId} to set temporary: false`);
    
    // Make the API call to update the folder
    const updateResponse = await axios.put(
      `https://${hostname}/folders/${folderId}`,
      updateFolderPayload,
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
    
    console.log('✅ Update folder status code is 200');
    
    // Get the updated folder from the database to check the expires field
    const updatedFolderDbResponse = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: {
        PK: `TENANT#${tenantId}`,
        SK: `FOLDER#${folderId}`
      }
    }));
    
    const updatedFolderDbItem = updatedFolderDbResponse.Item;
    
    // Check if the expires field is set to 0
    if (!updatedFolderDbItem || updatedFolderDbItem.expires !== 0) {
      console.error(`*** Expected expires to be 0, but got ${updatedFolderDbItem?.expires}`);
      process.exit(1);
    }
    
    console.log('✅ Folder has expires field set to 0 after update');
    
    // Clean up by deleting the folder directly from DynamoDB
    console.log(`Cleaning up - deleting test folder ${folderId} from DynamoDB`);
    const deleteFolderResponse = await docClient.send(new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: `TENANT#${tenantId}`,
        SK: `FOLDER#${folderId}`
      }
    }));
    
    console.log('✅ Test folder deleted from DynamoDB');
    console.log('✅ Temporary folder flag test passed successfully');
    
  } catch (error) {
    console.error('*** Error testing temporary folder flag:', error);
    process.exit(1);
  }
}

/**
 * Run the temporary flag tests
 */
async function runTemporaryFlagTests(): Promise<void> {
  console.log('Starting temporary flag tests...');
  
  // Run the temporary user flag test
  console.log('\n=== Running temporary user flag test ===');
  await testTemporaryUserFlag();
  
  // Run the temporary folder flag test
  console.log('\n=== Running temporary folder flag test ===');
  await testTemporaryFolderFlag();
  
  console.log('\nAll temporary flag tests completed successfully');
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runTemporaryFlagTests()
    .catch(error => {
      console.error('Error running temporary flag tests:', error);
      process.exit(1);
    });
}

// Export the test functions for use in other test files
export {
  runTemporaryFlagTests, testTemporaryFolderFlag, testTemporaryUserFlag
};
