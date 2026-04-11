#!/usr/bin/env node

// scripts/biome-report-summary.mjs — summarize a Biome JSON report for agent triage.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BIOME_LOG_PATH = 'C:\\Users\\cindi\\OneDrive\\Documents\\PT_Backup\\biome\\logs';
const DEFAULT_LIMIT = 10;

function normalizeBiomeJsonPaths(rawText) {
  return rawText.replace(/"path":"([^"]*)"/g, (_match, value) => {
    return `"path":"${value.replace(/\\/g, '\\\\')}"`;
  });
}

function parseArgs(argv) {
  let reportPath = '';
  let limit = DEFAULT_LIMIT;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--limit') {
      limit = Number.parseInt(argv[index + 1] || String(DEFAULT_LIMIT), 10);
      index += 1;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      limit = Number.parseInt(arg.slice('--limit='.length), 10);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/biome-report-summary.mjs [report-path] [--limit N]

Examples:
  npm run biome:report:summary
  npm run biome:report:summary -- C:\\path\\to\\biome-check.json
  npm run biome:report:summary -- --limit 15`);
      process.exit(0);
    }
    if (!reportPath) {
      reportPath = arg;
    }
  }

  return {
    reportPath,
    limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
  };
}

function findLatestReportPath() {
  const latestAliasPath = path.join(BIOME_LOG_PATH, 'biome-check-latest.json');
  if (existsSync(latestAliasPath)) {
    return latestAliasPath;
  }

  const candidateNames = readdirSync(BIOME_LOG_PATH)
    .filter((name) => /^biome-check-.*\.json$/i.test(name) && !name.endsWith('.meta.json'))
    .sort();

  if (candidateNames.length === 0) {
    throw new Error(`No Biome JSON reports found in ${BIOME_LOG_PATH}`);
  }

  return path.join(BIOME_LOG_PATH, candidateNames.at(-1));
}

function bumpCount(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function sortEntriesDescending(entries) {
  return [...entries].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }
    return String(left[0]).localeCompare(String(right[0]));
  });
}

function formatSection(title, entries, limit) {
  const lines = [title];
  for (const [key, count] of entries.slice(0, limit)) {
    lines.push(`- ${count}  ${key}`);
  }
  if (entries.length === 0) {
    lines.push('- none');
  }
  return lines.join('\n');
}

const options = parseArgs(process.argv.slice(2));
const reportPath = options.reportPath || findLatestReportPath();
const reportText = readFileSync(reportPath, 'utf8');
let report;
try {
  report = JSON.parse(reportText);
} catch (_error) {
  report = JSON.parse(normalizeBiomeJsonPaths(reportText));
}
const diagnostics = Array.isArray(report.diagnostics) ? report.diagnostics : [];
const summary = report.summary || {};
const files = new Map();
const categories = new Map();
const severities = new Map();

for (const diagnostic of diagnostics) {
  const severity = diagnostic.severity || 'unknown';
  const category = diagnostic.category || 'unknown';
  const locationPath = diagnostic.location?.path || 'unknown';
  bumpCount(severities, severity);
  bumpCount(categories, category);
  bumpCount(files, locationPath);
}

const outputLines = [
  `Biome report: ${reportPath}`,
  `Command: ${report.command || 'check'}`,
  `Diagnostics: ${diagnostics.length}`,
  `Summary totals: errors=${summary.errors || 0}, warnings=${summary.warnings || 0}, infos=${summary.infos || 0}, changed=${summary.changed || 0}, unchanged=${summary.unchanged || 0}, skipped=${summary.skipped || 0}`,
  '',
  formatSection('Top files', sortEntriesDescending(files.entries()), options.limit),
  '',
  formatSection('Top rules', sortEntriesDescending(categories.entries()), options.limit),
  '',
  formatSection('Severity counts', sortEntriesDescending(severities.entries()), options.limit),
];

const summaryPath = reportPath.replace(/\.json$/i, '.summary.txt');
const outputText = `${outputLines.join('\n')}\n`;
writeFileSync(summaryPath, outputText);
console.log(outputText);
console.log(`Summary saved to ${summaryPath}`);
