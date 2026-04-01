// app/layout.js — Root App Router layout.
// Server Component: runs on the server; no 'use client'.
// Applies to all routes under app/. Pages Router routes (pages/) use _app.js/_document.js instead.

import { StrictMode } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { SerwistProvider } from './components/SerwistRegistrar';
import '../styles/globals.css';

export const metadata = {
    title: {
        template: '%s — PT Tracker',
        default: 'PT Tracker',
    },
    icons: {
        icon: '/icons/icon.svg',
        apple: '/icons/icon.svg',
    },
    manifest: '/manifest-tracker.json',
    other: {
        'mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-title': 'PT Tracker',
    },
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <SerwistProvider swUrl="/serwist/sw.js" cacheOnNavigation>
                    <StrictMode>{children}</StrictMode>
                </SerwistProvider>
                <SpeedInsights />
                <Analytics />
            </body>
        </html>
    );
}
