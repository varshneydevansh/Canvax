import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const args = process.argv.slice(2);
const wantsJson = args.includes("--json");
const wantsDryRun = args.includes("--dry-run");
const noPublish = args.includes("--no-publish");
const includeProjectLink = !args.includes("--no-project-link");
const resultRoot = resolve(
  projectRoot,
  readOption(args, "--result-root") ||
    "artifacts/canvax/applied-patches/latest",
);
const latestJsonPath = resolve(resultRoot, "result.json");
const latestMarkdownPath = resolve(resultRoot, "result.md");
const projectLinkPath = resolve(
  projectRoot,
  "exports",
  "canvax-project-link-latest.json",
);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const taskOption = readOption(args, "--task");
if (!taskOption) {
  fail("Provide --task artifacts/preview/.../codex-patch-task.json");
}

const taskPath = resolve(projectRoot, taskOption);
const task = await readJson(taskPath);
const projectLink = await readOptionalJson(projectLinkPath);

if (task?.kind !== "canvax-codex-patch-task") {
  fail(`Expected canvax-codex-patch-task at ${taskPath}`);
}

const plan = await buildPatchPlan(task, taskPath, projectLink);
const changes = [];

for (const file of plan.files) {
  if (file.kind === "react-screen") {
    changes.push(await patchReactScreen(file, plan));
  } else if (
    file.kind === "standalone-html" ||
    file.kind === "html-route" ||
    file.kind === "project-html-route" ||
    file.kind === "source-hinted-html"
  ) {
    changes.push(await patchStandaloneHtml(file, plan));
  } else if (
    file.kind === "jsx-component" ||
    file.kind === "project-component" ||
    file.kind === "source-hinted-component"
  ) {
    changes.push(await patchStaticJsx(file, plan));
  } else if (
    file.kind === "css" ||
    file.kind === "project-css" ||
    file.kind === "source-hinted-css"
  ) {
    changes.push(await patchCss(file, plan));
  } else if (file.kind === "source-hinted-task-note") {
    changes.push(await patchTaskNote(file, plan));
  }
}

const changedFiles = changes.filter((change) => change.changed);
const sourceDiscoveryCandidateCount =
  Number(plan.sourceDiscovery?.candidateCount) || 0;
const status = changedFiles.length
  ? "patched"
  : plan.sourceDiscovery
    ? sourceDiscoveryCandidateCount > 0
      ? "source-discovered"
      : "source-search-empty"
    : "no-op";
const result = {
  kind: "canvax-applied-patch-result",
  schemaVersion: 1,
  status,
  requiresOpenAiApiKey: false,
  createdAt: new Date().toISOString(),
  source: "scripts/execute-patch-task.mjs",
  dryRun: wantsDryRun,
  taskPath: toProjectRelative(taskPath),
  frameId: task.frameId || "",
  frameTitle: task.frameTitle || "",
  trigger: task.trigger || null,
  note: plan.note,
  targetIds: plan.targetIds,
  motion: plan.motion,
  projectLinkExpansion: plan.projectLinkExpansion,
  sourceHintExpansion: plan.sourceHintExpansion,
  sourceDiscovery: plan.sourceDiscovery,
  sourceDiscovered: status === "source-discovered",
  sourceDiscoveryCandidateCount,
  changedFiles: changedFiles.map((change) => ({
    path: change.path,
    kind: change.kind,
    summary: change.summary,
    targetIds: change.targetIds || plan.targetIds,
  })),
  skippedFiles: changes
    .filter((change) => !change.changed)
    .map((change) => ({
      path: change.path,
      kind: change.kind,
      reason: change.reason || "No matching target found.",
    })),
  noApiBoundary:
    "This executor applies a local deterministic patch to Canvax-generated, production-like proof, explicit source-hinted, or explicit project-linked implementation files. It does not call paid APIs, ChatGPT, image generation, or browser automation.",
};

await mkdir(resultRoot, { recursive: true });
await writeFile(latestJsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
await writeFile(latestMarkdownPath, buildMarkdown(result), "utf8");

let publishResult = null;
if (!wantsDryRun && !noPublish && changedFiles.length) {
  publishResult = await publishCodexOutput(result, task);
}

const output = {
  ok: true,
  status,
  dryRun: wantsDryRun,
  taskPath: result.taskPath,
  resultPath: toProjectRelative(latestJsonPath),
  markdownPath: toProjectRelative(latestMarkdownPath),
  frameId: result.frameId,
  changedFileCount: changedFiles.length,
  changedFiles: result.changedFiles,
  projectLinkExpansion: result.projectLinkExpansion,
  sourceHintExpansion: result.sourceHintExpansion,
  sourceDiscovery: result.sourceDiscovery,
  sourceDiscovered: result.sourceDiscovered,
  sourceDiscoveryCandidateCount: result.sourceDiscoveryCandidateCount,
  published: Boolean(publishResult),
  manifestPath: publishResult?.manifestPath || "",
};

if (wantsJson) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log(
    `${wantsDryRun ? "Prepared" : "Applied"} Canvax patch task: ${result.taskPath}`,
  );
  console.log(`Changed files: ${changedFiles.length}`);
  console.log(`Result: ${toProjectRelative(latestJsonPath)}`);
  if (publishResult) {
    console.log(`Published Codex output manifest: ${publishResult.manifestPath}`);
  }
}

async function buildPatchPlan(task, absoluteTaskPath, projectLink) {
  const note = cleanString(task.trigger?.note || task.affectedRegions?.[0]?.note);
  const targetIds = selectPatchTargetIds(task, note);
  const motion = inferMotion(note);
  const { files, projectLinkExpansion, sourceHintExpansion } = classifyPatchFiles(
    task.suggestedFiles || [],
    projectLink,
    {
      frameId: cleanString(task.frameId),
      targetIds,
    },
  );
  if (!files.length) {
    if (Array.isArray(task.sourceSearchHints) && task.sourceSearchHints.length) {
      const sourceDiscovery = await discoverLiveEditSourceCandidates(
        task,
        absoluteTaskPath,
      );
      return {
        task,
        note,
        targetIds,
        motion,
        files,
        projectLinkExpansion,
        sourceHintExpansion,
        sourceDiscovery,
        patchState: "source-discovery",
        patchNote:
          note ||
          "Discovered likely source candidates for an unhinted Live Edit target.",
      };
    }
    fail(
      `Patch task has no local Canvax-generated, production-proof, source-hinted, or project-linked implementation files: ${toProjectRelative(absoluteTaskPath)}`,
    );
  }
  if (!targetIds.length) {
    fail(`Patch task has no component targets: ${toProjectRelative(absoluteTaskPath)}`);
  }
  return {
    task,
    note,
    targetIds,
    motion,
    files,
    projectLinkExpansion,
    sourceHintExpansion,
    sourceDiscovery: null,
    patchState: "applied",
    patchNote: note || "Applied Canvax patch task.",
  };
}

function selectPatchTargetIds(task, note) {
  const lowerNote = note.toLowerCase();
  const candidates = Array.isArray(task.componentTargets)
    ? task.componentTargets.filter((component) => {
        const type = cleanString(component.type).toLowerCase();
        const label = `${component.id || ""} ${component.label || ""}`.toLowerCase();
        const humanLabel = cleanString(component.label).toLowerCase();
        return (
          component.id &&
          !["arrow", "line", "path"].includes(type) &&
          !/\b(frame|background|container)\b/.test(humanLabel)
        );
      })
    : [];
  const intentMatches = candidates.filter((component) => {
    const label = `${component.id || ""} ${component.label || ""}`.toLowerCase();
    if (/\b(cta|button|action|primary)\b/.test(lowerNote)) {
      return /\b(cta|button|action|primary)\b/.test(label);
    }
    if (/\b(headline|title|copy)\b/.test(lowerNote)) {
      return /\b(headline|title|copy)\b/.test(label);
    }
    if (/\b(image|visual|media|asset)\b/.test(lowerNote)) {
      return /\b(image|visual|media|asset|preview)\b/.test(label);
    }
    return false;
  });
  const selected = intentMatches.length ? intentMatches : candidates;
  return selected.slice(0, 4).map((component) => component.id);
}

function inferMotion(note) {
  const lower = note.toLowerCase();
  const delta = {
    x: 0,
    y: 0,
    scale: 1,
    reason: "metadata-only",
  };
  if (/\b(up|upward|higher|raise|toward top)\b/.test(lower)) {
    delta.y -= 0.07;
    delta.reason = "move-up";
  }
  if (/\b(down|downward|lower)\b/.test(lower)) {
    delta.y += 0.07;
    delta.reason = "move-down";
  }
  if (/\b(left|west)\b/.test(lower)) {
    delta.x -= 0.05;
    delta.reason = delta.reason === "metadata-only" ? "move-left" : delta.reason;
  }
  if (/\b(right|east)\b/.test(lower)) {
    delta.x += 0.05;
    delta.reason = delta.reason === "metadata-only" ? "move-right" : delta.reason;
  }
  if (/\b(tighten|closer|compact)\b/.test(lower)) {
    delta.y += delta.y === 0 ? -0.03 : Math.sign(delta.y) * 0.02;
    delta.reason = delta.reason === "metadata-only" ? "tighten-spacing" : delta.reason;
  }
  return delta;
}

function classifyPatchFiles(files, projectLink, context = {}) {
  const seen = new Set();
  const linkedFiles = collectProjectLinkedFiles(projectLink);
  const sourceHintExpansion = {
    enabled: true,
    sources: [],
    addedFiles: [],
  };
  const classifiedFiles = files
    .map(normalizePatchFileCandidate)
    .filter((candidate) => candidate.path)
    .map((candidate) => {
      const path = candidate.path;
      const isGeneratedBundle = path.startsWith("artifacts/preview/codex-build/");
      const isProductionProof = path.startsWith(
        "artifacts/canvax/production-port-proof/",
      ) || path.startsWith(".canvax/production-port-proof/");
      const linkedFile = findProjectLinkedFile(path, linkedFiles);
      if (!isGeneratedBundle && !isProductionProof) {
        if (linkedFile) {
          return classifyProjectLinkedFile(linkedFile);
        }
        const sourceHintFile = classifyLiveEditSourceHintFile(candidate);
        if (sourceHintFile) {
          sourceHintExpansion.sources.push(candidate.source || candidate.role);
          sourceHintExpansion.addedFiles.push(sourceHintFile.path);
          return sourceHintFile;
        }
        return null;
      }
      if (isGeneratedBundle && path.endsWith("/implementation/CanvaxScreen.jsx")) {
        return { path, kind: "react-screen" };
      }
      if (isGeneratedBundle && path.endsWith("/implementation/index.html")) {
        return { path, kind: "standalone-html" };
      }
      if (isProductionProof && path.endsWith(".html")) {
        return { path, kind: "html-route" };
      }
      if (isProductionProof && path.endsWith(".jsx")) {
        return { path, kind: "jsx-component" };
      }
      if (
        (isGeneratedBundle &&
          (path.endsWith("/implementation/styles.css") ||
            path.endsWith("/implementation/CanvaxScreen.css"))) ||
        (isProductionProof && path.endsWith(".css"))
      ) {
        return { path, kind: "css" };
      }
      return null;
    })
    .filter(Boolean)
    .filter((file) => {
      if (seen.has(file.path)) {
        return false;
      }
      seen.add(file.path);
      return true;
    });
  const projectLinkExpansion = buildProjectLinkExpansion(
    classifiedFiles,
    linkedFiles,
    context,
    seen,
  );
  return {
    files: [...classifiedFiles, ...projectLinkExpansion.files],
    projectLinkExpansion: projectLinkExpansion.summary,
    sourceHintExpansion: {
      ...sourceHintExpansion,
      sources: [...new Set(sourceHintExpansion.sources.filter(Boolean))],
      addedFiles: [...new Set(sourceHintExpansion.addedFiles)],
    },
  };
}

function normalizePatchFileCandidate(file) {
  if (typeof file === "string") {
    return {
      path: cleanString(file),
      role: "",
      source: "",
    };
  }
  if (!file || typeof file !== "object" || Array.isArray(file)) {
    return {
      path: "",
      role: "",
      source: "",
    };
  }
  return {
    path: cleanString(file.path || file.file),
    role: cleanString(file.role),
    source: cleanString(file.source),
  };
}

function classifyLiveEditSourceHintFile(candidate) {
  if (!isLiveEditSourceHintCandidate(candidate)) {
    return null;
  }
  const absolutePath = resolveMaybeProjectPath(candidate.path);
  if (!isPatchableSourceHintPath(absolutePath)) {
    return null;
  }
  const path = toProjectRelative(absolutePath);
  const lowerPath = path.toLowerCase();
  if (lowerPath.endsWith(".html")) {
    return { path, kind: "source-hinted-html" };
  }
  if (
    lowerPath.endsWith(".jsx") ||
    lowerPath.endsWith(".tsx") ||
    lowerPath.endsWith(".js") ||
    lowerPath.endsWith(".ts")
  ) {
    return { path, kind: "source-hinted-component" };
  }
  if (lowerPath.endsWith(".css")) {
    return { path, kind: "source-hinted-css" };
  }
  if (
    lowerPath.endsWith(".md") ||
    lowerPath.endsWith(".mdx") ||
    lowerPath.endsWith(".txt")
  ) {
    return { path, kind: "source-hinted-task-note" };
  }
  return null;
}

async function discoverLiveEditSourceCandidates(task, absoluteTaskPath) {
  const hints = normalizeSourceSearchHints(task.sourceSearchHints);
  const sourceFiles = await collectSearchableSourceFiles(projectRoot);
  const candidates = [];
  for (const file of sourceFiles) {
    const matches = await matchSourceSearchHintsInFile(file, hints);
    if (!matches.length) {
      continue;
    }
    const score = matches.reduce((sum, match) => sum + match.score, 0);
    candidates.push({
      path: toProjectRelative(file.absolutePath),
      kind: file.kind,
      score,
      confidence: score >= 14 ? "high" : score >= 8 ? "medium" : "low",
      matchCount: matches.length,
      matches: matches.slice(0, 12),
    });
  }
  candidates.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return {
    kind: "canvax-live-edit-source-discovery-result",
    schemaVersion: 1,
    requiresOpenAiApiKey: false,
    createdAt: new Date().toISOString(),
    status: candidates.length ? "candidates-found" : "no-candidates-found",
    taskPath: toProjectRelative(absoluteTaskPath),
    targetId: cleanString(task.liveEdit?.target?.targetId || task.trigger?.id),
    targetLabel: cleanString(task.liveEdit?.target?.targetLabel),
    hintCount: hints.length,
    searchedFileCount: sourceFiles.length,
    candidateCount: candidates.length,
    candidates: candidates.slice(0, 12),
    nextAction: candidates.length
      ? "Review these files as likely source/task targets for the accepted Live Edit pick, then add explicit source hints or project-link bindings before applying deterministic patches."
      : "No local source candidates were found from the Live Edit search hints; Codex should inspect the project manually before editing.",
    noApiBoundary:
      "This source discovery scans local workspace text files only. It does not call paid APIs, browser automation, ChatGPT, or image generation.",
  };
}

function normalizeSourceSearchHints(value) {
  const hints = Array.isArray(value) ? value : [];
  const seen = new Set();
  return hints
    .flatMap((hint, index) => {
      const query = cleanString(hint?.query);
      if (!query) {
        return [];
      }
      const base = {
        kind: cleanString(hint.kind) || "live-edit-source-search",
        searchType: cleanString(hint.searchType) || `hint-${index + 1}`,
        confidence: cleanString(hint.confidence) || "medium",
        targetId: cleanString(hint.targetId),
        targetNodeId: cleanString(hint.targetNodeId),
        targetSelector: cleanString(hint.targetSelector),
        targetLabel: cleanString(hint.targetLabel),
      };
      return buildSourceSearchTerms(query).map((term) => ({
        ...base,
        ...term,
      }));
    })
    .filter((hint) => {
      const key = `${hint.searchType}:${hint.matchType}:${hint.term.toLowerCase()}`;
      if (!hint.term || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 40);
}

function buildSourceSearchTerms(query) {
  const terms = [
    {
      term: query,
      matchType: "exact-query",
      score: selectorLike(query) ? 10 : 5,
    },
  ];
  const attributeMatches = [...query.matchAll(/\[?([A-Za-z_:][-A-Za-z0-9_:.]*)=["']([^"']+)["']\]?/g)];
  attributeMatches.forEach((match) => {
    terms.push({
      term: `${match[1]}="${match[2]}"`,
      matchType: "attribute-pair",
      score: 9,
    });
    terms.push({
      term: match[2],
      matchType: "attribute-value",
      score: 7,
    });
  });
  if (!attributeMatches.length && /^[#.][A-Za-z0-9_-]+$/.test(query)) {
    terms.push({
      term: query.slice(1),
      matchType: "selector-token",
      score: 6,
    });
  }
  return terms;
}

function selectorLike(value) {
  return /[[\].#=]/.test(cleanString(value));
}

async function collectSearchableSourceFiles(root) {
  const files = [];
  async function visit(directory) {
    let entries = [];
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absolutePath = resolve(directory, entry.name);
      const relativePath = toProjectRelative(absolutePath);
      if (entry.isDirectory()) {
        if (shouldSkipSourceSearchDirectory(relativePath, entry.name)) {
          continue;
        }
        await visit(absolutePath);
        continue;
      }
      if (!entry.isFile() || !isSearchableSourceFile(relativePath)) {
        continue;
      }
      try {
        const info = await stat(absolutePath);
        if (info.size > 500_000) {
          continue;
        }
      } catch {
        continue;
      }
      files.push({
        absolutePath,
        kind: sourceFileKind(relativePath),
      });
      if (files.length >= 3000) {
        return;
      }
    }
  }
  await visit(root);
  return files;
}

function shouldSkipSourceSearchDirectory(relativePath, name) {
  const lower = relativePath.toLowerCase();
  return (
    name === "node_modules" ||
    name === ".git" ||
    lower === "exports" ||
    lower.startsWith("exports/") ||
    lower === "artifacts" ||
    lower.startsWith("artifacts/preview/") ||
    lower.startsWith("artifacts/canvax/applied-patches/")
  );
}

function isSearchableSourceFile(relativePath) {
  const lower = relativePath.toLowerCase();
  return (
    lower.endsWith(".html") ||
    lower.endsWith(".jsx") ||
    lower.endsWith(".tsx") ||
    lower.endsWith(".js") ||
    lower.endsWith(".ts") ||
    lower.endsWith(".css") ||
    lower.endsWith(".md") ||
    lower.endsWith(".mdx") ||
    lower.endsWith(".txt")
  );
}

function sourceFileKind(relativePath) {
  const lower = relativePath.toLowerCase();
  if (lower.endsWith(".html")) {
    return "html";
  }
  if (lower.endsWith(".css")) {
    return "css";
  }
  if (lower.endsWith(".md") || lower.endsWith(".mdx") || lower.endsWith(".txt")) {
    return "task-note";
  }
  return "component";
}

async function matchSourceSearchHintsInFile(file, hints) {
  let raw = "";
  try {
    raw = await readFile(file.absolutePath, "utf8");
  } catch {
    return [];
  }
  const lines = raw.split(/\r?\n/);
  const matches = [];
  hints.forEach((hint) => {
    lines.forEach((line, index) => {
      if (!line.includes(hint.term)) {
        return;
      }
      matches.push({
        line: index + 1,
        searchType: hint.searchType,
        matchType: hint.matchType,
        query: hint.term,
        score: hint.score,
        confidence: hint.confidence,
        excerpt: compactText(line.trim(), 180),
      });
    });
  });
  return matches;
}

function isLiveEditSourceHintCandidate(candidate) {
  const source = cleanString(candidate.source).toLowerCase();
  const role = cleanString(candidate.role).toLowerCase();
  return (
    source === "accepted-live-edit-target" ||
    source === "accepted-live-edit-task" ||
    source === "accepted-live-edit-source-hint" ||
    source === "component-target-source-hint" ||
    role.includes("source hint") ||
    role.includes("picked target") ||
    role.includes("component source") ||
    role.includes("component task")
  );
}

function isPatchableSourceHintPath(absolutePath) {
  const relativePath = toProjectRelative(absolutePath);
  const lowerAbsolute = absolutePath.toLowerCase();
  const lowerRelative = relativePath.toLowerCase();
  if (
    lowerAbsolute.includes("/node_modules/") ||
    lowerAbsolute.includes("/.git/") ||
    lowerRelative.startsWith("node_modules/") ||
    lowerRelative.startsWith(".git/")
  ) {
    return false;
  }
  if (/^[a-z]+:\/\//i.test(relativePath)) {
    return false;
  }
  return absolutePath.startsWith(`${projectRoot}/`);
}

function collectProjectLinkedFiles(projectLink) {
  if (projectLink?.kind !== "canvax-project-link") {
    return [];
  }
  const files = [
    ...(Array.isArray(projectLink.codexEditContract?.editableFiles)
      ? projectLink.codexEditContract.editableFiles
      : []),
    ...(Array.isArray(projectLink.linkedFiles) ? projectLink.linkedFiles : []),
  ];
  const seen = new Set();
  return files
    .map((file) => {
      const path = cleanString(file.path);
      if (!path) {
        return null;
      }
      const absolutePath = resolveMaybeProjectPath(path);
      const key = absolutePath;
      if (seen.has(key)) {
        return null;
      }
      seen.add(key);
      const preserveBindings = Array.isArray(file.preserveBindings)
        ? file.preserveBindings
        : [];
      const summaryBindings = Array.isArray(file.summary?.bindings)
        ? file.summary.bindings
        : [];
      const frameIds = Array.isArray(file.frameIds) ? file.frameIds : [];
      return {
        path: toProjectRelative(absolutePath),
        absolutePath,
        role: cleanString(file.role),
        frameIds,
        bindings: [...new Set([...preserveBindings, ...summaryBindings])],
      };
    })
    .filter(Boolean);
}

function buildProjectLinkExpansion(classifiedFiles, linkedFiles, context, seen) {
  const frameId = cleanString(context.frameId);
  const targetIds = Array.isArray(context.targetIds) ? context.targetIds : [];
  const summary = {
    enabled: includeProjectLink,
    source: "exports/canvax-project-link-latest.json",
    frameId,
    matchedTargetIds: [],
    addedFiles: [],
  };
  if (!includeProjectLink || !linkedFiles.length || !frameId || !targetIds.length) {
    return { files: [], summary };
  }
  const frameLinkedFiles = linkedFiles.filter(
    (file) => !file.frameIds.length || file.frameIds.includes(frameId),
  );
  const matchedTargetIds = targetIds.filter((targetId) =>
    frameLinkedFiles.some((file) => file.bindings.includes(targetId)),
  );
  summary.matchedTargetIds = matchedTargetIds;
  if (!matchedTargetIds.length) {
    return { files: [], summary };
  }
  const hasExplicitProjectFiles = classifiedFiles.some((file) =>
    file.kind?.startsWith("project-"),
  );
  if (hasExplicitProjectFiles) {
    return { files: [], summary };
  }
  const files = frameLinkedFiles
    .map(classifyProjectLinkedFile)
    .filter(Boolean)
    .filter((file) => {
      if (seen.has(file.path)) {
        return false;
      }
      seen.add(file.path);
      return true;
    });
  summary.addedFiles = files.map((file) => file.path);
  return { files, summary };
}

function findProjectLinkedFile(path, linkedFiles) {
  const absolutePath = resolveMaybeProjectPath(path);
  return linkedFiles.find((file) => file.absolutePath === absolutePath) || null;
}

function classifyProjectLinkedFile(file) {
  const lowerPath = file.path.toLowerCase();
  const role = file.role.toLowerCase();
  if (lowerPath.endsWith(".html") || role === "route") {
    return { path: file.path, kind: "project-html-route" };
  }
  if (
    lowerPath.endsWith(".jsx") ||
    lowerPath.endsWith(".tsx") ||
    lowerPath.endsWith(".js") ||
    lowerPath.endsWith(".ts") ||
    role === "component"
  ) {
    return { path: file.path, kind: "project-component" };
  }
  if (lowerPath.endsWith(".css") || role === "stylesheet") {
    return { path: file.path, kind: "project-css" };
  }
  return null;
}

async function patchReactScreen(file, plan) {
  const absolutePath = resolve(projectRoot, file.path);
  const raw = await readFile(absolutePath, "utf8");
  const marker = "const screen = ";
  const start = raw.indexOf(marker);
  const endMarker = ";\n\nexport default function CanvaxScreen";
  const end = raw.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    return skipped(file, "React screen model was not found.");
  }
  const jsonStart = start + marker.length;
  const screen = JSON.parse(raw.slice(jsonStart, end));
  const changedNodes = [];
  screen.nodes = Array.isArray(screen.nodes)
    ? screen.nodes.map((node) => {
        if (!plan.targetIds.includes(node.id)) {
          return node;
        }
        changedNodes.push(node.id);
        return patchNodeModel(node, plan);
      })
    : [];
  if (!changedNodes.length) {
    return skipped(file, "No matching React nodes found.");
  }
  screen.patchHistory = [
    ...(Array.isArray(screen.patchHistory) ? screen.patchHistory : []),
    buildPatchHistoryEntry(plan, changedNodes),
  ].slice(-12);
  let nextRaw =
    raw.slice(0, jsonStart) +
    JSON.stringify(screen, null, 2) +
    raw.slice(end);
  nextRaw = ensureReactPatchAttributes(nextRaw);
  if (!wantsDryRun) {
    await writeFile(absolutePath, nextRaw, "utf8");
  }
  return changed(file, `Updated ${changedNodes.length} React node positions.`, changedNodes);
}

async function patchStandaloneHtml(file, plan) {
  const absolutePath = resolve(projectRoot, file.path);
  let raw = await readFile(absolutePath, "utf8");
  const changedIds = [];
  plan.targetIds.forEach((targetId) => {
    const nextRaw = patchHtmlNode(raw, targetId, plan);
    if (nextRaw !== raw) {
      raw = nextRaw;
      changedIds.push(targetId);
    }
  });
  if (!changedIds.length) {
    return skipped(file, "No matching standalone HTML nodes found.");
  }
  if (!wantsDryRun) {
    await writeFile(absolutePath, raw, "utf8");
  }
  return changed(file, `Updated ${changedIds.length} standalone HTML node positions.`, changedIds);
}

async function patchStaticJsx(file, plan) {
  const absolutePath = resolve(projectRoot, file.path);
  let raw = await readFile(absolutePath, "utf8");
  const changedIds = [];
  plan.targetIds.forEach((targetId) => {
    const nextRaw = patchStaticJsxNode(raw, targetId, plan);
    if (nextRaw !== raw) {
      raw = nextRaw;
      changedIds.push(targetId);
    }
  });
  if (!changedIds.length) {
    return skipped(file, "No matching JSX data-canvax-node-id target found.");
  }
  if (!wantsDryRun) {
    await writeFile(absolutePath, raw, "utf8");
  }
  return changed(file, `Updated ${changedIds.length} JSX component targets.`, changedIds);
}

async function patchCss(file, plan) {
  const absolutePath = resolve(projectRoot, file.path);
  const raw = await readFile(absolutePath, "utf8");
  if (raw.includes("canvax-applied-patch-highlight")) {
    return skipped(file, "Patch highlight styles already exist.");
  }
  const nextRaw = `${raw.trimEnd()}

/* canvax-applied-patch-highlight */
.generated-node[data-canvax-patch-state="applied"],
.canvaxReactNode[data-canvax-patch-state="applied"],
[data-canvax-patch-state="applied"] {
  outline: 3px solid color-mix(in srgb, var(--red, #ff5d3a), white 20%);
  outline-offset: 7px;
}

.generated-node[data-canvax-patch-state="applied"]::before,
.canvaxReactNode[data-canvax-patch-state="applied"]::before,
[data-canvax-patch-state="applied"]::before {
  content: "Canvax tweak";
  position: absolute;
  left: 0;
  top: -2.1rem;
  z-index: 4;
  padding: 0.35rem 0.55rem;
  border-radius: 999px;
  background: var(--red, #ff5d3a);
  color: white;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
`;
  if (!wantsDryRun) {
    await writeFile(absolutePath, nextRaw, "utf8");
  }
  return changed(file, "Added applied-patch visual affordance styles.", plan.targetIds);
}

async function patchTaskNote(file, plan) {
  const absolutePath = resolve(projectRoot, file.path);
  const raw = await readFile(absolutePath, "utf8");
  const marker = `canvax-live-edit:${plan.task.trigger?.id || plan.task.frameId || "patch"}`;
  if (raw.includes(marker)) {
    return skipped(file, "Live Edit task note already exists.");
  }
  const targetTaskIds = liveEditTargetTaskIds(plan);
  const taskTargetPatch = patchExistingTaskTarget(raw, {
    marker,
    motion: plan.motion.reason,
    note: plan.patchNote,
    taskIds: targetTaskIds,
  });
  if (taskTargetPatch.changed) {
    if (!wantsDryRun) {
      await writeFile(absolutePath, taskTargetPatch.raw, "utf8");
    }
    return changed(
      file,
      `Marked Live Edit task target ${taskTargetPatch.taskId}.`,
      plan.targetIds,
    );
  }
  const nextRaw = `${raw.trimEnd()}

## Canvax Live Edit

<!-- ${marker} -->
- Frame: ${plan.task.frameTitle || plan.task.frameId || "Canvax frame"}
- Targets: ${plan.targetIds.join(", ")}
- Note: ${plan.patchNote}
- Motion: ${plan.motion.reason}
`;
  if (!wantsDryRun) {
    await writeFile(absolutePath, nextRaw, "utf8");
  }
  return changed(file, "Appended Live Edit task note.", plan.targetIds);
}

function liveEditTargetTaskIds(plan) {
  const ids = [];
  const add = (value) => {
    const id = cleanString(value);
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  };
  add(plan.task.liveEdit?.target?.targetTaskId);
  add(plan.task.trigger?.target?.targetTaskId);
  add(plan.task.trigger?.request?.target?.targetTaskId);
  if (Array.isArray(plan.task.componentTargets)) {
    plan.task.componentTargets.forEach((component) => add(component.taskId));
  }
  return ids;
}

function patchExistingTaskTarget(raw, { marker, motion, note, taskIds }) {
  const ids = Array.isArray(taskIds) ? taskIds.filter(Boolean) : [];
  if (!ids.length) {
    return { changed: false, raw, taskId: "" };
  }
  const lines = raw.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const taskId = ids.find((id) => line.includes(id));
    if (!taskId || !/^\s*[-*]\s+\[[ xX]\]/.test(line)) {
      continue;
    }
    const indent = line.match(/^\s*/)?.[0] || "";
    const childIndent = `${indent}  `;
    const checkedLine = line.replace(/(\[[ xX]\])/, "[x]");
    const details = [
      `${childIndent}- Canvax Live Edit accepted: ${note || "Accepted direct edit."}`,
      `${childIndent}  Motion: ${motion || "metadata-only"}`,
      `${childIndent}  <!-- ${marker} -->`,
    ];
    lines.splice(index, 1, checkedLine, ...details);
    return {
      changed: true,
      raw: `${lines.join("\n").trimEnd()}\n`,
      taskId,
    };
  }
  return { changed: false, raw, taskId: "" };
}

function patchNodeModel(node, plan) {
  return {
    ...node,
    left: movePercent(node.left, plan.motion.x),
    top: movePercent(node.top, plan.motion.y),
    patchState: plan.patchState,
    patchNote: plan.patchNote,
    patchReason: plan.motion.reason,
  };
}

function patchHtmlNode(raw, targetId, plan) {
  const escapedId = escapeRegExp(targetId);
  const note = escapeHtml(plan.patchNote);
  const styleRegex = new RegExp(
    `(<article\\s+class="generated-node[^"]*"\\s+data-canvax-node-id="${escapedId}"[^>]*)(style=")([^"]*)(")`,
    "g",
  );
  return raw.replace(styleRegex, (match, prefix, styleAttribute, style, suffix) => {
    const withState = prefix.includes("data-canvax-patch-state")
      ? prefix
      : `${prefix}data-canvax-patch-state="applied" data-canvax-patch-note="${note}" `;
    return `${withState}${styleAttribute}${patchInlineStyle(style, plan.motion)}${suffix}`;
  }).replace(
    new RegExp(`(<[a-z][^>]*data-canvax-node-id="${escapedId}"[^>]*)(>)`, "gi"),
    (match, prefix, suffix) => {
      if (prefix.includes("data-canvax-patch-state") || prefix.includes("style=")) {
        return match;
      }
      return `${prefix} data-canvax-patch-state="applied" data-canvax-patch-note="${note}" style="${buildTransformStyle(plan.motion)}"${suffix}`;
    },
  );
}

function patchStaticJsxNode(raw, targetId, plan) {
  const escapedId = escapeRegExp(targetId);
  const note = escapeJsxAttribute(plan.patchNote);
  return raw.replace(
    new RegExp(`(<[A-Za-z][^>]*data-canvax-node-id="${escapedId}"[^>]*)(>)`, "g"),
    (match, prefix, suffix) => {
      if (prefix.includes("data-canvax-patch-state")) {
        return match;
      }
      return `${prefix}
      data-canvax-patch-state="applied"
      data-canvax-patch-note="${note}"
      style={{ transform: "${buildTransformValue(plan.motion)}" }}${suffix}`;
    },
  );
}

function patchInlineStyle(style, motion) {
  return style
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [key, value] = part.split(":").map((entry) => entry.trim());
      if (key === "left") {
        return `left:${movePercent(value, motion.x)}`;
      }
      if (key === "top") {
        return `top:${movePercent(value, motion.y)}`;
      }
      return `${key}:${value}`;
    })
    .join(";");
}

function buildTransformStyle(motion) {
  return `transform:${buildTransformValue(motion)}`;
}

function buildTransformValue(motion) {
  const x = trimNumber(motion.x * 100);
  const y = trimNumber(motion.y * 100);
  return `translate(${x}%, ${y}%)`;
}

function movePercent(value, delta) {
  const numeric = parsePercent(value);
  if (!Number.isFinite(numeric) || !delta) {
    return value;
  }
  const moved = Math.min(96, Math.max(0, numeric + delta * 100));
  return `${trimNumber(moved)}%`;
}

function parsePercent(value) {
  if (typeof value === "number") {
    return value;
  }
  const match = String(value || "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
}

function trimNumber(value) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function ensureReactPatchAttributes(raw) {
  if (raw.includes("data-canvax-patch-state={node.patchState || undefined}")) {
    return raw;
  }
  return raw.replace(
    "data-canvax-node-type={node.type}\n      style={{",
    `data-canvax-node-type={node.type}
      data-canvax-patch-state={node.patchState || undefined}
      data-canvax-patch-note={node.patchNote || undefined}
      style={{`,
  );
}

function buildPatchHistoryEntry(plan, changedIds) {
  return {
    at: new Date().toISOString(),
    taskId: plan.task.trigger?.id || "",
    note: plan.patchNote,
    motion: plan.motion,
    targetIds: changedIds,
  };
}

async function publishCodexOutput(result, task) {
  const liveEditMetadata = buildPublishedLiveEditMetadata(result, task);
  const changeArgs = result.changedFiles.flatMap((file) => [
    "--change",
    `${file.path}::Applied Canvax patch task::${result.frameId}`,
  ]);
  const child = spawn(
    process.execPath,
    [
      "scripts/write-codex-output.mjs",
      "--source",
      "canvax-patch-task-executor",
      "--type",
      "implementation-patch",
      "--label",
      `${result.frameTitle || result.frameId} applied patch`,
      "--notes",
      result.note || "Applied Canvax patch task.",
      "--frame",
      result.frameId,
      "--artifact",
      `${toProjectRelative(latestJsonPath)}::Applied Canvax patch result::${result.frameId}`,
      "--artifact",
      `${result.taskPath}::Source Codex patch task::${result.frameId}`,
      ...(task.previewPath ? ["--preview-path", task.previewPath] : []),
      ...(liveEditMetadata.binding
        ? ["--live-edit-binding", JSON.stringify(liveEditMetadata.binding)]
        : []),
      ...(liveEditMetadata.target
        ? ["--live-edit-target", JSON.stringify(liveEditMetadata.target)]
        : []),
      ...(liveEditMetadata.acceptedVariant
        ? [
            "--accepted-live-edit-variant",
            JSON.stringify(liveEditMetadata.acceptedVariant),
          ]
        : []),
      ...(liveEditMetadata.originalSnapshot
        ? [
            "--live-edit-original-snapshot",
            JSON.stringify(liveEditMetadata.originalSnapshot),
          ]
        : []),
      ...(liveEditMetadata.request
        ? ["--live-edit-request", JSON.stringify(liveEditMetadata.request)]
        : []),
      ...(liveEditMetadata.writeback
        ? ["--live-edit-writeback", JSON.stringify(liveEditMetadata.writeback)]
        : []),
      ...changeArgs,
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

function buildPublishedLiveEditMetadata(result, task) {
  const liveEdit =
    task.liveEdit && typeof task.liveEdit === "object" ? task.liveEdit : {};
  const trigger =
    task.trigger && typeof task.trigger === "object" ? task.trigger : {};
  const request =
    liveEdit.liveEditRequest ||
    liveEdit.request ||
    trigger.request ||
    null;
  const target =
    liveEdit.target ||
    trigger.target ||
    request?.target ||
    null;
  if (!target) {
    return {};
  }
  const acceptedVariant =
    liveEdit.variant ||
    trigger.variant ||
    request?.acceptedVariant ||
    request?.activeVariant ||
    null;
  const originalSnapshot =
    liveEdit.originalSnapshot ||
    task.liveEditOriginalSnapshot ||
    trigger.originalSnapshot ||
    request?.originalSnapshot ||
    null;
  const pins =
    (Array.isArray(liveEdit.pins) && liveEdit.pins) ||
    (Array.isArray(trigger.pins) && trigger.pins) ||
    (Array.isArray(request?.pins) && request.pins) ||
    [];
  const writeback = {
    kind: "canvax-live-edit-writeback",
    status: result.status,
    executed: true,
    skipped: false,
    targetId: cleanString(target.targetId),
    targetLabel: cleanString(target.targetLabel),
    variantLabel: cleanString(acceptedVariant?.label),
    patchResultPath: toProjectRelative(latestJsonPath),
    manifestPath: "artifacts/canvax/codex-output.json",
    changedFileCount: result.changedFiles.length,
    patchApplied: result.status === "patched",
    sourceHintExpansion: result.sourceHintExpansion,
    sourceDiscovery: result.sourceDiscovery,
    sourceDiscovered: result.sourceDiscovered,
    sourceDiscoveryCandidateCount: result.sourceDiscoveryCandidateCount,
    projectLinkExpansion: result.projectLinkExpansion,
    updatedAt: result.createdAt,
  };
  const binding = {
    kind: "canvax-live-edit-manifest-binding",
    status: "accepted",
    target,
    actionIntent: liveEdit.actionIntent || request?.actionIntent || null,
    acceptedVariant,
    originalSnapshot,
    pins,
    request,
    sourceBinding: task.sourceDiscovery || null,
    writeback,
    acceptedAt: cleanString(target.acceptedAt) || cleanString(request?.acceptedAt),
    updatedAt: result.createdAt,
  };
  return {
    binding,
    target,
    acceptedVariant,
    originalSnapshot,
    request,
    writeback,
  };
}

function changed(file, summary, targetIds) {
  return {
    path: file.path,
    kind: file.kind,
    changed: true,
    summary,
    targetIds,
  };
}

function skipped(file, reason) {
  return {
    path: file.path,
    kind: file.kind,
    changed: false,
    reason,
  };
}

function buildMarkdown(result) {
  const lines = [
    "# Canvax Applied Patch",
    "",
    `- Created: ${result.createdAt}`,
    `- Frame: ${result.frameTitle || result.frameId}`,
    `- Status: ${result.status}`,
    `- Requires OpenAI API key: ${result.requiresOpenAiApiKey ? "yes" : "no"}`,
    `- Dry run: ${result.dryRun ? "yes" : "no"}`,
    "",
    "## Tweak",
    "",
    result.note || "No note supplied.",
    "",
    "## Targets",
    "",
    ...result.targetIds.map((id) => `- ${id}`),
    "",
    "## Changed Files",
    "",
  ];
  if (result.changedFiles.length) {
    result.changedFiles.forEach((file) => {
      lines.push(`- ${file.path}: ${file.summary}`);
    });
  } else {
    lines.push("- No files changed.");
  }
  lines.push("", "## Boundary", "", result.noApiBoundary, "");
  if (result.projectLinkExpansion?.addedFiles?.length) {
    lines.push(
      "## Project Link Expansion",
      "",
      `Matched targets: ${result.projectLinkExpansion.matchedTargetIds.join(", ")}`,
      "",
      ...result.projectLinkExpansion.addedFiles.map((file) => `- ${file}`),
      "",
    );
  }
  if (result.sourceHintExpansion?.addedFiles?.length) {
    lines.push(
      "## Source Hint Targets",
      "",
      ...result.sourceHintExpansion.addedFiles.map((file) => `- ${file}`),
      "",
    );
  }
  if (result.sourceDiscovery) {
    lines.push(
      "## Live Edit Source Discovery",
      "",
      `Status: ${result.sourceDiscovery.status}`,
      `Hints: ${result.sourceDiscovery.hintCount}`,
      `Searched files: ${result.sourceDiscovery.searchedFileCount}`,
      "",
    );
    if (result.sourceDiscovery.candidates?.length) {
      result.sourceDiscovery.candidates.slice(0, 8).forEach((candidate) => {
        lines.push(
          `- ${candidate.path} (${candidate.confidence}, score ${candidate.score})`,
        );
      });
      lines.push("");
    } else {
      lines.push("- No source candidates found.", "");
    }
    lines.push(result.sourceDiscovery.nextAction || "", "");
  }
  return `${lines.join("\n")}\n`;
}

function readOption(inputArgs, flag) {
  const index = inputArgs.findIndex((entry) => entry === flag);
  return index >= 0 && inputArgs[index + 1] ? inputArgs[index + 1].trim() : "";
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readOptionalJson(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function compactText(value, maxLength = 120) {
  const text = cleanString(value).replace(/\s+/g, " ");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function resolveMaybeProjectPath(path) {
  return resolve(path.startsWith("/") ? path : resolve(projectRoot, path));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeJsxAttribute(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function collectChild(child) {
  return new Promise((resolveChild) => {
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      resolveChild({ stdout, stderr, code });
    });
  });
}

function toProjectRelative(filePath) {
  return filePath.startsWith(projectRoot)
    ? filePath.slice(projectRoot.length + 1)
    : filePath;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printHelp() {
  console.log(`execute-patch-task

Usage:
  node scripts/execute-patch-task.mjs --task artifacts/preview/codex-rewrite/frames/frame-id/codex-patch-task.json
  node scripts/execute-patch-task.mjs --task artifacts/preview/.../codex-patch-task.json --no-publish --json
  node scripts/execute-patch-task.mjs --task artifacts/.../codex-patch-task.json --no-project-link
  node scripts/execute-patch-task.mjs --task artifacts/.../codex-patch-task.json --result-root artifacts/canvax/applied-patches/custom

Applies a deterministic no-API patch to Canvax-generated implementation files,
production-like proof files, explicit source-hinted Live Edit files, or files listed in
exports/canvax-project-link-latest.json and referenced by a
codex-patch-task.json. By default, a frame-bound patch task can also expand
through the latest project-link contract when its component target ids match
linked data-canvax-node-id bindings. Use --no-project-link to disable that
allowlisted expansion. This is a local proof path, not a replacement for Codex
judgment on arbitrary production app code.`);
}
