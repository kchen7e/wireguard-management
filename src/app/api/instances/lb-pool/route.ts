import { NextResponse } from 'next/server';
import { query } from '../../db';
import { lbMode, sharedLoadBalancerIp } from '../../lib/templates';
import { nextAvailableLoadBalancerIp } from '../../lib/lb-pool';
import { nextAvailablePort } from '../../lib/port-pool';

export async function GET() {
    try {
        const shared = lbMode() === 'shared';

        const reserved = await query('SELECT load_balancer_ip, server_listen_port FROM instances');

        // Shared mode pins one global IP for every instance, so there is no
        // "next" IP to hand out - preview that shared IP instead.
        const loadBalancerIp = shared
            ? sharedLoadBalancerIp()
            : nextAvailableLoadBalancerIp(reserved.rows.map((row) => row.load_balancer_ip));

        const nextListenPort = nextAvailablePort(reserved.rows.map((row) => row.server_listen_port));

        return NextResponse.json({
            data: {
                mode: shared ? 'shared' : 'dedicated',
                load_balancer_ip: loadBalancerIp,
                next_listen_port: nextListenPort,
            },
        });
    } catch (error) {
        console.error('Error resolving next allocation:', error);
        return NextResponse.json({ error: 'Failed to resolve next allocation' }, { status: 500 });
    }
}
