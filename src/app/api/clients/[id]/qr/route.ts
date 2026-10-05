import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
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
        const pngBuffer = await QRCode.toBuffer(config, { type: 'png', width: 400 });

        return new NextResponse(pngBuffer as unknown as BodyInit, {
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
