#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const exportsRoot = resolve(projectRoot, "exports");
const defaultArtifactReviewPath = resolve(
  exportsRoot,
  "canvax-artifact-review-latest.json",
);
const defaultVisualReviewPath = resolve(
  exportsRoot,
  "canvax-visual-snapshot-review-latest.json",
);
const defaultJsonPath = resolve(exportsRoot, "canvax-design-jury-latest.json");
const defaultMarkdownPath = resolve(exportsRoot, "canvax-design-jury-latest.md");

const args = parseArgs(process.argv.slice(2));

try {
  const review = await buildDesignJuryReview(args);
  const markdown = buildReviewMarkdown(review);
  if (!args.dryRun) {
    await mkdir(exportsRoot, { recursive: true });
    await writeFile(defaultJsonPath, `${JSON.stringify(review, null, 2)}\n`, "utf8");
    await writeFile(defaultMarkdownPath, markdown, "utf8");
  }
  printResult(review, markdown, args);
  if (review.status === "fail") {
    process.exitCode = 1;
  }
} catch (error) {
  const payload = {
    ok: false,
    kind: "canvax-design-jury-review",
    schemaVersion: 1,
    requiresOpenAiApiKey: false,
    error: error instanceof Error ? error.message : String(error),
  };
  printResult(payload, "", args);
  process.exitCode = 1;
}

async function buildDesignJuryReview(options) {
  const artifactSources = await resolveArtifactSources(options);
  const artifactReviews = [];
  for (const source of artifactSources) {
    artifactReviews.push(await reviewArtifactSource(source));
  }
  const visualReview = await resolveVisualReview(options);
  const designContext = await resolveDesignContext(options);
  const categories = buildJuryCategories({
    artifactReviews,
    artifactSources,
    visualReview,
    designContext,
  });
  const status = summarizeStatus(categories);
  const score = scoreCategories(categories);
  const blockers = categories
    .filter((category) => category.level === "fail")
    .map((category) => category.id);
  const cautions = categories
    .filter((category) => category.level === "warn")
    .map((category) => category.id);
  const decision =
    status === "fail"
      ? "blocked"
      : status === "review"
        ? "needs-designer-review"
        : "ready-for-codex-port";

  return {
    ok: status !== "fail",
    kind: "canvax-design-jury-review",
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    requiresOpenAiApiKey: false,
    dryRun: options.dryRun,
    source: {
      artifactCount: artifactSources.length,
      artifacts: artifactSources.map((source) => ({
        type: source.type,
        label: source.label,
        path: source.path,
        scannedCharacters: source.text.length,
      })),
      visualReview:
        visualReview.status === "missing"
          ? { status: "missing", source: visualReview.source || "" }
          : {
              status: visualReview.status,
              score: visualReview.score,
              snapshotCount: visualReview.snapshots?.length || 0,
              source: visualReview.source?.type || "",
            },
      designContext,
    },
    status,
    score,
    decision,
    blockers,
    cautions,
    categories,
    subreviews: {
      artifactReviews,
      visualReview,
    },
    summary: buildSummary(status, score, categories, decision),
    noApiBoundary:
      "This design jury combines local static artifact review, local screenshot pixel review, and local Canvax design context. It does not call a hosted model, image API, browser renderer, or paid API.",
  };
}

async function resolveArtifactSources(options) {
  const sources = [];
  for (const artifactPath of options.artifacts) {
    const absolutePath = resolveProjectPath(artifactPath);
    sources.push({
      type: "file",
      label: relativeProjectPath(absolutePath),
      path: relativeProjectPath(absolutePath),
      text: await readFile(absolutePath, "utf8"),
    });
  }
  if (options.text) {
    sources.push({
      type: "inline-text",
      label: "Inline HTML/CSS text",
      path: "",
      text: options.text,
    });
  }
  if (!sources.length) {
    const latest = await readOptionalJson(defaultArtifactReviewPath);
    if (latest?.kind === "canvax-artifact-design-review") {
      return [
        {
          type: "prior-artifact-review",
          label: latest.source?.label || relativeProjectPath(defaultArtifactReviewPath),
          path: latest.source?.path || relativeProjectPath(defaultArtifactReviewPath),
          text: "",
          priorReview: latest,
        },
      ];
    }
  }
  if (!sources.length) {
    throw new Error(
      "Provide --artifact, --html, or --text, or run npm run review-artifact first.",
    );
  }
  return sources;
}

async function reviewArtifactSource(source) {
  if (source.priorReview) {
    return source.priorReview;
  }
  const commandArgs =
    source.type === "file"
      ? ["scripts/review-artifact.mjs", "--file", source.path, "--dry-run", "--json"]
      : ["scripts/review-artifact.mjs", "--text", source.text, "--dry-run", "--json"];
  const payload = await runJsonCommand("node", commandArgs);
  return payload.review;
}

async function resolveVisualReview(options) {
  if (options.images.length || options.snapshotIndex) {
    const commandArgs = ["scripts/review-visual-snapshot.mjs", "--dry-run", "--json"];
    if (options.snapshotIndex) {
      commandArgs.push("--index", options.snapshotIndex);
    }
    for (const image of options.images) {
      commandArgs.push("--image", image);
    }
    return runJsonCommand("node", commandArgs);
  }
  const latest = await readOptionalJson(defaultVisualReviewPath);
  if (latest?.kind === "canvax-visual-snapshot-review") {
    return latest;
  }
  return {
    status: "missing",
    score: 0,
    snapshots: [],
    checks: [],
    source: "not-found",
  };
}

async function resolveDesignContext(options) {
  if (options.skipInspect) {
    return {
      available: false,
      source: "skipped",
      currentFrame: "",
      designKit: "",
      outputBinding: false,
    };
  }
  try {
    const payload = await runJsonCommand("node", [
      "scripts/canvax-inspect.mjs",
      "all",
      "--json",
      "--full",
    ]);
    const sections = payload.sections || {};
    return {
      available: true,
      source: "canvax-inspect",
      currentFrame:
        sections.currentFrame?.frame?.title ||
        sections.currentFrame?.frame?.id ||
        "",
      designKit:
        sections.designKit?.designKit?.preset?.name ||
        sections.designKit?.designKit?.source ||
        "",
      outputBinding: Boolean(
        sections.outputBinding?.outputBinding?.target ||
          sections.outputBinding?.outputBinding?.artifacts?.length ||
          sections.outputBinding?.outputBinding?.changes?.length,
      ),
    };
  } catch (error) {
    return {
      available: false,
      source: "canvax-inspect",
      error: error instanceof Error ? error.message : String(error),
      currentFrame: "",
      designKit: "",
      outputBinding: false,
    };
  }
}

function buildJuryCategories({
  artifactReviews,
  artifactSources,
  visualReview,
  designContext,
}) {
  const allArtifactChecks = artifactReviews.flatMap((review) => review.checks || []);
  const visualChecks = (visualReview.snapshots || []).flatMap(
    (snapshot) => snapshot.checks || [],
  );
  const allText = artifactSources.map((source) => source.text || "").join("\n");
  const getArtifact = (id) => allArtifactChecks.filter((check) => check.id === id);
  const getVisual = (id) => visualChecks.filter((check) => check.id === id);
  const artifactStatus = summarizeStatus(artifactReviews);
  const visualStatus =
    visualReview.status === "missing" ? "warn" : normalizeLevel(visualReview.status);
  const hasMotion = /\b(animation|transition)\s*[:=]/i.test(allText);
  const hasReducedMotion = /prefers-reduced-motion/i.test(allText);
  const hasDesignTokenCue =
    /\b(data-canvax-node-id|--[a-z0-9-]+|designKit|canvax-build-contract)\b/i.test(
      allText,
    ) || designContext.designKit;
  const hasTweakTarget =
    getArtifact("canvax-bindings").some((check) => check.level === "pass") ||
    designContext.outputBinding;

  return [
    makeCategory({
      id: "visual-hierarchy",
      label: "Visual hierarchy",
      level: worstLevel([
        levelFromChecks(getArtifact("heading-structure")),
        levelFromChecks(getArtifact("action-labels")),
        levelFromChecks(getVisual("dominant-color"), "warn"),
      ]),
      detail:
        "Reviews whether the surface exposes one clear headline/action structure and avoids a flat dominant-color result.",
      evidence: [
        ...summarizeChecks(getArtifact("heading-structure")),
        ...summarizeChecks(getArtifact("action-labels")),
        ...summarizeChecks(getVisual("dominant-color")),
      ],
    }),
    makeCategory({
      id: "accessibility-basics",
      label: "Accessibility basics",
      level: worstLevel([
        levelFromChecks(getArtifact("main-landmark")),
        levelFromChecks(getArtifact("image-alternatives"), "warn"),
        levelFromChecks(getArtifact("form-labels"), "warn"),
        levelFromChecks(getArtifact("focus-styles"), "warn"),
        levelFromChecks(getVisual("contrast-spread"), "warn"),
      ]),
      detail:
        "Combines landmarks, labels, focus cues, image alternatives, form labels, and screenshot contrast spread.",
      evidence: [
        ...summarizeChecks(getArtifact("main-landmark")),
        ...summarizeChecks(getArtifact("image-alternatives")),
        ...summarizeChecks(getArtifact("form-labels")),
        ...summarizeChecks(getArtifact("focus-styles")),
        ...summarizeChecks(getVisual("contrast-spread")),
      ],
    }),
    makeCategory({
      id: "responsive-readiness",
      label: "Responsive readiness",
      level: worstLevel([
        levelFromChecks(getArtifact("responsive-viewport"), "warn"),
        levelFromChecks(getArtifact("responsive-css"), "warn"),
        visualReview.status === "missing" ? "warn" : "pass",
      ]),
      detail:
        "Checks for viewport metadata, fluid/responsive CSS cues, and at least one local visual snapshot.",
      evidence: [
        ...summarizeChecks(getArtifact("responsive-viewport")),
        ...summarizeChecks(getArtifact("responsive-css")),
        visualReview.status === "missing"
          ? "No visual snapshot review found."
          : `${visualReview.snapshots?.length || 0} local visual snapshot(s) available.`,
      ],
    }),
    makeCategory({
      id: "brand-system-fit",
      label: "Brand and system fit",
      level: hasDesignTokenCue && designContext.available ? "pass" : "warn",
      detail:
        "Confirms whether the generated surface is tied back to Canvax source bindings, design-kit context, or explicit token cues.",
      evidence: [
        designContext.available
          ? `Canvax inspection available for ${designContext.currentFrame || "current frame"}.`
          : `Canvax inspection unavailable: ${designContext.error || designContext.source}.`,
        designContext.designKit
          ? `Design kit: ${designContext.designKit}.`
          : "No explicit design kit name found.",
        hasDesignTokenCue
          ? "Artifact includes Canvax/source/token cues."
          : "No obvious source/token cues found in artifact text.",
      ],
    }),
    makeCategory({
      id: "tweak-targeting",
      label: "Preview tweak targeting",
      level: hasTweakTarget ? "pass" : "warn",
      detail:
        "Confirms whether a designer correction can map back to a source node or output binding.",
      evidence: [
        ...summarizeChecks(getArtifact("canvax-bindings")),
        designContext.outputBinding
          ? "Output binding is available from Canvax inspect."
          : "No output binding found from Canvax inspect.",
      ],
    }),
    makeCategory({
      id: "motion-readability",
      label: "Motion readability",
      level: hasMotion ? (hasReducedMotion ? "pass" : "warn") : "warn",
      detail:
        "Static review cannot judge timing, but it can detect whether motion exists and whether reduced-motion fallback is declared.",
      evidence: [
        hasMotion ? "Motion CSS cue found." : "No animation or transition cue found.",
        hasReducedMotion
          ? "prefers-reduced-motion fallback found."
          : "No prefers-reduced-motion fallback found.",
      ],
    }),
    makeCategory({
      id: "visual-integrity",
      label: "Visual integrity",
      level: visualStatus,
      detail:
        "Uses local screenshot pixel review for blankness, dimensions, palette variety, dominant color, and contrast spread.",
      evidence:
        visualReview.status === "missing"
          ? ["No visual snapshot review found."]
          : [
              `${String(visualReview.status).toUpperCase()} ${visualReview.score}/100 across ${visualReview.snapshots?.length || 0} snapshot(s).`,
            ],
    }),
    makeCategory({
      id: "production-readiness",
      label: "Production readiness",
      level: worstLevel([artifactStatus, visualStatus]),
      detail:
        "Aggregates static artifact readiness and visual snapshot readiness before treating the output as shippable.",
      evidence: [
        `Artifact status: ${artifactStatus}.`,
        `Visual status: ${visualReview.status || "missing"}.`,
      ],
    }),
  ];
}

function makeCategory(category) {
  return {
    id: category.id,
    label: category.label,
    level: category.level,
    detail: category.detail,
    evidence: category.evidence.filter(Boolean),
  };
}

function levelFromChecks(checks, fallback = "fail") {
  if (!checks.length) {
    return fallback;
  }
  return worstLevel(checks.map((check) => check.level));
}

function summarizeChecks(checks) {
  return checks.map(
    (check) => `${String(check.level).toUpperCase()} ${check.label}: ${check.detail}`,
  );
}

function worstLevel(levels) {
  const normalized = levels.map(normalizeLevel);
  if (normalized.includes("fail")) {
    return "fail";
  }
  if (normalized.includes("warn")) {
    return "warn";
  }
  return "pass";
}

function normalizeLevel(value) {
  if (value === "pass") {
    return "pass";
  }
  if (value === "fail" || value === "blocked") {
    return "fail";
  }
  return "warn";
}

function summarizeStatus(categories) {
  const level = worstLevel(categories.map((category) => category.level));
  return level === "warn" ? "review" : level;
}

function scoreCategories(categories) {
  if (!categories.length) {
    return 0;
  }
  const points = categories.reduce((total, category) => {
    if (category.level === "pass") {
      return total + 1;
    }
    if (category.level === "warn") {
      return total + 0.5;
    }
    return total;
  }, 0);
  return Math.round((points / categories.length) * 100);
}

function buildSummary(status, score, categories, decision) {
  const counts = {
    pass: categories.filter((category) => category.level === "pass").length,
    warn: categories.filter((category) => category.level === "warn").length,
    fail: categories.filter((category) => category.level === "fail").length,
  };
  return `${status.toUpperCase()} ${score}/100. Decision: ${decision}. ${counts.pass} pass, ${counts.warn} warn, ${counts.fail} fail.`;
}

function buildReviewMarkdown(review) {
  const lines = [
    "# Canvax Design Jury Review",
    "",
    `- Status: ${review.status}`,
    `- Decision: ${review.decision}`,
    `- Score: ${review.score}/100`,
    `- Requires OpenAI API key: ${review.requiresOpenAiApiKey ? "yes" : "no"}`,
    "",
    "## Summary",
    "",
    review.summary,
    "",
    "## Categories",
    "",
  ];
  for (const category of review.categories || []) {
    lines.push(`### ${category.label}`);
    lines.push("");
    lines.push(`- Level: ${category.level}`);
    lines.push(`- Detail: ${category.detail}`);
    for (const evidence of category.evidence || []) {
      lines.push(`- Evidence: ${evidence}`);
    }
    lines.push("");
  }
  lines.push("## Boundary");
  lines.push("");
  lines.push(review.noApiBoundary);
  return `${lines.join("\n")}\n`;
}

async function readOptionalJson(path) {
  try {
    await access(path);
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

function runJsonCommand(command, commandArgs) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, commandArgs, {
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
      if (code !== 0) {
        rejectPromise(
          new Error(stderr.trim() || `${command} exited with code ${code}`),
        );
        return;
      }
      try {
        resolvePromise(JSON.parse(stdout));
      } catch (error) {
        rejectPromise(
          new Error(
            `Could not parse JSON from ${command}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    });
  });
}

function parseArgs(argv) {
  const options = {
    artifacts: [],
    images: [],
    snapshotIndex: "",
    text: "",
    dryRun: false,
    json: false,
    markdown: false,
    skipInspect: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--artifact" || arg === "--html" || arg === "--file") {
      options.artifacts.push(argv[++index] || "");
    } else if (arg === "--image" || arg === "--screenshot") {
      options.images.push(argv[++index] || "");
    } else if (arg === "--snapshot-index" || arg === "--index") {
      options.snapshotIndex = argv[++index] || "";
    } else if (arg === "--text") {
      options.text = argv[++index] || "";
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--markdown") {
      options.markdown = true;
    } else if (arg === "--skip-inspect") {
      options.skipInspect = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  options.artifacts = options.artifacts.filter(Boolean);
  options.images = options.images.filter(Boolean);
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

function printResult(review, markdown, options) {
  if (options.json) {
    console.log(JSON.stringify(review, null, 2));
    return;
  }
  if (options.markdown) {
    console.log(markdown || buildReviewMarkdown(review));
    return;
  }
  if (!review.ok) {
    console.log(`fail: ${review.error || review.summary || "design jury failed"}`);
    return;
  }
  console.log(
    `${review.status === "pass" ? "ok" : "review"}: ${review.summary}`,
  );
  if (!options.dryRun) {
    console.log(`json: ${relativeProjectPath(defaultJsonPath)}`);
  }
}

function printHelp() {
  console.log(`Usage:
  node scripts/review-design-jury.mjs --artifact artifacts/preview/home.html
  node scripts/review-design-jury.mjs --text "<main><h1>Hello</h1></main>"
  node scripts/review-design-jury.mjs --artifact home.html --image screenshot.png
  node scripts/review-design-jury.mjs --dry-run --json

Runs a local no-API design jury over generated Canvax output. It combines static
artifact review, local screenshot pixel review, and Canvax inspection context
into a designer-facing verdict across hierarchy, accessibility, responsiveness,
brand/system fit, tweak targeting, motion readability, visual integrity, and
production readiness.`);
}
