// Common type definitions used across the application

// Toast notification types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastState {
  show: boolean;
  message: string;
  type: ToastType;
  datetime?: Date;
}

// API error response
export interface ApiErrorResponse {
  message?: string;
  code?: string;
}

// Common props for components that need session reference
export interface WithSessionProps {
  sessionRef: {
    headerName?: string;
    headerValue?: string;
    mfeBackendServer?: string;
  };
}

// Navigation tab options
export interface TabOption {
  id: string;
  text: string;
}
