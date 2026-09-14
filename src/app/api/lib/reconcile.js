import { promises as fs } from 'fs';
import path from 'path';
import { query } from '../db.js';
import { atomicWriteFile } from './fs.js';
import { getClientsByInstanceId, writeServerConfig } from './instance.js';
import { buildInstanceCompose, buildIncludeSection } from './compose.js';
import { composeDir, instanceComposeFile, topLevelComposeFile } from './paths.js';

const INSTANCE_SELECT = `
    id, container_name, interface_name, server_private_key, server_public_key,
    server_address, server_endpoint, server_listen_port, dns
`;

export async function reconcileInstances() {
    const result = await query(`SELECT ${INSTANCE_SELECT} FROM instances ORDER BY id`);
    const instances = result.rows;
    const ids = new Set(instances.map((instance) => String(instance.id)));

    for (const instance of instances) {
        const clients = await getClientsByInstanceId(instance.id);
        await writeServerConfig(instance, clients);
        await atomicWriteFile(instanceComposeFile(instance), buildInstanceCompose(instance));
    }

    await removeStaleFiles(ids);
    await updateTopLevelCompose(instances);
    // Run manually from the host until path resolution is settled:
    // await runContainer(['compose', '-f', topLevelComposeFile(), 'up', '-d', '--remove-orphans']);

    return instances.map((instance) => instance.id);
}

async function updateTopLevelCompose(instances) {
    const file = topLevelComposeFile();
    const existing = await fs.readFile(file, 'utf8').catch(() => '');
    const updated = replaceIncludeSection(existing, buildIncludeSection(instances));
    await atomicWriteFile(file, updated);
}

function replaceIncludeSection(content, includeSection) {
    const lines = content.split('\n');
    const sectionLines = includeSection.trimEnd().split('\n');
    const start = lines.findIndex((line) => /^include:/.test(line));

    if (start === -1) {
        const nameIdx = lines.findIndex((line) => /^name:/.test(line));
        lines.splice(nameIdx === -1 ? 0 : nameIdx + 1, 0, ...sectionLines);
        return lines.join('\n');
    }

    let end = start + 1;
    while (end < lines.length && /^[ \t]/.test(lines[end])) {
        end++;
    }
    lines.splice(start, end - start, ...sectionLines);
    return lines.join('\n');
}

async function removeStaleFiles(ids) {
    const instancesDir = path.join(composeDir(), 'instances');
    for (const entry of await fs.readdir(instancesDir).catch(() => [])) {
        const match = entry.match(/^(\d+)\.(yaml|conf)$/);
        if (match && !ids.has(match[1])) {
            await fs.unlink(path.join(instancesDir, entry)).catch(() => {});
        }
    }
}
