import { NextResponse } from 'next/server';
import { query } from '../../db';
import { SAFE_INSTANCE_FIELDS } from '../../lib/instance';
import { logFailure } from '../../lib/logger';
import { withLogging } from '../../lib/withLogging';

export const GET = withLogging(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    try {
        const result = await query(`SELECT ${SAFE_INSTANCE_FIELDS} FROM instances WHERE id = $1`, [id]);
        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }
        return NextResponse.json({ data: result.rows[0] });
    } catch (error) {
        logFailure('fetch instance', error);
        return NextResponse.json({ error: 'Failed to fetch instance' }, { status: 500 });
    }
});
