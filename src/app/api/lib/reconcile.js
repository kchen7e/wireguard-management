import { promises as fs } from 'fs';
import path from 'path';
import { query } from '../db.js';
import { atomicWriteFile } from './fs.js';
import { getClientsByInstanceId } from './instance.js';
import { buildInstanceManifest } from './manifest.js';
import { runKubectl } from './kubectl.js';
import { configDir, instanceManifestFile } from './paths.js';

const INSTANCE_SELECT = `
    id, container_name, interface_name, server_private_key, server_public_key,
    server_vpn_ip, server_endpoint, server_listen_port, dns, load_balancer_ip
`;

export async function reconcileInstances() {
    const result = await query(`SELECT ${INSTANCE_SELECT} FROM instances ORDER BY id`);
    const instances = result.rows;
    const ids = new Set(instances.map((instance) => String(instance.id)));

    for (const instance of instances) {
        const clients = await getClientsByInstanceId(instance.id);
        await atomicWriteFile(instanceManifestFile(instance), buildInstanceManifest(instance, clients));
    }

    await removeStaleInstances(ids);

    if (instances.length > 0) {
        await runKubectl(['apply', '-f', path.join(configDir(), 'instances')]);
    }

    return instances.map((instance) => instance.id);
}

async function removeStaleInstances(ids) {
    const dir = path.join(configDir(), 'instances');
    for (const entry of await fs.readdir(dir).catch(() => [])) {
        const match = entry.match(/^wg-(\d+)\.yaml$/);
        if (match && !ids.has(match[1])) {
            const file = path.join(dir, entry);
            await runKubectl(['delete', '-f', file]).catch(() => {});
            await fs.unlink(file).catch(() => {});
        }
    }
}
