import { NextResponse } from 'next/server';
import { getInstanceById, reloadWireGuardContainer } from '../../../lib/instance.js';

export async function POST(request, { params }) {
    const { id } = await params;
    try {
        const instance = await getInstanceById(id);
        if (!instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        await reloadWireGuardContainer();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error reloading WireGuard config:', error);
        return NextResponse.json({ error: 'Failed to reload WireGuard config' }, { status: 500 });
    }
}
