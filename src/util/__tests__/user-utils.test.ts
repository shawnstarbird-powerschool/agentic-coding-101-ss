import * as bcrypt from 'bcryptjs';
import { hashPassword, verifyPassword } from '../user-utils';

// Mock bcryptjs module
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

describe('User Utils - Password Hashing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    test('should call bcrypt.hash with correct parameters', async () => {
      // Mock implementation
      const mockHash = 'hashed_password_123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHash);

      // Call the function
      const password = 'test_password';
      const result = await hashPassword(password);

      // Assertions
      expect(result).toBe(mockHash);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    test('should throw an error if bcrypt.hash fails', async () => {
      // Mock implementation to throw an error
      const mockError = new Error('Hashing failed');
      (bcrypt.hash as jest.Mock).mockRejectedValue(mockError);

      // Call the function and expect it to throw
      const password = 'test_password';
      await expect(hashPassword(password)).rejects.toThrow('Hashing failed');
    });
  });

  describe('verifyPassword', () => {
    test('should call bcrypt.compare with correct parameters', async () => {
      // Mock implementation
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Call the function
      const password = 'test_password';
      const hashedPassword = 'hashed_password_123';
      const result = await verifyPassword(password, hashedPassword);

      // Assertions
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    test('should return false if password verification fails', async () => {
      // Mock implementation
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Call the function
      const password = 'wrong_password';
      const hashedPassword = 'hashed_password_123';
      const result = await verifyPassword(password, hashedPassword);

      // Assertions
      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    test('should throw an error if bcrypt.compare fails', async () => {
      // Mock implementation to throw an error
      const mockError = new Error('Verification failed');
      (bcrypt.compare as jest.Mock).mockRejectedValue(mockError);

      // Call the function and expect it to throw
      const password = 'test_password';
      const hashedPassword = 'hashed_password_123';
      await expect(verifyPassword(password, hashedPassword)).rejects.toThrow(
        'Verification failed'
      );
    });
  });

  describe('Integration between hashPassword and verifyPassword', () => {
    test('should verify a password that was hashed with hashPassword', async () => {
      // Setup mock for hash function
      const mockHash =
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHash);

      // Setup mock for compare function
      (bcrypt.compare as jest.Mock).mockImplementation((pwd, hash) => {
        return Promise.resolve(hash === mockHash && pwd === 'correct_password');
      });

      // Hash a password
      const password = 'correct_password';
      const hashedPassword = await hashPassword(password);

      // Verify the correct password
      const isValidCorrect = await verifyPassword(password, hashedPassword);
      expect(isValidCorrect).toBe(true);

      // Verify an incorrect password
      const isValidWrong = await verifyPassword(
        'wrong_password',
        hashedPassword
      );
      expect(isValidWrong).toBe(false);
    });
  });
});
