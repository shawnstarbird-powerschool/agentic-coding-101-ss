export interface EventMetadata {
  version: string;
  timestamp: number; // Unix timestamp in seconds
  source: string;
  accountId: string;
  region: string;
  districtId: string;
  envName: string;
  namespace: string;
  productCode: string;
}

export interface FolderEventData {
  id: string;
  use: string;
  action: 'created' | 'deactivated';
  path: string;
  userId: string;
}

export interface FileTransferEventData {
  path: string;
  sourceBucket: string;
  destinationBucket: string;
  sizeBytes: number;
}

export interface FolderEvent {
  metadata: EventMetadata;
  data: FolderEventData;
}

export interface FileTransferEvent {
  metadata: EventMetadata;
  data: FileTransferEventData;
}

export const FOLDER_EVENT_TYPE = 'powerschool.ftp.folder';
export const FILE_TRANSFER_EVENT_TYPE = 'powerschool.ftp.file.transfer';
