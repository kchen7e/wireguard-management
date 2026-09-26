import { describe, it, expect } from 'vitest';
import { buildInstanceManifest } from '../src/app/api/lib/manifest.js';

const instance = {
    id: 1,
    container_name: 'wireguard-1',
    interface_name: 'wg0',
    server_private_key: 'server-priv',
    server_public_key: 'server-pub',
    server_address: '10.13.13.1/24',
    server_endpoint: 'wg.example.com',
    server_listen_port: 60000,
    dns: null,
};

const clients = [
    {
        description: 'Alice',
        client_ip: '10.13.13.2/32',
        allowed_ips: '0.0.0.0/0',
        public_key: 'client-pub',
        private_key: 'client-priv',
        psk: 'psk',
    },
];

describe('buildInstanceManifest', () => {
    it('emits a Secret, Deployment and LoadBalancer Service', () => {
        const yaml = buildInstanceManifest(instance, clients);
        expect(yaml).toContain('kind: Secret');
        expect(yaml).toContain('kind: Deployment');
        expect(yaml).toContain('kind: Service');
        expect(yaml).toContain('name: wg-1');
        expect(yaml).toContain('name: wg-1-conf');
        expect(yaml).toContain('type: LoadBalancer');
        expect(yaml).toContain('namespace: wireguard');
    });

    it('encodes the server config into the Secret data', () => {
        const yaml = buildInstanceManifest(instance, clients);
        expect(yaml).toContain('type: Opaque');
        expect(yaml).toContain('wg0.conf: ');
    });

    it('configures a LoadBalancer Service mapping the listen port', () => {
        const yaml = buildInstanceManifest(instance, clients);
        expect(yaml).toContain('protocol: UDP');
        expect(yaml).toContain('port: 60000');
        expect(yaml).toContain('targetPort: 60000');
    });

    it('pins a reserved IP via the MetalLB annotation when set', () => {
        const yaml = buildInstanceManifest({ ...instance, load_balancer_ip: '192.168.249.201' }, clients);
        expect(yaml).toContain('metallb.universe.tf/loadBalancerIPs: 192.168.249.201');
    });

    it('omits the MetalLB annotation when no IP is reserved', () => {
        const yaml = buildInstanceManifest(instance, clients);
        expect(yaml).not.toContain('loadBalancerIPs');
    });
});
