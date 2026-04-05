# Beads Molecules And Formulas

Use this document when an agent needs to choose or run a Beads workflow template in this repo.

Use [`BEADS_OPERATIONS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/BEADS_OPERATIONS.md) for tracker operating rules.
Use this document for:
- repo guidance for molecules, protos, and wisps plus the local formula inventory
- phase selection rules for `pour`, `wisp`, `squash`, and `burn`
- the current repo formula inventory
- agent-facing command patterns that are not obvious from `bd formula list`

Upstream detail pointers:
- [`C:\Users\cindi\OneDrive\Documents\PT_Backup\beads\docs\MOLECULES.md`](C:/Users/cindi/OneDrive/Documents/PT_Backup/beads/docs/MOLECULES.md)
- [`C:\Users\cindi\OneDrive\Documents\PT_Backup\beads\docs\CLI_REFERENCE.md`](C:/Users/cindi/OneDrive/Documents/PT_Backup/beads/docs/CLI_REFERENCE.md)

## Agent Rules

- Use a persistent molecule when the workflow run itself should stay in the tracker for coordination, handoff, or audit.
- Use a wisp when the workflow run is temporary operational scaffolding and only the final result should land on the target bead.
- Keep temporary investigation output in the workflow run first. Do not write it onto the target bead until the final decision is clear.
- After a wisp finishes, strongly prefer `squash` so the run leaves a compact durable digest. Use `burn` only with user permission, and only when the wisp produced no useful durable signal and even a digest would add noise.
- Do not introduce new routine molecule, bond, or wisp patterns without updating this document and [`BEADS_OPERATIONS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/BEADS_OPERATIONS.md).
- For cleanup truth-check work, a durable parent run is fine when the cleanup graph is useful to keep visible. Keep the bonded per-bead arms ephemeral and clean up the run after the important evidence has been copied onto the target beads.

## Terms

- `formula`: source template in [`.beads/formulas/`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/.beads/formulas)
- `proto`: Beads-compiled template that can be instantiated; agents usually do not need to manage this directly
- `molecule` / `mol`: persistent workflow run kept in the tracker
- `wisp`: ephemeral workflow run used for temporary operations

## Molecular Chemistry

### Phase Table

| Phase | Name | Agent meaning | Typical command |
|-------|------|---------------|-----------------|
| authoring | `formula` | reusable source template | `bd formula list` / `bd formula show <name>` |
| solid | `proto` | compiled template ready for instantiation | usually reached through formula commands |
| liquid | `molecule` | durable workflow run kept in the tracker | `bd mol pour <name> --var key=value` |
| vapor | `wisp` | ephemeral workflow run for temporary operations | `bd mol wisp <name> --var key=value` |

### Command Surface

```bash
# Inspect templates
bd formula list
bd formula show <formula-name>

# Instantiate a durable workflow run
bd mol pour <formula-name> --var key=value

# Instantiate a temporary workflow run
bd mol wisp <formula-name> --var key=value

# Inspect or clean up wisps
bd mol wisp list
bd mol wisp gc --dry-run
bd mol wisp gc

# Preserve or discard temporary runs
bd mol squash <workflow-id>
bd mol burn <workflow-id>

# Advanced graph operations
bd mol bond A B
bd mol distill <epic-id>
```

### Phase Selection

Use `pour` when:
- the workflow run itself needs durable history
- another agent may need to traverse or inherit the workflow
- the run belongs visibly under an epic such as `pt-fegm`

Use `wisp` when:
- the workflow run is temporary scaffolding for another bead
- the output is evidence or a recommendation, not the tracked work itself
- leaving the workflow behind would add noise
- the formula is marked `phase = "vapor"` and Beads should warn if someone tries to pour it by default

Use `squash` when:
- a wisp produced findings worth keeping as a durable digest
- the full temporary graph is no longer needed

Use `burn` when:
- the user has explicitly approved discarding the run
- a wisp did its job and the target bead now carries the final outcome
- the temporary run has no additional coordination value
- even a compact digest would add more noise than value

### Default Cleanup Pattern

For ambiguous cleanup review:
1. inspect the formula with `bd formula show mol-open-bead-truth-pass`
2. run `bd mol pour ...` when the parent cleanup pass should stay visible in the tracker
3. bond per-bead arms with `--ephemeral` so the arms stay temporary even under a durable parent
4. gather current-state evidence inside the workflow run first
5. copy the important evidence onto any target bead that stays open or closes
6. update, close, keep, or elevate the target bead based on that result
7. strongly prefer `squash`; use `burn` only with user permission when the run has no useful durable signal

## Repo Policy

Current repo policy:
- persistent molecules are preferred for durable tracked work
- wisps are allowed for bounded operational work such as truth-check, cleanup scouting, and short-lived investigation
- wisps are not the default path for implementation tracking, parent-child coordination, or long-lived audit history
- bonding, distillation, and other compound chemistry features are advanced tools, not default workflow

Why this policy exists:
- the tracker already has enough surface area without leaving temporary investigation graphs behind
- durable workflows are useful when the workflow run itself matters
- temporary workflows are useful when the result matters more than the run

## Agent Workflow

Typical agent flow:
1. run `bd formula list`
2. inspect the candidate template with `bd formula show <name>`
3. choose `pour` or `wisp`
4. run the workflow
5. close or update the real target bead through the normal Beads lifecycle
6. if the run was a wisp, strongly prefer `squash`; use `burn` only with user permission when even a digest would add noise

Selection rules:
- use `mol-standard-task` for ordinary implementation, investigation, verification, or tracker work
- use `mol-stale-cleanup-two-pass` for planned backlog cleanup runs
- use `mol-open-bead-truth-pass` for a batch review of remaining open or in-progress beads that need current-state verification
- use `mol-bead-truth-check` only as the thin bonded arm for that cleanup pass, not as a separate durable planning workflow
- if no documented formula fits cleanly, use normal bead workflow

Normal bead hygiene still applies:
- claim active work
- close finished work manually
- keep discovered follow-up work linked correctly
- avoid overlapping active file ownership across agents

## Current Formulas

### `mol-standard-task`

- File: [`.beads/formulas/mol-standard-task.formula.toml`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/.beads/formulas/mol-standard-task.formula.toml)
- Purpose: default operational workflow for ordinary task execution in this repo
- Use when: the work is not a specialized cleanup pass and needs structure from scope through closeout
- Output shape: one persistent workflow with ordered steps for scope -> shape -> execute -> verify -> record -> close or escalate

Variables:
- `work_label`
  Default: `current task`
  Meaning: short description of the work
- `parent_bead`
  Default: empty
  Meaning: existing parent or container bead when the work already belongs under one
- `verification_mode`
  Default: `repo-appropriate verification`
  Meaning: reminder for the expected validation path
- `multi_agent_note`
  Default: `If another agent is involved, record explicit file or responsibility boundaries before implementation continues.`
  Meaning: ownership reminder
- `docs_note`
  Default: `Update README and related docs when file ownership, workflow, or reusable patterns materially change.`
  Meaning: documentation maintenance reminder

Workflow steps:
1. confirm scope
2. shape work
3. do work
4. verify work
5. update record
6. close or escalate

Usage notes:
- this is the default formula for most non-cleanup work in PT Tracker
- it is appropriate for code work and tracker-only work
- use it when the workflow run itself should remain visible in the tracker

Example commands:

```bash
bd formula show mol-standard-task
bd mol pour mol-standard-task --var work_label="fix tracker history filter"
bd mol pour mol-standard-task --var work_label="verify preview regression" --var verification_mode="preview verification"
```

### `mol-stale-cleanup-two-pass`

- File: [`.beads/formulas/mol-stale-cleanup-two-pass.formula.toml`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/.beads/formulas/mol-stale-cleanup-two-pass.formula.toml)
- Purpose: reusable two-pass backlog cleanup workflow for stale, obsolete, duplicate, or unclear beads
- Use when: the agent is running a planned cleanup pass and wants a durable cleanup container
- Output shape: one persistent cleanup workflow with ordered steps for prepare -> pass 1 -> pass 2 -> closeout

Variables:
- `cleanup_container`
  Default: `pt-fegm`
  Meaning: parent cleanup bead that should own the cleanup run
- `scope_label`
  Default: `open non-epic beads`
  Meaning: backlog slice being reviewed
- `pass1_rule`
  Default: `Flag only. Do not close beads in pass 1 except obvious accidental duplicates if explicitly allowed.`
  Meaning: reminder to keep flagging separate from disposition
- `escalation_rule`
  Default: `Elevate mid-confidence or product/process-sensitive items to the user.`
  Meaning: reminder for when the workflow must stop for user input

Workflow steps:
1. prepare scope
2. pass 1 scan
3. pass 1 flag
4. pass 1 batch
5. pass 2 high-confidence determinations
6. pass 2 elevation
7. pass 2 closeout

Usage notes:
- this formula is for durable cleanup runs, not temporary patrols
- keep pass 1 flag-only
- use this when the cleanup run itself should remain visible under a container bead

Example commands:

```bash
bd formula show mol-stale-cleanup-two-pass
bd mol pour mol-stale-cleanup-two-pass --var scope_label="open non-epic beads"
bd mol pour mol-stale-cleanup-two-pass --var cleanup_container=pt-fegm --var scope_label="open epics"
```

### `mol-bead-truth-check`

- File: [`.beads/formulas/mol-bead-truth-check.formula.toml`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/.beads/formulas/mol-bead-truth-check.formula.toml)
- Purpose: per-bead truth-check arm for one ambiguous open or in-progress bead
- Use when: a cleanup truth-pass dynamically bonds one arm per bead that needs evidence-backed current-state verification
- Output shape: one vapor workflow with ordered steps for confirm -> inspect -> record -> recommend

Variables:
- `target_bead`
  Default: empty
  Meaning: bead id under investigation
- `target_title`
  Default: `ambiguous cleanup bead`
  Meaning: short scope reminder for the target bead
- `evidence_scope`
  Default: `current code, docs, related beads, and current repo shape`
  Meaning: current-state evidence to inspect
- `candidate_reason`
  Default: `remaining open work requires current-state verification`
  Meaning: why the bead was selected for truth-check
- `current_status`
  Default: `open`
  Meaning: current status at the start of the run
- `current_parent`
  Default: empty
  Meaning: current parent bead if one exists
- `current_assignee`
  Default: empty
  Meaning: current assignee if one exists

Workflow steps:
1. confirm target
2. inspect current state
3. record finding
4. recommend next action

Usage notes:
- keep temporary investigation output in the workflow run first
- use this as a vapor arm under `mol-open-bead-truth-pass`
- use explicit per-arm variables so the run does not have to infer bead context
- when the parent pass is durable, bond this arm with `--ephemeral` so the arm stays temporary
- after the result is clear, update the target bead through the normal tracker flow and then squash or otherwise clean up the parent cleanup run

Example commands:

```bash
bd formula show mol-bead-truth-check
bd mol bond mol-bead-truth-check <survey-step-id> --ref arm-{{target_bead}} --var target_bead=pt-hp8 --var target_title="DN-065 zoom-lock and NavMenu parity truth-check" --var candidate_reason="open bead with unresolved current truth" --var current_status=open --ephemeral
```

### `mol-open-bead-truth-pass`

- File: [`.beads/formulas/mol-open-bead-truth-pass.formula.toml`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/.beads/formulas/mol-open-bead-truth-pass.formula.toml)
- Purpose: batch cleanup pass for remaining open or in-progress beads whose current truth still needs investigation
- Use when: the cleanup gap is not one ambiguous bead but a set of still-open beads that need evidence-backed review
- Output shape: one durable workflow with ordered steps for preflight -> survey -> select -> fanout -> aggregate

Variables:
- `scope_label`
  Default: `remaining open and in_progress beads`
  Meaning: the current backlog slice under review
- `selection_rule`
  Default: `spawn an arm for each bead whose current truth cannot be established from the existing tracker state alone`
  Meaning: rule for which beads should get a per-bead arm
- `aggregate_goal`
  Default: `a batch of evidence-backed recommendations for keep_open, close_completed, close_obsolete, or elevate`
  Meaning: required output from the aggregate step

Workflow steps:
1. preflight cleanup
2. survey open scope
3. identify candidates
4. fan out one per-bead truth-check arm per candidate
5. aggregate findings

Usage notes:
- use this as a durable parent run when the cleanup graph is useful to keep visible
- the fanout step should dynamically bond one `mol-bead-truth-check` arm per bead with explicit variables
- bonded arms should normally be ephemeral and readable via `--ref arm-{{target_bead}}`
- the aggregate step should collect evidence-backed recommendations, not close beads directly
- after the important evidence is copied to the target beads, squash the parent run rather than leaving the cleanup scaffolding open

Example commands:

```bash
bd formula show mol-open-bead-truth-pass
bd mol pour mol-open-bead-truth-pass --var scope_label="remaining open and in_progress beads"
```

## Advanced Features

Use these only when a repeated workflow need clearly justifies them:

- `bonding`
  Connect workflow graphs with `bd mol bond A B`
- `attach-on-pour`
  Add additional workflow templates when instantiating a persistent run
- `expansion formulas`
  Reuse a step bundle inside another formula
- `aspects`
  Apply a cross-cutting workflow addition around matching steps
- `conditional steps`
  Include steps only when formula variables require them
- `gates and waits`
  Rejoin fanout work or wait on multiple predecessors

Adoption order in this repo:
1. simple formulas
2. conditional steps
3. expansion formulas
4. bonding or attach-on-pour
5. aspects

## Maintenance Rules

Update this document in the same change when:
- a formula is added, removed, renamed, or materially repurposed
- a formula's variables change in a way that affects agent instantiation
- repo policy changes for persistent molecules, protos, or wisps
- advanced chemistry features become normal repo workflow instead of exceptional tools

When maintaining formulas:
- keep the source file in [`.beads/formulas/`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/.beads/formulas)
- validate discovery with `bd formula list`
- inspect the full template with `bd formula show <name>`
- update the formula inventory here with the agent-facing usage notes that `bd formula list` does not show

## Current State

As of this update, this repo has:
- 4 project formulas
- documented bounded wisp usage for temporary operational investigation
- no requirement for agents to understand proto internals beyond knowing that formulas compile into pourable templates
