#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const designKitsRoot = resolve(projectRoot, "design-kits");

const result = await validateDesignKits();
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log(`ok: ${result.count} design kit files are valid`);
} else {
  console.log(`fail: ${result.errors.length} design kit issue(s)`);
  result.errors.forEach((error) => console.log(`- ${error}`));
}

if (!result.ok) {
  process.exitCode = 1;
}

async function validateDesignKits() {
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

  return {
    ok: errors.length === 0,
    count: kits.length,
    kits,
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

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}
