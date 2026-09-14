export const WG_LISTEN_PORT = 51820;

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
    const interfaceLines = [
        '[Interface]',
        `Address = ${instance.server_address}`,
        `ListenPort = ${WG_LISTEN_PORT}`,
        `PrivateKey = ${instance.server_private_key}`,
    ];

    if (instance.dns) {
        interfaceLines.push(`DNS = ${instance.dns}`);
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
