# Beads Upgrade Guide

How to upgrade `bd` and keep all docs, mirrors, and config in sync.

## When to Upgrade

- A new beads release is available and you want new features
- User requests an upgrade
- A bug fix in a new release affects this workspace

## Step-by-Step Upgrade Procedure

### 1. Create a bead for the upgrade work

```bash
bd create --title="Upgrade bd to vX.Y.Z" --type=task --priority=2
bd update <id> --claim --status in_progress
```

### 2. Preserve the current binary first

```powershell
$date = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Force "C:\Users\cindi\OneDrive\Documents\PT_Backup\bd-binary-backups" | Out-Null
Copy-Item "C:\Users\cindi\go\bin\bd.exe" "C:\Users\cindi\OneDrive\Documents\PT_Backup\bd-binary-backups\bd-pre-upgrade-$date.exe"
```

### 3. Pull a fresh PT_Backup mirror

```powershell
# Rename old mirror as backup
$date = Get-Date -Format "yyyyMMdd-HHmmss"
Move-Item "C:\Users\cindi\OneDrive\Documents\PT_Backup\beads" "C:\Users\cindi\OneDrive\Documents\PT_Backup\beads-old-$date"

# Clone fresh
git clone https://github.com/gastownhall/beads.git "C:\Users\cindi\OneDrive\Documents\PT_Backup\beads"
```

### 4. Upgrade the binary

For this workspace, prefer building from the refreshed mirror into the existing `go\bin` path:

```bash
cd "C:\Users\cindi\OneDrive\Documents\PT_Backup\beads"
go build -tags gms_pure_go -o "C:\Users\cindi\go\bin\bd.exe" ./cmd/bd
```

**Install location:** `C:\Users\cindi\go\bin\bd.exe`

**Do NOT use winget, scoop, chocolatey, or npm** — they install to different paths and create conflicting binaries.

Notes:
- PT Tracker uses Dolt `server` mode, not embedded Dolt. Do not add `embeddeddolt` build tags for this workspace.
- For the current `v1.0.2` release, `go install github.com/steveyegge/beads/cmd/bd@latest` may fail because the upstream tag includes `replace` directives. If `go install` succeeds in a later release, it is acceptable, but the source-build fallback remains the safe default here.

Verify:
```bash
where.exe bd        # Must resolve to go\bin\bd.exe only
bd version          # Confirm new version
bd context --json   # Confirm backend=dolt and dolt_mode=server still match this workspace
```

### 5. Upgrade Dolt if needed

Check if the release notes mention a Dolt version bump. If so:

```bash
# Check current version
dolt version

# Dolt on Windows is installed via MSI installer or winget (equivalent on Windows)
winget upgrade --id DoltHub.Dolt --accept-package-agreements --accept-source-agreements

# Verify
dolt version
```

### 6. Review the changelog

```bash
# Diff changelog between old and new version
diff "C:\Users\cindi\OneDrive\Documents\PT_Backup\beads\CHANGELOG.md" \
     "C:\Users\cindi\OneDrive\Documents\PT_Backup\beads-old-<date>\CHANGELOG.md" | head -100
```

Look for:
- New commands or flags → update AGENTS.md and BEADS_OPERATIONS.md
- Changed/removed commands → update any docs that reference them
- New runtime files → add to `.beads/.gitignore`
- Environment variable changes (e.g. `BD_ACTOR` → `BEADS_ACTOR`)
- Windows-specific fixes relevant to this workspace

### 7. Update repo docs if needed

Files to update based on changelog review:

| File | Update when |
|------|-------------|
| `AGENTS.md` | New commands, flags, or workflow changes |
| `docs/BEADS_WORKFLOW.md` | Lifecycle or workflow changes |
| `docs/BEADS_OPERATIONS.md` | Command syntax, install method, Dolt changes |
| `docs/README.md` | A Beads doc becomes newly relevant for routine maintenance |
| `.gitignore` | New runtime files added by the release |

### 8. Regenerate BEADS_QUICKREF

```bash
cd .
npm run beads:quickref
```

Verify the output looks correct before committing.

### 9. Verify bd still works

```bash
cd .
bd dolt start
bd ready --json
bd stats
```

### 10. Close bead and commit

```bash
bd close <id> --reason "Upgraded bd to vX.Y.Z via go install. Dolt: vA.B.C. Docs updated: [list]. Mirror refreshed."

git add docs/ AGENTS.md .gitignore
PT_README_OK=1 git commit -m "docs: upgrade bd to vX.Y.Z and sync docs (<bead-id>)"
git push
bd dolt push
```

## Resource / Token Impact Check (Before Installing New Tools)

Before adopting any new beads-adjacent tool (UI, coordination server, MCP):

1. **CPU/RAM at idle** — user's machine is older; Serena caused a full lockup
2. **MCP or CLI?** — MCP adds tokens to every message; CLI has zero overhead when not called
3. **Token impact** — does it inject into system prompt or context?

Apply a strict bar. If resource usage is unclear, investigate before recommending.

## Version History

| Date | bd version | Dolt version | Method | Notes |
|------|-----------|-------------|--------|-------|
| 2026-04-15 | 1.0.2 | server mode active in workspace | fresh mirror + `go build -tags gms_pure_go` | Repo moved to `gastownhall/beads`; source build used because `go install ...@latest` failed on release replace directives |
| 2026-03-22 | 0.62.0 | 1.84.0 | go install | Added bd note, --exclude-type, custom status categories, Windows Dolt lifecycle fixes |
