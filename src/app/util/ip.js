export function isValidIpv4(ip) {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function ipToInt(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function maskFor(prefix) {
    if (prefix === 0) return 0;
    return (0xffffffff << (32 - prefix)) >>> 0;
}

export function parseCidr(cidr) {
    if (typeof cidr !== 'string') return null;
    const [ip, prefixStr] = cidr.split('/');
    const prefix = prefixStr === undefined ? 32 : Number(prefixStr);
    if (!isValidIpv4(ip) || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
        return null;
    }
    const mask = maskFor(prefix);
    const network = (ipToInt(ip) & mask) >>> 0;
    return { ip, prefix, mask, network };
}

const PRIVATE_RANGES = [
    ['10.0.0.0', 8],
    ['172.16.0.0', 12],
    ['192.168.0.0', 16],
];

export function isPrivateIp(ip) {
    if (!isValidIpv4(ip)) return false;
    const value = ipToInt(ip);
    return PRIVATE_RANGES.some(([network, prefix]) => {
        const mask = maskFor(prefix);
        return (value & mask) >>> 0 === (ipToInt(network) & mask) >>> 0;
    });
}

export function isIpInSubnet(ip, cidr) {
    const range = parseCidr(cidr);
    if (!range || !isValidIpv4(ip)) return false;
    return (ipToInt(ip) & range.mask) >>> 0 === range.network;
}

function intToIp(int) {
    return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');
}

export function networkCidr(cidr) {
    const range = parseCidr(cidr);
    if (!range) return null;
    return `${intToIp(range.network)}/${range.prefix}`;
}

export function isValidPrivateCidr(cidr) {
    const range = parseCidr(cidr);
    if (!range || !cidr.includes('/')) return false;
    return isPrivateIp(range.ip);
}

const MIN_SERVER_PREFIX = 24;
const MAX_SERVER_PREFIX = 30;

export function isValidServerCidr(cidr) {
    const range = parseCidr(cidr);
    if (!range || !cidr.includes('/')) return false;
    if (range.prefix < MIN_SERVER_PREFIX || range.prefix > MAX_SERVER_PREFIX) return false;
    if (!isPrivateIp(range.ip)) return false;
    return ipToInt(range.ip) === range.network;
}

export function serverHostAddress(cidr) {
    const range = parseCidr(cidr);
    if (!range || range.prefix > MAX_SERVER_PREFIX) return null;
    return `${intToIp(range.network + 1)}/${range.prefix}`;
}
