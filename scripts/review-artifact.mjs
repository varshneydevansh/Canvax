#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const exportsRoot = resolve(projectRoot, "exports");
const defaultJsonPath = resolve(
  exportsRoot,
  "canvax-artifact-review-latest.json",
);
const defaultMarkdownPath = resolve(
  exportsRoot,
  "canvax-artifact-review-latest.md",
);

const args = process.argv.slice(2);
const wantsHelp = args.includes("--help") || args.includes("-h");
const wantsJson = args.includes("--json");
const dryRun = args.includes("--dry-run");

if (wantsHelp) {
  printHelp();
  process.exit(0);
}

const source = await readSource(args);
const review = buildArtifactReview(source);
const markdown = buildReviewMarkdown(review);

if (!dryRun) {
  await mkdir(exportsRoot, { recursive: true });
  await writeFile(defaultJsonPath, `${JSON.stringify(review, null, 2)}\n`);
  await writeFile(defaultMarkdownPath, markdown);
}

if (wantsJson) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        jsonPath: dryRun ? "" : toProjectRelative(defaultJsonPath),
        markdownPath: dryRun ? "" : toProjectRelative(defaultMarkdownPath),
        review,
      },
      null,
      2,
    ),
  );
} else {
  console.log(
    dryRun
      ? `Reviewed ${source.label}: ${review.status} (${review.score}/100, dry run).`
      : `Reviewed ${source.label}: ${review.status} (${review.score}/100) -> ${toProjectRelative(defaultJsonPath)}.`,
  );
}

async function readSource(argv) {
  const inlineText = readOption(argv, "--text");
  if (inlineText) {
    return {
      type: "inline-text",
      label: "Inline HTML/CSS text",
      path: "",
      text: inlineText,
    };
  }

  const file = readOption(argv, "--file") || readOption(argv, "--html");
  if (file) {
    const path = resolve(projectRoot, file);
    return {
      type: "file",
      label: toProjectRelative(path),
      path: toProjectRelative(path),
      text: await readFile(path, "utf8"),
    };
  }

  throw new Error("Provide --file, --html, or --text. Use --help for examples.");
}

function buildArtifactReview(source) {
  const text = String(source.text || "");
  const html = stripStyleAndScript(text);
  const css = extractCssText(text);
  const checks = [
    checkMainLandmark(html),
    checkHeadingStructure(html),
    checkActionLabels(html),
    checkLinkTargets(html),
    checkImageAlternatives(html),
    checkFormLabels(html),
    checkResponsiveViewport(text),
    checkResponsiveCss(css),
    checkFocusStyles(css),
    checkCanvaxBindings(text),
  ];
  const score = scoreChecks(checks);
  const status = checks.some((check) => check.level === "fail")
    ? "fail"
    : checks.some((check) => check.level === "warn")
      ? "review"
      : "pass";

  return {
    schemaVersion: 1,
    kind: "canvax-artifact-design-review",
    createdAt: new Date().toISOString(),
    requiresOpenAiApiKey: false,
    source: {
      type: source.type,
      label: source.label,
      path: source.path,
      scannedCharacters: text.length,
    },
    status,
    score,
    checks,
    summary: buildReviewSummary(checks, score, status),
    noApiBoundary:
      "This review scans static HTML/CSS source only; it does not call a hosted model, image API, browser renderer, or paid API.",
  };
}

function checkMainLandmark(html) {
  const hasMain =
    /<main\b/i.test(html) || /\brole\s*=\s*["']main["']/i.test(html);
  return makeCheck({
    id: "main-landmark",
    label: "Main landmark",
    level: hasMain ? "pass" : "fail",
    detail: hasMain
      ? "Artifact exposes a main landmark."
      : "Add a <main> element or role=\"main\" so Codex and assistive tech can identify the primary surface.",
  });
}

function checkHeadingStructure(html) {
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((match) => ({
      level: Number(match[1]),
      text: cleanText(match[2]),
    }))
    .filter((heading) => heading.text);
  const h1Count = headings.filter((heading) => heading.level === 1).length;
  return makeCheck({
    id: "heading-structure",
    label: "Heading structure",
    level: h1Count === 1 ? "pass" : h1Count > 1 ? "warn" : "fail",
    detail:
      h1Count === 1
        ? `Found one H1: ${headings.find((heading) => heading.level === 1)?.text}`
        : h1Count > 1
          ? `Found ${h1Count} H1 headings; consider one primary H1 for the screen.`
          : "Add one visible H1 so the generated surface has a clear top-level idea.",
    evidence: headings.slice(0, 8).map((heading) => `H${heading.level}: ${heading.text}`),
  });
}

function checkActionLabels(html) {
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
  const unlabeled = buttons.filter((match) => {
    const label = extractAttribute(match[1], "aria-label") || cleanText(match[2]);
    return !label;
  });
  return makeCheck({
    id: "action-labels",
    label: "Action labels",
    level: unlabeled.length ? "fail" : buttons.length ? "pass" : "warn",
    detail: unlabeled.length
      ? `${unlabeled.length} button(s) need visible text or aria-label.`
      : buttons.length
        ? `${buttons.length} button action(s) have labels.`
        : "No button actions found; confirm this is intentional for the surface.",
  });
}

function checkLinkTargets(html) {
  const links = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const missing = links.filter((match) => {
    const href = extractAttribute(match[1], "href");
    const label = extractAttribute(match[1], "aria-label") || cleanText(match[2]);
    return !href || !label;
  });
  return makeCheck({
    id: "link-targets",
    label: "Link targets",
    level: missing.length ? "fail" : links.length ? "pass" : "warn",
    detail: missing.length
      ? `${missing.length} link(s) need both href and readable label.`
      : links.length
        ? `${links.length} link(s) have href and label.`
        : "No links found; confirm this is intentional.",
  });
}

function checkImageAlternatives(html) {
  const images = [...html.matchAll(/<img\b([^>]*)>/gi)];
  const missing = images.filter((match) => !extractAttribute(match[1], "alt"));
  return makeCheck({
    id: "image-alternatives",
    label: "Image alternatives",
    level: missing.length ? "fail" : images.length ? "pass" : "warn",
    detail: missing.length
      ? `${missing.length} image(s) need alt text or an explicit empty alt for decorative images.`
      : images.length
        ? `${images.length} image(s) include alt text.`
        : "No image tags found.",
  });
}

function checkFormLabels(html) {
  const controls = [
    ...html.matchAll(/<(input|textarea|select)\b([^>]*)>/gi),
  ].filter((match) => {
    const type = extractAttribute(match[2], "type").toLowerCase();
    return type !== "hidden";
  });
  const labels = [...html.matchAll(/<label\b([^>]*)>/gi)].map((match) =>
    extractAttribute(match[1], "for"),
  );
  const labelSet = new Set(labels.filter(Boolean));
  const missing = controls.filter((match) => {
    const attributes = match[2];
    const id = extractAttribute(attributes, "id");
    return !(
      extractAttribute(attributes, "aria-label") ||
      extractAttribute(attributes, "aria-labelledby") ||
      (id && labelSet.has(id))
    );
  });
  return makeCheck({
    id: "form-labels",
    label: "Form labels",
    level: missing.length ? "fail" : controls.length ? "pass" : "warn",
    detail: missing.length
      ? `${missing.length} form control(s) need label, aria-label, or aria-labelledby.`
      : controls.length
        ? `${controls.length} form control(s) have label metadata.`
        : "No form controls found.",
  });
}

function checkResponsiveViewport(text) {
  const hasViewport =
    /<meta\b[^>]*name\s*=\s*["']viewport["'][^>]*>/i.test(text) ||
    /<meta\b[^>]*content\s*=\s*["'][^"']*width=device-width/i.test(text);
  return makeCheck({
    id: "responsive-viewport",
    label: "Responsive viewport",
    level: hasViewport ? "pass" : "warn",
    detail: hasViewport
      ? "Viewport meta is present."
      : "Add a viewport meta tag before treating the artifact as mobile-ready.",
  });
}

function checkResponsiveCss(css) {
  const hasResponsiveCue =
    /@media\b/i.test(css) ||
    /\b(clamp|minmax|auto-fit|auto-fill)\s*\(/i.test(css) ||
    /\b(grid|flex)\b/i.test(css);
  return makeCheck({
    id: "responsive-css",
    label: "Responsive CSS",
    level: hasResponsiveCue ? "pass" : "warn",
    detail: hasResponsiveCue
      ? "Responsive CSS cues found."
      : "Add media queries, flexible layout, or fluid sizing before production port.",
  });
}

function checkFocusStyles(css) {
  const hasFocus = /:(focus-visible|focus)\b/i.test(css);
  return makeCheck({
    id: "focus-styles",
    label: "Focus styles",
    level: hasFocus ? "pass" : "warn",
    detail: hasFocus
      ? "Focus style selectors are present."
      : "Add visible focus styles for keyboard users.",
  });
}

function checkCanvaxBindings(text) {
  const bindingCount = [...text.matchAll(/\bdata-canvax-node-id\s*=/gi)].length;
  return makeCheck({
    id: "canvax-bindings",
    label: "Canvax source bindings",
    level: bindingCount ? "pass" : "warn",
    detail: bindingCount
      ? `${bindingCount} Canvax source binding(s) found.`
      : "No data-canvax-node-id bindings found; future correction mapping may be weaker.",
  });
}

function makeCheck(check) {
  return {
    id: check.id,
    label: check.label,
    level: check.level,
    detail: check.detail,
    evidence: check.evidence || [],
  };
}

function scoreChecks(checks) {
  if (!checks.length) {
    return 0;
  }
  const points = checks.reduce((total, check) => {
    if (check.level === "pass") {
      return total + 1;
    }
    if (check.level === "warn") {
      return total + 0.5;
    }
    return total;
  }, 0);
  return Math.round((points / checks.length) * 100);
}

function buildReviewSummary(checks, score, status) {
  const counts = {
    pass: checks.filter((check) => check.level === "pass").length,
    warn: checks.filter((check) => check.level === "warn").length,
    fail: checks.filter((check) => check.level === "fail").length,
  };
  return `${status.toUpperCase()} ${score}/100. ${counts.pass} pass, ${counts.warn} warn, ${counts.fail} fail.`;
}

function buildReviewMarkdown(review) {
  const lines = [
    "# Canvax Artifact Design Review",
    "",
    `- Source: ${review.source.label}`,
    `- Status: ${review.status}`,
    `- Score: ${review.score}/100`,
    `- Requires OpenAI API key: ${review.requiresOpenAiApiKey ? "yes" : "no"}`,
    "",
    "## Summary",
    "",
    review.summary,
    "",
    "## Checks",
    "",
    ...review.checks.map(
      (check) => `- ${check.level.toUpperCase()} ${check.label}: ${check.detail}`,
    ),
    "",
    "## Boundary",
    "",
    review.noApiBoundary,
  ];
  return `${lines.join("\n")}\n`;
}

function stripStyleAndScript(text) {
  return String(text || "").replace(
    /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,
    " ",
  );
}

function extractCssText(text) {
  const blocks = [...String(text || "").matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((match) => match[1])
    .join("\n");
  return `${blocks}\n${text}`;
}

function extractAttribute(attributes, name) {
  const pattern = new RegExp(
    `\\b${escapeRegExp(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{([^}]*)\\}|([^\\s>]+))`,
    "i",
  );
  const match = String(attributes || "").match(pattern);
  return cleanText(match?.[1] || match?.[2] || match?.[3] || match?.[4] || "");
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function readOption(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) {
    return "";
  }
  return cleanString(argv[index + 1]);
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toProjectRelative(path) {
  return path.replace(`${projectRoot}/`, "");
}

function printHelp() {
  console.log(`Canvax artifact design review

Usage:
  node scripts/review-artifact.mjs --file artifacts/preview/home.html
  node scripts/review-artifact.mjs --text "<main><h1>Hello</h1></main>"
  node scripts/review-artifact.mjs --dry-run --json --file artifacts/preview/home.html

Options:
  --file PATH  Review a local HTML file
  --html PATH  Alias for --file
  --text HTML  Review inline HTML/CSS text
  --json       Print the review wrapper as JSON
  --dry-run    Do not write exports/canvax-artifact-review-latest.*

This is a local no-API static review. It does not render a browser screenshot,
inspect a live DOM, or call a hosted model.`);
}
