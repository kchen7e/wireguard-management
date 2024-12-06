import { NextResponse } from 'next/server';

export async function GET(request) {
    // const allowedOrigin = 'https://your-frontend-domain.com'; // replace with your frontend domain
    // const origin = request.headers.get('Origin');

    // if (origin !== allowedOrigin) {
    //     return new Response('Forbidden', { status: 403 });
    // }
    return NextResponse.json({ message: 'Test' });
}
