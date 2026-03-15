import { spawn } from "node:child_process";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const codexOutputRoot = resolve(projectRoot, "artifacts", "canvax");
const codexOutputManifestPath = resolve(codexOutputRoot, "codex-output.json");

const args = process.argv.slice(2);
const wantsJson = args.includes("--json");
const wantsDryRun = args.includes("--dry-run");
const fromGitStatus = args.includes("--from-git-status");

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

if (args.includes("--clear")) {
  await clearManifest();
  process.exit(0);
}

const url = readOption(args, "--url");
const previewPath = readOption(args, "--preview-path");
const label = readOption(args, "--label") || "Codex generated output";
const source =
  readOption(args, "--source") ||
  (fromGitStatus ? "codex-auto-publish" : "codex");
const description = readOption(args, "--description") || "";
const notes =
  readOption(args, "--notes") ||
  (fromGitStatus
    ? "Auto-published from the current git workspace status."
    : "");
const targetType = readOption(args, "--type") || "implementation-preview";
const frameIds = readMultiOption(args, "--frame");
const manualChanges = readMultiOption(args, "--change").map((entry, index) =>
  buildChange(entry, index),
);
const autoPublishedChanges = fromGitStatus
  ? await collectWorkspaceChangeEntries()
  : [];
const changes = dedupeByKey(
  [...manualChanges, ...autoPublishedChanges],
  (entry, index) => entry.id || entry.path || `change-${index + 1}`,
);
const artifacts = readMultiOption(args, "--artifact").map((entry, index) =>
  buildArtifact(entry, index),
);

if (
  !url &&
  !previewPath &&
  !changes.length &&
  !artifacts.length &&
  !notes &&
  !fromGitStatus
) {
  console.error(
    "Nothing to write. Provide --url or --preview-path, or attach --change/--artifact/--notes.",
  );
  process.exit(1);
}

const existing = await readOptionalJson(codexOutputManifestPath);
const existingTargets = Array.isArray(existing?.targets)
  ? existing.targets.filter((target) => target?.id !== "primary")
  : [];
const primaryTarget =
  url || previewPath
    ? {
        id: "primary",
        label,
        source,
        type: targetType,
        url,
        previewPath,
        description,
        frameIds,
      }
    : null;

const manifest = {
  version: 1,
  updatedAt: new Date().toISOString(),
  source,
  previewUrl: url || "",
  notes,
  targets: primaryTarget
    ? [primaryTarget, ...existingTargets]
    : existingTargets,
  changes,
  artifacts,
};

if (!wantsDryRun) {
  await mkdir(codexOutputRoot, { recursive: true });
  await writeFile(
    codexOutputManifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

const result = {
  saved: !wantsDryRun,
  dryRun: wantsDryRun,
  manifestPath: codexOutputManifestPath,
  source,
  changeCount: changes.length,
  artifactCount: artifacts.length,
  target: primaryTarget ? url || previewPath : "",
  manifest,
};

if (wantsJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(
    wantsDryRun
      ? `Dry run prepared Codex output manifest for ${codexOutputManifestPath}`
      : `Saved Codex output manifest to ${codexOutputManifestPath}`,
  );
  if (primaryTarget) {
    console.log(`Primary target: ${url || previewPath}`);
  }
  console.log(`Changed files: ${changes.length}`);
  if (artifacts.length) {
    console.log(`Artifacts: ${artifacts.length}`);
  }
}

function readOption(inputArgs, flag) {
  const index = inputArgs.findIndex((entry) => entry === flag);
  return index >= 0 && inputArgs[index + 1] ? inputArgs[index + 1].trim() : "";
}

function readMultiOption(inputArgs, flag) {
  const values = [];
  for (let index = 0; index < inputArgs.length; index += 1) {
    if (inputArgs[index] === flag && inputArgs[index + 1]) {
      values.push(inputArgs[index + 1].trim());
    }
  }
  return values.filter(Boolean);
}

function buildChange(entry, index) {
  const [pathPart, summaryPart = "", framesPart = ""] = entry.split("::");
  const path = pathPart.trim();
  return {
    id: `change-${index + 1}`,
    path,
    label: path.split("/").pop() || `Change ${index + 1}`,
    kind: "updated",
    summary: summaryPart.trim(),
    frameIds: parseFrameIds(framesPart),
  };
}

function buildArtifact(entry, index) {
  const [pathPart, descriptionPart = "", framesPart = ""] = entry.split("::");
  const path = pathPart.trim();
  const kind = path.toLowerCase().endsWith(".html") ? "preview" : "artifact";
  return {
    id: `artifact-${index + 1}`,
    path,
    label: path.split("/").pop() || `Artifact ${index + 1}`,
    kind,
    description: descriptionPart.trim(),
    frameIds: parseFrameIds(framesPart),
  };
}

function parseFrameIds(value) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function collectWorkspaceChangeEntries() {
  const { stdout } = await runCommand("git", ["status", "--porcelain"], {
    cwd: projectRoot,
  });
  return stdout
    .split("\n")
    .map((line) => parseGitStatusLine(line))
    .filter(Boolean)
    .filter((entry) => !isIgnoredAutoPublishPath(entry.path))
    .map((entry, index) => ({
      id: `change-${index + 1}`,
      path: entry.path,
      label: entry.path.split("/").pop() || entry.path,
      kind: summarizeGitStatus(entry.statusCode),
      summary: `${capitalize(summarizeGitStatus(entry.statusCode))} via git status`,
      frameIds,
    }));
}

async function readOptionalJson(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function clearManifest() {
  try {
    await unlink(codexOutputManifestPath);
    if (wantsJson) {
      console.log(
        JSON.stringify(
          {
            cleared: true,
            manifestPath: codexOutputManifestPath,
          },
          null,
          2,
        ),
      );
    } else {
      console.log(`Removed ${codexOutputManifestPath}`);
    }
  } catch {
    if (wantsJson) {
      console.log(
        JSON.stringify(
          {
            cleared: false,
            manifestPath: codexOutputManifestPath,
          },
          null,
          2,
        ),
      );
    } else {
      console.log(
        `No Codex output manifest found at ${codexOutputManifestPath}`,
      );
    }
  }
}

function printHelp() {
  console.log(`write-codex-output

Usage:
  node scripts/write-codex-output.mjs --url http://localhost:3000
  node scripts/write-codex-output.mjs --preview-path artifacts/preview/home.html
  node scripts/write-codex-output.mjs --from-git-status
  node scripts/write-codex-output.mjs --artifact artifacts/preview/home.html::Generated interactive preview::frame-home
  node scripts/write-codex-output.mjs --change web/app.js::Updated hero layout::frame-home --artifact docs/spec.md::Generated handoff spec::frame-home
  node scripts/write-codex-output.mjs --from-git-status --preview-path artifacts/preview/home.html
  node scripts/write-codex-output.mjs --from-git-status --dry-run --json
  node scripts/write-codex-output.mjs --clear

Options:
  --url <value>             Preview target URL
  --preview-path <value>    Workspace HTML file to use as the preview target
  --label <value>           Target label
  --source <value>          Source identifier, defaults to codex
  --description <value>     Target description
  --notes <value>           Manifest-level notes
  --type <value>            Target type label
  --frame <id>              Associate the target with a frame id, repeatable
  --from-git-status         Build changed-file entries from git status automatically
  --dry-run                 Build the manifest without writing it to disk
  --json                    Print machine-readable output
  --change <path::summary::frameIds>  Add a changed file entry, repeatable
  --artifact <path::desc::frameIds>   Add an artifact entry, repeatable
  --clear                   Remove the Codex output manifest
`);
}

function parseGitStatusLine(line) {
  const raw = String(line ?? "").replace(/\r$/, "");
  if (!raw.trim() || raw.length < 4) {
    return null;
  }
  const statusCode = raw.slice(0, 2);
  const pathPart = raw.slice(3).trim();
  if (!pathPart) {
    return null;
  }
  const path = pathPart.includes(" -> ")
    ? pathPart.split(" -> ").at(-1)?.trim() || pathPart
    : pathPart;
  return {
    statusCode,
    path: path.replaceAll("\\", "/"),
  };
}

function summarizeGitStatus(statusCode) {
  const code = String(statusCode || "").trim();
  if (!code) {
    return "updated";
  }
  if (code.includes("?")) {
    return "created";
  }
  if (code.includes("D")) {
    return "deleted";
  }
  if (code.includes("R")) {
    return "renamed";
  }
  if (code.includes("A")) {
    return "created";
  }
  return "updated";
}

function isIgnoredAutoPublishPath(value) {
  const path = String(value || "")
    .trim()
    .replaceAll("\\", "/");
  if (!path) {
    return true;
  }
  return (
    path.startsWith("exports/") ||
    path.startsWith(".canvax/") ||
    path === "artifacts/" ||
    path === "artifacts/canvax/" ||
    path === "artifacts/preview/" ||
    path === "artifacts/canvax/codex-output.json" ||
    path.startsWith("artifacts/canvax/checkpoints/") ||
    path.startsWith("artifacts/preview/snapshots/") ||
    path.startsWith("artifacts/preview/materialized/")
  );
}

function capitalize(value) {
  const text = String(value || "").trim();
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "";
}

function dedupeByKey(values, buildKey) {
  const unique = new Map();
  values.forEach((value, index) => {
    const key = buildKey(value, index);
    if (!key || unique.has(key)) {
      return;
    }
    unique.set(key, value);
  });
  return [...unique.values()];
}

function runCommand(command, commandArgs, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }
      rejectPromise(
        new Error(stderr.trim() || `${command} exited with code ${code}`),
      );
    });
  });
}
