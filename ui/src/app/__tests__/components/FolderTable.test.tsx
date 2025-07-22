import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import FolderTable from '../../components/FolderTable';
import {Folder} from '../../types/folder-types';

describe('FolderTable', () => {
  const mockFolders: Array<Folder> = [
    {
      id: '1',
      productCode: 'PROD1',
      use: 'test-use',
      path: '/test/path',
      accessType: 'inbound',
      active: true,
    },
    {
      id: '2',
      productCode: 'PROD2',
      use: 'another-use',
      path: '/another/path',
      accessType: 'outbound',
      active: true,
    },
  ];

  const defaultProps = {
    folders: mockFolders,
    loading: false,
    error: null,
    processingFolderId: null,
    hasInitialized: true,
    onEditFolder: jest.fn(),
    onDeactivateFolder: jest.fn(),
    getProductName: (code: string): string => {
      return `Product ${code}`;
    },
    showInactiveFolders: false,
    onToggleFolderStatus: jest.fn(),
    retryFunction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading skeleton when loading', () => {
    render(<FolderTable {...defaultProps} loading={true} />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('loading-skeleton')).toHaveAttribute('data-type', 'table');
  });

  it('renders error message when error exists', () => {
    const error = 'Test error message';
    render(<FolderTable {...defaultProps} error={error} />);
    expect(screen.getByText(error)).toBeInTheDocument();
    // Check that retry button is present (part of ErrorCard)
    expect(screen.getByText('powerschoolftp.retry')).toBeInTheDocument();
  });

  it('renders table headers correctly', () => {
    render(<FolderTable {...defaultProps} />);
    expect(screen.getByTestId('product-column')).toHaveTextContent('powerschoolftp.product');
    expect(screen.getByTestId('use-column')).toHaveTextContent('powerschoolftp.type');
    expect(screen.getByTestId('path-column')).toHaveTextContent('powerschoolftp.directory');
    expect(screen.getByTestId('access-type-column')).toHaveTextContent('powerschoolftp.access');
    expect(screen.getByTestId('actions-column')).toHaveTextContent('powerschoolftp.actions');
  });

  it('renders folder data correctly', () => {
    render(<FolderTable {...defaultProps} />);

    mockFolders.forEach((folder) => {
      expect(screen.getByText(`Product ${folder.productCode}`)).toBeInTheDocument();
      expect(screen.getByText(folder.use)).toBeInTheDocument();
      expect(screen.getByText(folder.path)).toBeInTheDocument();
      expect(screen.getByText(`powerschoolftp.${folder.accessType}`)).toBeInTheDocument();
    });
  });

  it('handles edit button clicks', () => {
    render(<FolderTable {...defaultProps} />);

    mockFolders.forEach((folder) => {
      fireEvent.click(screen.getByTestId(`edit-folder-${folder.id}`));
      expect(defaultProps.onEditFolder).toHaveBeenCalledWith(folder);
    });
  });

  it('handles deactivate button clicks', () => {
    render(<FolderTable {...defaultProps} />);

    mockFolders.forEach((folder) => {
      fireEvent.click(screen.getByTestId(`toggle-folder-${folder.id}`));
      expect(defaultProps.onDeactivateFolder).toHaveBeenCalledWith(folder);
    });
  });

  it('shows loading state for processing folder', () => {
    render(<FolderTable {...defaultProps} processingFolderId="1" />);

    const processingButton = screen.getByTestId('toggle-folder-1');
    const normalButton = screen.getByTestId('toggle-folder-2');

    expect(processingButton).toBeDisabled();
    expect(normalButton).not.toBeDisabled();
  });

  it('translates access types correctly', () => {
    render(<FolderTable {...defaultProps} />);

    expect(screen.getByText('powerschoolftp.inbound')).toBeInTheDocument();
    expect(screen.getByText('powerschoolftp.outbound')).toBeInTheDocument();
  });

  it('handles unknown access type', () => {
    const foldersWithUnknownType = [
      {...mockFolders[0], accessType: 'unknown'},
    ];

    render(<FolderTable {...defaultProps} folders={foldersWithUnknownType} />);
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });
});