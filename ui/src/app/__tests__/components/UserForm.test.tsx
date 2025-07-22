import React from 'react';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import UserForm from '../../components/UserForm';

// Mock child components
jest.mock('../../components/SSHKeyInput', () => {
  return {
    SSHKeyInput: function MockSSHKey(props: any): JSX.Element {
      return (
        <div data-testid="ssh-key-input">
          <input
            type="text"
            value={props.redactedSSHKey || ''}
            onChange={(e): void => {
              props.onSSHKeyChange(e.target.value);
            }}
            data-testid="ssh-key-field"
          />
          <button
            onClick={(): void => {
              props.onAuthTypeChange(props.pendingAuthType);
            }}
            data-testid="auth-type-reset"
          >
            Reset
          </button>
        </div>
      );
    }
  };
});

jest.mock('../../components/IpWhitelistManager', () => {
  return {
    IpWhitelistManager: function MockIpWhitelist(props: any): JSX.Element {
      return (
        <div data-testid="ip-whitelist-manager">
          <input
            type="text"
            value={props.value}
            onChange={(e): void => {
              props.onChange(e.target.value);
            }}
            data-testid="ip-whitelist-field"
          />
        </div>
      );
    }
  };
});

jest.mock('@ps-refarch-ux/mfe-utils', () => {
  return {
    translate: (key: string): string => {
      return key;
    }
  };
});

jest.mock('@ps-refarch-ux/neon', () => {
  return {
    NeonTextField: function MockTextField({id, modelValue, modelValueChange, dataIsReadOnly}: any): JSX.Element {
      return (
        <div data-testid={id}>
          <input
            type="text"
            value={modelValue || ''}
            readOnly={dataIsReadOnly === 'true'}
            onChange={(e): void => {
              modelValueChange(e.target.value ?? '');
            }}
            data-testid={`${id}-input`}
          />
        </div>
      );
    },
    NeonSelectField: function MockSelectField({
      id,
      modelValue,
      modelValueChange,
      options
    }: any): JSX.Element {
      return (
        <div data-testid={id}>
          <select
            value={modelValue}
            onChange={(e): void => {
              modelValueChange(e.target.value);
            }}
            data-testid={`${id}-select`}
          >
            <option value="">Select...</option>
            {options?.map((opt: {value: string; text: string}) => {
              return (
                <option key={opt.value} value={opt.value}>
                  {opt.text}
                </option>
              );
            })}
          </select>
        </div>
      );
    },
    NeonMultiSelectField: function MockMultiSelect({
      id,
      modelValue,
      modelValueChange,
      options
    }: any): JSX.Element {
      return (
        <div data-testid={id}>
          <select
            multiple
            value={modelValue}
            onChange={(e): void => {
              const values = Array.from(e.target.selectedOptions).map((opt): string => {
                return opt.value;
              });
              modelValueChange(values);
            }}
            data-testid={`${id}-select`}
          >
            {options?.map((opt: {value: string; text: string}) => {
              return (
                <option key={opt.value} value={opt.value}>
                  {opt.text}
                </option>
              );
            })}
          </select>
        </div>
      );
    },
    NeonButton: function MockButton({id, onClick}: any): JSX.Element {
      return (
        <button data-testid={id} onClick={onClick}>
          Change Password
        </button>
      );
    }
  };
});

describe('UserForm', () => {
  const mockProducts = [
    {code: 'PROD1', name: 'Product 1'},
    {code: 'PROD2', name: 'Product 2'}
  ];

  const mockFolderOptions = [
    {value: 'folder1', text: 'Folder 1'},
    {value: 'folder2', text: 'Folder 2'}
  ];

  const defaultProps = {
    username: '',
    setUsername: jest.fn(),
    authType: '',
    setAuthType: jest.fn(),
    pendingAuthType: '',
    setPendingAuthType: jest.fn(),
    access: '',
    setAccess: jest.fn(),
    productCode: '',
    setProductCode: jest.fn(),
    selectedFolders: [],
    setSelectedFolders: jest.fn(),
    ipWhitelist: '',
    setIpWhitelist: jest.fn(),
    redactedPassword: '',
    redactedSSHKey: '',
    handleSSHKeyChange: jest.fn(),
    handleAuthTypeReset: jest.fn(),
    setShowPasswordModal: jest.fn(),
    products: mockProducts,
    getFolderOptions: jest.fn().mockReturnValue(mockFolderOptions),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles empty username input', () => {
    jest.clearAllMocks();
    const props = {...defaultProps, username: 'test'};
    render(<UserForm {...props} />);
    const usernameField = screen.getByTestId('username-field-input');
    fireEvent.change(usernameField, {target: {value: ''}});
    expect(defaultProps.setUsername).toHaveBeenCalledWith('');
  });

  it('handles empty select field values', () => {
    render(<UserForm {...defaultProps} />);
    const accessField = screen.getByTestId('access-field-select');
    fireEvent.change(accessField, {target: {value: ''}});
    expect(defaultProps.setAccess).not.toHaveBeenCalled();

    const productField = screen.getByTestId('product-code-field-select');
    fireEvent.change(productField, {target: {value: ''}});
    expect(defaultProps.setProductCode).not.toHaveBeenCalled();
  });

  it('handles empty folders selection', () => {
    const propsWithProduct = {...defaultProps, productCode: 'PROD1'};
    render(<UserForm {...propsWithProduct} />);
    const foldersField = screen.getByTestId('folders-field-select');

    // Override selectedOptions getter
    Object.defineProperty(foldersField, 'selectedOptions', {
      writable: true,
      value: []
    });

    fireEvent.change(foldersField);
    expect(defaultProps.setSelectedFolders).toHaveBeenCalledWith([]);
  });

  it('handles auth type switching edge cases', () => {
    const props = {...defaultProps, authType: 'Password'};
    render(<UserForm {...props} />);

    // Switch from Password to Password (should not show modal)
    const authTypeField = screen.getByTestId('auth-type-field-select');
    fireEvent.change(authTypeField, {target: {value: 'Password'}});
    expect(defaultProps.setShowPasswordModal).not.toHaveBeenCalled();

    // Switch from Password to Password (should not show modal)
    const mockSetShowPasswordModal = jest.fn();
    const propsWithPassword = {
      ...defaultProps,
      authType: 'Password',
      setShowPasswordModal: mockSetShowPasswordModal
    };
    render(<UserForm {...propsWithPassword} />);
    fireEvent.change(authTypeField, {target: {value: 'Password'}});
    expect(mockSetShowPasswordModal).not.toHaveBeenCalled();

    // Test with no handler for same auth type
    const propsWithSshKey = {
      ...defaultProps,
      authType: 'SSH key',
      setAuthType: jest.fn()
    };
    render(<UserForm {...propsWithSshKey} />);
    fireEvent.change(authTypeField, {target: {value: 'SSH key'}});
    expect(propsWithSshKey.setAuthType).not.toHaveBeenCalled();
  });

  it('renders all form fields', () => {
    render(<UserForm {...defaultProps} />);
    expect(screen.getByTestId('username-field')).toBeInTheDocument();
    expect(screen.getByTestId('auth-type-field')).toBeInTheDocument();
    expect(screen.getByTestId('access-field')).toBeInTheDocument();
    expect(screen.getByTestId('product-code-field')).toBeInTheDocument();
    expect(screen.getByTestId('ip-whitelist-manager')).toBeInTheDocument();
  });

  it('handles username input', () => {
    render(<UserForm {...defaultProps} />);
    const input = screen.getByTestId('username-field-input');
    fireEvent.change(input, {target: {value: 'testuser'}});
    expect(defaultProps.setUsername).toHaveBeenCalledWith('testuser');
  });

  it('handles auth type selection - Password', () => {
    render(<UserForm {...defaultProps} />);
    const select = screen.getByTestId('auth-type-field-select');
    fireEvent.change(select, {target: {value: 'Password'}});
    expect(defaultProps.setPendingAuthType).toHaveBeenCalledWith('Password');
    expect(defaultProps.setShowPasswordModal).toHaveBeenCalledWith(true);
  });

  it('handles auth type selection - SSH key', () => {
    render(<UserForm {...defaultProps} />);
    const select = screen.getByTestId('auth-type-field-select');
    fireEvent.change(select, {target: {value: 'SSH key'}});
    expect(defaultProps.setPendingAuthType).toHaveBeenCalledWith('SSH key');
    expect(defaultProps.setAuthType).toHaveBeenCalledWith('SSH key');
  });

  it('shows password field and change button when using password auth', () => {
    render(<UserForm {...defaultProps} authType="Password" redactedPassword="********" />);
    expect(screen.getByTestId('password-field')).toBeInTheDocument();
    expect(screen.getByTestId('change-password-button')).toBeInTheDocument();
  });

  it('shows SSH key input when using SSH auth', () => {
    render(<UserForm {...defaultProps} authType="SSH key" />);
    expect(screen.getByTestId('ssh-key-input')).toBeInTheDocument();
  });

  it('handles access type selection', () => {
    render(<UserForm {...defaultProps} />);
    const select = screen.getByTestId('access-field-select');
    fireEvent.change(select, {target: {value: 'readwrite'}});
    expect(defaultProps.setAccess).toHaveBeenCalledWith('readwrite');
  });

  it('handles product selection', () => {
    render(<UserForm {...defaultProps} />);
    const select = screen.getByTestId('product-code-field-select');
    fireEvent.change(select, {target: {value: 'PROD1'}});
    expect(defaultProps.setProductCode).toHaveBeenCalledWith('PROD1');
  });

  it('shows folder selection when product is selected', () => {
    render(<UserForm {...defaultProps} productCode="PROD1" />);
    expect(screen.getByTestId('folders-field')).toBeInTheDocument();
    expect(defaultProps.getFolderOptions).toHaveBeenCalledWith('PROD1');
  });

  it('handles folder selection', () => {
    render(<UserForm {...defaultProps} productCode="PROD1" />);
    const select = screen.getByTestId('folders-field-select') as HTMLSelectElement;
    // Simulate multi-select
    select.options[0].selected = true;
    select.options[1].selected = true;
    fireEvent.change(select);

    expect(defaultProps.setSelectedFolders).toHaveBeenCalledWith(['folder1', 'folder2']);
  });

  it('handles IP whitelist changes', () => {
    render(<UserForm {...defaultProps} />);
    const input = screen.getByTestId('ip-whitelist-field');
    fireEvent.change(input, {target: {value: '192.168.1.1'}});
    expect(defaultProps.setIpWhitelist).toHaveBeenCalledWith('192.168.1.1');
  });

  it('handles change password button click', () => {
    render(<UserForm {...defaultProps} authType="Password" redactedPassword="********" />);
    const button = screen.getByTestId('change-password-button');
    fireEvent.click(button);
    expect(defaultProps.setShowPasswordModal).toHaveBeenCalledWith(true);
  });

  it('handles SSH key changes', () => {
    render(<UserForm {...defaultProps} authType="SSH key" />);
    const input = screen.getByTestId('ssh-key-field');
    fireEvent.change(input, {target: {value: 'ssh-rsa AAAA...'}});
    expect(defaultProps.handleSSHKeyChange).toHaveBeenCalledWith('ssh-rsa AAAA...');
  });

  it('handles auth type reset from SSH key component', () => {
    render(<UserForm {...defaultProps} authType="SSH key" pendingAuthType="Password" />);
    const resetButton = screen.getByTestId('auth-type-reset');
    fireEvent.click(resetButton);
    expect(defaultProps.handleAuthTypeReset).toHaveBeenCalledWith('Password');
  });

  it('handles auth type change with empty value', () => {
    render(<UserForm {...defaultProps} />);
    const authTypeField = screen.getByTestId('auth-type-field-select');
    fireEvent.change(authTypeField, {target: {value: ''}});
    // Should not call any functions when value is empty
    expect(defaultProps.setPendingAuthType).not.toHaveBeenCalled();
    expect(defaultProps.setAuthType).not.toHaveBeenCalled();
    expect(defaultProps.setShowPasswordModal).not.toHaveBeenCalled();
  });

  it('handles switching from Password to SSH key', () => {
    const mockSetAuthType = jest.fn();
    const props = {
      ...defaultProps,
      authType: 'Password',
      setAuthType: mockSetAuthType
    };
    render(<UserForm {...props} />);
    const authTypeField = screen.getByTestId('auth-type-field-select');
    fireEvent.change(authTypeField, {target: {value: 'SSH key'}});
    expect(defaultProps.setPendingAuthType).toHaveBeenCalledWith('SSH key');
    expect(mockSetAuthType).toHaveBeenCalledWith('SSH key');
  });

  describe('SSH key auth type handling', () => {
    afterEach(() => {
      cleanup();
    });

    it('does not trigger setAuthType when staying on SSH key', () => {
      const mockSetAuthType = jest.fn();
      const sshKeyProps = {
        ...defaultProps,
        authType: 'SSH key',
        setAuthType: mockSetAuthType
      };
      render(<UserForm {...sshKeyProps} />);

      const authTypeField = screen.getByTestId('auth-type-field-select');
      fireEvent.change(authTypeField, {target: {value: 'SSH key'}});

      expect(defaultProps.setPendingAuthType).toHaveBeenCalledWith('SSH key');
      expect(mockSetAuthType).not.toHaveBeenCalled();
    });

    it('triggers setAuthType when switching from Password to SSH key', () => {
      const mockSetAuthType = jest.fn();
      const passwordProps = {
        ...defaultProps,
        authType: 'Password',
        setAuthType: mockSetAuthType
      };
      render(<UserForm {...passwordProps} />);

      const authTypeField = screen.getByTestId('auth-type-field-select');
      fireEvent.change(authTypeField, {target: {value: 'SSH key'}});
      expect(mockSetAuthType).toHaveBeenCalledWith('SSH key');
    });
  });


  it('handles folder selection with undefined value fallback', () => {
    // Test the fallback logic in the UserForm component directly
    const mockSetSelectedFolders = jest.fn();
    const propsWithProduct = {
      ...defaultProps,
      productCode: 'PROD1',
      setSelectedFolders: mockSetSelectedFolders
    };

    // Temporarily override the NeonMultiSelectField mock to trigger undefined
    const originalMock = jest.requireMock('@ps-refarch-ux/neon').NeonMultiSelectField;

    jest.requireMock('@ps-refarch-ux/neon').NeonMultiSelectField = function TestMultiSelect({
      modelValueChange
    }: any): JSX.Element {
      // Call modelValueChange with undefined immediately to test the fallback
      React.useEffect(() => {
        if (modelValueChange) {
          modelValueChange(undefined);
        }
      }, [modelValueChange]);

      return <div data-testid="folders-field">Test</div>;
    };

    render(<UserForm {...propsWithProduct} />);

    // Verify that setSelectedFolders was called with empty array as fallback
    expect(mockSetSelectedFolders).toHaveBeenCalledWith([]);

    // Restore the original mock
    jest.requireMock('@ps-refarch-ux/neon').NeonMultiSelectField = originalMock;
  });
});