import { randomBytes, generateKeyPairSync } from 'crypto';
import { query } from '../db';
import type { Client, ClientRecord, ClientStatus, Instance, WgPeerStatus } from '../../types';
import { atomicWriteFile } from './fs';
import { runKubectl } from './kubectl';
import { buildInstanceManifest } from './manifest';
import { instanceManifestFile, namespace } from './paths';
import { logger } from './logger';

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

export async function getInstanceById(id: string | number): Promise<Instance | null> {
    const result = await query(
        `SELECT id, container_name, interface_name, server_private_key, server_public_key, server_vpn_ip, server_endpoint, server_listen_port, dns, load_balancer_ip
         FROM instances WHERE id = $1`,
        [id]
    );
    if (result.rowCount === 0) {
        return null;
    }
    return result.rows[0] as Instance;
}

export async function getClientById(id: string | number): Promise<ClientRecord | null> {
    const result = await query(
        `SELECT id, description, client_ip::TEXT AS client_ip, allowed_ips, public_key, private_key, psk, instance_id
         FROM clients WHERE id = $1`,
        [id]
    );
    if (result.rowCount === 0) {
        return null;
    }
    return result.rows[0] as ClientRecord;
}

export async function getClientsByInstanceId(instanceId: string | number): Promise<Client[]> {
    const result = await query(
        `SELECT id, description, client_ip::TEXT AS client_ip, allowed_ips, public_key, private_key, psk
         FROM clients WHERE instance_id = $1 ORDER BY id`,
        [instanceId]
    );
    return result.rows as Client[];
}

export function parseWgDumpStatus(dump: string): Record<string, WgPeerStatus> {
    const status: Record<string, WgPeerStatus> = {};
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

export async function getWgRealTimeData(
    instance: Pick<Instance, 'id' | 'interface_name'>,
    clients: Array<Pick<Client, 'id' | 'public_key'>>
): Promise<ClientStatus[]> {
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

export async function generatePSK(): Promise<string> {
    return randomBytes(32).toString('base64');
}

function toWireGuardBase64(base64url: string): string {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    return base64 + '='.repeat((4 - (base64.length % 4)) % 4);
}

export function generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = generateKeyPairSync('x25519');
    return {
        publicKey: toWireGuardBase64(publicKey.export({ format: 'jwk' }).x!),
        privateKey: toWireGuardBase64(privateKey.export({ format: 'jwk' }).d!),
    };
}

export async function getContainerUptime(): Promise<string> {
    return new Date().toISOString();
}

export function parseWgDump(dump: string): Set<string> {
    const peers = new Set<string>();
    for (const line of dump.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const [publicKey] = trimmed.split('\t');
        if (publicKey) peers.add(publicKey);
    }
    return peers;
}

export function verifyPeers(
    dump: string,
    clients: Array<Pick<Client, 'public_key'>>
): { status: 'applied' | 'mismatch'; missing: string[]; extra: string[] } {
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

export async function reloadWireGuardContainer(
    instance: Instance,
    clients: Client[]
): Promise<{ success: boolean; reloaded: boolean; manifestPath: string }> {
    logger.info('Reloading WireGuard instance', { instanceId: instance.id, clients: clients.length });
    const filePath = instanceManifestFile(instance);
    await atomicWriteFile(filePath, buildInstanceManifest(instance, clients));
    await runKubectl(['apply', '-f', filePath]);
    await runKubectl(['rollout', 'restart', '-n', namespace(), `deployment/wg-${instance.id}`]);
    logger.info('WireGuard instance reloaded', { instanceId: instance.id });
    return { success: true, reloaded: true, manifestPath: filePath };
}

export async function reloadInstanceById(
    id: string | number
): Promise<{ success: boolean; reloaded: boolean; manifestPath: string }> {
    const instance = await getInstanceById(id);
    if (!instance) {
        throw new Error('Instance not found');
    }
    const clients = await getClientsByInstanceId(id);
    return reloadWireGuardContainer(instance, clients);
}
