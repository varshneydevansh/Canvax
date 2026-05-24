#!/usr/bin/env node

import { spawn } from "node:child_process";
import readline from "node:readline";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const protocolVersion = "2025-06-18";

const toolDefinitions = [
  {
    name: "get_host_handoff",
    command: "host-handoff",
    description:
      "Read a single host-ready Canvax packet for the current or requested frame, including sketch composition, voice intent, rewrite queue, output binding, project-link, image host context, and next Codex actions.",
    inputSchema: buildInputSchema(true),
  },
  {
    name: "get_canvax_summary",
    command: "summary",
    description:
      "Read the latest Canvax board summary, including frame count, spatial object count, design-kit label, and output binding count.",
    inputSchema: buildInputSchema(false),
  },
  {
    name: "create_task_pack",
    command: "task-pack",
    description:
      "Return a host-ready no-API task pack handoff from the latest Canvax exports for build, refine, spec, image-prompt, or variation work. Does not call hosted models.",
    inputSchema: buildInputSchema(true),
  },
  {
    name: "create_image_prompt_pack",
    command: "image-prompt-pack",
    description:
      "Return a host-ready no-API image prompt handoff from the latest Canvax exports, including placement context, style lock, asset candidate counts, and return instructions.",
    inputSchema: buildInputSchema(true),
  },
  {
    name: "get_current_frame",
    command: "current-frame",
    description:
      "Read the current or requested Canvax frame, including notes, viewport, captures, output annotations, and sketch metadata.",
    inputSchema: buildInputSchema(true),
  },
  {
    name: "get_spatial_workspace",
    command: "spatial-workspace",
    description:
      "Read the Canvax spatial Map workspace: cards, objects, groups, links, lanes, timeline, selection, and viewport metadata.",
    inputSchema: buildInputSchema(true),
  },
  {
    name: "get_design_kit",
    command: "design-kit",
    description:
      "Read the active Canvax design-kit context, including preset/source labels, palette/token cues, mood, action mode, and style rules when present.",
    inputSchema: buildInputSchema(false),
  },
  {
    name: "get_output_binding",
    command: "output-binding",
    description:
      "Read the current frame's generated-output binding from build/rewrite requests and the Codex output manifest.",
    inputSchema: buildInputSchema(true),
  },
  {
    name: "get_project_link",
    command: "project-link",
    description:
      "Read the current frame's linked real project files, including target root, route/component/CSS paths, source summaries, and Codex edit contract metadata.",
    inputSchema: buildInputSchema(true),
  },
  {
    name: "get_canvax_all",
    command: "all",
    description:
      "Read the complete local Canvax inspection payload for the current or requested frame.",
    inputSchema: buildInputSchema(true),
  },
  {
    name: "attach_generated_asset",
    runner: "image-result-import",
    description:
      "Attach a hosted image-generation result back to a Canvax asset candidate slot. Accepts a local workspace path, /workspace path, URL, or data image. Writes local no-API image result handoff files unless dryRun is true.",
    inputSchema: buildAttachGeneratedAssetInputSchema(),
  },
  {
    name: "append_transcript",
    runner: "transcript-append",
    description:
      "Append a host-provided voice/chat transcript into Canvax voice context through the local transcript bridge. Writes exports/canvax-transcript-bridge.* unless dryRun is true.",
    inputSchema: buildAppendTranscriptInputSchema(),
  },
  {
    name: "publish_codex_output",
    runner: "codex-output-publish",
    description:
      "Publish a Codex-generated URL, preview artifact, changed files, or implementation artifacts back to the Canvax Codex output manifest. Uses scripts/write-codex-output.mjs and supports dryRun.",
    inputSchema: buildPublishCodexOutputInputSchema(),
  },
];

const toolMap = new Map(toolDefinitions.map((tool) => [tool.name, tool]));

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  printHelp();
  process.exit(0);
}

if (process.argv.includes("--self-test")) {
  await runSelfTest();
  process.exit(0);
}

serveStdio();

function serveStdio() {
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
    crlfDelay: Infinity,
  });

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    let request;
    try {
      request = JSON.parse(trimmed);
    } catch (error) {
      writeMessage({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error",
          data: error instanceof Error ? error.message : String(error),
        },
      });
      return;
    }
    await handleMessage(request);
  });
}

async function handleMessage(request) {
  if (!request || typeof request !== "object") {
    writeError(null, -32600, "Invalid Request");
    return;
  }
  const { id, method } = request;
  if (!method) {
    writeError(id ?? null, -32600, "Invalid Request");
    return;
  }
  try {
    if (method.startsWith("notifications/")) {
      return;
    }
    if (method === "initialize") {
      writeResult(id, {
        protocolVersion,
        capabilities: {
          tools: {
            listChanged: false,
          },
        },
        serverInfo: {
          name: "canvax",
          version: "0.1.0",
        },
        instructions:
          "Use Canvax tools to read the local visual handoff, host packet, task pack, image prompt pack, frame, spatial map, design kit, output bindings, and linked real-project files. Read tools are no-API inspection tools. Write tools stay local: append_transcript queues host transcript text into Canvax voice context, attach_generated_asset imports a supplied image path into image-result/candidate handoff files, and publish_codex_output writes the Codex output manifest.",
      });
      return;
    }
    if (method === "ping") {
      writeResult(id, {});
      return;
    }
    if (method === "tools/list") {
      writeResult(id, {
        tools: toolDefinitions.map(publicToolDefinition),
      });
      return;
    }
    if (method === "tools/call") {
      const params = request.params || {};
      const name = String(params.name || "");
      const tool = toolMap.get(name);
      if (!tool) {
        writeError(id, -32602, `Unknown Canvax tool: ${name}`);
        return;
      }
      const payload = await callTool(tool, params.arguments || {});
      writeResult(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2),
          },
        ],
        structuredContent: payload,
        isError: false,
      });
      return;
    }
    writeError(id, -32601, `Method not found: ${method}`);
  } catch (error) {
    writeError(
      id,
      -32603,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function callCanvaxInspection(tool, args) {
  const commandArgs = [
    "scripts/canvax-inspect.mjs",
    tool.command,
    "--json",
  ];
  if (args.full === true || tool.command === "all") {
    commandArgs.push("--full");
  }
  if (typeof args.frameId === "string" && args.frameId.trim()) {
    commandArgs.push("--frame", args.frameId.trim());
  }
  const payload = await runJsonCommand("node", commandArgs);
  return {
    kind: "canvax-mcp-tool-result",
    schemaVersion: 1,
    requiresOpenAiApiKey: false,
    tool: tool.name,
    inspection: payload,
  };
}

async function callTool(tool, args) {
  if (tool.runner === "image-result-import") {
    return callImageResultImport(tool, args);
  }
  if (tool.runner === "transcript-append") {
    return callAppendTranscript(tool, args);
  }
  if (tool.runner === "codex-output-publish") {
    return callPublishCodexOutput(tool, args);
  }
  return callCanvaxInspection(tool, args);
}

async function callImageResultImport(tool, args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("attach_generated_asset arguments must be an object.");
  }
  const imagePath = cleanArgString(args.imagePath);
  if (!imagePath) {
    throw new Error("attach_generated_asset requires imagePath.");
  }
  const commandArgs = [
    "scripts/import-image-results.mjs",
    "--image",
    imagePath,
    "--json",
  ];
  appendStringOption(commandArgs, "--candidate", args.candidateId);
  appendStringOption(commandArgs, "--slot", args.slotId);
  appendStringOption(commandArgs, "--task", args.taskId);
  appendStringOption(commandArgs, "--notes", args.notes);
  appendStringOption(commandArgs, "--title", args.title);
  if (Number.isInteger(args.taskIndex) && args.taskIndex >= 0) {
    commandArgs.push("--task-index", String(args.taskIndex));
  }
  if (args.accept === true) {
    commandArgs.push("--accept");
  }
  if (args.copy === true) {
    commandArgs.push("--copy");
  }
  if (args.noUpdateCandidates === true) {
    commandArgs.push("--no-update-candidates");
  }
  if (args.dryRun === true) {
    commandArgs.push("--dry-run");
  }
  const payload = await runJsonCommand("node", commandArgs);
  return {
    kind: "canvax-mcp-tool-result",
    schemaVersion: 1,
    requiresOpenAiApiKey: false,
    tool: tool.name,
    mutation: "attach-generated-asset",
    imageResultPack: payload,
  };
}

async function callAppendTranscript(tool, args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("append_transcript arguments must be an object.");
  }
  const text = cleanArgString(args.text || args.transcript);
  if (!text) {
    throw new Error("append_transcript requires text.");
  }
  const scope = normalizeTranscriptScope(args.scope);
  const frameId = cleanArgString(args.frameId);
  const frameTitle = cleanArgString(args.frameTitle);
  const source = cleanArgString(args.source) || "host-transcript";
  const provider = cleanArgString(args.provider) || "canvax-mcp";
  const at = cleanArgString(args.at);
  if (args.dryRun === true) {
    return {
      kind: "canvax-mcp-tool-result",
      schemaVersion: 1,
      requiresOpenAiApiKey: false,
      tool: tool.name,
      mutation: "append-transcript",
      dryRun: true,
      transcriptRequest: {
        text,
        scope,
        frameId,
        frameTitle,
        source,
        provider,
        at,
      },
      commandPreview: "node scripts/canvax.mjs --transcript <text> --json",
    };
  }
  const commandArgs = [
    "scripts/canvax.mjs",
    "--transcript",
    text,
    "--scope",
    scope,
    "--source",
    source,
    "--provider",
    provider,
    "--json",
  ];
  appendStringOption(commandArgs, "--frame", frameId);
  appendStringOption(commandArgs, "--frame-title", frameTitle);
  appendStringOption(commandArgs, "--at", at);
  const payload = await runJsonCommand("node", commandArgs);
  return {
    kind: "canvax-mcp-tool-result",
    schemaVersion: 1,
    requiresOpenAiApiKey: false,
    tool: tool.name,
    mutation: "append-transcript",
    transcriptBridge: payload,
  };
}

async function callPublishCodexOutput(tool, args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("publish_codex_output arguments must be an object.");
  }
  const commandArgs = ["scripts/write-codex-output.mjs", "--json"];
  appendStringOption(commandArgs, "--url", args.url);
  appendStringOption(commandArgs, "--preview-path", args.previewPath);
  appendStringOption(commandArgs, "--label", args.label);
  appendStringOption(commandArgs, "--source", args.source);
  appendStringOption(commandArgs, "--description", args.description);
  appendStringOption(commandArgs, "--notes", args.notes);
  appendStringOption(commandArgs, "--type", args.type);
  appendStringOption(commandArgs, "--project-id", args.projectId);
  appendStringOption(commandArgs, "--project-title", args.projectTitle);
  appendRepeatedStringOptions(commandArgs, "--frame", args.frameIds);
  appendRepeatedStringOptions(commandArgs, "--frame", args.frameId);
  appendRepeatedManifestEntries(commandArgs, "--change", args.changes);
  appendRepeatedManifestEntries(commandArgs, "--artifact", args.artifacts);
  if (args.fromGitStatus === true) {
    commandArgs.push("--from-git-status");
  }
  if (args.dryRun === true) {
    commandArgs.push("--dry-run");
  }
  const payload = await runJsonCommand("node", commandArgs);
  return {
    kind: "canvax-mcp-tool-result",
    schemaVersion: 1,
    requiresOpenAiApiKey: false,
    tool: tool.name,
    mutation: "publish-codex-output",
    codexOutput: payload,
  };
}

async function runSelfTest() {
  const list = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  };
  const call = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "get_canvax_summary",
      arguments: {},
    },
  };
  const attachCall = {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "attach_generated_asset",
      arguments: {
        candidateId: "asset-mcp-self-test",
        slotId: "asset-mcp-self-test-slot-1",
        imagePath: "docs/assets/canvax-logo.svg",
        dryRun: true,
      },
    },
  };
  const hostCall = {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "get_host_handoff",
      arguments: {},
    },
  };
  const taskPackCall = {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "create_task_pack",
      arguments: {},
    },
  };
  const imagePromptCall = {
    jsonrpc: "2.0",
    id: 6,
    method: "tools/call",
    params: {
      name: "create_image_prompt_pack",
      arguments: {},
    },
  };
  const transcriptCall = {
    jsonrpc: "2.0",
    id: 7,
    method: "tools/call",
    params: {
      name: "append_transcript",
      arguments: {
        text: "Self-test transcript bridge event.",
        scope: "frame",
        source: "mcp-self-test",
        dryRun: true,
      },
    },
  };
  const publishCall = {
    jsonrpc: "2.0",
    id: 8,
    method: "tools/call",
    params: {
      name: "publish_codex_output",
      arguments: {
        notes: "Self-test Codex output publish dry-run.",
        source: "mcp-self-test",
        dryRun: true,
      },
    },
  };
  const listResponse = await dispatchForSelfTest(list);
  const callResponse = await dispatchForSelfTest(call);
  const attachResponse = await dispatchForSelfTest(attachCall);
  const hostResponse = await dispatchForSelfTest(hostCall);
  const taskPackResponse = await dispatchForSelfTest(taskPackCall);
  const imagePromptResponse = await dispatchForSelfTest(imagePromptCall);
  const transcriptResponse = await dispatchForSelfTest(transcriptCall);
  const publishResponse = await dispatchForSelfTest(publishCall);
  const passed = Boolean(
    Array.isArray(listResponse.result?.tools) &&
      listResponse.result.tools.some((tool) => tool.name === "get_host_handoff") &&
      listResponse.result.tools.some((tool) => tool.name === "create_task_pack") &&
      listResponse.result.tools.some(
        (tool) => tool.name === "create_image_prompt_pack",
      ) &&
      listResponse.result.tools.some((tool) => tool.name === "get_current_frame") &&
      listResponse.result.tools.some((tool) => tool.name === "get_project_link") &&
      listResponse.result.tools.some((tool) => tool.name === "attach_generated_asset") &&
      listResponse.result.tools.some((tool) => tool.name === "append_transcript") &&
      listResponse.result.tools.some((tool) => tool.name === "publish_codex_output") &&
      callResponse.result?.structuredContent?.kind === "canvax-mcp-tool-result" &&
      callResponse.result?.structuredContent?.requiresOpenAiApiKey === false &&
      attachResponse.result?.structuredContent?.kind === "canvax-mcp-tool-result" &&
      attachResponse.result?.structuredContent?.imageResultPack?.kind ===
        "canvax-image-results" &&
      attachResponse.result?.structuredContent?.imageResultPack
        ?.requiresOpenAiApiKey === false &&
      hostResponse.result?.structuredContent?.inspection?.payload?.hostHandoff
        ?.kind === "canvax-host-handoff" &&
      hostResponse.result?.structuredContent?.inspection?.payload?.hostHandoff
        ?.requiresOpenAiApiKey === false &&
      taskPackResponse.result?.structuredContent?.inspection?.payload
        ?.taskPackHandoff?.kind === "canvax-host-task-pack" &&
      taskPackResponse.result?.structuredContent?.inspection?.payload
        ?.taskPackHandoff?.requiresOpenAiApiKey === false &&
      imagePromptResponse.result?.structuredContent?.inspection?.payload
        ?.imagePromptHandoff?.kind === "canvax-host-image-prompt-pack" &&
      imagePromptResponse.result?.structuredContent?.inspection?.payload
        ?.imagePromptHandoff?.requiresOpenAiApiKey === false &&
      transcriptResponse.result?.structuredContent?.mutation ===
        "append-transcript" &&
      transcriptResponse.result?.structuredContent?.dryRun === true &&
      transcriptResponse.result?.structuredContent
        ?.requiresOpenAiApiKey === false &&
      publishResponse.result?.structuredContent?.mutation ===
        "publish-codex-output" &&
      publishResponse.result?.structuredContent?.codexOutput?.dryRun === true &&
      publishResponse.result?.structuredContent
        ?.requiresOpenAiApiKey === false,
  );
  if (!passed) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          kind: "canvax-mcp-self-test",
          listResponse,
          callResponse,
          attachResponse,
          hostResponse,
          taskPackResponse,
          imagePromptResponse,
          transcriptResponse,
          publishResponse,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        kind: "canvax-mcp-self-test",
        requiresOpenAiApiKey: false,
        protocolVersion,
        toolCount: listResponse.result.tools.length,
        summaryKind: callResponse.result.structuredContent.inspection.kind,
        hostKind:
          hostResponse.result.structuredContent.inspection.payload.hostHandoff.kind,
        taskPackKind:
          taskPackResponse.result.structuredContent.inspection.payload
            .taskPackHandoff.kind,
        imagePromptKind:
          imagePromptResponse.result.structuredContent.inspection.payload
            .imagePromptHandoff.kind,
        transcriptMutation:
          transcriptResponse.result.structuredContent.mutation,
        publishMutation:
          publishResponse.result.structuredContent.mutation,
        attachKind:
          attachResponse.result.structuredContent.imageResultPack.kind,
      },
      null,
      2,
    ),
  );
}

function publicToolDefinition(tool) {
  const { command, runner, ...publicTool } = tool;
  return publicTool;
}

function dispatchForSelfTest(request) {
  return new Promise((resolvePromise, rejectPromise) => {
    const writes = [];
    const originalWrite = process.stdout.write;
    process.stdout.write = (chunk, encoding, callback) => {
      writes.push(String(chunk));
      if (typeof callback === "function") {
        callback();
      }
      return true;
    };
    Promise.resolve(handleMessage(request)).then(() => {
      process.stdout.write = originalWrite;
      const message = writes.join("").trim().split("\n").filter(Boolean).pop();
      resolvePromise(JSON.parse(message));
    }).catch((error) => {
      process.stdout.write = originalWrite;
      rejectPromise(error);
    });
  });
}

function buildInputSchema(includeFrame) {
  const properties = {
    full: {
      type: "boolean",
      description:
        "When true, include full arrays instead of summarized slices where the underlying Canvax inspection command supports it.",
    },
  };
  if (includeFrame) {
    properties.frameId = {
      type: "string",
      description:
        "Optional Canvax frame id. When omitted, the active frame from the latest live export is used.",
    };
  }
  return {
    type: "object",
    additionalProperties: false,
    properties,
  };
}

function buildAttachGeneratedAssetInputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["imagePath"],
    properties: {
      imagePath: {
        type: "string",
        description:
          "Returned image file path, workspace-relative path, /workspace path, URL, or data image URL.",
      },
      candidateId: {
        type: "string",
        description:
          "Canvax asset candidate id. When omitted, the latest image host task can infer it from taskId or taskIndex.",
      },
      slotId: {
        type: "string",
        description:
          "Canvax output slot id. When omitted, Canvax infers it from the matching host task or candidate.",
      },
      taskId: {
        type: "string",
        description: "Image host task id from canvax-image-host-task-latest.json.",
      },
      taskIndex: {
        type: "integer",
        minimum: 0,
        description:
          "Zero-based task index from the latest image host task, useful when candidateId is not known.",
      },
      notes: {
        type: "string",
        description: "Optional note about the returned image.",
      },
      title: {
        type: "string",
        description: "Optional title for the returned image result.",
      },
      accept: {
        type: "boolean",
        description:
          "When true, mark the returned image as the accepted candidate result.",
      },
      copy: {
        type: "boolean",
        description:
          "When true, copy local files into artifacts/canvax/image-results.",
      },
      noUpdateCandidates: {
        type: "boolean",
        description:
          "When true, write the image result pack without updating the asset candidate pack.",
      },
      dryRun: {
        type: "boolean",
        description:
          "When true, validate and return the image result pack without writing files.",
      },
    },
  };
}

function buildAppendTranscriptInputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["text"],
    properties: {
      text: {
        type: "string",
        description:
          "Transcript text from a host voice/chat event. This is text, not raw microphone audio.",
      },
      scope: {
        type: "string",
        enum: ["frame", "session", "board"],
        description:
          "Use frame for the active/current design frame, session or board for whole-board context.",
      },
      frameId: {
        type: "string",
        description:
          "Optional target frame id. When omitted, Canvax uses the active frame from the latest live export.",
      },
      frameTitle: {
        type: "string",
        description: "Optional display title for the target frame.",
      },
      source: {
        type: "string",
        description: "Optional source label, such as codex-chat or host-mic.",
      },
      provider: {
        type: "string",
        description: "Optional provider label for the transcript bridge entry.",
      },
      at: {
        type: "string",
        description: "Optional ISO timestamp for the transcript event.",
      },
      dryRun: {
        type: "boolean",
        description:
          "When true, validate and return the transcript request without writing bridge files.",
      },
    },
  };
}

function buildPublishCodexOutputInputSchema() {
  const manifestEntrySchema = {
    anyOf: [
      {
        type: "string",
        description: "Entry formatted as path::summary-or-description::frameIds.",
      },
      {
        type: "object",
        additionalProperties: false,
        required: ["path"],
        properties: {
          path: { type: "string" },
          summary: { type: "string" },
          description: { type: "string" },
          frameIds: {
            anyOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } },
            ],
          },
          frameId: { type: "string" },
        },
      },
    ],
  };
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      url: {
        type: "string",
        description: "Preview URL to bind as the primary Canvax output target.",
      },
      previewPath: {
        type: "string",
        description:
          "Workspace-relative HTML/artifact path to bind as the primary Canvax output target.",
      },
      label: { type: "string" },
      source: { type: "string" },
      description: { type: "string" },
      notes: { type: "string" },
      type: { type: "string" },
      frameId: { type: "string" },
      frameIds: {
        type: "array",
        items: { type: "string" },
      },
      projectId: { type: "string" },
      projectTitle: { type: "string" },
      fromGitStatus: {
        type: "boolean",
        description:
          "When true, include current git workspace changes, matching scripts/write-codex-output.mjs --from-git-status.",
      },
      changes: {
        type: "array",
        items: manifestEntrySchema,
      },
      artifacts: {
        type: "array",
        items: manifestEntrySchema,
      },
      dryRun: {
        type: "boolean",
        description:
          "When true, return the manifest that would be written without changing files.",
      },
    },
  };
}

function appendStringOption(commandArgs, option, value) {
  const clean = cleanArgString(value);
  if (clean) {
    commandArgs.push(option, clean);
  }
}

function appendRepeatedStringOptions(commandArgs, option, values) {
  const normalized = Array.isArray(values) ? values : [values];
  normalized.forEach((value) => appendStringOption(commandArgs, option, value));
}

function appendRepeatedManifestEntries(commandArgs, option, entries) {
  if (!Array.isArray(entries)) {
    return;
  }
  entries
    .map(formatManifestEntry)
    .filter(Boolean)
    .forEach((entry) => commandArgs.push(option, entry));
}

function formatManifestEntry(entry) {
  if (typeof entry === "string") {
    return entry.trim();
  }
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return "";
  }
  const path = cleanArgString(entry.path);
  if (!path) {
    return "";
  }
  const summary = cleanArgString(entry.summary || entry.description);
  const frameIds = normalizeFrameIds(entry.frameIds || entry.frameId).join(",");
  return `${path}::${summary}::${frameIds}`;
}

function normalizeFrameIds(value) {
  if (Array.isArray(value)) {
    return value.map(cleanArgString).filter(Boolean);
  }
  const clean = cleanArgString(value);
  return clean
    ? clean
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
}

function normalizeTranscriptScope(value) {
  const scope = cleanArgString(value).toLowerCase();
  return scope === "session" || scope === "board" ? "session" : "frame";
}

function cleanArgString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function writeResult(id, result) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    result,
  });
}

function writeError(id, code, message, data = undefined) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  });
}

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function runJsonCommand(command, commandArgs) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, commandArgs, {
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
      if (code !== 0) {
        rejectPromise(
          new Error(stderr.trim() || `${command} exited with code ${code}`),
        );
        return;
      }
      try {
        resolvePromise(JSON.parse(stdout));
      } catch (error) {
        rejectPromise(
          new Error(
            `Could not parse JSON from ${command}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    });
  });
}

function printHelp() {
  console.log(`Usage:
  node scripts/canvax-mcp-server.mjs
  node scripts/canvax-mcp-server.mjs --self-test

Runs a local Model Context Protocol-style stdio server for Canvax. The
server exposes these local no-API tools:

${toolDefinitions.map((tool) => `- ${tool.name}`).join("\n")}

Messages are newline-delimited JSON-RPC over stdio. The inspection tools read
local Canvax export and manifest files. append_transcript writes only the local
Canvax transcript bridge, attach_generated_asset writes only local image-result
candidate handoff files, and publish_codex_output writes only the local Codex
output manifest. The server does not call OpenAI, ChatGPT, image APIs, browser
automation, or paid APIs.`);
}
