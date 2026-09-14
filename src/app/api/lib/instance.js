import { randomBytes } from 'crypto';
import { query } from '../db.js';

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

export async function getWgRealTimeData() {
    // Dummy: no SSH available yet.
    return {};
}

export async function generatePSK() {
    // Dummy PSK until SSH is wired up. Real PSKs are 32 random bytes, base64-encoded.
    return randomBytes(32).toString('base64');
}

export async function getContainerUptime() {
    // Dummy: no SSH available yet.
    return new Date().toISOString();
}

export async function reloadWireGuardContainer() {
    // Dummy: no SSH available yet.
    return { success: true };
}
