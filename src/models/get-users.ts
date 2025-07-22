interface Folder {
  id: string;
  path: string;
  use: string;
  accessType: string;
}

/**
 * Represents a user in the system
 */
export interface GetUserResponseElement {
  /**
   * Unique identifier for the user
   */
  id: string;

  /**
   * Username for authentication
   */
  username: string;

  /**
   * Code representing the product the user has access to
   */
  productCode: string;

  /**
   * Display name of the product
   */
  productName?: string;

  /**
   * Tenant identifier for multi-tenant products
   */
  tenantId: string;

  /**
   * Folders the user has access to
   */
  folders: Folder[];

  /**
   * User's access level. May be one of 'read' | 'readwrite' | 'write'.
   */
  access: string;

  /**
   * Authentication method for this user. May be one of 'Password' | 'SSH key'.
   */
  authenticationType: string;

  /**
   * List of IP addresses/ranges allowed for this user
   */
  ipWhitelist?: string[];

  /**
   * Timestamp of the user's last login (in milliseconds since epoch)
   */
  lastLogin?: number;

  /**
   * Whether the user account is active
   */
  active: boolean;

  /**
   * Full name of the user
   */
  name?: string;

  /**
   * ISO timestamp when the user was created
   */
  created?: string;

  /**
   * ISO timestamp when the user was last updated
   */
  updated?: string;

  /**
   * Unix timestamp (seconds) when the user expires. Only present if the user is temporary and has an expiration.
   */
  expires?: number;
}

export interface GetUsersResponse {
  /**
   * List of users in the system
   */
  users: GetUserResponseElement[];

  /**
   * Total number of users in the system
   */
  count: number;
}

export interface GetUserResponse {
  /**
   * Requested user details
   */
  user: GetUserResponseElement;
}
