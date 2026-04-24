// app/sw.js — Serwist service worker
// Generated at build time by @serwist/turbopack. The __SW_MANIFEST injection
// point is replaced with the actual precache manifest during the build.
//
// Precaches: /_next/static/** bundles (with revision hashes) and explicit
// static assets (/~offline, /icons/icon.svg, /manifest-tracker.json).
// Protected page HTML (/program, /pt-view, /, /rehab) is NOT precached —
// only static JS/CSS/image assets are cached. The data layer (IndexedDB) handles
// all offline data. See docs/PWA_SERWIST_MIGRATION.md for architecture rationale.

import { defaultCache } from '@serwist/turbopack/worker';
import { NetworkOnly, Serwist } from 'serwist';

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Never cache Vercel Speed Insights / Analytics beacons — let them reach the network.
      matcher: ({ url }) => url.hostname === 'va.vercel-insights.com',
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();
