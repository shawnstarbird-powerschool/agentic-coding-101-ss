/* eslint-disable object-curly-spacing */
import {translate} from '@ps-refarch-ux/mfe-utils';
import {
  NeonButtonFooter,
  NeonCardStandard,
  NeonFullPageSkeleton,
  NeonPageHeader
} from '@ps-refarch-ux/neon';
import React, {useState, useRef, useEffect} from 'react';
import {PasswordGenerator} from '../components/PasswordGenerator';
import UserForm from '../components/UserForm';
import {ftpNavigate} from '../shared/nav-utils';
import {CreateUserPageProps} from '../types/user-types';
import NavigationTabs from '../components/NavigationTabs';
import ToastNotification from '../components/ToastNotification';
import ConfirmationModal from '../components/ConfirmationModal';
import ErrorBoundary from '../components/ErrorBoundary';
import useUsers from '../hooks/useUsers';
import useProducts from '../hooks/useProducts';
import useToast from '../hooks/useToast';

export function CreateUserPage({sessionRef}: CreateUserPageProps): React.ReactElement {
  // Form fields
  const [username, setUsername] = useState<string>('');
  const [authType, setAuthType] = useState<string>('');
  const [pendingAuthType, setPendingAuthType] = useState<string>('');
  const [access, setAccess] = useState<string>('');
  const [productCode, setProductCode] = useState<string>('');
  const [selectedFolders, setSelectedFolders] = useState<Array<string>>([]);
  const selectedFoldersRef = useRef<Array<string>>([]);
  const [ipWhitelist, setIpWhitelist] = useState<string>('');
  const [currentTab] = useState<string>('users-tab');

  // Password handling
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [redactedPassword, setRedactedPassword] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // SSH key
  const [sshKey, setSSHKey] = useState<string>('');
  const [redactedSSHKey, setRedactedSSHKey] = useState<string>('');

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);

  // Custom hooks
  const {
    loading: userLoading,
    addUser
  } = useUsers(sessionRef);

  const {
    products,
    loading: productsLoading,
    error: productsError,
    getFolderOptions
  } = useProducts(sessionRef);

  const {toast, showToast, hideToast} = useToast();

  // UI state
  const [saving, setSaving] = useState<boolean>(false);
  const loading = userLoading || productsLoading;
  const error = productsError;

  // Keep ref in sync with state to avoid stale closures
  useEffect(() => {
    selectedFoldersRef.current = selectedFolders;
  }, [selectedFolders]);

  // Dirty check
  const isDirty = (): boolean => {
    return (
      !!username ||
      !!authType ||
      !!access ||
      !!productCode ||
      selectedFolders.length > 0 ||
      !!ipWhitelist.trim() ||
      (!!authType && authType.toLowerCase() === 'password' && !!password) ||
      (!!authType && authType.toLowerCase() === 'ssh key' && !!sshKey)
    );
  };


  // Handle SSH key change
  const handleSSHKeyChange = (newSSHKey: string): void => {
    setSSHKey(newSSHKey);
    setAuthType(pendingAuthType);
    // Show indication of public key
    setRedactedSSHKey('ssh-rsa ***');
    setRedactedPassword(''); // Clear password if switching from password
  };

  // Handle auth type reset
  const handleAuthTypeReset = (): void => {
    setPendingAuthType(authType);
  };

  // Handle form submission
  const handleSubmit = async (): Promise<void> => {
    // Set saving state to true to show loading indicator
    setSaving(true);

    // Validate form
    // Collect missing required fields
    const missingFields: Array<string> = [];
    if (!username) { missingFields.push('Username'); }
    if (!authType) { missingFields.push('Authentication Type'); }
    if (authType === 'Password' && !password) { missingFields.push('Password'); }
    if (authType === 'SSH key' && !sshKey) { missingFields.push('SSH Key'); }
    if (!access) { missingFields.push('Access'); }
    if (!productCode) { missingFields.push('Product'); }
    // Use ref to ensure we're checking the current value
    const currentFolders = selectedFoldersRef.current;
    if (!currentFolders || currentFolders.length === 0) { missingFields.push('Folders'); }

    if (missingFields.length > 0) {
      const firstMissingField = missingFields[0];
      showToast(translate('powerschoolftp.field_is_required', { field: firstMissingField }), 'error');
      setSaving(false);
      return;
    }

    // Process IP whitelist - convert from textarea string to array
    const processedIpWhitelist = ipWhitelist.trim()
      ? ipWhitelist.split(/[\n,]+/).map((ip) => {
          return ip.trim();
        }).filter((ip) => {
          return ip;
        })
      : [];

    // Map the UI auth type to the exact required values
    const mappedAuthType = authType === 'Password' ? 'password' : 'SSH key';

    // Prepare user data for creation
    const userData: any = {
      username,
      authenticationType: mappedAuthType, // Use the exact required values: 'password' or 'SSH key'
      access,
      productCode,
      folders: currentFolders, // Use the current value from ref
      ipWhitelist: processedIpWhitelist // Always send as array
    };

    // Only include credentials if they were explicitly accepted in the modal
    if (authType === 'Password' && password) {
      userData.password = password;
    } else if (authType === 'SSH key' && sshKey) {
      userData.publicKey = sshKey;
    }

    try {
      // Create the user
      const result = await addUser(userData);
      if (result) {
        setSaving(false);
        // Only navigate on success
        ftpNavigate(sessionRef, 'users?created=1');
      } else {
        // If result is null or undefined, something went wrong
        showToast(translate('powerschoolftp.failed_to_create_user._please_try_again'), 'error');
        setSaving(false);
      }
    } catch (err) {
      // Show error toast
      if (err && typeof err === 'object' && 'message' in err) {
        showToast(err.message as string, 'error');
      } else {
        showToast(translate('powerschoolftp.failed_to_create_user._please_try_again'), 'error');
      }
      setSaving(false);
    }
  };

  return (
    <div className="__neon__layout">
      <NeonPageHeader
        dataHeading={translate('powerschoolftp.create_user')}
        dataSubheading={translate('powerschoolftp.create_a_new_ftp_user_account')}
      />

      <div className="__neon__page-padding">
        <div className="__neon__layout">
          {/* Navigation tabs */}
          <NavigationTabs currentTab={currentTab} sessionRef={sessionRef} />

          <ErrorBoundary>
            <NeonCardStandard dataFullHeight="true" dataInjectionSpacing="false">
              <div data-slot="body" className="__neon__layout __neon__card-standard-body">
                {loading ? (
                  <NeonFullPageSkeleton dataType="table-tiles" />
                ) : error ? (
                  <p className="__neon__text __neon__text-error">{error}</p>
                ) : (
                  <div className="__neon__form">
                    <UserForm
                      username={username}
                      setUsername={setUsername}
                      authType={authType}
                      setAuthType={setAuthType}
                      pendingAuthType={pendingAuthType}
                      setPendingAuthType={setPendingAuthType}
                      access={access}
                      setAccess={setAccess}
                      productCode={productCode}
                      setProductCode={setProductCode}
                      selectedFolders={selectedFolders}
                      setSelectedFolders={setSelectedFolders}
                      ipWhitelist={ipWhitelist}
                      setIpWhitelist={setIpWhitelist}
                      redactedPassword={redactedPassword}
                      redactedSSHKey={redactedSSHKey}
                      handleSSHKeyChange={handleSSHKeyChange}
                      handleAuthTypeReset={handleAuthTypeReset}
                      setShowPasswordModal={setShowPasswordModal}
                      products={products}
                      getFolderOptions={getFolderOptions}
                    />
                  </div>
                )}
              </div>
              {!loading && (
                <div data-slot="footer-full-width">
                  <NeonButtonFooter
                    id="create-user-footer"
                    buttons={[
                      {
                        id: 'cancel-button',
                        text: translate('powerschoolftp.cancel'),
                        type: 'borderless',
                        disabled: saving,
                        onClick: (): void => {
                          if (isDirty()) {
                            setShowCancelModal(true);
                          } else {
                            ftpNavigate(sessionRef, 'users');
                          }
                        }
                      }
                    ]}
                    primaryButton={{
                      id: 'save-button',
                      text: translate('powerschoolftp.save'),
                      type: 'primary',
                      isLoading: saving,
                      onClick: handleSubmit
                    }}
                  />

                  {/* Toast notification */}
                  <ToastNotification
                    id="create-user-toast"
                    show={toast.show}
                    message={toast.message}
                    type={toast.type}
                    datetime={toast.datetime}
                    onClose={hideToast}
                  />
                </div>
              )}
            </NeonCardStandard>
          </ErrorBoundary>
        </div>
      </div>

      {/* Password Generation Modal */}
      <PasswordGenerator
        showModal={showPasswordModal}
        showStrengthMeter={true}
        onClose={(): void => {
          setShowPasswordModal(false);
          // Reset pending auth type if user closes the modal without accepting
          if (pendingAuthType !== authType) {
            setPendingAuthType(authType);
          }
        }}
        onAccept={(newPassword: string): void => {
          setPassword(newPassword);
          // Create redacted version (first 2 & last 2 characters shown with asterisks in between)
          if (newPassword.length > 4) {
            setRedactedPassword(`${newPassword.substring(0, 2)}****${newPassword.substring(newPassword.length - 2)}`);
          } else {
            setRedactedPassword(newPassword);
          }
          setAuthType(pendingAuthType);
          setRedactedSSHKey(''); // Clear SSH key if switching from SSH key
          setShowPasswordModal(false);
        }}
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        id="cancel-changes-modal"
        show={showCancelModal}
        title={translate('powerschoolftp.confirm_cancel')}
        message={translate('powerschoolftp.are_you_sure_to_cancel_the_changes')}
        confirmText={translate('powerschoolftp.confirm')}
        cancelText={translate('powerschoolftp.cancel')}
        onConfirm={(): void => {
          ftpNavigate(sessionRef, 'users');
        }}
        onCancel={(): void => {
          setShowCancelModal(false);
        }}
      />
    </div>
  );
}
