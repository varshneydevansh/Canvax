import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const exportsRoot = resolve(projectRoot, "exports");
const imageHostTaskJsonPath = resolve(
  exportsRoot,
  "canvax-image-host-task-latest.json",
);
const assetCandidatesJsonPath = resolve(
  exportsRoot,
  "canvax-asset-candidates-latest.json",
);
const imageResultsJsonPath = resolve(
  exportsRoot,
  "canvax-image-results-latest.json",
);
const imageResultsMarkdownPath = resolve(
  exportsRoot,
  "canvax-image-results-latest.md",
);
const imageResultsArchiveRoot = resolve(
  projectRoot,
  "artifacts",
  "canvax",
  "image-results",
);

const args = process.argv.slice(2);
const now = new Date().toISOString();
const requestId = buildRequestId(now);
const dryRun = hasFlag("--dry-run");
const outputJson = hasFlag("--json");
const copyAssets = hasFlag("--copy");
const acceptAll = hasFlag("--accept");
const allowMissing = dryRun || hasFlag("--allow-missing");
const updateCandidates =
  !hasFlag("--no-update-candidates") && !hasFlag("--no-candidate-update");

if (hasFlag("--help") || args.length === 0) {
  printHelp();
  process.exit(0);
}

const hostTask = (await readOptionalJson(imageHostTaskJsonPath)) || {};
const assetCandidatePack =
  (await readOptionalJson(assetCandidatesJsonPath)) || null;
const hostTasks = Array.isArray(hostTask.tasks) ? hostTask.tasks : [];
const importInputs = await buildImportInputs();

if (!importInputs.length) {
  fail(
    "No image results were provided. Use --image, --result, or --manifest.",
  );
}

const archiveDir = resolve(imageResultsArchiveRoot, requestId);
const results = [];

for (let index = 0; index < importInputs.length; index += 1) {
  const input = importInputs[index];
  const task = findMatchingTask(input, index);
  const candidateId = firstNonEmpty(
    input.candidateId,
    task?.candidateId,
    task?.outputSlot?.assetCandidateId,
  );
  const slotId = firstNonEmpty(
    input.slotId,
    task?.outputSlot?.slotId,
    candidateId ? `${candidateId}-slot-1` : "",
  );

  if (!candidateId) {
    fail(
      `Result ${index + 1} is missing candidate binding. Pass --candidate or use a host task with candidateId.`,
    );
  }
  if (!slotId) {
    fail(
      `Result ${index + 1} is missing slot binding. Pass --slot or use a host task with outputSlot.slotId.`,
    );
  }

  const imageRef = await resolveImageReference({
    imagePath: input.imagePath,
    candidateId,
    slotId,
    archiveDir,
  });
  const accepted = acceptAll || input.accepted === true;
  const status = accepted ? "accepted" : "returned";

  results.push({
    schemaVersion: 1,
    kind: "canvax-image-result",
    resultId: `image-result-${candidateId}-${slotId}-${index + 1}`,
    createdAt: now,
    status,
    accepted,
    attached: true,
    taskId: firstNonEmpty(input.taskId, task?.taskId),
    candidateId,
    slotId,
    sourceFrameId: firstNonEmpty(input.sourceFrameId, task?.sourceFrameId),
    sourceFrameTitle: firstNonEmpty(
      input.sourceFrameTitle,
      task?.sourceFrameTitle,
    ),
    title: firstNonEmpty(input.title, task?.title, `${candidateId} result`),
    notes: firstNonEmpty(input.notes, task?.returnInstructions),
    imagePath: imageRef.imagePath,
    originalPath: imageRef.originalPath,
    copiedPath: imageRef.copiedPath,
    imageKind: imageRef.kind,
    file: imageRef.file,
    placementContract: task?.placementContract || input.placementContract || {},
    outputSlot: {
      ...(task?.outputSlot || {}),
      slotId,
      status,
      imagePath: imageRef.imagePath,
      accepted,
      attached: true,
      attachedAt: now,
      acceptedAt: accepted ? now : "",
      sourceResultId: `image-result-${candidateId}-${slotId}-${index + 1}`,
    },
    targetSelector: firstNonEmpty(
      task?.placementContract?.targetSelector,
      input.targetSelector,
    ),
    acceptanceCriteria: Array.isArray(task?.acceptanceCriteria)
      ? task.acceptanceCriteria
      : [],
    hostPrompt: firstNonEmpty(task?.hostPrompt, input.hostPrompt),
  });
}

const imageResultPack = {
  schemaVersion: 1,
  kind: "canvax-image-results",
  createdAt: now,
  requestId,
  requiresOpenAiApiKey: false,
  noApiBoundary: {
    canCanvaxCallImageApi: false,
    canUseHostedImageGeneration: true,
    note:
      "Canvax imports returned files from the current Codex/ChatGPT host or local disk. It does not require or read OPENAI_API_KEY.",
  },
  project: hostTask.project || assetCandidatePack?.project || null,
  sourceFiles: {
    imageHostTask: workspacePath(imageHostTaskJsonPath),
    assetCandidates: workspacePath(assetCandidatesJsonPath),
  },
  sourceHostTask: {
    requestId: hostTask.requestId || "",
    kind: hostTask.kind || "",
    path: workspacePath(imageHostTaskJsonPath),
    taskCount: hostTasks.length,
  },
  resultCount: results.length,
  results,
  reviewSummary: buildImageResultsReview(results),
  returnContract: {
    kind: "canvax-image-result-return-contract",
    requiresOpenAiApiKey: false,
    requiredBindingFields: ["candidateId", "slotId", "imagePath"],
    optionalBindingFields: ["taskId", "sourceFrameId", "notes", "accepted"],
    filesWritten: [
      "exports/canvax-image-results-latest.json",
      "exports/canvax-image-results-latest.md",
      "artifacts/canvax/image-results/<request-id>/canvax-image-results.json",
      "artifacts/canvax/image-results/<request-id>/canvax-image-results.md",
    ],
    candidatePackUpdate: updateCandidates
      ? "The matching asset candidate output slot is updated unless --no-update-candidates is passed."
      : "Skipped by --no-update-candidates.",
  },
};

const candidateUpdate = await maybeUpdateAssetCandidates(imageResultPack);
imageResultPack.candidateUpdate = candidateUpdate;

const markdown = buildImageResultsMarkdown(imageResultPack);

if (!dryRun) {
  await writeJsonFile(imageResultsJsonPath, imageResultPack);
  await writeTextFile(imageResultsMarkdownPath, markdown);
  await writeJsonFile(
    resolve(archiveDir, "canvax-image-results.json"),
    imageResultPack,
  );
  await writeTextFile(
    resolve(archiveDir, "canvax-image-results.md"),
    markdown,
  );
  await writeProjectMirrors(imageResultPack, markdown);
}

if (outputJson) {
  process.stdout.write(`${JSON.stringify(imageResultPack, null, 2)}\n`);
} else {
  process.stdout.write(
    `${dryRun ? "Dry run" : "Imported"} ${results.length} Canvax image result${results.length === 1 ? "" : "s"}.\n`,
  );
  process.stdout.write(`Latest: ${workspacePath(imageResultsJsonPath)}\n`);
  if (candidateUpdate.updatedCount > 0) {
    process.stdout.write(
      `Updated candidates: ${candidateUpdate.updatedCount}\n`,
    );
  }
}

async function buildImportInputs() {
  const manifestPath = readOption("--manifest");
  const inputs = [];
  if (manifestPath) {
    const manifest = await readJsonRequired(resolveWorkspaceInput(manifestPath));
    const manifestResults = Array.isArray(manifest?.results)
      ? manifest.results
      : Array.isArray(manifest)
        ? manifest
        : [];
    for (const item of manifestResults) {
      inputs.push(normalizeManifestResult(item));
    }
  }

  for (const spec of readMultiOption("--result")) {
    inputs.push(parseResultSpec(spec));
  }

  const images = readMultiOption("--image");
  if (images.length) {
    const candidateId = readOption("--candidate");
    const slotId = readOption("--slot");
    const taskId = readOption("--task");
    const notes = readOption("--notes");
    const title = readOption("--title");
    const taskIndexValue = readOption("--task-index");
    const taskIndex = taskIndexValue && Number.isInteger(Number(taskIndexValue))
      ? Number(taskIndexValue)
      : null;
    images.forEach((imagePath, index) => {
      inputs.push({
        imagePath,
        candidateId,
        slotId,
        taskId,
        notes,
        title,
        accepted: acceptAll,
        taskIndex: taskIndex === null ? index : taskIndex,
      });
    });
  }

  return inputs.filter((input) => input.imagePath);
}

function normalizeManifestResult(item) {
  if (!item || typeof item !== "object") {
    fail("Manifest results must be objects.");
  }
  return {
    imagePath: item.imagePath || item.path || item.url || "",
    candidateId: item.candidateId || "",
    slotId: item.slotId || item.outputSlot?.slotId || "",
    taskId: item.taskId || "",
    notes: item.notes || "",
    title: item.title || "",
    accepted: Boolean(item.accepted),
    sourceFrameId: item.sourceFrameId || "",
    sourceFrameTitle: item.sourceFrameTitle || "",
    placementContract: item.placementContract || null,
    targetSelector: item.targetSelector || "",
    hostPrompt: item.hostPrompt || "",
  };
}

function parseResultSpec(spec) {
  const parts = String(spec || "").split("::");
  const [candidateId, imagePath, slotId = "", notes = "", accepted = ""] =
    parts;
  if (!candidateId || !imagePath) {
    fail(
      "--result must use candidateId::imagePath or candidateId::imagePath::slotId::notes::accepted",
    );
  }
  return {
    candidateId,
    imagePath,
    slotId,
    notes,
    accepted: ["true", "yes", "accept", "accepted"].includes(
      accepted.toLowerCase(),
    ),
  };
}

function findMatchingTask(input, index) {
  if (!hostTasks.length) {
    return null;
  }
  const hasExplicitBinding = Boolean(input.taskId || input.candidateId || input.slotId);
  if (input.taskId) {
    const match = hostTasks.find((task) => task.taskId === input.taskId);
    if (match) {
      return match;
    }
  }
  if (input.candidateId) {
    const match = hostTasks.find((task) => task.candidateId === input.candidateId);
    if (match) {
      return match;
    }
  }
  if (input.slotId) {
    const match = hostTasks.find(
      (task) => task.outputSlot?.slotId === input.slotId,
    );
    if (match) {
      return match;
    }
  }
  if (hasExplicitBinding) {
    return null;
  }
  if (Number.isInteger(input.taskIndex) && hostTasks[input.taskIndex]) {
    return hostTasks[input.taskIndex];
  }
  return hostTasks[index] || hostTasks[0] || null;
}

async function resolveImageReference({
  imagePath,
  candidateId,
  slotId,
  archiveDir,
}) {
  const input = String(imagePath || "").trim();
  if (!input) {
    fail("Image result path is empty.");
  }
  if (input.startsWith("data:image/")) {
    return {
      kind: "data-url",
      imagePath: input,
      originalPath: input,
      copiedPath: "",
      file: {
        exists: true,
        external: false,
        extension: "data-url",
      },
    };
  }
  if (/^https?:\/\//i.test(input)) {
    return {
      kind: "url",
      imagePath: input,
      originalPath: input,
      copiedPath: "",
      file: {
        exists: true,
        external: true,
        extension: extname(new URL(input).pathname).replace(".", ""),
      },
    };
  }

  const absolute = resolveWorkspaceInput(input);
  const exists = await fileExists(absolute);
  if (!exists && !allowMissing) {
    fail(`Image result file does not exist: ${input}`);
  }

  const insideWorkspace = isInsideProject(absolute);
  const extension = extname(absolute) || ".png";
  const shouldCopy = exists && !dryRun && (copyAssets || !insideWorkspace);
  let finalAbsolute = absolute;
  let copiedPath = "";
  if (shouldCopy) {
    const safeName = sanitizeFileName(
      `${candidateId}-${slotId}${extension || ".png"}`,
    );
    finalAbsolute = resolve(archiveDir, safeName);
    await mkdir(dirname(finalAbsolute), { recursive: true });
    await copyFile(absolute, finalAbsolute);
    copiedPath = workspacePath(finalAbsolute);
  }

  return {
    kind: "file",
    imagePath: insideWorkspace && !shouldCopy ? workspacePath(absolute) : workspacePath(finalAbsolute),
    originalPath: insideWorkspace ? workspacePath(absolute) : absolute,
    copiedPath,
    file: {
      exists,
      external: !insideWorkspace,
      copied: Boolean(copiedPath),
      extension: extension.replace(".", ""),
    },
  };
}

async function maybeUpdateAssetCandidates(resultPack) {
  const update = {
    attempted: updateCandidates,
    updatedCount: 0,
    acceptedCount: 0,
    latestPath: workspacePath(assetCandidatesJsonPath),
    projectMirrorPath: "",
    skipped: "",
  };

  if (dryRun || !updateCandidates) {
    update.skipped = dryRun ? "dry-run" : "disabled";
    return update;
  }
  if (!assetCandidatePack?.candidates?.length) {
    update.skipped = "asset candidate pack not found";
    return update;
  }

  const resultByCandidate = new Map(
    resultPack.results.map((result) => [result.candidateId, result]),
  );
  const nextPack = structuredClone(assetCandidatePack);
  for (const candidate of nextPack.candidates) {
    const result = resultByCandidate.get(candidate.id);
    if (!result) {
      continue;
    }
    const slots = Array.isArray(candidate.outputSlots)
      ? candidate.outputSlots
      : [];
    const slot = slots.find(
      (candidateSlot) =>
        candidateSlot.slotId === result.slotId ||
        candidateSlot.id === result.slotId,
    ) || slots[0];
    if (slot) {
      slot.imagePath = result.imagePath;
      slot.status = result.accepted ? "accepted" : "attached";
      slot.accepted = result.accepted;
      slot.attached = true;
      slot.attachedAt = result.createdAt;
      slot.acceptedAt = result.accepted ? result.createdAt : "";
      slot.sourceResultId = result.resultId;
      slot.sourceResultPackPath = workspacePath(imageResultsJsonPath);
      slot.notes = result.notes || slot.notes || "";
    }
    candidate.status = result.accepted ? "accepted" : "attached";
    candidate.imagePath = result.imagePath;
    candidate.accepted = result.accepted;
    candidate.attached = true;
    candidate.updatedAt = result.createdAt;
    candidate.sourceResultId = result.resultId;
    update.updatedCount += 1;
    if (result.accepted) {
      update.acceptedCount += 1;
    }
  }

  if (update.updatedCount === 0) {
    update.skipped = "no matching candidate in asset candidate pack";
    return update;
  }

  nextPack.updatedAt = now;
  nextPack.reviewSummary = buildAssetCandidateReview(nextPack);
  await writeJsonFile(assetCandidatesJsonPath, nextPack);
  const projectId = nextPack.project?.id || resultPack.project?.id || "";
  if (projectId) {
    const projectPath = resolve(
      exportsRoot,
      "projects",
      sanitizePathSegment(projectId),
      "canvax-asset-candidates-latest.json",
    );
    await writeJsonFile(projectPath, nextPack);
    update.projectMirrorPath = workspacePath(projectPath);
  }
  return update;
}

function buildImageResultsReview(resultsToGroup) {
  const groups = [];
  const byFrame = new Map();
  for (const result of resultsToGroup) {
    const frameId = result.sourceFrameId || "unbound-frame";
    if (!byFrame.has(frameId)) {
      byFrame.set(frameId, {
        frameId,
        frameTitle: result.sourceFrameTitle || "Unknown frame",
        total: 0,
        returned: 0,
        accepted: 0,
        candidateIds: [],
        slotIds: [],
        results: [],
      });
    }
    const group = byFrame.get(frameId);
    group.total += 1;
    group.returned += result.status === "returned" ? 1 : 0;
    group.accepted += result.accepted ? 1 : 0;
    group.candidateIds.push(result.candidateId);
    group.slotIds.push(result.slotId);
    group.results.push({
      resultId: result.resultId,
      candidateId: result.candidateId,
      slotId: result.slotId,
      imagePath: result.imagePath,
      accepted: result.accepted,
    });
  }
  for (const group of byFrame.values()) {
    group.candidateIds = unique(group.candidateIds);
    group.slotIds = unique(group.slotIds);
    groups.push(group);
  }
  return {
    kind: "canvax-image-result-review",
    total: resultsToGroup.length,
    returned: resultsToGroup.filter((result) => result.status === "returned")
      .length,
    accepted: resultsToGroup.filter((result) => result.accepted).length,
    groups,
  };
}

function buildAssetCandidateReview(pack) {
  const groupsByFrame = new Map();
  const acceptedCandidates = [];
  for (const candidate of pack.candidates || []) {
    const frameId = candidate.sourceFrameId || "unbound-frame";
    if (!groupsByFrame.has(frameId)) {
      groupsByFrame.set(frameId, {
        frameId,
        frameTitle: candidate.sourceFrameTitle || "Unknown frame",
        total: 0,
        promptReady: 0,
        placed: 0,
        attached: 0,
        accepted: 0,
        candidateIds: [],
        acceptedCandidateIds: [],
        candidates: [],
      });
    }
    const slots = Array.isArray(candidate.outputSlots)
      ? candidate.outputSlots
      : [];
    const isPlaced = slots.some((slot) => slot.imageElementId);
    const isAttached =
      Boolean(candidate.imagePath) ||
      Boolean(candidate.attached) ||
      slots.some((slot) => slot.imagePath || slot.attached);
    const isAccepted =
      Boolean(candidate.accepted) || slots.some((slot) => slot.accepted);
    const group = groupsByFrame.get(frameId);
    group.total += 1;
    group.promptReady += candidate.status === "prompt-ready" ? 1 : 0;
    group.placed += isPlaced ? 1 : 0;
    group.attached += isAttached ? 1 : 0;
    group.accepted += isAccepted ? 1 : 0;
    group.candidateIds.push(candidate.id);
    if (isAccepted) {
      group.acceptedCandidateIds.push(candidate.id);
      acceptedCandidates.push({
        id: candidate.id,
        title: candidate.title || candidate.id,
        sourceFrameId: candidate.sourceFrameId || "",
        sourceFrameTitle: candidate.sourceFrameTitle || "",
        imagePath: candidate.imagePath || slots.find((slot) => slot.imagePath)?.imagePath || "",
        slotId: slots[0]?.slotId || slots[0]?.id || "",
      });
    }
    group.candidates.push({
      id: candidate.id,
      title: candidate.title || candidate.id,
      type: candidate.type || "",
      status: candidate.status || "",
      sourceFrameId: candidate.sourceFrameId || "",
      sourceFrameTitle: candidate.sourceFrameTitle || "",
      sourceElementId: candidate.sourceElementId || "",
      placement: candidate.placement || "",
      prompt: candidate.prompt || "",
      slotId: slots[0]?.slotId || slots[0]?.id || "",
      targetSelector:
        candidate.placementMap?.targetSelector || slots[0]?.targetSelector || "",
      pixelBounds: candidate.placementMap?.pixelBounds || slots[0]?.pixelBounds || null,
      cssPlacement:
        candidate.placementMap?.cssPlacement || slots[0]?.cssPlacement || null,
      imageElementId: slots[0]?.imageElementId || "",
      imagePath: candidate.imagePath || slots.find((slot) => slot.imagePath)?.imagePath || "",
      accepted: isAccepted,
    });
  }

  return {
    kind: "canvax-asset-candidate-review",
    groups: Array.from(groupsByFrame.values()),
    acceptedCandidates,
    hostHandoff:
      pack.reviewSummary?.hostHandoff || {
        requiresOpenAiApiKey: false,
        lane: "host-image-generation",
        copyReadyFiles: [
          "exports/canvax-image-host-task-latest.md",
          "exports/canvax-image-host-task-latest.json",
          "exports/canvax-image-results-latest.json",
          "exports/canvax-asset-candidates-latest.json",
        ],
        workflow: [
          "Use the image host task to generate or edit images outside Canvax.",
          "Import returned files with scripts/import-image-results.mjs.",
          "Accept the chosen candidate so Codex can read the selected image path and placement contract.",
        ],
      },
  };
}

function buildImageResultsMarkdown(pack) {
  const lines = [
    "# Canvax Image Results",
    "",
    `Generated: ${pack.createdAt}`,
    `Request: ${pack.requestId}`,
    `Project: ${pack.project?.title || pack.project?.id || "unbound"}`,
    "",
    "## Boundary",
    "",
    "- Canvax did not call an image API.",
    "- No `OPENAI_API_KEY` is required.",
    "- Results are files, URLs, or data URLs returned by the current host or local workflow.",
    "",
    "## Results",
    "",
  ];

  for (const result of pack.results) {
    lines.push(`### ${result.title || result.candidateId}`);
    lines.push("");
    lines.push(`- Result: ${result.resultId}`);
    lines.push(`- Candidate: ${result.candidateId}`);
    lines.push(`- Slot: ${result.slotId}`);
    lines.push(`- Frame: ${result.sourceFrameTitle || result.sourceFrameId || "unknown"}`);
    lines.push(`- Status: ${result.status}`);
    lines.push(`- Image: ${result.imagePath}`);
    if (result.targetSelector) {
      lines.push(`- Target selector: \`${result.targetSelector}\``);
    }
    if (result.notes) {
      lines.push(`- Notes: ${result.notes}`);
    }
    lines.push("");
  }

  lines.push("## Return Contract");
  lines.push("");
  lines.push("```text");
  lines.push("host image generation");
  lines.push("  -> returned file / URL / data image");
  lines.push("  -> scripts/import-image-results.mjs");
  lines.push("  -> canvax-image-results-latest.*");
  lines.push("  -> updated asset candidate output slot");
  lines.push("  -> Codex reads exact imagePath + placementMap");
  lines.push("```");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function writeProjectMirrors(pack, markdown) {
  const projectId = pack.project?.id || "";
  if (!projectId || dryRun) {
    return;
  }
  const projectRootPath = resolve(
    exportsRoot,
    "projects",
    sanitizePathSegment(projectId),
  );
  await writeJsonFile(
    resolve(projectRootPath, "canvax-image-results-latest.json"),
    pack,
  );
  await writeTextFile(
    resolve(projectRootPath, "canvax-image-results-latest.md"),
    markdown,
  );
}

async function readJsonRequired(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readOptionalJson(filePath) {
  try {
    return await readJsonRequired(filePath);
  } catch {
    return null;
  }
}

async function writeJsonFile(filePath, value) {
  await writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeTextFile(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, value, "utf8");
}

async function fileExists(filePath) {
  try {
    const stats = await stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

function resolveWorkspaceInput(input) {
  const clean = String(input || "").replace(/^\/workspace\//, "");
  return isAbsolute(clean) ? clean : resolve(projectRoot, clean);
}

function workspacePath(filePath) {
  if (!filePath) {
    return "";
  }
  if (!isInsideProject(filePath)) {
    return filePath;
  }
  return toPosix(relative(projectRoot, filePath));
}

function isInsideProject(filePath) {
  const rel = relative(projectRoot, filePath);
  return Boolean(rel && !rel.startsWith("..") && !isAbsolute(rel)) || rel === "";
}

function readOption(name) {
  const equalsPrefix = `${name}=`;
  const equalsValue = args.find((arg) => arg.startsWith(equalsPrefix));
  if (equalsValue) {
    return equalsValue.slice(equalsPrefix.length);
  }
  const index = args.indexOf(name);
  if (index >= 0 && index + 1 < args.length) {
    return args[index + 1];
  }
  return "";
}

function readMultiOption(name) {
  const values = [];
  const equalsPrefix = `${name}=`;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith(equalsPrefix)) {
      values.push(arg.slice(equalsPrefix.length));
    } else if (arg === name && index + 1 < args.length) {
      values.push(args[index + 1]);
      index += 1;
    }
  }
  return values;
}

function hasFlag(name) {
  return args.includes(name);
}

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function sanitizePathSegment(value) {
  return sanitizeFileName(value || "project");
}

function sanitizeFileName(value) {
  return String(value || "file")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function toPosix(value) {
  return String(value || "").replaceAll("\\", "/");
}

function buildRequestId(value) {
  return `image-results-${value.replace(/[^0-9A-Za-z]+/g, "-").replace(/-$/, "")}`;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function printHelp() {
  process.stdout.write(`Import hosted image results into Canvax.

Usage:
  node scripts/import-image-results.mjs --task-index 0 --image artifacts/result.png
  node scripts/import-image-results.mjs --candidate asset-id --slot slot-id --image artifacts/result.png --accept
  node scripts/import-image-results.mjs --result asset-id::artifacts/result.png::slot-id::notes::accepted
  node scripts/import-image-results.mjs --manifest artifacts/host-image-results.json

Options:
  --image <path|url|data-url>        Returned image to import.
  --candidate <id>                   Candidate id when not inferred from host task.
  --slot <id>                        Output slot id when not inferred from host task.
  --task <id>                        Host task id.
  --task-index <n>                   Use image host task at index n.
  --notes <text>                     Result note.
  --accept                           Mark imported result as accepted.
  --copy                             Copy local files into artifacts/canvax/image-results.
  --no-update-candidates             Write result pack without mutating candidate slots.
  --dry-run                          Validate and print without writing.
  --json                             Print result JSON.
`);
}
