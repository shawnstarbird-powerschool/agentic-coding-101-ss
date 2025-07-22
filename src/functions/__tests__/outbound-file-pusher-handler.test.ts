/* eslint-disable import/first */
process.env.APP_TABLE_NAME = 'power-ftp-dev-gary';

/* eslint-disable @typescript-eslint/no-empty-function */
import { Context, SQSEvent } from 'aws-lambda';
import * as dbUtils from '../../util/db-utils';
import * as s3Utils from '../../util/s3-utils';
import { lambdaHandler } from '../outbound-file-pusher-handler';
/* eslint-enable import/first */

// Mock the s3-utils module and db-utils
jest.mock('../../util/s3-utils');
jest.mock('../../util/db-utils');

describe('outbound-file-pusher-handler', () => {
  // Mock context and callback for Lambda handler
  const mockContext = {} as Context;
  const mockCallback = (): void => {};

  // Create spies for the mocked functions
  const parseS3EventsFromSQSSpy = jest.spyOn(s3Utils, 'parseS3EventsFromSQS');
  const hasS3ObjectTagSpy = jest.spyOn(s3Utils, 'hasS3ObjectTag');
  const copyS3ObjectSpy = jest.spyOn(s3Utils, 'copyS3Object');
  const addS3ObjectTagSpy = jest.spyOn(s3Utils, 'addS3ObjectTag');
  const isImageFileSpy = jest.spyOn(s3Utils, 'isImageFile');
  const createS3TransferLogSpy = jest.spyOn(dbUtils, 'createS3TransferLog');

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should process valid S3 events and move files from internal to external buckets', async () => {
    // Mock the S3 event
    const mockS3Events = [
      {
        bucket: 'power-ftp-dev-pm-int',
        key: 'district1/QTI/data.zip',
        eventName: 'ObjectCreated:Put',
        eventTime: '2025-04-15T12:00:00.000Z',
        size: 1024
      }
    ];

    // Mock the SQS event
    const mockSQSEvent: SQSEvent = {
      Records: [
        {
          messageId: '12345',
          receiptHandle: 'receipt-handle',
          body: JSON.stringify({
            Records: [
              {
                eventSource: 'aws:s3',
                eventName: 'ObjectCreated:Put',
                s3: {
                  bucket: { name: 'power-ftp-dev-pm-int' },
                  object: { key: 'district1/QTI/data.zip', size: 1024 }
                },
                eventTime: '2025-04-15T12:00:00.000Z',
                userIdentity: {
                  principalId: 'AWS:AROAVSVS6BAHBCDU4QNRV:user123'
                },
                requestParameters: { sourceIPAddress: '10.0.144.9' }
              }
            ]
          }),
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: '1586697941444',
            SenderId: 'SENDER_ID',
            ApproximateFirstReceiveTimestamp: '1586697941444'
          },
          messageAttributes: {},
          md5OfBody: 'md5',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:region:account:queue',
          awsRegion: 'us-east-1'
        }
      ]
    };

    // Set up the mocks
    parseS3EventsFromSQSSpy.mockReturnValue(mockS3Events);
    hasS3ObjectTagSpy.mockResolvedValue(false); // Not an incoming file
    isImageFileSpy.mockReturnValue(false); // Not an image file
    copyS3ObjectSpy.mockResolvedValue(undefined);
    addS3ObjectTagSpy.mockResolvedValue();

    // Call the handler
    await lambdaHandler(mockSQSEvent, mockContext, mockCallback);

    // Verify the function calls
    expect(parseS3EventsFromSQSSpy).toHaveBeenCalledWith(mockSQSEvent);
    expect(hasS3ObjectTagSpy).toHaveBeenCalledWith(
      'power-ftp-dev-pm-int',
      'district1/QTI/data.zip',
      'direction',
      'incoming'
    );
    expect(copyS3ObjectSpy).toHaveBeenCalledWith(
      'power-ftp-dev-pm-int',
      'district1/QTI/data.zip',
      'power-ftp-dev-pm-ext',
      'district1/QTI/data.zip',
      {
        removeExif: false,
        deleteSource: true
      }
    );
    expect(addS3ObjectTagSpy).toHaveBeenCalledWith(
      'power-ftp-dev-pm-ext',
      'district1/QTI/data.zip',
      'direction',
      'outgoing'
    );

    // Verify TransferLog creation
    expect(createS3TransferLogSpy).toHaveBeenCalledWith(
      {
        eventSource: 'aws:s3',
        eventName: 'ObjectCreated:Put',
        s3: {
          bucket: { name: 'power-ftp-dev-pm-int' },
          object: { key: 'district1/QTI/data.zip', size: 1024 }
        },
        eventTime: '2025-04-15T12:00:00.000Z',
        userIdentity: {
          principalId: 'AWS:AROAVSVS6BAHBCDU4QNRV:user123'
        },
        requestParameters: { sourceIPAddress: '10.0.144.9' }
      },
      'outbound'
    );
  });

  it('should skip files with incoming tag', async () => {
    // Mock the S3 event
    const mockS3Events = [
      {
        bucket: 'power-ftp-dev-pm-int',
        key: 'district1/QTI/incoming.zip',
        eventName: 'ObjectCreated:Put',
        eventTime: '2025-04-15T12:00:00.000Z',
        size: 1024
      }
    ];

    // Mock the SQS event (simplified for brevity)
    const mockSQSEvent: SQSEvent = {
      Records: [
        {
          body: '{}',
          messageId: '',
          receiptHandle: '',
          attributes: {
            ApproximateReceiveCount: '',
            SentTimestamp: '',
            SenderId: '',
            ApproximateFirstReceiveTimestamp: ''
          },
          messageAttributes: {},
          md5OfBody: '',
          eventSource: '',
          eventSourceARN: '',
          awsRegion: ''
        }
      ]
    };

    // Set up the mocks
    parseS3EventsFromSQSSpy.mockReturnValue(mockS3Events);
    hasS3ObjectTagSpy.mockResolvedValue(true); // Has incoming tag

    // Call the handler
    await lambdaHandler(mockSQSEvent, mockContext, mockCallback);

    // Verify the function calls
    expect(parseS3EventsFromSQSSpy).toHaveBeenCalledWith(mockSQSEvent);
    expect(hasS3ObjectTagSpy).toHaveBeenCalledWith(
      'power-ftp-dev-pm-int',
      'district1/QTI/incoming.zip',
      'direction',
      'incoming'
    );
    // Should not attempt to copy or tag
    expect(copyS3ObjectSpy).not.toHaveBeenCalled();
    expect(addS3ObjectTagSpy).not.toHaveBeenCalled();
  });

  it('should handle image files and remove EXIF data', async () => {
    // Mock the S3 event
    const mockS3Events = [
      {
        bucket: 'power-ftp-dev-pm-int',
        key: 'district1/Images/photo.jpg',
        eventName: 'ObjectCreated:Put',
        eventTime: '2025-04-15T12:00:00.000Z',
        size: 1024
      }
    ];

    // Mock the SQS event with image file
    const mockSQSEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({
            Records: [
              {
                eventSource: 'aws:s3',
                eventName: 'ObjectCreated:Put',
                s3: {
                  bucket: { name: 'power-ftp-dev-pm-int' },
                  object: { key: 'district1/Images/photo.jpg', size: 1024 }
                },
                eventTime: '2025-04-15T12:00:00.000Z',
                userIdentity: {
                  principalId: 'AWS:AROAVSVS6BAHBCDU4QNRV:user123'
                },
                requestParameters: { sourceIPAddress: '10.0.144.9' }
              }
            ]
          }),
          messageId: '',
          receiptHandle: '',
          attributes: {
            ApproximateReceiveCount: '',
            SentTimestamp: '',
            SenderId: '',
            ApproximateFirstReceiveTimestamp: ''
          },
          messageAttributes: {},
          md5OfBody: '',
          eventSource: '',
          eventSourceARN: '',
          awsRegion: ''
        }
      ]
    };

    // Set up the mocks
    parseS3EventsFromSQSSpy.mockReturnValue(mockS3Events);
    hasS3ObjectTagSpy.mockResolvedValue(false); // Not an incoming file
    isImageFileSpy.mockReturnValue(true); // Is an image file
    copyS3ObjectSpy.mockResolvedValue(undefined);
    addS3ObjectTagSpy.mockResolvedValue();

    // Call the handler
    await lambdaHandler(mockSQSEvent, mockContext, mockCallback);

    // Verify the function calls
    expect(isImageFileSpy).toHaveBeenCalledWith('district1/Images/photo.jpg');
    expect(copyS3ObjectSpy).toHaveBeenCalledWith(
      'power-ftp-dev-pm-int',
      'district1/Images/photo.jpg',
      'power-ftp-dev-pm-ext',
      'district1/Images/photo.jpg',
      {
        removeExif: true, // Should be true for image files
        deleteSource: true
      }
    );

    // Verify TransferLog creation
    expect(createS3TransferLogSpy).toHaveBeenCalledWith(
      {
        eventSource: 'aws:s3',
        eventName: 'ObjectCreated:Put',
        s3: {
          bucket: { name: 'power-ftp-dev-pm-int' },
          object: { key: 'district1/Images/photo.jpg', size: 1024 }
        },
        eventTime: '2025-04-15T12:00:00.000Z',
        userIdentity: {
          principalId: 'AWS:AROAVSVS6BAHBCDU4QNRV:user123'
        },
        requestParameters: { sourceIPAddress: '10.0.144.9' }
      },
      'outbound'
    );
  });

  it('should handle copy failures gracefully', async () => {
    // Mock the S3 event
    const mockS3Events = [
      {
        bucket: 'power-ftp-dev-pm-int',
        key: 'district1/QTI/error.zip',
        eventName: 'ObjectCreated:Put',
        eventTime: '2025-04-15T12:00:00.000Z',
        size: 1024
      }
    ];

    // Mock the SQS event (simplified for brevity)
    const mockSQSEvent: SQSEvent = {
      Records: [
        {
          body: '{}',
          messageId: '',
          receiptHandle: '',
          attributes: {
            ApproximateReceiveCount: '',
            SentTimestamp: '',
            SenderId: '',
            ApproximateFirstReceiveTimestamp: ''
          },
          messageAttributes: {},
          md5OfBody: '',
          eventSource: '',
          eventSourceARN: '',
          awsRegion: ''
        }
      ]
    };

    // Set up the mocks
    parseS3EventsFromSQSSpy.mockReturnValue(mockS3Events);
    hasS3ObjectTagSpy.mockResolvedValue(false); // Not an incoming file
    isImageFileSpy.mockReturnValue(false); // Not an image file
    copyS3ObjectSpy.mockRejectedValue(new Error('Copy failed'));

    // Expect the handler to throw an error
    await expect(
      lambdaHandler(mockSQSEvent, mockContext, mockCallback)
    ).rejects.toThrow('Copy failed');

    // Verify the function calls
    expect(copyS3ObjectSpy).toHaveBeenCalled();
    // Should not attempt to tag since copy failed with an exception
    expect(addS3ObjectTagSpy).not.toHaveBeenCalled();
  });

  it('should skip .placeholder files', async () => {
    // Mock the S3 event with a .placeholder file
    const mockS3Events = [
      {
        bucket: 'power-ftp-dev-pm-int',
        key: 'district1/QTI/.placeholder',
        eventName: 'ObjectCreated:Put',
        eventTime: '2025-04-15T12:00:00.000Z',
        size: 0
      }
    ];

    // Mock the SQS event (simplified for brevity)
    const mockSQSEvent: SQSEvent = {
      Records: [
        {
          body: '{}',
          messageId: '',
          receiptHandle: '',
          attributes: {
            ApproximateReceiveCount: '',
            SentTimestamp: '',
            SenderId: '',
            ApproximateFirstReceiveTimestamp: ''
          },
          messageAttributes: {},
          md5OfBody: '',
          eventSource: '',
          eventSourceARN: '',
          awsRegion: ''
        }
      ]
    };

    // Set up the mocks
    parseS3EventsFromSQSSpy.mockReturnValue(mockS3Events);

    // Call the handler
    await lambdaHandler(mockSQSEvent, mockContext, mockCallback);

    // Verify the function calls
    expect(parseS3EventsFromSQSSpy).toHaveBeenCalledWith(mockSQSEvent);
    // Should not attempt to check tags, copy, or tag
    expect(hasS3ObjectTagSpy).not.toHaveBeenCalled();
    expect(copyS3ObjectSpy).not.toHaveBeenCalled();
    expect(addS3ObjectTagSpy).not.toHaveBeenCalled();
  });
});
