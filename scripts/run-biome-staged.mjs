#!/usr/bin/env node

// scripts/run-biome-staged.mjs — run Biome on staged commit files, auto-format safely, and lint.

import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const BIOME_LOG_PATH = 'C:\\Users\\cindi\\OneDrive\\Documents\\PT_Backup\\biome\\logs';
const SKIP_AUTOWRITE_ENV = 'PT_BIOME_SKIP_AUTOWRITE';
const SKIP_AUTOWRITE_APPROVED_ENV = 'PT_BIOME_SKIP_AUTOWRITE_APPROVED';
const SKIP_AUTOWRITE_REASON_ENV = 'PT_BIOME_SKIP_AUTOWRITE_REASON';
const SKIP_AUTOWRITE_FILE_ENV = 'PT_BIOME_SKIP_AUTOWRITE_FILE';
const BIOME_BIN = path.join(process.cwd(), 'node_modules', '@biomejs', 'biome', 'bin', 'biome');

function readGitLines(args) {
  const output = execFileSync('git', args, { encoding: 'utf8' });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getStagedFiles() {
  return readGitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
}

function getChangedFiles(files) {
  const changed = new Set(readGitLines(['diff', '--name-only', '--', ...files]));
  for (const file of readGitLines(['diff', '--cached', '--name-only', '--', ...files])) {
    changed.add(file);
  }
  return [...changed];
}

function hasUnstagedChanges(file) {
  return readGitLines(['diff', '--name-only', '--', file]).length > 0;
}

function assertNoPartiallyStagedFiles(stagedFiles) {
  const partiallyStaged = stagedFiles.filter((file) => hasUnstagedChanges(file));
  if (partiallyStaged.length === 0) {
    return;
  }

  console.error('Biome pre-commit stopped because some staged files also have unstaged changes:');
  for (const file of partiallyStaged) {
    console.error(`  - ${file}`);
  }
  console.error('');
  console.error(
    'This hook avoids reformatting partially staged files because that could pull unstaged hunks into the commit.',
  );
  console.error('Stage the whole file or finish splitting the changes before committing.');
  process.exit(1);
}

function runBiomeOnCommitFiles(files) {
  mkdirSync(BIOME_LOG_PATH, { recursive: true });
  execFileSync(
    process.execPath,
    [
      BIOME_BIN,
      'format',
      '--write',
      '--files-ignore-unknown=true',
      '--no-errors-on-unmatched',
      ...files,
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        BIOME_LOG_PATH,
      },
    },
  );
}

function runBiomeLint(files) {
  execFileSync(
    process.execPath,
    [BIOME_BIN, 'lint', '--files-ignore-unknown=true', '--no-errors-on-unmatched', ...files],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        BIOME_LOG_PATH,
      },
    },
  );
}

function restageFiles(files) {
  execFileSync('git', ['add', '--', ...files], { stdio: 'inherit' });
}

function resolveBypassFile(stagedFiles) {
  if (process.env[SKIP_AUTOWRITE_ENV] !== '1') {
    return null;
  }

  const approval = process.env[SKIP_AUTOWRITE_APPROVED_ENV];
  const reason = process.env[SKIP_AUTOWRITE_REASON_ENV]?.trim();
  const bypassFile = process.env[SKIP_AUTOWRITE_FILE_ENV]?.trim();

  if (approval !== '1') {
    console.error(
      `Biome bypass requires ${SKIP_AUTOWRITE_APPROVED_ENV}=1 after consulting the user and receiving explicit approval.`,
    );
    process.exit(1);
  }

  if (!reason) {
    console.error(
      `Biome bypass requires a non-empty ${SKIP_AUTOWRITE_REASON_ENV} so the approved exception is documented.`,
    );
    process.exit(1);
  }

  if (!bypassFile || bypassFile.includes(',')) {
    console.error(
      `Biome bypass requires exactly one file via ${SKIP_AUTOWRITE_FILE_ENV}=path/to/file.js.`,
    );
    process.exit(1);
  }

  if (!stagedFiles.includes(bypassFile)) {
    console.error(
      `Biome bypass file ${bypassFile} is not part of the staged commit. Stage that file or clear the bypass env vars.`,
    );
    process.exit(1);
  }

  return {
    file: bypassFile,
    reason,
  };
}

const stagedFiles = getStagedFiles();
const commitFiles = stagedFiles;

if (commitFiles.length === 0) {
  process.exit(0);
}

assertNoPartiallyStagedFiles(stagedFiles);

const bypass = resolveBypassFile(stagedFiles);
const changedBefore = getChangedFiles(commitFiles);
const autoWriteTargets = bypass ? commitFiles.filter((file) => file !== bypass.file) : commitFiles;

if (autoWriteTargets.length > 0) {
  runBiomeOnCommitFiles(autoWriteTargets);
  restageFiles(autoWriteTargets);
  const changedAfter = getChangedFiles(autoWriteTargets);
  const rewrittenFiles = changedAfter.filter((file) => changedBefore.includes(file));
  if (rewrittenFiles.length > 0) {
    console.log('Biome auto-formatted and re-staged commit files:');
    for (const file of rewrittenFiles) {
      console.log(`  - ${file}`);
    }
    console.log('Review git diff --cached if you want to inspect the rewritten commit content.');
  }
}

if (bypass) {
  console.log(
    `Biome auto-write skipped only for ${bypass.file} because ${SKIP_AUTOWRITE_ENV}=1, ${SKIP_AUTOWRITE_APPROVED_ENV}=1, and ${SKIP_AUTOWRITE_REASON_ENV} was provided. Reason: ${bypass.reason}`,
  );
}

runBiomeLint(commitFiles);
