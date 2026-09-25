import { describe, it, expect } from 'vitest';
import { buildClientConfig, buildServerConfig } from '../src/app/api/lib/config.js';

const instance = {
    server_private_key: 'server-private',
    server_public_key: 'server-public',
    server_address: '10.13.13.1/24',
    server_endpoint: 'vpn.example.com',
    server_listen_port: 51820,
    dns: '1.1.1.1',
};

describe('Config builders', () => {
    it('builds a client config with PSK', () => {
        const client = {
            description: 'Alice',
            client_ip: '10.13.13.2/32',
            allowed_ips: '0.0.0.0/0',
            private_key: 'client-private',
            public_key: 'client-public',
            psk: 'preshared-key',
        };

        const config = buildClientConfig(client, instance);

        expect(config).toContain('[Interface]');
        expect(config).toContain('PrivateKey = client-private');
        expect(config).toContain('Address = 10.13.13.2/32');
        expect(config).toContain('DNS = 1.1.1.1');
        expect(config).toContain('[Peer]');
        expect(config).toContain('PublicKey = server-public');
        expect(config).toContain('PresharedKey = preshared-key');
        expect(config).toContain('AllowedIPs = 0.0.0.0/0');
        expect(config).toContain('Endpoint = vpn.example.com:51820');
        expect(config).toContain('PersistentKeepalive = 25');
    });

    it('builds a client config without PSK', () => {
        const client = {
            description: 'Bob',
            client_ip: '10.13.13.3/32',
            allowed_ips: '192.168.0.0/16',
            private_key: 'client-private',
            public_key: 'client-public',
            psk: null,
        };

        const config = buildClientConfig(client, instance);

        expect(config).not.toContain('PresharedKey');
        expect(config).toContain('AllowedIPs = 192.168.0.0/16');
    });

    it('builds a server config with peers', () => {
        const clients = [
            {
                description: 'Alice',
                client_ip: '10.13.13.2/32',
                public_key: 'client-public',
                psk: 'preshared-key',
            },
        ];

        const config = buildServerConfig(instance, clients);

        expect(config).toContain('[Interface]');
        expect(config).toContain('Address = 10.13.13.1/24');
        expect(config).toContain('ListenPort = 51820');
        expect(config).toContain('PrivateKey = server-private');
        expect(config).toContain('DNS = 1.1.1.1');
        expect(config).toContain('PostUp = iptables -t nat -A POSTROUTING -s 10.13.13.0/24 -o eth0 -j MASQUERADE');
        expect(config).toContain('PostDown = iptables -t nat -D POSTROUTING -s 10.13.13.0/24 -o eth0 -j MASQUERADE');
        expect(config).toContain('[Peer]');
        expect(config).toContain('# Alice');
        expect(config).toContain('PublicKey = client-public');
        expect(config).toContain('PresharedKey = preshared-key');
        expect(config).toContain('AllowedIPs = 10.13.13.2/32');
    });

    it('builds a server config without DNS when omitted', () => {
        const noDnsInstance = { ...instance, dns: null };
        const config = buildServerConfig(noDnsInstance, []);

        expect(config).not.toContain('DNS');
    });

    it('uses the instance listen port in both the server config and client endpoint', () => {
        const publishedInstance = { ...instance, server_listen_port: 60000 };
        const client = {
            description: 'Carol',
            client_ip: '10.13.13.4/32',
            allowed_ips: '0.0.0.0/0',
            private_key: 'client-private',
            public_key: 'client-public',
            psk: null,
        };

        const serverConfig = buildServerConfig(publishedInstance, []);
        expect(serverConfig).toContain('ListenPort = 60000');

        const clientConfig = buildClientConfig(client, publishedInstance);
        expect(clientConfig).toContain('Endpoint = vpn.example.com:60000');
    });
});
