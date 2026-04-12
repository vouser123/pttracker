import { execFileSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = process.cwd();
const docsReadmePath = 'docs/README.md';
const gitPrefix = execFileSync('git', ['rev-parse', '--show-prefix'], {
  cwd: repoRoot,
  encoding: 'utf8',
})
  .trim()
  .replace(/\\/g, '/');

const docsTriggerPatterns = [/^docs\/.+/];

const docsIgnorePatterns = [
  /^docs\/README\.md$/,
  /^docs\/AI_CONTEXT\.md$/,
  /^docs\/BEADS_QUICKREF\.md$/,
  /^docs\/archive\/dev-notes\/DEV_NOTES\.md$/,
];

function getStagedFiles() {
  const output = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((file) => file.replace(/\\/g, '/'))
    .map((file) => (gitPrefix && file.startsWith(gitPrefix) ? file.slice(gitPrefix.length) : file));
}

function matchesDocsTrigger(file) {
  if (!docsTriggerPatterns.some((pattern) => pattern.test(file))) {
    return false;
  }
  return !docsIgnorePatterns.some((pattern) => pattern.test(file));
}

function printFailure(docsFiles) {
  console.error('Docs README review required before commit.');
  console.error('');
  console.error('You staged docs files that can change the docs index:');
  for (const file of docsFiles) {
    console.error(`  - ${file}`);
  }
  console.error('');
  console.error(`Stage ${docsReadmePath} if the docs index needs an update.`);
  console.error('If docs/README.md remains accurate without edits, retry with:');
  console.error('  $env:PT_DOCS_README_OK="1"; git commit ...');
  console.error('');
  console.error(`See ${path.join(repoRoot, docsReadmePath)}.`);
}

const stagedFiles = getStagedFiles();
const docsFiles = stagedFiles.filter(matchesDocsTrigger);

if (docsFiles.length === 0) {
  process.exit(0);
}

if (stagedFiles.includes(docsReadmePath) || process.env.PT_DOCS_README_OK === '1') {
  process.exit(0);
}

printFailure(docsFiles);
process.exit(1);
