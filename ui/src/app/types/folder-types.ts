// Folder-related type definitions

import {SessionRef} from './session-types';

// Define the Folder interface
export interface Folder {
  id: string;
  path: string;
  productCode: string;
  use: string;
  accessType: string;
  active?: boolean;
  tenantId?: string;
  created?: string;
  updated?: string;
  users?: Array<{id: string; username: string}>;
}

// Define the API response interface for folders
export interface GetFoldersResponse {
  folders: Array<{
    id: string;
    tenantId: string;
    productId: string;
    productCode: string;
    use: string;
    path: string;
    accessType: string;
    active: boolean;
    created?: string;
    updated?: string;
    users?: Array<{id: string; username: string}>;
  }>;
  count: number;
}

// Props interfaces for folder-related components
export interface FolderListPageProps {
  sessionRef: SessionRef;
}

// Form data for creating/updating folders
export interface FolderFormData {
  use: string;
  path: string;
  productCode: string;
  accessType: string;
}

// Type for folder status updates
export interface FolderStatusUpdate {
  active: boolean;
}
