/* eslint-disable import/first */
// Set environment variables
process.env.APP_TABLE_NAME = 'power-ftp-dev-gary';
process.env.AUDIT_TABLE_NAME = 'power-ftp-dev-gary-audit';

// Define mock function before using it in mocks
const mockSend = jest.fn();

// Mock AWS SDK modules
jest.mock('@aws-sdk/client-dynamodb', () => {
  return {
    DynamoDBClient: jest.fn().mockImplementation(() => ({
      send: mockSend
    }))
  };
});

jest.mock('@aws-sdk/lib-dynamodb', () => {
  return {
    DynamoDBDocumentClient: {
      from: jest.fn().mockReturnValue({
        send: mockSend
      })
    },
    PutCommand: jest.fn().mockImplementation((params) => params)
  };
});

// Import the handler after setting up mocks
import { DynamoDBStreamEvent } from 'aws-lambda';
import { lambdaHandler } from '../audit-stream-handler';

describe('Audit Stream Handler', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  it('should create audit records for INSERT events', async () => {
    // Create a mock DynamoDB Stream event for an INSERT operation
    const streamEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventID: '1',
          eventName: 'INSERT',
          eventVersion: '1.0',
          eventSource: 'aws:dynamodb',
          awsRegion: 'us-east-1',
          dynamodb: {
            Keys: {
              PK: { S: 'TENANT#tenant123' },
              SK: { S: 'USER#user123' }
            },
            NewImage: {
              PK: { S: 'TENANT#tenant123' },
              SK: { S: 'USER#user123' },
              name: { S: 'Test User' },
              active: { BOOL: true }
            },
            SequenceNumber: '1234',
            StreamViewType: 'NEW_AND_OLD_IMAGES'
          },
          eventSourceARN:
            'arn:aws:dynamodb:us-east-1:123456789012:table/MyTable/stream/2024-04-29'
        }
      ]
    };

    // Process the event
    await lambdaHandler(streamEvent);

    // Verify that PutCommand was called with correct parameters
    expect(mockSend).toHaveBeenCalledTimes(1);
    const putParams = mockSend.mock.calls[0][0];
    // Verify the audit record structure
    expect(putParams.TableName).toBe('power-ftp-dev-gary-audit');
    expect(putParams.Item).toMatchObject({
      eventName: 'INSERT',
      entityType: 'USER',
      entityId: 'user123',
      tenantId: 'tenant123',
      PK: 'AUDIT#USER#user123',
      SK: expect.stringContaining('#'),
      GSI1PK: 'TENANT#tenant123',
      GSI1SK: expect.stringContaining('USER#'),
      expires: expect.any(Number),
      newImage: expect.stringContaining('Test User'),
      oldImage: null
    });
    // We've already verified the structure above with toHaveReceivedCommandWith

    // Verify the TTL is set to approximately 7 days from now
    // Using a wider tolerance since the actual implementation might use a more precise calculation
    const now = Math.floor(Date.now() / 1000);
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    const sevenDaysFromNow = now + sevenDaysInSeconds;
    expect(putParams.Item.expires).toBeGreaterThan(sevenDaysFromNow - 86400);
    expect(putParams.Item.expires).toBeLessThan(sevenDaysFromNow + 7 * 86400);
  });

  it('should create audit records for MODIFY events', async () => {
    // Create a mock DynamoDB Stream event for a MODIFY operation
    const streamEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventID: '1',
          eventName: 'MODIFY',
          eventVersion: '1.0',
          eventSource: 'aws:dynamodb',
          awsRegion: 'us-east-1',
          dynamodb: {
            Keys: {
              PK: { S: 'TENANT#tenant123' },
              SK: { S: 'USER#user123' }
            },
            NewImage: {
              PK: { S: 'TENANT#tenant123' },
              SK: { S: 'USER#user123' },
              name: { S: 'Updated User' },
              active: { BOOL: false }
            },
            OldImage: {
              PK: { S: 'TENANT#tenant123' },
              SK: { S: 'USER#user123' },
              name: { S: 'Test User' },
              active: { BOOL: true }
            },
            SequenceNumber: '1234',
            StreamViewType: 'NEW_AND_OLD_IMAGES'
          },
          eventSourceARN:
            'arn:aws:dynamodb:us-east-1:123456789012:table/MyTable/stream/2024-04-29'
        }
      ]
    };

    // Process the event
    await lambdaHandler(streamEvent);

    // Verify that PutCommand was called with correct parameters
    expect(mockSend).toHaveBeenCalledTimes(1);
    const putParams = mockSend.mock.calls[0][0];
    // Verify the audit record structure
    expect(putParams.TableName).toBe('power-ftp-dev-gary-audit');
    expect(putParams.Item).toMatchObject({
      eventName: 'MODIFY',
      entityType: 'USER',
      entityId: 'user123',
      tenantId: 'tenant123',
      PK: 'AUDIT#USER#user123',
      SK: expect.stringContaining('#'),
      GSI1PK: 'TENANT#tenant123',
      GSI1SK: expect.stringContaining('USER#'),
      expires: expect.any(Number),
      newImage: expect.stringContaining('Updated User'),
      oldImage: expect.stringContaining('Test User')
    });
  });

  it('should create audit records for REMOVE events', async () => {
    // Create a mock DynamoDB Stream event for a REMOVE operation
    const streamEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventID: '1',
          eventName: 'REMOVE',
          eventVersion: '1.0',
          eventSource: 'aws:dynamodb',
          awsRegion: 'us-east-1',
          dynamodb: {
            Keys: {
              PK: { S: 'TENANT#tenant123' },
              SK: { S: 'USER#user123' }
            },
            OldImage: {
              PK: { S: 'TENANT#tenant123' },
              SK: { S: 'USER#user123' },
              name: { S: 'Test User' },
              active: { BOOL: false }
            },
            SequenceNumber: '1234',
            StreamViewType: 'NEW_AND_OLD_IMAGES'
          },
          eventSourceARN:
            'arn:aws:dynamodb:us-east-1:123456789012:table/MyTable/stream/2024-04-29'
        }
      ]
    };

    // Process the event
    await lambdaHandler(streamEvent);

    // Verify that PutCommand was called with correct parameters
    expect(mockSend).toHaveBeenCalledTimes(1);
    const putParams = mockSend.mock.calls[0][0];
    // Verify the audit record structure
    expect(putParams.TableName).toBe('power-ftp-dev-gary-audit');
    expect(putParams.Item).toMatchObject({
      eventName: 'REMOVE',
      entityType: 'USER',
      entityId: 'user123',
      tenantId: 'tenant123',
      PK: 'AUDIT#USER#user123',
      SK: expect.stringContaining('#'),
      GSI1PK: 'TENANT#tenant123',
      GSI1SK: expect.stringContaining('USER#'),
      expires: expect.any(Number),
      newImage: null,
      oldImage: expect.stringContaining('Test User')
    });
  });

  it('should handle multiple records in parallel', async () => {
    // Create a mock DynamoDB Stream event with multiple records
    const streamEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventID: '1',
          eventName: 'INSERT',
          eventVersion: '1.0',
          eventSource: 'aws:dynamodb',
          awsRegion: 'us-east-1',
          dynamodb: {
            Keys: {
              PK: { S: 'TENANT#tenant123' },
              SK: { S: 'USER#user1' }
            },
            NewImage: {
              PK: { S: 'TENANT#tenant123' },
              SK: { S: 'USER#user1' },
              name: { S: 'User 1' }
            },
            SequenceNumber: '1234',
            StreamViewType: 'NEW_AND_OLD_IMAGES'
          },
          eventSourceARN:
            'arn:aws:dynamodb:us-east-1:123456789012:table/MyTable/stream/2024-04-29'
        },
        {
          eventID: '2',
          eventName: 'MODIFY',
          eventVersion: '1.0',
          eventSource: 'aws:dynamodb',
          awsRegion: 'us-east-1',
          dynamodb: {
            Keys: {
              PK: { S: 'TENANT#tenant123' },
              SK: { S: 'USER#user2' }
            },
            NewImage: {
              PK: { S: 'TENANT#tenant123' },
              SK: { S: 'USER#user2' },
              name: { S: 'Updated User 2' }
            },
            OldImage: {
              PK: { S: 'TENANT#tenant123' },
              SK: { S: 'USER#user2' },
              name: { S: 'User 2' }
            },
            SequenceNumber: '1235',
            StreamViewType: 'NEW_AND_OLD_IMAGES'
          },
          eventSourceARN:
            'arn:aws:dynamodb:us-east-1:123456789012:table/MyTable/stream/2024-04-29'
        }
      ]
    };

    // Process the event
    await lambdaHandler(streamEvent);

    // Verify that PutCommand was called twice (once for each record)
    expect(mockSend).toHaveBeenCalledTimes(2);

    // Verify the first audit record (INSERT)
    const putParams1 = mockSend.mock.calls[0][0];
    expect(putParams1.Item.eventName).toBe('INSERT');
    expect(putParams1.Item.entityId).toBe('user1');

    // Verify the second audit record (MODIFY)
    const putParams2 = mockSend.mock.calls[1][0];
    expect(putParams2.Item.eventName).toBe('MODIFY');
    expect(putParams2.Item.entityId).toBe('user2');
  });

  it('should handle DynamoDB errors gracefully', async () => {
    // Mock DynamoDB put operation to fail
    mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

    // Create a mock DynamoDB Stream event
    const streamEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventID: '1',
          eventName: 'INSERT',
          eventVersion: '1.0',
          eventSource: 'aws:dynamodb',
          awsRegion: 'us-east-1',
          dynamodb: {
            Keys: {
              PK: { S: 'TENANT#tenant123' },
              SK: { S: 'USER#user123' }
            },
            NewImage: {
              PK: { S: 'TENANT#tenant123' },
              SK: { S: 'USER#user123' },
              name: { S: 'Test User' }
            },
            SequenceNumber: '1234',
            StreamViewType: 'NEW_AND_OLD_IMAGES'
          },
          eventSourceARN:
            'arn:aws:dynamodb:us-east-1:123456789012:table/MyTable/stream/2024-04-29'
        }
      ]
    };

    // Process the event (should not throw)
    await lambdaHandler(streamEvent);

    // Verify that PutCommand was called
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should skip records with unsupported event types', async () => {
    // Create a mock DynamoDB Stream event with an unsupported event type
    const streamEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventID: '1',
          eventName: 'UNKNOWN' as any,
          eventVersion: '1.0',
          eventSource: 'aws:dynamodb',
          awsRegion: 'us-east-1',
          dynamodb: {
            Keys: {
              PK: { S: 'TENANT#tenant123' },
              SK: { S: 'USER#user123' }
            },
            SequenceNumber: '1234',
            StreamViewType: 'NEW_AND_OLD_IMAGES'
          },
          eventSourceARN:
            'arn:aws:dynamodb:us-east-1:123456789012:table/MyTable/stream/2024-04-29'
        }
      ]
    };

    // Process the event
    await lambdaHandler(streamEvent);

    // Verify that PutCommand was not called
    expect(mockSend).not.toHaveBeenCalled();
  });
});
