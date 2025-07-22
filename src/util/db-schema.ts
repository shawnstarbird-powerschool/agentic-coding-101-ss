import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Entity, Table } from 'dynamodb-onetable';

const client = new DynamoDBClient({});
const DocumentClient = DynamoDBDocumentClient.from(client);

export const USER_AUTH_TYPE_PASSWORD = 'password';
export const USER_AUTH_TYPE_SSH_KEY = 'SSH key';

const { APP_TABLE_NAME } = process.env;
if (!APP_TABLE_NAME) {
  throw new Error('APP_TABLE_NAME environment variable is not set');
}

export const UserAccessEnum = ['read', 'write', 'readwrite'] as const;
export type UserAccess = (typeof UserAccessEnum)[number];

export const TransferLogDirectionEnum = ['inbound', 'outbound'] as const;
export type TransferLogDirection = (typeof TransferLogDirectionEnum)[number];

/* eslint-disable no-template-curly-in-string */

// Schema for the single table
const schema = {
  format: 'onetable:1.1.0',
  version: '0.1.0',
  indexes: {
    primary: { hash: 'PK', sort: 'SK' },
    GSI1: { hash: 'GSI1PK', sort: 'GSI1SK', project: 'all' }
  },
  params: {
    timestamps: true
  },
  models: {
    TenantProduct: {
      PK: { type: String, value: 'TENANT#${tenantId}' },
      SK: { type: String, value: 'PRODUCT#${productId}' },
      tenantId: { type: String, required: true },
      productId: { type: String, required: true },
      productCode: { type: String, required: true },
      // For GSI1, flip tenant and product
      GSI1PK: { type: String, value: 'PRODUCT#${productId}' },
      GSI1SK: { type: String, value: 'TENANT#${tenantId}' },
      active: { type: Boolean, default: true },
      expires: { type: Number },
      source: { type: String },
      created: { type: Date },
      updated: { type: Date }
    },
    TransferLog: {
      PK: { type: String, value: 'AUDIT#${id}' },
      SK: {
        type: String,
        value: '${tenantId}#${principalId}'
      },
      id: { type: String, generate: 'ulid', required: true },
      sourceIPAddress: { type: String, required: true },
      principalId: { type: String, required: true },
      tenantId: { type: String, required: true },
      fileName: { type: String, required: true },
      direction: {
        type: String,
        required: true,
        enum: TransferLogDirectionEnum
      },
      startedAt: { type: Date, required: true },
      completedAt: { type: Date },
      status: { type: String },
      sourceRecord: { type: Object },
      GSI1PK: {
        type: String,
        value: 'AUDITBYPRINCIPAL#${tenantId}#${principalId}'
      },
      GSI1SK: { type: String, value: 'AUDIT#${id}' },
      source: { type: String },
      created: { type: Date },
      updated: { type: Date }
    },
    Folder: {
      PK: { type: String, value: 'TENANT#${tenantId}' },
      SK: { type: String, value: 'FOLDER#${id}' },
      id: { type: String, generate: 'ulid', required: true },
      tenantId: { type: String, required: true },
      productId: { type: String, required: true },
      use: { type: String, required: true },
      path: { type: String, required: true },
      accessType: {
        type: String,
        required: true,
        enum: ['inbound', 'outbound']
      },
      active: { type: Boolean, default: true },
      expires: { type: Number },
      GSI1PK: { type: String, value: 'ALL_FOLDERS' },
      GSI1SK: { type: String, value: 'PRODUCT#${productId}#FOLDER#${id}' },
      source: { type: String },
      created: { type: Date },
      updated: { type: Date }
    },
    Product: {
      PK: { type: String, value: 'PRODUCT#${id}' },
      SK: { type: String, value: '$' },
      id: { type: String, generate: 'ulid', required: true },
      productCode: { type: String, required: true },
      name: { type: String, required: true }, // Added product name field
      productPublicKey: { type: String, required: true },
      accessAccounts: { type: Array, items: { type: String } },
      permissions: { type: Array, items: { type: String } },
      multiTenant: { type: Boolean, required: true },
      ipWhitelist: { type: Array, items: { type: String } },
      uses: { type: Array, items: { type: Object }, required: true },
      GSI1PK: { type: String, value: 'ALL_PRODUCTS' },
      GSI1SK: { type: String, value: 'PRODUCT#${id}' },
      active: { type: Boolean, default: true },
      expires: { type: Number },
      source: { type: String },
      created: { type: Date },
      updated: { type: Date }
    },
    Tenant: {
      PK: { type: String, value: 'TENANT#${id}' },
      SK: { type: String, value: '$' },
      id: { type: String, required: true },
      name: { type: String, required: true },
      domain: { type: String },
      districtId: { type: String },
      GSI1PK: { type: String, value: 'ALL_TENANTS' },
      GSI1SK: { type: String, value: 'TENANT#${id}' },
      active: { type: Boolean, default: true },
      expires: { type: Number },
      source: { type: String },
      created: { type: Date },
      updated: { type: Date }
    },
    User: {
      PK: { type: String, value: 'TENANT#${tenantId}' },
      SK: { type: String, value: 'USER#${id}' },
      id: { type: String, generate: 'ulid', required: true },
      tenantId: { type: String, required: true },
      name: { type: String },
      publicKey: { type: String },
      username: { type: String, required: true },
      authenticationType: { type: String, required: true },
      passwordHash: { type: String },

      /** A list of the Folder entity ids, human users only */
      folders: { type: Array, items: { type: String } },

      /** Directly reference the Product entity's id */
      productId: { type: String, required: true },

      access: {
        type: String,
        required: true,
        enum: UserAccessEnum
      },
      ipWhitelist: { type: Array, items: { type: String } },
      lastLogin: { type: Number },
      active: { type: Boolean, default: true },

      /** Flag indicating if the user is a product user (vs a human user) */
      isProductUser: { type: Boolean, required: true, default: false },

      GSI1PK: { type: String, value: 'ALL_USERS' },
      GSI1SK: { type: String, value: 'USER#${username}' },
      expires: { type: Number },
      source: { type: String },
      created: { type: Date },
      updated: { type: Date }
    },
    File: {
      PK: { type: String, value: 'FILE#${id}' },
      SK: { type: String, value: '$' },
      id: { type: String, generate: 'ulid', required: true },
      filename: { type: String, required: true },
      size: { type: Number, required: true },
      type: { type: String, required: true },
      path: { type: String, required: true },
      GSI1PK: { type: String, value: 'ALL_FILES' },
      GSI1SK: { type: String, value: 'FILE#${id}' },
      expires: { type: Number },
      source: { type: String },
      created: { type: Date },
      updated: { type: Date }
    },
    Session: {
      PK: { type: String, value: 'SESSION#${id}' },
      SK: { type: String, value: '$' },
      id: { type: String, generate: 'ulid', required: true },
      userId: { type: String, required: true },
      token: { type: String, required: true },
      expires: { type: Number },
      GSI1PK: { type: String, value: 'ALL_SESSIONS' },
      GSI1SK: { type: String, value: 'SESSION#${id}' },
      source: { type: String },
      created: { type: Date },
      updated: { type: Date }
    }
  } as const
};

// Create the table
export const table = new Table({
  client: DocumentClient,
  name: APP_TABLE_NAME,
  schema,
  timestamps: true,
  partial: true
});

// Export types for the entities
export type TenantProductType = Entity<typeof schema.models.TenantProduct>;
export type TransferLogType = Entity<typeof schema.models.TransferLog>;
export type ProductType = Entity<typeof schema.models.Product>;
export type TenantType = Entity<typeof schema.models.Tenant>;
export type FolderType = Entity<typeof schema.models.Folder>;
export type UserType = Entity<typeof schema.models.User>;
export type FileType = Entity<typeof schema.models.File>;
export type SessionType = Entity<typeof schema.models.Session>;

// Export the models
export const TenantProduct = table.getModel<TenantProductType>('TenantProduct');
export const TransferLog = table.getModel<TransferLogType>('TransferLog');
export const Product = table.getModel<ProductType>('Product');
export const Tenant = table.getModel<TenantType>('Tenant');
export const Folder = table.getModel<FolderType>('Folder');
export const User = table.getModel<UserType>('User');
export const File = table.getModel<FileType>('File');
export const Session = table.getModel<SessionType>('Session');

export { schema };
