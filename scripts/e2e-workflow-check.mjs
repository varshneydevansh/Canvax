import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const latestRoot = resolve(
  projectRoot,
  "artifacts",
  "canvax",
  "e2e-workflow",
  "latest",
);

const frameId = "frame-e2e-rough-to-real";
const now = () => new Date().toISOString();
const results = [];

await rm(latestRoot, { recursive: true, force: true });
await mkdir(latestRoot, { recursive: true });

const frame = buildFrame();
const board = {
  project: "Canvax rough sketch to real output E2E",
  goal:
    "Prove the no-API path from rough sketch, voice, image prompt, build request, rewrite request, and frame-bound preview output.",
  audience: "Designers using Codex as a visual collaborator",
  designMood: "Confident designer workbench with warm paper and precise output.",
};

const taskPack = buildTaskPack(board, frame);
const imagePromptPack = buildImagePromptPack(board, frame);
const assetCandidates = buildAssetCandidatePack(board, frame);
const buildRequest = buildRealRequest(board, frame);
const rewriteRequest = buildRewriteRequest(board, frame);

const paths = {
  taskPack: resolve(latestRoot, "task-pack.json"),
  imagePromptPack: resolve(latestRoot, "image-prompt-pack.json"),
  assetCandidates: resolve(latestRoot, "asset-candidates.json"),
  buildRequest: resolve(latestRoot, "build-request.json"),
  rewriteRequest: resolve(latestRoot, "rewrite-request.json"),
  result: resolve(latestRoot, "result.json"),
};

await writeJson(paths.taskPack, taskPack);
await writeJson(paths.imagePromptPack, imagePromptPack);
await writeJson(paths.assetCandidates, assetCandidates);
await writeJson(paths.buildRequest, buildRequest);
await writeJson(paths.rewriteRequest, rewriteRequest);

record(
  "synthetic rough frame includes sketch, labels, voice, and corrections",
  frame.composition.elements.length >= 6 &&
    taskPack.voice.segmentCount === 1 &&
    rewriteRequest.frames[0].outputAnnotations.length === 1,
);
record(
  "image prompt and asset packs stay no-API",
  imagePromptPack.requiresOpenAiApiKey === false &&
    assetCandidates.requiresOpenAiApiKey === false &&
    assetCandidates.candidates.length === 2,
);

const buildResult = await executeJson("node", [
  "scripts/execute-build-request.mjs",
  "--request",
  toProjectRelative(paths.buildRequest),
  "--no-publish",
  "--json",
]);
const buildFrameCodeMap = buildResult.implementationFiles.find(
  (file) => file.kind === "frame-code-map",
);
record(
  "build executor creates frame-bound preview and implementation bundle",
  buildResult.ok === true &&
    buildResult.frameId === frameId &&
    buildResult.previewPath.includes(`/frames/${frameId}/`) &&
    buildResult.implementationFiles.some((file) =>
      file.path.endsWith("/implementation/index.html"),
    ) &&
    buildResult.implementationFiles.some((file) =>
      file.path.endsWith("/implementation/styles.css"),
    ) &&
    buildResult.implementationFiles.some((file) =>
      file.path.endsWith("/implementation/app.js"),
    ),
  buildResult.previewPath,
);
record(
  "build executor creates frame-to-code ownership map",
  Boolean(
    buildFrameCodeMap &&
      buildFrameCodeMap.path.endsWith(
        "/implementation/canvax-component-map.json",
      ),
  ),
  buildFrameCodeMap?.path || "missing map",
);
await assertReadableProjectFile(buildResult.previewPath);
await assertReadableProjectFile(buildResult.contextPath);
if (buildFrameCodeMap?.path) {
  await assertReadableProjectFile(buildFrameCodeMap.path);
  const rawMap = await readFile(
    resolve(projectRoot, buildFrameCodeMap.path),
    "utf8",
  );
  const parsedMap = JSON.parse(rawMap);
  record(
    "frame-to-code ownership map binds source elements to selectors",
    parsedMap.kind === "canvax-frame-code-map" &&
      parsedMap.frame?.id === frameId &&
      parsedMap.ownership?.files?.some((file) =>
        file.path.endsWith("index.html"),
      ) &&
      parsedMap.regions?.some((region) =>
        region.implementationSelector?.includes("data-canvax-node-id"),
      ),
  );
}

const buildManifestDryRun = await executeJson("node", [
  "scripts/write-codex-output.mjs",
  "--preview-path",
  buildResult.previewPath,
  "--label",
  "E2E Codex build preview",
  "--source",
  "canvax-e2e-workflow-check",
  "--frame",
  frameId,
  "--artifact",
  `${buildResult.contextPath}::E2E build context::${frameId}`,
  ...(buildFrameCodeMap?.path
    ? [
        "--artifact",
        `${buildFrameCodeMap.path}::E2E frame-to-code map::${frameId}`,
      ]
    : []),
  "--dry-run",
  "--json",
]);
record(
  "build preview can bind to Codex output manifest without writing it",
  buildManifestDryRun.dryRun === true &&
    buildManifestDryRun.manifest?.targets?.[0]?.frameIds?.includes(frameId) &&
    buildManifestDryRun.manifest?.targets?.[0]?.previewPath ===
      buildResult.previewPath &&
    buildManifestDryRun.manifest?.artifacts?.some((artifact) =>
      artifact.path?.endsWith("/implementation/canvax-component-map.json"),
    ),
);

rewriteRequest.outputManifest = buildManifestDryRun.manifest;
await writeJson(paths.rewriteRequest, rewriteRequest);

const rewriteResult = await executeJson("node", [
  "scripts/execute-rewrite-request.mjs",
  "--request",
  toProjectRelative(paths.rewriteRequest),
  "--task-pack",
  toProjectRelative(paths.taskPack),
  "--no-publish",
  "--json",
]);
record(
  "rewrite executor creates refreshed preview from correction context",
  rewriteResult.ok === true &&
    rewriteResult.frameId === frameId &&
    rewriteResult.affectedRegionCount >= 1 &&
    rewriteResult.previewPath.includes(`/frames/${frameId}/`),
  rewriteResult.previewPath,
);
await assertReadableProjectFile(rewriteResult.previewPath);
await assertReadableProjectFile(rewriteResult.contextPath);

const rewriteManifestDryRun = await executeJson("node", [
  "scripts/write-codex-output.mjs",
  "--preview-path",
  rewriteResult.previewPath,
  "--label",
  "E2E rewritten preview",
  "--source",
  "canvax-e2e-workflow-check",
  "--type",
  "refined-preview",
  "--frame",
  frameId,
  "--artifact",
  `${rewriteResult.contextPath}::E2E rewrite context::${frameId}`,
  "--dry-run",
  "--json",
]);
record(
  "rewrite preview can bind to Codex output manifest without writing it",
  rewriteManifestDryRun.dryRun === true &&
    rewriteManifestDryRun.manifest?.targets?.[0]?.type ===
      "refined-preview" &&
    rewriteManifestDryRun.manifest?.targets?.[0]?.frameIds?.includes(frameId),
);

const proof = {
  kind: "canvax-e2e-workflow-proof",
  createdAt: now(),
  requiresOpenAiApiKey: false,
  frameId,
  paths: {
    taskPack: toProjectRelative(paths.taskPack),
    imagePromptPack: toProjectRelative(paths.imagePromptPack),
    assetCandidates: toProjectRelative(paths.assetCandidates),
    buildRequest: toProjectRelative(paths.buildRequest),
    rewriteRequest: toProjectRelative(paths.rewriteRequest),
    buildPreview: buildResult.previewPath,
    buildContext: buildResult.contextPath,
    rewritePreview: rewriteResult.previewPath,
    rewriteContext: rewriteResult.contextPath,
  },
  checks: results,
};
await writeJson(paths.result, proof);

const failed = results.filter((entry) => !entry.passed);
results.forEach((entry) => {
  const detail = entry.detail ? ` (${entry.detail})` : "";
  console.log(`${entry.passed ? "ok" : "fail"}: ${entry.name}${detail}`);
});
console.log(`ok: e2e workflow proof written (${toProjectRelative(paths.result)})`);

if (failed.length) {
  process.exitCode = 1;
}

function buildFrame() {
  const elements = [
    element("rect", "hero-frame", "Hero section frame", 0.05, 0.08, 0.9, 0.78, "#10192a"),
    element("label", "headline", "Make sketching feel like building", 0.1, 0.2, 0.34, 0.13, "#ff5d3a"),
    element("rect", "copy-block", "Left copy block", 0.09, 0.34, 0.36, 0.22, "#ff5d3a"),
    element("rect", "primary-cta", "Primary CTA", 0.1, 0.6, 0.16, 0.07, "#0c8d7b"),
    element("rect", "preview-panel", "Generated preview area", 0.56, 0.18, 0.32, 0.45, "#2364aa"),
    element("arrow", "shift-arrow", "Move CTA closer to headline", 0.18, 0.72, 0.18, 0.08, "#ff5d3a"),
    element("image", "asset-slot", "Book illustration candidate slot", 0.58, 0.68, 0.22, 0.14, "#f0a202"),
  ];
  return {
    id: frameId,
    index: 1,
    title: "Rough hero sketch",
    viewport: "desktop",
    viewportLabel: "Desktop",
    viewportWidth: 1440,
    viewportHeight: 1024,
    intent:
      "Turn this rough sketch into a real product hero, then apply the correction mark.",
    objective:
      "Build a polished hero section from rough geometry, labels, and voice.",
    layout:
      "Left headline and CTA, right generated preview panel, asset slot for future image generation.",
    motion:
      "Correction arrow means move the CTA closer to the headline and refresh output.",
    assets:
      "Use the asset slot as a prompt-ready illustration candidate, not a paid API call.",
    mobile: "Stack copy, CTA, preview, and asset slot vertically.",
    updatedAt: now(),
    outputAnnotations: [
      {
        id: "annotation-e2e-cta-shift",
        type: "arrow",
        text: "Move CTA upward and tighten spacing.",
        bounds: { x: 0.16, y: 0.58, w: 0.22, h: 0.16 },
      },
    ],
    composition: {
      viewport: { width: 1440, height: 1024, label: "Desktop" },
      elementCount: elements.length,
      elements,
    },
  };
}

function buildTaskPack(board, frame) {
  return {
    schemaVersion: 1,
    kind: "canvax-task-pack",
    createdAt: now(),
    requiresOpenAiApiKey: false,
    board,
    actionMode: "build-ui",
    actionModeLabel: "Build UI",
    activeFrameId: frame.id,
    voice: voiceExport(frame),
    frames: [frame],
  };
}

function buildImagePromptPack(board, frame) {
  return {
    schemaVersion: 1,
    kind: "canvax-image-prompt-pack",
    createdAt: now(),
    requiresOpenAiApiKey: false,
    board,
    activeFrameId: frame.id,
    frames: [
      {
        id: frame.id,
        title: frame.title,
        prompt:
          "Generate a warm editorial product illustration for the right-side asset slot while preserving the normalized placement map.",
        negativePrompt: "Do not change the CTA placement or hero hierarchy.",
        coordinates: frame.composition.elements.map((entry) => ({
          id: entry.id,
          label: entry.text,
          bounds: entry.bounds,
        })),
        htmlCssScaffold:
          "<section class=\"hero\"><div class=\"copy\"></div><figure class=\"asset-slot\"></figure></section>",
      },
    ],
  };
}

function buildAssetCandidatePack(board, frame) {
  return {
    schemaVersion: 1,
    kind: "canvax-asset-candidates",
    createdAt: now(),
    requiresOpenAiApiKey: false,
    board,
    candidates: [
      {
        id: "asset-e2e-hero-illustration",
        type: "region",
        status: "prompt-ready",
        sourceFrameId: frame.id,
        sourceFrameTitle: frame.title,
        title: "Hero illustration candidate",
        prompt:
          "Create a confident product illustration that fits the right-side asset slot.",
        bounds: { x: 0.58, y: 0.68, w: 0.22, h: 0.14 },
        placement: "right-side hero asset slot",
        aspectRatio: "16:10",
        outputSlots: [],
      },
      {
        id: "asset-e2e-background-texture",
        type: "frame-composite",
        status: "prompt-ready",
        sourceFrameId: frame.id,
        sourceFrameTitle: frame.title,
        title: "Paper texture direction",
        prompt:
          "Generate a subtle aged-paper texture compatible with Canvax warm paper surfaces.",
        bounds: { x: 0.05, y: 0.08, w: 0.9, h: 0.78 },
        placement: "whole hero background",
        aspectRatio: "16:9",
        outputSlots: [],
      },
    ],
  };
}

function buildRealRequest(board, frame) {
  return {
    schemaVersion: 1,
    kind: "canvax-build-real-request",
    createdAt: now(),
    source: "canvax-e2e-workflow-check",
    requiresOpenAiApiKey: false,
    board,
    activeFrameId: frame.id,
    actionMode: "build-ui",
    actionModeLabel: "Build UI",
    frame,
    voice: voiceExport(frame),
    codexInstructions: [
      "Use the rough frame geometry and labels before inventing layout.",
      "Create a frame-bound real preview artifact and implementation starter files.",
      "Do not require a paid API key.",
    ],
    outputContract: {
      manifestPath: "artifacts/canvax/codex-output.json",
      previewManifestPath: "exports/canvax-preview-manifest.json",
      frameBinding: {
        frameId: frame.id,
        frameTitle: frame.title,
      },
    },
  };
}

function buildRewriteRequest(board, frame) {
  return {
    schemaVersion: 1,
    kind: "canvax-rewrite-request",
    createdAt: now(),
    source: "canvax-e2e-workflow-check",
    requiresOpenAiApiKey: false,
    board,
    activeFrameId: frame.id,
    activeFrameTitle: frame.title,
    voice: voiceExport(frame),
    frames: [frame],
    rewriteQueue: [
      {
        frameId: frame.id,
        frameTitle: frame.title,
        reason: "correction-mark",
        label: "Apply CTA spacing correction",
        detail:
          "The user drew a correction arrow asking Codex to move the CTA upward and tighten hero spacing.",
        priority: 1,
      },
    ],
    revisionGraph: {
      kind: "canvax-output-revision-graph",
      frames: [
        {
          frameId: frame.id,
          frameTitle: frame.title,
          stale: true,
          queueReasons: ["correction-mark"],
          outputTargets: [],
          changedFiles: [],
        },
      ],
    },
    outputManifest: {
      version: 1,
      targets: [],
      artifacts: [],
      changes: [],
    },
  };
}

function voiceExport(frame) {
  return {
    segmentCount: 1,
    segments: [
      {
        id: "voice-e2e",
        text:
          "Make this hero feel like a real product screen, then follow my arrow to move the call to action upward.",
        at: now(),
        scope: "frame",
        provider: "e2e",
        frameId: frame.id,
        frameTitle: frame.title,
      },
    ],
    markdown:
      "- Make this hero feel like a real product screen and move the call to action upward.\n",
  };
}

function element(type, id, text, x, y, w, h, color) {
  return {
    id,
    type,
    text,
    role: text,
    color,
    bounds: { x, y, w, h },
  };
}

function record(name, passed, detail = "") {
  results.push({ name, passed: Boolean(passed), detail });
}

async function assertReadableProjectFile(relativePath) {
  try {
    const raw = await readFile(resolve(projectRoot, relativePath), "utf8");
    record(`artifact is readable: ${relativePath}`, raw.length > 120);
  } catch (error) {
    record(
      `artifact is readable: ${relativePath}`,
      false,
      error instanceof Error ? error.message : "read failed",
    );
  }
}

async function executeJson(command, args) {
  const { stdout } = await runCommand(command, args, { cwd: projectRoot });
  return JSON.parse(stdout);
}

async function runCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd || projectRoot,
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
  const code = await new Promise((resolvePromise) => {
    child.on("close", resolvePromise);
  });
  if (code !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with ${code}: ${stderr || stdout}`,
    );
  }
  return { stdout, stderr };
}

async function writeJson(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function toProjectRelative(filePath) {
  return filePath.replace(`${projectRoot}/`, "");
}
