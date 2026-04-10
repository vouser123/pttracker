import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const modulesFile = path.join(repoRoot, '.next', 'diagnostics', 'analyze', 'data', 'modules.data');

function parseArgs(argv) {
  const result = {
    surface: '',
    term: '',
    limit: 10,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--surface' && argv[i + 1]) {
      result.surface = argv[i + 1].toLowerCase();
      i += 1;
    } else if (arg === '--term' && argv[i + 1]) {
      result.term = argv[i + 1];
      i += 1;
    } else if (arg === '--limit' && argv[i + 1]) {
      result.limit = Number.parseInt(argv[i + 1], 10) || result.limit;
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    }
  }

  return result;
}

function printHelp() {
  console.log(`Usage:
  node scripts/dump-analyzer-module-graph.mjs --surface client --term GoTrueClient
  node scripts/dump-analyzer-module-graph.mjs --surface client --term RealtimeChannel

Options:
  --surface Analyzer surface to inspect: client or server
            Required so graph checks do not silently assume the wrong panel
  --term    Case-insensitive module-path substring to match
  --limit   Maximum matching modules to print (default: 10)
`);
}

function getAvailableSurfaces() {
  return ['client', 'server'];
}

function isSurfaceTagged(module, surface) {
  const ident = module?.ident || '';
  if (surface === 'client') {
    return ident.includes('[app-client]') || ident.includes('[client]');
  }
  if (surface === 'server') {
    return ident.includes('[app-ssr]') || ident.includes('[ssr]') || ident.includes('[server]');
  }
  return false;
}

function matchesSurface(module, surface) {
  const ident = module?.ident || '';
  if (!ident) {
    return true;
  }

  const taggedForClient = isSurfaceTagged(module, 'client');
  const taggedForServer = isSurfaceTagged(module, 'server');
  if (!taggedForClient && !taggedForServer) {
    return true;
  }

  return isSurfaceTagged(module, surface);
}

function extractJson(rawBuffer) {
  const start = rawBuffer.indexOf('{');
  if (start === -1) {
    throw new Error('No JSON payload found');
  }

  let inString = false;
  let escaped = false;
  let depth = 0;

  for (let i = start; i < rawBuffer.length; i += 1) {
    const ch = rawBuffer[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === 92) {
        escaped = true;
      } else if (ch === 34) {
        inString = false;
      }
      continue;
    }

    if (ch === 34) {
      inString = true;
    } else if (ch === 123) {
      depth += 1;
    } else if (ch === 125) {
      depth -= 1;
      if (depth === 0) {
        const jsonBytes = rawBuffer.subarray(start, i + 1);
        return { data: JSON.parse(jsonBytes.toString('utf8')), endIndex: i + 1 };
      }
    }
  }

  throw new Error('JSON payload did not terminate');
}

function decodeUint32BE(buffer) {
  const values = [];
  for (let offset = 0; offset < buffer.length; offset += 4) {
    values.push(buffer.readUInt32BE(offset));
  }
  return values;
}

function decodeCSR(rawBuffer, range, count) {
  const slice = rawBuffer.subarray(range.offset, range.offset + range.length);
  const values = decodeUint32BE(slice);
  const offsets = values.slice(0, count + 1);
  const edges = values.slice(count + 1);
  return { offsets, edges };
}

function getItemsFromCSR(graph, index) {
  const start = graph.offsets[index] ?? 0;
  const end = graph.offsets[index + 1] ?? graph.edges.length;
  return graph.edges.slice(start, end);
}

function uniqueByPath(indexes, modules) {
  const seen = new Set();
  const result = [];
  for (const index of indexes) {
    const module = modules[index];
    const key = module?.path ?? `#${index}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({ index, path: key });
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
const availableSurfaces = args.help ? [] : getAvailableSurfaces();

if (args.help || !args.term || !args.surface) {
  printHelp();
  if (!args.help) {
    if (!args.surface) {
      console.error(
        'Error: choose the analyzer surface first with --surface client or --surface server.',
      );
    }
    if (!args.term) {
      console.error('Error: provide --term <text>.');
    }
  }
  process.exit(args.help ? 0 : 1);
}

if (!availableSurfaces.includes(args.surface)) {
  const surfaceList = availableSurfaces.length > 0 ? availableSurfaces.join(', ') : 'none detected';
  console.error(
    `Error: analyzer surface "${args.surface}" is not available in this build. Available surfaces: ${surfaceList}.`,
  );
  process.exit(1);
}

const raw = await fs.readFile(modulesFile);
const { data, endIndex } = extractJson(raw);
const packed = raw.subarray(endIndex);

const dependents = decodeCSR(packed, data.module_dependents, data.modules.length);
const dependencies = decodeCSR(packed, data.module_dependencies, data.modules.length);
const asyncDependents = decodeCSR(packed, data.async_module_dependents, data.modules.length);
const asyncDependencies = decodeCSR(packed, data.async_module_dependencies, data.modules.length);

const term = args.term.toLowerCase();
const matches = data.modules
  .map((module, index) => ({ module, index }))
  .filter(({ module }) => (module.path || '').toLowerCase().includes(term))
  .filter(({ module }) => matchesSurface(module, args.surface))
  .slice(0, args.limit);

if (matches.length === 0) {
  console.log(`No analyzer modules matched "${args.term}".`);
  process.exit(0);
}

console.log(`Module graph file: ${path.relative(repoRoot, modulesFile)}`);
console.log(`Surface: ${args.surface}`);
console.log(`Matches for "${args.term}": ${matches.length}`);

for (const { module, index } of matches) {
  const directDependents = uniqueByPath(
    getItemsFromCSR(dependents, index).filter((moduleIndex) =>
      matchesSurface(data.modules[moduleIndex], args.surface),
    ),
    data.modules,
  );
  const directDependencies = uniqueByPath(
    getItemsFromCSR(dependencies, index).filter((moduleIndex) =>
      matchesSurface(data.modules[moduleIndex], args.surface),
    ),
    data.modules,
  );
  const asyncDependentList = uniqueByPath(
    getItemsFromCSR(asyncDependents, index).filter((moduleIndex) =>
      matchesSurface(data.modules[moduleIndex], args.surface),
    ),
    data.modules,
  );
  const asyncDependencyList = uniqueByPath(
    getItemsFromCSR(asyncDependencies, index).filter((moduleIndex) =>
      matchesSurface(data.modules[moduleIndex], args.surface),
    ),
    data.modules,
  );

  console.log('\n============================================================');
  console.log(`Module #${index}: ${module.path}`);
  console.log(`Ident: ${module.ident}`);

  console.log('Direct dependents:');
  if (directDependents.length === 0) {
    console.log('  - none');
  } else {
    for (const dependent of directDependents) {
      console.log(`  - [${dependent.index}] ${dependent.path}`);
    }
  }

  console.log('Direct dependencies:');
  if (directDependencies.length === 0) {
    console.log('  - none');
  } else {
    for (const dependency of directDependencies) {
      console.log(`  - [${dependency.index}] ${dependency.path}`);
    }
  }

  console.log('Async dependents:');
  if (asyncDependentList.length === 0) {
    console.log('  - none');
  } else {
    for (const dependent of asyncDependentList) {
      console.log(`  - [${dependent.index}] ${dependent.path}`);
    }
  }

  console.log('Async dependencies:');
  if (asyncDependencyList.length === 0) {
    console.log('  - none');
  } else {
    for (const dependency of asyncDependencyList) {
      console.log(`  - [${dependency.index}] ${dependency.path}`);
    }
  }
}
