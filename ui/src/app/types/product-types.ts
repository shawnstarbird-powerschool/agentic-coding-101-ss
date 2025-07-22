// Product-related type definitions

// Define the Product interface
export interface Product {
  id?: string;
  code: string;
  name: string;
  folders?: Array<Folder>;
  uses?: Array<{name: string}>;
  multiTenant?: boolean;
  created?: string;
  updated?: string;
}

// Define the Folder interface for products
export interface Folder {
  id: string;
  path: string;
  use: string;
}

// Define the API response interface for products
export interface GetProductsResponse {
  products: Array<{
    id: string;
    productCode: string;
    name: string;
    uses: Array<{name: string}>;
    folders?: Array<{id: string; path: string; use: string}>;
    multiTenant: boolean;
    created: string;
    updated: string;
  }>;
  count: number;
}

// Define the MultiSelectOption interface for folder selection
export interface MultiSelectOption {
  id: string;
  name: string;
  labelText: string;
}
