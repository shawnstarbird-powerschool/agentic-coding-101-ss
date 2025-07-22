// Product-related API services

import {superFetch} from '@ps-refarch-ux/mfe-utils';
import {Product, GetProductsResponse} from '../types/product-types';
import {ApiErrorResponse} from '../types/common-types';
import {SessionRef} from '../types/session-types';
import {getBaseUrl, getSessionHeaders} from '../utils/session-utils';

/**
 * Get a list of all products
 * @param sessionRef Session reference for API calls
 * @returns Promise with the list of products
 */
export const getProducts = async (
  sessionRef: SessionRef
): Promise<Array<Product>> => {
  return new Promise((resolve, reject) => {
    const baseUrl = getBaseUrl(sessionRef);
    superFetch(
      `${baseUrl}/products`,
      (payload): void => {
        if (payload && typeof payload === 'object' && 'products' in payload) {
          const productsResponse = payload as GetProductsResponse;
          // Map the API response to our component's Product interface
          const mappedProducts = productsResponse.products.map((product): Product => {
            return {
              id: product.id,
              code: product.productCode,
              name: product.name || product.productCode,
              uses: product.uses,
              folders: product.folders,
              multiTenant: product.multiTenant,
              created: product.created,
              updated: product.updated
            };
          });
          resolve(mappedProducts);
        } else {
          reject(new Error('Unexpected response format from /products API'));
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
            reject(json.message || 'Failed to fetch products');
          });
        } catch (e) {
          reject(new Error('Failed to fetch products'));
        }
      }
    );
  });
};
