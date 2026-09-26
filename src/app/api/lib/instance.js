import { randomBytes, generateKeyPairSync } from 'crypto';
import { query } from '../db.js';
import { atomicWriteFile } from './fs.js';
import { runKubectl } from './kubectl.js';
import { buildInstanceManifest } from './manifest.js';
import { instanceManifestFile, namespace } from './paths.js';

export async function getInstanceById(id) {
    const result = await query(
        `SELECT id, container_name, interface_name, server_private_key, server_public_key, server_address, server_endpoint, server_listen_port, dns
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

export async function getWgRealTimeData() {
    return {};
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
