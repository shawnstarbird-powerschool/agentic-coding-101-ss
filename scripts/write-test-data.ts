import { cleanName, getBranch, getNamespace } from '@ps-refarch/cdk-utils';
import { DynamoDB } from 'aws-sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import accountEnvProps from '../src/account-env';
import { ensureSubfoldersExist } from '../src/util/s3-utils';
import { MANUAL_TENANT_ID, TENANT_ID, TENANT_ID_QA } from './integration-test-support';

// Test tenant records to insert into DynamoDB
const TEST_TENANTS = [
  {
    "PK": `TENANT#${TENANT_ID}`,
    "SK": "$",
    "id": TENANT_ID,
    "name": "Test Tenant",
    "domain": "test-tenant.example.com",
    "districtId": "district-123",
    "GSI1PK": "ALL_TENANTS",
    "GSI1SK": `TENANT#${TENANT_ID}`,
    "_type": "Tenant"
  },
  {
    "PK": `TENANT#${TENANT_ID_QA}`,
    "SK": "$",
    "id": TENANT_ID_QA,
    "name": "Test Tenant 2",
    "domain": "test-tenant-2.example.com",
    "districtId": "district-456",
    "GSI1PK": "ALL_TENANTS",
    "GSI1SK": `TENANT#${TENANT_ID_QA}`,
    "_type": "Tenant"
  },
  {
    "PK": `TENANT#${MANUAL_TENANT_ID}`,
    "SK": "$",
    "id": MANUAL_TENANT_ID,
    "name": "Manual Test Tenant",
    "domain": "manual-test-tenant.example.com",
    "districtId": "district-789",
    "GSI1PK": "ALL_TENANTS",
    "GSI1SK": `TENANT#${MANUAL_TENANT_ID}`,
    "_type": "Tenant"
  }
];

// Test data records to insert into DynamoDB. Don't include products, because
// they are maintained by scripts/update-product-records.ts.
const TEST_FOLDERS = [{
  "PK": `TENANT#${TENANT_ID}`,
  "SK": `FOLDER#01JWHACAKJADN5TFY137CGTWN8`,
  "accessType": "inbound",
  "created": 1745366014822,
  "GSI1PK": "ALL_FOLDERS",
  "GSI1SK": "PRODUCT#01JSFW74RNSF51QEDSP26VG9GR#FOLDER#01JWHACAKJADN5TFY137CGTWN8",
  "id": "01JWHACAKJADN5TFY137CGTWN8",
  "path": "/integration-test/scan-01jsfyqp57xqmthq915s0facgq",
  "_productCode": "PM", // PM product
  "tenantId": TENANT_ID,
  "updated": 1745366015600,
  "use": "Scan",
  "_type": "Folder"
},
{
  "PK": `TENANT#${TENANT_ID}`,
  "SK": "FOLDER#01JWHACPQ21TNWF77QDPN4C2T8",
  "accessType": "inbound",
  "created": 1745366014822,
  "GSI1PK": "ALL_FOLDERS",
  "GSI1SK": "PRODUCT#01JSFW74RNSF51QEDSP26VG9GR#FOLDER#01JWHACPQ21TNWF77QDPN4C2T8",
  "id": "01JWHACPQ21TNWF77QDPN4C2T8",
  "path": "/integration-test/qti-01jsfyqp57xqmthq915s0facgq",
  "_productCode": "PM", // PM product
  "tenantId": TENANT_ID,
  "updated": 1745366015600,
  "use": "QTI",
  "_type": "Folder"
},
{
  "PK": `TENANT#${TENANT_ID}`,
  "SK": "FOLDER#01JWHADHKFRVD14XDXJW6GPRNF",
  "accessType": "inbound",
  "created": 1745366014822,
  "GSI1PK": "ALL_FOLDERS",
  "GSI1SK": "PRODUCT#01JSFW74RNSF51QEDSP26VG9GR#FOLDER#01JWHADHKFRVD14XDXJW6GPRNF",
  "id": "01JWHADHKFRVD14XDXJW6GPRNF",
  "path": "/integration-test/enrollment-01jsfyqp57xqmthq915s0facgq",
  "_productCode": "PM", // PM product
  "tenantId": TENANT_ID,
  "updated": 1745366015600,
  "use": "Enrollment",
  "_type": "Folder"
}];

const TEST_DATA = [
  {
  "PK": "TENANT#99999999-9999-9999-9999-999999999999",
  "SK": "USER#01JRDJGXVW54S2NC76QHEB0KAC",
  "access": "readwrite",
  "authenticationType": "password",
  "email": "",
  "_productCode": "PM", // PM product
  "_folders": ["QTI"], // need to look these up
  "GSI1PK": "ALL_USERS",
  "GSI1SK": "USER#fredbleaux-do-not-modify",
  "id": "01JRDJGXVW54S2NC76QHEB0KAC",
  "ipWhitelist": [
    "1.2.3.4/30",
    "2.3.4.5/32",
    "52.205.140.168/32",
    "35.170.140.164/32",
    "52.33.154.13/32",
    "54.189.28.163/32"
  ],
  "lastLogin": 1744353329763,
  "name": "Fred Bleaux",
  "passwordHash": "$2a$10$1tOfE4NGGYnVMeXRIdoHk.1DQH.1ngHOxWgL3jTSXb6Jdquffzf4u",
  "tenantId": "99999999-9999-9999-9999-999999999999",
  "username": "fredbleaux-do-not-modify",
  "_type": "User"
},
{
  "PK": `TENANT#${TENANT_ID}`,
  "SK": "USER#01JRDJ7YJN1QD1F49CNYYVSZ8Q",
  "access": "readwrite",
  "authenticationType": "password",
  "email": "",
  "_productCode": "PM", // PM product
  "_folders": ["Enrollment"], // need to look these up
  "GSI1PK": "ALL_USERS",
  "GSI1SK": "USER#bobbleaux-do-not-modify",
  "id": "01JRDJ7YJN1QD1F49CNYYVSZ8Q",
  "ipWhitelist": [
    "52.205.140.168/32",
    "35.170.140.164/32",
    "52.33.154.13/32",
    "54.189.28.163/32"
  ],
  "lastLogin": 1744353330113,
  "name": "Bob Bleaux",
  "passwordHash": "$2a$10$rs0tai/g4vMsOHtWeMwkaeQFKJNoKM.LMqn9OKr9N1Yzrwa3oda1y",
  "tenantId": TENANT_ID,
  "username": "bobbleaux-do-not-modify",
  "_type": "User"
},
{
  "PK": `TENANT#${TENANT_ID}`,
  "SK": "USER#01JRDJ7YJN1QD234234SDJDFSD",
  "access": "read",
  "authenticationType": "password",
  "email": "",
  "_productCode": "PM", // PM product
  "_folders": ["Enrollment"], // need to look these up
  "GSI1PK": "ALL_USERS",
  "GSI1SK": "USER#bobbleauxro-do-not-modify",
  "id": "01JRDJ7YJN1QD234234SDJDFSD",
  "ipWhitelist": [
    "52.205.140.168/32",
    "35.170.140.164/32",
    "52.33.154.13/32",
    "54.189.28.163/32"
  ],
  "name": "Bob Bleaux R/O",
  "passwordHash": "$2a$10$rs0tai/g4vMsOHtWeMwkaeQFKJNoKM.LMqn9OKr9N1Yzrwa3oda1y",
  "tenantId": TENANT_ID,
  "username": "bobbleauxro-do-not-modify",
  "_type": "User"
},
{
  "PK": `TENANT#${TENANT_ID}`,
  "SK": "USER#01JRDJ7YJN1QD234234SD240923490",
  "access": "write",
  "email": "",
  "_productCode": "PM", // PM product
  "_folders": ["Enrollment"], // need to look these up
  "GSI1PK": "ALL_USERS",
  "GSI1SK": "USER#bobbleauxwo-do-not-modify",
  "id": "01JRDJ7YJN1QD234234SD240923490",
  "ipWhitelist": [
    "52.205.140.168/32",
    "35.170.140.164/32",
    "52.33.154.13/32",
    "54.189.28.163/32"
  ],
  "name": "Bob Bleaux W/O",
  "authenticationType": "password",
  "passwordHash": "$2a$10$rs0tai/g4vMsOHtWeMwkaeQFKJNoKM.LMqn9OKr9N1Yzrwa3oda1y",
  "tenantId": TENANT_ID,
  "username": "bobbleauxwo-do-not-modify",
  "_type": "User"
},
{
  "PK": `TENANT#${TENANT_ID}`,
  "SK": "USER#01JRDJXYAR5FAT75K5SA6H4E4F",
  "access": "readwrite",
  "authenticationType": "SSH key",
  "email": "",
  "_productCode": "PM", // PM product
  "_folders": ["Scan"], // need to look these up
  "GSI1PK": "ALL_USERS",
  "GSI1SK": "USER#bobpublic-do-not-modify",
  "id": "01JRDJXYAR5FAT75K5SA6H4E4F",
  "ipWhitelist": [
    "52.205.140.168/32",
    "35.170.140.164/32",
    "52.33.154.13/32",
    "54.189.28.163/32"
  ],
  "lastLogin": 1744353329874,
  "name": "Bob Public",
  "publicKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDEQlHnKR0w+7zaJvdAZ+BQ6l+CXmV+YEAlBzfT+lYrwn8RePmXOgtu7TWc/+hMc5o+HO5iLA11eUsJKA6kA2DsUfLk9P3wJ+k+w3St7+GrQ4JlsNoUhdZlKzJ9Q6wl+T8w86//BIIgOftX+dcomVKIwUbLntHTKXHLS3NYNT9YcbSN5jKQipY1yKI6HKot2fXldB7jlmD1sas31pgnXZjEIIXp14vi9LFyFctUsSPvELFsweEZp/12pxO8YzvDSeoqHOUKD8tWb8USNXGvgrfh5l7pmAfcjs1Ai8+sB5bgn2L+Sy/MCWPdqYi5AsvSWmzcoMmFVf7H6RdCGxMWqAVpDu0RgT7DsZ6boMHd1E5bBq0jDqSFXsIVGg4bJUrV76YxjGh7+EcsRHHOv+zuI0T5olcwkN27jBwA6syisPMYh85MfzFx6aXlglDBC4SzESZxgQbbE+vkYFN1rtdc+pJdwuXdD7Zpwd4vDMl6ZE/flnbT3Hxuvi8iW+l/lsdYvxs=",
  "tenantId": TENANT_ID,
  "username": "bobpublic-do-not-modify",
  "_type": "User"
},
{
  "PK": `TENANT#${TENANT_ID}`,
  "SK": "USER#01JRDNB23P555AP737JVCJDW0S",
  "access": "readwrite",
  "authenticationType": "SSH key",
  "email": "",
  "_productCode": "PM", // PM product
  "_folders": ["Enrollment"], // need to look these up
  "GSI1PK": "ALL_USERS",
  "GSI1SK": "USER#louis-do-not-modify",
  "id": "01JRDNB23P555AP737JVCJDW0S",
  "name": "louis-do-not-modify Maresca",
  "publicKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDEQlHnKR0w+7zaJvdAZ+BQ6l+CXmV+YEAlBzfT+lYrwn8RePmXOgtu7TWc/+hMc5o+HO5iLA11eUsJKA6kA2DsUfLk9P3wJ+k+w3St7+GrQ4JlsNoUhdZlKzJ9Q6wl+T8w86//BIIgOftX+dcomVKIwUbLntHTKXHLS3NYNT9YcbSN5jKQipY1yKI6HKot2fXldB7jlmD1sas31pgnXZjEIIXp14vi9LFyFctUsSPvELFsweEZp/12pxO8YzvDSeoqHOUKD8tWb8USNXGvgrfh5l7pmAfcjs1Ai8+sB5bgn2L+Sy/MCWPdqYi5AsvSWmzcoMmFVf7H6RdCGxMWqAVpDu0RgT7DsZ6boMHd1E5bBq0jDqSFXsIVGg4bJUrV76YxjGh7+EcsRHHOv+zuI0T5olcwkN27jBwA6syisPMYh85MfzFx6aXlglDBC4SzESZxgQbbE+vkYFN1rtdc+pJdwuXdD7Zpwd4vDMl6ZE/flnbT3Hxuvi8iW+l/lsdYvxs=",
  "tenantId": TENANT_ID,
  "username": "louis-do-not-modify",
  "_type": "User"
},
{
  "PK": `TENANT#${TENANT_ID}`,
  "SK": "USER#01JRDNB23P555AP73DJKLSDF0234",
  "access": "readwrite",
  "email": "",
  "_productCode": "PM", // PM product
  "_folders": ["Enrollment", "QTI"], // need to look these up
  "GSI1PK": "ALL_USERS",
  "GSI1SK": "USER#bobtwodir-do-not-modify",
  "id": "01JRDNB23P555AP73DJKLSDF0234",
  "name": "Bob Two Directory",
  "tenantId": TENANT_ID,
  "username": "bobtwodir-do-not-modify",
  "authenticationType": "password",
  "passwordHash": "$2a$10$rs0tai/g4vMsOHtWeMwkaeQFKJNoKM.LMqn9OKr9N1Yzrwa3oda1y",
  "_type": "User"
},
{
  "PK": `TENANT#${TENANT_ID}`,
  "SK": "USER#01JRDVF65C926C5YSYXAC756K2",
  "access": "readwrite",
  "active": false,
  "authenticationType": "SSH key",
  "email": "",
  "_productCode": "PM", // PM product
  "_folders": ["Scan"], // need to look these up
  "GSI1PK": "ALL_USERS",
  "GSI1SK": "USER#bob2-do-not-modify",
  "id": "01JRDVF65C926C5YSYXAC756K2",
  "name": "Public 2",
  "publicKey": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDEQlHnKR0w+7zaJvdAZ+BQ6l+CXmV+YEAlBzfT+lYrwn8RePmXOgtu7TWc/+hMc5o+HO5iLA11eUsJKA6kA2DsUfLk9P3wJ+k+w3St7+GrQ4JlsNoUhdZlKzJ9Q6wl+T8w86//BIIgOftX+dcomVKIwUbLntHTKXHLS3NYNT9YcbSN5jKQipY1yKI6HKot2fXldB7jlmD1sas31pgnXZjEIIXp14vi9LFyFctUsSPvELFsweEZp/12pxO8YzvDSeoqHOUKD8tWb8USNXGvgrfh5l7pmAfcjs1Ai8+sB5bgn2L+Sy/MCWPdqYi5AsvSWmzcoMmFVf7H6RdCGxMWqAVpDu0RgT7DsZ6boMHd1E5bBq0jDqSFXsIVGg4bJUrV76YxjGh7+EcsRHHOv+zuI0T5olcwkN27jBwA6syisPMYh85MfzFx6aXlglDBC4SzESZxgQbbE+vkYFN1rtdc+pJdwuXdD7Zpwd4vDMl6ZE/flnbT3Hxuvi8iW+l/lsdYvxs=",
  "tenantId": TENANT_ID,
  "username": "bob2-do-not-modify",
  "_type": "User"
}];

async function writeFolderRecords(props: {tableName: string, Product: any, Folder: any, documentClient: DynamoDB.DocumentClient}): Promise<void> {
  const { tableName, Product, documentClient } = props;

  console.log(`Writing ${TEST_FOLDERS.length} folder records to DynamoDB table ${tableName}...`);
    
  // Need to look up products
  const allProducts: any[] = await Product.find({
    GSI1PK: 'ALL_PRODUCTS'
  }, { index: 'GSI1' });

  // Process each test folder record
  for (const _item of TEST_FOLDERS) {
    console.log(`Writing folder item with PK=${_item.PK}, SK=${_item.SK}...`);

    const { _productCode, ...item } = _item;

    // Look up product
    const product = allProducts.find((p: any) => p.productCode === _productCode);
    if (!product) {
      console.error(`Product ${_productCode} not found`);
      throw new Error(`Product ${_productCode} not found`);
    }
    
    // Set the productId based on the product lookup
    (item as any).productId = product.id;
    
    // Update GSI1SK to include the correct productId
    (item as any).GSI1SK = `PRODUCT#${product.id}#FOLDER#${item.id}`;
    
    // Add source property - basename of the current file
    (item as any).source = 'write-test-data.ts folder';

    // Use put operation to insert/update the item
    await documentClient.put({
      TableName: tableName,
      Item: item
    }).promise();
    
    console.log(`Successfully wrote folder item with PK=${item.PK}, SK=${item.SK}`);
    
    // Pre-create the folder in S3
    const tenantId = item.tenantId;
    const folderPath = item.path;
    const packageName = 'power-ftp';
    const envName = process.env.PS_ENVIRONMENT || cleanName(await getBranch());
    const cleanEnvName = cleanName(envName, true);
    const namespace = getNamespace(envName);
  
    for (const bucketName of [
      `${packageName}-${cleanEnvName}-${_productCode.toLowerCase()}-int`,
      `${packageName}-${cleanEnvName}-${_productCode.toLowerCase()}-ext`]) {
        console.log(`Pre-creating S3 folder in bucket ${bucketName} for tenant ${tenantId} and path ${folderPath}...`);
        await ensureSubfoldersExist(bucketName, tenantId, [folderPath]);
        console.log(`Successfully pre-created S3 folder in bucket ${bucketName}`);
    }
  }
}

async function writeUserRecords(props: {tableName: string, Product: any, Folder: any, documentClient: DynamoDB.DocumentClient}): Promise<void> {
  const { tableName, Product, Folder, documentClient } = props;

  console.log(`Writing ${TEST_DATA.length} user records to DynamoDB table ${tableName}...`);
    
  // Need to look up product and folders
  const allProducts: any[] = await Product.find({
    GSI1PK: 'ALL_PRODUCTS' 
  }, { index: 'GSI1' });

  const allFolders = await Folder.find({
    tenantId: TENANT_ID,
  });
  console.log(`Found ${allFolders.length} folders for tenantId ${TENANT_ID}`);
  
  // Process each test data record
  for (const _item of TEST_DATA) {
    console.log(`Writing user item with PK=${_item.PK}, SK=${_item.SK}...`);

    const { _productCode, _folders, ...item } = _item;

    // Look up product and folders
    const product = allProducts.find((p: any) => p.productCode === _productCode);
    if (!product) {
      console.error(`Product ${_productCode} not found`);
      throw new Error(`Product ${_productCode} not found`);
    }
    (item as any).productId = product.id;

    const folders = allFolders.filter((f: {use: string, active?: boolean, expires?: number, path: string}) =>
      _folders.some((_f) => f.use === _f) &&
      f.path.startsWith(`/integration-test/`) && // Ensure path starts with the right prefix
      (f.active !== false) && // Only include folders that are active (undefined or true)
      (!f.expires || f.expires === 0) // Only include folders with no expires value or expires = 0
    );
    if (!folders.length) {
      console.error(`Folders ${_folders} for product ${_productCode} not found or all are inactive/expired`);
      throw new Error(`Folders ${_folders} for product ${_productCode} not found or all are inactive/expired`);
    } else if (folders.length !== _folders.length) {
      console.error(`Found wrong number of folders ${JSON.stringify(folders)} for product ${_productCode}. Should only be ${_folders.length}!`);
      throw new Error(`Found wrong number of folders ${JSON.stringify(folders)} for product ${_productCode}. Should only be ${_folders.length}!`);
    }

    console.log(`Found user folders ${JSON.stringify(folders)} for product ${_productCode}`);

    (item as any).folders = folders.map((f: {id: string}) => f.id);

    // Add source property - basename of the current file
    (item as any).source = 'write-test-data.ts user';
    
    // Use put operation to insert/update the item
    await documentClient.put({
      TableName: tableName,
      Item: item
    }).promise();
    
    console.log(`Successfully wrote user item: ${JSON.stringify(item, null, 2)}`);
  }
}

async function writeTenantRecords(props: {tableName: string, documentClient: DynamoDB.DocumentClient, Product: any, TenantProduct: any}): Promise<void> {
  const { tableName, documentClient, Product, TenantProduct } = props;

  console.log(`Writing ${TEST_TENANTS.length} tenant records to DynamoDB table ${tableName}...`);
    
  // Process each test tenant record
  for (const _item of TEST_TENANTS) {
    console.log(`Writing tenant item with PK=${_item.PK}, SK=${_item.SK}...`);

    const { _type, ...item } = _item;

    // Add source property - basename of the current file
    (item as any).source = 'write-test-data.ts tenant';
    
    // Use put operation to insert/update the item
    await documentClient.put({
      TableName: tableName,
      Item: item
    }).promise();
    
    console.log(`Successfully wrote tenant item with PK=${item.PK}, SK=${item.SK}`);
  }
  
  // Get environment name and namespace to determine which products are supported
  const envName = process.env.PS_ENVIRONMENT || cleanName(await getBranch());
  const namespace = getNamespace(envName);
  console.log(`Getting products for namespace: ${namespace}`);
  
  // Import account-env to get the products for this namespace
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  
  // Find the environment configuration that matches the current environment name
  const envConfig = Object.values(accountEnvProps).find((env) =>
    env.names && env.names.includes(namespace)
  );
  
  if (!envConfig || !envConfig.products) {
    console.warn(`No product configuration found for environment ${namespace}`);
    return;
  }
  
  console.log(`Found product configuration for environment ${namespace}`);
  
  // Get all products from the database
  const allProducts: any[] = await Product.find({
    GSI1PK: 'ALL_PRODUCTS'
  }, { index: 'GSI1' });
  
  console.log(`Found ${allProducts.length} products in the database`);
  
  // For each tenant, create TenantProduct records for each product
  for (const tenant of TEST_TENANTS) {
    const tenantId = tenant.id;
    console.log(`Creating TenantProduct records for tenant ${tenantId}`);
    
    // For each product in the database, check if it's supported in this environment
    for (const product of allProducts) {
      const productCode = product.productCode;
      const productId = product.id;
      
      // Check if this product is configured for this environment
      if (envConfig.products[productCode]) {
        console.log(`Creating TenantProduct record for tenant ${tenantId} and product ${productCode} (${productId})`);
        
        // Create TenantProduct record
        const tenantProduct = {
          tenantId,
          productId,
          productCode,
          active: true,
          source: 'write-test-data.ts tenant product',
        };
        
        try {
          await TenantProduct.create(tenantProduct);
          console.log(`Successfully created TenantProduct for tenant ${tenantId} and product ${productCode}`);
        } catch (error) {
          console.error(`Error creating TenantProduct for tenant ${tenantId} and product ${productCode}:`, error);
        }
      }
    }
  }
}

/**
 * Main function to write test data to DynamoDB
 */
async function writeTestData(): Promise<void> {
  try {
    // Get environment name from PS_ENVIRONMENT or current branch
    const envName = process.env.PS_ENVIRONMENT || cleanName(await getBranch());
    const cleanEnvName = cleanName(envName, true);
    console.log(`Environment name: ${envName}`);

    // Derive namespace from environment name
    const namespace = getNamespace(envName);
    console.log(`Namespace: ${namespace}`);

    // Get package name from package.json
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '../package.json'), 'utf-8')
    );
    const packageName = cleanName(packageJson.name);
    console.log(`Package name: ${packageName}`);

    // Determine table name based on package name and namespace
    const tableName = `${packageName}-${cleanEnvName}`;
    console.log(`Table name: ${tableName}`);

    // Initialize DynamoDB DocumentClient
    const documentClient = new DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    process.env.APP_TABLE_NAME = tableName;

    // Now that APP_TABLE_NAME is set, we can import db-schema
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Product, User, Folder, Tenant, TenantProduct } = require('../src/util/db-schema');

    // First write tenant records
    await writeTenantRecords({
      tableName,
      documentClient,
      Product,
      TenantProduct
    });

    // Then write folder records
    await writeFolderRecords({
      tableName,
      Product,
      Folder,
      documentClient
    });

    // Finally write user records
    await writeUserRecords({
      tableName,
      Product,
      Folder,
      documentClient
    });

    console.log('Test data writing complete!');
  } catch (error) {
    console.error('Error writing test data:', error);
    process.exit(1);
  }
}

// Execute the function
writeTestData().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
