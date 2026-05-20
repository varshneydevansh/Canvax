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
    name: "get_canvax_summary",
    command: "summary",
    description:
      "Read the latest Canvax board summary, including frame count, spatial object count, design-kit label, and output binding count.",
    inputSchema: buildInputSchema(false),
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
          "Use Canvax tools to read the local visual handoff, frame, spatial map, design kit, output bindings, and linked real-project files. Read tools are no-API inspection tools; attach_generated_asset is the only local write tool and only imports a supplied image path into Canvax image-result/candidate handoff files.",
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
      const payload =
        tool.runner === "image-result-import"
          ? await callImageResultImport(tool, params.arguments || {})
          : await callCanvaxInspection(tool, params.arguments || {});
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
  const listResponse = await dispatchForSelfTest(list);
  const callResponse = await dispatchForSelfTest(call);
  const attachResponse = await dispatchForSelfTest(attachCall);
  const passed = Boolean(
    Array.isArray(listResponse.result?.tools) &&
      listResponse.result.tools.some((tool) => tool.name === "get_current_frame") &&
      listResponse.result.tools.some((tool) => tool.name === "get_project_link") &&
      listResponse.result.tools.some((tool) => tool.name === "attach_generated_asset") &&
      callResponse.result?.structuredContent?.kind === "canvax-mcp-tool-result" &&
      callResponse.result?.structuredContent?.requiresOpenAiApiKey === false &&
      attachResponse.result?.structuredContent?.kind === "canvax-mcp-tool-result" &&
      attachResponse.result?.structuredContent?.imageResultPack?.kind ===
        "canvax-image-results" &&
      attachResponse.result?.structuredContent?.imageResultPack
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

function appendStringOption(commandArgs, option, value) {
  const clean = cleanArgString(value);
  if (clean) {
    commandArgs.push(option, clean);
  }
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
local Canvax export and manifest files. attach_generated_asset writes only
local Canvax image-result/candidate handoff files. The server does not call
OpenAI, ChatGPT, image APIs, browser automation, or paid APIs.`);
}
