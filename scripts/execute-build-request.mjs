import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const defaultRequestPath = resolve(
  projectRoot,
  "exports",
  "canvax-build-real-latest.json",
);
const defaultOutputRoot = resolve(
  projectRoot,
  "artifacts",
  "preview",
  "codex-build",
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
const request = await readJson(requestPath);

if (request?.kind !== "canvax-build-real-request") {
  fail(`Expected canvax-build-real-request at ${requestPath}`);
}

const frame = request.frame || {};
const frameId = cleanString(request.activeFrameId || frame.id) || "frame";
const frameTitle = cleanString(frame.title || "Canvax frame");
const outputRoot = resolve(defaultOutputRoot, safeSlug(frameId));
const htmlPath = resolve(outputRoot, "index.html");
const contextPath = resolve(outputRoot, "context.json");
const relativeHtmlPath = toProjectRelative(htmlPath);
const relativeContextPath = toProjectRelative(contextPath);

await mkdir(outputRoot, { recursive: true });
await writeFile(htmlPath, buildPreviewHtml(request), "utf8");
await writeFile(
  contextPath,
  `${JSON.stringify(buildContextPayload(request, relativeHtmlPath), null, 2)}\n`,
  "utf8",
);

let publishResult = null;
if (!noPublish) {
  publishResult = await publishCodexOutput({
    frameId,
    frameTitle,
    relativeHtmlPath,
    relativeContextPath,
  });
}

const result = {
  ok: true,
  requestPath: toProjectRelative(requestPath),
  previewPath: relativeHtmlPath,
  contextPath: relativeContextPath,
  frameId,
  frameTitle,
  published: Boolean(publishResult),
  manifestPath: publishResult?.manifestPath || "",
};

if (wantsJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Built Canvax preview artifact: ${relativeHtmlPath}`);
  console.log(`Context: ${relativeContextPath}`);
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
}) {
  const child = spawn(
    process.execPath,
    [
      "scripts/write-codex-output.mjs",
      "--preview-path",
      relativeHtmlPath,
      "--label",
      `${frameTitle} Codex build preview`,
      "--type",
      "implementation-preview",
      "--source",
      "canvax-build-request-executor",
      "--description",
      "Local preview artifact generated from the latest Canvax build request.",
      "--notes",
      "Generated locally from Canvax build request data. No paid API key was required.",
      "--frame",
      frameId,
      "--artifact",
      `${relativeHtmlPath}::Codex build preview::${frameId}`,
      "--artifact",
      `${relativeContextPath}::Build request context::${frameId}`,
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

function buildContextPayload(request, previewPath) {
  return {
    kind: "canvax-executed-build-preview",
    createdAt: new Date().toISOString(),
    source: "scripts/execute-build-request.mjs",
    requiresOpenAiApiKey: false,
    previewPath,
    request,
  };
}

function buildPreviewHtml(request) {
  const frame = request.frame || {};
  const composition = frame.composition || {};
  const viewport = composition.viewport || {};
  const width = Number(viewport.width || frame.viewportWidth || 1440);
  const height = Number(viewport.height || frame.viewportHeight || 1024);
  const elements = Array.isArray(composition.elements)
    ? composition.elements.slice(0, 24)
    : [];
  const board = request.board || {};
  const actionMode = cleanString(request.actionModeLabel || request.actionMode);
  const headline =
    firstMeaningfulLabel(elements) ||
    cleanString(board.project) ||
    cleanString(frame.title) ||
    "Canvax generated surface";
  const subhead =
    cleanString(frame.intent) ||
    cleanString(board.goal) ||
    "Generated from rough sketch geometry, labels, and voice notes.";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(headline)}</title>
  <style>
    :root {
      --paper: #fff7e8;
      --ink: #18110e;
      --red: #ff5d3a;
      --teal: #0c8d7b;
      --blue: #2364aa;
      --gold: #f0a202;
      --shadow: 0 28px 80px rgba(24, 17, 14, 0.18);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: clamp(18px, 3vw, 48px);
      background:
        radial-gradient(circle at 15% 8%, rgba(255, 93, 58, 0.22), transparent 28%),
        radial-gradient(circle at 80% 18%, rgba(35, 100, 170, 0.18), transparent 30%),
        #ece8de;
      color: var(--ink);
      font-family: "Avenir Next", "Segoe UI", sans-serif;
    }
    .surface {
      position: relative;
      width: min(100%, ${width}px);
      aspect-ratio: ${width} / ${height};
      min-height: min(72vh, ${height}px);
      overflow: hidden;
      border: 1px solid rgba(24, 17, 14, 0.1);
      border-radius: 34px;
      background:
        linear-gradient(90deg, rgba(24, 17, 14, 0.035) 1px, transparent 1px),
        linear-gradient(rgba(24, 17, 14, 0.035) 1px, transparent 1px),
        linear-gradient(135deg, rgba(255, 93, 58, 0.08), transparent 46%),
        var(--paper);
      background-size: 64px 64px, 64px 64px, auto, auto;
      box-shadow: var(--shadow);
    }
    .chrome {
      position: absolute;
      inset: 24px 24px auto;
      z-index: 4;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      color: rgba(24, 17, 14, 0.68);
      font-size: clamp(12px, 1.3vw, 16px);
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .hero-copy {
      position: absolute;
      z-index: 3;
      left: 7%;
      bottom: 9%;
      width: min(48%, 640px);
      display: grid;
      gap: 18px;
    }
    h1 {
      margin: 0;
      max-width: 11ch;
      font-family: "Iowan Old Style", Georgia, serif;
      font-size: clamp(48px, 8vw, 132px);
      line-height: 0.88;
      letter-spacing: -0.07em;
    }
    .subhead {
      margin: 0;
      max-width: 56ch;
      color: rgba(24, 17, 14, 0.72);
      font-size: clamp(16px, 1.5vw, 22px);
      line-height: 1.45;
    }
    .cta {
      width: fit-content;
      padding: 13px 18px;
      border: 2px solid var(--ink);
      background: var(--red);
      color: white;
      box-shadow: 8px 8px 0 var(--ink);
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .node {
      position: absolute;
      z-index: 2;
      display: grid;
      align-content: center;
      min-width: 60px;
      min-height: 44px;
      padding: 14px;
      border: 2px solid color-mix(in srgb, var(--node-color), var(--ink) 18%);
      background: color-mix(in srgb, var(--node-color), white 84%);
      box-shadow: 12px 14px 0 rgba(24, 17, 14, 0.12);
      color: var(--ink);
      font-weight: 800;
    }
    .node-label {
      display: inline-flex;
      width: fit-content;
      margin-bottom: 6px;
      padding: 4px 9px;
      border-radius: 999px;
      background: white;
      color: rgba(24, 17, 14, 0.68);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .node strong {
      font-size: clamp(16px, 2vw, 28px);
      line-height: 1;
    }
    .node p {
      margin: 8px 0 0;
      color: rgba(24, 17, 14, 0.58);
      font-size: 14px;
      line-height: 1.35;
    }
    .node.path,
    .node.line,
    .node.arrow {
      min-height: 10px;
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
      box-shadow: 0 16px 36px rgba(24, 17, 14, 0.12);
    }
    .node.image {
      border-style: dashed;
      background:
        linear-gradient(135deg, rgba(12, 141, 123, 0.14), transparent),
        #f7efe0;
    }
    @media (max-width: 760px) {
      body { padding: 0; }
      .surface { width: 100vw; min-height: 100vh; border-radius: 0; }
      .hero-copy { left: 6%; right: 6%; bottom: 7%; width: auto; }
      .node { opacity: 0.9; }
    }
  </style>
</head>
<body>
  <main class="surface" data-frame-id="${escapeHtml(frame.id || "")}">
    <div class="chrome">
      <span>${escapeHtml(cleanString(frame.title) || "Canvax frame")}</span>
      <span>${escapeHtml(actionMode || "Build UI")}</span>
    </div>
    ${buildElementMarkup(elements)}
    <section class="hero-copy">
      <h1>${escapeHtml(headline)}</h1>
      <p class="subhead">${escapeHtml(subhead)}</p>
      <div class="cta">Generated from Canvax</div>
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

function firstMeaningfulLabel(elements) {
  return (
    elements
      .filter((element) => element.type === "label")
      .map((element) => cleanString(element.text))
      .find((text) => text && text.length > 2) || ""
  );
}

function elementColor(index) {
  return ["#ff5d3a", "#0c8d7b", "#2364aa", "#f0a202", "#b246a8"][
    index % 5
  ];
}

function percent(value, fallback) {
  const numeric = Number.isFinite(value) ? value : fallback;
  return `${Math.max(0, Math.min(1, numeric)) * 100}%`;
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
  console.log(`execute-build-request

Usage:
  node scripts/execute-build-request.mjs
  node scripts/execute-build-request.mjs --request exports/canvax-build-real-latest.json
  node scripts/execute-build-request.mjs --no-publish --json

Reads a Canvax build-real request, writes a local HTML preview artifact under
artifacts/preview/codex-build/frames/<frame-id>/, and publishes a Codex output
manifest binding unless --no-publish is provided.

This is a deterministic local executor for validation and preview binding. It
does not call a paid API and does not replace a real Codex implementation pass.`);
}
