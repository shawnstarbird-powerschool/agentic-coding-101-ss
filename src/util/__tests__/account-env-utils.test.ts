import { getNamespace } from '@ps-refarch/cdk-utils';
import { MainAccountEnvProps } from '../../cdk/lib/main-stack-props';
import {
  getAccountEnvPropsByDeployment,
  getAccountEnvPropsForName,
  getAllAccountEnvProps,
  getAllProductConfigs,
  getProductConfig,
  testOnlyResetAccountEnv,
  testOnlySetAccountEnv
} from '../account-env-utils';

// Mock the getNamespace function from @ps-refarch/cdk-utils
jest.mock('@ps-refarch/cdk-utils', () => ({
  getNamespace: jest.fn((envName: string) => {
    // Simple implementation for testing: return part before first '/' or the whole string
    const slashIndex = envName.indexOf('/');
    return slashIndex >= 0 ? envName.substring(0, slashIndex) : envName;
  })
}));

describe('account-env-utils', () => {
  // Test data
  const TEST_ENV_NAME = 'test-env';
  const TEST_ACCOUNT_ENV_PROPS: Record<string, MainAccountEnvProps> = {
    test: {
      names: [TEST_ENV_NAME],
      env: {
        account: '123456789',
        region: 'us-east-1'
      },
      hostedZoneName: 'test.example.com',
      hostedZoneId: 'TEST123',
      sharedServiceEnv: 'test',
      isProduction: false,
      caching: false,
      sessionTable: {
        account: '123456789',
        envName: 'test',
        appCookieMappings: {
          'test.example.com': 'testsessiontoken'
        }
      }
    },
    prod: {
      names: ['prod'],
      env: {
        account: '987654321',
        region: 'us-east-1'
      },
      hostedZoneName: 'example.com',
      hostedZoneId: 'PROD456',
      sharedServiceEnv: 'prod',
      isProduction: true,
      caching: true,
      sessionTable: {
        account: '123456789',
        envName: 'test',
        appCookieMappings: {
          'test.example.com': 'testsessiontoken'
        }
      },
      products: {
        TEST_PRODUCT: {
          productCode: 'TEST_PRODUCT',
          name: 'Test Product',
          uses: [
            {
              name: 'TestUse1'
            },
            {
              name: 'TestUse2'
            }
          ],
          productPublicKey: 'test-key',
          multiTenant: true,
          accessAccounts: ['123456789012'],
          permissions: ['s3:GetObject', 's3:PutObject']
        },
        ANOTHER_PRODUCT: {
          productCode: 'ANOTHER_PRODUCT',
          name: 'Another Product',
          uses: [
            {
              name: 'AnotherUse'
            }
          ],
          multiTenant: true,
          accessAccounts: ['210987654321']
        }
      }
    }
  };

  // Reset the account env props after each test
  afterEach(() => {
    testOnlyResetAccountEnv();
  });

  describe('getAllAccountEnvProps', () => {
    test('should return the default account env props', async () => {
      const result = await getAllAccountEnvProps();
      expect(result).toBeDefined();
      // The default props come from src/account-env.ts
      expect(result.dev).toBeDefined();
      expect(result.produs).toBeDefined();
    });

    test('should return test account env props when set', async () => {
      testOnlySetAccountEnv(TEST_ACCOUNT_ENV_PROPS);
      const result = await getAllAccountEnvProps();
      expect(result).toEqual(TEST_ACCOUNT_ENV_PROPS);
    });
  });

  describe('getAccountEnvPropsForName', () => {
    test('should find environment by name', async () => {
      testOnlySetAccountEnv(TEST_ACCOUNT_ENV_PROPS);
      const allProps = await getAllAccountEnvProps();
      const result = getAccountEnvPropsForName(allProps, TEST_ENV_NAME);
      expect(result).toEqual(TEST_ACCOUNT_ENV_PROPS.test);
    });

    test('should find environment by feature branch name using namespace', async () => {
      testOnlySetAccountEnv(TEST_ACCOUNT_ENV_PROPS);
      const allProps = await getAllAccountEnvProps();
      // Feature branch name like "test-env/ABC-123" should map to namespace "test-env"
      const result = getAccountEnvPropsForName(
        allProps,
        `${TEST_ENV_NAME}/ABC-123`
      );
      expect(result).toEqual(TEST_ACCOUNT_ENV_PROPS.test);
      // Verify getNamespace was called with the feature branch name
      expect(getNamespace).toHaveBeenCalledWith(`${TEST_ENV_NAME}/ABC-123`);
    });

    test('should throw error for unknown environment name', async () => {
      testOnlySetAccountEnv(TEST_ACCOUNT_ENV_PROPS);
      const allProps = await getAllAccountEnvProps();
      expect(() => {
        getAccountEnvPropsForName(allProps, 'unknown');
      }).toThrow('Cannot find environment unknown in account-env.ts');
    });
  });

  describe('getAccountEnvPropsByDeployment', () => {
    test('should return environments that match the name', async () => {
      testOnlySetAccountEnv(TEST_ACCOUNT_ENV_PROPS);
      const result = await getAccountEnvPropsByDeployment(TEST_ENV_NAME);
      expect(result).toEqual({ test: TEST_ACCOUNT_ENV_PROPS.test });
    });

    test('should return environments that match the namespace for feature branch names', async () => {
      testOnlySetAccountEnv(TEST_ACCOUNT_ENV_PROPS);
      // Feature branch name like "test-env/ABC-123" should map to namespace "test-env"
      const result = await getAccountEnvPropsByDeployment(
        `${TEST_ENV_NAME}/ABC-123`
      );
      expect(result).toEqual({ test: TEST_ACCOUNT_ENV_PROPS.test });
      // Verify getNamespace was called with the feature branch name
      expect(getNamespace).toHaveBeenCalledWith(`${TEST_ENV_NAME}/ABC-123`);
    });

    test('should return empty object for unknown environment name', async () => {
      testOnlySetAccountEnv(TEST_ACCOUNT_ENV_PROPS);
      const result = await getAccountEnvPropsByDeployment('unknown');
      expect(result).toEqual({});
    });
  });

  describe('getProductConfig', () => {
    test('should return product configuration for existing product', async () => {
      testOnlySetAccountEnv(TEST_ACCOUNT_ENV_PROPS);
      const result = await getProductConfig('prod', 'TEST_PRODUCT');
      expect(result).toEqual(
        TEST_ACCOUNT_ENV_PROPS.prod.products?.TEST_PRODUCT
      );
    });

    test('should return undefined for non-existing product', async () => {
      testOnlySetAccountEnv(TEST_ACCOUNT_ENV_PROPS);
      const result = await getProductConfig(TEST_ENV_NAME, 'NON_EXISTING');
      expect(result).toBeUndefined();
    });

    test('should return undefined for non-existing environment', async () => {
      testOnlySetAccountEnv(TEST_ACCOUNT_ENV_PROPS);
      const result = await getProductConfig('unknown', 'TEST_PRODUCT');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllProductConfigs', () => {
    test('should return all product configurations for existing environment', async () => {
      testOnlySetAccountEnv(TEST_ACCOUNT_ENV_PROPS);
      const result = await getAllProductConfigs('prod');
      expect(result).toEqual(TEST_ACCOUNT_ENV_PROPS.prod.products);
    });

    test('should return empty object for non-existing environment', async () => {
      testOnlySetAccountEnv(TEST_ACCOUNT_ENV_PROPS);
      const result = await getAllProductConfigs('unknown');
      expect(result).toEqual({});
    });
  });
});
