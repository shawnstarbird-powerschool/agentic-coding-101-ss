/**
 * Represents a folder in the system
 */
/**
 * Represents a user who has access to a folder
 */
export interface FolderUserElement {
  /**
   * Unique identifier for the user
   */
  id: string;

  /**
   * Username of the user
   */
  username: string;
}

export interface GetFolderResponseElement {
  /**
   * Unique identifier for the folder
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

  /**
   * List of users who have access to this folder
   */
  users?: FolderUserElement[];

  /**
   * Unix timestamp (seconds) when the folder expires. Only present if the folder is temporary and has an expiration.
   */
  expires?: number;
}

export interface GetFoldersResponse {
  /**
   * List of folders in the system
   */
  folders: GetFolderResponseElement[];

  /**
   * Total number of folders in the system
   */
  count: number;
}

export interface GetFolderResponse {
  /**
   * Requested folder details
   */
  folder: GetFolderResponseElement;
}
