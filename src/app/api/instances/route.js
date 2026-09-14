import { NextResponse } from 'next/server';
import { query } from '../db.js';
import { generateKeyPair } from '../lib/instance.js';
import { reconcileInstances } from '../lib/reconcile.js';
import { isValidPrivateCidr } from '../../util/ip.js';

export async function GET() {
    try {
        const result = await query(
            `SELECT id, container_name, interface_name, server_public_key, server_address, server_endpoint, server_listen_port, dns FROM instances ORDER BY id`
        );
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
            dns,
            interface_name = 'wg0',
        } = body;

        if (!container_name || !server_address || !server_endpoint || !server_listen_port) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!isValidPrivateCidr(server_address)) {
            return NextResponse.json(
                { error: 'Server address must be a valid private CIDR (e.g. 10.13.13.1/24)' },
                { status: 400 }
            );
        }

        const { publicKey, privateKey } = generateKeyPair();

        const result = await query(
            `INSERT INTO instances (container_name, interface_name, server_private_key, server_public_key, server_address, server_endpoint, server_listen_port, dns)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, container_name, interface_name, server_public_key, server_address, server_endpoint, server_listen_port, dns`,
            [
                container_name,
                interface_name,
                privateKey,
                publicKey,
                server_address,
                server_endpoint,
                server_listen_port,
                dns || null,
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
