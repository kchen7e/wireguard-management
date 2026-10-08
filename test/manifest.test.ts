import { describe, it, expect } from 'vitest';
import { buildInstanceManifest } from '../src/app/api/lib/manifest';

const instance = {
    id: 1,
    container_name: 'wireguard-1',
    interface_name: 'wg0',
    server_private_key: 'server-priv',
    server_public_key: 'server-pub',
    server_vpn_ip: '10.13.13.1/24',
    server_endpoint: 'wg.example.com',
    server_listen_port: 60000,
    dns: null,
    load_balancer_ip: null,
};

const clients = [
    {
        id: 1,
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
        const yaml = buildInstanceManifest({ ...instance, load_balancer_ip: '192.168.1.201' }, clients);
        expect(yaml).toContain('metallb.io/loadBalancerIPs: 192.168.1.201');
        expect(yaml).not.toContain('allow-shared-ip');
    });

    it('omits the MetalLB annotation when no IP is reserved', () => {
        const yaml = buildInstanceManifest(instance, clients);
        expect(yaml).not.toContain('loadBalancerIPs');
    });

    it('shares a single IP across services when a shared IP is configured', () => {
        const originalIp = process.env.SHARED_LOAD_BALANCER_IP;
        process.env.SHARED_LOAD_BALANCER_IP = '203.0.113.10';
        try {
            const yaml = buildInstanceManifest({ ...instance, load_balancer_ip: '10.0.0.9' }, clients);
            expect(yaml).toContain('metallb.io/loadBalancerIPs: 203.0.113.10');
            expect(yaml).toContain('metallb.io/allow-shared-ip: 203.0.113.10');
            expect(yaml).not.toContain('10.0.0.9');
        } finally {
            restoreEnv('SHARED_LOAD_BALANCER_IP', originalIp);
        }
    });

    it('falls back to dedicated mode when no shared IP is configured', () => {
        const originalIp = process.env.SHARED_LOAD_BALANCER_IP;
        delete process.env.SHARED_LOAD_BALANCER_IP;
        try {
            const yaml = buildInstanceManifest({ ...instance, load_balancer_ip: '10.0.0.9' }, clients);
            expect(yaml).toContain('metallb.io/loadBalancerIPs: 10.0.0.9');
            expect(yaml).not.toContain('allow-shared-ip');
        } finally {
            restoreEnv('SHARED_LOAD_BALANCER_IP', originalIp);
        }
    });

    it('uses Local for a dedicated IP so the client source IP is preserved', () => {
        const originalShared = process.env.SHARED_LOAD_BALANCER_IP;
        delete process.env.SHARED_LOAD_BALANCER_IP;
        try {
            const yaml = buildInstanceManifest(instance, clients);
            expect(yaml).toContain('externalTrafficPolicy: Local');
        } finally {
            restoreEnv('SHARED_LOAD_BALANCER_IP', originalShared);
        }
    });

    it('uses Cluster for a shared IP, where Local is not permitted', () => {
        const originalShared = process.env.SHARED_LOAD_BALANCER_IP;
        process.env.SHARED_LOAD_BALANCER_IP = '203.0.113.10';
        try {
            const yaml = buildInstanceManifest(instance, clients);
            expect(yaml).toContain('externalTrafficPolicy: Cluster');
            expect(yaml).not.toContain('externalTrafficPolicy: Local');
        } finally {
            restoreEnv('SHARED_LOAD_BALANCER_IP', originalShared);
        }
    });
});

function restoreEnv(key: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[key];
    } else {
        process.env[key] = value;
    }
}
