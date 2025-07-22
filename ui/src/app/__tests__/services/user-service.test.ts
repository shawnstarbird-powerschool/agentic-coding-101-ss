import {superFetch} from '@ps-refarch-ux/mfe-utils';
import {getUsers, getUser, createUser, updateUser, updateUserStatus} from '../../services/user-service';
import {SessionRef} from '../../types/session-types';

jest.mock('@ps-refarch-ux/mfe-utils', () => {
  return {
    superFetch: jest.fn()
  };
});

describe('user-service', () => {
  const mockSessionRef: SessionRef = {
    mfeBackendServer: 'http://test-server',
    headerName: 'X-Test-Header',
    headerValue: 'test-value'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    const mockUsersResponse = {
      users: [
        {
          id: '1',
          username: 'testuser',
          authenticationType: 'password',
          access: 'read',
          productCode: 'TEST',
          productName: 'Test Product',
          folders: ['folder1'],
          ipWhitelist: ['127.0.0.1'],
          active: true,
          tenantId: 'tenant1',
          lastLogin: '2023-01-01',
          name: 'Test User',
          created: '2023-01-01',
          updated: '2023-01-01'
        }
      ]
    };

    it('should fetch and map users successfully', async () => {
      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback(mockUsersResponse);
      });

      const users = await getUsers(mockSessionRef);
      expect(users).toHaveLength(1);
      expect(users[0]).toEqual({
        id: '1',
        username: 'testuser',
        authType: 'password',
        access: 'read',
        productCode: 'TEST',
        productName: 'Test Product',
        folders: ['folder1'],
        ipWhitelist: ['127.0.0.1'],
        active: true,
        tenantId: 'tenant1',
        lastLogin: '2023-01-01',
        name: 'Test User',
        created: '2023-01-01',
        updated: '2023-01-01'
      });
    });

    it('should fallback to productCode when productName is not available', async () => {
      const responseWithNoProductName = {
        users: [
          {
            ...mockUsersResponse.users[0],
            productName: undefined
          }
        ]
      };
      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback(responseWithNoProductName);
      });

      const users = await getUsers(mockSessionRef);
      expect(users[0].productName).toBe(users[0].productCode);
    });

    it('should include inactive users when flag is true', async () => {
      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback(mockUsersResponse);
      });

      await getUsers(mockSessionRef, true);
      expect(superFetch).toHaveBeenCalledWith(
        'http://test-server/users?include=inactive',
        expect.any(Function),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should handle unexpected API response format', async () => {
      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback(null);
      });
      await expect(getUsers(mockSessionRef)).rejects.toThrow('Unexpected response format from /users API');

      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback({notUsers: []});
      });
      await expect(getUsers(mockSessionRef)).rejects.toThrow('Unexpected response format from /users API');
    });

    it('should handle API error with error message', async () => {
      const errorResponse = {message: 'API Error'};
      (superFetch as jest.Mock).mockImplementation(async (url, success, options, errorCallback) => {
        errorCallback({
          json: () => {
            return Promise.resolve(errorResponse);
          }
        });
      });

      await expect(getUsers(mockSessionRef)).rejects.toEqual('API Error');
    });

    it('should handle API error without message', async () => {
      (superFetch as jest.Mock).mockImplementation(async (url, success, options, errorCallback) => {
        errorCallback({
          json: () => {
            return Promise.resolve({});
          }
        });
      });

      await expect(getUsers(mockSessionRef)).rejects.toEqual('Failed to fetch users');
    });

    it('should handle JSON parse error in error callback', async () => {
      (superFetch as jest.Mock).mockImplementation((url, success, options, errorCallback) => {
        errorCallback({
          json: () => {
            throw new Error('JSON parse error');
          }
        });
      });

      await expect(getUsers(mockSessionRef)).rejects.toThrow('Failed to fetch users');
    });
  });

  describe('getUser', () => {
    const mockUserResponse = {
      user: {
        id: '1',
        username: 'testuser',
        authenticationType: 'password',
        access: 'read',
        productCode: 'TEST',
        folders: ['folder1'],
        ipWhitelist: ['127.0.0.1'],
        active: true,
        tenantId: 'tenant1',
        lastLogin: '2023-01-01',
        name: 'Test User',
        created: '2023-01-01',
        updated: '2023-01-01'
      }
    };

    it('should fetch and map user successfully', async () => {
      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback(mockUserResponse);
      });

      const user = await getUser(mockSessionRef, '1');
      expect(user).toEqual({
        id: '1',
        username: 'testuser',
        authType: 'Password',
        access: 'read',
        productCode: 'TEST',
        folders: ['folder1'],
        ipWhitelist: ['127.0.0.1'],
        active: true,
        tenantId: 'tenant1',
        lastLogin: '2023-01-01',
        name: 'Test User',
        created: '2023-01-01',
        updated: '2023-01-01'
      });
    });

    it('should handle non-password authentication type', async () => {
      const sshResponse = {
        user: {
          ...mockUserResponse.user,
          authenticationType: 'ssh'
        }
      };
      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback(sshResponse);
      });

      const user = await getUser(mockSessionRef, '1');
      expect(user.authType).toBe('ssh');
    });

    it('should handle invalid response format', async () => {
      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback({invalid: 'format'});
      });

      await expect(getUser(mockSessionRef, '1')).rejects.toThrow('Unexpected response format from /users API');
    });

    it('should handle API error with error message', async () => {
      const errorResponse = {message: 'API Error'};
      (superFetch as jest.Mock).mockImplementation(async (url, success, options, errorCallback) => {
        errorCallback({
          json: () => {
            return Promise.resolve(errorResponse);
          }
        });
      });

      await expect(getUser(mockSessionRef, '1')).rejects.toEqual('API Error');
    });

    it('should handle JSON parse error', async () => {
      (superFetch as jest.Mock).mockImplementation((url, success, options, errorCallback) => {
        errorCallback({
          json: () => {
            throw new Error('JSON parse error');
          }
        });
      });

      await expect(getUser(mockSessionRef, '1')).rejects.toThrow('Failed to fetch user');
    });

    it('should handle API error with default message when json response is empty', async () => {
      const errorResponse = {};
      (superFetch as jest.Mock).mockImplementation(async (url, success, options, errorCallback) => {
        errorCallback({
          json: () => {
            return Promise.resolve(errorResponse);
          }
        });
      });

      await expect(getUser(mockSessionRef, '1')).rejects.toEqual('Failed to fetch user');
    });
  });

  describe('sessionRef edge cases', () => {
    it('should handle missing mfeBackendServer in getUser', async () => {
      const sessionRefWithoutServer: SessionRef = {
        headerName: 'X-Test-Header',
        headerValue: 'test-value'
      };

      const mockUserResponse = {
        user: {
          id: '1',
          username: 'testuser',
          authenticationType: 'password',
          access: 'read',
          productCode: 'TEST'
        }
      };

      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback(mockUserResponse);
      });

      await getUser(sessionRefWithoutServer, '1');
      expect(superFetch).toHaveBeenCalledWith(
        '/users/1',
        expect.any(Function),
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'X-Test-Header': 'test-value'
          }
        },
        expect.any(Function)
      );
    });

    it('should handle missing headers in getUser', async () => {
      const sessionRefWithoutHeaders: SessionRef = {
        mfeBackendServer: 'http://test-server'
      };

      const mockUserResponse = {
        user: {
          id: '1',
          username: 'testuser',
          authenticationType: 'password'
        }
      };

      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback(mockUserResponse);
      });

      await getUser(sessionRefWithoutHeaders, '1');
      expect(superFetch).toHaveBeenCalledWith(
        'http://test-server/users/1',
        expect.any(Function),
        {
          method: 'GET',
          credentials: 'include',
          headers: undefined
        },
        expect.any(Function)
      );
    });

    it('should handle missing server in createUser', async () => {
      const sessionRefWithoutServer: SessionRef = {
        headerName: 'X-Test-Header',
        headerValue: 'test-value'
      };

      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback({id: '1'});
      });

      await createUser(sessionRefWithoutServer, {username: 'test'});
      expect(superFetch).toHaveBeenCalledWith(
        '/users',
        expect.any(Function),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Test-Header': 'test-value'
          },
          body: JSON.stringify({username: 'test'}),
          credentials: 'include'
        },
        expect.any(Function)
      );
    });

    it('should handle missing headers in createUser', async () => {
      const sessionRefWithoutHeaders: SessionRef = {
        mfeBackendServer: 'http://test-server'
      };

      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback({id: '1'});
      });

      await createUser(sessionRefWithoutHeaders, {username: 'test'});
      expect(superFetch).toHaveBeenCalledWith(
        'http://test-server/users',
        expect.any(Function),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({username: 'test'}),
          credentials: 'include'
        },
        expect.any(Function)
      );
    });

    it('should handle missing server in updateUser', async () => {
      const sessionRefWithoutServer: SessionRef = {
        headerName: 'X-Test-Header',
        headerValue: 'test-value'
      };

      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback({success: true});
      });

      await updateUser(sessionRefWithoutServer, '1', {username: 'test'});
      expect(superFetch).toHaveBeenCalledWith(
        '/users/1',
        expect.any(Function),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Test-Header': 'test-value'
          },
          body: JSON.stringify({username: 'test'}),
          credentials: 'include'
        },
        expect.any(Function)
      );
    });

    it('should handle missing headers in updateUser', async () => {
      const sessionRefWithoutHeaders: SessionRef = {
        mfeBackendServer: 'http://test-server'
      };

      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback({success: true});
      });

      await updateUser(sessionRefWithoutHeaders, '1', {username: 'test'});
      expect(superFetch).toHaveBeenCalledWith(
        'http://test-server/users/1',
        expect.any(Function),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({username: 'test'}),
          credentials: 'include'
        },
        expect.any(Function)
      );
    });
  });

  describe('createUser', () => {
    const mockUserData = {
      username: 'newuser',
      password: 'password123'
    };

    it('should create user successfully', async () => {
      const mockResponse = {success: true};
      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback(mockResponse);
      });

      const result = await createUser(mockSessionRef, mockUserData);
      expect(result).toEqual(mockResponse);
      expect(superFetch).toHaveBeenCalledWith(
        'http://test-server/users',
        expect.any(Function),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Test-Header': 'test-value'
          },
          body: JSON.stringify(mockUserData),
          credentials: 'include'
        },
        expect.any(Function)
      );
    });

    it('should handle API error', async () => {
      const errorResponse = {message: 'API Error'};
      (superFetch as jest.Mock).mockImplementation((url, success, options, errorCallback) => {
        errorCallback({
          json: () => {
            return Promise.resolve(errorResponse);
          }
        });
      });

      await expect(createUser(mockSessionRef, mockUserData)).rejects.toEqual(errorResponse);
    });

    it('should handle JSON parse error', async () => {
      (superFetch as jest.Mock).mockImplementation((url, success, options, errorCallback) => {
        errorCallback({
          json: () => {
            throw new Error('JSON parse error');
          }
        });
      });

      await expect(createUser(mockSessionRef, mockUserData)).rejects.toThrow('Failed to create user');
    });
  });

  describe('updateUser', () => {
    const mockUpdateData = {
      username: 'updateduser'
    };

    it('should update user successfully', async () => {
      const mockResponse = {success: true};
      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback(mockResponse);
      });

      const result = await updateUser(mockSessionRef, '1', mockUpdateData);
      expect(result).toEqual(mockResponse);
      expect(superFetch).toHaveBeenCalledWith(
        'http://test-server/users/1',
        expect.any(Function),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Test-Header': 'test-value'
          },
          body: JSON.stringify(mockUpdateData),
          credentials: 'include'
        },
        expect.any(Function)
      );
    });

    it('should handle API error', async () => {
      const errorResponse = {message: 'API Error'};
      (superFetch as jest.Mock).mockImplementation((url, success, options, errorCallback) => {
        errorCallback({
          json: () => {
            return Promise.resolve(errorResponse);
          }
        });
      });

      await expect(updateUser(mockSessionRef, '1', mockUpdateData)).rejects.toEqual(errorResponse);
    });

    it('should handle JSON parse error', async () => {
      (superFetch as jest.Mock).mockImplementation((url, success, options, errorCallback) => {
        errorCallback({
          json: () => {
            throw new Error('JSON parse error');
          }
        });
      });

      await expect(updateUser(mockSessionRef, '1', mockUpdateData)).rejects.toThrow('Failed to update user');
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status successfully', async () => {
      const mockResponse = {success: true};
      (superFetch as jest.Mock).mockImplementation((url, successCallback) => {
        successCallback(mockResponse);
      });

      const result = await updateUserStatus(mockSessionRef, '1', false);
      expect(result).toEqual(mockResponse);
      expect(superFetch).toHaveBeenCalledWith(
        'http://test-server/users/1',
        expect.any(Function),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Test-Header': 'test-value'
          },
          body: JSON.stringify({active: false}),
          credentials: 'include'
        },
        expect.any(Function)
      );
    });

    it('should handle error when updating status', async () => {
      const errorResponse = {message: 'API Error'};
      (superFetch as jest.Mock).mockImplementation((url, success, options, errorCallback) => {
        errorCallback({
          json: () => {
            return Promise.resolve(errorResponse);
          }
        });
      });

      await expect(updateUserStatus(mockSessionRef, '1', true)).rejects.toEqual(errorResponse);
    });
  });
});