import {translate} from '@ps-refarch-ux/mfe-utils';
import ErrorCard from './ErrorCard/ErrorCard';
import {
  NeonButton,
  NeonFullPageSkeleton,
  NeonTableHeader,
  NeonTag
} from '@ps-refarch-ux/neon';
import React from 'react';
import {Folder} from '../types/folder-types';

interface FolderTableProps {
  folders: Array<Folder>;
  loading: boolean;
  error: string | null;
  processingFolderId: string | null;
  showInactiveFolders: boolean;
  hasInitialized: boolean;
  onEditFolder: (folder: Folder) => void;
  onDeactivateFolder: (folder: Folder) => void;
  onToggleFolderStatus: (folder: Folder) => void;
  getProductName: (productCode: string) => string;
  retryFunction: () => Promise<void>;
}

export default function FolderTable({
  folders,
  loading,
  error,
  processingFolderId,
  showInactiveFolders,
  hasInitialized,
  onEditFolder,
  onDeactivateFolder,
  onToggleFolderStatus,
  getProductName,
  retryFunction
}: FolderTableProps): React.ReactElement {
  // Helper function to translate access type values
  const getAccessTypeDisplay = (accessType: string): string => {
    if (accessType === 'inbound') {
      return translate('powerschoolftp.inbound');
    } else if (accessType === 'outbound') {
      return translate('powerschoolftp.outbound');
    }
    return accessType;
  };

  if (loading) {
    return <NeonFullPageSkeleton dataType="table" />;
  }

  if (error) {
    return (
      <ErrorCard
        errorText={error}
        dataIllustration="general-error"
        actionButton={{
          text: translate('powerschoolftp.retry'),
          onClick: retryFunction
        }}
      />
    );
  }

  if (hasInitialized && folders.length === 0) {
    return (
      <ErrorCard
        errorText={translate('powerschoolftp.no_folders_found')}
        dataIllustration="paper-airplane"
      />
    );
  }

  return (
    <table className="__neon__table-full-width __neon__table-on-white-background __neon__table-simple __neon__table-responsive-container-md">
      <thead>
        <tr>
          <th>
            <NeonTableHeader
              id="product-column"
              dataText={translate('powerschoolftp.product')}
            />
          </th>
          <th>
            <NeonTableHeader
              id="use-column"
              dataText={translate('powerschoolftp.type')}
            />
          </th>
          <th>
            <NeonTableHeader
              id="path-column"
              dataText={translate('powerschoolftp.directory')}
            />
          </th>
          <th>
            <NeonTableHeader
              id="access-type-column"
              dataText={translate('powerschoolftp.access')}
            />
          </th>
          {showInactiveFolders && (
            <th>
              <NeonTableHeader
                id="status-column"
                dataText={translate('powerschoolftp.status')}
              />
            </th>
          )}
          <th>
            <NeonTableHeader
              id="actions-column"
              dataText={translate('powerschoolftp.actions')}
            />
          </th>
        </tr>
      </thead>
      <tbody>
        {folders.map((folder): React.ReactElement => {
          const isActive = folder.active !== false;
          return (
            <tr key={folder.id}>
              <td data-label={translate('powerschoolftp.product')}>{getProductName(folder.productCode)}</td>
              <td data-label={translate('powerschoolftp.use')}>{folder.use}</td>
              <td data-label={translate('powerschoolftp.path')}>{folder.path}</td>
              <td data-label={translate('powerschoolftp.access_type')}>{getAccessTypeDisplay(folder.accessType)}</td>
              {showInactiveFolders && (
                <td data-label={translate('powerschoolftp.status')}>
                  <NeonTag
                    dataText={isActive ? translate('powerschoolftp.active') : translate('powerschoolftp.inactive')}
                    dataType={isActive ? 'green' : 'red'}
                  />
                </td>
              )}
              <td data-label={translate('powerschoolftp.actions')}>
                <div className="__neon__wrapper" data-gap="small">
                  <NeonButton
                    id={`edit-folder-${folder.id}`}
                    dataText={translate('powerschoolftp.edit')}
                    dataType="secondary"
                    onClick={(): void => {
                      onEditFolder(folder);
                    }}
                  />
                  <NeonButton
                    id={`toggle-folder-${folder.id}`}
                    dataText={isActive
                      ? translate('powerschoolftp.deactivate')
                      : translate('powerschoolftp.activate')}
                    dataType="secondary"
                    dataIsLoading={processingFolderId === folder.id}
                    onClick={(): void => {
                      if (isActive) {
                        // For deactivation, use the confirmation modal
                        onDeactivateFolder(folder);
                      } else {
                        // For activation, proceed directly
                        onToggleFolderStatus(folder);
                      }
                    }}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}