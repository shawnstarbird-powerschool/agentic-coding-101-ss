import {useState, useEffect, useCallback} from 'react';
import {ToastType, ToastState} from '../types/common-types';

/**
 * Custom hook for managing toast notifications
 * @param autoDismissTime Time in milliseconds to auto-dismiss the toast (default: 5000)
 * @returns Object with toast state and operations
 */
export const useToast = (autoDismissTime = 5000): {
  toast: ToastState;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
} => {
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'info',
    datetime: undefined
  });

  // Show toast notification
  const showToast = useCallback((message: string, type: ToastType = 'info'): void => {
    setToast({
      show: true,
      message,
      type,
      datetime: new Date()
    });
  }, []);

  // Hide toast notification
  const hideToast = useCallback((): void => {
    setToast((prevToast) => {
      return {
        ...prevToast,
        show: false
      };
    });
  }, []);

  // Auto-dismiss toast after specified time
  useEffect(() => {
    if (toast.show && autoDismissTime > 0) {
      const timer = setTimeout(() => {
        hideToast();
      }, autoDismissTime);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [toast.show, autoDismissTime, hideToast]);

  return {
    toast,
    showToast,
    hideToast
  };
};

export default useToast;
