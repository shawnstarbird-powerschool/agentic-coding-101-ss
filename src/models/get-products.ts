/**
 * Represents a folder within a product
 */
export interface Use {
  /**
   * Display name of the use
   */
  name: string;
}

/**
 * Represents a folder configuration for a product
 */
export interface FolderResponse {
  /**
   * Unique identifier for the folder
   */
  id: string;
  /**
   * Path of the folder
   */
  path: string;
  /**
   * Use/purpose of the folder
   */
  use: string;
}

export interface ProductResponse {
  /**
   * Unique identifier for the product
   */
  id: string;
  /**
   * Code representing the product type (e.g., 'PM', 'QA')
   */
  productCode: string;
  /**
   * Display name for the product (e.g., 'Performance Matters')
   */
  name: string;
  /**
   * List of folders associated with this product
   */
  uses: Use[];
  /**
   * List of configured folders for this product in the current district
   */
  folders: FolderResponse[];
  /**
   * Indicates if the product supports multiple tenants
   */
  multiTenant: boolean;
  /**
   * ISO timestamp when the product was created
   */
  created: string;
  /**
   * ISO timestamp when the product was last updated
   */
  updated: string;
}

/**
 * Represents a product in the system
 */
export interface GetProductResponse {
  product: ProductResponse;
}

/**
 * Response structure for the get-products API endpoint
 */
export interface GetProductsResponse {
  /**
   * Array of products returned by the API
   */
  products: ProductResponse[];
  /**
   * Total number of products in the response
   */
  count: number;
}
