import {renderHook, act, waitFor} from '@testing-library/react';
import {useProducts} from '../../hooks/useProducts';
import {getProducts} from '../../services/product-service';
import {isSessionReady} from '../../utils/session-utils';
import {Product, MultiSelectOption} from '../../types/product-types';
import {SessionRef} from '../../types/session-types';

// Mock the dependencies
jest.mock('../../services/product-service');
jest.mock('../../utils/session-utils');

const mockedGetProducts = getProducts as jest.MockedFunction<typeof getProducts>;
const mockedIsSessionReady = isSessionReady as jest.MockedFunction<typeof isSessionReady>;

describe('useProducts', () => {
  const mockSessionRef: SessionRef = {
    headerName: 'test-header',
    headerValue: 'test-value',
    mfeBackendServer: 'test-server'
  };

  const mockProduct: Product = {
    id: 'product-1',
    code: 'TEST_PRODUCT',
    name: 'Test Product',
    multiTenant: true,
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z',
    folders: [
      {
        id: 'folder-1',
        path: '/test/path1',
        use: 'inbound'
      },
      {
        id: 'folder-2',
        path: '/test/path2',
        use: 'outbound'
      }
    ],
    uses: [
      {name: 'inbound'},
      {name: 'outbound'}
    ]
  };

  const mockProducts: Array<Product> = [
    mockProduct,
    {
      id: 'product-2',
      code: 'ANOTHER_PRODUCT',
      name: 'Another Product',
      multiTenant: false,
      folders: [
        {
          id: 'folder-3',
          path: '/another/path',
          use: 'bidirectional'
        }
      ]
    }
  ];

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
        return useProducts(mockSessionRef);
      });

      expect(result.current.products).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.fetchProducts).toBe('function');
      expect(typeof result.current.getFolderOptions).toBe('function');
    });

    it('should not fetch products when session is not ready', () => {
      mockedIsSessionReady.mockReturnValue(false);

      renderHook(() => {
        return useProducts(mockSessionRef);
      });

      expect(mockedGetProducts).not.toHaveBeenCalled();
    });

    it('should fetch products on mount when session is ready', async () => {
      mockedGetProducts.mockResolvedValue(mockProducts);

      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockedGetProducts).toHaveBeenCalledWith(mockSessionRef);
      expect(result.current.products).toEqual(mockProducts);
      expect(result.current.error).toBe(null);
    });
  });

  describe('fetchProducts', () => {
    it('should successfully fetch and update products', async () => {
      mockedGetProducts.mockResolvedValue(mockProducts);

      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      await act(async () => {
        await result.current.fetchProducts();
      });

      expect(result.current.products).toEqual(mockProducts);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle fetch error with string message', async () => {
      const errorMessage = 'Network error';
      mockedGetProducts.mockRejectedValue(errorMessage);

      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      await act(async () => {
        await result.current.fetchProducts();
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error fetching products:', errorMessage);
    });

    it('should handle fetch error with Error object', async () => {
      const error = new Error('Failed to fetch');
      mockedGetProducts.mockRejectedValue(error);

      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      await act(async () => {
        await result.current.fetchProducts();
      });

      expect(result.current.error).toBe('Failed to fetch products');
      expect(result.current.loading).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error fetching products:', error);
    });

    it('should handle fetch error with unknown error type', async () => {
      const error = {someProperty: 'someValue'};
      mockedGetProducts.mockRejectedValue(error);

      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      await act(async () => {
        await result.current.fetchProducts();
      });

      expect(result.current.error).toBe('Failed to fetch products');
      expect(result.current.loading).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error fetching products:', error);
    });

    it('should not proceed when session is not ready', async () => {
      mockedIsSessionReady.mockReturnValue(false);

      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      await act(async () => {
        await result.current.fetchProducts();
      });

      expect(mockedGetProducts).not.toHaveBeenCalled();
    });

    it('should set loading states correctly during fetch', async () => {
      let resolvePromise: (value: Array<Product>) => void;
      const promise = new Promise<Array<Product>>((resolve) => {
        resolvePromise = resolve;
      });
      mockedGetProducts.mockReturnValue(promise);

      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      act(() => {
        result.current.fetchProducts();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!(mockProducts);
        await promise;
      });

      expect(result.current.loading).toBe(false);
    });

    it('should clear error state before fetching', async () => {
      // First, cause an error
      mockedGetProducts.mockRejectedValueOnce('First error');

      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      await act(async () => {
        await result.current.fetchProducts();
      });

      expect(result.current.error).toBe('First error');

      // Then, make a successful call
      mockedGetProducts.mockResolvedValueOnce(mockProducts);

      await act(async () => {
        await result.current.fetchProducts();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.products).toEqual(mockProducts);
    });
  });

  describe('getFolderOptions', () => {
    beforeEach(async () => {
      mockedGetProducts.mockResolvedValue(mockProducts);
    });

    it('should return folder options for existing product with folders', async () => {
      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const folderOptions = result.current.getFolderOptions('TEST_PRODUCT');

      const expectedOptions: Array<MultiSelectOption> = [
        {
          id: '__mfe__folder-1',
          name: 'folder-1',
          labelText: 'inbound (/test/path1)'
        },
        {
          id: '__mfe__folder-2',
          name: 'folder-2',
          labelText: 'outbound (/test/path2)'
        }
      ];

      expect(folderOptions).toEqual(expectedOptions);
    });

    it('should return folder options for product with single folder', async () => {
      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const folderOptions = result.current.getFolderOptions('ANOTHER_PRODUCT');

      const expectedOptions: Array<MultiSelectOption> = [
        {
          id: '__mfe__folder-3',
          name: 'folder-3',
          labelText: 'bidirectional (/another/path)'
        }
      ];

      expect(folderOptions).toEqual(expectedOptions);
    });

    it('should return empty array for non-existent product', async () => {
      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const folderOptions = result.current.getFolderOptions('NON_EXISTENT');

      expect(folderOptions).toEqual([]);
    });

    it('should return empty array for product without folders', async () => {
      const productWithoutFolders: Product = {
        id: 'product-no-folders',
        code: 'NO_FOLDERS',
        name: 'Product Without Folders'
      };

      mockedGetProducts.mockResolvedValue([productWithoutFolders]);

      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const folderOptions = result.current.getFolderOptions('NO_FOLDERS');

      expect(folderOptions).toEqual([]);
    });

    it('should return empty array for product with empty folders array', async () => {
      const productWithEmptyFolders: Product = {
        id: 'product-empty-folders',
        code: 'EMPTY_FOLDERS',
        name: 'Product With Empty Folders',
        folders: []
      };

      mockedGetProducts.mockResolvedValue([productWithEmptyFolders]);

      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const folderOptions = result.current.getFolderOptions('EMPTY_FOLDERS');

      expect(folderOptions).toEqual([]);
    });

    it('should work correctly when products list is empty', () => {
      mockedGetProducts.mockResolvedValue([]);

      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      const folderOptions = result.current.getFolderOptions('ANY_PRODUCT');

      expect(folderOptions).toEqual([]);
    });
  });

  describe('effect dependencies', () => {
    it('should refetch products when fetchProducts function changes', async () => {
      mockedGetProducts.mockResolvedValue(mockProducts);

      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // fetchProducts should be called once on mount
      expect(mockedGetProducts).toHaveBeenCalledTimes(1);

      // Manually call fetchProducts again
      await act(async () => {
        await result.current.fetchProducts();
      });

      expect(mockedGetProducts).toHaveBeenCalledTimes(2);
    });

    it('should maintain referential stability of getFolderOptions', async () => {
      mockedGetProducts.mockResolvedValue(mockProducts);

      const {result, rerender} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const firstGetFolderOptions = result.current.getFolderOptions;

      rerender();

      const secondGetFolderOptions = result.current.getFolderOptions;

      expect(firstGetFolderOptions).toBe(secondGetFolderOptions);
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple fetch calls correctly', async () => {
      mockedGetProducts.mockResolvedValue(mockProducts);

      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      // Initial fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.products).toEqual(mockProducts);

      // Second fetch
      const updatedProducts = [...mockProducts, {
        id: 'product-3',
        code: 'NEW_PRODUCT',
        name: 'New Product'
      }];

      mockedGetProducts.mockResolvedValue(updatedProducts);

      await act(async () => {
        await result.current.fetchProducts();
      });

      expect(result.current.products).toEqual(updatedProducts);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle empty response correctly', async () => {
      mockedGetProducts.mockResolvedValue([]);

      const {result} = renderHook(() => {
        return useProducts(mockSessionRef);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.products).toEqual([]);
      expect(result.current.error).toBe(null);
    });
  });
});