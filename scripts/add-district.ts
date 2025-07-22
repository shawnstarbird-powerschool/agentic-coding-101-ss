import { cleanName, getBranch, getNamespace } from '@ps-refarch/cdk-utils';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { getDirectHostname } from './integration-test-support';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { argv } = require('yargs/yargs')(process.argv.slice(2))
  .option('district', {
    alias: 'd',
    description: 'District UID',
    type: 'string',
    demandOption: true
  })
  .option('product', {
    alias: 'p', 
    description: 'Product short name',
    type: 'string',
    demandOption: true
  });

async function getEnvNames(): Promise<{envName: string, cleanEnvName: string, namespace: string}> {
  const envName = process.env.PS_ENVIRONMENT ?? await getBranch();
  return {
    envName,
    cleanEnvName: cleanName(envName, true),
    namespace: getNamespace(envName)
  }
}

export const FTP_PRODUCT_SHORT_NAME = 'FTP';

function createTestJWT(payload: { product: string; districtUid: string }): string {
  // Create a simple JWT with the required properties
  // The signature doesn't matter as JWT validation is disabled in dev
  return jwt.sign(payload, 'test-secret');
}

async function main() {
  try {
    const { district, product } = argv;
    const hostname = await getDirectHostname();

    console.log(`Adding product ${product} to district ${district}`);
    console.log(`Using API hostname: ${hostname}`);

    // Create JWT token
    const token = createTestJWT({
      product: FTP_PRODUCT_SHORT_NAME,
      districtUid: district
    });

    // Prepare payload with token
    const payload = {
      token
    };

    // Make API call
    const response = await axios.post(
      `https://${hostname}/district-settings/tenants`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200) {
      console.log('✅ Successfully added district');
      console.log(JSON.stringify(response.data, null, 2));
    } else {
      console.error(`Failed with status ${response.status}`);
      console.error(response.data);
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();