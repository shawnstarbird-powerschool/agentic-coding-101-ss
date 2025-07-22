import React from 'react';
import {NeonToast} from '@ps-refarch-ux/neon';
import {ToastType} from '../types/common-types';

interface ToastNotificationProps {
  id: string;
  show: boolean;
  message: string;
  type: ToastType;
  datetime?: Date;
  onClose: () => void;
}

/**
 * Toast notification component for displaying messages
 */
export const ToastNotification: React.FC<ToastNotificationProps> = ({
  id,
  show,
  message,
  type,
  datetime,
  onClose
}) => {
  if (!show) {
    return null;
  }

  return (
    <NeonToast
      id={id}
      dataType={type}
      dataHeading={message}
      datetime={datetime}
      neonToastCloseButtonClick={onClose}
    />
  );
};

export default ToastNotification;
