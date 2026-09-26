import { buildServerConfig } from './config.js';
import { namespace } from './paths.js';

const DEFAULT_IMAGE = 'docker.storm7e.de/wireguard-go:latest';

function base64(content) {
    return Buffer.from(content, 'utf8').toString('base64');
}

export function buildInstanceManifest(instance, clients) {
    const name = `wg-${instance.id}`;
    const serverConfig = buildServerConfig(instance, clients);
    const image = process.env.WG_IMAGE || DEFAULT_IMAGE;

    const docs = [buildSecret(name, serverConfig), buildDeployment(name, image), buildService(name, instance)];

    return docs.map((doc) => doc.trimEnd()).join('\n---\n') + '\n';
}

function buildSecret(name, serverConfig) {
    return [
        'apiVersion: v1',
        'kind: Secret',
        'metadata:',
        `  namespace: ${namespace()}`,
        `  name: ${name}-conf`,
        'type: Opaque',
        'data:',
        `  wg0.conf: ${base64(serverConfig)}`,
    ].join('\n');
}

function buildDeployment(name, image) {
    return [
        'apiVersion: apps/v1',
        'kind: Deployment',
        'metadata:',
        `  namespace: ${namespace()}`,
        `  name: ${name}`,
        'spec:',
        '  replicas: 1',
        '  selector:',
        '    matchLabels:',
        `      app: ${name}`,
        '  template:',
        '    metadata:',
        '      labels:',
        `        app: ${name}`,
        '    spec:',
        '      containers:',
        '        - name: wireguard',
        `          image: ${image}`,
        '          command:',
        '            - /bin/bash',
        '            - -c',
        '          args:',
        '            - bash /usr/bin/wg-quick up /etc/wireguard/wg0.conf && exec sleep infinity',
        '          securityContext:',
        '            privileged: true',
        '          volumeMounts:',
        '            - name: config',
        '              mountPath: /etc/wireguard',
        '              readOnly: true',
        '            - name: tun',
        '              mountPath: /dev/net/tun',
        '      volumes:',
        '        - name: config',
        '          secret:',
        `            secretName: ${name}-conf`,
        '        - name: tun',
        '          hostPath:',
        '            path: /dev/net/tun',
        '            type: CharDevice',
    ].join('\n');
}

function buildService(name, instance) {
    return [
        'apiVersion: v1',
        'kind: Service',
        'metadata:',
        `  namespace: ${namespace()}`,
        `  name: ${name}`,
        'spec:',
        '  type: LoadBalancer',
        '  allocateLoadBalancerNodePorts: false',
        '  selector:',
        `    app: ${name}`,
        '  ports:',
        '    - name: wireguard',
        '      protocol: UDP',
        `      port: ${instance.server_listen_port}`,
        `      targetPort: ${instance.server_listen_port}`,
    ].join('\n');
}
