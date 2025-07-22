import React, {ReactElement, version as reactVersion, useEffect} from 'react';
import {
  translate,
} from '@ps-refarch-ux/mfe-utils';
import {
  NeonCardStandard,
  NeonErrorCardContent,
  NeonPageHeader,
  Breadcrumbs,
  getBreadcrumbs
} from '@ps-refarch-ux/neon';

(window as any).react1 = React;

export function Home(props: any): ReactElement {

  useEffect(() => {
    getBreadcrumbs().then((breadcrumbs: Breadcrumbs) => {
      breadcrumbs.setBreadcrumbs('__MFE_NAME_SPACE_PREFIX__', [{
        text: 'mfe-1 (Home Component)',
        url: 'mfe-1'
      }]);
    });

    return (): void => {
      getBreadcrumbs().then((breadcrumbs: Breadcrumbs) => {
        breadcrumbs.setBreadcrumbs('__MFE_NAME_SPACE_PREFIX__', []);
      });
    };
  }, []);

  return (
<>
<NeonPageHeader
        dataHeading={translate('mfe starter pack|home|This is the MFE Starter Pack HOME page.')}
        dataSubheading={'running on React: ' + reactVersion}

        dataTextColor='white'></NeonPageHeader>
        <div className='__neon__page-padding'>
        <div className='__neon__grid-container'>
          <div className="__neon__grid-1-3">
            <NeonCardStandard
              dataHeading={translate('mfe starter pack|home|Welcome to the mfe-starter pack home page.')}
            >
              <div data-slot="body">
                <p className='__neon__text'>This is the home page - I think it's pretty great!</p>
              </div>
            </NeonCardStandard>
          </div>
          <div className="__neon__grid-1-3">
            <NeonCardStandard
              dataHeading="Worry not! This is only an error example."
            >
              <div data-slot="body">
                <NeonErrorCardContent
                  dataIllustration='search'
                  dataErrorText="I'm a big fan of the google glass wearing cat."
                />
              </div>
            </NeonCardStandard>
          </div>
          <div className="__neon__grid-1-3">
            <NeonCardStandard
              dataHeading="User Administration"
            >
              <div data-slot="body">
                <p className='__neon__text'>Manage FTP users and folders:</p>
                <ul className='__neon__list'>
                  <li>
                    <a href="/users" className='__neon__text __neon__text-link'>User Management</a>
                  </li>
                  <li>
                    <a href="/folders" className='__neon__text __neon__text-link'>Folder Management</a>
                  </li>
                </ul>
              </div>
            </NeonCardStandard>
          </div>
        </div>
        </div>

</>
  );
}