#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const designKitsRoot = resolve(projectRoot, "design-kits");
const query = readOption(process.argv.slice(2), "--query");

const result = await validateDesignKits({ query });
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  if (query) {
    console.log(
      `ok: ${result.matchedCount}/${result.count} design kit files match "${query}"`,
    );
    result.kits.forEach((kit) =>
      console.log(`- ${kit.label} (${kit.id}) - ${kit.path}`),
    );
  } else {
    console.log(`ok: ${result.count} design kit files are valid`);
  }
} else {
  console.log(`fail: ${result.errors.length} design kit issue(s)`);
  result.errors.forEach((error) => console.log(`- ${error}`));
}

if (!result.ok) {
  process.exitCode = 1;
}

async function validateDesignKits(options = {}) {
  const searchQuery = cleanString(options.query);
  const errors = [];
  const kits = [];
  let entries = [];
  try {
    entries = await readdir(designKitsRoot, { withFileTypes: true });
  } catch (error) {
    return {
      ok: false,
      count: 0,
      kits: [],
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
    try {
      const parsed = JSON.parse(
        await readFile(resolve(designKitsRoot, entry.name), "utf8"),
      );
      const kitErrors = validateKit(parsed, relativePath);
      if (kitErrors.length) {
        errors.push(...kitErrors);
      } else {
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
        });
      }
    } catch (error) {
      errors.push(
        `${relativePath}: ${error instanceof Error ? error.message : "invalid JSON"}`,
      );
    }
  }

  const duplicateIds = findDuplicates(kits.map((kit) => kit.id));
  duplicateIds.forEach((id) => errors.push(`duplicate kit id: ${id}`));
  const visibleKits = searchQuery
    ? kits.filter((kit) => kitMatchesQuery(kit, searchQuery))
    : kits;

  return {
    ok: errors.length === 0,
    count: kits.length,
    matchedCount: visibleKits.length,
    query: searchQuery || null,
    kits: visibleKits.map((kit) => ({
      id: kit.id,
      label: kit.label,
      path: kit.path,
      summary: kit.summary,
    })),
    errors,
    requiresOpenAiApiKey: false,
  };
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

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}
