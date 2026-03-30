import fs from "fs";
import path from "path";

const repoRoot = process.cwd();
const appRoot = path.join(repoRoot, "app");
const docsRoot = path.join(repoRoot, "docs");
const outputPath = path.join(docsRoot, "AI_CONTEXT.md");

const textExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const routeEntryFiles = new Set([
  "page",
  "layout",
  "loading",
  "error",
  "not-found",
  "route",
]);

const toPosixPath = (value) => value.split(path.sep).join("/");

const readDirSafe = (dirPath) => {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
};

const listFiles = (rootDir) => {
  const results = [];
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = readDirSafe(current);
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      results.push(fullPath);
    }
  }
  return results;
};

const listPageFiles = () => {
  if (!fs.existsSync(appRoot)) {
    return [];
  }
  return listFiles(appRoot).filter((filePath) => {
    if (!filePath.endsWith(path.sep + "page.js") &&
        !filePath.endsWith(path.sep + "page.jsx") &&
        !filePath.endsWith(path.sep + "page.ts") &&
        !filePath.endsWith(path.sep + "page.tsx")) {
      return false;
    }
    return true;
  });
};

const isGroupSegment = (segment) => segment.startsWith("(") && segment.endsWith(")");

const routeFromPagePath = (pagePath) => {
  const relative = path.relative(appRoot, pagePath);
  const segments = toPosixPath(relative).split("/");
  segments.pop();
  const filtered = segments.filter((segment) => segment && !isGroupSegment(segment));
  if (filtered.length === 0) {
    return "/";
  }
  return `/${filtered.join("/")}`;
};

const getRouteDirectory = (pagePath) => path.dirname(pagePath);

const listRouteLocalFiles = (routeDir) => {
  const entries = readDirSafe(routeDir);
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => textExtensions.has(path.extname(name)))
    .filter((name) => !routeEntryFiles.has(path.parse(name).name))
    .sort((a, b) => a.localeCompare(b));
  return files;
};

const listTopLevelFiles = (dirName) => {
  const target = path.join(repoRoot, dirName);
  if (!fs.existsSync(target)) {
    return { count: 0, files: [] };
  }
  const files = readDirSafe(target)
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  return { count: files.length, files };
};

const countFiles = (dirName) => {
  const target = path.join(repoRoot, dirName);
  if (!fs.existsSync(target)) {
    return 0;
  }
  return listFiles(target).length;
};

const readDocsActiveSection = () => {
  const docsReadmePath = path.join(docsRoot, "README.md");
  if (!fs.existsSync(docsReadmePath)) {
    return [];
  }
  const content = fs.readFileSync(docsReadmePath, "utf8");
  const lines = content.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === "## Active Docs");
  if (startIndex === -1) {
    return [];
  }
  const items = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      break;
    }
    if (line.trim().startsWith("- [")) {
      items.push(line.trim().replace(/\(.*?\)/, "").replace(/^- /, ""));
    }
  }
  return items;
};

const pageFiles = listPageFiles();
const routes = pageFiles.map((pagePath) => {
  const routeDir = getRouteDirectory(pagePath);
  const urlPath = routeFromPagePath(pagePath);
  const localFiles = listRouteLocalFiles(routeDir);
  const hasProtectedGroup = toPosixPath(pagePath).includes("/(protected)/");
  return {
    pagePath: toPosixPath(path.relative(repoRoot, pagePath)),
    routeDir: toPosixPath(path.relative(repoRoot, routeDir)),
    urlPath,
    localFiles,
    hasProtectedGroup,
  };
}).sort((a, b) => a.urlPath.localeCompare(b.urlPath));

const protectedRoutes = routes.filter((route) => route.hasProtectedGroup).map((route) => route.urlPath);

const componentsInfo = listTopLevelFiles("components");
const hooksInfo = listTopLevelFiles("hooks");
const libInfo = listTopLevelFiles("lib");

const now = new Date();
const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
  now.getDate(),
).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(
  2,
  "0",
)} ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;

const renderList = (items) => items.map((item) => `- ${item}`).join("\n");

const renderRoutes = () => {
  if (routes.length === 0) {
    return "- (No App Router routes found)";
  }
  return routes
    .map((route) => {
      const localFiles = route.localFiles.length ? ` (local: ${route.localFiles.join(", ")})` : "";
      return `- \`${route.urlPath}\` → \`${route.pagePath}\`${localFiles}`;
    })
    .join("\n");
};

const renderFolderSummary = (label, info, totalCount) => {
  const files = info.files.length ? info.files.join(", ") : "None";
  return `- ${label}: ${totalCount} files (top-level: ${files})`;
};

const docsList = readDocsActiveSection();

const output = `# AI Context (Generated)

Last generated: ${timestamp}

## Routes (App Router)

${renderRoutes()}

## Protected Routes

${protectedRoutes.length ? renderList(protectedRoutes.map((route) => `\`${route}\``)) : "- None detected"}

## Key Folders

${renderFolderSummary("app/", { files: [] }, countFiles("app"))}
${renderFolderSummary("components/", componentsInfo, countFiles("components"))}
${renderFolderSummary("hooks/", hooksInfo, countFiles("hooks"))}
${renderFolderSummary("lib/", libInfo, countFiles("lib"))}

## Active Docs

${docsList.length ? renderList(docsList) : "- See docs/README.md for active docs"}

## Regenerate

\`node scripts/generate-ai-context.mjs\`
`;

fs.mkdirSync(docsRoot, { recursive: true });
fs.writeFileSync(outputPath, output, "utf8");

console.log(`Wrote ${toPosixPath(path.relative(repoRoot, outputPath))}`);
