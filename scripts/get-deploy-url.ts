// Get deployed URL for the current environment. Uses normal project GitOps rules (i.e. PS_ENVIRONMENT or
// branch name for feature branches).
// Options:
//   --harness true: returns test harness URL if available
//   --deployment <name>: name of deployment; optional if only one defined
//
import {
  AccountEnvProps,
  cleanName,
  DEFAULT_DEPLOYMENT,
  getBranch
} from '@ps-refarch/cdk-utils';
import { getAccountEnvPropsByDeployment } from '../src/util/account-env-utils';
import { MainAccountEnvProps } from '../src/cdk/lib/main-stack-props';
import { cwd } from 'process';
import * as util from 'util';
const exec = util.promisify(require('child_process').exec);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { argv } = require('yargs/yargs')(process.argv.slice(2));
const rootDir = cwd();
const deploymentName = argv.deployment || DEFAULT_DEPLOYMENT;
const getHarnessIfAvailable = argv.harness === 'true';

// async function doit(cmd: string): Promise<any> {
//   const res = await exec(cmd);
//   return JSON.parse(res.stdout);
// }

// async function sleep(ms: number): Promise<void> {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

export function getFrontEndDomainName(
  envName: string,
  props: {
    isProduction: boolean;
    hostedZoneName: string;
    testHarness?: string;
  },
  getHarnessIfAvailable: boolean
): string {
  // We will not be using wildcard(*) in MFEs and backend services. DNS name
  // based strictly on the environment name.
  const cleanEnvName = cleanName(envName, true);

  // If there is a test harness specified, use that.
  if (getHarnessIfAvailable && props.testHarness) {
    return props.isProduction
      ? props.testHarness
      : `${cleanEnvName}.${props.testHarness}`;
  }

  // The domain name to be used by the front end will be the environment name prepended to the
  // hosted zone name, except for "prod" because "prod.prod.pscc.powerschoolcorp.com" seems a bit
  // redundant.
  // Note: replace any forward slashes ("/") since they will occur in feature branch names
  //       (e.g., "dev/PSSR-1234")
  return props.isProduction
    ? props.hostedZoneName
    : `${cleanEnvName}.${props.hostedZoneName}`;
}

(async (): Promise<void> => {
  const envName = process.env.PS_ENVIRONMENT || cleanName(await getBranch());
  const deployments = await getAccountEnvPropsByDeployment(envName);
  // console.log({ message: 'deployments', deployments });
  let acctEnvProps: MainAccountEnvProps | undefined = undefined;
  for (const [key, t_acctEnvProps] of Object.entries(deployments)) {
    if (deploymentName || key === deploymentName) {
      acctEnvProps = t_acctEnvProps;
    }
  }

  if (acctEnvProps == null) {
    throw new Error(
      `cannot find deployment "${deploymentName}", maybe use the "--deployment" parameter; choose from [${Object.keys(
        deployments
      )}]`
    );
  }

  const domainName = getFrontEndDomainName(
    envName,
    acctEnvProps,
    getHarnessIfAvailable
  );
  // console.log({ message: 'acctEnvProps', domainName, acctEnvProps });
  console.log(domainName);
})();
