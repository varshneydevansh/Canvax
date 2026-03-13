import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { closeSync, openSync } from "node:fs";
import { mkdir, readFile, realpath, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = resolve(__dirname, "..");
const webRoot = resolve(projectRoot, "web");
const exportsRoot = resolve(projectRoot, "exports");
const runtimeRoot = resolve(projectRoot, ".canvax");
const runtimePath = resolve(runtimeRoot, "runtime.json");
const serverLogPath = resolve(runtimeRoot, "server.log");
const liveJsonPath = resolve(exportsRoot, "canvax-live-latest.json");
const liveMarkdownPath = resolve(exportsRoot, "canvax-live-latest.md");
const legacyJsonPath = resolve(exportsRoot, "canvax-storyboard-latest.json");
const legacyMarkdownPath = resolve(exportsRoot, "canvax-storyboard-latest.md");
const skillSource = resolve(projectRoot, "codex-skill", "canvax");
const skillTarget = resolve(homedir(), ".codex", "skills", "canvax");
const defaultPort = Number(process.env.CANVAX_PORT || 3210);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

const args = process.argv.slice(2);
const requestedPort = readPort(args) ?? defaultPort;
const shouldOpen = args.includes("--open");
const wantsStop = args.includes("--stop");
const wantsStatus = args.includes("--status");
const wantsJson = args.includes("--json");
const wantsRestart = args.includes("--restart");
const wantsServe = args.includes("--serve");
const wantsHelp = args.includes("--help") || args.includes("-h");

if (wantsHelp) {
  printHelp();
  process.exit(0);
}

if (wantsServe) {
  await runServer(requestedPort);
} else {
  await runCli();
}

async function runCli() {
  await mkdir(exportsRoot, { recursive: true });
  await mkdir(runtimeRoot, { recursive: true });

  if (wantsStop) {
    const runtime = await getRunningRuntime();
    if (!runtime) {
      return printCliOutput(
        wantsJson,
        {
          running: false,
          stopped: false,
          defaultPort,
          liveJsonPath,
          liveMarkdownPath,
        },
        "Canvax is not running.",
      );
    }

    await stopRuntime(runtime);
    return printCliOutput(
      wantsJson,
      {
        running: false,
        stopped: true,
        defaultPort,
        liveJsonPath,
        liveMarkdownPath,
      },
      "Canvax stopped.",
    );
  }

  if (wantsStatus) {
    const runtime = await getRunningRuntime();
    if (!runtime) {
      return printCliOutput(
        wantsJson,
        {
          running: false,
          defaultPort,
          liveJsonPath,
          liveMarkdownPath,
        },
        `Canvax is not running. Default port is ${defaultPort}.`,
      );
    }

    return printCliOutput(
      wantsJson,
      {
        running: true,
        ...runtime,
      },
      `Canvax is running at ${runtime.url}`,
    );
  }

  let runtime = await getRunningRuntime();

  if (runtime && wantsRestart) {
    await stopRuntime(runtime);
    runtime = null;
  }

  if (runtime) {
    if (readPort(args) !== null && runtime.port !== requestedPort) {
      if (shouldOpen) {
        openUrl(runtime.url);
      }
      return printCliOutput(
        wantsJson,
        {
          running: true,
          reused: true,
          requestedPort,
          portMismatch: true,
          ...runtime,
        },
        `Canvax is already running at ${runtime.url}. Requested port ${requestedPort} was ignored. Use --restart to move it.`,
      );
    }

    if (shouldOpen) {
      openUrl(runtime.url);
    }

    return printCliOutput(
      wantsJson,
      {
        running: true,
        reused: true,
        ...runtime,
      },
      `Canvax is already running at ${runtime.url}`,
    );
  }

  await startDetachedServer(requestedPort);
  runtime = await waitForRuntime(requestedPort, 4000);

  if (!runtime) {
    const logTail = await readLogTail();
    const message = logTail
      ? `Canvax failed to start on port ${requestedPort}. Recent log output:\n${logTail}`
      : `Canvax failed to start on port ${requestedPort}.`;
    console.error(message);
    process.exitCode = 1;
    return;
  }

  if (shouldOpen) {
    openUrl(runtime.url);
  }

  return printCliOutput(
    wantsJson,
    {
      running: true,
      started: true,
      ...runtime,
    },
    `Canvax attached at ${runtime.url}`,
  );
}

async function runServer(port) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

      if (request.method === "GET" && url.pathname === "/api/status") {
        return writeJson(response, 200, {
          exportRoot: exportsRoot,
          liveJsonPath,
          liveMarkdownPath,
          runtimePath,
          url: `http://localhost:${port}`,
        });
      }

      if (request.method === "POST" && url.pathname === "/api/save-export") {
        return handleSaveExport(request, response);
      }

      if (request.method === "POST" && url.pathname === "/api/install-skill") {
        return handleInstallSkill(response);
      }

      return serveStatic(url.pathname, response);
    } catch (error) {
      return writeJson(response, 500, {
        error: error instanceof Error ? error.message : "Unknown server error.",
      });
    }
  });

  server.on("error", (error) => {
    console.error(error instanceof Error ? error.message : "Canvax server failed.");
    process.exitCode = 1;
  });

  server.listen(port, async () => {
    const runtime = buildRuntime(port);
    await writeRuntime(runtime);
    console.log(`Canvax running at ${runtime.url}`);
    console.log(`Exports will be written to ${exportsRoot}`);
  });

  const cleanup = () => {
    void clearRuntimeIfOwned(process.pid);
  };

  process.on("SIGINT", () => {
    cleanup();
    server.close(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    cleanup();
    server.close(() => process.exit(0));
  });

  process.on("exit", cleanup);
}

async function serveStatic(pathname, response) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = resolve(webRoot, `.${safePath}`);

  if (!filePath.startsWith(webRoot)) {
    return writeJson(response, 403, { error: "Forbidden path." });
  }

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      throw new Error("Not a file.");
    }
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    });
    response.end(body);
  } catch {
    writeJson(response, 404, { error: "Not found." });
  }
}

async function handleSaveExport(request, response) {
  const payload = await readJson(request);
  if (!payload.package || !Array.isArray(payload.package.frames)) {
    return writeJson(response, 400, { error: "Export package is missing frames." });
  }

  const timestamp = buildTimestamp();
  const archiveSlug = slugify(payload.package.board?.project || "canvax-storyboard");
  const archiveRoot = resolve(exportsRoot, "archive", `${timestamp}-${archiveSlug}`);
  const assetRoot = resolve(exportsRoot, "assets");
  const archiveAssetRoot = resolve(archiveRoot, "assets");

  await mkdir(assetRoot, { recursive: true });
  await mkdir(archiveAssetRoot, { recursive: true });

  const savedFrames = [];

  for (const frame of payload.package.frames) {
    const frameSlug = `${String(frame.index).padStart(2, "0")}-${slugify(frame.title || `frame-${frame.index}`)}`;
    const snapshotName = `${frameSlug}.jpg`;
    const thumbName = `${frameSlug}-thumb.jpg`;

    const latestSnapshotPath = resolve(assetRoot, snapshotName);
    const archiveSnapshotPath = resolve(archiveAssetRoot, snapshotName);
    const latestThumbPath = resolve(assetRoot, thumbName);
    const archiveThumbPath = resolve(archiveAssetRoot, thumbName);

    if (frame.snapshotDataUrl) {
      const snapshotBuffer = decodeDataUrl(frame.snapshotDataUrl);
      await writeFile(latestSnapshotPath, snapshotBuffer);
      await writeFile(archiveSnapshotPath, snapshotBuffer);
    }

    if (frame.thumbnailDataUrl) {
      const thumbnailBuffer = decodeDataUrl(frame.thumbnailDataUrl);
      await writeFile(latestThumbPath, thumbnailBuffer);
      await writeFile(archiveThumbPath, thumbnailBuffer);
    }

    savedFrames.push({
      ...frame,
      snapshotPath: join("exports", "assets", snapshotName),
      thumbnailPath: join("exports", "assets", thumbName),
      snapshotDataUrl: undefined,
      thumbnailDataUrl: undefined,
    });
  }

  const exportJson = {
    ...payload.package,
    frames: savedFrames,
  };

  await mkdir(archiveRoot, { recursive: true });

  const archiveJsonPath = resolve(archiveRoot, "storyboard.json");
  const archiveMarkdownPath = resolve(archiveRoot, "storyboard.md");
  const jsonBody = JSON.stringify(exportJson, null, 2);
  const markdownBody = payload.markdown || payload.package.prompt || "";

  await writeFile(legacyJsonPath, jsonBody);
  await writeFile(archiveJsonPath, jsonBody);
  await writeFile(legacyMarkdownPath, markdownBody);
  await writeFile(archiveMarkdownPath, markdownBody);
  await writeFile(liveJsonPath, jsonBody);
  await writeFile(liveMarkdownPath, markdownBody);

  return writeJson(response, 200, {
    archiveRoot,
    jsonPath: liveJsonPath,
    markdownPath: liveMarkdownPath,
  });
}

async function handleInstallSkill(response) {
  await mkdir(dirname(skillTarget), { recursive: true });

  try {
    const existing = await realpath(skillTarget);
    if (existing === skillSource) {
      return writeJson(response, 200, {
        installed: true,
        path: skillTarget,
        message: "Canvax skill already points at this workspace.",
      });
    }

    return writeJson(response, 409, {
      error: `A different skill already exists at ${skillTarget}.`,
    });
  } catch {
    await symlink(skillSource, skillTarget, "dir");
    return writeJson(response, 200, {
      installed: true,
      path: skillTarget,
      message: "Canvax skill installed. Restart Codex if it was already open.",
    });
  }
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function readPort(inputArgs) {
  const index = inputArgs.findIndex((arg) => arg === "--port");
  if (index === -1 || !inputArgs[index + 1]) {
    return null;
  }
  const port = Number(inputArgs[index + 1]);
  return Number.isFinite(port) ? port : null;
}

function slugify(input) {
  return String(input || "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "untitled";
}

function buildTimestamp() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ];
  return `${parts[0]}${parts[1]}${parts[2]}-${parts[3]}${parts[4]}${parts[5]}`;
}

function decodeDataUrl(dataUrl) {
  const [, data] = String(dataUrl).split(",", 2);
  return Buffer.from(data || "", "base64");
}

function buildRuntime(port) {
  const url = `http://localhost:${port}`;
  return {
    pid: process.pid,
    port,
    url,
    projectRoot,
    exportRoot: exportsRoot,
    liveJsonPath,
    liveMarkdownPath,
    startedAt: new Date().toISOString(),
  };
}

async function writeRuntime(runtime) {
  await mkdir(runtimeRoot, { recursive: true });
  await writeFile(runtimePath, `${JSON.stringify(runtime, null, 2)}\n`);
}

async function readRuntime() {
  try {
    const raw = await readFile(runtimePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function clearRuntimeIfOwned(pid) {
  const runtime = await readRuntime();
  if (runtime?.pid !== pid) {
    return;
  }
  try {
    await unlink(runtimePath);
  } catch {
    // Ignore stale cleanup failures.
  }
}

async function getRunningRuntime() {
  const runtime = await readRuntime();
  if (!runtime?.pid) {
    return null;
  }

  if (!isProcessAlive(runtime.pid)) {
    await clearRuntimeIfOwned(runtime.pid);
    return null;
  }

  return runtime;
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function startDetachedServer(port) {
  await mkdir(runtimeRoot, { recursive: true });
  await writeFile(serverLogPath, "");

  const logFd = openSync(serverLogPath, "a");
  const child = spawn(process.execPath, [scriptPath, "--serve", "--port", String(port)], {
    cwd: projectRoot,
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  closeSync(logFd);
  child.unref();
}

async function stopRuntime(runtime) {
  try {
    process.kill(runtime.pid, "SIGTERM");
  } catch {
    await clearRuntimeIfOwned(runtime.pid);
    return;
  }

  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    if (!isProcessAlive(runtime.pid)) {
      break;
    }
    await delay(100);
  }

  if (isProcessAlive(runtime.pid)) {
    process.kill(runtime.pid, "SIGKILL");
  }

  await clearRuntimeIfOwned(runtime.pid);
}

async function waitForRuntime(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const runtime = await getRunningRuntime();
    if (runtime?.port === port) {
      return runtime;
    }
    await delay(100);
  }
  return null;
}

function delay(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

function openUrl(url) {
  spawn("open", [url], {
    stdio: "ignore",
    detached: true,
  }).unref();
}

async function readLogTail() {
  try {
    const log = await readFile(serverLogPath, "utf8");
    return log.trim().split("\n").slice(-8).join("\n");
  } catch {
    return "";
  }
}

function printCliOutput(asJson, payload, message) {
  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(message);
  if (payload.url) {
    console.log(`Board URL: ${payload.url}`);
  }
  console.log(`Live export: ${liveJsonPath}`);
  console.log(`Live markdown: ${liveMarkdownPath}`);
}

function printHelp() {
  console.log(`Canvax

Usage:
  ./canvax
  ./canvax --open
  ./canvax --status [--json]
  ./canvax --stop
  ./canvax --restart [--port 3210] [--open]

Behavior:
  - Running without arguments ensures exactly one Canvax service is active.
  - If Canvax is already running, the existing service is reused.
  - Passing a different --port while Canvax is already running does not start a second server.
  - Use --restart to move Canvax to a different port.
`);
}
