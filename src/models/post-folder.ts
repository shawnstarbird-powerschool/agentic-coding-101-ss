/**
 * Request payload for creating a new folder
 */
export interface PostFolderRequestPayload {
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
  accessType: 'inbound' | 'outbound';

  /**
   * Whether the folder is active (defaults to true if not provided)
   */
  active?: boolean;

  /**
   * Optional flag to indicate if the folder is temporary. If true, the folder will expire in 6 hours.
   * If false or not provided, the folder will not expire.
   */
  temporary?: boolean;
}

/**
 * Response for the POST /folders endpoint
 */
export interface PostFolderResponse {
  folder: {
    /**
     * Unique identifier for the created folder
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
  };
}
