import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  cleanName, getBranch,
  getNamespace
} from "@ps-refarch/cdk-utils";
import { getTempCredentials } from "@ps-refarch/lambda-utils";
import { randomBytes } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import allAcctEnvProps from '../src/account-env';
import { MainAccountEnvProps } from "../src/cdk/lib/main-stack-props";

// Don't use d920e82c-819e-4320-b08f-3781bd03091a as the tenant ID, because it is used in
// manual tests.
export const TENANT_ID = '88888888-8888-8888-8888-888888888888';
export const TENANT_ID_QA = '99999999-9999-9999-9999-999999999999';
export const MANUAL_TENANT_ID = 'd920e82c-819e-4320-b08f-3781bd03091a';

export async function getEnvNames(overrideEnvName?: string): Promise<{envName: string, cleanEnvName: string, namespace: string}> {
  const envName = overrideEnvName ?? process.env.PS_ENVIRONMENT ?? await getBranch();
  return {
    envName,
    cleanEnvName: cleanName(envName, true),
    namespace: getNamespace(envName)
  }
}

export async function getAccountEnvProps(): Promise<MainAccountEnvProps> {
  const { namespace } = await getEnvNames();

  const envConfig = Object.values(allAcctEnvProps).find((env) =>
    env.names && env.names.includes(namespace)
  );
  
  if (!envConfig || !envConfig.products) {
    throw new Error(`No product configuration found for environment ${namespace}`);
  }

  return envConfig;
}

/**
 * Generate a session record and return the x-session-ref. We will move this out to a shared library
 * once we know it works.
 * @param props
 * @returns x-session-ref value to use
 */
export async function generateSession(props: {
  sessionRecord: Record<string, any>;
  account: string;
  region: string;
  sharedServiceEnv: string;
}): Promise<{ xSessionRef: string }> {
  const { sessionRecord, account, region, sharedServiceEnv } = props;

  const marshallOptions = {
    // Whether to automatically convert empty strings, blobs, and sets to `null`.
    convertEmptyValues: false, // false, by default.
    // Whether to remove undefined values while marshalling.
    removeUndefinedValues: false, // false, by default.
    // Whether to convert typeof object to map attribute.
    convertClassInstanceToMap: false, // false, by default.
  };

  const unmarshallOptions = {
    // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
    wrapNumbers: false, // false, by default.
  };

  const sessionTableName = `arn:aws:dynamodb:${region}:${account}:table/${sharedServiceEnv}-UnifiedUser-SessionTable`;
  const sessionTableRoleArn = `arn:aws:iam::${account}:role/${sharedServiceEnv}-UnifiedUser-SessionTableRole`;

  process.env.AWS_REGION = region;
  const credentials = await getTempCredentials({
    roleArn: sessionTableRoleArn,
    roleSessionName: "powerftp-integration-test",
  });
  const ddbClient = new DynamoDBClient({
    region,
    credentials,
  });
  const docClient = DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions,
    unmarshallOptions,
  });

  // Finally we can create the record
  const xSessionRef = randomBytes(32).toString("hex");
  const writeResult = await docClient.send(
    new PutCommand({
      TableName: sessionTableName,
      Item: {
        id: xSessionRef,
        ...sessionRecord,
      },
    })
  );

  if (writeResult.$metadata.httpStatusCode !== 200) {
    throw new Error(
      `Failed to write session record: ${JSON.stringify(writeResult)}`
    );
  }
  return { xSessionRef };
}

/**
 * Front end that will let you generate a session record using standard default
 * configurations (e.g. typical account-env.props).
 * @returns
 */
export async function generateStandardSession(props: {
  /**
   * The session record to write to the session table. For example, 
   * ```
   * {
      district_uid: "4ffa60b1-6763-40e4-a1e4-c2174641db07",
      product_short_name: "NAV",
      scopes: [
        "nsds.ai-chatbot"
      ],
      sub: "auth0|01H4ZHH991K1NCE5N5W51HB7N5",
      expires: Math.floor(Date.now() / 1000) + 3600, // This is optional, it will default to 1 hour
    }
      ```
   */
  sessionRecord: Record<string, any>;

  /**
   * The session table information to use. If not provided, it will be taken from the account-env.props.
   * If you don't have an account-env.json file, you will need to provide it.
   */
  sessionTable: {
    /**
     * The account to use for the session table. If not provided, it will be taken from the account-env.props.
     */
    account: string;

    /**
     *
     */
    region: string;

    /**
     * The shared service environment to use. If not provided, it will be taken from the account-env.props.
     */
    sharedServiceEnv: string;
  };
}): Promise<{ xSessionRef: string }> {
  const { sessionRecord, sessionTable } = props;

  const envName = process.env.PS_ENVIRONMENT || cleanName(await getBranch());

  const { account, region, sharedServiceEnv } = sessionTable;
  if (!account || !region || !sharedServiceEnv) {
    throw new Error(
      `Session table account/region or shared service env not found in props for ${envName}`
    );
  }

  const { xSessionRef } = await generateSession({
    sessionRecord: {
      expires: Math.floor(Date.now() / 1000) + 3600,
      ...sessionRecord,
    },
    account,
    region,
    sharedServiceEnv,
  });
  console.log("xSessionRef:", xSessionRef);
  return { xSessionRef };
}

const generatedSessionRef: Record<string, string> = {};
export async function getIntegrationSessionRef(districtUid?: string): Promise<string> {
  const district_uid = districtUid ?? TENANT_ID;
  if (generatedSessionRef[district_uid] == null) {
    const accountEnvProps = await getAccountEnvProps();
    const {xSessionRef} = await generateStandardSession({
      sessionTable: {
        ...accountEnvProps.sessionTable,
        region: accountEnvProps.env.region,
        sharedServiceEnv: accountEnvProps.sharedServiceEnv,
      },
      sessionRecord: {
        district_uid
      }
    });
    generatedSessionRef[district_uid] = xSessionRef;
  }

  return generatedSessionRef[district_uid];
}

export async function getDirectHostname(envName?: string): Promise<string> {
  const { cleanEnvName, namespace } = await getEnvNames(envName);

  return namespace === 'produs' ?
    `api.fileshare.powerschool.com`:
    `api.${cleanEnvName}.fileshare.powerschoolcorp.com`;
}

export async function getTableName(): Promise<string> {
  // Get package name from package.json
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '../package.json'), 'utf-8')
  );
  const packageName = cleanName(packageJson.name);
  
  // Get environment name and clean it using the same algorithm as getDirectHostname
  const envName = process.env.PS_ENVIRONMENT ?? cleanName(await getBranch());
  const cleanEnvName = cleanName(envName, true);
  
  console.log(`Using package name: ${packageName}, clean env name: ${cleanEnvName}`);
  
  // Get the table name
  return `${packageName}-${cleanEnvName}`;
}
