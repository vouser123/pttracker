# PT Rebuild Testing Checklists

Canonical checklist reference for ``. Loaded by `AGENTS.md`. New checklists are added here.

---

## Activity Log Testing Checklist

**Trigger:** Any change to `createActivityLog`, `updateActivityLog`, `processActivityLog`, or `create_activity_log_atomic`. Test all variable combinations below. Skipping any of these has caused regressions in production.

### Exercise type variables
- Exercise **with** form parameters (e.g. Theraband Row — has band_resistance form param). Verifies form_data is written to the correct set row.
- Exercise **without** form parameters (e.g. Ankle Inversion — Isometric — form_data is null in payload). Verifies no empty form_data rows are created.
- Exercise with pattern modifier only (`hold_seconds` or `duration_seconds` — not form_data). Verifies modifier fields are written without form_data confusion.
- Exercise with `distance_feet` set. Verifies distance is stored correctly alongside sets.
- Exercise with reps only (no seconds, no distance). The baseline case; must not regress.

### Set variables
- Single set. Baseline.
- Multiple sets (3+). Verify form_data ends up on the correct `set_number`, not shifted — a previous bug wrote all form_data to set 1.
- Sets with different form_data per set (e.g. set 1: band=blue, set 2: band=red). Verifies DN-004 fix is intact: each set's form_data is independent.
- Sets where set_number is not contiguous (e.g. 1, 3, 5 — edit flow). Verifies the edit path handles gaps in set_number without reordering or dropping data.

### Side variables
- `side = null` — bilateral exercises where both sides are done together. The side selector must be hidden in the UI; the payload must omit side or send null.
- `side = 'left'`
- `side = 'right'`
- `side = 'both'` is **NOT a valid DB value** — confirmed across 823 sets in production. Bilateral exercises log `side = null`, not `'both'`. Do not test for or produce this value. DN-063 tracks the Next.js UI parity fix.

### Log path variables
- Online, direct POST to `/api/logs` (`createActivityLog`). The primary path.
- Offline: log queued to the IndexedDB-backed offline queue, then synced via `syncOfflineQueue` → POST `/api/logs`. Same endpoint as online, different entry point — verifies queue serialization and sync correctness.
- Edit/update via PATCH to `/api/logs/:id` (`updateActivityLog`). Verifies existing log data is correctly overwritten without duplication.
- Sync path via POST to `/api/sync` (`processActivityLog`). Reachable endpoint; tests separately from the primary log path.

### Idempotency
- POST the same `client_mutation_id` twice. Must return 409 on the second request with no duplicate row created.
- After the double-post, confirm exactly one row exists in `patient_activity_logs` for that mutation ID.

### DB verification query
Run after any log submission to confirm the full data shape is correct end-to-end:
```sql
SELECT
  l.id AS log_id,
  l.exercise_name,
  s.set_number,
  s.reps,
  s.seconds,
  s.distance_feet,
  s.side,
  s.manual_log,
  f.parameter_name,
  f.parameter_value,
  f.parameter_unit
FROM patient_activity_logs l
LEFT JOIN patient_activity_sets s ON s.activity_log_id = l.id
LEFT JOIN patient_activity_set_form_data f ON f.activity_set_id = s.id
WHERE l.patient_id = '35c3ec8d-...'  -- replace with actual patient UUID
ORDER BY l.created_at DESC, s.set_number, f.parameter_name;
```

---

## App Router Render Profiling Checklist

**Trigger:** Any App Router migration slice, cache/bootstrap change, dynamic import change, list rendering change, or rerender optimization on `index`, `program`, `pt-view`, or `rehab`.

- Capture one desktop Chrome DevTools Performance trace for the changed route from cold load to first usable UI.
- Capture one mobile-emulated trace for the same route. Use the same route/action each time so before/after comparisons are fair.
- Record the LCP element and split. Note whether the delay is mostly `TTFB`, `load delay`, or `render delay`.
- Check whether the route is blocked on client bootstrap before first usable paint.
- For tracker work, read the custom marks from [`lib/tracker-performance.js`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/lib/tracker-performance.js):
  - `tracker:bootstrap:primary-load`
  - `tracker:bootstrap:history-load`
  - `tracker:ui:picker-load`
- Confirm whether cached bootstrap data appears before network refresh when the route is expected to be cache-first.
- Verify whether large lists are paying full render cost up front or only rendering the visible slice when virtualization is in scope.
- Check whether heavy child surfaces rerender on unrelated parent state changes.
- When modals or secondary panels are usually closed on first paint, confirm they are not inflating the initial route work unnecessarily.
- If an interaction change was made, capture one interaction trace for the slow path and note the main-thread blocker.
- For tracker history changes, use a history-bearing account or create fresh sessions first. Do not sign off on history behavior from an account that only shows `No history to show` or `Never done`.
- For tracker history changes, verify more than the first rendered block: enter `History`, confirm the tab activates, and scroll far enough to confirm subsequent history groups continue rendering after the initial viewport.
- For tracker history paging changes, request older history beyond the initial bootstrap slice and confirm older groups append without losing the already-rendered cache-backed slice.
- For tracker history paging changes, run one warmed offline reload after a successful online load and confirm the last merged history slice still restores from IndexedDB before network refresh.
- Write down the evidence source for the bead note:
  - DevTools Performance trace
  - Vercel Speed Insights field data
  - custom `tracker-performance` marks
  - bundle analysis, if relevant
- Do not call a performance fix complete based only on `it feels faster.` Record at least one concrete before/after signal.

---

## Bundle Analysis Checklist

**Trigger:** Any work intended to reduce initial JS, defer non-critical UI, or explain route bundle growth during the Next.js migration.

### Run
- `npm run analyze:bundle`

### Capture
- Note which route bundles are largest, especially `/`, `/program`, `/pt-view`, and `/rehab`.
- Check whether conditionally opened UI such as modals is still present in the initial route bundle.
- Check whether heavy shared dependencies appear in multiple route bundles.

### Compare
- Record before/after findings on the active bead when changing bundle shape.
- Re-run after dynamic imports or route-host refactors that are expected to reduce initial JS.

### Guardrail
- The repo uses Next 16's built-in analyzer path (`next experimental-analyze -o`) instead of a separate analyzer plugin.
- Bundle analysis is a build-time diagnostic only. It must not change normal `npm run build`, `npm run dev`, deployed runtime behavior, or Vercel config.

---

## Program Vocabulary Archive Checklist

**Trigger:** Any change to `/program` vocabulary add/edit/archive behavior or the controlled-vocabulary editor safety flow.

- Confirm the vocabulary editor still loads the expected active terms for each category.
- Confirm add and edit still work for a real term.
- Confirm the row action uses archive/soft-delete wording rather than permanent-delete wording.
- Confirm the first archive tap opens an inline warning instead of mutating immediately.
- Confirm a second explicit confirmation is still required before the archive request runs.
- Confirm the archived term disappears from the active list after success.
- Confirm a canceled archive leaves the term unchanged.

---

## Exercise Lifecycle Checklist

**Trigger:** Any change to exercise lifecycle values, lifecycle-aware option lists, or the surfaces that count or hide non-routine lifecycle states such as PRN / as-needed or On Hold.

### Program surface
- Create or edit an exercise with `lifecycle_status = as_needed`.
- Create or edit an exercise with `lifecycle_status = on_hold`.
- Confirm the lifecycle editor offers `as_needed` alongside the other lifecycle states.
- Confirm the lifecycle editor offers `on_hold` with the user-facing label `On Hold`.
- Confirm `/program` shows PRN exercises without requiring a separate PRN toggle.
- Confirm `/program` shows On Hold exercises without requiring a separate On Hold toggle.
- Confirm routine exercises appear before On Hold exercises, and On Hold exercises appear before PRN exercises in the selector lists.
- Confirm On Hold and PRN entries are visually separated and labeled clearly in `/program` selectors.
- Confirm archived items still follow the existing archived visibility control on `/program`.

### Tracker surface
- Load the tracker on a fresh session and confirm the default visibility is routine-only.
- Switch the tracker visibility to PRN and to all, and confirm the picker updates accordingly.
- Confirm On Hold exercises stay out of the tracker picker even when the tracker visibility is set to all.
- Confirm the tracker visibility choice stays stable while the app remains open in the same session.
- Confirm a full reload returns the tracker to the routine-only default.
- Confirm PRN rows, when visible, are clearly marked in the tracker picker.

### PT view surface
- Confirm PRN exercises do not appear in the routine needs-attention output.
- Confirm On Hold exercises do not appear in the routine needs-attention output.
- Confirm PRN exercises remain visible in history where history is supposed to reflect actual logged activity.
- Confirm archived items still stay out of the normal PT-view program lists.

### Rehab surface
- Confirm PRN exercises do not count toward rehab coverage totals or denominators.
- Confirm On Hold exercises do not count toward rehab coverage totals or denominators.
- Confirm archived behavior in rehab still matches the existing management visibility rules.

### Regression coverage
- Confirm lifecycle-aware surfaces are using lifecycle values rather than relying on the legacy boolean `archived` field for behavior decisions.
- Confirm archived visibility behavior that remains in the app still works on the surfaces that expose it.
