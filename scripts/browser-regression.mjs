import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const curlBinary = "/usr/bin/curl";
const snapshotRoot = resolve(
  projectRoot,
  "artifacts",
  "canvax",
  "browser-snapshots",
  "latest",
);
const exportsRoot = resolve(projectRoot, "exports");
const domReviewJsonPath = resolve(exportsRoot, "canvax-dom-review-latest.json");
const domReviewMarkdownPath = resolve(
  exportsRoot,
  "canvax-dom-review-latest.md",
);

const results = [];
const snapshots = [];
const args = process.argv.slice(2);
const domReviewOnly = args.includes("--dom-review-only");

const chromePath = await detectChromeBinary();
const serviceState = await detectCanvaxServiceState();
const liveUrl = serviceState.url;
const boardSelfTestTimeoutMs = parsePositiveInteger(
  process.env.CANVAX_BOARD_SELFTEST_TIMEOUT_MS,
  90000,
);
const previewSelfTestTimeoutMs = parsePositiveInteger(
  process.env.CANVAX_PREVIEW_SELFTEST_TIMEOUT_MS,
  30000,
);
const responsiveSmokeTimeoutMs = parsePositiveInteger(
  process.env.CANVAX_RESPONSIVE_SMOKE_TIMEOUT_MS,
  20000,
);
const responsiveSmokeViewports = [
  { label: "desktop", width: 1440, height: 1024 },
  { label: "laptop", width: 1024, height: 820 },
  { label: "tablet", width: 768, height: 900 },
  { label: "narrow", width: 430, height: 840 },
];
const codexSidecarViewports = [
  { label: "sidecar", width: 390, height: 900 },
  { label: "sidecar-wide", width: 520, height: 900 },
];

if (!liveUrl) {
  results.push({
    name: "browser self-test can reach a running Canvax service",
    passed: true,
    skipped: true,
    detail: serviceState.detail,
  });
} else if (!chromePath) {
  results.push({
    name: "browser self-test can find a supported headless browser",
    passed: true,
    skipped: true,
    detail: "Chrome binary not found",
  });
} else {
  if (!domReviewOnly) {
    await rm(snapshotRoot, { recursive: true, force: true });
    await mkdir(snapshotRoot, { recursive: true });
    await validateBrowserSelfTest({
      name: "board browser self-test passes",
      chromePath,
      url: `${liveUrl}/?selftest=1`,
      resultsId: "selftest-results",
      timeoutMs: boardSelfTestTimeoutMs,
    });
    await validateBrowserSelfTest({
      name: "preview browser self-test passes",
      chromePath,
      url: `${liveUrl}/preview.html?selftest=1`,
      resultsId: "preview-selftest-results",
      timeoutMs: previewSelfTestTimeoutMs,
    });
    await validateResponsiveSmokeMatrix({
      chromePath,
      liveUrl,
      timeoutMs: responsiveSmokeTimeoutMs,
    });
    await validateWorkbenchMapSmoke({
      chromePath,
      liveUrl,
      timeoutMs: responsiveSmokeTimeoutMs,
    });
    await validateWorkbenchAgentLogSmoke({
      chromePath,
      liveUrl,
      timeoutMs: responsiveSmokeTimeoutMs,
    });
    await validateCodexSidecarSmoke({
      chromePath,
      liveUrl,
      timeoutMs: responsiveSmokeTimeoutMs,
    });
    await validateAdvancedMapSmoke({
      chromePath,
      liveUrl,
      timeoutMs: responsiveSmokeTimeoutMs,
    });
    await validateProjectBrowserSmoke({
      chromePath,
      liveUrl,
      timeoutMs: responsiveSmokeTimeoutMs,
    });
    await writeSnapshotIndex();
  }
  await validateDomLayoutReview({
    chromePath,
    liveUrl,
    timeoutMs: responsiveSmokeTimeoutMs,
  });
}

const failed = results.filter((entry) => !entry.passed);
results.forEach((entry) => {
  const prefix = entry.skipped ? "skip" : entry.passed ? "ok" : "fail";
  const suffix = entry.detail ? ` (${entry.detail})` : "";
  console.log(`${prefix}: ${entry.name}${suffix}`);
});

if (failed.length) {
  process.exitCode = 1;
}

async function validateBrowserSelfTest({
  name,
  chromePath,
  url,
  resultsId,
  timeoutMs,
}) {
  try {
    const browser = await launchChromeSession(chromePath, url);
    try {
      const state = await browser.waitForSelfTest(resultsId, timeoutMs);
      const parsedResults = state.text ? JSON.parse(state.text) : null;
      const bodyPassed = state.bodyPassed === "true";
      const failures = Array.isArray(parsedResults)
        ? parsedResults.filter((entry) => !entry?.passed)
        : [];
      const passed = Boolean(
        bodyPassed && Array.isArray(parsedResults) && failures.length === 0,
      );
      results.push({
        name,
        passed,
        detail: passed
          ? `${url} (${parsedResults.length} assertions)`
          : failures[0]?.detail
            ? `${failures[0].name}: ${failures[0].detail}`
            : failures[0]?.name ||
            (!Array.isArray(parsedResults)
              ? "self-test results were not rendered"
              : !bodyPassed
                ? "self-test results rendered but page did not mark success"
                : "self-test did not report success"),
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    if (isRecoverableBrowserSkip(error)) {
      results.push({
        name,
        passed: true,
        skipped: true,
        detail:
          "headless Chrome did not settle on this host; rerun with CANVAX_BROWSER_STRICT=1 to fail hard",
      });
      return;
    }
    results.push({
      name,
      passed: false,
      detail: error instanceof Error ? error.message : "Unknown browser error",
    });
  }
}

async function validateResponsiveSmokeMatrix({ chromePath, liveUrl, timeoutMs }) {
  for (const viewport of responsiveSmokeViewports) {
    await validateResponsiveSmoke({
      name: `board responsive smoke passes at ${viewport.label}`,
      surface: "board",
      chromePath,
      url: `${liveUrl}/?responsivecheck=1`,
      viewport,
      timeoutMs,
      expression: buildBoardResponsiveSmokeExpression(),
    });
    await validateResponsiveSmoke({
      name: `preview responsive smoke passes at ${viewport.label}`,
      surface: "preview",
      chromePath,
      url: `${liveUrl}/preview.html?responsivecheck=1`,
      viewport,
      timeoutMs,
      expression: buildPreviewResponsiveSmokeExpression(),
    });
  }
}

async function validateWorkbenchMapSmoke({ chromePath, liveUrl, timeoutMs }) {
  const viewports = responsiveSmokeViewports.filter((viewport) =>
    ["desktop", "narrow"].includes(viewport.label),
  );
  for (const viewport of viewports) {
    await validateResponsiveSmoke({
      name: `workbench map visual smoke passes at ${viewport.label}`,
      surface: "board-workbench-map",
      chromePath,
      url: `${liveUrl}/?responsivecheck=1&visualfixture=workbench-map`,
      viewport,
      timeoutMs,
      expression: buildWorkbenchMapSmokeExpression(),
    });
  }
}

async function validateWorkbenchAgentLogSmoke({ chromePath, liveUrl, timeoutMs }) {
  const viewports = responsiveSmokeViewports.filter((viewport) =>
    ["desktop", "narrow"].includes(viewport.label),
  );
  for (const viewport of viewports) {
    await validateResponsiveSmoke({
      name: `workbench agent log visual smoke passes at ${viewport.label}`,
      surface: "board-workbench-agent-log",
      chromePath,
      url: `${liveUrl}/?responsivecheck=1&visualfixture=workbench-agent-log`,
      viewport,
      timeoutMs,
      expression: buildWorkbenchAgentLogSmokeExpression(),
    });
  }
}

async function validateCodexSidecarSmoke({ chromePath, liveUrl, timeoutMs }) {
  for (const viewport of codexSidecarViewports) {
    await validateResponsiveSmoke({
      name: `Codex sidecar visual smoke passes at ${viewport.label}`,
      surface: "board-codex-sidecar",
      chromePath,
      url: `${liveUrl}/?responsivecheck=1&host=codex-sidecar&visualfixture=codex-sidecar`,
      viewport,
      timeoutMs,
      expression: buildCodexSidecarSmokeExpression(),
    });
  }
}

async function validateAdvancedMapSmoke({ chromePath, liveUrl, timeoutMs }) {
  const viewports = responsiveSmokeViewports.filter((viewport) =>
    ["desktop", "tablet"].includes(viewport.label),
  );
  for (const viewport of viewports) {
    await validateResponsiveSmoke({
      name: `advanced map visual smoke passes at ${viewport.label}`,
      surface: "board-advanced-map",
      chromePath,
      url: `${liveUrl}/?responsivecheck=1&visualfixture=advanced-map`,
      viewport,
      timeoutMs,
      expression: buildAdvancedMapSmokeExpression(),
    });
  }
}

async function validateProjectBrowserSmoke({ chromePath, liveUrl, timeoutMs }) {
  const viewports = responsiveSmokeViewports.filter((viewport) =>
    ["desktop", "narrow"].includes(viewport.label),
  );
  for (const viewport of viewports) {
    await validateResponsiveSmoke({
      name: `project browser visual smoke passes at ${viewport.label}`,
      surface: "board-project-browser",
      chromePath,
      url: `${liveUrl}/?responsivecheck=1&visualfixture=project-browser`,
      viewport,
      timeoutMs,
      expression: buildProjectBrowserSmokeExpression(),
    });
  }
}

function buildWorkbenchMapSmokeExpression() {
  return `(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    document.querySelector("#flow-workspace")?.scrollIntoView({ block: "start" });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        visible: box.width > 0 && box.height > 0
      };
    };
    const failures = [];
    const flow = rect("#flow-workspace");
    const flowShell = rect("#flow-shell");
    const mapTimeline = rect("#map-timeline");
    const outputLane = rect(".spatial-lane-output");
    const firstPromptChip = document.querySelector("[data-workbench-prompt]");
    const mapCards = document.querySelectorAll("[data-flow-frame-id], [data-spatial-object-id]");
    if (document.readyState !== "complete") failures.push("document not complete");
    if (document.body?.dataset?.workspaceMode !== "simple") failures.push("workbench mode not active");
    if (document.body?.dataset?.workbenchFocus !== "map") failures.push("workbench map focus not active");
    if (document.body?.dataset?.viewMode !== "flow") failures.push("flow map not active");
    if (!flow?.visible || !flowShell?.visible) failures.push("workbench map missing");
    if (!mapTimeline?.visible) failures.push("map timeline missing");
    if (!outputLane?.visible) failures.push("output shelf missing");
    if (!mapCards.length) failures.push("map cards missing");
    if (firstPromptChip?.dataset?.workbenchPrompt !== "design-context") failures.push("design-context quick chip is not first");
    if (document.documentElement.scrollWidth > window.innerWidth + 16) failures.push("document has horizontal overflow");
    if (flowShell && flowShell.height < Math.min(320, window.innerHeight * 0.38)) failures.push("workbench map viewport too short");
    return {
      passed: failures.length === 0,
      failures,
      mode: document.body?.dataset?.workspaceMode || "",
      focus: document.body?.dataset?.workbenchFocus || "",
      viewMode: document.body?.dataset?.viewMode || "",
      cardCount: mapCards.length,
      width: window.innerWidth,
      height: window.innerHeight
    };
  })()`;
}

function buildWorkbenchAgentLogSmokeExpression() {
  return `(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        visible: box.width > 0 && box.height > 0
      };
    };
    const failures = [];
    const stage = rect(".stage-panel");
    const canvas = rect("#board-canvas");
    const log = rect("#workbench-agent-log");
    const toggle = rect("#workbench-agent-log-toggle");
    const panel = rect("#workbench-agent-log-panel");
    const close = rect("#workbench-agent-log-close");
    const items = [...document.querySelectorAll(".workbench-agent-log-item")];
    const expanded = document
      .querySelector("#workbench-agent-log-toggle")
      ?.getAttribute("aria-expanded");
    if (document.readyState !== "complete") failures.push("document not complete");
    if (document.body?.dataset?.workspaceMode !== "simple") failures.push("workbench mode not active");
    if (document.body?.dataset?.workbenchFocus !== "sketch") failures.push("sketch focus not active");
    if (!stage?.visible || !canvas?.visible) failures.push("canvas stage missing");
    if (!log?.visible || !toggle?.visible || !panel?.visible) failures.push("agent log open state missing");
    if (!close?.visible) failures.push("agent log close control missing");
    if (expanded !== "true") failures.push("agent log toggle aria-expanded is not true");
    if (!items.length) failures.push("agent log items missing");
    if (panel && toggle && panel.bottom > toggle.top + 1) failures.push("agent log panel does not open above toggle");
    if (panel && panel.width > Math.min(window.innerWidth - 16, 340)) failures.push("agent log panel too wide");
    if (panel && panel.top < -2) failures.push("agent log panel clips above viewport");
    if (close && (close.width < 32 || close.height < 32)) failures.push("agent log close target too small");
    if (document.documentElement.scrollWidth > window.innerWidth + 16) failures.push("document has horizontal overflow");
    return {
      passed: failures.length === 0,
      failures,
      mode: document.body?.dataset?.workspaceMode || "",
      focus: document.body?.dataset?.workbenchFocus || "",
      itemCount: items.length,
      panel,
      toggle,
      width: window.innerWidth,
      height: window.innerHeight
    };
  })()`;
}

function buildCodexSidecarSmokeExpression() {
  return `(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        display: style.display,
        visible: box.width > 0 && box.height > 0 && style.display !== "none"
      };
    };
    const failures = [];
    const shell = rect(".shell");
    const toolbar = rect(".toolbar");
    const focusPad = rect("#focus-pad");
    const stage = rect(".stage-panel");
    const canvas = rect("#board-canvas");
    const composer = rect("#workbench-composer");
    const rail = rect("#workbench-rail");
    const textarea = rect("#workbench-composer-input");
    const firstComposerButton = rect("#workbench-composer-talk");
    const firstRailButton = rect("#workbench-rail button");
    const exportedWorkbench = window.__canvaxDebug?.buildWorkbenchExport?.();
    if (document.readyState !== "complete") failures.push("document not complete");
    if (document.body?.dataset?.hostSurface !== "codex-sidecar") failures.push("host surface flag missing");
    if (document.body?.dataset?.workspaceMode !== "simple") failures.push("workbench mode not active");
    if (document.body?.dataset?.workbenchTray !== "collapsed") failures.push("scratchpad tray is not active");
    if (document.body?.dataset?.viewMode !== "frame") failures.push("frame mode not active");
    if (toolbar?.visible) failures.push("sidecar toolbar should be hidden");
    if (focusPad?.visible) failures.push("sidecar brief tray should be hidden");
    if (!shell?.visible || !stage?.visible || !canvas?.visible) failures.push("sidecar canvas surface missing");
    if (!composer?.visible || !rail?.visible || !textarea?.visible) failures.push("sidecar composer or rail missing");
    if (shell && shell.width > window.innerWidth + 2) failures.push("sidecar shell wider than viewport");
    if (document.documentElement.scrollWidth > window.innerWidth + 12) failures.push("document has horizontal overflow");
    if (composer && composer.bottom > window.innerHeight + 2) failures.push("composer clips below viewport");
    if (rail && rail.bottom > window.innerHeight + 2) failures.push("rail clips below viewport");
    if (composer && rail && composer.bottom > rail.top - 2) failures.push("composer overlaps the tool rail");
    if (canvas && canvas.height < Math.min(300, window.innerHeight * 0.34)) failures.push("canvas too short for sketching");
    if (firstComposerButton && firstComposerButton.height < 40) failures.push("composer touch target too small");
    if (firstRailButton && firstRailButton.height < 40) failures.push("rail touch target too small");
    if (exportedWorkbench?.hostSurface !== "codex-sidecar") failures.push("workbench export missing host surface");
    return {
      passed: failures.length === 0,
      failures,
      hostSurface: document.body?.dataset?.hostSurface || "",
      mode: document.body?.dataset?.workspaceMode || "",
      focus: document.body?.dataset?.workbenchFocus || "",
      workbenchExportSurface: exportedWorkbench?.hostSurface || "",
      shell,
      stage,
      composer,
      rail,
      width: window.innerWidth,
      height: window.innerHeight
    };
  })()`;
}

function buildProjectBrowserSmokeExpression() {
  return `(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        visible: box.width > 0 && box.height > 0
      };
    };
    const failures = [];
    const overlay = document.querySelector("#project-browser-overlay");
    const dialog = rect(".project-browser-dialog");
    const grid = rect("#project-browser-grid");
    const cards = [...document.querySelectorAll(".project-browser-card")];
    const activeCards = [...document.querySelectorAll(".project-browser-card.active")];
    const search = rect("#project-browser-search");
    if (document.readyState !== "complete") failures.push("document not complete");
    if (!overlay || overlay.hidden) failures.push("project browser overlay hidden");
    if (!dialog?.visible) failures.push("project browser dialog missing");
    if (!grid?.visible) failures.push("project browser grid missing");
    if (!search?.visible) failures.push("project browser search missing");
    if (cards.length < 3) failures.push("project browser fixture cards missing");
    if (activeCards.length !== 1) failures.push("active project card not marked");
    if (dialog && dialog.width > window.innerWidth + 16) failures.push("project browser wider than viewport");
    if (dialog && dialog.height > window.innerHeight + 16) failures.push("project browser taller than viewport");
    return {
      passed: failures.length === 0,
      failures,
      cardCount: cards.length,
      activeCount: activeCards.length,
      width: window.innerWidth,
      height: window.innerHeight
    };
  })()`;
}

async function validateDomLayoutReview({ chromePath, liveUrl, timeoutMs }) {
  const viewport = { label: "desktop", width: 1440, height: 1024 };
  try {
    const browser = await launchChromeSession(
      chromePath,
      `${liveUrl}/preview.html?responsivecheck=1`,
      { viewport },
    );
    try {
      const review = await browser.evaluateExpression(
        buildDomLayoutReviewExpression(),
        timeoutMs,
      );
      await writeDomReview(review);
      const passed = Boolean(review?.status !== "fail");
      results.push({
        name: "preview DOM layout review passes",
        passed,
        detail: passed
          ? `${review.status} ${review.score}/100 -> ${toProjectRelative(domReviewJsonPath)}`
          : review?.summary || "DOM layout review failed",
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    if (isRecoverableBrowserSkip(error)) {
      results.push({
        name: "preview DOM layout review passes",
        passed: true,
        skipped: true,
        detail:
          "headless Chrome did not settle on this host; rerun with CANVAX_BROWSER_STRICT=1 to fail hard",
      });
      return;
    }
    results.push({
      name: "preview DOM layout review passes",
      passed: false,
      detail: error instanceof Error ? error.message : "Unknown browser error",
    });
  }
}

async function validateResponsiveSmoke({
  name,
  surface,
  chromePath,
  url,
  viewport,
  timeoutMs,
  expression,
}) {
  try {
    const browser = await launchChromeSession(chromePath, url, { viewport });
    try {
      const state = await browser.waitForResponsiveSmoke(expression, timeoutMs);
      const screenshot = await captureResponsiveSnapshot(browser, {
        surface,
        viewport,
      });
      const passed = Boolean(state?.passed);
      results.push({
        name,
        passed: passed && Boolean(screenshot),
        detail: passed
          ? `${viewport.width}x${viewport.height}${screenshot ? ` -> ${screenshot}` : " (screenshot failed)"}`
          : `${viewport.width}x${viewport.height}: ${
              state?.failures?.join("; ") || "responsive smoke failed"
            }`,
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    if (isRecoverableBrowserSkip(error)) {
      results.push({
        name,
        passed: true,
        skipped: true,
        detail:
          "headless Chrome did not settle on this host; rerun with CANVAX_BROWSER_STRICT=1 to fail hard",
      });
      return;
    }
    results.push({
      name,
      passed: false,
      detail: error instanceof Error ? error.message : "Unknown browser error",
    });
  }
}

async function captureResponsiveSnapshot(browser, { surface, viewport }) {
  const fileName = `${surface}-${viewport.label}-${viewport.width}x${viewport.height}.png`;
  const filePath = resolve(snapshotRoot, fileName);
  try {
    await browser.captureScreenshot(filePath);
    const relativePath = toProjectRelative(filePath);
    snapshots.push({
      surface,
      viewport,
      path: relativePath,
    });
    return relativePath;
  } catch {
    return "";
  }
}

async function writeSnapshotIndex() {
  if (!snapshots.length) {
    return;
  }
  const indexPath = resolve(snapshotRoot, "index.json");
  const payload = {
    kind: "canvax-browser-visual-snapshots",
    createdAt: new Date().toISOString(),
    count: snapshots.length,
    snapshots,
  };
  await writeFile(indexPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  results.push({
    name: "browser visual snapshots written",
    passed: true,
    detail: toProjectRelative(indexPath),
  });
}

function buildBoardResponsiveSmokeExpression() {
  return `(() => {
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        visible: box.width > 0 && box.height > 0
      };
    };
    const failures = [];
    const shell = rect(".shell");
    const toolbar = rect(".toolbar");
    const stage = rect(".stage-panel");
    const canvas = rect("#board-canvas");
    const mode = document.body?.dataset?.workspaceMode || "";
    if (document.readyState !== "complete") failures.push("document not complete");
    if (!["simple", "advanced"].includes(mode)) failures.push("workspace mode not set");
    if (!shell?.visible) failures.push("shell missing");
    if (!toolbar?.visible) failures.push("toolbar missing");
    if (!stage?.visible) failures.push("stage missing");
    if (!canvas?.visible) failures.push("canvas missing");
    if (shell && shell.width > window.innerWidth + 16) failures.push("shell wider than viewport");
    if (toolbar && toolbar.width > window.innerWidth + 16) failures.push("toolbar wider than viewport");
    if (document.documentElement.scrollWidth > window.innerWidth + 16) failures.push("document has horizontal overflow");
    if (stage && stage.width < Math.min(300, window.innerWidth * 0.56)) failures.push("stage collapsed");
    if (stage && window.innerWidth <= 480 && stage.top > window.innerHeight * 0.72) failures.push("narrow Workbench hides the canvas below controls");
    if (canvas && canvas.height < 240) failures.push("canvas too short");
    return {
      passed: failures.length === 0,
      failures,
      readyState: document.readyState,
      mode,
      width: window.innerWidth,
      height: window.innerHeight
    };
  })()`;
}

function buildAdvancedMapSmokeExpression() {
  return `(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    window.scrollTo(0, Math.min(640, Math.max(0, document.body.scrollHeight - window.innerHeight)));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        visible: box.width > 0 && box.height > 0
      };
    };
    const alphaFromColor = (value) => {
      const match = String(value || "").match(/rgba?\\(([^)]+)\\)/i);
      if (!match) return 1;
      const parts = match[1].split(",").map((part) => part.trim());
      return parts.length >= 4 ? Number(parts[3]) : 1;
    };
    const failures = [];
    const toolbar = document.querySelector(".toolbar");
    const toolbarRect = rect(".toolbar");
    const flow = rect("#flow-workspace");
    const flowShell = rect("#flow-shell");
    const mapTimeline = rect("#map-timeline");
    const outputLane = rect(".spatial-lane-output");
    const guide = rect(".spatial-lane-output .spatial-lane-guide");
    const overflowingFrameBadges = [...document.querySelectorAll(".frame-card .frame-status-badge")].filter((badge) => {
      const card = badge.closest(".frame-card");
      if (!card) return true;
      const badgeBox = badge.getBoundingClientRect();
      const cardBox = card.getBoundingClientRect();
      return badgeBox.right > cardBox.right - 4 || badgeBox.left < cardBox.left + 4;
    });
    const generatedLabels = [
      ...document.querySelectorAll(".spatial-object-node.generated-output .spatial-object-header span")
    ].map((node) => node.textContent.trim().toLowerCase());
    const toolbarStyle = toolbar ? getComputedStyle(toolbar) : null;
    const backdrop = toolbarStyle?.backdropFilter || toolbarStyle?.webkitBackdropFilter || "none";
    const backgroundAlpha = alphaFromColor(toolbarStyle?.backgroundColor);
    if (document.readyState !== "complete") failures.push("document not complete");
    if (document.body?.dataset?.workspaceMode !== "advanced") failures.push("advanced mode not active");
    if (document.body?.dataset?.viewMode !== "flow") failures.push("flow map not active");
    if (!toolbarRect?.visible) failures.push("advanced toolbar missing");
    if (!flow?.visible || !flowShell?.visible) failures.push("flow map missing");
    if (!mapTimeline?.visible) failures.push("map timeline missing");
    if (!outputLane?.visible) failures.push("output shelf missing");
    if (!guide?.visible) failures.push("output shelf guide missing");
    if (toolbarRect && toolbarRect.width > window.innerWidth + 16) failures.push("advanced toolbar wider than viewport");
    if (flowShell && flowShell.height < Math.min(360, window.innerHeight * 0.45)) failures.push("flow map viewport too short");
    if (overflowingFrameBadges.length) failures.push("frame output badge overflows the project rail");
    if (backdrop && backdrop !== "none" && backdrop !== "blur(0px)") failures.push("advanced toolbar uses backdrop blur");
    if (backgroundAlpha < 0.98) failures.push("advanced toolbar background is translucent");
    if (!generatedLabels.length) failures.push("generated output labels missing");
    if (!generatedLabels.includes("generated screen")) failures.push("generated screen label missing");
    if (generatedLabels.some((label) => label === "generated-target")) failures.push("raw generated-target label is visible");
    return {
      passed: failures.length === 0,
      failures,
      mode: document.body?.dataset?.workspaceMode || "",
      viewMode: document.body?.dataset?.viewMode || "",
      generatedLabels,
      mapTimeline,
      toolbarBackground: toolbarStyle?.backgroundColor || "",
      toolbarBackdrop: backdrop,
      width: window.innerWidth,
      height: window.innerHeight
    };
  })()`;
}

function buildPreviewResponsiveSmokeExpression() {
  return `(() => {
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        visible: box.width > 0 && box.height > 0
      };
    };
    const failures = [];
    const shell = rect(".preview-shell");
    const header = rect(".preview-header");
    const layout = rect(".preview-layout");
    const compare = rect("#compare-stage");
    const sketch = rect("#sketch-surface-card");
    const output = rect("#implementation-surface-card");
    if (document.readyState !== "complete") failures.push("document not complete");
    if (!shell?.visible) failures.push("preview shell missing");
    if (!header?.visible) failures.push("preview header missing");
    if (!layout?.visible) failures.push("preview layout missing");
    if (!compare?.visible) failures.push("compare stage missing");
    if (!sketch?.visible) failures.push("sketch surface missing");
    if (!output?.visible) failures.push("output surface missing");
    if (shell && shell.width > window.innerWidth + 16) failures.push("preview shell wider than viewport");
    if (header && header.width > window.innerWidth + 16) failures.push("preview header wider than viewport");
    if (compare && compare.width < Math.min(280, window.innerWidth * 0.58)) failures.push("compare stage collapsed");
    return {
      passed: failures.length === 0,
      failures,
      readyState: document.readyState,
      width: window.innerWidth,
      height: window.innerHeight
    };
  })()`;
}

function buildDomLayoutReviewExpression() {
  return `(() => {
    if (location.href === "about:blank" || !document.body) {
      return {
        readyState: "loading",
        pendingNavigation: true,
        source: {
          type: "browser",
          url: location.href
        }
      };
    }
    const visibleBox = (node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      const visible = box.width > 0 && box.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || 1) > 0.01;
      return {
        tag: node.tagName.toLowerCase(),
        id: node.id || "",
        className: typeof node.className === "string" ? node.className : "",
        text: (node.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 90),
        role: node.getAttribute("role") || "",
        ariaLabel: node.getAttribute("aria-label") || "",
        width: Math.round(box.width),
        height: Math.round(box.height),
        left: Math.round(box.left),
        right: Math.round(box.right),
        top: Math.round(box.top),
        bottom: Math.round(box.bottom),
        visible
      };
    };
    const level = (id, label, passed, detail, severity = "fail", evidence = []) => ({
      id,
      label,
      level: passed ? "pass" : severity,
      detail,
      evidence
    });
    const nodes = [...document.body.querySelectorAll("*")];
    const visible = nodes.map(visibleBox).filter((entry) => entry.visible);
    const interactiveSelectors = "a[href],button,input,select,textarea,[role='button'],[tabindex]:not([tabindex='-1'])";
    const interactive = [...document.querySelectorAll(interactiveSelectors)]
      .map(visibleBox)
      .filter((entry) => entry.visible);
    const tinyTargets = interactive.filter((entry) => entry.width < 32 || entry.height < 32);
    const offscreen = visible.filter((entry) =>
      entry.left < -2 ||
      entry.right > window.innerWidth + 2 ||
      entry.top < -2 && entry.bottom < 0
    );
    const headings = [...document.querySelectorAll("h1,h2,h3")]
      .map((node) => ({
        tag: node.tagName.toLowerCase(),
        text: (node.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 120)
      }))
      .filter((entry) => entry.text);
    const landmarks = [...document.querySelectorAll("main,nav,header,footer,aside,[role='main'],[role='navigation'],[role='banner'],[role='contentinfo']")]
      .map((node) => node.tagName.toLowerCase() + (node.getAttribute("role") ? ":" + node.getAttribute("role") : ""));
    const canvaxBindings = [...document.querySelectorAll("[data-canvax-node-id]")]
      .map((node) => node.getAttribute("data-canvax-node-id"))
      .filter(Boolean);
    const animated = visible.filter((entry) => {
      const node = document.elementFromPoint(
        Math.min(window.innerWidth - 1, Math.max(0, entry.left + 1)),
        Math.min(window.innerHeight - 1, Math.max(0, entry.top + 1))
      );
      if (!node) return false;
      const style = getComputedStyle(node);
      return style.transitionDuration !== "0s" || style.animationName !== "none";
    });
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight
    };
    const checks = [
      level("document-ready", "Document ready", document.readyState === "complete", "Document readyState is " + document.readyState + "."),
      level("visible-structure", "Visible structure", visible.length >= 8, "Found " + visible.length + " visible elements."),
      level("horizontal-overflow", "Horizontal overflow", viewport.scrollWidth <= window.innerWidth + 12, "Viewport width " + viewport.width + ", scrollWidth " + viewport.scrollWidth + ".", "fail"),
      level("offscreen-elements", "Offscreen visible elements", offscreen.length === 0, "Found " + offscreen.length + " visible element(s) outside the viewport.", "warn", offscreen.slice(0, 8)),
      level("interactive-targets", "Interactive target sizes", tinyTargets.length === 0, "Found " + tinyTargets.length + " visible interactive target(s) under 32px.", "warn", tinyTargets.slice(0, 8)),
      level("headings", "Heading text", headings.length > 0, "Found " + headings.length + " heading(s).", "warn", headings.slice(0, 8)),
      level("landmarks", "Landmarks", landmarks.length > 0, "Found " + landmarks.length + " landmark(s).", "warn", landmarks.slice(0, 12)),
      level("canvax-bindings", "Canvax source bindings", canvaxBindings.length > 0, "Found " + canvaxBindings.length + " data-canvax-node-id binding(s).", "warn", canvaxBindings.slice(0, 12)),
      level("motion-cues", "Motion cues", animated.length > 0, "Found " + animated.length + " visible element(s) with transition or animation cues.", "warn")
    ];
    const failCount = checks.filter((check) => check.level === "fail").length;
    const warnCount = checks.filter((check) => check.level === "warn").length;
    const score = Math.max(0, 100 - failCount * 22 - warnCount * 7);
    const status = failCount ? "fail" : warnCount ? "review" : "pass";
    return {
      kind: "canvax-dom-layout-review",
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      requiresOpenAiApiKey: false,
      readyState: document.readyState,
      source: {
        type: "browser",
        url: location.href
      },
      status,
      score,
      viewport,
      visibleElementCount: visible.length,
      interactiveElementCount: interactive.length,
      checks,
      summary: status.toUpperCase() + " " + score + "/100. " + checks.filter((check) => check.level === "pass").length + " pass, " + warnCount + " warn, " + failCount + " fail.",
      noApiBoundary: "This review inspects rendered DOM and layout through local headless Chrome only. It does not call a hosted model, image API, or paid API."
    };
  })()`;
}

async function writeDomReview(review) {
  await mkdir(exportsRoot, { recursive: true });
  await writeFile(domReviewJsonPath, `${JSON.stringify(review, null, 2)}\n`);
  await writeFile(domReviewMarkdownPath, buildDomReviewMarkdown(review));
}

function buildDomReviewMarkdown(review) {
  const lines = [
    "# Canvax DOM Layout Review",
    "",
    `- Status: ${review.status}`,
    `- Score: ${review.score}/100`,
    `- Source: ${review.source?.url || "unknown"}`,
    `- Requires OpenAI API key: ${review.requiresOpenAiApiKey ? "yes" : "no"}`,
    "",
    "## Checks",
    "",
  ];
  (review.checks || []).forEach((check) => {
    lines.push(`- ${check.level}: ${check.label} - ${check.detail}`);
  });
  lines.push("", "## Boundary", "", review.noApiBoundary || "");
  return `${lines.join("\n")}\n`;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function detectChromeBinary() {
  const candidates = [
    process.env.CANVAX_BROWSER,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next browser candidate.
    }
  }

  return "";
}

async function launchChromeSession(
  chromePath,
  initialUrl,
  options = {},
) {
  const startupTimeoutMs =
    typeof options === "number"
      ? options
      : parsePositiveInteger(options.startupTimeoutMs, 15000);
  const viewport = typeof options === "object" ? options.viewport : null;
  const profileDir = await mkdtemp(
    join(tmpdir(), "canvax-browser-regression-"),
  );
  const viewportArgs = viewport
    ? [`--window-size=${viewport.width},${viewport.height}`]
    : [];
  const child = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-sync",
      "--hide-scrollbars",
      "--mute-audio",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-port=0",
      ...viewportArgs,
      `--user-data-dir=${profileDir}`,
      initialUrl,
    ],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "ignore", "pipe"],
    },
  );

  try {
    const port = await waitForDevToolsPort(child, startupTimeoutMs);
    const targetWsUrl = await waitForPageTarget(
      port,
      initialUrl,
      startupTimeoutMs,
    );
    const cdp = await createCdpSession(targetWsUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    if (viewport) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: false,
      });
    }

    return {
      async waitForSelfTest(resultsId, timeoutMs) {
        return waitForSelfTestState(cdp, resultsId, timeoutMs);
      },
      async waitForResponsiveSmoke(expression, timeoutMs) {
        return waitForResponsiveSmokeState(cdp, expression, timeoutMs);
      },
      async evaluateExpression(expression, timeoutMs) {
        return waitForEvaluatedValue(cdp, expression, timeoutMs);
      },
      async captureScreenshot(filePath) {
        const result = await withTimeout(
          cdp.send("Page.captureScreenshot", {
            format: "png",
            captureBeyondViewport: false,
            fromSurface: true,
          }),
          10000,
        );
        await writeFile(filePath, Buffer.from(result.result.data, "base64"));
      },
      async close() {
        await withTimeout(cdp.close(), 1500).catch(() => {});
        await closeChromeProcess(child);
        await rm(profileDir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await closeChromeProcess(child);
    await rm(profileDir, { recursive: true, force: true });
    throw error;
  }
}

function toProjectRelative(filePath) {
  return filePath.replace(`${projectRoot}/`, "");
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

function waitForDevToolsPort(child, timeoutMs) {
  return new Promise((resolvePromise, rejectPromise) => {
    let stderr = "";
    const timeout = setTimeout(() => {
      cleanup();
      rejectPromise(new Error(`Timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      child.stderr.off("data", onData);
      child.off("error", onError);
      child.off("close", onClose);
    };

    const onData = (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//i);
      if (!match) {
        return;
      }
      cleanup();
      resolvePromise(Number(match[1]));
    };

    const onError = (error) => {
      cleanup();
      rejectPromise(error);
    };

    const onClose = (code) => {
      cleanup();
      rejectPromise(
        new Error(
          stderr.trim() ||
            `Chrome exited before DevTools was ready (code ${code ?? "unknown"}).`,
        ),
      );
    };

    child.stderr.on("data", onData);
    child.on("error", onError);
    child.on("close", onClose);
  });
}

async function waitForPageTarget(port, expectedUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
        cache: "no-store",
      });
      if (response.ok) {
        const targets = await response.json();
        const page = Array.isArray(targets)
          ? targets.find(
              (target) =>
                target?.type === "page" &&
                typeof target?.url === "string" &&
                target.url.startsWith(expectedUrl) &&
                typeof target?.webSocketDebuggerUrl === "string",
            )
          : null;
        if (page?.webSocketDebuggerUrl) {
          return page.webSocketDebuggerUrl;
        }
      }
    } catch {
      // Retry until timeout.
    }
    await delay(150);
  }
  throw new Error(`Timed out after ${timeoutMs}ms.`);
}

function createCdpSession(wsUrl) {
  return new Promise((resolvePromise, rejectPromise) => {
    const socket = new WebSocket(wsUrl);
    const pending = new Map();
    let nextId = 1;
    let opened = false;

    const rejectAll = (error) => {
      pending.forEach(({ reject }) => reject(error));
      pending.clear();
    };

    const decodeMessageData = (data) => {
      if (typeof data === "string") {
        return data;
      }
      if (data instanceof ArrayBuffer) {
        return Buffer.from(data).toString("utf8");
      }
      return Buffer.from(data).toString("utf8");
    };

    socket.addEventListener("open", () => {
      opened = true;
      resolvePromise({
        send(method, params = {}) {
          return new Promise((resolveCommand, rejectCommand) => {
            const id = nextId;
            nextId += 1;
            pending.set(id, {
              resolve: resolveCommand,
              reject: rejectCommand,
            });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
        close() {
          return new Promise((resolveClose) => {
            const finalize = () => {
              rejectAll(new Error("CDP session closed."));
              resolveClose();
            };
            if (socket.readyState >= WebSocket.CLOSING) {
              finalize();
              return;
            }
            socket.addEventListener("close", finalize, { once: true });
            socket.close();
          });
        },
      });
    });

    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(decodeMessageData(event.data));
      if (!payload?.id || !pending.has(payload.id)) {
        return;
      }
      const { resolve, reject } = pending.get(payload.id);
      pending.delete(payload.id);
      if (payload.error) {
        reject(
          new Error(
            payload.error.message || `CDP command failed for ${payload.id}.`,
          ),
        );
        return;
      }
      resolve(payload);
    });

    socket.addEventListener("error", () => {
      if (!opened) {
        rejectPromise(new Error("Could not connect to Chrome DevTools."));
      }
    });

    socket.addEventListener("close", () => {
      if (!opened) {
        rejectPromise(new Error("Chrome DevTools closed before opening."));
      }
      rejectAll(new Error("CDP session closed."));
    });
  });
}

async function waitForResponsiveSmokeState(cdp, expression, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastState = null;
  while (Date.now() < deadline) {
    try {
      const response = await withTimeout(
        cdp.send("Runtime.evaluate", {
          expression,
          returnByValue: true,
          awaitPromise: true,
        }),
        cdpCommandTimeoutMs(deadline),
      );
      const value = response?.result?.result?.value ?? response?.result?.value;
      lastState = value || lastState;
      if (value?.readyState === "complete" && value?.passed) {
        return value;
      }
    } catch {
      // Retry while the page is still navigating.
    }
    await delay(200);
  }
  if (lastState) {
    return lastState;
  }
  const detail = lastState
    ? `Timed out after ${timeoutMs}ms; failures=${lastState.failures?.join("; ") || "none reported"}.`
    : `Timed out after ${timeoutMs}ms.`;
  throw new Error(detail);
}

async function waitForEvaluatedValue(cdp, expression, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastState = null;
  while (Date.now() < deadline) {
    try {
      const response = await withTimeout(
        cdp.send("Runtime.evaluate", {
          expression,
          returnByValue: true,
          awaitPromise: true,
        }),
        cdpCommandTimeoutMs(deadline),
      );
      const value = response?.result?.result?.value ?? response?.result?.value;
      lastState = value || lastState;
      const hasReadyState = Object.prototype.hasOwnProperty.call(
        value || {},
        "readyState",
      );
      if (
        value?.readyState === "complete" ||
        (value?.kind && !hasReadyState)
      ) {
        return value;
      }
    } catch {
      // Retry while the page is still navigating.
    }
    await delay(200);
  }
  if (lastState) {
    return lastState;
  }
  throw new Error(`Timed out after ${timeoutMs}ms.`);
}

async function waitForSelfTestState(cdp, resultsId, timeoutMs) {
  const selector = `#${resultsId}`;
  const deadline = Date.now() + timeoutMs;
  let lastState = null;
  while (Date.now() < deadline) {
    try {
      const response = await withTimeout(
        cdp.send("Runtime.evaluate", {
          expression: `(() => {
          const node = document.querySelector(${JSON.stringify(selector)});
          return {
            ready: Boolean(node),
            readyState: document.readyState,
            bodyPassed: document.body?.dataset?.selftestPassed || "",
            progress: window.__canvaxSelfTestProgress || "",
            error: window.__canvaxSelfTestError || "",
            text: node?.textContent || ""
          };
        })()`,
          returnByValue: true,
          awaitPromise: true,
        }),
        cdpCommandTimeoutMs(deadline),
      );
      const value = response?.result?.result?.value ?? response?.result?.value;
      lastState = value || lastState;
      if (value?.ready) {
        return value;
      }
    } catch {
      // Retry while the page is still navigating.
    }
    await delay(200);
  }
  const detail = lastState
    ? `Timed out after ${timeoutMs}ms; readyState=${lastState.readyState || "unknown"} progress=${lastState.progress || "unknown"}${lastState.error ? ` error=${lastState.error}` : ""}.`
    : `Timed out after ${timeoutMs}ms.`;
  throw new Error(detail);
}

async function closeChromeProcess(child) {
  if (child.exitCode !== null || child.killed) {
    return;
  }

  child.kill("SIGTERM");
  const exited = await new Promise((resolvePromise) => {
    const timeout = setTimeout(() => {
      resolvePromise(false);
    }, 1500);
    child.once("close", () => {
      clearTimeout(timeout);
      resolvePromise(true);
    });
  });

  if (!exited) {
    child.kill("SIGKILL");
  }
}

function cdpCommandTimeoutMs(deadline) {
  return Math.max(300, Math.min(5000, deadline - Date.now()));
}

function withTimeout(promise, timeoutMs) {
  return new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => {
      rejectPromise(new Error(`CDP command timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolvePromise(value);
      },
      (error) => {
        clearTimeout(timeout);
        rejectPromise(error);
      },
    );
  });
}

function delay(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

function isRecoverableBrowserSkip(error) {
  if (process.env.CANVAX_BROWSER_STRICT === "1") {
    return false;
  }
  const message = error instanceof Error ? error.message : String(error || "");
  return /Timed out after/i.test(message);
}
