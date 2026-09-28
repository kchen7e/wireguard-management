import { networkCidr, serverHostAddress } from '../../util/ip.js';
import { serverConfigTemplate, clientConfigTemplate, peerConfigTemplate } from './templates.js';

const CLIENT_KEEPALIVE = 25;

function renderPeer(data) {
    return peerConfigTemplate(data).trimEnd();
}

export function buildClientConfig(client, instance) {
    const endpoint = `${instance.server_endpoint}:${instance.server_listen_port}`;
    const peers = `\n${renderPeer({
        public_key: instance.server_public_key,
        psk: client.psk,
        allowed_ips: client.allowed_ips,
        endpoint,
        keepalive: CLIENT_KEEPALIVE,
    })}`;

    return (
        clientConfigTemplate({
            private_key: client.private_key,
            address: client.client_ip,
            dns: instance.dns,
            peers,
        }).trimEnd() + '\n'
    );
}

export function buildServerConfig(instance, clients) {
    const peers = clients
        .map((client) =>
            renderPeer({
                description: client.description,
                public_key: client.public_key,
                psk: client.psk,
                allowed_ips: client.client_ip,
            })
        )
        .map((section) => `\n${section}`)
        .join('\n');

    return (
        serverConfigTemplate({
            address: serverHostAddress(instance.server_vpn_ip),
            listen_port: instance.server_listen_port,
            private_key: instance.server_private_key,
            dns: instance.dns,
            subnet: networkCidr(instance.server_vpn_ip),
            peers,
        }).trimEnd() + '\n'
    );
}
