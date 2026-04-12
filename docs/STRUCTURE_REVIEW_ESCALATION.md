# Structure Review Escalation

Use this doc when a structure-related hook fires for a specific file and the agent must pause implementation work for a focused structure review.

Use [`README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/README.md) for the live codebase map.
Use [`NEXTJS_CODE_STRUCTURE.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/NEXTJS_CODE_STRUCTURE.md) for the repo's layer and split rules.

## Purpose

This workflow exists to force a clean ownership review before more edits continue on the triggered file.

- The parent agent handles the trigger and the handoff.
- The bead stores the task record and operational context.
- The subagent reviews the file neutrally and writes findings back to the bead.

Keep the subagent prompt neutral. Trigger rationale belongs in the parent workflow and bead, not in the subagent prompt.

## Parent-Agent Rule

When a structure-related hook fires for a specific file, pause work on that file and escalate before making further edits.

Required workflow:

1. Create a bead for a structure review of the specific file.
2. Put the file path and any parent-agent operational notes in that bead.
3. Spawn a read-only subagent.
4. Direct the subagent to read only that bead for task context, then read the named repo docs in the delegated prompt.
5. Direct the subagent to write its findings back to that same bead.
6. Do not make any further changes to the target file, including comment-only edits, until the subagent review is complete.
7. Before resuming work, summarize the subagent's conclusions and state whether the file will be split, left intact, or escalated for a human decision.

The subagent prompt must remain neutral:

- no mention of hooks
- no mention of caps
- no mention of line count
- no mention of enforcement rationale

## One-Off Structure Bypass

A narrow approved bypass exists for true edge cases where the user has explicitly approved committing despite a structure-check failure.

Required env vars:

- `PT_STRUCTURE_BYPASS=1`
- `PT_STRUCTURE_BYPASS_APPROVED=1`
- `PT_STRUCTURE_BYPASS_REASON="..."`
- `PT_STRUCTURE_BYPASS_FILE=path/to/file.js`

Rules:

- The bypass applies to exactly one named checked file.
- The named file must be part of the staged commit or checked file set.
- The bypass does not disable structure checks for any other file.
- Use it only after consulting the user and receiving explicit approval.
- This bypass is for exceptional cases, not routine workflow.

## Bead Template

Title:
`Structure review: [FILE NAME]`

Description:
Review the structure and ownership boundaries of the target file and determine whether any responsibilities should be extracted or divided more cleanly.

Target file:

- `[FULL FILE PATH]`

Scope limit:

- This bead is the only task context for the reviewing subagent.
- Read only this bead for task context.
- Then read only the required repo docs named in the delegated prompt.
- Do not run `bd prime`.
- Do not search for other beads.
- Do not create another bead.
- Do not inspect unrelated sibling files or neighboring files unless the target file directly imports or depends on them and they must be checked to judge ownership.
- Do not widen scope beyond the target file, except to inspect directly related imports/exports needed to judge ownership.
- Write all findings and recommendations back to this bead.

Question to answer:

1. What responsibilities does the target file currently own?
2. Do any of those responsibilities belong in a different layer or separate file?
3. If so, what are the clearest extraction or division points?
4. If not, is the file structurally sound as-is?

Required output:

- responsibilities identified
- recommended extractions or divisions, if any
- what should remain in the original file
- keep-together notes, if any
- open questions, if any
- confidence for each recommendation: `high` / `medium` / `low`

## Neutral Subagent Prompt

```text
You are the delegated subagent for a read-only structure review in PT Tracker.

This is your assigned bead.
Read only this bead for task context.
Do not run `bd prime`.
Do not search for other beads.
Do not create another bead.
Write all findings back to this bead.

After reading the bead, read these repo docs:
- docs/README.md
- README.md
- docs/NEXTJS_CODE_STRUCTURE.md
- docs/SYSTEM_ARCHITECTURE.md
- docs/IMPLEMENTATION_PATTERNS.md
- docs/AGENT_PLAYBOOK.md
- .agents/skills/vercel-composition-patterns/AGENTS.md
- .agents/skills/vercel-react-best-practices/AGENTS.md

Do not read additional docs unless one of the listed docs directly points you there.

Task:
Review the target file named in the bead and determine whether any responsibilities should be extracted into separate files or divided more cleanly. Focus on architecture, layer ownership, cohesion, and future-agent maintainability. Do not implement changes.

Constraints:
- Read-only only: no file edits, no apply_patch, no git writes, no builds/tests, no browser work.
- Do not inspect unrelated sibling files, neighboring files, or parallel route files.
- Only inspect imports used by the target file and exports the target file consumes or provides when needed to judge ownership.
- If a boundary is unclear, report the ambiguity instead of inventing a new pattern.
- Judge the target file by ownership, cohesion, and layer boundaries only; do not infer goals beyond that review.
- Do not treat a broad umbrella label as proof of cohesion. Judge whether the file contains independently changeable concerns that future agents would benefit from editing separately.
- Do not propose a migration plan, sequencing plan, or implementation checklist unless a structural recommendation cannot be understood without naming the likely destination file.

Use these rules:
- Ask first: what layer does this belong in?
- `app/**/page.js` must stay thin.
- `*Page.js` files are orchestrators, not feature containers.
- Components are UI-only.
- Hooks own one concern: state/effects only, no JSX.
- Lib files are pure functions for one domain.
- Cohesion and ownership matter more than superficial file shape.
- Ask whether the responsibilities are independently changeable concerns, not just whether they can be described with one broad phrase.
- If the filename would need to change to describe the contents, the concern does not belong there.
- Treat the file header comment as a domain contract.
- Prefer existing shared patterns over inventing new structure.
- Watch for boolean-prop proliferation, inline child components, and combined hooks with unrelated dependencies as signs that extraction may be needed.

Write your results to the bead with:
- responsibilities identified
- recommended extractions or divisions, if any
- what should remain in the original file
- keep-together notes, if any
- open questions, if any

Output rules:
- Every recommendation must name the current responsibility and the likely destination file type.
- If no meaningful extraction is justified, say so plainly.
- If the file is structurally sound as-is, do not include extraction recommendations.
- Do not pad the response with generic cleanup advice.

Confidence standard:
- high: clear repo-rule support and a clear extraction boundary
- medium: likely extraction boundary, but some ambiguity remains
- low: ownership is unclear or the docs create tension
```
