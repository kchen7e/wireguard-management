import { NextResponse } from 'next/server';
import { query } from '../db.js';

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
