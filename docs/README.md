# PT Rebuild Docs

Use this file as the AI-agent docs index for this repo.

Like the rest of this repo, these docs are created for AI-agent workflow and repo operations, not as human-facing product documentation.

Use [`../README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/README.md) for the live codebase map.
Use this file to decide which doc to open next.

## Active Docs

- [`AGENT_PLAYBOOK.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/AGENT_PLAYBOOK.md)
  - Open when: `AGENTS.md` points you here for session-start detail, layer-check detail, parity workflow, or agent-ops friction logging.
  - Answers: "What is the longer workflow guidance behind the short AGENTS rule?"
- [`NEXTJS_MIGRATION_STATUS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/NEXTJS_MIGRATION_STATUS.md)
  - Open when: you need migration phase status, rollout history, or branch/cutover decisions.
  - Answers: "Where are we in the Next.js migration?"
- [`NEXTJS_CODE_STRUCTURE.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/NEXTJS_CODE_STRUCTURE.md)
  - Open when: you are adding, splitting, or reorganizing Next.js files.
  - Answers: "How should Next.js code be structured?" and "What does the framework enforce versus what still needs repo rules?"
- [`RESPONSIBILITY_FIRST_PLACEMENT.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/RESPONSIBILITY_FIRST_PLACEMENT.md)
  - Open when: you need the fast pre-edit ownership test for deciding whether a change belongs in the current file, a new file, or a shared file.
  - Answers: "Is this the right owner for this change?" and "Why are file caps and hooks only coarse signals?"
- [`STRUCTURE_REVIEW_ESCALATION.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/STRUCTURE_REVIEW_ESCALATION.md)
  - Open when: a structure-related hook fires and the file must be handed to a read-only structure-review subagent.
  - Answers: "How do I escalate a structure review cleanly without contaminating the subagent prompt?" and "What is the narrow one-off structure bypass pattern?"
- [`SYSTEM_ARCHITECTURE.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/SYSTEM_ARCHITECTURE.md)
  - Open when: you need the current hybrid architecture, data flow, offline/storage model, or deployment guardrails.
  - Answers: "How does the live system fit together?"
- [`IMPLEMENTATION_PATTERNS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/IMPLEMENTATION_PATTERNS.md)
  - Open when: you need the approved shared helper, component, or do-this-not-that implementation pattern.
  - Answers: "Which shared thing should I use here?" including current tracker picker, session logging, and `/program` queue ownership patterns.
- [`SCRIPTS_GUIDE.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/SCRIPTS_GUIDE.md)
  - Open when: you need the current usage for analyzer helpers, commit preflight, Supabase backup, or other local helper scripts.
  - Answers: "How do I use the local scripts right now?"
- [`VEXP_WORKFLOW.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/VEXP_WORKFLOW.md)
  - Open when: you are using `vexp` for code search, index troubleshooting, manifest handling, or observation workflow.
  - Answers: "What is the PT Tracker-specific `vexp` workflow?" and "When is a raw file read still allowed?"
- [`OFFLINE_HANDLING_RESEARCH_2026-04-12.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/OFFLINE_HANDLING_RESEARCH_2026-04-12.md)
  - Open when: you need the durable April 2026 research note for protected-route offline behavior, service worker scope, shared connectivity, or tracker-triggered `/program` warmup.
  - Answers: "Why are we using shared connectivity plus offline-aware fetches instead of a service-worker-only fix?" and "How should `/program` warm from tracker opening without manual protected document and RSC fetches?"
- [`TESTING_CHECKLISTS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/TESTING_CHECKLISTS.md)
  - Open when: you are validating a behavior change or regression fix.
  - Answers: "How do I verify this safely?"
- [`BEADS_WORKFLOW.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/BEADS_WORKFLOW.md)
  - Open when: you need the required bead lifecycle and closure rules.
  - Answers: "What exact order should I use for Beads work?"
- [`BEADS_OPERATIONS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/BEADS_OPERATIONS.md)
  - Open when: you need detailed Beads workflow, Dolt sync, or recovery steps.
  - Answers: "How do I operate the tracker safely?"
- [`BEADS_QUICKREF.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/BEADS_QUICKREF.md)
  - Open when: you need the short generated Beads command reference.
  - Answers: "What is the fast version of the Beads workflow?"
- [`BEADS_ISSUE_TEMPLATE.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/BEADS_ISSUE_TEMPLATE.md)
  - Open when: you are creating or reshaping a Beads issue.
  - Answers: "What must a correct Beads issue include?"
- [`BEADS_MOLECULES.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/BEADS_MOLECULES.md)
  - Open when: you need the repo-specific overview of Beads formulas, molecules, protos, wisps, or the current template inventory.
  - Answers: "How do Beads workflow templates work here?" and "Which formulas exist right now?"
- [`DATA_VOCABULARIES.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/DATA_VOCABULARIES.md)
  - Open when: you need canonical field names, lifecycle terms, or controlled vocabulary guidance.
  - Answers: "What do we call this field or value?"

## Historical References

Historical docs are preserved because they still contain useful investigation context, but they are not routine start-here docs.

- [`history/API_SLOT_STRATEGY_2026-02-17.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/history/API_SLOT_STRATEGY_2026-02-17.md)
  - Open when: you need the dated Vercel function-slot analysis.
- [`history/NEXTJS_MIGRATION_PRE_REORG_2026-03-20.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/history/NEXTJS_MIGRATION_PRE_REORG_2026-03-20.md)
  - Open when: you need the fuller pre-reorg migration narrative that was condensed into the active status binder.
- [`history/DEVELOPMENT_PRE_REORG_2026-03-20.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/history/DEVELOPMENT_PRE_REORG_2026-03-20.md)
  - Open when: you need the pre-reorg development guide wording for historical comparison.
- [`history/DEV_PRACTICES_PRE_REORG_2026-03-20.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/history/DEV_PRACTICES_PRE_REORG_2026-03-20.md)
  - Open when: you need the removed standalone dev-practices pages that were folded into the architecture binder.
- [`history/PHASE_1_ESTIMATE.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/history/PHASE_1_ESTIMATE.md)
  - Open when: you need the original early-scope estimate for historical context.
- [`history/SOUND_TRIGGER_AUDIT.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/history/SOUND_TRIGGER_AUDIT.md)
  - Open when: you need the detailed legacy sound/speech trigger audit.
- [`history/HISTORY.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/history/HISTORY.md)
  - Open when: you need pre-dev-notes historical change context.

## Archive

Archived docs are retained for legacy lookup only. They are not active workflow references.

- [`archive/dev-notes/AI_WORKFLOW.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/archive/dev-notes/AI_WORKFLOW.md)
  - Legacy transition note for the retired dev-notes workflow.
- [`archive/dev-notes/dev_notes.json`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/archive/dev-notes/dev_notes.json)
  - Canonical source for the retired dev-notes archive.
- [`archive/dev-notes/DEV_NOTES.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/archive/dev-notes/DEV_NOTES.md)
  - Generated view of the retired dev-notes archive.
- [`archive/dev-notes/dev_notes.schema.json`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/archive/dev-notes/dev_notes.schema.json)
  - Schema for the retired dev-notes archive.

## Generated Files

- [`BEADS_QUICKREF.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/BEADS_QUICKREF.md) is generated from [`BEADS_OPERATIONS.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/BEADS_OPERATIONS.md). Do not hand-edit it.
- [`archive/dev-notes/DEV_NOTES.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/archive/dev-notes/DEV_NOTES.md) is generated from [`archive/dev-notes/dev_notes.json`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/archive/dev-notes/dev_notes.json). Do not hand-edit it.
- [`AI_CONTEXT.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/AI_CONTEXT.md) is generated by `node scripts/generate-ai-context.mjs`. Do not hand-edit it.
