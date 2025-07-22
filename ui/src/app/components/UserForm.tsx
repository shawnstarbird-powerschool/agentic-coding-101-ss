import React from 'react';
import {translate} from '@ps-refarch-ux/mfe-utils';
import {
  NeonButton,
  NeonMultiSelectField,
  NeonSelectField,
  NeonTextField
} from '@ps-refarch-ux/neon';
import {IpWhitelistManager} from './IpWhitelistManager';
import {SSHKeyInput} from './SSHKeyInput';
import {UserFormProps} from '../types/user-types';

export function UserForm({
  username,
  setUsername,
  authType,
  setAuthType,
  pendingAuthType,
  setPendingAuthType,
  access,
  setAccess,
  productCode,
  setProductCode,
  selectedFolders,
  setSelectedFolders,
  ipWhitelist,
  setIpWhitelist,
  redactedPassword,
  redactedSSHKey,
  handleSSHKeyChange,
  handleAuthTypeReset,
  setShowPasswordModal,
  products,
  getFolderOptions
}: UserFormProps): React.ReactElement {
  return (
    <div className="__neon__form">
      <NeonTextField
        id="username-field"
        dataLabelText={translate('powerschoolftp.username')}
        dataIsRequired="true"
        dataSize="large"
        modelValue={username}
        modelValueChange={(value: string | undefined): void => {
          setUsername(value || '');
        }}
      />

      <NeonSelectField
        id="auth-type-field"
        dataLabelText={translate('powerschoolftp.authentication_type')}
        dataIsRequired="true"
        dataSize="large"
        modelValue={authType}
        modelValueChange={(value: string | undefined): void => {
          if (value && setAuthType) {
            // Don't immediately set the auth type, store it as pending
            setPendingAuthType(value);
            if (value === 'Password') {
              // Only show password modal if changing from SSH key to Password or first selection
              if (authType !== 'Password') {
                setShowPasswordModal(true);
              }
            } if (value === 'SSH key') {
              // Only show SSH key modal if changing from Password to SSH key or first selection
              if (authType !== 'SSH key') {
                setAuthType(value);
              }
            }
          }
        }}
        options={[
          {text: translate('powerschoolftp.password'), value: 'Password'},
          {text: translate('powerschoolftp.ssh_key'), value: 'SSH key'}
        ]}
      />

      {authType === 'Password' && redactedPassword && (
        <div className="__neon__form-row">
          <div style={{display: 'flex', alignItems: 'flex-end', gap: '8px'}}>
            <NeonTextField
              id="password-field"
              dataLabelText={translate('powerschoolftp.password')}
              dataIsRequired="true"
              dataSize="large"
              dataIsReadOnly="true"
              modelValue={redactedPassword}
              modelValueChange={(value: string | undefined): void => {
                // Required non-empty function
              }}
            />
            <NeonButton
              id="change-password-button"
              dataText={translate('powerschoolftp.change_password')}
              dataType="secondary"
              dataLabelTextSpace="true"
              onClick={(): void => {
                setShowPasswordModal(true);
              }}
            />
          </div>
        </div>
      )}

      {authType === 'SSH key' && (
        <SSHKeyInput
          redactedSSHKey={redactedSSHKey}
          onSSHKeyChange={handleSSHKeyChange}
          onAuthTypeChange={handleAuthTypeReset}
          pendingAuthType={pendingAuthType}
          authType={authType}
        />
      )}

      <NeonSelectField
        id="access-field"
        dataLabelText={translate('powerschoolftp.access')}
        dataIsRequired="true"
        dataSize="large"
        modelValue={access}
        modelValueChange={(value: string | undefined): void => {
          if (value) {
            setAccess(value);
          }
        }}
        options={[
          {text: translate('powerschoolftp.read'), value: 'read'},
          {text: translate('powerschoolftp.write'), value: 'write'},
          {text: translate('powerschoolftp.read/write'), value: 'readwrite'}
        ]}
      />

      <NeonSelectField
        id="product-code-field"
        dataLabelText={translate('powerschoolftp.product')}
        dataIsRequired="true"
        dataSize="large"
        modelValue={productCode}
        modelValueChange={(value: string | undefined): void => {
          if (value) {
            setProductCode(value);
          }
        }}
        options={products.map((product): {text: string; value: string} => {
          return {
            text: `${product.name} (${product.code})`,
            value: product.code
          };
        })}
      />

      {productCode && (
        <NeonMultiSelectField
          id="folders-field"
          dataLabelText={translate('powerschoolftp.folders')}
          dataIsRequired="true"
          dataSize="large"
          modelValue={selectedFolders}
          modelValueChange={(value: Array<string> | undefined): void => {
            setSelectedFolders(value || []);
          }}
          options={getFolderOptions(productCode)}
        />
      )}

      <IpWhitelistManager
        value={ipWhitelist}
        onChange={(value: string): void => {
          setIpWhitelist(value);
        }}
      />
    </div>
  );
}

export default UserForm;
