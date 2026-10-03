import { describe, it, expect } from 'vitest';
import { formatLastSeen } from '../src/app/util/time.js';

const NOW = 1700000000000; // 2023-11-14T22:13:20Z

function secondsAgo(seconds) {
    return Math.floor((NOW - seconds * 1000) / 1000);
}

describe('formatLastSeen', () => {
    it('returns a dash for a missing timestamp', () => {
        expect(formatLastSeen(null, 'en-GB', NOW)).toBe('-');
        expect(formatLastSeen(undefined, 'en-GB', NOW)).toBe('-');
        expect(formatLastSeen(0, 'en-GB', NOW)).toBe('-');
    });

    it('localizes relative time in English', () => {
        expect(formatLastSeen(secondsAgo(5), 'en-GB', NOW)).toBe('now');
        expect(formatLastSeen(secondsAgo(120), 'en-GB', NOW)).toBe('2 minutes ago');
        expect(formatLastSeen(secondsAgo(3 * 3600), 'en-GB', NOW)).toBe('3 hours ago');
        expect(formatLastSeen(secondsAgo(4 * 86400), 'en-GB', NOW)).toBe('4 days ago');
    });

    it('localizes relative time in Chinese', () => {
        expect(formatLastSeen(secondsAgo(5), 'zh-CN', NOW)).toBe('现在');
        expect(formatLastSeen(secondsAgo(120), 'zh-CN', NOW)).toBe('2分钟前');
        expect(formatLastSeen(secondsAgo(3 * 3600), 'zh-CN', NOW)).toBe('3小时前');
        expect(formatLastSeen(secondsAgo(4 * 86400), 'zh-CN', NOW)).toBe('4天前');
    });

    it('returns the raw value for future timestamps', () => {
        const future = Math.floor((NOW + 60000) / 1000);
        expect(formatLastSeen(future, 'en-GB', NOW)).toBe(String(future));
    });
});
