/**
 * Represents a tenant in the system
 */
export interface TenantResponse {
  /**
   * Unique identifier for the tenant
   */
  id: string;
  /**
   * Display name of the tenant
   */
  name: string;
  /**
   * Domain associated with the tenant (optional)
   */
  domain?: string;
  /**
   * District ID associated with the tenant (optional)
   */
  districtId?: string;
  /**
   * ISO timestamp when the tenant was created
   */
  created: string;
  /**
   * ISO timestamp when the tenant was last updated
   */
  updated: string;
}

/**
 * Response structure for the get-tenant API endpoint
 */
export interface GetTenantResponse {
  /**
   * Tenant information returned by the API
   */
  tenant: TenantResponse;
}

/**
 * Response structure for the get-tenants API endpoint
 */
export interface GetTenantsResponse {
  /**
   * Array of tenants returned by the API
   */
  tenants: TenantResponse[];
  /**
   * Total number of tenants in the response
   */
  count: number;
}
