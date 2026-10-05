import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { log, runWithLogContext, type LogLevel } from './logger';

export function withLogging<Args extends unknown[]>(
    handler: (...args: Args) => Response | Promise<Response>
): (...args: Args) => Promise<Response> {
    return async (...args: Args) => {
        const request = args[0] as Request;
        const requestId = randomUUID();
        const method = request.method;
        const url = new URL(request.url);
        const path = url.pathname + url.search;
        const startedAt = process.hrtime.bigint();

        return runWithLogContext({ requestId, method, path }, async () => {
            try {
                const response = await handler(...args);
                log(levelForStatus(response.status), `${method} ${path} ${response.status}`, {
                    status: response.status,
                    durationMs: elapsedMs(startedAt),
                });
                return response;
            } catch (error) {
                log('critical', `${method} ${path} crashed`, {
                    durationMs: elapsedMs(startedAt),
                    error,
                });
                return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
            }
        });
    };
}

function levelForStatus(status: number): LogLevel {
    if (status >= 500) return 'error';
    if (status >= 400) return 'warn';
    return 'info';
}

function elapsedMs(startedAt: bigint): number {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    return Math.round(ms * 100) / 100;
}
