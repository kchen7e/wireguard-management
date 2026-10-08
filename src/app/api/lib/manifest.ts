import { buildServerConfig } from './config';
import { secretTemplate, deploymentTemplate, serviceTemplateFactory } from './templates';
import { namespace } from './paths';
import type { Client, Instance } from '../../types';

const DEFAULT_IMAGE = 'masipcat/wireguard-go:latest';

function base64(content: string): string {
    return Buffer.from(content, 'utf8').toString('base64');
}

export function buildInstanceManifest(instance: Instance, clients: Client[]): string {
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
