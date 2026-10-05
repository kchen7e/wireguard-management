import { NextResponse } from 'next/server';
import { getInstanceById, getClientsByInstanceId, reloadWireGuardContainer } from '../../../lib/instance';
import { logFailure } from '../../../lib/logger';
import { withLogging } from '../../../lib/withLogging';

export const POST = withLogging(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    try {
        const instance = await getInstanceById(id);
        if (!instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        const clients = await getClientsByInstanceId(id);
        const result = await reloadWireGuardContainer(instance, clients);
        return NextResponse.json(result);
    } catch (error) {
        logFailure('reload WireGuard config', error);
        return NextResponse.json({ error: 'Failed to reload WireGuard config' }, { status: 500 });
    }
});
