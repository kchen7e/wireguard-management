import { promises as fs } from 'fs';
import path from 'path';
import { query } from '../db';
import type { Instance } from '../../types';
import { errorMessage } from '../../util/errors';
import { atomicWriteFile } from './fs';
import { getClientsByInstanceId } from './instance';
import { buildInstanceManifest } from './manifest';
import { runKubectl } from './kubectl';
import { configDir, instanceManifestFile } from './paths';
import { logger } from './logger';

const INSTANCE_SELECT = `
    id, container_name, interface_name, server_private_key, server_public_key,
    server_vpn_ip, server_endpoint, server_listen_port, dns, load_balancer_ip
`;

export async function reconcileInstances(): Promise<number[]> {
    const result = await query(`SELECT ${INSTANCE_SELECT} FROM instances ORDER BY id`);
    const instances = result.rows as Instance[];
    const ids = new Set(instances.map((instance) => String(instance.id)));

    logger.info('Reconciling instances', { count: instances.length });

    for (const instance of instances) {
        logger.debug('Reconciling instance', { instanceId: instance.id });
        const clients = await getClientsByInstanceId(instance.id);
        await atomicWriteFile(instanceManifestFile(instance), buildInstanceManifest(instance, clients));
    }

    await removeStaleInstances(ids);

    if (instances.length > 0) {
        await runKubectl(['apply', '-f', path.join(configDir(), 'instances')]);
    }

    logger.info('Reconcile complete', { count: instances.length });
    return instances.map((instance) => instance.id);
}

async function removeStaleInstances(ids: Set<string>): Promise<void> {
    const dir = path.join(configDir(), 'instances');
    const entries = await fs.readdir(dir).catch((error) => {
        logger.warn('Failed to read instances directory', { dir, error: errorMessage(error) });
        return [];
    });
    for (const entry of entries) {
        const match = entry.match(/^wg-(\d+)\.yaml$/);
        if (match && !ids.has(match[1])) {
            const file = path.join(dir, entry);
            logger.info('Removing stale instance manifest', { file });
            await runKubectl(['delete', '-f', file]).catch((error) => {
                logger.warn('Failed to delete stale instance from cluster', { file, error: errorMessage(error) });
            });
            await fs.unlink(file).catch((error) => {
                logger.warn('Failed to remove stale manifest file', { file, error: errorMessage(error) });
            });
        }
    }
}
