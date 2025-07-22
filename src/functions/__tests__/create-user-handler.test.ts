/* eslint-disable import/first */
process.env.APP_TABLE_NAME = 'power-ftp-dev-gary';

import { APIGatewayProxyEvent } from 'aws-lambda';
import { Folder, Product, User } from '../../util/db-schema';
import { lambdaHandler as handler } from '../create-user-handler';
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
      create: jest.fn()
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

describe('Create User Handler', () => {
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
    authorizer: Record<string, any> = { district_uid: 'tenant123' }
  ): APIGatewayProxyEvent => {
    return {
      pathParameters: {},
      body: body ? JSON.stringify(body) : null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'POST',
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

  // Mock created user
  const mockCreatedUser = {
    id: 'user123',
    tenantId: 'tenant123',
    name: 'Test User',
    username: 'testuser',
    authenticationType: 'password',
    passwordHash: 'hashed_password',
    folders: ['folder123'],
    productId: 'product123',
    access: 'readwrite',
    created: new Date('2023-01-01')
  };

  test('should return 401 when tenantId is missing from authorizer context', async () => {
    const event = createMockEvent(
      {
        name: 'Test User',
        username: 'testuser',
        authenticationType: 'password',
        password: 'password123',
        folders: ['folder123'],
        access: 'readwrite',
        productCode: 'PROD1'
      },
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

  test('should return 400 when required fields are missing', async () => {
    const event = createMockEvent({
      name: 'Test User'
      // Missing username, authenticationType, folders, access, productCode
    });

    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe(true);
    expect(JSON.parse(result.body).code).toBe('MISSING_REQUIRED_FIELDS');
  });

  test('should return 400 when folders have different productId than the user', async () => {
    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);

    // Mock User.find to return empty array (no existing user)
    (User.find as jest.Mock).mockResolvedValue([]);

    // Mock Folder.find to return array of folders
    (Folder.find as jest.Mock).mockResolvedValue(mockFolders);

    const event = createMockEvent({
      name: 'Test User',
      username: 'testuser',
      authenticationType: 'password',
      password: 'password123',
      folders: ['folder123', 'folder456'], // folder456 has productId 'product456'
      access: 'readwrite',
      productCode: 'PROD1' // This corresponds to productId 'product123'
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

  test('should create a user successfully when folders have the same productId', async () => {
    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);

    // Mock Folder.find to return array of folders
    (Folder.find as jest.Mock).mockResolvedValue(mockFolders);

    // Mock User.find to return empty array (no existing user)
    (User.find as jest.Mock).mockResolvedValue([]);

    // Mock User.create to return a new user
    (User.create as jest.Mock).mockResolvedValue(mockCreatedUser);

    const event = createMockEvent({
      name: 'Test User',
      username: 'testuser',
      authenticationType: 'password',
      password: 'password123',
      folders: ['folder123'], // Only folder with productId 'product123'
      access: 'readwrite',
      productCode: 'PROD1' // This corresponds to productId 'product123'
    });

    const result = await handler(event as any);
    expect(result.statusCode).toBe(201);

    const responseBody = JSON.parse(result.body);
    expect(responseBody.id).toBe('user123');
    expect(responseBody.tenantId).toBe('tenant123');
    expect(responseBody.productId).toBe('product123');
    expect(responseBody.folders).toEqual(['folder123']);

    // Verify User.create was called with correct parameters
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        name: 'Test User',
        username: 'testuser',
        authenticationType: 'password',
        passwordHash: 'hashed_password',
        folders: ['folder123'],
        productId: 'product123',
        access: 'readwrite'
      })
    );
  });

  describe('Temporary User Functionality', () => {
    const baseUserPayload = {
      name: 'Temporary User',
      username: 'tempuser',
      authenticationType: 'password',
      password: 'password123',
      folders: ['folder123'],
      access: 'read',
      productCode: 'PROD1'
    };

    beforeEach(() => {
      (Product.find as jest.Mock).mockResolvedValue(mockProducts);
      (Folder.find as jest.Mock).mockResolvedValue(mockFolders);
      (User.find as jest.Mock).mockResolvedValue([]); // No existing user
      (User.create as jest.Mock).mockImplementation((userData) =>
        Promise.resolve({ ...mockCreatedUser, ...userData })
      );
    });

    test('should set expires to 6 hours in the future when temporary is true', async () => {
      const event = createMockEvent({
        ...baseUserPayload,
        temporary: true
      });
      await handler(event as any);

      const expectedExpires = Math.floor(mockDateNow / 1000) + 6 * 60 * 60;
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expires: expectedExpires
        })
      );
    });

    test('should set expires to 0 when temporary is false', async () => {
      const event = createMockEvent({
        ...baseUserPayload,
        temporary: false
      });
      await handler(event as any);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expires: 0
        })
      );
    });

    test('should set expires to 0 when temporary is not provided', async () => {
      const event = createMockEvent(baseUserPayload); // temporary is undefined
      await handler(event as any);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expires: 0
        })
      );
    });
  });

  test('should return 500 when an unexpected error occurs', async () => {
    // Mock Product.find to throw an error that will be caught by the main try/catch
    (Product.find as jest.Mock).mockImplementation(() => {
      throw new Error('Database error');
    });

    const event = createMockEvent({
      name: 'Test User',
      username: 'testuser',
      authenticationType: 'password',
      password: 'password123',
      folders: ['folder123'],
      access: 'readwrite',
      productCode: 'PROD1'
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
