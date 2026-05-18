import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const defaultRequestPath = resolve(
  projectRoot,
  "exports",
  "canvax-build-real-latest.json",
);
const defaultOutputRoot = resolve(
  projectRoot,
  "artifacts",
  "preview",
  "codex-build",
  "frames",
);

const args = process.argv.slice(2);
const wantsJson = args.includes("--json");
const noPublish = args.includes("--no-publish");

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const requestPath = resolve(
  projectRoot,
  readOption(args, "--request") || defaultRequestPath,
);
const request = await readJson(requestPath);

if (request?.kind !== "canvax-build-real-request") {
  fail(`Expected canvax-build-real-request at ${requestPath}`);
}

const frame = request.frame || {};
const frameId = cleanString(request.activeFrameId || frame.id) || "frame";
const frameTitle = cleanString(frame.title || "Canvax frame");
const outputRoot = resolve(defaultOutputRoot, safeSlug(frameId));
const htmlPath = resolve(outputRoot, "index.html");
const contextPath = resolve(outputRoot, "context.json");
const relativeHtmlPath = toProjectRelative(htmlPath);
const relativeContextPath = toProjectRelative(contextPath);
const implementationFiles = buildImplementationFiles(request, {
  frameId,
  frameTitle,
  outputRoot,
});

await mkdir(outputRoot, { recursive: true });
await writeFile(htmlPath, buildPreviewHtml(request), "utf8");
await writeImplementationFiles(implementationFiles);
await writeFile(
  contextPath,
  `${JSON.stringify(
    buildContextPayload(request, relativeHtmlPath, implementationFiles),
    null,
    2,
  )}\n`,
  "utf8",
);

let publishResult = null;
if (!noPublish) {
  publishResult = await publishCodexOutput({
    frameId,
    frameTitle,
    relativeHtmlPath,
    relativeContextPath,
    implementationFiles,
  });
}

const result = {
  ok: true,
  requestPath: toProjectRelative(requestPath),
  previewPath: relativeHtmlPath,
  contextPath: relativeContextPath,
  implementationFiles: implementationFiles.map((file) => ({
    path: file.relativePath,
    label: file.label,
    kind: file.kind,
  })),
  frameId,
  frameTitle,
  published: Boolean(publishResult),
  manifestPath: publishResult?.manifestPath || "",
};

if (wantsJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Built Canvax preview artifact: ${relativeHtmlPath}`);
  console.log(`Context: ${relativeContextPath}`);
  console.log(
    publishResult
      ? `Published Codex output manifest: ${publishResult.manifestPath}`
      : "Skipped Codex output manifest publish.",
  );
}

async function publishCodexOutput({
  frameId,
  frameTitle,
  relativeHtmlPath,
  relativeContextPath,
  implementationFiles,
}) {
  const implementationArtifactArgs = implementationFiles.flatMap((file) => [
    "--artifact",
    `${file.relativePath}::${file.label}::${frameId}`,
  ]);
  const child = spawn(
    process.execPath,
    [
      "scripts/write-codex-output.mjs",
      "--preview-path",
      relativeHtmlPath,
      "--label",
      `${frameTitle} Codex build preview`,
      "--type",
      "implementation-preview",
      "--source",
      "canvax-build-request-executor",
      "--description",
      "Local preview artifact generated from the latest Canvax build request.",
      "--notes",
      "Generated locally from Canvax build request data. No paid API key was required.",
      "--frame",
      frameId,
      "--artifact",
      `${relativeHtmlPath}::Codex build preview::${frameId}`,
      "--artifact",
      `${relativeContextPath}::Build request context::${frameId}`,
      ...implementationArtifactArgs,
      "--json",
    ],
    {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const { stdout, stderr, code } = await collectChild(child);
  if (code !== 0) {
    fail(stderr || "write-codex-output failed");
  }
  return JSON.parse(stdout);
}

async function writeImplementationFiles(files) {
  for (const file of files) {
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, file.content, "utf8");
  }
}

function buildContextPayload(request, previewPath, implementationFiles = []) {
  const frameCodeMap = implementationFiles.find(
    (file) => file.kind === "frame-code-map",
  );
  const integrationContract = implementationFiles.find(
    (file) => file.kind === "build-integration-contract",
  );
  const integrationGuide = implementationFiles.find(
    (file) => file.kind === "integration-guide",
  );
  const portTask = implementationFiles.find(
    (file) => file.kind === "codex-port-task",
  );
  return {
    kind: "canvax-executed-build-preview",
    createdAt: new Date().toISOString(),
    source: "scripts/execute-build-request.mjs",
    requiresOpenAiApiKey: false,
    previewPath,
    implementationContext: request.implementationContext || null,
    designKit:
      request.designKit || request.implementationContext?.designKit || null,
    outputEditBinding:
      request.outputEditBinding || request.frame?.outputEditBinding || null,
    frameCodeMap: frameCodeMap
      ? {
          path: frameCodeMap.relativePath,
          label: frameCodeMap.label,
          kind: frameCodeMap.kind,
        }
      : null,
    integrationContract: integrationContract
      ? {
          path: integrationContract.relativePath,
          label: integrationContract.label,
          kind: integrationContract.kind,
        }
      : null,
    integrationGuide: integrationGuide
      ? {
          path: integrationGuide.relativePath,
          label: integrationGuide.label,
          kind: integrationGuide.kind,
        }
      : null,
    portTask: portTask
      ? {
          path: portTask.relativePath,
          label: portTask.label,
          kind: portTask.kind,
        }
      : null,
    implementationFiles: implementationFiles.map((file) => ({
      path: file.relativePath,
      label: file.label,
      kind: file.kind,
    })),
    request,
  };
}

function buildImplementationFiles(request, { frameId, frameTitle, outputRoot }) {
  const implementationRoot = resolve(outputRoot, "implementation");
  const files = [
    {
      name: "index.html",
      label: `${frameTitle} implementation HTML`,
      kind: "html",
      content: buildImplementationHtml(request, { frameId, frameTitle }),
    },
    {
      name: "styles.css",
      label: `${frameTitle} implementation CSS`,
      kind: "css",
      content: buildImplementationCss(request),
    },
    {
      name: "app.js",
      label: `${frameTitle} implementation JS`,
      kind: "javascript",
      content: buildImplementationJs(request, { frameId, frameTitle }),
    },
    {
      name: "CanvaxScreen.jsx",
      label: `${frameTitle} React screen component`,
      kind: "react-component",
      content: buildReactScreenComponent(request, { frameId, frameTitle }),
    },
    {
      name: "CanvaxScreen.css",
      label: `${frameTitle} React screen styles`,
      kind: "react-css",
      content: buildReactScreenCss(request),
    },
    {
      name: "ViteApp.jsx",
      label: `${frameTitle} Vite React adapter`,
      kind: "vite-react-adapter",
      content: buildViteReactAdapter(),
    },
    {
      name: "NextAppPage.jsx",
      label: `${frameTitle} Next App Router adapter`,
      kind: "next-app-router-adapter",
      content: buildNextAppRouterAdapter(request, { frameTitle }),
    },
    {
      name: "FRAMEWORK_ADAPTERS.md",
      label: `${frameTitle} framework adapter notes`,
      kind: "framework-adapter-docs",
      content: buildFrameworkAdaptersReadme(request, { frameId, frameTitle }),
    },
    {
      name: "canvax-component-map.json",
      label: `${frameTitle} frame-to-code ownership map`,
      kind: "frame-code-map",
      content: `${JSON.stringify(
        buildFrameCodeMap(request, { frameId, frameTitle }),
        null,
        2,
      )}\n`,
    },
    {
      name: "canvax-build-contract.json",
      label: `${frameTitle} build integration contract`,
      kind: "build-integration-contract",
      content: `${JSON.stringify(
        buildBuildIntegrationContract(request, { frameId, frameTitle }),
        null,
        2,
      )}\n`,
    },
    {
      name: "codex-port-task.json",
      label: `${frameTitle} Codex port task`,
      kind: "codex-port-task",
      content: `${JSON.stringify(
        buildCodexPortTask(request, { frameId, frameTitle }),
        null,
        2,
      )}\n`,
    },
    {
      name: "INTEGRATION.md",
      label: `${frameTitle} integration guide`,
      kind: "integration-guide",
      content: buildIntegrationGuide(request, { frameId, frameTitle }),
    },
    {
      name: "ACCEPTANCE.md",
      label: `${frameTitle} production acceptance checklist`,
      kind: "acceptance-checklist",
      content: buildAcceptanceChecklist(request, { frameId, frameTitle }),
    },
    {
      name: "README.md",
      label: `${frameTitle} implementation notes`,
      kind: "documentation",
      content: buildImplementationReadme(request, { frameId, frameTitle }),
    },
  ];

  return files.map((file) => {
    const path = resolve(implementationRoot, file.name);
    return {
      ...file,
      path,
      relativePath: toProjectRelative(path),
    };
  });
}

function buildImplementationHtml(request, { frameId, frameTitle }) {
  const model = buildScreenModel(request);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(model.headline)}</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <main class="canvax-screen ${escapeHtml(model.theme.className)}" data-frame-id="${escapeHtml(frameId)}" data-canvax-theme="${escapeHtml(model.theme.id)}" data-canvax-atmosphere="${escapeHtml(model.atmosphere.id)}" style="--surface-ratio:${model.width} / ${model.height}">
    ${buildAtmosphereMarkup(model.atmosphere)}
    <header class="topbar">
      <a class="brand" href="#" aria-label="${escapeHtml(frameTitle)} home">
        <span class="brand-mark" aria-hidden="true">${escapeHtml(model.brandInitials)}</span>
        <span>${escapeHtml(model.brandName)}</span>
      </a>
      <nav class="nav" aria-label="Primary">
        ${model.navItems.map((item) => `<a href="#">${escapeHtml(item)}</a>`).join("\n        ")}
      </nav>
      <a class="nav-cta" href="#primary-action">${escapeHtml(model.primaryCta)}</a>
    </header>

    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="kicker">${escapeHtml(model.kicker)}</p>
        <h1 id="hero-title">${escapeHtml(model.headline)}</h1>
        <p class="lede">${escapeHtml(model.subhead)}</p>
        <div class="actions" id="primary-action">
          <a class="button primary" href="#">${escapeHtml(model.primaryCta)}</a>
          <a class="button secondary" href="#">${escapeHtml(model.secondaryCta)}</a>
        </div>
      </div>
      <div class="visual-system" aria-label="Generated composition from Canvax sketch">
        ${buildImplementationElementMarkup(model.elements, model.theme)}
      </div>
    </section>
    ${buildDesignerBriefMarkup(model)}
  </main>
  <script src="./app.js"></script>
</body>
</html>
`;
}

function buildImplementationCss(request) {
  const model = buildScreenModel(request);
  return `:root {
  ${themeCssVariables(model.theme)}
  --shadow: 0 28px 80px rgba(24, 17, 14, 0.18);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(18px, 3vw, 48px);
  background:
    radial-gradient(circle at 15% 8%, var(--wash-a), transparent 28%),
    radial-gradient(circle at 84% 22%, var(--wash-b), transparent 30%),
    var(--page-bg);
  color: var(--ink);
  font-family: var(--font-body);
}

a {
  color: inherit;
  text-decoration: none;
}

.canvax-screen {
  position: relative;
  width: min(100%, 1440px);
  aspect-ratio: var(--surface-ratio);
  min-height: min(74vh, 1024px);
  overflow: hidden;
  border: 1px solid rgba(24, 17, 14, 0.1);
  border-radius: 34px;
  background:
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px),
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(135deg, var(--surface-wash), transparent 46%),
    var(--paper);
  background-size: 64px 64px, 64px 64px, auto, auto;
  box-shadow: var(--shadow);
}

${themeAtmosphereCss()}

.topbar {
  position: absolute;
  inset: 24px 24px auto;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand,
.nav,
.nav-cta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(24, 17, 14, 0.12);
  background: rgba(255, 247, 232, 0.78);
  box-shadow: 0 16px 40px rgba(24, 17, 14, 0.08);
  backdrop-filter: blur(12px);
}

.brand,
.nav-cta {
  border-radius: 999px;
  padding: 10px 14px;
  font-weight: 900;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--red);
  color: white;
  font-size: 12px;
  letter-spacing: -0.04em;
}

.nav {
  border-radius: 999px;
  padding: 11px 16px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nav-cta {
  background: var(--ink);
  color: white;
}

.hero {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1fr);
  gap: clamp(24px, 4vw, 72px);
  align-items: end;
  padding: clamp(88px, 10vw, 150px) clamp(36px, 7vw, 108px) clamp(44px, 6vw, 92px);
}

.hero-copy {
  position: relative;
  z-index: 5;
  display: grid;
  gap: 18px;
}

.kicker {
  width: fit-content;
  margin: 0;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 93, 58, 0.14);
  color: var(--red);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  max-width: 11ch;
  font-family: "Iowan Old Style", Georgia, serif;
  font-family: var(--font-display);
  font-size: clamp(48px, 8vw, 132px);
  line-height: 0.88;
  letter-spacing: -0.07em;
}

.lede {
  margin: 0;
  max-width: 56ch;
  color: var(--muted);
  font-size: clamp(16px, 1.5vw, 22px);
  line-height: 1.45;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.button {
  width: fit-content;
  padding: 13px 18px;
  border: 2px solid var(--ink);
  box-shadow: 8px 8px 0 var(--ink);
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.button.primary {
  background: var(--red);
  color: white;
}

.button.secondary {
  background: white;
}

.visual-system {
  position: relative;
  z-index: 3;
  min-height: clamp(360px, 56vh, 720px);
}

.generated-node {
  position: absolute;
  display: grid;
  align-content: center;
  min-width: 64px;
  min-height: 48px;
  padding: 14px;
  border: 2px solid color-mix(in srgb, var(--node-color), var(--ink) 18%);
  background: color-mix(in srgb, var(--node-color), var(--paper) 84%);
  box-shadow: 12px 14px 0 rgba(24, 17, 14, 0.12);
  color: var(--ink);
  font-weight: 800;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.generated-node:hover,
.generated-node.is-selected {
  transform: translateY(-4px);
  box-shadow: 16px 20px 0 rgba(24, 17, 14, 0.15);
}

.generated-node.path,
.generated-node.line,
.generated-node.arrow {
  min-height: 10px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--node-color);
  box-shadow: none;
  transform: rotate(var(--angle, -8deg));
}

.generated-node.arrow::after {
  content: "";
  position: absolute;
  right: -10px;
  top: 50%;
  width: 0;
  height: 0;
  border-top: 14px solid transparent;
  border-bottom: 14px solid transparent;
  border-left: 24px solid var(--node-color);
  transform: translateY(-50%);
}

.generated-node.ellipse {
  border-radius: 999px;
}

.generated-node.label {
  border-radius: 18px;
  background: white;
}

.node-label {
  width: fit-content;
  margin-bottom: 6px;
  padding: 4px 9px;
  border-radius: 999px;
  background: white;
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.generated-node strong {
  font-size: clamp(16px, 2vw, 28px);
  line-height: 1;
}

.generated-node p {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.35;
}

.design-brief {
  position: absolute;
  right: clamp(20px, 4vw, 56px);
  bottom: clamp(18px, 3vw, 40px);
  z-index: 7;
  width: min(24rem, 34%);
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--ink), transparent 82%);
  border-radius: 22px;
  background: color-mix(in srgb, var(--paper), white 22%);
  box-shadow: 0 18px 50px color-mix(in srgb, var(--ink), transparent 86%);
}

.design-brief span {
  display: block;
  margin-bottom: 7px;
  color: var(--red);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.design-brief h2 {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: clamp(20px, 2vw, 32px);
  letter-spacing: -0.04em;
}

.design-brief ul {
  display: grid;
  gap: 5px;
  margin: 0;
  padding-left: 1rem;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.35;
}

@media (max-width: 820px) {
  body {
    padding: 0;
  }

  .canvax-screen {
    width: 100vw;
    min-height: 100vh;
    border-radius: 0;
  }

  .topbar {
    position: relative;
    inset: auto;
    padding: 18px;
  }

  .nav {
    display: none;
  }

  .hero {
    position: relative;
    grid-template-columns: 1fr;
    padding: 24px;
  }

  .visual-system {
    min-height: 420px;
  }

  .design-brief {
    position: relative;
    right: auto;
    bottom: auto;
    width: auto;
    margin: 18px;
  }
}
`;
}

function buildImplementationJs(request, { frameId, frameTitle }) {
  const model = buildScreenModel(request);
  return `const canvaxBuild = ${JSON.stringify(
    {
      frameId,
      frameTitle,
      generatedAt: new Date().toISOString(),
      source: "scripts/execute-build-request.mjs",
      requiresOpenAiApiKey: false,
      elementCount: model.elements.length,
      theme: model.theme.id,
      atmosphere: model.atmosphere.id,
      designerBrief: model.designerBrief,
    },
    null,
    2,
  )};

document.querySelectorAll(".generated-node").forEach((node) => {
  node.addEventListener("click", () => {
    node.classList.toggle("is-selected");
  });
});

console.info("Canvax implementation artifact", canvaxBuild);
`;
}

function buildReactScreenComponent(request, { frameId, frameTitle }) {
  const model = buildScreenModel(request);
  const nodes = model.elements.map((element, index) =>
    buildReactNodeModel(element, index, model.theme),
  );
  return `import "./CanvaxScreen.css";

const screen = ${JSON.stringify(
    {
      frameId,
      frameTitle,
      brandName: model.brandName,
      brandInitials: model.brandInitials,
      headline: model.headline,
      subhead: model.subhead,
      kicker: model.kicker,
      primaryCta: model.primaryCta,
      secondaryCta: model.secondaryCta,
      navItems: model.navItems,
      width: model.width,
      height: model.height,
      theme: model.theme,
      atmosphere: model.atmosphere,
      designerBrief: model.designerBrief,
      nodes,
    },
    null,
    2,
  )};

export default function CanvaxScreen() {
  return (
    <main
      className={\`canvaxReactScreen \${screen.theme.className}\`}
      data-frame-id={screen.frameId}
      data-canvax-theme={screen.theme.id}
      data-canvax-atmosphere={screen.atmosphere.id}
      style={{ "--surface-ratio": \`\${screen.width} / \${screen.height}\` }}
    >
      <CanvaxAtmosphere atmosphere={screen.atmosphere} />
      <header className="canvaxReactTopbar">
        <a className="canvaxReactBrand" href="#" aria-label={\`\${screen.frameTitle} home\`}>
          <span className="canvaxReactBrandMark" aria-hidden="true">
            {screen.brandInitials}
          </span>
          <span>{screen.brandName}</span>
        </a>
        <nav className="canvaxReactNav" aria-label="Primary">
          {screen.navItems.map((item) => (
            <a key={item} href="#">
              {item}
            </a>
          ))}
        </nav>
        <a className="canvaxReactNavCta" href="#primary-action">
          {screen.primaryCta}
        </a>
      </header>

      <section className="canvaxReactHero" aria-labelledby="canvax-react-hero-title">
        <div className="canvaxReactCopy">
          <p className="canvaxReactKicker">{screen.kicker}</p>
          <h1 id="canvax-react-hero-title">{screen.headline}</h1>
          <p className="canvaxReactLede">{screen.subhead}</p>
          <div className="canvaxReactActions" id="primary-action">
            <a className="canvaxReactButton canvaxReactButtonPrimary" href="#">
              {screen.primaryCta}
            </a>
            <a className="canvaxReactButton canvaxReactButtonSecondary" href="#">
              {screen.secondaryCta}
            </a>
          </div>
        </div>
        <div className="canvaxReactVisual" aria-label="Generated composition from Canvax sketch">
          {screen.nodes.map((node) => (
            <CanvaxNode key={node.id} node={node} />
          ))}
        </div>
      </section>
      {screen.designerBrief.length > 0 && (
        <aside className="canvaxReactBrief" aria-label="Designer implementation context">
          <span>Designer context</span>
          <h2>{screen.theme.label}</h2>
          <ul>
            {screen.designerBrief.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      )}
    </main>
  );
}

function CanvaxAtmosphere({ atmosphere }) {
  return (
    <div className="atmosphere" aria-hidden="true">
      <span className="atmosphere-layer atmosphere-band-one" />
      <span className="atmosphere-layer atmosphere-band-two" />
      <span className="atmosphere-layer atmosphere-orb" />
      <span className="atmosphere-label">{atmosphere.label}</span>
    </div>
  );
}

function CanvaxNode({ node }) {
  return (
    <article
      className={\`canvaxReactNode \${node.typeClass}\`}
      data-canvax-node-id={node.id}
      data-canvax-node-type={node.type}
      style={{
        left: node.left,
        top: node.top,
        width: node.width,
        height: node.height,
        "--node-color": node.color,
        "--angle": node.angle,
      }}
    >
      <span className="canvaxReactNodeLabel">{node.type}</span>
      <strong>{node.label}</strong>
      <p>{node.role}</p>
    </article>
  );
}
`;
}

function buildReactNodeModel(
  element,
  index,
  theme = defaultImplementationTheme(),
) {
  const bounds = element.bounds || {};
  const role = cleanString(element.role || element.type || "element");
  const label =
    cleanString(element.text) ||
    role
      .split(",")[0]
      .trim()
      .replace(/\bor\b.*/i, "") ||
    `Element ${index + 1}`;
  return {
    id: cleanString(element.id) || `element-${index + 1}`,
    type: cleanString(element.type || "element"),
    typeClass: safeCssClass(element.type || "rect"),
    label: compactText(label, 54),
    role: compactText(role, 82),
    color: normalizeColor(element.color) || elementColor(index, theme),
    left: percent(bounds.x, 0.12 + index * 0.03),
    top: percent(bounds.y, 0.14 + index * 0.04),
    width: percent(Math.max(bounds.w || 0.16, 0.04), 0.2),
    height: percent(Math.max(bounds.h || 0.08, 0.035), 0.1),
    angle: index % 2 ? "7deg" : "-6deg",
  };
}

function buildReactScreenCss(request) {
  const model = buildScreenModel(request);
  return `.canvaxReactScreen {
  ${themeCssVariables(model.theme)}
  --shadow: 0 28px 80px rgba(24, 17, 14, 0.18);
  position: relative;
  width: min(100%, 1440px);
  aspect-ratio: var(--surface-ratio);
  min-height: min(74vh, 1024px);
  overflow: hidden;
  border: 1px solid rgba(24, 17, 14, 0.1);
  border-radius: 34px;
  background:
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px),
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(135deg, var(--surface-wash), transparent 46%),
    var(--paper);
  background-size: 64px 64px, 64px 64px, auto, auto;
  box-shadow: var(--shadow);
  color: var(--ink);
  font-family: var(--font-body);
}

${themeAtmosphereCss()}

.canvaxReactTopbar {
  position: absolute;
  inset: 24px 24px auto;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.canvaxReactBrand,
.canvaxReactNav,
.canvaxReactNavCta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(24, 17, 14, 0.12);
  background: rgba(255, 247, 232, 0.78);
  box-shadow: 0 16px 40px rgba(24, 17, 14, 0.08);
  color: inherit;
  text-decoration: none;
}

.canvaxReactBrand,
.canvaxReactNavCta {
  border-radius: 999px;
  padding: 10px 14px;
  font-weight: 900;
}

.canvaxReactBrandMark {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  background: var(--red);
  color: white;
  font-size: 12px;
  letter-spacing: -0.04em;
}

.canvaxReactNav {
  border-radius: 999px;
  padding: 11px 16px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.canvaxReactNavCta {
  background: var(--ink);
  color: white;
}

.canvaxReactHero {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1fr);
  gap: clamp(24px, 4vw, 72px);
  align-items: end;
  padding: clamp(88px, 10vw, 150px) clamp(36px, 7vw, 108px) clamp(44px, 6vw, 92px);
}

.canvaxReactCopy {
  position: relative;
  z-index: 5;
  display: grid;
  gap: 18px;
}

.canvaxReactKicker {
  width: fit-content;
  margin: 0;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 93, 58, 0.14);
  color: var(--red);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.canvaxReactCopy h1 {
  margin: 0;
  max-width: 11ch;
  font-family: "Iowan Old Style", Georgia, serif;
  font-family: var(--font-display);
  font-size: clamp(48px, 8vw, 132px);
  line-height: 0.88;
  letter-spacing: -0.07em;
}

.canvaxReactLede {
  margin: 0;
  max-width: 56ch;
  color: var(--muted);
  font-size: clamp(16px, 1.5vw, 22px);
  line-height: 1.45;
}

.canvaxReactActions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.canvaxReactButton {
  width: fit-content;
  padding: 13px 18px;
  border: 2px solid var(--ink);
  box-shadow: 8px 8px 0 var(--ink);
  color: inherit;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-decoration: none;
  text-transform: uppercase;
}

.canvaxReactButtonPrimary {
  background: var(--red);
  color: white;
}

.canvaxReactButtonSecondary {
  background: white;
}

.canvaxReactVisual {
  position: relative;
  z-index: 3;
  min-height: clamp(360px, 56vh, 720px);
}

.canvaxReactNode {
  position: absolute;
  display: grid;
  min-width: 64px;
  min-height: 48px;
  align-content: center;
  padding: 14px;
  border: 2px solid color-mix(in srgb, var(--node-color), var(--ink) 18%);
  background: color-mix(in srgb, var(--node-color), var(--paper) 84%);
  box-shadow: 12px 14px 0 rgba(24, 17, 14, 0.12);
  color: var(--ink);
  font-weight: 800;
}

.canvaxReactNode.path,
.canvaxReactNode.line,
.canvaxReactNode.arrow {
  min-height: 10px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--node-color);
  box-shadow: none;
  transform: rotate(var(--angle, -8deg));
}

.canvaxReactNode.arrow::after {
  content: "";
  position: absolute;
  right: -10px;
  top: 50%;
  width: 0;
  height: 0;
  border-top: 14px solid transparent;
  border-bottom: 14px solid transparent;
  border-left: 24px solid var(--node-color);
  transform: translateY(-50%);
}

.canvaxReactNode.ellipse {
  border-radius: 999px;
}

.canvaxReactNode.label {
  border-radius: 18px;
  background: white;
}

.canvaxReactNodeLabel {
  width: fit-content;
  margin-bottom: 6px;
  padding: 4px 9px;
  border-radius: 999px;
  background: white;
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.canvaxReactNode strong {
  font-size: clamp(16px, 2vw, 28px);
  line-height: 1;
}

.canvaxReactNode p {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.35;
}

.canvaxReactBrief {
  position: absolute;
  right: clamp(20px, 4vw, 56px);
  bottom: clamp(18px, 3vw, 40px);
  z-index: 7;
  width: min(24rem, 34%);
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--ink), transparent 82%);
  border-radius: 22px;
  background: color-mix(in srgb, var(--paper), white 22%);
  box-shadow: 0 18px 50px color-mix(in srgb, var(--ink), transparent 86%);
}

.canvaxReactBrief span {
  display: block;
  margin-bottom: 7px;
  color: var(--red);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.canvaxReactBrief h2 {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: clamp(20px, 2vw, 32px);
  letter-spacing: -0.04em;
}

.canvaxReactBrief ul {
  display: grid;
  gap: 5px;
  margin: 0;
  padding-left: 1rem;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.35;
}

@media (max-width: 820px) {
  .canvaxReactScreen {
    width: 100vw;
    min-height: 100vh;
    border-radius: 0;
  }

  .canvaxReactTopbar {
    position: relative;
    inset: auto;
    padding: 18px;
  }

  .canvaxReactNav {
    display: none;
  }

  .canvaxReactHero {
    position: relative;
    grid-template-columns: 1fr;
    padding: 24px;
  }

  .canvaxReactVisual {
    min-height: 420px;
  }

  .canvaxReactBrief {
    position: relative;
    right: auto;
    bottom: auto;
    width: auto;
    margin: 18px;
  }
}
`;
}

function buildViteReactAdapter() {
  return `import CanvaxScreen from "./CanvaxScreen.jsx";

// Minimal Vite/React adapter. Import this from src/main.jsx while prototyping,
// or move <CanvaxScreen /> into the project's real route component.
export default function App() {
  return <CanvaxScreen />;
}
`;
}

function buildNextAppRouterAdapter(request, { frameTitle }) {
  const model = buildScreenModel(request);
  return `import CanvaxScreen from "./CanvaxScreen.jsx";

export const metadata = {
  title: ${JSON.stringify(frameTitle || model.headline)},
  description: ${JSON.stringify(compactText(model.subhead, 150))},
};

export default function Page() {
  return <CanvaxScreen />;
}
`;
}

function buildFrameworkAdaptersReadme(request, { frameId, frameTitle }) {
  const model = buildScreenModel(request);
  return `# Framework Adapters

Canvax generated these adapter files from frame \`${frameId}\` (${frameTitle}).

They are no-API starter handoffs. Codex should port, refactor, and integrate
them into the real project structure instead of treating them as final
production architecture.

## Files

- \`CanvaxScreen.jsx\`: portable React screen component with source-element bindings.
- \`CanvaxScreen.css\`: matching visual styles.
- \`ViteApp.jsx\`: minimal Vite/React app entry wrapper.
- \`NextAppPage.jsx\`: minimal Next.js App Router page wrapper.
- \`canvax-component-map.json\`: frame-to-code ownership and source-element map.
- \`codex-port-task.json\`: machine-readable task for porting into real app files.

## Vite / React

Copy these files into a React source folder:

\`\`\`text
src/canvax/${safeSlug(frameTitle || frameId)}/CanvaxScreen.jsx
src/canvax/${safeSlug(frameTitle || frameId)}/CanvaxScreen.css
src/canvax/${safeSlug(frameTitle || frameId)}/ViteApp.jsx
\`\`\`

Then render \`<CanvaxScreen />\` from the real route or import \`ViteApp.jsx\`
while prototyping.

## Next.js App Router

Copy \`CanvaxScreen.jsx\`, \`CanvaxScreen.css\`, and \`NextAppPage.jsx\` into a
route folder, then rename \`NextAppPage.jsx\` to \`page.jsx\`.

\`\`\`text
app/canvax/${safeSlug(frameTitle || frameId)}/page.jsx
app/canvax/${safeSlug(frameTitle || frameId)}/CanvaxScreen.jsx
app/canvax/${safeSlug(frameTitle || frameId)}/CanvaxScreen.css
\`\`\`

If the host framework restricts global CSS imports, move the
\`CanvaxScreen.css\` import into the nearest route layout or convert it to a CSS
module during the Codex implementation pass.

## Source Binding Contract

Preserve these attributes when porting:

- \`data-frame-id="${frameId}"\`
- \`data-canvax-node-id\`
- \`data-canvax-node-type\`

Those bindings let future Canvax correction marks map back to generated code.

## Current Screen Intent

- Headline: ${model.headline}
- Subhead: ${compactText(model.subhead, 180)}
- Primary action: ${model.primaryCta}
`;
}

function buildBuildIntegrationContract(request, { frameId, frameTitle }) {
  const model = buildScreenModel(request);
  const slug = safeSlug(frameTitle || frameId);
  const implementationContext = request.implementationContext || null;
  const designKit = request.designKit || implementationContext?.designKit || null;
  return {
    schemaVersion: 1,
    kind: "canvax-build-integration-contract",
    createdAt: new Date().toISOString(),
    source: "scripts/execute-build-request.mjs",
    requiresOpenAiApiKey: false,
    frame: {
      id: frameId,
      title: frameTitle,
      viewport:
        request.frame?.viewport || (model.width >= 900 ? "desktop" : "mobile"),
      width: model.width,
      height: model.height,
    },
    sourceRequest: {
      latestJson: "exports/canvax-build-real-latest.json",
      latestMarkdown: "exports/canvax-build-real-latest.md",
      context: "../context.json",
    },
    visualDirection: {
      themeId: model.theme.id,
      themeLabel: model.theme.label,
      atmosphereId: model.atmosphere.id,
      atmosphereLabel: model.atmosphere.label,
      atmosphereMotion: model.atmosphere.motion,
      designTokens: model.theme.designTokens || null,
      designerBrief: model.designerBrief,
    },
    designerImplementationContext: implementationContext
      ? {
          workbenchPath:
            implementationContext.workbench?.startPath ||
            "1 Sketch -> 2 Talk -> 3 Make -> 4 Map",
          workspaceMode:
            implementationContext.workbench?.workspaceModeLabel ||
            implementationContext.workbench?.workspaceMode ||
            "",
          focus:
            implementationContext.workbench?.focusLabel ||
            implementationContext.workbench?.focus ||
            "",
          action:
            implementationContext.workbench?.actionModeLabel ||
            implementationContext.workbench?.actionMode ||
            "",
          generationRecipe:
            implementationContext.workbench?.generationRecipe || "",
          designKit: designKit
            ? {
                label: designKit.statusLabel || designKit.label || "",
                presetId: designKit.preset?.id || "",
                presetLabel: designKit.preset?.label || "",
                summary: designKit.summary || "",
              }
            : null,
          variant: implementationContext.variant || null,
          selectedMapObjectCount:
            implementationContext.selectedMapContext?.objects?.length || 0,
          outputEditBinding:
            implementationContext.frameRole?.outputEditBinding ||
            request.outputEditBinding ||
            null,
          imageStyleLockSummary:
            implementationContext.imageDirection?.summary || "",
        }
      : null,
    localPreview: {
      html: "../index.html",
      standaloneHtml: "index.html",
      styles: "styles.css",
      script: "app.js",
    },
    frameworkAdapters: {
      react: {
        component: "CanvaxScreen.jsx",
        styles: "CanvaxScreen.css",
        render: "<CanvaxScreen />",
      },
      vite: {
        adapter: "ViteApp.jsx",
        suggestedDirectory: `src/canvax/${slug}/`,
      },
      nextAppRouter: {
        adapter: "NextAppPage.jsx",
        suggestedRoute: `app/canvax/${slug}/page.jsx`,
        cssNote:
          "If route-level global CSS imports are restricted, move CanvaxScreen.css to the nearest layout or convert it to a CSS module.",
      },
    },
    ownership: {
      componentMap: "canvax-component-map.json",
      portTask: "codex-port-task.json",
      acceptanceChecklist: "ACCEPTANCE.md",
      preserveSelectors: [
        `[data-frame-id="${frameId}"]`,
        "[data-canvax-node-id]",
        "[data-canvax-node-type]",
      ],
      generatedRegionCount: model.elements.length,
    },
    codexNextActions: [
      "Inspect the real project framework before copying files.",
      "Port CanvaxScreen.jsx and CanvaxScreen.css into the project's real component or route structure.",
      "Preserve data-canvax-node-id bindings or equivalent source comments so future correction marks can target generated regions.",
      `Publish the final route or artifact with scripts/write-codex-output.mjs --frame ${frameId}.`,
      "Do not introduce any OPENAI_API_KEY requirement for this local build handoff.",
    ],
    boundaries: {
      deterministicLocalScaffold: true,
      productionRouteAlreadyEdited: false,
      hostImageGenerationRequired: false,
      paidApiRequired: false,
    },
  };
}

function buildCodexPortTask(request, { frameId, frameTitle }) {
  const model = buildScreenModel(request);
  const slug = safeSlug(frameTitle || frameId);
  const implementationContext = request.implementationContext || {};
  const designKit = request.designKit || implementationContext.designKit || null;
  return {
    schemaVersion: 1,
    kind: "canvax-codex-port-task",
    createdAt: new Date().toISOString(),
    source: "scripts/execute-build-request.mjs",
    requiresOpenAiApiKey: false,
    purpose:
      "Port this no-API Canvax starter surface into the real application codebase while preserving frame-to-code bindings.",
    frame: {
      id: frameId,
      title: frameTitle,
      viewport:
        request.frame?.viewport || (model.width >= 900 ? "desktop" : "mobile"),
      width: model.width,
      height: model.height,
    },
    visualDirection: {
      themeId: model.theme.id,
      themeLabel: model.theme.label,
      atmosphereId: model.atmosphere.id,
      atmosphereLabel: model.atmosphere.label,
      designTokens: model.theme.designTokens || null,
      designerBrief: model.designerBrief,
    },
    designerContext: {
      workbenchPath:
        implementationContext.workbench?.startPath ||
        "1 Sketch -> 2 Talk -> 3 Make -> 4 Map",
      action:
        implementationContext.workbench?.actionModeLabel ||
        implementationContext.workbench?.actionMode ||
        request.actionModeLabel ||
        request.actionMode ||
        "",
      selectedMapPrompts:
        implementationContext.selectedMapContext?.prompts?.map((entry) => ({
          title: entry.title || "",
          prompt: entry.prompt || entry.contextMarkdown || "",
        })) || [],
      designKit: designKit
        ? {
            label: designKit.statusLabel || designKit.label || "",
            presetId: designKit.preset?.id || "",
            presetLabel: designKit.preset?.label || "",
            summary: designKit.summary || "",
          }
        : null,
      variant: implementationContext.variant || null,
      outputEditBinding:
        implementationContext.frameRole?.outputEditBinding ||
        request.outputEditBinding ||
        null,
    },
    sourceArtifacts: {
      previewHtml: "../index.html",
      contextJson: "../context.json",
      componentMap: "canvax-component-map.json",
      buildContract: "canvax-build-contract.json",
      integrationGuide: "INTEGRATION.md",
      acceptanceChecklist: "ACCEPTANCE.md",
      standaloneHtml: "index.html",
      standaloneCss: "styles.css",
      standaloneJs: "app.js",
      reactComponent: "CanvaxScreen.jsx",
      reactCss: "CanvaxScreen.css",
      viteAdapter: "ViteApp.jsx",
      nextAdapter: "NextAppPage.jsx",
    },
    suggestedDestinations: {
      react: {
        directory: `src/canvax/${slug}/`,
        files: ["CanvaxScreen.jsx", "CanvaxScreen.css"],
      },
      vite: {
        directory: `src/canvax/${slug}/`,
        files: ["CanvaxScreen.jsx", "CanvaxScreen.css", "ViteApp.jsx"],
      },
      nextAppRouter: {
        directory: `app/canvax/${slug}/`,
        files: ["page.jsx", "CanvaxScreen.jsx", "CanvaxScreen.css"],
      },
    },
    requiredBindings: [
      {
        selector: `[data-frame-id="${frameId}"]`,
        reason: "keeps future Canvax correction marks bound to this frame",
      },
      {
        selector: "[data-canvax-node-id]",
        reason: "maps sketch elements to generated regions/components",
      },
      {
        selector: "[data-canvax-node-type]",
        reason: "preserves rough sketch role/type during refactors",
      },
      {
        selector: "[data-canvax-theme]",
        reason: "keeps generated visual direction available to future rewrites",
      },
      {
        selector: "[data-canvax-atmosphere]",
        reason: "keeps generated atmosphere available to future rewrites",
      },
    ],
    portSteps: [
      "Inspect the host app framework, routing, styling, and design-system conventions before copying files.",
      "Choose the closest suggested destination for the host framework; do not create a parallel app if a real route/component already exists.",
      "Port or refactor CanvaxScreen.jsx and CanvaxScreen.css into production-quality host files.",
      "Replace placeholder links/text only when the host product context provides better content; preserve the sketched hierarchy unless the user asks otherwise.",
      "Preserve required data bindings or equivalent source comments from this task.",
      `Publish the final route/artifact with scripts/write-codex-output.mjs --frame ${frameId}.`,
    ],
    acceptanceCriteria: [
      "A real app/page/component renders the Canvax-designed screen.",
      "The output is bound back to the same frame through artifacts/canvax/codex-output.json.",
      "Future Canvax correction marks can map to data-canvax-node-id regions or equivalent comments.",
      "No OPENAI_API_KEY or paid local API requirement is introduced.",
      "The generated theme and atmosphere remain visible in the implementation or are intentionally translated into the host design system.",
    ],
    publishCommands: [
      `node scripts/write-codex-output.mjs --preview-path <real-preview-url-or-artifact> --label "${frameTitle} production implementation" --type implementation-preview --frame ${frameId}`,
      `node scripts/write-codex-output.mjs --change <path>::"Ported Canvax frame ${frameId}"::${frameId}`,
    ],
    nonGoals: [
      "Do not treat the local deterministic scaffold as finished production code.",
      "Do not remove source bindings unless replacing them with equivalent comments or component metadata.",
      "Do not add paid API-key configuration to complete this port task.",
    ],
  };
}

function buildIntegrationGuide(request, { frameId, frameTitle }) {
  const model = buildScreenModel(request);
  const slug = safeSlug(frameTitle || frameId);
  return `# Integration Guide

This guide is generated beside the Canvax implementation starter bundle.

- Frame id: \`${frameId}\`
- Frame title: ${frameTitle}
- Requires OpenAI API key: no
- Contract: \`canvax-build-contract.json\`
- Codex port task: \`codex-port-task.json\`
- Ownership map: \`canvax-component-map.json\`
- Acceptance checklist: \`ACCEPTANCE.md\`

## What This Bundle Is

This is a frame-bound starter surface, not a finished production route. Use it
to carry the sketch geometry, semantic labels, generated selectors, and visual
direction into the real app codebase.

## Recommended Codex Port

1. Inspect the host app framework, routing, styling conventions, and existing
   design system.
2. Copy or refactor \`CanvaxScreen.jsx\` and \`CanvaxScreen.css\` into the
   project's real source tree.
3. Preserve \`data-frame-id="${frameId}"\`, \`data-canvax-node-id\`, and
   \`data-canvax-node-type\` attributes, or add equivalent source comments.
4. Use \`canvax-component-map.json\` to map future sketch correction marks back
   to generated selectors.
5. Publish the real output back to Canvax with
   \`scripts/write-codex-output.mjs --frame ${frameId}\`.

## Vite / React Shape

\`\`\`text
src/canvax/${slug}/CanvaxScreen.jsx
src/canvax/${slug}/CanvaxScreen.css
src/canvax/${slug}/ViteApp.jsx
\`\`\`

Render \`<CanvaxScreen />\` from an existing route or use \`ViteApp.jsx\` while
prototyping.

## Next.js App Router Shape

\`\`\`text
app/canvax/${slug}/page.jsx
app/canvax/${slug}/CanvaxScreen.jsx
app/canvax/${slug}/CanvaxScreen.css
\`\`\`

Rename \`NextAppPage.jsx\` to \`page.jsx\`. If the app blocks global CSS imports
inside pages, move the CSS import to a route layout or convert the styles to a
CSS module during the production port.

## Current Screen Summary

- Headline: ${model.headline}
- Subhead: ${compactText(model.subhead, 180)}
- Primary action: ${model.primaryCta}
- Generated regions: ${model.elements.length}
`;
}

function buildAcceptanceChecklist(request, { frameId, frameTitle }) {
  const model = buildScreenModel(request);
  return `# Production Acceptance Checklist

Use this checklist when Codex ports the Canvax starter surface into a real app,
website, presentation surface, or product screen.

- Frame id: \`${frameId}\`
- Frame title: ${frameTitle}
- Requires OpenAI API key: no
- Source request: \`exports/canvax-build-real-latest.json\`
- Component map: \`canvax-component-map.json\`
- Build contract: \`canvax-build-contract.json\`
- Codex port task: \`codex-port-task.json\`

## Must Preserve

- Preserve \`data-frame-id="${frameId}"\` on the root rendered surface, or add an equivalent source comment.
- Preserve \`data-canvax-node-id\` / \`data-canvax-node-type\` on generated regions, or record equivalent component metadata.
- Preserve the visual direction: ${model.theme.label} / ${model.atmosphere.label}.
- Preserve the sketched hierarchy unless the user explicitly asks for a structural redesign.
- Preserve the no-API boundary: no \`OPENAI_API_KEY\` or paid local API dependency is required for this handoff.

## Production Readiness

- The real app route or component renders this screen without relying on \`artifacts/preview/\` as production source.
- The layout works at the target viewport and has an intentional responsive behavior for smaller screens.
- Text, buttons, links, and interactive elements have accessible labels and visible focus states.
- Placeholder content is replaced only when the host product context provides better copy.
- The generated theme/atmosphere is either visible in the final implementation or intentionally translated into the host design system.

## Publish Back To Canvax

After the production port, publish the connected output so Canvax can keep the
sketch-to-real loop alive:

\`\`\`bash
node scripts/write-codex-output.mjs --preview-path <real-preview-url-or-artifact> --label "${frameTitle} production implementation" --type implementation-preview --frame ${frameId}
node scripts/write-codex-output.mjs --change <path>::"Ported Canvax frame ${frameId}"::${frameId}
\`\`\`

## Definition Of Done

- A real route/component exists in the host project.
- \`artifacts/canvax/codex-output.json\` points to the current implementation preview or artifact.
- Future Canvax correction marks can map back to generated regions through preserved bindings or equivalent comments.
- No paid API key requirement was introduced.
`;
}

function buildImplementationReadme(request, { frameId, frameTitle }) {
  const model = buildScreenModel(request);
  return `# ${frameTitle} Implementation Artifact

This folder was generated by \`scripts/execute-build-request.mjs\` from the latest Canvax build request.

- Frame id: \`${frameId}\`
- Requires OpenAI API key: no
- Source request: \`exports/canvax-build-real-latest.json\`
- Preview entry: \`../index.html\`

## Files

- \`index.html\`: standalone generated screen markup
- \`styles.css\`: responsive visual system and generated element placement
- \`app.js\`: lightweight interaction/debug metadata
- \`CanvaxScreen.jsx\`: React-ready screen component for porting into an app route
- \`CanvaxScreen.css\`: matching React component styles
- \`ViteApp.jsx\`: minimal Vite/React app wrapper
- \`NextAppPage.jsx\`: minimal Next.js App Router page wrapper
- \`FRAMEWORK_ADAPTERS.md\`: adapter copy/porting notes for Codex
- \`canvax-build-contract.json\`: machine-readable porting and binding contract
- \`codex-port-task.json\`: machine-readable Codex task for production porting
- \`INTEGRATION.md\`: human-readable real-app integration guide
- \`ACCEPTANCE.md\`: production-readiness checklist for Codex and designers

## Intent

${model.subhead}

This is still a local deterministic implementation artifact. Treat it as a frame-bound starter surface that Codex can replace or port into the real app route/component when the user asks for production implementation.
`;
}

function defaultImplementationTheme() {
  return {
    id: "studio-paper",
    className: "theme-studio-paper",
    label: "Studio Paper",
    paper: "#fff7e8",
    ink: "#18110e",
    muted: "rgba(24, 17, 14, 0.66)",
    red: "#ff5d3a",
    teal: "#0c8d7b",
    blue: "#2364aa",
    gold: "#f0a202",
    pageBg: "#ece8de",
    washA: "rgba(255, 93, 58, 0.24)",
    washB: "rgba(35, 100, 170, 0.2)",
    surfaceWash: "rgba(255, 93, 58, 0.08)",
    gridLine: "rgba(24, 17, 14, 0.035)",
    fontDisplay: '"Iowan Old Style", Georgia, serif',
    fontBody: '"Avenir Next", "Segoe UI", sans-serif',
    nodePalette: ["#ff5d3a", "#0c8d7b", "#2364aa", "#f0a202", "#b246a8"],
  };
}

function buildImplementationTheme(request) {
  const base = defaultImplementationTheme();
  const signal = collectImplementationSignalText(request).toLowerCase();
  const presetId =
    cleanString(
      request.designKit?.preset?.id ||
        request.implementationContext?.designKit?.preset?.id,
    ) || "";
  let theme = { ...base };

  if (presetId === "poster-system") {
    theme = buildPosterArchiveTheme(theme);
  } else if (presetId === "storybook-spread" || presetId === "comic-storyboard") {
    theme = {
      ...theme,
      id: "storybook-spread",
      className: "theme-storybook-spread",
      label:
        presetId === "comic-storyboard" ? "Storyboard Ink" : "Storybook Spread",
      paper: "#fff1d7",
      ink: "#2c2119",
      muted: "rgba(44, 33, 25, 0.66)",
      red: "#d95f47",
      teal: "#3d9a91",
      blue: "#5f84b8",
      gold: "#e1a93a",
      pageBg: "#efe1c7",
      washA: "rgba(217, 95, 71, 0.2)",
      washB: "rgba(95, 132, 184, 0.18)",
      surfaceWash: "rgba(225, 169, 58, 0.1)",
      gridLine: "rgba(44, 33, 25, 0.035)",
      fontDisplay: '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
      nodePalette: ["#d95f47", "#3d9a91", "#5f84b8", "#e1a93a", "#7d5535"],
    };
  } else if (presetId === "dashboard-ops") {
    theme = {
      ...theme,
      id: "dashboard-ops",
      className: "theme-dashboard-ops",
      label: "Dashboard Ops",
      paper: "#f8faf7",
      ink: "#101827",
      muted: "rgba(16, 24, 39, 0.64)",
      red: "#df5a43",
      teal: "#0f9f8d",
      blue: "#315fba",
      gold: "#c9962e",
      pageBg: "#e8ece9",
      washA: "rgba(15, 159, 141, 0.16)",
      washB: "rgba(49, 95, 186, 0.18)",
      surfaceWash: "rgba(49, 95, 186, 0.07)",
      gridLine: "rgba(16, 24, 39, 0.04)",
      fontDisplay: '"Avenir Next", "Segoe UI", sans-serif',
      nodePalette: ["#315fba", "#0f9f8d", "#df5a43", "#c9962e", "#101827"],
    };
  } else if (
    /\b(constructiv|soviet|wpa|poster|wartime|art deco|futurism|archive|dispatch)\b/.test(
      signal,
    )
  ) {
    theme = buildPosterArchiveTheme(theme);
  } else if (/\b(midnight|dark|black|space|cinematic|neon|night)\b/.test(signal)) {
    theme = {
      ...theme,
      id: "midnight-cinema",
      className: "theme-midnight-cinema",
      label: "Midnight Cinema",
      paper: "#101820",
      ink: "#f8efe2",
      muted: "rgba(248, 239, 226, 0.68)",
      red: "#ff6b4a",
      teal: "#33d6c0",
      blue: "#7aa7ff",
      gold: "#f3b43f",
      pageBg: "#07090d",
      washA: "rgba(255, 107, 74, 0.2)",
      washB: "rgba(122, 167, 255, 0.24)",
      surfaceWash: "rgba(122, 167, 255, 0.1)",
      gridLine: "rgba(248, 239, 226, 0.055)",
      nodePalette: ["#ff6b4a", "#33d6c0", "#7aa7ff", "#f3b43f", "#e66bd6"],
    };
  } else if (/\b(minimal|quiet|calm|soft|wellness|pastel)\b/.test(signal)) {
    theme = {
      ...theme,
      id: "quiet-editorial",
      className: "theme-quiet-editorial",
      label: "Quiet Editorial",
      paper: "#fbf5ea",
      ink: "#20201d",
      muted: "rgba(32, 32, 29, 0.62)",
      red: "#cc6a4d",
      teal: "#6f9688",
      blue: "#6d83a6",
      gold: "#c8a45a",
      pageBg: "#efeee7",
      washA: "rgba(204, 106, 77, 0.16)",
      washB: "rgba(111, 150, 136, 0.16)",
      surfaceWash: "rgba(111, 150, 136, 0.08)",
      gridLine: "rgba(32, 32, 29, 0.026)",
      nodePalette: ["#cc6a4d", "#6f9688", "#6d83a6", "#c8a45a", "#d7b6a4"],
    };
  }

  theme = applyDesignTokenPalette(theme, request);

  const hexColors = collectHexColors(collectImplementationSignalText(request));
  if (hexColors.length) {
    theme = {
      ...theme,
      red: hexColors[0] || theme.red,
      teal: hexColors[1] || theme.teal,
      blue: hexColors[2] || theme.blue,
      nodePalette: [...hexColors, ...theme.nodePalette].slice(0, 5),
    };
  }

  return theme;
}

function applyDesignTokenPalette(theme, request) {
  const designTokens = collectDesignTokens(request);
  const tokenPalette = collectDesignTokenPalette(designTokens);
  if (!tokenPalette.length) {
    return theme;
  }
  const [primary, accent, support, highlight] = tokenPalette;
  const washAccent = accent || support || primary;
  return {
    ...theme,
    red: primary || theme.red,
    teal: accent || theme.teal,
    blue: support || theme.blue,
    gold: highlight || theme.gold,
    washA: hexToRgba(primary || theme.red, 0.24),
    washB: hexToRgba(washAccent || theme.blue, 0.2),
    surfaceWash: hexToRgba(primary || theme.red, 0.1),
    nodePalette: [...tokenPalette, ...theme.nodePalette].slice(0, 5),
    designTokens: {
      sourceFrameId: cleanString(designTokens?.sourceFrameId),
      sourceFrameTitle: cleanString(designTokens?.sourceFrameTitle),
      shapeLanguage: cleanString(designTokens?.shapeLanguage),
      density: cleanString(designTokens?.density?.label),
      summary: cleanString(designTokens?.summary),
      palette: tokenPalette,
      visualSamples: designTokens?.visualSamples || null,
    },
  };
}

function buildPosterArchiveTheme(theme = defaultImplementationTheme()) {
  return {
    ...theme,
    id: "poster-archive",
    className: "theme-poster-archive",
    label: "Poster Archive",
    paper: "#f1dfb8",
    ink: "#14100d",
    muted: "rgba(20, 16, 13, 0.68)",
    red: "#c43122",
    teal: "#1b7f75",
    blue: "#315f86",
    gold: "#c6922f",
    pageBg: "#241916",
    washA: "rgba(196, 49, 34, 0.32)",
    washB: "rgba(198, 146, 47, 0.22)",
    surfaceWash: "rgba(196, 49, 34, 0.14)",
    gridLine: "rgba(20, 16, 13, 0.055)",
    fontDisplay: '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
    nodePalette: ["#c43122", "#14100d", "#c6922f", "#315f86", "#f1dfb8"],
  };
}

function buildThemeAtmosphere(theme = defaultImplementationTheme()) {
  if (theme.id === "poster-archive") {
    return {
      id: "constructivist-poster",
      label: "ARCHIVE DISPATCH",
      motion: "Diagonal poster geometry with public-information tension.",
    };
  }
  if (theme.id === "midnight-cinema") {
    return {
      id: "orbital-cinema",
      label: "ORBITAL FIELD",
      motion: "Slow cinematic halo layers behind the generated interface.",
    };
  }
  if (theme.id === "quiet-editorial") {
    return {
      id: "editorial-index",
      label: "FIELD NOTES",
      motion: "Quiet index marks and magazine pacing.",
    };
  }
  if (theme.id === "storybook-spread") {
    return {
      id: "storybook-lightbox",
      label: "STORY SPREAD",
      motion: "Warm layered illustration fields for character and scene continuity.",
    };
  }
  if (theme.id === "dashboard-ops") {
    return {
      id: "data-operations-grid",
      label: "DATA OPS",
      motion: "Structured signal layers behind analytics and decision surfaces.",
    };
  }
  return {
    id: "studio-diagram",
    label: "LIVE BUILD MAP",
    motion: "Warm studio diagram layers behind the rough-to-real surface.",
  };
}

function buildAtmosphereMarkup(atmosphere) {
  return `<div class="atmosphere" aria-hidden="true">
      <span class="atmosphere-layer atmosphere-band-one"></span>
      <span class="atmosphere-layer atmosphere-band-two"></span>
      <span class="atmosphere-layer atmosphere-orb"></span>
      <span class="atmosphere-label">${escapeHtml(atmosphere.label)}</span>
    </div>`;
}

function themeAtmosphereCss() {
  return `.atmosphere {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  pointer-events: none;
}

.atmosphere-layer {
  position: absolute;
  display: block;
}

.atmosphere-band-one {
  left: -14%;
  top: 36%;
  width: 72%;
  height: 24%;
  background: color-mix(in srgb, var(--red), transparent 24%);
  transform: rotate(-16deg);
  transform-origin: center;
  mix-blend-mode: multiply;
}

.atmosphere-band-two {
  right: -18%;
  top: 10%;
  width: 54%;
  height: 18%;
  border: 2px solid color-mix(in srgb, var(--gold), transparent 22%);
  transform: rotate(12deg);
}

.atmosphere-orb {
  right: 12%;
  bottom: 10%;
  width: clamp(220px, 26vw, 420px);
  aspect-ratio: 1;
  border: 1px solid color-mix(in srgb, var(--blue), transparent 42%);
  border-radius: 50%;
  background:
    radial-gradient(circle at 42% 38%, color-mix(in srgb, var(--gold), transparent 42%), transparent 34%),
    radial-gradient(circle at 60% 70%, color-mix(in srgb, var(--red), transparent 68%), transparent 44%);
  opacity: 0.7;
}

.atmosphere-label {
  position: absolute;
  right: clamp(24px, 4vw, 64px);
  top: clamp(82px, 11vw, 150px);
  max-width: 18ch;
  color: color-mix(in srgb, var(--ink), transparent 20%);
  font-size: clamp(12px, 1vw, 15px);
  font-weight: 900;
  letter-spacing: 0.22em;
  line-height: 1.25;
  text-transform: uppercase;
}

.theme-poster-archive .atmosphere {
  background:
    linear-gradient(115deg, transparent 0 48%, color-mix(in srgb, var(--ink), transparent 91%) 48% 50%, transparent 50%),
    repeating-linear-gradient(90deg, color-mix(in srgb, var(--ink), transparent 94%) 0 1px, transparent 1px 28px);
}

.theme-poster-archive .atmosphere-band-one {
  left: -18%;
  top: 42%;
  width: 86%;
  height: 20%;
  background: color-mix(in srgb, var(--red), transparent 8%);
}

.theme-poster-archive .atmosphere-band-two {
  right: 4%;
  top: 18%;
  width: 34%;
  height: 16%;
  background: color-mix(in srgb, var(--gold), transparent 18%);
  border: 0;
  clip-path: polygon(0 0, 92% 14%, 100% 82%, 8% 100%);
}

.theme-poster-archive .atmosphere-orb {
  border-width: 18px;
  border-color: color-mix(in srgb, var(--red), transparent 74%);
  background: transparent;
}

.theme-midnight-cinema .atmosphere {
  background:
    radial-gradient(circle at 72% 22%, color-mix(in srgb, var(--blue), transparent 70%), transparent 26%),
    radial-gradient(circle at 28% 78%, color-mix(in srgb, var(--teal), transparent 82%), transparent 30%);
}

.theme-midnight-cinema .atmosphere-band-one,
.theme-midnight-cinema .atmosphere-band-two {
  border: 1px solid color-mix(in srgb, var(--blue), transparent 50%);
  border-radius: 999px;
  background: transparent;
  mix-blend-mode: screen;
}

.theme-midnight-cinema .atmosphere-band-one {
  left: 38%;
  top: 12%;
  width: 58%;
  height: 58%;
  transform: rotate(-20deg);
}

.theme-midnight-cinema .atmosphere-band-two {
  right: 8%;
  top: 34%;
  width: 44%;
  height: 22%;
  transform: rotate(18deg);
}

.theme-quiet-editorial .atmosphere-band-one {
  left: 8%;
  top: 18%;
  width: 1px;
  height: 64%;
  background: color-mix(in srgb, var(--ink), transparent 82%);
  transform: none;
}

.theme-quiet-editorial .atmosphere-band-two {
  right: 12%;
  top: 18%;
  width: 22%;
  height: 1px;
  border: 0;
  background: color-mix(in srgb, var(--ink), transparent 82%);
  transform: none;
}

.theme-quiet-editorial .atmosphere-orb {
  right: 8%;
  bottom: 12%;
  width: clamp(160px, 20vw, 320px);
  border-color: color-mix(in srgb, var(--teal), transparent 64%);
  background: transparent;
}

.theme-storybook-spread .atmosphere {
  background:
    radial-gradient(circle at 22% 24%, color-mix(in srgb, var(--gold), transparent 70%), transparent 22%),
    linear-gradient(110deg, transparent 0 42%, color-mix(in srgb, var(--blue), transparent 88%) 42% 44%, transparent 44%);
}

.theme-storybook-spread .atmosphere-band-one {
  left: -12%;
  top: 58%;
  width: 72%;
  height: 18%;
  border-radius: 999px;
  background: color-mix(in srgb, var(--gold), transparent 36%);
  transform: rotate(-8deg);
}

.theme-storybook-spread .atmosphere-band-two {
  right: -8%;
  top: 24%;
  width: 44%;
  height: 30%;
  border-radius: 48% 52% 42% 58%;
  background: color-mix(in srgb, var(--blue), transparent 76%);
  border: 0;
  transform: rotate(9deg);
}

.theme-dashboard-ops .atmosphere {
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--blue), transparent 94%) 1px, transparent 1px),
    linear-gradient(color-mix(in srgb, var(--teal), transparent 94%) 1px, transparent 1px);
  background-size: 42px 42px;
}

.theme-dashboard-ops .atmosphere-band-one {
  left: 8%;
  top: 22%;
  width: 28%;
  height: 1px;
  background: color-mix(in srgb, var(--blue), transparent 36%);
  transform: none;
}

.theme-dashboard-ops .atmosphere-band-two {
  right: 10%;
  top: 38%;
  width: 22%;
  height: 1px;
  border: 0;
  background: color-mix(in srgb, var(--teal), transparent 34%);
  transform: none;
}`;
}

function collectImplementationSignalText(request) {
  const context = request.implementationContext || {};
  const designKit = request.designKit || context.designKit || {};
  const designTokens = collectDesignTokens(request);
  const variant = context.variant || {};
  const styleProperties = variant.styleProperties || {};
  const selectedObjects = context.selectedMapContext?.objects || [];
  const selectedPrompts = context.selectedMapContext?.prompts || [];
  const designKitSources = Array.isArray(designKit.sources)
    ? designKit.sources
    : [];
  return [
    designKit.statusLabel,
    designKit.label,
    designKit.summary,
    designKit.preset?.label,
    designKit.preset?.summary,
    designTokens?.summary,
    designTokens?.shapeLanguage,
    designTokens?.density?.label,
    ...(designTokens?.palette || []).map((entry) => entry.hex),
    ...designKitSources.map((source) =>
      [source.label, source.detail].join(" "),
    ),
    request.board?.mood,
    request.board?.designMood,
    request.board?.goal,
    request.board?.generationRecipe,
    context.workbench?.generationRecipe,
    variant.label,
    variant.direction,
    variant.thesis,
    variant.prompt,
    ...(variant.designMoves || []),
    ...Object.values(styleProperties),
    context.imageDirection?.summary,
    ...selectedObjects.map((object) =>
      [object.title, object.prompt, object.contextMarkdown].join(" "),
    ),
    ...selectedPrompts.map((entry) => entry.prompt || entry.contextMarkdown),
  ]
    .filter(Boolean)
    .join(" ");
}

function collectHexColors(value) {
  return [
    ...new Set(String(value || "").match(/#[0-9a-f]{3}(?:[0-9a-f]{3})?/gi) || []),
  ].slice(0, 5);
}

function collectDesignTokens(request) {
  const context = request.implementationContext || {};
  return (
    request.designKit?.designTokens ||
    context.designKit?.designTokens ||
    context.imageDirection?.styleLock?.designTokens ||
    null
  );
}

function collectDesignTokenPalette(designTokens) {
  if (!Array.isArray(designTokens?.palette)) {
    return [];
  }
  return [
    ...new Set(
      designTokens.palette
        .map((entry) => normalizeExpandedHex(entry?.hex || entry))
        .filter(Boolean),
    ),
  ].slice(0, 5);
}

function normalizeExpandedHex(value) {
  const color = normalizeColor(value);
  if (!color) {
    return "";
  }
  const hex = color.slice(1);
  if (hex.length === 3) {
    return `#${hex
      .split("")
      .map((character) => `${character}${character}`)
      .join("")
      .toLowerCase()}`;
  }
  return color.toLowerCase();
}

function hexToRgba(hex, alpha = 1) {
  const color = normalizeExpandedHex(hex);
  if (!color) {
    return `rgba(24, 17, 14, ${alpha})`;
  }
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function themeCssVariables(theme = defaultImplementationTheme()) {
  return [
    `--paper: ${theme.paper};`,
    `--ink: ${theme.ink};`,
    `--muted: ${theme.muted};`,
    `--red: ${theme.red};`,
    `--teal: ${theme.teal};`,
    `--blue: ${theme.blue};`,
    `--gold: ${theme.gold};`,
    `--page-bg: ${theme.pageBg};`,
    `--wash-a: ${theme.washA};`,
    `--wash-b: ${theme.washB};`,
    `--surface-wash: ${theme.surfaceWash};`,
    `--grid-line: ${theme.gridLine};`,
    `--font-display: ${theme.fontDisplay};`,
    `--font-body: ${theme.fontBody};`,
  ].join("\n  ");
}

function buildDesignerBrief(request, theme) {
  const context = request.implementationContext || {};
  const designKit = request.designKit || context.designKit || null;
  const designTokens = collectDesignTokens(request);
  const variant = context.variant || null;
  const selectedObjects = context.selectedMapContext?.objects || [];
  const selectedPrompts = context.selectedMapContext?.prompts || [];
  const brief = [
    designKit?.statusLabel || designKit?.label
      ? `Design kit: ${designKit.statusLabel || designKit.label}`
      : "",
    designKit?.preset?.summary
      ? `Kit preset: ${designKit.preset.summary}`
      : "",
    designTokens?.summary
      ? `Sketch tokens: ${designTokens.summary}`
      : "",
    variant?.label ? `${variant.label} direction: ${variant.thesis || variant.prompt || variant.direction}` : "",
    context.workbench?.generationRecipe
      ? `Recipe: ${context.workbench.generationRecipe}`
      : "",
    theme?.label ? `Theme: ${theme.label}` : "",
    ...selectedObjects.map((object) => object.prompt || object.contextMarkdown),
    ...selectedPrompts.map((entry) => entry.prompt || entry.contextMarkdown),
    context.imageDirection?.summary
      ? `Style lock: ${context.imageDirection.summary}`
      : "",
  ]
    .map((item) => compactText(item, 150))
    .filter(Boolean);
  return [...new Set(brief)].slice(0, 4);
}

function buildDesignerBriefMarkup(model) {
  if (!model.designerBrief?.length) {
    return "";
  }
  return `<aside class="design-brief" aria-label="Designer implementation context">
      <span class="eyebrow">Designer context</span>
      <h2>${escapeHtml(model.theme?.label || "Canvax direction")}</h2>
      <ul>
        ${model.designerBrief.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n        ")}
      </ul>
    </aside>`;
}

function buildScreenModel(request) {
  const frame = request.frame || {};
  const composition = frame.composition || {};
  const viewport = composition.viewport || {};
  const theme = buildImplementationTheme(request);
  const atmosphere = buildThemeAtmosphere(theme);
  const width = Number(viewport.width || frame.viewportWidth || 1440);
  const height = Number(viewport.height || frame.viewportHeight || 1024);
  const elements = Array.isArray(composition.elements)
    ? composition.elements.slice(0, 24)
    : [];
  const board = request.board || {};
  const headline =
    firstMeaningfulLabel(elements) ||
    cleanString(board.project) ||
    cleanString(frame.title) ||
    "Canvax generated surface";
  const subhead =
    cleanString(frame.intent) ||
    cleanString(board.goal) ||
    "Generated from rough sketch geometry, labels, and voice notes.";
  const brandName =
    cleanString(board.project) ||
    cleanString(frame.title) ||
    "Canvax build";
  return {
    width,
    height,
    elements,
    headline,
    subhead,
    brandName,
    brandInitials: initials(brandName),
    kicker: cleanString(request.actionModeLabel || request.actionMode) || "Build UI",
    primaryCta: primaryCtaFromElements(elements) || "Start now",
    secondaryCta: "Review design",
    navItems: ["Overview", "Details", "Archive"],
    theme,
    atmosphere,
    designerBrief: buildDesignerBrief(request, theme),
  };
}

function buildImplementationElementMarkup(
  elements,
  theme = defaultImplementationTheme(),
) {
  return elements
    .map((element, index) => {
      const bounds = element.bounds || {};
      const color = normalizeColor(element.color) || elementColor(index, theme);
      const left = percent(bounds.x, 0.12 + index * 0.03);
      const top = percent(bounds.y, 0.14 + index * 0.04);
      const width = percent(Math.max(bounds.w || 0.16, 0.04), 0.2);
      const height = percent(Math.max(bounds.h || 0.08, 0.035), 0.1);
      const role = cleanString(element.role || element.type || "element");
      const text =
        cleanString(element.text) ||
        role
          .split(",")[0]
          .trim()
          .replace(/\bor\b.*/i, "") ||
        `Element ${index + 1}`;
      const type = safeCssClass(element.type || "rect");
      const sourceId = cleanString(element.id) || `element-${index + 1}`;
      return `<article class="generated-node ${type}" data-canvax-node-id="${escapeHtml(sourceId)}" data-canvax-node-type="${escapeHtml(element.type || "element")}" style="left:${left};top:${top};width:${width};height:${height};--node-color:${color};--angle:${index % 2 ? "7deg" : "-6deg"}">
          <span class="node-label">${escapeHtml(element.type || "element")}</span>
          <strong>${escapeHtml(compactText(text, 54))}</strong>
          <p>${escapeHtml(compactText(role, 82))}</p>
        </article>`;
    })
    .join("\n        ");
}

function buildPreviewHtml(request) {
  const frame = request.frame || {};
  const model = buildScreenModel(request);
  const theme = model.theme;
  const composition = frame.composition || {};
  const viewport = composition.viewport || {};
  const width = Number(viewport.width || frame.viewportWidth || 1440);
  const height = Number(viewport.height || frame.viewportHeight || 1024);
  const elements = Array.isArray(composition.elements)
    ? composition.elements.slice(0, 24)
    : [];
  const board = request.board || {};
  const actionMode = cleanString(request.actionModeLabel || request.actionMode);
  const headline =
    firstMeaningfulLabel(elements) ||
    cleanString(board.project) ||
    cleanString(frame.title) ||
    "Canvax generated surface";
  const subhead =
    cleanString(frame.intent) ||
    cleanString(board.goal) ||
    "Generated from rough sketch geometry, labels, and voice notes.";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(headline)}</title>
  <style>
    :root {
      ${themeCssVariables(theme)}
      --shadow: 0 28px 80px rgba(24, 17, 14, 0.18);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: clamp(18px, 3vw, 48px);
      background:
        radial-gradient(circle at 15% 8%, var(--wash-a), transparent 28%),
        radial-gradient(circle at 80% 18%, var(--wash-b), transparent 30%),
        var(--page-bg);
      color: var(--ink);
      font-family: var(--font-body);
    }
    .surface {
      position: relative;
      width: min(100%, ${width}px);
      aspect-ratio: ${width} / ${height};
      min-height: min(72vh, ${height}px);
      overflow: hidden;
      border: 1px solid rgba(24, 17, 14, 0.1);
      border-radius: 34px;
      background:
        linear-gradient(90deg, var(--grid-line) 1px, transparent 1px),
        linear-gradient(var(--grid-line) 1px, transparent 1px),
        linear-gradient(135deg, var(--surface-wash), transparent 46%),
        var(--paper);
      background-size: 64px 64px, 64px 64px, auto, auto;
      box-shadow: var(--shadow);
    }
    ${themeAtmosphereCss()}
    .chrome {
      position: absolute;
      inset: 24px 24px auto;
      z-index: 4;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      color: rgba(24, 17, 14, 0.68);
      font-size: clamp(12px, 1.3vw, 16px);
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .hero-copy {
      position: absolute;
      z-index: 3;
      left: 7%;
      bottom: 9%;
      width: min(48%, 640px);
      display: grid;
      gap: 18px;
    }
    h1 {
      margin: 0;
      max-width: 11ch;
      font-family: "Iowan Old Style", Georgia, serif;
      font-family: var(--font-display);
      font-size: clamp(48px, 8vw, 132px);
      line-height: 0.88;
      letter-spacing: -0.07em;
    }
    .subhead {
      margin: 0;
      max-width: 56ch;
      color: rgba(24, 17, 14, 0.72);
      font-size: clamp(16px, 1.5vw, 22px);
      line-height: 1.45;
    }
    .cta {
      width: fit-content;
      padding: 13px 18px;
      border: 2px solid var(--ink);
      background: var(--red);
      color: white;
      box-shadow: 8px 8px 0 var(--ink);
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .node {
      position: absolute;
      z-index: 2;
      display: grid;
      align-content: center;
      min-width: 60px;
      min-height: 44px;
      padding: 14px;
      border: 2px solid color-mix(in srgb, var(--node-color), var(--ink) 18%);
      background: color-mix(in srgb, var(--node-color), var(--paper) 84%);
      box-shadow: 12px 14px 0 rgba(24, 17, 14, 0.12);
      color: var(--ink);
      font-weight: 800;
    }
    .node-label {
      display: inline-flex;
      width: fit-content;
      margin-bottom: 6px;
      padding: 4px 9px;
      border-radius: 999px;
      background: white;
      color: rgba(24, 17, 14, 0.68);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .node strong {
      font-size: clamp(16px, 2vw, 28px);
      line-height: 1;
    }
    .node p {
      margin: 8px 0 0;
      color: rgba(24, 17, 14, 0.58);
      font-size: 14px;
      line-height: 1.35;
    }
    .node.path,
    .node.line,
    .node.arrow {
      min-height: 10px;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: var(--node-color);
      box-shadow: none;
      transform: rotate(var(--angle, -8deg));
    }
    .node.arrow::after {
      content: "";
      position: absolute;
      right: -10px;
      top: 50%;
      width: 0;
      height: 0;
      border-top: 14px solid transparent;
      border-bottom: 14px solid transparent;
      border-left: 24px solid var(--node-color);
      transform: translateY(-50%);
    }
    .node.ellipse { border-radius: 999px; }
    .node.label {
      border-radius: 18px;
      background: white;
      box-shadow: 0 16px 36px rgba(24, 17, 14, 0.12);
    }
    .node.image {
      border-style: dashed;
      background:
        linear-gradient(135deg, rgba(12, 141, 123, 0.14), transparent),
        #f7efe0;
    }
    .design-brief {
      position: absolute;
      right: clamp(18px, 3vw, 42px);
      top: clamp(84px, 9vw, 128px);
      z-index: 5;
      width: min(340px, 36%);
      display: grid;
      gap: 10px;
      padding: 18px;
      border: 1px solid rgba(24, 17, 14, 0.14);
      border-radius: 22px;
      background: color-mix(in srgb, var(--paper), white 64%);
      box-shadow: 0 18px 52px rgba(24, 17, 14, 0.14);
      color: rgba(24, 17, 14, 0.74);
    }
    .design-brief .eyebrow {
      color: var(--red);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .design-brief h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(20px, 2vw, 34px);
      letter-spacing: -0.04em;
      color: var(--ink);
    }
    .design-brief ul {
      margin: 0;
      padding: 0 0 0 18px;
      display: grid;
      gap: 8px;
      line-height: 1.35;
    }
    @media (max-width: 760px) {
      body { padding: 0; }
      .surface { width: 100vw; min-height: 100vh; border-radius: 0; }
      .hero-copy { left: 6%; right: 6%; bottom: 7%; width: auto; }
      .design-brief {
        position: static;
        width: auto;
        margin: 24px;
      }
      .node { opacity: 0.9; }
    }
  </style>
</head>
<body>
  <main class="surface ${escapeHtml(theme.className)}" data-frame-id="${escapeHtml(frame.id || "")}" data-canvax-theme="${escapeHtml(theme.id)}" data-canvax-atmosphere="${escapeHtml(model.atmosphere.id)}">
    ${buildAtmosphereMarkup(model.atmosphere)}
    <div class="chrome">
      <span>${escapeHtml(cleanString(frame.title) || "Canvax frame")}</span>
      <span>${escapeHtml(actionMode || "Build UI")}</span>
    </div>
    ${buildElementMarkup(elements, theme)}
    <section class="hero-copy">
      <h1>${escapeHtml(headline)}</h1>
      <p class="subhead">${escapeHtml(subhead)}</p>
      <div class="cta">Generated from Canvax</div>
    </section>
    ${buildDesignerBriefMarkup(model)}
  </main>
</body>
</html>
`;
}

function buildElementMarkup(elements, theme = defaultImplementationTheme()) {
  return elements
    .map((element, index) => buildElementNode(element, index, theme))
    .join("\n");
}

function buildElementNode(element, index, theme = defaultImplementationTheme()) {
  const bounds = element.bounds || {};
  const color = normalizeColor(element.color) || elementColor(index, theme);
  const left = percent(bounds.x, 0.12 + index * 0.03);
  const top = percent(bounds.y, 0.14 + index * 0.04);
  const width = percent(Math.max(bounds.w || 0.16, 0.04), 0.2);
  const height = percent(Math.max(bounds.h || 0.08, 0.035), 0.1);
  const role = cleanString(element.role || element.type || "element");
  const text =
    cleanString(element.text) ||
    role
      .split(",")[0]
      .trim()
      .replace(/\bor\b.*/i, "") ||
    `Element ${index + 1}`;
  const type = safeCssClass(element.type || "rect");
  const sourceId = cleanString(element.id) || `element-${index + 1}`;
  return `    <article class="node ${type}" data-canvax-node-id="${escapeHtml(sourceId)}" data-canvax-node-type="${escapeHtml(element.type || "element")}" style="left:${left};top:${top};width:${width};height:${height};--node-color:${color};--angle:${index % 2 ? "7deg" : "-6deg"}">
      <span class="node-label">${escapeHtml(element.type || "element")}</span>
      <strong>${escapeHtml(compactText(text, 54))}</strong>
      <p>${escapeHtml(compactText(role, 82))}</p>
    </article>`;
}

function buildFrameCodeMap(request, { frameId, frameTitle }) {
  const model = buildScreenModel(request);
  const safeComponentName = `${pascalCase(frameTitle || frameId)}Screen`;
  return {
    schemaVersion: 1,
    kind: "canvax-frame-code-map",
    createdAt: new Date().toISOString(),
    source: "scripts/execute-build-request.mjs",
    requiresOpenAiApiKey: false,
    frame: {
      id: frameId,
      title: frameTitle,
      viewport:
        request.frame?.viewport || (model.width >= 900 ? "desktop" : "mobile"),
      width: model.width,
      height: model.height,
    },
    ownership: {
      componentName: safeComponentName,
      routeSuggestion: `/canvax/${safeSlug(frameTitle || frameId)}`,
      previewEntry: "../index.html",
      implementationRoot: "implementation/",
      files: [
        {
          path: "implementation/index.html",
          role: "standalone markup and frame-bound component structure",
        },
        {
          path: "implementation/styles.css",
          role: "responsive visual system and source-element placement",
        },
        {
          path: "implementation/app.js",
          role: "lightweight interaction hooks and debug metadata",
        },
        {
          path: "implementation/CanvaxScreen.jsx",
          role: "React-ready screen component preserving source-element selectors",
        },
        {
          path: "implementation/CanvaxScreen.css",
          role: "portable React component styles",
        },
        {
          path: "implementation/ViteApp.jsx",
          role: "minimal Vite/React app adapter",
        },
        {
          path: "implementation/NextAppPage.jsx",
          role: "minimal Next.js App Router page adapter",
        },
        {
          path: "implementation/FRAMEWORK_ADAPTERS.md",
          role: "framework porting instructions for Codex",
        },
        {
          path: "implementation/canvax-component-map.json",
          role: "frame-to-code ownership and source-element mapping",
        },
        {
          path: "implementation/canvax-build-contract.json",
          role: "machine-readable integration and no-API boundary contract",
        },
        {
          path: "implementation/codex-port-task.json",
          role: "machine-readable task for Codex to port this starter into real app files",
        },
        {
          path: "implementation/INTEGRATION.md",
          role: "human-readable framework porting guide",
        },
        {
          path: "implementation/ACCEPTANCE.md",
          role: "production-readiness checklist for Codex and designers",
        },
        {
          path: "implementation/README.md",
          role: "human-readable implementation notes",
        },
      ],
    },
    generatedSelectors: {
      screenRoot: `[data-frame-id="${frameId}"]`,
      nodeSelector: "[data-canvax-node-id]",
      sourceIdAttribute: "data-canvax-node-id",
      sourceTypeAttribute: "data-canvax-node-type",
    },
    regions: model.elements.map((element, index) =>
      buildFrameCodeRegion(element, index),
    ),
    codexInstructions: [
      "Use this map to port the local HTML/CSS/JS bundle into real app/page/component files.",
      "Preserve data-canvax-node-id attributes or equivalent component comments when creating production code.",
      "When the user sketches over a generated region, map the correction back to the matching region id before rewriting code.",
      "After editing real files, publish the result with scripts/write-codex-output.mjs and bind it to this frame id.",
    ],
  };
}

function buildFrameCodeRegion(element, index) {
  const sourceId = cleanString(element.id) || `element-${index + 1}`;
  const role = cleanString(element.role || element.type || "element");
  const text =
    cleanString(element.text) ||
    role
      .split(",")[0]
      .trim()
      .replace(/\bor\b.*/i, "") ||
    `Element ${index + 1}`;
  return {
    id: sourceId,
    type: cleanString(element.type || "element"),
    label: compactText(text, 80),
    role: compactText(role, 120),
    color: normalizeColor(element.color) || elementColor(index),
    bounds: normalizeBounds(element.bounds),
    implementationSelector: `[data-canvax-node-id="${sourceId}"]`,
    suggestedComponentName: `${pascalCase(text || sourceId)}Region`,
    source: {
      elementId: sourceId,
      elementIndex: index,
      roughSketchType: cleanString(element.type || "element"),
    },
  };
}

function normalizeBounds(bounds = {}) {
  return {
    x: clamp01(bounds.x),
    y: clamp01(bounds.y),
    w: clamp01(bounds.w),
    h: clamp01(bounds.h),
  };
}

function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(1, numeric));
}

function pascalCase(value) {
  const text = cleanString(value)
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();
  if (!text) {
    return "Canvax";
  }
  return text
    .split(/\s+/)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("")
    .replace(/[^a-z0-9]/gi, "");
}

function firstMeaningfulLabel(elements) {
  return (
    elements
      .filter((element) => element.type === "label")
      .map((element) => cleanString(element.text))
      .find((text) => text && text.length > 2) || ""
  );
}

function primaryCtaFromElements(elements) {
  return (
    elements
      .map((element) => cleanString(element.text))
      .find((text) => /\b(start|join|buy|book|get|try|apply|create|learn)\b/i.test(text)) ||
    ""
  );
}

function initials(value) {
  const letters = cleanString(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return letters || "CX";
}

function elementColor(index, theme = defaultImplementationTheme()) {
  const colors = Array.isArray(theme.nodePalette) && theme.nodePalette.length
    ? theme.nodePalette
    : defaultImplementationTheme().nodePalette;
  return colors[index % colors.length];
}

function percent(value, fallback) {
  const numeric = Number.isFinite(value) ? value : fallback;
  return `${Math.max(0, Math.min(1, numeric)) * 100}%`;
}

function normalizeColor(value) {
  const text = cleanString(value);
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(text) ? text : "";
}

function safeCssClass(value) {
  return cleanString(value).replace(/[^a-z0-9_-]/gi, "-") || "element";
}

function compactText(value, maxLength = 120) {
  const text = cleanString(value).replace(/\s+/g, " ");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function cleanString(value) {
  return String(value || "").trim();
}

function safeSlug(value) {
  return (
    cleanString(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "frame"
  );
}

function toProjectRelative(filePath) {
  return relative(projectRoot, filePath).replaceAll("\\", "/");
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    fail(
      `Could not read ${filePath}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

function readOption(inputArgs, flag) {
  const index = inputArgs.findIndex((entry) => entry === flag);
  return index >= 0 && inputArgs[index + 1] ? inputArgs[index + 1].trim() : "";
}

function collectChild(child) {
  return new Promise((resolvePromise) => {
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      resolvePromise({ stdout, stderr, code });
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printHelp() {
  console.log(`execute-build-request

Usage:
  node scripts/execute-build-request.mjs
  node scripts/execute-build-request.mjs --request exports/canvax-build-real-latest.json
  node scripts/execute-build-request.mjs --no-publish --json

Reads a Canvax build-real request, writes a local HTML preview artifact under
artifacts/preview/codex-build/frames/<frame-id>/, and publishes a Codex output
manifest binding unless --no-publish is provided.

This is a deterministic local executor for validation and preview binding. It
does not call a paid API and does not replace a real Codex implementation pass.`);
}
