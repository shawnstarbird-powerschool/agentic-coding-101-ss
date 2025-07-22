import {
  hideSystemBanner,
  NeonAppHeader,
  NeonAvatar,
  NeonAvatarButton,
  NeonButton,
  NeonPopover,
  showSystemBanner
} from '@ps-refarch-ux/neon';
import React, {ReactElement} from 'react';

export function AppHeader(props: any): ReactElement {
  return <NeonAppHeader dataHeading="MFE Starter Pack">
      <div data-slot="app-header-right">
        <NeonPopover id="avatar-button-popover" dataShowHeaderText="false">
          <h2 data-slot="popper-header">Profile Menu</h2>
          <div data-slot="popper-trigger">
            <NeonAvatarButton id="user-profile-button" dataAriaLabel="user profile">
              <NeonAvatar dataSlot="avatar" dataAvatarSize="small" dataFirstName="Cory" dataLastName="Matthews" dataBackgroundOption='high-contrast' />
            </NeonAvatarButton>
          </div>
          <div data-slot="popper-body">
            <h1 className="__neon__text">System banner controls</h1>
              <NeonButton
                id="button-in-popover"
                dataText="Show System Banner"
                onClick={(): void => {
                  showSystemBanner('powerschool-ftp', 'sample_starter_pack', 'http://localhost:8002/remoteEntry.js', './mfe-system-banner');
                }}
              />
              <NeonButton
                id="button-in-popover-2"
                dataText="Show System Banner 2"
                onClick={(): void => {
                  showSystemBanner('powerschool-ftp', 'sample_starter_pack', 'http://localhost:8002/remoteEntry.js', './mfe-system-banner-2');
                }}
              />
              <NeonButton
                id="button-in-popover-3"
                dataText="Hide System Banner"
                onClick={(): void => {
                  hideSystemBanner('powerschool-ftp', 'sample_starter_pack', 'http://localhost:8002/remoteEntry.js', './mfe-system-banner');
                }}
              />
              <NeonButton
                id="button-in-popover-4"
                dataText="Hide System Banner 2"
                onClick={(): void => {
                  hideSystemBanner('powerschool-ftp', 'sample_starter_pack', 'http://localhost:8002/remoteEntry.js', './mfe-system-banner-2');
                }}
              />

          </div>

        </NeonPopover>

      </div>
    </NeonAppHeader>;
}