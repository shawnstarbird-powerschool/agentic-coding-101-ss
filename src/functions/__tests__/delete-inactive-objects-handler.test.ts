/* eslint-disable import/first */
// Set the environment variable for testing
process.env.APP_TABLE_NAME = 'test-table';
process.env.TRANSFER_BUCKET_PROD1_EXT = 'test-ext-bucket';
process.env.TRANSFER_BUCKET_PROD1_INT = 'test-int-bucket';

import { Folder, Product, User } from '../../util/db-schema';
import { deleteS3Object } from '../../util/s3-utils';
import { lambdaHandler } from '../delete-inactive-objects-handler';
/* eslint-enable import/first */

// Mock modules
jest.mock('../../util/db-schema', () => {
  const originalModule = jest.requireActual('../../util/db-schema');
  return {
    ...originalModule,
    User: {
      find: jest.fn(),
      remove: jest.fn()
    },
    Folder: {
      find: jest.fn(),
      remove: jest.fn()
    },
    Product: {
      get: jest.fn()
    }
  };
});

jest.mock('../../util/s3-utils', () => ({
  deleteS3Object: jest.fn()
}));

describe('delete-inactive-objects-handler', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Default mock implementations for folders - empty array
    (Folder.find as jest.Mock).mockResolvedValue([]);

    // Default mock implementations for users - empty array
    (User.find as jest.Mock).mockResolvedValue([]);

    // Default mock implementation for S3 operations
    (deleteS3Object as jest.Mock).mockResolvedValue({});
  });

  it('should delete inactive users and create audit records', async () => {
    // Current time for testing
    const now = Date.now();
    const sevenMonthsAgo = now - 7 * 30 * 24 * 60 * 60 * 1000;
    const fiveMonthsAgo = now - 5 * 30 * 24 * 60 * 60 * 1000;
    const fortyDaysAgo = now - 40 * 24 * 60 * 60 * 1000; // 40 days ago
    const twentyDaysAgo = now - 20 * 24 * 60 * 60 * 1000; // 20 days ago

    // Mock users data
    const mockUsers = [
      // User who hasn't logged in for more than 6 months (should be deleted)
      {
        id: 'user1',
        tenantId: 'tenant1',
        username: 'inactive-user1',
        lastLogin: sevenMonthsAgo,
        isProductUser: false,
        active: true,
        created: new Date(sevenMonthsAgo).toISOString(),
        updated: new Date(sevenMonthsAgo).toISOString()
      },
      // User who has never logged in but was created more than 6 months ago (should be deleted)
      {
        id: 'user2',
        tenantId: 'tenant1',
        username: 'inactive-user2',
        lastLogin: null,
        isProductUser: false,
        active: true,
        created: new Date(sevenMonthsAgo).toISOString(),
        updated: new Date(sevenMonthsAgo).toISOString()
      },
      // User who is inactive and hasn't been updated in more than 30 days (should be deleted)
      {
        id: 'user3',
        tenantId: 'tenant1',
        username: 'inactive-status-user',
        lastLogin: fiveMonthsAgo,
        isProductUser: false,
        active: false,
        created: new Date(sevenMonthsAgo).toISOString(),
        updated: new Date(fortyDaysAgo).toISOString()
      },
      // Recent active user (should not be deleted)
      {
        id: 'user4',
        tenantId: 'tenant1',
        username: 'active-user',
        lastLogin: fiveMonthsAgo,
        isProductUser: false,
        active: true,
        created: new Date(sevenMonthsAgo).toISOString(),
        updated: new Date(fiveMonthsAgo).toISOString()
      },
      // Inactive user updated recently (should not be deleted)
      {
        id: 'user5',
        tenantId: 'tenant1',
        username: 'recent-inactive-user',
        lastLogin: fiveMonthsAgo,
        isProductUser: false,
        active: false,
        created: new Date(sevenMonthsAgo).toISOString(),
        updated: new Date(twentyDaysAgo).toISOString()
      },
      // Product user (should not be deleted even if inactive)
      {
        id: 'user6',
        tenantId: 'tenant1',
        username: 'product-user',
        lastLogin: sevenMonthsAgo,
        isProductUser: true,
        active: false,
        created: new Date(sevenMonthsAgo).toISOString(),
        updated: new Date(fortyDaysAgo).toISOString()
      }
    ];

    // Mock User.find to return our test users
    (User.find as jest.Mock).mockResolvedValue(mockUsers);

    // Mock User.remove to succeed
    (User.remove as jest.Mock).mockResolvedValue({});

    // Call the handler
    const result = await lambdaHandler();

    // Parse the response body
    const responseBody = JSON.parse(result.body);

    // Verify the response
    expect(result.statusCode).toBe(200);
    expect(responseBody.usersDeleted).toBe(3);

    // Verify User.remove was called three times (for the three inactive users)
    expect(User.remove).toHaveBeenCalledTimes(3);

    // Verify it was called with the correct user IDs
    expect(User.remove).toHaveBeenCalledWith({
      tenantId: 'tenant1',
      id: 'user1'
    });
    expect(User.remove).toHaveBeenCalledWith({
      tenantId: 'tenant1',
      id: 'user2'
    });
    expect(User.remove).toHaveBeenCalledWith({
      tenantId: 'tenant1',
      id: 'user3'
    });
  });

  it('should delete inactive folders and their S3 objects', async () => {
    // Current time for testing
    const now = Date.now();
    const fortyDaysAgo = now - 40 * 24 * 60 * 60 * 1000; // 40 days ago
    const twentyDaysAgo = now - 20 * 24 * 60 * 60 * 1000; // 20 days ago

    // Mock Product.get to return a product
    const mockProduct = {
      id: 'product123',
      productCode: 'PROD1',
      name: 'Test Product'
    };
    (Product.get as jest.Mock).mockResolvedValue(mockProduct);

    // Mock folders data
    const mockFolders = [
      // Inactive folder that hasn't been updated in more than 30 days (should be deleted)
      {
        id: 'folder1',
        tenantId: 'tenant1',
        productId: 'product123',
        path: '/inactive-folder',
        active: false,
        updated: new Date(fortyDaysAgo).toISOString()
      },
      // Inactive folder updated recently (should not be deleted)
      {
        id: 'folder2',
        tenantId: 'tenant1',
        productId: 'product123',
        path: '/recent-inactive-folder',
        active: false,
        updated: new Date(twentyDaysAgo).toISOString()
      },
      // Active folder (should not be deleted)
      {
        id: 'folder3',
        tenantId: 'tenant1',
        productId: 'product123',
        path: '/active-folder',
        active: true,
        updated: new Date(fortyDaysAgo).toISOString()
      }
    ];

    // Mock empty users array so only folders are processed
    (User.find as jest.Mock).mockResolvedValue([]);

    // Mock Folder.find to return our test folders
    (Folder.find as jest.Mock).mockResolvedValue(mockFolders);

    // Mock Folder.remove to succeed
    (Folder.remove as jest.Mock).mockResolvedValue({});

    // Call the handler
    const result = await lambdaHandler();

    // Parse the response body
    const responseBody = JSON.parse(result.body);

    // Verify the response
    expect(result.statusCode).toBe(200);
    expect(responseBody.foldersDeleted).toBe(1);

    // Verify Folder.remove was called once (for the inactive folder)
    expect(Folder.remove).toHaveBeenCalledTimes(1);

    // Verify it was called with the correct folder ID
    expect(Folder.remove).toHaveBeenCalledWith({
      tenantId: 'tenant1',
      id: 'folder1'
    });

    // Verify S3 deletion was called twice (once for each bucket)
    expect(deleteS3Object).toHaveBeenCalledTimes(2);

    // Verify the correct S3 keys were deleted
    expect(deleteS3Object).toHaveBeenCalledWith(
      'test-ext-bucket',
      'tenant1/inactive-folder/'
    );
    expect(deleteS3Object).toHaveBeenCalledWith(
      'test-int-bucket',
      'tenant1/inactive-folder/'
    );
  });

  it('should handle errors and return a 500 response', async () => {
    // Mock User.find to throw an error
    (User.find as jest.Mock).mockRejectedValue(new Error('Database error'));

    // Call the handler
    const result = await lambdaHandler();

    // Verify the response
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe(true);

    // Verify User.remove was not called
    expect(User.remove).not.toHaveBeenCalled();
  });

  it('should handle an empty user list', async () => {
    // Mock User.find to return an empty array
    (User.find as jest.Mock).mockResolvedValue([]);

    // Call the handler
    const result = await lambdaHandler();

    // Parse the response body
    const responseBody = JSON.parse(result.body);

    // Verify the response
    expect(result.statusCode).toBe(200);
    expect(responseBody.usersDeleted).toBe(0);

    // Verify User.remove was not called
    expect(User.remove).not.toHaveBeenCalled();
  });

  it('should handle S3 deletion errors but still delete the folder record', async () => {
    // Current time for testing
    const now = Date.now();
    const fortyDaysAgo = now - 40 * 24 * 60 * 60 * 1000; // 40 days ago

    // Mock folders data with one inactive folder
    const mockFolders = [
      {
        id: 'folder1',
        tenantId: 'tenant1',
        productId: 'product123',
        path: '/inactive-folder',
        active: false,
        updated: new Date(fortyDaysAgo).toISOString()
      }
    ];

    // Mock empty users array
    (User.find as jest.Mock).mockResolvedValue([]);

    // Mock folders
    (Folder.find as jest.Mock).mockResolvedValue(mockFolders);

    // Mock product
    (Product.get as jest.Mock).mockResolvedValue({
      id: 'product123',
      productCode: 'PROD1',
      name: 'Test Product'
    });

    // Mock S3 deletion to fail
    (deleteS3Object as jest.Mock).mockRejectedValue(new Error('S3 error'));

    // Mock Folder.remove to succeed
    (Folder.remove as jest.Mock).mockResolvedValue({});

    // Call the handler
    const result = await lambdaHandler();

    // Parse the response body
    const responseBody = JSON.parse(result.body);

    // Verify the response
    expect(result.statusCode).toBe(200);
    expect(responseBody.foldersDeleted).toBe(1);

    // Verify S3 deletion was attempted
    expect(deleteS3Object).toHaveBeenCalled();

    // Verify the folder was still deleted from the database
    expect(Folder.remove).toHaveBeenCalledWith({
      tenantId: 'tenant1',
      id: 'folder1'
    });
  });

  it('should handle a case when both users and folders are inactive', async () => {
    const now = Date.now();
    const sevenMonthsAgo = now - 7 * 30 * 24 * 60 * 60 * 1000;
    const fortyDaysAgo = now - 40 * 24 * 60 * 60 * 1000;

    // Mock one inactive user
    const mockUsers = [
      {
        id: 'user1',
        tenantId: 'tenant1',
        username: 'inactive-user',
        lastLogin: sevenMonthsAgo,
        isProductUser: false,
        active: true,
        created: new Date(sevenMonthsAgo).toISOString(),
        updated: new Date(sevenMonthsAgo).toISOString()
      }
    ];

    // Mock one inactive folder
    const mockFolders = [
      {
        id: 'folder1',
        tenantId: 'tenant1',
        productId: 'product123',
        path: '/inactive-folder',
        active: false,
        updated: new Date(fortyDaysAgo).toISOString()
      }
    ];

    // Set up mocks
    (User.find as jest.Mock).mockResolvedValue(mockUsers);
    (Folder.find as jest.Mock).mockResolvedValue(mockFolders);
    (Product.get as jest.Mock).mockResolvedValue({
      id: 'product123',
      productCode: 'PROD1',
      name: 'Test Product'
    });
    (deleteS3Object as jest.Mock).mockResolvedValue({});
    (User.remove as jest.Mock).mockResolvedValue({});
    (Folder.remove as jest.Mock).mockResolvedValue({});

    // Call the handler
    const result = await lambdaHandler();

    // Parse the response body
    const responseBody = JSON.parse(result.body);

    // Verify the response
    expect(result.statusCode).toBe(200);
    expect(responseBody.usersDeleted).toBe(1);
    expect(responseBody.foldersDeleted).toBe(1);

    // Verify both objects were deleted
    expect(User.remove).toHaveBeenCalledTimes(1);
    expect(Folder.remove).toHaveBeenCalledTimes(1);
    expect(deleteS3Object).toHaveBeenCalledTimes(2); // Once for each bucket
  });
});
