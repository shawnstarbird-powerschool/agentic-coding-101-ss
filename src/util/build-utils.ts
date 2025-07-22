import { getNamespace } from '@ps-refarch/cdk-utils';

/**
 * Get the Transfer Family server configuration based on the environment name and whether it's a feature branch.
 * This function determines whether to create a Transfer Family server and which protocols to use for feature branches.
 * We'll check the suffix of the environment name to determine configuration. This allows developers to control Transfer
 * Family deployment costs in feature branches:
 * * envName ending with "-s": SFTP protocol only
 * * envName ending with "-sf": SFTP and FTPS protocols
 * * envName ending with "-f": FTPS protocol only
 * * No special suffix or not one of the above: No Transfer Family server (most cost-effective)
 * Fixed environment names (e.g., dev, test, prod) will always create a Transfer Family server with both protocols.
 *
 * @param props - The properties for the Transfer Family server configuration.
 * @returns An object containing the server creation flag and the protocols to use.
 */
export function getTransferServerConfig(props: { envName: string }): {
  createTransferServer: boolean;
  protocols: string[];
} {
  const { envName } = props;
  const isFeatureBranch = getNamespace(envName) !== envName;

  let createTransferServer = false;
  let protocols: string[] = [];

  if (isFeatureBranch) {
    if (envName.endsWith('-s')) {
      // Create with SFTP only
      protocols = ['SFTP'];
      createTransferServer = true;
      console.log(
        'Feature branch with -s suffix: Creating Transfer Family server with SFTP only'
      );
    } else if (envName.endsWith('-f')) {
      // Create with FTPS only
      protocols = ['FTPS'];
      createTransferServer = true;
      console.log(
        'Feature branch with -f suffix: Creating Transfer Family server with FTPS only'
      );
    } else if (envName.endsWith('-sf')) {
      // Create with both SFTP and FTPS
      protocols = ['SFTP', 'FTPS'];
      createTransferServer = true;
      console.log(
        'Feature branch with -sf suffix: Creating Transfer Family server with both SFTP and FTPS'
      );
    } else {
      // Don't create the Transfer Family server
      console.log(
        'Feature branch with no special suffix: Skipping Transfer Family server creation'
      );
    }
  } else {
    // Create the server for non-feature branches
    createTransferServer = true;
    protocols = ['SFTP', 'FTPS'];
    console.log(
      'Standard environment: Creating Transfer Family server with both protocols'
    );
  }

  return {
    createTransferServer,
    protocols
  };
}
