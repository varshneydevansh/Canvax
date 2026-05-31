import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const exportsRoot = resolve(projectRoot, "exports");
const previewManifestPath = resolve(
  exportsRoot,
  "canvax-preview-manifest.json",
);

const args = process.argv.slice(2);

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
const label = readOption(args, "--label") || "Codex implementation preview";
const source = readOption(args, "--source") || "codex";
const description = readOption(args, "--description") || "";
const notes = readOption(args, "--notes") || "";
const targetType = readOption(args, "--type") || "implementation-preview";
const frameIds = readMultiOption(args, "--frame");
const liveEditBinding = readJsonOption(args, "--live-edit-binding");
const liveEditTarget =
  readJsonOption(args, "--live-edit-target") ||
  normalizeLiveEditTargetFromBinding(liveEditBinding);
const acceptedLiveEditVariant =
  readJsonOption(args, "--accepted-live-edit-variant") ||
  normalizeJsonObject(liveEditBinding?.acceptedVariant);
const liveEditOriginalSnapshot = readJsonOption(
  args,
  "--live-edit-original-snapshot",
) || normalizeJsonObject(liveEditBinding?.originalSnapshot);
const liveEditRequest =
  readJsonOption(args, "--live-edit-request") ||
  normalizeJsonObject(liveEditBinding?.request);
const liveEditWriteback = normalizeJsonObject(liveEditBinding?.writeback);
const wantsJson = args.includes("--json");
const wantsDryRun = args.includes("--dry-run");
const effectiveUrl =
  url ||
  cleanString(liveEditTarget?.targetHref) ||
  cleanString(liveEditBinding?.target?.targetHref);
const effectivePreviewPath =
  previewPath ||
  cleanString(liveEditTarget?.targetPath) ||
  cleanString(liveEditBinding?.target?.targetPath);
const hasLiveEditMetadata = Boolean(
  liveEditBinding ||
    liveEditTarget ||
    acceptedLiveEditVariant ||
    liveEditOriginalSnapshot ||
    liveEditRequest,
);
const changes = readMultiOption(args, "--change").map((entry, index) =>
  buildChange(entry, index),
);
const artifacts = readMultiOption(args, "--artifact").map((entry, index) =>
  buildArtifact(entry, index),
);

if (
  !effectiveUrl &&
  !effectivePreviewPath &&
  !changes.length &&
  !artifacts.length &&
  !notes &&
  !hasLiveEditMetadata
) {
  console.error(
    "Nothing to write. Provide --url or --preview-path, attach --change/--artifact/--notes, or pass Live Edit metadata.",
  );
  process.exit(1);
}

const current = await readOptionalJson(previewManifestPath);
const existingTargets = Array.isArray(current?.targets)
  ? current.targets.filter((target) => target?.id !== "primary")
  : [];
const primaryTarget =
  effectiveUrl || effectivePreviewPath || hasLiveEditMetadata
    ? {
        id: "primary",
        label,
        source,
        type: targetType,
        url: effectiveUrl,
        previewPath: effectivePreviewPath,
        description,
        frameIds,
        ...(liveEditBinding ? { liveEditBinding } : {}),
        ...(liveEditTarget ? { liveEditTarget } : {}),
        ...(acceptedLiveEditVariant ? { acceptedLiveEditVariant } : {}),
        ...(liveEditOriginalSnapshot ? { liveEditOriginalSnapshot } : {}),
        ...(liveEditRequest ? { liveEditRequest } : {}),
        ...(liveEditWriteback ? { liveEditWriteback } : {}),
      }
    : null;

const manifest = {
  version: 1,
  updatedAt: new Date().toISOString(),
  source,
  previewUrl: effectiveUrl || "",
  notes,
  targets: primaryTarget
    ? [primaryTarget, ...existingTargets]
    : existingTargets,
  changes,
  artifacts,
};

if (!wantsDryRun) {
  await mkdir(exportsRoot, { recursive: true });
  await writeFile(previewManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const result = {
  dryRun: wantsDryRun,
  manifestPath: previewManifestPath,
  manifest,
  target: primaryTarget
    ? effectiveUrl || effectivePreviewPath || primaryTarget.id
    : "",
};

if (wantsJson) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  console.log(
    `${wantsDryRun ? "Prepared" : "Saved"} preview manifest to ${previewManifestPath}`,
  );
  if (primaryTarget) {
    console.log(
      `Primary target: ${effectiveUrl || effectivePreviewPath || primaryTarget.id}`,
    );
  }
  if (changes.length) {
    console.log(`Changed files: ${changes.length}`);
  }
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

function readJsonOption(inputArgs, flag) {
  const raw = readOption(inputArgs, flag);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch (error) {
    console.error(
      `${flag} must be a valid JSON object: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exit(1);
  }
}

function normalizeLiveEditTargetFromBinding(value) {
  return normalizeJsonObject(value?.target || value?.liveEditTarget);
}

function normalizeJsonObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
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
    await unlink(previewManifestPath);
    console.log(`Removed ${previewManifestPath}`);
  } catch {
    console.log(`No preview manifest found at ${previewManifestPath}`);
  }
}

function printHelp() {
  console.log(`write-preview-manifest

Usage:
  node scripts/write-preview-manifest.mjs --url http://localhost:3000
  node scripts/write-preview-manifest.mjs --preview-path artifacts/preview/home.html
  node scripts/write-preview-manifest.mjs --url http://localhost:3000 --change web/app.js::Updated board interactions::frame-home
  node scripts/write-preview-manifest.mjs --frame frame-1 --live-edit-binding '{"status":"accepted"}'
  node scripts/write-preview-manifest.mjs --artifact docs/spec.md::Generated handoff spec::frame-home
  node scripts/write-preview-manifest.mjs --clear

Options:
  --url <value>             Preview target URL
  --preview-path <value>    Workspace HTML file to use as the preview target
  --label <value>           Target label
  --source <value>          Source identifier, defaults to codex
  --description <value>     Target description
  --notes <value>           Manifest-level notes
  --type <value>            Target type label
  --frame <id>              Associate the target with a frame id, repeatable
  --live-edit-binding <json> Attach accepted Live Edit binding metadata
  --live-edit-target <json>  Attach normalized Live Edit target metadata
  --accepted-live-edit-variant <json> Attach accepted Live Edit variant metadata
  --live-edit-original-snapshot <json> Attach original target restore snapshot
  --live-edit-request <json> Attach frame-bound Live Edit request metadata
  --live-edit-writeback <json> Attach accepted Live Edit writeback metadata
  --change <path::summary::frameIds>  Add a changed file entry, repeatable
  --artifact <path::desc::frameIds>   Add an artifact entry, repeatable
  --dry-run                 Validate and print the manifest without writing it
  --json                    Print machine-readable output
  --clear                   Remove the preview manifest

Live Edit bindings may be target-only, with no URL or preview path. Canvax keeps
those bindings for source/writeback while Output Focus prefers renderable targets.
`);
}
