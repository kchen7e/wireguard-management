import { NextResponse } from 'next/server';
import { reconcileInstances } from '../../lib/reconcile';
import { logFailure } from '../../lib/logger';
import { withLogging } from '../../lib/withLogging';

export const POST = withLogging(async (request: Request) => {
    try {
        const ids = await reconcileInstances();
        return NextResponse.json({ success: true, instances: ids });
    } catch (error) {
        logFailure('reconcile instances', error);
        return NextResponse.json({ error: 'Failed to reconcile instances' }, { status: 500 });
    }
});
