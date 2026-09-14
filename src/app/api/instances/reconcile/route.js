import { NextResponse } from 'next/server';
import { reconcileInstances } from '../../lib/reconcile.js';

export async function POST() {
    try {
        const ids = await reconcileInstances();
        return NextResponse.json({ success: true, instances: ids });
    } catch (error) {
        console.error('Error reconciling instances:', error);
        return NextResponse.json({ error: 'Failed to reconcile instances' }, { status: 500 });
    }
}
