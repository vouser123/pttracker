#!/usr/bin/env node

// scripts/check-structure.mjs — enforce staged-file structure rules from NEXTJS_CODE_STRUCTURE.md.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

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
      errors.push(
        `${relPath}: components must not import hooks/lib (${specifier}). Pass data via props instead.`,
      );
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
      errors.push(`${relPath}: hooks must not import components (${specifier}).`);
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
      errors.push(`${relPath}: lib files must not import React/hooks/components (${specifier}).`);
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
      errors.push(`${relPath}: app/**/page.js must stay a thin server route entry (${pattern}).`);
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
      errors.push(
        `${relPath}: app/**/page.js may not import components/hooks/lib directly (${specifier}).`,
      );
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
    errors.push(`${relPath}: ${lineCount} lines exceeds ${cap.cap}-line cap for ${cap.label}.`);
  }

  if (!hasRequiredHeader(relPath, source)) {
    errors.push(
      `${relPath}: missing required one-line file header comment ("// path — domain ownership").`,
    );
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

const errors = files.flatMap(checkFile);
if (errors.length === 0) {
  process.exit(0);
}

console.error('Structure check failed:');
for (const error of errors) {
  console.error(`  - ${error}`);
}
console.error('');
console.error(
  'These rules come from docs/NEXTJS_CODE_STRUCTURE.md and docs/SYSTEM_ARCHITECTURE.md.',
);
console.error(
  'Do not bypass file-size caps or related structure rules without consulting the user and receiving explicit approval.',
);
process.exit(1);
