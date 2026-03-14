import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { closeSync, openSync } from "node:fs";
import {
  mkdir,
  readFile,
  realpath,
  stat,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = resolve(__dirname, "..");
const webRoot = resolve(projectRoot, "web");
const exportsRoot = resolve(projectRoot, "exports");
const artifactsPreviewRoot = resolve(projectRoot, "artifacts", "preview");
const materializedPreviewRoot = resolve(artifactsPreviewRoot, "materialized");
const previewSnapshotsRoot = resolve(artifactsPreviewRoot, "snapshots");
const previewSnapshotsIndexPath = resolve(
  artifactsPreviewRoot,
  "preview-snapshots.json",
);
const codexOutputRoot = resolve(projectRoot, "artifacts", "canvax");
const runtimeRoot = resolve(projectRoot, ".canvax");
const runtimePath = resolve(runtimeRoot, "runtime.json");
const serverLogPath = resolve(runtimeRoot, "server.log");
const liveJsonPath = resolve(exportsRoot, "canvax-live-latest.json");
const liveMarkdownPath = resolve(exportsRoot, "canvax-live-latest.md");
const liveVoiceMarkdownPath = resolve(exportsRoot, "canvax-voice-latest.md");
const previewManifestPath = resolve(
  exportsRoot,
  "canvax-preview-manifest.json",
);
const codexOutputManifestPath = resolve(codexOutputRoot, "codex-output.json");
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
          liveVoiceMarkdownPath,
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
        liveVoiceMarkdownPath,
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
          liveVoiceMarkdownPath,
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
      const url = new URL(
        request.url ?? "/",
        `http://${request.headers.host ?? "localhost"}`,
      );

      if (request.method === "GET" && url.pathname === "/api/status") {
        return writeJson(response, 200, {
          exportRoot: exportsRoot,
          materializedPreviewRoot,
          liveJsonPath,
          liveMarkdownPath,
          liveVoiceMarkdownPath,
          previewManifestPath,
          codexOutputManifestPath,
          previewSnapshotsIndexPath,
          previewUrl: `http://localhost:${port}/preview.html`,
          runtimePath,
          url: `http://localhost:${port}`,
        });
      }

      if (request.method === "GET" && url.pathname === "/api/preview-state") {
        return handlePreviewState(response);
      }

      if (request.method === "POST" && url.pathname === "/api/save-export") {
        return handleSaveExport(request, response);
      }

      if (request.method === "POST" && url.pathname === "/api/install-skill") {
        return handleInstallSkill(response);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/save-preview-manifest"
      ) {
        return handleSavePreviewManifest(request, response);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/save-preview-snapshot"
      ) {
        return handleSavePreviewSnapshot(request, response);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/materialize-frame"
      ) {
        return handleMaterializeFrame(request, response);
      }

      if (request.method === "GET" && url.pathname.startsWith("/workspace/")) {
        return serveWorkspace(url.pathname, response);
      }

      return serveStatic(url.pathname, response);
    } catch (error) {
      return writeJson(response, 500, {
        error: error instanceof Error ? error.message : "Unknown server error.",
      });
    }
  });

  server.on("error", (error) => {
    console.error(
      error instanceof Error ? error.message : "Canvax server failed.",
    );
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
      "Content-Type":
        mimeTypes[extname(filePath)] || "application/octet-stream",
    });
    response.end(body);
  } catch {
    writeJson(response, 404, { error: "Not found." });
  }
}

async function handleSaveExport(request, response) {
  const payload = await readJson(request);
  if (!payload.package || !Array.isArray(payload.package.frames)) {
    return writeJson(response, 400, {
      error: "Export package is missing frames.",
    });
  }

  const timestamp = buildTimestamp();
  const archiveSlug = slugify(
    payload.package.board?.project || "canvax-storyboard",
  );
  const archiveRoot = resolve(
    exportsRoot,
    "archive",
    `${timestamp}-${archiveSlug}`,
  );
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
  const archiveVoiceMarkdownPath = resolve(archiveRoot, "voice-notes.md");
  const jsonBody = JSON.stringify(exportJson, null, 2);
  const markdownBody = payload.markdown || payload.package.prompt || "";
  const voiceMarkdownBody = payload.voiceMarkdown || "";

  await writeFile(legacyJsonPath, jsonBody);
  await writeFile(archiveJsonPath, jsonBody);
  await writeFile(legacyMarkdownPath, markdownBody);
  await writeFile(archiveMarkdownPath, markdownBody);
  await writeFile(liveJsonPath, jsonBody);
  await writeFile(liveMarkdownPath, markdownBody);
  await writeFile(liveVoiceMarkdownPath, voiceMarkdownBody);
  await writeFile(archiveVoiceMarkdownPath, voiceMarkdownBody);

  return writeJson(response, 200, {
    archiveRoot,
    jsonPath: liveJsonPath,
    markdownPath: liveMarkdownPath,
    voiceMarkdownPath: liveVoiceMarkdownPath,
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

async function handlePreviewState(response) {
  const liveExport = enhanceLiveExport(await readOptionalJson(liveJsonPath));
  const liveMarkdown = await readOptionalText(liveMarkdownPath);
  const liveVoiceMarkdown = await readOptionalText(liveVoiceMarkdownPath);
  const previewManifest = await readOptionalJson(previewManifestPath);
  const codexOutputManifest = await readOptionalJson(codexOutputManifestPath);
  const mergedPreviewManifest = enhanceManifest(
    mergeManifestSources(previewManifest, codexOutputManifest),
  );
  const previewSnapshots = enhancePreviewSnapshots(
    await readOptionalJson(previewSnapshotsIndexPath),
  );

  return writeJson(response, 200, {
    updatedAt: new Date().toISOString(),
    liveExport,
    liveMarkdown,
    liveVoiceMarkdown,
    previewManifest: mergedPreviewManifest,
    previewSnapshots,
    paths: {
      liveJsonPath,
      liveMarkdownPath,
      liveVoiceMarkdownPath,
      previewManifestPath,
      codexOutputManifestPath,
      previewSnapshotsIndexPath,
    },
  });
}

async function handleSavePreviewManifest(request, response) {
  const payload = await readJson(request);
  const existingManifest = await readOptionalJson(previewManifestPath);

  if (payload.clear) {
    const clearedManifest = clearPrimaryPreviewTarget(existingManifest);
    if (hasManifestContent(clearedManifest)) {
      await mkdir(exportsRoot, { recursive: true });
      await writeFile(
        previewManifestPath,
        `${JSON.stringify(clearedManifest, null, 2)}\n`,
      );
    } else {
      try {
        await unlink(previewManifestPath);
      } catch {
        // Ignore missing manifest removals.
      }
    }
    return writeJson(response, 200, {
      cleared: true,
      previewManifestPath,
      manifest: enhanceManifest(clearedManifest),
    });
  }

  let manifest = null;
  if (
    payload.manifest &&
    typeof payload.manifest === "object" &&
    !Array.isArray(payload.manifest)
  ) {
    manifest = normalizePreviewManifest(payload.manifest, existingManifest);
  } else {
    manifest = mergePreviewManifest(existingManifest, payload);
  }

  if (!hasManifestContent(manifest)) {
    return writeJson(response, 400, {
      error:
        "Preview manifest needs at least one target, artifact, change, or note.",
    });
  }

  await mkdir(exportsRoot, { recursive: true });
  await writeFile(
    previewManifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  return writeJson(response, 200, {
    saved: true,
    previewManifestPath,
    manifest: enhanceManifest(manifest),
  });
}

async function handleSavePreviewSnapshot(request, response) {
  const payload = await readJson(request);
  const snapshot = payload?.snapshot;
  if (!snapshot || typeof snapshot !== "object") {
    return writeJson(response, 400, { error: "Snapshot payload is required." });
  }

  const timestamp = buildTimestamp();
  const snapshotId = `${timestamp}-${slugify(snapshot.frameTitle || snapshot.frameId || snapshot.label || "preview-snapshot")}`;
  const snapshotRoot = resolve(previewSnapshotsRoot, snapshotId);
  await mkdir(snapshotRoot, { recursive: true });

  let sketchPath = "";
  const sketchDataUrl =
    typeof payload.sketchDataUrl === "string" ? payload.sketchDataUrl : "";
  if (sketchDataUrl.startsWith("data:")) {
    sketchPath = join(
      "artifacts",
      "preview",
      "snapshots",
      snapshotId,
      "sketch.jpg",
    );
    await writeFile(
      resolve(snapshotRoot, "sketch.jpg"),
      decodeDataUrl(sketchDataUrl),
    );
  }

  const record = {
    id: snapshotId,
    savedAt: new Date().toISOString(),
    frameId: cleanString(snapshot.frameId),
    frameTitle: cleanString(snapshot.frameTitle),
    compareMode: cleanString(snapshot.compareMode) || "split",
    viewportLabel: cleanString(snapshot.viewportLabel),
    viewportWidth: Number(snapshot.viewportWidth) || 0,
    viewportHeight: Number(snapshot.viewportHeight) || 0,
    targetLabel: cleanString(snapshot.targetLabel),
    targetUrl: cleanString(snapshot.targetUrl),
    targetPath: cleanString(snapshot.targetPath),
    note: cleanString(snapshot.note),
    artifactCount: Array.isArray(snapshot.artifacts)
      ? snapshot.artifacts.length
      : 0,
    changeCount: Array.isArray(snapshot.changes) ? snapshot.changes.length : 0,
    sketchPath,
    snapshotPath: join(
      "artifacts",
      "preview",
      "snapshots",
      snapshotId,
      "snapshot.json",
    ),
  };

  const snapshotBody = {
    ...record,
    target:
      snapshot.target && typeof snapshot.target === "object"
        ? snapshot.target
        : null,
    artifacts: Array.isArray(snapshot.artifacts) ? snapshot.artifacts : [],
    changes: Array.isArray(snapshot.changes) ? snapshot.changes : [],
  };
  await writeFile(
    resolve(snapshotRoot, "snapshot.json"),
    `${JSON.stringify(snapshotBody, null, 2)}\n`,
  );

  const existingIndex = await readOptionalJson(previewSnapshotsIndexPath);
  const existingItems =
    existingIndex && Array.isArray(existingIndex.items)
      ? existingIndex.items
      : [];
  const nextItems = [record, ...existingItems].slice(0, 24);
  const indexBody = {
    updatedAt: new Date().toISOString(),
    items: nextItems,
  };
  await mkdir(artifactsPreviewRoot, { recursive: true });
  await writeFile(
    previewSnapshotsIndexPath,
    `${JSON.stringify(indexBody, null, 2)}\n`,
  );

  return writeJson(response, 200, {
    saved: true,
    snapshot: enhancePreviewSnapshotRecord(record),
    previewSnapshots: enhancePreviewSnapshots(indexBody),
    previewSnapshotsIndexPath,
  });
}

async function handleMaterializeFrame(request, response) {
  const payload = normalizeMaterializePayload(await readJson(request));
  const frame = payload.frame;
  if (!frame) {
    return writeJson(response, 400, {
      error: "Materialize payload requires a frame.",
    });
  }

  const hasSketchState = Boolean(
    frame.elements.length ||
    cleanString(frame.snapshotDataUrl) ||
    cleanString(frame.backgroundImage),
  );
  if (!hasSketchState) {
    return writeJson(response, 400, {
      error: "Draw, label, or reference something before materializing it.",
    });
  }

  const generatedAt = new Date().toISOString();
  const versionTag = String(Date.now());
  const outputSlug = join("frames", slugify(frame.id || "frame"));
  const outputRoot = resolve(materializedPreviewRoot, outputSlug);
  const relativeRoot = join("artifacts", "preview", "materialized", outputSlug);
  const previewPath = join(relativeRoot, "index.html");
  const contextPath = join(relativeRoot, "frame.json");
  const metaPath = join(relativeRoot, "meta.json");
  let sketchPath = "";

  await mkdir(outputRoot, { recursive: true });
  await writeFile(
    resolve(outputRoot, "frame.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  await writeFile(
    resolve(outputRoot, "meta.json"),
    `${JSON.stringify(
      {
        generatedAt,
        versionTag,
        sourceFrameId: frame.id,
        sourceFrameTitle: frame.title,
        sourceFrameUpdatedAt: frame.updatedAt,
        previewPath,
        contextPath,
      },
      null,
      2,
    )}\n`,
  );

  if (cleanString(frame.snapshotDataUrl).startsWith("data:")) {
    sketchPath = join(relativeRoot, "sketch.png");
    await writeFile(
      resolve(outputRoot, "sketch.png"),
      decodeDataUrl(frame.snapshotDataUrl),
    );
  }

  const html = buildMaterializedPreviewDocument(payload, {
    sketchSrc: sketchPath ? "./sketch.png" : "",
  });
  await writeFile(resolve(outputRoot, "index.html"), html);

  const existingManifest = await readOptionalJson(previewManifestPath);
  const nextManifest = upsertMaterializedPreviewManifest(existingManifest, {
    frame,
    generatedAt,
    versionTag,
    previewPath,
    contextPath,
    metaPath,
    sketchPath,
  });
  await mkdir(exportsRoot, { recursive: true });
  await writeFile(
    previewManifestPath,
    `${JSON.stringify(nextManifest, null, 2)}\n`,
  );

  return writeJson(response, 200, {
    saved: true,
    previewPath,
    previewUrl: workspaceUrlForPath(previewPath, versionTag),
    contextPath,
    metaPath,
    sketchPath,
    previewManifestPath,
    previewManifest: enhanceManifest(nextManifest),
  });
}

function normalizeMaterializePayload(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    generatedAt: cleanString(source.generatedAt) || new Date().toISOString(),
    board: normalizeMaterializeBoard(source.board),
    frame: normalizeMaterializeFrame(source.frame),
  };
}

function normalizeMaterializeBoard(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    project: cleanString(source.project) || "Canvax materialized preview",
    goal: cleanString(source.goal),
    audience: cleanString(source.audience),
    designMood: cleanString(source.designMood),
  };
}

function normalizeMaterializeFrame(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : null;
  if (!source) {
    return null;
  }

  const viewportWidth = clampNumber(source.viewportWidth, 320, 2400, 1440);
  const viewportHeight = clampNumber(source.viewportHeight, 320, 1800, 1024);
  return {
    id: cleanString(source.id) || slugify(source.title || "frame"),
    title: cleanString(source.title) || "Untitled frame",
    viewport: cleanString(source.viewport) || "desktop",
    viewportLabel: cleanString(source.viewportLabel) || "Canvas",
    viewportWidth,
    viewportHeight,
    objective: cleanString(source.objective),
    layout: cleanString(source.layout),
    motion: cleanString(source.motion),
    assets: cleanString(source.assets),
    mobile: cleanString(source.mobile),
    updatedAt: cleanString(source.updatedAt) || new Date().toISOString(),
    captureCount: Math.max(0, Number(source.captureCount) || 0),
    backgroundImage: cleanString(source.backgroundImage),
    snapshotDataUrl: cleanString(source.snapshotDataUrl),
    thumbnailDataUrl: cleanString(source.thumbnailDataUrl),
    elements: Array.isArray(source.elements)
      ? source.elements
          .map((entry) => normalizeMaterializeElement(entry))
          .filter(Boolean)
      : [],
  };
}

function normalizeMaterializeElement(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : null;
  if (!source) {
    return null;
  }

  const type = cleanString(source.type);
  if (!type) {
    return null;
  }

  return {
    id:
      cleanString(source.id) ||
      `${type}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    color: normalizeHexColor(source.color) || "#ff5d3a",
    size: clampNumber(source.size, 1, 96, 12),
    alpha: clampNumber(source.alpha, 0, 1, 1),
    composite: cleanString(source.composite) || "source-over",
    groupId: cleanString(source.groupId),
    text: cleanString(source.text),
    attachedTo: cleanString(source.attachedTo),
    anchor:
      source.anchor && typeof source.anchor === "object"
        ? {
            xRatio: clampNumber(source.anchor.xRatio, -1, 2, 0),
            yRatio: clampNumber(source.anchor.yRatio, -1, 2, 0),
          }
        : null,
    start: normalizeMaterializePoint(source.start),
    end: normalizeMaterializePoint(source.end),
    bounds: normalizeMaterializeBounds(source.bounds),
    resolvedPosition:
      source.resolvedPosition && typeof source.resolvedPosition === "object"
        ? {
            x: Number(source.resolvedPosition.x) || 0,
            y: Number(source.resolvedPosition.y) || 0,
            attached: Boolean(source.resolvedPosition.attached),
          }
        : null,
    x: Number(source.x) || 0,
    y: Number(source.y) || 0,
    points: Array.isArray(source.points)
      ? source.points.map((point) => normalizeMaterializePoint(point))
      : [],
  };
}

function normalizeMaterializePoint(value) {
  return {
    x: Number(value?.x) || 0,
    y: Number(value?.y) || 0,
  };
}

function normalizeMaterializeBounds(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const left = Number(value.left) || 0;
  const top = Number(value.top) || 0;
  const right = Number(value.right) || 0;
  const bottom = Number(value.bottom) || 0;
  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, Number(value.width) || right - left),
    height: Math.max(0, Number(value.height) || bottom - top),
  };
}

function clampNumber(value, min, max, fallback) {
  const next = Number(value);
  if (!Number.isFinite(next)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, next));
}

function upsertMaterializedPreviewManifest(existingManifest, materialized) {
  const manifest = normalizePreviewManifest(existingManifest || {});
  const frameId = cleanString(materialized.frame.id) || "frame";
  const frameTitle = cleanString(materialized.frame.title) || "Untitled frame";
  const targetId = `materialize-target-${frameId}`;
  const htmlArtifactId = `materialize-html-${frameId}`;
  const contextArtifactId = `materialize-context-${frameId}`;
  const metaArtifactId = `materialize-meta-${frameId}`;
  const sketchArtifactId = `materialize-sketch-${frameId}`;
  const generatedAt =
    cleanString(materialized.generatedAt) || new Date().toISOString();
  const versionTag = cleanString(materialized.versionTag) || generatedAt;
  const sourceFrameUpdatedAt =
    cleanString(materialized.frame.updatedAt) || new Date().toISOString();
  const preservedTargets = manifest.targets.filter(
    (target) => cleanString(target.id) !== targetId,
  );
  const preservedArtifacts = manifest.artifacts.filter((artifact) => {
    const artifactId = cleanString(artifact.id);
    return (
      artifactId !== htmlArtifactId &&
      artifactId !== contextArtifactId &&
      artifactId !== metaArtifactId &&
      artifactId !== sketchArtifactId
    );
  });

  const note =
    "Materialize mode creates a styled local preview from the current Canvax frame and keeps the sketch board unchanged.";
  const notes = [cleanString(manifest.notes), note]
    .filter(Boolean)
    .filter((entry, index, values) => values.indexOf(entry) === index)
    .join("\n\n");

  return normalizePreviewManifest({
    ...manifest,
    updatedAt: new Date().toISOString(),
    source: "canvax-materialize",
    previewUrl: "",
    notes,
    targets: [
      {
        id: targetId,
        label: `${frameTitle} materialized`,
        source: "canvax-materialize",
        type: "materialized-preview",
        previewPath: materialized.previewPath,
        description:
          "Styled local preview generated directly from the current Canvax frame.",
        frameIds: [frameId],
        versionTag,
        generatedAt,
        sourceFrameId: frameId,
        sourceFrameTitle: frameTitle,
        sourceFrameUpdatedAt,
      },
      ...preservedTargets,
    ],
    artifacts: [
      {
        id: htmlArtifactId,
        label: `${frameTitle} preview`,
        path: materialized.previewPath,
        kind: "preview",
        description: "Generated interactive HTML artifact for this frame.",
        frameIds: [frameId],
        versionTag,
        generatedAt,
        sourceFrameId: frameId,
        sourceFrameTitle: frameTitle,
        sourceFrameUpdatedAt,
      },
      {
        id: contextArtifactId,
        label: `${frameTitle} context`,
        path: materialized.contextPath,
        kind: "context",
        description:
          "Serialized frame payload used to materialize the preview.",
        frameIds: [frameId],
        versionTag,
        generatedAt,
        sourceFrameId: frameId,
        sourceFrameTitle: frameTitle,
        sourceFrameUpdatedAt,
      },
      {
        id: metaArtifactId,
        label: `${frameTitle} materialize meta`,
        path: materialized.metaPath,
        kind: "meta",
        description:
          "Materialize metadata including generation time and source-frame revision.",
        frameIds: [frameId],
        versionTag,
        generatedAt,
        sourceFrameId: frameId,
        sourceFrameTitle: frameTitle,
        sourceFrameUpdatedAt,
      },
      ...(materialized.sketchPath
        ? [
            {
              id: sketchArtifactId,
              label: `${frameTitle} sketch overlay`,
              path: materialized.sketchPath,
              kind: "reference",
              description:
                "Saved sketch snapshot used as the optional blueprint overlay.",
              frameIds: [frameId],
              versionTag,
              generatedAt,
              sourceFrameId: frameId,
              sourceFrameTitle: frameTitle,
              sourceFrameUpdatedAt,
            },
          ]
        : []),
      ...preservedArtifacts,
    ],
  });
}

function buildMaterializedPreviewDocument(payload, options = {}) {
  const board = payload.board || normalizeMaterializeBoard({});
  const frame = payload.frame || normalizeMaterializeFrame({});
  const sketchSrc = cleanString(options.sketchSrc);
  const accent = pickMaterializeAccent(frame.elements);
  const accentStrong = mixHex(accent, "#1b1513", 0.18);
  const accentSoft = rgbaFromHex(accent, 0.14);
  const accentBorder = rgbaFromHex(accent, 0.44);
  const accentGlow = rgbaFromHex(accent, 0.2);
  const attachedLabels = new Map();
  const freeLabels = [];

  frame.elements
    .filter((element) => element.type === "label" && cleanString(element.text))
    .sort((a, b) => {
      const aTop = a.bounds?.top ?? a.resolvedPosition?.y ?? a.y ?? 0;
      const bTop = b.bounds?.top ?? b.resolvedPosition?.y ?? b.y ?? 0;
      if (aTop !== bTop) {
        return aTop - bTop;
      }
      const aLeft = a.bounds?.left ?? a.resolvedPosition?.x ?? a.x ?? 0;
      const bLeft = b.bounds?.left ?? b.resolvedPosition?.x ?? b.x ?? 0;
      return aLeft - bLeft;
    })
    .forEach((label) => {
      if (label.attachedTo) {
        const existing = attachedLabels.get(label.attachedTo) || [];
        existing.push(label);
        attachedLabels.set(label.attachedTo, existing);
        return;
      }
      freeLabels.push(label);
    });

  const layoutMarkup = frame.elements
    .filter(
      (element) =>
        element.type !== "label" &&
        element.type !== "path" &&
        element.composite !== "destination-out",
    )
    .sort((left, right) => elementArea(right) - elementArea(left))
    .map((element, index) =>
      buildMaterializedNodeMarkup({
        element,
        labels: attachedLabels.get(element.id) || [],
        frame,
        board,
        index,
        accent,
      }),
    )
    .filter(Boolean)
    .join("\n");

  const noteMarkup = freeLabels
    .map((label, index) => buildFreeLabelMarkup(label, index))
    .filter(Boolean)
    .join("\n");

  const contentMarkup =
    layoutMarkup ||
    buildMaterializedFallbackMarkup({
      frame,
      board,
      accent,
    });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(frame.title)} • Canvax Materialized</title>
    <style>
      :root {
        --accent: ${accent};
        --accent-strong: ${accentStrong};
        --accent-soft: ${accentSoft};
        --accent-border: ${accentBorder};
        --accent-glow: ${accentGlow};
        --ink: #1f1715;
        --muted: rgba(49, 38, 34, 0.72);
        --paper: #fbf5ee;
        --paper-strong: #fffaf6;
        --panel: rgba(255, 249, 243, 0.74);
        --panel-strong: rgba(255, 251, 247, 0.9);
        --shadow: rgba(44, 29, 21, 0.18);
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        min-height: 100%;
        margin: 0;
      }

      body {
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: clamp(1rem, 2vw, 2rem);
        background:
          radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.95), transparent 30%),
          radial-gradient(circle at 80% 0%, ${accentSoft}, transparent 28%),
          linear-gradient(160deg, #efe4d8 0%, #f7efe6 48%, #e9ddd1 100%);
        color: var(--ink);
        font-family: "Avenir Next", "Helvetica Neue", sans-serif;
      }

      body[data-show-blueprint="false"] .blueprint-layer {
        opacity: 0;
      }

      body[data-show-notes="false"] .note-layer {
        opacity: 0;
        visibility: hidden;
      }

      .preview-wrap {
        width: min(100%, ${frame.viewportWidth}px);
      }

      .preview-stage {
        position: relative;
        width: ${frame.viewportWidth}px;
        height: ${frame.viewportHeight}px;
        overflow: hidden;
        border-radius: clamp(1.4rem, 2vw, 2rem);
        border: 1px solid rgba(106, 75, 55, 0.16);
        background:
          linear-gradient(180deg, rgba(255, 254, 251, 0.94), rgba(245, 238, 230, 0.92)),
          linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(251, 244, 236, 0.88));
        box-shadow:
          0 1.4rem 3rem rgba(46, 32, 22, 0.16),
          inset 0 1px 0 rgba(255, 255, 255, 0.9);
      }

      .stage-grid,
      .component-layer,
      .note-layer,
      .blueprint-layer {
        position: absolute;
        inset: 0;
      }

      .stage-grid {
        pointer-events: none;
        background-image:
          linear-gradient(rgba(115, 88, 69, 0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(115, 88, 69, 0.05) 1px, transparent 1px);
        background-size: 4.5rem 4.5rem;
        mask-image: radial-gradient(circle at center, black 65%, transparent 100%);
        opacity: 0.6;
      }

      .blueprint-layer {
        object-fit: cover;
        width: 100%;
        height: 100%;
        opacity: 0.1;
        mix-blend-mode: multiply;
        filter: saturate(0.74) contrast(1.08);
        pointer-events: none;
        transition: opacity 180ms ease;
      }

      .context-chip,
      .toolbar {
        position: absolute;
        z-index: 4;
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.7rem 0.9rem;
        border-radius: 999px;
        background: rgba(255, 251, 247, 0.72);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(84, 61, 46, 0.12);
        box-shadow: 0 0.8rem 1.6rem rgba(39, 28, 22, 0.08);
      }

      .context-chip {
        top: 1rem;
        left: 1rem;
        max-width: min(78%, 32rem);
        flex-wrap: wrap;
      }

      .context-chip strong {
        font-family: "Iowan Old Style", "Palatino Linotype", Georgia, serif;
        font-size: 1rem;
      }

      .context-chip span {
        color: var(--muted);
        font-size: 0.84rem;
      }

      .toolbar {
        right: 1rem;
        bottom: 1rem;
      }

      .toolbar button {
        appearance: none;
        border: 0;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        color: var(--ink);
        padding: 0.58rem 0.82rem;
        font: inherit;
        font-size: 0.84rem;
        cursor: pointer;
        transition: transform 140ms ease, background 140ms ease;
      }

      .toolbar button:hover {
        transform: translateY(-1px);
        background: rgba(255, 255, 255, 0.96);
      }

      .material-node {
        position: absolute;
        border-radius: 1.1rem;
        border: 1px solid var(--node-border, var(--accent-border));
        background: var(--node-fill, rgba(255, 250, 246, 0.84));
        color: var(--ink);
        box-shadow:
          0 1rem 1.8rem rgba(48, 34, 23, 0.08),
          0 0 0 1px rgba(255, 255, 255, 0.42) inset;
        overflow: hidden;
        transition:
          transform 180ms ease,
          box-shadow 180ms ease,
          border-color 180ms ease,
          background 180ms ease;
      }

      .material-node[data-interactive="true"] {
        cursor: pointer;
      }

      .material-node[data-interactive="true"]:hover,
      .material-node.is-active {
        transform: translateY(-2px);
        border-color: rgba(20, 15, 13, 0.24);
        box-shadow:
          0 1.2rem 2.4rem rgba(40, 27, 19, 0.14),
          0 0 0 1px rgba(255, 255, 255, 0.58) inset,
          0 0 0 0.24rem var(--node-glow, var(--accent-glow));
      }

      .material-node .node-shell {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width: 100%;
        height: 100%;
        padding: clamp(0.7rem, 0.95vw, 1.05rem);
        gap: 0.42rem;
      }

      .node-tag {
        align-self: flex-start;
        padding: 0.24rem 0.56rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.7);
        color: var(--muted);
        font-size: 0.72rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .node-title {
        margin: 0;
        font-family: "Iowan Old Style", "Palatino Linotype", Georgia, serif;
        font-size: clamp(1rem, 1.25vw, 1.4rem);
        line-height: 1.06;
      }

      .node-copy {
        margin: 0;
        color: var(--muted);
        font-size: 0.84rem;
        line-height: 1.42;
      }

      .role-button,
      .role-chip,
      .ellipse-node {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .role-button .node-shell,
      .role-chip .node-shell {
        align-items: center;
        flex-direction: row;
      }

      .role-button .node-title,
      .role-chip .node-title {
        font-family: "Avenir Next", "Helvetica Neue", sans-serif;
        font-size: 0.92rem;
        letter-spacing: 0.01em;
      }

      .node-arrow {
        margin-left: auto;
        font-size: 1rem;
        color: var(--muted);
      }

      .role-input .node-shell {
        justify-content: center;
      }

      .input-label {
        margin: 0;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }

      .input-field {
        margin-top: 0.45rem;
        padding: 0.72rem 0.88rem;
        border-radius: 0.9rem;
        background: rgba(255, 255, 255, 0.84);
        border: 1px solid rgba(46, 32, 25, 0.08);
        color: rgba(55, 40, 33, 0.62);
        font-size: 0.88rem;
      }

      .line-node {
        background: linear-gradient(90deg, transparent, var(--node-border), transparent);
        border: 0;
        border-radius: 999px;
        box-shadow: none;
      }

      .arrow-node {
        background: transparent;
        border: 0;
        box-shadow: none;
        overflow: visible;
      }

      .arrow-node svg {
        width: 100%;
        height: 100%;
        overflow: visible;
        filter: drop-shadow(0 0.4rem 0.9rem rgba(37, 25, 18, 0.12));
      }

      .arrow-caption {
        position: absolute;
        top: calc(100% + 0.2rem);
        left: 50%;
        transform: translateX(-50%);
        white-space: nowrap;
        padding: 0.28rem 0.56rem;
        border-radius: 999px;
        background: rgba(255, 251, 247, 0.86);
        border: 1px solid rgba(84, 61, 46, 0.1);
        font-size: 0.74rem;
        color: var(--muted);
      }

      .ellipse-node .node-shell {
        align-items: center;
        justify-content: center;
        gap: 0.28rem;
        text-align: center;
      }

      .ellipse-copy {
        margin: 0;
        font-family: "Iowan Old Style", "Palatino Linotype", Georgia, serif;
        font-size: clamp(0.92rem, 1.1vw, 1.3rem);
        line-height: 1;
      }

      .note-layer {
        z-index: 3;
        pointer-events: none;
        transition: opacity 180ms ease, visibility 180ms ease;
      }

      .note-card {
        position: absolute;
        max-width: min(18rem, 40vw);
        padding: 0.72rem 0.88rem;
        border-radius: 1rem;
        background: rgba(255, 251, 245, 0.84);
        border: 1px solid rgba(78, 58, 45, 0.12);
        box-shadow: 0 0.8rem 1.5rem rgba(40, 28, 20, 0.08);
      }

      .note-card strong {
        display: block;
        font-size: 0.74rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .note-card p {
        margin: 0.34rem 0 0;
        font-size: 0.84rem;
        line-height: 1.42;
      }

      .fallback-panel {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .fallback-panel .node-shell {
        align-items: flex-start;
        justify-content: center;
        max-width: min(82%, 42rem);
      }

      @media (max-width: 960px) {
        body {
          place-items: start center;
        }

        .preview-wrap {
          width: 100%;
        }

        .preview-stage {
          width: 100%;
          height: auto;
          aspect-ratio: ${frame.viewportWidth} / ${frame.viewportHeight};
        }

        .context-chip {
          max-width: calc(100% - 2rem);
        }
      }
    </style>
  </head>
  <body data-show-blueprint="${sketchSrc ? "true" : "false"}" data-show-notes="${noteMarkup ? "true" : "false"}">
    <main class="preview-wrap">
      <section class="preview-stage" aria-label="Materialized ${escapeHtml(frame.title)}">
        <div class="stage-grid" aria-hidden="true"></div>
        ${
          sketchSrc
            ? `<img class="blueprint-layer" src="${escapeAttribute(sketchSrc)}" alt="" />`
            : ""
        }
        <div class="context-chip">
          <strong>${escapeHtml(frame.title)}</strong>
          <span>${escapeHtml(frame.viewportLabel)} ${frame.viewportWidth}×${frame.viewportHeight}</span>
          ${
            cleanString(board.project)
              ? `<span>• ${escapeHtml(board.project)}</span>`
              : ""
          }
        </div>
        <div class="component-layer">
          ${contentMarkup}
        </div>
        <div class="note-layer">
          ${noteMarkup}
        </div>
        <div class="toolbar">
          ${
            sketchSrc
              ? '<button type="button" data-action="toggle-blueprint">Sketch overlay</button>'
              : ""
          }
          ${
            noteMarkup
              ? '<button type="button" data-action="toggle-notes">Notes</button>'
              : ""
          }
        </div>
      </section>
    </main>
    <script>
      const body = document.body;
      document.querySelectorAll("[data-interactive='true']").forEach((node) => {
        node.addEventListener("click", () => {
          node.classList.toggle("is-active");
        });
      });
      document.querySelector("[data-action='toggle-blueprint']")?.addEventListener("click", () => {
        body.dataset.showBlueprint = body.dataset.showBlueprint === "true" ? "false" : "true";
      });
      document.querySelector("[data-action='toggle-notes']")?.addEventListener("click", () => {
        body.dataset.showNotes = body.dataset.showNotes === "true" ? "false" : "true";
      });
    </script>
  </body>
</html>
`;
}

function buildMaterializedNodeMarkup({
  element,
  labels,
  frame,
  board,
  index,
  accent,
}) {
  const bounds = element.bounds;
  if (!bounds || bounds.width < 6 || bounds.height < 6) {
    return "";
  }

  if (element.type === "line") {
    const horizontal = bounds.width >= bounds.height;
    return `<div
      class="material-node line-node"
      style="${buildBoundsStyle(
        horizontal
          ? {
              left: bounds.left,
              top: bounds.top + bounds.height / 2,
              width: bounds.width,
              height: Math.max(3, element.size / 2),
            }
          : {
              left: bounds.left + bounds.width / 2,
              top: bounds.top,
              width: Math.max(3, element.size / 2),
              height: bounds.height,
            },
        element.color,
      )}"
      aria-hidden="true"
    ></div>`;
  }

  if (element.type === "arrow") {
    const width = Math.max(18, bounds.width);
    const height = Math.max(18, bounds.height);
    const startX = Math.max(2, element.start.x - bounds.left);
    const startY = Math.max(2, element.start.y - bounds.top);
    const endX = Math.max(2, element.end.x - bounds.left);
    const endY = Math.max(2, element.end.y - bounds.top);
    const caption = cleanString(labels[0]?.text);
    return `<div
      class="material-node arrow-node"
      style="${buildBoundsStyle(bounds, element.color)}"
      aria-hidden="true"
    >
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="presentation">
        <defs>
          <marker id="arrow-head-${escapeAttribute(element.id)}" markerWidth="10" markerHeight="10" refX="8" refY="3.5" orient="auto">
            <polygon points="0 0, 8 3.5, 0 7" fill="${escapeAttribute(element.color || accent)}"></polygon>
          </marker>
        </defs>
        <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${escapeAttribute(
          element.color || accent,
        )}" stroke-width="${Math.max(2, element.size / 2)}" stroke-linecap="round" marker-end="url(#arrow-head-${escapeAttribute(element.id)})"></line>
      </svg>
      ${caption ? `<span class="arrow-caption">${escapeHtml(caption)}</span>` : ""}
    </div>`;
  }

  const role =
    element.type === "ellipse"
      ? classifyEllipseRole(bounds, labels)
      : classifyRectRole(bounds, labels, frame, index);
  const descriptor = describeMaterializedNode(
    role,
    labels,
    frame,
    board,
    index,
  );
  const interactive = role !== "divider" && role !== "input" ? "true" : "false";
  const className = [
    "material-node",
    element.type === "ellipse" ? "ellipse-node" : `role-${role}`,
    role === "panel" && !descriptor.body ? "fallback-panel" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (role === "input") {
    return `<div
      class="${className}"
      data-interactive="${interactive}"
      style="${buildBoundsStyle(bounds, element.color)}"
    >
      <div class="node-shell">
        <span class="input-label">${escapeHtml(descriptor.tag)}</span>
        <div class="input-field">${escapeHtml(descriptor.body || descriptor.title)}</div>
      </div>
    </div>`;
  }

  if (element.type === "ellipse") {
    return `<button
      class="${className}"
      data-interactive="${interactive}"
      type="button"
      style="${buildBoundsStyle(bounds, element.color)}"
    >
      <div class="node-shell">
        <span class="node-tag">${escapeHtml(descriptor.tag)}</span>
        <p class="ellipse-copy">${escapeHtml(descriptor.title)}</p>
        ${
          descriptor.body
            ? `<p class="node-copy">${escapeHtml(descriptor.body)}</p>`
            : ""
        }
      </div>
    </button>`;
  }

  const elementTag =
    role === "button" || role === "chip" ? "button" : "section";
  const shell = `
    <div class="node-shell">
      <span class="node-tag">${escapeHtml(descriptor.tag)}</span>
      <div>
        <h3 class="node-title">${escapeHtml(descriptor.title)}</h3>
        ${
          descriptor.body
            ? `<p class="node-copy">${escapeHtml(descriptor.body)}</p>`
            : ""
        }
      </div>
      ${
        role === "button" || role === "chip"
          ? '<span class="node-arrow" aria-hidden="true">↗</span>'
          : ""
      }
    </div>
  `;

  return `<${elementTag}
    class="${className}"
    data-interactive="${interactive}"
    ${elementTag === "button" ? 'type="button"' : ""}
    style="${buildBoundsStyle(bounds, element.color)}"
  >
    ${shell}
  </${elementTag}>`;
}

function buildFreeLabelMarkup(label, index) {
  const text = cleanString(label.text);
  const position = label.resolvedPosition || { x: label.x, y: label.y };
  if (!text) {
    return "";
  }

  return `<article
    class="note-card"
    style="left:${Math.max(0, position.x)}px; top:${Math.max(0, position.y)}px; transform: translate(-4px, -100%);"
  >
    <strong>Note ${index + 1}</strong>
    <p>${escapeHtml(text)}</p>
  </article>`;
}

function buildMaterializedFallbackMarkup({ frame, board, accent }) {
  const title = cleanString(frame.title) || "Materialized frame";
  const body =
    cleanString(frame.objective) ||
    cleanString(board.goal) ||
    "Draw components, labels, and states in Canvax, then materialize the frame again.";
  const detail =
    cleanString(frame.layout) ||
    cleanString(frame.motion) ||
    cleanString(frame.assets) ||
    cleanString(frame.mobile);
  const width = Math.max(280, Math.min(frame.viewportWidth * 0.66, 760));
  const height = Math.max(220, Math.min(frame.viewportHeight * 0.34, 360));
  const left = Math.max(32, (frame.viewportWidth - width) / 2);
  const top = Math.max(32, (frame.viewportHeight - height) / 2);
  return `<section
    class="material-node role-panel fallback-panel"
    data-interactive="true"
    style="${buildBoundsStyle({ left, top, width, height }, accent)}"
  >
    <div class="node-shell">
      <span class="node-tag">${escapeHtml(board.project || "Canvax materialize")}</span>
      <div>
        <h3 class="node-title">${escapeHtml(title)}</h3>
        <p class="node-copy">${escapeHtml(body)}</p>
        ${detail ? `<p class="node-copy">${escapeHtml(detail)}</p>` : ""}
      </div>
    </div>
  </section>`;
}

function classifyRectRole(bounds, labels, frame, index) {
  const joined = labels
    .map((label) => cleanString(label.text).toLowerCase())
    .filter(Boolean)
    .join(" ");
  if (
    /\b(search|email|password|field|input|name|phone|address)\b/.test(joined)
  ) {
    return "input";
  }
  if (
    /\b(button|cta|buy|continue|next|save|submit|get started|sign in|log in|login|signup|sign up|join)\b/.test(
      joined,
    )
  ) {
    return "button";
  }
  if (
    /\b(tab|chip|filter|tag|pill|badge)\b/.test(joined) ||
    (bounds.height <= 72 && bounds.width <= 280)
  ) {
    return bounds.width > 180 ? "button" : "chip";
  }
  if (index === 0 && bounds.width >= frame.viewportWidth * 0.58) {
    return "hero";
  }
  if (bounds.height >= 220 || bounds.width >= frame.viewportWidth * 0.38) {
    return "panel";
  }
  return "card";
}

function classifyEllipseRole(bounds, labels) {
  const joined = labels
    .map((label) => cleanString(label.text).toLowerCase())
    .filter(Boolean)
    .join(" ");
  if (/\b(avatar|photo|profile|user|icon|logo)\b/.test(joined)) {
    return "avatar";
  }
  if (bounds.width <= 96 && bounds.height <= 96) {
    return "chip";
  }
  return "avatar";
}

function describeMaterializedNode(role, labels, frame, board, index) {
  const texts = labels.map((label) => cleanString(label.text)).filter(Boolean);
  const title = texts[0] || inferFallbackTitle(role, frame, board, index);
  const body =
    texts.slice(1).join(" · ") || inferFallbackBody(role, frame, board, index);
  return {
    tag: roleTag(role),
    title: truncateText(title, role === "button" || role === "chip" ? 26 : 64),
    body:
      role === "button" || role === "chip"
        ? ""
        : truncateText(body, role === "panel" || role === "hero" ? 160 : 96),
  };
}

function inferFallbackTitle(role, frame, board, index) {
  if (role === "hero") {
    return (
      cleanString(frame.objective) || cleanString(frame.title) || "Hero area"
    );
  }
  if (role === "panel") {
    return cleanString(frame.title) || `Panel ${index + 1}`;
  }
  if (role === "input") {
    return "Type here";
  }
  if (role === "button") {
    return "Continue";
  }
  if (role === "chip") {
    return "State";
  }
  if (role === "avatar") {
    return initialsFromText(frame.title || board.project || "CV");
  }
  return `Element ${index + 1}`;
}

function inferFallbackBody(role, frame, board, index) {
  const notePool = [
    cleanString(frame.layout),
    cleanString(frame.motion),
    cleanString(frame.assets),
    cleanString(frame.mobile),
    cleanString(board.goal),
    cleanString(board.designMood),
  ].filter(Boolean);
  if (role === "hero") {
    return (
      notePool[0] || "Materialized directly from the current frame geometry."
    );
  }
  if (role === "panel") {
    return (
      notePool[index % Math.max(1, notePool.length)] ||
      "Structured surface generated from the sketch."
    );
  }
  if (role === "avatar") {
    return cleanString(board.project) || "";
  }
  return notePool[0] || "";
}

function roleTag(role) {
  switch (role) {
    case "hero":
      return "Hero";
    case "panel":
      return "Panel";
    case "button":
      return "Action";
    case "chip":
      return "State";
    case "input":
      return "Input";
    case "avatar":
      return "Avatar";
    default:
      return "Element";
  }
}

function buildBoundsStyle(bounds, color) {
  const left = Number(bounds.left) || 0;
  const top = Number(bounds.top) || 0;
  const width = Math.max(12, Number(bounds.width) || 0);
  const height = Math.max(12, Number(bounds.height) || 0);
  const accent = normalizeHexColor(color) || "#ff5d3a";
  return [
    `left:${left}px`,
    `top:${top}px`,
    `width:${width}px`,
    `height:${height}px`,
    `--node-accent:${accent}`,
    `--node-fill:${rgbaFromHex(accent, 0.14)}`,
    `--node-border:${rgbaFromHex(accent, 0.4)}`,
    `--node-glow:${rgbaFromHex(accent, 0.18)}`,
  ].join(";");
}

function pickMaterializeAccent(elements) {
  const preferred = elements.find((element) => {
    const color = normalizeHexColor(element.color);
    return color && color !== "#ffffff";
  });
  return normalizeHexColor(preferred?.color) || "#ff5d3a";
}

function elementArea(element) {
  const bounds = element?.bounds;
  return (Number(bounds?.width) || 0) * (Number(bounds?.height) || 0);
}

function normalizeHexColor(value) {
  const match = cleanString(value).match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) {
    return "";
  }
  const hex = match[1].toLowerCase();
  if (hex.length === 3) {
    return `#${hex
      .split("")
      .map((character) => `${character}${character}`)
      .join("")}`;
  }
  return `#${hex}`;
}

function mixHex(baseColor, mixColor, weight = 0.5) {
  const left = hexToRgb(baseColor);
  const right = hexToRgb(mixColor);
  if (!left || !right) {
    return normalizeHexColor(baseColor) || "#ff5d3a";
  }
  const factor = clampNumber(weight, 0, 1, 0.5);
  return rgbToHex({
    r: Math.round(left.r * (1 - factor) + right.r * factor),
    g: Math.round(left.g * (1 - factor) + right.g * factor),
    b: Math.round(left.b * (1 - factor) + right.b * factor),
  });
}

function rgbaFromHex(value, alpha = 1) {
  const color = hexToRgb(value);
  const opacity = clampNumber(alpha, 0, 1, 1);
  if (!color) {
    return `rgba(255, 93, 58, ${opacity})`;
  }
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
}

function hexToRgb(value) {
  const hex = normalizeHexColor(value);
  if (!hex) {
    return null;
  }
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((channel) =>
      Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0"),
    )
    .join("")}`;
}

function truncateText(value, length) {
  const text = cleanString(value);
  if (!text || text.length <= length) {
    return text;
  }
  return `${text.slice(0, Math.max(0, length - 1)).trimEnd()}…`;
}

function initialsFromText(value) {
  const parts = cleanString(value).split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) {
    return "CV";
  }
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

async function readOptionalJson(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readOptionalText(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

async function serveWorkspace(pathname, response) {
  const relativePath = decodeURIComponent(
    pathname.replace(/^\/workspace\//, ""),
  );
  const filePath = resolve(projectRoot, relativePath);

  if (!isAllowedWorkspacePath(filePath)) {
    return writeJson(response, 403, { error: "Forbidden workspace path." });
  }

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      throw new Error("Not a file.");
    }
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type":
        mimeTypes[extname(filePath)] || "application/octet-stream",
    });
    response.end(body);
  } catch {
    writeJson(response, 404, { error: "Workspace file not found." });
  }
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
  return (
    String(input || "untitled")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "untitled"
  );
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

function enhanceLiveExport(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return {
    ...value,
    frames: Array.isArray(value.frames)
      ? value.frames.map((frame) => ({
          ...frame,
          snapshotUrl: frame.snapshotPath
            ? workspaceUrlForPath(
                frame.snapshotPath,
                frame.updatedAt || value.generatedAt,
              )
            : "",
          thumbnailUrl: frame.thumbnailPath
            ? workspaceUrlForPath(
                frame.thumbnailPath,
                frame.updatedAt || value.generatedAt,
              )
            : "",
        }))
      : [],
  };
}

function enhanceManifest(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => enhanceManifest(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const next = {};
  for (const [key, nested] of Object.entries(value)) {
    next[key] = enhanceManifest(nested);
  }

  const pathKeys = [
    "path",
    "previewPath",
    "primaryPath",
    "filePath",
    "htmlPath",
    "artifactPath",
    "outputPath",
  ];
  const versionTag =
    cleanString(value.versionTag) ||
    cleanString(value.generatedAt) ||
    cleanString(value.sourceFrameUpdatedAt) ||
    cleanString(value.updatedAt);
  for (const key of pathKeys) {
    if (typeof value[key] === "string") {
      const resolvedUrl = workspaceUrlForPath(value[key], versionTag);
      if (resolvedUrl) {
        next.resolvedUrl = resolvedUrl;
        break;
      }
    }
  }

  return next;
}

function enhancePreviewSnapshots(value) {
  if (!value || typeof value !== "object") {
    return { updatedAt: "", items: [] };
  }
  return {
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
    items: Array.isArray(value.items)
      ? value.items
          .map((item) => enhancePreviewSnapshotRecord(item))
          .filter(Boolean)
      : [],
  };
}

function enhancePreviewSnapshotRecord(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const snapshotPath = cleanString(value.snapshotPath);
  const sketchPath = cleanString(value.sketchPath);
  return {
    ...value,
    snapshotUrl: snapshotPath
      ? workspaceUrlForPath(snapshotPath, value.savedAt)
      : "",
    sketchUrl: sketchPath ? workspaceUrlForPath(sketchPath, value.savedAt) : "",
  };
}

function workspaceUrlForPath(inputPath, versionTag = "") {
  if (typeof inputPath !== "string" || !inputPath.trim()) {
    return "";
  }

  const trimmed = inputPath.trim();
  const resolvedPath = trimmed.startsWith("/")
    ? resolve(trimmed)
    : resolve(projectRoot, trimmed);

  if (!isAllowedWorkspacePath(resolvedPath)) {
    return "";
  }

  const relativePath = relative(projectRoot, resolvedPath)
    .split("\\")
    .join("/");
  const baseUrl = `/workspace/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
  if (!versionTag) {
    return baseUrl;
  }
  return `${baseUrl}?v=${encodeURIComponent(String(versionTag))}`;
}

function isAllowedWorkspacePath(filePath) {
  return (
    isWithinRoot(filePath, projectRoot) && !isWithinRoot(filePath, runtimeRoot)
  );
}

function isWithinRoot(filePath, rootPath) {
  return filePath === rootPath || filePath.startsWith(`${rootPath}/`);
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
    liveVoiceMarkdownPath,
    previewManifestPath,
    codexOutputManifestPath,
    previewSnapshotsIndexPath,
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
  const child = spawn(
    process.execPath,
    [scriptPath, "--serve", "--port", String(port)],
    {
      cwd: projectRoot,
      detached: true,
      stdio: ["ignore", logFd, logFd],
    },
  );
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
  console.log(`Live voice markdown: ${liveVoiceMarkdownPath}`);
  console.log(`Codex output manifest: ${codexOutputManifestPath}`);
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

function mergeManifestSources(manualManifest, codexManifest) {
  const manual = normalizePreviewManifest(manualManifest || {});
  const codex = normalizePreviewManifest(codexManifest || {});
  const hasManual = hasManifestContent(manual);
  const hasCodex = hasManifestContent(codex);

  if (!hasManual && !hasCodex) {
    return null;
  }
  if (!hasManual) {
    return codex;
  }
  if (!hasCodex) {
    return manual;
  }

  const targets = dedupeByKey(
    [
      ...manual.targets.map((target) => ({ ...target })),
      ...codex.targets.map((target) => ({ ...target })),
    ],
    (target) => target.id || target.url || target.previewPath,
  );
  const artifacts = dedupeByKey(
    [
      ...codex.artifacts.map((artifact) => ({ ...artifact })),
      ...manual.artifacts.map((artifact) => ({ ...artifact })),
    ],
    (artifact) => artifact.id || artifact.path || artifact.label,
  );
  const changes = dedupeByKey(
    [
      ...codex.changes.map((change) => ({ ...change })),
      ...manual.changes.map((change) => ({ ...change })),
    ],
    (change) => change.id || change.path || change.label,
  );
  const notes = [cleanString(manual.notes), cleanString(codex.notes)]
    .filter(Boolean)
    .join("\n\n");
  const primaryTarget =
    targets.find((target) => target.id === "primary") || targets[0] || null;

  return normalizePreviewManifest({
    version: 1,
    updatedAt: latestTimestamp(manual.updatedAt, codex.updatedAt),
    source: "codex+manual-preview",
    previewUrl:
      cleanString(manual.previewUrl) ||
      (!targets.length ? cleanString(codex.previewUrl) : "") ||
      cleanString(primaryTarget?.url) ||
      "",
    notes,
    targets,
    artifacts,
    changes,
  });
}

function mergePreviewManifest(existingManifest, payload) {
  const nextTarget = buildPreviewTargetFromPayload(payload);
  const baseManifest = normalizePreviewManifest(existingManifest || {});
  if (!nextTarget) {
    return baseManifest;
  }

  const remainingTargets = baseManifest.targets.filter(
    (target) => target.id !== nextTarget.id,
  );
  return normalizePreviewManifest({
    ...baseManifest,
    updatedAt: new Date().toISOString(),
    source:
      cleanString(payload.source) || baseManifest.source || "preview-window",
    previewUrl: nextTarget.url || "",
    targets: [nextTarget, ...remainingTargets],
    notes: cleanString(payload.notes) || baseManifest.notes || "",
    artifacts: Array.isArray(payload.artifacts)
      ? payload.artifacts
      : baseManifest.artifacts,
    changes: Array.isArray(payload.changes)
      ? payload.changes
      : baseManifest.changes,
  });
}

function clearPrimaryPreviewTarget(existingManifest) {
  const manifest = normalizePreviewManifest(existingManifest || {});
  const remainingTargets = manifest.targets.filter(
    (target) => target.id !== "primary",
  );
  const nextManifest = normalizePreviewManifest({
    ...manifest,
    updatedAt: new Date().toISOString(),
    previewUrl: "",
    targets: remainingTargets,
  });
  return hasManifestContent(nextManifest) ? nextManifest : null;
}

function normalizePreviewManifest(value, existingManifest = null) {
  const next =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const fallback =
    existingManifest &&
    typeof existingManifest === "object" &&
    !Array.isArray(existingManifest)
      ? existingManifest
      : {};
  const explicitTargets = Array.isArray(next.targets) ? next.targets : null;
  const directTarget = buildPreviewTargetFromPayload(next);
  const targets = normalizePreviewTargets(
    explicitTargets ??
      (directTarget
        ? [directTarget]
        : Array.isArray(fallback.targets)
          ? fallback.targets
          : []),
  );
  const primaryTarget =
    targets.find((target) => target.id === "primary") || targets[0] || null;

  return {
    version: Number(next.version) || Number(fallback.version) || 1,
    updatedAt: new Date().toISOString(),
    source: cleanString(next.source) || cleanString(fallback.source) || "codex",
    previewUrl:
      cleanString(next.previewUrl) ||
      primaryTarget?.url ||
      cleanString(fallback.previewUrl) ||
      "",
    notes: cleanString(next.notes) || cleanString(fallback.notes) || "",
    targets,
    artifacts: normalizePreviewArtifacts(
      Array.isArray(next.artifacts)
        ? next.artifacts
        : Array.isArray(fallback.artifacts)
          ? fallback.artifacts
          : [],
    ),
    changes: normalizePreviewChanges(
      Array.isArray(next.changes)
        ? next.changes
        : Array.isArray(next.changedFiles)
          ? next.changedFiles
          : Array.isArray(fallback.changes)
            ? fallback.changes
            : [],
    ),
  };
}

function normalizePreviewTargets(values) {
  return values
    .map((entry, index) => normalizePreviewTarget(entry, index))
    .filter(Boolean);
}

function normalizePreviewTarget(entry, index = 0) {
  if (!entry || (typeof entry !== "object" && typeof entry !== "string")) {
    return null;
  }

  if (typeof entry === "string") {
    const url = cleanString(entry);
    return url
      ? {
          id: index === 0 ? "primary" : `target-${index + 1}`,
          label:
            index === 0 ? "Primary preview" : `Preview target ${index + 1}`,
          source: "manifest",
          type: "implementation-preview",
          url,
          previewPath: "",
          description: "",
          frameIds: [],
          versionTag: "",
          generatedAt: "",
          sourceFrameId: "",
          sourceFrameTitle: "",
          sourceFrameUpdatedAt: "",
        }
      : null;
  }

  const url =
    cleanString(entry.url) ||
    cleanString(entry.previewUrl) ||
    cleanString(entry.targetUrl) ||
    "";
  const previewPath =
    cleanString(entry.previewPath) ||
    cleanString(entry.path) ||
    cleanString(entry.htmlPath) ||
    "";
  if (!url && !previewPath) {
    return null;
  }

  return {
    id:
      cleanString(entry.id) ||
      (index === 0 ? "primary" : `target-${index + 1}`),
    label:
      cleanString(entry.label) ||
      (index === 0 ? "Primary preview" : `Preview target ${index + 1}`),
    source: cleanString(entry.source) || "manifest",
    type: cleanString(entry.type) || "implementation-preview",
    url,
    previewPath,
    description: cleanString(entry.description),
    frameIds: normalizeStringArray(entry.frameIds),
    versionTag: cleanString(entry.versionTag),
    generatedAt: cleanString(entry.generatedAt),
    sourceFrameId: cleanString(entry.sourceFrameId),
    sourceFrameTitle: cleanString(entry.sourceFrameTitle),
    sourceFrameUpdatedAt: cleanString(entry.sourceFrameUpdatedAt),
  };
}

function normalizePreviewArtifacts(values) {
  return values
    .map((entry, index) => normalizePreviewArtifact(entry, index))
    .filter(Boolean);
}

function normalizePreviewArtifact(entry, index = 0) {
  if (!entry || (typeof entry !== "object" && typeof entry !== "string")) {
    return null;
  }

  if (typeof entry === "string") {
    const path = cleanString(entry);
    return path
      ? {
          id: `artifact-${index + 1}`,
          label: path.split("/").pop() || `Artifact ${index + 1}`,
          path,
          kind: "artifact",
          description: "",
          status: "",
          frameIds: [],
          versionTag: "",
          generatedAt: "",
          sourceFrameId: "",
          sourceFrameTitle: "",
          sourceFrameUpdatedAt: "",
        }
      : null;
  }

  const path =
    cleanString(entry.path) ||
    cleanString(entry.filePath) ||
    cleanString(entry.outputPath) ||
    "";
  const url = cleanString(entry.url) || cleanString(entry.resolvedUrl) || "";
  if (!path && !url) {
    return null;
  }

  return {
    id: cleanString(entry.id) || `artifact-${index + 1}`,
    label:
      cleanString(entry.label) ||
      path.split("/").pop() ||
      `Artifact ${index + 1}`,
    path,
    kind: cleanString(entry.kind) || cleanString(entry.type) || "artifact",
    description: cleanString(entry.description),
    status: cleanString(entry.status),
    frameIds: normalizeStringArray(entry.frameIds),
    versionTag: cleanString(entry.versionTag),
    generatedAt: cleanString(entry.generatedAt),
    sourceFrameId: cleanString(entry.sourceFrameId),
    sourceFrameTitle: cleanString(entry.sourceFrameTitle),
    sourceFrameUpdatedAt: cleanString(entry.sourceFrameUpdatedAt),
  };
}

function normalizePreviewChanges(values) {
  return values
    .map((entry, index) => normalizePreviewChange(entry, index))
    .filter(Boolean);
}

function dedupeByKey(values, buildKey) {
  const unique = new Map();
  values.forEach((value, index) => {
    const key = buildKey(value, index);
    if (!key || unique.has(key)) {
      return;
    }
    unique.set(key, value);
  });
  return [...unique.values()];
}

function latestTimestamp(...values) {
  const timestamps = values
    .map((value) => (typeof value === "string" ? value : ""))
    .filter(Boolean)
    .sort();
  return timestamps.at(-1) || new Date().toISOString();
}

function normalizePreviewChange(entry, index = 0) {
  if (!entry || (typeof entry !== "object" && typeof entry !== "string")) {
    return null;
  }

  if (typeof entry === "string") {
    const path = cleanString(entry);
    return path
      ? {
          id: `change-${index + 1}`,
          path,
          label: path.split("/").pop() || `Change ${index + 1}`,
          kind: "updated",
          summary: "",
          frameIds: [],
        }
      : null;
  }

  const path =
    cleanString(entry.path) ||
    cleanString(entry.filePath) ||
    cleanString(entry.outputPath) ||
    "";
  if (!path) {
    return null;
  }

  return {
    id: cleanString(entry.id) || `change-${index + 1}`,
    path,
    label:
      cleanString(entry.label) ||
      path.split("/").pop() ||
      `Change ${index + 1}`,
    kind: cleanString(entry.kind) || "updated",
    summary: cleanString(entry.summary) || cleanString(entry.description),
    frameIds: normalizeStringArray(entry.frameIds),
  };
}

function buildPreviewTargetFromPayload(payload) {
  const source =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : {};
  const url =
    cleanString(source.previewUrl) ||
    cleanString(source.url) ||
    cleanString(source.targetUrl) ||
    "";
  const previewPath =
    cleanString(source.previewPath) ||
    cleanString(source.path) ||
    cleanString(source.htmlPath) ||
    "";
  if (!url && !previewPath) {
    return null;
  }

  return {
    id: cleanString(source.id) || "primary",
    label: cleanString(source.label) || "Attached local preview",
    source: cleanString(source.source) || "preview-window",
    type: cleanString(source.type) || "implementation-preview",
    url,
    previewPath,
    description: cleanString(source.description),
    frameIds: normalizeStringArray(source.frameIds),
    versionTag: cleanString(source.versionTag),
    generatedAt: cleanString(source.generatedAt),
    sourceFrameId: cleanString(source.sourceFrameId),
    sourceFrameTitle: cleanString(source.sourceFrameTitle),
    sourceFrameUpdatedAt: cleanString(source.sourceFrameUpdatedAt),
  };
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => cleanString(entry)).filter(Boolean);
}

function hasManifestContent(manifest) {
  if (!manifest || typeof manifest !== "object") {
    return false;
  }
  return Boolean(
    cleanString(manifest.previewUrl) ||
    cleanString(manifest.notes) ||
    (Array.isArray(manifest.targets) && manifest.targets.length) ||
    (Array.isArray(manifest.artifacts) && manifest.artifacts.length) ||
    (Array.isArray(manifest.changes) && manifest.changes.length),
  );
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}
