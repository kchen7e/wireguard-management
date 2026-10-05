import { describe, it, expect } from 'vitest';
import { nextAvailablePort, portBase } from '../src/app/api/lib/port-pool';

const BASE = 51820;

describe('nextAvailablePort', () => {
    it('starts at the base port when nothing is in use', () => {
        expect(nextAvailablePort([], { base: BASE })).toBe(BASE);
    });

    it('returns the first free port above the base', () => {
        expect(nextAvailablePort([51820, 51821, 51822], { base: BASE })).toBe(51823);
    });

    it('reclaims a gap freed by a deleted instance', () => {
        expect(nextAvailablePort([51820, 51822], { base: BASE })).toBe(51821);
    });

    it('coerces numeric strings from the database and ignores invalid entries', () => {
        expect(nextAvailablePort(['51820', null, undefined, 0, 'nope'], { base: BASE })).toBe(51821);
    });

    it('is not blocked by used ports outside the range', () => {
        expect(nextAvailablePort([60000], { base: BASE, max: 51821 })).toBe(51820);
    });

    it('returns null when the range is exhausted', () => {
        expect(nextAvailablePort([51820, 51821], { base: BASE, max: 51821 })).toBeNull();
    });

    it('uses WG_PORT_BASE as the default base', () => {
        const original = process.env.WG_PORT_BASE;
        process.env.WG_PORT_BASE = '60000';
        try {
            expect(nextAvailablePort([])).toBe(60000);
        } finally {
            restoreEnv('WG_PORT_BASE', original);
        }
    });

    it('falls back to 51820 for an invalid WG_PORT_BASE', () => {
        const original = process.env.WG_PORT_BASE;
        process.env.WG_PORT_BASE = 'not-a-port';
        try {
            expect(nextAvailablePort([])).toBe(51820);
        } finally {
            restoreEnv('WG_PORT_BASE', original);
        }
    });
});

describe('portBase', () => {
    it('defaults to 51820 when unset', () => {
        const original = process.env.WG_PORT_BASE;
        delete process.env.WG_PORT_BASE;
        try {
            expect(portBase()).toBe(51820);
        } finally {
            restoreEnv('WG_PORT_BASE', original);
        }
    });

    it('rejects values outside the valid port range', () => {
        const original = process.env.WG_PORT_BASE;
        process.env.WG_PORT_BASE = '70000';
        try {
            expect(portBase()).toBe(51820);
        } finally {
            restoreEnv('WG_PORT_BASE', original);
        }
    });
});

function restoreEnv(key: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[key];
    } else {
        process.env[key] = value;
    }
}
