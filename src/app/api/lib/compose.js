import { WG_LISTEN_PORT } from './config.js';

export function buildInstanceCompose(instance) {
    const name = instance.container_name;
    const lines = [
        'services:',
        `  ${name}:`,
        '    image: docker.storm7e.de/wireguard-go:latest',
        `    container_name: ${name}`,
        '    cap_add:',
        '      - NET_ADMIN',
        '    sysctls:',
        '      - net.ipv4.ip_forward=1',
        '    devices:',
        '      - /dev/net/tun:/dev/net/tun',
        '    volumes:',
        `      - ./${instance.id}.conf:/etc/wireguard/wg0.conf:ro`,
        '    environment:',
        '      - LOG_LEVEL=info',
        '      - ENABLE_HEALTHCHECK=true',
        '      - PUID=${PUID:-1044}',
        '      - PGID=${PGID:-100}',
        '    ports:',
        `      - "${instance.server_listen_port}:${WG_LISTEN_PORT}/udp"`,
        '    networks:',
        '      - wireguard_net',
        '    restart: unless-stopped',
        '',
        'networks:',
        '  wireguard_net:',
        '    external: true',
    ];
    return lines.join('\n') + '\n';
}

export function buildIncludeSection(instances) {
    if (instances.length === 0) {
        return 'include: []\n';
    }
    const entries = instances.map((instance) => `  - path: ./data/instances/${instance.id}.yaml`);
    return ['include:', ...entries].join('\n') + '\n';
}
