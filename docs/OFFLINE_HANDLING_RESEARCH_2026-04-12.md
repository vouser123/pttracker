# Offline Handling Research (2026-04-12)

Use this note for the durable rationale behind the April 2026 offline-handling plan for protected App Router pages.

Use [`PWA_SERWIST_MIGRATION.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/PWA_SERWIST_MIGRATION.md) for the earlier Serwist migration background.
Use [`SYSTEM_ARCHITECTURE.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/SYSTEM_ARCHITECTURE.md) and [`IMPLEMENTATION_PATTERNS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/IMPLEMENTATION_PATTERNS.md) for live ownership rules.

## Why This Exists

This note captures the repo inspection, subagent findings, and official documentation review that led to the approved plan for:

- shared effective-offline detection
- shared offline-aware fetch classification
- documented tracker-triggered `/program` warmup
- service-worker behavior that avoids noisy uncaught offline request failures
- preserving IndexedDB fallback ownership inside route hooks

This is meant to survive session turnover and prevent the same research from being re-done.

## Current Repo State

As of this research pass, the live package versions are:

- `next@^16.2.3`
- `react@^19.2.4`
- `react-dom@^19.2.4`
- `@serwist/turbopack@^9.5.7`
- `serwist@^9.5.7`

Source: [`package.json`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/package.json).

The user mentioned Next.js 16.3 during discussion, then clarified it was a typo. The approved plan here is grounded in the actual installed 16.2.3 stack.

## Live Code Findings

### Service Worker Integration

The repo is already on the Turbopack-native Serwist integration:

- [`next.config.mjs`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/next.config.mjs) wraps the config with `withSerwist` from `@serwist/turbopack`.
- [`app/serwist/[path]/route.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/serwist/[path]/route.js) serves the generated worker via `createSerwistRoute`.
- [`app/sw.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/sw.js) defines the live worker with `defaultCache`, `navigationPreload`, and a `/~offline` document fallback.
- [`app/layout.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/layout.js) registers `SerwistProvider` with `cacheOnNavigation`.

This means the app should continue using `@serwist/turbopack`. No framework swap is needed.

### Current Offline Data Ownership

IndexedDB fallback ownership already sits in the correct layer:

- tracker bootstrap: [`hooks/useIndexData.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useIndexData.js)
- program bootstrap: [`hooks/useProgramPageData.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useProgramPageData.js)
- pt-view bootstrap: [`hooks/usePtViewData.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/usePtViewData.js)
- rehab bootstrap: [`hooks/useRehabCoverageData.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useRehabCoverageData.js)
- shared user context: [`hooks/useUserContext.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useUserContext.js)
- IndexedDB adapter: [`lib/offline-cache.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/offline-cache.js)

The route hooks own:

- fallback selection
- staged loading
- route-specific error and offline notice copy
- patient/user context gating

The approved plan keeps that ownership in place.

### Current Warmup Behavior

Tracker-triggered `/program` warmup currently happens in two different ways:

- safe bootstrap warming in [`hooks/useProgramBootstrapWarmup.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useProgramBootstrapWarmup.js), which fills IndexedDB caches
- additional manual protected fetches in the same hook for:
  - `/program`
  - `/program` with `RSC` + `Next-Router-Prefetch` headers
- route prefetch from [`app/(protected)/ProtectedClientWarmers.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/(protected)/ProtectedClientWarmers.js)

The manual protected fetches are the risky part. They can produce uncaught offline `no-response` failures because they are not just warming static assets; they are background-fetching protected route documents and RSC payloads through the auth-gated App Router path.

## Subagent Findings Preserved

### Shared Fetch / Hook Boundary

The best shared seam for refactoring is between raw `fetch()` and the route hooks:

- shared fetch files already exist in:
  - [`lib/index-data.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/index-data.js)
  - [`lib/pt-editor.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/pt-editor.js)
  - [`lib/pt-view.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/pt-view.js)
- rehab still performs direct fetches inside [`hooks/useRehabCoverageData.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useRehabCoverageData.js)

The approved wrapper should only normalize request behavior:

- auth and JSON headers
- offline/network classification
- HTTP error classification
- parse error classification

It should not own route fallback, copy, or cache writes.

### Raw `navigator.onLine` Risk

Multiple current paths rely directly on `navigator.onLine`, including:

- auth and session handling in [`hooks/useAuth.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useAuth.js)
- user-context refresh in [`hooks/useUserContext.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useUserContext.js)
- tracker online indicator in [`app/(protected)/TrackerPage.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/(protected)/TrackerPage.js)
- queue replay and immediate-save logic in:
  - [`hooks/useIndexOfflineQueue.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useIndexOfflineQueue.js)
  - [`hooks/useProgramOfflineQueue.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useProgramOfflineQueue.js)
  - [`hooks/useTrackerDosageEditor.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTrackerDosageEditor.js)
  - [`hooks/useSessionLogging.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useSessionLogging.js)

The highest-risk raw-online consumers are auth/session, user-context resolution, and immediate replay/mutation paths, because those can disagree with actual network usability and either clear valid cached state too aggressively or retry too aggressively.

### Service Worker / Navigation Findings

The service worker currently has a safe generic document fallback but not a safe answer for manual protected RSC warmup fetches.

The clearest noisy path is:

1. tracker open triggers warmup
2. warmup background-fetches protected `/program` document and RSC payload
3. auth-gated route resolution depends on the protected layout and server auth
4. offline/unavailable response does not always map to a normal cached navigation document
5. the worker can reject with `no-response`

This does not mean warmup should be removed. It means the manual protected fetch shape is wrong for the job.

## Official Documentation Review

### Next.js

Official docs reviewed:

- [Prefetching](https://nextjs.org/docs/app/guides/prefetching)
- [useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router)
- [PWAs](https://nextjs.org/docs/app/guides/progressive-web-apps)

What matters from those docs:

- Next.js App Router supports route prefetching through the documented `router.prefetch()` API.
- Manual prefetch is specifically intended for warming routes outside the viewport or on custom triggers.
- `<Link>` and `router.prefetch()` are the supported route-warming mechanisms for App Router client transitions.
- The Next.js PWA guide points to Serwist as an offline-support option rather than prescribing a custom handwritten worker for App Router route caching.

How that supports the plan:

- tracker-triggered `/program` warmup should remain, because warming a route outside the viewport is a documented use case
- the preferred path is `router.prefetch('/program')` plus IndexedDB warmup, not manual protected document + manual RSC fetches

### React

Official docs reviewed:

- [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)

What matters from that doc:

- React recommends `useSyncExternalStore` when subscribing to external mutable sources such as browser APIs.
- The docs use `navigator.onLine` as a direct example of browser API subscription.
- The pattern supports extracting the browser subscription into a shared custom hook.

How that supports the plan:

- a shared connectivity store or hook is the right React-level abstraction for browser online/offline state
- the app can layer “effective offline” evidence on top of that store without scattering `navigator.onLine` checks across unrelated hooks

### Serwist

Official docs reviewed:

- [@serwist/next getting started](https://serwist.pages.dev/docs/next/getting-started)
- [cacheOnNavigation](https://serwist.pages.dev/docs/next/configuring/cache-on-navigation)
- [navigation preloading](https://serwist.pages.dev/docs/serwist/guide/navigation-preloading)
- [runtime caching](https://serwist.pages.dev/docs/serwist/runtime-caching)
- [caching strategies](https://serwist.pages.dev/docs/serwist/runtime-caching/caching-strategies)

What matters from those docs:

- `cacheOnNavigation` is a documented option that hooks into client-side navigation history operations and posts the URL to the worker for caching.
- `navigationPreload` is intended for cases where HTML cannot be fully precached but navigation performance still matters.
- Serwist’s runtime-caching and strategy docs support explicit route handling instead of relying only on framework defaults when a route class needs special behavior.
- The repo is already using the documented Turbopack route-handler pattern through `createSerwistRoute`.

How that supports the plan:

- continue using `@serwist/turbopack`
- keep `cacheOnNavigation`
- use documented navigation/prefetch behavior to warm `/program`
- if route-specific worker logic is needed, add explicit worker handling rather than broadening the worker into a second application data layer

## Approved Architecture Decisions

### 1. Keep `@serwist/turbopack`

The repo already uses the correct Serwist integration for Turbopack. No switch to another service-worker package is needed.

### 2. Keep tracker-triggered `/program` warmup

The user explicitly confirmed that opening tracker must still warm `/program`.

This is preserved through:

- IndexedDB/bootstrap warming in `useProgramBootstrapWarmup`
- route prefetch via `router.prefetch('/program')`
- Serwist `cacheOnNavigation` support for navigation cache updates

### 3. Replace manual protected document/RSC warmup fetches

The background `fetch('/program')` and `fetch('/program', { headers: { RSC: '1', ... }})` warmup pattern should be removed.

Reason:

- it is not the documented route prefetch path
- it can hit the auth-gated server route in the background
- it is the most direct path to noisy uncaught offline `no-response` failures

This is a replacement, not a removal without replacement.

### 4. Add one shared effective-offline utility

Add a shared connectivity utility that centralizes:

- browser online/offline events
- recent request failure evidence
- recent successful request evidence
- one shared `isNetworkUnavailableError(error)` classifier

Primary early adopters:

- `useAuth`
- `useUserContext`
- queue replay and immediate-save hooks
- program/bootstrap warmers

### 5. Add one shared offline-aware fetch wrapper

The wrapper should classify:

- network/offline failure
- HTTP error
- parse/shape error

It should be used by shared authenticated-read loaders and rehab direct fetches.

It should not own:

- IndexedDB writes
- fallback selection
- user-facing copy
- access control

### 6. Keep route-owned IndexedDB fallback

The route hooks remain the owners of:

- cache restore
- staged loading
- route-specific offline notices
- patient/user context rules

This is explicitly not a “move offline logic into the service worker” design.

### 7. Keep the service worker focused

The worker remains responsible for:

- static asset precaching
- navigation/request interception
- offline fallback responses
- route-specific request strategies when needed

The worker does not become the owner of bootstrap data, app queues, or route-specific cache-restore decisions.

## Rejected Alternatives

### Reject: service-worker-only fix

Reason:

- the current route hooks already own IndexedDB fallback correctly
- moving data ownership into the worker would duplicate storage and increase risk

### Reject: remove `/program` warmup entirely

Reason:

- the user requires `/program` to warm from tracker open
- Next.js prefetch and current bootstrap warming already provide the right primitives

### Reject: keep manual protected `/program` and RSC warm fetches

Reason:

- they are the least supported and noisiest warmup path in the current design
- they bypass the cleaner documented route prefetch pattern

## Implementation Order

Approved implementation order:

1. `pt-brx3.3` — build shared effective-offline detector
2. `pt-brx3.4` — add shared fetch wrapper for offline-aware reads
3. `pt-brx3.5` — harden service worker handling for protected offline requests while preserving tracker-triggered `/program` warmup
4. `pt-brx3.6` — adopt shared offline handling across protected page hooks

Supporting beads:

- `pt-nrmk` — design umbrella and durable rationale
- `pt-brx3` — implementation umbrella
- `pt-brx3.1` — runtime evidence for current `/program` failures
- `pt-brx3.2` — separate CSS preload warning lane

## Validation Targets

These checks were approved as the success criteria for the implementation lane:

- tracker open while online warms `/program` bootstrap and route prefetch
- offline `/program` open after tracker warm uses cached bootstrap without uncaught request-failure noise
- auth/session remains stable during offline use
- queue replay resumes on effective connectivity recovery
- tracker, pt-view, and rehab keep route-specific cached-data behavior
- normal online navigation and protected-route access control do not regress

## Related Official Sources

- Next.js Prefetching: [https://nextjs.org/docs/app/guides/prefetching](https://nextjs.org/docs/app/guides/prefetching)
- Next.js `useRouter`: [https://nextjs.org/docs/app/api-reference/functions/use-router](https://nextjs.org/docs/app/api-reference/functions/use-router)
- Next.js PWAs: [https://nextjs.org/docs/app/guides/progressive-web-apps](https://nextjs.org/docs/app/guides/progressive-web-apps)
- React `useSyncExternalStore`: [https://react.dev/reference/react/useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- Serwist `@serwist/next` getting started: [https://serwist.pages.dev/docs/next/getting-started](https://serwist.pages.dev/docs/next/getting-started)
- Serwist `cacheOnNavigation`: [https://serwist.pages.dev/docs/next/configuring/cache-on-navigation](https://serwist.pages.dev/docs/next/configuring/cache-on-navigation)
- Serwist navigation preloading: [https://serwist.pages.dev/docs/serwist/guide/navigation-preloading](https://serwist.pages.dev/docs/serwist/guide/navigation-preloading)
- Serwist runtime caching: [https://serwist.pages.dev/docs/serwist/runtime-caching](https://serwist.pages.dev/docs/serwist/runtime-caching)
- Serwist caching strategies: [https://serwist.pages.dev/docs/serwist/runtime-caching/caching-strategies](https://serwist.pages.dev/docs/serwist/runtime-caching/caching-strategies)

## Maintenance Notes

- If the service worker registration path or package changes, update this note and [`PWA_SERWIST_MIGRATION.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/PWA_SERWIST_MIGRATION.md).
- If the shared connectivity or fetch abstractions land under different filenames than the placeholders used here, update this note and [`docs/README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/README.md).
- If the repo upgrades from Next.js 16.2.3, note the exact version and whether the route prefetch and Serwist assumptions still hold.
