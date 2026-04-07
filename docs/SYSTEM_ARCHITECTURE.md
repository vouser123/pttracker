# PT Tracker System Architecture

Use this file for the live system shape of PT Tracker.

Use [`../README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/README.md) for the current file-ownership map.
Use [`NEXTJS_CODE_STRUCTURE.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/NEXTJS_CODE_STRUCTURE.md) for Next.js organization rules.

## System Overview

PT Tracker is currently a hybrid application:

- A legacy static/parity surface still lives in `public/` and remains relevant for unmigrated or recently migrated behavior checks.
- An App Router surface now lives in `app/` and owns all four active routes: `/` (tracker), `/program`, `/rehab`, and `/pt-view`.
- A minimal Pages Router surface still lives in `pages/` and owns only `/reset-password` plus the shared `_app.js` and `_document.js` wrappers. Migration to App Router is tracked in pt-5t9g.
- Shared React UI/state/helper layers live in `components/`, `hooks/`, and the Next.js-layer files in `lib/`.
- Vercel serverless routes in `api/` continue to serve both the legacy and Next.js surfaces.
- Supabase remains the system of record for auth and application data.
- IndexedDB-backed offline storage remains part of the live architecture for cached bootstrap data, queue state, and offline queue persistence.

This architecture is intentional during the migration. Do not assume the repo is either "all static" or "all Next.js."

## Framework Baseline

- Next.js `16.2.1`
- React `19.2.4`
- React DOM `19.2.4`

Route bundle analysis now uses Next's native web analyzer path:

- `npm run analyze:bundle`
- opens the analyzer UI locally and writes `.next/diagnostics/route-bundle-stats.json` plus related diagnostics files

Treat those diagnostics as profiling inputs, not as replacements for the repo's ownership and layer rules.

## Runtime Surfaces

### Legacy Static Surface

`public/` still matters because legacy HTML pages remain the behavioral baseline for parity work.

Use the legacy surface when:

- checking parity against a static page such as `public/index.html`
- verifying behavior that has not been fully retired
- tracing older PWA or static asset behavior

### App Router Surface

`app/` is now the active shell for migrated routes.

Current responsibilities:

- `app/layout.js` owns the App Router root shell, metadata frame, analytics, Speed Insights, and the client-side service-worker registration bridge through `app/components/ServiceWorkerRegistrar.js`
- `app/sign-in/page.js` + `app/sign-in/SignInPage.js` own the public `/sign-in` route
- `app/(protected)/layout.js` is the server-side auth gate for all four authenticated routes; redirects to `/sign-in` if no session cookie is found
- `app/(protected)/page.js` + `app/(protected)/TrackerPage.js` own `/` (tracker)
- `app/(protected)/program/page.js` + `app/(protected)/program/ProgramPage.js` own `/program`
- `app/(protected)/rehab/page.js` + `app/(protected)/rehab/RehabPage.js` own `/rehab`
- `app/(protected)/pt-view/page.js` + `app/(protected)/pt-view/PtViewPage.js` own `/pt-view`
- `proxy.js` (Next.js 16 convention, previously `middleware.js`) refreshes the Supabase session cookie on every request via `@supabase/ssr`; uses `getClaims()` (local JWT check, no network) **not** `getUser()` — see Auth Call Hierarchy below

Use the App Router surface when:

- adding or refining shell-level metadata/layout behavior
- migrating a route out of `pages/`
- deciding server/client boundaries for migrated routes

### Remaining Pages Router Surface

`pages/` is nearly retired. Only one route and the shared wrapper files remain:

- `pages/reset-password.js` for `/reset-password`
- `pages/_app.js` and `pages/_document.js` (required while reset-password remains in Pages Router)
- CSS modules for all four routes (pending relocation to `app/` — tracked in pt-5t9g)

Migration of reset-password to App Router and full Pages Router removal is tracked in **pt-5t9g**. Do not add new routes or code to `pages/`.

### Shared Next.js Layers

`components/`, `hooks/`, and the Next.js-layer files in `lib/` are shared across both router surfaces during migration.

Use the shared Next.js layers when:

- extracting route behavior out of a page or route-local client host
- keeping route files thin and orchestrator-focused
- implementing shared offline, auth, messaging, tracker, or editor behavior

### API Surface

`api/` remains the shared backend layer for both app surfaces.

Keep API route count lean. Prefer shared handlers and existing endpoints over entry-point sprawl.

## Data And Auth Model

- Supabase is the source of truth for user, exercise, program, activity-log, and messaging data.
- API routes enforce auth and role checks through the shared auth helpers in `lib/auth.js`.
- Frontend surfaces should use shared client/auth utilities rather than creating ad hoc Supabase clients.
- Avoid direct frontend-to-database patterns unless an existing shared architecture doc explicitly says otherwise.
- The app has two user identifiers that must not be mixed:
  - `auth.users.id` / `session.user.id`: the auth-session identifier used for sign-in and message sender/recipient auth references
  - `users.id`: the application profile identifier used for patient-scoped data such as programs and logs
- Patient-scoped routes must resolve an effective patient context from the `users` table before reading or writing patient data. For current Next.js pages, the shared frontend helper is `resolvePatientScopedUserContext(...)` in `lib/users.js`.

### Auth Architecture: Hybrid Foundation (decided 2026-03-29)

The auth architecture target before cut-over is a **hybrid SSR-capable foundation**:

- **Session storage**: migrate from IndexedDB-only to cookie-readable session via `@supabase/ssr` (`createServerClient` + `createBrowserClient`). This makes the session server-readable without removing client-side access.
- **Server participation**: server components, middleware, and App Router layouts can read auth state. Full SSR is available where it helps.
- **Selective usage**: not everything moves server-side. Use server-side rendering and gating where it reduces client bootstrap cost or improves route protection. Keep offline-heavy, interaction-heavy, and queue-backed surfaces client-side.
- **IndexedDB stays**: offline queue, reconnect recovery, and cached bootstrap data remain IndexedDB-backed. Cookie session and IndexedDB offline storage are complementary, not competing.

**What this is not:**
- Not fully client-only auth (which blocks server participation — an explicit architectural limitation, not a best practice)
- Not fully server-first (wrong fit for a PWA with offline requirements)

Implementation complete in **pt-8whf** (closed 2026-03-29).

### Auth Call Hierarchy (do not change without reading this)

Every agent must understand why three different auth calls exist and why they cannot be collapsed:

| Location | Method | Network? | Purpose |
|---|---|---|---|
| `proxy.js` | `supabase.auth.getClaims()` | **No** — local JWT | Refresh expired tokens; propagate fresh cookie to request + response. Must run on every request or users get randomly logged out. |
| `app/(protected)/layout.js` | `supabase.auth.getUser()` | **Yes** — Supabase auth server | Verify user identity for the auth gate. Only `getUser()` detects server-side revocation (banned user, password reset, manual session deletion). |
| `lib/auth.js` — `authenticateRequest()` | `supabase.auth.getUser(token)` | **Yes** — Supabase auth server | Verify the Bearer token on every API request. Same reason as layout: must detect revocation. Cannot be replaced with local JWT verification. |
| `hooks/useAuth.js` — mount | `getSession()` then `getUser()` | getSession=no, getUser=yes | Client-side session hydration. `getSession()` reads local cookie synchronously; `getUser()` validates against server to catch stale/revoked sessions. |

**Rules derived from Supabase SSR docs (verified 2026-03-29):**
- `getClaims()` = local JWT validation only. Fast, no network. Cannot detect revocation. Use in proxy only.
- `getUser()` = network call to Supabase auth server. Use wherever user identity matters for security decisions.
- Do NOT replace `getUser()` with `getClaims()` or local JWT libraries in `layout.js` or `lib/auth.js` — you would lose revocation detection.
- Do NOT replace `getClaims()` with `getUser()` in `proxy.js` — you add a network round-trip on every request for no security benefit (the proxy is not an auth gate).
- The proxy and layout calls are intentionally separate: proxy = cookie refresh, layout = security gate.

Core domains still in active use:

- users and therapist/patient context
- exercise library and related metadata
- patient programs and dosage
- activity logs, sets, and per-set form data
- clinical messages

## Offline And Storage Model

- Preserve offline behavior and PWA-safe interaction patterns.
- For current Next.js work, IndexedDB-backed storage is the preferred offline persistence layer.
- Do not introduce new `localStorage`-backed persistence for app data or queue state.
- Treat offline route bootstrap, queued writes, and auth persistence as architecture-level concerns, not one-off page hacks.
- Current active routes already use cache-first bootstrap in the live Next.js surface where that behavior has landed, with network refresh happening in the background and cached fallback preserved for offline/network-failure cases.
- Shared offline ownership currently includes:
  - cached route bootstrap data in `lib/offline-cache.js`
  - tracker queue persistence in `hooks/useIndexOfflineQueue.js` and `lib/index-offline.js`
  - editor queue persistence in `hooks/useProgramOfflineQueue.js` and `lib/program-offline.js`
  - Supabase auth persistence through the shared IndexedDB-backed storage adapter

## Implementation Guardrails

### Frontend Work

- Legacy UI changes belong in `public/*.html`, `public/js`, and `public/css` when the legacy surface still owns that behavior.
- App Router route-entry and shell work belongs in `app/`.
- Remaining route-host work belongs in `pages/` until that route migrates.
- Shared Next.js UI/state/helper work belongs in `components/`, `hooks/`, and Next.js-layer `lib/` files.
- Keep file ownership boundaries aligned with [`../README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/README.md).
- Keep `app/**/page.js` and `app/layout.js` server-first unless a concrete client-side need forces a lower client boundary; see [`NEXTJS_CODE_STRUCTURE.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/NEXTJS_CODE_STRUCTURE.md).

### API Work

- Route entry points live in `api/`.
- Shared handlers should be reused whenever possible to keep the function count under control.
- Keep API behavior consistent across legacy and Next.js callers.

### Supabase Access

- Use the shared backend auth/database helpers on the API side.
- Avoid bypassing the existing auth and role-check flow.

## Deployment Guardrails

- Vercel is the deployment target.
- Keep the serverless function footprint lean enough for the current plan constraints.
- Confirm required environment values remain available:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- Prefer preview-based validation for routine doc or migration follow-up work unless a riskier change needs extra local checks.
- App Router validation should include service-worker behavior because App Router routes now register the service worker through the root layout bridge instead of the old Pages Router-only shell.

## Pre-Cutover Architectural Decisions (2026-03-29)

These decisions were made jointly by Claude, Codex, and the user before production cut-over. Do not relitigate them without explicit user sign-off. See **pt-679e** for the full decision log.

### Approved for current pass

- **React.memo**: approved for ExercisePicker and any other heavy rerender surfaces backed by evidence. Implementation bead: pt-injf.
- **useTransition / useDeferredValue**: apply `startTransition` to `setActiveTab` in TrackerPage and `useDeferredValue` on `allLogs` in `pickerPrograms`. Both are surgical one-line changes. Implementation bead: pt-injf.
- **reset-password App Router migration**: migrate `pages/reset-password.js` to App Router, remove all Pages Router files, relocate CSS modules. Implementation bead: pt-5t9g.
- **Hybrid auth foundation**: migrate to `@supabase/ssr` cookie-readable session. See Auth Architecture section above. Implementation epic: pt-8whf.
- **Protected route group**: create App Router route group for authenticated routes with shared AuthGate at layout level. Implement after pt-8whf lands, not before.

### Explicitly deferred (not now)

- **Server/client boundary tightening beyond thin-shell pattern**: blocked on pt-8whf landing. Calmer surfaces (rehab, pt-view) become server-side candidates after cookie session is server-readable.
- **Server-only data assembly for auth-gated routes**: No now. Reactivation trigger: pt-8whf complete, or a public-data surface identified.
- **Preview/runtime validation gate definition**: deferred to a future session.

### Explicitly declined (do not reopen without new evidence)

| Item | Decision | Reason |
|------|----------|--------|
| Middleware / edge routing | No | No current product need for request interception, rewrites, or edge personalization |
| Server Actions / mutation shift | No | Would introduce a second mutation architecture during cut-over |
| Parallel routes / intercepted routes | No | No route-addressable modal/navigation requirement exists |
| Image / font optimization as primary lane | No as primary lane | Evidence points to client bundle and data bootstrap cost, not assets. Opportunistic hygiene when touched is fine. |
| Additional list virtualization beyond HistoryList | No | HistoryList is already virtualized. No other current list has the same evidence. |
| ExercisePicker virtualization | No | ~40 items does not justify it |
| Full SSR auth migration (all routes server-first) | No | Wrong fit for a PWA with offline requirements |
| Middleware-based auth | No | No current need; auth boundary handled at layout level after pt-8whf |
| Edge rewrites | No | No current need |

## Documentation Maintenance

- Update docs when architecture, route ownership, data contracts, or operational workflows materially change.
- Keep active workflow docs small in number and clear in purpose.
- Use [`README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/README.md) as the live file map, not as a catch-all architecture narrative.
- The retired dev-notes system now lives under [`archive/dev-notes/`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/archive/dev-notes); do not treat it as the active tracker.
