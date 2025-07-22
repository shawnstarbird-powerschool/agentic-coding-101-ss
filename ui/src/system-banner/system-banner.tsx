import {NeonButton, NeonSystemBanner, hideTopSystemBanner} from '@ps-refarch-ux/neon';
import React, {ReactElement} from 'react';

export function SystemBanner(): ReactElement {
  return <>
    <NeonSystemBanner dataIcon="dashboard-1" dataText="This is the system banner">
      <div data-slot="neon-system-banner-buttons">
        <NeonButton id="__mfe__system-banner-button-1" dataText="Button 1" onClick={(): void => {
          console.log('the button was clicked');
          hideTopSystemBanner('powerschool-ftp');
        }}/>
      </div>
    </NeonSystemBanner>
  </>;
}