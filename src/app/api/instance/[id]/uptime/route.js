import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const allowedOrigin = 'https://your-frontend-domain.com';
    const origin = request.headers.get('Origin');

    if (origin !== allowedOrigin) {
        return new Response('Forbidden', { status: 403 });
    }
    const { id } = params;
    return NextResponse.json({ message: `Test for ID: ${id}` });
}

// docker inspect --format '{{.State.StartedAt}}' 5db5d3470dfd
// 2024-12-05T09:38:27.347115957Z
