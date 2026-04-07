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
- `as_needed`
- `archived`
- `deprecated`

Lifecycle meaning used by the current app:

- `active` exercises are routine and count toward normal program and tracker flows.
- `as_needed` exercises stay available for selection and logging, but routine-counting and routine-attention surfaces should exclude them.
- `archived` exercises are hidden unless a management surface explicitly shows archived items.
- `deprecated` exercises are retired from active use.
