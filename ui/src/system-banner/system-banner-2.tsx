import {NeonButton, NeonSystemBanner, hideTopSystemBanner} from '@ps-refarch-ux/neon';
import React, {ReactElement} from 'react';

export function SystemBanner2(): ReactElement {
  return <>
    <NeonSystemBanner dataIcon="balance" dataText="This is the system banner 2">
      <div data-slot="neon-system-banner-buttons">
        <NeonButton id="__mfe__system-banner-2-button-1" dataText="Button 1" onClick={(): void => {
          console.log('the button was clicked');
          hideTopSystemBanner('powerschool-ftp');
        }}/>
      </div>
    </NeonSystemBanner>
  </>;
}