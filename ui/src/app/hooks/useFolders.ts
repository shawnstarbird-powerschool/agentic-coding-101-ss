import {useState, useCallback, useEffect} from 'react';
import {Folder, FolderFormData} from '../types/folder-types';
import {SessionRef} from '../types/session-types';
import * as folderService from '../services/folder-service';
import {isSessionReady} from '../utils/session-utils';

interface UseFoldersResult {
  folders: Array<Folder>;
  loading: boolean;
  error: string | null;
  processingFolderId: string | null;
  hasInitialized: boolean;
  refetchFolders: () => Promise<void>;
  createFolder: (folderData: FolderFormData) => Promise<Folder>;
  updateFolder: (folderId: string, folderData: Partial<FolderFormData>) => Promise<Folder>;
  deactivateFolder: (folderId: string) => Promise<Folder>;
  toggleFolderStatus: (folderId: string) => Promise<Folder>;
}

interface UseFoldersParams {
  sessionRef: SessionRef;
  includeInactive?: boolean;
}

export default function useFolders({
  sessionRef,
  includeInactive = false
}: UseFoldersParams): UseFoldersResult {
  const [folders, setFolders] = useState<Array<Folder>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processingFolderId, setProcessingFolderId] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);

  const refetchFolders = useCallback(async (): Promise<void> => {
    if (!isSessionReady(sessionRef)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fetchedFolders = await folderService.getFolders(sessionRef, includeInactive);
      setFolders(fetchedFolders);
      setHasInitialized(true);
      setLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch folders';
      setError(message);
      setHasInitialized(true);
    } finally {
      setLoading(false);
    }
  }, [sessionRef, includeInactive]);

  // Initial fetch on mount
  useEffect(() => {
    if (isSessionReady(sessionRef)) {
      refetchFolders();
    }
  }, [sessionRef, refetchFolders]);

  const createFolder = useCallback(async (folderData: FolderFormData): Promise<Folder> => {
    try {
      const newFolder = await folderService.createFolder(sessionRef, folderData);
      await refetchFolders(); // Refresh the folder list
      return newFolder;
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        throw err;
      }
      throw new Error('Failed to create folder');
    }
  }, [sessionRef, refetchFolders]);

  const updateFolder = useCallback(async (
    folderId: string,
    folderData: Partial<FolderFormData>
  ): Promise<Folder> => {
    try {
      const updatedFolder = await folderService.updateFolder(sessionRef, folderId, folderData);
      await refetchFolders(); // Refresh the folder list
      return updatedFolder;
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        throw err;
      }
      throw new Error('Failed to update folder');
    }
  }, [sessionRef, refetchFolders]);

  const deactivateFolder = useCallback(async (folderId: string): Promise<Folder> => {
    try {
      setProcessingFolderId(folderId);
      const updatedFolder = await folderService.updateFolderStatus(sessionRef, folderId, false);
      await refetchFolders(); // Refresh the folder list
      setProcessingFolderId(null);
      return updatedFolder;
    } catch (err) {
      setProcessingFolderId(null);
      if (err && typeof err === 'object' && 'message' in err) {
        throw err;
      }
      throw new Error('Failed to deactivate folder');
    }
  }, [sessionRef, refetchFolders]);

  const toggleFolderStatus = useCallback(async (folderId: string): Promise<Folder> => {
    try {
      setProcessingFolderId(folderId);
      setError(null);

      // Find the folder to update
      const folderToUpdate = folders.find((folder) => {
        return folder.id === folderId;
      });
      if (!folderToUpdate) {
        throw new Error(`Folder with ID ${folderId} not found`);
      }

      // Toggle the active status
      const newActiveStatus = !folderToUpdate.active;
      const updatedFolder = await folderService.updateFolderStatus(sessionRef, folderId, newActiveStatus);

      // Update the local state
      setFolders(folders.map((folder) => {
        if (folder.id === folderId) {
          return {
            ...folder,
            active: newActiveStatus
          };
        }
        return folder;
      }));

      setProcessingFolderId(null);
      return updatedFolder;
    } catch (err) {
      setProcessingFolderId(null);
      if (err && typeof err === 'object' && 'message' in err) {
        throw err;
      }
      throw new Error('Failed to toggle folder status');
    }
  }, [sessionRef, folders]);

  return {
    folders,
    loading,
    error,
    processingFolderId,
    hasInitialized,
    refetchFolders,
    createFolder,
    updateFolder,
    deactivateFolder,
    toggleFolderStatus
  };
}
