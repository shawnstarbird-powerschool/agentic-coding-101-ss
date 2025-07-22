import React from 'react';
import {NeonModalDialog, NeonButton} from '@ps-refarch-ux/neon';

interface ConfirmationModalProps {
  id: string;
  show: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  confirmButtonType?: 'primary' | 'secondary' | 'borderless';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation modal component for confirming user actions
 */
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  id,
  show,
  title,
  message,
  confirmText,
  cancelText,
  confirmButtonType = 'primary',
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  if (!show) {
    return null;
  }

  return (
    <NeonModalDialog
      id={id}
      dataAnimate="true"
      neonDialogHasClosed={onCancel}
    >
      <div data-slot="dialog-header-title" className="__mfe__roboto-font">{title}</div>
      <div data-slot="dialog-body">
        <p className="__neon__text">
          {message}
        </p>
      </div>
      <div data-slot="dialog-footer-content">
        <div className="__neon__button-layout">
          <NeonButton
            id={`${id}-cancel`}
            dataText={cancelText}
            dataType="secondary"
            disabled={isLoading}
            onClick={onCancel}
          />
          <NeonButton
            id={`${id}-confirm`}
            dataText={confirmText}
            dataType={confirmButtonType}
            dataIsLoading={isLoading}
            onClick={onConfirm}
          />
        </div>
      </div>
    </NeonModalDialog>
  );
};

export default ConfirmationModal;
