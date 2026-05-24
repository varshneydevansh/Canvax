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
  checkpoint: "exports/canvax-checkpoint-latest.json",
  previewTweak: "exports/canvax-preview-tweak-latest.json",
  imagePromptPack: "exports/canvax-image-prompt-pack-latest.json",
  assetCandidates: "exports/canvax-asset-candidates-latest.json",
  imageHostTask: "exports/canvax-image-host-task-latest.json",
  imageResults: "exports/canvax-image-results-latest.json",
  projectLink: "exports/canvax-project-link-latest.json",
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
    checkpoint: await readJsonSource(options.checkpoint || defaultPaths.checkpoint),
    previewTweak: await readJsonSource(
      options.previewTweak || defaultPaths.previewTweak,
    ),
    imagePromptPack: await readJsonSource(
      options.imagePromptPack || defaultPaths.imagePromptPack,
    ),
    assetCandidates: await readJsonSource(
      options.assetCandidates || defaultPaths.assetCandidates,
    ),
    imageHostTask: await readJsonSource(
      options.imageHostTask || defaultPaths.imageHostTask,
    ),
    imageResults: await readJsonSource(
      options.imageResults || defaultPaths.imageResults,
    ),
    projectLink: await readJsonSource(
      options.projectLink || defaultPaths.projectLink,
    ),
    outputManifest: await readJsonSource(
      options.outputManifest || defaultPaths.outputManifest,
    ),
  };
  const live = sourceFiles.live.value || {};
  const taskPack = sourceFiles.taskPack.value || {};
  const buildRequest = sourceFiles.buildRequest.value || {};
  const rewriteRequest = sourceFiles.rewriteRequest.value || {};
  const checkpoint = sourceFiles.checkpoint.value || {};
  const previewTweak = sourceFiles.previewTweak.value || {};
  const imagePromptPack = sourceFiles.imagePromptPack.value || {};
  const assetCandidates = sourceFiles.assetCandidates.value || {};
  const imageHostTask = sourceFiles.imageHostTask.value || {};
  const imageResults = sourceFiles.imageResults.value || {};
  const projectLink = sourceFiles.projectLink.value || {};
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
  const projectLinkBinding = resolveProjectLink({
    projectLink,
    frameId,
    full: options.full,
  });
  const selectedPayload = selectPayload(options.command, {
    activeFrame,
    designKit,
    spatialWorkspace,
    outputBinding,
    projectLinkBinding,
    sourceFiles,
    live,
    taskPack,
    buildRequest,
    rewriteRequest,
    checkpoint,
    previewTweak,
    imagePromptPack,
    assetCandidates,
    imageHostTask,
    imageResults,
    projectLink,
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
        "get_host_handoff",
        "get_current_frame",
        "get_spatial_workspace",
        "get_design_kit",
        "get_output_binding",
        "get_project_link",
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
      projectLinkedFileCount: projectLinkBinding.linkedFiles.length,
      projectLinkName: projectLinkBinding.name,
    },
    payload: selectedPayload,
  };
}

function selectPayload(command, payloads) {
  if (command === "host-handoff") {
    return {
      hostHandoff: buildHostHandoff(payloads),
    };
  }
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
  if (command === "project-link") {
    return {
      projectLink: payloads.projectLinkBinding,
    };
  }
  if (command === "all") {
    return {
      currentFrame: payloads.activeFrame,
      frameSummary: summarizeFrame(payloads.activeFrame),
      designKit: payloads.designKit,
      spatialWorkspace: payloads.spatialWorkspace,
      outputBinding: payloads.outputBinding,
      projectLink: payloads.projectLinkBinding,
    };
  }
  return {
    currentFrame: summarizeFrame(payloads.activeFrame),
    designKit: summarizeDesignKit(payloads.designKit),
    spatialWorkspace: payloads.spatialWorkspace.summary,
    outputBinding: summarizeOutputBinding(payloads.outputBinding),
    projectLink: summarizeProjectLink(payloads.projectLinkBinding),
  };
}

function buildHostHandoff(payloads) {
  const frameId = payloads.activeFrame?.id || "";
  const voice = summarizeVoiceContext(
    payloads.live.voice ||
      payloads.taskPack.voice ||
      payloads.rewriteRequest.voice ||
      {},
    frameId,
  );
  const rewriteQueue = collectFrameRewriteQueue(
    [
      payloads.live.rewriteQueue,
      payloads.taskPack.rewriteQueue,
      payloads.rewriteRequest.rewriteQueue,
    ],
    frameId,
  );
  const previewTweak = summarizePreviewTweak(payloads.previewTweak, frameId);
  const sketch = summarizeFrameComposition(payloads.activeFrame?.composition);
  const output = summarizeOutputBinding(payloads.outputBinding);
  const projectLink = summarizeProjectLink(payloads.projectLinkBinding);
  const designKit = summarizeDesignKit(payloads.designKit);
  const assets = summarizeAssetHostContext({
    imagePromptPack: payloads.imagePromptPack,
    assetCandidates: payloads.assetCandidates,
    imageHostTask: payloads.imageHostTask,
    imageResults: payloads.imageResults,
    sourceFiles: payloads.sourceFiles,
  });
  const nextActions = buildHostNextActions({
    frameId,
    taskPack: payloads.taskPack,
    buildRequest: payloads.buildRequest,
    rewriteQueue,
    previewTweak,
    output,
    projectLink,
    assets,
  });
  return {
    kind: "canvax-host-handoff",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    requiresOpenAiApiKey: false,
    source: "scripts/canvax-inspect.mjs host-handoff",
    transport:
      payloads.live.transport || {
        mode: "local-companion",
        future: { mode: "app-server", status: "planned" },
      },
    project:
      payloads.live.project ||
      payloads.taskPack.project ||
      payloads.buildRequest.project ||
      payloads.rewriteRequest.project ||
      null,
    board: {
      project:
        payloads.live.board?.project ||
        payloads.taskPack.board?.project ||
        payloads.rewriteRequest.board?.project ||
        "",
      goal:
        payloads.live.board?.goal ||
        payloads.taskPack.board?.goal ||
        payloads.rewriteRequest.board?.goal ||
        "",
      audience:
        payloads.live.board?.audience ||
        payloads.taskPack.board?.audience ||
        "",
      actionMode:
        payloads.taskPack.actionMode ||
        payloads.live.board?.actionMode ||
        payloads.rewriteRequest.board?.actionMode ||
        "",
    },
    frame: {
      ...summarizeFrame(payloads.activeFrame),
      snapshot: {
        path: payloads.activeFrame?.snapshotPath || "",
        thumbnailPath: payloads.activeFrame?.thumbnailPath || "",
        captureCount: payloads.activeFrame?.captureCount || 0,
      },
    },
    sketch,
    voice,
    rewrite: {
      queue: rewriteQueue,
      previewTweak,
      requestPath: payloads.sourceFiles.rewriteRequest?.path || "",
      requestExists: Boolean(payloads.sourceFiles.rewriteRequest?.exists),
      instruction: payloads.rewriteRequest.instruction || "",
      revisionGraphKind: payloads.rewriteRequest.revisionGraph?.kind || "",
    },
    checkpoint: summarizeCheckpoint(payloads.checkpoint, payloads.sourceFiles.checkpoint),
    output,
    projectLink,
    designKit,
    spatial: {
      summary: payloads.spatialWorkspace.summary,
      selectedObjectIds:
        payloads.spatialWorkspace.summary?.selectedObjectIds || [],
      selectedObjectId: payloads.spatialWorkspace.summary?.selectedObjectId || "",
    },
    assets,
    sourceFiles: Object.fromEntries(
      Object.entries(payloads.sourceFiles).map(([key, source]) => [
        key,
        {
          path: source.path,
          exists: source.exists,
        },
      ]),
    ),
    nextAction: nextActions[0] || null,
    nextActions,
    noApiBoundary:
      "This host handoff is assembled from local Canvax files only. It does not call OpenAI, ChatGPT, image APIs, browser automation, or paid APIs.",
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

function resolveProjectLink({ projectLink, frameId, full }) {
  const linkedFiles = Array.isArray(projectLink?.linkedFiles)
    ? projectLink.linkedFiles
    : [];
  const matchingFiles = frameId
    ? linkedFiles.filter(
        (file) =>
          !Array.isArray(file?.frameIds) ||
          !file.frameIds.length ||
          file.frameIds.includes(frameId),
      )
    : linkedFiles;
  return {
    kind: "canvax-project-link-inspection",
    exists: projectLink?.kind === "canvax-project-link",
    name: projectLink?.name || "",
    targetRoot: projectLink?.targetRoot || "",
    frameIds: Array.isArray(projectLink?.frameIds) ? projectLink.frameIds : [],
    previewUrl: projectLink?.previewUrl || "",
    previewPath: projectLink?.previewPath || "",
    linkedFiles: full ? matchingFiles : matchingFiles.slice(0, 20),
    linkedFileCount: matchingFiles.length,
    codexEditContract: full ? projectLink?.codexEditContract || null : null,
    manifest: full ? projectLink?.manifest || null : null,
    noApiBoundary: projectLink?.noApiBoundary || "",
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

function summarizeProjectLink(link) {
  if (!link?.exists) {
    return {
      exists: false,
      linkedFileCount: 0,
    };
  }
  return {
    exists: true,
    name: link.name || "",
    targetRoot: link.targetRoot || "",
    frameIds: link.frameIds || [],
    previewUrl: link.previewUrl || "",
    previewPath: link.previewPath || "",
    linkedFileCount: link.linkedFileCount || link.linkedFiles?.length || 0,
    linkedFiles: link.linkedFiles?.slice(0, 12) || [],
  };
}

function summarizeFrameComposition(composition) {
  const elements = Array.isArray(composition?.elements) ? composition.elements : [];
  const labels = Array.isArray(composition?.labels) ? composition.labels : [];
  const outputAnnotations = Array.isArray(composition?.outputAnnotations)
    ? composition.outputAnnotations
    : [];
  return {
    coordinateSystem: composition?.coordinateSystem || "normalized-frame",
    viewport: composition?.viewport || null,
    safeZones: composition?.safeZones || null,
    elementCount: elements.length,
    labelCount: labels.length,
    outputAnnotationCount: outputAnnotations.length,
    elementTypes: countBy(elements, (element) => element?.type || "unknown"),
    elements: elements.slice(0, 40).map(summarizeCompositionElement),
    labels: labels.slice(0, 24).map((label) => ({
      id: label?.id || "",
      text: label?.text || label?.label || "",
      x: label?.x,
      y: label?.y,
      width: label?.width,
      height: label?.height,
    })),
    outputAnnotations: outputAnnotations.slice(0, 24),
  };
}

function summarizeCompositionElement(element) {
  return {
    id: element?.id || "",
    type: element?.type || "",
    label: element?.label || element?.text || "",
    x: element?.x,
    y: element?.y,
    width: element?.width,
    height: element?.height,
    color: element?.color || "",
    targetId: element?.targetId || element?.componentTargetId || "",
  };
}

function summarizeVoiceContext(voice, frameId) {
  const segments = Array.isArray(voice?.segments) ? voice.segments : [];
  const frameGroups = Array.isArray(voice?.frameGroups) ? voice.frameGroups : [];
  const directFrameSegments = segments.filter((segment) =>
    segmentBelongsToFrame(segment, frameId),
  );
  const groupedFrameSegments = frameGroups
    .filter((group) => !frameId || group?.frameId === frameId)
    .flatMap((group) => (Array.isArray(group?.segments) ? group.segments : []));
  const frameSegments = dedupeById([
    ...directFrameSegments,
    ...groupedFrameSegments,
  ]);
  const fallbackSegments = frameSegments.length ? frameSegments : segments.slice(0, 8);
  const intentQueue = Array.isArray(voice?.intentQueue) ? voice.intentQueue : [];
  const frameIntentQueue = intentQueue.filter((intent) =>
    !frameId || !intent?.frameId || intent.frameId === frameId,
  );
  return {
    activeScope: voice?.activeScope || "",
    segmentCount: Number(voice?.segmentCount || segments.length || 0),
    frameSegmentCount: frameSegments.length,
    sessionSegmentCount: Number(voice?.sessionSegmentCount || 0),
    intentCount: intentQueue.length,
    frameIntentCount: frameIntentQueue.length,
    segments: fallbackSegments.slice(0, 8).map(summarizeVoiceSegment),
    intentQueue: frameIntentQueue.slice(0, 12).map((intent) => ({
      id: intent?.id || "",
      type: intent?.type || intent?.intent || "",
      label: intent?.label || "",
      text: intent?.text || intent?.summary || "",
      frameId: intent?.frameId || "",
    })),
  };
}

function segmentBelongsToFrame(segment, frameId) {
  if (!frameId) {
    return true;
  }
  if (!segment || typeof segment !== "object") {
    return false;
  }
  if (segment.frameId === frameId) {
    return true;
  }
  if (Array.isArray(segment.frameIds) && segment.frameIds.includes(frameId)) {
    return true;
  }
  return !segment.frameId && !Array.isArray(segment.frameIds);
}

function summarizeVoiceSegment(segment) {
  return {
    id: segment?.id || "",
    scope: segment?.scope || "",
    frameId: segment?.frameId || "",
    provider: segment?.provider || segment?.source || "",
    at: segment?.at || segment?.createdAt || "",
    text: compactText(segment?.text || segment?.transcript || "", 220),
  };
}

function collectFrameRewriteQueue(queueSources, frameId) {
  return dedupeById(
    queueSources
      .flatMap((queue) => (Array.isArray(queue) ? queue : []))
      .filter((item) => !frameId || !item?.frameId || item.frameId === frameId),
  )
    .slice(0, 12)
    .map((item) => ({
      id: item?.id || `${item?.frameId || "frame"}:${item?.reason || "rewrite"}`,
      frameId: item?.frameId || "",
      label: item?.label || "",
      reason: item?.reason || "",
      status: item?.status || "",
      outputTargetId: item?.outputTargetId || "",
      updatedAt: item?.updatedAt || item?.at || "",
    }));
}

function summarizePreviewTweak(previewTweak, frameId) {
  if (previewTweak?.kind !== "canvax-preview-tweak-request") {
    return null;
  }
  if (frameId && previewTweak.frameId && previewTweak.frameId !== frameId) {
    return null;
  }
  return {
    id: previewTweak.id || "",
    frameId: previewTweak.frameId || "",
    note: previewTweak.note || previewTweak.prompt || "",
    region: previewTweak.region || null,
    createdAt: previewTweak.createdAt || previewTweak.savedAt || "",
    source: previewTweak.source || "preview-tweak",
  };
}

function summarizeAssetHostContext({
  imagePromptPack,
  assetCandidates,
  imageHostTask,
  imageResults,
  sourceFiles,
}) {
  const candidates = Array.isArray(assetCandidates?.candidates)
    ? assetCandidates.candidates
    : [];
  const tasks = Array.isArray(imageHostTask?.tasks) ? imageHostTask.tasks : [];
  const results = Array.isArray(imageResults?.results) ? imageResults.results : [];
  return {
    imagePromptPackExists: imagePromptPack?.kind === "canvax-image-prompt-pack",
    assetCandidateCount: candidates.length,
    imageHostTaskCount: tasks.length,
    imageResultCount: results.length,
    promptPackPath: sourceFiles.imagePromptPack?.path || "",
    assetCandidatesPath: sourceFiles.assetCandidates?.path || "",
    imageHostTaskPath: sourceFiles.imageHostTask?.path || "",
    imageResultsPath: sourceFiles.imageResults?.path || "",
    openSlots: candidates
      .flatMap((candidate) =>
        (Array.isArray(candidate?.outputSlots) ? candidate.outputSlots : []).map(
          (slot) => ({
            candidateId: candidate.id || "",
            slotId: slot?.id || "",
            label: slot?.label || candidate.title || candidate.label || "",
            accepted: Boolean(slot?.accepted),
          }),
        ),
      )
      .filter((slot) => !slot.accepted)
      .slice(0, 12),
  };
}

function summarizeCheckpoint(checkpoint, source) {
  return {
    exists: Boolean(source?.exists),
    path: source?.path || "",
    savedAt: checkpoint?.savedAt || "",
    reason: checkpoint?.reason || "",
    label: checkpoint?.label || "",
    frameId: checkpoint?.frameId || checkpoint?.activeFrameId || "",
    frameTitle: checkpoint?.frameTitle || checkpoint?.activeFrameTitle || "",
    frameCount: Array.isArray(checkpoint?.frames) ? checkpoint.frames.length : 0,
    voiceSegmentCount: Number(checkpoint?.summary?.voiceSegmentCount || 0),
    artifactCount: Array.isArray(checkpoint?.summary?.artifacts)
      ? checkpoint.summary.artifacts.length
      : Number(checkpoint?.summary?.artifactCount || 0),
  };
}

function buildHostNextActions({
  frameId,
  taskPack,
  buildRequest,
  rewriteQueue,
  previewTweak,
  output,
  projectLink,
  assets,
}) {
  const actions = [];
  const hasOutput = Boolean(output?.recordCount || output?.hasOutputEditBinding);
  const hasBuildRequest =
    buildRequest?.kind === "canvax-build-real-request" ||
    Boolean(buildRequest?.frames?.length);
  if (previewTweak || rewriteQueue.length || hasOutput) {
    actions.push({
      id: "execute-rewrite",
      label: "Refresh frame output",
      command: "npm run execute-rewrite",
      reason: previewTweak
        ? "A Preview region tweak is waiting for the current frame."
        : "The current frame has output context that can be refreshed from sketch and voice.",
    });
  }
  if (!hasOutput && hasBuildRequest) {
    actions.push({
      id: "execute-build",
      label: "Build first frame output",
      command: "npm run execute-build",
      reason: "The frame has a build request but no bound output record yet.",
    });
  }
  if (projectLink?.exists && projectLink.linkedFileCount) {
    actions.push({
      id: "project-linked-patch",
      label: "Apply generated patch to linked files",
      command:
        "npm run execute-patch -- --task artifacts/preview/codex-rewrite/frames/<frame-id>/codex-patch-task.json",
      reason:
        "The frame has allowlisted project files that can receive a frame-bound patch task.",
    });
  }
  if (assets.imageHostTaskCount || taskPack?.actionMode === "image-prompt") {
    actions.push({
      id: "host-image-generation",
      label: "Generate or return image asset",
      command:
        "npm run import-image-results -- --candidate <candidate-id> --slot <slot-id> --image <path-or-url>",
      reason:
        "The frame has image prompt or host-task context and open asset slots.",
    });
  }
  actions.push({
    id: "publish-output",
    label: "Publish Codex output to Canvax",
    command: `node scripts/write-codex-output.mjs --from-git-status${
      frameId ? ` --frame ${frameId}` : ""
    }`,
    reason:
      "After Codex edits real files or writes an artifact, publish the binding back to Canvax.",
  });
  return actions;
}

function dedupeById(values) {
  const seen = new Set();
  return values.filter((value, index) => {
    const key =
      value?.id ||
      `${value?.frameId || "frame"}:${value?.reason || value?.text || index}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function compactText(value, maxLength) {
  const text = cleanString(value).replace(/\s+/g, " ");
  if (!maxLength || text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
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
  const isHostHandoff =
    inspection.command === "host-handoff" && inspection.payload?.hostHandoff;
  const jsonPath = resolve(
    exportsRoot,
    isHostHandoff ? "canvax-host-handoff-latest.json" : "canvax-inspect-latest.json",
  );
  const markdownPath = resolve(
    exportsRoot,
    isHostHandoff ? "canvax-host-handoff-latest.md" : "canvax-inspect-latest.md",
  );
  inspection.saved = {
    jsonPath: relativeProjectPath(jsonPath),
    markdownPath: relativeProjectPath(markdownPath),
  };
  await writeFile(
    jsonPath,
    `${JSON.stringify(
      isHostHandoff ? inspection.payload.hostHandoff : inspection,
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(
    markdownPath,
    isHostHandoff
      ? buildHostHandoffMarkdown(inspection.payload.hostHandoff)
      : buildInspectionMarkdown(inspection),
    "utf8",
  );
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
    `- Project linked files: ${inspection.summary?.projectLinkedFileCount || 0}`,
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

function buildHostHandoffMarkdown(handoff) {
  const lines = [
    "# Canvax Host Handoff",
    "",
    `- Frame: ${handoff.frame?.title || handoff.frame?.id || "n/a"}`,
    `- Requires OpenAI API key: ${handoff.requiresOpenAiApiKey ? "yes" : "no"}`,
    `- Transport: ${handoff.transport?.mode || "local-companion"}`,
    `- Sketch elements: ${handoff.sketch?.elementCount || 0}`,
    `- Voice segments: ${handoff.voice?.segmentCount || 0}`,
    `- Rewrite queue: ${handoff.rewrite?.queue?.length || 0}`,
    `- Output records: ${handoff.output?.recordCount || 0}`,
    `- Project linked files: ${handoff.projectLink?.linkedFileCount || 0}`,
    "",
    "## Next Action",
    "",
    handoff.nextAction
      ? `${handoff.nextAction.label}: \`${handoff.nextAction.command}\``
      : "No next action selected.",
    "",
    "## Source Files",
    "",
    ...Object.entries(handoff.sourceFiles || {}).map(
      ([key, value]) =>
        `- ${key}: ${value.exists ? "found" : "missing"} (${value.path})`,
    ),
    "",
    "## Boundary",
    "",
    handoff.noApiBoundary,
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
    checkpoint: "",
    previewTweak: "",
    imagePromptPack: "",
    assetCandidates: "",
    imageHostTask: "",
    imageResults: "",
    outputManifest: "",
    projectLink: "",
  };
  const commands = new Set([
    "summary",
    "host-handoff",
    "current-frame",
    "spatial-workspace",
    "design-kit",
    "output-binding",
    "project-link",
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
    } else if (arg === "--checkpoint") {
      options.checkpoint = argv[++index] || "";
    } else if (arg === "--preview-tweak") {
      options.previewTweak = argv[++index] || "";
    } else if (arg === "--image-prompt-pack") {
      options.imagePromptPack = argv[++index] || "";
    } else if (arg === "--asset-candidates") {
      options.assetCandidates = argv[++index] || "";
    } else if (arg === "--image-host-task") {
      options.imageHostTask = argv[++index] || "";
    } else if (arg === "--image-results") {
      options.imageResults = argv[++index] || "";
    } else if (arg === "--manifest") {
      options.outputManifest = argv[++index] || "";
    } else if (arg === "--project-link") {
      options.projectLink = argv[++index] || "";
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
  node scripts/canvax-inspect.mjs [summary|host-handoff|current-frame|spatial-workspace|design-kit|output-binding|project-link|all] [--json] [--markdown] [--save] [--frame id] [--full]

Reads local Canvax handoff files and returns a stable read-only inspection
payload for Codex/agent use. This is the local CLI precursor to future MCP tools:
get_host_handoff, get_current_frame, get_spatial_workspace, get_design_kit,
get_output_binding, and get_project_link. The host-handoff command assembles
the current frame, sketch composition, voice intent, rewrite queue, output
binding, project-link, image host context, and next Codex action into one
host-readable packet; with --save it writes exports/canvax-host-handoff-latest.*.
It does not require OPENAI_API_KEY and does not call hosted models or image APIs.`);
}
