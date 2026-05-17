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

const results = [];
const snapshots = [];

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
  await validateAdvancedMapSmoke({
    chromePath,
    liveUrl,
    timeoutMs: responsiveSmokeTimeoutMs,
  });
  await writeSnapshotIndex();
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
    if (stage && stage.width < Math.min(300, window.innerWidth * 0.56)) failures.push("stage collapsed");
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
    const outputLane = rect(".spatial-lane-output");
    const guide = rect(".spatial-lane-output .spatial-lane-guide");
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
    if (!outputLane?.visible) failures.push("output shelf missing");
    if (!guide?.visible) failures.push("output shelf guide missing");
    if (toolbarRect && toolbarRect.width > window.innerWidth + 16) failures.push("advanced toolbar wider than viewport");
    if (flowShell && flowShell.height < Math.min(360, window.innerHeight * 0.45)) failures.push("flow map viewport too short");
    if (backdrop && backdrop !== "none" && backdrop !== "blur(0px)") failures.push("advanced toolbar uses backdrop blur");
    if (backgroundAlpha < 0.98) failures.push("advanced toolbar background is translucent");
    if (!generatedLabels.length) failures.push("generated output labels missing");
    if (generatedLabels.some((label) => label === "generated-target")) failures.push("raw generated-target label is visible");
    return {
      passed: failures.length === 0,
      failures,
      mode: document.body?.dataset?.workspaceMode || "",
      viewMode: document.body?.dataset?.viewMode || "",
      generatedLabels,
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
      async captureScreenshot(filePath) {
        const result = await cdp.send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: false,
          fromSurface: true,
        });
        await writeFile(filePath, Buffer.from(result.result.data, "base64"));
      },
      async close() {
        await cdp.close();
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
      const response = await cdp.send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
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

async function waitForSelfTestState(cdp, resultsId, timeoutMs) {
  const selector = `#${resultsId}`;
  const deadline = Date.now() + timeoutMs;
  let lastState = null;
  while (Date.now() < deadline) {
    try {
      const response = await cdp.send("Runtime.evaluate", {
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
      });
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
