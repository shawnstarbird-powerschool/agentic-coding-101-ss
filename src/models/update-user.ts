import { UserAccess } from '../util/db-schema';

/**
 * Type definition for the Update User request payload. Basically the same as the create
 * user request payload but with all fields optional. This is used for the PUT /users/{id} endpoint.
 */
export type UpdateUserRequestPayload = {
  /**
   * The username of the user. This is a required field.
   */
  username?: string;

  /**
   * The product code associated with the user. This is a required field and needs to
   * be a valid product code. Example "PM"
   */
  productCode?: string;

  /**
   * List of folder ids that the user has access to. This is a required field and needs to
   * map to the folder ids for the user's product.
   */
  folders?: string[];

  /**
   * The authentication type for the user. This is a required field and can be either
   * "password" or "publicKey". Example "password"
   */
  authenticationType?: 'password' | 'SSH key';

  /**
   * Type of access for the user. This is a required field and can be one of the following:
   * - "read"
   * - "write"
   * - "readwrite"
   */
  access?: UserAccess;

  /**
   * The user's password, if using password authentication. This is an optional field but either it or
   * publicKey must be provided based on the authentication type. NOTE: Password authentication is not
   * really recommended, people should use public keys instead. Example "correct-horse-battery-staple"
   */
  password?: string;

  /**
   * The user's public key, if using SSH key authentication. This is an optional field but either it or
   * password must be provided based on the authentication type. Example "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
   */
  publicKey?: string;

  /**
   * An optional IP whitelist for the user. This is an array of IP addresses or CIDR blocks that
   * are allowed to access the user's account. This is useful for restricting access to specific
   * IP addresses or ranges. Example ["1.2.3.4", "1.2.3.0/24"]
   */
  ipWhitelist?: string[];

  /**
   * Optional name of the user. This can be used for display purposes or omitted if not needed.
   */
  name?: string;

  /**
   * Optional flag to activate or deactivate the user. When set to false, the user will be deactivated
   * and unable to access the system. This replaces the functionality of the delete user endpoint.
   */
  active?: boolean;

  /**
   * Optional flag to indicate if the user is temporary. If true, the user will expire in 6 hours.
   * If false, the user will not expire (expires will be set to 0).
   * If not provided, the temporary status of the user will not change.
   */
  temporary?: boolean;
};
