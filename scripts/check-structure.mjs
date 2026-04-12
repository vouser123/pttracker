#!/usr/bin/env node

// scripts/check-structure.mjs — enforce staged-file structure rules from NEXTJS_CODE_STRUCTURE.md.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const SKIP_STRUCTURE_ENV = 'PT_STRUCTURE_BYPASS';
const SKIP_STRUCTURE_APPROVED_ENV = 'PT_STRUCTURE_BYPASS_APPROVED';
const SKIP_STRUCTURE_REASON_ENV = 'PT_STRUCTURE_BYPASS_REASON';
const SKIP_STRUCTURE_FILE_ENV = 'PT_STRUCTURE_BYPASS_FILE';

const fileCaps = [
  { pattern: /^pages\/.+\.js$/, cap: 500, label: 'pages/*.js' },
  { pattern: /^app\/.+\/page\.js$/, cap: 80, label: 'app/**/page.js' },
  { pattern: /^app\/.+Page\.js$/, cap: 500, label: 'app/**/*Page.js' },
  { pattern: /^app\/layout\.js$/, cap: 120, label: 'app/layout.js' },
  { pattern: /^components\/.+\.js$/, cap: 300, label: 'components/*.js' },
  { pattern: /^hooks\/use.+\.js$/, cap: 150, label: 'hooks/use*.js' },
  { pattern: /^lib\/.+\.js$/, cap: 450, label: 'lib/*.js' },
  { pattern: /^.+\.module\.css$/, cap: 500, label: '*.module.css' },
  { pattern: /^styles\/globals\.css$/, cap: 100, label: 'styles/globals.css' },
];

const ERROR_TYPE_CAP = 'cap';
const ERROR_TYPE_HEADER = 'header';
const ERROR_TYPE_IMPORT = 'import';
const ERROR_TYPE_THIN_PAGE = 'thin-page';

function gitLines(args) {
  const output = execFileSync('git', args, { encoding: 'utf8' });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getTargetFiles() {
  const explicitArgs = process.argv.slice(2).filter((arg) => arg !== '--staged');
  if (explicitArgs.length > 0) {
    return explicitArgs;
  }
  return gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
}

function resolveBypassFile(targetFiles) {
  if (process.env[SKIP_STRUCTURE_ENV] !== '1') {
    return null;
  }

  const approval = process.env[SKIP_STRUCTURE_APPROVED_ENV];
  const reason = process.env[SKIP_STRUCTURE_REASON_ENV]?.trim();
  const bypassFile = process.env[SKIP_STRUCTURE_FILE_ENV]?.trim();

  if (approval !== '1') {
    console.error(
      `Structure bypass requires ${SKIP_STRUCTURE_APPROVED_ENV}=1 after consulting the user and receiving explicit approval.`,
    );
    process.exit(1);
  }

  if (!reason) {
    console.error(
      `Structure bypass requires a non-empty ${SKIP_STRUCTURE_REASON_ENV} so the approved exception is documented.`,
    );
    process.exit(1);
  }

  if (!bypassFile || bypassFile.includes(',')) {
    console.error(
      `Structure bypass requires exactly one file via ${SKIP_STRUCTURE_FILE_ENV}=path/to/file.js.`,
    );
    process.exit(1);
  }

  if (!targetFiles.includes(bypassFile)) {
    console.error(
      `Structure bypass file ${bypassFile} is not part of the checked file set. Stage that file or clear the bypass env vars.`,
    );
    process.exit(1);
  }

  return {
    file: bypassFile,
    reason,
  };
}

function getCapInfo(relPath) {
  return fileCaps.find((entry) => entry.pattern.test(relPath)) ?? null;
}

function readFile(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function relImportTarget(relPath, specifier) {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const resolved = path
    .normalize(path.join(path.dirname(relPath), specifier))
    .replaceAll('\\', '/');
  return resolved;
}

function parseImports(source) {
  const imports = [];
  const importRegex = /import\s+(?:[^'"]+?\s+from\s+)?['"]([^'"]+)['"]/g;
  for (let match = importRegex.exec(source); match !== null; match = importRegex.exec(source)) {
    imports.push(match[1]);
  }
  return imports;
}

function hasRequiredHeader(relPath, source) {
  if (!/^(pages|components|hooks|lib)\/.+\.(js|mjs)$/.test(relPath)) {
    return true;
  }

  const firstLine = source.split(/\r?\n/, 1)[0] ?? '';
  return /^\/\/\s+\S.+\s+—\s+\S.+$/.test(firstLine);
}

function checkComponentImports(relPath, imports) {
  const errors = [];
  for (const specifier of imports) {
    const resolved = relImportTarget(relPath, specifier);
    const target = resolved ?? specifier;
    if (
      target.startsWith('hooks/') ||
      target.includes('/hooks/') ||
      target.startsWith('lib/') ||
      target.includes('/lib/')
    ) {
      errors.push({
        type: ERROR_TYPE_IMPORT,
        message: `${relPath}: components must not import hooks/lib (${specifier}). Pass data via props instead.`,
      });
    }
  }
  return errors;
}

function checkHookImports(relPath, imports) {
  const errors = [];
  for (const specifier of imports) {
    const resolved = relImportTarget(relPath, specifier);
    const target = resolved ?? specifier;
    if (target.startsWith('components/') || target.includes('/components/')) {
      errors.push({
        type: ERROR_TYPE_IMPORT,
        message: `${relPath}: hooks must not import components (${specifier}).`,
      });
    }
  }
  return errors;
}

function checkLibImports(relPath, imports) {
  const errors = [];
  for (const specifier of imports) {
    const resolved = relImportTarget(relPath, specifier);
    const target = resolved ?? specifier;
    if (
      specifier === 'react' ||
      specifier.startsWith('react/') ||
      target.startsWith('hooks/') ||
      target.includes('/hooks/') ||
      target.startsWith('components/') ||
      target.includes('/components/')
    ) {
      errors.push({
        type: ERROR_TYPE_IMPORT,
        message: `${relPath}: lib files must not import React/hooks/components (${specifier}).`,
      });
    }
  }
  return errors;
}

function checkThinAppPage(relPath, source, imports) {
  if (!/^app\/.+\/page\.js$/.test(relPath)) {
    return [];
  }

  const errors = [];
  const forbiddenPatterns = [
    /['"]use client['"]/,
    /\buseState\s*\(/,
    /\buseEffect\s*\(/,
    /\buseMemo\s*\(/,
    /\buseRef\s*\(/,
    /\buseCallback\s*\(/,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      errors.push({
        type: ERROR_TYPE_THIN_PAGE,
        message: `${relPath}: app/**/page.js must stay a thin server route entry (${pattern}).`,
      });
    }
  }

  for (const specifier of imports) {
    const resolved = relImportTarget(relPath, specifier);
    const target = resolved ?? specifier;
    if (
      target.startsWith('components/') ||
      target.includes('/components/') ||
      target.startsWith('hooks/') ||
      target.includes('/hooks/') ||
      target.startsWith('lib/') ||
      target.includes('/lib/')
    ) {
      errors.push({
        type: ERROR_TYPE_THIN_PAGE,
        message: `${relPath}: app/**/page.js may not import components/hooks/lib directly (${specifier}).`,
      });
    }
  }

  return errors;
}

function checkFile(relPath) {
  const absolutePath = path.join(repoRoot, relPath);
  if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
    return [];
  }

  const errors = [];
  const source = readFile(relPath);
  const lineCount = source.split(/\r?\n/).length;
  const cap = getCapInfo(relPath);
  if (cap && lineCount > cap.cap) {
    errors.push({
      type: ERROR_TYPE_CAP,
      message: `${relPath}: ${lineCount} lines exceeds ${cap.cap}-line cap for ${cap.label}.`,
    });
  }

  if (!hasRequiredHeader(relPath, source)) {
    errors.push({
      type: ERROR_TYPE_HEADER,
      message: `${relPath}: missing required one-line file header comment ("// path — domain ownership").`,
    });
  }

  if (/\.(js|mjs)$/.test(relPath)) {
    const imports = parseImports(source);
    if (relPath.startsWith('components/')) {
      errors.push(...checkComponentImports(relPath, imports));
    }
    if (relPath.startsWith('hooks/')) {
      errors.push(...checkHookImports(relPath, imports));
    }
    if (relPath.startsWith('lib/')) {
      errors.push(...checkLibImports(relPath, imports));
    }
    errors.push(...checkThinAppPage(relPath, source, imports));
  }

  return errors;
}

const files = getTargetFiles();
if (files.length === 0) {
  process.exit(0);
}

const bypass = resolveBypassFile(files);
const checkedFiles = bypass ? files.filter((file) => file !== bypass.file) : files;
const errors = checkedFiles.flatMap(checkFile);
if (errors.length === 0) {
  if (bypass) {
    console.log(
      `Structure check skipped only for ${bypass.file} because ${SKIP_STRUCTURE_ENV}=1, ${SKIP_STRUCTURE_APPROVED_ENV}=1, and ${SKIP_STRUCTURE_REASON_ENV} was provided. Reason: ${bypass.reason}`,
    );
  }
  process.exit(0);
}

console.error('Structure check failed:');
for (const error of errors) {
  console.error(`  - ${error.message}`);
}
console.error('');
console.error(
  'These rules come from docs/NEXTJS_CODE_STRUCTURE.md and docs/SYSTEM_ARCHITECTURE.md.',
);
if (errors.some((error) => error.type === ERROR_TYPE_CAP)) {
  console.error(
    'If this hook fired for a specific file-size cap failure, use docs/STRUCTURE_REVIEW_ESCALATION.md before making further edits to that file.',
  );
  console.error(
    'A narrow approved bypass exists for exactly one named file: set PT_STRUCTURE_BYPASS=1, PT_STRUCTURE_BYPASS_APPROVED=1, PT_STRUCTURE_BYPASS_REASON="...", and PT_STRUCTURE_BYPASS_FILE=path/to/file.js only after consulting the user and receiving explicit approval.',
  );
  console.error(
    'Before retrying commit, run: npm run commit:preflight -- --message "Your title (pt-xxxx)" --trailer "Co-Authored-By: Codex GPT-5.4 <codex@openai.com>"',
  );
}
process.exit(1);
