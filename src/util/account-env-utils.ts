import { getNamespace } from '@ps-refarch/cdk-utils';
import defaultAccountEnvProps from '../account-env';
import {
  MainAccountEnvProps,
  ProductConfig
} from '../cdk/lib/main-stack-props';

/**
 * In-memory storage for account environment properties.
 * This allows tests to override the default values.
 */
let accountEnvProps = defaultAccountEnvProps;

/**
 * Get all account environment properties.
 * This is a wrapper around the imported account-env.ts data.
 *
 * @returns Record of environment name to environment properties
 */
export async function getAllAccountEnvProps(): Promise<
  Record<string, MainAccountEnvProps>
> {
  return accountEnvProps;
}

/**
 * Get account environment properties for a specific environment name.
 *
 * @param allAccountEnvProps - All account environment properties
 * @param envName - Environment name to look up
 * @returns Environment properties for the specified environment
 * @throws Error if environment name is not found
 */
export function getAccountEnvPropsForName(
  allAccountEnvProps: Record<string, MainAccountEnvProps>,
  envName: string
): MainAccountEnvProps {
  // Get the namespace (part before any "/" character)
  const namespace = getNamespace(envName);
  // Look through all environments to find one that has the given name in its names array
  const foundEnv = Object.values(allAccountEnvProps).find(
    (props) => props.names && props.names.includes(namespace)
  );

  if (foundEnv) {
    return foundEnv;
  }

  throw new Error(`Cannot find environment ${namespace} in account-env.ts`);
}

/**
 * Get account environment properties by deployment.
 *
 * @param envName - Environment name to look up
 * @returns Record of deployment name to environment properties
 */
export async function getAccountEnvPropsByDeployment(
  envName: string
): Promise<Record<string, MainAccountEnvProps>> {
  const allProps = await getAllAccountEnvProps();
  // Get the namespace (part before any "/" character)
  const namespace = getNamespace(envName);
  return Object.entries(allProps).reduce((result, [key, props]) => {
    if (props.names && props.names.includes(namespace)) {
      return { ...result, [key]: props };
    }
    return result;
  }, {} as Record<string, MainAccountEnvProps>);
}

/**
 * Set account environment properties for testing purposes only.
 * This function should only be used in tests.
 *
 * @param testAccountEnvProps - Test account environment properties
 */
export function testOnlySetAccountEnv(
  testAccountEnvProps: Record<string, MainAccountEnvProps>
): void {
  accountEnvProps = testAccountEnvProps;
}

/**
 * Reset account environment properties to default values.
 * This function should only be used in tests.
 */
export function testOnlyResetAccountEnv(): void {
  accountEnvProps = defaultAccountEnvProps;
}

/**
 * Helper function to get account environment properties for a specific environment name asynchronously.
 * This is a wrapper around getAccountEnvPropsForName that handles the async getAllAccountEnvProps call.
 *
 * @param envName - Environment name to look up
 * @returns Environment properties for the specified environment
 * @throws Error if environment name is not found
 */
async function getAccountEnvPropsForNameAsync(
  envName: string
): Promise<MainAccountEnvProps> {
  const allProps = await getAllAccountEnvProps();
  return getAccountEnvPropsForName(allProps, envName);
}

/**
 * Get the product configuration for a specific product in a specific environment.
 *
 * @param envName - Environment name to look up
 * @param productCode - Product code to look up
 * @returns Product configuration for the specified product in the specified environment, or undefined if not found
 */
export async function getProductConfig(
  envName: string,
  productCode: string
): Promise<ProductConfig | undefined> {
  try {
    const envProps = await getAccountEnvPropsForNameAsync(envName);
    return envProps.products?.[productCode];
  } catch (error) {
    return undefined;
  }
}

/**
 * Get all product configurations for a specific environment.
 *
 * @param envName - Environment name to look up
 * @returns Record of product code to product configuration for the specified environment, or empty object if not found
 */
export async function getAllProductConfigs(
  envName: string
): Promise<Record<string, ProductConfig>> {
  try {
    const envProps = await getAccountEnvPropsForNameAsync(envName);
    return envProps.products || {};
  } catch (error) {
    return {};
  }
}
