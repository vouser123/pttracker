# PT Tracker System Architecture

Use this file for the live system shape of PT Tracker.

Use [`../README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/README.md) for the current file-ownership map.
Use [`NEXTJS_CODE_STRUCTURE.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/NEXTJS_CODE_STRUCTURE.md) for Next.js organization rules.

## System Overview

PT Tracker is currently a hybrid application:

- A legacy static/parity surface still lives in `public/` and remains relevant for unmigrated or recently migrated behavior checks.
- An App Router surface now lives in `app/` and currently owns the root shell plus the migrated `/rehab` and `/pt-view` routes.
- A shrinking Pages Router surface still lives in `pages/` and currently owns `/`, `/program`, and `/reset-password`.
- Shared React UI/state/helper layers live in `components/`, `hooks/`, and the Next.js-layer files in `lib/`.
- Vercel serverless routes in `api/` continue to serve both the legacy and Next.js surfaces.
- Supabase remains the system of record for auth and application data.
- IndexedDB-backed offline storage remains part of the live architecture for cached bootstrap data, queue state, and auth persistence.

This architecture is intentional during the migration. Do not assume the repo is either "all static" or "all Next.js."

## Framework Baseline

- Next.js `16.2.1`
- React `19.2.4`
- React DOM `19.2.4`

Route bundle analysis now uses Next's native analyzer path:

- `npm run analyze:bundle`
- output written to `.next/diagnostics/route-bundle-stats.json` and related diagnostics files

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
- `app/rehab/page.js` + `app/rehab/RehabPage.js` own `/rehab`
- `app/pt-view/page.js` + `app/pt-view/PtViewPage.js` own `/pt-view`

Use the App Router surface when:

- adding or refining shell-level metadata/layout behavior
- migrating a route out of `pages/`
- deciding server/client boundaries for migrated routes

### Remaining Pages Router Surface

`pages/` remains active for the routes that have not yet migrated into `app/`.

Current route owners:

- `pages/index.js` for `/`
- `pages/program.js` for `/program`
- `pages/reset-password.js` for `/reset-password`

Use the remaining Pages Router surface when:

- working on a route that still resolves through `pages/`
- doing migration follow-through that must preserve current Pages Router behavior until cut-over
- wiring shared hooks/components into the remaining route hosts

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

## Documentation Maintenance

- Update docs when architecture, route ownership, data contracts, or operational workflows materially change.
- Keep active workflow docs small in number and clear in purpose.
- Use [`README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/README.md) as the live file map, not as a catch-all architecture narrative.
- The retired dev-notes system now lives under [`archive/dev-notes/`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/archive/dev-notes); do not treat it as the active tracker.
