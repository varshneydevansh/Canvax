import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const outputRoot = resolve(projectRoot, "artifacts", "canvax", "goal-audit");
const latestRoot = resolve(outputRoot, "latest");
const latestJsonPath = resolve(latestRoot, "result.json");
const latestMarkdownPath = resolve(latestRoot, "result.md");

const objective =
  "Drive Canvax from Stitch-inspired prototype to designer-first Codex visual workbench that is simpler than Stitch for everyday use and more powerful for real implementation, without requiring paid API keys.";

const checks = [
  {
    id: "designer-first-workbench",
    requirement: "Designer-first everyday Workbench with simple default surface",
    currentState: "partial-local",
    evidence: [
      {
        path: "web/index.html",
        includes: [
          "focus-pad",
          "designer-start-actions",
          "data-designer-start=\"sketch\"",
          "More actions",
          "workspace-mode-guide",
          "workbench-review-output",
          "workbench-design-review-badge",
          "workbench-agent-log",
          "workbench-composer",
        ],
      },
      {
        path: "web/app.js",
        includes: [
          "hostSurfaceMode",
          "codex-sidecar",
          "function buildWorkbenchAgentLogExport",
          "function buildWorkbenchExport",
          "hostSurfaceUrl",
          "implementationContext.workbench?.agentLog",
        ],
      },
      {
        path: "scripts/browser-regression.mjs",
        includes: [
          "validateCodexSidecarSmoke",
          "host=codex-sidecar&visualfixture=codex-sidecar",
          "exportedWorkbench?.hostSurface",
        ],
      },
      {
        path: "scripts/canvax.mjs",
        includes: ["handleRunDesignReview", "design-review-executed"],
      },
      {
        path: "docs/DESIGNER_WALKTHROUGH.md",
        includes: [
          "Designer Walkthrough",
          "Start here",
          "Image And Book/Illustration Loop",
        ],
      },
    ],
    remainingGap:
      "Manual taste review for first-time-designer clarity is still required, but the default surface now has a four-step guided Start here path, an inline local output review gate, a compact Workbench Agent log, and a local Codex sidecar scratchpad URL.",
  },
  {
    id: "local-project-switching",
    requirement: "Local project switching keeps Canvax handoff and output context scoped to the active board",
    currentState: "partial-local",
    evidence: [
      {
        path: "web/app.js",
        includes: [
          "function buildProjectExportMetadata",
          "projectRegistry",
          "projectSnapshotKey",
          "buildMaterializePayloadWithMode",
          "publishWorkspaceOutput",
        ],
      },
      {
        path: "scripts/canvax.mjs",
        includes: [
          "function scopePreviewManifestToLiveProject",
          "function readCheckpointHistoryForLiveProject",
          "project-scoped",
          "manifestEntryMatchesLiveProject",
        ],
      },
      {
        path: "scripts/write-codex-output.mjs",
        includes: [
          "canvax-codex-output-latest.json",
          "resolveActiveProject",
          "projectManifestPath",
        ],
      },
      {
        path: "docs/FEATURES.md",
        includes: [
          "`/api/preview-state` is scoped to the active project",
          "Checkpoint history is read from that project's checkpoint index",
        ],
      },
    ],
    remainingGap:
      "Project switching is still local/browser-profile scoped rather than hosted/team synced, and generated output history remains file-backed instead of a full collaborative project database.",
  },
  {
    id: "unified-workbench-advanced",
    requirement: "Unified Workbench and Advanced experience",
    currentState: "partial-local",
    evidence: [
      {
        path: "web/index.html",
        includes: ["Workbench", "Advanced", "workspace-mode-control"],
      },
      {
        path: "scripts/browser-regression.mjs",
        includes: [
          "visualfixture=advanced-map",
          "host=codex-sidecar",
          "advanced map visual smoke",
        ],
      },
      {
        path: "docs/CANVAX_PARITY_AUDIT.md",
        includes: ["Unified Workbench / Advanced experience"],
      },
    ],
    remainingGap:
      "Advanced remains intentionally dense and still needs ongoing design review against first-time-designer expectations.",
  },
  {
    id: "spatial-canvas",
    requirement: "True infinite spatial canvas direction",
    currentState: "partial-local",
    evidence: [
      {
        path: "web/app.js",
        includes: [
          "function buildSpatialViewportExport",
          "function fitFlowMapToContent",
          "function renderFlowNavigator",
          "function startFlowPanMomentum",
          "function stepFlowPanMomentum",
          "function buildMapObjectInspectorContract",
          "function updateSelectedSpatialObjectDetail",
          "function canReorderSelectedVariantBranches",
          "function reorderSelectedVariantBranches",
          "function reorderVariantBranchesByMapPosition",
          "function renderBranchDropTargetMarkup",
          "function buildSpatialTimeline",
          "function buildSpatialTimelineBranchItem",
          "function buildSpatialGroupHierarchy",
          "function spatialObjectGroupHierarchyForExport",
          "function collectSpatialGroupMemberOrigins",
          "function resizeSpatialGroupMembers",
          "panMomentum",
          "inspector",
          "inspectorOverrides",
          "customProperties",
          "function updateSelectedSpatialObjectCustomProperties",
          "function buildCheckpointReplayFrameConfig",
          "function replayCheckpointAsFrame",
          "Checkpoint replay frame created",
          "Custom Properties",
          "STORAGE_VERSION = 4",
          "outputLaneCollapsed: true",
          "Map output/history shelves default to compressed designer focus",
          "function isDesignerVisibleMapArtifact",
          "materialize-sketch-",
          "timeline: buildSpatialTimeline",
          "spatialWorkspace",
          "nestedChildAfterGroupResize",
        ],
      },
      {
        path: "docs/STITCH_GAP_ROADMAP.md",
        includes: [
          "spatialWorkspace",
          "Tidy map",
          "Output shelf",
          "hides internal Materialize support files",
          "starts compressed",
          "momentum/coast",
          "structured per-type inspector sections",
          "safe type-detail overrides",
          "custom `key: value` properties",
          "Map timeline",
          "frames/branches/outputs/checkpoints",
          "Replay as frame",
          "Checkpoint replay",
          "groupHierarchy",
          "recursive nested group",
        ],
      },
    ],
    remainingGap:
      "Map is a strong spatial project layer with recursive geometry-based group movement/resizing, checkpoint replay branches, and a custom-property metadata layer, not a fully arbitrary infinite design canvas with full schema-specific property panels, lossless checkpoint vector restore, and a full nested object model.",
  },
  {
    id: "editable-variants",
    requirement: "Generated variants as editable canvas objects",
    currentState: "strong-local",
    evidence: [
      {
        path: "web/app.js",
        includes: [
          "createVariantFramesFromCurrent",
          "buildSpatialVariantBranches",
          "semanticVariantRecipes",
          "variantRecipeCustomProperties",
          "variantStylePropertyKeys",
          "updateSelectedVariantStyleProperty",
          "semanticRecipe",
          "styleProperties",
          "Use variant",
          "outputEditBinding",
        ],
      },
      {
        path: "docs/USAGE.md",
        includes: [
          "Editable Variants",
          "semantic recipe",
          "Variant style knobs",
          "spatialWorkspace.variantBranches[].semanticRecipe",
          "spatialWorkspace.variantBranches[].styleProperties",
          "Use variant",
          "Output edit",
        ],
      },
    ],
    remainingGap:
      "Hosted AI variant generation and full arbitrary design-token editing remain future work; local deterministic semantic recipes and branch style knobs now ship.",
  },
  {
    id: "codex-built-screen",
    requirement: "Codex-built real app/screen generation with manifest binding",
    currentState: "partial-local",
    evidence: [
      {
        path: "scripts/execute-build-request.mjs",
        includes: [
          "implementationContext",
          "buildImplementationTheme",
          "buildThemeAtmosphere",
          "data-canvax-atmosphere",
          "visualDirection",
          "Designer context",
          "data-canvax-theme",
          "designerImplementationContext",
          "CanvaxScreen.jsx",
          "NextAppPage.jsx",
          "canvax-component-map.json",
          "canvax-build-contract.json",
          "codex-port-task.json",
          "ACCEPTANCE.md",
          "canvax-codex-port-task",
          "INTEGRATION.md",
          "scripts/write-codex-output.mjs",
        ],
      },
      {
        path: "scripts/e2e-workflow-check.mjs",
        includes: [
          "build executor preserves designer implementation context",
          "build executor applies designer context to generated preview theme",
          "build executor creates machine-readable Codex port task",
          "patch task executor applies local generated implementation edits",
          "build executor creates production acceptance checklist",
          "build executor creates framework adapter handoffs",
          "build preview can bind to Codex output manifest",
        ],
      },
      {
        path: "scripts/execute-patch-task.mjs",
        includes: [
          "canvax-applied-patch-result",
          "Canvax-generated, production-like proof",
          "project-linked implementation files",
          "exports/canvax-project-link-latest.json",
          "buildProjectLinkExpansion",
          "data-canvax-patch-state",
          "scripts/write-codex-output.mjs",
        ],
      },
      {
        path: "scripts/production-port-proof.mjs",
        includes: [
          "canvax-production-port-proof",
          "canvax-proof.html",
          "CanvaxProof.jsx",
          "buildProductionPatchTask",
          "patchApplication",
          "scripts/execute-patch-task.mjs",
          "scripts/verify-token-enforcement.mjs",
          "scripts/review-artifact.mjs",
          "requiresOpenAiApiKey: false",
        ],
      },
      {
        path: "scripts/link-project-target.mjs",
        includes: [
          "canvax-project-link",
          "canvax-project-edit-contract",
          "codex-output.json",
          "data-canvax-node-id",
          "requiresOpenAiApiKey: false",
        ],
      },
    ],
    remainingGap:
      "High-fidelity arbitrary unlinked production app/page edits still require Codex to act on the request. Canvax can now link explicit real project files to a frame and apply deterministic no-API patches only to files in that project-link contract, but the scaffold, generated-bundle proof, production-like fixture, and project-link patch bridge are not a fully autonomous production generator.",
  },
  {
    id: "design-system-token-extraction",
    requirement: "Reusable design-system and token extraction layer",
    currentState: "partial-local",
    evidence: [
      {
        path: "web/app.js",
        includes: [
          "extractDesignTokensFromCurrentFrame",
          "importExternalDesignTokens",
          "repositoryDesignKitPresets",
          "designKitMatchesSearch",
          "availableDesignKitPresets",
          "normalizeExternalDesignTokenPack",
          "normalizeTokenSemanticStructure",
          "semanticStructure",
          "sampleImagePalette",
          "visualSamples",
        ],
      },
      {
        path: "scripts/canvax.mjs",
        includes: ["readDesignKitGallery", "designKitGallery"],
      },
      {
        path: "scripts/validate-design-kits.mjs",
        includes: [
          "requiresOpenAiApiKey: false",
          "validateKit",
          "kitMatchesQuery",
          "--query",
        ],
      },
      {
        path: "scripts/package-design-kits.mjs",
        includes: [
          "canvax-design-kit-library",
          "requiresOpenAiApiKey: false",
          "checksum",
          "packageCommand",
        ],
      },
      {
        path: "design-kits/README.md",
        includes: [
          "design-kits/*.json",
          "Design kit dropdown",
          "package-design-kits",
        ],
      },
      {
        path: "scripts/extract-design-tokens.mjs",
        includes: [
          "canvax-external-design-tokens",
          "requiresOpenAiApiKey: false",
          "extractStylesheetHrefs",
          "sampleImagePalette",
          "parseBmpPalette",
          "extractSemanticStructure",
          "canvax-semantic-structure",
        ],
      },
      {
        path: "scripts/review-artifact.mjs",
        includes: [
          "canvax-artifact-design-review",
          "requiresOpenAiApiKey: false",
          "focus-styles",
          "canvax-bindings",
        ],
      },
      {
        path: "scripts/review-visual-snapshot.mjs",
        includes: [
          "canvax-visual-snapshot-review",
          "requiresOpenAiApiKey: false",
          "palette-variety",
          "dominant-color",
          "contrast-spread",
        ],
      },
      {
        path: "scripts/review-design-jury.mjs",
        includes: [
          "canvax-design-jury-review",
          "visual-hierarchy",
          "accessibility-basics",
          "tweak-targeting",
          "requiresOpenAiApiKey: false",
        ],
      },
      {
        path: "scripts/browser-regression.mjs",
        includes: [
          "canvax-dom-layout-review",
          "preview DOM layout review passes",
          "noApiBoundary",
          "data-canvax-node-id",
        ],
      },
      {
        path: "scripts/execute-build-request.mjs",
        includes: [
          "applyDesignTokenPalette",
          "collectDesignTokenPalette",
          "designTokens: model.theme.designTokens",
        ],
      },
      {
        path: "scripts/verify-token-enforcement.mjs",
        includes: [
          "canvax-token-enforcement-verification",
          "collectManifestCandidateFiles",
          "missingPalette",
          "requiresOpenAiApiKey: false",
        ],
      },
      {
        path: "scripts/production-port-proof.mjs",
        includes: [
          "canvax-production-port-proof",
          "buildCodexOutputManifest",
          "verify-token-enforcement",
          "review-artifact",
          "remainingGap",
        ],
      },
      {
        path: "scripts/link-project-target.mjs",
        includes: [
          "canvax-project-link",
          "summary",
          "bindings",
          "customProperties",
          "codexEditContract",
          "requiresOpenAiApiKey: false",
        ],
      },
      {
        path: "scripts/canvax-inspect.mjs",
        includes: [
          "canvax-readonly-inspection",
          "canvax-host-handoff",
          "get_host_handoff",
          "canvax-host-task-pack",
          "canvax-host-image-prompt-pack",
          "create_task_pack",
          "create_image_prompt_pack",
          "get_current_frame",
          "get_spatial_workspace",
          "get_design_kit",
          "get_output_binding",
          "get_project_link",
          "requiresOpenAiApiKey: false",
        ],
      },
      {
        path: "scripts/canvax-mcp-server.mjs",
        includes: [
          "tools/list",
          "tools/call",
          "get_host_handoff",
          "create_task_pack",
          "create_image_prompt_pack",
          "get_current_frame",
          "get_spatial_workspace",
          "get_design_kit",
          "get_output_binding",
          "get_project_link",
          "attach_generated_asset",
          "append_transcript",
          "publish_codex_output",
          "requiresOpenAiApiKey: false",
        ],
      },
      {
        path: "scripts/regression-check.mjs",
        includes: [
          "external design token and semantic extractor dry-run is valid",
          "image design token extractor dry-run is valid",
          "design kit library packager dry-run is valid",
          "artifact design review dry-run is valid",
          "visual snapshot review dry-run is valid",
          "design jury review dry-run is valid",
          "DOM layout review schema is valid",
          "design token enforcement verifier dry-run is valid",
          "design token production manifest verifier dry-run is valid",
          "production port proof dry-run is valid",
          "project link dry-run and saved manifest are valid",
          "project-link-regression-tweak",
          "Canvax read-only inspection bridge is valid",
          "Canvax host handoff packet is valid",
          "Canvax task and image prompt host handoffs are valid",
          "Canvax MCP server self-test is valid",
          "append-transcript",
          "publish-codex-output",
          "preview tweak endpoint writes no-API region request",
        ],
      },
      {
        path: "scripts/canvax.mjs",
        includes: [
          "handleSavePreviewTweak",
          "canvax-preview-tweak-latest.json",
          "canvax-preview-tweak-request",
        ],
      },
      {
        path: "web/preview.js",
        includes: [
          "savePreviewTweak",
          "buildTweakRegion",
          "preview tweak region targeting is available",
        ],
      },
    ],
    remainingGap:
      "Repository kit files, UI/CLI kit search, versioned kit-library packaging, current-frame/reference-image extraction, text/CSS/image/semantic token extraction, static artifact design review, local pixel-level screenshot review, local DOM layout review, local design-jury review, Workbench output review gating, local Preview region-tweak requests, Codex patch-task handoff, generated-bundle applied-patch proof, latest-pack UI import, local artifact token enforcement, manifest-listed production-file token enforcement, a production-like local port/patch proof, an allowlisted project-link patch proof, a local read-only inspection CLI, consolidated no-API host handoff/task/image-prompt packets, a local stdio MCP read/write bridge for transcript and output manifest events, and a narrow MCP image-result return tool are proven, but hosted/team kit-library sharing, native Codex/ChatGPT host registration, hosted AI visual critique, automatically applied arbitrary unlinked production patching, and evidence from Codex completing a real external/user project edit remain open.",
  },
  {
    id: "live-sketch-voice-rewrite",
    requirement: "Live sketch-and-voice rewrite loop",
    currentState: "partial-local",
    evidence: [
      {
        path: "web/app.js",
        includes: [
          "maybeExecuteLiveRewriteFromFreeze",
          "executeAcceptedLiveEditWriteback",
          "saveLiveEditWritebackCheckpoint",
          "executeLatestPatchTask",
          "inspectWorkbenchOutputDomTargetFromEvent",
          "previewElementSelector",
          "previewElementSourceHint",
          "targetSourceFile",
          "liveEditWriteback",
          "targetSelector",
          "beginLiveEditCommentPinPlacement",
          "placeLiveEditCommentPinFromEvent",
          "startLiveEditPinDrag",
          "moveLiveEditCommentPin",
          "summarizeOutputAnnotations",
          "applyMultiStrokeSemantics",
          "component-circle",
          "multi-stroke-cross",
          "liveRewriteQueued",
          "buildVoiceExport",
          "buildVoiceIntentQueue",
          "focus-voice-intents",
          "transcriptBridge",
        ],
      },
      {
        path: "scripts/canvax-inspect.mjs",
        includes: [
          "canvax-host-handoff",
          "summarizeVoiceContext",
          "buildHostNextActions",
          "canvax-host-handoff-latest.json",
          "requiresOpenAiApiKey: false",
        ],
      },
      {
        path: "scripts/execute-rewrite-request.mjs",
        includes: [
          "affectedComponents",
          "canvax-component-map.json",
          "codex-patch-task.json",
          "canvax-codex-patch-task",
          "buildCodexPatchTask",
          "collectLiveEditSourceHintFiles",
          "targetSourceHint",
          "patchTaskPath",
          "loadBuildContract",
          "loadPortTask",
          "loadPreviewTweak",
          "previewTweakIncluded",
          "source: \"preview-tweak\"",
          "visualDirection",
          "data-canvax-atmosphere",
        ],
      },
      {
        path: "scripts/execute-patch-task.mjs",
        includes: [
          "canvax-applied-patch-result",
          "canvax-codex-patch-task",
          "project-linked implementation files",
          "source-hinted-component",
          "source-hinted-task-note",
          "buildProjectLinkExpansion",
          "sourceHintExpansion",
          "data-canvax-patch-state",
          "codex-build",
          "requiresOpenAiApiKey: false",
        ],
      },
      {
        path: "scripts/regression-check.mjs",
        includes: [
          "Live Edit source-hinted patch task targets local source files",
          "accepted-live-edit-target",
          "source-hinted files patched",
        ],
      },
      {
        path: "scripts/canvax.mjs",
        includes: [
          "readArgValue(args, [\"--frame\", \"--frame-id\"])",
          "canvax-preview-tweak-request",
          "preview-tweak",
          "normalizePreviewTweakRegion",
          "handleExecutePatchTask",
          "/api/execute-patch-task",
        ],
      },
      {
        path: "scripts/canvax-mcp-server.mjs",
        includes: [
          "append_transcript",
          "callAppendTranscript",
          "publish_codex_output",
          "callPublishCodexOutput",
          "requiresOpenAiApiKey: false",
        ],
      },
      {
        path: "scripts/e2e-workflow-check.mjs",
        includes: [
          "preview tweak request stays no-API and targets the frame",
          "rewrite context includes Preview region tweak request",
          "rewrite context carries accepted Live Edit source intent",
          "rewrite emits Codex patch task for accepted Live Edit targets",
          "patch task executor applies local generated implementation edits",
          "applied patch preserves selector binding and records patch metadata",
          "rewritePatchTask",
          "appliedPatchResult",
          "--preview-tweak",
        ],
      },
      {
        path: "scripts/regression-check.mjs",
        includes: [
          "Canvax host handoff packet is valid",
          "canvax-host-handoff",
          "host handoff schema is valid",
        ],
      },
    ],
    remainingGap:
      "Continuous first-party Codex file rewrites while the user keeps sketching remain blocked on host integration; local voice intent cards, Preview region-tweak requests, and accepted Live Edit variants now feed the handoff/rewrite path, emit Codex patch tasks, and can apply deterministic edits to Canvax-generated implementation bundles or explicit project-linked files, but arbitrary unlinked production app patches still require Codex judgment.",
  },
  {
    id: "image-asset-handoff",
    requirement: "Richer image and asset candidate handling",
    currentState: "partial-strong-local",
    evidence: [
      {
        path: "scripts/canvax.mjs",
        includes: [
          "canvax-image-generation-brief-latest.json",
          "canvax-image-host-task-latest.json",
          "buildServerImageGenerationBrief",
          "buildServerImageHostTask",
          "buildServerAssetPlacementMap",
        ],
      },
      {
        path: "web/app.js",
        includes: ["renderAssetCandidateTray", "Copy prompt", "Attach path"],
      },
      {
        path: "scripts/import-image-results.mjs",
        includes: [
          "canvax-image-results",
          "canvax-image-result-return-contract",
          "requiresOpenAiApiKey: false",
        ],
      },
      {
        path: "scripts/canvax-mcp-server.mjs",
        includes: [
          "create_image_prompt_pack",
          "canvax-host-image-prompt-pack",
          "attach_generated_asset",
          "canvax-image-results",
        ],
      },
      {
        path: "docs/FEATURES.md",
        includes: ["image host task", "Asset candidates", "image results"],
      },
    ],
    remainingGap:
      "Direct ChatGPT image generation and editing are host-provided, not locally provided by Canvax; returned files now have a no-API import contract that binds them back to candidate slots.",
  },
  {
    id: "no-api-key-core",
    requirement: "No paid API key requirement for core Canvax workflow",
    currentState: "strong-local",
    evidence: [
      {
        path: "web/app.js",
        includes: ["requiresOpenAiApiKey: false"],
      },
      {
        path: "scripts/regression-check.mjs",
        includes: ["requiresOpenAiApiKey === false"],
      },
      {
        path: "docs/USAGE.md",
        includes: ["does not require `OPENAI_API_KEY`"],
      },
    ],
    remainingGap:
      "Future host bridges must remain optional and must not turn image/code generation into a local API-key requirement.",
  },
  {
    id: "workflow-proof",
    requirement: "Documentation and tests prove rough-sketch-to-real-output flow",
    currentState: "strong-local-for-deterministic-workflow",
    evidence: [
      {
        path: "package.json",
        includes: [
          "e2e-workflow",
          "browser-regression",
          "execute-patch",
          "production-port-proof",
          "project-link",
          "inspect",
          "mcp",
          "review-snapshot",
          "review-jury",
          "review-dom",
          "regression",
        ],
      },
      {
        path: "scripts/e2e-workflow-check.mjs",
        includes: [
          "synthetic rough frame includes sketch",
          "image prompt and asset packs stay no-API",
          "rewrite emits Codex patch task for accepted Live Edit targets",
          "patch task executor applies local generated implementation edits",
          "rewrite preview can bind to Codex output manifest",
        ],
      },
      {
        path: "docs/CANVAX_PARITY_AUDIT.md",
        includes: ["Prompt-To-Artifact Checklist", "Current Verdict"],
      },
    ],
    remainingGap:
      "Tests prove local deterministic executors and browser workflow, not hosted ChatGPT/Codex live co-editing.",
  },
];

const results = [];

for (const check of checks) {
  const evidenceResults = [];
  for (const evidence of check.evidence) {
    const absolutePath = resolve(projectRoot, evidence.path);
    let raw = "";
    let readOk = true;
    try {
      raw = await readFile(absolutePath, "utf8");
    } catch (error) {
      readOk = false;
      evidenceResults.push({
        path: evidence.path,
        passed: false,
        missing: evidence.includes,
        detail: error instanceof Error ? error.message : "read failed",
      });
      continue;
    }
    const missing = evidence.includes.filter((needle) => !raw.includes(needle));
    evidenceResults.push({
      path: evidence.path,
      passed: readOk && missing.length === 0,
      missing,
    });
  }
  results.push({
    ...check,
    passed: evidenceResults.every((item) => item.passed),
    evidenceResults,
  });
}

const failed = results.filter((result) => !result.passed);
const blockingGaps = results
  .filter((result) => result.currentState !== "complete")
  .map((result) => ({
    id: result.id,
    requirement: result.requirement,
    currentState: result.currentState,
    remainingGap: result.remainingGap,
  }));
const payload = {
  schemaVersion: 1,
  kind: "canvax-goal-audit",
  generatedAt: new Date().toISOString(),
  objective,
  evidencePassed: failed.length === 0,
  overallComplete: false,
  reason:
    "The audit verifies local evidence and known gaps. It intentionally does not mark the full objective complete while first-party host bridges and high-fidelity autonomous production generation remain open.",
  results,
  blockingGaps,
};

await mkdir(latestRoot, { recursive: true });
await writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
await writeFile(latestMarkdownPath, buildMarkdown(payload));

for (const result of results) {
  const prefix = result.passed ? "ok" : "fail";
  console.log(`${prefix}: ${result.requirement} (${result.currentState})`);
  if (result.passed && result.remainingGap) {
    console.log(`gap: ${result.remainingGap}`);
  }
}
console.log(`audit json: ${toProjectRelative(latestJsonPath)}`);
console.log(`audit markdown: ${toProjectRelative(latestMarkdownPath)}`);
console.log(`overall complete: ${payload.overallComplete ? "yes" : "no"}`);

if (failed.length) {
  process.exitCode = 1;
}

function buildMarkdown(value) {
  const lines = [
    "# Canvax Goal Audit",
    "",
    `- Generated: ${value.generatedAt}`,
    `- Evidence passed: ${value.evidencePassed ? "yes" : "no"}`,
    `- Overall complete: ${value.overallComplete ? "yes" : "no"}`,
    "",
    "## Objective",
    "",
    value.objective,
    "",
    "## Prompt-To-Artifact Checklist",
    "",
    "| Requirement | State | Evidence | Remaining gap |",
    "| --- | --- | --- | --- |",
  ];
  value.results.forEach((result) => {
    const evidence = result.evidenceResults
      .map((item) =>
        item.passed
          ? `${item.path}: ok`
          : `${item.path}: missing ${item.missing.join(", ")}`,
      )
      .join("<br>");
    lines.push(
      `| ${escapeTable(result.requirement)} | ${escapeTable(result.currentState)} | ${escapeTable(evidence)} | ${escapeTable(result.remainingGap)} |`,
    );
  });
  lines.push(
    "",
    "## Completion Verdict",
    "",
    value.reason,
    "",
    "## Blocking Gaps",
    "",
  );
  value.blockingGaps.forEach((gap) => {
    lines.push(
      `- ${gap.requirement}: ${gap.remainingGap} (${gap.currentState})`,
    );
  });
  return `${lines.join("\n")}\n`;
}

function escapeTable(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function toProjectRelative(filePath) {
  return filePath.startsWith(projectRoot)
    ? filePath.slice(projectRoot.length + 1)
    : filePath;
}
