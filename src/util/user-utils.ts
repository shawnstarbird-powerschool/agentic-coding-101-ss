import * as bcrypt from 'bcryptjs';

/**
 * Hashes a password using bcryptjs with secure parameters
 *
 * The returned hash string includes:
 * - The algorithm identifier ($2a$)
 * - The cost factor (10)
 * - A cryptographically secure random salt
 * - The actual hash
 *
 * Example: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
 *
 * @param password The plain text password to hash
 * @returns A promise that resolves to the hashed password (includes salt)
 */
export async function hashPassword(password: string): Promise<string> {
  // Use a cost factor of 10, which is a good balance between security and performance
  // Higher values are more secure but slower
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verifies a password against a hashed password
 * @param password The plain text password to verify
 * @param hashedPassword The hashed password to compare against
 * @returns A promise that resolves to true if the password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
