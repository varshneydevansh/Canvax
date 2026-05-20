const STORAGE_KEY = "canvax-studio-v1";
const PROJECT_REGISTRY_KEY = "canvax-project-registry-v1";
const PROJECT_SNAPSHOT_PREFIX = "canvax-project-v1:";
const STORAGE_VERSION = 4;
const HANDOFF_SCHEMA_VERSION = 1;
const FRAME_RENDERER_VERSION = 5;
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
const SPATIAL_OBJECT_WIDTH = 232;
const SPATIAL_OBJECT_HEIGHT = 132;
const SPATIAL_OBJECT_MIN_WIDTH = 168;
const SPATIAL_OBJECT_MIN_HEIGHT = 96;
const SPATIAL_GROUP_FROM_SELECTION_PADDING = 36;
const SPATIAL_OUTPUT_LANE_ID = "output-lane";
const SPATIAL_HISTORY_LANE_ID = "history-lane";
const SPATIAL_HISTORY_LANE_GAP = 28;
const SPATIAL_HISTORY_LANE_PADDING = 32;
const MAP_OBJECT_FILTERS = [
  { id: "all", label: "All" },
  { id: "outputs", label: "Output" },
  { id: "assets", label: "Assets" },
  { id: "notes", label: "Notes" },
  { id: "history", label: "History" },
];
const variantStylePropertyKeys = [
  "palette",
  "typography",
  "density",
  "motion",
  "imagery",
];
const FLOW_SURFACE_PADDING = 120;
const FLOW_EDGE_EXPAND_MARGIN = 96;
const FLOW_EDGE_EXPAND_STEP = 520;
const FLOW_TRAILING_SPACE = 720;
const FLOW_PAN_MOMENTUM_DECAY = 0.92;
const FLOW_PAN_MOMENTUM_STOP = 0.018;
const FLOW_PAN_MOMENTUM_MIN_VELOCITY = 0.16;
const SELECTION_HANDLE_SIZE = 14;
const PREVIEW_WINDOW_NAME = "canvax-preview-window";
const urlParams = new URLSearchParams(window.location.search);
const shouldRunSelfTest = urlParams.get("selftest") === "1";
const visualFixtureMode = cleanString(urlParams.get("visualfixture"));

if (shouldRunSelfTest) {
  window.__canvaxSelfTestProgress = "booting";
  window.__canvaxSelfTestError = "";
  window.addEventListener("error", (event) => {
    window.__canvaxSelfTestError =
      event.message || "Unhandled browser error during self-test.";
  });
  window.addEventListener("unhandledrejection", (event) => {
    window.__canvaxSelfTestError =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason || "Unhandled promise rejection during self-test.");
  });
}
const viewModes = [
  { id: "frame", label: "Frame view" },
  { id: "flow", label: "Flow view" },
];

const workspaceModes = [
  {
    id: "simple",
    label: "Workbench",
    description: "Sketch, talk, generate, and apply.",
    guide: [
      ["Sketch", "Draw rough placement on the current surface."],
      ["Talk", "Dictate, paste, or add the intent beside the sketch."],
      ["Make / Apply", "Generate locally, preview, or hand the moment to Codex."],
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Inspector deck for frames, flow, handoff state, and diagnostics.",
    guide: [
      ["Project rail", "Frames, captures, and workspace actions."],
      ["Canvas deck", "Frame tools, Flow map, Map objects, and generated output cards."],
      ["Handoff inspector", "Notes, voice, manifests, captures, and generation controls."],
    ],
  },
];

const workbenchFocusModes = [
  {
    id: "sketch",
    label: "Sketch",
    description: "Use the sketch canvas as the primary surface.",
  },
  {
    id: "split",
    label: "Split",
    description: "Inspect sketch and generated output together.",
  },
  {
    id: "output",
    label: "Output",
    description: "Make the generated surface primary for corrections.",
  },
  {
    id: "map",
    label: "Map",
    description: "Arrange frames, variants, and generated directions spatially.",
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

const workbenchPromptChips = [
  {
    id: "design-context",
    label: "Start with your design",
    actionMode: "build-ui",
    action: "add-context",
    note: "Add a screenshot, sketch, file, or reference image to the Map as project context before generating.",
  },
  {
    id: "font",
    label: "Try another font",
    actionMode: "refine-ui",
    note: "Try another headline/body font pairing while preserving the current layout hierarchy.",
  },
  {
    id: "dramatic",
    label: "Make it more dramatic",
    actionMode: "refine-ui",
    note: "Make the generated direction more dramatic with stronger contrast, bolder hierarchy, and more cinematic composition.",
  },
  {
    id: "mobile",
    label: "Show mobile variant",
    actionMode: "variations",
    note: "Create or refine a mobile variant of this frame while preserving the same intent and content hierarchy.",
  },
  {
    id: "spacing",
    label: "Tighten spacing",
    actionMode: "refine-ui",
    note: "Tighten spacing and alignment so the design feels intentional, readable, and less loose.",
  },
  {
    id: "image",
    label: "Add image candidates",
    actionMode: "image-prompt",
    note: "Identify image or illustration regions and prepare candidate prompts with placement coordinates.",
  },
];

const voiceIntentRules = [
  {
    id: "placement",
    label: "Placement",
    detail: "Use this note to move, align, or reposition the design.",
    pattern: /\b(move|place|position|align|shift|left|right|top|bottom|center|above|below|near|beside)\b/i,
  },
  {
    id: "scale",
    label: "Scale",
    detail: "Use this note to resize, emphasize, or reduce an element.",
    pattern: /\b(bigger|larger|smaller|resize|scale|wide|tall|short|hero|emphasis|prominent)\b/i,
  },
  {
    id: "visual",
    label: "Visual style",
    detail: "Use this note to change color, type, contrast, or atmosphere.",
    pattern: /\b(color|colour|font|type|bold|contrast|dark|light|dramatic|soft|texture|style|palette)\b/i,
  },
  {
    id: "flow",
    label: "Flow",
    detail: "Use this note for motion, state, scroll, or prototype behavior.",
    pattern: /\b(scroll|transition|animate|animation|state|hover|click|tap|flow|next|after|before|when|then)\b/i,
  },
  {
    id: "asset",
    label: "Asset",
    detail: "Use this note for image, illustration, icon, or media direction.",
    pattern: /\b(image|photo|illustration|icon|poster|asset|character|background|scene|shot|spread)\b/i,
  },
  {
    id: "copy",
    label: "Copy",
    detail: "Use this note for labels, text, tone, or wording.",
    pattern: /\b(text|copy|label|headline|title|caption|wording|tone|message|cta)\b/i,
  },
];

const viewportPresets = {
  desktop: { label: "Desktop", width: 1440, height: 1024, columns: 12 },
  laptop: { label: "Laptop", width: 1366, height: 900, columns: 12 },
  tablet: { label: "Tablet", width: 834, height: 1194, columns: 8 },
  mobile: { label: "Mobile", width: 430, height: 932, columns: 4 },
  square: { label: "Square", width: 1024, height: 1024, columns: 6 },
  poster: { label: "Poster", width: 900, height: 1400, columns: 6 },
  slide: { label: "Slide 16:9", width: 1920, height: 1080, columns: 12 },
  bookSpread: {
    label: "Book spread",
    width: 2200,
    height: 1400,
    columns: 12,
  },
  storyboard: {
    label: "Storyboard",
    width: 1800,
    height: 1200,
    columns: 12,
  },
  comicPage: { label: "Comic page", width: 1200, height: 1800, columns: 6 },
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

const designKitPresets = [
  {
    id: "product-studio",
    label: "Product app",
    summary: "Clean product UI with strong hierarchy, responsive components, and implementation-ready states.",
    audience: "web app, product UI, responsive component surface",
    mood: "Clear, premium, implementation-ready, direct.",
    actionMode: "build-ui",
    viewport: "desktop",
    generation: { direction: "product", style: "studio", focus: "balanced" },
    frame: {
      objective: "Turn the sketch into a production-ready app or website screen.",
      layout:
        "Preserve the drawn hierarchy, convert rough boxes into real components, and keep spacing intentional.",
      motion:
        "Use subtle reveal, hover, and state transitions only where they clarify interaction.",
      assets:
        "Treat image boxes as replaceable asset slots with clear alt text and loading states.",
      mobile:
        "Adapt into a stacked mobile layout while preserving the primary action and hierarchy.",
    },
  },
  {
    id: "poster-system",
    label: "Poster system",
    summary: "Bold editorial/poster direction for campaigns, landing pages, and visual systems.",
    audience: "poster, campaign page, editorial landing page, brand system",
    mood:
      "Bold poster logic, aged paper, sharp geometry, limited palette, dramatic type.",
    actionMode: "image-prompt",
    viewport: "poster",
    generation: { direction: "editorial", style: "showcase", focus: "storytelling" },
    frame: {
      objective: "Turn the sketch into a striking poster-led visual direction.",
      layout:
        "Use large type, diagonal geometry, clear focal imagery, and strong foreground/background separation.",
      motion:
        "For web outputs, use parallax layers and poster-panel reveals without weakening the composition.",
      assets:
        "Generate or specify poster imagery, texture, print grain, symbols, and image-safe regions.",
      mobile:
        "Crop and stack poster layers carefully so the focal symbol and headline remain dominant.",
    },
  },
  {
    id: "storybook-spread",
    label: "Book spread",
    summary: "Landscape two-page spread planning for children's books, comics, and illustration prompts.",
    audience: "children's book spread, illustration prompt, story scene, print layout",
    mood:
      "Warm, cinematic, storybook, consistent characters, strong scene continuity.",
    actionMode: "image-prompt",
    viewport: "bookSpread",
    generation: { direction: "cinematic", style: "showcase", focus: "storytelling" },
    frame: {
      objective: "Turn the sketch into a two-page illustration spread direction.",
      layout:
        "Preserve character placement, camera angle, safe text zones, and page-spread balance.",
      motion:
        "Use arrows and labels as story action, camera motion, and emotional beats.",
      assets:
        "Describe character continuity, environment, lighting, texture, and negative prompts for image generation.",
      mobile:
        "Also provide single-page crop notes and thumbnail-safe composition guidance.",
    },
  },
  {
    id: "dashboard-ops",
    label: "Dashboard",
    summary: "Dense information product with charts, tables, filters, and decision-focused states.",
    audience: "dashboard, admin app, analytics workspace, operations UI",
    mood: "Analytical, structured, calm, high-density but readable.",
    actionMode: "build-ui",
    viewport: "desktop",
    generation: { direction: "dashboard", style: "studio", focus: "utility" },
    frame: {
      objective: "Turn the sketch into a useful dashboard or admin workspace.",
      layout:
        "Map boxes to data cards, charts, filters, tables, empty states, and command surfaces.",
      motion:
        "Use transitions for filtering, drilldown, loading, and alert state changes.",
      assets:
        "Use real-looking placeholder data, clear legends, and accessible color contrast.",
      mobile:
        "Convert dense regions into priority cards, horizontal charts, and progressive disclosure.",
    },
  },
  {
    id: "comic-storyboard",
    label: "Storyboard",
    summary: "Sequential panels for comics, animation beats, manga, or scene planning.",
    audience: "storyboard, comic page, manga beat sheet, motion sequence",
    mood: "Sequential, expressive, camera-aware, readable at thumbnail size.",
    actionMode: "image-prompt",
    viewport: "storyboard",
    generation: { direction: "cinematic", style: "rapid", focus: "storytelling" },
    frame: {
      objective: "Turn the sketch into a clear sequential visual plan.",
      layout:
        "Treat each rough panel as a beat with camera angle, subject scale, action, and transition.",
      motion:
        "Use arrows and labels as camera moves, action direction, pacing, and panel transitions.",
      assets:
        "Keep character identity, props, lighting, and environment consistent across panels.",
      mobile:
        "Provide panel-by-panel prompts plus a consolidated style lock for the full sequence.",
    },
  },
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
  projectPicker: document.querySelector("#project-picker"),
  openProjectBrowser: document.querySelector("#open-project-browser"),
  newProject: document.querySelector("#new-project"),
  duplicateProject: document.querySelector("#duplicate-project"),
  deleteProject: document.querySelector("#delete-project"),
  projectSwitcherStatus: document.querySelector("#project-switcher-status"),
  workspaceProjectsButton: document.querySelector("#workspace-projects-button"),
  focusProjectPicker: document.querySelector("#focus-project-picker"),
  focusOpenProjectBrowser: document.querySelector("#focus-open-project-browser"),
  focusNewProject: document.querySelector("#focus-new-project"),
  focusDuplicateProject: document.querySelector("#focus-duplicate-project"),
  focusDeleteProject: document.querySelector("#focus-delete-project"),
  focusProjectStatus: document.querySelector("#focus-project-status"),
  projectBrowserOverlay: document.querySelector("#project-browser-overlay"),
  projectBrowserGrid: document.querySelector("#project-browser-grid"),
  projectBrowserClose: document.querySelector("#project-browser-close"),
  projectBrowserSearch: document.querySelector("#project-browser-search"),
  projectBrowserNew: document.querySelector("#project-browser-new"),
  projectBrowserDuplicate: document.querySelector("#project-browser-duplicate"),
  projectBrowserStatus: document.querySelector("#project-browser-status"),
  boardGoal: document.querySelector("#board-goal"),
  boardAudience: document.querySelector("#board-audience"),
  boardMood: document.querySelector("#board-mood"),
  workspaceModeButtons: document.querySelector("#workspace-mode-buttons"),
  workspaceModeLabel: document.querySelector("#workspace-mode-label"),
  workspaceModeDescription: document.querySelector("#workspace-mode-description"),
  workspaceModeGuide: document.querySelector("#workspace-mode-guide"),
  workbenchFocusButtons: document.querySelector("#workbench-focus-buttons"),
  workbenchTrayToggle: document.querySelector("#workbench-tray-toggle"),
  workbenchFocusSummary: document.querySelector("#workbench-focus-summary"),
  workbenchSummaryFrame: document.querySelector("#workbench-summary-frame"),
  workbenchSummarySurface: document.querySelector("#workbench-summary-surface"),
  workbenchSummaryAction: document.querySelector("#workbench-summary-action"),
  workbenchSummaryFocus: document.querySelector("#workbench-summary-focus"),
  workbenchRail: document.querySelector("#workbench-rail"),
  workbenchComposerChips: document.querySelector("#workbench-composer-chips"),
  workbenchComposer: document.querySelector("#workbench-composer"),
  workbenchComposerInput: document.querySelector("#workbench-composer-input"),
  workbenchComposerTalk: document.querySelector("#workbench-composer-talk"),
  workbenchComposerNote: document.querySelector("#workbench-composer-note"),
  workbenchComposerPin: document.querySelector("#workbench-composer-pin"),
  workbenchComposerMake: document.querySelector("#workbench-composer-make"),
  workbenchComposerApply: document.querySelector("#workbench-composer-apply"),
  workbenchAgentLog: document.querySelector("#workbench-agent-log"),
  workbenchAgentLogToggle: document.querySelector(
    "#workbench-agent-log-toggle",
  ),
  workbenchAgentLogCount: document.querySelector("#workbench-agent-log-count"),
  workbenchAgentLogPanel: document.querySelector("#workbench-agent-log-panel"),
  workbenchAgentLogStatus: document.querySelector(
    "#workbench-agent-log-status",
  ),
  workbenchAgentLogList: document.querySelector("#workbench-agent-log-list"),
  focusPad: document.querySelector("#focus-pad"),
  designerStartActions: document.querySelector("#designer-start-actions"),
  focusViewportSelect: document.querySelector("#focus-viewport-select"),
  focusActionModeSelect: document.querySelector("#focus-action-mode-select"),
  focusFrameChip: document.querySelector("#focus-frame-chip"),
  focusSurfaceChip: document.querySelector("#focus-surface-chip"),
  focusActionChip: document.querySelector("#focus-action-chip"),
  focusHostChip: document.querySelector("#focus-host-chip"),
  focusDesignChip: document.querySelector("#focus-design-chip"),
  designKitCard: document.querySelector("#design-kit-card"),
  designKitTitle: document.querySelector("#design-kit-title"),
  designKitSummary: document.querySelector("#design-kit-summary"),
  designKitSearch: document.querySelector("#design-kit-search"),
  designKitPresetSelect: document.querySelector("#design-kit-preset"),
  applyDesignKit: document.querySelector("#apply-design-kit"),
  extractDesignTokens: document.querySelector("#extract-design-tokens"),
  importExternalDesignTokens: document.querySelector(
    "#import-external-design-tokens",
  ),
  designKitSources: document.querySelector("#design-kit-sources"),
  focusToolButtons: document.querySelector("#focus-tool-buttons"),
  focusAddFrame: document.querySelector("#focus-add-frame"),
  focusAddSection: document.querySelector("#focus-add-section"),
  focusFreeCanvas: document.querySelector("#focus-free-canvas"),
  focusAddImage: document.querySelector("#focus-add-image"),
  focusImageInput: document.querySelector("#focus-image-input"),
  focusPromptChips: document.querySelector("#focus-prompt-chips"),
  focusUndo: document.querySelector("#focus-undo"),
  focusRedo: document.querySelector("#focus-redo"),
  focusGenerate: document.querySelector("#focus-generate"),
  focusBuildReal: document.querySelector("#focus-build-real"),
  focusCreateVariants: document.querySelector("#focus-create-variants"),
  focusPromoteVariant: document.querySelector("#focus-promote-variant"),
  focusImagePack: document.querySelector("#focus-image-pack"),
  focusAddContext: document.querySelector("#focus-add-context"),
  focusAutoRewrite: document.querySelector("#focus-auto-rewrite"),
  focusVoiceToggle: document.querySelector("#focus-voice-toggle"),
  focusApply: document.querySelector("#focus-apply"),
  focusPreview: document.querySelector("#focus-preview"),
  focusStatus: document.querySelector("#focus-status"),
  focusTranscript: document.querySelector("#focus-transcript"),
  focusVoiceIntents: document.querySelector("#focus-voice-intents"),
  focusManualInput: document.querySelector("#focus-manual-input"),
  focusAddManual: document.querySelector("#focus-add-manual"),
  workbenchOutputBadge: document.querySelector("#workbench-output-badge"),
  workbenchOutputSurface: document.querySelector("#workbench-output-surface"),
  workbenchOutputMeta: document.querySelector("#workbench-output-meta"),
  workbenchOpenOutput: document.querySelector("#workbench-open-output"),
  workbenchReviewOutput: document.querySelector("#workbench-review-output"),
  workbenchDesignReviewBadge: document.querySelector(
    "#workbench-design-review-badge",
  ),
  workbenchClearMarks: document.querySelector("#workbench-clear-marks"),
  workbenchOutputStage: document.querySelector("#workbench-output-stage"),
  workbenchOutputStageBadge: document.querySelector(
    "#workbench-output-stage-badge",
  ),
  workbenchOutputStageSurface: document.querySelector(
    "#workbench-output-stage-surface",
  ),
  workbenchOutputStageMeta: document.querySelector(
    "#workbench-output-stage-meta",
  ),
  workbenchOutputStageOpen: document.querySelector(
    "#workbench-output-stage-open",
  ),
  workbenchOutputStageReview: document.querySelector(
    "#workbench-output-stage-review",
  ),
  workbenchOutputStageReviewBadge: document.querySelector(
    "#workbench-output-stage-review-badge",
  ),
  assetCandidateTray: document.querySelector("#asset-candidate-tray"),
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
  liveRewriteToggle: document.querySelector("#live-rewrite-toggle"),
  statusPill: document.querySelector("#status-pill"),
  openPreview: document.querySelector("#open-preview"),
  generateScreen: document.querySelector("#generate-screen"),
  buildRealScreen: document.querySelector("#build-real-screen"),
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
  flowZoomOut: document.querySelector("#flow-zoom-out"),
  flowZoomIn: document.querySelector("#flow-zoom-in"),
  flowZoomReset: document.querySelector("#flow-zoom-reset"),
  flowFitView: document.querySelector("#flow-fit-view"),
  flowZoomValue: document.querySelector("#flow-zoom-value"),
  flowNavigator: document.querySelector("#flow-navigator"),
  flowNavigatorStage: document.querySelector("#flow-navigator-stage"),
  flowNavigatorItems: document.querySelector("#flow-navigator-items"),
  flowNavigatorViewport: document.querySelector("#flow-navigator-viewport"),
  flowNavigatorScale: document.querySelector("#flow-navigator-scale"),
  mapObjectSearch: document.querySelector("#map-object-search"),
  mapObjectFilterChips: document.querySelector("#map-object-filter-chips"),
  addSpatialNote: document.querySelector("#add-spatial-note"),
  addSpatialFile: document.querySelector("#add-spatial-file"),
  addSpatialGroup: document.querySelector("#add-spatial-group"),
  clearSpatialGenerated: document.querySelector("#clear-spatial-generated"),
  toggleOutputLane: document.querySelector("#toggle-output-lane"),
  toggleHistoryLane: document.querySelector("#toggle-history-lane"),
  mapTimeline: document.querySelector("#map-timeline"),
  mapTimelineSummary: document.querySelector("#map-timeline-summary"),
  mapTimelineTracks: document.querySelector("#map-timeline-tracks"),
  spatialFileInput: document.querySelector("#spatial-file-input"),
  mapSelectionActions: document.querySelector("#map-selection-actions"),
  mapSelectedObjectTitle: document.querySelector("#map-selected-object-title"),
  mapSelectedObjectDetail: document.querySelector("#map-selected-object-detail"),
  mapPropertyEditor: document.querySelector("#map-property-editor"),
  mapObjectTitle: document.querySelector("#map-object-title"),
  mapObjectSubtitle: document.querySelector("#map-object-subtitle"),
  mapObjectStatus: document.querySelector("#map-object-status"),
  mapObjectPrompt: document.querySelector("#map-object-prompt"),
  mapVariantStyleEditor: document.querySelector("#map-variant-style-editor"),
  mapVariantStylePalette: document.querySelector("#map-variant-style-palette"),
  mapVariantStyleTypography: document.querySelector(
    "#map-variant-style-typography",
  ),
  mapVariantStyleDensity: document.querySelector("#map-variant-style-density"),
  mapVariantStyleMotion: document.querySelector("#map-variant-style-motion"),
  mapVariantStyleImagery: document.querySelector("#map-variant-style-imagery"),
  mapObjectCustomProperties: document.querySelector(
    "#map-object-custom-properties",
  ),
  mapDetailEditor: document.querySelector("#map-detail-editor"),
  mapDetailPrimaryLabel: document.querySelector("#map-detail-primary-label"),
  mapDetailSecondaryLabel: document.querySelector("#map-detail-secondary-label"),
  mapObjectDetailPrimary: document.querySelector("#map-object-detail-primary"),
  mapObjectDetailSecondary: document.querySelector("#map-object-detail-secondary"),
  mapObjectTypeDetails: document.querySelector("#map-object-type-details"),
  mapCopyObjectContext: document.querySelector("#map-copy-object-context"),
  mapMakeEditable: document.querySelector("#map-make-editable"),
  mapPinObject: document.querySelector("#map-pin-object"),
  mapLockObject: document.querySelector("#map-lock-object"),
  mapGroupSelection: document.querySelector("#map-group-selection"),
  mapUngroupSelection: document.querySelector("#map-ungroup-selection"),
  mapSelectGroupContents: document.querySelector("#map-select-group-contents"),
  mapFitGroup: document.querySelector("#map-fit-group"),
  mapLaneEarlier: document.querySelector("#map-lane-earlier"),
  mapLaneLater: document.querySelector("#map-lane-later"),
  mapSendObjectBack: document.querySelector("#map-send-object-back"),
  mapBringObjectFront: document.querySelector("#map-bring-object-front"),
  mapDuplicateObject: document.querySelector("#map-duplicate-object"),
  mapDeleteObject: document.querySelector("#map-delete-object"),
  mapClearSelection: document.querySelector("#map-clear-selection"),
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
  buildRealScreenPanel: document.querySelector("#build-real-screen-panel"),
  createVariantsPanel: document.querySelector("#create-variants-panel"),
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
  elementPrototypeTarget: document.querySelector("#element-prototype-target"),
  elementPrototypeLabel: document.querySelector("#element-prototype-label"),
  clearElementPrototype: document.querySelector("#clear-element-prototype"),
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
  setSelfTestProgress("init");
  populateViewportSelect();
  bindEvents();
  bindInteractionFeedback();
  if (visualFixtureMode) {
    applyVisualFixture(visualFixtureMode);
  } else {
    fetchServerStatus();
    refreshPreviewStateFromServer();
    syncSpatialObjectsFromHandoffs();
  }
  renderAll();
  if (visualFixtureMode === "project-browser") {
    openProjectBrowser();
  }
  const projectSwitchNotice = window.sessionStorage.getItem(
    "canvax-project-switch-notice",
  );
  if (projectSwitchNotice) {
    window.sessionStorage.removeItem("canvax-project-switch-notice");
    renderStatus(projectSwitchNotice);
  }
  scheduleLivePreviewSync();
  exposeDebugHelpers();
  if (shouldRunSelfTest) {
    setSelfTestProgress("scheduled");
    window.setTimeout(() => {
      void runSelfTest();
    }, 150);
  }
}

function applyVisualFixture(mode) {
  if (!["advanced-map", "workbench-map", "project-browser"].includes(mode)) {
    return;
  }

  if (mode === "project-browser") {
    applyProjectBrowserFixture();
    return;
  }

  const fixture = buildLargeSessionFixture(12);
  state.frames = fixture.frames;
  state.connections = fixture.connections;
  state.activeFrameId = fixture.frames[0]?.id || state.activeFrameId;
  state.entryFrameId = fixture.frames[0]?.id || state.entryFrameId;
  state.selectedConnectionId = null;
  state.pendingConnectionFromFrameId = null;
  state.voice = {
    ...createInitialVoiceState(),
    scope: "frame",
    segments: fixture.voiceSegments,
  };
  state.assetCandidatePack = fixture.assetCandidatePack;
  state.outputLaneCollapsed = false;
  state.historyLaneCollapsed = false;
  state.hiddenSpatialObjectIds = [];
  state.mapObjectFilter = "all";
  state.mapObjectSearch = "";
  state.flowZoom = 0.8;
  state.viewMode = "flow";
  state.workbenchFocus = "map";
  state.workspaceMode = mode === "advanced-map" ? "advanced" : "simple";
  state.serverStatus = {
    ...state.serverStatus,
    previewManifest: fixture.previewManifest,
    checkpointHistory: fixture.checkpointHistory,
    transport: buildTransportDescriptor(),
    hostCapabilities: {
      codexBrowser: {
        available: true,
        detail: "Visual regression fixture for Codex browser workflow.",
      },
      hostImageGeneration: {
        available: false,
        detail: "Fixture stays local-first and does not require API keys.",
      },
    },
    designContext: {
      exists: true,
      relativePath: "DESIGN.md",
      summary: "Fixture design context for visual regression.",
    },
  };
  syncSpatialObjectsFromHandoffs();
}

function applyProjectBrowserFixture() {
  const fixtureProjects = [
    {
      id: "project-fixture-stitch",
      title: "Stitch parity workspace",
      frameCount: 7,
      activeFrameTitle: "Workbench map",
      updatedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: "project-fixture-book",
      title: "Children book spread studies",
      frameCount: 12,
      activeFrameTitle: "Storm rescue spread",
      updatedAt: new Date(Date.now() - 1000 * 60 * 72).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    },
    {
      id: "project-fixture-product",
      title: "Scythian product dossier",
      frameCount: 4,
      activeFrameTitle: "Dispatch archive",
      updatedAt: new Date(Date.now() - 1000 * 60 * 144).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    },
  ];
  state.projectRegistry = {
    version: 1,
    activeProjectId: fixtureProjects[0].id,
    projects: fixtureProjects,
  };
  state.board.project = fixtureProjects[0].title;
  state.workspaceMode = "simple";
  state.workbenchFocus = "sketch";
}

function bindEvents() {
  dom.boardProject.addEventListener("input", () =>
    updateBoard("project", dom.boardProject.value),
  );
  dom.projectPicker.addEventListener("change", () => {
    switchProject(dom.projectPicker.value);
  });
  dom.openProjectBrowser.addEventListener("click", openProjectBrowser);
  dom.workspaceProjectsButton?.addEventListener("click", openProjectBrowser);
  dom.newProject.addEventListener("click", createProject);
  dom.duplicateProject.addEventListener("click", duplicateProject);
  dom.deleteProject.addEventListener("click", deleteProject);
  dom.focusProjectPicker.addEventListener("change", () => {
    switchProject(dom.focusProjectPicker.value);
  });
  dom.focusOpenProjectBrowser.addEventListener("click", openProjectBrowser);
  dom.focusNewProject.addEventListener("click", createProject);
  dom.focusDuplicateProject.addEventListener("click", duplicateProject);
  dom.focusDeleteProject.addEventListener("click", deleteProject);
  dom.projectBrowserClose.addEventListener("click", closeProjectBrowser);
  dom.projectBrowserOverlay.addEventListener("click", (event) => {
    if (event.target === dom.projectBrowserOverlay) {
      closeProjectBrowser();
    }
  });
  dom.projectBrowserSearch.addEventListener("input", renderProjectBrowser);
  dom.projectBrowserNew.addEventListener("click", createProject);
  dom.projectBrowserDuplicate.addEventListener("click", () =>
    duplicateProject(state.projectRegistry?.activeProjectId),
  );
  dom.projectBrowserGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-project-action]");
    if (!button) {
      return;
    }
    handleProjectBrowserAction(button.dataset.projectAction, button.dataset.projectId);
  });
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
  dom.workbenchFocusButtons.addEventListener("click", (event) => {
    const button = event.target.closest("[data-workbench-focus]");
    if (!button) {
      return;
    }
    setWorkbenchFocus(button.dataset.workbenchFocus);
  });
  dom.workbenchTrayToggle.addEventListener("click", toggleWorkbenchTray);
  dom.designerStartActions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-designer-start]");
    if (!button) {
      return;
    }
    applyDesignerStartAction(button.dataset.designerStart);
  });
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
  dom.workbenchComposerInput.addEventListener("input", () => {
    updateManualVoiceDraft(dom.workbenchComposerInput.value, {
      clearFocusStatus: true,
    });
  });
  dom.workbenchComposerInput.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      addManualVoiceNote("workbench-composer");
    }
  });
  dom.workbenchComposerTalk.addEventListener("click", () => {
    if (state.voice.status === "listening") {
      stopVoiceDictation();
    } else {
      startVoiceDictation();
    }
  });
  dom.workbenchComposerNote.addEventListener("click", () => {
    addManualVoiceNote("workbench-composer");
  });
  dom.workbenchComposerPin.addEventListener("click", () => {
    pinComposerInstructionToMap();
  });
  dom.workbenchComposerMake.addEventListener("click", () => {
    commitManualVoiceDraft("workbench-composer");
    void generateCurrentScreen();
  });
  dom.workbenchComposerApply.addEventListener("click", () => {
    commitManualVoiceDraft("workbench-composer");
    void applyFocusPadToCodex();
  });
  dom.workbenchAgentLogToggle.addEventListener("click", () => {
    state.workbenchAgentLogOpen = !state.workbenchAgentLogOpen;
    persistState();
    renderWorkbenchAgentLog();
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
  dom.focusAddImage.addEventListener("click", openWorkbenchImagePicker);
  dom.focusImageInput.addEventListener("change", (event) => {
    const [file] = Array.from(event.target.files || []).filter((item) =>
      item.type.startsWith("image/"),
    );
    if (file) {
      void placeImageFile(file);
    }
    event.target.value = "";
  });
  dom.focusUndo.addEventListener("click", undoDesignerAction);
  dom.focusRedo.addEventListener("click", redoDesignerAction);
  dom.focusGenerate.addEventListener("click", () => {
    void generateCurrentScreen();
  });
  dom.focusBuildReal.addEventListener("click", () => {
    void buildRealScreenWithCodex();
  });
  dom.focusCreateVariants.addEventListener("click", () => {
    createVariantFramesFromCurrent();
  });
  dom.focusPromoteVariant.addEventListener("click", () => {
    promoteCurrentVariantToPrimary();
  });
  dom.focusImagePack.addEventListener("click", () => {
    void saveImagePromptPackForHost();
  });
  dom.focusAddContext.addEventListener("click", () => {
    openWorkbenchContextPicker();
  });
  dom.focusAutoRewrite.addEventListener("click", () => {
    setAutoRewriteEnabled(!state.autoRewrite);
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
  dom.workbenchReviewOutput.addEventListener("click", () => {
    void runWorkbenchDesignReview();
  });
  dom.workbenchOutputStageReview.addEventListener("click", () => {
    void runWorkbenchDesignReview();
  });
  dom.workbenchClearMarks.addEventListener("click", clearWorkbenchOutputMarks);
  dom.focusPromptChips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-workbench-prompt]");
    if (!button) {
      return;
    }
    applyWorkbenchPromptChip(button.dataset.workbenchPrompt);
  });
  dom.workbenchComposerChips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-workbench-prompt]");
    if (!button) {
      return;
    }
    applyWorkbenchPromptChip(button.dataset.workbenchPrompt);
  });
  dom.assetCandidateTray.addEventListener("click", (event) => {
    const copyButton = event.target.closest("[data-asset-candidate-copy]");
    if (copyButton) {
      void copyAssetCandidatePrompt(copyButton.dataset.assetCandidateCopy);
      return;
    }
    const hostTaskButton = event.target.closest(
      "[data-asset-candidate-host-task]",
    );
    if (hostTaskButton) {
      void copyAssetCandidateHostTask(
        hostTaskButton.dataset.assetCandidateHostTask,
      );
      return;
    }
    const acceptButton = event.target.closest("[data-asset-candidate-accept]");
    if (acceptButton) {
      acceptAssetCandidate(acceptButton.dataset.assetCandidateAccept);
      return;
    }
    const selectButton = event.target.closest("[data-asset-candidate-select]");
    if (selectButton) {
      selectAssetCandidateElement(selectButton.dataset.assetCandidateSelect);
      return;
    }
    const button = event.target.closest("[data-asset-candidate-place]");
    if (!button) {
      return;
    }
    placeAssetCandidatePlaceholder(button.dataset.assetCandidatePlace);
  });
  dom.assetCandidateTray.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-asset-candidate-import-form]");
    if (!form) {
      return;
    }
    event.preventDefault();
    const candidateId = form.dataset.assetCandidateImportForm;
    const input = form.querySelector("[data-asset-candidate-path]");
    void placeAssetCandidateImageFromPath(candidateId, input?.value || "");
  });
  dom.assetCandidateTray.addEventListener("change", (event) => {
    const input = event.target.closest("[data-asset-candidate-upload]");
    if (!input || !input.files?.[0]) {
      return;
    }
    void placeAssetCandidateImage(
      input.dataset.assetCandidateUpload,
      input.files[0],
    );
    input.value = "";
  });
  [dom.workbenchOutputSurface, dom.workbenchOutputStageSurface].forEach(
    (surface) => {
      surface.addEventListener("pointerdown", onWorkbenchOutputPointerDown);
      surface.addEventListener("pointermove", onWorkbenchOutputPointerMove);
      surface.addEventListener("pointerup", onWorkbenchOutputPointerUp);
      surface.addEventListener("pointerleave", onWorkbenchOutputPointerUp);
      surface.addEventListener("pointercancel", onWorkbenchOutputPointerUp);
    },
  );
  dom.focusManualInput.addEventListener("input", () => {
    updateManualVoiceDraft(dom.focusManualInput.value, {
      clearFocusStatus: true,
    });
  });
  dom.focusManualInput.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      addManualVoiceNote("focus-manual-note");
    }
  });
  dom.focusAddManual.addEventListener("click", () => {
    addManualVoiceNote("focus-manual-note");
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
  dom.checkpointList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-replay-checkpoint]");
    if (!button) {
      return;
    }
    event.preventDefault();
    void replayCheckpointAsFrame(button.dataset.replayCheckpoint);
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
  dom.flowZoomOut.addEventListener("click", () => updateFlowZoom(-0.1));
  dom.flowZoomIn.addEventListener("click", () => updateFlowZoom(0.1));
  dom.flowZoomReset.addEventListener("click", () => setFlowZoom(1));
  dom.flowFitView.addEventListener("click", () => {
    fitFlowMapToContent();
  });
  dom.flowShell.addEventListener("scroll", renderFlowNavigatorViewport, {
    passive: true,
  });
  dom.flowNavigator.addEventListener("pointerdown", onFlowNavigatorPointerDown);
  dom.mapObjectFilterChips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-map-object-filter]");
    if (!button) {
      return;
    }
    setMapObjectFilter(button.dataset.mapObjectFilter);
  });
  dom.mapObjectSearch.addEventListener("input", () => {
    setMapObjectSearch(dom.mapObjectSearch.value, { announce: false });
  });
  dom.addSpatialNote.addEventListener("click", addSpatialNoteObject);
  dom.addSpatialFile.addEventListener("click", () => {
    dom.spatialFileInput.click();
  });
  dom.addSpatialGroup.addEventListener("click", addSpatialGroupObject);
  dom.clearSpatialGenerated.addEventListener("click", () => {
    void clearGeneratedSpatialObjects();
  });
  dom.toggleOutputLane.addEventListener("click", toggleOutputLane);
  dom.toggleHistoryLane.addEventListener("click", toggleHistoryLane);
  dom.mapTimeline.addEventListener("click", onMapTimelineClick);
  dom.mapCopyObjectContext.addEventListener("click", () => {
    void copySelectedSpatialObjectContext();
  });
  dom.mapMakeEditable.addEventListener("click", () => {
    createEditableFrameFromSelectedOutput();
  });
  dom.mapPinObject.addEventListener("click", toggleSelectedSpatialObjectPin);
  dom.mapLockObject.addEventListener("click", toggleSelectedSpatialObjectLock);
  dom.mapGroupSelection.addEventListener("click", createSpatialGroupFromSelection);
  dom.mapUngroupSelection.addEventListener("click", ungroupSelectedSpatialGroups);
  dom.mapSelectGroupContents.addEventListener(
    "click",
    selectSelectedSpatialGroupContents,
  );
  dom.mapFitGroup.addEventListener("click", fitSelectedSpatialGroupsToContents);
  dom.mapLaneEarlier.addEventListener("click", () =>
    reorderSelectedSpatialSequence("earlier"),
  );
  dom.mapLaneLater.addEventListener("click", () =>
    reorderSelectedSpatialSequence("later"),
  );
  dom.mapSendObjectBack.addEventListener("click", sendSelectedSpatialObjectsBack);
  dom.mapBringObjectFront.addEventListener(
    "click",
    bringSelectedSpatialObjectsFront,
  );
  dom.mapDuplicateObject.addEventListener("click", duplicateSelectedSpatialObject);
  dom.mapDeleteObject.addEventListener("click", () => {
    removeSelectedSpatialObjects();
  });
  dom.mapClearSelection.addEventListener("click", () => {
    clearSpatialObjectSelection({ render: true });
  });
  dom.mapObjectTitle.addEventListener("change", () => {
    updateSelectedSpatialObjectProperty("title", dom.mapObjectTitle.value);
  });
  dom.mapObjectSubtitle.addEventListener("change", () => {
    updateSelectedSpatialObjectProperty(
      "subtitle",
      dom.mapObjectSubtitle.value,
    );
  });
  dom.mapObjectStatus.addEventListener("change", () => {
    updateSelectedSpatialObjectProperty("status", dom.mapObjectStatus.value);
  });
  dom.mapObjectPrompt.addEventListener("change", () => {
    updateSelectedSpatialObjectProperty("prompt", dom.mapObjectPrompt.value);
  });
  [
    ["palette", dom.mapVariantStylePalette],
    ["typography", dom.mapVariantStyleTypography],
    ["density", dom.mapVariantStyleDensity],
    ["motion", dom.mapVariantStyleMotion],
    ["imagery", dom.mapVariantStyleImagery],
  ].forEach(([field, input]) => {
    input?.addEventListener("change", () => {
      updateSelectedVariantStyleProperty(field, input.value);
    });
  });
  dom.mapObjectCustomProperties.addEventListener("change", () => {
    updateSelectedSpatialObjectCustomProperties(
      dom.mapObjectCustomProperties.value,
    );
  });
  dom.mapObjectDetailPrimary.addEventListener("change", () => {
    updateSelectedSpatialObjectDetail(
      "primary",
      dom.mapObjectDetailPrimary.value,
    );
  });
  dom.mapObjectDetailSecondary.addEventListener("change", () => {
    updateSelectedSpatialObjectDetail(
      "secondary",
      dom.mapObjectDetailSecondary.value,
    );
  });
  dom.spatialFileInput.addEventListener("change", () => {
    const file = dom.spatialFileInput.files?.[0];
    if (file) {
      void addSpatialFileObject(file);
    }
    dom.spatialFileInput.value = "";
  });
  dom.openPreview.addEventListener("click", openPreviewWindow);
  dom.generateScreen.addEventListener("click", () => {
    void generateCurrentScreen();
  });
  dom.buildRealScreen.addEventListener("click", () => {
    void buildRealScreenWithCodex();
  });
  dom.materializeFrame.addEventListener("click", () => {
    void materializeCurrentFrame();
  });
  dom.generateScreenPanel.addEventListener("click", () => {
    void generateCurrentScreen();
  });
  dom.buildRealScreenPanel.addEventListener("click", () => {
    void buildRealScreenWithCodex();
  });
  dom.createVariantsPanel.addEventListener("click", () => {
    createVariantFramesFromCurrent();
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

  dom.liveRewriteToggle.addEventListener("change", () => {
    setAutoRewriteEnabled(dom.liveRewriteToggle.checked);
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
  dom.designKitPresetSelect.addEventListener("change", () => {
    dom.applyDesignKit.disabled = dom.designKitPresetSelect.value === "custom";
  });
  dom.designKitSearch.addEventListener("input", () => {
    state.designKitSearch = dom.designKitSearch.value;
    populateViewportSelect();
    renderDesignKitCard();
  });
  dom.applyDesignKit.addEventListener("click", () => {
    applyDesignKitPreset(dom.designKitPresetSelect.value);
  });
  dom.extractDesignTokens.addEventListener("click", () => {
    void extractDesignTokensFromCurrentFrame();
  });
  dom.importExternalDesignTokens.addEventListener("click", () => {
    void importExternalDesignTokens();
  });
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
  dom.voiceAddManual.addEventListener("click", () => {
    addManualVoiceNote("manual-note");
  });
  dom.voiceManualInput.addEventListener("input", () => {
    updateManualVoiceDraft(dom.voiceManualInput.value);
  });
  dom.voiceManualInput.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      addManualVoiceNote("manual-note");
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
  dom.elementPrototypeTarget.addEventListener("change", () => {
    updateSelectedElementPrototypeTarget(dom.elementPrototypeTarget.value);
  });
  dom.elementPrototypeLabel.addEventListener("input", () => {
    updateSelectedElementPrototypeLabel(dom.elementPrototypeLabel.value);
  });
  dom.deleteConnection.addEventListener("click", deleteSelectedConnection);
  dom.clearElementPrototype.addEventListener(
    "click",
    clearSelectedElementPrototype,
  );
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
  dom.flowShell.addEventListener("pointerdown", onFlowShellPointerDown);
  dom.flowShell.addEventListener("wheel", onFlowShellWheel, {
    passive: false,
  });
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
      await placeImageFile(file, pointFromEvent(event));
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
    await placeImageFile(file);
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

function designKitPresetById(id) {
  return availableDesignKitPresets().find((preset) => preset.id === id) || null;
}

function availableDesignKitPresets() {
  const presets = [];
  const seen = new Set();
  [...designKitPresets, ...repositoryDesignKitPresets()].forEach((preset) => {
    if (!preset?.id || seen.has(preset.id)) {
      return;
    }
    seen.add(preset.id);
    presets.push(preset);
  });
  return presets;
}

function repositoryDesignKitPresets() {
  const kits = state?.serverStatus?.designKitGallery?.kits;
  if (!Array.isArray(kits)) {
    return [];
  }
  return kits
    .map((kit) => normalizeRepositoryDesignKitPreset(kit))
    .filter(Boolean);
}

function normalizeRepositoryDesignKitPreset(kit) {
  if (!kit || typeof kit !== "object" || Array.isArray(kit)) {
    return null;
  }
  const id = cleanString(kit.id);
  if (!id) {
    return null;
  }
  return {
    id,
    label: cleanString(kit.label) || id,
    summary:
      cleanString(kit.summary) ||
      "Repository design kit loaded from design-kits.",
    audience: cleanString(kit.audience),
    mood: cleanString(kit.mood),
    actionMode: normalizeActionMode(kit.actionMode).id,
    viewport: viewportPresets[kit.viewport] ? kit.viewport : "desktop",
    generation: normalizeGenerationConfig(kit.generation),
    frame: kit.frame && typeof kit.frame === "object" ? kit.frame : {},
    source: kit.source || {
      kind: "repository-design-kit",
      path: "design-kits",
    },
  };
}

function normalizeDesignTokens(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const paletteTokens = Array.isArray(value.palette)
    ? value.palette
        .map((entry) => {
          const hex = normalizeColor(entry?.hex || entry, "");
          return hex
            ? {
                hex,
                count: Number(entry?.count) || 0,
                role: cleanString(entry?.role) || "sampled",
              }
            : null;
        })
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const elementMix =
    value.elementMix && typeof value.elementMix === "object"
      ? value.elementMix
      : {};
  const density =
    value.density && typeof value.density === "object" ? value.density : {};
  return {
    kind: "canvax-extracted-design-tokens",
    source: cleanString(value.source) || "current-frame",
    sourceFrameId: cleanString(value.sourceFrameId),
    sourceFrameTitle: cleanString(value.sourceFrameTitle),
    extractedAt: cleanString(value.extractedAt) || new Date().toISOString(),
    palette: paletteTokens,
    elementMix: {
      total: Number(elementMix.total) || 0,
      paths: Number(elementMix.paths) || 0,
      shapes: Number(elementMix.shapes) || 0,
      arrows: Number(elementMix.arrows) || 0,
      labels: Number(elementMix.labels) || 0,
      imageSlots: Number(elementMix.imageSlots) || 0,
    },
    density: {
      label: cleanString(density.label) || "unknown",
      elementCount: Number(density.elementCount) || 0,
      viewportArea: Number(density.viewportArea) || 0,
      coverage: Number(density.coverage) || 0,
    },
    visualSamples: {
      sourceCount: Number(value.visualSamples?.sourceCount) || 0,
      sampledSources: Number(value.visualSamples?.sampledSources) || 0,
      skippedSources: Number(value.visualSamples?.skippedSources) || 0,
      colorCount: Number(value.visualSamples?.colorCount) || 0,
    },
    shapeLanguage: cleanString(value.shapeLanguage) || "mixed sketch",
    typographyCue: cleanString(value.typographyCue) || "",
    assetCue: cleanString(value.assetCue) || "",
    semanticStructure: normalizeTokenSemanticStructure(value.semanticStructure),
    summary: compactDisplayText(value.summary || "", 420),
  };
}

function normalizeTokenSemanticStructure(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const compactEntries = (items, fields = ["type", "count", "examples"]) =>
    Array.isArray(items)
      ? items
          .map((item) => {
            if (!item || typeof item !== "object") {
              return null;
            }
            return Object.fromEntries(
              fields
                .map((field) => {
                  if (field === "count" || field === "level") {
                    return [field, Number(item[field]) || 0];
                  }
                  if (field === "examples") {
                    return [
                      field,
                      normalizeStringArray(item[field]).slice(0, 4),
                    ];
                  }
                  return [field, cleanString(item[field])];
                })
                .filter(([, fieldValue]) =>
                  Array.isArray(fieldValue)
                    ? fieldValue.length
                    : Boolean(fieldValue),
                ),
            );
          })
          .filter((item) => Object.keys(item).length)
          .slice(0, 32)
      : [];
  return {
    kind: "canvax-semantic-structure",
    detected: Boolean(value.detected),
    sourceLanguage: cleanString(value.sourceLanguage) || "unknown",
    landmarks: compactEntries(value.landmarks),
    components: compactEntries(value.components),
    headings: compactEntries(value.headings, ["level", "text"]),
    actions: compactEntries(value.actions, ["type", "label", "target"]),
    forms: compactEntries(value.forms, ["type", "count"]),
    canvaxBindings: compactEntries(value.canvaxBindings, [
      "id",
      "type",
      "tag",
      "label",
    ]),
    classSignals: compactEntries(value.classSignals),
    summary: compactDisplayText(value.summary || "", 360),
  };
}

function currentDesignTokensForExport() {
  return normalizeDesignTokens(state?.board?.designTokens);
}

function projectSnapshotKey(projectId) {
  return `${PROJECT_SNAPSHOT_PREFIX}${projectId}`;
}

function parseStorageJson(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorageJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function createProjectId() {
  return uid("project");
}

function projectTitleFromSnapshot(snapshot) {
  return cleanString(snapshot?.board?.project) || "Untitled Canvax project";
}

function projectRecordFromSnapshot(projectId, snapshot, previous = {}) {
  const frames = Array.isArray(snapshot?.frames) ? snapshot.frames : [];
  const activeFrame =
    frames.find((frame) => frame.id === snapshot?.activeFrameId) ||
    frames[0] ||
    {};
  const updatedAt =
    frames
      .map((frame) => cleanString(frame.updatedAt))
      .filter(Boolean)
      .sort()
      .at(-1) ||
    cleanString(previous.updatedAt) ||
    new Date().toISOString();

  return {
    id: projectId,
    title: projectTitleFromSnapshot(snapshot),
    frameCount: frames.length,
    activeFrameTitle: cleanString(activeFrame.title) || "Frame 1",
    updatedAt,
    createdAt:
      cleanString(previous.createdAt) ||
      cleanString(frames[0]?.createdAt) ||
      new Date().toISOString(),
  };
}

function normalizeProjectRegistry(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const projects = Array.isArray(source.projects)
    ? source.projects
        .map((project, index) => {
          const id = cleanString(project?.id);
          if (!id) {
            return null;
          }
          return {
            id,
            title: cleanString(project.title) || `Canvax project ${index + 1}`,
            frameCount: Number.isFinite(project.frameCount)
              ? project.frameCount
              : 0,
            activeFrameTitle:
              cleanString(project.activeFrameTitle) || "Frame 1",
            updatedAt:
              cleanString(project.updatedAt) || new Date().toISOString(),
            createdAt:
              cleanString(project.createdAt) || new Date().toISOString(),
          };
        })
        .filter(Boolean)
    : [];
  const uniqueProjects = [
    ...new Map(projects.map((item) => [item.id, item])).values(),
  ];
  const requestedActiveProjectId = cleanString(source.activeProjectId);
  const activeProjectId = uniqueProjects.some(
    (project) => project.id === requestedActiveProjectId,
  )
    ? requestedActiveProjectId
    : uniqueProjects[0]?.id || "";

  return {
    version: 1,
    activeProjectId,
    projects: uniqueProjects,
  };
}

function readProjectRegistry() {
  return normalizeProjectRegistry(parseStorageJson(PROJECT_REGISTRY_KEY));
}

function writeProjectRegistry(registry) {
  const normalized = normalizeProjectRegistry(registry);
  writeStorageJson(PROJECT_REGISTRY_KEY, normalized);
  return normalized;
}

function readProjectSnapshot(projectId) {
  if (!projectId) {
    return null;
  }
  return parseStorageJson(projectSnapshotKey(projectId));
}

function writeProjectSnapshot(projectId, snapshot) {
  if (!projectId || !snapshot) {
    return;
  }
  writeStorageJson(projectSnapshotKey(projectId), snapshot);
}

function ensureProjectRegistry(empty) {
  const existing = readProjectRegistry();
  if (existing.projects.length) {
    return existing;
  }

  const legacySnapshot =
    migratePersistedSnapshot(parseStorageJson(STORAGE_KEY), empty) ||
    buildPersistedSnapshot(empty);
  const projectId = createProjectId();
  const registry = writeProjectRegistry({
    version: 1,
    activeProjectId: projectId,
    projects: [projectRecordFromSnapshot(projectId, legacySnapshot)],
  });
  writeProjectSnapshot(projectId, legacySnapshot);
  writeStorageJson(STORAGE_KEY, legacySnapshot);
  return registry;
}

function syncProjectRegistryFromSnapshot(snapshot) {
  const registry = normalizeProjectRegistry(
    state.projectRegistry || readProjectRegistry(),
  );
  const projectId =
    registry.activeProjectId || registry.projects[0]?.id || createProjectId();
  const previous = registry.projects.find((project) => project.id === projectId);
  const record = projectRecordFromSnapshot(projectId, snapshot, previous);
  const nextProjects = [
    record,
    ...registry.projects.filter((project) => project.id !== projectId),
  ];
  state.projectRegistry = writeProjectRegistry({
    version: 1,
    activeProjectId: projectId,
    projects: nextProjects,
  });
  return projectId;
}

function projectPathSegment(projectId) {
  return (
    cleanString(projectId)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "default"
  );
}

function buildProjectHandoffPaths(projectId = state?.projectRegistry?.activeProjectId) {
  const segment = projectPathSegment(projectId);
  const root = `exports/projects/${segment}`;
  return {
    root,
    liveJsonPath: `${root}/canvax-live-latest.json`,
    liveMarkdownPath: `${root}/canvax-live-latest.md`,
    voiceMarkdownPath: `${root}/canvax-voice-latest.md`,
    taskPackJsonPath: `${root}/canvax-task-pack-latest.json`,
    taskPackMarkdownPath: `${root}/canvax-task-pack-latest.md`,
    rewriteRequestJsonPath: `${root}/canvax-rewrite-request-latest.json`,
    rewriteRequestMarkdownPath: `${root}/canvax-rewrite-request-latest.md`,
    imagePromptPackJsonPath: `${root}/canvax-image-prompt-pack-latest.json`,
    imagePromptPackMarkdownPath: `${root}/canvax-image-prompt-pack-latest.md`,
    assetCandidatesJsonPath: `${root}/canvax-asset-candidates-latest.json`,
    assetCandidatesMarkdownPath: `${root}/canvax-asset-candidates-latest.md`,
    imageGenerationBriefJsonPath: `${root}/canvax-image-generation-brief-latest.json`,
    imageGenerationBriefMarkdownPath: `${root}/canvax-image-generation-brief-latest.md`,
    imageHostTaskJsonPath: `${root}/canvax-image-host-task-latest.json`,
    imageHostTaskMarkdownPath: `${root}/canvax-image-host-task-latest.md`,
    buildRequestJsonPath: `${root}/canvax-build-real-latest.json`,
    buildRequestMarkdownPath: `${root}/canvax-build-real-latest.md`,
    checkpointJsonPath: `${root}/canvax-checkpoint-latest.json`,
    checkpointsIndexPath: `${root}/canvax-checkpoints.json`,
  };
}

function buildProjectExportMetadata() {
  const registry = normalizeProjectRegistry(
    state?.projectRegistry || readProjectRegistry(),
  );
  const active =
    registry.projects.find((project) => project.id === registry.activeProjectId) ||
    projectRecordFromSnapshot(
      registry.activeProjectId || "default",
      buildPersistedSnapshot(state),
    );
  const handoff = buildProjectHandoffPaths(active.id);
  return {
    kind: "canvax-project",
    storage: "browser-local-plus-file-export",
    id: active.id,
    title: cleanString(state?.board?.project) || active.title,
    frameCount: Array.isArray(state?.frames) ? state.frames.length : active.frameCount,
    activeFrameId: state?.activeFrameId || "",
    activeFrameTitle: frameTitleById(state?.activeFrameId) || active.activeFrameTitle,
    registryPath: "exports/canvax-project-registry-latest.json",
    handoff,
    compatibilityHandoff: {
      liveJsonPath: "exports/canvax-live-latest.json",
      liveMarkdownPath: "exports/canvax-live-latest.md",
      note:
        "The active project also mirrors to the shared compatibility handoff for existing /canvax workflows.",
    },
    projects: registry.projects.map((project) => ({
      id: project.id,
      title: project.title,
      frameCount: project.frameCount,
      activeFrameTitle: project.activeFrameTitle,
      updatedAt: project.updatedAt,
    })),
  };
}

function hydrateState() {
  const empty = createInitialState();
  const projectRegistry = ensureProjectRegistry(empty);
  try {
    const projectRaw = projectRegistry.activeProjectId
      ? window.localStorage.getItem(
          projectSnapshotKey(projectRegistry.activeProjectId),
        )
      : "";
    const raw = projectRaw || window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...empty,
        projectRegistry,
      };
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

    const spatialObjects = normalizeSpatialObjects(migrated.spatialObjects);
    const spatialObjectIdSet = new Set(
      spatialObjects.map((object) => object.id),
    );
    const persistedPrimarySpatialObjectId = spatialObjectIdSet.has(
      migrated.selectedSpatialObjectId,
    )
      ? migrated.selectedSpatialObjectId
      : null;
    const persistedSpatialObjectIds = normalizeStringArray(
      migrated.selectedSpatialObjectIds,
    ).filter((id) => spatialObjectIdSet.has(id));
    const selectedSpatialObjectIds = normalizeStringArray([
      ...persistedSpatialObjectIds.filter(
        (id) => id !== persistedPrimarySpatialObjectId,
      ),
      persistedPrimarySpatialObjectId,
    ]).filter((id) => spatialObjectIdSet.has(id));
    const selectedSpatialObjectId = selectedSpatialObjectIds.at(-1) || null;

    return {
      ...empty,
      projectRegistry,
      board: {
        ...empty.board,
        ...(migrated.board || {}),
        actionMode: normalizeActionMode(migrated.board?.actionMode).id,
        designKitPreset:
          cleanString(migrated.board?.designKitPreset) ||
          empty.board.designKitPreset,
        designTokens: normalizeDesignTokens(migrated.board?.designTokens),
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
      autoRewrite: Boolean(migrated.autoRewrite ?? empty.autoRewrite),
      zoom: Number.isFinite(migrated.zoom)
        ? Math.max(0.5, Math.min(3, migrated.zoom))
        : empty.zoom,
      flowZoom: Number.isFinite(migrated.flowZoom)
        ? Math.max(0.35, Math.min(2.25, migrated.flowZoom))
        : empty.flowZoom,
      viewMode: viewModes.some((mode) => mode.id === migrated.viewMode)
        ? migrated.viewMode
        : empty.viewMode,
      workspaceMode: workspaceModes.some(
        (mode) => mode.id === migrated.workspaceMode,
      )
        ? migrated.workspaceMode
        : empty.workspaceMode,
      workbenchFocus: workbenchFocusModes.some(
        (mode) => mode.id === migrated.workbenchFocus,
      )
        ? migrated.workbenchFocus
        : empty.workbenchFocus,
      designKitSearch: cleanString(migrated.designKitSearch),
      workbenchTrayCollapsed: Boolean(migrated.workbenchTrayCollapsed),
      workbenchAgentLogOpen: Boolean(
        migrated.workbenchAgentLogOpen ?? empty.workbenchAgentLogOpen,
      ),
      outputLaneCollapsed: Boolean(
        migrated.outputLaneCollapsed ?? empty.outputLaneCollapsed,
      ),
      historyLaneCollapsed: Boolean(
        migrated.historyLaneCollapsed ?? empty.historyLaneCollapsed,
      ),
      mapObjectFilter: normalizeMapObjectFilter(migrated.mapObjectFilter),
      mapObjectSearch: normalizeMapSearchQuery(migrated.mapObjectSearch),
      assetCandidatePack: normalizeAssetCandidatePack(
        migrated.assetCandidatePack,
      ),
      spatialObjects,
      hiddenSpatialObjectIds: normalizeStringArray(
        migrated.hiddenSpatialObjectIds,
      ),
      selectedSpatialObjectId,
      selectedSpatialObjectIds,
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
        designKitGallery: null,
        designJury: null,
        outputDigest: null,
        outputActivity: [],
        sessionEvents: [],
      },
      captureTimer: null,
      previewStateTimer: null,
      liveRewriteInFlight: false,
      liveRewriteQueued: null,
      liveRewriteActiveSignature: "",
      lastAutoRewriteSignature: "",
      buildRealInFlight: false,
      designReviewInFlight: false,
      outputCheckpointInFlight: false,
      outputAnnotationDraft: null,
      lastActionScope: "",
      draftElement: null,
      isDrawing: false,
      flowDrag: null,
      flowConnectionDraft: null,
      flowPan: null,
      flowPanMomentum: null,
      flowLasso: null,
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
    return {
      ...empty,
      projectRegistry,
    };
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

  const previousVersion = Number.isFinite(snapshot.version) ? snapshot.version : 0;
  const nextSnapshot = {
    ...snapshot,
    version: STORAGE_VERSION,
  };

  if (previousVersion < 4) {
    const activeMapFilter = normalizeMapObjectFilter(snapshot.mapObjectFilter);
    nextSnapshot.outputLaneCollapsed = activeMapFilter !== "outputs";
    nextSnapshot.historyLaneCollapsed = activeMapFilter !== "history";
  }

  return nextSnapshot;
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
      projectRegistry: "exports/canvax-project-registry-latest.json",
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
  const designKit = buildDesignKitSummary();
  if (designKit.designContext?.exists) {
    return {
      label: "Design kit: DESIGN.md",
      detail: designKit.summary,
    };
  }
  return {
    label: "Design kit: board",
    detail: designKit.summary,
  };
}

function buildDesignKitSummary(frames = state?.frames || []) {
  const designContext = currentDesignContextForExport();
  const designTokens = currentDesignTokensForExport();
  const generation = normalizeGenerationConfig(state?.board?.generation);
  const generationRecipe = generationSummaryText(generation);
  const actionMode = currentActionMode();
  const frame =
    (typeof currentFrame === "function" && currentFrame()) || frames[0] || {};
  const activePreset = designKitPresetById(state?.board?.designKitPreset);
  const frameNotes = [frame.objective, frame.layout, frame.motion, frame.assets]
    .map((value) => cleanString(value))
    .filter(Boolean);
  const variantStyle = normalizeVariantStyleProperties(
    frame.variant?.styleProperties || {},
  );
  const styleEntries = variantStylePropertyKeys
    .map((key) => [key, cleanString(variantStyle[key])])
    .filter(([, value]) => value);
  const boardMood = cleanString(state?.board?.designMood);
  const surface = cleanString(state?.board?.audience);
  const sources = [
    ...(activePreset
      ? [
          {
            label: `Kit: ${activePreset.label}`,
            detail: activePreset.source?.path
              ? `${activePreset.summary} Source: ${activePreset.source.path}.`
              : activePreset.summary,
            active: true,
          },
        ]
      : []),
    designContext.exists
      ? {
          label: designContext.relativePath || "DESIGN.md",
          detail:
            designContext.summary ||
            "Project design-system rules are active in task, image, and build handoffs.",
          active: true,
        }
      : {
          label: "Board rules",
          detail:
            "No DESIGN.md was found. Board mood, labels, notes, and sketch geometry become the local design contract.",
          active: true,
        },
    {
      label: generationRecipe,
      detail: "Active Make recipe.",
      active: true,
    },
    {
      label: actionMode.label,
      detail: actionMode.description || "Current output intent.",
      active: true,
    },
    ...(boardMood
      ? [
          {
            label: `Mood: ${compactDisplayText(boardMood, 44)}`,
            detail: "Board-level visual direction.",
            active: true,
          },
        ]
      : []),
    ...(surface
      ? [
          {
            label: `Surface: ${compactDisplayText(surface, 44)}`,
            detail: "Target medium or platform.",
            active: true,
          },
        ]
      : []),
    ...(designTokens
      ? [
          {
            label: `Tokens: ${designTokens.palette.length} colors`,
            detail:
              designTokens.summary ||
              `${designTokens.shapeLanguage}, ${designTokens.density.label} density.`,
            active: true,
          },
        ]
      : []),
    ...(styleEntries.length
      ? [
          {
            label: `${styleEntries.length} style knobs`,
            detail: styleEntries
              .map(([key, value]) => `${key}: ${compactDisplayText(value, 80)}`)
              .join("; "),
            active: true,
          },
        ]
      : []),
    ...(frameNotes.length
      ? [
          {
            label: `${frameNotes.length} frame notes`,
            detail: compactDisplayText(frameNotes.join(" | "), 220),
            active: true,
          },
        ]
      : []),
  ];
  const summary = compactDisplayText(
    [
      designContext.exists
        ? `${designContext.relativePath || "DESIGN.md"} is active`
        : "Using local board rules",
      activePreset ? `Kit: ${activePreset.label}` : "",
      generationRecipe,
      actionMode.label,
      boardMood ? `Mood: ${boardMood}` : "",
      designTokens
        ? `Extracted: ${designTokens.shapeLanguage}, ${designTokens.density.label}`
        : "",
      styleEntries.length
        ? `Style knobs: ${styleEntries.map(([key]) => key).join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join(". "),
    420,
  );

  return {
    kind: "canvax-design-kit",
    label: activePreset
      ? activePreset.label
      : designContext.exists
        ? "Project design kit"
        : "Board design kit",
    statusLabel: activePreset
      ? `${activePreset.label} kit`
      : designContext.exists
        ? "DESIGN.md active"
        : "Board rules active",
    summary,
    preset: activePreset
      ? {
          id: activePreset.id,
          label: activePreset.label,
          summary: activePreset.summary,
          source: activePreset.source || { kind: "builtin" },
        }
      : null,
    designContext,
    generationRecipe,
    actionMode: {
      id: actionMode.id,
      label: actionMode.label,
      description: actionMode.description,
    },
    board: {
      project: cleanString(state?.board?.project),
      mood: boardMood,
      surface,
    },
    activeFrame: {
      id: frame.id || "",
      title: frame.title || "",
      noteCount: frameNotes.length,
    },
    styleKnobs: Object.fromEntries(styleEntries),
    designTokens,
    sources,
    instructions: [
      "Treat this design kit as the active local substitute for a hosted design-system/skill gallery.",
      "If DESIGN.md exists, treat it as the highest-priority project rule source.",
      "If a repository design kit is active, preserve its file path as the reusable project rule source.",
      "Use the active recipe, board mood, frame notes, and style knobs to constrain generated screens, image prompts, and Codex build requests.",
    ],
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
      designKitPreset: "custom",
      designTokens: null,
      generation: createDefaultGenerationConfig(),
    },
    frames: [firstFrame],
    activeFrameId: firstFrame.id,
    tool: "pen",
    color: palette[0],
    size: 14,
    grid: true,
    autoSnap: true,
    autoRewrite: false,
    zoom: 1,
    flowZoom: 1,
    viewMode: "frame",
    workspaceMode: "simple",
    workbenchFocus: "sketch",
    workbenchTrayCollapsed: false,
    workbenchAgentLogOpen: false,
    outputLaneCollapsed: true,
    historyLaneCollapsed: true,
    mapObjectFilter: "all",
    mapObjectSearch: "",
    assetCandidatePack: null,
    imageResultPack: null,
    spatialObjects: [],
    hiddenSpatialObjectIds: [],
    selectedSpatialObjectId: null,
    selectedSpatialObjectIds: [],
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
      designKitGallery: null,
      designJury: null,
      imageResultPack: null,
      outputDigest: null,
      outputActivity: [],
      sessionEvents: [],
    },
    designKitSearch: "",
    captureTimer: null,
    previewStateTimer: null,
    liveRewriteInFlight: false,
    liveRewriteQueued: null,
    liveRewriteActiveSignature: "",
    lastAutoRewriteSignature: "",
    buildRealInFlight: false,
    designReviewInFlight: false,
    outputCheckpointInFlight: false,
    outputAnnotationDraft: null,
    lastActionScope: "",
    draftElement: null,
    isDrawing: false,
    flowDrag: null,
    flowConnectionDraft: null,
    flowPan: null,
    flowPanMomentum: null,
    flowLasso: null,
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
  const size = Number.isFinite(annotation.size)
    ? Math.max(1, Math.min(48, annotation.size))
    : 8;
  const bounds = outputAnnotationBounds({ points, size });

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
    size,
    alpha: Number.isFinite(annotation.alpha)
      ? Math.max(0.05, Math.min(1, annotation.alpha))
      : 1,
    composite,
    bounds,
    normalizedBounds: bounds,
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

function outputAnnotationBounds(annotation) {
  const points = Array.isArray(annotation?.points)
    ? annotation.points.filter(
        (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y),
      )
    : [];
  if (!points.length) {
    return null;
  }
  const size = Number.isFinite(annotation?.size)
    ? Math.max(1, Math.min(48, annotation.size))
    : 8;
  const pad = Math.max(0.004, Math.min(0.045, size / 1600));
  const left = clamp(Math.min(...points.map((point) => point.x)) - pad, 0, 1);
  const top = clamp(Math.min(...points.map((point) => point.y)) - pad, 0, 1);
  const right = clamp(Math.max(...points.map((point) => point.x)) + pad, 0, 1);
  const bottom = clamp(Math.max(...points.map((point) => point.y)) + pad, 0, 1);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  return {
    x: left,
    y: top,
    left,
    top,
    right,
    bottom,
    w: width,
    h: height,
    width,
    height,
  };
}

function normalizeFrameVariant(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const sourceFrameId =
    typeof source.sourceFrameId === "string" ? source.sourceFrameId.trim() : "";
  const label = typeof source.label === "string" ? source.label.trim() : "";
  if (!sourceFrameId && !label) {
    return null;
  }
  return {
    sourceFrameId,
    sourceFrameTitle:
      typeof source.sourceFrameTitle === "string"
        ? source.sourceFrameTitle.trim()
        : "",
    label,
    recipeId:
      typeof source.recipeId === "string" ? source.recipeId.trim() : "",
    direction:
      typeof source.direction === "string" ? source.direction.trim() : "",
    thesis: typeof source.thesis === "string" ? source.thesis.trim() : "",
    designMoves: normalizeStringArray(source.designMoves),
    prompt: typeof source.prompt === "string" ? source.prompt.trim() : "",
    customProperties: normalizeMapCustomProperties(source.customProperties),
    styleProperties: normalizeVariantStyleProperties(source.styleProperties),
    index: Math.max(1, Number(source.index) || 1),
    primary: Boolean(source.primary),
    promotedAt:
      typeof source.promotedAt === "string" ? source.promotedAt.trim() : "",
    reorderedAt:
      typeof source.reorderedAt === "string" ? source.reorderedAt.trim() : "",
    createdAt:
      typeof source.createdAt === "string" && source.createdAt.trim()
        ? source.createdAt.trim()
        : new Date().toISOString(),
    outputObjectId:
      typeof source.outputObjectId === "string" ? source.outputObjectId.trim() : "",
    outputSourceKind:
      typeof source.outputSourceKind === "string"
        ? source.outputSourceKind.trim()
        : "",
    outputTarget:
      typeof source.outputTarget === "string" ? source.outputTarget.trim() : "",
    outputHref: typeof source.outputHref === "string" ? source.outputHref.trim() : "",
  };
}

function frameOutputEditBinding(frame) {
  const variant =
    frame?.variant && typeof frame.variant === "object" ? frame.variant : null;
  if (!variant) {
    return null;
  }
  const objectId = cleanString(variant.outputObjectId);
  const target = cleanString(variant.outputTarget);
  const href = cleanString(variant.outputHref);
  if (!objectId && !target && !href) {
    return null;
  }
  const sourceFrameId = cleanString(variant.sourceFrameId);
  return {
    kind: "canvax-output-edit-binding",
    objectId,
    sourceKind: cleanString(variant.outputSourceKind),
    target,
    href,
    sourceFrameId,
    sourceFrameTitle:
      cleanString(variant.sourceFrameTitle) ||
      (sourceFrameId ? frameTitleById(sourceFrameId) : ""),
    branchFrameId: cleanString(frame?.id),
    branchFrameTitle: cleanString(frame?.title),
    branchLabel: cleanString(variant.label) || "Output edit",
    instruction:
      "This frame is an editable correction branch over the referenced generated output. Apply sketch, voice, and output marks to that output target instead of treating the frame as a new unrelated screen.",
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
    variant: normalizeFrameVariant(frame.variant),
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
    prototype: normalizeElementPrototype(element.prototype),
  };
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
    notes:
      typeof prototype.notes === "string" ? prototype.notes.trim() : "",
    createdAt:
      typeof prototype.createdAt === "string" && prototype.createdAt.trim()
        ? prototype.createdAt.trim()
        : new Date().toISOString(),
    updatedAt:
      typeof prototype.updatedAt === "string" && prototype.updatedAt.trim()
        ? prototype.updatedAt.trim()
        : new Date().toISOString(),
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
      variant: overrides.variant || null,
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
  renderElementPrototypeControls();
}

function clearElementSelection() {
  state.selectedElementIds = [];
  state.selectedElementId = null;
  state.hoverElementId = null;
  renderSizeControl();
  renderElementPrototypeControls();
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
  const focusMarkup = Object.entries(viewportPresets)
    .map(
      ([id, viewport]) =>
        `<option value="${id}">${viewport.label}</option>`,
    )
    .join("");
  dom.viewportSelect.innerHTML = markup;
  dom.focusViewportSelect.innerHTML = focusMarkup;
  dom.focusActionModeSelect.innerHTML = actionModes
    .map(
      (mode) =>
        `<option value="${mode.id}">${mode.label}</option>`,
    )
    .join("");
  const builtInOptions = designKitPresets
    .filter((preset) => designKitMatchesSearch(preset))
    .map(
      (preset) =>
        `<option value="${preset.id}">${escapeHtml(preset.label)}</option>`,
    )
    .join("");
  const repositoryOptions = repositoryDesignKitPresets()
    .filter((preset) => designKitMatchesSearch(preset))
    .map(
      (preset) =>
        `<option value="${preset.id}">${escapeHtml(preset.label)} · file</option>`,
    )
    .join("");
  dom.designKitPresetSelect.innerHTML = [
    `<option value="custom">Manual board rules</option>`,
    builtInOptions
      ? `<optgroup label="Built-in kits">${builtInOptions}</optgroup>`
      : "",
    repositoryOptions
      ? `<optgroup label="Repository kits">${repositoryOptions}</optgroup>`
      : "",
  ].join("");
}

function renderAll() {
  renderWorkspaceMode();
  syncCanvasSize();
  renderBoardFields();
  renderProjectSwitcher();
  renderTools();
  renderToolHint();
  renderZoom();
  renderSelectionActions();
  renderViewMode();
  renderColors();
  renderAutomationControls();
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
  renderAssetCandidateTray();
  renderWorkbenchAgentLog();
}

function renderWorkspaceMode() {
  const mode = workspaceModes.some((entry) => entry.id === state.workspaceMode)
    ? state.workspaceMode
    : "simple";
  state.workspaceMode = mode;
  if (mode === "simple" && state.workbenchFocus === "map") {
    state.viewMode = "flow";
  } else if (mode === "simple" && state.viewMode !== "frame") {
    state.viewMode = "frame";
  }
  if (mode === "simple" && state.voice.scope !== "frame") {
    state.voice.scope = "frame";
  }

  document.body.dataset.workspaceMode = mode;
  document.body.dataset.viewMode = state.viewMode;
  document.body.dataset.workbenchFocus = state.workbenchFocus;
  document.body.dataset.workbenchTray =
    mode === "simple" && state.workbenchTrayCollapsed
      ? "collapsed"
      : "expanded";
  dom.workspaceModeLabel.textContent =
    workspaceModes.find((entry) => entry.id === mode)?.label || "Workbench";
  dom.workspaceModeDescription.textContent =
    workspaceModes.find((entry) => entry.id === mode)?.description ||
    workspaceModes[0].description;
  renderWorkspaceModeGuide(mode);
  dom.focusPad.hidden = mode !== "simple" || state.workbenchTrayCollapsed;
  dom.workbenchTrayToggle.hidden = mode !== "simple";
  dom.workbenchTrayToggle.textContent = state.workbenchTrayCollapsed
    ? "Show brief"
    : "Open scratchpad";
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
  dom.workbenchFocusButtons
    .querySelectorAll("[data-workbench-focus]")
    .forEach((button) => {
      const active = button.dataset.workbenchFocus === state.workbenchFocus;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
      button.title =
        workbenchFocusModes.find(
          (entry) => entry.id === button.dataset.workbenchFocus,
        )?.description || "";
    });
  renderWorkbenchFocusSummary();
  renderFocusPad();
}

function renderWorkspaceModeGuide(mode = state.workspaceMode) {
  if (!dom.workspaceModeGuide) {
    return;
  }
  const entry =
    workspaceModes.find((workspaceMode) => workspaceMode.id === mode) ||
    workspaceModes[0];
  dom.workspaceModeGuide.dataset.mode = entry.id;
  dom.workspaceModeGuide.innerHTML = entry.guide
    .map(
      ([label, detail], index) => `
        <div class="mode-guide-card">
          <span>${index + 1}</span>
          <strong>${escapeHtml(label)}</strong>
          <p>${escapeHtml(detail)}</p>
        </div>
      `,
    )
    .join("");
}

function renderWorkbenchFocusSummary() {
  if (!dom.workbenchFocusSummary) {
    return;
  }
  const frame = currentFrame();
  const frameIndex = Math.max(
    0,
    state.frames.findIndex((candidate) => candidate.id === frame.id),
  );
  const viewport = viewportPresets[frame.viewport] || viewportPresets.desktop;
  const actionMode = currentActionMode();
  const focusMode =
    workbenchFocusModes.find((entry) => entry.id === state.workbenchFocus) ||
    workbenchFocusModes[0];

  dom.workbenchSummaryFrame.textContent = `${frameIndex + 1}. ${frame.title}`;
  dom.workbenchSummarySurface.textContent =
    frame.viewport === "free"
      ? `${viewport.label} ${viewport.width}×${viewport.height}`
      : viewport.label;
  dom.workbenchSummaryAction.textContent = actionMode.label;
  dom.workbenchSummaryFocus.textContent = focusMode.label;
  dom.workbenchFocusSummary.title = [
    frame.title,
    `${viewport.label} ${viewport.width}×${viewport.height}`,
    actionMode.description || actionMode.label,
    focusMode.description || focusMode.label,
  ]
    .filter(Boolean)
    .join(" · ");
  dom.workbenchFocusSummary.hidden = state.workspaceMode !== "simple";
}

function renderProjectSwitcher() {
  const registry = normalizeProjectRegistry(
    state.projectRegistry || readProjectRegistry(),
  );
  state.projectRegistry = registry;
  if (!dom.projectPicker && !dom.focusProjectPicker) {
    return;
  }

  const activeId = registry.activeProjectId;
  const projectOptions = registry.projects
    .map((project) => {
      const frameText =
        project.frameCount === 1 ? "1 frame" : `${project.frameCount} frames`;
      return `<option value="${escapeHtml(project.id)}">${escapeHtml(project.title)} · ${escapeHtml(frameText)}</option>`;
    })
    .join("");
  const canDeleteProject = registry.projects.length > 1;
  [dom.projectPicker, dom.focusProjectPicker].forEach((picker) => {
    if (!picker) {
      return;
    }
    picker.innerHTML = projectOptions;
    picker.value = activeId;
  });
  [dom.deleteProject, dom.focusDeleteProject].forEach((button) => {
    if (!button) {
      return;
    }
    button.disabled = !canDeleteProject;
    button.title = canDeleteProject
      ? "Delete this local project and switch to another one"
      : "Create or duplicate another project before deleting this one";
  });
  const active = registry.projects.find((project) => project.id === activeId);
  const status = active
    ? `Active: ${active.title}. ${active.frameCount || 1} frame${active.frameCount === 1 ? "" : "s"} saved locally; live handoff follows this project.`
    : "Projects are local to this browser. The active project writes the live Codex handoff.";
  if (dom.projectSwitcherStatus) {
    dom.projectSwitcherStatus.textContent = status;
  }
  if (dom.focusProjectStatus) {
    dom.focusProjectStatus.textContent = active
      ? `${active.frameCount || 1} frame${active.frameCount === 1 ? "" : "s"}; saved to active /canvax handoff.`
      : "Active project writes the current /canvax handoff.";
  }
  if (dom.workspaceProjectsButton) {
    const title = active?.title || cleanString(state.board.project) || "Canvax project";
    const frameCount = Number(active?.frameCount) || state.frames.length || 1;
    dom.workspaceProjectsButton.innerHTML = `
      <span>Projects</span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(`${frameCount} frame${frameCount === 1 ? "" : "s"}`)}</small>
    `;
  }
  if (projectBrowserIsOpen()) {
    renderProjectBrowser();
  }
}

function projectBrowserIsOpen() {
  return Boolean(dom.projectBrowserOverlay && !dom.projectBrowserOverlay.hidden);
}

function openProjectBrowser() {
  if (!dom.projectBrowserOverlay) {
    return;
  }
  renderProjectBrowser();
  dom.projectBrowserOverlay.hidden = false;
  window.requestAnimationFrame(() => {
    dom.projectBrowserSearch?.focus();
  });
}

function closeProjectBrowser() {
  if (!dom.projectBrowserOverlay) {
    return;
  }
  dom.projectBrowserOverlay.hidden = true;
}

function renderProjectBrowser() {
  if (!dom.projectBrowserGrid) {
    return;
  }
  const registry = normalizeProjectRegistry(
    state.projectRegistry || readProjectRegistry(),
  );
  const activeId = registry.activeProjectId;
  const query = cleanString(dom.projectBrowserSearch?.value).toLowerCase();
  const projects = registry.projects.filter((project) => {
    if (!query) {
      return true;
    }
    return [project.title, project.activeFrameTitle, project.id]
      .map((value) => cleanString(value).toLowerCase())
      .some((value) => value.includes(query));
  });
  if (!projects.length) {
    dom.projectBrowserGrid.innerHTML = `
      <div class="project-browser-empty">
        <strong>No local projects match that search.</strong>
        <span>Clear the search or create a new Canvax project.</span>
      </div>
    `;
  } else {
    dom.projectBrowserGrid.innerHTML = projects
      .map((project, index) => {
        const active = project.id === activeId;
        const frameCount = Number(project.frameCount) || 0;
        const frameLabel = `${frameCount || 1} frame${frameCount === 1 ? "" : "s"}`;
        const initial = escapeHtml(
          cleanString(project.title).slice(0, 2).toUpperCase() || "CX",
        );
        return `
          <article class="project-browser-card${active ? " active" : ""}">
            <button
              class="project-browser-open-card"
              type="button"
              data-project-action="open"
              data-project-id="${escapeHtml(project.id)}"
              ${active ? "disabled" : ""}
            >
              <span class="project-browser-thumb" aria-hidden="true">${initial}</span>
              <span class="project-browser-card-copy">
                <strong>${escapeHtml(project.title)}</strong>
                <small>${escapeHtml(frameLabel)} · ${escapeHtml(project.activeFrameTitle || "Frame 1")}</small>
                <em>${active ? "Active /canvax handoff" : `Updated ${escapeHtml(formatDateTime(project.updatedAt))}`}</em>
              </span>
              <span class="project-browser-index">${String(index + 1).padStart(2, "0")}</span>
            </button>
            <div class="project-browser-card-actions">
              <button
                class="ghost-button compact"
                type="button"
                data-project-action="open"
                data-project-id="${escapeHtml(project.id)}"
                ${active ? "disabled" : ""}
              >
                ${active ? "Current" : "Open"}
              </button>
              <button
                class="ghost-button compact"
                type="button"
                data-project-action="duplicate"
                data-project-id="${escapeHtml(project.id)}"
              >
                Duplicate
              </button>
              <button
                class="ghost-button compact danger"
                type="button"
                data-project-action="delete"
                data-project-id="${escapeHtml(project.id)}"
                ${registry.projects.length <= 1 ? "disabled" : ""}
              >
                Delete
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }
  if (dom.projectBrowserStatus) {
    const visibleCount = projects.length;
    dom.projectBrowserStatus.textContent = `${visibleCount} of ${registry.projects.length} local project${registry.projects.length === 1 ? "" : "s"} shown. Project files mirror under exports/projects/<project-id>/.`;
  }
}

function handleProjectBrowserAction(action, projectId) {
  const targetId = cleanString(projectId);
  if (!targetId) {
    return;
  }
  if (action === "open") {
    if (targetId === state.projectRegistry?.activeProjectId) {
      closeProjectBrowser();
      return;
    }
    closeProjectBrowser();
    switchProject(targetId);
    return;
  }
  if (action === "duplicate") {
    duplicateProject(targetId);
    return;
  }
  if (action === "delete") {
    deleteProjectById(targetId);
  }
}

function uniqueProjectTitle(
  baseTitle,
  projects = state.projectRegistry?.projects || [],
) {
  const title = cleanString(baseTitle) || "Untitled Canvax project";
  const existing = new Set(
    projects.map((project) => cleanString(project.title)),
  );
  if (!existing.has(title)) {
    return title;
  }
  let index = 2;
  while (existing.has(`${title} ${index}`)) {
    index += 1;
  }
  return `${title} ${index}`;
}

function activateProject(projectId, snapshot, status = "") {
  const registry = normalizeProjectRegistry(state.projectRegistry);
  const nextRegistry = writeProjectRegistry({
    version: 1,
    activeProjectId: projectId,
    projects: registry.projects,
  });
  state.projectRegistry = nextRegistry;
  writeProjectSnapshot(projectId, snapshot);
  writeStorageJson(STORAGE_KEY, snapshot);
  if (status) {
    window.sessionStorage.setItem("canvax-project-switch-notice", status);
  }
  window.location.reload();
}

function switchProject(projectId) {
  const targetId = cleanString(projectId);
  if (!targetId || targetId === state.projectRegistry?.activeProjectId) {
    return;
  }
  persistState();
  const snapshot = readProjectSnapshot(targetId);
  if (!snapshot) {
    renderStatus("Project snapshot is missing in this browser");
    renderProjectSwitcher();
    return;
  }
  const project = state.projectRegistry.projects.find(
    (item) => item.id === targetId,
  );
  activateProject(
    targetId,
    snapshot,
    `Opened ${project?.title || "Canvax project"}`,
  );
}

function createProject() {
  persistState();
  const registry = normalizeProjectRegistry(state.projectRegistry);
  const projectId = createProjectId();
  const nextState = createInitialState();
  nextState.board.project = uniqueProjectTitle("Untitled Canvax project", [
    ...registry.projects,
  ]);
  const snapshot = buildPersistedSnapshot(nextState);
  const record = projectRecordFromSnapshot(projectId, snapshot);
  state.projectRegistry = writeProjectRegistry({
    version: 1,
    activeProjectId: projectId,
    projects: [record, ...registry.projects],
  });
  activateProject(projectId, snapshot, `Created ${record.title}`);
}

function duplicateProject(projectId = state.projectRegistry?.activeProjectId) {
  persistState();
  const registry = normalizeProjectRegistry(state.projectRegistry);
  const sourceId = cleanString(projectId) || registry.activeProjectId;
  const sourceProject = registry.projects.find(
    (project) => project.id === sourceId,
  );
  const sourceSnapshot =
    sourceId === registry.activeProjectId
      ? buildPersistedSnapshot(state)
      : readProjectSnapshot(sourceId);
  if (!sourceSnapshot) {
    renderStatus("Project snapshot is missing in this browser");
    renderProjectBrowser();
    return;
  }
  const nextProjectId = createProjectId();
  const snapshot = structuredClone(sourceSnapshot);
  snapshot.board = {
    ...snapshot.board,
    project: uniqueProjectTitle(
      `${sourceProject?.title || projectTitleFromSnapshot(snapshot)} copy`,
      [...registry.projects],
    ),
  };
  const record = projectRecordFromSnapshot(nextProjectId, snapshot);
  state.projectRegistry = writeProjectRegistry({
    version: 1,
    activeProjectId: nextProjectId,
    projects: [record, ...registry.projects],
  });
  activateProject(nextProjectId, snapshot, `Duplicated ${record.title}`);
}

function deleteProject() {
  deleteProjectById(state.projectRegistry?.activeProjectId);
}

function deleteProjectById(projectId = state.projectRegistry?.activeProjectId) {
  const registry = normalizeProjectRegistry(state.projectRegistry);
  const targetId = cleanString(projectId);
  if (registry.projects.length <= 1 || !targetId) {
    renderStatus("Create or duplicate another project before deleting this one");
    renderProjectSwitcher();
    renderProjectBrowser();
    return;
  }
  const target = registry.projects.find((project) => project.id === targetId);
  const confirmed = window.confirm(
    `Delete "${target?.title || "this Canvax project"}" from this browser? This cannot be undone.`,
  );
  if (!confirmed) {
    renderProjectSwitcher();
    renderProjectBrowser();
    return;
  }
  const remainingProjects = registry.projects.filter(
    (project) => project.id !== targetId,
  );
  window.localStorage.removeItem(projectSnapshotKey(targetId));
  if (targetId !== registry.activeProjectId) {
    state.projectRegistry = writeProjectRegistry({
      version: 1,
      activeProjectId: registry.activeProjectId,
      projects: remainingProjects,
    });
    renderProjectSwitcher();
    renderProjectBrowser();
    renderStatus(`Deleted ${target?.title || "project"}`);
    return;
  }
  const nextProject = remainingProjects[0];
  const nextSnapshot =
    readProjectSnapshot(nextProject.id) ||
    buildPersistedSnapshot(createInitialState());
  state.projectRegistry = writeProjectRegistry({
    version: 1,
    activeProjectId: nextProject.id,
    projects: remainingProjects,
  });
  activateProject(
    nextProject.id,
    nextSnapshot,
    `Deleted ${target?.title || "project"}; opened ${nextProject.title}`,
  );
}

function toggleWorkbenchTray() {
  state.workbenchTrayCollapsed = !state.workbenchTrayCollapsed;
  persistState();
  renderAll();
  renderStatus(
    state.workbenchTrayCollapsed
      ? "Scratchpad open: canvas, dock, and composer are primary"
      : "Workbench tray shown",
  );
}

function applyDesignerStartAction(action) {
  const nextAction = ["sketch", "talk", "make", "map"].includes(action)
    ? action
    : "sketch";
  state.workspaceMode = "simple";
  state.voice.scope = "frame";
  state.focusLastAppliedText = "";

  if (nextAction === "map") {
    state.workbenchFocus = "map";
    state.viewMode = "flow";
    state.workbenchTrayCollapsed = true;
    persistState();
    renderAll();
    renderStatus("Map opened: arrange frames, variants, outputs, and references");
    return;
  }

  state.workbenchFocus = nextAction === "make" ? "split" : "sketch";
  state.viewMode = "frame";
  state.workbenchTrayCollapsed = nextAction === "sketch";
  if (!["pen", "rect", "arrow", "erase"].includes(state.tool)) {
    state.tool = "pen";
  }
  persistState();
  renderAll();

  if (nextAction === "talk") {
    dom.workbenchComposerInput?.focus();
    if (state.voice.status !== "listening") {
      startVoiceDictation();
    }
    renderStatus("Talk mode: dictate or paste the design note for this frame");
    return;
  }

  if (nextAction === "make") {
    renderStatus("Make mode: generating a local preview from the current frame");
    void generateCurrentScreen();
    return;
  }

  renderStatus("Sketch mode: draw rough placement directly on the frame");
}

function openWorkbenchImagePicker() {
  dom.focusImageInput?.click();
  renderStatus("Choose an image to place as an editable canvas object");
}

function openWorkbenchContextPicker() {
  setWorkbenchFocus("map");
  dom.spatialFileInput?.click();
  renderStatus("Choose a file or image to add as a Map context card");
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
  if (action === "pin-note") {
    pinComposerInstructionToMap({ promptIfEmpty: true });
    return;
  }
  if (action === "generate") {
    void generateCurrentScreen();
    return;
  }
  if (action === "build-real") {
    void buildRealScreenWithCodex();
    return;
  }
  if (action === "create-variants") {
    createVariantFramesFromCurrent();
    return;
  }
  if (action === "image-import") {
    openWorkbenchImagePicker();
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
    state.viewMode = state.workbenchFocus === "map" ? "flow" : "frame";
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

function setWorkbenchFocus(focusMode) {
  const nextFocus = workbenchFocusModes.some((mode) => mode.id === focusMode)
    ? focusMode
    : "sketch";
  state.workbenchFocus = nextFocus;
  state.viewMode = nextFocus === "map" ? "flow" : "frame";
  persistState();
  renderWorkspaceMode();
  renderViewMode();
  renderCanvas();
  renderFlowBoard();
  renderWorkbenchOutput();
  renderStatus(
    workbenchFocusModes.find((mode) => mode.id === nextFocus)?.description ||
      "Workbench focus updated",
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
  dom.buildRealScreen.title = `Create a Codex-ready real implementation request using ${summary}`;
  dom.buildRealScreenPanel.title = `Create a Codex-ready real implementation request using ${summary}`;
  renderDesignKitCard();
}

function renderTools() {
  dom.toolButtons.innerHTML = toolDefinitions
    .map(
      (tool) =>
        `<button class="tool-chip ${tool.id === state.tool ? "active" : ""}" data-tool="${tool.id}" title="${escapeHtml(toolMeta[tool.id] || tool.label)}">${tool.label}</button>`,
    )
    .join("");
}

function renderDesignKitCard() {
  if (!dom.designKitCard) {
    return;
  }
  const kit = buildDesignKitSummary();
  dom.designKitTitle.textContent = kit.statusLabel;
  dom.designKitSummary.textContent = kit.summary;
  dom.designKitCard.title = kit.instructions.join(" ");
  const activePreset = designKitPresetById(state.board.designKitPreset);
  dom.designKitSearch.value = state.designKitSearch || "";
  dom.designKitPresetSelect.value = activePreset?.id || "custom";
  dom.applyDesignKit.disabled = dom.designKitPresetSelect.value === "custom";
  if (dom.extractDesignTokens) {
    dom.extractDesignTokens.title = kit.designTokens
      ? `Refresh extracted tokens from ${kit.designTokens.sourceFrameTitle || "current frame"}`
      : "Derive local design tokens from the current sketch without using an API";
  }
  dom.designKitSources.innerHTML = kit.sources
    .slice(0, 8)
    .map(
      (source) =>
        `<li title="${escapeHtml(source.detail || source.label)}">${escapeHtml(source.label)}</li>`,
    )
    .join("");
}

function designKitMatchesSearch(preset) {
  const query = cleanString(state.designKitSearch).toLowerCase();
  if (!query || preset.id === state.board.designKitPreset) {
    return true;
  }
  return [
    preset.id,
    preset.label,
    preset.summary,
    preset.audience,
    preset.mood,
    preset.viewport,
    preset.actionMode,
    preset.source?.path,
    preset.frame?.objective,
    preset.frame?.layout,
    preset.frame?.assets,
  ]
    .map((value) => cleanString(value).toLowerCase())
    .some((value) => value.includes(query));
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
    .querySelectorAll("[data-rail-action='build-real']")
    .forEach((button) => {
      button.disabled = Boolean(state.buildRealInFlight);
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
  renderWorkbenchFocusSummary();
  const hostSummary = describeHostCapabilities();
  dom.focusHostChip.textContent = hostSummary.label;
  dom.focusHostChip.title = hostSummary.detail;
  const designSummary = describeDesignContext();
  dom.focusDesignChip.textContent = designSummary.label;
  dom.focusDesignChip.title = designSummary.detail;
  renderDesignKitCard();
  dom.focusFreeCanvas.classList.toggle("active", frame.viewport === "free");
  syncManualVoiceDraftControls();
  dom.focusApply.disabled = Boolean(state.focusApplyInFlight);
  dom.focusGenerate.disabled = Boolean(state.generationInFlight);
  dom.focusBuildReal.disabled = Boolean(state.buildRealInFlight);
  dom.workbenchReviewOutput.disabled = Boolean(state.designReviewInFlight);
  dom.workbenchOutputStageReview.disabled = Boolean(state.designReviewInFlight);
  dom.buildRealScreen.disabled = Boolean(state.buildRealInFlight);
  dom.buildRealScreenPanel.disabled = Boolean(state.buildRealInFlight);
  dom.focusPromoteVariant.hidden = !frame.variant?.label;
  dom.focusPromoteVariant.disabled = !frame.variant?.label;
  dom.focusPromoteVariant.textContent = frame.variant?.promotedAt
    ? "Primary variant"
    : "Use variant";
  dom.focusImagePack.disabled = Boolean(state.focusApplyInFlight);
  renderAutomationControls();
  dom.focusVoiceToggle.textContent =
    state.voice.status === "listening" ? "Stop talking" : "Start talking";
  dom.focusVoiceToggle.classList.toggle(
    "active",
    state.voice.status === "listening",
  );
  dom.workbenchComposerTalk.textContent =
    state.voice.status === "listening" ? "Stop" : "Talk";
  dom.workbenchComposerTalk.classList.toggle(
    "active",
    state.voice.status === "listening",
  );
  dom.workbenchComposerTalk.setAttribute(
    "aria-pressed",
    String(state.voice.status === "listening"),
  );
  dom.workbenchComposerMake.disabled = Boolean(state.generationInFlight);
  dom.workbenchComposerApply.disabled = Boolean(state.focusApplyInFlight);
  renderWorkbenchPromptChips();

  if (state.buildRealInFlight) {
    dom.focusStatus.textContent =
      "Creating the real implementation request and frame-to-code contract for Codex...";
  } else if (state.designReviewInFlight) {
    dom.focusStatus.textContent =
      "Running the local no-API design jury over the connected output...";
  } else if (state.focusApplyInFlight) {
    dom.focusStatus.textContent =
      "Saving the sketch, voice context, and checkpoint for Codex...";
  } else if (state.voice.status === "listening") {
    dom.focusStatus.textContent = `Listening for ${voiceScopeLabel("frame", frame)}. Keep drawing while you speak.`;
  } else if (state.voice.error) {
    dom.focusStatus.textContent = state.voice.error;
  } else if (state.focusLastAppliedText) {
    dom.focusStatus.textContent = state.focusLastAppliedText;
  } else if (state.autoRewrite) {
    dom.focusStatus.textContent =
      "Live rewrite is on. Autosnap/freeze will refresh the local no-API preview after saving.";
  } else if (!supportsVoice) {
    dom.focusStatus.textContent =
      "Browser dictation is unavailable here. Paste macOS dictation below, then apply.";
  } else {
    dom.focusStatus.textContent =
      "Draw rough placement, start talking or paste a note, then Apply to Codex.";
  }

  renderFocusVoiceIntentLane(relevantSegments);
  renderWorkbenchOutput();
  renderWorkbenchAgentLog();
  renderAssetCandidateTray();

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

function renderFocusVoiceIntentLane(segments = voiceSegmentsForCurrentScope()) {
  const intents = buildVoiceIntentQueue(segments, { limit: 4 });
  if (!intents.length) {
    dom.focusVoiceIntents.hidden = true;
    dom.focusVoiceIntents.innerHTML = "";
    return;
  }

  dom.focusVoiceIntents.hidden = false;
  dom.focusVoiceIntents.innerHTML = `
    <div class="voice-intent-heading">
      <span>Voice intent queue</span>
      <small>${intents.length} active</small>
    </div>
    <div class="voice-intent-grid">
      ${intents
        .map(
          (intent) => `
            <article class="voice-intent-card" data-intent="${escapeHtml(intent.category)}">
              <span>${escapeHtml(intent.label)}</span>
              <strong>${escapeHtml(intent.summary)}</strong>
              <p>${escapeHtml(intent.detail)}</p>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderWorkbenchPromptChips() {
  const markup = workbenchPromptChips
    .map(
      (chip, index) => `
        <button
          class="workbench-prompt-chip"
          data-workbench-prompt="${escapeHtml(chip.id)}"
          type="button"
          title="${escapeHtml(chip.note)}"
        >
          <span>${index + 1}</span>
          ${escapeHtml(chip.label)}
        </button>
      `,
    )
    .join("");
  dom.focusPromptChips.innerHTML = markup;
  dom.workbenchComposerChips.innerHTML = markup;
}

function applyWorkbenchPromptChip(chipId) {
  const chip = workbenchPromptChips.find((item) => item.id === chipId);
  if (!chip) {
    return;
  }
  if (chip.action === "add-context") {
    state.board.actionMode = normalizeActionMode(chip.actionMode).id;
    state.focusLastAppliedText = `Quick action: ${chip.label}`;
    persistState();
    renderAll();
    openWorkbenchContextPicker();
    return;
  }
  state.voice.scope = "frame";
  state.board.actionMode = normalizeActionMode(chip.actionMode).id;
  state.voice.manualDraft = "";
  dom.focusManualInput.value = "";
  dom.voiceManualInput.value = "";
  addVoiceSegment(chip.note, { provider: "workbench-prompt-chip" });
  state.focusLastAppliedText = `Quick prompt added: ${chip.label}`;
  persistState();
  renderAll();
  void saveCheckpointToWorkspace("workbench-prompt-chip", { silent: true });
}

function normalizeAssetCandidate(candidate) {
  if (!candidate?.id) {
    return null;
  }
  const frame =
    currentFrameById(candidate.sourceFrameId) ||
    state.frames[0] ||
    currentFrame();
  const placementMap = buildAssetCandidatePlacementMap(candidate, frame);
  const outputSlots = normalizeAssetCandidateOutputSlots(
    candidate.outputSlots,
    candidate,
    placementMap,
  );
  const hasAccepted = outputSlots.some((slot) => slot.accepted);
  const hasAttached = outputSlots.some((slot) => slot.attached);
  const hasPlaced = outputSlots.some((slot) => slot.imageElementId);
  return {
    ...candidate,
    status:
      candidate.status ||
      (hasAccepted
        ? "accepted"
        : hasAttached
          ? "attached"
          : hasPlaced
            ? "placed"
            : "prompt-ready"),
    sourceFrameId: candidate.sourceFrameId || frame?.id || "",
    sourceFrameTitle:
      candidate.sourceFrameTitle || frame?.title || "Canvax frame",
    placement:
      candidate.placement ||
      placementMap.placement ||
      describeBounds(placementMap.normalizedBounds),
    placementMap,
    outputSlots,
  };
}

function normalizeAssetCandidatePack(pack) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    return null;
  }
  const candidates = Array.isArray(pack.candidates)
    ? pack.candidates.map(normalizeAssetCandidate).filter(Boolean)
    : [];
  return {
    ...pack,
    kind: pack.kind || "canvax-asset-candidates",
    requiresOpenAiApiKey: Boolean(pack.requiresOpenAiApiKey),
    reviewSummary: buildAssetCandidateReviewSummary(candidates),
    candidates,
  };
}

function normalizeImageResultPack(pack) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    return null;
  }
  const results = Array.isArray(pack.results)
    ? pack.results
        .filter((result) => result && typeof result === "object")
        .map((result) => ({
          ...result,
          candidateId: cleanString(result.candidateId),
          slotId: cleanString(result.slotId || result.outputSlot?.slotId),
          imagePath: cleanString(result.imagePath || result.outputSlot?.imagePath),
          status: cleanString(result.status || "returned"),
          accepted: Boolean(result.accepted || result.outputSlot?.accepted),
        }))
        .filter((result) => result.candidateId && result.imagePath)
    : [];
  return {
    ...pack,
    kind: pack.kind || "canvax-image-results",
    requiresOpenAiApiKey: Boolean(pack.requiresOpenAiApiKey),
    results,
    resultCount: results.length,
  };
}

function buildAssetCandidatePlacementMap(candidate, frame = currentFrame()) {
  const viewport = assetCandidateViewport(frame);
  const normalizedBounds = normalizedAssetCandidateBounds(candidate);
  const pixelBounds = pixelBoundsFromNormalizedBounds(
    normalizedBounds,
    viewport,
  );
  const cssPlacement = {
    position: "absolute",
    left: `${roundNumber(normalizedBounds.x * 100)}%`,
    top: `${roundNumber(normalizedBounds.y * 100)}%`,
    width: `${roundNumber(normalizedBounds.w * 100)}%`,
    height: `${roundNumber(normalizedBounds.h * 100)}%`,
    aspectRatio:
      candidate.aspectRatio ||
      `${Math.max(1, Math.round(pixelBounds.width))}/${Math.max(
        1,
        Math.round(pixelBounds.height),
      )}`,
  };
  const slotId = assetCandidateSlotId(candidate, 0);
  const safeId = String(candidate.id || "asset-candidate").replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  );
  return {
    kind: "canvax-asset-placement",
    slotId,
    sourceFrameId: candidate.sourceFrameId || frame?.id || "",
    sourceFrameTitle: candidate.sourceFrameTitle || frame?.title || "",
    sourceElementId: candidate.sourceElementId || "",
    surface: viewport.id,
    viewport,
    placement: candidate.placement || describeBounds(normalizedBounds),
    normalizedBounds,
    pixelBounds,
    safeZones: buildSafeZones(viewport),
    cssPlacement,
    targetSelector: `[data-asset-candidate-id="${safeId}"]`,
    htmlScaffold: `<figure class="canvax-asset-slot" data-asset-candidate-id="${safeId}" style="position:absolute;left:${cssPlacement.left};top:${cssPlacement.top};width:${cssPlacement.width};height:${cssPlacement.height};aspect-ratio:${cssPlacement.aspectRatio};"></figure>`,
    instructions:
      "Generate or attach imagery for this exact slot, then place the result back on the same frame using the normalized and pixel bounds.",
  };
}

function assetCandidateViewport(frame) {
  const preset = viewportPresets[frame?.viewport] || viewportPresets.desktop;
  const width = frame?.viewportWidth || preset.width || 1440;
  const height = frame?.viewportHeight || preset.height || 1024;
  return {
    id: frame?.viewport || preset.id || "desktop",
    label: preset.label || frame?.viewport || "Canvas",
    width,
    height,
    aspectRatio: `${width}:${height}`,
  };
}

function normalizedAssetCandidateBounds(candidate) {
  const bounds = candidate?.bounds;
  if (
    bounds &&
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    Number.isFinite(bounds.w) &&
    Number.isFinite(bounds.h) &&
    bounds.w > 0 &&
    bounds.h > 0
  ) {
    const x = clamp(bounds.x, 0, 0.98);
    const y = clamp(bounds.y, 0, 0.98);
    const w = clamp(bounds.w, 0.02, 1 - x);
    const h = clamp(bounds.h, 0.02, 1 - y);
    return {
      x: roundNumber(x),
      y: roundNumber(y),
      w: roundNumber(w),
      h: roundNumber(h),
      centerX: roundNumber(x + w / 2),
      centerY: roundNumber(y + h / 2),
    };
  }
  return {
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    centerX: 0.5,
    centerY: 0.5,
  };
}

function pixelBoundsFromNormalizedBounds(bounds, viewport) {
  const left = Math.round(bounds.x * viewport.width);
  const top = Math.round(bounds.y * viewport.height);
  const width = Math.round(bounds.w * viewport.width);
  const height = Math.round(bounds.h * viewport.height);
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

function assetCandidateSlotId(candidate, index = 0) {
  return `${candidate?.id || "asset-candidate"}-slot-${index + 1}`;
}

function normalizeAssetCandidateOutputSlots(slots, candidate, placementMap) {
  const baseSlots = Array.isArray(slots) && slots.length ? slots : [{}];
  return baseSlots.map((slot, index) => {
    const accepted = Boolean(slot.accepted);
    const attached = Boolean(
      slot.attached || slot.imagePath || slot.imageElementId,
    );
    const status =
      slot.status ||
      (accepted ? "accepted" : attached ? "attached" : "empty");
    return {
      id: slot.id || slot.slotId || assetCandidateSlotId(candidate, index),
      slotId: slot.slotId || slot.id || assetCandidateSlotId(candidate, index),
      label:
        slot.label ||
        (candidate.type === "frame-composite"
          ? "Full-frame generated image"
          : "Generated region image"),
      role:
        slot.role ||
        (candidate.type === "frame-composite"
          ? "full-frame-output"
          : "region-output"),
      status,
      assetCandidateId: candidate.id,
      frameId:
        slot.frameId ||
        candidate.sourceFrameId ||
        placementMap.sourceFrameId ||
        "",
      frameTitle:
        slot.frameTitle ||
        candidate.sourceFrameTitle ||
        placementMap.sourceFrameTitle ||
        "",
      placement: slot.placement || candidate.placement || placementMap.placement,
      bounds: slot.bounds || placementMap.normalizedBounds,
      pixelBounds: slot.pixelBounds || placementMap.pixelBounds,
      cssPlacement: slot.cssPlacement || placementMap.cssPlacement,
      targetSelector: slot.targetSelector || placementMap.targetSelector,
      imagePath: slot.imagePath || "",
      imageElementId: slot.imageElementId || "",
      accepted,
      attached,
      attachedAt: slot.attachedAt || "",
      acceptedAt: slot.acceptedAt || "",
      notes:
        slot.notes ||
        "Empty local slot. Generate externally through the host image lane when available, then attach the result here.",
    };
  });
}

function normalizeSpatialObjects(objects) {
  if (!Array.isArray(objects)) {
    return [];
  }
  return objects
    .filter((object) => object?.id)
    .map((object, index) => ({
      id: object.id,
      type: object.type || "note",
      title: object.title || "Spatial object",
      subtitle: object.subtitle || "",
      sourceId: object.sourceId || "",
      sourceKind: normalizeSpatialSourceKind(
        object.sourceKind || object.type || "manual",
      ),
      frameIds: Array.isArray(object.frameIds) ? object.frameIds : [],
      x: Number.isFinite(object.x)
        ? object.x
        : defaultSpatialObjectPosition(index).x,
      y: Number.isFinite(object.y)
        ? object.y
        : defaultSpatialObjectPosition(index).y,
      width: Number.isFinite(object.width)
        ? object.width
        : SPATIAL_OBJECT_WIDTH,
      height: Number.isFinite(object.height)
        ? object.height
        : SPATIAL_OBJECT_HEIGHT,
      status: object.status || "",
      meta: object.meta && typeof object.meta === "object" ? object.meta : {},
    }));
}

function normalizeSpatialSourceKind(value) {
  const source = cleanString(value).toLowerCase().replace(/[_\s]+/g, "-");
  if (
    source.includes("generated-target") ||
    source.includes("generated-preview") ||
    source.includes("output-target") ||
    source.includes("output-preview") ||
    source.includes("materialized-preview") ||
    source.includes("implementation-preview")
  ) {
    return "generated-target";
  }
  if (
    source.includes("generated-artifact") ||
    source.includes("generated-file") ||
    source.includes("output-artifact") ||
    source.includes("output-file")
  ) {
    return "generated-artifact";
  }
  if (
    source.includes("workspace-change") ||
    source.includes("code-change") ||
    source.includes("code-update")
  ) {
    return "workspace-change";
  }
  if (
    [
      "generated-target",
      "generated-preview",
      "output-target",
      "output-preview",
    ].includes(source)
  ) {
    return "generated-target";
  }
  if (
    [
      "generated-artifact",
      "generated-file",
      "output-artifact",
      "output-file",
    ].includes(source)
  ) {
    return "generated-artifact";
  }
  if (["workspace-change", "code-change", "code-update"].includes(source)) {
    return "workspace-change";
  }
  return source || "manual";
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return [...new Set(values.map(cleanString).filter(Boolean))];
}

function syncSpatialObjectsFromHandoffs() {
  const currentObjects = normalizeSpatialObjects(state.spatialObjects);
  const hiddenObjectIds = new Set(
    normalizeStringArray(state.hiddenSpatialObjectIds),
  );
  const candidates = (state.assetCandidatePack?.candidates || [])
    .map(normalizeAssetCandidate)
    .filter(Boolean);
  if (state.assetCandidatePack) {
    state.assetCandidatePack.candidates = candidates;
    state.assetCandidatePack.reviewSummary =
      buildAssetCandidateReviewSummary(candidates);
  }
  const manifest = state.serverStatus?.previewManifest || null;
  const targets = collectManifestTargets(manifest).filter(
    manifestItemBelongsToCurrentBoard,
  );
  const artifacts = collectManifestArtifacts(manifest).filter(
    manifestItemBelongsToCurrentBoard,
  );
  const changes = collectManifestChanges(manifest).filter(
    manifestItemBelongsToCurrentBoard,
  );
  const mapTargets = selectSpatialMapTargets(targets);
  const mapArtifacts = selectSpatialMapArtifacts(artifacts, mapTargets);
  const mapChanges = changes.slice(0, 6);
  const mapCheckpoints = selectSpatialMapCheckpoints(
    state.serverStatus?.checkpointHistory,
  );
  const activeManifestObjectIds = new Set([
    ...mapTargets
      .map((target, index) =>
        buildManifestSpatialObjectId("target", target, index),
      ),
    ...mapArtifacts
      .map((artifact, index) =>
        buildManifestSpatialObjectId("artifact", artifact, index),
      ),
    ...mapChanges
      .map((change, index) =>
        buildManifestSpatialObjectId("change", change, index),
      ),
  ].filter((id) => !hiddenObjectIds.has(id)));
  const nextObjects = currentObjects.filter(
    (object) =>
      (!isManifestSpatialObject(object) ||
        activeManifestObjectIds.has(object.id)) &&
      (!isCheckpointSpatialObject(object) ||
        mapCheckpoints.some(
          (checkpoint, index) =>
            buildCheckpointSpatialObjectId(checkpoint, index) === object.id,
        )),
  );
  const existingIds = new Set(nextObjects.map((object) => object.id));

  candidates.slice(0, 12).forEach((candidate) => {
    const id = `asset-object-${candidate.id}`;
    const position = defaultSpatialObjectPosition(nextObjects.length);
    upsertSpatialObject(nextObjects, existingIds, {
      id,
      type:
        candidate.type === "frame-composite" ? "image-frame" : "image-region",
      title: candidate.title || "Asset candidate",
      subtitle:
        candidate.placement || candidate.sourceFrameTitle || "prompt-ready",
      sourceId: candidate.id,
      sourceKind: "asset-candidate",
      frameIds: candidate.sourceFrameId ? [candidate.sourceFrameId] : [],
      x: position.x,
      y: position.y,
      width: SPATIAL_OBJECT_WIDTH,
      height: SPATIAL_OBJECT_HEIGHT,
      status: candidate.status || "prompt-ready",
      meta: {
        prompt: candidate.prompt || "",
        placement: candidate.placement || "",
        bounds: candidate.bounds || null,
        placementMap: candidate.placementMap || null,
        outputSlots: candidate.outputSlots || [],
        sourceFrameTitle: candidate.sourceFrameTitle || "",
        aspectRatio: candidate.aspectRatio || "",
      },
    });
  });

  mapTargets.forEach((target, index) => {
    const id = buildManifestSpatialObjectId("target", target, index);
    if (hiddenObjectIds.has(id)) {
      return;
    }
    const position = defaultOutputSpatialObjectPosition(index);
    upsertSpatialObject(nextObjects, existingIds, {
      id,
      type: "generated-output",
      title: designerManifestTitle("target", target, index),
      subtitle:
        target.previewPath ||
        target.resolvedUrl ||
        target.description ||
        "implementation preview",
      sourceId: target.id || "",
      sourceKind: "generated-target",
      frameIds: frameIdsFromManifestItem(target),
      x: position.x,
      y: position.y,
      width: SPATIAL_OBJECT_WIDTH,
      height: SPATIAL_OBJECT_HEIGHT,
      status: target.type || target.source || "preview",
      meta: {
        url: target.resolvedUrl || target.url || "",
        previewPath: target.previewPath || "",
        description: target.description || "",
        summary: target.changeSummary || target.refinement?.summary || "",
        sourceLabel: target.label || "",
        laneId: SPATIAL_OUTPUT_LANE_ID,
        laneIndex: index,
        autoLanePosition: true,
      },
    });
  });

  mapArtifacts.forEach((artifact, index) => {
    const id = buildManifestSpatialObjectId("artifact", artifact, index);
    if (hiddenObjectIds.has(id)) {
      return;
    }
    const position = defaultOutputSpatialObjectPosition(mapTargets.length + index);
    upsertSpatialObject(nextObjects, existingIds, {
      id,
      type:
        artifact.kind === "preview" ? "generated-output" : "generated-artifact",
      title: designerManifestTitle("artifact", artifact, index),
      subtitle:
        artifact.path ||
        artifact.resolvedUrl ||
        artifact.description ||
        "artifact",
      sourceId: artifact.id || "",
      sourceKind: "generated-artifact",
      frameIds: frameIdsFromManifestItem(artifact),
      x: position.x,
      y: position.y,
      width: SPATIAL_OBJECT_WIDTH,
      height: SPATIAL_OBJECT_HEIGHT,
      status: artifact.kind || artifact.status || "artifact",
      meta: {
        url: artifact.resolvedUrl || "",
        path: artifact.path || "",
        description: artifact.description || "",
        summary: artifact.changeSummary || artifact.refinement?.summary || "",
        sourceLabel: artifact.label || "",
        laneId: SPATIAL_OUTPUT_LANE_ID,
        laneIndex: mapTargets.length + index,
        autoLanePosition: true,
      },
    });
  });

  mapChanges.forEach((change, index) => {
    const id = buildManifestSpatialObjectId("change", change, index);
    if (hiddenObjectIds.has(id)) {
      return;
    }
    const position = defaultOutputSpatialObjectPosition(
      mapTargets.length + mapArtifacts.length + index,
    );
    upsertSpatialObject(nextObjects, existingIds, {
      id,
      type: "changed-file",
      title: change.label || change.path || "Changed file",
      subtitle: change.path || change.summary || "workspace change",
      sourceId: change.id || "",
      sourceKind: "workspace-change",
      frameIds: frameIdsFromManifestItem(change),
      x: position.x,
      y: position.y,
      width: SPATIAL_OBJECT_WIDTH,
      height: SPATIAL_OBJECT_HEIGHT,
      status: change.kind || "updated",
      meta: {
        path: change.path || "",
        summary: change.summary || "",
        url: change.resolvedUrl || "",
        sourceLabel: change.label || "",
        laneId: SPATIAL_OUTPUT_LANE_ID,
        laneIndex: mapTargets.length + mapArtifacts.length + index,
        autoLanePosition: true,
      },
    });
  });

  mapCheckpoints.forEach((checkpoint, index) => {
    const id = buildCheckpointSpatialObjectId(checkpoint, index);
    const position = defaultHistoryCheckpointPosition(index);
    upsertSpatialObject(nextObjects, existingIds, {
      id,
      type: "checkpoint-event",
      title: checkpoint.label || checkpointReasonLabel(checkpoint.reason),
      subtitle: checkpoint.targetLabel
        ? `${checkpoint.frameTitle || "Board"} -> ${designerOutputTargetLabel(
            checkpoint.targetLabel,
            checkpoint.frameTitle,
          )}`
        : checkpoint.frameTitle || "Session checkpoint",
      sourceId: checkpoint.id || "",
      sourceKind: "checkpoint",
      frameIds: checkpoint.frameId ? [checkpoint.frameId] : [],
      x: position.x,
      y: position.y,
      width: SPATIAL_OBJECT_WIDTH,
      height: SPATIAL_OBJECT_HEIGHT,
      status: checkpoint.reason || "checkpoint",
      meta: {
        savedAt: checkpoint.savedAt || "",
        checkpointUrl: checkpoint.checkpointUrl || "",
        jsonUrl: checkpoint.jsonUrl || "",
        markdownUrl: checkpoint.markdownUrl || "",
        voiceMarkdownUrl: checkpoint.voiceMarkdownUrl || "",
        voiceSegmentCount: checkpoint.voiceSegmentCount || 0,
        captureCount: checkpoint.captureCount || 0,
        artifactCount: checkpoint.artifactCount || 0,
        changeCount: checkpoint.changeCount || 0,
        laneId: SPATIAL_HISTORY_LANE_ID,
        laneIndex: index,
        autoLanePosition: true,
      },
    });
  });

  state.spatialObjects = nextObjects;
  setSelectedSpatialObjects(
    currentSelectedSpatialObjectIds().filter((id) =>
      nextObjects.some((object) => object.id === id),
    ),
    state.selectedSpatialObjectId,
  );
}

function upsertSpatialObject(objects, existingIds, nextObject) {
  const existingIndex = objects.findIndex(
    (object) => object.id === nextObject.id,
  );
  if (existingIndex === -1) {
    objects.push(nextObject);
    existingIds.add(nextObject.id);
    return;
  }

  const existing = objects[existingIndex];
  const manualFields = existing.meta?.manualFields || {};
  const pinned = isSpatialObjectPinned(existing);
  const locked = isSpatialObjectLocked(existing);
  const manualPrompt = manualFields.prompt
    ? cleanString(existing.meta?.prompt)
    : "";
  const manualCustomProperties = manualFields.customProperties
    ? normalizeMapCustomProperties(existing.meta?.customProperties)
    : [];
  const manualLaneOrder =
    existing.meta?.manualLaneOrder === true &&
    existing.meta?.laneId &&
    existing.meta?.laneId === nextObject.meta?.laneId;
  objects[existingIndex] = {
    ...nextObject,
    title: manualFields.title ? existing.title : nextObject.title,
    subtitle: manualFields.subtitle ? existing.subtitle : nextObject.subtitle,
    status: manualFields.status ? existing.status : nextObject.status,
    x: existing.x,
    y: existing.y,
    width: existing.width || nextObject.width,
    height: existing.height || nextObject.height,
    meta: {
      ...nextObject.meta,
      ...(manualFields.prompt ? { prompt: manualPrompt } : {}),
      ...(manualCustomProperties.length
        ? { customProperties: manualCustomProperties }
        : {}),
      ...(manualLaneOrder
        ? {
            laneIndex: Number.isFinite(existing.meta?.laneIndex)
              ? existing.meta.laneIndex
              : nextObject.meta?.laneIndex,
            manualLaneOrder: true,
          }
        : {}),
      ...(pinned ? { pinned: true } : {}),
      ...(locked ? { locked: true } : {}),
      ...(Object.keys(manualFields).length ? { manualFields } : {}),
    },
  };
  existingIds.add(nextObject.id);
}

function selectSpatialMapTargets(targets) {
  const selected = new Map();
  [...targets].reverse().forEach((target) => {
    const key = spatialManifestGroupingKey(target, target.type || "preview");
    if (!key || selected.has(key)) {
      return;
    }
    selected.set(key, target);
  });
  return [...selected.values()].reverse().slice(0, 8);
}

function manifestItemBelongsToCurrentBoard(item) {
  const frameIds = frameIdsFromManifestItem(item);
  return (
    !frameIds.length || frameIds.some((frameId) => Boolean(frameById(frameId)))
  );
}

function selectSpatialMapArtifacts(artifacts, selectedTargets) {
  const targetPaths = new Set(
    selectedTargets
      .map((target) => cleanString(target.previewPath || target.path))
      .filter(Boolean),
  );
  const selected = new Map();
  [...artifacts]
    .reverse()
    .filter((artifact) => isDesignerVisibleMapArtifact(artifact, targetPaths))
    .forEach((artifact) => {
      const key = spatialManifestGroupingKey(
        artifact,
        artifact.kind || "artifact",
      );
      if (!key || selected.has(key)) {
        return;
      }
      selected.set(key, artifact);
    });
  return [...selected.values()].reverse().slice(0, 4);
}

function isDesignerVisibleMapArtifact(artifact, targetPaths = new Set()) {
  const kind = cleanString(artifact?.kind || artifact?.type).toLowerCase();
  const id = cleanString(artifact?.id).toLowerCase();
  const path = cleanString(artifact?.path || artifact?.previewPath);
  const lowerPath = path.toLowerCase();

  if (kind === "preview" && targetPaths.has(path)) {
    return false;
  }

  if (["context", "meta"].includes(kind)) {
    return false;
  }

  if (
    kind === "reference" &&
    (id.startsWith("materialize-sketch-") ||
      /\/sketch\.(png|jpe?g|webp|avif)$/.test(lowerPath))
  ) {
    return false;
  }

  return true;
}

function selectSpatialMapCheckpoints(history) {
  const items = Array.isArray(history?.items) ? history.items : [];
  const selected = new Map();
  items.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      return;
    }
    const key = cleanString(
      `${item.id || "checkpoint"}-${item.savedAt || index}`,
    );
    if (!key || selected.has(key)) {
      return;
    }
    selected.set(key, item);
  });
  return [...selected.values()].slice(0, 8);
}

function spatialManifestGroupingKey(item, kind = "item") {
  const frameIds = frameIdsFromManifestItem(item);
  const normalizedKind = spatialObjectKey(kind || "item");
  if (frameIds[0]) {
    return `frame:${frameIds[0]}:${normalizedKind}`;
  }
  const source = cleanString(item?.source || item?.type || item?.kind);
  return `global:${normalizedKind}:${source || "output"}`;
}

function buildManifestSpatialObjectId(kind, item, index = 0) {
  if (kind === "target") {
    return `target-object-${spatialObjectKey(
      item.id,
      item.previewPath,
      item.resolvedUrl,
      index,
    )}`;
  }
  if (kind === "artifact") {
    return `artifact-object-${spatialObjectKey(
      item.id,
      item.path,
      item.resolvedUrl,
      index,
    )}`;
  }
  return `change-object-${spatialObjectKey(item.id, item.path, index)}`;
}

function buildCheckpointSpatialObjectId(item, index = 0) {
  return `checkpoint-object-${spatialObjectKey(
    `${item?.id || "checkpoint"}-${item?.savedAt || index}`,
  )}`;
}

function isManifestSpatialObject(object) {
  const sourceKind = normalizeSpatialSourceKind(object?.sourceKind);
  if (
    [
      "generated-target",
      "generated-artifact",
      "workspace-change",
    ].includes(sourceKind)
  ) {
    return true;
  }

  const id = cleanString(object?.id);
  if (
    id.startsWith("target-object-") ||
    id.startsWith("artifact-object-") ||
    id.startsWith("change-object-")
  ) {
    return true;
  }

  return (
    ["generated-output", "generated-artifact", "changed-file"].includes(
      object?.type,
    ) && Boolean(object?.sourceId || object?.meta?.path || object?.meta?.url)
  );
}

function isCheckpointSpatialObject(object) {
  return (
    object?.sourceKind === "checkpoint" ||
    object?.type === "checkpoint-event" ||
    cleanString(object?.id).startsWith("checkpoint-object-")
  );
}

function clearGeneratedSpatialObjects(options = {}) {
  const { silent = false } = options;
  const generatedObjects = state.spatialObjects.filter(isManifestSpatialObject);
  if (!generatedObjects.length) {
    if (!silent) {
      renderStatus("No generated Map objects to clear");
      dom.workspaceStatus.textContent = "No generated Map objects to clear.";
    }
    return 0;
  }

  const generatedIds = generatedObjects.map((object) => object.id);
  state.hiddenSpatialObjectIds = normalizeStringArray([
    ...(state.hiddenSpatialObjectIds || []),
    ...generatedIds,
  ]);
  state.spatialObjects = state.spatialObjects.filter(
    (object) => !generatedIds.includes(object.id),
  );
  persistState();
  renderFlowBoard();
  renderFlowInspector();
  scheduleLivePreviewSync();
  if (!silent) {
    const count = generatedIds.length;
    renderStatus(
      `Cleared ${count} generated Map object${count === 1 ? "" : "s"}`,
    );
    dom.workspaceStatus.textContent =
      `Cleared ${count} generated Map object${count === 1 ? "" : "s"} from the spatial map. New output will appear again when generated.`;
  }
  return generatedIds.length;
}

function toggleHistoryLane() {
  state.historyLaneCollapsed = !state.historyLaneCollapsed;
  if (state.historyLaneCollapsed) {
    const selectedIds = currentSelectedSpatialObjectIds().filter((id) => {
      const object = spatialObjectById(id);
      return object && !isCheckpointSpatialObject(object);
    });
    setSelectedSpatialObjects(selectedIds, selectedIds.at(-1) || null);
  }
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  renderStatus(
    state.historyLaneCollapsed
      ? "Collapsed checkpoint history lane"
      : "Expanded checkpoint history lane",
  );
}

function toggleOutputLane() {
  state.outputLaneCollapsed = !state.outputLaneCollapsed;
  if (state.outputLaneCollapsed) {
    const selectedIds = currentSelectedSpatialObjectIds().filter((id) => {
      const object = spatialObjectById(id);
      return (
        object &&
        (!isManifestSpatialObject(object) || isSpatialObjectPinned(object))
      );
    });
    setSelectedSpatialObjects(selectedIds, selectedIds.at(-1) || null);
  }
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  renderStatus(
    state.outputLaneCollapsed
      ? "Collapsed generated output shelf"
      : "Expanded generated output shelf",
  );
}

function onMapTimelineClick(event) {
  const button = event.target.closest("[data-map-timeline-type]");
  if (!button) {
    return;
  }
  const targetId = button.dataset.mapTimelineId;
  if (button.dataset.mapTimelineType === "frame") {
    focusMapTimelineFrame(targetId);
    return;
  }
  if (button.dataset.mapTimelineType === "branch") {
    focusMapTimelineBranch(targetId);
    return;
  }
  if (button.dataset.mapTimelineType === "object") {
    focusMapTimelineObject(targetId);
  }
}

function focusMapTimelineBranch(frameId) {
  const frame = frameById(frameId);
  if (!frame) {
    renderStatus("Timeline branch is no longer available");
    return false;
  }
  state.activeFrameId = frame.id;
  state.viewMode = "flow";
  const object = spatialObjectById(`variant-object-${frame.id}`);
  if (object) {
    setSelectedSpatialObjects([object.id], object.id);
  } else {
    clearSpatialObjectSelection({ render: false });
  }
  persistState();
  renderFlowBoard();
  centerFlowOnFrame(frame.id);
  renderSpec();
  renderStatus(`Focused ${frame.title} branch in the Map timeline`);
  return true;
}

function focusMapTimelineFrame(frameId) {
  const frame = state.frames.find((candidate) => candidate.id === frameId);
  if (!frame) {
    renderStatus("Timeline frame is no longer available");
    return false;
  }
  state.activeFrameId = frame.id;
  state.viewMode = "flow";
  clearSpatialObjectSelection({ render: false });
  persistState();
  renderFlowBoard();
  centerFlowOnFrame(frame.id);
  renderSpec();
  renderStatus(`Focused ${frame.title} in the Map timeline`);
  return true;
}

function focusMapTimelineObject(objectId) {
  const object = selectSpatialObject(objectId, {
    render: true,
    announce: true,
  });
  if (!object) {
    renderStatus("Timeline object is no longer available");
    return false;
  }
  centerFlowOnSpatialObject(object.id);
  return true;
}

function centerFlowOnFrame(frameId) {
  const index = state.frames.findIndex((frame) => frame.id === frameId);
  const frame = state.frames[index];
  if (!frame) {
    return false;
  }
  return centerFlowOnRect(flowCardRect(frame, index));
}

function centerFlowOnSpatialObject(objectId) {
  const object = spatialObjectById(objectId);
  if (!object) {
    return false;
  }
  return centerFlowOnRect(spatialObjectRect(object));
}

function centerFlowOnRect(rect) {
  if (!dom.flowShell || !rect) {
    return false;
  }
  cancelFlowPanMomentum();
  const zoom = Number.isFinite(state.flowZoom) ? state.flowZoom : 1;
  dom.flowShell.scrollLeft = Math.max(
    0,
    (rect.x + rect.width / 2) * zoom - dom.flowShell.clientWidth / 2,
  );
  dom.flowShell.scrollTop = Math.max(
    0,
    (rect.y + rect.height / 2) * zoom - dom.flowShell.clientHeight / 2,
  );
  renderFlowNavigatorViewport();
  return true;
}

function normalizeMapObjectFilter(value) {
  const candidate = cleanString(value).toLowerCase();
  return MAP_OBJECT_FILTERS.some((filter) => filter.id === candidate)
    ? candidate
    : "all";
}

function mapObjectFilterLabel(value = state.mapObjectFilter) {
  const id = normalizeMapObjectFilter(value);
  return MAP_OBJECT_FILTERS.find((filter) => filter.id === id)?.label || "All";
}

function setMapObjectFilter(value) {
  const nextFilter = normalizeMapObjectFilter(value);
  state.mapObjectFilter = nextFilter;
  if (nextFilter === "outputs" && state.outputLaneCollapsed) {
    state.outputLaneCollapsed = false;
  }
  if (nextFilter === "history" && state.historyLaneCollapsed) {
    state.historyLaneCollapsed = false;
  }
  const selectedIds = currentSelectedSpatialObjectIds();
  setSelectedSpatialObjects(selectedIds, selectedIds.at(-1) || null);
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  renderStatus(
    nextFilter === "all"
      ? "Showing all Map objects"
      : `Focusing Map on ${mapObjectFilterLabel(nextFilter).toLowerCase()}`,
  );
}

function normalizeMapSearchQuery(value) {
  return cleanString(value).slice(0, 96);
}

function setMapObjectSearch(value, options = {}) {
  const { announce = true } = options;
  const nextQuery = normalizeMapSearchQuery(value);
  if (state.mapObjectSearch === nextQuery) {
    return;
  }
  state.mapObjectSearch = nextQuery;
  const selectedIds = currentSelectedSpatialObjectIds().filter((id) => {
    const object = spatialObjectById(id);
    return object && isSpatialObjectVisibleInCurrentMap(object);
  });
  setSelectedSpatialObjects(selectedIds, selectedIds.at(-1) || null);
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  if (announce) {
    renderStatus(
      nextQuery
        ? `Searching Map for "${nextQuery}"`
        : "Map search cleared",
    );
  }
}

function spatialObjectKey(...values) {
  const candidate = values
    .map((value) =>
      Number.isFinite(value) ? String(value) : cleanString(value),
    )
    .find(Boolean);
  return (
    (candidate || "item")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "item"
  );
}

function frameIdsFromManifestItem(item) {
  const frameIds = Array.isArray(item?.frameIds) ? item.frameIds : [];
  const sourceFrameId = cleanString(item?.sourceFrameId);
  const inferredFrameId = inferFrameIdFromManifestPath(item);
  return [
    ...new Set([...frameIds, sourceFrameId, inferredFrameId].filter(Boolean)),
  ];
}

function manifestItemFrameTitle(item) {
  const directTitle = cleanString(
    item?.frameTitle || item?.sourceFrameTitle || item?.targetFrameTitle,
  );
  if (directTitle) {
    return directTitle;
  }
  const frameId = frameIdsFromManifestItem(item)[0];
  return frameId ? frameById(frameId)?.title || "" : "";
}

function designerOutputTargetLabel(rawLabel, fallbackFrameTitle = "") {
  const label = cleanString(rawLabel);
  const fallback = cleanString(fallbackFrameTitle);
  if (!label) {
    return fallback ? `Generated screen for ${fallback}` : "Generated output";
  }

  const legacyMatch = label.match(
    /^(.*?)(?:\s+(?:materialized|generated\s+(?:screen|preview|target)))$/i,
  );
  const inferredFrameTitle = cleanString(legacyMatch?.[1]) || fallback;
  if (/materialized|generated-target/i.test(label) || legacyMatch) {
    return inferredFrameTitle
      ? `Generated screen for ${inferredFrameTitle}`
      : "Generated screen";
  }

  return label.replace(/generated-target/gi, "Generated screen");
}

function designerOutputTargetLabelFromItem(item, fallbackFrameTitle = "") {
  return designerOutputTargetLabel(
    item?.label || item?.title || item?.targetLabel || "",
    manifestItemFrameTitle(item) || fallbackFrameTitle,
  );
}

function designerManifestTitle(kind, item, index = 0) {
  const frameTitle = manifestItemFrameTitle(item);
  const source = cleanString(item?.type || item?.kind || item?.source);
  const rawLabel = cleanString(item?.label || item?.title);
  const targetLabel = frameTitle || "Board";
  const frameScopedTargetLabel = frameTitle || "Generated";
  const rawLooksMaterialized = /materialized|generated-target/i.test(rawLabel);

  if (kind === "target") {
    const fallbackTitle = frameTitle
      ? `Generated screen for ${frameScopedTargetLabel}`
      : "Generated screen";
    if (
      source === "generated-screen-preview" ||
      source === "materialized-preview" ||
      source === "implementation-preview" ||
      rawLooksMaterialized
    ) {
      return fallbackTitle;
    }
    return rawLabel || fallbackTitle;
  }

  if (kind === "artifact") {
    const fallbackTitle = frameTitle
      ? `Generated file for ${frameScopedTargetLabel}`
      : `Generated file ${index + 1}`;
    if (source === "preview") {
      return fallbackTitle;
    }
    return rawLooksMaterialized
      ? fallbackTitle
      : rawLabel || cleanString(item?.path) || fallbackTitle;
  }

  const fallbackTitle = frameTitle
    ? `Code change for ${frameScopedTargetLabel}`
    : `${targetLabel} output`;
  return rawLooksMaterialized
    ? fallbackTitle
    : rawLabel || fallbackTitle;
}

function inferFrameIdFromManifestPath(item) {
  const values = [
    item?.previewPath,
    item?.path,
    item?.url,
    item?.resolvedUrl,
    item?.htmlPath,
  ].map(cleanString);
  const patterns = [
    /(?:^|\/)frames\/([^/?#]+)/,
    /(?:^|\/)materialized\/(frame-[^/?#]+)/,
    /(?:^|\/)large-session\/(frame-[^/?#]+)/,
    /(?:^|\/)(frame-[^/?#]+)(?:\/|$)/,
  ];
  for (const value of values) {
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match?.[1]) {
        return decodeURIComponent(match[1]);
      }
    }
  }
  return "";
}

function defaultSpatialObjectPosition(index) {
  const column = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: FLOW_SURFACE_PADDING + column * (SPATIAL_OBJECT_WIDTH + 44),
    y:
      FLOW_SURFACE_PADDING +
      FLOW_CARD_HEIGHT +
      132 +
      row * (SPATIAL_OBJECT_HEIGHT + 36),
  };
}

function defaultOutputSpatialObjectPosition(index) {
  const column = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: FLOW_SURFACE_PADDING + column * (SPATIAL_OBJECT_WIDTH + 44),
    y:
      FLOW_SURFACE_PADDING +
      FLOW_CARD_HEIGHT +
      300 +
      row * (SPATIAL_OBJECT_HEIGHT + 36),
  };
}

function defaultHistoryCheckpointPosition(index) {
  return {
    x:
      FLOW_SURFACE_PADDING +
      3 * (SPATIAL_OBJECT_WIDTH + 44) +
      SPATIAL_HISTORY_LANE_PADDING,
    y:
      FLOW_SURFACE_PADDING +
      index * (SPATIAL_OBJECT_HEIGHT + SPATIAL_HISTORY_LANE_GAP),
  };
}

function ensureFlowWorkspaceMargin(minX, minY) {
  const shiftX =
    Number.isFinite(minX) && minX < FLOW_EDGE_EXPAND_MARGIN
      ? FLOW_EDGE_EXPAND_STEP + FLOW_EDGE_EXPAND_MARGIN - minX
      : 0;
  const shiftY =
    Number.isFinite(minY) && minY < FLOW_EDGE_EXPAND_MARGIN
      ? FLOW_EDGE_EXPAND_STEP + FLOW_EDGE_EXPAND_MARGIN - minY
      : 0;
  if (!shiftX && !shiftY) {
    return { x: 0, y: 0 };
  }
  shiftFlowWorkspace(shiftX, shiftY);
  const zoom = Number.isFinite(state.flowZoom) ? state.flowZoom : 1;
  if (dom.flowShell) {
    dom.flowShell.scrollLeft += shiftX * zoom;
    dom.flowShell.scrollTop += shiftY * zoom;
  }
  return { x: shiftX, y: shiftY };
}

function shiftFlowWorkspace(deltaX = 0, deltaY = 0) {
  if (!deltaX && !deltaY) {
    return;
  }
  state.frames.forEach((frame) => {
    frame.flowPosition = {
      x: (Number(frame.flowPosition?.x) || 0) + deltaX,
      y: (Number(frame.flowPosition?.y) || 0) + deltaY,
    };
  });
  state.spatialObjects.forEach((object) => {
    object.x = (Number(object.x) || 0) + deltaX;
    object.y = (Number(object.y) || 0) + deltaY;
  });
  adjustActiveFlowDragForWorkspaceShift(deltaX, deltaY);
}

function adjustActiveFlowDragForWorkspaceShift(deltaX, deltaY) {
  const drag = state.flowDrag;
  if (!drag) {
    return;
  }
  if (Number.isFinite(drag.originX)) {
    drag.originX += deltaX;
  }
  if (Number.isFinite(drag.originY)) {
    drag.originY += deltaY;
  }
  if (drag.originBounds) {
    drag.originBounds = makeBounds(
      drag.originBounds.left + deltaX,
      drag.originBounds.top + deltaY,
      drag.originBounds.right + deltaX,
      drag.originBounds.bottom + deltaY,
    );
  }
  if (Array.isArray(drag.objectOrigins)) {
    drag.objectOrigins.forEach((origin) => {
      origin.x += deltaX;
      origin.y += deltaY;
      if (origin.memberOrigins) {
        shiftSpatialMemberOrigins(origin.memberOrigins, deltaX, deltaY);
      }
    });
  }
}

function shiftSpatialMemberOrigins(memberOrigins, deltaX, deltaY) {
  ["frames", "objects"].forEach((key) => {
    (memberOrigins?.[key] || []).forEach((origin) => {
      origin.x += deltaX;
      origin.y += deltaY;
    });
  });
}

function setOriginEntry(map, entry) {
  if (!entry?.id || map.has(entry.id)) {
    return;
  }
  map.set(entry.id, entry);
}

function spatialObjectOrigin(object) {
  return {
    id: object.id,
    x: object.x,
    y: object.y,
    width: object.width || SPATIAL_OBJECT_WIDTH,
    height: object.height || SPATIAL_OBJECT_HEIGHT,
  };
}

function spatialFrameOrigin(frame) {
  const position = flowPositionForFrame(frame);
  return {
    id: frame.id,
    x: position.x,
    y: position.y,
  };
}

function currentAssetCandidates() {
  const pack = normalizeAssetCandidatePack(state.assetCandidatePack);
  if (!pack?.candidates.length) {
    return [];
  }
  const activeFrameId = state.activeFrameId;
  const activeCandidates = pack.candidates.filter(
    (candidate) => candidate.sourceFrameId === activeFrameId,
  );
  const otherCandidates = pack.candidates.filter(
    (candidate) => candidate.sourceFrameId !== activeFrameId,
  );
  return [...activeCandidates, ...otherCandidates].slice(0, 6);
}

function addSpatialNoteObject() {
  const defaultText = state.board.goal || "Design note";
  const text = window.prompt("Add a note to the spatial map", defaultText);
  if (!cleanString(text)) {
    return;
  }
  const title = compactDisplayText(text, 44) || "Map note";
  addSpatialObject({
    type: "map-note",
    title,
    subtitle: cleanString(text),
    sourceKind: "manual-note",
    status: "note",
    meta: {
      text: cleanString(text),
      createdFrom: "workbench-map",
    },
  });
}

function pinComposerInstructionToMap({
  promptIfEmpty = false,
  focusMap = true,
} = {}) {
  let text = cleanString(state.voice.manualDraft);
  if (!text && promptIfEmpty) {
    text = cleanString(
      window.prompt(
        "Pin a note to the spatial map",
        state.board.goal || "Design intent",
      ),
    );
  }
  if (!text) {
    renderStatus("Type or dictate an instruction before pinning it to Map");
    return null;
  }
  state.voice.manualDraft = "";
  syncManualVoiceDraftControls();
  addVoiceSegment(text, { provider: "map-note" });
  const object = addSpatialObject({
    type: "map-note",
    title: compactDisplayText(text, 44) || "Pinned instruction",
    subtitle: text,
    sourceKind: "manual-note",
    status: "pinned instruction",
    frameIds: [currentFrame().id],
    meta: {
      text,
      codexAction:
        "Use this pinned spoken/sketched instruction as active design intent.",
      prompt: text,
      createdFrom: "workbench-composer",
      voiceProvider: "map-note",
      frameId: currentFrame().id,
      frameTitle: currentFrame().title,
    },
  });
  if (focusMap) {
    state.workspaceMode = "simple";
    state.workbenchFocus = "map";
    state.viewMode = "flow";
    state.workbenchTrayCollapsed = true;
    persistState();
    renderAll();
  }
  void saveExportToWorkspace({ silent: true });
  renderStatus("Pinned instruction to Map and voice context");
  return object;
}

function addSpatialGroupObject() {
  const defaultTitle = `Exploration ${state.spatialObjects.length + 1}`;
  const title = window.prompt("Name this spatial group", defaultTitle);
  if (!cleanString(title)) {
    return;
  }
  addSpatialObject({
    type: "map-group",
    title: cleanString(title),
    subtitle: "Drag this region behind related frames, references, and outputs.",
    sourceKind: "spatial-group",
    status: "group",
    width: SPATIAL_OBJECT_WIDTH * 2 + 44,
    height: SPATIAL_OBJECT_HEIGHT * 1.55,
    meta: {
      text: cleanString(title),
      createdFrom: "workbench-map",
    },
  });
}

function canCreateSpatialGroupFromSelection() {
  const selectedObjects = selectedSpatialObjectsForTransform();
  return selectedObjects.length >= 2 && !hasLockedSpatialObjects(selectedObjects);
}

function selectedSpatialGroups() {
  return selectedSpatialObjects().filter((object) => object.type === "map-group");
}

function createSpatialGroupFromSelection() {
  const selectedObjects = selectedSpatialObjectsForTransform();
  if (selectedObjects.length < 2) {
    renderStatus("Select at least two Map objects to group");
    return null;
  }
  if (hasLockedSpatialObjects(selectedObjects)) {
    renderLockedSpatialObjectStatus("group them");
    return null;
  }
  const bounds = unionBounds(selectedObjects.map(spatialObjectBounds));
  if (!bounds) {
    renderStatus("Could not read selected Map object bounds");
    return null;
  }
  const padding = SPATIAL_GROUP_FROM_SELECTION_PADDING;
  const group = addSpatialObject({
    type: "map-group",
    title: `Group of ${selectedObjects.length}`,
    subtitle: "Created from selected Map objects. Move the group to move its contents together.",
    sourceKind: "spatial-group",
    status: "group",
    x: Math.max(32, bounds.left - padding),
    y: Math.max(32, bounds.top - padding),
    width: Math.max(SPATIAL_OBJECT_MIN_WIDTH, bounds.width + padding * 2),
    height: Math.max(SPATIAL_OBJECT_MIN_HEIGHT, bounds.height + padding * 2),
    meta: {
      createdFrom: "map-selection",
      groupedObjectIds: selectedObjects.map((object) => object.id),
    },
  });
  if (group) {
    renderStatus(`Grouped ${selectedObjects.length} Map objects`);
  }
  return group;
}

function ungroupSelectedSpatialGroups() {
  const groups = selectedSpatialGroups();
  if (!groups.length) {
    renderStatus("Select a Map group to ungroup");
    return 0;
  }
  if (hasLockedSpatialObjects(groups)) {
    renderLockedSpatialObjectStatus("ungroup them");
    return 0;
  }
  const groupIds = new Set(groups.map((group) => group.id));
  const selectedIds = currentSelectedSpatialObjectIds().filter(
    (id) => !groupIds.has(id),
  );
  state.spatialObjects = state.spatialObjects.filter(
    (object) => !groupIds.has(object.id),
  );
  setSelectedSpatialObjects(selectedIds, selectedIds.at(-1) || null);
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  renderStatus(
    `Ungrouped ${groups.length} Map group${groups.length === 1 ? "" : "s"}`,
  );
  return groups.length;
}

function selectSelectedSpatialGroupContents() {
  const groups = selectedSpatialGroups();
  if (!groups.length) {
    renderStatus("Select a Map group to select its contents");
    return 0;
  }
  const memberIds = normalizeStringArray(
    groups.flatMap((group) => {
      const members = spatialGroupMemberDetails(group);
      return [...members.objects, ...members.groups].map((object) => object.id);
    }),
  ).filter((id) => !groups.some((group) => group.id === id));
  if (!memberIds.length) {
    renderStatus("Selected group contains no selectable Map objects");
    return 0;
  }
  setSelectedSpatialObjects(memberIds, memberIds.at(-1) || null);
  state.selectedConnectionId = null;
  renderFlowBoard();
  renderSpec();
  renderStatus(
    `Selected ${memberIds.length} grouped Map object${memberIds.length === 1 ? "" : "s"}`,
  );
  return memberIds.length;
}

function fitSelectedSpatialGroupsToContents() {
  const groups = selectedSpatialGroups();
  if (!groups.length) {
    renderStatus("Select a Map group to fit around its contents");
    return 0;
  }
  if (hasLockedSpatialObjects(groups)) {
    renderLockedSpatialObjectStatus("fit group bounds");
    return 0;
  }
  let fittedCount = 0;
  const padding = SPATIAL_GROUP_FROM_SELECTION_PADDING;
  groups.forEach((group) => {
    const bounds = spatialGroupContentBounds(group);
    if (!bounds) {
      return;
    }
    group.x = Math.max(32, bounds.left - padding);
    group.y = Math.max(32, bounds.top - padding);
    group.width = Math.max(SPATIAL_OBJECT_MIN_WIDTH, bounds.width + padding * 2);
    group.height = Math.max(
      SPATIAL_OBJECT_MIN_HEIGHT,
      bounds.height + padding * 2,
    );
    fittedCount += 1;
  });
  if (!fittedCount) {
    renderStatus("Selected group has no contents to fit");
    return 0;
  }
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  renderStatus(
    `Fit ${fittedCount} Map group${fittedCount === 1 ? "" : "s"} to contents`,
  );
  return fittedCount;
}

function spatialGroupContentBounds(group) {
  const members = spatialGroupMemberDetails(group);
  const bounds = [
    ...members.frames.map((frame) => {
      const rect = flowCardRect(frame);
      return makeBounds(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
    }),
    ...members.objects.map(spatialObjectBounds),
    ...members.groups.map(spatialObjectBounds),
  ].filter(Boolean);
  return unionBounds(bounds);
}

async function addSpatialFileObject(file) {
  const isImage = file.type.startsWith("image/");
  const thumbnailDataUrl =
    isImage && file.size <= 1_500_000 ? await readFileAsDataUrl(file) : "";
  addSpatialObject({
    type: isImage ? "reference-image" : "reference-file",
    title: file.name || "Reference file",
    subtitle: `${file.type || "file"} • ${formatFileSize(file.size)}`,
    sourceKind: "reference-file",
    status: isImage ? "image reference" : "file reference",
    meta: {
      fileName: file.name || "",
      mimeType: file.type || "",
      size: file.size || 0,
      thumbnailDataUrl,
    },
  });
}

function addSpatialObject(partial) {
  const position = defaultSpatialObjectPosition(state.spatialObjects.length);
  const object = normalizeSpatialObjects([
    {
      id: uid("spatial"),
      type: partial.type || "map-note",
      title: partial.title || "Spatial object",
      subtitle: partial.subtitle || "",
      sourceId: partial.sourceId || "",
      sourceKind: partial.sourceKind || "manual",
      frameIds: partial.frameIds || [],
      x: partial.x ?? position.x,
      y: partial.y ?? position.y,
      width: partial.width || SPATIAL_OBJECT_WIDTH,
      height: partial.height || SPATIAL_OBJECT_HEIGHT,
      status: partial.status || "ready",
      meta: partial.meta || {},
    },
  ])[0];
  if (!object) {
    return null;
  }
  state.spatialObjects = normalizeSpatialObjects([
    ...state.spatialObjects,
    object,
  ]);
  setSelectedSpatialObjects([object.id]);
  state.selectedConnectionId = null;
  persistState();
  renderFlowBoard();
  renderSpec();
  renderStatus(`Added ${object.title} to the spatial map`);
  return object;
}

function removeSpatialObject(objectId) {
  const object = spatialObjectById(objectId);
  if (!object) {
    return false;
  }
  if (isSpatialObjectLocked(object)) {
    renderStatus(`Unlock ${object.title} before removing it`);
    return false;
  }
  state.spatialObjects = state.spatialObjects.filter(
    (candidate) => candidate.id !== objectId,
  );
  setSelectedSpatialObjects(
    currentSelectedSpatialObjectIds().filter((id) => id !== objectId),
  );
  persistState();
  renderFlowBoard();
  renderSpec();
  renderStatus(`Removed ${object.title} from the spatial map`);
  return true;
}

function removeSelectedSpatialObjects() {
  const selectedIds = currentSelectedSpatialObjectIds();
  if (!selectedIds.length) {
    return 0;
  }
  const lockedIds = selectedIds.filter((id) =>
    isSpatialObjectLocked(spatialObjectById(id)),
  );
  if (lockedIds.length) {
    renderLockedSpatialObjectStatus("delete them");
    return 0;
  }
  const removableIds = selectedIds;
  state.spatialObjects = state.spatialObjects.filter(
    (object) => !removableIds.includes(object.id),
  );
  setSelectedSpatialObjects([]);
  persistState();
  renderFlowBoard();
  renderSpec();
  renderStatus(
    `Removed ${removableIds.length} Map object${removableIds.length === 1 ? "" : "s"} from the spatial map`,
  );
  return removableIds.length;
}

function selectedSpatialObject() {
  return (
    spatialObjectById(state.selectedSpatialObjectId) ||
    selectedSpatialObjects().at(-1) ||
    null
  );
}

function currentSelectedSpatialObjectIds() {
  return normalizeStringArray([
    ...(state.selectedSpatialObjectIds || []),
    state.selectedSpatialObjectId,
  ]).filter((id) => {
    const object = spatialObjectById(id);
    return object && isSpatialObjectVisibleInCurrentMap(object);
  });
}

function selectedSpatialObjects() {
  return currentSelectedSpatialObjectIds()
    .map((id) => spatialObjectById(id))
    .filter(Boolean);
}

function spatialObjectLayerPeers(object) {
  if (!object) {
    return [];
  }
  const isGroupLayer = object.type === "map-group";
  return state.spatialObjects.filter((candidate) =>
    isGroupLayer
      ? candidate.type === "map-group"
      : candidate.type !== "map-group",
  );
}

function spatialObjectLayerIndex(object) {
  return spatialObjectLayerPeers(object).findIndex(
    (candidate) => candidate.id === object?.id,
  );
}

function spatialObjectLayerLabel(object) {
  const peers = spatialObjectLayerPeers(object);
  const index = spatialObjectLayerIndex(object);
  if (!peers.length || index < 0) {
    return "";
  }
  const layerName = object.type === "map-group" ? "Group layer" : "Layer";
  return `${layerName} ${index + 1} of ${peers.length}`;
}

function spatialLaneOrderLabel(object) {
  const descriptor = spatialObjectLaneDescriptor(object);
  if (!descriptor) {
    return "";
  }
  const objects = spatialLaneObjects(descriptor);
  const index = objects.findIndex((candidate) => candidate.id === object?.id);
  if (!objects.length || index < 0) {
    return "";
  }
  return `${descriptor.label} ${index + 1} of ${objects.length}`;
}

function spatialBranchOrderLabel(object) {
  if (normalizeSpatialSourceKind(object?.sourceKind) !== "variant-branch") {
    return "";
  }
  const frame = frameById(object.frameIds?.[0] || object.sourceId);
  const sourceFrameId = frame?.variant?.sourceFrameId || object.meta?.sourceFrameId;
  if (!frame || !sourceFrameId) {
    return "";
  }
  const branches = variantBranchFramesForSource(sourceFrameId);
  const index = branches.findIndex((candidate) => candidate.id === frame.id);
  if (!branches.length || index < 0) {
    return "";
  }
  return `Branch ${index + 1} of ${branches.length}`;
}

function canReorderSelectedSpatialObjects(direction) {
  if (hasLockedSpatialObjects()) {
    return false;
  }
  const selectedIds = new Set(currentSelectedSpatialObjectIds());
  if (!selectedIds.size) {
    return false;
  }
  return [true, false].some((groupLayer) =>
    canReorderSpatialLayerSubset(
      state.spatialObjects,
      selectedIds,
      (object) =>
        groupLayer ? object.type === "map-group" : object.type !== "map-group",
      direction,
    ),
  );
}

function canReorderSpatialLayerSubset(objects, selectedIds, predicate, direction) {
  const layerObjects = objects.filter(predicate);
  const selectedIndexes = layerObjects
    .map((object, index) => (selectedIds.has(object.id) ? index : -1))
    .filter((index) => index >= 0);
  if (!selectedIndexes.length || selectedIndexes.length === layerObjects.length) {
    return false;
  }
  const sortedIndexes = [...selectedIndexes].sort((a, b) => a - b);
  if (direction === "front") {
    return sortedIndexes.some(
      (index, offset) => index !== layerObjects.length - sortedIndexes.length + offset,
    );
  }
  return sortedIndexes.some((index, offset) => index !== offset);
}

function spatialObjectLaneDescriptor(object) {
  if (isManifestSpatialObject(object)) {
    return {
      id: SPATIAL_OUTPUT_LANE_ID,
      label: "Output shelf",
      predicate: isManifestSpatialObject,
      positionForIndex: defaultOutputSpatialObjectPosition,
    };
  }
  if (isCheckpointSpatialObject(object)) {
    return {
      id: SPATIAL_HISTORY_LANE_ID,
      label: "History lane",
      predicate: isCheckpointSpatialObject,
      positionForIndex: defaultHistoryCheckpointPosition,
    };
  }
  return null;
}

function selectedSpatialLaneDescriptor() {
  const selectedObjects = selectedSpatialObjects();
  if (!selectedObjects.length) {
    return null;
  }
  const descriptors = selectedObjects.map(spatialObjectLaneDescriptor);
  const first = descriptors[0];
  if (!first || descriptors.some((descriptor) => descriptor?.id !== first.id)) {
    return null;
  }
  return first;
}

function spatialLaneObjects(descriptor) {
  if (!descriptor?.predicate) {
    return [];
  }
  return sortSpatialLaneObjects(state.spatialObjects.filter(descriptor.predicate));
}

function canReorderSelectedSpatialLane(direction) {
  if (hasLockedSpatialObjects()) {
    return false;
  }
  const descriptor = selectedSpatialLaneDescriptor();
  if (!descriptor) {
    return false;
  }
  const selectedSet = new Set(currentSelectedSpatialObjectIds());
  return canMoveSelectedLaneObjects(
    spatialLaneObjects(descriptor),
    selectedSet,
    direction,
  );
}

function canMoveSelectedLaneObjects(objects, selectedSet, direction) {
  if (!selectedSet?.size || selectedSet.size >= objects.length) {
    return false;
  }
  if (direction === "earlier") {
    return objects.some(
      (object, index) =>
        selectedSet.has(object.id) &&
        index > 0 &&
        !selectedSet.has(objects[index - 1]?.id),
    );
  }
  return objects.some(
    (object, index) =>
      selectedSet.has(object.id) &&
      index < objects.length - 1 &&
      !selectedSet.has(objects[index + 1]?.id),
  );
}

function selectedVariantBranchFrames() {
  const selectedObjects = selectedSpatialObjects();
  if (!selectedObjects.length) {
    return [];
  }
  const branchObjects = selectedObjects.filter(
    (object) => normalizeSpatialSourceKind(object.sourceKind) === "variant-branch",
  );
  if (branchObjects.length !== selectedObjects.length) {
    return [];
  }
  return branchObjects
    .map((object) => frameById(object.frameIds?.[0] || object.sourceId))
    .filter((frame) => frame?.variant?.sourceFrameId);
}

function selectedVariantBranchSourceId() {
  const frames = selectedVariantBranchFrames();
  if (!frames.length) {
    return "";
  }
  const sourceFrameId = frames[0]?.variant?.sourceFrameId || "";
  return frames.every((frame) => frame.variant?.sourceFrameId === sourceFrameId)
    ? sourceFrameId
    : "";
}

function variantBranchFramesForSource(sourceFrameId) {
  return state.frames
    .filter((frame) => frame.variant?.sourceFrameId === sourceFrameId)
    .sort(compareVariantBranchFrames);
}

function compareVariantBranchFrames(a, b) {
  const orderA = Number.isFinite(Number(a?.variant?.index))
    ? Number(a.variant.index)
    : Number.MAX_SAFE_INTEGER;
  const orderB = Number.isFinite(Number(b?.variant?.index))
    ? Number(b.variant.index)
    : Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  return state.frames.indexOf(a) - state.frames.indexOf(b);
}

function variantBranchFrameMapPosition(frame) {
  const object = spatialObjectById(`variant-object-${frame?.id || ""}`);
  if (object) {
    return {
      x: object.x + (object.width || SPATIAL_OBJECT_WIDTH) / 2,
      y: object.y + (object.height || SPATIAL_OBJECT_HEIGHT) / 2,
    };
  }
  return {
    x: frame?.flowPosition?.x || 0,
    y: frame?.flowPosition?.y || 0,
  };
}

function compareVariantBranchFramesByMapPosition(a, b) {
  const pointA = variantBranchFrameMapPosition(a);
  const pointB = variantBranchFrameMapPosition(b);
  const rowTolerance = Math.max(80, SPATIAL_OBJECT_HEIGHT * 0.55);
  if (Math.abs(pointA.y - pointB.y) > rowTolerance) {
    return pointA.y - pointB.y;
  }
  if (pointA.x !== pointB.x) {
    return pointA.x - pointB.x;
  }
  return compareVariantBranchFrames(a, b);
}

function canReorderSelectedVariantBranches(direction) {
  if (hasLockedSpatialObjects()) {
    return false;
  }
  const sourceFrameId = selectedVariantBranchSourceId();
  if (!sourceFrameId) {
    return false;
  }
  const selectedFrameIds = new Set(
    selectedVariantBranchFrames().map((frame) => frame.id),
  );
  return canMoveSelectedLaneObjects(
    variantBranchFramesForSource(sourceFrameId),
    selectedFrameIds,
    direction,
  );
}

function reorderSelectedSpatialSequence(direction) {
  if (selectedVariantBranchFrames().length) {
    return reorderSelectedVariantBranches(direction);
  }
  return reorderSelectedSpatialLane(direction);
}

function reorderSelectedVariantBranches(direction) {
  const sourceFrameId = selectedVariantBranchSourceId();
  if (!sourceFrameId) {
    renderStatus("Select branch cards from the same source frame to reorder branches");
    return false;
  }
  if (hasLockedSpatialObjects()) {
    renderLockedSpatialObjectStatus("reorder their branch sequence");
    return false;
  }
  const selectedFrameIds = new Set(
    selectedVariantBranchFrames().map((frame) => frame.id),
  );
  const branchFrames = variantBranchFramesForSource(sourceFrameId);
  const reordered = moveSelectedLaneObjects(
    branchFrames,
    selectedFrameIds,
    direction,
  );
  if (!reordered.changed) {
    renderStatus(
      `Selected branches are already at the ${direction === "earlier" ? "start" : "end"} of this branch sequence`,
    );
    return false;
  }
  reordered.objects.forEach((frame, index) => {
    frame.variant = {
      ...frame.variant,
      index: index + 1,
      reorderedAt: new Date().toISOString(),
    };
  });
  syncVariantSpatialObjectState(sourceFrameId);
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  renderStatus(
    `Moved ${selectedFrameIds.size} branch${selectedFrameIds.size === 1 ? "" : "es"} ${direction}`,
  );
  return true;
}

function variantBranchSourceIdForObjectIds(objectIds = []) {
  const sourceIds = objectIds
    .map((id) => spatialObjectById(id))
    .filter(
      (object) => normalizeSpatialSourceKind(object?.sourceKind) === "variant-branch",
    )
    .map((object) => {
      const frame = frameById(object.frameIds?.[0] || object.sourceId);
      return frame?.variant?.sourceFrameId || object.meta?.sourceFrameId || "";
    })
    .filter(Boolean);
  if (!sourceIds.length || sourceIds.length !== objectIds.length) {
    return "";
  }
  const first = sourceIds[0];
  return sourceIds.every((id) => id === first) ? first : "";
}

function reorderVariantBranchesByMapPosition(sourceFrameId) {
  if (!sourceFrameId) {
    return false;
  }
  const before = variantBranchFramesForSource(sourceFrameId).map((frame) => frame.id);
  const ordered = [...variantBranchFramesForSource(sourceFrameId)].sort(
    compareVariantBranchFramesByMapPosition,
  );
  const after = ordered.map((frame) => frame.id);
  if (
    before.length !== after.length ||
    before.every((frameId, index) => frameId === after[index])
  ) {
    return false;
  }
  const reorderedAt = new Date().toISOString();
  ordered.forEach((frame, index) => {
    frame.variant = {
      ...frame.variant,
      index: index + 1,
      reorderedAt,
    };
  });
  syncVariantSpatialObjectState(sourceFrameId);
  return true;
}

function isSpatialObjectVisibleInCurrentMap(object) {
  if (!object) {
    return false;
  }
  if (!isSpatialObjectVisibleForSearch(object)) {
    return false;
  }
  if (isSpatialObjectPinned(object)) {
    return true;
  }
  if (state.outputLaneCollapsed && isManifestSpatialObject(object)) {
    return false;
  }
  if (state.historyLaneCollapsed && isCheckpointSpatialObject(object)) {
    return false;
  }
  return isSpatialObjectVisibleForFilter(object, state.mapObjectFilter);
}

function isSpatialObjectVisibleForSearch(object) {
  const query = normalizeMapSearchQuery(state.mapObjectSearch).toLowerCase();
  if (!query) {
    return true;
  }
  return spatialObjectSearchText(object).includes(query);
}

function spatialObjectSearchText(object) {
  const meta = object?.meta || {};
  const values = [
    object?.id,
    object?.type,
    object?.title,
    object?.subtitle,
    object?.status,
    object?.sourceKind,
    spatialObjectSourceLabel(object),
    spatialObjectFrameLabel(object),
    spatialObjectFooterStatus(object),
    meta.prompt,
    meta.description,
    meta.summary,
    meta.sourceLabel,
    meta.path,
    meta.previewPath,
    meta.url,
    meta.placement,
    meta.sourceFrameTitle,
  ];
  return values.map(cleanString).filter(Boolean).join(" ").toLowerCase();
}

function isSpatialObjectPinned(object) {
  return Boolean(object?.meta?.pinned);
}

function isSpatialObjectLocked(object) {
  return Boolean(object?.meta?.locked);
}

function hasLockedSpatialObjects(objects = selectedSpatialObjects()) {
  return objects.some(isSpatialObjectLocked);
}

function canMutateSpatialObjects(objects = selectedSpatialObjects()) {
  return Boolean(objects.length) && !hasLockedSpatialObjects(objects);
}

function renderLockedSpatialObjectStatus(action = "change") {
  renderStatus(`Unlock selected Map object${currentSelectedSpatialObjectIds().length === 1 ? "" : "s"} to ${action}`);
}

function isSpatialObjectVisibleForFilter(object, filter = state.mapObjectFilter) {
  const activeFilter = normalizeMapObjectFilter(filter);
  if (activeFilter === "all" || object.type === "map-group") {
    return true;
  }
  if (activeFilter === "outputs") {
    return (
      isManifestSpatialObject(object) ||
      normalizeSpatialSourceKind(object.sourceKind) === "variant-branch"
    );
  }
  if (activeFilter === "assets") {
    return (
      object.sourceKind === "asset-candidate" ||
      object.sourceKind === "reference-file" ||
      ["image-region", "image-frame", "reference-image", "reference-file"].includes(
        object.type,
      )
    );
  }
  if (activeFilter === "notes") {
    return (
      object.sourceKind === "manual-note" ||
      ["map-note", "note"].includes(object.type)
    );
  }
  if (activeFilter === "history") {
    return isCheckpointSpatialObject(object);
  }
  return true;
}

function setSelectedSpatialObjects(ids, primaryId = null) {
  const validIds = normalizeStringArray(ids).filter((id) =>
    Boolean(spatialObjectById(id)),
  );
  const validPrimary =
    primaryId && validIds.includes(primaryId)
      ? primaryId
      : validIds.at(-1) || null;
  state.selectedSpatialObjectIds = normalizeStringArray([
    ...validIds.filter((id) => id !== validPrimary),
    validPrimary,
  ]).filter(Boolean);
  state.selectedSpatialObjectId = validPrimary;
}

function selectSpatialObject(objectId, options = {}) {
  const { render = true, announce = false, additive = false } = options;
  const object = spatialObjectById(objectId);
  if (!object) {
    return null;
  }
  if (additive) {
    const currentIds = currentSelectedSpatialObjectIds();
    if (currentIds.includes(object.id)) {
      setSelectedSpatialObjects(
        currentIds.filter((id) => id !== object.id),
        currentIds.filter((id) => id !== object.id).at(-1) || null,
      );
    } else {
      setSelectedSpatialObjects([...currentIds, object.id], object.id);
    }
  } else {
    setSelectedSpatialObjects([object.id], object.id);
  }
  state.selectedConnectionId = null;
  state.pendingConnectionFromFrameId = null;
  if (render) {
    renderFlowInspector();
    renderFlowBoard();
    renderSpec();
  }
  if (announce) {
    renderStatus(`Selected ${object.title} on the spatial map`);
  }
  return object;
}

function clearSpatialObjectSelection(options = {}) {
  const { render = false } = options;
  if (!currentSelectedSpatialObjectIds().length) {
    return;
  }
  setSelectedSpatialObjects([]);
  if (render) {
    renderFlowBoard();
    renderSpec();
  }
}

function moveSpatialObjectByDelta(object, deltaX, deltaY) {
  if (!object || isSpatialObjectLocked(object)) {
    return null;
  }
  const memberOrigins =
    object.type === "map-group"
      ? buildSpatialGroupDragMemberOrigins(object)
      : null;
  const originX = object.x;
  const originY = object.y;
  object.x = Math.max(32, object.x + deltaX);
  object.y = Math.max(32, object.y + deltaY);
  if (object.type === "map-group") {
    moveSpatialGroupMembers(
      memberOrigins,
      object.x - originX,
      object.y - originY,
    );
  }
  return object;
}

function selectedSpatialObjectsForTransform() {
  const objects = selectedSpatialObjects();
  const selectedGroups = objects.filter((object) => object.type === "map-group");
  return objects.filter(
    (object) =>
      !selectedGroups.some(
        (group) =>
          group.id !== object.id &&
          spatialGroupDragMemberObjectIds(group).has(object.id),
      ),
  );
}

function spatialGroupDragMemberObjectIds(group) {
  return new Set(
    (buildSpatialGroupDragMemberOrigins(group).objects || []).map(
      (origin) => origin.id,
    ),
  );
}

function nudgeSelectedSpatialObject(deltaX, deltaY) {
  const objects = selectedSpatialObjectsForTransform();
  if (!objects.length) {
    return false;
  }
  if (hasLockedSpatialObjects(objects)) {
    renderLockedSpatialObjectStatus("move them");
    return false;
  }
  objects.forEach((object) => moveSpatialObjectByDelta(object, deltaX, deltaY));
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  renderStatus(
    objects.length === 1
      ? `Moved ${objects[0].title}`
      : `Moved ${objects.length} Map objects`,
  );
  return true;
}

function sendSelectedSpatialObjectsBack() {
  return reorderSelectedSpatialObjects("back");
}

function bringSelectedSpatialObjectsFront() {
  return reorderSelectedSpatialObjects("front");
}

function reorderSelectedSpatialObjects(direction) {
  if (hasLockedSpatialObjects()) {
    renderLockedSpatialObjectStatus("reorder them");
    return false;
  }
  const selectedIds = currentSelectedSpatialObjectIds();
  const selectedSet = new Set(selectedIds);
  if (!selectedSet.size) {
    return false;
  }
  let nextObjects = [...state.spatialObjects];
  let changed = false;
  [true, false].forEach((groupLayer) => {
    const result = reorderSpatialLayerSubset(
      nextObjects,
      selectedSet,
      (object) =>
        groupLayer ? object.type === "map-group" : object.type !== "map-group",
      direction,
    );
    nextObjects = result.objects;
    changed = changed || result.changed;
  });
  if (!changed) {
    renderStatus("Selected Map objects are already at that layer edge");
    return false;
  }
  const primaryId = state.selectedSpatialObjectId;
  state.spatialObjects = nextObjects;
  setSelectedSpatialObjects(
    selectedIds.filter((id) => spatialObjectById(id)),
    primaryId,
  );
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  renderStatus(
    direction === "front"
      ? `Brought ${selectedIds.length} Map object${selectedIds.length === 1 ? "" : "s"} to front`
      : `Sent ${selectedIds.length} Map object${selectedIds.length === 1 ? "" : "s"} to back`,
  );
  return true;
}

function reorderSpatialLayerSubset(objects, selectedSet, predicate, direction) {
  const layerObjects = objects.filter(predicate);
  const selectedLayerObjects = layerObjects.filter((object) =>
    selectedSet.has(object.id),
  );
  if (
    !selectedLayerObjects.length ||
    selectedLayerObjects.length === layerObjects.length
  ) {
    return { objects, changed: false };
  }
  const remainingLayerObjects = layerObjects.filter(
    (object) => !selectedSet.has(object.id),
  );
  const reorderedLayerObjects =
    direction === "front"
      ? [...remainingLayerObjects, ...selectedLayerObjects]
      : [...selectedLayerObjects, ...remainingLayerObjects];
  const changed = layerObjects.some(
    (object, index) => object.id !== reorderedLayerObjects[index]?.id,
  );
  if (!changed) {
    return { objects, changed: false };
  }
  let layerIndex = 0;
  return {
    changed: true,
    objects: objects.map((object) =>
      predicate(object) ? reorderedLayerObjects[layerIndex++] : object,
    ),
  };
}

function reorderSelectedSpatialLane(direction) {
  const descriptor = selectedSpatialLaneDescriptor();
  const selectedSet = new Set(currentSelectedSpatialObjectIds());
  if (!descriptor || !selectedSet.size) {
    renderStatus("Select output or history cards to reorder a lane");
    return false;
  }
  if (hasLockedSpatialObjects()) {
    renderLockedSpatialObjectStatus("reorder their lane");
    return false;
  }
  const laneObjects = spatialLaneObjects(descriptor);
  const reordered = moveSelectedLaneObjects(laneObjects, selectedSet, direction);
  if (!reordered.changed) {
    renderStatus(
      `Selected cards are already at the ${direction === "earlier" ? "start" : "end"} of the ${descriptor.label}`,
    );
    return false;
  }
  reordered.objects.forEach((object, index) => {
    Object.assign(object, descriptor.positionForIndex(index));
    object.meta = {
      ...(object.meta || {}),
      laneId: descriptor.id,
      laneIndex: index,
      manualLaneOrder: true,
      autoLanePosition: true,
    };
  });
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  renderStatus(
    `Moved ${selectedSet.size} card${selectedSet.size === 1 ? "" : "s"} ${direction} in ${descriptor.label}`,
  );
  return true;
}

function moveSelectedLaneObjects(objects, selectedSet, direction) {
  const nextObjects = [...objects];
  let changed = false;
  if (direction === "earlier") {
    for (let index = 1; index < nextObjects.length; index += 1) {
      if (
        selectedSet.has(nextObjects[index]?.id) &&
        !selectedSet.has(nextObjects[index - 1]?.id)
      ) {
        [nextObjects[index - 1], nextObjects[index]] = [
          nextObjects[index],
          nextObjects[index - 1],
        ];
        changed = true;
      }
    }
  } else {
    for (let index = nextObjects.length - 2; index >= 0; index -= 1) {
      if (
        selectedSet.has(nextObjects[index]?.id) &&
        !selectedSet.has(nextObjects[index + 1]?.id)
      ) {
        [nextObjects[index], nextObjects[index + 1]] = [
          nextObjects[index + 1],
          nextObjects[index],
        ];
        changed = true;
      }
    }
  }
  return { objects: nextObjects, changed };
}

function spatialObjectsIntersectingBounds(bounds) {
  if (!bounds) {
    return [];
  }
  return state.spatialObjects.filter((object) =>
    boundsIntersect(spatialObjectBounds(object), bounds),
  );
}

function spatialObjectBounds(object) {
  const rect = spatialObjectRect(object);
  return makeBounds(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
}

function selectedSpatialTransformObjects() {
  return selectedSpatialObjectsForTransform();
}

function selectedSpatialTransformBounds() {
  if (hasLockedSpatialObjects(selectedSpatialTransformObjects())) {
    return null;
  }
  const bounds = selectedSpatialTransformObjects().map(spatialObjectBounds);
  return bounds.length > 1 ? unionBounds(bounds) : null;
}

function applySpatialLassoSelection(bounds, options = {}) {
  const { additive = false, baseIds = [] } = options;
  const selectedByLasso = spatialObjectsIntersectingBounds(bounds);
  const selectedIds = selectedByLasso.map((object) => object.id);
  const nextIds = additive
    ? normalizeStringArray([...baseIds, ...selectedIds])
    : selectedIds;
  setSelectedSpatialObjects(nextIds, selectedIds.at(-1) || nextIds.at(-1));
  state.selectedConnectionId = null;
  state.pendingConnectionFromFrameId = null;
  return selectedByLasso;
}

function resizeSpatialSelectionFromDrag(drag, deltaX, deltaY) {
  if (!drag?.originBounds || !Array.isArray(drag.objectOrigins)) {
    return null;
  }
  if (
    drag.objectOrigins.some((origin) =>
      isSpatialObjectLocked(spatialObjectById(origin.id)),
    )
  ) {
    return null;
  }
  const nextBounds = resizedBoundsFromHandle(
    drag.originBounds,
    drag.handle,
    deltaX,
    deltaY,
  );
  applySpatialSelectionResize(drag.originBounds, nextBounds, drag.objectOrigins);
  return nextBounds;
}

function resizedBoundsFromHandle(originBounds, handle, deltaX, deltaY) {
  const corner = typeof handle === "string" ? handle : "se";
  const minWidth = Math.max(SPATIAL_OBJECT_MIN_WIDTH, 120);
  const minHeight = Math.max(SPATIAL_OBJECT_MIN_HEIGHT, 90);
  let left = originBounds.left;
  let top = originBounds.top;
  let right = originBounds.right;
  let bottom = originBounds.bottom;

  if (corner.includes("e")) {
    right = Math.max(left + minWidth, originBounds.right + deltaX);
  }
  if (corner.includes("s")) {
    bottom = Math.max(top + minHeight, originBounds.bottom + deltaY);
  }
  if (corner.includes("w")) {
    left = Math.min(right - minWidth, originBounds.left + deltaX);
  }
  if (corner.includes("n")) {
    top = Math.min(bottom - minHeight, originBounds.top + deltaY);
  }

  return makeBounds(Math.max(32, left), Math.max(32, top), right, bottom);
}

function applySpatialSelectionResize(originBounds, nextBounds, objectOrigins) {
  const scaleX = originBounds.width
    ? nextBounds.width / originBounds.width
    : 1;
  const scaleY = originBounds.height
    ? nextBounds.height / originBounds.height
    : 1;
  objectOrigins.forEach((origin) => {
    const object = spatialObjectById(origin.id);
    if (!object || isSpatialObjectLocked(object)) {
      return;
    }
    object.x = Math.max(
      32,
      nextBounds.left + (origin.x - originBounds.left) * scaleX,
    );
    object.y = Math.max(
      32,
      nextBounds.top + (origin.y - originBounds.top) * scaleY,
    );
    object.width = Math.max(
      SPATIAL_OBJECT_MIN_WIDTH,
      origin.width * scaleX,
    );
    object.height = Math.max(
      SPATIAL_OBJECT_MIN_HEIGHT,
      origin.height * scaleY,
    );
    if (object.type === "map-group" && origin.memberOrigins) {
      resizeSpatialGroupMembers(origin.memberOrigins, origin, object);
    }
  });
}

function duplicateSelectedSpatialObject() {
  const objects = selectedSpatialObjectsForTransform();
  if (hasLockedSpatialObjects(objects)) {
    renderLockedSpatialObjectStatus("duplicate them");
    return null;
  }
  if (objects.length > 1) {
    return duplicateSpatialObjectSet(objects);
  }
  const object = objects[0] || selectedSpatialObject();
  if (!object) {
    return null;
  }
  if (isSpatialObjectLocked(object)) {
    renderLockedSpatialObjectStatus("duplicate it");
    return null;
  }
  if (object.type === "map-group") {
    return duplicateSpatialGroupObject(object);
  }
  const duplicate = cloneSpatialObjectForDuplicate(object);
  if (!duplicate) {
    return null;
  }
  state.spatialObjects = normalizeSpatialObjects([
    ...state.spatialObjects,
    duplicate,
  ]);
  setSelectedSpatialObjects([duplicate.id], duplicate.id);
  state.selectedConnectionId = null;
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  renderStatus(`Duplicated ${object.title}`);
  return duplicate;
}

function duplicateSpatialObjectSet(objects) {
  const copiedSourceIds = new Set();
  const duplicates = [];
  objects.forEach((object) => {
    if (!object || isSpatialObjectLocked(object) || copiedSourceIds.has(object.id)) {
      return;
    }
    const duplicate = cloneSpatialObjectForDuplicate(object);
    if (duplicate) {
      duplicates.push(duplicate);
      copiedSourceIds.add(object.id);
    }
    if (object.type === "map-group" && duplicate) {
      spatialObjectsInsideGroup(object).forEach((child) => {
        if (isSpatialObjectLocked(child) || copiedSourceIds.has(child.id)) {
          return;
        }
        const childDuplicate = cloneSpatialObjectForDuplicate(child, {
          meta: {
            copiedWithinGroupId: object.id,
            copiedToGroupId: duplicate.id,
          },
        });
        if (childDuplicate) {
          duplicates.push(childDuplicate);
          copiedSourceIds.add(child.id);
        }
      });
    }
  });
  if (!duplicates.length) {
    return null;
  }
  state.spatialObjects = normalizeSpatialObjects([
    ...state.spatialObjects,
    ...duplicates,
  ]);
  setSelectedSpatialObjects(
    duplicates.map((object) => object.id),
    duplicates.at(-1)?.id || null,
  );
  state.selectedConnectionId = null;
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  renderStatus(`Duplicated ${duplicates.length} Map objects`);
  return duplicates.at(-1) || null;
}

function duplicateSpatialGroupObject(group) {
  if (isSpatialObjectLocked(group)) {
    renderLockedSpatialObjectStatus("duplicate it");
    return null;
  }
  const groupDuplicate = cloneSpatialObjectForDuplicate(group);
  if (!groupDuplicate) {
    return null;
  }
  const containedObjects = spatialObjectsInsideGroup(group).filter(
    (object) => !isSpatialObjectLocked(object),
  );
  const containedDuplicates = containedObjects
    .map((object) =>
      cloneSpatialObjectForDuplicate(object, {
        meta: { copiedWithinGroupId: group.id, copiedToGroupId: groupDuplicate.id },
      }),
    )
    .filter(Boolean);
  state.spatialObjects = normalizeSpatialObjects([
    ...state.spatialObjects,
    groupDuplicate,
    ...containedDuplicates,
  ]);
  setSelectedSpatialObjects(
    [groupDuplicate, ...containedDuplicates].map((object) => object.id),
    groupDuplicate.id,
  );
  state.selectedConnectionId = null;
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  renderStatus(
    `Duplicated ${group.title} with ${containedDuplicates.length} contained Map object${containedDuplicates.length === 1 ? "" : "s"}`,
  );
  return groupDuplicate;
}

function spatialObjectsInsideGroup(group) {
  if (!group || group.type !== "map-group") {
    return [];
  }
  const groupRect = spatialObjectRect(group);
  return state.spatialObjects.filter(
    (object) =>
      object.id !== group.id &&
      rectContainsRectCenter(groupRect, spatialObjectRect(object)),
  );
}

function spatialGroupMemberDetails(group) {
  if (!group || group.type !== "map-group") {
    return { frames: [], objects: [], groups: [] };
  }
  const groupRect = spatialObjectRect(group);
  const frames = state.frames.filter((frame) =>
    rectContainsRectCenter(groupRect, flowCardRect(frame)),
  );
  const objects = state.spatialObjects.filter(
    (object) =>
      object.id !== group.id &&
      rectContainsRectCenter(groupRect, spatialObjectRect(object)),
  );
  return {
    frames,
    objects: objects.filter((object) => object.type !== "map-group"),
    groups: objects.filter((object) => object.type === "map-group"),
  };
}

function spatialGroupMemberSummary(group, options = {}) {
  const { limit = 5 } = options;
  const members = spatialGroupMemberDetails(group);
  const names = [
    ...members.frames.map((frame) => frame.title),
    ...members.groups.map((object) => object.title),
    ...members.objects.map((object) => object.title),
  ].filter(Boolean);
  const countText = [
    members.frames.length
      ? `${members.frames.length} frame${members.frames.length === 1 ? "" : "s"}`
      : "",
    members.groups.length
      ? `${members.groups.length} group${members.groups.length === 1 ? "" : "s"}`
      : "",
    members.objects.length
      ? `${members.objects.length} object${members.objects.length === 1 ? "" : "s"}`
      : "",
  ]
    .filter(Boolean)
    .join(", ");
  const preview = names.slice(0, limit).join(", ");
  const suffix = names.length > limit ? `, +${names.length - limit} more` : "";
  return [countText || "empty group", preview ? `contains ${preview}${suffix}` : ""]
    .filter(Boolean)
    .join(" • ");
}

function cloneSpatialObjectForDuplicate(object, options = {}) {
  const { offsetX = 36, offsetY = 36, meta: extraMeta = {} } = options;
  return normalizeSpatialObjects([
    {
      ...structuredClone(object),
      id: uid("spatial"),
      title: `${object.title || "Spatial object"} copy`,
      sourceId: "",
      sourceKind: `${object.sourceKind || object.type || "manual"}-copy`,
      x: object.x + offsetX,
      y: object.y + offsetY,
      meta: {
        ...cloneSpatialObjectMetaForManualCopy(object),
        ...extraMeta,
      },
    },
  ])[0];
}

function cloneSpatialObjectMetaForManualCopy(object) {
  const meta = structuredClone(object?.meta || {});
  meta.copiedFrom = object?.id || "";
  meta.originalSourceKind = object?.sourceKind || object?.type || "";
  if (isManifestSpatialObject(object)) {
    delete meta.path;
    delete meta.url;
    delete meta.previewPath;
  }
  delete meta.pinned;
  delete meta.locked;
  return meta;
}

async function copySelectedSpatialObjectContext() {
  const objects = selectedSpatialObjects();
  const object = selectedSpatialObject();
  const text = buildSpatialSelectionContextText(objects);
  if (!objects.length || !text) {
    renderStatus("No selected Map object context to copy");
    return false;
  }
  const copied = await writeTextToClipboard(text);
  renderStatus(
    copied
      ? `Copied ${objects.length === 1 ? object.title : `${objects.length} Map objects`} context`
      : `Could not copy selected Map context`,
  );
  return copied;
}

function buildSpatialSelectionContextText(objects = selectedSpatialObjects()) {
  const selectedObjects = Array.isArray(objects) ? objects.filter(Boolean) : [];
  if (!selectedObjects.length) {
    return "";
  }
  if (selectedObjects.length === 1) {
    return buildSpatialObjectContextText(selectedObjects[0]);
  }
  return [
    `# Canvax Map Selection: ${selectedObjects.length} objects`,
    "",
    ...selectedObjects.map((object, index) => {
      const context = buildSpatialObjectContextText(object);
      return `## ${index + 1}. ${object.title || "Spatial object"}\n\n${context}`;
    }),
  ].join("\n\n");
}

function buildSpatialObjectContextText(object) {
  if (!object) {
    return "";
  }
  const frameLabel =
    object.frameIds?.length === 1
      ? frameTitleById(object.frameIds[0])
      : object.frameIds?.length
        ? object.frameIds.map(frameTitleById).join(", ")
        : "Board object";
  const manualSubtitle = object.meta?.manualFields?.subtitle
    ? cleanString(object.subtitle)
    : "";
  const noteText = cleanString(object.subtitle);
  const objectPrompt = cleanString(object.meta?.prompt);
  const promptText =
    objectPrompt ||
    manualSubtitle ||
    cleanString(object.meta?.text) ||
    cleanString(object.meta?.summary) ||
    cleanString(object.meta?.description) ||
    noteText ||
    cleanString(object.title);
  const details = [
    `# Canvax Map Object: ${object.title || "Spatial object"}`,
    "",
    `- Type: ${object.type || "object"}`,
    `- Source: ${object.sourceKind || "manual"}`,
    `- Status: ${spatialObjectFooterStatus(object)}`,
    `- Pinned: ${isSpatialObjectPinned(object) ? "yes" : "no"}`,
    `- Locked: ${isSpatialObjectLocked(object) ? "yes" : "no"}`,
    `- Frame: ${frameLabel}`,
    `- Layer: ${spatialObjectLayerLabel(object) || "unlayered"}`,
    `- Lane order: ${spatialLaneOrderLabel(object) || "not in a lane"}`,
    `- Branch order: ${spatialBranchOrderLabel(object) || "not a branch"}`,
    `- Position: ${Math.round(object.x)}, ${Math.round(object.y)}`,
    `- Size: ${Math.round(object.width || SPATIAL_OBJECT_WIDTH)} x ${Math.round(object.height || SPATIAL_OBJECT_HEIGHT)}`,
  ];
  if (object.type === "map-group") {
    const members = spatialGroupMemberDetails(object);
    details.push(
      `- Contains: ${spatialGroupMemberSummary(object, { limit: 8 })}`,
    );
    const memberLines = [
      ...members.frames.map((frame) => `- Frame: ${frame.title}`),
      ...members.groups.map((entry) => `- Group: ${entry.title}`),
      ...members.objects.map((entry) => `- Object: ${entry.title}`),
    ];
    if (memberLines.length) {
      details.push("", "## Group contents", ...memberLines);
    }
  }
  if (object.meta?.path || object.meta?.previewPath || object.meta?.url) {
    details.push(
      `- Target: ${object.meta.path || object.meta.previewPath || object.meta.url}`,
    );
  }
  if (noteText && noteText !== promptText) {
    details.push("", "## Note", noteText);
  }
  const inspectorOverrides = object.meta?.inspectorOverrides || {};
  const primaryOverride = cleanString(inspectorOverrides.primary);
  const secondaryOverride = cleanString(inspectorOverrides.secondary);
  if (primaryOverride || secondaryOverride) {
    details.push("", "## Inspector Overrides");
    if (primaryOverride) {
      details.push(`- Primary detail: ${primaryOverride}`);
    }
    if (secondaryOverride) {
      details.push(`- Secondary detail: ${secondaryOverride}`);
    }
  }
  const customProperties = normalizeMapCustomProperties(
    object.meta?.customProperties,
  );
  if (customProperties.length) {
    details.push(
      "",
      "## Custom Properties",
      ...customProperties.map(
        (property) => `- ${property.key}: ${property.value}`,
      ),
    );
  }
  if (object.sourceKind === "variant-branch") {
    const variantFrame = frameById(object.frameIds?.[0] || object.sourceId);
    const variantStyle = normalizeVariantStyleProperties(
      object.meta?.variantStyle || variantFrame?.variant?.styleProperties,
    );
    if (hasVariantStyleProperties(variantStyle)) {
      details.push(
        "",
        "## Variant Style",
        ...variantStylePropertyKeys
          .filter((key) => variantStyle[key])
          .map((key) => `- ${key}: ${variantStyle[key]}`),
      );
    }
  }
  if (object.sourceKind === "asset-candidate" && object.meta?.placementMap) {
    const placement = object.meta.placementMap;
    const pixel = placement.pixelBounds || {};
    const css = placement.cssPlacement || {};
    details.push(
      "",
      "## Asset Placement Contract",
      `- Slot: ${placement.slotId || object.sourceId || object.id}`,
      `- Surface: ${placement.surface || "canvas"} ${placement.viewport?.width || "?"} x ${placement.viewport?.height || "?"}`,
      `- Placement: ${placement.placement || object.meta?.placement || object.subtitle || "unspecified"}`,
      `- Normalized bounds: ${JSON.stringify(placement.normalizedBounds || {})}`,
      `- Pixel bounds: ${pixel.left || 0}, ${pixel.top || 0}, ${pixel.width || 0} x ${pixel.height || 0}`,
      `- CSS: left ${css.left || "0%"}, top ${css.top || "0%"}, width ${css.width || "100%"}, height ${css.height || "100%"}`,
      `- Target selector: ${placement.targetSelector || ""}`,
      `- Scaffold: ${placement.htmlScaffold || ""}`,
    );
    const slots = Array.isArray(object.meta.outputSlots)
      ? object.meta.outputSlots
      : [];
    if (slots.length) {
      details.push(
        "",
        "## Output Slots",
        ...slots.map(
          (slot, index) =>
            `- ${index + 1}. ${slot.slotId || slot.id || "slot"}: ${slot.status || "empty"} on ${slot.frameTitle || slot.frameId || frameLabel}`,
        ),
      );
    }
  }
  if (promptText) {
    details.push("", "## Prompt / Context", promptText);
  }
  return details.join("\n").trim();
}

async function writeTextToClipboard(text) {
  if (!text) {
    return false;
  }
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the local DOM fallback below.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

function assetCandidateById(candidateId) {
  const candidates = state.assetCandidatePack?.candidates || [];
  return candidates.find((candidate) => candidate.id === candidateId) || null;
}

function latestImageResultForCandidate(candidateId) {
  const id = cleanString(candidateId);
  if (!id) {
    return null;
  }
  const results = state.imageResultPack?.results || [];
  return (
    results
      .slice()
      .reverse()
      .find((result) => result.candidateId === id && result.imagePath) || null
  );
}

function assetCandidateSlotImageSource(candidate) {
  const slots = Array.isArray(candidate?.outputSlots)
    ? candidate.outputSlots
    : [];
  const slot = slots.find((item) => item?.imagePath) || null;
  const result = latestImageResultForCandidate(candidate?.id);
  const imagePath = cleanString(result?.imagePath || slot?.imagePath);
  if (!imagePath) {
    return null;
  }
  const source = resolveAssetCandidateImageSource(imagePath);
  if (!source) {
    return null;
  }
  return {
    source,
    slot,
    result,
    accepted: Boolean(result?.accepted || slot?.accepted),
  };
}

function assetCandidateElements(candidateId) {
  return state.frames.flatMap((frame) =>
    frame.elements
      .filter(
        (element) =>
          element.type === "image" && element.assetCandidateId === candidateId,
      )
      .map((element) => ({ frame, element })),
  );
}

function latestAssetCandidateElement(candidateId, { preferImage = false } = {}) {
  const entries = assetCandidateElements(candidateId);
  if (!entries.length) {
    return null;
  }
  if (preferImage) {
    const imageEntry = entries
      .slice()
      .reverse()
      .find((entry) => Boolean(entry.element.imageDataUrl || entry.element.src));
    if (imageEntry) {
      return imageEntry;
    }
  }
  return entries.at(-1) || null;
}

function assetCandidateReviewState(candidate) {
  const slots = Array.isArray(candidate?.outputSlots)
    ? candidate.outputSlots
    : [];
  const accepted = slots.some((slot) => slot?.accepted);
  const attached = latestAssetCandidateElement(candidate?.id, {
    preferImage: true,
  });
  const imported = assetCandidateSlotImageSource(candidate);
  const previewSrc =
    attached?.element?.imageDataUrl ||
    attached?.element?.src ||
    imported?.source?.src ||
    "";
  if (accepted || imported?.accepted) {
    return { label: "Accepted", tone: "accepted", attached, imported, previewSrc };
  }
  if (attached?.element?.imageDataUrl || attached?.element?.src) {
    return { label: "Attached", tone: "attached", attached, imported, previewSrc };
  }
  if (imported?.source?.src) {
    return { label: "Returned", tone: "attached", attached, imported, previewSrc };
  }
  if (latestAssetCandidateElement(candidate?.id)) {
    return { label: "Slot placed", tone: "placed", attached, imported, previewSrc };
  }
  return {
    label: candidate?.status === "accepted" ? "Accepted" : "Prompt-ready",
    tone: candidate?.status === "accepted" ? "accepted" : "ready",
    attached: null,
    imported: null,
    previewSrc,
  };
}

function buildAssetCandidateReviewSummary(candidates = []) {
  const items = Array.isArray(candidates) ? candidates : [];
  const slots = items.flatMap((candidate) =>
    Array.isArray(candidate.outputSlots) ? candidate.outputSlots : [],
  );
  const acceptedCandidates = items
    .map(summarizeAcceptedAssetCandidate)
    .filter(Boolean);
  const groups = buildAssetCandidateReviewGroups(items);
  const pendingCandidateIds = items
    .filter((candidate) => assetCandidateEffectiveStatus(candidate) === "prompt-ready")
    .map((candidate) => candidate.id);
  const placedCandidateIds = items
    .filter((candidate) => assetCandidateEffectiveStatus(candidate) === "placed")
    .map((candidate) => candidate.id);
  const attachedCandidateIds = items
    .filter((candidate) => assetCandidateEffectiveStatus(candidate) === "attached")
    .map((candidate) => candidate.id);
  return {
    kind: "canvax-asset-candidate-review",
    total: items.length,
    placementReady: items.filter((candidate) => candidate.placementMap).length,
    slotCount: slots.length,
    emptySlots: slots.filter((slot) => !slot.attached && !slot.accepted).length,
    promptReady: pendingCandidateIds.length,
    placed: placedCandidateIds.length,
    attached: attachedCandidateIds.length,
    accepted: acceptedCandidates.length,
    statusCounts: {
      promptReady: pendingCandidateIds.length,
      placed: placedCandidateIds.length,
      attached: attachedCandidateIds.length,
      accepted: acceptedCandidates.length,
      emptySlots: slots.filter((slot) => !slot.attached && !slot.accepted).length,
    },
    pendingCandidateIds,
    placedCandidateIds,
    attachedCandidateIds,
    acceptedCandidateIds: acceptedCandidates.map((candidate) => candidate.id),
    acceptedCandidates,
    groups,
    hostHandoff: buildAssetCandidateHostHandoff(),
    nextActions: buildAssetCandidateReviewNextActions({
      total: items.length,
      pending: pendingCandidateIds.length,
      placed: placedCandidateIds.length,
      attached: attachedCandidateIds.length,
      accepted: acceptedCandidates.length,
    }),
  };
}

function assetCandidateEffectiveStatus(candidate) {
  const slots = Array.isArray(candidate?.outputSlots)
    ? candidate.outputSlots
    : [];
  if (slots.some((slot) => slot?.accepted)) {
    return "accepted";
  }
  if (slots.some((slot) => slot?.attached || slot?.imagePath)) {
    return "attached";
  }
  if (slots.some((slot) => slot?.imageElementId)) {
    return "placed";
  }
  return candidate?.status || "prompt-ready";
}

function buildAssetCandidateReviewGroups(candidates = []) {
  const groupsByFrame = new Map();
  candidates.forEach((candidate) => {
    const frameId = candidate.sourceFrameId || "board";
    if (!groupsByFrame.has(frameId)) {
      groupsByFrame.set(frameId, {
        frameId,
        frameTitle: candidate.sourceFrameTitle || frameTitleById(frameId) || "Board",
        total: 0,
        promptReady: 0,
        placed: 0,
        attached: 0,
        accepted: 0,
        candidateIds: [],
        acceptedCandidateIds: [],
        candidates: [],
      });
    }
    const group = groupsByFrame.get(frameId);
    const status = assetCandidateEffectiveStatus(candidate);
    const bucket = assetCandidateReviewBucket(status);
    group.total += 1;
    group[bucket] = Number(group[bucket] || 0) + 1;
    group.candidateIds.push(candidate.id);
    if (status === "accepted") {
      group.acceptedCandidateIds.push(candidate.id);
    }
    group.candidates.push(summarizeAssetCandidateReviewItem(candidate, status));
  });
  return [...groupsByFrame.values()];
}

function summarizeAssetCandidateReviewItem(candidate, status) {
  const placement = candidate.placementMap || {};
  const pixelBounds = placement.pixelBounds || {};
  const slot = Array.isArray(candidate.outputSlots)
    ? candidate.outputSlots[0] || null
    : null;
  return {
    id: candidate.id,
    title: candidate.title || "Asset candidate",
    type: candidate.type || "region",
    status,
    sourceFrameId: candidate.sourceFrameId || "",
    sourceFrameTitle: candidate.sourceFrameTitle || "",
    sourceElementId: candidate.sourceElementId || "",
    placement: candidate.placement || placement.placement || "whole frame",
    prompt: candidate.prompt || "",
    slotId: slot?.slotId || placement.slotId || "",
    targetSelector: slot?.targetSelector || placement.targetSelector || "",
    pixelBounds: slot?.pixelBounds || pixelBounds || null,
    cssPlacement: slot?.cssPlacement || placement.cssPlacement || null,
    imageElementId: slot?.imageElementId || "",
    imagePath: slot?.imagePath || "",
    accepted: Boolean(slot?.accepted),
  };
}

function assetCandidateReviewBucket(status) {
  switch (status) {
    case "accepted":
      return "accepted";
    case "attached":
      return "attached";
    case "placed":
      return "placed";
    default:
      return "promptReady";
  }
}

function buildAssetCandidateHostHandoff() {
  return {
    requiresOpenAiApiKey: false,
    lane: "host-image-generation",
    copyReadyFiles: [
      "exports/canvax-image-host-task-latest.md",
      "exports/canvax-image-host-task-latest.json",
      "exports/canvax-image-generation-brief-latest.md",
      "exports/canvax-image-generation-brief-latest.json",
      "exports/canvax-asset-candidates-latest.json",
    ],
    workflow: [
      "Copy a host task or candidate block into the current Codex/ChatGPT image host.",
      "Generate or edit the image in that host without Canvax calling an API.",
      "Attach the returned image back to the matching candidate card or workspace path.",
      "Accept the chosen candidate so Codex can read the selected visual and placement contract.",
    ],
  };
}

function buildAssetCandidateReviewNextActions(counts) {
  if (!counts.total) {
    return ["Create an Image pack from a frame with image, avatar, visual, or illustration regions."];
  }
  const actions = [];
  if (counts.pending) {
    actions.push("Generate pending candidates in the host image lane using the copy-ready brief.");
  }
  if (counts.placed || counts.attached) {
    actions.push("Review attached images on the frame, then accept the strongest candidate.");
  }
  if (counts.accepted) {
    actions.push("Use accepted candidates in Materialize, Build with Codex, or image prompt continuation.");
  }
  return actions;
}

function summarizeAcceptedAssetCandidate(candidate) {
  const slots = Array.isArray(candidate?.outputSlots)
    ? candidate.outputSlots
    : [];
  const acceptedSlot = slots.find((slot) => slot?.accepted);
  if (!acceptedSlot && candidate?.status !== "accepted") {
    return null;
  }
  const fallbackSlot = acceptedSlot || slots[0] || {};
  return {
    id: candidate.id,
    title: candidate.title || "Accepted asset candidate",
    sourceFrameId: candidate.sourceFrameId || "",
    sourceFrameTitle: candidate.sourceFrameTitle || "",
    placement: candidate.placement || "",
    bounds: candidate.bounds || null,
    placementMap: candidate.placementMap || null,
    slotId: fallbackSlot.slotId || fallbackSlot.id || "",
    pixelBounds: fallbackSlot.pixelBounds || candidate.placementMap?.pixelBounds || null,
    imageElementId: fallbackSlot.imageElementId || "",
    frameId: fallbackSlot.frameId || candidate.sourceFrameId || "",
    imagePath: fallbackSlot.imagePath || "",
    acceptedAt: fallbackSlot.acceptedAt || "",
    prompt: candidate.prompt || "",
  };
}

function renderAssetCandidateTray() {
  if (!dom.assetCandidateTray) {
    return;
  }
  const candidates = currentAssetCandidates();
  if (!candidates.length) {
    dom.assetCandidateTray.hidden = true;
    dom.assetCandidateTray.innerHTML = "";
    return;
  }

  const activeFrameId = state.activeFrameId;
  const reviewSummary = buildAssetCandidateReviewSummary(candidates);
  dom.assetCandidateTray.hidden = false;
  dom.assetCandidateTray.innerHTML = `
    <div class="asset-candidate-head">
      <div>
        <p class="eyebrow">Asset candidates</p>
        <strong>${candidates.length} slot${candidates.length === 1 ? "" : "s"} · ${reviewSummary.accepted} accepted</strong>
      </div>
      <div class="asset-candidate-review-meter" aria-label="Asset candidate review status">
        <span>${reviewSummary.promptReady || 0} pending</span>
        <span>${reviewSummary.attached || 0} attached</span>
        <span>${reviewSummary.accepted || 0} accepted</span>
        <b>No API key</b>
      </div>
    </div>
    <div class="asset-candidate-grid">
      ${candidates
        .map((candidate) => {
          const sameFrame = candidate.sourceFrameId === activeFrameId;
          const title = candidate.title || "Untitled candidate";
          const placement = candidate.placement || "whole frame";
          const review = assetCandidateReviewState(candidate);
          const previewImage =
            review.previewSrc ||
            review.attached?.element?.imageDataUrl ||
            review.attached?.element?.src ||
            "";
          const typeLabel =
            candidate.type === "frame-composite" ? "frame" : "region";
          const placementMap =
            candidate.placementMap ||
            buildAssetCandidatePlacementMap(candidate, currentFrameById(candidate.sourceFrameId));
          const pixelBounds = placementMap.pixelBounds || {};
          const slotCount = Array.isArray(candidate.outputSlots)
            ? candidate.outputSlots.length
            : 0;
          return `
            <article class="asset-candidate-card ${sameFrame ? "active-frame" : ""} ${review.tone === "accepted" ? "accepted" : ""}">
              <div class="asset-candidate-card-head">
                <span class="asset-kind">${escapeHtml(typeLabel)}</span>
                <span>${sameFrame ? "This frame" : escapeHtml(candidate.sourceFrameTitle || "Other frame")}</span>
              </div>
              <div class="asset-candidate-review-row">
                <span class="asset-candidate-status" data-tone="${escapeHtml(review.tone)}">${escapeHtml(review.label)}</span>
                ${review.attached ? `<button class="ghost-button compact" type="button" data-asset-candidate-select="${escapeHtml(candidate.id)}">Select</button>` : ""}
                ${!review.attached && review.imported ? `<span class="asset-candidate-status" data-tone="attached">Imported result</span>` : ""}
              </div>
              ${
                previewImage
                  ? `<div class="asset-candidate-preview"><img src="${escapeHtml(previewImage)}" alt="" /></div>`
                  : ""
              }
              <strong title="${escapeHtml(title)}">${escapeHtml(compactDisplayText(title, 42))}</strong>
              <p title="${escapeHtml(candidate.prompt || "")}">${escapeHtml(placement)}</p>
              <p class="asset-placement-contract">
                ${escapeHtml(placementMap.surface || "canvas")} · ${Math.round(pixelBounds.width || 0)}×${Math.round(pixelBounds.height || 0)} px · ${slotCount || 1} output slot${(slotCount || 1) === 1 ? "" : "s"}
              </p>
              <div class="asset-candidate-actions">
                <button class="ghost-button compact" type="button" data-asset-candidate-copy="${escapeHtml(candidate.id)}">
                  Copy prompt
                </button>
                <button class="ghost-button compact" type="button" data-asset-candidate-host-task="${escapeHtml(candidate.id)}">
                  Copy host task
                </button>
                <button class="ghost-button compact" type="button" data-asset-candidate-place="${escapeHtml(candidate.id)}">
                  Place slot
                </button>
                ${
                  (review.attached?.element?.imageDataUrl || review.attached?.element?.src) &&
                  review.tone !== "accepted"
                    ? `<button class="ghost-button compact" type="button" data-asset-candidate-accept="${escapeHtml(candidate.id)}">Accept</button>`
                    : ""
                }
                <label class="ghost-link-button compact asset-upload-button">
                  Attach image
                  <input data-asset-candidate-upload="${escapeHtml(candidate.id)}" type="file" accept="image/*" />
                </label>
              </div>
              <form class="asset-candidate-import" data-asset-candidate-import-form="${escapeHtml(candidate.id)}">
                <input
                  data-asset-candidate-path="${escapeHtml(candidate.id)}"
                  type="text"
                  placeholder="artifacts/...png or /workspace/..."
                  aria-label="Workspace image path for ${escapeHtml(title)}"
                />
                <button class="ghost-button compact" type="submit">
                  Attach path
                </button>
              </form>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function buildAssetCandidateClipboardText(candidate) {
  if (!candidate) {
    return "";
  }
  const frame = currentFrameById(candidate.sourceFrameId) || currentFrame();
  const placementMap =
    candidate.placementMap || buildAssetCandidatePlacementMap(candidate, frame);
  const pixelBounds = placementMap.pixelBounds || {};
  const cssPlacement = placementMap.cssPlacement || {};
  const safeZones = Array.isArray(placementMap.safeZones)
    ? placementMap.safeZones
    : [];
  const lines = [
    `# Canvax Asset Candidate: ${candidate.title || candidate.id}`,
    "",
    `- Candidate ID: ${candidate.id}`,
    `- Source frame: ${candidate.sourceFrameTitle || frame?.title || candidate.sourceFrameId || "Unknown frame"}`,
    `- Type: ${candidate.type || "asset"}`,
    `- Placement: ${placementMap.placement || candidate.placement || "whole frame"}`,
    `- Surface: ${placementMap.surface || frame?.viewport || "canvas"}`,
    `- Pixel bounds: ${Math.round(pixelBounds.x || 0)}, ${Math.round(pixelBounds.y || 0)}, ${Math.round(pixelBounds.width || 0)} x ${Math.round(pixelBounds.height || 0)}`,
    `- CSS placement: left ${cssPlacement.left || "0%"}, top ${cssPlacement.top || "0%"}, width ${cssPlacement.width || "100%"}, height ${cssPlacement.height || "100%"}`,
    `- Target selector: ${placementMap.targetSelector || ""}`,
    "",
    "## Prompt",
    "",
    candidate.prompt || "Generate imagery for this Canvax asset slot.",
  ];
  if (candidate.negativePrompt) {
    lines.push("", "## Negative Prompt", "", candidate.negativePrompt);
  }
  if (safeZones.length) {
    lines.push("", "## Safe Zones");
    safeZones.slice(0, 6).forEach((zone) => {
      lines.push(
        `- ${zone.label || zone.kind || "zone"}: ${JSON.stringify(zone.bounds || zone)}`,
      );
    });
  }
  if (placementMap.htmlScaffold) {
    lines.push("", "## HTML Placement Scaffold", "", placementMap.htmlScaffold);
  }
  lines.push(
    "",
    "Use this with the current ChatGPT/Codex image-generation host when available. Canvax itself does not call an image API or require OPENAI_API_KEY.",
  );
  return lines.join("\n").trim();
}

function buildAssetCandidateHostTaskClipboardText(candidate) {
  if (!candidate) {
    return "";
  }
  const frame = currentFrameById(candidate.sourceFrameId) || currentFrame();
  const placementMap =
    candidate.placementMap || buildAssetCandidatePlacementMap(candidate, frame);
  const pixelBounds = placementMap.pixelBounds || {};
  const cssPlacement = placementMap.cssPlacement || {};
  const slot = Array.isArray(candidate.outputSlots)
    ? candidate.outputSlots[0]
    : null;
  const hostPrompt = [
    `Generate image candidate: ${candidate.title || candidate.id}.`,
    candidate.prompt || "Generate imagery for this Canvax asset slot.",
    `Placement: ${placementMap.placement || candidate.placement || "whole frame"}.`,
    `Pixel slot: ${Math.round(pixelBounds.left || pixelBounds.x || 0)}, ${Math.round(pixelBounds.top || pixelBounds.y || 0)}, ${Math.round(pixelBounds.width || 0)}x${Math.round(pixelBounds.height || 0)}.`,
    `CSS slot: left ${cssPlacement.left || "0%"}, top ${cssPlacement.top || "0%"}, width ${cssPlacement.width || "100%"}, height ${cssPlacement.height || "100%"}.`,
    `Target selector: ${placementMap.targetSelector || ""}.`,
    candidate.negativePrompt
      ? `Avoid: ${candidate.negativePrompt}`
      : "Avoid unrelated logos, unreadable text, composition drift, and generic AI-purple styling unless requested.",
  ].filter(Boolean);
  const lines = [
    "# Canvax Image Host Task",
    "",
    "- Requires OpenAI API key: no",
    "- Canvax calls image API: no",
    "- Use: paste this into the current Codex/ChatGPT image-generation host when one is available.",
    `- Source file: exports/canvax-image-host-task-latest.json`,
    "",
    "## Binding",
    "",
    `- Candidate ID: ${candidate.id}`,
    `- Output slot: ${slot?.slotId || placementMap.slotId || `${candidate.id}-slot-1`}`,
    `- Source frame: ${candidate.sourceFrameTitle || frame?.title || candidate.sourceFrameId || "Unknown frame"}`,
    `- Target selector: ${placementMap.targetSelector || ""}`,
    "",
    "## Host Prompt",
    "",
    "```text",
    hostPrompt.join("\n"),
    "```",
    "",
    "## Return Instructions",
    "",
    "- Save, attach, or paste the generated image back into Canvax.",
    `- Bind it to candidate ${candidate.id}.`,
    `- Use output slot ${slot?.slotId || placementMap.slotId || `${candidate.id}-slot-1`}.`,
    "- Preserve the placement contract unless the user sketches a correction.",
    "",
    "## Acceptance Criteria",
    "",
    "- The image matches the prompt and style lock.",
    "- The composition fits the target bounds.",
    "- Text, logos, or symbols are only present when explicitly requested.",
    "- The accepted result can be reused by Materialize, Build with Codex, or a later image pass.",
  ];
  return lines.join("\n").trim();
}

async function copyAssetCandidatePrompt(candidateId) {
  const candidate = assetCandidateById(candidateId);
  const text = buildAssetCandidateClipboardText(candidate);
  const copied = await writeTextToClipboard(text);
  renderStatus(
    copied
      ? "Asset candidate prompt copied with placement contract"
      : "Could not copy asset candidate prompt",
  );
  return copied;
}

async function copyAssetCandidateHostTask(candidateId) {
  const candidate = assetCandidateById(candidateId);
  const text = buildAssetCandidateHostTaskClipboardText(candidate);
  const copied = await writeTextToClipboard(text);
  renderStatus(
    copied
      ? "Image host task copied with return-slot binding"
      : "Could not copy image host task",
  );
  return copied;
}

function candidateBoundsToFrameBounds(candidate, frame = currentFrame()) {
  const viewport = viewportPresets[frame.viewport] || viewportPresets.desktop;
  const bounds = candidate?.bounds;
  if (
    bounds &&
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    Number.isFinite(bounds.w) &&
    Number.isFinite(bounds.h) &&
    bounds.w > 0 &&
    bounds.h > 0
  ) {
    const left = clamp(bounds.x * viewport.width, 0, viewport.width);
    const top = clamp(bounds.y * viewport.height, 0, viewport.height);
    const right = clamp((bounds.x + bounds.w) * viewport.width, 0, viewport.width);
    const bottom = clamp(
      (bounds.y + bounds.h) * viewport.height,
      0,
      viewport.height,
    );
    return {
      left: Math.min(left, right),
      top: Math.min(top, bottom),
      right: Math.max(left, right),
      bottom: Math.max(top, bottom),
    };
  }

  const width = viewport.width * 0.72;
  const height = viewport.height * 0.56;
  return {
    left: (viewport.width - width) / 2,
    top: (viewport.height - height) / 2,
    right: (viewport.width + width) / 2,
    bottom: (viewport.height + height) / 2,
  };
}

function activateCandidateFrame(candidate) {
  const sourceFrameId = candidate?.sourceFrameId;
  if (sourceFrameId && currentFrameById(sourceFrameId)) {
    state.activeFrameId = sourceFrameId;
    state.viewMode = "frame";
  }
  return currentFrame();
}

function addAssetCandidateElement(candidate, options = {}) {
  if (!candidate) {
    return null;
  }
  const frame = activateCandidateFrame(candidate);
  const bounds = candidateBoundsToFrameBounds(candidate, frame);
  const element = {
    id: uid("image"),
    type: "image",
    start: { x: bounds.left, y: bounds.top },
    end: { x: bounds.right, y: bounds.bottom },
    color: state.color,
    size: 2,
    alpha: 1,
    composite: "source-over",
    imageDataUrl: options.imageDataUrl || "",
    src: options.src || "",
    sourceName: options.sourceName || candidate.title || "Asset candidate",
    assetCandidateId: candidate.id,
  };

  pushHistory(frame.id);
  frame.elements.push(element);
  updateAssetCandidateSlot(candidate, element, {
    attached: Boolean(options.imageDataUrl || options.src),
    imagePath: options.imagePath || options.src || "",
    sourceName: options.sourceName || candidate.title || "Asset candidate",
  });
  setSelectedElements([element.id], element.id);
  touchFrame(frame, {
    capture: true,
    status: options.imageDataUrl || options.src
      ? "Asset candidate image attached"
      : "Asset candidate slot placed",
  });
  renderAll();
  return element;
}

function updateAssetCandidateSlot(
  candidate,
  element,
  { attached = false, accepted = false, sourceName = "", imagePath = "" } = {},
) {
  if (!candidate || !element) {
    return;
  }
  const frame = currentFrame() || currentFrameById(candidate.sourceFrameId);
  candidate.placementMap =
    candidate.placementMap || buildAssetCandidatePlacementMap(candidate, frame);
  const previousSlot =
    normalizeAssetCandidateOutputSlots(
      candidate.outputSlots,
      candidate,
      candidate.placementMap,
    )[0] || {};
  candidate.status = accepted ? "accepted" : attached ? "attached" : "placed";
  candidate.outputSlots = [
    {
      ...previousSlot,
      label: previousSlot.label || "Generated image",
      imagePath: imagePath || sourceName || previousSlot.imagePath || "",
      imageElementId: element.id,
      frameId: currentFrame()?.id || candidate.sourceFrameId || "",
      accepted: Boolean(accepted),
      attached: Boolean(attached || previousSlot.attached),
      status: accepted ? "accepted" : attached ? "attached" : "placed",
      attachedAt: attached ? new Date().toISOString() : previousSlot.attachedAt || "",
      acceptedAt: accepted ? new Date().toISOString() : "",
      notes:
        previousSlot.notes ||
        "Generated candidate was placed back onto the Canvax frame.",
    },
  ];
  refreshCurrentAssetCandidatePackReview();
}

function refreshCurrentAssetCandidatePackReview() {
  if (!state.assetCandidatePack?.candidates) {
    return;
  }
  state.assetCandidatePack.reviewSummary = buildAssetCandidateReviewSummary(
    state.assetCandidatePack.candidates,
  );
}

function selectAssetCandidateElement(candidateId) {
  const entry = latestAssetCandidateElement(candidateId, { preferImage: true });
  if (!entry) {
    renderStatus("No placed asset candidate to select");
    return false;
  }
  state.activeFrameId = entry.frame.id;
  state.viewMode = "frame";
  setSelectedElements([entry.element.id], entry.element.id);
  persistState();
  renderAll();
  renderStatus("Asset candidate selected on its frame");
  return true;
}

function acceptAssetCandidate(candidateId, { sync = true } = {}) {
  const candidate = assetCandidateById(candidateId);
  const entry = latestAssetCandidateElement(candidateId, { preferImage: true });
  if (!candidate || !(entry?.element?.imageDataUrl || entry?.element?.src)) {
    renderStatus("Attach a generated image before accepting this candidate");
    return false;
  }
  updateAssetCandidateSlot(candidate, entry.element, {
    attached: true,
    accepted: true,
    imagePath: entry.element.src || entry.element.sourceName || candidate.title,
    sourceName: entry.element.sourceName || candidate.title,
  });
  state.activeFrameId = entry.frame.id;
  state.viewMode = "frame";
  setSelectedElements([entry.element.id], entry.element.id);
  persistState();
  renderAll();
  renderStatus("Asset candidate accepted and bound to this frame");
  if (sync) {
    void saveExportToWorkspace({ silent: true });
  }
  return true;
}

function placeAssetCandidatePlaceholder(candidateId) {
  const candidate = assetCandidateById(candidateId);
  if (!candidate) {
    renderStatus("Asset candidate no longer exists");
    return null;
  }
  const element = addAssetCandidateElement(candidate);
  if (element) {
    renderStatus("Asset candidate slot placed on its source frame");
  }
  return element;
}

async function placeAssetCandidateImage(candidateId, file) {
  const candidate = assetCandidateById(candidateId);
  if (!candidate || !file) {
    renderStatus("Asset candidate image attach failed");
    return null;
  }
  const imageDataUrl = await fileToDataUrl(file, 1400, {
    preserveAlpha: true,
  });
  const element = addAssetCandidateElement(candidate, {
    imageDataUrl,
    sourceName: cleanString(file.name) || candidate.title,
  });
  if (element) {
    renderStatus("Generated asset attached to candidate region");
  }
  return element;
}

async function placeAssetCandidateImageFromPath(candidateId, inputPath) {
  const candidate = assetCandidateById(candidateId);
  const source = resolveAssetCandidateImageSource(inputPath);
  if (!candidate || !source) {
    renderStatus(
      "Use a workspace-relative image path, /workspace/... URL, or data image URL",
    );
    return null;
  }
  try {
    await ensureImage(source.src);
  } catch {
    renderStatus("Asset candidate image path could not be loaded");
    return null;
  }
  const element = addAssetCandidateElement(candidate, {
    src: source.src,
    imagePath: source.imagePath,
    sourceName: source.sourceName || candidate.title,
  });
  if (element) {
    renderStatus("Generated asset path attached to candidate region");
  }
  return element;
}

function resolveAssetCandidateImageSource(inputPath) {
  const raw = cleanString(inputPath);
  if (!raw) {
    return null;
  }
  if (/^data:image\//i.test(raw)) {
    return {
      src: raw,
      imagePath: "inline-data-url",
      sourceName: "Inline image data",
    };
  }
  if (/^https?:\/\//i.test(raw)) {
    return {
      src: raw,
      imagePath: raw,
      sourceName: assetCandidatePathBasename(raw) || "Remote image",
    };
  }

  let path = raw;
  if (/^file:\/\//i.test(path)) {
    try {
      path = decodeURIComponent(new URL(path).pathname);
    } catch {
      return null;
    }
  }

  if (path.startsWith("/workspace/")) {
    const [pathname, query = ""] = path.split("?");
    const relativePath = decodeURIComponent(
      pathname.replace(/^\/workspace\//, ""),
    );
    return {
      src: path,
      imagePath: relativePath,
      sourceName: assetCandidatePathBasename(relativePath) || "Workspace image",
      query,
    };
  }

  const projectRoot = cleanString(state.serverStatus.projectRoot);
  if (projectRoot && path.startsWith(`${projectRoot}/`)) {
    path = path.slice(projectRoot.length + 1);
  }
  if (path.startsWith("./")) {
    path = path.slice(2);
  }
  if (path.startsWith("/") || path.split(/[\\/]/).includes("..")) {
    return null;
  }

  const relativePath = path.split("\\").join("/");
  const encodedPath = relativePath
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  if (!encodedPath) {
    return null;
  }
  return {
    src: `/workspace/${encodedPath}`,
    imagePath: relativePath,
    sourceName: assetCandidatePathBasename(relativePath) || "Workspace image",
  };
}

function assetCandidatePathBasename(path) {
  const cleanPath = cleanString(path).split("?")[0].split("#")[0];
  const segment = cleanPath.split(/[\\/]/).filter(Boolean).at(-1) || "";
  if (!segment) {
    return "";
  }
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
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
  const targetLabel = target
    ? designerOutputTargetLabelFromItem(target, frame.title)
    : status?.label || "Generated output";
  const targetKind =
    target?.type === "generated-screen-preview"
      ? "Generated"
      : target?.type === "materialized-preview"
        ? "Generated screen"
        : target
          ? "Attached"
          : "No output";

  dom.workbenchOutputBadge.textContent = status?.label || targetKind;
  dom.workbenchOutputBadge.dataset.tone = status?.tone || (target ? "synced" : "empty");
  dom.workbenchOutputStageBadge.textContent = status?.label || targetKind;
  dom.workbenchOutputStageBadge.dataset.tone =
    status?.tone || (target ? "synced" : "empty");
  dom.workbenchOpenOutput.hidden = !targetUrl;
  dom.workbenchOpenOutput.href = targetUrl || "#";
  dom.workbenchOutputStageOpen.hidden = !targetUrl;
  dom.workbenchOutputStageOpen.href = targetUrl || "#";
  renderDesignReviewControls(target);
  dom.workbenchClearMarks.hidden = annotationCount === 0;

  const context = {
    annotationCount,
    frame,
    target,
    targetKind,
    targetLabel,
    targetUrl,
  };
  renderWorkbenchOutputSurface(dom.workbenchOutputSurface, dom.workbenchOutputMeta, {
    ...context,
    compact: true,
  });
  renderWorkbenchOutputSurface(
    dom.workbenchOutputStageSurface,
    dom.workbenchOutputStageMeta,
    {
      ...context,
      compact: false,
    },
  );
  window.requestAnimationFrame(renderWorkbenchOutputAnnotations);
}

function renderWorkbenchOutputSurface(surface, metaNode, context) {
  const {
    annotationCount,
    compact,
    frame,
    target,
    targetKind,
    targetLabel,
    targetUrl,
  } = context;
  const stageClass = compact ? "" : " workbench-output-stage-surface";
  if (!target || !targetUrl) {
    surface.className =
      `workbench-output-surface${stageClass} empty-state`;
    surface.innerHTML = `
      <span class="workbench-output-mark">Make real</span>
      <p>${
        compact
          ? "Draw a rough layout, add spoken context, then press Make. Output appears here for correction marks."
          : "Use Split or Output focus after Make to inspect generated surfaces at a usable size."
      }</p>
    `;
    metaNode.textContent = annotationCount
      ? `${annotationCount} output correction mark(s) are saved, but no generated surface is currently attached.`
      : "Ready for UI, image prompt, book spread, poster, app screen, deck, or spec work.";
    return;
  }

  const framedUrl = addTargetRevisionToUrl(targetUrl, target);
  const freshness = describeManifestFreshness(target, frame);
  const refinement = describeTargetRefinement(target);
  surface.className = `workbench-output-surface${stageClass} ${
    annotationCount ? "has-annotations" : ""
  }`;
  surface.innerHTML = `
    <iframe
      src="${escapeHtml(framedUrl)}"
      title="${escapeHtml(targetLabel)}"
      loading="lazy"
    ></iframe>
    <canvas
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
  metaNode.textContent = annotationCount
    ? `${baseMeta} ${annotationCount} correction mark(s) are attached to this output.`
    : `${baseMeta} Use pen, marker, or erase on this surface to mark the next correction.`;
}

function renderDesignReviewControls(target) {
  const canReview = Boolean(target?.previewPath || target?.path);
  const summary = canReview
    ? describeDesignJuryReview(state.serverStatus.designJury, target)
    : null;
  const buttons = [
    dom.workbenchReviewOutput,
    dom.workbenchOutputStageReview,
  ].filter(Boolean);
  const badges = [
    dom.workbenchDesignReviewBadge,
    dom.workbenchOutputStageReviewBadge,
  ].filter(Boolean);

  buttons.forEach((button) => {
    button.hidden = !canReview;
    button.disabled = state.designReviewInFlight || !canReview;
    button.textContent = state.designReviewInFlight ? "Reviewing..." : "Review";
  });

  badges.forEach((badge) => {
    badge.hidden = !summary;
    if (!summary) {
      badge.textContent = "No review";
      badge.dataset.tone = "empty";
      return;
    }
    badge.textContent = summary.label;
    badge.dataset.tone = summary.tone;
    badge.title = summary.detail;
  });
}

function describeDesignJuryReview(review, target) {
  if (review?.kind !== "canvax-design-jury-review") {
    return null;
  }
  const targetPath = cleanString(target?.previewPath || target?.path);
  const sourceArtifacts = Array.isArray(review.source?.artifacts)
    ? review.source.artifacts
    : [];
  const reviewedPaths = sourceArtifacts
    .map((artifact) => cleanString(artifact.path || artifact.label))
    .filter(Boolean);
  const coversTarget =
    !targetPath ||
    reviewedPaths.some(
      (path) => path === targetPath || path.endsWith(targetPath),
    );
  const score = Number.isFinite(Number(review.score))
    ? Math.round(Number(review.score))
    : null;
  const decision = cleanString(review.decision || review.status);
  const stale = targetPath && !coversTarget;
  const baseLabel =
    review.status === "fail"
      ? "Blocked"
      : review.status === "review"
        ? "Needs review"
        : "Ready";
  const label = stale
    ? "Review stale"
    : `${baseLabel}${score === null ? "" : ` ${score}`}`;
  const tone = stale
    ? "warning"
    : review.status === "fail"
      ? "danger"
      : review.status === "review"
        ? "warning"
        : "synced";
  return {
    label,
    tone,
    detail: [
      stale
        ? "The latest design-jury result does not match the connected output target."
        : review.summary || "Local no-API design-jury verdict.",
      decision ? `Decision: ${decision}` : "",
      reviewedPaths.length ? `Reviewed: ${reviewedPaths.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

function currentWorkbenchTarget() {
  const manifest = state.serverStatus.previewManifest || null;
  return resolveManifestTargetEntry(manifest, state.activeFrameId);
}

function workbenchOutputToolCanDraw() {
  return state.tool === "pen" || state.tool === "marker" || state.tool === "erase";
}

function outputAnnotationCanvasFromEvent(event) {
  const surface = event.currentTarget?.closest?.(
    "[data-workbench-output-surface]",
  );
  const canvas = surface?.querySelector(".workbench-output-overlay") || null;
  return canvas;
}

function outputAnnotationPointFromEvent(event) {
  const canvas = outputAnnotationCanvasFromEvent(event);
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
  const canvas = outputAnnotationCanvasFromEvent(event);
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
  const canvas = outputAnnotationCanvasFromEvent(event);
  canvas?.releasePointerCapture?.(event.pointerId);
  state.outputAnnotationDraft = null;
  const normalized = normalizeOutputAnnotation(draft);
  if (!normalized || !isOutputAnnotationMeaningful(normalized)) {
    renderWorkbenchOutputAnnotations();
    return;
  }
  const frame = currentFrame();
  pushOutputAnnotationHistory(frame);
  if (isOutputAnnotationEraser(normalized)) {
    const removed = eraseOutputAnnotations(frame, normalized);
    touchFrame(frame, {
      capture: false,
      status: removed
        ? `Removed ${removed} output correction mark${removed === 1 ? "" : "s"}`
        : "No output correction mark under eraser",
    });
    return;
  }
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

function isOutputAnnotationEraser(annotation) {
  return annotation?.composite === "destination-out";
}

function eraseOutputAnnotations(frame, eraserAnnotation) {
  const eraserBounds =
    eraserAnnotation?.normalizedBounds ||
    eraserAnnotation?.bounds ||
    outputAnnotationBounds(eraserAnnotation);
  if (!frame || !eraserBounds) {
    return 0;
  }
  const before = Array.isArray(frame.outputAnnotations)
    ? frame.outputAnnotations
    : [];
  const remaining = before.filter((annotation) => {
    if (isOutputAnnotationEraser(annotation)) {
      return false;
    }
    return !rectsOverlap(
      annotation.normalizedBounds ||
        annotation.bounds ||
        outputAnnotationBounds(annotation),
      eraserBounds,
    );
  });
  frame.outputAnnotations = remaining;
  state.outputAnnotationDraft = null;
  renderWorkbenchOutputAnnotations();
  return before.length - remaining.length;
}

function rectsOverlap(a, b) {
  if (!a || !b) {
    return false;
  }
  const leftA = Number.isFinite(a.left) ? a.left : a.x;
  const topA = Number.isFinite(a.top) ? a.top : a.y;
  const rightA = Number.isFinite(a.right)
    ? a.right
    : leftA + (Number.isFinite(a.width) ? a.width : a.w || 0);
  const bottomA = Number.isFinite(a.bottom)
    ? a.bottom
    : topA + (Number.isFinite(a.height) ? a.height : a.h || 0);
  const leftB = Number.isFinite(b.left) ? b.left : b.x;
  const topB = Number.isFinite(b.top) ? b.top : b.y;
  const rightB = Number.isFinite(b.right)
    ? b.right
    : leftB + (Number.isFinite(b.width) ? b.width : b.w || 0);
  const bottomB = Number.isFinite(b.bottom)
    ? b.bottom
    : topB + (Number.isFinite(b.height) ? b.height : b.h || 0);
  return (
    leftA <= rightB &&
    rightA >= leftB &&
    topA <= bottomB &&
    bottomA >= topB
  );
}

function renderWorkbenchOutputAnnotations() {
  const canvases = Array.from(
    document.querySelectorAll(".workbench-output-overlay"),
  );
  if (!canvases.length) {
    return;
  }
  canvases.forEach((canvas) => renderWorkbenchOutputAnnotationCanvas(canvas));
}

function renderWorkbenchOutputAnnotationCanvas(canvas) {
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
  dom.flowZoomValue.textContent = `${Math.round(state.flowZoom * 100)}%`;
  dom.flowZoomOut.disabled = state.flowZoom <= 0.35;
  dom.flowZoomIn.disabled = state.flowZoom >= 2.25;
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

function setFlowZoom(nextZoom) {
  cancelFlowPanMomentum();
  state.flowZoom = Math.max(
    0.35,
    Math.min(2.25, Number(nextZoom.toFixed(2))),
  );
  persistState();
  renderZoom();
  renderFlowBoard();
}

function updateFlowZoom(delta) {
  setFlowZoom(state.flowZoom + delta);
}

function flowMapContentBounds() {
  const frameBounds = state.frames.map((frame) =>
    makeBounds(
      frame.flowPosition.x,
      frame.flowPosition.y,
      frame.flowPosition.x + FLOW_CARD_WIDTH,
      frame.flowPosition.y + FLOW_CARD_HEIGHT,
    ),
  );
  const objectBounds = state.spatialObjects
    .filter(isSpatialObjectVisibleInCurrentMap)
    .map(spatialObjectBounds);
  return unionBounds([...frameBounds, ...objectBounds]);
}

function fitFlowMapToContent(options = {}) {
  const { silent = false } = options;
  cancelFlowPanMomentum();
  const bounds = flowMapContentBounds();
  const shell = dom.flowShell;
  if (!bounds || !shell) {
    if (!silent) {
      renderStatus("No Map content to fit");
    }
    return false;
  }
  const shellWidth = Math.max(1, shell.clientWidth || 1);
  const shellHeight = Math.max(1, shell.clientHeight || 1);
  const padding = 96;
  const zoomX = (shellWidth - padding * 2) / Math.max(1, bounds.width);
  const zoomY = (shellHeight - padding * 2) / Math.max(1, bounds.height);
  const nextZoom = Math.max(
    0.35,
    Math.min(1.25, Number(Math.min(zoomX, zoomY).toFixed(2))),
  );
  state.flowZoom = nextZoom;
  persistState();
  renderZoom();
  renderFlowBoard();
  shell.scrollLeft = Math.max(0, Math.round((bounds.left - padding) * nextZoom));
  shell.scrollTop = Math.max(0, Math.round((bounds.top - padding) * nextZoom));
  if (!silent) {
    renderStatus("Fit Map to visible frames and objects");
  }
  return true;
}

function flowNavigatorItems(layout = computeFlowSurfaceSize()) {
  const itemBounds = [
    ...state.frames.map((frame) => ({
      id: frame.id,
      kind:
        frame.id === state.activeFrameId
          ? "active-frame"
          : frame.variant?.label
            ? "variant-frame"
            : "frame",
      bounds: makeBounds(
        frame.flowPosition.x,
        frame.flowPosition.y,
        frame.flowPosition.x + FLOW_CARD_WIDTH,
        frame.flowPosition.y + FLOW_CARD_HEIGHT,
      ),
    })),
    ...state.spatialObjects
      .filter(isSpatialObjectVisibleInCurrentMap)
      .map((object) => ({
        id: object.id,
        kind: normalizeSpatialSourceKind(object.sourceKind),
        bounds: spatialObjectBounds(object),
      })),
  ];

  return itemBounds
    .map((item) => {
      const bounds = item.bounds || makeBounds(0, 0, 1, 1);
      return {
        ...item,
        x: percentage(bounds.left, layout.width),
        y: percentage(bounds.top, layout.height),
        width: percentage(bounds.width, layout.width),
        height: percentage(bounds.height, layout.height),
      };
    })
    .filter((item) => item.width > 0 && item.height > 0);
}

function renderFlowNavigator(layout = computeFlowSurfaceSize()) {
  if (
    !dom.flowNavigator ||
    !dom.flowNavigatorItems ||
    !dom.flowNavigatorViewport ||
    !dom.flowNavigatorScale
  ) {
    return;
  }
  const items = flowNavigatorItems(layout);
  dom.flowNavigator.hidden = state.viewMode !== "flow";
  dom.flowNavigatorScale.textContent = `${Math.round((state.flowZoom || 1) * 100)}%`;
  dom.flowNavigatorItems.innerHTML = items
    .map(
      (item) => `
        <span
          class="flow-navigator-item ${escapeHtml(classToken(item.kind))}"
          style="left:${item.x}%; top:${item.y}%; width:${Math.max(1.5, item.width)}%; height:${Math.max(1.5, item.height)}%;"
        ></span>
      `,
    )
    .join("");
  renderFlowNavigatorViewport(layout);
}

function renderFlowNavigatorViewport(layout = computeFlowSurfaceSize()) {
  if (!dom.flowNavigatorViewport || !dom.flowShell) {
    return;
  }
  const zoom = Number.isFinite(state.flowZoom) ? state.flowZoom : 1;
  const visibleLeft = dom.flowShell.scrollLeft / zoom;
  const visibleTop = dom.flowShell.scrollTop / zoom;
  const visibleWidth = dom.flowShell.clientWidth / zoom;
  const visibleHeight = dom.flowShell.clientHeight / zoom;
  dom.flowNavigatorViewport.style.left = `${percentage(visibleLeft, layout.width)}%`;
  dom.flowNavigatorViewport.style.top = `${percentage(visibleTop, layout.height)}%`;
  dom.flowNavigatorViewport.style.width = `${Math.min(100, percentage(visibleWidth, layout.width))}%`;
  dom.flowNavigatorViewport.style.height = `${Math.min(100, percentage(visibleHeight, layout.height))}%`;
}

function percentage(value, total) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, (value / total) * 100));
}

function onFlowNavigatorPointerDown(event) {
  if (event.button > 0 || !dom.flowNavigatorStage || !dom.flowShell) {
    return;
  }
  const rect = dom.flowNavigatorStage.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return;
  }
  event.preventDefault();
  cancelFlowPanMomentum();
  const layout = computeFlowSurfaceSize();
  const zoom = Number.isFinite(state.flowZoom) ? state.flowZoom : 1;
  const normalizedX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const normalizedY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  const targetX = normalizedX * layout.width;
  const targetY = normalizedY * layout.height;
  dom.flowShell.scrollLeft = Math.max(
    0,
    Math.round(targetX * zoom - dom.flowShell.clientWidth / 2),
  );
  dom.flowShell.scrollTop = Math.max(
    0,
    Math.round(targetY * zoom - dom.flowShell.clientHeight / 2),
  );
  renderFlowNavigatorViewport(layout);
  renderStatus("Moved Map viewport from navigator");
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
  renderElementPrototypeControls();
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
  document.body.dataset.viewMode = state.viewMode;
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

function renderAutomationControls() {
  if (dom.liveRewriteToggle) {
    dom.liveRewriteToggle.checked = Boolean(state.autoRewrite);
  }
  if (dom.focusAutoRewrite) {
    dom.focusAutoRewrite.classList.toggle("active", Boolean(state.autoRewrite));
    dom.focusAutoRewrite.setAttribute(
      "aria-pressed",
      String(Boolean(state.autoRewrite)),
    );
    dom.focusAutoRewrite.textContent = state.autoRewrite
      ? state.liveRewriteInFlight
        ? state.liveRewriteQueued
          ? "Rewrite queued"
          : "Rewriting..."
        : "Live rewrite on"
      : "Live rewrite";
    dom.focusAutoRewrite.title = state.liveRewriteQueued
      ? "A newer sketch/voice handoff is queued and will run after the current rewrite finishes."
      : "When enabled, autosnap/freeze runs the local no-API rewrite preview after saving";
    dom.focusAutoRewrite.disabled = Boolean(state.liveRewriteInFlight);
  }
}

function setAutoRewriteEnabled(enabled) {
  state.autoRewrite = Boolean(enabled);
  persistState();
  renderAutomationControls();
  renderFocusPad();
  renderStatus(
    state.autoRewrite
      ? "Live rewrite armed for autosnap/freeze"
      : "Live rewrite paused",
  );
}

function isPromotedVariant(frame) {
  return Boolean(frame?.variant?.promotedAt);
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
      const variantLabel = frame.variant?.label
        ? `${isPromotedVariant(frame) ? "Primary variant" : "Variant"} · ${frame.variant.label}`
        : "";
      const subtitle = [variantLabel || viewport.label, timeLabel(frame.updatedAt)]
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
            <span>${frame.captures.length} capture${frame.captures.length === 1 ? "" : "s"}${frame.variant?.sourceFrameTitle ? ` • from ${escapeHtml(frame.variant.sourceFrameTitle)}` : ""}</span>
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
    if (frame.variant?.label) {
      subtitleParts.push(`variant: ${frame.variant.label}`);
    }
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

async function executeLatestRewriteRequest(options = {}) {
  const { exportResult = null, frameId = state.activeFrameId } = options;
  const response = await fetch("/api/execute-rewrite-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestPath: exportResult?.rewriteRequestJsonPath || "",
      taskPackPath: exportResult?.taskPackJsonPath || "",
      frameId,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data?.executed) {
    throw new Error(data?.error || "Rewrite request execution failed.");
  }
  await refreshPreviewStateFromServer();
  return data;
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
      let executeResult = null;
      dom.workspaceStatus.textContent =
        "Running local rewrite preview from the latest sketch + voice checkpoint...";
      try {
        executeResult = await executeLatestRewriteRequest({
          exportResult,
          frameId: frame.id,
        });
      } catch (error) {
        executeResult = {
          executed: false,
          error:
            error instanceof Error
              ? error.message
              : "Rewrite request execution failed.",
        };
      }
      state.serverStatus = {
        ...state.serverStatus,
        rewriteExecution: executeResult,
      };
      if (executeResult?.executed) {
        state.focusLastAppliedText =
          "Applied. The sketch + voice checkpoint refreshed the attached preview surface.";
        dom.workspaceStatus.textContent =
          `Workbench applied and rewrite preview bound to ${executeResult.previewPath}.`;
        renderStatus("Rewrite preview refreshed from Workbench");
      } else {
        state.focusLastAppliedText =
          "Applied. The checkpoint is ready for Codex, but the local rewrite preview did not finish.";
        dom.workspaceStatus.textContent =
          "Workbench checkpoint saved. Local rewrite preview did not finish; Codex can still read the latest request.";
        renderStatus("Workbench checkpoint ready for Codex");
      }
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

async function runWorkbenchDesignReview() {
  const frame = currentFrame();
  const target = currentWorkbenchTarget();
  const artifactPath = cleanString(target?.previewPath || target?.path);
  if (state.designReviewInFlight) {
    return null;
  }
  if (!artifactPath) {
    dom.workspaceStatus.textContent =
      "Make or attach an output before running the local design review.";
    renderStatus("No output to review yet");
    return null;
  }

  state.designReviewInFlight = true;
  renderWorkbenchOutput();
  renderStatus("Running local no-API design review...");
  dom.workspaceStatus.textContent =
    `Reviewing ${designerOutputTargetLabelFromItem(target, frame.title)} with the local design jury...`;

  try {
    const response = await fetch("/api/run-design-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artifactPath,
        frameId: frame.id,
        frameTitle: frame.title,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data?.executed) {
      throw new Error(data.error || "Design review failed.");
    }
    state.serverStatus = {
      ...state.serverStatus,
      designJury: data.review || null,
    };
    await refreshPreviewStateFromServer();
    const summary = describeDesignJuryReview(
      state.serverStatus.designJury,
      target,
    );
    state.focusLastAppliedText = summary
      ? `Design review: ${summary.label}. ${data.markdownPath || "Review handoff saved."}`
      : "Design review saved.";
    dom.workspaceStatus.textContent =
      data.markdownPath || "Design review saved to exports.";
    renderStatus(summary ? `Design review: ${summary.label}` : "Design review saved");
    return data;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Design review failed.";
    dom.workspaceStatus.textContent = message;
    renderStatus("Design review failed");
    return null;
  } finally {
    state.designReviewInFlight = false;
    renderWorkbenchOutput();
    renderFocusPad();
  }
}

async function buildRealScreenWithCodex(options = {}) {
  const { silent = false, announce = true } = options;
  const frame = currentFrame();
  if (!frame || state.buildRealInFlight) {
    return null;
  }

  const hasBuildContext = Boolean(
    frame.elements.length ||
      frame.backgroundImage ||
      frame.captures.length ||
      frame.objective.trim() ||
      frame.layout.trim() ||
      state.voice.segments.length ||
      (frame.outputAnnotations || []).length,
  );
  if (!hasBuildContext) {
    if (!silent) {
      dom.workspaceStatus.textContent =
        "Draw, label, speak, or add a note before creating a real build request.";
    }
    if (announce) {
      renderStatus("Nothing to build yet");
    }
    return null;
  }

  const originalBuildLabel = dom.buildRealScreen.textContent;
  const originalBuildPanelLabel = dom.buildRealScreenPanel.textContent;
  const originalFocusBuildLabel = dom.focusBuildReal.textContent;
  state.buildRealInFlight = true;
  renderFocusPad();

  try {
    if (!frame.objective.trim()) {
      frame.objective =
        "Build a real app/page/screen from this rough Canvax frame.";
    }
    if (!frame.layout.trim()) {
      frame.layout =
        "Use the sketch geometry, labels, voice notes, and output correction marks as the implementation brief.";
    }
    persistState();

    dom.buildRealScreen.disabled = true;
    dom.buildRealScreenPanel.disabled = true;
    dom.focusBuildReal.disabled = true;
    if (!silent) {
      dom.buildRealScreen.textContent = "Preparing...";
      dom.buildRealScreenPanel.textContent = "Preparing...";
      dom.focusBuildReal.textContent = "Preparing...";
      dom.workspaceStatus.textContent =
        `Preparing real implementation request for ${frame.title}...`;
    }
    if (announce) {
      renderStatus(`Preparing real implementation request for ${frame.title}`);
    }

    const exportResult = await freezeFrame(true, {
      reason: "build-real-screen",
      status: "Build request snapshot saved",
    });
    const exportPackage = await buildExportPackage();
    const request = buildBuildRealRequest(frame, exportPackage, exportResult);
    const response = await fetch("/api/save-build-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request,
        markdown: buildBuildRealRequestMarkdown(request),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Build request save failed.");
    }

    let executeResult = null;
    if (!silent) {
      dom.buildRealScreen.textContent = "Binding...";
      dom.buildRealScreenPanel.textContent = "Binding...";
      dom.focusBuildReal.textContent = "Binding...";
      dom.workspaceStatus.textContent =
        `Running the local no-API build preview for ${frame.title}...`;
    }
    try {
      const executeResponse = await fetch("/api/execute-build-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestPath: data.latestJsonPath || data.jsonPath || "",
        }),
      });
      executeResult = await executeResponse.json();
      if (!executeResponse.ok || !executeResult?.executed) {
        throw new Error(
          executeResult?.error || "Build request execution failed.",
        );
      }
      await refreshPreviewStateFromServer();
    } catch (error) {
      executeResult = {
        executed: false,
        error:
          error instanceof Error
            ? error.message
            : "Build request execution failed.",
      };
    }

    state.serverStatus = {
      ...state.serverStatus,
      buildRequest: data.request || request,
      buildRequestPath: data.latestMarkdownPath || data.markdownPath || "",
      buildExecution: executeResult,
    };
    state.focusLastAppliedText = executeResult?.executed
      ? "Build request saved and a local frame-bound preview is attached. Codex can now replace the smoke artifact with real app/screen code."
      : "Build request ready for Codex, but the local preview execution did not finish. Codex can still read the request and build from it.";
    if (!silent) {
      dom.workspaceStatus.textContent = executeResult?.executed
        ? `Build request saved and bound to ${executeResult.previewPath}.`
        : `Build request saved to ${data.latestMarkdownPath || data.markdownPath}. Local preview binding failed.`;
    }
    if (announce) {
      renderStatus(
        executeResult?.executed
          ? "Build preview bound to Canvax"
          : "Build request ready for Codex",
      );
    }
    void saveCheckpointToWorkspace("build-real-screen", {
      silent: true,
      exportResult,
      note: executeResult?.executed
        ? `Created and executed a no-API build preview for ${frame.title}.`
        : `Created a real implementation request for ${frame.title}.`,
    });
    renderServerStatus();
    return {
      ...data,
      executeResult,
    };
  } catch (error) {
    if (!silent) {
      dom.workspaceStatus.textContent =
        error instanceof Error
          ? error.message
          : "Build request save failed.";
    }
    if (announce) {
      renderStatus("Build request failed");
    }
    return null;
  } finally {
    state.buildRealInFlight = false;
    dom.buildRealScreen.disabled = false;
    dom.buildRealScreenPanel.disabled = false;
    dom.focusBuildReal.disabled = false;
    dom.buildRealScreen.textContent = originalBuildLabel;
    dom.buildRealScreenPanel.textContent = originalBuildPanelLabel;
    dom.focusBuildReal.textContent = originalFocusBuildLabel;
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

function updateManualVoiceDraft(
  value,
  { clearFocusStatus = false, render = true } = {},
) {
  state.voice.manualDraft = String(value || "");
  if (clearFocusStatus) {
    state.focusLastAppliedText = "";
  }
  syncManualVoiceDraftControls();
  persistState();
  if (render) {
    renderVoicePanel();
    renderFocusPad();
  }
}

function syncManualVoiceDraftControls() {
  const draft = state.voice.manualDraft || "";
  dom.voiceManualInput.value = draft;
  dom.focusManualInput.value = draft;
  dom.workbenchComposerInput.value = draft;
  const hasDraft = Boolean(draft.trim());
  dom.voiceAddManual.disabled = !hasDraft;
  dom.focusAddManual.disabled = !hasDraft;
  dom.workbenchComposerNote.disabled = !hasDraft;
  dom.workbenchComposerPin.disabled = !hasDraft;
}

function commitManualVoiceDraft(provider = "manual-note") {
  const text = state.voice.manualDraft.trim();
  if (!text) {
    return false;
  }
  state.voice.manualDraft = "";
  syncManualVoiceDraftControls();
  addVoiceSegment(text, { provider });
  renderVoicePanel();
  renderFocusPad();
  return true;
}

function addManualVoiceNote(provider = "manual-note") {
  const committed = commitManualVoiceDraft(provider);
  if (!committed) {
    return;
  }
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
          ? "generated screen"
          : target.type || "preview";
    dom.codexOutputSummary.className = "codex-output-summary";
    dom.codexOutputSummary.innerHTML = `
      <div class="artifact-item-row">
        <strong>${escapeHtml(designerOutputTargetLabelFromItem(target, "Connected implementation"))}</strong>
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

function renderWorkbenchAgentLog() {
  const items = buildWorkbenchAgentLogItems();
  const open = Boolean(state.workbenchAgentLogOpen);
  dom.workbenchAgentLog.dataset.open = String(open);
  dom.workbenchAgentLogToggle.setAttribute("aria-expanded", String(open));
  dom.workbenchAgentLogPanel.hidden = !open;
  dom.workbenchAgentLogCount.textContent = String(items.length);
  dom.workbenchAgentLogStatus.textContent = items.length
    ? `${items[0].kind} • ${timeLabel(items[0].at) || "now"}`
    : "No activity yet";

  if (!items.length) {
    dom.workbenchAgentLogList.className =
      "workbench-agent-log-list empty-state";
    dom.workbenchAgentLogList.textContent =
      "No agent/output activity yet. Make, Apply, Review, or save a checkpoint.";
    return;
  }

  dom.workbenchAgentLogList.className = "workbench-agent-log-list";
  dom.workbenchAgentLogList.innerHTML = items
    .map(
      (item) => `
        <article class="workbench-agent-log-item" data-tone="${escapeHtml(item.tone)}">
          <div>
            <span>${escapeHtml(item.kind)}</span>
            <strong>${escapeHtml(item.title)}</strong>
          </div>
          <small>${escapeHtml(timeLabel(item.at) || item.when || "now")}</small>
          ${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ""}
        </article>
      `,
    )
    .join("");
}

function buildWorkbenchAgentLogItems() {
  const items = [];
  const now = new Date().toISOString();
  const frame = currentFrame();

  if (state.focusApplyInFlight || state.liveRewriteInFlight) {
    items.push({
      id: "live-apply",
      kind: "Applying",
      title: "Refreshing from sketch + voice",
      detail: "Canvax is saving the handoff and updating the attached output.",
      tone: "active",
      at: now,
    });
  }
  if (state.generationInFlight || state.buildRealInFlight) {
    items.push({
      id: "live-make",
      kind: "Making",
      title: state.buildRealInFlight
        ? "Building Codex request"
        : "Generating screen",
      detail: "A local no-API output pass is running for the current frame.",
      tone: "active",
      at: now,
    });
  }
  if (state.designReviewInFlight) {
    items.push({
      id: "live-review",
      kind: "Reviewing",
      title: "Running local design jury",
      detail:
        "Checking hierarchy, accessibility, responsiveness, and production readiness.",
      tone: "active",
      at: now,
    });
  }

  const designJury = state.serverStatus.designJury;
  if (designJury?.kind === "canvax-design-jury-review") {
    items.push({
      id: `design-jury-${designJury.createdAt || "latest"}`,
      kind: "Review",
      title:
        designJury.status === "fail"
          ? "Design jury blocked output"
          : designJury.status === "review"
            ? "Design jury needs review"
            : "Design jury passed",
      detail: designJury.summary || designJury.decision || "",
      tone:
        designJury.status === "fail"
          ? "danger"
          : designJury.status === "review"
            ? "warning"
            : "synced",
      at: designJury.createdAt || now,
    });
  }

  buildRewriteQueue()
    .slice(0, 3)
    .forEach((item) => {
      items.push({
        id: `rewrite-${item.frameId}`,
        kind: "Rewrite",
        title: item.title || "Frame needs attention",
        detail: item.detail || item.label || "",
        tone: "warning",
        at: item.updatedAt || now,
      });
    });

  (Array.isArray(state.serverStatus.outputActivity)
    ? state.serverStatus.outputActivity
    : []
  )
    .slice(0, 5)
    .forEach((item) => {
      items.push({
        id: `output-${item.id || item.digest || item.at || item.summary}`,
        kind: "Output",
        title: item.summary || "Output update",
        detail: item.detail || "",
        tone: "synced",
        at: item.at || now,
      });
    });

  (Array.isArray(state.serverStatus.sessionEvents)
    ? state.serverStatus.sessionEvents
    : []
  )
    .slice(0, 12)
    .forEach((event) => {
      const activity = agentLogItemFromSessionEvent(event);
      if (activity) {
        items.push(activity);
      }
    });

  const checkpoints = Array.isArray(
    state.serverStatus.checkpointHistory?.items,
  )
    ? state.serverStatus.checkpointHistory.items
    : [];
  checkpoints.slice(0, 3).forEach((checkpoint) => {
    items.push({
      id: `checkpoint-${checkpoint.id || checkpoint.savedAt}`,
      kind: "Checkpoint",
      title: checkpoint.label || checkpointReasonLabel(checkpoint.reason),
      detail: checkpoint.note || checkpoint.frameTitle || frame.title,
      tone: "neutral",
      at: checkpoint.savedAt || checkpoint.at || now,
    });
  });

  buildVoiceIntentQueue(voiceSegmentsForCurrentScope(), { limit: 3 }).forEach(
    (intent) => {
      items.push({
        id: `voice-${intent.id}`,
        kind: "Voice",
        title: `${intent.label}: ${intent.summary}`,
        detail: intent.detail,
        tone: "voice",
        at: intent.at || now,
      });
    },
  );

  return dedupeAgentLogItems(items)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, 9);
}

function agentLogItemFromSessionEvent(event) {
  if (!event || typeof event !== "object") {
    return null;
  }
  const type = cleanString(event.type || event.reason);
  const at = cleanString(event.at || event.savedAt) || new Date().toISOString();
  if (type === "design-review-executed") {
    return {
      id: `event-review-${at}-${event.frameId || ""}`,
      kind: "Review",
      title:
        event.status === "fail"
          ? "Design review blocked output"
          : "Design review recorded",
      detail: [
        event.frameTitle || "",
        event.decision ? `decision ${event.decision}` : "",
        Number.isFinite(Number(event.score)) ? `score ${event.score}` : "",
      ]
        .filter(Boolean)
        .join(" • "),
      tone: event.status === "fail" ? "danger" : "synced",
      at,
    };
  }
  if (type === "rewrite-request-executed") {
    return {
      id: `event-rewrite-${at}-${event.frameId || ""}`,
      kind: "Rewrite",
      title: `${event.frameTitle || "Frame"} refreshed`,
      detail: event.previewPath || event.contextPath || "",
      tone: "synced",
      at,
    };
  }
  if (
    ["output-update", "publish-output", "materialize", "generate-screen"].includes(
      type,
    )
  ) {
    return {
      id: `event-output-${at}-${event.frameId || ""}`,
      kind: "Output",
      title: event.label || event.note || checkpointReasonLabel(type),
      detail: event.outputDigest?.summary || event.frameTitle || "",
      tone: "synced",
      at,
    };
  }
  if (type === "checkpoint") {
    return {
      id: `event-checkpoint-${event.id || at}`,
      kind: "Checkpoint",
      title: event.label || "Checkpoint saved",
      detail: event.note || event.frameTitle || "",
      tone: "neutral",
      at,
    };
  }
  return null;
}

function dedupeAgentLogItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function buildWorkbenchAgentLogExport(options = {}) {
  const limit = Number.isFinite(Number(options.limit))
    ? Math.max(1, Number(options.limit))
    : 9;
  const items = buildWorkbenchAgentLogItems()
    .slice(0, limit)
    .map((item) => ({
      id: cleanString(item.id),
      kind: cleanString(item.kind),
      title: cleanString(item.title),
      detail: cleanString(item.detail),
      tone: cleanString(item.tone) || "neutral",
      at: cleanString(item.at),
    }));
  return {
    kind: "canvax-workbench-agent-log",
    generatedAt: new Date().toISOString(),
    itemCount: items.length,
    latestAt: items[0]?.at || "",
    items,
  };
}

function buildWorkbenchExport(options = {}) {
  const workspaceMode =
    workspaceModes.find((entry) => entry.id === state.workspaceMode) ||
    workspaceModes[0];
  const workbenchFocus =
    workbenchFocusModes.find((entry) => entry.id === state.workbenchFocus) ||
    workbenchFocusModes[0];
  const viewMode = viewModes.find((entry) => entry.id === state.viewMode);
  const actionMode = currentActionMode();
  return {
    kind: "canvax-workbench-state",
    workspaceMode: state.workspaceMode,
    workspaceModeLabel: workspaceMode.label,
    viewMode: state.viewMode,
    viewModeLabel: viewMode?.label || state.viewMode,
    focus: state.workbenchFocus,
    focusLabel: workbenchFocus.label,
    focusDescription: workbenchFocus.description,
    startPath: "1 Sketch -> 2 Talk -> 3 Make -> 4 Map",
    actionMode: actionMode.id,
    actionModeLabel: actionMode.label,
    actionModeDescription: actionMode.description,
    trayCollapsed: Boolean(state.workbenchTrayCollapsed),
    agentLogOpen: Boolean(state.workbenchAgentLogOpen),
    agentLog: buildWorkbenchAgentLogExport({ limit: options.agentLogLimit }),
  };
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
    .map((item, index) => {
      const replayKey = item.id || String(index);
      const links = [
        `<button class="ghost-button compact artifact-link" type="button" data-replay-checkpoint="${escapeHtml(replayKey)}">Replay as frame</button>`,
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
              ? `<p class="artifact-copy">${escapeHtml(
                  `Target: ${designerOutputTargetLabel(
                    item.targetLabel,
                    item.frameTitle,
                  )}`,
                )}</p>`
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
    parts.push(
      designerOutputTargetLabel(
        outputDigest.targetLabel,
        outputDigest.frameTitle,
      ),
    );
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
          ? designerOutputTargetLabel(
              event.outputDigest.targetLabel,
              event.outputDigest?.frameTitle,
            )
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
  const zoom = Number.isFinite(state.flowZoom) ? state.flowZoom : 1;
  dom.flowSurface.style.width = `${Math.round(layout.width * zoom)}px`;
  dom.flowSurface.style.height = `${Math.round(layout.height * zoom)}px`;
  dom.flowSurface.style.setProperty("--flow-zoom", String(zoom));
  dom.flowBoard.style.width = `${layout.width}px`;
  dom.flowBoard.style.height = `${layout.height}px`;
  dom.flowBoard.style.transform = `scale(${zoom})`;
  dom.flowBoard.style.transformOrigin = "top left";
  dom.flowSvg.style.transform = `scale(${zoom})`;
  dom.flowSvg.style.transformOrigin = "top left";
  dom.flowSvg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
  dom.flowSvg.setAttribute("width", String(layout.width));
  dom.flowSvg.setAttribute("height", String(layout.height));

  const frameMarkup = state.frames
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
        frame.variant?.label ? "variant" : "",
        isPromotedVariant(frame) ? "primary-variant" : "",
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
              <span>${frame.variant?.label ? `${isPromotedVariant(frame) ? "Primary variant" : "Variant"} · ${escapeHtml(frame.variant.label)}` : escapeHtml(viewport.label)} • ${frame.captures.length} capture${frame.captures.length === 1 ? "" : "s"}</span>
            </div>
            ${frame.id === state.entryFrameId ? '<span class="flow-card-badge">Entry</span>' : ""}
            ${frame.variant?.label ? `<span class="flow-card-badge">${isPromotedVariant(frame) ? "Primary" : "Variant"}</span>` : ""}
          </div>
          ${
            frame.variant?.sourceFrameId
              ? `<div class="flow-card-lineage"><span>From</span><strong>${escapeHtml(frame.variant.sourceFrameTitle || frameTitleById(frame.variant.sourceFrameId))}</strong></div>`
              : ""
          }
          <div class="flow-card-preview">
            ${thumbnail ? `<img src="${thumbnail}" alt="" />` : ""}
          </div>
          <div class="flow-card-footer">
            <span>${countFrameConnections(frame.id)} linked</span>
            ${
              frame.variant?.sourceFrameId
                ? `<span
                    class="flow-variant-action ${isPromotedVariant(frame) ? "active" : ""}"
                    role="button"
                    tabindex="0"
                    data-promote-variant-frame="${escapeHtml(frame.id)}"
                    title="${isPromotedVariant(frame) ? "This variant is the primary branch" : "Promote this variant as the primary branch"}"
                  >${isPromotedVariant(frame) ? "Primary" : "Use variant"}</span>`
                : ""
            }
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
  const spatialLanes = buildSpatialWorkspaceLanes(state.spatialObjects);
  const historyLaneIsCollapsed = spatialLanes.some(
    (lane) => lane.id === SPATIAL_HISTORY_LANE_ID && lane.collapsed,
  );
  const spatialGroups = state.spatialObjects.filter(
    (object) =>
      object.type === "map-group" && isSpatialObjectVisibleInCurrentMap(object),
  );
  const spatialObjects = state.spatialObjects.filter(
    (object) =>
      object.type !== "map-group" &&
      isSpatialObjectVisibleInCurrentMap(object) &&
      !(historyLaneIsCollapsed && isCheckpointSpatialObject(object)),
  );
  const spatialGroupMarkup = spatialGroups
    .map((object) => renderSpatialObjectNode(object))
    .join("");
  const spatialObjectMarkup = spatialObjects
    .map((object) => renderSpatialObjectNode(object))
    .join("");
  const spatialLaneMarkup = renderSpatialLanesMarkup(spatialLanes);
  const branchDropTargetMarkup = renderBranchDropTargetMarkup();
  dom.flowBoard.innerHTML = `${spatialLaneMarkup}${spatialGroupMarkup}${frameMarkup}${branchDropTargetMarkup}${spatialObjectMarkup}${renderSpatialSelectionBoxMarkup()}${renderFlowLassoMarkup()}`;

  dom.flowSvg.innerHTML = buildFlowSvgMarkup(layout.width, layout.height);
  const defaultStatus =
    state.workspaceMode === "simple"
      ? "Spatial map: arrange frames, variants, references, asset candidates, generated outputs, and branches. Drag or flick background to pan, drag cards/objects into an edge to expand space, Shift-drag empty space to lasso, or pinch/ctrl-wheel to zoom."
      : "Advanced Map: arrange frames plus generated reference cards. Output cards are Make/Build/local preview results, not extra frames; open, pin, edit as frame, or remove stale cards with x. Drag or flick background to pan, pinch/ctrl-wheel to zoom, or pull from a frame dot to connect screens.";
  const searchSuffix = state.mapObjectSearch
    ? ` Search is filtering Map objects for "${state.mapObjectSearch}".`
    : "";
  dom.flowStatus.textContent = state.pendingConnectionFromFrameId
    ? `Linking from ${frameTitleById(state.pendingConnectionFromFrameId)}. Click another card to finish the connection.`
    : `${defaultStatus}${searchSuffix}`;
  renderMapObjectFilterChips();
  renderOutputLaneToggle(spatialLanes);
  renderHistoryLaneToggle(spatialLanes);
  renderMapTimeline(spatialLanes);
  renderMapSelectionActions();
  renderFlowNavigator(layout);
}

function renderSpatialLanesMarkup(lanes) {
  return lanes
    .map((lane) => {
      const guideMarkup =
        lane.id === SPATIAL_OUTPUT_LANE_ID && !lane.collapsed
          ? renderOutputShelfGuideMarkup()
          : "";
      return `
        <section
          class="spatial-lane spatial-lane-${escapeHtml(classToken(lane.kind))} ${lane.collapsed ? "collapsed" : ""}"
          style="left:${lane.position.x}px; top:${lane.position.y}px; width:${lane.size.width}px; height:${lane.size.height}px;"
          aria-hidden="true"
        >
          <div class="spatial-lane-header">
            <span>${escapeHtml(lane.title)}</span>
            <strong>${lane.collapsed ? "Collapsed" : `${lane.memberObjectIds.length} item${lane.memberObjectIds.length === 1 ? "" : "s"}`}</strong>
          </div>
          <p>${escapeHtml(lane.description)}</p>
          ${guideMarkup}
        </section>
      `;
    })
    .join("");
}

function renderOutputShelfGuideMarkup() {
  const guideItems = [
    ["Generated screen", "A Make/Build result attached to a frame."],
    ["Generated file", "A generated spec, HTML, prompt, or asset file."],
    ["Code change", "A workspace file changed by Codex."],
  ];
  return `
    <div class="spatial-lane-guide" aria-hidden="true">
      <strong>Generated references, not extra frames.</strong>
      <span>These cards point to outputs Canvax or Codex created. Clearing a card only cleans the Map; it does not delete the generated file.</span>
      <div class="spatial-lane-guide-grid">
        ${guideItems
          .map(
            ([label, detail]) => `
              <span class="spatial-lane-guide-item">
                <b>${escapeHtml(label)}</b>
                ${escapeHtml(detail)}
              </span>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderMapTimeline(lanes = buildSpatialWorkspaceLanes()) {
  if (!dom.mapTimeline || !dom.mapTimelineTracks || !dom.mapTimelineSummary) {
    return;
  }
  const timeline = buildSpatialTimeline(state.frames, state.spatialObjects, lanes);
  const tracks = timeline.tracks.filter((track) => track.items.length);
  dom.mapTimeline.hidden = state.viewMode !== "flow" || tracks.length === 0;
  if (dom.mapTimeline.hidden) {
    dom.mapTimelineTracks.innerHTML = "";
    dom.mapTimelineSummary.textContent = "No timeline items yet";
    return;
  }
  dom.mapTimelineSummary.textContent =
    `${timeline.summary.frames} frame${timeline.summary.frames === 1 ? "" : "s"} ` +
    `• ${timeline.summary.branches} branch${timeline.summary.branches === 1 ? "" : "es"} ` +
    `• ${timeline.summary.outputs} output${timeline.summary.outputs === 1 ? "" : "s"} ` +
    `• ${timeline.summary.checkpoints} checkpoint${timeline.summary.checkpoints === 1 ? "" : "s"}`;
  dom.mapTimelineTracks.innerHTML = tracks
    .map(
      (track) => `
        <section class="map-timeline-track map-timeline-track-${escapeHtml(classToken(track.kind))}">
          <div class="map-timeline-track-label">
            <span>${escapeHtml(track.title)}</span>
            <strong>${track.items.length}</strong>
          </div>
          <div class="map-timeline-items">
            ${track.items
              .map((item) => renderMapTimelineItem(item))
              .join("")}
          </div>
        </section>
      `,
    )
    .join("");
}

function renderMapTimelineItem(item) {
  const type =
    item.type === "branch" ? "branch" : item.objectId ? "object" : "frame";
  const targetId =
    item.type === "branch"
      ? item.frameId
      : item.objectId || item.frameId || item.id;
  const classes = [
    "map-timeline-item",
    item.active ? "active" : "",
    item.selected ? "selected" : "",
    item.entry ? "entry" : "",
    item.locked ? "locked" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const flags = [
    item.entry ? "Entry" : "",
    item.pinned ? "Pinned" : "",
    item.locked ? "Locked" : "",
    item.selected ? "Selected" : "",
  ].filter(Boolean);
  return `
    <button
      class="${classes}"
      type="button"
      data-map-timeline-type="${escapeHtml(type)}"
      data-map-timeline-id="${escapeHtml(targetId)}"
      title="${escapeHtml(item.description || item.label)}"
    >
      <span>${escapeHtml(item.label)}</span>
      <small>${escapeHtml(flags.join(" • ") || item.status || item.kindLabel || "")}</small>
    </button>
  `;
}

function renderHistoryLaneToggle(lanes = buildSpatialWorkspaceLanes()) {
  if (!dom.toggleHistoryLane) {
    return;
  }
  const historyLane = lanes.find((lane) => lane.id === SPATIAL_HISTORY_LANE_ID);
  dom.toggleHistoryLane.hidden = !historyLane;
  if (!historyLane) {
    return;
  }
  dom.toggleHistoryLane.textContent = state.historyLaneCollapsed
    ? "Show history"
    : "Hide history";
  dom.toggleHistoryLane.setAttribute(
    "aria-pressed",
    String(Boolean(state.historyLaneCollapsed)),
  );
}

function renderOutputLaneToggle(lanes = buildSpatialWorkspaceLanes()) {
  if (!dom.toggleOutputLane) {
    return;
  }
  const outputLane = lanes.find((lane) => lane.id === SPATIAL_OUTPUT_LANE_ID);
  dom.toggleOutputLane.hidden = !outputLane;
  if (!outputLane) {
    return;
  }
  dom.toggleOutputLane.textContent = state.outputLaneCollapsed
    ? "Show outputs"
    : "Hide outputs";
  dom.toggleOutputLane.setAttribute(
    "aria-pressed",
    String(Boolean(state.outputLaneCollapsed)),
  );
}

function renderMapObjectFilterChips() {
  if (
    dom.mapObjectSearch &&
    dom.mapObjectSearch.value !== (state.mapObjectSearch || "")
  ) {
    dom.mapObjectSearch.value = state.mapObjectSearch || "";
  }
  if (!dom.mapObjectFilterChips) {
    return;
  }
  const activeFilter = normalizeMapObjectFilter(state.mapObjectFilter);
  dom.mapObjectFilterChips
    .querySelectorAll("[data-map-object-filter]")
    .forEach((button) => {
      const isActive = button.dataset.mapObjectFilter === activeFilter;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
}

function renderFlowLassoMarkup() {
  if (!state.flowLasso) {
    return "";
  }
  const bounds = flowLassoBounds(state.flowLasso);
  if (!bounds) {
    return "";
  }
  return `
    <div
      class="flow-lasso-overlay"
      style="left:${bounds.left}px; top:${bounds.top}px; width:${bounds.width}px; height:${bounds.height}px;"
      aria-hidden="true"
    >
      <span>Lasso</span>
    </div>
  `;
}

function flowLassoBounds(lasso) {
  if (!lasso?.startPoint || !lasso?.currentPoint) {
    return null;
  }
  return makeBounds(
    Math.min(lasso.startPoint.x, lasso.currentPoint.x),
    Math.min(lasso.startPoint.y, lasso.currentPoint.y),
    Math.max(lasso.startPoint.x, lasso.currentPoint.x),
    Math.max(lasso.startPoint.y, lasso.currentPoint.y),
  );
}

function renderSpatialSelectionBoxMarkup() {
  const bounds = selectedSpatialTransformBounds();
  if (!bounds || state.flowLasso) {
    return "";
  }
  const count = selectedSpatialTransformObjects().length;
  const handles = ["nw", "ne", "se", "sw"];
  return `
    <div
      class="spatial-selection-box ${state.flowDrag?.kind === "spatial-selection-resize" ? "resizing" : ""}"
      style="left:${bounds.left}px; top:${bounds.top}px; width:${bounds.width}px; height:${bounds.height}px;"
      role="group"
      aria-label="${count} selected Map objects"
    >
      <span>${count} selected</span>
      ${handles
        .map(
          (handle) => `
            <button
              class="spatial-selection-handle ${handle}"
              type="button"
              data-spatial-selection-resize="${handle}"
              aria-label="Resize ${count} selected Map objects from ${handle}"
            ></button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderSpatialObjectNode(object) {
  const frameTitle = spatialObjectFrameLabel(object);
  const thumbnail = cleanString(object.meta?.thumbnailDataUrl);
  const sourceLabel = spatialObjectSourceLabel(object);
  const bodyText = spatialObjectBodyText(object, frameTitle);
  const footerStatus = spatialObjectFooterStatus(object);
  const actionMarkup = spatialObjectActionMarkup(object);
  const isSelected = currentSelectedSpatialObjectIds().includes(object.id);
  const isPinned = isSpatialObjectPinned(object);
  const isLocked = isSpatialObjectLocked(object);
  const isOutputReference = isManifestSpatialObject(object);
  const badgeMarkup = [
    isOutputReference
      ? '<span class="spatial-object-reference-badge">Output ref</span>'
      : "",
    isPinned ? '<span class="spatial-object-pin-badge">Pinned</span>' : "",
    isLocked ? '<span class="spatial-object-lock-badge">Locked</span>' : "",
  ]
    .filter(Boolean)
    .join("");
  const normalizedSourceKind = normalizeSpatialSourceKind(object.sourceKind);
  const sourceClass = normalizedSourceKind
    ? `source-${classToken(normalizedSourceKind)}`
    : "";
  return `
    <article
      class="spatial-object-node ${escapeHtml(object.type || "note")} ${escapeHtml(sourceClass)} ${state.flowDrag?.objectId === object.id ? "dragging" : ""} ${isSelected ? "selected" : ""} ${isPinned ? "pinned" : ""} ${isLocked ? "locked" : ""}"
      data-spatial-object-id="${escapeHtml(object.id)}"
      data-spatial-object-source="${escapeHtml(normalizedSourceKind)}"
      style="left:${object.x}px; top:${object.y}px; width:${object.width}px; min-height:${object.height}px;"
      title="${escapeHtml(object.meta?.prompt || object.subtitle || object.title)}"
      role="button"
      tabindex="0"
      aria-selected="${String(isSelected)}"
    >
      <button
        class="spatial-object-remove"
        type="button"
        data-spatial-object-remove="${escapeHtml(object.id)}"
        title="${isLocked ? "Unlock before removing this map object" : "Remove this map object"}"
        aria-label="Remove ${escapeHtml(object.title)}"
        ${isLocked ? "disabled" : ""}
      >
        ×
      </button>
      ${badgeMarkup ? `<div class="spatial-object-badges">${badgeMarkup}</div>` : ""}
      ${
        isLocked
          ? ""
          : `<span
              class="spatial-object-resize"
              data-spatial-object-resize="${escapeHtml(object.id)}"
              title="Resize this map object"
              aria-hidden="true"
            ></span>`
      }
      <div class="spatial-object-header" data-spatial-object-drag="${escapeHtml(object.id)}">
        <span>${escapeHtml(sourceLabel)}</span>
        <strong>${escapeHtml(compactDisplayText(spatialObjectTitle(object), 46))}</strong>
      </div>
      ${thumbnail ? `<img class="spatial-object-thumbnail" src="${escapeHtml(thumbnail)}" alt="" />` : ""}
      <p>${escapeHtml(compactDisplayText(bodyText, 78))}</p>
      <div class="spatial-object-footer">
        <span>${escapeHtml(frameTitle)}</span>
        <span>${escapeHtml(footerStatus)}</span>
      </div>
      ${actionMarkup}
    </article>
  `;
}

function renderBranchDropTargetMarkup() {
  const drag = state.flowDrag;
  if (drag?.kind !== "spatial-selection") {
    return "";
  }
  const sourceFrameId = variantBranchSourceIdForObjectIds(
    (drag.objectOrigins || []).map((origin) => origin.id),
  );
  if (!sourceFrameId) {
    return "";
  }
  const branches = [...variantBranchFramesForSource(sourceFrameId)].sort(
    compareVariantBranchFramesByMapPosition,
  );
  if (branches.length < 2) {
    return "";
  }
  const targets = branches
    .map((frame, index) => {
      const object = spatialObjectById(`variant-object-${frame.id}`);
      if (!object) {
        return null;
      }
      return {
        id: frame.id,
        label: `Branch ${index + 1}`,
        x: Math.max(24, object.x - 18),
        y: object.y - 8,
        height: object.height || SPATIAL_OBJECT_HEIGHT,
      };
    })
    .filter(Boolean);
  const lastFrame = branches.at(-1);
  const lastObject = lastFrame
    ? spatialObjectById(`variant-object-${lastFrame.id}`)
    : null;
  if (lastObject) {
    targets.push({
      id: `${lastFrame.id}-end`,
      label: "End",
      x: lastObject.x + (lastObject.width || SPATIAL_OBJECT_WIDTH) + 18,
      y: lastObject.y - 8,
      height: lastObject.height || SPATIAL_OBJECT_HEIGHT,
    });
  }
  return targets
    .map(
      (target) => `
        <div
          class="branch-drop-target"
          data-branch-drop-target="${escapeHtml(target.id)}"
          style="left:${target.x}px; top:${target.y}px; height:${target.height + 16}px;"
          aria-hidden="true"
        >
          <span>${escapeHtml(target.label)}</span>
        </div>
      `,
    )
    .join("");
}

function spatialObjectActionMarkup(object) {
  if (object?.sourceKind === "checkpoint") {
    return `
      <div class="spatial-object-actions">
        <button
          class="ghost-button compact spatial-object-replay-button"
          type="button"
          data-replay-checkpoint="${escapeHtml(object.sourceId || object.id)}"
          title="Create an editable frame from this checkpoint"
        >Replay as frame</button>
      </div>
    `;
  }

  if (object?.sourceKind === "variant-branch") {
    const frameId = object.frameIds?.[0] || object.sourceId || "";
    if (!frameId || !frameById(frameId)) {
      return "";
    }
    const primary = Boolean(frameById(frameId)?.variant?.primary);
    return `
      <div class="spatial-object-actions">
        <button
          class="flow-variant-action ${primary ? "active" : ""}"
          type="button"
          data-promote-variant-frame="${escapeHtml(frameId)}"
          title="${primary ? "This variant is the primary branch" : "Use this variant as the primary branch"}"
        >${primary ? "Primary" : "Use variant"}</button>
      </div>
    `;
  }

  const href = spatialObjectHref(object);
  if (!href || !isManifestSpatialObject(object)) {
    return "";
  }
  const editableAction = canCreateEditableFrameFromOutputObject(object)
    ? `
        <button
          class="ghost-button compact spatial-object-editable-button"
          type="button"
          data-make-output-editable="${escapeHtml(object.id)}"
          title="Create an editable frame from this generated output"
        >Edit as frame</button>
      `
    : "";
  return `
    <div class="spatial-object-actions">
      <a
        class="ghost-link-button compact spatial-object-open-link"
        href="${escapeHtml(href)}"
        target="_blank"
        rel="noopener noreferrer"
        title="Open the generated output reference"
      >Open output</a>
      ${editableAction}
    </div>
  `;
}

function spatialObjectHref(object) {
  const meta = object?.meta || {};
  const directUrl = cleanString(meta.url);
  if (directUrl) {
    return directUrl;
  }
  const workspacePath = cleanString(meta.previewPath || meta.path);
  return workspacePath ? `/workspace/${workspacePath}` : "";
}

function canCreateEditableFrameFromOutputObject(object) {
  if (!object || !isManifestSpatialObject(object)) {
    return false;
  }
  const sourceKind = normalizeSpatialSourceKind(object.sourceKind);
  if (
    sourceKind !== "generated-target" &&
    object.type !== "generated-output"
  ) {
    return false;
  }
  return Boolean(outputObjectSourceFrame(object));
}

function selectedEditableOutputObject() {
  const selectedObjects = selectedSpatialObjects();
  if (selectedObjects.length !== 1) {
    return null;
  }
  const [object] = selectedObjects;
  return canCreateEditableFrameFromOutputObject(object) ? object : null;
}

function canCreateEditableFrameFromSelectedOutput() {
  return Boolean(selectedEditableOutputObject());
}

function outputObjectSourceFrame(object) {
  const frameId =
    object?.frameIds?.find((id) => Boolean(frameById(id))) ||
    state.activeFrameId ||
    currentFrame()?.id;
  return frameById(frameId) || currentFrame();
}

function outputObjectTargetLabel(object) {
  const meta = object?.meta || {};
  return (
    cleanString(meta.previewPath) ||
    cleanString(meta.path) ||
    cleanString(meta.url) ||
    cleanString(object?.subtitle) ||
    spatialObjectTitle(object)
  );
}

function nextVariantIndexForSource(sourceFrameId) {
  const currentIndexes = state.frames
    .filter((frame) => frame.variant?.sourceFrameId === sourceFrameId)
    .map((frame) => Number(frame.variant?.index) || 0);
  return Math.max(0, ...currentIndexes) + 1;
}

function createEditableFrameFromSelectedOutput(options = {}) {
  const object = selectedEditableOutputObject();
  return createEditableFrameFromOutputObject(object, options);
}

function createEditableFrameFromOutputObjectId(objectId, options = {}) {
  return createEditableFrameFromOutputObject(spatialObjectById(objectId), options);
}

function createEditableFrameFromOutputObject(object, options = {}) {
  const { silent = false, sync = true } = options;
  if (!canCreateEditableFrameFromOutputObject(object)) {
    if (!silent) {
      renderStatus("Select an output preview before making it editable");
    }
    return null;
  }

  const source = outputObjectSourceFrame(object);
  const targetLabel = outputObjectTargetLabel(object);
  const sourceIndex = Math.max(0, state.frames.indexOf(source));
  const createdAt = new Date().toISOString();
  const variantIndex = nextVariantIndexForSource(source.id);
  const recipe = {
    label: "Output edit",
    direction:
      "Use the generated output as the reference target while sketching corrections on this editable frame.",
  };
  const elements = cloneElementsForVariant(source.elements, recipe, variantIndex - 1);
  elements.push({
    id: uid("label"),
    type: "label",
    text: `Output target: ${compactDisplayText(targetLabel, 72)}`,
    x: 56,
    y: 112,
    color: "#2364aa",
    size: 16,
    alpha: 0.92,
    composite: "source-over",
    attachedTo: "",
    anchor: null,
  });

  const frame = createFrame({
    title: `${source.title} · Output edit`,
    viewport: source.viewport,
    objective: [
      source.objective || state.board.goal,
      `Editable output iteration from ${spatialObjectTitle(object)}.`,
      `Generated output target: ${targetLabel}.`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    layout: [
      source.layout,
      `Lineage: editable output branch ${variantIndex} of ${source.title}. Sketch changes here, then use Apply or Build with Codex against the generated target.`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    motion: source.motion,
    assets: [
      source.assets,
      `Output reference: ${targetLabel}.`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    mobile: source.mobile,
    backgroundImage: source.backgroundImage,
    flowPosition: {
      x: source.flowPosition.x + FLOW_CARD_WIDTH + 160,
      y: source.flowPosition.y + variantIndex * (FLOW_CARD_HEIGHT + 42),
    },
    elements,
    outputAnnotations: [],
    thumbnail: source.thumbnail,
    captures: [],
    variant: {
      sourceFrameId: source.id,
      sourceFrameTitle: source.title,
      label: "Output edit",
      direction: recipe.direction,
      index: variantIndex,
      createdAt,
      outputObjectId: object.id,
      outputSourceKind: object.sourceKind || "",
      outputTarget: targetLabel,
      outputHref: spatialObjectHref(object),
    },
  });

  state.frames.splice(sourceIndex + 1, 0, frame);
  state.connections.push(
    normalizeConnection({
      fromFrameId: source.id,
      toFrameId: frame.id,
      label: "output edit",
      notes: `Editable frame created from generated output target: ${targetLabel}.`,
    }),
  );
  createSpatialObjectsForVariantFrames(source, [frame]);
  const variantObject = spatialObjectById(`variant-object-${frame.id}`);
  if (variantObject) {
    variantObject.title = "Output edit branch";
    variantObject.subtitle = `Editable branch from ${spatialObjectTitle(object)}`;
    variantObject.status = "editable output branch";
    variantObject.meta = {
      ...variantObject.meta,
      outputObjectId: object.id,
      outputSourceKind: object.sourceKind || "",
      outputTarget: targetLabel,
      outputHref: spatialObjectHref(object),
    };
  }

  state.activeFrameId = frame.id;
  state.viewMode = "frame";
  state.workbenchFocus = "sketch";
  clearSpatialObjectSelection({ render: false });
  clearElementSelection();
  persistState();
  renderAll();
  if (!silent) {
    renderStatus("Editable output frame created");
    dom.workspaceStatus.textContent =
      "Editable output frame created. Sketch corrections here, then Apply or Build with Codex.";
  }
  scheduleLivePreviewSync();
  if (sync) {
    void saveExportToWorkspace({ silent: true });
    void saveCheckpointToWorkspace("make-output-editable", {
      silent: true,
      note: `Editable output frame created from ${targetLabel}.`,
    });
  }
  return frame;
}

function checkpointHistoryItems() {
  const history = state.serverStatus?.checkpointHistory || { items: [] };
  return Array.isArray(history.items) ? history.items : [];
}

function checkpointHistoryItemByKey(key) {
  const value = cleanString(key);
  const items = checkpointHistoryItems();
  if (!value) {
    return null;
  }
  const byId = items.find((item) => item.id === value);
  if (byId) {
    return byId;
  }
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 ? items[index] || null : null;
}

function workspaceHrefForPath(value) {
  const path = cleanString(value);
  if (!path) {
    return "";
  }
  if (/^(?:data:|blob:|https?:\/\/|\/)/i.test(path)) {
    return path;
  }
  return `/workspace/${path.replace(/^\.?\//, "")}`;
}

function checkpointExportHref(item, checkpoint = null) {
  return (
    workspaceHrefForPath(item?.jsonUrl) ||
    workspaceHrefForPath(item?.jsonPath) ||
    workspaceHrefForPath(checkpoint?.export?.jsonPath) ||
    workspaceHrefForPath(checkpoint?.jsonPath)
  );
}

function checkpointHref(item) {
  return (
    workspaceHrefForPath(item?.checkpointUrl) ||
    workspaceHrefForPath(item?.checkpointPath)
  );
}

async function fetchJsonOrNull(url) {
  const href = workspaceHrefForPath(url);
  if (!href) {
    return null;
  }
  try {
    const response = await fetch(href, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

function checkpointReplaySourceFrame(item, checkpoint, exportPackage) {
  const frames = Array.isArray(exportPackage?.frames) ? exportPackage.frames : [];
  const sourceFrameId =
    cleanString(item?.frameId) ||
    cleanString(checkpoint?.frameId) ||
    cleanString(checkpoint?.activeFrameId) ||
    cleanString(exportPackage?.activeFrameId);
  return (
    frames.find((frame) => frame.id === sourceFrameId) ||
    frames.find((frame) => frame.id === checkpoint?.activeFrameId) ||
    frames[0] ||
    null
  );
}

function checkpointReplaySnapshotHref(sourceFrame) {
  return (
    workspaceHrefForPath(sourceFrame?.snapshotPath) ||
    workspaceHrefForPath(sourceFrame?.thumbnailPath) ||
    workspaceHrefForPath(sourceFrame?.snapshotDataUrl) ||
    workspaceHrefForPath(sourceFrame?.thumbnailDataUrl)
  );
}

function buildCheckpointReplayFrameConfig({
  item,
  checkpoint,
  exportPackage,
  activeFrame,
} = {}) {
  const sourceFrame = checkpointReplaySourceFrame(item, checkpoint, exportPackage);
  if (!item || !sourceFrame || !activeFrame) {
    return null;
  }
  const snapshotHref = checkpointReplaySnapshotHref(sourceFrame);
  if (!snapshotHref) {
    return null;
  }
  const sourceTitle =
    cleanString(sourceFrame.title) ||
    cleanString(item.frameTitle) ||
    cleanString(checkpoint?.activeFrameTitle) ||
    "checkpoint";
  const savedAt = cleanString(item.savedAt || checkpoint?.savedAt);
  const checkpointLabel =
    cleanString(item.label || checkpoint?.label) ||
    checkpointReasonLabel(item.reason || checkpoint?.reason);
  const replayIndex =
    state.frames.filter((frame) => frame.variant?.label === "Checkpoint replay")
      .length + 1;
  const activePosition = activeFrame.flowPosition || defaultFlowPosition(0);
  return {
    sourceFrame,
    snapshotHref,
    frameOptions: {
      title: `${sourceTitle} · Replay ${replayIndex}`,
      viewport: sourceFrame.viewport || activeFrame.viewport,
      objective: [
        cleanString(sourceFrame.objective),
        `Checkpoint replay from ${checkpointLabel}${savedAt ? ` saved ${timeLabel(savedAt)}` : ""}.`,
        "Sketch corrections over this underlay, then use Apply or Build with Codex.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      layout: [
        cleanString(sourceFrame.layout),
        `Replay source: ${checkpointLabel}. This frame is an editable branch, not a destructive restore.`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      motion: cleanString(sourceFrame.motion),
      assets: [
        cleanString(sourceFrame.assets),
        cleanString(item.jsonPath || checkpoint?.export?.jsonPath)
          ? `Source export: ${item.jsonPath || checkpoint?.export?.jsonPath}.`
          : "",
        cleanString(item.checkpointPath || checkpoint?.checkpointPath)
          ? `Source checkpoint: ${item.checkpointPath || checkpoint?.checkpointPath}.`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      mobile: cleanString(sourceFrame.mobile),
      backgroundImage: snapshotHref,
      flowPosition: {
        x: activePosition.x + FLOW_CARD_WIDTH + 160,
        y: activePosition.y + replayIndex * (FLOW_CARD_HEIGHT + 42),
      },
      elements: [
        {
          id: uid("label"),
          type: "label",
          text: `Replay: ${checkpointLabel}`,
          x: 56,
          y: 72,
          color: "#0c8d7b",
          size: 16,
          alpha: 0.94,
          composite: "source-over",
          attachedTo: "",
          anchor: null,
        },
      ],
      captures: [],
      variant: {
        sourceFrameId: activeFrame.id,
        sourceFrameTitle: activeFrame.title,
        label: "Checkpoint replay",
        direction:
          "Checkpoint replay branch. Use the saved snapshot as underlay and sketch the next correction.",
        index: replayIndex,
        createdAt: new Date().toISOString(),
        checkpointId: item.id || "",
        checkpointExport: item.jsonPath || checkpoint?.export?.jsonPath || "",
      },
    },
    connection: {
      fromFrameId: activeFrame.id,
      label: "checkpoint replay",
      notes: `Editable replay branch created from ${checkpointLabel}.`,
    },
  };
}

async function replayCheckpointAsFrame(key, options = {}) {
  const {
    checkpoint: checkpointOverride = null,
    exportPackage: exportPackageOverride = null,
    sync = true,
  } = options;
  const item = checkpointHistoryItemByKey(key);
  if (!item) {
    renderStatus("Checkpoint not found");
    return null;
  }
  const checkpoint =
    checkpointOverride || (await fetchJsonOrNull(checkpointHref(item)));
  const exportPackage =
    exportPackageOverride ||
    (await fetchJsonOrNull(checkpointExportHref(item, checkpoint)));
  const activeFrame = currentFrame();
  const replay = buildCheckpointReplayFrameConfig({
    item,
    checkpoint,
    exportPackage,
    activeFrame,
  });
  if (!replay) {
    renderStatus("Checkpoint replay needs an export snapshot. Save a new checkpoint first.");
    dom.workspaceStatus.textContent =
      "This checkpoint does not include a replayable frame snapshot. Save or push a new checkpoint, then replay it.";
    return null;
  }

  await ensureImage(replay.snapshotHref).catch(() => null);
  const frame = createFrame(replay.frameOptions);
  const sourceIndex = Math.max(0, state.frames.indexOf(activeFrame));
  state.frames.splice(sourceIndex + 1, 0, frame);
  state.connections.push(
    normalizeConnection({
      ...replay.connection,
      toFrameId: frame.id,
    }),
  );
  createSpatialObjectsForVariantFrames(activeFrame, [frame]);
  const variantObject = spatialObjectById(`variant-object-${frame.id}`);
  if (variantObject) {
    variantObject.title = "Checkpoint replay branch";
    variantObject.subtitle = `Editable replay from ${replay.sourceFrame.title}`;
    variantObject.status = "checkpoint replay";
    variantObject.meta = {
      ...variantObject.meta,
      checkpointId: item.id || "",
      checkpointUrl: item.checkpointUrl || "",
      jsonUrl: item.jsonUrl || "",
    };
  }
  state.activeFrameId = frame.id;
  state.viewMode = "frame";
  state.workbenchFocus = "sketch";
  clearSpatialObjectSelection({ render: false });
  clearElementSelection();
  persistState();
  renderAll();
  renderStatus("Checkpoint replay frame created");
  dom.workspaceStatus.textContent =
    "Checkpoint replay frame created. Sketch corrections over the underlay, then Apply or Build with Codex.";
  scheduleLivePreviewSync();
  if (sync) {
    void saveExportToWorkspace({ silent: true });
    void saveCheckpointToWorkspace("checkpoint-replay", {
      silent: true,
      note: `Replay branch created from ${item.label || item.id || "checkpoint"}.`,
    });
  }
  return frame;
}

function renderMapSelectionActions() {
  if (!dom.mapSelectionActions) {
    return;
  }
  const object = state.viewMode === "flow" ? selectedSpatialObject() : null;
  const selectedObjects =
    state.viewMode === "flow" ? selectedSpatialObjects() : [];
  const hasSelection = selectedObjects.length > 0;
  const hasLockedSelection = hasLockedSpatialObjects(selectedObjects);
  const canMutateSelection = canMutateSpatialObjects(selectedObjects);
  const copyText = buildSpatialSelectionContextText(selectedObjects);
  const canMakeEditable = canCreateEditableFrameFromSelectedOutput();
  const branchSelection = selectedVariantBranchFrames();
  const hasBranchSelection = branchSelection.length > 0;
  dom.mapSelectionActions.hidden = !hasSelection;
  dom.mapPropertyEditor.hidden = !hasSelection || selectedObjects.length !== 1;
  dom.mapCopyObjectContext.disabled = !copyText;
  dom.mapMakeEditable.hidden = !canMakeEditable;
  dom.mapMakeEditable.disabled = !canMakeEditable;
  dom.mapPinObject.disabled = !hasSelection;
  dom.mapPinObject.textContent =
    hasSelection && selectedObjects.every(isSpatialObjectPinned) ? "Unpin" : "Pin";
  dom.mapLockObject.disabled = !hasSelection;
  dom.mapLockObject.textContent =
    hasSelection && selectedObjects.every(isSpatialObjectLocked) ? "Unlock" : "Lock";
  dom.mapGroupSelection.disabled = !canCreateSpatialGroupFromSelection();
  const selectedGroups = selectedSpatialGroups();
  dom.mapUngroupSelection.disabled =
    selectedGroups.length === 0 || hasLockedSpatialObjects(selectedGroups);
  dom.mapSelectGroupContents.disabled = selectedGroups.length === 0;
  dom.mapFitGroup.disabled =
    selectedGroups.length === 0 || hasLockedSpatialObjects(selectedGroups);
  dom.mapLaneEarlier.textContent = hasBranchSelection
    ? "Branch earlier"
    : "Lane earlier";
  dom.mapLaneLater.textContent = hasBranchSelection ? "Branch later" : "Lane later";
  dom.mapLaneEarlier.disabled =
    hasLockedSelection ||
    !(hasBranchSelection
      ? canReorderSelectedVariantBranches("earlier")
      : canReorderSelectedSpatialLane("earlier"));
  dom.mapLaneLater.disabled =
    hasLockedSelection ||
    !(hasBranchSelection
      ? canReorderSelectedVariantBranches("later")
      : canReorderSelectedSpatialLane("later"));
  dom.mapSendObjectBack.disabled =
    hasLockedSelection || !canReorderSelectedSpatialObjects("back");
  dom.mapBringObjectFront.disabled =
    hasLockedSelection || !canReorderSelectedSpatialObjects("front");
  dom.mapDuplicateObject.disabled = !canMutateSelection;
  dom.mapDeleteObject.disabled = !canMutateSelection;
  dom.mapClearSelection.disabled = !hasSelection;
  if (!hasSelection || !object) {
    dom.mapSelectedObjectTitle.textContent = "No object selected";
    dom.mapSelectedObjectDetail.textContent = "Click a Map card to edit it.";
    dom.mapObjectTitle.value = "";
    dom.mapObjectSubtitle.value = "";
    dom.mapObjectStatus.value = "";
    dom.mapObjectPrompt.value = "";
    dom.mapObjectCustomProperties.value = "";
    renderVariantStyleEditor(null);
    renderMapDetailEditor(null);
    dom.mapObjectTypeDetails.innerHTML = "";
    dom.mapMakeEditable.hidden = true;
    dom.mapMakeEditable.disabled = true;
    dom.mapPinObject.textContent = "Pin";
    dom.mapLockObject.textContent = "Lock";
    return;
  }

  if (selectedObjects.length > 1) {
    dom.mapSelectedObjectTitle.textContent =
      `${selectedObjects.length} Map objects selected`;
    dom.mapSelectedObjectDetail.textContent =
      hasLockedSelection
        ? "Locked selections can be copied or unlocked, but not moved, resized, reordered, duplicated, grouped, or deleted."
        : "Arrow keys move the selection. Use Lane earlier/later for output/history order, Group, Bring front / Send back, duplicate, delete, clear, or copy combined context.";
    dom.mapObjectTitle.value = "";
    dom.mapObjectSubtitle.value = "";
    dom.mapObjectStatus.value = "";
    dom.mapObjectPrompt.value = "";
    dom.mapObjectCustomProperties.value = "";
    renderVariantStyleEditor(null);
    renderMapDetailEditor(null);
    dom.mapObjectTypeDetails.innerHTML = "";
    dom.mapMakeEditable.hidden = true;
    dom.mapMakeEditable.disabled = true;
    return;
  }

  const frameLabel = spatialObjectFrameLabel(object);
  const details = [
    spatialObjectSourceLabel(object),
    spatialObjectFooterStatus(object),
    frameLabel,
    spatialObjectLayerLabel(object),
    spatialLaneOrderLabel(object),
    isSpatialObjectPinned(object) ? "Pinned" : "",
    isSpatialObjectLocked(object) ? "Locked" : "",
  ];
  if (object.type === "map-group") {
    details.push(spatialGroupMemberSummary(object));
  }

  dom.mapSelectedObjectTitle.textContent = spatialObjectTitle(object);
  dom.mapSelectedObjectDetail.textContent = details.filter(Boolean).join(" • ");
  dom.mapObjectTitle.value = object.title || "";
  dom.mapObjectSubtitle.value = object.subtitle || "";
  dom.mapObjectStatus.value = object.status || "";
  dom.mapObjectPrompt.value = object.meta?.prompt || "";
  dom.mapObjectCustomProperties.value = formatMapCustomProperties(
    object.meta?.customProperties,
  );
  renderVariantStyleEditor(object);
  renderMapDetailEditor(object);
  dom.mapObjectTypeDetails.innerHTML = renderMapObjectTypeDetails(object);
}

function renderMapDetailEditor(object) {
  if (
    !dom.mapDetailEditor ||
    !dom.mapObjectDetailPrimary ||
    !dom.mapObjectDetailSecondary
  ) {
    return;
  }
  const schema = selectedMapObjectDetailSchema(object);
  dom.mapDetailEditor.hidden = !schema;
  if (!schema) {
    dom.mapObjectDetailPrimary.value = "";
    dom.mapObjectDetailSecondary.value = "";
    return;
  }
  dom.mapDetailPrimaryLabel.textContent = schema.primary.label;
  dom.mapObjectDetailPrimary.placeholder = schema.primary.placeholder;
  dom.mapObjectDetailPrimary.value = schema.primary.value || "";
  dom.mapDetailSecondaryLabel.textContent = schema.secondary.label;
  dom.mapObjectDetailSecondary.placeholder = schema.secondary.placeholder;
  dom.mapObjectDetailSecondary.value = schema.secondary.value || "";
}

function renderVariantStyleEditor(object) {
  if (!dom.mapVariantStyleEditor) {
    return;
  }
  const isVariant = object?.sourceKind === "variant-branch";
  dom.mapVariantStyleEditor.hidden = !isVariant;
  const style = isVariant
    ? normalizeVariantStyleProperties(
        object.meta?.variantStyle ||
          frameById(object.frameIds?.[0])?.variant?.styleProperties,
      )
    : {};
  [
    ["palette", dom.mapVariantStylePalette],
    ["typography", dom.mapVariantStyleTypography],
    ["density", dom.mapVariantStyleDensity],
    ["motion", dom.mapVariantStyleMotion],
    ["imagery", dom.mapVariantStyleImagery],
  ].forEach(([key, input]) => {
    if (input) {
      input.value = style[key] || "";
    }
  });
}

function renderMapObjectTypeDetails(object) {
  const rows = mapObjectInspectorRows(object);
  const inspector = buildMapObjectInspectorContract(object);
  if (!rows.length) {
    return "";
  }
  return `
    <div class="map-object-type-details-grid">
      ${rows
        .map(
          (row) => `
            <div class="map-object-type-detail">
              <span>${escapeHtml(row.label)}</span>
              <strong>${escapeHtml(row.value)}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
    ${renderMapObjectInspectorSections(inspector)}
  `;
}

function renderMapObjectInspectorSections(inspector) {
  const sections = Array.isArray(inspector?.sections) ? inspector.sections : [];
  const visibleSections = sections.filter((section) =>
    Array.isArray(section.items) && section.items.length,
  );
  if (!visibleSections.length) {
    return "";
  }
  return `
    <div class="map-object-inspector-sections">
      ${visibleSections
        .map(
          (section) => `
            <section class="map-object-inspector-section">
              <h4>${escapeHtml(section.title)}</h4>
              <dl>
                ${section.items
                  .map(
                    (item) => `
                      <div>
                        <dt>${escapeHtml(item.label)}</dt>
                        <dd>${escapeHtml(compactDisplayText(item.value, 140))}</dd>
                      </div>
                    `,
                  )
                  .join("")}
              </dl>
            </section>
          `,
        )
        .join("")}
    </div>
  `;
}

function mapObjectInspectorRows(object) {
  if (!object) {
    return [];
  }
  const meta = object.meta || {};
  const rows = [
    { label: "Kind", value: spatialObjectSourceLabel(object) },
    { label: "Frame", value: spatialObjectFrameLabel(object) },
    { label: "Pinned", value: isSpatialObjectPinned(object) ? "yes" : "no" },
    { label: "Locked", value: isSpatialObjectLocked(object) ? "yes" : "no" },
  ];
  if (cleanString(meta.prompt)) {
    rows.push({ label: "Prompt", value: cleanString(meta.prompt) });
  }
  const customProperties = normalizeMapCustomProperties(meta.customProperties);
  if (customProperties.length) {
    rows.push({
      label: "Properties",
      value: customProperties
        .slice(0, 3)
        .map((property) => `${property.key}: ${property.value}`)
        .join(" · "),
    });
  }

  if (object.sourceKind === "asset-candidate") {
    const placement = meta.placementMap || {};
    const pixel = placement.pixelBounds || {};
    const slotCount = Array.isArray(meta.outputSlots)
      ? meta.outputSlots.length
      : 0;
    rows.push(
      { label: "Placement", value: placement.placement || meta.placement || object.subtitle },
      {
        label: "Bounds",
        value:
          pixel.width || pixel.height
            ? `${Math.round(pixel.left || 0)}, ${Math.round(pixel.top || 0)} · ${Math.round(pixel.width || 0)} x ${Math.round(pixel.height || 0)}`
            : "whole frame",
      },
      { label: "Slots", value: `${slotCount || 1} output slot${(slotCount || 1) === 1 ? "" : "s"}` },
    );
  } else if (isManifestSpatialObject(object)) {
    const target = meta.previewPath || meta.path || meta.url || "manifest target";
    rows.push(
      { label: "Lane order", value: spatialLaneOrderLabel(object) },
      { label: "Target", value: target },
      {
        label: "Summary",
        value: meta.summary || meta.description || object.subtitle || object.status,
      },
    );
  } else if (object.sourceKind === "checkpoint") {
    rows.push(
      { label: "Lane order", value: spatialLaneOrderLabel(object) },
      { label: "Saved", value: timeLabel(meta.savedAt) || "checkpoint" },
      {
        label: "Contents",
        value: [
          meta.captureCount ? `${meta.captureCount} captures` : "",
          meta.voiceSegmentCount ? `${meta.voiceSegmentCount} voice` : "",
          meta.artifactCount ? `${meta.artifactCount} artifacts` : "",
          meta.changeCount ? `${meta.changeCount} changes` : "",
        ]
          .filter(Boolean)
          .join(", ") || "session state",
      },
    );
  } else if (object.sourceKind === "variant-branch") {
    const style = normalizeVariantStyleProperties(meta.variantStyle);
    rows.push(
      { label: "Recipe", value: meta.recipeId || meta.label || "variant" },
      { label: "Direction", value: meta.direction || object.subtitle || "variant direction" },
      { label: "Thesis", value: meta.thesis || "semantic branch recipe" },
      { label: "Palette", value: style.palette || "recipe default" },
      {
        label: "State",
        value: frameById(object.frameIds?.[0])?.variant?.primary
          ? "primary variant"
          : "editable variant",
      },
    );
  } else if (object.type === "map-group") {
    const hierarchy = currentSpatialGroupHierarchyNode(object);
    if (hierarchy?.pathLabel) {
      rows.push({ label: "Path", value: hierarchy.pathLabel });
    }
    rows.push({
      label: "Contains",
      value: spatialGroupMemberSummary(object, { limit: 6 }),
    });
  } else if (object.sourceKind === "reference-file") {
    rows.push(
      { label: "File", value: meta.fileName || object.title },
      { label: "Type", value: meta.mimeType || object.status || "reference" },
    );
  } else {
    rows.push({
      label: "Context",
      value: meta.text || object.subtitle || object.status || "manual note",
    });
  }

  return rows
    .map((row) => ({
      label: compactDisplayText(row.label, 28),
      value: compactDisplayText(row.value, 96),
    }))
    .filter((row) => row.label && row.value);
}

function buildMapObjectInspectorContract(object, spatialGrouping = null) {
  if (!object) {
    return null;
  }
  const meta = object.meta || {};
  const sourceKind = normalizeSpatialSourceKind(object.sourceKind);
  const frameIds = Array.isArray(object.frameIds) ? object.frameIds : [];
  const placement = meta.placementMap || {};
  const pixel = placement.pixelBounds || {};
  const normalized = placement.normalizedBounds || {};
  const targetPath = cleanString(meta.previewPath || meta.path || meta.url);
  const addItem = (items, label, value) => {
    const text =
      typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : cleanString(value);
    if (text) {
      items.push({ label, value: text });
    }
  };
  const sections = [];
  const identity = [];
  addItem(identity, "Role", mapObjectInspectorRole(object));
  addItem(identity, "Source kind", sourceKind || object.sourceKind || object.type);
  addItem(identity, "Source id", object.sourceId || object.id);
  addItem(identity, "Frame", spatialObjectFrameLabel(object));
  addItem(identity, "Status", object.status || spatialObjectFooterStatus(object));
  sections.push({ id: "identity", title: "Identity", items: identity });

  const layout = [];
  addItem(layout, "Position", `${Math.round(object.x || 0)}, ${Math.round(object.y || 0)}`);
  addItem(layout, "Size", `${Math.round(object.width || SPATIAL_OBJECT_WIDTH)} x ${Math.round(object.height || SPATIAL_OBJECT_HEIGHT)}`);
  addItem(layout, "Layer", spatialObjectLayerLabel(object));
  addItem(layout, "Lane", spatialLaneOrderLabel(object));
  addItem(layout, "Pinned", isSpatialObjectPinned(object) ? "yes" : "no");
  addItem(layout, "Locked", isSpatialObjectLocked(object) ? "yes" : "no");
  sections.push({ id: "layout", title: "Layout", items: layout });

  const customProperties = normalizeMapCustomProperties(meta.customProperties);
  if (customProperties.length) {
    sections.push({
      id: "custom-properties",
      title: "Custom Properties",
      items: customProperties.map((property) => ({
        label: property.key,
        value: property.value,
      })),
    });
  }

  if (isManifestSpatialObject(object)) {
    const target = [];
    addItem(target, "Target", targetPath);
    addItem(
      target,
      "Summary",
      inspectorOverrideValue(
        object,
        "primary",
        meta.summary || meta.description || object.subtitle,
      ),
    );
    addItem(target, "Revision", meta.revision || meta.refinementIteration);
    addItem(
      target,
      "Output binding",
      inspectorOverrideValue(
        object,
        "secondary",
        meta.targetNote || meta.outputObjectId || meta.outputTarget || meta.outputHref,
      ),
    );
    sections.push({ id: "target", title: "Generated Screen", items: target });
  }

  if (object.sourceKind === "asset-candidate" || meta.placementMap) {
    const asset = [];
    addItem(asset, "Slot", placement.slotId || object.sourceId || object.id);
    addItem(
      asset,
      "Placement",
      inspectorOverrideValue(
        object,
        "primary",
        placement.placement || meta.placement || object.subtitle,
      ),
    );
    addItem(asset, "Normalized bounds", Object.keys(normalized).length ? JSON.stringify(normalized) : "");
    addItem(asset, "Pixel bounds", pixel.width || pixel.height ? `${Math.round(pixel.left || 0)}, ${Math.round(pixel.top || 0)} · ${Math.round(pixel.width || 0)} x ${Math.round(pixel.height || 0)}` : "");
    addItem(
      asset,
      "Target selector",
      inspectorOverrideValue(
        object,
        "secondary",
        placement.targetSelector || meta.targetSelector,
      ),
    );
    addItem(asset, "Output slots", Array.isArray(meta.outputSlots) ? `${meta.outputSlots.length || 1}` : "");
    sections.push({ id: "asset", title: "Asset Placement", items: asset });
  }

  if (object.sourceKind === "variant-branch") {
    const variantFrame = frameById(frameIds[0]);
    const variantStyle = normalizeVariantStyleProperties(
      meta.variantStyle || variantFrame?.variant?.styleProperties,
    );
    const variant = [];
    addItem(variant, "Recipe", meta.recipeId || variantFrame?.variant?.recipeId);
    addItem(
      variant,
      "Direction",
      inspectorOverrideValue(object, "primary", meta.direction || object.subtitle),
    );
    addItem(variant, "Thesis", meta.thesis || variantFrame?.variant?.thesis);
    addItem(
      variant,
      "Design moves",
      Array.isArray(meta.designMoves)
        ? meta.designMoves.join("; ")
        : Array.isArray(variantFrame?.variant?.designMoves)
          ? variantFrame.variant.designMoves.join("; ")
          : "",
    );
    addItem(variant, "Prompt", meta.prompt || variantFrame?.variant?.prompt);
    addItem(variant, "State", variantFrame?.variant?.primary ? "primary variant" : "editable variant");
    addItem(variant, "Source frame", variantFrame?.variant?.sourceFrameTitle || frameTitleById(variantFrame?.variant?.sourceFrameId));
    addItem(
      variant,
      "Output target",
      inspectorOverrideValue(
        object,
        "secondary",
        meta.promotionRule || meta.outputTarget || meta.outputHref,
      ),
    );
    sections.push({ id: "variant", title: "Variant Branch", items: variant });

    const style = [];
    variantStylePropertyKeys.forEach((key) => {
      addItem(style, key[0].toUpperCase() + key.slice(1), variantStyle[key]);
    });
    sections.push({ id: "variant-style", title: "Variant Style", items: style });
  }

  if (object.sourceKind === "checkpoint") {
    const checkpoint = [];
    addItem(
      checkpoint,
      "Checkpoint note",
      inspectorOverrideValue(object, "primary", meta.summary || object.subtitle),
    );
    addItem(
      checkpoint,
      "Resume note",
      inspectorOverrideValue(object, "secondary", meta.resumeNote),
    );
    addItem(checkpoint, "Saved", timeLabel(meta.savedAt) || meta.savedAt);
    addItem(checkpoint, "Captures", meta.captureCount);
    addItem(checkpoint, "Voice", meta.voiceSegmentCount);
    addItem(checkpoint, "Artifacts", meta.artifactCount);
    addItem(checkpoint, "Changes", meta.changeCount);
    sections.push({ id: "checkpoint", title: "Checkpoint", items: checkpoint });
  }

  if (object.type === "map-group") {
    const groupMembers = spatialGroupMemberDetails(object);
    const hierarchy =
      spatialGroupHierarchyNodeForObject(object, spatialGrouping) ||
      currentSpatialGroupHierarchyNode(object);
    const group = [];
    addItem(
      group,
      "Group intent",
      inspectorOverrideValue(object, "primary", meta.text || object.subtitle),
    );
    addItem(
      group,
      "Contents rule",
      inspectorOverrideValue(object, "secondary", meta.contentsNote),
    );
    addItem(group, "Contains", spatialGroupMemberSummary(object, { limit: 12 }));
    addItem(group, "Path", hierarchy?.pathLabel);
    addItem(group, "Parent groups", hierarchy?.parentLabels?.join(", "));
    addItem(group, "Child groups", hierarchy?.childLabels?.join(", "));
    addItem(group, "Frames", groupMembers.frames.map((frame) => frame.title).join(", "));
    addItem(group, "Objects", groupMembers.objects.map((entry) => entry.title).join(", "));
    addItem(group, "Nested groups", groupMembers.groups.map((entry) => entry.title).join(", "));
    sections.push({ id: "group", title: "Group Contents", items: group });
  }

  if (object.sourceKind === "reference-file") {
    const reference = [];
    addItem(
      reference,
      "Reference role",
      inspectorOverrideValue(object, "primary", meta.referenceRole || object.subtitle),
    );
    addItem(
      reference,
      "Usage rule",
      inspectorOverrideValue(object, "secondary", meta.usageRule),
    );
    addItem(reference, "File", meta.fileName || object.title);
    addItem(reference, "Type", meta.mimeType || object.status);
    addItem(reference, "Path", meta.path || meta.url);
    sections.push({ id: "reference", title: "Reference", items: reference });
  }

  const manual = [];
  addItem(
    manual,
    "Note",
    inspectorOverrideValue(object, "primary", meta.text || object.subtitle),
  );
  addItem(
    manual,
    "Codex action",
    inspectorOverrideValue(object, "secondary", meta.codexAction),
  );
  addItem(manual, "Prompt", meta.prompt);
  addItem(
    manual,
    "Custom properties",
    customProperties
      .map((property) => `${property.key}: ${property.value}`)
      .join("; "),
  );
  addItem(manual, "Manual fields", Object.keys(meta.manualFields || {}).join(", "));
  sections.push({ id: "manual", title: "Designer Notes", items: manual });

  return {
    kind: "canvax-map-object-inspector",
    schemaVersion: 1,
    objectId: object.id,
    objectType: object.type,
    sourceKind: sourceKind || object.sourceKind || "",
    frameIds,
    sections: sections.filter((section) => section.items.length),
  };
}

function mapObjectInspectorRole(object) {
  if (!object) {
    return "";
  }
  if (object.type === "map-group") {
    return "Exploration/reference group";
  }
  if (object.sourceKind === "asset-candidate") {
    return "Prompt-ready image or asset slot";
  }
  if (isManifestSpatialObject(object)) {
    return "Generated implementation/output reference";
  }
  if (object.sourceKind === "checkpoint") {
    return "Saved collaboration checkpoint";
  }
  if (object.sourceKind === "variant-branch") {
    return "Editable generated variant branch";
  }
  if (object.sourceKind === "reference-file") {
    return "Reference file or image";
  }
  return "Manual spatial note";
}

function selectedMapObjectDetailSchema(object) {
  if (!object) {
    return null;
  }
  const meta = object.meta || {};
  const overrides = meta.inspectorOverrides || {};
  const placement = meta.placementMap || {};
  const sourceKind = normalizeSpatialSourceKind(object.sourceKind);
  const buildSchema = (primary, secondary) => ({
    primary: {
      label: primary.label,
      placeholder: primary.placeholder || "",
      value: cleanString(overrides.primary) || cleanString(primary.value),
    },
    secondary: {
      label: secondary.label,
      placeholder: secondary.placeholder || "",
      value: cleanString(overrides.secondary) || cleanString(secondary.value),
    },
  });

  if (object.type === "map-group") {
    return buildSchema(
      {
        label: "Group intent",
        value: meta.text || object.subtitle,
        placeholder: "What exploration, board, or cluster does this group mean?",
      },
      {
        label: "Contents rule",
        value: meta.contentsNote,
        placeholder: "How should Codex treat objects inside this group?",
      },
    );
  }

  if (object.sourceKind === "asset-candidate" || meta.placementMap) {
    return buildSchema(
      {
        label: "Placement intent",
        value: placement.placement || meta.placement || object.subtitle,
        placeholder: "Hero image, book spread background, product shot, etc.",
      },
      {
        label: "Target selector",
        value: placement.targetSelector || meta.targetSelector,
        placeholder: "Optional CSS/data selector for the generated asset slot",
      },
    );
  }

  if (sourceKind === "generated-target" || sourceKind === "generated-artifact") {
    return buildSchema(
      {
        label: "Output summary",
        value: meta.summary || meta.description || object.subtitle,
        placeholder: "What is this generated output for?",
      },
      {
        label: "Revision instruction",
        value: meta.targetNote || meta.outputTarget || meta.outputHref,
        placeholder: "How should Codex revise or use this generated output?",
      },
    );
  }

  if (sourceKind === "workspace-change") {
    return buildSchema(
      {
        label: "Change summary",
        value: meta.summary || object.subtitle,
        placeholder: "What changed in this file?",
      },
      {
        label: "Review note",
        value: meta.reviewNote,
        placeholder: "What should Codex verify about this change?",
      },
    );
  }

  if (object.sourceKind === "variant-branch") {
    return buildSchema(
      {
        label: "Variant direction",
        value: meta.direction || object.subtitle,
        placeholder: "What visual/product direction does this branch explore?",
      },
      {
        label: "Promotion rule",
        value: meta.promotionRule || meta.outputTarget,
        placeholder: "When should this variant become primary?",
      },
    );
  }

  if (object.sourceKind === "checkpoint") {
    return buildSchema(
      {
        label: "Checkpoint note",
        value: meta.summary || object.subtitle,
        placeholder: "Why is this saved moment important?",
      },
      {
        label: "Resume from here",
        value: meta.resumeNote,
        placeholder: "What should Codex do if work resumes from this checkpoint?",
      },
    );
  }

  if (object.sourceKind === "reference-file") {
    return buildSchema(
      {
        label: "Reference role",
        value: meta.referenceRole || object.subtitle,
        placeholder: "Mood, layout reference, character sheet, brand sample...",
      },
      {
        label: "Usage rule",
        value: meta.usageRule,
        placeholder: "How should Codex or image generation use this reference?",
      },
    );
  }

  return buildSchema(
    {
      label: "Object note",
      value: meta.text || object.subtitle,
      placeholder: "What should this note mean on the Map?",
    },
    {
      label: "Codex action",
      value: meta.codexAction,
      placeholder: "What should Codex do with this object?",
    },
  );
}

function inspectorOverrideValue(object, key, fallback = "") {
  return cleanString(object?.meta?.inspectorOverrides?.[key]) || cleanString(fallback);
}

function normalizeMapCustomProperties(properties) {
  if (!Array.isArray(properties)) {
    return [];
  }
  const seen = new Set();
  return properties
    .map((property, index) => {
      const key = cleanString(property?.key || property?.name);
      const value = cleanString(property?.value);
      const safeKey = key || (value ? `note-${index + 1}` : "");
      if (!safeKey || !value) {
        return null;
      }
      const normalizedKey = safeKey.toLowerCase();
      if (seen.has(normalizedKey)) {
        return null;
      }
      seen.add(normalizedKey);
      return { key: safeKey, value };
    })
    .filter(Boolean);
}

function parseMapCustomProperties(text) {
  return normalizeMapCustomProperties(
    cleanString(text)
      .split(/\n+/)
      .map((line, index) => {
        const trimmed = cleanString(line);
        if (!trimmed) {
          return null;
        }
        const separatorCandidates = [
          trimmed.indexOf(":"),
          trimmed.indexOf("="),
        ].filter((entry) => entry >= 0);
        const separatorIndex = separatorCandidates.length
          ? Math.min(...separatorCandidates)
          : -1;
        if (separatorIndex > 0) {
          return {
            key: trimmed.slice(0, separatorIndex),
            value: trimmed.slice(separatorIndex + 1),
          };
        }
        return {
          key: `note-${index + 1}`,
          value: trimmed,
        };
      })
      .filter(Boolean),
  );
}

function formatMapCustomProperties(properties) {
  return normalizeMapCustomProperties(properties)
    .map((property) => `${property.key}: ${property.value}`)
    .join("\n");
}

function updateSelectedSpatialObjectCustomProperties(value) {
  const selectedObjects = selectedSpatialObjects();
  const object = selectedObjects.length === 1 ? selectedObjects[0] : null;
  if (!object) {
    return false;
  }
  const properties = parseMapCustomProperties(value);
  object.meta = {
    ...(object.meta || {}),
    manualFields: {
      ...(object.meta?.manualFields || {}),
    },
  };
  if (properties.length) {
    object.meta.customProperties = properties;
    object.meta.manualFields.customProperties = true;
  } else {
    delete object.meta.customProperties;
    delete object.meta.manualFields.customProperties;
  }
  if (!Object.keys(object.meta.manualFields).length) {
    delete object.meta.manualFields;
  }
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  renderStatus(`Updated custom properties for ${spatialObjectTitle(object)}`);
  return true;
}

function updateSelectedVariantStyleProperty(field, value) {
  if (!variantStylePropertyKeys.includes(field)) {
    return false;
  }
  const selectedObjects = selectedSpatialObjects();
  const object = selectedObjects.length === 1 ? selectedObjects[0] : null;
  if (!object || object.sourceKind !== "variant-branch") {
    return false;
  }
  const nextStyle = normalizeVariantStyleProperties({
    ...(object.meta?.variantStyle || {}),
    [field]: value,
  });
  object.meta = {
    ...(object.meta || {}),
    variantStyle: nextStyle,
    variantStyleManual: true,
    manualFields: {
      ...(object.meta?.manualFields || {}),
      variantStyle: true,
    },
  };
  const frame = frameById(object.frameIds?.[0] || object.sourceId);
  if (frame?.variant) {
    frame.variant = {
      ...frame.variant,
      styleProperties: nextStyle,
    };
  }
  state.viewMode = "flow";
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  void saveExportToWorkspace({ silent: true });
  renderStatus(`Updated variant ${field} style`);
  return true;
}

function updateSelectedSpatialObjectDetail(key, value) {
  if (!["primary", "secondary"].includes(key)) {
    return false;
  }
  const selectedObjects = selectedSpatialObjects();
  const object = selectedObjects.length === 1 ? selectedObjects[0] : null;
  if (!object || !selectedMapObjectDetailSchema(object)) {
    return false;
  }
  object.meta = {
    ...(object.meta || {}),
    inspectorOverrides: {
      ...(object.meta?.inspectorOverrides || {}),
      [key]: cleanString(value),
    },
    manualFields: {
      ...(object.meta?.manualFields || {}),
      inspectorOverrides: true,
    },
  };
  persistState();
  renderFlowBoard();
  renderSpec();
  void saveExportToWorkspace({ silent: true });
  renderStatus(`Updated ${key === "primary" ? "primary" : "secondary"} Map detail`);
  return true;
}

function updateSelectedSpatialObjectProperty(field, value) {
  if (!["title", "subtitle", "status", "prompt"].includes(field)) {
    return false;
  }
  const selectedObjects = selectedSpatialObjects();
  const object = selectedObjects.length === 1 ? selectedObjects[0] : null;
  if (!object) {
    return false;
  }

  const nextValue = cleanString(value);
  const nextMeta = {
    ...(object.meta || {}),
    manualFields: {
      ...(object.meta?.manualFields || {}),
    },
  };
  if (field === "prompt") {
    if (nextValue) {
      nextMeta.prompt = nextValue;
      nextMeta.manualFields.prompt = true;
    } else {
      delete nextMeta.prompt;
      delete nextMeta.manualFields.prompt;
    }
  } else {
    object[field] = nextValue;
    nextMeta.manualFields[field] = true;
  }
  if (!Object.keys(nextMeta.manualFields).length) {
    delete nextMeta.manualFields;
  }
  object.meta = nextMeta;
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  renderStatus(
    `Updated ${field === "prompt" ? "prompt/context" : field} for ${spatialObjectTitle(object)}`,
  );
  return true;
}

function toggleSelectedSpatialObjectPin() {
  const selectedObjects = selectedSpatialObjects();
  if (!selectedObjects.length) {
    return false;
  }
  const shouldPin = !selectedObjects.every(isSpatialObjectPinned);
  selectedObjects.forEach((object) => {
    object.meta = { ...(object.meta || {}) };
    if (shouldPin) {
      object.meta.pinned = true;
    } else {
      delete object.meta.pinned;
    }
  });
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  renderStatus(
    shouldPin
      ? `Pinned ${selectedObjects.length} Map object${selectedObjects.length === 1 ? "" : "s"}`
      : `Unpinned ${selectedObjects.length} Map object${selectedObjects.length === 1 ? "" : "s"}`,
  );
  return true;
}

function toggleSelectedSpatialObjectLock() {
  const selectedObjects = selectedSpatialObjects();
  if (!selectedObjects.length) {
    return false;
  }
  const shouldLock = !selectedObjects.every(isSpatialObjectLocked);
  selectedObjects.forEach((object) => {
    object.meta = { ...(object.meta || {}) };
    if (shouldLock) {
      object.meta.locked = true;
    } else {
      delete object.meta.locked;
    }
  });
  persistState();
  renderFlowBoard();
  renderSpec();
  scheduleLivePreviewSync();
  renderStatus(
    shouldLock
      ? `Locked ${selectedObjects.length} Map object${selectedObjects.length === 1 ? "" : "s"}`
      : `Unlocked ${selectedObjects.length} Map object${selectedObjects.length === 1 ? "" : "s"}`,
  );
  return true;
}

function spatialObjectFrameLabel(object) {
  if (object.frameIds?.length === 1) {
    const frame = frameById(object.frameIds[0]);
    if (frame?.title) {
      return frame.title;
    }
    return isManifestSpatialObject(object)
      ? "Unmatched output"
      : "Unknown frame";
  }
  if (object.frameIds?.length) {
    return `${object.frameIds.length} frames`;
  }
  return isManifestSpatialObject(object) ? "Global output" : "Board object";
}

function spatialObjectTitle(object) {
  const sourceKind = normalizeSpatialSourceKind(object?.sourceKind);
  if (sourceKind === "generated-target") {
    const frameTitle = spatialObjectFrameLabel(object);
    const rawTitle = cleanString(object?.title);
    if (
      rawTitle &&
      !/materialized|generated-target/i.test(rawTitle)
    ) {
      return rawTitle;
    }
    if (
      frameTitle &&
      !["Board object", "Global output", "Unmatched output"].includes(
        frameTitle,
      )
    ) {
      return `Generated screen for ${frameTitle}`;
    }
    return "Generated screen";
  }
  if (sourceKind === "generated-artifact") {
    return object.title || object.meta?.path || "Generated file";
  }
  if (sourceKind === "workspace-change") {
    return object.title || object.meta?.path || "Changed file";
  }
  if (sourceKind === "checkpoint") {
    return object.title || "Saved checkpoint";
  }
  if (sourceKind === "variant-branch") {
    return object.title || "Variant branch";
  }
  return object?.title || "Map object";
}

function spatialObjectSourceLabel(object) {
  switch (normalizeSpatialSourceKind(object?.sourceKind)) {
    case "generated-target":
      return "Generated screen";
    case "generated-artifact":
      return "Generated file";
    case "workspace-change":
      return "Code change";
    case "checkpoint":
      return "Checkpoint";
    case "asset-candidate":
      return "Image slot";
    case "variant-branch":
      return "Design variant";
    case "spatial-group":
      return "Group";
    default:
      return humanizeStatus(object?.sourceKind || object?.type || "object");
  }
}

function spatialObjectBodyText(object, frameTitle = "") {
  const sourceKind = normalizeSpatialSourceKind(object?.sourceKind);
  if (sourceKind === "generated-target") {
    return object.meta?.summary
      ? object.meta.summary
      : frameTitle &&
          !["Board object", "Global output", "Unmatched output"].includes(
            frameTitle,
          )
        ? `Generated result for ${frameTitle}. This is a reference card, not another frame; open it, edit as frame, pin it, or clear it when stale.`
        : "Generated screen from Make, local preview, Build, or Codex output. This is a reference card, not another frame; open it, edit it as a frame, pin it, or clear it when stale.";
  }

  if (sourceKind === "generated-artifact") {
    return (
      object.meta?.description ||
      object.meta?.path ||
      object.subtitle ||
      "Generated file from the Codex output manifest. Use it as reference or open it from the output shelf."
    );
  }

  if (sourceKind === "workspace-change") {
    return (
      object.meta?.summary ||
      object.subtitle ||
      "Workspace file change linked to the current output shelf."
    );
  }

  if (sourceKind === "asset-candidate") {
    const placement = object.meta?.placementMap || {};
    const pixelBounds = placement.pixelBounds || {};
    const slotCount = Array.isArray(object.meta?.outputSlots)
      ? object.meta.outputSlots.length
      : 0;
    return [
      object.meta?.placement || object.subtitle || "Prompt-ready image slot",
      placement.surface
        ? `${placement.surface} placement, ${Math.round(pixelBounds.width || 0)} x ${Math.round(pixelBounds.height || 0)} px`
        : "",
      slotCount ? `${slotCount} output slot${slotCount === 1 ? "" : "s"}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (sourceKind === "variant-branch") {
    return (
      object.meta?.direction ||
      object.subtitle ||
      "Editable generated direction. Move, resize, group, copy context, or use it as the primary branch."
    );
  }

  if (sourceKind === "checkpoint") {
    const details = [
      object.meta?.captureCount
        ? `${object.meta.captureCount} capture${object.meta.captureCount === 1 ? "" : "s"}`
        : "",
      object.meta?.voiceSegmentCount
        ? `${object.meta.voiceSegmentCount} voice`
        : "",
      object.meta?.artifactCount
        ? `${object.meta.artifactCount} artifact${object.meta.artifactCount === 1 ? "" : "s"}`
        : "",
      object.meta?.changeCount
        ? `${object.meta.changeCount} change${object.meta.changeCount === 1 ? "" : "s"}`
        : "",
    ].filter(Boolean);
    return details.length
      ? `${timeLabel(object.meta?.savedAt)} checkpoint with ${details.join(", ")}`
      : `${timeLabel(object.meta?.savedAt)} checkpoint`;
  }

  return object.subtitle || object.status || "Spatial object";
}

function spatialObjectFooterStatus(object) {
  const sourceKind = normalizeSpatialSourceKind(object?.sourceKind);
  if (sourceKind === "generated-target") {
    return object.status === "materialized-preview"
      ? "local generated screen"
      : "generated screen";
  }
  if (sourceKind === "generated-artifact") {
    return "output file";
  }
  if (sourceKind === "workspace-change") {
    return "workspace change";
  }
  if (sourceKind === "variant-branch") {
    const branchLabel = spatialBranchOrderLabel(object);
    const status = frameById(object.frameIds?.[0])?.variant?.primary
      ? "primary variant"
      : "editable variant";
    return branchLabel ? `${branchLabel} · ${status}` : status;
  }
  if (sourceKind === "checkpoint") {
    return checkpointReasonLabel(object.status);
  }
  return humanizeStatus(object.status || "ready");
}

function humanizeStatus(value) {
  return (
    cleanString(value)
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "object"
  );
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
  renderElementPrototypeControls();
}

function renderElementPrototypeControls() {
  const frame = currentFrame();
  const element = currentSelectedElement(frame);
  const selectableFrames = state.frames.filter(
    (candidate) => candidate.id !== frame.id,
  );
  const canEdit =
    state.viewMode === "frame" &&
    Boolean(element) &&
    selectableFrames.length > 0;
  const prototype = normalizeElementPrototype(element?.prototype);
  const currentTarget =
    prototype?.toFrameId &&
    state.frames.some((item) => item.id === prototype.toFrameId)
      ? prototype.toFrameId
      : "";

  if (
    !dom.elementPrototypeTarget ||
    !dom.elementPrototypeLabel ||
    !dom.clearElementPrototype
  ) {
    return;
  }

  dom.elementPrototypeTarget.disabled = !canEdit;
  dom.elementPrototypeLabel.disabled = !canEdit || !currentTarget;
  dom.clearElementPrototype.disabled = !element || !prototype;
  dom.elementPrototypeTarget.innerHTML = [
    `<option value="">${element ? "No element hotspot" : "Select one element"}</option>`,
    ...selectableFrames.map((candidate) => {
      const selected = candidate.id === currentTarget ? "selected" : "";
      return `<option value="${escapeHtml(candidate.id)}" ${selected}>${escapeHtml(candidate.title || candidate.id)}</option>`;
    }),
  ].join("");
  dom.elementPrototypeLabel.value = prototype?.label || "";
  dom.elementPrototypeLabel.placeholder = element
    ? "tap CTA, open details, next..."
    : "Select an element first";
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

function computeFlowSurfaceSize(frames = state.frames) {
  const zoom = Number.isFinite(state.flowZoom) ? state.flowZoom : 1;
  const viewportWidth = dom.flowShell?.clientWidth
    ? Math.ceil(dom.flowShell.clientWidth / zoom) + FLOW_SURFACE_PADDING * 2
    : 1200;
  const viewportHeight = dom.flowShell?.clientHeight
    ? Math.ceil(dom.flowShell.clientHeight / zoom) + FLOW_SURFACE_PADDING * 2
    : 820;
  const frameBounds = frames.reduce(
    (accumulator, frame, index) => {
      const position = flowPositionForFrame(frame, index);
      return {
        width: Math.max(
          accumulator.width,
          position.x +
            FLOW_CARD_WIDTH +
            FLOW_SURFACE_PADDING +
            FLOW_TRAILING_SPACE,
        ),
        height: Math.max(
          accumulator.height,
          position.y +
            FLOW_CARD_HEIGHT +
            FLOW_SURFACE_PADDING +
            FLOW_TRAILING_SPACE,
        ),
      };
    },
    {
      width: Math.max(1200, viewportWidth),
      height: Math.max(820, viewportHeight),
    },
  );

  return state.spatialObjects.filter(isSpatialObjectVisibleInCurrentMap).reduce(
    (accumulator, object) => ({
      width: Math.max(
        accumulator.width,
        object.x +
          object.width +
          FLOW_SURFACE_PADDING +
          FLOW_TRAILING_SPACE,
      ),
      height: Math.max(
        accumulator.height,
        object.y +
          object.height +
          FLOW_SURFACE_PADDING +
          FLOW_TRAILING_SPACE,
      ),
    }),
    frameBounds,
  );
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
  drawPrototypeBadges(ctx, frame, scale);

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

  if (element.type === "image") {
    drawImageElement(ctx, element, scale);
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

function drawPrototypeBadges(ctx, frame, scale = 1) {
  const linkedElements = (frame.elements || []).filter(
    (element) => normalizeElementPrototype(element.prototype) && !isEraserElement(element),
  );
  if (!linkedElements.length) {
    return;
  }

  ctx.save();
  linkedElements.forEach((element) => {
    const bounds = getElementBounds(element, frame);
    const prototype = normalizeElementPrototype(element.prototype);
    if (!bounds || !prototype) {
      return;
    }
    const label = prototype.label || "link";
    const x = Math.max(8, bounds.right * scale - 70 * scale);
    const y = Math.max(8, bounds.top * scale - 18 * scale);
    const width = Math.max(54, Math.min(120, label.length * 7 + 22)) * scale;
    const height = 24 * scale;
    ctx.fillStyle = "rgba(255, 93, 58, 0.94)";
    roundRect(ctx, x, y, width, height, 999);
    ctx.fill();
    ctx.fillStyle = "#fff8f0";
    ctx.font = `800 ${Math.max(10, 11 * scale)}px "Avenir Next", sans-serif`;
    ctx.fillText("LINK", x + 10 * scale, y + 16 * scale);
  });
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

function drawImageElement(ctx, element, scale = 1) {
  const left = Math.min(element.start.x, element.end.x) * scale;
  const top = Math.min(element.start.y, element.end.y) * scale;
  const width = Math.abs(element.end.x - element.start.x) * scale;
  const height = Math.abs(element.end.y - element.start.y) * scale;
  if (width < 2 || height < 2) {
    return;
  }

  const image = getCachedImage(element.imageDataUrl || element.src || "");
  ctx.save();
  roundRect(ctx, left, top, width, height, 18 * scale);
  ctx.clip();
  if (image) {
    ctx.translate(left, top);
    drawCoverImage(ctx, image, width, height);
  } else {
    ctx.fillStyle = "rgba(255, 250, 244, 0.86)";
    ctx.fillRect(left, top, width, height);
    ctx.strokeStyle = element.color || palette[0];
    ctx.setLineDash([8 * scale, 8 * scale]);
    ctx.strokeRect(left, top, width, height);
    ctx.fillStyle = element.color || palette[0];
    ctx.font = `600 ${Math.max(13, 16 * scale)}px "Avenir Next", sans-serif`;
    ctx.fillText("Image asset", left + 14 * scale, top + 28 * scale);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = element.color || "rgba(24, 17, 14, 0.32)";
  ctx.lineWidth = Math.max(1, (element.size || 2) * scale);
  ctx.strokeRect(left, top, width, height);
  ctx.restore();
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
    element.type === "ellipse" ||
    element.type === "image"
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
  const removeSpatialButton = event.target.closest(
    "[data-spatial-object-remove]",
  );
  if (removeSpatialButton) {
    event.preventDefault();
    event.stopPropagation();
    removeSpatialObject(removeSpatialButton.dataset.spatialObjectRemove);
    return;
  }

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

  const promoteVariantHandle = event.target.closest(
    "[data-promote-variant-frame]",
  );
  if (promoteVariantHandle) {
    event.preventDefault();
    event.stopPropagation();
    promoteVariantFrameFromMap(promoteVariantHandle.dataset.promoteVariantFrame);
    return;
  }

  const makeOutputEditableHandle = event.target.closest(
    "[data-make-output-editable]",
  );
  if (makeOutputEditableHandle) {
    event.preventDefault();
    event.stopPropagation();
    createEditableFrameFromOutputObjectId(
      makeOutputEditableHandle.dataset.makeOutputEditable,
    );
    return;
  }

  const replayCheckpointHandle = event.target.closest(
    "[data-replay-checkpoint]",
  );
  if (replayCheckpointHandle) {
    event.preventDefault();
    event.stopPropagation();
    void replayCheckpointAsFrame(replayCheckpointHandle.dataset.replayCheckpoint);
    return;
  }

  const spatialObjectNode = event.target.closest("[data-spatial-object-id]");
  if (spatialObjectNode) {
    const object = spatialObjectById(spatialObjectNode.dataset.spatialObjectId);
    if (state.flowDrag?.objectId === object?.id && state.flowDrag.didMove) {
      return;
    }
    selectSpatialObject(object?.id, {
      render: false,
      additive: event.shiftKey,
    });
    const frameId = object?.frameIds?.[0];
    if (frameId && frameById(frameId)) {
      state.activeFrameId = frameId;
      clearElementSelection();
      renderAll();
      renderStatus(`Selected spatial object for ${frameTitleById(frameId)}`);
    } else if (object) {
      renderFlowInspector();
      renderFlowBoard();
      renderSpec();
      renderStatus(`Selected ${object.title} on the spatial map`);
    }
    return;
  }

  const node = event.target.closest("[data-flow-frame-id]");
  if (!node) {
    clearSpatialObjectSelection({ render: true });
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
  clearSpatialObjectSelection();
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

  const selectionResizeHandle = event.target.closest(
    "[data-spatial-selection-resize]",
  );
  if (selectionResizeHandle) {
    event.preventDefault();
    event.stopPropagation();
    const bounds = selectedSpatialTransformBounds();
    const objects = selectedSpatialTransformObjects();
    if (!bounds || objects.length < 2) {
      return;
    }
    if (hasLockedSpatialObjects(objects)) {
      renderLockedSpatialObjectStatus("resize them");
      return;
    }
    state.flowDrag = {
      kind: "spatial-selection-resize",
      pointerId: event.pointerId,
      handle: selectionResizeHandle.dataset.spatialSelectionResize,
      startX: event.clientX,
      startY: event.clientY,
      originBounds: bounds,
      objectOrigins: objects.map((object) => ({
        id: object.id,
        x: object.x,
        y: object.y,
        width: object.width || SPATIAL_OBJECT_WIDTH,
        height: object.height || SPATIAL_OBJECT_HEIGHT,
        memberOrigins:
          object.type === "map-group"
            ? buildSpatialGroupDragMemberOrigins(object)
            : null,
      })),
      didMove: false,
    };
    renderFlowBoard();
    return;
  }

  const objectResizeHandle = event.target.closest(
    "[data-spatial-object-resize]",
  );
  if (objectResizeHandle) {
    event.preventDefault();
    const objectId = objectResizeHandle.dataset.spatialObjectResize;
    const object = spatialObjectById(objectId);
    if (!object) {
      return;
    }
    if (isSpatialObjectLocked(object)) {
      renderStatus(`Unlock ${object.title} before resizing it`);
      return;
    }
    selectSpatialObject(objectId, { render: false });
    state.flowDrag = {
      kind: "spatial-object-resize",
      objectId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: object.x,
      originY: object.y,
      originWidth: object.width || SPATIAL_OBJECT_WIDTH,
      originHeight: object.height || SPATIAL_OBJECT_HEIGHT,
      memberOrigins:
        object.type === "map-group"
          ? buildSpatialGroupDragMemberOrigins(object)
          : null,
      didMove: false,
    };
    return;
  }

  const objectDragHandle = event.target.closest("[data-spatial-object-drag]");
  if (objectDragHandle) {
    const objectId = objectDragHandle.dataset.spatialObjectDrag;
    const object = spatialObjectById(objectId);
    if (!object) {
      return;
    }
    if (
      event.shiftKey ||
      !currentSelectedSpatialObjectIds().includes(objectId)
    ) {
      selectSpatialObject(objectId, {
        render: false,
        additive: event.shiftKey,
      });
    }
    if (!currentSelectedSpatialObjectIds().includes(objectId)) {
      return;
    }
    const dragObjects = selectedSpatialObjectsForTransform();
    if (hasLockedSpatialObjects(dragObjects)) {
      renderLockedSpatialObjectStatus("move them");
      return;
    }
    state.flowDrag = {
      kind: "spatial-selection",
      objectId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      objectOrigins: dragObjects.map((entry) => ({
        id: entry.id,
        x: entry.x,
        y: entry.y,
        memberOrigins:
          entry.type === "map-group"
            ? buildSpatialGroupDragMemberOrigins(entry)
            : null,
      })),
      didMove: false,
    };
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
  clearSpatialObjectSelection();

  state.flowDrag = {
    kind: "frame",
    frameId,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: frame.flowPosition.x,
    originY: frame.flowPosition.y,
    didMove: false,
  };
}

function onFlowShellPointerDown(event) {
  if (
    event.button !== 0 ||
    state.viewMode !== "flow" ||
    state.flowDrag ||
    state.flowConnectionDraft ||
    event.target.closest(
      "[data-flow-frame-id], [data-spatial-object-id], [data-flow-connection-id]",
    )
  ) {
    return;
  }

  cancelFlowPanMomentum();

  if (event.shiftKey) {
    event.preventDefault();
    const point = pointFromFlowEvent(event);
    state.flowLasso = {
      pointerId: event.pointerId,
      startPoint: point,
      currentPoint: point,
      baseIds:
        event.metaKey || event.ctrlKey ? currentSelectedSpatialObjectIds() : [],
      additive: event.metaKey || event.ctrlKey,
      didMove: false,
    };
    dom.flowShell.classList.add("is-lassoing");
    renderFlowBoard();
    return;
  }

  state.flowPan = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    scrollLeft: dom.flowShell.scrollLeft,
    scrollTop: dom.flowShell.scrollTop,
    lastX: event.clientX,
    lastY: event.clientY,
    lastTime: performance.now(),
    velocityX: 0,
    velocityY: 0,
  };
  dom.flowShell.classList.add("is-panning");
}

function onFlowShellWheel(event) {
  if (state.viewMode !== "flow" || !(event.ctrlKey || event.metaKey)) {
    return;
  }

  event.preventDefault();
  cancelFlowPanMomentum();
  const rect = dom.flowShell.getBoundingClientRect();
  const previousZoom = state.flowZoom;
  const pointerX = event.clientX - rect.left;
  const pointerY = event.clientY - rect.top;
  const contentX = (dom.flowShell.scrollLeft + pointerX) / previousZoom;
  const contentY = (dom.flowShell.scrollTop + pointerY) / previousZoom;
  const delta = event.deltaY < 0 ? 0.08 : -0.08;
  setFlowZoom(previousZoom + delta);
  dom.flowShell.scrollLeft = contentX * state.flowZoom - pointerX;
  dom.flowShell.scrollTop = contentY * state.flowZoom - pointerY;
}

function prefersReducedMotion() {
  return Boolean(
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
  );
}

function cancelFlowPanMomentum() {
  if (state.flowPanMomentum?.frameId) {
    cancelAnimationFrame(state.flowPanMomentum.frameId);
  }
  state.flowPanMomentum = null;
  dom.flowShell?.classList.remove("is-coasting");
}

function startFlowPanMomentum(pan) {
  if (!pan || prefersReducedMotion()) {
    return false;
  }

  const velocityX = Number(pan.velocityX) || 0;
  const velocityY = Number(pan.velocityY) || 0;
  const speed = Math.hypot(velocityX, velocityY);
  if (speed < FLOW_PAN_MOMENTUM_MIN_VELOCITY) {
    return false;
  }

  cancelFlowPanMomentum();
  state.flowPanMomentum = {
    velocityX,
    velocityY,
    lastTime: performance.now(),
    frameId: 0,
  };
  dom.flowShell?.classList.add("is-coasting");
  state.flowPanMomentum.frameId = requestAnimationFrame(stepFlowPanMomentum);
  return true;
}

function stepFlowPanMomentum(timestamp) {
  const momentum = state.flowPanMomentum;
  if (!momentum || state.viewMode !== "flow") {
    cancelFlowPanMomentum();
    return;
  }

  const elapsed = Math.min(48, Math.max(8, timestamp - momentum.lastTime));
  momentum.lastTime = timestamp;
  const beforeLeft = dom.flowShell.scrollLeft;
  const beforeTop = dom.flowShell.scrollTop;
  dom.flowShell.scrollLeft += momentum.velocityX * elapsed;
  dom.flowShell.scrollTop += momentum.velocityY * elapsed;
  const hitHorizontalEdge = dom.flowShell.scrollLeft === beforeLeft;
  const hitVerticalEdge = dom.flowShell.scrollTop === beforeTop;
  const decay = Math.pow(FLOW_PAN_MOMENTUM_DECAY, elapsed / 16.67);
  momentum.velocityX = hitHorizontalEdge ? 0 : momentum.velocityX * decay;
  momentum.velocityY = hitVerticalEdge ? 0 : momentum.velocityY * decay;

  if (
    Math.hypot(momentum.velocityX, momentum.velocityY) <
    FLOW_PAN_MOMENTUM_STOP
  ) {
    cancelFlowPanMomentum();
    renderFlowNavigatorViewport();
    void saveExportToWorkspace({ silent: true });
    return;
  }

  renderFlowNavigatorViewport();
  momentum.frameId = requestAnimationFrame(stepFlowPanMomentum);
}

function onWindowPointerMove(event) {
  if (state.shellPan && event.pointerId === state.shellPan.pointerId) {
    dom.deviceShell.scrollLeft =
      state.shellPan.scrollLeft - (event.clientX - state.shellPan.startX);
    dom.deviceShell.scrollTop =
      state.shellPan.scrollTop - (event.clientY - state.shellPan.startY);
    return;
  }

  if (state.flowLasso && event.pointerId === state.flowLasso.pointerId) {
    state.flowLasso.currentPoint = pointFromFlowEvent(event);
    const deltaX =
      state.flowLasso.currentPoint.x - state.flowLasso.startPoint.x;
    const deltaY =
      state.flowLasso.currentPoint.y - state.flowLasso.startPoint.y;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      state.flowLasso.didMove = true;
    }
    applySpatialLassoSelection(flowLassoBounds(state.flowLasso), {
      additive: state.flowLasso.additive,
      baseIds: state.flowLasso.baseIds,
    });
    renderFlowBoard();
    renderSpec();
    return;
  }

  if (state.flowPan && event.pointerId === state.flowPan.pointerId) {
    const now = performance.now();
    const elapsed = Math.max(8, now - (state.flowPan.lastTime || now));
    state.flowPan.velocityX =
      -(event.clientX - (state.flowPan.lastX ?? event.clientX)) / elapsed;
    state.flowPan.velocityY =
      -(event.clientY - (state.flowPan.lastY ?? event.clientY)) / elapsed;
    state.flowPan.lastX = event.clientX;
    state.flowPan.lastY = event.clientY;
    state.flowPan.lastTime = now;
    dom.flowShell.scrollLeft =
      state.flowPan.scrollLeft - (event.clientX - state.flowPan.startX);
    dom.flowShell.scrollTop =
      state.flowPan.scrollTop - (event.clientY - state.flowPan.startY);
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

  const deltaX = event.clientX - state.flowDrag.startX;
  const deltaY = event.clientY - state.flowDrag.startY;
  if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
    state.flowDrag.didMove = true;
  }

  if (state.flowDrag.kind === "spatial-selection") {
    const deltaFlowX = deltaX / state.flowZoom;
    const deltaFlowY = deltaY / state.flowZoom;
    const candidateMinX = Math.min(
      ...((state.flowDrag.objectOrigins || []).map(
        (origin) => origin.x + deltaFlowX,
      )),
    );
    const candidateMinY = Math.min(
      ...((state.flowDrag.objectOrigins || []).map(
        (origin) => origin.y + deltaFlowY,
      )),
    );
    ensureFlowWorkspaceMargin(candidateMinX, candidateMinY);
    (state.flowDrag.objectOrigins || []).forEach((origin) => {
      const object = spatialObjectById(origin.id);
      if (!object || isSpatialObjectLocked(object)) {
        return;
      }
      const nextX = Math.max(32, origin.x + deltaX / state.flowZoom);
      const nextY = Math.max(32, origin.y + deltaY / state.flowZoom);
      object.x = nextX;
      object.y = nextY;
      if (object.type === "map-group" && origin.memberOrigins) {
        moveSpatialGroupMembers(
          origin.memberOrigins,
          nextX - origin.x,
          nextY - origin.y,
        );
      }
    });
  } else if (state.flowDrag.kind === "spatial-selection-resize") {
    resizeSpatialSelectionFromDrag(
      state.flowDrag,
      deltaX / state.flowZoom,
      deltaY / state.flowZoom,
    );
  } else if (state.flowDrag.kind === "spatial-object-resize") {
    const object = spatialObjectById(state.flowDrag.objectId);
    if (!object || isSpatialObjectLocked(object)) {
      return;
    }
    const nextWidth = Math.max(
      SPATIAL_OBJECT_MIN_WIDTH,
      state.flowDrag.originWidth + deltaX / state.flowZoom,
    );
    const nextHeight = Math.max(
      SPATIAL_OBJECT_MIN_HEIGHT,
      state.flowDrag.originHeight + deltaY / state.flowZoom,
    );
    object.width = nextWidth;
    object.height = nextHeight;
    if (object.type === "map-group" && state.flowDrag.memberOrigins) {
      resizeSpatialGroupMembers(
        state.flowDrag.memberOrigins,
        {
          id: object.id,
          x: state.flowDrag.originX,
          y: state.flowDrag.originY,
          width: state.flowDrag.originWidth,
          height: state.flowDrag.originHeight,
        },
        object,
      );
    }
  } else {
    const frame = frameById(state.flowDrag.frameId);
    if (!frame) {
      return;
    }
    ensureFlowWorkspaceMargin(
      state.flowDrag.originX + deltaX / state.flowZoom,
      state.flowDrag.originY + deltaY / state.flowZoom,
    );
    frame.flowPosition = {
      x: Math.max(32, state.flowDrag.originX + deltaX / state.flowZoom),
      y: Math.max(32, state.flowDrag.originY + deltaY / state.flowZoom),
    };
  }
  renderFlowBoard();
}

function onWindowPointerUp(event) {
  if (state.shellPan && event.pointerId === state.shellPan.pointerId) {
    state.shellPan = null;
    renderCanvas();
    return;
  }

  if (state.flowPan && event.pointerId === state.flowPan.pointerId) {
    const pan = state.flowPan;
    state.flowPan = null;
    dom.flowShell.classList.remove("is-panning");
    startFlowPanMomentum(pan);
    return;
  }

  if (state.flowLasso && event.pointerId === state.flowLasso.pointerId) {
    const selectedCount = currentSelectedSpatialObjectIds().length;
    const didMove = state.flowLasso.didMove;
    state.flowLasso = null;
    dom.flowShell.classList.remove("is-lassoing");
    renderFlowBoard();
    renderSpec();
    if (didMove) {
      persistState();
      void saveExportToWorkspace({ silent: true });
      renderStatus(
        selectedCount
          ? `Lasso selected ${selectedCount} Map object${selectedCount === 1 ? "" : "s"}`
          : "Lasso found no Map objects",
      );
    }
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

  const completedDrag = state.flowDrag;
  const didMove = completedDrag.didMove;
  const branchSourceId =
    completedDrag.kind === "spatial-selection"
      ? variantBranchSourceIdForObjectIds(
          (completedDrag.objectOrigins || []).map((origin) => origin.id),
        )
      : "";
  const branchOrderChanged =
    didMove && branchSourceId
      ? reorderVariantBranchesByMapPosition(branchSourceId)
      : false;
  state.flowDrag = null;
  if (didMove) {
    persistState();
    renderFlowBoard();
    renderSpec();
    scheduleLivePreviewSync();
    void saveExportToWorkspace({ silent: true });
    renderStatus(
      branchOrderChanged
        ? "Branch sequence updated from Map position"
        : "Flow layout updated",
    );
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

  if (state.viewMode === "flow" && !shouldIgnoreDeleteShortcut(event.target)) {
    const selectedMapObject = selectedSpatialObject();
    if (selectedMapObject) {
      if (isMeta && event.key.toLowerCase() === "g" && event.shiftKey) {
        event.preventDefault();
        ungroupSelectedSpatialGroups();
        return;
      }
      if (isMeta && event.key.toLowerCase() === "g") {
        event.preventDefault();
        createSpatialGroupFromSelection();
        return;
      }
      if (isMeta && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelectedSpatialObject();
        return;
      }
      if (isMeta && event.key === "]") {
        event.preventDefault();
        bringSelectedSpatialObjectsFront();
        return;
      }
      if (isMeta && event.key === "[") {
        event.preventDefault();
        sendSelectedSpatialObjectsBack();
        return;
      }

      const arrowDeltas = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      const direction = arrowDeltas[event.key];
      if (direction && !isMeta) {
        event.preventDefault();
        const distance = event.shiftKey ? 32 : 8;
        nudgeSelectedSpatialObject(
          direction[0] * distance,
          direction[1] * distance,
        );
        return;
      }
    }
  }

  const isDeleteKey = event.key === "Delete" || event.key === "Backspace";
  if (!isDeleteKey || shouldIgnoreDeleteShortcut(event.target)) {
    return;
  }

  if (state.viewMode === "flow" && currentSelectedSpatialObjectIds().length) {
    event.preventDefault();
    removeSelectedSpatialObjects();
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
  const zoom = Number.isFinite(state.flowZoom) ? state.flowZoom : 1;
  return {
    x: (event.clientX - rect.left + dom.flowShell.scrollLeft) / zoom,
    y: (event.clientY - rect.top + dom.flowShell.scrollTop) / zoom,
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
  const tidiedCount = tidySpatialLaneObjects();
  persistState();
  renderAll();
  renderStatus(
    tidiedCount
      ? `Map tidied with ${tidiedCount} output/history object${tidiedCount === 1 ? "" : "s"}`
      : "Frame cards auto-laid out",
  );
}

function tidySpatialLaneObjects() {
  const outputObjects = sortSpatialLaneObjects(
    state.spatialObjects.filter(isManifestSpatialObject),
  );
  const checkpointObjects = sortSpatialLaneObjects(
    state.spatialObjects.filter(isCheckpointSpatialObject),
  );

  outputObjects.forEach((object, index) => {
    Object.assign(object, defaultOutputSpatialObjectPosition(index));
    object.meta = {
      ...(object.meta || {}),
      laneId: SPATIAL_OUTPUT_LANE_ID,
      laneIndex: index,
      autoLanePosition: true,
    };
  });
  checkpointObjects.forEach((object, index) => {
    Object.assign(object, defaultHistoryCheckpointPosition(index));
    object.meta = {
      ...(object.meta || {}),
      laneId: SPATIAL_HISTORY_LANE_ID,
      laneIndex: index,
      autoLanePosition: true,
    };
  });

  return outputObjects.length + checkpointObjects.length;
}

function sortSpatialLaneObjects(objects) {
  return [...objects].sort((a, b) => {
    const laneA = Number.isFinite(a?.meta?.laneIndex)
      ? a.meta.laneIndex
      : Number.MAX_SAFE_INTEGER;
    const laneB = Number.isFinite(b?.meta?.laneIndex)
      ? b.meta.laneIndex
      : Number.MAX_SAFE_INTEGER;
    if (laneA !== laneB) {
      return laneA - laneB;
    }
    return cleanString(a?.title).localeCompare(cleanString(b?.title));
  });
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

function updateSelectedElementPrototypeTarget(toFrameId) {
  const frame = currentFrame();
  const element = currentSelectedElement(frame);
  if (!element) {
    return;
  }

  const target = state.frames.find((candidate) => candidate.id === toFrameId);
  if (!target || target.id === frame.id) {
    delete element.prototype;
  } else {
    const existing = normalizeElementPrototype(element.prototype);
    element.prototype = {
      toFrameId: target.id,
      label:
        existing?.label ||
        `go to ${target.title || `Frame ${state.frames.indexOf(target) + 1}`}`,
      notes: existing?.notes || "",
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  frame.updatedAt = new Date().toISOString();
  persistState();
  renderElementPrototypeControls();
  renderCanvas();
  renderSpec();
  renderStatus(
    element.prototype
      ? `Prototype hotspot linked to ${frameTitleById(element.prototype.toFrameId)}`
      : "Element prototype hotspot cleared",
  );
}

function updateSelectedElementPrototypeLabel(label) {
  const frame = currentFrame();
  const element = currentSelectedElement(frame);
  const prototype = normalizeElementPrototype(element?.prototype);
  if (!element || !prototype) {
    return;
  }

  element.prototype = {
    ...prototype,
    label: label.trim() || "continue",
    updatedAt: new Date().toISOString(),
  };
  frame.updatedAt = new Date().toISOString();
  persistState();
  renderSpec();
}

function clearSelectedElementPrototype() {
  const frame = currentFrame();
  const element = currentSelectedElement(frame);
  if (!element?.prototype) {
    return;
  }
  delete element.prototype;
  frame.updatedAt = new Date().toISOString();
  persistState();
  renderElementPrototypeControls();
  renderCanvas();
  renderSpec();
  renderStatus("Element prototype hotspot cleared");
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
    element.type === "ellipse" ||
    element.type === "image"
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
  if (field === "project") {
    renderProjectSwitcher();
  }
  if (dom.focusDesignChip) {
    const designSummary = describeDesignContext();
    dom.focusDesignChip.textContent = designSummary.label;
    dom.focusDesignChip.title = designSummary.detail;
  }
  renderDesignKitCard();
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

function applyDesignKitPreset(presetId, options = {}) {
  const preset = designKitPresetById(presetId);
  if (!preset) {
    renderStatus("Choose a design kit preset first");
    return false;
  }

  const frame = currentFrame();
  const presetFrame = preset.frame || {};
  state.board.designKitPreset = preset.id;
  state.board.audience = preset.audience || state.board.audience;
  state.board.designMood = preset.mood || state.board.designMood;
  state.board.actionMode = normalizeActionMode(preset.actionMode).id;
  state.board.generation = normalizeGenerationConfig(
    preset.generation,
    state.board.generation,
  );

  if (viewportPresets[preset.viewport]) {
    frame.viewport = preset.viewport;
  }
  ["objective", "layout", "motion", "assets", "mobile"].forEach((field) => {
    if (!cleanString(frame[field]) && cleanString(presetFrame[field])) {
      frame[field] = presetFrame[field];
    }
  });

  touchFrame(frame, {
    capture: options.capture !== false,
    status: options.silent ? "" : `${preset.label} design kit applied`,
  });
  if (options.silent) {
    renderStatus("");
  }
  return true;
}

async function extractDesignTokensFromCurrentFrame(options = {}) {
  const frame = currentFrame();
  const tokens = await buildDesignTokensFromFrame(frame);
  state.board.designTokens = tokens;
  touchFrame(frame, {
    capture: options.capture !== false,
    status: options.silent
      ? ""
      : `Extracted ${tokens.palette.length} design token color${tokens.palette.length === 1 ? "" : "s"} from ${frame.title}`,
  });
  if (options.silent) {
    renderStatus("");
  }
  return tokens;
}

async function buildDesignTokensFromFrame(frame = currentFrame()) {
  const viewport = viewportPresets[frame.viewport] || viewportPresets.desktop;
  const meaningfulElements = (frame.elements || []).filter(
    (element) => !isEraserElement(element) && isElementMeaningful(element),
  );
  const elementMix = {
    total: meaningfulElements.length,
    paths: 0,
    shapes: 0,
    arrows: 0,
    labels: 0,
    imageSlots: 0,
  };
  const colorCounts = new Map();
  let coveredArea = 0;
  const addColorCount = (hex, count = 1) => {
    const color = normalizeColor(hex, "");
    if (!color) {
      return;
    }
    colorCounts.set(color, (colorCounts.get(color) || 0) + Math.max(1, count));
  };

  meaningfulElements.forEach((element) => {
    if (element.type === "path" || element.type === "line") {
      elementMix.paths += 1;
    }
    if (element.type === "rect" || element.type === "ellipse") {
      elementMix.shapes += 1;
    }
    if (element.type === "arrow") {
      elementMix.arrows += 1;
    }
    if (element.type === "label") {
      elementMix.labels += 1;
    }
    if (element.type === "image") {
      elementMix.imageSlots += 1;
    }

    const color = normalizeColor(element.color, "");
    if (color) {
      addColorCount(color, 12);
    }

    const bounds = getElementBounds(element, frame);
    if (bounds) {
      coveredArea +=
        Math.max(0, bounds.right - bounds.left) *
        Math.max(0, bounds.bottom - bounds.top);
    }
  });

  const visualSamples = await collectFrameVisualTokenSamples(frame);
  visualSamples.palette.forEach((entry) => {
    addColorCount(entry.hex, entry.count);
  });

  const paletteTokens = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([hex, count], index) => ({
      hex,
      count,
      role: index === 0 ? "primary" : index === 1 ? "accent" : "support",
    }));
  if (!paletteTokens.length) {
    paletteTokens.push({
      hex: normalizeColor(state.color, palette[0]),
      count: 1,
      role: "active",
    });
  }

  const viewportArea = Math.max(1, viewport.width * viewport.height);
  const coverage = roundNumber(Math.min(1, coveredArea / viewportArea));
  const densityLabel =
    meaningfulElements.length >= 18 || coverage > 0.34
      ? "dense"
      : meaningfulElements.length >= 7 || coverage > 0.14
        ? "balanced"
        : "sparse";
  const shapeLanguage = describeDesignTokenShapeLanguage(elementMix);
  const typographyCue = elementMix.labels
    ? `${elementMix.labels} label/text cue${elementMix.labels === 1 ? "" : "s"} on canvas`
    : "No explicit text labels found";
  const assetCue = elementMix.imageSlots
    ? `${elementMix.imageSlots} image/reference slot${elementMix.imageSlots === 1 ? "" : "s"} detected`
    : "No image slots detected";

  return normalizeDesignTokens({
    source: "current-frame-elements",
    sourceFrameId: frame.id,
    sourceFrameTitle: frame.title,
    extractedAt: new Date().toISOString(),
    palette: paletteTokens,
    elementMix,
    density: {
      label: densityLabel,
      elementCount: meaningfulElements.length,
      viewportArea,
      coverage,
    },
    visualSamples: {
      sourceCount: visualSamples.sourceCount,
      sampledSources: visualSamples.sampledSources,
      skippedSources: visualSamples.skippedSources,
      colorCount: visualSamples.colorCount,
    },
    shapeLanguage,
    typographyCue,
    assetCue,
    summary: [
      `${shapeLanguage} with ${densityLabel} density`,
      `${elementMix.total} sketch element${elementMix.total === 1 ? "" : "s"}`,
      `${paletteTokens.length} sampled color${paletteTokens.length === 1 ? "" : "s"}`,
      visualSamples.sampledSources
        ? `${visualSamples.sampledSources} visual reference source${visualSamples.sampledSources === 1 ? "" : "s"} sampled`
        : "",
      typographyCue,
      assetCue,
    ]
      .filter(Boolean)
      .join(". "),
  });
}

async function collectFrameVisualTokenSamples(frame = currentFrame()) {
  const sources = frameVisualTokenSources(frame).slice(0, 8);
  const colorCounts = new Map();
  let sampledSources = 0;
  let skippedSources = 0;

  for (const source of sources) {
    try {
      const image = await ensureImage(source.src);
      if (!image) {
        skippedSources += 1;
        continue;
      }
      const sourcePalette = sampleImagePalette(image);
      if (!sourcePalette.size) {
        skippedSources += 1;
        continue;
      }
      sampledSources += 1;
      sourcePalette.forEach((count, hex) => {
        colorCounts.set(hex, (colorCounts.get(hex) || 0) + count);
      });
    } catch {
      skippedSources += 1;
    }
  }

  const palette = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([hex, count]) => ({ hex, count }));

  return {
    sourceCount: sources.length,
    sampledSources,
    skippedSources,
    colorCount: colorCounts.size,
    palette,
  };
}

function frameVisualTokenSources(frame = currentFrame()) {
  const sources = [];
  const backgroundSrc = cleanString(frame?.backgroundImage);
  if (backgroundSrc) {
    sources.push({
      src: backgroundSrc,
      label: "Reference underlay",
      role: "background",
    });
  }
  (frame?.elements || []).forEach((element) => {
    if (element?.type !== "image" || isEraserElement(element)) {
      return;
    }
    const src = cleanString(element.imageDataUrl || element.src);
    if (!src) {
      return;
    }
    sources.push({
      src,
      label: cleanString(element.sourceName) || "Image element",
      role: "image",
      elementId: element.id || "",
    });
  });
  return sources;
}

function sampleImagePalette(image, options = {}) {
  const maxSize = options.maxSize || 96;
  const width = Math.max(1, image.naturalWidth || image.width || maxSize);
  const height = Math.max(1, image.naturalHeight || image.height || maxSize);
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let pixels;
  try {
    pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return new Map();
  }

  const colorCounts = new Map();
  for (let offset = 0; offset < pixels.length; offset += 16) {
    const alpha = pixels[offset + 3];
    if (alpha < 64) {
      continue;
    }
    const hex = rgbToQuantizedHex(
      pixels[offset],
      pixels[offset + 1],
      pixels[offset + 2],
    );
    colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
  }
  return colorCounts;
}

function rgbToQuantizedHex(red, green, blue) {
  const quantize = (value) =>
    Math.max(0, Math.min(255, Math.round(value / 16) * 16));
  const toHex = (value) => quantize(value).toString(16).padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

async function importExternalDesignTokens(options = {}) {
  let pack = options.pack || null;
  if (!pack) {
    try {
      const response = await fetch(
        "/workspace/exports/canvax-external-design-tokens-latest.json",
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error("No external token pack found yet");
      }
      pack = await response.json();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "External token pack could not be read";
      renderStatus(message);
      dom.workspaceStatus.textContent =
        "Run npm run extract-tokens first, then import the latest token pack.";
      return null;
    }
  }

  const tokens = normalizeExternalDesignTokenPack(pack);
  if (!tokens) {
    renderStatus("External token pack is invalid");
    dom.workspaceStatus.textContent =
      "Expected exports/canvax-external-design-tokens-latest.json.";
    return null;
  }

  const frame = currentFrame();
  state.board.designTokens = tokens;
  touchFrame(frame, {
    capture: options.capture !== false,
    status: options.silent
      ? ""
      : `Imported ${tokens.palette.length} external design token color${tokens.palette.length === 1 ? "" : "s"}`,
  });
  if (options.silent) {
    renderStatus("");
  }
  return tokens;
}

function normalizeExternalDesignTokenPack(pack) {
  if (pack?.kind !== "canvax-external-design-tokens") {
    return null;
  }
  const paletteTokens = Array.isArray(pack.palette)
    ? pack.palette
        .map((entry) => {
          const hex = normalizeColor(entry?.hex || entry, "");
          return hex
            ? {
                hex,
                count: Number(entry?.count) || 0,
                role: cleanString(entry?.role) || "external",
              }
            : null;
        })
        .filter(Boolean)
        .slice(0, 8)
    : [];
  if (!paletteTokens.length) {
    return null;
  }
  const fontFamilies = Array.isArray(pack.typography?.fontFamilies)
    ? pack.typography.fontFamilies.map((font) => cleanString(font)).filter(Boolean)
    : [];
  const sourceLabel =
    cleanString(pack.source?.label) ||
    cleanString(pack.source?.url) ||
    cleanString(pack.source?.path) ||
    "External design source";
  return normalizeDesignTokens({
    source: "external-design-token-pack",
    sourceFrameId: "",
    sourceFrameTitle: sourceLabel,
    extractedAt: cleanString(pack.createdAt) || new Date().toISOString(),
    palette: paletteTokens,
    elementMix: {
      total: 0,
      paths: 0,
      shapes: 0,
      arrows: 0,
      labels: 0,
      imageSlots: 0,
    },
    density: {
      label: "external",
      elementCount: 0,
      viewportArea: 0,
      coverage: 0,
    },
    visualSamples: {
      sourceCount: Number(pack.source?.linkedStylesheets?.length || 0) + 1,
      sampledSources: 1,
      skippedSources: 0,
      colorCount: Number(pack.usage?.colorCount) || paletteTokens.length,
    },
    shapeLanguage: "external design-system reference",
    typographyCue: fontFamilies.length
      ? `Fonts: ${fontFamilies.slice(0, 3).join(" | ")}`
      : "No font-family rules found",
    assetCue: sourceLabel,
    semanticStructure: pack.semanticStructure,
    summary:
      compactDisplayText(pack.summary, 360) ||
      `External token pack from ${sourceLabel}`,
  });
}

function describeDesignTokenShapeLanguage(elementMix) {
  if (elementMix.imageSlots > 0 && elementMix.labels > 0) {
    return "reference-driven annotated layout";
  }
  if (elementMix.arrows >= 2) {
    return "motion-first storyboard";
  }
  if (elementMix.shapes >= elementMix.paths && elementMix.shapes >= 3) {
    return "structured geometric wireframe";
  }
  if (elementMix.paths > elementMix.shapes && elementMix.paths >= 3) {
    return "organic freehand sketch";
  }
  if (elementMix.labels > 0) {
    return "text-led annotated sketch";
  }
  return "minimal mixed sketch";
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

function normalizeVariantStyleProperties(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return variantStylePropertyKeys.reduce((style, key) => {
    const nextValue = cleanString(source[key]);
    if (nextValue) {
      style[key] = nextValue;
    }
    return style;
  }, {});
}

function hasVariantStyleProperties(value) {
  return Object.keys(normalizeVariantStyleProperties(value)).length > 0;
}

const semanticVariantRecipes = [
  {
    id: "structure",
    label: "Structure",
    direction: "Preserve the rough layout while strengthening hierarchy, spacing, and content grouping.",
    connectionLabel: "variant: structure",
    thesis:
      "Make the sketch easier to build by clarifying information architecture, hierarchy, and spacing before changing the mood.",
    designMoves: [
      "name the primary, secondary, and supporting regions",
      "tighten alignment and whitespace rhythm",
      "turn ambiguous strokes into component blocks",
      "keep the original platform and rough placement",
    ],
    prompt:
      "Create a structure-first branch. Preserve the sketch intent, clarify layout hierarchy, and produce a build-ready UI direction without over-styling it.",
    styleProperties: {
      palette: "neutral base, restrained accent, accessible contrast",
      typography: "clear hierarchy, readable labels, practical component text",
      density: "balanced spacing with stronger alignment rhythm",
      motion: "quiet structure-first transitions",
      imagery: "only use imagery where it clarifies a region or feature",
    },
  },
  {
    id: "visual",
    label: "Visual",
    direction: "Keep the same intent but push the visual mood, palette, contrast, and art direction harder.",
    connectionLabel: "variant: visual",
    thesis:
      "Explore a stronger art-directed surface from the same sketch while keeping the functional layout recognizable.",
    designMoves: [
      "commit to a bolder palette and typographic contrast",
      "add image/art direction slots where the sketch suggests atmosphere",
      "raise visual drama without hiding the user flow",
      "keep labels and notes as semantic constraints",
    ],
    prompt:
      "Create a visual-direction branch. Keep the same user intent, but push palette, typography, imagery, and atmosphere into a distinctive designed surface.",
    styleProperties: {
      palette: "bold mood palette, high contrast, deliberate accent color",
      typography: "expressive display type with calmer supporting text",
      density: "cinematic spacing with strong focal hierarchy",
      motion: "dramatic but purposeful reveal and parallax moments",
      imagery: "art-directed hero imagery or poster-like visual anchor",
    },
  },
  {
    id: "adaptive",
    label: "Adaptive",
    direction: "Explore an alternate platform, breakpoint, or interaction state from the same source sketch.",
    connectionLabel: "variant: adaptive",
    thesis:
      "Translate the same idea into a responsive or alternate-state branch so Codex can reason about platform adaptation.",
    designMoves: [
      "identify what collapses, stacks, or changes priority",
      "preserve interaction rules and flow links",
      "mark platform-specific controls or states",
      "convert vague regions into adaptive component behavior",
    ],
    prompt:
      "Create an adaptive branch. Reinterpret the sketch for another breakpoint, platform, or interaction state while preserving the core concept.",
    styleProperties: {
      palette: "same visual identity adapted for the target surface",
      typography: "responsive type scale with platform-appropriate controls",
      density: "stacked or compact depending on breakpoint/state",
      motion: "state-aware transitions and interaction feedback",
      imagery: "crop, simplify, or reposition assets for the target surface",
    },
  },
];

const variantFrameRecipes = semanticVariantRecipes;

function variantRecipeCustomProperties(recipe, index) {
  return [
    {
      key: "variant-recipe",
      value: recipe.id || recipe.recipeId || recipe.label || `variant-${index + 1}`,
    },
    { key: "variant-purpose", value: recipe.label || "Variant" },
    { key: "variant-thesis", value: recipe.thesis || recipe.direction || "" },
    {
      key: "design-moves",
      value: Array.isArray(recipe.designMoves)
        ? recipe.designMoves.join(" | ")
        : "",
    },
    ...Object.entries(normalizeVariantStyleProperties(recipe.styleProperties)).map(
      ([key, value]) => ({
        key: `style-${key}`,
        value,
      }),
    ),
  ].filter((property) => cleanString(property.value));
}

function variantRecipeExport(recipe, index) {
  return {
    id: recipe.id || recipe.recipeId || `variant-${index + 1}`,
    label: recipe.label || "Variant",
    direction: recipe.direction || "",
    thesis: recipe.thesis || "",
    designMoves: Array.isArray(recipe.designMoves)
      ? [...recipe.designMoves]
      : [],
    prompt: recipe.prompt || "",
    styleProperties: normalizeVariantStyleProperties(recipe.styleProperties),
    customProperties: variantRecipeCustomProperties(recipe, index),
  };
}

function cloneElementsForVariant(elements, recipe, index) {
  const copies = structuredClone(elements || []);
  const elementIdMap = new Map();
  const groupIdMap = new Map();

  copies.forEach((element) => {
    const previousId = element.id;
    const nextId = uid(element.type || "element");
    if (previousId) {
      elementIdMap.set(previousId, nextId);
    }
    element.id = nextId;
    if (element.groupId) {
      if (!groupIdMap.has(element.groupId)) {
        groupIdMap.set(element.groupId, uid("group"));
      }
      element.groupId = groupIdMap.get(element.groupId);
    }
  });

  copies.forEach((element) => {
    if (element.attachedTo && elementIdMap.has(element.attachedTo)) {
      element.attachedTo = elementIdMap.get(element.attachedTo);
    }
  });

  copies.unshift({
    id: uid("label"),
    type: "label",
    text: `Variant ${index + 1}: ${recipe.label}`,
    x: 56,
    y: 56 + index * 10,
    color: palette[(index + 1) % palette.length],
    size: 20,
    alpha: 1,
    composite: "source-over",
    attachedTo: "",
    anchor: null,
  });

  return copies;
}

function createVariantFramesFromCurrent(options = {}) {
  const { silent = false, sync = true } = options;
  const source = currentFrame();
  if (!source) {
    return [];
  }
  const hasVariantContext = Boolean(
    source.elements.length ||
      source.backgroundImage ||
      source.objective.trim() ||
      source.layout.trim() ||
      source.assets.trim() ||
      state.voice.segments.length,
  );
  if (!hasVariantContext) {
    if (!silent) {
      renderStatus("Add a sketch or notes before creating variants");
      dom.workspaceStatus.textContent =
        "Draw, label, speak, or add a note before creating variant frames.";
    }
    return [];
  }

  const sourceIndex = Math.max(0, state.frames.indexOf(source));
  const createdAt = new Date().toISOString();
  const createdFrames = variantFrameRecipes.map((recipe, index) => {
    const semanticRecipe = variantRecipeExport(recipe, index);
    return createFrame({
      title: `${source.title} · ${recipe.label}`,
      viewport: source.viewport,
      objective: [
        source.objective || state.board.goal,
        `Variant direction: ${semanticRecipe.direction}`,
        semanticRecipe.thesis
          ? `Variant thesis: ${semanticRecipe.thesis}`
          : "",
        semanticRecipe.prompt
          ? `Codex prompt: ${semanticRecipe.prompt}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      layout: [
        source.layout,
        semanticRecipe.designMoves.length
          ? `Design moves:\n${semanticRecipe.designMoves
              .map((move) => `- ${move}`)
              .join("\n")}`
          : "",
        `Lineage: editable variant ${index + 1} of ${source.title}. Use this as a branch, not a replacement.`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      motion: source.motion,
      assets: source.assets,
      mobile: source.mobile,
      backgroundImage: source.backgroundImage,
      flowPosition: {
        x: source.flowPosition.x + FLOW_CARD_WIDTH + 120,
        y: source.flowPosition.y + index * (FLOW_CARD_HEIGHT + 72),
      },
      elements: cloneElementsForVariant(source.elements, recipe, index),
      outputAnnotations: [],
      thumbnail: source.thumbnail,
      captures: [],
      variant: {
        sourceFrameId: source.id,
        sourceFrameTitle: source.title,
        recipeId: semanticRecipe.id,
        label: semanticRecipe.label,
        direction: semanticRecipe.direction,
        thesis: semanticRecipe.thesis,
        designMoves: semanticRecipe.designMoves,
        prompt: semanticRecipe.prompt,
        styleProperties: semanticRecipe.styleProperties,
        customProperties: semanticRecipe.customProperties,
        index: index + 1,
        createdAt,
      },
    });
  });

  state.frames.splice(sourceIndex + 1, 0, ...createdFrames);
  createdFrames.forEach((frame, index) => {
    state.connections.push(
      normalizeConnection({
        fromFrameId: source.id,
        toFrameId: frame.id,
        label: variantFrameRecipes[index].connectionLabel,
        notes: `Editable generated variant branch from ${source.title}.`,
      }),
    );
  });
  createSpatialObjectsForVariantFrames(source, createdFrames);
  state.activeFrameId = createdFrames[0].id;
  state.viewMode = "flow";
  state.selectedConnectionId =
    state.connections.find(
      (connection) => connection.toFrameId === createdFrames[0].id,
    )?.id || null;
  clearElementSelection();
  persistState();
  renderAll();
  const message = `Created ${createdFrames.length} editable variant frames`;
  if (!silent) {
    renderStatus(message);
    dom.workspaceStatus.textContent =
      `${message}. Select any variant, keep sketching, or use Build with Codex from that branch.`;
  }
  scheduleLivePreviewSync();
  if (sync) {
    void saveExportToWorkspace({ silent: true });
    void saveCheckpointToWorkspace("create-variants", {
      silent: true,
      note: `${message} from ${source.title}.`,
    });
  }
  return createdFrames;
}

function createSpatialObjectsForVariantFrames(source, frames) {
  const existingIds = new Set(state.spatialObjects.map((object) => object.id));
  const nextObjects = [...state.spatialObjects];
  frames.forEach((frame, index) => {
    const id = `variant-object-${frame.id}`;
    if (existingIds.has(id)) {
      return;
    }
    nextObjects.push({
      id,
      type: "variant-branch",
      title: `${frame.variant?.label || "Variant"} branch`,
      subtitle: frame.variant?.direction || "Editable generated variant branch",
      sourceId: frame.id,
      sourceKind: "variant-branch",
      frameIds: [frame.id],
      x: frame.flowPosition.x + FLOW_CARD_WIDTH + 56,
      y: frame.flowPosition.y + index * 6,
      width: SPATIAL_OBJECT_WIDTH,
      height: SPATIAL_OBJECT_HEIGHT,
      status: frame.variant?.primary ? "primary" : "editable",
      meta: {
        sourceFrameId: source.id,
        sourceFrameTitle: source.title,
        variantFrameId: frame.id,
        recipeId: frame.variant?.recipeId || `variant-${index + 1}`,
        label: frame.variant?.label || "Variant",
        direction: frame.variant?.direction || "",
        thesis: frame.variant?.thesis || "",
        designMoves: Array.isArray(frame.variant?.designMoves)
          ? [...frame.variant.designMoves]
          : [],
        prompt: frame.variant?.prompt || "",
        variantStyle: normalizeVariantStyleProperties(
          frame.variant?.styleProperties,
        ),
        customProperties: normalizeMapCustomProperties(
          frame.variant?.customProperties,
        ),
        index: frame.variant?.index || index + 1,
        outputObjectId: frame.variant?.outputObjectId || "",
        outputSourceKind: frame.variant?.outputSourceKind || "",
        outputTarget: frame.variant?.outputTarget || "",
        outputHref: frame.variant?.outputHref || "",
      },
    });
  });
  state.spatialObjects = normalizeSpatialObjects(nextObjects);
}

function syncVariantSpatialObjectState(sourceFrameId) {
  state.spatialObjects = state.spatialObjects.map((object) => {
    if (
      object.sourceKind !== "variant-branch" ||
      object.meta?.sourceFrameId !== sourceFrameId
    ) {
      return object;
    }
    const frame = frameById(object.frameIds?.[0] || object.sourceId);
    const manualFields = object.meta?.manualFields || {};
    const variant = frame?.variant || {};
    return {
      ...object,
      status: variant?.primary ? "primary" : "editable",
      title: variant?.label
        ? `${variant.label} branch`
        : object.title,
      meta: {
        ...object.meta,
        recipeId: variant.recipeId || object.meta?.recipeId || "",
        label: variant.label || object.meta?.label || "Variant",
        direction: variant.direction || object.meta?.direction || "",
        thesis: variant.thesis || object.meta?.thesis || "",
        designMoves: Array.isArray(variant.designMoves)
          ? [...variant.designMoves]
          : object.meta?.designMoves || [],
        ...(manualFields.prompt
          ? {}
          : { prompt: variant.prompt || object.meta?.prompt || "" }),
        ...(manualFields.customProperties
          ? {}
          : {
              customProperties: normalizeMapCustomProperties(
                variant.customProperties || object.meta?.customProperties,
              ),
            }),
        variantStyle: normalizeVariantStyleProperties(
          object.meta?.variantStyleManual
            ? object.meta?.variantStyle
            : variant.styleProperties || object.meta?.variantStyle,
        ),
        primary: Boolean(variant.primary),
        promotedAt: variant.promotedAt || "",
        index: Number(variant.index) || object.meta?.index || 0,
        reorderedAt: variant.reorderedAt || object.meta?.reorderedAt || "",
      },
    };
  });
}

function promoteCurrentVariantToPrimary(options = {}) {
  const { silent = false, sync = true, stayInFlow = false } = options;
  const frame = currentFrame();
  if (!frame?.variant?.sourceFrameId) {
    if (!silent) {
      renderStatus("Select a variant frame before using it as primary");
    }
    return false;
  }

  const now = new Date().toISOString();
  const sourceFrameId = frame.variant.sourceFrameId;
  state.frames.forEach((candidate) => {
    if (
      candidate.id !== frame.id &&
      candidate.variant?.sourceFrameId === sourceFrameId
    ) {
      delete candidate.variant.promotedAt;
      delete candidate.variant.primary;
    }
  });

  frame.variant = {
    ...frame.variant,
    primary: true,
    promotedAt: now,
  };
  syncVariantSpatialObjectState(sourceFrameId);

  const note = `Primary variant chosen from ${frame.variant.sourceFrameTitle || frame.variant.sourceFrameId} at ${formatDateTime(now)}.`;
  if (!frame.layout.includes("Primary variant chosen")) {
    frame.layout = [frame.layout, note].filter(Boolean).join("\n\n");
  }

  const connection = state.connections.find(
    (candidate) =>
      candidate.fromFrameId === sourceFrameId && candidate.toFrameId === frame.id,
  );
  if (connection) {
    connection.notes = [connection.notes, "Chosen as primary variant."]
      .filter(Boolean)
      .join(" ");
  }

  state.entryFrameId = frame.id;
  state.activeFrameId = frame.id;
  state.viewMode = stayInFlow ? "flow" : "frame";
  state.selectedConnectionId = connection?.id || null;
  clearElementSelection();
  touchFrame(frame, {
    capture: false,
    status: "Variant promoted to primary",
  });
  if (!silent) {
    dom.workspaceStatus.textContent =
      `${frame.title} is now the primary variant. Build with Codex from this branch to bind real code/output.`;
  }
  if (sync) {
    void saveExportToWorkspace({ silent: true });
    void saveCheckpointToWorkspace("promote-variant", {
      silent: true,
      note: `${frame.title} was chosen as the primary variant.`,
    });
  }
  return true;
}

function promoteVariantFrameFromMap(frameId, options = {}) {
  const frame = frameById(frameId);
  if (!frame?.variant?.sourceFrameId) {
    renderStatus("Select a variant frame before using it as primary");
    return false;
  }
  state.activeFrameId = frame.id;
  const promoted = promoteCurrentVariantToPrimary({
    ...options,
    stayInFlow: true,
  });
  if (promoted && !options.silent) {
    renderStatus(`${frame.title} is now the primary variant`);
  }
  return promoted;
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
  removeElementPrototypeTargetsForFrame(deletedFrameId);
  state.spatialObjects = state.spatialObjects.filter(
    (object) =>
      object.sourceId !== deletedFrameId &&
      !(object.frameIds || []).includes(deletedFrameId),
  );
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

function removeElementPrototypeTargetsForFrame(frameId) {
  state.frames.forEach((frame) => {
    frame.elements.forEach((element) => {
      if (element.prototype?.toFrameId === frameId) {
        delete element.prototype;
        frame.updatedAt = new Date().toISOString();
      }
    });
  });
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
  await maybeExecuteLiveRewriteFromFreeze(exportResult, reason);
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

async function maybeExecuteLiveRewriteFromFreeze(exportResult = null, reason = "") {
  const frame = currentFrame();
  if (
    !state.autoRewrite ||
    !exportResult ||
    !frame ||
    state.focusApplyInFlight ||
    state.buildRealInFlight
  ) {
    return null;
  }

  const signature = buildLiveRewriteSignature(frame, reason);
  if (state.liveRewriteInFlight) {
    const activeSignature = state.liveRewriteActiveSignature || "";
    const queuedSignature = state.liveRewriteQueued?.signature || "";
    if (
      !signature ||
      (signature !== activeSignature &&
        signature !== queuedSignature &&
        signature !== state.lastAutoRewriteSignature)
    ) {
      state.liveRewriteQueued = {
        exportResult,
        frameId: frame.id,
        reason,
        signature,
        queuedAt: new Date().toISOString(),
      };
      renderAutomationControls();
      renderFocusPad();
      renderStatus("Live rewrite queued after the current refresh finishes");
    }
    return {
      queued: true,
      frameId: frame.id,
      reason,
    };
  }

  if (signature && signature === state.lastAutoRewriteSignature) {
    return null;
  }

  state.liveRewriteInFlight = true;
  state.liveRewriteActiveSignature = signature;
  renderAutomationControls();
  renderFocusPad();
  renderStatus("Live rewrite refreshing output from latest handoff...");
  try {
    const executeResult = await executeLatestRewriteRequest({
      exportResult,
      frameId: frame.id,
    });
    state.lastAutoRewriteSignature = signature;
    state.serverStatus = {
      ...state.serverStatus,
      rewriteExecution: {
        ...executeResult,
        trigger: "live-rewrite",
        freezeReason: reason,
      },
    };
    state.focusLastAppliedText =
      "Live rewrite refreshed the output from the latest sketch and voice handoff.";
    await refreshPreviewStateFromServer();
    renderServerStatus();
    scheduleLivePreviewSync();
    renderStatus("Live rewrite preview refreshed");
    return executeResult;
  } catch (error) {
    state.serverStatus = {
      ...state.serverStatus,
      rewriteExecution: {
        executed: false,
        trigger: "live-rewrite",
        freezeReason: reason,
        error:
          error instanceof Error
            ? error.message
            : "Live rewrite execution failed.",
      },
    };
    renderStatus("Live rewrite skipped after save");
    return null;
  } finally {
    state.liveRewriteInFlight = false;
    state.liveRewriteActiveSignature = "";
    const queuedRewrite = state.liveRewriteQueued;
    state.liveRewriteQueued = null;
    renderAutomationControls();
    renderFocusPad();
    if (queuedRewrite && state.autoRewrite) {
      window.setTimeout(() => {
        void maybeExecuteLiveRewriteFromFreeze(
          queuedRewrite.exportResult,
          queuedRewrite.reason || "queued-live-rewrite",
        );
      }, 0);
    }
  }
}

function buildLiveRewriteSignature(frame, reason = "") {
  const frameVoiceCount = state.voice.segments.filter(
    (segment) => !segment.frameId || segment.frameId === frame.id,
  ).length;
  return [
    frame.id,
    frame.updatedAt,
    reason,
    frame.elements.length,
    frame.outputAnnotations?.length || 0,
    frameVoiceCount,
  ].join(":");
}

async function applyBackgroundFile(file) {
  const frame = currentFrame();
  pushHistory(frame.id);
  frame.backgroundImage = await fileToDataUrl(file, 1800, {
    mime: "image/jpeg",
  });
  touchFrame(frame, { capture: true, status: "Reference underlay loaded" });
}

async function placeImageFile(file, point = null, options = {}) {
  const frame = currentFrame();
  const viewport = viewportPresets[frame.viewport] || viewportPresets.desktop;
  const dataUrl = await fileToDataUrl(file, 1400, { preserveAlpha: true });
  const image = await ensureImage(dataUrl);
  const maxWidth = Math.min(viewport.width * 0.44, 640);
  const maxHeight = Math.min(viewport.height * 0.44, 520);
  const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
  const width = Math.max(120, Math.round(image.width * scale));
  const height = Math.max(90, Math.round(image.height * scale));
  const center = point || {
    x: viewport.width / 2,
    y: viewport.height / 2,
  };
  const left = clamp(
    center.x - width / 2,
    0,
    Math.max(0, viewport.width - width),
  );
  const top = clamp(
    center.y - height / 2,
    0,
    Math.max(0, viewport.height - height),
  );
  const element = {
    id: uid("image"),
    type: "image",
    start: { x: left, y: top },
    end: { x: left + width, y: top + height },
    color: state.color,
    size: 2,
    alpha: 1,
    composite: "source-over",
    imageDataUrl: dataUrl,
    sourceName: cleanString(file?.name) || options.sourceName || "Pasted image",
    assetCandidateId: options.assetCandidateId || "",
  };

  pushHistory(frame.id);
  frame.elements.push(element);
  setSelectedElements([element.id], element.id);
  touchFrame(frame, { capture: true, status: "Image asset placed" });
  return element;
}

async function fileToDataUrl(file, maxWidth, options = {}) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await ensureImage(dataUrl);
  const scale = Math.min(1, maxWidth / image.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const mime =
    options.mime ||
    (options.preserveAlpha && file?.type === "image/png"
      ? "image/png"
      : "image/jpeg");
  return mime === "image/jpeg"
    ? canvas.toDataURL(mime, 0.88)
    : canvas.toDataURL(mime);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 102.4) / 10} KB`;
  }
  return `${Math.round(size / 1024 / 102.4) / 10} MB`;
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
      designKitGallery: data.designKitGallery || null,
    };
    populateViewportSelect();
    renderDesignKitCard();
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
      designKitGallery:
        data.designKitGallery || state.serverStatus.designKitGallery || null,
      designJury: data.designJury || state.serverStatus.designJury || null,
      imageResultPack:
        data.imageResultPack || state.serverStatus.imageResultPack || null,
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
    state.imageResultPack = normalizeImageResultPack(
      state.serverStatus.imageResultPack,
    );
    syncSpatialObjectsFromHandoffs();
    importTranscriptBridge(data.transcriptBridge);
    renderCheckpointPanel();
    renderCodexOutput();
    renderWorkbenchAgentLog();
    renderWorkbenchOutput();
    renderFlowBoard();
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
      designKitGallery: state.serverStatus.designKitGallery || null,
      designJury: state.serverStatus.designJury || null,
      imageResultPack: state.serverStatus.imageResultPack || null,
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
  const designKit = buildDesignKitSummary(state.frames);
  const projectHandoff = buildProjectExportMetadata();
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
    `- Design kit: ${designKit.statusLabel} (${designKit.sources.map((source) => source.label).slice(0, 4).join("; ")})`,
    `- Active project id: ${projectHandoff.id}`,
    `- Project-scoped live handoff: ${projectHandoff.handoff.liveJsonPath}`,
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
    const prototypeLinks = frame.elements
      .map((element) => ({
        element,
        prototype: normalizeElementPrototype(element.prototype),
      }))
      .filter((entry) => entry.prototype);
    if (prototypeLinks.length) {
      lines.push(
        `- Element hotspots: ${prototypeLinks.map(({ element, prototype }) => `${element.type || "element"} ${element.id} "${prototype.label}" -> ${frameTitleById(prototype.toFrameId)}`).join("; ")}`,
      );
    }
  });

  lines.push("");
  lines.push("## Flow graph");
  lines.push(`- Entry frame: ${frameTitleById(state.entryFrameId)}`);
  lines.push(
    `- Spatial map zoom: ${Math.round((state.flowZoom || 1) * 100)}%`,
  );
  lines.push(
    `- Spatial positions: ${state.frames.map((frame) => `${frame.title} at ${Math.round(frame.flowPosition.x)},${Math.round(frame.flowPosition.y)}`).join("; ")}`,
  );
  if (state.spatialObjects.length) {
    lines.push(
      `- Spatial objects: ${state.spatialObjects.map((object) => `${object.title} (${object.sourceKind}) at ${Math.round(object.x)},${Math.round(object.y)}`).join("; ")}`,
    );
  }
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
    intentQueue: buildVoiceIntentQueue(segments, { limit: 12 }),
  };
}

function buildVoiceIntentQueue(segments, options = {}) {
  const limit = Number.isFinite(Number(options.limit))
    ? Math.max(1, Number(options.limit))
    : 8;
  return (Array.isArray(segments) ? segments : [])
    .map((segment) => {
      const text = cleanString(segment?.text);
      if (!text) {
        return null;
      }
      const matchedRule =
        voiceIntentRules.find((rule) => rule.pattern.test(text)) ||
        {
          id: "intent",
          label: "Intent",
          detail: "Use this spoken note as direct design instruction.",
        };
      return {
        id: `intent-${cleanString(segment.id) || uid("voice-intent")}`,
        segmentId: cleanString(segment.id),
        category: matchedRule.id,
        label: matchedRule.label,
        detail: matchedRule.detail,
        summary: summarizeVoiceIntent(text),
        text,
        frameId: cleanString(segment.frameId),
        frameTitle: cleanString(segment.frameTitle),
        scope: segment.scope === "session" ? "session" : "frame",
        provider: cleanString(segment.provider),
        at: cleanString(segment.at),
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, limit);
}

function summarizeVoiceIntent(text) {
  const normalized = cleanString(text).replace(/\s+/g, " ");
  if (normalized.length <= 74) {
    return normalized;
  }
  return `${normalized.slice(0, 71).trim()}...`;
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

  if (voiceExport.intentQueue?.length) {
    if (lines.length) {
      lines.push("");
    }
    lines.push("### Intent queue");
    voiceExport.intentQueue.forEach((intent) => {
      const scope =
        intent.scope === "session"
          ? "board"
          : intent.frameTitle || "current frame";
      lines.push(
        `- ${intent.label} (${scope}): ${collapseVoiceTextForMarkdown(intent.summary || intent.text)}`,
      );
    });
  }

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
      variant: frame.variant,
      outputEditBinding: frameOutputEditBinding(frame),
      flowPosition: frame.flowPosition,
      updatedAt: frame.updatedAt,
      captureCount: frame.captures.length,
      outputAnnotationCount: frame.outputAnnotations?.length || 0,
      outputAnnotations: (frame.outputAnnotations || []).map(
        summarizeOutputAnnotation,
      ),
      composition: buildFrameComposition(frame),
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

  const taskPack = buildTaskPack(selectedFrames, rewriteQueue);
  const imagePromptPack = buildImagePromptPack(selectedFrames);
  const assetCandidatePack = buildAssetCandidatePack(imagePromptPack);
  const spatialWorkspace = buildSpatialWorkspaceExport();
  const rewriteRequest = buildRewriteRequest(selectedFrames, rewriteQueue);
  const project = buildProjectExportMetadata();

  return {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    storageVersion: STORAGE_VERSION,
    generatedAt: new Date().toISOString(),
    transport: currentTransportDescriptor(),
    project,
    workspaceMode: state.workspaceMode,
    workbench: buildWorkbenchExport(),
    board: state.board,
    activeFrameId: state.activeFrameId,
    entryFrameId: state.entryFrameId,
    spatialWorkspace,
    connections: state.connections.map((connection) => ({
      ...connection,
      fromTitle: frameTitleById(connection.fromFrameId),
      toTitle: frameTitleById(connection.toFrameId),
    })),
    rewriteQueue,
    voice: buildVoiceExport(frameSelection),
    prompt: buildPromptMarkdown(),
    frames: selectedFrames,
    taskPack,
    imagePromptPack,
    assetCandidatePack,
    rewriteRequest,
  };
}

function buildRewriteRequest(frames, rewriteQueue = buildRewriteQueue()) {
  const activeFrame = frames.find((frame) => frame.id === state.activeFrameId);
  const queuedFrameIds = new Set(rewriteQueue.map((item) => item.frameId));
  const relevantFrames = frames.filter(
    (frame) => frame.id === state.activeFrameId || queuedFrameIds.has(frame.id),
  );
  const manifest = state.serverStatus.previewManifest || null;
  const outputManifest = manifest
    ? {
        targets: collectManifestTargets(manifest),
        artifacts: collectManifestArtifacts(manifest),
        changes: collectManifestChanges(manifest),
      }
    : null;
  return {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    kind: "canvax-rewrite-request",
    generatedAt: new Date().toISOString(),
    requiresOpenAiApiKey: false,
    source: "canvax-live-workbench",
    project: buildProjectExportMetadata(),
    activeFrameId: state.activeFrameId,
    activeFrameTitle: activeFrame?.title || frameTitleById(state.activeFrameId),
    board: {
      project: state.board.project,
      goal: state.board.goal,
      audience: state.board.audience,
      designMood: state.board.designMood,
      actionMode: state.board.actionMode,
    },
    handoff: {
      liveJsonPath: "exports/canvax-live-latest.json",
      liveMarkdownPath: "exports/canvax-live-latest.md",
      taskPackJsonPath: "exports/canvax-task-pack-latest.json",
      previewManifestPath: "exports/canvax-preview-manifest.json",
      codexOutputManifestPath: "artifacts/canvax/codex-output.json",
    },
    rewriteQueue,
    outputManifest,
    revisionGraph: buildOutputRevisionGraph(
      relevantFrames,
      manifest,
      rewriteQueue,
    ),
    voice: buildVoiceExport(state.frames),
    spatialContext: buildSpatialHandoffContext(frames),
    frames: relevantFrames.map((frame) => ({
      id: frame.id,
      index: frame.index,
      title: frame.title,
      viewport: frame.viewport,
      viewportWidth: frame.viewportWidth,
      viewportHeight: frame.viewportHeight,
      updatedAt: frame.updatedAt,
      intent: frame.objective,
      layout: frame.layout,
      motion: frame.motion,
      assets: frame.assets,
      mobile: frame.mobile,
      variant: frame.variant || null,
      outputEditBinding:
        frame.outputEditBinding || frameOutputEditBinding(frame),
      captureCount: frame.captureCount,
      outputAnnotationCount: frame.outputAnnotationCount,
      outputAnnotations: frame.outputAnnotations || [],
      snapshotPath: frame.snapshotPath || "",
      thumbnailPath: frame.thumbnailPath || "",
    })),
    instruction:
      "Use this request with the live Canvax export. Prioritize queued frames, correction marks, voice notes, and frame-bound output targets. Update real files or generated artifacts, then publish artifacts through artifacts/canvax/codex-output.json.",
  };
}

function buildOutputRevisionGraph(frames, manifest, rewriteQueue = []) {
  const normalizedFrames = Array.isArray(frames) ? frames : [];
  const targets = collectManifestTargets(manifest);
  const artifacts = collectManifestArtifacts(manifest);
  const changes = collectManifestChanges(manifest);
  const globalTargets = targets.filter(
    (target) =>
      (!Array.isArray(target.frameIds) || !target.frameIds.length) &&
      !cleanString(target.sourceFrameId),
  );
  const frameNodes = normalizedFrames.map((frame) => {
    const relatedTargets = targets.filter((target) =>
      itemHasFrameBinding(target, frame.id),
    );
    const relatedArtifacts = artifacts.filter((artifact) =>
      itemHasFrameBinding(artifact, frame.id),
    );
    const relatedChanges = changes.filter((change) =>
      itemHasFrameBinding(change, frame.id),
    );
    const status = describeFrameOutputStatus(frame, {
      includeGlobal: true,
      manifest,
    });
    const queueItems = rewriteQueue.filter((item) => item.frameId === frame.id);
    return {
      frameId: frame.id,
      title: frame.title,
      frameRevision: frame.updatedAt || "",
      captureCount: frame.captureCount || 0,
      outputAnnotationCount: frame.outputAnnotationCount || 0,
      outputEditBinding:
        frame.outputEditBinding || frameOutputEditBinding(frame),
      status: status?.label || (relatedTargets.length ? "Output bound" : "No output"),
      stale: status?.label === "Output stale",
      queueReasons: queueItems.map((item) => item.reason),
      targets: relatedTargets.map((target) => summarizeOutputTarget(target)),
      artifacts: relatedArtifacts.map((artifact) =>
        summarizeOutputArtifact(artifact),
      ),
      changes: relatedChanges.map((change) => summarizeOutputChange(change)),
      globalTargetIds: relatedTargets.length
        ? []
        : globalTargets.map((target) => target.id || target.previewPath || target.url),
    };
  });
  return {
    kind: "canvax-output-revision-graph",
    generatedAt: new Date().toISOString(),
    frameCount: frameNodes.length,
    targetCount: targets.length,
    artifactCount: artifacts.length,
    changeCount: changes.length,
    frames: frameNodes,
    edges: frameNodes.flatMap((frame) =>
      frame.targets.map((target) => ({
        from: `frame:${frame.frameId}@${frame.frameRevision}`,
        to: `target:${target.id}@${target.revision}`,
        relation: frame.stale ? "stale-output" : "frame-output",
      })),
    ),
  };
}

function summarizeOutputTarget(target) {
  const revision =
    target.versionTag ||
    target.generatedAt ||
    target.sourceFrameUpdatedAt ||
    target.previewPath ||
    target.url ||
    "";
  return {
    id: target.id || "",
    label: target.label || "",
    type: target.type || "",
    source: target.source || "",
    revision,
    generatedAt: target.generatedAt || "",
    sourceFrameUpdatedAt: target.sourceFrameUpdatedAt || "",
    previewPath: target.previewPath || "",
    url: target.url || target.resolvedUrl || "",
    refinementIteration: target.refinement?.iteration || 0,
    refinementSummary: target.refinement?.summary || target.changeSummary || "",
  };
}

function summarizeOutputArtifact(artifact) {
  return {
    id: artifact.id || "",
    label: artifact.label || "",
    kind: artifact.kind || "",
    path: artifact.path || "",
    generatedAt: artifact.generatedAt || "",
    sourceFrameUpdatedAt: artifact.sourceFrameUpdatedAt || "",
  };
}

function summarizeOutputChange(change) {
  return {
    id: change.id || "",
    label: change.label || "",
    kind: change.kind || "",
    path: change.path || "",
    summary: change.summary || "",
  };
}

function buildSpatialWorkspaceExport(frameSelection = state.frames) {
  const frameIds = new Set(frameSelection.map((frame) => frame.id));
  const bounds = computeFlowSurfaceSize(frameSelection);
  const spatialGrouping = computeSpatialGroupMembership(
    frameSelection,
    state.spatialObjects,
  );
  const selectedObjects = selectedSpatialObjects();
  const selectedObject = selectedSpatialObject();
  return {
    kind: "canvax-spatial-workspace",
    coordinateSystem:
      "Unbounded project map coordinates in CSS pixels. Frame cards and Map objects can be panned, zoomed, dragged, linked, and dragged into the left/top edge to expand workspace space without clipping.",
    zoom: Number.isFinite(state.flowZoom) ? state.flowZoom : 1,
    surface: {
      ...bounds,
      edgeExpansion: {
        enabled: true,
        margin: FLOW_EDGE_EXPAND_MARGIN,
        step: FLOW_EDGE_EXPAND_STEP,
        trailingSpace: FLOW_TRAILING_SPACE,
      },
    },
    interaction: {
      pan: "background-drag",
      panMomentum: true,
      panMomentumDecay: FLOW_PAN_MOMENTUM_DECAY,
      zoom: "cursor-centered ctrl/cmd wheel, pinch, buttons, and minimap",
      lasso: "shift-drag empty map space",
    },
    viewport: buildSpatialViewportExport(bounds),
    activeFrameId: state.activeFrameId,
    entryFrameId: state.entryFrameId,
    objectFilter: buildSpatialObjectFilterExport(),
    selectedObjectId: state.selectedSpatialObjectId || "",
    selectedObjectIds: currentSelectedSpatialObjectIds(),
    selectedObject: selectedObject
      ? buildSpatialWorkspaceObject(selectedObject, spatialGrouping)
      : null,
    selectedObjects: selectedObjects.map((object) =>
      buildSpatialWorkspaceObject(object, spatialGrouping),
    ),
    cards: frameSelection.map((frame, index) => {
      const viewport = viewportPresets[frame.viewport] || viewportPresets.desktop;
      const status = describeFrameOutputStatus(frame, {
        includeGlobal: frame.id === state.activeFrameId,
      });
      return {
        id: frame.id,
        index: index + 1,
        title: frame.title,
        type: frame.variant?.label ? "variant-frame" : "frame",
        viewport: frame.viewport,
        viewportLabel: viewport.label,
        position: flowPositionForFrame(frame, index),
        size: {
          width: FLOW_CARD_WIDTH,
          height: FLOW_CARD_HEIGHT,
        },
        variant: frame.variant || null,
        outputStatus: status?.label || "No output",
        linkedCount: countFrameConnections(frame.id),
        groupIds: spatialGrouping.cardGroupIds.get(frame.id) || [],
      };
    }),
    variantBranches: buildSpatialVariantBranches(frameSelection),
    lanes: buildSpatialWorkspaceLanes(state.spatialObjects),
    timeline: buildSpatialTimeline(frameSelection, state.spatialObjects),
    groupHierarchy: spatialGrouping.groupHierarchy,
    groups: spatialGrouping.groups,
    objects: state.spatialObjects.map((object) =>
      buildSpatialWorkspaceObject(object, spatialGrouping),
    ),
    links: state.connections
      .filter(
        (connection) =>
          frameIds.has(connection.fromFrameId) && frameIds.has(connection.toFrameId),
      )
      .map((connection) => ({
        ...structuredClone(connection),
        fromTitle: frameTitleById(connection.fromFrameId),
        toTitle: frameTitleById(connection.toFrameId),
      })),
  };
}

function buildSpatialViewportExport(surfaceBounds) {
  const zoom = Number.isFinite(state.flowZoom) ? state.flowZoom : 1;
  const shell = dom.flowShell;
  const surfaceWidth = Math.max(1, surfaceBounds?.width || 1);
  const surfaceHeight = Math.max(1, surfaceBounds?.height || 1);
  const left = shell ? shell.scrollLeft / zoom : 0;
  const top = shell ? shell.scrollTop / zoom : 0;
  const width = shell ? shell.clientWidth / zoom : surfaceWidth;
  const height = shell ? shell.clientHeight / zoom : surfaceHeight;
  const visibleBounds = {
    left: roundFinite(left),
    top: roundFinite(top),
    width: roundFinite(Math.min(surfaceWidth, width)),
    height: roundFinite(Math.min(surfaceHeight, height)),
    right: roundFinite(Math.min(surfaceWidth, left + width)),
    bottom: roundFinite(Math.min(surfaceHeight, top + height)),
    centerX: roundFinite(Math.min(surfaceWidth, left + width / 2)),
    centerY: roundFinite(Math.min(surfaceHeight, top + height / 2)),
  };
  return {
    active: state.viewMode === "flow",
    source:
      state.viewMode === "flow"
        ? "current-map-viewport"
        : "last-rendered-map-viewport",
    zoom: roundFinite(zoom),
    scroll: {
      left: roundFinite(shell?.scrollLeft || 0),
      top: roundFinite(shell?.scrollTop || 0),
    },
    visibleBounds,
    normalizedVisibleBounds: {
      left: roundFinite(visibleBounds.left / surfaceWidth),
      top: roundFinite(visibleBounds.top / surfaceHeight),
      width: roundFinite(visibleBounds.width / surfaceWidth),
      height: roundFinite(visibleBounds.height / surfaceHeight),
      centerX: roundFinite(visibleBounds.centerX / surfaceWidth),
      centerY: roundFinite(visibleBounds.centerY / surfaceHeight),
    },
  };
}

function roundFinite(value) {
  return Number.isFinite(value) ? roundNumber(value) : 0;
}

function buildSpatialObjectFilterExport() {
  const id = normalizeMapObjectFilter(state.mapObjectFilter);
  const visibleObjectIds = state.spatialObjects
    .filter((object) => object.type !== "map-group")
    .filter(isSpatialObjectVisibleInCurrentMap)
    .map((object) => object.id);
  return {
    id,
    label: mapObjectFilterLabel(id),
    searchQuery: normalizeMapSearchQuery(state.mapObjectSearch),
    visibleObjectIds,
    hiddenObjectCount: Math.max(
      0,
      state.spatialObjects.filter((object) => object.type !== "map-group")
        .length - visibleObjectIds.length,
    ),
  };
}

function buildSpatialWorkspaceLanes(spatialObjects = state.spatialObjects) {
  const outputLane = buildSpatialWorkspaceLane({
    id: SPATIAL_OUTPUT_LANE_ID,
    kind: "output",
    title: "Output shelf",
    description:
      "Generated reference cards from Make, local preview, Build, or Codex output manifests. They are not frames; open, pin, edit as frame, or clear stale cards.",
    objects: spatialObjects.filter(isManifestSpatialObject),
    collapsed: Boolean(state.outputLaneCollapsed),
    contextTitle: "Output shelf",
  });
  const historyLane = buildSpatialWorkspaceLane({
    id: SPATIAL_HISTORY_LANE_ID,
    kind: "history",
    title: "History lane",
    description: Boolean(state.historyLaneCollapsed)
      ? "Checkpoint trail is compressed to keep the Map focused. Expand it when you need to inspect saved collaboration moments."
      : "Checkpoint trail for the current collaboration session. Drag cards out if a saved moment belongs with another frame, variant, or output.",
    objects: spatialObjects.filter(isCheckpointSpatialObject),
    collapsed: Boolean(state.historyLaneCollapsed),
    contextTitle: "History lane",
  });

  return [outputLane, historyLane].filter(Boolean);
}

function buildSpatialTimeline(
  frameSelection = state.frames,
  spatialObjects = state.spatialObjects,
  lanes = buildSpatialWorkspaceLanes(spatialObjects),
) {
  const selectedIds = new Set(currentSelectedSpatialObjectIds());
  const frameItems = frameSelection.map((frame, index) => {
    const status = describeFrameOutputStatus(frame, {
      includeGlobal: frame.id === state.activeFrameId,
    });
    return {
      id: `timeline-frame-${frame.id}`,
      type: "frame",
      frameId: frame.id,
      label: frame.title || `Frame ${index + 1}`,
      description: status?.label || "Frame sketch",
      order: index,
      status: status?.label || "",
      kindLabel: frame.variant?.label ? "Variant frame" : "Frame",
      active: frame.id === state.activeFrameId,
      entry: frame.id === state.entryFrameId,
      linkedCount: countFrameConnections(frame.id),
      position: flowPositionForFrame(frame, index),
    };
  });
  const outputItems = sortSpatialLaneObjects(
    spatialObjects.filter(isManifestSpatialObject),
  ).map((object, index) => buildSpatialTimelineObjectItem(object, index, selectedIds));
  const branchItems = buildSpatialVariantBranches(frameSelection).map((branch) =>
    buildSpatialTimelineBranchItem(branch, selectedIds),
  );
  const checkpointItems = sortSpatialLaneObjects(
    spatialObjects.filter(isCheckpointSpatialObject),
  ).map((object, index) =>
    buildSpatialTimelineObjectItem(object, index, selectedIds),
  );
  const outputLane = lanes.find((lane) => lane.id === SPATIAL_OUTPUT_LANE_ID);
  const historyLane = lanes.find((lane) => lane.id === SPATIAL_HISTORY_LANE_ID);
  const tracks = [
    {
      id: "frames",
      kind: "frames",
      title: "Frames",
      description: "Frame and variant sequence.",
      collapsed: false,
      items: frameItems,
    },
    {
      id: "branches",
      kind: "branches",
      title: "Branches",
      description:
        "Variant and output-edit branches with source-frame lineage.",
      collapsed: false,
      items: branchItems,
    },
    {
      id: SPATIAL_OUTPUT_LANE_ID,
      kind: "outputs",
      title: "Outputs",
      description:
        outputLane?.description || "Generated screen/file/code references.",
      collapsed: Boolean(outputLane?.collapsed),
      items: outputItems,
    },
    {
      id: SPATIAL_HISTORY_LANE_ID,
      kind: "history",
      title: "Checkpoints",
      description: historyLane?.description || "Saved collaboration moments.",
      collapsed: Boolean(historyLane?.collapsed),
      items: checkpointItems,
    },
  ];
  const summary = {
    frames: frameItems.length,
    branches: branchItems.length,
    outputs: outputItems.length,
    checkpoints: checkpointItems.length,
    selectedCount: selectedIds.size,
    collapsedLanes: tracks
      .filter((track) => track.collapsed)
      .map((track) => track.id),
  };
  return {
    kind: "canvax-spatial-timeline",
    schemaVersion: 1,
    activeFrameId: state.activeFrameId,
    entryFrameId: state.entryFrameId,
    selectedObjectIds: [...selectedIds],
    summary,
    tracks,
    contextMarkdown: buildSpatialTimelineContextMarkdown(tracks, summary),
  };
}

function buildSpatialTimelineBranchItem(branch, selectedIds = new Set()) {
  const frame = frameById(branch.frameId);
  const sourceTitle =
    branch.sourceFrameTitle || frameTitleById(branch.sourceFrameId) || "Source";
  const outputBinding = branch.outputBinding || null;
  return {
    id: `timeline-branch-${branch.frameId}`,
    type: "branch",
    branchId: branch.id,
    objectId: branch.spatialObjectId || "",
    frameId: branch.frameId,
    sourceFrameId: branch.sourceFrameId,
    label: branch.label || branch.title || "Branch",
    description: outputBinding
      ? `Output edit branch from ${sourceTitle} bound to ${outputBinding.target || outputBinding.href || outputBinding.objectId}.`
      : `Editable variant branch from ${sourceTitle}.`,
    order: Number.isFinite(branch.index) ? branch.index : 0,
    status: branch.primary
      ? "Primary branch"
      : outputBinding
        ? "Output edit"
        : "Variant branch",
    kindLabel: "Branch",
    active: branch.frameId === state.activeFrameId,
    entry: branch.frameId === state.entryFrameId,
    selected:
      Boolean(branch.spatialObjectId) && selectedIds.has(branch.spatialObjectId),
    primary: Boolean(branch.primary),
    outputBinding,
    position: branch.position,
    title: frame?.title || branch.title || "",
  };
}

function buildSpatialTimelineObjectItem(object, index, selectedIds = new Set()) {
  return {
    id: `timeline-object-${object.id}`,
    type: object.type,
    objectId: object.id,
    frameId: object.frameIds?.[0] || "",
    label: spatialObjectTitle(object),
    description: object.subtitle || spatialObjectSourceLabel(object),
    order: Number.isFinite(object.meta?.laneIndex)
      ? object.meta.laneIndex
      : index,
    laneId: object.meta?.laneId || "",
    status: spatialObjectFooterStatus(object),
    kindLabel: spatialObjectSourceLabel(object),
    selected: selectedIds.has(object.id),
    pinned: isSpatialObjectPinned(object),
    locked: isSpatialObjectLocked(object),
    layerLabel: spatialObjectLayerLabel(object),
    position: {
      x: object.x,
      y: object.y,
    },
  };
}

function buildSpatialTimelineContextMarkdown(tracks, summary) {
  return [
    "## Map timeline",
    "",
    `Frames: ${summary.frames}`,
    `Branches: ${summary.branches || 0}`,
    `Outputs: ${summary.outputs}`,
    `Checkpoints: ${summary.checkpoints}`,
    "",
    ...tracks.flatMap((track) => [
      `### ${track.title}`,
      track.items.length
        ? track.items
            .map((item) => `- ${item.label} (${item.status || item.kindLabel})`)
            .join("\n")
        : "- Empty",
      "",
    ]),
  ].join("\n");
}

function buildSpatialWorkspaceLane({
  id,
  kind,
  title,
  description,
  objects,
  collapsed = false,
  contextTitle = title,
}) {
  const laneObjects = sortSpatialLaneObjects(Array.isArray(objects) ? objects : []);
  if (!laneObjects.length) {
    return null;
  }

  const bounds = unionBounds(laneObjects.map(spatialObjectBounds));
  if (!bounds) {
    return null;
  }

  const laneBounds = makeBounds(
    Math.max(16, bounds.left - SPATIAL_HISTORY_LANE_PADDING),
    Math.max(16, bounds.top - SPATIAL_HISTORY_LANE_PADDING - 34),
    bounds.right + SPATIAL_HISTORY_LANE_PADDING,
    collapsed
      ? Math.max(16, bounds.top - SPATIAL_HISTORY_LANE_PADDING - 34) + 92
      : bounds.bottom + SPATIAL_HISTORY_LANE_PADDING,
  );

  return {
    id,
    kind,
    title,
    description,
    memberObjectIds: laneObjects.map((object) => object.id),
    collapsed,
    position: {
      x: laneBounds.left,
      y: laneBounds.top,
    },
    size: {
      width: laneBounds.width,
      height: laneBounds.height,
    },
    contextMarkdown: [
      `## ${contextTitle}`,
      "",
      `State: ${collapsed ? "collapsed" : "expanded"}`,
      "",
      description,
      "",
      "Objects:",
      ...laneObjects.map(
        (object) =>
          `- ${spatialObjectTitle(object)} (${spatialObjectFooterStatus(object)})`,
      ),
    ].join("\n"),
  };
}

function buildSpatialWorkspaceObject(object, spatialGrouping) {
  const groupHierarchy = spatialObjectGroupHierarchyForExport(
    object,
    spatialGrouping,
  );
  return {
    id: object.id,
    type: object.type,
    title: object.title,
    subtitle: object.subtitle,
    prompt: cleanString(object.meta?.prompt),
    sourceKind: object.sourceKind,
    sourceId: object.sourceId,
    status: object.status,
    pinned: isSpatialObjectPinned(object),
    locked: isSpatialObjectLocked(object),
    layerIndex: spatialObjectLayerIndex(object),
    layerLabel: spatialObjectLayerLabel(object),
    laneId: object.meta?.laneId || "",
    customProperties: normalizeMapCustomProperties(
      object.meta?.customProperties,
    ),
    frameIds: object.frameIds || [],
    groupIds: spatialGrouping.objectGroupIds.get(object.id) || [],
    groupHierarchy,
    position: { x: object.x, y: object.y },
    size: {
      width: object.width || SPATIAL_OBJECT_WIDTH,
      height: object.height || SPATIAL_OBJECT_HEIGHT,
    },
    inspector: buildMapObjectInspectorContract(object, spatialGrouping),
    contextMarkdown: buildSpatialObjectContextText(object),
    meta: object.meta || {},
  };
}

function spatialObjectGroupHierarchyForExport(object, spatialGrouping) {
  if (!object || !spatialGrouping) {
    return null;
  }
  const groupNode = spatialGroupHierarchyNodeForObject(object, spatialGrouping);
  if (groupNode) {
    return {
      parentGroupIds: groupNode.parentGroupIds,
      childGroupIds: groupNode.childGroupIds,
      depth: groupNode.depth,
      pathGroupIds: groupNode.pathGroupIds,
      pathLabel: groupNode.pathLabel,
    };
  }

  const parentGroupIds = normalizeStringArray(
    spatialGrouping.objectGroupIds?.get(object.id) || [],
  );
  if (!parentGroupIds.length) {
    return null;
  }
  const groupNodes = Array.isArray(spatialGrouping.groupHierarchy?.nodes)
    ? spatialGrouping.groupHierarchy.nodes
    : [];
  const groupNodeById = new Map(groupNodes.map((node) => [node.id, node]));
  const deepestParent = parentGroupIds
    .map((id) => groupNodeById.get(id))
    .filter(Boolean)
    .sort((a, b) => (b.depth || 0) - (a.depth || 0))[0];
  const pathGroupIds = deepestParent?.pathGroupIds?.length
    ? deepestParent.pathGroupIds
    : parentGroupIds;
  const pathLabel = deepestParent?.pathLabel || parentGroupIds.join(" / ");
  return {
    parentGroupIds,
    childGroupIds: [],
    depth: deepestParent ? (deepestParent.depth || 0) + 1 : parentGroupIds.length,
    pathGroupIds,
    pathLabel,
  };
}

function buildSpatialHandoffContext(frameSelection = state.frames) {
  const spatialWorkspace = buildSpatialWorkspaceExport(frameSelection);
  const selectedObjects = Array.isArray(spatialWorkspace.selectedObjects)
    ? spatialWorkspace.selectedObjects
    : [];
  return {
    kind: "canvax-spatial-context",
    note:
      "Use selected Map object prompts, notes, positions, and contextMarkdown as explicit designer guidance for this handoff.",
    viewport: spatialWorkspace.viewport,
    objectFilter: spatialWorkspace.objectFilter,
    selectedObjectId: spatialWorkspace.selectedObjectId,
    selectedObjectIds: spatialWorkspace.selectedObjectIds,
    selectedObject: spatialWorkspace.selectedObject,
    selectedObjects,
    prompts: selectedObjects
      .map((object) => ({
        objectId: object.id,
        title: object.title,
        prompt: object.prompt || "",
        contextMarkdown: object.contextMarkdown || "",
      }))
      .filter((entry) => entry.prompt || entry.contextMarkdown),
  };
}

function buildSpatialVariantBranches(frameSelection) {
  return frameSelection
    .filter((frame) => frame.variant?.sourceFrameId)
    .sort(compareVariantBranchFrames)
    .map((frame, index) => {
      const connection = state.connections.find(
        (candidate) =>
          candidate.fromFrameId === frame.variant.sourceFrameId &&
          candidate.toFrameId === frame.id,
      );
      const semanticRecipe = variantRecipeExport(
        frame.variant,
        Math.max(0, (Number(frame.variant.index) || index + 1) - 1),
      );
      return {
        id: `variant-branch-${frame.id}`,
        spatialObjectId: `variant-object-${frame.id}`,
        frameId: frame.id,
        title: frame.title,
        sourceFrameId: frame.variant.sourceFrameId,
        sourceFrameTitle:
          frame.variant.sourceFrameTitle ||
          frameTitleById(frame.variant.sourceFrameId),
        label: semanticRecipe.label,
        direction: semanticRecipe.direction,
        recipeId: semanticRecipe.id,
        thesis: semanticRecipe.thesis,
        designMoves: semanticRecipe.designMoves,
        prompt: semanticRecipe.prompt,
        styleProperties: semanticRecipe.styleProperties,
        customProperties: semanticRecipe.customProperties,
        semanticRecipe,
        index: Number(frame.variant.index) || 0,
        primary: Boolean(frame.variant.primary),
        promotedAt: frame.variant.promotedAt || "",
        outputBinding:
          frame.variant.outputObjectId ||
          frame.variant.outputTarget ||
          frame.variant.outputHref
            ? {
                objectId: frame.variant.outputObjectId || "",
                sourceKind: frame.variant.outputSourceKind || "",
                target: frame.variant.outputTarget || "",
                href: frame.variant.outputHref || "",
              }
            : null,
        editable: true,
        connectionId: connection?.id || "",
        connectionLabel: connection?.label || "",
        position: flowPositionForFrame(frame, index),
        size: {
          width: FLOW_CARD_WIDTH,
          height: FLOW_CARD_HEIGHT,
        },
      };
    });
}

function computeSpatialGroupMembership(frameSelection, spatialObjects) {
  const groups = spatialObjects.filter((object) => object.type === "map-group");
  const cardGroupIds = new Map();
  const objectGroupIds = new Map();

  const cardItems = frameSelection.map((frame, index) => ({
    id: frame.id,
    rect: flowCardRect(frame, index),
  }));
  const objectItems = spatialObjects.map((object) => ({
    id: object.id,
    type: object.type,
    rect: spatialObjectRect(object),
  }));

  const exportedGroups = groups.map((group) => {
    const groupRect = spatialObjectRect(group);
    const memberCardIds = cardItems
      .filter((item) => rectContainsRectCenter(groupRect, item.rect))
      .map((item) => item.id);
    const memberObjectIds = objectItems
      .filter(
        (item) =>
          item.id !== group.id &&
          item.type !== "map-group" &&
          rectContainsRectCenter(groupRect, item.rect),
      )
      .map((item) => item.id);
    const memberGroupIds = objectItems
      .filter(
        (item) =>
          item.id !== group.id &&
          item.type === "map-group" &&
          rectContainsRectCenter(groupRect, item.rect),
      )
      .map((item) => item.id);

    memberCardIds.forEach((cardId) => {
      appendMapArrayValue(cardGroupIds, cardId, group.id);
    });
    [...memberObjectIds, ...memberGroupIds].forEach((objectId) => {
      appendMapArrayValue(objectGroupIds, objectId, group.id);
    });

    return {
      id: group.id,
      title: group.title,
      subtitle: group.subtitle,
      status: group.status,
      position: { x: groupRect.x, y: groupRect.y },
      size: { width: groupRect.width, height: groupRect.height },
      memberCardIds,
      memberObjectIds,
      memberGroupIds,
      meta: group.meta || {},
    };
  });
  const groupHierarchy = buildSpatialGroupHierarchy(
    exportedGroups,
    objectGroupIds,
  );

  return {
    groups: exportedGroups,
    groupHierarchy,
    cardGroupIds,
    objectGroupIds,
  };
}

function buildSpatialGroupHierarchy(groups = [], objectGroupIds = new Map()) {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const parentGroupIdsById = new Map(
    groups.map((group) => [
      group.id,
      normalizeStringArray(objectGroupIds.get(group.id) || []).filter((id) =>
        groupById.has(id),
      ),
    ]),
  );
  const nodes = groups.map((group) => {
    const parentGroupIds = parentGroupIdsById.get(group.id) || [];
    const childGroupIds = normalizeStringArray(group.memberGroupIds).filter((id) =>
      groupById.has(id),
    );
    const pathGroupIds = buildSpatialGroupPathIds(
      group.id,
      parentGroupIdsById,
    );
    const pathLabels = pathGroupIds
      .map((id) => groupById.get(id)?.title || id)
      .filter(Boolean);
    return {
      id: group.id,
      title: group.title,
      parentGroupIds,
      parentLabels: parentGroupIds
        .map((id) => groupById.get(id)?.title || id)
        .filter(Boolean),
      childGroupIds,
      childLabels: childGroupIds
        .map((id) => groupById.get(id)?.title || id)
        .filter(Boolean),
      depth: Math.max(0, pathGroupIds.length - 1),
      pathGroupIds,
      pathLabels,
      pathLabel: pathLabels.join(" / "),
      memberCardIds: group.memberCardIds || [],
      memberObjectIds: group.memberObjectIds || [],
    };
  });
  const rootGroupIds = nodes
    .filter((node) => node.parentGroupIds.length === 0)
    .map((node) => node.id);
  const maxDepth = nodes.reduce(
    (depth, node) => Math.max(depth, node.depth || 0),
    0,
  );
  return {
    schemaVersion: 1,
    rootGroupIds,
    maxDepth,
    nodes,
    contextMarkdown: buildSpatialGroupHierarchyContextMarkdown(nodes),
  };
}

function buildSpatialGroupPathIds(groupId, parentGroupIdsById, seen = new Set()) {
  if (!groupId || seen.has(groupId)) {
    return [];
  }
  seen.add(groupId);
  const parentId = (parentGroupIdsById.get(groupId) || [])[0];
  return parentId
    ? [...buildSpatialGroupPathIds(parentId, parentGroupIdsById, seen), groupId]
    : [groupId];
}

function buildSpatialGroupHierarchyContextMarkdown(nodes = []) {
  return [
    "## Group hierarchy",
    "",
    ...(nodes.length
      ? nodes.map((node) => {
          const indent = "  ".repeat(Math.max(0, node.depth || 0));
          const childText = node.childLabels.length
            ? ` -> ${node.childLabels.join(", ")}`
            : "";
          return `${indent}- ${node.pathLabel || node.title}${childText}`;
        })
      : ["- No groups"]),
  ].join("\n");
}

function currentSpatialGroupHierarchyNode(group) {
  if (!group || group.type !== "map-group") {
    return null;
  }
  const grouping = computeSpatialGroupMembership(state.frames, state.spatialObjects);
  return spatialGroupHierarchyNodeForObject(group, grouping);
}

function spatialGroupHierarchyNodeForObject(object, spatialGrouping) {
  if (!object || object.type !== "map-group") {
    return null;
  }
  return (
    spatialGrouping?.groupHierarchy?.nodes?.find((node) => node.id === object.id) ||
    null
  );
}

function appendMapArrayValue(map, key, value) {
  const existing = map.get(key) || [];
  if (!existing.includes(value)) {
    existing.push(value);
  }
  map.set(key, existing);
}

function spatialObjectRect(object) {
  return {
    x: Number(object.x) || 0,
    y: Number(object.y) || 0,
    width: Number(object.width) || SPATIAL_OBJECT_WIDTH,
    height: Number(object.height) || SPATIAL_OBJECT_HEIGHT,
  };
}

function flowPositionForFrame(frame, index = 0) {
  const fallback = defaultFlowPosition(index);
  const x = Number(frame?.flowPosition?.x);
  const y = Number(frame?.flowPosition?.y);
  return {
    x: Number.isFinite(x) ? x : fallback.x,
    y: Number.isFinite(y) ? y : fallback.y,
  };
}

function flowCardRect(frame, index = 0) {
  const position = flowPositionForFrame(frame, index);
  return {
    x: position.x,
    y: position.y,
    width: FLOW_CARD_WIDTH,
    height: FLOW_CARD_HEIGHT,
  };
}

function buildSpatialGroupDragMemberOrigins(group) {
  const frameOrigins = new Map();
  const objectOrigins = new Map();
  collectSpatialGroupMemberOrigins(group, frameOrigins, objectOrigins);
  return {
    frames: [...frameOrigins.values()],
    objects: [...objectOrigins.values()],
  };
}

function collectSpatialGroupMemberOrigins(
  group,
  frameOrigins,
  objectOrigins,
  seenGroups = new Set(),
) {
  if (!group || group.type !== "map-group" || seenGroups.has(group.id)) {
    return;
  }
  seenGroups.add(group.id);
  const groupRect = spatialObjectRect(group);
  state.frames
    .filter((frame) => rectContainsRectCenter(groupRect, flowCardRect(frame)))
    .forEach((frame) => setOriginEntry(frameOrigins, spatialFrameOrigin(frame)));
  state.spatialObjects
    .filter(
      (object) =>
        object.id !== group.id &&
        !isSpatialObjectLocked(object) &&
        rectContainsRectCenter(groupRect, spatialObjectRect(object)),
    )
    .forEach((object) => {
      setOriginEntry(objectOrigins, spatialObjectOrigin(object));
      if (object.type === "map-group") {
        collectSpatialGroupMemberOrigins(
          object,
          frameOrigins,
          objectOrigins,
          seenGroups,
        );
      }
    });
}

function moveSpatialGroupMembers(memberOrigins, deltaX, deltaY) {
  if (!memberOrigins || typeof memberOrigins !== "object") {
    return;
  }

  (memberOrigins.frames || []).forEach((origin) => {
    const frame = frameById(origin.id);
    if (!frame) {
      return;
    }
    frame.flowPosition = {
      x: Math.max(32, origin.x + deltaX),
      y: Math.max(32, origin.y + deltaY),
    };
  });

  (memberOrigins.objects || []).forEach((origin) => {
    const object = spatialObjectById(origin.id);
    if (!object || isSpatialObjectLocked(object)) {
      return;
    }
    object.x = Math.max(32, origin.x + deltaX);
    object.y = Math.max(32, origin.y + deltaY);
  });
}

function resizeSpatialGroupMembers(memberOrigins, originGroup, nextGroup) {
  if (
    !memberOrigins ||
    !originGroup ||
    !nextGroup ||
    !originGroup.width ||
    !originGroup.height
  ) {
    return;
  }
  const scaleX = (nextGroup.width || originGroup.width) / originGroup.width;
  const scaleY = (nextGroup.height || originGroup.height) / originGroup.height;
  const originLeft = originGroup.x;
  const originTop = originGroup.y;
  const nextLeft = nextGroup.x;
  const nextTop = nextGroup.y;

  (memberOrigins.frames || []).forEach((origin) => {
    const frame = frameById(origin.id);
    if (!frame) {
      return;
    }
    frame.flowPosition = {
      x: Math.max(32, nextLeft + (origin.x - originLeft) * scaleX),
      y: Math.max(32, nextTop + (origin.y - originTop) * scaleY),
    };
  });

  (memberOrigins.objects || []).forEach((origin) => {
    const object = spatialObjectById(origin.id);
    if (!object || isSpatialObjectLocked(object)) {
      return;
    }
    object.x = Math.max(32, nextLeft + (origin.x - originLeft) * scaleX);
    object.y = Math.max(32, nextTop + (origin.y - originTop) * scaleY);
    object.width = Math.max(
      SPATIAL_OBJECT_MIN_WIDTH,
      (origin.width || SPATIAL_OBJECT_WIDTH) * scaleX,
    );
    object.height = Math.max(
      SPATIAL_OBJECT_MIN_HEIGHT,
      (origin.height || SPATIAL_OBJECT_HEIGHT) * scaleY,
    );
  });
}

function rectContainsRectCenter(container, child) {
  const center = {
    x: child.x + child.width / 2,
    y: child.y + child.height / 2,
  };
  return (
    center.x >= container.x &&
    center.x <= container.x + container.width &&
    center.y >= container.y &&
    center.y <= container.y + container.height
  );
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
    project: buildProjectExportMetadata(),
    designContext: currentDesignContextForExport(),
    designKit: buildDesignKitSummary(frames),
    board: structuredClone(state.board),
    activeFrameId: state.activeFrameId,
    activeFrameTitle: activeFrame?.title || frameTitleById(state.activeFrameId),
    rewriteQueue,
    voice: buildVoiceExport(state.frames),
    spatialContext: buildSpatialHandoffContext(frames),
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
      variant: frame.variant,
      outputEditBinding:
        frame.outputEditBinding || frameOutputEditBinding(frame),
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
  const styleLock = buildImageStyleLock(frames, generationRecipe);
  return {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    kind: "canvax-image-prompt-pack",
    generatedAt: new Date().toISOString(),
    requiresOpenAiApiKey: false,
    intendedHost:
      "Codex/ChatGPT image generation host lane, if available in the current chat.",
    actionMode: actionMode.id,
    actionModeLabel: actionMode.label,
    project: buildProjectExportMetadata(),
    designContext: currentDesignContextForExport(),
    designKit: buildDesignKitSummary(frames),
    activeFrameId: state.activeFrameId,
    activeFrameTitle: activeFrame?.title || frameTitleById(state.activeFrameId),
    board: {
      project: state.board.project,
      ask: state.board.goal,
      surface: state.board.audience,
      mood: state.board.designMood,
      generationRecipe,
    },
    spatialContext: buildSpatialHandoffContext(frames),
    styleLock,
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
          styleLock.summary,
        ]
          .filter(Boolean)
          .join(" | "),
        styleLock: buildFrameStyleLockReference(styleLock, frame),
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

function buildImageStyleLock(frames = [], generationRecipe = "") {
  const designKit = buildDesignKitSummary(frames);
  const designTokens = designKit.designTokens;
  const designContext = currentDesignContextForExport();
  const mood = cleanString(state.board.designMood);
  const surface = cleanString(state.board.audience);
  const project = cleanString(state.board.project) || "Canvax project";
  const ask = cleanString(state.board.goal);
  const frameSignals = frames.slice(0, 8).map((frame) => ({
    id: frame.id,
    title: frame.title,
    surface:
      typeof frame.viewport === "string"
        ? frame.viewport
        : frame.viewport?.id || "",
    intent: cleanString(frame.objective || frame.intent || ask),
    notes: compactDisplayText(
      [frame.notes, frame.assets, frame.mobile].filter(Boolean).join(" "),
      260,
    ),
  }));
  const summary = compactDisplayText(
    [
      project,
      mood ? `Mood: ${mood}` : "",
      surface ? `Surface: ${surface}` : "",
      generationRecipe ? `Generation: ${generationRecipe}` : "",
      designContext.exists ? `Design context: ${designContext.summary}` : "",
      designTokens ? `Sketch tokens: ${designTokens.summary}` : "",
    ]
      .filter(Boolean)
      .join(". "),
    420,
  );
  const tokenSwatches = (designTokens?.palette || []).map((entry) => entry.hex);

  return {
    kind: "canvax-style-lock",
    id: `style-${classToken(project).toLowerCase() || "canvax"}`,
    source: "board-design-kit-and-frame-notes",
    project,
    summary,
    mood,
    surface,
    generationRecipe,
    palette: {
      activeColor: state.color,
      swatches: [...new Set([state.color, ...tokenSwatches, ...palette])].slice(
        0,
        10,
      ),
    },
    continuityRules: [
      "Keep character/object identity consistent across frames and variants.",
      "Preserve the user's rough composition, camera angle, and relative placement unless the frame notes explicitly ask for a change.",
      "Reuse the same illustration/rendering language, color temperature, line weight, material treatment, and lighting logic across candidate images.",
      "Keep text-safe areas clean and avoid inventing unreadable lettering unless exact text is requested.",
    ],
    adaptationRules: [
      "For UI/web/app outputs, treat the sketch as layout hierarchy and preserve interaction affordances.",
      "For book, comic, storyboard, poster, or image outputs, treat the sketch as shot composition and preserve subject scale, motion arrows, and frame-to-frame continuity.",
      "For variants, change only the requested direction while keeping the locked visual identity intact.",
    ],
    negativeRules: [
      "Do not drift into generic AI-purple styling unless requested.",
      "Do not add unrelated logos, characters, limbs, UI controls, or background clutter.",
      "Do not ignore labels, arrows, safe zones, or output-correction marks.",
    ],
    designContext: {
      exists: Boolean(designContext.exists),
      relativePath: designContext.relativePath || "DESIGN.md",
      summary: compactDisplayText(designContext.summary || "", 420),
      excerpt: compactDisplayText(designContext.content || "", 1200),
    },
    designKit: {
      label: designKit.label,
      statusLabel: designKit.statusLabel,
      preset: designKit.preset,
      summary: designKit.summary,
    },
    designTokens: designTokens
      ? {
          sourceFrameId: designTokens.sourceFrameId,
          sourceFrameTitle: designTokens.sourceFrameTitle,
          palette: designTokens.palette,
          density: designTokens.density,
          visualSamples: designTokens.visualSamples,
          shapeLanguage: designTokens.shapeLanguage,
          typographyCue: designTokens.typographyCue,
          assetCue: designTokens.assetCue,
          semanticStructure: designTokens.semanticStructure,
          summary: designTokens.summary,
        }
      : null,
    frameSignals,
  };
}

function buildFrameStyleLockReference(styleLock, frame) {
  if (!styleLock) {
    return null;
  }
  return {
    id: styleLock.id,
    summary: styleLock.summary,
    continuityRules: styleLock.continuityRules,
    adaptationRules: styleLock.adaptationRules,
    frameIntent: cleanString(frame.objective || state.board.goal),
    frameAssets: cleanString(frame.assets),
    frameVariantNotes: cleanString(frame.mobile),
  };
}

function buildAssetCandidatePack(imagePromptPack) {
  const frames = Array.isArray(imagePromptPack?.frames)
    ? imagePromptPack.frames
    : [];
  const existingById = new Map(
    (state.assetCandidatePack?.candidates || []).map((candidate) => [
      candidate.id,
      candidate,
    ]),
  );
  const candidates = frames
    .flatMap((frame) => buildFrameAssetCandidates(frame))
    .map((candidate) =>
      mergeAssetCandidateReview(candidate, existingById.get(candidate.id)),
    )
    .map(normalizeAssetCandidate)
    .filter(Boolean);
  return {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    kind: "canvax-asset-candidates",
    createdAt: new Date().toISOString(),
    requiresOpenAiApiKey: false,
    sourcePromptPackPath: "exports/canvax-image-prompt-pack-latest.json",
    intendedHost:
      "Codex/ChatGPT image generation host lane, if available in the current chat.",
    project: buildProjectExportMetadata(),
    board: structuredClone(imagePromptPack?.board || state.board),
    designContext:
      imagePromptPack?.designContext || currentDesignContextForExport(),
    styleLock: imagePromptPack?.styleLock || buildImageStyleLock(frames),
    usage:
      "Use these prompt-ready records as image generation candidates. Paste or attach generated outputs back to the matching frame/region when available.",
    reviewSummary: buildAssetCandidateReviewSummary(candidates),
    candidates,
  };
}

function mergeAssetCandidateReview(candidate, existing) {
  if (!existing) {
    return candidate;
  }
  const outputSlots = Array.isArray(existing.outputSlots)
    ? structuredClone(existing.outputSlots)
    : candidate.outputSlots;
  return {
    ...candidate,
    status: existing.status || candidate.status,
    outputSlots,
  };
}

function buildFrameAssetCandidates(frame) {
  const composition = frame.composition || {};
  const elements = Array.isArray(composition.elements)
    ? composition.elements
    : [];
  const regionElements = elements.filter(isAssetCandidateElement).slice(0, 4);
  const frameCandidate = {
    id: `asset-${frame.id}-frame`,
    type: "frame-composite",
    status: "prompt-ready",
    sourceFrameId: frame.id,
    sourceFrameTitle: frame.title,
    frameIndex: frame.index,
    title: `${frame.title} full-frame candidate`,
    prompt: frame.prompt,
    negativePrompt: frame.negativePrompt,
    styleLock: frame.styleLock || null,
    bounds: null,
    placement: "whole frame",
    aspectRatio: frame.viewport?.aspectRatio || "",
    htmlCssScaffold: frame.htmlCssScaffold,
    sourceSketch: frame.sketchReference || {},
    outputSlots: [
      {
        label: "Generated image",
        imagePath: "",
        accepted: false,
        notes:
          "Paste, drop, or attach the generated image back to this frame when available.",
      },
    ],
  };

  return [
    frameCandidate,
    ...regionElements.map((element) => {
      const aspectRatio =
        element.bounds?.w && element.bounds?.h
          ? `${Math.max(1, Math.round(element.bounds.w * 1000))}:${Math.max(1, Math.round(element.bounds.h * 1000))}`
          : frame.viewport?.aspectRatio || "";
      return {
        id: `asset-${frame.id}-${element.id}`,
        type: "region",
        status: "prompt-ready",
        sourceFrameId: frame.id,
        sourceFrameTitle: frame.title,
        frameIndex: frame.index,
        sourceElementId: element.id,
        title: `${frame.title} ${element.role}`,
        prompt: [
          frame.prompt,
          frame.styleLock?.summary
            ? `Keep style lock: ${frame.styleLock.summary}.`
            : "",
          `Focus this candidate on the ${element.role} at ${element.placement}.`,
          element.text ? `Respect label/text: ${element.text}.` : "",
        ]
          .filter(Boolean)
          .join(" "),
        negativePrompt: frame.negativePrompt,
        styleLock: frame.styleLock || null,
        bounds: element.bounds,
        placement: element.placement,
        aspectRatio,
        htmlCssScaffold: frame.htmlCssScaffold,
        sourceSketch: frame.sketchReference || {},
        outputSlots: [
          {
            label: "Generated region image",
            imagePath: "",
            accepted: false,
            notes:
              "Paste, drop, or attach the generated region image back onto this element/region.",
          },
        ],
      };
    }),
  ];
}

function isAssetCandidateElement(element) {
  const role = String(element?.role || "").toLowerCase();
  if (!element || !element.bounds) {
    return false;
  }
  return (
    role.includes("image") ||
    role.includes("avatar") ||
    role.includes("spotlight") ||
    role.includes("asset") ||
    role.includes("illustration") ||
    role.includes("visual") ||
    role.includes("large content region")
  );
}

function currentFrameById(frameId) {
  return state.frames.find((frame) => frame.id === frameId) || null;
}

function spatialObjectById(objectId) {
  return state.spatialObjects.find((object) => object.id === objectId) || null;
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
    text:
      element.type === "label"
        ? element.text || ""
        : element.type === "image"
          ? element.sourceName || "image asset"
          : "",
    color: element.color || "",
    strokeSize: element.size || 0,
    assetCandidateId: element.assetCandidateId || "",
    prototype: normalizeElementPrototype(element.prototype),
    hasEmbeddedImage:
      element.type === "image" && Boolean(element.imageDataUrl || element.src),
    imageSource:
      element.type === "image"
        ? cleanString(element.src || element.sourceName || "")
        : "",
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
  if (element.type === "image") {
    return "placed image asset, generated candidate, reference, or visual source";
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

function appendSpatialContextMarkdown(lines, spatialContext) {
  if (!spatialContext || typeof spatialContext !== "object") {
    return;
  }
  const selectedObjects = Array.isArray(spatialContext.selectedObjects)
    ? spatialContext.selectedObjects
    : [];
  const prompts = Array.isArray(spatialContext.prompts)
    ? spatialContext.prompts
    : [];
  if (!selectedObjects.length && !prompts.length) {
    return;
  }

  lines.push("", "## Selected Map Context", "");
  if (spatialContext.selectedObjectIds?.length) {
    lines.push(
      `- Selected objects: ${spatialContext.selectedObjectIds.join(", ")}`,
    );
  }
  const viewport = spatialContext.viewport || {};
  if (viewport.visibleBounds) {
    lines.push(
      `- Viewed map region: ${Math.round(viewport.visibleBounds.left || 0)}, ${Math.round(viewport.visibleBounds.top || 0)} to ${Math.round(viewport.visibleBounds.right || 0)}, ${Math.round(viewport.visibleBounds.bottom || 0)}`,
    );
  }
  prompts.slice(0, 8).forEach((entry, index) => {
    lines.push(
      `- ${index + 1}. ${entry.title || entry.objectId}: ${
        entry.prompt || compactDisplayText(entry.contextMarkdown || "", 180)
      }`,
    );
  });
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
    `- Design kit: ${taskPack.designKit?.statusLabel || "Board rules active"}`,
    "",
    "## Instruction",
    "Use this task pack with the live Canvax export to build, refine, write a spec, or generate image prompts. Prefer frame composition and voice notes over guessing.",
  ];
  if (taskPack.designKit?.sources?.length) {
    lines.push("", "## Design Kit", taskPack.designKit.summary || "");
    taskPack.designKit.sources.slice(0, 8).forEach((source) => {
      lines.push(`- ${source.label}: ${compactDisplayText(source.detail || "", 220)}`);
    });
  }
  appendSpatialContextMarkdown(lines, taskPack.spatialContext);
  lines.push("", "## Frames");
  taskPack.frames.forEach((frame) => {
    const variantSuffix = frame.variant?.label
      ? ` [variant: ${frame.variant.label} from ${frame.variant.sourceFrameTitle || frame.variant.sourceFrameId}]`
      : "";
    const outputEditSuffix = frame.outputEditBinding
      ? ` [output edit target: ${frame.outputEditBinding.target || frame.outputEditBinding.href || frame.outputEditBinding.objectId}]`
      : "";
    lines.push(`- ${frame.index}. ${frame.title}${variantSuffix}${outputEditSuffix}: ${frame.intent || "No intent specified"} (${frame.composition.elements.length} composition elements)`);
  });
  return lines.join("\n");
}

function buildRewriteRequestMarkdown(request) {
  if (!request) {
    return "";
  }
  const lines = [
    `# ${(request.board?.project || "Canvax").trim()} rewrite request`,
    "",
    `- Kind: ${request.kind}`,
    `- Generated: ${request.generatedAt}`,
    `- Active frame: ${request.activeFrameTitle || request.activeFrameId}`,
    `- Requires OpenAI API key: ${request.requiresOpenAiApiKey ? "yes" : "no"}`,
    `- Queued frames: ${request.rewriteQueue?.length || 0}`,
    "",
    "## Codex Instruction",
    request.instruction,
    "",
    "## Handoff Files",
    `- Live JSON: ${request.handoff?.liveJsonPath}`,
    `- Task pack: ${request.handoff?.taskPackJsonPath}`,
    `- Preview manifest: ${request.handoff?.previewManifestPath}`,
    `- Codex output manifest: ${request.handoff?.codexOutputManifestPath}`,
  ];
  appendSpatialContextMarkdown(lines, request.spatialContext);
  lines.push("", "## Rewrite Queue");
  if (request.rewriteQueue?.length) {
    request.rewriteQueue.forEach((item) => {
      lines.push(
        `- ${item.index}. ${item.title}: ${item.label} (${item.reason}) - ${item.detail || "No detail"}`,
      );
    });
  } else {
    lines.push("- No queued frames. Use the active frame and latest notes.");
  }
  lines.push("", "## Relevant Frames");
  request.frames?.forEach((frame) => {
    lines.push(
      `- ${frame.title}: ${frame.intent || "No intent"}; output marks: ${frame.outputAnnotationCount || 0}; captures: ${frame.captureCount || 0}`,
    );
    if (frame.outputEditBinding) {
      lines.push(
        `  - Output edit target: ${frame.outputEditBinding.target || frame.outputEditBinding.href || frame.outputEditBinding.objectId}`,
      );
    }
  });
  return lines.join("\n");
}

function buildBuildRealRequest(frame, exportPackage, exportResult) {
  const exportFrames = Array.isArray(exportPackage?.frames)
    ? exportPackage.frames
    : state.frames;
  const taskPack = exportPackage?.taskPack || buildTaskPack(exportFrames);
  const activeTaskFrame =
    taskPack.frames.find((candidate) => candidate.id === frame.id) ||
    taskPack.frames[0] ||
    null;
  const imagePromptFrame =
    exportPackage?.imagePromptPack?.frames?.find(
      (candidate) => candidate.id === frame.id,
    ) || null;
  const actionMode = currentActionMode();
  const generation = normalizeGenerationConfig(state.board.generation);
  const frameId = frame.id;
  const outputEditBinding =
    activeTaskFrame?.outputEditBinding || frameOutputEditBinding(frame);
  const spatialContext =
    taskPack.spatialContext || buildSpatialHandoffContext(exportFrames);
  const spatialWorkspace =
    exportPackage?.spatialWorkspace || buildSpatialWorkspaceExport(exportFrames);
  const implementationContext = buildImplementationContext({
    frame,
    activeTaskFrame,
    imagePromptFrame,
    imageStyleLock: exportPackage?.imagePromptPack?.styleLock || null,
    spatialContext,
    spatialWorkspace,
    generation,
    outputEditBinding,
  });
  const project = buildProjectExportMetadata();

  return {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    kind: "canvax-build-real-request",
    createdAt: new Date().toISOString(),
    source: "canvax-workbench",
    requiresOpenAiApiKey: false,
    actionMode: actionMode.id,
    actionModeLabel: actionMode.label,
    actionModeDescription: actionMode.description,
    project,
    board: {
      project: state.board.project,
      goal: state.board.goal,
      surface: state.board.audience,
      mood: state.board.designMood,
      generationRecipe: generationSummaryText(generation),
    },
    activeFrameId: frameId,
    frame: activeTaskFrame,
    imagePromptFrame,
    outputEditBinding,
    implementationContext,
    spatialContext,
    voice: taskPack.voice || buildVoiceExport(state.frames),
    designContext: taskPack.designContext || currentDesignContextForExport(),
    designKit: implementationContext.designKit || taskPack.designKit || null,
    generation,
    handoff: {
      liveJsonPath: "exports/canvax-live-latest.json",
      liveMarkdownPath: "exports/canvax-live-latest.md",
      taskPackJsonPath: "exports/canvax-task-pack-latest.json",
      taskPackMarkdownPath: "exports/canvax-task-pack-latest.md",
      checkpointPath: "exports/canvax-checkpoint-latest.json",
      imagePromptPackPath: "exports/canvax-image-prompt-pack-latest.json",
      buildRequestJsonPath: "exports/canvax-build-real-latest.json",
      buildRequestMarkdownPath: "exports/canvax-build-real-latest.md",
      projectBuildRequestJsonPath: project.handoff.buildRequestJsonPath,
      projectBuildRequestMarkdownPath: project.handoff.buildRequestMarkdownPath,
      projectCheckpointPath: project.handoff.checkpointJsonPath,
      lastSavedExport: {
        jsonPath: exportResult?.jsonPath || "",
        markdownPath: exportResult?.markdownPath || "",
        projectJsonPath: exportResult?.projectJsonPath || "",
        projectMarkdownPath: exportResult?.projectMarkdownPath || "",
        taskPackJsonPath: exportResult?.taskPackJsonPath || "",
        imagePromptPackJsonPath: exportResult?.imagePromptPackJsonPath || "",
      },
    },
    outputContract: {
      manifestPath: "artifacts/canvax/codex-output.json",
      previewManifestPath: "exports/canvax-preview-manifest.json",
      publishCommand: `node scripts/write-codex-output.mjs --from-git-status --frame ${frameId} --url http://localhost:<app-port>`,
      publishArtifactCommand: `node scripts/write-codex-output.mjs --from-git-status --frame ${frameId} --preview-path <workspace-html-path>`,
      frameBinding: {
        frameId,
        frameTitle: frame.title,
        expectedTargetTypes: ["route", "component", "html-artifact"],
      },
      outputEditBinding,
    },
    codexInstructions: [
      "Read this request, the live export, task pack, checkpoint, and DESIGN.md if present before changing files.",
      "Build actual app/page/component files in the current workspace, not only a Canvax materialized mock.",
      "Respect the sketch geometry, labels, voice notes, output correction marks, and generation recipe as design intent.",
      "If outputEditBinding is present, use it as the concrete generated-output target for this correction branch.",
      "Run the relevant project checks after implementation.",
      "Publish the result back into Canvax with scripts/write-codex-output.mjs so Preview and Workbench can bind the generated output to this frame.",
    ],
    doneDefinition: [
      "A real route, component, page, HTML artifact, or app screen exists in workspace files.",
      "The output is bound to the source frame through artifacts/canvax/codex-output.json.",
      "Preview or Workbench can open the generated target.",
      "Changed files and artifacts are listed in the Codex output manifest.",
      "No OpenAI API key is required by the Canvax handoff itself.",
    ],
    nonGoals: [
      "Do not call paid APIs from Canvax to satisfy this request.",
      "Do not replace the original sketch frame with generated code.",
      "Do not treat the local Generate screen artifact as production output unless the user explicitly accepts it.",
    ],
  };
}

function buildImplementationContext({
  frame,
  activeTaskFrame,
  imagePromptFrame,
  imageStyleLock,
  spatialContext,
  spatialWorkspace,
  generation,
  outputEditBinding,
}) {
  const workspaceMode =
    workspaceModes.find((entry) => entry.id === state.workspaceMode) ||
    workspaceModes[0];
  const selectedObjects = Array.isArray(spatialContext?.selectedObjects)
    ? spatialContext.selectedObjects
    : [];
  const selectedPrompts = Array.isArray(spatialContext?.prompts)
    ? spatialContext.prompts
    : [];
  const timelineSummary = spatialWorkspace?.timeline?.summary || {};
  const branchContext = buildImplementationVariantContext(
    frame,
    activeTaskFrame,
    spatialWorkspace,
  );
  const styleLock = imageStyleLock || imagePromptFrame?.styleLock || null;
  const designKit = buildDesignKitSummary(state.frames);

  return {
    kind: "canvax-implementation-context",
    purpose:
      "Designer-facing context for Codex real-code generation. Treat this as the bridge between rough sketch, Workbench mode, Map objects, variants, voice, image direction, and output binding.",
    workbench: {
      ...buildWorkbenchExport({ agentLogLimit: 6 }),
      workspaceModeDescription: workspaceMode.description,
      generationRecipe: generationSummaryText(generation),
    },
    frameRole: {
      id: frame?.id || activeTaskFrame?.id || "",
      title: frame?.title || activeTaskFrame?.title || "",
      viewport: frame?.viewport || activeTaskFrame?.viewport || "",
      isVariant: Boolean(branchContext),
      isOutputEditBranch: Boolean(outputEditBinding),
      outputEditBinding,
    },
    variant: branchContext,
    selectedMapContext: {
      note:
        "Selected Map cards are direct designer guidance. Preserve prompts, constraints, and output references when building.",
      selectedObjectId: spatialContext?.selectedObjectId || "",
      selectedObjectIds: spatialContext?.selectedObjectIds || [],
      viewport: spatialContext?.viewport || null,
      objects: selectedObjects.slice(0, 8).map((object) => ({
        id: object.id,
        type: object.type,
        title: object.title,
        sourceKind: object.sourceKind,
        frameIds: object.frameIds || [],
        prompt: object.prompt || "",
        status: object.status || "",
        customProperties: object.customProperties || [],
        contextMarkdown: compactDisplayText(object.contextMarkdown || "", 1600),
      })),
      prompts: selectedPrompts.slice(0, 8).map((entry) => ({
        objectId: entry.objectId,
        title: entry.title,
        prompt: entry.prompt,
        contextMarkdown: compactDisplayText(entry.contextMarkdown || "", 900),
      })),
    },
    mapMemory: {
      frames: Number(timelineSummary.frames) || 0,
      branches: Number(timelineSummary.branches) || 0,
      outputs: Number(timelineSummary.outputs) || 0,
      checkpoints: Number(timelineSummary.checkpoints) || 0,
      collapsedLanes: timelineSummary.collapsedLanes || [],
    },
    designKit,
    imageDirection: styleLock
      ? {
          styleLockId: styleLock.id || "",
          summary: styleLock.summary || "",
          continuityRules: styleLock.continuityRules || [],
          adaptationRules: styleLock.adaptationRules || [],
          negativeRules: styleLock.negativeRules || [],
        }
      : null,
    codexPriority: [
      "Use the frame sketch and composition as the layout skeleton.",
      "Use Workbench action mode and generation recipe as the output type and tone.",
      "Use selected Map context and custom properties as hard designer constraints.",
      "If this is a variant branch, apply its recipe, design moves, and style knobs.",
      "If this is an output-edit branch, modify the referenced output target rather than inventing an unrelated screen.",
      "Publish real files or artifacts through the Codex output manifest so Canvax can keep the loop connected.",
    ],
  };
}

function buildImplementationVariantContext(frame, activeTaskFrame, spatialWorkspace) {
  const variant =
    (frame?.variant && typeof frame.variant === "object" && frame.variant) ||
    (activeTaskFrame?.variant &&
      typeof activeTaskFrame.variant === "object" &&
      activeTaskFrame.variant) ||
    null;
  if (!variant) {
    return null;
  }
  const branch = (spatialWorkspace?.variantBranches || []).find(
    (candidate) =>
      candidate.frameId === frame?.id || candidate.frameId === activeTaskFrame?.id,
  );
  const semanticRecipe =
    branch?.semanticRecipe ||
    variantRecipeExport(variant, Math.max(0, (Number(variant.index) || 1) - 1));
  const outputBinding =
    branch?.outputBinding ||
    frameOutputEditBinding(frame) ||
    activeTaskFrame?.outputEditBinding ||
    null;

  return {
    sourceFrameId:
      variant.sourceFrameId || branch?.sourceFrameId || outputBinding?.sourceFrameId || "",
    sourceFrameTitle:
      variant.sourceFrameTitle || branch?.sourceFrameTitle || outputBinding?.sourceFrameTitle || "",
    label: semanticRecipe.label || variant.label || "Variant",
    recipeId: semanticRecipe.id || variant.recipeId || "",
    direction: semanticRecipe.direction || variant.direction || "",
    thesis: semanticRecipe.thesis || variant.thesis || "",
    designMoves: semanticRecipe.designMoves || [],
    prompt: semanticRecipe.prompt || variant.prompt || "",
    styleProperties:
      semanticRecipe.styleProperties ||
      normalizeVariantStyleProperties(variant.styleProperties),
    customProperties:
      semanticRecipe.customProperties ||
      normalizeMapCustomProperties(variant.customProperties),
    index: Number(variant.index) || Number(branch?.index) || 0,
    primary: Boolean(variant.primary || branch?.primary),
    outputBinding,
  };
}

function appendImplementationContextMarkdown(lines, context) {
  if (!context) {
    return;
  }
  lines.push("", "## Designer Implementation Context", "");
  lines.push(`- Workbench path: ${context.workbench?.startPath || "Sketch -> Make"}`);
  lines.push(
    `- Current mode: ${context.workbench?.workspaceModeLabel || context.workbench?.workspaceMode || "Workbench"} / ${context.workbench?.focusLabel || context.workbench?.focus || "Sketch"}`,
  );
  lines.push(
    `- Action: ${context.workbench?.actionModeLabel || context.workbench?.actionMode || "Build UI"}`,
  );
  lines.push(
    `- Generation recipe: ${context.workbench?.generationRecipe || "Product UI - Studio - Balanced"}`,
  );
  if (context.designKit) {
    lines.push(
      `- Design kit: ${context.designKit.statusLabel || context.designKit.label || "Board rules active"}`,
    );
  }
  if (context.frameRole?.isOutputEditBranch && context.frameRole.outputEditBinding) {
    lines.push(
      `- Output edit target: ${context.frameRole.outputEditBinding.target || context.frameRole.outputEditBinding.href || context.frameRole.outputEditBinding.objectId}`,
    );
  }
  if (context.designKit?.sources?.length) {
    lines.push("", "### Design Kit", "");
    lines.push(context.designKit.summary || "Use the active board rules.");
    context.designKit.sources.slice(0, 8).forEach((source) => {
      lines.push(
        `- ${source.label}: ${compactDisplayText(source.detail || "", 220)}`,
      );
    });
  }
  if (context.variant) {
    lines.push("", "### Variant / Branch Direction", "");
    lines.push(`- Label: ${context.variant.label || "Variant"}`);
    lines.push(`- Recipe: ${context.variant.recipeId || "custom"}`);
    if (context.variant.thesis) {
      lines.push(`- Thesis: ${context.variant.thesis}`);
    }
    if (context.variant.prompt) {
      lines.push(`- Prompt: ${context.variant.prompt}`);
    }
    if (context.variant.designMoves?.length) {
      context.variant.designMoves
        .slice(0, 8)
        .forEach((move) => lines.push(`- Design move: ${move}`));
    }
    const styleProperties = context.variant.styleProperties || {};
    const styleEntries = Object.entries(styleProperties).filter(([, value]) =>
      cleanString(value),
    );
    if (styleEntries.length) {
      lines.push("- Style knobs:");
      styleEntries.forEach(([key, value]) => {
        lines.push(`  - ${key}: ${value}`);
      });
    }
  }
  const selectedObjects = context.selectedMapContext?.objects || [];
  if (selectedObjects.length) {
    lines.push("", "### Selected Map Guidance", "");
    selectedObjects.slice(0, 6).forEach((object, index) => {
      lines.push(
        `- ${index + 1}. ${object.title || object.id} (${object.sourceKind || object.type || "object"}): ${object.prompt || compactDisplayText(object.contextMarkdown || "", 220)}`,
      );
    });
  }
  if (context.imageDirection?.summary) {
    lines.push("", "### Image / Style Lock", "");
    lines.push(`- ${context.imageDirection.summary}`);
  }
}

function buildBuildRealRequestMarkdown(request) {
  if (!request) {
    return "";
  }
  const frame = request.frame || {};
  const compositionElements = Array.isArray(frame.composition?.elements)
    ? frame.composition.elements.slice(0, 16)
    : [];
  const voiceSegments = Array.isArray(request.voice?.segments)
    ? request.voice.segments.slice(0, 8)
    : [];
  const lines = [
    "# Canvax Build Real Request",
    "",
    `- Kind: ${request.kind}`,
    `- Created: ${request.createdAt}`,
    `- Requires OpenAI API key: ${request.requiresOpenAiApiKey ? "yes" : "no"}`,
    `- Project: ${request.board?.project || "Canvax"}`,
    `- Active frame: ${frame.title || request.activeFrameId}`,
    `- Action mode: ${request.actionModeLabel || request.actionMode}`,
    `- Design context: ${request.designContext?.exists ? request.designContext.relativePath : "No DESIGN.md found"}`,
    `- Design kit: ${request.designKit?.statusLabel || request.implementationContext?.designKit?.statusLabel || "Board rules active"}`,
    "",
    "## Objective",
    request.board?.goal ||
      "Build a real app/page/screen from the active Canvax frame.",
    "",
    "## Read First",
    `- Live export: \`${request.handoff.liveJsonPath}\``,
    `- Task pack: \`${request.handoff.taskPackJsonPath}\``,
    `- Checkpoint: \`${request.handoff.checkpointPath}\``,
    `- Image prompt pack: \`${request.handoff.imagePromptPackPath}\``,
  ];
  appendImplementationContextMarkdown(lines, request.implementationContext);
  appendSpatialContextMarkdown(lines, request.spatialContext);
  lines.push(
    "",
    "## Active Frame",
    `- Frame id: \`${request.activeFrameId}\``,
    `- Surface: ${frame.viewport || "unknown"} ${frame.viewportWidth || ""}x${frame.viewportHeight || ""}`.trim(),
    `- Intent: ${frame.intent || "No explicit intent"}`,
    `- Notes: ${frame.notes || "No explicit structure notes"}`,
    `- Behavior: ${frame.behavior || "No behavior notes"}`,
    `- Assets: ${frame.assets || "No asset notes"}`,
    `- Variants: ${frame.variants || "No variant notes"}`,
    request.outputEditBinding
      ? `- Output edit target: ${request.outputEditBinding.target || request.outputEditBinding.href || request.outputEditBinding.objectId}`
      : "",
    "",
    "## Composition Elements",
  );

  if (compositionElements.length) {
    compositionElements.forEach((element) => {
      lines.push(
        `- ${element.index}. ${element.type} as ${element.role} at ${element.placement}: ${JSON.stringify(element.bounds)}`,
      );
    });
  } else {
    lines.push("- No structured elements found. Use notes, voice, and screenshots.");
  }

  lines.push("", "## Voice / Spoken Notes");
  if (voiceSegments.length) {
    voiceSegments.forEach((segment) => {
      lines.push(`- ${segment.scope || "frame"}: ${segment.text}`);
    });
  } else {
    lines.push("- No voice notes captured for this request.");
  }

  lines.push(
    "",
    "## Codex Output Contract",
    `- Manifest: \`${request.outputContract.manifestPath}\``,
    "- After implementing real files, publish the binding with one of:",
    `  - \`${request.outputContract.publishCommand}\``,
    `  - \`${request.outputContract.publishArtifactCommand}\``,
    "",
    "## Codex Instructions",
  );
  request.codexInstructions.forEach((item) => lines.push(`- ${item}`));

  lines.push("", "## Done Definition");
  request.doneDefinition.forEach((item) => lines.push(`- ${item}`));

  lines.push("", "## Non-Goals");
  request.nonGoals.forEach((item) => lines.push(`- ${item}`));

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
    `- Design kit: ${pack.designKit?.statusLabel || "Board rules active"}`,
    "",
    "## How To Use",
    "Use the prompt, composition map, and HTML/CSS scaffold as placement guidance for ChatGPT image generation. The scaffold is a spatial reference, not production code.",
  ];
  if (pack.designKit?.sources?.length) {
    lines.push("", "## Design Kit", pack.designKit.summary || "");
    pack.designKit.sources.slice(0, 8).forEach((source) => {
      lines.push(`- ${source.label}: ${compactDisplayText(source.detail || "", 220)}`);
    });
  }
  appendSpatialContextMarkdown(lines, pack.spatialContext);
  appendStyleLockMarkdown(lines, pack.styleLock);
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

function buildAssetCandidatePackMarkdown(pack) {
  if (!pack) {
    return "";
  }
  const candidates = Array.isArray(pack.candidates) ? pack.candidates : [];
  const lines = [
    `# ${(pack.board?.project || "Canvax").trim()} asset candidates`,
    "",
    `- Requires OpenAI API key: ${pack.requiresOpenAiApiKey ? "yes" : "no"}`,
    `- Intended host: ${pack.intendedHost}`,
    `- Source prompt pack: ${pack.sourcePromptPackPath}`,
    `- Candidates: ${candidates.length}`,
    "",
    "## How To Use",
    "Use these prompt-ready candidates with the current Codex/ChatGPT image-generation host when available. Canvax stores the prompt, bounds, source frame, and empty output slots without calling a paid API.",
  ];
  appendStyleLockMarkdown(lines, pack.styleLock);
  const reviewSummary =
    pack.reviewSummary || buildAssetCandidateReviewSummary(candidates);
  lines.push(
    "",
    "## Review Summary",
    "",
    `- Kind: ${reviewSummary.kind || "canvax-asset-candidate-review"}`,
    `- Placement-ready: ${reviewSummary.placementReady || 0}`,
    `- Output slots: ${reviewSummary.slotCount || 0}`,
    `- Empty slots: ${reviewSummary.emptySlots || 0}`,
    `- Accepted: ${reviewSummary.accepted || 0}`,
    `- Attached: ${reviewSummary.attached || 0}`,
    `- Placed slots: ${reviewSummary.placed || 0}`,
    `- Prompt-ready: ${reviewSummary.promptReady || 0}`,
  );
  if (reviewSummary.acceptedCandidates?.length) {
    reviewSummary.acceptedCandidates.forEach((candidate) => {
      lines.push(
        `- Chosen: ${candidate.title} (${candidate.id}) -> ${
          candidate.imageElementId || "no image element"
        }`,
      );
    });
  }
  if (reviewSummary.groups?.length) {
    lines.push("", "### Review Groups", "");
    reviewSummary.groups.forEach((group) => {
      lines.push(
        `- ${group.frameTitle || group.frameId}: ${group.total || 0} candidates, ${group.promptReady || 0} pending, ${group.attached || 0} attached, ${group.accepted || 0} accepted`,
      );
    });
  }
  if (reviewSummary.hostHandoff?.workflow?.length) {
    lines.push("", "### Host Handoff", "");
    reviewSummary.hostHandoff.workflow.forEach((step) => {
      lines.push(`- ${step}`);
    });
  }
  candidates.forEach((candidate, index) => {
    lines.push("");
    lines.push(`## ${index + 1}. ${candidate.title}`);
    lines.push("");
    lines.push(`- Type: ${candidate.type}`);
    lines.push(`- Source frame: ${candidate.sourceFrameTitle}`);
    lines.push(`- Status: ${candidate.status}`);
    lines.push(`- Placement: ${candidate.placement}`);
    lines.push(`- Bounds: ${candidate.bounds ? JSON.stringify(candidate.bounds) : "whole frame"}`);
    lines.push(`- Aspect ratio: ${candidate.aspectRatio || "not specified"}`);
    if (candidate.placementMap) {
      const placement = candidate.placementMap;
      const pixel = placement.pixelBounds || {};
      const css = placement.cssPlacement || {};
      lines.push("");
      lines.push("### Placement Contract");
      lines.push("");
      lines.push(`- Slot id: ${placement.slotId}`);
      lines.push(`- Surface: ${placement.surface} ${placement.viewport?.width || "?"}x${placement.viewport?.height || "?"}`);
      lines.push(`- Normalized bounds: ${JSON.stringify(placement.normalizedBounds)}`);
      lines.push(`- Pixel bounds: ${pixel.left || 0}, ${pixel.top || 0}, ${pixel.width || 0}x${pixel.height || 0}`);
      lines.push(`- CSS placement: left ${css.left || "0%"}, top ${css.top || "0%"}, width ${css.width || "100%"}, height ${css.height || "100%"}`);
      lines.push(`- Target selector: \`${placement.targetSelector || ""}\``);
      lines.push("");
      lines.push("```html");
      lines.push(placement.htmlScaffold || "");
      lines.push("```");
    }
    const slots = Array.isArray(candidate.outputSlots)
      ? candidate.outputSlots
      : [];
    if (slots.length) {
      lines.push("");
      lines.push("### Output Slots");
      slots.forEach((slot, slotIndex) => {
        lines.push(
          `- ${slotIndex + 1}. ${slot.slotId || slot.id}: ${slot.status || (slot.accepted ? "accepted" : slot.attached ? "attached" : "empty")}${slot.imageElementId ? ` (${slot.imageElementId})` : ""} at ${slot.placement || candidate.placement || "unspecified"}`,
        );
      });
    }
    lines.push("");
    lines.push(candidate.prompt || "No prompt provided.");
  });
  return lines.join("\n");
}

function appendStyleLockMarkdown(lines, styleLock) {
  if (!styleLock || typeof styleLock !== "object") {
    return;
  }
  lines.push(
    "",
    "## Style Lock",
    "",
    `- Style id: ${styleLock.id || "canvax-style-lock"}`,
    `- Summary: ${styleLock.summary || "Use the board mood and frame notes as the shared style contract."}`,
    `- Palette: ${(styleLock.palette?.swatches || []).join(", ") || "not specified"}`,
  );
  if (styleLock.designContext?.exists) {
    lines.push(
      `- Design context: ${styleLock.designContext.relativePath || "DESIGN.md"}`,
    );
  }
  const continuityRules = Array.isArray(styleLock.continuityRules)
    ? styleLock.continuityRules
    : [];
  if (continuityRules.length) {
    lines.push("", "### Continuity Rules", "");
    continuityRules.forEach((rule) => lines.push(`- ${rule}`));
  }
  const adaptationRules = Array.isArray(styleLock.adaptationRules)
    ? styleLock.adaptationRules
    : [];
  if (adaptationRules.length) {
    lines.push("", "### Adaptation Rules", "");
    adaptationRules.forEach((rule) => lines.push(`- ${rule}`));
  }
  const negativeRules = Array.isArray(styleLock.negativeRules)
    ? styleLock.negativeRules
    : [];
  if (negativeRules.length) {
    lines.push("", "### Avoid", "");
    negativeRules.forEach((rule) => lines.push(`- ${rule}`));
  }
}

async function saveImagePromptPackForHost(options = {}) {
  const { silent = false } = options;
  if (!silent) {
    renderStatus("Saving no-API image prompt and asset candidate packs...");
  }
  const exportPackage = await buildExportPackage();
  const result = await saveExportToWorkspace({ silent: true });
  if (!result) {
    if (!silent) {
      renderStatus("Image prompt pack save failed");
    }
    return null;
  }
  const assetCandidatePack = buildAssetCandidatePack(
    exportPackage.imagePromptPack,
  );
  const assetResponse = await fetch("/api/save-asset-candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pack: assetCandidatePack,
      markdown: buildAssetCandidatePackMarkdown(assetCandidatePack),
    }),
  });
  const assetData = await assetResponse.json();
  if (!assetResponse.ok) {
    if (!silent) {
      renderStatus("Asset candidate save failed");
      dom.workspaceStatus.textContent =
        assetData.error || "Asset candidate save failed.";
    }
    return {
      exportResult: result,
      assetCandidateResult: null,
    };
  }
  const path =
    assetData.latestImageGenerationBriefMarkdownPath ||
    assetData.latestMarkdownPath ||
    "exports/canvax-image-generation-brief-latest.md";
  state.assetCandidatePack = normalizeAssetCandidatePack(
    assetData.assetCandidatePack || assetCandidatePack,
  );
  syncSpatialObjectsFromHandoffs();
  dom.workspaceStatus.textContent = `Image generation brief ready at ${path}`;
  state.focusLastAppliedText =
    "Image generation brief, prompt pack, and asset candidates ready. Ask Codex/ChatGPT image generation to use the brief.";
  persistState();
  renderAssetCandidateTray();
  renderFocusPad();
  if (!silent) {
    renderStatus("Asset candidates ready for host image generation");
  }
  return {
    exportResult: result,
    assetCandidateResult: assetData,
  };
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
    "checkpoint-replay": "Checkpoint replay",
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
  const bounds =
    annotation.normalizedBounds ||
    annotation.bounds ||
    outputAnnotationBounds(annotation);
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
    bounds,
    normalizedBounds: bounds,
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
    project: buildProjectExportMetadata(),
    board: structuredClone(state.board),
    activeFrameId: state.activeFrameId,
    activeFrameTitle: frame?.title || "",
    frameId: state.activeFrameId,
    frameTitle: frame?.title || "",
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
            projectJsonPath: exportResult.projectJsonPath || "",
            projectMarkdownPath: exportResult.projectMarkdownPath || "",
            projectRegistryJsonPath: exportResult.projectRegistryJsonPath || "",
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

  if (element.type === "image") {
    return {
      ...base,
      start: normalizeMaterializePoint(element.start),
      end: normalizeMaterializePoint(element.end),
      imageDataUrl: cleanString(element.imageDataUrl || element.src),
      sourceName: cleanString(element.sourceName),
      assetCandidateId: cleanString(element.assetCandidateId),
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
    project: buildProjectExportMetadata(),
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
      variant: frame.variant,
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
        rewriteRequestMarkdown: buildRewriteRequestMarkdown(
          exportPackage.rewriteRequest,
        ),
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
    syncSpatialObjectsFromHandoffs();
    renderCodexOutput();
    renderFlowBoard();
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
        project: buildProjectExportMetadata(),
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
    syncSpatialObjectsFromHandoffs();
    renderCodexOutput();
    renderFlowBoard();
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
      body: JSON.stringify({
        clear: true,
        project: buildProjectExportMetadata(),
        frameId: currentFrame()?.id || "",
        frameTitle: currentFrame()?.title || "",
      }),
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
    syncSpatialObjectsFromHandoffs();
    renderCodexOutput();
    renderFlowBoard();
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
  const projectId = syncProjectRegistryFromSnapshot(snapshot);
  writeProjectSnapshot(projectId, snapshot);
  writeStorageJson(STORAGE_KEY, snapshot);
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
    workbench: buildWorkbenchExport(),
    project: buildProjectExportMetadata(),
    liveMarkdown: buildPromptMarkdown(),
    liveVoiceMarkdown: buildVoiceMarkdown(),
    previewManifest: state.serverStatus.previewManifest || null,
    rewriteQueue,
    liveExport: {
      generatedAt: new Date().toISOString(),
      transport: currentTransportDescriptor(),
      workspaceMode: state.workspaceMode,
      workbench: buildWorkbenchExport(),
      project: buildProjectExportMetadata(),
      board: structuredClone(state.board),
      activeFrameId: state.activeFrameId,
      entryFrameId: state.entryFrameId,
      rewriteQueue,
      spatialWorkspace: buildSpatialWorkspaceExport(),
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
    workbenchFocus: source.workbenchFocus,
    workbenchTrayCollapsed: Boolean(source.workbenchTrayCollapsed),
    assetCandidatePack: source.assetCandidatePack || null,
    spatialObjects: source.spatialObjects || [],
    hiddenSpatialObjectIds: source.hiddenSpatialObjectIds || [],
    selectedSpatialObjectId: source.selectedSpatialObjectId || null,
    selectedSpatialObjectIds: source.selectedSpatialObjectIds || [],
    outputLaneCollapsed: Boolean(source.outputLaneCollapsed),
    historyLaneCollapsed: Boolean(source.historyLaneCollapsed),
    mapObjectFilter: normalizeMapObjectFilter(source.mapObjectFilter),
    mapObjectSearch: normalizeMapSearchQuery(source.mapObjectSearch),
    connections: source.connections,
    entryFrameId: source.entryFrameId,
    activeFrameId: source.activeFrameId,
    tool: source.tool,
    color: source.color,
    size: source.size,
    grid: source.grid,
    autoSnap: source.autoSnap,
    autoRewrite: Boolean(source.autoRewrite),
    zoom: source.zoom,
    flowZoom: source.flowZoom,
    saveNotice: source.saveNotice,
    statusText: source.statusText,
  };
}

function renderFrameOutputBadge(status) {
  if (!status?.label) {
    return "";
  }
  const label = frameOutputBadgeCompactLabel(status.label);
  const title = status.detail || status.label;
  return `<span class="frame-status-badge ${escapeHtml(status.tone || "muted")}" title="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
}

function frameOutputBadgeCompactLabel(label) {
  switch (cleanString(label).toLowerCase()) {
    case "generated screen":
      return "Made";
    case "output synced":
      return "Synced";
    case "output stale":
      return "Stale";
    case "global target":
      return "Global";
    default:
      return label || "";
  }
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
    label: artifact.label || "Generated screen artifact",
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
    designerOutputTargetLabelFromItem(target, frame.title) ||
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
        ? "Generated screen"
        : "Output synced",
    tone: materialized ? "active" : "synced",
    detail:
      detail ||
      (generatedScreen
        ? "This frame has a connected generated screen."
        : materialized
        ? "This frame has a connected generated screen."
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
    createProject,
    duplicateProject,
    deleteProject,
    switchProject,
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
  setSelfTestProgress("starting");
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
    setSelfTestProgress("basic render assertions");
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
        dom.projectPicker.options.length >= 1 &&
          dom.projectPicker.value === state.projectRegistry.activeProjectId &&
          dom.focusProjectPicker.options.length ===
            dom.projectPicker.options.length &&
          dom.focusProjectPicker.value === state.projectRegistry.activeProjectId &&
          dom.workspaceProjectsButton?.textContent.includes(state.board.project),
        "project switchers and command-deck launcher render active project",
      ),
    );
    openProjectBrowser();
    results.push(
      assert(
        projectBrowserIsOpen() &&
          dom.projectBrowserGrid.querySelectorAll(".project-browser-card")
            .length >= 1,
        "project browser renders local project cards",
      ),
    );
    closeProjectBrowser();
    results.push(assertWorkspaceModeGuide());
    results.push(
      assert(
        ["slide", "bookSpread", "storyboard", "comicPage"].every(
          (id) => viewportPresets[id] && viewportPresets[id].width,
        ),
        "designer surface presets render",
      ),
    );
    results.push(
      assert(
        actionModes.length === dom.focusActionModeSelect.options.length,
        "Workbench action modes render",
      ),
    );
    results.push(
      assert(
        dom.designKitPresetSelect.options.length ===
          availableDesignKitPresets().length + 1,
        "design kit presets render",
      ),
    );
    const presetApplied = applyDesignKitPreset("product-studio", {
      capture: false,
      silent: true,
    });
    const appliedKit = buildDesignKitSummary();
    results.push(
      assert(
        presetApplied &&
          state.board.designKitPreset === "product-studio" &&
          state.board.actionMode === "build-ui" &&
          state.board.generation.direction === "product" &&
          appliedKit.preset?.id === "product-studio" &&
          dom.designKitSources.textContent.includes("Kit: Product app"),
        "design kit preset applies and exports active kit context",
      ),
    );
    const repositoryPreset = repositoryDesignKitPresets()[0] || null;
    if (repositoryPreset) {
      const repositoryApplied = applyDesignKitPreset(repositoryPreset.id, {
        capture: false,
        silent: true,
      });
      const repositoryKit = buildDesignKitSummary();
      results.push(
        assert(
          repositoryApplied &&
            repositoryKit.preset?.source?.path?.startsWith("design-kits/"),
          "repository design kit presets render and export source path",
        ),
      );
    }
    const previousDesignKitSearch = state.designKitSearch;
    state.designKitSearch = "scythian";
    populateViewportSelect();
    const filteredKitLabels = [...dom.designKitPresetSelect.options].map(
      (option) => option.textContent,
    );
    results.push(
      assert(
        filteredKitLabels.some((label) =>
          label.toLowerCase().includes("scythian"),
        ),
        "design kit search filters built-in and repository kits",
      ),
    );
    state.designKitSearch = previousDesignKitSearch;
    populateViewportSelect();
    results.push(
      assert(
        workbenchFocusModes.length ===
          dom.workbenchFocusButtons.querySelectorAll("[data-workbench-focus]")
            .length,
        "Workbench focus modes render",
      ),
    );
    renderWorkbenchPromptChips();
    const firstPromptChip = dom.focusPromptChips.querySelector(
      "[data-workbench-prompt]",
    );
    results.push(
      assert(
        workbenchPromptChips.length ===
          dom.focusPromptChips.querySelectorAll("[data-workbench-prompt]")
            .length &&
          dom.workbenchComposerChips.querySelectorAll("[data-workbench-prompt]")
            .length === workbenchPromptChips.length,
        "Workbench quick prompt chips render in tray and scratchpad composer",
      ),
    );
    results.push(
      assert(
        firstPromptChip?.dataset.workbenchPrompt === "design-context" &&
          firstPromptChip.textContent.includes("Start with your design"),
        "Workbench quick prompts start with design context import",
      ),
    );
    results.push(
      assert(
        dom.designerStartActions?.querySelectorAll("[data-designer-start]")
          .length === 4,
        "Designer start actions render",
      ),
    );
    const previousStartState = {
      workspaceMode: state.workspaceMode,
      workbenchFocus: state.workbenchFocus,
      workbenchTrayCollapsed: state.workbenchTrayCollapsed,
      viewMode: state.viewMode,
      tool: state.tool,
    };
    applyDesignerStartAction("sketch");
    const sketchStartOk =
      state.workspaceMode === "simple" &&
      state.workbenchFocus === "sketch" &&
      state.viewMode === "frame" &&
      state.workbenchTrayCollapsed === true &&
      state.tool === "pen";
    applyDesignerStartAction("map");
    const mapStartOk =
      state.workspaceMode === "simple" &&
      state.workbenchFocus === "map" &&
      state.viewMode === "flow" &&
      state.workbenchTrayCollapsed === true;
    Object.assign(state, previousStartState);
    renderAll();
    results.push(
      assert(
        sketchStartOk && mapStartOk,
        "Designer start actions route to sketch and map focus",
      ),
    );
    results.push(
      assert(
        Boolean(dom.workbenchComposerInput) &&
          Boolean(dom.workbenchComposerTalk) &&
          Boolean(dom.workbenchComposerNote) &&
          Boolean(dom.workbenchComposerPin) &&
          Boolean(dom.workbenchComposerMake) &&
          Boolean(dom.workbenchComposerApply) &&
          Boolean(dom.focusAddImage) &&
          Boolean(dom.focusImageInput) &&
          Boolean(dom.focusAddContext) &&
          Boolean(dom.workbenchReviewOutput) &&
          Boolean(dom.workbenchOutputStageReview) &&
          Boolean(dom.focusVoiceIntents) &&
          Boolean(dom.workbenchAgentLog) &&
          Boolean(dom.workbenchAgentLogToggle),
        "Workbench composer, context import, review controls, voice intent lane, and agent log render",
      ),
    );
    const previousPinState = {
      workspaceMode: state.workspaceMode,
      workbenchFocus: state.workbenchFocus,
      workbenchTrayCollapsed: state.workbenchTrayCollapsed,
      viewMode: state.viewMode,
      spatialObjects: [...state.spatialObjects],
      voice: {
        ...state.voice,
        segments: [...state.voice.segments],
      },
    };
    updateManualVoiceDraft("Move the generated hero art to the right", {
      render: false,
    });
    const pinnedComposerNote = pinComposerInstructionToMap({
      focusMap: false,
    });
    const pinComposerOk =
      pinnedComposerNote?.meta?.createdFrom === "workbench-composer" &&
      pinnedComposerNote?.meta?.prompt?.includes("hero art") &&
      state.voice.segments[0]?.provider === "map-note" &&
      state.voice.manualDraft === "";
    state.workspaceMode = previousPinState.workspaceMode;
    state.workbenchFocus = previousPinState.workbenchFocus;
    state.workbenchTrayCollapsed = previousPinState.workbenchTrayCollapsed;
    state.viewMode = previousPinState.viewMode;
    state.spatialObjects = previousPinState.spatialObjects;
    state.voice = previousPinState.voice;
    persistState();
    renderAll();
    results.push(
      assert(
        pinComposerOk,
        "Workbench composer pins instructions as Map notes and voice context",
      ),
    );
    const moreActions = document.querySelector(".focus-more-actions");
    const moreActionGrid = document.querySelector(".focus-more-action-grid");
    results.push(
      assert(
        Boolean(moreActions) &&
          Boolean(moreActionGrid) &&
          Boolean(moreActionGrid.querySelector("#focus-image-pack")) &&
          Boolean(moreActionGrid.querySelector("#focus-add-context")) &&
          Boolean(moreActionGrid.querySelector("#focus-auto-rewrite")),
        "Workbench secondary actions are grouped",
      ),
    );
    const initialDefaults = createInitialState();
    const migratedDenseMap = migratePersistedSnapshot(
      {
        version: 3,
        frames: initialDefaults.frames,
        mapObjectFilter: "all",
        outputLaneCollapsed: false,
        historyLaneCollapsed: false,
      },
      initialDefaults,
    );
    const migratedOutputFocus = migratePersistedSnapshot(
      {
        version: 3,
        frames: initialDefaults.frames,
        mapObjectFilter: "outputs",
        outputLaneCollapsed: false,
        historyLaneCollapsed: false,
      },
      initialDefaults,
    );
    results.push(
      assert(
        initialDefaults.outputLaneCollapsed === true &&
          initialDefaults.historyLaneCollapsed === true &&
          migratedDenseMap.outputLaneCollapsed === true &&
          migratedDenseMap.historyLaneCollapsed === true &&
          migratedOutputFocus.outputLaneCollapsed === false,
        "Map output/history shelves default to compressed designer focus",
      ),
    );
    const previousWorkspaceMode = state.workspaceMode;
    const previousTrayCollapsed = state.workbenchTrayCollapsed;
    state.workspaceMode = "simple";
    state.workbenchTrayCollapsed = false;
    renderWorkspaceMode();
    results.push(
      assert(
        getComputedStyle(dom.workbenchComposer).display === "none" &&
          getComputedStyle(dom.workbenchRail).display === "none",
        "Default Workbench keeps focus rail and composer hidden",
      ),
    );
    state.workbenchTrayCollapsed = true;
    renderWorkspaceMode();
    results.push(
      assert(
        document.body.dataset.workbenchTray === "collapsed" &&
          getComputedStyle(dom.workbenchComposer).display !== "none" &&
          getComputedStyle(dom.workbenchRail).display !== "none" &&
          !dom.workbenchFocusSummary.hidden &&
          dom.workbenchFocusSummary.textContent.includes(currentFrame().title) &&
          dom.workbenchFocusSummary.textContent.includes(
            currentActionMode().label,
          ),
        "Collapsed Workbench keeps current frame/action context visible",
      ),
    );
    state.workspaceMode = previousWorkspaceMode;
    state.workbenchTrayCollapsed = previousTrayCollapsed;
    renderWorkspaceMode();

    resetFrameForSelfTest();
    setSelfTestProgress("drawing tools");
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
    results.push(assertOutputAnnotationEraserRemovesMarks());
    const extractedTokens = await extractDesignTokensFromCurrentFrame({
      capture: false,
      silent: true,
    });
    const extractedKit = buildDesignKitSummary();
    results.push(
      assert(
        extractedTokens?.kind === "canvax-extracted-design-tokens" &&
          extractedTokens.elementMix.total > 0 &&
          extractedTokens.palette.length > 0 &&
          extractedKit.designTokens?.sourceFrameId === currentFrame().id &&
          dom.designKitSources.textContent.includes("Tokens:"),
        "design tokens extract from sketch and export through Design kit",
      ),
    );
    results.push(await assertVisualReferenceTokenExtraction());
    results.push(await assertExternalDesignTokenImport());
    results.push(assertWorkbenchRailSizeControls());
    setSelfTestProgress("image and asset candidates");
    results.push(await assertImageAssetPlacement());
    results.push(await assertAssetCandidateTrayPlacement());
    results.push(assertWorkbenchSpatialMap());
    results.push(assertSpatialObjectsFromOutputManifest());
    results.push(assertCheckpointSpatialObjects());
    results.push(await assertCheckpointReplayCreatesFrame());
    results.push(assertManualSpatialObjectControls());

    setSelfTestProgress("undo redo and frame flow");
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
    const prototypeSourceFrame = state.frames[0];
    const prototypeTargetFrame = state.frames[1];
    const prototypeElement = prototypeSourceFrame.elements.find(
      (element) => !isEraserElement(element),
    );
    state.activeFrameId = prototypeSourceFrame.id;
    if (prototypeElement) {
      setSelectedElements([prototypeElement.id], prototypeElement.id);
      updateSelectedElementPrototypeTarget(prototypeTargetFrame.id);
      updateSelectedElementPrototypeLabel("Tap self-test");
    }
    const prototypeComposition = buildFrameComposition(prototypeSourceFrame);
    results.push(
      assert(
        Boolean(prototypeElement?.prototype?.toFrameId) &&
          prototypeComposition.elements.some(
            (element) =>
              element.id === prototypeElement.id &&
              element.prototype?.toFrameId === prototypeTargetFrame.id,
          ),
        "selected element can become a prototype hotspot",
      ),
    );
    state.activeFrameId = prototypeTargetFrame.id;
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

    setSelfTestProgress("export package");
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
          exportPackage.taskPack?.designKit?.kind === "canvax-design-kit" &&
          exportPackage.taskPack?.hostLane?.requiresOpenAiApiKey === false,
        "task pack includes action mode, design kit, design context, and no-API host lane",
      ),
    );
    results.push(
      assert(
        exportPackage.rewriteRequest?.kind === "canvax-rewrite-request" &&
          exportPackage.rewriteRequest.requiresOpenAiApiKey === false &&
          Array.isArray(exportPackage.rewriteRequest.frames) &&
          Array.isArray(exportPackage.rewriteRequest.rewriteQueue) &&
          exportPackage.rewriteRequest.revisionGraph?.kind ===
            "canvax-output-revision-graph",
        "export package includes no-API rewrite request",
      ),
    );
    results.push(
      assert(
        exportPackage.imagePromptPack?.kind === "canvax-image-prompt-pack" &&
          exportPackage.imagePromptPack.requiresOpenAiApiKey === false &&
          exportPackage.imagePromptPack.designKit?.kind ===
            "canvax-design-kit" &&
          exportPackage.imagePromptPack.styleLock?.kind ===
            "canvax-style-lock" &&
          exportPackage.imagePromptPack.frames?.every(
            (frame) =>
              frame.styleLock?.id === exportPackage.imagePromptPack.styleLock.id,
          ),
        "export package includes no-API image prompt pack with style lock",
      ),
    );
    results.push(
      assert(
        exportPackage.assetCandidatePack?.kind ===
          "canvax-asset-candidates" &&
          exportPackage.assetCandidatePack.requiresOpenAiApiKey === false &&
          exportPackage.assetCandidatePack.styleLock?.kind ===
            "canvax-style-lock" &&
          Array.isArray(exportPackage.assetCandidatePack.candidates) &&
          exportPackage.assetCandidatePack.candidates.length > 0,
        "export package includes no-API asset candidate pack with style lock",
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
    setSelfTestProgress("asset candidate service save");
    const assetCandidateResponse = await fetch("/api/save-asset-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pack: exportPackage.assetCandidatePack,
        markdown: buildAssetCandidatePackMarkdown(
          exportPackage.assetCandidatePack,
        ),
      }),
    });
    const assetCandidateResult = await assetCandidateResponse.json();
    results.push(
      assert(
        assetCandidateResponse.ok &&
          assetCandidateResult?.assetCandidatePack?.kind ===
          "canvax-asset-candidates" &&
          assetCandidateResult.assetCandidatePack.requiresOpenAiApiKey ===
            false &&
          assetCandidateResult.candidateCount > 0,
        "asset candidates save as first-class no-API artifact",
        assetCandidateResult?.latestMarkdownPath ||
          "Asset candidate save did not return a latest markdown path.",
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

    setSelfTestProgress("workspace export");
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
    setSelfTestProgress("rewrite request execution");
    const rewriteExecutionResult = await executeLatestRewriteRequest({
      exportResult,
      frameId: state.activeFrameId,
    });
    results.push(
      assert(
        rewriteExecutionResult?.executed === true &&
          Boolean(rewriteExecutionResult.previewPath) &&
          Boolean(rewriteExecutionResult.contextPath) &&
          Boolean(rewriteExecutionResult.manifestPath),
        "rewrite request executes and binds a refined preview artifact",
        rewriteExecutionResult?.error ||
          "Rewrite request did not execute into a bound preview artifact.",
      ),
    );
    setSelfTestProgress("live rewrite automation");
    state.autoRewrite = true;
    renderAutomationControls();
    const liveRewriteResult = await maybeExecuteLiveRewriteFromFreeze(
      exportResult,
      "selftest-live-rewrite",
    );
    state.autoRewrite = false;
    renderAutomationControls();
    results.push(
      assert(
        liveRewriteResult?.executed === true &&
          state.serverStatus.rewriteExecution?.trigger === "live-rewrite",
        "live rewrite executes from saved handoff when armed",
      ),
    );
    state.autoRewrite = true;
    state.liveRewriteInFlight = true;
    const queuedRewriteResult = await maybeExecuteLiveRewriteFromFreeze(
      exportResult,
      "selftest-queued-live-rewrite",
    );
    const queuedRewrite = state.liveRewriteQueued;
    state.liveRewriteInFlight = false;
    state.liveRewriteQueued = null;
    state.autoRewrite = false;
    renderAutomationControls();
    results.push(
      assert(
        queuedRewriteResult?.queued === true &&
          queuedRewrite?.reason === "selftest-queued-live-rewrite",
        "live rewrite queues newer handoff while a rewrite is in flight",
      ),
    );
    setSelfTestProgress("materialize");
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
    if (materializeResult?.previewPath) {
      const materializedHtml = await fetch(
        `/workspace/${materializeResult.previewPath}`,
        { cache: "no-store" },
      ).then((response) => (response.ok ? response.text() : ""));
      results.push(
        assert(
          materializedHtml.includes('data-show-blueprint="false"') &&
            materializedHtml.includes('data-show-notes="false"') &&
            materializedHtml.includes("Show sketch overlay") &&
            materializedHtml.includes("Show note overlay"),
          "materialized output keeps sketch and notes as opt-in review aids",
        ),
      );
    }
    results.push(await assertStrokeOnlyGenerateScreen());
    setSelfTestProgress("build real request");
    const buildRealResult = await buildRealScreenWithCodex({
      silent: true,
      announce: false,
    });
    results.push(
      assert(
        buildRealResult?.request?.kind === "canvax-build-real-request" &&
          buildRealResult.request.requiresOpenAiApiKey === false &&
          buildRealResult.request.outputContract?.manifestPath ===
            "artifacts/canvax/codex-output.json" &&
          buildRealResult.request.implementationContext?.kind ===
            "canvax-implementation-context" &&
          buildRealResult.request.designKit?.kind === "canvax-design-kit" &&
          buildRealResult.request.implementationContext.designKit?.kind ===
            "canvax-design-kit" &&
          buildRealResult.request.implementationContext.workbench?.startPath?.includes(
            "Sketch",
          ) &&
          buildRealResult.request.implementationContext.workbench?.agentLog
            ?.kind === "canvax-workbench-agent-log",
        "build real request creates no-API frame-to-code contract with design kit, designer context, and agent log",
        buildRealResult?.latestMarkdownPath ||
          "Build real request did not return a latest markdown path.",
      ),
    );
    results.push(
      assert(
        buildRealResult?.executeResult?.executed === true &&
          Boolean(buildRealResult.executeResult.previewPath) &&
          Boolean(buildRealResult.executeResult.manifestPath) &&
          Array.isArray(buildRealResult.executeResult.implementationFiles) &&
          buildRealResult.executeResult.implementationFiles.some((file) =>
            file.path?.endsWith("/implementation/index.html"),
          ) &&
          buildRealResult.executeResult.implementationFiles.some((file) =>
            file.path?.endsWith("/implementation/styles.css"),
          ),
        "build real request executes and binds a frame preview plus implementation bundle",
        buildRealResult?.executeResult?.error ||
          "Build request did not execute into a bound preview artifact and implementation bundle.",
      ),
    );
    if (buildRealResult?.latestMarkdownPath) {
      const buildRequestMarkdown = await fetch(
        `/workspace/${buildRealResult.latestMarkdownPath}`,
        { cache: "no-store" },
      ).then((response) => (response.ok ? response.text() : ""));
      results.push(
        assert(
          buildRequestMarkdown.includes("Canvax Build Real Request") &&
            buildRequestMarkdown.includes("Requires OpenAI API key: no") &&
            buildRequestMarkdown.includes("Designer Implementation Context") &&
            buildRequestMarkdown.includes("write-codex-output"),
          "build real request writes readable Codex handoff markdown",
        ),
      );
    }
    if (buildRealResult?.executeResult?.contextPath) {
      const buildExecutionContext = await fetch(
        `/workspace/${buildRealResult.executeResult.contextPath}`,
        { cache: "no-store" },
      ).then((response) => (response.ok ? response.json() : null));
      results.push(
        assert(
          buildExecutionContext?.implementationContext?.kind ===
            "canvax-implementation-context",
          "build executor preserves designer implementation context",
        ),
      );
    }
    setSelfTestProgress("variant branches");
    const variantSourceId = currentFrame().id;
    const beforeVariantCount = state.frames.length;
    const variantFrames = createVariantFramesFromCurrent({
      silent: true,
      sync: false,
    });
    const variantFrameIds = new Set(variantFrames.map((frame) => frame.id));
    results.push(
      assert(
        variantFrames.length === 3 &&
          state.frames.length === beforeVariantCount + 3 &&
          variantFrames.every(
            (frame) =>
              frame.variant?.sourceFrameId === variantSourceId &&
              frame.elements.some(
                (element) =>
                  element.type === "label" &&
                  String(element.text || "").startsWith("Variant "),
              ),
          ),
        "create variants produces editable lineage frames",
      ),
    );
    results.push(
      assert(
        variantFrames.every((frame) =>
          state.connections.some(
            (connection) =>
              connection.fromFrameId === variantSourceId &&
              connection.toFrameId === frame.id &&
              connection.label.startsWith("variant:"),
          ),
        ),
        "create variants connects branches in flow view",
      ),
    );
    renderFlowBoard();
    results.push(
      assert(
        variantFrames.every((frame) => {
          const card = dom.flowBoard.querySelector(
            `[data-flow-frame-id='${frame.id}'].variant`,
          );
          return (
            card &&
            card.querySelector(".flow-card-lineage")?.textContent.includes(
              currentFrameById(variantSourceId)?.title || "",
            )
          );
        }),
        "variant frames render as visible branch cards",
      ),
    );
    results.push(
      assert(
        variantFrames.every((frame) =>
          Boolean(
            dom.flowBoard.querySelector(
              `[data-promote-variant-frame='${frame.id}']`,
            ),
          ),
        ),
        "variant cards expose primary-branch action in Map",
      ),
    );
    const variantSpatialExport = buildSpatialWorkspaceExport();
    results.push(
      assert(
        variantSpatialExport.variantBranches.length >= 3 &&
          variantFrames.every((frame) =>
            variantSpatialExport.variantBranches.some(
              (branch) =>
                branch.frameId === frame.id &&
                branch.sourceFrameId === variantSourceId &&
                branch.editable === true &&
                branch.semanticRecipe?.id === frame.variant?.recipeId &&
                Array.isArray(branch.semanticRecipe?.designMoves) &&
                branch.semanticRecipe.designMoves.length >= 3 &&
                branch.prompt === frame.variant?.prompt,
            ),
          ),
        "variant branches export editable semantic recipes",
      ),
    );
    results.push(
      assert(
        variantFrames.every((frame) =>
          variantSpatialExport.objects.some(
            (object) =>
              object.id === `variant-object-${frame.id}` &&
              object.sourceKind === "variant-branch" &&
              object.frameIds.includes(frame.id) &&
              object.prompt === frame.variant?.prompt &&
              object.customProperties?.some(
                (property) =>
                  property.key === "variant-recipe" &&
                  property.value === frame.variant?.recipeId,
              ),
          ),
        ) &&
          variantFrames.every((frame) =>
            Boolean(
              dom.flowBoard.querySelector(
                `[data-spatial-object-id='variant-object-${frame.id}'].variant-branch`,
              ),
            ),
          ),
        "variant branches render and export as editable semantic Map objects",
      ),
    );
    const styledVariantFrame = variantFrames[0];
    selectSpatialObject(`variant-object-${styledVariantFrame.id}`, {
      render: true,
      announce: false,
    });
    const styleEdited =
      updateSelectedVariantStyleProperty(
        "palette",
        "self-test red, aged paper, deep ink",
      ) &&
      updateSelectedVariantStyleProperty(
        "motion",
        "self-test parallax reveal",
      );
    const styledVariantExport = buildSpatialWorkspaceExport();
    const styledBranch = styledVariantExport.variantBranches.find(
      (branch) => branch.frameId === styledVariantFrame.id,
    );
    const styledObject = styledVariantExport.objects.find(
      (object) => object.id === `variant-object-${styledVariantFrame.id}`,
    );
    results.push(
      assert(
        styleEdited &&
          styledVariantFrame.variant?.styleProperties?.palette ===
            "self-test red, aged paper, deep ink" &&
          styledBranch?.styleProperties?.motion ===
            "self-test parallax reveal" &&
          styledBranch?.semanticRecipe?.styleProperties?.palette ===
            "self-test red, aged paper, deep ink" &&
          styledObject?.meta?.variantStyle?.palette ===
            "self-test red, aged paper, deep ink" &&
          styledObject?.contextMarkdown.includes("## Variant Style") &&
          dom.mapVariantStyleEditor?.hidden === false &&
          dom.mapVariantStylePalette?.value ===
            "self-test red, aged paper, deep ink",
        "variant style knobs edit and export branch-level design properties",
        JSON.stringify({
          styleEdited,
          frameStyle: styledVariantFrame.variant?.styleProperties || null,
          branchStyle: styledBranch?.styleProperties || null,
          semanticStyle: styledBranch?.semanticRecipe?.styleProperties || null,
          objectStyle: styledObject?.meta?.variantStyle || null,
          contextHasVariantStyle: Boolean(
            styledObject?.contextMarkdown?.includes("## Variant Style"),
          ),
          styleEditorHidden: dom.mapVariantStyleEditor?.hidden,
          paletteInput: dom.mapVariantStylePalette?.value,
        }),
      ),
    );
    const branchTimelineTrack = variantSpatialExport.timeline?.tracks?.find(
      (track) => track.id === "branches",
    );
    const branchTimelineExported =
      variantSpatialExport.timeline?.summary?.branches >= 3 &&
      branchTimelineTrack?.items?.length >= 3 &&
      variantFrames.every((frame) =>
        branchTimelineTrack.items.some(
          (item) =>
            item.type === "branch" &&
            item.frameId === frame.id &&
            item.sourceFrameId === variantSourceId,
        ),
      );
    state.viewMode = "flow";
    renderFlowBoard();
    const branchTimelineRendered =
      dom.mapTimeline?.textContent.includes("Branches") &&
      variantFrames.every((frame) =>
        Boolean(
          dom.mapTimeline.querySelector(
            `[data-map-timeline-type='branch'][data-map-timeline-id='${frame.id}']`,
          ),
        ),
      );
    const branchTimelineFocused = focusMapTimelineBranch(variantFrames[0].id);
    results.push(
      assert(
        branchTimelineExported &&
          branchTimelineRendered &&
          branchTimelineFocused &&
          state.activeFrameId === variantFrames[0].id,
        "variant branches appear in the Map timeline and can focus branch frames",
      ),
    );
    selectSpatialObject(`variant-object-${variantFrames[0].id}`, {
      render: true,
      announce: false,
    });
    const branchCanMoveLater = canReorderSelectedVariantBranches("later");
    const branchMovedLater = reorderSelectedSpatialSequence("later");
    const movedLaterExport = buildSpatialWorkspaceExport();
    const movedLaterOrder = movedLaterExport.variantBranches.map(
      (branch) => branch.frameId,
    );
    const branchMovedEarlier = reorderSelectedSpatialSequence("earlier");
    const restoredOrder = buildSpatialWorkspaceExport().variantBranches.map(
      (branch) => branch.frameId,
    );
    results.push(
      assert(
        branchCanMoveLater &&
          branchMovedLater &&
          branchMovedEarlier &&
          movedLaterOrder.indexOf(variantFrames[0].id) >
            movedLaterOrder.indexOf(variantFrames[1].id) &&
          restoredOrder.indexOf(variantFrames[0].id) <
            restoredOrder.indexOf(variantFrames[1].id),
        "variant branch order can move earlier/later and exports through branch sequence",
      ),
    );
    const firstBranchObject = spatialObjectById(
      `variant-object-${variantFrames[0].id}`,
    );
    const secondBranchObject = spatialObjectById(
      `variant-object-${variantFrames[1].id}`,
    );
    if (firstBranchObject && secondBranchObject) {
      firstBranchObject.x =
        secondBranchObject.x +
        (secondBranchObject.width || SPATIAL_OBJECT_WIDTH) +
        160;
      firstBranchObject.y = secondBranchObject.y;
    }
    const branchDragReordered =
      reorderVariantBranchesByMapPosition(variantSourceId);
    const dragReorderExport = buildSpatialWorkspaceExport();
    const dragReorderOrder = dragReorderExport.variantBranches.map(
      (branch) => branch.frameId,
    );
    const reorderedBranchObject = spatialObjectById(
      `variant-object-${variantFrames[0].id}`,
    );
    results.push(
      assert(
        branchDragReordered &&
          dragReorderOrder.indexOf(variantFrames[0].id) >
            dragReorderOrder.indexOf(variantFrames[1].id) &&
          Boolean(reorderedBranchObject) &&
          spatialObjectFooterStatus(reorderedBranchObject).includes("Branch") &&
          buildSpatialObjectContextText(reorderedBranchObject).includes(
            "Branch order",
          ),
        "dragged variant branch positions can update exported branch order",
      ),
    );
    state.flowDrag = {
      kind: "spatial-selection",
      pointerId: 4242,
      objectId: `variant-object-${variantFrames[0].id}`,
      startX: 0,
      startY: 0,
      objectOrigins: [
        {
          id: `variant-object-${variantFrames[0].id}`,
          x: reorderedBranchObject?.x || 0,
          y: reorderedBranchObject?.y || 0,
        },
      ],
      didMove: true,
    };
    renderFlowBoard();
    const branchDropTargetsRendered =
      dom.flowBoard.querySelectorAll(".branch-drop-target").length >= 3 &&
      dom.flowBoard.textContent.includes("Branch 1") &&
      dom.flowBoard.textContent.includes("End");
    state.flowDrag = null;
    renderFlowBoard();
    results.push(
      assert(
        branchDropTargetsRendered,
        "dragging a branch card renders visible branch drop targets",
      ),
    );
    const promoted = promoteVariantFrameFromMap(variantFrames[1].id, {
      silent: true,
      sync: false,
    });
    results.push(
      assert(
        promoted &&
          state.entryFrameId === variantFrames[1].id &&
          variantFrames[1].variant?.primary === true &&
          Boolean(variantFrames[1].variant?.promotedAt),
        "variant branch can be promoted to primary",
      ),
    );
    const promotedVariantExport = buildSpatialWorkspaceExport();
    renderFlowBoard();
    results.push(
      assert(
        promotedVariantExport.variantBranches.some(
          (branch) =>
            branch.frameId === variantFrames[1].id &&
            branch.primary === true &&
            Boolean(branch.promotedAt),
        ),
        "primary variant state exports through spatial branches",
      ),
    );
    results.push(
      assert(
        promotedVariantExport.objects.some(
          (object) =>
            object.id === `variant-object-${variantFrames[1].id}` &&
            object.status === "primary" &&
            object.meta?.primary === true,
        ),
        "primary variant state syncs to the variant Map object",
      ),
    );
    results.push(
      assert(
        Boolean(
          dom.flowBoard.querySelector(
            `[data-flow-frame-id='${variantFrames[1].id}'].primary-variant`,
          ),
        ) &&
          dom.flowBoard
            .querySelector(
              `[data-promote-variant-frame='${variantFrames[1].id}']`,
            )
            ?.textContent.includes("Primary"),
        "primary variant renders as a promoted branch card",
      ),
    );
    state.frames = state.frames.filter((frame) => !variantFrameIds.has(frame.id));
    state.connections = state.connections.filter(
      (connection) => !variantFrameIds.has(connection.toFrameId),
    );
    state.spatialObjects = state.spatialObjects.filter(
      (object) => !variantFrameIds.has(object.frameIds?.[0]),
    );
    state.activeFrameId = variantSourceId;
    state.entryFrameId = variantSourceId;
    state.viewMode = "frame";
    state.selectedConnectionId = null;
    persistState();
    renderAll();
    setSelfTestProgress("output activity");
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
    state.serverStatus.outputActivity = nextOutputActivityItems;
    state.serverStatus.sessionEvents = persistedOutputActivityItems.map(
      (item) => ({
        id: `agent-log-event-${item.digest}`,
        at: item.at,
        reason: "output-update",
        label: item.summary,
        note: item.detail,
        outputDigest: item,
      }),
    );
    const agentLogItems = buildWorkbenchAgentLogItems();
    results.push(
      assert(
        agentLogItems.length > 0 &&
          agentLogItems.some((item) =>
            ["Output", "Voice", "Checkpoint"].includes(item.kind),
          ),
        "Workbench agent log summarizes output, voice, or checkpoint activity",
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
    setSelfTestProgress("large session fixture");
    await exerciseLargeSessionSelfTest(results);
    results.push(
      assert(
        state.frames.length === startedFrameCount,
        "self-test restores frame count",
      ),
    );
  } catch (error) {
    setSelfTestProgress("runtime error");
    results.push({
      name: "self-test runtime",
      passed: false,
      detail:
        error instanceof Error ? error.message : "Unknown self-test error",
    });
  } finally {
    setSelfTestProgress("restore");
    restoreStateAfterSelfTest(originalSnapshot, originalRuntime);
  }

  setSelfTestProgress("render results");
  renderSelfTestResults(results);
}

function setSelfTestProgress(label) {
  if (shouldRunSelfTest) {
    window.__canvaxSelfTestProgress = label;
  }
}

function restoreStateAfterSelfTest(snapshot, runtime) {
  state.board = structuredClone(snapshot.board);
  state.frames = structuredClone(snapshot.frames);
  state.voice = structuredClone(snapshot.voice);
  state.viewMode = snapshot.viewMode;
  state.workspaceMode = snapshot.workspaceMode;
  state.workbenchFocus = snapshot.workbenchFocus || "sketch";
  state.workbenchTrayCollapsed = Boolean(snapshot.workbenchTrayCollapsed);
  state.assetCandidatePack = snapshot.assetCandidatePack || null;
  state.spatialObjects = normalizeSpatialObjects(snapshot.spatialObjects);
  state.connections = structuredClone(snapshot.connections);
  state.entryFrameId = snapshot.entryFrameId;
  state.activeFrameId = snapshot.activeFrameId;
  state.tool = snapshot.tool;
  state.color = snapshot.color;
  state.size = snapshot.size;
  state.grid = snapshot.grid;
  state.autoSnap = snapshot.autoSnap;
  state.zoom = snapshot.zoom;
  state.flowZoom = Number.isFinite(snapshot.flowZoom) ? snapshot.flowZoom : 1;
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
  state.flowLasso = null;
  state.flowPan = null;
  dom.flowShell?.classList.remove("is-lassoing", "is-panning");
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

function assertOutputAnnotationEraserRemovesMarks() {
  const frame = currentFrame();
  const previousAnnotations = structuredClone(frame.outputAnnotations || []);
  const mark = normalizeOutputAnnotation({
    id: "selftest-output-correction",
    points: [
      { x: 0.22, y: 0.24 },
      { x: 0.34, y: 0.32 },
    ],
    color: "#ff3b1f",
    size: 14,
    composite: "source-over",
  });
  const eraser = normalizeOutputAnnotation({
    id: "selftest-output-eraser",
    points: [
      { x: 0.28, y: 0.28 },
      { x: 0.31, y: 0.3 },
    ],
    color: ERASER_COLOR,
    size: 34,
    composite: "destination-out",
  });
  frame.outputAnnotations = [mark].filter(Boolean);
  const removed = eraseOutputAnnotations(frame, eraser);
  const passed =
    Boolean(mark?.normalizedBounds) &&
    Boolean(eraser?.normalizedBounds) &&
    removed === 1 &&
    frame.outputAnnotations.length === 0;
  frame.outputAnnotations = previousAnnotations;
  state.outputAnnotationDraft = null;
  return assert(
    passed,
    "output eraser deletes correction marks instead of exporting erase strokes",
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

function assertWorkspaceModeGuide() {
  const previous = {
    workspaceMode: state.workspaceMode,
    viewMode: state.viewMode,
    workbenchFocus: state.workbenchFocus,
    voiceScope: state.voice.scope,
    tool: state.tool,
  };

  setWorkspaceMode("simple");
  const workbenchText = dom.workspaceModeGuide.textContent || "";
  const workbenchCards =
    dom.workspaceModeGuide.querySelectorAll(".mode-guide-card").length;
  setWorkspaceMode("advanced");
  const advancedText = dom.workspaceModeGuide.textContent || "";
  const advancedCards =
    dom.workspaceModeGuide.querySelectorAll(".mode-guide-card").length;
  const toolbar = document.querySelector(".toolbar");
  const advancedToolbarPosition = toolbar
    ? getComputedStyle(toolbar).position
    : "";

  state.workspaceMode = previous.workspaceMode;
  state.viewMode = previous.viewMode;
  state.workbenchFocus = previous.workbenchFocus;
  state.voice.scope = previous.voiceScope;
  state.tool = previous.tool;
  persistState();
  renderAll();

  return assert(
    workbenchCards === 3 &&
      advancedCards === 3 &&
      workbenchText.includes("Sketch") &&
      workbenchText.includes("Make / Apply") &&
      advancedText.includes("Project rail") &&
      advancedText.includes("Handoff inspector") &&
      advancedToolbarPosition !== "sticky",
    "workspace mode guide explains Workbench and Advanced roles",
  );
}

function assertWorkbenchRailSizeControls() {
  const previousSize = state.size;
  const previousTool = state.tool;
  const previousSelection = [...state.selectedElementIds];
  const previousSelectedElementId = state.selectedElementId;
  const frame = currentFrame();
  const previousElements = structuredClone(frame.elements);
  const history = ensureHistory(frame.id);
  const previousHistory = {
    past: structuredClone(history.past),
    future: structuredClone(history.future),
  };
  const previousLastActionScope = state.lastActionScope;

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
  history.past = previousHistory.past;
  history.future = previousHistory.future;
  state.tool = previousTool;
  setSelectedElements(previousSelection, previousSelectedElementId);
  state.size = previousSize;
  state.lastActionScope = previousLastActionScope;
  persistState();
  renderColors();
  renderBrushPreview();
  renderFocusPad();
  const railImportsImages = Boolean(
    dom.workbenchRail.querySelector('[data-rail-action="image-import"]'),
  );
  return assert(
    increased &&
      restored &&
      selectedIncreased &&
      globalUnchanged &&
      railImportsImages &&
      dom.focusImageInput?.accept.includes("image"),
    "Workbench rail size controls update brush or selected element",
  );
}

function assertWorkbenchSpatialMap() {
  const previous = {
    frames: structuredClone(state.frames),
    workspaceMode: state.workspaceMode,
    workbenchFocus: state.workbenchFocus,
    viewMode: state.viewMode,
    flowZoom: state.flowZoom,
    tool: state.tool,
    mapObjectFilter: state.mapObjectFilter,
    mapObjectSearch: state.mapObjectSearch,
    outputLaneCollapsed: state.outputLaneCollapsed,
    spatialObjects: structuredClone(state.spatialObjects),
  };

  state.spatialObjects = [
    {
      id: "spatial-selftest-group",
      type: "map-group",
      title: "Self-test group",
      subtitle: "Reference group",
      sourceKind: "manual-group",
      sourceId: "group-selftest",
      frameIds: [],
      x: 360,
      y: 460,
      width: 420,
      height: 260,
      status: "group",
      meta: { text: "Self-test group region" },
    },
    {
      id: "spatial-selftest-asset",
      type: "image-region",
      title: "Self-test asset object",
      subtitle: "Prompt-ready region",
      sourceKind: "asset-candidate",
      sourceId: "asset-selftest-region",
      frameIds: [currentFrame().id],
      x: 420,
      y: 520,
      width: SPATIAL_OBJECT_WIDTH,
      height: SPATIAL_OBJECT_HEIGHT,
      status: "prompt-ready",
      meta: { prompt: "Self-test prompt" },
    },
    {
      id: "spatial-selftest-output",
      type: "generated-output",
      title: "Self-test output object",
      subtitle: "Generated screen",
      sourceKind: "generated-target",
      sourceId: "target-selftest",
      frameIds: [currentFrame().id],
      x: 700,
      y: 520,
      width: SPATIAL_OBJECT_WIDTH,
      height: SPATIAL_OBJECT_HEIGHT,
      status: "preview",
      meta: {
        previewPath: "artifacts/preview/selftest/index.html",
        summary: "Self-test output target",
      },
    },
  ];
  state.mapObjectFilter = "all";
  state.outputLaneCollapsed = false;
  setWorkspaceMode("simple");
  setWorkbenchFocus("map");
  const mapVisible =
    document.body.dataset.workbenchFocus === "map" &&
    state.viewMode === "flow" &&
    dom.frameWorkspace.hidden &&
    !dom.flowWorkspace.hidden;

  const zoomBefore = state.flowZoom;
  updateFlowZoom(-0.1);
  const zoomChanged =
    state.flowZoom === Math.max(0.35, Number((zoomBefore - 0.1).toFixed(2))) &&
    dom.flowZoomValue.textContent === `${Math.round(state.flowZoom * 100)}%`;
  const wheelZoomBefore = state.flowZoom;
  let wheelPrevented = false;
  const shellRect = dom.flowShell.getBoundingClientRect();
  onFlowShellWheel({
    ctrlKey: true,
    metaKey: false,
    deltaY: -40,
    clientX: shellRect.left + 120,
    clientY: shellRect.top + 120,
    preventDefault() {
      wheelPrevented = true;
    },
  });
  const wheelZoomChanged =
    wheelPrevented && state.flowZoom > wheelZoomBefore;
  dom.flowShell.scrollLeft = 120;
  dom.flowShell.scrollTop = 100;
  onFlowShellPointerDown({
    button: 0,
    pointerId: 919,
    clientX: 240,
    clientY: 220,
    target: dom.flowShell,
  });
  const panStartLeft = dom.flowShell.scrollLeft;
  const panStartTop = dom.flowShell.scrollTop;
  onWindowPointerMove({
    pointerId: 919,
    clientX: 190,
    clientY: 170,
  });
  const panned =
    state.flowPan &&
    dom.flowShell.classList.contains("is-panning") &&
    (dom.flowShell.scrollLeft !== panStartLeft ||
      dom.flowShell.scrollTop !== panStartTop);
  onWindowPointerUp({ pointerId: 919 });
  const panMomentumStarted =
    prefersReducedMotion() ||
    (Boolean(state.flowPanMomentum) &&
      dom.flowShell.classList.contains("is-coasting"));
  cancelFlowPanMomentum();
  const panEnded =
    !state.flowPan && !dom.flowShell.classList.contains("is-panning");
  const objectBeforeEdgeExpand = spatialObjectById("spatial-selftest-asset");
  const frameBeforeEdgeExpand = currentFrame();
  const objectEdgeX = objectBeforeEdgeExpand?.x || 0;
  const frameEdgeX = frameBeforeEdgeExpand?.flowPosition?.x || 0;
  const edgeExpansion = ensureFlowWorkspaceMargin(12, 14);
  const objectAfterEdgeExpand = spatialObjectById("spatial-selftest-asset");
  const edgeExpanded =
    edgeExpansion.x > 0 &&
    edgeExpansion.y > 0 &&
    objectAfterEdgeExpand?.x > objectEdgeX &&
    currentFrame()?.flowPosition?.x > frameEdgeX;
  const spatialExport = buildSpatialWorkspaceExport();
  const exportValid =
    spatialExport.kind === "canvax-spatial-workspace" &&
    spatialExport.cards.length === state.frames.length &&
    spatialExport.objects.length === 3 &&
    spatialExport.objectFilter?.id === "all" &&
    spatialExport.objects.some(
      (object) => object.sourceKind === "asset-candidate",
    ) &&
    spatialExport.surface.edgeExpansion?.enabled === true &&
    spatialExport.interaction?.panMomentum === true &&
    spatialExport.zoom === state.flowZoom;
  const timelineExported =
    spatialExport.timeline?.kind === "canvax-spatial-timeline" &&
    spatialExport.timeline.summary?.frames === state.frames.length &&
    spatialExport.timeline.tracks.some(
      (track) =>
        track.id === SPATIAL_OUTPUT_LANE_ID &&
        track.items.some((item) => item.objectId === "spatial-selftest-output"),
    );
  const timelineRendered =
    !dom.mapTimeline.hidden &&
    dom.mapTimeline.textContent.includes("Map timeline") &&
    dom.mapTimeline.textContent.includes("Self-test output object");
  const timelineObjectFocused =
    focusMapTimelineObject("spatial-selftest-output") &&
    state.selectedSpatialObjectId === "spatial-selftest-output" &&
    Boolean(dom.mapTimeline.querySelector(".map-timeline-item.selected"));
  const timelineFrameFocused =
    focusMapTimelineFrame(currentFrame().id) &&
    state.activeFrameId === currentFrame().id &&
    !state.selectedSpatialObjectId;
  const objectRendered = Boolean(
    dom.flowBoard.querySelector(
      "[data-spatial-object-id='spatial-selftest-asset']",
    ),
  );
  const navigatorRendered =
    !dom.flowNavigator.hidden &&
    dom.flowNavigatorItems.querySelectorAll(".flow-navigator-item").length >=
      state.frames.length + 3 &&
    dom.flowNavigatorViewport.style.width;
  const groupExported = spatialExport.groups.some(
    (group) =>
      group.id === "spatial-selftest-group" &&
      group.memberObjectIds.includes("spatial-selftest-asset"),
  );
  const groupedObject = spatialExport.objects.some(
    (object) =>
      object.id === "spatial-selftest-asset" &&
      object.groupIds.includes("spatial-selftest-group"),
  );
  setMapObjectFilter("assets");
  const assetFilterExport = buildSpatialWorkspaceExport();
  const assetFilterActive =
    state.mapObjectFilter === "assets" &&
    assetFilterExport.objectFilter?.id === "assets" &&
    dom.mapObjectFilterChips
      .querySelector("[data-map-object-filter='assets']")
      ?.classList.contains("active");
  const assetFilterVisible = Boolean(
    dom.flowBoard.querySelector("[data-spatial-object-id='spatial-selftest-asset']"),
  );
  const assetFilterHidesOutput = !dom.flowBoard.querySelector(
    "[data-spatial-object-id='spatial-selftest-output']",
  );
  setMapObjectFilter("outputs");
  const outputFilterExport = buildSpatialWorkspaceExport();
  const outputFilterVisible =
    outputFilterExport.objectFilter?.id === "outputs" &&
    Boolean(
      dom.flowBoard.querySelector(
        "[data-spatial-object-id='spatial-selftest-output']",
      ),
    ) &&
    !dom.flowBoard.querySelector("[data-spatial-object-id='spatial-selftest-asset']");
  setMapObjectFilter("all");
  setMapObjectSearch("self-test output", { announce: false });
  const searchExport = buildSpatialWorkspaceExport();
  const searchVisible =
    searchExport.objectFilter?.searchQuery === "self-test output" &&
    Boolean(
      dom.flowBoard.querySelector(
        "[data-spatial-object-id='spatial-selftest-output']",
      ),
    ) &&
    !dom.flowBoard.querySelector("[data-spatial-object-id='spatial-selftest-asset']");
  setMapObjectSearch("", { announce: false });
  const fitTarget = spatialObjectById("spatial-selftest-output");
  if (fitTarget) {
    fitTarget.x = 2400;
    fitTarget.y = 1600;
    renderFlowBoard();
  }
  setFlowZoom(1);
  dom.flowShell.scrollLeft = 0;
  dom.flowShell.scrollTop = 0;
  const fitMapWorked =
    Boolean(fitTarget) &&
    fitFlowMapToContent({ silent: true }) &&
    state.flowZoom < 1 &&
    (dom.flowShell.scrollLeft > 0 ||
      dom.flowShell.scrollTop > 0 ||
      dom.flowShell.scrollWidth <= dom.flowShell.clientWidth ||
      dom.flowShell.scrollHeight <= dom.flowShell.clientHeight);
  dom.flowShell.scrollLeft = 0;
  dom.flowShell.scrollTop = 0;
  renderFlowNavigator();
  const navigatorRect = dom.flowNavigatorStage.getBoundingClientRect();
  let navigatorPrevented = false;
  onFlowNavigatorPointerDown({
    button: 0,
    clientX: navigatorRect.left + navigatorRect.width * 0.82,
    clientY: navigatorRect.top + navigatorRect.height * 0.55,
    preventDefault() {
      navigatorPrevented = true;
    },
  });
  const navigatorPanned =
    navigatorPrevented &&
    (dom.flowShell.scrollLeft > 0 ||
      dom.flowShell.scrollTop > 0 ||
      dom.flowShell.scrollWidth <= dom.flowShell.clientWidth ||
      dom.flowShell.scrollHeight <= dom.flowShell.clientHeight);
  const viewportExport = buildSpatialWorkspaceExport().viewport;
  const viewportExported =
    viewportExport?.active === true &&
    viewportExport.visibleBounds?.left >= 0 &&
    viewportExport.normalizedVisibleBounds?.width > 0 &&
    viewportExport.normalizedVisibleBounds?.height > 0;
  const spatialMapDetail = JSON.stringify({
    mapVisible,
    zoomChanged,
    wheelZoomChanged,
    panned,
    panMomentumStarted,
    panEnded,
    edgeExpanded,
    exportValid,
    timelineExported,
    timelineRendered,
    timelineObjectFocused,
    timelineFrameFocused,
    objectRendered,
    navigatorRendered,
    groupExported,
    groupedObject,
    assetFilterActive,
    assetFilterVisible,
    assetFilterHidesOutput,
    outputFilterVisible,
    searchVisible,
    fitMapWorked,
    navigatorPanned,
    viewportExported,
    viewportExport,
    fitMap: {
      zoom: state.flowZoom,
      scrollLeft: dom.flowShell.scrollLeft,
      scrollTop: dom.flowShell.scrollTop,
      scrollWidth: dom.flowShell.scrollWidth,
      scrollHeight: dom.flowShell.scrollHeight,
      clientWidth: dom.flowShell.clientWidth,
      clientHeight: dom.flowShell.clientHeight,
    },
  });

  state.frames = previous.frames;
  state.workspaceMode = previous.workspaceMode;
  state.workbenchFocus = previous.workbenchFocus;
  state.viewMode = previous.viewMode;
  state.flowZoom = previous.flowZoom;
  state.tool = previous.tool;
  state.mapObjectFilter = previous.mapObjectFilter;
  state.mapObjectSearch = previous.mapObjectSearch;
  state.outputLaneCollapsed = previous.outputLaneCollapsed;
  state.spatialObjects = previous.spatialObjects;
  cancelFlowPanMomentum();
  persistState();
  renderAll();

  return assert(
    mapVisible &&
      zoomChanged &&
      wheelZoomChanged &&
      panned &&
      panMomentumStarted &&
      panEnded &&
      edgeExpanded &&
      exportValid &&
      timelineExported &&
      timelineRendered &&
      timelineObjectFocused &&
      timelineFrameFocused &&
      objectRendered &&
      groupExported &&
      groupedObject &&
      assetFilterActive &&
      assetFilterVisible &&
      assetFilterHidesOutput &&
      outputFilterVisible &&
      searchVisible &&
      navigatorRendered &&
      fitMapWorked &&
      navigatorPanned &&
      viewportExported,
    "Workbench spatial map renders, navigates timeline, pans with momentum, filters, searches, and exports frames, objects, and group containment",
    spatialMapDetail,
  );
}

function assertSpatialObjectsFromOutputManifest() {
  const frameId = currentFrame().id;
  const previous = {
    frames: structuredClone(state.frames),
    connections: structuredClone(state.connections),
    activeFrameId: state.activeFrameId,
    workspaceMode: state.workspaceMode,
    workbenchFocus: state.workbenchFocus,
    viewMode: state.viewMode,
    flowZoom: state.flowZoom,
    tool: state.tool,
    outputLaneCollapsed: state.outputLaneCollapsed,
    spatialObjects: structuredClone(state.spatialObjects),
    hiddenSpatialObjectIds: structuredClone(state.hiddenSpatialObjectIds),
    selectedSpatialObjectId: state.selectedSpatialObjectId,
    selectedSpatialObjectIds: structuredClone(state.selectedSpatialObjectIds),
    assetCandidatePack: structuredClone(state.assetCandidatePack),
    previewManifest: structuredClone(state.serverStatus.previewManifest),
    checkpointHistory: structuredClone(state.serverStatus.checkpointHistory),
  };

  state.spatialObjects = [
    {
      id: "target-object-legacy-materialized-preview",
      type: "generated-output",
      title: "Legacy stale generated output",
      subtitle: "Should be removed during manifest reconciliation",
      sourceId: "legacy-target",
      sourceKind: "",
      frameIds: [frameId],
      x: 40,
      y: 40,
      width: SPATIAL_OBJECT_WIDTH,
      height: SPATIAL_OBJECT_HEIGHT,
      status: "stale",
      meta: {
        path: "artifacts/preview/materialized/legacy/index.html",
      },
    },
  ];
  state.outputLaneCollapsed = false;
  state.assetCandidatePack = null;
  state.serverStatus = {
    ...state.serverStatus,
    previewManifest: {
      targets: [
        {
          id: "selftest-target",
          label: "Self-test generated screen",
          type: "generated-screen-preview",
          previewPath: "artifacts/preview/selftest/index.html",
          frameIds: [frameId],
          changeSummary: "Self-test preview target",
        },
        {
          id: "legacy-active-target",
          label: "Legacy active materialized",
          type: "materialized-preview",
          previewPath: `artifacts/preview/materialized/${frameId}/index.html`,
          changeSummary: "Legacy materialized path still belongs to this frame",
        },
        {
          id: "legacy-deleted-target",
          label: "Legacy deleted materialized",
          type: "materialized-preview",
          previewPath:
            "artifacts/preview/materialized/frame-deleted-old/index.html",
          changeSummary: "Should be hidden because its frame no longer exists",
        },
      ],
      artifacts: [
        {
          id: "selftest-artifact",
          label: "Self-test spec artifact",
          path: "docs/selftest-spec.md",
          kind: "spec",
          frameIds: [frameId],
        },
        {
          id: "materialize-context-selftest",
          label: "Self-test context",
          path: `artifacts/preview/materialized/frames/${frameId}/frame.json`,
          kind: "context",
          frameIds: [frameId],
        },
        {
          id: "materialize-meta-selftest",
          label: "Self-test meta",
          path: `artifacts/preview/materialized/frames/${frameId}/meta.json`,
          kind: "meta",
          frameIds: [frameId],
        },
        {
          id: "materialize-sketch-selftest",
          label: "Self-test sketch overlay",
          path: `artifacts/preview/materialized/frames/${frameId}/sketch.png`,
          kind: "reference",
          frameIds: [frameId],
        },
      ],
      changes: [
        {
          id: "selftest-change",
          label: "web/app.js",
          path: "web/app.js",
          kind: "updated",
          frameIds: [frameId],
        },
      ],
    },
    checkpointHistory: {
      items: [
        {
          id: "selftest-output-checkpoint",
          label: "Output update",
          reason: "output-update",
          savedAt: new Date().toISOString(),
          frameId,
          frameTitle: currentFrame().title,
          targetLabel: `${currentFrame().title} materialized`,
          captureCount: 1,
          voiceSegmentCount: 0,
          artifactCount: 1,
          changeCount: 0,
        },
      ],
    },
  };
  syncSpatialObjectsFromHandoffs();
  setWorkspaceMode("simple");
  setWorkbenchFocus("map");
  renderFlowBoard();

  const spatialExport = buildSpatialWorkspaceExport();
  const objectSources = new Set(
    spatialExport.objects.map((object) => object.sourceKind),
  );
  const exported =
    objectSources.has("generated-target") &&
    objectSources.has("generated-artifact") &&
    objectSources.has("workspace-change");
  const rendered =
    Boolean(dom.flowBoard.querySelector(".spatial-object-node.generated-output")) &&
    Boolean(dom.flowBoard.querySelector(".spatial-object-node.generated-artifact")) &&
    Boolean(dom.flowBoard.querySelector(".spatial-object-node.changed-file"));
  const labels = [
    ...dom.flowBoard.querySelectorAll(".spatial-object-header span"),
  ].map((node) => node.textContent.trim());
  const friendlyLabels =
    labels.includes("Generated screen") &&
    labels.includes("Generated file") &&
    labels.includes("Code change") &&
    !labels.some((label) => label.toLowerCase() === "generated-target");
  const referenceBadges =
    dom.flowBoard.querySelectorAll(".spatial-object-reference-badge").length >=
    3;
  const outputOpenLinks =
    dom.flowBoard.querySelectorAll(".spatial-object-open-link").length >= 2;
  const generatedTargetObject = spatialExport.objects.find(
    (object) => object.sourceKind === "generated-target",
  );
  const legacyMaterializedTitle =
    spatialObjectTitle({
      sourceKind: "generated-target",
      title: "Frame 1 materialized",
      frameIds: [frameId],
    }) === `Generated screen for ${currentFrame().title}`;
  const legacyActiveTargetBound = spatialExport.objects.some(
    (object) =>
      object.sourceId === "legacy-active-target" &&
      object.frameIds.includes(frameId) &&
      object.title === `Generated screen for ${currentFrame().title}`,
  );
  const legacyDeletedTargetHidden = !spatialExport.objects.some(
    (object) => object.sourceId === "legacy-deleted-target",
  );
  const internalMaterializeArtifactsHidden = !spatialExport.objects.some(
    (object) =>
      [
        "materialize-context-selftest",
        "materialize-meta-selftest",
        "materialize-sketch-selftest",
      ].includes(object.sourceId),
  );
  const outputLaneExported = spatialExport.lanes.some(
    (lane) =>
      lane.id === SPATIAL_OUTPUT_LANE_ID &&
      lane.title === "Output shelf" &&
      lane.memberObjectIds.includes(generatedTargetObject?.id),
  );
  const outputLaneRendered = Boolean(
    dom.flowBoard.querySelector(".spatial-lane-output"),
  );
  const outputGuideText =
    dom.flowBoard.querySelector(".spatial-lane-output .spatial-lane-guide")
      ?.textContent || "";
  const outputGuideRendered =
    outputGuideText.includes("Generated references, not extra frames") &&
    outputGuideText.includes("Generated screen") &&
    outputGuideText.includes("Generated file") &&
    outputGuideText.includes("Code change");
  const checkpointObject = spatialExport.objects.find(
    (object) => object.sourceId === "selftest-output-checkpoint",
  );
  const checkpointTargetSanitized =
    checkpointObject?.subtitle?.includes(
      `Generated screen for ${currentFrame().title}`,
    ) &&
    !/materialized|generated-target/i.test(checkpointObject.subtitle || "");
  toggleOutputLane();
  const collapsedOutputExport = buildSpatialWorkspaceExport().lanes.some(
    (lane) =>
      lane.id === SPATIAL_OUTPUT_LANE_ID &&
      lane.collapsed === true &&
      /State: collapsed/.test(lane.contextMarkdown || ""),
  );
  const collapsedOutputRendered = Boolean(
    dom.flowBoard.querySelector(".spatial-lane-output.collapsed"),
  );
  const collapsedOutputCardsHidden = !dom.flowBoard.querySelector(
    [
      ".spatial-object-node.generated-output",
      ".spatial-object-node.generated-artifact",
      ".spatial-object-node.changed-file",
    ].join(", "),
  );
  const collapsedOutputButton =
    !dom.toggleOutputLane.hidden &&
    dom.toggleOutputLane.textContent.trim() === "Show outputs";
  toggleOutputLane();
  const expandedOutputAgain = Boolean(
    dom.flowBoard.querySelector(".spatial-object-node.generated-output"),
  );
  const mapHeightConstrained =
    dom.flowShell.clientHeight > 0 &&
    dom.flowShell.clientHeight < 1400 &&
    getComputedStyle(dom.flowShell).overflowY === "auto";
  autoLayoutFlow();
  const tidiedGeneratedTarget = generatedTargetObject
    ? spatialObjectById(generatedTargetObject.id)
    : null;
  const expectedOutputPosition = defaultOutputSpatialObjectPosition(0);
  const outputTidyWorked =
    Boolean(tidiedGeneratedTarget) &&
    Math.round(tidiedGeneratedTarget.x) === expectedOutputPosition.x &&
    Math.round(tidiedGeneratedTarget.y) === expectedOutputPosition.y;
  const laneArtifactObject = state.spatialObjects.find(
    (object) => object.sourceKind === "generated-artifact",
  );
  const laneIndexBefore = laneArtifactObject?.meta?.laneIndex;
  if (laneArtifactObject) {
    selectSpatialObject(laneArtifactObject.id, { render: true });
  }
  const laneEarlierButtonEnabled =
    Boolean(laneArtifactObject) && !dom.mapLaneEarlier.disabled;
  const laneEarlierWorked =
    Boolean(laneArtifactObject) &&
    Number.isFinite(laneIndexBefore) &&
    laneEarlierButtonEnabled &&
    reorderSelectedSpatialLane("earlier") &&
    laneArtifactObject.meta?.manualLaneOrder === true &&
    laneArtifactObject.meta?.laneIndex === laneIndexBefore - 1 &&
    spatialLaneOrderLabel(laneArtifactObject).includes("Output shelf");
  const laneLaterWorked =
    laneEarlierWorked &&
    !dom.mapLaneLater.disabled &&
    reorderSelectedSpatialLane("later") &&
    laneArtifactObject.meta?.laneIndex === laneIndexBefore;
  if (generatedTargetObject) {
    selectSpatialObject(generatedTargetObject.id, { render: true });
  }
  const typeInspectorRendered =
    Boolean(generatedTargetObject) &&
    !dom.mapPropertyEditor.hidden &&
    dom.mapObjectTypeDetails.textContent.includes("Target") &&
    dom.mapObjectTypeDetails.textContent.includes(
      "Self-test preview target",
    ) &&
    dom.mapObjectTypeDetails.textContent.includes("Generated Screen");
  const generatedPrompt = "Use this generated target as the premium hero output";
  const generatedPromptEdited =
    Boolean(generatedTargetObject) &&
    updateSelectedSpatialObjectProperty("prompt", generatedPrompt);
  syncSpatialObjectsFromHandoffs();
  const resyncedGeneratedTarget = generatedTargetObject
    ? spatialObjectById(generatedTargetObject.id)
    : null;
  const generatedPromptPreserved =
    generatedPromptEdited &&
    resyncedGeneratedTarget?.meta?.prompt === generatedPrompt &&
    resyncedGeneratedTarget?.meta?.manualFields?.prompt === true &&
    buildSpatialWorkspaceExport().objects.some(
      (entry) =>
        entry.id === generatedTargetObject?.id &&
        entry.prompt === generatedPrompt &&
        entry.inspector?.sections?.some(
          (section) => section.id === "target",
        ) &&
        entry.contextMarkdown.includes(generatedPrompt),
    ) &&
    buildSpatialObjectContextText(resyncedGeneratedTarget).includes(
      generatedPrompt,
    );
  if (generatedTargetObject) {
    selectSpatialObject(generatedTargetObject.id, { render: true });
  }
  const editableOutputActionVisible =
    Boolean(generatedTargetObject) &&
    !dom.mapMakeEditable.hidden &&
    !dom.mapMakeEditable.disabled &&
    Boolean(
      dom.flowBoard.querySelector(
        `[data-make-output-editable='${generatedTargetObject.id}']`,
      ),
    );
  const editableOutputFrame = createEditableFrameFromOutputObject(
    generatedTargetObject,
    {
      silent: true,
      sync: false,
    },
  );
  const editableOutputFrameCreated =
    Boolean(editableOutputFrame) &&
    editableOutputFrame.variant?.sourceFrameId === frameId &&
    editableOutputFrame.variant?.label === "Output edit" &&
    editableOutputFrame.variant?.outputObjectId === generatedTargetObject.id &&
    state.connections.some(
      (connection) =>
        connection.fromFrameId === frameId &&
        connection.toFrameId === editableOutputFrame.id &&
        connection.label === "output edit",
    ) &&
    state.spatialObjects.some(
      (object) =>
        object.id === `variant-object-${editableOutputFrame.id}` &&
        object.sourceKind === "variant-branch" &&
        object.meta?.outputObjectId === generatedTargetObject.id,
    );
  const editableOutputBranchExported = buildSpatialWorkspaceExport().variantBranches.some(
    (branch) =>
      branch.frameId === editableOutputFrame?.id &&
      branch.outputBinding?.objectId === generatedTargetObject.id &&
      branch.outputBinding?.target === generatedTargetObject.meta?.previewPath,
  );
  const editableOutputViewport =
    viewportPresets[editableOutputFrame?.viewport] || viewportPresets.desktop;
  const editableOutputExportFrame = editableOutputFrame
    ? {
        id: editableOutputFrame.id,
        index: 1,
        title: editableOutputFrame.title,
        viewport: editableOutputFrame.viewport,
        viewportWidth: editableOutputViewport.width,
        viewportHeight: editableOutputViewport.height,
        objective: editableOutputFrame.objective,
        layout: editableOutputFrame.layout,
        motion: editableOutputFrame.motion,
        assets: editableOutputFrame.assets,
        mobile: editableOutputFrame.mobile,
        variant: editableOutputFrame.variant,
        updatedAt: editableOutputFrame.updatedAt,
        captureCount: editableOutputFrame.captures.length,
        outputAnnotationCount: editableOutputFrame.outputAnnotations.length,
        outputAnnotations: editableOutputFrame.outputAnnotations.map(
          summarizeOutputAnnotation,
        ),
        composition: buildFrameComposition(editableOutputFrame),
      }
    : null;
  const editableOutputRewriteRequest = editableOutputExportFrame
    ? buildRewriteRequest([editableOutputExportFrame], [])
    : null;
  const editableOutputTaskPack = editableOutputExportFrame
    ? buildTaskPack([editableOutputExportFrame], [])
    : null;
  const editableOutputBuildRequest =
    editableOutputFrame && editableOutputTaskPack
      ? buildBuildRealRequest(
          editableOutputFrame,
          {
            frames: [editableOutputExportFrame],
            taskPack: editableOutputTaskPack,
            imagePromptPack: { frames: [] },
          },
          {},
        )
      : null;
  const outputEditBindingInRequests =
    Boolean(generatedTargetObject) &&
    editableOutputRewriteRequest?.frames?.[0]?.outputEditBinding?.objectId ===
      generatedTargetObject.id &&
    editableOutputRewriteRequest?.revisionGraph?.frames?.[0]?.outputEditBinding
      ?.target === generatedTargetObject.meta?.previewPath &&
    editableOutputTaskPack?.frames?.[0]?.outputEditBinding?.href ===
      `/workspace/${generatedTargetObject.meta?.previewPath}` &&
    editableOutputBuildRequest?.outputEditBinding?.objectId ===
      generatedTargetObject.id &&
    editableOutputBuildRequest?.outputContract?.outputEditBinding?.target ===
      generatedTargetObject.meta?.previewPath;
  const frameBound = spatialExport.objects
    .filter(isManifestSpatialObject)
    .every((object) => object.frameIds.includes(frameId));
  const legacyCleaned = !spatialExport.objects.some(
    (object) => object.id === "target-object-legacy-materialized-preview",
  );
  const clearedCount = clearGeneratedSpatialObjects({ silent: true });
  const clearedExport = buildSpatialWorkspaceExport();
  syncSpatialObjectsFromHandoffs();
  const hiddenObjectsStayHidden = !buildSpatialWorkspaceExport().objects.some(
    isManifestSpatialObject,
  );

  state.frames = previous.frames;
  state.connections = previous.connections;
  state.activeFrameId = previous.activeFrameId;
  state.workspaceMode = previous.workspaceMode;
  state.workbenchFocus = previous.workbenchFocus;
  state.viewMode = previous.viewMode;
  state.flowZoom = previous.flowZoom;
  state.tool = previous.tool;
  state.outputLaneCollapsed = previous.outputLaneCollapsed;
  state.spatialObjects = previous.spatialObjects;
  state.hiddenSpatialObjectIds = previous.hiddenSpatialObjectIds;
  state.selectedSpatialObjectId = previous.selectedSpatialObjectId;
  state.selectedSpatialObjectIds = previous.selectedSpatialObjectIds;
  state.assetCandidatePack = previous.assetCandidatePack;
  state.serverStatus = {
    ...state.serverStatus,
    previewManifest: previous.previewManifest,
    checkpointHistory: previous.checkpointHistory,
  };
  persistState();
  renderAll();

  return assert(
    exported &&
      rendered &&
      friendlyLabels &&
      referenceBadges &&
      legacyMaterializedTitle &&
      legacyActiveTargetBound &&
      legacyDeletedTargetHidden &&
      internalMaterializeArtifactsHidden &&
      outputLaneExported &&
      outputLaneRendered &&
      outputGuideRendered &&
      checkpointTargetSanitized &&
      collapsedOutputExport &&
      collapsedOutputRendered &&
      collapsedOutputCardsHidden &&
      collapsedOutputButton &&
      expandedOutputAgain &&
      mapHeightConstrained &&
      outputTidyWorked &&
      laneEarlierWorked &&
      laneLaterWorked &&
      outputOpenLinks &&
      typeInspectorRendered &&
      generatedPromptPreserved &&
      editableOutputActionVisible &&
      editableOutputFrameCreated &&
      editableOutputBranchExported &&
      outputEditBindingInRequests &&
      frameBound &&
      legacyCleaned &&
      clearedCount >= 3 &&
      !clearedExport.objects.some(isManifestSpatialObject) &&
      hiddenObjectsStayHidden,
    "Output manifest reconciles and clears generated spatial objects",
    JSON.stringify({
      exported,
      rendered,
      friendlyLabels,
      referenceBadges,
      legacyMaterializedTitle,
      legacyActiveTargetBound,
      legacyDeletedTargetHidden,
      internalMaterializeArtifactsHidden,
      outputLaneExported,
      outputLaneRendered,
      outputGuideRendered,
      checkpointTargetSanitized,
      collapsedOutputExport,
      collapsedOutputRendered,
      collapsedOutputCardsHidden,
      collapsedOutputButton,
      expandedOutputAgain,
      mapHeightConstrained,
      outputTidyWorked,
      laneEarlierWorked,
      laneLaterWorked,
      outputOpenLinks,
      typeInspectorRendered,
      generatedPromptPreserved,
      editableOutputActionVisible,
      outputEditBindingInRequests,
      editableOutputFrameCreated,
      editableOutputBranchExported,
      inspectorText: dom.mapObjectTypeDetails.textContent,
      frameBound,
      legacyCleaned,
      clearedCount,
      clearedEmpty: !clearedExport.objects.some(isManifestSpatialObject),
      hiddenObjectsStayHidden,
    }),
  );
}

function assertCheckpointSpatialObjects() {
  const frameId = currentFrame().id;
  const previous = {
    workspaceMode: state.workspaceMode,
    workbenchFocus: state.workbenchFocus,
    viewMode: state.viewMode,
    historyLaneCollapsed: state.historyLaneCollapsed,
    spatialObjects: structuredClone(state.spatialObjects),
    checkpointHistory: structuredClone(state.serverStatus.checkpointHistory),
  };

  state.spatialObjects = [];
  state.historyLaneCollapsed = false;
  state.serverStatus = {
    ...state.serverStatus,
    checkpointHistory: {
      updatedAt: new Date().toISOString(),
      items: [
        {
          id: "selftest-checkpoint-1",
          savedAt: new Date().toISOString(),
          reason: "focus-apply",
          label: "Workbench apply",
          frameId,
          frameTitle: currentFrame().title,
          voiceSegmentCount: 2,
          captureCount: 3,
          artifactCount: 1,
          changeCount: 4,
          targetLabel: "Self-test preview",
          checkpointUrl: "/workspace/artifacts/canvax/checkpoints/selftest/checkpoint.json",
        },
      ],
    },
  };
  syncSpatialObjectsFromHandoffs();
  setWorkspaceMode("simple");
  setWorkbenchFocus("map");
  renderFlowBoard();
  const spatialExport = buildSpatialWorkspaceExport();
  renderCheckpointPanel();
  const exported = spatialExport.objects.some(
    (object) =>
      object.sourceKind === "checkpoint" &&
      object.frameIds.includes(frameId) &&
      object.meta.captureCount === 3 &&
      object.meta.laneId === SPATIAL_HISTORY_LANE_ID,
  );
  const laneExported = spatialExport.lanes.some(
    (lane) =>
      lane.id === SPATIAL_HISTORY_LANE_ID &&
      lane.kind === "history" &&
      lane.memberObjectIds.some((id) => id.startsWith("checkpoint-object-")),
  );
  const rendered = Boolean(
    dom.flowBoard.querySelector(".spatial-object-node.checkpoint-event"),
  );
  const replayActionRendered = Boolean(
    dom.flowBoard.querySelector(
      ".spatial-object-node.checkpoint-event [data-replay-checkpoint='selftest-checkpoint-1']",
    ),
  );
  const replayPanelActionRendered = Boolean(
    dom.checkpointList.querySelector(
      "[data-replay-checkpoint='selftest-checkpoint-1']",
    ),
  );
  const replayConfig = buildCheckpointReplayFrameConfig({
    item: state.serverStatus.checkpointHistory.items[0],
    checkpoint: {
      activeFrameId: frameId,
      activeFrameTitle: currentFrame().title,
      export: { jsonPath: "exports/archive/selftest/canvax-storyboard.json" },
    },
    exportPackage: {
      activeFrameId: frameId,
      frames: [
        {
          id: frameId,
          title: currentFrame().title,
          viewport: currentFrame().viewport,
          objective: "Self-test frame",
          layout: "Self-test layout",
          motion: "",
          assets: "",
          mobile: "",
          snapshotDataUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
        },
      ],
    },
    activeFrame: currentFrame(),
  });
  const replayConfigBuilt =
    replayConfig?.frameOptions?.backgroundImage?.startsWith("data:image/png") &&
    replayConfig.frameOptions.variant?.label === "Checkpoint replay" &&
    replayConfig.connection?.label === "checkpoint replay";
  const laneRendered = Boolean(
    dom.flowBoard.querySelector(".spatial-lane-history"),
  );
  toggleHistoryLane();
  const collapsedExport = buildSpatialWorkspaceExport().lanes.some(
    (lane) =>
      lane.id === SPATIAL_HISTORY_LANE_ID &&
      lane.collapsed === true &&
      /State: collapsed/.test(lane.contextMarkdown || ""),
  );
  const collapsedRendered = Boolean(
    dom.flowBoard.querySelector(".spatial-lane-history.collapsed"),
  );
  const collapsedCardsHidden = !dom.flowBoard.querySelector(
    ".spatial-object-node.checkpoint-event",
  );
  const collapsedButton =
    !dom.toggleHistoryLane.hidden &&
    dom.toggleHistoryLane.textContent.trim() === "Show history";
  toggleHistoryLane();
  const expandedAgain = Boolean(
    dom.flowBoard.querySelector(".spatial-object-node.checkpoint-event"),
  );

  state.workspaceMode = previous.workspaceMode;
  state.workbenchFocus = previous.workbenchFocus;
  state.viewMode = previous.viewMode;
  state.historyLaneCollapsed = previous.historyLaneCollapsed;
  state.spatialObjects = previous.spatialObjects;
  state.serverStatus = {
    ...state.serverStatus,
    checkpointHistory: previous.checkpointHistory,
  };
  persistState();
  renderAll();

  return assert(
      exported &&
      laneExported &&
      rendered &&
      replayActionRendered &&
      replayPanelActionRendered &&
      replayConfigBuilt &&
      laneRendered &&
      collapsedExport &&
      collapsedRendered &&
      collapsedCardsHidden &&
      collapsedButton &&
      expandedAgain,
    "Checkpoint history renders, exports, and collapses as a spatial history lane",
  );
}

async function assertCheckpointReplayCreatesFrame() {
  const frame = currentFrame();
  const previous = {
    frames: structuredClone(state.frames),
    connections: structuredClone(state.connections),
    spatialObjects: structuredClone(state.spatialObjects),
    activeFrameId: state.activeFrameId,
    viewMode: state.viewMode,
    workbenchFocus: state.workbenchFocus,
    serverStatus: structuredClone(state.serverStatus),
  };
  const item = {
    id: "selftest-replay-checkpoint",
    savedAt: new Date().toISOString(),
    reason: "manual-push",
    label: "Replay self-test",
    frameId: frame.id,
    frameTitle: frame.title,
    checkpointPath: "artifacts/canvax/checkpoints/selftest/checkpoint.json",
    jsonPath: "exports/archive/selftest/canvax-storyboard.json",
  };
  state.serverStatus = {
    ...state.serverStatus,
    checkpointHistory: {
      updatedAt: new Date().toISOString(),
      items: [item],
    },
  };
  const beforeFrameCount = state.frames.length;
  const beforeConnectionCount = state.connections.length;
  const replayFrame = await replayCheckpointAsFrame(item.id, {
    sync: false,
    checkpoint: {
      id: item.id,
      savedAt: item.savedAt,
      label: item.label,
      activeFrameId: frame.id,
      activeFrameTitle: frame.title,
      export: { jsonPath: item.jsonPath },
    },
    exportPackage: {
      activeFrameId: frame.id,
      frames: [
        {
          id: frame.id,
          title: frame.title,
          viewport: frame.viewport,
          objective: "Replay source objective",
          layout: "Replay source layout",
          motion: "",
          assets: "",
          mobile: "",
          snapshotDataUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
        },
      ],
    },
  });
  const created =
    Boolean(replayFrame) &&
    state.frames.length === beforeFrameCount + 1 &&
    state.connections.length === beforeConnectionCount + 1 &&
    replayFrame.variant?.label === "Checkpoint replay" &&
    replayFrame.backgroundImage.startsWith("data:image/png") &&
    state.connections.some(
      (connection) =>
        connection.fromFrameId === frame.id &&
        connection.toFrameId === replayFrame.id &&
        connection.label === "checkpoint replay",
    );

  state.frames = previous.frames;
  state.connections = previous.connections;
  state.spatialObjects = previous.spatialObjects;
  state.activeFrameId = previous.activeFrameId;
  state.viewMode = previous.viewMode;
  state.workbenchFocus = previous.workbenchFocus;
  state.serverStatus = previous.serverStatus;
  persistState();
  renderAll();

  return assert(
    created,
    "checkpoint replay creates an editable frame from a saved snapshot",
  );
}

function assertManualSpatialObjectControls() {
  const previous = {
    workspaceMode: state.workspaceMode,
    workbenchFocus: state.workbenchFocus,
    viewMode: state.viewMode,
    mapObjectFilter: state.mapObjectFilter,
    spatialObjects: structuredClone(state.spatialObjects),
    selectedSpatialObjectId: state.selectedSpatialObjectId,
    selectedSpatialObjectIds: structuredClone(state.selectedSpatialObjectIds),
    activeFramePosition: structuredClone(currentFrame().flowPosition),
  };

  setWorkspaceMode("simple");
  setWorkbenchFocus("map");
  const activeFrame = currentFrame();
  const object = addSpatialObject({
    type: "map-note",
    title: "Self-test map note",
    subtitle: "Manual spatial object",
    sourceKind: "manual-note",
    status: "note",
    meta: { text: "Manual spatial object" },
  });
  const group = addSpatialObject({
    type: "map-group",
    title: "Self-test group",
    subtitle: "Manual group region",
    sourceKind: "spatial-group",
    status: "group",
    width: SPATIAL_OBJECT_WIDTH * 2 + 44,
    height: SPATIAL_OBJECT_HEIGHT * 1.55,
  });
  const nestedGroup = addSpatialObject({
    type: "map-group",
    title: "Self-test nested group",
    subtitle: "Nested group region",
    sourceKind: "spatial-group",
    status: "group",
    width: SPATIAL_OBJECT_WIDTH,
    height: SPATIAL_OBJECT_HEIGHT,
  });
  const nestedChild = addSpatialObject({
    type: "map-note",
    title: "Self-test nested child",
    subtitle: "Nested child outside parent bounds",
    sourceKind: "manual-note",
    status: "note",
    meta: { text: "Nested child should move with ancestor groups" },
  });
  const outsideObject = addSpatialObject({
    type: "map-note",
    title: "Self-test outside note",
    subtitle: "Outside transform target",
    sourceKind: "manual-note",
    status: "note",
    meta: { text: "Outside transform target" },
  });
  const objectRecord = object ? spatialObjectById(object.id) : null;
  const groupRecord = group ? spatialObjectById(group.id) : null;
  const nestedGroupRecord = nestedGroup
    ? spatialObjectById(nestedGroup.id)
    : null;
  const nestedChildRecord = nestedChild
    ? spatialObjectById(nestedChild.id)
    : null;
  const outsideRecord = outsideObject
    ? spatialObjectById(outsideObject.id)
    : null;
  if (
    objectRecord &&
    groupRecord &&
    nestedGroupRecord &&
    nestedChildRecord &&
    outsideRecord
  ) {
    groupRecord.x = 360;
    groupRecord.y = 460;
    groupRecord.width = 520;
    groupRecord.height = 320;
    nestedGroupRecord.x = 740;
    nestedGroupRecord.y = 585;
    nestedGroupRecord.width = 260;
    nestedGroupRecord.height = 160;
    nestedChildRecord.x = 910;
    nestedChildRecord.y = 625;
    nestedChildRecord.width = 140;
    nestedChildRecord.height = 90;
    objectRecord.x = 430;
    objectRecord.y = 535;
    outsideRecord.x = 1040;
    outsideRecord.y = 560;
    outsideRecord.width = 220;
    outsideRecord.height = 150;
    activeFrame.flowPosition = { x: 470, y: 550 };
    renderFlowBoard();
  }
  const added = Boolean(
    object &&
      group &&
      nestedGroup &&
      nestedChild &&
      outsideObject &&
      dom.flowBoard.querySelector(
        `[data-spatial-object-id='${object.id}'] [data-spatial-object-remove]`,
      ) &&
      dom.flowBoard.querySelector(
        `[data-spatial-object-id='${outsideObject.id}']`,
      ) &&
      dom.flowBoard.querySelector(
        `[data-spatial-object-id='${group.id}'].map-group`,
      ) &&
      dom.flowBoard.querySelector(
        `[data-spatial-object-id='${nestedGroup.id}'].map-group`,
      ) &&
      dom.flowBoard.querySelector(
        `[data-spatial-object-id='${nestedChild.id}']`,
      ),
  );
  selectSpatialObject(object?.id, { render: true });
  const selectedRendered = Boolean(
    object &&
      dom.flowBoard.querySelector(
        `[data-spatial-object-id='${object.id}'].selected`,
      ),
  );
  const selectionActionsVisible =
    Boolean(object) &&
    !dom.mapSelectionActions.hidden &&
    !dom.mapPropertyEditor.hidden &&
    dom.mapObjectTitle.value === object.title &&
    dom.mapObjectSubtitle.value === object.subtitle &&
    dom.mapObjectStatus.value === object.status &&
    dom.mapObjectPrompt.value === "" &&
    dom.mapObjectCustomProperties.value === "" &&
    dom.mapSelectedObjectTitle.textContent === object.title &&
    !dom.mapCopyObjectContext.disabled &&
    !dom.mapPinObject.disabled &&
    !dom.mapLockObject.disabled &&
    Boolean(dom.mapGroupSelection) &&
    dom.mapGroupSelection.disabled &&
    Boolean(dom.mapUngroupSelection) &&
    dom.mapUngroupSelection.disabled &&
    Boolean(dom.mapSelectGroupContents) &&
    dom.mapSelectGroupContents.disabled &&
    Boolean(dom.mapFitGroup) &&
    dom.mapFitGroup.disabled &&
    Boolean(dom.mapLaneEarlier) &&
    dom.mapLaneEarlier.disabled &&
    Boolean(dom.mapLaneLater) &&
    dom.mapLaneLater.disabled &&
    Boolean(dom.mapSendObjectBack) &&
    Boolean(dom.mapBringObjectFront) &&
    (!dom.mapSendObjectBack.disabled || !dom.mapBringObjectFront.disabled) &&
    !dom.mapDuplicateObject.disabled &&
    !dom.mapDeleteObject.disabled;
  const propertyEdited =
    updateSelectedSpatialObjectProperty("title", "Renamed map note") &&
    updateSelectedSpatialObjectProperty(
      "subtitle",
      "Manual spatial object property note",
    ) &&
    updateSelectedSpatialObjectProperty("status", "ready-for-codex") &&
    updateSelectedSpatialObjectProperty(
      "prompt",
      "Use this map note as a Codex refinement instruction",
    ) &&
    updateSelectedSpatialObjectCustomProperties(
      [
        "component: hero annotation",
        "state: review-needed",
        "constraint: keep near generated output",
      ].join("\n"),
    ) &&
    objectRecord?.title === "Renamed map note" &&
    objectRecord?.subtitle === "Manual spatial object property note" &&
    objectRecord?.status === "ready-for-codex" &&
    objectRecord?.meta?.prompt ===
      "Use this map note as a Codex refinement instruction" &&
    objectRecord?.meta?.customProperties?.length === 3 &&
    objectRecord?.meta?.manualFields?.title === true &&
    objectRecord?.meta?.manualFields?.subtitle === true &&
    objectRecord?.meta?.manualFields?.status === true &&
    objectRecord?.meta?.manualFields?.prompt === true &&
    objectRecord?.meta?.manualFields?.customProperties === true &&
    buildSpatialWorkspaceExport().objects.some(
      (entry) =>
        entry.id === object?.id &&
        entry.title === "Renamed map note" &&
        entry.status === "ready-for-codex" &&
        entry.prompt ===
          "Use this map note as a Codex refinement instruction" &&
        entry.contextMarkdown.includes(
          "Use this map note as a Codex refinement instruction",
        ) &&
        entry.contextMarkdown.includes("Manual spatial object property note") &&
        entry.contextMarkdown.includes("component: hero annotation") &&
        entry.customProperties?.some(
          (property) =>
            property.key === "component" &&
            property.value === "hero annotation",
        ) &&
        entry.inspector?.sections?.some(
          (section) =>
            section.id === "custom-properties" &&
            section.items.some(
              (item) =>
                item.label === "component" &&
                item.value === "hero annotation",
            ),
        ),
    );
  const detailEdited =
    updateSelectedSpatialObjectDetail("primary", "Designer-edited map detail") &&
    updateSelectedSpatialObjectDetail("secondary", "Codex should prioritize this note") &&
    objectRecord?.meta?.inspectorOverrides?.primary ===
      "Designer-edited map detail" &&
    objectRecord?.meta?.inspectorOverrides?.secondary ===
      "Codex should prioritize this note" &&
    buildSpatialWorkspaceExport().objects.some(
      (entry) =>
        entry.id === object?.id &&
        entry.inspector?.sections?.some(
          (section) =>
            section.id === "manual" &&
            section.items.some(
              (item) => item.value === "Designer-edited map detail",
            ),
        ) &&
        entry.contextMarkdown.includes("Designer-edited map detail"),
    );
  const pinned =
    toggleSelectedSpatialObjectPin() &&
    objectRecord?.meta?.pinned === true &&
    dom.mapPinObject.textContent === "Unpin" &&
    Boolean(
      dom.flowBoard.querySelector(
        `[data-spatial-object-id='${object?.id}'].pinned .spatial-object-pin-badge`,
      ),
    ) &&
    buildSpatialWorkspaceExport().objects.some(
      (entry) =>
        entry.id === object?.id &&
        entry.pinned === true &&
        entry.contextMarkdown.includes("- Pinned: yes"),
    );
  const lockedXBefore = objectRecord?.x || 0;
  const locked =
    toggleSelectedSpatialObjectLock() &&
    objectRecord?.meta?.locked === true &&
    dom.mapLockObject.textContent === "Unlock" &&
    Boolean(
      dom.flowBoard.querySelector(
        `[data-spatial-object-id='${object?.id}'].locked .spatial-object-lock-badge`,
      ),
    ) &&
    dom.mapDuplicateObject.disabled &&
    dom.mapDeleteObject.disabled &&
    buildSpatialWorkspaceExport().objects.some(
      (entry) =>
        entry.id === object?.id &&
        entry.locked === true &&
        entry.contextMarkdown.includes("- Locked: yes"),
    );
  const lockedNudgeBlocked =
    !nudgeSelectedSpatialObject(12, 0) && objectRecord?.x === lockedXBefore;
  const lockedDeleteBlocked =
    removeSelectedSpatialObjects() === 0 &&
    Boolean(spatialObjectById(object?.id || ""));
  const unlocked =
    toggleSelectedSpatialObjectLock() &&
    objectRecord?.meta?.locked !== true &&
    dom.mapLockObject.textContent === "Lock" &&
    !dom.mapDuplicateObject.disabled &&
    !dom.mapDeleteObject.disabled;
  setMapObjectFilter("outputs");
  const pinnedVisibleAcrossFilter =
    state.mapObjectFilter === "outputs" &&
    Boolean(
      dom.flowBoard.querySelector(
        `[data-spatial-object-id='${object?.id}'].pinned`,
      ),
    ) &&
    buildSpatialWorkspaceExport().objectFilter?.visibleObjectIds.includes(
      object?.id || "",
    );
  setMapObjectFilter("all");
  const contextText = buildSpatialObjectContextText(objectRecord);
  const contextExported =
    contextText.includes("Renamed map note") &&
    contextText.includes("Manual spatial object property note") &&
    contextText.includes(
      "Use this map note as a Codex refinement instruction",
    ) &&
    contextText.includes("- Pinned: yes") &&
    contextText.includes("- Locked: no") &&
    contextText.includes("- Layer: Layer") &&
    contextText.includes("## Custom Properties") &&
    contextText.includes("- constraint: keep near generated output") &&
    contextText.includes("Prompt / Context");
  const activeViewport =
    viewportPresets[activeFrame.viewport] || viewportPresets.desktop;
  const taskPackSpatialContext = buildTaskPack(
    [
      {
        ...activeFrame,
        index: 1,
        viewportWidth: activeViewport.width,
        viewportHeight: activeViewport.height,
        composition: buildFrameComposition(activeFrame),
      },
    ],
    [],
  ).spatialContext;
  const spatialContextExported =
    taskPackSpatialContext?.selectedObject?.prompt ===
      "Use this map note as a Codex refinement instruction" &&
    taskPackSpatialContext?.selectedObject?.customProperties?.some(
      (property) =>
        property.key === "state" && property.value === "review-needed",
    ) &&
    taskPackSpatialContext.prompts?.some(
      (entry) =>
        entry.objectId === object?.id &&
        entry.prompt ===
          "Use this map note as a Codex refinement instruction",
    );
  const groupContextText = buildSpatialObjectContextText(groupRecord);
  const groupInspectorExported =
    groupContextText.includes("Group contents") &&
    groupContextText.includes("Renamed map note") &&
    groupContextText.includes(activeFrame.title);
  if (group) {
    selectSpatialObject(group.id, { render: true });
  }
  const groupActionButtonsEnabled =
    Boolean(group) &&
    !dom.mapUngroupSelection.disabled &&
    !dom.mapSelectGroupContents.disabled &&
    !dom.mapFitGroup.disabled;
  const groupContentsSelected =
    selectSelectedSpatialGroupContents() >= 1 &&
    currentSelectedSpatialObjectIds().includes(object?.id || "");
  if (group) {
    selectSpatialObject(group.id, { render: true });
  }
  const groupBeforeFit = groupRecord
    ? {
        x: groupRecord.x,
        y: groupRecord.y,
        width: groupRecord.width,
        height: groupRecord.height,
      }
    : null;
  const fitSelectedGroup =
    fitSelectedSpatialGroupsToContents() === 1 &&
    Boolean(
      groupBeforeFit &&
        groupRecord &&
        (groupRecord.x !== groupBeforeFit.x ||
          groupRecord.y !== groupBeforeFit.y ||
          groupRecord.width !== groupBeforeFit.width ||
          groupRecord.height !== groupBeforeFit.height),
    ) &&
    spatialGroupMemberDetails(groupRecord).objects.some(
      (entry) => entry.id === object?.id,
    );
  if (object) {
    selectSpatialObject(object.id, { render: true });
  }
  const layerMovedFront =
    Boolean(objectRecord) &&
    bringSelectedSpatialObjectsFront() &&
    spatialObjectLayerIndex(objectRecord) ===
      spatialObjectLayerPeers(objectRecord).length - 1 &&
    !dom.mapSendObjectBack.disabled;
  const layerMovedBack =
    Boolean(objectRecord) &&
    sendSelectedSpatialObjectsBack() &&
    spatialObjectLayerIndex(objectRecord) === 0 &&
    !dom.mapBringObjectFront.disabled;
  const layerExported = buildSpatialWorkspaceExport().objects.some(
    (entry) =>
      entry.id === object?.id &&
      entry.layerIndex === 0 &&
      entry.layerLabel.startsWith("Layer 1 of ") &&
      entry.contextMarkdown.includes("- Layer: Layer 1 of "),
  );
  const objectXBeforeNudge = objectRecord?.x || 0;
  let nudgePrevented = false;
  onWindowKeyDown({
    key: "ArrowRight",
    shiftKey: true,
    metaKey: false,
    ctrlKey: false,
    target: document.body,
    preventDefault() {
      nudgePrevented = true;
    },
  });
  const nudged =
    Boolean(objectRecord) &&
    nudgePrevented &&
    objectRecord.x === objectXBeforeNudge + 32;
  let duplicatePrevented = false;
  onWindowKeyDown({
    key: "d",
    shiftKey: false,
    metaKey: true,
    ctrlKey: false,
    target: document.body,
    preventDefault() {
      duplicatePrevented = true;
    },
  });
  const duplicateObject = selectedSpatialObject();
  const duplicated =
    Boolean(object && duplicateObject) &&
    duplicatePrevented &&
    duplicateObject.id !== object.id &&
    duplicateObject.title.includes("copy") &&
    duplicateObject.x === objectRecord.x + 36;
  let deletePrevented = false;
  onWindowKeyDown({
    key: "Delete",
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    target: document.body,
    preventDefault() {
      deletePrevented = true;
    },
  });
  const duplicateDeleted =
    Boolean(duplicateObject) &&
    deletePrevented &&
    !spatialObjectById(duplicateObject.id) &&
    !state.selectedSpatialObjectId;
  selectSpatialObject(object?.id, { render: false });
  selectSpatialObject(group?.id, { render: true, additive: true });
  const multiSelected =
    currentSelectedSpatialObjectIds().length === 2 &&
    !dom.mapSelectionActions.hidden &&
    dom.mapSelectedObjectTitle.textContent.includes("2 Map objects");
  const multiContext = buildSpatialSelectionContextText();
  const multiContextExported =
    multiContext.includes("Renamed map note") &&
    multiContext.includes("Self-test group");
  const groupBeforeMultiNudge = group ? spatialObjectById(group.id) : null;
  const objectBeforeMultiNudge = object ? spatialObjectById(object.id) : null;
  const groupXBeforeMultiNudge = groupBeforeMultiNudge?.x || 0;
  const objectXBeforeMultiNudge = objectBeforeMultiNudge?.x || 0;
  nudgeSelectedSpatialObject(16, 0);
  const groupAfterMultiNudge = group ? spatialObjectById(group.id) : null;
  const objectAfterMultiNudge = object ? spatialObjectById(object.id) : null;
  const multiNudged =
    Boolean(groupAfterMultiNudge && objectAfterMultiNudge) &&
    groupAfterMultiNudge.x === groupXBeforeMultiNudge + 16 &&
    objectAfterMultiNudge.x === objectXBeforeMultiNudge + 16;
  setSelectedSpatialObjects([]);
  const lassoTargetBounds = unionBounds(
    [object, outsideObject]
      .map((entry) => (entry ? spatialObjectBounds(spatialObjectById(entry.id)) : null))
      .filter(Boolean),
  );
  state.flowLasso = {
    pointerId: 927,
    startPoint: {
      x: Math.max(0, (lassoTargetBounds?.left || 0) - 24),
      y: Math.max(0, (lassoTargetBounds?.top || 0) - 24),
    },
    currentPoint: {
      x: (lassoTargetBounds?.right || 0) + 24,
      y: (lassoTargetBounds?.bottom || 0) + 24,
    },
    baseIds: [],
    additive: false,
    didMove: true,
  };
  const lassoHits = applySpatialLassoSelection(flowLassoBounds(state.flowLasso));
  renderFlowBoard();
  const lassoSelected =
    lassoHits.length >= 2 &&
    currentSelectedSpatialObjectIds().includes(object?.id || "") &&
    currentSelectedSpatialObjectIds().includes(outsideObject?.id || "") &&
    Boolean(dom.flowBoard.querySelector(".flow-lasso-overlay"));
  state.flowLasso = null;
  renderFlowBoard();
  if (object && outsideObject) {
    selectSpatialObject(object.id, { render: false });
    selectSpatialObject(outsideObject.id, { render: true, additive: true });
  }
  const transformBounds = selectedSpatialTransformBounds();
  const transformBoxRendered = Boolean(
    transformBounds && dom.flowBoard.querySelector(".spatial-selection-box"),
  );
  const outsideBeforeResize = outsideObject
    ? structuredClone(spatialObjectById(outsideObject.id))
    : null;
  const objectBeforeResize = object
    ? structuredClone(spatialObjectById(object.id))
    : null;
  if (transformBounds) {
    state.flowDrag = {
      kind: "spatial-selection-resize",
      pointerId: 930,
      handle: "se",
      startX: 100,
      startY: 100,
      originBounds: transformBounds,
      objectOrigins: selectedSpatialTransformObjects().map((entry) => ({
        id: entry.id,
        x: entry.x,
        y: entry.y,
        width: entry.width || SPATIAL_OBJECT_WIDTH,
        height: entry.height || SPATIAL_OBJECT_HEIGHT,
      })),
      didMove: false,
    };
    onWindowPointerMove({ pointerId: 930, clientX: 180, clientY: 150 });
    onWindowPointerUp({ pointerId: 930 });
  }
  const outsideAfterResize = outsideObject
    ? spatialObjectById(outsideObject.id)
    : null;
  const objectAfterResize = object ? spatialObjectById(object.id) : null;
  const selectionResized =
    Boolean(
      transformBoxRendered &&
        outsideBeforeResize &&
        outsideAfterResize &&
        objectBeforeResize &&
        objectAfterResize,
    ) &&
    outsideAfterResize.width > outsideBeforeResize.width &&
    objectAfterResize.width > objectBeforeResize.width;
  const groupSelectionButtonEnabled = !dom.mapGroupSelection.disabled;
  const groupFromSelection = createSpatialGroupFromSelection();
  const groupFromSelectionRecord = groupFromSelection
    ? spatialObjectById(groupFromSelection.id)
    : null;
  const groupFromSelectionExport = buildSpatialWorkspaceExport();
  const groupFromSelectionExported = groupFromSelectionExport.groups.find(
    (entry) => entry.id === groupFromSelection?.id,
  );
  const groupedFromSelection =
    Boolean(groupSelectionButtonEnabled && groupFromSelectionRecord) &&
    state.selectedSpatialObjectId === groupFromSelection?.id &&
    groupFromSelectionRecord.meta?.createdFrom === "map-selection" &&
    groupFromSelectionRecord.meta?.groupedObjectIds?.includes(object?.id) &&
    groupFromSelectionRecord.meta?.groupedObjectIds?.includes(outsideObject?.id) &&
    Boolean(
      groupFromSelectionExported?.memberObjectIds.includes(object?.id || "") &&
        groupFromSelectionExported?.memberObjectIds.includes(
          outsideObject?.id || "",
        ),
    ) &&
    !dom.mapUngroupSelection.disabled;
  const ungroupedSelection =
    ungroupSelectedSpatialGroups() === 1 &&
    !spatialObjectById(groupFromSelection?.id || "") &&
    Boolean(
      spatialObjectById(object?.id || "") &&
        spatialObjectById(outsideObject?.id || ""),
    );
  if (object) {
    selectSpatialObject(object.id, { render: false });
  }
  const objectBeforeGroupDrag = objectRecord
    ? { x: objectRecord.x, y: objectRecord.y }
    : null;
  const nestedChildBeforeGroupDrag = nestedChildRecord
    ? { x: nestedChildRecord.x, y: nestedChildRecord.y }
    : null;
  const frameBeforeGroupDrag = {
    x: activeFrame.flowPosition.x,
    y: activeFrame.flowPosition.y,
  };
  const groupBeforeDrag = groupRecord
    ? { x: groupRecord.x, y: groupRecord.y }
    : null;
  if (groupRecord) {
    state.flowDrag = {
      kind: "spatial-selection",
      objectId: groupRecord.id,
      pointerId: 928,
      startX: 100,
      startY: 100,
      objectOrigins: [
        {
          id: groupRecord.id,
          x: groupRecord.x,
          y: groupRecord.y,
          memberOrigins: buildSpatialGroupDragMemberOrigins(groupRecord),
        },
      ],
      didMove: false,
    };
    onWindowPointerMove({ pointerId: 928, clientX: 170, clientY: 145 });
    onWindowPointerUp({ pointerId: 928 });
  }
  const objectAfterGroupDrag = object ? spatialObjectById(object.id) : null;
  const nestedChildAfterGroupDrag = nestedChild
    ? spatialObjectById(nestedChild.id)
    : null;
  const groupAfterDrag = group ? spatialObjectById(group.id) : null;
  const groupDragMovedMembers =
    Boolean(groupBeforeDrag && groupAfterDrag && groupAfterDrag.x > groupBeforeDrag.x) &&
    Boolean(
      objectBeforeGroupDrag &&
        objectAfterGroupDrag &&
        objectAfterGroupDrag.x > objectBeforeGroupDrag.x,
    ) &&
    Boolean(
      nestedChildBeforeGroupDrag &&
        nestedChildAfterGroupDrag &&
        nestedChildAfterGroupDrag.x > nestedChildBeforeGroupDrag.x,
    ) &&
    activeFrame.flowPosition.x > frameBeforeGroupDrag.x;
  const groupForResize = group ? spatialObjectById(group.id) : null;
  const groupWidthBefore = groupForResize?.width || 0;
  const nestedChildWidthBeforeGroupResize =
    nestedChildAfterGroupDrag?.width || 0;
  if (groupForResize) {
    state.flowDrag = {
      kind: "spatial-object-resize",
      objectId: groupForResize.id,
      pointerId: 929,
      startX: 100,
      startY: 100,
      originX: groupForResize.x,
      originY: groupForResize.y,
      originWidth: groupForResize.width,
      originHeight: groupForResize.height,
      memberOrigins: buildSpatialGroupDragMemberOrigins(groupForResize),
      didMove: false,
    };
    onWindowPointerMove({ pointerId: 929, clientX: 170, clientY: 140 });
    onWindowPointerUp({ pointerId: 929 });
  }
  const resizedGroup = group ? spatialObjectById(group.id) : null;
  const nestedChildAfterGroupResize = nestedChild
    ? spatialObjectById(nestedChild.id)
    : null;
  const resized =
    Boolean(resizedGroup && resizedGroup.width > groupWidthBefore) &&
    Boolean(
      nestedChildAfterGroupResize &&
        nestedChildAfterGroupResize.width > nestedChildWidthBeforeGroupResize,
    );
  const spatialExport = buildSpatialWorkspaceExport();
  const groupExport = spatialExport.groups.find(
    (entry) => entry.id === group?.id,
  );
  const groupHierarchyExported =
    Boolean(
      nestedGroup &&
        groupExport?.memberGroupIds.includes(nestedGroup.id) &&
        spatialExport.groupHierarchy?.nodes?.some(
          (node) =>
            node.id === nestedGroup.id &&
            node.parentGroupIds.includes(group?.id || "") &&
            node.pathGroupIds.includes(group?.id || "") &&
            node.pathLabel.includes("Self-test group"),
        ),
    ) &&
    spatialExport.objects.some(
      (entry) =>
        entry.id === nestedGroup?.id &&
        entry.groupHierarchy?.parentGroupIds?.includes(group?.id || ""),
    ) &&
    spatialExport.objects.some(
      (entry) =>
        entry.id === nestedChild?.id &&
        entry.groupHierarchy?.parentGroupIds?.includes(
          nestedGroup?.id || "",
        ),
    );
  const selectedObjectExported =
    spatialExport.selectedObjectId === object?.id &&
    spatialExport.selectedObjectIds.includes(object?.id || "") &&
    spatialExport.selectedObject?.id === object?.id &&
    spatialExport.selectedObjects.some((entry) => entry.id === object?.id) &&
    spatialExport.selectedObject?.inspector?.sections?.some(
      (section) => section.id === "manual",
    ) &&
    spatialExport.selectedObject?.inspector?.sections?.some((section) =>
      section.items.some(
        (item) => item.value === "Codex should prioritize this note",
      ),
    ) &&
    spatialExport.selectedObject?.contextMarkdown.includes(
      "Manual spatial object property note",
    );
  const exported = spatialExport.objects.some(
    (entry) => entry.id === object?.id && entry.sourceKind === "manual-note",
  ) &&
    spatialExport.objects.some(
      (entry) =>
        entry.id === group?.id &&
        entry.sourceKind === "spatial-group" &&
        entry.size.width > groupWidthBefore,
    ) &&
    Boolean(
      groupExport?.memberObjectIds.includes(object?.id || "") &&
        groupExport?.memberCardIds.includes(activeFrame.id),
    );
  selectSpatialObject(group?.id, { render: true });
  const groupDuplicate = duplicateSelectedSpatialObject();
  const groupedObjectCopy = object
    ? state.spatialObjects.find(
        (entry) =>
          entry.meta?.copiedFrom === object.id &&
          entry.meta?.copiedWithinGroupId === group?.id,
      )
    : null;
  const groupDuplicatedWithMembers =
    Boolean(groupDuplicate && groupedObjectCopy) &&
    groupDuplicate.id !== group?.id &&
    groupedObjectCopy.x === (objectAfterGroupDrag?.x || 0) + 36 &&
    state.selectedSpatialObjectId === groupDuplicate.id;
  if (object) {
    removeSpatialObject(object.id);
  }
  if (group) {
    removeSpatialObject(group.id);
  }
  if (outsideObject) {
    removeSpatialObject(outsideObject.id);
  }
  if (nestedGroup) {
    removeSpatialObject(nestedGroup.id);
  }
  if (nestedChild) {
    removeSpatialObject(nestedChild.id);
  }
  const removed = object
    ? !state.spatialObjects.some((entry) =>
        [
          object.id,
          group?.id,
          nestedGroup?.id,
          nestedChild?.id,
          outsideObject?.id,
        ].includes(entry.id),
      )
    : false;

  state.workspaceMode = previous.workspaceMode;
  state.workbenchFocus = previous.workbenchFocus;
  state.viewMode = previous.viewMode;
  state.mapObjectFilter = previous.mapObjectFilter;
  state.spatialObjects = previous.spatialObjects;
  state.selectedSpatialObjectId = previous.selectedSpatialObjectId;
  state.selectedSpatialObjectIds = previous.selectedSpatialObjectIds;
  activeFrame.flowPosition = previous.activeFramePosition;
  persistState();
  renderAll();

  return assert(
    added &&
      selectedRendered &&
      selectionActionsVisible &&
      propertyEdited &&
      detailEdited &&
      pinned &&
      locked &&
      lockedNudgeBlocked &&
      lockedDeleteBlocked &&
      unlocked &&
      pinnedVisibleAcrossFilter &&
      contextExported &&
      spatialContextExported &&
      groupInspectorExported &&
      groupActionButtonsEnabled &&
      groupContentsSelected &&
      fitSelectedGroup &&
      layerMovedFront &&
      layerMovedBack &&
      layerExported &&
      nudged &&
      duplicated &&
      duplicateDeleted &&
      multiSelected &&
      multiContextExported &&
      multiNudged &&
      lassoSelected &&
      selectionResized &&
      groupedFromSelection &&
      ungroupedSelection &&
      groupDuplicatedWithMembers &&
      groupDragMovedMembers &&
      groupHierarchyExported &&
      resized &&
      selectedObjectExported &&
      exported &&
      removed,
    "Manual spatial map note and group can be selected, locked, grouped, ungrouped, nudged, duplicated, deleted, moved with members, resized, exported, and removed",
    JSON.stringify({
      added,
      selectedRendered,
      selectionActionsVisible,
      propertyEdited,
      detailEdited,
      pinned,
      locked,
      lockedNudgeBlocked,
      lockedDeleteBlocked,
      unlocked,
      pinnedVisibleAcrossFilter,
      contextExported,
      spatialContextExported,
      groupInspectorExported,
      groupActionButtonsEnabled,
      groupContentsSelected,
      fitSelectedGroup,
      layerMovedFront,
      layerMovedBack,
      layerExported,
      nudged,
      duplicated,
      duplicateDeleted,
      multiSelected,
      multiContextExported,
      multiNudged,
      lassoSelected,
      lassoHitCount: lassoHits.length,
      selectionResized,
      groupSelectionButtonEnabled,
      groupedFromSelection,
      ungroupedSelection,
      transformBoxRendered,
      groupDuplicatedWithMembers,
      groupDragMovedMembers,
      groupHierarchyExported,
      resized,
      selectedObjectExported,
      exported,
      removed,
      groupExport,
      groupHierarchy: spatialExport.groupHierarchy,
      objectBeforeGroupDrag,
      objectAfterGroupDrag: objectAfterGroupDrag
        ? { x: objectAfterGroupDrag.x, y: objectAfterGroupDrag.y }
        : null,
      nestedChildBeforeGroupDrag,
      nestedChildAfterGroupDrag: nestedChildAfterGroupDrag
        ? {
            x: nestedChildAfterGroupDrag.x,
            y: nestedChildAfterGroupDrag.y,
            width: nestedChildAfterGroupDrag.width,
          }
        : null,
      nestedChildAfterGroupResize: nestedChildAfterGroupResize
        ? {
            x: nestedChildAfterGroupResize.x,
            y: nestedChildAfterGroupResize.y,
            width: nestedChildAfterGroupResize.width,
          }
        : null,
      frameBeforeGroupDrag,
      frameAfterGroupDrag: activeFrame.flowPosition,
    }),
  );
}

async function assertVisualReferenceTokenExtraction() {
  const frame = currentFrame();
  const previousElements = structuredClone(frame.elements);
  const previousDesignTokens = structuredClone(state.board.designTokens);
  const previousSelection = selectionIds();
  const previousSelectedElementId = state.selectedElementId;
  const history = ensureHistory(frame.id);
  const previousHistory = {
    past: structuredClone(history.past),
    future: structuredClone(history.future),
  };

  const file = await createSelfTestImageFile();
  const imageDataUrl = await readFileAsDataUrl(file);
  frame.elements.push({
    id: uid("image"),
    type: "image",
    start: { x: 260, y: 220 },
    end: { x: 460, y: 360 },
    color: state.color,
    size: 2,
    alpha: 1,
    composite: "source-over",
    imageDataUrl,
    sourceName: "Self-test reference image",
  });

  const tokens = await extractDesignTokensFromCurrentFrame({
    capture: false,
    silent: true,
  });
  const visualTokensOk =
    tokens.visualSamples.sampledSources > 0 &&
    tokens.visualSamples.colorCount > 0 &&
    tokens.summary.includes("visual reference") &&
    tokens.palette.some((entry) => entry.count > 12);

  window.clearTimeout(state.captureTimer);
  state.captureTimer = null;
  frame.elements = previousElements;
  state.board.designTokens = previousDesignTokens;
  history.past = previousHistory.past;
  history.future = previousHistory.future;
  setSelectedElements(previousSelection, previousSelectedElementId);
  persistState();
  renderAll();

  return assert(
    visualTokensOk,
    "design tokens sample pasted/reference image pixels",
  );
}

async function assertExternalDesignTokenImport() {
  const frame = currentFrame();
  const previousDesignTokens = structuredClone(state.board.designTokens);
  const tokens = await importExternalDesignTokens({
    capture: false,
    silent: true,
    pack: {
      kind: "canvax-external-design-tokens",
      createdAt: new Date().toISOString(),
      requiresOpenAiApiKey: false,
      source: {
        type: "inline-text",
        label: "Self-test CSS token source",
        linkedStylesheets: [],
      },
      palette: [
        { hex: "#e85d3a", count: 4, role: "primary" },
        { hex: "#14323f", count: 2, role: "accent" },
      ],
      typography: {
        fontFamilies: ["Georgia, serif"],
      },
      usage: {
        colorCount: 2,
      },
      semanticStructure: {
        kind: "canvax-semantic-structure",
        detected: true,
        sourceLanguage: "html",
        landmarks: [{ type: "main", count: 1, examples: ["main"] }],
        components: [{ type: "hero", count: 1, examples: ["main"] }],
        headings: [{ level: 1, text: "Self-test screen" }],
        actions: [{ type: "button", label: "Start", target: "" }],
        forms: [],
        canvaxBindings: [
          {
            id: "self-test-node",
            type: "hero",
            tag: "main",
            label: "Self-test screen",
          },
        ],
        classSignals: [{ type: "hero", count: 1, examples: ["hero"] }],
        summary: "1 Canvax-bound node",
      },
      summary:
        "inline-text source: Self-test CSS token source. Top colors: #e85d3a, #14323f.",
    },
  });
  const imported =
    tokens?.source === "external-design-token-pack" &&
    tokens.sourceFrameTitle === "Self-test CSS token source" &&
    tokens.palette[0]?.hex === "#e85d3a" &&
    tokens.semanticStructure?.components?.some(
      (entry) => entry.type === "hero",
    ) &&
    tokens.semanticStructure?.canvaxBindings?.some(
      (binding) => binding.id === "self-test-node",
    ) &&
    buildDesignKitSummary().designTokens?.source ===
      "external-design-token-pack";

  state.board.designTokens = previousDesignTokens;
  window.clearTimeout(state.captureTimer);
  state.captureTimer = null;
  persistState();
  renderAll();

  return assert(
    imported,
    "external design token packs import into Design kit",
    JSON.stringify({
      source: tokens?.source,
      title: tokens?.sourceFrameTitle,
      palette: tokens?.palette,
      frame: frame.id,
    }),
  );
}

async function assertImageAssetPlacement() {
  const frame = currentFrame();
  const previousElements = structuredClone(frame.elements);
  const previousSelection = selectionIds();
  const previousSelectedElementId = state.selectedElementId;
  const history = ensureHistory(frame.id);
  const previousHistory = {
    past: structuredClone(history.past),
    future: structuredClone(history.future),
  };

  const file = await createSelfTestImageFile();
  const element = await placeImageFile(file, { x: 360, y: 280 });
  const bounds = getElementBounds(element, frame);
  const composition = buildFrameComposition(frame);
  const compositionEntry = composition.elements.find(
    (entry) => entry.id === element.id,
  );
  const materializeElement = buildMaterializeElement(element, frame);
  const placed =
    element.type === "image" &&
    Boolean(element.imageDataUrl) &&
    bounds?.width > 80 &&
    bounds?.height > 60 &&
    state.selectedElementId === element.id &&
    compositionEntry?.hasEmbeddedImage === true &&
    materializeElement?.imageDataUrl === element.imageDataUrl;

  window.clearTimeout(state.captureTimer);
  state.captureTimer = null;
  frame.elements = previousElements;
  history.past = previousHistory.past;
  history.future = previousHistory.future;
  setSelectedElements(previousSelection, previousSelectedElementId);
  persistState();
  renderAll();

  return assert(placed, "image assets paste/drop as editable elements");
}

async function assertAssetCandidateTrayPlacement() {
  const frame = currentFrame();
  const previousElements = structuredClone(frame.elements);
  const previousSelection = selectionIds();
  const previousSelectedElementId = state.selectedElementId;
  const previousAssetCandidatePack = structuredClone(state.assetCandidatePack);
  const previousImageResultPack = structuredClone(state.imageResultPack);
  const history = ensureHistory(frame.id);
  const previousHistory = {
    past: structuredClone(history.past),
    future: structuredClone(history.future),
  };
  const candidateId = "asset-selftest-region";
  const pathCandidateId = "asset-selftest-path-region";
  const resultCandidateId = "asset-selftest-result-region";
  const resultImageDataUrl =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='32' height='32' fill='%230c8d7b'/%3E%3C/svg%3E";

  state.assetCandidatePack = normalizeAssetCandidatePack({
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    kind: "canvax-asset-candidates",
    requiresOpenAiApiKey: false,
    candidates: [
      {
        id: candidateId,
        type: "region",
        status: "prompt-ready",
        sourceFrameId: frame.id,
        sourceFrameTitle: frame.title,
        title: "Self-test visual region",
        prompt: "Generate a visual for the selected Canvax region.",
        negativePrompt: "",
        bounds: { x: 0.2, y: 0.22, w: 0.24, h: 0.18 },
        placement: "upper-left",
        aspectRatio: "4:3",
        outputSlots: [],
      },
      {
        id: pathCandidateId,
        type: "region",
        status: "prompt-ready",
        sourceFrameId: frame.id,
        sourceFrameTitle: frame.title,
        title: "Self-test path import region",
        prompt: "Attach a generated image from a saved workspace path.",
        negativePrompt: "",
        bounds: { x: 0.58, y: 0.24, w: 0.18, h: 0.18 },
        placement: "upper-right",
        aspectRatio: "1:1",
        outputSlots: [],
      },
      {
        id: resultCandidateId,
        type: "region",
        status: "prompt-ready",
        sourceFrameId: frame.id,
        sourceFrameTitle: frame.title,
        title: "Self-test hosted result region",
        prompt: "Show a hosted image result imported from the no-API return pack.",
        negativePrompt: "",
        bounds: { x: 0.36, y: 0.48, w: 0.18, h: 0.16 },
        placement: "center",
        aspectRatio: "1:1",
        outputSlots: [],
      },
    ],
  });
  state.imageResultPack = normalizeImageResultPack({
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    kind: "canvax-image-results",
    requiresOpenAiApiKey: false,
    results: [
      {
        kind: "canvax-image-result",
        candidateId: resultCandidateId,
        slotId: `${resultCandidateId}-slot-1`,
        status: "returned",
        imagePath: resultImageDataUrl,
      },
    ],
  });
  const normalizedCandidate = assetCandidateById(candidateId);
  renderAssetCandidateTray();
  const copyPromptButtonRendered = Boolean(
    dom.assetCandidateTray.querySelector(
      `[data-asset-candidate-copy="${candidateId}"]`,
    ),
  );
  const copyHostTaskButtonRendered = Boolean(
    dom.assetCandidateTray.querySelector(
      `[data-asset-candidate-host-task="${candidateId}"]`,
    ),
  );
  const clipboardPromptText = buildAssetCandidateClipboardText(
    normalizedCandidate,
  );
  const clipboardHostTaskText = buildAssetCandidateHostTaskClipboardText(
    normalizedCandidate,
  );
  const pathImportInputRendered = Boolean(
    dom.assetCandidateTray.querySelector(
      `[data-asset-candidate-path="${pathCandidateId}"]`,
    ),
  );
  const hostedResultReview = assetCandidateReviewState(
    assetCandidateById(resultCandidateId),
  );
  const hostedResultRendered =
    hostedResultReview?.tone === "attached" &&
    hostedResultReview?.previewSrc?.startsWith("data:image/svg+xml") &&
    dom.assetCandidateTray.innerHTML.includes("Imported result");
  const element = placeAssetCandidatePlaceholder(candidateId);
  const file = await createSelfTestImageFile();
  const imageElement = await placeAssetCandidateImage(candidateId, file);
  const accepted = acceptAssetCandidate(candidateId, { sync: false });
  const pathDataUrl = await readFileAsDataUrl(file);
  const pathImageElement = await placeAssetCandidateImageFromPath(
    pathCandidateId,
    pathDataUrl,
  );
  const pathCandidate = assetCandidateById(pathCandidateId);
  const pathSlot = pathCandidate?.outputSlots?.[0] || null;
  const pathReview = assetCandidateReviewState(pathCandidate);
  const acceptedCandidate = assetCandidateById(candidateId);
  const acceptedSlot = acceptedCandidate?.outputSlots?.[0] || null;
  const reviewSummary = state.assetCandidatePack?.reviewSummary || {};
  const acceptedSummary = reviewSummary.acceptedCandidates?.[0] || null;
  const reviewGroup = reviewSummary.groups?.find(
    (group) => group.frameId === frame.id,
  );
  const placementMap = acceptedCandidate?.placementMap || {};
  const bounds = element ? getElementBounds(element, frame) : null;
  const viewport = viewportPresets[frame.viewport] || viewportPresets.desktop;
  const placed =
    !dom.assetCandidateTray.hidden &&
    copyPromptButtonRendered &&
    copyHostTaskButtonRendered &&
    clipboardPromptText.includes("Generate a visual for the selected Canvax region.") &&
    clipboardPromptText.includes("Target selector:") &&
    clipboardHostTaskText.includes("# Canvax Image Host Task") &&
    clipboardHostTaskText.includes("Output slot:") &&
    clipboardHostTaskText.includes("Requires OpenAI API key: no") &&
    pathImportInputRendered &&
    hostedResultRendered &&
    normalizedCandidate?.placementMap?.kind === "canvax-asset-placement" &&
    normalizedCandidate?.outputSlots?.[0]?.slotId ===
      `${candidateId}-slot-1` &&
    element?.type === "image" &&
    element.assetCandidateId === candidateId &&
    !element.imageDataUrl &&
    bounds?.width > viewport.width * 0.2 &&
    bounds?.height > viewport.height * 0.14 &&
    Math.abs((element.start?.x || 0) - viewport.width * 0.2) < 4 &&
    Math.abs((element.start?.y || 0) - viewport.height * 0.22) < 4 &&
    imageElement?.assetCandidateId === candidateId &&
    Boolean(imageElement?.imageDataUrl) &&
    pathImageElement?.assetCandidateId === pathCandidateId &&
    pathImageElement?.src?.startsWith("data:image/") &&
    pathCandidate?.status === "attached" &&
    pathSlot?.imagePath === "inline-data-url" &&
    pathSlot?.status === "attached" &&
    pathReview?.tone === "attached" &&
    accepted &&
    acceptedCandidate?.status === "accepted" &&
    acceptedSlot?.accepted === true &&
    acceptedSlot?.status === "accepted" &&
    acceptedSlot?.imageElementId === imageElement.id &&
    placementMap.targetSelector?.includes(candidateId) &&
    reviewSummary.placementReady === 3 &&
    reviewSummary.slotCount === 3 &&
    reviewSummary.attached === 1 &&
    reviewSummary.accepted === 1 &&
    reviewSummary.kind === "canvax-asset-candidate-review" &&
    reviewSummary.hostHandoff?.requiresOpenAiApiKey === false &&
    reviewSummary.hostHandoff?.copyReadyFiles?.includes(
      "exports/canvax-image-host-task-latest.json",
    ) &&
    reviewSummary.hostHandoff?.copyReadyFiles?.includes(
      "exports/canvax-image-generation-brief-latest.md",
    ) &&
    reviewGroup?.total === 3 &&
    reviewGroup?.acceptedCandidateIds?.includes(candidateId) &&
    reviewSummary.acceptedCandidateIds?.includes(candidateId) &&
    acceptedSummary?.imageElementId === imageElement.id;

  window.clearTimeout(state.captureTimer);
  state.captureTimer = null;
  frame.elements = previousElements;
  history.past = previousHistory.past;
  history.future = previousHistory.future;
  state.assetCandidatePack = previousAssetCandidatePack;
  state.imageResultPack = previousImageResultPack;
  setSelectedElements(previousSelection, previousSelectedElementId);
  persistState();
  renderAll();

  return assert(
    placed,
    "asset candidate tray copies prompts, places, imports by path, attaches, accepts, and summarizes editable image slots",
  );
}

async function assertStrokeOnlyGenerateScreen() {
  const previousFrames = structuredClone(state.frames);
  const previousActiveFrameId = state.activeFrameId;
  const previousServerStatus = structuredClone(state.serverStatus);
  const previousSelection = selectionIds();
  const previousSelectedElementId = state.selectedElementId;
  const strokeFrame = createFrame({
    title: "Stroke-only semantic generation",
    viewport: "desktop",
    objective:
      "Make this rough stroke sketch feel like a premium generated product surface.",
    layout:
      "Use the oval as the hero visual cue, the arrow as motion guidance, and the loose path as energy.",
    motion: "Arrow means pull the eye from copy toward the generated visual.",
    elements: [
      {
        id: "semantic-stroke-path",
        type: "path",
        points: [
          { x: 140, y: 220 },
          { x: 260, y: 180 },
          { x: 380, y: 250 },
          { x: 520, y: 210 },
        ],
        color: "#ff5d3a",
        size: 18,
        alpha: 1,
        composite: "source-over",
      },
      {
        id: "semantic-stroke-oval",
        type: "ellipse",
        start: { x: 840, y: 260 },
        end: { x: 1180, y: 620 },
        color: "#0c8d7b",
        size: 12,
        alpha: 1,
        composite: "source-over",
      },
      {
        id: "semantic-stroke-arrow",
        type: "arrow",
        start: { x: 520, y: 680 },
        end: { x: 760, y: 560 },
        color: "#2364aa",
        size: 10,
        alpha: 1,
        composite: "source-over",
      },
      {
        id: "semantic-stroke-label",
        type: "label",
        text: "Turn this loose sketch into a premium product launch surface",
        x: 120,
        y: 170,
        color: "#18110e",
        size: 22,
        alpha: 1,
        composite: "source-over",
      },
    ],
  });

  try {
    state.frames = [...state.frames, strokeFrame];
    state.activeFrameId = strokeFrame.id;
    clearElementSelection();
    persistState();
    renderAll();
    const result = await generateCurrentScreen({
      silent: true,
      announce: false,
      openPreview: false,
      skipCheckpoint: true,
    });
    const html = result?.previewPath
      ? await fetch(`/workspace/${result.previewPath}`, {
          cache: "no-store",
        }).then((response) => (response.ok ? response.text() : ""))
      : "";
    return assert(
      Boolean(result?.previewPath) &&
        html.includes('data-semantic-screen="true"') &&
        html.includes("semantic-hero") &&
        html.includes("Generated from"),
      "generate screen creates semantic output from stroke-first sketches",
      result?.previewPath || "no generated preview path",
    );
  } finally {
    state.frames = previousFrames;
    state.activeFrameId = previousActiveFrameId;
    state.serverStatus = previousServerStatus;
    setSelectedElements(previousSelection, previousSelectedElementId);
    pruneFrameRenderCache(state.frames);
    persistState();
    renderAll();
  }
}

async function createSelfTestImageFile() {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff8ec";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ff5d3a";
  context.fillRect(8, 8, 80, 48);
  context.fillStyle = "#0c8d7b";
  context.beginPath();
  context.arc(48, 32, 18, 0, Math.PI * 2);
  context.fill();
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  return new File([blob || new Blob()], "canvax-selftest-asset.png", {
    type: "image/png",
  });
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
    workspaceMode: state.workspaceMode,
    workbenchFocus: state.workbenchFocus,
    viewMode: state.viewMode,
    flowZoom: state.flowZoom,
    outputLaneCollapsed: state.outputLaneCollapsed,
    historyLaneCollapsed: state.historyLaneCollapsed,
    spatialObjects: structuredClone(state.spatialObjects),
    hiddenSpatialObjectIds: structuredClone(state.hiddenSpatialObjectIds),
    assetCandidatePack: structuredClone(state.assetCandidatePack),
    previewManifest: structuredClone(state.serverStatus.previewManifest),
    checkpointHistory: structuredClone(state.serverStatus.checkpointHistory),
  };

  try {
    const fixture = buildLargeSessionFixture(18);
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
    state.assetCandidatePack = fixture.assetCandidatePack;
    state.outputLaneCollapsed = false;
    state.historyLaneCollapsed = false;
    state.hiddenSpatialObjectIds = [];
    state.serverStatus = {
      ...state.serverStatus,
      previewManifest: fixture.previewManifest,
      checkpointHistory: fixture.checkpointHistory,
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
        exportPackage.voice.intentQueue.length > 0,
        "large-session export keeps voice intent queue",
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
        exportPackage.workbench?.agentLog?.itemCount > 0 &&
          previewPayload.liveExport.workbench?.agentLog?.itemCount > 0,
        "large-session live export carries Workbench agent log",
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

    syncSpatialObjectsFromHandoffs();
    setWorkspaceMode("simple");
    setWorkbenchFocus("map");
    renderFlowBoard();
    const spatialExport = buildSpatialWorkspaceExport();
    const renderedFrameCards =
      dom.flowBoard.querySelectorAll("[data-flow-frame-id]").length;
    const renderedSpatialObjects =
      dom.flowBoard.querySelectorAll("[data-spatial-object-id]").length;
    const objectSources = new Set(
      spatialExport.objects.map((object) => object.sourceKind),
    );
    const mapIsNavigable =
      document.body.dataset.workbenchFocus === "map" &&
      !dom.flowWorkspace.hidden &&
      dom.flowShell.scrollWidth >= dom.flowShell.clientWidth &&
      dom.flowShell.scrollHeight >= dom.flowShell.clientHeight;
    const generatedLabels = [
      ...dom.flowBoard.querySelectorAll(
        ".spatial-object-node.generated-output .spatial-object-header span",
      ),
    ].map((node) => node.textContent.trim().toLowerCase());
    const outputLaneVisible = Boolean(
      dom.flowBoard.querySelector(".spatial-lane-output"),
    );
    const outputLaneExported = spatialExport.lanes.some(
      (lane) =>
        lane.id === SPATIAL_OUTPUT_LANE_ID &&
        lane.memberObjectIds.some((id) => id.startsWith("target-object-")),
    );

    results.push(
      assert(
        renderedFrameCards === fixture.frames.length,
        "large-session browser map renders every frame card",
      ),
    );
    results.push(
      assert(
        renderedSpatialObjects >=
          fixture.expectedSpatialObjectMinimum,
        "large-session browser map renders dense spatial objects",
        `${renderedSpatialObjects} rendered spatial objects`,
      ),
    );
    results.push(
      assert(
        [
          "asset-candidate",
          "generated-target",
          "generated-artifact",
          "workspace-change",
          "checkpoint",
        ].every((source) => objectSources.has(source)),
        "large-session browser map covers candidates, outputs, changes, and checkpoints",
      ),
    );
    results.push(
      assert(
        mapIsNavigable,
        "large-session browser map remains navigable",
      ),
    );
    results.push(
      assert(
        generatedLabels.length > 0 &&
          generatedLabels.includes("generated screen") &&
          generatedLabels.every((label) => label !== "generated-target"),
        "large-session generated output cards use designer-readable labels",
      ),
    );
    results.push(
      assert(
        outputLaneVisible && outputLaneExported,
        "large-session generated output cards sit in the output shelf lane",
      ),
    );
    const largeSessionAgentLog = buildWorkbenchAgentLogItems();
    results.push(
      assert(
        largeSessionAgentLog.length > 0 &&
          largeSessionAgentLog.some((item) =>
            ["Output", "Voice", "Checkpoint"].includes(item.kind),
          ),
        "large-session Workbench agent log summarizes activity",
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
    state.workspaceMode = original.workspaceMode;
    state.workbenchFocus = original.workbenchFocus;
    state.viewMode = original.viewMode;
    state.flowZoom = original.flowZoom;
    state.outputLaneCollapsed = original.outputLaneCollapsed;
    state.historyLaneCollapsed = original.historyLaneCollapsed;
    state.spatialObjects = original.spatialObjects;
    state.hiddenSpatialObjectIds = original.hiddenSpatialObjectIds;
    state.assetCandidatePack = original.assetCandidatePack;
    state.serverStatus = {
      ...state.serverStatus,
      previewManifest: original.previewManifest,
      checkpointHistory: original.checkpointHistory,
    };
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
    previewManifest: buildLargeSessionPreviewManifest(frames),
    checkpointHistory: buildLargeSessionCheckpointHistory(frames),
    assetCandidatePack: buildLargeSessionAssetCandidatePack(frames),
    expectedSpatialObjectMinimum: 32,
  };
}

function buildLargeSessionFrame(index) {
  const viewportIds = Object.keys(viewportPresets);
  const viewport = viewportIds[index % viewportIds.length];
  const heroId = uid("shape");
  const contentId = uid("shape");
  const actionId = uid("shape");
  const accent = palette[index % Math.max(1, palette.length - 1)];
  const captures = [0, 1].map((captureIndex) =>
    buildLargeSessionCapture(index, captureIndex, accent),
  );
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
    thumbnail: captures[0]?.image || "",
    captures,
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

function buildLargeSessionPreviewManifest(frames) {
  return {
    targets: frames.slice(0, 10).map((frame, index) => ({
      id: `large-target-${index + 1}`,
      label: `${frame.title} generated screen`,
      type: index % 2 === 0 ? "generated-screen-preview" : "materialized-preview",
      source: index % 2 === 0 ? "canvax-generate-screen" : "canvax-materialize",
      previewPath: `artifacts/preview/large-session/${frame.id}/index.html`,
      frameIds: [frame.id],
      sourceFrameId: frame.id,
      sourceFrameUpdatedAt: frame.updatedAt,
      changeSummary: `Generated screen for ${frame.title}`,
    })),
    artifacts: frames.slice(0, 8).map((frame, index) => ({
      id: `large-artifact-${index + 1}`,
      label: `${frame.title} spec artifact`,
      path: `artifacts/canvax/large-session/${frame.id}/spec.md`,
      kind: index % 2 === 0 ? "spec" : "context",
      frameIds: [frame.id],
      description: `Implementation handoff for ${frame.title}`,
    })),
    changes: frames.slice(0, 9).map((frame, index) => ({
      id: `large-change-${index + 1}`,
      label: `implementation/${frame.id}.html`,
      path: `artifacts/preview/large-session/${frame.id}/implementation.html`,
      kind: "updated",
      frameIds: [frame.id],
      summary: `Updated generated implementation for ${frame.title}`,
    })),
  };
}

function buildLargeSessionCheckpointHistory(frames) {
  return {
    updatedAt: "2026-03-14T00:20:00.000Z",
    items: frames.slice(0, 10).map((frame, index) => ({
      id: `large-checkpoint-${index + 1}`,
      savedAt: `2026-03-14T00:${String(index + 1).padStart(2, "0")}:00.000Z`,
      reason: index % 2 === 0 ? "focus-apply" : "output-update",
      label: index % 2 === 0 ? "Workbench apply" : "Output update",
      frameId: frame.id,
      frameTitle: frame.title,
      targetLabel: `${frame.title} generated screen`,
      voiceSegmentCount: 1 + (index % 3),
      captureCount: frame.captures.length,
      artifactCount: 1 + (index % 2),
      changeCount: 2 + index,
      checkpointUrl: `/workspace/artifacts/canvax/checkpoints/large-session/${frame.id}.json`,
      markdownUrl: `/workspace/artifacts/canvax/checkpoints/large-session/${frame.id}.md`,
    })),
  };
}

function buildLargeSessionAssetCandidatePack(frames) {
  const candidates = frames.slice(0, 14).map((frame, index) => ({
    id: `large-candidate-${index + 1}`,
    type: index % 4 === 0 ? "frame-composite" : "region",
    title: `${frame.title} image candidate`,
    sourceFrameId: frame.id,
    sourceFrameTitle: frame.title,
    placement: index % 2 === 0 ? "hero image slot" : "supporting asset slot",
    status: index % 3 === 0 ? "accepted" : "prompt-ready",
    prompt: `Generate a polished asset for ${frame.title} with clear composition boundaries.`,
    aspectRatio: index % 2 === 0 ? "16:9" : "4:3",
    bounds: {
      x: 0.08,
      y: 0.12 + (index % 4) * 0.08,
      w: 0.38,
      h: 0.24,
    },
  }));

  return {
    kind: "canvax-asset-candidates",
    requiresOpenAiApiKey: false,
    createdAt: "2026-03-14T00:00:00.000Z",
    candidates,
    reviewSummary: buildAssetCandidateReviewSummary(candidates),
  };
}

function buildLargeSessionCapture(frameIndex, captureIndex, color) {
  const label = `F${frameIndex + 1}.${captureIndex + 1}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" rx="24" fill="#fff8ec"/><rect x="28" y="34" width="264" height="44" rx="12" fill="${color}"/><rect x="28" y="102" width="190" height="56" rx="12" fill="#241814" opacity="0.9"/><text x="42" y="62" font-family="Arial" font-size="22" font-weight="700" fill="#241814">${label}</text></svg>`;
  return {
    id: `large-capture-${frameIndex + 1}-${captureIndex + 1}`,
    at: `2026-03-14T00:${String(frameIndex).padStart(2, "0")}:${String(captureIndex).padStart(2, "0")}.000Z`,
    image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  };
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

function classToken(value) {
  return cleanString(value).replace(/[^a-z0-9_-]/gi, "-") || "item";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
