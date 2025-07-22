// Invalidate CloudFront distribution files for the UI
import {
  cleanName,
  DEFAULT_DEPLOYMENT,
  getBranch
} from '@ps-refarch/cdk-utils';
import { getAccountEnvPropsByDeployment } from '../src/util/account-env-utils';
import { cwd } from 'process';
import * as util from 'util';
import { MainAccountEnvProps } from '../src/cdk/lib/main-stack-props';

const exec = util.promisify(require('child_process').exec);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { argv } = require('yargs/yargs')(process.argv.slice(2));
const accountEnv = argv['account-env'] === 'true';
const dnsPattern: string | undefined = argv.dns;
const rootDir = cwd();
const deploymentName = argv.deployment || DEFAULT_DEPLOYMENT;

// use --force true to override normal behavior (pre-prod = no) and always invalidate
const force = argv.force === 'true';

if ((accountEnv ? 1 : 0) + (dnsPattern ? 1 : 0) !== 1) {
  console.error(`must pass "--dns MATCHREGEX" OR "--account-env true"`);
  process.exit(1);
}

async function doit(cmd: string): Promise<any> {
  const res = await exec(cmd);
  return JSON.parse(res.stdout);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getFrontEndDomainName(
  envName: string,
  props: {
    isProduction: boolean;
    hostedZoneName: string;
  }
): string {
  // We will not be using wildcard(*) in MFEs and backend services. DNS name
  // based strictly on the environment name.
  const cleanEnvName = cleanName(envName, true);

  // The domain name to be used by the front end will be the environment name prepended to the
  // hosted zone name, except for "prod" because "prod.prod.pscc.powerschoolcorp.com" seems a bit
  // redundant.
  // Note: replace any forward slashes ("/") since they will occur in feature branch names
  //       (e.g., "dev/PSSR-1234")
  return props.isProduction
    ? props.hostedZoneName
    : `${cleanEnvName}.${props.hostedZoneName}`;
}

interface CFDistribution {
  Id: string;
  Aliases: {
    Items: string[];
  };
  Origins: {
    Items: {
      DomainName: string;
      S3OriginConfig?: {
        OriginAccessIdentity: string;
      };
    }[];
  };
}

interface ListDistributionsResult {
  DistributionList: {
    Items: CFDistribution[];
  };
}

export async function itemMatches(
  item: CFDistribution,
  dnsNameOrPattern: string[] | RegExp
): Promise<boolean> {
  if (item.Aliases == null || item.Aliases.Items == null) return false;

  if (dnsNameOrPattern instanceof RegExp) {
    // Direct DNS method, but it's a regex
    return item.Aliases.Items.some((alias) => dnsNameOrPattern.test(alias));
  } else {
    // Account env or other exact DNS name
    return item.Aliases.Items.some((alias) => dnsNameOrPattern.includes(alias));
  }
}

(async (): Promise<void> => {
  // Figure out DNS name or pattern
  let dnsNameOrPattern: string[] | RegExp;
  if (dnsPattern) {
    dnsNameOrPattern = new RegExp(dnsPattern);
  } else {
    const envName = process.env.PS_ENVIRONMENT || cleanName(await getBranch());
    const deployments = (await getAccountEnvPropsByDeployment(envName)) as Record<string, MainAccountEnvProps>;
    console.log({ message: 'deployments', deployments });
    dnsNameOrPattern = [];
    let isProduction = false;
    let isCaching: boolean | undefined = undefined;
    for (const [key, acctEnvProps] of Object.entries(deployments)) {
      if (deploymentName === 'ALL' || key === deploymentName) {
        dnsNameOrPattern.push(getFrontEndDomainName(envName, acctEnvProps));
        isProduction ||= acctEnvProps.isProduction;
        if (acctEnvProps.caching != null) {
          isCaching ||= acctEnvProps.caching;
        }
      }
    }

    // Enable in prod OR if the no caching flag is set
    const cache = isCaching != null ? isCaching : isProduction;
    if (!(force || cache)) {
      console.log(`Not caching in ${envName} and not --force true, exiting.`);
      process.exit(0);
    }

    if (dnsNameOrPattern.length === 0) {
      throw new Error(
        `cannot find deployment "${deploymentName}", maybe use the "--deployment" parameter; choose from [${Object.keys(
          deployments
        )}]`
      );
    }

    console.log({ message: 'dnsNameOrPattern', dnsNameOrPattern });
  }

  const allDists: ListDistributionsResult = await doit(
    'aws cloudfront list-distributions'
  );
  if (
    allDists &&
    allDists.DistributionList &&
    allDists.DistributionList.Items
  ) {
    // const foo: string[] = [];
    // const bar = foo.find(el => true)
    const dists: CFDistribution[] = [];
    for (const item of allDists.DistributionList.Items) {
      // See which way to search
      if (await itemMatches(item, dnsNameOrPattern)) {
        dists.push(item);
      }
    }

    if (dists.length === 0) {
      // Note that this is not really an error
      console.error(`no distributions found`);
    } else {
      const statuses: number[] = [];
      for (const dist of dists) {
        console.log(`found distribution => ${dist.Id}`);
        const cmd = `aws cloudfront create-invalidation --distribution-id ${dist.Id} --paths '/*'`;

        console.log(`cmd => ${cmd}`);
        const invalidation = await doit(cmd);

        const invalidationId = invalidation.Invalidation.Id;
        console.log(
          `invalidation ${invalidationId}: ${invalidation.Invalidation.Status}`
        );

        // Monitor status of invalidation
        for (;;) {
          const invalidation = await doit(
            `aws cloudfront get-invalidation --distribution-id ${dist.Id} --id ${invalidationId}`
          );
          console.log(`... ${invalidation.Invalidation.Status}`);
          if (invalidation.Invalidation.Status !== 'InProgress') {
            statuses.push(
              invalidation.Invalidation.Status === 'Completed' ? 0 : 1
            );
            break;
          }

          await sleep(2000);
        }
      }

      process.exit(statuses.filter((status) => status !== 0).length);
    }
  } else {
    // Note that this is not really an error
    console.error(`no distributions found`);
  }
})();
