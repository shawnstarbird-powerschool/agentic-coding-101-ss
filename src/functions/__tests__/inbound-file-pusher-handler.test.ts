/* eslint-disable import/first */
process.env.APP_TABLE_NAME = 'power-ftp-dev-gary';
process.env.EVENT_BUS_ARN =
  'arn:aws:events:us-east-1:123456789012:event-bus/default';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCOUNT_ID = '123456789012';
process.env.PS_ENVIRONMENT = 'dev';
process.env.PS_NAMESPACE = 'test';

/* eslint-disable @typescript-eslint/no-empty-function */
import { EventBridge, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { Context, SQSEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { TransferLog } from '../../util/db-schema';
import * as dbUtils from '../../util/db-utils';
import * as s3Utils from '../../util/s3-utils';
import { lambdaHandler } from '../inbound-file-pusher-handler';
/* eslint-enable import/first */

// Mock the s3-utils module and db-utils
jest.mock('../../util/s3-utils');
jest.mock('../../util/db-utils');

// Mock the AWS SDK S3 client
const ebMock = mockClient(EventBridge);

describe('inbound-file-pusher-handler', () => {
  // Mock context and callback for Lambda handler
  const mockContext = {} as Context;
  const mockCallback = (): void => {};

  // Create spies for the mocked functions
  const hasS3ObjectTagSpy = jest.spyOn(s3Utils, 'hasS3ObjectTag');
  const copyS3ObjectSpy = jest.spyOn(s3Utils, 'copyS3Object');
  const addS3ObjectTagSpy = jest.spyOn(s3Utils, 'addS3ObjectTag');
  const isImageFileSpy = jest.spyOn(s3Utils, 'isImageFile');
  const createTransferEventTransferLogSpy = jest.spyOn(
    dbUtils,
    'createTransferEventTransferLog'
  );

  // Mock EventBridge
  ebMock.reset();

  // Mock TransferLog.update
  const mockTransferLogUpdate = jest.fn().mockResolvedValue({});
  TransferLog.update = mockTransferLogUpdate;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Set up default product configs environment variable
    process.env.PRODUCT_CONFIGS = JSON.stringify({
      PM: {
        productCode: 'PM',
        name: 'Performance Matters',
        uses: [{ name: 'QTI' }],
        multiTenant: true,
        accessAccounts: ['123456789012']
      }
    });

    // Set up bucket environment variables
    process.env.TRANSFER_BUCKET_PM_EXT = 'power-ftp-dev-pm-ext';
    process.env.TRANSFER_BUCKET_PM_INT = 'power-ftp-dev-pm-int';
  });

  it('should process valid Transfer Family events and move files from external to internal buckets', async () => {
    // Mock the Transfer Family event
    const mockTransferEvent = {
      version: '0',
      id: 'd232c159-59ed-7a4e-7b20-1297f16d0d90',
      'detail-type': 'SFTP Server File Upload Completed',
      source: 'aws.transfer',
      account: '123456789012',
      time: '2025-06-03T17:11:07Z',
      region: 'us-east-1',
      resources: [
        'arn:aws:transfer:us-east-1:123456789012:server/s-ccbbd58bb48140b09'
      ],
      detail: {
        'status-code': 'COMPLETED',
        protocol: 'SFTP',
        bytes: 3412677,
        'client-ip': '52.205.140.168',
        'end-timestamp': '2025-06-03T17:11:07.832234304Z',
        etag: '0b1f4fa3b23c325f77bba665c6c79e92',
        'file-path': '/power-ftp-dev-pm-ext/district1/QTI/data.zip',
        'server-id': 's-ccbbd58bb48140b09',
        username: 'testuser',
        'session-id': '0292f1e12f20d1a2eddc',
        'start-timestamp': '2025-06-03T17:11:07.611785735Z'
      }
    };

    // Mock the SQS event
    const mockSQSEvent: SQSEvent = {
      Records: [
        {
          messageId: '12345',
          receiptHandle: 'receipt-handle',
          body: JSON.stringify(mockTransferEvent),
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

    // Mock the TransferLog
    const mockTransferLog = {
      id: 'transfer-log-id',
      tenantId: 'district1',
      fileName: '/power-ftp-dev-pm-ext/district1/QTI/data.zip',
      direction: 'inbound' as const, // Type assertion to satisfy TypeScript
      startedAt: new Date(),
      status: 'in-progress',
      source: 'db-utils.ts',
      sourceIPAddress: '52.205.140.168',
      principalId: 'testuser'
    };

    // Set up the mocks
    createTransferEventTransferLogSpy.mockResolvedValue(mockTransferLog);
    hasS3ObjectTagSpy.mockImplementation((bucket, key, tagName) => {
      if (tagName === 'direction') return Promise.resolve(false); // Not an outgoing file
      if (tagName === 'GuardDutyMalwareScanStatus')
        return Promise.resolve(true); // Has NO_THREATS_FOUND tag
      return Promise.resolve(false);
    });
    isImageFileSpy.mockReturnValue(false); // Not an image file
    copyS3ObjectSpy.mockResolvedValue(undefined);
    addS3ObjectTagSpy.mockResolvedValue();
    ebMock.on(PutEventsCommand).resolves({});

    // Call the handler
    await lambdaHandler(mockSQSEvent, mockContext, mockCallback);

    // Verify the function calls
    expect(createTransferEventTransferLogSpy).toHaveBeenCalledWith(
      mockTransferEvent
    );
    expect(hasS3ObjectTagSpy).toHaveBeenCalledWith(
      'power-ftp-dev-pm-ext',
      'district1/QTI/data.zip',
      'direction',
      'outgoing'
    );
    expect(hasS3ObjectTagSpy).toHaveBeenCalledWith(
      'power-ftp-dev-pm-ext',
      'district1/QTI/data.zip',
      'GuardDutyMalwareScanStatus',
      'NO_THREATS_FOUND'
    );
    expect(copyS3ObjectSpy).toHaveBeenCalledWith(
      'power-ftp-dev-pm-ext',
      'district1/QTI/data.zip',
      'power-ftp-dev-pm-int',
      'district1/QTI/data.zip',
      {
        removeExif: false,
        deleteSource: true
      }
    );
    expect(addS3ObjectTagSpy).toHaveBeenCalledWith(
      'power-ftp-dev-pm-int',
      'district1/QTI/data.zip',
      'direction',
      'incoming'
    );

    // Verify TransferLog update
    expect(mockTransferLogUpdate).toHaveBeenCalledWith({
      id: 'transfer-log-id',
      completedAt: expect.any(Date),
      status: 'success',
      source: 'inbound-file-pusher-handler.ts',
      principalId: 'testuser',
      tenantId: 'district1'
    });

    expect(ebMock.commandCalls(PutEventsCommand)).toHaveLength(1);
    const eventDetail = JSON.parse(
      ebMock.commandCalls(PutEventsCommand)[0].firstArg.input.Entries[0].Detail
    );
    expect(eventDetail).toMatchObject({
      metadata: {
        version: '1.0',
        source: 'powerschool.ftp.file-service',
        accountId: '123456789012',
        region: 'us-east-1',
        districtId: 'district1',
        envName: 'dev',
        namespace: 'test',
        productCode: 'PM'
      },
      data: {
        path: 'district1/QTI/data.zip',
        sourceBucket: 'power-ftp-dev-pm-ext',
        destinationBucket: 'power-ftp-dev-pm-int',
        sizeBytes: 3412677
      }
    });
  });

  it('should skip files with outgoing tag', async () => {
    // Mock the Transfer Family event
    const mockTransferEvent = {
      version: '0',
      id: 'd232c159-59ed-7a4e-7b20-1297f16d0d90',
      'detail-type': 'SFTP Server File Upload Completed',
      source: 'aws.transfer',
      account: '123456789012',
      time: '2025-06-03T17:11:07Z',
      region: 'us-east-1',
      resources: [
        'arn:aws:transfer:us-east-1:123456789012:server/s-ccbbd58bb48140b09'
      ],
      detail: {
        'status-code': 'COMPLETED',
        protocol: 'SFTP',
        bytes: 3412677,
        'client-ip': '52.205.140.168',
        'end-timestamp': '2025-06-03T17:11:07.832234304Z',
        etag: '0b1f4fa3b23c325f77bba665c6c79e92',
        'file-path': '/power-ftp-dev-pm-ext/district1/QTI/outgoing.zip',
        'server-id': 's-ccbbd58bb48140b09',
        username: 'testuser',
        'session-id': '0292f1e12f20d1a2eddc',
        'start-timestamp': '2025-06-03T17:11:07.611785735Z'
      }
    };

    // Mock the SQS event (simplified for brevity)
    const mockSQSEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify(mockTransferEvent),
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
    createTransferEventTransferLogSpy.mockResolvedValue({
      id: 'transfer-log-id',
      tenantId: 'district1',
      fileName: '/power-ftp-dev-pm-ext/district1/QTI/outgoing.zip',
      direction: 'inbound' as const,
      startedAt: new Date(),
      status: 'in-progress',
      source: 'db-utils.ts',
      sourceIPAddress: '52.205.140.168',
      principalId: 'testuser'
    });
    hasS3ObjectTagSpy.mockImplementation((bucket, key, tagName) => {
      if (tagName === 'direction') return Promise.resolve(true); // Has outgoing tag
      return Promise.resolve(false);
    });

    // Call the handler
    await lambdaHandler(mockSQSEvent, mockContext, mockCallback);

    // Verify the function calls
    expect(createTransferEventTransferLogSpy).toHaveBeenCalledWith(
      mockTransferEvent
    );
    expect(hasS3ObjectTagSpy).toHaveBeenCalledWith(
      'power-ftp-dev-pm-ext',
      'district1/QTI/outgoing.zip',
      'direction',
      'outgoing'
    );
    // Should not attempt to check GuardDutyMalwareScanStatus, copy, or tag
    expect(hasS3ObjectTagSpy).not.toHaveBeenCalledWith(
      'power-ftp-dev-pm-ext',
      'district1/QTI/outgoing.zip',
      'GuardDutyMalwareScanStatus',
      'NO_THREATS_FOUND'
    );
    expect(copyS3ObjectSpy).not.toHaveBeenCalled();
    expect(addS3ObjectTagSpy).not.toHaveBeenCalled();
    expect(mockTransferLogUpdate).not.toHaveBeenCalled();
  });

  it('should skip files without NO_THREATS_FOUND tag', async () => {
    // Mock the Transfer Family event
    const mockTransferEvent = {
      version: '0',
      id: 'd232c159-59ed-7a4e-7b20-1297f16d0d90',
      'detail-type': 'SFTP Server File Upload Completed',
      source: 'aws.transfer',
      account: '123456789012',
      time: '2025-06-03T17:11:07Z',
      region: 'us-east-1',
      resources: [
        'arn:aws:transfer:us-east-1:123456789012:server/s-ccbbd58bb48140b09'
      ],
      detail: {
        'status-code': 'COMPLETED',
        protocol: 'SFTP',
        bytes: 3412677,
        'client-ip': '52.205.140.168',
        'end-timestamp': '2025-06-03T17:11:07.832234304Z',
        etag: '0b1f4fa3b23c325f77bba665c6c79e92',
        'file-path': '/power-ftp-dev-pm-ext/district1/QTI/unsafe.zip',
        'server-id': 's-ccbbd58bb48140b09',
        username: 'testuser',
        'session-id': '0292f1e12f20d1a2eddc',
        'start-timestamp': '2025-06-03T17:11:07.611785735Z'
      }
    };

    // Mock the SQS event (simplified for brevity)
    const mockSQSEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify(mockTransferEvent),
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
    createTransferEventTransferLogSpy.mockResolvedValue({
      id: 'transfer-log-id',
      tenantId: 'district1',
      fileName: '/power-ftp-dev-pm-ext/district1/QTI/unsafe.zip',
      direction: 'inbound' as const,
      startedAt: new Date(),
      status: 'in-progress',
      source: 'db-utils.ts',
      sourceIPAddress: '52.205.140.168',
      principalId: 'testuser'
    });
    hasS3ObjectTagSpy.mockImplementation((bucket, key, tagName) => {
      if (tagName === 'direction') return Promise.resolve(false); // Not an outgoing file
      if (tagName === 'GuardDutyMalwareScanStatus')
        return Promise.resolve(false); // Does NOT have NO_THREATS_FOUND tag
      return Promise.resolve(false);
    });

    // Call the handler
    await lambdaHandler(mockSQSEvent, mockContext, mockCallback);

    // Verify the function calls
    expect(createTransferEventTransferLogSpy).toHaveBeenCalledWith(
      mockTransferEvent
    );
    expect(hasS3ObjectTagSpy).toHaveBeenCalledWith(
      'power-ftp-dev-pm-ext',
      'district1/QTI/unsafe.zip',
      'direction',
      'outgoing'
    );
    expect(hasS3ObjectTagSpy).toHaveBeenCalledWith(
      'power-ftp-dev-pm-ext',
      'district1/QTI/unsafe.zip',
      'GuardDutyMalwareScanStatus',
      'NO_THREATS_FOUND'
    );
    // Should not attempt to copy or tag
    expect(copyS3ObjectSpy).not.toHaveBeenCalled();
    expect(addS3ObjectTagSpy).not.toHaveBeenCalled();
    expect(mockTransferLogUpdate).not.toHaveBeenCalled();
  });

  it('should handle image files and remove EXIF data', async () => {
    // Mock the Transfer Family event with an image file
    const mockTransferEvent = {
      version: '0',
      id: 'd232c159-59ed-7a4e-7b20-1297f16d0d90',
      'detail-type': 'SFTP Server File Upload Completed',
      source: 'aws.transfer',
      account: '123456789012',
      time: '2025-06-03T17:11:07Z',
      region: 'us-east-1',
      resources: [
        'arn:aws:transfer:us-east-1:123456789012:server/s-ccbbd58bb48140b09'
      ],
      detail: {
        'status-code': 'COMPLETED',
        protocol: 'SFTP',
        bytes: 3412677,
        'client-ip': '52.205.140.168',
        'end-timestamp': '2025-06-03T17:11:07.832234304Z',
        etag: '0b1f4fa3b23c325f77bba665c6c79e92',
        'file-path': '/power-ftp-dev-pm-ext/district1/Images/photo.jpg',
        'server-id': 's-ccbbd58bb48140b09',
        username: 'testuser',
        'session-id': '0292f1e12f20d1a2eddc',
        'start-timestamp': '2025-06-03T17:11:07.611785735Z'
      }
    };

    // Mock the SQS event
    const mockSQSEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify(mockTransferEvent),
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
    createTransferEventTransferLogSpy.mockResolvedValue({
      id: 'transfer-log-id',
      tenantId: 'district1',
      fileName: '/power-ftp-dev-pm-ext/district1/Images/photo.jpg',
      direction: 'inbound' as const,
      startedAt: new Date(),
      status: 'in-progress',
      source: 'db-utils.ts',
      sourceIPAddress: '52.205.140.168',
      principalId: 'testuser'
    });
    hasS3ObjectTagSpy.mockImplementation((bucket, key, tagName) => {
      if (tagName === 'direction') return Promise.resolve(false); // Not an outgoing file
      if (tagName === 'GuardDutyMalwareScanStatus')
        return Promise.resolve(true); // Has NO_THREATS_FOUND tag
      return Promise.resolve(false);
    });
    isImageFileSpy.mockReturnValue(true); // Is an image file
    copyS3ObjectSpy.mockResolvedValue(undefined);
    addS3ObjectTagSpy.mockResolvedValue();

    // Call the handler
    await lambdaHandler(mockSQSEvent, mockContext, mockCallback);

    // Verify the function calls
    expect(isImageFileSpy).toHaveBeenCalledWith('district1/Images/photo.jpg');
    expect(copyS3ObjectSpy).toHaveBeenCalledWith(
      'power-ftp-dev-pm-ext',
      'district1/Images/photo.jpg',
      'power-ftp-dev-pm-int',
      'district1/Images/photo.jpg',
      {
        removeExif: true, // Should be true for image files
        deleteSource: true
      }
    );
  });

  it('should handle copy failures gracefully', async () => {
    // Mock the Transfer Family event
    const mockTransferEvent = {
      version: '0',
      id: 'd232c159-59ed-7a4e-7b20-1297f16d0d90',
      'detail-type': 'SFTP Server File Upload Completed',
      source: 'aws.transfer',
      account: '123456789012',
      time: '2025-06-03T17:11:07Z',
      region: 'us-east-1',
      resources: [
        'arn:aws:transfer:us-east-1:123456789012:server/s-ccbbd58bb48140b09'
      ],
      detail: {
        'status-code': 'COMPLETED',
        protocol: 'SFTP',
        bytes: 3412677,
        'client-ip': '52.205.140.168',
        'end-timestamp': '2025-06-03T17:11:07.832234304Z',
        etag: '0b1f4fa3b23c325f77bba665c6c79e92',
        'file-path': '/power-ftp-dev-pm-ext/district1/QTI/error.zip',
        'server-id': 's-ccbbd58bb48140b09',
        username: 'testuser',
        'session-id': '0292f1e12f20d1a2eddc',
        'start-timestamp': '2025-06-03T17:11:07.611785735Z'
      }
    };

    // Mock the SQS event (simplified for brevity)
    const mockSQSEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify(mockTransferEvent),
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
    createTransferEventTransferLogSpy.mockResolvedValue({
      id: 'transfer-log-id',
      tenantId: 'district1',
      fileName: '/power-ftp-dev-pm-ext/district1/QTI/error.zip',
      direction: 'inbound' as const,
      startedAt: new Date(),
      status: 'in-progress',
      source: 'db-utils.ts',
      sourceIPAddress: '52.205.140.168',
      principalId: 'testuser'
    });
    hasS3ObjectTagSpy.mockImplementation((bucket, key, tagName) => {
      if (tagName === 'direction') return Promise.resolve(false); // Not an outgoing file
      if (tagName === 'GuardDutyMalwareScanStatus')
        return Promise.resolve(true); // Has NO_THREATS_FOUND tag
      return Promise.resolve(false);
    });
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
    expect(mockTransferLogUpdate).not.toHaveBeenCalled();
  });

  it('should handle missing product configurations', async () => {
    // Set empty product configs
    process.env.PRODUCT_CONFIGS = JSON.stringify({});

    // Mock the Transfer Family event
    const mockTransferEvent = {
      version: '0',
      id: 'd232c159-59ed-7a4e-7b20-1297f16d0d90',
      'detail-type': 'SFTP Server File Upload Completed',
      source: 'aws.transfer',
      account: '123456789012',
      time: '2025-06-03T17:11:07Z',
      region: 'us-east-1',
      resources: [
        'arn:aws:transfer:us-east-1:123456789012:server/s-ccbbd58bb48140b09'
      ],
      detail: {
        'status-code': 'COMPLETED',
        protocol: 'SFTP',
        bytes: 3412677,
        'client-ip': '52.205.140.168',
        'end-timestamp': '2025-06-03T17:11:07.832234304Z',
        etag: '0b1f4fa3b23c325f77bba665c6c79e92',
        'file-path': '/power-ftp-dev-pm-ext/district1/QTI/data.zip',
        'server-id': 's-ccbbd58bb48140b09',
        username: 'testuser',
        'session-id': '0292f1e12f20d1a2eddc',
        'start-timestamp': '2025-06-03T17:11:07.611785735Z'
      }
    };

    // Mock the SQS event
    const mockSQSEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify(mockTransferEvent),
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
    createTransferEventTransferLogSpy.mockResolvedValue({
      id: 'transfer-log-id',
      tenantId: 'district1',
      fileName: '/power-ftp-dev-pm-ext/district1/QTI/data.zip',
      direction: 'inbound' as const,
      startedAt: new Date(),
      status: 'in-progress',
      source: 'db-utils.ts',
      sourceIPAddress: '52.205.140.168',
      principalId: 'testuser'
    });

    // Call the handler
    await lambdaHandler(mockSQSEvent, mockContext, mockCallback);

    // Verify that no product config was found and no further processing occurred
    expect(hasS3ObjectTagSpy).not.toHaveBeenCalled();
    expect(copyS3ObjectSpy).not.toHaveBeenCalled();
    expect(addS3ObjectTagSpy).not.toHaveBeenCalled();
  });

  it('should handle non-Transfer events', async () => {
    // Mock a non-Transfer event
    const mockSQSEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({ source: 'not.aws.transfer' }),
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

    // Call the handler
    await lambdaHandler(mockSQSEvent, mockContext, mockCallback);

    // Verify that no processing occurred
    expect(createTransferEventTransferLogSpy).not.toHaveBeenCalled();
    expect(hasS3ObjectTagSpy).not.toHaveBeenCalled();
    expect(copyS3ObjectSpy).not.toHaveBeenCalled();
    expect(addS3ObjectTagSpy).not.toHaveBeenCalled();
  });

  it('should throw error when PRODUCT_CONFIGS is not set', async () => {
    // Unset PRODUCT_CONFIGS
    delete process.env.PRODUCT_CONFIGS;

    // Mock the Transfer Family event
    const mockTransferEvent = {
      version: '0',
      id: 'd232c159-59ed-7a4e-7b20-1297f16d0d90',
      'detail-type': 'SFTP Server File Upload Completed',
      source: 'aws.transfer',
      account: '123456789012',
      time: '2025-06-03T17:11:07Z',
      region: 'us-east-1',
      resources: [
        'arn:aws:transfer:us-east-1:123456789012:server/s-ccbbd58bb48140b09'
      ],
      detail: {
        'status-code': 'COMPLETED',
        protocol: 'SFTP',
        bytes: 3412677,
        'client-ip': '52.205.140.168',
        'end-timestamp': '2025-06-03T17:11:07.832234304Z',
        etag: '0b1f4fa3b23c325f77bba665c6c79e92',
        'file-path': '/power-ftp-dev-pm-ext/district1/QTI/data.zip',
        'server-id': 's-ccbbd58bb48140b09',
        username: 'testuser',
        'session-id': '0292f1e12f20d1a2eddc',
        'start-timestamp': '2025-06-03T17:11:07.611785735Z'
      }
    };

    // Mock the SQS event
    const mockSQSEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify(mockTransferEvent),
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

    // Expect the handler to throw an error
    await expect(
      lambdaHandler(mockSQSEvent, mockContext, mockCallback)
    ).rejects.toThrow('PRODUCT_CONFIGS environment variable is not set');
  });
});
