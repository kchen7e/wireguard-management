const DEFAULT_PORT_BASE = 51820;
const MAX_PORT = 65535;
const PORT_BASE_ENV = 'WG_PORT_BASE';

// WireGuard's conventional port is 51820; `WG_PORT_BASE` moves the start of the
// search range, which is useful when an upstream router or firewall maps a
// different block of ports.
export function portBase(): number {
    const value = Number(process.env[PORT_BASE_ENV]);
    if (!Number.isInteger(value) || value < 1 || value > MAX_PORT) {
        return DEFAULT_PORT_BASE;
    }
    return value;
}

// Returns the first unused port in [base, max], so a port freed by deleting an
// instance becomes available again. Returns null when the range is exhausted.
export function nextAvailablePort(
    existingPorts: unknown[],
    { base = portBase(), max = MAX_PORT }: { base?: number; max?: number } = {}
): number | null {
    const used = new Set((existingPorts ?? []).map(Number).filter((port) => Number.isInteger(port) && port > 0));

    for (let port = base; port <= max; port += 1) {
        if (!used.has(port)) return port;
    }
    return null;
}
