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
        ],
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
      "Manual first-use design review is still required, but the default surface now has a four-step guided Start here path.",
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
        includes: ["visualfixture=advanced-map", "advanced map visual smoke"],
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
          "groupHierarchy",
          "recursive nested group",
        ],
      },
    ],
    remainingGap:
      "Map is a strong spatial project layer with recursive geometry-based group movement/resizing and a custom-property metadata layer, not a fully arbitrary infinite design canvas with full schema-specific property panels and a full nested object model.",
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
          "build executor creates production acceptance checklist",
          "build executor creates framework adapter handoffs",
          "build preview can bind to Codex output manifest",
        ],
      },
    ],
    remainingGap:
      "High-fidelity production app/page edits still require Codex to act on the request and are not proven by the deterministic scaffold alone.",
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
          "availableDesignKitPresets",
          "normalizeExternalDesignTokenPack",
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
        includes: ["requiresOpenAiApiKey: false", "validateKit"],
      },
      {
        path: "design-kits/README.md",
        includes: ["design-kits/*.json", "Design kit dropdown"],
      },
      {
        path: "scripts/extract-design-tokens.mjs",
        includes: [
          "canvax-external-design-tokens",
          "requiresOpenAiApiKey: false",
          "extractStylesheetHrefs",
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
        path: "scripts/regression-check.mjs",
        includes: [
          "external design token extractor dry-run is valid",
          "design token enforcement verifier dry-run is valid",
          "design token production manifest verifier dry-run is valid",
        ],
      },
    ],
    remainingGap:
      "Repository kit files, current-frame/reference-image extraction, text/CSS token extraction, latest-pack UI import, local artifact token enforcement, and manifest-listed production-file token enforcement are proven, but richer large-library discovery, rendered screenshot/app semantic extraction, and evidence from a real user project port remain open.",
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
          "liveRewriteQueued",
          "buildVoiceExport",
          "transcriptBridge",
        ],
      },
      {
        path: "scripts/execute-rewrite-request.mjs",
        includes: [
          "affectedComponents",
          "canvax-component-map.json",
          "loadBuildContract",
          "loadPortTask",
          "visualDirection",
          "data-canvax-atmosphere",
        ],
      },
    ],
    remainingGap:
      "Continuous first-party Codex file rewrites while the user keeps sketching remain blocked on host integration.",
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
        path: "docs/FEATURES.md",
        includes: ["image host task", "Asset candidates"],
      },
    ],
    remainingGap:
      "Direct ChatGPT image generation and editing are host-provided, not locally provided by Canvax.",
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
        includes: ["e2e-workflow", "browser-regression", "regression"],
      },
      {
        path: "scripts/e2e-workflow-check.mjs",
        includes: [
          "synthetic rough frame includes sketch",
          "image prompt and asset packs stay no-API",
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
