import React from 'react';
import {render, screen} from '@testing-library/react';
import {act} from 'react-dom/test-utils';
import {MemoryRouter, Route, Routes} from 'react-router-dom';

jest.mock('@ps-refarch-ux/mfe-utils', () => {
  return {
    addApplicationRouterListener: jest.fn(() => {
      return jest.fn();
    }),
    addMfeEventListener: jest.fn((event, cb) => {
      // Simulate event listener removal
      return jest.fn();
    }),
    setTranslations: jest.fn(),
  };
});
jest.mock('@ps-refarch-ux/neon', () => {
  return {
    getBreadcrumbs: jest.fn(function getBreadcrumbs() {
      return Promise.resolve({
        setBreadcrumbs: jest.fn(),
      });
    }),
    loadNeonGlobalStylesAndFonts: jest.fn(),
  };
});
jest.mock('../../../resources/messages/powerschoolftp.json', () => {
  return {};
}, {virtual: true});

const mockUserListPage = jest.fn(function (props: any): JSX.Element { return <div>UserListPage</div>; });
const mockCreateUserPage = jest.fn(function (props: any): JSX.Element { return <div>CreateUserPage</div>; });
const mockEditUserPage = jest.fn(function (props: any): JSX.Element { return <div>EditUserPage</div>; });
const mockFolderListPage = jest.fn(function (props: any): JSX.Element { return <div>FolderListPage</div>; });

jest.mock('../pages/UserListPage', () => {
  return {
    UserListPage: function (props: any): JSX.Element { return mockUserListPage(props); },
  };
});
jest.mock('../pages/CreateUserPage', () => {
  return {
    CreateUserPage: function (props: any): JSX.Element { return mockCreateUserPage(props); },
  };
});
jest.mock('../pages/EditUserPage', () => {
  return {
    EditUserPage: function (props: any): JSX.Element { return mockEditUserPage(props); },
  };
});
jest.mock('../pages/FolderListPage', () => {
  return {
    FolderListPage: function (props: any): JSX.Element { return mockFolderListPage(props); },
  };
});

import {RootComponent} from '../root-component';

describe('RootComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders UserListPage by default', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <RootComponent serverConfig={{}} />
      </MemoryRouter>
    );
    expect(mockUserListPage).toHaveBeenCalled();
    expect(screen.getByText('UserListPage')).toBeInTheDocument();
  });

  it('renders CreateUserPage for /users/create', () => {
    render(
      <MemoryRouter initialEntries={['/users/create']}>
        <RootComponent serverConfig={{}} />
      </MemoryRouter>
    );
    expect(mockCreateUserPage).toHaveBeenCalled();
    expect(screen.getByText('CreateUserPage')).toBeInTheDocument();
  });

  it('renders EditUserPage for /users/edit/123', () => {
    render(
      <MemoryRouter initialEntries={['/users/edit/123']}>
        <RootComponent serverConfig={{}} />
      </MemoryRouter>
    );
    expect(mockEditUserPage).toHaveBeenCalled();
    expect(screen.getByText('EditUserPage')).toBeInTheDocument();
  });

  it('renders FolderListPage for /folders', () => {
    render(
      <MemoryRouter initialEntries={['/folders']}>
        <RootComponent serverConfig={{}} />
      </MemoryRouter>
    );
    expect(mockFolderListPage).toHaveBeenCalled();
    expect(screen.getByText('FolderListPage')).toBeInTheDocument();
  });

  it('calls setTranslations unless translate=no', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {setTranslations} = require('@ps-refarch-ux/mfe-utils');
    render(
      <MemoryRouter initialEntries={['/?foo=bar']}>
        <RootComponent serverConfig={{}} />
      </MemoryRouter>
    );
    expect(setTranslations).toHaveBeenCalled();

    jest.clearAllMocks();
    render(
      <MemoryRouter initialEntries={['/?translate=no']}>
        <RootComponent serverConfig={{}} />
      </MemoryRouter>
    );
    expect(setTranslations).not.toHaveBeenCalled();
  });

  it('handles sessionRef event and updates state', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {addMfeEventListener} = require('@ps-refarch-ux/mfe-utils');
    let eventCallback: any;
    (addMfeEventListener as jest.Mock).mockImplementation((event, cb) => {
      eventCallback = cb;
      return jest.fn();
    });

    render(
      <MemoryRouter>
        <RootComponent serverConfig={{waitForSessionRef: true}} />
      </MemoryRouter>
    );

    // Clear the initial call
    mockUserListPage.mockClear();

    // Simulate event with act to handle state updates
    act(() => {
      eventCallback({
        context: {
          headerName: 'X-Session-Ref',
          headerValue: 'abc',
        },
      });
    });

    // Should update UserListPage with new sessionRef after the event
    expect(mockUserListPage).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionRef: expect.objectContaining({
          headerName: 'X-Session-Ref',
          headerValue: 'abc',
        }),
      })
    );
  });
});