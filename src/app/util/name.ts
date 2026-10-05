const INSTANCE_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const DESCRIPTION_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9 _.-]{0,62}[A-Za-z0-9])?$/;

export function isValidInstanceName(name: unknown): boolean {
    if (typeof name !== 'string') return false;
    return INSTANCE_NAME_PATTERN.test(name);
}

export function isValidDescription(description: unknown): boolean {
    if (typeof description !== 'string') return false;
    return DESCRIPTION_PATTERN.test(description);
}
