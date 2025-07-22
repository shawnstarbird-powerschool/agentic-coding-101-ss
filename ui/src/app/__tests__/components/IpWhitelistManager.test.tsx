import React from 'react';
import type {RenderResult} from '@testing-library/react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import {IpWhitelistManager} from '../../components/IpWhitelistManager';

// Type declarations
interface IpWhitelistManagerProps {
  value: string;
  onChange: (value: string) => void;
}

declare global {
  // Extend jest matchers
  namespace jest {
    interface Matchers<R> {
      toHaveTextContent: (text: string) => R;
      toBeInTheDocument: () => R;
      toHaveValue: (value: string) => R;
    }
  }
}

describe('IpWhitelistManager', () => {
  const defaultProps: IpWhitelistManagerProps = {
    value: '',
    onChange: jest.fn()
  };

  let renderResult: RenderResult | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (renderResult) {
      renderResult.unmount();
    }
    renderResult = null;
  });

  it('renders the component with basic elements', () => {
    renderResult = render(<IpWhitelistManager {...defaultProps} />);

    expect(screen.getByText('powerschoolftp.ip_whitelist')).toBeInTheDocument();
    expect(screen.getByTestId('new-ip-entry')).toBeInTheDocument();
    expect(screen.getByTestId('add-ip-button')).toBeInTheDocument();
    expect(screen.getByText('powerschoolftp.current_ip_whitelist')).toBeInTheDocument();
  });

  it('displays empty state message when no IP entries exist', () => {
    renderResult = render(<IpWhitelistManager {...defaultProps} />);

    expect(screen.getByText('powerschoolftp.no_ip_addresses_in_whitelist._all_ip_addresses_will_be_allowed')).toBeInTheDocument();
  });

  it('initializes with existing IP addresses from value prop', async () => {
    const initialValue = '192.168.1.1/32\n10.0.0.0/24';
    renderResult = render(<IpWhitelistManager value={initialValue} onChange={defaultProps.onChange} />);

    await waitFor(() => {
      expect(screen.getByText('192.168.1.1/32')).toBeInTheDocument();
      expect(screen.getByText('10.0.0.0/24')).toBeInTheDocument();
    });
  });

  it('sorts IP addresses numerically', async () => {
    const initialValue = '192.168.1.1/32,10.0.0.0/24,172.16.0.1/32';
    renderResult = render(<IpWhitelistManager value={initialValue} onChange={defaultProps.onChange} />);

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // Skip header row, check data rows
      expect(rows[1]).toHaveTextContent('10.0.0.0/24');
      expect(rows[2]).toHaveTextContent('172.16.0.1/32');
      expect(rows[3]).toHaveTextContent('192.168.1.1/32');
    });
  });

  it('adds a valid IPv4 address', async () => {
    renderResult = render(<IpWhitelistManager {...defaultProps} />);

    const input = screen.getByTestId('new-ip-entry-input');
    const addButton = screen.getByTestId('add-ip-button');

    fireEvent.change(input, {target: {value: '8.8.8.8'}});
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('8.8.8.8/32')).toBeInTheDocument();
      expect(defaultProps.onChange).toHaveBeenCalledWith('8.8.8.8/32');
    });
  });

  it('adds a valid CIDR range', async () => {
    renderResult = render(<IpWhitelistManager {...defaultProps} />);

    const input = screen.getByTestId('new-ip-entry-input');
    const addButton = screen.getByTestId('add-ip-button');

    fireEvent.change(input, {target: {value: '203.0.113.0/24'}});
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('203.0.113.0/24')).toBeInTheDocument();
      expect(defaultProps.onChange).toHaveBeenCalledWith('203.0.113.0/24');
    });
  });

  it('shows error for empty input', async () => {
    renderResult = render(<IpWhitelistManager {...defaultProps} />);

    const addButton = screen.getByTestId('add-ip-button');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('ip-validation-error')).toBeInTheDocument();
      expect(screen.getByText('powerschoolftp.please_enter_an_ip_address_or_cidr_range')).toBeInTheDocument();
    });
  });

  it('shows error for invalid IP format', async () => {
    renderResult = render(<IpWhitelistManager {...defaultProps} />);

    const input = screen.getByTestId('new-ip-entry-input');
    const addButton = screen.getByTestId('add-ip-button');

    fireEvent.change(input, {target: {value: 'invalid.ip.address'}});
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('ip-validation-error')).toBeInTheDocument();
      expect(screen.getByText('powerschoolftp.invalid_ip_address_or_cidr_range_format')).toBeInTheDocument();
    });
  });

  it('shows error for private IP addresses', async () => {
    renderResult = render(<IpWhitelistManager {...defaultProps} />);

    const input = screen.getByTestId('new-ip-entry-input');
    const addButton = screen.getByTestId('add-ip-button');

    fireEvent.change(input, {target: {value: '192.168.1.1'}});
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('ip-validation-error')).toBeInTheDocument();
      expect(screen.getByText('powerschoolftp.private_ip_not_allowed')).toBeInTheDocument();
    });
  });

  it('shows error for CIDR ranges containing private IPs', async () => {
    renderResult = render(<IpWhitelistManager {...defaultProps} />);

    const input = screen.getByTestId('new-ip-entry-input');
    const addButton = screen.getByTestId('add-ip-button');

    fireEvent.change(input, {target: {value: '192.168.0.0/16'}});
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('ip-validation-error')).toBeInTheDocument();
      expect(screen.getByText('powerschoolftp.cidr_ranges_containing_private_ip_addresses_are_not_allowed')).toBeInTheDocument();
    });
  });

  it('shows error for duplicate IP addresses', async () => {
    const initialValue = '8.8.8.8/32';
    renderResult = render(<IpWhitelistManager value={initialValue} onChange={defaultProps.onChange} />);

    await waitFor(() => {
      expect(screen.getByText('8.8.8.8/32')).toBeInTheDocument();
    });

    const input = screen.getByTestId('new-ip-entry-input');
    const addButton = screen.getByTestId('add-ip-button');

    fireEvent.change(input, {target: {value: '8.8.8.8'}});
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('ip-validation-error')).toBeInTheDocument();
      expect(screen.getByText('powerschoolftp.this_ip_address_or_range_is_already_in_the_whitelist')).toBeInTheDocument();
    });
  });

  it('clears error when input changes', async () => {
    renderResult = render(<IpWhitelistManager {...defaultProps} />);

    const input = screen.getByTestId('new-ip-entry-input');
    const addButton = screen.getByTestId('add-ip-button');

    // First create an error
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('ip-validation-error')).toBeInTheDocument();
    });

    // Then type something to clear the error
    fireEvent.change(input, {target: {value: '8.8.8.8'}});

    await waitFor(() => {
      expect(screen.queryByTestId('ip-validation-error')).not.toBeInTheDocument();
    });
  });

  it('removes an IP entry when remove button is clicked', async () => {
    const initialValue = '8.8.8.8/32\n1.1.1.1/32';
    renderResult = render(<IpWhitelistManager value={initialValue} onChange={defaultProps.onChange} />);

    await waitFor(() => {
      expect(screen.getByText('8.8.8.8/32')).toBeInTheDocument();
      expect(screen.getByText('1.1.1.1/32')).toBeInTheDocument();
    });

    // Remove the first entry
    const removeButton = screen.getByTestId('remove-ip-0');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText('1.1.1.1/32')).not.toBeInTheDocument();
      expect(screen.getByText('8.8.8.8/32')).toBeInTheDocument();
      expect(defaultProps.onChange).toHaveBeenCalledWith('8.8.8.8/32');
    });
  });

  it('displays entry count correctly', async () => {
    const initialValue = '8.8.8.8/32\n1.1.1.1/32\n9.9.9.9/32';
    renderResult = render(<IpWhitelistManager value={initialValue} onChange={defaultProps.onChange} />);

    await waitFor(() => {
      expect(screen.getByText('(3 powerschoolftp.entries)')).toBeInTheDocument();
    });
  });

  it('displays singular entry count for single entry', async () => {
    const initialValue = '8.8.8.8/32';
    renderResult = render(<IpWhitelistManager value={initialValue} onChange={defaultProps.onChange} />);

    await waitFor(() => {
      expect(screen.getByText('(1 powerschoolftp.entry)')).toBeInTheDocument();
    });
  });

  it('displays IP ranges for CIDR notation', async () => {
    const initialValue = '203.0.113.0/24';
    renderResult = render(<IpWhitelistManager value={initialValue} onChange={defaultProps.onChange} />);

    await waitFor(() => {
      expect(screen.getByText('203.0.113.0/24')).toBeInTheDocument();
      expect(screen.getByText('203.0.113.0 - 203.0.113.255')).toBeInTheDocument();
    });
  });

  it('displays single IP for /32 CIDR', async () => {
    const initialValue = '8.8.8.8/32';
    renderResult = render(<IpWhitelistManager value={initialValue} onChange={defaultProps.onChange} />);

    await waitFor(() => {
      expect(screen.getByText('8.8.8.8/32')).toBeInTheDocument();
      expect(screen.getByText('8.8.8.8')).toBeInTheDocument();
    });
  });

  it('clears input field after successful addition', async () => {
    renderResult = render(<IpWhitelistManager {...defaultProps} />);

    const input = screen.getByTestId('new-ip-entry-input');
    const addButton = screen.getByTestId('add-ip-button');

    fireEvent.change(input, {target: {value: '8.8.8.8'}});
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('handles comma-separated initial values', async () => {
    const initialValue = '8.8.8.8/32,1.1.1.1/32';
    renderResult = render(<IpWhitelistManager value={initialValue} onChange={defaultProps.onChange} />);

    await waitFor(() => {
      expect(screen.getByText('8.8.8.8/32')).toBeInTheDocument();
      expect(screen.getByText('1.1.1.1/32')).toBeInTheDocument();
    });
  });

  it('filters out empty entries from initial value', async () => {
    const initialValue = '8.8.8.8/32,\n,\n1.1.1.1/32,';
    renderResult = render(<IpWhitelistManager value={initialValue} onChange={defaultProps.onChange} />);

    await waitFor(() => {
      expect(screen.getByText('8.8.8.8/32')).toBeInTheDocument();
      expect(screen.getByText('1.1.1.1/32')).toBeInTheDocument();
      expect(screen.getByText('(2 powerschoolftp.entries)')).toBeInTheDocument();
    });
  });

  it('validates IPv4 octet ranges correctly', async () => {
    renderResult = render(<IpWhitelistManager {...defaultProps} />);

    const input = screen.getByTestId('new-ip-entry-input');
    const addButton = screen.getByTestId('add-ip-button');

    // Test invalid octet (> 255)
    fireEvent.change(input, {target: {value: '256.1.1.1'}});
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('ip-validation-error')).toBeInTheDocument();
      expect(screen.getByText('powerschoolftp.invalid_ip_address_or_cidr_range_format')).toBeInTheDocument();
    });
  });

  it('validates CIDR prefix length correctly', async () => {
    renderResult = render(<IpWhitelistManager {...defaultProps} />);

    const input = screen.getByTestId('new-ip-entry-input');
    const addButton = screen.getByTestId('add-ip-button');

    // Test invalid prefix length (> 32)
    fireEvent.change(input, {target: {value: '8.8.8.8/33'}});
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('ip-validation-error')).toBeInTheDocument();
      expect(screen.getByText('powerschoolftp.invalid_ip_address_or_cidr_range_format')).toBeInTheDocument();
    });
  });
});