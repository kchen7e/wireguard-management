import { NextResponse } from 'next/server';
import { query } from '../../db.js';
import { lbMode } from '../../lib/templates.js';
import { nextAvailableLoadBalancerIp } from '../../lib/lb-pool.js';

export async function GET() {
    try {
        const shared = lbMode() === 'shared';

        let nextLoadBalancerIp = null;
        if (!shared) {
            const reserved = await query('SELECT load_balancer_ip FROM instances WHERE load_balancer_ip IS NOT NULL');
            nextLoadBalancerIp = nextAvailableLoadBalancerIp(reserved.rows.map((row) => row.load_balancer_ip));
        }

        return NextResponse.json({
            data: { mode: shared ? 'shared' : 'dedicated', next_load_balancer_ip: nextLoadBalancerIp },
        });
    } catch (error) {
        console.error('Error resolving load balancer pool:', error);
        return NextResponse.json({ error: 'Failed to resolve load balancer pool' }, { status: 500 });
    }
}
