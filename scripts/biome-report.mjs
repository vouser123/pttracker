#!/usr/bin/env node

// scripts/biome-report.mjs — write a machine-readable Biome report to the shared backup log area.

import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BIOME_LOG_PATH = 'C:\\Users\\cindi\\OneDrive\\Documents\\PT_Backup\\biome\\logs';
const BIOME_BIN = path.join(process.cwd(), 'node_modules', '@biomejs', 'biome', 'bin', 'biome');
const DEFAULT_REPORTER = 'json';
const DEFAULT_TARGET = '.';
const DEFAULT_MAX_DIAGNOSTICS = 'none';

function formatTimestamp(date = new Date()) {
  return date
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\.\d{3}Z$/, '')
    .replace('T', '_');
}

function parseArgs(argv) {
  let reporter = DEFAULT_REPORTER;
  let maxDiagnostics = DEFAULT_MAX_DIAGNOSTICS;
  let name = '';
  const targets = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--reporter') {
      reporter = argv[index + 1] || DEFAULT_REPORTER;
      index += 1;
      continue;
    }
    if (arg.startsWith('--reporter=')) {
      reporter = arg.slice('--reporter='.length) || DEFAULT_REPORTER;
      continue;
    }
    if (arg === '--max-diagnostics') {
      maxDiagnostics = argv[index + 1] || DEFAULT_MAX_DIAGNOSTICS;
      index += 1;
      continue;
    }
    if (arg.startsWith('--max-diagnostics=')) {
      maxDiagnostics = arg.slice('--max-diagnostics='.length) || DEFAULT_MAX_DIAGNOSTICS;
      continue;
    }
    if (arg === '--name') {
      name = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (arg.startsWith('--name=')) {
      name = arg.slice('--name='.length);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/biome-report.mjs [target ...] [--reporter json|json-pretty|sarif] [--max-diagnostics none|N] [--name label]

Examples:
  npm run biome:report
  npm run biome:report -- app components
  npm run biome:report -- app --name app-slice
  npm run biome:report -- . --reporter sarif`);
      process.exit(0);
    }
    targets.push(arg);
  }

  return {
    reporter,
    maxDiagnostics,
    name,
    targets: targets.length > 0 ? targets : [DEFAULT_TARGET],
  };
}

function sanitizeName(value) {
  if (!value) {
    return '';
  }

  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

function normalizeBiomeJsonPaths(rawText) {
  return rawText.replace(/"path":"([^"]*)"/g, (_match, value) => {
    return `"path":"${value.replace(/\\/g, '\\\\')}"`;
  });
}

const options = parseArgs(process.argv.slice(2));
const timestamp = formatTimestamp();
const safeName = sanitizeName(options.name);
const baseNameParts = ['biome-check', timestamp];
if (safeName) {
  baseNameParts.push(safeName);
}
const baseName = baseNameParts.join('-');
const extension = options.reporter === 'sarif' ? 'sarif' : 'json';
const reportPath = path.join(BIOME_LOG_PATH, `${baseName}.${extension}`);
const latestPath = path.join(BIOME_LOG_PATH, `biome-check-latest.${extension}`);
const metaPath = path.join(BIOME_LOG_PATH, `${baseName}.meta.json`);
const latestMetaPath = path.join(BIOME_LOG_PATH, 'biome-check-latest.meta.json');

mkdirSync(BIOME_LOG_PATH, { recursive: true });

const result = spawnSync(
  process.execPath,
  [
    BIOME_BIN,
    'check',
    ...options.targets,
    '--max-diagnostics',
    options.maxDiagnostics,
    '--reporter',
    options.reporter,
    '--reporter-file',
    reportPath,
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      BIOME_LOG_PATH,
    },
  },
);

const metadata = {
  createdAt: new Date().toISOString(),
  cwd: process.cwd(),
  reporter: options.reporter,
  maxDiagnostics: options.maxDiagnostics,
  targets: options.targets,
  reportPath,
  latestPath,
  exitCode: result.status ?? 1,
};

writeFileSync(metaPath, `${JSON.stringify(metadata, null, 2)}\n`);
copyFileSync(metaPath, latestMetaPath);

if (result.status === 0 || result.status === 1) {
  if (options.reporter === 'json' || options.reporter === 'json-pretty') {
    const normalizedReportText = normalizeBiomeJsonPaths(readFileSync(reportPath, 'utf8'));
    writeFileSync(reportPath, normalizedReportText);
  }
  copyFileSync(reportPath, latestPath);
}

console.log(`Biome report saved to ${reportPath}`);
console.log(`Latest report alias updated at ${latestPath}`);
console.log(`Report metadata saved to ${metaPath}`);

process.exit(result.status ?? 1);
