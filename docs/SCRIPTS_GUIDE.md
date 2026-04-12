# Scripts Guide

Use this file for the current workflow for PT Tracker's AI-agent local scripts.

Like the rest of this repo, this guide is written for AI-agent workflow, not for human end-user operation.

Use [`../README.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/README.md) for the live script/file ownership map.
Use [`NEXTJS_CODE_STRUCTURE.md`](C:/Users/cindi/OneDrive/Documents/GitHub/pttracker/docs/NEXTJS_CODE_STRUCTURE.md) for the architectural rules that decide when bundle analysis is required.

## Bundle Analyzer Scripts

These commands help answer different questions:

- `npm run analyze:bundle`
  - Starts Next's web analyzer UI and writes analyzer diagnostics under `.next/diagnostics/`.
  - Use this when you need the full treemap plus fresh analyzer data.
- `npm run analyze:bundle:out`
  - Writes the analyzer diagnostics without opening the live UI.
  - Use this when you only need the files on disk.
- `npm run analyze:paths -- ...`
  - Reads the generated route analyzer data and prints source-chain evidence for one route and one surface.
  - Use this when you need to trace why a package or file is in a specific route bundle.
- `npm run analyze:modules -- ...`
  - Reads the generated module graph and prints direct dependents and dependencies for one surface.
  - Use this when you need to see which modules pull a dependency into the client or server graph.

### Prerequisite

Run one of these first so `.next/diagnostics/analyze/` exists and is current:

- `npm run analyze:bundle`
- `npm run analyze:bundle:out`

The helper scripts read analyzer output from disk. If the diagnostics folder is missing or stale, refresh it before using `analyze:paths` or `analyze:modules`.

### `analyze:paths`

Usage pattern:

```bash
npm run analyze:paths -- --root --surface client --term supabase
npm run analyze:paths -- --route /sign-in --surface client --term GoTrueClient
```

Required flags:

- `--surface client|server`
  - Required. The script will not guess.
- One of:
  - `--root`
    - Use this for the `/` route, especially on Windows or Git Bash where `--route /` can be expanded into a filesystem path.
  - `--route /some-path`
- `--term <text>`
  - Case-insensitive substring match against analyzer source paths.

Optional flag:

- `--limit <n>`
  - Maximum matches to print. Default: `10`.

What it prints:

- the route and surface inspected
- the analyzer file used
- matching source paths
- estimated compressed and uncompressed sizes
- emitted output files
- the source chain and sibling branches that explain how the match entered the route graph

### `analyze:modules`

Usage pattern:

```bash
npm run analyze:modules -- --surface client --term GoTrueClient
npm run analyze:modules -- --surface client --term RealtimeChannel
```

Required flags:

- `--surface client|server`
  - Required. The script will not guess.
- `--term <text>`
  - Case-insensitive substring match against module paths.

Optional flag:

- `--limit <n>`
  - Maximum matches to print. Default: `10`.

What it prints:

- the module-graph file used
- matching modules for the selected surface
- direct dependents
- direct dependencies
- async dependents
- async dependencies

### Recommended Bundle Workflow

1. Run `npm run analyze:bundle` when you need the live treemap, or `npm run analyze:bundle:out` when files on disk are enough.
2. Use `npm run analyze:paths -- ...` to prove why a dependency shows up in one route.
3. Use `npm run analyze:modules -- ...` to prove which modules pull that dependency into the graph.
4. Record the findings on the active bead before merging a bundle-shaping change.

## Required Supabase Backup Script

Before any direct Supabase interaction outside the app itself, run the required backup script first:

```bash
node "C:\Users\cindi\OneDrive\Documents\PT_Backup\backup-supabase.mjs"
```

Use it when:

- you are about to use Supabase MCP tools such as `execute_sql`, `list_tables`, or `apply_migration`
- you are about to do any direct read or write against the Supabase project outside the normal app runtime

Expected result:

- the script reports all expected tables as backed up successfully
- a fresh backup file is written under `C:\Users\cindi\OneDrive\Documents\PT_Backup\db-backups\`

This script lives outside the repo because it protects private project data and backup storage.

## Commit Preflight Script

Use `npm run commit:preflight -- ...` after staging and before `git commit` when you want one report for the repo's commit guards.

Usage pattern:

```bash
npm run commit:preflight -- --message "Your title (pt-xxxx)" --trailer "Co-Authored-By: Codex GPT-5.4 <codex@openai.com>"
```

What it checks:

- staged-file selection
- README guard
- Biome staged checks
- structure check
- Gitleaks staged snapshot scan
- commit message and trailer requirements

Use it when:

- you are preparing a commit and want the repo checks in one pass
- a previous commit attempt failed and you want the combined report before retrying
- you changed files that are likely to touch README, structure, formatting, or secret-scan guardrails

Notes:

- The commit title still needs at least one Beads ID such as `(pt-xxxx)`.
- Use a recognized trailer email such as `codex@openai.com` or `noreply@anthropic.com` unless the one-time repo override is intentionally used.
- This script helps surface blockers early; it does not replace the actual `git commit`.

## Quality And Guardrail Scripts

### Biome scripts

- `npm run biome:check`
  - Full repo check. Use when you want the standard formatter/linter report.
- `npm run biome:lint`
  - Lint-only pass.
- `npm run biome:format`
  - Writes formatting changes across the repo. Use deliberately.
- `npm run biome:report`
  - Writes a structured Biome report artifact under `C:\Users\cindi\OneDrive\Documents\PT_Backup\biome\logs`.
- `npm run biome:report:summary`
  - Reads the newest report and prints a compact summary.

Use the report pair when you want agent-friendly triage output without rereading a long raw Biome report.

### Structure check

- `npm run structure:check`
  - Runs the staged-file structure guard directly.
  - Use it when you want a manual read on structure-hook results before a commit attempt.

### Docs index reminder guard

- `node scripts/check-docs-readme-update.mjs`
  - Checks whether staged `docs/` changes should also stage `docs/README.md`.
  - Use it when you want an early reminder before commit, or rely on commit preflight and the pre-commit hook to run it for you.

### Secret scan helper

- `scripts/run-gitleaks-staged.ps1`
  - Staged snapshot secret scan helper used by commit workflows.
  - You will usually reach it through `npm run commit:preflight` or the pre-commit hook rather than calling it manually.

## Documentation And Reference Scripts

- `npm run sync-docs`
  - Local fallback for syncing migration/status docs when the GitHub Actions sync is not the path you are using.
- `npm run beads:quickref`
  - Regenerates the Beads quick reference from the longer operations doc.
- `node scripts/generate-ai-context.mjs`
  - Regenerates `docs/AI_CONTEXT.md`.

Use these when documentation artifacts need to be refreshed intentionally, not as routine pre-commit steps.

## Lower-Frequency Repo Scripts

- `npm run test:e2e`
- `npm run test:e2e:headed`
- `npm run test:e2e:ui`
- `npm run build`
- `npm run dev`
- `npm run start`

These exist in the repo, but they are not the default first stop for routine validation in this project. Follow the repo's Vercel-first validation rule unless there is a specific reason to use a local run.

## What This Means For You

Script-specific usage now lives in one doc, so command changes can be updated in one place without turning the structure docs into a second script manual.
