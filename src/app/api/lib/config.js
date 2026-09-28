import { networkCidr, serverHostAddress } from '../../util/ip.js';

export function buildClientConfig(client, instance) {
    const keepalive = 25;
    const endpoint = `${instance.server_endpoint}:${instance.server_listen_port}`;

    const lines = ['[Interface]', `PrivateKey = ${client.private_key}`, `Address = ${client.client_ip}`];

    if (instance.dns) {
        lines.push(`DNS = ${instance.dns}`);
    }

    lines.push(
        '',
        '[Peer]',
        `PublicKey = ${instance.server_public_key}`,
        ...(client.psk ? [`PresharedKey = ${client.psk}`] : []),
        `AllowedIPs = ${client.allowed_ips}`,
        `Endpoint = ${endpoint}`,
        `PersistentKeepalive = ${keepalive}`
    );

    return lines.join('\n') + '\n';
}

export function buildServerConfig(instance, clients) {
    const subnet = networkCidr(instance.server_vpn_ip);
    const interfaceLines = [
        '[Interface]',
        `Address = ${serverHostAddress(instance.server_vpn_ip)}`,
        `ListenPort = ${instance.server_listen_port}`,
        `PrivateKey = ${instance.server_private_key}`,
    ];

    if (instance.dns) {
        interfaceLines.push(`DNS = ${instance.dns}`);
    }

    if (subnet) {
        interfaceLines.push(
            `PostUp = iptables -t nat -A POSTROUTING -s ${subnet} -o eth0 -j MASQUERADE`,
            `PostDown = iptables -t nat -D POSTROUTING -s ${subnet} -o eth0 -j MASQUERADE`
        );
    }

    const peerLines = [];
    for (const client of clients) {
        peerLines.push(
            '',
            '[Peer]',
            `# ${client.description}`,
            `PublicKey = ${client.public_key}`,
            ...(client.psk ? [`PresharedKey = ${client.psk}`] : []),
            `AllowedIPs = ${client.client_ip}`
        );
    }

    return [...interfaceLines, ...peerLines].join('\n') + '\n';
}
