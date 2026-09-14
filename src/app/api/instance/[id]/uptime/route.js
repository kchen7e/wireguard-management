import { NextResponse } from 'next/server';
import { getInstanceById, getContainerUptime } from '../../../lib/instance.js';

export async function GET(request, { params }) {
    const { id } = await params;
    try {
        const instance = await getInstanceById(id);
        if (!instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        const startedAt = await getContainerUptime();
        return NextResponse.json({ data: { startedAt } });
    } catch (error) {
        console.error('Error fetching container uptime:', error);
        return NextResponse.json({ error: 'Failed to fetch container uptime' }, { status: 500 });
    }
}
