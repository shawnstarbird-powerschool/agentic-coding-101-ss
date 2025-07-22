/* eslint-disable object-curly-spacing */
import {translate} from '@ps-refarch-ux/mfe-utils';
import {
  NeonButtonFooter,
  NeonCardStandard,
  NeonFullPageSkeleton,
  NeonPageHeader,
  NeonSelectField
} from '@ps-refarch-ux/neon';
import React, {useEffect, useState, useRef} from 'react';
import {useParams} from 'react-router-dom';
import {PasswordGenerator} from '../components/PasswordGenerator';
import UserForm from '../components/UserForm';
import {ftpNavigate} from '../shared/nav-utils';
import {EditUserPageProps} from '../types/user-types';
import NavigationTabs from '../components/NavigationTabs';
import ToastNotification from '../components/ToastNotification';
import ErrorBoundary from '../components/ErrorBoundary';
import useUsers from '../hooks/useUsers';
import useProducts from '../hooks/useProducts';
import useToast from '../hooks/useToast';

export function EditUserPage({sessionRef}: EditUserPageProps): React.ReactElement {
  const {userId} = useParams<{userId: string}>();

  // Form fields
  const [username, setUsername] = useState<string>('');
  const [authType, setAuthType] = useState<string>('');
  const [pendingAuthType, setPendingAuthType] = useState<string>('');
  const [access, setAccess] = useState<string>('');
  const [productCode, setProductCode] = useState<string>('');
  const [selectedFolders, setSelectedFolders] = useState<Array<string>>([]);
  const selectedFoldersRef = useRef<Array<string>>([]);
  const [ipWhitelist, setIpWhitelist] = useState<string>('');
  const [active, setActive] = useState<boolean>(true);
  const [currentTab] = useState<string>('users-tab');

  // Password handling
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [redactedPassword, setRedactedPassword] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // SSH key
  const [sshKey, setSSHKey] = useState<string>('');
  const [redactedSSHKey, setRedactedSSHKey] = useState<string>('');

  // Custom hooks
  const {
    loading: userLoading,
    error: userError,
    fetchUser,
    updateUserData
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
  const error = userError || productsError;

  // Load user data on component mount
  useEffect((): void => {
    if (!userId || !sessionRef || (sessionRef.headerName && !sessionRef.headerValue)) {
      return;
    }

    const loadUserData = async (): Promise<void> => {
      try {
        const user = await fetchUser(userId);
        if (user) {
          // Set form fields
          setUsername(user.username);
          setAuthType(user.authType);
          setAccess(user.access);
          setProductCode(user.productCode);
          setSelectedFolders(user.folders.map((folder): string => {
            return folder.id;
          }));
          setIpWhitelist(user.ipWhitelist && Array.isArray(user.ipWhitelist) ? user.ipWhitelist.join('\n') : '');
          setActive(user.active);

          // Set redacted values for password or SSH key
          if (user.authType === 'Password') {
            // Always show first 2 and last 2 characters for password
            setRedactedPassword('pa****rd');
          } else if (user.authType === 'SSH key') {
            // Show indication of public key
            setRedactedSSHKey('ssh-rsa ***');
          }
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      }
    };

    loadUserData();
  }, [userId, sessionRef, fetchUser]);

  // Keep ref in sync with state to avoid stale closures
  useEffect(() => {
    selectedFoldersRef.current = selectedFolders;
  }, [selectedFolders]);

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
    if (authType === 'Password' && showPasswordModal && !password) { missingFields.push('Password'); }
    if (authType === 'SSH key' && !sshKey) { missingFields.push('SSH Key'); }
    if (!access) { missingFields.push('Access'); }
    if (!productCode) { missingFields.push('Product'); }
    // Use ref to ensure we're checking the current value
    const currentFolders = selectedFoldersRef.current;
    if (!currentFolders || currentFolders.length === 0) { missingFields.push('Folders'); }
    // Add status validation
    if (active === undefined) { missingFields.push('Status'); }

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

    // Prepare user data for update
    const userData: any = {
      username,
      access,
      productCode,
      folders: currentFolders, // Use the current value from ref
      ipWhitelist: processedIpWhitelist, // Always send as array
      active
    };

    // Include authentication type and credentials if they were changed
    if (authType === 'Password') {
      userData.authenticationType = 'password';
      // Only include password if it was changed (password state is not empty)
      if (password) {
        userData.password = password;
      }
    } else if (authType === 'SSH key') {
      userData.authenticationType = 'SSH key';
      // Only include SSH key if it was changed (sshKey state is not empty)
      if (sshKey) {
        userData.publicKey = sshKey;
      }
    }

    try {
      // Update the user
      if (userId) {
        const result = await updateUserData(userId, userData);
        if (result) {
          setSaving(false); // Reset saving state before navigation
          ftpNavigate(sessionRef, 'users');
        } else {
          // If result is null or undefined, something went wrong
          showToast(translate('powerschoolftp.failed_to_update_user._please_try_again'), 'error');
          setSaving(false);
        }
      }
    } catch (err) {
      // Show error toast
      if (err && typeof err === 'object' && 'message' in err) {
        showToast(err.message as string, 'error');
      } else {
        showToast(translate('powerschoolftp.failed_to_update_user._please_try_again'), 'error');
      }
      setSaving(false);
    }
  };

  return (
    <div className="__neon__layout">
      <NeonPageHeader
        dataHeading={translate('powerschoolftp.edit_user')}
        dataSubheading={translate('powerschoolftp.edit_user_with_username', {username: username})}
        dataAvatarFirstName={username ? username.charAt(0).toUpperCase() : ''}
        dataAvatarLastName={username ? ((): string => {
          const parts = username.trim().split(/\s+/);
          return parts.length > 1 ? parts[parts.length - 1].charAt(0).toUpperCase() : '';
        })() : ''}
      />

      <div className="__neon__page-padding">
        <div className="__neon__layout">
          {/* Navigation tabs */}
          <NavigationTabs currentTab={currentTab} sessionRef={sessionRef} />

          <ErrorBoundary>
            <NeonCardStandard
              dataFullHeight="true"
              dataInjectionSpacing="false"
            >
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

                    <NeonSelectField
                      id="status-field"
                      dataIsRequired="true"
                      dataLabelText={translate('powerschoolftp.status')}
                      dataSize="large"
                      modelValue={active ? 'active' : 'inactive'}
                      modelValueChange={(value: string | undefined): void => {
                        if (value) {
                          setActive(value === 'active');
                        }
                      }}
                      options={[
                        {text: translate('powerschoolftp.active'), value: 'active'},
                        {text: translate('powerschoolftp.inactive'), value: 'inactive'}
                      ]}
                    />
                  </div>
                )}
              </div>
              {!loading && (
                <div data-slot="footer-full-width">
                  <NeonButtonFooter
                    id="edit-user-footer"
                    buttons={[
                      {
                        id: 'cancel-button',
                        text: translate('powerschoolftp.cancel'),
                        type: 'borderless',
                        disabled: saving,
                        onClick: (): void => {
                          ftpNavigate(sessionRef, 'users');
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
                    id="edit-user-toast"
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
          setPendingAuthType(authType);
        }}
        onAccept={(newPassword: string): void => {
          setPassword(newPassword);
          // Create redacted version (first 2 & last 2 characters shown with asterisks in between)
          if (newPassword.length > 4) {
            setRedactedPassword(`${newPassword.substring(0, 2)}****${newPassword.substring(newPassword.length - 2)}`);
          } else {
            setRedactedPassword(newPassword);
          }

          // Maintain current auth type if it's already Password
          if (authType !== 'Password') {
            setAuthType('Password');
            // Clean up SSH key if switching from SSH authentication
            setSSHKey('');
            setRedactedSSHKey('');
          }
          setShowPasswordModal(false);
        }}
      />
    </div>
  );
}
