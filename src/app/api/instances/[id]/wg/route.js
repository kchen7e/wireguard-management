import { NextResponse } from 'next/server';
import { getInstanceById, getClientsByInstanceId, getWgRealTimeData } from '../../../lib/instance.js';

export async function GET(request, { params }) {
    const { id } = await params;
    try {
        const instance = await getInstanceById(id);
        if (!instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        const clients = await getClientsByInstanceId(id);
        const data = await getWgRealTimeData(instance, clients);
        return NextResponse.json({ data });
    } catch (error) {
        console.error('Error fetching WireGuard data:', error);
        return NextResponse.json({ error: 'Failed to fetch WireGuard data' }, { status: 500 });
    }
}
