import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getInstanceById, getClientById } from '../../../../lib/instance.js';
import { buildClientConfig } from '../../../../lib/config.js';

export async function GET(request, { params }) {
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
        const pngBuffer = await QRCode.toBuffer(config, { type: 'png', width: 400 });

        return new NextResponse(pngBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Error generating QR code:', error);
        return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
    }
}
