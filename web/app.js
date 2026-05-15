const STORAGE_KEY = "canvax-studio-v1";
const STORAGE_VERSION = 3;
const HANDOFF_SCHEMA_VERSION = 1;
const FRAME_RENDERER_VERSION = 4;
const LIVE_PREVIEW_STORAGE_KEY = "canvax-preview-live-v1";
const LIVE_PREVIEW_CHANNEL_NAME = "canvax-preview-live-v1";
const TRANSPORT_MODE = "local-companion";
const FUTURE_TRANSPORT_MODE = "app-server";
const MAX_CAPTURES = 6;
const AUTO_CAPTURE_DELAY = 2000;
const LIVE_PREVIEW_DEBOUNCE = 160;
const MANIFEST_POLL_INTERVAL = 2500;
const MAX_OUTPUT_ACTIVITY_ITEMS = 8;
const ERASER_COLOR = "rgba(0, 0, 0, 0)";
// Canvas destination-out uses the source alpha to subtract from existing ink.
// Keep saved eraser elements transparent, but render them with opaque source ink.
const ERASER_RENDER_COLOR = "#000000";
const FLOW_CARD_WIDTH = 256;
const FLOW_CARD_HEIGHT = 180;
const FLOW_SURFACE_PADDING = 120;
const SELECTION_HANDLE_SIZE = 14;
const PREVIEW_WINDOW_NAME = "canvax-preview-window";
const shouldRunSelfTest =
  new URLSearchParams(window.location.search).get("selftest") === "1";
const viewModes = [
  { id: "frame", label: "Frame view" },
  { id: "flow", label: "Flow view" },
];

const workspaceModes = [
  {
    id: "simple",
    label: "Workbench",
    description: "Simple sketch + voice + generated output mode",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Full frames, flow, manifests, and diagnostics",
  },
];

const actionModes = [
  {
    id: "build-ui",
    label: "Build UI",
    description: "Turn the current sketch into real UI or app-screen work.",
  },
  {
    id: "refine-ui",
    label: "Refine UI",
    description: "Use sketch-over-output marks and notes to revise existing UI.",
  },
  {
    id: "write-spec",
    label: "Write spec",
    description: "Convert the sketch, voice, and flow into an implementation spec.",
  },
  {
    id: "image-prompt",
    label: "Image prompt",
    description: "Create a no-API prompt pack with coordinates and style intent.",
  },
  {
    id: "variations",
    label: "Variations",
    description: "Request alternate visual directions from the same sketch.",
  },
];

const viewportPresets = {
  desktop: { label: "Desktop", width: 1440, height: 1024, columns: 12 },
  laptop: { label: "Laptop", width: 1366, height: 900, columns: 12 },
  tablet: { label: "Tablet", width: 834, height: 1194, columns: 8 },
  mobile: { label: "Mobile", width: 430, height: 932, columns: 4 },
  square: { label: "Square", width: 1024, height: 1024, columns: 6 },
  poster: { label: "Poster", width: 900, height: 1400, columns: 6 },
  free: { label: "Free canvas", width: 2400, height: 1600, columns: 16 },
};

const generationDirections = [
  { id: "product", label: "Product UI" },
  { id: "editorial", label: "Editorial" },
  { id: "cinematic", label: "Cinematic" },
  { id: "dashboard", label: "Dashboard" },
  { id: "playful", label: "Playful" },
];

const generationStyles = [
  { id: "rapid", label: "Rapid" },
  { id: "studio", label: "Studio" },
  { id: "showcase", label: "Showcase" },
];

const generationFocuses = [
  { id: "balanced", label: "Balanced" },
  { id: "conversion", label: "Conversion" },
  { id: "storytelling", label: "Storytelling" },
  { id: "utility", label: "Utility" },
];

const toolDefinitions = [
  { id: "select", label: "Select" },
  { id: "pen", label: "Pen" },
  { id: "marker", label: "Marker" },
  { id: "line", label: "Line" },
  { id: "rect", label: "Rect" },
  { id: "ellipse", label: "Oval" },
  { id: "arrow", label: "Arrow" },
  { id: "label", label: "Label" },
  { id: "erase", label: "Erase" },
];

const toolMeta = {
  select:
    "Select, move, resize, or delete existing elements. Shift-click builds a multi-selection for grouping.",
  pen: "Freehand line for precise sketch strokes.",
  marker: "Soft translucent sketch stroke for rough blocking.",
  line: "Straight segment for dividers, guides, and edges.",
  rect: "Rectangle or box for cards, frames, and blocks.",
  ellipse: "Oval or circle for avatars, chips, and round callouts.",
  arrow: "Directional arrow for flows, gestures, and emphasis.",
  label:
    "Click to type on the canvas. Clicking over a shape pins the label to that element.",
  erase: "Erase parts of freehand sketches with the current brush size.",
};

const palette = [
  "#ff5d3a",
  "#0c8d7b",
  "#1c1a1a",
  "#2364aa",
  "#b246a8",
  "#f0a202",
  "#ffffff",
];

const dom = {
  boardProject: document.querySelector("#board-project"),
  boardGoal: document.querySelector("#board-goal"),
  boardAudience: document.querySelector("#board-audience"),
  boardMood: document.querySelector("#board-mood"),
  workspaceModeButtons: document.querySelector("#workspace-mode-buttons"),
  workspaceModeLabel: document.querySelector("#workspace-mode-label"),
  workbenchTrayToggle: document.querySelector("#workbench-tray-toggle"),
  workbenchRail: document.querySelector("#workbench-rail"),
  focusPad: document.querySelector("#focus-pad"),
  focusViewportSelect: document.querySelector("#focus-viewport-select"),
  focusActionModeSelect: document.querySelector("#focus-action-mode-select"),
  focusFrameChip: document.querySelector("#focus-frame-chip"),
  focusSurfaceChip: document.querySelector("#focus-surface-chip"),
  focusActionChip: document.querySelector("#focus-action-chip"),
  focusHostChip: document.querySelector("#focus-host-chip"),
  focusDesignChip: document.querySelector("#focus-design-chip"),
  focusToolButtons: document.querySelector("#focus-tool-buttons"),
  focusAddFrame: document.querySelector("#focus-add-frame"),
  focusAddSection: document.querySelector("#focus-add-section"),
  focusFreeCanvas: document.querySelector("#focus-free-canvas"),
  focusUndo: document.querySelector("#focus-undo"),
  focusRedo: document.querySelector("#focus-redo"),
  focusGenerate: document.querySelector("#focus-generate"),
  focusImagePack: document.querySelector("#focus-image-pack"),
  focusVoiceToggle: document.querySelector("#focus-voice-toggle"),
  focusApply: document.querySelector("#focus-apply"),
  focusPreview: document.querySelector("#focus-preview"),
  focusStatus: document.querySelector("#focus-status"),
  focusTranscript: document.querySelector("#focus-transcript"),
  focusManualInput: document.querySelector("#focus-manual-input"),
  focusAddManual: document.querySelector("#focus-add-manual"),
  workbenchOutputBadge: document.querySelector("#workbench-output-badge"),
  workbenchOutputSurface: document.querySelector("#workbench-output-surface"),
  workbenchOutputMeta: document.querySelector("#workbench-output-meta"),
  workbenchOpenOutput: document.querySelector("#workbench-open-output"),
  workbenchClearMarks: document.querySelector("#workbench-clear-marks"),
  railSizeValue: document.querySelector("#rail-size-value"),
  frameList: document.querySelector("#frame-list"),
  frameCount: document.querySelector("#frame-count"),
  toolButtons: document.querySelector("#tool-buttons"),
  colorButtons: document.querySelector("#color-buttons"),
  customColorPicker: document.querySelector("#custom-color-picker"),
  colorHex: document.querySelector("#color-hex"),
  viewModeButtons: document.querySelector("#view-mode-buttons"),
  sizeRange: document.querySelector("#size-range"),
  sizePreviewDot: document.querySelector("#size-preview-dot"),
  sizeValue: document.querySelector("#size-value"),
  toolHint: document.querySelector("#tool-hint"),
  gridToggle: document.querySelector("#grid-toggle"),
  autosnapToggle: document.querySelector("#autosnap-toggle"),
  statusPill: document.querySelector("#status-pill"),
  openPreview: document.querySelector("#open-preview"),
  generateScreen: document.querySelector("#generate-screen"),
  materializeFrame: document.querySelector("#materialize-frame"),
  captureButton: document.querySelector("#capture-button"),
  stageTitle: document.querySelector("#stage-title"),
  stageSubtitle: document.querySelector("#stage-subtitle"),
  frameWorkspace: document.querySelector("#frame-workspace"),
  flowWorkspace: document.querySelector("#flow-workspace"),
  deviceShell: document.querySelector("#device-shell"),
  zoomOut: document.querySelector("#zoom-out"),
  zoomIn: document.querySelector("#zoom-in"),
  zoomReset: document.querySelector("#zoom-reset"),
  zoomValue: document.querySelector("#zoom-value"),
  canvas: document.querySelector("#board-canvas"),
  brushPreview: document.querySelector("#brush-preview"),
  brushPreviewText: document.querySelector("#brush-preview-text"),
  labelEditor: document.querySelector("#label-editor"),
  labelEditorInput: document.querySelector("#label-editor-input"),
  flowStatus: document.querySelector("#flow-status"),
  flowShell: document.querySelector("#flow-shell"),
  flowSurface: document.querySelector("#flow-surface"),
  flowSvg: document.querySelector("#flow-svg"),
  flowBoard: document.querySelector("#flow-board"),
  setEntryFrame: document.querySelector("#set-entry-frame"),
  autoLayoutFlow: document.querySelector("#auto-layout-flow"),
  backgroundUpload: document.querySelector("#background-upload"),
  groupSelection: document.querySelector("#group-selection"),
  ungroupSelection: document.querySelector("#ungroup-selection"),
  duplicateSelection: document.querySelector("#duplicate-selection"),
  deleteSelection: document.querySelector("#delete-selection"),
  sendBackward: document.querySelector("#send-backward"),
  bringForward: document.querySelector("#bring-forward"),
  helpButton: document.querySelector("#help-button"),
  undoButton: document.querySelector("#undo-button"),
  redoButton: document.querySelector("#redo-button"),
  clearCanvas: document.querySelector("#clear-canvas"),
  addFrame: document.querySelector("#add-frame"),
  duplicateFrame: document.querySelector("#duplicate-frame"),
  deleteFrame: document.querySelector("#delete-frame"),
  frameTitle: document.querySelector("#frame-title"),
  viewportSelect: document.querySelector("#viewport-select"),
  frameObjective: document.querySelector("#frame-objective"),
  frameLayout: document.querySelector("#frame-layout"),
  frameMotion: document.querySelector("#frame-motion"),
  frameAssets: document.querySelector("#frame-assets"),
  frameMobile: document.querySelector("#frame-mobile"),
  generationDirection: document.querySelector("#generation-direction"),
  generationStyle: document.querySelector("#generation-style"),
  generationFocus: document.querySelector("#generation-focus"),
  generationSummary: document.querySelector("#generation-summary"),
  generateScreenPanel: document.querySelector("#generate-screen-panel"),
  materializeFramePanel: document.querySelector("#materialize-frame-panel"),
  writeDesignContext: document.querySelector("#write-design-context"),
  voiceStatus: document.querySelector("#voice-status"),
  voiceSegmentCount: document.querySelector("#voice-segment-count"),
  voiceScopeButtons: document.querySelector("#voice-scope-buttons"),
  voiceStart: document.querySelector("#voice-start"),
  voiceStop: document.querySelector("#voice-stop"),
  voiceClearScope: document.querySelector("#voice-clear-scope"),
  voiceInterim: document.querySelector("#voice-interim"),
  voiceManualInput: document.querySelector("#voice-manual-input"),
  voiceAddManual: document.querySelector("#voice-add-manual"),
  voiceList: document.querySelector("#voice-list"),
  captureCount: document.querySelector("#capture-count"),
  clearCaptures: document.querySelector("#clear-captures"),
  captureList: document.querySelector("#capture-list"),
  specOutput: document.querySelector("#spec-output"),
  analyzeStatus: document.querySelector("#analysis-status"),
  workspaceFollowStatus: document.querySelector("#workspace-follow-status"),
  transportStatus: document.querySelector("#transport-status"),
  codexPublishOutput: document.querySelector("#codex-publish-output"),
  codexClearOutput: document.querySelector("#codex-clear-output"),
  codexOpenTarget: document.querySelector("#codex-open-target"),
  codexOutputSummary: document.querySelector("#codex-output-summary"),
  artifactInboxCount: document.querySelector("#artifact-inbox-count"),
  artifactInbox: document.querySelector("#artifact-inbox"),
  changedFileCount: document.querySelector("#changed-file-count"),
  changedFileList: document.querySelector("#changed-file-list"),
  outputActivityCount: document.querySelector("#output-activity-count"),
  outputActivityList: document.querySelector("#output-activity-list"),
  rewriteQueueCount: document.querySelector("#rewrite-queue-count"),
  rewriteQueueList: document.querySelector("#rewrite-queue-list"),
  checkpointCount: document.querySelector("#checkpoint-count"),
  checkpointPush: document.querySelector("#checkpoint-push"),
  checkpointList: document.querySelector("#checkpoint-list"),
  saveWorkspace: document.querySelector("#save-workspace"),
  copyPrompt: document.querySelector("#copy-prompt"),
  installSkill: document.querySelector("#install-skill"),
  workspaceStatus: document.querySelector("#workspace-status"),
  flowCount: document.querySelector("#flow-count"),
  connectionSelect: document.querySelector("#connection-select"),
  connectionLabel: document.querySelector("#connection-label"),
  connectionNotes: document.querySelector("#connection-notes"),
  deleteConnection: document.querySelector("#delete-connection"),
  flowList: document.querySelector("#flow-list"),
  helpOverlay: document.querySelector("#help-overlay"),
  helpClose: document.querySelector("#help-close"),
};

const imageCache = new Map();
const frameRenderCache = new Map();
const histories = new Map();
const outputAnnotationHistories = new Map();
const measurementCanvas = document.createElement("canvas");
const measurementContext = measurementCanvas.getContext("2d");
const inkLayerCanvas = document.createElement("canvas");
const livePreviewChannel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel(LIVE_PREVIEW_CHANNEL_NAME)
    : null;
let voiceRecognition = null;
const state = hydrateState();

init();

function init() {
  populateViewportSelect();
  bindEvents();
  bindInteractionFeedback();
  fetchServerStatus();
  refreshPreviewStateFromServer();
  renderAll();
  scheduleLivePreviewSync();
  exposeDebugHelpers();
  if (shouldRunSelfTest) {
    window.setTimeout(() => {
      void runSelfTest();
    }, 150);
  }
}

function bindEvents() {
  dom.boardProject.addEventListener("input", () =>
    updateBoard("project", dom.boardProject.value),
  );
  dom.boardGoal.addEventListener("input", () =>
    updateBoard("goal", dom.boardGoal.value),
  );
  dom.boardAudience.addEventListener("input", () =>
    updateBoard("audience", dom.boardAudience.value),
  );
  dom.boardMood.addEventListener("input", () =>
    updateBoard("designMood", dom.boardMood.value),
  );
  dom.workspaceModeButtons.addEventListener("click", (event) => {
    const button = event.target.closest("[data-workspace-mode]");
    if (!button) {
      return;
    }
    setWorkspaceMode(button.dataset.workspaceMode);
  });
  dom.workbenchTrayToggle.addEventListener("click", toggleWorkbenchTray);
  dom.workbenchRail.addEventListener("click", (event) => {
    const button = event.target.closest("[data-rail-tool], [data-rail-action]");
    if (!button) {
      return;
    }
    if (button.dataset.railTool) {
      setActiveTool(button.dataset.railTool);
      return;
    }
    handleWorkbenchRailAction(button.dataset.railAction);
  });
  dom.focusToolButtons.addEventListener("click", (event) => {
    const button = event.target.closest("[data-focus-tool]");
    if (!button) {
      return;
    }
    setActiveTool(button.dataset.focusTool);
  });
  dom.focusViewportSelect.addEventListener("change", () => {
    updateFrameField("viewport", dom.focusViewportSelect.value, {
      capture: true,
    });
  });
  dom.focusActionModeSelect.addEventListener("change", () => {
    updateActionMode(dom.focusActionModeSelect.value);
  });
  dom.focusAddFrame.addEventListener("click", () =>
    addFrame({
      status: "Workbench frame added",
    }),
  );
  dom.focusAddSection.addEventListener("click", addSectionFrame);
  dom.focusFreeCanvas.addEventListener("click", () => {
    updateFrameField("viewport", "free", { capture: true });
    setZoom(0.5);
  });
  dom.focusUndo.addEventListener("click", undoDesignerAction);
  dom.focusRedo.addEventListener("click", redoDesignerAction);
  dom.focusGenerate.addEventListener("click", () => {
    void generateCurrentScreen();
  });
  dom.focusImagePack.addEventListener("click", () => {
    void saveImagePromptPackForHost();
  });
  dom.focusVoiceToggle.addEventListener("click", () => {
    if (state.voice.status === "listening") {
      stopVoiceDictation();
    } else {
      startVoiceDictation();
    }
  });
  dom.focusApply.addEventListener("click", () => {
    void applyFocusPadToCodex();
  });
  dom.focusPreview.addEventListener("click", openPreviewWindow);
  dom.workbenchClearMarks.addEventListener("click", clearWorkbenchOutputMarks);
  dom.workbenchOutputSurface.addEventListener(
    "pointerdown",
    onWorkbenchOutputPointerDown,
  );
  dom.workbenchOutputSurface.addEventListener(
    "pointermove",
    onWorkbenchOutputPointerMove,
  );
  dom.workbenchOutputSurface.addEventListener(
    "pointerup",
    onWorkbenchOutputPointerUp,
  );
  dom.workbenchOutputSurface.addEventListener(
    "pointerleave",
    onWorkbenchOutputPointerUp,
  );
  dom.workbenchOutputSurface.addEventListener(
    "pointercancel",
    onWorkbenchOutputPointerUp,
  );
  dom.focusManualInput.addEventListener("input", () => {
    state.voice.manualDraft = dom.focusManualInput.value;
    state.focusLastAppliedText = "";
    persistState();
    renderVoicePanel();
  });
  dom.focusManualInput.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      dom.voiceManualInput.value = dom.focusManualInput.value;
      addManualVoiceNote();
    }
  });
  dom.focusAddManual.addEventListener("click", () => {
    dom.voiceManualInput.value = dom.focusManualInput.value;
    addManualVoiceNote();
  });

  dom.addFrame.addEventListener("click", () => addFrame());
  dom.duplicateFrame.addEventListener("click", () => duplicateFrame());
  dom.deleteFrame.addEventListener("click", () => deleteFrame());
  dom.captureButton.addEventListener("click", () => freezeFrame(true));
  dom.copyPrompt.addEventListener("click", copyPrompt);
  dom.saveWorkspace.addEventListener("click", saveExportToWorkspace);
  dom.installSkill.addEventListener("click", installSkill);
  dom.checkpointPush.addEventListener("click", () => {
    void saveCheckpointToWorkspace("manual-push", { silent: false });
  });
  dom.codexPublishOutput.addEventListener("click", () => {
    void publishWorkspaceOutput();
  });
  dom.codexClearOutput.addEventListener("click", () => {
    void clearPublishedCodexOutput();
  });
  dom.groupSelection.addEventListener("click", groupSelectedElements);
  dom.ungroupSelection.addEventListener("click", ungroupSelectedElements);
  dom.duplicateSelection.addEventListener("click", duplicateSelectedElements);
  dom.deleteSelection.addEventListener("click", deleteSelectedElement);
  dom.sendBackward.addEventListener("click", sendSelectionBackward);
  dom.bringForward.addEventListener("click", bringSelectionForward);
  dom.zoomOut.addEventListener("click", () => updateZoom(-0.1));
  dom.zoomIn.addEventListener("click", () => updateZoom(0.1));
  dom.zoomReset.addEventListener("click", () => setZoom(1));
  dom.openPreview.addEventListener("click", openPreviewWindow);
  dom.generateScreen.addEventListener("click", () => {
    void generateCurrentScreen();
  });
  dom.materializeFrame.addEventListener("click", () => {
    void materializeCurrentFrame();
  });
  dom.generateScreenPanel.addEventListener("click", () => {
    void generateCurrentScreen();
  });
  dom.materializeFramePanel.addEventListener("click", () => {
    void materializeCurrentFrame();
  });
  dom.writeDesignContext.addEventListener("click", () => {
    void writeStarterDesignContext();
  });
  dom.helpButton.addEventListener("click", openHelpOverlay);
  dom.helpClose.addEventListener("click", closeHelpOverlay);
  dom.helpOverlay.addEventListener("click", (event) => {
    if (event.target === dom.helpOverlay) {
      closeHelpOverlay();
    }
  });
  dom.labelEditorInput.addEventListener("keydown", onLabelEditorKeyDown);
  dom.labelEditorInput.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (state.labelDraft) {
        commitLabelEditor();
      }
    }, 0);
  });

  dom.frameList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-frame-id]");
    if (!button) {
      return;
    }
    cancelLabelEditor();
    state.activeFrameId = button.dataset.frameId;
    clearElementSelection();
    state.elementTransform = null;
    renderAll();
  });

  dom.viewModeButtons.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view-mode]");
    if (!button) {
      return;
    }
    cancelLabelEditor();
    state.viewMode = button.dataset.viewMode;
    persistState();
    renderAll();
  });

  dom.toolButtons.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tool]");
    if (!button) {
      return;
    }
    setActiveTool(button.dataset.tool);
  });

  dom.colorButtons.addEventListener("click", (event) => {
    const button = event.target.closest("[data-color]");
    if (!button) {
      return;
    }
    state.color = button.dataset.color;
    persistState();
    renderColors();
    renderBrushPreview();
  });

  dom.customColorPicker.addEventListener("input", () => {
    state.color = normalizeColor(dom.customColorPicker.value, state.color);
    persistState();
    renderColors();
    renderBrushPreview();
  });

  dom.colorHex.addEventListener("input", () => {
    const nextColor = normalizeColor(dom.colorHex.value, "");
    if (!nextColor) {
      dom.colorHex.dataset.invalid = "true";
      return;
    }

    delete dom.colorHex.dataset.invalid;
    state.color = nextColor;
    persistState();
    renderColors();
    renderBrushPreview();
  });

  dom.colorHex.addEventListener("blur", () => {
    state.color = normalizeColor(dom.colorHex.value, state.color);
    delete dom.colorHex.dataset.invalid;
    persistState();
    renderColors();
    renderBrushPreview();
  });

  dom.sizeRange.addEventListener("input", () => {
    setActiveSize(Number(dom.sizeRange.value));
  });

  dom.gridToggle.addEventListener("change", () => {
    state.grid = dom.gridToggle.checked;
    persistState();
    renderCanvas();
    scheduleCapture("Grid updated");
  });

  dom.autosnapToggle.addEventListener("change", () => {
    state.autoSnap = dom.autosnapToggle.checked;
    persistState();
    renderStatus(state.autoSnap ? "Autosnap armed" : "Autosnap paused");
  });

  dom.undoButton.addEventListener("click", undoFrame);
  dom.redoButton.addEventListener("click", redoFrame);
  dom.clearCanvas.addEventListener("click", clearCurrentFrame);

  dom.frameTitle.addEventListener("input", () =>
    updateFrameField("title", dom.frameTitle.value),
  );
  dom.viewportSelect.addEventListener("change", () =>
    updateFrameField("viewport", dom.viewportSelect.value, { capture: true }),
  );
  dom.frameObjective.addEventListener("input", () =>
    updateFrameField("objective", dom.frameObjective.value),
  );
  dom.frameLayout.addEventListener("input", () =>
    updateFrameField("layout", dom.frameLayout.value),
  );
  dom.frameMotion.addEventListener("input", () =>
    updateFrameField("motion", dom.frameMotion.value),
  );
  dom.frameAssets.addEventListener("input", () =>
    updateFrameField("assets", dom.frameAssets.value),
  );
  dom.frameMobile.addEventListener("input", () =>
    updateFrameField("mobile", dom.frameMobile.value),
  );
  dom.generationDirection.addEventListener("change", () =>
    updateGenerationField("direction", dom.generationDirection.value),
  );
  dom.generationStyle.addEventListener("change", () =>
    updateGenerationField("style", dom.generationStyle.value),
  );
  dom.generationFocus.addEventListener("change", () =>
    updateGenerationField("focus", dom.generationFocus.value),
  );
  dom.voiceScopeButtons.addEventListener("click", (event) => {
    const button = event.target.closest("[data-voice-scope]");
    if (!button) {
      return;
    }
    setVoiceScope(button.dataset.voiceScope);
  });
  dom.voiceStart.addEventListener("click", () => {
    void startVoiceDictation();
  });
  dom.voiceStop.addEventListener("click", stopVoiceDictation);
  dom.voiceClearScope.addEventListener("click", clearVoiceScope);
  dom.voiceAddManual.addEventListener("click", addManualVoiceNote);
  dom.voiceManualInput.addEventListener("input", () => {
    state.voice.manualDraft = dom.voiceManualInput.value;
    renderVoicePanel();
  });
  dom.voiceManualInput.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      addManualVoiceNote();
    }
  });
  dom.setEntryFrame.addEventListener("click", setCurrentFrameAsEntry);
  dom.autoLayoutFlow.addEventListener("click", autoLayoutFlow);
  dom.connectionSelect.addEventListener("change", () => {
    state.selectedConnectionId = dom.connectionSelect.value || null;
    renderFlowInspector();
    renderFlowBoard();
  });
  dom.flowList.addEventListener("click", (event) => {
    const removeButton = event.target.closest(
      "[data-flow-remove-connection-id]",
    );
    if (removeButton) {
      state.selectedConnectionId = removeButton.dataset.flowRemoveConnectionId;
      deleteSelectedConnection();
      return;
    }

    const button = event.target.closest("[data-flow-connection-id]");
    if (!button) {
      return;
    }
    state.selectedConnectionId = button.dataset.flowConnectionId;
    renderFlowInspector();
    renderFlowBoard();
  });
  dom.connectionLabel.addEventListener("input", () =>
    updateSelectedConnection("label", dom.connectionLabel.value),
  );
  dom.connectionNotes.addEventListener("input", () =>
    updateSelectedConnection("notes", dom.connectionNotes.value),
  );
  dom.deleteConnection.addEventListener("click", deleteSelectedConnection);
  dom.clearCaptures.addEventListener("click", clearCaptures);
  dom.captureList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-capture-id]");
    if (!removeButton) {
      return;
    }
    deleteCapture(removeButton.dataset.removeCaptureId);
  });

  dom.backgroundUpload.addEventListener("change", async (event) => {
    const [file] = Array.from(event.target.files || []);
    if (!file) {
      return;
    }
    await applyBackgroundFile(file);
    event.target.value = "";
  });

  dom.canvas.addEventListener("pointerdown", onPointerDown);
  dom.canvas.addEventListener("pointermove", onPointerMove);
  dom.canvas.addEventListener("pointerup", onPointerUp);
  dom.canvas.addEventListener("pointerenter", onCanvasPointerEnter);
  dom.canvas.addEventListener("pointerleave", onPointerUp);
  dom.canvas.addEventListener("pointercancel", onPointerUp);
  dom.deviceShell.addEventListener("pointerdown", onDeviceShellPointerDown);

  dom.flowBoard.addEventListener("click", onFlowBoardClick);
  dom.flowBoard.addEventListener("pointerdown", onFlowBoardPointerDown);
  dom.flowSvg.addEventListener("click", onFlowSvgClick);
  window.addEventListener("pointermove", onWindowPointerMove);
  window.addEventListener("pointerup", onWindowPointerUp);
  window.addEventListener("keydown", onWindowKeyDown);
  window.addEventListener("keyup", onWindowKeyUp);
  window.addEventListener("copy", onWindowCopy);

  dom.canvas.parentElement.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  dom.canvas.parentElement.addEventListener("drop", async (event) => {
    event.preventDefault();
    const [file] = Array.from(event.dataTransfer?.files || []).filter((item) =>
      item.type.startsWith("image/"),
    );
    if (file) {
      await applyBackgroundFile(file);
    }
  });

  window.addEventListener("paste", async (event) => {
    if (await tryPasteElements(event)) {
      return;
    }

    const imageItem = Array.from(event.clipboardData?.items || []).find(
      (item) => item.type.startsWith("image/"),
    );
    if (!imageItem) {
      return;
    }
    const file = imageItem.getAsFile();
    if (!file) {
      return;
    }
    await applyBackgroundFile(file);
    renderStatus("Pasted image set as reference underlay");
  });
}

function bindInteractionFeedback() {
  const interactiveSelector =
    "button, .ghost-link-button, .upload-button, [role='button']";

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

function normalizeColor(input, fallback = palette[0]) {
  if (typeof input !== "string") {
    return fallback;
  }

  const value = input.trim();
  const match = value.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) {
    return fallback;
  }

  const hex = match[1];
  if (hex.length === 3) {
    return `#${hex
      .split("")
      .map((character) => `${character}${character}`)
      .join("")
      .toLowerCase()}`;
  }

  return `#${hex.toLowerCase()}`;
}

function createDefaultGenerationConfig() {
  return {
    direction: "product",
    style: "studio",
    focus: "balanced",
  };
}

function normalizeGenerationConfig(
  value,
  fallback = createDefaultGenerationConfig(),
) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    direction: generationDirections.some(
      (entry) => entry.id === source.direction,
    )
      ? source.direction
      : fallback.direction,
    style: generationStyles.some((entry) => entry.id === source.style)
      ? source.style
      : fallback.style,
    focus: generationFocuses.some((entry) => entry.id === source.focus)
      ? source.focus
      : fallback.focus,
  };
}

function generationLabelById(values, id, fallback) {
  return values.find((entry) => entry.id === id)?.label || fallback;
}

function normalizeActionMode(value) {
  return (
    actionModes.find((mode) => mode.id === value) ||
    actionModes.find((mode) => mode.id === "build-ui") ||
    actionModes[0]
  );
}

function currentActionMode() {
  return normalizeActionMode(state?.board?.actionMode);
}

function generationSummaryText(config = state?.board?.generation) {
  const recipe = normalizeGenerationConfig(config);
  return [
    generationLabelById(generationDirections, recipe.direction, "Product UI"),
    generationLabelById(generationStyles, recipe.style, "Studio"),
    generationLabelById(generationFocuses, recipe.focus, "Balanced"),
  ].join(" • ");
}

function hydrateState() {
  const empty = createInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return empty;
    }
    const parsed = JSON.parse(raw);
    const migrated = migratePersistedSnapshot(parsed, empty);
    const frames =
      Array.isArray(migrated.frames) && migrated.frames.length
        ? migrated.frames.map((frame, index) => normalizeFrame(frame, index))
        : empty.frames;
    const frameIds = new Set(frames.map((frame) => frame.id));
    const connections = Array.isArray(migrated.connections)
      ? migrated.connections
          .map((connection) => normalizeConnection(connection))
          .filter(
            (connection) =>
              frameIds.has(connection.fromFrameId) &&
              frameIds.has(connection.toFrameId),
          )
      : [];
    const entryFrameId = frameIds.has(migrated.entryFrameId)
      ? migrated.entryFrameId
      : frames[0].id;

    return {
      ...empty,
      board: {
        ...empty.board,
        ...(migrated.board || {}),
        actionMode: normalizeActionMode(migrated.board?.actionMode).id,
        generation: normalizeGenerationConfig(
          migrated.board?.generation,
          empty.board.generation,
        ),
      },
      frames,
      activeFrameId: frames.some((frame) => frame.id === migrated.activeFrameId)
        ? migrated.activeFrameId
        : frames[0].id,
      tool: toolDefinitions.some((tool) => tool.id === migrated.tool)
        ? migrated.tool
        : empty.tool,
      color: normalizeColor(migrated.color, empty.color),
      size: Number.isFinite(migrated.size) ? migrated.size : empty.size,
      grid: migrated.grid ?? empty.grid,
      autoSnap: migrated.autoSnap ?? empty.autoSnap,
      zoom: Number.isFinite(migrated.zoom)
        ? Math.max(0.5, Math.min(3, migrated.zoom))
        : empty.zoom,
      viewMode: viewModes.some((mode) => mode.id === migrated.viewMode)
        ? migrated.viewMode
        : empty.viewMode,
      workspaceMode: workspaceModes.some(
        (mode) => mode.id === migrated.workspaceMode,
      )
        ? migrated.workspaceMode
        : empty.workspaceMode,
      workbenchTrayCollapsed: Boolean(migrated.workbenchTrayCollapsed),
      connections,
      entryFrameId,
      selectedConnectionId: null,
      pendingConnectionFromFrameId: null,
      saveNotice:
        typeof migrated.saveNotice === "string" ? migrated.saveNotice : "",
      statusText:
        typeof migrated.statusText === "string"
          ? migrated.statusText
          : empty.statusText,
      voice: normalizeVoiceState(migrated.voice, empty.voice),
      serverStatus: {
        exportRoot: null,
        previewManifest: null,
        checkpointHistory: null,
        transcriptBridge: null,
        workspaceFollow: null,
        transport: buildTransportDescriptor(),
        hostCapabilities: null,
        designContext: null,
        outputDigest: null,
        outputActivity: [],
        sessionEvents: [],
      },
      captureTimer: null,
      previewStateTimer: null,
      outputCheckpointInFlight: false,
      outputAnnotationDraft: null,
      lastActionScope: "",
      draftElement: null,
      isDrawing: false,
      flowDrag: null,
      flowConnectionDraft: null,
      brushPreview: {
        visible: false,
        x: 0,
        y: 0,
      },
      hoverElementId: null,
      selectedElementIds: [],
      selectedElementId: null,
      elementTransform: null,
      labelDraft: null,
      shellPan: null,
      spacePressed: false,
    };
  } catch {
    return empty;
  }
}

function migratePersistedSnapshot(snapshot, empty) {
  if (!snapshot || typeof snapshot !== "object") {
    return buildPersistedSnapshot(empty);
  }

  if (isLegacyBlankStoryboard(snapshot)) {
    const resetSnapshot = buildPersistedSnapshot(empty);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resetSnapshot));
    return resetSnapshot;
  }

  if (snapshot.version === STORAGE_VERSION) {
    return snapshot;
  }

  return {
    ...snapshot,
    version: STORAGE_VERSION,
  };
}

function isLegacyBlankStoryboard(snapshot) {
  if (snapshot.version) {
    return false;
  }

  const board = snapshot.board || {};
  const frames = Array.isArray(snapshot.frames) ? snapshot.frames : [];
  const firstFrame = frames[0];

  if (!firstFrame) {
    return false;
  }

  const looksLikeLegacyBoard =
    String(board.project || "")
      .trim()
      .toLowerCase() === "canvax storyboard" ||
    /turn rough sketches/i.test(String(board.goal || "")) ||
    /people collaborating/i.test(String(board.audience || "")) ||
    /intentional,\s*expressive,\s*fast/i.test(String(board.designMood || ""));

  const looksLikeLegacyFrame =
    String(firstFrame.title || "")
      .trim()
      .toLowerCase() === "hero section";
  const hasCanvasContent = frames.some((frame) => frameHasCanvasContent(frame));
  const hasMeaningfulNotes = frames.some((frame) =>
    frameHasMeaningfulNotes(frame),
  );

  return (
    looksLikeLegacyBoard &&
    looksLikeLegacyFrame &&
    !hasCanvasContent &&
    !hasMeaningfulNotes
  );
}

function frameHasCanvasContent(frame) {
  return Boolean(
    frame?.backgroundImage ||
    frame?.thumbnail ||
    (Array.isArray(frame?.elements) && frame.elements.length) ||
    (Array.isArray(frame?.outputAnnotations) &&
      frame.outputAnnotations.length) ||
    (Array.isArray(frame?.captures) && frame.captures.length),
  );
}

function frameHasMeaningfulNotes(frame) {
  return Boolean(
    String(frame?.objective || "").trim() ||
    String(frame?.layout || "").trim() ||
    String(frame?.motion || "").trim() ||
    String(frame?.assets || "").trim() ||
    String(frame?.mobile || "").trim(),
  );
}

function buildTransportDescriptor(overrides = {}) {
  const base = {
    id: "canvax-local-companion-v1",
    mode: TRANSPORT_MODE,
    label: "Local companion",
    runtime: "browser board + local Node service + Codex skill",
    durableHandoff: {
      type: "file-export",
      primary: "exports/canvax-live-latest.json",
      markdown: "exports/canvax-live-latest.md",
      voice: "exports/canvax-voice-latest.md",
      checkpoint: "exports/canvax-checkpoint-latest.json",
    },
    liveMirror: {
      type: "browser-storage",
      storageKey: LIVE_PREVIEW_STORAGE_KEY,
      channel: LIVE_PREVIEW_CHANNEL_NAME,
    },
    outputBinding: {
      type: "manifest",
      manual: "exports/canvax-preview-manifest.json",
      codex: "artifacts/canvax/codex-output.json",
      workspaceFollow: "git-status-live",
    },
    future: {
      mode: FUTURE_TRANSPORT_MODE,
      label: "App Server client",
      protocol: "json-rpc",
      status: "planned",
    },
  };

  return {
    ...base,
    ...(overrides && typeof overrides === "object" && !Array.isArray(overrides)
      ? overrides
      : {}),
    durableHandoff: {
      ...base.durableHandoff,
      ...(overrides?.durableHandoff &&
      typeof overrides.durableHandoff === "object" &&
      !Array.isArray(overrides.durableHandoff)
        ? overrides.durableHandoff
        : {}),
    },
    liveMirror: {
      ...base.liveMirror,
      ...(overrides?.liveMirror &&
      typeof overrides.liveMirror === "object" &&
      !Array.isArray(overrides.liveMirror)
        ? overrides.liveMirror
        : {}),
    },
    outputBinding: {
      ...base.outputBinding,
      ...(overrides?.outputBinding &&
      typeof overrides.outputBinding === "object" &&
      !Array.isArray(overrides.outputBinding)
        ? overrides.outputBinding
        : {}),
    },
    future: {
      ...base.future,
      ...(overrides?.future &&
      typeof overrides.future === "object" &&
      !Array.isArray(overrides.future)
        ? overrides.future
        : {}),
    },
  };
}

function currentTransportDescriptor() {
  const transport = state?.serverStatus?.transport;
  if (transport && typeof transport === "object" && !Array.isArray(transport)) {
    return buildTransportDescriptor(transport);
  }
  return buildTransportDescriptor();
}

function describeTransportSummary(transport = currentTransportDescriptor()) {
  const currentLabel = cleanString(transport?.label) || "Local companion";
  const futureLabel =
    cleanString(transport?.future?.label) || "App Server client";
  return `Transport: ${currentLabel} via live files, manifests, and browser session mirroring today. Future path: ${futureLabel}.`;
}

function describeHostCapabilities() {
  const capabilities = state?.serverStatus?.hostCapabilities || {};
  const codexBrowser = Boolean(capabilities.codexBrowser?.available);
  const imageHost = Boolean(capabilities.hostImageGeneration?.available);
  if (imageHost) {
    return {
      label: "Host image ready",
      detail:
        capabilities.hostImageGeneration?.detail ||
        "The current host advertises image-generation handoff support.",
    };
  }
  if (codexBrowser) {
    return {
      label: "Codex browser",
      detail:
        capabilities.codexBrowser?.detail ||
        "Canvax is designed to run inside the Codex browser loop.",
    };
  }
  return {
    label: "Local no-API",
    detail:
      "Canvax will export task and prompt packs locally. No OpenAI API key is required.",
  };
}

function describeDesignContext() {
  const designContext = state?.serverStatus?.designContext;
  if (designContext?.exists) {
    return {
      label: "DESIGN.md linked",
      detail: `${designContext.relativePath || "DESIGN.md"} is included in task and image prompt packs.`,
    };
  }
  return {
    label: "DESIGN.md: none",
    detail:
      "No project DESIGN.md was found. Canvax will use board mood, labels, and notes as the design contract.",
  };
}

function currentDesignContextForExport() {
  const designContext = state?.serverStatus?.designContext;
  if (!designContext?.exists) {
    return {
      exists: false,
      relativePath: "DESIGN.md",
      summary:
        "No DESIGN.md found. Use board mood, labels, frame notes, and generated direction as the design contract.",
    };
  }
  return {
    exists: true,
    relativePath: designContext.relativePath || "DESIGN.md",
    path: designContext.path || "",
    summary: designContext.summary || "",
    content: designContext.content || "",
  };
}

function createInitialState() {
  const firstFrame = createFrame({ title: "Frame 1", frameIndex: 0 });
  return {
    board: {
      project: "Canvax live canvas",
      goal: "Read the canvas and help me refine, generate, or implement what it shows.",
      audience:
        "web UI, mobile UI, Qt, image direction, or any other visual surface",
      designMood: "Fast, visual, iterative.",
      actionMode: "build-ui",
      generation: createDefaultGenerationConfig(),
    },
    frames: [firstFrame],
    activeFrameId: firstFrame.id,
    tool: "pen",
    color: palette[0],
    size: 14,
    grid: true,
    autoSnap: true,
    zoom: 1,
    viewMode: "frame",
    workspaceMode: "simple",
    workbenchTrayCollapsed: false,
    connections: [],
    entryFrameId: firstFrame.id,
    selectedConnectionId: null,
    pendingConnectionFromFrameId: null,
    selectedElementIds: [],
    selectedElementId: null,
    elementTransform: null,
    saveNotice: "",
    statusText: "Autosnap writes the live canvas after 2s idle",
    voice: createInitialVoiceState(),
    serverStatus: {
      exportRoot: null,
      previewManifest: null,
      checkpointHistory: null,
      transcriptBridge: null,
      workspaceFollow: null,
      transport: buildTransportDescriptor(),
      hostCapabilities: null,
      designContext: null,
      outputDigest: null,
      outputActivity: [],
      sessionEvents: [],
    },
    captureTimer: null,
    previewStateTimer: null,
    outputCheckpointInFlight: false,
    outputAnnotationDraft: null,
    lastActionScope: "",
    draftElement: null,
    isDrawing: false,
    flowDrag: null,
    flowConnectionDraft: null,
    brushPreview: {
      visible: false,
      x: 0,
      y: 0,
    },
    hoverElementId: null,
    selectedElementIds: [],
    labelDraft: null,
    shellPan: null,
    spacePressed: false,
  };
}

function createInitialVoiceState() {
  return {
    scope: "frame",
    status: "idle",
    provider: "",
    interimText: "",
    error: "",
    manualDraft: "",
    segments: [],
  };
}

function normalizeVoiceState(value, fallback = createInitialVoiceState()) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    ...fallback,
    scope: source.scope === "session" ? "session" : fallback.scope,
    status: "idle",
    provider: "",
    interimText: "",
    error: "",
    manualDraft:
      typeof source.manualDraft === "string"
        ? source.manualDraft
        : fallback.manualDraft,
    segments: Array.isArray(source.segments)
      ? source.segments
          .map((segment, index) => normalizeVoiceSegment(segment, index))
          .filter(Boolean)
      : fallback.segments,
  };
}

function normalizeVoiceSegment(segment, index = 0) {
  if (!segment || typeof segment !== "object") {
    return null;
  }
  const text = typeof segment.text === "string" ? segment.text.trim() : "";
  if (!text) {
    return null;
  }
  return {
    id:
      typeof segment.id === "string" && segment.id.trim()
        ? segment.id.trim()
        : `voice-${index + 1}`,
    text,
    at:
      typeof segment.at === "string" && segment.at.trim()
        ? segment.at.trim()
        : new Date().toISOString(),
    scope: segment.scope === "session" ? "session" : "frame",
    provider:
      typeof segment.provider === "string" ? segment.provider.trim() : "",
    frameId: typeof segment.frameId === "string" ? segment.frameId.trim() : "",
    frameTitle:
      typeof segment.frameTitle === "string" ? segment.frameTitle.trim() : "",
  };
}

function normalizeOutputAnnotation(annotation, index = 0) {
  if (!annotation || typeof annotation !== "object") {
    return null;
  }
  const points = Array.isArray(annotation.points)
    ? annotation.points
        .map((point) => normalizeOutputAnnotationPoint(point))
        .filter(Boolean)
    : [];
  if (!points.length) {
    return null;
  }
  const composite =
    annotation.composite === "destination-out" ? "destination-out" : "source-over";

  return {
    id:
      typeof annotation.id === "string" && annotation.id.trim()
        ? annotation.id.trim()
        : `output-mark-${index + 1}`,
    type: "path",
    points,
    color:
      composite === "destination-out"
        ? ERASER_COLOR
        : normalizeColor(annotation.color, palette[0]),
    size: Number.isFinite(annotation.size)
      ? Math.max(1, Math.min(48, annotation.size))
      : 8,
    alpha: Number.isFinite(annotation.alpha)
      ? Math.max(0.05, Math.min(1, annotation.alpha))
      : 1,
    composite,
    targetId:
      typeof annotation.targetId === "string" ? annotation.targetId.trim() : "",
    targetLabel:
      typeof annotation.targetLabel === "string"
        ? annotation.targetLabel.trim()
        : "",
    targetVersionTag:
      typeof annotation.targetVersionTag === "string"
        ? annotation.targetVersionTag.trim()
        : "",
    createdAt:
      typeof annotation.createdAt === "string" && annotation.createdAt.trim()
        ? annotation.createdAt.trim()
        : new Date().toISOString(),
  };
}

function normalizeOutputAnnotationPoint(point) {
  if (!point || typeof point !== "object") {
    return null;
  }
  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return {
    x: clamp(x, 0, 1),
    y: clamp(y, 0, 1),
  };
}

function normalizeFrame(frame, index) {
  return {
    id: frame.id || uid("frame"),
    title: frame.title || `Frame ${index + 1}`,
    viewport: viewportPresets[frame.viewport] ? frame.viewport : "desktop",
    objective: frame.objective || "",
    layout: frame.layout || "",
    motion: frame.motion || "",
    assets: frame.assets || "",
    mobile: frame.mobile || "",
    backgroundImage: frame.backgroundImage || "",
    flowPosition: normalizeFlowPosition(frame.flowPosition, index),
    elements: Array.isArray(frame.elements)
      ? frame.elements
          .map((element, elementIndex) =>
            normalizeFrameElement(element, elementIndex),
          )
          .filter(Boolean)
      : [],
    outputAnnotations: Array.isArray(frame.outputAnnotations)
      ? frame.outputAnnotations
          .map((annotation, annotationIndex) =>
            normalizeOutputAnnotation(annotation, annotationIndex),
          )
          .filter(Boolean)
      : [],
    thumbnail: frame.thumbnail || "",
    captures: Array.isArray(frame.captures)
      ? frame.captures.slice(0, MAX_CAPTURES)
      : [],
    createdAt: frame.createdAt || new Date().toISOString(),
    updatedAt: frame.updatedAt || new Date().toISOString(),
  };
}

function normalizeFrameElement(element, index = 0) {
  if (!element || typeof element !== "object" || Array.isArray(element)) {
    return null;
  }
  const composite =
    element.composite === "destination-out" ? "destination-out" : "source-over";
  return {
    ...element,
    id:
      typeof element.id === "string" && element.id.trim()
        ? element.id.trim()
        : `element-${index + 1}`,
    color:
      composite === "destination-out"
        ? ERASER_COLOR
        : typeof element.color === "string" && element.color.trim()
          ? element.color.trim()
          : palette[0],
    composite,
  };
}

function createFrame(overrides = {}) {
  const index = Number.isFinite(overrides.frameIndex)
    ? overrides.frameIndex
    : Array.isArray(state?.frames)
      ? state.frames.length
      : 0;
  return normalizeFrame(
    {
      id: uid("frame"),
      title: overrides.title || `Frame ${index + 1}`,
      viewport: overrides.viewport || "desktop",
      objective: overrides.objective || "",
      layout: overrides.layout || "",
      motion: overrides.motion || "",
      assets: overrides.assets || "",
      mobile: overrides.mobile || "",
      backgroundImage: overrides.backgroundImage || "",
      flowPosition: overrides.flowPosition || defaultFlowPosition(index),
      elements: overrides.elements || [],
      outputAnnotations: overrides.outputAnnotations || [],
      thumbnail: overrides.thumbnail || "",
      captures: overrides.captures || [],
      createdAt: overrides.createdAt || new Date().toISOString(),
      updatedAt: overrides.updatedAt || new Date().toISOString(),
    },
    0,
  );
}

function currentFrame() {
  return (
    state.frames.find((frame) => frame.id === state.activeFrameId) ||
    state.frames[0]
  );
}

function currentConnection() {
  return (
    state.connections.find(
      (connection) => connection.id === state.selectedConnectionId,
    ) || null
  );
}

function currentSelectedElement(frame = currentFrame()) {
  return (
    frame.elements.find((element) => element.id === state.selectedElementId) ||
    null
  );
}

function currentSelectedElements(frame = currentFrame()) {
  const ids = state.selectedElementIds.length
    ? state.selectedElementIds
    : state.selectedElementId
      ? [state.selectedElementId]
      : [];
  return frame.elements.filter((element) => ids.includes(element.id));
}

function setSelectedElements(ids, primaryId = ids.at(-1) || null) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  state.selectedElementIds = uniqueIds;
  state.selectedElementId =
    primaryId && uniqueIds.includes(primaryId)
      ? primaryId
      : uniqueIds.at(-1) || null;
  renderSizeControl();
}

function clearElementSelection() {
  state.selectedElementIds = [];
  state.selectedElementId = null;
  state.hoverElementId = null;
  renderSizeControl();
}

function selectionIds() {
  return state.selectedElementIds.length
    ? state.selectedElementIds
    : state.selectedElementId
      ? [state.selectedElementId]
      : [];
}

function selectionGroupIds(frame = currentFrame()) {
  return Array.from(
    new Set(
      currentSelectedElements(frame)
        .map((element) => element.groupId)
        .filter(Boolean),
    ),
  );
}

function normalizeFlowPosition(position, index) {
  if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
    return {
      x: Math.max(32, position.x),
      y: Math.max(32, position.y),
    };
  }
  return defaultFlowPosition(index);
}

function defaultFlowPosition(index) {
  const column = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: FLOW_SURFACE_PADDING + column * (FLOW_CARD_WIDTH + 88),
    y: FLOW_SURFACE_PADDING + row * (FLOW_CARD_HEIGHT + 96),
  };
}

function normalizeConnection(connection) {
  return {
    id: connection.id || uid("connection"),
    fromFrameId: connection.fromFrameId || "",
    toFrameId: connection.toFrameId || "",
    label: connection.label || "continue",
    notes: connection.notes || "",
  };
}

function populateViewportSelect() {
  const markup = Object.entries(viewportPresets)
    .map(
      ([id, viewport]) =>
        `<option value="${id}">${viewport.label} · ${viewport.width}×${viewport.height}</option>`,
    )
    .join("");
  dom.viewportSelect.innerHTML = markup;
  dom.focusViewportSelect.innerHTML = markup;
  dom.focusActionModeSelect.innerHTML = actionModes
    .map(
      (mode) =>
        `<option value="${mode.id}">${mode.label}</option>`,
    )
    .join("");
}

function renderAll() {
  renderWorkspaceMode();
  syncCanvasSize();
  renderBoardFields();
  renderTools();
  renderToolHint();
  renderZoom();
  renderSelectionActions();
  renderViewMode();
  renderColors();
  renderFrameList();
  renderFrameForm();
  renderVoicePanel();
  renderFlowBoard();
  renderFlowInspector();
  renderStatus();
  renderCanvas();
  renderBrushPreview();
  renderCaptures();
  renderSpec();
  renderCodexOutput();
  renderCheckpointPanel();
  renderUndoRedo();
  renderServerStatus();
}

function renderWorkspaceMode() {
  const mode = workspaceModes.some((entry) => entry.id === state.workspaceMode)
    ? state.workspaceMode
    : "simple";
  state.workspaceMode = mode;
  if (mode === "simple" && state.viewMode !== "frame") {
    state.viewMode = "frame";
  }
  if (mode === "simple" && state.voice.scope !== "frame") {
    state.voice.scope = "frame";
  }

  document.body.dataset.workspaceMode = mode;
  document.body.dataset.workbenchTray =
    mode === "simple" && state.workbenchTrayCollapsed
      ? "collapsed"
      : "expanded";
  dom.workspaceModeLabel.textContent =
    workspaceModes.find((entry) => entry.id === mode)?.label || "Workbench";
  dom.focusPad.hidden = mode !== "simple" || state.workbenchTrayCollapsed;
  dom.workbenchTrayToggle.hidden = mode !== "simple";
  dom.workbenchTrayToggle.textContent = state.workbenchTrayCollapsed
    ? "Show tray"
    : "Hide tray";
  dom.workbenchTrayToggle.setAttribute(
    "aria-pressed",
    String(state.workbenchTrayCollapsed),
  );
  dom.workspaceModeButtons
    .querySelectorAll("[data-workspace-mode]")
    .forEach((button) => {
      const active = button.dataset.workspaceMode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  renderFocusPad();
}

function toggleWorkbenchTray() {
  state.workbenchTrayCollapsed = !state.workbenchTrayCollapsed;
  persistState();
  renderAll();
  renderStatus(
    state.workbenchTrayCollapsed
      ? "Designer focus on: tray hidden, canvas is primary"
      : "Workbench tray shown",
  );
}

function handleWorkbenchRailAction(action) {
  if (action === "size-down") {
    adjustActiveSize(-2);
    return;
  }
  if (action === "size-up") {
    adjustActiveSize(2);
    return;
  }
  if (action === "undo") {
    undoDesignerAction();
    return;
  }
  if (action === "redo") {
    redoDesignerAction();
    return;
  }
  if (action === "voice") {
    if (state.voice.status === "listening") {
      stopVoiceDictation();
    } else {
      startVoiceDictation();
    }
    return;
  }
  if (action === "generate") {
    void generateCurrentScreen();
    return;
  }
  if (action === "image-pack") {
    void saveImagePromptPackForHost();
    return;
  }
  if (action === "apply") {
    void applyFocusPadToCodex();
  }
}

function updateBrushSize(nextSize) {
  state.size = Math.max(4, Math.min(48, Math.round(nextSize)));
  persistState();
  renderColors();
  renderBrushPreview();
  renderFocusPad();
  renderStatus(`Brush size ${state.size}px`);
}

function setActiveSize(nextSize) {
  if (state.tool === "select" && selectionIds().length) {
    setSelectedStrokeSize(nextSize);
    return;
  }
  updateBrushSize(nextSize);
}

function adjustActiveSize(delta) {
  if (state.tool === "select" && selectionIds().length) {
    resizeSelectedStroke(delta);
    return;
  }
  updateBrushSize(state.size + delta);
}

function resizeSelectedStroke(delta) {
  const selected = currentSelectedElements(currentFrame());
  const current =
    selected.length === 1
      ? Number(selected[0].size) || state.size
      : currentSizeControlState().value;
  setSelectedStrokeSize(current + delta);
}

function setSelectedStrokeSize(nextSize) {
  const frame = currentFrame();
  const selected = currentSelectedElements(frame);
  if (!selected.length) {
    updateBrushSize(nextSize);
    return;
  }

  pushHistory(frame.id);
  selected.forEach((element) => {
    const minSize = element.type === "label" ? 8 : 1;
    const maxSize = element.type === "label" ? 96 : 96;
    element.size = Math.max(minSize, Math.min(maxSize, Math.round(nextSize)));
    syncAttachedLabels(frame, element.id);
  });
  touchFrame(frame, {
    capture: true,
    status:
      selected.length === 1
        ? "Selected element size updated"
        : "Selected element sizes updated",
  });
}

function currentSizeControlState() {
  if (state.tool === "select") {
    const selected = currentSelectedElements(currentFrame());
    if (selected.length) {
      const sizes = selected.map((element) =>
        Number(element.size) || (element.type === "label" ? 18 : state.size),
      );
      const average = Math.round(
        sizes.reduce((total, size) => total + size, 0) / sizes.length,
      );
      const mixed = sizes.some((size) => size !== sizes[0]);
      return {
        mode: "selection",
        value: average,
        label: mixed ? `Selection ${average} px avg` : `Selection ${average} px`,
        railLabel: mixed ? `${average}*` : String(average),
      };
    }
  }

  return {
    mode: "brush",
    value: state.size,
    label: `${state.size} px`,
    railLabel: String(state.size),
  };
}

function setWorkspaceMode(mode) {
  const nextMode = mode === "advanced" ? "advanced" : "simple";
  cancelLabelEditor();
  state.workspaceMode = nextMode;
  if (nextMode === "simple") {
    state.viewMode = "frame";
    state.voice.scope = "frame";
    if (!["pen", "rect", "arrow", "erase"].includes(state.tool)) {
      state.tool = "pen";
    }
  }
  persistState();
  renderAll();
  renderStatus(
    nextMode === "simple"
      ? "Workbench ready: sketch, talk, generate, then apply"
      : "Advanced Canvax controls shown",
  );
}

function setActiveTool(toolId) {
  if (!toolDefinitions.some((tool) => tool.id === toolId)) {
    return;
  }
  if (state.labelDraft && toolId !== "label") {
    commitLabelEditor();
  }
  state.tool = toolId;
  state.focusLastAppliedText = "";
  state.hoverElementId = null;
  persistState();
  renderTools();
  renderFocusPad();
  renderColors();
  renderBrushPreview();
  renderCanvas();
}

function renderBoardFields() {
  state.board.actionMode = currentActionMode().id;
  dom.boardProject.value = state.board.project;
  dom.boardGoal.value = state.board.goal;
  dom.boardAudience.value = state.board.audience;
  dom.boardMood.value = state.board.designMood;
  dom.focusActionModeSelect.value = state.board.actionMode;
  renderGenerationRecipe();
}

function renderGenerationRecipe() {
  const recipe = normalizeGenerationConfig(state.board.generation);
  state.board.generation = recipe;
  dom.generationDirection.value = recipe.direction;
  dom.generationStyle.value = recipe.style;
  dom.generationFocus.value = recipe.focus;
  const summary = generationSummaryText(recipe);
  dom.generationSummary.textContent = summary;
  dom.generateScreen.title = `Generate a richer screen using ${summary}`;
  dom.generateScreenPanel.title = `Generate a richer screen using ${summary}`;
}

function renderTools() {
  dom.toolButtons.innerHTML = toolDefinitions
    .map(
      (tool) =>
        `<button class="tool-chip ${tool.id === state.tool ? "active" : ""}" data-tool="${tool.id}" title="${escapeHtml(toolMeta[tool.id] || tool.label)}">${tool.label}</button>`,
    )
    .join("");
}

function renderFocusPad() {
  dom.focusToolButtons
    .querySelectorAll("[data-focus-tool]")
    .forEach((button) => {
      const active = button.dataset.focusTool === state.tool;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  dom.workbenchRail
    .querySelectorAll("[data-rail-tool]")
    .forEach((button) => {
      const active = button.dataset.railTool === state.tool;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  dom.workbenchRail
    .querySelectorAll("[data-rail-action='undo']")
    .forEach((button) => {
      button.disabled = !currentUndoRedoState().canUndo;
    });
  dom.workbenchRail
    .querySelectorAll("[data-rail-action='redo']")
    .forEach((button) => {
      button.disabled = !currentUndoRedoState().canRedo;
    });
  dom.workbenchRail
    .querySelectorAll("[data-rail-action='voice']")
    .forEach((button) => {
      button.textContent =
        state.voice.status === "listening" ? "Stop" : "Talk";
      button.classList.toggle("active", state.voice.status === "listening");
      button.setAttribute(
        "aria-pressed",
        String(state.voice.status === "listening"),
      );
    });
  dom.workbenchRail
    .querySelectorAll("[data-rail-action='generate']")
    .forEach((button) => {
      button.disabled = Boolean(state.generationInFlight);
    });
  dom.workbenchRail
    .querySelectorAll("[data-rail-action='image-pack']")
    .forEach((button) => {
      button.disabled = Boolean(state.focusApplyInFlight);
    });
  dom.workbenchRail
    .querySelectorAll("[data-rail-action='apply']")
    .forEach((button) => {
      button.disabled = Boolean(state.focusApplyInFlight);
    });

  const frame = currentFrame();
  const frameIndex = Math.max(
    0,
    state.frames.findIndex((candidate) => candidate.id === frame.id),
  );
  const viewport = viewportPresets[frame.viewport] || viewportPresets.desktop;
  const actionMode = currentActionMode();
  const relevantSegments = voiceSegmentsForCurrentScope();
  const supportsVoice = supportsBrowserVoiceRecognition();
  dom.focusViewportSelect.value = frame.viewport;
  dom.focusActionModeSelect.value = actionMode.id;
  dom.focusFrameChip.textContent = `${frameIndex + 1}. ${frame.title}`;
  dom.focusSurfaceChip.textContent = `${viewport.label} · ${viewport.width}×${viewport.height}`;
  dom.focusActionChip.textContent = actionMode.label;
  dom.focusActionChip.title = actionMode.description;
  const hostSummary = describeHostCapabilities();
  dom.focusHostChip.textContent = hostSummary.label;
  dom.focusHostChip.title = hostSummary.detail;
  const designSummary = describeDesignContext();
  dom.focusDesignChip.textContent = designSummary.label;
  dom.focusDesignChip.title = designSummary.detail;
  dom.focusFreeCanvas.classList.toggle("active", frame.viewport === "free");
  dom.focusManualInput.value = state.voice.manualDraft;
  dom.focusAddManual.disabled = !state.voice.manualDraft.trim();
  dom.focusApply.disabled = Boolean(state.focusApplyInFlight);
  dom.focusGenerate.disabled = Boolean(state.generationInFlight);
  dom.focusImagePack.disabled = Boolean(state.focusApplyInFlight);
  dom.focusVoiceToggle.textContent =
    state.voice.status === "listening" ? "Stop talking" : "Start talking";
  dom.focusVoiceToggle.classList.toggle(
    "active",
    state.voice.status === "listening",
  );

  if (state.focusApplyInFlight) {
    dom.focusStatus.textContent =
      "Saving the sketch, voice context, and checkpoint for Codex...";
  } else if (state.voice.status === "listening") {
    dom.focusStatus.textContent = `Listening for ${voiceScopeLabel("frame", frame)}. Keep drawing while you speak.`;
  } else if (state.voice.error) {
    dom.focusStatus.textContent = state.voice.error;
  } else if (state.focusLastAppliedText) {
    dom.focusStatus.textContent = state.focusLastAppliedText;
  } else if (!supportsVoice) {
    dom.focusStatus.textContent =
      "Browser dictation is unavailable here. Paste macOS dictation below, then apply.";
  } else {
    dom.focusStatus.textContent =
      "Draw rough placement, start talking or paste a note, then Apply to Codex.";
  }

  renderWorkbenchOutput();

  if (state.voice.interimText) {
    dom.focusTranscript.className = "voice-live";
    dom.focusTranscript.innerHTML = `
      <strong>Live transcript</strong>
      <p>${escapeHtml(state.voice.interimText)}</p>
    `;
    return;
  }

  if (!relevantSegments.length) {
    dom.focusTranscript.className = "voice-live empty-state";
    dom.focusTranscript.textContent = "No voice note yet.";
    return;
  }

  dom.focusTranscript.className = "voice-live focus-transcript-list";
  dom.focusTranscript.innerHTML = relevantSegments
    .slice(0, 3)
    .map(
      (segment) => `
        <p>
          <strong>${escapeHtml(timeLabel(segment.at))}</strong>
          ${escapeHtml(segment.text)}
        </p>
      `,
    )
    .join("");
}

function renderWorkbenchOutput() {
  const manifest = state.serverStatus.previewManifest || null;
  const target = resolveManifestTargetEntry(manifest, state.activeFrameId);
  const frame = currentFrame();
  const annotationCount = frame.outputAnnotations?.length || 0;
  const status = describeFrameOutputStatus(frame, {
    includeGlobal: true,
    manifest,
  });
  const targetUrl = resolveWorkbenchTargetUrl(target);
  const targetLabel = target?.label || status?.label || "Generated output";
  const targetKind =
    target?.type === "generated-screen-preview"
      ? "Generated"
      : target?.type === "materialized-preview"
        ? "Materialized"
        : target
          ? "Attached"
          : "No output";

  dom.workbenchOutputBadge.textContent = status?.label || targetKind;
  dom.workbenchOutputBadge.dataset.tone = status?.tone || (target ? "synced" : "empty");
  dom.workbenchOpenOutput.hidden = !targetUrl;
  dom.workbenchOpenOutput.href = targetUrl || "#";
  dom.workbenchClearMarks.hidden = annotationCount === 0;

  if (!target || !targetUrl) {
    dom.workbenchOutputSurface.className =
      "workbench-output-surface empty-state";
    dom.workbenchOutputSurface.innerHTML = `
      <span class="workbench-output-mark">Make real</span>
      <p>Draw a rough layout, add spoken context, then press Make. Output appears here for correction marks.</p>
    `;
    dom.workbenchOutputMeta.textContent = annotationCount
      ? `${annotationCount} output correction mark(s) are saved, but no generated surface is currently attached.`
      : "Ready for UI, image prompt, book spread, poster, app screen, deck, or spec work.";
    return;
  }

  const framedUrl = addTargetRevisionToUrl(targetUrl, target);
  const freshness = describeManifestFreshness(target, frame);
  const refinement = describeTargetRefinement(target);
  dom.workbenchOutputSurface.className = `workbench-output-surface ${
    annotationCount ? "has-annotations" : ""
  }`;
  dom.workbenchOutputSurface.innerHTML = `
    <iframe
      src="${escapeHtml(framedUrl)}"
      title="${escapeHtml(targetLabel)}"
      loading="lazy"
    ></iframe>
    <canvas
      id="workbench-output-overlay"
      class="workbench-output-overlay"
      aria-label="Draw correction marks over the generated output"
    ></canvas>
    <span class="workbench-output-draw-hint">${
      annotationCount
        ? `${annotationCount} correction mark${annotationCount === 1 ? "" : "s"}`
        : "Draw corrections here"
    }</span>
  `;
  const baseMeta =
    freshness ||
    refinement ||
    target.description ||
    `${targetKind} output is connected to this frame.`;
  dom.workbenchOutputMeta.textContent = annotationCount
    ? `${baseMeta} ${annotationCount} correction mark(s) are attached to this output.`
    : `${baseMeta} Use pen, marker, or erase on this surface to mark the next correction.`;
  window.requestAnimationFrame(renderWorkbenchOutputAnnotations);
}

function currentWorkbenchTarget() {
  const manifest = state.serverStatus.previewManifest || null;
  return resolveManifestTargetEntry(manifest, state.activeFrameId);
}

function workbenchOutputToolCanDraw() {
  return state.tool === "pen" || state.tool === "marker" || state.tool === "erase";
}

function outputAnnotationPointFromEvent(event) {
  const canvas = document.querySelector("#workbench-output-overlay");
  if (!canvas) {
    return null;
  }
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }
  return {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
  };
}

function onWorkbenchOutputPointerDown(event) {
  if (
    state.workspaceMode !== "simple" ||
    !workbenchOutputToolCanDraw() ||
    event.button > 0
  ) {
    return;
  }
  const target = currentWorkbenchTarget();
  const canvas = document.querySelector("#workbench-output-overlay");
  const point = outputAnnotationPointFromEvent(event);
  if (!target || !canvas || !point) {
    return;
  }

  event.preventDefault();
  canvas.setPointerCapture?.(event.pointerId);
  state.outputAnnotationDraft = {
    id: uid("output-mark"),
    type: "path",
    points: [point],
    color: state.tool === "erase" ? ERASER_COLOR : normalizeColor(state.color),
    size: state.size,
    alpha: state.tool === "marker" ? 0.42 : 1,
    composite: state.tool === "erase" ? "destination-out" : "source-over",
    targetId: target.id || "",
    targetLabel: target.label || "",
    targetVersionTag: target.versionTag || "",
    pointerId: event.pointerId,
    createdAt: new Date().toISOString(),
  };
  renderWorkbenchOutputAnnotations();
}

function onWorkbenchOutputPointerMove(event) {
  const draft = state.outputAnnotationDraft;
  if (!draft || draft.pointerId !== event.pointerId) {
    return;
  }
  const point = outputAnnotationPointFromEvent(event);
  if (!point) {
    return;
  }
  const previous = draft.points.at(-1);
  if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > 0.002) {
    draft.points.push(point);
    renderWorkbenchOutputAnnotations();
  }
}

function onWorkbenchOutputPointerUp(event) {
  const draft = state.outputAnnotationDraft;
  if (!draft || draft.pointerId !== event.pointerId) {
    return;
  }
  const canvas = document.querySelector("#workbench-output-overlay");
  canvas?.releasePointerCapture?.(event.pointerId);
  state.outputAnnotationDraft = null;
  const normalized = normalizeOutputAnnotation(draft);
  if (!normalized || !isOutputAnnotationMeaningful(normalized)) {
    renderWorkbenchOutputAnnotations();
    return;
  }
  const frame = currentFrame();
  pushOutputAnnotationHistory(frame);
  frame.outputAnnotations = [...(frame.outputAnnotations || []), normalized].slice(
    -80,
  );
  touchFrame(frame, {
    capture: false,
    status: "Output correction mark saved",
  });
}

function isOutputAnnotationMeaningful(annotation) {
  if (!annotation?.points || annotation.points.length < 2) {
    return false;
  }
  const first = annotation.points[0];
  const last = annotation.points.at(-1);
  return Math.hypot(last.x - first.x, last.y - first.y) > 0.006;
}

function renderWorkbenchOutputAnnotations() {
  const canvas = document.querySelector("#workbench-output-overlay");
  if (!canvas) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const nextWidth = Math.max(1, Math.round(rect.width * dpr));
  const nextHeight = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const frame = currentFrame();
  [...(frame.outputAnnotations || []), state.outputAnnotationDraft]
    .filter(Boolean)
    .forEach((annotation) =>
      drawOutputAnnotation(ctx, annotation, rect.width, rect.height),
    );
}

function drawOutputAnnotation(ctx, annotation, width, height) {
  if (!annotation?.points?.length) {
    return;
  }
  const isEraser = annotation.composite === "destination-out";
  ctx.save();
  ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
  ctx.globalAlpha = isEraser ? 1 : (annotation.alpha ?? 1);
  ctx.strokeStyle = isEraser
    ? ERASER_RENDER_COLOR
    : annotation.color || palette[0];
  ctx.lineWidth = Math.max(2, annotation.size || state.size);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(annotation.points[0].x * width, annotation.points[0].y * height);
  for (let index = 1; index < annotation.points.length; index += 1) {
    ctx.lineTo(annotation.points[index].x * width, annotation.points[index].y * height);
  }
  ctx.stroke();
  ctx.restore();
}

function clearWorkbenchOutputMarks() {
  const frame = currentFrame();
  if (!frame.outputAnnotations?.length) {
    return;
  }
  pushOutputAnnotationHistory(frame);
  frame.outputAnnotations = [];
  state.outputAnnotationDraft = null;
  touchFrame(frame, { capture: false, status: "Output correction marks cleared" });
}

function resolveWorkbenchTargetUrl(target) {
  if (!target) {
    return "";
  }
  if (target.resolvedUrl || target.url) {
    return target.resolvedUrl || target.url;
  }
  if (target.previewPath) {
    return `/workspace/${target.previewPath}`;
  }
  return "";
}

function addTargetRevisionToUrl(url, target) {
  if (!url || !target?.versionTag) {
    return url;
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}canvaxRevision=${encodeURIComponent(target.versionTag)}`;
}

function renderToolHint() {
  dom.toolHint.textContent =
    state.viewMode === "flow"
      ? "Flow view is for arranging frames, linking navigation, and defining transitions between screens."
      : toolMeta[state.tool] || "";
}

function renderZoom() {
  dom.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
  dom.zoomOut.disabled = state.zoom <= 0.5;
  dom.zoomIn.disabled = state.zoom >= 3;
}

function setZoom(nextZoom) {
  state.zoom = Math.max(0.5, Math.min(3, Number(nextZoom.toFixed(2))));
  persistState();
  renderZoom();
  renderCanvas();
}

function updateZoom(delta) {
  setZoom(state.zoom + delta);
}

function renderSelectionActions() {
  const frame = currentFrame();
  const selected = currentSelectedElements(frame);
  const groupIds = selectionGroupIds(frame);
  const canEditSelection = state.viewMode === "frame";
  dom.groupSelection.disabled = !canEditSelection || selected.length < 2;
  dom.ungroupSelection.disabled =
    !canEditSelection || selected.length === 0 || groupIds.length === 0;
  dom.duplicateSelection.disabled = !canEditSelection || selected.length === 0;
  dom.deleteSelection.disabled = !canEditSelection || selected.length === 0;
  dom.sendBackward.disabled = !canEditSelection || selected.length === 0;
  dom.bringForward.disabled = !canEditSelection || selected.length === 0;
}

function renderViewMode() {
  dom.viewModeButtons.innerHTML = viewModes
    .map(
      (mode) => `
        <button
          class="segment ${mode.id === state.viewMode ? "active" : ""}"
          data-view-mode="${mode.id}"
          aria-pressed="${String(mode.id === state.viewMode)}"
          title="${mode.id === "frame" ? "Draw and annotate the current frame canvas" : "Arrange frames and connect them as a flow"}"
        >
          ${mode.label}
        </button>
      `,
    )
    .join("");

  const showFrame = state.viewMode === "frame";
  dom.frameWorkspace.hidden = !showFrame;
  dom.flowWorkspace.hidden = showFrame;
  document.querySelectorAll("[data-view-scope]").forEach((node) => {
    node.hidden = node.getAttribute("data-view-scope") !== state.viewMode;
  });
  if (!showFrame) {
    dom.statusPill.textContent =
      "Flow view focuses on frame relationships, ordering, and transitions.";
  }
}

function renderColors() {
  dom.colorButtons.innerHTML = palette
    .map(
      (color) =>
        `<button class="swatch ${color === state.color ? "active" : ""}" data-color="${color}" title="${color.toUpperCase()}" style="background:${color}; border-color:${color === "#ffffff" ? "rgba(24,17,14,0.18)" : color}"></button>`,
    )
    .join("");
  dom.customColorPicker.value = normalizeColor(state.color);
  dom.colorHex.value = normalizeColor(state.color);
  delete dom.colorHex.dataset.invalid;
  renderSizeControl();
  renderBrushSizeChip();
}

function renderSizeControl() {
  if (!dom.sizeRange || !dom.sizeValue || !dom.railSizeValue) {
    return;
  }
  const sizeControl = currentSizeControlState();
  dom.sizeRange.value = String(clamp(sizeControl.value, 4, 48));
  dom.sizeValue.textContent = sizeControl.label;
  dom.railSizeValue.textContent = sizeControl.railLabel;
  dom.railSizeValue.title =
    sizeControl.mode === "selection"
      ? "Selected element size"
      : "Current brush size";
}

function renderFrameList() {
  dom.frameCount.textContent = `${state.frames.length} ${state.frames.length === 1 ? "frame" : "frames"}`;
  dom.frameList.innerHTML = state.frames
    .map((frame, index) => {
      const viewport = viewportPresets[frame.viewport];
      const thumbnail = frameThumbnailDataUrl(frame, {
        maxWidth: 420,
        mime: "image/jpeg",
        quality: 0.84,
      });
      const outputStatus = describeFrameOutputStatus(frame, {
        includeGlobal: frame.id === state.activeFrameId,
      });
      const subtitle = [viewport.label, timeLabel(frame.updatedAt)]
        .filter(Boolean)
        .join(" • ");
      return `
        <button class="frame-card ${frame.id === state.activeFrameId ? "active" : ""}" data-frame-id="${frame.id}">
          <div class="frame-thumb">
            ${thumbnail ? `<img src="${thumbnail}" alt="" />` : ""}
          </div>
          <div class="frame-meta">
            <div class="frame-meta-row">
              <strong>${index + 1}. ${escapeHtml(frame.title)}</strong>
              ${renderFrameOutputBadge(outputStatus)}
            </div>
            <span>${escapeHtml(subtitle)}</span>
            <span>${frame.captures.length} capture${frame.captures.length === 1 ? "" : "s"}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderFrameForm() {
  const frame = currentFrame();
  const viewport = viewportPresets[frame.viewport];
  const outputStatus = describeFrameOutputStatus(frame, {
    includeGlobal: true,
  });
  dom.frameTitle.value = frame.title;
  dom.viewportSelect.value = frame.viewport;
  dom.frameObjective.value = frame.objective;
  dom.frameLayout.value = frame.layout;
  dom.frameMotion.value = frame.motion;
  dom.frameAssets.value = frame.assets;
  dom.frameMobile.value = frame.mobile;
  if (state.viewMode === "flow") {
    dom.stageTitle.textContent = "Flow map";
    dom.stageSubtitle.textContent = `${state.frames.length} frames • ${state.connections.length} links • entry: ${frameTitleById(state.entryFrameId)}`;
  } else {
    dom.stageTitle.textContent = frame.title;
    const subtitleParts = [
      `${viewport.label} canvas`,
      `${viewport.width}×${viewport.height}`,
      frame.backgroundImage
        ? "reference underlay loaded"
        : "blank sketch sheet",
    ];
    if (outputStatus?.label) {
      subtitleParts.push(outputStatus.label.toLowerCase());
    }
    dom.stageSubtitle.textContent = subtitleParts.join(" • ");
    dom.stageSubtitle.title = outputStatus?.detail || "";
  }
}

function renderVoicePanel() {
  const frame = currentFrame();
  const segments = state.voice.segments;
  const relevantSegments = voiceSegmentsForCurrentScope();
  const supportsVoice = supportsBrowserVoiceRecognition();
  const activeScopeLabel = voiceScopeLabel(state.voice.scope, frame);

  dom.voiceSegmentCount.textContent = `${segments.length} ${segments.length === 1 ? "segment" : "segments"}`;
  dom.voiceScopeButtons
    .querySelectorAll("[data-voice-scope]")
    .forEach((button) => {
      const active = button.dataset.voiceScope === state.voice.scope;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  dom.voiceManualInput.value = state.voice.manualDraft;
  dom.voiceStart.disabled = state.voice.status === "listening";
  dom.voiceStop.disabled = state.voice.status !== "listening";
  dom.voiceClearScope.disabled = relevantSegments.length === 0;
  dom.voiceAddManual.disabled = !state.voice.manualDraft.trim();

  if (state.voice.status === "listening") {
    dom.voiceStatus.textContent = `Listening for ${activeScopeLabel}. Keep drawing while Canvax captures spoken intent.`;
  } else if (state.voice.error) {
    dom.voiceStatus.textContent = state.voice.error;
  } else if (!supportsVoice) {
    dom.voiceStatus.textContent =
      "Browser speech recognition is not available here. Use Manual voice note with macOS dictation or pasted spoken notes.";
  } else {
    dom.voiceStatus.textContent = `Dictation is idle. Start it for ${activeScopeLabel}, or use Manual voice note below.`;
  }

  if (state.voice.interimText) {
    dom.voiceInterim.className = "voice-live";
    dom.voiceInterim.innerHTML = `
      <strong>Live transcript</strong>
      <p>${escapeHtml(state.voice.interimText)}</p>
    `;
  } else {
    dom.voiceInterim.className = "voice-live empty-state";
    dom.voiceInterim.textContent = "No live transcript yet.";
  }

  if (!segments.length) {
    dom.voiceList.className = "voice-list empty-state";
    dom.voiceList.textContent = "No saved voice notes yet.";
    renderFocusPad();
    return;
  }

  dom.voiceList.className = "voice-list";
  dom.voiceList.innerHTML = relevantSegments.length
    ? relevantSegments
        .map((segment) => {
          const scope = segment.scope === "session" ? "Board" : "Frame";
          const frameLabel =
            segment.scope === "frame"
              ? segment.frameTitle || frameTitleById(segment.frameId)
              : segment.frameTitle || "Board context";
          return `
            <article class="voice-segment">
              <div class="voice-segment-row">
                <strong>${escapeHtml(scope)}</strong>
                <span class="voice-segment-meta">${escapeHtml(timeLabel(segment.at))}</span>
              </div>
              <p class="voice-segment-copy">${escapeHtml(segment.text)}</p>
              <p class="voice-segment-meta">${escapeHtml(frameLabel)}</p>
            </article>
          `;
        })
        .join("")
    : `<p class="helper-text">No voice notes match the current ${state.voice.scope === "frame" ? "frame" : "board"} scope yet.</p>`;
  renderFocusPad();
}

function renderStatus(message = state.statusText) {
  state.statusText = message;
  dom.statusPill.textContent =
    state.viewMode === "flow"
      ? "Flow view focuses on frame relationships, ordering, and transitions."
      : state.statusText;
}

function supportsBrowserVoiceRecognition() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function voiceScopeLabel(scope = state.voice.scope, frame = currentFrame()) {
  if (scope === "session") {
    return "the whole board";
  }
  return frame?.title ? `the frame “${frame.title}”` : "the current frame";
}

function voiceSegmentsForCurrentScope() {
  const frame = currentFrame();
  return state.voice.segments
    .filter((segment) => {
      if (state.voice.scope === "session") {
        return segment.scope === "session";
      }
      return segment.frameId === frame.id;
    })
    .slice()
    .sort((left, right) => Date.parse(right.at) - Date.parse(left.at))
    .slice(0, 10);
}

function setVoiceScope(scope) {
  state.voice.scope = scope === "session" ? "session" : "frame";
  persistState();
  renderVoicePanel();
  renderSpec();
  renderStatus(
    `Voice notes now target ${voiceScopeLabel(state.voice.scope, currentFrame())}`,
  );
}

function startVoiceDictation() {
  if (state.voice.status === "listening") {
    return;
  }

  const Recognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    state.voice.status = "unsupported";
    state.voice.error =
      "Browser speech recognition is unavailable here. Use Manual voice note with macOS dictation or pasted spoken notes.";
    renderVoicePanel();
    renderStatus("Browser dictation unavailable");
    return;
  }

  try {
    stopVoiceRecognitionInstance();
    voiceRecognition = new Recognition();
    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = true;
    voiceRecognition.lang = navigator.language || "en-US";

    voiceRecognition.onstart = () => {
      state.voice.status = "listening";
      state.voice.provider = "browser-speech";
      state.voice.interimText = "";
      state.voice.error = "";
      renderVoicePanel();
      renderStatus(`Dictating for ${voiceScopeLabel(state.voice.scope)}`);
    };

    voiceRecognition.onresult = (event) => {
      const interimParts = [];
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript?.trim() || "";
        if (!transcript) {
          continue;
        }
        if (result.isFinal) {
          addVoiceSegment(transcript, { provider: "browser-speech" });
        } else {
          interimParts.push(transcript);
        }
      }
      state.voice.interimText = interimParts.join(" ").trim();
      renderVoicePanel();
    };

    voiceRecognition.onerror = (event) => {
      state.voice.status =
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "blocked"
          : "error";
      state.voice.error = humanizeVoiceError(event.error);
      state.voice.interimText = "";
      renderVoicePanel();
      renderStatus("Dictation unavailable");
    };

    voiceRecognition.onend = () => {
      voiceRecognition = null;
      if (state.voice.status === "listening") {
        state.voice.status = "idle";
      }
      state.voice.interimText = "";
      renderVoicePanel();
    };

    voiceRecognition.start();
  } catch (error) {
    state.voice.status = "error";
    state.voice.error =
      error instanceof Error
        ? error.message
        : "Dictation could not start in this browser.";
    renderVoicePanel();
    renderStatus("Dictation failed to start");
  }
}

function stopVoiceRecognitionInstance() {
  if (!voiceRecognition) {
    return;
  }
  try {
    voiceRecognition.onstart = null;
    voiceRecognition.onresult = null;
    voiceRecognition.onerror = null;
    voiceRecognition.onend = null;
    voiceRecognition.stop();
  } catch {
    // Ignore repeated stop attempts.
  } finally {
    voiceRecognition = null;
  }
}

function stopVoiceDictation() {
  if (state.voice.status !== "listening") {
    return;
  }
  state.voice.status = "idle";
  state.voice.interimText = "";
  stopVoiceRecognitionInstance();
  renderVoicePanel();
  renderStatus("Dictation stopped");
  void saveCheckpointToWorkspace("dictation-stop", { silent: true });
}

async function applyFocusPadToCodex() {
  const frame = currentFrame();
  if (state.focusApplyInFlight) {
    return;
  }
  state.focusApplyInFlight = true;
  state.suppressOutputCheckpointUntil = Date.now() + 7000;
  renderFocusPad();
  renderStatus("Saving Workbench handoff...");

  try {
    if (!frame.objective.trim()) {
      frame.objective =
        "Use this Workbench sketch and voice context to adjust the current design.";
    }
    if (!frame.layout.trim()) {
      frame.layout =
        "Interpret the rough boxes, lines, arrows, labels, and spoken notes as placement instructions.";
    }
    persistState();
    const exportResult = await freezeFrame(true, {
      reason: "focus-apply",
      status: "Workbench checkpoint saved",
    });
    if (exportResult) {
      state.focusLastAppliedText =
        "Applied. The latest sketch + voice checkpoint is ready for Codex.";
      dom.workspaceStatus.textContent =
        "Workbench applied. Ask Codex to use the latest Canvax checkpoint.";
      renderStatus("Workbench checkpoint ready for Codex");
    } else {
      state.focusLastAppliedText =
        "Saved locally, but workspace sync did not finish. Try Apply again.";
      renderStatus("Workbench saved locally, but workspace sync did not finish");
    }
  } finally {
    state.focusApplyInFlight = false;
    renderFocusPad();
  }
}

function humanizeVoiceError(code) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was blocked. Allow mic access for this browser or use Manual voice note.";
    case "audio-capture":
      return "No microphone input was available. Check the selected input device or use Manual voice note.";
    case "network":
      return "Browser speech recognition hit a network problem. Try again or use Manual voice note.";
    case "no-speech":
      return "No speech was detected. Try again and keep speaking, or use Manual voice note.";
    default:
      return "Dictation stopped unexpectedly. Use Manual voice note if browser speech is unreliable here.";
  }
}

function addManualVoiceNote() {
  const text = dom.voiceManualInput.value.trim();
  if (!text) {
    return;
  }
  addVoiceSegment(text, { provider: "manual-note" });
  state.voice.manualDraft = "";
  dom.voiceManualInput.value = "";
  renderVoicePanel();
  void saveCheckpointToWorkspace("voice-note", { silent: true });
}

function clearVoiceScope() {
  const frame = currentFrame();
  const before = state.voice.segments.length;
  state.voice.segments = state.voice.segments.filter((segment) => {
    if (state.voice.scope === "session") {
      return segment.scope !== "session";
    }
    return segment.frameId !== frame.id;
  });
  if (state.voice.segments.length === before) {
    return;
  }
  persistState();
  renderVoicePanel();
  renderSpec();
  void saveExportToWorkspace({ silent: true });
  renderStatus(
    state.voice.scope === "session"
      ? "Board voice notes cleared"
      : `${frame.title} voice notes cleared`,
  );
}

function addVoiceSegment(text, { provider = "manual-note" } = {}) {
  const content = String(text || "").trim();
  if (!content) {
    return;
  }
  const frame = currentFrame();
  state.voice.segments.unshift(
    normalizeVoiceSegment({
      id: uid("voice"),
      text: content,
      at: new Date().toISOString(),
      scope: state.voice.scope,
      provider,
      frameId: frame?.id || "",
      frameTitle: frame?.title || "",
    }),
  );
  state.voice.segments = state.voice.segments.slice(0, 120);
  state.voice.interimText = "";
  state.voice.error = "";
  persistState();
  renderVoicePanel();
  renderSpec();
  void saveExportToWorkspace({ silent: true });
  renderStatus(
    state.voice.scope === "session"
      ? "Board voice note captured"
      : `${frame.title} voice note captured`,
  );
}

function renderCaptures() {
  const frame = currentFrame();
  dom.captureCount.textContent = `${frame.captures.length} saved`;
  dom.clearCaptures.disabled = frame.captures.length === 0;
  dom.captureList.innerHTML = frame.captures.length
    ? frame.captures
        .map(
          (capture, index) => `
            <div class="capture-card">
              <div class="capture-thumb">${capture.image ? `<img src="${capture.image}" alt="" />` : ""}</div>
              <div class="capture-meta">
                <strong>Freeze ${index + 1}</strong>
                <span>${timeLabel(capture.at)}</span>
              </div>
              <button class="capture-remove" type="button" data-remove-capture-id="${capture.id}" title="Delete this saved capture">Remove</button>
            </div>
          `,
        )
        .join("")
    : `<p class="helper-text">No captures yet. Draw, pause for two seconds, or press “Freeze frame”.</p>`;
}

function renderSpec() {
  dom.specOutput.value = buildPromptMarkdown();
}

function renderCodexOutput() {
  const manifest = state.serverStatus.previewManifest || null;
  const target = resolveManifestTargetEntry(manifest, state.activeFrameId);
  const artifacts = collectManifestArtifacts(manifest);
  const changes = collectManifestChanges(manifest);
  const notes = compactDisplayText(
    typeof manifest?.notes === "string" ? manifest.notes : "",
    360,
  );
  const targetHref = target?.resolvedUrl || target?.url || "";
  const freshness = describeManifestFreshness(target, currentFrame());
  const refinement = describeTargetRefinement(target);
  const codexManifestSource =
    typeof manifest?.source === "string" ? manifest.source : "";

  dom.codexOpenTarget.hidden = !targetHref;
  dom.codexOpenTarget.href = targetHref || "#";
  dom.codexClearOutput.disabled = !(
    codexManifestSource.includes("codex") || changes.length
  );
  dom.codexPublishOutput.disabled = false;

  if (!target) {
    dom.codexOutputSummary.className = "codex-output-summary empty-state";
    dom.codexOutputSummary.textContent =
      "No Codex output is attached to this board yet.";
  } else {
    const routeLabel = target.previewPath || targetHref || "Connected target";
    const targetKind =
      target.type === "generated-screen-preview"
        ? "generated screen"
        : target.type === "materialized-preview"
          ? "materialized"
          : target.type || "preview";
    dom.codexOutputSummary.className = "codex-output-summary";
    dom.codexOutputSummary.innerHTML = `
      <div class="artifact-item-row">
        <strong>${escapeHtml(target.label || "Connected implementation")}</strong>
        <span class="artifact-kind">${escapeHtml(targetKind)}</span>
      </div>
      <p class="artifact-meta">${escapeHtml(target.source || "manifest")} • ${escapeHtml(routeLabel)}</p>
      ${target.description ? `<p class="artifact-copy">${escapeHtml(target.description)}</p>` : ""}
      ${freshness ? `<p class="artifact-copy">${escapeHtml(freshness)}</p>` : ""}
      ${refinement ? `<p class="artifact-copy">${escapeHtml(refinement)}</p>` : ""}
      ${notes ? `<p class="artifact-copy">${escapeHtml(notes)}</p>` : ""}
    `;
  }

  renderArtifactInbox({
    element: dom.artifactInbox,
    countElement: dom.artifactInboxCount,
    items: artifacts,
    emptyMessage: "No generated artifacts yet.",
    fallbackKind: "artifact",
  });
  renderArtifactInbox({
    element: dom.changedFileList,
    countElement: dom.changedFileCount,
    items: changes,
    emptyMessage: "No changed files attached yet.",
    fallbackKind: "updated",
  });
  renderOutputActivity();
  renderRewriteQueue();
}

function renderOutputActivity() {
  const items = Array.isArray(state.serverStatus.outputActivity)
    ? state.serverStatus.outputActivity
    : [];
  dom.outputActivityCount.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;
  if (!items.length) {
    dom.outputActivityList.className = "artifact-inbox empty-state";
    dom.outputActivityList.textContent =
      "No live output activity yet. Keep sketching or let Codex change files and this feed will update.";
    return;
  }

  dom.outputActivityList.className = "artifact-inbox";
  dom.outputActivityList.innerHTML = items
    .map(
      (item) => `
        <article class="artifact-item output-activity-item">
          <div class="artifact-item-row">
            <strong>${escapeHtml(item.summary || "Output update")}</strong>
            <span class="artifact-kind subtle">${escapeHtml(timeLabel(item.at))}</span>
          </div>
          ${item.detail ? `<p class="artifact-meta">${escapeHtml(item.detail)}</p>` : ""}
        </article>
      `,
    )
    .join("");
}

function renderRewriteQueue() {
  const items = buildRewriteQueue();
  dom.rewriteQueueCount.textContent = `${items.length} ${items.length === 1 ? "frame" : "frames"}`;
  if (!items.length) {
    dom.rewriteQueueList.className = "artifact-inbox empty-state";
    dom.rewriteQueueList.textContent =
      "No frames currently need rewrite attention.";
    return;
  }

  dom.rewriteQueueList.className = "artifact-inbox";
  dom.rewriteQueueList.innerHTML = items
    .map(
      (item) => `
        <article class="artifact-item output-activity-item">
          <div class="artifact-item-row">
            <strong>${escapeHtml(item.title || "Untitled frame")}</strong>
            <span class="artifact-kind subtle">${escapeHtml(item.label)}</span>
          </div>
          ${item.detail ? `<p class="artifact-meta">${escapeHtml(item.detail)}</p>` : ""}
        </article>
      `,
    )
    .join("");
}

function renderCheckpointPanel() {
  const history = state.serverStatus.checkpointHistory || { items: [] };
  const items = Array.isArray(history.items) ? history.items : [];
  dom.checkpointCount.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;
  dom.checkpointPush.disabled = false;

  if (!items.length) {
    dom.checkpointList.className = "checkpoint-list empty-state";
    dom.checkpointList.textContent = "No checkpoints saved yet.";
    return;
  }

  dom.checkpointList.className = "checkpoint-list";
  dom.checkpointList.innerHTML = items
    .map((item) => {
      const links = [
        item.checkpointUrl
          ? `<a class="ghost-link-button artifact-link" href="${escapeHtml(item.checkpointUrl)}" target="_blank" rel="noopener noreferrer">Open checkpoint</a>`
          : "",
        item.jsonUrl
          ? `<a class="ghost-link-button artifact-link" href="${escapeHtml(item.jsonUrl)}" target="_blank" rel="noopener noreferrer">Open export</a>`
          : "",
      ]
        .filter(Boolean)
        .join("");
      const meta = [
        checkpointReasonLabel(item.reason),
        item.frameTitle || "Whole board",
        item.voiceSegmentCount ? `${item.voiceSegmentCount} voice` : "No voice",
        item.captureCount ? `${item.captureCount} captures` : "No captures",
      ].join(" • ");

      return `
        <article class="artifact-item checkpoint-item">
          <div class="artifact-item-row">
            <strong>${escapeHtml(item.label || checkpointReasonLabel(item.reason))}</strong>
            <span class="artifact-kind subtle">${escapeHtml(timeLabel(item.savedAt))}</span>
          </div>
          <p class="artifact-meta">${escapeHtml(meta)}</p>
          ${
            item.targetLabel
              ? `<p class="artifact-copy">${escapeHtml(`Target: ${item.targetLabel}`)}</p>`
              : ""
          }
          ${links ? `<div class="button-row tight">${links}</div>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderArtifactInbox({
  element,
  countElement,
  items,
  emptyMessage,
  fallbackKind,
}) {
  countElement.textContent = `${items.length} ${items.length === 1 ? "file" : "files"}`;
  if (!items.length) {
    element.className = "artifact-inbox empty-state";
    element.textContent = emptyMessage;
    return;
  }

  element.className = "artifact-inbox";
  element.innerHTML = items
    .map((item) => {
      const href = item.resolvedUrl || item.url || "";
      const kind = item.kind || fallbackKind;
      const secondary = [
        item.path,
        item.summary || item.description,
        item.status,
      ]
        .filter(Boolean)
        .join(" • ");
      return `
        <article class="artifact-item">
          <div class="artifact-item-row">
            <strong>${escapeHtml(item.label || item.path || "Untitled")}</strong>
            <span class="artifact-kind subtle">${escapeHtml(kind)}</span>
          </div>
          ${secondary ? `<p class="artifact-meta">${escapeHtml(secondary)}</p>` : ""}
          ${href ? `<a class="ghost-link-button artifact-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">Open</a>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderServerStatus() {
  const manifest = state.serverStatus.previewManifest || null;
  const target = resolveManifestTargetEntry(manifest, state.activeFrameId);
  const artifacts = collectManifestArtifacts(manifest);
  const changes = collectManifestChanges(manifest);
  const freshness = describeManifestFreshness(target, currentFrame());
  const refinement = describeTargetRefinement(target);
  const workspaceFollowText = describeWorkspaceFollow(
    state.serverStatus.workspaceFollow,
  );
  dom.transportStatus.textContent = describeTransportSummary();

  dom.workspaceFollowStatus.hidden = !workspaceFollowText;
  dom.workspaceFollowStatus.textContent = workspaceFollowText;

  if (!manifest) {
    dom.analyzeStatus.textContent =
      "Canvax keeps a live export for Codex. Use the canvas, pause for autosnap, then ask Codex to read the latest Canvax export.";
    return;
  }

  if (target && (artifacts.length || changes.length)) {
    const linkedText = `${artifacts.length} artifact${artifacts.length === 1 ? "" : "s"} and ${changes.length} changed file${changes.length === 1 ? "" : "s"} are linked to this board.`;
    dom.analyzeStatus.textContent = freshness
      ? `${freshness} ${refinement ? `${refinement} ` : ""}${linkedText}`
      : `Codex output is attached: ${refinement ? `${refinement} ` : ""}${linkedText}`;
    return;
  }

  if (target) {
    dom.analyzeStatus.textContent = refinement
      ? `${refinement} Open the connected target directly or use Preview to compare it against the sketch.`
      : "A connected implementation target is attached to this board. Open it directly or use Preview to compare it against the sketch.";
    return;
  }

  dom.analyzeStatus.textContent =
    "Canvax keeps a live export for Codex. Use the canvas, pause for autosnap, then ask Codex to read the latest Canvax export.";
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
  const targetLabel =
    typeof workspaceFollow.frameTitle === "string" &&
    workspaceFollow.frameTitle.trim()
      ? workspaceFollow.frameTitle.trim()
      : "the current board";

  if (count > 0) {
    return `Live workspace follow is mirroring ${count} current git change${count === 1 ? "" : "s"} for ${targetLabel}.`;
  }

  return `Live workspace follow is on. The workspace is currently clean for ${targetLabel}.`;
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

async function maybeCheckpointOutputUpdate(previousDigest, nextDigest) {
  if (
    !previousDigest ||
    !nextDigest ||
    previousDigest.digest === nextDigest.digest ||
    state.outputCheckpointInFlight ||
    Date.now() < (state.suppressOutputCheckpointUntil || 0)
  ) {
    return;
  }

  if (
    nextDigest.mode !== "target-connected" &&
    nextDigest.mode !== "context-only"
  ) {
    return;
  }

  const currentFrameLabel = currentFrame()?.title || "the current board";
  state.outputCheckpointInFlight = true;
  try {
    await saveCheckpointToWorkspace("output-update", {
      silent: true,
      exportResult: buildExistingExportReference(),
      label: "Output update",
      note:
        nextDigest.summary ||
        `Connected output changed while working on ${currentFrameLabel}.`,
    });
  } finally {
    state.outputCheckpointInFlight = false;
  }
}

function renderFlowBoard() {
  const layout = computeFlowSurfaceSize();
  dom.flowSurface.style.width = `${layout.width}px`;
  dom.flowSurface.style.height = `${layout.height}px`;
  dom.flowBoard.style.width = `${layout.width}px`;
  dom.flowBoard.style.height = `${layout.height}px`;
  dom.flowSvg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
  dom.flowSvg.setAttribute("width", String(layout.width));
  dom.flowSvg.setAttribute("height", String(layout.height));

  dom.flowBoard.innerHTML = state.frames
    .map((frame) => {
      const viewport = viewportPresets[frame.viewport];
      const thumbnail = frameThumbnailDataUrl(frame, {
        maxWidth: 420,
        mime: "image/jpeg",
        quality: 0.84,
      });
      const classes = [
        "flow-card-node",
        frame.id === state.activeFrameId ? "active" : "",
        frame.id === state.entryFrameId ? "entry" : "",
        frame.id === state.pendingConnectionFromFrameId ? "pending" : "",
        state.flowDrag?.frameId === frame.id ? "dragging" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <button
          class="${classes}"
          data-flow-frame-id="${frame.id}"
          style="left:${frame.flowPosition.x}px; top:${frame.flowPosition.y}px;"
        >
          <div class="flow-card-header" data-flow-drag="${frame.id}">
            <div class="flow-card-title">
              <strong>${escapeHtml(frame.title)}</strong>
              <span>${viewport.label} • ${frame.captures.length} capture${frame.captures.length === 1 ? "" : "s"}</span>
            </div>
            ${frame.id === state.entryFrameId ? '<span class="flow-card-badge">Entry</span>' : ""}
          </div>
          <div class="flow-card-preview">
            ${thumbnail ? `<img src="${thumbnail}" alt="" />` : ""}
          </div>
          <div class="flow-card-footer">
            <span>${countFrameConnections(frame.id)} linked</span>
            <span
              class="flow-link-handle"
              role="button"
              tabindex="0"
              data-flow-link-handle="${frame.id}"
              aria-label="Start a link from ${escapeHtml(frame.title)}"
            >
              +
            </span>
          </div>
        </button>
      `;
    })
    .join("");

  dom.flowSvg.innerHTML = buildFlowSvgMarkup(layout.width, layout.height);
  dom.flowStatus.textContent = state.pendingConnectionFromFrameId
    ? `Linking from ${frameTitleById(state.pendingConnectionFromFrameId)}. Click another card to finish the connection.`
    : "Drag cards to arrange screens. Pull from the dot on a frame to connect screens like a lightweight prototype map.";
}

function renderFlowInspector() {
  dom.flowCount.textContent = `${state.connections.length} ${state.connections.length === 1 ? "link" : "links"}`;
  dom.connectionSelect.disabled = state.connections.length === 0;

  if (!state.connections.length) {
    dom.connectionSelect.innerHTML = `<option value="">No links yet</option>`;
  } else {
    dom.connectionSelect.innerHTML = [
      `<option value="">Select a link</option>`,
      ...state.connections.map((connection) => {
        const selected =
          connection.id === state.selectedConnectionId ? "selected" : "";
        return `<option value="${connection.id}" ${selected}>${escapeHtml(frameTitleById(connection.fromFrameId))} → ${escapeHtml(frameTitleById(connection.toFrameId))}</option>`;
      }),
    ].join("");
  }

  const connection = currentConnection();
  dom.connectionLabel.disabled = !connection;
  dom.connectionNotes.disabled = !connection;
  dom.deleteConnection.disabled = !connection;
  dom.connectionLabel.value = connection?.label || "";
  dom.connectionNotes.value = connection?.notes || "";

  dom.flowList.innerHTML = state.connections.length
    ? state.connections
        .map((connection) => {
          const active =
            connection.id === state.selectedConnectionId ? "active" : "";
          return `
            <div class="flow-list-item ${active}">
              <button class="flow-list-main" data-flow-connection-id="${connection.id}">
                <div>
                  <strong>${escapeHtml(frameTitleById(connection.fromFrameId))} → ${escapeHtml(frameTitleById(connection.toFrameId))}</strong>
                  <span>${escapeHtml(connection.label || "continue")}</span>
                </div>
                <span>${escapeHtml(connection.notes || "No note")}</span>
              </button>
              <button
                class="flow-list-remove"
                data-flow-remove-connection-id="${connection.id}"
                aria-label="Delete link from ${escapeHtml(frameTitleById(connection.fromFrameId))} to ${escapeHtml(frameTitleById(connection.toFrameId))}"
                title="Delete link"
              >
                Remove
              </button>
            </div>
          `;
        })
        .join("")
    : `<p class="helper-text">No links yet. Switch to Flow view, then pull from the dot on a card to connect frames.</p>`;
}

function renderBrushSizeChip() {
  const previewSize = Math.max(6, Math.min(24, state.size));
  dom.sizePreviewDot.style.width = `${previewSize}px`;
  dom.sizePreviewDot.style.height = `${previewSize}px`;
  if (state.tool === "erase") {
    dom.sizePreviewDot.style.background = "transparent";
    dom.sizePreviewDot.style.border = "2px solid rgba(24, 17, 14, 0.58)";
    dom.sizePreviewDot.style.opacity = "1";
    return;
  }
  dom.sizePreviewDot.style.border = "none";
  dom.sizePreviewDot.style.background = state.color;
  dom.sizePreviewDot.style.opacity = state.tool === "marker" ? "0.42" : "0.92";
}

function renderBrushPreview() {
  const canShowPreview =
    state.viewMode === "frame" &&
    state.brushPreview.visible &&
    toolUsesBrushPreview(state.tool);
  dom.brushPreview.hidden = !canShowPreview;
  dom.canvas.classList.toggle("preview-cursor", canShowPreview);

  if (!canShowPreview) {
    return;
  }

  const size = Math.max(8, state.size);
  dom.brushPreview.style.width = `${size}px`;
  dom.brushPreview.style.height = `${size}px`;
  dom.brushPreview.style.transform = `translate(${state.brushPreview.x}px, ${state.brushPreview.y}px) translate(-50%, -50%)`;
  dom.brushPreviewText.textContent = `${state.size} px`;

  if (state.tool === "erase") {
    dom.brushPreview.style.background = "rgba(255, 255, 255, 0.08)";
    dom.brushPreview.style.borderColor = "rgba(24, 17, 14, 0.62)";
    return;
  }

  dom.brushPreview.style.borderColor =
    state.color === "#ffffff" ? "rgba(24, 17, 14, 0.42)" : state.color;
  dom.brushPreview.style.background = hexToRgba(
    state.color,
    state.tool === "marker" ? 0.28 : 0.22,
  );
}

function computeFlowSurfaceSize() {
  const bounds = state.frames.reduce(
    (accumulator, frame) => {
      return {
        width: Math.max(
          accumulator.width,
          frame.flowPosition.x + FLOW_CARD_WIDTH + FLOW_SURFACE_PADDING,
        ),
        height: Math.max(
          accumulator.height,
          frame.flowPosition.y + FLOW_CARD_HEIGHT + FLOW_SURFACE_PADDING,
        ),
      };
    },
    {
      width: 1200,
      height: 820,
    },
  );

  return bounds;
}

function buildFlowSvgMarkup(width, height) {
  const connectionMarkup = state.connections
    .map((connection) => {
      const source = frameById(connection.fromFrameId);
      const target = frameById(connection.toFrameId);
      if (!source || !target) {
        return "";
      }

      const { start, end } = connectionAnchors(source, target);
      const path = buildFlowPath(start, end);
      const midpoint = connectionMidpoint(start, end);
      const label = escapeHtml(connection.label || "continue");
      const labelWidth = Math.max(64, label.length * 8 + 18);
      const labelX = midpoint.x - labelWidth / 2;
      const labelY = midpoint.y - 14;
      const active =
        connection.id === state.selectedConnectionId ? "selected" : "";

      return `
        <g data-flow-connection-id="${connection.id}">
          <path class="flow-link-hit" data-flow-connection-id="${connection.id}" d="${path}"></path>
          <path class="flow-link-path ${active}" marker-end="url(#flow-arrow)" d="${path}"></path>
          <rect class="flow-link-label-rect" x="${labelX}" y="${labelY}" width="${labelWidth}" height="28" rx="14"></rect>
          <text class="flow-link-label-text" x="${midpoint.x}" y="${midpoint.y + 4}" text-anchor="middle">${label}</text>
        </g>
      `;
    })
    .join("");

  const draftMarkup = state.flowConnectionDraft
    ? (() => {
        const source = frameById(state.flowConnectionDraft.fromFrameId);
        if (!source) {
          return "";
        }
        const start = connectionHandlePosition(source);
        const path = buildFlowPath(start, state.flowConnectionDraft.pointer);
        return `<path class="flow-link-path selected" d="${path}" marker-end="url(#flow-arrow)"></path>`;
      })()
    : "";

  return `
    <defs>
      <marker id="flow-arrow" markerWidth="14" markerHeight="14" refX="10" refY="7" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L14,7 L0,14 z" fill="rgba(24, 17, 14, 0.55)"></path>
      </marker>
    </defs>
    <rect width="${width}" height="${height}" fill="transparent"></rect>
    ${connectionMarkup}
    ${draftMarkup}
  `;
}

function frameById(frameId) {
  return state.frames.find((frame) => frame.id === frameId) || null;
}

function frameTitleById(frameId) {
  return frameById(frameId)?.title || "Unknown frame";
}

function countFrameConnections(frameId) {
  return state.connections.filter(
    (connection) =>
      connection.fromFrameId === frameId || connection.toFrameId === frameId,
  ).length;
}

function connectionHandlePosition(frame) {
  return {
    x: frame.flowPosition.x + FLOW_CARD_WIDTH,
    y: frame.flowPosition.y + FLOW_CARD_HEIGHT - 26,
  };
}

function connectionAnchors(source, target) {
  const sourceCenterX = source.flowPosition.x + FLOW_CARD_WIDTH / 2;
  const sourceCenterY = source.flowPosition.y + FLOW_CARD_HEIGHT / 2;
  const targetCenterX = target.flowPosition.x + FLOW_CARD_WIDTH / 2;
  const targetCenterY = target.flowPosition.y + FLOW_CARD_HEIGHT / 2;
  const horizontal =
    Math.abs(targetCenterX - sourceCenterX) >=
    Math.abs(targetCenterY - sourceCenterY);

  if (horizontal) {
    return {
      start: {
        x:
          targetCenterX >= sourceCenterX
            ? source.flowPosition.x + FLOW_CARD_WIDTH
            : source.flowPosition.x,
        y: sourceCenterY,
      },
      end: {
        x:
          targetCenterX >= sourceCenterX
            ? target.flowPosition.x
            : target.flowPosition.x + FLOW_CARD_WIDTH,
        y: targetCenterY,
      },
    };
  }

  return {
    start: {
      x: sourceCenterX,
      y:
        targetCenterY >= sourceCenterY
          ? source.flowPosition.y + FLOW_CARD_HEIGHT
          : source.flowPosition.y,
    },
    end: {
      x: targetCenterX,
      y:
        targetCenterY >= sourceCenterY
          ? target.flowPosition.y
          : target.flowPosition.y + FLOW_CARD_HEIGHT,
    },
  };
}

function buildFlowPath(start, end) {
  const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  const handle = Math.max(
    72,
    Math.min(
      220,
      (Math.abs(end.x - start.x) + Math.abs(end.y - start.y)) * 0.35,
    ),
  );

  if (horizontal) {
    const direction = end.x >= start.x ? 1 : -1;
    return `M ${start.x} ${start.y} C ${start.x + handle * direction} ${start.y}, ${end.x - handle * direction} ${end.y}, ${end.x} ${end.y}`;
  }

  const direction = end.y >= start.y ? 1 : -1;
  return `M ${start.x} ${start.y} C ${start.x} ${start.y + handle * direction}, ${end.x} ${end.y - handle * direction}, ${end.x} ${end.y}`;
}

function connectionMidpoint(start, end) {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
}

function toolUsesBrushPreview(tool) {
  return tool !== "label" && tool !== "select";
}

function hexToRgba(hex, alpha) {
  const input = hex.replace("#", "");
  const normalized =
    input.length === 3
      ? input
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : input;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function renderUndoRedo() {
  const { canUndo, canRedo } = currentUndoRedoState();
  dom.undoButton.disabled = !canUndo;
  dom.redoButton.disabled = !canRedo;
  dom.focusUndo.disabled = !canUndo;
  dom.focusRedo.disabled = !canRedo;
}

function currentUndoRedoState() {
  const frame = currentFrame();
  const history = ensureHistory(frame.id);
  const annotationHistory = ensureOutputAnnotationHistory(frame.id);
  return {
    canUndo: history.past.length > 0 || annotationHistory.past.length > 0,
    canRedo: history.future.length > 0 || annotationHistory.future.length > 0,
  };
}

function syncCanvasSize() {
  const frame = currentFrame();
  const viewport = viewportPresets[frame.viewport];
  if (
    dom.canvas.width !== viewport.width ||
    dom.canvas.height !== viewport.height
  ) {
    dom.canvas.width = viewport.width;
    dom.canvas.height = viewport.height;
  }
}

function renderCanvas() {
  syncCanvasSize();
  const frame = currentFrame();
  dom.canvas.classList.toggle("select-mode", state.tool === "select");
  dom.canvas.classList.toggle(
    "select-hover",
    state.tool === "select" && Boolean(state.hoverElementId),
  );
  dom.canvas.classList.toggle(
    "select-dragging",
    state.tool === "select" && Boolean(state.elementTransform),
  );
  dom.deviceShell.classList.toggle("space-pan", state.spacePressed);
  dom.deviceShell.classList.toggle("is-panning", Boolean(state.shellPan));
  const viewport = viewportPresets[frame.viewport];
  dom.canvas.style.width = `${Math.round(viewport.width * state.zoom)}px`;
  dom.canvas.style.height = `${Math.round(viewport.height * state.zoom)}px`;
  const ctx = dom.canvas.getContext("2d");
  drawScene(
    ctx,
    frame,
    dom.canvas.width,
    dom.canvas.height,
    1,
    state.draftElement,
  );
}

function drawScene(ctx, frame, width, height, scale = 1, draftElement = null) {
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#f7efdf");
  gradient.addColorStop(0.65, "#f3e6d2");
  gradient.addColorStop(1, "#ead7c1");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.18;
  const bgImage = getCachedImage(frame.backgroundImage);
  if (bgImage) {
    drawCoverImage(ctx, bgImage, width, height);
  }
  ctx.restore();

  if (state.grid) {
    drawGrid(ctx, frame.viewport, width, height);
  }

  drawFrameInkLayer(ctx, frame, width, height, scale, draftElement);

  if (state.elementTransform?.mode === "lasso") {
    drawLassoOverlay(ctx, state.elementTransform, scale);
  }

  const selectedElements = currentSelectedElements(frame);
  if (
    selectedElements.length &&
    state.viewMode === "frame" &&
    (state.tool === "select" || state.elementTransform)
  ) {
    selectedElements.forEach((element) =>
      drawSelectionOverlay(ctx, element, scale, selectedElements.length === 1),
    );
    if (selectedElements.length > 1) {
      const combinedBounds = unionBounds(
        selectedElements
          .map((element) => getElementBounds(element, frame))
          .filter(Boolean),
      );
      if (combinedBounds) {
        drawSelectionGroupOverlay(ctx, combinedBounds, scale);
      }
    }
  }
}

function drawGrid(ctx, viewportId, width, height) {
  const viewport = viewportPresets[viewportId];
  const columns = viewport.columns;
  const step = viewportId === "mobile" ? 40 : 72;
  ctx.save();
  ctx.strokeStyle = "rgba(24, 17, 14, 0.08)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }

  const gutter = width * 0.06;
  const usableWidth = width - gutter * 2;
  const columnWidth = usableWidth / columns;
  ctx.strokeStyle = "rgba(255, 93, 58, 0.22)";
  ctx.setLineDash([10, 10]);
  for (let column = 0; column <= columns; column += 1) {
    const x = gutter + columnWidth * column;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFrameInkLayer(ctx, frame, width, height, scale, draftElement) {
  if (inkLayerCanvas.width !== width || inkLayerCanvas.height !== height) {
    inkLayerCanvas.width = width;
    inkLayerCanvas.height = height;
  }
  const inkContext = inkLayerCanvas.getContext("2d");
  inkContext.clearRect(0, 0, width, height);

  frame.elements.forEach((element) =>
    drawElement(inkContext, element, scale, false, frame),
  );

  if (draftElement) {
    drawElement(inkContext, draftElement, scale, true, frame);
  }

  ctx.drawImage(inkLayerCanvas, 0, 0);
}

function drawElement(
  ctx,
  element,
  scale = 1,
  isDraft = false,
  frame = currentFrame(),
) {
  const isEraser = isEraserElement(element);
  const renderColor = isEraser
    ? ERASER_RENDER_COLOR
    : element.color || palette[0];
  ctx.save();
  ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
  ctx.globalAlpha = isEraser ? 1 : (element.alpha ?? 1);
  ctx.strokeStyle = renderColor;
  ctx.fillStyle = renderColor;
  ctx.lineWidth = Math.max(1, (element.size || 1) * scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (element.type === "path") {
    drawPath(ctx, element, scale);
  }

  if (element.type === "line") {
    ctx.beginPath();
    ctx.moveTo(element.start.x * scale, element.start.y * scale);
    ctx.lineTo(element.end.x * scale, element.end.y * scale);
    ctx.stroke();
  }

  if (element.type === "rect") {
    const left = Math.min(element.start.x, element.end.x) * scale;
    const top = Math.min(element.start.y, element.end.y) * scale;
    const boxWidth = Math.abs(element.end.x - element.start.x) * scale;
    const boxHeight = Math.abs(element.end.y - element.start.y) * scale;
    ctx.strokeRect(left, top, boxWidth, boxHeight);
  }

  if (element.type === "ellipse") {
    const centerX = ((element.start.x + element.end.x) / 2) * scale;
    const centerY = ((element.start.y + element.end.y) / 2) * scale;
    const radiusX = (Math.abs(element.end.x - element.start.x) / 2) * scale;
    const radiusY = (Math.abs(element.end.y - element.start.y) / 2) * scale;
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      centerY,
      Math.max(1, radiusX),
      Math.max(1, radiusY),
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  if (element.type === "arrow") {
    drawArrow(ctx, element, scale);
  }

  if (element.type === "label") {
    const fontSize = Math.max(18, (element.size || 18) * scale);
    const paddingX = 12 * scale;
    const paddingY = 8 * scale;
    const position = resolveLabelPosition(element, frame);
    ctx.font = `600 ${fontSize}px "Avenir Next", sans-serif`;
    const metrics = ctx.measureText(element.text);
    const x = position.x * scale;
    const y = position.y * scale;
    const width = metrics.width + paddingX * 2;
    const height = fontSize + paddingY * 2;
    ctx.fillStyle = "rgba(255, 250, 244, 0.92)";
    roundRect(ctx, x, y - height + paddingY, width, height, 18 * scale);
    ctx.fill();
    ctx.strokeStyle = element.color;
    ctx.lineWidth = Math.max(2, 2 * scale);
    ctx.stroke();
    ctx.fillStyle = element.color;
    ctx.fillText(element.text, x + paddingX, y - paddingY);
  }

  if (isDraft) {
    ctx.globalAlpha = 0.8;
  }

  ctx.restore();
}

function drawSelectionOverlay(ctx, element, scale = 1, showHandles = true) {
  const bounds = getElementBounds(element);
  if (!bounds) {
    return;
  }

  const handleSize = SELECTION_HANDLE_SIZE * scale;
  const handles = selectionHandles(bounds, scale);

  ctx.save();
  ctx.strokeStyle = "rgba(12, 141, 123, 0.92)";
  ctx.fillStyle = "rgba(12, 141, 123, 0.14)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(
    bounds.left * scale,
    bounds.top * scale,
    bounds.width * scale,
    bounds.height * scale,
  );
  ctx.setLineDash([]);
  ctx.fillRect(
    bounds.left * scale,
    bounds.top * scale,
    bounds.width * scale,
    bounds.height * scale,
  );

  if (showHandles) {
    ctx.fillStyle = "#fff8f5";
    handles.forEach((handle) => {
      ctx.beginPath();
      ctx.rect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize,
      );
      ctx.fill();
      ctx.stroke();
    });
  }
  ctx.restore();
}

function drawSelectionGroupOverlay(ctx, bounds, scale = 1) {
  const handleSize = SELECTION_HANDLE_SIZE * scale;
  ctx.save();
  ctx.strokeStyle = "rgba(255, 93, 58, 0.88)";
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(
    bounds.left * scale,
    bounds.top * scale,
    bounds.width * scale,
    bounds.height * scale,
  );
  ctx.setLineDash([]);
  ctx.fillStyle = "#fff8f5";
  selectionHandles(bounds, scale).forEach((handle) => {
    ctx.beginPath();
    ctx.rect(
      handle.x - handleSize / 2,
      handle.y - handleSize / 2,
      handleSize,
      handleSize,
    );
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawLassoOverlay(ctx, transform, scale = 1) {
  const bounds = makeBounds(
    Math.min(transform.startPoint.x, transform.currentPoint.x),
    Math.min(transform.startPoint.y, transform.currentPoint.y),
    Math.max(transform.startPoint.x, transform.currentPoint.x),
    Math.max(transform.startPoint.y, transform.currentPoint.y),
  );
  ctx.save();
  ctx.strokeStyle = "rgba(35, 100, 170, 0.9)";
  ctx.fillStyle = "rgba(35, 100, 170, 0.12)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(
    bounds.left * scale,
    bounds.top * scale,
    bounds.width * scale,
    bounds.height * scale,
  );
  ctx.setLineDash([]);
  ctx.fillRect(
    bounds.left * scale,
    bounds.top * scale,
    bounds.width * scale,
    bounds.height * scale,
  );
  ctx.restore();
}

function drawPath(ctx, element, scale) {
  if (!element.points?.length) {
    return;
  }
  ctx.beginPath();
  ctx.moveTo(element.points[0].x * scale, element.points[0].y * scale);
  for (let index = 1; index < element.points.length; index += 1) {
    ctx.lineTo(
      element.points[index].x * scale,
      element.points[index].y * scale,
    );
  }
  if (element.points.length === 1) {
    ctx.lineTo(
      element.points[0].x * scale + 0.1,
      element.points[0].y * scale + 0.1,
    );
  }
  ctx.stroke();
}

function drawArrow(ctx, element, scale) {
  const fromX = element.start.x * scale;
  const fromY = element.start.y * scale;
  const toX = element.end.x * scale;
  const toY = element.end.y * scale;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLength = Math.max(12, 18 * scale);
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawCoverImage(ctx, image, width, height) {
  const imageRatio = image.width / image.height;
  const frameRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let offsetX = 0;
  let offsetY = 0;

  if (imageRatio > frameRatio) {
    drawHeight = height;
    drawWidth = height * imageRatio;
    offsetX = (width - drawWidth) / 2;
  } else {
    drawWidth = width;
    drawHeight = width / imageRatio;
    offsetY = (height - drawHeight) / 2;
  }

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function getElementBounds(element, frame = currentFrame()) {
  if (!element) {
    return null;
  }

  if (element.type === "path") {
    if (!element.points?.length) {
      return null;
    }
    const xs = element.points.map((point) => point.x);
    const ys = element.points.map((point) => point.y);
    const inset = Math.max(6, (element.size || 1) / 2);
    return makeBounds(
      Math.min(...xs) - inset,
      Math.min(...ys) - inset,
      Math.max(...xs) + inset,
      Math.max(...ys) + inset,
    );
  }

  if (
    element.type === "line" ||
    element.type === "arrow" ||
    element.type === "rect" ||
    element.type === "ellipse"
  ) {
    const inset = Math.max(6, (element.size || 1) / 2);
    return makeBounds(
      Math.min(element.start.x, element.end.x) - inset,
      Math.min(element.start.y, element.end.y) - inset,
      Math.max(element.start.x, element.end.x) + inset,
      Math.max(element.start.y, element.end.y) + inset,
    );
  }

  if (element.type === "label") {
    return labelBounds(element, frame);
  }

  return null;
}

function labelBounds(element, frame = currentFrame()) {
  const fontSize = Math.max(18, element.size || 18);
  const paddingX = 12;
  const paddingY = 8;
  const position = resolveLabelPosition(element, frame);
  measurementContext.font = `600 ${fontSize}px "Avenir Next", sans-serif`;
  const width =
    measurementContext.measureText(element.text || "").width + paddingX * 2;
  const height = fontSize + paddingY * 2;
  return makeBounds(
    position.x,
    position.y - height + paddingY,
    position.x + width,
    position.y + paddingY,
  );
}

function resolveLabelPosition(label, frame = currentFrame()) {
  if (!label.attachedTo) {
    return { x: label.x, y: label.y, attached: false };
  }

  const target = frame.elements.find(
    (element) => element.id === label.attachedTo,
  );
  if (!target || !label.anchor) {
    return { x: label.x, y: label.y, attached: false };
  }

  const bounds = getElementBounds(target, frame);
  if (!bounds) {
    return { x: label.x, y: label.y, attached: false };
  }

  return {
    x: bounds.left + bounds.width * label.anchor.xRatio,
    y: bounds.top + bounds.height * label.anchor.yRatio,
    attached: true,
  };
}

function makeBounds(left, top, right, bottom) {
  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function unionBounds(boundsList) {
  if (!boundsList.length) {
    return null;
  }

  return makeBounds(
    Math.min(...boundsList.map((bounds) => bounds.left)),
    Math.min(...boundsList.map((bounds) => bounds.top)),
    Math.max(...boundsList.map((bounds) => bounds.right)),
    Math.max(...boundsList.map((bounds) => bounds.bottom)),
  );
}

function selectionHandles(bounds, scale = 1) {
  return [
    { id: "nw", x: bounds.left * scale, y: bounds.top * scale },
    { id: "ne", x: bounds.right * scale, y: bounds.top * scale },
    { id: "se", x: bounds.right * scale, y: bounds.bottom * scale },
    { id: "sw", x: bounds.left * scale, y: bounds.bottom * scale },
  ];
}

function hitSelectionHandle(element, point) {
  const bounds = getElementBounds(element);
  if (!bounds) {
    return null;
  }

  const threshold = SELECTION_HANDLE_SIZE;
  return (
    selectionHandles(bounds).find(
      (handle) =>
        Math.abs(point.x - handle.x) <= threshold &&
        Math.abs(point.y - handle.y) <= threshold,
    ) || null
  );
}

function hitSelectionHandleFromBounds(bounds, point) {
  if (!bounds) {
    return null;
  }

  const threshold = SELECTION_HANDLE_SIZE;
  return (
    selectionHandles(bounds).find(
      (handle) =>
        Math.abs(point.x - handle.x) <= threshold &&
        Math.abs(point.y - handle.y) <= threshold,
    ) || null
  );
}

function hitTestElement(frame, point) {
  for (let index = frame.elements.length - 1; index >= 0; index -= 1) {
    const element = frame.elements[index];
    if (isEraserElement(element)) {
      continue;
    }
    if (isPointNearElement(element, point)) {
      return element;
    }
  }
  return null;
}

function selectionForElement(frame, element) {
  if (!element) {
    return [];
  }

  if (!element.groupId) {
    return [element.id];
  }

  return frame.elements
    .filter((candidate) => candidate.groupId === element.groupId)
    .map((candidate) => candidate.id);
}

function boundsIntersect(a, b) {
  return (
    a.left <= b.right &&
    a.right >= b.left &&
    a.top <= b.bottom &&
    a.bottom >= b.top
  );
}

function isPointNearElement(element, point) {
  const threshold = Math.max(8, (element.size || 1) + 4);
  const bounds = getElementBounds(element);
  if (!bounds) {
    return false;
  }

  if (element.type === "label" || element.type === "rect") {
    return pointInBounds(expandBounds(bounds, threshold), point);
  }

  if (element.type === "ellipse") {
    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;
    const radiusX = Math.max(1, bounds.width / 2 + threshold);
    const radiusY = Math.max(1, bounds.height / 2 + threshold);
    return (
      (point.x - centerX) ** 2 / radiusX ** 2 +
        (point.y - centerY) ** 2 / radiusY ** 2 <=
      1
    );
  }

  if (element.type === "line" || element.type === "arrow") {
    return distanceToSegment(point, element.start, element.end) <= threshold;
  }

  if (element.type === "path") {
    if (element.points.length === 1) {
      return distanceBetweenPoints(point, element.points[0]) <= threshold;
    }
    for (let index = 1; index < element.points.length; index += 1) {
      if (
        distanceToSegment(
          point,
          element.points[index - 1],
          element.points[index],
        ) <= threshold
      ) {
        return true;
      }
    }
    return false;
  }

  return pointInBounds(expandBounds(bounds, threshold), point);
}

function expandBounds(bounds, inset) {
  return makeBounds(
    bounds.left - inset,
    bounds.top - inset,
    bounds.right + inset,
    bounds.bottom + inset,
  );
}

function pointInBounds(bounds, point) {
  return (
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom
  );
}

function distanceBetweenPoints(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToSegment(point, start, end) {
  const segmentLengthSquared = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;
  if (segmentLengthSquared === 0) {
    return distanceBetweenPoints(point, start);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * (end.x - start.x) +
        (point.y - start.y) * (end.y - start.y)) /
        segmentLengthSquared,
    ),
  );
  const projection = {
    x: start.x + t * (end.x - start.x),
    y: start.y + t * (end.y - start.y),
  };
  return distanceBetweenPoints(point, projection);
}

function setLabelResolvedPosition(label, point, frame = currentFrame()) {
  label.x = point.x;
  label.y = point.y;

  if (!label.attachedTo) {
    return;
  }

  const target = frame.elements.find(
    (element) => element.id === label.attachedTo,
  );
  const bounds = target ? getElementBounds(target, frame) : null;
  if (!bounds || bounds.width === 0 || bounds.height === 0) {
    label.attachedTo = null;
    label.anchor = null;
    return;
  }

  label.anchor = {
    xRatio: Math.max(0, Math.min(1, (point.x - bounds.left) / bounds.width)),
    yRatio: Math.max(0, Math.min(1, (point.y - bounds.top) / bounds.height)),
  };
}

function syncAttachedLabels(frame, targetElementId) {
  frame.elements.forEach((element) => {
    if (element.type !== "label" || element.attachedTo !== targetElementId) {
      return;
    }

    const resolved = resolveLabelPosition(element, frame);
    element.x = resolved.x;
    element.y = resolved.y;
  });
}

function detachLabelsForElement(frame, targetElementId) {
  frame.elements.forEach((element) => {
    if (element.type !== "label" || element.attachedTo !== targetElementId) {
      return;
    }

    const resolved = resolveLabelPosition(element, frame);
    element.x = resolved.x;
    element.y = resolved.y;
    element.attachedTo = null;
    element.anchor = null;
  });
}

function translateElement(element, deltaX, deltaY) {
  if (element.type === "path") {
    element.points = element.points.map((point) => ({
      x: point.x + deltaX,
      y: point.y + deltaY,
    }));
    return;
  }

  if (element.type === "label") {
    const resolved = resolveLabelPosition(element);
    setLabelResolvedPosition(element, {
      x: resolved.x + deltaX,
      y: resolved.y + deltaY,
    });
    return;
  }

  element.start = {
    x: element.start.x + deltaX,
    y: element.start.y + deltaY,
  };
  element.end = {
    x: element.end.x + deltaX,
    y: element.end.y + deltaY,
  };
}

function resizeBoundsFromHandle(bounds, handleId, deltaX, deltaY) {
  const minimumSize = 18;
  let left = bounds.left;
  let top = bounds.top;
  let right = bounds.right;
  let bottom = bounds.bottom;

  if (handleId.includes("w")) {
    left = Math.min(bounds.left + deltaX, bounds.right - minimumSize);
  }
  if (handleId.includes("e")) {
    right = Math.max(bounds.right + deltaX, bounds.left + minimumSize);
  }
  if (handleId.includes("n")) {
    top = Math.min(bounds.top + deltaY, bounds.bottom - minimumSize);
  }
  if (handleId.includes("s")) {
    bottom = Math.max(bounds.bottom + deltaY, bounds.top + minimumSize);
  }

  return makeBounds(left, top, right, bottom);
}

function resizeElementToBounds(
  element,
  originalElement,
  originalBounds,
  nextBounds,
) {
  const scaleX =
    originalBounds.width === 0 ? 1 : nextBounds.width / originalBounds.width;
  const scaleY =
    originalBounds.height === 0 ? 1 : nextBounds.height / originalBounds.height;
  const mapPoint = (point) => ({
    x: nextBounds.left + (point.x - originalBounds.left) * scaleX,
    y: nextBounds.top + (point.y - originalBounds.top) * scaleY,
  });

  if (originalElement.type === "path") {
    element.points = originalElement.points.map(mapPoint);
    return;
  }

  if (originalElement.type === "label") {
    const originalPosition = resolveLabelPosition(originalElement);
    const anchor = mapPoint(originalPosition);
    setLabelResolvedPosition(element, anchor);
    element.size = Math.max(
      18,
      Math.round((originalElement.size || 18) * ((scaleX + scaleY) / 2)),
    );
    return;
  }

  element.start = mapPoint(originalElement.start);
  element.end = mapPoint(originalElement.end);
}

function onPointerDown(event) {
  if (state.spacePressed) {
    return;
  }
  updateBrushPreviewPosition(event);
  const frame = currentFrame();
  const point = pointFromEvent(event);

  if (state.tool === "select") {
    const selectedElements = currentSelectedElements(frame);
    const selectedElement =
      selectedElements.length === 1 ? selectedElements[0] : null;
    const selectionBounds =
      selectedElements.length > 1
        ? unionBounds(
            selectedElements
              .map((element) => getElementBounds(element, frame))
              .filter(Boolean),
          )
        : null;
    const multiHandle =
      selectedElements.length > 1 && !event.shiftKey
        ? hitSelectionHandleFromBounds(selectionBounds, point)
        : null;
    const singleHandle =
      selectedElement && !event.shiftKey
        ? hitSelectionHandle(selectedElement, point)
        : null;
    const handle = multiHandle || singleHandle;
    const hitElement = handle
      ? selectedElement || selectedElements[0]
      : hitTestElement(frame, point);

    if (!hitElement) {
      state.elementTransform = {
        pointerId: event.pointerId,
        mode: "lasso",
        startPoint: point,
        currentPoint: point,
        additive: event.shiftKey,
        previousSelection: selectionIds(),
        didMove: false,
      };
      trySetPointerCapture(event.pointerId);
      renderSelectionActions();
      renderCanvas();
      return;
    }

    if (event.shiftKey) {
      const nextSelection = new Set(selectionIds());
      selectionForElement(frame, hitElement).forEach((id) => {
        if (nextSelection.has(id)) {
          nextSelection.delete(id);
        } else {
          nextSelection.add(id);
        }
      });
      setSelectedElements(Array.from(nextSelection), hitElement.id);
      state.elementTransform = null;
      renderSelectionActions();
      renderCanvas();
      return;
    }

    const activeSelection = selectionForElement(frame, hitElement);
    setSelectedElements(activeSelection, hitElement.id);
    state.elementTransform = {
      pointerId: event.pointerId,
      mode: handle ? "resize" : "move",
      handle: handle?.id || null,
      startPoint: point,
      originalElement: structuredClone(hitElement),
      originalBounds:
        activeSelection.length === 1
          ? getElementBounds(hitElement, frame)
          : unionBounds(
              activeSelection
                .map((id) =>
                  getElementBounds(
                    frame.elements.find((element) => element.id === id),
                    frame,
                  ),
                )
                .filter(Boolean),
            ),
      originalElements: Object.fromEntries(
        activeSelection.map((id) => {
          const element = frame.elements.find(
            (candidate) => candidate.id === id,
          );
          return [id, structuredClone(element)];
        }),
      ),
      previousElements: structuredClone(frame.elements),
      didMove: false,
    };
    trySetPointerCapture(event.pointerId);
    renderSelectionActions();
    renderCanvas();
    return;
  }

  if (state.tool === "label") {
    const hitElement = hitTestElement(frame, point);
    const attachTargetId =
      hitElement && hitElement.type !== "label" ? hitElement.id : null;
    openLabelEditor(point, event, attachTargetId);
    return;
  }

  state.isDrawing = true;
  clearElementSelection();
  trySetPointerCapture(event.pointerId);

  if (
    state.tool === "pen" ||
    state.tool === "marker" ||
    state.tool === "erase"
  ) {
    state.draftElement = {
      id: uid("stroke"),
      type: "path",
      points: [point],
      color: state.tool === "erase" ? ERASER_COLOR : state.color,
      size: state.size,
      alpha: state.tool === "marker" ? 0.42 : 1,
      composite: state.tool === "erase" ? "destination-out" : "source-over",
    };
  } else {
    state.draftElement = {
      id: uid("shape"),
      type: state.tool,
      start: point,
      end: point,
      color: state.color,
      size: state.size,
      alpha: 1,
      composite: "source-over",
    };
  }

  renderCanvas();
}

function onPointerMove(event) {
  updateBrushPreviewPosition(event);
  if (state.tool === "select" && !state.elementTransform) {
    const hitElement = hitTestElement(currentFrame(), pointFromEvent(event));
    const nextHoverId = hitElement?.id || null;
    if (state.hoverElementId !== nextHoverId) {
      state.hoverElementId = nextHoverId;
      renderCanvas();
    }
  }

  if (
    state.tool === "select" &&
    state.elementTransform &&
    event.pointerId === state.elementTransform.pointerId
  ) {
    const frame = currentFrame();
    if (state.elementTransform.mode === "lasso") {
      state.elementTransform.currentPoint = pointFromEvent(event);
      if (
        distanceBetweenPoints(
          state.elementTransform.currentPoint,
          state.elementTransform.startPoint,
        ) > 2
      ) {
        state.elementTransform.didMove = true;
      }
      const lassoBounds = makeBounds(
        Math.min(
          state.elementTransform.startPoint.x,
          state.elementTransform.currentPoint.x,
        ),
        Math.min(
          state.elementTransform.startPoint.y,
          state.elementTransform.currentPoint.y,
        ),
        Math.max(
          state.elementTransform.startPoint.x,
          state.elementTransform.currentPoint.x,
        ),
        Math.max(
          state.elementTransform.startPoint.y,
          state.elementTransform.currentPoint.y,
        ),
      );
      const hitIds = frame.elements
        .filter((element) => {
          const bounds = getElementBounds(element, frame);
          return bounds && boundsIntersect(bounds, lassoBounds);
        })
        .map((element) => element.id);
      const nextIds = state.elementTransform.additive
        ? Array.from(
            new Set([...state.elementTransform.previousSelection, ...hitIds]),
          )
        : hitIds;
      setSelectedElements(nextIds, nextIds.at(-1) || null);
      renderSelectionActions();
      renderCanvas();
      return;
    }

    const selectedElements = currentSelectedElements(frame);
    if (!selectedElements.length) {
      return;
    }

    const point = pointFromEvent(event);
    const deltaX = point.x - state.elementTransform.startPoint.x;
    const deltaY = point.y - state.elementTransform.startPoint.y;
    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      state.elementTransform.didMove = true;
    }

    selectedElements.forEach((element) => {
      const original = state.elementTransform.originalElements[element.id];
      if (!original) {
        return;
      }
      Object.assign(element, structuredClone(original));
    });

    if (state.elementTransform.mode === "move") {
      selectedElements.forEach((element) =>
        translateElement(element, deltaX, deltaY),
      );
    } else if (state.elementTransform.originalBounds) {
      const nextBounds = resizeBoundsFromHandle(
        state.elementTransform.originalBounds,
        state.elementTransform.handle,
        deltaX,
        deltaY,
      );
      if (selectedElements.length > 1) {
        selectedElements.forEach((element) => {
          resizeElementToBounds(
            element,
            state.elementTransform.originalElements[element.id],
            state.elementTransform.originalBounds,
            nextBounds,
          );
        });
      } else {
        const primaryElement = currentSelectedElement(frame);
        if (!primaryElement) {
          return;
        }
        resizeElementToBounds(
          primaryElement,
          state.elementTransform.originalElement,
          state.elementTransform.originalBounds,
          nextBounds,
        );
      }
    }

    renderCanvas();
    return;
  }

  if (!state.isDrawing || !state.draftElement) {
    return;
  }
  const point = pointFromEvent(event);
  if (state.draftElement.type === "path") {
    const previous =
      state.draftElement.points[state.draftElement.points.length - 1];
    const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
    if (distance > 2) {
      state.draftElement.points.push(point);
    }
  } else {
    state.draftElement.end = point;
  }
  renderCanvas();
}

function onPointerUp(event) {
  if (event.type === "pointerleave" || event.type === "pointercancel") {
    state.brushPreview.visible = false;
    if (state.tool === "select") {
      state.hoverElementId = null;
    }
    renderBrushPreview();
    renderCanvas();
  }

  if (
    state.tool === "select" &&
    state.elementTransform &&
    event.pointerId === state.elementTransform.pointerId
  ) {
    const frame = currentFrame();
    if (state.elementTransform.mode === "lasso") {
      if (!state.elementTransform.didMove && !state.elementTransform.additive) {
        clearElementSelection();
      }
      state.elementTransform = null;
      tryReleasePointerCapture(event.pointerId);
      renderSelectionActions();
      renderCanvas();
      return;
    }

    if (state.elementTransform.didMove) {
      const history = ensureHistory(frame.id);
      history.past.push(state.elementTransform.previousElements);
      if (history.past.length > 40) {
        history.past.shift();
      }
      history.future = [];
      frame.updatedAt = new Date().toISOString();
      persistState();
      renderFrameList();
      renderUndoRedo();
      renderSpec();
      selectionIds().forEach((id) => syncAttachedLabels(frame, id));
      scheduleCapture("Element updated");
      const affectedCount = selectionIds().length;
      renderStatus(
        state.elementTransform.mode === "move"
          ? `${affectedCount > 1 ? "Selection" : "Element"} moved`
          : `${affectedCount > 1 ? "Selection" : "Element"} resized`,
      );
    }
    state.elementTransform = null;
    tryReleasePointerCapture(event.pointerId);
    renderCanvas();
    return;
  }

  if (!state.isDrawing || !state.draftElement) {
    return;
  }
  const frame = currentFrame();
  const element = state.draftElement;
  state.isDrawing = false;
  state.draftElement = null;
  tryReleasePointerCapture(event.pointerId);

  if (!isElementMeaningful(element)) {
    renderCanvas();
    return;
  }

  pushHistory(frame.id);
  frame.elements.push(element);
  setSelectedElements([element.id], element.id);
  touchFrame(frame, { capture: true, status: "Stroke captured" });
}

function onCanvasPointerEnter(event) {
  updateBrushPreviewPosition(event);
}

function onDeviceShellPointerDown(event) {
  if (
    state.viewMode !== "frame" ||
    !state.spacePressed ||
    event.target.closest("#label-editor")
  ) {
    return;
  }

  event.preventDefault();
  state.shellPan = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    scrollLeft: dom.deviceShell.scrollLeft,
    scrollTop: dom.deviceShell.scrollTop,
  };
  renderCanvas();
}

function openLabelEditor(point, event, attachTargetId = null) {
  state.labelDraft = {
    point,
    attachTargetId,
    clientX: event.clientX,
    clientY: event.clientY,
  };

  const shellRect = dom.deviceShell.getBoundingClientRect();
  dom.labelEditor.hidden = false;
  dom.labelEditor.style.left = `${event.clientX - shellRect.left + dom.deviceShell.scrollLeft}px`;
  dom.labelEditor.style.top = `${event.clientY - shellRect.top + dom.deviceShell.scrollTop}px`;
  dom.labelEditorInput.value = "";
  dom.labelEditorInput.placeholder = attachTargetId
    ? "Type attached label and press Enter"
    : "Type label and press Enter";
  dom.labelEditorInput.focus();
}

function commitLabelEditor() {
  if (!state.labelDraft) {
    return;
  }

  const text = dom.labelEditorInput.value.trim();
  const frame = currentFrame();
  const draft = state.labelDraft;
  if (!text) {
    cancelLabelEditor();
    return;
  }

  pushHistory(frame.id);
  const label = {
    id: uid("label"),
    type: "label",
    x: draft.point.x,
    y: draft.point.y,
    text,
    color: state.color,
    size: Math.max(18, state.size * 1.3),
    alpha: 1,
    composite: "source-over",
    attachedTo: draft.attachTargetId,
    anchor: null,
  };

  if (draft.attachTargetId) {
    setLabelResolvedPosition(label, draft.point, frame);
  }

  frame.elements.push(label);
  setSelectedElements([label.id], label.id);
  cancelLabelEditor({ preserveSelection: true });
  touchFrame(frame, {
    capture: true,
    status: draft.attachTargetId ? "Attached label added" : "Label added",
  });
}

function cancelLabelEditor(options = {}) {
  const { preserveSelection = false } = options;
  state.labelDraft = null;
  dom.labelEditor.hidden = true;
  dom.labelEditorInput.value = "";
  if (!preserveSelection && state.tool === "label") {
    clearElementSelection();
  }
  renderSelectionActions();
  renderCanvas();
}

function onLabelEditorKeyDown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    cancelLabelEditor();
    return;
  }

  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    commitLabelEditor();
  }
}

function pointFromEvent(event) {
  const rect = dom.canvas.getBoundingClientRect();
  const scaleX = dom.canvas.width / rect.width;
  const scaleY = dom.canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function updateBrushPreviewPosition(event) {
  if (!toolUsesBrushPreview(state.tool)) {
    state.brushPreview.visible = false;
    renderBrushPreview();
    return;
  }
  const rect = dom.deviceShell.getBoundingClientRect();
  state.brushPreview.x = event.clientX - rect.left;
  state.brushPreview.y = event.clientY - rect.top;
  state.brushPreview.visible = true;
  renderBrushPreview();
}

function trySetPointerCapture(pointerId) {
  if (typeof dom.canvas.setPointerCapture !== "function") {
    return;
  }
  try {
    dom.canvas.setPointerCapture(pointerId);
  } catch {
    // Some browsers and synthetic event paths do not expose an active pointer for capture.
  }
}

function tryReleasePointerCapture(pointerId) {
  if (typeof dom.canvas.releasePointerCapture !== "function") {
    return;
  }
  const hasCapture =
    typeof dom.canvas.hasPointerCapture === "function"
      ? dom.canvas.hasPointerCapture(pointerId)
      : true;
  if (!hasCapture) {
    return;
  }
  try {
    dom.canvas.releasePointerCapture(pointerId);
  } catch {
    // Ignore invalid release attempts and keep the draw commit path alive.
  }
}

function onFlowBoardClick(event) {
  const connectionItem = event.target.closest("[data-flow-connection-id]");
  if (connectionItem) {
    state.selectedConnectionId = connectionItem.dataset.flowConnectionId;
    state.pendingConnectionFromFrameId = null;
    renderFlowInspector();
    renderFlowBoard();
    return;
  }

  const linkHandle = event.target.closest("[data-flow-link-handle]");
  if (linkHandle) {
    state.pendingConnectionFromFrameId = linkHandle.dataset.flowLinkHandle;
    state.selectedConnectionId = null;
    state.flowConnectionDraft = null;
    renderFlowInspector();
    renderFlowBoard();
    renderStatus(
      `Linking from ${frameTitleById(state.pendingConnectionFromFrameId)}. Click another frame to connect it.`,
    );
    return;
  }

  const node = event.target.closest("[data-flow-frame-id]");
  if (!node) {
    return;
  }

  const frameId = node.dataset.flowFrameId;

  if (state.flowDrag?.frameId === frameId && state.flowDrag.didMove) {
    return;
  }

  if (
    state.pendingConnectionFromFrameId &&
    state.pendingConnectionFromFrameId !== frameId
  ) {
    upsertConnection(state.pendingConnectionFromFrameId, frameId);
    state.activeFrameId = frameId;
    clearElementSelection();
    renderAll();
    renderStatus(
      `Linked ${frameTitleById(state.selectedConnectionId ? currentConnection()?.fromFrameId : state.pendingConnectionFromFrameId)} to ${frameTitleById(frameId)}.`,
    );
    return;
  }

  state.activeFrameId = frameId;
  clearElementSelection();
  renderAll();
}

function onFlowSvgClick(event) {
  const hit = event.target.closest("[data-flow-connection-id]");
  if (!hit) {
    return;
  }
  state.selectedConnectionId = hit.dataset.flowConnectionId;
  renderFlowInspector();
  renderFlowBoard();
}

function onFlowBoardPointerDown(event) {
  const linkHandle = event.target.closest("[data-flow-link-handle]");
  if (linkHandle) {
    event.preventDefault();
    const frameId = linkHandle.dataset.flowLinkHandle;
    state.pendingConnectionFromFrameId = frameId;
    state.selectedConnectionId = null;
    state.flowConnectionDraft = {
      fromFrameId: frameId,
      pointerId: event.pointerId,
      pointer: pointFromFlowEvent(event),
    };
    renderFlowInspector();
    renderFlowBoard();
    return;
  }

  const dragHandle = event.target.closest("[data-flow-drag]");
  if (!dragHandle) {
    return;
  }

  const frameId = dragHandle.dataset.flowDrag;
  const frame = frameById(frameId);
  if (!frame) {
    return;
  }

  state.flowDrag = {
    frameId,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: frame.flowPosition.x,
    originY: frame.flowPosition.y,
    didMove: false,
  };
}

function onWindowPointerMove(event) {
  if (state.shellPan && event.pointerId === state.shellPan.pointerId) {
    dom.deviceShell.scrollLeft =
      state.shellPan.scrollLeft - (event.clientX - state.shellPan.startX);
    dom.deviceShell.scrollTop =
      state.shellPan.scrollTop - (event.clientY - state.shellPan.startY);
    return;
  }

  if (
    state.flowConnectionDraft &&
    event.pointerId === state.flowConnectionDraft.pointerId
  ) {
    state.flowConnectionDraft.pointer = pointFromFlowEvent(event);
    renderFlowBoard();
  }

  if (!state.flowDrag || event.pointerId !== state.flowDrag.pointerId) {
    return;
  }

  const frame = frameById(state.flowDrag.frameId);
  if (!frame) {
    return;
  }

  const deltaX = event.clientX - state.flowDrag.startX;
  const deltaY = event.clientY - state.flowDrag.startY;
  if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
    state.flowDrag.didMove = true;
  }

  frame.flowPosition = {
    x: Math.max(32, state.flowDrag.originX + deltaX),
    y: Math.max(32, state.flowDrag.originY + deltaY),
  };
  renderFlowBoard();
}

function onWindowPointerUp(event) {
  if (state.shellPan && event.pointerId === state.shellPan.pointerId) {
    state.shellPan = null;
    renderCanvas();
    return;
  }

  if (
    state.flowConnectionDraft &&
    event.pointerId === state.flowConnectionDraft.pointerId
  ) {
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest("[data-flow-frame-id]");
    if (
      target &&
      target.dataset.flowFrameId !== state.flowConnectionDraft.fromFrameId
    ) {
      upsertConnection(
        state.flowConnectionDraft.fromFrameId,
        target.dataset.flowFrameId,
      );
      state.activeFrameId = target.dataset.flowFrameId;
      renderStatus(
        `Connected ${frameTitleById(state.flowConnectionDraft.fromFrameId)} to ${frameTitleById(target.dataset.flowFrameId)}.`,
      );
    }
    state.flowConnectionDraft = null;
    state.pendingConnectionFromFrameId = null;
    persistState();
    renderAll();
  }

  if (!state.flowDrag || event.pointerId !== state.flowDrag.pointerId) {
    return;
  }

  const didMove = state.flowDrag.didMove;
  state.flowDrag = null;
  if (didMove) {
    persistState();
    renderFlowBoard();
    renderStatus("Flow layout updated");
  }
}

function onWindowKeyDown(event) {
  if (event.key === "Escape" && !dom.helpOverlay.hidden) {
    event.preventDefault();
    closeHelpOverlay();
    return;
  }

  if (
    event.key === " " &&
    state.viewMode === "frame" &&
    !shouldIgnoreDeleteShortcut(event.target)
  ) {
    event.preventDefault();
    state.spacePressed = true;
    renderCanvas();
    return;
  }

  const isMeta = event.metaKey || event.ctrlKey;
  if (isMeta && !shouldIgnoreDeleteShortcut(event.target)) {
    const key = event.key.toLowerCase();
    if (key === "z" && !event.shiftKey) {
      event.preventDefault();
      undoDesignerAction();
      return;
    }
    if ((key === "z" && event.shiftKey) || key === "y") {
      event.preventDefault();
      redoDesignerAction();
      return;
    }
  }

  if (
    state.viewMode === "frame" &&
    isMeta &&
    !shouldIgnoreDeleteShortcut(event.target)
  ) {
    if (event.key.toLowerCase() === "c" && selectionIds().length) {
      return;
    }
    if (event.key.toLowerCase() === "d" && selectionIds().length) {
      event.preventDefault();
      duplicateSelectedElements();
      return;
    }
    if (event.key === "]" && selectionIds().length) {
      event.preventDefault();
      bringSelectionForward();
      return;
    }
    if (event.key === "[" && selectionIds().length) {
      event.preventDefault();
      sendSelectionBackward();
      return;
    }
  }

  const isDeleteKey = event.key === "Delete" || event.key === "Backspace";
  if (!isDeleteKey || shouldIgnoreDeleteShortcut(event.target)) {
    return;
  }

  if (state.viewMode === "flow" && state.selectedConnectionId) {
    event.preventDefault();
    deleteSelectedConnection();
    return;
  }

  if (state.viewMode === "frame" && state.selectedElementId) {
    event.preventDefault();
    deleteSelectedElement();
  }
}

function onWindowKeyUp(event) {
  if (event.key === " ") {
    state.spacePressed = false;
    renderCanvas();
  }
}

function onWindowCopy(event) {
  if (state.viewMode !== "frame" || shouldIgnoreDeleteShortcut(event.target)) {
    return;
  }

  const selected = currentSelectedElements(currentFrame());
  if (!selected.length || !event.clipboardData) {
    return;
  }

  event.preventDefault();
  const payload = JSON.stringify({
    kind: "canvax-elements",
    elements: selected,
  });
  event.clipboardData.setData("application/x-canvax-elements", payload);
  event.clipboardData.setData(
    "text/plain",
    selected.length > 1
      ? `Canvax selection (${selected.length} elements)`
      : `Canvax ${selected[0].type || "element"}`,
  );
  renderStatus(selected.length > 1 ? "Selection copied" : "Element copied");
}

function shouldIgnoreDeleteShortcut(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}

function pointFromFlowEvent(event) {
  const rect = dom.flowSurface.getBoundingClientRect();
  return {
    x: event.clientX - rect.left + dom.flowShell.scrollLeft,
    y: event.clientY - rect.top + dom.flowShell.scrollTop,
  };
}

function upsertConnection(fromFrameId, toFrameId) {
  const existing = state.connections.find(
    (connection) =>
      connection.fromFrameId === fromFrameId &&
      connection.toFrameId === toFrameId,
  );
  if (existing) {
    state.selectedConnectionId = existing.id;
    state.pendingConnectionFromFrameId = null;
    return existing;
  }

  const connection = normalizeConnection({
    fromFrameId,
    toFrameId,
    label: "continue",
    notes: "",
  });
  state.connections.push(connection);
  state.selectedConnectionId = connection.id;
  state.pendingConnectionFromFrameId = null;
  persistState();
  return connection;
}

function setCurrentFrameAsEntry() {
  state.entryFrameId = currentFrame().id;
  persistState();
  renderAll();
  renderStatus(`${currentFrame().title} is now the entry frame`);
}

function autoLayoutFlow() {
  state.frames.forEach((frame, index) => {
    frame.flowPosition = defaultFlowPosition(index);
  });
  persistState();
  renderAll();
  renderStatus("Flow cards auto-laid out");
}

function updateSelectedConnection(field, value) {
  const connection = currentConnection();
  if (!connection) {
    return;
  }
  connection[field] = value;
  persistState();
  renderFlowInspector();
  renderFlowBoard();
  renderSpec();
}

function deleteSelectedConnection() {
  if (!state.selectedConnectionId) {
    return;
  }
  state.connections = state.connections.filter(
    (connection) => connection.id !== state.selectedConnectionId,
  );
  state.selectedConnectionId = null;
  persistState();
  renderAll();
  renderStatus("Flow link deleted");
}

function deleteSelectedElement() {
  const ids = selectionIds();
  if (!ids.length) {
    return;
  }

  const frame = currentFrame();
  pushHistory(frame.id);
  ids.forEach((id) => detachLabelsForElement(frame, id));
  frame.elements = frame.elements.filter(
    (element) => !ids.includes(element.id),
  );
  clearElementSelection();
  touchFrame(frame, {
    capture: true,
    status: ids.length > 1 ? "Selection deleted" : "Element deleted",
  });
}

function groupSelectedElements() {
  const frame = currentFrame();
  const selected = currentSelectedElements(frame);
  if (selected.length < 2) {
    return;
  }

  pushHistory(frame.id);
  const groupId = uid("group");
  selected.forEach((element) => {
    element.groupId = groupId;
  });
  touchFrame(frame, {
    capture: true,
    status: `Grouped ${selected.length} elements`,
  });
}

function ungroupSelectedElements() {
  const frame = currentFrame();
  const selected = currentSelectedElements(frame);
  if (!selected.length) {
    return;
  }

  pushHistory(frame.id);
  selected.forEach((element) => {
    delete element.groupId;
  });
  touchFrame(frame, {
    capture: true,
    status: selected.length > 1 ? "Selection ungrouped" : "Element ungrouped",
  });
}

function duplicateSelectedElements() {
  const frame = currentFrame();
  const selected = currentSelectedElements(frame);
  if (!selected.length) {
    return;
  }

  pushHistory(frame.id);
  const selectedIds = new Set(selected.map((element) => element.id));
  const idMap = new Map();
  const groupRemap = new Map();
  const duplicates = selected.map((element) => {
    const copy = structuredClone(element);
    copy.id = uid(element.type || "element");
    idMap.set(element.id, copy.id);
    if (element.groupId) {
      if (!groupRemap.has(element.groupId)) {
        groupRemap.set(element.groupId, uid("group"));
      }
      copy.groupId = groupRemap.get(element.groupId);
    }

    if (copy.type === "path") {
      copy.points = copy.points.map((point) => ({
        x: point.x + 24,
        y: point.y + 24,
      }));
    } else if (copy.type === "label") {
      copy.x += 24;
      copy.y += 24;
    } else {
      copy.start = { x: copy.start.x + 24, y: copy.start.y + 24 };
      copy.end = { x: copy.end.x + 24, y: copy.end.y + 24 };
    }
    return copy;
  });

  duplicates.forEach((copy) => {
    if (
      copy.type === "label" &&
      copy.attachedTo &&
      selectedIds.has(copy.attachedTo)
    ) {
      copy.attachedTo = idMap.get(copy.attachedTo) || copy.attachedTo;
    }
  });

  frame.elements.push(...duplicates);
  setSelectedElements(
    duplicates.map((element) => element.id),
    duplicates.at(-1)?.id || null,
  );
  touchFrame(frame, {
    capture: true,
    status:
      duplicates.length > 1 ? "Selection duplicated" : "Element duplicated",
  });
}

async function tryPasteElements(event) {
  if (state.viewMode !== "frame" || shouldIgnoreDeleteShortcut(event.target)) {
    return false;
  }

  const rawPayload =
    event.clipboardData?.getData("application/x-canvax-elements") ||
    event.clipboardData?.getData("text/plain");
  if (!rawPayload) {
    return false;
  }

  try {
    const payload = JSON.parse(rawPayload);
    if (
      payload?.kind !== "canvax-elements" ||
      !Array.isArray(payload.elements) ||
      !payload.elements.length
    ) {
      return false;
    }

    event.preventDefault();
    pasteElements(payload.elements);
    return true;
  } catch {
    return false;
  }
}

function pasteElements(elements) {
  const frame = currentFrame();
  pushHistory(frame.id);

  const selectedIds = new Set(elements.map((element) => element.id));
  const idMap = new Map();
  const groupRemap = new Map();
  const clones = elements.map((element) => {
    const copy = structuredClone(element);
    copy.id = uid(element.type || "element");
    idMap.set(element.id, copy.id);

    if (element.groupId) {
      if (!groupRemap.has(element.groupId)) {
        groupRemap.set(element.groupId, uid("group"));
      }
      copy.groupId = groupRemap.get(element.groupId);
    }

    if (copy.type === "path") {
      copy.points = copy.points.map((point) => ({
        x: point.x + 32,
        y: point.y + 32,
      }));
    } else if (copy.type === "label") {
      copy.x += 32;
      copy.y += 32;
    } else {
      copy.start = { x: copy.start.x + 32, y: copy.start.y + 32 };
      copy.end = { x: copy.end.x + 32, y: copy.end.y + 32 };
    }
    return copy;
  });

  clones.forEach((copy) => {
    if (
      copy.type === "label" &&
      copy.attachedTo &&
      selectedIds.has(copy.attachedTo)
    ) {
      copy.attachedTo = idMap.get(copy.attachedTo) || copy.attachedTo;
    }
  });

  frame.elements.push(...clones);
  setSelectedElements(
    clones.map((element) => element.id),
    clones.at(-1)?.id || null,
  );
  touchFrame(frame, {
    capture: true,
    status: clones.length > 1 ? "Selection pasted" : "Element pasted",
  });
}

function reorderSelection(moveToFront) {
  const frame = currentFrame();
  const ids = new Set(selectionIds());
  if (!ids.size) {
    return;
  }

  pushHistory(frame.id);
  const selected = frame.elements.filter((element) => ids.has(element.id));
  const remaining = frame.elements.filter((element) => !ids.has(element.id));
  frame.elements = moveToFront
    ? [...remaining, ...selected]
    : [...selected, ...remaining];
  touchFrame(frame, {
    capture: true,
    status: moveToFront
      ? "Selection brought forward"
      : "Selection sent backward",
  });
}

function bringSelectionForward() {
  reorderSelection(true);
}

function sendSelectionBackward() {
  reorderSelection(false);
}

function openHelpOverlay() {
  dom.helpOverlay.hidden = false;
}

function closeHelpOverlay() {
  dom.helpOverlay.hidden = true;
}

function openPreviewWindow(options = {}) {
  const { announce = true } = options;
  const previewWindow = window.open("/preview.html", PREVIEW_WINDOW_NAME);
  if (!previewWindow) {
    renderStatus("Preview popup blocked. Open /preview.html manually.");
    return null;
  }

  try {
    previewWindow.opener = null;
  } catch {
    // Ignore cross-window restrictions and keep the preview flow alive.
  }

  if (announce) {
    dom.workspaceStatus.textContent = "Live preview opened in a separate tab.";
    renderStatus("Live preview opened");
  }
  return previewWindow;
}

function deleteCapture(captureId) {
  const frame = currentFrame();
  if (!frame.captures.some((capture) => capture.id === captureId)) {
    return;
  }

  frame.captures = frame.captures.filter((capture) => capture.id !== captureId);
  frame.thumbnail =
    frame.captures[0]?.image ||
    renderFrameToDataUrl(frame, {
      maxWidth: 420,
      mime: "image/jpeg",
      quality: 0.84,
    });
  touchFrame(frame, { capture: false, status: "Capture deleted" });
}

function clearCaptures() {
  const frame = currentFrame();
  if (!frame.captures.length) {
    return;
  }

  frame.captures = [];
  frame.thumbnail = renderFrameToDataUrl(frame, {
    maxWidth: 420,
    mime: "image/jpeg",
    quality: 0.84,
  });
  touchFrame(frame, { capture: false, status: "Captures cleared" });
}

function removeConnectionsForFrame(frameId) {
  state.connections = state.connections.filter(
    (connection) =>
      connection.fromFrameId !== frameId && connection.toFrameId !== frameId,
  );
  if (state.selectedConnectionId && !currentConnection()) {
    state.selectedConnectionId = null;
  }
  if (state.pendingConnectionFromFrameId === frameId) {
    state.pendingConnectionFromFrameId = null;
  }
  if (state.entryFrameId === frameId) {
    state.entryFrameId =
      state.frames.find((frame) => frame.id !== frameId)?.id || null;
  }
}

function isElementMeaningful(element) {
  if (element.type === "path") {
    return element.points.length > 1;
  }
  if (
    element.type === "line" ||
    element.type === "arrow" ||
    element.type === "rect" ||
    element.type === "ellipse"
  ) {
    return (
      Math.hypot(
        element.end.x - element.start.x,
        element.end.y - element.start.y,
      ) > 5
    );
  }
  return true;
}

function updateBoard(field, value) {
  state.board[field] = value;
  persistState();
  renderSpec();
}

function updateActionMode(value) {
  const actionMode = normalizeActionMode(value);
  state.board.actionMode = actionMode.id;
  persistState();
  renderBoardFields();
  renderFocusPad();
  renderSpec();
  renderStatus(`Workbench action mode: ${actionMode.label}`);
}

function updateGenerationField(field, value) {
  state.board.generation = {
    ...normalizeGenerationConfig(state.board.generation),
    [field]: value,
  };
  state.board.generation = normalizeGenerationConfig(state.board.generation);
  persistState();
  renderBoardFields();
  renderSpec();
  renderStatus(`Generation recipe updated: ${generationSummaryText()}`);
}

function updateFrameField(field, value, options = { capture: true }) {
  const frame = currentFrame();
  frame[field] = value;
  touchFrame(frame, {
    capture: options.capture !== false,
    status: `${frame.title} updated`,
  });
}

function touchFrame(frame, { capture = true, status = "Frame updated" } = {}) {
  frame.updatedAt = new Date().toISOString();
  persistState();
  renderAll();
  renderStatus(status);
  if (capture) {
    scheduleCapture(status);
  }
}

function addFrame(options = {}) {
  const active = currentFrame();
  const frame = createFrame({
    title: options.title || `Frame ${state.frames.length + 1}`,
    viewport: options.viewport || active.viewport,
    objective: options.objective || "",
    layout: options.layout || "",
    motion: options.motion || "",
    assets: options.assets || "",
    mobile: options.mobile || "",
    flowPosition: defaultFlowPosition(state.frames.length),
  });
  state.frames.push(frame);
  state.activeFrameId = frame.id;
  if (options.connectFromActive) {
    const connection = normalizeConnection({
      fromFrameId: active.id,
      toFrameId: frame.id,
      label: options.connectionLabel || "next",
      notes: options.connectionNotes || "",
    });
    state.connections.push(connection);
    state.selectedConnectionId = connection.id;
  }
  clearElementSelection();
  persistState();
  renderAll();
  renderStatus(options.status || "New frame added");
  return frame;
}

function addSectionFrame() {
  const active = currentFrame();
  const sectionNumber =
    state.frames.filter((frame) => frame.viewport === active.viewport).length +
    1;
  return addFrame({
    title: `Section ${sectionNumber}`,
    viewport: active.viewport,
    objective: `Continuation section after ${active.title}`,
    layout:
      "Use this as the next vertical section or screen state connected to the previous sketch.",
    connectFromActive: true,
    connectionLabel: "scroll / continue",
    connectionNotes:
      "Workbench section created as a connected continuation from the previous frame.",
    status: "Connected section frame added",
  });
}

function duplicateFrame() {
  const frame = currentFrame();
  const copy = createFrame({
    title: `${frame.title} copy`,
    viewport: frame.viewport,
    objective: frame.objective,
    layout: frame.layout,
    motion: frame.motion,
    assets: frame.assets,
    mobile: frame.mobile,
    backgroundImage: frame.backgroundImage,
    flowPosition: {
      x: frame.flowPosition.x + 48,
      y: frame.flowPosition.y + 40,
    },
    elements: structuredClone(frame.elements),
    outputAnnotations: structuredClone(frame.outputAnnotations || []),
    thumbnail: frame.thumbnail,
    captures: structuredClone(frame.captures),
  });
  state.frames.splice(state.frames.indexOf(frame) + 1, 0, copy);
  state.activeFrameId = copy.id;
  clearElementSelection();
  persistState();
  renderAll();
  renderStatus("Frame duplicated");
}

function deleteFrame() {
  if (state.frames.length === 1) {
    const only = currentFrame();
    only.elements = [];
    only.outputAnnotations = [];
    only.captures = [];
    only.thumbnail = "";
    only.backgroundImage = "";
    only.layout = "";
    only.motion = "";
    only.assets = "";
    only.mobile = "";
    only.objective = "";
    state.connections = [];
    state.selectedConnectionId = null;
    state.pendingConnectionFromFrameId = null;
    state.entryFrameId = only.id;
    state.voice.segments = state.voice.segments.filter(
      (segment) => segment.scope !== "frame" || segment.frameId !== only.id,
    );
    clearElementSelection();
    persistState();
    renderAll();
    renderStatus("Frame reset");
    return;
  }

  const currentIndex = state.frames.findIndex(
    (frame) => frame.id === state.activeFrameId,
  );
  const deletedFrameId = state.activeFrameId;
  removeConnectionsForFrame(state.activeFrameId);
  state.frames = state.frames.filter(
    (frame) => frame.id !== state.activeFrameId,
  );
  state.voice.segments = state.voice.segments.filter(
    (segment) =>
      segment.scope !== "frame" || segment.frameId !== deletedFrameId,
  );
  state.activeFrameId = state.frames[Math.max(0, currentIndex - 1)].id;
  clearElementSelection();
  if (!state.entryFrameId) {
    state.entryFrameId = state.frames[0].id;
  }
  persistState();
  renderAll();
  renderStatus("Frame deleted");
}

function clearCurrentFrame() {
  const frame = currentFrame();
  pushHistory(frame.id);
  frame.elements = [];
  frame.outputAnnotations = [];
  frame.captures = [];
  frame.thumbnail = "";
  clearElementSelection();
  touchFrame(frame, { capture: true, status: "Frame cleared" });
}

function ensureHistory(frameId) {
  if (!histories.has(frameId)) {
    histories.set(frameId, { past: [], future: [] });
  }
  return histories.get(frameId);
}

function ensureOutputAnnotationHistory(frameId) {
  if (!outputAnnotationHistories.has(frameId)) {
    outputAnnotationHistories.set(frameId, { past: [], future: [] });
  }
  return outputAnnotationHistories.get(frameId);
}

function pushHistory(frameId) {
  const history = ensureHistory(frameId);
  history.past.push(structuredClone(currentFrame().elements));
  if (history.past.length > 40) {
    history.past.shift();
  }
  history.future = [];
  state.lastActionScope = "frame-elements";
}

function pushOutputAnnotationHistory(frame) {
  const history = ensureOutputAnnotationHistory(frame.id);
  history.past.push(structuredClone(frame.outputAnnotations || []));
  if (history.past.length > 40) {
    history.past.shift();
  }
  history.future = [];
  state.lastActionScope = "output-annotations";
}

function undoFrame() {
  const frame = currentFrame();
  const history = ensureHistory(frame.id);
  if (!history.past.length) {
    return;
  }
  history.future.push(structuredClone(frame.elements));
  frame.elements = history.past.pop();
  state.lastActionScope = "frame-elements";
  touchFrame(frame, { capture: true, status: "Undo applied" });
}

function redoFrame() {
  const frame = currentFrame();
  const history = ensureHistory(frame.id);
  if (!history.future.length) {
    return;
  }
  history.past.push(structuredClone(frame.elements));
  frame.elements = history.future.pop();
  state.lastActionScope = "frame-elements";
  touchFrame(frame, { capture: true, status: "Redo applied" });
}

function undoOutputAnnotations() {
  const frame = currentFrame();
  const history = ensureOutputAnnotationHistory(frame.id);
  if (!history.past.length) {
    return false;
  }
  history.future.push(structuredClone(frame.outputAnnotations || []));
  frame.outputAnnotations = history.past.pop();
  state.outputAnnotationDraft = null;
  state.lastActionScope = "output-annotations";
  touchFrame(frame, { capture: false, status: "Output correction undo applied" });
  return true;
}

function redoOutputAnnotations() {
  const frame = currentFrame();
  const history = ensureOutputAnnotationHistory(frame.id);
  if (!history.future.length) {
    return false;
  }
  history.past.push(structuredClone(frame.outputAnnotations || []));
  frame.outputAnnotations = history.future.pop();
  state.outputAnnotationDraft = null;
  state.lastActionScope = "output-annotations";
  touchFrame(frame, { capture: false, status: "Output correction redo applied" });
  return true;
}

function undoDesignerAction() {
  const frame = currentFrame();
  const annotationHistory = ensureOutputAnnotationHistory(frame.id);
  if (
    state.lastActionScope === "output-annotations" &&
    annotationHistory.past.length &&
    undoOutputAnnotations()
  ) {
    return;
  }
  const history = ensureHistory(frame.id);
  if (history.past.length) {
    undoFrame();
    return;
  }
  if (annotationHistory.past.length) {
    undoOutputAnnotations();
  }
}

function redoDesignerAction() {
  const frame = currentFrame();
  const annotationHistory = ensureOutputAnnotationHistory(frame.id);
  if (
    state.lastActionScope === "output-annotations" &&
    annotationHistory.future.length &&
    redoOutputAnnotations()
  ) {
    return;
  }
  const history = ensureHistory(frame.id);
  if (history.future.length) {
    redoFrame();
    return;
  }
  if (annotationHistory.future.length) {
    redoOutputAnnotations();
  }
}

function scheduleCapture(reason) {
  if (!state.autoSnap) {
    return;
  }
  window.clearTimeout(state.captureTimer);
  renderStatus(`${reason} • autosnap in 2s`);
  state.captureTimer = window.setTimeout(
    () => freezeFrame(false),
    AUTO_CAPTURE_DELAY,
  );
}

function freezeFrame(manual = false, options = {}) {
  const frame = currentFrame();
  window.clearTimeout(state.captureTimer);
  const captureImage = renderFrameToDataUrl(frame, {
    maxWidth: 420,
    mime: "image/jpeg",
    quality: 0.84,
  });
  frame.thumbnail = captureImage;
  frame.captures.unshift({
    id: uid("capture"),
    at: new Date().toISOString(),
    image: captureImage,
  });
  frame.captures = frame.captures.slice(0, MAX_CAPTURES);
  frame.updatedAt = new Date().toISOString();
  persistState();
  renderFrameList();
  renderCaptures();
  renderStatus(
    options.status || (manual ? "Manual freeze saved" : "Autosnap freeze saved"),
  );
  scheduleLivePreviewSync();
  const handoff = syncFreezeHandoff(manual, options.reason);
  if (!options.awaitHandoff) {
    void handoff;
  }
  return handoff;
}

async function syncFreezeHandoff(manual = false, reasonOverride = "") {
  const reason = reasonOverride || (manual ? "manual-freeze" : "autosnap-freeze");
  const exportResult = await saveExportToWorkspace({ silent: true });
  if (!exportResult) {
    return null;
  }
  await refreshMaterializedFrameFromFreeze(exportResult);
  await saveCheckpointToWorkspace(reason, {
    silent: true,
    exportResult,
  });
  return exportResult;
}

function frameHasMaterializedTarget(
  frameId,
  manifest = state.serverStatus.previewManifest || null,
) {
  if (!frameId) {
    return false;
  }
  return collectManifestTargets(manifest).some(
    (target) =>
      target.frameIds.includes(frameId) &&
      (target.type === "materialized-preview" ||
        target.source === "canvax-materialize"),
  );
}

async function refreshMaterializedFrameFromFreeze(exportResult = null) {
  const frame = currentFrame();
  if (!frame || !frameHasMaterializedTarget(frame.id)) {
    return null;
  }
  const target = resolveManifestTargetEntry(
    state.serverStatus.previewManifest,
    frame.id,
  );
  const refreshMode =
    target?.type === "generated-screen-preview"
      ? "generate-screen"
      : "materialize";
  return materializeCurrentFrame({
    silent: true,
    announce: false,
    openPreview: false,
    skipCheckpoint: true,
    exportResult,
    mode: refreshMode,
  });
}

async function applyBackgroundFile(file) {
  const frame = currentFrame();
  pushHistory(frame.id);
  frame.backgroundImage = await fileToDataUrl(file, 1800);
  touchFrame(frame, { capture: true, status: "Reference underlay loaded" });
}

async function fileToDataUrl(file, maxWidth) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await ensureImage(dataUrl);
  const scale = Math.min(1, maxWidth / image.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.88);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getCachedImage(src) {
  if (!src) {
    return null;
  }
  const cached = imageCache.get(src);
  if (cached?.status === "loaded") {
    return cached.image;
  }
  if (cached?.status === "loading") {
    return null;
  }
  const image = new Image();
  image.onload = () => {
    imageCache.set(src, { status: "loaded", image });
    renderCanvas();
  };
  image.onerror = () => {
    imageCache.delete(src);
  };
  image.src = src;
  imageCache.set(src, { status: "loading", image });
  return null;
}

function ensureImage(src) {
  if (!src) {
    return Promise.resolve(null);
  }
  const cached = imageCache.get(src);
  if (cached?.status === "loaded") {
    return Promise.resolve(cached.image);
  }
  if (cached?.status === "loading") {
    return new Promise((resolve, reject) => {
      cached.image.addEventListener("load", () => resolve(cached.image), {
        once: true,
      });
      cached.image.addEventListener(
        "error",
        () => reject(new Error("Image could not load.")),
        { once: true },
      );
    });
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      imageCache.set(src, { status: "loaded", image });
      resolve(image);
    };
    image.onerror = () => reject(new Error("Image could not load."));
    image.src = src;
    imageCache.set(src, { status: "loading", image });
  });
}

async function fetchServerStatus() {
  try {
    const response = await fetch("/api/status");
    const data = await response.json();
    state.serverStatus = {
      ...data,
      transport: buildTransportDescriptor(data.transport),
      hostCapabilities: data.hostCapabilities || null,
      designContext: data.designContext || null,
    };
    renderServerStatus();
    if (data.exportRoot) {
      dom.workspaceStatus.textContent = `Live canvas updates will be written to ${data.exportRoot}. Use Preview for a separate live viewer tab.`;
    }
  } catch {
    dom.workspaceStatus.textContent = "Local server status unavailable.";
  }
}

async function refreshPreviewStateFromServer() {
  try {
    const response = await fetch("/api/preview-state", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Preview state unavailable.");
    }
    const previousOutputDigest = state.serverStatus.outputDigest || null;
    const nextOutputDigest = data.outputDigest || null;
    const localOutputActivity = updateOutputActivityHistory(
      state.serverStatus.outputActivity,
      previousOutputDigest,
      nextOutputDigest,
      data.updatedAt || new Date().toISOString(),
    );
    const persistedOutputActivity = buildOutputActivityFromSessionEvents(
      data.sessionEvents || [],
    );
    const nextOutputActivity = mergeOutputActivityEntries(
      localOutputActivity,
      persistedOutputActivity,
    );
    state.serverStatus = {
      ...state.serverStatus,
      previewManifest: data.previewManifest || null,
      workspaceFollow: data.workspaceFollow || null,
      transport: buildTransportDescriptor(data.transport),
      hostCapabilities:
        data.hostCapabilities || state.serverStatus.hostCapabilities || null,
      designContext: data.designContext || state.serverStatus.designContext || null,
      outputDigest: nextOutputDigest,
      outputActivity: nextOutputActivity,
      transcriptBridge: data.transcriptBridge || null,
      sessionEvents: Array.isArray(data.sessionEvents)
        ? data.sessionEvents
        : [],
      previewManifestPath:
        data.paths?.previewManifestPath ||
        state.serverStatus.previewManifestPath ||
        "",
      liveMarkdownPath:
        data.paths?.liveMarkdownPath ||
        state.serverStatus.liveMarkdownPath ||
        "",
      liveVoiceMarkdownPath:
        data.paths?.liveVoiceMarkdownPath ||
        state.serverStatus.liveVoiceMarkdownPath ||
        "",
      transcriptBridgePath:
        data.paths?.transcriptBridgePath ||
        state.serverStatus.transcriptBridgePath ||
        "",
      transcriptBridgeMarkdownPath:
        data.paths?.transcriptBridgeMarkdownPath ||
        state.serverStatus.transcriptBridgeMarkdownPath ||
        "",
      checkpointHistory:
        data.checkpointHistory || state.serverStatus.checkpointHistory || null,
      checkpointLatestPath:
        data.paths?.checkpointLatestPath ||
        state.serverStatus.checkpointLatestPath ||
        "",
      checkpointsIndexPath:
        data.paths?.checkpointsIndexPath ||
        state.serverStatus.checkpointsIndexPath ||
        "",
      sessionEventsPath:
        data.paths?.sessionEventsPath ||
        state.serverStatus.sessionEventsPath ||
        "",
    };
    importTranscriptBridge(data.transcriptBridge);
    renderCheckpointPanel();
    renderCodexOutput();
    renderServerStatus();
    void maybeCheckpointOutputUpdate(previousOutputDigest, nextOutputDigest);
  } catch {
    state.serverStatus = {
      ...state.serverStatus,
      previewManifest: state.serverStatus.previewManifest || null,
      checkpointHistory: state.serverStatus.checkpointHistory || null,
      transcriptBridge: state.serverStatus.transcriptBridge || null,
      workspaceFollow: state.serverStatus.workspaceFollow || null,
      transport: state.serverStatus.transport || buildTransportDescriptor(),
      hostCapabilities: state.serverStatus.hostCapabilities || null,
      designContext: state.serverStatus.designContext || null,
      outputDigest: state.serverStatus.outputDigest || null,
      outputActivity: state.serverStatus.outputActivity || [],
      sessionEvents: state.serverStatus.sessionEvents || [],
    };
  } finally {
    window.clearTimeout(state.previewStateTimer);
    state.previewStateTimer = window.setTimeout(() => {
      void refreshPreviewStateFromServer();
    }, MANIFEST_POLL_INTERVAL);
  }
}

function importTranscriptBridge(transcriptBridge) {
  const entries = Array.isArray(transcriptBridge?.entries)
    ? transcriptBridge.entries
    : [];
  if (!entries.length) {
    return;
  }

  const existingIds = new Set(state.voice.segments.map((segment) => segment.id));
  const frame = currentFrame();
  const newSegments = entries
    .filter((entry) => entry?.id && !existingIds.has(entry.id))
    .map((entry) => {
      const scope = entry.scope === "session" ? "session" : "frame";
      const frameId =
        scope === "frame" &&
        state.frames.some((candidate) => candidate.id === entry.frameId)
          ? entry.frameId
          : scope === "frame"
            ? frame.id
            : "";
      return normalizeVoiceSegment({
        id: entry.id,
        text: entry.text,
        at: entry.at,
        scope,
        provider: entry.provider || "codex-transcript-bridge",
        frameId,
        frameTitle:
          scope === "frame"
            ? entry.frameTitle || frameTitleById(frameId) || frame.title
            : "Board context",
      });
    })
    .filter(Boolean);

  if (!newSegments.length) {
    return;
  }

  state.voice.segments = [...newSegments, ...state.voice.segments].slice(
    0,
    120,
  );
  state.voice.error = "";
  state.voice.interimText = "";
  persistState();
  scheduleCapture("Codex transcript imported");
  renderStatus(
    newSegments.length === 1
      ? "Codex chat transcript added to Canvax"
      : `${newSegments.length} Codex chat transcripts added to Canvax`,
  );
}

function buildPromptMarkdown() {
  const generationRecipe = generationSummaryText(state.board.generation);
  const actionMode = currentActionMode();
  const designContext = currentDesignContextForExport();
  const lines = [
    `# ${state.board.project || "Canvax live canvas"}`,
    "",
    "## Current ask",
    `- Ask: ${state.board.goal || "Not specified"}`,
    `- Surface / medium: ${state.board.audience || "Not specified"}`,
    `- Mood: ${state.board.designMood || "Not specified"}`,
    `- Action mode: ${actionMode.label}`,
    `- Canvax mode: ${state.workspaceMode === "simple" ? "Workbench" : "Advanced"}`,
    `- Preferred screen generation: ${generationRecipe}`,
    `- Design rules: ${designContext.exists ? designContext.relativePath : "No DESIGN.md found"}`,
    "",
    "## How Codex should read this",
    "- Treat frame order as sequence, alternate states, or visual variants depending on the notes.",
    "- Preserve the composition and hierarchy from the sketch, but refine clarity, polish, and accessibility where relevant.",
    "- Use the drawing plus notes to infer structure, behavior, asset direction, and platform adaptation.",
    "- When explicit flow links exist, treat them as the primary interaction map instead of guessing transitions from frame order alone.",
    "- If the mode is Workbench, prioritize the active frame, latest capture, and voice notes as a quick edit instruction for the current design.",
    "",
  ];

  const voiceExport = buildVoiceExport();
  if (voiceExport.segmentCount) {
    lines.push("## Voice notes");
    lines.push(
      "Treat these spoken notes as raw intent captured while sketching. Prefer them when they clarify ambiguous regions, behaviors, or priorities.",
    );
    lines.push("");
    lines.push(...buildVoiceSectionLines(voiceExport, { includeEmpty: false }));
    lines.push("");
  }

  if (designContext.exists && designContext.content) {
    lines.push("## DESIGN.md context");
    lines.push("");
    lines.push("```markdown");
    lines.push(designContext.content);
    lines.push("```");
    lines.push("");
  }

  lines.push("## Frames");

  state.frames.forEach((frame, index) => {
    const viewport = viewportPresets[frame.viewport];
    lines.push("");
    lines.push(`### Frame ${index + 1}: ${frame.title}`);
    lines.push(
      `- Canvas: ${viewport.label} (${viewport.width}x${viewport.height})`,
    );
    lines.push(`- Intent: ${frame.objective || "Not specified"}`);
    lines.push(`- Notes / structure: ${frame.layout || "Not specified"}`);
    lines.push(`- Behavior / flow: ${frame.motion || "Not specified"}`);
    lines.push(
      `- Assets / generation notes: ${frame.assets || "Not specified"}`,
    );
    lines.push(
      `- Variant / platform notes: ${frame.mobile || "Not specified"}`,
    );
    lines.push(`- Captures saved: ${frame.captures.length}`);
    if (frame.outputAnnotations?.length) {
      lines.push(
        `- Generated-output correction marks: ${frame.outputAnnotations.length} overlay stroke(s) on the connected output preview. Treat these as direct visual tweak instructions for this frame.`,
      );
    }

    const outgoingConnections = state.connections.filter(
      (connection) => connection.fromFrameId === frame.id,
    );
    if (outgoingConnections.length) {
      lines.push(
        `- Outgoing links: ${outgoingConnections.map((connection) => `${connection.label || "continue"} -> ${frameTitleById(connection.toFrameId)}`).join("; ")}`,
      );
    }
  });

  lines.push("");
  lines.push("## Flow graph");
  lines.push(`- Entry frame: ${frameTitleById(state.entryFrameId)}`);
  if (state.connections.length) {
    state.connections.forEach((connection) => {
      const noteSuffix = connection.notes ? ` (${connection.notes})` : "";
      lines.push(
        `- ${frameTitleById(connection.fromFrameId)} -> ${frameTitleById(connection.toFrameId)} via ${connection.label || "continue"}${noteSuffix}`,
      );
    });
  } else {
    lines.push(
      "- No explicit flow links. Use frame order only if the notes imply sequence.",
    );
  }

  const rewriteQueue = buildRewriteQueue();
  if (rewriteQueue.length) {
    lines.push("");
    lines.push("## Rewrite queue");
    rewriteQueue.slice(0, 6).forEach((item) => {
      lines.push(`- ${item.title}: ${item.label}. ${item.detail}`);
    });
  }

  lines.push("");
  lines.push("## Output ask");
  lines.push(
    "Use this live canvas to produce the requested output. That may mean refining a UI, generating an image prompt, writing a spec, planning a Qt screen, or implementing code. Keep the sketch intent intact and call out ambiguities before inventing major behavior.",
  );

  return lines.join("\n");
}

function buildVoiceExport(frameSelection = state.frames) {
  const selectedFrames = Array.isArray(frameSelection) ? frameSelection : [];
  const selectedFrameIds = new Set(selectedFrames.map((frame) => frame.id));
  const frameLookup = new Map(
    selectedFrames.map((frame, index) => [
      frame.id,
      { frame, index: index + 1 },
    ]),
  );
  const segments = state.voice.segments
    .filter((segment) => {
      if (segment.scope === "session") {
        return true;
      }
      return segment.frameId && selectedFrameIds.has(segment.frameId);
    })
    .map((segment) => ({
      ...structuredClone(segment),
      frameTitle:
        segment.frameTitle ||
        (segment.frameId ? frameTitleById(segment.frameId) : "") ||
        "",
    }));

  const frameGroups = selectedFrames
    .map((frame) => {
      const items = segments.filter(
        (segment) => segment.scope === "frame" && segment.frameId === frame.id,
      );
      if (!items.length) {
        return null;
      }
      const lookup = frameLookup.get(frame.id);
      return {
        frameId: frame.id,
        frameTitle: frame.title,
        frameIndex: lookup?.index || 0,
        segments: items,
      };
    })
    .filter(Boolean);

  return {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    storageVersion: STORAGE_VERSION,
    activeScope: state.voice.scope,
    segmentCount: segments.length,
    sessionSegmentCount: segments.filter(
      (segment) => segment.scope === "session",
    ).length,
    frameSegmentCount: segments.filter((segment) => segment.scope === "frame")
      .length,
    latestSegmentAt: segments[0]?.at || "",
    segments,
    frameGroups,
  };
}

function buildVoiceSectionLines(
  voiceExport = buildVoiceExport(),
  { includeEmpty = true } = {},
) {
  const lines = [];
  if (!voiceExport.segmentCount) {
    if (includeEmpty) {
      lines.push("- No voice notes captured.");
    }
    return lines;
  }

  const boardSegments = voiceExport.segments.filter(
    (segment) => segment.scope === "session",
  );

  if (boardSegments.length) {
    lines.push("### Whole board");
    boardSegments.forEach((segment) => {
      lines.push(
        `- [${segment.at}] ${collapseVoiceTextForMarkdown(segment.text)}`,
      );
    });
  }

  voiceExport.frameGroups.forEach((group) => {
    if (lines.length) {
      lines.push("");
    }
    lines.push(`### Frame ${group.frameIndex}: ${group.frameTitle}`);
    group.segments.forEach((segment) => {
      lines.push(
        `- [${segment.at}] ${collapseVoiceTextForMarkdown(segment.text)}`,
      );
    });
  });

  return lines;
}

function buildVoiceMarkdown(frameSelection = state.frames) {
  const voiceExport = buildVoiceExport(frameSelection);
  const lines = [
    `# ${(state.board.project || "Canvax live canvas").trim()} voice notes`,
    "",
    "These spoken notes were captured in Canvax while the sketch was being developed.",
    "",
    `- Generated: ${new Date().toISOString()}`,
    `- Active scope when exported: ${voiceScopeLabel(state.voice.scope, currentFrame())}`,
    `- Total segments: ${voiceExport.segmentCount}`,
    `- Whole-board segments: ${voiceExport.sessionSegmentCount}`,
    `- Frame-scoped segments: ${voiceExport.frameSegmentCount}`,
    "",
  ];

  lines.push(...buildVoiceSectionLines(voiceExport, { includeEmpty: true }));
  return lines.join("\n");
}

function collapseVoiceTextForMarkdown(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

async function buildExportPackage(frameSelection = state.frames) {
  const rewriteQueue = buildRewriteQueue(frameSelection);
  const selectedFrames = [];
  for (const [index, frame] of frameSelection.entries()) {
    await ensureImage(frame.backgroundImage);
    const viewport = viewportPresets[frame.viewport];
    selectedFrames.push({
      id: frame.id,
      index: index + 1,
      title: frame.title,
      viewport: frame.viewport,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      objective: frame.objective,
      layout: frame.layout,
      motion: frame.motion,
      assets: frame.assets,
      mobile: frame.mobile,
      flowPosition: frame.flowPosition,
      updatedAt: frame.updatedAt,
      captureCount: frame.captures.length,
      outputAnnotationCount: frame.outputAnnotations?.length || 0,
      outputAnnotations: (frame.outputAnnotations || []).map(
        summarizeOutputAnnotation,
      ),
      snapshotDataUrl: renderFrameToDataUrl(frame, {
        maxWidth: 1400,
        mime: "image/jpeg",
        quality: 0.9,
      }),
      thumbnailDataUrl: frameThumbnailDataUrl(frame, {
        maxWidth: 420,
        mime: "image/jpeg",
        quality: 0.84,
      }),
    });
  }

  return {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    storageVersion: STORAGE_VERSION,
    generatedAt: new Date().toISOString(),
    transport: currentTransportDescriptor(),
    workspaceMode: state.workspaceMode,
    board: state.board,
    activeFrameId: state.activeFrameId,
    entryFrameId: state.entryFrameId,
    connections: state.connections.map((connection) => ({
      ...connection,
      fromTitle: frameTitleById(connection.fromFrameId),
      toTitle: frameTitleById(connection.toFrameId),
    })),
    rewriteQueue,
    voice: buildVoiceExport(frameSelection),
    prompt: buildPromptMarkdown(),
    frames: selectedFrames,
    taskPack: buildTaskPack(selectedFrames, rewriteQueue),
    imagePromptPack: buildImagePromptPack(selectedFrames),
  };
}

function buildTaskPack(frames, rewriteQueue = buildRewriteQueue()) {
  const activeFrame = frames.find((frame) => frame.id === state.activeFrameId);
  const actionMode = currentActionMode();
  return {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    kind: "canvax-task-pack",
    generatedAt: new Date().toISOString(),
    actionMode: actionMode.id,
    actionModeLabel: actionMode.label,
    actionModeDescription: actionMode.description,
    hostLane: {
      mode: "codex-host-capability",
      requiresOpenAiApiKey: false,
      capabilities: state.serverStatus.hostCapabilities || null,
      note:
        "Canvax prepares the task. Codex/ChatGPT host capabilities may generate images or code when available.",
    },
    designContext: currentDesignContextForExport(),
    board: structuredClone(state.board),
    activeFrameId: state.activeFrameId,
    activeFrameTitle: activeFrame?.title || frameTitleById(state.activeFrameId),
    rewriteQueue,
    voice: buildVoiceExport(state.frames),
    imagePromptPackPath: "exports/canvax-image-prompt-pack-latest.json",
    frames: frames.map((frame) => ({
      id: frame.id,
      index: frame.index,
      title: frame.title,
      viewport: frame.viewport,
      viewportWidth: frame.viewportWidth,
      viewportHeight: frame.viewportHeight,
      intent: frame.objective,
      notes: frame.layout,
      behavior: frame.motion,
      assets: frame.assets,
      variants: frame.mobile,
      snapshotPath: frame.snapshotPath || "",
      outputAnnotationCount: frame.outputAnnotationCount || 0,
      composition: buildFrameComposition(currentFrameById(frame.id) || frame),
    })),
  };
}

function buildImagePromptPack(frames) {
  const activeFrame = frames.find((frame) => frame.id === state.activeFrameId);
  const generationRecipe = generationSummaryText(state.board.generation);
  const actionMode = currentActionMode();
  return {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    kind: "canvax-image-prompt-pack",
    generatedAt: new Date().toISOString(),
    requiresOpenAiApiKey: false,
    intendedHost:
      "Codex/ChatGPT image generation host lane, if available in the current chat.",
    actionMode: actionMode.id,
    actionModeLabel: actionMode.label,
    designContext: currentDesignContextForExport(),
    activeFrameId: state.activeFrameId,
    activeFrameTitle: activeFrame?.title || frameTitleById(state.activeFrameId),
    board: {
      project: state.board.project,
      ask: state.board.goal,
      surface: state.board.audience,
      mood: state.board.designMood,
      generationRecipe,
    },
    usage:
      "Give this prompt pack to ChatGPT image generation. Use the coordinates and HTML/CSS scaffold to preserve placement.",
    frames: frames.map((frame) => {
      const liveFrame = currentFrameById(frame.id) || frame;
      const composition = buildFrameComposition(liveFrame);
      return {
        id: frame.id,
        index: frame.index,
        title: frame.title,
        viewport: {
          id: frame.viewport,
          width: frame.viewportWidth,
          height: frame.viewportHeight,
          aspectRatio: `${frame.viewportWidth}:${frame.viewportHeight}`,
        },
        intent: frame.objective || state.board.goal,
        styleDirection: [
          state.board.designMood,
          frame.assets,
          frame.mobile,
          generationRecipe,
        ]
          .filter(Boolean)
          .join(" | "),
        prompt: buildImagePromptText(frame, composition),
        negativePrompt:
          "Do not ignore the rough composition. Avoid unreadable text, random extra UI, duplicated limbs or objects, warped perspective, unwanted logos, and generic AI-purple styling unless explicitly requested.",
        composition,
        htmlCssScaffold: buildImageHtmlCssScaffold(frame, composition),
        sketchReference: {
          snapshotPath: frame.snapshotPath || "",
          thumbnailPath: frame.thumbnailPath || "",
        },
      };
    }),
  };
}

function currentFrameById(frameId) {
  return state.frames.find((frame) => frame.id === frameId) || null;
}

function buildFrameComposition(frame) {
  const viewport = viewportPresets[frame.viewport] || viewportPresets.desktop;
  const elements = (frame.elements || [])
    .filter((element) => !isEraserElement(element))
    .map((element, index) =>
      summarizeCompositionElement(element, frame, viewport, index),
    )
    .filter(Boolean);
  return {
    viewport: {
      id: frame.viewport,
      label: viewport.label,
      width: viewport.width,
      height: viewport.height,
    },
    coordinateSystem:
      "Normalized x/y/w/h values are 0..1 relative to the frame viewport.",
    safeZones: buildSafeZones(viewport),
    elements,
    labels: elements.filter((element) => element.type === "label"),
    outputAnnotations: (frame.outputAnnotations || []).map(
      summarizeOutputAnnotation,
    ),
  };
}

function summarizeCompositionElement(element, frame, viewport, index) {
  const bounds = getElementBounds(element, frame);
  if (!bounds) {
    return null;
  }
  const normalizedBounds = normalizeBounds(bounds, viewport);
  return {
    id: element.id || `element-${index + 1}`,
    index: index + 1,
    type: element.type || "unknown",
    role: inferElementRole(element, normalizedBounds),
    text: element.type === "label" ? element.text || "" : "",
    color: element.color || "",
    strokeSize: element.size || 0,
    bounds: normalizedBounds,
    placement: describeBounds(normalizedBounds),
  };
}

function normalizeBounds(bounds, viewport) {
  const left = clamp(bounds.left / viewport.width, 0, 1);
  const top = clamp(bounds.top / viewport.height, 0, 1);
  const right = clamp(bounds.right / viewport.width, 0, 1);
  const bottom = clamp(bounds.bottom / viewport.height, 0, 1);
  return {
    x: roundNumber(left),
    y: roundNumber(top),
    w: roundNumber(Math.max(0, right - left)),
    h: roundNumber(Math.max(0, bottom - top)),
    centerX: roundNumber(left + Math.max(0, right - left) / 2),
    centerY: roundNumber(top + Math.max(0, bottom - top) / 2),
  };
}

function buildSafeZones(viewport) {
  return {
    content: {
      x: roundNumber(viewport.width > 600 ? 0.08 : 0.06),
      y: 0.08,
      w: roundNumber(viewport.width > 600 ? 0.84 : 0.88),
      h: 0.84,
    },
    avoidCriticalTextAtEdges: true,
  };
}

function inferElementRole(element, bounds) {
  if (element.type === "label") {
    return "semantic note or requested text";
  }
  if (element.type === "arrow" || element.type === "line") {
    return "direction, motion, visual emphasis, or connection";
  }
  if (element.type === "ellipse") {
    return "round object, avatar, image crop, spotlight, or circular UI";
  }
  if (element.type === "rect") {
    if (bounds.w > 0.45 && bounds.h > 0.22) {
      return "large content region, hero visual, panel, or page section";
    }
    return "card, button, image placeholder, text block, or layout region";
  }
  if (element.type === "path") {
    return "freehand sketch stroke or organic placement cue";
  }
  return "visual element";
}

function describeBounds(bounds) {
  const horizontal =
    bounds.centerX < 0.33 ? "left" : bounds.centerX > 0.67 ? "right" : "center";
  const vertical =
    bounds.centerY < 0.33 ? "top" : bounds.centerY > 0.67 ? "bottom" : "middle";
  return `${vertical}-${horizontal}`;
}

function buildImagePromptText(frame, composition) {
  const labels = composition.labels
    .map((label) => label.text)
    .filter(Boolean)
    .join("; ");
  const placements = composition.elements
    .slice(0, 14)
    .map((element) => `${element.role} at ${element.placement} (${element.bounds.x}, ${element.bounds.y}, ${element.bounds.w}, ${element.bounds.h})`)
    .join("; ");
  return [
    `Create an image/design for ${frame.title}.`,
    `Canvas: ${composition.viewport.label} ${composition.viewport.width}x${composition.viewport.height}.`,
    frame.objective ? `Intent: ${frame.objective}.` : "",
    frame.assets ? `Style and asset notes: ${frame.assets}.` : "",
    state.board.designMood ? `Mood: ${state.board.designMood}.` : "",
    labels ? `Text/semantic labels to respect: ${labels}.` : "",
    placements ? `Composition map: ${placements}.` : "",
    "Preserve the rough layout and relative positions. Improve polish, clarity, lighting, hierarchy, and craft.",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildImageHtmlCssScaffold(frame, composition) {
  const width = composition.viewport.width;
  const height = composition.viewport.height;
  const blocks = composition.elements
    .slice(0, 24)
    .map(
      (element) =>
        `  <div class="el ${escapeHtml(element.type)}" data-role="${escapeHtml(element.role)}">${escapeHtml(element.text || element.type)}</div>`,
    )
    .join("\n");
  const css = composition.elements
    .slice(0, 24)
    .map((element, index) => {
      const selector = `.el:nth-child(${index + 1})`;
      return `${selector}{left:${(element.bounds.x * 100).toFixed(2)}%;top:${(element.bounds.y * 100).toFixed(2)}%;width:${(element.bounds.w * 100).toFixed(2)}%;height:${(element.bounds.h * 100).toFixed(2)}%;}`;
    })
    .join("\n");
  return `<!-- Coordinate scaffold for image generation placement, not production UI. -->\n<div class="canvax-frame" style="position:relative;width:${width}px;height:${height}px;">\n${blocks}\n</div>\n<style>\n.canvax-frame{background:#fff8ec;overflow:hidden;}\n.el{position:absolute;border:2px solid #ff5d3a;border-radius:12px;color:#18110e;font:600 18px sans-serif;display:grid;place-items:center;padding:8px;}\n${css}\n</style>`;
}

function buildTaskPackMarkdown(taskPack) {
  if (!taskPack) {
    return "";
  }
  const lines = [
    `# ${(taskPack.board?.project || "Canvax").trim()} task pack`,
    "",
    `- Kind: ${taskPack.kind}`,
    `- Generated: ${taskPack.generatedAt}`,
    `- Action mode: ${taskPack.actionModeLabel || taskPack.actionMode}`,
    `- Active frame: ${taskPack.activeFrameTitle}`,
    `- Requires OpenAI API key: ${taskPack.hostLane?.requiresOpenAiApiKey ? "yes" : "no"}`,
    `- Design context: ${taskPack.designContext?.exists ? taskPack.designContext.relativePath : "No DESIGN.md found"}`,
    "",
    "## Instruction",
    "Use this task pack with the live Canvax export to build, refine, write a spec, or generate image prompts. Prefer frame composition and voice notes over guessing.",
    "",
    "## Frames",
  ];
  taskPack.frames.forEach((frame) => {
    lines.push(`- ${frame.index}. ${frame.title}: ${frame.intent || "No intent specified"} (${frame.composition.elements.length} composition elements)`);
  });
  return lines.join("\n");
}

function buildImagePromptPackMarkdown(pack) {
  if (!pack) {
    return "";
  }
  const lines = [
    `# ${(pack.board?.project || "Canvax").trim()} image prompt pack`,
    "",
    `- Requires OpenAI API key: ${pack.requiresOpenAiApiKey ? "yes" : "no"}`,
    `- Intended host: ${pack.intendedHost}`,
    `- Active frame: ${pack.activeFrameTitle}`,
    `- Action mode: ${pack.actionModeLabel || pack.actionMode || "Image prompt"}`,
    `- Design context: ${pack.designContext?.exists ? pack.designContext.relativePath : "No DESIGN.md found"}`,
    "",
    "## How To Use",
    "Use the prompt, composition map, and HTML/CSS scaffold as placement guidance for ChatGPT image generation. The scaffold is a spatial reference, not production code.",
  ];
  pack.frames.forEach((frame) => {
    lines.push("");
    lines.push(`## Frame ${frame.index}: ${frame.title}`);
    lines.push("");
    lines.push(frame.prompt);
    lines.push("");
    lines.push("### HTML/CSS Placement Scaffold");
    lines.push("");
    lines.push("```html");
    lines.push(frame.htmlCssScaffold);
    lines.push("```");
  });
  return lines.join("\n");
}

async function saveImagePromptPackForHost() {
  renderStatus("Saving no-API image prompt pack...");
  const result = await saveExportToWorkspace({ silent: true });
  if (!result) {
    renderStatus("Image prompt pack save failed");
    return;
  }
  const path =
    result.imagePromptPackMarkdownPath ||
    "exports/canvax-image-prompt-pack-latest.md";
  dom.workspaceStatus.textContent = `Image prompt pack ready at ${path}`;
  state.focusLastAppliedText =
    "Image prompt pack ready. Ask Codex/ChatGPT image generation to use it.";
  renderFocusPad();
  renderStatus("Image prompt pack ready for host image generation");
}

async function writeStarterDesignContext() {
  renderStatus("Creating starter DESIGN.md...");
  const content = buildStarterDesignContextMarkdown();

  try {
    const response = await fetch("/api/write-design-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, overwrite: false }),
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 409) {
      state.serverStatus = {
        ...state.serverStatus,
        designContext: data.designContext || state.serverStatus.designContext,
      };
      renderFocusPad();
      renderStatus("DESIGN.md already exists; Canvax did not overwrite it");
      return;
    }

    if (!response.ok) {
      throw new Error(data.error || "DESIGN.md write failed.");
    }

    state.serverStatus = {
      ...state.serverStatus,
      designContext: data.designContext || state.serverStatus.designContext,
    };
    await fetchServerStatus();
    renderFocusPad();
    renderPrompt();
    renderStatus("Starter DESIGN.md written from current Canvax board");
  } catch (error) {
    renderStatus(
      error instanceof Error
        ? error.message
        : "Starter DESIGN.md write failed",
    );
  }
}

function buildStarterDesignContextMarkdown() {
  const actionMode = currentActionMode();
  const generation = generationSummaryText(state.board.generation);
  const active = currentFrame();
  const date = new Date().toISOString();
  const lines = [
    "# Design Direction",
    "",
    `Generated by Canvax on ${date}.`,
    "",
    "## Project",
    "",
    `- Name: ${markdownInline(state.board.project, "Untitled Canvax project")}`,
    `- Current ask: ${markdownInline(state.board.goal, "Not specified")}`,
    `- Surface: ${markdownInline(state.board.audience, "Generic visual surface")}`,
    `- Mood: ${markdownInline(state.board.designMood, "Not specified")}`,
    `- Active action: ${actionMode.label}`,
    `- Generation recipe: ${generation}`,
    "",
    "## Visual System",
    "",
    `- Palette: ${palette.join(", ")}`,
    "- Typography: Use expressive display type for primary moments and a readable UI face for controls.",
    "- Layout: Preserve the rough Canvax composition, then improve hierarchy, spacing, responsiveness, and accessibility.",
    "- Motion: Prefer purposeful transitions tied to the sketch flow. Avoid decorative motion that hides meaning.",
    "- Asset rule: Keep generated images and illustrations aligned to labeled regions and frame notes.",
    "",
    "## Active Frame",
    "",
    ...starterDesignFrameLines(active, state.frames.indexOf(active) + 1),
    "",
    "## Frame Notes",
    "",
  ];

  state.frames.forEach((frame, index) => {
    lines.push(...starterDesignFrameLines(frame, index + 1));
    lines.push("");
  });

  lines.push(
    "## Codex Usage Rules",
    "",
    "- Treat this file as the reusable design contract for future Canvax task packs.",
    "- If a Canvax sketch conflicts with this file, ask whether the sketch is a one-off variation or an intentional design-system update.",
    "- Do not require an OpenAI API key to use this design direction.",
    "- For image generation, preserve the Canvax prompt-pack coordinates and safe zones.",
    "- For UI implementation, preserve the frame hierarchy while improving production quality.",
  );

  return lines.join("\n");
}

function starterDesignFrameLines(frame, index) {
  const composition = buildFrameComposition(frame);
  const labelTexts = composition.labels
    .map((label) => markdownInline(label.text))
    .filter(Boolean)
    .slice(0, 8);
  const elementSummary = composition.elements
    .slice(0, 8)
    .map(
      (element) =>
        `${element.index}. ${element.type} as ${element.role} at ${element.placement}`,
    );

  return [
    `### ${index}. ${markdownInline(frame.title, "Frame")}`,
    "",
    `- Viewport: ${composition.viewport.label} ${composition.viewport.width}x${composition.viewport.height}`,
    `- Intent: ${markdownInline(frame.objective || state.board.goal, "Not specified")}`,
    `- Structure: ${markdownInline(frame.layout, "Not specified")}`,
    `- Behavior: ${markdownInline(frame.motion, "Not specified")}`,
    `- Assets: ${markdownInline(frame.assets, "Not specified")}`,
    `- Variants: ${markdownInline(frame.mobile, "Not specified")}`,
    `- Labels: ${labelTexts.length ? labelTexts.join("; ") : "None"}`,
    `- Elements: ${elementSummary.length ? elementSummary.join("; ") : "No drawn elements yet"}`,
  ];
}

function markdownInline(value, fallback = "") {
  return cleanString(value)
    .replace(/\s+/g, " ")
    .replaceAll("|", "\\|")
    .slice(0, 1200) || fallback;
}

function roundNumber(value) {
  return Number(value.toFixed(4));
}

function checkpointReasonLabel(reason) {
  const labels = {
    "manual-push": "Manual checkpoint",
    "manual-freeze": "Manual freeze",
    "autosnap-freeze": "Autosnap freeze",
    "dictation-stop": "Dictation stop",
    "voice-note": "Voice note",
    "focus-apply": "Workbench apply",
    materialize: "Materialize",
    "generate-screen": "Generate screen",
    "publish-output": "Published output",
    "output-update": "Output update",
  };
  return labels[reason] || "Checkpoint";
}

function summarizeFrameForCheckpoint(frame, index) {
  return {
    id: frame.id,
    index: index + 1,
    title: frame.title,
    viewport: frame.viewport,
    objective: frame.objective,
    layout: frame.layout,
    motion: frame.motion,
    assets: frame.assets,
    mobile: frame.mobile,
    updatedAt: frame.updatedAt,
    captureCount: frame.captures.length,
    outputAnnotationCount: frame.outputAnnotations?.length || 0,
    latestCaptureAt: frame.captures[0]?.at || "",
  };
}

function summarizeOutputAnnotation(annotation) {
  return {
    id: annotation.id,
    type: annotation.type || "path",
    points: Array.isArray(annotation.points)
      ? annotation.points.map((point) => ({
          x: point.x,
          y: point.y,
        }))
      : [],
    color: annotation.color || palette[0],
    size: annotation.size || 8,
    alpha: annotation.alpha ?? 1,
    composite: annotation.composite || "source-over",
    targetId: annotation.targetId || "",
    targetLabel: annotation.targetLabel || "",
    targetVersionTag: annotation.targetVersionTag || "",
    createdAt: annotation.createdAt || "",
  };
}

function summarizeManifestItems(items, kind) {
  return items.map((item) => ({
    id: item.id || "",
    label: item.label || item.path || item.url || "",
    kind: item.kind || kind,
    path: item.path || item.previewPath || "",
    url: item.url || item.resolvedUrl || "",
    summary: item.summary || item.description || "",
    frameIds: Array.isArray(item.frameIds) ? [...item.frameIds] : [],
    source: item.source || "",
  }));
}

function buildCheckpointPayload(reason, exportResult = null, options = {}) {
  const frame = currentFrame();
  const manifest = state.serverStatus.previewManifest || null;
  const target = resolveManifestTargetEntry(manifest, state.activeFrameId);
  const artifacts = collectManifestArtifacts(manifest);
  const changes = collectManifestChanges(manifest);
  const rewriteQueue = buildRewriteQueue();
  const voice = buildVoiceExport();
  const totalCaptureCount = state.frames.reduce(
    (sum, entry) => sum + entry.captures.length,
    0,
  );

  return {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    storageVersion: STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    transport: currentTransportDescriptor(),
    reason,
    label:
      typeof options.label === "string" && options.label.trim()
        ? options.label.trim()
        : checkpointReasonLabel(reason),
    note:
      typeof options.note === "string" && options.note.trim()
        ? options.note.trim()
        : "",
    workspaceMode: state.workspaceMode,
    board: structuredClone(state.board),
    activeFrameId: state.activeFrameId,
    activeFrameTitle: frame?.title || "",
    entryFrameId: state.entryFrameId,
    connections: state.connections.map((connection) => ({
      ...structuredClone(connection),
      fromTitle: frameTitleById(connection.fromFrameId),
      toTitle: frameTitleById(connection.toFrameId),
    })),
    frames: state.frames.map((entry, index) =>
      summarizeFrameForCheckpoint(entry, index),
    ),
    voice,
    summary: {
      frameCount: state.frames.length,
      connectionCount: state.connections.length,
      captureCount: totalCaptureCount,
      voiceSegmentCount: voice.segmentCount,
      artifactCount: artifacts.length,
      changeCount: changes.length,
      pendingRewriteCount: rewriteQueue.length,
    },
    export:
      exportResult && typeof exportResult === "object"
        ? {
            archiveRoot: exportResult.archiveRoot || "",
            jsonPath: exportResult.jsonPath || "",
            markdownPath: exportResult.markdownPath || "",
            voiceMarkdownPath: exportResult.voiceMarkdownPath || "",
          }
        : null,
    previewTarget: target
      ? {
          id: target.id || "",
          label: target.label || "",
          type: target.type || "",
          previewPath: target.previewPath || "",
          url: target.url || target.resolvedUrl || "",
          source: target.source || "",
          description: target.description || "",
        }
      : null,
    outputDigest: state.serverStatus.outputDigest || null,
    rewriteQueue,
    artifacts: summarizeManifestItems(artifacts, "artifact"),
    changes: summarizeManifestItems(changes, "updated"),
    prompt: buildPromptMarkdown(),
  };
}

function buildExistingExportReference() {
  return {
    archiveRoot: state.saveNotice || "",
    jsonPath: state.serverStatus.liveJsonPath || "",
    markdownPath: state.serverStatus.liveMarkdownPath || "",
    voiceMarkdownPath: state.serverStatus.liveVoiceMarkdownPath || "",
  };
}

async function saveCheckpointToWorkspace(reason, options = {}) {
  const { silent = true, exportResult = null } = options;
  try {
    const resolvedExport =
      exportResult || (await saveExportToWorkspace({ silent: true }));
    const checkpoint = buildCheckpointPayload(reason, resolvedExport, options);
    const response = await fetch("/api/save-checkpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkpoint }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Checkpoint save failed.");
    }

    state.serverStatus = {
      ...state.serverStatus,
      checkpointHistory:
        data.checkpointHistory || state.serverStatus.checkpointHistory,
      checkpointLatestPath:
        data.latestCheckpointPath || state.serverStatus.checkpointLatestPath,
      checkpointsIndexPath:
        data.checkpointsIndexPath || state.serverStatus.checkpointsIndexPath,
      sessionEventsPath:
        data.sessionEventsPath || state.serverStatus.sessionEventsPath,
    };
    renderCheckpointPanel();
    if (!silent) {
      dom.workspaceStatus.textContent = `Checkpoint saved to ${data.latestCheckpointPath}`;
    }
    return data;
  } catch (error) {
    if (!silent) {
      dom.workspaceStatus.textContent =
        error instanceof Error ? error.message : "Checkpoint save failed.";
    }
    return null;
  }
}

function normalizeMaterializePoint(point) {
  return {
    x: Number(point?.x) || 0,
    y: Number(point?.y) || 0,
  };
}

function normalizeMaterializeBounds(bounds) {
  if (!bounds) {
    return null;
  }
  return {
    left: Number(bounds.left) || 0,
    top: Number(bounds.top) || 0,
    right: Number(bounds.right) || 0,
    bottom: Number(bounds.bottom) || 0,
    width: Number(bounds.width) || 0,
    height: Number(bounds.height) || 0,
  };
}

function buildMaterializeElement(element, frame = currentFrame()) {
  if (!element || typeof element !== "object") {
    return null;
  }
  if (isEraserElement(element)) {
    return null;
  }

  const base = {
    id: element.id || uid("element"),
    type: element.type || "unknown",
    color: normalizeColor(element.color, state.color),
    size: Number(element.size) || 0,
    alpha: Number.isFinite(element.alpha) ? element.alpha : 1,
    composite:
      typeof element.composite === "string" ? element.composite : "source-over",
    groupId: typeof element.groupId === "string" ? element.groupId : "",
    bounds: normalizeMaterializeBounds(getElementBounds(element, frame)),
  };

  if (element.type === "path") {
    return {
      ...base,
      points: Array.isArray(element.points)
        ? element.points.map((point) => normalizeMaterializePoint(point))
        : [],
    };
  }

  if (element.type === "label") {
    const resolved = resolveLabelPosition(element, frame);
    return {
      ...base,
      text: typeof element.text === "string" ? element.text : "",
      x: Number(element.x) || 0,
      y: Number(element.y) || 0,
      attachedTo:
        typeof element.attachedTo === "string" ? element.attachedTo : "",
      anchor:
        element.anchor && typeof element.anchor === "object"
          ? {
              xRatio: Number(element.anchor.xRatio) || 0,
              yRatio: Number(element.anchor.yRatio) || 0,
            }
          : null,
      resolvedPosition: {
        x: Number(resolved.x) || 0,
        y: Number(resolved.y) || 0,
        attached: Boolean(resolved.attached),
      },
    };
  }

  return {
    ...base,
    start: normalizeMaterializePoint(element.start),
    end: normalizeMaterializePoint(element.end),
  };
}

async function buildMaterializePayload(frame = currentFrame()) {
  return buildMaterializePayloadWithMode(frame, { mode: "materialize" });
}

async function buildMaterializePayloadWithMode(
  frame = currentFrame(),
  { mode = "materialize" } = {},
) {
  const viewport = viewportPresets[frame.viewport] || viewportPresets.desktop;
  await ensureImage(frame.backgroundImage);
  return {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    storageVersion: STORAGE_VERSION,
    generatedAt: new Date().toISOString(),
    transport: currentTransportDescriptor(),
    board: structuredClone(state.board),
    generation: {
      mode: mode === "generate-screen" ? "generate-screen" : "materialize",
      ...normalizeGenerationConfig(state.board.generation),
      summary: generationSummaryText(state.board.generation),
    },
    frame: {
      id: frame.id,
      title: frame.title,
      viewport: frame.viewport,
      viewportLabel: viewport.label,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      objective: frame.objective,
      layout: frame.layout,
      motion: frame.motion,
      assets: frame.assets,
      mobile: frame.mobile,
      updatedAt: frame.updatedAt,
      captureCount: frame.captures.length,
      backgroundImage: frame.backgroundImage || "",
      snapshotDataUrl: renderFrameToDataUrl(frame, {
        mime: "image/png",
      }),
      thumbnailDataUrl: frameThumbnailDataUrl(frame, {
        maxWidth: 420,
        mime: "image/jpeg",
        quality: 0.84,
      }),
      elements: frame.elements
        .map((element) => buildMaterializeElement(element, frame))
        .filter(Boolean),
    },
  };
}

function renderFrameToDataUrl(frame, options = {}) {
  const cacheKey = buildFrameRenderCacheKey(frame, options);
  let frameCache = frameRenderCache.get(frame.id);
  if (!frameCache) {
    frameCache = new Map();
    frameRenderCache.set(frame.id, frameCache);
  }

  const cacheToken = buildFrameRenderCacheToken(frame);
  const cached = frameCache.get(cacheKey);
  if (cached?.token === cacheToken && typeof cached.dataUrl === "string") {
    return cached.dataUrl;
  }

  const dataUrl = renderFrameToDataUrlUncached(frame, options);
  frameCache.set(cacheKey, {
    token: cacheToken,
    dataUrl,
  });
  return dataUrl;
}

function frameThumbnailDataUrl(
  frame,
  options = { maxWidth: 420, mime: "image/jpeg", quality: 0.84 },
) {
  if (!frame) {
    return "";
  }
  if (!shouldRenderLiveFrameThumbnail(frame)) {
    return frame.thumbnail || "";
  }
  return renderFrameToDataUrl(frame, options);
}

function shouldRenderLiveFrameThumbnail(frame) {
  return !frame.thumbnail || frameHasEraserStroke(frame);
}

function frameHasEraserStroke(frame) {
  return (frame.elements || []).some((element) => isEraserElement(element));
}

function isEraserElement(element) {
  return element?.composite === "destination-out";
}

function buildFrameRenderCacheKey(
  frame,
  { maxWidth, mime = "image/png", quality = 0.92 } = {},
) {
  return [
    FRAME_RENDERER_VERSION,
    frame.viewport,
    state.grid ? "grid" : "nogrid",
    maxWidth || "full",
    mime,
    Number(quality).toFixed(2),
  ].join("|");
}

function buildFrameRenderCacheToken(frame) {
  return [
    FRAME_RENDERER_VERSION,
    frame.updatedAt || "",
    frame.backgroundImage || "",
    Array.isArray(frame.elements) ? frame.elements.length : 0,
    Array.isArray(frame.elements)
      ? frame.elements
          .map((element) =>
            [
              element.id || "",
              element.type || "",
              element.composite || "",
              element.color || "",
              element.size || "",
              element.points?.length || "",
              element.start?.x || "",
              element.start?.y || "",
              element.end?.x || "",
              element.end?.y || "",
            ].join(":"),
          )
          .join(",")
      : "",
    Array.isArray(frame.captures) ? frame.captures.length : 0,
    frame.thumbnail || "",
  ].join("|");
}

function pruneFrameRenderCache(frames = state.frames) {
  const validFrameIds = new Set(
    Array.isArray(frames)
      ? frames.map((frame) => frame.id).filter(Boolean)
      : [],
  );
  [...frameRenderCache.keys()].forEach((frameId) => {
    if (!validFrameIds.has(frameId)) {
      frameRenderCache.delete(frameId);
    }
  });
}

function renderFrameToDataUrlUncached(
  frame,
  { maxWidth, mime = "image/png", quality = 0.92 } = {},
) {
  const viewport = viewportPresets[frame.viewport];
  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = viewport.width;
  baseCanvas.height = viewport.height;
  const baseContext = baseCanvas.getContext("2d");
  drawScene(baseContext, frame, viewport.width, viewport.height, 1, null);

  if (!maxWidth || viewport.width <= maxWidth) {
    return baseCanvas.toDataURL(mime, quality);
  }

  const scale = maxWidth / viewport.width;
  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = Math.round(viewport.width * scale);
  previewCanvas.height = Math.round(viewport.height * scale);
  const previewContext = previewCanvas.getContext("2d");
  previewContext.drawImage(
    baseCanvas,
    0,
    0,
    previewCanvas.width,
    previewCanvas.height,
  );
  return previewCanvas.toDataURL(mime, quality);
}

async function saveExportToWorkspace(options = {}) {
  const { silent = false } = options;
  try {
    dom.saveWorkspace.disabled = true;
    if (!silent) {
      dom.workspaceStatus.textContent = "Saving latest export to workspace...";
    }
    const exportPackage = await buildExportPackage();
    const response = await fetch("/api/save-export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package: exportPackage,
        markdown: dom.specOutput.value,
        voiceMarkdown: buildVoiceMarkdown(),
        taskPackMarkdown: buildTaskPackMarkdown(exportPackage.taskPack),
        imagePromptPackMarkdown: buildImagePromptPackMarkdown(
          exportPackage.imagePromptPack,
        ),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Export save failed.");
    }
    state.saveNotice = data.archiveRoot;
    await publishWorkspaceOutput({
      silent: true,
      skipCheckpoint: true,
    });
    persistState();
    dom.workspaceStatus.textContent = silent
      ? `Live canvas synced to ${data.jsonPath}`
      : `Saved latest export to ${data.jsonPath}`;
    return data;
  } catch (error) {
    if (!silent) {
      dom.workspaceStatus.textContent =
        error instanceof Error ? error.message : "Export save failed.";
    }
    return null;
  } finally {
    dom.saveWorkspace.disabled = false;
  }
}

async function generateCurrentScreen(options = {}) {
  return materializeCurrentFrame({
    ...options,
    mode: "generate-screen",
  });
}

async function materializeCurrentFrame(options = {}) {
  const {
    silent = false,
    announce = true,
    openPreview = true,
    skipCheckpoint = false,
    exportResult = null,
    mode = "materialize",
  } = options;
  const frame = currentFrame();
  if (!frame) {
    return null;
  }
  const isGenerateScreen = mode === "generate-screen";
  const actionLabel = isGenerateScreen ? "Generate screen" : "Materialize";
  const inFlightLabel = isGenerateScreen ? "Generating..." : "Materializing...";
  const progressLabel = isGenerateScreen
    ? `Generating screen for ${frame.title}...`
    : `Materializing ${frame.title}...`;
  const completedLabel = isGenerateScreen ? "Generated screen" : "Materialized";
  const checkpointReason = isGenerateScreen ? "generate-screen" : "materialize";

  const hasCanvasState =
    frame.elements.length || frame.backgroundImage || frame.captures.length;
  if (!hasCanvasState) {
    if (!silent) {
      dom.workspaceStatus.textContent =
        `Add a sketch, labels, or a reference first, then ${actionLabel.toLowerCase()} it.`;
    }
    if (announce) {
      renderStatus(
        isGenerateScreen ? "Nothing to generate yet" : "Nothing to materialize yet",
      );
    }
    return null;
  }

  const originalGenerateLabel = dom.generateScreen.textContent;
  const originalMaterializeLabel = dom.materializeFrame.textContent;
  const originalGeneratePanelLabel = dom.generateScreenPanel.textContent;
  const originalMaterializePanelLabel = dom.materializeFramePanel.textContent;
  const originalFocusGenerateLabel = dom.focusGenerate.textContent;
  state.generationInFlight = true;
  try {
    dom.generateScreen.disabled = true;
    dom.materializeFrame.disabled = true;
    dom.generateScreenPanel.disabled = true;
    dom.materializeFramePanel.disabled = true;
    dom.focusGenerate.disabled = true;
    if (!silent) {
      dom.generateScreen.textContent = inFlightLabel;
      dom.materializeFrame.textContent = inFlightLabel;
      dom.generateScreenPanel.textContent = inFlightLabel;
      dom.materializeFramePanel.textContent = inFlightLabel;
      dom.focusGenerate.textContent = inFlightLabel;
      dom.workspaceStatus.textContent = progressLabel;
    }
    if (announce) {
      renderStatus(progressLabel);
    }
    const resolvedExport =
      exportResult || (await saveExportToWorkspace({ silent: true }));
    const payload = await buildMaterializePayloadWithMode(frame, { mode });
    const response = await fetch("/api/materialize-frame", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Materialize failed.");
    }

    state.serverStatus = {
      ...state.serverStatus,
      previewManifest:
        data.previewManifest || state.serverStatus.previewManifest,
      previewManifestPath:
        data.previewManifestPath ||
        state.serverStatus.previewManifestPath ||
        "",
    };
    renderCodexOutput();
    renderServerStatus();
    scheduleLivePreviewSync();
    void refreshPreviewStateFromServer();
    if (openPreview) {
      openPreviewWindow({ announce: false });
    }
    if (!skipCheckpoint) {
      void saveCheckpointToWorkspace(checkpointReason, {
        silent: true,
        exportResult: resolvedExport,
        note: isGenerateScreen
          ? `Generated a richer screen for ${frame.title} using ${generationSummaryText()}.`
          : `Materialized ${frame.title} from the current Canvax frame.`,
      });
    }
    if (!silent) {
      dom.workspaceStatus.textContent = `${completedLabel} ${frame.title} to ${data.previewPath}`;
    }
    if (announce) {
      renderStatus(`${completedLabel} ${frame.title}`);
    }
    return data;
  } catch (error) {
    if (!silent) {
      dom.workspaceStatus.textContent =
        error instanceof Error ? error.message : `${actionLabel} failed.`;
    }
    if (announce) {
      renderStatus(`${actionLabel} failed`);
    }
    return null;
  } finally {
    state.generationInFlight = false;
    dom.generateScreen.disabled = false;
    dom.materializeFrame.disabled = false;
    dom.generateScreenPanel.disabled = false;
    dom.materializeFramePanel.disabled = false;
    dom.focusGenerate.disabled = false;
    dom.generateScreen.textContent = originalGenerateLabel;
    dom.materializeFrame.textContent = originalMaterializeLabel;
    dom.generateScreenPanel.textContent = originalGeneratePanelLabel;
    dom.materializeFramePanel.textContent = originalMaterializePanelLabel;
    dom.focusGenerate.textContent = originalFocusGenerateLabel;
  }
}

async function installSkill() {
  try {
    dom.installSkill.disabled = true;
    dom.workspaceStatus.textContent = "Installing global Canvax skill...";
    const response = await fetch("/api/install-skill", { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Skill install failed.");
    }
    dom.workspaceStatus.textContent = data.message;
  } catch (error) {
    dom.workspaceStatus.textContent =
      error instanceof Error ? error.message : "Skill install failed.";
  } finally {
    dom.installSkill.disabled = false;
  }
}

async function publishWorkspaceOutput(options = {}) {
  const frame = currentFrame();
  const {
    silent = false,
    skipCheckpoint = false,
    frameId = frame?.id || "",
    frameTitle = frame?.title || "",
  } = options;
  const originalLabel = dom.codexPublishOutput.textContent;
  try {
    if (!silent) {
      dom.codexPublishOutput.disabled = true;
      dom.workspaceStatus.textContent =
        "Publishing workspace changes back into Canvax...";
    }
    const response = await fetch("/api/publish-workspace-output", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        frameId,
        frameTitle,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Workspace publish failed.");
    }

    state.serverStatus = {
      ...state.serverStatus,
      previewManifest:
        data.previewManifest || state.serverStatus.previewManifest || null,
    };
    renderCodexOutput();
    renderServerStatus();
    void refreshPreviewStateFromServer();
    if (!skipCheckpoint) {
      void saveCheckpointToWorkspace("publish-output", {
        silent: true,
        note:
          data.changeCount > 0
            ? `Published ${data.changeCount} workspace change${data.changeCount === 1 ? "" : "s"} for ${frameTitle || "the current board"}.`
            : "Published the current workspace state back into Canvax.",
      });
    }
    if (!silent) {
      dom.workspaceStatus.textContent =
        data.changeCount > 0
          ? `Published ${data.changeCount} workspace change${data.changeCount === 1 ? "" : "s"} to Canvax.`
          : "Published the current workspace state to Canvax.";
    }
    return data;
  } catch (error) {
    if (!silent) {
      dom.workspaceStatus.textContent =
        error instanceof Error ? error.message : "Workspace publish failed.";
    }
    return null;
  } finally {
    if (!silent) {
      dom.codexPublishOutput.disabled = false;
      dom.codexPublishOutput.textContent = originalLabel;
    }
  }
}

async function clearPublishedCodexOutput() {
  try {
    dom.codexClearOutput.disabled = true;
    dom.workspaceStatus.textContent = "Clearing published Codex output...";
    const response = await fetch("/api/publish-workspace-output", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Clear published output failed.");
    }

    state.serverStatus = {
      ...state.serverStatus,
      previewManifest:
        data.previewManifest || state.serverStatus.previewManifest || null,
    };
    renderCodexOutput();
    renderServerStatus();
    void refreshPreviewStateFromServer();
    dom.workspaceStatus.textContent = "Cleared published Codex output.";
  } catch (error) {
    dom.workspaceStatus.textContent =
      error instanceof Error ? error.message : "Clear published output failed.";
  } finally {
    dom.codexClearOutput.disabled = false;
  }
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(dom.specOutput.value);
    dom.workspaceStatus.textContent = "Build prompt copied to clipboard.";
  } catch {
    dom.workspaceStatus.textContent = "Clipboard copy failed in this browser.";
  }
}

function persistState() {
  const snapshot = buildPersistedSnapshot(state);
  pruneFrameRenderCache(snapshot.frames || []);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  scheduleLivePreviewSync();
}

function scheduleLivePreviewSync() {
  window.clearTimeout(state.livePreviewTimer);
  state.livePreviewTimer = window.setTimeout(() => {
    publishLivePreviewState();
  }, LIVE_PREVIEW_DEBOUNCE);
}

function publishLivePreviewState() {
  try {
    const payload = buildLivePreviewPayload();
    const raw = JSON.stringify(payload);
    window.localStorage.setItem(LIVE_PREVIEW_STORAGE_KEY, raw);
    livePreviewChannel?.postMessage(payload);
  } catch {
    // Ignore preview mirroring failures and preserve the main board workflow.
  }
}

function buildLivePreviewPayload() {
  const rewriteQueue = buildRewriteQueue();
  pruneFrameRenderCache();
  return {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    storageVersion: STORAGE_VERSION,
    updatedAt: new Date().toISOString(),
    transport: currentTransportDescriptor(),
    workspaceMode: state.workspaceMode,
    liveMarkdown: buildPromptMarkdown(),
    liveVoiceMarkdown: buildVoiceMarkdown(),
    previewManifest: state.serverStatus.previewManifest || null,
    rewriteQueue,
    liveExport: {
      generatedAt: new Date().toISOString(),
      transport: currentTransportDescriptor(),
      workspaceMode: state.workspaceMode,
      board: structuredClone(state.board),
      activeFrameId: state.activeFrameId,
      entryFrameId: state.entryFrameId,
      rewriteQueue,
      voice: buildVoiceExport(),
      connections: state.connections.map((connection) => ({
        ...structuredClone(connection),
        fromTitle: frameTitleById(connection.fromFrameId),
        toTitle: frameTitleById(connection.toFrameId),
      })),
      frames: state.frames.map((frame, index) => {
        const viewport = viewportPresets[frame.viewport];
        const isActive = frame.id === state.activeFrameId;
        return {
          id: frame.id,
          index: index + 1,
          title: frame.title,
          viewport: frame.viewport,
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
          objective: frame.objective,
          layout: frame.layout,
          motion: frame.motion,
          assets: frame.assets,
          mobile: frame.mobile,
          updatedAt: frame.updatedAt,
          captureCount: frame.captures.length,
          outputAnnotationCount: frame.outputAnnotations?.length || 0,
          outputAnnotations: (frame.outputAnnotations || []).map(
            summarizeOutputAnnotation,
          ),
          liveThumbnailDataUrl: frameThumbnailDataUrl(frame, {
            maxWidth: 320,
            mime: "image/jpeg",
            quality: 0.82,
          }),
          liveSnapshotDataUrl: isActive
            ? renderFrameToDataUrl(frame, {
                maxWidth: 1400,
                mime: "image/jpeg",
                quality: 0.9,
              })
            : "",
        };
      }),
      prompt: buildPromptMarkdown(),
    },
  };
}

function buildPersistedSnapshot(source) {
  return {
    version: STORAGE_VERSION,
    board: source.board,
    frames: source.frames,
    voice: source.voice,
    viewMode: source.viewMode,
    workspaceMode: source.workspaceMode,
    workbenchTrayCollapsed: Boolean(source.workbenchTrayCollapsed),
    connections: source.connections,
    entryFrameId: source.entryFrameId,
    activeFrameId: source.activeFrameId,
    tool: source.tool,
    color: source.color,
    size: source.size,
    grid: source.grid,
    autoSnap: source.autoSnap,
    zoom: source.zoom,
    saveNotice: source.saveNotice,
    statusText: source.statusText,
  };
}

function renderFrameOutputBadge(status) {
  if (!status?.label) {
    return "";
  }
  const title = status.detail || status.label;
  return `<span class="frame-status-badge ${escapeHtml(status.tone || "muted")}" title="${escapeHtml(title)}">${escapeHtml(status.label)}</span>`;
}

function resolveManifestTargetEntry(manifest, preferredFrameId = "") {
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
  return derivePreviewTargetFromArtifacts(manifest, preferredFrameId);
}

function collectManifestTargets(manifest) {
  if (!manifest || typeof manifest !== "object") {
    return [];
  }

  const values = [];
  if (Array.isArray(manifest.targets)) {
    values.push(...manifest.targets);
  }
  if (
    manifest.previewUrl ||
    manifest.url ||
    manifest.previewPath ||
    manifest.path
  ) {
    values.unshift(manifest);
  }

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
    const url = normalizeHref(value);
    if (!url) {
      return null;
    }
    return {
      id: index === 0 ? "primary" : `target-${index + 1}`,
      label: index === 0 ? "Primary preview" : `Preview target ${index + 1}`,
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
    };
  }

  const resolvedUrl = normalizeHref(
    value.resolvedUrl || value.url || value.previewUrl || value.targetUrl,
  );
  const previewPath =
    typeof value.previewPath === "string"
      ? value.previewPath.trim()
      : typeof value.path === "string"
        ? value.path.trim()
        : typeof value.htmlPath === "string"
          ? value.htmlPath.trim()
          : "";
  if (!resolvedUrl && !previewPath) {
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
    url: resolvedUrl,
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
  const resolvedUrl = normalizeHref(value.resolvedUrl || value.url);
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
    changedFields: Array.isArray(source.changedFields)
      ? source.changedFields.filter(Boolean)
      : [],
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

function describeTargetRefinement(target) {
  if (!target) {
    return "";
  }
  return target.changeSummary || target.refinement?.summary || "";
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
  { includeGlobal = false, manifest = state.serverStatus.previewManifest } = {},
) {
  if (!frame) {
    return null;
  }

  const specificTarget = findFrameSpecificTarget(manifest, frame.id);
  const target =
    specificTarget ||
    (includeGlobal ? resolveManifestTargetEntry(manifest, frame.id) : null);
  if (!target) {
    return null;
  }

  const detail =
    describeManifestFreshness(target, frame) ||
    describeTargetRefinement(target) ||
    target.label ||
    "";
  const stale = detail.startsWith("Current sketch is newer");
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
      target,
    };
  }

  if (!bound) {
    return {
      label: "Global target",
      tone: "muted",
      detail:
        detail ||
        "A connected output target exists, but it is not scoped to this frame.",
      target,
    };
  }

  return {
    label: generatedScreen
      ? "Generated screen"
      : materialized
        ? "Materialized"
        : "Output synced",
    tone: materialized ? "active" : "synced",
    detail:
      detail ||
      (generatedScreen
        ? "This frame has a connected generated screen."
        : materialized
        ? "This frame has a connected materialized preview."
        : "This frame has a connected output target."),
    target,
  };
}

function frameHasMeaningfulHandoff(frame) {
  if (!frame) {
    return false;
  }
  return Boolean(
    (Array.isArray(frame.elements) && frame.elements.length) ||
    (Array.isArray(frame.captures) && frame.captures.length) ||
    cleanString(frame.backgroundImage) ||
    cleanString(frame.objective) ||
    cleanString(frame.layout) ||
    cleanString(frame.motion) ||
    cleanString(frame.assets) ||
    cleanString(frame.mobile),
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

function buildRewriteQueue(
  frames = state.frames,
  manifest = state.serverStatus.previewManifest,
  activeFrameId = state.activeFrameId,
) {
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
        : "";

      if (specificTarget && freshness.startsWith("Current sketch is newer")) {
        return {
          id: `${frame.id}-stale`,
          frameId: frame.id,
          title: frame.title,
          label: "Needs refresh",
          reason: "stale-target",
          priority: 0,
          updatedAt: frame.updatedAt,
          detail: freshness,
        };
      }

      if (
        !specificTarget &&
        (relatedArtifacts.length || relatedChanges.length)
      ) {
        return {
          id: `${frame.id}-target`,
          frameId: frame.id,
          title: frame.title,
          label: "Needs target",
          reason: "missing-target",
          priority: 1,
          updatedAt: frame.updatedAt,
          detail: `This frame already has ${relatedArtifacts.length} artifact${relatedArtifacts.length === 1 ? "" : "s"} and ${relatedChanges.length} changed file${relatedChanges.length === 1 ? "" : "s"} bound to it, but no connected preview target yet.`,
        };
      }

      if (!specificTarget && frame.id === activeFrameId && hasAnyTargets) {
        return {
          id: `${frame.id}-binding`,
          frameId: frame.id,
          title: frame.title,
          label: "Needs frame binding",
          reason: "global-only",
          priority: 2,
          updatedAt: frame.updatedAt,
          detail:
            "Only a global target is attached right now. Bind a frame-specific target or rematerialize this frame to tighten the live rewrite loop.",
        };
      }

      if (!specificTarget && (!hasAnyTargets || frame.id === activeFrameId)) {
        return {
          id: `${frame.id}-first`,
          frameId: frame.id,
          title: frame.title,
          label: "Needs first output",
          reason: "first-output",
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
    })
    .map((item, index) => ({
      ...item,
      index: index + 1,
    }));
}

function describeManifestFreshness(target, frame) {
  if (!target || !frame) {
    return "";
  }

  const outputTime = Date.parse(
    target.sourceFrameUpdatedAt || target.generatedAt,
  );
  const frameTime = Date.parse(frame.updatedAt || "");
  if (!Number.isFinite(outputTime) || !Number.isFinite(frameTime)) {
    return "";
  }

  if (frameTime > outputTime + 1) {
    return `Current sketch is newer than this output. Rematerialize ${frame.title} to refresh it.`;
  }

  const syncedAt = target.sourceFrameUpdatedAt || target.generatedAt;
  return syncedAt
    ? `Output is synced with the sketch as of ${formatDateTime(syncedAt)}.`
    : "";
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
    resolvedUrl: normalizeHref(value.resolvedUrl || value.url),
    frameIds: Array.isArray(value.frameIds)
      ? value.frameIds.filter(Boolean)
      : [],
  };
}

function normalizeHref(value) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  try {
    return new URL(trimmed, window.location.origin).toString();
  } catch {
    return "";
  }
}

function timeLabel(dateString) {
  return formatDateTime(dateString);
}

function formatDateTime(dateString) {
  if (!dateString) {
    return "";
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

function exposeDebugHelpers() {
  window.__canvaxDebug = {
    state,
    currentFrame,
    currentConnection,
    addFrame,
    duplicateFrame,
    deleteFrame,
    undoFrame,
    redoFrame,
    freezeFrame,
    saveExportToWorkspace,
    upsertConnection,
    setCurrentFrameAsEntry,
    autoLayoutFlow,
  };
}

async function runSelfTest() {
  const results = [];
  const originalSnapshot = structuredClone(buildPersistedSnapshot(state));
  const originalRuntime = {
    serverStatus: structuredClone(state.serverStatus),
    selectedConnectionId: state.selectedConnectionId,
    pendingConnectionFromFrameId: state.pendingConnectionFromFrameId,
    selectedElementIds: [...state.selectedElementIds],
    selectedElementId: state.selectedElementId,
  };
  const startedFrameCount = state.frames.length;

  try {
    await sleep(50);
    results.push(
      assert(
        toolDefinitions.length ===
          dom.toolButtons.querySelectorAll("[data-tool]").length,
        "tool chips render",
      ),
    );
    results.push(
      assert(
        viewModes.length ===
          dom.viewModeButtons.querySelectorAll("[data-view-mode]").length,
        "view mode toggles render",
      ),
    );
    results.push(
      assert(
        palette.length ===
          dom.colorButtons.querySelectorAll("[data-color]").length,
        "color swatches render",
      ),
    );
    results.push(
      assert(
        Object.keys(viewportPresets).length ===
          dom.viewportSelect.options.length,
        "viewport presets render",
      ),
    );
    results.push(
      assert(
        actionModes.length === dom.focusActionModeSelect.options.length,
        "Workbench action modes render",
      ),
    );

    resetFrameForSelfTest();
    state.size = 22;
    renderColors();
    results.push(
      assert(
        dom.sizePreviewDot.style.width === "22px",
        "brush size preview updates before drawing",
      ),
    );
    state.size = 14;
    renderColors();

    await drawWithTool("pen", [120, 120], [260, 210]);
    results.push(assert(lastElement()?.type === "path", "pen draws a path"));

    await drawWithTool("marker", [280, 150], [440, 210]);
    results.push(
      assert(
        lastElement()?.type === "path" && lastElement()?.alpha === 0.42,
        "marker draws translucent path",
      ),
    );

    await drawWithTool("line", [120, 260], [320, 300]);
    results.push(
      assert(lastElement()?.type === "line", "line tool draws line"),
    );

    await drawWithTool("rect", [360, 260], [620, 420]);
    results.push(
      assert(lastElement()?.type === "rect", "rect tool draws rectangle"),
    );

    await drawWithTool("ellipse", [700, 260], [920, 430]);
    results.push(
      assert(lastElement()?.type === "ellipse", "oval tool draws ellipse"),
    );

    await drawWithTool("arrow", [140, 470], [420, 560]);
    results.push(
      assert(lastElement()?.type === "arrow", "arrow tool draws arrow"),
    );

    const ellipseBeforeMove = structuredClone(findElementByType("ellipse"));
    await drawWithTool("select", [810, 340], [880, 390]);
    const ellipseAfterMove = findElementByType("ellipse");
    results.push(
      assert(
        ellipseBeforeMove &&
          ellipseAfterMove &&
          (ellipseBeforeMove.start.x !== ellipseAfterMove.start.x ||
            ellipseBeforeMove.start.y !== ellipseAfterMove.start.y),
        "select tool moves an element",
      ),
    );

    const ellipseBeforeResize = structuredClone(findElementByType("ellipse"));
    setSelectedElements(
      ellipseAfterMove?.id ? [ellipseAfterMove.id] : [],
      ellipseAfterMove?.id || null,
    );
    renderCanvas();
    const ellipseResizeBounds = getElementBounds(ellipseAfterMove) || {
      right: ellipseAfterMove.end.x,
      bottom: ellipseAfterMove.end.y,
    };
    await drawWithTool(
      "select",
      [ellipseResizeBounds.right, ellipseResizeBounds.bottom],
      [ellipseResizeBounds.right + 64, ellipseResizeBounds.bottom + 48],
    );
    const ellipseAfterResize = findElementByType("ellipse");
    results.push(
      assert(
        ellipseBeforeResize &&
          ellipseAfterResize &&
          (Math.abs(ellipseAfterResize.end.x - ellipseBeforeResize.end.x) > 8 ||
            Math.abs(ellipseAfterResize.end.y - ellipseBeforeResize.end.y) > 8),
        "select tool resizes an element",
      ),
    );

    await addLabelForSelfTest("State A", [520, 160]);
    results.push(
      assert(lastElement()?.type === "label", "label tool adds label"),
    );

    await drawWithTool("erase", [150, 150], [200, 190]);
    results.push(
      assert(
        lastElement()?.composite === "destination-out",
        "eraser creates erase stroke",
      ),
    );
    results.push(assertEraserPreservesPaperLayer());
    results.push(assertEraserRemovesInk());
    results.push(assertWorkbenchRailSizeControls());

    const beforeUndo = currentFrame().elements.length;
    undoFrame();
    results.push(
      assert(
        currentFrame().elements.length === beforeUndo - 1,
        "undo removes last element",
      ),
    );
    redoFrame();
    results.push(
      assert(
        currentFrame().elements.length === beforeUndo,
        "redo restores last element",
      ),
    );

    const beforeFreeze = currentFrame().captures.length;
    freezeFrame(true);
    await sleep(150);
    results.push(
      assert(
        currentFrame().captures.length === beforeFreeze + 1,
        "freeze frame stores capture",
      ),
    );

    const beforeAdd = state.frames.length;
    addFrame();
    results.push(
      assert(state.frames.length === beforeAdd + 1, "add frame works"),
    );
    upsertConnection(state.frames[0].id, state.frames[1].id);
    results.push(
      assert(state.connections.length === 1, "flow link creation works"),
    );
    deleteSelectedConnection();
    results.push(
      assert(state.connections.length === 0, "flow link deletion works"),
    );
    upsertConnection(state.frames[0].id, state.frames[1].id);
    duplicateFrame();
    results.push(
      assert(state.frames.length === beforeAdd + 2, "duplicate frame works"),
    );
    deleteFrame();
    deleteFrame();
    results.push(
      assert(state.frames.length === beforeAdd, "delete frame works"),
    );

    const exportPackage = await buildExportPackage();
    results.push(
      assert(
        exportPackage.schemaVersion === HANDOFF_SCHEMA_VERSION,
        "export package includes schema version",
      ),
    );
    results.push(
      assert(
        exportPackage.transport?.mode === TRANSPORT_MODE,
        "export package includes transport metadata",
      ),
    );
    results.push(
      assert(
        exportPackage.taskPack?.kind === "canvax-task-pack",
        "export package includes Codex task pack",
      ),
    );
    results.push(
      assert(
        exportPackage.taskPack?.actionMode === currentActionMode().id &&
          exportPackage.taskPack?.designContext &&
          exportPackage.taskPack?.hostLane?.requiresOpenAiApiKey === false,
        "task pack includes action mode, design context, and no-API host lane",
      ),
    );
    results.push(
      assert(
        exportPackage.imagePromptPack?.kind === "canvax-image-prompt-pack" &&
          exportPackage.imagePromptPack.requiresOpenAiApiKey === false,
        "export package includes no-API image prompt pack",
      ),
    );
    const eraserId = currentFrame().elements.find((element) =>
      isEraserElement(element),
    )?.id;
    const imagePromptCompositionIds = new Set(
      (exportPackage.imagePromptPack?.frames || []).flatMap((frame) =>
        (frame.composition?.elements || []).map((element) => element.id),
      ),
    );
    results.push(
      assert(
        !eraserId || !imagePromptCompositionIds.has(eraserId),
        "image prompt pack excludes eraser strokes",
      ),
    );
    const checkpointPayload = buildCheckpointPayload("manual-push", {
      jsonPath: "exports/canvax-live-latest.json",
      markdownPath: "exports/canvax-live-latest.md",
      voiceMarkdownPath: "exports/canvax-voice-latest.md",
    });
    results.push(
      assert(
        checkpointPayload.schemaVersion === HANDOFF_SCHEMA_VERSION,
        "checkpoint payload includes schema version",
      ),
    );
    results.push(
      assert(
        checkpointPayload.transport?.future?.mode === FUTURE_TRANSPORT_MODE,
        "checkpoint payload carries future transport path",
      ),
    );

    const exportResult = await saveExportToWorkspace({ silent: true });
    results.push(
      assert(Boolean(state.saveNotice), "workspace export completes"),
    );
    results.push(
      assert(
        Boolean(state.serverStatus.previewManifest),
        "workspace publish manifest syncs",
      ),
    );
    const materializeResult = await materializeCurrentFrame({
      silent: true,
      announce: false,
      openPreview: false,
      skipCheckpoint: true,
      exportResult,
    });
    results.push(
      assert(
        Boolean(materializeResult?.previewPath),
        "materialize creates preview artifact",
        materializeResult?.previewPath ||
          dom.workspaceStatus.textContent ||
          "Materialize returned no preview path.",
      ),
    );
    const outputActivityItems = updateOutputActivityHistory(
      [],
      null,
      {
        digest: "output-initial",
        mode: "context-only",
        summary: "Initial output context",
        targetLabel: "",
        artifactCount: 0,
        changeCount: 2,
        refinementSummary: "",
        frameTitle: "Frame 1",
      },
      "2026-03-14T00:00:00.000Z",
    );
    const nextOutputActivityItems = updateOutputActivityHistory(
      outputActivityItems,
      { digest: "output-initial" },
      {
        digest: "output-next",
        mode: "target-connected",
        summary: "Connected preview updated",
        targetLabel: "Home preview",
        artifactCount: 1,
        changeCount: 3,
        refinementSummary: "Updated 2 regions",
        frameTitle: "Frame 1",
      },
      "2026-03-14T00:00:01.000Z",
    );
    results.push(
      assert(
        nextOutputActivityItems.length === 2 &&
          nextOutputActivityItems[0]?.digest === "output-next",
        "output activity history records digest changes",
      ),
    );
    const persistedOutputActivityItems = buildOutputActivityFromSessionEvents([
      {
        id: "checkpoint-output-1",
        at: "2026-03-14T00:00:02.000Z",
        reason: "output-update",
        label: "Output update",
        note: "Connected preview updated",
        summary: { changeCount: 4, artifactCount: 1 },
        outputDigest: {
          digest: "output-next",
          targetLabel: "Home preview",
          refinementSummary: "Updated 2 regions",
        },
      },
    ]);
    results.push(
      assert(
        persistedOutputActivityItems.length === 1 &&
          persistedOutputActivityItems[0]?.digest === "output-next",
        "session events rebuild output activity",
      ),
    );
    results.push(
      assert(
        mergeOutputActivityEntries(
          nextOutputActivityItems,
          persistedOutputActivityItems,
        ).length === 2,
        "output activity merge dedupes digest entries",
      ),
    );
    results.push(
      assert(
        buildExistingExportReference().jsonPath ===
          (state.serverStatus.liveJsonPath || ""),
        "existing export reference uses current server paths",
      ),
    );
    results.push(
      assert(
        frameHasMaterializedTarget(state.activeFrameId),
        "materialized frame target is tracked",
      ),
    );
    const rewriteQueueItems = buildRewriteQueue(
      [
        {
          id: "frame-selftest-rewrite",
          title: "Rewrite test",
          viewport: "desktop",
          objective: "Needs refresh",
          layout: "",
          motion: "",
          assets: "",
          mobile: "",
          backgroundImage: "",
          flowPosition: { x: 120, y: 120 },
          elements: [
            {
              id: "shape-1",
              type: "rect",
              start: { x: 80, y: 80 },
              end: { x: 300, y: 220 },
              color: palette[0],
              size: 4,
              alpha: 1,
              composite: "source-over",
              groupId: "",
            },
          ],
          thumbnail: "",
          captures: [],
          createdAt: "2026-03-14T00:00:00.000Z",
          updatedAt: "2026-03-14T00:00:02.000Z",
        },
      ],
      {
        targets: [
          {
            id: "materialize-target-frame-selftest-rewrite",
            label: "Rewrite test materialized",
            source: "canvax-materialize",
            type: "materialized-preview",
            previewPath:
              "artifacts/preview/materialized/frame-selftest-rewrite/index.html",
            frameIds: ["frame-selftest-rewrite"],
            sourceFrameId: "frame-selftest-rewrite",
            sourceFrameUpdatedAt: "2026-03-14T00:00:01.000Z",
          },
        ],
      },
      "frame-selftest-rewrite",
    );
    results.push(
      assert(
        rewriteQueueItems.length === 1 &&
          rewriteQueueItems[0]?.label === "Needs refresh",
        "rewrite queue flags stale frame output",
      ),
    );
    await exerciseLargeSessionSelfTest(results);
    results.push(
      assert(
        state.frames.length === startedFrameCount,
        "self-test restores frame count",
      ),
    );
  } catch (error) {
    results.push({
      name: "self-test runtime",
      passed: false,
      detail:
        error instanceof Error ? error.message : "Unknown self-test error",
    });
  } finally {
    restoreStateAfterSelfTest(originalSnapshot, originalRuntime);
  }

  renderSelfTestResults(results);
}

function restoreStateAfterSelfTest(snapshot, runtime) {
  state.board = structuredClone(snapshot.board);
  state.frames = structuredClone(snapshot.frames);
  state.voice = structuredClone(snapshot.voice);
  state.viewMode = snapshot.viewMode;
  state.workspaceMode = snapshot.workspaceMode;
  state.workbenchTrayCollapsed = Boolean(snapshot.workbenchTrayCollapsed);
  state.connections = structuredClone(snapshot.connections);
  state.entryFrameId = snapshot.entryFrameId;
  state.activeFrameId = snapshot.activeFrameId;
  state.tool = snapshot.tool;
  state.color = snapshot.color;
  state.size = snapshot.size;
  state.grid = snapshot.grid;
  state.autoSnap = snapshot.autoSnap;
  state.zoom = snapshot.zoom;
  state.saveNotice = snapshot.saveNotice;
  state.statusText = snapshot.statusText;
  state.serverStatus = structuredClone(runtime.serverStatus);
  state.selectedConnectionId = runtime.selectedConnectionId;
  state.pendingConnectionFromFrameId = runtime.pendingConnectionFromFrameId;
  state.selectedElementIds = [...runtime.selectedElementIds];
  state.selectedElementId = runtime.selectedElementId;
  state.outputAnnotationDraft = null;
  state.draftElement = null;
  state.isDrawing = false;
  state.flowDrag = null;
  state.flowConnectionDraft = null;
  state.hoverElementId = null;
  state.elementTransform = null;
  state.labelDraft = null;
  pruneFrameRenderCache(state.frames);
  persistState();
  renderAll();
}

function assertEraserPreservesPaperLayer() {
  const previousGrid = state.grid;
  const previousSelection = selectionIds();
  const previousSelectedElementId = state.selectedElementId;
  const samplePoint = { x: 216, y: 216 };
  const eraserFrame = createFrame({
    title: "Eraser render check",
    viewport: "desktop",
    elements: [
      {
        id: "selftest-eraser",
        type: "path",
        points: [
          { x: samplePoint.x - 40, y: samplePoint.y - 40 },
          { x: samplePoint.x, y: samplePoint.y },
          { x: samplePoint.x + 40, y: samplePoint.y + 40 },
        ],
        color: ERASER_COLOR,
        size: 42,
        alpha: 1,
        composite: "destination-out",
      },
    ],
  });
  const baselineFrame = createFrame({
    title: "Eraser baseline",
    viewport: "desktop",
    elements: [],
  });

  state.grid = true;
  clearElementSelection();
  const baseline = sampleFramePixel(baselineFrame, samplePoint);
  const actual = sampleFramePixel(eraserFrame, samplePoint);
  state.grid = previousGrid;
  setSelectedElements(previousSelection, previousSelectedElementId);

  const distance = colorDistance(baseline, actual);
  const blackish = actual[0] < 35 && actual[1] < 35 && actual[2] < 35;
  return assert(
    actual[3] > 240 && distance < 10 && !blackish,
    "eraser preserves paper and grid layer",
    `baseline=${baseline.join(",")} actual=${actual.join(",")}`,
  );
}

function assertEraserRemovesInk() {
  const previousGrid = state.grid;
  const previousSelection = selectionIds();
  const previousSelectedElementId = state.selectedElementId;
  const samplePoint = { x: 260, y: 260 };
  const inkElement = {
    id: "selftest-visible-ink",
    type: "path",
    points: [
      { x: samplePoint.x - 48, y: samplePoint.y },
      { x: samplePoint.x, y: samplePoint.y },
      { x: samplePoint.x + 48, y: samplePoint.y },
    ],
    color: "#ff3b1f",
    size: 46,
    alpha: 1,
    composite: "source-over",
  };
  const eraseElement = {
    id: "selftest-visible-eraser",
    type: "path",
    points: [
      { x: samplePoint.x - 56, y: samplePoint.y },
      { x: samplePoint.x, y: samplePoint.y },
      { x: samplePoint.x + 56, y: samplePoint.y },
    ],
    color: ERASER_COLOR,
    size: 64,
    alpha: 1,
    composite: "destination-out",
  };
  const baselineFrame = createFrame({
    title: "Eraser removal baseline",
    viewport: "desktop",
    elements: [],
  });
  const inkFrame = createFrame({
    title: "Eraser removal ink",
    viewport: "desktop",
    elements: [inkElement],
  });
  const erasedFrame = createFrame({
    title: "Eraser removal check",
    viewport: "desktop",
    elements: [inkElement, eraseElement],
  });

  state.grid = true;
  clearElementSelection();
  const baseline = sampleFramePixel(baselineFrame, samplePoint);
  const inkOnly = sampleFramePixel(inkFrame, samplePoint);
  const actual = sampleFramePixel(erasedFrame, samplePoint);
  state.grid = previousGrid;
  setSelectedElements(previousSelection, previousSelectedElementId);

  const inkWasVisible = colorDistance(baseline, inkOnly) > 40;
  const erasedToPaper = colorDistance(baseline, actual) < 12;
  return assert(
    inkWasVisible && erasedToPaper,
    "eraser removes existing ink without damaging paper",
    `baseline=${baseline.join(",")} ink=${inkOnly.join(",")} actual=${actual.join(",")}`,
  );
}

function sampleFramePixel(frame, point) {
  const viewport = viewportPresets[frame.viewport] || viewportPresets.desktop;
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  drawScene(context, frame, viewport.width, viewport.height, 1, null);
  return Array.from(
    context.getImageData(Math.round(point.x), Math.round(point.y), 1, 1).data,
  );
}

function colorDistance(a, b) {
  return Math.hypot(
    (a?.[0] || 0) - (b?.[0] || 0),
    (a?.[1] || 0) - (b?.[1] || 0),
    (a?.[2] || 0) - (b?.[2] || 0),
    (a?.[3] || 0) - (b?.[3] || 0),
  );
}

function assertWorkbenchRailSizeControls() {
  const previousSize = state.size;
  const previousTool = state.tool;
  const previousSelection = [...state.selectedElementIds];
  const previousSelectedElementId = state.selectedElementId;
  const frame = currentFrame();
  const previousElements = structuredClone(frame.elements);

  handleWorkbenchRailAction("size-up");
  const increased = state.size === Math.min(48, previousSize + 2);
  handleWorkbenchRailAction("size-down");
  const restored = state.size === previousSize;

  const selectedElement = {
    id: "selftest-size-selection",
    type: "rect",
    start: { x: 40, y: 40 },
    end: { x: 120, y: 120 },
    color: palette[0],
    size: 10,
    alpha: 1,
    composite: "source-over",
  };
  frame.elements = [selectedElement];
  state.tool = "select";
  setSelectedElements([selectedElement.id], selectedElement.id);
  handleWorkbenchRailAction("size-up");
  const selectedIncreased = frame.elements[0]?.size === 12;
  const globalUnchanged = state.size === previousSize;

  frame.elements = previousElements;
  state.tool = previousTool;
  setSelectedElements(previousSelection, previousSelectedElementId);
  state.size = previousSize;
  persistState();
  renderColors();
  renderBrushPreview();
  renderFocusPad();
  return assert(
    increased && restored && selectedIncreased && globalUnchanged,
    "Workbench rail size controls update brush or selected element",
  );
}

function resetFrameForSelfTest() {
  const frame = currentFrame();
  state.viewMode = "frame";
  state.connections = [];
  state.selectedConnectionId = null;
  state.pendingConnectionFromFrameId = null;
  state.entryFrameId = frame.id;
  clearElementSelection();
  state.elementTransform = null;
  frame.elements = [];
  frame.captures = [];
  frame.thumbnail = "";
  frame.backgroundImage = "";
  frame.objective = "Self-test frame";
  frame.layout = "Used to validate drawing tools and export flow.";
  frame.motion = "";
  frame.assets = "";
  frame.mobile = "";
  persistState();
  renderAll();
}

async function drawWithTool(tool, start, end) {
  clickTool(tool);
  await sleep(30);
  dispatchPointerSequence(start, end);
  await sleep(30);
}

async function addLabelForSelfTest(text, point) {
  clickTool("label");
  dispatchPointerTap(point);
  dom.labelEditorInput.value = text;
  commitLabelEditor();
  await sleep(30);
}

async function exerciseLargeSessionSelfTest(results) {
  const original = {
    frames: structuredClone(state.frames),
    connections: structuredClone(state.connections),
    activeFrameId: state.activeFrameId,
    entryFrameId: state.entryFrameId,
    selectedConnectionId: state.selectedConnectionId,
    pendingConnectionFromFrameId: state.pendingConnectionFromFrameId,
    voice: structuredClone(state.voice),
  };

  try {
    const fixture = buildLargeSessionFixture(12);
    state.frames = fixture.frames;
    state.connections = fixture.connections;
    state.activeFrameId = fixture.frames[0].id;
    state.entryFrameId = fixture.frames[0].id;
    state.selectedConnectionId = null;
    state.pendingConnectionFromFrameId = null;
    state.voice = {
      ...createInitialVoiceState(),
      scope: "frame",
      segments: fixture.voiceSegments,
    };
    persistState();

    const exportPackage = await buildExportPackage(state.frames);
    const previewPayload = buildLivePreviewPayload();
    const checkpointPayload = buildCheckpointPayload("manual-push", {
      jsonPath: "exports/canvax-live-latest.json",
      markdownPath: "exports/canvax-live-latest.md",
      voiceMarkdownPath: "exports/canvax-voice-latest.md",
    });

    results.push(
      assert(
        exportPackage.frames.length === fixture.frames.length,
        "large-session export keeps all frames",
      ),
    );
    results.push(
      assert(
        exportPackage.connections.length === fixture.connections.length,
        "large-session export keeps all flow links",
      ),
    );
    results.push(
      assert(
        exportPackage.voice.segmentCount === fixture.voiceSegments.length,
        "large-session export keeps voice segments",
      ),
    );
    results.push(
      assert(
        previewPayload.liveExport.frames.length === fixture.frames.length,
        "large-session live preview mirrors all frames",
      ),
    );
    results.push(
      assert(
        checkpointPayload.summary.frameCount === fixture.frames.length &&
          checkpointPayload.summary.connectionCount ===
            fixture.connections.length,
        "large-session checkpoint summary stays consistent",
      ),
    );
  } finally {
    state.frames = original.frames;
    state.connections = original.connections;
    state.activeFrameId = original.activeFrameId;
    state.entryFrameId = original.entryFrameId;
    state.selectedConnectionId = original.selectedConnectionId;
    state.pendingConnectionFromFrameId = original.pendingConnectionFromFrameId;
    state.voice = original.voice;
    persistState();
    renderAll();
  }
}

function buildLargeSessionFixture(frameCount = 12) {
  const frames = Array.from({ length: frameCount }, (_, index) =>
    buildLargeSessionFrame(index),
  );
  const connections = [];
  for (let index = 0; index < frames.length - 1; index += 1) {
    connections.push(
      normalizeConnection({
        id: uid("connection"),
        fromFrameId: frames[index].id,
        toFrameId: frames[index + 1].id,
        label: index % 3 === 0 ? "continue" : "next",
        notes: index % 2 === 0 ? "Primary path" : "",
      }),
    );
    if (index + 2 < frames.length && index % 3 === 0) {
      connections.push(
        normalizeConnection({
          id: uid("connection"),
          fromFrameId: frames[index].id,
          toFrameId: frames[index + 2].id,
          label: "alternate",
          notes: "Optional branch",
        }),
      );
    }
  }

  const voiceSegments = frames.flatMap((frame, index) => [
    {
      id: uid("voice"),
      text: `Frame ${index + 1} covers the ${frame.title.toLowerCase()} state.`,
      at: new Date(Date.now() + index * 1000).toISOString(),
      scope: "frame",
      provider: "self-test",
      frameId: frame.id,
      frameTitle: frame.title,
    },
    ...(index % 4 === 0
      ? [
          {
            id: uid("voice"),
            text: `Global note ${index / 4 + 1}: keep transitions lightweight.`,
            at: new Date(Date.now() + index * 1000 + 400).toISOString(),
            scope: "session",
            provider: "self-test",
            frameId: "",
            frameTitle: "",
          },
        ]
      : []),
  ]);

  return {
    frames,
    connections,
    voiceSegments,
  };
}

function buildLargeSessionFrame(index) {
  const viewportIds = Object.keys(viewportPresets);
  const viewport = viewportIds[index % viewportIds.length];
  const heroId = uid("shape");
  const contentId = uid("shape");
  const actionId = uid("shape");
  const accent = palette[index % Math.max(1, palette.length - 1)];
  const top = 88 + (index % 3) * 18;
  const layoutTop = top + 190;
  return createFrame({
    title: `Large Frame ${index + 1}`,
    viewport,
    objective: `Validate dense board export for frame ${index + 1}.`,
    layout:
      "Hero header, content body, and action rail laid out for large-session regression coverage.",
    motion:
      index % 2 === 0
        ? "Crossfade to the next frame."
        : "Slide the current panel upward.",
    assets: "Use low-fidelity placeholders and preserve annotation density.",
    mobile: "Collapse supporting rails on smaller widths.",
    flowPosition: defaultFlowPosition(index),
    elements: [
      {
        id: heroId,
        type: "rect",
        start: { x: 96, y: top },
        end: { x: 1260, y: top + 144 },
        color: accent,
        size: 6,
        alpha: 1,
        composite: "source-over",
        groupId: "",
      },
      {
        id: contentId,
        type: "rect",
        start: { x: 96, y: layoutTop },
        end: { x: 1020, y: layoutTop + 460 },
        color: "#1c1a1a",
        size: 4,
        alpha: 1,
        composite: "source-over",
        groupId: "",
      },
      {
        id: actionId,
        type: "rect",
        start: { x: 1080, y: layoutTop + 60 },
        end: { x: 1290, y: layoutTop + 138 },
        color: accent,
        size: 5,
        alpha: 1,
        composite: "source-over",
        groupId: "",
      },
      {
        id: uid("arrow"),
        type: "arrow",
        start: { x: 1040, y: layoutTop + 100 },
        end: { x: 1170, y: layoutTop + 100 },
        color: accent,
        size: 6,
        alpha: 1,
        composite: "source-over",
        groupId: "",
      },
      {
        id: uid("label"),
        type: "label",
        text: `Frame ${index + 1}`,
        x: 118,
        y: top + 34,
        color: "#1c1a1a",
        size: 26,
        attachedTo: heroId,
        anchor: { xRatio: 0.06, yRatio: 0.24 },
      },
      {
        id: uid("label"),
        type: "label",
        text: "Action",
        x: 1110,
        y: layoutTop + 94,
        color: "#1c1a1a",
        size: 18,
        attachedTo: actionId,
        anchor: { xRatio: 0.2, yRatio: 0.5 },
      },
    ],
  });
}

function clickTool(tool) {
  dom.toolButtons.querySelector(`[data-tool="${tool}"]`)?.click();
}

function dispatchPointerSequence(start, end) {
  const rect = dom.canvas.getBoundingClientRect();
  const points = [
    start,
    [
      start[0] + (end[0] - start[0]) * 0.33,
      start[1] + (end[1] - start[1]) * 0.33,
    ],
    [
      start[0] + (end[0] - start[0]) * 0.66,
      start[1] + (end[1] - start[1]) * 0.66,
    ],
    end,
  ];
  const pointerId = Math.floor(Math.random() * 1000) + 1;
  dom.canvas.dispatchEvent(
    makePointerEvent("pointerdown", rect, points[0], pointerId),
  );
  for (const point of points.slice(1, -1)) {
    dom.canvas.dispatchEvent(
      makePointerEvent("pointermove", rect, point, pointerId),
    );
  }
  dom.canvas.dispatchEvent(
    makePointerEvent("pointerup", rect, points.at(-1), pointerId, false),
  );
}

function dispatchPointerTap(point) {
  const rect = dom.canvas.getBoundingClientRect();
  const pointerId = Math.floor(Math.random() * 1000) + 1;
  dom.canvas.dispatchEvent(
    makePointerEvent("pointerdown", rect, point, pointerId),
  );
}

function makePointerEvent(type, rect, point, pointerId, pressed = true) {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId,
    pointerType: "mouse",
    buttons: pressed ? 1 : 0,
    clientX: rect.left + point[0],
    clientY: rect.top + point[1],
  });
}

function lastElement() {
  return currentFrame().elements.at(-1);
}

function findElementByType(type) {
  return (
    currentFrame().elements.find((element) => element.type === type) || null
  );
}

function assert(condition, name, detail = "") {
  return { name, passed: Boolean(condition), detail };
}

function renderSelfTestResults(results) {
  document.querySelector("#selftest-results")?.remove();
  const pre = document.createElement("pre");
  pre.id = "selftest-results";
  pre.hidden = true;
  pre.setAttribute("aria-hidden", "true");
  pre.style.display = "none";
  pre.textContent = JSON.stringify(results, null, 2);
  document.body.appendChild(pre);
  document.body.dataset.selftestPassed = String(
    results.every((result) => result.passed),
  );
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
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

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
