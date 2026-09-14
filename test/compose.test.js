import { describe, it, expect } from 'vitest';
import { buildInstanceCompose, buildIncludeSection } from '../src/app/api/lib/compose.js';

const instance = {
    id: 1,
    container_name: 'wireguard-1',
    server_listen_port: 60000,
};

describe('compose builders', () => {
    it('builds an instance compose file mapping its conf to wg0.conf', () => {
        const yaml = buildInstanceCompose(instance);
        expect(yaml).toContain('services:');
        expect(yaml).toContain('wireguard-1:');
        expect(yaml).toContain('image: docker.storm7e.de/wireguard-go:latest');
        expect(yaml).toContain('container_name: wireguard-1');
        expect(yaml).toContain('- ./1.conf:/etc/wireguard/wg0.conf:ro');
        expect(yaml).toContain('"60000:51820/udp"');
        expect(yaml).toContain('wireguard_net:');
        expect(yaml).toContain('external: true');
    });

    it('builds the include section with instance paths under ./data', () => {
        const yaml = buildIncludeSection([instance, { ...instance, id: 2, container_name: 'wireguard-2' }]);
        expect(yaml).toContain('include:');
        expect(yaml).toContain('- path: ./data/instances/1.yaml');
        expect(yaml).toContain('- path: ./data/instances/2.yaml');
    });

    it('builds an empty include section when there are no instances', () => {
        expect(buildIncludeSection([])).toBe('include: []\n');
    });
});
