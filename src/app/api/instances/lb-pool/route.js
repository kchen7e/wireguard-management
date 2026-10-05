import { NextResponse } from 'next/server';
import { query } from '../../db.js';
import { lbMode } from '../../lib/templates.js';
import { nextAvailableLoadBalancerIp } from '../../lib/lb-pool.js';
import { nextAvailablePort } from '../../lib/port-pool.js';

export async function GET() {
    try {
        const shared = lbMode() === 'shared';

        const reserved = await query('SELECT load_balancer_ip, server_listen_port FROM instances');

        let nextLoadBalancerIp = null;
        if (!shared) {
            nextLoadBalancerIp = nextAvailableLoadBalancerIp(reserved.rows.map((row) => row.load_balancer_ip));
        }

        const nextListenPort = nextAvailablePort(reserved.rows.map((row) => row.server_listen_port));

        return NextResponse.json({
            data: {
                mode: shared ? 'shared' : 'dedicated',
                next_load_balancer_ip: nextLoadBalancerIp,
                next_listen_port: nextListenPort,
            },
        });
    } catch (error) {
        console.error('Error resolving next allocation:', error);
        return NextResponse.json({ error: 'Failed to resolve next allocation' }, { status: 500 });
    }
}
