import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const analyzeRoot = path.join(repoRoot, '.next', 'diagnostics', 'analyze', 'data');

function parseArgs(argv) {
  const result = {
    route: '',
    surface: '',
    term: '',
    limit: 10,
    routeProvided: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--route' && argv[i + 1]) {
      // On Windows/Git Bash, `--route /` expands `/` to the Git install path
      // (e.g. C:/Program Files/Git/). Detect that and normalise back to "/".
      const raw = argv[i + 1];
      const looksLikeExpandedRoot =
        /^[A-Za-z]:[/\\]/.test(raw) || // Windows absolute: C:\... or C:/...
        /^\/[A-Za-z]\//.test(raw) || // MSYS2/Git Bash: /c/ or /C/
        /Program.Files/i.test(raw); // explicit Git-for-Windows marker
      result.route = looksLikeExpandedRoot ? '/' : raw;
      result.routeProvided = true;
      i += 1;
    } else if (arg === '--root') {
      // Convenience flag — unambiguous root-route alias for Windows shells
      result.route = '/';
      result.routeProvided = true;
    } else if (arg === '--term' && argv[i + 1]) {
      result.term = argv[i + 1];
      i += 1;
    } else if (arg === '--surface' && argv[i + 1]) {
      result.surface = argv[i + 1].toLowerCase();
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
  node scripts/dump-analyzer-paths.mjs --root --surface client --term supabase
  node scripts/dump-analyzer-paths.mjs --route /sign-in --surface client --term GoTrueClient

Options:
  --root    Shorthand for the root route "/" — use this on Windows/Git Bash
            where bare --route / gets expanded to the Git install path
  --route   Route name from .next/diagnostics/analyze/data/
            Required unless you pass --root
            On Windows/Git Bash use --root instead of --route / for the root
  --surface Analyzer surface to inspect: client or server
            Required so bundle checks do not silently assume the wrong panel
  --term    Case-insensitive path substring to match in analyzer sources
  --limit   Maximum matching sources to print (default: 10)
`);
}

function getAvailableSurfaces() {
  return ['client', 'server'];
}

function matchesSurfaceFilename(filename, surface) {
  if (surface === 'client') {
    return filename.startsWith('[client-fs]/') || filename.includes('/_next/static/');
  }

  if (surface === 'server') {
    return filename.includes('.next/server/');
  }

  return false;
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
  const expectedOffsets = count + 1;
  const offsets = values.slice(0, expectedOffsets);
  const edges = values.slice(expectedOffsets);
  return { offsets, edges };
}

function getItemsFromCSR(graph, index) {
  const start = graph.offsets[index] ?? 0;
  const end = graph.offsets[index + 1] ?? graph.edges.length;
  return graph.edges.slice(start, end);
}

function normalizeRouteToFile(route) {
  if (route === '/') {
    return path.join(analyzeRoot, 'analyze.data');
  }

  const trimmed = route.replace(/^\/+/, '');
  return path.join(analyzeRoot, trimmed, 'analyze.data');
}

function buildSiblingsByParent(sources) {
  const siblingsByParent = new Map();

  for (let index = 0; index < sources.length; index += 1) {
    const parentIndex = sources[index].parent_source_index;
    if (parentIndex === null || parentIndex === undefined) {
      continue;
    }

    if (!siblingsByParent.has(parentIndex)) {
      siblingsByParent.set(parentIndex, []);
    }

    siblingsByParent.get(parentIndex).push(index);
  }

  return siblingsByParent;
}

function buildChain(sourceIndex, sources, siblingsByParent) {
  const chain = [];
  let current = sourceIndex;

  while (current !== null && current !== undefined && current >= 0) {
    const node = sources[current];
    const parentIndex = node.parent_source_index;
    const siblings = parentIndex === null ? [] : (siblingsByParent.get(parentIndex) ?? []);
    const siblingIndex = parentIndex === null ? 1 : siblings.indexOf(current) + 1;

    chain.push({
      sourceIndex: current,
      path: node.path || '(root)',
      parentIndex,
      siblingIndex,
      siblingCount: parentIndex === null ? 1 : siblings.length,
      siblingPaths:
        parentIndex === null ? [] : siblings.map((idx) => sources[idx].path || '(root)'),
    });

    current = parentIndex;
  }

  return chain;
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(2)} KB`;
}

const args = parseArgs(process.argv.slice(2));
const availableSurfaces = args.help ? [] : getAvailableSurfaces();

if (args.help || !args.term || !args.routeProvided || !args.surface) {
  printHelp();
  if (!args.help) {
    if (!args.routeProvided) {
      console.error('Error: pick the analyzer route first with --route <path> or --root.');
    }
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

const routeFile = normalizeRouteToFile(args.route);
const raw = await fs.readFile(routeFile);
const { data, endIndex } = extractJson(raw);
const packed = raw.subarray(endIndex);

const sourceChunkParts = decodeCSR(packed, data.source_chunk_parts, data.sources.length);
decodeCSR(packed, data.output_file_chunk_parts, data.output_files.length);

const siblingsByParent = buildSiblingsByParent(data.sources);

const term = args.term.toLowerCase();
const isSourceOnSurface = (index) => {
  const chunkPartIndexes = getItemsFromCSR(sourceChunkParts, index);
  return chunkPartIndexes.some((chunkIndex) => {
    const filename = data.output_files[data.chunk_parts[chunkIndex]?.output_file_index]?.filename;
    return Boolean(filename) && matchesSurfaceFilename(filename, args.surface);
  });
};

const matches = data.sources
  .map((source, index) => ({ source, index }))
  .filter(({ source }) => (source.path || '').toLowerCase().includes(term))
  .filter(({ index }) => isSourceOnSurface(index))
  .slice(0, args.limit);

if (matches.length === 0) {
  console.log(`No analyzer sources matched "${args.term}" in route ${args.route}.`);
  process.exit(0);
}

console.log(`Route: ${args.route}`);
console.log(`Surface: ${args.surface}`);
console.log(`Analyzer file: ${path.relative(repoRoot, routeFile)}`);
console.log(
  'Note: mixed files can appear in both surfaces because the route source export can list both client and server output chunks.',
);
console.log(`Matches for "${args.term}": ${matches.length}`);

for (const { index, source } of matches) {
  const chunkPartIndexes = getItemsFromCSR(sourceChunkParts, index);
  const chunkParts = chunkPartIndexes
    .map((chunkIndex) => data.chunk_parts[chunkIndex])
    .filter(Boolean);
  const totalSize = chunkParts.reduce((sum, part) => sum + (part.size || 0), 0);
  const totalCompressed = chunkParts.reduce((sum, part) => sum + (part.compressed_size || 0), 0);

  const outputFileIndexes = [...new Set(chunkParts.map((part) => part.output_file_index))];
  const outputFiles = outputFileIndexes
    .map((fileIndex) => data.output_files[fileIndex]?.filename)
    .filter(Boolean);

  const chain = buildChain(index, data.sources, siblingsByParent);

  console.log('\n============================================================');
  console.log(`Source #${index}: ${source.path}`);
  console.log(
    `Estimated size: ${formatBytes(totalCompressed)} compressed, ${formatBytes(totalSize)} uncompressed`,
  );
  console.log('Output files:');
  for (const filename of outputFiles) {
    console.log(`  - ${filename}`);
  }

  console.log('Chain:');
  for (const node of chain) {
    const siblingInfo =
      node.parentIndex === null ? '' : ` [option ${node.siblingIndex}/${node.siblingCount}]`;
    console.log(`  - ${node.path}${siblingInfo}`);
    if (node.siblingCount > 1) {
      console.log(`    siblings: ${node.siblingPaths.join(' | ')}`);
    }
  }
}
