export class ApiError extends Error {
    constructor(message, status = 0) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

export const CONNECTION_ERROR = 'Cannot reach the backend. Please check your connection and try again.';

export async function apiRequest(url, options = {}) {
    let response;
    try {
        response = await fetch(url, options);
    } catch (error) {
        throw new ApiError(CONNECTION_ERROR, 0);
    }

    let payload = {};
    try {
        payload = await response.json();
    } catch (error) {
        payload = {};
    }

    if (!response.ok) {
        const message = payload.error || `Request failed (${response.status})`;
        throw new ApiError(message, response.status);
    }

    return payload;
}
