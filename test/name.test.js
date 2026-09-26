import { describe, it, expect } from 'vitest';
import { isValidInstanceName, isValidDescription } from '../src/app/util/name.js';

describe('name utilities', () => {
    it('validates instance names', () => {
        expect(isValidInstanceName('wireguard-1')).toBe(true);
        expect(isValidInstanceName('wireguard1')).toBe(true);
        expect(isValidInstanceName('a')).toBe(true);
        expect(isValidInstanceName('wg-0')).toBe(true);
        expect(isValidInstanceName('wireguard_1')).toBe(false);
        expect(isValidInstanceName('WireGuard-1')).toBe(false);
        expect(isValidInstanceName('-wireguard')).toBe(false);
        expect(isValidInstanceName('wireguard-')).toBe(false);
        expect(isValidInstanceName('wire guard')).toBe(false);
        expect(isValidInstanceName('')).toBe(false);
        expect(isValidInstanceName(null)).toBe(false);
        expect(isValidInstanceName(undefined)).toBe(false);
    });

    it('validates client descriptions', () => {
        expect(isValidDescription('Alice')).toBe(true);
        expect(isValidDescription('test 1')).toBe(true);
        expect(isValidDescription('user-2')).toBe(true);
        expect(isValidDescription('bob.smith')).toBe(true);
        expect(isValidDescription('a_b-c.d e')).toBe(true);
        expect(isValidDescription('')).toBe(false);
        expect(isValidDescription(' lead')).toBe(false);
        expect(isValidDescription('trail ')).toBe(false);
        expect(isValidDescription('bad#name')).toBe(false);
        expect(isValidDescription('bad\nname')).toBe(false);
        expect(isValidDescription(null)).toBe(false);
    });
});
