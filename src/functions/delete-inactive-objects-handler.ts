import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import { Folder, Product, User, UserType } from '../util/db-schema';
import { getBucketEnvName } from '../util/env-var-utils';
import { deleteS3Object } from '../util/s3-utils';

// Initialize Logger
const logger = new Logger({
  serviceName: 'cleanup-service',
  logLevel: process.env.LOG_LEVEL || ('INFO' as any)
});

// Initialize Tracer
const tracer = new Tracer({
  serviceName: 'cleanup-service'
});

/**
 * Find and delete inactive human users who meet any of the following criteria:
 * 1. Haven't logged in for six months
 * 2. Were created more than 6 months ago but never logged in
 * 3. Are marked as inactive (active=false) and haven't been updated in more than 30 days
 */
async function deleteInactiveUsers(): Promise<{
  totalDeleted: number;
  users: Array<{ id: string; username: string; tenantId: string }>;
}> {
  // Get all users
  const allUsers = await User.find(
    {
      GSI1PK: 'ALL_USERS'
    },
    { index: 'GSI1' }
  );

  logger.info(`Found ${allUsers.length} total users`);

  // Filter for human users only (not product users)
  const humanUsers = allUsers.filter((user) => !user.isProductUser);

  logger.info(`Found ${humanUsers.length} human users`);

  const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000; // approximately 6 months in milliseconds
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  const inactiveUsers: UserType[] = [];

  // Find inactive users
  // eslint-disable-next-line no-restricted-syntax
  for (const user of humanUsers) {
    // Check if user has never logged in and was created more than 6 months ago
    if (
      !user.lastLogin &&
      user.created &&
      new Date(user.created).getTime() < sixMonthsAgo
    ) {
      inactiveUsers.push(user);
    }
    // Or if user has logged in but the last login was more than 6 months ago
    else if (user.lastLogin && user.lastLogin < sixMonthsAgo) {
      inactiveUsers.push(user);
    }
    // Or if user is marked as inactive (active=false) and hasn't been updated in more than 30 days
    else if (
      user.active === false &&
      user.updated &&
      new Date(user.updated).getTime() < thirtyDaysAgo
    ) {
      inactiveUsers.push(user);
    }
  }

  logger.info(`Found ${inactiveUsers.length} inactive users to delete`);

  // Array to store information about deleted users for the return value
  const deletedUsers: Array<{
    id: string;
    username: string;
    tenantId: string;
  }> = [];

  // Delete each inactive user
  // eslint-disable-next-line no-restricted-syntax
  for (const user of inactiveUsers) {
    try {
      // Log the reason for deletion
      let inactivityReason = '';
      if (
        user.active === false &&
        user.updated &&
        new Date(user.updated).getTime() < thirtyDaysAgo
      ) {
        inactivityReason = `User is marked as inactive and hasn't been updated since ${new Date(
          user.updated
        ).toISOString()} which is more than 30 days ago`;
      } else if (!user.lastLogin && user.created) {
        inactivityReason = `User was created on ${user.created} but never logged in`;
      } else if (user.lastLogin) {
        inactivityReason = `User's last login was on ${new Date(
          user.lastLogin
        ).toISOString()} which is more than 6 months ago`;
      }

      logger.info('Deleting inactive user', {
        userId: user.id,
        username: user.username,
        tenantId: user.tenantId,
        reason: `Automatic deletion due to inactivity: ${inactivityReason}`
      });

      // Delete the user - this will trigger the DynamoDB stream
      // that automatically creates an audit record
      // eslint-disable-next-line no-await-in-loop
      await User.remove({ tenantId: user.tenantId, id: user.id });

      logger.info('Successfully deleted inactive user', {
        userId: user.id,
        username: user.username,
        tenantId: user.tenantId
      });

      // Store information about the deleted user
      deletedUsers.push({
        id: user.id,
        username: user.username,
        tenantId: user.tenantId
      });
    } catch (error) {
      logger.error('Failed to delete inactive user', {
        error,
        userId: user.id,
        username: user.username,
        tenantId: user.tenantId
      });
      // Continue with the next user even if there's an error
    }
  }

  return {
    totalDeleted: deletedUsers.length,
    users: deletedUsers
  };
}

/**
 * Find and delete inactive folders that haven't been updated for more than 30 days.
 * This will also delete the corresponding S3 "fake" zero-length objects that are used
 * to represent folders in the S3 console.
 */
async function deleteInactiveFolders(): Promise<{
  totalDeleted: number;
  folders: Array<{ id: string; path: string; tenantId: string }>;
}> {
  // Get all folders
  const allFolders = await Folder.find(
    {
      GSI1PK: 'ALL_FOLDERS'
    },
    { index: 'GSI1' }
  );

  logger.info(`Found ${allFolders.length} total folders`);

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  const inactiveFolders = allFolders.filter(
    (folder) =>
      folder.active === false &&
      folder.updated &&
      new Date(folder.updated).getTime() < thirtyDaysAgo
  );

  logger.info(`Found ${inactiveFolders.length} inactive folders to delete`);

  // Array to store information about deleted folders for the return value
  const deletedFolders: Array<{
    id: string;
    path: string;
    tenantId: string;
  }> = [];

  // Delete each inactive folder
  // eslint-disable-next-line no-restricted-syntax
  for (const folder of inactiveFolders) {
    try {
      const updatedDate = folder.updated
        ? new Date(folder.updated).toISOString()
        : 'unknown date';

      logger.info('Deleting inactive folder', {
        folderId: folder.id,
        folderPath: folder.path,
        tenantId: folder.tenantId,
        reason: `Automatic deletion due to inactivity: Folder is marked as inactive and hasn't been updated since ${updatedDate} which is more than 30 days ago`
      });

      // Get the bucket names
      // eslint-disable-next-line no-await-in-loop
      const product = await Product.get({ id: folder.productId });
      if (!product) {
        logger.warn('Product not found for folder', {
          folderId: folder.id,
          productId: folder.productId
        });
        // eslint-disable-next-line no-continue
        continue;
      }

      const productCode = product.productCode.toUpperCase();
      const extBucketEnvVar = getBucketEnvName(productCode, 'ext');
      const intBucketEnvVar = getBucketEnvName(productCode, 'int');
      const extBucketName = process.env[extBucketEnvVar];
      const intBucketName = process.env[intBucketEnvVar];

      // Delete corresponding S3 folder objects in both buckets
      try {
        if (extBucketName) {
          // Delete folder from external bucket
          const extS3Key = `${folder.tenantId}/${
            folder.path.startsWith('/') ? folder.path.slice(1) : folder.path
          }/`;
          // eslint-disable-next-line no-await-in-loop
          await deleteS3Object(extBucketName, extS3Key);
          logger.info('Deleted folder from external S3 bucket', {
            bucket: extBucketName,
            key: extS3Key
          });
        }

        if (intBucketName) {
          // Delete folder from internal bucket
          const intS3Key = `${folder.tenantId}/${
            folder.path.startsWith('/') ? folder.path.slice(1) : folder.path
          }/`;
          // eslint-disable-next-line no-await-in-loop
          await deleteS3Object(intBucketName, intS3Key);
          logger.info('Deleted folder from internal S3 bucket', {
            bucket: intBucketName,
            key: intS3Key
          });
        }
      } catch (s3Error) {
        // Log the error but continue with deleting the folder from the database
        logger.error('Error deleting folder from S3', {
          error: s3Error,
          folderId: folder.id,
          folderPath: folder.path,
          tenantId: folder.tenantId
        });
      }

      // Delete the folder record from DynamoDB
      // eslint-disable-next-line no-await-in-loop
      await Folder.remove({ tenantId: folder.tenantId, id: folder.id });
      logger.info('Successfully deleted inactive folder', {
        folderId: folder.id,
        folderPath: folder.path,
        tenantId: folder.tenantId
      });

      // Store information about the deleted folder
      deletedFolders.push({
        id: folder.id,
        path: folder.path,
        tenantId: folder.tenantId
      });
    } catch (error) {
      logger.error('Failed to delete inactive folder', {
        error,
        folderId: folder.id,
        folderPath: folder.path,
        tenantId: folder.tenantId
      });
      // Continue with the next folder even if there's an error
    }
  }

  return {
    totalDeleted: deletedFolders.length,
    folders: deletedFolders
  };
}

/**
 * Lambda handler for deleting inactive objects (users, folders, etc.)
 * This will be scheduled to run daily via EventBridge
 */
export async function lambdaHandler() {
  logger.info('Starting inactive objects cleanup process');

  try {
    // Delete inactive users
    const userResult = await deleteInactiveUsers();

    // Delete inactive folders
    const folderResult = await deleteInactiveFolders();

    logger.info(`Inactive objects cleanup completed successfully`, {
      totalDeletedUsers: userResult.totalDeleted,
      totalDeletedFolders: folderResult.totalDeleted
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully cleaned up inactive objects: deleted ${userResult.totalDeleted} inactive users and ${folderResult.totalDeleted} inactive folders`,
        usersDeleted: userResult.totalDeleted,
        users: userResult.users,
        foldersDeleted: folderResult.totalDeleted,
        folders: folderResult.folders
      })
    };
  } catch (error) {
    logger.error('Error during inactive objects cleanup', { error });

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: true,
        message: 'Internal server error during inactive objects cleanup',
        code: 'INTERNAL_SERVER_ERROR'
      })
    };
  }
}

// Export the handler wrapped with the tracer
export const handler = middy(lambdaHandler).use(captureLambdaHandler(tracer));
