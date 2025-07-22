// User-related API services

import {superFetch} from '@ps-refarch-ux/mfe-utils';
import {User, GetUsersResponse, GetUserResponse} from '../types/user-types';
import {ApiErrorResponse} from '../types/common-types';
import {SessionRef} from '../types/session-types';
import {getBaseUrl, getSessionHeaders} from '../utils/session-utils';

/**
 * Get a list of all users
 * @param sessionRef Session reference for API calls
 * @param includeInactive Whether to include inactive users
 * @returns Promise with the list of users
 */
export const getUsers = async (
  sessionRef: SessionRef,
  includeInactive = false
): Promise<Array<User>> => {
  return new Promise((resolve, reject) => {
    const baseUrl = getBaseUrl(sessionRef);
    const url = includeInactive
      ? `${baseUrl}/users?include=inactive`
      : `${baseUrl}/users`;
    superFetch(
      url,
      (payload): void => {
        if (payload && typeof payload === 'object' && 'users' in payload) {
          const usersResponse = payload as GetUsersResponse;
          // Map the API response to our component's User interface
          const mappedUsers = usersResponse.users.map((user): User => {
            return {
              id: user.id,
              username: user.username,
              authType: user.authenticationType, // Map authenticationType to authType
              access: user.access,
              productCode: user.productCode,
              productName: user.productName || user.productCode, // Use name if available, fallback to code
              folders: user.folders,
              ipWhitelist: user.ipWhitelist,
              active: user.active,
              tenantId: user.tenantId,
              lastLogin: user.lastLogin,
              name: user.name,
              created: user.created,
              updated: user.updated
            };
          });
          resolve(mappedUsers);
        } else {
          reject(new Error('Unexpected response format from /users API'));
        }
      },
      {
        method: 'GET',
        credentials: 'include',
        headers: getSessionHeaders(sessionRef)
      },
      (error): void => {
        try {
          error.json().then((json: ApiErrorResponse): void => {
            reject(json.message || 'Failed to fetch users');
          });
        } catch (e) {
          reject(new Error('Failed to fetch users'));
        }
      }
    );
  });
};

/**
 * Get a single user by ID
 * @param sessionRef Session reference for API calls
 * @param userId ID of the user to retrieve
 * @returns Promise with the user data
 */
export const getUser = async (
  sessionRef: SessionRef,
  userId: string
): Promise<User> => {
  return new Promise((resolve, reject) => {
    const baseUrl = sessionRef?.mfeBackendServer || '';
    superFetch(
      `${baseUrl}/users/${userId}`,
      (payload): void => {
        if (payload && typeof payload === 'object' && 'user' in payload) {
          const userResponse = payload as GetUserResponse;
          const userData = userResponse.user;

          // Map API response to our component's User interface
          const user: User = {
            id: userData.id,
            username: userData.username,
            authType: userData.authenticationType === 'password' ? 'Password' : userData.authenticationType,
            access: userData.access,
            productCode: userData.productCode,
            folders: userData.folders,
            ipWhitelist: userData.ipWhitelist,
            active: userData.active,
            tenantId: userData.tenantId,
            lastLogin: userData.lastLogin,
            name: userData.name,
            created: userData.created,
            updated: userData.updated
          };
          resolve(user);
        } else {
          reject(new Error('Unexpected response format from /users API'));
        }
      },
      {
        method: 'GET',
        credentials: 'include',
        headers: sessionRef.headerName
          ? {
              [sessionRef.headerName]: sessionRef.headerValue
            }
          : undefined
      },
      (error): void => {
        try {
          error.json().then((json: ApiErrorResponse): void => {
            reject(json.message || 'Failed to fetch user');
          });
        } catch (e) {
          reject(new Error('Failed to fetch user'));
        }
      }
    );
  });
};

/**
 * Create a new user
 * @param sessionRef Session reference for API calls
 * @param userData User data to create
 * @returns Promise with the created user
 */
export const createUser = async (
  sessionRef: SessionRef,
  userData: any
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const baseUrl = sessionRef?.mfeBackendServer || '';
    superFetch(
      `${baseUrl}/users`,
      (payload): void => {
        resolve(payload);
      },
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionRef.headerName
            ? {[sessionRef.headerName]: sessionRef.headerValue}
            : {})
        },
        body: JSON.stringify(userData),
        credentials: 'include'
      },
      (error): void => {
        try {
          error.json().then((json: ApiErrorResponse): void => {
            reject(json);
          });
        } catch (e) {
          reject(new Error('Failed to create user'));
        }
      }
    );
  });
};

/**
 * Update an existing user
 * @param sessionRef Session reference for API calls
 * @param userId ID of the user to update
 * @param userData User data to update
 * @returns Promise with the updated user
 */
export const updateUser = async (
  sessionRef: SessionRef,
  userId: string,
  userData: any
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const baseUrl = sessionRef?.mfeBackendServer || '';
    superFetch(
      `${baseUrl}/users/${userId}`,
      (payload): void => {
        resolve(payload);
      },
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionRef.headerName
            ? {[sessionRef.headerName]: sessionRef.headerValue}
            : {})
        },
        body: JSON.stringify(userData),
        credentials: 'include'
      },
      (error): void => {
        try {
          error.json().then((json: ApiErrorResponse): void => {
            reject(json);
          });
        } catch (e) {
          reject(new Error('Failed to update user'));
        }
      }
    );
  });
};

/**
 * Update user active status
 * @param sessionRef Session reference for API calls
 * @param userId ID of the user to update
 * @param active New active status
 * @returns Promise with the updated user
 */
export const updateUserStatus = async (
  sessionRef: SessionRef,
  userId: string,
  active: boolean
): Promise<any> => {
  return updateUser(sessionRef, userId, {active});
};
