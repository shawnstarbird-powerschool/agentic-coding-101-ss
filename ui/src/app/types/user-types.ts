// User-related type definitions

import {SessionRef} from './session-types';

// Define our User interface based on the API response model
export interface User {
  id: string;
  username: string;
  authType: string;
  access: string;
  productCode: string;
  productName?: string;
  folders: Array<{id: string; path: string; use: string; accessType: string}>;
  ipWhitelist?: Array<string>;
  active: boolean;
  tenantId: string;
  lastLogin?: number;
  name?: string;
  created?: string;
  updated?: string;
}

// Define the API response interface for users list
export interface GetUsersResponse {
  users: Array<{
    id: string;
    username: string;
    authenticationType: string;
    access: string;
    productCode: string;
    productName?: string;
    folders: Array<{id: string; path: string; use: string; accessType: string}>;
    ipWhitelist?: Array<string>;
    active: boolean;
    tenantId: string;
    lastLogin?: number;
    name?: string;
    created?: string;
    updated?: string;
  }>;
  count: number;
}

// Define the API response interface for a single user
export interface GetUserResponse {
  user: {
    id: string;
    username: string;
    authenticationType: string;
    access: string;
    productCode: string;
    folders: Array<{id: string; path: string; use: string; accessType: string}>;
    ipWhitelist?: Array<string>;
    active: boolean;
    tenantId: string;
    lastLogin?: number;
    name?: string;
    created?: string;
    updated?: string;
  };
}

// Props interfaces for user-related components
export interface UserListPageProps {
  sessionRef: SessionRef;
}

export interface EditUserPageProps {
  sessionRef: SessionRef;
}

export interface CreateUserPageProps {
  sessionRef: SessionRef;
}

// Props interface for the UserForm component
export interface UserFormProps {
  username: string;
  setUsername: (value: string) => void;
  authType: string;
  setAuthType: (value: string) => void;
  pendingAuthType: string;
  setPendingAuthType: (value: string) => void;
  access: string;
  setAccess: (value: string) => void;
  productCode: string;
  setProductCode: (value: string) => void;
  selectedFolders: Array<string>;
  setSelectedFolders: (value: Array<string>) => void;
  ipWhitelist: string;
  setIpWhitelist: (value: string) => void;
  redactedPassword: string;
  redactedSSHKey: string;
  handleSSHKeyChange: (value: string) => void;
  handleAuthTypeReset: () => void;
  setShowPasswordModal: (value: boolean) => void;
  products: Array<{code: string; name: string}>;
  getFolderOptions: (productCode: string) => Array<{id: string; name: string; labelText: string}>;
  readOnly?: boolean;
}
