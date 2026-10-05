import { NextResponse } from 'next/server';
import { query } from '../../../db';
import { generateKeyPair, generatePSK, reloadInstanceById } from '../../../lib/instance';
import { isIpInSubnet, parseCidr } from '../../../../util/ip';
import { isValidDescription } from '../../../../util/name';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const instanceResult = await query('SELECT id FROM instances WHERE id = $1', [id]);
        if (instanceResult.rowCount === 0) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        const result = await query(
            `SELECT id, description, client_ip::TEXT AS client_ip, allowed_ips, public_key, psk FROM clients WHERE instance_id = $1 ORDER BY id`,
            [id]
        );
        return NextResponse.json({ data: result.rows });
    } catch (error) {
        console.error('Error fetching clients:', error);
        return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const instanceResult = await query('SELECT id, server_vpn_ip FROM instances WHERE id = $1', [id]);
        if (instanceResult.rowCount === 0) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }
        const instance = instanceResult.rows[0];

        const body = await request.json();
        const { description, clientIp, allowedIPs = '0.0.0.0/0' } = body;

        if (!description || !clientIp) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!isValidDescription(description)) {
            return NextResponse.json(
                { error: 'Description may only contain letters, digits, spaces and ._- (e.g. Alice)' },
                { status: 400 }
            );
        }

        const clientAddress = parseCidr(clientIp);
        if (!clientAddress || clientAddress.prefix !== 32) {
            return NextResponse.json(
                { error: 'Client IP must be a single host (e.g. 10.13.13.4 or 10.13.13.4/32)' },
                { status: 400 }
            );
        }

        if (!isIpInSubnet(clientAddress.ip, instance.server_vpn_ip)) {
            return NextResponse.json(
                { error: `Client IP must be within the server subnet ${instance.server_vpn_ip}` },
                { status: 400 }
            );
        }

        const { publicKey, privateKey } = generateKeyPair();
        const psk = await generatePSK();

        const result = await query(
            `INSERT INTO clients (instance_id, description, client_ip, allowed_ips, public_key, private_key, psk)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, description, client_ip::TEXT AS client_ip, allowed_ips, public_key, psk`,
            [id, description, clientIp, allowedIPs, publicKey, privateKey, psk]
        );

        let reloaded = true;
        try {
            await reloadInstanceById(id);
        } catch (error) {
            reloaded = false;
        }

        return NextResponse.json({ data: result.rows[0], reloaded }, { status: 201 });
    } catch (error) {
        console.error('Error creating client:', error);
        return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
    }
}
