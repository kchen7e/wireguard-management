import { AsyncLocalStorage } from 'async_hooks';
import { errorMessage } from '../../util/errors';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

const LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 10,
    info: 30,
    warn: 40,
    error: 50,
    critical: 60,
};

const LEVEL_LABEL: Record<LogLevel, string> = {
    debug: 'DEBUG',
    info: 'INFO',
    warn: 'WARN',
    error: 'ERROR',
    critical: 'CRITICAL',
};

export interface LogContext {
    requestId?: string;
    method?: string;
    path?: string;
}

const context = new AsyncLocalStorage<LogContext>();

export function runWithLogContext<T>(ctx: LogContext, fn: () => T): T {
    return context.run(ctx, fn);
}

function currentContext(): LogContext {
    return context.getStore() ?? {};
}

function resolveLevel(value: string | undefined): LogLevel {
    const normalized = value?.toLowerCase();
    return normalized && normalized in LEVEL_ORDER ? (normalized as LogLevel) : 'info';
}

const threshold = resolveLevel(process.env.LOG_LEVEL);

function enabled(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[threshold];
}

function serializeError(error: Error): Record<string, unknown> {
    return {
        name: error.name,
        message: error.message,
        ...(error.stack ? { stack: error.stack } : {}),
    };
}

function formatPrettyValue(value: unknown): string {
    return typeof value === 'string' ? value : JSON.stringify(value);
}

export function log(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
    if (!enabled(level)) return;

    const ctx = currentContext();
    const time = new Date().toISOString();
    const base: Record<string, unknown> = {
        level,
        time,
        msg: message,
        ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
        ...(ctx.method ? { method: ctx.method } : {}),
        ...(ctx.path ? { path: ctx.path } : {}),
    };

    // Structured JSON in production for log aggregation; readable lines in dev.
    if (process.env.NODE_ENV === 'production') {
        const entry: Record<string, unknown> = { ...base };
        for (const [key, value] of Object.entries(fields ?? {})) {
            entry[key] = value instanceof Error ? serializeError(value) : value;
        }
        process.stdout.write(JSON.stringify(entry) + '\n');
        return;
    }

    const parts: string[] = [time, LEVEL_LABEL[level]];
    if (ctx.requestId) parts.push(`[${ctx.requestId}]`);
    parts.push(message);
    const stacks: string[] = [];
    for (const [key, value] of Object.entries(fields ?? {})) {
        if (value instanceof Error) {
            parts.push(`${key}=${value.name}: ${value.message}`);
            if (value.stack) stacks.push(value.stack);
        } else if (value !== undefined) {
            parts.push(`${key}=${formatPrettyValue(value)}`);
        }
    }
    process.stdout.write(parts.join(' ') + '\n');
    for (const stack of stacks) {
        process.stdout.write(stack + '\n');
    }
}

export const logger = {
    debug: (message: string, fields?: Record<string, unknown>) => log('debug', message, fields),
    info: (message: string, fields?: Record<string, unknown>) => log('info', message, fields),
    warn: (message: string, fields?: Record<string, unknown>) => log('warn', message, fields),
    error: (message: string, fields?: Record<string, unknown>) => log('error', message, fields),
    critical: (message: string, fields?: Record<string, unknown>) => log('critical', message, fields),
};

// Main-workflow failures log a concise reason at ERROR (no stack); the full
// detail, including the stack trace, stays at DEBUG for when verbosity is on.
export function logFailure(operation: string, error: unknown): void {
    logger.error(`Failed to ${operation}`, { error: errorMessage(error) });
    logger.debug(`Failed to ${operation}`, { error });
}
