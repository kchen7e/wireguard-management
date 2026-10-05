import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { readLoadBalancerPool, nextAvailableLoadBalancerIp } from '../src/app/api/lib/lb-pool';

describe('load balancer pool', () => {
    let dir: string;

    beforeEach(async () => {
        dir = await mkdtemp(path.join(tmpdir(), 'wg-lb-'));
        process.env.K8S_CONFIG_DIR = dir;
    });

    afterEach(async () => {
        delete process.env.K8S_CONFIG_DIR;
        await rm(dir, { recursive: true, force: true });
    });

    it('expands an address range from metallb.yaml', async () => {
        await writeFile(
            path.join(dir, 'metallb.yaml'),
            'spec:\n    addresses:\n        - 192.168.249.200-192.168.249.202\n'
        );
        expect(readLoadBalancerPool()).toEqual(['192.168.249.200', '192.168.249.201', '192.168.249.202']);
    });

    it('returns the first IP not already in use', async () => {
        await writeFile(path.join(dir, 'metallb.yaml'), 'spec:\n    addresses:\n        - 10.0.0.10-10.0.0.12\n');
        expect(nextAvailableLoadBalancerIp(['10.0.0.10', '10.0.0.11'])).toBe('10.0.0.12');
    });

    it('returns null when the pool is exhausted', async () => {
        await writeFile(path.join(dir, 'metallb.yaml'), 'spec:\n    addresses:\n        - 10.0.0.10-10.0.0.10\n');
        expect(nextAvailableLoadBalancerIp(['10.0.0.10'])).toBeNull();
    });

    it('returns an empty pool when metallb.yaml is missing', () => {
        expect(readLoadBalancerPool()).toEqual([]);
    });
});
