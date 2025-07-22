/* eslint-disable import/first */
process.env.APP_TABLE_NAME = 'power-ftp-dev-gary';
process.env.TRANSFER_BUCKET_PROD1_EXT = 'prod1-ext-bucket';
process.env.TRANSFER_BUCKET_PROD1_INT = 'prod1-int-bucket';

import { APIGatewayProxyEvent } from 'aws-lambda';
import { Folder, Product, ProductType } from '../../util/db-schema';
import * as s3Utils from '../../util/s3-utils';
import { lambdaHandler as handler } from '../post-folder-handler';
/* eslint-enable import/first */

// Mock the Product and Folder models
jest.mock('../../util/db-schema', () => {
  const originalModule = jest.requireActual('../../util/db-schema');
  return {
    ...originalModule,
    Product: {
      find: jest.fn()
    },
    Folder: {
      create: jest.fn(),
      find: jest.fn().mockResolvedValue([])
    }
  };
});

// Mock the s3-utils functions
jest.mock('../../util/s3-utils', () => {
  return {
    ensureSubfoldersExist: jest.fn().mockResolvedValue(undefined)
  };
});

describe('Post Folder Handler', () => {
  const mockDateNow = 1672531200000; // Jan 1, 2023 00:00:00 UTC
  let dateNowSpy: jest.SpyInstance;

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Date.now()
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(mockDateNow);
    // Reset Folder.find mock for each test to avoid interference
    (Folder.find as jest.Mock).mockResolvedValue([]);
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

  // Mock created folder
  const mockCreatedFolder = {
    id: 'newfolder123',
    tenantId: 'tenant123',
    productId: 'product123',
    use: 'use1',
    path: '/newfolder',
    accessType: 'inbound',
    active: true,
    created: new Date('2023-01-01')
  };

  test('should return 401 when tenantId is missing from authorizer context', async () => {
    const event = createMockEvent({ productCode: 'PROD1' }, {});
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

  test('should return 400 when productCode is missing', async () => {
    const event = createMockEvent({
      use: 'use1',
      path: '/newfolder',
      accessType: 'inbound'
    });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Bad request: Missing productCode',
      code: 'MISSING_PRODUCT_CODE'
    });
  });

  test('should return 400 when use is missing', async () => {
    const event = createMockEvent({
      productCode: 'PROD1',
      path: '/newfolder',
      accessType: 'inbound'
    });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Bad request: Missing use',
      code: 'MISSING_USE'
    });
  });

  test('should return 400 when path is missing', async () => {
    const event = createMockEvent({
      productCode: 'PROD1',
      use: 'use1',
      accessType: 'inbound'
    });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Bad request: Missing path',
      code: 'MISSING_PATH'
    });
  });

  test('should return 400 when accessType is missing', async () => {
    const event = createMockEvent({
      productCode: 'PROD1',
      use: 'use1',
      path: '/newfolder'
    });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: "Bad request: accessType must be 'inbound' or 'outbound'",
      code: 'INVALID_ACCESS_TYPE'
    });
  });

  test('should return 400 when accessType is invalid', async () => {
    const event = createMockEvent({
      productCode: 'PROD1',
      use: 'use1',
      path: '/newfolder',
      accessType: 'invalid'
    });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: "Bad request: accessType must be 'inbound' or 'outbound'",
      code: 'INVALID_ACCESS_TYPE'
    });
  });

  test('should return 404 when product is not found', async () => {
    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);

    const event = createMockEvent({
      productCode: 'NONEXISTENT',
      use: 'use1',
      path: '/newfolder',
      accessType: 'inbound'
    });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Product with code NONEXISTENT not found',
      code: 'PRODUCT_NOT_FOUND'
    });
  });

  test('should return 400 when use is invalid for the product', async () => {
    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);

    const event = createMockEvent({
      productCode: 'PROD1',
      use: 'invalid',
      path: '/newfolder',
      accessType: 'inbound'
    });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: "Invalid use 'invalid' for product PROD1",
      code: 'INVALID_USE'
    });
  });

  test('should create a folder successfully', async () => {
    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);
    // Mock Folder.create to return a new folder
    (Folder.create as jest.Mock).mockResolvedValue(mockCreatedFolder);

    const event = createMockEvent({
      productCode: 'PROD1',
      use: 'use1',
      path: '/newfolder',
      accessType: 'inbound'
    });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(201);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.folder.id).toBe('newfolder123');
    expect(responseBody.folder.tenantId).toBe('tenant123');
    expect(responseBody.folder.productId).toBe('product123');
    expect(responseBody.folder.productCode).toBe('PROD1');
    expect(responseBody.folder.use).toBe('use1');
    expect(responseBody.folder.path).toBe('/newfolder');
    expect(responseBody.folder.accessType).toBe('inbound');
    expect(responseBody.folder.active).toBe(true);

    expect(Folder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        productId: 'product123',
        use: 'use1',
        path: '/newfolder',
        accessType: 'inbound',
        active: true
      })
    );
  });

  test('should create an inactive folder when active is set to false', async () => {
    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);
    // Mock Folder.create to return a new inactive folder
    const inactiveFolder = {
      ...mockCreatedFolder,
      id: 'inactivefolder123',
      active: false
    };
    (Folder.create as jest.Mock).mockResolvedValue(inactiveFolder);

    const event = createMockEvent({
      productCode: 'PROD1',
      use: 'use1',
      path: '/inactivefolder',
      accessType: 'inbound',
      active: false
    });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(201);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.folder.id).toBe('inactivefolder123');
    expect(responseBody.folder.active).toBe(false);

    expect(Folder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        productId: 'product123',
        use: 'use1',
        path: '/inactivefolder',
        accessType: 'inbound',
        active: false
      })
    );
  });

  test('should create a folder successfully and create S3 folder for inbound access', async () => {
    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);
    // Mock Folder.create to return a new folder
    (Folder.create as jest.Mock).mockResolvedValue(mockCreatedFolder);

    const event = createMockEvent({
      productCode: 'PROD1',
      use: 'use1',
      path: '/newfolder',
      accessType: 'inbound'
    });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(201);

    // Verify folder was created in the database
    expect(Folder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        productId: 'product123',
        use: 'use1',
        path: '/newfolder',
        accessType: 'inbound',
        active: true
      })
    );

    // Verify S3 folder was created
    expect(s3Utils.ensureSubfoldersExist).toHaveBeenCalledWith(
      'prod1-ext-bucket',
      'tenant123',
      ['/newfolder']
    );
  });

  test('should create a folder successfully and create S3 folder for outbound access', async () => {
    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);
    // Mock Folder.create to return a new folder with outbound access
    const outboundFolder = {
      ...mockCreatedFolder,
      id: 'outboundfolder123',
      accessType: 'outbound'
    };
    (Folder.create as jest.Mock).mockResolvedValue(outboundFolder);

    const event = createMockEvent({
      productCode: 'PROD1',
      use: 'use1',
      path: '/outboundfolder',
      accessType: 'outbound'
    });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(201);

    // Verify folder was created in the database
    expect(Folder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        productId: 'product123',
        use: 'use1',
        path: '/outboundfolder',
        accessType: 'outbound',
        active: true
      })
    );

    // Verify S3 folder was created in the INT bucket
    expect(s3Utils.ensureSubfoldersExist).toHaveBeenCalledWith(
      'prod1-int-bucket',
      'tenant123',
      ['/outboundfolder']
    );
  });

  test('should create folder in database even if S3 folder creation fails', async () => {
    // Mock Product.find to return array of products
    (Product.find as jest.Mock).mockResolvedValue(mockProducts);
    // Mock Folder.create to return a new folder
    (Folder.create as jest.Mock).mockResolvedValue(mockCreatedFolder);
    // Mock ensureSubfoldersExist to throw an error on FIRST call but succeed on second call
    // This reflects our new behavior where we try to create folders in both buckets
    (s3Utils.ensureSubfoldersExist as jest.Mock)
      .mockResolvedValueOnce(undefined) // First call succeeds (ext bucket)
      .mockRejectedValueOnce(new Error('S3 error')); // Second call fails (int bucket)

    const event = createMockEvent({
      productCode: 'PROD1',
      use: 'use1',
      path: '/newfolder',
      accessType: 'inbound'
    });

    // With the new behavior, this should fail with a 500 error
    const result = await handler(event as any);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });

    // Verify folder was created in the database
    expect(Folder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        productId: 'product123',
        use: 'use1',
        path: '/newfolder',
        accessType: 'inbound',
        active: true
      })
    );

    // Verify both S3 folder creation attempts
    expect(s3Utils.ensureSubfoldersExist).toHaveBeenCalledTimes(2);
    expect(s3Utils.ensureSubfoldersExist).toHaveBeenNthCalledWith(
      1,
      'prod1-ext-bucket',
      'tenant123',
      ['/newfolder']
    );
    expect(s3Utils.ensureSubfoldersExist).toHaveBeenNthCalledWith(
      2,
      'prod1-int-bucket',
      'tenant123',
      ['/newfolder']
    );
  });

  describe('Temporary Folder Functionality', () => {
    const baseFolderPayload = {
      productCode: 'PROD1',
      use: 'use1',
      path: '/tempfolder',
      accessType: 'inbound'
    };

    beforeEach(() => {
      (Product.find as jest.Mock).mockResolvedValue(mockProducts);
      (Folder.create as jest.Mock).mockImplementation((folderData) =>
        Promise.resolve({
          ...mockCreatedFolder,
          ...folderData,
          id: 'tempfolderid'
        })
      );
      (s3Utils.ensureSubfoldersExist as jest.Mock).mockResolvedValue(undefined);
    });

    test('should set expires to 6 hours in the future when temporary is true', async () => {
      const event = createMockEvent({
        ...baseFolderPayload,
        temporary: true
      });
      await handler(event as any);

      const expectedExpires = Math.floor(mockDateNow / 1000) + 6 * 60 * 60;
      expect(Folder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expires: expectedExpires,
          path: '/tempfolder'
        })
      );
    });

    test('should set expires to 0 when temporary is false', async () => {
      const event = createMockEvent({
        ...baseFolderPayload,
        temporary: false
      });
      await handler(event as any);

      expect(Folder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expires: 0,
          path: '/tempfolder'
        })
      );
    });

    test('should set expires to 0 when temporary is not provided', async () => {
      const event = createMockEvent(baseFolderPayload); // temporary is undefined
      await handler(event as any);

      expect(Folder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expires: 0,
          path: '/tempfolder'
        })
      );
    });
  });

  test('should return 500 when an unexpected error occurs', async () => {
    // Mock Product.find to throw an error
    (Product.find as jest.Mock).mockRejectedValue(new Error('Database error'));

    const event = createMockEvent({
      productCode: 'PROD1',
      use: 'use1',
      path: '/newfolder',
      accessType: 'inbound'
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
