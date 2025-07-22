import React from 'react';
import {NeonTabs} from '@ps-refarch-ux/neon';
import {translate} from '@ps-refarch-ux/mfe-utils';
import {ftpNavigate} from '../shared/nav-utils';
import {SessionRef} from '../types/session-types';

interface NavigationTabsProps {
  currentTab: string;
  sessionRef: SessionRef;
}

/**
 * Navigation tabs component for switching between Users and Folders views
 */
export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  currentTab,
  sessionRef
}) => {
  return (
    <NeonTabs
      id="admin-navigation-tabs"
      currentTab={currentTab}
      tabSelectionChanged={(tabId: string): void => {
        if (tabId === 'folders-tab') {
          ftpNavigate(sessionRef, 'folders');
        } else {
          ftpNavigate(sessionRef, 'users');
        }
      }}
    >
      <div data-tab-text={translate('powerschoolftp.users')} data-tab-id="users-tab">
        {/* Users tab content is rendered in the parent component */}
      </div>
      <div data-tab-text={translate('powerschoolftp.folders')} data-tab-id="folders-tab">
        {/* Folders tab content is rendered in the parent component */}
      </div>
    </NeonTabs>
  );
};

export default NavigationTabs;
