'use client';
// app/components/ServiceWorkerRegistrar.js — registers the service worker client-side.
// 'use client' is required — navigator.serviceWorker is browser-only.

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        }
    }, []);

    return null;
}
