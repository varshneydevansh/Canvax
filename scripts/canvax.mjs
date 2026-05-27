import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { closeSync, openSync } from "node:fs";
import {
  appendFile,
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
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
const designMdPath = resolve(projectRoot, "DESIGN.md");
const designKitsRoot = resolve(projectRoot, "design-kits");
const exportsRoot = resolve(projectRoot, "exports");
const artifactsPreviewRoot = resolve(projectRoot, "artifacts", "preview");
const materializedPreviewRoot = resolve(artifactsPreviewRoot, "materialized");
const previewSnapshotsRoot = resolve(artifactsPreviewRoot, "snapshots");
const previewSnapshotsIndexPath = resolve(
  artifactsPreviewRoot,
  "preview-snapshots.json",
);
const previewTweaksRoot = resolve(artifactsPreviewRoot, "tweaks");
const codexOutputRoot = resolve(projectRoot, "artifacts", "canvax");
const checkpointsRoot = resolve(codexOutputRoot, "checkpoints");
const checkpointsIndexPath = resolve(checkpointsRoot, "checkpoints.json");
const buildRequestsRoot = resolve(codexOutputRoot, "build-requests");
const assetCandidatesRoot = resolve(codexOutputRoot, "asset-candidates");
const runtimeRoot = resolve(
  process.env.CANVAX_RUNTIME_ROOT || resolve(projectRoot, ".canvax"),
);
const runtimePath = resolve(runtimeRoot, "runtime.json");
const serverLogPath = resolve(runtimeRoot, "server.log");
const liveJsonPath = resolve(exportsRoot, "canvax-live-latest.json");
const liveMarkdownPath = resolve(exportsRoot, "canvax-live-latest.md");
const liveVoiceMarkdownPath = resolve(exportsRoot, "canvax-voice-latest.md");
const taskPackJsonPath = resolve(exportsRoot, "canvax-task-pack-latest.json");
const taskPackMarkdownPath = resolve(exportsRoot, "canvax-task-pack-latest.md");
const rewriteRequestJsonPath = resolve(
  exportsRoot,
  "canvax-rewrite-request-latest.json",
);
const rewriteRequestMarkdownPath = resolve(
  exportsRoot,
  "canvax-rewrite-request-latest.md",
);
const buildRealRequestJsonPath = resolve(
  exportsRoot,
  "canvax-build-real-latest.json",
);
const buildRealRequestMarkdownPath = resolve(
  exportsRoot,
  "canvax-build-real-latest.md",
);
const imagePromptPackJsonPath = resolve(
  exportsRoot,
  "canvax-image-prompt-pack-latest.json",
);
const imagePromptPackMarkdownPath = resolve(
  exportsRoot,
  "canvax-image-prompt-pack-latest.md",
);
const assetCandidatesJsonPath = resolve(
  exportsRoot,
  "canvax-asset-candidates-latest.json",
);
const assetCandidatesMarkdownPath = resolve(
  exportsRoot,
  "canvax-asset-candidates-latest.md",
);
const imageGenerationBriefJsonPath = resolve(
  exportsRoot,
  "canvax-image-generation-brief-latest.json",
);
const imageGenerationBriefMarkdownPath = resolve(
  exportsRoot,
  "canvax-image-generation-brief-latest.md",
);
const imageHostTaskJsonPath = resolve(
  exportsRoot,
  "canvax-image-host-task-latest.json",
);
const imageHostTaskMarkdownPath = resolve(
  exportsRoot,
  "canvax-image-host-task-latest.md",
);
const imageResultsJsonPath = resolve(
  exportsRoot,
  "canvax-image-results-latest.json",
);
const imageResultsMarkdownPath = resolve(
  exportsRoot,
  "canvax-image-results-latest.md",
);
const transcriptBridgePath = resolve(exportsRoot, "canvax-transcript-bridge.json");
const transcriptBridgeMarkdownPath = resolve(
  exportsRoot,
  "canvax-transcript-bridge-latest.md",
);
const latestCheckpointPath = resolve(
  exportsRoot,
  "canvax-checkpoint-latest.json",
);
const sessionEventsPath = resolve(exportsRoot, "canvax-session-events.jsonl");
const projectExportsRoot = resolve(exportsRoot, "projects");
const projectRegistryJsonPath = resolve(
  exportsRoot,
  "canvax-project-registry-latest.json",
);
const projectRegistryMarkdownPath = resolve(
  exportsRoot,
  "canvax-project-registry-latest.md",
);
const previewManifestPath = resolve(
  exportsRoot,
  "canvax-preview-manifest.json",
);
const previewTweakJsonPath = resolve(
  exportsRoot,
  "canvax-preview-tweak-latest.json",
);
const previewTweakMarkdownPath = resolve(
  exportsRoot,
  "canvax-preview-tweak-latest.md",
);
const designJuryJsonPath = resolve(exportsRoot, "canvax-design-jury-latest.json");
const designJuryMarkdownPath = resolve(
  exportsRoot,
  "canvax-design-jury-latest.md",
);
const codexOutputManifestPath = resolve(codexOutputRoot, "codex-output.json");
const legacyJsonPath = resolve(exportsRoot, "canvax-storyboard-latest.json");
const legacyMarkdownPath = resolve(exportsRoot, "canvax-storyboard-latest.md");
const skillSource = resolve(projectRoot, "codex-skill", "canvax");
const skillTarget = resolve(homedir(), ".codex", "skills", "canvax");
const defaultPort = Number(process.env.CANVAX_PORT || 3210);
const HANDOFF_SCHEMA_VERSION = 1;
const WORKSPACE_FOLLOW_TTL_MS = 1200;
const LIVE_PREVIEW_STORAGE_KEY = "canvax-preview-live-v1";
const LIVE_PREVIEW_CHANNEL_NAME = "canvax-preview-live-v1";
const LOCAL_TRANSPORT_MODE = "local-companion";
const FUTURE_TRANSPORT_MODE = "app-server";
const PREVIEW_MANIFEST_TARGET_LIMIT = 48;
const PREVIEW_MANIFEST_ARTIFACT_LIMIT = 120;
const PREVIEW_MANIFEST_CHANGE_LIMIT = 80;
const PREVIEW_MANIFEST_NOTE_LIMIT = 16;

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
const externalOpenTarget = readExternalOpenTarget(args);
const shouldOpenExternal = Boolean(externalOpenTarget);
const wantsStop = args.includes("--stop");
const wantsStatus = args.includes("--status");
const wantsJson = args.includes("--json");
const wantsRestart = args.includes("--restart");
const wantsServe = args.includes("--serve");
const wantsHelp = args.includes("--help") || args.includes("-h");
const wantsTranscriptBridge =
  args.includes("--transcript") ||
  args.includes("--codex-transcript") ||
  args.includes("--note");
let workspaceFollowCache = null;

function buildCodexEditorUrl(baseUrl) {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("host", "codex-sidecar");
    return url.toString();
  } catch {
    return `${String(baseUrl || "").replace(/\/$/, "")}/?host=codex-sidecar`;
  }
}

function buildTransportDescriptor(overrides = {}) {
  const base = {
    id: "canvax-local-companion-v1",
    mode: LOCAL_TRANSPORT_MODE,
    label: "Local companion",
    runtime: "browser board + local Node service + Codex skill",
    durableHandoff: {
      type: "file-export",
      primary: "exports/canvax-live-latest.json",
      markdown: "exports/canvax-live-latest.md",
      voice: "exports/canvax-voice-latest.md",
      checkpoint: "exports/canvax-checkpoint-latest.json",
      projectRegistry: "exports/canvax-project-registry-latest.json",
      taskPack: "exports/canvax-task-pack-latest.json",
      rewriteRequest: "exports/canvax-rewrite-request-latest.json",
      buildRealRequest: "exports/canvax-build-real-latest.json",
      imagePromptPack: "exports/canvax-image-prompt-pack-latest.json",
      assetCandidates: "exports/canvax-asset-candidates-latest.json",
      imageGenerationBrief:
        "exports/canvax-image-generation-brief-latest.json",
      imageHostTask: "exports/canvax-image-host-task-latest.json",
      imageResults: "exports/canvax-image-results-latest.json",
    },
    liveMirror: {
      type: "browser-storage",
      storageKey: LIVE_PREVIEW_STORAGE_KEY,
      channel: LIVE_PREVIEW_CHANNEL_NAME,
    },
    outputBinding: {
      type: "manifest",
      manual: "exports/canvax-preview-manifest.json",
      codex: "artifacts/canvax/codex-output.json",
      workspaceFollow: "git-status-live",
    },
    future: {
      mode: FUTURE_TRANSPORT_MODE,
      label: "App Server client",
      protocol: "json-rpc",
      status: "planned",
    },
  };

  return {
    ...base,
    ...(overrides && typeof overrides === "object" && !Array.isArray(overrides)
      ? overrides
      : {}),
    durableHandoff: {
      ...base.durableHandoff,
      ...(overrides?.durableHandoff &&
      typeof overrides.durableHandoff === "object" &&
      !Array.isArray(overrides.durableHandoff)
        ? overrides.durableHandoff
        : {}),
    },
    liveMirror: {
      ...base.liveMirror,
      ...(overrides?.liveMirror &&
      typeof overrides.liveMirror === "object" &&
      !Array.isArray(overrides.liveMirror)
        ? overrides.liveMirror
        : {}),
    },
    outputBinding: {
      ...base.outputBinding,
      ...(overrides?.outputBinding &&
      typeof overrides.outputBinding === "object" &&
      !Array.isArray(overrides.outputBinding)
        ? overrides.outputBinding
        : {}),
    },
    future: {
      ...base.future,
      ...(overrides?.future &&
      typeof overrides.future === "object" &&
      !Array.isArray(overrides.future)
        ? overrides.future
        : {}),
    },
  };
}

function buildHostCapabilities() {
  return {
    codexBrowser: {
      available: true,
      mode: "preferred-local-browser",
      detail:
        "Canvax is served locally and is intended to run inside the Codex in-app browser when that surface is available.",
    },
    codexWorkspace: {
      available: true,
      mode: "file-manifest-handoff",
      detail:
        "Codex can read exports, task packs, prompt packs, checkpoints, and output manifests from this workspace.",
    },
    hostImageGeneration: {
      available: false,
      mode: "prompt-pack-handoff",
      detail:
        "No direct host image-generation bridge is exposed to the local Canvax page. Use the exported image prompt pack with the current Codex/ChatGPT host when image generation is available there.",
    },
    nativeMicBridge: {
      available: false,
      mode: "browser-speech-or-transcript-bridge",
      detail:
        "The local board cannot directly read Codex/ChatGPT microphone input. Use browser speech, manual dictation paste, or the Codex transcript bridge.",
    },
    requiresOpenAiApiKey: false,
  };
}

async function readDesignContext() {
  try {
    const fileStats = await stat(designMdPath);
    if (!fileStats.isFile()) {
      throw new Error("DESIGN.md is not a file.");
    }
    const content = await readFile(designMdPath, "utf8");
    return {
      exists: true,
      path: designMdPath,
      relativePath: "DESIGN.md",
      updatedAt: fileStats.mtime.toISOString(),
      size: fileStats.size,
      summary: summarizeDesignContext(content),
      content: content.slice(0, 24000),
    };
  } catch {
    return {
      exists: false,
      path: designMdPath,
      relativePath: "DESIGN.md",
      summary:
        "No DESIGN.md found. Canvax will use board mood, labels, frame notes, and generation recipe as the design contract.",
      content: "",
    };
  }
}

async function readDesignKitGallery() {
  const kits = [];
  try {
    const entries = await readdir(designKitsRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }
      try {
        const raw = await readFile(resolve(designKitsRoot, entry.name), "utf8");
        const parsed = JSON.parse(raw);
        const kit = normalizeDesignKitGalleryPreset(parsed, entry.name);
        if (kit) {
          kits.push(kit);
        }
      } catch {
        // Ignore malformed local kit files so one bad file does not break Canvax.
      }
    }
  } catch {
    return {
      exists: false,
      path: designKitsRoot,
      relativeDirectory: "design-kits",
      count: 0,
      kits: [],
      summary:
        "No design-kits directory found. Built-in Canvax presets remain available.",
    };
  }

  kits.sort((a, b) => a.label.localeCompare(b.label));
  return {
    exists: true,
    path: designKitsRoot,
    relativeDirectory: "design-kits",
    count: kits.length,
    kits,
    summary: kits.length
      ? `${kits.length} repository design kits available.`
      : "design-kits exists but has no valid JSON kit files.",
  };
}

function normalizeDesignKitGalleryPreset(source, fileName) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return null;
  }
  const baseId = cleanString(source.id) || fileName.replace(/\.json$/i, "");
  const id = safeDesignKitId(baseId);
  if (!id) {
    return null;
  }
  const generation =
    source.generation && typeof source.generation === "object"
      ? source.generation
      : {};
  const frame =
    source.frame && typeof source.frame === "object" ? source.frame : {};
  return {
    id,
    label: cleanString(source.label) || id,
    summary:
      cleanString(source.summary) ||
      "Repository design kit loaded from design-kits.",
    audience: cleanString(source.audience),
    mood: cleanString(source.mood),
    actionMode: cleanString(source.actionMode) || "build-ui",
    viewport: cleanString(source.viewport) || "desktop",
    generation: {
      direction: cleanString(generation.direction) || "product",
      style: cleanString(generation.style) || "studio",
      focus: cleanString(generation.focus) || "balanced",
    },
    frame: {
      objective: cleanString(frame.objective),
      layout: cleanString(frame.layout),
      motion: cleanString(frame.motion),
      assets: cleanString(frame.assets),
      mobile: cleanString(frame.mobile),
    },
    source: {
      kind: "repository-design-kit",
      path: `design-kits/${fileName}`,
    },
  };
}

function safeDesignKitId(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function summarizeDesignContext(content) {
  return String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("```"))
    .slice(0, 8)
    .join(" ")
    .slice(0, 1000);
}

function normalizeTransportDescriptor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return buildTransportDescriptor();
  }
  return buildTransportDescriptor(value);
}

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

  if (wantsTranscriptBridge) {
    return handleTranscriptBridgeCli();
  }

  if (wantsStop) {
    let runtime = await getRunningRuntime();
    if (!runtime) {
      runtime = (await inspectPortForRuntime(requestedPort)).runtime;
    }
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
          rewriteRequestJsonPath,
          rewriteRequestMarkdownPath,
          transcriptBridgePath,
          transcriptBridgeMarkdownPath,
          buildRealRequestJsonPath,
          buildRealRequestMarkdownPath,
          designJuryJsonPath,
          designJuryMarkdownPath,
          buildRequestsRoot,
          assetCandidatesJsonPath,
          assetCandidatesMarkdownPath,
          imageGenerationBriefJsonPath,
          imageGenerationBriefMarkdownPath,
          imageHostTaskJsonPath,
          imageHostTaskMarkdownPath,
          imageResultsJsonPath,
          imageResultsMarkdownPath,
          projectExportsRoot,
          projectRegistryJsonPath,
          projectRegistryMarkdownPath,
          assetCandidatesRoot,
          latestCheckpointPath,
          checkpointsIndexPath,
          sessionEventsPath,
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
        pid: runtime.pid,
        port: runtime.port,
        url: runtime.url,
        defaultPort,
        liveJsonPath,
        liveMarkdownPath,
        liveVoiceMarkdownPath,
        rewriteRequestJsonPath,
        rewriteRequestMarkdownPath,
        transcriptBridgePath,
        transcriptBridgeMarkdownPath,
        buildRealRequestJsonPath,
        buildRealRequestMarkdownPath,
        buildRequestsRoot,
        assetCandidatesJsonPath,
        assetCandidatesMarkdownPath,
        imageGenerationBriefJsonPath,
        imageGenerationBriefMarkdownPath,
        imageHostTaskJsonPath,
        imageHostTaskMarkdownPath,
        imageResultsJsonPath,
        imageResultsMarkdownPath,
        assetCandidatesRoot,
        latestCheckpointPath,
        checkpointsIndexPath,
        sessionEventsPath,
      },
      "Canvax stopped.",
    );
  }

  if (wantsStatus) {
    const runtime =
      (await getRunningRuntime()) ||
      (await inspectPortForRuntime(requestedPort)).runtime;
    if (!runtime) {
      const portState = await inspectPortForRuntime(requestedPort);
      return printCliOutput(
        wantsJson,
        {
          running: false,
          requestedPort,
          portOccupied: portState.occupied,
          portOccupant: portState.occupant,
          defaultPort,
          liveJsonPath,
          liveMarkdownPath,
          liveVoiceMarkdownPath,
          rewriteRequestJsonPath,
          rewriteRequestMarkdownPath,
          transcriptBridgePath,
          transcriptBridgeMarkdownPath,
          buildRealRequestJsonPath,
          buildRealRequestMarkdownPath,
          buildRequestsRoot,
          assetCandidatesJsonPath,
          assetCandidatesMarkdownPath,
          imageGenerationBriefJsonPath,
          imageGenerationBriefMarkdownPath,
          imageHostTaskJsonPath,
          imageHostTaskMarkdownPath,
          imageResultsJsonPath,
          imageResultsMarkdownPath,
          assetCandidatesRoot,
          latestCheckpointPath,
          checkpointsIndexPath,
          sessionEventsPath,
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
  let inspectedPort = null;

  if (runtime && wantsRestart) {
    await stopRuntime(runtime);
    runtime = null;
  }

  if (!runtime) {
    inspectedPort = await inspectPortForRuntime(requestedPort);
    if (inspectedPort.runtime) {
      if (wantsRestart) {
        await stopRuntime(inspectedPort.runtime);
      } else {
        runtime = inspectedPort.runtime;
      }
    } else if (inspectedPort.occupied) {
      process.exitCode = 1;
      return printCliError(
        wantsJson,
        {
          running: false,
          started: false,
          requestedPort,
          portOccupied: true,
          portOccupant: inspectedPort.occupant,
          defaultPort,
          runtimePath,
          serverLogPath,
        },
        `Port ${requestedPort} is already occupied by a non-Canvax process. Stop that process or run ./canvax --port <free-port>.`,
      );
    }
  }

  if (runtime) {
    if (readPort(args) !== null && runtime.port !== requestedPort) {
      if (shouldOpenExternal) {
        openUrl(runtime.url, externalOpenTarget);
      }
      return printCliOutput(
        wantsJson,
        {
          running: true,
          reused: true,
          requestedPort,
          portMismatch: true,
          openedExternalBrowser: shouldOpenExternal,
          externalBrowser: externalOpenTarget,
          ...runtime,
        },
        `Canvax is already running at ${runtime.url}. Requested port ${requestedPort} was ignored. Use --restart to move it.`,
      );
    }

    if (shouldOpenExternal) {
      openUrl(runtime.url, externalOpenTarget);
    }

    return printCliOutput(
      wantsJson,
      {
        running: true,
        reused: true,
        openedExternalBrowser: shouldOpenExternal,
        externalBrowser: externalOpenTarget,
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

  if (shouldOpenExternal) {
    openUrl(runtime.url, externalOpenTarget);
  }

  return printCliOutput(
    wantsJson,
    {
      running: true,
      started: true,
      openedExternalBrowser: shouldOpenExternal,
      externalBrowser: externalOpenTarget,
      ...runtime,
    },
    `Canvax attached at ${runtime.url}`,
  );
}

async function handleTranscriptBridgeCli() {
  const text = readTranscriptText(args);
  const result = await appendTranscriptBridgeEntry({
    text,
    scope: readTranscriptScope(args),
    frameId: readArgValue(args, ["--frame", "--frame-id"]),
    frameTitle: readArgValue(args, "--frame-title"),
    source: readArgValue(args, "--source") || "codex-chat",
    provider: readArgValue(args, "--provider") || "codex-transcript-bridge",
    at: readArgValue(args, "--at"),
  });

  if (!result) {
    const payload = {
      queued: false,
      error: 'Transcript text is required. Use ./canvax --transcript "...".',
      transcriptBridgePath,
    };
    if (wantsJson) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.error(payload.error);
    }
    process.exitCode = 1;
    return;
  }

  const payload = {
    queued: true,
    entry: result.entry,
    transcriptBridgePath,
    transcriptBridgeMarkdownPath,
  };
  if (wantsJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log(
    `Codex transcript queued for Canvax (${result.entry.scope === "session" ? "whole board" : "current frame"}).`,
  );
  console.log(`Transcript bridge: ${transcriptBridgePath}`);
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
          pid: process.pid,
          projectRoot,
          exportRoot: exportsRoot,
          materializedPreviewRoot,
          liveJsonPath,
          liveMarkdownPath,
          liveVoiceMarkdownPath,
          rewriteRequestJsonPath,
          rewriteRequestMarkdownPath,
          transcriptBridgePath,
          transcriptBridgeMarkdownPath,
          buildRealRequestJsonPath,
          buildRealRequestMarkdownPath,
          buildRequestsRoot,
          assetCandidatesJsonPath,
          assetCandidatesMarkdownPath,
          imageGenerationBriefJsonPath,
          imageGenerationBriefMarkdownPath,
          imageHostTaskJsonPath,
          imageHostTaskMarkdownPath,
          imageResultsJsonPath,
          imageResultsMarkdownPath,
          assetCandidatesRoot,
          latestCheckpointPath,
          checkpointsIndexPath,
          sessionEventsPath,
          previewManifestPath,
          codexOutputManifestPath,
          previewSnapshotsIndexPath,
          previewUrl: `http://localhost:${port}/preview.html`,
          runtimePath,
          startedAt: (await readRuntime())?.startedAt || "",
          transport: buildTransportDescriptor(),
          hostCapabilities: buildHostCapabilities(),
          designContext: await readDesignContext(),
          designKitGallery: await readDesignKitGallery(),
          url: `http://localhost:${port}`,
          codexEditorUrl: buildCodexEditorUrl(`http://localhost:${port}`),
          codexSidecarUrl: buildCodexEditorUrl(`http://localhost:${port}`),
        });
      }

      if (request.method === "GET" && url.pathname === "/api/preview-state") {
        return handlePreviewState(response);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/codex-transcript"
      ) {
        return handleCodexTranscript(request, response);
      }

      if (request.method === "POST" && url.pathname === "/api/save-export") {
        return handleSaveExport(request, response);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/save-build-request"
      ) {
        return handleSaveBuildRequest(request, response);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/execute-build-request"
      ) {
        return handleExecuteBuildRequest(request, response);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/execute-rewrite-request"
      ) {
        return handleExecuteRewriteRequest(request, response);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/run-design-review"
      ) {
        return handleRunDesignReview(request, response);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/save-asset-candidates"
      ) {
        return handleSaveAssetCandidates(request, response);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/save-checkpoint"
      ) {
        return handleSaveCheckpoint(request, response);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/publish-workspace-output"
      ) {
        return handlePublishWorkspaceOutput(request, response);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/write-design-context"
      ) {
        return handleWriteDesignContext(request, response);
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
        url.pathname === "/api/save-preview-tweak"
      ) {
        return handleSavePreviewTweak(request, response);
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
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });
    response.end(body);
  } catch {
    writeJson(response, 404, { error: "Not found." });
  }
}

function normalizeProjectExportMetadata(source, exportPackage = {}) {
  const board = exportPackage.board || {};
  const rawId = cleanString(source?.id);
  const title =
    cleanString(source?.title) ||
    cleanString(board.project) ||
    "Canvax project";
  const id = slugify(rawId || `${title}-${hashString(title)}`);
  const root = join("exports", "projects", id);
  return {
    kind: "canvax-project",
    storage: "browser-local-plus-file-export",
    id,
    title,
    frameCount: Array.isArray(exportPackage.frames)
      ? exportPackage.frames.length
      : Number(source?.frameCount) || 0,
    activeFrameId: cleanString(source?.activeFrameId || exportPackage.activeFrameId),
    activeFrameTitle: cleanString(source?.activeFrameTitle),
    registryPath: "exports/canvax-project-registry-latest.json",
    handoff: {
      root,
      liveJsonPath: join(root, "canvax-live-latest.json"),
      liveMarkdownPath: join(root, "canvax-live-latest.md"),
      voiceMarkdownPath: join(root, "canvax-voice-latest.md"),
      taskPackJsonPath: join(root, "canvax-task-pack-latest.json"),
      taskPackMarkdownPath: join(root, "canvax-task-pack-latest.md"),
      rewriteRequestJsonPath: join(root, "canvax-rewrite-request-latest.json"),
      rewriteRequestMarkdownPath: join(root, "canvax-rewrite-request-latest.md"),
      imagePromptPackJsonPath: join(
        root,
        "canvax-image-prompt-pack-latest.json",
      ),
      imagePromptPackMarkdownPath: join(
        root,
        "canvax-image-prompt-pack-latest.md",
      ),
      assetCandidatesJsonPath: join(root, "canvax-asset-candidates-latest.json"),
      assetCandidatesMarkdownPath: join(root, "canvax-asset-candidates-latest.md"),
      imageGenerationBriefJsonPath: join(
        root,
        "canvax-image-generation-brief-latest.json",
      ),
      imageGenerationBriefMarkdownPath: join(
        root,
        "canvax-image-generation-brief-latest.md",
      ),
      imageHostTaskJsonPath: join(root, "canvax-image-host-task-latest.json"),
      imageHostTaskMarkdownPath: join(root, "canvax-image-host-task-latest.md"),
      imageResultsJsonPath: join(root, "canvax-image-results-latest.json"),
      imageResultsMarkdownPath: join(root, "canvax-image-results-latest.md"),
      buildRequestJsonPath: join(root, "canvax-build-real-latest.json"),
      buildRequestMarkdownPath: join(root, "canvax-build-real-latest.md"),
      checkpointJsonPath: join(root, "canvax-checkpoint-latest.json"),
      checkpointsIndexPath: join(root, "canvax-checkpoints.json"),
    },
    compatibilityHandoff: {
      liveJsonPath: "exports/canvax-live-latest.json",
      liveMarkdownPath: "exports/canvax-live-latest.md",
    },
  };
}

function attachProjectMetadata(value, project) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  return {
    ...value,
    project,
  };
}

function buildProjectRegistryRecord(project, exportJson, archiveRoot) {
  const frames = Array.isArray(exportJson.frames) ? exportJson.frames : [];
  const activeFrame =
    frames.find((frame) => frame.id === exportJson.activeFrameId) ||
    frames[0] ||
    {};
  return {
    id: project.id,
    title: project.title,
    frameCount: frames.length,
    activeFrameId: exportJson.activeFrameId || "",
    activeFrameTitle: cleanString(activeFrame.title || project.activeFrameTitle),
    updatedAt: exportJson.generatedAt || new Date().toISOString(),
    latestExportAt: exportJson.generatedAt || new Date().toISOString(),
    archiveRoot: toWorkspaceRelativePath(archiveRoot),
    handoff: project.handoff,
    compatibilityHandoff: project.compatibilityHandoff,
  };
}

async function updateProjectRegistryExport(project, exportJson, archiveRoot) {
  const existing = await readOptionalJson(projectRegistryJsonPath);
  const projects = Array.isArray(existing?.projects) ? existing.projects : [];
  const record = buildProjectRegistryRecord(project, exportJson, archiveRoot);
  const registry = {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    kind: "canvax-project-registry",
    generatedAt: exportJson.generatedAt || new Date().toISOString(),
    activeProjectId: project.id,
    activeProjectTitle: project.title,
    projectCount: 1 + projects.filter((item) => item?.id !== project.id).length,
    projects: [
      record,
      ...projects.filter((item) => item?.id && item.id !== project.id),
    ],
    compatibilityHandoff: {
      liveJsonPath: "exports/canvax-live-latest.json",
      liveMarkdownPath: "exports/canvax-live-latest.md",
      note:
        "The active project mirrors to these shared latest files for existing /canvax workflows.",
    },
  };
  const jsonBody = `${JSON.stringify(registry, null, 2)}\n`;
  await writeTextFileAtomic(projectRegistryJsonPath, jsonBody);
  await writeTextFileAtomic(
    projectRegistryMarkdownPath,
    buildProjectRegistryMarkdown(registry),
  );
  return registry;
}

function buildProjectRegistryMarkdown(registry) {
  const lines = [
    "# Canvax Project Registry",
    "",
    `- Generated: ${registry.generatedAt}`,
    `- Active project: ${registry.activeProjectTitle} (${registry.activeProjectId})`,
    `- Project count: ${registry.projectCount}`,
    "",
    "## Projects",
    "",
  ];
  registry.projects.forEach((project, index) => {
    lines.push(
      `${index + 1}. ${project.title} (${project.id})`,
      `   - Frames: ${project.frameCount}`,
      `   - Active frame: ${project.activeFrameTitle || project.activeFrameId}`,
      `   - Latest handoff: ${project.handoff?.liveJsonPath || ""}`,
      `   - Archive: ${project.archiveRoot || ""}`,
      "",
    );
  });
  lines.push(
    "## Compatibility",
    "",
    "- Codex should keep reading `exports/canvax-live-latest.json` unless the user explicitly asks for a specific project path.",
    "- The project-scoped files preserve each active project's latest handoff under `exports/projects/<project-id>/`.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

async function writeProjectLatestFile(project, fileName, body) {
  if (!project?.id || !fileName) {
    return "";
  }
  const root = resolve(projectExportsRoot, project.id);
  await mkdir(root, { recursive: true });
  await writeTextFileAtomic(resolve(root, fileName), body);
  return join(
    project.handoff?.root || join("exports", "projects", project.id),
    fileName,
  );
}

async function updateProjectCheckpointIndex(project, record) {
  if (!project?.id || !record) {
    return "";
  }
  const root = resolve(projectExportsRoot, project.id);
  const indexPath = resolve(root, "canvax-checkpoints.json");
  const existing = await readOptionalJson(indexPath);
  const existingItems = Array.isArray(existing?.items) ? existing.items : [];
  const next = {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    kind: "canvax-project-checkpoints",
    updatedAt: new Date().toISOString(),
    project: {
      id: project.id,
      title: project.title,
    },
    items: [record, ...existingItems].slice(0, 32),
  };
  await mkdir(root, { recursive: true });
  await writeTextFileAtomic(indexPath, `${JSON.stringify(next, null, 2)}\n`);
  return join(
    project.handoff?.root || join("exports", "projects", project.id),
    "canvax-checkpoints.json",
  );
}

function manifestProjectId(value) {
  const explicit =
    cleanString(value?.projectId) ||
    cleanString(value?.activeProjectId) ||
    cleanString(value?.project?.id);
  if (explicit) {
    return explicit;
  }
  const kind = cleanString(value?.kind);
  const looksLikeProject =
    kind === "canvax-project" ||
    cleanString(value?.storage) === "browser-local-plus-file-export" ||
    Boolean(value?.handoff) ||
    Boolean(value?.compatibilityHandoff) ||
    Array.isArray(value?.projects);
  return looksLikeProject ? cleanString(value?.id) : "";
}

function normalizeManifestProject(value) {
  const id = cleanString(value?.id) || manifestProjectId(value);
  if (!id) {
    return null;
  }
  return {
    id,
    title:
      cleanString(value?.title) ||
      cleanString(value?.projectTitle) ||
      cleanString(value?.name),
  };
}

function liveExportProject(liveExport) {
  return normalizeManifestProject(liveExport?.project);
}

function liveExportFrameIds(liveExport) {
  const ids = new Set();
  if (Array.isArray(liveExport?.frames)) {
    liveExport.frames.forEach((frame) => {
      const id = cleanString(frame?.id);
      if (id) {
        ids.add(id);
      }
    });
  }
  [
    cleanString(liveExport?.activeFrameId),
    cleanString(liveExport?.entryFrameId),
  ].forEach((id) => {
    if (id) {
      ids.add(id);
    }
  });
  return ids;
}

function manifestEntryFrameIds(entry) {
  const ids = normalizeStringArray(entry?.frameIds);
  [
    cleanString(entry?.frameId),
    cleanString(entry?.sourceFrameId),
  ].forEach((id) => {
    if (id) {
      ids.push(id);
    }
  });
  return Array.from(new Set(ids));
}

function manifestEntryMatchesLiveProject(entry, project, frameIds) {
  const entryProjectId = manifestProjectId(entry);
  if (entryProjectId) {
    return entryProjectId === project.id;
  }
  const ids = manifestEntryFrameIds(entry);
  if (ids.length) {
    return ids.some((id) => frameIds.has(id));
  }
  return false;
}

function scopePreviewManifestToLiveProject(manifest, liveExport) {
  const project = liveExportProject(liveExport);
  if (!project || !manifest || typeof manifest !== "object") {
    return manifest;
  }
  const manifestProject = manifestProjectId(manifest);
  if (manifestProject) {
    return manifestProject === project.id ? manifest : null;
  }
  const normalized = normalizePreviewManifest(manifest);
  const frameIds = liveExportFrameIds(liveExport);
  const targets = normalizePreviewTargets(normalized.targets || []).filter(
    (target) => manifestEntryMatchesLiveProject(target, project, frameIds),
  );
  const artifacts = normalizePreviewArtifacts(normalized.artifacts || []).filter(
    (artifact) => manifestEntryMatchesLiveProject(artifact, project, frameIds),
  );
  const changes = normalizePreviewChanges(
    normalized.changes || [],
  ).filter((change) => manifestEntryMatchesLiveProject(change, project, frameIds));
  if (!targets.length && !artifacts.length && !changes.length) {
    return null;
  }
  return normalizePreviewManifest({
    ...normalized,
    project,
    targets,
    artifacts,
    changes,
    previewUrl: "",
  });
}

function scopeImageResultPackToLiveProject(pack, liveExport) {
  if (!pack || typeof pack !== "object") {
    return null;
  }
  const project = liveExportProject(liveExport);
  if (!project) {
    return pack;
  }
  const packProjectId = cleanString(pack.project?.id || pack.projectId);
  if (packProjectId && packProjectId !== project.id) {
    return null;
  }
  const frameIds = liveExportFrameIds(liveExport);
  const results = Array.isArray(pack.results)
    ? pack.results.filter((result) => {
        const frameId = cleanString(result.sourceFrameId || result.frameId);
        return !frameId || frameIds.has(frameId);
      })
    : [];
  if (!results.length && Array.isArray(pack.results) && pack.results.length) {
    return null;
  }
  return {
    ...pack,
    project: pack.project || project,
    results,
    resultCount: results.length,
  };
}

async function readCheckpointHistoryForLiveProject(liveExport) {
  const project = liveExportProject(liveExport);
  if (!project?.id) {
    return enhanceCheckpointHistory(await readOptionalJson(checkpointsIndexPath));
  }
  const projectIndexPath = resolve(
    projectExportsRoot,
    project.id,
    "canvax-checkpoints.json",
  );
  const projectIndex = await readOptionalJson(projectIndexPath);
  if (projectIndex && typeof projectIndex === "object") {
    return enhanceCheckpointHistory({
      ...projectIndex,
      project: projectIndex.project || project,
      source: "project-scoped",
    });
  }
  return enhanceCheckpointHistory({
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    kind: "canvax-project-checkpoints",
    updatedAt: "",
    project,
    source: "project-scoped",
    items: [],
  });
}

async function handleSaveExport(request, response) {
  const payload = await readJson(request);
  if (!payload.package || !Array.isArray(payload.package.frames)) {
    return writeJson(response, 400, {
      error: "Export package is missing frames.",
    });
  }

  const timestamp = buildTimestamp();
  const project = normalizeProjectExportMetadata(
    payload.package.project,
    payload.package,
  );
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
  const activeProjectRoot = resolve(projectExportsRoot, project.id);
  const projectAssetRoot = resolve(activeProjectRoot, "assets");

  await mkdir(assetRoot, { recursive: true });
  await mkdir(archiveAssetRoot, { recursive: true });
  await mkdir(projectAssetRoot, { recursive: true });

  const savedFrames = [];
  const projectSavedFrames = [];

  for (const frame of payload.package.frames) {
    const frameSlug = `${String(frame.index).padStart(2, "0")}-${slugify(frame.title || `frame-${frame.index}`)}`;
    const snapshotName = `${frameSlug}.jpg`;
    const thumbName = `${frameSlug}-thumb.jpg`;

    const latestSnapshotPath = resolve(assetRoot, snapshotName);
    const archiveSnapshotPath = resolve(archiveAssetRoot, snapshotName);
    const latestThumbPath = resolve(assetRoot, thumbName);
    const archiveThumbPath = resolve(archiveAssetRoot, thumbName);
    const projectSnapshotPath = resolve(projectAssetRoot, snapshotName);
    const projectThumbPath = resolve(projectAssetRoot, thumbName);

    if (frame.snapshotDataUrl) {
      const snapshotBuffer = decodeDataUrl(frame.snapshotDataUrl);
      await writeFile(latestSnapshotPath, snapshotBuffer);
      await writeFile(archiveSnapshotPath, snapshotBuffer);
      await writeFile(projectSnapshotPath, snapshotBuffer);
    }

    if (frame.thumbnailDataUrl) {
      const thumbnailBuffer = decodeDataUrl(frame.thumbnailDataUrl);
      await writeFile(latestThumbPath, thumbnailBuffer);
      await writeFile(archiveThumbPath, thumbnailBuffer);
      await writeFile(projectThumbPath, thumbnailBuffer);
    }

    savedFrames.push({
      ...frame,
      snapshotPath: join("exports", "assets", snapshotName),
      thumbnailPath: join("exports", "assets", thumbName),
      snapshotDataUrl: undefined,
      thumbnailDataUrl: undefined,
    });
    projectSavedFrames.push({
      ...frame,
      snapshotPath: join(project.handoff.root, "assets", snapshotName),
      thumbnailPath: join(project.handoff.root, "assets", thumbName),
      compatibilitySnapshotPath: join("exports", "assets", snapshotName),
      compatibilityThumbnailPath: join("exports", "assets", thumbName),
      snapshotDataUrl: undefined,
      thumbnailDataUrl: undefined,
    });
  }

  const exportJson = {
    ...payload.package,
    schemaVersion:
      Number(payload.package.schemaVersion) || HANDOFF_SCHEMA_VERSION,
    storageVersion: Number(payload.package.storageVersion) || 0,
    transport: normalizeTransportDescriptor(payload.package.transport),
    project,
    frames: savedFrames,
  };
  const projectExportJson = {
    ...exportJson,
    project,
    frames: projectSavedFrames,
  };

  await mkdir(archiveRoot, { recursive: true });

  const archiveJsonPath = resolve(archiveRoot, "storyboard.json");
  const archiveMarkdownPath = resolve(archiveRoot, "storyboard.md");
  const archiveVoiceMarkdownPath = resolve(archiveRoot, "voice-notes.md");
  const archiveTaskPackJsonPath = resolve(archiveRoot, "task-pack.json");
  const archiveTaskPackMarkdownPath = resolve(archiveRoot, "task-pack.md");
  const archiveRewriteRequestJsonPath = resolve(
    archiveRoot,
    "rewrite-request.json",
  );
  const archiveRewriteRequestMarkdownPath = resolve(
    archiveRoot,
    "rewrite-request.md",
  );
  const archiveImagePromptPackJsonPath = resolve(
    archiveRoot,
    "image-prompt-pack.json",
  );
  const archiveImagePromptPackMarkdownPath = resolve(
    archiveRoot,
    "image-prompt-pack.md",
  );
  const jsonBody = JSON.stringify(exportJson, null, 2);
  const projectJsonBody = JSON.stringify(projectExportJson, null, 2);
  const markdownBody = payload.markdown || payload.package.prompt || "";
  const voiceMarkdownBody = payload.voiceMarkdown || "";
  const taskPackBody = payload.package.taskPack
    ? `${JSON.stringify(attachProjectMetadata(payload.package.taskPack, project), null, 2)}\n`
    : "";
  const taskPackMarkdownBody = payload.taskPackMarkdown || "";
  const rewriteRequestBody = payload.package.rewriteRequest
    ? `${JSON.stringify(attachProjectMetadata(payload.package.rewriteRequest, project), null, 2)}\n`
    : "";
  const rewriteRequestMarkdownBody = payload.rewriteRequestMarkdown || "";
  const imagePromptPackBody = payload.package.imagePromptPack
    ? `${JSON.stringify(attachProjectMetadata(payload.package.imagePromptPack, project), null, 2)}\n`
    : "";
  const imagePromptPackMarkdownBody = payload.imagePromptPackMarkdown || "";

  await writeTextFileAtomic(legacyJsonPath, jsonBody);
  await writeFile(archiveJsonPath, jsonBody);
  await writeTextFileAtomic(legacyMarkdownPath, markdownBody);
  await writeFile(archiveMarkdownPath, markdownBody);
  await writeTextFileAtomic(liveJsonPath, jsonBody);
  await writeTextFileAtomic(liveMarkdownPath, markdownBody);
  await writeTextFileAtomic(liveVoiceMarkdownPath, voiceMarkdownBody);
  await writeTextFileAtomic(
    resolve(activeProjectRoot, "canvax-live-latest.json"),
    projectJsonBody,
  );
  await writeTextFileAtomic(
    resolve(activeProjectRoot, "canvax-live-latest.md"),
    markdownBody,
  );
  await writeTextFileAtomic(
    resolve(activeProjectRoot, "canvax-voice-latest.md"),
    voiceMarkdownBody,
  );
  await writeFile(archiveVoiceMarkdownPath, voiceMarkdownBody);
  if (taskPackBody) {
    await writeTextFileAtomic(taskPackJsonPath, taskPackBody);
    await writeTextFileAtomic(
      resolve(activeProjectRoot, "canvax-task-pack-latest.json"),
      taskPackBody,
    );
    await writeFile(archiveTaskPackJsonPath, taskPackBody);
  }
  if (taskPackMarkdownBody) {
    await writeTextFileAtomic(taskPackMarkdownPath, taskPackMarkdownBody);
    await writeTextFileAtomic(
      resolve(activeProjectRoot, "canvax-task-pack-latest.md"),
      taskPackMarkdownBody,
    );
    await writeFile(archiveTaskPackMarkdownPath, taskPackMarkdownBody);
  }
  if (rewriteRequestBody) {
    await writeTextFileAtomic(rewriteRequestJsonPath, rewriteRequestBody);
    await writeTextFileAtomic(
      resolve(activeProjectRoot, "canvax-rewrite-request-latest.json"),
      rewriteRequestBody,
    );
    await writeFile(archiveRewriteRequestJsonPath, rewriteRequestBody);
  }
  if (rewriteRequestMarkdownBody) {
    await writeTextFileAtomic(
      rewriteRequestMarkdownPath,
      rewriteRequestMarkdownBody,
    );
    await writeTextFileAtomic(
      resolve(activeProjectRoot, "canvax-rewrite-request-latest.md"),
      rewriteRequestMarkdownBody,
    );
    await writeFile(
      archiveRewriteRequestMarkdownPath,
      rewriteRequestMarkdownBody,
    );
  }
  if (imagePromptPackBody) {
    await writeTextFileAtomic(imagePromptPackJsonPath, imagePromptPackBody);
    await writeTextFileAtomic(
      resolve(activeProjectRoot, "canvax-image-prompt-pack-latest.json"),
      imagePromptPackBody,
    );
    await writeFile(archiveImagePromptPackJsonPath, imagePromptPackBody);
  }
  if (imagePromptPackMarkdownBody) {
    await writeTextFileAtomic(
      imagePromptPackMarkdownPath,
      imagePromptPackMarkdownBody,
    );
    await writeTextFileAtomic(
      resolve(activeProjectRoot, "canvax-image-prompt-pack-latest.md"),
      imagePromptPackMarkdownBody,
    );
    await writeFile(
      archiveImagePromptPackMarkdownPath,
      imagePromptPackMarkdownBody,
    );
  }
  const projectRegistry = await updateProjectRegistryExport(
    project,
    projectExportJson,
    archiveRoot,
  );

  return writeJson(response, 200, {
    archiveRoot,
    jsonPath: liveJsonPath,
    markdownPath: liveMarkdownPath,
    voiceMarkdownPath: liveVoiceMarkdownPath,
    taskPackJsonPath,
    taskPackMarkdownPath,
    rewriteRequestJsonPath,
    rewriteRequestMarkdownPath,
    imagePromptPackJsonPath,
    imagePromptPackMarkdownPath,
    project,
    projectJsonPath: resolve(activeProjectRoot, "canvax-live-latest.json"),
    projectMarkdownPath: resolve(activeProjectRoot, "canvax-live-latest.md"),
    projectRegistryJsonPath,
    projectRegistryMarkdownPath,
    projectRegistry,
    transport: buildTransportDescriptor(),
  });
}

async function handleSaveBuildRequest(request, response) {
  const payload = await readJson(request);
  const source =
    payload.request && typeof payload.request === "object"
      ? payload.request
      : payload;

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return writeJson(response, 400, {
      error: "Build request payload is missing.",
    });
  }

  const activeFrameId = cleanString(source.activeFrameId || source.frame?.id);
  if (!activeFrameId) {
    return writeJson(response, 400, {
      error: "Build request requires an active frame id.",
    });
  }

  const createdAt = cleanString(source.createdAt) || new Date().toISOString();
  const frameTitle =
    cleanString(source.frame?.title) ||
    cleanString(source.outputContract?.frameBinding?.frameTitle) ||
    activeFrameId;
  const project = normalizeProjectExportMetadata(source.project, {
    board: source.board || {},
    frames: source.frame ? [source.frame] : [],
    activeFrameId,
  });
  const requestId = `${buildTimestamp()}-${slugify(frameTitle)}`;
  const requestRoot = resolve(buildRequestsRoot, requestId);
  const requestJsonPath = resolve(requestRoot, "request.json");
  const requestMarkdownPath = resolve(requestRoot, "request.md");
  const nextRequest = {
    ...source,
    schemaVersion: Number(source.schemaVersion) || HANDOFF_SCHEMA_VERSION,
    kind: "canvax-build-real-request",
    createdAt,
    source: cleanString(source.source) || "canvax-workbench",
    requiresOpenAiApiKey: false,
    project,
    activeFrameId,
    outputContract: {
      ...(source.outputContract &&
      typeof source.outputContract === "object" &&
      !Array.isArray(source.outputContract)
        ? source.outputContract
        : {}),
      manifestPath: "artifacts/canvax/codex-output.json",
      previewManifestPath: "exports/canvax-preview-manifest.json",
    },
    archive: {
      requestId,
      jsonPath: toWorkspaceRelativePath(requestJsonPath),
      markdownPath: toWorkspaceRelativePath(requestMarkdownPath),
    },
  };
  const markdown =
    typeof payload.markdown === "string" && payload.markdown.trim()
      ? payload.markdown
      : buildServerBuildRequestMarkdown(nextRequest);
  const jsonBody = `${JSON.stringify(nextRequest, null, 2)}\n`;
  const markdownBody = markdown.endsWith("\n") ? markdown : `${markdown}\n`;

  await mkdir(requestRoot, { recursive: true });
  await mkdir(exportsRoot, { recursive: true });
  await writeFile(requestJsonPath, jsonBody);
  await writeFile(requestMarkdownPath, markdownBody);
  await writeTextFileAtomic(buildRealRequestJsonPath, jsonBody);
  await writeTextFileAtomic(buildRealRequestMarkdownPath, markdownBody);
  const projectBuildRequestJsonPath = await writeProjectLatestFile(
    project,
    "canvax-build-real-latest.json",
    jsonBody,
  );
  const projectBuildRequestMarkdownPath = await writeProjectLatestFile(
    project,
    "canvax-build-real-latest.md",
    markdownBody,
  );

  await appendFile(
    sessionEventsPath,
    `${JSON.stringify({
      type: "build-real-request",
      id: requestId,
      at: createdAt,
      frameId: activeFrameId,
      frameTitle,
      jsonPath: toWorkspaceRelativePath(requestJsonPath),
      markdownPath: toWorkspaceRelativePath(requestMarkdownPath),
      latestJsonPath: toWorkspaceRelativePath(buildRealRequestJsonPath),
      latestMarkdownPath: toWorkspaceRelativePath(
        buildRealRequestMarkdownPath,
      ),
      projectJsonPath: projectBuildRequestJsonPath,
      projectMarkdownPath: projectBuildRequestMarkdownPath,
    })}\n`,
  );

  return writeJson(response, 200, {
    saved: true,
    request: nextRequest,
    requestId,
    jsonPath: toWorkspaceRelativePath(requestJsonPath),
    markdownPath: toWorkspaceRelativePath(requestMarkdownPath),
    latestJsonPath: toWorkspaceRelativePath(buildRealRequestJsonPath),
    latestMarkdownPath: toWorkspaceRelativePath(buildRealRequestMarkdownPath),
    projectJsonPath: projectBuildRequestJsonPath,
    projectMarkdownPath: projectBuildRequestMarkdownPath,
    buildRequestsRoot,
    suggestedPublishCommand:
      nextRequest.outputContract?.publishCommand ||
      `node scripts/write-codex-output.mjs --from-git-status --frame ${activeFrameId}`,
  });
}

async function handleExecuteBuildRequest(request, response) {
  const payload = await readJson(request);
  const requestPath = cleanString(payload?.requestPath);
  const args = ["scripts/execute-build-request.mjs", "--json"];
  if (requestPath) {
    args.push("--request", requestPath);
  }

  try {
    const { stdout } = await runCommand(process.execPath, args, {
      cwd: projectRoot,
    });
    const result = JSON.parse(stdout);
    const previewUrl = result.previewPath
      ? workspaceUrlForPath(result.previewPath, new Date().toISOString())
      : "";

    await appendFile(
      sessionEventsPath,
      `${JSON.stringify({
        type: "build-real-executed",
        at: new Date().toISOString(),
        frameId: cleanString(result.frameId),
        frameTitle: cleanString(result.frameTitle),
        previewPath: cleanString(result.previewPath),
        contextPath: cleanString(result.contextPath),
        manifestPath: cleanString(result.manifestPath),
      })}\n`,
    );

    return writeJson(response, 200, {
      executed: true,
      ...result,
      previewUrl,
    });
  } catch (error) {
    return writeJson(response, 500, {
      executed: false,
      error:
        error instanceof Error
          ? error.message
          : "Build request execution failed.",
    });
  }
}

async function handleExecuteRewriteRequest(request, response) {
  const payload = await readJson(request);
  const requestPath = cleanString(payload?.requestPath);
  const taskPackPath = cleanString(payload?.taskPackPath);
  const frameId = cleanString(payload?.frameId);
  const args = ["scripts/execute-rewrite-request.mjs", "--json"];
  if (requestPath) {
    args.push("--request", requestPath);
  }
  if (taskPackPath) {
    args.push("--task-pack", taskPackPath);
  }
  if (frameId) {
    args.push("--frame", frameId);
  }

  try {
    const { stdout } = await runCommand(process.execPath, args, {
      cwd: projectRoot,
    });
    const result = JSON.parse(stdout);
    const previewUrl = result.previewPath
      ? workspaceUrlForPath(result.previewPath, new Date().toISOString())
      : "";

    await appendFile(
      sessionEventsPath,
      `${JSON.stringify({
        type: "rewrite-request-executed",
        at: new Date().toISOString(),
        frameId: cleanString(result.frameId),
        frameTitle: cleanString(result.frameTitle),
        previewPath: cleanString(result.previewPath),
        contextPath: cleanString(result.contextPath),
        manifestPath: cleanString(result.manifestPath),
        affectedRegionCount: Number(result.affectedRegionCount) || 0,
      })}\n`,
    );

    return writeJson(response, 200, {
      executed: true,
      ...result,
      previewUrl,
    });
  } catch (error) {
    return writeJson(response, 500, {
      executed: false,
      error:
        error instanceof Error
          ? error.message
          : "Rewrite request execution failed.",
    });
  }
}

async function handleRunDesignReview(request, response) {
  const payload = await readJson(request);
  const rawArtifactPath = cleanString(
    payload?.artifactPath || payload?.previewPath || payload?.path,
  );
  const rawSnapshotIndex = cleanString(payload?.snapshotIndex);
  const frameId = cleanString(payload?.frameId);
  const frameTitle = cleanString(payload?.frameTitle);
  const args = ["scripts/review-design-jury.mjs", "--json"];

  let artifactPath = "";
  if (rawArtifactPath) {
    const resolvedArtifactPath = rawArtifactPath.startsWith("/")
      ? resolve(rawArtifactPath)
      : resolve(projectRoot, rawArtifactPath);
    if (!isAllowedWorkspacePath(resolvedArtifactPath)) {
      return writeJson(response, 400, {
        executed: false,
        error: "Design review artifact must be inside the Canvax workspace.",
      });
    }
    artifactPath = toWorkspaceRelativePath(resolvedArtifactPath);
    args.push("--artifact", artifactPath);
  }

  if (rawSnapshotIndex) {
    const resolvedSnapshotIndex = rawSnapshotIndex.startsWith("/")
      ? resolve(rawSnapshotIndex)
      : resolve(projectRoot, rawSnapshotIndex);
    if (!isAllowedWorkspacePath(resolvedSnapshotIndex)) {
      return writeJson(response, 400, {
        executed: false,
        error: "Design review snapshot index must be inside the Canvax workspace.",
      });
    }
    args.push("--snapshot-index", toWorkspaceRelativePath(resolvedSnapshotIndex));
  }

  try {
    const { stdout } = await runCommand(process.execPath, args, {
      cwd: projectRoot,
      allowFailure: true,
    });
    const review = JSON.parse(stdout);
    if (review?.kind !== "canvax-design-jury-review") {
      throw new Error("Design review returned an unexpected payload.");
    }

    await appendFile(
      sessionEventsPath,
      `${JSON.stringify({
        type: "design-review-executed",
        at: new Date().toISOString(),
        frameId,
        frameTitle,
        artifactPath,
        status: cleanString(review.status),
        decision: cleanString(review.decision),
        score: Number(review.score) || 0,
      })}\n`,
    );

    return writeJson(response, 200, {
      executed: true,
      review,
      jsonPath: toWorkspaceRelativePath(designJuryJsonPath),
      markdownPath: toWorkspaceRelativePath(designJuryMarkdownPath),
      markdownUrl: workspaceUrlForPath(
        toWorkspaceRelativePath(designJuryMarkdownPath),
        review.createdAt || new Date().toISOString(),
      ),
    });
  } catch (error) {
    return writeJson(response, 500, {
      executed: false,
      error:
        error instanceof Error
          ? error.message
          : "Design review execution failed.",
    });
  }
}

function buildServerBuildRequestMarkdown(request) {
  const frame = request.frame || {};
  const instructions = Array.isArray(request.codexInstructions)
    ? request.codexInstructions
    : [];
  const doneDefinition = Array.isArray(request.doneDefinition)
    ? request.doneDefinition
    : [];
  const lines = [
    "# Canvax Build Real Request",
    "",
    `- Kind: ${request.kind}`,
    `- Created: ${request.createdAt}`,
    `- Requires OpenAI API key: ${request.requiresOpenAiApiKey ? "yes" : "no"}`,
    `- Active frame: ${frame.title || request.activeFrameId}`,
    `- Manifest: ${request.outputContract?.manifestPath || "artifacts/canvax/codex-output.json"}`,
    "",
    "## Read First",
    `- ${request.handoff?.liveJsonPath || "exports/canvax-live-latest.json"}`,
    `- ${request.handoff?.taskPackJsonPath || "exports/canvax-task-pack-latest.json"}`,
    `- ${request.handoff?.checkpointPath || "exports/canvax-checkpoint-latest.json"}`,
    "",
    "## Instructions",
  ];
  if (instructions.length) {
    instructions.forEach((item) => lines.push(`- ${item}`));
  } else {
    lines.push("- Build real workspace files from the active Canvax frame.");
  }
  lines.push("", "## Done Definition");
  if (doneDefinition.length) {
    doneDefinition.forEach((item) => lines.push(`- ${item}`));
  } else {
    lines.push("- Publish the generated route/component back with write-codex-output.");
  }
  return lines.join("\n");
}

async function handleSaveAssetCandidates(request, response) {
  const payload = await readJson(request);
  const source =
    payload.pack && typeof payload.pack === "object" ? payload.pack : payload;

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return writeJson(response, 400, {
      error: "Asset candidate payload is missing.",
    });
  }

  const candidates = Array.isArray(source.candidates)
    ? source.candidates.map(normalizeServerAssetCandidate).filter(Boolean)
    : [];
  if (!candidates.length) {
    return writeJson(response, 400, {
      error: "Asset candidate payload requires at least one candidate.",
    });
  }

  const createdAt = cleanString(source.createdAt) || new Date().toISOString();
  const project = normalizeProjectExportMetadata(source.project, {
    board: source.board || {},
    frames: [],
  });
  const requestId = `${buildTimestamp()}-${slugify(source.board?.project || "asset-candidates")}`;
  const requestRoot = resolve(assetCandidatesRoot, requestId);
  const requestJsonPath = resolve(requestRoot, "asset-candidates.json");
  const requestMarkdownPath = resolve(requestRoot, "asset-candidates.md");
  const requestImageBriefJsonPath = resolve(
    requestRoot,
    "image-generation-brief.json",
  );
  const requestImageBriefMarkdownPath = resolve(
    requestRoot,
    "image-generation-brief.md",
  );
  const requestImageHostTaskJsonPath = resolve(
    requestRoot,
    "image-host-task.json",
  );
  const requestImageHostTaskMarkdownPath = resolve(
    requestRoot,
    "image-host-task.md",
  );
  const nextPack = {
    ...source,
    schemaVersion: Number(source.schemaVersion) || HANDOFF_SCHEMA_VERSION,
    kind: "canvax-asset-candidates",
    createdAt,
    requiresOpenAiApiKey: false,
    project,
    candidates,
    reviewSummary: buildServerAssetCandidateReviewSummary(candidates),
    archive: {
      requestId,
      jsonPath: toWorkspaceRelativePath(requestJsonPath),
      markdownPath: toWorkspaceRelativePath(requestMarkdownPath),
    },
  };
  const markdown =
    typeof payload.markdown === "string" && payload.markdown.trim()
      ? payload.markdown
      : buildServerAssetCandidatesMarkdown(nextPack);
  const imageGenerationBrief = buildServerImageGenerationBrief(nextPack, {
    requestId,
    assetCandidatesJsonPath: toWorkspaceRelativePath(requestJsonPath),
    assetCandidatesMarkdownPath: toWorkspaceRelativePath(requestMarkdownPath),
    latestAssetCandidatesJsonPath: toWorkspaceRelativePath(
      assetCandidatesJsonPath,
    ),
    latestAssetCandidatesMarkdownPath: toWorkspaceRelativePath(
      assetCandidatesMarkdownPath,
    ),
  });
  const imageHostTask = buildServerImageHostTask(
    nextPack,
    imageGenerationBrief,
    {
      requestId,
      imageGenerationBriefJsonPath: toWorkspaceRelativePath(
        requestImageBriefJsonPath,
      ),
      imageGenerationBriefMarkdownPath: toWorkspaceRelativePath(
        requestImageBriefMarkdownPath,
      ),
      latestImageGenerationBriefJsonPath: toWorkspaceRelativePath(
        imageGenerationBriefJsonPath,
      ),
      latestImageGenerationBriefMarkdownPath: toWorkspaceRelativePath(
        imageGenerationBriefMarkdownPath,
      ),
      assetCandidatesJsonPath: toWorkspaceRelativePath(requestJsonPath),
      assetCandidatesMarkdownPath: toWorkspaceRelativePath(requestMarkdownPath),
      latestAssetCandidatesJsonPath: toWorkspaceRelativePath(
        assetCandidatesJsonPath,
      ),
      latestAssetCandidatesMarkdownPath: toWorkspaceRelativePath(
        assetCandidatesMarkdownPath,
      ),
      imageHostTaskJsonPath: toWorkspaceRelativePath(
        requestImageHostTaskJsonPath,
      ),
      imageHostTaskMarkdownPath: toWorkspaceRelativePath(
        requestImageHostTaskMarkdownPath,
      ),
      latestImageHostTaskJsonPath: toWorkspaceRelativePath(
        imageHostTaskJsonPath,
      ),
      latestImageHostTaskMarkdownPath: toWorkspaceRelativePath(
        imageHostTaskMarkdownPath,
      ),
    },
  );
  const jsonBody = `${JSON.stringify(nextPack, null, 2)}\n`;
  const markdownBody = markdown.endsWith("\n") ? markdown : `${markdown}\n`;
  const imageBriefJsonBody = `${JSON.stringify(
    imageGenerationBrief,
    null,
    2,
  )}\n`;
  const imageBriefMarkdownBody = `${buildServerImageGenerationBriefMarkdown(
    imageGenerationBrief,
  )}\n`;
  const imageHostTaskJsonBody = `${JSON.stringify(imageHostTask, null, 2)}\n`;
  const imageHostTaskMarkdownBody = `${buildServerImageHostTaskMarkdown(
    imageHostTask,
  )}\n`;

  await mkdir(requestRoot, { recursive: true });
  await mkdir(exportsRoot, { recursive: true });
  await writeFile(requestJsonPath, jsonBody);
  await writeFile(requestMarkdownPath, markdownBody);
  await writeFile(requestImageBriefJsonPath, imageBriefJsonBody);
  await writeFile(requestImageBriefMarkdownPath, imageBriefMarkdownBody);
  await writeFile(requestImageHostTaskJsonPath, imageHostTaskJsonBody);
  await writeFile(
    requestImageHostTaskMarkdownPath,
    imageHostTaskMarkdownBody,
  );
  await writeTextFileAtomic(assetCandidatesJsonPath, jsonBody);
  await writeTextFileAtomic(assetCandidatesMarkdownPath, markdownBody);
  await writeTextFileAtomic(imageGenerationBriefJsonPath, imageBriefJsonBody);
  await writeTextFileAtomic(
    imageGenerationBriefMarkdownPath,
    imageBriefMarkdownBody,
  );
  await writeTextFileAtomic(imageHostTaskJsonPath, imageHostTaskJsonBody);
  await writeTextFileAtomic(
    imageHostTaskMarkdownPath,
    imageHostTaskMarkdownBody,
  );
  const projectAssetCandidatesJsonPath = await writeProjectLatestFile(
    project,
    "canvax-asset-candidates-latest.json",
    jsonBody,
  );
  const projectAssetCandidatesMarkdownPath = await writeProjectLatestFile(
    project,
    "canvax-asset-candidates-latest.md",
    markdownBody,
  );
  const projectImageGenerationBriefJsonPath = await writeProjectLatestFile(
    project,
    "canvax-image-generation-brief-latest.json",
    imageBriefJsonBody,
  );
  const projectImageGenerationBriefMarkdownPath = await writeProjectLatestFile(
    project,
    "canvax-image-generation-brief-latest.md",
    imageBriefMarkdownBody,
  );
  const projectImageHostTaskJsonPath = await writeProjectLatestFile(
    project,
    "canvax-image-host-task-latest.json",
    imageHostTaskJsonBody,
  );
  const projectImageHostTaskMarkdownPath = await writeProjectLatestFile(
    project,
    "canvax-image-host-task-latest.md",
    imageHostTaskMarkdownBody,
  );

  await appendFile(
    sessionEventsPath,
    `${JSON.stringify({
      type: "asset-candidates",
      id: requestId,
      at: createdAt,
      candidateCount: candidates.length,
      jsonPath: toWorkspaceRelativePath(requestJsonPath),
      markdownPath: toWorkspaceRelativePath(requestMarkdownPath),
      imageGenerationBriefJsonPath: toWorkspaceRelativePath(
        requestImageBriefJsonPath,
      ),
      imageGenerationBriefMarkdownPath: toWorkspaceRelativePath(
        requestImageBriefMarkdownPath,
      ),
      imageHostTaskJsonPath: toWorkspaceRelativePath(
        requestImageHostTaskJsonPath,
      ),
      imageHostTaskMarkdownPath: toWorkspaceRelativePath(
        requestImageHostTaskMarkdownPath,
      ),
      latestJsonPath: toWorkspaceRelativePath(assetCandidatesJsonPath),
      latestMarkdownPath: toWorkspaceRelativePath(assetCandidatesMarkdownPath),
      latestImageGenerationBriefJsonPath: toWorkspaceRelativePath(
        imageGenerationBriefJsonPath,
      ),
      latestImageGenerationBriefMarkdownPath: toWorkspaceRelativePath(
        imageGenerationBriefMarkdownPath,
      ),
      latestImageHostTaskJsonPath: toWorkspaceRelativePath(
        imageHostTaskJsonPath,
      ),
      latestImageHostTaskMarkdownPath: toWorkspaceRelativePath(
        imageHostTaskMarkdownPath,
      ),
      projectJsonPath: projectAssetCandidatesJsonPath,
      projectMarkdownPath: projectAssetCandidatesMarkdownPath,
      projectImageGenerationBriefJsonPath,
      projectImageGenerationBriefMarkdownPath,
      projectImageHostTaskJsonPath,
      projectImageHostTaskMarkdownPath,
    })}\n`,
  );

  return writeJson(response, 200, {
    saved: true,
    assetCandidatePack: nextPack,
    requestId,
    candidateCount: candidates.length,
    jsonPath: toWorkspaceRelativePath(requestJsonPath),
    markdownPath: toWorkspaceRelativePath(requestMarkdownPath),
    imageGenerationBrief,
    imageHostTask,
    imageGenerationBriefJsonPath: toWorkspaceRelativePath(
      requestImageBriefJsonPath,
    ),
    imageGenerationBriefMarkdownPath: toWorkspaceRelativePath(
      requestImageBriefMarkdownPath,
    ),
    imageHostTaskJsonPath: toWorkspaceRelativePath(
      requestImageHostTaskJsonPath,
    ),
    imageHostTaskMarkdownPath: toWorkspaceRelativePath(
      requestImageHostTaskMarkdownPath,
    ),
    latestJsonPath: toWorkspaceRelativePath(assetCandidatesJsonPath),
    latestMarkdownPath: toWorkspaceRelativePath(assetCandidatesMarkdownPath),
    latestImageGenerationBriefJsonPath: toWorkspaceRelativePath(
      imageGenerationBriefJsonPath,
    ),
    latestImageGenerationBriefMarkdownPath: toWorkspaceRelativePath(
      imageGenerationBriefMarkdownPath,
    ),
    latestImageHostTaskJsonPath: toWorkspaceRelativePath(
      imageHostTaskJsonPath,
    ),
    latestImageHostTaskMarkdownPath: toWorkspaceRelativePath(
      imageHostTaskMarkdownPath,
    ),
    projectJsonPath: projectAssetCandidatesJsonPath,
    projectMarkdownPath: projectAssetCandidatesMarkdownPath,
    projectImageGenerationBriefJsonPath,
    projectImageGenerationBriefMarkdownPath,
    projectImageHostTaskJsonPath,
    projectImageHostTaskMarkdownPath,
    assetCandidatesRoot,
  });
}

function normalizeServerAssetCandidate(candidate) {
  if (!candidate?.id) {
    return null;
  }
  const placementMap =
    candidate.placementMap || buildServerAssetPlacementMap(candidate);
  const outputSlots = normalizeServerAssetOutputSlots(
    candidate.outputSlots,
    candidate,
    placementMap,
  );
  return {
    ...candidate,
    status: candidate.status || "prompt-ready",
    placement:
      candidate.placement ||
      placementMap.placement ||
      "whole frame",
    placementMap,
    outputSlots,
  };
}

function buildServerAssetPlacementMap(candidate) {
  const viewport = {
    id: candidate.viewport?.id || "desktop",
    label: candidate.viewport?.label || "Desktop",
    width: Number(candidate.viewport?.width) || 1440,
    height: Number(candidate.viewport?.height) || 1024,
  };
  viewport.aspectRatio = `${viewport.width}:${viewport.height}`;
  const normalizedBounds = normalizeServerAssetBounds(candidate.bounds);
  const pixelBounds = {
    left: Math.round(normalizedBounds.x * viewport.width),
    top: Math.round(normalizedBounds.y * viewport.height),
    width: Math.round(normalizedBounds.w * viewport.width),
    height: Math.round(normalizedBounds.h * viewport.height),
  };
  pixelBounds.right = pixelBounds.left + pixelBounds.width;
  pixelBounds.bottom = pixelBounds.top + pixelBounds.height;
  const cssPlacement = {
    position: "absolute",
    left: `${roundServerNumber(normalizedBounds.x * 100)}%`,
    top: `${roundServerNumber(normalizedBounds.y * 100)}%`,
    width: `${roundServerNumber(normalizedBounds.w * 100)}%`,
    height: `${roundServerNumber(normalizedBounds.h * 100)}%`,
    aspectRatio:
      candidate.aspectRatio ||
      `${Math.max(1, pixelBounds.width)}/${Math.max(1, pixelBounds.height)}`,
  };
  const safeId = String(candidate.id).replace(/[^a-zA-Z0-9_-]/g, "-");
  return {
    kind: "canvax-asset-placement",
    slotId: `${candidate.id}-slot-1`,
    sourceFrameId: candidate.sourceFrameId || "",
    sourceFrameTitle: candidate.sourceFrameTitle || "",
    sourceElementId: candidate.sourceElementId || "",
    surface: viewport.id,
    viewport,
    placement: candidate.placement || "whole frame",
    normalizedBounds,
    pixelBounds,
    cssPlacement,
    targetSelector: `[data-asset-candidate-id="${safeId}"]`,
    htmlScaffold: `<figure class="canvax-asset-slot" data-asset-candidate-id="${safeId}"></figure>`,
  };
}

function normalizeServerAssetBounds(bounds) {
  if (
    bounds &&
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    Number.isFinite(bounds.w) &&
    Number.isFinite(bounds.h) &&
    bounds.w > 0 &&
    bounds.h > 0
  ) {
    const x = Math.min(Math.max(bounds.x, 0), 0.98);
    const y = Math.min(Math.max(bounds.y, 0), 0.98);
    const w = Math.min(Math.max(bounds.w, 0.02), 1 - x);
    const h = Math.min(Math.max(bounds.h, 0.02), 1 - y);
    return {
      x: roundServerNumber(x),
      y: roundServerNumber(y),
      w: roundServerNumber(w),
      h: roundServerNumber(h),
      centerX: roundServerNumber(x + w / 2),
      centerY: roundServerNumber(y + h / 2),
    };
  }
  return { x: 0, y: 0, w: 1, h: 1, centerX: 0.5, centerY: 0.5 };
}

function normalizeServerAssetOutputSlots(slots, candidate, placementMap) {
  const baseSlots = Array.isArray(slots) && slots.length ? slots : [{}];
  return baseSlots.map((slot, index) => {
    const slotId = slot.slotId || slot.id || `${candidate.id}-slot-${index + 1}`;
    const accepted = Boolean(slot.accepted);
    const attached = Boolean(
      slot.attached || slot.imagePath || slot.imageElementId,
    );
    return {
      id: slot.id || slotId,
      slotId,
      label:
        slot.label ||
        (candidate.type === "frame-composite"
          ? "Full-frame generated image"
          : "Generated region image"),
      role:
        slot.role ||
        (candidate.type === "frame-composite"
          ? "full-frame-output"
          : "region-output"),
      status:
        slot.status ||
        (accepted ? "accepted" : attached ? "attached" : "empty"),
      assetCandidateId: candidate.id,
      frameId: slot.frameId || candidate.sourceFrameId || "",
      frameTitle: slot.frameTitle || candidate.sourceFrameTitle || "",
      placement: slot.placement || candidate.placement || placementMap.placement,
      bounds: slot.bounds || placementMap.normalizedBounds,
      pixelBounds: slot.pixelBounds || placementMap.pixelBounds,
      cssPlacement: slot.cssPlacement || placementMap.cssPlacement,
      targetSelector: slot.targetSelector || placementMap.targetSelector,
      imagePath: slot.imagePath || "",
      imageElementId: slot.imageElementId || "",
      accepted,
      attached,
      attachedAt: slot.attachedAt || "",
      acceptedAt: slot.acceptedAt || "",
      notes: slot.notes || "Empty local image-generation output slot.",
    };
  });
}

function buildServerAssetCandidateReviewSummary(candidates = []) {
  const slots = candidates.flatMap((candidate) => candidate.outputSlots || []);
  const groups = buildServerAssetCandidateReviewGroups(candidates);
  const pendingCandidateIds = candidates
    .filter((candidate) => serverAssetCandidateEffectiveStatus(candidate) === "prompt-ready")
    .map((candidate) => candidate.id);
  const placedCandidateIds = candidates
    .filter((candidate) => serverAssetCandidateEffectiveStatus(candidate) === "placed")
    .map((candidate) => candidate.id);
  const attachedCandidateIds = candidates
    .filter((candidate) => serverAssetCandidateEffectiveStatus(candidate) === "attached")
    .map((candidate) => candidate.id);
  const acceptedCandidates = candidates
    .map(summarizeServerAcceptedAssetCandidate)
    .filter(Boolean);
  return {
    kind: "canvax-asset-candidate-review",
    total: candidates.length,
    placementReady: candidates.filter((candidate) => candidate.placementMap)
      .length,
    slotCount: slots.length,
    emptySlots: slots.filter((slot) => !slot.accepted && !slot.attached).length,
    promptReady: pendingCandidateIds.length,
    placed: placedCandidateIds.length,
    attached: attachedCandidateIds.length,
    accepted: acceptedCandidates.length,
    statusCounts: {
      promptReady: pendingCandidateIds.length,
      placed: placedCandidateIds.length,
      attached: attachedCandidateIds.length,
      accepted: acceptedCandidates.length,
      emptySlots: slots.filter((slot) => !slot.accepted && !slot.attached).length,
    },
    pendingCandidateIds,
    placedCandidateIds,
    attachedCandidateIds,
    acceptedCandidateIds: acceptedCandidates.map((candidate) => candidate.id),
    acceptedCandidates,
    groups,
    hostHandoff: {
      requiresOpenAiApiKey: false,
      lane: "host-image-generation",
      copyReadyFiles: [
        "exports/canvax-image-host-task-latest.md",
        "exports/canvax-image-host-task-latest.json",
        "exports/canvax-image-generation-brief-latest.md",
        "exports/canvax-image-generation-brief-latest.json",
        "exports/canvax-asset-candidates-latest.json",
      ],
      workflow: [
        "Open the image host task or copy a candidate block from the image generation brief into the current Codex/ChatGPT image host.",
        "Generate or edit the image in that host without Canvax calling an API.",
        "Attach the returned image back to the matching candidate card or workspace path.",
        "Accept the chosen candidate so Codex can read the selected visual and placement contract.",
      ],
    },
    nextActions: buildServerAssetCandidateReviewNextActions({
      total: candidates.length,
      pending: pendingCandidateIds.length,
      placed: placedCandidateIds.length,
      attached: attachedCandidateIds.length,
      accepted: acceptedCandidates.length,
    }),
  };
}

function serverAssetCandidateEffectiveStatus(candidate) {
  const slots = Array.isArray(candidate?.outputSlots)
    ? candidate.outputSlots
    : [];
  if (slots.some((slot) => slot?.accepted)) {
    return "accepted";
  }
  if (slots.some((slot) => slot?.attached || slot?.imagePath)) {
    return "attached";
  }
  if (slots.some((slot) => slot?.imageElementId)) {
    return "placed";
  }
  return candidate?.status || "prompt-ready";
}

function buildServerAssetCandidateReviewGroups(candidates = []) {
  const groupsByFrame = new Map();
  candidates.forEach((candidate) => {
    const frameId = candidate.sourceFrameId || "board";
    if (!groupsByFrame.has(frameId)) {
      groupsByFrame.set(frameId, {
        frameId,
        frameTitle: candidate.sourceFrameTitle || "Board",
        total: 0,
        promptReady: 0,
        placed: 0,
        attached: 0,
        accepted: 0,
        candidateIds: [],
        acceptedCandidateIds: [],
        candidates: [],
      });
    }
    const group = groupsByFrame.get(frameId);
    const status = serverAssetCandidateEffectiveStatus(candidate);
    const bucket = serverAssetCandidateReviewBucket(status);
    group.total += 1;
    group[bucket] = Number(group[bucket] || 0) + 1;
    group.candidateIds.push(candidate.id);
    if (status === "accepted") {
      group.acceptedCandidateIds.push(candidate.id);
    }
    group.candidates.push(summarizeServerAssetCandidateReviewItem(candidate, status));
  });
  return [...groupsByFrame.values()];
}

function summarizeServerAssetCandidateReviewItem(candidate, status) {
  const placement = candidate.placementMap || {};
  const slot = Array.isArray(candidate.outputSlots)
    ? candidate.outputSlots[0] || null
    : null;
  return {
    id: candidate.id,
    title: candidate.title || "Asset candidate",
    type: candidate.type || "region",
    status,
    sourceFrameId: candidate.sourceFrameId || "",
    sourceFrameTitle: candidate.sourceFrameTitle || "",
    sourceElementId: candidate.sourceElementId || "",
    placement: candidate.placement || placement.placement || "whole frame",
    prompt: candidate.prompt || "",
    slotId: slot?.slotId || placement.slotId || "",
    targetSelector: slot?.targetSelector || placement.targetSelector || "",
    pixelBounds: slot?.pixelBounds || placement.pixelBounds || null,
    cssPlacement: slot?.cssPlacement || placement.cssPlacement || null,
    imageElementId: slot?.imageElementId || "",
    imagePath: slot?.imagePath || "",
    accepted: Boolean(slot?.accepted),
  };
}

function summarizeServerAcceptedAssetCandidate(candidate) {
  const slots = Array.isArray(candidate?.outputSlots)
    ? candidate.outputSlots
    : [];
  const acceptedSlot = slots.find((slot) => slot?.accepted);
  if (!acceptedSlot && candidate?.status !== "accepted") {
    return null;
  }
  const fallbackSlot = acceptedSlot || slots[0] || {};
  return {
    id: candidate.id,
    title: candidate.title || "Accepted asset candidate",
    sourceFrameId: candidate.sourceFrameId || "",
    sourceFrameTitle: candidate.sourceFrameTitle || "",
    placement: candidate.placement || "",
    bounds: candidate.bounds || null,
    placementMap: candidate.placementMap || null,
    slotId: fallbackSlot.slotId || fallbackSlot.id || "",
    pixelBounds: fallbackSlot.pixelBounds || candidate.placementMap?.pixelBounds || null,
    imageElementId: fallbackSlot.imageElementId || "",
    frameId: fallbackSlot.frameId || candidate.sourceFrameId || "",
    imagePath: fallbackSlot.imagePath || "",
    acceptedAt: fallbackSlot.acceptedAt || "",
    prompt: candidate.prompt || "",
  };
}

function serverAssetCandidateReviewBucket(status) {
  switch (status) {
    case "accepted":
      return "accepted";
    case "attached":
      return "attached";
    case "placed":
      return "placed";
    default:
      return "promptReady";
  }
}

function buildServerAssetCandidateReviewNextActions(counts) {
  if (!counts.total) {
    return ["Create an Image pack from a frame with image, avatar, visual, or illustration regions."];
  }
  const actions = [];
  if (counts.pending) {
    actions.push("Generate pending candidates in the host image lane using the copy-ready brief.");
  }
  if (counts.placed || counts.attached) {
    actions.push("Review attached images on the frame, then accept the strongest candidate.");
  }
  if (counts.accepted) {
    actions.push("Use accepted candidates in Materialize, Build with Codex, or image prompt continuation.");
  }
  return actions;
}

function roundServerNumber(value) {
  return Number(Number(value || 0).toFixed(4));
}

function buildServerAssetCandidatesMarkdown(pack) {
  const reviewSummary =
    pack.reviewSummary ||
    buildServerAssetCandidateReviewSummary(pack.candidates || []);
  const lines = [
    "# Canvax Asset Candidates",
    "",
    `- Kind: ${pack.kind}`,
    `- Created: ${pack.createdAt}`,
    `- Requires OpenAI API key: ${pack.requiresOpenAiApiKey ? "yes" : "no"}`,
    `- Candidates: ${Array.isArray(pack.candidates) ? pack.candidates.length : 0}`,
    "",
    "## Review Summary",
    "",
    `- Kind: ${reviewSummary.kind || "canvax-asset-candidate-review"}`,
    `- Placement-ready: ${reviewSummary.placementReady || 0}`,
    `- Output slots: ${reviewSummary.slotCount || 0}`,
    `- Empty slots: ${reviewSummary.emptySlots || 0}`,
    `- Prompt-ready: ${reviewSummary.promptReady || 0}`,
    `- Attached: ${reviewSummary.attached || 0}`,
    `- Accepted: ${reviewSummary.accepted || 0}`,
    "",
    "### Review Groups",
    "",
    ...(reviewSummary.groups?.length
      ? reviewSummary.groups.map(
          (group) =>
            `- ${group.frameTitle || group.frameId}: ${group.total || 0} candidates, ${group.promptReady || 0} pending, ${group.attached || 0} attached, ${group.accepted || 0} accepted`,
        )
      : ["- No grouped candidates yet."]),
    "",
    "### Host Handoff",
    "",
    ...(reviewSummary.hostHandoff?.workflow?.length
      ? reviewSummary.hostHandoff.workflow.map((step) => `- ${step}`)
      : ["- Copy candidate prompts into the current host image-generation lane and attach results back to Canvax."]),
    "",
    "## Candidates",
  ];
  (pack.candidates || []).forEach((candidate, index) => {
    lines.push(
      "",
      `### ${index + 1}. ${candidate.title || candidate.id || "Candidate"}`,
      "",
      `- Type: ${candidate.type || "asset"}`,
      `- Source frame: ${candidate.sourceFrameTitle || candidate.sourceFrameId || "unknown"}`,
      `- Status: ${candidate.status || "prompt-ready"}`,
      `- Bounds: ${candidate.bounds ? JSON.stringify(candidate.bounds) : "whole frame"}`,
    );
    if (candidate.placementMap) {
      const placement = candidate.placementMap;
      const pixel = placement.pixelBounds || {};
      const css = placement.cssPlacement || {};
      lines.push(
        `- Placement slot: ${placement.slotId || candidate.id}`,
        `- Pixel slot: ${pixel.left || 0}, ${pixel.top || 0}, ${pixel.width || 0}x${pixel.height || 0}`,
        `- CSS slot: ${css.left || "0%"}, ${css.top || "0%"}, ${css.width || "100%"}, ${css.height || "100%"}`,
        `- Selector: \`${placement.targetSelector || ""}\``,
      );
    }
    if (Array.isArray(candidate.outputSlots) && candidate.outputSlots.length) {
      lines.push(
        "- Output slots:",
        ...candidate.outputSlots.map(
          (slot, slotIndex) =>
            `  - ${slotIndex + 1}. ${slot.slotId || slot.id}: ${slot.status || "empty"}`,
        ),
      );
    }
    lines.push("", candidate.prompt || "No prompt provided.");
  });
  return lines.join("\n");
}

function buildServerImageGenerationBrief(pack, paths = {}) {
  const candidates = Array.isArray(pack?.candidates) ? pack.candidates : [];
  const styleLock = pack?.styleLock || null;
  return {
    schemaVersion: Number(pack?.schemaVersion) || HANDOFF_SCHEMA_VERSION,
    kind: "canvax-image-generation-brief",
    createdAt: new Date().toISOString(),
    requiresOpenAiApiKey: false,
    project: pack?.project || null,
    intendedHost:
      "ChatGPT/Codex image generation host lane, if available in the current chat.",
    sourcePromptPackPath:
      pack?.sourcePromptPackPath ||
      "exports/canvax-image-prompt-pack-latest.json",
    sourceAssetCandidatesPath: paths.assetCandidatesJsonPath || "",
    sourceAssetCandidatesMarkdownPath: paths.assetCandidatesMarkdownPath || "",
    latestAssetCandidatesPath: paths.latestAssetCandidatesJsonPath || "",
    latestAssetCandidatesMarkdownPath:
      paths.latestAssetCandidatesMarkdownPath || "",
    requestId: paths.requestId || pack?.archive?.requestId || "",
    board: pack?.board || {},
    designContext: pack?.designContext || null,
    styleLock,
    reviewSummary:
      pack?.reviewSummary || buildServerAssetCandidateReviewSummary(candidates),
    usage:
      "Copy one candidate block into the host image tool. Use the prompt, style lock, placement contract, and output slot to generate and reattach an image without Canvax calling a paid API.",
    copyBlocks: candidates.map((candidate, index) =>
      buildServerImageGenerationCopyBlock(candidate, styleLock, index),
    ),
  };
}

function buildServerImageHostTask(pack, imageGenerationBrief, paths = {}) {
  const copyBlocks = Array.isArray(imageGenerationBrief?.copyBlocks)
    ? imageGenerationBrief.copyBlocks
    : [];
  const reviewSummary =
    pack?.reviewSummary ||
    imageGenerationBrief?.reviewSummary ||
    buildServerAssetCandidateReviewSummary(pack?.candidates || []);
  const acceptedCandidateIds = Array.isArray(reviewSummary.acceptedCandidateIds)
    ? reviewSummary.acceptedCandidateIds
    : [];
  const sourceFiles = {
    assetCandidates: paths.assetCandidatesJsonPath || "",
    assetCandidatesMarkdown: paths.assetCandidatesMarkdownPath || "",
    latestAssetCandidates: paths.latestAssetCandidatesJsonPath || "",
    latestAssetCandidatesMarkdown:
      paths.latestAssetCandidatesMarkdownPath || "",
    imageGenerationBrief: paths.imageGenerationBriefJsonPath || "",
    imageGenerationBriefMarkdown:
      paths.imageGenerationBriefMarkdownPath || "",
    latestImageGenerationBrief:
      paths.latestImageGenerationBriefJsonPath || "",
    latestImageGenerationBriefMarkdown:
      paths.latestImageGenerationBriefMarkdownPath || "",
    imagePromptPack:
      imageGenerationBrief?.sourcePromptPackPath ||
      "exports/canvax-image-prompt-pack-latest.json",
  };
  return {
    schemaVersion:
      Number(pack?.schemaVersion) ||
      Number(imageGenerationBrief?.schemaVersion) ||
      HANDOFF_SCHEMA_VERSION,
    kind: "canvax-image-host-task",
    createdAt: new Date().toISOString(),
    requiresOpenAiApiKey: false,
    project: pack?.project || imageGenerationBrief?.project || null,
    intendedHost:
      "Use the image generation host already available in the current Codex or ChatGPT session.",
    purpose:
      "Generate or edit images outside Canvax, then attach the returned files back to the matching Canvax asset candidate slots.",
    requestId:
      paths.requestId || imageGenerationBrief?.requestId || pack?.archive?.requestId || "",
    sourceFiles,
    archive: {
      jsonPath: paths.imageHostTaskJsonPath || "",
      markdownPath: paths.imageHostTaskMarkdownPath || "",
      latestJsonPath: paths.latestImageHostTaskJsonPath || "",
      latestMarkdownPath: paths.latestImageHostTaskMarkdownPath || "",
    },
    board: imageGenerationBrief?.board || pack?.board || {},
    designContext:
      imageGenerationBrief?.designContext || pack?.designContext || null,
    styleLock: imageGenerationBrief?.styleLock || pack?.styleLock || null,
    reviewSummary,
    candidateCount: copyBlocks.length,
    acceptedCandidateIds,
    workflow: [
      "Choose one task below and copy its hostPrompt into the image-generation host available in the current chat.",
      "Use the placement contract as the composition box: keep the generated image inside the pixel/CSS slot unless the sketch says otherwise.",
      "Do not call a paid API from Canvax; this task is a handoff file for Codex, ChatGPT, or another already-open host.",
      "Return the generated file as a workspace path, pasted canvas image, or attached reference.",
      "Attach the result to the matching output slot, then accept the candidate when it fits the design.",
    ],
    noApiBoundary: {
      canCanvaxCallImageApi: false,
      reason:
        "Canvax stays a local visual handoff surface. Image generation belongs to the host chat/app session unless a user explicitly adds a separate integration later.",
    },
    returnContract: {
      acceptedInputs: [
        "workspace image file path",
        "pasted image on the Canvax canvas",
        "reference image attached to the frame",
      ],
      requiredBindingFields: [
        "candidateId",
        "outputSlot.slotId",
        "sourceFrameId",
        "imagePath or pasted image element id",
      ],
    },
    tasks: copyBlocks.map((block, index) =>
      buildServerImageHostTaskItem(block, index),
    ),
  };
}

function buildServerImageHostTaskItem(block, index) {
  const outputSlot = block.outputSlot || {};
  return {
    taskId: `${block.id || `image-candidate-${index + 1}`}-host-task`,
    candidateId: block.id || `image-candidate-${index + 1}`,
    title: block.title || `Image candidate ${index + 1}`,
    sourceFrameId: block.sourceFrameId || "",
    sourceFrameTitle: block.sourceFrameTitle || "",
    sourceElementId: block.sourceElementId || "",
    status: block.status || "prompt-ready",
    hostPrompt: block.hostPrompt || block.prompt || "",
    negativePrompt: block.negativePrompt || "",
    placementContract: block.placementContract || null,
    outputSlot,
    returnInstructions: [
      "Save, attach, or paste the generated image back into Canvax.",
      `Bind the result to candidate ${block.id || `image-candidate-${index + 1}`}.`,
      outputSlot?.slotId
        ? `Use output slot ${outputSlot.slotId}.`
        : "Create an output slot if one is missing.",
      "Preserve the placement contract unless the user sketches a correction.",
    ],
    acceptanceCriteria: [
      "The image matches the prompt and style lock.",
      "The composition fits the target bounds and does not drift into unrelated regions.",
      "Readable text, logos, or symbols are only present if explicitly requested.",
      "The candidate can be accepted and reused by Materialize or Build with Codex.",
    ],
  };
}

function buildServerImageGenerationCopyBlock(candidate, styleLock, index) {
  const placement =
    candidate.placementMap || buildServerAssetPlacementMap(candidate);
  const css = placement.cssPlacement || {};
  const pixel = placement.pixelBounds || {};
  const slot = Array.isArray(candidate.outputSlots)
    ? candidate.outputSlots[0]
    : null;
  const promptLines = [
    `Generate image candidate ${index + 1}: ${candidate.title || candidate.id}.`,
    candidate.prompt || "Use the Canvax sketch and notes as the image brief.",
    styleLock?.summary ? `Style lock: ${styleLock.summary}` : "",
    `Placement: ${placement.placement || candidate.placement || "whole frame"}.`,
    `Pixel slot: ${pixel.left || 0}, ${pixel.top || 0}, ${pixel.width || 0}x${pixel.height || 0}.`,
    `CSS slot: left ${css.left || "0%"}, top ${css.top || "0%"}, width ${css.width || "100%"}, height ${css.height || "100%"}.`,
    `Target selector: ${placement.targetSelector || ""}.`,
    candidate.negativePrompt
      ? `Avoid: ${candidate.negativePrompt}`
      : "Avoid unrelated logos, unreadable text, generic AI-purple styling, and composition drift.",
  ].filter(Boolean);
  return {
    id: candidate.id || `image-candidate-${index + 1}`,
    title: candidate.title || `Image candidate ${index + 1}`,
    sourceFrameId: candidate.sourceFrameId || "",
    sourceFrameTitle: candidate.sourceFrameTitle || "",
    sourceElementId: candidate.sourceElementId || "",
    status: candidate.status || "prompt-ready",
    prompt: candidate.prompt || "",
    hostPrompt: promptLines.join("\n"),
    negativePrompt: candidate.negativePrompt || "",
    placementContract: {
      placement: placement.placement || candidate.placement || "whole frame",
      normalizedBounds: placement.normalizedBounds || null,
      pixelBounds: placement.pixelBounds || null,
      cssPlacement: placement.cssPlacement || null,
      targetSelector: placement.targetSelector || "",
      htmlScaffold: placement.htmlScaffold || "",
    },
    outputSlot: slot
      ? {
          slotId: slot.slotId || slot.id || "",
          status: slot.status || "empty",
          imagePath: slot.imagePath || "",
          imageElementId: slot.imageElementId || "",
          accepted: Boolean(slot.accepted),
          attached: Boolean(slot.attached),
        }
      : null,
  };
}

function buildServerImageGenerationBriefMarkdown(brief) {
  const lines = [
    "# Canvax Image Generation Brief",
    "",
    `- Kind: ${brief.kind}`,
    `- Created: ${brief.createdAt}`,
    `- Requires OpenAI API key: ${brief.requiresOpenAiApiKey ? "yes" : "no"}`,
    `- Intended host: ${brief.intendedHost}`,
    `- Source prompt pack: ${brief.sourcePromptPackPath}`,
    `- Source asset candidates: ${brief.sourceAssetCandidatesPath}`,
    "",
    "## How To Use",
    "",
    brief.usage,
  ];
  if (brief.styleLock?.summary) {
    lines.push("", "## Style Lock", "", brief.styleLock.summary);
  }
  const continuityRules = Array.isArray(brief.styleLock?.continuityRules)
    ? brief.styleLock.continuityRules
    : [];
  if (continuityRules.length) {
    lines.push("", "### Continuity Rules", "");
    continuityRules.forEach((rule) => lines.push(`- ${rule}`));
  }
  if (brief.reviewSummary?.kind) {
    lines.push(
      "",
      "## Review Queue",
      "",
      `- Total candidates: ${brief.reviewSummary.total || 0}`,
      `- Pending: ${brief.reviewSummary.promptReady || 0}`,
      `- Attached: ${brief.reviewSummary.attached || 0}`,
      `- Accepted: ${brief.reviewSummary.accepted || 0}`,
    );
    if (brief.reviewSummary.groups?.length) {
      brief.reviewSummary.groups.forEach((group) => {
        lines.push(
          `- ${group.frameTitle || group.frameId}: ${group.total || 0} candidates, ${group.promptReady || 0} pending, ${group.attached || 0} attached, ${group.accepted || 0} accepted`,
        );
      });
    }
  }
  const copyBlocks = Array.isArray(brief.copyBlocks) ? brief.copyBlocks : [];
  lines.push("", "## Candidate Blocks");
  copyBlocks.forEach((block, index) => {
    const placement = block.placementContract || {};
    const pixel = placement.pixelBounds || {};
    const css = placement.cssPlacement || {};
    lines.push(
      "",
      `### ${index + 1}. ${block.title}`,
      "",
      `- Candidate id: ${block.id}`,
      `- Source frame: ${block.sourceFrameTitle || block.sourceFrameId || "unknown"}`,
      `- Status: ${block.status}`,
      `- Placement: ${placement.placement || "whole frame"}`,
      `- Pixel slot: ${pixel.left || 0}, ${pixel.top || 0}, ${pixel.width || 0}x${pixel.height || 0}`,
      `- CSS slot: left ${css.left || "0%"}, top ${css.top || "0%"}, width ${css.width || "100%"}, height ${css.height || "100%"}`,
      `- Target selector: \`${placement.targetSelector || ""}\``,
      "",
      "#### Copy To Host Image Tool",
      "",
      "```text",
      block.hostPrompt || block.prompt || "",
      "```",
    );
    if (placement.htmlScaffold) {
      lines.push(
        "",
        "#### Placement Scaffold",
        "",
        "```html",
        placement.htmlScaffold,
        "```",
      );
    }
  });
  return lines.join("\n");
}

function buildServerImageHostTaskMarkdown(task) {
  const lines = [
    "# Canvax Image Host Task",
    "",
    `- Kind: ${task.kind}`,
    `- Created: ${task.createdAt}`,
    `- Requires OpenAI API key: ${task.requiresOpenAiApiKey ? "yes" : "no"}`,
    `- Intended host: ${task.intendedHost}`,
    `- Candidate tasks: ${Array.isArray(task.tasks) ? task.tasks.length : 0}`,
    "",
    "## Purpose",
    "",
    task.purpose,
    "",
    "## Source Files",
    "",
  ];
  Object.entries(task.sourceFiles || {}).forEach(([key, value]) => {
    if (value) {
      lines.push(`- ${key}: ${value}`);
    }
  });
  lines.push(
    "",
    "## No-API Boundary",
    "",
    `- Can Canvax call an image API: ${task.noApiBoundary?.canCanvaxCallImageApi ? "yes" : "no"}`,
    `- Reason: ${task.noApiBoundary?.reason || ""}`,
    "",
    "## Workflow",
    "",
  );
  (task.workflow || []).forEach((step) => lines.push(`- ${step}`));
  lines.push("", "## Return Contract", "");
  (task.returnContract?.acceptedInputs || []).forEach((input) => {
    lines.push(`- Accepted input: ${input}`);
  });
  (task.returnContract?.requiredBindingFields || []).forEach((field) => {
    lines.push(`- Required binding field: ${field}`);
  });
  lines.push("", "## Tasks");
  (task.tasks || []).forEach((item, index) => {
    const placement = item.placementContract || {};
    const pixel = placement.pixelBounds || {};
    const css = placement.cssPlacement || {};
    lines.push(
      "",
      `### ${index + 1}. ${item.title}`,
      "",
      `- Task id: ${item.taskId}`,
      `- Candidate id: ${item.candidateId}`,
      `- Source frame: ${item.sourceFrameTitle || item.sourceFrameId || "unknown"}`,
      `- Status: ${item.status}`,
      `- Output slot: ${item.outputSlot?.slotId || "create slot"}`,
      `- Placement: ${placement.placement || "whole frame"}`,
      `- Pixel slot: ${pixel.left || 0}, ${pixel.top || 0}, ${pixel.width || 0}x${pixel.height || 0}`,
      `- CSS slot: left ${css.left || "0%"}, top ${css.top || "0%"}, width ${css.width || "100%"}, height ${css.height || "100%"}`,
      `- Target selector: \`${placement.targetSelector || ""}\``,
      "",
      "#### Host Prompt",
      "",
      "```text",
      item.hostPrompt || "",
      "```",
      "",
      "#### Return Instructions",
      "",
    );
    (item.returnInstructions || []).forEach((instruction) => {
      lines.push(`- ${instruction}`);
    });
    lines.push("", "#### Acceptance Criteria", "");
    (item.acceptanceCriteria || []).forEach((criterion) => {
      lines.push(`- ${criterion}`);
    });
  });
  return lines.join("\n");
}

async function handleCodexTranscript(request, response) {
  const payload = await readJson(request);
  const result = await appendTranscriptBridgeEntry({
    text: payload.text,
    scope: payload.scope,
    frameId: payload.frameId,
    frameTitle: payload.frameTitle,
    source: payload.source || "codex-chat",
    provider: payload.provider || "codex-transcript-bridge",
    at: payload.at,
  });

  if (!result) {
    return writeJson(response, 400, {
      error: "Transcript text is required.",
    });
  }

  return writeJson(response, 200, {
    queued: true,
    entry: result.entry,
    transcriptBridge: enhanceTranscriptBridge(result.bridge),
    transcriptBridgePath,
    transcriptBridgeMarkdownPath,
  });
}

async function handleWriteDesignContext(request, response) {
  const payload = await readJson(request);
  const content = String(payload.content || "").trim();
  const overwrite = Boolean(payload.overwrite);

  if (!content) {
    return writeJson(response, 400, {
      error: "DESIGN.md content is required.",
    });
  }

  if (Buffer.byteLength(content, "utf8") > 120000) {
    return writeJson(response, 413, {
      error: "DESIGN.md content is too large.",
    });
  }

  try {
    const existing = await stat(designMdPath);
    if (existing.isFile() && !overwrite) {
      return writeJson(response, 409, {
        error: "DESIGN.md already exists. Pass overwrite=true to replace it.",
        designContext: await readDesignContext(),
      });
    }
  } catch {
    // Missing DESIGN.md is the normal create path.
  }

  await writeFile(designMdPath, `${content}\n`);

  return writeJson(response, 200, {
    written: true,
    designContext: await readDesignContext(),
  });
}

async function appendTranscriptBridgeEntry(input = {}) {
  const text = cleanString(input.text).slice(0, 8000);
  if (!text) {
    return null;
  }

  const liveExport = await readOptionalJson(liveJsonPath);
  const scope =
    cleanString(input.scope).toLowerCase() === "session" ||
    cleanString(input.scope).toLowerCase() === "board"
      ? "session"
      : "frame";
  const activeFrameId = cleanString(liveExport?.activeFrameId);
  const activeFrame =
    Array.isArray(liveExport?.frames) && activeFrameId
      ? liveExport.frames.find((frame) => cleanString(frame?.id) === activeFrameId)
      : null;
  const now = new Date().toISOString();
  const entry = {
    id: `codex-transcript-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    scope,
    source: cleanString(input.source) || "codex-chat",
    provider: cleanString(input.provider) || "codex-transcript-bridge",
    at: cleanString(input.at) || now,
    frameId:
      scope === "frame"
        ? cleanString(input.frameId) || activeFrameId || ""
        : "",
    frameTitle:
      scope === "frame"
        ? cleanString(input.frameTitle) ||
          cleanString(activeFrame?.title) ||
          ""
        : "Board context",
  };

  const existing = await readOptionalJson(transcriptBridgePath);
  const existingEntries = Array.isArray(existing?.entries)
    ? existing.entries
    : [];
  const bridge = {
    schemaVersion: 1,
    updatedAt: now,
    entries: [entry, ...existingEntries].slice(0, 80),
  };

  await mkdir(exportsRoot, { recursive: true });
  await writeTextFileAtomic(
    transcriptBridgePath,
    `${JSON.stringify(bridge, null, 2)}\n`,
  );
  await writeTextFileAtomic(
    transcriptBridgeMarkdownPath,
    buildTranscriptBridgeMarkdown(entry, bridge),
  );
  await appendFile(
    sessionEventsPath,
    `${JSON.stringify({
      type: "codex-transcript",
      id: entry.id,
      at: entry.at,
      scope: entry.scope,
      source: entry.source,
      frameId: entry.frameId,
      frameTitle: entry.frameTitle,
      text,
    })}\n`,
  );

  return { entry, bridge };
}

function enhanceTranscriptBridge(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const entries = Array.isArray(source.entries)
    ? source.entries
        .map((entry, index) => normalizeTranscriptBridgeEntry(entry, index))
        .filter(Boolean)
        .slice(0, 80)
    : [];
  return {
    schemaVersion: Number(source.schemaVersion) || 1,
    updatedAt: cleanString(source.updatedAt),
    entries,
  };
}

function normalizeTranscriptBridgeEntry(entry, index = 0) {
  const source =
    entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
  const text = cleanString(source.text);
  if (!text) {
    return null;
  }
  const scope =
    cleanString(source.scope).toLowerCase() === "session" ? "session" : "frame";
  return {
    id: cleanString(source.id) || `codex-transcript-${index + 1}`,
    text,
    scope,
    source: cleanString(source.source) || "codex-chat",
    provider: cleanString(source.provider) || "codex-transcript-bridge",
    at: cleanString(source.at) || new Date().toISOString(),
    frameId: scope === "frame" ? cleanString(source.frameId) : "",
    frameTitle:
      scope === "frame"
        ? cleanString(source.frameTitle)
        : cleanString(source.frameTitle) || "Board context",
  };
}

function buildTranscriptBridgeMarkdown(entry, bridge) {
  const entries = Array.isArray(bridge.entries) ? bridge.entries : [];
  return [
    "# Canvax Codex Transcript Bridge",
    "",
    `Updated: ${bridge.updatedAt}`,
    "",
    "## Latest",
    "",
    `- Scope: ${entry.scope}`,
    `- Frame: ${entry.frameTitle || entry.frameId || "Current frame"}`,
    `- Source: ${entry.source}`,
    "",
    entry.text,
    "",
    "## Recent Entries",
    "",
    ...entries.slice(0, 10).flatMap((item) => [
      `### ${item.frameTitle || item.scope || "Transcript"} (${item.at})`,
      "",
      item.text || "",
      "",
    ]),
  ].join("\n");
}

async function handleSaveCheckpoint(request, response) {
  const payload = await readJson(request);
  const checkpoint = normalizeCheckpointPayload(payload?.checkpoint);
  if (!checkpoint) {
    return writeJson(response, 400, {
      error: "Checkpoint payload is required.",
    });
  }

  const timestamp = buildTimestamp();
  const project = normalizeProjectExportMetadata(checkpoint.project, {
    board: checkpoint.board || {},
    frames: checkpoint.frames || [],
    activeFrameId: checkpoint.activeFrameId,
  });
  const checkpointId = `${timestamp}-${slugify(checkpoint.frameTitle || checkpoint.label || checkpoint.reason || "checkpoint")}`;
  const checkpointRoot = resolve(checkpointsRoot, checkpointId);
  const checkpointPath = join(
    "artifacts",
    "canvax",
    "checkpoints",
    checkpointId,
    "checkpoint.json",
  );

  const record = {
    id: checkpointId,
    savedAt: new Date().toISOString(),
    reason: checkpoint.reason || "manual-push",
    label: checkpoint.label || "Checkpoint",
    frameId: checkpoint.frameId || checkpoint.activeFrameId || "",
    frameTitle: checkpoint.frameTitle || checkpoint.activeFrameTitle || "",
    voiceSegmentCount: Number(checkpoint.summary?.voiceSegmentCount) || 0,
    captureCount: Number(checkpoint.summary?.captureCount) || 0,
    artifactCount: Number(checkpoint.summary?.artifactCount) || 0,
    changeCount: Number(checkpoint.summary?.changeCount) || 0,
    targetLabel: checkpoint.previewTarget?.label || "",
    jsonPath: checkpoint.export?.jsonPath || "",
    markdownPath: checkpoint.export?.markdownPath || "",
    voiceMarkdownPath: checkpoint.export?.voiceMarkdownPath || "",
    checkpointPath,
  };

  const checkpointBody = {
    ...checkpoint,
    ...record,
    project,
  };

  await mkdir(checkpointRoot, { recursive: true });
  await mkdir(exportsRoot, { recursive: true });
  await writeFile(
    resolve(checkpointRoot, "checkpoint.json"),
    `${JSON.stringify(checkpointBody, null, 2)}\n`,
  );
  await writeTextFileAtomic(
    latestCheckpointPath,
    `${JSON.stringify(checkpointBody, null, 2)}\n`,
  );
  const checkpointJsonBody = `${JSON.stringify(checkpointBody, null, 2)}\n`;
  const projectCheckpointPath = await writeProjectLatestFile(
    project,
    "canvax-checkpoint-latest.json",
    checkpointJsonBody,
  );
  const projectCheckpointRecord = {
    ...record,
    projectCheckpointPath,
  };

  const existingIndex = await readOptionalJson(checkpointsIndexPath);
  const existingItems =
    existingIndex && Array.isArray(existingIndex.items)
      ? existingIndex.items
      : [];
  const nextItems = [record, ...existingItems].slice(0, 32);
  const indexBody = {
    updatedAt: new Date().toISOString(),
    items: nextItems,
  };
  await mkdir(checkpointsRoot, { recursive: true });
  await writeTextFileAtomic(
    checkpointsIndexPath,
    `${JSON.stringify(indexBody, null, 2)}\n`,
  );
  const projectCheckpointsIndexPath = await updateProjectCheckpointIndex(
    project,
    projectCheckpointRecord,
  );

  const eventBody = {
    type: "checkpoint",
    id: checkpointId,
    at: record.savedAt,
    reason: record.reason,
    label: record.label,
    note: checkpoint.note || "",
    frameId: record.frameId,
    frameTitle: record.frameTitle,
    summary: checkpoint.summary || null,
    export: checkpoint.export || null,
    projectCheckpointPath,
    projectCheckpointsIndexPath,
    previewTarget: checkpoint.previewTarget || null,
    outputDigest: checkpoint.outputDigest || null,
  };
  await appendFile(sessionEventsPath, `${JSON.stringify(eventBody)}\n`);

  return writeJson(response, 200, {
    saved: true,
    checkpoint: enhanceCheckpointRecord(record),
    checkpointHistory: enhanceCheckpointHistory(indexBody),
    latestCheckpointPath,
    projectCheckpointPath,
    checkpointsIndexPath,
    projectCheckpointsIndexPath,
    sessionEventsPath,
  });
}

async function handlePublishWorkspaceOutput(request, response) {
  const payload = await readJson(request);
  const frameId = cleanString(payload?.frameId);
  const frameTitle = cleanString(payload?.frameTitle);
  const project = normalizeManifestProject(payload?.project);
  const clear = Boolean(payload?.clear);
  const existingCodexManifest = await readOptionalJson(codexOutputManifestPath);
  const manualPreviewManifest = await readOptionalJson(previewManifestPath);
  const existingManifest = normalizePreviewManifest(
    existingCodexManifest || {},
  );
  const liveProjectStub = {
    project,
    activeFrameId: frameId,
    frames: frameId ? [{ id: frameId, title: frameTitle }] : [],
  };

  if (clear) {
    try {
      await unlink(codexOutputManifestPath);
    } catch {
      // Ignore missing manifest removals.
    }

    return writeJson(response, 200, {
      cleared: true,
      changeCount: 0,
      manifest: null,
      previewManifest: enhanceManifest(
        scopePreviewManifestToLiveProject(
          mergeManifestSources(manualPreviewManifest, null),
          liveProjectStub,
        ),
      ),
    });
  }

  const changeEntries = await collectWorkspaceChangeEntries({
    frameId,
    frameTitle,
  });
  const nextManifest = buildAutoPublishedCodexManifest(existingManifest, {
    frameId,
    frameTitle,
    project,
    changeEntries,
  });

  if (hasManifestContent(nextManifest)) {
    await mkdir(codexOutputRoot, { recursive: true });
    await writeFile(
      codexOutputManifestPath,
      `${JSON.stringify(nextManifest, null, 2)}\n`,
    );
  } else {
    try {
      await unlink(codexOutputManifestPath);
    } catch {
      // Ignore missing manifest removals.
    }
  }

  return writeJson(response, 200, {
    saved: true,
    changeCount: changeEntries.length,
    manifest: hasManifestContent(nextManifest)
      ? enhanceManifest(nextManifest)
      : null,
    previewManifest: enhanceManifest(
      scopePreviewManifestToLiveProject(
        mergeManifestSources(
          manualPreviewManifest,
          hasManifestContent(nextManifest) ? nextManifest : null,
        ),
        liveProjectStub,
      ),
    ),
    codexOutputManifestPath,
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
  const transcriptBridge = enhanceTranscriptBridge(
    await readOptionalJson(transcriptBridgePath),
  );
  const checkpointHistory = await readCheckpointHistoryForLiveProject(
    liveExport,
  );
  const sessionEvents = await readRecentSessionEvents(sessionEventsPath, 48);
  const previewManifest = scopePreviewManifestToLiveProject(
    await readOptionalJson(previewManifestPath),
    liveExport,
  );
  const previewTweak = enhancePreviewTweak(
    await readOptionalJson(previewTweakJsonPath),
  );
  const designJury = enhanceDesignJuryReview(
    await readOptionalJson(designJuryJsonPath),
  );
  const imageResultPack = scopeImageResultPackToLiveProject(
    await readOptionalJson(imageResultsJsonPath),
    liveExport,
  );
  const projectRegistry = await readOptionalJson(projectRegistryJsonPath);
  const codexOutputManifest = scopePreviewManifestToLiveProject(
    await readOptionalJson(codexOutputManifestPath),
    liveExport,
  );
  const workspaceFollow = await buildLiveWorkspaceFollowState({
    liveExport,
    codexOutputManifest,
  });
  const mergedManifest = mergeManifestSources(
    previewManifest,
    workspaceFollow.codexManifest,
  );
  const mergedPreviewManifest = enhanceManifest(mergedManifest);
  const outputDigest = buildPreviewOutputDigest(
    mergedManifest,
    workspaceFollow.meta,
  );
  const previewSnapshots = enhancePreviewSnapshots(
    await readOptionalJson(previewSnapshotsIndexPath),
  );

  return writeJson(response, 200, {
    updatedAt: new Date().toISOString(),
    transport: buildTransportDescriptor(),
    hostCapabilities: buildHostCapabilities(),
    designContext: await readDesignContext(),
    liveExport,
    liveMarkdown,
    liveVoiceMarkdown,
    transcriptBridge,
    checkpointHistory,
    sessionEvents,
    previewManifest: mergedPreviewManifest,
    workspaceFollow: workspaceFollow.meta,
    outputDigest,
    previewSnapshots,
    previewTweak,
    designJury,
    imageResultPack,
    projectRegistry,
    paths: {
      liveJsonPath,
      liveMarkdownPath,
      liveVoiceMarkdownPath,
      rewriteRequestJsonPath,
      rewriteRequestMarkdownPath,
      buildRealRequestJsonPath,
      buildRealRequestMarkdownPath,
      assetCandidatesJsonPath,
      assetCandidatesMarkdownPath,
      imageGenerationBriefJsonPath,
      imageGenerationBriefMarkdownPath,
      imageHostTaskJsonPath,
      imageHostTaskMarkdownPath,
      imageResultsJsonPath,
      imageResultsMarkdownPath,
      projectExportsRoot,
      projectRegistryJsonPath,
      projectRegistryMarkdownPath,
      transcriptBridgePath,
      transcriptBridgeMarkdownPath,
      checkpointLatestPath: latestCheckpointPath,
      checkpointsIndexPath,
      sessionEventsPath,
      previewManifestPath,
      previewTweakJsonPath,
      previewTweakMarkdownPath,
      designJuryJsonPath,
      designJuryMarkdownPath,
      codexOutputManifestPath,
      previewSnapshotsIndexPath,
    },
  });
}

function enhancePreviewTweak(tweak) {
  if (tweak?.kind !== "canvax-preview-tweak-request") {
    return null;
  }
  return {
    ...tweak,
    href: workspaceUrlForPath(relative(projectRoot, previewTweakJsonPath)),
    markdownHref: workspaceUrlForPath(
      relative(projectRoot, previewTweakMarkdownPath),
    ),
  };
}

function enhanceDesignJuryReview(review) {
  if (review?.kind !== "canvax-design-jury-review") {
    return null;
  }
  return {
    ...review,
    href: workspaceUrlForPath(relative(projectRoot, designJuryJsonPath)),
    markdownHref: workspaceUrlForPath(
      relative(projectRoot, designJuryMarkdownPath),
    ),
  };
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

async function handleSavePreviewTweak(request, response) {
  const payload = await readJson(request);
  const tweak = payload?.tweak;
  if (!tweak || typeof tweak !== "object") {
    return writeJson(response, 400, { error: "Tweak payload is required." });
  }

  const timestamp = buildTimestamp();
  const frameTitle = cleanString(tweak.frameTitle) || "preview-tweak";
  const tweakId = `${timestamp}-${slugify(frameTitle)}`;
  const tweakRoot = resolve(previewTweaksRoot, tweakId);
  const region = normalizePreviewTweakRegion(tweak.region);
  const target = normalizePreviewTweakTarget(tweak.target);
  const record = {
    kind: "canvax-preview-tweak-request",
    schemaVersion: 1,
    requiresOpenAiApiKey: false,
    id: tweakId,
    createdAt: new Date().toISOString(),
    frameId: cleanString(tweak.frameId),
    frameTitle,
    compareMode: cleanString(tweak.compareMode) || "output",
    viewport: {
      label: cleanString(tweak.viewportLabel),
      width: Number(tweak.viewportWidth) || 0,
      height: Number(tweak.viewportHeight) || 0,
    },
    target,
    region,
    note:
      cleanString(tweak.note) ||
      "Adjust the selected generated-output region according to the latest Canvax sketch and voice context.",
    source: {
      surface: "preview",
      interaction: "drag-region",
      noApiBoundary:
        "This tweak request is a local region handoff for Codex. It does not call OpenAI, ChatGPT, image APIs, browser automation, or paid APIs.",
    },
  };

  await mkdir(tweakRoot, { recursive: true });
  await mkdir(exportsRoot, { recursive: true });
  const archiveJsonPath = resolve(tweakRoot, "tweak.json");
  const archiveMarkdownPath = resolve(tweakRoot, "tweak.md");
  const markdown = buildPreviewTweakMarkdown(record);
  await writeFile(archiveJsonPath, `${JSON.stringify(record, null, 2)}\n`);
  await writeFile(archiveMarkdownPath, markdown);
  await writeTextFileAtomic(
    previewTweakJsonPath,
    `${JSON.stringify(record, null, 2)}\n`,
  );
  await writeTextFileAtomic(previewTweakMarkdownPath, markdown);

  await appendFile(
    sessionEventsPath,
    `${JSON.stringify({
      type: "preview-tweak",
      id: tweakId,
      at: record.createdAt,
      frameId: record.frameId,
      frameTitle: record.frameTitle,
      targetLabel: target.label,
      targetPath: target.previewPath || target.url,
      note: record.note,
      region: record.region,
      export: {
        jsonPath: relative(projectRoot, previewTweakJsonPath),
        markdownPath: relative(projectRoot, previewTweakMarkdownPath),
      },
    })}\n`,
  );

  return writeJson(response, 200, {
    saved: true,
    tweak: record,
    tweakPath: previewTweakJsonPath,
    tweakMarkdownPath: previewTweakMarkdownPath,
    archiveRoot: tweakRoot,
  });
}

function normalizePreviewTweakRegion(region) {
  const normalized = region?.normalized || {};
  const pixel = region?.pixel || {};
  return {
    normalized: {
      x: clamp01(Number(normalized.x) || 0),
      y: clamp01(Number(normalized.y) || 0),
      width: clamp01(Number(normalized.width) || 0),
      height: clamp01(Number(normalized.height) || 0),
    },
    pixel: {
      x: Math.max(0, Math.round(Number(pixel.x) || 0)),
      y: Math.max(0, Math.round(Number(pixel.y) || 0)),
      width: Math.max(1, Math.round(Number(pixel.width) || 1)),
      height: Math.max(1, Math.round(Number(pixel.height) || 1)),
    },
  };
}

function normalizePreviewTweakTarget(target) {
  return {
    id: cleanString(target?.id),
    label: cleanString(target?.label),
    type: cleanString(target?.type),
    url: cleanString(target?.url || target?.resolvedUrl),
    previewPath: cleanString(target?.previewPath || target?.path),
    source: cleanString(target?.source),
    description: cleanString(target?.description || target?.summary),
  };
}

function buildPreviewTweakMarkdown(tweak) {
  const region = tweak.region?.normalized || {};
  const lines = [
    "# Canvax Preview Tweak Request",
    "",
    `- Frame: ${tweak.frameTitle || tweak.frameId || "current frame"}`,
    `- Target: ${tweak.target?.label || tweak.target?.previewPath || tweak.target?.url || "connected output"}`,
    `- Region: x ${region.x}, y ${region.y}, width ${region.width}, height ${region.height}`,
    `- Requires OpenAI API key: ${tweak.requiresOpenAiApiKey ? "yes" : "no"}`,
    "",
    "## Correction",
    "",
    tweak.note,
    "",
    "## Codex Use",
    "",
    "Use this as a precise generated-output correction region. Preserve unrelated regions unless the current Canvax sketch, voice notes, or frame context explicitly asks for broader changes.",
    "",
    "## Boundary",
    "",
    tweak.source?.noApiBoundary || "",
  ];
  return `${lines.join("\n")}\n`;
}

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
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
  const previousPayload = await readOptionalJson(
    resolve(outputRoot, "frame.json"),
  );
  const previousMeta = await readOptionalJson(resolve(outputRoot, "meta.json"));
  const refinement = buildMaterializeRefinement(
    previousPayload,
    payload,
    previousMeta,
  );
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
        generation: payload.generation,
        refinement,
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
    generation: payload.generation,
    refinement,
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
    generation: payload.generation,
    refinement,
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
    generation: payload.generation,
    refinement,
    previewManifestPath,
    previewManifest: enhanceManifest(nextManifest),
  });
}

function normalizeMaterializePayload(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    schemaVersion: Number(source.schemaVersion) || HANDOFF_SCHEMA_VERSION,
    storageVersion: Number(source.storageVersion) || 0,
    generatedAt: cleanString(source.generatedAt) || new Date().toISOString(),
    transport: normalizeTransportDescriptor(source.transport),
    board: normalizeMaterializeBoard(source.board),
    project: normalizeProjectExportMetadata(source.project, {
      board: source.board || {},
      frames: source.frame ? [source.frame] : [],
      activeFrameId: source.frame?.id || "",
    }),
    generation: normalizeMaterializeGeneration(
      source.generation || source.board?.generation,
    ),
    frame: normalizeMaterializeFrame(source.frame),
  };
}

function normalizeMaterializeGeneration(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const mode =
    cleanString(source.mode).toLowerCase() === "generate-screen"
      ? "generate-screen"
      : "materialize";
  const direction = cleanString(source.direction).toLowerCase();
  const style = cleanString(source.style).toLowerCase();
  const focus = cleanString(source.focus).toLowerCase();
  const normalized = {
    mode,
    direction: ["product", "editorial", "cinematic", "dashboard", "playful"].includes(
      direction,
    )
      ? direction
      : "product",
    style: ["rapid", "studio", "showcase"].includes(style)
      ? style
      : "studio",
    focus: ["balanced", "conversion", "storytelling", "utility"].includes(
      focus,
    )
      ? focus
      : "balanced",
  };
  return {
    ...normalized,
    summary:
      cleanString(source.summary) ||
      formatMaterializeGenerationSummary(normalized),
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
    generation: normalizeMaterializeGeneration(source.generation),
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
    imageDataUrl: cleanString(source.imageDataUrl),
    sourceName: cleanString(source.sourceName),
    assetCandidateId: cleanString(source.assetCandidateId),
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

function buildMaterializeRefinement(
  previousPayload,
  nextPayload,
  previousMeta = null,
) {
  const nextFrame = nextPayload?.frame || null;
  const previousFrame = previousPayload?.frame || null;
  if (!nextFrame) {
    return normalizeMaterializeRefinement(null);
  }

  const viewportWidth = Number(nextFrame.viewportWidth) || 1440;
  const viewportHeight = Number(nextFrame.viewportHeight) || 1024;
  const previousIteration = Number(previousMeta?.refinement?.iteration) || 0;
  const nextElements = Array.isArray(nextFrame.elements)
    ? nextFrame.elements
    : [];
  const previousElements = Array.isArray(previousFrame?.elements)
    ? previousFrame.elements
    : [];
  const previousElementMap = new Map(
    previousElements
      .map((element) => [cleanString(element.id), element])
      .filter(([id]) => id),
  );
  const nextElementMap = new Map(
    nextElements
      .map((element) => [cleanString(element.id), element])
      .filter(([id]) => id),
  );
  const noteFieldNames = ["objective", "layout", "motion", "assets", "mobile"];
  const boardFieldNames = ["project", "goal", "audience", "designMood"];
  const noteFieldsChanged = noteFieldNames.filter(
    (field) =>
      cleanString(previousFrame?.[field]) !== cleanString(nextFrame?.[field]),
  );
  const boardFieldsChanged = boardFieldNames.filter(
    (field) =>
      cleanString(previousPayload?.board?.[field]) !==
      cleanString(nextPayload?.board?.[field]),
  );
  const viewportChanged =
    !previousFrame ||
    Number(previousFrame.viewportWidth) !== viewportWidth ||
    Number(previousFrame.viewportHeight) !== viewportHeight ||
    cleanString(previousFrame.viewport) !== cleanString(nextFrame.viewport);
  const backgroundChanged =
    cleanString(previousFrame?.backgroundImage) !==
    cleanString(nextFrame.backgroundImage);
  const changedRegions = [];
  const added = [];
  const removed = [];
  const updated = [];

  nextElementMap.forEach((element, elementId) => {
    const previousElement = previousElementMap.get(elementId);
    if (!previousElement) {
      added.push(elementId);
      const region = buildRefinementRegionFromElement(
        element,
        "added",
        `Added ${element.type || "element"}`,
        nextFrame,
      );
      if (region) {
        changedRegions.push(region);
      }
      return;
    }
    if (
      fingerprintMaterializeElement(previousElement) !==
      fingerprintMaterializeElement(element)
    ) {
      updated.push(elementId);
      const region = buildRefinementRegionFromBounds(
        unionMaterializeBounds(previousElement.bounds, element.bounds),
        "updated",
        `Updated ${element.type || "element"}`,
        nextFrame,
      );
      if (region) {
        changedRegions.push(region);
      }
    }
  });

  previousElementMap.forEach((element, elementId) => {
    if (nextElementMap.has(elementId)) {
      return;
    }
    removed.push(elementId);
    const region = buildRefinementRegionFromElement(
      element,
      "removed",
      `Removed ${element.type || "element"}`,
      nextFrame,
    );
    if (region) {
      changedRegions.push(region);
    }
  });

  if (noteFieldsChanged.length) {
    const region = buildRefinementRegionFromBounds(
      {
        left: 0,
        top: 0,
        width: Math.min(viewportWidth, Math.max(260, viewportWidth * 0.72)),
        height: Math.min(viewportHeight, Math.max(160, viewportHeight * 0.22)),
      },
      "notes",
      "Frame notes refined",
      nextFrame,
    );
    if (region) {
      changedRegions.push(region);
    }
  }

  if (backgroundChanged) {
    const region = buildRefinementRegionFromBounds(
      {
        left: 0,
        top: 0,
        width: viewportWidth,
        height: viewportHeight,
      },
      "background",
      "Reference or canvas background changed",
      nextFrame,
    );
    if (region) {
      changedRegions.push(region);
    }
  }

  const uniqueRegions = dedupeRefinementRegions(changedRegions).slice(0, 8);
  const hasPrevious = Boolean(previousFrame);
  const changed =
    !hasPrevious ||
    Boolean(
      added.length ||
      removed.length ||
      updated.length ||
      noteFieldsChanged.length ||
      boardFieldsChanged.length ||
      backgroundChanged ||
      viewportChanged,
    );
  const regionCount = uniqueRegions.length;
  const counts = {
    added: added.length,
    removed: removed.length,
    updated: updated.length,
    noteFieldsChanged: noteFieldsChanged.length,
    boardFieldsChanged: boardFieldsChanged.length,
    backgroundChanged: backgroundChanged ? 1 : 0,
    viewportChanged: viewportChanged ? 1 : 0,
    regionCount,
  };

  let summary = "";
  if (!hasPrevious) {
    const parts = [];
    if (nextElements.length) {
      parts.push(
        `${nextElements.length} sketch element${nextElements.length === 1 ? "" : "s"}`,
      );
    }
    if (noteFieldsChanged.length) {
      parts.push(
        `${noteFieldsChanged.length} note field${noteFieldsChanged.length === 1 ? "" : "s"}`,
      );
    }
    summary = parts.length
      ? `Initial materialize from ${parts.join(" and ")}.`
      : "Initial materialize from the current sketch.";
  } else if (!changed) {
    summary = "Rematerialized without a structural delta.";
  } else {
    const parts = [];
    if (added.length) {
      parts.push(`${added.length} added`);
    }
    if (updated.length) {
      parts.push(`${updated.length} updated`);
    }
    if (removed.length) {
      parts.push(`${removed.length} removed`);
    }
    if (noteFieldsChanged.length) {
      parts.push(
        `${noteFieldsChanged.length} note edit${noteFieldsChanged.length === 1 ? "" : "s"}`,
      );
    }
    if (backgroundChanged) {
      parts.push("reference changed");
    }
    if (viewportChanged) {
      parts.push("viewport adjusted");
    }
    summary = `Refined from previous output: ${parts.join(", ")}${regionCount ? ` across ${regionCount} region${regionCount === 1 ? "" : "s"}` : ""}.`;
  }

  return normalizeMaterializeRefinement({
    iteration: previousIteration + 1,
    hasPrevious,
    changed,
    comparedAgainst: cleanString(previousMeta?.generatedAt),
    summary,
    counts,
    changedFields: [
      ...noteFieldsChanged.map((field) => `frame:${field}`),
      ...boardFieldsChanged.map((field) => `board:${field}`),
      ...(backgroundChanged ? ["frame:backgroundImage"] : []),
      ...(viewportChanged ? ["frame:viewport"] : []),
    ],
    changedElementIds: {
      added,
      removed,
      updated,
    },
    changedRegions: uniqueRegions,
  });
}

function normalizeMaterializeRefinement(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const counts =
    source.counts &&
    typeof source.counts === "object" &&
    !Array.isArray(source.counts)
      ? source.counts
      : {};
  return {
    iteration: Math.max(1, Number(source.iteration) || 1),
    hasPrevious: Boolean(source.hasPrevious),
    changed: typeof source.changed === "boolean" ? source.changed : true,
    comparedAgainst: cleanString(source.comparedAgainst),
    summary: cleanString(source.summary),
    counts: {
      added: Math.max(0, Number(counts.added) || 0),
      removed: Math.max(0, Number(counts.removed) || 0),
      updated: Math.max(0, Number(counts.updated) || 0),
      noteFieldsChanged: Math.max(0, Number(counts.noteFieldsChanged) || 0),
      boardFieldsChanged: Math.max(0, Number(counts.boardFieldsChanged) || 0),
      backgroundChanged: Math.max(0, Number(counts.backgroundChanged) || 0),
      viewportChanged: Math.max(0, Number(counts.viewportChanged) || 0),
      regionCount: Math.max(0, Number(counts.regionCount) || 0),
    },
    changedFields: normalizeStringArray(source.changedFields),
    changedElementIds: {
      added: normalizeStringArray(source.changedElementIds?.added),
      removed: normalizeStringArray(source.changedElementIds?.removed),
      updated: normalizeStringArray(source.changedElementIds?.updated),
    },
    changedRegions: Array.isArray(source.changedRegions)
      ? source.changedRegions
          .map((region) => normalizeRefinementRegion(region))
          .filter(Boolean)
      : [],
  };
}

function normalizeRefinementRegion(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const left = Math.max(0, Number(value.left) || 0);
  const top = Math.max(0, Number(value.top) || 0);
  const width = Math.max(12, Number(value.width) || 0);
  const height = Math.max(12, Number(value.height) || 0);
  return {
    left,
    top,
    width,
    height,
    kind: cleanString(value.kind) || "updated",
    label: cleanString(value.label) || "Changed region",
  };
}

function buildRefinementRegionFromElement(element, kind, label, frame) {
  return buildRefinementRegionFromBounds(
    element?.bounds || null,
    kind,
    label,
    frame,
  );
}

function buildRefinementRegionFromBounds(bounds, kind, label, frame) {
  if (!bounds || typeof bounds !== "object") {
    return null;
  }
  const viewportWidth = Number(frame?.viewportWidth) || 1440;
  const viewportHeight = Number(frame?.viewportHeight) || 1024;
  const left = clampNumber(bounds.left, 0, viewportWidth, 0);
  const top = clampNumber(bounds.top, 0, viewportHeight, 0);
  const width = clampNumber(bounds.width, 12, viewportWidth, 12);
  const height = clampNumber(bounds.height, 12, viewportHeight, 12);
  return normalizeRefinementRegion({
    left,
    top,
    width: Math.min(width, viewportWidth - left),
    height: Math.min(height, viewportHeight - top),
    kind,
    label,
  });
}

function unionMaterializeBounds(leftBounds, rightBounds) {
  const left = normalizeMaterializeBounds(leftBounds);
  const right = normalizeMaterializeBounds(rightBounds);
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  const unionLeft = Math.min(left.left, right.left);
  const unionTop = Math.min(left.top, right.top);
  const unionRight = Math.max(left.right, right.right);
  const unionBottom = Math.max(left.bottom, right.bottom);
  return {
    left: unionLeft,
    top: unionTop,
    right: unionRight,
    bottom: unionBottom,
    width: unionRight - unionLeft,
    height: unionBottom - unionTop,
  };
}

function fingerprintMaterializeElement(element) {
  if (!element || typeof element !== "object") {
    return "";
  }
  return JSON.stringify({
    type: cleanString(element.type),
    color: normalizeHexColor(element.color) || "",
    size: Number(element.size) || 0,
    alpha: Number(element.alpha) || 0,
    composite: cleanString(element.composite),
    groupId: cleanString(element.groupId),
    text: cleanString(element.text),
    attachedTo: cleanString(element.attachedTo),
    start: normalizeMaterializePoint(element.start),
    end: normalizeMaterializePoint(element.end),
    bounds: normalizeMaterializeBounds(element.bounds),
    resolvedPosition:
      element.resolvedPosition && typeof element.resolvedPosition === "object"
        ? {
            x: Number(element.resolvedPosition.x) || 0,
            y: Number(element.resolvedPosition.y) || 0,
            attached: Boolean(element.resolvedPosition.attached),
          }
        : null,
    x: Number(element.x) || 0,
    y: Number(element.y) || 0,
    imageDataUrl: cleanString(element.imageDataUrl),
    sourceName: cleanString(element.sourceName),
    assetCandidateId: cleanString(element.assetCandidateId),
    points: Array.isArray(element.points)
      ? element.points.map((point) => normalizeMaterializePoint(point))
      : [],
  });
}

function dedupeRefinementRegions(regions) {
  return dedupeByKey(regions.filter(Boolean), (region) =>
    [
      region.kind,
      region.label,
      Math.round(region.left),
      Math.round(region.top),
      Math.round(region.width),
      Math.round(region.height),
    ].join(":"),
  );
}

function upsertMaterializedPreviewManifest(existingManifest, materialized) {
  const manifest = normalizePreviewManifest(existingManifest || {});
  const frameId = cleanString(materialized.frame.id) || "frame";
  const frameTitle = cleanString(materialized.frame.title) || "Untitled frame";
  const generation = normalizeMaterializeGeneration(materialized.generation);
  const project = normalizeManifestProject(materialized.project);
  const generationSummary = buildMaterializeGenerationSummary(generation);
  const generatedScreen = generation.mode === "generate-screen";
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
  const refinement = normalizeMaterializeRefinement(materialized.refinement);
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

  const note = generatedScreen
    ? `Generate screen creates a richer local ${generationSummary} screen from the current Canvax frame and keeps the sketch board unchanged.`
    : "Materialize mode creates a styled local preview from the current Canvax frame and keeps the sketch board unchanged.";
  const notes = normalizeManifestNotes(manifest.notes, note);

  return normalizePreviewManifest({
    ...manifest,
    updatedAt: new Date().toISOString(),
    source: "canvax-materialize",
    project,
    previewUrl: "",
    notes,
    targets: [
      {
        id: targetId,
        label: generatedScreen
          ? `${frameTitle} generated screen`
          : `${frameTitle} materialized`,
        source: "canvax-materialize",
        type: generatedScreen
          ? "generated-screen-preview"
          : "materialized-preview",
        previewPath: materialized.previewPath,
        description: generatedScreen
          ? `Richer local generated screen using ${generationSummary}.`
          : "Styled local preview generated directly from the current Canvax frame.",
        frameIds: [frameId],
        versionTag,
        generatedAt,
        sourceFrameId: frameId,
        sourceFrameTitle: frameTitle,
        sourceFrameUpdatedAt,
        changeSummary:
          refinement.summary ||
          (generatedScreen ? generationSummary : "Materialized preview refreshed."),
        generationSummary,
        project,
        projectId: project?.id || "",
        refinement,
      },
      ...preservedTargets,
    ],
    artifacts: [
      {
        id: htmlArtifactId,
        label: generatedScreen
          ? `${frameTitle} generated screen`
          : `${frameTitle} preview`,
        path: materialized.previewPath,
        kind: "preview",
        description: generatedScreen
          ? `Generated interactive HTML artifact using ${generationSummary}.`
          : "Generated interactive HTML artifact for this frame.",
        frameIds: [frameId],
        versionTag,
        generatedAt,
        sourceFrameId: frameId,
        sourceFrameTitle: frameTitle,
        sourceFrameUpdatedAt,
        changeSummary:
          refinement.summary ||
          (generatedScreen ? generationSummary : "Materialized preview refreshed."),
        generationSummary,
        project,
        projectId: project?.id || "",
        refinement,
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
        changeSummary:
          refinement.summary ||
          (generatedScreen ? generationSummary : "Materialized preview context."),
        generationSummary,
        project,
        projectId: project?.id || "",
        refinement,
      },
      {
        id: metaArtifactId,
        label: `${frameTitle} materialize meta`,
        path: materialized.metaPath,
        kind: "meta",
        description:
          generatedScreen
            ? "Generated-screen metadata including recipe, generation time, and source-frame revision."
            : "Materialize metadata including generation time and source-frame revision.",
        frameIds: [frameId],
        versionTag,
        generatedAt,
        sourceFrameId: frameId,
        sourceFrameTitle: frameTitle,
        sourceFrameUpdatedAt,
        changeSummary:
          refinement.summary ||
          (generatedScreen ? generationSummary : "Materialized preview metadata."),
        generationSummary,
        project,
        projectId: project?.id || "",
        refinement,
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
              changeSummary:
                refinement.summary ||
                (generatedScreen ? generationSummary : "Sketch overlay saved."),
              generationSummary,
              project,
              projectId: project?.id || "",
              refinement,
            },
          ]
        : []),
      ...preservedArtifacts,
    ],
  });
}

function materializeGenerationDirectionLabel(direction) {
  switch (direction) {
    case "editorial":
      return "Editorial";
    case "cinematic":
      return "Cinematic";
    case "dashboard":
      return "Dashboard";
    case "playful":
      return "Playful";
    default:
      return "Product UI";
  }
}

function materializeGenerationStyleLabel(style) {
  switch (style) {
    case "rapid":
      return "Rapid";
    case "showcase":
      return "Showcase";
    default:
      return "Studio";
  }
}

function materializeGenerationFocusLabel(focus) {
  switch (focus) {
    case "conversion":
      return "Conversion";
    case "storytelling":
      return "Storytelling";
    case "utility":
      return "Utility";
    default:
      return "Balanced";
  }
}

function buildMaterializeGenerationSummary(generation) {
  const normalized = normalizeMaterializeGeneration(generation);
  return formatMaterializeGenerationSummary(normalized);
}

function formatMaterializeGenerationSummary(generation) {
  return [
    materializeGenerationDirectionLabel(generation.direction),
    materializeGenerationStyleLabel(generation.style),
    materializeGenerationFocusLabel(generation.focus),
  ].join(" • ");
}

function resolveMaterializeGenerationProfile(generation, accent) {
  const normalized = normalizeMaterializeGeneration(generation);
  const profiles = {
    product: {
      pageBackground:
        "radial-gradient(circle at top left, rgba(255,255,255,0.92), transparent 28%), linear-gradient(145deg, #eaf0ff 0%, #f4f6fb 46%, #e6edf8 100%)",
      stageBackground:
        "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(239,244,251,0.92)), linear-gradient(160deg, rgba(255,255,255,0.84), rgba(235,240,248,0.88))",
      paper: "#f7fbff",
      paperStrong: "#ffffff",
      ink: "#162033",
      muted: "rgba(39, 51, 73, 0.72)",
      panel: "rgba(249, 252, 255, 0.78)",
      panelStrong: "rgba(255, 255, 255, 0.92)",
      shadow: "rgba(23, 39, 69, 0.16)",
      displayFont: '"SF Pro Display", "Avenir Next", "Helvetica Neue", sans-serif',
      bodyFont: '"SF Pro Text", "Avenir Next", "Helvetica Neue", sans-serif',
      shellTone: "cool",
    },
    editorial: {
      pageBackground:
        "radial-gradient(circle at top right, rgba(255,245,233,0.9), transparent 26%), linear-gradient(155deg, #f4ece0 0%, #fbf7f2 48%, #efe2d3 100%)",
      stageBackground:
        "linear-gradient(180deg, rgba(255,251,246,0.94), rgba(247,239,229,0.9)), linear-gradient(135deg, rgba(255,255,255,0.82), rgba(245,233,220,0.82))",
      paper: "#fbf5ee",
      paperStrong: "#fffaf6",
      ink: "#251814",
      muted: "rgba(74, 52, 41, 0.72)",
      panel: "rgba(255, 249, 243, 0.74)",
      panelStrong: "rgba(255, 251, 247, 0.9)",
      shadow: "rgba(44, 29, 21, 0.18)",
      displayFont: '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
      bodyFont: '"Avenir Next", "Helvetica Neue", sans-serif',
      shellTone: "warm",
    },
    cinematic: {
      pageBackground:
        "radial-gradient(circle at 20% 20%, rgba(105,150,255,0.28), transparent 20%), radial-gradient(circle at 80% 18%, rgba(255,255,255,0.22), transparent 18%), linear-gradient(155deg, #070b14 0%, #101a2e 42%, #05070d 100%)",
      stageBackground:
        "radial-gradient(circle at 68% 24%, rgba(255,255,255,0.26), transparent 18%), linear-gradient(180deg, rgba(9,13,22,0.96), rgba(11,18,34,0.96)), linear-gradient(145deg, rgba(14,23,45,0.98), rgba(4,7,14,0.98))",
      paper: "#09111f",
      paperStrong: "#10192a",
      ink: "#f5f8ff",
      muted: "rgba(214, 225, 248, 0.72)",
      panel: "rgba(17, 25, 42, 0.76)",
      panelStrong: "rgba(19, 28, 47, 0.9)",
      shadow: "rgba(0, 0, 0, 0.38)",
      displayFont: '"Avenir Next Condensed", "Helvetica Neue", sans-serif',
      bodyFont: '"Avenir Next", "Helvetica Neue", sans-serif',
      shellTone: "dark",
    },
    dashboard: {
      pageBackground:
        "radial-gradient(circle at top left, rgba(73,118,255,0.22), transparent 24%), linear-gradient(150deg, #0f1626 0%, #172033 46%, #0f1829 100%)",
      stageBackground:
        "linear-gradient(180deg, rgba(20,28,43,0.96), rgba(14,22,36,0.96)), linear-gradient(145deg, rgba(27,39,59,0.96), rgba(14,20,33,0.98))",
      paper: "#101a2c",
      paperStrong: "#162236",
      ink: "#eef4ff",
      muted: "rgba(203, 218, 246, 0.7)",
      panel: "rgba(18, 28, 43, 0.8)",
      panelStrong: "rgba(21, 33, 51, 0.92)",
      shadow: "rgba(5, 8, 14, 0.36)",
      displayFont: '"SF Pro Display", "Avenir Next", "Helvetica Neue", sans-serif',
      bodyFont: '"SF Pro Text", "Avenir Next", "Helvetica Neue", sans-serif',
      shellTone: "grid",
    },
    playful: {
      pageBackground:
        "radial-gradient(circle at 15% 10%, rgba(255,190,132,0.32), transparent 18%), radial-gradient(circle at 78% 16%, rgba(120,212,255,0.28), transparent 18%), linear-gradient(160deg, #fff4ea 0%, #fefcff 44%, #eef7ff 100%)",
      stageBackground:
        "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,247,255,0.92)), linear-gradient(145deg, rgba(255,246,239,0.88), rgba(239,247,255,0.84))",
      paper: "#fff7f0",
      paperStrong: "#ffffff",
      ink: "#2b1f3a",
      muted: "rgba(90, 71, 110, 0.68)",
      panel: "rgba(255, 250, 246, 0.76)",
      panelStrong: "rgba(255, 255, 255, 0.9)",
      shadow: "rgba(80, 54, 98, 0.16)",
      displayFont: '"Marker Felt", "Avenir Next", "Helvetica Neue", sans-serif',
      bodyFont: '"Avenir Next", "Helvetica Neue", sans-serif',
      shellTone: "soft",
    },
  };
  const profile = profiles[normalized.direction] || profiles.product;
  const styleStrength =
    normalized.style === "showcase" ? 1 : normalized.style === "rapid" ? 0 : 0.5;
  const focusGlow =
    normalized.focus === "storytelling"
      ? rgbaFromHex(accent, 0.26)
      : normalized.focus === "conversion"
        ? rgbaFromHex(accent, 0.2)
        : normalized.focus === "utility"
          ? rgbaFromHex(accent, 0.14)
          : rgbaFromHex(accent, 0.18);
  return {
    ...profile,
    accent,
    accentStrong:
      normalized.direction === "cinematic"
        ? mixHex(accent, "#0f1320", 0.26)
        : mixHex(accent, "#1b1513", 0.18),
    accentSoft:
      normalized.direction === "cinematic"
        ? rgbaFromHex(accent, 0.18)
        : rgbaFromHex(accent, 0.14),
    accentBorder: rgbaFromHex(accent, 0.44 + styleStrength * 0.08),
    accentGlow: focusGlow,
    stageGridOpacity:
      normalized.direction === "dashboard" ? 0.82 : normalized.direction === "cinematic" ? 0.32 : 0.56,
  };
}

function buildGeneratedScreenChrome({ frame, board, generation }) {
  if (generation.mode !== "generate-screen") {
    return "";
  }
  const project = cleanString(board.project) || "Canvax";
  const cta =
    cleanString(frame.objective) ||
    cleanString(board.goal) ||
    "Refine this concept";
  const navPool = [cleanString(frame.layout), cleanString(frame.motion), cleanString(frame.assets)]
    .filter(Boolean)
    .flatMap((entry) =>
      entry
        .split(/[,.;]/)
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .slice(0, 3);
  const navItems =
    navPool.length > 0 ? navPool : ["Overview", "Details", "Next step"];
  return `
    <div class="generated-shell generated-shell-${escapeAttribute(generation.direction)}">
      <div class="generated-topbar">
        <span class="generated-brand">${escapeHtml(project)}</span>
        <nav class="generated-nav" aria-label="Generated navigation">
          ${navItems.map((item) => `<span>${escapeHtml(truncateText(item, 24))}</span>`).join("")}
        </nav>
        <button class="generated-cta" type="button">${escapeHtml(truncateText(cta, 22))}</button>
      </div>
      <div class="generated-meta-strip">
        <span>${escapeHtml(buildMaterializeGenerationSummary(generation))}</span>
        <span>${escapeHtml(cleanString(frame.viewportLabel) || "Canvas")}</span>
      </div>
    </div>
  `;
}

function buildMaterializedPreviewDocument(payload, options = {}) {
  const board = payload.board || normalizeMaterializeBoard({});
  const frame = payload.frame || normalizeMaterializeFrame({});
  const generation = normalizeMaterializeGeneration(
    options.generation || payload.generation || board.generation,
  );
  const sketchSrc = cleanString(options.sketchSrc);
  const refinement = normalizeMaterializeRefinement(options.refinement);
  const accent = pickMaterializeAccent(frame.elements);
  const profile = resolveMaterializeGenerationProfile(generation, accent);
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

  const semanticScreenMarkup =
    generation.mode === "generate-screen"
      ? buildGeneratedHeroScreenMarkup({
          frame,
          board,
          generation,
          profile,
          accent,
          attachedLabels,
          freeLabels,
          refinement,
        })
      : "";
  const generationChrome = semanticScreenMarkup
    ? ""
    : buildGeneratedScreenChrome({
        frame,
        board,
        generation,
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
    semanticScreenMarkup ||
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
    <title>${escapeHtml(frame.title)} • ${generation.mode === "generate-screen" ? "Canvax Generated Screen" : "Canvax Materialized"}</title>
    <style>
      :root {
        --accent: ${accent};
        --accent-strong: ${profile.accentStrong};
        --accent-soft: ${profile.accentSoft};
        --accent-border: ${profile.accentBorder};
        --accent-glow: ${profile.accentGlow};
        --ink: ${profile.ink};
        --muted: ${profile.muted};
        --paper: ${profile.paper};
        --paper-strong: ${profile.paperStrong};
        --panel: ${profile.panel};
        --panel-strong: ${profile.panelStrong};
        --shadow: ${profile.shadow};
        --display-font: ${profile.displayFont};
        --body-font: ${profile.bodyFont};
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
        background: ${profile.pageBackground};
        color: var(--ink);
        font-family: var(--body-font);
      }

      body[data-show-blueprint="false"] .blueprint-layer {
        opacity: 0;
        visibility: hidden;
      }

      body[data-show-notes="false"] .note-layer {
        opacity: 0;
        visibility: hidden;
      }

      body[data-semantic-screen="true"] .context-chip,
      body[data-semantic-screen="true"] .refinement-chip,
      body[data-semantic-screen="true"] .stage-grid {
        display: none;
      }

      .preview-wrap {
        position: relative;
        width: min(calc(100vw - 2rem), ${frame.viewportWidth}px);
        height: ${frame.viewportHeight}px;
      }

      .preview-stage {
        position: relative;
        width: ${frame.viewportWidth}px;
        height: ${frame.viewportHeight}px;
        transform-origin: top left;
        overflow: hidden;
        border-radius: clamp(1.4rem, 2vw, 2rem);
        border: 1px solid rgba(106, 75, 55, 0.16);
        background: ${profile.stageBackground};
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
        opacity: ${profile.stageGridOpacity};
      }

      .blueprint-layer {
        object-fit: cover;
        width: 100%;
        height: 100%;
        opacity: 0.12;
        mix-blend-mode: multiply;
        filter: saturate(0.74) contrast(1.08);
        pointer-events: none;
        transition: opacity 180ms ease, visibility 180ms ease;
      }

      .context-chip,
      .refinement-chip,
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

      .refinement-chip {
        top: 1rem;
        right: 1rem;
        max-width: min(34rem, 56%);
        display: grid;
        gap: 0.16rem;
        align-items: start;
        justify-items: start;
      }

      .context-chip strong {
        font-family: var(--display-font);
        font-size: 1rem;
      }

      .context-chip span,
      .refinement-chip span {
        color: var(--muted);
        font-size: 0.84rem;
      }

      .refinement-chip strong {
        font-size: 0.8rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .toolbar {
        right: 1rem;
        bottom: 1rem;
        padding: 0.52rem;
        gap: 0.35rem;
      }

      .toolbar-kicker {
        padding: 0 0.55rem;
        color: var(--muted);
        font-size: 0.68rem;
        letter-spacing: 0.11em;
        text-transform: uppercase;
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

      .toolbar button[aria-pressed="true"] {
        color: #fff;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        box-shadow: 0 0.55rem 1.2rem var(--accent-glow);
      }

      .toolbar button:hover {
        transform: translateY(-1px);
        background: rgba(255, 255, 255, 0.96);
      }

      .toolbar button[aria-pressed="true"]:hover {
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
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
        font-family: var(--display-font);
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
        font-family: var(--body-font);
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

      .image-node {
        margin: 0;
        padding: 0;
        background: rgba(255, 250, 246, 0.92);
      }

      .image-node img,
      .image-node-placeholder {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .image-node-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        color: var(--muted);
        background:
          linear-gradient(135deg, rgba(255, 93, 58, 0.12), transparent),
          rgba(255, 255, 255, 0.72);
      }

      .image-node figcaption {
        position: absolute;
        left: 0.7rem;
        bottom: 0.7rem;
        max-width: calc(100% - 1.4rem);
        padding: 0.28rem 0.55rem;
        border-radius: 999px;
        color: rgba(24, 17, 14, 0.74);
        background: rgba(255, 250, 246, 0.82);
        font-size: 0.72rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
        font-family: var(--display-font);
        font-size: clamp(0.92rem, 1.1vw, 1.3rem);
        line-height: 1;
      }

      body[data-generation-mode="generate-screen"] .role-hero {
        background:
          linear-gradient(160deg, rgba(255,255,255,0.2), transparent 58%),
          linear-gradient(145deg, var(--node-fill), rgba(255,255,255,0.08));
        box-shadow:
          0 1.5rem 3rem rgba(23, 17, 12, 0.18),
          0 0 0 1px rgba(255,255,255,0.16) inset,
          0 0 0 0.2rem var(--node-glow);
      }

      body[data-generation-mode="generate-screen"] .role-panel {
        backdrop-filter: blur(18px);
      }

      body[data-generation-mode="generate-screen"] .role-button,
      body[data-generation-mode="generate-screen"] .role-chip {
        box-shadow:
          0 1rem 1.8rem rgba(23, 17, 12, 0.12),
          0 0 0 1px rgba(255,255,255,0.32) inset;
      }

      body[data-generation-direction="cinematic"] .role-hero {
        background:
          radial-gradient(circle at 70% 30%, rgba(255,255,255,0.28), transparent 18%),
          linear-gradient(145deg, rgba(10,16,31,0.86), rgba(28,40,69,0.7));
      }

      body[data-generation-direction="dashboard"] .role-panel,
      body[data-generation-direction="dashboard"] .role-input {
        background:
          linear-gradient(180deg, rgba(18,28,43,0.94), rgba(20,30,48,0.88));
      }

      body[data-generation-direction="playful"] .material-node {
        border-radius: 1.4rem;
      }

      .generated-shell {
        position: absolute;
        inset: 0;
        z-index: 2;
        pointer-events: none;
      }

      .generated-topbar,
      .generated-meta-strip {
        position: absolute;
        left: 1rem;
        right: 1rem;
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.8rem 1rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(16px);
      }

      .generated-topbar {
        top: 1rem;
      }

      .generated-meta-strip {
        top: 4.5rem;
        justify-content: flex-start;
        font-size: 0.76rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .generated-brand {
        font-family: var(--display-font);
        font-size: 0.92rem;
        letter-spacing: 0.02em;
      }

      .generated-nav {
        display: flex;
        flex: 1 1 auto;
        align-items: center;
        gap: 0.55rem;
        flex-wrap: wrap;
        justify-content: center;
        min-width: 0;
        color: var(--muted);
        font-size: 0.78rem;
      }

      .generated-nav span {
        white-space: nowrap;
      }

      .generated-cta {
        appearance: none;
        border: 0;
        border-radius: 999px;
        padding: 0.62rem 0.92rem;
        font: inherit;
        color: #fff;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        box-shadow: 0 0.7rem 1.4rem rgba(0, 0, 0, 0.12);
      }

      .semantic-hero {
        position: absolute;
        inset: 0;
        display: grid;
        grid-template-rows: auto 1fr;
        padding: clamp(3.4rem, 5vw, 5.2rem);
        background:
          radial-gradient(circle at 74% 24%, rgba(255,255,255,0.32), transparent 13%),
          radial-gradient(circle at 82% 58%, var(--accent-glow), transparent 24%),
          radial-gradient(circle at 18% 26%, rgba(255,255,255,0.12), transparent 18%),
          linear-gradient(135deg, rgba(255,255,255,0.07), transparent 36%),
          var(--paper);
        overflow: hidden;
      }

      .semantic-hero::before,
      .semantic-hero::after {
        content: "";
        position: absolute;
        pointer-events: none;
      }

      .semantic-hero::before {
        inset: 0;
        background-image:
          linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
        background-size: 5rem 5rem;
        mask-image: radial-gradient(circle at 62% 40%, black 0%, transparent 74%);
        opacity: 0.44;
      }

      .semantic-hero::after {
        width: 42rem;
        height: 42rem;
        right: -12rem;
        top: -10rem;
        border-radius: 50%;
        background: radial-gradient(circle, var(--accent-soft), transparent 62%);
        filter: blur(0.2rem);
        opacity: 0.9;
      }

      .semantic-nav,
      .semantic-content,
      .semantic-copy,
      .semantic-preview-card,
      .semantic-proof-row,
      .semantic-actions {
        position: relative;
        z-index: 1;
      }

      .semantic-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.5rem;
        min-height: 4.8rem;
        padding: 0.7rem 0.8rem 0.7rem 1.4rem;
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 999px;
        background: rgba(255,255,255,0.08);
        backdrop-filter: blur(18px);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
      }

      .semantic-brand {
        display: inline-flex;
        align-items: center;
        gap: 0.72rem;
        color: var(--ink);
        font-family: var(--display-font);
        font-size: clamp(1.1rem, 1.55vw, 1.55rem);
        font-weight: 800;
        letter-spacing: -0.03em;
      }

      .semantic-brand-mark {
        width: 2.55rem;
        height: 2.55rem;
        border-radius: 50%;
        background:
          radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), transparent 24%),
          linear-gradient(135deg, var(--accent), var(--accent-strong));
        box-shadow: 0 0.9rem 1.8rem var(--accent-glow);
      }

      .semantic-nav-items {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: clamp(1rem, 2vw, 2rem);
        min-width: 0;
        color: var(--muted);
        font-size: clamp(0.88rem, 1vw, 1rem);
      }

      .semantic-nav-items span {
        white-space: nowrap;
      }

      .semantic-nav-cta,
      .semantic-primary,
      .semantic-secondary {
        appearance: none;
        border: 0;
        border-radius: 999px;
        font: inherit;
        cursor: pointer;
      }

      .semantic-nav-cta {
        min-height: 3.1rem;
        padding: 0 1.25rem;
        color: #fff;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        box-shadow: 0 0.8rem 1.8rem var(--accent-glow);
      }

      .semantic-content {
        display: grid;
        grid-template-columns: minmax(0, 0.92fr) minmax(26rem, 1.08fr);
        align-items: center;
        gap: clamp(3rem, 6vw, 6rem);
        min-height: 0;
        padding-top: clamp(3.4rem, 5vw, 5.2rem);
      }

      .semantic-kicker {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        width: fit-content;
        margin-bottom: 1.3rem;
        padding: 0.46rem 0.78rem;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.14);
        color: var(--muted);
        background: rgba(255,255,255,0.08);
        font-size: 0.82rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .semantic-title {
        max-width: 11ch;
        margin: 0;
        color: var(--ink);
        font-family: var(--display-font);
        font-size: clamp(4rem, 7.4vw, 7.8rem);
        line-height: 0.86;
        letter-spacing: -0.08em;
      }

      .semantic-body {
        max-width: 42rem;
        margin: 1.6rem 0 0;
        color: var(--muted);
        font-size: clamp(1.2rem, 1.55vw, 1.58rem);
        line-height: 1.45;
      }

      .semantic-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-top: 2.2rem;
      }

      .semantic-primary,
      .semantic-secondary {
        min-height: 4.25rem;
        padding: 0 1.55rem;
        font-size: 1.05rem;
      }

      .semantic-primary {
        color: #fff;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        box-shadow: 0 1rem 2rem var(--accent-glow);
      }

      .semantic-secondary {
        color: var(--ink);
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(255,255,255,0.1);
      }

      .semantic-proof-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.8rem;
        margin-top: 2.5rem;
      }

      .semantic-proof {
        display: grid;
        gap: 0.1rem;
        min-width: 10rem;
        padding: 0.78rem 1rem;
        border-radius: 1.2rem;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.08);
      }

      .semantic-proof strong {
        color: var(--ink);
        font-size: 1.08rem;
      }

      .semantic-proof span {
        color: var(--muted);
        font-size: 0.82rem;
      }

      .semantic-preview-wrap {
        position: relative;
        min-height: min(58rem, 70vh);
      }

      .semantic-orb {
        position: absolute;
        inset: 10% 2% auto auto;
        width: 34rem;
        height: 34rem;
        border-radius: 50%;
        background:
          radial-gradient(circle at 38% 32%, rgba(255,255,255,0.88), transparent 9%),
          radial-gradient(circle at 52% 54%, var(--accent-soft), transparent 38%),
          linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04));
        filter: blur(0.01rem);
        box-shadow:
          0 0 8rem var(--accent-glow),
          inset -2rem -2rem 5rem rgba(0,0,0,0.18);
      }

      .semantic-preview-card {
        position: absolute;
        right: 0;
        top: 8%;
        width: min(100%, 39rem);
        min-height: 32rem;
        padding: 1.2rem;
        border-radius: 2rem;
        border: 1px solid rgba(255,255,255,0.16);
        background:
          linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06)),
          rgba(8, 13, 24, 0.52);
        backdrop-filter: blur(22px);
        box-shadow:
          0 2.5rem 6rem rgba(0,0,0,0.28),
          inset 0 1px 0 rgba(255,255,255,0.16);
      }

      .semantic-window-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.55rem 0.62rem 1rem;
        color: var(--muted);
        font-size: 0.85rem;
      }

      .semantic-dots {
        display: inline-flex;
        gap: 0.42rem;
      }

      .semantic-dots span {
        width: 0.72rem;
        height: 0.72rem;
        border-radius: 50%;
        background: rgba(255,255,255,0.34);
      }

      .semantic-preview-body {
        display: grid;
        gap: 1rem;
        padding: 1rem;
        border-radius: 1.45rem;
        background:
          radial-gradient(circle at 78% 12%, var(--accent-soft), transparent 26%),
          rgba(255,255,255,0.08);
      }

      .semantic-preview-hero {
        min-height: 12rem;
        padding: 1.2rem;
        border-radius: 1.25rem;
        background:
          linear-gradient(135deg, rgba(255,255,255,0.18), transparent),
          linear-gradient(145deg, var(--accent), var(--accent-strong));
      }

      .semantic-preview-hero strong {
        display: block;
        max-width: 12ch;
        color: #fff;
        font-family: var(--display-font);
        font-size: 2.2rem;
        line-height: 0.9;
        letter-spacing: -0.06em;
      }

      .semantic-preview-grid {
        display: grid;
        grid-template-columns: 1fr 0.75fr;
        gap: 1rem;
      }

      .semantic-preview-panel {
        min-height: 9rem;
        border-radius: 1.15rem;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.12);
      }

      .semantic-preview-panel.alt {
        display: grid;
        place-items: center;
        padding: 1rem;
      }

      .semantic-meter {
        width: 7.8rem;
        height: 7.8rem;
        border-radius: 50%;
        background: conic-gradient(var(--accent) 0 72%, rgba(255,255,255,0.14) 72% 100%);
        box-shadow: inset 0 0 0 1.1rem rgba(8,13,24,0.82);
      }

      .semantic-edit-note {
        position: absolute;
        left: 0;
        bottom: 6%;
        max-width: 34rem;
        padding: 1rem 1.1rem;
        border-radius: 1.2rem;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.1);
        color: var(--muted);
        backdrop-filter: blur(16px);
        box-shadow: 0 1rem 2.4rem rgba(0,0,0,0.18);
      }

      .semantic-edit-note strong {
        display: block;
        color: var(--ink);
        margin-bottom: 0.25rem;
      }

      .semantic-edit-note small {
        display: block;
        margin-top: 0.45rem;
        color: var(--muted);
        font-size: 0.78rem;
        letter-spacing: 0.02em;
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

        .context-chip {
          max-width: calc(100% - 2rem);
        }

        .refinement-chip {
          top: auto;
          right: auto;
          left: 1rem;
          bottom: 4.8rem;
          max-width: calc(100% - 2rem);
        }
      }
    </style>
  </head>
  <body data-show-blueprint="false" data-show-notes="false" data-generation-mode="${escapeAttribute(generation.mode)}" data-generation-direction="${escapeAttribute(generation.direction)}" data-semantic-screen="${semanticScreenMarkup ? "true" : "false"}">
    <main class="preview-wrap">
      <section class="preview-stage" aria-label="${generation.mode === "generate-screen" ? "Generated" : "Materialized"} ${escapeHtml(frame.title)}">
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
            generation.mode === "generate-screen"
              ? `<span>• ${escapeHtml(buildMaterializeGenerationSummary(generation))}</span>`
              : ""
          }
          ${
            cleanString(board.project)
              ? `<span>• ${escapeHtml(board.project)}</span>`
              : ""
          }
        </div>
        ${
          refinement.summary
            ? `<div class="refinement-chip">
                <strong>Refinement ${refinement.iteration}</strong>
                <span>${escapeHtml(refinement.summary)}</span>
              </div>`
            : ""
        }
        ${generationChrome}
        <div class="component-layer">
          ${contentMarkup}
        </div>
        <div class="note-layer">
          ${noteMarkup}
        </div>
        <div class="toolbar" aria-label="Optional review overlays">
          <span class="toolbar-kicker">Review overlays</span>
          ${
            sketchSrc
              ? '<button type="button" data-action="toggle-blueprint" data-on-label="Hide sketch overlay" data-off-label="Show sketch overlay" aria-pressed="false" title="Optional review overlay: compare the generated output against the original Canvax sketch. This is not product UI.">Show sketch overlay</button>'
              : ""
          }
          ${
            noteMarkup
              ? '<button type="button" data-action="toggle-notes" data-on-label="Hide note overlay" data-off-label="Show note overlay" aria-pressed="false" title="Optional review overlay: show free labels and interpretation notes captured from the sketch. These notes guide Codex but are not product UI.">Show note overlay</button>'
              : ""
          }
        </div>
      </section>
    </main>
    <script>
      const body = document.body;
      const previewWrap = document.querySelector(".preview-wrap");
      const previewStage = document.querySelector(".preview-stage");
      function fitPreviewStage() {
        if (!previewWrap || !previewStage) {
          return;
        }
        const availableWidth = Math.max(320, window.innerWidth - 32);
        const scale = Math.min(1, availableWidth / ${frame.viewportWidth});
        previewWrap.style.width = Math.ceil(${frame.viewportWidth} * scale) + "px";
        previewWrap.style.height = Math.ceil(${frame.viewportHeight} * scale) + "px";
        previewStage.style.transform = "scale(" + scale + ")";
      }
      window.addEventListener("resize", fitPreviewStage);
      fitPreviewStage();
      document.querySelectorAll("[data-interactive='true']").forEach((node) => {
        node.addEventListener("click", () => {
          node.classList.toggle("is-active");
        });
      });
      function syncReviewButton(button, active) {
        if (!button) {
          return;
        }
        button.setAttribute("aria-pressed", String(active));
        button.textContent = active ? button.dataset.onLabel : button.dataset.offLabel;
      }
      const sketchToggle = document.querySelector("[data-action='toggle-blueprint']");
      const noteToggle = document.querySelector("[data-action='toggle-notes']");
      syncReviewButton(sketchToggle, body.dataset.showBlueprint === "true");
      syncReviewButton(noteToggle, body.dataset.showNotes === "true");
      sketchToggle?.addEventListener("click", () => {
        const active = body.dataset.showBlueprint !== "true";
        body.dataset.showBlueprint = String(active);
        syncReviewButton(sketchToggle, active);
      });
      noteToggle?.addEventListener("click", () => {
        const active = body.dataset.showNotes !== "true";
        body.dataset.showNotes = String(active);
        syncReviewButton(noteToggle, active);
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

  if (element.type === "image") {
    const imageSrc = cleanString(element.imageDataUrl);
    const caption = cleanString(element.sourceName) || "Image asset";
    return `<figure
      class="material-node image-node"
      data-interactive="true"
      style="${buildBoundsStyle(bounds, element.color)}"
    >
      ${
        imageSrc.startsWith("data:image/")
          ? `<img src="${escapeAttribute(imageSrc)}" alt="${escapeAttribute(caption)}" />`
          : `<div class="image-node-placeholder">${escapeHtml(caption)}</div>`
      }
      <figcaption>${escapeHtml(caption)}</figcaption>
    </figure>`;
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

function buildGeneratedHeroScreenMarkup({
  frame,
  board,
  generation,
  attachedLabels,
  freeLabels,
  refinement,
}) {
  const visibleElements = frame.elements.filter(
    (element) => element.composite !== "destination-out",
  );
  const boundedElements = visibleElements
    .filter(
      (element) =>
        element.type !== "label" &&
        element.bounds &&
        elementArea(element) > 36,
    )
    .sort((left, right) => elementArea(right) - elementArea(left));
  const rects = boundedElements.filter((element) => element.type === "rect");
  const arrows = boundedElements.filter((element) => element.type === "arrow");
  const images = boundedElements.filter((element) => element.type === "image");
  const ovals = boundedElements.filter((element) => element.type === "ellipse");

  const viewportWidth = Number(frame.viewportWidth) || 1440;
  const viewportHeight = Number(frame.viewportHeight) || 1024;
  const allLabelTexts = frame.elements
    .filter((element) => element.type === "label")
    .map((element) => cleanString(element.text))
    .filter(Boolean);
  const labelTextsForElement = (element) =>
    (attachedLabels.get(element.id) || [])
      .map((labelEntry) => cleanString(labelEntry.text))
      .filter(Boolean);
  const hasSemanticSource = Boolean(
    boundedElements.length ||
      allLabelTexts.length ||
      cleanString(frame.objective) ||
      cleanString(frame.layout) ||
      cleanString(frame.motion) ||
      cleanString(board.goal),
  );
  if (!hasSemanticSource) {
    return "";
  }
  const topNav = rects.find((element) => {
    const bounds = element.bounds || {};
    return (
      bounds.top < viewportHeight * 0.24 &&
      bounds.width > viewportWidth * 0.45 &&
      bounds.height <= viewportHeight * 0.14
    );
  });
  const copyPanel =
    rects.find((element) => {
      const labels = labelTextsForElement(element).join(" ");
      const bounds = element.bounds || {};
      return (
        element.id !== topNav?.id &&
        bounds.left < viewportWidth * 0.55 &&
        bounds.width > viewportWidth * 0.22 &&
        bounds.height > viewportHeight * 0.2 &&
        labels.length > 14 &&
        !/\b(preview|generated app|dashboard|chart|graph|surface)\b/i.test(labels)
      );
    }) ||
    rects.find((element) => {
      const bounds = element.bounds || {};
      return (
        element.id !== topNav?.id &&
        bounds.left < viewportWidth * 0.45 &&
        bounds.height > viewportHeight * 0.18
      );
    }) ||
    boundedElements.find((element) => {
      const bounds = element.bounds || {};
      return (
        element.id !== topNav?.id &&
        !["arrow", "line"].includes(element.type) &&
        bounds.left < viewportWidth * 0.58
      );
    });
  const visualPanel =
    rects.find((element) => {
      const bounds = element.bounds || {};
      return (
        element.id !== topNav?.id &&
        element.id !== copyPanel?.id &&
        bounds.left > viewportWidth * 0.42 &&
        bounds.width > viewportWidth * 0.22 &&
        bounds.height > viewportHeight * 0.18
      );
    }) ||
    images[0] ||
    ovals.find((element) => {
      const bounds = element.bounds || {};
      return bounds.left > viewportWidth * 0.35;
    }) ||
    boundedElements.find((element) => {
      const bounds = element.bounds || {};
      return (
        element.id !== topNav?.id &&
        element.id !== copyPanel?.id &&
        bounds.left > viewportWidth * 0.35
      );
    }) ||
    rects.find(
      (element) => element.id !== topNav?.id && element.id !== copyPanel?.id,
    );
  const buttons = rects
    .filter((element) => {
      const bounds = element.bounds || {};
      const labels = labelTextsForElement(element).join(" ").toLowerCase();
      return (
        element.id !== topNav?.id &&
        element.id !== copyPanel?.id &&
        element.id !== visualPanel?.id &&
        (/\b(cta|start|preview|demo|join|get|see|try|launch)\b/.test(labels) ||
          (bounds.height <= viewportHeight * 0.11 &&
            bounds.width <= viewportWidth * 0.26))
      );
    })
    .sort((left, right) => (left.bounds?.left || 0) - (right.bounds?.left || 0));
  const proof =
    rects.find((element) => {
      const labels = labelTextsForElement(element).join(" ").toLowerCase();
      return /\b(proof|stat|loop|metric|pass|saved|users)\b/.test(labels);
    }) ||
    boundedElements.find(
      (element) =>
        element.id !== topNav?.id &&
        element.id !== copyPanel?.id &&
        element.id !== visualPanel?.id,
    ) ||
    buttons[2];

  const navLabels = labelTextsForElement(topNav || {});
  const copyLabels = labelTextsForElement(copyPanel || {});
  const visualLabels = labelTextsForElement(visualPanel || {});
  const proofLabels = labelTextsForElement(proof || {});
  const buttonLabels = buttons
    .map((button) => labelTextsForElement(button)[0])
    .filter(Boolean);
  const brand =
    navLabels.find((text) => text.length <= 28 && !/\s{2,}|  /.test(text)) ||
    cleanString(board.project) ||
    "Canvax";
  const navItems = parseGeneratedNavItems(navLabels, brand);
  const headlineCandidates = [...copyLabels, ...allLabelTexts].filter(
    isGeneratedHeroHeadlineCandidate,
  );
  const headline =
    headlineCandidates[0] ||
    cleanString(frame.objective) ||
    cleanString(board.goal) ||
    "Sketch it. Ship it.";
  const body =
    copyLabels.find((text) => text !== headline && text.length >= 34) ||
    cleanString(board.goal) ||
    cleanString(frame.layout) ||
    "Turn rough canvas direction into a production-ready surface.";
  const primaryCta = buttonLabels[0] || "Start from sketch";
  const secondaryCta = buttonLabels[1] || "Open live preview";
  const previewTitle =
    visualLabels.find((text) => text.length >= 8) || "Generated app preview";
  const previewDetail =
    cleanString(frame.motion) ||
    cleanString(frame.assets) ||
    "Generated surface follows the latest sketch and notes.";
  const proofTitle = proofLabels[0] || "2-pass edit loop";
  const sourceSummary = summarizeGeneratedSketchSource({
    boundedElements,
    arrows,
    images,
    ovals,
    freeLabels,
  });
  const editNote =
    freeLabels
      .map((labelEntry) => cleanString(labelEntry.text))
      .find((text) => /\b(pen|move|shift|edit|lift|resize|closer)\b/i.test(text)) ||
    (arrows.length
      ? "Directional marks were treated as layout and interaction guidance."
      : "") ||
    cleanString(refinement.summary) ||
    "Sketch edits can move layout intent into the generated surface.";
  const proofItems = [
    [proofTitle, "Sketch-to-preview"],
    [
      `${Math.max(
        1,
        refinement.counts?.regionCount || boundedElements.length || 1,
      )} regions`,
      "Read from sketch",
    ],
    [
      generation.focus === "conversion" ? "CTA-ready" : "Live",
      "Generated surface",
    ],
  ];

  return `
    <section class="semantic-hero" aria-label="${escapeHtml(frame.title || "Generated hero")}">
      <header class="semantic-nav">
        <div class="semantic-brand">
          <span class="semantic-brand-mark" aria-hidden="true"></span>
          <span>${escapeHtml(truncateText(brand, 30))}</span>
        </div>
        <nav class="semantic-nav-items" aria-label="Generated page navigation">
          ${navItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </nav>
        <button class="semantic-nav-cta" type="button">${escapeHtml(truncateText(primaryCta, 24))}</button>
      </header>

      <div class="semantic-content">
        <div class="semantic-copy">
          <span class="semantic-kicker">${escapeHtml(buildMaterializeGenerationSummary(generation))}</span>
          <h1 class="semantic-title">${escapeHtml(truncateText(headline, 72))}</h1>
          <p class="semantic-body">${escapeHtml(truncateText(body, 190))}</p>
          <div class="semantic-actions">
            <button class="semantic-primary" type="button">${escapeHtml(truncateText(primaryCta, 28))}</button>
            <button class="semantic-secondary" type="button">${escapeHtml(truncateText(secondaryCta, 28))}</button>
          </div>
          <div class="semantic-proof-row">
            ${proofItems
              .map(
                ([value, label]) => `
                  <div class="semantic-proof">
                    <strong>${escapeHtml(truncateText(value, 22))}</strong>
                    <span>${escapeHtml(label)}</span>
                  </div>
                `,
              )
              .join("")}
          </div>
        </div>

        <div class="semantic-preview-wrap">
          <div class="semantic-orb" aria-hidden="true"></div>
          <article class="semantic-preview-card">
            <div class="semantic-window-bar">
              <span class="semantic-dots" aria-hidden="true"><span></span><span></span><span></span></span>
              <span>${escapeHtml(truncateText(previewTitle, 34))}</span>
            </div>
            <div class="semantic-preview-body">
              <div class="semantic-preview-hero">
                <strong>${escapeHtml(truncateText(previewTitle, 46))}</strong>
              </div>
              <div class="semantic-preview-grid">
                <div class="semantic-preview-panel"></div>
                <div class="semantic-preview-panel alt">
                  <div class="semantic-meter" aria-hidden="true"></div>
                </div>
              </div>
            </div>
          </article>
          <aside class="semantic-edit-note">
            <strong>${escapeHtml(refinement.changed ? `Refinement ${refinement.iteration}` : "Live edit")}</strong>
            <span>${escapeHtml(truncateText(editNote || previewDetail, 150))}</span>
            <small>${escapeHtml(sourceSummary)}</small>
          </aside>
        </div>
      </div>
    </section>
  `;
}

function summarizeGeneratedSketchSource({
  boundedElements,
  arrows,
  images,
  ovals,
  freeLabels,
}) {
  const parts = [];
  const shapeCount = Math.max(0, boundedElements.length - arrows.length);
  if (shapeCount) {
    parts.push(`${shapeCount} shape${shapeCount === 1 ? "" : "s"}`);
  }
  if (arrows.length) {
    parts.push(
      `${arrows.length} direction mark${arrows.length === 1 ? "" : "s"}`,
    );
  }
  if (images.length) {
    parts.push(`${images.length} image slot${images.length === 1 ? "" : "s"}`);
  }
  if (ovals.length) {
    parts.push(`${ovals.length} oval cue${ovals.length === 1 ? "" : "s"}`);
  }
  if (freeLabels.length) {
    parts.push(
      `${freeLabels.length} note${freeLabels.length === 1 ? "" : "s"}`,
    );
  }
  return parts.length
    ? `Generated from ${parts.join(", ")}.`
    : "Generated from frame intent and board notes.";
}

function parseGeneratedNavItems(navLabels, brand) {
  const ignored = new Set([cleanString(brand).toLowerCase()]);
  const source = navLabels
    .filter((text) => !ignored.has(text.toLowerCase()))
    .join(" ");
  const items = source
    .split(/\s{2,}|[|,/•]+/)
    .flatMap((entry) => {
      const trimmed = entry.trim();
      if (!trimmed) {
        return [];
      }
      const words = trimmed.split(/\s+/).filter(Boolean);
      if (words.length > 1 && words.length <= 5 && trimmed.length <= 36) {
        return [trimmed];
      }
      if (words.length > 5) {
        return words.slice(0, 4);
      }
      return words;
    })
    .map((item) => truncateText(item, 18))
    .filter(Boolean);
  const uniqueItems = uniqueStrings(items).slice(0, 4);
  return uniqueItems.length ? uniqueItems : ["Workflows", "Preview", "Export"];
}

function isGeneratedHeroHeadlineCandidate(value) {
  const text = cleanString(value);
  if (text.length < 18 || text.length > 96) {
    return false;
  }
  return !/\b(workflows|preview export|generated app preview|live compare|2-pass|start from|see preview|canvax studio|cta-ready)\b/i.test(
    text,
  );
}

function uniqueStrings(values) {
  const seen = new Set();
  const next = [];
  values.forEach((value) => {
    const clean = cleanString(value);
    const key = clean.toLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      next.push(clean);
    }
  });
  return next;
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

async function writeTextFileAtomic(filePath, body) {
  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random()
    .toString(36)
    .slice(2, 8)}.tmp`;
  try {
    await writeFile(temporaryPath, body, "utf8");
    await rename(temporaryPath, filePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
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

function readExternalOpenTarget(inputArgs) {
  if (inputArgs.includes("--chrome") || inputArgs.includes("--open-chrome")) {
    return "chrome";
  }
  if (
    inputArgs.includes("--open") ||
    inputArgs.includes("--open-external") ||
    inputArgs.includes("--open-default")
  ) {
    return "default";
  }
  return null;
}

function readArgValue(inputArgs, names) {
  const candidates = Array.isArray(names) ? names : [names];
  for (const name of candidates) {
    const index = inputArgs.findIndex((arg) => arg === name);
    if (index !== -1 && inputArgs[index + 1]) {
      if (inputArgs[index + 1].startsWith("--")) {
        continue;
      }
      return inputArgs[index + 1];
    }
  }
  return "";
}

function readTranscriptText(inputArgs) {
  return cleanString(
    readArgValue(inputArgs, ["--text", "--transcript", "--codex-transcript", "--note"]),
  );
}

function readTranscriptScope(inputArgs) {
  const scope = cleanString(readArgValue(inputArgs, "--scope")).toLowerCase();
  return scope === "session" || scope === "board" ? "session" : "frame";
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

function hashString(input) {
  let hash = 2166136261;
  const value = String(input || "");
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
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
    transport: normalizeTransportDescriptor(value.transport),
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

function enhanceCheckpointHistory(value) {
  if (!value || typeof value !== "object") {
    return { updatedAt: "", items: [] };
  }
  return {
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
    project: normalizeManifestProject(value.project),
    source: cleanString(value.source),
    items: Array.isArray(value.items)
      ? value.items.map((item) => enhanceCheckpointRecord(item)).filter(Boolean)
      : [],
  };
}

function enhanceCheckpointRecord(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const checkpointPath = cleanString(value.checkpointPath);
  const jsonPath = cleanString(value.jsonPath);
  const markdownPath = cleanString(value.markdownPath);
  const voiceMarkdownPath = cleanString(value.voiceMarkdownPath);
  return {
    ...value,
    checkpointUrl: checkpointPath
      ? workspaceUrlForPath(checkpointPath, value.savedAt)
      : "",
    jsonUrl: jsonPath ? workspaceUrlForPath(jsonPath, value.savedAt) : "",
    markdownUrl: markdownPath
      ? workspaceUrlForPath(markdownPath, value.savedAt)
      : "",
    voiceMarkdownUrl: voiceMarkdownPath
      ? workspaceUrlForPath(voiceMarkdownPath, value.savedAt)
      : "",
  };
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

function normalizeCheckpointPayload(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : null;
  if (!source) {
    return null;
  }

  return {
    schemaVersion: Number(source.schemaVersion) || HANDOFF_SCHEMA_VERSION,
    storageVersion: Number(source.storageVersion) || 0,
    savedAt: cleanString(source.savedAt) || new Date().toISOString(),
    transport: normalizeTransportDescriptor(source.transport),
    reason: cleanString(source.reason) || "manual-push",
    label: cleanString(source.label) || "Checkpoint",
    note: cleanString(source.note),
    workspaceMode: cleanString(source.workspaceMode),
    frameId:
      cleanString(source.frameId) || cleanString(source.activeFrameId) || "",
    frameTitle:
      cleanString(source.frameTitle) ||
      cleanString(source.activeFrameTitle) ||
      "",
    board:
      source.board &&
      typeof source.board === "object" &&
      !Array.isArray(source.board)
        ? source.board
        : {},
    project:
      source.project &&
      typeof source.project === "object" &&
      !Array.isArray(source.project)
        ? source.project
        : null,
    activeFrameId: cleanString(source.activeFrameId),
    activeFrameTitle: cleanString(source.activeFrameTitle),
    entryFrameId: cleanString(source.entryFrameId),
    connections: Array.isArray(source.connections) ? source.connections : [],
    frames: Array.isArray(source.frames) ? source.frames : [],
    voice:
      source.voice &&
      typeof source.voice === "object" &&
      !Array.isArray(source.voice)
        ? source.voice
        : null,
    summary:
      source.summary &&
      typeof source.summary === "object" &&
      !Array.isArray(source.summary)
        ? source.summary
        : {},
    export:
      source.export &&
      typeof source.export === "object" &&
      !Array.isArray(source.export)
        ? source.export
        : {},
    previewTarget:
      source.previewTarget &&
      typeof source.previewTarget === "object" &&
      !Array.isArray(source.previewTarget)
        ? source.previewTarget
        : null,
    outputDigest:
      source.outputDigest &&
      typeof source.outputDigest === "object" &&
      !Array.isArray(source.outputDigest)
        ? source.outputDigest
        : null,
    artifacts: Array.isArray(source.artifacts) ? source.artifacts : [],
    changes: Array.isArray(source.changes) ? source.changes : [],
    prompt: cleanString(source.prompt),
  };
}

async function readRecentSessionEvents(filePath, limit = 48) {
  const raw = await readOptionalText(filePath);
  if (!raw.trim()) {
    return [];
  }

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-limit)
    .reverse()
    .map((line) => {
      try {
        return normalizeSessionEvent(JSON.parse(line));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function normalizeSessionEvent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return {
    type: cleanString(value.type),
    id: cleanString(value.id),
    at: cleanString(value.at),
    reason: cleanString(value.reason),
    label: cleanString(value.label),
    note: cleanString(value.note),
    frameId: cleanString(value.frameId),
    frameTitle: cleanString(value.frameTitle),
    summary:
      value.summary &&
      typeof value.summary === "object" &&
      !Array.isArray(value.summary)
        ? value.summary
        : null,
    export:
      value.export &&
      typeof value.export === "object" &&
      !Array.isArray(value.export)
        ? value.export
        : null,
    previewTarget:
      value.previewTarget &&
      typeof value.previewTarget === "object" &&
      !Array.isArray(value.previewTarget)
        ? value.previewTarget
        : null,
    outputDigest:
      value.outputDigest &&
      typeof value.outputDigest === "object" &&
      !Array.isArray(value.outputDigest)
        ? value.outputDigest
        : null,
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

function toWorkspaceRelativePath(filePath) {
  return relative(projectRoot, resolve(filePath)).split("\\").join("/");
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
  const codexEditorUrl = buildCodexEditorUrl(url);
  return {
    pid: process.pid,
    port,
    url,
    codexEditorUrl,
    codexSidecarUrl: codexEditorUrl,
    projectRoot,
    runtimePath,
    serverLogPath,
    exportRoot: exportsRoot,
    liveJsonPath,
    liveMarkdownPath,
    liveVoiceMarkdownPath,
    rewriteRequestJsonPath,
    rewriteRequestMarkdownPath,
    transcriptBridgePath,
    transcriptBridgeMarkdownPath,
    buildRealRequestJsonPath,
    buildRealRequestMarkdownPath,
    buildRequestsRoot,
    assetCandidatesJsonPath,
    assetCandidatesMarkdownPath,
    imageGenerationBriefJsonPath,
    imageGenerationBriefMarkdownPath,
    imageHostTaskJsonPath,
    imageHostTaskMarkdownPath,
    imageResultsJsonPath,
    imageResultsMarkdownPath,
    assetCandidatesRoot,
    latestCheckpointPath,
    checkpointsIndexPath,
    sessionEventsPath,
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

async function getRunningRuntime(options = {}) {
  const { verifyHttp = true } = options;
  const runtime = await readRuntime();
  if (!runtime?.pid) {
    return null;
  }

  if (runtime.projectRoot && runtime.projectRoot !== projectRoot) {
    await clearRuntimeIfOwned(runtime.pid);
    return null;
  }

  if (!isProcessAlive(runtime.pid)) {
    await clearRuntimeIfOwned(runtime.pid);
    return null;
  }

  if (verifyHttp) {
    const status = await readRuntimeStatus(runtime);
    const modernStatusMatchesRuntime =
      status &&
      status.pid === runtime.pid &&
      status.runtimePath === runtimePath &&
      status.projectRoot === projectRoot;
    const legacyStatusMatchesRuntime =
      status &&
      !("pid" in status) &&
      status.runtimePath === runtimePath &&
      status.url === runtime.url &&
      status.exportRoot === exportsRoot;
    if (!modernStatusMatchesRuntime && !legacyStatusMatchesRuntime) {
      await clearRuntimeIfOwned(runtime.pid);
      return null;
    }
  }

  return runtime;
}

async function inspectPortForRuntime(port) {
  const url = `http://localhost:${port}`;
  const status = await readRuntimeStatus({ url }, 700);
  if (status?.pid && status.projectRoot === projectRoot) {
    return {
      available: false,
      occupied: false,
      occupant: "canvax",
      runtime: buildRecoveredRuntime(status, port),
    };
  }

  if (await canBindPort(port)) {
    return {
      available: true,
      occupied: false,
      occupant: "",
      runtime: null,
    };
  }

  return {
    available: false,
    occupied: true,
    occupant: status?.projectRoot ? "other-canvax-workspace" : "unknown",
    runtime: null,
  };
}

function buildRecoveredRuntime(status, port) {
  const url = status.url || `http://localhost:${port}`;
  const codexEditorUrl =
    status.codexEditorUrl || status.codexSidecarUrl || buildCodexEditorUrl(url);
  return {
    ...buildRuntime(port),
    pid: status.pid,
    port,
    url,
    codexEditorUrl,
    codexSidecarUrl: codexEditorUrl,
    projectRoot: status.projectRoot || projectRoot,
    runtimePath: status.runtimePath || runtimePath,
    serverLogPath: status.serverLogPath || serverLogPath,
    exportRoot: status.exportRoot || exportsRoot,
    liveJsonPath: status.liveJsonPath || liveJsonPath,
    liveMarkdownPath: status.liveMarkdownPath || liveMarkdownPath,
    liveVoiceMarkdownPath: status.liveVoiceMarkdownPath || liveVoiceMarkdownPath,
    rewriteRequestJsonPath:
      status.rewriteRequestJsonPath || rewriteRequestJsonPath,
    rewriteRequestMarkdownPath:
      status.rewriteRequestMarkdownPath || rewriteRequestMarkdownPath,
    transcriptBridgePath: status.transcriptBridgePath || transcriptBridgePath,
    transcriptBridgeMarkdownPath:
      status.transcriptBridgeMarkdownPath || transcriptBridgeMarkdownPath,
    buildRealRequestJsonPath:
      status.buildRealRequestJsonPath || buildRealRequestJsonPath,
    buildRealRequestMarkdownPath:
      status.buildRealRequestMarkdownPath || buildRealRequestMarkdownPath,
    buildRequestsRoot: status.buildRequestsRoot || buildRequestsRoot,
    assetCandidatesJsonPath:
      status.assetCandidatesJsonPath || assetCandidatesJsonPath,
    assetCandidatesMarkdownPath:
      status.assetCandidatesMarkdownPath || assetCandidatesMarkdownPath,
    imageGenerationBriefJsonPath:
      status.imageGenerationBriefJsonPath || imageGenerationBriefJsonPath,
    imageGenerationBriefMarkdownPath:
      status.imageGenerationBriefMarkdownPath ||
      imageGenerationBriefMarkdownPath,
    imageHostTaskJsonPath:
      status.imageHostTaskJsonPath || imageHostTaskJsonPath,
    imageHostTaskMarkdownPath:
      status.imageHostTaskMarkdownPath || imageHostTaskMarkdownPath,
    imageResultsJsonPath: status.imageResultsJsonPath || imageResultsJsonPath,
    imageResultsMarkdownPath:
      status.imageResultsMarkdownPath || imageResultsMarkdownPath,
    assetCandidatesRoot: status.assetCandidatesRoot || assetCandidatesRoot,
    latestCheckpointPath: status.latestCheckpointPath || latestCheckpointPath,
    checkpointsIndexPath: status.checkpointsIndexPath || checkpointsIndexPath,
    sessionEventsPath: status.sessionEventsPath || sessionEventsPath,
    previewManifestPath: status.previewManifestPath || previewManifestPath,
    codexOutputManifestPath:
      status.codexOutputManifestPath || codexOutputManifestPath,
    previewSnapshotsIndexPath:
      status.previewSnapshotsIndexPath || previewSnapshotsIndexPath,
    startedAt: status.startedAt || "",
    recoveredFromPort: true,
  };
}

async function readRuntimeStatus(runtime, timeoutMs = 900) {
  if (!runtime?.url) {
    return null;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${runtime.url}/api/status`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function canBindPort(port) {
  return new Promise((resolvePromise) => {
    const server = createServer();
    server.once("error", () => {
      resolvePromise(false);
    });
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolvePromise(true));
    });
  });
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

function openUrl(url, target = "default") {
  const openArgs = target === "chrome" ? ["-a", "Google Chrome", url] : [url];
  spawn("open", openArgs, {
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

async function runCommand(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0 || options.allowFailure) {
        resolvePromise({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          stderr.trim() ||
            `${command} ${args.join(" ")} exited with code ${code}.`,
        ),
      );
    });
  });
}

function printCliOutput(asJson, payload, message) {
  const outputPayload =
    payload?.url && !payload.codexEditorUrl
      ? {
          ...payload,
          codexEditorUrl: buildCodexEditorUrl(payload.url),
          codexSidecarUrl: buildCodexEditorUrl(payload.url),
        }
      : payload;
  if (asJson) {
    console.log(JSON.stringify(outputPayload, null, 2));
    return;
  }

  console.log(message);
  if (outputPayload.url) {
    const codexEditorUrl =
      outputPayload.codexEditorUrl || buildCodexEditorUrl(outputPayload.url);
    console.log(`Board URL: ${outputPayload.url}`);
    console.log(`Codex right-side editor URL: ${codexEditorUrl}`);
    console.log(
      `Preferred Codex path: invoke /canvax so Codex targets ${codexEditorUrl} in the right-side in-app browser.`,
    );
    console.log(
      "External browser fallback: ./canvax --open-external or ./canvax --chrome.",
    );
  }
  if (outputPayload.openedExternalBrowser) {
    const browserLabel =
      outputPayload.externalBrowser === "chrome"
        ? "Google Chrome"
        : "default system browser";
    console.log(
      `Opened through ${browserLabel} because an external-open flag was explicitly provided.`,
    );
  }
  console.log(`Live export: ${liveJsonPath}`);
  console.log(`Live markdown: ${liveMarkdownPath}`);
  console.log(`Live voice markdown: ${liveVoiceMarkdownPath}`);
  console.log(`Rewrite request: ${rewriteRequestJsonPath}`);
  console.log(`Codex transcript bridge: ${transcriptBridgePath}`);
  console.log(`Latest checkpoint: ${latestCheckpointPath}`);
  console.log(`Codex output manifest: ${codexOutputManifestPath}`);
}

function printCliError(asJson, payload, message) {
  if (asJson) {
    console.log(
      JSON.stringify(
        {
          ...payload,
          error: message,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.error(message);
}

function printHelp() {
  console.log(`Canvax

Usage:
  ./canvax
  ./canvax --status [--json]
  ./canvax --stop
  ./canvax --restart [--port 3210]
  ./canvax --open-external
  ./canvax --chrome
  ./canvax --transcript "spoken Codex text" [--scope frame|session] [--frame frame-id]

Behavior:
  - Running without arguments ensures exactly one Canvax service is active.
  - Preferred Codex Desktop flow: invoke /canvax so Codex targets http://localhost:3210/?host=codex-sidecar in the right-side in-app browser.
  - --open-external and --open use the system default browser.
  - --chrome opens Google Chrome explicitly.
  - --transcript queues Codex chat dictation text into Canvax voice context.
  - Use --frame/--frame-id, --frame-title, --source, --provider, or --at when a host bridge needs explicit transcript metadata.
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
  const notes = normalizeManifestNotes(manual.notes, codex.notes);
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

function buildPreviewOutputDigest(manifest, workspaceFollowMeta = null) {
  const normalized = normalizePreviewManifest(manifest || {});
  const targets = normalizePreviewTargets(normalized.targets || []);
  const artifacts = normalizePreviewArtifacts(normalized.artifacts || []);
  const changes = normalizePreviewChanges(normalized.changes || []);
  const primaryTarget =
    targets.find((target) => target.id === "primary") || targets[0] || null;
  const refinementSummary =
    cleanString(primaryTarget?.refinement?.summary) ||
    cleanString(
      artifacts.find((artifact) => cleanString(artifact.changeSummary))
        ?.changeSummary,
    );
  const targetLabel = cleanString(primaryTarget?.label);
  const frameTitle = cleanString(workspaceFollowMeta?.frameTitle);
  const digestSource = JSON.stringify({
    targets: targets.map((target) => ({
      id: cleanString(target.id),
      url: cleanString(target.url),
      previewPath: cleanString(target.previewPath),
      versionTag: cleanString(target.versionTag),
      generatedAt: cleanString(target.generatedAt),
      sourceFrameId: cleanString(target.sourceFrameId),
      sourceFrameUpdatedAt: cleanString(target.sourceFrameUpdatedAt),
      changeSummary: cleanString(target.changeSummary),
      refinement: target.refinement
        ? {
            iteration: Number(target.refinement.iteration) || 0,
            summary: cleanString(target.refinement.summary),
            counts: target.refinement.counts || {},
            regionCount: Array.isArray(target.refinement.changedRegions)
              ? target.refinement.changedRegions.length
              : 0,
          }
        : null,
    })),
    artifacts: artifacts.map((artifact) => ({
      id: cleanString(artifact.id),
      path: cleanString(artifact.path),
      kind: cleanString(artifact.kind),
      versionTag: cleanString(artifact.versionTag),
      generatedAt: cleanString(artifact.generatedAt),
      changeSummary: cleanString(artifact.changeSummary),
      frameIds: normalizeStringArray(artifact.frameIds),
    })),
    changes: changes.map((change) => ({
      id: cleanString(change.id),
      path: cleanString(change.path),
      kind: cleanString(change.kind),
      summary: cleanString(change.summary),
      frameIds: normalizeStringArray(change.frameIds),
    })),
    workspaceFollow: workspaceFollowMeta
      ? {
          enabled: workspaceFollowMeta.enabled !== false,
          clean: Boolean(workspaceFollowMeta.clean),
          changeCount: Number(workspaceFollowMeta.changeCount) || 0,
          frameId: cleanString(workspaceFollowMeta.frameId),
          frameTitle,
          error: cleanString(workspaceFollowMeta.error),
        }
      : null,
  });
  return {
    digest: `output-${hashString(digestSource)}`,
    mode: primaryTarget
      ? "target-connected"
      : changes.length || artifacts.length
        ? "context-only"
        : workspaceFollowMeta?.clean
          ? "workspace-clean"
          : "idle",
    summary: buildPreviewOutputSummary({
      targetLabel,
      refinementSummary,
      artifactCount: artifacts.length,
      changeCount: changes.length,
      targetCount: targets.length,
      frameTitle,
      workspaceFollowMeta,
    }),
    targetLabel,
    targetType: cleanString(primaryTarget?.type),
    targetCount: targets.length,
    artifactCount: artifacts.length,
    changeCount: changes.length,
    refinementSummary,
    frameTitle,
    clean: Boolean(workspaceFollowMeta?.clean),
  };
}

function buildPreviewOutputSummary({
  targetLabel = "",
  refinementSummary = "",
  artifactCount = 0,
  changeCount = 0,
  targetCount = 0,
  frameTitle = "",
  workspaceFollowMeta = null,
} = {}) {
  const artifactText = `${artifactCount} artifact${artifactCount === 1 ? "" : "s"}`;
  const changeText = `${changeCount} changed file${changeCount === 1 ? "" : "s"}`;

  if (targetLabel) {
    const intro = refinementSummary
      ? `${refinementSummary} ${targetLabel} is active.`
      : `${targetLabel} is active.`;
    return `${intro} ${artifactText} and ${changeText} are attached.`;
  }

  if (artifactCount || changeCount || targetCount) {
    const scope = frameTitle ? ` for ${frameTitle}` : "";
    return `Output context now tracks ${artifactText} and ${changeText}${scope}.`;
  }

  if (workspaceFollowMeta?.enabled !== false && workspaceFollowMeta?.clean) {
    const scope = frameTitle ? ` for ${frameTitle}` : "";
    return `Workspace is clean${scope}, and no connected implementation target is attached yet.`;
  }

  return "No connected implementation output is attached yet.";
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
    notes: normalizeManifestNotes(payload.notes, baseManifest.notes),
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

function buildAutoPublishedCodexManifest(
  existingManifest,
  { frameId = "", frameTitle = "", project = null, changeEntries = [] } = {},
) {
  const baseManifest = normalizePreviewManifest(existingManifest || {});
  const targetLabel = frameTitle || "the current board";
  const autoNote = changeEntries.length
    ? `Auto-published ${changeEntries.length} workspace change${changeEntries.length === 1 ? "" : "s"} for ${targetLabel}.`
    : `Auto-published a clean workspace state for ${targetLabel}.`;
  const notes = normalizeManifestNotes(baseManifest.notes, autoNote);

  return normalizePreviewManifest({
    ...baseManifest,
    updatedAt: new Date().toISOString(),
    source: "codex-auto-publish",
    project: project || baseManifest.project,
    notes,
    changes: changeEntries,
    targets: baseManifest.targets,
    artifacts: baseManifest.artifacts,
  });
}

async function buildLiveWorkspaceFollowState({
  liveExport,
  codexOutputManifest,
} = {}) {
  const project = liveExportProject(liveExport);
  const activeFrameId =
    cleanString(liveExport?.activeFrameId) ||
    cleanString(liveExport?.entryFrameId);
  const activeFrame = Array.isArray(liveExport?.frames)
    ? liveExport.frames.find(
        (frame) => cleanString(frame?.id) === activeFrameId,
      )
    : null;
  const frameTitle = cleanString(activeFrame?.title);
  const manifestSignature = JSON.stringify({
    updatedAt: cleanString(codexOutputManifest?.updatedAt),
    targetCount: Array.isArray(codexOutputManifest?.targets)
      ? codexOutputManifest.targets.length
      : 0,
    artifactCount: Array.isArray(codexOutputManifest?.artifacts)
      ? codexOutputManifest.artifacts.length
      : 0,
    changeCount: Array.isArray(codexOutputManifest?.changes)
      ? codexOutputManifest.changes.length
      : 0,
  });
  const cacheKey = `${project?.id || "global"}::${activeFrameId}::${frameTitle}::${manifestSignature}`;
  if (
    workspaceFollowCache &&
    workspaceFollowCache.key === cacheKey &&
    Date.now() - workspaceFollowCache.at < WORKSPACE_FOLLOW_TTL_MS
  ) {
    return workspaceFollowCache.value;
  }

  const fallbackManifest = hasManifestContent(
    normalizePreviewManifest(codexOutputManifest || {}),
  )
    ? normalizePreviewManifest(codexOutputManifest || {})
    : null;

  try {
    const changeEntries = await collectWorkspaceChangeEntries({
      frameId: activeFrameId,
      frameTitle,
    });
    const liveCodexManifest = buildLiveWorkspaceFollowManifest(
      codexOutputManifest,
      {
        frameId: activeFrameId,
        frameTitle,
        project,
        changeEntries,
      },
    );
    const result = {
      codexManifest: hasManifestContent(liveCodexManifest)
        ? liveCodexManifest
        : null,
      meta: {
        enabled: true,
        source: "git-status-live",
        updatedAt: new Date().toISOString(),
        frameId: activeFrameId,
        frameTitle,
        changeCount: changeEntries.length,
        clean: changeEntries.length === 0,
      },
    };
    workspaceFollowCache = {
      key: cacheKey,
      at: Date.now(),
      value: result,
    };
    return result;
  } catch (error) {
    const result = {
      codexManifest: fallbackManifest,
      meta: {
        enabled: false,
        source: "git-status-live",
        updatedAt: new Date().toISOString(),
        frameId: activeFrameId,
        frameTitle,
        changeCount: Array.isArray(fallbackManifest?.changes)
          ? fallbackManifest.changes.length
          : 0,
        clean:
          !Array.isArray(fallbackManifest?.changes) ||
          !fallbackManifest.changes.length,
        error:
          error instanceof Error
            ? error.message
            : "Workspace follow unavailable.",
      },
    };
    workspaceFollowCache = {
      key: cacheKey,
      at: Date.now(),
      value: result,
    };
    return result;
  }
}

function buildLiveWorkspaceFollowManifest(
  existingManifest,
  { frameId = "", frameTitle = "", project = null, changeEntries = [] } = {},
) {
  const baseManifest = normalizePreviewManifest(existingManifest || {});
  const liveChanges = mergeLiveWorkspaceChanges(
    baseManifest.changes,
    changeEntries,
  );
  const source = cleanString(baseManifest.source);

  return normalizePreviewManifest({
    ...baseManifest,
    updatedAt: new Date().toISOString(),
    source: source ? `${source}+workspace-follow` : "codex-workspace-follow",
    project: project || baseManifest.project,
    notes: baseManifest.notes,
    targets: baseManifest.targets,
    artifacts: baseManifest.artifacts,
    changes: liveChanges,
    context: {
      frameId,
      frameTitle,
    },
  });
}

function mergeLiveWorkspaceChanges(existingChanges, liveEntries) {
  const existingByPath = new Map(
    normalizePreviewChanges(existingChanges || []).map((entry) => [
      cleanString(entry.path),
      entry,
    ]),
  );

  return normalizePreviewChanges(
    liveEntries.map((entry, index) => {
      const normalized = normalizePreviewChange(entry, index);
      if (!normalized) {
        return null;
      }
      const existing = existingByPath.get(normalized.path);
      return {
        ...normalized,
        id: buildWorkspaceChangeId(normalized.path, index),
        label: cleanString(existing?.label) || normalized.label,
        kind: cleanString(existing?.kind) || normalized.kind,
        summary: cleanString(existing?.summary) || normalized.summary,
        frameIds:
          Array.isArray(existing?.frameIds) && existing.frameIds.length
            ? existing.frameIds
            : normalized.frameIds,
      };
    }),
  );
}

async function collectWorkspaceChangeEntries({
  frameId = "",
  frameTitle = "",
} = {}) {
  const output = await runCommand("git", [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ]);
  const entries = output.stdout
    .split("\n")
    .map((line) => parseGitStatusLine(line))
    .filter(Boolean)
    .filter((entry) => !isIgnoredAutoPublishPath(entry.path));

  return entries.map((entry, index) => ({
    id: buildWorkspaceChangeId(entry.path, index),
    path: entry.path,
    label: entry.path.split("/").pop() || `Change ${index + 1}`,
    kind: "updated",
    summary: frameTitle
      ? `${capitalize(entry.status)} while working on ${frameTitle}`
      : capitalize(entry.status),
    frameIds: frameId ? [frameId] : [],
  }));
}

function buildWorkspaceChangeId(path, index = 0) {
  const normalizedPath = cleanString(path);
  if (!normalizedPath) {
    return `change-${index + 1}`;
  }
  return `change-${slugify(normalizedPath)}`;
}

function parseGitStatusLine(line) {
  const raw = String(line ?? "").replace(/\r$/, "");
  if (!raw.trim()) {
    return null;
  }
  if (raw.startsWith("?? ")) {
    return {
      path: raw.slice(3).trim(),
      status: "untracked",
    };
  }

  const statusCode = raw.slice(0, 2);
  const pathPart = raw.slice(3).trim();
  if (!pathPart) {
    return null;
  }
  const resolvedPath =
    statusCode.includes("R") || statusCode.includes("C")
      ? pathPart.split(" -> ").at(-1)?.trim() || pathPart
      : pathPart;

  return {
    path: resolvedPath,
    status: summarizeGitStatus(statusCode),
  };
}

function summarizeGitStatus(statusCode) {
  if (statusCode === "??") {
    return "untracked";
  }
  const normalized = cleanString(statusCode);
  if (normalized.includes("R")) {
    return "renamed";
  }
  if (normalized.includes("A")) {
    return "added";
  }
  if (normalized.includes("D")) {
    return "deleted";
  }
  if (normalized.includes("C")) {
    return "copied";
  }
  if (normalized.includes("M")) {
    return "modified";
  }
  return "updated";
}

function isIgnoredAutoPublishPath(value) {
  const path = cleanString(value).replaceAll("\\", "/");
  if (!path) {
    return true;
  }
  return (
    path.startsWith("exports/") ||
    path.startsWith(".canvax/") ||
    path === "artifacts/" ||
    path === "artifacts/canvax/" ||
    path === "artifacts/preview/" ||
    path === "artifacts/canvax/codex-output.json" ||
    path.startsWith("artifacts/canvax/checkpoints/") ||
    path.startsWith("artifacts/preview/snapshots/") ||
    path.startsWith("artifacts/preview/materialized/")
  );
}

function capitalize(value) {
  const text = cleanString(value);
  if (!text) {
    return "";
  }
  return `${text[0].toUpperCase()}${text.slice(1)}`;
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
  const targets = compactPreviewManifestEntries(
    normalizePreviewTargets(
      explicitTargets ??
        (directTarget
          ? [directTarget]
          : Array.isArray(fallback.targets)
            ? fallback.targets
            : []),
    ),
    PREVIEW_MANIFEST_TARGET_LIMIT,
    previewTargetKey,
  );
  const primaryTarget =
    targets.find((target) => target.id === "primary") || targets[0] || null;

  return {
    version: Number(next.version) || Number(fallback.version) || 1,
    updatedAt: new Date().toISOString(),
    source: cleanString(next.source) || cleanString(fallback.source) || "codex",
    project: normalizeManifestProject(next.project || fallback.project),
    previewUrl:
      cleanString(next.previewUrl) ||
      primaryTarget?.url ||
      cleanString(fallback.previewUrl) ||
      "",
    notes: normalizeManifestNotes(next.notes, fallback.notes),
    targets,
    artifacts: compactPreviewManifestEntries(
      normalizePreviewArtifacts(
        Array.isArray(next.artifacts)
          ? next.artifacts
          : Array.isArray(fallback.artifacts)
            ? fallback.artifacts
            : [],
      ),
      PREVIEW_MANIFEST_ARTIFACT_LIMIT,
      previewArtifactKey,
    ),
    changes: compactPreviewManifestEntries(
      normalizePreviewChanges(
        Array.isArray(next.changes)
          ? next.changes
          : Array.isArray(next.changedFiles)
            ? next.changedFiles
            : Array.isArray(fallback.changes)
              ? fallback.changes
              : [],
      ),
      PREVIEW_MANIFEST_CHANGE_LIMIT,
      previewChangeKey,
    ),
  };
}

function compactPreviewManifestEntries(values, limit, buildKey) {
  const entries = Array.isArray(values) ? values.filter(Boolean) : [];
  const seen = new Set();
  const compacted = [];
  entries.forEach((entry, index) => {
    const key = buildKey(entry, index);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    compacted.push(entry);
  });
  return compacted.slice(0, limit);
}

function previewTargetKey(target, index = 0) {
  return (
    cleanString(target?.id) ||
    cleanString(target?.previewPath) ||
    cleanString(target?.url) ||
    `target-${index}`
  );
}

function previewArtifactKey(artifact, index = 0) {
  return (
    cleanString(artifact?.id) ||
    cleanString(artifact?.path) ||
    cleanString(artifact?.url) ||
    `artifact-${index}`
  );
}

function previewChangeKey(change, index = 0) {
  return (
    cleanString(change?.id) ||
    cleanString(change?.path) ||
    cleanString(change?.label) ||
    `change-${index}`
  );
}

function normalizeManifestNotes(...values) {
  const paragraphs = values
    .flatMap((value) => cleanString(value).split(/\n{2,}/))
    .map((entry) => entry.trim())
    .filter(Boolean);
  const seen = new Set();
  const latest = [];
  [...paragraphs].reverse().forEach((entry) => {
    const key = entry.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    latest.push(entry);
  });
  return latest
    .reverse()
    .slice(-PREVIEW_MANIFEST_NOTE_LIMIT)
    .join("\n\n");
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
          changeSummary: "",
          project: null,
          projectId: "",
          refinement: normalizeMaterializeRefinement(null),
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
    changeSummary: cleanString(entry.changeSummary),
    project: normalizeManifestProject(entry.project),
    projectId: manifestProjectId(entry),
    refinement: normalizeMaterializeRefinement(entry.refinement),
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
          changeSummary: "",
          project: null,
          projectId: "",
          refinement: normalizeMaterializeRefinement(null),
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
    changeSummary: cleanString(entry.changeSummary),
    project: normalizeManifestProject(entry.project),
    projectId: manifestProjectId(entry),
    refinement: normalizeMaterializeRefinement(entry.refinement),
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
          project: null,
          projectId: "",
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
    project: normalizeManifestProject(entry.project),
    projectId: manifestProjectId(entry),
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
    changeSummary: cleanString(source.changeSummary),
    refinement: normalizeMaterializeRefinement(source.refinement),
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
