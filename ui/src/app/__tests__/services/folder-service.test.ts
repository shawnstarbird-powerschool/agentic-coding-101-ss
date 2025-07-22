import {getFolders, createFolder, updateFolder, updateFolderStatus} from '../../services/folder-service';
import * as mfeUtils from '@ps-refarch-ux/mfe-utils';
import {getBaseUrl, getSessionHeaders} from '../../utils/session-utils';
import {SessionRef} from '../../types/session-types';
import {ApiErrorResponse} from '../../types/common-types';

// Mock the dependencies
jest.mock('../../utils/session-utils');

describe('folder-service', () => {
  const mockSessionRef: SessionRef = {
    headerName: 'Authorization',
    headerValue: 'Bearer test-token',
    mfeBackendServer: 'http://test-api'
  };
  const mockBaseUrl = 'http://test-api';
  const mockHeaders = {'Authorization': 'Bearer test-token'};

  beforeEach(() => {
    jest.resetAllMocks();
    (getBaseUrl as jest.Mock).mockReturnValue(mockBaseUrl);
    (getSessionHeaders as jest.Mock).mockReturnValue(mockHeaders);
  });

  describe('getFolders', () => {
    it('should construct correct URL for inactive folders', async () => {
      const mockApiResponse = {folders: []};
      const superFetchSpy = jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback) => {
          if (successCallback) {
            successCallback(mockApiResponse);
          }
        }
      );

      await getFolders(mockSessionRef, true);

      expect(superFetchSpy).toHaveBeenCalledWith(
        `${mockBaseUrl}/folders?include=inactive`,
        expect.any(Function),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should fetch and map folders successfully', async () => {
      const mockApiResponse = {
        folders: [
          {
            id: '1',
            path: '/test',
            productCode: 'TEST',
            use: 'inbound',
            accessType: 'sftp',
            active: true
          }
        ]
      };

      const superFetchSpy = jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback) => {
          if (successCallback) {
            successCallback(mockApiResponse);
          }
        }
      );

      const result = await getFolders(mockSessionRef);

      expect(result).toEqual(mockApiResponse.folders);
      expect(superFetchSpy).toHaveBeenCalledWith(
        `${mockBaseUrl}/folders`,
        expect.any(Function),
        {
          method: 'GET',
          credentials: 'include',
          headers: mockHeaders
        },
        expect.any(Function)
      );
    });

    it('should return empty array when API returns HTML content', async () => {
      jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback) => {
          if (successCallback) {
            successCallback('<!DOCTYPE html><html></html>');
          }
        }
      );

      const result = await getFolders(mockSessionRef);

      expect(result).toEqual([]);
    });

    it('should reject with error on invalid response format', async () => {
      jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback) => {
          if (successCallback) {
            successCallback({invalidFormat: true});
          }
        }
      );

      await expect(getFolders(mockSessionRef)).rejects.toThrow('Unexpected response format from /folders API');
    });

    it('should handle API error with message', async () => {
      const errorMessage = 'API Error';
      jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback, options, errorCallback) => {
          if (errorCallback) {
            const error = {
              json: (): Promise<ApiErrorResponse> => {
                return Promise.resolve({message: errorMessage});
              }
            };
            errorCallback(error);
          }
        }
      );

      await expect(getFolders(mockSessionRef)).rejects.toBe(errorMessage);
    });

    it('should handle API error with empty message', async () => {
      jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback, options, errorCallback) => {
          if (errorCallback) {
            const error = {
              json: (): Promise<ApiErrorResponse> => {
                return Promise.resolve({message: ''});
              }
            };
            errorCallback(error);
          }
        }
      );

      await expect(getFolders(mockSessionRef)).rejects.toBe('Failed to fetch folders');
    });

    it('should handle API error without message property', async () => {
      jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback, options, errorCallback) => {
          if (errorCallback) {
            const error = {
              json: (): Promise<ApiErrorResponse> => {
                return Promise.resolve({} as ApiErrorResponse);
              }
            };
            errorCallback(error);
          }
        }
      );

      await expect(getFolders(mockSessionRef)).rejects.toBe('Failed to fetch folders');
    });

    it('should handle API error without message', async () => {
      jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback, options, errorCallback) => {
          if (errorCallback) {
            const error = {
              json: (): Promise<never> => {
                throw new Error('Network error');
              }
            };
            errorCallback(error);
          }
        }
      );

      await expect(getFolders(mockSessionRef)).rejects.toThrow('Failed to fetch folders');
    });
  });

  describe('createFolder', () => {
    const mockFolderData = {
      path: '/test',
      productCode: 'TEST',
      use: 'inbound',
      accessType: 'sftp'
    };

    it('should create folder successfully', async () => {
      const mockResponse = {...mockFolderData, id: '1', active: true};
      jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback) => {
          if (successCallback) {
            successCallback(mockResponse);
          }
        }
      );

      const result = await createFolder(mockSessionRef, mockFolderData);

      expect(result).toEqual(mockResponse);
      expect(mfeUtils.superFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/folders`,
        expect.any(Function),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...mockHeaders
          },
          body: JSON.stringify(mockFolderData),
          credentials: 'include'
        },
        expect.any(Function)
      );
    });

    it('should handle API error with response', async () => {
      const errorResponse = {message: 'Invalid folder data'};
      jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback, options, errorCallback) => {
          if (errorCallback) {
            const error = {
              json: (): Promise<ApiErrorResponse> => {
                return Promise.resolve(errorResponse);
              }
            };
            errorCallback(error);
          }
        }
      );

      await expect(createFolder(mockSessionRef, mockFolderData)).rejects.toEqual(errorResponse);
    });

    it('should handle API error without valid response', async () => {
      jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback, options, errorCallback) => {
          if (errorCallback) {
            const error = {
              json: (): Promise<never> => {
                throw new Error('Network error');
              }
            };
            errorCallback(error);
          }
        }
      );

      await expect(createFolder(mockSessionRef, mockFolderData)).rejects.toThrow('Failed to create folder');
    });
  });

  describe('updateFolder', () => {
    const mockFolderId = '1';
    const mockUpdateData = {
      path: '/updated-test'
    };

    it('should update folder successfully', async () => {
      const mockResponse = {...mockUpdateData, id: mockFolderId};
      jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback) => {
          if (successCallback) {
            successCallback(mockResponse);
          }
        }
      );

      const result = await updateFolder(mockSessionRef, mockFolderId, mockUpdateData);

      expect(result).toEqual(mockResponse);
      expect(mfeUtils.superFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/folders/${mockFolderId}`,
        expect.any(Function),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...mockHeaders
          },
          body: JSON.stringify(mockUpdateData),
          credentials: 'include'
        },
        expect.any(Function)
      );
    });

    it('should handle API error with response', async () => {
      const errorResponse = {message: 'Invalid update data'};
      jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback, options, errorCallback) => {
          if (errorCallback) {
            const error = {
              json: (): Promise<ApiErrorResponse> => {
                return Promise.resolve(errorResponse);
              }
            };
            errorCallback(error);
          }
        }
      );

      await expect(updateFolder(mockSessionRef, mockFolderId, mockUpdateData)).rejects.toEqual(errorResponse);
    });

    it('should handle API error without valid response', async () => {
      jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback, options, errorCallback) => {
          if (errorCallback) {
            const error = {
              json: (): Promise<never> => {
                throw new Error('Network error');
              }
            };
            errorCallback(error);
          }
        }
      );

      await expect(updateFolder(mockSessionRef, mockFolderId, mockUpdateData)).rejects.toThrow('Failed to update folder');
    });
  });

  describe('updateFolderStatus', () => {
    const mockFolderId = '1';
    it('should call updateFolder with correct status data', async () => {
      const mockActive = true;
      const mockResponse = {id: mockFolderId, active: mockActive};
      jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback) => {
          if (successCallback) {
            successCallback(mockResponse);
          }
        }
      );

      const result = await updateFolderStatus(mockSessionRef, mockFolderId, mockActive);

      expect(result).toEqual(mockResponse);
      expect(mfeUtils.superFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/folders/${mockFolderId}`,
        expect.any(Function),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...mockHeaders
          },
          body: JSON.stringify({active: mockActive}),
          credentials: 'include'
        },
        expect.any(Function)
      );
    });
  });
});