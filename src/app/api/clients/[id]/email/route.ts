import { NextResponse } from 'next/server';
import { getClientById, getInstanceById } from '../../../lib/instance';
import { buildClientConfig } from '../../../lib/config';
import {
    isValidEmailAddress,
    renderEmailContent,
    resolveLanguage,
    sendClientConfigEmail,
    smtpConfigured,
} from '../../../lib/email';
import type { EmailTemplateData } from '../../../lib/email';

function endpointOf(instance: { server_endpoint: string; server_listen_port: number }): string {
    return `${instance.server_endpoint}:${instance.server_listen_port}`;
}

function emailData(
    client: { description: string; client_ip: string },
    instance: { server_endpoint: string; server_listen_port: number }
): EmailTemplateData {
    return {
        description: client.description,
        client_ip: client.client_ip,
        server_endpoint: endpointOf(instance),
    };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const client = await getClientById(id);
        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        const instance = await getInstanceById(client.instance_id);
        if (!instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        const lang = resolveLanguage(new URL(request.url).searchParams.get('lang'));
        const { subject, text } = renderEmailContent(emailData(client, instance), lang);
        return NextResponse.json({ subject, body: text });
    } catch (error) {
        console.error('Error rendering email content:', error);
        return NextResponse.json({ error: 'Failed to render email content' }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const client = await getClientById(id);
        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        const instance = await getInstanceById(client.instance_id);
        if (!instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const data = (body ?? {}) as { recipient?: unknown; lang?: unknown };
        const recipient = typeof data.recipient === 'string' ? data.recipient.trim() : '';
        if (!isValidEmailAddress(recipient)) {
            return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
        }

        if (!smtpConfigured()) {
            console.error('Email requested but SMTP is not configured (SMTP_HOST / EMAIL_FROM)');
            return NextResponse.json({ error: 'Email is not configured on this server' }, { status: 503 });
        }

        const lang = resolveLanguage(data.lang);
        const config = buildClientConfig(client, instance);
        const filename = `${client.description.replace(/\s+/g, '_')}.conf`;

        await sendClientConfigEmail({
            recipient,
            data: emailData(client, instance),
            config,
            filename,
            lang,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error sending client config email:', error);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
}
