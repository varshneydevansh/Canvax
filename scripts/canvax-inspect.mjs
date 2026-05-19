#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const exportsRoot = resolve(projectRoot, "exports");
const defaultPaths = {
  live: "exports/canvax-live-latest.json",
  taskPack: "exports/canvax-task-pack-latest.json",
  buildRequest: "exports/canvax-build-real-latest.json",
  rewriteRequest: "exports/canvax-rewrite-request-latest.json",
  outputManifest: "artifacts/canvax/codex-output.json",
};

const args = parseArgs(process.argv.slice(2));

try {
  const inspection = await buildInspection(args);
  if (args.save) {
    await saveInspection(inspection);
  }
  printInspection(inspection, args);
} catch (error) {
  const payload = {
    ok: false,
    kind: "canvax-readonly-inspection",
    schemaVersion: 1,
    requiresOpenAiApiKey: false,
    error: error instanceof Error ? error.message : String(error),
  };
  printInspection(payload, args);
  process.exitCode = 1;
}

async function buildInspection(options) {
  const sourceFiles = {
    live: await readJsonSource(options.live || defaultPaths.live),
    taskPack: await readJsonSource(options.taskPack || defaultPaths.taskPack),
    buildRequest: await readJsonSource(
      options.buildRequest || defaultPaths.buildRequest,
    ),
    rewriteRequest: await readJsonSource(
      options.rewriteRequest || defaultPaths.rewriteRequest,
    ),
    outputManifest: await readJsonSource(
      options.outputManifest || defaultPaths.outputManifest,
    ),
  };
  const live = sourceFiles.live.value || {};
  const taskPack = sourceFiles.taskPack.value || {};
  const buildRequest = sourceFiles.buildRequest.value || {};
  const rewriteRequest = sourceFiles.rewriteRequest.value || {};
  const outputManifest = sourceFiles.outputManifest.value || {};
  const activeFrameId =
    options.frame ||
    live.activeFrameId ||
    taskPack.activeFrameId ||
    buildRequest.activeFrameId ||
    rewriteRequest.activeFrameId ||
    "";
  const frames = Array.isArray(live.frames) ? live.frames : [];
  const activeFrame =
    frames.find((frame) => frame?.id === activeFrameId) || frames[0] || null;
  const frameId = options.frame || activeFrame?.id || activeFrameId || "";
  const warnings = [];
  if (activeFrameId && activeFrame?.id && activeFrame.id !== activeFrameId) {
    warnings.push(
      `Active frame ${activeFrameId} was not present in the latest frame list; using ${activeFrame.id}.`,
    );
  }
  const manifestRecords = collectManifestRecords(outputManifest, frameId);
  const designKit = resolveDesignKit({
    taskPack,
    buildRequest,
    live,
  });
  const outputBinding = resolveOutputBinding({
    frame: activeFrame,
    frameId,
    buildRequest,
    rewriteRequest,
    outputManifest,
    manifestRecords,
  });
  const spatialWorkspace = buildSpatialWorkspaceSummary(
    live.spatialWorkspace,
    options.full,
  );
  const selectedPayload = selectPayload(options.command, {
    activeFrame,
    designKit,
    spatialWorkspace,
    outputBinding,
    sourceFiles,
    live,
    taskPack,
    buildRequest,
    rewriteRequest,
    outputManifest,
  });

  return {
    ok: true,
    kind: "canvax-readonly-inspection",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    requiresOpenAiApiKey: false,
    command: options.command,
    frameId,
    activeFrameId: live.activeFrameId || "",
    warnings,
    sourceFiles: Object.fromEntries(
      Object.entries(sourceFiles).map(([key, source]) => [
        key,
        {
          path: source.path,
          exists: source.exists,
          error: source.error,
        },
      ]),
    ),
    toolSurface: {
      status: "local-readonly-cli",
      futureMcpTools: [
        "get_current_frame",
        "get_spatial_workspace",
        "get_design_kit",
        "get_output_binding",
      ],
      noApiBoundary:
        "This command reads local Canvax JSON/manifest files only. It does not call OpenAI, ChatGPT, image APIs, browser automation, or paid APIs.",
    },
    summary: {
      frameCount: frames.length,
      spatialObjectCount: live.spatialWorkspace?.objects?.length || 0,
      manifestTargetCount: outputManifest.targets?.length || 0,
      manifestChangeCount: outputManifest.changes?.length || 0,
      manifestArtifactCount: outputManifest.artifacts?.length || 0,
      designKitLabel: designKit?.label || designKit?.statusLabel || "",
      outputBindingCount: outputBinding.records.length,
    },
    payload: selectedPayload,
  };
}

function selectPayload(command, payloads) {
  if (command === "current-frame") {
    return {
      currentFrame: payloads.activeFrame,
      frameSummary: summarizeFrame(payloads.activeFrame),
    };
  }
  if (command === "spatial-workspace") {
    return {
      spatialWorkspace: payloads.spatialWorkspace,
    };
  }
  if (command === "design-kit") {
    return {
      designKit: payloads.designKit,
    };
  }
  if (command === "output-binding") {
    return {
      outputBinding: payloads.outputBinding,
    };
  }
  if (command === "all") {
    return {
      currentFrame: payloads.activeFrame,
      frameSummary: summarizeFrame(payloads.activeFrame),
      designKit: payloads.designKit,
      spatialWorkspace: payloads.spatialWorkspace,
      outputBinding: payloads.outputBinding,
    };
  }
  return {
    currentFrame: summarizeFrame(payloads.activeFrame),
    designKit: summarizeDesignKit(payloads.designKit),
    spatialWorkspace: payloads.spatialWorkspace.summary,
    outputBinding: summarizeOutputBinding(payloads.outputBinding),
  };
}

async function readJsonSource(pathValue) {
  const path = relativeProjectPath(resolveProjectPath(pathValue));
  try {
    const raw = await readFile(resolveProjectPath(pathValue), "utf8");
    return {
      path,
      exists: true,
      error: "",
      value: JSON.parse(raw),
    };
  } catch (error) {
    return {
      path,
      exists: false,
      error: error instanceof Error ? error.message : String(error),
      value: null,
    };
  }
}

function resolveDesignKit({ taskPack, buildRequest, live }) {
  return (
    taskPack.designKit ||
    buildRequest.designKit ||
    buildRequest.implementationContext?.designKit ||
    live.taskPack?.designKit ||
    null
  );
}

function resolveOutputBinding({
  frame,
  frameId,
  buildRequest,
  rewriteRequest,
  outputManifest,
  manifestRecords,
}) {
  const outputEditBinding =
    frame?.outputEditBinding ||
    buildRequest.outputEditBinding ||
    buildRequest.implementationContext?.frameRole?.outputEditBinding ||
    null;
  const buildOutputContract = buildRequest.outputContract || null;
  const rewriteGraphFrame = Array.isArray(rewriteRequest.revisionGraph?.frames)
    ? rewriteRequest.revisionGraph.frames.find(
        (entry) => entry?.frameId === frameId,
      )
    : null;
  return {
    kind: "canvax-output-binding-inspection",
    frameId,
    outputEditBinding,
    buildOutputContract,
    rewriteGraphFrame,
    manifestSource: outputManifest.source || "",
    manifestUpdatedAt: outputManifest.updatedAt || "",
    records: manifestRecords,
  };
}

function collectManifestRecords(manifest, frameId) {
  const records = [
    ...normalizeManifestRecords(manifest.targets, "target", "previewPath"),
    ...normalizeManifestRecords(manifest.changes, "change", "path"),
    ...normalizeManifestRecords(manifest.artifacts, "artifact", "path"),
  ];
  if (!frameId) {
    return records;
  }
  return records.filter(
    (record) =>
      !record.frameIds.length ||
      record.frameIds.includes(frameId) ||
      record.path.includes(frameId),
  );
}

function normalizeManifestRecords(records, type, pathKey) {
  if (!Array.isArray(records)) {
    return [];
  }
  return records.map((record, index) => ({
    type,
    id: record?.id || `${type}-${index + 1}`,
    label: record?.label || record?.path?.split("/").pop() || "",
    path: record?.[pathKey] || record?.path || "",
    description: record?.description || record?.summary || "",
    frameIds: Array.isArray(record?.frameIds) ? record.frameIds : [],
    kind: record?.kind || record?.type || "",
  }));
}

function buildSpatialWorkspaceSummary(spatialWorkspace, full) {
  if (!spatialWorkspace) {
    return {
      summary: {
        exists: false,
        cardCount: 0,
        objectCount: 0,
        linkCount: 0,
      },
      full: null,
    };
  }
  const cards = Array.isArray(spatialWorkspace.cards)
    ? spatialWorkspace.cards
    : [];
  const objects = Array.isArray(spatialWorkspace.objects)
    ? spatialWorkspace.objects
    : [];
  const links = Array.isArray(spatialWorkspace.links)
    ? spatialWorkspace.links
    : [];
  const lanes = Array.isArray(spatialWorkspace.lanes)
    ? spatialWorkspace.lanes
    : [];
  const timeline = Array.isArray(spatialWorkspace.timeline)
    ? spatialWorkspace.timeline
    : [];
  return {
    summary: {
      exists: true,
      zoom: spatialWorkspace.zoom || 1,
      activeFrameId: spatialWorkspace.activeFrameId || "",
      entryFrameId: spatialWorkspace.entryFrameId || "",
      selectedObjectId: spatialWorkspace.selectedObjectId || "",
      selectedObjectIds: spatialWorkspace.selectedObjectIds || [],
      cardCount: cards.length,
      objectCount: objects.length,
      linkCount: links.length,
      laneCount: lanes.length,
      timelineCount: timeline.length,
      objectTypes: countBy(objects, (object) => object?.type || "unknown"),
    },
    cards: full ? cards : cards.slice(0, 12),
    objects: full ? objects : objects.slice(0, 20),
    links: full ? links : links.slice(0, 20),
    lanes,
    timeline: full ? timeline : timeline.slice(0, 30),
    full: full ? spatialWorkspace : null,
  };
}

function summarizeFrame(frame) {
  if (!frame) {
    return null;
  }
  return {
    id: frame.id || "",
    title: frame.title || frame.label || "",
    index: frame.index,
    viewport: frame.viewport || "",
    viewportWidth: frame.viewportWidth,
    viewportHeight: frame.viewportHeight,
    objective: frame.objective || "",
    layout: frame.layout || "",
    motion: frame.motion || "",
    assets: frame.assets || "",
    mobile: frame.mobile || "",
    captureCount: frame.captureCount || 0,
    outputAnnotationCount: frame.outputAnnotationCount || 0,
    snapshotPath: frame.snapshotPath || "",
    thumbnailPath: frame.thumbnailPath || "",
    hasOutputEditBinding: Boolean(frame.outputEditBinding),
  };
}

function summarizeDesignKit(designKit) {
  if (!designKit) {
    return null;
  }
  return {
    label: designKit.label || designKit.statusLabel || "",
    summary: designKit.summary || "",
    presetId: designKit.preset?.id || "",
    presetLabel: designKit.preset?.label || "",
    sourceCount: designKit.sources?.length || 0,
    palette:
      designKit.designTokens?.palette ||
      designKit.tokens?.palette ||
      designKit.preset?.tokens?.palette ||
      [],
  };
}

function summarizeOutputBinding(binding) {
  if (!binding) {
    return null;
  }
  return {
    frameId: binding.frameId || "",
    hasOutputEditBinding: Boolean(binding.outputEditBinding),
    hasBuildOutputContract: Boolean(binding.buildOutputContract),
    hasRewriteGraphFrame: Boolean(binding.rewriteGraphFrame),
    manifestSource: binding.manifestSource || "",
    recordCount: binding.records?.length || 0,
    records: binding.records?.slice(0, 12) || [],
  };
}

function countBy(values, getter) {
  return values.reduce((accumulator, value) => {
    const key = getter(value);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

async function saveInspection(inspection) {
  await mkdir(exportsRoot, { recursive: true });
  const jsonPath = resolve(exportsRoot, "canvax-inspect-latest.json");
  const markdownPath = resolve(exportsRoot, "canvax-inspect-latest.md");
  inspection.saved = {
    jsonPath: relativeProjectPath(jsonPath),
    markdownPath: relativeProjectPath(markdownPath),
  };
  await writeFile(jsonPath, `${JSON.stringify(inspection, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, buildInspectionMarkdown(inspection), "utf8");
}

function buildInspectionMarkdown(inspection) {
  const lines = [
    "# Canvax Read-Only Inspection",
    "",
    `- Command: ${inspection.command}`,
    `- Frame: ${inspection.frameId || "n/a"}`,
    `- Requires OpenAI API key: ${inspection.requiresOpenAiApiKey ? "yes" : "no"}`,
    `- Frames: ${inspection.summary?.frameCount || 0}`,
    `- Spatial objects: ${inspection.summary?.spatialObjectCount || 0}`,
    `- Output bindings: ${inspection.summary?.outputBindingCount || 0}`,
    "",
    "## Tool Surface",
    "",
    `Status: ${inspection.toolSurface?.status || "unknown"}`,
    "",
    "Future MCP-shaped tools:",
    ...(inspection.toolSurface?.futureMcpTools || []).map((tool) => `- ${tool}`),
    "",
    "## Source Files",
    "",
    ...Object.entries(inspection.sourceFiles || {}).map(
      ([key, value]) =>
        `- ${key}: ${value.exists ? "found" : "missing"} (${value.path})`,
    ),
  ];
  return `${lines.join("\n")}\n`;
}

function printInspection(inspection, options) {
  if (options.json) {
    console.log(JSON.stringify(inspection, null, 2));
    return;
  }
  if (options.markdown) {
    console.log(buildInspectionMarkdown(inspection));
    return;
  }
  if (!inspection.ok) {
    console.log(`fail: ${inspection.error || "Canvax inspection failed"}`);
    return;
  }
  console.log(
    `ok: inspected Canvax ${inspection.command} for ${inspection.frameId || "current board"}`,
  );
  console.log(
    `frames: ${inspection.summary.frameCount}, spatial objects: ${inspection.summary.spatialObjectCount}, output records: ${inspection.summary.outputBindingCount}`,
  );
  if (inspection.saved) {
    console.log(`saved: ${inspection.saved.jsonPath}`);
  }
}

function parseArgs(argv) {
  const options = {
    command: "summary",
    frame: "",
    full: false,
    json: false,
    markdown: false,
    save: false,
    live: "",
    taskPack: "",
    buildRequest: "",
    rewriteRequest: "",
    outputManifest: "",
  };
  const commands = new Set([
    "summary",
    "current-frame",
    "spatial-workspace",
    "design-kit",
    "output-binding",
    "all",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (index === 0 && commands.has(arg)) {
      options.command = arg;
    } else if (arg === "--frame") {
      options.frame = argv[++index] || "";
    } else if (arg === "--full") {
      options.full = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--markdown") {
      options.markdown = true;
    } else if (arg === "--save") {
      options.save = true;
    } else if (arg === "--live") {
      options.live = argv[++index] || "";
    } else if (arg === "--task-pack") {
      options.taskPack = argv[++index] || "";
    } else if (arg === "--build-request") {
      options.buildRequest = argv[++index] || "";
    } else if (arg === "--rewrite-request") {
      options.rewriteRequest = argv[++index] || "";
    } else if (arg === "--manifest") {
      options.outputManifest = argv[++index] || "";
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return options;
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

function printHelp() {
  console.log(`Usage:
  node scripts/canvax-inspect.mjs [summary|current-frame|spatial-workspace|design-kit|output-binding|all] [--json] [--markdown] [--save] [--frame id] [--full]

Reads local Canvax handoff files and returns a stable read-only inspection
payload for Codex/agent use. This is the local CLI precursor to future MCP tools:
get_current_frame, get_spatial_workspace, get_design_kit, and get_output_binding.
It does not require OPENAI_API_KEY and does not call hosted models or image APIs.`);
}
