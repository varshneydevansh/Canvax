#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const exportsRoot = resolve(projectRoot, "exports");
const defaultIndexPath = resolve(
  projectRoot,
  "artifacts",
  "canvax",
  "browser-snapshots",
  "latest",
  "index.json",
);
const defaultJsonPath = resolve(
  exportsRoot,
  "canvax-visual-snapshot-review-latest.json",
);
const defaultMarkdownPath = resolve(
  exportsRoot,
  "canvax-visual-snapshot-review-latest.md",
);

const args = parseArgs(process.argv.slice(2));

try {
  const review = await buildVisualSnapshotReview(args);
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
    kind: "canvax-visual-snapshot-review",
    schemaVersion: 1,
    requiresOpenAiApiKey: false,
    error: error instanceof Error ? error.message : String(error),
  };
  printResult(payload, "", args);
  process.exitCode = 1;
}

async function buildVisualSnapshotReview(options) {
  const source = await resolveSnapshotSource(options);
  const snapshots = [];
  for (const snapshot of source.snapshots) {
    snapshots.push(await reviewSnapshot(snapshot));
  }
  const status = summarizeStatus(snapshots.flatMap((snapshot) => snapshot.checks));
  const score = scoreChecks(snapshots.flatMap((snapshot) => snapshot.checks));
  return {
    ok: status !== "fail",
    kind: "canvax-visual-snapshot-review",
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    requiresOpenAiApiKey: false,
    dryRun: options.dryRun,
    source: {
      type: source.type,
      indexPath: source.indexPath ? relativeProjectPath(source.indexPath) : "",
      snapshotCount: snapshots.length,
    },
    status,
    score,
    snapshots,
    summary: `${status.toUpperCase()} ${score}/100 across ${snapshots.length} visual snapshot(s).`,
    noApiBoundary:
      "This review samples local screenshot pixels only. It does not call a hosted model, image API, browser renderer, or paid API.",
  };
}

async function resolveSnapshotSource(options) {
  if (options.images.length) {
    return {
      type: "explicit-images",
      indexPath: "",
      snapshots: options.images.map((path, index) => ({
        surface: `image-${index + 1}`,
        viewport: null,
        path,
      })),
    };
  }

  const indexPath = resolveProjectPath(options.index || defaultIndexPath);
  const parsed = JSON.parse(await readFile(indexPath, "utf8"));
  const snapshots = Array.isArray(parsed.snapshots) ? parsed.snapshots : [];
  if (!snapshots.length) {
    throw new Error(`No snapshots found in ${relativeProjectPath(indexPath)}.`);
  }
  return {
    type: "browser-snapshot-index",
    indexPath,
    snapshots,
  };
}

async function reviewSnapshot(snapshot) {
  const tokenPack = await extractImageTokens(snapshot.path);
  const samples = tokenPack.source?.imageSamples || {};
  const palette = Array.isArray(samples.palette) ? samples.palette : [];
  const sampleCount = samples.sampleCount || 0;
  const width = samples.width || 0;
  const height = samples.height || 0;
  const topColorRatio = sampleCount
    ? (palette[0]?.count || 0) / sampleCount
    : 1;
  const contrastSpread = computeContrastSpread(palette.slice(0, 12));
  const checks = [
    checkDimensions(snapshot, width, height),
    checkSampleCount(sampleCount),
    checkPaletteVariety(palette),
    checkDominantColor(topColorRatio),
    checkContrastSpread(contrastSpread),
  ];
  return {
    surface: snapshot.surface || "",
    viewport: snapshot.viewport || null,
    path: snapshot.path,
    status: summarizeStatus(checks),
    score: scoreChecks(checks),
    dimensions: { width, height },
    sampleCount,
    palette: palette.slice(0, 12),
    metrics: {
      topColorRatio: Number(topColorRatio.toFixed(4)),
      contrastSpread: Number(contrastSpread.toFixed(2)),
    },
    checks,
  };
}

async function extractImageTokens(imagePath) {
  const payload = await runJsonCommand("node", [
    "scripts/extract-design-tokens.mjs",
    "--image",
    imagePath,
    "--dry-run",
    "--json",
  ]);
  return payload.tokenPack;
}

function checkDimensions(snapshot, width, height) {
  const expectedWidth = Number(snapshot.viewport?.width || 0);
  const expectedHeight = Number(snapshot.viewport?.height || 0);
  const matches =
    !expectedWidth ||
    !expectedHeight ||
    (width === expectedWidth && height === expectedHeight);
  return makeCheck({
    id: "dimensions",
    label: "Snapshot dimensions",
    level: width > 0 && height > 0 && matches ? "pass" : "fail",
    detail: matches
      ? `${width}x${height} snapshot dimensions are valid.`
      : `Expected ${expectedWidth}x${expectedHeight}, got ${width}x${height}.`,
  });
}

function checkSampleCount(sampleCount) {
  return makeCheck({
    id: "sample-count",
    label: "Pixel sample count",
    level: sampleCount >= 5000 ? "pass" : sampleCount >= 1000 ? "warn" : "fail",
    detail: `${sampleCount} pixels sampled from the snapshot.`,
  });
}

function checkPaletteVariety(palette) {
  const count = palette.length;
  return makeCheck({
    id: "palette-variety",
    label: "Palette variety",
    level: count >= 8 ? "pass" : count >= 4 ? "warn" : "fail",
    detail:
      count >= 8
        ? `${count} sampled colors indicate non-blank visual structure.`
        : `${count} sampled colors; review for blank, clipped, or flat output.`,
  });
}

function checkDominantColor(topColorRatio) {
  return makeCheck({
    id: "dominant-color",
    label: "Dominant color balance",
    level:
      topColorRatio < 0.5 ? "pass" : topColorRatio < 0.82 ? "warn" : "fail",
    detail: `${Math.round(topColorRatio * 100)}% of sampled pixels use the top color.`,
  });
}

function checkContrastSpread(contrastSpread) {
  return makeCheck({
    id: "contrast-spread",
    label: "Contrast spread",
    level:
      contrastSpread >= 4.5 ? "pass" : contrastSpread >= 1.4 ? "warn" : "fail",
    detail: `Estimated max palette contrast ratio is ${contrastSpread.toFixed(2)}.`,
  });
}

function computeContrastSpread(palette) {
  const luminances = palette
    .map((entry) => relativeLuminance(entry.hex))
    .filter((value) => Number.isFinite(value));
  if (luminances.length < 2) {
    return 1;
  }
  const min = Math.min(...luminances);
  const max = Math.max(...luminances);
  return (max + 0.05) / (min + 0.05);
}

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function hexToRgb(value) {
  const hex = String(value || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    return [0, 0, 0];
  }
  return [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
}

function makeCheck({ id, label, level, detail }) {
  return { id, label, level, detail };
}

function summarizeStatus(checks) {
  if (checks.some((check) => check.level === "fail")) {
    return "fail";
  }
  if (checks.some((check) => check.level === "warn")) {
    return "review";
  }
  return "pass";
}

function scoreChecks(checks) {
  if (!checks.length) {
    return 0;
  }
  const penalty = checks.reduce((sum, check) => {
    if (check.level === "fail") {
      return sum + 25;
    }
    if (check.level === "warn") {
      return sum + 10;
    }
    return sum;
  }, 0);
  return Math.max(0, Math.round(100 - penalty / checks.length));
}

function buildReviewMarkdown(review) {
  const lines = [
    "# Canvax Visual Snapshot Review",
    "",
    `- Status: ${review.status}`,
    `- Score: ${review.score}/100`,
    `- Requires OpenAI API key: ${review.requiresOpenAiApiKey ? "yes" : "no"}`,
    `- Snapshots: ${review.snapshots?.length || 0}`,
    "",
  ];
  for (const snapshot of review.snapshots || []) {
    lines.push(`## ${snapshot.surface || "Snapshot"}`);
    lines.push("");
    lines.push(`- Path: ${snapshot.path}`);
    lines.push(`- Status: ${snapshot.status}`);
    lines.push(`- Dimensions: ${snapshot.dimensions.width}x${snapshot.dimensions.height}`);
    lines.push(`- Top color ratio: ${Math.round(snapshot.metrics.topColorRatio * 100)}%`);
    lines.push(`- Contrast spread: ${snapshot.metrics.contrastSpread}`);
    lines.push("");
    for (const check of snapshot.checks) {
      lines.push(`- ${check.level.toUpperCase()}: ${check.label} - ${check.detail}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
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
    console.log(`fail: ${review.error || "visual snapshot review failed"}`);
    return;
  }
  console.log(
    `${review.status === "pass" ? "ok" : "review"}: ${review.summary}`,
  );
  if (!options.dryRun) {
    console.log(`json: ${relativeProjectPath(defaultJsonPath)}`);
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
    images: [],
    index: "",
    dryRun: false,
    json: false,
    markdown: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--image" || arg === "--screenshot") {
      options.images.push(argv[++index] || "");
    } else if (arg === "--index") {
      options.index = argv[++index] || "";
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--markdown") {
      options.markdown = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }
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

function printHelp() {
  console.log(`Usage:
  node scripts/review-visual-snapshot.mjs [--image path] [--index path] [--dry-run] [--json]

Reviews local browser screenshots or the latest browser snapshot index for
blankness, palette variety, dimensions, and contrast spread. This is a no-API
pixel-sampling gate, not a hosted AI visual critique or a replacement for manual
design review.`);
}
