import {translate} from '@ps-refarch-ux/mfe-utils';
import {
  NeonButton,
  NeonCardStandard,
  NeonCheckboxSingle,
  NeonModalDialog,
  NeonPageHeader
} from '@ps-refarch-ux/neon';
import React, {useState} from 'react';
import {Folder, FolderListPageProps} from '../types/folder-types';
import NavigationTabs from '../components/NavigationTabs';
import ToastNotification from '../components/ToastNotification';
import ConfirmationModal from '../components/ConfirmationModal';
import FolderForm from '../components/FolderForm';
import FolderTable from '../components/FolderTable';
import useFolders from '../hooks/useFolders';
import useProducts from '../hooks/useProducts';
import useToast from '../hooks/useToast';

export function FolderListPage({sessionRef}: FolderListPageProps): React.ReactElement {
  // State for UI controls
  const [showInactiveFolders, setShowInactiveFolders] = useState<boolean>(false);
  const [currentTab] = useState<string>('folders-tab');

  // Form fields
  const [folderUse, setFolderUse] = useState<string>('');
  const [folderPath, setFolderPath] = useState<string>('');
  const [folderProductCode, setFolderProductCode] = useState<string>('');
  const [folderAccessType, setFolderAccessType] = useState<string>('inbound');
  const [availableUses, setAvailableUses] = useState<Array<{name: string}>>([]);
  const [errors, setErrors] = useState<{
    use?: string;
    path?: string;
    productCode?: string;
    accessType?: string;
  }>({});

  // Form validation
  const isFormValid = (): boolean => {
    if (!folderProductCode || !folderPath || !folderAccessType) {
      return false;
    }
    // Only validate use if product has uses
    if (availableUses.length > 0 && !folderUse) {
      return false;
    }
    return true;
  };

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  // Custom hooks
  const {
    folders,
    loading: foldersLoading,
    error: foldersError,
    processingFolderId,
    hasInitialized,
    refetchFolders,
    createFolder,
    updateFolder,
    deactivateFolder,
    toggleFolderStatus
  } = useFolders({
    sessionRef,
    includeInactive: showInactiveFolders
  });

  const {
    products,
    loading: productsLoading,
    error: productsError,
    fetchProducts
  } = useProducts(sessionRef);

  const {toast, showToast, hideToast} = useToast();

  // UI state
  const [saving, setSaving] = useState<boolean>(false);
  const loading = foldersLoading || productsLoading;
  const error = foldersError || productsError;

  // Smart retry function that calls the appropriate endpoint based on error source
  const handleRetry = async (): Promise<void> => {
    try {
      if (productsError && !foldersError) {
        await fetchProducts();
      } else if (foldersError && !productsError) {
        await refetchFolders();
      } else if (productsError && foldersError) {
        // If both have errors, retry both in parallel for better performance
        await Promise.all([fetchProducts(), refetchFolders()]);
      }
    } catch (err) {
      // Handle any errors during retry
      console.error('Error during retry:', err);
    }
  };

  const handleCreateFolder = (): void => {
    // Reset form fields
    setFolderUse('');
    setFolderPath('');
    setFolderProductCode('');
    setFolderAccessType('inbound');
    setAvailableUses([]);
    setShowCreateModal(true);
  };

  const handleEditFolder = (folder: Folder): void => {
    setCurrentFolder(folder);
    setFolderUse(folder.use);
    setFolderPath(folder.path);
    setFolderProductCode(folder.productCode);
    setFolderAccessType(folder.accessType);

    // Set available uses based on the product
    const selectedProduct = products.find((p) => { return p.code === folder.productCode; });
    if (selectedProduct?.uses) {
      setAvailableUses(selectedProduct.uses);
    } else {
      setAvailableUses([]);
    }

    setShowEditModal(true);
  };

  const handleDeactivateFolder = (folder: Folder): void => {
    setCurrentFolder(folder);
    setShowDeleteModal(true);
  };

  const handleToggleFolderStatus = async (folder: Folder): Promise<void> => {
    try {
      await toggleFolderStatus(folder.id);

      // Show success toast notification
      showToast(
        folder.active
          ? translate('powerschoolftp.folder_successfully_deactivated')
          : translate('powerschoolftp.folder_successfully_activated'),
        'success'
      );
    } catch (err) {
      // Show error toast notification
      if (err && typeof err === 'object' && 'message' in err) {
        showToast(err.message as string, 'error');
      } else {
        showToast(translate('powerschoolftp.failed_to_update_folder'), 'error');
      }
    }
  };

  const submitCreateFolder = async (): Promise<void> => {
    setSaving(true);

    // Clear previous errors
    setErrors({});

    // Validate form
    const newErrors: {[key: string]: string} = {};
    let hasErrors = false;

    if (!folderUse && availableUses.length > 0) {
      newErrors.use = translate('powerschoolftp.folder_use_is_required');
      hasErrors = true;
    }
    if (!folderPath) {
      newErrors.path = translate('powerschoolftp.folder_path_is_required');
      hasErrors = true;
    }
    if (!folderAccessType) {
      newErrors.accessType = translate('powerschoolftp.access_type_is_required');
      hasErrors = true;
    }

    if (hasErrors) {
      setErrors(newErrors);
      setSaving(false);
      return;
    }

    try {
      await createFolder({
        use: folderUse,
        path: folderPath,
        productCode: folderProductCode,
        accessType: folderAccessType
      });

      setShowCreateModal(false);
      showToast(translate('powerschoolftp.folder_successfully_created'), 'success');
    } catch (err) {
      const apiError = err as {message?: string; field?: string} | Error;
      const errorMessage = 'message' in apiError && apiError.message
        ? apiError.message
        : translate('powerschoolftp.failed_to_create_folder._please_try_again');

      // Handle field-specific errors from API
      if ('field' in apiError && apiError.field) {
        setErrors({
          ...errors,
          [apiError.field]: errorMessage
        });
      } else if (errorMessage.toLowerCase().includes('path already exists')) {
        setErrors({
          ...errors,
          path: translate('powerschoolftp.duplicate_folder_path')
        });
      } else {
        showToast(errorMessage, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const submitEditFolder = async (): Promise<void> => {
    if (!currentFolder) { return; }

    setSaving(true);

    // Clear previous errors
    setErrors({});

    // Validate form
    const newErrors: {[key: string]: string} = {};
    let hasErrors = false;

    if (!folderProductCode) {
      newErrors.productCode = translate('powerschoolftp.product_code_is_required');
      hasErrors = true;
    }
    if (!folderUse && folderProductCode && availableUses.length > 0) {
      newErrors.use = translate('powerschoolftp.folder_use_is_required');
      hasErrors = true;
    }
    if (!folderPath) {
      newErrors.path = translate('powerschoolftp.folder_path_is_required');
      hasErrors = true;
    }
    if (!folderAccessType) {
      newErrors.accessType = translate('powerschoolftp.access_type_is_required');
      hasErrors = true;
    }

    if (hasErrors) {
      setErrors(newErrors);
      setSaving(false);
      return;
    }

    try {
      await updateFolder(currentFolder.id, {
        use: folderUse,
        path: folderPath,
        accessType: folderAccessType
      });

      setShowEditModal(false);
      setErrors({});
      showToast(translate('powerschoolftp.folder_successfully_updated'), 'success');
    } catch (err) {
      const apiError = err as {message?: string; field?: string} | Error;
      const errorMessage = 'message' in apiError && apiError.message
        ? apiError.message
        : translate('powerschoolftp.Failed to update folder');

      // Handle field-specific errors from API
      if ('field' in apiError && apiError.field) {
        setErrors({
          ...errors,
          [apiError.field]: errorMessage
        });
      } else if (errorMessage.toLowerCase().includes('path already exists')) {
        setErrors({
          ...errors,
          path: translate('powerschoolftp.duplicate_folder_path')
        });
      } else {
        showToast(errorMessage, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const submitDeactivateFolder = async (): Promise<void> => {
    if (!currentFolder) { return; }

    setSaving(true);
    setDeactivateError(null);

    try {
      await deactivateFolder(currentFolder.id);
      setShowDeleteModal(false);
      showToast(translate('powerschoolftp.folder_successfully_deactivated'), 'success');
    } catch (err) {
      setDeactivateError(err instanceof Error ? err.message : translate('powerschoolftp.failed_to_deactivate_folder._please_try_again'));
    } finally {
      setSaving(false);
    }
  };

  const getProductName = (productCode: string): string => {
    const product = products.find((p) => { return p.code === productCode; });
    return product ? product.name : productCode;
  };

  return (
    <div className="__neon__layout">
      <NeonPageHeader
        dataHeading={translate('powerschoolftp.folder_administration')}
        dataSubheading={translate('powerschoolftp.manage_ftp_folders_and_their_paths')}
      >
        <div data-slot="page-header-right">
          <NeonButton
            id="create-folder-button"
            dataText={translate('powerschoolftp.new_folder')}
            dataIcon="add"
            dataType="primary"
            onClick={handleCreateFolder}
          />
        </div>
      </NeonPageHeader>

      <div className="__neon__page-padding">
        <div className="__neon__layout">
          <div className="__neon__layout">
            {/* Navigation tabs */}
            <NavigationTabs currentTab={currentTab} sessionRef={sessionRef} />

            <div className="__neon__wrapper" data-gap="medium" style={{marginTop: '16px', marginBottom: '16px'}}>
              <NeonCheckboxSingle
                id="show-inactive-folders-toggle"
                dataLabelText={translate('powerschoolftp.show_inactive_folders')}
                dataCheckType="toggle"
                value={showInactiveFolders}
                onInput={(event: any): void => {
                  setShowInactiveFolders(event.target.checked);
                }}
              />
            </div>
          </div>

          <NeonCardStandard
            dataFullHeight="true"
            dataInjectionSpacing="false"
          >
            <div data-slot="body" className="__neon__layout __neon__card-standard-body __neon__flush-left __neon__flush-right">
              <div className="__neon__layout-scrollable __neon__layout __neon__card-standard-body __neon__flush-top __neon__flush-bottom">
                <FolderTable
                  folders={folders}
                  loading={loading}
                  error={error}
                  processingFolderId={processingFolderId}
                  showInactiveFolders={showInactiveFolders}
                  hasInitialized={hasInitialized}
                  onEditFolder={handleEditFolder}
                  onDeactivateFolder={handleDeactivateFolder}
                  onToggleFolderStatus={handleToggleFolderStatus}
                  getProductName={getProductName}
                  retryFunction={handleRetry}
                />
              </div>
            </div>
          </NeonCardStandard>
        </div>
      </div>

      {/* Create Folder Modal */}
      {showCreateModal && (
        <NeonModalDialog
          id="create-folder-modal"
          dataAnimate="true"
          neonDialogHasClosed={(): void => {
            setShowCreateModal(false);
            // Reset form and errors
            setErrors({});
            setFolderUse('');
            setFolderPath('');
            setFolderProductCode('');
            setFolderAccessType('inbound');
            setAvailableUses([]);
          }}
        >
          <div data-slot="dialog-header-title">{translate('powerschoolftp.create_new_folder')}</div>
          <div data-slot="dialog-body">
            <FolderForm
              use={folderUse}
              setUse={setFolderUse}
              path={folderPath}
              setPath={setFolderPath}
              productCode={folderProductCode}
              setProductCode={(value): void => {
                setFolderProductCode(value);
                // Update available uses based on the selected product
                const selectedProduct = products.find((p) => { return p.code === value; });
                if (selectedProduct?.uses) {
                  setAvailableUses(selectedProduct.uses);
                } else {
                  setAvailableUses([]);
                }
              }}
              accessType={folderAccessType}
              setAccessType={setFolderAccessType}
              products={products}
              availableUses={availableUses}
              errors={errors}
            />
          </div>
          <div data-slot="dialog-footer-content">
            <div className="__neon__button-layout">
              <NeonButton
                id="cancel-create-folder"
                dataText={translate('powerschoolftp.cancel')}
                dataType="secondary"
                disabled={saving}
                onClick={(): void => {
                  setShowCreateModal(false);
                }}
              />
              <NeonButton
                id="submit-create-folder"
                dataText={translate('powerschoolftp.create')}
                dataType="primary"
                dataIsLoading={saving}
                disabled={!isFormValid()}
                onClick={submitCreateFolder}
              />
            </div>
          </div>
        </NeonModalDialog>
      )}

      {/* Edit Folder Modal */}
      {showEditModal && currentFolder && (
        <NeonModalDialog
          id="edit-folder-modal"
          dataAnimate="true"
          neonDialogHasClosed={(): void => {
            setShowEditModal(false);
          }}
        >
          <div data-slot="dialog-header-title">{translate('powerschoolftp.edit_folder')}</div>
          <div data-slot="dialog-body">
            <FolderForm
              use={folderUse}
              setUse={setFolderUse}
              path={folderPath}
              setPath={setFolderPath}
              productCode={folderProductCode}
              setProductCode={(): void => {
                // Product code cannot be changed in edit mode
              }}
              accessType={folderAccessType}
              setAccessType={setFolderAccessType}
              products={products}
              availableUses={availableUses}
              productReadOnly={true}
              errors={errors}
            />
          </div>
          <div data-slot="dialog-footer-content">
            <div className="__neon__button-layout">
              <NeonButton
                id="cancel-edit-folder"
                dataText={translate('powerschoolftp.cancel')}
                dataType="secondary"
                disabled={saving}
                onClick={(): void => {
                  setShowEditModal(false);
                }}
              />
              <NeonButton
                id="submit-edit-folder"
                dataText={translate('powerschoolftp.save')}
                dataType="primary"
                dataIsLoading={saving}
                disabled={!isFormValid()}
                onClick={submitEditFolder}
              />
            </div>
          </div>
        </NeonModalDialog>
      )}

      {/* Deactivate Folder Confirmation Modal */}
      {showDeleteModal && currentFolder && (
        <ConfirmationModal
          id="deactivate-folder-modal"
          show={showDeleteModal}
          title={translate('powerschoolftp.deactivate_folder')}
          message={deactivateError || translate('powerschoolftp.are_you_sure_you_want_to_deactivate_the_folder', {path: currentFolder.path})}
          confirmText={translate('powerschoolftp.deactivate')}
          cancelText={translate('powerschoolftp.cancel')}
          onConfirm={submitDeactivateFolder}
          onCancel={(): void => {
            setShowDeleteModal(false);
            setDeactivateError(null);
          }}
          isLoading={saving}
        />
      )}

      {/* Toast notification */}
      <ToastNotification
        id="folder-action-toast"
        show={toast.show}
        message={toast.message}
        type={toast.type}
        datetime={toast.datetime}
        onClose={hideToast}
      />
    </div>
  );
}