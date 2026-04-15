# PT Tracker vexp Workflow

Use this doc for repo-specific `vexp` workflow guidance that goes beyond the short policy block in [`AGENTS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/AGENTS.md).

Use [`../README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/README.md) for the live codebase map.
Use [`README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/README.md) to decide when to open this doc.

## Why This Doc Exists

PT Tracker pays real cost when agents skip `vexp`.

- `vexp` reduces token use enough to keep long tasks in one conversation longer.
- Lower token use reduces pressure toward compaction and repeated repo exploration.
- `vexp` observations help Claude, Codex, and other supported agents reuse context instead of rediscovering the same structure.

Treat `vexp` as both a token-saving tool and a cross-agent context layer.

## Beads Versus vexp

Beads and `vexp` are both required in PT Tracker, but they do different jobs.

- Beads track active work:
  - what task is being worked
  - who touched it
  - whether it is still in progress, blocked, or done
  - what follow-up work was discovered
- `vexp` provides code context and memory:
  - what code is relevant
  - what dependencies or blast radius matter
  - what observations may help future sessions or other agents

Do not substitute one for the other.

Hard rules:

- `vexp` observations do not replace Beads state updates
- `vexp` observations do not replace `--discovered-from` beads for new work
- `vexp` observations do not replace repo documentation
- Beads do not replace saved technical observations when the insight should survive compaction

Practical rule:

- use Beads for workflow truth
- use `vexp` for code-context truth and reusable technical memory
- use repo docs for canonical project guidance

## Session Behavior

- Each MCP connection gets its own `vexp` session ID.
- `vexp` auto-creates the session on first request and detects the agent from environment cues when possible.
- Sessions inactive for more than about 2 hours are compressed into a structural summary.
- During compression, ephemeral `tool_call` observations are removed, while durable observations such as `insight`, `decision`, `error`, and `manual` are preserved.

Practical takeaway:

- important findings should not live only in chat text
- if a finding matters after compaction, save it

## Default Workflow

1. Run `run_pipeline` first for every codebase task.
2. Make the smallest targeted follow-up call that answers the next question.
3. Read raw file text only when the `vexp` output is still not enough to place an exact patch safely.

Use this decision order:

- `run_pipeline`
  - Start here for any code task, bug, refactor, review, or ownership question.
  - It combines context search, impact analysis, and memory recall in one call.
  - Prefer the `observation` parameter when the same step produced a durable finding worth saving.
- `get_skeleton`
  - Use before opening full files when you need file structure, signatures, or a narrower read.
- `get_impact_graph`
  - Use before shared-logic edits, refactors, or reviews where blast radius matters.
- `search_logic_flow`
  - Use for targeted execution-path questions such as "how does A reach B?" or "what path gets this value here?"
  - Important when needed, but not a routine first or second call on most PT Tracker tasks.
- `get_context_capsule`
  - Use for lightweight follow-up context when `run_pipeline` would be excessive.
  - It returns pivot files in full and supporting files as skeletons, and may include relevant memories from previous sessions.
- `get_session_context`
  - Use to review chronological observations from the current session and, when needed, previous sessions. Expect stale flags when linked code has changed.
- `search_memory`
  - Use for cross-session lookup when you have a natural-language question and want relevance plus an explanation of why a result surfaced.
- `save_observation`
  - Use when a finding should survive session compression and is not already being saved through `run_pipeline`.

## Raw Read Fallback Rule

Raw file reads are allowed only after `vexp` has already been tried for that step.

Typical valid reasons:

- exact patch placement still depends on current literal text
- formatting-sensitive edits need precise surrounding lines
- the file is outside the indexed code graph and the task still needs it

Invalid reason:

- "opening the file is faster"

## Index And Coverage Rules

Use `index_status` when a `vexp` result suggests missing coverage.

Recommended fallback order:

1. `run_pipeline`
2. `get_skeleton` or another narrow follow-up
3. `index_status` if the needed file or symbol is still missing
4. raw file read only for the exact gap you still need

Important repo-specific note:

- Empty `get_skeleton` results can mean "file not indexed yet" or "file not in indexed scope." The tool may explicitly tell you to run `index_status`.

## What PT Tracker Currently Sees Indexed

For PT Tracker, `vexp` is primarily indexing product source files and related executable code:

- `app/`
- `components/`
- `hooks/`
- `lib/`
- `scripts/`
- `db/`
- test files

In current repo behavior, many non-code or support files are not part of the graph index:

- most `docs/*.md`
- most `openspec/**/*.md`
- CSS files
- many JSON files
- hidden agent-support folders such as `.agents/**` and `.claude/**`

Do not assume "not indexed" means "broken." In this repo it usually means "outside the indexed source-code scope" or "filtered for safety."

## Manifest And Git Rules

`vexp` uses:

- `.vexp/index.db` as local index state
- `.vexp/manifest.json` as the git-tracked structural state

PT Tracker rule:

- if [manifest.json](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/.vexp/manifest.json) is present, commit it with the related change

Related repo files:

- [manifest.json](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/.vexp/manifest.json)
- [.gitattributes](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/.vexp/.gitattributes)
- [.gitignore](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/.vexp/.gitignore)

Do not commit:

- `.vexp/index.db`
- daemon files
- exported token-savings reports unless the user explicitly wants them tracked

## Observations

Use observations for durable findings that would otherwise be lost after compaction.

Important behavior:

- `vexp` gently nudges agents to save important observations.
- The nudge intensity drops over time: a fuller explanation early in the session, then a brief reminder every few calls.
- The nudge self-disables after the agent cooperates and saves at least one observation in the session.

Tool choice:

- `get_session_context`
  - Best for "what has already been explored or decided in this session or recent sessions?"
- `search_memory`
  - Best for "have we already learned something related to this topic?" Use when the question is thematic rather than chronological.
- `save_observation`
  - Best for durable insights, decisions, or errors that should persist across sessions.

Staleness behavior:

- observations linked to code symbols are automatically marked stale when those symbols change during incremental sync
- stale observations are penalized in search ranking, not deleted
- stale does not automatically mean wrong; it means "re-check before relying on this"

Consolidation behavior:

- similar auto-observations may be merged automatically to reduce repeated noise
- manually saved observations are not auto-merged away

Good candidates:

- ownership decisions
- blast-radius findings
- structure-review outcomes
- cross-agent workflow findings
- "this file owns X, not Y" guidance

Prefer `run_pipeline(... observation: "...")` when the observation comes directly from the same step, because it avoids an extra tool call.

When you need a separate saved observation:

- keep it concise
- use the right type: `insight`, `decision`, `error`, or `manual`
- link symbols by FQN when available so stale flags work correctly after code changes

Progressive disclosure:

- observation detail is intentionally compressed based on context
- short headline form is used for auto-injected memories
- standard detail is used for normal session and memory lookups
- fuller detail appears when result counts are small enough to justify it

## Project Rules

`vexp` can promote recurring observed patterns into project-rule candidates.

Repo takeaway:

- repeated workflow patterns may eventually surface as guidance without manual rule-writing
- these rules depend on recurring observations in the same scope
- if you want `vexp` to learn a durable repo convention, consistently saving important decisions helps

Do not rely on project rules as the only source of truth for PT Tracker conventions.
Repo docs such as [`AGENTS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/AGENTS.md), [`README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/README.md), and [`IMPLEMENTATION_PATTERNS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/IMPLEMENTATION_PATTERNS.md) still remain canonical.

## Tool Notes

- `run_pipeline`
  - Primary tool. It auto-detects intent (`debug`, `modify`, `refactor`, `explore`) from the task description and returns compressed results within a token budget.
- `get_context_capsule`
  - Specialized follow-up tool. Use it when you need relevant code without the full pipeline.
- `get_impact_graph`
  - Best before refactoring exported functions, shared helpers, or public API surfaces.
- `search_logic_flow`
  - Best for path tracing between two known symbols. Underused in current PT Tracker sessions, but still the right tool for flow questions.
- `get_skeleton`
  - Preferred file-inspection tool before raw reads. Supports `minimal`, `standard`, and `detailed` views.
  - `detailed` level returns full bodies for short functions and truncated bodies with line counts for long ones. This is usually enough to confirm a gap or place a patch without opening the file.
- `expand_vexp_ref`
  - Use to drill into a specific `[V-REF:xxxx]` hash returned by `run_pipeline` or other tools.
  - This is the surgical alternative to a raw `Read` when you need one specific block from a large file.
  - Prefer it over `Read` whenever a V-REF is available in the results.
- `save_observation`
  - Use the right type — it affects survival through session compression:
    - `insight` — architectural or behavioral findings worth preserving across sessions
    - `decision` — a deliberate choice made about implementation or design
    - `error` — a confirmed bug, root cause, or failure pattern
    - `manual` — anything that doesn't fit the above but should persist
  - `tool_call` observations are ephemeral and pruned on compression; the above types are not.
  - Link symbols by FQN when available so staleness tracking works after code changes.

## Token Budget and Compaction

vexp costs roughly what Claude costs per month. It pays for itself only when agents actually use it.

Every grep or raw read instead of a vexp call wastes two budgets simultaneously — Claude tokens and vexp trial usage — without delivering the savings vexp is designed to provide.

Compaction mid-task is expensive beyond the token cost: context is lost, the next conversation has to rebuild it, and the total session cost rises. Using vexp aggressively keeps conversations alive longer and makes it possible to complete multi-file tasks in a single session.

Practical rule: treat the context window as a shared resource. Every unnecessary token call shortens the window for everyone in the session.

## Local CLI Notes

The MCP tools are still the primary agent interface.

Safe local CLI checks are useful for troubleshooting:

- `vexp savings`
- `vexp index --status`
- `vexp daemon-cmd status`
- `vexp hooks check`

Use CLI status commands for operator-style checks, not as a replacement for MCP workflow.

## Rebuild Guidance

The user has approved index rebuilds when needed.

Use a rebuild only when there is a real coverage or freshness problem, for example:

- `index_status` shows stale or unhealthy state
- branch or merge transitions left the index out of sync
- the same expected source file repeatedly fails to appear after normal sync/finalize behavior

Do not rebuild just because a doc, CSS file, JSON file, or hidden agent-support file is missing from the index.
