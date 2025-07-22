import {renderHook, act, waitFor} from '@testing-library/react';
import useFolders from '../../hooks/useFolders';
import * as folderService from '../../services/folder-service';
import {isSessionReady} from '../../utils/session-utils';
import {Folder, FolderFormData} from '../../types/folder-types';
import {SessionRef} from '../../types/session-types';

// Mock the dependencies
jest.mock('../../services/folder-service');
jest.mock('../../utils/session-utils');

const mockedFolderService = folderService as jest.Mocked<typeof folderService>;
const mockedIsSessionReady = isSessionReady as jest.MockedFunction<typeof isSessionReady>;

describe('useFolders', () => {
  const mockSessionRef: SessionRef = {
    headerName: 'test-header',
    headerValue: 'test-value',
    mfeBackendServer: 'test-server'
  };

  const mockFolder: Folder = {
    id: 'folder-1',
    path: '/test/path',
    productCode: 'TEST',
    use: 'inbound',
    accessType: 'sftp',
    active: true,
    tenantId: 'tenant-1',
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z'
  };

  const mockFolders: Array<Folder> = [
    mockFolder,
    {
      id: 'folder-2',
      path: '/test/path2',
      productCode: 'TEST2',
      use: 'outbound',
      accessType: 'ftp',
      active: false,
      tenantId: 'tenant-1'
    }
  ];

  const mockFolderFormData: FolderFormData = {
    use: 'inbound',
    path: '/new/path',
    productCode: 'NEW',
    accessType: 'sftp'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsSessionReady.mockReturnValue(true);
  });

  describe('initialization', () => {
    it('should use default includeInactive=false when not provided', async () => {
      mockedFolderService.getFolders.mockResolvedValue([]);

     renderHook(() => {
        return useFolders({sessionRef: mockSessionRef});
      });

      await waitFor(() => {
        expect(mockedFolderService.getFolders).toHaveBeenCalled();
      });

      expect(mockedFolderService.getFolders).toHaveBeenCalledWith(mockSessionRef, false);
    });

    it('should use provided includeInactive value when specified', async () => {
      mockedFolderService.getFolders.mockResolvedValue([]);

      renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: true});
      });

      await waitFor(() => {
        expect(mockedFolderService.getFolders).toHaveBeenCalled();
      });

      expect(mockedFolderService.getFolders).toHaveBeenCalledWith(mockSessionRef, true);
    });

    it('should initialize with correct default state', () => {
      mockedIsSessionReady.mockReturnValue(false);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      expect(result.current.folders).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.refetchFolders).toBe('function');
      expect(typeof result.current.createFolder).toBe('function');
      expect(typeof result.current.updateFolder).toBe('function');
      expect(typeof result.current.deactivateFolder).toBe('function');
    });

    it('should not fetch folders when session is not ready', () => {
      mockedIsSessionReady.mockReturnValue(false);

      renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      expect(mockedFolderService.getFolders).not.toHaveBeenCalled();
    });

    it('should fetch folders on mount when session is ready', async () => {
      mockedFolderService.getFolders.mockResolvedValue(mockFolders);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockedFolderService.getFolders).toHaveBeenCalledWith(mockSessionRef, false);
      expect(result.current.folders).toEqual(mockFolders);
      expect(result.current.error).toBe(null);
    });
  });

  describe('refetchFolders', () => {
    it('should successfully fetch and update folders', async () => {
      mockedFolderService.getFolders.mockResolvedValue(mockFolders);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      await act(async () => {
        await result.current.refetchFolders();
      });

      expect(result.current.folders).toEqual(mockFolders);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should not proceed when session is not ready', async () => {
      mockedIsSessionReady.mockReturnValue(false);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      await act(async () => {
        await result.current.refetchFolders();
      });

      expect(mockedFolderService.getFolders).not.toHaveBeenCalled();
    });

    it('should set loading states correctly during fetch', async () => {
      let resolvePromise: (value: Array<Folder>) => void;
      const promise = new Promise<Array<Folder>>((resolve) => {
        resolvePromise = resolve;
      });
      mockedFolderService.getFolders.mockReturnValue(promise);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      act(() => {
        result.current.refetchFolders();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!(mockFolders);
        await promise;
      });

      expect(result.current.loading).toBe(false);
    });

    it('should handle fetch error correctly', async () => {
      const errorMessage = 'Failed to fetch folders';
      // Set up successful initial call, then error on manual refetch
      mockedFolderService.getFolders.mockResolvedValueOnce(mockFolders);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      // Wait for initial mount to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Now set up error for manual refetch
      mockedFolderService.getFolders.mockRejectedValue(new Error(errorMessage));

      // Test manual refetch to cover error handling lines
      await act(async () => {
        try {
          await result.current.refetchFolders();
        } catch (error) {
          // Expected error
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe(errorMessage);
        }
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
    });

    it('should handle non-Error objects in catch block', async () => {
      // Set up successful initial call, then error on manual refetch
      mockedFolderService.getFolders.mockResolvedValueOnce(mockFolders);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      // Wait for initial mount to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Now set up string error for manual refetch
      mockedFolderService.getFolders.mockRejectedValue('String error');

      // Test manual refetch to cover error handling lines
      await act(async () => {
        try {
          await result.current.refetchFolders();
        } catch (error) {
          // Expected error - should be the original string error re-thrown
          expect(error).toBe('String error');
        }
      });

      expect(result.current.error).toBe('Failed to fetch folders');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('createFolder', () => {
    it('should successfully create folder and refresh list', async () => {
      mockedFolderService.createFolder.mockResolvedValue(mockFolder);
      mockedFolderService.getFolders.mockResolvedValue([...mockFolders, mockFolder]);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      let createdFolder: Folder;
      await act(async () => {
        createdFolder = await result.current.createFolder(mockFolderFormData);
      });

      expect(mockedFolderService.createFolder).toHaveBeenCalledWith(mockSessionRef, mockFolderFormData);
      expect(createdFolder!).toEqual(mockFolder);
      expect(mockedFolderService.getFolders).toHaveBeenCalledTimes(2); // Initial + after create
    });

    it('should handle create error with Error object', async () => {
      const error = new Error('Creation failed');
      mockedFolderService.createFolder.mockRejectedValue(error);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      await act(async () => {
        try {
          await result.current.createFolder(mockFolderFormData);
        } catch (thrownError) {
          expect(thrownError).toBe(error);
        }
      });

      expect(mockedFolderService.createFolder).toHaveBeenCalledWith(mockSessionRef, mockFolderFormData);
    });

    it('should handle create error with object containing message', async () => {
      const error = {message: 'Custom error message'};
      mockedFolderService.createFolder.mockRejectedValue(error);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      await act(async () => {
        try {
          await result.current.createFolder(mockFolderFormData);
        } catch (thrownError) {
          expect(thrownError).toBe(error);
        }
      });
    });

    it('should handle create error with non-object error', async () => {
      mockedFolderService.createFolder.mockRejectedValue('String error');

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      await act(async () => {
        try {
          await result.current.createFolder(mockFolderFormData);
        } catch (thrownError) {
          expect(thrownError).toEqual(new Error('Failed to create folder'));
        }
      });
    });
  });

  describe('updateFolder', () => {
    const updateData: Partial<FolderFormData> = {
      use: 'outbound',
      path: '/updated/path'
    };

    it('should successfully update folder and refresh list', async () => {
      const updatedFolder = {...mockFolder, ...updateData};
      mockedFolderService.updateFolder.mockResolvedValue(updatedFolder);
      mockedFolderService.getFolders.mockResolvedValue([updatedFolder]);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      let resultFolder: Folder;
      await act(async () => {
        resultFolder = await result.current.updateFolder(mockFolder.id, updateData);
      });

      expect(mockedFolderService.updateFolder).toHaveBeenCalledWith(mockSessionRef, mockFolder.id, updateData);
      expect(resultFolder!).toEqual(updatedFolder);
      expect(mockedFolderService.getFolders).toHaveBeenCalledTimes(2); // Initial + after update
    });

    it('should handle update error with Error object', async () => {
      const error = new Error('Update failed');
      mockedFolderService.updateFolder.mockRejectedValue(error);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      await act(async () => {
        try {
          await result.current.updateFolder(mockFolder.id, updateData);
        } catch (thrownError) {
          expect(thrownError).toBe(error);
        }
      });
    });

    it('should handle update error with object containing message', async () => {
      const error = {message: 'Custom update error'};
      mockedFolderService.updateFolder.mockRejectedValue(error);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      await act(async () => {
        try {
          await result.current.updateFolder(mockFolder.id, updateData);
        } catch (thrownError) {
          expect(thrownError).toBe(error);
        }
      });
    });

    it('should handle update error with non-object error', async () => {
      mockedFolderService.updateFolder.mockRejectedValue('String error');

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      await act(async () => {
        try {
          await result.current.updateFolder(mockFolder.id, updateData);
        } catch (thrownError) {
          expect(thrownError).toEqual(new Error('Failed to update folder'));
        }
      });
    });
  });

  describe('deactivateFolder', () => {
    it('should successfully deactivate folder and refresh list', async () => {
      const deactivatedFolder = {...mockFolder, active: false};
      mockedFolderService.updateFolderStatus.mockResolvedValue(deactivatedFolder);
      mockedFolderService.getFolders.mockResolvedValue([deactivatedFolder]);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      let resultFolder: Folder;
      await act(async () => {
        resultFolder = await result.current.deactivateFolder(mockFolder.id);
      });

      expect(mockedFolderService.updateFolderStatus).toHaveBeenCalledWith(mockSessionRef, mockFolder.id, false);
      expect(resultFolder!).toEqual(deactivatedFolder);
      expect(mockedFolderService.getFolders).toHaveBeenCalledTimes(2); // Initial + after deactivate
    });

    it('should handle deactivate error with Error object', async () => {
      const error = new Error('Deactivate failed');
      mockedFolderService.updateFolderStatus.mockRejectedValue(error);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      await act(async () => {
        try {
          await result.current.deactivateFolder(mockFolder.id);
        } catch (thrownError) {
          expect(thrownError).toBe(error);
        }
      });
    });

    it('should handle deactivate error with object containing message', async () => {
      const error = {message: 'Custom deactivate error'};
      mockedFolderService.updateFolderStatus.mockRejectedValue(error);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      await act(async () => {
        try {
          await result.current.deactivateFolder(mockFolder.id);
        } catch (thrownError) {
          expect(thrownError).toBe(error);
        }
      });
    });

    it('should handle deactivate error with non-object error', async () => {
      mockedFolderService.updateFolderStatus.mockRejectedValue('String error');

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      await act(async () => {
        try {
          await result.current.deactivateFolder(mockFolder.id);
        } catch (thrownError) {
          expect(thrownError).toEqual(new Error('Failed to deactivate folder'));
        }
      });
    });
  });

  describe('toggleFolderStatus', () => {
    it('should successfully toggle folder from active to inactive', async () => {
      // Initial folder state
      const initialFolders = [mockFolder];
      mockedFolderService.getFolders.mockResolvedValue(initialFolders);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.folders).toEqual(initialFolders);
      });

      // Setup toggle response
      const updatedFolder = {...mockFolder, active: false};
      mockedFolderService.updateFolderStatus.mockResolvedValue(updatedFolder);

      // Perform toggle
      let resultFolder: Folder | undefined;
      await act(async () => {
        resultFolder = await result.current.toggleFolderStatus(mockFolder.id);
      });

      // Verify service call
      expect(mockedFolderService.updateFolderStatus).toHaveBeenCalledWith(
        mockSessionRef,
        mockFolder.id,
        false
      );

      // Verify state updates
      expect(resultFolder).toEqual(updatedFolder);
      expect(result.current.processingFolderId).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.folders[0].active).toBe(false);
    });

    it('should successfully toggle folder from inactive to active', async () => {
      // Initial folder state with inactive folder
      const inactiveFolder = {...mockFolder, active: false};
      mockedFolderService.getFolders.mockResolvedValue([inactiveFolder]);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.folders).toEqual([inactiveFolder]);
      });

      // Setup toggle response
      const activatedFolder = {...inactiveFolder, active: true};
      mockedFolderService.updateFolderStatus.mockResolvedValue(activatedFolder);

      // Perform toggle
      let resultFolder: Folder | undefined;
      await act(async () => {
        resultFolder = await result.current.toggleFolderStatus(inactiveFolder.id);
      });

      // Verify service call
      expect(mockedFolderService.updateFolderStatus).toHaveBeenCalledWith(
        mockSessionRef,
        inactiveFolder.id,
        true
      );

      // Verify state updates
      expect(resultFolder).toEqual(activatedFolder);
      expect(result.current.processingFolderId).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.folders[0].active).toBe(true);
    });

    it('should throw error when folder is not found', async () => {
      // Initial state with no folders
      mockedFolderService.getFolders.mockResolvedValue([]);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.folders).toEqual([]);
      });

      // Attempt to toggle non-existent folder
      await act(async () => {
        try {
          await result.current.toggleFolderStatus('non-existent-id');
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Folder with ID non-existent-id not found');
        }
      });

      // Verify state is cleaned up
      expect(result.current.processingFolderId).toBeNull();
      expect(mockedFolderService.updateFolderStatus).not.toHaveBeenCalled();
    });

    it('should handle service error and clean up state', async () => {
      // Initial folder state
      mockedFolderService.getFolders.mockResolvedValue([mockFolder]);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.folders).toEqual([mockFolder]);
      });

      // Setup error response
      const error = new Error('Update failed');
      mockedFolderService.updateFolderStatus.mockRejectedValue(error);

      // Attempt toggle
      await act(async () => {
        try {
          await result.current.toggleFolderStatus(mockFolder.id);
          fail('Should have thrown an error');
        } catch (thrownError) {
          expect(thrownError).toBe(error);
        }
      });

      // Verify state is cleaned up
      expect(result.current.processingFolderId).toBeNull();
      expect(result.current.error).toBeNull();
      // Original folder state should be unchanged
      expect(result.current.folders[0].active).toBe(mockFolder.active);
    });

    it('should handle non-Error object service error', async () => {
      // Initial folder state
      mockedFolderService.getFolders.mockResolvedValue([mockFolder]);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.folders).toEqual([mockFolder]);
      });

      // Setup string error
      mockedFolderService.updateFolderStatus.mockRejectedValue('Service error');

      // Attempt toggle
      await act(async () => {
        try {
          await result.current.toggleFolderStatus(mockFolder.id);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toEqual(new Error('Failed to toggle folder status'));
        }
      });

      // Verify state is cleaned up
      expect(result.current.processingFolderId).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.folders[0].active).toBe(mockFolder.active);
    });

    it('should preserve other folders state during toggle', async () => {
      // Initial state with multiple folders
      const folder1 = mockFolder;
      const folder2 = {...mockFolder, id: 'folder-2', path: '/path2'};
      const initialFolders = [folder1, folder2];

      mockedFolderService.getFolders.mockResolvedValue(initialFolders);

      const {result} = renderHook(() => {
        return useFolders({sessionRef: mockSessionRef, includeInactive: false});
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.folders).toEqual(initialFolders);
      });

      // Setup toggle response for folder1
      const updatedFolder1 = {...folder1, active: false};
      mockedFolderService.updateFolderStatus.mockResolvedValue(updatedFolder1);

      // Toggle folder1
      await act(async () => {
        await result.current.toggleFolderStatus(folder1.id);
      });

      // Verify folder2 remains unchanged
      const unchangedFolder = result.current.folders.find((f) => {
        return f.id === folder2.id;
      });
      expect(unchangedFolder).toEqual(folder2);
    });
  });

  describe('effect dependencies', () => {
    it('should refetch folders when sessionRef changes', async () => {
      mockedFolderService.getFolders.mockResolvedValue(mockFolders);

      const {result, rerender} = renderHook(
        ({sessionRef}) => {
          return useFolders({sessionRef, includeInactive: false});
        },
        {initialProps: {sessionRef: mockSessionRef}}
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Change sessionRef
      const newSessionRef = {...mockSessionRef, headerValue: 'new-value'};
      rerender({sessionRef: newSessionRef});

      // Wait for the second fetch to complete
      await waitFor(() => {
        expect(mockedFolderService.getFolders).toHaveBeenCalledTimes(2);
      });
      expect(mockedFolderService.getFolders).toHaveBeenLastCalledWith(newSessionRef, false);
    });
  });
});