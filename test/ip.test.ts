import { describe, it, expect } from 'vitest';
import {
    isValidIpv4,
    parseCidr,
    isPrivateIp,
    isIpInSubnet,
    isValidPrivateCidr,
    isValidServerCidr,
    serverHostAddress,
    networkCidr,
} from '../src/app/util/ip';

describe('ip utilities', () => {
    it('validates IPv4 addresses', () => {
        expect(isValidIpv4('10.13.13.1')).toBe(true);
        expect(isValidIpv4('255.255.255.255')).toBe(true);
        expect(isValidIpv4('999.1.1.1')).toBe(false);
        expect(isValidIpv4('10.13.13')).toBe(false);
        expect(isValidIpv4('abc.def.ghi.jkl')).toBe(false);
    });

    it('parses CIDR notation', () => {
        expect(parseCidr('10.13.13.1/24')).toMatchObject({ ip: '10.13.13.1', prefix: 24 });
        expect(parseCidr('10.13.13.1')).toMatchObject({ ip: '10.13.13.1', prefix: 32 });
        expect(parseCidr('10.13.13.1/33')).toBe(null);
        expect(parseCidr('invalid/24')).toBe(null);
        expect(parseCidr(null)).toBe(null);
    });

    it('detects RFC1918 private IPs', () => {
        expect(isPrivateIp('10.13.13.1')).toBe(true);
        expect(isPrivateIp('172.16.0.1')).toBe(true);
        expect(isPrivateIp('172.31.255.255')).toBe(true);
        expect(isPrivateIp('192.168.1.1')).toBe(true);
        expect(isPrivateIp('8.8.8.8')).toBe(false);
        expect(isPrivateIp('172.32.0.1')).toBe(false);
        expect(isPrivateIp('11.0.0.1')).toBe(false);
    });

    it('checks whether an IP is within a subnet', () => {
        expect(isIpInSubnet('10.13.13.2', '10.13.13.0/24')).toBe(true);
        expect(isIpInSubnet('10.13.13.255', '10.13.13.0/24')).toBe(true);
        expect(isIpInSubnet('10.13.14.2', '10.13.13.0/24')).toBe(false);
        expect(isIpInSubnet('10.13.12.2', '10.13.13.0/24')).toBe(false);
    });

    it('validates private CIDR', () => {
        expect(isValidPrivateCidr('10.13.13.1/24')).toBe(true);
        expect(isValidPrivateCidr('10.13.13.1')).toBe(false);
        expect(isValidPrivateCidr('8.8.8.8/24')).toBe(false);
        expect(isValidPrivateCidr('10.13.13.1/33')).toBe(false);
    });

    it('computes the network CIDR', () => {
        expect(networkCidr('10.13.13.1/24')).toBe('10.13.13.0/24');
        expect(networkCidr('192.168.5.1/16')).toBe('192.168.0.0/16');
        expect(networkCidr('10.0.0.5/8')).toBe('10.0.0.0/8');
        expect(networkCidr('invalid')).toBe(null);
    });

    it('validates a server subnet CIDR', () => {
        expect(isValidServerCidr('172.28.15.0/24')).toBe(true);
        expect(isValidServerCidr('10.13.13.0/24')).toBe(true);
        expect(isValidServerCidr('192.168.0.0/24')).toBe(true);
        expect(isValidServerCidr('172.28.15.0/25')).toBe(true);
        expect(isValidServerCidr('172.28.15.0/30')).toBe(true);
        expect(isValidServerCidr('10.13.13.1/24')).toBe(false);
        expect(isValidServerCidr('172.28.15.0/23')).toBe(false);
        expect(isValidServerCidr('172.28.15.0/31')).toBe(false);
        expect(isValidServerCidr('172.28.15.0/32')).toBe(false);
        expect(isValidServerCidr('8.8.8.0/24')).toBe(false);
        expect(isValidServerCidr('172.28.15.0')).toBe(false);
        expect(isValidServerCidr('172.28.15.0/33')).toBe(false);
    });

    it('derives the server host address from a subnet', () => {
        expect(serverHostAddress('172.28.15.0/24')).toBe('172.28.15.1/24');
        expect(serverHostAddress('10.13.13.0/24')).toBe('10.13.13.1/24');
        expect(serverHostAddress('10.13.13.0/30')).toBe('10.13.13.1/30');
        expect(serverHostAddress('10.13.13.0/32')).toBe(null);
        expect(serverHostAddress('invalid')).toBe(null);
    });
});
