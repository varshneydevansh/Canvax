import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const canvaxScriptPath = resolve(projectRoot, "scripts", "canvax.mjs");
const results = [];

const runtimeRoot = await mkdtemp(join(tmpdir(), "canvax-lifecycle-"));
const env = {
  ...process.env,
  CANVAX_RUNTIME_ROOT: runtimeRoot,
};

let activePort = 0;

try {
  const firstPort = await findOpenPort();
  const secondPort = await findOpenPort();
  const thirdPort = await findOpenPort();
  const occupiedPort = await findOpenPort();

  const initialStatus = await runCanvax([
    "--status",
    "--port",
    String(firstPort),
    "--json",
  ]);
  results.push(
    assert(
      initialStatus.running === false,
      "isolated lifecycle starts with no running service",
      initialStatus.url || "",
    ),
  );

  const blocker = await holdPort(occupiedPort);
  try {
    const occupied = await runCanvaxFailure([
      "--port",
      String(occupiedPort),
      "--json",
    ]);
    results.push(
      assert(
        occupied.exitCode !== 0 &&
          occupied.payload?.portOccupied === true &&
          occupied.payload?.requestedPort === occupiedPort,
        "isolated lifecycle reports non-Canvax occupied port",
        occupied.payload?.error || "",
      ),
    );
  } finally {
    await closeServer(blocker);
  }

  const started = await runCanvax(["--port", String(firstPort), "--json"]);
  activePort = firstPort;
  results.push(
    assert(
      started.running === true &&
        started.started === true &&
        started.port === firstPort &&
        started.runtimePath?.startsWith(runtimeRoot),
      "isolated lifecycle starts Canvax on requested port",
      started.url || "",
    ),
  );

  const statusPayload = await waitForServiceStatus(started.url);
  results.push(
    assert(
      statusPayload?.pid === started.pid &&
        statusPayload.projectRoot === projectRoot &&
        statusPayload.runtimePath === started.runtimePath &&
        statusPayload.hostCapabilities?.requiresOpenAiApiKey === false,
      "isolated lifecycle status identifies the same runtime",
      `${statusPayload?.url || ""} pid ${statusPayload?.pid || ""}`,
    ),
  );

  const reused = await runCanvax(["--port", String(firstPort), "--json"]);
  results.push(
    assert(
      reused.running === true &&
        reused.reused === true &&
        reused.pid === started.pid &&
        reused.port === firstPort,
      "isolated lifecycle reuses an existing matching service",
      `pid ${reused.pid || ""}`,
    ),
  );

  const mismatch = await runCanvax(["--port", String(secondPort), "--json"]);
  results.push(
    assert(
      mismatch.running === true &&
        mismatch.reused === true &&
        mismatch.portMismatch === true &&
        mismatch.requestedPort === secondPort &&
        mismatch.port === firstPort,
      "isolated lifecycle rejects accidental second-port start",
      `requested ${secondPort}, reused ${mismatch.port || ""}`,
    ),
  );

  const restarted = await runCanvax([
    "--restart",
    "--port",
    String(secondPort),
    "--json",
  ]);
  activePort = secondPort;
  results.push(
    assert(
      restarted.running === true &&
        restarted.started === true &&
        restarted.port === secondPort &&
        restarted.pid !== started.pid,
      "isolated lifecycle restarts onto a new requested port",
      `old ${started.pid || ""}, new ${restarted.pid || ""}`,
    ),
  );

  const restartedStatus = await waitForServiceStatus(restarted.url);
  results.push(
    assert(
      restartedStatus?.pid === restarted.pid &&
        restartedStatus.runtimePath === restarted.runtimePath,
      "isolated lifecycle status follows restarted service",
      `${restartedStatus?.url || ""} pid ${restartedStatus?.pid || ""}`,
    ),
  );

  const stopped = await runCanvax(["--stop", "--json"]);
  activePort = 0;
  results.push(
    assert(
      stopped.stopped === true && stopped.pid === restarted.pid,
      "isolated lifecycle stops the running service",
      `pid ${stopped.pid || ""}`,
    ),
  );

  const finalStatus = await runCanvax([
    "--status",
    "--port",
    String(secondPort),
    "--json",
  ]);
  results.push(
    assert(
      finalStatus.running === false,
      "isolated lifecycle reports stopped service",
      finalStatus.url || "",
    ),
  );

  const staleRuntimeStarted = await runCanvax([
    "--port",
    String(thirdPort),
    "--json",
  ]);
  activePort = thirdPort;
  await rm(join(runtimeRoot, "runtime.json"), { force: true });
  const recoveredStatus = await runCanvax([
    "--status",
    "--port",
    String(thirdPort),
    "--json",
  ]);
  results.push(
    assert(
      recoveredStatus.running === true &&
        recoveredStatus.recoveredFromPort === true &&
        recoveredStatus.pid === staleRuntimeStarted.pid,
      "isolated lifecycle recovers matching service when runtime file is stale",
      `pid ${recoveredStatus.pid || ""}`,
    ),
  );
  const recoveredStop = await runCanvax([
    "--stop",
    "--port",
    String(thirdPort),
    "--json",
  ]);
  activePort = 0;
  results.push(
    assert(
      recoveredStop.stopped === true &&
        recoveredStop.pid === staleRuntimeStarted.pid,
      "isolated lifecycle stops a recovered stale-runtime service",
      `pid ${recoveredStop.pid || ""}`,
    ),
  );
} catch (error) {
  results.push({
    name: "isolated lifecycle runtime check",
    passed: false,
    detail: error instanceof Error ? error.message : "Unknown lifecycle error",
  });
} finally {
  if (activePort) {
    try {
      await runCanvax(["--stop", "--json"]);
    } catch {
      // Best-effort cleanup; the failure above will be reported separately.
    }
  }
  await rm(runtimeRoot, { recursive: true, force: true });
}

const failed = results.filter((entry) => !entry.passed);
results.forEach((entry) => {
  const prefix = entry.passed ? "ok" : "fail";
  const suffix = entry.detail ? ` (${entry.detail})` : "";
  console.log(`${prefix}: ${entry.name}${suffix}`);
});

if (failed.length) {
  process.exitCode = 1;
}

function assert(passed, name, detail = "") {
  return {
    name,
    passed: Boolean(passed),
    detail,
  };
}

function runCanvax(args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [canvaxScriptPath, ...args], {
      cwd: projectRoot,
      env,
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
          new Error(stderr.trim() || stdout.trim() || `canvax exited ${code}`),
        );
        return;
      }
      try {
        resolvePromise(JSON.parse(stdout));
      } catch {
        rejectPromise(new Error(`Canvax did not return JSON: ${stdout}`));
      }
    });
  });
}

function runCanvaxFailure(args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [canvaxScriptPath, ...args], {
      cwd: projectRoot,
      env,
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
      let payload = null;
      try {
        payload = stdout ? JSON.parse(stdout) : null;
      } catch {
        // Preserve raw output in the detail below.
      }
      resolvePromise({
        exitCode: code,
        payload,
        stdout,
        stderr,
      });
    });
  });
}

async function waitForServiceStatus(url, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/status`, { cache: "no-store" });
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Retry until timeout.
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${url}/api/status`);
}

function holdPort(port) {
  return new Promise((resolvePromise, rejectPromise) => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end("not canvax");
    });
    server.on("error", rejectPromise);
    server.listen(port, "127.0.0.1", () => {
      resolvePromise(server);
    });
  });
}

function closeServer(server) {
  return new Promise((resolvePromise) => {
    server.close(() => resolvePromise());
  });
}

function findOpenPort() {
  return new Promise((resolvePromise, rejectPromise) => {
    const server = createServer();
    server.unref();
    server.on("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => {
        if (port) {
          resolvePromise(port);
          return;
        }
        rejectPromise(new Error("Could not allocate an open port."));
      });
    });
  });
}

function delay(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}
