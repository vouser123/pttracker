#!/usr/bin/env node

// scripts/run-biome-staged.mjs — run Biome on staged commit files, auto-format safely, and lint.

import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const BIOME_LOG_PATH = 'C:\\Users\\cindi\\OneDrive\\Documents\\PT_Backup\\biome\\logs';
const SKIP_AUTOWRITE_ENV = 'PT_BIOME_SKIP_AUTOWRITE';
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

const stagedFiles = getStagedFiles();
const commitFiles = stagedFiles;

if (commitFiles.length === 0) {
  process.exit(0);
}

assertNoPartiallyStagedFiles(stagedFiles);

const changedBefore = getChangedFiles(commitFiles);
const autoWriteEnabled = process.env[SKIP_AUTOWRITE_ENV] !== '1';

if (autoWriteEnabled) {
  runBiomeOnCommitFiles(commitFiles);
  restageFiles(commitFiles);
  const changedAfter = getChangedFiles(commitFiles);
  const rewrittenFiles = changedAfter.filter((file) => changedBefore.includes(file));
  if (rewrittenFiles.length > 0) {
    console.log('Biome auto-formatted and re-staged commit files:');
    for (const file of rewrittenFiles) {
      console.log(`  - ${file}`);
    }
    console.log('Review git diff --cached if you want to inspect the rewritten commit content.');
  }
} else {
  console.log(
    `Biome auto-write skipped because ${SKIP_AUTOWRITE_ENV}=1. Running lint only for this commit.`,
  );
}

runBiomeLint(commitFiles);
