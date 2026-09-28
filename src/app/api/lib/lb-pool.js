import fs from 'fs';
import path from 'path';
import { configDir } from './paths.js';
import { parseCidr } from '../../util/ip.js';

const METALLB_FILE = 'metallb.yaml';
const MAX_POOL_SIZE = 100000;

function ipToInt(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function intToIp(int) {
    return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');
}

function parseAddresses(raw) {
    const entries = [];
    for (const line of raw.split('\n')) {
        const match = line.match(/^\s*-\s+(.+?)\s*$/);
        if (match) {
            entries.push(match[1]);
        }
    }
    return entries;
}

function expandEntry(entry, out) {
    if (entry.includes('/')) {
        const range = parseCidr(entry);
        if (!range) return;
        const count = Math.min(2 ** (32 - range.prefix), MAX_POOL_SIZE - out.length);
        for (let i = 0; i < count; i++) {
            out.push(intToIp((range.network + i) >>> 0));
        }
        return;
    }

    const dash = entry.indexOf('-');
    if (dash > 0) {
        const start = ipToInt(entry.slice(0, dash).trim());
        const end = ipToInt(entry.slice(dash + 1).trim());
        const count = Math.min(end - start + 1, MAX_POOL_SIZE - out.length);
        for (let i = 0; i < count; i++) {
            out.push(intToIp((start + i) >>> 0));
        }
        return;
    }

    out.push(entry);
}

export function readLoadBalancerPool() {
    let raw;
    try {
        raw = fs.readFileSync(path.join(configDir(), METALLB_FILE), 'utf8');
    } catch (error) {
        return [];
    }

    const block = raw.match(/addresses:\s*\n((?:[ \t]*-[^\n]*\n?)*)/);
    if (!block) return [];

    const ips = [];
    for (const entry of parseAddresses(block[1])) {
        expandEntry(entry, ips);
    }

    return [...new Set(ips)];
}

export function nextAvailableLoadBalancerIp(existingIps) {
    const used = new Set((existingIps || []).filter(Boolean));
    return readLoadBalancerPool().find((ip) => !used.has(ip)) || null;
}
