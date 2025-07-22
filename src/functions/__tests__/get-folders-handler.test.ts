/* eslint-disable import/first */
process.env.APP_TABLE_NAME = 'power-ftp-dev-gary';

import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  Folder,
  FolderType,
  Product,
  ProductType,
  Tenant,
  User,
  UserType
} from '../../util/db-schema';
import { lambdaHandler as handler } from '../get-folders-handler';
/* eslint-enable import/first */

// Mock the Product, Folder, and Tenant models
jest.mock('../../util/db-schema', () => {
  const originalModule = jest.requireActual('../../util/db-schema');
  return {
    ...originalModule,
    Product: {
      find: jest.fn()
    },
    Folder: {
      find: jest.fn(),
      get: jest.fn()
    },
    Tenant: {
      get: jest.fn()
    },
    User: {
      find: jest.fn()
    }
  };
});

describe('Get Folders Handler', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create a mock event
  const createMockEvent = (
    pathParameters: Record<string, string> = {},
    authorizer: Record<string, any> = { district_uid: 'tenant123' }
  ): APIGatewayProxyEvent => {
    return {
      pathParameters,
      body: null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'GET',
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
  const mockProducts: ProductType[] = [
    {
      id: 'product123',
      productCode: 'PROD1',
      name: 'Product 1',
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
      name: 'Product 2',
      productPublicKey: 'public-key-2',
      multiTenant: false,
      uses: [{ name: 'use3' }],
      created: new Date('2023-01-01'),
      updated: new Date('2023-01-02')
    }
  ];

  // Mock folder data
  const mockFolders: FolderType[] = [
    {
      id: 'folder123',
      tenantId: 'tenant123',
      productId: 'product123',
      use: 'use1',
      path: '/use1',
      accessType: 'inbound',
      active: true,
      created: new Date('2023-01-01'),
      updated: new Date('2023-01-02')
    },
    {
      id: 'folder456',
      tenantId: 'tenant123',
      productId: 'product123',
      use: 'use2',
      path: '/use2',
      accessType: 'outbound',
      active: true,
      created: new Date('2023-01-01'),
      updated: new Date('2023-01-02')
    },
    {
      id: 'folder789',
      tenantId: 'tenant123',
      productId: 'product456',
      use: 'use3',
      path: '/use3',
      accessType: 'inbound',
      active: true,
      created: new Date('2023-01-01'),
      updated: new Date('2023-01-02')
    },
    {
      id: 'folder101',
      tenantId: 'tenant123',
      productId: 'product456',
      use: 'use3',
      path: '/inactive',
      accessType: 'inbound',
      active: false,
      created: new Date('2023-01-01'),
      updated: new Date('2023-01-02')
    }
  ];

  // Mock user data
  const mockUsers: UserType[] = [
    {
      id: 'user123',
      tenantId: 'tenant123',
      username: 'user1',
      name: 'User One',
      authenticationType: 'password',
      productId: 'product123',
      access: 'readwrite',
      folders: ['folder123', 'folder456'],
      active: true,
      isProductUser: false
    },
    {
      id: 'user456',
      tenantId: 'tenant123',
      username: 'user2',
      name: 'User Two',
      authenticationType: 'password',
      productId: 'product123',
      access: 'read',
      folders: ['folder123'],
      active: true,
      isProductUser: false
    },
    {
      id: 'user789',
      tenantId: 'tenant123',
      username: 'user3',
      name: 'User Three',
      authenticationType: 'SSH key',
      productId: 'product456',
      access: 'readwrite',
      folders: ['folder789'],
      active: true,
      isProductUser: false
    }
  ];

  test('should return 401 when tenantId is missing from authorizer context', async () => {
    const event = createMockEvent({}, {});
    const result = await handler(event as any);
    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Unauthorized: Missing tenant ID',
      code: 'MISSING_TENANT_ID'
    });
  });

  test('should return 404 when tenant does not exist', async () => {
    // Mock Tenant.get to return null (tenant not found)
    (Tenant.get as jest.Mock).mockResolvedValue(null);

    const event = createMockEvent();
    const result = await handler(event as any);
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Tenant not found',
      code: 'TENANT_NOT_FOUND'
    });

    expect(Tenant.get).toHaveBeenCalledWith({
      id: 'tenant123'
    });
  });

  test('should return all folders for the tenant', async () => {
    // Mock Tenant.get to return a valid tenant
    (Tenant.get as jest.Mock).mockResolvedValue({
      id: 'tenant123',
      name: 'Test Tenant'
    });
    // Mock Folder.find to return array of folders
    (Folder.find as jest.Mock).mockResolvedValue(mockFolders);
    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);

    const event = createMockEvent();
    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.count).toBe(3);
    expect(responseBody.folders).toHaveLength(3);
    expect(responseBody.folders[0].id).toBe('folder123');
    expect(responseBody.folders[1].id).toBe('folder456');
    expect(responseBody.folders[2].id).toBe('folder789');

    // Verify folder properties
    expect(responseBody.folders[0].productCode).toBe('PROD1');
    expect(responseBody.folders[0].accessType).toBe('inbound');
    expect(responseBody.folders[1].productCode).toBe('PROD1');
    expect(responseBody.folders[1].accessType).toBe('outbound');
    expect(responseBody.folders[2].productCode).toBe('PROD2');
    expect(responseBody.folders[2].accessType).toBe('inbound');

    // Verify active property is included
    expect(responseBody.folders[0].active).toBe(true);
    expect(responseBody.folders[1].active).toBe(true);
    expect(responseBody.folders[2].active).toBe(true);
    // Verify inactive folder is not included
    const inactiveFolder = responseBody.folders.find(
      (folder: { id: string }) => folder.id === 'folder101'
    );
    expect(inactiveFolder).toBeUndefined();

    expect(Folder.find).toHaveBeenCalledWith(
      {
        tenantId: 'tenant123'
      },
      { index: 'GSI1' }
    );
  });

  test('should return a specific folder by ID', async () => {
    // Mock Tenant.get to return a valid tenant
    (Tenant.get as jest.Mock).mockResolvedValue({
      id: 'tenant123',
      name: 'Test Tenant'
    });
    // Mock Folder.get to return a specific folder
    (Folder.get as jest.Mock).mockResolvedValue(mockFolders[0]);
    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);

    const event = createMockEvent({ id: 'folder123' });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.folder).toBeDefined();
    expect(responseBody.folder.id).toBe('folder123');
    expect(responseBody.folder.productCode).toBe('PROD1');
    expect(responseBody.folder.accessType).toBe('inbound');
    expect(responseBody.folder.path).toBe('/use1');
    expect(responseBody.folder.use).toBe('use1');
    expect(responseBody.folder.tenantId).toBe('tenant123');
    expect(responseBody.folder.productId).toBe('product123');

    expect(Folder.get).toHaveBeenCalledWith({
      tenantId: 'tenant123',
      id: 'folder123'
    });
  });

  test('should return a specific folder by ID with users who have access', async () => {
    // Mock Tenant.get to return a valid tenant
    (Tenant.get as jest.Mock).mockResolvedValue({
      id: 'tenant123',
      name: 'Test Tenant'
    });
    // Mock Folder.get to return a specific folder
    (Folder.get as jest.Mock).mockResolvedValue(mockFolders[0]);
    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);
    // Mock User.find to return array of users
    (User.find as jest.Mock).mockResolvedValue(mockUsers);

    const event = createMockEvent({ id: 'folder123' });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.folder).toBeDefined();
    expect(responseBody.folder.id).toBe('folder123');

    // Verify users array is included
    expect(responseBody.folder.users).toBeDefined();
    expect(responseBody.folder.users).toHaveLength(2);

    // Verify user properties
    expect(responseBody.folder.users[0].id).toBe('user123');
    expect(responseBody.folder.users[0].username).toBe('user1');
    expect(responseBody.folder.users[1].id).toBe('user456');
    expect(responseBody.folder.users[1].username).toBe('user2');

    expect(User.find).toHaveBeenCalledWith({
      tenantId: 'tenant123'
    });
  });

  test('should return a specific folder by ID with empty users array when no users have access', async () => {
    // Mock Tenant.get to return a valid tenant
    (Tenant.get as jest.Mock).mockResolvedValue({
      id: 'tenant123',
      name: 'Test Tenant'
    });
    // Mock Folder.get to return a specific folder
    (Folder.get as jest.Mock).mockResolvedValue(mockFolders[0]);
    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);
    // Mock User.find to return empty array
    (User.find as jest.Mock).mockResolvedValue([]);

    const event = createMockEvent({ id: 'folder123' });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.folder).toBeDefined();
    expect(responseBody.folder.id).toBe('folder123');

    // Verify users array is empty
    expect(responseBody.folder.users).toBeDefined();
    expect(responseBody.folder.users).toHaveLength(0);

    expect(User.find).toHaveBeenCalledWith({
      tenantId: 'tenant123'
    });
  });

  test('should handle error when fetching users and still return folder data', async () => {
    // Mock Tenant.get to return a valid tenant
    (Tenant.get as jest.Mock).mockResolvedValue({
      id: 'tenant123',
      name: 'Test Tenant'
    });
    // Mock Folder.get to return a specific folder
    (Folder.get as jest.Mock).mockResolvedValue(mockFolders[0]);
    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);
    // Mock User.find to throw an error
    (User.find as jest.Mock).mockRejectedValue(
      new Error('Failed to fetch users')
    );

    const event = createMockEvent({ id: 'folder123' });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.folder).toBeDefined();
    expect(responseBody.folder.id).toBe('folder123');

    // Verify users array is empty due to error
    expect(responseBody.folder.users).toBeDefined();
    expect(responseBody.folder.users).toHaveLength(0);

    expect(User.find).toHaveBeenCalledWith({
      tenantId: 'tenant123'
    });
  });

  test('should return 200 when folder is inactive', async () => {
    // Mock Tenant.get to return a valid tenant
    (Tenant.get as jest.Mock).mockResolvedValue({
      id: 'tenant123',
      name: 'Test Tenant'
    });
    // Mock Folder.get to return an inactive folder
    (Folder.get as jest.Mock).mockResolvedValue({
      ...mockFolders[0],
      active: false
    });

    const eventInactive = createMockEvent({ id: 'folder123' });
    const resultInactive = await handler(eventInactive as any);
    expect(resultInactive.statusCode).toBe(200);
    const responseBodyInactive = JSON.parse(resultInactive.body);

    expect(Folder.get).toHaveBeenCalledWith({
      tenantId: 'tenant123',
      id: 'folder123'
    });

    expect(responseBodyInactive.folder).toMatchObject({
      id: 'folder123',
      tenantId: 'tenant123',
      productId: 'product123',
      productCode: 'PROD1',
      use: 'use1',
      path: '/use1',
      accessType: 'inbound',
      active: false
    });
  });

  test('should return 404 when folder ID is not found or inactive', async () => {
    // Mock Tenant.get to return a valid tenant
    (Tenant.get as jest.Mock).mockResolvedValue({
      id: 'tenant123',
      name: 'Test Tenant'
    });
    // Mock Folder.get to return null (folder not found)
    (Folder.get as jest.Mock).mockResolvedValue(null);

    const event = createMockEvent({ id: 'nonexistent' });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Folder not found',
      code: 'FOLDER_NOT_FOUND'
    });

    expect(Folder.get).toHaveBeenCalledWith({
      tenantId: 'tenant123',
      id: 'nonexistent'
    });
  });

  test('should return empty array when no folders exist for the tenant', async () => {
    // Mock Tenant.get to return a valid tenant
    (Tenant.get as jest.Mock).mockResolvedValue({
      id: 'tenant123',
      name: 'Test Tenant'
    });
    // Mock Folder.find to return empty array
    (Folder.find as jest.Mock).mockResolvedValue([]);
    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);

    const event = createMockEvent();
    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.count).toBe(0);
    expect(responseBody.folders).toHaveLength(0);

    expect(Folder.find).toHaveBeenCalledWith(
      {
        tenantId: 'tenant123'
      },
      { index: 'GSI1' }
    );
  });

  test('should return 500 when an unexpected error occurs', async () => {
    // Mock Tenant.get to throw an error
    (Tenant.get as jest.Mock).mockRejectedValue(new Error('Database error'));

    const event = createMockEvent();
    const result = await handler(event as any);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  });

  // Tests for the new IAM-authenticated endpoint
  describe('IAM-authenticated service endpoint', () => {
    test('should return all folders for the tenant using districtId from path parameters when no authorizer context', async () => {
      // Mock Tenant.get to return a valid tenant
      (Tenant.get as jest.Mock).mockResolvedValue({
        id: 'tenant123',
        name: 'Test Tenant'
      });
      // Mock Folder.find to return array of folders
      (Folder.find as jest.Mock).mockResolvedValue(mockFolders);
      // Mock Product.find to return array of products
      (Product.find as jest.Mock).mockResolvedValue(mockProducts);

      // Create event with districtId in path parameters and no authorizer context
      const event = {
        ...createMockEvent({}, {}), // No authorizer context
        pathParameters: { districtId: 'tenant123' },
        requestContext: {} as any
      };

      const result = await handler(event as any);
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.count).toBe(3);
      expect(responseBody.folders).toHaveLength(3);
      expect(responseBody.folders[0].id).toBe('folder123');
      expect(responseBody.folders[1].id).toBe('folder456');
      expect(responseBody.folders[2].id).toBe('folder789');

      expect(Folder.find).toHaveBeenCalledWith(
        {
          tenantId: 'tenant123'
        },
        { index: 'GSI1' }
      );
    });

    test('should return a specific folder by ID using districtId from path parameters when no authorizer context', async () => {
      // Mock Tenant.get to return a valid tenant
      (Tenant.get as jest.Mock).mockResolvedValue({
        id: 'tenant123',
        name: 'Test Tenant'
      });
      // Mock Folder.get to return a specific folder
      (Folder.get as jest.Mock).mockResolvedValue(mockFolders[0]);
      // Mock Product.find to return array of products
      (Product.find as jest.Mock).mockResolvedValue(mockProducts);

      // Create event with districtId and id in path parameters and no authorizer context
      const event = {
        ...createMockEvent({}, {}), // No authorizer context
        pathParameters: { districtId: 'tenant123', id: 'folder123' },
        requestContext: {} as any
      };

      const result = await handler(event as any);
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.folder).toBeDefined();
      expect(responseBody.folder.id).toBe('folder123');
      expect(responseBody.folder.productCode).toBe('PROD1');

      expect(Folder.get).toHaveBeenCalledWith({
        tenantId: 'tenant123',
        id: 'folder123'
      });
    });

    test('should prioritize authorizer context over path parameters when both are present', async () => {
      // Mock Tenant.get to return a valid tenant
      (Tenant.get as jest.Mock).mockResolvedValue({
        id: 'auth_tenant456',
        name: 'Test Tenant'
      });
      // Mock Folder.find to return array of folders
      (Folder.find as jest.Mock).mockResolvedValue(mockFolders);
      // Mock Product.find to return array of products
      (Product.find as jest.Mock).mockResolvedValue(mockProducts);

      // Create event with both authorizer context and path parameters
      const event = {
        ...createMockEvent({}, { district_uid: 'auth_tenant456' }), // Authorizer context
        pathParameters: { districtId: 'path_tenant123' } // Path parameter
      };

      const result = await handler(event as any);
      expect(result.statusCode).toBe(200);

      // Should use the tenant ID from the authorizer context, not the path parameter
      expect(Folder.find).toHaveBeenCalledWith(
        {
          tenantId: 'auth_tenant456' // Should use this, not 'path_tenant123'
        },
        { index: 'GSI1' }
      );
    });

    test('should return empty array when no folders exist for the tenant using IAM authentication', async () => {
      // Mock Tenant.get to return a valid tenant
      (Tenant.get as jest.Mock).mockResolvedValue({
        id: 'non-existent-tenant',
        name: 'Test Tenant'
      });
      // Mock Folder.find to return empty array
      (Folder.find as jest.Mock).mockResolvedValue([]);
      // Mock Product.find to return array of products
      (Product.find as jest.Mock).mockResolvedValue(mockProducts);

      // Create event with districtId in path parameters and no authorizer context
      const event = {
        ...createMockEvent({}, {}), // No authorizer context
        pathParameters: { districtId: 'non-existent-tenant' },
        requestContext: {} as any
      };

      const result = await handler(event as any);
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.count).toBe(0);
      expect(responseBody.folders).toHaveLength(0);

      expect(Folder.find).toHaveBeenCalledWith(
        {
          tenantId: 'non-existent-tenant'
        },
        { index: 'GSI1' }
      );
    });

    test('should return 404 when tenant does not exist using IAM authentication', async () => {
      // Mock Tenant.get to return null (tenant not found)
      (Tenant.get as jest.Mock).mockResolvedValue(null);

      // Create event with districtId in path parameters and no authorizer context
      const event = {
        ...createMockEvent({}, {}), // No authorizer context
        pathParameters: { districtId: 'non-existent-tenant' },
        requestContext: {} as any
      };

      const result = await handler(event as any);
      expect(result.statusCode).toBe(404);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe(true);
      expect(responseBody.code).toBe('TENANT_NOT_FOUND');

      expect(Tenant.get).toHaveBeenCalledWith({
        id: 'non-existent-tenant'
      });
    });
  });
});
