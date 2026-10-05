import { describe, it, expect } from 'vitest'; // or import { expect } from 'jest' for Jest

describe('Intl keys test', () => {
    it('should have the same keys in CN_ZH and EN_GB', () => {
        return import('../src/app/intl.js').then(({ CN_ZH, EN_GB }) => {
            const cnKeys = Object.keys(CN_ZH);
            const enKeys = Object.keys(EN_GB);
            expect(cnKeys).toEqual(enKeys);
        });
    });
});
