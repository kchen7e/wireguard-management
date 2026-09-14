import { NextResponse } from 'next/server';
import { query } from '../../db.js';

const SAFE_INSTANCE_FIELDS = `
    id,
    container_name,
    interface_name,
    server_public_key,
    server_address,
    server_endpoint,
    server_listen_port,
    dns,
    created_at,
    updated_at
`;

export async function GET(request, { params }) {
    const { id } = await params;
    try {
        const result = await query(`SELECT ${SAFE_INSTANCE_FIELDS} FROM instances WHERE id = $1`, [id]);
        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }
        return NextResponse.json({ data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching instance:', error);
        return NextResponse.json({ error: 'Failed to fetch instance' }, { status: 500 });
    }
}
