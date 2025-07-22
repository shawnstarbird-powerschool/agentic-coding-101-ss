// Session utility functions for PowerFTP App

import {SessionRef} from '../types/session-types';

/**
 * Validates if a sessionRef is ready for API calls
 * This function handles both development and production scenarios:
 * - Development: Uses mfeBackendServer from dev-config.json, may not have headers
 * - Production: Uses headerName/headerValue for session authentication
 *
 * @param sessionRef The session reference to validate
 * @returns true if sessionRef is valid and ready for API calls
 */
export function isSessionReady(sessionRef: SessionRef | null | undefined): boolean {
  // No sessionRef at all
  if (!sessionRef) {
    return false;
  }

  // Check if we have a backend server configured (development mode)
  const hasBackendServer = Boolean(sessionRef.mfeBackendServer);

  // Check if we have valid headers (production mode)
  const hasValidHeaders = Boolean(
    sessionRef.headerName && sessionRef.headerValue
  );

  // Check for invalid header configuration (headerName without headerValue)
  const hasIncompleteHeaders = Boolean(
    sessionRef.headerName && !sessionRef.headerValue
  );

  // Session is ready if we have either:
  // 1. A backend server (dev mode), OR
  // 2. Complete headers (production mode)
  // But NOT if we have incomplete headers
  return (hasBackendServer || hasValidHeaders) && !hasIncompleteHeaders;
}

/**
 * Gets the appropriate headers for API calls based on sessionRef
 * @param sessionRef The session reference
 * @returns Headers object or undefined
 */
export function getSessionHeaders(sessionRef: SessionRef): Record<string, string> | undefined {
  if (sessionRef?.headerName && sessionRef?.headerValue) {
    return {
      [sessionRef.headerName]: sessionRef.headerValue
    };
  }
  return undefined;
}

/**
 * Gets the base URL for API calls
 * @param sessionRef The session reference
 * @returns Base URL string
 */
export function getBaseUrl(sessionRef: SessionRef): string {
  return sessionRef?.mfeBackendServer || '';
}
