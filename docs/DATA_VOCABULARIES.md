# PT Tracker Rebuild - Data Vocabularies

This document lists the controlled vocabularies used by the rebuild APIs.

## Exercise categories (`pt_category`)

- `back_sij`
- `knee`
- `ankle`
- `hip`
- `vestibular`
- `foot`
- `shoulder`
- `other`

## Movement patterns (`pattern`)

- `side`
- `both`

## Pattern modifiers (`pattern_modifiers`)

- `duration_seconds`
- `hold_seconds`
- `distance_feet`

## Guidance sections (`guidance.section`)

- `motor_cues`
- `compensation_warnings`
- `safety_flags`
- `external_cues`

## Exercise lifecycle statuses (`lifecycle_status`)

- `active`
- `on_hold`
- `as_needed`
- `archived`
- `deprecated`

Lifecycle meaning used by the current app:

- `active` exercises are routine and count toward normal program and tracker flows.
- `on_hold` exercises stay visible in `/program` (plain name, no status label in the global editor list), but they are paused and should stay out of tracker, rehab, and PT-review routine surfaces.
- `as_needed` exercises stay available for selection and logging, but routine-counting and routine-attention surfaces should exclude them.
- `archived` exercises are hidden unless a management surface explicitly shows archived items.
- `deprecated` exercises are retired from active use.

## Patient assignment statuses (`patient_programs.assignment_status`)

These are patient-scoped and independent of the exercise's global `lifecycle_status`.

- `active` — exercise is part of the patient's active program.
- `inactive` — exercise is assigned but not currently active for this patient.
- `on_hold` — exercise is temporarily paused for this patient.
- `as_needed` (PRN) — exercise is available but not part of the routine for this patient.

Managed via the batch assignment panel in `/program`. Displayed per-patient in the pt-view tracker, not in the global exercise editor list.
