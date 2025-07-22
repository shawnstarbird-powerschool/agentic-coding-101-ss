/**
 * Request payload for updating an existing folder
 */
export interface UpdateFolderRequestPayload {
  /**
   * The use case for this folder
   */
  use?: string;

  /**
   * Path to the folder
   */
  path?: string;

  /**
   * Access type for the folder ('inbound' or 'outbound')
   */
  accessType?: 'inbound' | 'outbound';

  /**
   * Whether the folder is active
   */
  active?: boolean;

  /**
   * Optional flag to indicate if the folder is temporary. If true, the folder will expire in 6 hours.
   * If false, the folder will not expire (expires will be set to 0).
   * If not provided, the temporary status of the folder will not change.
   */
  temporary?: boolean;
}

/**
 * Response for the PUT /folders/:id endpoint
 */
export interface UpdateFolderResponse {
  /**
   * Unique identifier for the updated folder
   */
  id: string;

  /**
   * Tenant identifier for multi-tenant products
   */
  tenantId: string;

  /**
   * Product identifier this folder belongs to
   */
  productId: string;

  /**
   * Product code this folder belongs to
   */
  productCode: string;

  /**
   * The use case for this folder
   */
  use: string;

  /**
   * Path to the folder
   */
  path: string;

  /**
   * Access type for the folder ('inbound' or 'outbound')
   */
  accessType: string;

  /**
   * Whether the folder is active
   */
  active: boolean;

  /**
   * ISO timestamp when the folder was created
   */
  created?: string;

  /**
   * ISO timestamp when the folder was last updated
   */
  updated?: string;
}
