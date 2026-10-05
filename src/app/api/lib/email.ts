import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import { TEMPLATES_DIR } from './templates';

const EMAILS_DIR = path.join(TEMPLATES_DIR, 'email');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmailLanguage = 'en' | 'zh';

export interface EmailTemplateData {
    description: string;
    client_ip: string;
    server_endpoint: string;
}

type Template = ReturnType<typeof handlebars.compile>;

function loadTemplate(name: string, lang: EmailLanguage): Template {
    return handlebars.compile(fs.readFileSync(path.join(EMAILS_DIR, `${name}.${lang}.hbs`), 'utf8'));
}

interface EmailTemplates {
    subject: Template;
    body: Template;
    bodyText: Template;
}

const TEMPLATES: Record<EmailLanguage, EmailTemplates> = {
    en: {
        subject: loadTemplate('subject', 'en'),
        body: loadTemplate('body', 'en'),
        bodyText: loadTemplate('body_text', 'en'),
    },
    zh: {
        subject: loadTemplate('subject', 'zh'),
        body: loadTemplate('body', 'zh'),
        bodyText: loadTemplate('body_text', 'zh'),
    },
};

export function isValidEmailAddress(value: string): boolean {
    return EMAIL_RE.test(value);
}

export function smtpConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST && process.env.EMAIL_FROM);
}

export function resolveLanguage(value: unknown): EmailLanguage {
    return value === 'zh' ? 'zh' : 'en';
}

export function renderEmailContent(
    data: EmailTemplateData,
    lang: EmailLanguage
): { subject: string; html: string; text: string } {
    const templates = TEMPLATES[lang];
    return {
        subject: templates.subject(data).trim(),
        html: templates.body(data),
        text: templates.bodyText(data),
    };
}

export async function sendClientConfigEmail(opts: {
    recipient: string;
    data: EmailTemplateData;
    config: string;
    filename: string;
    lang: EmailLanguage;
}): Promise<void> {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });

    const { subject, html, text } = renderEmailContent(opts.data, opts.lang);

    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: opts.recipient,
        subject,
        html,
        text,
        attachments: [{ filename: opts.filename, content: opts.config }],
    });
}
