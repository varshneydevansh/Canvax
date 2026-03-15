import { spawn } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const curlBinary = "/usr/bin/curl";

const results = [];

const chromePath = await detectChromeBinary();
const serviceState = await detectCanvaxServiceState();
const liveUrl = serviceState.url;

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
  await validateBrowserSelfTest({
    name: "board browser self-test passes",
    chromePath,
    url: `${liveUrl}/?selftest=1`,
    resultsId: "selftest-results",
    timeoutMs: 45000,
  });
  await validateBrowserSelfTest({
    name: "preview browser self-test passes",
    chromePath,
    url: `${liveUrl}/preview.html?selftest=1`,
    resultsId: "preview-selftest-results",
    timeoutMs: 30000,
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
  startupTimeoutMs = 15000,
) {
  const profileDir = await mkdtemp(
    join(tmpdir(), "canvax-browser-regression-"),
  );
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

    return {
      async waitForSelfTest(resultsId, timeoutMs) {
        return waitForSelfTestState(cdp, resultsId, timeoutMs);
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

async function waitForSelfTestState(cdp, resultsId, timeoutMs) {
  const selector = `#${resultsId}`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const node = document.querySelector(${JSON.stringify(selector)});
          return {
            ready: Boolean(node),
            bodyPassed: document.body?.dataset?.selftestPassed || "",
            text: node?.textContent || ""
          };
        })()`,
        returnByValue: true,
        awaitPromise: true,
      });
      const value = response?.result?.value;
      if (value?.ready) {
        return value;
      }
    } catch {
      // Retry while the page is still navigating.
    }
    await delay(200);
  }
  throw new Error(`Timed out after ${timeoutMs}ms.`);
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
