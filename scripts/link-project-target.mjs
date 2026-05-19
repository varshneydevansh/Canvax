#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const exportsRoot = resolve(projectRoot, "exports");
const outputRoot = resolve(projectRoot, "artifacts", "canvax");
const latestJsonPath = resolve(exportsRoot, "canvax-project-link-latest.json");
const latestMarkdownPath = resolve(exportsRoot, "canvax-project-link-latest.md");
const codexOutputManifestPath = resolve(outputRoot, "codex-output.json");

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

try {
  const result = await buildProjectLink(args);
  printResult(result, args.json);
  if (!result.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  const result = {
    ok: false,
    kind: "canvax-project-link",
    requiresOpenAiApiKey: false,
    error: error instanceof Error ? error.message : String(error),
  };
  printResult(result, args.json);
  process.exitCode = 1;
}

async function buildProjectLink(options) {
  const targetRoot = options.targetRoot
    ? resolveProjectPath(options.targetRoot)
    : process.cwd();
  const name = options.name || basename(targetRoot) || "Linked project";
  const frameIds = options.frames.length ? options.frames : ["frame-current"];
  const rawFiles = [
    ...options.routes.map((path) => ({ role: "route", path })),
    ...options.components.map((path) => ({ role: "component", path })),
    ...options.cssFiles.map((path) => ({ role: "stylesheet", path })),
    ...options.files,
  ];

  if (!rawFiles.length && !options.previewPath && !options.url) {
    throw new Error(
      "Provide at least one --route, --component, --css, --file, --preview-path, or --url.",
    );
  }

  const linkedFiles = await Promise.all(
    rawFiles.map((file, index) =>
      inspectLinkedFile(file, index, targetRoot, frameIds),
    ),
  );
  const previewPath = options.previewPath
    ? normalizeOutputPath(resolveAgainstTargetRoot(options.previewPath, targetRoot))
    : firstPreviewPath(linkedFiles);
  const projectLink = {
    ok: true,
    kind: "canvax-project-link",
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    requiresOpenAiApiKey: false,
    dryRun: options.dryRun,
    name,
    targetRoot: normalizeOutputPath(targetRoot),
    frameIds,
    previewUrl: options.url,
    previewPath,
    linkedFiles,
    codexEditContract: buildCodexEditContract({
      name,
      frameIds,
      targetRoot,
      linkedFiles,
      previewPath,
      url: options.url,
    }),
    manifest: buildManifest({
      name,
      frameIds,
      linkedFiles,
      previewPath,
      url: options.url,
    }),
    outputs: {
      projectLinkJson: toProjectRelative(latestJsonPath),
      projectLinkMarkdown: toProjectRelative(latestMarkdownPath),
      codexOutputManifest: toProjectRelative(codexOutputManifestPath),
    },
    noApiBoundary:
      "Project linking scans local files and writes local manifests only. It does not call image APIs, hosted models, or paid APIs.",
  };

  if (!options.dryRun) {
    await mkdir(exportsRoot, { recursive: true });
    await writeFile(latestJsonPath, `${JSON.stringify(projectLink, null, 2)}\n`);
    await writeFile(latestMarkdownPath, buildMarkdown(projectLink));
    if (!options.noPublish) {
      await mkdir(outputRoot, { recursive: true });
      await writeFile(
        codexOutputManifestPath,
        `${JSON.stringify(projectLink.manifest, null, 2)}\n`,
      );
    }
  }

  return {
    ...projectLink,
    saved: !options.dryRun,
    published: !options.dryRun && !options.noPublish,
  };
}

async function inspectLinkedFile(file, index, targetRoot, frameIds) {
  const absolutePath = resolveAgainstTargetRoot(file.path, targetRoot);
  const normalizedPath = normalizeOutputPath(absolutePath);
  let content = "";
  let fileStat = null;
  let exists = true;
  try {
    fileStat = await stat(absolutePath);
    content = await readFile(absolutePath, "utf8");
  } catch {
    exists = false;
  }
  const ext = extname(absolutePath).toLowerCase();
  const role = normalizeRole(file.role, ext);
  const summary = exists
    ? summarizeFile(content, ext, role)
    : { kind: role, status: "missing" };
  return {
    id: `linked-file-${index + 1}`,
    role,
    path: normalizedPath,
    projectRelativePath: relative(targetRoot, absolutePath),
    label: file.label || basename(absolutePath) || `Linked file ${index + 1}`,
    exists,
    bytes: fileStat?.size || 0,
    frameIds,
    summary,
  };
}

function buildCodexEditContract({ name, frameIds, targetRoot, linkedFiles }) {
  const editableFiles = linkedFiles
    .filter((file) => file.exists)
    .map((file) => ({
      path: file.path,
      role: file.role,
      frameIds: file.frameIds,
      preserveBindings: file.summary?.bindings || [],
      designSignals: file.summary?.signals || [],
    }));
  return {
    kind: "canvax-project-edit-contract",
    schemaVersion: 1,
    requiresOpenAiApiKey: false,
    projectName: name,
    targetRoot: normalizeOutputPath(targetRoot),
    frameIds,
    editableFiles,
    acceptanceCriteria: [
      "Keep frame-bound files listed in artifacts/canvax/codex-output.json.",
      "Preserve data-canvax-node-id bindings when they exist.",
      "Preserve or update design-token colors intentionally.",
      "Publish changed files back through npm run project-link or npm run codex-output.",
      "Run the app/project tests when the linked project has them.",
    ],
  };
}

function buildManifest({ name, frameIds, linkedFiles, previewPath, url }) {
  const changes = linkedFiles.map((file, index) => ({
    id: `project-link-change-${index + 1}`,
    path: file.path,
    label: file.label,
    kind: file.exists ? "linked" : "missing",
    summary: `${labelForRole(file.role)} linked from ${name}.`,
    frameIds: file.frameIds,
    source: "canvax-project-link",
  }));
  const targets =
    url || previewPath
      ? [
          {
            id: "project-link-primary",
            label: `${name} linked preview`,
            source: "canvax-project-link",
            type: "implementation-preview",
            url,
            previewPath,
            description:
              "A local app/project surface linked to the current Canvax frame.",
            frameIds,
          },
        ]
      : [];
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    source: "canvax-project-link",
    previewUrl: url || "",
    notes:
      "Canvax project link manifest. It binds existing local app files to a Canvax frame so Codex can edit the real project instead of only generated fixtures.",
    targets,
    changes,
    artifacts: [
      {
        id: "project-link",
        path: toProjectRelative(latestJsonPath),
        label: "canvax-project-link-latest.json",
        kind: "artifact",
        description: "Machine-readable Canvax to local project link.",
        frameIds,
      },
      {
        id: "project-link-doc",
        path: toProjectRelative(latestMarkdownPath),
        label: "canvax-project-link-latest.md",
        kind: "artifact",
        description: "Human-readable Canvax to local project link summary.",
        frameIds,
      },
    ],
  };
}

function summarizeFile(content, ext, role) {
  const colors = uniqueMatches(content, /#[0-9a-fA-F]{3,8}\b/g).slice(0, 12);
  const bindings = uniqueMatches(
    content,
    /data-canvax-node-id=["']([^"']+)["']/g,
    1,
  ).slice(0, 20);
  if (ext === ".html" || role === "route") {
    return {
      kind: "html-route",
      headings: uniqueMatches(content, /<h[1-3][^>]*>(.*?)<\/h[1-3]>/gis, 1)
        .map(stripTags)
        .slice(0, 8),
      actions: uniqueMatches(content, /<(?:button|a)\b[^>]*>(.*?)<\/(?:button|a)>/gis, 1)
        .map(stripTags)
        .filter(Boolean)
        .slice(0, 12),
      bindings,
      colors,
      signals: inferSignals(content),
    };
  }
  if ([".jsx", ".tsx", ".js", ".ts"].includes(ext) || role === "component") {
    return {
      kind: "component",
      exports: uniqueMatches(
        content,
        /export\s+(?:default\s+)?(?:function|const|class)\s+([A-Za-z0-9_]+)/g,
        1,
      ).slice(0, 12),
      components: uniqueComponentNames(content).slice(0, 12),
      bindings,
      colors,
      signals: inferSignals(content),
    };
  }
  if (ext === ".css" || role === "stylesheet") {
    return {
      kind: "stylesheet",
      customProperties: uniqueMatches(content, /(--[A-Za-z0-9-_]+)\s*:/g, 1)
        .slice(0, 24),
      selectors: uniqueMatches(content, /(^|[}\n])\s*([.#][^{\n]+)\s*\{/g, 2)
        .map((value) => value.trim())
        .slice(0, 20),
      colors,
      signals: inferSignals(content),
    };
  }
  return {
    kind: role || "file",
    colors,
    bindings,
    signals: inferSignals(content),
  };
}

function uniqueComponentNames(content) {
  const names = [];
  const patterns = [
    /function\s+([A-Z][A-Za-z0-9_]*)/g,
    /const\s+([A-Z][A-Za-z0-9_]*)\s*=/g,
    /class\s+([A-Z][A-Za-z0-9_]*)/g,
  ];
  patterns.forEach((pattern) => {
    uniqueMatches(content, pattern, 1).forEach((name) => {
      if (!names.includes(name)) {
        names.push(name);
      }
    });
  });
  return names;
}

function inferSignals(content) {
  const checks = [
    ["hero", /\bhero\b/i],
    ["navigation", /\b(nav|navigation|menu)\b/i],
    ["form", /\b(form|input|textarea|select)\b/i],
    ["responsive", /@media|\bclamp\(|\bminmax\(/i],
    ["animation", /transition|animation|transform/i],
    ["accessibility", /aria-|alt=|role=/i],
    ["canvax-binding", /data-canvax-node-id/i],
  ];
  return checks
    .filter(([, pattern]) => pattern.test(content))
    .map(([label]) => label);
}

function firstPreviewPath(linkedFiles) {
  const html = linkedFiles.find(
    (file) => file.exists && file.path.toLowerCase().endsWith(".html"),
  );
  return html?.path || "";
}

function uniqueMatches(content, pattern, captureIndex = 0) {
  const values = [];
  for (const match of content.matchAll(pattern)) {
    const value = String(match[captureIndex] || "").trim();
    if (value && !values.includes(value)) {
      values.push(value);
    }
  }
  return values;
}

function normalizeRole(role, ext) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized) {
    return normalized;
  }
  if (ext === ".html") {
    return "route";
  }
  if ([".jsx", ".tsx", ".js", ".ts"].includes(ext)) {
    return "component";
  }
  if (ext === ".css") {
    return "stylesheet";
  }
  return "file";
}

function labelForRole(role) {
  return (
    {
      route: "Route",
      component: "Component",
      stylesheet: "Stylesheet",
    }[role] || "File"
  );
}

function parseArgs(input) {
  const parsed = {
    help: false,
    json: false,
    dryRun: false,
    noPublish: false,
    name: "",
    targetRoot: "",
    url: "",
    previewPath: "",
    frames: [],
    routes: [],
    components: [],
    cssFiles: [],
    files: [],
  };
  for (let index = 0; index < input.length; index += 1) {
    const value = input[index];
    if (value === "--help" || value === "-h") {
      parsed.help = true;
    } else if (value === "--json") {
      parsed.json = true;
    } else if (value === "--dry-run") {
      parsed.dryRun = true;
    } else if (value === "--no-publish") {
      parsed.noPublish = true;
    } else if (value === "--name") {
      parsed.name = readNext(input, index, value);
      index += 1;
    } else if (value === "--target-root") {
      parsed.targetRoot = readNext(input, index, value);
      index += 1;
    } else if (value === "--url") {
      parsed.url = readNext(input, index, value);
      index += 1;
    } else if (value === "--preview-path") {
      parsed.previewPath = readNext(input, index, value);
      index += 1;
    } else if (value === "--frame") {
      parsed.frames.push(readNext(input, index, value));
      index += 1;
    } else if (value === "--route") {
      parsed.routes.push(readNext(input, index, value));
      index += 1;
    } else if (value === "--component") {
      parsed.components.push(readNext(input, index, value));
      index += 1;
    } else if (value === "--css") {
      parsed.cssFiles.push(readNext(input, index, value));
      index += 1;
    } else if (value === "--file") {
      parsed.files.push(parseFileArg(readNext(input, index, value)));
      index += 1;
    }
  }
  return parsed;
}

function parseFileArg(value) {
  const [role = "file", path = "", label = ""] = value.split("::");
  return {
    role: role.trim() || "file",
    path: path.trim(),
    label: label.trim(),
  };
}

function readNext(input, index, flag) {
  const value = input[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value.trim();
}

function resolveAgainstTargetRoot(path, targetRoot) {
  return resolve(path.startsWith("/") ? path : resolve(targetRoot, path));
}

function resolveProjectPath(path) {
  return resolve(path.startsWith("/") ? path : resolve(projectRoot, path));
}

function normalizeOutputPath(path) {
  const relativePath = toProjectRelative(path);
  return relativePath || path;
}

function toProjectRelative(path) {
  const resolved = resolve(path);
  const rel = relative(projectRoot, resolved);
  return rel && !rel.startsWith("..") && !rel.startsWith("/")
    ? rel
    : resolved;
}

function stripTags(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildMarkdown(link) {
  const lines = [
    "# Canvax Project Link",
    "",
    `- Project: ${link.name}`,
    `- Created: ${link.createdAt}`,
    `- Target root: ${link.targetRoot}`,
    `- Frames: ${link.frameIds.join(", ")}`,
    `- Preview URL: ${link.previewUrl || "none"}`,
    `- Preview path: ${link.previewPath || "none"}`,
    `- Requires OpenAI API key: ${link.requiresOpenAiApiKey ? "yes" : "no"}`,
    "",
    "## Linked Files",
    "",
  ];
  link.linkedFiles.forEach((file) => {
    lines.push(
      `- ${file.role}: ${file.path} (${file.exists ? `${file.bytes} bytes` : "missing"})`,
    );
  });
  lines.push(
    "",
    "## Codex Edit Contract",
    "",
    "Codex should treat these files as the real implementation surface for the linked frame. Preserve `data-canvax-node-id` bindings when present, publish changed files through the Codex output manifest, and keep the linked preview target up to date.",
    "",
    "## No API Boundary",
    "",
    link.noApiBoundary,
    "",
  );
  return `${lines.join("\n")}\n`;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (!result.ok) {
    console.error(result.error || "Project link failed.");
    return;
  }
  console.log(
    `${result.dryRun ? "Dry run prepared" : "Saved"} Canvax project link for ${result.name}`,
  );
  console.log(`Linked files: ${result.linkedFiles.length}`);
  console.log(`Published manifest: ${result.published ? "yes" : "no"}`);
  console.log(`Project link: ${result.outputs.projectLinkJson}`);
}

function printHelp() {
  console.log(`link-project-target

Usage:
  node scripts/link-project-target.mjs --target-root ../app --frame frame-home --route src/app/page.html --component src/Hero.jsx --css src/styles.css
  node scripts/link-project-target.mjs --target-root ../app --url http://localhost:3000 --frame frame-home --file route::src/app/page.tsx::Home route
  node scripts/link-project-target.mjs --target-root .canvax/project-link-fixture --dry-run --json --route index.html

Writes:
  exports/canvax-project-link-latest.json
  exports/canvax-project-link-latest.md
  artifacts/canvax/codex-output.json unless --dry-run or --no-publish is used

No API key is required.`);
}
