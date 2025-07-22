import {useState, useEffect, useCallback} from 'react';
import {User} from '../types/user-types';
import {SessionRef} from '../types/session-types';
import {getUsers, getUser, createUser, updateUser, updateUserStatus} from '../services/user-service';
import {isSessionReady} from '../utils/session-utils';

/**
 * Custom hook for managing user data and operations
 * @param sessionRef Session reference for API calls
 * @param includeInactive Whether to include inactive users
 * @returns Object with user data and operations
 */
export const useUsers = (sessionRef: SessionRef, includeInactive = false): {
  users: Array<User>;
  loading: boolean;
  error: string | null;
  processingUserId: string | null;
  hasInitialized: boolean;
  fetchUsers: () => Promise<void>;
  fetchUser: (userId: string) => Promise<User | null>;
  addUser: (userData: any) => Promise<any>;
  updateUserData: (userId: string, userData: any) => Promise<any>;
  toggleUserStatus: (userId: string) => Promise<any>;
} => {
  const [users, setUsers] = useState<Array<User>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!isSessionReady(sessionRef)) {
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const fetchedUsers = await getUsers(sessionRef, includeInactive);
      setUsers(fetchedUsers);
      setHasInitialized(true);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(typeof err === 'string' ? err : 'Failed to fetch users');
      setHasInitialized(true);
      setLoading(false);
    }
  }, [sessionRef, includeInactive]);

  // Fetch a single user
  const fetchUser = useCallback(async (userId: string) => {
    if (!isSessionReady(sessionRef)) {
      return null;
    }

    try {
      setError(null);
      const user = await getUser(sessionRef, userId);
      return user;
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(typeof err === 'string' ? err : 'Failed to fetch user');
      return null;
    }
  }, [sessionRef]);

  // Create a new user
  const addUser = useCallback(async (userData: any) => {
    if (!isSessionReady(sessionRef)) {
      return null;
    }

    try {
      setError(null);
      const result = await createUser(sessionRef, userData);
      return result;
    } catch (err) {
      console.error('Error creating user:', err);
      throw err; // Let the component handle the error
    }
  }, [sessionRef, fetchUsers]);

  // Update an existing user
  const updateUserData = useCallback(async (userId: string, userData: any) => {
    if (!isSessionReady(sessionRef)) {
      return null;
    }

    try {
      setError(null);
      const result = await updateUser(sessionRef, userId, userData);
      return result;
    } catch (err) {
      console.error('Error updating user:', err);
      throw err; // Let the component handle the error
    }
  }, [sessionRef]);

  // Update user active status
  const toggleUserStatus = useCallback(async (userId: string) => {
    if (!isSessionReady(sessionRef)) {
      return null;
    }

    try {
      setProcessingUserId(userId);
      setError(null);

      // Find the user to update
      const userToUpdate = users.find((user) => {
        return user.id === userId;
      });
      if (!userToUpdate) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Toggle the active status
      const result = await updateUserStatus(sessionRef, userId, !userToUpdate.active);

      // Update the local state
      setUsers(users.map((user) => {
        if (user.id === userId) {
          return {
            ...user,
            active: !user.active
          };
        }
        return user;
      }));

      setProcessingUserId(null);
      return result;
    } catch (err) {
      console.error('Error updating user status:', err);
      setProcessingUserId(null);
      throw err; // Let the component handle the error
    }
  }, [sessionRef, users]);

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    processingUserId,
    hasInitialized,
    fetchUsers,
    fetchUser,
    addUser,
    updateUserData,
    toggleUserStatus
  };
};

export default useUsers;
