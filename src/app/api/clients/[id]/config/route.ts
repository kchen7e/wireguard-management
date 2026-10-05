import { NextResponse } from 'next/server';
import { getInstanceById, getClientById } from '../../../lib/instance';
import { buildClientConfig } from '../../../lib/config';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const client = await getClientById(id);
        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        const instance = await getInstanceById(client.instance_id);
        if (!instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        const config = buildClientConfig(client, instance);
        const filename = `${client.description.replace(/\s+/g, '_')}.conf`;

        return new NextResponse(config, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Error generating client config:', error);
        return NextResponse.json({ error: 'Failed to generate client config' }, { status: 500 });
    }
}
