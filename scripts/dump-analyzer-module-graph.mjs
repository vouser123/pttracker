import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const modulesFile = path.join(repoRoot, ".next", "diagnostics", "analyze", "data", "modules.data");

function parseArgs(argv) {
  const result = {
    term: "",
    limit: 10,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--term" && argv[i + 1]) {
      result.term = argv[i + 1];
      i += 1;
    } else if (arg === "--limit" && argv[i + 1]) {
      result.limit = Number.parseInt(argv[i + 1], 10) || result.limit;
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    }
  }

  return result;
}

function printHelp() {
  console.log(`Usage:
  node scripts/dump-analyzer-module-graph.mjs --term GoTrueClient
  node scripts/dump-analyzer-module-graph.mjs --term RealtimeChannel

Options:
  --term    Case-insensitive module-path substring to match
  --limit   Maximum matching modules to print (default: 10)
`);
}

function extractJson(text) {
  const start = text.indexOf("{");
  if (start === -1) {
    throw new Error("No JSON payload found");
  }

  let inString = false;
  let escaped = false;
  let depth = 0;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
    } else if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return { data: JSON.parse(text.slice(start, i + 1)), endIndex: i + 1 };
      }
    }
  }

  throw new Error("JSON payload did not terminate");
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
if (args.help || !args.term) {
  printHelp();
  process.exit(args.help ? 0 : 1);
}

const raw = await fs.readFile(modulesFile);
const text = raw.toString("utf8");
const { data, endIndex } = extractJson(text);
const prefixBytes = Buffer.byteLength(text.slice(0, endIndex), "utf8");
const packed = raw.subarray(prefixBytes);

const dependents = decodeCSR(packed, data.module_dependents, data.modules.length);
const dependencies = decodeCSR(packed, data.module_dependencies, data.modules.length);
const asyncDependents = decodeCSR(packed, data.async_module_dependents, data.modules.length);
const asyncDependencies = decodeCSR(packed, data.async_module_dependencies, data.modules.length);

const term = args.term.toLowerCase();
const matches = data.modules
  .map((module, index) => ({ module, index }))
  .filter(({ module }) => (module.path || "").toLowerCase().includes(term))
  .slice(0, args.limit);

if (matches.length === 0) {
  console.log(`No analyzer modules matched "${args.term}".`);
  process.exit(0);
}

console.log(`Module graph file: ${path.relative(repoRoot, modulesFile)}`);
console.log(`Matches for "${args.term}": ${matches.length}`);

for (const { module, index } of matches) {
  const directDependents = uniqueByPath(getItemsFromCSR(dependents, index), data.modules);
  const directDependencies = uniqueByPath(getItemsFromCSR(dependencies, index), data.modules);
  const asyncDependentList = uniqueByPath(getItemsFromCSR(asyncDependents, index), data.modules);
  const asyncDependencyList = uniqueByPath(getItemsFromCSR(asyncDependencies, index), data.modules);

  console.log("\n============================================================");
  console.log(`Module #${index}: ${module.path}`);
  console.log(`Ident: ${module.ident}`);

  console.log("Direct dependents:");
  if (directDependents.length === 0) {
    console.log("  - none");
  } else {
    for (const dependent of directDependents) {
      console.log(`  - [${dependent.index}] ${dependent.path}`);
    }
  }

  console.log("Direct dependencies:");
  if (directDependencies.length === 0) {
    console.log("  - none");
  } else {
    for (const dependency of directDependencies) {
      console.log(`  - [${dependency.index}] ${dependency.path}`);
    }
  }

  console.log("Async dependents:");
  if (asyncDependentList.length === 0) {
    console.log("  - none");
  } else {
    for (const dependent of asyncDependentList) {
      console.log(`  - [${dependent.index}] ${dependent.path}`);
    }
  }

  console.log("Async dependencies:");
  if (asyncDependencyList.length === 0) {
    console.log("  - none");
  } else {
    for (const dependency of asyncDependencyList) {
      console.log(`  - [${dependency.index}] ${dependency.path}`);
    }
  }
}
