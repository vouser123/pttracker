# Agent Instructions for PT Tracker

This file governs agent behavior for work in this repo.

## Canonical References

- `docs/README.md` - docs index; open this first to decide which repo doc is relevant
- `README.md` - live codebase map and file ownership
- `docs/AGENT_PLAYBOOK.md` - longer agent workflow detail; open only when the rule in AGENTS says it is applicable
- `docs/NEXTJS_CODE_STRUCTURE.md` - open when editing file placement, layering, or split boundaries
- `docs/RESPONSIBILITY_FIRST_PLACEMENT.md` - open when deciding whether an edit belongs in the current file or should move to a new/shared file
- `docs/STRUCTURE_REVIEW_ESCALATION.md` - open when a structure-related hook fires and the file must be handed to a read-only structure-review subagent
- `docs/IMPLEMENTATION_PATTERNS.md` - open when you need the approved shared pattern for a change
- `docs/SCRIPTS_GUIDE.md` - open when you need the current usage for local helper scripts such as analyzer helpers, commit preflight, or the required Supabase backup script
- `docs/VEXP_WORKFLOW.md` - open when you need the PT Tracker-specific `vexp` workflow, index fallback rules, manifest handling, or observation guidance
- `docs/DATA_VOCABULARIES.md` - open when you need canonical field names or controlled values
- `docs/TESTING_CHECKLISTS.md` - open when validating behavior changes
- `docs/BEADS_WORKFLOW.md` - open for the required bead lifecycle
- `docs/BEADS_OPERATIONS.md` - open only when detailed tracker/Dolt operations are needed
- `https://nextjs.org/docs` and `https://github.com/vercel/next.js` - open only when repo docs do not answer a framework-specific question

## Local Memory Files (Outside GitHub Repo)

These local files are operator memory for agents and are not committed to GitHub:

- `C:\Users\cindi\OneDrive\Documents\claude-memory\MEMORY.md`
- `C:\Users\cindi\OneDrive\Documents\codex-memory\MEMORY.md`
- `C:\Users\cindi\OneDrive\Documents\PT_Backup\agent_memory\MEMORY.md`

Session-start requirement:

- Read the shared file plus the actor-specific file before work begins.
- Run `bd prime` after reading local memory and again before compaction or handoff if context may be stale.
- Keep agent-private workflow notes in the local memory files, not in `bd remember`, unless the guidance is intentionally shared.
- Open [`docs/AGENT_PLAYBOOK.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/AGENT_PLAYBOOK.md) if you need the full session-start detail and exact file list.

## Pre-Coding Layer Check (Required Before Writing Any Code)

**Before writing any code to an existing file, ask: `What layer does this belong in?`**

- `pages/` are orchestrators only.
- If the code is not pure wiring, it does not belong in the page file.
- Do not use file size as permission to add the wrong kind of code to a file.
- Open [`docs/AGENT_PLAYBOOK.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/AGENT_PLAYBOOK.md), [`docs/NEXTJS_CODE_STRUCTURE.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/NEXTJS_CODE_STRUCTURE.md), and [`docs/RESPONSIBILITY_FIRST_PLACEMENT.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/RESPONSIBILITY_FIRST_PLACEMENT.md) if you need the full layer table, the responsibility-first placement test, or the split workflow.

**Before touching any existing file, ask two questions:**

1. Does this file already have one clear responsibility? If not, propose splitting it first — do not add to a mixed-concern file.
2. Does the change I am about to make belong in this file, or in a different file, or should it be a new file? A new concern being introduced is a signal that a new file may be needed, not that the existing file should grow.

Both questions apply independently. A well-structured file can still be the wrong place for a given edit. The structure hook is a safety net — it only catches files that exceed the line cap. A mixed-concern edit that stays under the limit will pass silently. Apply the standard before writing, not after preflight fails.

For the canonical wording of this rule, including the responsibility-first placement test and the reminder that file caps/hooks are coarse signals rather than the target, see [`docs/RESPONSIBILITY_FIRST_PLACEMENT.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/RESPONSIBILITY_FIRST_PLACEMENT.md).

## Structure Hook Escalation (Required)

If a structure-related hook fires for a specific file, pause work on that file and use the escalation workflow in [`docs/STRUCTURE_REVIEW_ESCALATION.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/STRUCTURE_REVIEW_ESCALATION.md).

- Create a bead for a structure review of the specific file.
- Hand the file to a read-only subagent using the neutral prompt in that doc.
- Direct the subagent to read only the assigned bead for task context, not `bd prime` or other beads.
- Do not continue editing the file, including comment-only edits, until the subagent review is complete.
- A one-off structure bypass exists only for explicit user-approved edge cases; use the exact env vars documented in `docs/STRUCTURE_REVIEW_ESCALATION.md`.

---

## Core Rules

- Use a docs-first workflow: check the canonical references before editing code.
- Review `README.md` at session start as the first-stop map for what currently exists in the old and new app structures.
- Use `README.md` as the practical guide for what shared files own, when to use them, where they fit in the stack, and where adjacent logic should not go.
- Treat the static legacy surface as frozen unless the work is user-approved or a security issue. Default all routine feature, cleanup, and pattern-alignment work to the Next.js surface.
- Do not invent new field names when existing vocabulary/schema terms are available.
- Prefer plain JavaScript and browser APIs unless explicitly instructed otherwise.
- Preserve offline/PWA behavior and iOS-safe interaction patterns (`pointerup`, touch-safe UI behavior).
- Respect Vercel/serverless limits: avoid endpoint sprawl and prefer extending existing handlers.
- **No hardcoded option lists without explicit sign-off.** Do not introduce or expand a hardcoded option list, enum, allowed-values array, or validation list without explicit user sign-off. Existing hardcoded values are not precedent. Before hardcoding, determine whether the values are behavior logic or domain data. Values that represent user/admin-managed domain data, vocab terms, reference data, or other extendable content must be loaded dynamically. Values that drive fixed application behavior may remain hardcoded only after explicit approval. When approval is given, add a short code comment at the hardcoded definition noting that it is intentionally hardcoded, why, and that future expansion also requires explicit sign-off. Example: `// Intentionally hardcoded behavior enum; approved by user on 2026-03-19. // Do not extend without explicit sign-off. These values drive timer behavior.`

## Operator Support Contract (Required)

This project is operated by a non-technical user. Agents must not assume technical fluency.

- You must use neutral and inclusive language and terminology. You must not use ableist or stigmatizing terms or phrases that invoke mental health conditions to convey wrongness, correctness, quality, or error states. Use neutral alternatives such as `confidence check`, `coherence check`, `validation`, `verification`, and `review pass` instead of phrases like `sanity check` or `sanity pass`. These examples are illustrative, not exhaustive.
- You must not reveal passwords, tokens, API keys, session secrets, recovery codes, or other credential values in chat, notes, commit messages, screenshots, logs, or narrated tool steps. If a credential is authorized for use, refer to it only generically, such as `entered the stored password`.
- Default to plain-language explanations first. Define jargon the first time it appears.
- Always include a one-line "What this means for you" summary for technical findings.
- Do not wait for the user to specify implementation details. Propose the recommended next step and proceed unless a real product decision is required.
- Ask clarifying questions only when ambiguity changes behavior, data safety, or UX semantics.
- When asking for user input, state exactly what decision is needed and provide a recommended option.
- Surface risk proactively (security, data loss, UX drift, deployment impact) without waiting for the user to ask.
- MUST NOT suggest, run, or ask the operator to run `netsh winsock reset`, network adapter resets, DNS resets, or similar Windows network-stack reset commands. These commands previously caused severe connectivity loss on this machine. Treat them as explicitly forbidden unless the operator overrides this rule in writing for a specific recovery session.
- If a change can alter UX behavior, call it out explicitly before merge and obtain approval.
- For every completed task, provide: what changed, how to verify, known gaps, and rollback path.
- Never use dismissive phrasing or imply user error due to missing technical background.

## Decision Default (When User Is Unsure)

- Agents own technical steering by default.
- If the user says they are unsure, agents must choose the safest reasonable path, explain it briefly, and continue.
- If multiple valid paths exist, pick one recommendation and state why it is preferred now.

## iOS PWA Interaction Rules

- Preserve iOS-safe interaction patterns.
- Use `docs/IMPLEMENTATION_PATTERNS.md` for the detailed touch and interaction rules instead of duplicating them here.

## Active Tracker Policy (Required)

- Use Beads for active work tracking in this repo, including intake, execution, handoff, and closure.
- Open a bead before beginning work. Update to in-progress while working. Close your bead(s) before you commit.
- If working with > 50 lines of code or > 2 files, use a parent and child beads.

## Validation Preference

- Vercel deployment checks/logs are the default validation path for routine changes. Use Vercel first.
- After push, wait an appropriate amount of time for the deployment to start or finish before checking status again. Prefer a short deliberate pause over immediate repeat polling or falling back to a local build too early.
- Do not run local `npm run build` by default when a Vercel deploy will provide the same signal.
- Run local `npm run build` only when there is a specific documented reason it adds value beyond Vercel, such as:
  - Vercel signal is unavailable or insufficient
  - debugging a local or environment-specific issue that cannot be resolved from Vercel output
  - a particularly risky refactor where an immediate pre-push build materially reduces rollback risk
- If you choose a local build, state the specific reason in a short progress update or bead note.


## Testing Checklists

See [`docs/TESTING_CHECKLISTS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/TESTING_CHECKLISTS.md) for all regression and parity testing checklists, including the Activity Log Testing Checklist (exercise types, set variables, side variables, log paths, idempotency, DB verification query).

## Change Hygiene

- Keep instructions concise and avoid duplicating detailed architecture from docs.
- Update `README.md` in the same change whenever you create, remove, rename, repurpose, or materially change a file in a way that another agent would need to know to find it, understand what it owns, or wire it in correctly.
- Update `docs/IMPLEMENTATION_PATTERNS.md` in the same change whenever you add, replace, or retire an approved shared helper/component/pattern, or whenever a do-this-not-that implementation rule changes.
- When a legacy HTML page is replaced, retired, redirected, or re-mapped, update the page mapping in `README.md` in the same change.
- Update `README.md` in the same change whenever a behavior change alters how a file should be used, what layer owns a concern, or which file another agent should touch for future work.
- Do not bypass the README pre-commit guard unless the staged changes leave `README.md` fully accurate as written.
- If guidance conflicts within this repo, `AGENTS.md` is the operational source of truth.

## Commit Preflight

Before retrying a failed commit, run:

`npm run commit:preflight -- --message "Your title (pt-xxxx)" --trailer "Co-Authored-By: Agent Name <recognized-agent-email>"`

Use at least one Beads ID in the commit title. Recognized agent emails for the trailer are `codex@openai.com` and `noreply@anthropic.com`. If no agent attribution should be recorded for that commit, use the one-time `PT_AI_TRAILER_OK` override instead.

## Beads Agent Discipline (Required)

**Before doing any work — before reading a file, before writing code, before running a verification — you must claim the bead and set it to `in_progress`. This is not optional.**

```bash
bd update <id> --claim --status in_progress
```

An unclaimed bead looks untouched to the next agent. That agent will repeat your work. Claiming is the only signal that the bead was touched.

**The three failures that cause work to be repeated (read these):**
1. **Starting without claiming** → bead looks untouched → next agent repeats it. Claim first, always.
2. **Noting discoveries in conversation only** → lost on compaction → rediscovered and repeated. Use `bd create --discovered-from <id>` immediately, not later.
3. **Leaving a passing verification-focused task open** → re-run by next agent. Close it in the same pass it passes.

Full rules: `docs/BEADS_WORKFLOW.md`.

- Keep `AGENTS.md` as the policy surface; open [`docs/BEADS_WORKFLOW.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/BEADS_WORKFLOW.md) for lifecycle rules and [`docs/BEADS_OPERATIONS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/BEADS_OPERATIONS.md) for detailed operations.
- Do not use `bd edit` from agent sessions; use `bd update` flags instead.
- Shared-branch rule: stage and commit only files you changed, and re-check `git status --short` before every `git add` or commit.
- Update or close Beads items before commit, and do not leave local-only state at session end.
- Open [`docs/AGENT_PLAYBOOK.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/AGENT_PLAYBOOK.md) if you need the longer Beads detail or friction-logging pattern.

Reference docs (local mirror for agents):
- `C:\Users\cindi\OneDrive\Documents\PT_Backup\beads\AGENT_INSTRUCTIONS.md`
- `C:\Users\cindi\OneDrive\Documents\PT_Backup\beads\docs\FAQ.md`
- `C:\Users\cindi\OneDrive\Documents\PT_Backup\beads\docs\TROUBLESHOOTING.md`
- `C:\Users\cindi\OneDrive\Documents\PT_Backup\beads\docs\PLUGIN.md`

<!-- BEGIN BEADS INTEGRATION v:1 profile:full hash:f65d5d33 -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Dolt-powered version control with native sync
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update <id> --claim --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Quality
- Use `--acceptance` and `--design` fields when creating issues
- Use `--validate` to check description completeness

### Lifecycle
- `bd defer <id>` / `bd supersede <id>` for issue management
- `bd stale` / `bd orphans` / `bd lint` for hygiene
- `bd human <id>` to flag for human decisions
- `bd formula list` / `bd mol pour <name>` for structured workflows

### Auto-Sync

bd automatically syncs via Dolt:

- Each write auto-commits to Dolt history
- Use `bd dolt push`/`bd dolt pull` for remote sync
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- END BEADS INTEGRATION -->


## vexp <!-- vexp v2.0.12 -->

**MANDATORY: use `run_pipeline` — do NOT grep or glob the codebase.**
vexp returns pre-indexed, graph-ranked context in a single call.

### Workflow
1. `run_pipeline` with your task description — ALWAYS FIRST (replaces all other tools)
2. Make targeted changes based on the context returned
3. `run_pipeline` again only if you need more context

### Available MCP tools
- `run_pipeline` — **PRIMARY TOOL**. Runs capsule + impact + memory in 1 call.
  Auto-detects intent. Includes file content. Example: `run_pipeline({ "task": "fix auth bug" })`
- `get_context_capsule` — lightweight, for simple questions only
- `get_impact_graph` — impact analysis of a specific symbol
- `search_logic_flow` — execution paths between functions
- `get_skeleton` — compact file structure
- `index_status` — indexing status
- `workspace_setup` — bootstrap config
- `get_session_context` — recall observations from sessions
- `search_memory` — cross-session search
- `save_observation` — persist insights (prefer run_pipeline's observation param)
- `expand_vexp_ref` — expand V-REF placeholders in v2 output

### Agentic search
- Do NOT use built-in file search, grep, or codebase indexing — always call `run_pipeline` first
- If you spawn sub-agents or background tasks, pass them the context from `run_pipeline`
  rather than letting them search the codebase independently

### Smart Features
Intent auto-detection, hybrid ranking, session memory, auto-expanding budget.

### Multi-Repo
`run_pipeline` auto-queries all indexed repos. Use `repos: ["alias"]` to scope. Run `index_status` to see aliases.
<!-- /vexp -->
