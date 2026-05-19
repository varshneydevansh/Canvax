#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const args = parseArgs(process.argv.slice(2));
const frameId = args.frame || "frame-production-proof";
const outputRoot = args.dryRun
  ? resolve(projectRoot, ".canvax", "production-port-proof", "dry-run")
  : resolve(projectRoot, "artifacts", "canvax", "production-port-proof", "latest");

try {
  const proof = await buildProductionPortProof({
    dryRun: args.dryRun,
    frameId,
    outputRoot,
  });
  if (!args.dryRun) {
    await writeResultFiles(proof, outputRoot);
  }
  printResult(proof, args.json);
  if (!proof.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  const payload = {
    ok: false,
    kind: "canvax-production-port-proof",
    requiresOpenAiApiKey: false,
    dryRun: args.dryRun,
    error: error instanceof Error ? error.message : String(error),
  };
  printResult(payload, args.json);
  process.exitCode = 1;
}

async function buildProductionPortProof(options) {
  const paths = buildProofPaths(options.outputRoot);
  await mkdir(paths.routesDir, { recursive: true });
  await mkdir(paths.componentsDir, { recursive: true });
  await mkdir(paths.implementationDir, { recursive: true });

  const files = buildProofFiles(paths, options.frameId);
  for (const file of files) {
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, file.content, "utf8");
  }

  const patchTask = buildProductionPatchTask(paths, options.frameId);
  await writeFile(
    paths.patchTaskPath,
    `${JSON.stringify(patchTask, null, 2)}\n`,
    "utf8",
  );
  const manifest = buildCodexOutputManifest(paths, options.frameId);
  await writeFile(
    paths.manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  const patchApplication = await runJsonCommand("node", [
    "scripts/execute-patch-task.mjs",
    "--task",
    relativeProjectPath(paths.patchTaskPath),
    "--result-root",
    relativeProjectPath(resolve(options.outputRoot, "applied-patch")),
    "--no-publish",
    ...(options.dryRun ? ["--dry-run"] : []),
    "--json",
  ]);

  const tokenVerification = await runJsonCommand("node", [
    "scripts/verify-token-enforcement.mjs",
    "--contract",
    relativeProjectPath(paths.contractPath),
    "--manifest",
    relativeProjectPath(paths.manifestPath),
    "--frame",
    options.frameId,
    "--json",
  ]);
  const artifactReviewPayload = await runJsonCommand("node", [
    "scripts/review-artifact.mjs",
    "--file",
    relativeProjectPath(paths.htmlPath),
    "--dry-run",
    "--json",
  ]);
  const artifactReview = artifactReviewPayload.review || artifactReviewPayload;
  const implementationFiles = [
    ...files
      .filter((file) => file.role !== "result")
      .map((file) => ({
        path: relativeProjectPath(file.path),
        role: file.role,
        bytes: Buffer.byteLength(file.content, "utf8"),
      })),
    {
      path: relativeProjectPath(paths.patchTaskPath),
      role: "codex-patch-task",
      bytes: Buffer.byteLength(JSON.stringify(patchTask, null, 2), "utf8"),
    },
  ];

  const ok = Boolean(
    tokenVerification?.ok &&
      tokenVerification.requiresOpenAiApiKey === false &&
      tokenVerification.checkedFiles?.some((entry) =>
        entry.endsWith("canvax-proof.html"),
      ) &&
      tokenVerification.checkedFiles?.some((entry) =>
        entry.endsWith("canvax-proof.css"),
      ) &&
      tokenVerification.checkedFiles?.some((entry) =>
        entry.endsWith("CanvaxProof.jsx"),
      ) &&
      artifactReview?.requiresOpenAiApiKey === false &&
      ["pass", "review"].includes(artifactReview?.status) &&
      patchApplication?.ok === true &&
      patchApplication.changedFiles?.some((entry) =>
        entry.path.endsWith("canvax-proof.html"),
      ) &&
      patchApplication.changedFiles?.some((entry) =>
        entry.path.endsWith("CanvaxProof.jsx"),
      ) &&
      patchApplication.changedFiles?.some((entry) =>
        entry.path.endsWith("canvax-proof.css"),
      ),
  );

  return {
    ok,
    kind: "canvax-production-port-proof",
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    requiresOpenAiApiKey: false,
    dryRun: options.dryRun,
    purpose:
      "Proves Canvax can bind a production-like route/component/CSS bundle to a Codex output manifest, verify required design-token colors in those files, run a no-API static artifact review, and apply a no-API patch task to production-like files.",
    frameId: options.frameId,
    rootPath: relativeProjectPath(options.outputRoot),
    manifestPath: relativeProjectPath(paths.manifestPath),
    contractPath: relativeProjectPath(paths.contractPath),
    patchTaskPath: relativeProjectPath(paths.patchTaskPath),
    previewPath: relativeProjectPath(paths.htmlPath),
    implementationFiles,
    manifest,
    tokenVerification,
    artifactReview,
    patchApplication,
    remainingGap:
      "This is a local production-like fixture. It proves port, token, review, manifest, and patch-task mechanics, but not a real external/user project port.",
  };
}

function buildProofPaths(root) {
  const appRoot = resolve(root, "app");
  const routesDir = resolve(appRoot, "routes");
  const componentsDir = resolve(appRoot, "components");
  const implementationDir = resolve(root, "implementation");
  return {
    root,
    appRoot,
    routesDir,
    componentsDir,
    implementationDir,
    htmlPath: resolve(routesDir, "canvax-proof.html"),
    cssPath: resolve(appRoot, "canvax-proof.css"),
    jsxPath: resolve(componentsDir, "CanvaxProof.jsx"),
    designPath: resolve(root, "DESIGN.md"),
    contractPath: resolve(implementationDir, "canvax-build-contract.json"),
    patchTaskPath: resolve(implementationDir, "codex-patch-task.json"),
    manifestPath: resolve(root, "codex-output.json"),
    resultJsonPath: resolve(root, "result.json"),
    resultMarkdownPath: resolve(root, "result.md"),
  };
}

function buildProofFiles(paths, frameId) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Canvax Production Port Proof</title>
    <link rel="stylesheet" href="../canvax-proof.css">
    <style>
      .proof-button:focus-visible,
      .proof-link:focus-visible,
      .proof-nav a:focus-visible,
      .proof-form input:focus-visible {
        outline: 3px solid #f2b84b;
        outline-offset: 4px;
      }

      @media (max-width: 780px) {
        .proof-hero {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="proof-shell" data-canvax-node-id="${frameId}" data-canvax-node-type="production-proof">
      <nav class="proof-nav" aria-label="Proof navigation">
        <a href="#dossier">Dossier</a>
        <a href="#dispatch">Dispatch</a>
      </nav>
      <section class="proof-hero" id="dossier" data-canvax-node-id="${frameId}-hero">
        <div>
          <p class="proof-kicker">Canvax proof route</p>
          <h1>Sketch tokens survive the production port.</h1>
          <p class="proof-copy">
            This route behaves like a real app screen file. It keeps the Canvax
            palette, component bindings, responsive layout, labelled form
            control, image alternative, and visible actions.
          </p>
          <div class="proof-actions">
            <button class="proof-button" type="button">Review handoff</button>
            <a class="proof-link" href="#dispatch">Open dispatch</a>
          </div>
        </div>
        <img
          class="proof-poster"
          alt="Abstract Canvax production-port proof card"
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 220'%3E%3Crect width='320' height='220' fill='%2314323f'/%3E%3Cpath d='M20 170 290 40 250 180Z' fill='%23e85d3a'/%3E%3Ccircle cx='225' cy='80' r='34' fill='%23f2b84b'/%3E%3C/svg%3E"
        >
      </section>
      <form class="proof-form" id="dispatch">
        <label for="proof-note">Production-port note</label>
        <input id="proof-note" name="proof-note" value="No API key required">
      </form>
    </main>
  </body>
</html>
`;
  const css = `:root {
  --canvax-rust: #e85d3a;
  --canvax-ink: #14323f;
  --canvax-gold: #f2b84b;
  --canvax-paper: #fff8ec;
}

body {
  margin: 0;
  background: var(--canvax-ink);
  color: var(--canvax-paper);
  font-family: Avenir Next, ui-sans-serif, system-ui, sans-serif;
}

.proof-shell {
  min-height: 100svh;
  padding: clamp(24px, 5vw, 72px);
  background:
    radial-gradient(circle at 80% 10%, color-mix(in srgb, var(--canvax-gold) 32%, transparent), transparent 32%),
    linear-gradient(135deg, #14323f 0%, #1f1410 100%);
}

.proof-nav {
  display: flex;
  gap: 18px;
  margin-bottom: clamp(32px, 8vw, 96px);
}

.proof-nav a,
.proof-link {
  color: var(--canvax-gold);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.proof-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 36vw);
  gap: clamp(24px, 5vw, 72px);
  align-items: center;
}

.proof-kicker {
  color: var(--canvax-gold);
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

h1 {
  max-width: 820px;
  margin: 0;
  color: var(--canvax-paper);
  font-family: Georgia, serif;
  font-size: clamp(48px, 9vw, 128px);
  line-height: 0.86;
}

.proof-copy {
  max-width: 640px;
  color: color-mix(in srgb, var(--canvax-paper) 82%, transparent);
  font-size: clamp(18px, 2vw, 24px);
}

.proof-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 28px;
}

.proof-button {
  border: 0;
  border-radius: 999px;
  padding: 16px 22px;
  background: var(--canvax-rust);
  color: white;
  font-weight: 900;
}

.proof-button:focus-visible,
.proof-link:focus-visible,
.proof-nav a:focus-visible,
.proof-form input:focus-visible {
  outline: 3px solid var(--canvax-gold);
  outline-offset: 4px;
}

.proof-poster {
  width: 100%;
  border: 12px solid var(--canvax-paper);
  box-shadow: 18px 18px 0 var(--canvax-rust);
}

.proof-form {
  display: grid;
  gap: 8px;
  max-width: 420px;
  margin-top: 56px;
}

.proof-form input {
  border: 2px solid var(--canvax-gold);
  border-radius: 14px;
  padding: 14px 16px;
  background: var(--canvax-paper);
  color: var(--canvax-ink);
}

@media (max-width: 780px) {
  .proof-hero {
    grid-template-columns: 1fr;
  }

  .proof-poster {
    box-shadow: 10px 10px 0 var(--canvax-rust);
  }
}
`;
  const jsx = `export function CanvaxProof() {
  return (
    <main
      className="proof-shell"
      data-canvax-node-id="${frameId}"
      data-canvax-node-type="production-proof"
      style={{
        "--canvax-rust": "#e85d3a",
        "--canvax-ink": "#14323f",
        "--canvax-gold": "#f2b84b",
      }}
    >
      <section className="proof-hero" data-canvax-node-id="${frameId}-hero">
        <p className="proof-kicker">Canvax proof route</p>
        <h1>Sketch tokens survive the production port.</h1>
        <button className="proof-button" type="button">
          Review handoff
        </button>
      </section>
    </main>
  );
}
`;
  const contract = {
    schemaVersion: 1,
    kind: "canvax-build-integration-contract",
    requiresOpenAiApiKey: false,
    frameId,
    visualDirection: {
      designTokens: {
        palette: [
          { name: "Canvax rust", hex: "#e85d3a" },
          { name: "Deep ink", hex: "#14323f" },
          { name: "Poster gold", hex: "#f2b84b" },
        ],
      },
      styleNotes:
        "Production proof route must preserve the Canvax palette and node bindings when ported into app files.",
    },
    acceptanceCriteria: [
      "App route keeps data-canvax-node-id bindings.",
      "CSS/JSX preserve the required token colors.",
      "Generated output manifest binds route, component, and CSS files to the source frame.",
    ],
  };
  const design = `# Canvax Production Port Proof

This local fixture proves the production-port gate without using a paid API.

- Frame: ${frameId}
- Required palette: #e85d3a, #14323f, #f2b84b
- Required files: HTML route, CSS module, React component, Codex output manifest
- Required gates: token enforcement and static artifact review
`;

  return [
    { path: paths.htmlPath, role: "html-route", content: html },
    { path: paths.cssPath, role: "css", content: css },
    { path: paths.jsxPath, role: "react-component", content: jsx },
    {
      path: paths.contractPath,
      role: "build-contract",
      content: `${JSON.stringify(contract, null, 2)}\n`,
    },
    { path: paths.designPath, role: "design-doc", content: design },
  ];
}

function buildCodexOutputManifest(paths, frameId) {
  const htmlPath = relativeProjectPath(paths.htmlPath);
  const cssPath = relativeProjectPath(paths.cssPath);
  const jsxPath = relativeProjectPath(paths.jsxPath);
  const designPath = relativeProjectPath(paths.designPath);
  const patchTaskPath = relativeProjectPath(paths.patchTaskPath);
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    source: "canvax-production-port-proof",
    previewUrl: "",
    notes:
      "Local production-like proof manifest. Verifies route/component/CSS files rather than only a generated preview artifact.",
    targets: [
      {
        id: "primary",
        label: "Production port proof route",
        source: "canvax-production-port-proof",
        type: "implementation-preview",
        url: "",
        previewPath: htmlPath,
        description:
          "Production-like HTML route bound to the source Canvax frame.",
        frameIds: [frameId],
      },
    ],
    changes: [
      {
        id: "change-route",
        path: htmlPath,
        label: "canvax-proof.html",
        kind: "updated",
        summary: "Production-like route preserving Canvax node bindings.",
        frameIds: [frameId],
      },
      {
        id: "change-css",
        path: cssPath,
        label: "canvax-proof.css",
        kind: "updated",
        summary: "Production-like stylesheet preserving Canvax token colors.",
        frameIds: [frameId],
      },
      {
        id: "change-component",
        path: jsxPath,
        label: "CanvaxProof.jsx",
        kind: "updated",
        summary: "React component preserving Canvax bindings and tokens.",
        frameIds: [frameId],
      },
      {
        id: "change-patch-task",
        path: patchTaskPath,
        label: "codex-patch-task.json",
        kind: "updated",
        summary: "Production-like patch task for the proof route.",
        frameIds: [frameId],
      },
    ],
    artifacts: [
      {
        id: "artifact-design",
        path: designPath,
        label: "DESIGN.md",
        kind: "artifact",
        description: "Human-readable proof contract and design token summary.",
        frameIds: [frameId],
      },
    ],
  };
}

function buildProductionPatchTask(paths, frameId) {
  const htmlPath = relativeProjectPath(paths.htmlPath);
  const cssPath = relativeProjectPath(paths.cssPath);
  const jsxPath = relativeProjectPath(paths.jsxPath);
  const patchTaskPath = relativeProjectPath(paths.patchTaskPath);
  return {
    kind: "canvax-codex-patch-task",
    schemaVersion: 1,
    requiresOpenAiApiKey: false,
    createdAt: new Date().toISOString(),
    source: "scripts/production-port-proof.mjs",
    frameId,
    frameTitle: "Production port proof",
    trigger: {
      kind: "production-port-proof-tweak",
      id: `${frameId}-hero-proof-tweak`,
      path: patchTaskPath,
      note:
        "Move the production proof hero upward while preserving Canvax node bindings.",
      target: {
        id: "production-proof-route",
        label: "Production proof route",
        type: "implementation-preview",
        previewPath: htmlPath,
        source: "canvax-production-port-proof",
      },
      region: {
        normalized: { x: 0.08, y: 0.18, width: 0.72, height: 0.46 },
      },
    },
    previewPath: htmlPath,
    contextPath: "",
    suggestedFiles: [
      {
        path: htmlPath,
        role: "production-like route html",
        source: "production-port-proof",
      },
      {
        path: cssPath,
        role: "production-like route stylesheet",
        source: "production-port-proof",
      },
      {
        path: jsxPath,
        role: "production-like React component",
        source: "production-port-proof",
      },
    ],
    componentTargets: [
      {
        id: `${frameId}-hero`,
        label: "Production proof hero",
        type: "section",
        selector: `[data-canvax-node-id="${frameId}-hero"]`,
        suggestedComponentName: "ProductionProofHero",
        bounds: { x: 0.08, y: 0.18, w: 0.72, h: 0.46 },
      },
    ],
    affectedRegions: [
      {
        source: "production-port-proof",
        label: "Proof hero tweak",
        note:
          "Move the production proof hero upward while preserving Canvax node bindings.",
        normalizedBounds: { x: 0.08, y: 0.18, w: 0.72, h: 0.46 },
        componentTargetIds: [`${frameId}-hero`],
      },
    ],
    instructions: [
      "Apply this only to the local production-port proof fixture.",
      "Preserve data-canvax-node-id bindings so future Canvax corrections remain traceable.",
    ],
    acceptanceCriteria: [
      "The proof route, component, and CSS record applied patch metadata.",
      "No OpenAI API key or paid API call is required.",
    ],
  };
}

async function writeResultFiles(proof, root) {
  const paths = buildProofPaths(root);
  await mkdir(root, { recursive: true });
  await writeFile(paths.resultJsonPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  await writeFile(paths.resultMarkdownPath, buildProofMarkdown(proof), "utf8");
}

function buildProofMarkdown(proof) {
  const tokenStatus = proof.tokenVerification?.ok ? "pass" : "fail";
  const reviewStatus = proof.artifactReview?.status || "unknown";
  return `# Canvax Production Port Proof

- Status: ${proof.ok ? "pass" : "fail"}
- Requires OpenAI API key: ${proof.requiresOpenAiApiKey ? "yes" : "no"}
- Dry run: ${proof.dryRun ? "yes" : "no"}
- Frame: ${proof.frameId}
- Manifest: ${proof.manifestPath}
- Patch task: ${proof.patchTaskPath}
- Preview route: ${proof.previewPath}
- Token enforcement: ${tokenStatus}
- Artifact review: ${reviewStatus}
- Patch application: ${proof.patchApplication?.ok ? "pass" : "fail"}

## Checked Files

${proof.implementationFiles.map((file) => `- ${file.path} (${file.role})`).join("\n")}

## Remaining Gap

${proof.remainingGap}
`;
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

function relativeProjectPath(value) {
  const absolute = resolve(value);
  if (absolute.startsWith(`${projectRoot}/`)) {
    return absolute.slice(projectRoot.length + 1);
  }
  return absolute;
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    json: false,
    frame: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--frame") {
      options.frame = argv[++index] || "";
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return options;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  const prefix = result.ok ? "ok" : "fail";
  console.log(`${prefix}: Canvax production-port proof`);
  if (result.manifestPath) {
    console.log(`manifest: ${result.manifestPath}`);
  }
  if (result.previewPath) {
    console.log(`preview: ${result.previewPath}`);
  }
  if (result.tokenVerification?.detail) {
    console.log(`tokens: ${result.tokenVerification.detail}`);
  }
  if (result.artifactReview?.summary) {
    console.log(`review: ${result.artifactReview.summary}`);
  }
  if (result.error) {
    console.log(`error: ${result.error}`);
  }
}

function printHelp() {
  console.log(`Usage:
  node scripts/production-port-proof.mjs [--dry-run] [--json] [--frame frame-id]

Creates a local production-like route/component/CSS bundle, binds it to a Codex
output manifest, verifies required design-token colors in manifest-listed files,
and runs the no-API static artifact review. This proves the local production-port
gate mechanics without requiring OPENAI_API_KEY.`);
}
