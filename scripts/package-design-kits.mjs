#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const designKitsRoot = resolve(projectRoot, "design-kits");
const exportsRoot = resolve(projectRoot, "exports");
const defaultJsonPath = resolve(
  exportsRoot,
  "canvax-design-kit-library-latest.json",
);
const defaultMarkdownPath = resolve(
  exportsRoot,
  "canvax-design-kit-library-latest.md",
);

const args = process.argv.slice(2);
const wantsHelp = args.includes("--help") || args.includes("-h");
const wantsJson = args.includes("--json");
const dryRun = args.includes("--dry-run");
const query = readOption(args, "--query");

if (wantsHelp) {
  printHelp();
  process.exit(0);
}

const result = await buildDesignKitLibrary({ query });
if (!result.ok) {
  if (wantsJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`fail: ${result.errors.length} design kit package issue(s)`);
    result.errors.forEach((error) => console.log(`- ${error}`));
  }
  process.exitCode = 1;
} else {
  const markdown = buildLibraryMarkdown(result.library);
  if (!dryRun) {
    await mkdir(exportsRoot, { recursive: true });
    await writeFile(defaultJsonPath, `${JSON.stringify(result.library, null, 2)}\n`);
    await writeFile(defaultMarkdownPath, markdown);
  }

  const payload = {
    ok: true,
    dryRun,
    jsonPath: dryRun ? "" : toProjectRelative(defaultJsonPath),
    markdownPath: dryRun ? "" : toProjectRelative(defaultMarkdownPath),
    library: result.library,
  };
  if (wantsJson) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(
      dryRun
        ? `Packaged ${result.library.kits.length}/${result.library.source.totalKitCount} design kits (dry run).`
        : `Packaged ${result.library.kits.length} design kits to ${payload.jsonPath}.`,
    );
  }
}

async function buildDesignKitLibrary(options = {}) {
  const searchQuery = cleanString(options.query);
  const errors = [];
  const kits = [];
  let entries = [];
  try {
    entries = await readdir(designKitsRoot, { withFileTypes: true });
  } catch (error) {
    return {
      ok: false,
      errors: [
        error instanceof Error
          ? error.message
          : "Unable to read design-kits directory.",
      ],
    };
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }
    const relativePath = `design-kits/${entry.name}`;
    const absolutePath = resolve(designKitsRoot, entry.name);
    try {
      const raw = await readFile(absolutePath, "utf8");
      const parsed = JSON.parse(raw);
      const kitErrors = validateKit(parsed, relativePath);
      if (kitErrors.length) {
        errors.push(...kitErrors);
        continue;
      }
      kits.push({
        id: parsed.id,
        label: parsed.label,
        path: relativePath,
        summary: parsed.summary,
        audience: parsed.audience,
        mood: parsed.mood,
        actionMode: parsed.actionMode,
        viewport: parsed.viewport,
        generation: parsed.generation,
        frame: parsed.frame,
        checksum: sha256(raw),
        kit: parsed,
      });
    } catch (error) {
      errors.push(
        `${relativePath}: ${error instanceof Error ? error.message : "invalid JSON"}`,
      );
    }
  }

  findDuplicates(kits.map((kit) => kit.id)).forEach((id) =>
    errors.push(`duplicate kit id: ${id}`),
  );
  if (errors.length) {
    return { ok: false, errors };
  }

  const visibleKits = searchQuery
    ? kits.filter((kit) => kitMatchesQuery(kit, searchQuery))
    : kits;
  const library = {
    schemaVersion: 1,
    kind: "canvax-design-kit-library",
    createdAt: new Date().toISOString(),
    requiresOpenAiApiKey: false,
    source: {
      root: "design-kits",
      query: searchQuery || null,
      totalKitCount: kits.length,
      packagedKitCount: visibleKits.length,
    },
    integrity: {
      algorithm: "sha256",
      checksum: sha256(
        JSON.stringify(
          visibleKits.map((kit) => ({
            id: kit.id,
            checksum: kit.checksum,
          })),
        ),
      ),
    },
    kits: visibleKits.map((kit) => ({
      id: kit.id,
      label: kit.label,
      path: kit.path,
      version: cleanString(kit.kit.version) || "0.0.0-local",
      summary: kit.summary,
      audience: kit.audience,
      mood: kit.mood,
      actionMode: kit.actionMode,
      viewport: kit.viewport,
      checksum: kit.checksum,
      generation: kit.generation,
      frame: kit.frame,
      kit: kit.kit,
    })),
    sharing: {
      install:
        "Copy selected library.kits[].kit objects into design-kits/<id>.json, then run npm run validate-design-kits.",
      validateCommand: "npm run validate-design-kits",
      discoverCommand: "npm run validate-design-kits -- --query <term>",
      packageCommand: "npm run package-design-kits",
      noApiBoundary:
        "This library package is built from local JSON files only; it does not call a hosted model, image API, or paid API.",
    },
  };

  return {
    ok: true,
    errors: [],
    library,
  };
}

function buildLibraryMarkdown(library) {
  const lines = [
    "# Canvax Design Kit Library",
    "",
    `- Created: ${library.createdAt}`,
    `- Requires OpenAI API key: ${library.requiresOpenAiApiKey ? "yes" : "no"}`,
    `- Kits packaged: ${library.source.packagedKitCount}/${library.source.totalKitCount}`,
    `- Query: ${library.source.query || "none"}`,
    `- Checksum: ${library.integrity.checksum}`,
    "",
    "## Kits",
    "",
    ...(library.kits.length
      ? library.kits.map(
          (kit) =>
            `- ${kit.label} (${kit.id}) - ${kit.path} - ${kit.checksum.slice(0, 12)}`,
        )
      : ["- No kits matched the query."]),
    "",
    "## Sharing",
    "",
    "- Copy a kit object from `library.kits[].kit` into `design-kits/<id>.json`.",
    "- Run `npm run validate-design-kits` after importing.",
    "- Run `npm run package-design-kits` to regenerate this library artifact.",
  ];
  return `${lines.join("\n")}\n`;
}

function validateKit(kit, relativePath) {
  const errors = [];
  if (!kit || typeof kit !== "object" || Array.isArray(kit)) {
    return [`${relativePath}: root must be an object`];
  }
  [
    "id",
    "label",
    "summary",
    "audience",
    "mood",
    "actionMode",
    "viewport",
  ].forEach((field) => {
    if (!cleanString(kit[field])) {
      errors.push(`${relativePath}: missing ${field}`);
    }
  });
  if (!kit.generation || typeof kit.generation !== "object") {
    errors.push(`${relativePath}: missing generation object`);
  } else {
    ["direction", "style", "focus"].forEach((field) => {
      if (!cleanString(kit.generation[field])) {
        errors.push(`${relativePath}: missing generation.${field}`);
      }
    });
  }
  if (!kit.frame || typeof kit.frame !== "object") {
    errors.push(`${relativePath}: missing frame object`);
  } else {
    ["objective", "layout", "motion", "assets", "mobile"].forEach((field) => {
      if (!cleanString(kit.frame[field])) {
        errors.push(`${relativePath}: missing frame.${field}`);
      }
    });
  }
  return errors;
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  });
  return [...duplicates];
}

function kitMatchesQuery(kit, searchQuery) {
  const needle = cleanString(searchQuery).toLowerCase();
  if (!needle) {
    return true;
  }
  return [
    kit.id,
    kit.label,
    kit.path,
    kit.summary,
    kit.audience,
    kit.mood,
    kit.actionMode,
    kit.viewport,
    kit.generation?.direction,
    kit.generation?.style,
    kit.generation?.focus,
    kit.frame?.objective,
    kit.frame?.layout,
    kit.frame?.motion,
    kit.frame?.assets,
    kit.frame?.mobile,
  ]
    .map((value) => cleanString(value).toLowerCase())
    .some((value) => value.includes(needle));
}

function readOption(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) {
    return "";
  }
  return cleanString(argv[index + 1]);
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toProjectRelative(path) {
  return path.replace(`${projectRoot}/`, "");
}

function printHelp() {
  console.log(`Canvax design-kit library packager

Usage:
  node scripts/package-design-kits.mjs
  node scripts/package-design-kits.mjs --query poster
  node scripts/package-design-kits.mjs --dry-run --json

Options:
  --query TERM  Package only kits matching TERM
  --json        Print the wrapper as JSON
  --dry-run     Do not write exports/canvax-design-kit-library-latest.*

This is a local no-API packager for design-kits/*.json.`);
}
