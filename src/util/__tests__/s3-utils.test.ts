/* eslint-disable import/first */
process.env.TRANSFER_BUCKET_NAME = 'test-transfer-bucket';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectTaggingCommand,
  HeadObjectCommand,
  PutObjectCommand,
  PutObjectTaggingCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { SQSEvent } from 'aws-lambda';
import { Readable } from 'stream';
import {
  addS3ObjectTag,
  checkFolderExists,
  copyS3Object,
  createFolder,
  deleteS3Object,
  ensureSubfoldersExist,
  ensureUserHomeDirectoryExists,
  hasS3ObjectTag,
  isImageFile,
  parseS3EventsFromSQS
} from '../s3-utils';

// Mock the S3 client
jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend
    })),
    GetObjectCommand: jest.fn(),
    PutObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    GetObjectTaggingCommand: jest.fn(),
    PutObjectTaggingCommand: jest.fn(),
    HeadObjectCommand: jest.fn()
  };
});

describe('S3 Utils', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseS3EventsFromSQS', () => {
    it('should parse S3 events from SQS messages', () => {
      const sqsEvent: SQSEvent = {
        Records: [
          {
            body: JSON.stringify({
              Records: [
                {
                  eventSource: 'aws:s3',
                  eventName: 'ObjectCreated:Put',
                  s3: {
                    bucket: { name: 'test-bucket' },
                    object: { key: 'test-key', size: 1024 }
                  },
                  eventTime: '2023-01-01T00:00:00.000Z'
                }
              ]
            }),
            messageId: '1',
            receiptHandle: 'handle',
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1',
              SenderId: 'sender',
              ApproximateFirstReceiveTimestamp: '1'
            },
            messageAttributes: {},
            md5OfBody: 'md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn',
            awsRegion: 'us-east-1'
          }
        ]
      };

      const result = parseS3EventsFromSQS(sqsEvent);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        bucket: 'test-bucket',
        key: 'test-key',
        eventName: 'ObjectCreated:Put',
        eventTime: '2023-01-01T00:00:00.000Z',
        size: 1024
      });
    });

    it('should handle URL-encoded keys', () => {
      const sqsEvent: SQSEvent = {
        Records: [
          {
            body: JSON.stringify({
              Records: [
                {
                  eventSource: 'aws:s3',
                  eventName: 'ObjectCreated:Put',
                  s3: {
                    bucket: { name: 'test-bucket' },
                    object: { key: 'test+key+with+spaces', size: 1024 }
                  },
                  eventTime: '2023-01-01T00:00:00.000Z'
                }
              ]
            }),
            messageId: '1',
            receiptHandle: 'handle',
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1',
              SenderId: 'sender',
              ApproximateFirstReceiveTimestamp: '1'
            },
            messageAttributes: {},
            md5OfBody: 'md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn',
            awsRegion: 'us-east-1'
          }
        ]
      };

      const result = parseS3EventsFromSQS(sqsEvent);
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('test key with spaces');
    });

    it('should handle invalid JSON in SQS message body', () => {
      const sqsEvent: SQSEvent = {
        Records: [
          {
            body: 'invalid-json',
            messageId: '1',
            receiptHandle: 'handle',
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1',
              SenderId: 'sender',
              ApproximateFirstReceiveTimestamp: '1'
            },
            messageAttributes: {},
            md5OfBody: 'md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn',
            awsRegion: 'us-east-1'
          }
        ]
      };

      const result = parseS3EventsFromSQS(sqsEvent);
      expect(result).toHaveLength(0);
    });
  });

  describe('hasS3ObjectTag', () => {
    it('should return true when object has the specified tag', async () => {
      const mockS3Client = new S3Client({});
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({
        TagSet: [
          { Key: 'tag1', Value: 'value1' },
          { Key: 'tag2', Value: 'value2' }
        ]
      });

      const result = await hasS3ObjectTag('bucket', 'key', 'tag1', 'value1');
      expect(result).toBe(true);
      expect(GetObjectTaggingCommand).toHaveBeenCalledWith({
        Bucket: 'bucket',
        Key: 'key'
      });
    });

    it('should return false when object does not have the specified tag', async () => {
      const mockS3Client = new S3Client({});
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({
        TagSet: [
          { Key: 'tag1', Value: 'value1' },
          { Key: 'tag2', Value: 'value2' }
        ]
      });

      const result = await hasS3ObjectTag('bucket', 'key', 'tag3', 'value3');
      expect(result).toBe(false);
    });

    it('should return false when object has no tags', async () => {
      const mockS3Client = new S3Client({});
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      const result = await hasS3ObjectTag('bucket', 'key', 'tag1', 'value1');
      expect(result).toBe(false);
    });
  });

  describe('addS3ObjectTag', () => {
    it('should add a new tag to an object', async () => {
      const mockS3Client = new S3Client({});
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({
        TagSet: [{ Key: 'existingTag', Value: 'existingValue' }]
      });
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      await addS3ObjectTag('bucket', 'key', 'newTag', 'newValue');

      expect(GetObjectTaggingCommand).toHaveBeenCalledWith({
        Bucket: 'bucket',
        Key: 'key'
      });

      expect(PutObjectTaggingCommand).toHaveBeenCalledWith({
        Bucket: 'bucket',
        Key: 'key',
        Tagging: {
          TagSet: [
            { Key: 'existingTag', Value: 'existingValue' },
            { Key: 'newTag', Value: 'newValue' }
          ]
        }
      });
    });

    it('should update an existing tag', async () => {
      const mockS3Client = new S3Client({});
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({
        TagSet: [
          { Key: 'tag1', Value: 'value1' },
          { Key: 'tag2', Value: 'oldValue' }
        ]
      });
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      await addS3ObjectTag('bucket', 'key', 'tag2', 'newValue');

      expect(PutObjectTaggingCommand).toHaveBeenCalledWith({
        Bucket: 'bucket',
        Key: 'key',
        Tagging: {
          TagSet: [
            { Key: 'tag1', Value: 'value1' },
            { Key: 'tag2', Value: 'newValue' }
          ]
        }
      });
    });
  });

  describe('deleteS3Object', () => {
    it('should delete an S3 object', async () => {
      const mockS3Client = new S3Client({});
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      await deleteS3Object('bucket', 'key');

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'bucket',
        Key: 'key'
      });
    });
  });

  describe('isImageFile', () => {
    it('should return true for image file extensions', () => {
      expect(isImageFile('test.jpg')).toBe(true);
      expect(isImageFile('test.jpeg')).toBe(true);
      expect(isImageFile('test.png')).toBe(true);
      expect(isImageFile('test.gif')).toBe(true);
      expect(isImageFile('test.bmp')).toBe(true);
      expect(isImageFile('test.tiff')).toBe(true);
      expect(isImageFile('test.webp')).toBe(true);
      expect(isImageFile('path/to/image.JPG')).toBe(true); // Case insensitive
    });

    it('should return false for non-image file extensions', () => {
      expect(isImageFile('test.txt')).toBe(false);
      expect(isImageFile('test.pdf')).toBe(false);
      expect(isImageFile('test.doc')).toBe(false);
      expect(isImageFile('test')).toBe(false);
    });
  });

  describe('copyS3Object', () => {
    it('should copy an object from one bucket to another', async () => {
      const mockS3Client = new S3Client({});
      const mockStream = new Readable({
        read() {} // eslint-disable-line @typescript-eslint/no-empty-function
      });

      // Mock the GetObjectCommand response
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({
        Body: mockStream,
        ContentType: 'text/plain'
      });

      // Mock the PutObjectCommand response
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      // Simulate the stream emitting data and ending
      setTimeout(() => {
        mockStream.emit('data', Buffer.from('test data'));
        mockStream.emit('end');
      }, 0);

      await copyS3Object('sourceBucket', 'sourceKey', 'destBucket');

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'sourceBucket',
        Key: 'sourceKey'
      });

      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'destBucket',
          Key: 'sourceKey',
          ContentType: 'text/plain'
        })
      );
    });

    it('should use a custom destination key if provided', async () => {
      const mockS3Client = new S3Client({});
      const mockStream = new Readable({
        read() {} // eslint-disable-line @typescript-eslint/no-empty-function
      });

      // Mock the GetObjectCommand response
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({
        Body: mockStream,
        ContentType: 'text/plain'
      });

      // Mock the PutObjectCommand response
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      // Simulate the stream emitting data and ending
      setTimeout(() => {
        mockStream.emit('data', Buffer.from('test data'));
        mockStream.emit('end');
      }, 0);

      await copyS3Object(
        'sourceBucket',
        'sourceKey',
        'destBucket',
        'customDestKey'
      );

      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'destBucket',
          Key: 'customDestKey'
        })
      );
    });

    it('should delete the source object if deleteSource option is true', async () => {
      const mockS3Client = new S3Client({});
      const mockStream = new Readable({
        read() {} // eslint-disable-line @typescript-eslint/no-empty-function
      });

      // Mock the GetObjectCommand response
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({
        Body: mockStream,
        ContentType: 'text/plain'
      });

      // Mock the PutObjectCommand response
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      // Mock the DeleteObjectCommand response
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      // Simulate the stream emitting data and ending
      setTimeout(() => {
        mockStream.emit('data', Buffer.from('test data'));
        mockStream.emit('end');
      }, 0);

      await copyS3Object('sourceBucket', 'sourceKey', 'destBucket', undefined, {
        deleteSource: true
      });

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'sourceBucket',
        Key: 'sourceKey'
      });
    });

    it('should throw an error if the object body is empty', async () => {
      const mockS3Client = new S3Client({});

      // Mock the GetObjectCommand response with no Body
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      await expect(
        copyS3Object('sourceBucket', 'sourceKey', 'destBucket')
      ).rejects.toThrow('Empty file body');
    });
  });

  describe('ensureUserHomeDirectoryExists', () => {
    it('should create a home directory if it does not exist', async () => {
      const mockS3Client = new S3Client({});

      // Mock the HeadObjectCommand to throw an error (directory doesn't exist)
      (mockS3Client.send as jest.Mock).mockRejectedValueOnce(
        new Error('Not found')
      );

      // Mock the PutObjectCommand response
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      await ensureUserHomeDirectoryExists('testuser');

      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-transfer-bucket',
        Key: 'testuser/'
      });

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-transfer-bucket',
        Key: 'testuser/',
        Body: '',
        ContentLength: 0
      });
    });

    it('should not create a home directory if it already exists', async () => {
      const mockS3Client = new S3Client({});

      // Mock the HeadObjectCommand to succeed (directory exists)
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      await ensureUserHomeDirectoryExists('testuser');

      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-transfer-bucket',
        Key: 'testuser/'
      });

      // PutObjectCommand should not be called
      expect(PutObjectCommand).not.toHaveBeenCalled();
    });

    it('should throw an error if TRANSFER_BUCKET_NAME is not set', async () => {
      // Temporarily unset the environment variable
      const originalBucketName = process.env.TRANSFER_BUCKET_NAME;
      delete process.env.TRANSFER_BUCKET_NAME;

      await expect(ensureUserHomeDirectoryExists('testuser')).rejects.toThrow(
        'TRANSFER_BUCKET_NAME environment variable is not set'
      );

      // Restore the environment variable
      process.env.TRANSFER_BUCKET_NAME = originalBucketName;
    });
  });

  describe('checkFolderExists', () => {
    it('should return true if folder exists', async () => {
      const mockS3Client = new S3Client({});
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      const result = await checkFolderExists('test-bucket', 'path/to/folder');

      expect(result).toBe(true);
      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'path/to/folder/'
      });
    });

    it('should add trailing slash if not provided', async () => {
      const mockS3Client = new S3Client({});
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      await checkFolderExists('test-bucket', 'path/to/folder');

      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'path/to/folder/'
      });
    });

    it('should return false if folder does not exist', async () => {
      const mockS3Client = new S3Client({});
      const notFoundError = new Error('Not Found');
      (notFoundError as any).name = 'NotFound';
      (mockS3Client.send as jest.Mock).mockRejectedValueOnce(notFoundError);

      const result = await checkFolderExists(
        'test-bucket',
        'nonexistent/folder/'
      );

      expect(result).toBe(false);
      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'nonexistent/folder/'
      });
    });

    it('should throw error if S3 operation fails with non-NotFound error', async () => {
      const mockS3Client = new S3Client({});
      const unexpectedError = new Error('Unexpected error');
      (mockS3Client.send as jest.Mock).mockRejectedValueOnce(unexpectedError);

      await expect(
        checkFolderExists('test-bucket', 'path/to/folder')
      ).rejects.toThrow('Unexpected error');
    });
  });

  describe('createFolder', () => {
    it('should create a folder in S3', async () => {
      const mockS3Client = new S3Client({});
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      await createFolder('test-bucket', 'path/to/folder');

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'path/to/folder/',
        Body: '',
        ContentType: 'application/x-directory'
      });
    });

    it('should add trailing slash if not provided', async () => {
      const mockS3Client = new S3Client({});
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      await createFolder('test-bucket', 'path/to/folder');

      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: 'path/to/folder/'
        })
      );
    });

    it('should throw error if S3 operation fails', async () => {
      const mockS3Client = new S3Client({});
      const unexpectedError = new Error('Failed to create folder');
      (mockS3Client.send as jest.Mock).mockRejectedValueOnce(unexpectedError);

      await expect(
        createFolder('test-bucket', 'path/to/folder')
      ).rejects.toThrow('Failed to create folder');
    });
  });

  describe('ensureSubfoldersExist', () => {
    it('should check if folders exist and create them if not', async () => {
      const mockS3Client = new S3Client({});

      // Mock for first folder check (does not exist)
      const notFoundError = new Error('Not Found');
      (notFoundError as any).name = 'NotFound';
      (mockS3Client.send as jest.Mock).mockRejectedValueOnce(notFoundError);

      // Mock for first folder creation
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      // Mock for second folder check (exists)
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      await ensureSubfoldersExist('test-bucket', 'tenant123', [
        'folder1',
        'folder2'
      ]);

      // First folder check
      expect(HeadObjectCommand).toHaveBeenNthCalledWith(1, {
        Bucket: 'test-bucket',
        Key: 'tenant123/folder1/'
      });

      // First folder creation
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'tenant123/folder1/',
        Body: '',
        ContentType: 'application/x-directory'
      });

      // Second folder check
      expect(HeadObjectCommand).toHaveBeenNthCalledWith(2, {
        Bucket: 'test-bucket',
        Key: 'tenant123/folder2/'
      });

      // Second folder should not need creation
      expect(PutObjectCommand).toHaveBeenCalledTimes(1);
    });

    it('should process folders sequentially', async () => {
      const mockS3Client = new S3Client({});

      // All folders don't exist
      const notFoundError = new Error('Not Found');
      (notFoundError as any).name = 'NotFound';
      (mockS3Client.send as jest.Mock).mockRejectedValueOnce(notFoundError);
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({}); // First folder creation
      (mockS3Client.send as jest.Mock).mockRejectedValueOnce(notFoundError);
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({}); // Second folder creation

      await ensureSubfoldersExist('test-bucket', 'tenant123', [
        'folder1',
        'folder2'
      ]);

      // Verify sequential operations (order matters)
      expect(HeadObjectCommand).toHaveBeenNthCalledWith(1, {
        Bucket: 'test-bucket',
        Key: 'tenant123/folder1/'
      });

      expect(PutObjectCommand).toHaveBeenNthCalledWith(1, {
        Bucket: 'test-bucket',
        Key: 'tenant123/folder1/',
        Body: '',
        ContentType: 'application/x-directory'
      });

      expect(HeadObjectCommand).toHaveBeenNthCalledWith(2, {
        Bucket: 'test-bucket',
        Key: 'tenant123/folder2/'
      });

      expect(PutObjectCommand).toHaveBeenNthCalledWith(2, {
        Bucket: 'test-bucket',
        Key: 'tenant123/folder2/',
        Body: '',
        ContentType: 'application/x-directory'
      });
    });

    it('should handle empty folder prefixes array', async () => {
      await ensureSubfoldersExist('test-bucket', 'tenant123', []);

      // No operations should be performed
      expect(HeadObjectCommand).not.toHaveBeenCalled();
      expect(PutObjectCommand).not.toHaveBeenCalled();
    });
  });
});
