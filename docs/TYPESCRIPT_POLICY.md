# TypeScript Policy

Use this doc for the repo's TypeScript-first rules.

Keep `AGENTS.md` short. Put the detailed language-policy rules here.

## Policy

PT Tracker is TypeScript-first.

- All new source files must be `.ts` or `.tsx`.
- Agents must not create new `.js` or `.jsx` source files without explicit user approval.
- Existing JavaScript source files may remain only if they are untouched legacy files or qualify for the `small patch` exception below.
- When an agent makes a `material edit` to an existing `.js` or `.jsx` source file, that file must be converted to TypeScript in the same change.
- JSDoc is not an approved substitute for TypeScript except for the `external-library edge case` defined below.

For this policy, `source files` means app/runtime code under the repo's working code folders such as `app/`, `components/`, `hooks/`, `lib/`, `pages/`, `api/`, `scripts/`, `tests/`, and `test/`. It does not include generated output, vendor code, or third-party dependencies.

## Small Patch Exception

A change counts as a `small patch` only if all of these are true:

- it touches exactly one existing JavaScript source file
- it changes at most 20 non-comment source lines total in that file
- it does not add a new file
- it does not add a new export
- it does not add or rename a function, component, hook, class, or module-level constant used outside the file
- it does not change function parameters, component props, return shapes, thrown errors, or any other public contract
- it does not add new state, async flow, data fetching, mutation logic, schema-dependent logic, or offline logic
- it does not add a dependency
- it does not expand the file's responsibility

If any one of those statements is false, the change is not a `small patch`.

## Material Edit

A `material edit` is any change to an existing JavaScript source file that is not a `small patch`.

Common examples:

- adding or expanding a hook
- adding or expanding component props
- adding shared helper logic
- changing API request or response shaping
- changing Supabase row shaping or auth/user-context logic
- adding offline queue, cache, sync, or reconnect behavior
- touching more than 20 non-comment source lines
- touching more than one source file for the same feature change

## External-Library Edge Case

An `external-library edge case` exists only when converting a boundary to TypeScript would require disproportionate workaround code because of a third-party library limitation.

This exception applies only if at least one of these is true:

- the third-party library has missing, broken, or misleading type definitions
- the boundary depends on runtime-only dynamic shapes that cannot be expressed cleanly without broad `any` usage
- the library requires untyped globals or browser-injected objects that would force fake local types
- converting the boundary would require compatibility wrapper or refactor work larger than the feature being changed
- the file is a thin compatibility shim whose only job is translating to or from that library

This exception does not apply just because:

- the conversion feels inconvenient
- TypeScript reports errors that can be fixed locally
- the file is old
- the change is urgent
- an agent wants to avoid config or migration work

## Required Exception Note

If an agent uses either the `small patch` exception or the `external-library edge case`, the task summary must say:

- which exception was used
- why it qualified
- why TypeScript conversion was deferred

## Preferred Migration Order

When a JavaScript file must be converted, prefer this order:

1. `lib/`
2. `hooks/`
3. `api/`
4. reusable `components/`
5. route hosts and route entry files last

This order pushes the repo toward TypeScript while reducing behavior risk during conversion.
