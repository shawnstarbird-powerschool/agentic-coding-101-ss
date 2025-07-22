import { UserAccess } from '../util/db-schema';

export interface PostUserRequestPayload {
  /**
   * The username of the user. This is a required field.
   */
  username: string;

  /**
   * The product code associated with the user. This is a required field and needs to
   * be a valid product code. Example: "PM"
   */
  productCode: string;

  /**
   * List of folder names that the user has access to. This is a required field and needs to
   * map to the folder names in the product configuration. Example: ["folder1", "folder2"]
   */
  folders: string[];

  /**
   * The authentication type for the user. This is a required field and can be either
   * "password" or "publicKey". Example: "SSH key"
   */
  authenticationType: 'password' | 'SSH key';

  /**
   * Type of access for the user. This is a required field and can be one of the following:
   * - "read"
   * - "write"
   * - "readwrite"
   */
  access: UserAccess;

  /**
   * The user's password, if using password authentication. This is an optional field but either it or
   * publicKey must be provided based on the authentication type. NOTE: Password authentication is not
   * really recommended, people should use public keys instead. Example: "correct-horse-battery-staple"
   */
  password?: string;

  /**
   * The user's public key, if using SSH key authentication. This is an optional field but either it or
   * password must be provided based on the authentication type. Example: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
   */
  publicKey?: string;

  /**
   * An optional IP whitelist for the user. This is an array of IP addresses or CIDR blocks that
   * are allowed to access the user's account. This is useful for restricting access to specific
   * IP addresses or ranges. Example: ["1.2.3.4", "1.2.3.0/24"]
   */
  ipWhitelist?: string[];

  /**
   * Optional name of the user. This can be used for display purposes or omitted if not needed.
   */
  name?: string;

  /**
   * Optional flag to indicate if the user is temporary. If true, the user will expire in 6 hours.
   * If false or not provided, the user will not expire.
   */
  temporary?: boolean;
}
