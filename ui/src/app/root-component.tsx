/* eslint-disable object-curly-spacing */
import {
  addApplicationRouterListener,
  addMfeEventListener, MfeEvent,
  setTranslations
} from '@ps-refarch-ux/mfe-utils';
import React, { ReactElement, useEffect, useState } from 'react';
import { CreateUserPage } from './pages/CreateUserPage';
import { EditUserPage } from './pages/EditUserPage';
import { FolderListPage } from './pages/FolderListPage';
import { UserListPage } from './pages/UserListPage';
import './root-component.scss';
import { SessionRef } from './types/session-types';

import {
  NavigateFunction,
  Route,
  Routes,
  useLocation,
  useNavigate
} from 'react-router-dom';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unused-vars
const MESSAGES = require('../../../resources/messages/powerschoolftp.json');

import {
  Breadcrumbs,
  getBreadcrumbs,
  loadNeonGlobalStylesAndFonts
} from '@ps-refarch-ux/neon';

interface ServerConfig {
  waitForSessionRef?: boolean;
  MFE_BACKEND_SERVER?: string;
}

export function RootComponent(props: any): ReactElement {
  console.log('%% RootComponent invoked. Props:', JSON.stringify(props));
  const navigate: NavigateFunction = useNavigate();
  const serverConfig: ServerConfig = props.serverConfig || {};
  const location = useLocation();
  const mfeBackendServer = serverConfig.MFE_BACKEND_SERVER || undefined;
  const injectionRoute = props.injectionRoute;

  const [sessionRef, setSessionRef] = useState<SessionRef>({
    headerName: serverConfig.waitForSessionRef ? 'X-Session-Ref' : undefined,
    headerValue: undefined,
    mfeBackendServer: mfeBackendServer?.endsWith('/') ? mfeBackendServer.slice(0, -1) : mfeBackendServer,
    injectionRoute
  });

  console.log('RootComponent: props:', props, 'serverConfig', serverConfig, 'sessionRef:', sessionRef);

  // Check if the query string contains "translate=no"
  const queryParams = new URLSearchParams(location.search);
  const skipTranslation = queryParams.get('translate') === 'no';

  // Only set translations if not explicitly disabled
  if (!skipTranslation) {
    setTranslations(MESSAGES);
  }

  useEffect(() => {

    console.log('* * * MFE STARTER Pack - root-component * * *');
    console.log('% % % The powerschool-ftp location has changed % % %', location);
  }, [location]);

  // Effect to listen for session reference events
  useEffect(() => {
    // Add listener for set-session-ref event
    const removeSessionRefListener = addMfeEventListener('set-session-ref', (event: MfeEvent) => {
      console.log('Received set-session-ref event:', event);
      if (event.context && event.context.headerName) {
        setSessionRef({
          headerName: event.context.headerName,
          headerValue: event.context.headerValue,
          mfeBackendServer,
          injectionRoute
        });
        console.log(`Session reference set: ${event.context.headerName}=${event.context.headerValue}`);
      }
    });

    return () => {
      removeSessionRefListener();
    };
  }, []);

  useEffect((): (() => void) => {
    loadNeonGlobalStylesAndFonts();

    //Adds a global listener for 'route-change' events
    const removeMfeEventListener = addApplicationRouterListener(injectionRoute, navigate);

    return (): void => {
      //this is the cleanup function
      removeMfeEventListener();
      getBreadcrumbs().then((breadcrumbs: Breadcrumbs) => {
        breadcrumbs.setBreadcrumbs('__MFE_NAME_SPACE_PREFIX__', []);
      });
    };
  }, []);

  return (
    <Routes>
      <Route path="*" element={<UserListPage sessionRef={sessionRef} />} />

      {/* User Administration Routes */}
      <Route path="users" element={<UserListPage sessionRef={sessionRef} />} />
      <Route path="users/create" element={<CreateUserPage sessionRef={sessionRef} />} />
      <Route path="users/edit/:userId" element={<EditUserPage sessionRef={sessionRef} />} />
      <Route path="folders" element={<FolderListPage sessionRef={sessionRef} />} />
    </Routes>
  );
}
