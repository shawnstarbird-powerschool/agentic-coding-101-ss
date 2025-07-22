/* eslint-disable object-curly-spacing */
import { appShellNavigate, resolveMfeRoute } from '@ps-refarch-ux/mfe-utils';
import { SessionRef } from '../types/session-types';

export function ftpNavigate(sessionRef: SessionRef, route: string): void {
  if (sessionRef.injectionRoute) {
    appShellNavigate('powerschool-ftp', resolveMfeRoute(sessionRef.injectionRoute, route));
  } else {
    window.location.href = route;
  }
}