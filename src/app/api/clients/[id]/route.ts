import { NextResponse } from 'next/server';
import { query } from '../../db';
import { getClientById, reloadInstanceById } from '../../lib/instance';
import { isValidDescription } from '../../../util/name';
import { errorMessage } from '../../../util/errors';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const client = await getClientById(id);
        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        await query('DELETE FROM clients WHERE id = $1', [id]);

        try {
            await reloadInstanceById(client.instance_id);
        } catch (error) {
            console.error('Error reloading WireGuard after client delete:', error);
            return NextResponse.json(
                { error: `Client deleted but WireGuard reload failed: ${errorMessage(error)}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, reloaded: true });
    } catch (error) {
        console.error('Error deleting client:', error);
        return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const client = await getClientById(id);
        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        const body = await request.json();
        const { description } = body;

        if (!description || !isValidDescription(description)) {
            return NextResponse.json(
                { error: 'Description may only contain letters, digits, spaces and ._- (e.g. Alice)' },
                { status: 400 }
            );
        }

        const result = await query(
            `UPDATE clients SET description = $1, updated_at = NOW() WHERE id = $2
             RETURNING id, description, client_ip::TEXT AS client_ip, allowed_ips, public_key, psk`,
            [description, id]
        );

        try {
            await reloadInstanceById(client.instance_id);
        } catch (error) {
            console.error('Error reloading WireGuard after client update:', error);
            return NextResponse.json(
                { error: `Client updated but WireGuard reload failed: ${errorMessage(error)}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ data: result.rows[0], reloaded: true });
    } catch (error) {
        console.error('Error updating client:', error);
        return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
    }
}
