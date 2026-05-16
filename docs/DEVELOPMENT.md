# Develop Canvax

## Contributor Map

```text
change UI?          -> web/index.html, web/styles.css, web/preview.css
change interactions?-> web/app.js, web/preview.js
change persistence? -> web/app.js, scripts/canvax.mjs
change handoff?     -> scripts/canvax.mjs, docs, skill
change validation?  -> scripts/regression-check.mjs, scripts/browser-regression.mjs
```

```mermaid
flowchart TD
    A[Contributor change] --> B{What kind of change?}
    B -->|Board UI| C[web/index.html and web/styles.css]
    B -->|Preview UI| D[web/preview.html and web/preview.css]
    B -->|Interactions| E[web/app.js and web/preview.js]
    B -->|Persistence and APIs| F[scripts/canvax.mjs]
    B -->|Skill semantics| G[codex-skill and docs]
    B -->|Regression| H[scripts/regression-check.mjs and browser-regression.mjs]
    B -->|Branding| I[web/assets and docs/assets]

    classDef entry fill:#fff7e6,stroke:#f0a202,color:#211815;
    classDef ui fill:#ffede8,stroke:#ff5d3a,color:#211815;
    classDef logic fill:#eaf7f5,stroke:#0c8d7b,color:#10201d;
    classDef service fill:#eef3ff,stroke:#2364aa,color:#101828;
    classDef docs fill:#f7edfb,stroke:#b246a8,color:#211625;
    class A,B entry;
    class C,D,I ui;
    class E logic;
    class F,H service;
    class G docs;
```

## Goal Of These Docs

This file is for contributors and future maintainers.

Use it to understand:

- how to run the project locally
- where to make changes
- how to avoid breaking the sketch loop
- how to extend the current architecture safely

## Local Development

Start or reuse the service:

```bash
./canvax
```

For manual UI work, invoke `/canvax` so `http://localhost:3210` opens in Codex Browser Use / Atlas when available. Use `./canvax --open-external` or `./canvax --chrome` only when you intentionally want an external browser.

Basic syntax check:

```bash
npm run check
```

Broader safe regression pass:

```bash
npm run regression
```

If the Canvax service is already running, that regression pass now also validates the live `/api/preview-state` payload shape, including workspace-follow metadata, and then runs a headless browser pass against both:

- `/?selftest=1`
- `/preview.html?selftest=1`

Run only the browser layer directly with:

```bash
npm run browser-regression
```

The browser pass expects:

- a running Canvax service
- a local Chrome binary, or `CANVAX_BROWSER` pointing to one
- the board route `/?selftest=1` and Preview route `/preview.html?selftest=1` to both report passing self-test payloads

By default, browser timeouts are reported as `skip` so the main regression loop stays usable on hosts where headless Chrome does not stabilize cleanly under Codex. On a stable host, the browser pass should report `ok` for both board and Preview. If you want strict failure semantics, run:

```bash
CANVAX_BROWSER_STRICT=1 npm run browser-regression
```

In-browser self-test:

```bash
http://localhost:3210/?selftest=1
```

The board self-test covers drawing tools, select/move/resize, eraser ink-layer behavior, Workbench dock brush sizing, Workbench action modes, host/design-context handoff fields, flow link creation/deletion, task/image prompt packs, materialize, output activity, rewrite queue state, and large-session export consistency.

Useful service commands:

```bash
./canvax --status
./canvax --stop
./canvax --restart
```

```text
edit code
  -> run npm run check
  -> run npm run regression
  -> refresh board and Preview
  -> smoke test the affected workflow
```

## Development Principles

- Keep the sketch loop fast.
- Avoid adding friction to the board startup flow.
- Preserve the difference between Frame view and Flow view.
- Prefer generic canvas behavior over screen-specific assumptions.
- Keep Codex integration path-based and explicit.
- Keep transport-specific assumptions isolated so local companion mode can later migrate to an App Server client without rewriting the core canvas model.

## Codebase Working Model

```mermaid
flowchart LR
    A[Board interactions] --> B[Export builder]
    B --> C[Local service write]
    C --> D[Preview-state merge]
    D --> E[Preview]
    C --> F[Handoff files]
    F --> G[Codex]
    E --> H[Generated route]
    H --> A

    classDef board fill:#ffede8,stroke:#ff5d3a,color:#211815;
    classDef service fill:#fff7e6,stroke:#f0a202,color:#211815;
    classDef preview fill:#f7edfb,stroke:#b246a8,color:#211625;
    classDef codex fill:#eef3ff,stroke:#2364aa,color:#101828;
    class A,B board;
    class C,D,F service;
    class E,H preview;
    class G codex;
```

## Generation Working Model

Canvax now has two local generation paths:

```text
Materialize
  sketch geometry -> styled HTML mock -> Preview

Generate screen
  sketch intent + labels + notes -> semantic screen renderer -> polished HTML route -> Preview
```

```mermaid
flowchart LR
    A[Frame geometry] --> C{Generation mode}
    B[Labels, notes, voice] --> C
    C -->|Materialize| D[Geometry-faithful mock]
    C -->|Generate screen| E[Semantic screen renderer]
    D --> F[Preview manifest]
    E --> F
    F --> G[Preview route]

    classDef input fill:#ffede8,stroke:#ff5d3a,color:#211815;
    classDef mode fill:#fff7e6,stroke:#f0a202,color:#211815;
    classDef output fill:#eaf7f5,stroke:#0c8d7b,color:#10201d;
    classDef preview fill:#eef3ff,stroke:#2364aa,color:#101828;
    class A,B input;
    class C mode;
    class D,E output;
    class F,G preview;
```

Use `Generate screen` for hero-like website/app screens where Canvax should infer sections, hierarchy, calls to action, and visual tone. Use `Materialize` when you want a quicker mock that stays closer to raw canvas geometry.

## Build With Codex Development Path

`Build with Codex` is intentionally a handoff contract, not a local renderer.

Runtime path:

```text
web/app.js
  buildRealScreenWithCodex()
  buildBuildRealRequest()
  buildBuildRealRequestMarkdown()

scripts/canvax.mjs
  POST /api/save-build-request
  artifacts/canvax/build-requests/<request>/request.json
  artifacts/canvax/build-requests/<request>/request.md
  exports/canvax-build-real-latest.json
  exports/canvax-build-real-latest.md

Codex implementation pass
  edits app/page/component files
  node scripts/write-codex-output.mjs --from-git-status --frame <frame-id> ...
  artifacts/canvax/codex-output.json
```

```mermaid
sequenceDiagram
    participant Board as Canvax board
    participant Service as Local service
    participant Codex as Codex
    participant Preview as Preview/Workbench

    Board->>Service: save live export/checkpoint
    Board->>Service: save build-real request
    Service-->>Board: latest request paths
    Codex->>Service: reads exported request files
    Codex->>Codex: edits real workspace files
    Codex->>Service: write-codex-output manifest
    Preview->>Service: poll /api/preview-state
    Service-->>Preview: frame-bound generated target
```

Regression coverage:

- `scripts/regression-check.mjs` validates the latest build request schema when present.
- Board self-test creates a synthetic build request and verifies the no-API frame-to-code contract.

## Variant Branch Implementation

`Create variants` lives in `web/app.js` and is intentionally local:

```text
createVariantFramesFromCurrent()
  -> clone active frame sketch elements with fresh ids
  -> add a visible variant label
  -> attach frame.variant lineage metadata
  -> insert three frames after the source frame
  -> connect all variants from the source in Flow view
  -> sync the live export/checkpoint
```

The current recipes are:

- `Structure`
- `Visual`
- `Adaptive`

The important behavior is that each variant remains a normal editable frame. Do not turn variants into read-only images or one-off prompt text.

Self-test coverage verifies:

- three variant frames are created
- each has lineage pointing to the source frame
- each has a visible label element
- each is connected as a branch in Flow view

## Where To Change What

### Add or change a drawing tool

Edit:

- `web/app.js`

Likely areas:

- tool definitions
- pointer event handling
- render logic
- selection behavior

### Change layout or visual design

Edit:

- `web/index.html`
- `web/styles.css`

### Change export structure or save behavior

Edit:

- `web/app.js`
- `scripts/canvax.mjs`

Be careful to keep backward compatibility where possible because older live export files may still exist.

When you add new fields to live exports or checkpoints, keep the explicit handoff `schemaVersion` in sync and update the regression checks.

```text
schema-sensitive files
  - web/app.js
  - scripts/canvax.mjs
  - scripts/regression-check.mjs
  - docs/USAGE.md
  - docs/ARCHITECTURE.md
```

### Change how Codex should interpret the canvas

Edit:

- `codex-skill/canvax/SKILL.md`
- `README.md`
- `docs/USAGE.md`

## Manual Smoke Test Checklist

After interaction changes, check these manually:

- board opens at the expected local URL
- board opens cleanly inside Codex Browser Use / Atlas
- tools still switch correctly
- brush size updates correctly
- labels can be placed and edited
- selection, grouping, and deletion still work
- captures can be created and removed
- Flow view can create and remove links
- live export still writes to `exports/`
- materialized previews silently refresh after freeze when a frame already has a generated target
- generated-screen previews produce semantic, polished routes for hero-like frames instead of only absolute-positioned sketch geometry
- brand assets still load from `web/assets/canvax-logo.svg` in both the board and Preview
- Codex output manifest can be refreshed from git status with `node scripts/write-codex-output.mjs --from-git-status`
- board and Preview show live workspace-follow status while git changes are present
- board and Preview show the current transport as local companion with an App Server future path
- Workbench action mode changes are visible in the UI and included in task/image prompt packs
- root `DESIGN.md` is detected through `/api/status` and included in handoff packs when present
- `Create DESIGN.md` writes a starter file only when no existing design contract is present
- host capability chips stay honest about no direct native mic or image-generation bridge in local companion mode
- board and Preview record live output activity when the connected output context changes
- board and Preview frame cards show sensible output-status badges for stale/synced/materialized/global-target states
- board and Preview rewrite queues show the right frames when output is stale, missing, or only globally bound
- same-URL connected previews reload when implementation-relevant changes land
- output-context digest changes create `Output update` checkpoints without forcing a fresh export write
- Preview shows refinement summaries and changed-region overlays after rematerialize
- `?selftest=1` now covers both the small interaction path and a synthetic large-session fixture
- Preview and any generated app target can be inspected inside Codex Browser Use / Atlas

## Current Test Layers

```text
1. node --check          -> syntax
2. regression-check      -> manifests, exports, docs, live preview-state
3. browser-regression    -> board and Preview self-test routes
4. manual smoke test     -> real interaction loop
```

```mermaid
flowchart TD
    A[Edit code] --> B[npm run check]
    B --> C[npm run regression]
    C --> D[Manual smoke test]
    D --> E[Commit]
```

## Current Known Architectural Constraint

`web/app.js` currently carries most of the state and interaction logic in one file. That is acceptable for this stage of the project, but contributors should expect future refactoring into smaller modules as the collaboration loop grows.

## Planned Next Layers

The current roadmap is tracked in:

- `canvax-live-collaboration-plan.md`

The main next layers are:

- richer live collaboration state
- voice attached to canvas checkpoints
- preview/artifact feedback loop
- Codex Browser Use / Atlas first validation for board, Preview, and generated routes
- better thread-to-canvas coordination with Codex

```text
current maintainer focus
  -> keep long sessions stable
  -> tighten preview/live rewrite loop
  -> preserve migration path to richer Codex client
```

## Attribution

This project is documented here as having been created collaboratively with OpenAI Codex. Keep that wording accurate in future docs unless the project owner wants a different attribution line.
