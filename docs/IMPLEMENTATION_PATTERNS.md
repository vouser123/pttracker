# PT Tracker Implementation Patterns

Use this file when you know what feature you need to build, but need the approved project pattern for how to build it.

Use [`../README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/README.md) to find file ownership.
Use this file to answer "which shared thing should I use?" and "what should I avoid re-implementing?"

These patterns are the default for current maintained codepaths, especially shared React and Next.js surfaces.
Legacy static pages may preserve existing patterns unless the work is already migrating that surface or extracting a shared helper on purpose.
Treat the static legacy surface as frozen for routine cleanup. Only apply these patterns there when the work is user-approved, a security issue, or an explicit migration/parity task.

## Selects And Option Lists

- Use [`components/NativeSelect.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/NativeSelect.js) for current app selects that need touch-safe, iPhone-safe behavior.
- `NativeSelect` calls `onChange` with the selected string value, not the browser event object. When wiring state, use a string setter or `(value) => ...` callback instead of `event.target.value`.
- Use [`lib/vocab-options.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/vocab-options.js) to turn vocabulary rows into select options.
- Use [`lib/text-format.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/text-format.js) when a select or companion text field needs consistent typed-value labels.
- Do not hand-roll a plain select plus custom "Other" logic when the current surface can already use `NativeSelect`.
- Do not hardcode extendable dropdown option lists without explicit sign-off. Domain data belongs in vocab/reference data, not inline arrays.

## Exercise Lifecycle And Visibility

- Treat [`docs/DATA_VOCABULARIES.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/DATA_VOCABULARIES.md) as the canonical lifecycle vocabulary for exercises.
- Use `lifecycle_status` as the source of truth for exercise visibility, grouping, and routine-counting behavior on lifecycle-aware surfaces.
- `on_hold` means the exercise is paused for now, stays visible in `/program`, and stays out of tracker, rehab, and PT-review routine surfaces.
- `as_needed` means the exercise is still selectable and loggable, but routine-counting and routine-attention surfaces should exclude it.
- Keep lifecycle-aware option construction and label formatting in shared helpers instead of repeating archived-only or PRN-only logic inline in components.
- For `/program`, show routine exercises first, then On Hold, then PRN, each with a visible prefix and grouping separator when the surface uses a native select.
- For `/tracker`, keep PRN visible in the picker only when the session-scoped visibility control includes it, and use a distinct badge in the custom card UI.
- Avoid adding new behavior decisions around the legacy boolean `archived` field on surfaces that are moving to lifecycle-first rules.

## Formatting And Labels

- Use [`lib/text-format.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/text-format.js) for typed values, labels, and value-display formatting.
- Use [`lib/dosage-summary.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/dosage-summary.js) for prescribed-dosage wording on tracker and program surfaces.
- Use [`lib/session-form-params.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/session-form-params.js) for form-parameter defaults and history-derived parameter shaping.
- Do not duplicate unit-label or typed-value formatting inline across components.
- Do not duplicate `sets x reps` or `per side` dosage-summary wording inside components when the shared dosage helper already covers the surface.
- Do not create one-off parser/formatter helpers in page files when the logic is reusable.

## Typography And Readability

- Use [`styles/globals.css`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/styles/globals.css) as the shared typography architecture for the Next.js surface.
- Treat `--font-size-body` as the readable default for body-like UI text and labels.
- Treat `--font-size-control-min` as the global floor for interactive controls so `button`, `input`, `select`, and `textarea` never fall back to tiny iOS defaults.
- Treat compact text as an explicit exception. Use tokens such as `--font-size-compact` or `--font-size-micro` only for dense UI that has been intentionally verified, such as badges, timestamps, and compact metadata.
- When a component needs smaller text than the readable default, document that intent in the local selector rather than relying on inherited browser defaults.
- Do not leave font sizing unset on form controls or custom action buttons.
- Do not introduce new sub-body text sizes for labels, helper copy, or interactive affordances unless the compact layout has been deliberately reviewed for readability.

## Dates, Recency, And Calendar-Day Logic

- Use [`lib/date-utils.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/date-utils.js) for recency, local-day comparisons, and any `Done today` or overdue semantics.
- Do not use rolling 24-hour math for calendar-day behavior.
- Do not re-implement midnight normalization separately in page or component files.

## Offline Storage And Persistence

- Use [`lib/offline-cache.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/offline-cache.js) for shared IndexedDB-backed route bootstrap and auth persistence.
- Use [`lib/network-status.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/network-status.js) for shared effective-online detection, network-unavailable error classification, and recent request success/failure evidence.
- Use [`lib/fetch-with-offline.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/fetch-with-offline.js) for authenticated JSON read requests that need shared offline, HTTP, and parse error classification.
- Use [`hooks/useEffectiveConnectivity.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useEffectiveConnectivity.js) when React code needs the current browser online state plus request-evidence status in one subscription.
- Use [`lib/tracker-bootstrap.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/tracker-bootstrap.js) when tracker bootstrap load, cache read/write rules, fallback shaping, or bootstrap error copy changes.
- Use [`hooks/useIndexHistoryPagination.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useIndexHistoryPagination.js) for older-history paging and merged-history cache persistence instead of broadening the tracker state shell.
- Use [`lib/index-offline.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/index-offline.js) with [`hooks/useIndexOfflineQueue.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useIndexOfflineQueue.js) for tracker offline queue behavior.
- Use [`hooks/useProgramBootstrapWarmup.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useProgramBootstrapWarmup.js) for authenticated warm-up of `/program` editor bootstrap data when first offline visits to `/program` must work after earlier app use.
- Use [`lib/program-bootstrap-warmup.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/program-bootstrap-warmup.js) when `/program` warm-fill cache inspection or missing-bootstrap write rules change so the warmup hook can stay focused on browser-session orchestration.
- Use [`app/(protected)/ProtectedClientWarmers.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/app/(protected)/ProtectedClientWarmers.js) for documented tracker-triggered `/program` route prefetch. Keep protected route warming on `router.prefetch('/program')` plus bootstrap cache warming, not hidden credentialed document or RSC fetches.
- Use [`hooks/useProgramOfflineQueue.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useProgramOfflineQueue.js) for `/program` offline queue state, hydration, and the route-facing queue API.
- Use [`hooks/useProgramQueueSync.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useProgramQueueSync.js) for `/program` replay timing, reconnect listeners, and post-sync refresh/toast behavior instead of mixing sync policy back into the queue-state owner.
- Use [`hooks/useProgramMutationQueueActions.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useProgramMutationQueueActions.js) for enqueue-time optimistic save, direct mutation attempts, rollback, and offline failure marking instead of broadening `useProgramOfflineQueue`.
- Do not introduce new app-data persistence in `localStorage`.
- Do not put IndexedDB queue rules directly into page components when a shared offline helper or hook already owns them.
- Do not add new raw `navigator.onLine` checks in auth, queue, or bootstrap code when the shared effective-connectivity helper covers the same decision.
- Do not hand-roll new authenticated read helpers with bare `fetch()` plus local offline string matching when the shared fetch wrapper covers the same request shape.
- Do not warm protected pages with hidden credentialed `fetch('/route')` or manual RSC fetches when the route can be warmed through the documented Next.js prefetch path.

## Auth, Users, And Shared Data Access

- Use [`lib/supabase.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/supabase.js) for the shared Next.js Supabase client.
- Use [`hooks/useAuth.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useAuth.js) for page-level auth/session flow.
- Use [`lib/users.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/users.js) for shared user lookup, email-notification preference helpers, and patient-context resolution.
- Use [`lib/program-page-data.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/program-page-data.js) for pure `/program` cached bootstrap shaping instead of rebuilding editor fallback state inside the route hook.
- For patient-scoped routes such as `/pt-view` and `/program` dosage, resolve the effective patient with `resolvePatientScopedUserContext(users, session.user.id)` before calling APIs that store `users.id`.
- Do not create new frontend Supabase clients in pages, components, or hooks.
- Do not bypass the shared auth flow with page-local token/session logic.
- Do not pass `session.user.id` directly into patient-program or patient-log APIs when the backend stores `users.id`; resolve the app user row first.

## Toasts, Messages, And Shared Feedback

- Use [`components/Toast.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/Toast.js) with [`hooks/useToast.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useToast.js) for transient user feedback.
- Use [`components/MessagesModal.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/MessagesModal.js) with [`hooks/useMessages.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useMessages.js) and [`lib/messages.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/messages.js) for migrated messaging flows.
- Do not create page-local toast systems or duplicate message modal behavior.
- Do not scatter message polling or read-state logic across multiple pages if `useMessages` already owns it.

## Timer, Audio, And Tracker Execution

- Keep tracker execution UI in [`components/TimerPanel.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/TimerPanel.js) and [`components/PocketModeOverlay.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/PocketModeOverlay.js).
- Use [`hooks/useTimerSpeech.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTimerSpeech.js) as the panel-facing integration layer. It composes three sub-hooks: `useTimerExecutionState`, `useTimerPanelOutput`, and `useExerciseTimer`, plus `useTimerAudio`.
- Use [`hooks/useTimerExecutionState.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTimerExecutionState.js) when counter state, selected-side state, reset policy, or side-preservation behavior changes. Do not add those concerns to `useTimerSpeech`.
- Use [`hooks/useTimerPanelOutput.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTimerPanelOutput.js) when panel display text (`repInfoText`, `targetDoseText`) or apply-payload shaping (`buildSetPatch`, `canApply`) needs to change. Do not add display derivation to the execution state hook.
- Use [`hooks/useExerciseTimer.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useExerciseTimer.js) and [`hooks/useTimerAudio.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTimerAudio.js) below that integration layer.
- Use [`hooks/useBrowserAudioContext.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useBrowserAudioContext.js) and [`hooks/useBrowserSpeech.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useBrowserSpeech.js) when timer or tracker feedback needs shared browser media warm-up instead of duplicating `AudioContext` or `speechSynthesis` readiness logic.
- Use [`hooks/useLoggerFeedback.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useLoggerFeedback.js) for tracker-wide completion/save/comparison feedback timing.
- Do not duplicate timer machine or tracker-wide feedback rules in page files when shared hooks already own them.
- Panel-local execution feedback that belongs to [`components/TimerPanel.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/TimerPanel.js) may remain in the panel when it is part of the execution UI itself.
## Tracker Session And Manual Log Structure

- Keep [`hooks/useTrackerSession.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTrackerSession.js) at orchestration level. It should wire tracker-session sub-hooks together instead of owning unrelated lifecycle, pending-set, and finalization rules inline.
- Use [`hooks/useTrackerExerciseSessionState.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTrackerExerciseSessionState.js) for selected-exercise, draft-session, timer-open, and side-continuity lifecycle.
- Use [`hooks/useTrackerPendingSetFlow.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTrackerPendingSetFlow.js) for pending-set confirmation, edit, manual fallback, and undo workflow.
- Use [`hooks/useTrackerSessionLifecycle.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useTrackerSessionLifecycle.js) for finalization-hook wiring and optimistic-log merge.
- Keep [`hooks/useManualLog.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useManualLog.js) focused on modal orchestration, draft-session coordination, and submit handoff back into the active tracker flow.
- Use [`lib/manual-log-state.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/manual-log-state.js) for deterministic manual-log set shaping: add/remove/renumber, side-aware patching, form-data updates, validation, and normalization prep.
- Keep [`hooks/useSessionLogging.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useSessionLogging.js) focused on session logger modal draft orchestration: open/close lifecycle, current draft state, and create/edit setup.
- Use [`lib/session-log-draft.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/session-log-draft.js) for deterministic session logger draft-state shaping: create/edit draft seeds, add/remove/renumber, and form-parameter patching.
- Use [`hooks/useSessionLogSubmission.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useSessionLogSubmission.js) for session logger modal write transport, offline enqueue fallback, and error mapping.
- Use [`hooks/useSeedSetLogging.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useSeedSetLogging.js) for the quick one-set logging path instead of widening the modal draft hook.
- Use [`lib/session-logging.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/session-logging.js) for shared session-log payload builders, create-log transport helpers, browser-offline detection, and network-failure classification when more than one hook needs the same logging helper.
- Use [`lib/tracker-exercise-context.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/tracker-exercise-context.js) for pure tracker form-context enrichment instead of rebuilding side-aware default-form-data lookup inside hooks or page files.
- Do not mix tracker workflow orchestration with pure set-shaping or form-context rules inside one hook when the pure logic can live in a reusable `lib/` helper.
- Do not export non-hook utilities from one hook file for another hook to import. Shared session-log helpers belong in `lib/`, not as cross-hook imports.
- Keep [`components/ExercisePicker.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/components/ExercisePicker.js) render-only. Do not move picker query/sort/display shaping or drag state into the component layer.
- Use [`hooks/useExercisePickerModel.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useExercisePickerModel.js) for tracker picker query state, visible-list display shaping, and drag-model composition.
- Use [`hooks/useExercisePickerManualReorder.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useExercisePickerManualReorder.js) for press-hold activation and reorder orchestration, [`hooks/useExercisePickerActiveDrag.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useExercisePickerActiveDrag.js) for active drag motion and preview ordering, and [`hooks/useExercisePickerDragDomEffects.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/hooks/useExercisePickerDragDomEffects.js) for the active drag DOM listener/touch-lock lifecycle instead of mixing that workflow back into the picker component.
## Touch-Safe Interaction Patterns

- Use `pointerup` rather than `onclick` for custom interactive controls.
- Use `touch-action: manipulation` on custom tappable controls and gesture-driven surfaces.
- Do not assume native form controls like `select`, `input`, or standard `button` elements need extra touch-action styling unless device testing shows a real issue.
- Keep touch-target size at or above 44px.
- Do not add mouse-only interaction assumptions to primary app controls.

## Shared-First Decision Rule

- Before adding a new helper, check the live map in [`../README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/README.md) and the docs index in [`README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/README.md).
- If a shared helper, component, or hook already owns the concern, extend it or use it instead of duplicating behavior.
- If no shared pattern exists, add the new pattern deliberately and update the relevant active docs in the same change.
