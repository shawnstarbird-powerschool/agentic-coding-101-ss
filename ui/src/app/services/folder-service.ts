import {superFetch} from '@ps-refarch-ux/mfe-utils';
import {ApiErrorResponse} from '../types/common-types';
import {Folder, GetFoldersResponse, FolderFormData, FolderStatusUpdate} from '../types/folder-types';
import {SessionRef} from '../types/session-types';
import {getBaseUrl, getSessionHeaders} from '../utils/session-utils';

/**
 * Get a list of all folders
 * @param sessionRef Session reference for API calls
 * @param includeInactive Whether to include inactive folders
 * @returns Promise with the list of folders
 */
export const getFolders = async (
  sessionRef: SessionRef,
  includeInactive = false
): Promise<Array<Folder>> => {
  return new Promise((resolve, reject) => {
    const baseUrl = getBaseUrl(sessionRef);
    const url = includeInactive
      ? `${baseUrl}/folders?include=inactive`
      : `${baseUrl}/folders`;

    superFetch(
      url,
      (payload): void => {
        // When there are no folders, API returns HTML content
        // In this case, resolve with an empty array
        if (typeof payload === 'string' && payload.includes('<!DOCTYPE html>')) {
          resolve([]);
          return;
        }

        if (payload && typeof payload === 'object' && 'folders' in payload) {
          const foldersResponse = payload as GetFoldersResponse;
          // Map the API response to our component's Folder interface
          const mappedFolders = foldersResponse.folders.map((folder): Folder => {
            return {
              id: folder.id,
              path: folder.path,
              productCode: folder.productCode,
              use: folder.use,
              accessType: folder.accessType,
              active: folder.active
            };
          });
          resolve(mappedFolders);
        } else {
          reject(new Error('Unexpected response format from /folders API'));
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
            reject(json.message || 'Failed to fetch folders');
          });
        } catch (e) {
          reject(new Error('Failed to fetch folders'));
        }
      }
    );
  });
};

/**
 * Create a new folder
 * @param sessionRef Session reference for API calls
 * @param folderData Folder data to create
 * @returns Promise with the created folder
 */
export const createFolder = async (
  sessionRef: SessionRef,
  folderData: FolderFormData
): Promise<Folder> => {
  return new Promise((resolve, reject) => {
    const baseUrl = getBaseUrl(sessionRef);
    superFetch(
      `${baseUrl}/folders`,
      (payload): void => {
        resolve(payload as Folder);
      },
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getSessionHeaders(sessionRef)
        },
        body: JSON.stringify(folderData),
        credentials: 'include'
      },
      (error): void => {
        try {
          error.json().then((json: ApiErrorResponse): void => {
            reject(json);
          });
        } catch (e) {
          reject(new Error('Failed to create folder'));
        }
      }
    );
  });
};

/**
 * Update an existing folder
 * @param sessionRef Session reference for API calls
 * @param folderId ID of the folder to update
 * @param folderData Folder data to update
 * @returns Promise with the updated folder
 */
export const updateFolder = async (
  sessionRef: SessionRef,
  folderId: string,
  folderData: Partial<FolderFormData> | FolderStatusUpdate
): Promise<Folder> => {
  return new Promise((resolve, reject) => {
    const baseUrl = getBaseUrl(sessionRef);
    superFetch(
      `${baseUrl}/folders/${folderId}`,
      (payload): void => {
        resolve(payload as Folder);
      },
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getSessionHeaders(sessionRef)
        },
        body: JSON.stringify(folderData),
        credentials: 'include'
      },
      (error): void => {
        try {
          error.json().then((json: ApiErrorResponse): void => {
            reject(json);
          });
        } catch (e) {
          reject(new Error('Failed to update folder'));
        }
      }
    );
  });
};

/**
 * Update folder active status (deactivate/reactivate)
 * @param sessionRef Session reference for API calls
 * @param folderId ID of the folder to update
 * @param active New active status
 * @returns Promise with the updated folder
 */
export const updateFolderStatus = async (
  sessionRef: SessionRef,
  folderId: string,
  active: boolean
): Promise<Folder> => {
  const statusUpdate: FolderStatusUpdate = {active};
  return updateFolder(sessionRef, folderId, statusUpdate);
};
