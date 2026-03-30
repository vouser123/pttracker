// app/serwist/[path]/route.js — Serwist route handler (Turbopack integration).
// Serves the generated service worker and its precache manifest at /serwist/sw.js.
// @serwist/turbopack injects the build-time precache manifest into app/sw.js
// at build time via this route handler.

import { spawnSync } from 'node:child_process';
import { createSerwistRoute } from '@serwist/turbopack';

// Use git HEAD for revision hashing of manually-added precache entries.
// /_next/static/** entries get revision hashes automatically from their content.
const revision =
    spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout.trim() ||
    crypto.randomUUID();

// esbuild-wasm on Windows requires forward-slash absolute paths.
// process.cwd() is the project root; convert backslashes for esbuild-wasm compat.
const cwd = process.cwd().replace(/\\/g, '/');

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
    swSrc: 'app/sw.js',
    cwd,
    additionalPrecacheEntries: [
        { url: '/~offline', revision },
        { url: '/icons/icon.svg', revision },
        { url: '/manifest-tracker.json', revision },
    ],
    // Native esbuild conflicts with Vercel's pinned esbuild@0.14.47.
    // Use esbuild-wasm instead (no version conflict).
    useNativeEsbuild: false,
    // Disable source maps — esbuild-wasm on Windows fails generating .map files
    // due to backslash path handling. Not needed in production.
    esbuildOptions: { sourcemap: false },
});
