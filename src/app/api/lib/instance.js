import { randomBytes, generateKeyPairSync } from 'crypto';
import { query } from '../db.js';
import { atomicWriteFile } from './fs.js';
import { runKubectl } from './kubectl.js';
import { buildInstanceManifest } from './manifest.js';
import { instanceManifestFile, namespace } from './paths.js';

export const SAFE_INSTANCE_FIELDS = `
    id,
    container_name,
    interface_name,
    server_public_key,
    server_vpn_ip,
    server_endpoint,
    server_listen_port,
    dns,
    load_balancer_ip,
    created_at,
    updated_at
`;

export async function getInstanceById(id) {
    const result = await query(
        `SELECT id, container_name, interface_name, server_private_key, server_public_key, server_vpn_ip, server_endpoint, server_listen_port, dns, load_balancer_ip
         FROM instances WHERE id = $1`,
        [id]
    );
    if (result.rowCount === 0) {
        return null;
    }
    return result.rows[0];
}

export async function getClientById(id) {
    const result = await query(
        `SELECT id, description, client_ip::TEXT AS client_ip, allowed_ips, public_key, private_key, psk, instance_id
         FROM clients WHERE id = $1`,
        [id]
    );
    if (result.rowCount === 0) {
        return null;
    }
    return result.rows[0];
}

export async function getClientsByInstanceId(instanceId) {
    const result = await query(
        `SELECT id, description, client_ip::TEXT AS client_ip, allowed_ips, public_key, private_key, psk
         FROM clients WHERE instance_id = $1 ORDER BY id`,
        [instanceId]
    );
    return result.rows;
}

export function parseWgDumpStatus(dump) {
    const status = {};
    for (const line of dump.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const fields = trimmed.split('\t');
        const publicKey = fields[0];
        if (!publicKey) continue;

        const lastHandshake = parseInt(fields[4], 10);
        const transferRx = parseInt(fields[5], 10);
        const transferTx = parseInt(fields[6], 10);

        status[publicKey] = {
            endpoint: fields[2] && fields[2] !== '(none)' ? fields[2] : null,
            last_handshake: Number.isFinite(lastHandshake) && lastHandshake > 0 ? lastHandshake : null,
            transfer_rx: Number.isFinite(transferRx) ? transferRx : 0,
            transfer_tx: Number.isFinite(transferTx) ? transferTx : 0,
        };
    }
    return status;
}

export async function getWgRealTimeData(instance, clients) {
    const { stdout } = await runKubectl([
        'exec',
        '-n',
        namespace(),
        `deployment/wg-${instance.id}`,
        '--',
        'wg',
        'show',
        instance.interface_name || 'wg0',
        'dump',
    ]);
    const statusByKey = parseWgDumpStatus(stdout);
    return clients.map((client) => ({
        id: client.id,
        public_key: client.public_key,
        endpoint: statusByKey[client.public_key]?.endpoint ?? null,
        last_handshake: statusByKey[client.public_key]?.last_handshake ?? null,
        transfer_rx: statusByKey[client.public_key]?.transfer_rx ?? 0,
        transfer_tx: statusByKey[client.public_key]?.transfer_tx ?? 0,
    }));
}

export async function generatePSK() {
    return randomBytes(32).toString('base64');
}

function toWireGuardBase64(base64url) {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    return base64 + '='.repeat((4 - (base64.length % 4)) % 4);
}

export function generateKeyPair() {
    const { publicKey, privateKey } = generateKeyPairSync('x25519');
    return {
        publicKey: toWireGuardBase64(publicKey.export({ format: 'jwk' }).x),
        privateKey: toWireGuardBase64(privateKey.export({ format: 'jwk' }).d),
    };
}

export async function getContainerUptime() {
    return new Date().toISOString();
}

export function parseWgDump(dump) {
    const peers = new Set();
    for (const line of dump.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const [publicKey] = trimmed.split('\t');
        if (publicKey) peers.add(publicKey);
    }
    return peers;
}

export function verifyPeers(dump, clients) {
    const actual = parseWgDump(dump);
    const expected = new Set(clients.map((client) => client.public_key));
    const missing = [...expected].filter((key) => !actual.has(key));
    const extra = [...actual].filter((key) => !expected.has(key));
    return {
        status: missing.length === 0 && extra.length === 0 ? 'applied' : 'mismatch',
        missing,
        extra,
    };
}

export async function reloadWireGuardContainer(instance, clients) {
    const filePath = instanceManifestFile(instance);
    await atomicWriteFile(filePath, buildInstanceManifest(instance, clients));
    await runKubectl(['apply', '-f', filePath]);
    await runKubectl(['rollout', 'restart', '-n', namespace(), `deployment/wg-${instance.id}`]);
    return { success: true, reloaded: true, manifestPath: filePath };
}

export async function reloadInstanceById(id) {
    const instance = await getInstanceById(id);
    if (!instance) {
        throw new Error('Instance not found');
    }
    const clients = await getClientsByInstanceId(id);
    return reloadWireGuardContainer(instance, clients);
}
