export class ApiError extends Error {
    status: number;

    constructor(message: string, status = 0) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

export const CONNECTION_ERROR = 'Cannot reach the backend. Please check your connection and try again.';

export async function apiRequest<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
        response = await fetch(url, options);
    } catch {
        throw new ApiError(CONNECTION_ERROR, 0);
    }

    let payload: any = {};
    try {
        payload = await response.json();
    } catch {
        payload = {};
    }

    if (!response.ok) {
        const message = payload.error || `Request failed (${response.status})`;
        throw new ApiError(message, response.status);
    }

    return payload as T;
}
