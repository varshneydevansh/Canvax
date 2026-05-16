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
const defaultOutputRoot = resolve(
  projectRoot,
  "artifacts",
  "preview",
  "codex-rewrite",
  "frames",
);

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
const relativeHtmlPath = toProjectRelative(htmlPath);
const relativeContextPath = toProjectRelative(contextPath);
const affectedRegions = buildAffectedRegions(selected, request);

await mkdir(outputRoot, { recursive: true });
await writeFile(
  htmlPath,
  buildPreviewHtml({
    request,
    selected,
    frameId,
    frameTitle,
    affectedRegions,
  }),
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
      previewPath: relativeHtmlPath,
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
  queueItem,
}) {
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
      buildPublishNotes(queueItem, affectedRegions),
      "--frame",
      frameId,
      "--artifact",
      `${relativeHtmlPath}::Canvax rewritten preview::${frameId}`,
      "--artifact",
      `${relativeContextPath}::Rewrite request context::${frameId}`,
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
  previewPath,
}) {
  return {
    kind: "canvax-executed-rewrite-preview",
    createdAt: new Date().toISOString(),
    source: "scripts/execute-rewrite-request.mjs",
    requiresOpenAiApiKey: false,
    previewPath,
    frameId,
    frameTitle,
    queueItem: selected.queueItem || null,
    affectedRegions,
    outputTargets: request.outputManifest?.targets || [],
    outputArtifacts: request.outputManifest?.artifacts || [],
    request,
  };
}

function buildAffectedRegions(selected, request) {
  const regions = [];
  const targetRegions =
    request.outputManifest?.targets
      ?.flatMap((target) => target?.refinement?.changedRegions || [])
      .filter((region) => region && typeof region === "object") || [];
  targetRegions.slice(0, 12).forEach((region, index) => {
    regions.push({
      source: "output-refinement",
      label: cleanString(region.label) || `Output delta ${index + 1}`,
      left: safeNumber(region.left, 40 + index * 18),
      top: safeNumber(region.top, 40 + index * 18),
      width: Math.max(24, safeNumber(region.width, 160)),
      height: Math.max(24, safeNumber(region.height, 90)),
    });
  });

  const annotations = selected.requestFrame?.outputAnnotations || [];
  annotations.slice(0, 12).forEach((annotation, index) => {
    const bounds = annotation.bounds || annotation.normalizedBounds || {};
    regions.push({
      source: "output-correction",
      label: `Correction mark ${index + 1}`,
      left: denormalize(bounds.x || bounds.left, 1440, 96 + index * 20),
      top: denormalize(bounds.y || bounds.top, 1024, 96 + index * 20),
      width: Math.max(28, denormalize(bounds.w || bounds.width, 1440, 180)),
      height: Math.max(28, denormalize(bounds.h || bounds.height, 1024, 100)),
    });
  });

  if (!regions.length) {
    regions.push({
      source: "rewrite-queue",
      label: cleanString(selected.queueItem?.label) || "Rewrite focus",
      left: 96,
      top: 96,
      width: 360,
      height: 190,
    });
  }

  return regions.slice(0, 20);
}

function buildPreviewHtml({ request, selected, frameId, frameTitle, affectedRegions }) {
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
      --paper: #fff8ec;
      --ink: #171412;
      --rust: #f25a32;
      --mint: #0c8d7b;
      --blue: #2364aa;
      --gold: #f0a202;
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
        #1d1916;
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
      background: color-mix(in srgb, var(--node-color), white 86%);
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
  <main class="surface" data-frame-id="${escapeHtml(frameId)}">
    <div class="tagline">${escapeHtml(frameTitle)} · Canvax rewrite surface</div>
    <div class="revision">${escapeHtml(cleanString(queueItem.label) || "Rewrite")}</div>
    ${buildElementMarkup(elements)}
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

function buildElementMarkup(elements) {
  return elements.map((element, index) => buildElementNode(element, index)).join("\n");
}

function buildElementNode(element, index) {
  const bounds = element.bounds || {};
  const color = normalizeColor(element.color) || elementColor(index);
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
      return `    <div class="rewrite-region" style="left:${left};top:${top};width:${width};height:${height};"><span>${escapeHtml(region.label)}</span></div>`;
    })
    .join("\n");
}

function buildPublishNotes(queueItem, affectedRegions) {
  const detail = cleanString(queueItem?.detail);
  const regionText = `${affectedRegions.length} affected ${
    affectedRegions.length === 1 ? "region" : "regions"
  }`;
  return [
    "Generated locally from Canvax rewrite request data. No paid API key was required.",
    detail,
    regionText,
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

function elementColor(index) {
  return ["#f25a32", "#0c8d7b", "#2364aa", "#f0a202", "#b246a8"][
    index % 5
  ];
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

Reads a Canvax rewrite request, writes a local refreshed HTML preview artifact
under artifacts/preview/codex-rewrite/frames/<frame-id>/, and publishes a Codex
output manifest binding unless --no-publish is provided.

This is a deterministic local executor for validation and preview binding. It
does not call a paid API and does not replace a real Codex implementation pass.`);
}
