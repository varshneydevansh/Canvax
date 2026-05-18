#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const args = parseArgs(process.argv.slice(2));

try {
  const result = await verifyTokenEnforcement(args);
  printResult(result, args.json);
  if (!result.ok && !result.skipped) {
    process.exitCode = 1;
  }
} catch (error) {
  const payload = {
    ok: false,
    kind: "canvax-token-enforcement-verification",
    requiresOpenAiApiKey: false,
    error: error instanceof Error ? error.message : String(error),
  };
  printResult(payload, args.json);
  process.exitCode = 1;
}

async function verifyTokenEnforcement(options) {
  const contractPath = options.contract
    ? resolveProjectPath(options.contract)
    : await findLatestTokenContract();
  if (!contractPath) {
    return {
      ok: true,
      skipped: true,
      kind: "canvax-token-enforcement-verification",
      requiresOpenAiApiKey: false,
      reason: "No build contract with design token palette was found.",
      contractPath: "",
      checkedFiles: [],
      requiredPalette: [],
      matchedPalette: [],
      missingPalette: [],
    };
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const requiredPalette = extractContractPalette(contract).slice(
    0,
    options.limit,
  );
  if (!requiredPalette.length) {
    return {
      ok: true,
      skipped: true,
      kind: "canvax-token-enforcement-verification",
      requiresOpenAiApiKey: false,
      reason: "The selected build contract has no design token palette.",
      contractPath: relativeProjectPath(contractPath),
      checkedFiles: [],
      requiredPalette: [],
      matchedPalette: [],
      missingPalette: [],
    };
  }

  const candidateFiles = await resolveCandidateFiles(contractPath, options);
  const filePayloads = await readCandidateFiles(candidateFiles);
  const normalizedPayload = filePayloads
    .map((entry) => normalizeForColorSearch(entry.content))
    .join("\n");
  const matchedPalette = requiredPalette.filter((color) =>
    normalizedPayload.includes(color),
  );
  const missingPalette = requiredPalette.filter(
    (color) => !matchedPalette.includes(color),
  );

  return {
    ok: missingPalette.length === 0,
    skipped: false,
    kind: "canvax-token-enforcement-verification",
    requiresOpenAiApiKey: false,
    contractPath: relativeProjectPath(contractPath),
    checkedFiles: filePayloads.map((entry) => entry.path),
    requiredPalette,
    matchedPalette,
    missingPalette,
    passed: missingPalette.length === 0,
    detail:
      missingPalette.length === 0
        ? `Matched ${matchedPalette.length}/${requiredPalette.length} required token colors.`
        : `Missing ${missingPalette.length}/${requiredPalette.length} required token colors.`,
  };
}

async function findLatestTokenContract() {
  const searchRoot = resolve(
    projectRoot,
    "artifacts",
    "preview",
    "codex-build",
  );
  const contracts = [];
  await walkFiles(searchRoot, async (filePath) => {
    if (!filePath.endsWith("implementation/canvax-build-contract.json")) {
      return;
    }
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (!extractContractPalette(parsed).length) {
        return;
      }
      const fileStat = await stat(filePath);
      contracts.push({ path: filePath, mtimeMs: fileStat.mtimeMs });
    } catch {
      // Ignore malformed historical artifacts.
    }
  });
  contracts.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return contracts[0]?.path || "";
}

async function walkFiles(root, visitor) {
  let entries = [];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const entryPath = resolve(root, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(entryPath, visitor);
      continue;
    }
    if (entry.isFile()) {
      await visitor(entryPath);
    }
  }
}

function extractContractPalette(contract) {
  const palette =
    contract?.visualDirection?.designTokens?.palette ||
    contract?.designerImplementationContext?.designKit?.designTokens?.palette ||
    contract?.designerImplementationContext?.designKit?.tokens?.palette ||
    [];
  return normalizePalette(palette);
}

function normalizePalette(palette) {
  if (!Array.isArray(palette)) {
    return [];
  }
  const colors = [];
  for (const entry of palette) {
    const raw =
      typeof entry === "string"
        ? entry
        : entry?.hex || entry?.value || entry?.color || "";
    const normalized = normalizeHex(raw);
    if (normalized && !colors.includes(normalized)) {
      colors.push(normalized);
    }
  }
  return colors;
}

async function resolveCandidateFiles(contractPath, options) {
  const explicit = [
    ...options.files,
    ...options.cssFiles,
    ...options.htmlFiles,
  ].map(resolveProjectPath);
  if (explicit.length) {
    return uniqueStrings(explicit);
  }

  const contractDir = dirname(contractPath);
  const previewRoot = resolve(contractDir, "..");
  const candidates = [
    resolve(contractDir, "styles.css"),
    resolve(contractDir, "CanvaxScreen.css"),
    resolve(contractDir, "index.html"),
    resolve(contractDir, "CanvaxScreen.jsx"),
    resolve(previewRoot, "index.html"),
  ];
  return uniqueStrings(candidates);
}

async function readCandidateFiles(files) {
  const payloads = [];
  for (const file of files) {
    if (!isReadableArtifact(file)) {
      continue;
    }
    try {
      payloads.push({
        path: relativeProjectPath(file),
        content: await readFile(file, "utf8"),
      });
    } catch {
      // Missing optional implementation files are ignored.
    }
  }
  return payloads;
}

function isReadableArtifact(filePath) {
  const ext = extname(filePath).toLowerCase();
  return [".css", ".html", ".htm", ".jsx", ".tsx", ".js", ".ts"].includes(ext);
}

function normalizeForColorSearch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/#([0-9a-f])([0-9a-f])([0-9a-f])\b/g, "#$1$1$2$2$3$3");
}

function normalizeHex(value) {
  const match = String(value || "")
    .trim()
    .toLowerCase()
    .match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!match) {
    return "";
  }
  const hex = match[1];
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }
  return `#${hex}`;
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function resolveProjectPath(value) {
  const input = String(value || "");
  return input.startsWith("/") ? input : resolve(projectRoot, input);
}

function relativeProjectPath(value) {
  const absolute = resolve(value);
  if (absolute.startsWith(`${projectRoot}/`)) {
    return absolute.slice(projectRoot.length + 1);
  }
  return absolute;
}

function parseArgs(argv) {
  const options = {
    contract: "",
    files: [],
    cssFiles: [],
    htmlFiles: [],
    limit: 5,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--contract") {
      options.contract = argv[++index] || "";
    } else if (arg === "--file") {
      options.files.push(argv[++index] || "");
    } else if (arg === "--css") {
      options.cssFiles.push(argv[++index] || "");
    } else if (arg === "--html") {
      options.htmlFiles.push(argv[++index] || "");
    } else if (arg === "--limit") {
      options.limit = Math.max(1, Number(argv[++index] || 5) || 5);
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return options;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (result.skipped) {
    console.log(`skip: ${result.reason}`);
    return;
  }
  const prefix = result.ok ? "ok" : "fail";
  console.log(`${prefix}: ${result.detail || result.error || "token verification"}`);
  if (result.contractPath) {
    console.log(`contract: ${result.contractPath}`);
  }
  if (result.checkedFiles?.length) {
    console.log(`checked: ${result.checkedFiles.join(", ")}`);
  }
  if (result.missingPalette?.length) {
    console.log(`missing: ${result.missingPalette.join(", ")}`);
  }
}

function printHelp() {
  console.log(`Usage:
  node scripts/verify-token-enforcement.mjs [--contract path] [--css path] [--html path] [--file path] [--json]

Checks that design-token palette colors recorded in a Canvax build contract are
present in generated implementation artifacts. This is a local no-API gate.`);
}
