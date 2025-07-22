import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { createS3TransferLog } from '../util/db-utils';
import {
  addS3ObjectTag,
  copyS3Object,
  hasS3ObjectTag,
  isImageFile,
  parseS3EventsFromSQS
} from '../util/s3-utils';

// Initialize Logger and Tracer
const logger = new Logger({ serviceName: 'outbound-file-pusher' });
const tracer = new Tracer({ serviceName: 'outbound-file-pusher' });

/**
 * Lambda handler for processing files from internal to external buckets
 * Triggered by SQS messages from S3 event notifications on internal buckets
 */
export const lambdaHandler: SQSHandler = async (
  event: SQSEvent
): Promise<void> => {
  logger.info('Received outbound file pusher event', { event });

  try {
    // Parse S3 events from SQS messages
    const s3Events = parseS3EventsFromSQS(event);
    logger.info('Parsed S3 events from SQS messages', {
      count: s3Events.length
    });

    // Filter out directory markers and .placeholder files
    const validFiles = s3Events.filter(
      (s3Event) =>
        !s3Event.key.endsWith('/') && !s3Event.key.endsWith('.placeholder')
    );

    logger.info('Found valid files to process', { count: validFiles.length });

    // Process each file sequentially to avoid overwhelming S3
    await validFiles.reduce(async (previousPromise, s3Event) => {
      // Wait for the previous file to be processed
      await previousPromise;

      const { bucket: sourceBucket, key: sourceKey } = s3Event;
      logger.info('Processing file', { sourceBucket, sourceKey });

      // Check if this is an incoming file (to prevent loops)
      const hasIncomingTag = await hasS3ObjectTag(
        sourceBucket,
        sourceKey,
        'direction',
        'incoming'
      );

      if (hasIncomingTag) {
        logger.info('Skipping file with incoming tag', { sourceKey });
        return Promise.resolve();
      }

      // Determine the external bucket name by replacing -int with -ext
      const destinationBucket = sourceBucket.replace(/-int$/, '-ext');

      if (destinationBucket === sourceBucket) {
        logger.warn('Could not determine external bucket', { sourceBucket });
        return Promise.resolve();
      }

      logger.info('Moving file', {
        sourceBucket,
        destinationBucket,
        sourceKey
      });

      try {
        // Copy the file to the external bucket, removing EXIF data if it's an image
        await copyS3Object(
          sourceBucket,
          sourceKey,
          destinationBucket,
          sourceKey,
          {
            removeExif: isImageFile(sourceKey), // Always remove EXIF data for outbound files
            deleteSource: true // Delete the original file after successful copy
          }
        );

        // Add the 'outgoing' tag to the file in the external bucket
        await addS3ObjectTag(
          destinationBucket,
          sourceKey,
          'direction',
          'outgoing'
        );

        // Find the original S3 record from the event to get additional metadata
        const originalRecord = event.Records.flatMap((record) => {
          try {
            const body = JSON.parse(record.body);
            return body.Records || [];
          } catch (error) {
            return [];
          }
        }).find(
          (record) =>
            record.s3 &&
            record.s3.bucket.name === sourceBucket &&
            decodeURIComponent(record.s3.object.key.replace(/\+/g, ' ')) ===
              sourceKey
        );

        // Create a TransferLog record for the file transfer
        if (originalRecord) {
          await createS3TransferLog(originalRecord, 'outbound');
        } else {
          logger.warn('Could not find original S3 record for TransferLog', {
            sourceBucket,
            sourceKey
          });
        }

        logger.info('Successfully processed file', { sourceKey });
      } catch (error) {
        logger.error('Failed to process file', { sourceKey, error });
        // Re-throw the error to be caught by the top-level handler
        // This will cause the message to be sent to the dead-letter queue
        throw error;
      }

      return Promise.resolve();
    }, Promise.resolve());
  } catch (error) {
    logger.error('Error processing outbound files', { error });
    throw error;
  }
};

// Export both the raw handler (for tests) and the middleware-wrapped handler
export const handler = middy(lambdaHandler).use(captureLambdaHandler(tracer));
