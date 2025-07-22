import { cleanName, getBranch, getNamespace } from '@ps-refarch/cdk-utils';
import * as cdk from 'aws-cdk-lib';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  getAccountEnvPropsForName,
  getAllAccountEnvProps
} from '../../util/account-env-utils';
import { MainStack } from '../lib/main-stack';
import { MainAccountEnvProps } from '../lib/main-stack-props';
import { PermanentResourcesStack } from '../lib/permanent-resources-stack';

const PS_ROOT_DIR = join(__dirname, '../../..');

/* eslint-disable no-new */

(async () => {
  // Create CDK app
  const app = new cdk.App();

  // We're using the GitOps model and determining our envName from the (slightly cleaned-up)
  // branch name, unless it's overridden by PS_ENVIRONMENT.
  const envName = process.env.PS_ENVIRONMENT || cleanName(await getBranch());
  const namespace = getNamespace(envName);
  const isFeatureBranch = envName !== namespace;
  const acctEnvProps = getAccountEnvPropsForName(
    await getAllAccountEnvProps(),
    envName
  ) as MainAccountEnvProps;

  // Find out the package name. This allows separate applications in the
  // same account.
  const packageName = cleanName(
    JSON.parse(readFileSync(`${PS_ROOT_DIR}/package.json`).toString()).name
  );

  console.log(`Environment: ${envName}`);
  console.log(`Namespace: ${namespace}`);
  console.log(`Is Feature Branch: ${isFeatureBranch}`);
  console.log(`Package Name: ${packageName}`);

  // Now we deploy the permanent resources stack both in FB and main branch.
  console.log('Building permanent resources stack');

  // Create the permanent resources stack (buckets, DynamoDB tables).
  // Note that the FB stacks are different from the main branch stacks,
  // for example both create the DynamoDB tables, but only the main branch
  // will create the S3 buckets.
  new PermanentResourcesStack(
    app,
    `${packageName}-${envName.toLowerCase()}-permanent-resources`,
    {
      env: acctEnvProps.env,
      packageName,
      acctEnvProps,
      envName,
      namespace,
      tags: {
        environment: namespace,
        mfe_id: packageName,
        resource_type: 'permanent'
      }
    }
  );

  // Create the main stack (API Gateway, Lambda functions, etc.)
  console.log('Building main stack');
  new MainStack(app, `${packageName}-${envName.toLowerCase()}-stack`, {
    env: acctEnvProps.env,
    packageName,
    acctEnvProps,
    envName,
    tags: {
      environment: envName,
      mfe_id: packageName
    }
  });
})().catch(async (e) => {
  console.error(e); // eslint-disable-line no-console
  process.exit(1);
});
