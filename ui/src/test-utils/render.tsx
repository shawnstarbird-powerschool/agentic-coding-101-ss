import React from 'react';
import {render as rtlRender, RenderResult, RenderOptions} from '@testing-library/react';
import {BrowserRouter} from 'react-router-dom';

export const getRenderWrapper = (CustomWrapper: React.JSXElementConstructor<{ children: React.ReactElement }>): any => { return ({children}) => { return (
    <BrowserRouter>
        <CustomWrapper>
            {children}
        </CustomWrapper>
    </BrowserRouter>
); }; };

const noopComponent: React.FC<React.PropsWithChildren<any>> = ({children}) => { return <>{children}</>; };

export const render = (ui, options: RenderOptions = {}): RenderResult => {
    const customWrapper = options.wrapper || noopComponent;

    const opt: RenderOptions = {
        ...options,
        wrapper: getRenderWrapper(customWrapper),
    };
    return rtlRender(ui, opt);
};
