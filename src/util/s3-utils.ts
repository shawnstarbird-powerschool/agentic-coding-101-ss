import { Logger } from '@aws-lambda-powertools/logger';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectTaggingCommand,
  HeadObjectCommand,
  PutObjectCommand,
  PutObjectTaggingCommand,
  S3Client,
  Tag
} from '@aws-sdk/client-s3';
import { SQSEvent } from 'aws-lambda';
import { Readable } from 'stream';
// import sharp from 'sharp';

// Initialize Logger
const logger = new Logger({ serviceName: 's3-utils' });

// Initialize S3 client
const s3Client = new S3Client({});

/**
 * Interface for S3 event notification from SQS
 */
export interface S3EventNotification {
  bucket: string;
  key: string;
  eventName: string;
  eventTime: string;
  size?: number;
}

/**
 * Interface for file transfer options
 */
export interface FileTransferOptions {
  removeExif?: boolean;
  deleteSource?: boolean;
}

/**
 * Parse SQS event to extract S3 event notifications
 * @param event SQS event from Lambda trigger
 * @returns Array of S3 event notifications
 */
export function parseS3EventsFromSQS(event: SQSEvent): S3EventNotification[] {
  const s3Events: S3EventNotification[] = [];

  event.Records.forEach((record) => {
    try {
      const body = JSON.parse(record.body);

      // Handle direct S3 event notifications
      if (body.Records && Array.isArray(body.Records)) {
        body.Records.forEach((s3Record: any) => {
          if (s3Record.eventSource === 'aws:s3' && s3Record.s3) {
            s3Events.push({
              bucket: s3Record.s3.bucket.name,
              key: decodeURIComponent(
                s3Record.s3.object.key.replace(/\+/g, ' ')
              ),
              eventName: s3Record.eventName,
              eventTime: s3Record.eventTime,
              size: s3Record.s3.object.size
            });
          }
        });
      }
    } catch (error) {
      logger.error('Error parsing SQS message', { error });
      logger.error('SQS message body', { body: record.body });
    }
  });

  return s3Events;
}

/**
 * Check if an S3 object has a specific tag
 * @param bucket S3 bucket name
 * @param key S3 object key
 * @param tagName Tag name to check
 * @param tagValue Tag value to check
 * @returns True if the object has the specified tag with the specified value
 */
export async function hasS3ObjectTag(
  bucket: string,
  key: string,
  tagName: string,
  tagValue: string
): Promise<boolean> {
  logger.debug('Checking for tag on object', {
    bucket,
    key,
    tagName,
    tagValue
  });

  const response = await s3Client.send(
    new GetObjectTaggingCommand({
      Bucket: bucket,
      Key: key
    })
  );

  logger.debug('Retrieved object tags', {
    bucket,
    key,
    tags: response.TagSet
  });

  if (response.TagSet) {
    return response.TagSet.some(
      (tag) => tag.Key === tagName && tag.Value === tagValue
    );
  }
  return false;
}

/**
 * Add a tag to an S3 object
 * @param bucket S3 bucket name
 * @param key S3 object key
 * @param tagName Tag name
 * @param tagValue Tag value
 */
export async function addS3ObjectTag(
  bucket: string,
  key: string,
  tagName: string,
  tagValue: string
): Promise<void> {
  // First get existing tags
  let existingTags: Tag[] = [];
  const taggingResponse = await s3Client.send(
    new GetObjectTaggingCommand({
      Bucket: bucket,
      Key: key
    })
  );
  existingTags = taggingResponse.TagSet || [];

  // Filter out any existing tag with the same name
  const filteredTags = existingTags.filter((tag) => tag.Key !== tagName);
  // Add the new tag
  filteredTags.push({ Key: tagName, Value: tagValue });

  // Update the object with the new tag set
  await s3Client.send(
    new PutObjectTaggingCommand({
      Bucket: bucket,
      Key: key,
      Tagging: {
        TagSet: filteredTags
      }
    })
  );
  logger.info('Added tag to object', {
    bucket,
    key,
    tagName,
    tagValue
  });
}

/**
 * Remove EXIF metadata from an image file
 * @param imageBuffer Image buffer
 * @returns Buffer with EXIF data removed
 */
// export async function removeExifMetadata(imageBuffer: Buffer): Promise<Buffer> {
//   // Use sharp to strip metadata
//   return sharp(imageBuffer)
//     .withMetadata({ exif: {} }) // Empty exif object removes all EXIF data
//     .toBuffer();
// }

/**
 * Delete an S3 object
 * @param bucket S3 bucket name
 * @param key S3 object key
 */
export async function deleteS3Object(
  bucket: string,
  key: string
): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    })
  );
  logger.info('Deleted object', { bucket, key });
}

/**
 * Check if a file is an image based on its key/extension
 * @param key S3 object key
 * @returns True if the file appears to be an image
 */
export function isImageFile(key: string): boolean {
  const imageExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.tiff',
    '.webp'
  ];
  const lowerKey = key.toLowerCase();
  return imageExtensions.some((ext) => lowerKey.endsWith(ext));
}

/**
 * Copy a file from one S3 bucket to another
 * @param sourceBucket Source bucket name
 * @param sourceKey Source object key
 * @param destinationBucket Destination bucket name
 * @param destinationKey Destination object key (defaults to sourceKey if not provided)
 * @param options File transfer options
 * @returns Result of the file transfer operation
 */
export async function copyS3Object(
  sourceBucket: string,
  sourceKey: string,
  destinationBucket: string,
  destinationKey?: string,
  options: FileTransferOptions = {}
): Promise<void> {
  const destKey = destinationKey || sourceKey;

  logger.debug('Copying object', {
    sourceBucket,
    sourceKey,
    destinationBucket,
    destinationKey: destKey
  });

  // Get the source object
  const getObjectResponse = await s3Client.send(
    new GetObjectCommand({
      Bucket: sourceBucket,
      Key: sourceKey
    })
  );

  // Process the file content if needed
  let fileContent: Buffer;
  if (getObjectResponse.Body) {
    // Convert the readable stream to a buffer
    const chunks: Buffer[] = [];

    // Use a promise-based approach instead of for-await
    await new Promise<void>((resolve, reject) => {
      const stream = getObjectResponse.Body as Readable;

      stream.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      stream.on('end', () => resolve());
      stream.on('error', (err) => reject(err));
    });

    fileContent = Buffer.concat(chunks);

    // Remove EXIF metadata if requested and it's an image file
    // if (options.removeExif && isImageFile(sourceKey)) {
    //   logger.debug('Removing EXIF metadata', {
    //     sourceBucket,
    //     sourceKey
    //   });
    //   fileContent = await removeExifMetadata(fileContent);
    // }
  } else {
    throw new Error('Empty file body');
  }

  // Upload the processed file to the destination
  await s3Client.send(
    new PutObjectCommand({
      Bucket: destinationBucket,
      Key: destKey,
      Body: fileContent,
      ContentType: getObjectResponse.ContentType,
      ContentLength: fileContent.length
    })
  );

  logger.info('Copied object', {
    sourceBucket,
    sourceKey,
    destinationBucket,
    destinationKey: destKey
  });

  // Delete the source object if requested
  if (options.deleteSource) {
    await deleteS3Object(sourceBucket, sourceKey);
    logger.info('Deleted source object after copy', {
      sourceBucket,
      sourceKey
    });
  }
}

/**
 * Ensure user's home directory exists in S3
 * @param username Username
 */
export async function ensureUserHomeDirectoryExists(
  username: string
): Promise<void> {
  if (!process.env.TRANSFER_BUCKET_NAME) {
    throw new Error('TRANSFER_BUCKET_NAME environment variable is not set');
  }

  const bucketName = process.env.TRANSFER_BUCKET_NAME;
  const dirPath = `${username}/`;

  try {
    // Check if directory already exists
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: dirPath
      })
    );
    logger.info('Home directory already exists', { username });
  } catch (error) {
    // If directory doesn't exist, create it (empty object with trailing slash)
    logger.info('Creating home directory', { username });
    const emptyContent = '';
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: dirPath,
        Body: emptyContent,
        ContentLength: 0 // Explicitly set content length to avoid the warning
      })
    );
    logger.info('Home directory created', { username });
  }
}

/**
 * Checks if a folder exists in an S3 bucket
 * @param bucketName The name of the S3 bucket
 * @param folderPath The path of the folder to check (should end with a trailing slash)
 * @returns A promise that resolves to true if the folder exists, false otherwise
 */
export async function checkFolderExists(
  bucketName: string,
  folderPath: string
): Promise<boolean> {
  try {
    // Ensure the folder path ends with a slash
    const normalizedPath = folderPath.endsWith('/')
      ? folderPath
      : `${folderPath}/`;

    // Use HeadObject to check if the folder exists
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: normalizedPath
      })
    );

    logger.info('Folder exists in bucket', { bucketName, folderPath });
    return true;
  } catch (error) {
    if ((error as Error).name === 'NotFound') {
      logger.info('Folder does not exist in bucket', {
        bucketName,
        folderPath
      });
      return false;
    }

    // For other errors, log and re-throw
    logger.error('Error checking if folder exists:', {
      error,
      bucketName,
      folderPath
    });
    throw error;
  }
}

/**
 * Creates a folder in an S3 bucket
 * @param bucketName The name of the S3 bucket
 * @param folderPath The path of the folder to create (should end with a trailing slash)
 * @returns A promise that resolves when the folder is created
 */
export async function createFolder(
  bucketName: string,
  folderPath: string
): Promise<void> {
  try {
    // Ensure the folder path ends with a slash
    const normalizedPath = folderPath.endsWith('/')
      ? folderPath
      : `${folderPath}/`;

    // Create an empty object with the folder path as the key
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: normalizedPath,
        Body: '',
        ContentType: 'application/x-directory'
      })
    );

    logger.info('Successfully created folder in bucket', {
      bucketName,
      folderPath
    });
  } catch (error) {
    logger.error('Error creating folder:', { error, bucketName, folderPath });
    throw error;
  }
}

/**
 * Ensures multiple subfolders exist in an S3 bucket
 * @param bucketName The name of the S3 bucket
 * @param tenantId The tenant ID
 * @param folderPrefixes Array of folder prefixes
 * @returns A promise that resolves when all folders exist
 */
export async function ensureSubfoldersExist(
  bucketName: string,
  tenantId: string,
  folderPrefixes: string[]
): Promise<void> {
  // Process folders sequentially to avoid too many parallel requests
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < folderPrefixes.length; i++) {
    const prefix = folderPrefixes[i];
    const subFolderPath = `${tenantId}/${
      prefix.startsWith('/') ? prefix.slice(1) : prefix
    }`;

    // eslint-disable-next-line no-await-in-loop
    const subFolderExists = await checkFolderExists(bucketName, subFolderPath);

    if (!subFolderExists) {
      // eslint-disable-next-line no-await-in-loop
      await createFolder(bucketName, subFolderPath);
      logger.info('Created subfolder directory', {
        bucketName,
        subFolderPath
      });
    }
  }
}
