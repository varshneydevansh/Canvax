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
          "Use Canvax tools to read the local visual handoff, frame, spatial map, design kit, output bindings, and linked real-project files. These tools are read-only and do not require API keys.",
      });
      return;
    }
    if (method === "ping") {
      writeResult(id, {});
      return;
    }
    if (method === "tools/list") {
      writeResult(id, {
        tools: toolDefinitions.map(({ command, ...tool }) => tool),
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
      const payload = await callCanvaxInspection(tool, params.arguments || {});
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
  const listResponse = await dispatchForSelfTest(list);
  const callResponse = await dispatchForSelfTest(call);
  const passed = Boolean(
    Array.isArray(listResponse.result?.tools) &&
      listResponse.result.tools.some((tool) => tool.name === "get_current_frame") &&
      listResponse.result.tools.some((tool) => tool.name === "get_project_link") &&
      callResponse.result?.structuredContent?.kind === "canvax-mcp-tool-result" &&
      callResponse.result?.structuredContent?.requiresOpenAiApiKey === false,
  );
  if (!passed) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          kind: "canvax-mcp-self-test",
          listResponse,
          callResponse,
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
      },
      null,
      2,
    ),
  );
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

Runs a read-only Model Context Protocol-style stdio server for Canvax. The
server exposes these local no-API tools:

${toolDefinitions.map((tool) => `- ${tool.name}`).join("\n")}

Messages are newline-delimited JSON-RPC over stdio. The server reads local
Canvax export and manifest files only; it does not call OpenAI, ChatGPT, image
APIs, browser automation, or paid APIs.`);
}
