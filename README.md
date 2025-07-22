# PowerSchoolFTP - Secure File Transfer Service

PowerSchoolFTP is a centralized file transfer service that leverages AWS Transfer Family to provide secure SFTP and FTPS protocols for PowerSchool products and their customers. This service enables both inbound (customers sending data to PS products) and outbound (PS products sending files to customers) file transfers in a secure, managed environment.

## Overview

The PowerSchoolFTP service provides:

- Support for both SFTP and FTPS protocols (plain FTP is not supported for security reasons)
- Authentication via username/password or public key (with a strong preference for public key)
- IP allowlisting for restricting user access on a per-IP basis
- Granular access controls for specific file locations within a tenant's FTP account
- Self-service credential management for customers
- Audit logging in accordance with NFR 1022
- Integration with PowerSchool Admin Center for administration

## Architecture

PowerSchoolFTP uses the following AWS components:

- **AWS Transfer Family**: Provides the SFTP and FTPS server functionality
- **API Gateway with Lambda**: Custom identity provider for user authentication
- **S3 Buckets**: Storage for transferred files
- **DynamoDB**: User and tenant management
- **EventBridge**: Notifications for file uploads and user management events
- **VPC Endpoints**: Network-level security for FTPS

## Integration Options

PowerSchool products can integrate with PowerSchoolFTP in several ways:

### For Inbound File Transfers (Customer to PowerSchool)

1. **SFTP Access**: Products can connect via SFTP credentials to access uploaded files
2. **S3/EventBridge**: Products can receive EventBridge notifications and access files directly in S3

### For Outbound File Transfers (PowerSchool to Customer)

1. **SFTP Access**: Products can upload files via SFTP to the customer's directory
2. **S3 Direct**: Products can upload files directly to S3 buckets

## Cost Optimization for Feature Branches

To optimize costs during development, we've implemented a flexible Transfer Family server configuration based on environment name patterns:

### Transfer Family Deployment Options

1. **Standard Environments** (prod, staging, etc.):

   - Full deployment with both SFTP and FTPS protocols
   - Ensures complete functionality for production and testing environments

2. **Feature Branch Environments**:
   - **No Suffix**: No Transfer Family server deployed, no event forwarding (note: change from previous behavior)
   - **"-ui" Suffix** (e.g., `dev/ABC-1234-ui`): No deployment of CDK (good for UI only changes)
   - **"-s" Suffix** (e.g., `dev/ABC-1234-s`): SFTP protocol only, no event forwarding
   - **"-f" Suffix** (e.g., `dev/ABC-1234-f`): FTPS protocol only, no event forwarding
   - **"-sf" Suffix** (e.g., `dev/ABC-1234-sf`): Full deployment with both SFTP and FTPS (default), no event forwarding
   - **"-e" Suffix** (e.g., `dev/ABC-1234-ne`): Deploy CDK without transfer family but with Event forwarding (caution, might cause "too many resources" deployment fail)

### Benefits

- **Cost Reduction**: AWS Transfer Family is priced per protocol endpoint and per hour. By selectively deploying only what's needed for development, costs can be significantly reduced.
- **Simplified Testing**: Developers can choose the specific protocol they need to test without deploying unnecessary infrastructure.
- **Faster Deployments**: Feature branches with no Transfer Family server deploy faster and have fewer resources to manage.

## Useful Scripts

### Test Data

You can populate the DynamoDB table with test data using the following command:

```
npm run write-test-data
```

This script will:

1. Determine the current environment name from PS_ENVIRONMENT or the current branch
2. Derive the namespace from the environment name
3. Insert test user records into the DynamoDB table for that namespace
4. The test data includes sample users with different authentication types (password and SSH key)

### Product Records

You can update product records in the DynamoDB table using the following command:

```
npm run update-product-records
```

This script no longer requires tenant IDs to be specified, as it now only creates product records and user records for multi-tenant products using a constant MULTITENANT_TENANT_ID.

This script will:

1. Determine the current environment name from PS_ENVIRONMENT or the current branch
2. Derive the namespace from the environment name
3. For each product listed in account-env.ts for the current namespace:
   - Ensure there is a Product entity in the database with the s3Config data from account-env.ts
   - For multi-tenant products only:
     - Create paths in the S3 bucket for the product
     - Ensure there is a User entity with username of the lowercased productCode, public key, and authentication type
   - Ensure there is a User entity with username of the lowercased productCode, public key, and authentication type

### Query Audit Script

This script allows you to query the audit table for a specific entity type and ID. It retrieves all audit records for the specified entity and displays the timestamp and contents of the `newImage` field for each record.

#### Prerequisites

- AWS credentials configured with access to the DynamoDB audit table
- Node.js and npm installed

#### Usage

```bash
# Run with npx
npx ts-node scripts/query-audit.ts --type USER --id user123 [--environment dev] [--property username,folders]

# Or if you've made it executable
./scripts/query-audit.ts --type USER --id user123 [--environment dev] [--property username,folders]
```

#### Parameters

- `--type`, `-t` (required): The entity type (e.g., USER, FOLDER)
- `--id`, `-i` (required): The entity ID
- `--environment`, `-e` (optional): The environment name (e.g., dev, staging, prod). If not provided, it will be determined from the current git branch.
- `--property`, `-p` (optional): Specific properties to display from newImage as a comma-separated list (e.g., username,folders,ipWhitelist). Can use dot notation for nested properties (e.g., 'address.city').

#### Examples

Query audit records for a user:

```bash
npx ts-node scripts/query-audit.ts --type USER --id 01JRDJ7YJN1QD1F49CNYYVSZ8Q
```

Query audit records for a folder in a specific environment:

```bash
npx ts-node scripts/query-audit.ts --type FOLDER --id 01JSFYQPV6W2CT9N354S3FHNN7 --environment dev
```

Query audit records and display only a specific property:

```bash
npx ts-node scripts/query-audit.ts --type USER --id 01JRDJ7YJN1QD1F49CNYYVSZ8Q --property username
```

Query audit records and display multiple properties:

```bash
npx ts-node scripts/query-audit.ts --type USER --id 01JRDJ7YJN1QD1F49CNYYVSZ8Q --property username,folders,ipWhitelist
```

Query audit records and display nested properties:

```bash
npx ts-node scripts/query-audit.ts --type USER --id 01JRDJ7YJN1QD1F49CNYYVSZ8Q --property ipWhitelist.0,folders.1
```

#### Output

The script outputs the timestamp and contents of the `newImage` field for each audit record found, sorted by timestamp (oldest first). Example output:

```
Environment name: dev (clean: dev)
Audit table name: power-ftp-dev-audit
Querying audit records with partition key: AUDIT#USER#01JRDJ7YJN1QD1F49CNYYVSZ8Q
Found 3 audit records

---------------------------------------------------
Timestamp: 2025-05-20T14:30:45.123Z
Event: INSERT
Entity Type: USER
Entity ID: 01JRDJ7YJN1QD1F49CNYYVSZ8Q
Tenant ID: d920e82c-819e-4320-b08f-3781bd03091a
New Image:
{
  "PK": "TENANT#d920e82c-819e-4320-b08f-3781bd03091a",
  "SK": "USER#01JRDJ7YJN1QD1F49CNYYVSZ8Q",
  "id": "01JRDJ7YJN1QD1F49CNYYVSZ8Q",
  "name": "Bob Bleaux",
  "username": "bobbleaux-do-not-modify",
  ...
}

---------------------------------------------------
Timestamp: 2025-05-21T09:15:33.456Z
Event: MODIFY
Entity Type: USER
Entity ID: 01JRDJ7YJN1QD1F49CNYYVSZ8Q
Tenant ID: d920e82c-819e-4320-b08f-3781bd03091a
...
```

When using the `--property` parameter, only the specified properties will be displayed:

```
Environment name: dev (clean: dev)
Audit table name: power-ftp-dev-audit
Querying audit records with partition key: AUDIT#USER#01JRDJ7YJN1QD1F49CNYYVSZ8Q
Found 3 audit records

---------------------------------------------------
Timestamp: 2025-05-20T14:30:45.123Z
Event: INSERT
Entity Type: USER
Entity ID: 01JRDJ7YJN1QD1F49CNYYVSZ8Q
Tenant ID: d920e82c-819e-4320-b08f-3781bd03091a
Properties:

username: "bobbleaux-do-not-modify"

folders: ["01JSFYQPV6W2CT92325662224"]

ipWhitelist: ["52.205.140.168/32","35.170.140.164/32","52.33.154.13/32","54.189.28.163/32"]
```

### Permanent Resources Deployment

The application uses a separate stack for permanent resources (S3 buckets, DynamoDB tables) that should only be created once per namespace (dev, qa, prod, etc.). By default:

- For standard environments (dev, qa, prod), the permanent resources stack is always deployed
- For feature branch environments (dev/feature-branch), the permanent resources stack is NOT deployed, and the feature branch references the existing resources from the namespace

If you need to deploy the permanent resources stack for a feature branch (e.g., for testing changes to the permanent resources), you can use the `FORCE_PERMANENT_RESOURCES` environment variable:

```
FORCE_PERMANENT_RESOURCES=true npm run deploy -- -c envName=dev/feature-branch
```

This will deploy both the permanent resources stack and the main stack for the feature branch.

## Troubleshooting

- Ensure Node version is at least 16 (Node 18 recommended)
- Verify NPM version is 8.x
- Check that your `account-env.ts` file is properly formatted
- Ensure your AWS credentials are correctly configured
