const PREVIEW_TARGET_KEY = "canvax-preview-target-v1";
const FOLLOW_ACTIVE_KEY = "canvax-preview-follow-active-v1";
const COMPARE_MODE_KEY = "canvax-preview-compare-mode-v1";
const PLAY_MODE_KEY = "canvax-preview-play-mode-v1";
const LIVE_PREVIEW_STORAGE_KEY = "canvax-preview-live-v1";
const LIVE_PREVIEW_CHANNEL_NAME = "canvax-preview-live-v1";
const POLL_INTERVAL_MS = 2000;
const MAX_STAGE_WIDTH = 720;
const MAX_STAGE_HEIGHT = 560;
const MAX_OUTPUT_ACTIVITY_ITEMS = 8;
const wantsSelfTest =
  new URLSearchParams(window.location.search).get("selftest") === "1";
let previewSelfTestStarted = false;

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
  transportStatus: document.querySelector("#transport-status"),
  compareModeButtons: document.querySelector("#compare-mode-buttons"),
  saveSnapshot: document.querySelector("#save-snapshot"),
  refreshPreview: document.querySelector("#refresh-preview"),
  openBoard: document.querySelector("#open-board"),
  followActive: document.querySelector("#follow-active"),
  playFlow: document.querySelector("#play-flow"),
  followBadge: document.querySelector("#follow-badge"),
  viewportBadge: document.querySelector("#viewport-badge"),
  targetStateBadge: document.querySelector("#target-state-badge"),
  frameRailTitle: document.querySelector("#frame-rail-title"),
  frameRailCount: document.querySelector("#frame-rail-count"),
  frameRail: document.querySelector("#frame-rail"),
  manualPreviewUrl: document.querySelector("#manual-preview-url"),
  savePreviewUrl: document.querySelector("#save-preview-url"),
  clearPreviewUrl: document.querySelector("#clear-preview-url"),
  workspaceFollowNote: document.querySelector("#workspace-follow-note"),
  targetSummary: document.querySelector("#target-summary"),
  flowCountPreview: document.querySelector("#flow-count-preview"),
  flowListPreview: document.querySelector("#flow-list-preview"),
  artifactCount: document.querySelector("#artifact-count"),
  artifactList: document.querySelector("#artifact-list"),
  changeCount: document.querySelector("#change-count"),
  changeList: document.querySelector("#change-list"),
  outputActivityCount: document.querySelector("#output-activity-count"),
  outputActivityList: document.querySelector("#output-activity-list"),
  rewriteQueueCount: document.querySelector("#rewrite-queue-count"),
  rewriteQueueList: document.querySelector("#rewrite-queue-list"),
  rewriteHandoffState: document.querySelector("#rewrite-handoff-state"),
  rewriteHandoff: document.querySelector("#rewrite-handoff"),
  snapshotCount: document.querySelector("#snapshot-count"),
  snapshotList: document.querySelector("#snapshot-list"),
  selectedFrameTitle: document.querySelector("#selected-frame-title"),
  selectedFrameMeta: document.querySelector("#selected-frame-meta"),
  sketchViewer: document.querySelector("#sketch-viewer"),
  implementationViewer: document.querySelector("#implementation-viewer"),
  compareStage: document.querySelector("#compare-stage"),
  prototypePlayPanel: document.querySelector("#prototype-play-panel"),
  refinementSummary: document.querySelector("#refinement-summary"),
  refinementStats: document.querySelector("#refinement-stats"),
  refinementRegions: document.querySelector("#refinement-regions"),
  compareContextNote: document.querySelector("#compare-context-note"),
  compareContextList: document.querySelector("#compare-context-list"),
  frameNotesPreview: document.querySelector("#frame-notes-preview"),
  promptPreview: document.querySelector("#prompt-preview"),
  openTargetLink: document.querySelector("#open-target-link"),
  markTweak: document.querySelector("#mark-tweak"),
};

const state = {
  payload: null,
  livePayload: readLivePreviewPayload(),
  selectedFrameId: null,
  manualPreviewUrl: window.localStorage.getItem(PREVIEW_TARGET_KEY) || "",
  followActiveFrame: window.localStorage.getItem(FOLLOW_ACTIVE_KEY) !== "0",
  playMode: window.localStorage.getItem(PLAY_MODE_KEY) === "1",
  compareMode: normalizeCompareMode(
    window.localStorage.getItem(COMPARE_MODE_KEY),
  ),
  outputActivity: [],
  outputDigest: null,
  pollingTimer: null,
  tweakMode: false,
  tweakDraft: null,
};
const livePreviewChannel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel(LIVE_PREVIEW_CHANNEL_NAME)
    : null;

init();

function init() {
  if (state.playMode) {
    state.followActiveFrame = false;
    window.localStorage.setItem(FOLLOW_ACTIVE_KEY, "0");
  }
  dom.manualPreviewUrl.value = state.manualPreviewUrl;
  renderFollowActiveControls();
  renderPlayModeButton();
  bindInteractionFeedback();
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
  dom.playFlow.addEventListener("click", togglePlayMode);
  dom.prototypePlayPanel.addEventListener("click", onPrototypePlayClick);
  dom.compareStage.addEventListener("click", onPrototypeHotspotClick);
  dom.compareModeButtons.addEventListener("click", onCompareModeClick);
  dom.markTweak.addEventListener("click", toggleTweakMode);
  dom.implementationViewer.addEventListener("pointerdown", onTweakPointerDown);
  dom.implementationViewer.addEventListener("pointermove", onTweakPointerMove);
  dom.implementationViewer.addEventListener("pointerup", onTweakPointerUp);
  dom.implementationViewer.addEventListener("pointercancel", cancelTweakDraft);
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

function bindInteractionFeedback() {
  const interactiveSelector = "button, .ghost-link, [role='button']";

  document.addEventListener("pointerdown", (event) => {
    const target = event.target.closest(interactiveSelector);
    if (!target || target.matches(":disabled")) {
      return;
    }
    applyInteractionClass(target, "ux-press", 180);
  });

  document.addEventListener("click", (event) => {
    const target = event.target.closest(interactiveSelector);
    if (!target || target.matches(":disabled")) {
      return;
    }
    applyInteractionClass(target, "ux-flash", 220);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    const target = event.target.closest(interactiveSelector);
    if (!target || target.matches(":disabled")) {
      return;
    }
    applyInteractionClass(target, "ux-press", 180);
  });
}

function applyInteractionClass(element, className, durationMs) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  const timerKey =
    className === "ux-press" ? "__uxPressTimer" : "__uxFlashTimer";
  if (element[timerKey]) {
    window.clearTimeout(element[timerKey]);
  }

  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  element[timerKey] = window.setTimeout(() => {
    element.classList.remove(className);
    element[timerKey] = 0;
  }, durationMs);
}

async function refreshPreviewState({ manual }) {
  try {
    const response = await fetch("/api/preview-state", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Preview state could not load.");
    }
    const localOutputActivity = updateOutputActivityHistory(
      state.outputActivity,
      state.outputDigest,
      payload.outputDigest || null,
      payload.updatedAt || new Date().toISOString(),
    );
    const persistedOutputActivity = buildOutputActivityFromSessionEvents(
      payload.sessionEvents || [],
    );
    state.outputActivity = mergeOutputActivityEntries(
      localOutputActivity,
      persistedOutputActivity,
    );
    state.outputDigest = payload.outputDigest || null;
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
    if (wantsSelfTest) {
      return;
    }
    state.pollingTimer = window.setTimeout(() => {
      void refreshPreviewState({ manual: false });
    }, POLL_INTERVAL_MS);
  }
}

function toggleFollowActive() {
  state.followActiveFrame = !state.followActiveFrame;
  if (state.followActiveFrame) {
    state.playMode = false;
    window.localStorage.setItem(PLAY_MODE_KEY, "0");
  }
  window.localStorage.setItem(
    FOLLOW_ACTIVE_KEY,
    state.followActiveFrame ? "1" : "0",
  );
  renderFollowActiveControls();
  renderPlayModeButton();
  syncSelectedFrame();
  renderAll();
}

function togglePlayMode() {
  const liveExport = currentLiveExport();
  const frames = liveExport?.frames || [];
  if (!frames.length) {
    return;
  }
  state.playMode = !state.playMode;
  if (state.playMode) {
    state.followActiveFrame = false;
    state.selectedFrameId =
      liveExport.entryFrameId ||
      liveExport.activeFrameId ||
      state.selectedFrameId ||
      frames[0].id;
    window.localStorage.setItem(FOLLOW_ACTIVE_KEY, "0");
  }
  window.localStorage.setItem(PLAY_MODE_KEY, state.playMode ? "1" : "0");
  renderFollowActiveControls();
  renderPlayModeButton();
  syncSelectedFrame();
  renderAll();
}

function renderFollowActiveControls() {
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
}

function renderPlayModeButton() {
  dom.playFlow.setAttribute("aria-pressed", String(state.playMode));
  dom.playFlow.textContent = state.playMode ? "Stop play" : "Play flow";
  dom.playFlow.classList.toggle("active", state.playMode);
}

function onPrototypePlayClick(event) {
  const nextButton = event.target.closest("[data-play-frame]");
  if (nextButton) {
    selectPrototypeFrame(nextButton.dataset.playFrame);
    return;
  }
  const entryButton = event.target.closest("[data-play-entry]");
  if (entryButton) {
    const liveExport = currentLiveExport();
    selectPrototypeFrame(
      liveExport?.entryFrameId ||
        liveExport?.activeFrameId ||
        state.selectedFrameId,
    );
  }
}

function onPrototypeHotspotClick(event) {
  const hotspot = event.target.closest("[data-prototype-hotspot-frame]");
  if (!hotspot) {
    return;
  }
  event.preventDefault();
  selectPrototypeFrame(hotspot.dataset.prototypeHotspotFrame);
}

function selectPrototypeFrame(frameId) {
  const frames = currentLiveExport()?.frames || [];
  if (!frameId || !frames.some((frame) => frame.id === frameId)) {
    return;
  }
  state.selectedFrameId = frameId;
  state.followActiveFrame = false;
  state.playMode = true;
  window.localStorage.setItem(FOLLOW_ACTIVE_KEY, "0");
  window.localStorage.setItem(PLAY_MODE_KEY, "1");
  renderFollowActiveControls();
  renderPlayModeButton();
  renderAll();
}

function syncSelectedFrame() {
  const frames = currentLiveExport()?.frames || [];
  if (!frames.length) {
    state.selectedFrameId = null;
    return;
  }

  const frameIds = new Set(frames.map((frame) => frame.id).filter(Boolean));
  const firstFrameId = frames[0].id;
  const firstExistingFrameId = (...ids) =>
    ids.find((id) => id && frameIds.has(id)) || firstFrameId;
  const activeFrameId = currentLiveExport()?.activeFrameId;
  const entryFrameId = currentLiveExport()?.entryFrameId;
  if (state.playMode) {
    const selectedStillExists = frameIds.has(state.selectedFrameId);
    if (!selectedStillExists) {
      state.selectedFrameId = firstExistingFrameId(entryFrameId, activeFrameId);
    }
    return;
  }
  if (state.followActiveFrame) {
    state.selectedFrameId = firstExistingFrameId(activeFrameId, entryFrameId);
    return;
  }

  const selectedStillExists = frameIds.has(state.selectedFrameId);
  if (!selectedStillExists) {
    state.selectedFrameId = firstExistingFrameId(activeFrameId, entryFrameId);
  }
}

function renderAll() {
  renderMeta();
  renderCompareMode();
  renderFrameRail();
  renderFlow();
  renderManifestContext();
  renderOutputActivity();
  renderRewriteQueue();
  renderRewriteHandoff();
  renderSnapshots();
  renderSelectedFrame();
  renderImplementationPreview();
  renderPrototypePlay();
  renderTweakControls();
  renderPrompt();
  maybeRunPreviewSelfTest();
}

function renderMeta() {
  const payload = currentPayload();
  const lastUpdated = payload?.liveExport?.generatedAt || payload?.updatedAt;
  dom.transportStatus.textContent = describeTransportSummary(
    resolveTransportDescriptor(payload),
  );
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
  const refinement = resolveCurrentRefinement(
    manifestTarget,
    collectManifestArtifacts(manifest),
    state.selectedFrameId,
  );
  const refinementSummary = describeRefinementSummary(refinement);

  renderTargetStateBadge(freshness, manifestTarget);

  if (manifestTarget && (artifactCount || changeCount)) {
    if (freshness?.stale) {
      dom.previewStatus.textContent = freshness.message;
      return;
    }
    dom.previewStatus.textContent = refinementSummary
      ? `${refinementSummary} ${artifactCount} artifact${artifactCount === 1 ? "" : "s"} and ${changeCount} changed file${changeCount === 1 ? "" : "s"} are connected.`
      : `Sketch synced with ${artifactCount} artifact${artifactCount === 1 ? "" : "s"} and ${changeCount} changed file${changeCount === 1 ? "" : "s"}`;
    return;
  }

  dom.previewStatus.textContent = manifestTarget
    ? refinementSummary || "Sketch synced and implementation target connected"
    : "Sketch synced. Attach a preview URL, let Codex write a target, or use Generate screen in the board to generate one here";
}

function renderFrameRail() {
  const frames = currentLiveExport()?.frames || [];
  const manifest = currentPayload()?.previewManifest || null;
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
      const outputStatus = describeFrameOutputStatus(frame, manifest, {
        includeGlobal: frame.id === state.selectedFrameId,
      });
      const thumb = wantsSelfTest
        ? ""
        : frame.liveThumbnailDataUrl || frame.thumbnailUrl || frame.snapshotUrl;
      return `
        <button class="frame-card ${active}" type="button" data-frame-id="${escapeHtml(frame.id)}">
          <div class="frame-thumb">${thumb ? `<img src="${escapeHtml(thumb)}" alt="" />` : ""}</div>
          <div class="frame-meta">
            <div class="frame-meta-row">
              <strong>${index + 1}. ${escapeHtml(frame.title || `Frame ${index + 1}`)}</strong>
              ${renderFrameOutputBadge(outputStatus)}
            </div>
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
      renderPrototypePlay();
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
  const outputStatus = describeFrameOutputStatus(
    frame,
    currentPayload()?.previewManifest || null,
    { includeGlobal: true },
  );
  const refinement = resolveCurrentRefinement(
    resolvePreviewTargetEntry(
      currentPayload()?.previewManifest,
      state.manualPreviewUrl,
      frame.id,
    ),
    collectManifestArtifacts(currentPayload()?.previewManifest || null),
    frame.id,
  );
  dom.selectedFrameTitle.textContent = frame.title || "Untitled frame";
  const metaParts = [
    viewport.label,
    `${viewport.width}×${viewport.height}`,
    `updated ${formatDateTime(frame.updatedAt)}`,
  ];
  if (outputStatus?.label) {
    metaParts.push(outputStatus.label.toLowerCase());
  }
  dom.selectedFrameMeta.textContent = metaParts.join(" • ");
  dom.selectedFrameMeta.title = outputStatus?.detail || "";
  dom.viewportBadge.textContent = `${viewport.label} ${viewport.width}×${viewport.height}`;

  const imageUrl =
    frame.liveSnapshotDataUrl ||
    frame.snapshotUrl ||
    frame.liveThumbnailDataUrl ||
    frame.thumbnailUrl;
  if (imageUrl) {
    const capacity = measureViewerCapacity(dom.sketchViewer);
    const stage = buildViewportStage({
      viewport,
      capacity,
      inner: wantsSelfTest
        ? `<div class="viewport-content viewport-placeholder">Sketch preview ready for ${escapeHtml(frame.title || "current frame")}</div>`
        : `<img class="viewport-image viewport-content" src="${escapeHtml(imageUrl)}" alt="Saved sketch for ${escapeHtml(frame.title || "current frame")}" />`,
      changeRegions: refinement?.changedRegions || [],
      hotspots: state.playMode ? buildPrototypeHotspotsForFrame(frame) : [],
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

function renderPrototypePlay() {
  const liveExport = currentLiveExport();
  const frames = Array.isArray(liveExport?.frames) ? liveExport.frames : [];
  const connections = Array.isArray(liveExport?.connections)
    ? liveExport.connections
    : [];
  const frame = currentFrame();
  if (!frames.length) {
    dom.prototypePlayPanel.className = "prototype-play-panel empty-state";
    dom.prototypePlayPanel.textContent =
      "Connect frames in Canvax Flow view to play this storyboard.";
    return;
  }

  const outgoing = connections.filter(
    (connection) => connection.fromFrameId === frame?.id,
  );
  const entryFrame =
    frames.find((candidate) => candidate.id === liveExport.entryFrameId) ||
    frames[0];
  const status = state.playMode
    ? `Playing from ${frame?.title || "selected frame"}`
    : "Flow links are ready to play";

  dom.prototypePlayPanel.className = `prototype-play-panel${
    state.playMode ? " active" : ""
  }`;
  dom.prototypePlayPanel.innerHTML = `
    <div class="prototype-play-head">
      <div>
        <strong>${escapeHtml(status)}</strong>
        <p class="manifest-copy">${escapeHtml(
          outgoing.length
            ? "Choose a transition to move through the connected frames."
            : "This frame has no outgoing transition yet.",
        )}</p>
      </div>
      <button class="ghost-button compact" type="button" data-play-entry="true">
        Entry: ${escapeHtml(entryFrame?.title || "Frame 1")}
      </button>
    </div>
    <div class="prototype-actions">
      ${
        outgoing.length
          ? outgoing
              .map((connection, index) => {
                const target = frames.find(
                  (candidate) => candidate.id === connection.toFrameId,
                );
                return `
                  <button class="prototype-step" type="button" data-play-frame="${escapeHtml(connection.toFrameId)}">
                    <span>${index + 1}</span>
                    <strong>${escapeHtml(connection.label || "Continue")}</strong>
                    <small>${escapeHtml(target?.title || connection.toTitle || connection.toFrameId)}</small>
                  </button>
                `;
              })
              .join("")
          : `<span class="empty-state">No outgoing link from this frame.</span>`
      }
    </div>
  `;
}

function renderImplementationPreview() {
  const frame = currentFrame();
  const manifest = currentPayload()?.previewManifest || null;
  const target = resolvePreviewTargetEntry(
    manifest,
    state.manualPreviewUrl,
    state.selectedFrameId,
  );
  const refinement = resolveCurrentRefinement(
    target,
    collectManifestArtifacts(manifest),
    frame?.id || state.selectedFrameId,
  );
  const targetUrl = target?.resolvedUrl || target?.url || "";
  dom.openTargetLink.hidden = !targetUrl;
  dom.openTargetLink.href = targetUrl || "#";

  if (!frame) {
    dom.implementationViewer.className = "surface-viewer empty-state";
    state.tweakMode = false;
    renderTweakControls();
    dom.implementationViewer.textContent = "No selected frame yet.";
    return;
  }

  if (!target) {
    dom.implementationViewer.className = "surface-viewer empty-state";
    state.tweakMode = false;
    renderTweakControls();
    dom.implementationViewer.textContent =
      "No connected implementation preview yet. Attach a local preview URL, let Codex write a preview manifest target, or use Generate screen in the main board.";
    return;
  }

  const viewport = getViewport(frame);
  const capacity = measureViewerCapacity(dom.implementationViewer);
  const renderUrl = buildImplementationTargetUrl(
    target,
    collectManifestArtifacts(manifest),
    collectManifestChanges(manifest),
    frame.id,
    state.outputDigest,
  );
  const stage = buildViewportStage({
    viewport,
    capacity,
    inner: wantsSelfTest
      ? `<div class="viewport-content viewport-placeholder" data-target-url="${escapeHtml(renderUrl)}">Connected implementation preview ready</div>`
      : `<iframe class="viewport-iframe viewport-content" src="${escapeHtml(renderUrl)}" title="Connected implementation preview"></iframe>`,
    changeRegions: refinement?.changedRegions || [],
    hotspots: state.playMode ? buildPrototypeHotspotsForFrame(frame) : [],
    tweakLayer: true,
  });
  dom.implementationViewer.className = "surface-viewer";
  dom.implementationViewer.classList.toggle("tweak-mode", state.tweakMode);
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
  renderWorkspaceFollowNote(currentPayload()?.workspaceFollow || null);
  renderRefinement(target, artifacts);
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
    const targetKind =
      target.type === "generated-screen-preview"
        ? "generated screen"
        : target.type === "materialized-preview"
          ? "materialized"
          : target.type || "preview";
    currentItems.push({
      label: target.label || "Connected target",
      kind: targetKind,
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

  const notes = compactDisplayText(
    manifest && typeof manifest.notes === "string" ? manifest.notes : "",
    360,
  );
  const href = target.resolvedUrl || target.url || "";
  const routeLabel = target.previewPath || href || "Connected target";
  const freshness = describeManifestFreshness(target, currentFrame());
  const refinementSummary = describeRefinementSummary(target.refinement);
  const targetKind =
    target.type === "generated-screen-preview"
      ? "generated screen"
      : target.type === "materialized-preview"
        ? "materialized"
        : target.type || "preview";
  dom.targetSummary.className = "target-summary";
  dom.targetSummary.innerHTML = `
    <div class="target-card">
      <div class="target-card-row">
        <strong>${escapeHtml(target.label || "Connected implementation")}</strong>
        <span class="target-badge">${escapeHtml(targetKind)}</span>
      </div>
      <p class="target-meta">${escapeHtml(target.source || "manifest")} • ${escapeHtml(routeLabel)}</p>
      ${target.description ? `<p class="target-copy">${escapeHtml(target.description)}</p>` : ""}
      ${freshness?.message ? `<p class="target-copy${freshness.stale ? " warning-copy" : " subtle"}">${escapeHtml(freshness.message)}</p>` : ""}
      ${refinementSummary ? `<p class="target-copy subtle">${escapeHtml(refinementSummary)}</p>` : ""}
      ${notes ? `<p class="target-copy subtle">${escapeHtml(notes)}</p>` : ""}
      ${href ? `<a class="ghost-link target-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">Open connected target</a>` : ""}
    </div>
  `;
}

function renderOutputActivity() {
  const items = Array.isArray(state.outputActivity) ? state.outputActivity : [];
  dom.outputActivityCount.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;
  if (!items.length) {
    dom.outputActivityList.className = "manifest-list empty-state";
    dom.outputActivityList.textContent =
      "No live output activity yet. Connected output updates will appear here while you keep sketching.";
    return;
  }

  dom.outputActivityList.className = "manifest-list";
  dom.outputActivityList.innerHTML = items
    .map(
      (item) => `
        <article class="manifest-item activity-item">
          <div class="manifest-item-row">
            <strong>${escapeHtml(item.summary || "Output update")}</strong>
            <span class="target-badge subtle">${escapeHtml(timeLabel(item.at))}</span>
          </div>
          ${item.detail ? `<p class="manifest-copy">${escapeHtml(item.detail)}</p>` : ""}
        </article>
      `,
    )
    .join("");
}

function renderRewriteQueue() {
  const items = buildRewriteQueue(
    currentLiveExport()?.frames || [],
    currentPayload()?.previewManifest || null,
    currentLiveExport()?.activeFrameId || state.selectedFrameId,
  );
  dom.rewriteQueueCount.textContent = `${items.length} ${items.length === 1 ? "frame" : "frames"}`;
  if (!items.length) {
    dom.rewriteQueueList.className = "manifest-list empty-state";
    dom.rewriteQueueList.textContent =
      "No frames currently need rewrite attention.";
    return;
  }

  dom.rewriteQueueList.className = "manifest-list";
  dom.rewriteQueueList.innerHTML = items
    .map(
      (item) => `
        <article class="manifest-item${item.frameId === state.selectedFrameId ? " active" : ""}">
          <div class="manifest-item-row">
            <strong>${escapeHtml(item.title || "Untitled frame")}</strong>
            <div class="manifest-item-badges">
              <span class="target-badge ${escapeHtml(item.tone || "subtle")}">${escapeHtml(item.label)}</span>
            </div>
          </div>
          ${item.detail ? `<p class="manifest-copy">${escapeHtml(item.detail)}</p>` : ""}
        </article>
      `,
    )
    .join("");
}

function renderRewriteHandoff() {
  const payload = currentPayload();
  const liveExport = currentLiveExport();
  const request = liveExport?.rewriteRequest || null;
  const manifest = payload?.previewManifest || null;
  const previewTweak = payload?.previewTweak || null;
  const frame = currentFrame();
  const frameId = frame?.id || state.selectedFrameId || liveExport?.activeFrameId || "";
  const relevantTweak = previewTweakMatchesFrame(previewTweak, frameId)
    ? previewTweak
    : null;
  const targets = collectManifestTargets(manifest);
  const executorTarget = targets.find(
    (target) =>
      itemMatchesFrame(target, frameId) &&
      (target.source === "canvax-rewrite-request-executor" ||
        target.type === "refined-preview"),
  );
  const queue = Array.isArray(request?.rewriteQueue)
    ? request.rewriteQueue
    : buildRewriteQueue(liveExport?.frames || [], manifest, frameId);
  const relevantQueue = frameId
    ? queue.filter((item) => item.frameId === frameId)
    : queue;
  const requestHref = workspaceHrefForPath(
    payload?.paths?.rewriteRequestMarkdownPath ||
      payload?.paths?.rewriteRequestJsonPath ||
      request?.handoff?.liveJsonPath,
  );
  const outputHref =
    executorTarget?.resolvedUrl ||
    executorTarget?.url ||
    workspaceHrefForPath(executorTarget?.previewPath);
  const contextArtifact = collectManifestArtifacts(manifest).find(
    (artifact) =>
      itemMatchesFrame(artifact, frameId) &&
      /rewrite request context/i.test(
        `${artifact.label || ""} ${artifact.description || ""}`,
      ),
  );
  const contextHref =
    contextArtifact?.resolvedUrl || workspaceHrefForPath(contextArtifact?.path);

  if (!request) {
    dom.rewriteHandoffState.textContent = "Waiting";
    dom.rewriteHandoff.className = "rewrite-handoff empty-state";
    dom.rewriteHandoff.textContent =
      "No rewrite request has been exported yet. Save or autosnap the board after sketching corrections.";
    return;
  }

  const status = executorTarget
    ? {
        label: "Executed",
        tone: "synced",
        detail:
          "A refreshed frame-bound output target has been published from the latest rewrite request.",
      }
    : relevantTweak
      ? {
          label: "Tweak ready",
          tone: "warning",
          detail:
            "A Preview region tweak is saved for this frame. Run npm run execute-rewrite or ask Codex to apply the marked region.",
        }
      : relevantQueue.length
      ? {
          label: "Ready",
          tone: "warning",
          detail:
            "This frame has rewrite attention. Run npm run execute-rewrite or let Codex implement the request.",
        }
      : {
          label: "Watching",
          tone: "subtle",
          detail:
            "Rewrite handoff exists. No selected-frame queue item is currently active.",
        };

  dom.rewriteHandoffState.textContent = status.label;
  dom.rewriteHandoff.className = "rewrite-handoff";
  dom.rewriteHandoff.innerHTML = `
    <article class="rewrite-handoff-card">
      <div class="rewrite-handoff-head">
        <strong>${escapeHtml(request.activeFrameTitle || frame?.title || "Current frame")}</strong>
        <span class="target-badge ${escapeHtml(status.tone)}">${escapeHtml(status.label)}</span>
      </div>
      <p class="manifest-copy">${escapeHtml(status.detail)}</p>
      <div class="rewrite-steps" aria-label="Rewrite handoff progress">
        ${renderRewriteStep("Request exported", true, compactPath(payload?.paths?.rewriteRequestJsonPath || "exports/canvax-rewrite-request-latest.json"))}
        ${renderRewriteStep("Preview tweak", Boolean(relevantTweak), relevantTweak?.note || "Mark tweak in Preview")}
        ${renderRewriteStep("Executor artifact", Boolean(executorTarget), executorTarget?.label || "npm run execute-rewrite")}
        ${renderRewriteStep("Manifest binding", Boolean(executorTarget), executorTarget?.previewPath || executorTarget?.url || "artifacts/canvax/codex-output.json")}
      </div>
      <div class="rewrite-handoff-actions">
        <code>npm run execute-rewrite</code>
        ${requestHref ? `<a class="ghost-link" href="${escapeHtml(requestHref)}" target="_blank" rel="noopener noreferrer">Open request</a>` : ""}
        ${outputHref ? `<a class="ghost-link" href="${escapeHtml(outputHref)}" target="_blank" rel="noopener noreferrer">Open output</a>` : ""}
        ${contextHref ? `<a class="ghost-link" href="${escapeHtml(contextHref)}" target="_blank" rel="noopener noreferrer">Open context</a>` : ""}
        ${relevantTweak?.markdownHref || relevantTweak?.href ? `<a class="ghost-link" href="${escapeHtml(relevantTweak.markdownHref || relevantTweak.href)}" target="_blank" rel="noopener noreferrer">Open tweak</a>` : ""}
      </div>
      ${
        relevantTweak
          ? `<p class="manifest-copy subtle">${escapeHtml(`Preview tweak: ${relevantTweak.note || "selected output region"}`)}</p>`
          : ""
      }
      ${
        relevantQueue.length
          ? `<p class="manifest-copy subtle">${escapeHtml(relevantQueue[0]?.detail || relevantQueue[0]?.label || "Rewrite queued.")}</p>`
          : ""
      }
    </article>
  `;
}

function previewTweakMatchesFrame(tweak, frameId) {
  if (!tweak || tweak.kind !== "canvax-preview-tweak-request") {
    return false;
  }
  const tweakFrameId = cleanString(tweak.frameId);
  return !tweakFrameId || !frameId || tweakFrameId === frameId;
}

function renderRewriteStep(label, done, detail) {
  return `
    <div class="rewrite-step${done ? " done" : ""}">
      <span>${done ? "ok" : "--"}</span>
      <div>
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml(compactPath(detail || ""))}</small>
      </div>
    </div>
  `;
}

function renderWorkspaceFollowNote(workspaceFollow) {
  const message = describeWorkspaceFollow(workspaceFollow);
  dom.workspaceFollowNote.hidden = !message;
  dom.workspaceFollowNote.textContent = message;
}

function buildImplementationTargetUrl(
  target,
  artifacts,
  changes,
  frameId,
  outputDigest,
) {
  const sourceUrl = target?.resolvedUrl || target?.url || "";
  if (!sourceUrl) {
    return "";
  }
  const revisionKey = buildImplementationRevisionKey(
    target,
    artifacts,
    changes,
    frameId,
    outputDigest,
  );
  return withRevisionParam(sourceUrl, revisionKey);
}

function buildImplementationRevisionKey(
  target,
  artifacts,
  changes,
  frameId,
  outputDigest,
) {
  const relevantArtifacts = Array.isArray(artifacts)
    ? artifacts
        .filter(
          (item) => itemMatchesFrame(item, frameId) || !hasFrameBinding(item),
        )
        .map((item) => ({
          id: item.id,
          path: item.path,
          kind: item.kind,
          versionTag: item.versionTag,
          generatedAt: item.generatedAt,
        }))
    : [];
  const relevantChanges = Array.isArray(changes)
    ? changes
        .filter(
          (item) => itemMatchesFrame(item, frameId) || !hasFrameBinding(item),
        )
        .filter((item) => isImplementationChangeCandidate(item.path))
        .map((item) => ({
          id: item.id,
          path: item.path,
          kind: item.kind,
          summary: item.summary,
        }))
    : [];
  const fingerprint = JSON.stringify({
    digest: outputDigest?.digest || "",
    target: target
      ? {
          id: target.id,
          url: target.url,
          resolvedUrl: target.resolvedUrl,
          previewPath: target.previewPath,
          versionTag: target.versionTag,
          generatedAt: target.generatedAt,
          sourceFrameUpdatedAt: target.sourceFrameUpdatedAt,
          refinement: target.refinement
            ? {
                iteration: target.refinement.iteration,
                summary: target.refinement.summary,
              }
            : null,
        }
      : null,
    artifacts: relevantArtifacts,
    changes: relevantChanges,
  });
  return hashString(fingerprint);
}

function withRevisionParam(url, revision) {
  const nextRevision = String(revision || "").trim();
  if (!nextRevision) {
    return url;
  }
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set("canvax_rev", nextRevision);
    return parsed.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}canvax_rev=${encodeURIComponent(nextRevision)}`;
  }
}

function renderRefinement(target, artifacts) {
  const frame = currentFrame();
  if (!frame) {
    dom.refinementSummary.textContent = "Select a frame to inspect refinement.";
    dom.refinementStats.className = "refinement-stats empty-state";
    dom.refinementStats.textContent = "No frame selected yet.";
    dom.refinementRegions.className = "refinement-regions empty-state";
    dom.refinementRegions.textContent = "Changed regions will appear here.";
    return;
  }

  const refinement = resolveCurrentRefinement(target, artifacts, frame.id);
  if (!refinement || !describeRefinementSummary(refinement)) {
    dom.refinementSummary.textContent =
      "No materialized refinement data for this frame yet.";
    dom.refinementStats.className = "refinement-stats empty-state";
    dom.refinementStats.textContent =
      "Generate or materialize this frame, then continue editing it to see the delta between revisions.";
    dom.refinementRegions.className = "refinement-regions empty-state";
    dom.refinementRegions.textContent =
      "Changed sketch regions will appear here after a refreshed generation pass.";
    return;
  }

  const stats = [
    [`Iteration`, String(refinement.iteration || 1)],
    [
      `Regions`,
      String(
        refinement.counts?.regionCount || refinement.changedRegions.length || 0,
      ),
    ],
    [`Updated`, String(refinement.counts?.updated || 0)],
    [`Added`, String(refinement.counts?.added || 0)],
    [`Removed`, String(refinement.counts?.removed || 0)],
    [`Notes`, String(refinement.counts?.noteFieldsChanged || 0)],
  ];

  dom.refinementSummary.textContent = describeRefinementSummary(refinement);
  dom.refinementStats.className = "refinement-stats";
  dom.refinementStats.innerHTML = stats
    .map(
      ([label, value]) => `
        <article class="refinement-stat">
          <strong>${escapeHtml(value)}</strong>
          <p class="manifest-copy">${escapeHtml(label)}</p>
        </article>
      `,
    )
    .join("");

  if (!refinement.changedRegions.length) {
    dom.refinementRegions.className = "refinement-regions empty-state";
    dom.refinementRegions.textContent =
      "This refinement did not produce explicit region boxes.";
    return;
  }

  dom.refinementRegions.className = "refinement-regions";
  dom.refinementRegions.innerHTML = refinement.changedRegions
    .map(
      (region, index) => `
        <article class="refinement-region">
          <div class="refinement-region-meta">
            <strong>${escapeHtml(region.label || `Region ${index + 1}`)}</strong>
            <span class="target-badge subtle">${escapeHtml(region.kind || "updated")}</span>
          </div>
          <p class="manifest-copy">${escapeHtml(`x ${Math.round(region.left)} • y ${Math.round(region.top)} • ${Math.round(region.width)}×${Math.round(region.height)}`)}</p>
        </article>
      `,
    )
    .join("");
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

function renderTweakControls() {
  const frame = currentFrame();
  const target = resolvePreviewTargetEntry(
    currentPayload()?.previewManifest || null,
    state.manualPreviewUrl,
    state.selectedFrameId,
  );
  const enabled = Boolean(frame && target);
  dom.markTweak.disabled = !enabled;
  dom.markTweak.classList.toggle("active", state.tweakMode && enabled);
  dom.markTweak.setAttribute("aria-pressed", String(state.tweakMode && enabled));
  dom.markTweak.textContent = state.tweakMode ? "Drag region" : "Mark tweak";
  if (!enabled && state.tweakMode) {
    state.tweakMode = false;
    state.tweakDraft = null;
  }
}

function toggleTweakMode() {
  if (dom.markTweak.disabled) {
    return;
  }
  state.tweakMode = !state.tweakMode;
  state.tweakDraft = null;
  renderTweakControls();
  renderImplementationPreview();
  dom.previewStatus.textContent = state.tweakMode
    ? "Drag over the generated output region to create a Codex tweak request."
    : "Preview tweak mode off.";
}

function onTweakPointerDown(event) {
  if (!state.tweakMode) {
    return;
  }
  const layer = event.target.closest("[data-preview-tweak-layer]");
  if (!layer) {
    return;
  }
  event.preventDefault();
  const point = pointInTweakLayer(event, layer);
  state.tweakDraft = {
    pointerId: event.pointerId,
    layer,
    start: point,
    current: point,
  };
  try {
    layer.setPointerCapture(event.pointerId);
  } catch {
    // Pointer capture is best-effort for browser/self-test compatibility.
  }
  renderTweakDraft();
}

function onTweakPointerMove(event) {
  if (!state.tweakDraft || event.pointerId !== state.tweakDraft.pointerId) {
    return;
  }
  event.preventDefault();
  state.tweakDraft.current = pointInTweakLayer(event, state.tweakDraft.layer);
  renderTweakDraft();
}

function onTweakPointerUp(event) {
  if (!state.tweakDraft || event.pointerId !== state.tweakDraft.pointerId) {
    return;
  }
  event.preventDefault();
  const draft = state.tweakDraft;
  state.tweakDraft = null;
  try {
    draft.layer.releasePointerCapture(event.pointerId);
  } catch {
    // Ignore capture release failures.
  }
  const region = buildTweakRegion(draft);
  draft.layer.innerHTML = "";
  if (!region || region.normalized.width < 0.01 || region.normalized.height < 0.01) {
    dom.previewStatus.textContent = "Tweak region was too small.";
    return;
  }
  const note =
    window.prompt(
      "What should Codex change in this output region?",
      "Refine this selected region to match the sketch and notes.",
    ) || "";
  void savePreviewTweak(region, note);
}

function cancelTweakDraft() {
  if (state.tweakDraft?.layer) {
    state.tweakDraft.layer.innerHTML = "";
  }
  state.tweakDraft = null;
}

function pointInTweakLayer(event, layer) {
  const rect = layer.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1),
    y: clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1),
    pixelX: clamp(event.clientX - rect.left, 0, rect.width),
    pixelY: clamp(event.clientY - rect.top, 0, rect.height),
    width: rect.width,
    height: rect.height,
  };
}

function renderTweakDraft() {
  const draft = state.tweakDraft;
  if (!draft?.layer) {
    return;
  }
  const region = buildTweakRegion(draft);
  if (!region) {
    draft.layer.innerHTML = "";
    return;
  }
  draft.layer.innerHTML = `
    <div
      class="preview-tweak-box"
      style="left:${region.normalized.x * 100}%; top:${region.normalized.y * 100}%; width:${region.normalized.width * 100}%; height:${region.normalized.height * 100}%;"
    ></div>
  `;
}

function buildTweakRegion(draft) {
  if (!draft?.start || !draft?.current) {
    return null;
  }
  const left = Math.min(draft.start.x, draft.current.x);
  const top = Math.min(draft.start.y, draft.current.y);
  const right = Math.max(draft.start.x, draft.current.x);
  const bottom = Math.max(draft.start.y, draft.current.y);
  const pixelLeft = Math.min(draft.start.pixelX, draft.current.pixelX);
  const pixelTop = Math.min(draft.start.pixelY, draft.current.pixelY);
  const pixelRight = Math.max(draft.start.pixelX, draft.current.pixelX);
  const pixelBottom = Math.max(draft.start.pixelY, draft.current.pixelY);
  return {
    normalized: {
      x: roundMetric(left),
      y: roundMetric(top),
      width: roundMetric(right - left),
      height: roundMetric(bottom - top),
    },
    pixel: {
      x: Math.round(pixelLeft),
      y: Math.round(pixelTop),
      width: Math.max(1, Math.round(pixelRight - pixelLeft)),
      height: Math.max(1, Math.round(pixelBottom - pixelTop)),
    },
  };
}

async function savePreviewTweak(region, note) {
  const frame = currentFrame();
  const target = resolvePreviewTargetEntry(
    currentPayload()?.previewManifest || null,
    state.manualPreviewUrl,
    state.selectedFrameId,
  );
  if (!frame || !target) {
    dom.previewStatus.textContent = "No frame or output target for tweak request.";
    return;
  }
  const viewport = getViewport(frame);
  dom.previewStatus.textContent = "Saving preview tweak request...";
  try {
    const response = await fetch("/api/save-preview-tweak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tweak: {
          frameId: frame.id,
          frameTitle: frame.title || "",
          compareMode: state.compareMode,
          viewportLabel: viewport.label,
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
          target: {
            id: target.id || "",
            label: target.label || "",
            type: target.type || "",
            url: target.url || target.resolvedUrl || "",
            previewPath: target.previewPath || "",
            source: target.source || "",
            description: target.description || "",
          },
          region,
          note,
        },
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Preview tweak save failed.");
    }
    state.tweakMode = false;
    renderTweakControls();
    dom.previewStatus.textContent = `Preview tweak saved: ${data.tweak?.id || "latest request"}`;
    await refreshPreviewState({ manual: false });
  } catch (error) {
    dom.previewStatus.textContent =
      error instanceof Error ? error.message : "Preview tweak save failed.";
  }
}

function buildViewportStage({
  viewport,
  inner,
  changeRegions = [],
  hotspots = [],
  capacity = null,
  tweakLayer = false,
}) {
  const scale = computeViewportScale(viewport, capacity);
  const stageWidth = Math.max(160, Math.round(viewport.width * scale));
  const stageHeight = Math.max(160, Math.round(viewport.height * scale));
  const overlayMarkup = buildChangeOverlayMarkup(changeRegions, scale);
  const hotspotMarkup = buildPrototypeHotspotMarkup(hotspots, viewport, scale);
  const tweakMarkup = tweakLayer
    ? '<div class="preview-tweak-layer" data-preview-tweak-layer="true" aria-hidden="true"></div>'
    : "";

  return `
    <div
      class="viewport-shell"
      style="--viewport-width:${viewport.width}; --viewport-height:${viewport.height}; --viewer-scale:${scale}; --stage-width:${stageWidth}px; --stage-height:${stageHeight}px;"
    >
      <div class="viewport-frame">
        <div class="viewport-canvas">
          ${inner}
        </div>
        ${overlayMarkup}
        ${hotspotMarkup}
        ${tweakMarkup}
      </div>
    </div>
  `;
}

function buildPrototypeHotspotsForFrame(frame) {
  const liveExport = currentLiveExport();
  return buildPrototypeHotspots({
    frame,
    frames: liveExport?.frames || [],
    connections: liveExport?.connections || [],
  });
}

function buildPrototypeHotspots({ frame, frames, connections }) {
  if (!frame) {
    return [];
  }

  const explicitHotspots = buildElementPrototypeHotspots(frame, frames);
  const explicitTargetIds = new Set(
    explicitHotspots.map((hotspot) => hotspot.targetFrameId).filter(Boolean),
  );
  const outgoing = Array.isArray(connections)
    ? connections.filter(
        (connection) => connection.fromFrameId === frame.id,
      )
    : [];
  if (!outgoing.length) {
    return explicitHotspots;
  }

  const generatedHotspots = outgoing
    .filter((connection) => !explicitTargetIds.has(connection.toFrameId))
    .map((connection, index) => {
      const target = Array.isArray(frames)
        ? frames.find((candidate) => candidate.id === connection.toFrameId)
        : null;
      const column = index % 2;
      const row = Math.floor(index / 2);
      const width = 0.25;
      const height = 0.1;
      const x = Math.min(0.72, 0.42 + column * 0.28);
      const y = Math.min(0.86, 0.58 + row * 0.13);

      return {
        id: connection.id || `${frame.id}-${connection.toFrameId}-${index}`,
        targetFrameId: connection.toFrameId,
        label: connection.label || "Continue",
        targetTitle:
          target?.title || connection.toTitle || connection.toFrameId,
        x,
        y,
        width,
        height,
      };
    });
  return [...explicitHotspots, ...generatedHotspots];
}

function buildElementPrototypeHotspots(frame, frames = []) {
  const elements = Array.isArray(frame?.composition?.elements)
    ? frame.composition.elements
    : [];
  return elements
    .map((element, index) => {
      const prototype = normalizeElementPrototype(element.prototype);
      const bounds = element.bounds || {};
      if (!prototype?.toFrameId || !Number.isFinite(Number(bounds.w))) {
        return null;
      }
      const target = Array.isArray(frames)
        ? frames.find((candidate) => candidate.id === prototype.toFrameId)
        : null;
      return {
        id: `element-hotspot-${element.id || index}`,
        targetFrameId: prototype.toFrameId,
        label: prototype.label || "Continue",
        targetTitle: target?.title || prototype.toFrameId,
        x: clampNumber(bounds.x, 0, 0.96),
        y: clampNumber(bounds.y, 0, 0.96),
        width: clampNumber(bounds.w, 0.06, 0.5),
        height: clampNumber(bounds.h, 0.05, 0.32),
        sourceElementId: element.id || "",
      };
    })
    .filter(Boolean);
}

function normalizeElementPrototype(prototype) {
  if (
    !prototype ||
    typeof prototype !== "object" ||
    Array.isArray(prototype)
  ) {
    return null;
  }
  const toFrameId =
    typeof prototype.toFrameId === "string" ? prototype.toFrameId.trim() : "";
  if (!toFrameId) {
    return null;
  }
  return {
    toFrameId,
    label:
      typeof prototype.label === "string" && prototype.label.trim()
        ? prototype.label.trim()
        : "continue",
  };
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return min;
  }
  return Math.max(min, Math.min(max, number));
}

function buildPrototypeHotspotMarkup(hotspots, viewport, scale) {
  if (!Array.isArray(hotspots) || !hotspots.length) {
    return "";
  }

  return `
    <div class="prototype-hotspot-layer" aria-label="Prototype click targets">
      ${hotspots
        .map((hotspot, index) => {
          const left = Math.max(0, Number(hotspot.x) || 0) * viewport.width;
          const top = Math.max(0, Number(hotspot.y) || 0) * viewport.height;
          const width = Math.max(
            96,
            (Number(hotspot.width) || 0.18) * viewport.width,
          );
          const height = Math.max(
            44,
            (Number(hotspot.height) || 0.08) * viewport.height,
          );
          const clampedWidth = Math.min(width, viewport.width - left);
          const clampedHeight = Math.min(height, viewport.height - top);
          return `
            <button
              class="prototype-hotspot"
              type="button"
              style="left:${Math.round(left * scale)}px; top:${Math.round(top * scale)}px; width:${Math.round(Math.max(44, clampedWidth * scale))}px; height:${Math.round(Math.max(36, clampedHeight * scale))}px;"
              data-prototype-hotspot-frame="${escapeHtml(hotspot.targetFrameId)}"
              aria-label="${escapeHtml(`Go to ${hotspot.targetTitle || `Frame ${index + 1}`}`)}"
              title="${escapeHtml(hotspot.label || "Continue")}"
            >
              <span>${index + 1}</span>
              <strong>${escapeHtml(hotspot.label || "Continue")}</strong>
              <small>${escapeHtml(hotspot.targetTitle || hotspot.targetFrameId)}</small>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function buildChangeOverlayMarkup(changeRegions, scale) {
  if (!Array.isArray(changeRegions) || !changeRegions.length) {
    return "";
  }
  return `
    <div class="change-overlay-layer" aria-hidden="true">
      ${changeRegions
        .map((region, index) => {
          const left = Math.max(0, Number(region.left) || 0) * scale;
          const top = Math.max(0, Number(region.top) || 0) * scale;
          const width = Math.max(12, Number(region.width) || 0) * scale;
          const height = Math.max(12, Number(region.height) || 0) * scale;
          return `
            <div
              class="change-overlay-box"
              style="left:${left}px; top:${top}px; width:${width}px; height:${height}px;"
            >
              <span class="change-overlay-label">${escapeHtml(
                region.label || `Change ${index + 1}`,
              )}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function computeViewportScale(viewport, capacity = null) {
  const availableWidth = Math.max(
    240,
    Math.min(MAX_STAGE_WIDTH, Number(capacity?.width) || MAX_STAGE_WIDTH),
  );
  const availableHeight = Math.max(
    220,
    Math.min(MAX_STAGE_HEIGHT, Number(capacity?.height) || MAX_STAGE_HEIGHT),
  );
  return Math.min(
    1,
    availableWidth / viewport.width,
    availableHeight / viewport.height,
  );
}

function measureViewerCapacity(element) {
  if (!element) {
    return {
      width: MAX_STAGE_WIDTH,
      height: MAX_STAGE_HEIGHT,
    };
  }

  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  const horizontalPadding =
    (Number.parseFloat(styles.paddingLeft) || 0) +
    (Number.parseFloat(styles.paddingRight) || 0);
  const verticalPadding =
    (Number.parseFloat(styles.paddingTop) || 0) +
    (Number.parseFloat(styles.paddingBottom) || 0);

  return {
    width: Math.max(240, rect.width - horizontalPadding - 8),
    height: Math.max(220, rect.height - verticalPadding - 8),
  };
}

function resolveCurrentRefinement(target, artifacts, frameId) {
  if (target?.refinement?.summary) {
    return target.refinement;
  }
  const artifact = (artifacts || []).find(
    (item) =>
      itemMatchesFrame(item, frameId) &&
      item.refinement &&
      describeRefinementSummary(item.refinement),
  );
  return artifact?.refinement || null;
}

function describeRefinementSummary(refinement) {
  return refinement?.summary || "";
}

function renderPrompt() {
  const payload = currentPayload();
  const prompt =
    payload?.liveMarkdown ||
    payload?.liveExport?.prompt ||
    "Waiting for the live Canvax export...";
  dom.promptPreview.textContent = prompt;
}

function maybeRunPreviewSelfTest() {
  if (!wantsSelfTest || previewSelfTestStarted || !currentPayload()) {
    return;
  }
  previewSelfTestStarted = true;
  void runPreviewSelfTest();
}

async function runPreviewSelfTest() {
  const results = [];

  try {
    await waitForPreviewSelfTestReady();

    const payload = currentPayload();
    const liveExport = currentLiveExport();
    const frameCount = Array.isArray(liveExport?.frames)
      ? liveExport.frames.length
      : 0;
    const frame = currentFrame();
    const manifest = payload?.previewManifest || null;
    const target = resolvePreviewTargetEntry(
      manifest,
      state.manualPreviewUrl,
      state.selectedFrameId,
    );
    const artifacts = collectManifestArtifacts(manifest);
    const changes = collectManifestChanges(manifest);
    const syntheticDigest = {
      digest: "preview-selftest-output",
      summary: "Preview self-test output context",
      targetLabel: "Self-test target",
      artifactCount: 1,
      changeCount: 2,
      refinementSummary: "Updated 2 regions",
      frameTitle: frame?.title || "Current frame",
    };
    const initialActivity = updateOutputActivityHistory(
      [],
      null,
      syntheticDigest,
      "2026-03-14T00:00:00.000Z",
    );
    const rebuiltActivity = buildOutputActivityFromSessionEvents([
      {
        id: "preview-selftest-checkpoint",
        at: "2026-03-14T00:00:01.000Z",
        reason: "output-update",
        label: "Output update",
        note: "Preview self-test output context",
        summary: {
          changeCount: 2,
          artifactCount: 1,
        },
        outputDigest: syntheticDigest,
      },
    ]);

    results.push(
      assert(
        dom.compareModeButtons.querySelectorAll("[data-compare-mode]")
          .length === 3,
        "preview compare mode toggles render",
      ),
    );
    results.push(
      assert(
        typeof payload?.updatedAt === "string" && payload.updatedAt.length > 0,
        "preview payload loads from Canvax",
      ),
    );
    results.push(
      assert(
        resolveTransportDescriptor(payload).mode === "local-companion" &&
          dom.transportStatus.textContent.includes("Future path"),
        "preview transport summary renders",
      ),
    );
    results.push(
      assert(Array.isArray(liveExport?.frames), "preview resolves live export"),
    );
    results.push(
      assert(
        dom.frameRail.querySelectorAll(".frame-card").length === frameCount,
        "preview frame rail mirrors current frames",
      ),
    );
    results.push(
      assert(
        frameCount === 0 || Boolean(frame?.id),
        "preview selects a frame when frames exist",
      ),
    );
    results.push(
      assert(
        dom.promptPreview.textContent.trim().length > 32,
        "preview prompt pane renders handoff text",
      ),
    );
    results.push(
      assert(
        dom.targetSummary.textContent.trim().length > 0,
        "preview target summary renders",
      ),
    );
    results.push(
      assert(
        !target ||
          Boolean(
            buildImplementationTargetUrl(
              target,
              artifacts,
              changes,
              frame?.id || state.selectedFrameId,
              payload?.outputDigest || null,
            ),
          ),
        "preview target URL resolves when a target exists",
      ),
    );
    results.push(
      assert(
        describeWorkspaceFollow(payload?.workspaceFollow || null) ===
          dom.workspaceFollowNote.textContent,
        "preview workspace follow note stays in sync",
      ),
    );
    results.push(
      assert(
        initialActivity.length === 1 &&
          rebuiltActivity.length === 1 &&
          mergeOutputActivityEntries(initialActivity, rebuiltActivity)
            .length === 1,
        "preview output activity dedupes by digest",
      ),
    );
    const rewriteQueueItems = buildRewriteQueue(
      [
        {
          id: "frame-preview-selftest",
          title: "Preview rewrite frame",
          viewport: "desktop",
          viewportWidth: 1440,
          viewportHeight: 1024,
          objective: "Needs output refresh",
          layout: "",
          motion: "",
          assets: "",
          mobile: "",
          captureCount: 1,
          updatedAt: "2026-03-14T00:00:02.000Z",
          snapshotUrl: "/workspace/exports/assets/frame-preview-selftest.jpg",
        },
      ],
      {
        targets: [
          {
            id: "materialize-target-frame-preview-selftest",
            label: "Preview rewrite materialized",
            source: "canvax-materialize",
            type: "materialized-preview",
            previewPath:
              "artifacts/preview/materialized/frame-preview-selftest/index.html",
            frameIds: ["frame-preview-selftest"],
            sourceFrameId: "frame-preview-selftest",
            sourceFrameUpdatedAt: "2026-03-14T00:00:01.000Z",
          },
        ],
      },
      "frame-preview-selftest",
    );
    results.push(
      assert(
        rewriteQueueItems.length === 1 &&
          rewriteQueueItems[0]?.label === "Needs refresh",
        "preview rewrite queue flags stale frame output",
      ),
    );
    results.push(
      assert(
        dom.rewriteHandoff.textContent.trim().length > 0 &&
          dom.rewriteHandoffState.textContent.trim().length > 0,
        "preview rewrite handoff lane renders",
      ),
    );
    results.push(
      assert(
        dom.playFlow.textContent.trim().length > 0 &&
          dom.prototypePlayPanel.textContent.trim().length > 0,
        "preview prototype play controls render",
      ),
    );
    const syntheticHotspots = buildPrototypeHotspots({
      frame: { id: "frame-preview-selftest" },
      frames: [{ id: "frame-next", title: "Next frame" }],
      connections: [
        {
          id: "link-preview-selftest",
          fromFrameId: "frame-preview-selftest",
          toFrameId: "frame-next",
          label: "Continue",
        },
      ],
    });
    results.push(
      assert(
        syntheticHotspots.length === 1 &&
          syntheticHotspots[0]?.targetFrameId === "frame-next" &&
          syntheticHotspots[0]?.label === "Continue",
        "preview prototype hotspots derive from flow links",
      ),
    );
    const elementHotspots = buildPrototypeHotspots({
      frame: {
        id: "frame-preview-selftest",
        composition: {
          elements: [
            {
              id: "cta-selftest",
              bounds: { x: 0.12, y: 0.72, w: 0.18, h: 0.08 },
              prototype: { toFrameId: "frame-next", label: "Tap CTA" },
            },
          ],
        },
      },
      frames: [{ id: "frame-next", title: "Next frame" }],
      connections: [],
    });
    results.push(
      assert(
        elementHotspots.length === 1 &&
          elementHotspots[0]?.sourceElementId === "cta-selftest" &&
          elementHotspots[0]?.label === "Tap CTA",
        "preview prototype hotspots use selected element regions",
      ),
    );
    results.push(
      assert(
        Boolean(dom.markTweak) &&
          typeof buildTweakRegion({
            start: { x: 0.1, y: 0.2, pixelX: 10, pixelY: 20 },
            current: { x: 0.4, y: 0.45, pixelX: 40, pixelY: 45 },
          })?.normalized?.width === "number",
        "preview tweak region targeting is available",
      ),
    );
  } catch (error) {
    results.push({
      name: "preview self-test runtime",
      passed: false,
      detail:
        error instanceof Error
          ? error.message
          : "Unknown preview self-test error",
    });
  }

  renderPreviewSelfTestResults(results);
}

async function waitForPreviewSelfTestReady(timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (currentPayload()) {
      await delay(60);
      return;
    }
    await delay(80);
  }
  throw new Error("Preview payload did not load in time.");
}

function renderPreviewSelfTestResults(results) {
  window.clearTimeout(state.pollingTimer);
  const existing = document.querySelector("#preview-selftest-results");
  existing?.remove();
  const pre = document.createElement("pre");
  pre.id = "preview-selftest-results";
  pre.textContent = JSON.stringify(results, null, 2);
  document.body.appendChild(pre);
  document.body.dataset.selftestPassed = String(
    results.every((result) => result.passed),
  );
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
    liveExport: {
      ...baseExport,
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
        frameIds: [],
        versionTag: "",
        generatedAt: "",
        sourceFrameId: "",
        sourceFrameTitle: "",
        sourceFrameUpdatedAt: "",
        changeSummary: "",
        refinement: normalizeRefinementData(null),
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
    changeSummary: artifact.changeSummary || "",
    refinement: normalizeRefinementData(artifact.refinement),
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
          changeSummary: "",
          refinement: normalizeRefinementData(null),
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
    changeSummary:
      typeof value.changeSummary === "string" ? value.changeSummary.trim() : "",
    refinement: normalizeRefinementData(value.refinement),
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
          changeSummary: "",
          refinement: normalizeRefinementData(null),
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
    changeSummary:
      typeof value.changeSummary === "string" ? value.changeSummary.trim() : "",
    refinement: normalizeRefinementData(value.refinement),
  };
}

function normalizeRefinementData(value) {
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
    changed: typeof source.changed === "boolean" ? source.changed : false,
    comparedAgainst:
      typeof source.comparedAgainst === "string"
        ? source.comparedAgainst.trim()
        : "",
    summary: typeof source.summary === "string" ? source.summary.trim() : "",
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
  return {
    left: Math.max(0, Number(value.left) || 0),
    top: Math.max(0, Number(value.top) || 0),
    width: Math.max(0, Number(value.width) || 0),
    height: Math.max(0, Number(value.height) || 0),
    kind: typeof value.kind === "string" ? value.kind.trim() : "",
    label: typeof value.label === "string" ? value.label.trim() : "",
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

function findFrameSpecificTarget(manifest, frameId) {
  if (!frameId) {
    return null;
  }
  const explicitTarget = collectManifestTargets(manifest).find((target) => {
    const frameIds = Array.isArray(target.frameIds) ? target.frameIds : [];
    return (
      frameIds.includes(frameId) ||
      cleanString(target.sourceFrameId) === cleanString(frameId)
    );
  });
  if (explicitTarget) {
    return explicitTarget;
  }
  const artifactTarget = derivePreviewTargetFromArtifacts(manifest, frameId);
  if (!artifactTarget) {
    return null;
  }
  const frameIds = Array.isArray(artifactTarget.frameIds)
    ? artifactTarget.frameIds
    : [];
  return frameIds.includes(frameId) ||
    cleanString(artifactTarget.sourceFrameId) === cleanString(frameId)
    ? artifactTarget
    : null;
}

function describeFrameOutputStatus(
  frame,
  manifest,
  { includeGlobal = false } = {},
) {
  if (!frame) {
    return null;
  }

  const specificTarget = findFrameSpecificTarget(manifest, frame.id);
  const target =
    specificTarget ||
    (includeGlobal
      ? resolvePreviewTargetEntry(manifest, state.manualPreviewUrl, frame.id)
      : null);
  if (!target) {
    return null;
  }

  const freshness = describeManifestFreshness(target, frame);
  const detail =
    freshness?.message ||
    describeRefinementSummary(target.refinement) ||
    target.changeSummary ||
    target.label ||
    "";
  const stale = Boolean(freshness?.stale);
  const bound = Boolean(specificTarget);
  const generatedScreen = target.type === "generated-screen-preview";
  const materialized =
    target.type === "materialized-preview" ||
    generatedScreen ||
    target.source === "canvax-materialize";

  if (stale) {
    return {
      label: "Output stale",
      tone: "warning",
      detail,
    };
  }

  if (!bound) {
    return {
      label: "Global target",
      tone: "subtle",
      detail:
        detail ||
        "A connected output target exists, but it is not scoped to this frame.",
    };
  }

  return {
    label: generatedScreen
      ? "Generated screen"
      : materialized
        ? "Materialized"
        : "Output synced",
    tone: materialized ? "active" : "synced",
    detail,
  };
}

function renderFrameOutputBadge(status) {
  if (!status?.label) {
    return "";
  }
  const title = status.detail || status.label;
  return `<span class="target-badge ${escapeHtml(status.tone || "subtle")}" title="${escapeHtml(title)}">${escapeHtml(status.label)}</span>`;
}

function frameHasMeaningfulHandoff(frame) {
  if (!frame) {
    return false;
  }
  return Boolean(
    Number(frame.captureCount) > 0 ||
    cleanString(frame.objective) ||
    cleanString(frame.layout) ||
    cleanString(frame.motion) ||
    cleanString(frame.assets) ||
    cleanString(frame.mobile) ||
    cleanString(frame.snapshotUrl) ||
    cleanString(frame.liveSnapshotDataUrl) ||
    cleanString(frame.thumbnailUrl) ||
    cleanString(frame.liveThumbnailDataUrl),
  );
}

function itemHasFrameBinding(item, frameId) {
  if (!item || !frameId) {
    return false;
  }
  const frameIds = Array.isArray(item.frameIds) ? item.frameIds : [];
  return (
    frameIds.includes(frameId) ||
    cleanString(item.sourceFrameId) === cleanString(frameId)
  );
}

function buildRewriteQueue(frames, manifest, activeFrameId = "") {
  const normalizedFrames = Array.isArray(frames) ? frames : [];
  const targets = collectManifestTargets(manifest);
  const artifacts = collectManifestArtifacts(manifest);
  const changes = collectManifestChanges(manifest);
  const hasAnyTargets = targets.length > 0;

  return normalizedFrames
    .map((frame, index) => {
      if (!frameHasMeaningfulHandoff(frame)) {
        return null;
      }

      const specificTarget = findFrameSpecificTarget(manifest, frame.id);
      const relatedArtifacts = artifacts.filter((item) =>
        itemHasFrameBinding(item, frame.id),
      );
      const relatedChanges = changes.filter((item) =>
        itemHasFrameBinding(item, frame.id),
      );
      const freshness = specificTarget
        ? describeManifestFreshness(specificTarget, frame)
        : null;

      if (specificTarget && freshness?.stale) {
        return {
          id: `${frame.id}-stale`,
          index: index + 1,
          frameId: frame.id,
          title: frame.title,
          label: "Needs refresh",
          tone: "warning",
          priority: 0,
          updatedAt: frame.updatedAt,
          detail: freshness.message,
        };
      }

      if (
        !specificTarget &&
        (relatedArtifacts.length || relatedChanges.length)
      ) {
        return {
          id: `${frame.id}-target`,
          index: index + 1,
          frameId: frame.id,
          title: frame.title,
          label: "Needs target",
          tone: "subtle",
          priority: 1,
          updatedAt: frame.updatedAt,
          detail: `This frame already has ${relatedArtifacts.length} artifact${relatedArtifacts.length === 1 ? "" : "s"} and ${relatedChanges.length} changed file${relatedChanges.length === 1 ? "" : "s"} bound to it, but no connected preview target yet.`,
        };
      }

      if (!specificTarget && frame.id === activeFrameId && hasAnyTargets) {
        return {
          id: `${frame.id}-binding`,
          index: index + 1,
          frameId: frame.id,
          title: frame.title,
          label: "Needs frame binding",
          tone: "subtle",
          priority: 2,
          updatedAt: frame.updatedAt,
          detail:
            "Only a global target is attached right now. Bind a frame-specific target or rerun generation for this frame to tighten the live rewrite loop.",
        };
      }

      if (!specificTarget && (!hasAnyTargets || frame.id === activeFrameId)) {
        return {
          id: `${frame.id}-first`,
          index: index + 1,
          frameId: frame.id,
          title: frame.title,
          label: "Needs first output",
          tone: "subtle",
          priority: hasAnyTargets ? 3 : 2,
          updatedAt: frame.updatedAt,
          detail:
            "This frame has sketch or note content but no connected output yet. Generate it, materialize it, or bind a generated target when Codex implements it.",
        };
      }

      return null;
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }
      return String(right.updatedAt || "").localeCompare(
        String(left.updatedAt || ""),
      );
    });
}

function describeWorkspaceFollow(workspaceFollow) {
  if (!workspaceFollow || typeof workspaceFollow !== "object") {
    return "";
  }

  if (workspaceFollow.enabled === false) {
    return workspaceFollow.error
      ? `Live workspace follow is unavailable: ${workspaceFollow.error}`
      : "Live workspace follow is unavailable right now.";
  }

  if (workspaceFollow.source !== "git-status-live") {
    return "";
  }

  const count = Number.isInteger(workspaceFollow.changeCount)
    ? workspaceFollow.changeCount
    : 0;
  const frameTitle =
    typeof workspaceFollow.frameTitle === "string" &&
    workspaceFollow.frameTitle.trim()
      ? workspaceFollow.frameTitle.trim()
      : "the current board";

  if (count > 0) {
    return `Live workspace follow is mirroring ${count} current git change${count === 1 ? "" : "s"} for ${frameTitle}.`;
  }

  return `Live workspace follow is on. The workspace is currently clean for ${frameTitle}.`;
}

function buildOutputActivityDetail(outputDigest) {
  if (!outputDigest || typeof outputDigest !== "object") {
    return "";
  }

  const parts = [];
  if (outputDigest.targetLabel) {
    parts.push(outputDigest.targetLabel);
  }
  if (Number.isInteger(outputDigest.changeCount)) {
    parts.push(
      `${outputDigest.changeCount} changed file${outputDigest.changeCount === 1 ? "" : "s"}`,
    );
  }
  if (Number.isInteger(outputDigest.artifactCount)) {
    parts.push(
      `${outputDigest.artifactCount} artifact${outputDigest.artifactCount === 1 ? "" : "s"}`,
    );
  }
  if (outputDigest.refinementSummary) {
    parts.push(outputDigest.refinementSummary);
  }
  if (!parts.length && outputDigest.frameTitle) {
    parts.push(outputDigest.frameTitle);
  }
  return parts.join(" • ");
}

function updateOutputActivityHistory(
  currentItems,
  previousDigest,
  nextDigest,
  at = new Date().toISOString(),
) {
  const items = Array.isArray(currentItems) ? [...currentItems] : [];
  const previousKey = previousDigest?.digest || "";
  const nextKey = nextDigest?.digest || "";

  if (!nextKey) {
    return items;
  }

  if (items.length && items[0]?.digest === nextKey) {
    return items;
  }

  if (!previousKey && !items.length) {
    return [
      {
        id: `${nextKey}-${at}`,
        digest: nextKey,
        at,
        summary: nextDigest.summary || "Current output context attached",
        detail: buildOutputActivityDetail(nextDigest),
      },
    ];
  }

  if (previousKey === nextKey) {
    return items;
  }

  return [
    {
      id: `${nextKey}-${at}`,
      digest: nextKey,
      at,
      summary: nextDigest.summary || "Output context changed",
      detail: buildOutputActivityDetail(nextDigest),
    },
    ...items,
  ].slice(0, MAX_OUTPUT_ACTIVITY_ITEMS);
}

function buildOutputActivityFromSessionEvents(sessionEvents) {
  if (!Array.isArray(sessionEvents)) {
    return [];
  }

  return sessionEvents
    .filter((event) => {
      if (!event || typeof event !== "object") {
        return false;
      }
      const reason = typeof event.reason === "string" ? event.reason : "";
      return (
        reason === "output-update" ||
        reason === "publish-output" ||
        reason === "materialize" ||
        reason === "generate-screen"
      );
    })
    .map((event) => {
      const digest =
        typeof event.outputDigest?.digest === "string"
          ? event.outputDigest.digest
          : "";
      const detail = [
        typeof event.outputDigest?.targetLabel === "string"
          ? event.outputDigest.targetLabel
          : "",
        Number.isInteger(event.summary?.changeCount)
          ? `${event.summary.changeCount} changed file${event.summary.changeCount === 1 ? "" : "s"}`
          : "",
        Number.isInteger(event.summary?.artifactCount)
          ? `${event.summary.artifactCount} artifact${event.summary.artifactCount === 1 ? "" : "s"}`
          : "",
        typeof event.outputDigest?.refinementSummary === "string"
          ? event.outputDigest.refinementSummary
          : "",
      ]
        .filter(Boolean)
        .join(" • ");

      return {
        id:
          typeof event.id === "string" && event.id.trim()
            ? event.id.trim()
            : `${digest || event.reason || "event"}-${event.at || ""}`,
        digest,
        at:
          typeof event.at === "string" && event.at.trim()
            ? event.at.trim()
            : new Date().toISOString(),
        summary:
          typeof event.note === "string" && event.note.trim()
            ? event.note.trim()
            : typeof event.label === "string" && event.label.trim()
              ? event.label.trim()
              : "Output update",
        detail,
      };
    });
}

function mergeOutputActivityEntries(...groups) {
  const merged = [];
  const seen = new Set();
  groups.flat().forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }
    const key =
      (typeof item.digest === "string" && item.digest.trim()) ||
      (typeof item.id === "string" && item.id.trim());
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    merged.push(item);
  });
  return merged.slice(0, MAX_OUTPUT_ACTIVITY_ITEMS);
}

function isImplementationChangeCandidate(path) {
  const value = typeof path === "string" ? path.trim().toLowerCase() : "";
  if (!value || value.startsWith("docs/") || value === "readme.md") {
    return false;
  }
  return /\.(astro|cjs|css|go|graphql|gql|html|java|js|json|jsx|kt|less|php|py|qml|rb|rs|sass|scss|svelte|swift|ts|tsx|ui|vue|xml|yaml|yml)$/i.test(
    value,
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

function assert(passed, name, detail = "") {
  return {
    name,
    passed: Boolean(passed),
    detail: passed ? detail : detail || "",
  };
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
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

function resolveTransportDescriptor(payload = currentPayload()) {
  const candidate =
    payload?.transport &&
    typeof payload.transport === "object" &&
    !Array.isArray(payload.transport)
      ? payload.transport
      : payload?.liveExport?.transport &&
          typeof payload.liveExport.transport === "object" &&
          !Array.isArray(payload.liveExport.transport)
        ? payload.liveExport.transport
        : null;

  return {
    label:
      cleanString(candidate?.label) ||
      cleanString(candidate?.mode) ||
      "Local companion",
    mode: cleanString(candidate?.mode) || "local-companion",
    future: {
      label: cleanString(candidate?.future?.label) || "App Server client",
      mode: cleanString(candidate?.future?.mode) || "app-server",
    },
  };
}

function describeTransportSummary(transport = resolveTransportDescriptor()) {
  const currentLabel = cleanString(transport?.label) || "Local companion";
  const futureLabel =
    cleanString(transport?.future?.label) || "App Server client";
  return `${currentLabel} now. Future path: ${futureLabel}.`;
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

function workspaceHrefForPath(value) {
  const text = String(value || "").trim().replaceAll("\\", "/");
  if (!text) {
    return "";
  }
  if (/^https?:\/\//i.test(text) || text.startsWith("/workspace/")) {
    return text;
  }
  const projectMarker = "/Canvax/";
  const projectIndex = text.indexOf(projectMarker);
  const relative =
    projectIndex >= 0 ? text.slice(projectIndex + projectMarker.length) : text;
  if (
    relative.startsWith("exports/") ||
    relative.startsWith("artifacts/") ||
    relative.startsWith("docs/")
  ) {
    return `/workspace/${relative}`;
  }
  return "";
}

function compactPath(value) {
  const text = String(value || "").trim().replaceAll("\\", "/");
  if (!text) {
    return "";
  }
  const projectMarker = "/Canvax/";
  const projectIndex = text.indexOf(projectMarker);
  if (projectIndex >= 0) {
    return text.slice(projectIndex + projectMarker.length);
  }
  if (text.length <= 80) {
    return text;
  }
  const parts = text.split("/").filter(Boolean);
  return parts.length > 3
    ? `.../${parts.slice(-3).join("/")}`
    : `${text.slice(0, 77)}...`;
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

function timeLabel(value) {
  return formatDateTime(value);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function roundMetric(value) {
  return Math.round((Number(value) || 0) * 10000) / 10000;
}

function compactDisplayText(value, maxLength = 360) {
  const text = cleanString(value).replace(/\s+/g, " ");
  if (!text) {
    return "";
  }

  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const uniqueSentences = [];
  const seen = new Set();
  sentences.forEach((sentence) => {
    const normalized = sentence.trim();
    if (!normalized) {
      return;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    uniqueSentences.push(normalized);
  });

  const compact = uniqueSentences.join(" ");
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}
