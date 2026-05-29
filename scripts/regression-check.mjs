import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const liveJsonPath = resolve(projectRoot, "exports", "canvax-live-latest.json");
const taskPackJsonPath = resolve(
  projectRoot,
  "exports",
  "canvax-task-pack-latest.json",
);
const rewriteRequestJsonPath = resolve(
  projectRoot,
  "exports",
  "canvax-rewrite-request-latest.json",
);
const buildRealRequestJsonPath = resolve(
  projectRoot,
  "exports",
  "canvax-build-real-latest.json",
);
const imagePromptPackJsonPath = resolve(
  projectRoot,
  "exports",
  "canvax-image-prompt-pack-latest.json",
);
const assetCandidatesJsonPath = resolve(
  projectRoot,
  "exports",
  "canvax-asset-candidates-latest.json",
);
const imageGenerationBriefJsonPath = resolve(
  projectRoot,
  "exports",
  "canvax-image-generation-brief-latest.json",
);
const imageHostTaskJsonPath = resolve(
  projectRoot,
  "exports",
  "canvax-image-host-task-latest.json",
);
const imageResultsJsonPath = resolve(
  projectRoot,
  "exports",
  "canvax-image-results-latest.json",
);
const latestCheckpointPath = resolve(
  projectRoot,
  "exports",
  "canvax-checkpoint-latest.json",
);
const projectRegistryPath = resolve(
  projectRoot,
  "exports",
  "canvax-project-registry-latest.json",
);
const previewManifestPath = resolve(
  projectRoot,
  "exports",
  "canvax-preview-manifest.json",
);
const codexOutputManifestPath = resolve(
  projectRoot,
  "artifacts",
  "canvax",
  "codex-output.json",
);
const designKitLibraryPath = resolve(
  projectRoot,
  "exports",
  "canvax-design-kit-library-latest.json",
);
const artifactReviewPath = resolve(
  projectRoot,
  "exports",
  "canvax-artifact-review-latest.json",
);
const visualSnapshotReviewPath = resolve(
  projectRoot,
  "exports",
  "canvax-visual-snapshot-review-latest.json",
);
const designJuryReviewPath = resolve(
  projectRoot,
  "exports",
  "canvax-design-jury-latest.json",
);
const domLayoutReviewPath = resolve(
  projectRoot,
  "exports",
  "canvax-dom-review-latest.json",
);
const productionPortProofPath = resolve(
  projectRoot,
  "artifacts",
  "canvax",
  "production-port-proof",
  "latest",
  "result.json",
);
const projectLinkPath = resolve(
  projectRoot,
  "exports",
  "canvax-project-link-latest.json",
);
const hostHandoffPath = resolve(
  projectRoot,
  "exports",
  "canvax-host-handoff-latest.json",
);
const curlBinary = "/usr/bin/curl";
const upstreamProposalPath = resolve(
  projectRoot,
  "docs",
  "upstream-proposal.md",
);
const demoScriptPath = resolve(projectRoot, "docs", "canvax-demo-script.md");

const results = [];

await validateCodexOutputDryRun();
await validateExecuteBuildRequestDryRun();
await validateExecuteRewriteRequestDryRun();
await validateExternalDesignTokenExtractorDryRun();
await validateImageDesignTokenExtractorDryRun();
await validateVisualSnapshotReviewDryRun();
await validateDesignJuryReviewDryRun();
await validateDesignKitLibraryPackageDryRun();
await validateProjectLinkDryRun();
await validateLiveEditSourceHintPatchDryRun();
await validateLiveEditUnhintedSourceSearchDryRun();
await validateLiveEditSourceDiscoveryDryRun();
await validateLiveEditPreviewManifestBindingDryRun();
await validateArtifactReviewDryRun();
await validateDesignTokenEnforcementDryRun();
await validateProductionPortProofDryRun();
await validateCanvaxInspectDryRun();
await validateCanvaxHostHandoffDryRun();
await validateCanvaxTaskPackHandoffsDryRun();
await validateCanvaxMcpSelfTest();
await validateRunningPreviewState();
await validateAssetCandidatesEndpoint();
await validateImageResultImportDryRun();
await validateProjectScopedBuildAndCheckpointEndpoints();
await validateRequiredFile(
  upstreamProposalPath,
  "upstream proposal doc is present",
);
await validateRequiredFile(demoScriptPath, "demo script doc is present");
await validateOptionalJsonSchema(
  liveJsonPath,
  (value) =>
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.frames) &&
    (!value.project ||
      (value.project.kind === "canvax-project" &&
        value.project.handoff?.liveJsonPath?.startsWith("exports/projects/"))) &&
    validateSpatialWorkspaceWhenPresent(value?.spatialWorkspace),
  "live export schema is valid",
  { allowLegacyWithoutSchema: true },
);
await validateOptionalJsonSchema(
  taskPackJsonPath,
  (value) =>
    value?.kind === "canvax-task-pack" &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    (!value.project ||
      value.project.handoff?.taskPackJsonPath?.startsWith("exports/projects/")) &&
    Array.isArray(value?.frames),
  "task pack schema is valid",
);
await validateOptionalJsonSchema(
  rewriteRequestJsonPath,
  (value) =>
    value?.kind === "canvax-rewrite-request" &&
    value.requiresOpenAiApiKey === false &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.rewriteQueue) &&
    Array.isArray(value?.frames) &&
    (!value.revisionGraph ||
      (value.revisionGraph.kind === "canvax-output-revision-graph" &&
        Array.isArray(value.revisionGraph.frames))),
  "rewrite request schema is valid",
);
await validateOptionalJsonSchema(
  buildRealRequestJsonPath,
  (value) =>
    value?.kind === "canvax-build-real-request" &&
    value.requiresOpenAiApiKey === false &&
    value.outputContract?.manifestPath ===
      "artifacts/canvax/codex-output.json" &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1,
  "build real request schema is valid",
);
await validateOptionalJsonSchema(
  imagePromptPackJsonPath,
  (value) =>
    value?.kind === "canvax-image-prompt-pack" &&
    value.requiresOpenAiApiKey === false &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.frames),
  "image prompt pack schema is valid",
);
await validateOptionalJsonSchema(
  assetCandidatesJsonPath,
  (value) =>
    value?.kind === "canvax-asset-candidates" &&
    value.requiresOpenAiApiKey === false &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.candidates) &&
    value.candidates.length > 0 &&
    value.reviewSummary?.kind === "canvax-asset-candidate-review" &&
    Array.isArray(value.reviewSummary.groups) &&
    value.reviewSummary.hostHandoff?.requiresOpenAiApiKey === false,
  "asset candidates schema is valid",
);
await validateOptionalJsonSchema(
  imageGenerationBriefJsonPath,
  (value) =>
    value?.kind === "canvax-image-generation-brief" &&
    value.requiresOpenAiApiKey === false &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.copyBlocks) &&
    value.copyBlocks.length > 0 &&
    value.copyBlocks.every(
      (block) =>
        typeof block.hostPrompt === "string" &&
        block.hostPrompt.length > 0 &&
        block.placementContract?.targetSelector,
    ) &&
    value.reviewSummary?.kind === "canvax-asset-candidate-review" &&
    Array.isArray(value.reviewSummary.groups),
  "image generation brief schema is valid",
);
await validateOptionalJsonSchema(
  imageHostTaskJsonPath,
  (value) =>
    value?.kind === "canvax-image-host-task" &&
    value.requiresOpenAiApiKey === false &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.tasks) &&
    value.tasks.length > 0 &&
    value.tasks.every(
      (task) =>
        typeof task.hostPrompt === "string" &&
        task.hostPrompt.length > 0 &&
        task.placementContract?.targetSelector &&
        task.outputSlot?.slotId,
    ) &&
    value.noApiBoundary?.canCanvaxCallImageApi === false &&
    value.returnContract?.requiredBindingFields?.includes("candidateId"),
  "image host task schema is valid",
);
await validateOptionalJsonSchema(
  imageResultsJsonPath,
  (value) =>
    value?.kind === "canvax-image-results" &&
    value.requiresOpenAiApiKey === false &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.results) &&
    value.results.every(
      (result) =>
        result.kind === "canvax-image-result" &&
        result.candidateId &&
        result.slotId &&
        result.outputSlot?.imagePath,
    ) &&
    value.noApiBoundary?.canCanvaxCallImageApi === false &&
    value.returnContract?.requiredBindingFields?.includes("imagePath"),
  "image result import schema is valid",
);
await validateOptionalJsonSchema(
  latestCheckpointPath,
  (value) =>
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    typeof value?.reason === "string",
  "checkpoint schema is valid",
);
await validateOptionalJsonSchema(
  projectRegistryPath,
  (value) =>
    value?.kind === "canvax-project-registry" &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    typeof value?.activeProjectId === "string" &&
    Array.isArray(value?.projects) &&
    value.projects.every((project) =>
      project?.handoff?.liveJsonPath?.startsWith("exports/projects/"),
    ),
  "project registry schema is valid",
);
await validateOptionalJsonSchema(
  previewManifestPath,
  (value) =>
    Number.isInteger(value?.version) &&
    value.version >= 1 &&
    Array.isArray(value?.targets),
  "preview manifest schema is valid",
);
await validateOptionalJsonSchema(
  codexOutputManifestPath,
  (value) =>
    Number.isInteger(value?.version) &&
    value.version >= 1 &&
    Array.isArray(value?.changes),
  "codex output manifest schema is valid",
);
await validateOptionalJsonSchema(
  designKitLibraryPath,
  (value) =>
    value?.kind === "canvax-design-kit-library" &&
    value.requiresOpenAiApiKey === false &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.kits) &&
    value.integrity?.algorithm === "sha256",
  "design kit library package schema is valid",
);
await validateOptionalJsonSchema(
  artifactReviewPath,
  (value) =>
    value?.kind === "canvax-artifact-design-review" &&
    value.requiresOpenAiApiKey === false &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.checks),
  "artifact design review schema is valid",
);
await validateOptionalJsonSchema(
  visualSnapshotReviewPath,
  (value) =>
    value?.kind === "canvax-visual-snapshot-review" &&
    value.requiresOpenAiApiKey === false &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.snapshots),
  "visual snapshot review schema is valid",
);
await validateOptionalJsonSchema(
  designJuryReviewPath,
  (value) =>
    value?.kind === "canvax-design-jury-review" &&
    value.requiresOpenAiApiKey === false &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.categories) &&
    value.subreviews?.artifactReviews &&
    value.subreviews?.visualReview,
  "design jury review schema is valid",
);
await validateOptionalJsonSchema(
  domLayoutReviewPath,
  (value) =>
    value?.kind === "canvax-dom-layout-review" &&
    value.requiresOpenAiApiKey === false &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.checks) &&
    typeof value?.status === "string",
  "DOM layout review schema is valid",
);
await validateOptionalJsonSchema(
  productionPortProofPath,
  (value) =>
    value?.kind === "canvax-production-port-proof" &&
    value.requiresOpenAiApiKey === false &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    value.tokenVerification?.kind ===
      "canvax-token-enforcement-verification" &&
    value.artifactReview?.kind === "canvax-artifact-design-review" &&
    Array.isArray(value?.implementationFiles),
  "production port proof schema is valid",
);
await validateOptionalJsonSchema(
  projectLinkPath,
  (value) =>
    value?.kind === "canvax-project-link" &&
    value.requiresOpenAiApiKey === false &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.linkedFiles) &&
    value.codexEditContract?.kind === "canvax-project-edit-contract" &&
    value.manifest?.source === "canvax-project-link",
  "project link schema is valid",
);
await validateOptionalJsonSchema(
  hostHandoffPath,
  (value) =>
    value?.kind === "canvax-host-handoff" &&
    value.requiresOpenAiApiKey === false &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    value.frame?.id &&
    value.sketch &&
    value.voice &&
    value.rewrite &&
    value.output &&
    value.projectLink &&
    Array.isArray(value?.nextActions),
  "host handoff schema is valid",
);

const failed = results.filter((entry) => !entry.passed);
results.forEach((entry) => {
  const prefix = entry.skipped ? "skip" : entry.passed ? "ok" : "fail";
  const suffix = entry.detail ? ` (${entry.detail})` : "";
  console.log(`${prefix}: ${entry.name}${suffix}`);
});

if (failed.length) {
  process.exitCode = 1;
}

async function validateCodexOutputDryRun() {
  try {
    const { stdout } = await runCommand("node", [
      "scripts/write-codex-output.mjs",
      "--from-git-status",
      "--dry-run",
      "--json",
    ]);
    const payload = JSON.parse(stdout);
    const manifest = payload?.manifest;
    const liveExport = await readOptionalJson(liveJsonPath);
    const activeProjectId =
      typeof liveExport?.project?.id === "string" ? liveExport.project.id : "";
    const passed = Boolean(
      payload?.dryRun &&
      typeof payload?.manifestPath === "string" &&
      Number.isInteger(manifest?.version) &&
      manifest.version >= 1 &&
      Array.isArray(manifest?.changes) &&
      (!activeProjectId ||
        (manifest.project?.id === activeProjectId &&
          typeof payload?.projectManifestPath === "string" &&
          payload.projectManifestPath.includes(
            `exports/projects/${activeProjectId}/canvax-codex-output-latest.json`,
          ))),
    );
    results.push({
      name: "codex output dry-run manifest is valid",
      passed,
      detail: passed ? `${manifest.changes.length} changes` : "invalid payload",
    });
  } catch (error) {
    results.push({
      name: "codex output dry-run manifest is valid",
      passed: false,
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function validateExecuteBuildRequestDryRun() {
  try {
    await readFile(buildRealRequestJsonPath, "utf8");
    const { stdout } = await runCommand("node", [
      "scripts/execute-build-request.mjs",
      "--no-publish",
      "--json",
    ]);
    const payload = JSON.parse(stdout);
    const implementationFilePaths = Array.isArray(payload?.implementationFiles)
      ? payload.implementationFiles.map((file) => file?.path || "")
      : [];
    const passed = Boolean(
      payload?.ok &&
        payload?.previewPath?.startsWith("artifacts/preview/codex-build/") &&
        payload?.contextPath?.startsWith("artifacts/preview/codex-build/") &&
        implementationFilePaths.some((path) =>
          path.endsWith("/implementation/index.html"),
        ) &&
        implementationFilePaths.some((path) =>
          path.endsWith("/implementation/styles.css"),
        ) &&
        implementationFilePaths.some((path) =>
          path.endsWith("/implementation/app.js"),
        ) &&
        implementationFilePaths.some((path) =>
          path.endsWith("/implementation/canvax-component-map.json"),
        ) &&
        implementationFilePaths.some((path) =>
          path.endsWith("/implementation/README.md"),
        ) &&
        implementationFilePaths.some((path) =>
          path.endsWith("/implementation/ACCEPTANCE.md"),
        ) &&
        payload?.published === false,
    );
    results.push({
      name: "build request local executor dry-run is valid",
      passed,
      detail: passed ? payload.previewPath : "invalid payload",
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      results.push({
        name: "build request local executor dry-run is valid",
        passed: true,
        skipped: true,
        detail: "no build request export present",
      });
      return;
    }
    results.push({
      name: "build request local executor dry-run is valid",
      passed: false,
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function validateExecuteRewriteRequestDryRun() {
  try {
    await readFile(rewriteRequestJsonPath, "utf8");
    const { stdout } = await runCommand("node", [
      "scripts/execute-rewrite-request.mjs",
      "--no-publish",
      "--json",
    ]);
    const payload = JSON.parse(stdout);
    const passed = Boolean(
      payload?.ok &&
        payload?.previewPath?.startsWith("artifacts/preview/codex-rewrite/") &&
        payload?.contextPath?.startsWith("artifacts/preview/codex-rewrite/") &&
        Number.isInteger(payload?.affectedRegionCount) &&
        Number.isInteger(payload?.componentTargetCount) &&
        payload?.published === false,
    );
    results.push({
      name: "rewrite request local executor dry-run is valid",
      passed,
      detail: passed ? payload.previewPath : "invalid payload",
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      results.push({
        name: "rewrite request local executor dry-run is valid",
        passed: true,
        skipped: true,
        detail: "no rewrite request export present",
      });
      return;
    }
    results.push({
      name: "rewrite request local executor dry-run is valid",
      passed: false,
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function validateSpatialWorkspaceWhenPresent(value) {
  if (!value) {
    return true;
  }
  return Boolean(
    value?.kind === "canvax-spatial-workspace" &&
      Number.isFinite(value?.zoom) &&
      value?.surface &&
      Number.isFinite(value.surface.width) &&
      Number.isFinite(value.surface.height) &&
      Array.isArray(value?.cards) &&
      Array.isArray(value?.objects || []) &&
      Array.isArray(value?.links),
  );
}

async function validateExternalDesignTokenExtractorDryRun() {
  try {
    const { stdout } = await runCommand("node", [
      "scripts/extract-design-tokens.mjs",
      "--text",
      '<main class="hero-shell" data-canvax-node-id="hero-1" data-canvax-node-type="hero"><nav><a href="#work">Work</a></nav><section class="hero card"><h1>Ship Better Screens</h1><button class="cta">Start building</button></section></main><style>:root{--brand:#e85d3a;--ink:rgb(20,32,48);font-family:Georgia,serif}.cta{color:#e85d3a;background:#f2b84b}</style>',
      "--dry-run",
      "--json",
    ]);
    const payload = JSON.parse(stdout);
    const pack = payload.tokenPack;
    const passed = Boolean(
      payload.dryRun &&
        pack?.kind === "canvax-external-design-tokens" &&
        pack.requiresOpenAiApiKey === false &&
        pack.palette?.some((entry) => entry.hex === "#e85d3a") &&
        pack.palette?.some((entry) => entry.hex === "#142030") &&
        pack.cssVariables?.some((entry) => entry.name === "--brand") &&
        pack.typography?.fontFamilies?.some((font) => /Georgia/.test(font)) &&
        pack.semanticStructure?.components?.some(
          (entry) => entry.type === "hero",
        ) &&
        pack.semanticStructure?.actions?.some(
          (action) => action.label === "Start building",
        ) &&
        pack.semanticStructure?.canvaxBindings?.some(
          (binding) => binding.id === "hero-1",
        ),
    );
    results.push({
      name: "external design token and semantic extractor dry-run is valid",
      passed,
      detail: passed
        ? `${pack.palette.length} colors, ${pack.semanticStructure.components.length} semantic components`
        : "extractor did not return expected token pack",
    });
  } catch (error) {
    results.push({
      name: "external design token and semantic extractor dry-run is valid",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function validateImageDesignTokenExtractorDryRun() {
  const fixtureRoot = resolve(projectRoot, ".canvax", "regression-token-fixture");
  const imagePath = resolve(fixtureRoot, "screenshot.bmp");
  try {
    await mkdir(fixtureRoot, { recursive: true });
    await writeFile(
      imagePath,
      buildBmpFixture(4, 4, [
        "#e85d3a",
        "#e85d3a",
        "#e85d3a",
        "#14323f",
        "#e85d3a",
        "#e85d3a",
        "#e85d3a",
        "#14323f",
        "#f2b84b",
        "#f2b84b",
        "#e85d3a",
        "#14323f",
        "#e85d3a",
        "#e85d3a",
        "#e85d3a",
        "#14323f",
      ]),
    );
    const { stdout } = await runCommand("node", [
      "scripts/extract-design-tokens.mjs",
      "--image",
      imagePath,
      "--dry-run",
      "--json",
    ]);
    const payload = JSON.parse(stdout);
    const pack = payload.tokenPack;
    const passed = Boolean(
      payload.dryRun &&
        pack?.kind === "canvax-external-design-tokens" &&
        pack.requiresOpenAiApiKey === false &&
        pack.source?.type === "image" &&
        pack.source?.imageSamples?.kind === "canvax-image-token-sample" &&
        pack.palette?.[0]?.hex === "#e85d3a" &&
        pack.usage?.imageSampleCount === 16,
    );
    results.push({
      name: "image design token extractor dry-run is valid",
      passed,
      detail: passed
        ? `${pack.palette.length} image colors`
        : "image extractor did not return expected token pack",
    });
  } catch (error) {
    results.push({
      name: "image design token extractor dry-run is valid",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function validateVisualSnapshotReviewDryRun() {
  const fixtureRoot = resolve(projectRoot, ".canvax", "regression-token-fixture");
  const imagePath = resolve(fixtureRoot, "visual-review.bmp");
  const palette = [
    "#171412",
    "#fff8ec",
    "#e85d3a",
    "#f2b84b",
    "#14323f",
    "#0c8d7b",
    "#f8e8d8",
    "#302828",
  ];
  const width = 100;
  const height = 80;
  try {
    await mkdir(fixtureRoot, { recursive: true });
    await writeFile(
      imagePath,
      buildBmpFixture(
        width,
        height,
        Array.from({ length: width * height }, (_, index) => {
          const x = index % width;
          const y = Math.floor(index / width);
          return palette[(x + y) % palette.length];
        }),
      ),
    );
    const { stdout } = await runCommand("node", [
      "scripts/review-visual-snapshot.mjs",
      "--image",
      imagePath,
      "--dry-run",
      "--json",
    ]);
    const payload = JSON.parse(stdout);
    const snapshot = payload.snapshots?.[0];
    const passed = Boolean(
      payload?.ok &&
        payload?.kind === "canvax-visual-snapshot-review" &&
        payload.requiresOpenAiApiKey === false &&
        ["pass", "review"].includes(payload.status) &&
        snapshot?.dimensions?.width === width &&
        snapshot?.dimensions?.height === height &&
        snapshot?.checks?.some((check) => check.id === "palette-variety") &&
        snapshot?.checks?.some((check) => check.id === "contrast-spread"),
    );
    results.push({
      name: "visual snapshot review dry-run is valid",
      passed,
      detail: passed
        ? `${payload.status} ${payload.score}/100`
        : "visual snapshot review did not inspect expected local image",
    });
  } catch (error) {
    results.push({
      name: "visual snapshot review dry-run is valid",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function validateDesignJuryReviewDryRun() {
  const fixtureRoot = resolve(projectRoot, ".canvax", "regression-token-fixture");
  const imagePath = resolve(fixtureRoot, "design-jury.bmp");
  const palette = [
    "#171412",
    "#fff8ec",
    "#e85d3a",
    "#f2b84b",
    "#14323f",
    "#0c8d7b",
    "#f8e8d8",
    "#302828",
  ];
  const width = 100;
  const height = 80;
  const html =
    '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>:root{--brand:#e85d3a}.hero{display:grid;transition:opacity .2s ease}.cta:focus-visible{outline:2px solid var(--brand)}@media (prefers-reduced-motion: reduce){.hero{transition:none}}@media (max-width: 720px){.hero{display:block}}</style></head><body><main data-canvax-node-id="hero-1"><section class="hero"><h1>Ship better screens</h1><img src="hero.png" alt="Hero preview"><button class="cta">Start</button><label for="email">Email</label><input id="email"></section></main></body></html>';
  try {
    await mkdir(fixtureRoot, { recursive: true });
    await writeFile(
      imagePath,
      buildBmpFixture(
        width,
        height,
        Array.from({ length: width * height }, (_, index) => {
          const x = index % width;
          const y = Math.floor(index / width);
          return palette[(x + y) % palette.length];
        }),
      ),
    );
    const { stdout } = await runCommand("node", [
      "scripts/review-design-jury.mjs",
      "--text",
      html,
      "--image",
      imagePath,
      "--skip-inspect",
      "--dry-run",
      "--json",
    ]);
    const payload = JSON.parse(stdout);
    const categoryIds = new Set(
      Array.isArray(payload?.categories)
        ? payload.categories.map((category) => category.id)
        : [],
    );
    const passed = Boolean(
      payload?.ok &&
        payload?.kind === "canvax-design-jury-review" &&
        payload.requiresOpenAiApiKey === false &&
        ["pass", "review"].includes(payload.status) &&
        payload.subreviews?.visualReview?.kind ===
          "canvax-visual-snapshot-review" &&
        payload.subreviews?.artifactReviews?.[0]?.kind ===
          "canvax-artifact-design-review" &&
        categoryIds.has("visual-hierarchy") &&
        categoryIds.has("accessibility-basics") &&
        categoryIds.has("tweak-targeting") &&
        categoryIds.has("production-readiness"),
    );
    results.push({
      name: "design jury review dry-run is valid",
      passed,
      detail: passed
        ? `${payload.status} ${payload.score}/100`
        : "design jury did not combine artifact and snapshot reviews",
    });
  } catch (error) {
    results.push({
      name: "design jury review dry-run is valid",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function validateDesignKitLibraryPackageDryRun() {
  try {
    const { stdout } = await runCommand("node", [
      "scripts/package-design-kits.mjs",
      "--query",
      "scythian",
      "--dry-run",
      "--json",
    ]);
    const payload = JSON.parse(stdout);
    const library = payload.library;
    const passed = Boolean(
      payload.dryRun &&
        library?.kind === "canvax-design-kit-library" &&
        library.requiresOpenAiApiKey === false &&
        library.source?.query === "scythian" &&
        library.kits?.length === 1 &&
        library.kits?.[0]?.id === "scythian-constructivist" &&
        library.kits?.[0]?.checksum &&
        library.integrity?.algorithm === "sha256",
    );
    results.push({
      name: "design kit library packager dry-run is valid",
      passed,
      detail: passed
        ? `${library.kits.length}/${library.source.totalKitCount} kits packaged`
        : "packager did not return expected design-kit library",
    });
  } catch (error) {
    results.push({
      name: "design kit library packager dry-run is valid",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function validateProjectLinkDryRun() {
  const fixtureRoot = resolve(projectRoot, ".canvax", "project-link-fixture");
  const routePath = resolve(fixtureRoot, "src", "app", "page.html");
  const componentPath = resolve(fixtureRoot, "src", "components", "Hero.jsx");
  const cssPath = resolve(fixtureRoot, "src", "styles.css");
  const patchTaskPath = resolve(fixtureRoot, "codex-patch-task.json");
  const generatedPatchTaskPath = resolve(
    fixtureRoot,
    "generated-codex-patch-task.json",
  );
  const patchTaskRelativePath =
    ".canvax/project-link-fixture/codex-patch-task.json";
  const generatedPatchTaskRelativePath =
    ".canvax/project-link-fixture/generated-codex-patch-task.json";
  try {
    await mkdir(dirname(routePath), { recursive: true });
    await mkdir(dirname(componentPath), { recursive: true });
    await writeFile(
      routePath,
      '<main class="hero-shell" data-canvax-node-id="fixture-hero"><h1>Linked production surface</h1><a href="#work">See work</a></main>',
    );
    await writeFile(
      componentPath,
      'export function Hero(){return <section data-canvax-node-id="fixture-card" className="hero-card"><button>Build</button></section>}',
    );
    await writeFile(
      cssPath,
      ":root{--brand:#e85d3a;--paper:#fff8ec}.hero-shell{color:#14323f;transition:transform .2s ease}",
    );
    const projectLinkArgs = [
      "scripts/link-project-target.mjs",
      "--target-root",
      fixtureRoot,
      "--frame",
      "frame-project-link",
      "--name",
      "Project link fixture",
      "--route",
      "src/app/page.html",
      "--component",
      "src/components/Hero.jsx",
      "--css",
      "src/styles.css",
    ];
    const { stdout } = await runCommand("node", [
      ...projectLinkArgs,
      "--dry-run",
      "--json",
    ]);
    const payload = JSON.parse(stdout);
    const savedResult = JSON.parse(
      (
        await runCommand("node", [
          ...projectLinkArgs,
          "--no-publish",
          "--json",
        ])
      ).stdout,
    );
    await writeFile(
      generatedPatchTaskPath,
      `${JSON.stringify(
        {
          kind: "canvax-codex-patch-task",
          schemaVersion: 1,
          requiresOpenAiApiKey: false,
          frameId: "frame-project-link",
          frameTitle: "Project link fixture",
          previewPath:
            "artifacts/preview/codex-rewrite/frames/frame-project-link/index.html",
          trigger: {
            id: "project-link-generated-task-tweak",
            note:
              "Move the linked hero card slightly right from a generated-output correction.",
          },
          affectedRegions: [
            {
              source: "preview-tweak",
              note:
                "Move the linked hero card slightly right from a generated-output correction.",
              componentTargetIds: ["fixture-card"],
            },
          ],
          componentTargets: [
            {
              id: "fixture-card",
              type: "card",
              label: "Linked hero card",
            },
          ],
          suggestedFiles: [
            {
              path:
                "artifacts/preview/codex-rewrite/frames/frame-project-link/codex-patch-task.json",
              role: "generated rewrite task",
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    const projectLinkExpandedPatch = JSON.parse(
      (
        await runCommand("node", [
          "scripts/execute-patch-task.mjs",
          "--task",
          generatedPatchTaskRelativePath,
          "--dry-run",
          "--no-publish",
          "--json",
        ])
      ).stdout,
    );
    await writeFile(
      patchTaskPath,
      `${JSON.stringify(
        {
          kind: "canvax-codex-patch-task",
          schemaVersion: 1,
          requiresOpenAiApiKey: false,
          frameId: "frame-project-link",
          frameTitle: "Project link fixture",
          previewPath: ".canvax/project-link-fixture/src/app/page.html",
          trigger: {
            id: "project-link-regression-tweak",
            note: "Move the linked hero card slightly right and tighten spacing.",
          },
          affectedRegions: [
            {
              source: "preview-tweak",
              note:
                "Move the linked hero card slightly right and tighten spacing.",
            },
          ],
          componentTargets: [
            {
              id: "fixture-hero",
              type: "hero",
              label: "Linked hero",
            },
            {
              id: "fixture-card",
              type: "card",
              label: "Linked hero card",
            },
          ],
          suggestedFiles: [
            ".canvax/project-link-fixture/src/app/page.html",
            ".canvax/project-link-fixture/src/components/Hero.jsx",
            ".canvax/project-link-fixture/src/styles.css",
          ],
        },
        null,
        2,
      )}\n`,
    );
    const patchResult = JSON.parse(
      (
        await runCommand("node", [
          "scripts/execute-patch-task.mjs",
          "--task",
          patchTaskRelativePath,
          "--no-publish",
          "--json",
        ])
      ).stdout,
    );
    const passed = Boolean(
      payload?.ok &&
        payload?.kind === "canvax-project-link" &&
        payload.requiresOpenAiApiKey === false &&
        payload.linkedFiles?.length === 3 &&
        payload.linkedFiles.some((file) =>
          file.summary?.bindings?.includes("fixture-hero"),
        ) &&
        payload.linkedFiles.some((file) =>
          file.summary?.customProperties?.includes("--brand"),
        ) &&
        payload.codexEditContract?.editableFiles?.length === 3 &&
        payload.manifest?.changes?.length === 3 &&
        payload.published === false &&
        savedResult?.saved === true &&
        savedResult?.published === false &&
        savedResult?.outputs?.projectLinkJson ===
          "exports/canvax-project-link-latest.json" &&
        projectLinkExpandedPatch?.ok === true &&
        projectLinkExpandedPatch?.projectLinkExpansion?.addedFiles?.some((file) =>
          file.endsWith("src/app/page.html"),
        ) &&
        projectLinkExpandedPatch.projectLinkExpansion?.matchedTargetIds?.includes(
          "fixture-card",
        ) &&
        projectLinkExpandedPatch.changedFiles?.some((file) =>
          file.path.endsWith("src/components/Hero.jsx"),
        ) &&
        patchResult?.ok === true &&
        patchResult?.changedFileCount >= 2 &&
        patchResult.changedFiles?.some((file) =>
          file.path.endsWith("src/app/page.html"),
        ) &&
        patchResult.changedFiles?.some((file) =>
          file.path.endsWith("src/components/Hero.jsx"),
        ),
    );
    results.push({
      name: "project link dry-run and saved manifest are valid",
      passed,
      detail: passed
        ? `${payload.linkedFiles.length} linked files, ${patchResult.changedFileCount} patched`
        : "invalid project link payload",
    });
  } catch (error) {
    results.push({
      name: "project link dry-run and saved manifest are valid",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function validateLiveEditSourceHintPatchDryRun() {
  const fixtureRoot = resolve(projectRoot, ".canvax", "source-hint-fixture");
  const componentPath = resolve(fixtureRoot, "src", "SourceHintHero.jsx");
  const cssPath = resolve(fixtureRoot, "src", "source-hint.css");
  const taskNotePath = resolve(fixtureRoot, "TASKS.md");
  const patchTaskPath = resolve(fixtureRoot, "codex-patch-task.json");
  const patchTaskRelativePath = ".canvax/source-hint-fixture/codex-patch-task.json";
  try {
    await mkdir(dirname(componentPath), { recursive: true });
    await writeFile(
      componentPath,
      'export function SourceHintHero(){return <section data-canvax-node-id="hint-cta" className="source-hint-card"><button>Book</button></section>}',
    );
    await writeFile(
      cssPath,
      ".source-hint-card{display:grid;gap:12px;transition:transform .2s ease}",
    );
    await writeFile(taskNotePath, "# Source Hint Tasks\n");
    await writeFile(
      patchTaskPath,
      `${JSON.stringify(
        {
          kind: "canvax-codex-patch-task",
          schemaVersion: 1,
          requiresOpenAiApiKey: false,
          frameId: "frame-source-hint",
          frameTitle: "Source hint Live Edit fixture",
          trigger: {
            kind: "canvax-live-edit-accepted-variant",
            id: "source-hint-live-edit",
            note:
              "Move the hinted CTA slightly right and tighten spacing from the accepted Live Edit.",
          },
          affectedRegions: [
            {
              source: "live-edit-accepted-variant",
              note:
                "Move the hinted CTA slightly right and tighten spacing from the accepted Live Edit.",
              componentTargetIds: ["hint-cta"],
            },
          ],
          componentTargets: [
            {
              id: "hint-cta",
              type: "button",
              label: "Hinted CTA",
              selector: '[data-canvax-node-id="hint-cta"]',
              sourceFile: ".canvax/source-hint-fixture/src/SourceHintHero.jsx",
              sourceComponent: "SourceHintHero",
              taskFile: ".canvax/source-hint-fixture/TASKS.md",
              taskId: "task-source-hint-live-edit",
            },
          ],
          suggestedFiles: [
            {
              path: ".canvax/source-hint-fixture/src/SourceHintHero.jsx",
              role: "picked target source",
              source: "accepted-live-edit-target",
            },
            {
              path: ".canvax/source-hint-fixture/src/source-hint.css",
              role: "component source hint",
              source: "component-target-source-hint",
            },
            {
              path: ".canvax/source-hint-fixture/TASKS.md",
              role: "picked target task",
              source: "accepted-live-edit-task",
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    const patchResult = JSON.parse(
      (
        await runCommand("node", [
          "scripts/execute-patch-task.mjs",
          "--task",
          patchTaskRelativePath,
          "--no-publish",
          "--json",
        ])
      ).stdout,
    );
    const rawComponent = await readFile(componentPath, "utf8");
    const rawCss = await readFile(cssPath, "utf8");
    const rawTaskNote = await readFile(taskNotePath, "utf8");
    const passed = Boolean(
      patchResult?.ok === true &&
        patchResult.sourceHintExpansion?.addedFiles?.some((file) =>
          file.endsWith("src/SourceHintHero.jsx"),
        ) &&
        patchResult.sourceHintExpansion?.addedFiles?.some((file) =>
          file.endsWith("TASKS.md"),
        ) &&
        patchResult.changedFiles?.some((file) =>
          file.path.endsWith("src/SourceHintHero.jsx"),
        ) &&
        patchResult.changedFiles?.some((file) =>
          file.path.endsWith("src/source-hint.css"),
        ) &&
        patchResult.changedFiles?.some((file) =>
          file.path.endsWith("TASKS.md"),
        ) &&
        rawComponent.includes('data-canvax-patch-state="applied"') &&
        rawComponent.includes('style={{ transform: "translate(5%, -3%)" }}') &&
        rawCss.includes("canvax-applied-patch-highlight") &&
        rawTaskNote.includes("canvax-live-edit:source-hint-live-edit"),
    );
    results.push({
      name: "Live Edit source-hinted patch task targets local source files",
      passed,
      detail: passed
        ? `${patchResult.changedFileCount} source-hinted files patched`
        : "source-hinted patch result did not update expected files",
    });
  } catch (error) {
    results.push({
      name: "Live Edit source-hinted patch task targets local source files",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function validateLiveEditUnhintedSourceSearchDryRun() {
  const fixtureRoot = resolve(projectRoot, ".canvax", "unhinted-source-fixture");
  const requestPath = resolve(fixtureRoot, "canvax-rewrite-request.json");
  const taskPackPath = resolve(fixtureRoot, "canvax-task-pack.json");
  const previewTweakPath = resolve(fixtureRoot, "canvax-preview-tweak.json");
  const frameId = "frame-unhinted-live-edit";
  const now = new Date().toISOString();
  const liveEditTarget = {
    kind: "canvax-live-edit-target",
    id: "live-edit-unhinted-hero-cta",
    sourceFrameId: frameId,
    sourceFrameTitle: "Unhinted preview pick",
    targetId: "hero-cta",
    targetNodeId: "hero-cta",
    targetLabel: "Hero CTA - Reserve suite",
    targetType: "preview-dom-element",
    targetSource: "canvax-unhinted-fixture",
    targetSelector: '[data-testid="hero-cta"]',
    targetTag: "button",
    targetText: "Reserve suite",
    targetHref: "/workspace/artifacts/preview/unhinted/index.html",
    targetPath: "artifacts/preview/unhinted/index.html",
    surface: "generated-output",
    bounds: { x: 0.28, y: 0.62, w: 0.18, h: 0.08 },
    note: "Make the Reserve suite button clearer and calmer.",
    status: "accepted",
    acceptedAt: now,
  };
  const originalSnapshot = {
    kind: "canvax-live-edit-original-snapshot",
    target: { ...liveEditTarget, status: "picked", acceptedAt: "" },
    normalizedBounds: liveEditTarget.bounds,
    outputTarget: {
      id: "hero-preview",
      label: "Hotel hero preview",
      type: "generated-screen-preview",
      source: "canvax-regression",
      path: "artifacts/preview/unhinted/index.html",
      href: "/workspace/artifacts/preview/unhinted/index.html",
      sourceFrameId: frameId,
      sourceFrameTitle: "Unhinted preview pick",
    },
    targetLabel: "Hero CTA - Reserve suite",
    targetText: "Reserve suite",
    surface: "generated-output",
    restoreInstruction:
      "Close or Escape removes temporary variants and leaves the original target/output binding unchanged.",
    capturedAt: now,
  };
  const acceptedVariant = {
    kind: "canvax-live-edit-variant",
    id: "live-edit-unhinted-clarity",
    index: 3,
    role: "clarity-accessibility",
    label: "Clarity",
    title: "Clarify the reservation CTA",
    body: "Improve the picked button copy, spacing, and contrast without changing surrounding layout.",
    summary: "Direct clarity pass for the Reserve suite CTA.",
    target: liveEditTarget,
    originalSnapshot,
    acceptedAt: now,
  };
  const frame = {
    id: frameId,
    title: "Unhinted preview pick",
    viewport: "desktop",
    viewportWidth: 1440,
    viewportHeight: 1024,
    updatedAt: now,
    liveEditTarget,
    liveEditVariants: [acceptedVariant],
    liveEditVariantIndex: 0,
    acceptedLiveEditVariant: acceptedVariant,
    liveEditOriginalSnapshot: originalSnapshot,
    liveEditPins: [
      {
        id: "pin-unhinted-cta",
        kind: "canvax-live-edit-comment-pin",
        text: "This is the button to clarify.",
        point: { x: 0.34, y: 0.66 },
        targetId: "hero-cta",
        targetLabel: "Hero CTA - Reserve suite",
        createdAt: now,
      },
    ],
    composition: {
      viewport: { width: 1440, height: 1024, label: "Desktop" },
      elements: [],
      liveEditCanvasMarks: [],
    },
  };
  try {
    await mkdir(fixtureRoot, { recursive: true });
    await writeFile(
      requestPath,
      `${JSON.stringify(
        {
          kind: "canvax-rewrite-request",
          schemaVersion: 1,
          requiresOpenAiApiKey: false,
          activeFrameId: frameId,
          activeFrameTitle: frame.title,
          rewriteQueue: [
            {
              frameId,
              priority: 1,
              label: "Unhinted Live Edit source search",
              reason: "accepted-live-edit",
            },
          ],
          frames: [frame],
          outputManifest: {
            kind: "canvax-codex-output",
            targets: [],
            artifacts: [],
          },
        },
        null,
        2,
      )}\n`,
    );
    await writeFile(
      taskPackPath,
      `${JSON.stringify(
        {
          kind: "canvax-task-pack",
          schemaVersion: 1,
          requiresOpenAiApiKey: false,
          activeFrameId: frameId,
          frames: [frame],
        },
        null,
        2,
      )}\n`,
    );
    await writeFile(previewTweakPath, "{}\n");
    const rewriteResult = JSON.parse(
      (
        await runCommand("node", [
          "scripts/execute-rewrite-request.mjs",
          "--request",
          ".canvax/unhinted-source-fixture/canvax-rewrite-request.json",
          "--task-pack",
          ".canvax/unhinted-source-fixture/canvax-task-pack.json",
          "--preview-tweak",
          ".canvax/unhinted-source-fixture/canvax-preview-tweak.json",
          "--no-publish",
          "--json",
        ])
      ).stdout,
    );
    const patchTask = JSON.parse(
      await readFile(resolve(projectRoot, rewriteResult.patchTaskPath), "utf8"),
    );
    const context = JSON.parse(
      await readFile(resolve(projectRoot, rewriteResult.contextPath), "utf8"),
    );
    const queries = (patchTask.sourceSearchHints || []).map((hint) => hint.query);
    const passed = Boolean(
      rewriteResult.ok === true &&
        patchTask.sourceDiscovery?.status === "needs-source-search" &&
        patchTask.sourceSearchHints?.some(
          (hint) =>
            hint.kind === "unhinted-live-edit-source-search" &&
            hint.searchType === "selector" &&
            hint.query.includes("data-testid"),
        ) &&
        queries.some((query) => query.includes("Reserve suite")) &&
        patchTask.affectedRegions?.some(
          (region) =>
            region.source === "live-edit-accepted-variant" &&
            region.liveEditOriginalSnapshot?.targetLabel?.includes("Hero CTA") &&
            region.sourceSearchHints?.length >= 2,
        ) &&
        patchTask.liveEditOriginalSnapshot?.outputTarget?.path ===
          "artifacts/preview/unhinted/index.html" &&
        context.codexPatchTask?.sourceDiscovery?.status === "needs-source-search",
    );
    results.push({
      name: "Live Edit unhinted picks emit source-search hints",
      passed,
      detail: passed
        ? `${patchTask.sourceSearchHints.length} search hints for ${liveEditTarget.targetId}`
        : "unhinted Live Edit patch task did not include expected source-search hints",
    });
  } catch (error) {
    results.push({
      name: "Live Edit unhinted picks emit source-search hints",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function validateLiveEditSourceDiscoveryDryRun() {
  const fixtureRoot = resolve(projectRoot, ".canvax", "source-discovery-fixture");
  const sourcePath = resolve(fixtureRoot, "src", "HotelCta.jsx");
  const patchTaskPath = resolve(fixtureRoot, "codex-patch-task.json");
  const resultRoot = ".canvax/source-discovery-fixture/result";
  const targetId = "source-discovery-live-edit-cta";
  try {
    await mkdir(dirname(sourcePath), { recursive: true });
    await writeFile(
      sourcePath,
      `export function HotelCta(){return <button data-testid="${targetId}" data-canvax-node-id="${targetId}">Reserve suite source discovery target</button>}`,
    );
    await writeFile(
      patchTaskPath,
      `${JSON.stringify(
        {
          kind: "canvax-codex-patch-task",
          schemaVersion: 1,
          requiresOpenAiApiKey: false,
          frameId: "frame-source-discovery",
          frameTitle: "Source discovery Live Edit fixture",
          trigger: {
            kind: "canvax-live-edit-accepted-variant",
            id: "source-discovery-live-edit",
            note:
              "Clarify the source discovery CTA from the accepted Live Edit.",
          },
          liveEdit: {
            target: {
              targetId,
              targetNodeId: targetId,
              targetLabel: "Source discovery CTA",
              targetType: "preview-dom-element",
              targetSelector: `[data-testid="${targetId}"]`,
              targetText: "Reserve suite source discovery target",
            },
          },
          componentTargets: [
            {
              id: targetId,
              type: "button",
              label: "Source discovery CTA",
              selector: `[data-testid="${targetId}"]`,
            },
          ],
          affectedRegions: [
            {
              source: "live-edit-accepted-variant",
              note:
                "Clarify the source discovery CTA from the accepted Live Edit.",
              componentTargetIds: [targetId],
            },
          ],
          suggestedFiles: [],
          sourceDiscovery: {
            kind: "canvax-live-edit-source-discovery",
            status: "needs-source-search",
            targetId,
            targetType: "preview-dom-element",
          },
          sourceSearchHints: [
            {
              kind: "unhinted-live-edit-source-search",
              searchType: "selector",
              query: `[data-testid="${targetId}"]`,
              confidence: "high",
              targetId,
            },
            {
              kind: "unhinted-live-edit-source-search",
              searchType: "node-id",
              query: targetId,
              confidence: "high",
              targetId,
            },
            {
              kind: "unhinted-live-edit-source-search",
              searchType: "visible-text",
              query: "Reserve suite source discovery target",
              confidence: "medium",
              targetId,
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    const payload = JSON.parse(
      (
        await runCommand("node", [
          "scripts/execute-patch-task.mjs",
          "--task",
          ".canvax/source-discovery-fixture/codex-patch-task.json",
          "--result-root",
          resultRoot,
          "--no-publish",
          "--json",
        ])
      ).stdout,
    );
    const result = JSON.parse(
      await readFile(resolve(projectRoot, resultRoot, "result.json"), "utf8"),
    );
    const candidates = payload.sourceDiscovery?.candidates || [];
    const passed = Boolean(
      payload?.ok === true &&
        payload.status === "source-discovered" &&
        payload.changedFileCount === 0 &&
        payload.sourceDiscovered === true &&
        payload.sourceDiscoveryCandidateCount >= 1 &&
        payload.sourceDiscovery?.kind ===
          "canvax-live-edit-source-discovery-result" &&
        payload.sourceDiscovery?.status === "candidates-found" &&
        candidates.some(
          (candidate) =>
            candidate.path.endsWith("src/HotelCta.jsx") &&
            candidate.matches?.some((match) => match.searchType === "selector"),
        ) &&
        result.status === "source-discovered" &&
        result.sourceDiscovered === true &&
        result.sourceDiscoveryCandidateCount >= 1 &&
        result.sourceDiscovery?.candidateCount >= 1 &&
        result.sourceDiscovery?.nextAction?.includes("explicit source hints"),
    );
    results.push({
      name: "Live Edit source discovery finds unhinted local targets",
      passed,
      detail: passed
        ? `${payload.sourceDiscovery.candidateCount} candidates from ${payload.sourceDiscovery.hintCount} hints`
        : "source discovery did not identify the fixture target",
    });
  } catch (error) {
    results.push({
      name: "Live Edit source discovery finds unhinted local targets",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function validateLiveEditPreviewManifestBindingDryRun() {
  let previousManifestRaw = null;
  try {
    previousManifestRaw = await readFile(previewManifestPath, "utf8");
  } catch {
    previousManifestRaw = null;
  }
  const frameId = "frame-live-edit-manifest";
  const liveEditTarget = {
    kind: "canvax-live-edit-target",
    targetId: "manifest-hero-cta",
    targetNodeId: "manifest-hero-cta",
    targetLabel: "Manifest Hero CTA",
    targetType: "preview-dom-element",
    targetSelector: '[data-testid="manifest-hero-cta"]',
    targetText: "Reserve suite",
    targetPath: "artifacts/preview/manifest-live-edit/index.html",
    sourceFrameId: frameId,
    bounds: { x: 0.24, y: 0.58, w: 0.2, h: 0.08 },
    status: "accepted",
  };
  const acceptedVariant = {
    kind: "canvax-live-edit-variant",
    id: "manifest-live-edit-clarity",
    index: 3,
    label: "Clarity",
    role: "clarity-accessibility",
    summary: "Clarify the selected CTA without redesigning the page.",
    target: liveEditTarget,
  };
  const originalSnapshot = {
    kind: "canvax-live-edit-original-snapshot",
    target: liveEditTarget,
    normalizedBounds: liveEditTarget.bounds,
    restoreInstruction:
      "Discard restores this exact selected target without stale variant state.",
  };
  const liveEditRequest = {
    kind: "canvax-live-edit-request",
    status: "accepted",
    target: liveEditTarget,
    acceptedVariant,
    originalSnapshot,
  };
  const liveEditBinding = {
    kind: "canvax-live-edit-manifest-binding",
    status: "accepted",
    target: liveEditTarget,
    acceptedVariant,
    originalSnapshot,
    request: liveEditRequest,
    sourceBinding: {
      kind: "canvax-live-edit-source-binding",
      status: "needs-source-search",
      sourceSearchHints: [
        {
          kind: "live-edit-manifest-source-search-seed",
          searchType: "selector",
          query: liveEditTarget.targetSelector,
        },
      ],
    },
    writeback: {
      kind: "canvax-live-edit-writeback",
      status: "task-written",
      patchTaskPath: "artifacts/preview/manifest-live-edit/codex-patch-task.json",
    },
  };
  try {
    await runCommand("node", [
      "scripts/write-preview-manifest.mjs",
      "--preview-path",
      liveEditTarget.targetPath,
      "--label",
      "Manifest Live Edit preview",
      "--source",
      "canvax-live-edit-regression",
      "--type",
      "preview-dom-element",
      "--frame",
      frameId,
      "--live-edit-binding",
      JSON.stringify(liveEditBinding),
      "--live-edit-target",
      JSON.stringify(liveEditTarget),
      "--accepted-live-edit-variant",
      JSON.stringify(acceptedVariant),
      "--live-edit-original-snapshot",
      JSON.stringify(originalSnapshot),
      "--live-edit-request",
      JSON.stringify(liveEditRequest),
    ]);
    const manifest = JSON.parse(await readFile(previewManifestPath, "utf8"));
    const target = manifest.targets?.[0];
    const passed = Boolean(
      target?.liveEditBinding?.kind === "canvax-live-edit-manifest-binding" &&
        target.liveEditBinding.acceptedVariant?.label === "Clarity" &&
        target.liveEditBinding.originalSnapshot?.restoreInstruction?.includes(
          "Discard restores",
        ) &&
        target.liveEditBinding.sourceBinding?.status ===
          "needs-source-search" &&
        target.liveEditBinding.writeback?.patchTaskPath?.endsWith(
          "codex-patch-task.json",
        ) &&
        target.liveEditTarget?.targetSelector ===
          '[data-testid="manifest-hero-cta"]' &&
        target.acceptedLiveEditVariant?.role === "clarity-accessibility" &&
        target.liveEditOriginalSnapshot?.normalizedBounds?.w === 0.2 &&
        target.liveEditRequest?.kind === "canvax-live-edit-request",
    );
    results.push({
      name: "Live Edit preview manifest binding preserves accept metadata",
      passed,
      detail: passed
        ? `${target.liveEditBinding.sourceBinding.status} for ${target.liveEditTarget.targetId}`
        : "manifest did not preserve rich Live Edit accept metadata",
    });
  } catch (error) {
    results.push({
      name: "Live Edit preview manifest binding preserves accept metadata",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (previousManifestRaw !== null) {
      await writeFile(previewManifestPath, previousManifestRaw);
    } else {
      try {
        await unlink(previewManifestPath);
      } catch {
        // Ignore a missing regression manifest.
      }
    }
  }
}

async function validateArtifactReviewDryRun() {
  try {
    const { stdout } = await runCommand("node", [
      "scripts/review-artifact.mjs",
      "--text",
      '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>.hero{display:grid}.cta:focus-visible{outline:2px solid #e85d3a}@media (max-width: 720px){.hero{display:block}}</style></head><body><main data-canvax-node-id="hero-1"><nav><a href="#work">Work</a></nav><section class="hero"><h1>Ship better screens</h1><img src="hero.png" alt="Hero preview"><button class="cta">Start</button><label for="email">Email</label><input id="email"></section></main></body></html>',
      "--dry-run",
      "--json",
    ]);
    const payload = JSON.parse(stdout);
    const review = payload.review;
    const passed = Boolean(
      payload.dryRun &&
        review?.kind === "canvax-artifact-design-review" &&
        review.requiresOpenAiApiKey === false &&
        review.status === "pass" &&
        review.checks?.some(
          (check) => check.id === "canvax-bindings" && check.level === "pass",
        ) &&
        review.checks?.some(
          (check) => check.id === "focus-styles" && check.level === "pass",
        ),
    );
    results.push({
      name: "artifact design review dry-run is valid",
      passed,
      detail: passed
        ? `${review.status} ${review.score}/100`
        : "artifact review did not return expected checks",
    });
  } catch (error) {
    results.push({
      name: "artifact design review dry-run is valid",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function validateDesignTokenEnforcementDryRun() {
  const fixtureRoot = resolve(
    projectRoot,
    ".canvax",
    "regression-token-fixture",
    "implementation",
  );
  const productionRoot = resolve(
    projectRoot,
    ".canvax",
    "regression-token-fixture",
    "production",
  );
  const contractPath = resolve(fixtureRoot, "canvax-build-contract.json");
  const cssPath = resolve(fixtureRoot, "styles.css");
  const productionPath = resolve(productionRoot, "Home.jsx");
  const manifestPath = resolve(
    projectRoot,
    ".canvax",
    "regression-token-fixture",
    "codex-output.json",
  );
  try {
    await mkdir(fixtureRoot, { recursive: true });
    await mkdir(productionRoot, { recursive: true });
    await writeFile(
      contractPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          kind: "canvax-build-integration-contract",
          requiresOpenAiApiKey: false,
          visualDirection: {
            designTokens: {
              palette: ["#e85d3a", "#14323f", "#f2b84b"],
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await writeFile(
      cssPath,
      `:root{--red:#e85d3a;--ink:#14323f;--gold:#f2b84b;}`,
      "utf8",
    );
    await writeFile(
      productionPath,
      `export function Home(){return <main style={{"--red":"#e85d3a","--ink":"#14323f","--gold":"#f2b84b"}} />}`,
      "utf8",
    );
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          version: 1,
          changes: [
            {
              id: "change-1",
              path: productionPath,
              frameIds: ["frame-token-fixture"],
            },
          ],
          artifacts: [],
          targets: [],
        },
        null,
        2,
      ),
      "utf8",
    );
    const { stdout } = await runCommand("node", [
      "scripts/verify-token-enforcement.mjs",
      "--contract",
      contractPath,
      "--css",
      cssPath,
      "--json",
    ]);
    const payload = JSON.parse(stdout);
    const passed = Boolean(
      payload?.ok &&
        payload?.kind === "canvax-token-enforcement-verification" &&
        payload.requiresOpenAiApiKey === false &&
        payload.requiredPalette?.length === 3 &&
        payload.matchedPalette?.length === 3 &&
        payload.missingPalette?.length === 0,
    );
    results.push({
      name: "design token enforcement verifier dry-run is valid",
      passed,
      detail: passed
        ? `${payload.matchedPalette.length} token colors matched`
        : "verifier did not match expected token palette",
    });
    const { stdout: productionStdout } = await runCommand("node", [
      "scripts/verify-token-enforcement.mjs",
      "--contract",
      contractPath,
      "--manifest",
      manifestPath,
      "--frame",
      "frame-token-fixture",
      "--json",
    ]);
    const productionPayload = JSON.parse(productionStdout);
    const productionPassed = Boolean(
      productionPayload?.ok &&
        productionPayload?.manifestPath?.endsWith("codex-output.json") &&
        productionPayload.checkedFiles?.some((path) =>
          path.endsWith("production/Home.jsx"),
        ) &&
        productionPayload.matchedPalette?.length === 3,
    );
    results.push({
      name: "design token production manifest verifier dry-run is valid",
      passed: productionPassed,
      detail: productionPassed
        ? `${productionPayload.checkedFiles.length} production files checked`
        : "manifest verifier did not inspect the expected production file",
    });
  } catch (error) {
    results.push({
      name: "design token enforcement verifier dry-run is valid",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
    results.push({
      name: "design token production manifest verifier dry-run is valid",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function validateProductionPortProofDryRun() {
  try {
    const { stdout } = await runCommand("node", [
      "scripts/production-port-proof.mjs",
      "--dry-run",
      "--json",
    ]);
    const payload = JSON.parse(stdout);
    const passed = Boolean(
      payload?.ok &&
        payload?.kind === "canvax-production-port-proof" &&
        payload.requiresOpenAiApiKey === false &&
        payload.dryRun === true &&
        payload.tokenVerification?.ok &&
        payload.tokenVerification?.checkedFiles?.some((path) =>
          path.endsWith("canvax-proof.html"),
        ) &&
        payload.tokenVerification?.checkedFiles?.some((path) =>
          path.endsWith("canvax-proof.css"),
        ) &&
        payload.tokenVerification?.checkedFiles?.some((path) =>
          path.endsWith("CanvaxProof.jsx"),
        ) &&
        ["pass", "review"].includes(payload.artifactReview?.status) &&
        payload.manifest?.changes?.length >= 3,
    );
    results.push({
      name: "production port proof dry-run is valid",
      passed,
      detail: passed
        ? `${payload.implementationFiles.length} implementation files checked`
        : "production proof did not validate expected manifest-bound files",
    });
  } catch (error) {
    results.push({
      name: "production port proof dry-run is valid",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function validateCanvaxInspectDryRun() {
  try {
    const { stdout } = await runCommand("node", [
      "scripts/canvax-inspect.mjs",
      "all",
      "--json",
    ]);
    const payload = JSON.parse(stdout);
    const passed = Boolean(
      payload?.ok &&
        payload?.kind === "canvax-readonly-inspection" &&
        payload.requiresOpenAiApiKey === false &&
        payload.toolSurface?.status === "local-readonly-cli" &&
        payload.toolSurface?.futureMcpTools?.includes("get_current_frame") &&
        payload.toolSurface?.futureMcpTools?.includes("get_host_handoff") &&
        payload.toolSurface?.futureMcpTools?.includes("create_task_pack") &&
        payload.toolSurface?.futureMcpTools?.includes(
          "create_image_prompt_pack",
        ) &&
        payload.toolSurface?.futureMcpTools?.includes("get_spatial_workspace") &&
        payload.toolSurface?.futureMcpTools?.includes("get_design_kit") &&
        payload.toolSurface?.futureMcpTools?.includes("get_output_binding") &&
        payload.toolSurface?.futureMcpTools?.includes("get_project_link") &&
        payload.payload?.spatialWorkspace?.summary &&
        Object.hasOwn(payload.payload, "outputBinding") &&
        Object.hasOwn(payload.payload, "projectLink"),
    );
    results.push({
      name: "Canvax read-only inspection bridge is valid",
      passed,
      detail: passed
        ? `${payload.summary.frameCount} frames, ${payload.summary.outputBindingCount} output records`
        : "inspect command did not return expected read-only bridge payload",
    });
  } catch (error) {
    results.push({
      name: "Canvax read-only inspection bridge is valid",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function validateCanvaxHostHandoffDryRun() {
  try {
    const { stdout } = await runCommand("node", [
      "scripts/canvax-inspect.mjs",
      "host-handoff",
      "--json",
      "--save",
    ]);
    const payload = JSON.parse(stdout);
    const handoff = payload?.payload?.hostHandoff;
    const savedHostHandoff = await readOptionalJson(hostHandoffPath);
    const passed = Boolean(
      payload?.ok &&
        payload?.kind === "canvax-readonly-inspection" &&
        handoff?.kind === "canvax-host-handoff" &&
        handoff.requiresOpenAiApiKey === false &&
        handoff.sourceFiles?.live?.path === "exports/canvax-live-latest.json" &&
        handoff.frame?.id &&
        handoff.sketch &&
        handoff.voice &&
        handoff.rewrite &&
        handoff.output &&
        handoff.projectLink &&
        Array.isArray(handoff.nextActions) &&
        handoff.nextActions.some((action) => action.id === "publish-output") &&
        payload.saved?.jsonPath === "exports/canvax-host-handoff-latest.json" &&
        savedHostHandoff?.kind === "canvax-host-handoff",
    );
    results.push({
      name: "Canvax host handoff packet is valid",
      passed,
      detail: passed
        ? `${handoff.frame.id}, ${handoff.nextActions.length} next actions`
        : "host handoff did not include the expected sketch/voice/output packet",
    });
  } catch (error) {
    results.push({
      name: "Canvax host handoff packet is valid",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function validateCanvaxTaskPackHandoffsDryRun() {
  try {
    const taskPackPayload = JSON.parse(
      (
        await runCommand("node", [
          "scripts/canvax-inspect.mjs",
          "task-pack",
          "--json",
        ])
      ).stdout,
    );
    const imagePromptPayload = JSON.parse(
      (
        await runCommand("node", [
          "scripts/canvax-inspect.mjs",
          "image-prompt-pack",
          "--json",
        ])
      ).stdout,
    );
    const taskPack = taskPackPayload?.payload?.taskPackHandoff;
    const imagePrompt = imagePromptPayload?.payload?.imagePromptHandoff;
    const passed = Boolean(
      taskPackPayload?.ok &&
        imagePromptPayload?.ok &&
        taskPack?.kind === "canvax-host-task-pack" &&
        taskPack.requiresOpenAiApiKey === false &&
        taskPack.sourceFiles?.taskPack?.path ===
          "exports/canvax-task-pack-latest.json" &&
        Array.isArray(taskPack.frames) &&
        Array.isArray(taskPack.nextActions) &&
        imagePrompt?.kind === "canvax-host-image-prompt-pack" &&
        imagePrompt.requiresOpenAiApiKey === false &&
        imagePrompt.sourceFiles?.imagePromptPack?.path ===
          "exports/canvax-image-prompt-pack-latest.json" &&
        Array.isArray(imagePrompt.frames) &&
        Array.isArray(imagePrompt.nextActions),
    );
    results.push({
      name: "Canvax task and image prompt host handoffs are valid",
      passed,
      detail: passed
        ? `${taskPack.selectedFrameCount} task frames, ${imagePrompt.selectedFrameCount} image frames`
        : "task/image prompt host handoffs did not include expected payloads",
    });
  } catch (error) {
    results.push({
      name: "Canvax task and image prompt host handoffs are valid",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function validateCanvaxMcpSelfTest() {
  try {
    const { stdout } = await runCommand("node", [
      "scripts/canvax-mcp-server.mjs",
      "--self-test",
    ]);
    const payload = JSON.parse(stdout);
    const passed = Boolean(
      payload?.ok &&
        payload?.kind === "canvax-mcp-self-test" &&
        payload.requiresOpenAiApiKey === false &&
        payload.toolCount >= 13 &&
        payload.summaryKind === "canvax-readonly-inspection" &&
        payload.hostKind === "canvax-host-handoff" &&
        payload.taskPackKind === "canvax-host-task-pack" &&
        payload.imagePromptKind === "canvax-host-image-prompt-pack" &&
        payload.transcriptMutation === "append-transcript" &&
        payload.publishMutation === "publish-codex-output" &&
        payload.attachKind === "canvax-image-results",
    );
    results.push({
      name: "Canvax MCP server self-test is valid",
      passed,
      detail: passed
        ? `${payload.toolCount} tools`
        : "MCP server did not expose expected Canvax tools",
    });
  } catch (error) {
    results.push({
      name: "Canvax MCP server self-test is valid",
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function validateRunningPreviewState() {
  try {
    const { stdout } = await runCommand("node", [
      "scripts/canvax.mjs",
      "--status",
      "--json",
    ]);
    const status = JSON.parse(stdout);
    const serviceState = await detectCanvaxServiceState();
    const liveUrl =
      status?.running && typeof status.url === "string" && status.url
        ? status.url
        : serviceState.url;
    if (!liveUrl) {
      results.push({
        name: "status payload identifies current Canvax runtime",
        passed: true,
        skipped: true,
        detail: serviceState.detail,
      });
      results.push({
        name: "preview-state payload is valid when the Canvax service is running",
        passed: true,
        skipped: true,
        detail: serviceState.detail,
      });
      return;
    }

    const { stdout: statusRaw } = await runCommand(curlBinary, [
      "-s",
      `${liveUrl}/api/status`,
    ]);
    const statusPayload = JSON.parse(statusRaw);
    const statusPassed = Boolean(
      Number.isInteger(statusPayload?.pid) &&
        statusPayload.pid > 0 &&
        statusPayload.projectRoot === projectRoot &&
        statusPayload.runtimePath === resolve(projectRoot, ".canvax", "runtime.json") &&
        statusPayload.url === liveUrl &&
        statusPayload.hostCapabilities?.requiresOpenAiApiKey === false &&
        statusPayload.transport?.mode === "local-companion",
    );
    results.push({
      name: "status payload identifies current Canvax runtime",
      passed: statusPassed,
      detail: statusPassed
        ? `${liveUrl} pid ${statusPayload.pid}`
        : "invalid status payload",
    });

    const { stdout: previewStateRaw } = await runCommand(curlBinary, [
      "-s",
      `${liveUrl}/api/preview-state`,
    ]);
    const payload = JSON.parse(previewStateRaw);
    const workspaceFollow = payload?.workspaceFollow;
    const outputDigest = payload?.outputDigest;
    const sessionEvents = Array.isArray(payload?.sessionEvents)
      ? payload.sessionEvents
      : [];
    const changes = Array.isArray(payload?.previewManifest?.changes)
      ? payload.previewManifest.changes
      : [];
    const liveProjectId =
      typeof payload?.liveExport?.project?.id === "string"
        ? payload.liveExport.project.id
        : "";
    const checkpointProjectId =
      typeof payload?.checkpointHistory?.project?.id === "string"
        ? payload.checkpointHistory.project.id
        : "";
    const previewManifestProjectId =
      typeof payload?.previewManifest?.project?.id === "string"
        ? payload.previewManifest.project.id
        : "";
    const projectScopePassed = Boolean(
      !liveProjectId ||
        ((checkpointProjectId === liveProjectId ||
          payload?.checkpointHistory === null) &&
          (!payload?.previewManifest ||
            !previewManifestProjectId ||
            previewManifestProjectId === liveProjectId)),
    );
    const changeIds = changes
      .map((entry) =>
        entry && typeof entry === "object" ? String(entry.id || "") : "",
      )
      .filter(Boolean);
    const passed = Boolean(
      typeof payload?.updatedAt === "string" &&
      payload?.transport &&
      typeof payload.transport === "object" &&
      payload.transport.mode === "local-companion" &&
      payload.transport.future?.mode === "app-server" &&
      (payload.previewManifest === null ||
        typeof payload.previewManifest === "object") &&
      workspaceFollow &&
      typeof workspaceFollow === "object" &&
      typeof workspaceFollow.source === "string" &&
      Number.isInteger(workspaceFollow.changeCount) &&
      outputDigest &&
      typeof outputDigest === "object" &&
      typeof outputDigest.digest === "string" &&
      typeof outputDigest.summary === "string" &&
      sessionEvents.every(
        (event) =>
          event &&
          typeof event === "object" &&
          typeof event.type === "string" &&
          typeof event.id === "string",
      ) &&
      projectScopePassed &&
      changeIds.length === new Set(changeIds).size,
    );
    results.push({
      name: "preview-state payload is valid when the Canvax service is running",
      passed,
      detail: passed
        ? `${liveUrl} (${changeIds.length} unique changes, project ${liveProjectId || "global"})`
        : "invalid preview-state payload",
    });

    const tweakResponse = await fetch(`${liveUrl}/api/save-preview-tweak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tweak: {
          frameId: "frame-regression",
          frameTitle: "Regression frame",
          compareMode: "output",
          viewportLabel: "Desktop",
          viewportWidth: 1440,
          viewportHeight: 1024,
          target: {
            id: "target-regression",
            label: "Regression preview target",
            type: "implementation-preview",
            previewPath: "artifacts/preview/regression/index.html",
          },
          region: {
            normalized: { x: 0.1, y: 0.2, width: 0.3, height: 0.25 },
            pixel: { x: 144, y: 205, width: 432, height: 256 },
          },
          note: "Regression tweak request.",
        },
      }),
    });
    const tweakPayload = await tweakResponse.json();
    const tweakPassed = Boolean(
      tweakResponse.ok &&
        tweakPayload?.tweak?.kind === "canvax-preview-tweak-request" &&
        tweakPayload.tweak.requiresOpenAiApiKey === false &&
        tweakPayload.tweak.region?.normalized?.width === 0.3 &&
        tweakPayload.tweak.target?.previewPath ===
          "artifacts/preview/regression/index.html" &&
        typeof tweakPayload.tweakPath === "string",
    );
    results.push({
      name: "preview tweak endpoint writes no-API region request",
      passed: tweakPassed,
      detail: tweakPassed
        ? tweakPayload.tweakPath
        : "invalid preview tweak payload",
    });
  } catch (error) {
    results.push({
      name: "preview-state payload is valid when the Canvax service is running",
      passed: false,
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function validateAssetCandidatesEndpoint() {
  try {
    const { stdout } = await runCommand("node", [
      "scripts/canvax.mjs",
      "--status",
      "--json",
    ]);
    const status = JSON.parse(stdout);
    const serviceState = await detectCanvaxServiceState();
    const liveUrl =
      status?.running && typeof status.url === "string" && status.url
        ? status.url
        : serviceState.url;
    if (!liveUrl) {
      results.push({
        name: "asset candidates endpoint writes no-API artifact",
        passed: true,
        skipped: true,
        detail: serviceState.detail,
      });
      return;
    }

    const samplePack = {
      schemaVersion: 1,
      kind: "canvax-asset-candidates",
      createdAt: new Date().toISOString(),
      requiresOpenAiApiKey: false,
      project: {
        kind: "canvax-project",
        id: "project-regression-assets",
        title: "Regression assets project",
      },
      board: {
        project: "Canvax regression",
      },
      candidates: [
        {
          id: "asset-regression-frame",
          type: "frame-composite",
          status: "prompt-ready",
          sourceFrameId: "frame-regression",
          sourceFrameTitle: "Regression frame",
          title: "Regression image candidate",
          prompt: "Validate Canvax asset candidate persistence.",
          negativePrompt: "No paid API call.",
          bounds: null,
          placement: "whole frame",
          aspectRatio: "16:9",
          outputSlots: [
            {
              label: "Generated image",
              imagePath: "",
              accepted: false,
              notes: "Regression placeholder.",
            },
          ],
        },
      ],
    };
    const response = await fetch(`${liveUrl}/api/save-asset-candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pack: samplePack,
        markdown: "# Regression asset candidates\n",
      }),
    });
    const payload = await response.json();
    const passed = Boolean(
      response.ok &&
        payload?.assetCandidatePack?.kind === "canvax-asset-candidates" &&
        payload.assetCandidatePack.requiresOpenAiApiKey === false &&
        payload.assetCandidatePack.project?.id ===
          "project-regression-assets" &&
        payload.candidateCount === 1 &&
        payload.assetCandidatePack.candidates?.[0]?.placementMap?.kind ===
          "canvax-asset-placement" &&
        payload.assetCandidatePack.candidates?.[0]?.outputSlots?.[0]
          ?.targetSelector &&
        payload.assetCandidatePack.reviewSummary?.kind ===
          "canvax-asset-candidate-review" &&
        Array.isArray(payload.assetCandidatePack.reviewSummary.groups) &&
        payload.assetCandidatePack.reviewSummary.hostHandoff
          ?.requiresOpenAiApiKey === false &&
        payload.imageGenerationBrief?.kind ===
          "canvax-image-generation-brief" &&
        payload.imageGenerationBrief.requiresOpenAiApiKey === false &&
        payload.imageGenerationBrief.project?.id ===
          "project-regression-assets" &&
        payload.imageGenerationBrief.copyBlocks?.[0]?.hostPrompt &&
        payload.imageGenerationBrief.reviewSummary?.kind ===
          "canvax-asset-candidate-review" &&
        payload.imageHostTask?.kind === "canvax-image-host-task" &&
        payload.imageHostTask.requiresOpenAiApiKey === false &&
        payload.imageHostTask.project?.id === "project-regression-assets" &&
        payload.imageHostTask.tasks?.[0]?.hostPrompt &&
        payload.imageHostTask.tasks?.[0]?.outputSlot?.slotId &&
        payload.imageHostTask.noApiBoundary?.canCanvaxCallImageApi === false &&
        typeof payload.latestImageHostTaskJsonPath === "string" &&
        typeof payload.latestImageGenerationBriefJsonPath === "string" &&
        typeof payload.latestJsonPath === "string" &&
        payload.projectJsonPath ===
          "exports/projects/project-regression-assets/canvax-asset-candidates-latest.json" &&
        payload.projectImageGenerationBriefJsonPath ===
          "exports/projects/project-regression-assets/canvax-image-generation-brief-latest.json" &&
        payload.projectImageHostTaskJsonPath ===
          "exports/projects/project-regression-assets/canvax-image-host-task-latest.json",
    );
    results.push({
      name: "asset candidates endpoint writes no-API artifact",
      passed,
      detail: passed ? payload.latestJsonPath : "invalid asset response",
    });
  } catch (error) {
    results.push({
      name: "asset candidates endpoint writes no-API artifact",
      passed: false,
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function validateImageResultImportDryRun() {
  try {
    const { stdout } = await runCommand("node", [
      "scripts/import-image-results.mjs",
      "--candidate",
      "asset-regression-frame",
      "--slot",
      "asset-regression-frame-slot-1",
      "--image",
      "docs/assets/canvax-logo.svg",
      "--dry-run",
      "--json",
    ]);
    const payload = JSON.parse(stdout);
    const result = payload.results?.[0];
    const passed = Boolean(
      payload?.kind === "canvax-image-results" &&
        payload.requiresOpenAiApiKey === false &&
        payload.noApiBoundary?.canCanvaxCallImageApi === false &&
        payload.returnContract?.requiredBindingFields?.includes("imagePath") &&
        result?.kind === "canvax-image-result" &&
        result.candidateId === "asset-regression-frame" &&
        result.slotId === "asset-regression-frame-slot-1" &&
        result.outputSlot?.imagePath === "docs/assets/canvax-logo.svg" &&
        payload.candidateUpdate?.skipped === "dry-run",
    );
    results.push({
      name: "image result import dry-run stays no-API",
      passed,
      detail: passed
        ? "scripts/import-image-results.mjs"
        : "invalid image result import output",
    });
  } catch (error) {
    results.push({
      name: "image result import dry-run stays no-API",
      passed: false,
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function validateProjectScopedBuildAndCheckpointEndpoints() {
  try {
    const { stdout } = await runCommand("node", [
      "scripts/canvax.mjs",
      "--status",
      "--json",
    ]);
    const status = JSON.parse(stdout);
    const serviceState = await detectCanvaxServiceState();
    const liveUrl =
      status?.running && typeof status.url === "string" && status.url
        ? status.url
        : serviceState.url;
    if (!liveUrl) {
      results.push({
        name: "project-scoped build/checkpoint endpoints write latest files",
        passed: true,
        skipped: true,
        detail: serviceState.detail,
      });
      return;
    }

    const buildResponse = await fetch(`${liveUrl}/api/save-build-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request: {
          schemaVersion: 1,
          kind: "canvax-build-real-request",
          source: "regression-check",
          requiresOpenAiApiKey: false,
          project: {
            kind: "canvax-project",
            id: "project-regression-build",
            title: "Regression build project",
          },
          board: {
            project: "Canvax regression build",
          },
          activeFrameId: "frame-regression-build",
          frame: {
            id: "frame-regression-build",
            title: "Regression build frame",
            elements: [],
          },
        },
        markdown: "# Regression build request\n",
      }),
    });
    const buildPayload = await buildResponse.json();

    const checkpointResponse = await fetch(`${liveUrl}/api/save-checkpoint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkpoint: {
          schemaVersion: 1,
          reason: "regression-check",
          label: "Regression checkpoint",
          project: {
            kind: "canvax-project",
            id: "project-regression-checkpoint",
            title: "Regression checkpoint project",
          },
          board: {
            project: "Canvax regression checkpoint",
          },
          activeFrameId: "frame-regression-checkpoint",
          frameId: "frame-regression-checkpoint",
          frameTitle: "Regression checkpoint frame",
          frames: [
            {
              id: "frame-regression-checkpoint",
              title: "Regression checkpoint frame",
            },
          ],
          summary: {
            voiceSegmentCount: 0,
            captureCount: 0,
            artifactCount: 0,
            changeCount: 0,
          },
        },
      }),
    });
    const checkpointPayload = await checkpointResponse.json();

    const expectedBuildPath =
      "exports/projects/project-regression-build/canvax-build-real-latest.json";
    const expectedCheckpointPath =
      "exports/projects/project-regression-checkpoint/canvax-checkpoint-latest.json";
    const expectedCheckpointIndexPath =
      "exports/projects/project-regression-checkpoint/canvax-checkpoints.json";
    const buildFile = JSON.parse(
      await readFile(resolve(projectRoot, expectedBuildPath), "utf8"),
    );
    const checkpointFile = JSON.parse(
      await readFile(resolve(projectRoot, expectedCheckpointPath), "utf8"),
    );
    const checkpointIndexFile = JSON.parse(
      await readFile(resolve(projectRoot, expectedCheckpointIndexPath), "utf8"),
    );

    const passed = Boolean(
      buildResponse.ok &&
        buildPayload?.request?.project?.id === "project-regression-build" &&
        buildPayload.projectJsonPath === expectedBuildPath &&
        buildPayload.projectMarkdownPath ===
          "exports/projects/project-regression-build/canvax-build-real-latest.md" &&
        buildFile?.kind === "canvax-build-real-request" &&
        buildFile?.project?.id === "project-regression-build" &&
        checkpointResponse.ok &&
        checkpointPayload.projectCheckpointPath === expectedCheckpointPath &&
        checkpointPayload.projectCheckpointsIndexPath ===
          expectedCheckpointIndexPath &&
        checkpointFile?.project?.id === "project-regression-checkpoint" &&
        checkpointIndexFile?.kind === "canvax-project-checkpoints" &&
        checkpointIndexFile?.project?.id === "project-regression-checkpoint" &&
        Array.isArray(checkpointIndexFile?.items) &&
        checkpointIndexFile.items.length > 0,
    );

    results.push({
      name: "project-scoped build/checkpoint endpoints write latest files",
      passed,
      detail: passed
        ? `${expectedBuildPath}, ${expectedCheckpointPath}`
        : "invalid project-scoped build/checkpoint response",
    });
  } catch (error) {
    results.push({
      name: "project-scoped build/checkpoint endpoints write latest files",
      passed: false,
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function detectCanvaxServiceState() {
  const reachableUrl = await detectReachableCanvaxUrl();
  if (reachableUrl) {
    return {
      url: reachableUrl,
      detail: "",
    };
  }

  const listeningPort = await detectListeningCanvaxPort();
  if (listeningPort) {
    return {
      url: "",
      detail: `Canvax is listening on port ${listeningPort}, but localhost probes are blocked in this validation context`,
    };
  }

  return {
    url: "",
    detail: "Canvax service not running",
  };
}

async function detectReachableCanvaxUrl() {
  const candidates = [
    process.env.CANVAX_LIVE_URL,
    "http://localhost:3210",
    "http://127.0.0.1:3210",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const { stdout } = await runCommand(curlBinary, [
        "-s",
        "-o",
        "/dev/null",
        "-w",
        "%{http_code}",
        `${candidate}/api/status`,
      ]);
      if (stdout.trim() === "200") {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return "";
}

async function detectListeningCanvaxPort() {
  const ports = [extractPortFromUrl(process.env.CANVAX_LIVE_URL), 3210].filter(
    Boolean,
  );

  for (const port of ports) {
    try {
      const { stdout } = await runCommand("lsof", [
        "-nP",
        `-iTCP:${port}`,
        "-sTCP:LISTEN",
      ]);
      if (stdout.includes(`:${port} (LISTEN)`)) {
        return port;
      }
    } catch {
      // Try the next port candidate.
    }
  }

  return 0;
}

function extractPortFromUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return 0;
  }
  try {
    return Number(new URL(value).port) || 0;
  } catch {
    return 0;
  }
}

async function validateOptionalJsonSchema(
  filePath,
  predicate,
  name,
  options = {},
) {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (
      options.allowLegacyWithoutSchema &&
      (!Number.isInteger(parsed?.schemaVersion) || parsed.schemaVersion < 1)
    ) {
      results.push({
        name,
        passed: true,
        skipped: true,
        detail: "legacy file without schemaVersion",
      });
      return;
    }
    results.push({
      name,
      passed: Boolean(predicate(parsed)),
      detail: filePath,
    });
  } catch (error) {
    if (isMissingFileError(error)) {
      results.push({
        name,
        passed: true,
        skipped: true,
        detail: "file not present",
      });
      return;
    }
    results.push({
      name,
      passed: false,
      detail: error instanceof Error ? error.message : filePath,
    });
  }
}

async function readOptionalJson(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function validateRequiredFile(filePath, name) {
  try {
    await readFile(filePath, "utf8");
    results.push({
      name,
      passed: true,
      detail: filePath,
    });
  } catch (error) {
    results.push({
      name,
      passed: false,
      detail: error instanceof Error ? error.message : filePath,
    });
  }
}

function isMissingFileError(error) {
  return Boolean(error && typeof error === "object" && error.code === "ENOENT");
}

function buildBmpFixture(width, height, colors) {
  const bitsPerPixel = 24;
  const rowStride = Math.floor((bitsPerPixel * width + 31) / 32) * 4;
  const pixelDataSize = rowStride * height;
  const buffer = Buffer.alloc(54 + pixelDataSize);
  buffer.write("BM", 0, "ascii");
  buffer.writeUInt32LE(buffer.length, 2);
  buffer.writeUInt32LE(54, 10);
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(-height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(bitsPerPixel, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelDataSize, 34);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue] = hexToRgb(colors[y * width + x] || "#000000");
      const offset = 54 + y * rowStride + x * 3;
      buffer[offset] = blue;
      buffer[offset + 1] = green;
      buffer[offset + 2] = red;
    }
  }
  return buffer;
}

function hexToRgb(value) {
  const hex = String(value || "#000000").replace("#", "");
  return [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
}

function runCommand(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
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
