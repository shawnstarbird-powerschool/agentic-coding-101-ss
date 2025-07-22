// eslint-disable-next-line max-classes-per-file
import { Logger } from '@aws-lambda-powertools/logger';
import {
  Folder,
  FolderType,
  Product,
  ProductType,
  TransferLog,
  TransferLogType
} from './db-schema';

// Initialize Logger
const logger = new Logger({ serviceName: 'db-utils' });

export class FolderNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FolderNotFoundError';
  }
}

export interface TransferFamilyEvent {
  version: string; // '0';
  id: string; // 'd232c159-59ed-7a4e-7b20-1297f16d0d90';
  'detail-type': string; // 'SFTP Server File Upload Completed';
  source: string; // 'aws.transfer';
  account: string; // '383701092366';
  time: string; // '2025-06-03T17:11:07Z';
  region: string; // 'us-east-1';
  resources: string[]; // [ 'arn:aws:transfer:us-east-1:383701092366:server/s-ccbbd58bb48140b09' ];
  detail: {
    'status-code': string; // 'COMPLETED';
    protocol: string; // 'SFTP';
    bytes: number; // 3412677;
    'client-ip': string; // '52.205.140.168';
    'end-timestamp': string; // '2025-06-03T17:11:07.832234304Z';
    etag: string; // '0b1f4fa3b23c325f77bba665c6c79e92';
    'file-path': string; // '/power-ftp-dev-dev-clnst-8059-s-pm-ext/88888888-8888-8888-8888-888888888888/integration-test/scan-01jsfyqp57xqmthq915s0facgq/prodrag.csv';
    'server-id': string; // 's-ccbbd58bb48140b09';
    username: string; // 'bobpublic-do-not-modify';
    'session-id': string; // '0292f1e12f20d1a2eddc';
    'start-timestamp': string; // '2025-06-03T17:11:07.611785735Z';
  };
}

export async function createTransferEventTransferLog(
  transferRecord: TransferFamilyEvent
): Promise<TransferLogType | undefined> {
  const fileName = transferRecord.detail['file-path'];
  const [sourceBucket, sourceKey] = fileName.split('/', 2);
  const keyParts = sourceKey.split('/');
  const tenantId = keyParts[0] || 'unknown';
  const direction = 'inbound'; // Assuming inbound for Transfer Family events
  const sourceIPAddress = transferRecord.detail['client-ip'];
  const principalId = transferRecord.detail.username || 'unknown';

  logger.info('createTransferEventTransferLog', {
    transferRecord,
    sourceBucket,
    sourceKey,
    tenantId
  });

  // Create the TransferLog record
  const transferLog = await TransferLog.create({
    sourceIPAddress,
    principalId,
    tenantId,
    fileName,
    direction,
    sourceRecord: transferRecord,
    startedAt: new Date(),
    status: 'in-progress',
    source: 'db-utils.ts'
  });

  logger.info('Created TransferLog record', {
    tenantId,
    fileName,
    direction
  });

  return transferLog;
}

/**
 * Create a TransferLog record for a file transfer
 * @param s3Record The original S3 record from the event
 * @param direction The transfer direction ('inbound' or 'outbound')
 */
export async function createS3TransferLog(
  s3Record: any,
  direction: 'inbound' | 'outbound'
): Promise<TransferLogType | undefined> {
  try {
    logger.info('Creating TransferLog record', {
      direction,
      s3Record
    });

    // Extract the bucket name and object key
    const bucket = s3Record.s3.bucket.name;
    const key = decodeURIComponent(s3Record.s3.object.key.replace(/\+/g, ' '));

    // Extract tenantId from the first part of the key (up to the first '/')
    const keyParts = key.split('/');
    const tenantId = keyParts[0] || 'unknown';

    // Get sourceIPAddress and principalId from the event
    const sourceIPAddress =
      s3Record.requestParameters?.sourceIPAddress || '0.0.0.0';
    const principalId = s3Record.userIdentity?.principalId || 'unknown';

    // Create the full fileName as bucket + '/' + key
    const fileName = `${bucket}/${key}`;

    // Create the TransferLog record
    const transferLog = await TransferLog.create({
      sourceIPAddress,
      principalId,
      tenantId,
      fileName,
      direction,
      sourceRecord: s3Record,
      startedAt: new Date(),
      status: 'in-progress',
      source: 'db-utils.ts'
    });

    logger.info('Created TransferLog record', {
      tenantId,
      fileName,
      direction
    });

    return transferLog;
  } catch (error) {
    // Log the error but don't fail the transfer if logging fails
    logger.error('Failed to create TransferLog record', { error });
    return undefined;
  }
}

export async function getProductFolders(props: {
  tenantId: string;
  product: ProductType;
  activeOnly?: boolean;
}): Promise<FolderType[]> {
  const { tenantId, product, activeOnly = false } = props;

  // Use the GSI1 index to find all folders for the product
  const folders = await Folder.find(
    {
      GSI1PK: 'ALL_FOLDERS',
      GSI1SK: { begins: `PRODUCT#${product.id}` }
    },
    { index: 'GSI1' }
  );

  // Filter folders by tenantId and optionally by active status
  const filteredFolders = folders.filter((folder) => {
    // Always filter by tenantId
    const tenantMatch = folder.tenantId === tenantId;

    // Only filter by active status if activeOnly is true
    if (activeOnly) {
      return tenantMatch && folder.active === true;
    }

    // Otherwise just return all folders for this tenant
    return tenantMatch;
  });

  logger.info('Filtered product folders', {
    productId: product.id,
    tenantId,
    activeOnly,
    totalFolders: folders.length,
    filteredFolders: filteredFolders.length
  });

  return filteredFolders;
}

export async function getProductAndFoldersById(props: {
  tenantId: string;
  productId: string;
  activeOnly?: boolean;
}): Promise<{
  product: ProductType;
  folders: FolderType[];
}> {
  const { tenantId, productId, activeOnly } = props;
  const product = await Product.get({ id: productId });
  if (!product) {
    logger.error('Product not found', { productId });
    throw new Error(`Product with ID ${productId} not found`);
  }

  // Get the folders for the product (include both active and inactive)
  const folders = await getProductFolders({
    tenantId,
    product,
    activeOnly
  });

  return { product, folders };
}

export async function getProductAndFoldersByCode(props: {
  tenantId: string;
  productCode: string;
}): Promise<{
  product: ProductType;
  folders: FolderType[];
}> {
  const { tenantId, productCode } = props;

  // Use the GSI1 index to find the product by product code
  const products = await Product.find(
    {
      GSI1PK: 'ALL_PRODUCTS'
    },
    { index: 'GSI1' }
  );

  // Get the product by its code
  const product = products.find((p) => p.productCode === productCode);
  if (!product) {
    logger.error('Product not found', { productCode });
    throw new Error(`Product with code ${productCode} not found`);
  }

  // Get the folders for the product (include both active and inactive)
  const folders = await getProductFolders({
    tenantId,
    product,
    activeOnly: false
  });

  return { product, folders };
}

export async function getFolderById(props: {
  tenantId: string;
  id: string;
}): Promise<FolderType> {
  const { tenantId, id } = props;

  logger.info('getFolderById: Fetching folder by ID', { tenantId, id });
  const folder = await Folder.get({ tenantId, id });
  if (!folder) {
    logger.error('Folder not found', { folderId: id });
    throw new FolderNotFoundError(`Folder with ID ${id} not found`);
  }
  return folder;
}

/**
 * Returns a Unix timestamp (seconds past the epoch) that is 30 days from now
 * Useful for setting expiration dates for tokens, sessions, etc.
 * @returns {number} Unix timestamp in seconds (not milliseconds)
 */
export function getExpirationTimestamp(): number {
  // Get current date
  const now = new Date();

  // Add 30 days
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  // Convert to Unix timestamp (seconds)
  // Date.getTime() returns milliseconds, so divide by 1000 to get seconds
  return Math.floor(thirtyDaysFromNow.getTime() / 1000);
}

export class ProductNotFoundError extends Error {
  constructor(productCode: string) {
    super(`Product with code ${productCode} not found`);
    this.name = 'ProductNotFoundError';
  }
}

/**
 * Get a product by its product code
 * @param productCode The product code to look up
 * @returns The product object if found, exception otherwise
 */
export async function getProductByCode(
  productCode: string
): Promise<ProductType> {
  // Use the GSI1 index to find all products
  const products = await Product.find(
    {
      GSI1PK: 'ALL_PRODUCTS'
    },
    { index: 'GSI1' }
  );

  // Find the product with the matching product code
  const product = products.find((p) => p.productCode === productCode);
  if (!product) {
    logger.error('Product not found', { productCode });
    throw new ProductNotFoundError(productCode);
  }
  return product;
}
