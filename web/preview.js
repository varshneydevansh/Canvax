const PREVIEW_TARGET_KEY = "canvax-preview-target-v1";
const FOLLOW_ACTIVE_KEY = "canvax-preview-follow-active-v1";
const COMPARE_MODE_KEY = "canvax-preview-compare-mode-v1";
const LIVE_PREVIEW_STORAGE_KEY = "canvax-preview-live-v1";
const LIVE_PREVIEW_CHANNEL_NAME = "canvax-preview-live-v1";
const POLL_INTERVAL_MS = 2000;
const MAX_STAGE_WIDTH = 720;
const MAX_STAGE_HEIGHT = 560;

const viewportPresets = {
  desktop: { label: "Desktop", width: 1440, height: 1024 },
  laptop: { label: "Laptop", width: 1366, height: 900 },
  tablet: { label: "Tablet", width: 834, height: 1194 },
  mobile: { label: "Mobile", width: 430, height: 932 },
  square: { label: "Square", width: 1024, height: 1024 },
  poster: { label: "Poster", width: 900, height: 1400 },
};

const dom = {
  previewStatus: document.querySelector("#preview-status"),
  previewUpdated: document.querySelector("#preview-updated"),
  previewSource: document.querySelector("#preview-source"),
  compareModeButtons: document.querySelector("#compare-mode-buttons"),
  saveSnapshot: document.querySelector("#save-snapshot"),
  refreshPreview: document.querySelector("#refresh-preview"),
  openBoard: document.querySelector("#open-board"),
  followActive: document.querySelector("#follow-active"),
  followBadge: document.querySelector("#follow-badge"),
  viewportBadge: document.querySelector("#viewport-badge"),
  targetStateBadge: document.querySelector("#target-state-badge"),
  frameRailTitle: document.querySelector("#frame-rail-title"),
  frameRailCount: document.querySelector("#frame-rail-count"),
  frameRail: document.querySelector("#frame-rail"),
  manualPreviewUrl: document.querySelector("#manual-preview-url"),
  savePreviewUrl: document.querySelector("#save-preview-url"),
  clearPreviewUrl: document.querySelector("#clear-preview-url"),
  targetSummary: document.querySelector("#target-summary"),
  flowCountPreview: document.querySelector("#flow-count-preview"),
  flowListPreview: document.querySelector("#flow-list-preview"),
  artifactCount: document.querySelector("#artifact-count"),
  artifactList: document.querySelector("#artifact-list"),
  changeCount: document.querySelector("#change-count"),
  changeList: document.querySelector("#change-list"),
  snapshotCount: document.querySelector("#snapshot-count"),
  snapshotList: document.querySelector("#snapshot-list"),
  selectedFrameTitle: document.querySelector("#selected-frame-title"),
  selectedFrameMeta: document.querySelector("#selected-frame-meta"),
  sketchViewer: document.querySelector("#sketch-viewer"),
  implementationViewer: document.querySelector("#implementation-viewer"),
  compareStage: document.querySelector("#compare-stage"),
  compareContextNote: document.querySelector("#compare-context-note"),
  compareContextList: document.querySelector("#compare-context-list"),
  frameNotesPreview: document.querySelector("#frame-notes-preview"),
  promptPreview: document.querySelector("#prompt-preview"),
  openTargetLink: document.querySelector("#open-target-link"),
};

const state = {
  payload: null,
  livePayload: readLivePreviewPayload(),
  selectedFrameId: null,
  manualPreviewUrl: window.localStorage.getItem(PREVIEW_TARGET_KEY) || "",
  followActiveFrame: window.localStorage.getItem(FOLLOW_ACTIVE_KEY) !== "0",
  compareMode: normalizeCompareMode(
    window.localStorage.getItem(COMPARE_MODE_KEY),
  ),
  pollingTimer: null,
};
const livePreviewChannel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel(LIVE_PREVIEW_CHANNEL_NAME)
    : null;

init();

function init() {
  dom.manualPreviewUrl.value = state.manualPreviewUrl;
  dom.followActive.setAttribute(
    "aria-pressed",
    String(state.followActiveFrame),
  );
  dom.followActive.textContent = state.followActiveFrame
    ? "Following active frame"
    : "Manual frame selection";
  dom.followBadge.textContent = state.followActiveFrame
    ? "Auto-follow on"
    : "Auto-follow off";
  renderCompareMode();

  dom.refreshPreview.addEventListener("click", () => {
    void refreshPreviewState({ manual: true });
  });
  dom.saveSnapshot.addEventListener("click", () => {
    void savePreviewSnapshot();
  });
  dom.openBoard.addEventListener("click", () => {
    window.open("/", "_blank", "noopener");
  });
  dom.followActive.addEventListener("click", toggleFollowActive);
  dom.compareModeButtons.addEventListener("click", onCompareModeClick);
  dom.savePreviewUrl.addEventListener("click", () => {
    void saveManualPreviewUrl();
  });
  dom.clearPreviewUrl.addEventListener("click", () => {
    void clearManualPreviewUrl();
  });
  dom.manualPreviewUrl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveManualPreviewUrl();
    }
  });
  window.addEventListener("resize", () => {
    window.requestAnimationFrame(() => {
      renderSelectedFrame();
      renderImplementationPreview();
    });
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== LIVE_PREVIEW_STORAGE_KEY) {
      return;
    }
    state.livePayload = parseLivePreviewPayload(event.newValue);
    syncSelectedFrame();
    renderAll();
  });
  livePreviewChannel?.addEventListener("message", (event) => {
    state.livePayload =
      event.data && typeof event.data === "object" ? event.data : null;
    syncSelectedFrame();
    renderAll();
  });
  void refreshPreviewState({ manual: false });
}

async function refreshPreviewState({ manual }) {
  try {
    const response = await fetch("/api/preview-state", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Preview state could not load.");
    }
    state.payload = payload;
    syncSelectedFrame();
    renderAll();
    if (manual) {
      dom.previewStatus.textContent = "Preview refreshed";
    }
  } catch (error) {
    dom.previewStatus.textContent =
      error instanceof Error ? error.message : "Preview unavailable";
  } finally {
    window.clearTimeout(state.pollingTimer);
    state.pollingTimer = window.setTimeout(() => {
      void refreshPreviewState({ manual: false });
    }, POLL_INTERVAL_MS);
  }
}

function toggleFollowActive() {
  state.followActiveFrame = !state.followActiveFrame;
  window.localStorage.setItem(
    FOLLOW_ACTIVE_KEY,
    state.followActiveFrame ? "1" : "0",
  );
  dom.followActive.setAttribute(
    "aria-pressed",
    String(state.followActiveFrame),
  );
  dom.followActive.textContent = state.followActiveFrame
    ? "Following active frame"
    : "Manual frame selection";
  dom.followBadge.textContent = state.followActiveFrame
    ? "Auto-follow on"
    : "Auto-follow off";
  syncSelectedFrame();
  renderAll();
}

function syncSelectedFrame() {
  const frames = currentLiveExport()?.frames || [];
  if (!frames.length) {
    state.selectedFrameId = null;
    return;
  }

  const activeFrameId = currentLiveExport()?.activeFrameId;
  const entryFrameId = currentLiveExport()?.entryFrameId;
  if (state.followActiveFrame) {
    state.selectedFrameId = activeFrameId || entryFrameId || frames[0].id;
    return;
  }

  const selectedStillExists = frames.some(
    (frame) => frame.id === state.selectedFrameId,
  );
  if (!selectedStillExists) {
    state.selectedFrameId = activeFrameId || entryFrameId || frames[0].id;
  }
}

function renderAll() {
  renderMeta();
  renderCompareMode();
  renderFrameRail();
  renderFlow();
  renderManifestContext();
  renderSnapshots();
  renderSelectedFrame();
  renderImplementationPreview();
  renderPrompt();
}

function renderMeta() {
  const payload = currentPayload();
  const lastUpdated = payload?.liveExport?.generatedAt || payload?.updatedAt;
  dom.previewUpdated.textContent = lastUpdated
    ? formatDateTime(lastUpdated)
    : "Never";
  dom.previewSource.textContent =
    payload?.paths?.liveJsonPath || "/api/preview-state";

  if (!payload?.liveExport?.frames?.length) {
    dom.previewStatus.textContent = "Waiting for the first saved Canvax frame";
    dom.viewportBadge.textContent = "Canvas";
    renderTargetStateBadge(null, null);
    return;
  }

  const manifest = payload.previewManifest;
  const manifestTarget = resolvePreviewTargetEntry(
    manifest,
    state.manualPreviewUrl,
    state.selectedFrameId,
  );
  const artifactCount = collectManifestArtifacts(manifest).length;
  const changeCount = collectManifestChanges(manifest).length;
  const freshness = describeManifestFreshness(manifestTarget, currentFrame());

  renderTargetStateBadge(freshness, manifestTarget);

  if (manifestTarget && (artifactCount || changeCount)) {
    if (freshness?.stale) {
      dom.previewStatus.textContent = freshness.message;
      return;
    }
    dom.previewStatus.textContent = `Sketch synced with ${artifactCount} artifact${artifactCount === 1 ? "" : "s"} and ${changeCount} changed file${changeCount === 1 ? "" : "s"}`;
    return;
  }

  dom.previewStatus.textContent = manifestTarget
    ? "Sketch synced and implementation target connected"
    : "Sketch synced. Attach a preview URL, let Codex write a target, or use Materialize in the board to generate one here";
}

function renderFrameRail() {
  const frames = currentLiveExport()?.frames || [];
  dom.frameRailTitle.textContent = frames.length
    ? "Live frame timeline"
    : "No frames yet";
  dom.frameRailCount.textContent = `${frames.length} ${frames.length === 1 ? "frame" : "frames"}`;

  if (!frames.length) {
    dom.frameRail.className = "frame-rail empty-state";
    dom.frameRail.textContent =
      "Sketch in Canvax and this preview will populate automatically.";
    return;
  }

  dom.frameRail.className = "frame-rail";
  dom.frameRail.innerHTML = frames
    .map((frame, index) => {
      const active = frame.id === state.selectedFrameId ? "active" : "";
      const thumb =
        frame.liveThumbnailDataUrl || frame.thumbnailUrl || frame.snapshotUrl;
      return `
        <button class="frame-card ${active}" type="button" data-frame-id="${escapeHtml(frame.id)}">
          <div class="frame-thumb">${thumb ? `<img src="${escapeHtml(thumb)}" alt="" />` : ""}</div>
          <div class="frame-meta">
            <strong>${index + 1}. ${escapeHtml(frame.title || `Frame ${index + 1}`)}</strong>
            <div class="sketch-meta">${describeViewport(frame)} • ${frame.captureCount || 0} capture${frame.captureCount === 1 ? "" : "s"}</div>
          </div>
        </button>
      `;
    })
    .join("");

  dom.frameRail.querySelectorAll("[data-frame-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedFrameId = button.dataset.frameId;
      state.followActiveFrame = false;
      window.localStorage.setItem(FOLLOW_ACTIVE_KEY, "0");
      dom.followActive.setAttribute("aria-pressed", "false");
      dom.followActive.textContent = "Manual frame selection";
      dom.followBadge.textContent = "Auto-follow off";
      renderSelectedFrame();
      renderImplementationPreview();
      renderFlow();
      renderFrameRail();
    });
  });
}

function renderFlow() {
  const liveExport = currentLiveExport();
  const connections = liveExport?.connections || [];
  dom.flowCountPreview.textContent = `${connections.length} ${connections.length === 1 ? "link" : "links"}`;

  if (!connections.length) {
    dom.flowListPreview.className = "flow-list empty-state";
    dom.flowListPreview.textContent = "No flow links yet.";
    return;
  }

  dom.flowListPreview.className = "flow-list";
  dom.flowListPreview.innerHTML = connections
    .map((connection) => {
      const selected =
        connection.fromFrameId === state.selectedFrameId ||
        connection.toFrameId === state.selectedFrameId;
      return `
        <div class="flow-pill${selected ? " active" : ""}">
          <strong>${escapeHtml(connection.fromTitle || connection.fromFrameId)} -> ${escapeHtml(connection.toTitle || connection.toFrameId)}</strong>
          <span>${escapeHtml(connection.label || "continue")}${connection.notes ? ` • ${escapeHtml(connection.notes)}` : ""}</span>
        </div>
      `;
    })
    .join("");
}

function renderSelectedFrame() {
  const frame = currentFrame();
  if (!frame) {
    dom.selectedFrameTitle.textContent = "Awaiting first frame";
    dom.selectedFrameMeta.textContent =
      "Canvax will sync the current frame after autosnap or freeze.";
    dom.viewportBadge.textContent = "Canvas";
    dom.sketchViewer.className = "surface-viewer empty-state";
    dom.sketchViewer.textContent = "No saved frame capture yet.";
    dom.frameNotesPreview.className = "notes-grid empty-state";
    dom.frameNotesPreview.textContent = "Select a frame to inspect its notes.";
    return;
  }

  const viewport = getViewport(frame);
  dom.selectedFrameTitle.textContent = frame.title || "Untitled frame";
  dom.selectedFrameMeta.textContent = `${viewport.label} • ${viewport.width}×${viewport.height} • updated ${formatDateTime(frame.updatedAt)}`;
  dom.viewportBadge.textContent = `${viewport.label} ${viewport.width}×${viewport.height}`;

  const imageUrl =
    frame.liveSnapshotDataUrl ||
    frame.snapshotUrl ||
    frame.liveThumbnailDataUrl ||
    frame.thumbnailUrl;
  if (imageUrl) {
    const stage = buildViewportStage({
      viewport,
      inner: `<img class="viewport-image viewport-content" src="${escapeHtml(imageUrl)}" alt="Saved sketch for ${escapeHtml(frame.title || "current frame")}" />`,
    });
    dom.sketchViewer.className = "surface-viewer";
    dom.sketchViewer.innerHTML = stage;
  } else {
    dom.sketchViewer.className = "surface-viewer empty-state";
    dom.sketchViewer.textContent =
      "This frame has no saved capture yet. Freeze or pause for autosnap in the main board.";
  }

  const notes = [
    ["Intent", frame.objective],
    ["Structure", frame.layout],
    ["Behavior", frame.motion],
    ["Assets", frame.assets],
    ["Variants", frame.mobile],
  ].filter(([, value]) => value);

  if (!notes.length) {
    dom.frameNotesPreview.className = "notes-grid empty-state";
    dom.frameNotesPreview.textContent =
      "This frame does not have interpretation notes yet.";
    return;
  }

  dom.frameNotesPreview.className = "notes-grid";
  dom.frameNotesPreview.innerHTML = notes
    .map(
      ([label, value]) => `
        <article class="note-card">
          <strong>${escapeHtml(label)}</strong>
          <p>${escapeHtml(value)}</p>
        </article>
      `,
    )
    .join("");
}

function renderImplementationPreview() {
  const frame = currentFrame();
  const target = resolvePreviewTargetEntry(
    currentPayload()?.previewManifest,
    state.manualPreviewUrl,
    state.selectedFrameId,
  );
  const targetUrl = target?.resolvedUrl || target?.url || "";
  dom.openTargetLink.hidden = !targetUrl;
  dom.openTargetLink.href = targetUrl || "#";

  if (!frame) {
    dom.implementationViewer.className = "surface-viewer empty-state";
    dom.implementationViewer.textContent = "No selected frame yet.";
    return;
  }

  if (!target) {
    dom.implementationViewer.className = "surface-viewer empty-state";
    dom.implementationViewer.textContent =
      "No connected implementation preview yet. Attach a local preview URL, let Codex write a preview manifest target, or use Materialize in the main board.";
    return;
  }

  const viewport = getViewport(frame);
  const stage = buildViewportStage({
    viewport,
    inner: `<iframe class="viewport-iframe viewport-content" src="${escapeHtml(targetUrl)}" title="Connected implementation preview"></iframe>`,
  });
  dom.implementationViewer.className = "surface-viewer";
  dom.implementationViewer.innerHTML = stage;
}

function renderManifestContext() {
  const manifest = currentPayload()?.previewManifest || null;
  const target = resolvePreviewTargetEntry(
    manifest,
    state.manualPreviewUrl,
    state.selectedFrameId,
  );
  const artifacts = collectManifestArtifacts(manifest);
  const changes = collectManifestChanges(manifest);
  renderCompareContext(target, artifacts, changes);

  renderTargetSummary(target, manifest);
  renderManifestList({
    element: dom.artifactList,
    countElement: dom.artifactCount,
    items: artifacts,
    emptyMessage: "No generated artifacts connected yet.",
    fallbackKind: "artifact",
    currentFrameId: state.selectedFrameId,
  });
  renderManifestList({
    element: dom.changeList,
    countElement: dom.changeCount,
    items: changes,
    emptyMessage: "No Codex file changes attached yet.",
    fallbackKind: "updated",
    currentFrameId: state.selectedFrameId,
  });
}

function renderSnapshots() {
  const snapshots = currentPayload()?.previewSnapshots?.items || [];
  dom.snapshotCount.textContent = `${snapshots.length} ${snapshots.length === 1 ? "saved" : "saved"}`;

  if (!snapshots.length) {
    dom.snapshotList.className = "snapshot-list empty-state";
    dom.snapshotList.textContent = "No preview snapshots saved yet.";
    return;
  }

  dom.snapshotList.className = "snapshot-list";
  dom.snapshotList.innerHTML = snapshots
    .map((snapshot) => {
      const targetLabel = snapshot.targetLabel || "No target";
      const viewport = [snapshot.viewportLabel, formatViewportSize(snapshot)]
        .filter(Boolean)
        .join(" • ");
      return `
        <article class="snapshot-card">
          <div class="snapshot-card-row">
            <strong>${escapeHtml(snapshot.frameTitle || "Untitled frame")}</strong>
            <span class="target-badge subtle">${escapeHtml(snapshot.compareMode || "split")}</span>
          </div>
          <p class="manifest-copy">${escapeHtml(formatDateTime(snapshot.savedAt))}${viewport ? ` • ${escapeHtml(viewport)}` : ""}</p>
          <p class="manifest-copy">${escapeHtml(targetLabel)} • ${snapshot.artifactCount || 0} artifact${snapshot.artifactCount === 1 ? "" : "s"} • ${snapshot.changeCount || 0} change${snapshot.changeCount === 1 ? "" : "s"}</p>
          <div class="snapshot-actions">
            ${snapshot.snapshotUrl ? `<a class="ghost-link manifest-link" href="${escapeHtml(snapshot.snapshotUrl)}" target="_blank" rel="noopener noreferrer">Open record</a>` : ""}
            ${snapshot.sketchUrl ? `<a class="ghost-link manifest-link" href="${escapeHtml(snapshot.sketchUrl)}" target="_blank" rel="noopener noreferrer">Open sketch</a>` : ""}
            ${snapshot.targetUrl ? `<a class="ghost-link manifest-link" href="${escapeHtml(snapshot.targetUrl)}" target="_blank" rel="noopener noreferrer">Open target</a>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCompareContext(target, artifacts, changes) {
  const frameId = state.selectedFrameId;
  if (!frameId) {
    dom.compareContextNote.textContent =
      "Select a frame to see compare context.";
    dom.compareContextList.className = "compare-context-list empty-state";
    dom.compareContextList.textContent = "No frame selected yet.";
    return;
  }

  const relevantArtifacts = artifacts.filter((item) =>
    itemMatchesFrame(item, frameId),
  );
  const relevantChanges = changes.filter((item) =>
    itemMatchesFrame(item, frameId),
  );
  const specificArtifacts = relevantArtifacts.filter((item) =>
    hasFrameBinding(item),
  );
  const specificChanges = relevantChanges.filter((item) =>
    hasFrameBinding(item),
  );
  const currentItems = [];
  if (target && itemMatchesFrame(target, frameId)) {
    currentItems.push({
      label: target.label || "Connected target",
      kind: target.type || "preview",
      scope: scopeLabel(target.frameIds),
      href: target.resolvedUrl || target.url || "",
      meta: target.previewPath || target.description || target.source || "",
    });
  }
  relevantArtifacts.forEach((item) => {
    currentItems.push({
      label: item.label || item.path || "Artifact",
      kind: item.kind || "artifact",
      scope: scopeLabel(item.frameIds),
      href: item.resolvedUrl || item.url || "",
      meta: item.description || item.path || "",
    });
  });
  relevantChanges.forEach((item) => {
    currentItems.push({
      label: item.label || item.path || "Changed file",
      kind: item.kind || "updated",
      scope: scopeLabel(item.frameIds),
      href: item.resolvedUrl || item.url || "",
      meta: item.summary || item.path || "",
    });
  });

  if (!currentItems.length) {
    dom.compareContextNote.textContent =
      "No frame-specific output metadata yet. Global output is still shown below.";
    dom.compareContextList.className = "compare-context-list empty-state";
    dom.compareContextList.textContent =
      "Add frame bindings in the Codex output manifest to tie files or artifacts to this frame.";
    return;
  }

  const specificCount =
    (target && hasFrameBinding(target) && itemMatchesFrame(target, frameId)
      ? 1
      : 0) +
    specificArtifacts.length +
    specificChanges.length;
  const globalCount = currentItems.length - specificCount;
  dom.compareContextNote.textContent = specificCount
    ? `${specificCount} frame-scoped item${specificCount === 1 ? "" : "s"}${globalCount ? ` and ${globalCount} global item${globalCount === 1 ? "" : "s"}` : ""} are visible for this frame.`
    : `${globalCount} global item${globalCount === 1 ? "" : "s"} visible for this frame. Add frame bindings for more precise compare context.`;
  dom.compareContextList.className = "compare-context-list";
  dom.compareContextList.innerHTML = currentItems
    .map(
      (item) => `
      <article class="context-pill">
        <div class="context-pill-row">
          <strong>${escapeHtml(item.label)}</strong>
          <div class="context-pill-badges">
            <span class="target-badge subtle">${escapeHtml(item.kind)}</span>
            <span class="target-badge subtle">${escapeHtml(item.scope)}</span>
          </div>
        </div>
        ${item.meta ? `<p class="manifest-copy">${escapeHtml(item.meta)}</p>` : ""}
        ${item.href ? `<a class="ghost-link manifest-link" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">Open</a>` : ""}
      </article>
    `,
    )
    .join("");
}

function renderTargetSummary(target, manifest) {
  if (!target) {
    dom.targetSummary.className = "target-summary empty-state";
    dom.targetSummary.textContent = "No connected implementation target yet.";
    return;
  }

  const notes =
    manifest && typeof manifest.notes === "string" ? manifest.notes.trim() : "";
  const href = target.resolvedUrl || target.url || "";
  const routeLabel = target.previewPath || href || "Connected target";
  const freshness = describeManifestFreshness(target, currentFrame());
  dom.targetSummary.className = "target-summary";
  dom.targetSummary.innerHTML = `
    <div class="target-card">
      <div class="target-card-row">
        <strong>${escapeHtml(target.label || "Connected implementation")}</strong>
        <span class="target-badge">${escapeHtml(target.type || "preview")}</span>
      </div>
      <p class="target-meta">${escapeHtml(target.source || "manifest")} • ${escapeHtml(routeLabel)}</p>
      ${target.description ? `<p class="target-copy">${escapeHtml(target.description)}</p>` : ""}
      ${freshness?.message ? `<p class="target-copy${freshness.stale ? " warning-copy" : " subtle"}">${escapeHtml(freshness.message)}</p>` : ""}
      ${notes ? `<p class="target-copy subtle">${escapeHtml(notes)}</p>` : ""}
      ${href ? `<a class="ghost-link target-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">Open connected target</a>` : ""}
    </div>
  `;
}

function renderManifestList({
  element,
  countElement,
  items,
  emptyMessage,
  fallbackKind,
  currentFrameId,
}) {
  countElement.textContent = `${items.length} ${items.length === 1 ? "file" : "files"}`;
  if (!items.length) {
    element.className = "manifest-list empty-state";
    element.textContent = emptyMessage;
    return;
  }

  element.className = "manifest-list";
  element.innerHTML = items
    .map((item) => {
      const href = item.resolvedUrl || item.url || "";
      const kind = item.kind || fallbackKind;
      const title = item.label || item.path || item.url || "Untitled";
      const relevant = itemMatchesFrame(item, currentFrameId);
      const scope = scopeLabel(item.frameIds);
      const secondary = [
        item.path,
        item.summary || item.description,
        item.status,
      ]
        .filter(Boolean)
        .join(" • ");
      return `
        <article class="manifest-item${relevant ? " active" : ""}">
          <div class="manifest-item-row">
            <strong>${escapeHtml(title)}</strong>
            <div class="manifest-item-badges">
              <span class="target-badge subtle">${escapeHtml(kind)}</span>
              <span class="target-badge subtle">${escapeHtml(scope)}</span>
            </div>
          </div>
          ${secondary ? `<p class="manifest-copy">${escapeHtml(secondary)}</p>` : ""}
          ${href ? `<a class="ghost-link manifest-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">Open</a>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderCompareMode() {
  const mode = normalizeCompareMode(state.compareMode);
  state.compareMode = mode;
  dom.compareModeButtons
    .querySelectorAll("[data-compare-mode]")
    .forEach((button) => {
      const active = button.dataset.compareMode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  dom.compareStage.classList.remove("mode-split", "mode-sketch", "mode-output");
  dom.compareStage.classList.add(`mode-${mode}`);
}

function onCompareModeClick(event) {
  const button = event.target.closest("[data-compare-mode]");
  if (!button) {
    return;
  }
  state.compareMode = normalizeCompareMode(button.dataset.compareMode);
  window.localStorage.setItem(COMPARE_MODE_KEY, state.compareMode);
  renderCompareMode();
}

function buildViewportStage({ viewport, inner }) {
  const scale = computeViewportScale(viewport);
  const stageWidth = Math.max(160, Math.round(viewport.width * scale));
  const stageHeight = Math.max(160, Math.round(viewport.height * scale));

  return `
    <div
      class="viewport-shell"
      style="--viewport-width:${viewport.width}; --viewport-height:${viewport.height}; --viewer-scale:${scale}; --stage-width:${stageWidth}px; --stage-height:${stageHeight}px;"
    >
      <div class="viewport-frame">
        <div class="viewport-canvas">
          ${inner}
        </div>
      </div>
    </div>
  `;
}

function computeViewportScale(viewport) {
  return Math.min(
    1,
    MAX_STAGE_WIDTH / viewport.width,
    MAX_STAGE_HEIGHT / viewport.height,
  );
}

function renderPrompt() {
  const payload = currentPayload();
  const prompt =
    payload?.liveMarkdown ||
    payload?.liveExport?.prompt ||
    "Waiting for the live Canvax export...";
  dom.promptPreview.textContent = prompt;
}

function currentFrame() {
  const frames = currentLiveExport()?.frames || [];
  return frames.find((frame) => frame.id === state.selectedFrameId) || null;
}

function currentPayload() {
  if (!state.payload && !state.livePayload) {
    return null;
  }
  if (!state.payload) {
    return state.livePayload;
  }
  if (!state.livePayload) {
    return state.payload;
  }

  const baseExport = state.payload.liveExport || null;
  const liveExport = state.livePayload.liveExport || null;
  if (!baseExport) {
    return state.livePayload;
  }
  if (!liveExport) {
    return state.payload;
  }

  const liveFrames = new Map(
    (liveExport.frames || []).map((frame) => [frame.id, frame]),
  );
  return {
    ...state.payload,
    ...state.livePayload,
    liveExport: {
      ...baseExport,
      ...liveExport,
      frames: (baseExport.frames || []).map((frame) => ({
        ...frame,
        ...(liveFrames.get(frame.id) || {}),
      })),
    },
  };
}

function currentLiveExport() {
  return currentPayload()?.liveExport || null;
}

function readLivePreviewPayload() {
  return parseLivePreviewPayload(
    window.localStorage.getItem(LIVE_PREVIEW_STORAGE_KEY),
  );
}

function parseLivePreviewPayload(raw) {
  if (!raw) {
    return null;
  }
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

function getViewport(frame) {
  const preset = viewportPresets[frame?.viewport] || viewportPresets.desktop;
  return {
    label: preset.label,
    width: Number(frame?.viewportWidth) || preset.width,
    height: Number(frame?.viewportHeight) || preset.height,
  };
}

function describeViewport(frame) {
  const viewport = getViewport(frame);
  return `${viewport.label} ${viewport.width}×${viewport.height}`;
}

function resolvePreviewTargetEntry(
  manifest,
  fallbackUrl,
  preferredFrameId = "",
) {
  const targets = collectManifestTargets(manifest);
  const frameTarget = preferredFrameId
    ? targets.find((target) => target.frameIds.includes(preferredFrameId))
    : null;
  if (frameTarget) {
    return frameTarget;
  }
  const primaryTarget =
    targets.find((target) => target.id === "primary") || targets[0] || null;
  if (primaryTarget) {
    return primaryTarget;
  }

  const artifactTarget = derivePreviewTargetFromArtifacts(
    manifest,
    preferredFrameId,
  );
  if (artifactTarget) {
    return artifactTarget;
  }

  const fallback = normalizeUrl(fallbackUrl);
  return fallback
    ? {
        id: "primary",
        label: "Attached local preview",
        source: "preview-window",
        type: "implementation-preview",
        url: fallback,
        resolvedUrl: fallback,
        previewPath: "",
        description: "",
      }
    : null;
}

function collectManifestTargets(manifest) {
  if (!manifest || typeof manifest !== "object") {
    return [];
  }

  const explicitTargets = Array.isArray(manifest.targets)
    ? manifest.targets
    : [];
  const directTarget = normalizeManifestTarget(manifest);
  const values = directTarget
    ? [directTarget, ...explicitTargets]
    : explicitTargets;
  const uniqueTargets = new Map();

  values
    .map((target, index) => normalizeManifestTarget(target, index))
    .filter(Boolean)
    .forEach((target) => {
      const key = target.id || target.url || target.previewPath;
      if (!uniqueTargets.has(key)) {
        uniqueTargets.set(key, target);
      }
    });

  return [...uniqueTargets.values()];
}

function collectManifestArtifacts(manifest) {
  if (
    !manifest ||
    typeof manifest !== "object" ||
    !Array.isArray(manifest.artifacts)
  ) {
    return [];
  }
  return manifest.artifacts
    .map((artifact, index) => normalizeManifestArtifact(artifact, index))
    .filter(Boolean);
}

function derivePreviewTargetFromArtifacts(manifest, preferredFrameId = "") {
  const artifacts = collectManifestArtifacts(manifest);
  const prioritizedArtifacts = preferredFrameId
    ? [
        ...artifacts.filter((entry) =>
          entry.frameIds.includes(preferredFrameId),
        ),
        ...artifacts.filter(
          (entry) => !entry.frameIds.includes(preferredFrameId),
        ),
      ]
    : artifacts;
  const artifact = prioritizedArtifacts.find((entry) => {
    const path = typeof entry.path === "string" ? entry.path.toLowerCase() : "";
    const kind = typeof entry.kind === "string" ? entry.kind.toLowerCase() : "";
    const url =
      typeof entry.resolvedUrl === "string"
        ? entry.resolvedUrl.toLowerCase()
        : "";
    return (
      kind === "preview" || path.endsWith(".html") || url.endsWith(".html")
    );
  });
  if (!artifact) {
    return null;
  }

  const href = artifact.resolvedUrl || artifact.url || "";
  if (!href) {
    return null;
  }

  return {
    id: "artifact-preview",
    label: artifact.label || "Generated preview artifact",
    source: "artifact-manifest",
    type: "implementation-preview",
    url: href,
    resolvedUrl: href,
    previewPath: artifact.path || "",
    description: artifact.description || artifact.status || "",
    frameIds: Array.isArray(artifact.frameIds) ? artifact.frameIds : [],
    versionTag: artifact.versionTag || "",
    generatedAt: artifact.generatedAt || "",
    sourceFrameId: artifact.sourceFrameId || "",
    sourceFrameTitle: artifact.sourceFrameTitle || "",
    sourceFrameUpdatedAt: artifact.sourceFrameUpdatedAt || "",
  };
}

function collectManifestChanges(manifest) {
  if (!manifest || typeof manifest !== "object") {
    return [];
  }
  const source = Array.isArray(manifest.changes)
    ? manifest.changes
    : Array.isArray(manifest.changedFiles)
      ? manifest.changedFiles
      : [];
  return source
    .map((change, index) => normalizeManifestChange(change, index))
    .filter(Boolean);
}

function normalizeManifestTarget(value, index = 0) {
  if (!value || (typeof value !== "object" && typeof value !== "string")) {
    return null;
  }

  if (typeof value === "string") {
    const url = normalizeUrl(value);
    return url
      ? {
          id: index === 0 ? "primary" : `target-${index + 1}`,
          label:
            index === 0 ? "Primary preview" : `Preview target ${index + 1}`,
          source: "manifest",
          type: "implementation-preview",
          url,
          resolvedUrl: url,
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

  const resolvedUrl = normalizeUrl(value.resolvedUrl);
  const url =
    normalizeUrl(value.url || value.previewUrl || value.targetUrl) ||
    resolvedUrl;
  const previewPath =
    typeof value.previewPath === "string"
      ? value.previewPath.trim()
      : typeof value.path === "string"
        ? value.path.trim()
        : typeof value.htmlPath === "string"
          ? value.htmlPath.trim()
          : "";
  if (!url && !previewPath) {
    return null;
  }

  return {
    id:
      typeof value.id === "string" && value.id.trim()
        ? value.id.trim()
        : index === 0
          ? "primary"
          : `target-${index + 1}`,
    label:
      typeof value.label === "string" && value.label.trim()
        ? value.label.trim()
        : index === 0
          ? "Primary preview"
          : `Preview target ${index + 1}`,
    source:
      typeof value.source === "string" && value.source.trim()
        ? value.source.trim()
        : "manifest",
    type:
      typeof value.type === "string" && value.type.trim()
        ? value.type.trim()
        : "implementation-preview",
    url,
    resolvedUrl,
    previewPath,
    description:
      typeof value.description === "string" ? value.description.trim() : "",
    frameIds: Array.isArray(value.frameIds)
      ? value.frameIds.filter(Boolean)
      : [],
    versionTag:
      typeof value.versionTag === "string" ? value.versionTag.trim() : "",
    generatedAt:
      typeof value.generatedAt === "string" ? value.generatedAt.trim() : "",
    sourceFrameId:
      typeof value.sourceFrameId === "string" ? value.sourceFrameId.trim() : "",
    sourceFrameTitle:
      typeof value.sourceFrameTitle === "string"
        ? value.sourceFrameTitle.trim()
        : "",
    sourceFrameUpdatedAt:
      typeof value.sourceFrameUpdatedAt === "string"
        ? value.sourceFrameUpdatedAt.trim()
        : "",
  };
}

function normalizeManifestArtifact(value, index = 0) {
  if (!value || (typeof value !== "object" && typeof value !== "string")) {
    return null;
  }

  if (typeof value === "string") {
    const path = value.trim();
    return path
      ? {
          id: `artifact-${index + 1}`,
          label: path.split("/").pop() || `Artifact ${index + 1}`,
          path,
          kind: "artifact",
          description: "",
          status: "",
          resolvedUrl: "",
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
    typeof value.path === "string"
      ? value.path.trim()
      : typeof value.filePath === "string"
        ? value.filePath.trim()
        : typeof value.outputPath === "string"
          ? value.outputPath.trim()
          : "";
  const resolvedUrl = normalizeUrl(value.resolvedUrl || value.url);
  if (!path && !resolvedUrl) {
    return null;
  }

  return {
    id:
      typeof value.id === "string" && value.id.trim()
        ? value.id.trim()
        : `artifact-${index + 1}`,
    label:
      typeof value.label === "string" && value.label.trim()
        ? value.label.trim()
        : path.split("/").pop() || `Artifact ${index + 1}`,
    path,
    kind:
      typeof value.kind === "string" && value.kind.trim()
        ? value.kind.trim()
        : typeof value.type === "string" && value.type.trim()
          ? value.type.trim()
          : "artifact",
    description:
      typeof value.description === "string" ? value.description.trim() : "",
    status: typeof value.status === "string" ? value.status.trim() : "",
    resolvedUrl,
    frameIds: Array.isArray(value.frameIds)
      ? value.frameIds.filter(Boolean)
      : [],
    versionTag:
      typeof value.versionTag === "string" ? value.versionTag.trim() : "",
    generatedAt:
      typeof value.generatedAt === "string" ? value.generatedAt.trim() : "",
    sourceFrameId:
      typeof value.sourceFrameId === "string" ? value.sourceFrameId.trim() : "",
    sourceFrameTitle:
      typeof value.sourceFrameTitle === "string"
        ? value.sourceFrameTitle.trim()
        : "",
    sourceFrameUpdatedAt:
      typeof value.sourceFrameUpdatedAt === "string"
        ? value.sourceFrameUpdatedAt.trim()
        : "",
  };
}

function describeManifestFreshness(target, frame) {
  if (!target || !frame) {
    return null;
  }

  const outputTime = Date.parse(
    target.sourceFrameUpdatedAt || target.generatedAt,
  );
  const frameTime = Date.parse(frame.updatedAt || "");
  if (!Number.isFinite(outputTime) || !Number.isFinite(frameTime)) {
    return null;
  }

  if (frameTime > outputTime + 1) {
    return {
      stale: true,
      message: `Current sketch is newer than this output. Rematerialize ${frame.title} to refresh the generated surface.`,
      badge: "Output stale",
    };
  }

  return {
    stale: false,
    message: `Output is synced with the sketch as of ${formatDateTime(target.sourceFrameUpdatedAt || target.generatedAt)}.`,
    badge: "Output synced",
  };
}

function renderTargetStateBadge(freshness, target) {
  if (!target) {
    dom.targetStateBadge.textContent = "No output target";
    dom.targetStateBadge.className = "badge subtle";
    return;
  }

  if (freshness?.stale) {
    dom.targetStateBadge.textContent = freshness.badge;
    dom.targetStateBadge.className = "badge warning";
    return;
  }

  dom.targetStateBadge.textContent = freshness?.badge || "Output connected";
  dom.targetStateBadge.className = "badge subtle";
}

function normalizeManifestChange(value, index = 0) {
  if (!value || (typeof value !== "object" && typeof value !== "string")) {
    return null;
  }

  if (typeof value === "string") {
    const path = value.trim();
    return path
      ? {
          id: `change-${index + 1}`,
          label: path.split("/").pop() || `Change ${index + 1}`,
          path,
          kind: "updated",
          summary: "",
          resolvedUrl: "",
          frameIds: [],
        }
      : null;
  }

  const path =
    typeof value.path === "string"
      ? value.path.trim()
      : typeof value.filePath === "string"
        ? value.filePath.trim()
        : typeof value.outputPath === "string"
          ? value.outputPath.trim()
          : "";
  if (!path) {
    return null;
  }

  return {
    id:
      typeof value.id === "string" && value.id.trim()
        ? value.id.trim()
        : `change-${index + 1}`,
    label:
      typeof value.label === "string" && value.label.trim()
        ? value.label.trim()
        : path.split("/").pop() || `Change ${index + 1}`,
    path,
    kind:
      typeof value.kind === "string" && value.kind.trim()
        ? value.kind.trim()
        : "updated",
    summary:
      typeof value.summary === "string"
        ? value.summary.trim()
        : typeof value.description === "string"
          ? value.description.trim()
          : "",
    resolvedUrl: normalizeUrl(value.resolvedUrl || value.url),
    frameIds: Array.isArray(value.frameIds)
      ? value.frameIds.filter(Boolean)
      : [],
  };
}

function itemMatchesFrame(item, frameId) {
  if (!item || !frameId) {
    return false;
  }
  if (!Array.isArray(item.frameIds) || item.frameIds.length === 0) {
    return true;
  }
  return item.frameIds.includes(frameId);
}

function hasFrameBinding(item) {
  return Boolean(Array.isArray(item?.frameIds) && item.frameIds.length);
}

function scopeLabel(frameIds) {
  if (!Array.isArray(frameIds) || frameIds.length === 0) {
    return "Global";
  }
  if (frameIds.length === 1) {
    return "This frame";
  }
  return `${frameIds.length} frames`;
}

function normalizeCompareMode(value) {
  return value === "sketch" || value === "output" ? value : "split";
}

async function savePreviewSnapshot() {
  const frame = currentFrame();
  if (!frame) {
    dom.previewStatus.textContent = "No frame selected to snapshot.";
    return;
  }

  try {
    dom.saveSnapshot.disabled = true;
    dom.previewStatus.textContent = "Saving preview snapshot...";
    const payload = await buildSnapshotRequestPayload(frame);
    const response = await fetch("/api/save-preview-snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Preview snapshot could not be saved.");
    }
    state.payload = {
      ...(state.payload || {}),
      previewSnapshots: data.previewSnapshots,
    };
    renderSnapshots();
    dom.previewStatus.textContent = `Preview snapshot saved for ${frame.title || "current frame"}`;
  } catch (error) {
    dom.previewStatus.textContent =
      error instanceof Error ? error.message : "Preview snapshot save failed";
  } finally {
    dom.saveSnapshot.disabled = false;
  }
}

async function buildSnapshotRequestPayload(frame) {
  const manifest = currentPayload()?.previewManifest || null;
  const target = resolvePreviewTargetEntry(
    manifest,
    state.manualPreviewUrl,
    frame.id,
  );
  const artifacts = collectManifestArtifacts(manifest).filter((item) =>
    itemMatchesFrame(item, frame.id),
  );
  const changes = collectManifestChanges(manifest).filter((item) =>
    itemMatchesFrame(item, frame.id),
  );
  const viewport = getViewport(frame);
  return {
    snapshot: {
      frameId: frame.id,
      frameTitle: frame.title || "Untitled frame",
      compareMode: state.compareMode,
      viewportLabel: viewport.label,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      targetLabel: target?.label || "",
      targetUrl: target?.resolvedUrl || target?.url || "",
      targetPath: target?.previewPath || "",
      note: `${artifacts.length} artifact${artifacts.length === 1 ? "" : "s"} • ${changes.length} changed file${changes.length === 1 ? "" : "s"}`,
      target,
      artifacts,
      changes,
    },
    sketchDataUrl: await resolveSketchDataUrl(frame),
  };
}

async function resolveSketchDataUrl(frame) {
  if (
    typeof frame?.liveSnapshotDataUrl === "string" &&
    frame.liveSnapshotDataUrl.startsWith("data:")
  ) {
    return frame.liveSnapshotDataUrl;
  }
  const sourceUrl =
    frame?.snapshotUrl ||
    frame?.liveThumbnailDataUrl ||
    frame?.thumbnailUrl ||
    "";
  if (!sourceUrl) {
    return "";
  }
  try {
    const response = await fetch(sourceUrl, { cache: "no-store" });
    if (!response.ok) {
      return "";
    }
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return "";
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Blob could not be read."));
    reader.readAsDataURL(blob);
  });
}

function formatViewportSize(snapshot) {
  if (!snapshot.viewportWidth || !snapshot.viewportHeight) {
    return "";
  }
  return `${snapshot.viewportWidth}×${snapshot.viewportHeight}`;
}

async function saveManualPreviewUrl() {
  const normalized = normalizeUrl(dom.manualPreviewUrl.value);
  if (!normalized) {
    dom.previewStatus.textContent =
      "Enter a valid preview URL such as http://localhost:3000";
    return;
  }

  try {
    dom.savePreviewUrl.disabled = true;
    const response = await fetch("/api/save-preview-manifest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        previewUrl: normalized,
        label: "Attached local preview",
        source: "preview-window",
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Preview target could not be saved.");
    }

    state.manualPreviewUrl = normalized;
    state.payload = {
      ...(state.payload || {}),
      previewManifest: data.manifest,
    };
    window.localStorage.setItem(PREVIEW_TARGET_KEY, normalized);
    dom.manualPreviewUrl.value = normalized;
    renderImplementationPreview();
    renderMeta();
    dom.previewStatus.textContent = "Preview target attached and saved";
  } catch (error) {
    dom.previewStatus.textContent =
      error instanceof Error ? error.message : "Preview target save failed";
  } finally {
    dom.savePreviewUrl.disabled = false;
  }
}

async function clearManualPreviewUrl() {
  try {
    dom.clearPreviewUrl.disabled = true;
    await fetch("/api/save-preview-manifest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
    });
  } catch {
    // Keep local clear behavior even if manifest removal fails.
  } finally {
    dom.clearPreviewUrl.disabled = false;
  }

  state.manualPreviewUrl = "";
  state.payload = {
    ...(state.payload || {}),
    previewManifest: null,
  };
  window.localStorage.removeItem(PREVIEW_TARGET_KEY);
  dom.manualPreviewUrl.value = "";
  renderImplementationPreview();
  renderMeta();
  dom.previewStatus.textContent = "Preview target cleared";
}

function normalizeUrl(input) {
  if (typeof input !== "string") {
    return "";
  }
  const value = input.trim();
  if (!value) {
    return "";
  }
  try {
    const url = new URL(value, window.location.origin);
    return url.toString();
  } catch {
    return "";
  }
}

function formatDateTime(value) {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
