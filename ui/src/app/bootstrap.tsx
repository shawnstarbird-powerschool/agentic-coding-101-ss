/* eslint-disable object-curly-spacing */
import { dispatchMfeEvent } from '@ps-refarch-ux/mfe-utils';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { RootComponent } from './root-component';

// Define the dev config interface
interface DevConfig {
  sessionRefHeader: string;
  sessionRefValue: string;
  mfeBackendServer?: string;
}

// Load the dev config statically
// eslint-disable-next-line @typescript-eslint/no-var-requires
const devConfig = ((): DevConfig => {
  try {
    return require('./dev-config.json');
  }
  catch (error) {
    console.error('Error loading dev-config.json:', error);
    return {
      sessionRefHeader: 'X-Session-Ref',
      sessionRefValue: 'default-session-ref-value'
    };
  }
})();

declare global {
  namespace JSX {
      interface IntrinsicElements {
          '__neon__hello-world': any;
          '__neon__button': any;
          '__neon__card-standard': any;
          '__neon__tag': any;
          '__neon__tooltip': any;
          '__neon__avatar': any;
      }
  }
}

console.log('This file is for running your MFE stand alone. Note: this file will not be rendered via module federation.');

// Check if we're running in development mode
const isDevelopment = window.location.hostname === 'localhost';

// If in development mode, dispatch the session reference event
if (isDevelopment) {
  console.log('Running in development mode, using session reference from dev-config.json');

  // First dispatch event with undefined headerValue to trigger waiting behavior
  dispatchMfeEvent(
    'powerftp-app',
    'set-session-ref',
    {
      headerName: devConfig.sessionRefHeader,
      headerValue: undefined
    }
  );
  console.log(`Dispatched initial set-session-ref event with header: ${devConfig.sessionRefHeader}`);

  // Then dispatch event with actual headerValue after a short delay
  setTimeout(() => {
    dispatchMfeEvent(
      'powerftp-app',
      'set-session-ref',
      {
        headerName: devConfig.sessionRefHeader,
        headerValue: devConfig.sessionRefValue
      }
    );
    console.log(`Dispatched final set-session-ref event with header value: ${devConfig.sessionRefValue}`);
  }, 1000); // 1 second delay
}

// Render the app
const injectionElement: HTMLElement | null = document.getElementById('react-app-injection');
if (injectionElement != null) {
  createRoot(injectionElement).render((
    <BrowserRouter>
        <RootComponent serverConfig={{
          waitForSessionRef: isDevelopment,
          MFE_BACKEND_SERVER: devConfig.mfeBackendServer || `https://api.${window.location.hostname}`
        }} />
    </BrowserRouter>),
  );
}
