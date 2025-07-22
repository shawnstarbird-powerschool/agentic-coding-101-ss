/* eslint-disable import/first */
process.env.APP_TABLE_NAME = 'power-ftp-dev-gary';
process.env.TRANSFER_BUCKET_PROD1_EXT = 'prod1-ext-bucket';
process.env.TRANSFER_BUCKET_PROD1_INT = 'prod1-int-bucket';

import { APIGatewayProxyEvent } from 'aws-lambda';
import { Folder, FolderType, Product, ProductType } from '../../util/db-schema';
import * as s3Utils from '../../util/s3-utils';
import { lambdaHandler as handler } from '../update-folder-handler';
/* eslint-enable import/first */

// Mock the Product and Folder models
jest.mock('../../util/db-schema', () => {
  const originalModule = jest.requireActual('../../util/db-schema');
  return {
    ...originalModule,
    Product: {
      get: jest.fn()
    },
    Folder: {
      get: jest.fn(),
      update: jest.fn(),
      find: jest.fn().mockResolvedValue([])
    }
  };
});

// Mock the s3-utils functions
jest.mock('../../util/s3-utils', () => ({
  ensureSubfoldersExist: jest.fn().mockResolvedValue(undefined)
}));

describe('Update Folder Handler', () => {
  const mockDateNow = 1672531200000; // Jan 1, 2023 00:00:00 UTC
  let dateNowSpy: jest.SpyInstance;

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Date.now()
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(mockDateNow);
    // Reset Folder.find mock for each test to avoid interference from other tests if it were used for duplicate checks
    (Folder.find as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    // Restore Date.now()
    dateNowSpy.mockRestore();
  });

  // Helper function to create a mock event
  const createMockEvent = (
    body: any = null,
    pathParameters: Record<string, string> = {},
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
  const mockProduct: ProductType = {
    id: 'product123',
    productCode: 'PROD1',
    name: 'Product 1',
    productPublicKey: 'public-key-1',
    multiTenant: true,
    ipWhitelist: ['192.168.1.1/32'],
    uses: [{ name: 'use1' }, { name: 'use2' }, { name: 'use3' }],
    created: new Date('2023-01-01'),
    updated: new Date('2023-01-02')
  };

  // Mock folder data
  const mockFolder: FolderType = {
    id: 'folder123',
    tenantId: 'tenant123',
    productId: 'product123',
    use: 'use1',
    path: '/use1',
    accessType: 'inbound',
    active: true,
    created: new Date('2023-01-01'),
    updated: new Date('2023-01-02')
  };

  // Mock updated folder
  const mockUpdatedFolder = {
    id: 'folder123',
    tenantId: 'tenant123',
    productId: 'product123',
    use: 'use3',
    path: '/updated',
    accessType: 'outbound',
    active: true,
    created: new Date('2023-01-01'),
    updated: new Date('2023-01-03')
  };

  test('should return 401 when tenantId is missing from authorizer context', async () => {
    const event = createMockEvent({}, { id: 'folder123' }, {});
    const result = await handler(event as any);
    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Unauthorized: Missing tenant ID',
      code: 'MISSING_TENANT_ID'
    });
  });

  test('should return 400 when folder ID is missing', async () => {
    const event = createMockEvent({}, {});
    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Bad request: Missing folder ID',
      code: 'MISSING_FOLDER_ID'
    });
  });

  test('should return 400 when request body is missing', async () => {
    const event = createMockEvent(null, { id: 'folder123' });
    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Bad request: Missing request body',
      code: 'MISSING_REQUEST_BODY'
    });
  });

  test('should return 400 when accessType is invalid', async () => {
    const event = createMockEvent(
      {
        accessType: 'invalid'
      },
      { id: 'folder123' }
    );
    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: "Bad request: accessType must be 'inbound' or 'outbound'",
      code: 'INVALID_ACCESS_TYPE'
    });
  });

  test('should return 400 when trying to change productId', async () => {
    const eventWithProductId = createMockEvent(
      {
        productId: 'newproduct456'
      },
      { id: 'folder123' }
    );
    const resultWithProductId = await handler(eventWithProductId as any);
    expect(resultWithProductId.statusCode).toBe(400);
    expect(JSON.parse(resultWithProductId.body)).toEqual({
      error: true,
      message: 'Bad request: Changing productId is not allowed',
      code: 'PRODUCT_CHANGE_NOT_ALLOWED'
    });
  });

  test('should return 404 when folder is not found', async () => {
    // Mock Folder.get to return null (folder not found)
    (Folder.get as jest.Mock).mockResolvedValue(null);

    const event = createMockEvent(
      {
        use: 'use3',
        path: '/updated',
        accessType: 'outbound'
      },
      { id: 'nonexistent' }
    );
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

  test('should return 404 when folder belongs to a different tenant', async () => {
    // Mock Folder.get to return a folder with a different tenant
    (Folder.get as jest.Mock).mockResolvedValue({
      ...mockFolder,
      tenantId: 'tenant456'
    });

    const event = createMockEvent(
      {
        use: 'use3',
        path: '/updated',
        accessType: 'outbound'
      },
      { id: 'folder123' }
    );
    const result = await handler(event as any);
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Folder not found',
      code: 'FOLDER_NOT_FOUND'
    });
  });

  test('should return 400 when use is invalid for the product', async () => {
    // Mock Folder.get to return a folder
    (Folder.get as jest.Mock).mockResolvedValue(mockFolder);
    // Mock Product.get to return a product with limited uses
    (Product.get as jest.Mock).mockResolvedValue({
      ...mockProduct,
      uses: [{ name: 'use1' }, { name: 'use2' }] // use3 is not in the list
    });

    const event = createMockEvent(
      {
        use: 'use3',
        path: '/updated',
        accessType: 'outbound'
      },
      { id: 'folder123' }
    );
    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: "Invalid use 'use3' for product PROD1",
      code: 'INVALID_USE'
    });
  });

  test('should update a folder successfully', async () => {
    // Mock Folder.get to return a folder
    (Folder.get as jest.Mock).mockResolvedValue(mockFolder);
    // Mock Product.get to return a product
    (Product.get as jest.Mock).mockResolvedValue(mockProduct);
    // Mock Folder.update to return an updated folder
    (Folder.update as jest.Mock).mockResolvedValue(mockUpdatedFolder);

    const event = createMockEvent(
      {
        use: 'use3',
        path: '/updated',
        accessType: 'outbound'
      },
      { id: 'folder123' }
    );
    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.id).toBe('folder123');
    expect(responseBody.tenantId).toBe('tenant123');
    expect(responseBody.productId).toBe('product123');
    expect(responseBody.productCode).toBe('PROD1');
    expect(responseBody.use).toBe('use3');
    expect(responseBody.path).toBe('/updated');
    expect(responseBody.accessType).toBe('outbound');
    expect(responseBody.active).toBe(true);

    expect(Folder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        id: 'folder123',
        productId: 'product123',
        use: 'use3',
        path: '/updated',
        accessType: 'outbound'
      })
    );
  });

  test('should update only provided fields', async () => {
    // Mock Folder.get to return a folder
    (Folder.get as jest.Mock).mockResolvedValue(mockFolder);
    // Mock Product.get to return a product
    (Product.get as jest.Mock).mockResolvedValue(mockProduct);
    // Mock Folder.update to return an updated folder with only path changed
    (Folder.update as jest.Mock).mockResolvedValue({
      ...mockFolder,
      path: '/updated',
      updated: new Date('2023-01-03')
    });

    const event = createMockEvent(
      {
        path: '/updated'
      },
      { id: 'folder123' }
    );
    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.path).toBe('/updated');
    expect(responseBody.use).toBe('use1'); // unchanged
    expect(responseBody.accessType).toBe('inbound'); // unchanged

    expect(Folder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        id: 'folder123',
        productId: 'product123',
        path: '/updated'
      })
    );
  });

  test('should update active status of a folder', async () => {
    // Mock Folder.get to return a folder
    (Folder.get as jest.Mock).mockResolvedValue(mockFolder);
    // Mock Product.get to return a product
    (Product.get as jest.Mock).mockResolvedValue(mockProduct);
    // Mock Folder.update to return an updated folder with active set to false
    const inactiveFolder = {
      ...mockFolder,
      active: false,
      updated: new Date('2023-01-03')
    };
    (Folder.update as jest.Mock).mockResolvedValue(inactiveFolder);

    const event = createMockEvent(
      {
        active: false
      },
      { id: 'folder123' }
    );
    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.active).toBe(false);
    expect(responseBody.use).toBe('use1'); // unchanged
    expect(responseBody.path).toBe('/use1'); // unchanged
    expect(responseBody.accessType).toBe('inbound'); // unchanged

    expect(Folder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        id: 'folder123',
        productId: 'product123',
        active: false
      })
    );
  });

  describe('Temporary Folder Functionality on Update', () => {
    const baseUpdatePayload = {
      // Using a payload that doesn't trigger S3 updates by default
      use: 'use2' // Change 'use' to have some update data
    };

    beforeEach(() => {
      // Ensure mocks from outer scope are available
      (Folder.get as jest.Mock).mockResolvedValue(mockFolder);
      (Product.get as jest.Mock).mockResolvedValue(mockProduct);
      (Folder.update as jest.Mock).mockImplementation((updateData) =>
        Promise.resolve({ ...mockFolder, ...updateData })
      );
      (s3Utils.ensureSubfoldersExist as jest.Mock).mockClear(); // Clear S3 mock for these specific tests
    });

    test('should set expires to 6 hours in the future when temporary is true', async () => {
      const event = createMockEvent(
        {
          ...baseUpdatePayload,
          temporary: true
        },
        { id: 'folder123' }
      );
      await handler(event as any);

      const expectedExpires = Math.floor(mockDateNow / 1000) + 6 * 60 * 60;
      expect(Folder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          expires: expectedExpires,
          id: 'folder123',
          use: 'use2'
        })
      );
      expect(s3Utils.ensureSubfoldersExist).not.toHaveBeenCalled();
    });

    test('should set expires to 0 when temporary is false', async () => {
      const event = createMockEvent(
        {
          ...baseUpdatePayload,
          temporary: false
        },
        { id: 'folder123' }
      );
      await handler(event as any);

      expect(Folder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          expires: 0,
          id: 'folder123',
          use: 'use2'
        })
      );
      expect(s3Utils.ensureSubfoldersExist).not.toHaveBeenCalled();
    });

    test('should not include expires in update if temporary is not provided', async () => {
      const event = createMockEvent(baseUpdatePayload, { id: 'folder123' });
      await handler(event as any);

      const updateCallArgs = (Folder.update as jest.Mock).mock.calls[0][0];
      expect(updateCallArgs).not.toHaveProperty('expires');
      expect(updateCallArgs).toEqual(
        expect.objectContaining({
          use: baseUpdatePayload.use,
          id: 'folder123'
        })
      );
      expect(s3Utils.ensureSubfoldersExist).not.toHaveBeenCalled();
    });
  }); // End of describe 'Temporary Folder Functionality on Update'

  test('should return 500 when an unexpected error occurs', async () => {
    // Mock Folder.get to throw an error
    (Folder.get as jest.Mock).mockRejectedValue(new Error('Database error'));

    const event = createMockEvent(
      {
        use: 'use3',
        path: '/updated',
        accessType: 'outbound'
      },
      { id: 'folder123' }
    );
    const result = await handler(event as any);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  });

  test('should update folder and create S3 folder when path is changed', async () => {
    // Mock Folder.get to return a folder
    (Folder.get as jest.Mock).mockResolvedValue(mockFolder);
    // Mock Product.get to return a product
    (Product.get as jest.Mock).mockResolvedValue(mockProduct);
    // Mock Folder.update to return an updated folder with new path
    const updatedFolder = {
      ...mockFolder,
      path: '/newpath',
      updated: new Date('2023-01-03')
    };
    (Folder.update as jest.Mock).mockResolvedValue(updatedFolder);

    const event = createMockEvent(
      {
        path: '/newpath'
      },
      { id: 'folder123' }
    );
    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);

    // Verify folder was updated in the database
    expect(Folder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        id: 'folder123',
        productId: 'product123',
        path: '/newpath'
      })
    );

    // Verify S3 folder was created for the new path
    expect(s3Utils.ensureSubfoldersExist).toHaveBeenCalledWith(
      'prod1-ext-bucket',
      'tenant123',
      ['/newpath']
    );
  });

  test('should update folder and create S3 folder when accessType is changed', async () => {
    // Mock Folder.get to return a folder with inbound access
    (Folder.get as jest.Mock).mockResolvedValue(mockFolder);
    // Mock Product.get to return a product
    (Product.get as jest.Mock).mockResolvedValue(mockProduct);
    // Mock Folder.update to return an updated folder with outbound access
    const updatedFolder = {
      ...mockFolder,
      accessType: 'outbound',
      updated: new Date('2023-01-03')
    };
    (Folder.update as jest.Mock).mockResolvedValue(updatedFolder);

    const event = createMockEvent(
      {
        accessType: 'outbound'
      },
      { id: 'folder123' }
    );
    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);

    // Verify folder was updated in the database
    expect(Folder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        id: 'folder123',
        productId: 'product123',
        accessType: 'outbound'
      })
    );

    // Verify S3 folder was created in the INT bucket
    expect(s3Utils.ensureSubfoldersExist).toHaveBeenCalledWith(
      'prod1-int-bucket',
      'tenant123',
      ['/use1']
    );
  });

  test('should update folder in database even if S3 folder creation fails', async () => {
    // Mock Folder.get to return a folder
    (Folder.get as jest.Mock).mockResolvedValue(mockFolder);
    // Mock Product.get to return a product
    (Product.get as jest.Mock).mockResolvedValue(mockProduct);
    // Mock Folder.update to return an updated folder
    const updatedFolder = {
      ...mockFolder,
      path: '/newpath',
      updated: new Date('2023-01-03')
    };
    (Folder.update as jest.Mock).mockResolvedValue(updatedFolder);
    // Mock ensureSubfoldersExist to throw an error on SECOND call (internal bucket)
    (s3Utils.ensureSubfoldersExist as jest.Mock)
      .mockResolvedValueOnce(undefined) // First call succeeds (external bucket)
      .mockRejectedValueOnce(new Error('S3 error')); // Second call fails (internal bucket)

    const event = createMockEvent(
      {
        path: '/newpath'
      },
      { id: 'folder123' }
    );

    // With the new behavior, this should fail with a 500 error
    const result = await handler(event as any);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });

    // Verify folder was updated in the database
    expect(Folder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        id: 'folder123',
        productId: 'product123',
        path: '/newpath'
      })
    );

    // Verify both S3 folder creation attempts
    expect(s3Utils.ensureSubfoldersExist).toHaveBeenCalledTimes(2);
    expect(s3Utils.ensureSubfoldersExist).toHaveBeenNthCalledWith(
      1,
      'prod1-ext-bucket',
      'tenant123',
      ['/newpath']
    );
    expect(s3Utils.ensureSubfoldersExist).toHaveBeenNthCalledWith(
      2,
      'prod1-int-bucket',
      'tenant123',
      ['/newpath']
    );
  });

  test('should not attempt to create S3 folder when active status is updated but path/accessType is not', async () => {
    // Mock Folder.get to return a folder
    (Folder.get as jest.Mock).mockResolvedValue(mockFolder);
    // Mock Product.get to return a product
    (Product.get as jest.Mock).mockResolvedValue(mockProduct);
    // Mock Folder.update to return an updated folder
    const updatedFolder = {
      ...mockFolder,
      active: false,
      updated: new Date('2023-01-03')
    };
    (Folder.update as jest.Mock).mockResolvedValue(updatedFolder);

    const event = createMockEvent(
      {
        active: false
      },
      { id: 'folder123' }
    );
    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);

    // Verify folder was updated in the database
    expect(Folder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        active: false
      })
    );
    // Verify S3 folder creation was NOT called
    expect(s3Utils.ensureSubfoldersExist).not.toHaveBeenCalled();
  });

  describe('Temporary Folder Functionality on Update', () => {
    const baseUpdatePayload = {
      // Using a payload that doesn't trigger S3 updates by default
      use: 'use2' // Change 'use' to have some update data
    };

    beforeEach(() => {
      // Ensure mocks from outer scope are available or re-mock if necessary
      (Folder.get as jest.Mock).mockResolvedValue(mockFolder);
      (Product.get as jest.Mock).mockResolvedValue(mockProduct);
      (Folder.update as jest.Mock).mockImplementation((updateData) =>
        Promise.resolve({ ...mockFolder, ...updateData })
      );
      (s3Utils.ensureSubfoldersExist as jest.Mock).mockClear(); // Clear S3 mock for these specific tests
    });

    test('should set expires to 6 hours in the future when temporary is true', async () => {
      const event = createMockEvent(
        {
          ...baseUpdatePayload,
          temporary: true
        },
        { id: 'folder123' }
      );
      await handler(event as any);

      const expectedExpires = Math.floor(mockDateNow / 1000) + 6 * 60 * 60;
      expect(Folder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          expires: expectedExpires,
          id: 'folder123',
          use: 'use2' // Ensure other update fields are present
        })
      );
      // If 'use' is the only change besides 'temporary', S3 should not be called.
      expect(s3Utils.ensureSubfoldersExist).not.toHaveBeenCalled();
    });

    test('should set expires to 0 when temporary is false', async () => {
      const event = createMockEvent(
        {
          ...baseUpdatePayload,
          temporary: false
        },
        { id: 'folder123' }
      );
      await handler(event as any);

      expect(Folder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          expires: 0,
          id: 'folder123',
          use: 'use2'
        })
      );
      expect(s3Utils.ensureSubfoldersExist).not.toHaveBeenCalled();
    });

    test('should not include expires in update if temporary is not provided', async () => {
      const event = createMockEvent(baseUpdatePayload, { id: 'folder123' });
      await handler(event as any);

      const updateCallArgs = (Folder.update as jest.Mock).mock.calls[0][0];
      expect(updateCallArgs).not.toHaveProperty('expires');
      expect(updateCallArgs).toEqual(
        expect.objectContaining({
          use: baseUpdatePayload.use,
          id: 'folder123'
        })
      );
      expect(s3Utils.ensureSubfoldersExist).not.toHaveBeenCalled();
    });
  }); // This closes the 'Temporary Folder Functionality on Update' describe

  // This is the existing final test case for unexpected errors
  test('should return 500 when an unexpected error occurs', async () => {
    // Mock Folder.get to throw an error
    (Folder.get as jest.Mock).mockRejectedValue(new Error('Database error'));

    const event = createMockEvent(
      {
        use: 'use3',
        path: '/updated',
        accessType: 'outbound'
      },
      { id: 'folder123' }
    );
    const result = await handler(event as any);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  });

  describe('Temporary Folder Functionality on Update', () => {
    const baseUpdatePayload = {
      // Using a payload that doesn't trigger S3 updates by default
      use: 'use2' // Change 'use' to have some update data
    };

    beforeEach(() => {
      (Folder.get as jest.Mock).mockResolvedValue(mockFolder); // mockFolder is defined in the outer describe
      (Product.get as jest.Mock).mockResolvedValue(mockProduct); // mockProduct is defined in the outer describe
      (Folder.update as jest.Mock).mockImplementation((updateData) =>
        Promise.resolve({ ...mockFolder, ...updateData })
      );
      (s3Utils.ensureSubfoldersExist as jest.Mock).mockClear(); // Clear S3 mock for these specific tests
    });

    test('should set expires to 6 hours in the future when temporary is true', async () => {
      const event = createMockEvent(
        // createMockEvent is defined in the outer describe
        {
          ...baseUpdatePayload,
          temporary: true
        },
        { id: 'folder123' }
      );
      await handler(event as any);

      const expectedExpires = Math.floor(mockDateNow / 1000) + 6 * 60 * 60; // mockDateNow is defined in the outer describe
      expect(Folder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          expires: expectedExpires,
          id: 'folder123',
          use: 'use2'
        })
      );
      expect(s3Utils.ensureSubfoldersExist).not.toHaveBeenCalled(); // Ensure S3 not called if only temp changes
    });

    test('should set expires to 0 when temporary is false', async () => {
      const event = createMockEvent(
        {
          ...baseUpdatePayload,
          temporary: false
        },
        { id: 'folder123' }
      );
      await handler(event as any);

      expect(Folder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          expires: 0,
          id: 'folder123',
          use: 'use2'
        })
      );
      expect(s3Utils.ensureSubfoldersExist).not.toHaveBeenCalled();
    });

    test('should not include expires in update if temporary is not provided', async () => {
      const event = createMockEvent(baseUpdatePayload, { id: 'folder123' }); // temporary is undefined
      await handler(event as any);

      const updateCallArgs = (Folder.update as jest.Mock).mock.calls[0][0];
      expect(updateCallArgs).not.toHaveProperty('expires');
      expect(updateCallArgs).toEqual(
        expect.objectContaining({
          use: baseUpdatePayload.use,
          id: 'folder123'
        })
      );
      expect(s3Utils.ensureSubfoldersExist).not.toHaveBeenCalled();
    });
  });

  test('should return 500 when an unexpected error occurs', async () => {
    // Mock Folder.get to throw an error
    (Folder.get as jest.Mock).mockRejectedValue(new Error('Database error'));

    const event = createMockEvent(
      {
        use: 'use3',
        path: '/updated',
        accessType: 'outbound'
      },
      { id: 'folder123' }
    );
    const result = await handler(event as any);
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: true,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  });

  test('should not attempt to create S3 folder when active status is updated but path/accessType is not', async () => {
    // Mock Folder.get to return a folder
    (Folder.get as jest.Mock).mockResolvedValue(mockFolder);
    // Mock Product.get to return a product
    (Product.get as jest.Mock).mockResolvedValue(mockProduct);
    // Mock Folder.update to return an updated folder with active set to false
    const inactiveFolder = {
      ...mockFolder,
      active: false,
      updated: new Date('2023-01-03')
    };
    (Folder.update as jest.Mock).mockResolvedValue(inactiveFolder);

    const event = createMockEvent(
      {
        active: false
      },
      { id: 'folder123' }
    );
    const result = await handler(event as any);
    expect(result.statusCode).toBe(200);

    // Verify folder was updated in the database
    expect(Folder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant123',
        id: 'folder123',
        productId: 'product123',
        active: false
      })
    );

    // S3 folder creation should NOT be called since path/accessType didn't change
    expect(s3Utils.ensureSubfoldersExist).not.toHaveBeenCalled();
  });
});
