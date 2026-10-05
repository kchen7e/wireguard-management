import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import 'antd/dist/reset.css';
import './globals.css';

import AppShell from './AppShell';

const geistSans = localFont({
    src: './fonts/GeistVF.woff',
    variable: '--font-geist-sans',
    weight: '100 900',
});
const geistMono = localFont({
    src: './fonts/GeistMonoVF.woff',
    variable: '--font-geist-mono',
    weight: '100 900',
});

export const metadata: Metadata = {
    title: 'WireGuard Management',
    description: 'Manage WireGuard instances on a k3s cluster',
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en-GB">
            <body className={`${geistSans.variable} ${geistMono.variable}`}>
                <AppShell>{children}</AppShell>
            </body>
        </html>
    );
}
