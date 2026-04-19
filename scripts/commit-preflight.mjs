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

function parseArgs(argv) {
  const args = argv.slice(2);
  const parsed = {
    message: '',
    trailers: [],
    verbose: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
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

function printHelp() {
  console.log(`Usage:
  npm run commit:preflight -- --message "Your title (pt-xxxx)" --trailer "Co-Authored-By: Codex GPT-5.4 <codex@openai.com>"
  npm run commit:preflight -- --message "Your title (pt-xxxx)" --verbose

Options:
  --message <title>     Commit title to validate before git commit
  --trailer <text>      Commit trailer to validate before git commit (repeatable)
  --verbose, -v         Show the full preflight report, including passing sections
  --help, -h            Show this help text

Default output:
  Success prints a short one-line summary.
  Failure prints only the blocking sections and their details.`);
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
      return {
        name: 'Biome staged checks',
        ok: false,
        details: summarizeOutput(checkResult),
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
    details: result.ok ? ['Structure check would pass.'] : summarizeOutput(result),
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
        'No recognized AI trailer was provided. Add --trailer "Co-Authored-By: Codex GPT-5.4 <codex@openai.com>" or set PT_AI_TRAILER_OK=1 for the commit only when no agent attribution should be recorded.',
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
  printHelp();
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

console.error(
  'Preflight found blockers. Fix the failed sections above, then rerun this command before git commit.',
);
process.exit(1);
