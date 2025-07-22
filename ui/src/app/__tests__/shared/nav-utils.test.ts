import {ftpNavigate} from '../../shared/nav-utils';
import {appShellNavigate, resolveMfeRoute} from '@ps-refarch-ux/mfe-utils';
import {SessionRef} from '../../types/session-types';

// Mock the mfe-utils functions
jest.mock('@ps-refarch-ux/mfe-utils', () => {
  return {
    appShellNavigate: jest.fn(),
    resolveMfeRoute: jest.fn((base, route) => {
      return `${base}/${route}`;
    })
  };
});

describe('nav-utils', () => {
  // Keep reference to original window.location
  const originalLocation = window.location;

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {href: ''},
      writable: true
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
      writable: true
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.location.href = '';
  });

  describe('ftpNavigate', () => {
    it('should use appShellNavigate when injectionRoute is provided', () => {
      const sessionRef: SessionRef = {
        mfeBackendServer: 'http://test-server',
        injectionRoute: '/inject'
      };
      const route = 'users';

      ftpNavigate(sessionRef, route);

      expect(resolveMfeRoute).toHaveBeenCalledWith('/inject', 'users');
      expect(appShellNavigate).toHaveBeenCalledWith('powerschool-ftp', '/inject/users');
      expect(window.location.href).toBe('');
    });

    it('should use window.location.href when no injectionRoute is provided', () => {
      const sessionRef: SessionRef = {
        mfeBackendServer: 'http://test-server'
      };
      const route = '/users';

      ftpNavigate(sessionRef, route);

      expect(window.location.href).toBe('/users');
      expect(appShellNavigate).not.toHaveBeenCalled();
      expect(resolveMfeRoute).not.toHaveBeenCalled();
    });
  });
});