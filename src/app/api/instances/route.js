import { NextResponse } from 'next/server';
import { query } from '../db.js';
import { generateKeyPair, SAFE_INSTANCE_FIELDS } from '../lib/instance.js';
import { reconcileInstances } from '../lib/reconcile.js';
import { isValidServerCidr } from '../../util/ip.js';
import { isValidInstanceName } from '../../util/name.js';
import { lbMode } from '../lib/templates.js';
import { nextAvailableLoadBalancerIp } from '../lib/lb-pool.js';
import { nextAvailablePort } from '../lib/port-pool.js';

export async function GET() {
    try {
        const result = await query(`SELECT ${SAFE_INSTANCE_FIELDS} FROM instances ORDER BY id`);
        return NextResponse.json({ data: result.rows });
    } catch (error) {
        console.error('Error fetching instances:', error);
        return NextResponse.json({ error: 'Failed to fetch instances' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { container_name, server_vpn_ip, server_endpoint, dns, interface_name = 'wg0' } = body;

        if (!container_name || !server_vpn_ip || !server_endpoint) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!isValidInstanceName(container_name)) {
            return NextResponse.json(
                { error: 'Instance name must be lowercase letters, digits and hyphens (e.g. wireguard-1)' },
                { status: 400 }
            );
        }

        if (!isValidServerCidr(server_vpn_ip)) {
            return NextResponse.json(
                { error: 'Server VPN IP must be a private network CIDR between /24 and /30 (e.g. 172.28.15.0/24)' },
                { status: 400 }
            );
        }

        const shared = lbMode() === 'shared';

        const reserved = await query('SELECT load_balancer_ip, server_listen_port FROM instances');

        const listenPort = nextAvailablePort(reserved.rows.map((row) => row.server_listen_port));
        if (listenPort === null) {
            return NextResponse.json({ error: 'No free WireGuard port available' }, { status: 409 });
        }

        let loadBalancerIp = null;
        if (!shared) {
            loadBalancerIp = nextAvailableLoadBalancerIp(reserved.rows.map((row) => row.load_balancer_ip));
        }

        const { publicKey, privateKey } = generateKeyPair();

        const result = await query(
            `INSERT INTO instances (container_name, interface_name, server_private_key, server_public_key, server_vpn_ip, server_endpoint, server_listen_port, dns, load_balancer_ip)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id, container_name, interface_name, server_public_key, server_vpn_ip, server_endpoint, server_listen_port, dns, load_balancer_ip`,
            [
                container_name,
                interface_name,
                privateKey,
                publicKey,
                server_vpn_ip,
                server_endpoint,
                listenPort,
                dns || null,
                loadBalancerIp,
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
