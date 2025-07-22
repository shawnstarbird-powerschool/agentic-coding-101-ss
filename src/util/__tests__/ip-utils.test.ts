import {
  filterPrivateIps,
  ipToNumber,
  isIpInCidr,
  isIpInCidrList,
  isPrivateIp,
  isValidCidr,
  isValidIpv4,
  normalizeCidr,
  validateAndNormalizeIpList
} from '../ip-utils';

describe('IP Utils', () => {
  describe('ipToNumber', () => {
    it('should convert an IPv4 address to its numeric representation', () => {
      expect(ipToNumber('192.168.1.1')).toBe(3232235777);
      expect(ipToNumber('10.0.0.1')).toBe(167772161);
      expect(ipToNumber('172.16.0.1')).toBe(2886729729);
      expect(ipToNumber('127.0.0.1')).toBe(2130706433);
    });

    it('should throw an error for invalid IP addresses', () => {
      expect(() => ipToNumber('192.168.1')).toThrow(
        'Invalid IP address format'
      );
      expect(() => ipToNumber('192.168.1.1.1')).toThrow(
        'Invalid IP address format'
      );
      expect(() => ipToNumber('not an ip')).toThrow(
        'Invalid IP address format'
      );
    });
  });

  describe('isValidIpv4', () => {
    it('should return true for valid IPv4 addresses', () => {
      expect(isValidIpv4('192.168.1.1')).toBe(true);
      expect(isValidIpv4('10.0.0.1')).toBe(true);
      expect(isValidIpv4('172.16.0.1')).toBe(true);
      expect(isValidIpv4('127.0.0.1')).toBe(true);
      expect(isValidIpv4('0.0.0.0')).toBe(true);
      expect(isValidIpv4('255.255.255.255')).toBe(true);
    });

    it('should return false for invalid IPv4 addresses', () => {
      expect(isValidIpv4('192.168.1')).toBe(false);
      expect(isValidIpv4('192.168.1.1.1')).toBe(false);
      expect(isValidIpv4('not an ip')).toBe(false);
      expect(isValidIpv4('256.0.0.0')).toBe(false);
      expect(isValidIpv4('192.168.1.256')).toBe(false);
      expect(isValidIpv4('192.168.1.-1')).toBe(false);
    });
  });

  describe('isValidCidr', () => {
    it('should return true for valid CIDR notations', () => {
      expect(isValidCidr('192.168.1.0/24')).toBe(true);
      expect(isValidCidr('10.0.0.0/8')).toBe(true);
      expect(isValidCidr('172.16.0.0/16')).toBe(true);
      expect(isValidCidr('127.0.0.1/32')).toBe(true);
      expect(isValidCidr('0.0.0.0/0')).toBe(true);
    });

    it('should return false for invalid CIDR notations', () => {
      expect(isValidCidr('192.168.1.0')).toBe(false);
      expect(isValidCidr('192.168.1.0/33')).toBe(false);
      expect(isValidCidr('192.168.1.0/-1')).toBe(false);
      expect(isValidCidr('256.0.0.0/24')).toBe(false);
      expect(isValidCidr('not a cidr')).toBe(false);
    });
  });

  describe('normalizeCidr', () => {
    it('should append /32 to valid IPv4 addresses', () => {
      expect(normalizeCidr('192.168.1.1')).toBe('192.168.1.1/32');
      expect(normalizeCidr('10.0.0.1')).toBe('10.0.0.1/32');
      expect(normalizeCidr('127.0.0.1')).toBe('127.0.0.1/32');
    });

    it('should return valid CIDR notations unchanged', () => {
      expect(normalizeCidr('192.168.1.0/24')).toBe('192.168.1.0/24');
      expect(normalizeCidr('10.0.0.0/8')).toBe('10.0.0.0/8');
      expect(normalizeCidr('0.0.0.0/0')).toBe('0.0.0.0/0');
    });

    it('should throw an error for invalid inputs', () => {
      expect(() => normalizeCidr('192.168.1')).toThrow(
        'Invalid IP address or CIDR notation'
      );
      expect(() => normalizeCidr('not an ip')).toThrow(
        'Invalid IP address or CIDR notation'
      );
      expect(() => normalizeCidr('256.0.0.0/24')).toThrow(
        'Invalid IP address or CIDR notation'
      );
    });
  });

  describe('isIpInCidr', () => {
    it('should return true when IP is in CIDR range', () => {
      expect(isIpInCidr('192.168.1.5', '192.168.1.0/24')).toBe(true);
      expect(isIpInCidr('10.0.0.5', '10.0.0.0/8')).toBe(true);
      expect(isIpInCidr('172.16.5.5', '172.16.0.0/16')).toBe(true);
      expect(isIpInCidr('127.0.0.1', '127.0.0.1/32')).toBe(true);
    });

    it('should return false when IP is not in CIDR range', () => {
      expect(isIpInCidr('192.168.2.5', '192.168.1.0/24')).toBe(false);
      expect(isIpInCidr('11.0.0.5', '10.0.0.0/8')).toBe(false);
      expect(isIpInCidr('172.17.5.5', '172.16.0.0/16')).toBe(false);
      expect(isIpInCidr('127.0.0.2', '127.0.0.1/32')).toBe(false);
    });

    it('should return false for invalid inputs', () => {
      expect(isIpInCidr('192.168.1', '192.168.1.0/24')).toBe(false);
      expect(isIpInCidr('192.168.1.1', '192.168.1.0/33')).toBe(false);
      expect(isIpInCidr('not an ip', '192.168.1.0/24')).toBe(false);
      expect(isIpInCidr('192.168.1.1', 'not a cidr')).toBe(false);
    });
  });

  describe('isPrivateIp', () => {
    it('should identify private IP addresses', () => {
      // Private IP ranges
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
      expect(isPrivateIp('192.168.1.1')).toBe(true);
      expect(isPrivateIp('127.0.0.1')).toBe(true);

      // Private IP ranges with CIDR notation
      expect(isPrivateIp('10.0.0.1/32')).toBe(true);
      expect(isPrivateIp('192.168.1.0/24')).toBe(true);
      expect(isPrivateIp('127.0.0.1/8')).toBe(true);
    });

    it('should identify public IP addresses', () => {
      // Public IP addresses
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('203.0.113.1')).toBe(false);
      expect(isPrivateIp('104.16.182.15')).toBe(false);

      // Public IP addresses with CIDR notation
      expect(isPrivateIp('8.8.8.8/32')).toBe(false);
      expect(isPrivateIp('203.0.113.0/24')).toBe(false);
    });
  });

  describe('filterPrivateIps', () => {
    it('should filter out private IP addresses', () => {
      const input = [
        '10.0.0.1',
        '192.168.1.1',
        '8.8.8.8',
        '127.0.0.1',
        '203.0.113.1'
      ];

      const expected = ['8.8.8.8', '203.0.113.1'];
      expect(filterPrivateIps(input)).toEqual(expected);
    });

    it('should handle CIDR notation', () => {
      const input = [
        '10.0.0.0/8',
        '192.168.1.0/24',
        '8.8.8.8/32',
        '203.0.113.0/24'
      ];

      const expected = ['8.8.8.8/32', '203.0.113.0/24'];
      expect(filterPrivateIps(input)).toEqual(expected);
    });

    it('should return an empty array for empty input', () => {
      expect(filterPrivateIps([])).toEqual([]);
    });
  });

  describe('isIpInCidrList', () => {
    it('should return true when IP is in one of the CIDR ranges', () => {
      expect(
        isIpInCidrList('192.168.1.5', ['192.168.1.0/24', '10.0.0.0/8'])
      ).toBe(true);
      expect(isIpInCidrList('10.0.0.5', ['192.168.1.0/24', '10.0.0.0/8'])).toBe(
        true
      );
      expect(isIpInCidrList('172.16.5.5', ['172.16.0.0/16'])).toBe(true);
    });

    it('should return false when IP is not in any of the CIDR ranges', () => {
      expect(
        isIpInCidrList('192.168.2.5', ['192.168.1.0/24', '10.0.0.0/8'])
      ).toBe(false);
      expect(isIpInCidrList('11.0.0.5', ['192.168.1.0/24', '10.0.0.0/8'])).toBe(
        false
      );
      expect(isIpInCidrList('172.17.5.5', ['172.16.0.0/16'])).toBe(false);
    });

    it('should return true when CIDR list is empty or undefined', () => {
      expect(isIpInCidrList('192.168.1.5', [])).toBe(true);
      expect(isIpInCidrList('192.168.1.5', undefined)).toBe(true);
    });
  });

  describe('validateAndNormalizeIpList', () => {
    it('should normalize a list of IP addresses and CIDR notations', () => {
      const input = ['192.168.1.1', '10.0.0.0/8', '172.16.0.1'];
      const expected = ['192.168.1.1/32', '10.0.0.0/8', '172.16.0.1/32'];
      expect(validateAndNormalizeIpList(input)).toEqual(expected);
    });

    it('should filter out invalid entries', () => {
      const input = ['192.168.1.1', 'not an ip', '10.0.0.0/8', '256.0.0.0'];
      const expected = ['192.168.1.1/32', '10.0.0.0/8'];
      expect(validateAndNormalizeIpList(input)).toEqual(expected);
    });

    it('should return an empty array for invalid inputs', () => {
      expect(validateAndNormalizeIpList(null)).toEqual([]);
      expect(validateAndNormalizeIpList(undefined)).toEqual([]);
      expect(validateAndNormalizeIpList('not an array' as any)).toEqual([]);
    });
  });
});
