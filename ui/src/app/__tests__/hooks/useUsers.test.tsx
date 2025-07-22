import {renderHook, act, waitFor} from '@testing-library/react';
import {useUsers} from '../../hooks/useUsers';
import {getUsers, getUser, createUser, updateUser, updateUserStatus} from '../../services/user-service';
import {isSessionReady} from '../../utils/session-utils';
import {User} from '../../types/user-types';
import {SessionRef} from '../../types/session-types';

// Mock the dependencies
jest.mock('../../services/user-service');
jest.mock('../../utils/session-utils');

const mockedUserService = {
  getUsers: getUsers as jest.MockedFunction<typeof getUsers>,
  getUser: getUser as jest.MockedFunction<typeof getUser>,
  createUser: createUser as jest.MockedFunction<typeof createUser>,
  updateUser: updateUser as jest.MockedFunction<typeof updateUser>,
  updateUserStatus: updateUserStatus as jest.MockedFunction<typeof updateUserStatus>
};

const mockedIsSessionReady = isSessionReady as jest.MockedFunction<typeof isSessionReady>;

describe('useUsers', () => {
  const mockSessionRef: SessionRef = {
    headerName: 'test-header',
    headerValue: 'test-value',
    mfeBackendServer: 'test-server'
  };

  const mockUser: User = {
    id: 'user-1',
    username: 'testuser',
    authType: 'password',
    access: 'read-write',
    productCode: 'TEST_PRODUCT',
    productName: 'Test Product',
    folders: [
      {
        id: 'folder-1',
        path: '/test/path',
        use: 'inbound',
        accessType: 'sftp'
      }
    ],
    ipWhitelist: ['192.168.1.1', '10.0.0.1'],
    active: true,
    tenantId: 'tenant-1',
    name: 'Test User',
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z',
    lastLogin: 1640995200000
  };

  const mockUsers: Array<User> = [
    mockUser,
    {
      id: 'user-2',
      username: 'testuser2',
      authType: 'ssh-key',
      access: 'read-only',
      productCode: 'ANOTHER_PRODUCT',
      folders: [],
      active: false,
      tenantId: 'tenant-1'
    }
  ];

  const mockUserData = {
    username: 'newuser',
    authType: 'password',
    access: 'read-write',
    productCode: 'TEST_PRODUCT',
    folders: ['folder-1'],
    ipWhitelist: ['192.168.1.100'],
    password: 'testpassword'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsSessionReady.mockReturnValue(true);
    // Suppress console.error for tests
    jest.spyOn(console, 'error').mockImplementation(() => {
      // Suppress console.error for tests
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      mockedIsSessionReady.mockReturnValue(false);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef, false);
      });

      expect(result.current.users).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.processingUserId).toBe(null);
      expect(typeof result.current.fetchUsers).toBe('function');
      expect(typeof result.current.fetchUser).toBe('function');
      expect(typeof result.current.addUser).toBe('function');
      expect(typeof result.current.updateUserData).toBe('function');
      expect(typeof result.current.toggleUserStatus).toBe('function');
    });

    it('should not fetch users when session is not ready', () => {
      mockedIsSessionReady.mockReturnValue(false);

      renderHook(() => {
        return useUsers(mockSessionRef);
      });

      expect(mockedUserService.getUsers).not.toHaveBeenCalled();
    });

    it('should fetch users on mount when session is ready', async () => {
      mockedUserService.getUsers.mockResolvedValue(mockUsers);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockedUserService.getUsers).toHaveBeenCalledWith(mockSessionRef, false);
      expect(result.current.users).toEqual(mockUsers);
      expect(result.current.error).toBe(null);
    });

    it('should pass includeInactive parameter correctly', async () => {
      mockedUserService.getUsers.mockResolvedValue(mockUsers);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef, true);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockedUserService.getUsers).toHaveBeenCalledWith(mockSessionRef, true);
    });
  });

  describe('fetchUsers', () => {
    it('should successfully fetch and update users', async () => {
      mockedUserService.getUsers.mockResolvedValue(mockUsers);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      await act(async () => {
        await result.current.fetchUsers();
      });

      expect(result.current.users).toEqual(mockUsers);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle fetch error with string message', async () => {
      const errorMessage = 'Network error';
      mockedUserService.getUsers.mockRejectedValue(errorMessage);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      await act(async () => {
        await result.current.fetchUsers();
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error fetching users:', errorMessage);
    });

    it('should handle fetch error with Error object', async () => {
      const error = new Error('Failed to fetch');
      mockedUserService.getUsers.mockRejectedValue(error);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      await act(async () => {
        await result.current.fetchUsers();
      });

      expect(result.current.error).toBe('Failed to fetch users');
      expect(result.current.loading).toBe(false);
    });

    it('should not proceed when session is not ready', async () => {
      mockedIsSessionReady.mockReturnValue(false);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      await act(async () => {
        await result.current.fetchUsers();
      });

      expect(mockedUserService.getUsers).not.toHaveBeenCalled();
    });

    it('should clear error state before fetching', async () => {
      // First, cause an error
      mockedUserService.getUsers.mockRejectedValueOnce('First error');

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      await act(async () => {
        await result.current.fetchUsers();
      });

      expect(result.current.error).toBe('First error');

      // Then, make a successful call
      mockedUserService.getUsers.mockResolvedValueOnce(mockUsers);

      await act(async () => {
        await result.current.fetchUsers();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.users).toEqual(mockUsers);
    });
  });

  describe('fetchUser', () => {
    it('should successfully fetch a single user', async () => {
      mockedUserService.getUser.mockResolvedValue(mockUser);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      let fetchedUser: User | null;
      await act(async () => {
        fetchedUser = await result.current.fetchUser('user-1');
      });

      expect(mockedUserService.getUser).toHaveBeenCalledWith(mockSessionRef, 'user-1');
      expect(fetchedUser!).toEqual(mockUser);
      expect(result.current.error).toBe(null);
    });

    it('should handle fetch user error', async () => {
      const error = new Error('User not found');
      mockedUserService.getUser.mockRejectedValue(error);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      let fetchedUser: User | null;
      await act(async () => {
        fetchedUser = await result.current.fetchUser('nonexistent-user');
      });

      expect(result.current.error).toBe('Failed to fetch user');
      expect(fetchedUser!).toBe(null);
      expect(console.error).toHaveBeenCalledWith('Error fetching user:', error);
    });

    it('should return null when session is not ready', async () => {
      mockedIsSessionReady.mockReturnValue(false);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      let fetchedUser: User | null;
      await act(async () => {
        fetchedUser = await result.current.fetchUser('user-1');
      });

      expect(mockedUserService.getUser).not.toHaveBeenCalled();
      expect(fetchedUser!).toBe(null);
    });

    it('should handle string error messages', async () => {
      const errorMessage = 'String error';
      mockedUserService.getUser.mockRejectedValue(errorMessage);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      let fetchedUser: User | null;
      await act(async () => {
        fetchedUser = await result.current.fetchUser('user-1');
      });

      expect(result.current.error).toBe(errorMessage);
      expect(fetchedUser!).toBe(null);
    });
  });

  describe('addUser', () => {
    it('should successfully create a new user', async () => {
      const createdUser = {...mockUser, id: 'new-user'};
      mockedUserService.createUser.mockResolvedValue(createdUser);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      let result_user: any;
      await act(async () => {
        result_user = await result.current.addUser(mockUserData);
      });

      expect(mockedUserService.createUser).toHaveBeenCalledWith(mockSessionRef, mockUserData);
      expect(result_user).toEqual(createdUser);
      expect(result.current.error).toBe(null);
    });

    it('should handle create user error', async () => {
      const error = new Error('Creation failed');
      mockedUserService.createUser.mockRejectedValue(error);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      await act(async () => {
        try {
          await result.current.addUser(mockUserData);
        } catch (thrownError) {
          expect(thrownError).toBe(error);
        }
      });

      expect(console.error).toHaveBeenCalledWith('Error creating user:', error);
    });

    it('should return null when session is not ready', async () => {
      mockedIsSessionReady.mockReturnValue(false);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      let result_user: any;
      await act(async () => {
        result_user = await result.current.addUser(mockUserData);
      });

      expect(mockedUserService.createUser).not.toHaveBeenCalled();
      expect(result_user).toBe(null);
    });
  });

  describe('updateUserData', () => {
    it('should successfully update user data', async () => {
      const updatedUser = {...mockUser, username: 'updateduser'};
      mockedUserService.updateUser.mockResolvedValue(updatedUser);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      const updateData = {username: 'updateduser'};
      let result_user: any;
      await act(async () => {
        result_user = await result.current.updateUserData('user-1', updateData);
      });

      expect(mockedUserService.updateUser).toHaveBeenCalledWith(mockSessionRef, 'user-1', updateData);
      expect(result_user).toEqual(updatedUser);
      expect(result.current.error).toBe(null);
    });

    it('should handle update user error', async () => {
      const error = new Error('Update failed');
      mockedUserService.updateUser.mockRejectedValue(error);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      await act(async () => {
        try {
          await result.current.updateUserData('user-1', {username: 'newname'});
        } catch (thrownError) {
          expect(thrownError).toBe(error);
        }
      });

      expect(console.error).toHaveBeenCalledWith('Error updating user:', error);
    });

    it('should return null when session is not ready', async () => {
      mockedIsSessionReady.mockReturnValue(false);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      let result_user: any;
      await act(async () => {
        result_user = await result.current.updateUserData('user-1', {username: 'newname'});
      });

      expect(mockedUserService.updateUser).not.toHaveBeenCalled();
      expect(result_user).toBe(null);
    });
  });

  describe('toggleUserStatus', () => {
    beforeEach(() => {
      mockedUserService.getUsers.mockResolvedValue(mockUsers);
    });

    it('should successfully toggle user status from active to inactive', async () => {
      const updatedUser = {...mockUser, active: false};
      mockedUserService.updateUserStatus.mockResolvedValue(updatedUser);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let result_user: any;
      await act(async () => {
        result_user = await result.current.toggleUserStatus('user-1');
      });

      expect(mockedUserService.updateUserStatus).toHaveBeenCalledWith(mockSessionRef, 'user-1', false);
      expect(result_user).toEqual(updatedUser);
      expect(result.current.processingUserId).toBe(null);

      // Check that local state was updated
      const updatedUserInState = result.current.users.find((u) => {
        return u.id === 'user-1';
      });
      expect(updatedUserInState?.active).toBe(false);
    });

    it('should successfully toggle user status from inactive to active', async () => {
      const inactiveUser = {...mockUsers[1], active: false};
      const activatedUser = {...inactiveUser, active: true};
      mockedUserService.updateUserStatus.mockResolvedValue(activatedUser);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let result_user: any;
      await act(async () => {
        result_user = await result.current.toggleUserStatus('user-2');
      });

      expect(mockedUserService.updateUserStatus).toHaveBeenCalledWith(mockSessionRef, 'user-2', true);
      expect(result_user).toEqual(activatedUser);
    });

    it('should handle user not found error', async () => {
      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.toggleUserStatus('nonexistent-user');
        } catch (error: any) {
          expect(error.message).toBe('User with ID nonexistent-user not found');
        }
      });

      expect(result.current.processingUserId).toBe(null);
    });

    it('should handle toggle status error', async () => {
      const error = new Error('Status update failed');
      mockedUserService.updateUserStatus.mockRejectedValue(error);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.toggleUserStatus('user-1');
        } catch (thrownError) {
          expect(thrownError).toBe(error);
        }
      });

      expect(result.current.processingUserId).toBe(null);
      expect(console.error).toHaveBeenCalledWith('Error updating user status:', error);
    });

    it('should set and clear processingUserId correctly', async () => {
      let resolvePromise: (value: User) => void;
      const promise = new Promise<User>((resolve) => {
        resolvePromise = resolve;
      });
      mockedUserService.updateUserStatus.mockReturnValue(promise);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.toggleUserStatus('user-1');
      });

      expect(result.current.processingUserId).toBe('user-1');

      await act(async () => {
        resolvePromise!({...mockUser, active: false});
        await promise;
      });

      expect(result.current.processingUserId).toBe(null);
    });

    it('should return null when session is not ready', async () => {
      mockedIsSessionReady.mockReturnValue(false);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      let result_user: any;
      await act(async () => {
        result_user = await result.current.toggleUserStatus('user-1');
      });

      expect(mockedUserService.updateUserStatus).not.toHaveBeenCalled();
      expect(result_user).toBe(null);
    });
  });

  describe('effect dependencies', () => {
    it('should refetch users when fetchUsers dependencies change', async () => {
      mockedUserService.getUsers.mockResolvedValue(mockUsers);

      const {result, rerender} = renderHook(
        ({sessionRef, includeInactive}) => {
          return useUsers(sessionRef, includeInactive);
        },
        {initialProps: {sessionRef: mockSessionRef, includeInactive: false}}
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Change includeInactive
      rerender({sessionRef: mockSessionRef, includeInactive: true});

      expect(mockedUserService.getUsers).toHaveBeenCalledTimes(2);
      expect(mockedUserService.getUsers).toHaveBeenLastCalledWith(mockSessionRef, true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple operations correctly', async () => {
      mockedUserService.getUsers.mockResolvedValue(mockUsers);
      mockedUserService.createUser.mockResolvedValue({...mockUser, id: 'new-user'});
      mockedUserService.updateUserStatus.mockResolvedValue({...mockUser, active: false});

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      // Initial fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.users).toEqual(mockUsers);

      // Create user
      await act(async () => {
        await result.current.addUser(mockUserData);
      });

      // Toggle user status
      await act(async () => {
        await result.current.toggleUserStatus('user-1');
      });

      expect(mockedUserService.getUsers).toHaveBeenCalledTimes(1);
      expect(mockedUserService.createUser).toHaveBeenCalledTimes(1);
      expect(mockedUserService.updateUserStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle empty users list correctly', async () => {
      mockedUserService.getUsers.mockResolvedValue([]);

      const {result} = renderHook(() => {
        return useUsers(mockSessionRef);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.users).toEqual([]);
      expect(result.current.error).toBe(null);
    });
  });
});