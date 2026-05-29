import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const defaultRequestPath = resolve(
  projectRoot,
  "exports",
  "canvax-rewrite-request-latest.json",
);
const defaultTaskPackPath = resolve(
  projectRoot,
  "exports",
  "canvax-task-pack-latest.json",
);
const defaultPreviewTweakPath = resolve(
  projectRoot,
  "exports",
  "canvax-preview-tweak-latest.json",
);
const defaultOutputRoot = resolve(
  projectRoot,
  "artifacts",
  "preview",
  "codex-rewrite",
  "frames",
);
const liveEditSourceSearchFileGlobs = [
  "src/**/*.{js,jsx,ts,tsx,vue,svelte,astro,html,css,scss}",
  "app/**/*.{js,jsx,ts,tsx,html,css,scss}",
  "pages/**/*.{js,jsx,ts,tsx,html,css,scss}",
  "components/**/*.{js,jsx,ts,tsx,html,css,scss}",
  "styles/**/*.{css,scss}",
  "*.{js,jsx,ts,tsx,html,css,scss,md,mdx}",
];

const args = process.argv.slice(2);
const wantsJson = args.includes("--json");
const noPublish = args.includes("--no-publish");

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const requestPath = resolve(
  projectRoot,
  readOption(args, "--request") || defaultRequestPath,
);
const taskPackPath = resolve(
  projectRoot,
  readOption(args, "--task-pack") || defaultTaskPackPath,
);
const previewTweakPath = resolve(
  projectRoot,
  readOption(args, "--preview-tweak") || defaultPreviewTweakPath,
);
const request = await readJson(requestPath);

if (request?.kind !== "canvax-rewrite-request") {
  fail(`Expected canvax-rewrite-request at ${requestPath}`);
}

const taskPack = await readOptionalJson(taskPackPath);
const selected = selectRewriteFrame(request, taskPack);
const frameId = cleanString(selected.frame?.id || request.activeFrameId) || "frame";
const frameTitle =
  cleanString(selected.frame?.title || selected.requestFrame?.title) ||
  cleanString(request.activeFrameTitle) ||
  "Canvax frame";
const outputRoot = resolve(defaultOutputRoot, safeSlug(frameId));
const htmlPath = resolve(outputRoot, "index.html");
const contextPath = resolve(outputRoot, "context.json");
const patchTaskPath = resolve(outputRoot, "codex-patch-task.json");
const relativeHtmlPath = toProjectRelative(htmlPath);
const relativeContextPath = toProjectRelative(contextPath);
const relativePatchTaskPath = toProjectRelative(patchTaskPath);
const frameCodeMap = await loadFrameCodeMap(request, frameId);
const buildContract = await loadBuildContract(request, frameId);
const portTask = await loadPortTask(request, frameId);
const previewTweak = await loadPreviewTweak(previewTweakPath, frameId);
const acceptedLiveEdit = buildAcceptedLiveEditContext(selected);
const visualDirection = buildRewriteVisualDirection(buildContract);
const affectedRegions = buildAffectedRegions(
  selected,
  request,
  frameCodeMap,
  previewTweak,
  acceptedLiveEdit,
);
const affectedComponents = affectedComponentsFromRegions(affectedRegions);
const codexPatchTask = buildCodexPatchTask({
  frameId,
  frameTitle,
  previewTweak,
  acceptedLiveEdit,
  affectedRegions,
  affectedComponents,
  frameCodeMap,
  buildContract,
  portTask,
  previewPath: relativeHtmlPath,
  contextPath: relativeContextPath,
});

await mkdir(outputRoot, { recursive: true });
await writeFile(
  htmlPath,
  buildPreviewHtml({
    request,
    selected,
    frameId,
    frameTitle,
    affectedRegions,
    visualDirection,
    previewTweak,
  }),
  "utf8",
);
await writeFile(
  patchTaskPath,
  `${JSON.stringify(codexPatchTask, null, 2)}\n`,
  "utf8",
);
await writeFile(
  contextPath,
  `${JSON.stringify(
    buildContextPayload({
      request,
      selected,
      frameId,
      frameTitle,
      affectedRegions,
      affectedComponents,
      frameCodeMap,
      buildContract,
      portTask,
      visualDirection,
      previewTweak,
      acceptedLiveEdit,
      codexPatchTask,
      previewPath: relativeHtmlPath,
      patchTaskPath: relativePatchTaskPath,
    }),
    null,
    2,
  )}\n`,
  "utf8",
);

let publishResult = null;
if (!noPublish) {
  publishResult = await publishCodexOutput({
    frameId,
    frameTitle,
    relativeHtmlPath,
    relativeContextPath,
    affectedRegions,
    affectedComponents,
    frameCodeMap,
    buildContract,
    portTask,
    previewTweak,
    relativePatchTaskPath,
    queueItem: selected.queueItem,
  });
}

const result = {
  ok: true,
  requestPath: toProjectRelative(requestPath),
  taskPackPath: taskPack ? toProjectRelative(taskPackPath) : "",
  previewPath: relativeHtmlPath,
  contextPath: relativeContextPath,
  frameId,
  frameTitle,
  affectedRegionCount: affectedRegions.length,
  componentTargetCount: affectedComponents.length,
  previewTweakIncluded: Boolean(previewTweak),
  acceptedLiveEditIncluded: Boolean(acceptedLiveEdit),
  patchTaskPath: relativePatchTaskPath,
  published: Boolean(publishResult),
  manifestPath: publishResult?.manifestPath || "",
};

if (wantsJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Rewrote Canvax preview artifact: ${relativeHtmlPath}`);
  console.log(`Context: ${relativeContextPath}`);
  console.log(`Affected regions: ${affectedRegions.length}`);
  console.log(
    publishResult
      ? `Published Codex output manifest: ${publishResult.manifestPath}`
      : "Skipped Codex output manifest publish.",
  );
}

async function publishCodexOutput({
  frameId,
  frameTitle,
  relativeHtmlPath,
  relativeContextPath,
  affectedRegions,
  affectedComponents,
  frameCodeMap,
  buildContract,
  portTask,
  previewTweak,
  relativePatchTaskPath,
  queueItem,
}) {
  const frameCodeMapArtifactArgs = frameCodeMap?.path
    ? [
        "--artifact",
        `${frameCodeMap.path}::Frame-to-code ownership map::${frameId}`,
      ]
    : [];
  const buildContractArtifactArgs = buildContract?.path
    ? [
        "--artifact",
        `${buildContract.path}::Build integration contract::${frameId}`,
      ]
    : [];
  const portTaskArtifactArgs = portTask?.path
    ? [
        "--artifact",
        `${portTask.path}::Codex port task::${frameId}`,
      ]
    : [];
  const patchTaskArtifactArgs = relativePatchTaskPath
    ? [
        "--artifact",
        `${relativePatchTaskPath}::Codex patch task::${frameId}`,
      ]
    : [];
  const child = spawn(
    process.execPath,
    [
      "scripts/write-codex-output.mjs",
      "--preview-path",
      relativeHtmlPath,
      "--label",
      `${frameTitle} rewritten preview`,
      "--type",
      "refined-preview",
      "--source",
      "canvax-rewrite-request-executor",
      "--description",
      "Local preview artifact refreshed from the latest Canvax rewrite request.",
      "--notes",
      buildPublishNotes(
        queueItem,
        affectedRegions,
        affectedComponents,
        previewTweak,
        acceptedLiveEdit,
      ),
      "--frame",
      frameId,
      "--artifact",
      `${relativeHtmlPath}::Canvax rewritten preview::${frameId}`,
      "--artifact",
      `${relativeContextPath}::Rewrite request context::${frameId}`,
      ...patchTaskArtifactArgs,
      ...frameCodeMapArtifactArgs,
      ...buildContractArtifactArgs,
      ...portTaskArtifactArgs,
      "--json",
    ],
    {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const { stdout, stderr, code } = await collectChild(child);
  if (code !== 0) {
    fail(stderr || "write-codex-output failed");
  }
  return JSON.parse(stdout);
}

function selectRewriteFrame(request, taskPack) {
  const queue = Array.isArray(request.rewriteQueue) ? request.rewriteQueue : [];
  const queueItem = [...queue].sort(
    (left, right) => Number(left.priority || 0) - Number(right.priority || 0),
  )[0];
  const targetFrameId =
    cleanString(readOption(args, "--frame")) ||
    cleanString(queueItem?.frameId) ||
    cleanString(request.activeFrameId);
  const taskFrames = Array.isArray(taskPack?.frames) ? taskPack.frames : [];
  const requestFrames = Array.isArray(request.frames) ? request.frames : [];
  const frame =
    taskFrames.find((candidate) => candidate.id === targetFrameId) ||
    taskFrames.find((candidate) => candidate.id === request.activeFrameId) ||
    taskFrames[0] ||
    null;
  const requestFrame =
    requestFrames.find((candidate) => candidate.id === targetFrameId) ||
    requestFrames.find((candidate) => candidate.id === request.activeFrameId) ||
    requestFrames[0] ||
    null;
  return { frame, requestFrame, queueItem, targetFrameId };
}

function buildContextPayload({
  request,
  selected,
  frameId,
  frameTitle,
  affectedRegions,
  affectedComponents,
  frameCodeMap,
  buildContract,
  portTask,
  visualDirection,
  previewTweak,
  acceptedLiveEdit,
  codexPatchTask,
  previewPath,
  patchTaskPath,
}) {
  return {
    kind: "canvax-executed-rewrite-preview",
    createdAt: new Date().toISOString(),
    source: "scripts/execute-rewrite-request.mjs",
    requiresOpenAiApiKey: false,
    previewPath,
    patchTaskPath,
    frameId,
    frameTitle,
    queueItem: selected.queueItem || null,
    outputEditBinding:
      selected.requestFrame?.outputEditBinding ||
      selected.frame?.outputEditBinding ||
      null,
    affectedRegions,
    affectedComponents,
    acceptedLiveEdit,
    previewTweak: previewTweak
      ? {
          kind: previewTweak.kind || "canvax-preview-tweak-request",
          id: previewTweak.id || "",
          path: previewTweak.path || "",
          frameId: previewTweak.frameId || "",
          frameTitle: previewTweak.frameTitle || "",
          note: previewTweak.note || "",
          target: previewTweak.target || null,
          region: previewTweak.region || null,
      }
      : null,
    codexPatchTask,
    visualDirection,
    frameCodeMap: frameCodeMap
      ? {
          path: frameCodeMap.path,
          kind: frameCodeMap.map?.kind || "canvax-frame-code-map",
          regionCount: Array.isArray(frameCodeMap.map?.regions)
            ? frameCodeMap.map.regions.length
            : 0,
        }
      : null,
    buildContract: buildContract
      ? {
          path: buildContract.path,
          kind: buildContract.contract?.kind || "canvax-build-integration-contract",
          visualDirection:
            buildContract.contract?.visualDirection || null,
        }
      : null,
    portTask: portTask
      ? {
          path: portTask.path,
          kind: portTask.task?.kind || "canvax-codex-port-task",
          suggestedDestinations:
            portTask.task?.suggestedDestinations || null,
          requiredBindings: portTask.task?.requiredBindings || [],
          acceptanceCriteria: portTask.task?.acceptanceCriteria || [],
          publishCommands: portTask.task?.publishCommands || [],
        }
      : null,
    outputTargets: request.outputManifest?.targets || [],
    outputArtifacts: request.outputManifest?.artifacts || [],
    request,
  };
}

function buildCodexPatchTask({
  frameId,
  frameTitle,
  previewTweak,
  acceptedLiveEdit,
  affectedRegions,
  affectedComponents,
  frameCodeMap,
  buildContract,
  portTask,
  previewPath,
  contextPath,
}) {
  const suggestedFiles = collectPatchTaskFiles(
    frameCodeMap,
    portTask,
    acceptedLiveEdit,
    affectedComponents,
  );
  const sourceSearchHints = buildLiveEditSourceSearchHints(
    acceptedLiveEdit,
    affectedRegions,
    affectedComponents,
  );
  return {
    kind: "canvax-codex-patch-task",
    schemaVersion: 1,
    requiresOpenAiApiKey: false,
    createdAt: new Date().toISOString(),
    source: "scripts/execute-rewrite-request.mjs",
    frameId,
    frameTitle,
    trigger: buildPatchTaskTrigger({ acceptedLiveEdit, previewTweak }),
    liveEdit: acceptedLiveEdit,
    previewPath,
    contextPath,
    suggestedFiles,
    sourceDiscovery: buildLiveEditSourceDiscovery({
      acceptedLiveEdit,
      suggestedFiles,
      sourceSearchHints,
    }),
    sourceSearchHints,
    componentTargets: affectedComponents.map((component) => ({
      id: component.id || "",
      label: component.label || "",
      type: component.type || "",
      selector: component.selector || "",
      suggestedComponentName: component.suggestedComponentName || "",
      sourceFile: component.sourceFile || "",
      sourcePath: component.sourcePath || "",
      sourceSymbol: component.sourceSymbol || "",
      sourceLine: component.sourceLine || "",
      sourceComponent: component.sourceComponent || "",
      taskFile: component.taskFile || "",
      taskId: component.taskId || "",
      bounds: component.bounds || null,
    })),
    affectedRegions: affectedRegions.map((region) => ({
      source: region.source || "",
      label: region.label || "",
      note: region.note || "",
      normalizedBounds: region.normalizedBounds || null,
      componentTargetIds: region.componentTargetIds || [],
      liveEditTarget: region.liveEditTarget || null,
      liveEditVariant: region.liveEditVariant || null,
      liveEditRequest: region.liveEditRequest || null,
      liveEditSurfaceOperations: region.liveEditSurfaceOperations || [],
      liveEditPins: region.liveEditPins || [],
      liveEditCanvasMarks: region.liveEditCanvasMarks || [],
      targetSourceHint: region.liveEditTarget?.targetSourceHint || null,
      sourceSearchHints:
        region.source === "live-edit-accepted-variant"
          ? sourceSearchHints
          : [],
    })),
    designContract: buildContract?.path || "",
    portTask: portTask?.path || "",
    instructions: [
      "Use this file as the narrow production-edit target for the current Canvax Preview tweak or rewrite request.",
      acceptedLiveEdit
        ? "This task came from an accepted Canvax Live Edit variant. Apply the selected variant to the outlined target first, using pins and strokes as direct editing intent."
        : "",
      "Prefer the component selectors and suggested files before making broad layout changes.",
      sourceSearchHints.length
        ? "No explicit source file was attached to the accepted Live Edit target. Use sourceSearchHints to search the local project by selector, text, node id, component name, and target label before treating the pick as screenshot-only."
        : "",
      "Preserve unrelated generated output regions unless the Canvax note, sketch, or voice context explicitly asks for broader changes.",
      "After editing real app files, publish the result with scripts/write-codex-output.mjs so Canvax Preview can bind the update.",
    ].filter(Boolean),
    acceptanceCriteria: [
      ...(acceptedLiveEdit
        ? [
            "The accepted Live Edit variant is reflected in the selected target, not treated as a whole-page redesign.",
            "The picked target binding, normalized bounds, and component ownership remain traceable after the edit.",
          ]
        : []),
      "The selected Preview/output region changes according to the tweak note.",
      "Frame-bound data-canvax selectors or equivalent component ownership remain traceable.",
      "No OpenAI API key or paid API call is required by this local patch task.",
      ...(Array.isArray(portTask?.task?.acceptanceCriteria)
        ? portTask.task.acceptanceCriteria.slice(0, 6)
        : []),
    ],
    publishCommands:
      Array.isArray(portTask?.task?.publishCommands) &&
      portTask.task.publishCommands.length
        ? portTask.task.publishCommands
        : [
            `node scripts/write-codex-output.mjs --from-git-status --frame ${frameId}`,
          ],
    noApiBoundary:
      "This patch task is local planning data for Codex. It does not call ChatGPT, image generation, browser automation, or paid APIs.",
  };
}

function buildLiveEditSourceDiscovery({
  acceptedLiveEdit = null,
  suggestedFiles = [],
  sourceSearchHints = [],
}) {
  const target = acceptedLiveEdit?.target || null;
  if (!acceptedLiveEdit || !target) {
    return {
      kind: "canvax-live-edit-source-discovery",
      status: "not-live-edit",
      hintCount: 0,
      suggestedFileCount: suggestedFiles.length,
      reason: "Patch task did not come from an accepted Live Edit target.",
    };
  }
  if (sourceSearchHints.length) {
    return {
      kind: "canvax-live-edit-source-discovery",
      status: "needs-source-search",
      hintCount: sourceSearchHints.length,
      suggestedFileCount: suggestedFiles.length,
      targetId: target.targetId || "",
      targetType: target.targetType || "",
      reason:
        "Accepted Live Edit target has no concrete source file/task binding; search hints preserve direct target intent for Codex.",
    };
  }
  return {
    kind: "canvax-live-edit-source-discovery",
    status: "explicit-or-generated-binding",
    hintCount: 0,
    suggestedFileCount: suggestedFiles.length,
    targetId: target.targetId || "",
    targetType: target.targetType || "",
    reason:
      "Accepted Live Edit target already has source-hinted, component-map, generated-bundle, or project-linked files.",
  };
}

function collectPatchTaskFiles(
  frameCodeMap,
  portTask,
  acceptedLiveEdit = null,
  affectedComponents = [],
) {
  const files = [];
  const frameRoot = frameCodeMap?.path ? dirname(dirname(frameCodeMap.path)) : "";
  const ownershipFiles = Array.isArray(frameCodeMap?.map?.ownership?.files)
    ? frameCodeMap.map.ownership.files
    : Array.isArray(frameCodeMap?.map?.fileOwnership?.files)
      ? frameCodeMap.map.fileOwnership.files
      : [];
  ownershipFiles.forEach((file) => {
    const path = cleanString(file.path);
    if (!path) {
      return;
    }
    files.push({
      path: path.startsWith("artifacts/") || !frameRoot
        ? path
        : `${frameRoot}/${path}`,
      role: cleanString(file.role),
      source: "frame-code-map",
    });
  });
  flattenPatchTaskDestinations(portTask?.task?.suggestedDestinations).forEach(
    (destination) => {
      const path = cleanString(destination.path);
      if (path) {
        files.push({
          path,
          role: cleanString(destination.role),
          source: "codex-port-task",
        });
      }
    },
  );
  collectLiveEditSourceHintFiles(acceptedLiveEdit, affectedComponents).forEach(
    (file) => files.push(file),
  );
  const seen = new Set();
  return files.filter((file) => {
    if (seen.has(file.path)) {
      return false;
    }
    seen.add(file.path);
    return true;
  });
}

function collectLiveEditSourceHintFiles(acceptedLiveEdit, affectedComponents = []) {
  const files = [];
  const addFile = (path, role, source) => {
    const cleanPath = cleanString(path);
    if (!cleanPath) {
      return;
    }
    files.push({
      path: cleanPath,
      role: cleanString(role) || "live edit source hint",
      source: cleanString(source) || "live-edit-source-hint",
    });
  };
  const target = acceptedLiveEdit?.target || {};
  addFile(
    target.targetSourceFile || target.targetSourcePath,
    target.targetSourceComponent ||
      target.targetSourceSymbol ||
      "picked target source",
    "accepted-live-edit-target",
  );
  addFile(target.targetTaskFile, "picked target task", "accepted-live-edit-task");
  if (target.targetSourceHint && typeof target.targetSourceHint === "object") {
    addFile(
      target.targetSourceHint.file || target.targetSourceHint.path,
      target.targetSourceHint.component ||
        target.targetSourceHint.symbol ||
        "picked target source hint",
      "accepted-live-edit-source-hint",
    );
    addFile(
      target.targetSourceHint.taskFile,
      "picked target task hint",
      "accepted-live-edit-source-hint",
    );
  }
  affectedComponents.forEach((component) => {
    addFile(
      component.sourceFile || component.sourcePath || component.suggestedFile,
      component.sourceComponent ||
        component.suggestedComponentName ||
        component.label ||
        "component source hint",
      "component-target-source-hint",
    );
    addFile(component.taskFile, "component task hint", "component-target-source-hint");
  });
  return files;
}

function buildLiveEditSourceSearchHints(
  acceptedLiveEdit = null,
  affectedRegions = [],
  affectedComponents = [],
) {
  const target = acceptedLiveEdit?.target || null;
  if (!target || liveEditHasConcreteSourceBinding(target, affectedComponents)) {
    return [];
  }
  const hints = [];
  const addHint = (query, searchType, reason, confidence = "medium") => {
    const cleanQuery = compactText(cleanString(query), 180);
    if (!cleanQuery) {
      return;
    }
    hints.push({
      kind: "unhinted-live-edit-source-search",
      query: cleanQuery,
      searchType,
      reason,
      confidence,
      targetId: target.targetId || "",
      targetNodeId: target.targetNodeId || "",
      targetType: target.targetType || "",
      targetLabel: target.targetLabel || "",
      targetSelector: target.targetSelector || "",
      targetText: target.targetText || "",
      targetSurface: target.surface || "",
      sourceFrameId: target.sourceFrameId || "",
      expectedFileGlobs: liveEditSourceSearchFileGlobs,
      suggestedCommands: buildSourceSearchCommands(cleanQuery),
    });
  };
  addHint(
    target.targetSelector,
    "selector",
    "Search for the exact DOM selector captured from the picked output target.",
    "high",
  );
  addHint(
    target.targetNodeId || target.targetId,
    "node-id",
    "Search for the Canvax node id, test id, or generated element id behind the picked target.",
    target.targetNodeId || target.targetSelector ? "high" : "medium",
  );
  addHint(
    target.targetSourceComponent || target.targetSourceSymbol,
    "component-name",
    "Search for a component or symbol name captured without an explicit source file path.",
    "medium",
  );
  addHint(
    target.targetText,
    "visible-text",
    "Search for visible text inside the picked region when no source file hint exists.",
    "medium",
  );
  addHint(
    target.targetLabel,
    "target-label",
    "Search for the human-readable target label from the Live Edit pick.",
    "low",
  );
  affectedComponents.forEach((component) => {
    if (component.sourceFile || component.sourcePath || component.suggestedFile) {
      return;
    }
    addHint(
      component.selector,
      "component-selector",
      "Search for a component selector inferred from overlapping frame-code ownership.",
      "high",
    );
    addHint(
      component.suggestedComponentName ||
        component.sourceComponent ||
        component.label ||
        component.id,
      "component-target",
      "Search for the nearest component target inferred from the picked bounds.",
      "medium",
    );
  });
  const acceptedRegion = affectedRegions.find(
    (region) => region.source === "live-edit-accepted-variant",
  );
  addHint(
    acceptedRegion?.note || acceptedLiveEdit.patchNote || target.note,
    "live-edit-intent",
    "Search nearby code/tasks using the accepted Live Edit note when structural identifiers are absent.",
    "low",
  );
  const seen = new Set();
  return hints
    .filter((hint) => {
      const key = `${hint.searchType}:${hint.query.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

function liveEditHasConcreteSourceBinding(target, affectedComponents = []) {
  if (
    cleanString(target?.targetSourceFile) ||
    cleanString(target?.targetSourcePath) ||
    cleanString(target?.targetTaskFile) ||
    cleanString(target?.targetSourceHint?.file) ||
    cleanString(target?.targetSourceHint?.path) ||
    cleanString(target?.targetSourceHint?.taskFile)
  ) {
    return true;
  }
  return affectedComponents.some(
    (component) =>
      cleanString(component.sourceFile) ||
      cleanString(component.sourcePath) ||
      cleanString(component.suggestedFile) ||
      cleanString(component.taskFile),
  );
}

function buildSourceSearchCommands(query) {
  const escaped = JSON.stringify(query);
  return [
    `rg -n ${escaped} src app pages components styles --glob '*.{js,jsx,ts,tsx,vue,svelte,astro,html,css,scss,md,mdx}'`,
    `rg -n ${escaped} . --glob '!node_modules' --glob '!dist' --glob '!build' --glob '!artifacts/preview'`,
  ];
}

function flattenPatchTaskDestinations(value) {
  if (Array.isArray(value)) {
    return value
      .map((destination) => {
        const path =
          typeof destination === "string"
            ? cleanString(destination)
            : cleanString(destination?.path || destination?.file);
        return path
          ? {
              path,
              role: cleanString(
                typeof destination === "string"
                  ? "suggested production destination"
                  : destination?.role || "suggested production destination",
              ),
            }
          : null;
      })
      .filter(Boolean);
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  const destinations = [];
  Object.entries(value).forEach(([framework, destination]) => {
    if (!destination || typeof destination !== "object") {
      return;
    }
    const directory = cleanString(destination.directory);
    const files = Array.isArray(destination.files) ? destination.files : [];
    files.forEach((file) => {
      const fileName = cleanString(file);
      if (!fileName) {
        return;
      }
      const separator = directory && !directory.endsWith("/") ? "/" : "";
      destinations.push({
        path: `${directory}${separator}${fileName}`,
        role: `${framework} suggested production destination`,
      });
    });
  });
  return destinations;
}

function buildAffectedRegions(
  selected,
  request,
  frameCodeMap = null,
  previewTweak = null,
  acceptedLiveEdit = null,
) {
  const regions = [];
  const viewport = frameViewport(selected);
  if (acceptedLiveEdit?.target?.bounds) {
    const bounds = acceptedLiveEdit.target.bounds;
    regions.push(
      withComponentTargets(
        {
          source: "live-edit-accepted-variant",
          label: acceptedLiveEdit.variant
            ? `Live Edit ${acceptedLiveEdit.variant.index}: ${acceptedLiveEdit.variant.label}`
            : "Accepted Live Edit",
          note: acceptedLiveEdit.patchNote,
          target: acceptedLiveEdit.target,
          liveEditTarget: acceptedLiveEdit.target,
          liveEditVariant: acceptedLiveEdit.variant,
          liveEditRequest: acceptedLiveEdit.liveEditRequest,
          liveEditSurfaceOperations: acceptedLiveEdit.surfaceOperations,
          liveEditPins: acceptedLiveEdit.pins,
          liveEditCanvasMarks: acceptedLiveEdit.canvasMarks,
          left: denormalize(bounds.x, viewport.width, 96),
          top: denormalize(bounds.y, viewport.height, 96),
          width: Math.max(28, denormalize(bounds.w, viewport.width, 180)),
          height: Math.max(28, denormalize(bounds.h, viewport.height, 100)),
        },
        frameCodeMap,
        viewport,
        acceptedLiveEdit.target,
      ),
    );
  }

  if (previewTweak?.region?.normalized) {
    const bounds = previewTweak.region.normalized;
    regions.push(
      withComponentTargets(
        {
          source: "preview-tweak",
          label: "Preview tweak",
          note: cleanString(previewTweak.note),
          target: previewTweak.target || null,
          left: denormalize(bounds.x, viewport.width, 96),
          top: denormalize(bounds.y, viewport.height, 96),
          width: Math.max(28, denormalize(bounds.width, viewport.width, 180)),
          height: Math.max(28, denormalize(bounds.height, viewport.height, 100)),
        },
        frameCodeMap,
        viewport,
      ),
    );
  }

  const targetRegions =
    request.outputManifest?.targets
      ?.flatMap((target) => target?.refinement?.changedRegions || [])
      .filter((region) => region && typeof region === "object") || [];
  targetRegions.slice(0, 12).forEach((region, index) => {
    regions.push(
      withComponentTargets(
        {
          source: "output-refinement",
          label: cleanString(region.label) || `Output delta ${index + 1}`,
          left: safeNumber(region.left, 40 + index * 18),
          top: safeNumber(region.top, 40 + index * 18),
          width: Math.max(24, safeNumber(region.width, 160)),
          height: Math.max(24, safeNumber(region.height, 90)),
        },
        frameCodeMap,
        viewport,
      ),
    );
  });

  const annotations = selected.requestFrame?.outputAnnotations || [];
  annotations.slice(0, 12).forEach((annotation, index) => {
    const bounds = annotation.bounds || annotation.normalizedBounds || {};
    regions.push(
      withComponentTargets(
        {
          source: "output-correction",
          label: `Correction mark ${index + 1}`,
          left: denormalize(
            bounds.x || bounds.left,
            viewport.width,
            96 + index * 20,
          ),
          top: denormalize(
            bounds.y || bounds.top,
            viewport.height,
            96 + index * 20,
          ),
          width: Math.max(
            28,
            denormalize(bounds.w || bounds.width, viewport.width, 180),
          ),
          height: Math.max(
            28,
            denormalize(bounds.h || bounds.height, viewport.height, 100),
          ),
        },
        frameCodeMap,
        viewport,
      ),
    );
  });

  if (!regions.length) {
    regions.push(
      withComponentTargets(
        {
          source: "rewrite-queue",
          label: cleanString(selected.queueItem?.label) || "Rewrite focus",
          left: 96,
          top: 96,
          width: 360,
          height: 190,
        },
        frameCodeMap,
        viewport,
      ),
    );
  }

  return regions.slice(0, 20);
}

function frameViewport(selected) {
  const frame = selected.frame || selected.requestFrame || {};
  const viewport = frame.composition?.viewport || {};
  return {
    width: Number(viewport.width || frame.viewportWidth || 1440),
    height: Number(viewport.height || frame.viewportHeight || 1024),
  };
}

function withComponentTargets(region, frameCodeMap, viewport, liveEditTarget = null) {
  const normalizedBounds = normalizeRegionBounds(region, viewport);
  const components = matchingFrameCodeRegions(
    frameCodeMap,
    normalizedBounds,
    liveEditTarget,
  );
  return {
    ...region,
    normalizedBounds,
    components,
    componentTargetIds: components.map((component) => component.id),
  };
}

function normalizeRegionBounds(region, viewport) {
  return {
    x: clamp01(safeNumber(region.left) / Math.max(1, viewport.width)),
    y: clamp01(safeNumber(region.top) / Math.max(1, viewport.height)),
    w: clamp01(safeNumber(region.width) / Math.max(1, viewport.width)),
    h: clamp01(safeNumber(region.height) / Math.max(1, viewport.height)),
  };
}

function matchingFrameCodeRegions(
  frameCodeMap,
  normalizedBounds,
  liveEditTarget = null,
) {
  const regions = Array.isArray(frameCodeMap?.map?.regions)
    ? frameCodeMap.map.regions
    : [];
  const exactTargetId = cleanString(liveEditTarget?.targetId);
  const exactMatches = exactTargetId
    ? regions.filter((region) => cleanString(region.id) === exactTargetId)
    : [];
  const spatialMatches = regions.filter((region) =>
    boundsIntersect(normalizedBounds, normalizeFrameCodeBounds(region.bounds)),
  );
  const combined = [...exactMatches, ...spatialMatches];
  const seen = new Set();
  const mapped = combined
    .filter((region) => {
      const id = cleanString(region.id);
      if (!id || seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    })
    .slice(0, 6)
    .map((region) => ({
      id: cleanString(region.id),
      label: cleanString(region.label),
      type: cleanString(region.type),
      selector: cleanString(region.implementationSelector),
      suggestedComponentName: cleanString(region.suggestedComponentName),
      sourceFile: cleanString(region.sourceFile || region.file),
      sourcePath: cleanString(region.sourcePath || region.path),
      sourceSymbol: cleanString(region.sourceSymbol || region.symbol),
      sourceLine: cleanString(region.sourceLine || region.line),
      sourceComponent: cleanString(region.sourceComponent || region.component),
      taskFile: cleanString(region.taskFile),
      taskId: cleanString(region.taskId),
      bounds: normalizeFrameCodeBounds(region.bounds),
    }));
  if (mapped.length || !exactTargetId || liveEditTarget?.targetType === "generated-output") {
    return mapped;
  }
  return [
    {
      id: exactTargetId,
      label: cleanString(liveEditTarget.targetLabel) || "Live edit target",
      type: cleanString(liveEditTarget.targetType) || "live-edit-target",
      selector: exactTargetId
        ? cleanString(liveEditTarget.targetSelector) ||
          `[data-canvax-node-id="${cssAttributeEscape(exactTargetId)}"]`
        : "",
      suggestedComponentName:
        cleanString(liveEditTarget.targetSourceComponent) ||
        cleanString(liveEditTarget.targetSourceSymbol),
      sourceFile: cleanString(liveEditTarget.targetSourceFile),
      sourcePath: cleanString(liveEditTarget.targetSourcePath),
      sourceSymbol: cleanString(liveEditTarget.targetSourceSymbol),
      sourceLine: cleanString(liveEditTarget.targetSourceLine),
      sourceComponent: cleanString(liveEditTarget.targetSourceComponent),
      taskFile: cleanString(liveEditTarget.targetTaskFile),
      taskId: cleanString(liveEditTarget.targetTaskId),
      bounds: normalizedBounds,
    },
  ];
}

function affectedComponentsFromRegions(regions) {
  const components = new Map();
  regions.forEach((region) => {
    (region.components || []).forEach((component) => {
      if (component.id && !components.has(component.id)) {
        components.set(component.id, component);
      }
    });
  });
  return [...components.values()];
}

function buildPatchTaskTrigger({ acceptedLiveEdit, previewTweak }) {
  if (acceptedLiveEdit) {
    return {
      kind: "canvax-live-edit-accepted-variant",
      id:
        acceptedLiveEdit.variant?.id ||
        acceptedLiveEdit.target?.id ||
        "accepted-live-edit",
      note: acceptedLiveEdit.patchNote,
      target: acceptedLiveEdit.target,
      variant: acceptedLiveEdit.variant,
      request: acceptedLiveEdit.liveEditRequest,
      surfaceOperations: acceptedLiveEdit.surfaceOperations,
      pins: acceptedLiveEdit.pins,
      canvasMarks: acceptedLiveEdit.canvasMarks,
      outputEditBinding: acceptedLiveEdit.outputEditBinding,
    };
  }
  if (previewTweak) {
    return {
      kind: previewTweak.kind || "canvax-preview-tweak-request",
      id: previewTweak.id || "",
      path: previewTweak.path || "",
      note: previewTweak.note || "",
      target: previewTweak.target || null,
      region: previewTweak.region || null,
    };
  }
  return {
    kind: "canvax-rewrite-request",
    note: "No Preview tweak or accepted Live Edit matched this frame; use rewrite request context.",
  };
}

function buildAcceptedLiveEditContext(selected) {
  const requestFrame = selected.requestFrame || {};
  const taskFrame = selected.frame || {};
  const outputEditBinding =
    requestFrame.outputEditBinding || taskFrame.outputEditBinding || null;
  const liveEditRequest = normalizeAcceptedLiveEditRequest(
    requestFrame.liveEditRequest ||
      taskFrame.liveEditRequest ||
      outputEditBinding?.liveEditRequest,
  );
  const target = normalizeLiveEditTarget(
    liveEditRequest?.target ||
      requestFrame.liveEditTarget ||
      taskFrame.liveEditTarget ||
      outputEditBinding?.liveEditTarget,
  );
  const variants = normalizeLiveEditVariants(
    liveEditRequest?.variants ||
      requestFrame.liveEditVariants ||
      taskFrame.liveEditVariants,
  );
  const variantIndex = Math.max(
    0,
    Number(
      liveEditRequest?.variantIndex ??
        requestFrame.liveEditVariantIndex ??
        taskFrame.liveEditVariantIndex,
    ) ||
      0,
  );
  const variant =
    normalizeLiveEditVariant(
      liveEditRequest?.acceptedVariant ||
        liveEditRequest?.activeVariant ||
        requestFrame.acceptedLiveEditVariant ||
        taskFrame.acceptedLiveEditVariant ||
        outputEditBinding?.liveEditVariant,
      target,
      variantIndex,
    ) || normalizeLiveEditVariant(variants[variantIndex], target, variantIndex);
  const accepted =
    target?.status === "accepted" ||
    Boolean(target?.acceptedAt) ||
    Boolean(target?.acceptedVariantId) ||
    Boolean(variant?.acceptedAt) ||
    liveEditRequest?.status === "accepted" ||
    Boolean(requestFrame.acceptedLiveEditVariant) ||
    Boolean(taskFrame.acceptedLiveEditVariant);
  if (!target || !accepted) {
    return null;
  }
  const pins = normalizeLiveEditPins(
    requestFrame.liveEditPins || taskFrame.liveEditPins,
  );
  const canvasMarks = normalizeLiveEditCanvasMarks(
    requestFrame.composition?.liveEditCanvasMarks ||
      taskFrame.composition?.liveEditCanvasMarks,
  );
  const outputAnnotations = Array.isArray(requestFrame.outputAnnotations)
    ? requestFrame.outputAnnotations
    : Array.isArray(taskFrame.outputAnnotations)
      ? taskFrame.outputAnnotations
      : [];
  const context = {
    kind: "canvax-accepted-live-edit",
    target,
    variant,
    actionIntent:
      normalizeLiveEditActionIntent(liveEditRequest?.actionIntent) ||
      normalizeLiveEditActionIntent(variant?.actionIntent),
    pins,
    canvasMarks,
    outputAnnotations: outputAnnotations.slice(0, 12),
    outputEditBinding,
    liveEditRequest,
    voiceIntents: normalizeLiveEditVoiceIntents(liveEditRequest?.voiceIntents),
    surfaceOperations: normalizeLiveEditSurfaceOperations(
      liveEditRequest?.surfaceOperations || variant?.surfaceOperations,
    ),
  };
  context.patchNote = buildAcceptedLiveEditPatchNote(context);
  return context;
}

function buildAcceptedLiveEditPatchNote(context) {
  const target = context.target || {};
  const variant = context.variant || null;
  const pins = Array.isArray(context.pins) ? context.pins : [];
  const canvasMarks = Array.isArray(context.canvasMarks)
    ? context.canvasMarks
    : [];
  const outputAnnotationLabels = Array.isArray(context.outputAnnotations)
    ? context.outputAnnotations
        .map((annotation) =>
          cleanString(
            annotation?.semantics?.label ||
              annotation?.semantics?.intent ||
              annotation?.text ||
              annotation?.label,
          ),
        )
        .filter(Boolean)
        .slice(0, 4)
    : [];
  const strokeLabels = [
    ...canvasMarks
      .map((mark) => cleanString(mark?.semantics?.label || mark?.semantics?.intent))
      .filter(Boolean),
    ...outputAnnotationLabels,
  ].slice(0, 6);
  const designMoves = Array.isArray(variant?.designMoves)
    ? variant.designMoves.map(cleanString).filter(Boolean).slice(0, 5)
    : [];
  const surfaceOperations = normalizeLiveEditSurfaceOperations(
    context.surfaceOperations || variant?.surfaceOperations,
  );
  const actionText = context.actionIntent?.label
    ? `Live Edit action chip: ${context.actionIntent.label}${
        context.actionIntent.description
          ? ` - ${context.actionIntent.description}`
          : ""
      }.`
    : "";
  const operationText = surfaceOperations.length
    ? `Surface operations: ${surfaceOperations
        .map((operation) =>
          [operation.label || operation.kind, operation.detail]
            .filter(Boolean)
            .join(": "),
        )
        .join("; ")}.`
    : "";
  const voiceText = Array.isArray(context.voiceIntents) && context.voiceIntents.length
    ? `Target voice: ${context.voiceIntents
        .map((intent) => intent.text)
        .filter(Boolean)
        .slice(0, 4)
        .join("; ")}.`
    : "";
  const sourceHint = formatLiveEditSourceHint(target);
  return [
    variant
      ? `Accepted Live Edit variant ${variant.index}: ${variant.label} (${variant.role}).`
      : "Accepted Live Edit target.",
    `Target: ${target.targetLabel || target.targetId || "picked artifact region"}.`,
    target.note ? `User note: ${target.note}.` : "",
    context.liveEditRequest?.transcriptText
      ? `Transcript/text: ${context.liveEditRequest.transcriptText}.`
      : "",
    voiceText,
    variant?.summary || variant?.body
      ? `Variant direction: ${variant.summary || variant.body}.`
      : "",
    designMoves.length ? `Design moves: ${designMoves.join("; ")}.` : "",
    actionText,
    operationText,
    pins.length
      ? `Comment pins: ${pins.map((pin) => pin.text).filter(Boolean).join("; ")}.`
      : "",
    strokeLabels.length ? `Stroke intent: ${strokeLabels.join("; ")}.` : "",
    sourceHint ? `Source hint: ${sourceHint}.` : "",
    "Apply this to the selected target first and preserve the surrounding surface.",
  ]
    .filter(Boolean)
    .join(" ");
}

function formatLiveEditSourceHint(target) {
  const file = cleanString(target.targetSourceFile || target.targetSourcePath);
  const symbol = cleanString(
    target.targetSourceComponent || target.targetSourceSymbol,
  );
  const line = cleanString(target.targetSourceLine);
  const task = cleanString(target.targetTaskId || target.targetTaskFile);
  const parts = [];
  if (file) {
    parts.push(line ? `${file}:${line}` : file);
  }
  if (symbol) {
    parts.push(symbol);
  }
  if (task) {
    parts.push(`task ${task}`);
  }
  return parts.join(" / ");
}

function normalizeLiveEditTarget(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const bounds = normalizeLiveEditBounds(value.bounds || value.region);
  const targetId = cleanString(value.targetId || value.outputObjectId);
  const targetHref = cleanString(
    value.targetHref || value.href || value.url || value.resolvedUrl,
  );
  const targetPath = cleanString(value.targetPath || value.previewPath);
  const sourceFrameId = cleanString(value.sourceFrameId);
  if (!bounds || (!targetId && !targetHref && !targetPath && !sourceFrameId)) {
    return null;
  }
  const sourceHint = normalizeLiveEditSourceHint(value);
  return {
    kind: "canvax-live-edit-target",
    id: cleanString(value.id),
    sourceFrameId,
    sourceFrameTitle: cleanString(value.sourceFrameTitle),
    targetId,
    targetObjectId: cleanString(value.targetObjectId || value.outputTargetId),
    targetNodeId: cleanString(value.targetNodeId || value.nodeId),
    targetLabel: cleanString(value.targetLabel) || "Picked output region",
    targetType: cleanString(value.targetType),
    targetSource: cleanString(value.targetSource),
    targetSelector: cleanString(
      value.targetSelector || value.selector || value.implementationSelector,
    ),
    targetTag: cleanString(value.targetTag || value.tagName),
    targetText: cleanString(value.targetText || value.textContent),
    ...(sourceHint || {}),
    targetSourceHint: sourceHint
      ? {
          file: sourceHint.targetSourceFile,
          path: sourceHint.targetSourcePath,
          symbol: sourceHint.targetSourceSymbol,
          line: sourceHint.targetSourceLine,
          component: sourceHint.targetSourceComponent,
          taskFile: sourceHint.targetTaskFile,
          taskId: sourceHint.targetTaskId,
          source: sourceHint.targetSourceBinding,
        }
      : null,
    targetHref,
    targetPath,
    targetVersionTag: cleanString(value.targetVersionTag),
    surface: cleanString(value.surface) || "generated-output",
    bounds,
    note: cleanString(value.note),
    status: cleanString(value.status) === "accepted" ? "accepted" : "picked",
    instruction: cleanString(value.instruction),
    pickedAt: cleanString(value.pickedAt),
    acceptedAt: cleanString(value.acceptedAt),
    acceptedVariantId: cleanString(value.acceptedVariantId),
    acceptedVariantLabel: cleanString(value.acceptedVariantLabel),
    acceptedVariantRole: cleanString(value.acceptedVariantRole),
    updatedAt: cleanString(value.updatedAt),
  };
}

function normalizeLiveEditSourceHint(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const hint =
    source.targetSourceHint &&
    typeof source.targetSourceHint === "object" &&
    !Array.isArray(source.targetSourceHint)
      ? source.targetSourceHint
      : source.sourceHint &&
          typeof source.sourceHint === "object" &&
          !Array.isArray(source.sourceHint)
        ? source.sourceHint
        : {};
  const targetSourceFile = cleanString(
    source.targetSourceFile ||
      source.sourceFile ||
      hint.targetSourceFile ||
      hint.sourceFile ||
      hint.file,
  );
  const targetSourcePath = cleanString(
    source.targetSourcePath ||
      source.sourcePath ||
      hint.targetSourcePath ||
      hint.sourcePath ||
      hint.path,
  );
  const targetSourceSymbol = cleanString(
    source.targetSourceSymbol ||
      source.sourceSymbol ||
      hint.targetSourceSymbol ||
      hint.sourceSymbol ||
      hint.symbol,
  );
  const targetSourceLine = cleanString(
    source.targetSourceLine ||
      source.sourceLine ||
      hint.targetSourceLine ||
      hint.sourceLine ||
      hint.line,
  );
  const targetSourceComponent = cleanString(
    source.targetSourceComponent ||
      source.sourceComponent ||
      source.component ||
      hint.targetSourceComponent ||
      hint.sourceComponent ||
      hint.component,
  );
  const targetTaskFile = cleanString(
    source.targetTaskFile ||
      source.taskFile ||
      hint.targetTaskFile ||
      hint.taskFile,
  );
  const targetTaskId = cleanString(
    source.targetTaskId || source.taskId || hint.targetTaskId || hint.taskId,
  );
  const targetSourceBinding = cleanString(
    source.targetSourceBinding ||
      source.sourceBinding ||
      hint.targetSourceBinding ||
      hint.sourceBinding ||
      hint.source,
  );
  if (
    !targetSourceFile &&
    !targetSourcePath &&
    !targetSourceSymbol &&
    !targetSourceLine &&
    !targetSourceComponent &&
    !targetTaskFile &&
    !targetTaskId &&
    !targetSourceBinding
  ) {
    return null;
  }
  return {
    targetSourceFile,
    targetSourcePath,
    targetSourceSymbol,
    targetSourceLine,
    targetSourceComponent,
    targetTaskFile,
    targetTaskId,
    targetSourceBinding,
  };
}

function normalizeLiveEditBounds(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const x = clamp01(value.x ?? value.left);
  const y = clamp01(value.y ?? value.top);
  const w = clamp01(value.w ?? value.width);
  const h = clamp01(value.h ?? value.height);
  if (!w || !h) {
    return null;
  }
  const right = clamp01(x + w);
  const bottom = clamp01(y + h);
  const width = Math.max(0.02, right - x);
  const height = Math.max(0.02, bottom - y);
  return {
    x,
    y,
    w: width,
    h: height,
    left: x,
    top: y,
    right,
    bottom,
    width,
    height,
  };
}

function normalizeLiveEditVariant(value, fallbackTarget = null, index = 0) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const target =
    normalizeLiveEditTarget(value.target || value.liveEditTarget) ||
    fallbackTarget;
  if (!target) {
    return null;
  }
  return {
    kind: "canvax-live-edit-variant",
    id: cleanString(value.id) || `live-variant-${index + 1}`,
    index: Math.max(1, Number(value.index) || index + 1),
    role: cleanString(value.role) || "structure-layout",
    label: cleanString(value.label) || `Variant ${index + 1}`,
    archetype: cleanString(value.archetype),
    title: cleanString(value.title || value.label),
    body: cleanString(value.body),
    cta: cleanString(value.cta),
    summary: cleanString(value.summary),
    target,
    designMoves: Array.isArray(value.designMoves)
      ? value.designMoves.map(cleanString).filter(Boolean).slice(0, 12)
      : [],
    sourceFrameId: cleanString(value.sourceFrameId || target.sourceFrameId),
    sourceFrameTitle: cleanString(
      value.sourceFrameTitle || target.sourceFrameTitle,
    ),
    targetId: cleanString(value.targetId || target.targetId),
    targetLabel: cleanString(value.targetLabel || target.targetLabel),
    note: cleanString(value.note),
    targetMedium: cleanString(value.targetMedium),
    actionIntent: normalizeLiveEditActionIntent(value.actionIntent),
    style: value.style && typeof value.style === "object" ? value.style : {},
    surfaceOperations: normalizeLiveEditSurfaceOperations(
      value.surfaceOperations || value.operations,
    ),
    createdAt: cleanString(value.createdAt),
    acceptedAt: cleanString(value.acceptedAt),
  };
}

function normalizeLiveEditActionIntent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const id = cleanString(value.id || value.action || value.intent);
  const label = cleanString(value.label || id);
  const description = cleanString(value.description || value.detail);
  if (!id && !label && !description) {
    return null;
  }
  return {
    kind: "canvax-live-edit-action",
    id,
    label,
    description,
    guidance:
      value.guidance && typeof value.guidance === "object" && !Array.isArray(value.guidance)
        ? value.guidance
        : null,
  };
}

function normalizeLiveEditSurfaceOperations(value) {
  return Array.isArray(value)
    ? value
        .map((operation, index) => {
          if (typeof operation === "string") {
            const label = cleanString(operation);
            return label
              ? {
                  kind: `operation-${index + 1}`,
                  label,
                  detail: "",
                }
              : null;
          }
          if (
            !operation ||
            typeof operation !== "object" ||
            Array.isArray(operation)
          ) {
            return null;
          }
          const kind = cleanString(operation.kind || operation.type);
          const label = cleanString(operation.label || operation.title);
          const detail = cleanString(
            operation.detail || operation.description || operation.note,
          );
          return kind || label || detail
            ? {
                kind: kind || `operation-${index + 1}`,
                label: label || kind || `Operation ${index + 1}`,
                detail,
              }
            : null;
        })
        .filter(Boolean)
        .slice(0, 8)
    : [];
}

function normalizeLiveEditVariants(value) {
  return Array.isArray(value)
    ? value
        .map((variant, index) => normalizeLiveEditVariant(variant, null, index))
        .filter(Boolean)
        .slice(0, 3)
    : [];
}

function normalizeLiveEditVoiceIntents(value) {
  return Array.isArray(value)
    ? value
        .map((intent, index) => {
          if (!intent || typeof intent !== "object" || Array.isArray(intent)) {
            return null;
          }
          const text = cleanString(intent.text || intent.transcript);
          if (!text) {
            return null;
          }
          const liveEditTarget = normalizeLiveEditTarget(
            intent.liveEditTarget || intent.target,
          );
          return {
            id: cleanString(intent.id) || `live-edit-voice-${index + 1}`,
            text,
            at: cleanString(intent.at),
            provider: cleanString(intent.provider),
            scope: intent.scope === "session" ? "session" : "frame",
            frameId: cleanString(intent.frameId),
            frameTitle: cleanString(intent.frameTitle),
            liveEditTarget,
            liveEditTargetId:
              cleanString(intent.liveEditTargetId) ||
              liveEditTarget?.targetId ||
              "",
            liveEditTargetType:
              cleanString(intent.liveEditTargetType) ||
              liveEditTarget?.targetType ||
              "",
            liveEditTargetLabel:
              cleanString(intent.liveEditTargetLabel) ||
              liveEditTarget?.targetLabel ||
              "",
          };
        })
        .filter(Boolean)
        .slice(0, 12)
    : [];
}

function normalizeAcceptedLiveEditRequest(value, fallbackTarget = null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const target =
    normalizeLiveEditTarget(value.target || value.liveEditTarget) ||
    fallbackTarget;
  if (!target) {
    return null;
  }
  const variants = normalizeLiveEditVariants(
    value.variants || value.liveEditVariants,
  );
  const variantIndex = Math.max(0, Number(value.variantIndex) || 0);
  const acceptedVariant =
    normalizeLiveEditVariant(
      value.acceptedVariant || value.acceptedLiveEditVariant,
      target,
      variantIndex,
    ) || null;
  const activeVariant =
    acceptedVariant ||
    normalizeLiveEditVariant(value.activeVariant, target, variantIndex) ||
    normalizeLiveEditVariant(variants[variantIndex], target, variantIndex);
  const actionIntent = normalizeLiveEditActionIntent(
    value.actionIntent || activeVariant?.actionIntent,
  );
  return {
    kind: "canvax-live-edit-request",
    id: cleanString(value.id),
    status: cleanString(value.status),
    target,
    targetType: cleanString(value.targetType || target.targetType),
    targetSelector: cleanString(value.targetSelector || target.targetSelector),
    targetObjectId: cleanString(value.targetObjectId || target.targetObjectId),
    targetNodeId: cleanString(value.targetNodeId || target.targetNodeId),
    normalizedBounds: target.bounds,
    sourceFrameId: cleanString(value.sourceFrameId || target.sourceFrameId),
    sourceFrameTitle: cleanString(
      value.sourceFrameTitle || target.sourceFrameTitle,
    ),
    activeDesignKit:
      value.activeDesignKit &&
      typeof value.activeDesignKit === "object" &&
      !Array.isArray(value.activeDesignKit)
        ? value.activeDesignKit
        : null,
    actionIntent,
    note: cleanString(value.note || target.note),
    transcriptText: cleanString(value.transcriptText || value.text),
    voiceIntents: normalizeLiveEditVoiceIntents(
      value.voiceIntents || value.voiceSegments,
    ),
    pins: normalizeLiveEditPins(value.pins || value.liveEditPins),
    strokes: Array.isArray(value.strokes)
      ? value.strokes.slice(0, 24)
      : [],
    currentOutputBinding:
      value.currentOutputBinding &&
      typeof value.currentOutputBinding === "object" &&
      !Array.isArray(value.currentOutputBinding)
        ? value.currentOutputBinding
        : null,
    variants,
    variantIndex,
    activeVariant,
    acceptedVariant,
    surfaceOperations: normalizeLiveEditSurfaceOperations(
      value.surfaceOperations || activeVariant?.surfaceOperations,
    ),
    createdAt: cleanString(value.createdAt),
    updatedAt: cleanString(value.updatedAt),
    acceptedAt: cleanString(value.acceptedAt || target.acceptedAt),
  };
}

function normalizeLiveEditPins(value) {
  return Array.isArray(value)
    ? value
        .map((pin, index) => {
          const text = cleanString(pin?.text || pin?.note || pin?.comment);
          if (!text) {
            return null;
          }
          return {
            id: cleanString(pin?.id) || `live-edit-pin-${index + 1}`,
            text,
            point: pin?.point || null,
            targetId: cleanString(pin?.targetId),
            targetLabel: cleanString(pin?.targetLabel),
            placement: cleanString(pin?.placement || pin?.placementMode),
            draggedAt: cleanString(pin?.draggedAt),
          };
        })
        .filter(Boolean)
        .slice(0, 40)
    : [];
}

function normalizeLiveEditCanvasMarks(value) {
  return Array.isArray(value)
    ? value
        .map((mark) => {
          if (!mark || typeof mark !== "object" || Array.isArray(mark)) {
            return null;
          }
          return {
            id: cleanString(mark.id),
            type: cleanString(mark.type),
            points: Array.isArray(mark.points) ? mark.points.slice(0, 80) : [],
            bounds: normalizeLiveEditBounds(mark.bounds || mark.normalizedBounds),
            normalizedBounds: normalizeLiveEditBounds(
              mark.normalizedBounds || mark.bounds,
            ),
            semantics:
              mark.semantics && typeof mark.semantics === "object"
                ? {
                    intent: cleanString(mark.semantics.intent),
                    label: cleanString(mark.semantics.label),
                    confidence: Number(mark.semantics.confidence) || 0,
                    rule: cleanString(mark.semantics.rule),
                    vector: mark.semantics.vector || null,
                    group:
                      mark.semantics.group &&
                      typeof mark.semantics.group === "object"
                        ? {
                            id: cleanString(mark.semantics.group.id),
                            type: cleanString(mark.semantics.group.type),
                            memberIds: Array.isArray(
                              mark.semantics.group.memberIds,
                            )
                              ? mark.semantics.group.memberIds
                                  .map(cleanString)
                                  .filter(Boolean)
                                  .slice(0, 8)
                              : [],
                          }
                        : null,
                  }
                : null,
          };
        })
        .filter(Boolean)
        .slice(0, 12)
    : [];
}

function normalizeFrameCodeBounds(bounds = {}) {
  return {
    x: clamp01(bounds.x),
    y: clamp01(bounds.y),
    w: clamp01(bounds.w),
    h: clamp01(bounds.h),
  };
}

function boundsIntersect(left, right) {
  return !(
    left.x + left.w < right.x ||
    right.x + right.w < left.x ||
    left.y + left.h < right.y ||
    right.y + right.h < left.y
  );
}

async function loadFrameCodeMap(request, frameId) {
  const artifacts = Array.isArray(request.outputManifest?.artifacts)
    ? request.outputManifest.artifacts
    : [];
  const artifact = artifacts.find((entry) => {
    const path = cleanString(entry?.path);
    const frameIds = Array.isArray(entry?.frameIds) ? entry.frameIds : [];
    return (
      path.endsWith("canvax-component-map.json") &&
      (!frameIds.length || frameIds.includes(frameId))
    );
  });
  if (!artifact?.path) {
    return null;
  }
  const path = artifact.path;
  const map = await readOptionalJson(resolve(projectRoot, path));
  if (map?.kind !== "canvax-frame-code-map") {
    return null;
  }
  return { path, map };
}

async function loadBuildContract(request, frameId) {
  const artifacts = Array.isArray(request.outputManifest?.artifacts)
    ? request.outputManifest.artifacts
    : [];
  const artifact = artifacts.find((entry) => {
    const path = cleanString(entry?.path);
    const frameIds = Array.isArray(entry?.frameIds) ? entry.frameIds : [];
    return (
      path.endsWith("canvax-build-contract.json") &&
      (!frameIds.length || frameIds.includes(frameId))
    );
  });
  if (!artifact?.path) {
    return null;
  }
  const path = artifact.path;
  const contract = await readOptionalJson(resolve(projectRoot, path));
  if (contract?.kind !== "canvax-build-integration-contract") {
    return null;
  }
  return { path, contract };
}

async function loadPortTask(request, frameId) {
  const artifacts = Array.isArray(request.outputManifest?.artifacts)
    ? request.outputManifest.artifacts
    : [];
  const artifact = artifacts.find((entry) => {
    const path = cleanString(entry?.path);
    const frameIds = Array.isArray(entry?.frameIds) ? entry.frameIds : [];
    return (
      path.endsWith("codex-port-task.json") &&
      (!frameIds.length || frameIds.includes(frameId))
    );
  });
  if (!artifact?.path) {
    return null;
  }
  const path = artifact.path;
  const task = await readOptionalJson(resolve(projectRoot, path));
  if (task?.kind !== "canvax-codex-port-task") {
    return null;
  }
  return { path, task };
}

async function loadPreviewTweak(filePath, frameId) {
  const tweak = await readOptionalJson(filePath);
  if (tweak?.kind !== "canvax-preview-tweak-request") {
    return null;
  }
  const tweakFrameId = cleanString(tweak.frameId);
  if (tweakFrameId && frameId && tweakFrameId !== frameId) {
    return null;
  }
  return {
    ...tweak,
    path: toProjectRelative(filePath),
  };
}

function buildRewriteVisualDirection(buildContract) {
  const contractDirection = buildContract?.contract?.visualDirection || {};
  const themeId = cleanString(contractDirection.themeId) || "studio-paper";
  const atmosphereId =
    cleanString(contractDirection.atmosphereId) || "studio-diagram";
  const atmosphereLabel =
    cleanString(contractDirection.atmosphereLabel) || "LIVE REWRITE MAP";
  const themeClass = `theme-${safeCssClass(themeId)}`;
  const base = {
    themeId,
    themeClass,
    themeLabel: cleanString(contractDirection.themeLabel) || "Studio Paper",
    atmosphereId,
    atmosphereLabel,
    atmosphereMotion:
      cleanString(contractDirection.atmosphereMotion) ||
      "Rewrite marks stay visually bound to the generated surface.",
    designerBrief: contractDirection.designerBrief || [],
    paper: "#fff8ec",
    ink: "#171412",
    muted: "rgba(23, 20, 18, 0.68)",
    rust: "#f25a32",
    mint: "#0c8d7b",
    blue: "#2364aa",
    gold: "#f0a202",
    pageBg: "#1d1916",
    nodePalette: ["#f25a32", "#0c8d7b", "#2364aa", "#f0a202", "#b246a8"],
  };

  if (themeId === "poster-archive") {
    return {
      ...base,
      themeLabel: cleanString(contractDirection.themeLabel) || "Poster Archive",
      paper: "#f1dfb8",
      ink: "#14100d",
      muted: "rgba(20, 16, 13, 0.68)",
      rust: "#c43122",
      mint: "#1b7f75",
      blue: "#315f86",
      gold: "#c6922f",
      pageBg: "#241916",
      nodePalette: ["#c43122", "#14100d", "#c6922f", "#315f86", "#f1dfb8"],
    };
  }
  if (themeId === "midnight-cinema") {
    return {
      ...base,
      themeLabel: cleanString(contractDirection.themeLabel) || "Midnight Cinema",
      paper: "#101820",
      ink: "#f8efe2",
      muted: "rgba(248, 239, 226, 0.68)",
      rust: "#ff6b4a",
      mint: "#33d6c0",
      blue: "#7aa7ff",
      gold: "#f3b43f",
      pageBg: "#07090d",
      nodePalette: ["#ff6b4a", "#33d6c0", "#7aa7ff", "#f3b43f", "#e66bd6"],
    };
  }
  if (themeId === "quiet-editorial") {
    return {
      ...base,
      themeLabel: cleanString(contractDirection.themeLabel) || "Quiet Editorial",
      paper: "#fbf5ea",
      ink: "#20201d",
      muted: "rgba(32, 32, 29, 0.62)",
      rust: "#cc6a4d",
      mint: "#6f9688",
      blue: "#6d83a6",
      gold: "#c8a45a",
      pageBg: "#efeee7",
      nodePalette: ["#cc6a4d", "#6f9688", "#6d83a6", "#c8a45a", "#d7b6a4"],
    };
  }
  return base;
}

function rewriteThemeVariables(visualDirection) {
  return [
    `--paper: ${visualDirection.paper};`,
    `--ink: ${visualDirection.ink};`,
    `--muted: ${visualDirection.muted};`,
    `--rust: ${visualDirection.rust};`,
    `--mint: ${visualDirection.mint};`,
    `--blue: ${visualDirection.blue};`,
    `--gold: ${visualDirection.gold};`,
    `--page-bg: ${visualDirection.pageBg};`,
  ].join("\n      ");
}

function buildRewriteAtmosphereMarkup(visualDirection) {
  return `<div class="atmosphere" aria-hidden="true">
      <span class="atmosphere-layer atmosphere-band-one"></span>
      <span class="atmosphere-layer atmosphere-band-two"></span>
      <span class="atmosphere-layer atmosphere-orb"></span>
      <span class="atmosphere-label">${escapeHtml(visualDirection.atmosphereLabel)}</span>
    </div>`;
}

function rewriteAtmosphereCss() {
  return `.atmosphere {
      position: absolute;
      inset: 0;
      z-index: 1;
      overflow: hidden;
      pointer-events: none;
    }
    .atmosphere-layer {
      position: absolute;
      display: block;
    }
    .atmosphere-band-one {
      left: -16%;
      top: 40%;
      width: 80%;
      height: 20%;
      background: color-mix(in srgb, var(--rust), transparent 20%);
      transform: rotate(-15deg);
      mix-blend-mode: multiply;
    }
    .atmosphere-band-two {
      right: 4%;
      top: 18%;
      width: 34%;
      height: 16%;
      background: color-mix(in srgb, var(--gold), transparent 26%);
      clip-path: polygon(0 0, 92% 14%, 100% 82%, 8% 100%);
    }
    .atmosphere-orb {
      right: 11%;
      bottom: 10%;
      width: clamp(180px, 24vw, 380px);
      aspect-ratio: 1;
      border: 12px solid color-mix(in srgb, var(--rust), transparent 76%);
      border-radius: 50%;
    }
    .atmosphere-label {
      position: absolute;
      right: clamp(24px, 4vw, 64px);
      top: clamp(82px, 11vw, 150px);
      color: color-mix(in srgb, var(--ink), transparent 22%);
      font-size: clamp(12px, 1vw, 15px);
      font-weight: 900;
      letter-spacing: 0.22em;
      text-transform: uppercase;
    }
    .theme-midnight-cinema .atmosphere-band-one,
    .theme-midnight-cinema .atmosphere-band-two {
      border: 1px solid color-mix(in srgb, var(--blue), transparent 48%);
      border-radius: 999px;
      background: transparent;
      mix-blend-mode: screen;
    }
    .theme-midnight-cinema .atmosphere-orb {
      border-color: color-mix(in srgb, var(--mint), transparent 68%);
      background: radial-gradient(circle, color-mix(in srgb, var(--blue), transparent 76%), transparent 62%);
    }
    .theme-quiet-editorial .atmosphere-band-one {
      left: 8%;
      top: 18%;
      width: 1px;
      height: 64%;
      background: color-mix(in srgb, var(--ink), transparent 82%);
      transform: none;
    }
    .theme-quiet-editorial .atmosphere-band-two {
      right: 12%;
      top: 18%;
      width: 22%;
      height: 1px;
      background: color-mix(in srgb, var(--ink), transparent 82%);
      clip-path: none;
    }`;
}

function buildPreviewHtml({
  request,
  selected,
  frameId,
  frameTitle,
  affectedRegions,
  visualDirection,
  previewTweak,
}) {
  const frame = selected.frame || selected.requestFrame || {};
  const composition = frame.composition || {};
  const viewport = composition.viewport || {};
  const width = Number(viewport.width || frame.viewportWidth || 1440);
  const height = Number(viewport.height || frame.viewportHeight || 1024);
  const elements = Array.isArray(composition.elements)
    ? composition.elements.slice(0, 28)
    : [];
  const queueItem = selected.queueItem || {};
  const board = request.board || {};
  const headline =
    firstMeaningfulLabel(elements) ||
    cleanString(frame.intent || frame.objective) ||
    cleanString(board.project) ||
    frameTitle;
  const subhead =
    cleanString(previewTweak?.note) ||
    cleanString(frame.notes || frame.layout) ||
    cleanString(queueItem.detail) ||
    "Refined from the latest Canvax rewrite request.";
  const voiceCue =
    request.voice?.segments?.[0]?.text ||
    request.voice?.frameGroups?.[0]?.segments?.[0]?.text ||
    "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(frameTitle)} rewrite</title>
  <style>
    :root {
      ${rewriteThemeVariables(visualDirection)}
      --shadow: 0 32px 90px rgba(23, 20, 18, 0.24);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: clamp(18px, 3vw, 44px);
      background:
        radial-gradient(circle at 10% 10%, rgba(242, 90, 50, 0.26), transparent 28%),
        radial-gradient(circle at 78% 18%, rgba(35, 100, 170, 0.2), transparent 32%),
        repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 16px),
        var(--page-bg);
      color: var(--ink);
      font-family: "Avenir Next", "Gill Sans", sans-serif;
    }
    .surface {
      position: relative;
      width: min(100%, ${width}px);
      aspect-ratio: ${width} / ${height};
      min-height: min(76vh, ${height}px);
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.42);
      border-radius: 34px;
      background:
        linear-gradient(90deg, rgba(23, 20, 18, 0.035) 1px, transparent 1px),
        linear-gradient(rgba(23, 20, 18, 0.035) 1px, transparent 1px),
        linear-gradient(135deg, rgba(242, 90, 50, 0.08), transparent 48%),
        var(--paper);
      background-size: 72px 72px, 72px 72px, auto, auto;
      box-shadow: var(--shadow);
    }
    ${rewriteAtmosphereCss()}
    .tagline,
    .revision {
      position: absolute;
      z-index: 5;
      top: 26px;
      display: inline-flex;
      gap: 10px;
      align-items: center;
      padding: 12px 16px;
      border: 1px solid rgba(23, 20, 18, 0.08);
      border-radius: 999px;
      background: rgba(255, 248, 236, 0.82);
      box-shadow: 0 16px 40px rgba(23, 20, 18, 0.08);
      backdrop-filter: blur(14px);
      color: rgba(23, 20, 18, 0.68);
      font-size: clamp(12px, 1.2vw, 15px);
      font-weight: 800;
    }
    .tagline { left: 28px; }
    .revision { right: 28px; text-transform: uppercase; letter-spacing: 0.08em; }
    .hero {
      position: absolute;
      z-index: 3;
      left: 7%;
      bottom: 9%;
      width: min(50%, 680px);
      display: grid;
      gap: 18px;
    }
    .eyebrow {
      width: fit-content;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(242, 90, 50, 0.14);
      color: var(--rust);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      max-width: 11ch;
      font-family: "Iowan Old Style", Georgia, serif;
      font-size: clamp(44px, 7.6vw, 124px);
      line-height: 0.9;
      letter-spacing: -0.065em;
    }
    .subhead,
    .voice {
      margin: 0;
      max-width: 62ch;
      color: rgba(23, 20, 18, 0.68);
      font-size: clamp(15px, 1.4vw, 21px);
      line-height: 1.46;
    }
    .voice {
      padding-left: 16px;
      border-left: 4px solid var(--mint);
    }
    .cta-row { display: flex; flex-wrap: wrap; gap: 12px; }
    .cta {
      width: fit-content;
      padding: 13px 18px;
      border: 2px solid var(--ink);
      background: var(--rust);
      color: white;
      box-shadow: 8px 8px 0 var(--ink);
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .cta.secondary {
      background: white;
      color: var(--ink);
    }
    .node {
      position: absolute;
      z-index: 2;
      display: grid;
      align-content: center;
      min-width: 58px;
      min-height: 42px;
      padding: 13px;
      border: 2px solid color-mix(in srgb, var(--node-color), var(--ink) 20%);
      background: color-mix(in srgb, var(--node-color), var(--paper) 86%);
      box-shadow: 11px 13px 0 rgba(23, 20, 18, 0.11);
      color: var(--ink);
      font-weight: 800;
    }
    .node-label {
      width: fit-content;
      margin-bottom: 6px;
      padding: 4px 8px;
      border-radius: 999px;
      background: white;
      color: rgba(23, 20, 18, 0.62);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .node strong { font-size: clamp(15px, 1.8vw, 26px); line-height: 1; }
    .node p { margin: 7px 0 0; color: rgba(23, 20, 18, 0.58); font-size: 13px; line-height: 1.35; }
    .node.path,
    .node.line,
    .node.arrow {
      min-height: 9px;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: var(--node-color);
      box-shadow: none;
      transform: rotate(var(--angle, -8deg));
    }
    .node.arrow::after {
      content: "";
      position: absolute;
      right: -10px;
      top: 50%;
      width: 0;
      height: 0;
      border-top: 14px solid transparent;
      border-bottom: 14px solid transparent;
      border-left: 24px solid var(--node-color);
      transform: translateY(-50%);
    }
    .node.ellipse { border-radius: 999px; }
    .node.label {
      border-radius: 18px;
      background: white;
      box-shadow: 0 16px 36px rgba(23, 20, 18, 0.12);
    }
    .rewrite-region {
      position: absolute;
      z-index: 4;
      border: 2px dashed rgba(242, 90, 50, 0.78);
      border-radius: 24px;
      background: rgba(242, 90, 50, 0.08);
      box-shadow: 0 18px 42px rgba(242, 90, 50, 0.13);
      pointer-events: none;
    }
    .rewrite-region span {
      position: absolute;
      left: 12px;
      top: -15px;
      padding: 5px 9px;
      border-radius: 999px;
      background: var(--rust);
      color: white;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    @media (max-width: 760px) {
      body { padding: 0; }
      .surface { width: 100vw; min-height: 100vh; border-radius: 0; }
      .tagline { left: 16px; right: 16px; justify-content: center; }
      .revision { display: none; }
      .hero { left: 6%; right: 6%; bottom: 7%; width: auto; }
      .node { opacity: 0.88; }
    }
  </style>
</head>
<body>
  <main class="surface ${escapeHtml(visualDirection.themeClass)}" data-frame-id="${escapeHtml(frameId)}" data-canvax-theme="${escapeHtml(visualDirection.themeId)}" data-canvax-atmosphere="${escapeHtml(visualDirection.atmosphereId)}">
    ${buildRewriteAtmosphereMarkup(visualDirection)}
    <div class="tagline">${escapeHtml(frameTitle)} · Canvax rewrite surface</div>
    <div class="revision">${escapeHtml(previewTweak ? "Preview tweak" : cleanString(queueItem.label) || "Rewrite")}</div>
    ${buildElementMarkup(elements, visualDirection)}
    ${buildAffectedRegionMarkup(affectedRegions, width, height)}
    <section class="hero">
      <div class="eyebrow">${escapeHtml(cleanString(queueItem.reason) || "Codex refinement")}</div>
      <h1>${escapeHtml(headline)}</h1>
      <p class="subhead">${escapeHtml(subhead)}</p>
      ${voiceCue ? `<p class="voice">${escapeHtml(compactText(voiceCue, 180))}</p>` : ""}
      <div class="cta-row">
        <div class="cta">Refined from Canvax</div>
        <div class="cta secondary">Review marks preserved</div>
      </div>
    </section>
  </main>
</body>
</html>
`;
}

function buildElementMarkup(elements, visualDirection) {
  return elements
    .map((element, index) => buildElementNode(element, index, visualDirection))
    .join("\n");
}

function buildElementNode(element, index, visualDirection) {
  const bounds = element.bounds || {};
  const color = normalizeColor(element.color) || elementColor(index, visualDirection);
  const left = percent(bounds.x, 0.12 + index * 0.03);
  const top = percent(bounds.y, 0.14 + index * 0.04);
  const width = percent(Math.max(bounds.w || 0.16, 0.04), 0.2);
  const height = percent(Math.max(bounds.h || 0.08, 0.035), 0.1);
  const role = cleanString(element.role || element.type || "element");
  const text =
    cleanString(element.text) ||
    role
      .split(",")[0]
      .trim()
      .replace(/\bor\b.*/i, "") ||
    `Element ${index + 1}`;
  const type = safeCssClass(element.type || "rect");
  return `    <article class="node ${type}" style="left:${left};top:${top};width:${width};height:${height};--node-color:${color};--angle:${index % 2 ? "7deg" : "-6deg"}">
      <span class="node-label">${escapeHtml(element.type || "element")}</span>
      <strong>${escapeHtml(compactText(text, 54))}</strong>
      <p>${escapeHtml(compactText(role, 82))}</p>
    </article>`;
}

function buildAffectedRegionMarkup(regions, viewportWidth, viewportHeight) {
  return regions
    .map((region) => {
      const left = percent(safeNumber(region.left) / viewportWidth, 0.08);
      const top = percent(safeNumber(region.top) / viewportHeight, 0.08);
      const width = percent(safeNumber(region.width, 160) / viewportWidth, 0.18);
      const height = percent(safeNumber(region.height, 90) / viewportHeight, 0.12);
      const componentLabel = region.components?.[0]?.label
        ? `: ${region.components[0].label}`
        : "";
      const label = `${region.label}${componentLabel}`;
      const componentTargets = (region.componentTargetIds || []).join(",");
      return `    <div class="rewrite-region" data-component-targets="${escapeHtml(componentTargets)}" style="left:${left};top:${top};width:${width};height:${height};"><span>${escapeHtml(label)}</span></div>`;
    })
    .join("\n");
}

function buildPublishNotes(
  queueItem,
  affectedRegions,
  affectedComponents = [],
  previewTweak = null,
  acceptedLiveEdit = null,
) {
  const detail = cleanString(queueItem?.detail);
  const regionText = `${affectedRegions.length} affected ${
    affectedRegions.length === 1 ? "region" : "regions"
  }`;
  const componentText = affectedComponents.length
    ? `${affectedComponents.length} component targets`
    : "";
  const tweakText = previewTweak?.note
    ? `Preview tweak: ${compactText(previewTweak.note, 180)}`
    : "";
  const liveEditText = acceptedLiveEdit?.patchNote
    ? `Accepted Live Edit: ${compactText(acceptedLiveEdit.patchNote, 220)}`
    : "";
  return [
    "Generated locally from Canvax rewrite request data. No paid API key was required.",
    detail,
    liveEditText,
    tweakText,
    regionText,
    componentText,
  ]
    .filter(Boolean)
    .join(" ");
}

function firstMeaningfulLabel(elements) {
  return (
    elements
      .filter((element) => element.type === "label")
      .map((element) => cleanString(element.text))
      .find((text) => text && text.length > 2) || ""
  );
}

function elementColor(index, visualDirection = null) {
  const colors =
    Array.isArray(visualDirection?.nodePalette) &&
    visualDirection.nodePalette.length
      ? visualDirection.nodePalette
      : ["#f25a32", "#0c8d7b", "#2364aa", "#f0a202", "#b246a8"];
  return colors[index % colors.length];
}

function percent(value, fallback) {
  const numeric = Number.isFinite(value) ? value : fallback;
  return `${Math.max(0, Math.min(1, numeric)) * 100}%`;
}

function denormalize(value, span, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return numeric <= 1 ? numeric * span : numeric;
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(1, numeric));
}

function normalizeColor(value) {
  const text = cleanString(value);
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(text) ? text : "";
}

function safeCssClass(value) {
  return cleanString(value).replace(/[^a-z0-9_-]/gi, "-") || "element";
}

function compactText(value, maxLength = 120) {
  const text = cleanString(value).replace(/\s+/g, " ");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function cleanString(value) {
  return String(value || "").trim();
}

function safeSlug(value) {
  return (
    cleanString(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "frame"
  );
}

function toProjectRelative(filePath) {
  return relative(projectRoot, filePath).replaceAll("\\", "/");
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    fail(
      `Could not read ${filePath}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

async function readOptionalJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

function readOption(inputArgs, flag) {
  const index = inputArgs.findIndex((entry) => entry === flag);
  return index >= 0 && inputArgs[index + 1] ? inputArgs[index + 1].trim() : "";
}

function collectChild(child) {
  return new Promise((resolvePromise) => {
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      resolvePromise({ stdout, stderr, code });
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cssAttributeEscape(value) {
  return cleanString(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printHelp() {
  console.log(`execute-rewrite-request

Usage:
  node scripts/execute-rewrite-request.mjs
  node scripts/execute-rewrite-request.mjs --request exports/canvax-rewrite-request-latest.json
  node scripts/execute-rewrite-request.mjs --frame frame-home --no-publish --json
  node scripts/execute-rewrite-request.mjs --preview-tweak exports/canvax-preview-tweak-latest.json

Reads a Canvax rewrite request, writes a local refreshed HTML preview artifact
under artifacts/preview/codex-rewrite/frames/<frame-id>/, and publishes a Codex
output manifest binding unless --no-publish is provided.

This is a deterministic local executor for validation and preview binding. It
does not call a paid API and does not replace a real Codex implementation pass.`);
}
