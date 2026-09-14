import { describe, it, expect } from 'vitest';
import { generateKeyPair } from '../src/app/api/lib/instance.js';

describe('generateKeyPair', () => {
    it('produces 44-char base64 WireGuard keys', () => {
        const keys = generateKeyPair();
        expect(keys.publicKey).toHaveLength(44);
        expect(keys.privateKey).toHaveLength(44);
        expect(keys.publicKey).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
        expect(keys.privateKey).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
        expect(keys.publicKey).not.toBe(keys.privateKey);
    });

    it('produces unique keys per call', () => {
        const a = generateKeyPair();
        const b = generateKeyPair();
        expect(a.publicKey).not.toBe(b.publicKey);
        expect(a.privateKey).not.toBe(b.privateKey);
    });
});
