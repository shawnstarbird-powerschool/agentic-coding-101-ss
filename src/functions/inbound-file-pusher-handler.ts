import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { EventBridge, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import middy from '@middy/core';
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { ProductConfig, ProductConfigMap } from '../cdk/lib/main-stack-props';
import { FILE_TRANSFER_EVENT_TYPE, FileTransferEvent } from '../models/events';
import { TransferLog } from '../util/db-schema';
import {
  createTransferEventTransferLog,
  TransferFamilyEvent
} from '../util/db-utils';
import { getBucketEnvName } from '../util/env-var-utils';
import {
  addS3ObjectTag,
  copyS3Object,
  hasS3ObjectTag,
  isImageFile
} from '../util/s3-utils';

// Initialize Logger and Tracer
const logger = new Logger({ serviceName: 'inbound-file-pusher' });
const tracer = new Tracer({ serviceName: 'inbound-file-pusher' });
const eventBridge = new EventBridge({ region: process.env.AWS_REGION });

/**
 * Lambda handler for processing files from external to internal buckets
 * Triggered by SQS messages from S3 event notifications and Transfer events
 */
export const lambdaHandler: SQSHandler = async (
  event: SQSEvent
): Promise<void> => {
  logger.info('Received inbound file pusher event', { event });

  try {
    // Process Transfer events first
    const transferEvents = event.Records.map((record) =>
      JSON.parse(record.body)
    ).filter((body) => body.source === 'aws.transfer');

    if (transferEvents.length === 0) {
      logger.info('No Transfer events found in the SQS message');
      return;
    }

    logger.info('Processing Transfer events', {
      count: transferEvents.length
    });

    const { PRODUCT_CONFIGS } = process.env;
    if (!PRODUCT_CONFIGS) {
      throw new Error('PRODUCT_CONFIGS environment variable is not set');
    }

    // Parse the PRODUCT_CONFIGS environment variable
    const productConfigs = JSON.parse(PRODUCT_CONFIGS) as ProductConfigMap;

    // Process each file sequentially to avoid overwhelming S3
    await transferEvents.reduce(
      async (previousPromise, transferEvent: TransferFamilyEvent) => {
        // Wait for the previous file to be processed
        await previousPromise;

        // Create a TransferLog record for the file transfer
        const transferLog = await createTransferEventTransferLog(transferEvent);

        const [, sourceBucket, tenantId, ...sourceKeyParts] =
          transferEvent.detail['file-path'].split('/');
        const sourceKey = [tenantId, ...sourceKeyParts].join('/');

        logger.info('Processing Transfer event', {
          tenantId,
          sourceBucket,
          sourceKey,
          transferEvent
        });

        // Find which product code this bucket belongs to
        let foundProductConfig: ProductConfig | undefined;
        // eslint-disable-next-line no-restricted-syntax
        for (const productConfig of Object.values(productConfigs)) {
          const envVarName = getBucketEnvName(productConfig.productCode, 'ext');
          const productExtBucket = process.env[envVarName];
          console.log(
            `Checking bucket var ${envVarName}: ${productExtBucket}, sourceBucket ${sourceBucket}`
          );
          if (productExtBucket && sourceBucket === productExtBucket) {
            logger.info('Found matching product config', {
              productCode: productConfig.productCode,
              sourceBucket
            });
            foundProductConfig = productConfig;
            break;
          }
        }

        if (!foundProductConfig) {
          logger.warn('No matching product config found', { sourceBucket });
        } else {
          logger.info('Processing file', {
            tenantId,
            sourceBucket,
            sourceKey,
            foundProductConfig
          });

          // Check if this is an outgoing file (to prevent loops)
          const hasOutgoingTag = await hasS3ObjectTag(
            sourceBucket,
            sourceKey,
            'direction',
            'outgoing'
          );

          if (hasOutgoingTag) {
            logger.info('Skipping file with outgoing tag', { sourceKey });
            return Promise.resolve();
          }

          // Check GuardDutyMalwareScanStatus tag before moving
          const hasNoThreatsTag = await hasS3ObjectTag(
            sourceBucket,
            sourceKey,
            'GuardDutyMalwareScanStatus',
            'NO_THREATS_FOUND'
          );
          if (!hasNoThreatsTag) {
            logger.info(
              'Skipping file due to missing or non-compliant GuardDutyMalwareScanStatus tag',
              { sourceKey }
            );
            return Promise.resolve();
          }

          // Determine the internal bucket name by replacing -ext with -int
          const destinationBucket = sourceBucket.replace(/-ext$/, '-int');

          if (destinationBucket === sourceBucket) {
            logger.warn('Could not determine internal bucket', {
              sourceBucket
            });
            return Promise.resolve();
          }

          logger.info('Moving file', {
            sourceBucket,
            destinationBucket,
            sourceKey
          });

          try {
            // Copy the file to the internal bucket, removing EXIF data if it's an image
            await copyS3Object(
              sourceBucket,
              sourceKey,
              destinationBucket,
              sourceKey,
              {
                removeExif: isImageFile(sourceKey),
                deleteSource: true // Delete the original file after successful copy
              }
            );

            // Add the 'incoming' tag to the file in the internal bucket
            await addS3ObjectTag(
              destinationBucket,
              sourceKey,
              'direction',
              'incoming'
            );

            // If a TransferLog was created, update it with the completion time
            if (transferLog) {
              await TransferLog.update({
                id: transferLog.id,
                tenantId: transferLog.tenantId,
                principalId: transferLog.principalId,
                completedAt: new Date(),
                status: 'success',
                source: 'inbound-file-pusher-handler.ts'
              });
            }

            // Send file transfer event
            const eventPayload: FileTransferEvent = {
              metadata: {
                version: '1.0',
                timestamp: Math.floor(new Date().getTime() / 1000),
                source: 'powerschool.ftp.file-service',
                accountId: process.env.AWS_ACCOUNT_ID || '',
                region: process.env.AWS_REGION || '',
                districtId: tenantId,
                envName: process.env.PS_ENVIRONMENT || '',
                namespace: process.env.PS_NAMESPACE || '',
                productCode: foundProductConfig.productCode
              },
              data: {
                path: sourceKey,
                sourceBucket,
                destinationBucket,
                sizeBytes: transferEvent.detail.bytes || 0
              }
            };

            try {
              await eventBridge.send(
                new PutEventsCommand({
                  Entries: [
                    {
                      EventBusName: process.env.EVENT_BUS_ARN,
                      Source: eventPayload.metadata.source,
                      DetailType: FILE_TRANSFER_EVENT_TYPE,
                      Detail: JSON.stringify(eventPayload)
                    }
                  ]
                })
              );
              logger.info('Successfully sent file transfer event', {
                eventPayload
              });
            } catch (error) {
              logger.error('Failed to send file transfer event', {
                error,
                eventPayload
              });
              // Continue execution even if event sending fails
            }

            logger.info('Successfully processed file', { sourceKey });
          } catch (error) {
            logger.error('Failed to process file', { sourceKey, error });
            // Re-throw the error to be caught by the top-level handler
            // This will cause the message to be sent to the dead-letter queue
            throw error;
          }
        }
        return Promise.resolve();
      },
      Promise.resolve()
    );
  } catch (error) {
    logger.error('Error processing inbound files', { error });
    throw error;
  }
};

// Export both the raw handler (for tests) and the middleware-wrapped handler
export const handler = middy(lambdaHandler).use(captureLambdaHandler(tracer));
