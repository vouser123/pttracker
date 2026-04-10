# PT Rebuild

## Repo Shape

pttracker is the physical therapy session logging app for `pttracker.app`. It is deployed on Vercel and uses Supabase for auth and data.


Default routing rule:

- Treat the legacy static surface as frozen for routine work (found in repo `rukuba` in branch `static`

Use [`docs/NEXTJS_MIGRATION_STATUS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/NEXTJS_MIGRATION_STATUS.md) only for migration-status context. Use this README for the current file-ownership map.

## Current Route And Legacy Surface Map

Current visible page mapping:

- [`app/(protected)/page.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/(protected)/page.js) + [`app/(protected)/TrackerPage.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/(protected)/TrackerPage.js) — tracker (session logging, history, messages). `page.js` is the protected App Router server entry and metadata owner; `TrackerPage.js` is the current client route host. Legacy parity baseline: `public/index.html` (on `static` branch / `legacy.pttracker.app`).
  - Owns the tracker header shell, including the legacy-style online/offline connectivity glyph (`🛜` when online, `🚫` when offline). Keep that tiny parity indicator at the route level instead of burying it in queue hooks or banners.
- [`app/(protected)/pt-view/page.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/(protected)/pt-view/page.js) + [`app/(protected)/pt-view/PtViewPage.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/(protected)/pt-view/PtViewPage.js) — PT view (therapist-facing patient view). `page.js` is the protected App Router server entry and metadata owner; `PtViewPage.js` is the current client route host. Replaced `public/pt_view.html`.
- [`app/(protected)/rehab/page.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/(protected)/rehab/page.js) + [`app/(protected)/rehab/RehabPage.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/(protected)/rehab/RehabPage.js) — rehab coverage report. `page.js` is the protected App Router server entry and metadata owner; `RehabPage.js` is the current client route host. Replaced `public/rehab_coverage.html`.
- [`app/(protected)/program/page.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/(protected)/program/page.js) + [`app/(protected)/program/ProgramPage.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/(protected)/program/ProgramPage.js) — exercise editor (therapist/admin only). `page.js` is the protected App Router server entry and metadata owner; it also seeds the client host with the server-known auth user ID so `/program` can restore cached editor bootstrap before browser session hydration completes. `ProgramPage.js` is the current client route host. Replaced `public/pt_editor.html`.
- [`app/reset-password/page.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/reset-password/page.js) + [`app/reset-password/ResetPasswordPage.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/reset-password/ResetPasswordPage.js) — public password recovery route. `page.js` is the App Router server entry and metadata owner; `ResetPasswordPage.js` handles the Supabase `PASSWORD_RECOVERY` flow from the email link. Replaced `public/reset-password.html`.

## Folder Structure

This is the current top-level structure that matters for app work:

```text
pttracker/
|- app/          App Router shell and migrated route entries
|- pages/        Empty compatibility directory kept only because Next 16 dev still probes `pages/` even after route migration
|- components/   Reusable React UI pieces and modal/panel building blocks
|- hooks/        Shared React hooks for auth, data, logging, timers, and messaging
|- lib/          Pure helpers and page-domain adapters used by Next.js code
|- api/          Legacy API implementations being retired as active endpoints move to `app/api/*`
|- public/       Shared browser-served assets: sw.js, manifest-tracker.json, icons/. Legacy HTML/CSS/JS pruned.
|- styles/       Global Next.js styles
|- supabase/     Local Supabase config, snippets, and migrations
|- docs/         Migration docs, workflow docs, testing notes, and tracker references
|- openspec/     Spec and parity documents used during the migration
|- tests/        Automated test assets
|- test/         Additional test helpers/assets
|- scripts/      Local project scripts
```

- [`app/layout.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/layout.js): App Router root shell. Owns shared metadata, manifest/icon links, analytics, Speed Insights, and the client-side service-worker registrar for routes that already live under `app/`.
- [`pages/.gitkeep`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/pages/.gitkeep): Sentinel file that keeps an otherwise-empty `pages/` directory in the repo. Do not add route code here. It exists only because Next 16 dev currently calls `readdir(pagesDir)` during setup and crashes with `ENOENT` if the directory is removed entirely.
- [`app/(protected)/layout.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/(protected)/layout.js): Server-side auth gate for authenticated routes plus the protected-route client warmer bridge used to prefill shared offline caches needed by `/program`. It now uses the shared server helper in [`lib/server-user.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/server-user.js) so protected route entries reuse one deduplicated server auth lookup per request.
- [`app/(protected)/ProtectedClientWarmers.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/(protected)/ProtectedClientWarmers.js): No-UI protected-route client bridge. Use it for shared authenticated warm tasks that should happen once per protected-route session instead of being reimplemented in individual pages. It reads the resolved browser session from `useAuth()` before kicking off shared warm hooks and prefetches `/program` while online. Do not add credentialed background fetches for protected route documents here; those SSR fetches can trigger protected-layout redirects while offline.
- [`app/components/ServiceWorkerRegistrar.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/components/ServiceWorkerRegistrar.js): Client-only service-worker registration bridge used by the App Router shell. Use it instead of duplicating registration logic in route files.
- [`public/sw.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/public/sw.js): Service worker for offline document/asset caching. It intentionally precaches only public routes and browser-served assets, and it refuses to cache redirected responses. Protected routes such as `/program`, `/pt-view`, and `/rehab` must be warmed after real authenticated navigation so the cache stores signed-in route documents instead of redirect-shaped auth responses.
- [`scripts/dump-analyzer-paths.mjs`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/scripts/dump-analyzer-paths.mjs): Local analyzer helper for walking Next 16 route-source chains without manual UI paging. Use `npm run analyze:paths -- --root --surface client --term supabase` (or another explicit route/surface/term) after starting the full web analyzer with `npm run analyze:bundle` when bundle investigations need route-specific source-chain and output-file evidence.
- [`scripts/dump-analyzer-module-graph.mjs`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/scripts/dump-analyzer-module-graph.mjs): Local analyzer helper for dumping the packed module dependency graph behind the treemap right-side panel. Use `npm run analyze:modules -- --surface client --term GoTrueClient` (or another explicit surface/module term) after starting the full web analyzer with `npm run analyze:bundle` when bundle investigations need the direct module-level dependents and dependencies without clicking through each branch manually.
- `npm run analyze:bundle:out`: Output-only analyzer mode for cases where you only need the generated diagnostics files and not the live analyzer UI.
- [`biome.json`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/biome.json): Lightweight repo formatter/linter config. Use `npm run biome:check`, `npm run biome:lint`, or `npm run biome:format` manually when you want repo-wide tooling help.
- [`scripts/run-biome-staged.mjs`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/scripts/run-biome-staged.mjs): Pre-commit Biome helper that runs on tracked files headed for commit, applies safe fixes and formatting, then re-stages those changes so commits get automatic cleanup without reformatting the whole repo. It stops on partially staged files so hidden hunks do not get pulled into the commit, and it writes Biome logs to `C:\Users\cindi\OneDrive\Documents\PT_Backup\biome\logs`.
- [`scripts/run-gitleaks-staged.ps1`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/scripts/run-gitleaks-staged.ps1): Pre-commit secret scan helper. It exports the current Git index snapshot to a temp folder and runs Gitleaks against that snapshot using the repo's strict config. On first use it bootstraps a pinned Gitleaks binary into `C:\Users\cindi\OneDrive\Documents\PT_Backup\tools\gitleaks`.
- [`scripts/check-structure.mjs`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/scripts/check-structure.mjs): Staged-file structure guardrail for the machine-checkable parts of the repo architecture rules. It enforces required file headers, file caps, thin `app/**/page.js` constraints, and the most reliable forbidden import-layer checks before commit.
- [`.beads/hooks/pre-commit`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/.beads/hooks/pre-commit): Repo pre-commit hook. It still runs the Beads checks first, then runs the staged-file Biome helper automatically when Node is available.
- Biome pre-commit behavior: the hook auto-formats tracked commit files, re-stages them, prints which files it rewrote, then runs lint without auto-writing. One-commit override: set `PT_BIOME_SKIP_AUTOWRITE=1` before `git commit` to skip automatic formatting and run lint only.
- Structure pre-commit behavior: the hook runs `node scripts/check-structure.mjs --staged` after Biome. It blocks commits when staged files violate machine-checkable structure rules from `docs/NEXTJS_CODE_STRUCTURE.md` and `docs/SYSTEM_ARCHITECTURE.md`.
- Secret scanning: the repo now has a fast secret-scan workflow for PR/push and a deep weekly/manual GitHub Actions workflow, plus a local pre-commit Gitleaks scan. The weekly TruffleHog/Gitleaks history workflow lives in [`.github/workflows/secret-scan-deep.yml`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/.github/workflows/secret-scan-deep.yml), and the fast PR/push scan lives in [`.github/workflows/secret-scan-fast.yml`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/.github/workflows/secret-scan-fast.yml).
- Dependency maintenance: [`.github/dependabot.yml`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/.github/dependabot.yml) enables conservative weekly npm update PRs so package drift becomes visible without relying on memory.

Pointers:

- For route-to-legacy ownership, see `Current Route And Legacy Surface Map` above.
- For shared Next.js file ownership, see `Shared Components`, `Tracker Execution Stack`, `Shared Utilities`, and `Shared Hooks` below.
- For canonical operating rules, see [`AGENTS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/AGENTS.md).
- For the generated AI context overview (routes, key folders, active docs), see [`docs/AI_CONTEXT.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/AI_CONTEXT.md). Regenerate with `node scripts/generate-ai-context.mjs`.

## Shared Styling

- [`styles/globals.css`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/styles/globals.css): Shared Next.js design tokens, global control typography floor, and readable-text defaults. Use it for app-wide typography tokens and global control behavior before adding page-local font-size fixes.
- Compact text is opt-in, not the default. Dense UI such as badges, timestamps, and compact metadata may use explicit compact tokens, but normal labels, helper text, and form controls should inherit the readable shared baseline.

## Shared Components

Use these from `components/` when building or wiring Next.js pages. Prefer existing shared pieces before creating new page-local UI.

- [`components/AuthForm.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/AuthForm.js): Shared sign-in form. Use it on authenticated pages instead of writing an inline login form. It now shows shared offline guidance when the browser is offline so the user knows fresh sign-in still needs network access. Basic usage: `<AuthForm title="..." onSignIn={signIn} />`.
- [`components/NavMenu.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/NavMenu.js): Shared React navigation drawer. Use it instead of legacy hamburger globals or script tags.
- [`components/NativeSelect.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/NativeSelect.js): iOS-safe native select with optional "Other" text entry. Use it for app selects that need touch-safe behavior.
- [`components/ExercisePicker.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/ExercisePicker.js): Exercise search, sort, manual reorder, select UI, and tracker-side dosage edit affordance for the tracker. Use it when the user needs to choose an exercise from the active program list. The component owns the touch drag handle and drag-ghost behavior for manual ordering, treats history badges as optional so the picker can render before the full tracker history payload finishes loading, and surfaces an optional dosage-edit action that delegates the actual write back to the route host.
- [`components/SessionLoggerModal.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/SessionLoggerModal.js): Manual session/set entry and edit modal with per-set fields. Use it for history log maintenance and tracker-owned manual set entry flows; route-level final session notes/backdate still belong in [`pages/index.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/pages/index.js).
- [`components/SessionNotesModal.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/SessionNotesModal.js): Tracker finish-session notes and optional backdate modal. Use it for the route-level finalization step after an in-progress tracker session has accepted at least one set.
- [`components/TimerPanel.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/TimerPanel.js): In-panel execution UI for reps, hold, duration, and distance flows. Use it when the user is actively logging an exercise from the tracker.
- [`components/PocketModeOverlay.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/PocketModeOverlay.js): Full-screen pocket interaction surface for timer-driven logging. Use it as the touch-first companion to `TimerPanel`.
- [`components/NextSetConfirmModal.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/NextSetConfirmModal.js): Confirmation step for app-recorded next-set logging. Use it when the timer flow has built a set patch that still needs user confirmation.
- [`components/HistoryPanel.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/HistoryPanel.js): Tracker history tab panel. Use it on the tracker page instead of duplicating history-tab rendering. It stays UI-only and owns the explicit `Load older history` affordance for paging beyond the initial tracker bootstrap slice.
- [`components/BottomNav.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/BottomNav.js): Fixed bottom tab bar for tracker page navigation between exercise and history views.
- [`components/HistoryList.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/HistoryList.js): Session history list grouped by date with expandable detail. Use it where the page needs read-only history rendering. It also owns the inline history-note pill styling, including the dark-mode palette for notes shown inside session cards.
- [`components/Toast.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/Toast.js): Floating toast notification overlay. Use it with `useToast` for transient user feedback (save success, errors, sync status). Matches static app `#toastContainer` mechanics: `position:fixed`, slide-up from bottom, success/error variants.
- [`components/MessagesModal.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/MessagesModal.js): Messaging modal used by index and pt-view. Handles compose/send, roll-up (archive inline), restore (unarchive), and undo-send (delete within 1 hour). Requires `onSend`, `onArchive`, `onUnarchive`, `onRemove`, `onMarkRead`, `onEmailToggle`, `onOpened` props from `useMessages`.
- [`components/ExerciseHistoryModal.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/ExerciseHistoryModal.js): Exercise-specific history modal used by the history dashboard.
- [`components/PatientNotes.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/PatientNotes.js): Patient notes panel with keyword highlighting, dismiss behavior, and note-surface theming for light/dark mode on `/pt-view`.
- [`components/PtViewNeedsAttention.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/PtViewNeedsAttention.js), [`components/PtViewSummaryStats.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/PtViewSummaryStats.js), and [`components/PtViewFiltersPanel.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/PtViewFiltersPanel.js): Page-only rehab history panels extracted from `/pt-view`. Use them to keep the route page focused on composition instead of inline panel markup. `PtViewFiltersPanel` also owns the route's responsive filter-grid behavior, so medium-width layout fixes belong there rather than in [`pages/pt-view.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/pages/pt-view.js).
- [`components/DosageModal.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/DosageModal.js): Shared dosage editor for patient exercise programs. It owns hold-vs-duration field semantics, including `seconds_per_rep` for holds, `seconds_per_set` for duration, and outgoing `dosage_type` shaping.
- [`components/ProgramExerciseSelector.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/ProgramExerciseSelector.js): Exercise-selection workspace for opening an existing exercise or starting a new one. Use it when an editor host needs the full selector/search/archive controls without rebuilding them inline in a route page.
- [`components/ExerciseRolesWorkspace.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/ExerciseRolesWorkspace.js): Roles workspace shell with search/select controls and handoff into `ProgramRolesSection`. Use it when a route such as rehab coverage or the editor needs the full roles workspace, not just the add/remove table.
- [`components/ProgramRolesSection.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/ProgramRolesSection.js): Standalone roles-management section for the `/program` editor page. Use it when the exercise editor needs roles outside the core exercise form.
- [`components/ProgramDosageWorkspace.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/ProgramDosageWorkspace.js): Dosage workspace shell with patient-context banner, search/select controls, and dosage summary card. Use it when an editor host needs the full dosage workspace while leaving modal editing to `DosageModal`. The component renders program dosage text through [`lib/dosage-summary.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/dosage-summary.js) instead of owning its own wording rules.
- [`components/ProgramVocabEditor.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/ProgramVocabEditor.js): Standalone vocabulary-management section for the editor surface. Use it when controlled vocab terms need to be added, edited, or soft-deleted without leaving the current host route. Archive uses a guarded two-step confirmation flow and only removes the term from active lists.
- [`components/ExerciseForm.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/ExerciseForm.js): Orchestrates the reusable exercise editor form. Use it on any editor host route instead of rebuilding exercise CRUD UI inline.
- [`components/ExerciseFormCore.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/ExerciseFormCore.js), [`components/ExerciseFormCues.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/ExerciseFormCues.js), and [`components/ExerciseFormLifecycle.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/ExerciseFormLifecycle.js): Split sections of the exercise editor form. These support `ExerciseForm`; the form now owns exercise details, guidance, and lifecycle, while `/program` handles roles, dosage, and vocabulary management as separate workspace sections. Lifecycle status values are documented in [`docs/DATA_VOCABULARIES.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/DATA_VOCABULARIES.md), including `On Hold` as the paused-but-still-managed status, and the lifecycle-first implementation rules live in [`docs/IMPLEMENTATION_PATTERNS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/IMPLEMENTATION_PATTERNS.md).
- [`components/CoverageSummary.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/CoverageSummary.js), [`components/CoverageMatrix.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/CoverageMatrix.js), [`components/CoverageCapacity.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/CoverageCapacity.js), and [`components/CoverageExerciseCard.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/CoverageExerciseCard.js): Shared rehab coverage page renderers. Use them for the rehab page rather than embedding matrix logic in the page file.

For tracker-specific timer/audio ownership boundaries, see `Tracker Execution Stack` below.

## Tracker Execution Stack

Use this section when working on tracker execution behavior, timer flow, cue wiring, or Pocket Mode. Keep specialized tracker behavior here rather than scattering it across the generic shared-file sections.

### UI Surfaces

- [`components/TimerPanel.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/TimerPanel.js): Renders the timer/counter UI and dispatches user intents such as side selection, start/pause, reset, and apply/open-manual actions.
- [`components/PocketModeOverlay.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/PocketModeOverlay.js): Renders the pocket-mode interaction layer and forwards tap/long-press intents.
- [`components/NextSetConfirmModal.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/NextSetConfirmModal.js): Confirmation step for app-recorded next-set logging after the execution stack has built a set patch.

### Hook Integration Layer

- [`hooks/useTimerSpeech.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTimerSpeech.js): The panel-facing execution hook. It combines exercise metadata, selected-side state, timer state, set-patch shaping, and cue dispatch for `TimerPanel`, and it preserves the active side across tracker panel resets while the user stays on the same sided exercise.
- [`hooks/useExerciseTimer.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useExerciseTimer.js): Thin timer adapter around the machine. It owns the running interval and dispatches timer events into the machine.
- [`hooks/useBrowserAudioContext.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useBrowserAudioContext.js): Focused browser-audio readiness hook for the tracker cue stack. It resumes the Web Audio context before the first beep and exposes the low-level beep helper used by `useTimerAudio`.
- [`hooks/useBrowserSpeech.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useBrowserSpeech.js): Focused speech-synthesis readiness hook for tracker cues and announcements. It warms voices for first-use browser sessions and exposes shared speak/clear helpers used by `useTimerAudio` and `useLoggerFeedback`.
- [`hooks/useTimerAudio.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTimerAudio.js): Executes emitted effects such as beeps, countdown warnings, speech, and queue clearing. It also owns first-interaction browser media warm-up and ordered cue execution so timer tones and voice prompts are less likely to drop on the first exercise or side. Use it for side effects, not business rules.
- [`hooks/useLoggerFeedback.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useLoggerFeedback.js): Tracker feedback hook for session-complete speech, exact save-success copy, delayed comparison speech, and tracker-wide speech warm-up for first-use browser sessions. Use it for tracker-wide feedback timing and spoken completion behavior that sits above the timer machine.
- [`hooks/useExerciseSortState.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useExerciseSortState.js): Tracker hook for user-scoped exercise sort mode and manual-order persistence. Use it from the tracker route instead of putting `localStorage` sort/order wiring directly in [`pages/index.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/pages/index.js).

### Pure Rule And Helper Layer

- [`lib/logger-timer-machine.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/logger-timer-machine.js): Pure timer/cue transition core. This is the rule layer for state transitions and emitted effects.
- [`lib/timer-panel.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/timer-panel.js): Pure helpers for exercise mode detection, target values, display formatting, rep labels, and set-patch construction.

### Ownership Boundaries

- `pages/index.js` owns the page flow and hands the selected exercise into `TimerPanel`.
- `TimerPanel` should stay UI-thin and call the hook API rather than hard-coding cue rules.
- `useTimerSpeech` is the current integration surface for the panel.
- `useExerciseTimer` and `useTimerAudio` are adapters/executors below that surface.
- `useLoggerFeedback` owns tracker-wide completion/save/comparison feedback above the timer stack.
- `logger-timer-machine.js` is the place for transition and cue logic, not the UI.

### Current Cue Rules

- Rep counter uses a soft tick on every tap.
- Standard rep milestone speech is `5 reps left`, `3 reps left`, `Last rep`, then `Set complete`.
- Low-rep activities under `5` reps announce every remaining rep after progress changes:
  - example for a `3`-rep activity: `2 reps left`, `Last rep`, `Set complete`
- Hold timers use countdown warning beeps at `3/2/1`, a completion triple-beep at each timed rep end, and rep milestone speech after each completed timed rep.
- Duration timers use countdown warning beeps at `3/2/1`, a completion triple-beep at timer end, and richer completion speech in the form `Set X of Y complete`, including side when relevant.
- Timer start uses a confirmation beep for targets `>= 5` seconds and does not speak `Start`.
- Timer pause speaks `Pause` when the target is `> 5` seconds or when Pocket Mode is open.
- Pocket Mode inherits the normal timer/counter cues and adds a partial-confirm beep for hold long-press.
- Delayed progress-comparison speech runs after successful `Next Set` confirmation, not during live counting/timing. The current model compares against the most recent comparable prior session before the panel opened, using:
  - best-set improvement first
  - then total-volume drop
  - then total-volume improvement

## Shared Utilities

Use these `lib/` files from Next.js pages and hooks when you need shared logic. These are the current Next.js-layer utility files.

- [`lib/supabase.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/supabase.js): Shared Supabase client for the Next.js app. Import `supabase` from here; do not create a new client elsewhere in Next.js pages/hooks. The client now initializes lazily so build-time module evaluation does not fail before env-backed auth work is actually used. Auth persistence uses the shared IndexedDB-backed storage adapter from `lib/offline-cache.js`.
- [`lib/offline-cache.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/offline-cache.js): Shared IndexedDB cache and storage adapter for offline-capable Next.js routes. Use it for cached route bootstrap data, including tracker exercises/programs/logs fallback, editor bootstrap caches (`/program` exercises/vocab/reference data), lightweight offline UI state, and Supabase auth storage instead of `localStorage`.
- [`lib/text-format.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/text-format.js): Pure string-formatting helpers for typed values and labels. Commonly paired with `NativeSelect`.
- [`lib/date-utils.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/date-utils.js): Shared calendar-day date helpers. Use it when recency, `Done today`, or overdue timing must follow local-midnight semantics instead of rolling 24-hour math.
- [`lib/rehab-coverage.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/rehab-coverage.js): Pure coverage calculations and constants for the rehab page. Use it for data shaping, not UI rendering.
- [`lib/index-data.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/index-data.js): Fetch adapters for tracker exercises, programs, and history logs, including the cursor-paged history fetch helper used when the tracker loads older history beyond the first bootstrap slice.
- [`lib/index-history.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/index-history.js): Tracker history/adherence helpers such as badge state and filtering.
- [`lib/index-offline.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/index-offline.js): Pure tracker offline-queue helpers for IndexedDB-backed load/save/remove/build-payload behavior. Use it for queue persistence rules; page/hooks own the async hydration and sync flow.
- [`lib/index-tracker-session.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/index-tracker-session.js): Pure helpers for index tracker draft-session state, sided-versus-total session progress math, optimistic local history insertion, and local datetime formatting used by finalization UI. Use it as the canonical place for tracker session-progress shaping instead of recomputing left/right/remaining counts in components or hooks.
- [`lib/dosage-summary.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/dosage-summary.js): Shared prescribed-dosage wording helper for tracker and program surfaces. Use it for `sets x reps`, hold, duration, distance, and `per side` summary text instead of rebuilding dosage copy in components.
- [`lib/tracker-performance.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/tracker-performance.js): Browser-only tracker timing marks and measures for bootstrap start, primary-ready, history-ready, and picker-ready phases. Use it when tracker load instrumentation changes instead of sprinkling raw `performance.mark()` strings across pages and hooks. Performance validation steps for these marks live in [`docs/TESTING_CHECKLISTS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/TESTING_CHECKLISTS.md).
- [`lib/session-form-params.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/session-form-params.js): Helpers for history-derived and exercise-derived form parameter defaults. It owns side-aware and in-session form-parameter history/default lookup for tracker logging, so those parity rules belong here instead of being rebuilt in [`components/SessionLoggerModal.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/SessionLoggerModal.js).
- [`lib/exercise-sort.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/exercise-sort.js): Pure tracker exercise-order helpers for sort mode normalization, user-scoped storage keys, manual-order normalization, and visible-subset reordering. Use it for tracker sort/manual-order rules instead of rebuilding that logic in the page or picker markup.
- [`lib/server-user.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/server-user.js): Shared `React.cache()` wrapper for server-side auth user lookup. Use it from protected Server Components that need the authenticated user so they share one deduplicated Supabase `getUser()` round-trip per request instead of making separate calls in each route file.
- [`lib/session-logging.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/session-logging.js): Pure helpers for activity type inference, default set creation, set normalization, and create payload shaping.
- [`lib/timer-panel.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/timer-panel.js): Pure timer/counter helpers used by the tracker execution stack.
- [`lib/logger-timer-machine.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/logger-timer-machine.js): Pure timer/cue transition machine used by the current tracker execution stack.
- [`lib/logger-progress-comparison.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/logger-progress-comparison.js): Pure helpers for delayed progress-comparison speech after set logging.
- [`lib/users.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/users.js): Shared API helpers for user data, email notification preferences, and resolved patient context (`fetchUsers`, `patchEmailNotifications`, `resolvePatientScopedUserContext`). Use it on any Next.js page that needs user records, patient-scoped route context, or the current user's recipient ID for messaging.
- [`lib/pt-view.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/pt-view.js): Page-domain helpers and fetch logic for the history dashboard. Use [`lib/users.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/users.js) for shared user lookup, patient-context resolution, and email helpers.
- [`lib/pt-editor.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/pt-editor.js): Page-domain fetch and mutation helpers for the exercise editor, including controlled-vocab CRUD wrappers used by `/program`. `/program` now owns the network-or-cache bootstrap flow and uses `offlineCache` for read fallback rather than embedding cache logic here.
- [`lib/program-offline.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/program-offline.js): Pure `/program` offline mutation queue helpers. Use it for queue persistence keys, mutation merging, queue-summary labeling, local temporary IDs, and replay execution rules for exercise, role, dosage, and vocabulary writes, including replay-time exercise ID remapping for follow-up mutations after offline-created exercises.
- [`lib/program-optimistic.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/program-optimistic.js): Pure optimistic-state helpers for `/program` mutations. Use it when editor writes need local exercise/reference-data/dosage updates before queued sync completes.
- [`lib/vocab-options.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/vocab-options.js): Shared helper for turning vocabulary rows into `NativeSelect` option objects with consistent labels. Use it for vocab-backed editor controls instead of repeating mapping logic in components.

Legacy API layer in `lib/`:

- [`lib/auth.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/auth.js): Legacy API-layer auth helpers. Do not treat this as the shared Next.js auth surface.
- [`lib/db.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/db.js): Legacy API-layer database helpers. Do not import this into Next.js pages/components as a shared frontend utility.

Active App Router API surface:

- [`app/api/env/route.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/api/env/route.js), [`app/api/users/route.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/api/users/route.js), [`app/api/logs/route.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/api/logs/route.js), [`app/api/messages/route.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/api/messages/route.js), [`app/api/notify/route.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/api/notify/route.js), [`app/api/reference-data/route.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/api/reference-data/route.js), [`app/api/vocab/route.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/api/vocab/route.js), [`app/api/roles/route.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/api/roles/route.js) plus [`app/api/roles/[id]/route.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/api/roles/[id]/route.js), [`app/api/exercises/route.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/api/exercises/route.js) plus [`app/api/exercises/[id]/route.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/api/exercises/[id]/route.js), and [`app/api/programs/route.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/api/programs/route.js) plus [`app/api/programs/[id]/route.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/api/programs/[id]/route.js): active App Router route handlers for the current `/api/*` surface. Keep request/response behavior in these route files and shared pure helpers in `lib/`.

## Shared Hooks

Use these from `hooks/` to keep page files thin and consistent with the current migration structure.

- [`hooks/useAuth.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useAuth.js): Shared authentication hook. Use it on any Next.js page that needs session, sign-in, or sign-out. It restores the locally-persisted session immediately so offline-capable routes can bootstrap from cache first, validates with Supabase in the background, and mirrors the current auth user ID into `offlineCache` so protected routes can recover cached patient-scoped data even when browser session hydration is delayed offline.
- [`hooks/usePtViewData.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/usePtViewData.js): Loads and caches the `/pt-view` bootstrap data for users, programs, and logs, including patient-context resolution, sign-out cleanup, and offline fallback. It now preserves the last visible cached snapshot when auth is still present but patient context has not re-resolved yet, so transient offline context reloads do not zero the history dashboard. Use it to keep the history dashboard route at orchestrator level instead of embedding fetch and cache lifecycle logic in the page.
- [`hooks/usePtViewUiState.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/usePtViewUiState.js): Owns persisted `/pt-view` notes/filter UI state and note keyword-highlighting shaping. Use it when rehab history UI-state rules or note preprocessing change, instead of broadening [`pages/pt-view.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/pages/pt-view.js).
- [`hooks/useEmailNotifications.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useEmailNotifications.js): Manages email notification enabled state for the current user with optimistic update and API revert on failure. Accepts `{ token, initialEnabled, loading }`. Use instead of putting email toggle mutation logic in a page.
- [`hooks/useRehabCoverageData.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useRehabCoverageData.js): Loads rehab coverage logs and roles, renders cached coverage data immediately when IndexedDB already has a usable snapshot, writes refreshed rehab cache data, and handles offline fallback/reload for `/rehab`. Use it for coverage bootstrap work instead of putting route fetch logic in [`app/rehab/RehabPage.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/rehab/RehabPage.js).
- [`hooks/useIndexData.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useIndexData.js): Loads tracker bootstrap data for exercises, programs, and logs. It serves cached tracker bootstrap immediately when IndexedDB has a patient-scoped snapshot, refreshes from network in the background, stages tracker bootstrap so exercises/programs can render before the heavier history payload finishes, hydrates the shared IndexedDB cache after successful fetches, falls back to cached tracker bootstrap data on offline/network failure, exposes cached-data state plus non-blocking history-load feedback for the tracker shell, pages older history beyond the initial bootstrap slice on demand while keeping the merged history cache aligned, emits tracker bootstrap timing marks through [`lib/tracker-performance.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/tracker-performance.js), normalizes failed-load copy, and clears the tracker read cache when auth or resolved patient context drops.
- [`hooks/useUserContext.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useUserContext.js): Shared resolver for profile-vs-auth identity domains. It now restores cached `users` context before attempting live refresh and keeps that cached profile/patient context authoritative while offline refreshes fail, so tracker, pt-view, and program keep their patient-scoped cache keys stable during offline use. Tracker bootstrap and tracker log creation must use `patientId`/`profileId` from this hook where APIs expect `users.id`, not `session.user.id` (auth UUID).
- [`hooks/useIndexOfflineQueue.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useIndexOfflineQueue.js): Manages the tracker offline queue, async IndexedDB hydration/persistence, sync, and sign-out cleanup.
- [`hooks/useTrackerReconnectRecovery.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTrackerReconnectRecovery.js): Owns tracker reconnect policy for the index route: immediate queue sync on browser online return, picker-only full reload when the route is safe to refresh, and deferred refresh while logger/history flows stay active.
- [`hooks/useProgramOfflineQueue.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useProgramOfflineQueue.js): Manages the `/program` offline mutation queue lifecycle, including IndexedDB hydration, online replay, queue-status reporting, failed-change recovery state, and replay refresh against the resolved patient context.
- [`hooks/useProgramBootstrapWarmup.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useProgramBootstrapWarmup.js): Shared protected-route warm hook for `/program` cold-open offline support. It runs from the resolved `useAuth()` browser session and fills missing editor bootstrap caches (users, exercises, programs, vocabularies, reference data) after authenticated app use so PT-office offline first visits to `/program` do not depend on a prior online `/program` load.
- [`hooks/useProgramPageData.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useProgramPageData.js): Owns the `/program` bootstrap and cached fallback lifecycle, including therapist/admin access gating, patient-scoped context resolution, immediate cached editor bootstrap when IndexedDB already has data, server-seeded or `auth_state`-seeded cached restore before browser session hydration finishes, background refresh of the full editor payload, and offline fallback when the network path fails.
- [`hooks/useProgramDataSnapshot.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useProgramDataSnapshot.js): Owns cached snapshot writes for `/program` editor data. Use it when optimistic editor updates need to update the in-memory data snapshot and keep IndexedDB fallback data aligned.
- [`hooks/useProgramMutationUi.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useProgramMutationUi.js): Owns `/program` mutation loading flags and the UI-facing wrapper handlers that bracket role and vocabulary writes while reusing the lower-level optimistic mutation hooks.
- [`hooks/useProgramWorkspaceState.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useProgramWorkspaceState.js): Owns `/program` workspace selection state and derived editor option lists, including exercise search/archive filtering, role and dosage workspace targeting, dosage modal target state, and active form selection.
- [`hooks/useProgramMutationActions.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useProgramMutationActions.js): Owns optimistic `/program` mutation handlers for exercise saves, roles, and dosages while delegating queue lifecycle to `useProgramOfflineQueue`. Dosage writes must receive the resolved patient `users.id`, not the raw auth session ID, and should preserve the modal's `dosage_type` / seconds field semantics in optimistic program state.
- [`hooks/useProgramVocabActions.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useProgramVocabActions.js): Owns optimistic controlled-vocabulary create/update/delete handlers for `/program`. Use it to keep vocabulary mutation logic separate from the exercise/role/dosage mutation hook.
- [`hooks/useManualLog.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useManualLog.js): Owns in-progress manual set logging state on the tracker page, including add/remove/edit handlers and modal submit/close behavior while a draft session is open.
- [`hooks/useTrackerSession.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTrackerSession.js): Owns the active tracker-session orchestration for the index page, including selected exercise state, draft session state, side continuity for sided exercises, timer/modal flow, optimistic history insertion, and the live form-parameter context handed from tracker state into manual/next-set logging.
- [`hooks/useTrackerDosageEditor.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTrackerDosageEditor.js): Owns tracker-side prescribed-dosage editing state. It opens/closes the shared dosage modal, overlays queued program dosage changes onto tracker program rows, reuses the shared program mutation queue format for offline replay, and keeps the tracker page at orchestration level instead of embedding dosage-save logic there.
- [`hooks/useTrackerSessionFinalization.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTrackerSessionFinalization.js): Owns finish-session notes, backdate, cancel, optimistic finalization state, and save/requeue behavior for tracker sessions. Use it when the tracker finish/cancel/save lifecycle changes instead of broadening `useTrackerSession.js`.
- [`hooks/useSessionLogging.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useSessionLogging.js): Owns manual create/edit logging state and submit behavior for the session logger modal.
- [`hooks/usePanelSessionProgress.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/usePanelSessionProgress.js): Tracks per-exercise progress during the open tracker session so the panel and history filter stay aligned.
- [`hooks/useBrowserSpeech.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useBrowserSpeech.js): Shared speech-synthesis readiness hook for tracker cues and announcements. It warms voices for first-use browser sessions and exposes the shared speak/clear helpers reused by `useTimerAudio` and `useLoggerFeedback`.
- [`hooks/useBrowserAudioContext.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useBrowserAudioContext.js): Shared browser-audio readiness hook for timer cues. It resumes the Web Audio context before the first beep and exposes the low-level beep helper reused by `useTimerAudio`.
- [`hooks/useLoggerFeedback.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useLoggerFeedback.js): Owns tracker-wide spoken/text feedback such as `All sets complete`, delayed comparison speech, exact `Saved (with notes)` / `Saved (no notes)` success copy, and tracker-wide speech warm-up for first-use browser sessions.
- [`hooks/useExerciseTimer.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useExerciseTimer.js): Timer adapter for hold/duration flows built on the logger timer machine. It owns execution-state reset timing for the tracker panel when a set is accepted or the panel is reopened.
- [`hooks/useTimerAudio.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTimerAudio.js): Audio and speech side-effect executor for timer feedback, including browser media warm-up and ordered cue playback so startup tones and voice prompts do not race the browser unlock path.
- [`hooks/useTimerSpeech.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTimerSpeech.js): Panel-facing execution hook for the tracker timer flow. It mirrors the tracker-owned current side into the panel execution state and handles panel-local cue/timer behavior across in-session reset cycles.
- [`hooks/useToast.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useToast.js): Floating toast state hook. Use it with `Toast` component for transient feedback. It owns the staged static-style toast lifecycle: short animate-in delay, display duration, fade-out, then clear/unmount.
- [`hooks/useMessages.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useMessages.js): Shared messaging hook used by migrated pages that open the messages modal.

For timer execution hook boundaries, see `Tracker Execution Stack` above.

## Canonical Docs

- [`AGENTS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/AGENTS.md): Workflow and operating rules for agents in this repo.
- [`docs/README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/README.md): Docs index explaining which project doc to open and when.
- [`docs/AGENT_PLAYBOOK.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/AGENT_PLAYBOOK.md): Longer agent workflow detail that `AGENTS.md` points to only when the extra guidance is applicable.
- [`docs/NEXTJS_CODE_STRUCTURE.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/NEXTJS_CODE_STRUCTURE.md): Authoring rules for file structure, split decisions, and size guidance.
- [`docs/NEXTJS_MIGRATION_STATUS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/NEXTJS_MIGRATION_STATUS.md): Migration-status context and broader rollout history. Do not treat it as the primary file-ownership map.
- [`docs/IMPLEMENTATION_PATTERNS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/IMPLEMENTATION_PATTERNS.md): Approved shared helpers, components, and do-this-not-that implementation guidance.
- [`docs/TESTING_CHECKLISTS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/TESTING_CHECKLISTS.md): Canonical regression, parity, and performance evidence checklists for safe validation.
- [`docs/BEADS_ISSUE_TEMPLATE.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/BEADS_ISSUE_TEMPLATE.md): Required Beads issue template.
- [`docs/BEADS_MOLECULES.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/BEADS_MOLECULES.md): Repo-specific guide to Beads formulas, molecules, protos, wisps, and the current formula inventory.

## README Maintenance Rules

Update this README in the same change when any of these happen:

- A shared Next.js file is added, removed, renamed, or given a different responsibility
- A legacy HTML page is replaced, retired, redirected, or mapped to a different Next.js route
- Cleanup or refactor work changes which file owns a concern that another agent would need to find
- Timer/audio/logger wiring changes enough that the ownership notes would become outdated
- Approved shared-helper or do-this-not-that implementation guidance changes; update [`docs/IMPLEMENTATION_PATTERNS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/IMPLEMENTATION_PATTERNS.md) in the same change

### How To Write Entries

- Keep it factual. Document what exists now, not planned future structure.
- Update the relevant section entry instead of leaving stale file names behind.
- For shared files, keep each entry to: what it does, when to use it, and any important boundary such as “UI only” or “pure helper”.
- Keep legacy API-layer files clearly separated from Next.js shared utilities.
- If the architecture changes substantially and this file would be overwritten rather than edited, create a backup first.

### Shared-File Entry Template

```md
### `path/to/file.js`

- What it is: short ownership statement
- Use it when: the situations where an agent should reach for this file
- Do not use it for: nearby concerns that belong in a different file/layer
- Depends on: lower-level helpers/components/hooks it relies on when that matters
- Used by: main callers, pages, or shared surfaces that wire it in
- Notes: behavior rules or caveats that affect integration
```

Minimum bar for an entry:

- what the file owns
- when to use it
- where not to put adjacent logic if that boundary is important

## Deployment References

- Vercel project: `pt-rehab`
- Production: [https://pttracker.app](https://pttracker.app)
- Preview for `nextjs` branch: [https://pt-rehab-git-nextjs-pt-tracker.vercel.app](https://pt-rehab-git-nextjs-pt-tracker.vercel.app)
- Supabase project: `zvgoaxdpkgfxklotqwpz`
