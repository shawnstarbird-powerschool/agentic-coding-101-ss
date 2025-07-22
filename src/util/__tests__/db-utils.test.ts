import { Folder, Product, TransferLog } from '../db-schema';
import {
  createS3TransferLog,
  getFolderById,
  getProductAndFoldersByCode,
  getProductAndFoldersById,
  getProductFolders
} from '../db-utils';

// Mock the db-schema module
jest.mock('../db-schema', () => ({
  TransferLog: {
    create: jest.fn().mockResolvedValue({})
  },
  Product: {
    get: jest.fn(),
    find: jest.fn()
  },
  Folder: {
    get: jest.fn(),
    find: jest.fn()
  }
}));

describe('db-utils', () => {
  // Create spies for the mocked functions
  const transferLogCreateSpy = jest.spyOn(TransferLog, 'create');
  const productGetSpy = jest.spyOn(Product, 'get');
  const productFindSpy = jest.spyOn(Product, 'find');
  const folderGetSpy = jest.spyOn(Folder, 'get');
  const folderFindSpy = jest.spyOn(Folder, 'find');

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createS3TransferLog', () => {
    it('should create a TransferLog record for inbound transfers', async () => {
      // Mock S3 record
      const mockS3Record = {
        eventSource: 'aws:s3',
        eventName: 'ObjectCreated:Put',
        s3: {
          bucket: { name: 'power-ftp-dev-pm-ext' },
          object: { key: 'tenant1/path/to/file.txt', size: 1024 }
        },
        eventTime: '2025-04-15T12:00:00.000Z',
        userIdentity: {
          principalId: 'AWS:AROAVSVS6BAHBCDU4QNRV:user123'
        },
        requestParameters: { sourceIPAddress: '10.0.144.9' }
      };

      // Call the function
      await createS3TransferLog(mockS3Record, 'inbound');

      // Verify the function calls
      // Use expect.objectContaining to check for required fields without caring about startedAt
      expect(transferLogCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceIPAddress: '10.0.144.9',
          principalId: 'AWS:AROAVSVS6BAHBCDU4QNRV:user123',
          tenantId: 'tenant1',
          fileName: 'power-ftp-dev-pm-ext/tenant1/path/to/file.txt',
          direction: 'inbound',
          sourceRecord: mockS3Record
        })
      );
    });

    it('should create a TransferLog record for outbound transfers', async () => {
      // Mock S3 record
      const mockS3Record = {
        eventSource: 'aws:s3',
        eventName: 'ObjectCreated:Put',
        s3: {
          bucket: { name: 'power-ftp-dev-pm-int' },
          object: { key: 'tenant2/path/to/file.csv', size: 2048 }
        },
        eventTime: '2025-04-15T12:00:00.000Z',
        userIdentity: {
          principalId: 'AWS:AROAVSVS6BAHBCDU4QNRV:user456'
        },
        requestParameters: { sourceIPAddress: '10.0.144.10' }
      };

      // Call the function
      await createS3TransferLog(mockS3Record, 'outbound');

      // Verify the function calls
      expect(transferLogCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceIPAddress: '10.0.144.10',
          principalId: 'AWS:AROAVSVS6BAHBCDU4QNRV:user456',
          tenantId: 'tenant2',
          fileName: 'power-ftp-dev-pm-int/tenant2/path/to/file.csv',
          direction: 'outbound',
          sourceRecord: mockS3Record
        })
      );
    });

    it('should handle missing userIdentity and requestParameters', async () => {
      // Mock S3 record with missing fields
      const mockS3Record = {
        eventSource: 'aws:s3',
        eventName: 'ObjectCreated:Put',
        s3: {
          bucket: { name: 'power-ftp-dev-pm-ext' },
          object: { key: 'tenant3/path/to/file.pdf', size: 3072 }
        },
        eventTime: '2025-04-15T12:00:00.000Z'
        // No userIdentity or requestParameters
      };

      // Call the function
      await createS3TransferLog(mockS3Record, 'inbound');

      // Verify the function calls
      expect(transferLogCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceIPAddress: '0.0.0.0',
          principalId: 'unknown',
          tenantId: 'tenant3',
          fileName: 'power-ftp-dev-pm-ext/tenant3/path/to/file.pdf',
          direction: 'inbound',
          sourceRecord: mockS3Record
        })
      );
    });

    it('should handle errors gracefully', async () => {
      // Mock TransferLog.create to throw an error
      transferLogCreateSpy.mockRejectedValueOnce(new Error('Database error'));

      // Mock S3 record
      const mockS3Record = {
        eventSource: 'aws:s3',
        eventName: 'ObjectCreated:Put',
        s3: {
          bucket: { name: 'power-ftp-dev-pm-ext' },
          object: { key: 'tenant4/path/to/file.txt', size: 1024 }
        },
        eventTime: '2025-04-15T12:00:00.000Z'
      };

      // Call the function (should not throw)
      await expect(
        createS3TransferLog(mockS3Record, 'inbound')
      ).resolves.not.toThrow();

      // Verify the function calls
      expect(transferLogCreateSpy).toHaveBeenCalled();
    });
  });

  describe('getProductFolders', () => {
    it('should return folders for a product', async () => {
      // Mock product and folders
      const mockProduct = {
        id: 'product123',
        productCode: 'TEST',
        name: 'Test Product',
        productPublicKey: 'test-public-key',
        multiTenant: true,
        uses: [{ name: 'a' }, { name: 'b' }, { name: 'c' }]
      };
      const mockFolders = [
        {
          id: 'folder1',
          tenantId: '1234',
          accessType: 'inbound',
          productId: 'product123',
          name: 'folder1',
          path: '/folder1',
          use: 'a',
          GSI1PK: 'ALL_FOLDERS',
          GSI1SK: 'PRODUCT#product123#FOLDER#folder1',
          created: new Date(),
          updated: new Date()
        },
        {
          id: 'folder2',
          tenantId: '1234',
          accessType: 'inbound',
          productId: 'product123',
          name: 'folder2',
          path: '/folder2',
          use: 'b',
          GSI1PK: 'ALL_FOLDERS',
          GSI1SK: 'PRODUCT#product123#FOLDER#folder2',
          created: new Date(),
          updated: new Date()
        }
      ];

      // Mock Folder.find to return the mock folders
      folderFindSpy.mockResolvedValueOnce(mockFolders as any);

      // Call the function
      const result = await getProductFolders({
        tenantId: '1234',
        product: mockProduct
      });

      // Verify the function calls
      expect(folderFindSpy).toHaveBeenCalledWith(
        {
          GSI1PK: 'ALL_FOLDERS',
          GSI1SK: {
            begins: 'PRODUCT#product123'
          }
        },
        { index: 'GSI1' }
      );

      // Verify the result
      expect(result).toEqual(mockFolders);
    });
  });

  describe('getProductAndFoldersById', () => {
    it('should return a product and its folders by ID', async () => {
      // Mock product and folders
      const mockProduct = {
        id: 'product123',
        productCode: 'TEST',
        name: 'Test Product',
        productPublicKey: 'test-public-key',
        multiTenant: true,
        uses: [{ name: 'a' }, { name: 'b' }, { name: 'c' }]
      };
      const mockFolders = [
        {
          id: 'folder1',
          tenantId: 'tenant123',
          productId: 'product123',
          name: 'folder1',
          path: '/folder1',
          GSI1PK: 'ALL_FOLDERS',
          GSI1SK: 'PRODUCT#product123#FOLDER#folder1',
          created: new Date(),
          updated: new Date()
        },
        {
          id: 'folder2',
          tenantId: 'tenant123',
          productId: 'product123',
          name: 'folder2',
          path: '/folder2',
          GSI1PK: 'ALL_FOLDERS',
          GSI1SK: 'PRODUCT#product123#FOLDER#folder2',
          created: new Date(),
          updated: new Date()
        }
      ];

      // Mock Product.get to return the mock product
      productGetSpy.mockResolvedValueOnce(mockProduct);
      // Mock Folder.find to return the mock folders
      folderFindSpy.mockResolvedValueOnce(mockFolders as any);

      // Call the function
      const result = await getProductAndFoldersById({
        tenantId: 'tenant123',
        productId: 'product123'
      });

      // Verify the function calls
      expect(productGetSpy).toHaveBeenCalledWith({ id: 'product123' });
      expect(folderFindSpy).toHaveBeenCalledWith(
        {
          GSI1PK: 'ALL_FOLDERS',
          GSI1SK: {
            begins: 'PRODUCT#product123'
          }
        },
        { index: 'GSI1' }
      );

      // Verify the result
      expect(result).toEqual({
        product: mockProduct,
        folders: mockFolders
      });
    });

    it('should throw an error if product is not found', async () => {
      // Mock Product.get to return undefined (product not found)
      productGetSpy.mockResolvedValueOnce(undefined);

      // Call the function and expect it to throw
      await expect(
        getProductAndFoldersById({
          tenantId: 'tenant123',
          productId: 'nonexistent'
        })
      ).rejects.toThrow('Product with ID nonexistent not found');

      // Verify the function calls
      expect(productGetSpy).toHaveBeenCalledWith({ id: 'nonexistent' });
      expect(folderFindSpy).not.toHaveBeenCalled();
    });
  });

  describe('getProductAndFoldersByCode', () => {
    it('should return a product and its folders by code', async () => {
      // Mock products and folders
      const mockProducts = [
        {
          id: 'product123',
          productCode: 'TEST',
          name: 'Test Product',
          productPublicKey: 'test-public-key',
          multiTenant: true,
          uses: [{ name: 'a' }, { name: 'b' }, { name: 'c' }]
        },
        {
          id: 'product456',
          productCode: 'OTHER',
          name: 'Other Test Product',
          productPublicKey: 'other-public-key',
          multiTenant: false,
          uses: [{ name: 'x' }, { name: 'y' }, { name: 'z' }]
        }
      ];
      const mockFolders = [
        {
          tenantId: 'tenant123',
          id: 'folder1',
          productId: 'product123',
          name: 'folder1',
          path: '/folder1',
          GSI1PK: 'ALL_FOLDERS',
          GSI1SK: 'PRODUCT#product123#FOLDER#folder1',
          created: new Date(),
          updated: new Date()
        },
        {
          tenantId: 'tenant123',
          id: 'folder2',
          productId: 'product123',
          name: 'folder2',
          path: '/folder2',
          GSI1PK: 'ALL_FOLDERS',
          GSI1SK: 'PRODUCT#product123#FOLDER#folder2',
          created: new Date(),
          updated: new Date()
        }
      ];

      // Mock Product.find to return the mock products
      productFindSpy.mockResolvedValueOnce(mockProducts);
      // Mock Folder.find to return the mock folders
      folderFindSpy.mockResolvedValueOnce(mockFolders as any);

      // Call the function
      const result = await getProductAndFoldersByCode({
        tenantId: 'tenant123',
        productCode: 'TEST'
      });

      // Verify the function calls
      expect(productFindSpy).toHaveBeenCalledWith(
        { GSI1PK: 'ALL_PRODUCTS' },
        { index: 'GSI1' }
      );
      expect(folderFindSpy).toHaveBeenCalledWith(
        {
          GSI1PK: 'ALL_FOLDERS',
          GSI1SK: {
            begins: 'PRODUCT#product123'
          }
        },
        { index: 'GSI1' }
      );

      // Verify the result
      expect(result).toEqual({
        product: mockProducts[0],
        folders: mockFolders
      });
    });

    it('should throw an error if product is not found by code', async () => {
      // Mock Product.find to return products without the one we're looking for
      productFindSpy.mockResolvedValueOnce([
        {
          id: 'product456',
          productCode: 'OTHER',
          name: 'Other Test Product',
          productPublicKey: 'other-public-key',
          multiTenant: false,
          uses: [{ name: 'x' }, { name: 'y' }, { name: 'z' }]
        }
      ]);

      // Call the function and expect it to throw
      await expect(
        getProductAndFoldersByCode({
          tenantId: '123',
          productCode: 'NONEXISTENT'
        })
      ).rejects.toThrow('Product with code NONEXISTENT not found');

      // Verify the function calls
      expect(productFindSpy).toHaveBeenCalledWith(
        { GSI1PK: 'ALL_PRODUCTS' },
        { index: 'GSI1' }
      );
      expect(folderFindSpy).not.toHaveBeenCalled();
    });
  });

  describe('getFolderById', () => {
    it('should return a folder by ID', async () => {
      // Mock folder
      const mockFolder = {
        id: 'folder123',
        productId: 'product123',
        name: 'folder123',
        path: '/folder123',
        GSI1PK: 'ALL_FOLDERS',
        GSI1SK: 'PRODUCT#product123#FOLDER#folder123',
        created: new Date(),
        updated: new Date()
      };

      // Mock Folder.get to return the mock folder
      folderGetSpy.mockResolvedValueOnce(mockFolder as any);

      // Call the function
      const result = await getFolderById({
        tenantId: 'tenant123',
        id: 'folder123'
      });

      // Verify the function calls
      expect(folderGetSpy).toHaveBeenCalledWith({
        tenantId: 'tenant123',
        id: 'folder123'
      });

      // Verify the result
      expect(result).toEqual(mockFolder);
    });

    it('should throw an error if folder is not found', async () => {
      // Mock Folder.get to return undefined (folder not found)
      folderGetSpy.mockResolvedValueOnce(undefined);

      // Call the function and expect it to throw
      await expect(
        getFolderById({
          tenantId: 'tenant123',
          id: 'nonexistent'
        })
      ).rejects.toThrow('Folder with ID nonexistent not found');

      // Verify the function calls
      expect(folderGetSpy).toHaveBeenCalledWith({
        tenantId: 'tenant123',
        id: 'nonexistent'
      });
    });
  });
});
