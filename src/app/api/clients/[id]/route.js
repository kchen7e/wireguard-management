import { NextResponse } from 'next/server';
import { query } from '../../db.js';
import { getClientById, reloadInstanceById } from '../../lib/instance.js';

export async function DELETE(request, { params }) {
    const { id } = await params;
    try {
        const client = await getClientById(id);
        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        await query('DELETE FROM clients WHERE id = $1', [id]);

        let reloaded = true;
        try {
            await reloadInstanceById(client.instance_id);
        } catch (error) {
            reloaded = false;
        }

        return NextResponse.json({ success: true, reloaded });
    } catch (error) {
        console.error('Error deleting client:', error);
        return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
    }
}
