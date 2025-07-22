/* eslint-disable import/first */
process.env.APP_TABLE_NAME = 'power-ftp-dev-gary';
process.env.TRANSFER_USER_ROLE_ARN =
  'arn:aws:iam::123456789012:role/transfer-user-role';
process.env.TRANSFER_BUCKET_TEST_INT = 'test-int-bucket';
process.env.TRANSFER_BUCKET_TEST_EXT = 'test-ext-bucket';

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { Product, ProductType, User, UserType } from '../../util/db-schema';
import { getFolderById } from '../../util/db-utils';
import { isIpInCidrList } from '../../util/ip-utils';
import { verifyPassword } from '../../util/user-utils';
import {
  findCommonAncestorPath,
  getUserAuthorizationInfo,
  lambdaHandler
} from '../auth-handler';
/* eslint-enable import/first */

// Mock the AWS SDK S3 client
const s3Mock = mockClient(S3Client);

// Mock the dependencies
jest.mock('../../util/db-schema', () => {
  const originalModule = jest.requireActual('../../util/db-schema');
  return {
    ...originalModule,
    User: {
      get: jest.fn(),
      find: jest.fn(),
      update: jest.fn()
    },
    Product: {
      get: jest.fn()
    }
  };
});

jest.mock('../../util/db-utils', () => {
  return {
    getFolderById: jest.fn()
  };
});

jest.mock('../../util/ip-utils', () => {
  return {
    isIpInCidrList: jest.fn()
  };
});

jest.mock('../../util/user-utils', () => {
  return {
    verifyPassword: jest.fn()
  };
});

describe('Auth Handler', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    s3Mock.reset();
  });

  // Helper function to create a mock event
  const createMockEvent = (
    pathParameters: Record<string, string> = {},
    headers: Record<string, string> = {}
  ): APIGatewayProxyEvent => {
    return {
      pathParameters,
      body: null,
      headers,
      multiValueHeaders: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '',
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: ''
    };
  };

  // Mock user data
  const mockPasswordUser: UserType = {
    id: 'user123',
    tenantId: 'tenant123',
    name: 'Password User',
    username: 'passworduser',
    authenticationType: 'password',
    passwordHash: 'hashedpassword123',
    folders: ['folder123'],
    access: 'readwrite',
    active: true,
    productId: 'product123',
    isProductUser: false
  };

  const mockSshKeyUser: UserType = {
    id: 'user456',
    tenantId: 'tenant123',
    name: 'SSH Key User',
    username: 'sshkeyuser',
    authenticationType: 'ssh-key',
    publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ...',
    folders: ['folder456'],
    access: 'read',
    active: true,
    productId: 'product123',
    isProductUser: false
  };

  const mockInactiveUser: UserType = {
    id: 'user789',
    tenantId: 'tenant123',
    name: 'Inactive User',
    username: 'inactiveuser',
    authenticationType: 'password',
    passwordHash: 'hashedpassword789',
    folders: ['folder789'],
    access: 'read',
    active: false,
    productId: 'product123',
    isProductUser: false
  };

  const mockProductUser: UserType = {
    id: 'productuser123',
    tenantId: 'tenant123',
    name: 'Product User',
    username: 'productuser',
    authenticationType: 'password',
    passwordHash: 'hashedpassword123',
    access: 'readwrite',
    active: true,
    productId: 'product123',
    isProductUser: true
  };

  const mockProduct: ProductType = {
    id: 'product123',
    productCode: 'TEST',
    name: 'Test Product',
    productPublicKey: 'test-public-key',
    multiTenant: false,
    PK: 'PRODUCT#product123',
    uses: [{ name: 'use1' }, { name: 'use2' }]
  };

  const mockMultiTenantProduct: ProductType = {
    id: 'product456',
    productCode: 'TEST',
    name: 'Test Product',
    productPublicKey: 'test-public-key',
    multiTenant: true,
    PK: 'PRODUCT#product456',
    uses: [{ name: 'use3' }, { name: 'use4' }]
  };

  describe('lambdaHandler', () => {
    test('should return 400 when serverId or username is missing', async () => {
      const event = createMockEvent({});
      const result = await lambdaHandler(event);
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Missing required path parameters: serverId and username'
      });
    });

    test('should return 404 when user is not found', async () => {
      // Mock User.find to return empty array (user not found)
      (User.find as jest.Mock).mockResolvedValue([]);

      const event = createMockEvent({
        serverId: 'server1',
        username: 'nonexistent'
      });
      const result = await lambdaHandler(event);
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({
        message: 'User not found'
      });
    });

    test('should return 403 when user is inactive', async () => {
      // Mock User.find to return inactive user
      (User.find as jest.Mock).mockResolvedValue([mockInactiveUser]);

      const event = createMockEvent({
        serverId: 'server1',
        username: 'inactiveuser'
      });
      const result = await lambdaHandler(event);
      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toEqual({
        message: 'User account is inactive'
      });
    });

    test('should return 403 when IP is not in whitelist', async () => {
      // Mock User.find to return user with IP whitelist
      const userWithIpWhitelist = {
        ...mockPasswordUser,
        ipWhitelist: ['192.168.1.0/24']
      };
      (User.find as jest.Mock).mockResolvedValue([userWithIpWhitelist]);

      // Mock IP check to return false
      (isIpInCidrList as jest.Mock).mockReturnValue(false);

      const event = createMockEvent(
        { serverId: 'server1', username: 'passworduser' },
        { SourceIP: '10.0.0.1' }
      );
      const result = await lambdaHandler(event);
      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Access denied: IP address not in whitelist'
      });
      expect(isIpInCidrList).toHaveBeenCalledWith('10.0.0.1', [
        '192.168.1.0/24'
      ]);
    });

    test('should return 400 when authentication method mismatch', async () => {
      // Mock User.find to return password user
      (User.find as jest.Mock).mockResolvedValue([mockPasswordUser]);

      // No password in headers but user is password-based
      const event = createMockEvent({
        serverId: 'server1',
        username: 'passworduser'
      });
      const result = await lambdaHandler(event);
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Invalid authentication method'
      });
    });

    test('should return 401 when password is invalid', async () => {
      // Mock User.find to return password user
      (User.find as jest.Mock).mockResolvedValue([mockPasswordUser]);

      // Mock password verification to fail
      (verifyPassword as jest.Mock).mockResolvedValue(false);

      const event = createMockEvent(
        { serverId: 'server1', username: 'passworduser' },
        { Password: 'wrongpassword' }
      );
      const result = await lambdaHandler(event);
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Invalid credentials'
      });
      expect(verifyPassword).toHaveBeenCalledWith(
        'wrongpassword',
        'hashedpassword123'
      );
    });

    test('should return 400 when SSH key user has no public key', async () => {
      // Mock User.find to return SSH key user without public key
      const sshUserWithoutKey = {
        ...mockSshKeyUser,
        publicKey: undefined
      };
      (User.find as jest.Mock).mockResolvedValue([sshUserWithoutKey]);

      const event = createMockEvent({
        serverId: 'server1',
        username: 'sshkeyuser'
      });
      const result = await lambdaHandler(event);
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Public key is required for SSH key authentication'
      });
    });

    test('should return 500 when product is not found', async () => {
      // Mock User.find to return user
      (User.find as jest.Mock).mockResolvedValue([mockPasswordUser]);

      // Mock password verification to succeed
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      // Mock Product.get to return null
      (Product.get as jest.Mock).mockResolvedValue(null);

      const event = createMockEvent(
        { serverId: 'server1', username: 'passworduser' },
        { Password: 'correctpassword' }
      );

      const result = await lambdaHandler(event);
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Internal server error'
      });
    });

    test('should return 500 when bucket environment variable is not set', async () => {
      // Save original env var
      const originalEnv = process.env.TRANSFER_BUCKET_TEST_EXT;

      // Delete the env var to simulate missing configuration
      delete process.env.TRANSFER_BUCKET_TEST_EXT;

      try {
        // Mock User.find to return user
        (User.find as jest.Mock).mockResolvedValue([mockPasswordUser]);

        // Mock password verification to succeed
        (verifyPassword as jest.Mock).mockResolvedValue(true);

        // Mock Product.get to return product
        (Product.get as jest.Mock).mockResolvedValue(mockProduct);

        const event = createMockEvent(
          { serverId: 'server1', username: 'passworduser' },
          { Password: 'correctpassword' }
        );

        const result = await lambdaHandler(event);
        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body)).toEqual({
          message:
            'Internal server error: Product bucket not configured for TRANSFER_BUCKET_TEST_EXT'
        });
      } finally {
        // Restore the env var
        process.env.TRANSFER_BUCKET_TEST_EXT = originalEnv;
      }
    });

    test('should successfully authenticate password user and return authorization config', async () => {
      // Mock User.find to return password user
      (User.find as jest.Mock).mockResolvedValue([mockPasswordUser]);

      // Mock password verification to succeed
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      // Mock Product.get to return product
      (Product.get as jest.Mock).mockResolvedValue(mockProduct);

      // Mock getFolderById
      (getFolderById as jest.Mock).mockResolvedValue({
        path: 'path/to/folder'
      });

      // Mock S3 folder check and creation
      s3Mock.on(HeadObjectCommand).rejects({ name: 'NotFound' });
      s3Mock.on(PutObjectCommand).resolves({});

      // Mock User.update for lastLogin
      (User.update as jest.Mock).mockResolvedValue({});

      const event = createMockEvent(
        { serverId: 'server1', username: 'passworduser' },
        { Password: 'correctpassword' }
      );

      const result = await lambdaHandler(event);
      expect(result.statusCode).toBe(200);

      const authConfig = JSON.parse(result.body);
      expect(authConfig).toHaveProperty(
        'Role',
        process.env.TRANSFER_USER_ROLE_ARN
      );
      expect(authConfig).toHaveProperty('HomeDirectory');
      expect(authConfig).toHaveProperty('Policy');
      expect(authConfig).not.toHaveProperty('PublicKeys');

      // Verify User.update was called to update lastLogin
      expect(User.update).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant123',
          id: 'user123',
          lastLogin: expect.any(Number)
        })
      );
    });

    test('should successfully authenticate SSH key user and return authorization config with public keys', async () => {
      // Mock User.find to return SSH key user
      (User.find as jest.Mock).mockResolvedValue([mockSshKeyUser]);

      // Mock Product.get to return product
      (Product.get as jest.Mock).mockResolvedValue(mockProduct);

      // Mock getFolderById
      (getFolderById as jest.Mock).mockResolvedValue({
        path: 'path/to/folder'
      });

      // Mock S3 folder check and creation
      s3Mock.on(HeadObjectCommand).rejects({ name: 'NotFound' });
      s3Mock.on(PutObjectCommand).resolves({});

      // Mock User.update for lastLogin
      (User.update as jest.Mock).mockResolvedValue({});

      const event = createMockEvent({
        serverId: 'server1',
        username: 'sshkeyuser'
      });

      const result = await lambdaHandler(event);
      expect(result.statusCode).toBe(200);

      const authConfig = JSON.parse(result.body);
      expect(authConfig).toHaveProperty(
        'Role',
        process.env.TRANSFER_USER_ROLE_ARN
      );
      expect(authConfig).toHaveProperty('HomeDirectory');
      expect(authConfig).toHaveProperty('Policy');
      expect(authConfig).toHaveProperty('PublicKeys');
      expect(authConfig.PublicKeys).toEqual([mockSshKeyUser.publicKey]);
    });

    test('should handle error when updating lastLogin but still return success', async () => {
      // Mock User.find to return password user
      (User.find as jest.Mock).mockResolvedValue([mockPasswordUser]);

      // Mock password verification to succeed
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      // Mock Product.get to return product
      (Product.get as jest.Mock).mockResolvedValue(mockProduct);

      // Mock getFolderById
      (getFolderById as jest.Mock).mockResolvedValue({
        path: 'path/to/folder'
      });

      // Mock S3 folder check and creation
      s3Mock.on(HeadObjectCommand).rejects({ name: 'NotFound' });
      s3Mock.on(PutObjectCommand).resolves({});

      // Mock User.update to throw error
      (User.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const event = createMockEvent(
        { serverId: 'server1', username: 'passworduser' },
        { Password: 'correctpassword' }
      );

      const result = await lambdaHandler(event);
      expect(result.statusCode).toBe(200);

      // Verify the error didn't prevent successful authentication
      const authConfig = JSON.parse(result.body);
      expect(authConfig).toHaveProperty(
        'Role',
        process.env.TRANSFER_USER_ROLE_ARN
      );
    });

    test('should return 500 when an unexpected error occurs', async () => {
      // Mock User.find to throw an error
      (User.find as jest.Mock).mockRejectedValue(new Error('Database error'));

      const event = createMockEvent({
        serverId: 'server1',
        username: 'passworduser'
      });
      const result = await lambdaHandler(event);
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Internal server error'
      });
    });
  });

  describe('getUserAuthorizationInfo', () => {
    test('should return correct authorization info for product-multi-tenant user', async () => {
      // Mock getFolderById
      (getFolderById as jest.Mock).mockResolvedValue({
        path: 'path/to/folder'
      });

      const result = await getUserAuthorizationInfo({
        user: { ...mockProductUser, isProductUser: true },
        product: mockMultiTenantProduct,
        bucketName: 'test-bucket'
      });

      expect(result).toEqual({
        homeDirectory: '/test-bucket',
        policy: expect.stringContaining('s3:ListBucket'),
        folderPaths: []
      });

      // Parse the policy to verify it's valid JSON and has the expected structure
      const policy = JSON.parse(result.policy);
      expect(policy.Statement).toHaveLength(2);
      expect(policy.Statement[0].Resource).toEqual([
        'arn:aws:s3:::test-bucket'
      ]);
      expect(policy.Statement[1].Resource).toEqual([
        'arn:aws:s3:::test-bucket/*'
      ]);
    });

    test('should return correct authorization info for product-single-tenant user', async () => {
      // Mock getFolderById
      (getFolderById as jest.Mock).mockResolvedValue({
        path: 'path/to/folder'
      });

      const result = await getUserAuthorizationInfo({
        user: { ...mockProductUser, isProductUser: true },
        product: mockProduct, // non-multi-tenant product
        bucketName: 'test-bucket'
      });

      expect(result).toEqual({
        homeDirectory: '/test-bucket/tenant123',
        policy: expect.stringContaining('s3:ListBucket'),
        folderPaths: []
      });

      // Parse the policy to verify it's valid JSON and has the expected structure
      const policy = JSON.parse(result.policy);
      expect(policy.Statement).toHaveLength(2);
      expect(policy.Statement[0].Resource).toEqual([
        'arn:aws:s3:::test-bucket'
      ]);
      expect(policy.Statement[1].Resource).toEqual([
        'arn:aws:s3:::test-bucket/tenant123/*',
        'arn:aws:s3:::test-bucket/tenant123'
      ]);
    });

    test('should return correct authorization info for human user with single folder', async () => {
      // Mock getFolderById
      (getFolderById as jest.Mock).mockResolvedValue({
        path: 'path/to/folder'
      });

      const result = await getUserAuthorizationInfo({
        user: mockPasswordUser, // human user with folders
        product: mockProduct,
        bucketName: 'test-bucket'
      });

      expect(result).toEqual({
        homeDirectory: '/test-bucket/tenant123/path/to/folder',
        policy: expect.stringContaining('s3:ListBucket'),
        folderPaths: ['path/to/folder']
      });

      // Parse the policy to verify it's valid JSON and has the expected structure
      const policy = JSON.parse(result.policy);
      expect(policy.Statement).toHaveLength(2);
      expect(policy.Statement[0].Resource).toEqual([
        'arn:aws:s3:::test-bucket'
      ]);
      expect(policy.Statement[1].Resource).toEqual([
        'arn:aws:s3:::test-bucket/tenant123/path/to/folder/*',
        'arn:aws:s3:::test-bucket/tenant123/path/to/folder'
      ]);
    });

    test('should return correct authorization info for human user with multiple folders', async () => {
      // User with multiple folders
      const userWithMultipleFolders = {
        ...mockPasswordUser,
        folders: ['folder1', 'folder2']
      };

      // Mock getFolderById for multiple folders
      (getFolderById as jest.Mock)
        .mockResolvedValueOnce({ path: 'path/to/folder1' })
        .mockResolvedValueOnce({ path: 'path/to/folder2' });

      const result = await getUserAuthorizationInfo({
        user: userWithMultipleFolders,
        product: mockProduct,
        bucketName: 'test-bucket'
      });

      expect(result).toEqual({
        homeDirectory: '/test-bucket/tenant123/path/to',
        policy: expect.stringContaining('s3:ListBucket'),
        folderPaths: ['path/to/folder1', 'path/to/folder2']
      });

      // Parse the policy to verify it's valid JSON and has the expected structure
      const policy = JSON.parse(result.policy);
      expect(policy.Statement).toHaveLength(2);
      expect(policy.Statement[0].Resource).toEqual([
        'arn:aws:s3:::test-bucket'
      ]);
      expect(policy.Statement[1].Resource).toEqual([
        'arn:aws:s3:::test-bucket/tenant123/path/to/folder1/*',
        'arn:aws:s3:::test-bucket/tenant123/path/to/folder1',
        'arn:aws:s3:::test-bucket/tenant123/path/to/folder2/*',
        'arn:aws:s3:::test-bucket/tenant123/path/to/folder2'
      ]);
    });

    test('should skip inactive folders for human users', async () => {
      // User with multiple folders, where one is inactive
      const userWithMultipleFolders = {
        ...mockPasswordUser,
        folders: ['active-folder', 'inactive-folder', 'another-active-folder']
      };

      // Mock getFolderById to return active and inactive folders
      (getFolderById as jest.Mock)
        .mockResolvedValueOnce({ path: 'path/to/active-folder', active: true })
        .mockResolvedValueOnce({
          path: 'path/to/inactive-folder',
          active: false
        })
        .mockResolvedValueOnce({
          path: 'path/to/another-folder',
          active: true
        });

      const result = await getUserAuthorizationInfo({
        user: userWithMultipleFolders,
        product: mockProduct,
        bucketName: 'test-bucket'
      });

      // Should only include the active folders
      expect(result.folderPaths).toEqual([
        'path/to/active-folder',
        'path/to/another-folder'
      ]);
      expect(result.folderPaths).not.toContain('path/to/inactive-folder');

      // HomeDirectory should be based on the common path of active folders only
      expect(result.homeDirectory).toBe('/test-bucket/tenant123/path/to');

      // Policy should only include resources for active folders
      const policy = JSON.parse(result.policy);
      const resources = policy.Statement[1].Resource;

      // Should contain resources for active folders
      expect(resources).toContain(
        'arn:aws:s3:::test-bucket/tenant123/path/to/active-folder/*'
      );
      expect(resources).toContain(
        'arn:aws:s3:::test-bucket/tenant123/path/to/active-folder'
      );
      expect(resources).toContain(
        'arn:aws:s3:::test-bucket/tenant123/path/to/another-folder/*'
      );
      expect(resources).toContain(
        'arn:aws:s3:::test-bucket/tenant123/path/to/another-folder'
      );

      // Should NOT contain resources for inactive folder
      expect(resources).not.toContain(
        'arn:aws:s3:::test-bucket/tenant123/path/to/inactive-folder/*'
      );
      expect(resources).not.toContain(
        'arn:aws:s3:::test-bucket/tenant123/path/to/inactive-folder'
      );
    });

    test('should throw error when folder is not found', async () => {
      // Mock getFolderById to return null
      (getFolderById as jest.Mock).mockResolvedValue(null);

      await expect(
        getUserAuthorizationInfo({
          user: mockPasswordUser,
          product: mockProduct,
          bucketName: 'test-bucket'
        })
      ).rejects.toThrow('Folder null not found for user: folder123');
    });

    test('should throw error when user folders is not an array', async () => {
      // User with invalid folders property
      const userWithInvalidFolders = {
        ...mockPasswordUser,
        folders: 'invalid' as any
      };

      await expect(
        getUserAuthorizationInfo({
          user: userWithInvalidFolders,
          product: mockProduct,
          bucketName: 'test-bucket'
        })
      ).rejects.toThrow('User folders should be an array');
    });

    test('should throw error for unknown user authorization type', async () => {
      // Create a scenario where getUserAuthorizationType would return an unknown type
      const invalidUser = {
        ...mockPasswordUser
      } as any;

      // Force the function to go to the else branch
      Object.defineProperty(invalidUser, 'isProductUser', {
        get: jest.fn(() => {
          throw new Error('Property access error');
        })
      });

      await expect(
        getUserAuthorizationInfo({
          user: invalidUser,
          product: mockProduct,
          bucketName: 'test-bucket'
        })
      ).rejects.toThrow();
    });
  });

  describe('findCommonAncestorPath', () => {
    it('should find the common ancestor path for multiple paths', () => {
      const paths = [
        '/path/to/folder1',
        '/path/to/folder2',
        '/path/to/folder3'
      ];
      const result = findCommonAncestorPath(paths);
      expect(result).toBe('path/to');
    });
    it('should find the common ancestor path for multiple short paths', () => {
      const paths = ['/folder1', '/folder2', '/folder3'];
      const result = findCommonAncestorPath(paths);
      expect(result).toBe('');
    });
    it('should return the path if only one path is provided', () => {
      const paths = ['/path/to/folder1'];
      const result = findCommonAncestorPath(paths);
      expect(result).toBe('path/to/folder1');
    });
  });
});
