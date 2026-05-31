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
const imageHostTask = buildImageHostTask(assetCandidates);
const buildRequest = buildRealRequest(board, frame);
const rewriteRequest = buildRewriteRequest(board, frame);
const previewTweak = buildPreviewTweak(frame);

const paths = {
  taskPack: resolve(latestRoot, "task-pack.json"),
  imagePromptPack: resolve(latestRoot, "image-prompt-pack.json"),
  assetCandidates: resolve(latestRoot, "asset-candidates.json"),
  imageHostTask: resolve(latestRoot, "image-host-task.json"),
  buildRequest: resolve(latestRoot, "build-request.json"),
  rewriteRequest: resolve(latestRoot, "rewrite-request.json"),
  previewTweak: resolve(latestRoot, "preview-tweak.json"),
  result: resolve(latestRoot, "result.json"),
};

await writeJson(paths.taskPack, taskPack);
await writeJson(paths.imagePromptPack, imagePromptPack);
await writeJson(paths.assetCandidates, assetCandidates);
await writeJson(paths.imageHostTask, imageHostTask);
await writeJson(paths.buildRequest, buildRequest);
await writeJson(paths.rewriteRequest, rewriteRequest);
await writeJson(paths.previewTweak, previewTweak);

record(
  "synthetic rough frame includes sketch, labels, voice, and corrections",
  frame.composition.elements.length >= 6 &&
    taskPack.voice.segmentCount === 1 &&
    rewriteRequest.frames[0].outputAnnotations.length === 1 &&
    rewriteRequest.frames[0].acceptedLiveEditVariant?.label === "Clarity" &&
    rewriteRequest.frames[0].liveEditPins?.[0]?.targetId === "primary-cta",
);
record(
  "image prompt and asset packs stay no-API",
  imagePromptPack.requiresOpenAiApiKey === false &&
    assetCandidates.requiresOpenAiApiKey === false &&
    imageHostTask.requiresOpenAiApiKey === false &&
    assetCandidates.candidates.length === 2 &&
    imageHostTask.tasks.length === 2 &&
    assetCandidates.reviewSummary?.kind ===
      "canvax-asset-candidate-review" &&
    assetCandidates.reviewSummary.hostHandoff?.requiresOpenAiApiKey === false,
);
record(
  "image host task preserves placement and return binding",
  imageHostTask.kind === "canvax-image-host-task" &&
    imageHostTask.noApiBoundary?.canCanvaxCallImageApi === false &&
    imageHostTask.tasks.every(
      (task) =>
        task.hostPrompt &&
        task.placementContract?.targetSelector &&
        task.outputSlot?.slotId &&
        task.returnInstructions.length > 0,
    ),
);
record(
  "asset candidates include placement contracts and output slots",
  assetCandidates.candidates.every(
    (candidate) =>
      candidate.placementMap?.kind === "canvax-asset-placement" &&
      candidate.outputSlots?.[0]?.slotId &&
      candidate.outputSlots?.[0]?.cssPlacement &&
      candidate.outputSlots?.[0]?.targetSelector,
  ),
);
record(
  "preview tweak request stays no-API and targets the frame",
  previewTweak.kind === "canvax-preview-tweak-request" &&
    previewTweak.requiresOpenAiApiKey === false &&
    previewTweak.frameId === frameId &&
    previewTweak.region.normalized.width > 0,
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
    ) &&
    buildResult.implementationFiles.some((file) =>
      file.path.endsWith("/implementation/CanvaxScreen.jsx"),
    ) &&
    buildResult.implementationFiles.some((file) =>
      file.path.endsWith("/implementation/CanvaxScreen.css"),
    ) &&
    buildResult.implementationFiles.some((file) =>
      file.path.endsWith("/implementation/ViteApp.jsx"),
    ) &&
    buildResult.implementationFiles.some((file) =>
      file.path.endsWith("/implementation/NextAppPage.jsx"),
    ) &&
    buildResult.implementationFiles.some((file) =>
      file.path.endsWith("/implementation/FRAMEWORK_ADAPTERS.md"),
    ) &&
    buildResult.implementationFiles.some((file) =>
      file.path.endsWith("/implementation/codex-port-task.json"),
    ) &&
    buildResult.implementationFiles.some((file) =>
      file.path.endsWith("/implementation/ACCEPTANCE.md"),
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
const rawBuildPreview = await readFile(
  resolve(projectRoot, buildResult.previewPath),
  "utf8",
);
const rawBuildContext = await readFile(
  resolve(projectRoot, buildResult.contextPath),
  "utf8",
);
const parsedBuildContext = JSON.parse(rawBuildContext);
record(
  "build executor preserves designer implementation context",
  parsedBuildContext.implementationContext?.kind ===
    "canvax-implementation-context" &&
    parsedBuildContext.implementationContext.workbench?.startPath?.includes(
      "Sketch",
    ) &&
    parsedBuildContext.designKit?.preset?.id === "poster-system" &&
    parsedBuildContext.implementationContext.designKit?.preset?.id ===
      "poster-system" &&
    parsedBuildContext.implementationContext.selectedMapContext?.objects
      ?.length === 1,
);
record(
  "build executor applies designer context to generated preview theme",
  rawBuildPreview.includes('data-canvax-theme="poster-archive"') &&
    rawBuildPreview.includes('data-canvax-atmosphere="constructivist-poster"') &&
    rawBuildPreview.includes("ARCHIVE DISPATCH") &&
    rawBuildPreview.includes("atmosphere-band-one") &&
    rawBuildPreview.includes("Designer context") &&
    rawBuildPreview.includes("Poster Archive") &&
    rawBuildPreview.includes("--red: #e85d3a;") &&
    rawBuildPreview.includes("Sketch tokens:"),
);
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
      parsedMap.ownership?.files?.some((file) =>
        file.path.endsWith("CanvaxScreen.jsx"),
      ) &&
      parsedMap.ownership?.files?.some((file) =>
        file.path.endsWith("NextAppPage.jsx"),
      ) &&
      parsedMap.regions?.some((region) =>
        region.implementationSelector?.includes("data-canvax-node-id"),
      ),
  );
}
const reactComponentFile = buildResult.implementationFiles.find(
  (file) => file.kind === "react-component",
);
if (reactComponentFile?.path) {
  await assertReadableProjectFile(reactComponentFile.path);
  const rawComponent = await readFile(
    resolve(projectRoot, reactComponentFile.path),
    "utf8",
  );
  record(
    "build executor creates portable React component handoff",
    rawComponent.includes("export default function CanvaxScreen") &&
      rawComponent.includes("data-canvax-node-id") &&
      rawComponent.includes("CanvaxScreen.css") &&
      rawComponent.includes("designerBrief") &&
      rawComponent.includes("CanvaxAtmosphere") &&
      rawComponent.includes("data-canvax-atmosphere"),
  );
}
const nextAdapterFile = buildResult.implementationFiles.find(
  (file) => file.kind === "next-app-router-adapter",
);
const viteAdapterFile = buildResult.implementationFiles.find(
  (file) => file.kind === "vite-react-adapter",
);
const adapterDocsFile = buildResult.implementationFiles.find(
  (file) => file.kind === "framework-adapter-docs",
);
const buildContractFile = buildResult.implementationFiles.find(
  (file) => file.kind === "build-integration-contract",
);
const integrationGuideFile = buildResult.implementationFiles.find(
  (file) => file.kind === "integration-guide",
);
const acceptanceChecklistFile = buildResult.implementationFiles.find(
  (file) => file.kind === "acceptance-checklist",
);
const portTaskFile = buildResult.implementationFiles.find(
  (file) => file.kind === "codex-port-task",
);
if (nextAdapterFile?.path && viteAdapterFile?.path && adapterDocsFile?.path) {
  await assertReadableProjectFile(nextAdapterFile.path);
  await assertReadableProjectFile(viteAdapterFile.path);
  await assertReadableProjectFile(adapterDocsFile.path);
  const [rawNextAdapter, rawViteAdapter, rawAdapterDocs] = await Promise.all([
    readFile(resolve(projectRoot, nextAdapterFile.path), "utf8"),
    readFile(resolve(projectRoot, viteAdapterFile.path), "utf8"),
    readFile(resolve(projectRoot, adapterDocsFile.path), "utf8"),
  ]);
  record(
    "build executor creates framework adapter handoffs",
    rawNextAdapter.includes("export default function Page") &&
      rawViteAdapter.includes("export default function App") &&
      rawAdapterDocs.includes("Next.js App Router") &&
      rawAdapterDocs.includes("data-canvax-node-id"),
  );
}
if (buildContractFile?.path && integrationGuideFile?.path) {
  await assertReadableProjectFile(buildContractFile.path);
  await assertReadableProjectFile(integrationGuideFile.path);
  const [rawBuildContract, rawIntegrationGuide] = await Promise.all([
    readFile(resolve(projectRoot, buildContractFile.path), "utf8"),
    readFile(resolve(projectRoot, integrationGuideFile.path), "utf8"),
  ]);
  const parsedBuildContract = JSON.parse(rawBuildContract);
  record(
    "build executor creates integration contract and guide",
    parsedBuildContract.kind === "canvax-build-integration-contract" &&
      parsedBuildContract.requiresOpenAiApiKey === false &&
      parsedBuildContract.frame?.id === frameId &&
      parsedBuildContract.frameworkAdapters?.react?.component ===
        "CanvaxScreen.jsx" &&
      parsedBuildContract.frameworkAdapters?.nextAppRouter?.adapter ===
        "NextAppPage.jsx" &&
      parsedBuildContract.designerImplementationContext?.workbenchPath?.includes(
        "Sketch",
      ) &&
      parsedBuildContract.designerImplementationContext?.selectedMapObjectCount ===
        1 &&
      parsedBuildContract.designerImplementationContext?.designKit?.presetId ===
        "poster-system" &&
      parsedBuildContract.visualDirection?.themeId === "poster-archive" &&
      parsedBuildContract.visualDirection?.atmosphereId ===
        "constructivist-poster" &&
      parsedBuildContract.visualDirection?.designTokens?.palette?.[0] ===
        "#e85d3a" &&
      parsedBuildContract.ownership?.portTask === "codex-port-task.json" &&
      parsedBuildContract.ownership?.acceptanceChecklist ===
        "ACCEPTANCE.md" &&
      parsedBuildContract.ownership?.componentMap ===
        "canvax-component-map.json" &&
      parsedBuildContract.codexNextActions?.some((action) =>
        action.includes("write-codex-output.mjs"),
      ) &&
      rawIntegrationGuide.includes("Recommended Codex Port") &&
      rawIntegrationGuide.includes("Requires OpenAI API key: no"),
  );
}
if (acceptanceChecklistFile?.path) {
  await assertReadableProjectFile(acceptanceChecklistFile.path);
  const rawAcceptanceChecklist = await readFile(
    resolve(projectRoot, acceptanceChecklistFile.path),
    "utf8",
  );
  record(
    "build executor creates production acceptance checklist",
    rawAcceptanceChecklist.includes("Production Acceptance Checklist") &&
      rawAcceptanceChecklist.includes("Requires OpenAI API key: no") &&
      rawAcceptanceChecklist.includes("data-canvax-node-id") &&
      rawAcceptanceChecklist.includes("write-codex-output.mjs") &&
      rawAcceptanceChecklist.includes("Definition Of Done"),
  );
}
if (portTaskFile?.path) {
  await assertReadableProjectFile(portTaskFile.path);
  const rawPortTask = await readFile(
    resolve(projectRoot, portTaskFile.path),
    "utf8",
  );
  const parsedPortTask = JSON.parse(rawPortTask);
  record(
    "build executor creates machine-readable Codex port task",
    parsedPortTask.kind === "canvax-codex-port-task" &&
      parsedPortTask.requiresOpenAiApiKey === false &&
      parsedPortTask.frame?.id === frameId &&
      parsedPortTask.visualDirection?.themeId === "poster-archive" &&
      parsedPortTask.visualDirection?.designTokens?.palette?.[0] ===
        "#e85d3a" &&
      parsedPortTask.designerContext?.designKit?.presetId ===
        "poster-system" &&
      parsedPortTask.sourceArtifacts?.componentMap ===
        "canvax-component-map.json" &&
      parsedPortTask.suggestedDestinations?.nextAppRouter?.files?.includes(
        "page.jsx",
      ) &&
      parsedPortTask.requiredBindings?.some((binding) =>
        binding.selector?.includes("data-canvax-node-id"),
      ) &&
      parsedPortTask.publishCommands?.some((command) =>
        command.includes("write-codex-output.mjs"),
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
  ...(buildContractFile?.path
    ? [
        "--artifact",
        `${buildContractFile.path}::E2E build integration contract::${frameId}`,
      ]
    : []),
  ...(integrationGuideFile?.path
    ? [
        "--artifact",
        `${integrationGuideFile.path}::E2E integration guide::${frameId}`,
      ]
    : []),
  ...(acceptanceChecklistFile?.path
    ? [
        "--artifact",
        `${acceptanceChecklistFile.path}::E2E production acceptance checklist::${frameId}`,
      ]
    : []),
  ...(portTaskFile?.path
    ? [
        "--artifact",
        `${portTaskFile.path}::E2E Codex port task::${frameId}`,
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
    ) &&
    buildManifestDryRun.manifest?.artifacts?.some((artifact) =>
      artifact.path?.endsWith("/implementation/canvax-build-contract.json"),
    ) &&
    buildManifestDryRun.manifest?.artifacts?.some((artifact) =>
      artifact.path?.endsWith("/implementation/codex-port-task.json"),
    ) &&
    buildManifestDryRun.manifest?.artifacts?.some((artifact) =>
      artifact.path?.endsWith("/implementation/ACCEPTANCE.md"),
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
  "--preview-tweak",
  toProjectRelative(paths.previewTweak),
  "--no-publish",
  "--json",
]);
record(
  "rewrite executor creates refreshed preview from correction context",
  rewriteResult.ok === true &&
    rewriteResult.frameId === frameId &&
    rewriteResult.previewTweakIncluded === true &&
    rewriteResult.acceptedLiveEditIncluded === true &&
    rewriteResult.affectedRegionCount >= 1 &&
    rewriteResult.componentTargetCount >= 1 &&
    rewriteResult.previewPath.includes(`/frames/${frameId}/`),
  rewriteResult.previewPath,
);
await assertReadableProjectFile(rewriteResult.previewPath);
await assertReadableProjectFile(rewriteResult.contextPath);
await assertReadableProjectFile(rewriteResult.patchTaskPath);
const rawRewritePreview = await readFile(
  resolve(projectRoot, rewriteResult.previewPath),
  "utf8",
);
const rawRewriteContext = await readFile(
  resolve(projectRoot, rewriteResult.contextPath),
  "utf8",
);
const rawPatchTask = await readFile(
  resolve(projectRoot, rewriteResult.patchTaskPath),
  "utf8",
);
const parsedRewriteContext = JSON.parse(rawRewriteContext);
const parsedPatchTask = JSON.parse(rawPatchTask);
record(
  "rewrite context maps correction marks to generated component targets",
  parsedRewriteContext.frameCodeMap?.path?.endsWith(
    "/implementation/canvax-component-map.json",
  ) &&
    parsedRewriteContext.affectedComponents?.some((component) =>
      component.selector?.includes("data-canvax-node-id"),
    ) &&
    parsedRewriteContext.affectedRegions?.some(
      (region) => region.componentTargetIds?.length > 0,
    ),
);
record(
  "rewrite context carries accepted Live Edit source intent",
  parsedRewriteContext.acceptedLiveEdit?.kind ===
    "canvax-accepted-live-edit" &&
    parsedRewriteContext.acceptedLiveEdit?.target?.targetId ===
      "primary-cta" &&
    parsedRewriteContext.acceptedLiveEdit?.variant?.label === "Clarity" &&
    parsedRewriteContext.affectedRegions?.some(
      (region) =>
        region.source === "live-edit-accepted-variant" &&
        region.liveEditVariant?.role === "clarity-accessibility" &&
        region.componentTargetIds?.includes("primary-cta"),
    ),
);
record(
  "rewrite context includes Preview region tweak request",
  parsedRewriteContext.previewTweak?.kind ===
    "canvax-preview-tweak-request" &&
    parsedRewriteContext.previewTweak?.id === previewTweak.id &&
    parsedRewriteContext.previewTweak?.note === previewTweak.note &&
    parsedRewriteContext.affectedRegions?.some(
      (region) =>
        region.source === "preview-tweak" &&
        region.note === previewTweak.note &&
        region.componentTargetIds?.length > 0,
    ),
);
record(
  "rewrite emits Codex patch task for accepted Live Edit targets",
  parsedPatchTask.kind === "canvax-codex-patch-task" &&
    parsedPatchTask.requiresOpenAiApiKey === false &&
    parsedPatchTask.trigger?.kind === "canvax-live-edit-accepted-variant" &&
    parsedPatchTask.trigger?.variant?.label === "Clarity" &&
    parsedPatchTask.liveEdit?.target?.targetId === "primary-cta" &&
    parsedPatchTask.affectedRegions?.some(
      (region) =>
        region.source === "live-edit-accepted-variant" &&
        region.liveEditPins?.[0]?.text?.includes("move upward"),
    ) &&
    parsedPatchTask.componentTargets?.some((target) =>
      target.selector?.includes("data-canvax-node-id"),
    ) &&
    parsedPatchTask.suggestedFiles?.some((file) =>
      file.path?.includes("/implementation/CanvaxScreen.jsx"),
    ),
);
const patchApplyResult = await executeJson("node", [
  "scripts/execute-patch-task.mjs",
  "--task",
  rewriteResult.patchTaskPath,
  "--no-publish",
  "--json",
]);
record(
  "patch task executor applies local generated implementation edits",
  patchApplyResult.ok === true &&
    patchApplyResult.changedFileCount >= 3 &&
    patchApplyResult.changedFiles?.some((file) =>
      file.path?.endsWith("/implementation/CanvaxScreen.jsx"),
    ) &&
    patchApplyResult.changedFiles?.some((file) =>
      file.path?.endsWith("/implementation/index.html"),
    ) &&
    patchApplyResult.changedFiles?.some((file) =>
      file.path?.endsWith("/implementation/CanvaxScreen.css"),
    ),
);
await assertReadableProjectFile(patchApplyResult.resultPath);
const rawPatchedComponent = await readFile(
  resolve(
    projectRoot,
    buildResult.implementationFiles.find((file) =>
      file.path.endsWith("/implementation/CanvaxScreen.jsx"),
    ).path,
  ),
  "utf8",
);
const rawPatchedHtml = await readFile(
  resolve(
    projectRoot,
    buildResult.implementationFiles.find((file) =>
      file.path.endsWith("/implementation/index.html"),
    ).path,
  ),
  "utf8",
);
record(
  "applied patch preserves selector binding and records patch metadata",
  rawPatchedComponent.includes('data-canvax-node-id={node.id}') &&
    rawPatchedComponent.includes('data-canvax-patch-state={node.patchState || undefined}') &&
    rawPatchedComponent.includes('"id": "primary-cta"') &&
    rawPatchedComponent.includes('"patchState": "applied"') &&
    rawPatchedComponent.includes('"patchReason": "move-up"') &&
    rawPatchedComponent.includes("Accepted Live Edit variant 3") &&
    rawPatchedHtml.includes('data-canvax-node-id="primary-cta"') &&
    rawPatchedHtml.includes('data-canvax-patch-state="applied"') &&
    rawPatchedHtml.includes('style="left:10%;top:51%;'),
);
record(
  "rewrite executor preserves build visual direction",
  parsedRewriteContext.visualDirection?.themeId === "poster-archive" &&
    parsedRewriteContext.visualDirection?.atmosphereId ===
      "constructivist-poster" &&
    parsedRewriteContext.buildContract?.visualDirection?.themeId ===
      "poster-archive" &&
    parsedRewriteContext.portTask?.kind === "canvax-codex-port-task" &&
    parsedRewriteContext.portTask?.requiredBindings?.some((binding) =>
      binding.selector?.includes("data-canvax-node-id"),
    ) &&
    rawRewritePreview.includes('data-canvax-theme="poster-archive"') &&
    rawRewritePreview.includes('data-canvax-atmosphere="constructivist-poster"'),
);

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
    imageHostTask: toProjectRelative(paths.imageHostTask),
    buildRequest: toProjectRelative(paths.buildRequest),
    rewriteRequest: toProjectRelative(paths.rewriteRequest),
    previewTweak: toProjectRelative(paths.previewTweak),
    buildPreview: buildResult.previewPath,
    buildContext: buildResult.contextPath,
    rewritePreview: rewriteResult.previewPath,
    rewriteContext: rewriteResult.contextPath,
    rewritePatchTask: rewriteResult.patchTaskPath,
    appliedPatchResult: patchApplyResult.resultPath,
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
  const liveEditTarget = {
    kind: "canvax-live-edit-target",
    id: "e2e-live-edit-target-primary-cta",
    sourceFrameId: frameId,
    sourceFrameTitle: "Rough hero sketch",
    targetId: "primary-cta",
    targetLabel: "Primary CTA",
    targetType: "preview-dom-element",
    targetSource: "canvax-e2e-workflow-check",
    surface: "generated-output",
    bounds: { x: 0.1, y: 0.6, w: 0.16, h: 0.07 },
    note: "Make the CTA clearer, move it upward, and preserve the hero layout.",
    status: "accepted",
    pickedAt: now(),
    acceptedAt: now(),
    acceptedVariantId: "e2e-live-edit-variant-clarity",
    acceptedVariantLabel: "Clarity",
    acceptedVariantRole: "clarity-accessibility",
    updatedAt: now(),
  };
  const liveEditVariants = [
    {
      kind: "canvax-live-edit-variant",
      id: "e2e-live-edit-variant-structure",
      index: 1,
      role: "structure-layout",
      label: "Structure",
      title: "Recompose the CTA cluster",
      body: "Improve CTA hierarchy and spacing while keeping the hero intact.",
      summary: "Structure-first variant for the primary CTA.",
      target: liveEditTarget,
      designMoves: ["tighten CTA-to-headline spacing"],
      createdAt: now(),
    },
    {
      kind: "canvax-live-edit-variant",
      id: "e2e-live-edit-variant-taste",
      index: 2,
      role: "visual-taste",
      label: "Taste",
      title: "Make the CTA feel more intentional",
      body: "Push color, typography, and affordance quality without changing the flow.",
      summary: "Visual/taste variant for the primary CTA.",
      target: liveEditTarget,
      designMoves: ["raise CTA contrast"],
      createdAt: now(),
    },
    {
      kind: "canvax-live-edit-variant",
      id: "e2e-live-edit-variant-clarity",
      index: 3,
      role: "clarity-accessibility",
      label: "Clarity",
      title: "Clarify the CTA action",
      body: "Move the CTA upward, clarify the action copy, and keep the selected target binding intact.",
      summary: "Clarity pass: move the primary CTA upward and make the action easier to understand.",
      target: liveEditTarget,
      designMoves: [
        "move the selected CTA upward",
        "tighten spacing between headline and CTA",
        "preserve surrounding hero layout",
      ],
      createdAt: now(),
      acceptedAt: now(),
    },
  ];
  const elements = [
    element("rect", "hero-frame", "Hero section frame", 0.05, 0.08, 0.9, 0.78, "#10192a"),
    element("label", "headline", "Make sketching feel like building", 0.1, 0.2, 0.34, 0.13, "#ff5d3a"),
    element("rect", "copy-block", "Left copy block", 0.09, 0.34, 0.36, 0.22, "#ff5d3a"),
    element("rect", "primary-cta", "Primary CTA", 0.1, 0.6, 0.16, 0.07, "#0c8d7b"),
    element("rect", "preview-panel", "Generated screen area", 0.56, 0.18, 0.32, 0.45, "#2364aa"),
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
      "Left headline and CTA, right generated screen panel, asset slot for future image generation.",
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
    liveEditTarget,
    liveEditPins: [
      {
        id: "e2e-live-edit-pin-cta",
        kind: "canvax-live-edit-comment-pin",
        text: "Make this CTA read faster and move upward.",
        point: { x: 0.17, y: 0.63 },
        targetId: "primary-cta",
        targetLabel: "Primary CTA",
        createdAt: now(),
        updatedAt: now(),
      },
    ],
    liveEditVariants,
    liveEditVariantIndex: 2,
    acceptedLiveEditVariant: liveEditVariants[2],
    composition: {
      viewport: { width: 1440, height: 1024, label: "Desktop" },
      elementCount: elements.length,
      elements,
      liveEditCanvasMarks: [
        {
          id: "e2e-live-edit-arrow",
          type: "arrow",
          points: [
            { x: 0.18, y: 0.72 },
            { x: 0.18, y: 0.61 },
          ],
          bounds: { x: 0.16, y: 0.58, w: 0.08, h: 0.18 },
          normalizedBounds: { x: 0.16, y: 0.58, w: 0.08, h: 0.18 },
          semantics: {
            intent: "move-or-flow",
            label: "Arrow/drag: move or follow this direction upward",
            confidence: 0.72,
            rule: "canvas-arrow",
            vector: { x: 0, y: -0.11 },
          },
        },
      ],
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
  const candidates = [
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
  ].map((candidate) => withAssetPlacement(candidate, frame));

  return {
    schemaVersion: 1,
    kind: "canvax-asset-candidates",
    createdAt: now(),
    requiresOpenAiApiKey: false,
    board,
    reviewSummary: buildAssetCandidateReviewSummary(candidates),
    candidates,
  };
}

function buildImageHostTask(assetCandidates) {
  const tasks = assetCandidates.candidates.map((candidate, index) => {
    const placement = candidate.placementMap;
    const slot = candidate.outputSlots[0];
    const pixel = placement.pixelBounds;
    const css = placement.cssPlacement;
    return {
      taskId: `${candidate.id}-host-task`,
      candidateId: candidate.id,
      title: candidate.title,
      sourceFrameId: candidate.sourceFrameId,
      sourceFrameTitle: candidate.sourceFrameTitle,
      status: candidate.status,
      hostPrompt: [
        `Generate image candidate ${index + 1}: ${candidate.title}.`,
        candidate.prompt,
        `Placement: ${placement.placement}.`,
        `Pixel slot: ${pixel.left}, ${pixel.top}, ${pixel.width}x${pixel.height}.`,
        `CSS slot: left ${css.left}, top ${css.top}, width ${css.width}, height ${css.height}.`,
        `Target selector: ${placement.targetSelector}.`,
        "Avoid unrelated logos, unreadable text, and composition drift.",
      ].join("\n"),
      negativePrompt: candidate.negativePrompt || "",
      placementContract: {
        placement: placement.placement,
        normalizedBounds: placement.normalizedBounds,
        pixelBounds: placement.pixelBounds,
        cssPlacement: placement.cssPlacement,
        targetSelector: placement.targetSelector,
        htmlScaffold: placement.htmlScaffold,
      },
      outputSlot: {
        slotId: slot.slotId,
        status: slot.status,
        imagePath: slot.imagePath || "",
        accepted: Boolean(slot.accepted),
        attached: Boolean(slot.attached),
      },
      returnInstructions: [
        "Save, attach, or paste the generated image back into Canvax.",
        `Bind the result to candidate ${candidate.id}.`,
        `Use output slot ${slot.slotId}.`,
      ],
      acceptanceCriteria: [
        "The image matches the prompt and style lock.",
        "The composition fits the target bounds.",
      ],
    };
  });
  return {
    schemaVersion: 1,
    kind: "canvax-image-host-task",
    createdAt: now(),
    requiresOpenAiApiKey: false,
    intendedHost:
      "Use the image generation host already available in the current Codex or ChatGPT session.",
    purpose:
      "E2E no-API hosted-image handoff with return-slot binding.",
    board: assetCandidates.board,
    reviewSummary: assetCandidates.reviewSummary,
    candidateCount: tasks.length,
    workflow: [
      "Copy a task hostPrompt into the host image tool.",
      "Return the generated image to the matching output slot.",
    ],
    noApiBoundary: {
      canCanvaxCallImageApi: false,
      reason: "Canvax exports the task but does not call an image API.",
    },
    returnContract: {
      acceptedInputs: ["workspace image file path", "pasted image"],
      requiredBindingFields: ["candidateId", "outputSlot.slotId"],
    },
    tasks,
  };
}

function buildAssetCandidateReviewSummary(candidates) {
  const slots = candidates.flatMap((candidate) => candidate.outputSlots || []);
  const groups = [
    {
      frameId: candidates[0]?.sourceFrameId || "",
      frameTitle: candidates[0]?.sourceFrameTitle || "",
      total: candidates.length,
      promptReady: candidates.length,
      placed: 0,
      attached: 0,
      accepted: 0,
      candidateIds: candidates.map((candidate) => candidate.id),
      acceptedCandidateIds: [],
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        title: candidate.title,
        type: candidate.type,
        status: candidate.status || "prompt-ready",
        sourceFrameId: candidate.sourceFrameId || "",
        sourceFrameTitle: candidate.sourceFrameTitle || "",
        sourceElementId: candidate.sourceElementId || "",
        placement: candidate.placement || "whole frame",
        prompt: candidate.prompt || "",
        slotId: candidate.outputSlots?.[0]?.slotId || "",
        targetSelector:
          candidate.outputSlots?.[0]?.targetSelector ||
          candidate.placementMap?.targetSelector ||
          "",
        pixelBounds:
          candidate.outputSlots?.[0]?.pixelBounds ||
          candidate.placementMap?.pixelBounds ||
          null,
        cssPlacement:
          candidate.outputSlots?.[0]?.cssPlacement ||
          candidate.placementMap?.cssPlacement ||
          null,
        imageElementId: "",
        imagePath: "",
        accepted: false,
      })),
    },
  ];
  return {
    kind: "canvax-asset-candidate-review",
    total: candidates.length,
    placementReady: candidates.filter((candidate) => candidate.placementMap)
      .length,
    slotCount: slots.length,
    emptySlots: slots.length,
    promptReady: candidates.length,
    placed: 0,
    attached: 0,
    accepted: 0,
    statusCounts: {
      promptReady: candidates.length,
      placed: 0,
      attached: 0,
      accepted: 0,
      emptySlots: slots.length,
    },
    pendingCandidateIds: candidates.map((candidate) => candidate.id),
    placedCandidateIds: [],
    attachedCandidateIds: [],
    acceptedCandidateIds: [],
    acceptedCandidates: [],
    groups,
    hostHandoff: {
      requiresOpenAiApiKey: false,
      lane: "host-image-generation",
      copyReadyFiles: [
        "exports/canvax-image-host-task-latest.md",
        "exports/canvax-image-host-task-latest.json",
        "exports/canvax-image-generation-brief-latest.md",
        "exports/canvax-image-generation-brief-latest.json",
        "exports/canvax-asset-candidates-latest.json",
      ],
      workflow: [
        "Copy a candidate block into the host image-generation lane.",
        "Attach the generated output back to the matching candidate.",
        "Accept the chosen candidate for Codex use.",
      ],
    },
    nextActions: [
      "Generate pending candidates in the host image lane using the copy-ready brief.",
    ],
  };
}

function withAssetPlacement(candidate, frame) {
  const viewport = frame.viewport || { id: "desktop", width: 1440, height: 1024 };
  const bounds = candidate.bounds || {
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    centerX: 0.5,
    centerY: 0.5,
  };
  const normalizedBounds = {
    ...bounds,
    centerX: round(bounds.x + bounds.w / 2),
    centerY: round(bounds.y + bounds.h / 2),
  };
  const pixelBounds = {
    left: Math.round(bounds.x * viewport.width),
    top: Math.round(bounds.y * viewport.height),
    width: Math.round(bounds.w * viewport.width),
    height: Math.round(bounds.h * viewport.height),
  };
  pixelBounds.right = pixelBounds.left + pixelBounds.width;
  pixelBounds.bottom = pixelBounds.top + pixelBounds.height;
  const cssPlacement = {
    position: "absolute",
    left: `${round(bounds.x * 100)}%`,
    top: `${round(bounds.y * 100)}%`,
    width: `${round(bounds.w * 100)}%`,
    height: `${round(bounds.h * 100)}%`,
    aspectRatio: candidate.aspectRatio,
  };
  const slotId = `${candidate.id}-slot-1`;
  const placementMap = {
    kind: "canvax-asset-placement",
    slotId,
    sourceFrameId: frame.id,
    sourceFrameTitle: frame.title,
    sourceElementId: candidate.sourceElementId || "",
    surface: viewport.id,
    viewport,
    placement: candidate.placement,
    normalizedBounds,
    pixelBounds,
    cssPlacement,
    targetSelector: `[data-asset-candidate-id="${candidate.id}"]`,
    htmlScaffold: `<figure class="canvax-asset-slot" data-asset-candidate-id="${candidate.id}"></figure>`,
  };
  return {
    ...candidate,
    placementMap,
    outputSlots: [
      {
        id: slotId,
        slotId,
        label:
          candidate.type === "frame-composite"
            ? "Full-frame generated image"
            : "Generated region image",
        role:
          candidate.type === "frame-composite"
            ? "full-frame-output"
            : "region-output",
        status: "empty",
        assetCandidateId: candidate.id,
        frameId: frame.id,
        frameTitle: frame.title,
        placement: candidate.placement,
        bounds: normalizedBounds,
        pixelBounds,
        cssPlacement,
        targetSelector: placementMap.targetSelector,
        accepted: false,
        attached: false,
      },
    ],
  };
}

function buildRealRequest(board, frame) {
  const designKit = {
    kind: "canvax-design-kit",
    label: "Poster system",
    statusLabel: "Poster system kit",
    summary:
      "Kit: Poster system. Editorial product UI with aged paper, red, black, gold, and faded blue.",
    preset: {
      id: "poster-system",
      label: "Poster system",
      summary:
        "Bold editorial/poster direction for campaigns, landing pages, and visual systems.",
    },
    sources: [
      {
        label: "Kit: Poster system",
        detail:
          "Use public-poster hierarchy, strong geometry, and print-like visual language.",
      },
    ],
    designTokens: {
      kind: "canvax-extracted-design-tokens",
      source: "current-frame-elements",
      sourceFrameId: frame.id,
      sourceFrameTitle: frame.title,
      extractedAt: now(),
      palette: [
        { hex: "#e85d3a", count: 42, role: "primary" },
        { hex: "#14323f", count: 31, role: "accent" },
        { hex: "#f2b84b", count: 24, role: "support" },
        { hex: "#6d8fb8", count: 18, role: "support" },
      ],
      elementMix: {
        total: frame.composition?.elements?.length || 0,
        paths: 1,
        shapes: 4,
        arrows: 0,
        labels: 2,
        imageSlots: 1,
      },
      density: {
        label: "balanced",
        elementCount: frame.composition?.elements?.length || 0,
        viewportArea: 1440 * 1024,
        coverage: 0.24,
      },
      visualSamples: {
        sourceCount: 1,
        sampledSources: 1,
        skippedSources: 0,
        colorCount: 4,
      },
      shapeLanguage: "structured geometric wireframe",
      typographyCue: "2 label/text cues on canvas",
      assetCue: "1 image/reference slot detected",
      summary:
        "structured geometric wireframe with balanced density. 1 visual reference source sampled.",
    },
  };
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
    designKit,
    implementationContext: {
      kind: "canvax-implementation-context",
      purpose: "E2E designer context for rough-sketch-to-real-code workflow.",
      workbench: {
        workspaceMode: "simple",
        workspaceModeLabel: "Workbench",
        focus: "split",
        focusLabel: "Make",
        startPath: "1 Sketch -> 2 Talk -> 3 Make -> 4 Map",
        actionMode: "build-ui",
        actionModeLabel: "Build UI",
        generationRecipe: "Product UI - Studio - Balanced",
      },
      frameRole: {
        id: frame.id,
        title: frame.title,
        viewport: frame.viewport,
        isVariant: false,
        isOutputEditBranch: false,
        outputEditBinding: null,
      },
      variant: {
        id: "variant-e2e-poster-archive",
        label: "Poster archive",
        direction: "Product UI",
        thesis:
          "Translate the rough hero sketch into a bold poster-like product interface.",
        prompt:
          "Use Soviet Constructivism, WPA poster logic, aged paper, red, black, gold, and faded blue.",
        designMoves: [
          "Use huge editorial typography",
          "Keep diagonal motion and archive-like cards",
        ],
        styleProperties: {
          palette: "red black gold faded blue",
          typography: "huge poster typography",
          surface: "aged paper base",
        },
      },
      selectedMapContext: {
        selectedObjectId: "object-e2e-brief",
        selectedObjectIds: ["object-e2e-brief"],
        objects: [
          {
            id: "object-e2e-brief",
            type: "note",
            title: "Hero build guidance",
            sourceKind: "manual",
            frameIds: [frame.id],
            prompt:
              "Build the sketched hero as a polished product screen, preserving CTA and image-slot placement.",
            customProperties: [
              { key: "priority", value: "preserve rough hierarchy" },
            ],
            contextMarkdown:
              "# Hero build guidance\n\nPreserve the CTA and image-slot placement.",
          },
        ],
        prompts: [
          {
            objectId: "object-e2e-brief",
            title: "Hero build guidance",
            prompt:
              "Build the sketched hero as a polished product screen, preserving CTA and image-slot placement.",
          },
        ],
      },
      mapMemory: {
        frames: 1,
        branches: 0,
        outputs: 0,
        checkpoints: 1,
        collapsedLanes: [],
      },
      designKit,
      imageDirection: {
        styleLockId: "style-e2e",
        summary: "Warm editorial product UI with paper texture.",
      },
    },
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

function buildPreviewTweak(frame) {
  return {
    schemaVersion: 1,
    kind: "canvax-preview-tweak-request",
    requiresOpenAiApiKey: false,
    id: "preview-tweak-e2e-cta",
    createdAt: now(),
    frameId: frame.id,
    frameTitle: frame.title,
    compareMode: "output",
    viewport: {
      label: frame.composition.viewport.label,
      width: frame.composition.viewport.width,
      height: frame.composition.viewport.height,
    },
    target: {
      id: "e2e-generated-output",
      label: "E2E generated preview",
      type: "refined-preview",
      previewPath: "artifacts/preview/e2e/generated/index.html",
      source: "canvax-e2e-workflow-check",
    },
    region: {
      normalized: {
        x: 0.16,
        y: 0.64,
        width: 0.28,
        height: 0.16,
      },
      pixel: {
        x: 230,
        y: 655,
        width: 403,
        height: 164,
      },
    },
    note:
      "Move the generated CTA cluster upward and make it visibly match the sketched correction arrow.",
    source: {
      surface: "preview",
      interaction: "drag-region",
      noApiBoundary:
        "E2E Preview tweak fixture. This does not call image, browser, or paid APIs.",
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

function round(value) {
  return Number(value.toFixed(4));
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
