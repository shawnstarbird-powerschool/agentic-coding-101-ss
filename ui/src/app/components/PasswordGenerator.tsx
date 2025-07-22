/* eslint-disable object-curly-spacing */
import { translate } from '@ps-refarch-ux/mfe-utils';
import zxcvbn from 'zxcvbn';
import {
  NeonButton,
  NeonCheckboxSingle,
  NeonModalDialog,
  NeonNumberField,
  NeonRatingField,
  NeonTextField
} from '@ps-refarch-ux/neon';
import React, { useState } from 'react';

interface PasswordGeneratorProps {
  showModal: boolean;
  onClose: () => void;
  onAccept: (password: string) => void;
  initialPassword?: string;
  initialPasswordLength?: number;
  initialPronounceable?: boolean;
  showStrengthMeter?: boolean;
}

export function PasswordGenerator({
  showModal,
  onClose,
  onAccept,
  initialPassword = '',
  initialPasswordLength = 12,
  initialPronounceable = false,
  showStrengthMeter = false
}: PasswordGeneratorProps): React.ReactElement | null {
  const [passwordLength, setPasswordLength] = useState<number>(
    Math.min(initialPasswordLength, 72) // Ensure initial value doesn't exceed max
  );
  const [pronounceable, setPronounceable] = useState<boolean>(initialPronounceable);
  const [includeNumbers, setIncludeNumbers] = useState<boolean>(true);
  const [includeSymbols, setIncludeSymbols] = useState<boolean>(true);
  const [generatedPassword, setGeneratedPassword] = useState<string>(initialPassword || '');
  const [passwordStrength, setPasswordStrength] = useState<number>(0);

  // Generate password when component mounts or when password options change
  // We no longer automatically generate a password when the modal opens
  // The user must click the "Regenerate" button to generate a password

  // Calculate password strength using zxcvbn on a scale of 1-5
  const calculatePasswordStrength = (password: string): number => {
    if (!password) { return 0; }

    // zxcvbn returns a score from 0-4, we map it to 1-5
    const result = zxcvbn(password);
    return result.score + 1;
  };

  // Generate password
  const generatePassword = (): void => {
    let chars = '';
    if (pronounceable) {
      // Generate pronounceable password with consonant-vowel pairs
      const consonants = 'bcdfghjklmnpqrstvwxz';
      const vowels = 'aeiouy';
      let password = '';
      for (let i = 0; i < Math.ceil(passwordLength / 2); i++) {
        if (password.length < passwordLength) {
          password += consonants.charAt(Math.floor(Math.random() * consonants.length));
        }
        if (password.length < passwordLength) {
          password += vowels.charAt(Math.floor(Math.random() * vowels.length));
        }
      }
      setGeneratedPassword(password);
      // Calculate and set password strength after generating
      setPasswordStrength(calculatePasswordStrength(password));
    } else {
      // For non-pronounceable passwords, use selected character sets
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      const numbers = '0123456789';
      const symbols = '!@#$%^&*()';
      chars = letters;
      if (includeNumbers) {
        chars += numbers;
      }
      if (includeSymbols) {
        chars += symbols;
      }
      let password = '';
      for (let i = 0; i < passwordLength; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setGeneratedPassword(password);
      // Calculate and set password strength after generating
      setPasswordStrength(calculatePasswordStrength(password));
    }
  };

  // Handle accept button click
  const handleAccept = (): void => {
    if (generatedPassword) {
      onAccept(generatedPassword);
    }
  };

  if (!showModal) {
    return null;
  }

  return (
    <NeonModalDialog
      id="password-modal"
      dataAnimate="true"
      neonDialogHasClosed={onClose}
    >
      <div data-slot="dialog-header-title">{translate('powerschoolftp.generate_password')}</div>
      <div data-slot="dialog-body">
        <div className="__neon__form">
          <NeonNumberField
            id="password-length-field"
            dataLabelText={translate('powerschoolftp.password_length_(8-72)')}
            dataSize="large"
            modelValue={passwordLength}
            dataMinValue={8}
            dataMaxValue={72}
            modelValueChange={(value: number | undefined): void => {
              if (value !== undefined) {
                setPasswordLength(value);
              }
            }}
          />

          <NeonCheckboxSingle
            id="pronounceable-field"
            dataLabelText={translate('powerschoolftp.pronounceable_password')}
            dataCheckType="toggle"
            value={pronounceable}
            onInput={(event: any): void => {
              setPronounceable(event.target.checked);
            }}
          />

          {!pronounceable && (
            <div className="__neon__form-row">
              <NeonCheckboxSingle
                id="include-numbers-field"
                dataLabelText={translate('powerschoolftp.include_numbers')}
                dataCheckType="toggle"
                value={includeNumbers}
                onInput={(event: any): void => {
                  setIncludeNumbers(event.target.checked);
                }}
              />
              <NeonCheckboxSingle
                id="include-symbols-field"
                dataLabelText={translate('powerschoolftp.include_symbols')}
                dataCheckType="toggle"
                value={includeSymbols}
                onInput={(event: any): void => {
                  setIncludeSymbols(event.target.checked);
                }}
              />

            </div>
          )}

          <NeonTextField
            id="generated-password-field"
            dataLabelText={translate('powerschoolftp.generated_password')}
            dataSize="large"
            dataIsPassword="true"
            modelValue={generatedPassword}
            modelValueChange={(value: string | undefined): void => {
              // Required non-empty function
            }}
          />

          {generatedPassword && showStrengthMeter && (
            <NeonRatingField
              id="password-strength-meter"
              dataLabelText={translate('powerschoolftp.password_strength')}
              dataSize="large"
              dataIsReadOnly="true"
              modelValue={passwordStrength}
              dataType="5-star-rating"
              modelValueChange={(value: number | undefined): void => {
                // Required non-empty function
              }}
            />
          )}
        </div>
      </div>
      <div data-slot="dialog-footer-content">
        <div className="__neon__button-layout">
          <NeonButton
            id="regenerate-button"
            dataText={translate(generatedPassword ? 'powerschoolftp.regenerate' : 'powerschoolftp.generate')}
            dataType="secondary"
            onClick={generatePassword}
            disabled={passwordLength < 8 || passwordLength > 72}
          />
          <NeonButton
            id="accept-button"
            dataText={translate('powerschoolftp.accept')}
            dataType="primary"
            onClick={handleAccept}
            disabled={!generatedPassword}
          />
        </div>
      </div>
    </NeonModalDialog>
  );
}