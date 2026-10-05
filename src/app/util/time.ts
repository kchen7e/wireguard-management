// Formats a Unix-seconds timestamp as a localized relative time, e.g.
// "now", "2 minutes ago" (en) or "2分钟前" (zh).
export function formatLastSeen(value: number | null | undefined, locale: string, now: number = Date.now()): string {
    if (!value) return '-';
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds <= 0) return String(value);
    const timestamp = seconds * 1000;
    if (!Number.isFinite(timestamp)) return String(value);

    const diffMs = now - timestamp;
    if (diffMs < 0) return String(value);

    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return formatter.format(0, 'second');

    const minutes = Math.floor(diffSec / 60);
    if (minutes < 60) return formatter.format(-minutes, 'minute');

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return formatter.format(-hours, 'hour');

    const days = Math.floor(hours / 24);
    return formatter.format(-days, 'day');
}
