#!/usr/bin/env node
const DEFAULT_URL = "http://localhost:3210";
const baseUrl = (process.env.CANVAX_URL || process.argv[2] || DEFAULT_URL).replace(
  /\/$/,
  "",
);

const frameId = "frame-demo-hero-live-edit";
const now = () => new Date().toISOString();

function bounds(x, y, width, height) {
  return {
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
  };
}

function rect(id, x, y, width, height, color, size = 6) {
  return {
    id,
    type: "rect",
    color,
    size,
    alpha: 1,
    composite: "source-over",
    groupId: "",
    start: { x, y },
    end: { x: x + width, y: y + height },
    bounds: bounds(x, y, width, height),
  };
}

function arrow(id, start, end, color = "#ff5d3a", size = 10) {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return {
    id,
    type: "arrow",
    color,
    size,
    alpha: 1,
    composite: "source-over",
    groupId: "",
    start,
    end,
    bounds: bounds(left, top, Math.max(width, 12), Math.max(height, 12)),
  };
}

function penStroke(id, points, color = "#ff5d3a", size = 18) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  return {
    id,
    type: "path",
    color,
    size,
    alpha: 0.82,
    composite: "source-over",
    groupId: "",
    points,
    bounds: bounds(left, top, Math.max(right - left, 12), Math.max(bottom - top, 12)),
  };
}

function label(id, text, x, y, options = {}) {
  return {
    id,
    type: "label",
    text,
    color: options.color || "#1c1a1a",
    size: options.size || 24,
    alpha: 1,
    composite: "source-over",
    groupId: "",
    x,
    y,
    attachedTo: options.attachedTo || "",
    anchor: options.anchor || null,
    resolvedPosition: {
      x,
      y,
      attached: Boolean(options.attachedTo),
    },
    bounds: bounds(x, y, Math.max(80, text.length * 10), options.size || 28),
  };
}

const board = {
  project: "Canvax hero live-edit demo",
  goal:
    "Show Codex turning a rough hero-section sketch into a generated webpage, then reacting to a pen-stroke edit by shifting key elements.",
  audience: "website hero section",
  designMood: "Cinematic product UI, sharp contrast, warm coral accent.",
  generation: {
    mode: "generate-screen",
    direction: "cinematic",
    style: "showcase",
    focus: "conversion",
    summary: "Cinematic showcase conversion screen",
  },
};

function buildFrame({ edited = false } = {}) {
  const updatedAt = now();
  const copy = edited
    ? bounds(170, 184, 560, 390)
    : bounds(120, 245, 560, 390);
  const primaryCta = edited
    ? bounds(170, 604, 248, 74)
    : bounds(120, 680, 248, 74);
  const secondaryCta = edited
    ? bounds(444, 604, 220, 74)
    : bounds(394, 680, 220, 74);
  const visual = edited
    ? bounds(760, 258, 520, 520)
    : bounds(790, 210, 520, 520);
  const stat = edited
    ? bounds(880, 806, 290, 90)
    : bounds(930, 780, 290, 90);

  const elements = [
    rect("hero-background", 64, 92, 1312, 820, "#10192a", 5),
    rect("top-nav", 104, 122, 1232, 72, "#1c1a1a", 4),
    label("brand-label", "Canvax Studio", 132, 148, {
      attachedTo: "top-nav",
      size: 22,
      color: "#ffffff",
    }),
    label("nav-label", "Workflows  Preview  Export", 850, 148, {
      attachedTo: "top-nav",
      size: 18,
      color: "#ffffff",
    }),
    rect("hero-copy", copy.left, copy.top, copy.width, copy.height, "#ff5d3a", 8),
    label("headline-label", "Sketch a product. Codex makes it real.", copy.left + 42, copy.top + 76, {
      attachedTo: "hero-copy",
      size: 46,
      color: "#ffffff",
    }),
    label(
      "body-label",
      "Draw placement, speak intent, and keep refining the generated surface without translating every idea into text.",
      copy.left + 46,
      copy.top + 206,
      {
        attachedTo: "hero-copy",
        size: 23,
        color: "#ffffff",
      },
    ),
    rect(
      "primary-cta",
      primaryCta.left,
      primaryCta.top,
      primaryCta.width,
      primaryCta.height,
      "#0c8d7b",
      6,
    ),
    label("primary-cta-label", "Start from sketch", primaryCta.left + 34, primaryCta.top + 28, {
      attachedTo: "primary-cta",
      size: 22,
      color: "#ffffff",
    }),
    rect(
      "secondary-cta",
      secondaryCta.left,
      secondaryCta.top,
      secondaryCta.width,
      secondaryCta.height,
      "#ffffff",
      5,
    ),
    label("secondary-cta-label", "See preview", secondaryCta.left + 42, secondaryCta.top + 28, {
      attachedTo: "secondary-cta",
      size: 22,
      color: "#1c1a1a",
    }),
    rect("preview-panel", visual.left, visual.top, visual.width, visual.height, "#2364aa", 8),
    label("preview-label", "Generated app preview", visual.left + 62, visual.top + 62, {
      attachedTo: "preview-panel",
      size: 30,
      color: "#ffffff",
    }),
    rect("preview-card", visual.left + 74, visual.top + 158, 370, 210, "#ffffff", 5),
    label("preview-card-label", "Live compare surface", visual.left + 112, visual.top + 250, {
      attachedTo: "preview-card",
      size: 24,
      color: "#1c1a1a",
    }),
    rect("stat-chip", stat.left, stat.top, stat.width, stat.height, "#f0a202", 5),
    label("stat-label", "2-pass edit loop", stat.left + 44, stat.top + 36, {
      attachedTo: "stat-chip",
      size: 24,
      color: "#1c1a1a",
    }),
  ];

  if (edited) {
    elements.push(
      penStroke("pen-stroke-shift-request", [
        { x: 114, y: 748 },
        { x: 156, y: 704 },
        { x: 198, y: 652 },
        { x: 264, y: 606 },
        { x: 350, y: 592 },
      ]),
      arrow(
        "shift-arrow",
        { x: 242, y: 716 },
        { x: 364, y: 620 },
        "#ff5d3a",
        12,
      ),
      label(
        "pen-note",
        "Pen edit: lift headline and move CTAs closer to the hero copy.",
        170,
        806,
        { color: "#ff5d3a", size: 24 },
      ),
    );
  }

  return {
    id: frameId,
    index: 1,
    title: edited ? "Hero section - pen edit applied" : "Hero section - initial sketch",
    viewport: "desktop",
    viewportLabel: "Desktop",
    viewportWidth: 1440,
    viewportHeight: 1024,
    objective: edited
      ? "Apply the pen-stroke instruction: raise the headline block, move CTAs upward, and keep the generated hero conversion-focused."
      : "Generate a cinematic SaaS/product hero section from a rough Canvax sketch.",
    layout: edited
      ? "Headline block moves upward and inward. CTAs shift closer to the main copy. Product preview remains right-weighted but slightly lower for balance."
      : "Top nav, left headline block, two CTAs, right product preview panel, and a proof/stat chip.",
    motion:
      "Preview should update in place. Treat the red pen stroke as an edit instruction, not final decorative UI.",
    assets:
      "Use abstract product preview shapes, luminous gradients, and high-contrast launch-page styling.",
    mobile:
      "Stack nav, copy, CTAs, and preview vertically. Keep CTA visible above the fold.",
    updatedAt,
    captureCount: 0,
    backgroundImage: "",
    snapshotDataUrl: "",
    thumbnailDataUrl: "",
    flowPosition: { x: 120, y: 120 },
    elements,
  };
}

function exportPackage(frame) {
  return {
    schemaVersion: 1,
    storageVersion: 2,
    generatedAt: now(),
    transport: {
      mode: "local-companion",
      future: { mode: "app-server" },
    },
    board,
    activeFrameId: frame.id,
    activeFrameTitle: frame.title,
    entryFrameId: frame.id,
    connections: [],
    rewriteQueue: [],
    voice: {
      segmentCount: 1,
      markdown: "- Voice note: make the hero feel real, then use pen edits to shift placement.\n",
      segments: [
        {
          id: "voice-demo-hero",
          text: "Make this hero feel like a real product launch page. I am moving the CTA and headline upward with this pen stroke.",
          at: now(),
          scope: "frame",
          provider: "demo",
          frameId: frame.id,
          frameTitle: frame.title,
        },
      ],
    },
    prompt: `# ${board.project}\n\nUse the active Canvax frame to generate and refine the hero section. The red pen stroke in the edited pass is an instruction to shift layout, not decoration.\n`,
    frames: [
      {
        id: frame.id,
        index: 1,
        title: frame.title,
        viewport: frame.viewport,
        viewportWidth: frame.viewportWidth,
        viewportHeight: frame.viewportHeight,
        objective: frame.objective,
        layout: frame.layout,
        motion: frame.motion,
        assets: frame.assets,
        mobile: frame.mobile,
        flowPosition: frame.flowPosition,
        updatedAt: frame.updatedAt,
        captureCount: frame.captureCount,
        snapshotDataUrl: frame.snapshotDataUrl,
        thumbnailDataUrl: frame.thumbnailDataUrl,
      },
    ],
  };
}

function materializePayload(frame) {
  return {
    schemaVersion: 1,
    storageVersion: 2,
    generatedAt: now(),
    transport: {
      mode: "local-companion",
      future: { mode: "app-server" },
    },
    board,
    generation: board.generation,
    frame,
  };
}

async function postJson(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} failed: ${data.error || response.statusText}`);
  }
  return data;
}

async function publishFrame(frame) {
  await postJson("/api/save-export", {
    package: exportPackage(frame),
    markdown: exportPackage(frame).prompt,
    voiceMarkdown: exportPackage(frame).voice.markdown,
  });
  return postJson("/api/materialize-frame", materializePayload(frame));
}

async function main() {
  const initial = buildFrame({ edited: false });
  const first = await publishFrame(initial);
  await new Promise((resolve) => setTimeout(resolve, 650));
  const edited = buildFrame({ edited: true });
  const second = await publishFrame(edited);

  console.log("Canvax hero live-edit demo published.");
  console.log(`Board: ${baseUrl}`);
  console.log(`Preview: ${baseUrl}/preview.html`);
  console.log(`Initial preview: ${first.previewUrl}`);
  console.log(`Edited preview: ${second.previewUrl}`);
  console.log(`Refinement: ${second.refinement?.summary || "No refinement summary"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
