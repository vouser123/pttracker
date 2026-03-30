# PWA Offline Architecture: Serwist Migration + Regression Fixes

## Context

**All four protected pages (tracker `/`, `/program`, `/pt-view`, `/rehab`) are broken offline.** The root cause is the same for all of them.

The handwritten `public/sw.js` uses a network-first, cache-everything-on-GET strategy for all non-API routes. This means it caches the SSR'd HTML for authenticated pages. After any deploy, the chunk hashes in `/_next/static/` rotate. The SW serves the old cached HTML, which references the old chunk URLs. Those chunks are gone. The JS bundles 404. The app fails to load entirely — no data layer, no IndexedDB, nothing.

The individual data hooks are all fine:
- **useIndexData** (tracker `/`): cache-first from IndexedDB, no `enabled` gate
- **usePtViewData** (pt-view `/pt-view`): cache-first already implemented (pt-idk6)
- **useRehabCoverageData** (rehab `/rehab`): cache-first -- loads from IndexedDB first, then refreshes from network; gates on `accessToken` being non-null (not a blocking `enabled` gate)
- **useProgramPageData** (program `/program`): cache-first + `restoreCachedProgramBootstrap`; has a blocking `enabled` gate in the workspace state (fixed in Phase 1d)

The data layer works. The SW is breaking it by serving stale HTML.

Additional active bugs caused by the wrong SW strategy:

1. **pt-zttk**: `ProtectedClientWarmers` fires background `fetch()` calls to `/program`, `/pt-view`, `/rehab` with full SSR. The server's protected layout calls `getUser()` (network-dependent). Offline, `getUser()` returns null -> layout redirects to `/sign-in` -> 307 response gets cached by SW. Result: offline redirect loop.

2. **pt-1own (program-specific)**: `ProgramPage.js` never had `enabled: Boolean(session) || Boolean(initialAuthUserId)` applied -- so even when `restoreCachedProgramBootstrap` loads exercises into state, the workspace selectors return `[]` because the `enabled` gate blocks them when `session=null`.

4 Codex commits (098e008, c921786, 7c3c477, cee771c) addressed symptoms at the hook level but missed the root cause and introduced new risk. Some changes are correct and should be kept. Others must be reverted.

**Root fix**: Replace `public/sw.js` with Serwist (`@serwist/turbopack`, Turbopack-native since Serwist 10+). SW scope = `/_next/static/**` + explicit static assets only. No authenticated page HTML in SW cache. Serwist generates a build-time precache manifest with revision hashes -- correct chunk URLs are always cached, stale entries are evicted automatically on deploy. The data layer (IndexedDB + offline queue) is already correct and requires no changes for tracker, pt-view, or rehab.

### Reference Docs
- https://serwist.pages.dev/docs/next/turbo (Turbopack guide)
- https://serwist.pages.dev/docs/next/getting-started (webpack guide for context)
- https://nextjs.org/docs/app/guides/progressive-web-apps (Next.js official PWA guide -- recommends Serwist for offline)
- https://blog.logrocket.com/nextjs-16-pwa-offline-support/ (App Shell + IndexedDB pattern)

---

## Epics & Beads

- Epic: **pt-tzgb** -- PWA offline architecture: Serwist migration and regression fixes
  - **pt-reat** -- Revert harmful pt-1own Codex commits
  - **pt-av5i** -- Fix ProgramPage enabled gate for offline bootstrap
  - **pt-wm69** -- Install and configure Serwist (@serwist/turbopack)
  - **pt-gx8o** -- Verify offline behavior post-Serwist
  - **pt-6b5t** -- Combined Codex implementation bead (Phase 1 + 2 + 2b)

---

## Phase 1: Reverts + Targeted Fixes (pt-reat + pt-av5i)

### 1a. Remove ProtectedClientWarmers SSR route warmup

**File:** `app/(protected)/ProtectedClientWarmers.js`

Remove the second `useEffect` entirely (the one that fetches `/program`, `/pt-view`, `/rehab` with `credentials: 'include'`). Keep:
- `useProgramBootstrapWarmup({ session })` -- this pre-warms IndexedDB, not the SW. Correct.
- `router.prefetch('/program')` useEffect -- client-side JS prefetch, not SSR. Safe.

### 1b. Revert useIndexData !token guard

**File:** `hooks/useIndexData.js` (lines ~291-317)

Restore original behavior: state resets when `!token` OR `!patientId`. Current Codex change only resets on `!token`, causing stale state when patientId goes null during context resolution.

Remove the `!token &&` prefix from the `hadAuthRef.current` check, and remove the `if (!token)` wrapper around the state reset block.

### 1c. Create shared server-user utility

**New file:** `lib/server-user.js`

```js
import { cache } from 'react';
import { getServerSupabaseClient } from './supabase-server';

export const getServerUser = cache(async () => {
    const supabase = await getServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
});
```

**File:** `app/(protected)/layout.js` -- import and use `getServerUser` from `lib/server-user.js` instead of the inline `cache(async () => {...})` definition.

**File:** `app/(protected)/program/page.js` -- import and use `getServerUser` from `lib/server-user.js` instead of creating a new Supabase client independently. One Supabase round-trip per request, deduplicated.

### 1d. Fix ProgramPage enabled gate (pt-av5i)

**File:** `app/(protected)/program/ProgramPage.js`

```js
// CHANGE:
enabled: Boolean(session),
// TO:
enabled: Boolean(session) || Boolean(initialAuthUserId),
```

### 1e. Keep from Codex commits (do NOT revert)

- `hooks/useAuth.js` -- `getSession`-first pattern + `persistAuthUserId` to IndexedDB. Correct.
- `hooks/useProgramPageData.js` -- `restoreCachedProgramBootstrap` refactor + `initialAuthUserId` effect. Correct.
- `hooks/useProgramBootstrapWarmup.js` -- IndexedDB pre-warm. Correct.
- `hooks/useUserContext.js` -- cache-first + `isOfflineError`. Matches pattern in usePtViewData/useProgramPageData. Keep.

### Phase 1 Verification
- `git diff hooks/useIndexData.js` -- confirm resets fire on `!token || !patientId`
- `git diff app/(protected)/ProtectedClientWarmers.js` -- confirm 3-route fetch useEffect removed
- `git diff app/(protected)/program/ProgramPage.js` -- confirm `enabled: Boolean(session) || Boolean(initialAuthUserId)`
- `git diff app/(protected)/program/page.js` -- confirm uses `getServerUser()` from lib/server-user.js
- `npm run build` -- must succeed with no errors

---

## Phase 2: Serwist Migration (pt-wm69)

### 2a. Install packages

```bash
npm i -D @serwist/turbopack esbuild serwist
```

### 2b. Update next.config.mjs

Import `withSerwist` from `@serwist/turbopack`, wrap export.

### 2c. Create app/sw.ts

Serwist worker with `precacheEntries: self.__SW_MANIFEST`, `skipWaiting: true`, `clientsClaim: true`, `navigationPreload: true`, `runtimeCaching: defaultCache`, fallbacks to `/~offline` for document requests.

### 2d. Create app/serwist/[path]/route.ts

Serwist route handler using `createSerwistRoute` from `@serwist/turbopack/server`.

### 2e. Create offline fallback page

`app/~offline/page.js` -- minimal static page, no auth, no data fetching.

### 2f. Update app/layout.js

Replace `ServiceWorkerRegistrar` with `SerwistProvider` from `@serwist/turbopack/client`.

### 2g. Cleanup

- Delete `public/sw.js` (Serwist generates it at build time)
- Delete `app/components/ServiceWorkerRegistrar.js`
- `.gitignore` -- add: `public/sw.js`, `public/sw.js.map`, `public/swe-worker*`

### Phase 2 Verification
- `npm ls serwist` -- packages present
- `npm run build` -- succeeds, Serwist generates `public/sw.js`
- Generated `public/sw.js` contains Serwist precache manifest (not old handwritten code)
- `/_next/static/**` entries in precache with revision hashes
- `/`, `/program`, `/pt-view`, `/rehab` HTML NOT in precache

---

## Phase 2b: Fix Random Logout from Invalid Refresh Token

**File:** `hooks/useAuth.js`

After `getUser()` fails, the existing `isOfflineSignInError` check catches network failures but not `400 Invalid Refresh Token`. Offline, a stale refresh token triggers `signOut()` incorrectly.

Fix: after the existing `isOfflineSignInError` check, add:
```js
const isTokenError = userError.message?.includes('refresh_token') || userError.message?.includes('Refresh Token');
if (isTokenError && typeof navigator !== 'undefined' && navigator.onLine === false) return;
```

### Phase 2b Verification
- Offline with expired token: user is NOT logged out
- Online with genuinely invalid token: signOut fires correctly

---

## Phase 3: Full Offline Verification (pt-gx8o)

Using browser MCP (Playwright or Chrome DevTools):

1. Build and deploy (or `next build && next start`)
2. Visit all four routes online while authenticated: `/`, `/program`, `/pt-view`, `/rehab`
3. Confirm SW registers, precache manifest includes `/_next/static/**` with revision hashes
4. Confirm protected page HTML NOT in precache
5. Go offline via devtools
6. Hard refresh `/` -- tracker loads exercises and logs from IndexedDB
7. Hard refresh `/program` -- editor loads with exercise list, role picker, dosage picker
8. Hard refresh `/pt-view` -- history and programs load from cache
9. Hard refresh `/rehab` -- rehab coverage data loads from cache
10. No `GET / -> 307 -> /sign-in` in network log
11. No chunk 404s in console
12. No random logout while offline
13. Close pt-zttk, pt-1own, pt-oire, pt-1xwp

---

## Assignment

| Phase | Owner | Bead |
|-------|-------|------|
| Phase 1 + 2 + 2b | Codex | pt-6b5t |
| Phase 3: Verification | Claude | pt-gx8o |

---

## Critical Files

| File | Action |
|------|--------|
| `app/(protected)/ProtectedClientWarmers.js` | Remove SSR warmup useEffect |
| `hooks/useIndexData.js` | Revert !token guard on state resets |
| `app/(protected)/program/ProgramPage.js` | Add `|| Boolean(initialAuthUserId)` to enabled |
| `lib/server-user.js` | CREATE -- shared React.cache getUser |
| `app/(protected)/layout.js` | Use shared getServerUser |
| `app/(protected)/program/page.js` | Use shared getServerUser |
| `next.config.mjs` | Wrap withSerwist |
| `app/sw.ts` | CREATE -- Serwist worker |
| `app/serwist/[path]/route.ts` | CREATE -- Serwist route handler |
| `app/~offline/page.js` | CREATE -- offline fallback |
| `app/layout.js` | Replace ServiceWorkerRegistrar with SerwistProvider |
| `app/components/ServiceWorkerRegistrar.js` | DELETE |
| `public/sw.js` | DELETE (Serwist generates it) |
| `hooks/useAuth.js` | Add refresh token offline guard |
| `.gitignore` | Add public/sw.js, public/swe-worker* |
