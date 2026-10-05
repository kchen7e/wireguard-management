import { NextResponse } from 'next/server';
import { getInstanceById, getClientsByInstanceId, getWgRealTimeData } from '../../../lib/instance';
import { logFailure } from '../../../lib/logger';
import { withLogging } from '../../../lib/withLogging';

export const GET = withLogging(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
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
        logFailure('fetch WireGuard data', error);
        return NextResponse.json({ error: 'Failed to fetch WireGuard data' }, { status: 500 });
    }
});
