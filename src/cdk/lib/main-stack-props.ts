import { AccountEnvProps } from '@ps-refarch/cdk-utils';
import { StackProps } from 'aws-cdk-lib';

/**
 * Folder configuration interface for defining folders used in file transfers
 */
export interface UseConfig {
  name: string; // Human-readable name in English
}

/**
 * Product configuration interface based on the pseudo-API from FTP Technical Guidance
 */
export interface ProductConfig {
  /**
   * Product code. Should always be the same as the product code in District Settings.
   */
  productCode: string;

  /**
   * Display name of the product (e.g., 'Performance Matters' for code 'PM')
   */
  name: string;

  /**
   * Set of folder uses for this product. This is really just a value that can be associated
   * with folders and doesn't mean much of anything.
   */
  uses: UseConfig[]; // Uses for file transfers, mapped to folders somewhere

  /**
   * For multitenant products, this is the public key used for the product user.
   * For single-tenant products, this should be left undefined since the public key
   * is sent in the single-tenant onboarding API call.
   */
  productPublicKey?: string;

  /**
   * Flag indicating if this product is multi-tenant
   * Multi-tenant products can access data for all tenants
   * Single-tenant products are restricted to specific tenant data
   */
  multiTenant: boolean;

  /**
   * List of AWS account numbers that are allowed to access this product
   * These accounts will have access to the product's internal S3 buckets
   * and will be included in the accessAccounts property of the BFFApi construct
   */
  accessAccounts: string[];

  /**
   * Optional list of S3 permission names
   * If not provided, default permissions will be used:
   * ['s3:GetObject', 's3:PutObject', 's3:ListBucket']
   */
  permissions?: string[];

  /**
   * If passed, we will forward EventBridge events for this product.
   * * True = send to the set of access accounts
   * * False or omitted = do not send events
   * * Array of account numbers = send events to the specified accounts
   */
  forwardEvents?: boolean | string[];
}

export interface ProductConfigMap {
  [productCode: string]: ProductConfig;
}

export interface MainAccountEnvProps extends AccountEnvProps {
  // Made vpcId optional since we can import it from CloudFormation exports
  vpcId?: string;
  sharedServiceEnv: string;
  caching?: boolean;
  testHarness?: string;
  sessionTable: {
    account: string;
    envName: string;
    appCookieMappings: { [subdomain: string]: string };
  };
  /**
   * Product configurations for this environment
   * The key is the product code
   */
  products?: ProductConfigMap;
}

export interface MainStackProps extends StackProps {
  /**
   * The environment name. This is either something like `dev`, `qa`, `prod`, etc. for
   * fixed deployed environments, or `dev/your-feature-branch-name` for feature branch
   * deployments.
   */
  envName: string;

  /**
   * The package name, according to package.json. This is normally the MFE id.
   */
  packageName: string;

  /**
   * The basic account environment. Taken from account-env.ts.
   */
  acctEnvProps: MainAccountEnvProps;

  /**
   * Set of environment variables to be passed to all lambdas. Optional.
   */
  lambdaVars?: {
    [key: string]: string;
  };
}
