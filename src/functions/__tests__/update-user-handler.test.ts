/* eslint-disable import/first */
process.env.APP_TABLE_NAME = 'power-ftp-dev-gary';

import { APIGatewayProxyEvent } from 'aws-lambda';
import { Folder, Product, User } from '../../util/db-schema';
import { lambdaHandler as handler } from '../update-user-handler';
/* eslint-enable import/first */

// Mock the Product, User, and Folder models
jest.mock('../../util/db-schema', () => {
  const originalModule = jest.requireActual('../../util/db-schema');
  return {
    ...originalModule,
    Product: {
      find: jest.fn()
    },
    User: {
      find: jest.fn(),
      get: jest.fn(),
      update: jest.fn()
    },
    Folder: {
      find: jest.fn()
    }
  };
});

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed_password')
}));

describe('Update User Handler', () => {
  const mockDateNow = 1672531200000; // Jan 1, 2023 00:00:00 UTC
  let dateNowSpy: jest.SpyInstance;

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Date.now()
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(mockDateNow);
  });

  afterEach(() => {
    // Restore Date.now()
    dateNowSpy.mockRestore();
  });

  // Helper function to create a mock event
  const createMockEvent = (
    body: any = null,
    pathParameters: Record<string, string> = { id: 'user123' },
    authorizer: Record<string, any> = { district_uid: 'tenant123' }
  ): APIGatewayProxyEvent => {
    return {
      pathParameters,
      body: body ? JSON.stringify(body) : null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'PUT',
      isBase64Encoded: false,
      path: '',
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {
        authorizer
      } as any,
      resource: ''
    };
  };

  // Mock product data
  const mockProducts = [
    {
      id: 'product123',
      productCode: 'PROD1',
      productPublicKey: 'public-key-1',
      multiTenant: true,
      ipWhitelist: ['192.168.1.1/32'],
      uses: [{ name: 'use1' }, { name: 'use2' }],
      created: new Date('2023-01-01'),
      updated: new Date('2023-01-02')
    },
    {
      id: 'product456',
      productCode: 'PROD2',
      productPublicKey: 'public-key-2',
      multiTenant: false,
      uses: [{ name: 'use3' }],
      created: new Date('2023-01-01'),
      updated: new Date('2023-01-02')
    }
  ];

  // Mock folders data
  const mockFolders = [
    {
      id: 'folder123',
      tenantId: 'tenant123',
      productId: 'product123',
      use: 'use1',
      path: '/folder1',
      accessType: 'inbound',
      active: true
    },
    {
      id: 'folder456',
      tenantId: 'tenant123',
      productId: 'product456',
      use: 'use3',
      path: '/folder2',
      accessType: 'outbound',
      active: true
    }
  ];

  // Mock existing user
  const mockExistingUser = {
    id: 'user123',
    tenantId: 'tenant123',
    name: 'Test User',
    username: 'testuser',
    authenticationType: 'password',
    passwordHash: 'old_hashed_password',
    folders: ['folder123'],
    productId: 'product123',
    access: 'readwrite',
    created: new Date('2023-01-01')
  };

  // Mock updated user
  const mockUpdatedUser = {
    ...mockExistingUser,
    name: 'Updated User',
    passwordHash: 'hashed_password',
    updated: new Date('2023-01-02')
  };

  test('should return 401 when tenantId is missing from authorizer context', async () => {
    const event = createMockEvent(
      {
        name: 'Updated User',
        folders: ['folder123']
      },
      { id: 'user123' },
      {}
    );

    const result = await handler(event as any);
    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Unauthorized: Missing tenant ID',
      code: 'MISSING_TENANT_ID'
    });
  });

  test('should return 400 when userId is missing from path parameters', async () => {
    const event = createMockEvent(
      {
        name: 'Updated User',
        folders: ['folder123']
      },
      {}
    );

    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Bad request: Missing user ID',
      code: 'MISSING_USER_ID'
    });
  });

  test('should return 400 when request body is missing', async () => {
    const event = createMockEvent(null);
    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Bad request: Missing request body',
      code: 'MISSING_REQUEST_BODY'
    });
  });

  test('should return 404 when user is not found', async () => {
    // Mock User.get to return null (user not found)
    (User.get as jest.Mock).mockResolvedValue(null);

    const event = createMockEvent({
      name: 'Updated User',
      folders: ['folder123']
    });

    const result = await handler(event as any);
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  });

  test('should return 400 when folders have different productId than the user', async () => {
    // Mock User.get to return existing user
    (User.get as jest.Mock).mockResolvedValue(mockExistingUser);

    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);

    // Mock Folder.find to return array of folders
    (Folder.find as jest.Mock).mockResolvedValue(mockFolders);

    const event = createMockEvent({
      folders: ['folder123', 'folder456'] // folder456 has productId 'product456'
    });

    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Folders must belong to the same product as the user',
      invalidFolders: ['folder456'],
      code: 'INVALID_FOLDER_PRODUCT'
    });
  });

  test('should update a user successfully when folders have the same productId', async () => {
    // Mock User.get to return existing user
    (User.get as jest.Mock).mockResolvedValue(mockExistingUser);

    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);

    // Mock Folder.find to return array of folders
    (Folder.find as jest.Mock).mockResolvedValue(mockFolders);

    // Mock User.update to return updated user
    (User.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

    const event = createMockEvent({
      name: 'Updated User',
      folders: ['folder123'] // Only folder with productId 'product123'
    });

    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(responseBody.id).toBe('user123');
    expect(responseBody.name).toBe('Updated User');
    expect(responseBody.folders).toEqual(['folder123']);

    // Verify User.update was called with correct parameters
    expect(User.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        id: 'user123',
        name: 'Updated User',
        folders: ['folder123']
      })
    );
  });

  test('should handle productCode change and validate folders against new product', async () => {
    // Mock User.get to return existing user
    (User.get as jest.Mock).mockResolvedValue(mockExistingUser);

    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);

    // Mock Folder.find to return array of folders
    (Folder.find as jest.Mock).mockResolvedValue(mockFolders);

    const event = createMockEvent({
      productCode: 'PROD2', // Changing product from PROD1 to PROD2
      folders: ['folder456'] // This folder has productId 'product456' which matches PROD2
    });

    // Mock User.update to return updated user with new productId
    const userWithNewProduct = {
      ...mockUpdatedUser,
      productId: 'product456',
      folders: ['folder456']
    };
    (User.update as jest.Mock).mockResolvedValue(userWithNewProduct);

    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(responseBody.productId).toBe('product456');
    expect(responseBody.folders).toEqual(['folder456']);

    // Verify User.update was called with correct parameters
    expect(User.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        id: 'user123',
        productId: 'product456',
        folders: ['folder456']
      })
    );
  });

  test('should update user active status when active field is provided', async () => {
    // Mock User.get to return existing user
    (User.get as jest.Mock).mockResolvedValue(mockExistingUser);

    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);

    // Mock User.update to return updated user with active=false
    const deactivatedUser = {
      ...mockUpdatedUser,
      active: false
    };
    (User.update as jest.Mock).mockResolvedValue(deactivatedUser);

    const event = createMockEvent({
      active: false // Deactivate the user
    });

    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(responseBody.active).toBe(false);

    // Verify User.update was called with correct parameters
    expect(User.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        id: 'user123',
        active: false
      })
    );
  });

  describe('Temporary User Functionality on Update', () => {
    const baseUpdatePayload = {
      name: 'User To Be Temp'
    };

    beforeEach(() => {
      // Mock User.get to return existing user for all these tests
      (User.get as jest.Mock).mockResolvedValue(mockExistingUser);
      // Mock Product.find for product lookups if productCode changes (not in these specific tests)
      (Product.find as jest.Mock).mockResolvedValue(mockProducts);
      // Mock Folder.find for folder validation (not in these specific tests)
      (Folder.find as jest.Mock).mockResolvedValue(mockFolders);
      // Mock User.update to resolve with the data it was called with, merged with existing
      (User.update as jest.Mock).mockImplementation((updateData) =>
        Promise.resolve({ ...mockExistingUser, ...updateData })
      );
    });

    test('should set expires to 6 hours in the future when temporary is true', async () => {
      const event = createMockEvent({
        ...baseUpdatePayload,
        temporary: true
      });
      await handler(event as any);

      const expectedExpires = Math.floor(mockDateNow / 1000) + 6 * 60 * 60;
      expect(User.update).toHaveBeenCalledWith(
        expect.objectContaining({
          expires: expectedExpires,
          id: 'user123' // Ensure other necessary fields are passed
        })
      );
    });

    test('should set expires to 0 when temporary is false', async () => {
      const event = createMockEvent({
        ...baseUpdatePayload,
        temporary: false
      });
      await handler(event as any);

      expect(User.update).toHaveBeenCalledWith(
        expect.objectContaining({
          expires: 0,
          id: 'user123'
        })
      );
    });

    test('should not include expires in update if temporary is not provided', async () => {
      const event = createMockEvent(baseUpdatePayload); // temporary is undefined
      await handler(event as any);

      const updateCallArgs = (User.update as jest.Mock).mock.calls[0][0];
      expect(updateCallArgs).not.toHaveProperty('expires');
      expect(updateCallArgs).toEqual(
        expect.objectContaining({
          name: baseUpdatePayload.name, // Ensure other updates are still present
          id: 'user123'
        })
      );
    });
  });

  test('should return 500 when an unexpected error occurs', async () => {
    // Mock User.get to throw an error
    (User.get as jest.Mock).mockRejectedValue(new Error('Database error'));

    const event = createMockEvent({
      name: 'Updated User',
      folders: ['folder123']
    });

    const result = await handler(event as any);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  });
});
