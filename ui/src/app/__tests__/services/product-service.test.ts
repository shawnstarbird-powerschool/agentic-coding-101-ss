import {getProducts} from '../../services/product-service';
import * as mfeUtils from '@ps-refarch-ux/mfe-utils';
import {getBaseUrl, getSessionHeaders} from '../../utils/session-utils';
import {SessionRef} from '../../types/session-types';
import {ApiErrorResponse} from '../../types/common-types';

// Mock the dependencies
jest.mock('../../utils/session-utils');

describe('product-service', () => {
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

  describe('getProducts', () => {
    it('should fetch and map products successfully', async () => {
      const mockApiResponse = {
        products: [
          {
            id: '1',
            productCode: 'TEST',
            name: 'Test Product',
            uses: ['inbound', 'outbound'],
            folders: ['folder1'],
            multiTenant: true,
            created: '2024-01-01',
            updated: '2024-01-02'
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

      const result = await getProducts(mockSessionRef);

      expect(result).toEqual([{
        id: '1',
        code: 'TEST',
        name: 'Test Product',
        uses: ['inbound', 'outbound'],
        folders: ['folder1'],
        multiTenant: true,
        created: '2024-01-01',
        updated: '2024-01-02'
      }]);
      expect(superFetchSpy).toHaveBeenCalledWith(
        `${mockBaseUrl}/products`,
        expect.any(Function),
        {
          method: 'GET',
          credentials: 'include',
          headers: mockHeaders
        },
        expect.any(Function)
      );
    });

    it('should use productCode as name when name is not provided', async () => {
      const mockApiResponse = {
        products: [
          {
            id: '1',
            productCode: 'TEST',
            uses: ['inbound'],
            folders: [],
            multiTenant: false,
            created: '2024-01-01',
            updated: '2024-01-01'
          }
        ]
      };

      jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback) => {
          if (successCallback) {
            successCallback(mockApiResponse);
          }
        }
      );

      const result = await getProducts(mockSessionRef);

      expect(result[0].name).toBe('TEST');
    });

    it('should reject with error on invalid response format', async () => {
      jest.spyOn(mfeUtils, 'superFetch').mockImplementation(
        (url, successCallback) => {
          if (successCallback) {
            successCallback({invalidFormat: true});
          }
        }
      );

      await expect(getProducts(mockSessionRef)).rejects.toThrow('Unexpected response format from /products API');
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

      await expect(getProducts(mockSessionRef)).rejects.toBe(errorMessage);
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

      await expect(getProducts(mockSessionRef)).rejects.toBe('Failed to fetch products');
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

      await expect(getProducts(mockSessionRef)).rejects.toBe('Failed to fetch products');
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

      await expect(getProducts(mockSessionRef)).rejects.toThrow('Failed to fetch products');
    });
  });
});