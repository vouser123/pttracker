# PT Tracker Agent Playbook

Use this doc when `AGENTS.md` points you here for workflow detail. `AGENTS.md` remains the policy surface; this file holds the longer operational guidance that is only needed when applicable.

Use [`README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/README.md) for the live codebase map.
Use [`docs/README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/README.md) to choose other repo docs.

## Session Start

Read the local memory files before work begins:

- Shared ops memory: `C:\Users\cindi\OneDrive\Documents\PT_Backup\agent_memory\MEMORY.md`
- Codex memory: `C:\Users\cindi\OneDrive\Documents\codex-memory\MEMORY.md`
- Claude memory: `C:\Users\cindi\OneDrive\Documents\claude-memory\MEMORY.md`

Then run:

```bash
bd prime
```

If guidance conflicts between memory files, prefer the file with the newer `LastWriteTime` and mention the conflict in a progress update.

## Pre-Coding Layer Check

Before writing code to an existing file, ask: `What layer does this belong in?`

| Layer | Only contains | Must not contain |
|-------|--------------|-----------------|
| `pages/` | Auth guard, route-level state, wiring hooks + components together | Feature UI, mutation logic, data transformation, form state, business logic |
| `components/` | JSX and presentation logic; all data arrives via props | API calls, business logic, calculations, hooks |
| `hooks/` | State + effects for one concern | JSX, API calls that do not belong to the hook's concern |
| `lib/` | Pure functions for one domain | React imports, hooks, side effects |

`Page = orchestrator` is a hard rule. File size does not create exceptions.

Before writing to a page file:

1. Identify what the code does.
2. If it is not pure wiring, stop.
3. Decide whether it belongs in a component, hook, or lib helper.
4. Create or extend that file first.
5. Then wire it into the page.

For broader structure rules, also open [`docs/NEXTJS_CODE_STRUCTURE.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/NEXTJS_CODE_STRUCTURE.md).

## Parity Workflow

Use parity checking when a migrated Next.js surface should match older behavior.

Recommended pattern:

1. Read the current Next.js file in this repo.
2. Read the corresponding legacy static source in the static repo or reference baseline.
3. Compare behavior, not just markup.
4. Record differences in Beads if they become real follow-up work.

Focus on:

- options and defaults
- field visibility rules
- tracker/program/PT-view behavior
- timer and interaction semantics
- mobile/iOS interaction differences

## Agent Ops Friction Logging

Use Beads epic `pt-uf1` for execution friction that affects throughput.

Create child issues for concrete incidents:

```bash
bd create "<title>" -t task -p 2 --deps discovered-from:pt-uf1 --description "<incident + impact + root cause + mitigation>" --json
```

Keep the epic open as the long-running signal. Close the child issue once the specific friction is addressed.

## Beads Detail

For exact lifecycle rules, open [`docs/BEADS_WORKFLOW.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/BEADS_WORKFLOW.md).

For detailed operations, Dolt sync, and recovery steps, open [`docs/BEADS_OPERATIONS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/BEADS_OPERATIONS.md).

Short version:

- claim the bead before doing real work
- create discovered work immediately with `discovered-from`
- close completed beads promptly
- stage and commit only files you changed

