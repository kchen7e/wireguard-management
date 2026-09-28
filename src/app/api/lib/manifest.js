import { buildServerConfig } from './config.js';
import { secretTemplate, deploymentTemplate, serviceTemplateFactory } from './templates.js';
import { namespace } from './paths.js';

const DEFAULT_IMAGE = 'docker.storm7e.de/wireguard-go:latest';

function base64(content) {
    return Buffer.from(content, 'utf8').toString('base64');
}

export function buildInstanceManifest(instance, clients) {
    const name = `wg-${instance.id}`;
    const serverConfig = buildServerConfig(instance, clients);
    const image = process.env.WG_IMAGE || DEFAULT_IMAGE;
    const populateService = serviceTemplateFactory();

    const docs = [
        secretTemplate({ name, namespace: namespace(), server_config_base64: base64(serverConfig) }),
        deploymentTemplate({ name, namespace: namespace(), image }),
        populateService({
            name,
            namespace: namespace(),
            server_listen_port: instance.server_listen_port,
            load_balancer_ip: instance.load_balancer_ip || '',
        }),
    ];

    return docs.map((doc) => doc.trimEnd()).join('\n---\n') + '\n';
}
