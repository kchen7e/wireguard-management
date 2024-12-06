import { NextResponse } from 'next/server';
import { connectDB, getDB, getCollection, closeDB } from './db.js';

export async function GET(request) {
    // const allowedOrigin = 'https://your-frontend-domain.com'; // replace with your frontend domain
    // const origin = request.headers.get('Origin');

    // if (origin !== allowedOrigin) {
    //     return new Response('Forbidden', { status: 403 });
    // }
    let data;
    try {
        const wgCollection = await getCollection('wg');
        const fields = await wgCollection
            .find(
                {}, // Empty filter to match all documents
                { projection: { ip: 1, publicKey: 1, allowedIPs: 1, description: 1, _id: 0 } }
            )
            .toArray();
        data = fields;
    } catch (error) {
        console.error('Error fetching fields from wg collection:', error);
        throw error;
    }
    return NextResponse.json({ data: data });
}
