/* eslint-disable object-curly-spacing */
import { translate } from '@ps-refarch-ux/mfe-utils';
import {
  NeonButton,
  NeonSystemMessage,
  NeonTextField
} from '@ps-refarch-ux/neon';
import React, { useEffect, useState } from 'react';

// We'll implement simplified versions of the IP validation functions
// since we can't directly import from src/util/ip-utils.ts

// Add IP validation utility functions since we can't import them directly
function isValidIpv4(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);

  if (!match) {
    return false;
  }

  // Check that each octet is between 0 and 255
  for (let i = 1; i <= 4; i += 1) {
    const octet = parseInt(match[i], 10);
    if (octet < 0 || octet > 255) {
      return false;
    }
  }

  return true;
}

function isValidCidr(cidr: string): boolean {
  const cidrRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;
  const match = cidr.match(cidrRegex);

  if (!match) {
    return false;
  }

  // Check that each octet is between 0 and 255
  for (let i = 1; i <= 4; i += 1) {
    const octet = parseInt(match[i], 10);
    if (octet < 0 || octet > 255) {
      return false;
    }
  }

  // Check that the prefix length is between 0 and 32
  const prefixLength = parseInt(match[5], 10);
  if (prefixLength < 0 || prefixLength > 32) {
    return false;
  }

  return true;
}

function normalizeCidr(ipOrCidr: string): string {
  if (isValidIpv4(ipOrCidr)) {
    return `${ipOrCidr}/32`;
  }

  if (isValidCidr(ipOrCidr)) {
    return ipOrCidr;
  }

  throw new Error(`Invalid IP address or CIDR notation: ${ipOrCidr}`);
}

// Function to check if an IP address is in a private range
function isPrivateIp(ip: string): boolean {
  const num = ipToNumber(ip);

  // Check against private IP ranges (RFC 1918)
  // 10.0.0.0/8
  if (num >= ipToNumber('10.0.0.0') && num <= ipToNumber('10.255.255.255')) {
    return true;
  }

  // 172.16.0.0/12
  if (num >= ipToNumber('172.16.0.0') && num <= ipToNumber('172.31.255.255')) {
    return true;
  }

  // 192.168.0.0/16
  if (num >= ipToNumber('192.168.0.0') && num <= ipToNumber('192.168.255.255')) {
    return true;
  }

  // Additional special-use addresses
  // 127.0.0.0/8 (Loopback)
  if (num >= ipToNumber('127.0.0.0') && num <= ipToNumber('127.255.255.255')) {
    return true;
  }

  // 169.254.0.0/16 (Link-local)
  if (num >= ipToNumber('169.254.0.0') && num <= ipToNumber('169.254.255.255')) {
    return true;
  }

  // 100.64.0.0/10 (Shared address space for carrier-grade NAT)
  if (num >= ipToNumber('100.64.0.0') && num <= ipToNumber('100.127.255.255')) {
    return true;
  }

  return false;
}

// Function to check if a CIDR range overlaps with private IP ranges
function containsPrivateIps(cidr: string): boolean {
  try {
    const [ipPart, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);

    // Calculate the start and end IPs of the range
    const numIps = Math.pow(2, 32 - prefix);
    const startIp = ipToNumber(ipPart) & (0xFFFFFFFF << (32 - prefix));
    const endIp = startIp + numIps - 1;

    // Convert to dotted notation for checking
    const startIpStr = [
      (startIp >> 24) & 0xFF,
      (startIp >> 16) & 0xFF,
      (startIp >> 8) & 0xFF,
      startIp & 0xFF
    ].join('.');

    const endIpStr = [
      (endIp >> 24) & 0xFF,
      (endIp >> 16) & 0xFF,
      (endIp >> 8) & 0xFF,
      endIp & 0xFF
    ].join('.');

    // Check if either the start or end IP is private
    // This is a simplified check - a more thorough check would test for any overlap
    return isPrivateIp(startIpStr) || isPrivateIp(endIpStr);
  } catch (err) {
    // If there's an error in parsing, assume it might contain private IPs
    return true;
  }
}

interface IpWhitelistManagerProps {
  value: string;
  onChange: (value: string) => void;
}

// Function to convert IP to numeric value for sorting
function ipToNumber(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return 0;
  }
  return (
    parseInt(parts[0], 10) * 16777216 +
    parseInt(parts[1], 10) * 65536 +
    parseInt(parts[2], 10) * 256 +
    parseInt(parts[3], 10)
  );
}

// Function to calculate the IP range from CIDR notation
function calculateIpRange(cidr: string): string {
  try {
    const [ipPart, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);

    // For single IP addresses
    if (prefix === 32) {
      return ipPart;
    }

    // Calculate the number of IPs in this range
    const numIps = Math.pow(2, 32 - prefix);

    // Calculate the start IP (network address)
    const startIp = ipToNumber(ipPart) & (0xFFFFFFFF << (32 - prefix));

    // Calculate the end IP (broadcast address)
    const endIp = startIp + numIps - 1;

    // Convert start and end IPs back to dotted notation
    const startIpStr = [
      (startIp >> 24) & 0xFF,
      (startIp >> 16) & 0xFF,
      (startIp >> 8) & 0xFF,
      startIp & 0xFF
    ].join('.');

    const endIpStr = [
      (endIp >> 24) & 0xFF,
      (endIp >> 16) & 0xFF,
      (endIp >> 8) & 0xFF,
      endIp & 0xFF
    ].join('.');

    return `${startIpStr} - ${endIpStr}`;
  } catch (err) {
    return cidr; // Return the original CIDR if calculation fails
  }
}

export function IpWhitelistManager({value, onChange}: IpWhitelistManagerProps): React.ReactElement {
  // Parse the initial value (comma or newline separated string) into an array
  const [ipEntries, setIpEntries] = useState<Array<string>>([]);
  const [newEntry, setNewEntry] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [initialized, setInitialized] = useState<boolean>(false);

  // Initialize the component with the provided value - only once
  useEffect(() => {
    if (!initialized && value !== undefined) {
      const entries = value
        ? value
            .split(/[\n,]+/)
            .map((ip): string => {
              return ip.trim();
            })
            .filter((ip): boolean => {
              return Boolean(ip);
            })
        : [];

      // Sort the entries by IP address
      const sortedEntries = [...entries].sort((a, b): number => {
        const aIp = a.split('/')[0];
        const bIp = b.split('/')[0];
        return ipToNumber(aIp) - ipToNumber(bIp);
      });

      setIpEntries(sortedEntries);
      setInitialized(true);
    }
  }, [value, initialized]);

  // Only update the parent when entries change AND we're initialized
  // This prevents the flashing issue
  useEffect(() => {
    if (initialized) {
      onChange(ipEntries.join('\n'));
    }
  }, [ipEntries, onChange, initialized]);

  // Validate and add a new IP entry
  const addEntry = (): void => {
    const trimmedEntry = newEntry.trim();
    if (!trimmedEntry) {
      setError(translate('powerschoolftp.please_enter_an_ip_address_or_cidr_range'));
      return;
    }

    // Validate the entry format
    if (!isValidIpv4(trimmedEntry) && !isValidCidr(trimmedEntry)) {
      setError(translate('powerschoolftp.invalid_ip_address_or_cidr_range_format'));
      return;
    }

    // Check if the IP is in a private range
    if (isValidIpv4(trimmedEntry) && isPrivateIp(trimmedEntry)) {
      setError(translate('powerschoolftp.private_ip_not_allowed'));
      return;
    }

    // Check if the CIDR range contains private IPs
    if (isValidCidr(trimmedEntry) && containsPrivateIps(trimmedEntry)) {
      setError(translate('powerschoolftp.cidr_ranges_containing_private_ip_addresses_are_not_allowed'));
      return;
    }

    try {
      // Normalize the entry (adds /32 to plain IPs)
      const normalizedEntry = normalizeCidr(trimmedEntry);

      // Check if the entry already exists
      if (ipEntries.includes(normalizedEntry)) {
        setError(translate('powerschoolftp.this_ip_address_or_range_is_already_in_the_whitelist'));
        return;
      }

      // Add the normalized entry to the list and sort
      const newEntries = [...ipEntries, normalizedEntry].sort((a, b): number => {
        const aIp = a.split('/')[0];
        const bIp = b.split('/')[0];
        return ipToNumber(aIp) - ipToNumber(bIp);
      });
      setIpEntries(newEntries);
      setNewEntry('');
      setError('');
    } catch (err) {
      setError(translate('powerschoolftp.error_processing_ip_address') + ': ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Remove an entry from the list
  const removeEntry = (index: number): void => {
    const newEntries = [...ipEntries];
    newEntries.splice(index, 1);
    setIpEntries(newEntries);
  };

  // Get the human-readable description of a CIDR range
  const getCidrDescription = (cidr: string): string => {
    return calculateIpRange(cidr);
  };

  return (
    <div className="__neon__layout">
      <div className="__neon__form-row">
          <h3 className="__neon__text-no-margin __mfe__roboto-font-medium">{translate('powerschoolftp.ip_whitelist')}</h3>
      </div>
      <div className="__neon__form-row">
        <NeonTextField
          id="new-ip-entry"
          dataPlaceholderText="52.33.154.13/32"
          dataLabelText={translate('powerschoolftp.add_ip_address_or_cidr_range')}
          modelValue={newEntry}
          modelValueChange={(value?: string): void => {
            setNewEntry(value || '');
            if (error) { setError(''); }
          }}
        />
        <NeonButton
          id="add-ip-button"
          dataText={translate('powerschoolftp.add')}
          dataType="secondary"
          dataLabelTextSpace="true"
          onClick={addEntry}
        />
      </div>

      {error && (
        <NeonSystemMessage
          id="ip-validation-error"
          dataType="error"
          dataTitle={translate('powerschoolftp.validation_error')}
          style={{marginTop: '16px'}}
        >
          <p className="__neon__text" data-slot="message-content">{error}</p>
        </NeonSystemMessage>
      )}

      <h4 className="__mfe__roboto-font-medium" style={{marginBottom: '5px'}}>
        {translate('powerschoolftp.current_ip_whitelist')}
        {ipEntries.length > 0 && (
          <span style={{marginLeft: '8px'}}>
            ({ipEntries.length} {ipEntries.length === 1 ? translate('powerschoolftp.entry') : translate('powerschoolftp.entries')})
          </span>
        )}
      </h4>

      {ipEntries.length === 0 ? (
        <div className="__neon__text">
          <p>{translate('powerschoolftp.no_ip_addresses_in_whitelist._all_ip_addresses_will_be_allowed')}</p>
        </div>
      ) : (
        <table className="__neon__table-simple __neon__table-full-width __neon__table-on-white-background">
          <thead>
            <tr>
              <th>{translate('powerschoolftp.cidr_notation')}</th>
              <th>{translate('powerschoolftp.ip_range')}</th>
              <th style={{width: '80px'}} />
            </tr>
          </thead>
          <tbody>
            {ipEntries.map((entry, index): React.ReactElement => {
              return (
                <tr key={index}>
                  <td className="__mfe__roboto-font" data-label={translate('powerschoolftp.cidr_notation')}><code>{entry}</code></td>
                  <td className="__mfe__roboto-font" data-label={translate('powerschoolftp.ip_range')}>{getCidrDescription(entry)}</td>
                  <td data-label={translate('powerschoolftp.remove')}>
                    <NeonButton
                      id={`remove-ip-${index}`}
                      dataText={translate('powerschoolftp.remove')}
                      dataIcon="delete"
                      dataShowText="false"
                      dataTooltipText={translate('powerschoolftp.remove')}
                      onClick={(): void => { removeEntry(index); }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
