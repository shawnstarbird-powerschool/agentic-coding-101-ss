import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { cleanName, getBranch, getNamespace } from '@ps-refarch/cdk-utils';
import { readFileSync } from 'fs';
import { join } from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import accountEnvProps from '../src/account-env';
import { ProductConfig } from '../src/cdk/lib/main-stack-props';
import { DEFAULT_S3_PERMISSIONS } from '../src/cdk/lib/permanent-resources-stack';

// Constants for user authentication types (copied from db-schema.ts to avoid early import)
const USER_AUTH_TYPE_PASSWORD = 'password';
const USER_AUTH_TYPE_SSH_KEY = 'SSH key';

// Constant for multi-tenant products
const MULTITENANT_TENANT_ID = 'MULTITENANT';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .help()
  .parseSync();

/**
 * Main function to update product records in DynamoDB
 */
async function updateProductRecords(): Promise<void> {
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

    // Set the APP_TABLE_NAME environment variable before importing db-schema
    process.env.APP_TABLE_NAME = tableName;

    // Now that APP_TABLE_NAME is set, we can import db-schema
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Product, User, Folder } = require('../src/util/db-schema');
    
    // Get the account environment properties for the current namespace
    const namespaceEnvProps = Object.values(accountEnvProps).find(
      (props: any) => props.names && props.names.includes(namespace)
    );

    if (!namespaceEnvProps) {
      throw new Error(`Cannot find environment ${namespace} in account-env.ts`);
    }

    // Get product configurations for the current namespace
    const productConfigs = namespaceEnvProps.products || {};
    console.log(`Found ${Object.keys(productConfigs).length} products for namespace ${namespace}`);

    // Initialize S3 client
    const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

    // Process each product configuration
    for (const [productCode, config] of Object.entries(productConfigs)) {
      console.log(`\nProcessing product: ${productCode}`);
      
      // Multitenant products require a public key; single-tenant products cannot have one
      if (config.multiTenant && !config.productPublicKey) {
        throw new Error(
          `Product ${productCode} is multi-tenant but missing productPublicKey`
        );
      } else if (!config.multiTenant && config.productPublicKey) {
        throw new Error(
          `Product ${productCode} is single-tenant but has a productPublicKey`
        );
      }

      // Create or update the Product entity first to get the ID
      const productId = await updateProductEntity(Product, productCode, config);

      // Check if the product is multi-tenant
      const isMultiTenant = (config as any).multiTenant === true;
      
      if (isMultiTenant) {
        console.log(`Creating multi-tenant user and paths for product: ${productCode}`);
        
        // Create or update the User entity for this multi-tenant product
        await updateProductUserEntity(User, productCode, config, productId);
        
        // Create paths in the S3 bucket for multi-tenant product
        await createTenantPathsInS3(s3Client, packageName, cleanEnvName, productCode, config);
      } else {
        console.log(`Skipping user and path creation for single-tenant product: ${productCode}`);
      }
    }

    console.log('\nProduct records update complete!');
  } catch (error) {
    console.error('Error updating product records:', error);
    process.exit(1);
  }
}

/**
 * Create or update a Product entity in the database
 */
async function updateProductEntity(
  Product: any,
  productCode: string,
  config: ProductConfig
): Promise<string> {
  try {
    // Check if product already exists
    const existingProducts = await Product.find({ 
      GSI1PK: 'ALL_PRODUCTS' 
    }, { index: 'GSI1' });

    const existingProduct = existingProducts.find(
      (p: any) => p.productCode === productCode
    );

    if (existingProduct) {
      console.log(`Updating existing product: ${productCode}`);
      
      // Update the existing product
      const updatedProduct = await Product.update({
        id: existingProduct.id,
        name: config.name,
        productPublicKey: config.productPublicKey || '',
        multiTenant: config.multiTenant || false,
        accessAccounts: config.accessAccounts || [],
        permissions: config.permissions || DEFAULT_S3_PERMISSIONS,
        uses: config.uses || [],
      });
      
      console.log(`Successfully updated product: ${productCode}: ${JSON.stringify(updatedProduct)}`);
      return existingProduct.id
    } else {
      console.log(`Creating new product: ${productCode}`);
      
      // Create a new product
      const newProduct = await Product.create({
        productCode,
        name: config.name,
        productPublicKey: config.productPublicKey || '',
        multiTenant: config.multiTenant || false,
        accessAccounts: config.accessAccounts || [],
        permissions: config.permissions || DEFAULT_S3_PERMISSIONS,
        uses: config.uses || [],
      } as any);
      
      console.log(`Successfully created product: ${productCode} with ID: ${newProduct}`);
      return newProduct.id;
    }
  } catch (error) {
    console.error(`Error updating product ${productCode}:`, error);
    throw error;
  }
}

/**
 * Create or update a User entity for a multi-tenant product
 */
async function updateProductUserEntity(
  user: any, // Needs to be an any to avoid early import
  productCode: string, 
  config: any,
  productId: string
): Promise<void> {
  try {
    // User properties
    const username = `product-${productCode.toLowerCase()}`;
    
    // Check if user already exists for this tenant
    const existingUsers = await user.find({
      PK: `TENANT#${MULTITENANT_TENANT_ID}`,
      SK: { begins: 'USER#' }
    });

    const existingUser = existingUsers.find(
      (u: any) => u.username === username
    );

    // User properties - needs to be an any to avoid early import
    const userProps = {
      tenantId: MULTITENANT_TENANT_ID,
      username, // For multi-tenant products, username is just the product code
      name: `${productCode} Service Account`,
      email: '',
      authenticationType: USER_AUTH_TYPE_SSH_KEY,
      publicKey: config.productPublicKey || '',
      access: 'readwrite',
      active: true,
      isProductUser: true, // Mark as a product user,
      productId, // Refers to its own productId
    };

    if (existingUser) {
      console.log(`Updating existing user: ${username} for multi-tenant product`);
      
      // Update the existing user
      await user.update({
        id: (existingUser as any).id,
        ...userProps
      } as any);
      
      console.log(`Successfully updated user: ${username} for multi-tenant product`);
    } else {
      console.log(`Creating new user: ${username} for multi-tenant product`);
      
      // Create a new user
      const newUser = await user.create(userProps as any);
      
      console.log(`Successfully created user: ${username} with ID: ${(newUser as any).id} for multi-tenant product`);
    }
  } catch (error) {
    console.error(`Error updating user for multi-tenant product ${productCode}:`, error);
    throw error;
  }
}

/**
 * Create paths in the S3 bucket for multi-tenant products
 */
async function createTenantPathsInS3(
  s3Client: S3Client,
  packageName: string,
  cleanEnvName: string,
  productCode: string,
  config: any
): Promise<void> {
  try {
    // Construct the bucket names for internal and external buckets
    const internalBucketName = `${packageName}-${cleanEnvName}-${productCode.toLowerCase()}-int`;
    const externalBucketName = `${packageName}-${cleanEnvName}-${productCode.toLowerCase()}-ext`;
    console.log(`Creating paths in buckets: ${internalBucketName} and ${externalBucketName} for multi-tenant product: ${productCode}`);

    // Create a placeholder object to establish the root directory
    const placeholderKey = `.placeholder`;
    
    // Create path in internal bucket
    await createPlaceholderInBucket(s3Client, internalBucketName, placeholderKey);
    
    // Create path in external bucket
    await createPlaceholderInBucket(s3Client, externalBucketName, placeholderKey);
  } catch (error) {
    console.error(
      `Error creating paths in S3 for multi-tenant product ${productCode}:`,
      { error }
    );
    throw error;
  }
}

/**
 * Create a placeholder file in the specified bucket
 */
async function createPlaceholderInBucket(
  s3Client: S3Client,
  bucketName: string,
  placeholderKey: string
): Promise<void> {
  try {
    // Check if the placeholder already exists
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: placeholderKey
      })
    );

    console.log(`Path already exists in bucket: ${bucketName}`);
  } catch (error) {
    // If the object doesn't exist, create it
    if ((error as any).name === 'NotFound') {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: placeholderKey,
          Body: 'This is a placeholder file to establish the directory structure.',
          ContentType: 'text/plain'
        })
      );

      console.log(`Successfully created path in bucket: ${bucketName}`);
    } else {
      // If it's another error, throw it
      throw error;
    }
  }
}

/**
 * Create or update Folder entities for a product
 */
// Deleted - folders are not linked to products, they are linked to districts. Products and
// folders are linked through the use in the folder and product entity.
// async function updateProductFolders(
//   Folder: any,
//   productId: string,
//   folders: { name: string; path: string }[]
// ): Promise<string[]> {
//   try {
//     console.log(`Updating folders for product ID: ${productId}`);
    
//     // Get existing folders for this product
//     const existingFolders = await Folder.find({
//       PK: `PRODUCT#${productId}`
//     });

//     console.log(`Found ${existingFolders.length} existing folders for product ID: ${productId}`);
    
//     // Array to collect folder IDs
//     const folderIds: string[] = [];
    
//     // Process each folder in the configuration
//     for (const folder of folders) {
//       const existingFolder = existingFolders.find(
//         (f: any) => f.path === folder.path
//       );

//       if (existingFolder) {
//         // Update existing folder if name changed
//         if (existingFolder.name !== folder.name) {
//           await Folder.update({
//             id: existingFolder.id,
//             productId,
//             name: folder.name,
//             path: folder.path
//           });
//           console.log(`Updated folder: ${folder.name} with path ${folder.path}`);
//         } else {
//           console.log(`Folder already exists with name: ${folder.name} and path: ${folder.path}`);
//         }
//         // Add existing folder ID to the array
//         folderIds.push(existingFolder.id);
//       } else {
//         // Create new folder
//         const newFolder = await Folder.create({
//           productId,
//           name: folder.name,
//           path: folder.path
//         });
//         console.log(`Created folder: ${folder.name} with path ${folder.path}, ID: ${newFolder.id}`);
//         folderIds.push(newFolder.id);
//       }
//     }

//     // Remove folders that no longer exist in the configuration
//     for (const existingFolder of existingFolders) {
//       const folderStillExists = folders.some(
//         (f) => f.path === existingFolder.path
//       );
//       if (!folderStillExists) {
//         await Folder.remove({
//           id: existingFolder.id
//         });
//         console.log(`Removed folder: ${existingFolder.name} with path ${existingFolder.path}`);
//       }
//     }
    
//     return folderIds;
//   } catch (error) {
//     console.error(`Error updating folders for product ${productId}:`, error);
//     throw error;
//   }
// }

// /**
//  * Update a Product entity with folder IDs
//  */
// async function updateProductWithFolderIds(
//   Product: any,
//   productId: string,
//   folderIds: string[]
// ): Promise<void> {
//   try {
//     console.log(`Updating product ${productId} with ${folderIds.length} folder IDs`);
    
//     await Product.update({
//       id: productId,
//       folders: folderIds
//     });
    
//     console.log(`Successfully updated product ${productId} with folder IDs`);
//   } catch (error) {
//     console.error(`Error updating product ${productId} with folder IDs:`, error);
//     throw error;
//   }
// }

// Run the main function
updateProductRecords()
  .then(() => {
    console.log('Script completed successfully');
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });