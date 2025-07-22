import { Logger } from '@aws-lambda-powertools/logger';

// Initialize Logger
const logger = new Logger({
  serviceName: 'ip-utils',
  logLevel: process.env.LOG_LEVEL || ('INFO' as any)
});

/**
 * Converts an IPv4 address to its numeric representation
 * @param ip The IPv4 address to convert
 * @returns The numeric representation of the IP address
 */
export function ipToNumber(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    throw new Error(`Invalid IP address format: ${ip}`);
  }

  // Using multiplication instead of bitwise operations to convert IP to number
  // eslint-disable-next-line no-bitwise
  return (
    parseInt(parts[0], 10) * 16777216 +
    parseInt(parts[1], 10) * 65536 +
    parseInt(parts[2], 10) * 256 +
    parseInt(parts[3], 10)
  );
}

/**
 * Validates if a string is a valid IPv4 address
 * @param ip The string to validate
 * @returns True if the string is a valid IPv4 address, false otherwise
 */
export function isValidIpv4(ip: string): boolean {
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

/**
 * Validates if a string is a valid CIDR notation
 * @param cidr The string to validate
 * @returns True if the string is a valid CIDR notation, false otherwise
 */
export function isValidCidr(cidr: string): boolean {
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

/**
 * Normalizes an IP address or CIDR notation
 * If an IP address is provided without CIDR notation, /32 is appended
 * @param ipOrCidr The IP address or CIDR notation to normalize
 * @returns The normalized CIDR notation
 */
export function normalizeCidr(ipOrCidr: string): string {
  if (isValidIpv4(ipOrCidr)) {
    return `${ipOrCidr}/32`;
  }

  if (isValidCidr(ipOrCidr)) {
    return ipOrCidr;
  }

  throw new Error(`Invalid IP address or CIDR notation: ${ipOrCidr}`);
}

/**
 * Checks if an IP address is within a CIDR range
 * @param ip The IP address to check
 * @param cidr The CIDR range to check against
 * @returns True if the IP address is within the CIDR range, false otherwise
 */
export function isIpInCidr(ip: string, cidr: string): boolean {
  try {
    if (!isValidIpv4(ip)) {
      logger.warn('Invalid IP address format', { ip });
      return false;
    }

    if (!isValidCidr(cidr)) {
      logger.warn('Invalid CIDR notation format', { cidr });
      return false;
    }

    const [cidrIp, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);

    // Convert IP addresses to numeric representation
    const ipNum = ipToNumber(ip);
    const cidrIpNum = ipToNumber(cidrIp);

    // Calculate the bit mask for the prefix
    // eslint-disable-next-line no-bitwise
    const mask = -(1 << (32 - prefix));

    // Check if the IP is in the CIDR range
    // eslint-disable-next-line no-bitwise
    return (ipNum & mask) === (cidrIpNum & mask);
  } catch (error) {
    logger.error('Error checking if IP is in CIDR range', { error, ip, cidr });
    return false;
  }
}

/**
 * Checks if an IP address is within any of the CIDR ranges in a list
 * @param ip The IP address to check
 * @param cidrList The list of CIDR ranges to check against
 * @returns True if the IP address is within any of the CIDR ranges, false otherwise
 */
export function isIpInCidrList(ip: string, cidrList?: string[]): boolean {
  if (!cidrList || cidrList.length === 0) {
    // If no CIDR list is provided, allow all IPs
    return true;
  }

  return cidrList.some((cidr) => isIpInCidr(ip, cidr));
}

/**
 * Checks if an IP address is in a private range
 * @param ip The IP address or CIDR notation to check
 * @returns True if the IP is in a private range, false otherwise
 */
export function isPrivateIp(ip: string): boolean {
  // Extract the IP part if it's in CIDR notation
  const ipPart = ip.includes('/') ? ip.split('/')[0] : ip;

  // Check if the IP is in a private range
  return (
    isIpInCidr(ipPart, '10.0.0.0/8') || // 10.0.0.0 - 10.255.255.255
    isIpInCidr(ipPart, '172.16.0.0/12') || // 172.16.0.0 - 172.31.255.255
    isIpInCidr(ipPart, '192.168.0.0/16') || // 192.168.0.0 - 192.168.255.255
    isIpInCidr(ipPart, '127.0.0.0/8') // 127.0.0.0 - 127.255.255.255 (localhost)
  );
}

/**
 * Filters out private IP addresses from a list
 * @param ipList The list of IP addresses or CIDR notations to filter
 * @returns A list of IP addresses that are not in private ranges
 */
export function filterPrivateIps(ipList: string[]): string[] {
  return ipList.filter((ip) => !isPrivateIp(ip));
}

/**
 * Validates a list of IP addresses or CIDR notations
 * @param ipList The list of IP addresses or CIDR notations to validate
 * @returns A list of normalized CIDR notations
 */
export function validateAndNormalizeIpList(ipList?: string[] | null): string[] {
  if (!ipList || !Array.isArray(ipList)) {
    return [];
  }

  const normalizedList: string[] = [];

  ipList.forEach((ip) => {
    try {
      normalizedList.push(normalizeCidr(ip));
    } catch (error) {
      logger.warn('Invalid IP address or CIDR notation in list', { ip, error });
      // Skip invalid entries
    }
  });

  return normalizedList;
}
