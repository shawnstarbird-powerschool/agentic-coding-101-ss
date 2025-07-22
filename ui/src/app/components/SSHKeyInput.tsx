import {translate} from '@ps-refarch-ux/mfe-utils';
import {
  NeonButton,
  NeonModalDialog,
  NeonTextareaField,
  NeonTextField
} from '@ps-refarch-ux/neon';
import React, {useState} from 'react';
import * as forge from 'node-forge';

/**
 * Type definition for the binary writer used for SSH key formatting
 */
type BinaryWriter = {
  buffer: forge.util.ByteStringBuffer;
  writeUint32BE: (value: number) => void;
  writeBytes: (bytes: string) => void;
  writeString: (str: string) => void;
  getBytes: () => string;
};

/**
 * Props for the SSHKeyInput component
 */
interface SSHKeyInputProps {
  /** The redacted SSH key to display in the read-only field */
  redactedSSHKey: string;
  /** Callback function when the SSH key is changed */
  onSSHKeyChange: (sshKey: string) => void;
  /** Callback function when the authentication type is changed */
  onAuthTypeChange?: () => void;
  /** The pending authentication type */
  pendingAuthType?: string;
  /** The current authentication type */
  authType?: string;
}

/**
 * Styles used in the component
 */
const styles = {
  buttonLayout: {
    marginTop: '16px'
  },
  messageContainer: {
    marginTop: '16px'
  },
  securityWarning: {
    marginBottom: '8px',
    color: '#664d03',
    backgroundColor: '#fff3cd',
    padding: '8px',
    borderRadius: '4px'
  },
  downloadButtonContainer: {
    marginTop: '8px',
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const
  }
};

/**
 * Component for handling SSH key input, validation, and generation
 */
export function SSHKeyInput({
  redactedSSHKey,
  onSSHKeyChange,
  onAuthTypeChange,
  pendingAuthType,
  authType
}: SSHKeyInputProps): React.ReactElement {
  // State management
  const [showSSHKeyModal, setShowSSHKeyModal] = useState<boolean>(false);
  const [sshKey, setSSHKey] = useState<string>('');
  const [sshKeyError, setSSHKeyError] = useState<string>('');
  const [, setPrivateKey] = useState<string>('');
  const [privateKeyDownloadUrl, setPrivateKeyDownloadUrl] = useState<string>('');

  /**
   * Cleans up resources when the modal is closed
   */
  const cleanupResources = (): void => {
    if (privateKeyDownloadUrl) {
      URL.revokeObjectURL(privateKeyDownloadUrl);
      setPrivateKeyDownloadUrl('');
    }
  };

  /**
   * Validates the SSH key format
   * @param key - The SSH key to validate
   * @returns True if the key is valid, false otherwise
   */
  const validateSSHKey = (key: string): boolean => {
    if (!key.trim()) {
      setSSHKeyError(translate('powerschoolftp.SSH key is required'));
      return false;
    }

    if (key.includes('PRIVATE KEY')) {
      setSSHKeyError(translate('powerschoolftp.Private keys are not allowed. Please provide a public key.'));
      return false;
    }

    const validPrefixes = ['ssh-rsa', 'ssh-ed25519', 'ssh-dss'];
    if (!validPrefixes.some((prefix) => { return key.startsWith(prefix); })) {
      setSSHKeyError(translate('powerschoolftp.Invalid SSH key format. Please provide a valid public key.'));
      return false;
    }

    setSSHKeyError('');
    return true;
  };

  // SSH Key formatting helper functions

  /**
   * Converts a binary string to Base64
   */
  const binaryStringToBase64 = (binary: string): string => {
    return forge.util.encode64(binary);
  };

  /**
   * Creates a binary writer for SSH key format
   */
  const createBinaryWriter = (): BinaryWriter => {
    const buffer = forge.util.createBuffer();

    return {
      buffer,
      writeUint32BE: (value: number): void => {
        buffer.putInt32(value);
      },
      writeBytes: (bytes: string): void => {
        buffer.putBytes(bytes);
      },
      writeString: (str: string): void => {
        const bytes = forge.util.encodeUtf8(str);
        buffer.putInt32(bytes.length);
        buffer.putBytes(bytes);
      },
      getBytes: (): string => {
        return buffer.getBytes();
      }
    };
  };

  /**
   * Writes a buffer with its length prefix
   */
  const writeLengthPrefixedBuffer = (writer: BinaryWriter, buffer: string): void => {
    writer.writeUint32BE(buffer.length);
    writer.writeBytes(buffer);
  };

  /**
   * Formats the primary SSH key in standard format
   */
  const formatPrimarySSHKey = (
    keyType: string,
    writer: BinaryWriter,
    nBytes: string,
    eBytes: string
  ): string => {
    writer.writeString(keyType);

    // Write the exponent
    writeLengthPrefixedBuffer(writer, eBytes);

    // For the modulus, ensure it's treated as a positive number
    if ((nBytes.charCodeAt(0) & 0x80) !== 0) {
      const paddedN = String.fromCharCode(0) + nBytes;
      writeLengthPrefixedBuffer(writer, paddedN);
    } else {
      writeLengthPrefixedBuffer(writer, nBytes);
    }

    // Convert the binary data to base64
    const keyBytes = writer.getBytes();
    const base64Key = binaryStringToBase64(keyBytes);

    return `${keyType} ${base64Key}`;
  };

  /**
   * Creates a fallback SSH key format if the primary method fails
   */
  const createFallbackSSHKey = (keyType: string, publicKey: forge.pki.rsa.PublicKey): string => {
    const publicKeyPem = forge.pki.publicKeyToPem(publicKey);
    const base64Data = publicKeyPem
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s/g, '');

    return `${keyType} ${base64Data}`;
  };

  /**
   * Formats public key in SSH format compatible with AWS Transfer Family
   */
  const formatSSHPublicKey = (publicKey: forge.pki.rsa.PublicKey): string => {
    try {
      // Get the modulus and exponent from the public key
      const n = publicKey.n;
      const e = publicKey.e;

      // Convert BigInteger to binary string
      const nBytes = forge.util.hexToBytes(n.toString(16));
      const eBytes = forge.util.hexToBytes(e.toString(16));

      // Create a binary writer for the SSH key format
      const writer = createBinaryWriter();
      const keyType = 'ssh-rsa';

      return formatPrimarySSHKey(keyType, writer, nBytes, eBytes);
    } catch (error) {
      console.error('Error formatting SSH public key:', error);

      // If the above fails, try a simpler approach
      try {
        return createFallbackSSHKey('ssh-rsa', publicKey);
      } catch (fallbackError) {
        console.error('Fallback SSH key formatting failed:', fallbackError);
        throw new Error('Failed to format SSH key');
      }
    }
  };

  /**
   * Generates an SSH key pair using node-forge
   * Compatible with AWS Transfer Family and FileZilla
   */
  const generateKeyPair = async (): Promise<void> => {
    try {
      const rsa = forge.pki.rsa;
      setSSHKeyError('Generating key pair, please wait...');

      // Generate the key pair asynchronously to avoid blocking the UI
      setTimeout(() => {
        try {
          const keypair = rsa.generateKeyPair({bits: 2048, e: 0x10001});

          // Format the keys
          const publicKeySSH = formatSSHPublicKey(keypair.publicKey);
          const privateKeyPEM = forge.pki.privateKeyToPem(keypair.privateKey);

          // Set the keys
          setSSHKey(publicKeySSH);
          setPrivateKey(privateKeyPEM);

          // Create download URL for the private key
          const blob = new Blob([privateKeyPEM], {type: 'application/x-pem-file'});
          const url = URL.createObjectURL(blob);
          setPrivateKeyDownloadUrl(url);

          // Set a helpful note
          setSSHKeyError('Note: Download and securely store the private key. Choose the appropriate format for your client.');
        } catch (error) {
          console.error('Error in key generation:', error);
          setSSHKeyError('Error generating SSH key pair. Please try again or enter a key manually.');
        }
      }, 0);
    } catch (error) {
      console.error('Error setting up key generation:', error);
      setSSHKeyError('Error generating SSH key pair. Please try again or enter a key manually.');
    }
  };

  /**
   * Accepts the SSH key and passes it to the parent component
   */
  const acceptSSHKey = (): void => {
    if (validateSSHKey(sshKey)) {
      onSSHKeyChange(sshKey);
      setShowSSHKeyModal(false);
      cleanupResources();
    }
  };

  /**
   * Handles modal close event
   */
  const handleModalClose = (): void => {
    setShowSSHKeyModal(false);

    // Reset pending auth type if the user closes the modal without accepting
    if (onAuthTypeChange && pendingAuthType !== authType) {
      onAuthTypeChange();
    }

    cleanupResources();
  };

  /**
   * Handles SSH key input change
   */
  const handleSSHKeyChange = (value: string | undefined): void => {
    const newValue = value || '';
    setSSHKey(newValue);

    if (newValue) {
      validateSSHKey(newValue);
    } else {
      setSSHKeyError('');
    }
  };

  /**
   * Opens the SSH key modal
   */
  const openSSHKeyModal = (): void => {
    setShowSSHKeyModal(true);
  };

  /**
   * Handles cancel button click
   */
  const handleCancelClick = (): void => {
    setShowSSHKeyModal(false);

    // Reset pending auth type if the user cancels
    if (onAuthTypeChange && pendingAuthType !== authType) {
      onAuthTypeChange();
    }
  };

  return (
    <>
      <div
        className="__neon__form-row"
        style={{display: 'flex', alignItems: 'flex-end', gap: '8px'}}
      >
        <NeonTextField
          id="ssh-key-field"
          dataLabelText={translate('powerschoolftp.ssh_key')}
          dataIsRequired="true"
          dataSize="large"
          dataIsReadOnly="true"
          modelValue={redactedSSHKey}
          modelValueChange={(): void => {
            // Required non-empty function
          }}
        />
        <NeonButton
          id="change-ssh-key-button"
          dataText={
            redactedSSHKey
              ? translate('powerschoolftp.change_ssh_key')
              : translate('powerschoolftp.generate_key_pair')
          }
          dataType="secondary"
          dataLabelTextSpace="true"
          onClick={openSSHKeyModal}
        />
      </div>

      {/* SSH Key Modal */}
      {showSSHKeyModal && (
        <NeonModalDialog
          id="ssh-key-modal"
          dataAnimate="true"
          neonDialogHasClosed={handleModalClose}
        >
          <div data-slot="dialog-header-title" className="__mfe__roboto-font">{translate('powerschoolftp.enter_ssh_public_key')}</div>
          <div data-slot="dialog-body">
            <div className="__neon__form">
              <NeonTextareaField
                id="ssh-key-input-field"
                dataLabelText={translate('powerschoolftp.ssh_public_key')}
                dataHelperText={sshKeyError || translate('powerschoolftp.paste_your_ssh_public_key_here')}
                dataSize="large"
                dataIsRequired="true"
                modelValue={sshKey}
                modelValueChange={handleSSHKeyChange}
              />

              <div className="__neon__button-layout" style={styles.buttonLayout}>
                <NeonButton
                  id="generate-ssh-key-button"
                  dataText={sshKey ? translate('powerschoolftp.regenerate_key_pair') : translate('powerschoolftp.generate_key_pair')}
                  dataType="secondary"
                  onClick={generateKeyPair}
                />
              </div>

              {privateKeyDownloadUrl && (
                <div className="__neon__message __neon__message-info" style={styles.messageContainer}>
                  <p className="__neon__text">{translate('powerschoolftp.private_key_generated')}</p>
                  <p className="__neon__text" style={styles.securityWarning}>
                    <strong>{translate('powerschoolftp.important')} : </strong> {translate('powerschoolftp.store_your_private_key_securely')}
                  </p>
                  <div style={styles.downloadButtonContainer}>
                    <a
                      href={privateKeyDownloadUrl}
                      download="id_rsa.pem"
                      className="__neon__button __neon__button-primary"
                    >
                      {translate('powerschoolftp.download_private_key')}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div data-slot="dialog-footer-content">
            <div className="__neon__button-layout">
              <NeonButton
                id="cancel-ssh-key-button"
                dataText={translate('powerschoolftp.cancel')}
                dataType="secondary"
                onClick={handleCancelClick}
              />
              <NeonButton
                id="accept-ssh-key-button"
                dataText={translate('powerschoolftp.accept')}
                dataType="primary"
                onClick={acceptSSHKey}
              />
            </div>
          </div>
        </NeonModalDialog>
      )}
    </>
  );
}
