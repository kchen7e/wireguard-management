import { NextResponse } from 'next/server';
import { query } from '../db.js';
import { generateKeyPair } from '../lib/instance.js';
import { reconcileInstances } from '../lib/reconcile.js';
import { isValidServerCidr, isValidIpv4 } from '../../util/ip.js';
import { isValidInstanceName } from '../../util/name.js';
import { lbMode } from '../lib/templates.js';

export async function GET() {
    try {
        const result = await query(`SELECT id, container_name FROM instances ORDER BY id`);
        return NextResponse.json({ data: result.rows });
    } catch (error) {
        console.error('Error fetching instances:', error);
        return NextResponse.json({ error: 'Failed to fetch instances' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            container_name,
            server_address,
            server_endpoint,
            server_listen_port,
            load_balancer_ip,
            dns,
            interface_name = 'wg0',
        } = body;

        if (!container_name || !server_address || !server_endpoint) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!isValidInstanceName(container_name)) {
            return NextResponse.json(
                { error: 'Instance name must be lowercase letters, digits and hyphens (e.g. wireguard-1)' },
                { status: 400 }
            );
        }

        if (!isValidServerCidr(server_address)) {
            return NextResponse.json(
                { error: 'Server IP must be a private network CIDR between /24 and /30 (e.g. 172.28.15.0/24)' },
                { status: 400 }
            );
        }

        if (load_balancer_ip && !isValidIpv4(load_balancer_ip)) {
            return NextResponse.json({ error: 'Reserved IP must be a valid IPv4 address' }, { status: 400 });
        }

        const shared = lbMode() === 'shared';

        if (!shared && load_balancer_ip) {
            const existing = await query('SELECT id FROM instances WHERE load_balancer_ip = $1', [load_balancer_ip]);
            if (existing.rowCount > 0) {
                return NextResponse.json({ error: `IP ${load_balancer_ip} is already reserved` }, { status: 409 });
            }
        }

        if (shared && server_listen_port) {
            const clash = await query('SELECT id FROM instances WHERE server_listen_port = $1', [server_listen_port]);
            if (clash.rowCount > 0) {
                return NextResponse.json({ error: `Port ${server_listen_port} is already in use` }, { status: 409 });
            }
        }

        const listenPort = server_listen_port || (await nextAvailablePort());

        const { publicKey, privateKey } = generateKeyPair();

        const result = await query(
            `INSERT INTO instances (container_name, interface_name, server_private_key, server_public_key, server_address, server_endpoint, server_listen_port, dns, load_balancer_ip)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id, container_name, interface_name, server_public_key, server_address, server_endpoint, server_listen_port, dns, load_balancer_ip`,
            [
                container_name,
                interface_name,
                privateKey,
                publicKey,
                server_address,
                server_endpoint,
                listenPort,
                dns || null,
                load_balancer_ip || null,
            ]
        );

        let reconciled = true;
        let reconcileError = null;
        try {
            await reconcileInstances();
        } catch (error) {
            reconciled = false;
            reconcileError = error.message;
        }

        return NextResponse.json({ data: result.rows[0], reconciled, reconcileError }, { status: 201 });
    } catch (error) {
        console.error('Error creating instance:', error);
        return NextResponse.json({ error: 'Failed to create instance' }, { status: 500 });
    }
}

async function nextAvailablePort() {
    const result = await query('SELECT COALESCE(MAX(server_listen_port), 0) AS max_port FROM instances');
    return Math.max(Number(result.rows[0].max_port) + 1, 51820);
}
