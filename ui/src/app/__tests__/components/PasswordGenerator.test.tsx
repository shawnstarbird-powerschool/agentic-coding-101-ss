import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import zxcvbn from 'zxcvbn';

// Import the component to access its internals
import * as PasswordGeneratorModule from '../../components/PasswordGenerator';
const {PasswordGenerator} = PasswordGeneratorModule;

jest.mock('zxcvbn');
const mockZxcvbn = jest.mocked(zxcvbn);

jest.mock('@ps-refarch-ux/neon', () => {
  const originalModule = jest.requireActual('@ps-refarch-ux/neon');
  return {
    NeonModalDialog: function MockNeonDialog(props: any): JSX.Element {
      return (
        <div data-testid="password-modal" onClick={props.neonDialogHasClosed}>
          {props.children}
        </div>
      );
    },
    NeonButton: function MockButton({id, dataText, onClick, disabled}: any): JSX.Element {
      return (
        <button data-testid={id} onClick={onClick} disabled={disabled}>
          {dataText}
        </button>
      );
    },
    NeonTextField: function MockTextField({id, modelValue, modelValueChange}: any): JSX.Element {
      return (
        <div data-testid={id}>
          <input
            type="text"
            value={modelValue}
            onChange={(e): void => {
              modelValueChange(e.target.value);
            }}
            data-testid={`${id}-input`}
          />
        </div>
      );
    },
    NeonNumberField: function MockNumberField({
      id,
      modelValue,
      modelValueChange,
      dataMinValue,
      dataMaxValue,
    }: any): JSX.Element {
      return (
        <input
          data-testid={id}
          type="number"
          value={modelValue?.toString() || ''}
          min={dataMinValue}
          max={dataMaxValue}
          onChange={(e): void => {
            modelValueChange(Number(e.target.value));
          }}
        />
      );
    },
    NeonCheckboxSingle: function MockCheckbox({id, value, onInput}: any): JSX.Element {
      return (
        <input
          data-testid={id}
          type="checkbox"
          checked={value}
          onChange={(e): void => {
            onInput(e);
          }}
        />
      );
    },
    NeonRatingField: function MockRating({id, modelValue}: any): JSX.Element {
      return <div data-testid={id}>{modelValue}</div>;
    },
  };
});

describe('PasswordGenerator', () => {
  const defaultProps = {
    showModal: true,
    onClose: jest.fn(),
    onAccept: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockZxcvbn.mockImplementation((): {score: number} => {
      return {score: 3};
    });
  });

  it('renders nothing when showModal is false', () => {
    const {container} = render(
      <PasswordGenerator {...defaultProps} showModal={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal with initial values', () => {
    render(<PasswordGenerator {...defaultProps} initialPasswordLength={10} />);
    expect(screen.getByTestId('password-modal')).toBeInTheDocument();
    expect(screen.getByTestId('password-length-field')).toHaveAttribute('value', '10');
  });

  it('handles password length changes', () => {
    render(<PasswordGenerator {...defaultProps} />);
    const lengthInput = screen.getByTestId('password-length-field');
    fireEvent.change(lengthInput, {target: {value: '15'}});
    expect(lengthInput).toHaveAttribute('value', '15');
  });

  it('generates non-pronounceable password', () => {
    render(<PasswordGenerator {...defaultProps} />);
    fireEvent.click(screen.getByTestId('regenerate-button'));
    const passwordInput = screen.getByTestId('generated-password-field-input') as HTMLInputElement;
    expect(passwordInput.value).toBeTruthy();
    expect(typeof passwordInput.value).toBe('string');
  });

  it('generates pronounceable password', () => {
    render(<PasswordGenerator {...defaultProps} />);
    fireEvent.click(screen.getByTestId('pronounceable-field'));
    fireEvent.click(screen.getByTestId('regenerate-button'));
    const passwordInput = screen.getByTestId('generated-password-field-input') as HTMLInputElement;
    expect(passwordInput.value).toBeTruthy();
    expect(typeof passwordInput.value).toBe('string');
  });

  describe('password strength calculation', () => {
    it('shows strength meter and calculates strength', () => {
      mockZxcvbn.mockReset();
      mockZxcvbn.mockImplementation((password: string): {score: number} => {
        return {score: password ? 3 : 0};
      });

      render(<PasswordGenerator {...defaultProps} showStrengthMeter={true} initialPassword="" />);
      expect(screen.queryByTestId('password-strength-meter')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('regenerate-button'));
      const strengthMeter = screen.getByTestId('password-strength-meter');
      expect(strengthMeter).toBeInTheDocument();
      expect(strengthMeter).toHaveTextContent('4');
    });

    it('returns 0 for empty password strength', () => {
      mockZxcvbn.mockReset();
      render(<PasswordGenerator {...defaultProps} showStrengthMeter={true} initialPassword="" />);
      expect(screen.queryByTestId('password-strength-meter')).not.toBeInTheDocument();
    });
  });

  describe('pronounceable password generation', () => {
    it('generates exact length pronounceable password', () => {
      const desiredLength = 15;
      render(<PasswordGenerator {...defaultProps} initialPasswordLength={desiredLength} />);
      fireEvent.click(screen.getByTestId('pronounceable-field'));
      fireEvent.click(screen.getByTestId('regenerate-button'));
      const passwordInput = screen.getByTestId('generated-password-field-input') as HTMLInputElement;
      expect(passwordInput.value.length).toBe(desiredLength);
    });
  });

  describe('password field handling', () => {
    it('handles undefined value in password length field', () => {
      render(<PasswordGenerator {...defaultProps} />);
      const lengthField = screen.getByTestId('password-length-field');
      const mockNumberField = jest.requireMock('@ps-refarch-ux/neon').NeonNumberField;
      const originalImplementation = mockNumberField.bind({});

      jest.requireMock('@ps-refarch-ux/neon').NeonNumberField = function MockWithUndefined(props: any): JSX.Element {
        return (
          <input
            data-testid={props.id}
            type="number"
            onChange={(): void => {
              props.modelValueChange(undefined);
            }}
          />
        );
      };
      fireEvent.change(lengthField, {target: {value: ''}});
      // Restore the original implementation
      jest.requireMock('@ps-refarch-ux/neon').NeonNumberField = originalImplementation;
    });
  });

  it('handles accept button click with empty password', () => {
    render(<PasswordGenerator {...defaultProps} />);
    fireEvent.click(screen.getByTestId('accept-button'));
    expect(defaultProps.onAccept).not.toHaveBeenCalled();
  });

  it('handles accept button click with generated password', () => {
    render(<PasswordGenerator {...defaultProps} />);
    fireEvent.click(screen.getByTestId('regenerate-button'));
    fireEvent.click(screen.getByTestId('accept-button'));
    expect(defaultProps.onAccept).toHaveBeenCalledWith(expect.any(String));
  });

  it('disables accept button when no password is generated', () => {
    render(<PasswordGenerator {...defaultProps} />);
    expect(screen.getByTestId('accept-button')).toBeDisabled();
  });

  it('handles number and symbol toggles', () => {
    render(<PasswordGenerator {...defaultProps} />);
    fireEvent.click(screen.getByTestId('include-numbers-field'));
    fireEvent.click(screen.getByTestId('include-symbols-field'));
    fireEvent.click(screen.getByTestId('regenerate-button'));
    const passwordInput = screen.getByTestId('generated-password-field-input') as HTMLInputElement;
    expect(passwordInput.value).toBeTruthy();
    expect(typeof passwordInput.value).toBe('string');
  });

  it('disables regenerate button for invalid password length', () => {
    render(<PasswordGenerator {...defaultProps} />);
    const lengthInput = screen.getByTestId('password-length-field');
    fireEvent.change(lengthInput, {target: {value: '7'}});
    expect(screen.getByTestId('regenerate-button')).toBeDisabled();
    fireEvent.change(lengthInput, {target: {value: '73'}});
    expect(screen.getByTestId('regenerate-button')).toBeDisabled();
  });

  it('calls onClose when modal is closed', () => {
    render(<PasswordGenerator {...defaultProps} />);
    fireEvent.click(screen.getByTestId('password-modal'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('displays initial password when provided', () => {
    const initialPassword = 'testPassword123!';
    render(
      <PasswordGenerator {...defaultProps} initialPassword={initialPassword} />
    );
    const passwordInput = screen.getByTestId('generated-password-field-input') as HTMLInputElement;
    expect(passwordInput.value).toBe(initialPassword);
  });

  it('handles empty values in password fields', () => {
    render(<PasswordGenerator {...defaultProps} />);
    const lengthInput = screen.getByTestId('password-length-field');
    const passwordInput = screen.getByTestId('generated-password-field-input') as HTMLInputElement;
    fireEvent.change(lengthInput, {target: {value: ''}});
    fireEvent.change(passwordInput, {target: {value: ''}});
    expect(lengthInput).toHaveAttribute('value', '0');
    expect(passwordInput.value).toBe('');
  });

  it('prevents handleAccept with empty password', () => {
    const mockOnAccept = jest.fn();
    render(
      <PasswordGenerator
        {...defaultProps}
        onAccept={mockOnAccept}
      />
    );

    // Try to accept when no password is generated (accept button should be disabled)
    const acceptButton = screen.getByTestId('accept-button');
    expect(acceptButton).toBeDisabled();

    // Even if we try to click it, onAccept should not be called
    fireEvent.click(acceptButton);
    expect(mockOnAccept).not.toHaveBeenCalled();
  });

  describe('additional coverage tests', () => {
    it('tests calculatePasswordStrength with empty password', () => {
      mockZxcvbn.mockImplementation((password: string): {score: number} => {
        return {score: password ? 3 : 0};
      });

      render(<PasswordGenerator {...defaultProps} showStrengthMeter={true} initialPassword="" />);

      // Initially, no password is set, so strength meter should not be visible (line 48 test)
      expect(screen.queryByTestId('password-strength-meter')).not.toBeInTheDocument();

      // Generate a password to make the strength meter appear
      fireEvent.click(screen.getByTestId('regenerate-button'));
      expect(screen.getByTestId('password-strength-meter')).toBeInTheDocument();
    });

    it('tests pronounceable password generation with odd length to hit boundary condition', () => {
      // Test with odd length to ensure we hit line 64 (password.length < passwordLength check)
      render(<PasswordGenerator {...defaultProps} initialPasswordLength={9} />);
      fireEvent.click(screen.getByTestId('pronounceable-field'));
      fireEvent.click(screen.getByTestId('regenerate-button'));

      const passwordInput = screen.getByTestId('generated-password-field-input') as HTMLInputElement;
      expect(passwordInput.value).toBeTruthy();
      expect(passwordInput.value.length).toBe(9);
    });

    it('tests handleAccept with non-empty password to cover conditional branch', () => {
      const mockOnAccept = jest.fn();
      render(
        <PasswordGenerator
          {...defaultProps}
          onAccept={mockOnAccept}
          initialPassword="testPassword123"
        />
      );

      // This should trigger the conditional check on line 98 (if (generatedPassword))
      fireEvent.click(screen.getByTestId('accept-button'));
      expect(mockOnAccept).toHaveBeenCalledWith('testPassword123');
    });

    it('tests password length modelValueChange with valid number', () => {
      render(<PasswordGenerator {...defaultProps} />);
      const lengthInput = screen.getByTestId('password-length-field');

      // This should trigger the conditional check on line 124 (if (value !== undefined))
      fireEvent.change(lengthInput, {target: {value: '20'}});
      expect(lengthInput).toHaveAttribute('value', '20');
    });

    it('ensures initial password length does not exceed maximum', () => {
      // Test the Math.min logic in useState initialization (line 34)
      render(<PasswordGenerator {...defaultProps} initialPasswordLength={100} />);
      const lengthInput = screen.getByTestId('password-length-field');
      expect(lengthInput).toHaveAttribute('value', '72'); // Should be capped at 72
    });

    it('tests password generation with only letters (no numbers or symbols)', () => {
      render(<PasswordGenerator {...defaultProps} />);

      // Turn off numbers and symbols
      fireEvent.click(screen.getByTestId('include-numbers-field'));
      fireEvent.click(screen.getByTestId('include-symbols-field'));

      fireEvent.click(screen.getByTestId('regenerate-button'));

      const passwordInput = screen.getByTestId('generated-password-field-input') as HTMLInputElement;
      expect(passwordInput.value).toBeTruthy();

      // Password should only contain letters
      expect(/^[A-Za-z]+$/.test(passwordInput.value)).toBe(true);
    });

    it('tests button text changes based on generated password state', () => {
      render(<PasswordGenerator {...defaultProps} />);

      // Initially should show "Generate"
      const regenerateButton = screen.getByTestId('regenerate-button');
      expect(regenerateButton).toHaveTextContent('powerschoolftp.generate');

      // After generating, should show "Regenerate"
      fireEvent.click(regenerateButton);
      expect(regenerateButton).toHaveTextContent('powerschoolftp.regenerate');
    });

    it('tests all NeonTextField and NeonRatingField modelValueChange callbacks', () => {
      render(<PasswordGenerator {...defaultProps} showStrengthMeter={true} initialPassword="test123" />);

      // Test password field modelValueChange (lines 170-172)
      const passwordInput = screen.getByTestId('generated-password-field-input') as HTMLInputElement;
      fireEvent.change(passwordInput, {target: {value: 'newValue'}});
      // The callback should be called but do nothing (it's a required non-empty function)

      // Generate password to show strength meter
      fireEvent.click(screen.getByTestId('regenerate-button'));

      // Test rating field modelValueChange (lines 183-185)
      const strengthMeter = screen.getByTestId('password-strength-meter');
      expect(strengthMeter).toBeInTheDocument();
      // The rating field callback should also be called but do nothing
    });

    it('tests calculatePasswordStrength function directly with empty string', () => {
      mockZxcvbn.mockImplementation((password: string): {score: number} => {
        // This will never be called for empty password due to early return on line 48
        return {score: 4};
      });

      // Test the early return path for empty password (line 48)
      render(<PasswordGenerator {...defaultProps} showStrengthMeter={true} />);

      // The component starts with no password, testing the line 48 early return
      expect(screen.queryByTestId('password-strength-meter')).not.toBeInTheDocument();

      // Verify the zxcvbn mock was not called for empty password
      expect(mockZxcvbn).not.toHaveBeenCalled();
    });

    it('tests pronounceable password edge case where password reaches exact length', () => {
      // Test password length = 9 (odd number) to hit the boundary condition on line 64
      render(<PasswordGenerator {...defaultProps} initialPasswordLength={9} />);
      fireEvent.click(screen.getByTestId('pronounceable-field'));

      // Verify button is enabled for valid length
      const regenerateButton = screen.getByTestId('regenerate-button');
      expect(regenerateButton).not.toBeDisabled();

      fireEvent.click(regenerateButton);

      const passwordInput = screen.getByTestId('generated-password-field-input') as HTMLInputElement;
      // For length 9, the loop will check password.length < passwordLength on line 64
      expect(passwordInput.value.length).toBe(9);
    });

    it('tests handleAccept when password is empty string', () => {
      const mockOnAccept = jest.fn();
      render(
        <PasswordGenerator
          {...defaultProps}
          onAccept={mockOnAccept}
          initialPassword=""
        />
      );

      // This tests the negative path of line 98 (if (generatedPassword))
      // Since password is empty, onAccept should not be called
      const acceptButton = screen.getByTestId('accept-button');
      expect(acceptButton).toBeDisabled();
      fireEvent.click(acceptButton);
      expect(mockOnAccept).not.toHaveBeenCalled();
    });

    it('tests password length field with undefined value edge case', () => {
      // Simulate the NeonNumberField calling modelValueChange with undefined
      const mockNumberField = jest.requireMock('@ps-refarch-ux/neon').NeonNumberField;
      const originalImplementation = mockNumberField;

      let capturedOnChange: any;
      jest.requireMock('@ps-refarch-ux/neon').NeonNumberField = function MockWithUndefinedCapture(props: any): JSX.Element {
        capturedOnChange = props.modelValueChange;
        return originalImplementation(props);
      };

      // Render component to capture the onChange function
      const {container} = render(<PasswordGenerator {...defaultProps} />);

      // Call the captured function with undefined (tests line 124)
      if (capturedOnChange) {
        capturedOnChange(undefined);
      }

      // Restore original implementation
      jest.requireMock('@ps-refarch-ux/neon').NeonNumberField = originalImplementation;

      // The password length should remain unchanged when undefined is passed
      const lengthInput = container.querySelector('[data-testid="password-length-field"]') as HTMLInputElement;
      expect(lengthInput).toHaveAttribute('value', '12'); // Default value
    });
  });
});