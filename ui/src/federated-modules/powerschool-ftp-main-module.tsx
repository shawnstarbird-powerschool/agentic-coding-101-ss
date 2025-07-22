import {
  DynamicConfigController,
  MfeInitFunctionConfig,
  MfeInitFunctionResponse,
  MfeWrapper,
  psMfe,
} from '@ps-refarch-ux/mfe-utils';
import {
  Breadcrumbs,
  applyNeonStylesToShadowDom,
  getBreadcrumbs
} from '@ps-refarch-ux/neon';
import React, {ReactElement} from 'react';
import {Root, createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {RootComponent} from '../app/root-component';

export default psMfe({
  psMfeInit: function mfeStarterPackInit(config: MfeInitFunctionConfig): Promise<MfeInitFunctionResponse> {
    console.log(' = = = psMfeInit called from powerschool-ftp = = = ');
    console.log('%% element: ', config.element);
    console.log('%% locale: ', config.locale);
    console.log('%% injectionRoute: ', config.injectionRoute);
    console.log('%% context info: ', [config.exampleContextInfoStarterPack1, config.exampleContextInfoStarterPack2, config.exampleContextInfoStarterPack3]);

    //Reserve breadcrumbs spot.
    getBreadcrumbs().then((breadcrumbs: Breadcrumbs): void => {
      breadcrumbs.turnOnBreadcrumbsFor('__MFE_NAME_SPACE_PREFIX__');
    });

    const configController = new DynamicConfigController(config);

    const shadowRoot: ShadowRoot = config.element.attachShadow({mode: 'open'});
    let reactRoot: Root | undefined = createRoot(shadowRoot);

    const injectionRoute = config.injectionRoute && !config.injectionRoute.endsWith('/*') ? `${config.injectionRoute}/*` : config.injectionRoute;

    //Note that the attribute neon-react-root tells Neon where the react root is which is important for Neon to work properly.
    reactRoot.render(<div neon-react-root=""><MfeWrapper
      configController={configController}
      mfeComponent={(dynamicConfig: MfeInitFunctionConfig): ReactElement => {
        return <MemoryRouter>
        <RootComponent
          injectionRoute={injectionRoute}
          serverConfig={dynamicConfig.serverConfig}
          exampleContextInfoStarterPack1={dynamicConfig.exampleContextInfoStarterPack1}
          exampleContextInfoStarterPack2={dynamicConfig.exampleContextInfoStarterPack2}
          exampleContextInfoStarterPack3={dynamicConfig.exampleContextInfoStarterPack3}
          dynamicExampleProp={dynamicConfig.changingProp}
        />
      </MemoryRouter>;
      }}
    /></div>);

    //Grab the stylesheet objects out of the Set in the remote
    //and add them to to the shadowRoot
    const remote: any = window['__MFE_NAME_SPACE_PREFIX__'.replace(/-/g, '_')];
    if (remote != null && remote.styleTags != null) {
      for (const style of Array.from(remote.styleTags.values())) {
        shadowRoot.adoptedStyleSheets.push(style as CSSStyleSheet);
      }
    }

    //Apply the neon web component styles to the shadow dom
    const unloadShadowDom  = applyNeonStylesToShadowDom(shadowRoot);

    return Promise.resolve({
      unloadMfe: function(): void {
        console.log('= = = unloadMfe called. = = =');

        //The unload function has access to everything inside the init function
        unloadShadowDom();
        if (reactRoot != null) {
          reactRoot.unmount();
          reactRoot = undefined;
        }
        getBreadcrumbs().then((breadcrumbs: Breadcrumbs): void => {
          breadcrumbs.turnOffBreadcrumbsFor('__MFE_NAME_SPACE_PREFIX__');
        });

      },
      updateMfeConfig: function(newConfig: MfeInitFunctionConfig): void {
        configController.updateConfig(newConfig);
     }
    });
  }
});