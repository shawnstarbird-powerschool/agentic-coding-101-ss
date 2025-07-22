import {useState, useEffect, useCallback} from 'react';
import {Product, MultiSelectOption} from '../types/product-types';
import {SessionRef} from '../types/session-types';
import {getProducts} from '../services/product-service';
import {isSessionReady} from '../utils/session-utils';

/**
 * Custom hook for managing product data
 * @param sessionRef Session reference for API calls
 * @returns Object with product data and operations
 */
export const useProducts = (sessionRef: SessionRef): {
  products: Array<Product>;
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  getFolderOptions: (productCode: string) => Array<MultiSelectOption>;
} => {
  const [products, setProducts] = useState<Array<Product>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch products
  const fetchProducts = useCallback(async (): Promise<void> => {
    if (!isSessionReady(sessionRef)) {
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const fetchedProducts = await getProducts(sessionRef);
      setProducts(fetchedProducts);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(typeof err === 'string' ? err : 'Failed to fetch products');
      setLoading(false);
    }
  }, [sessionRef]);

  // Get folder options for a specific product
  const getFolderOptions = useCallback((productCode: string): Array<MultiSelectOption> => {
    const selectedProduct = products.find((product) => {
      return product.code === productCode;
    });

    if (selectedProduct && selectedProduct.folders) {
      return selectedProduct.folders.map((folder) => {
        return {
          id: `__mfe__${folder.id}`,
          name: folder.id,
          labelText: `${folder.use} (${folder.path})`
        };
      });
    }

    return [];
  }, [products]);

  // Load products on component mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    fetchProducts,
    getFolderOptions
  };
};

export default useProducts;
