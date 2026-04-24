#!/usr/bin/env node

// scripts/commit-preflight.mjs — report likely commit blockers before running git commit.

import { execFileSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = process.cwd();
const BIOME_BIN = path.join(repoRoot, 'node_modules', '@biomejs', 'biome', 'bin', 'biome');
const AI_TRAILER_OK_ENV = 'PT_AI_TRAILER_OK';
const SKIP_AUTOWRITE_ENV = 'PT_BIOME_SKIP_AUTOWRITE';
const SKIP_AUTOWRITE_APPROVED_ENV = 'PT_BIOME_SKIP_AUTOWRITE_APPROVED';
const SKIP_AUTOWRITE_REASON_ENV = 'PT_BIOME_SKIP_AUTOWRITE_REASON';
const SKIP_AUTOWRITE_FILE_ENV = 'PT_BIOME_SKIP_AUTOWRITE_FILE';

function readGitLines(args) {
  const output = execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getStagedFiles() {
  return readGitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
}

function hasUnstagedChanges(file) {
  return readGitLines(['diff', '--name-only', '--', file]).length > 0;
}

const HELP_TOPICS = ['biome', 'envvars', 'trailers', 'structure'];

function parseArgs(argv) {
  const args = argv.slice(2);
  const parsed = {
    message: '',
    trailers: [],
    verbose: false,
    help: false,
    helpTopic: '',
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      const next = args[index + 1];
      if (next && !next.startsWith('-')) {
        parsed.helpTopic = next;
        index += 1;
      }
      continue;
    }
    if (arg === '--verbose' || arg === '-v') {
      parsed.verbose = true;
      continue;
    }
    if (arg === '--message') {
      parsed.message = args[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (arg === '--trailer') {
      parsed.trailers.push(args[index + 1] ?? '');
      index += 1;
    }
  }

  return parsed;
}

function printHelpOverview() {
  console.log(`Usage:
  npm run commit:preflight -- --message "Your title (pt-xxxx)" --trailer "Co-Authored-By: <Name> <noreply@anthropic.com>"
  npm run commit:preflight -- --message "Your title (pt-xxxx)" --verbose

Options:
  --message <title>     Commit title to validate
  --trailer <text>      Commit trailer to validate (repeatable)
  --verbose, -v         Show all sections including passing ones
  --help [topic], -h    Overview (default) or topic detail

Topics:
  --help biome          How to fix Biome format/lint errors
  --help envvars        All env var overrides with bash + PowerShell syntax
  --help trailers       Recognized AI trailers and when to skip
  --help structure      Structure rules and how to read failures

Checks run (in order):
  1. README guard       staged lib/hook/route files → README.md must be staged or PT_README_OK=1
  2. Docs README guard  staged docs/ files → docs/README.md may need staging
  3. Biome              format + lint on staged files
  4. Structure          file caps and layer rules
  5. Gitleaks           secret scan on staged snapshot
  6. Commit message     Beads ID in title + recognized AI trailer

Quick fixes:
  Biome FIXABLE error → npx biome check --write <files>, re-stage, rerun
  README guard         → stage README.md or: PT_README_OK=1 git commit ...
  No AI trailer        → add --trailer "Co-Authored-By: <Name> <noreply@anthropic.com>"`);
}

function printHelpBiome() {
  console.log(`Biome — format and lint checks on staged files

The commit hook auto-applies Biome fixes at commit time. Preflight lets you
see and fix errors before hitting the hook.

If preflight shows FIXABLE or "Safe fix":
  Bash/zsh:
    npx biome check --write <staged-file1> <staged-file2>
    git add <those files>
    npm run commit:preflight -- --message "..." --trailer "..."

  PowerShell:
    npx biome check --write <staged-file1> <staged-file2>
    git add <those files>
    npm run commit:preflight -- --message "..." --trailer "..."

If errors are not auto-fixable (real lint violations):
  Fix the code, re-stage, and rerun preflight.

Partially-staged files:
  Biome stops if a staged file also has unstaged changes.
  Either stage the full file or stash the unstaged changes first.

Emergency bypass (one file, requires user approval):
  See --help envvars for PT_BIOME_SKIP_AUTOWRITE vars.`);
}

function printHelpEnvvars() {
  console.log(`Environment variable overrides — set inline for the single command only.

PT_README_OK=1
  Skip the README guard when README.md is already accurate.
  Bash/zsh:   PT_README_OK=1 git commit -m "..."
  PowerShell: $env:PT_README_OK="1"; git commit -m "..."

PT_AI_TRAILER_OK=1
  Skip the AI trailer requirement when no agent attribution applies.
  Bash/zsh:   PT_AI_TRAILER_OK=1 git commit -m "..."
  PowerShell: $env:PT_AI_TRAILER_OK="1"; git commit -m "..."

Biome auto-write bypass (emergency only — all four required, user approval needed):
  PT_BIOME_SKIP_AUTOWRITE=1
  PT_BIOME_SKIP_AUTOWRITE_APPROVED=1
  PT_BIOME_SKIP_AUTOWRITE_REASON="<reason>"
  PT_BIOME_SKIP_AUTOWRITE_FILE=<path/to/exactly-one-staged-file>

  Bash/zsh (one line):
    PT_BIOME_SKIP_AUTOWRITE=1 PT_BIOME_SKIP_AUTOWRITE_APPROVED=1 \\
      PT_BIOME_SKIP_AUTOWRITE_REASON="reason" PT_BIOME_SKIP_AUTOWRITE_FILE=path/to/file \\
      git commit -m "..."

  PowerShell:
    $env:PT_BIOME_SKIP_AUTOWRITE="1"
    $env:PT_BIOME_SKIP_AUTOWRITE_APPROVED="1"
    $env:PT_BIOME_SKIP_AUTOWRITE_REASON="reason"
    $env:PT_BIOME_SKIP_AUTOWRITE_FILE="path/to/file"
    git commit -m "..."`);
}

function printHelpTrailers() {
  console.log(`AI trailers — one required per commit unless PT_AI_TRAILER_OK=1.

Accepted email domains: noreply@anthropic.com, codex@openai.com
Any agent name is accepted with those domains.

Examples:
  Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
  Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
  Co-Authored-By: Codex <codex@openai.com>

Pass via preflight:
  --trailer "Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

Pass via git commit (heredoc recommended to avoid shell quoting issues):
  git commit -m "$(cat <<'EOF'
  Your title (pt-xxxx)

  Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
  EOF
  )"

Skip trailer requirement (no agent attribution for this commit):
  Bash/zsh:   PT_AI_TRAILER_OK=1 git commit -m "..."
  PowerShell: $env:PT_AI_TRAILER_OK="1"; git commit -m "..."`);
}

function printHelpStructure() {
  console.log(`Structure check — file caps and layer rules on staged files.

Rules enforced (machine-checkable subset):
  - Required file header comments
  - File size caps (see docs/NEXTJS_CODE_STRUCTURE.md for thresholds)
  - Thin app/**/page.tsx constraints (no useState/useEffect/lib imports)
  - Forbidden import-layer crossings (lib importing hooks/components, etc.)

Full rules: docs/NEXTJS_CODE_STRUCTURE.md
Escalation: docs/STRUCTURE_REVIEW_ESCALATION.md

Structure failures cannot be bypassed via env var.
Fix the violation or consult the user before committing.`);
}

function printHelp(topic) {
  if (!topic) {
    printHelpOverview();
    return;
  }
  if (topic === 'biome') {
    printHelpBiome();
    return;
  }
  if (topic === 'envvars') {
    printHelpEnvvars();
    return;
  }
  if (topic === 'trailers') {
    printHelpTrailers();
    return;
  }
  if (topic === 'structure') {
    printHelpStructure();
    return;
  }
  console.error(`Unknown help topic: "${topic}". Available topics: ${HELP_TOPICS.join(', ')}`);
  process.exit(1);
}

function resolveBiomeBypassFile(stagedFiles) {
  if (process.env[SKIP_AUTOWRITE_ENV] !== '1') {
    return { ok: true, file: null, reason: '' };
  }

  const approval = process.env[SKIP_AUTOWRITE_APPROVED_ENV];
  const reason = process.env[SKIP_AUTOWRITE_REASON_ENV]?.trim();
  const bypassFile = process.env[SKIP_AUTOWRITE_FILE_ENV]?.trim();

  if (approval !== '1') {
    return {
      ok: false,
      details: [`${SKIP_AUTOWRITE_ENV}=1 is set, but ${SKIP_AUTOWRITE_APPROVED_ENV}=1 is missing.`],
    };
  }

  if (!reason) {
    return {
      ok: false,
      details: [`${SKIP_AUTOWRITE_ENV}=1 is set, but ${SKIP_AUTOWRITE_REASON_ENV} is empty.`],
    };
  }

  if (!bypassFile || bypassFile.includes(',')) {
    return {
      ok: false,
      details: [
        `${SKIP_AUTOWRITE_ENV}=1 is set, but ${SKIP_AUTOWRITE_FILE_ENV} must name exactly one file.`,
      ],
    };
  }

  if (!stagedFiles.includes(bypassFile)) {
    return {
      ok: false,
      details: [`${SKIP_AUTOWRITE_FILE_ENV} points to ${bypassFile}, but that file is not staged.`],
    };
  }

  return {
    ok: true,
    file: bypassFile,
    reason,
  };
}

function runCommand(command, args, options = {}) {
  try {
    const stdout = execFileSync(command, args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    return {
      ok: true,
      stdout: stdout.trim(),
      stderr: '',
    };
  } catch (error) {
    return {
      ok: false,
      stdout: (error.stdout ?? '').toString().trim(),
      stderr: (error.stderr ?? '').toString().trim(),
      exitCode: error.status ?? 1,
    };
  }
}

function summarizeOutput(output) {
  const combined = [output.stdout, output.stderr].filter(Boolean).join('\n').trim();
  if (!combined) {
    return [];
  }
  return combined.split(/\r?\n/);
}

function checkReadmeGuard() {
  const result = runCommand(process.execPath, ['scripts/check-readme-update.mjs']);
  return {
    name: 'README guard',
    ok: result.ok,
    details: result.ok ? ['README guard would pass.'] : summarizeOutput(result),
  };
}

function checkDocsReadmeGuard() {
  const result = runCommand(process.execPath, ['scripts/check-docs-readme-update.mjs']);
  return {
    name: 'Docs README guard',
    ok: result.ok,
    details: result.ok ? ['Docs README guard would pass.'] : summarizeOutput(result),
  };
}

function checkBiome(stagedFiles) {
  if (stagedFiles.length === 0) {
    return {
      name: 'Biome staged checks',
      ok: true,
      details: ['No staged files.'],
    };
  }

  const partiallyStaged = stagedFiles.filter((file) => hasUnstagedChanges(file));
  if (partiallyStaged.length > 0) {
    return {
      name: 'Biome staged checks',
      ok: false,
      details: [
        'Some staged files also have unstaged changes:',
        ...partiallyStaged.map((file) => `  - ${file}`),
        'The hook would stop before auto-formatting to avoid pulling hidden hunks into the commit.',
      ],
    };
  }

  const bypass = resolveBiomeBypassFile(stagedFiles);
  if (!bypass.ok) {
    return {
      name: 'Biome staged checks',
      ok: false,
      details: bypass.details,
    };
  }

  const autoWriteTargets = bypass.file
    ? stagedFiles.filter((file) => file !== bypass.file)
    : stagedFiles;

  const details = [];

  if (autoWriteTargets.length > 0) {
    const checkResult = runCommand(process.execPath, [
      BIOME_BIN,
      'check',
      '--files-ignore-unknown=true',
      '--no-errors-on-unmatched',
      ...autoWriteTargets,
    ]);
    if (!checkResult.ok) {
      const output = summarizeOutput(checkResult);
      const combined = [checkResult.stdout, checkResult.stderr].join('\n');
      const hasFixable = /FIXABLE|Safe fix/i.test(combined);
      return {
        name: 'Biome staged checks',
        ok: false,
        details: [
          ...output,
          ...(hasFixable
            ? [
                '',
                'Some errors are auto-fixable. Run:',
                `  npx biome check --write ${autoWriteTargets.join(' ')}`,
                'Then re-stage the rewritten files and rerun preflight.',
              ]
            : []),
        ],
      };
    }
    details.push('Biome check would pass for the files eligible for auto-write.');
  }

  const lintResult = runCommand(process.execPath, [
    BIOME_BIN,
    'lint',
    '--files-ignore-unknown=true',
    '--no-errors-on-unmatched',
    ...stagedFiles,
  ]);
  if (!lintResult.ok) {
    return {
      name: 'Biome staged checks',
      ok: false,
      details: summarizeOutput(lintResult),
    };
  }

  if (bypass.file) {
    details.push(
      `Biome auto-write bypass is configured only for ${bypass.file}. Reason: ${bypass.reason}`,
    );
  } else {
    details.push('Biome lint would pass for all staged files.');
  }

  return {
    name: 'Biome staged checks',
    ok: true,
    details,
  };
}

function checkStructure() {
  const result = runCommand(process.execPath, ['scripts/check-structure.mjs', '--staged']);
  return {
    name: 'Structure check',
    ok: result.ok,
    details: result.ok
      ? ['Structure check would pass.']
      : [...summarizeOutput(result), 'See docs/NEXTJS_CODE_STRUCTURE.md for structure rules.'],
  };
}

function checkGitleaks() {
  const result = runCommand('powershell', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    'scripts/run-gitleaks-staged.ps1',
  ]);
  return {
    name: 'Gitleaks snapshot scan',
    ok: result.ok,
    details: result.ok ? ['Secret scan would pass.'] : summarizeOutput(result),
  };
}

function checkCommitMessage({ message, trailers }) {
  if (!message) {
    return {
      name: 'Commit message requirements',
      ok: false,
      details: [
        'No commit message title was provided to preflight.',
        'Pass --message "Your title (pt-xxxx)" to validate Beads IDs in advance.',
        'Use --trailer "Co-Authored-By: ..." to validate the AI trailer in advance.',
      ],
    };
  }

  const details = [];
  const beadPattern = /\((pt-[a-z0-9][a-z0-9.-]*)(,\s*pt-[a-z0-9][a-z0-9.-]*)*\)/i;
  if (!beadPattern.test(message)) {
    details.push(
      'Commit title is missing a Beads issue ID in parentheses. Example: "Fix tracker behavior (pt-xxxx)".',
    );
  }

  if (process.env[AI_TRAILER_OK_ENV] !== '1') {
    const trailerPattern = /^Co-Authored-By: .*<(codex@openai\.com|noreply@anthropic\.com)>$/i;
    const hasRecognizedTrailer = trailers.some((trailer) => trailerPattern.test(trailer.trim()));
    if (!hasRecognizedTrailer) {
      details.push(
        'No recognized AI trailer was provided.',
        'Add --trailer "Co-Authored-By: <Agent Name> <noreply@anthropic.com>" (Anthropic agents)',
        '  or --trailer "Co-Authored-By: <Agent Name> <codex@openai.com>" (Codex agents)',
        '  or set PT_AI_TRAILER_OK=1 when no agent attribution should be recorded.',
        'Run with --help trailers for accepted emails, heredoc syntax, and env var overrides.',
      );
    }
  }

  return {
    name: 'Commit message requirements',
    ok: details.length === 0,
    details:
      details.length === 0
        ? ['Commit title and supplied trailer(s) satisfy the current commit-msg hook requirements.']
        : details,
  };
}

function formatSection(result) {
  const status = result.ok ? 'PASS' : 'FAIL';
  const lines = [`[${status}] ${result.name}`];
  for (const detail of result.details) {
    lines.push(`  ${detail}`);
  }
  return lines.join('\n');
}

const args = parseArgs(process.argv);
if (args.help) {
  printHelp(args.helpTopic);
  process.exit(0);
}

const stagedFiles = getStagedFiles();

const results = [
  {
    name: 'Staged files',
    ok: stagedFiles.length > 0,
    details:
      stagedFiles.length > 0
        ? stagedFiles.map((file) => `- ${file}`)
        : ['No staged files. Stage files before running commit preflight.'],
  },
];

if (stagedFiles.length > 0) {
  results.push(checkReadmeGuard());
  results.push(checkDocsReadmeGuard());
  results.push(checkBiome(stagedFiles));
  results.push(checkStructure());
  results.push(checkGitleaks());
}

results.push(checkCommitMessage(args));

const failed = results.filter((result) => !result.ok);

if (failed.length === 0) {
  if (args.verbose) {
    console.log('Commit preflight report');
    console.log('');
    for (const result of results) {
      console.log(formatSection(result));
      console.log('');
    }
    console.log(
      'Preflight passed. The current staged snapshot and supplied commit message look ready for git commit.',
    );
    process.exit(0);
  }

  const stageSummary =
    stagedFiles.length > 0
      ? `${stagedFiles.length} staged file${stagedFiles.length === 1 ? '' : 's'}`
      : 'no staged files';
  console.log(
    `Preflight passed. ${stageSummary}; README/docs guards, Biome, structure, secret scan, and commit message checks all passed.`,
  );
  process.exit(0);
}

console.log('Commit preflight report');
console.log('');
for (const result of failed) {
  console.log(formatSection(result));
  console.log('');
}

const topicHints = failed
  .map((r) => {
    if (r.name === 'Biome staged checks') return '--help biome';
    if (r.name === 'README guard' || r.name === 'Docs README guard') return '--help envvars';
    if (r.name === 'Commit message requirements') return '--help trailers';
    if (r.name === 'Structure check') return '--help structure';
    return null;
  })
  .filter(Boolean);
const uniqueTopics = [...new Set(topicHints)];
console.error(
  'Preflight found blockers. Fix the failed sections above, then rerun before git commit.',
);
if (uniqueTopics.length > 0) {
  console.error(`For fix guidance: npm run commit:preflight -- ${uniqueTopics.join(' or ')}`);
}
process.exit(1);
