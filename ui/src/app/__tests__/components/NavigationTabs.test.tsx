import React from 'react';
import {render, screen} from '@testing-library/react';
import {NavigationTabs} from '../../components/NavigationTabs';
import {ftpNavigate} from '../../shared/nav-utils';

jest.mock('../../shared/nav-utils', () => {
  return {
    ftpNavigate: jest.fn(),
  };
});

describe('NavigationTabs', () => {
  const sessionRef = {
    headerName: 'X-Session',
    headerValue: 'test-session',
    mfeBackendServer: 'http://localhost:3000',
  };

  const defaultProps = {
    currentTab: 'users-tab',
    sessionRef,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct tabs', () => {
    render(<NavigationTabs {...defaultProps} />);

    expect(screen.getByTestId('admin-navigation-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('users-tab')).toBeInTheDocument();
    expect(screen.getByTestId('folders-tab')).toBeInTheDocument();
    expect(screen.getByText('powerschoolftp.users')).toBeInTheDocument();
    expect(screen.getByText('powerschoolftp.folders')).toBeInTheDocument();
  });

  it('highlights current tab', () => {
    const {rerender} = render(<NavigationTabs {...defaultProps} />);
    expect(screen.getByTestId('users-tab')).toHaveAttribute('data-current', 'true');
    expect(screen.getByTestId('folders-tab')).toHaveAttribute('data-current', 'false');

    rerender(<NavigationTabs {...defaultProps} currentTab="folders-tab" />);
    expect(screen.getByTestId('users-tab')).toHaveAttribute('data-current', 'false');
    expect(screen.getByTestId('folders-tab')).toHaveAttribute('data-current', 'true');
  });

  it('navigates to folders view when folders tab is clicked', () => {
    render(<NavigationTabs {...defaultProps} />);
    screen.getByTestId('folders-tab').click();
    expect(ftpNavigate).toHaveBeenCalledWith(sessionRef, 'folders');
  });

  it('navigates to users view when users tab is clicked', () => {
    render(<NavigationTabs {...defaultProps} currentTab="folders-tab" />);
    screen.getByTestId('users-tab').click();
    expect(ftpNavigate).toHaveBeenCalledWith(sessionRef, 'users');
  });

  it('preserves navigation behavior when currentTab changes', () => {
    const {rerender} = render(<NavigationTabs {...defaultProps} />);

    screen.getByTestId('folders-tab').click();
    expect(ftpNavigate).toHaveBeenLastCalledWith(sessionRef, 'folders');

    rerender(<NavigationTabs {...defaultProps} currentTab="folders-tab" />);

    screen.getByTestId('users-tab').click();
    expect(ftpNavigate).toHaveBeenLastCalledWith(sessionRef, 'users');
  });
});