/* eslint-disable object-curly-spacing */
import {formatDate, translate} from '@ps-refarch-ux/mfe-utils';
import ErrorCard from '../components/ErrorCard/ErrorCard';
import {
  NeonButton,
  NeonCardStandard,
  NeonCheckboxSingle,
  NeonEllipsis,
  NeonFullPageSkeleton,
  NeonPageHeader,
  NeonTableHeader,
  NeonTag
} from '@ps-refarch-ux/neon';
import React, {useState} from 'react';
import {ftpNavigate} from '../shared/nav-utils';
import {UserListPageProps} from '../types/user-types';
import NavigationTabs from '../components/NavigationTabs';
import ToastNotification from '../components/ToastNotification';
import ConfirmationModal from '../components/ConfirmationModal';
import useUsers from '../hooks/useUsers';
import useToast from '../hooks/useToast';

export function UserListPage({sessionRef}: UserListPageProps): React.ReactElement {
  // State for UI controls
  const [showInactiveUsers, setShowInactiveUsers] = useState<boolean>(false);
  const [currentTab] = useState<string>('users-tab');

  // Custom hooks
  const {
    users,
    loading,
    error,
    processingUserId,
    hasInitialized,
    fetchUsers,
    toggleUserStatus
  } = useUsers(sessionRef, showInactiveUsers);

  const {toast, showToast, hideToast} = useToast();

  // Confirmation modal state
  const [showDeactivateModal, setShowDeactivateModal] = useState<boolean>(false);
  const [userToDeactivate, setUserToDeactivate] = useState<{id: string; username: string} | null>(null);

  // Show toast if navigated from CreateUserPage with ?created=1
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('created') === '1') {
      showToast(translate('powerschoolftp.user_created_successfully'), 'success');
      params.delete('created');
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [showToast]);


  // Handler for showing deactivate confirmation modal
  const handleShowDeactivateModal = (userId: string, username: string, isActive: boolean): void => {
    if (isActive) {
      // Only show confirmation for deactivation, not activation
      setUserToDeactivate({id: userId, username});
      setShowDeactivateModal(true);
    } else {
      // For activation, proceed directly
      handleInactivateUser(userId);
    }
  };

  const handleInactivateUser = async (userId: string): Promise<void> => {
    try {
      await toggleUserStatus(userId);

      // Find the user to determine if it was activated or deactivated
      const user = users.find((u) => {
        return u.id === userId;
      });

      // Show success toast notification
      if (user) {
        showToast(
          user.active
            ? translate('powerschoolftp.user_successfully_deactivated')
            : translate('powerschoolftp.user_successfully_activated'),
          'success'
        );
      }
    } catch (err) {
      // Show error toast notification
      if (err && typeof err === 'object' && 'message' in err) {
        showToast(err.message as string, 'error');
      } else {
        showToast(translate('powerschoolftp.failed_to_update_user'), 'error');
      }
    }
  };

  // Helper function to translate authentication type values
  const getAuthTypeDisplay = (authType: string): string => {
    if (authType === 'Password' || authType === 'password') {
      return translate('powerschoolftp.password');
    } else if (authType === 'SSH key') {
      return translate('powerschoolftp.ssh_key');
    }
    return authType;
  };

  // Helper function to translate access type values
  const getAccessDisplay = (access: string): string => {
    if (access === 'read') {
      return translate('powerschoolftp.read');
    } else if (access === 'write') {
      return translate('powerschoolftp.write');
    } else if (access === 'readwrite') {
      return translate('powerschoolftp.read/write');
    }
    return access;
  };

  // Filter users to only show active ones unless showInactiveUsers is true
  const filteredUsers = users.filter((user): boolean => {
    return showInactiveUsers || user.active;
  });

  return (
    <div className="__neon__layout">
      <NeonPageHeader
        dataHeading={translate('powerschoolftp.user_administration')}
        dataSubheading={translate('powerschoolftp.manage_ftp_users_and_their_access_permissions')}
      >
        <div data-slot="page-header-right">
          <NeonButton
            id="create-user-button"
            dataText={translate('powerschoolftp.new_user')}
            dataIcon="add"
            dataType="primary"
            onClick={(): void => {
              // Navigate to create user page
              ftpNavigate(sessionRef, 'users/create');
            }}
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
                id="show-inactive-users-toggle"
                dataLabelText={translate('powerschoolftp.show_inactive_users')}
                dataCheckType="toggle"
                value={showInactiveUsers}
                onInput={(event: any): void => {
                  setShowInactiveUsers(event.target.checked);
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
                {loading ? (
                  <NeonFullPageSkeleton dataType="table" />
                ) : error ? (
                  <ErrorCard
                    errorText={error}
                    dataIllustration="general-error"
                    actionButton={{
                      text: translate('powerschoolftp.retry'),
                      onClick: fetchUsers
                    }}
                  />
                ) : hasInitialized && filteredUsers.length === 0 ? (
                  <ErrorCard
                    errorText={translate('powerschoolftp.no_users_found')}
                    dataIllustration="paper-airplane"
                  />
                ) : (
                  <table className="__neon__table-full-width __neon__table-on-white-background __neon__table-simple __neon__table-responsive-container-md">
                    <thead>
                      <tr>
                        <th>
                          <NeonTableHeader
                            id="username-column"
                            dataText={translate('powerschoolftp.username')}
                          />
                        </th>
                        <th>
                          <NeonTableHeader
                            id="auth-type-column"
                            dataText={translate('powerschoolftp.auth_type')}
                          />
                        </th>
                        <th>
                          <NeonTableHeader
                            id="access-column"
                            dataText={translate('powerschoolftp.access')}
                          />
                        </th>
                        <th>
                          <NeonTableHeader
                            id="product-column"
                            dataText={translate('powerschoolftp.product')}
                          />
                        </th>
                        <th>
                          <NeonTableHeader
                            id="folders-column"
                            dataText={translate('powerschoolftp.folders')}
                          />
                        </th>
                        <th>
                          <NeonTableHeader
                            id="ip-whitelist-column"
                            dataText={translate('powerschoolftp.ip_whitelist')}
                          />
                        </th>
                        <th>
                          <NeonTableHeader
                            id="last-login-column"
                            dataText={translate('powerschoolftp.last_login')}
                          />
                        </th>
                        {showInactiveUsers && (
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
                      {filteredUsers.map((user): React.ReactElement => {
                        return (
                          <tr key={user.id}>
                            <td data-label={translate('powerschoolftp.username')}>{user.username}</td>
                            <td data-label={translate('powerschoolftp.auth_type')}>{getAuthTypeDisplay(user.authType)}</td>
                            <td data-label={translate('powerschoolftp.access')}>{getAccessDisplay(user.access)}</td>
                            <td data-label={translate('powerschoolftp.product')}>{user.productName || user.productCode}</td>
                            <td data-label={translate('powerschoolftp.folders')}>
                              {user.folders.map((f, index) => {
                                return (
                                  <React.Fragment key={f.id || index}>
                                    {f.path}
                                    {index < user.folders.length - 1 && <br />}
                                  </React.Fragment>
                                );
                              })}
                            </td>
                            <td data-label={translate('powerschoolftp.ip_whitelist')}>
                              {user.ipWhitelist && user.ipWhitelist.length > 0
                                ? (
                                  <NeonEllipsis id={`ipwhitelist-${user.id}`}>
                                    {user.ipWhitelist.join(', ')}
                                  </NeonEllipsis>
                                )
                                : translate('powerschoolftp.none')}
                            </td>
                            <td data-label={translate('powerschoolftp.last_login')}>
                              {user.lastLogin
                                ? formatDate(new Date(user.lastLogin), 'DATE')
                                : translate('powerschoolftp.never')}
                            </td>
                            {showInactiveUsers && (
                              <td data-label={translate('powerschoolftp.status')}>
                                <NeonTag
                                  dataText={user.active ? translate('powerschoolftp.active') : translate('powerschoolftp.inactive')}
                                  dataType={user.active ? 'green' : 'red'}
                                />
                              </td>
                            )}
                            <td data-label={translate('powerschoolftp.actions')}>
                              <div className="__neon__wrapper" data-gap="small">
                                <NeonButton
                                  id={`edit-user-${user.id}`}
                                  dataText={translate('powerschoolftp.edit')}
                                  dataType="secondary"
                                  onClick={(): void => {
                                    // Navigate to the edit user page
                                    ftpNavigate(sessionRef, `users/edit/${user.id}`);
                                  }}
                                />
                                <NeonButton
                                  id={`inactivate-user-${user.id}`}
                                  dataText={user.active
                                    ? translate('powerschoolftp.deactivate')
                                    : translate('powerschoolftp.activate')}
                                  dataType="secondary"
                                  dataIsLoading={processingUserId === user.id}
                                  onClick={(): void => {
                                    handleShowDeactivateModal(user.id, user.username, user.active);
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div data-slot="footer-full-width">
              <ToastNotification
                id="user-action-toast"
                show={toast.show}
                message={toast.message}
                type={toast.type}
                datetime={toast.datetime}
                onClose={hideToast}
              />
            </div>
          </NeonCardStandard>
        </div>
      </div>

      {/* Deactivate User Confirmation Modal */}
      <ConfirmationModal
        id="deactivate-user-modal"
        show={showDeactivateModal && !!userToDeactivate}
        title={translate('powerschoolftp.deactivate_user')}
        message={userToDeactivate ? translate('powerschoolftp.are_you_sure_you_want_to_deactivate_the_user', {username: userToDeactivate.username}) : ''}
        confirmText={translate('powerschoolftp.deactivate')}
        cancelText={translate('powerschoolftp.cancel')}
        isLoading={!!processingUserId}
        onConfirm={(): void => {
          if (userToDeactivate) {
            handleInactivateUser(userToDeactivate.id);
            setShowDeactivateModal(false);
            setUserToDeactivate(null);
          }
        }}
        onCancel={(): void => {
          setShowDeactivateModal(false);
          setUserToDeactivate(null);
        }}
      />
    </div>
  );
}
