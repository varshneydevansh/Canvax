import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const liveJsonPath = resolve(projectRoot, "exports", "canvax-live-latest.json");
const taskPackJsonPath = resolve(
  projectRoot,
  "exports",
  "canvax-task-pack-latest.json",
);
const buildRealRequestJsonPath = resolve(
  projectRoot,
  "exports",
  "canvax-build-real-latest.json",
);
const imagePromptPackJsonPath = resolve(
  projectRoot,
  "exports",
  "canvax-image-prompt-pack-latest.json",
);
const assetCandidatesJsonPath = resolve(
  projectRoot,
  "exports",
  "canvax-asset-candidates-latest.json",
);
const latestCheckpointPath = resolve(
  projectRoot,
  "exports",
  "canvax-checkpoint-latest.json",
);
const previewManifestPath = resolve(
  projectRoot,
  "exports",
  "canvax-preview-manifest.json",
);
const codexOutputManifestPath = resolve(
  projectRoot,
  "artifacts",
  "canvax",
  "codex-output.json",
);
const curlBinary = "/usr/bin/curl";
const upstreamProposalPath = resolve(
  projectRoot,
  "docs",
  "upstream-proposal.md",
);
const demoScriptPath = resolve(projectRoot, "docs", "canvax-demo-script.md");

const results = [];

await validateCodexOutputDryRun();
await validateRunningPreviewState();
await validateAssetCandidatesEndpoint();
await validateRequiredFile(
  upstreamProposalPath,
  "upstream proposal doc is present",
);
await validateRequiredFile(demoScriptPath, "demo script doc is present");
await validateOptionalJsonSchema(
  liveJsonPath,
  (value) =>
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.frames),
  "live export schema is valid",
  { allowLegacyWithoutSchema: true },
);
await validateOptionalJsonSchema(
  taskPackJsonPath,
  (value) =>
    value?.kind === "canvax-task-pack" &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.frames),
  "task pack schema is valid",
);
await validateOptionalJsonSchema(
  buildRealRequestJsonPath,
  (value) =>
    value?.kind === "canvax-build-real-request" &&
    value.requiresOpenAiApiKey === false &&
    value.outputContract?.manifestPath ===
      "artifacts/canvax/codex-output.json" &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1,
  "build real request schema is valid",
);
await validateOptionalJsonSchema(
  imagePromptPackJsonPath,
  (value) =>
    value?.kind === "canvax-image-prompt-pack" &&
    value.requiresOpenAiApiKey === false &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.frames),
  "image prompt pack schema is valid",
);
await validateOptionalJsonSchema(
  assetCandidatesJsonPath,
  (value) =>
    value?.kind === "canvax-asset-candidates" &&
    value.requiresOpenAiApiKey === false &&
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    Array.isArray(value?.candidates) &&
    value.candidates.length > 0,
  "asset candidates schema is valid",
);
await validateOptionalJsonSchema(
  latestCheckpointPath,
  (value) =>
    Number.isInteger(value?.schemaVersion) &&
    value.schemaVersion >= 1 &&
    typeof value?.reason === "string",
  "checkpoint schema is valid",
);
await validateOptionalJsonSchema(
  previewManifestPath,
  (value) =>
    Number.isInteger(value?.version) &&
    value.version >= 1 &&
    Array.isArray(value?.targets),
  "preview manifest schema is valid",
);
await validateOptionalJsonSchema(
  codexOutputManifestPath,
  (value) =>
    Number.isInteger(value?.version) &&
    value.version >= 1 &&
    Array.isArray(value?.changes),
  "codex output manifest schema is valid",
);

const failed = results.filter((entry) => !entry.passed);
results.forEach((entry) => {
  const prefix = entry.skipped ? "skip" : entry.passed ? "ok" : "fail";
  const suffix = entry.detail ? ` (${entry.detail})` : "";
  console.log(`${prefix}: ${entry.name}${suffix}`);
});

if (failed.length) {
  process.exitCode = 1;
}

async function validateCodexOutputDryRun() {
  try {
    const { stdout } = await runCommand("node", [
      "scripts/write-codex-output.mjs",
      "--from-git-status",
      "--dry-run",
      "--json",
    ]);
    const payload = JSON.parse(stdout);
    const manifest = payload?.manifest;
    const passed = Boolean(
      payload?.dryRun &&
      typeof payload?.manifestPath === "string" &&
      Number.isInteger(manifest?.version) &&
      manifest.version >= 1 &&
      Array.isArray(manifest?.changes),
    );
    results.push({
      name: "codex output dry-run manifest is valid",
      passed,
      detail: passed ? `${manifest.changes.length} changes` : "invalid payload",
    });
  } catch (error) {
    results.push({
      name: "codex output dry-run manifest is valid",
      passed: false,
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function validateRunningPreviewState() {
  try {
    const { stdout } = await runCommand("node", [
      "scripts/canvax.mjs",
      "--status",
      "--json",
    ]);
    const status = JSON.parse(stdout);
    const serviceState = await detectCanvaxServiceState();
    const liveUrl =
      status?.running && typeof status.url === "string" && status.url
        ? status.url
        : serviceState.url;
    if (!liveUrl) {
      results.push({
        name: "preview-state payload is valid when the Canvax service is running",
        passed: true,
        skipped: true,
        detail: serviceState.detail,
      });
      return;
    }

    const { stdout: previewStateRaw } = await runCommand(curlBinary, [
      "-s",
      `${liveUrl}/api/preview-state`,
    ]);
    const payload = JSON.parse(previewStateRaw);
    const workspaceFollow = payload?.workspaceFollow;
    const outputDigest = payload?.outputDigest;
    const sessionEvents = Array.isArray(payload?.sessionEvents)
      ? payload.sessionEvents
      : [];
    const changes = Array.isArray(payload?.previewManifest?.changes)
      ? payload.previewManifest.changes
      : [];
    const changeIds = changes
      .map((entry) =>
        entry && typeof entry === "object" ? String(entry.id || "") : "",
      )
      .filter(Boolean);
    const passed = Boolean(
      typeof payload?.updatedAt === "string" &&
      payload?.transport &&
      typeof payload.transport === "object" &&
      payload.transport.mode === "local-companion" &&
      payload.transport.future?.mode === "app-server" &&
      (payload.previewManifest === null ||
        typeof payload.previewManifest === "object") &&
      workspaceFollow &&
      typeof workspaceFollow === "object" &&
      typeof workspaceFollow.source === "string" &&
      Number.isInteger(workspaceFollow.changeCount) &&
      outputDigest &&
      typeof outputDigest === "object" &&
      typeof outputDigest.digest === "string" &&
      typeof outputDigest.summary === "string" &&
      sessionEvents.every(
        (event) =>
          event &&
          typeof event === "object" &&
          typeof event.type === "string" &&
          typeof event.id === "string",
      ) &&
      changeIds.length === new Set(changeIds).size,
    );
    results.push({
      name: "preview-state payload is valid when the Canvax service is running",
      passed,
      detail: passed
        ? `${liveUrl} (${changeIds.length} unique changes)`
        : "invalid preview-state payload",
    });
  } catch (error) {
    results.push({
      name: "preview-state payload is valid when the Canvax service is running",
      passed: false,
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function validateAssetCandidatesEndpoint() {
  try {
    const { stdout } = await runCommand("node", [
      "scripts/canvax.mjs",
      "--status",
      "--json",
    ]);
    const status = JSON.parse(stdout);
    const serviceState = await detectCanvaxServiceState();
    const liveUrl =
      status?.running && typeof status.url === "string" && status.url
        ? status.url
        : serviceState.url;
    if (!liveUrl) {
      results.push({
        name: "asset candidates endpoint writes no-API artifact",
        passed: true,
        skipped: true,
        detail: serviceState.detail,
      });
      return;
    }

    const samplePack = {
      schemaVersion: 1,
      kind: "canvax-asset-candidates",
      createdAt: new Date().toISOString(),
      requiresOpenAiApiKey: false,
      board: {
        project: "Canvax regression",
      },
      candidates: [
        {
          id: "asset-regression-frame",
          type: "frame-composite",
          status: "prompt-ready",
          sourceFrameId: "frame-regression",
          sourceFrameTitle: "Regression frame",
          title: "Regression image candidate",
          prompt: "Validate Canvax asset candidate persistence.",
          negativePrompt: "No paid API call.",
          bounds: null,
          placement: "whole frame",
          aspectRatio: "16:9",
          outputSlots: [
            {
              label: "Generated image",
              imagePath: "",
              accepted: false,
              notes: "Regression placeholder.",
            },
          ],
        },
      ],
    };
    const response = await fetch(`${liveUrl}/api/save-asset-candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pack: samplePack,
        markdown: "# Regression asset candidates\n",
      }),
    });
    const payload = await response.json();
    const passed = Boolean(
      response.ok &&
        payload?.assetCandidatePack?.kind === "canvax-asset-candidates" &&
        payload.assetCandidatePack.requiresOpenAiApiKey === false &&
        payload.candidateCount === 1 &&
        typeof payload.latestJsonPath === "string",
    );
    results.push({
      name: "asset candidates endpoint writes no-API artifact",
      passed,
      detail: passed ? payload.latestJsonPath : "invalid asset response",
    });
  } catch (error) {
    results.push({
      name: "asset candidates endpoint writes no-API artifact",
      passed: false,
      detail: error instanceof Error ? error.message : "Unknown error",
    });
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

async function validateOptionalJsonSchema(
  filePath,
  predicate,
  name,
  options = {},
) {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (
      options.allowLegacyWithoutSchema &&
      (!Number.isInteger(parsed?.schemaVersion) || parsed.schemaVersion < 1)
    ) {
      results.push({
        name,
        passed: true,
        skipped: true,
        detail: "legacy file without schemaVersion",
      });
      return;
    }
    results.push({
      name,
      passed: Boolean(predicate(parsed)),
      detail: filePath,
    });
  } catch (error) {
    if (isMissingFileError(error)) {
      results.push({
        name,
        passed: true,
        skipped: true,
        detail: "file not present",
      });
      return;
    }
    results.push({
      name,
      passed: false,
      detail: error instanceof Error ? error.message : filePath,
    });
  }
}

async function validateRequiredFile(filePath, name) {
  try {
    await readFile(filePath, "utf8");
    results.push({
      name,
      passed: true,
      detail: filePath,
    });
  } catch (error) {
    results.push({
      name,
      passed: false,
      detail: error instanceof Error ? error.message : filePath,
    });
  }
}

function isMissingFileError(error) {
  return Boolean(error && typeof error === "object" && error.code === "ENOENT");
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
