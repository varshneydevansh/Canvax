# Canvax Architecture

## Purpose

Canvax is a local sketch-to-Codex handoff system.

The system has three parts:

- a browser board for drawing and annotating
- a local Node service that persists exports and serves the app
- a Codex skill that tells Codex how to attach to the live canvas

## High-Level Structure

### Browser UI

Files:

- `web/index.html`
- `web/styles.css`
- `web/app.js`

Responsibilities:

- render the drawing board
- manage frame state, flow state, and tool state
- autosnap and manual freeze captures
- write the latest live export to the local service

### Local Service

Files:

- `canvax`
- `scripts/canvax.mjs`

Responsibilities:

- start or reuse a single Canvax service
- serve the browser app on `http://localhost:3210` by default
- persist live exports under `exports/`
- install the local Codex skill through the service endpoint

### Codex Skill

Files:

- `codex-skill/canvax/SKILL.md`

Responsibilities:

- define how Codex should interpret the live canvas
- attach a chat thread to the latest export
- default Codex to the current Canvax handoff without asking the user to repeat file paths

## Runtime Flow

1. `./canvax --open` starts or reuses the local service.
2. The browser board loads from that local service.
3. The user draws, annotates, or links frames.
4. Canvax autosnaps after idle or stores a manual freeze.
5. `web/app.js` sends the latest export package to `/api/save-export`.
6. `scripts/canvax.mjs` writes the JSON and Markdown exports under `exports/`.
7. The board also refreshes the Codex output manifest with current workspace changes during live export sync.
8. Codex uses the skill to read the latest export and continue from the sketch.
9. Preview-state polling also overlays a transient live workspace-follow manifest from current git status so board and Preview can keep tracking file changes between explicit publish steps.
10. When Codex changes files itself, it should publish those changes back into Canvax with `node scripts/write-codex-output.mjs --from-git-status` when it wants a durable manifest update with richer metadata.
11. The service now also computes a stable output digest from targets, artifacts, changes, and workspace-follow metadata so clients can detect meaningful output-context changes without treating every poll as a rewrite.
12. Recent checkpoint/session events are also fed back through preview-state so clients can rebuild durable output activity after a refresh instead of relying only on in-memory polling state.
13. When a frame is materialized again, the service computes a refinement delta, writes it into the materialize metadata, and exposes it through the preview manifest so Preview can show changed-region overlays.

## Transport Layers

Canvax now treats transport as an explicit contract instead of an accidental side effect of local files.

### 1. Live session mirror transport

Current mechanism:

- browser `localStorage`
- browser `BroadcastChannel`
- live Preview polling

Purpose:

- keep the board and Preview aligned immediately inside one local browser session
- avoid waiting for file writes just to update the Preview surface

### 2. Durable handoff transport

Current mechanism:

- `exports/canvax-live-latest.json`
- `exports/canvax-live-latest.md`
- `exports/canvax-voice-latest.md`
- `exports/canvax-checkpoint-latest.json`

Purpose:

- give Codex a stable, path-based handoff surface
- preserve collaboration moments outside volatile browser memory

### 3. Output binding transport

Current mechanism:

- `exports/canvax-preview-manifest.json`
- `artifacts/canvax/codex-output.json`
- transient git-status workspace follow merged into `/api/preview-state`

Purpose:

- attach implementation previews, generated artifacts, changed files, and rewrite state back to the sketch workflow

### 4. Future richer-client transport

Planned mechanism:

- App Server style JSON-RPC transport
- thread-bound event/state transport instead of file-path handoff

Purpose:

- replace the local companion split with a true same-thread Codex client later

## Current Transport Contract

The runtime now emits a `transport` object through:

- `/api/status`
- `/api/preview-state`
- live preview payloads
- saved exports
- checkpoints
- materialize payloads

That contract declares:

- current mode: `local-companion`
- durable handoff: file export paths
- output binding: manifest-based transport
- live mirror: browser storage/channel transport
- future mode: `app-server`

This is the main guardrail against accidentally hardcoding the current local-companion implementation as if it were the only possible runtime.

## Current File Map

### Entry points

- `canvax`: shell launcher for the Node service
- `scripts/canvax.mjs`: main service runtime

### Browser app

- `web/index.html`: layout and app shell
- `web/styles.css`: board UI styling
- `web/app.js`: state, rendering, interactions, export generation

### Codex integration

- `codex-skill/canvax/SKILL.md`: skill instructions
- `scripts/install-canvax-skill.mjs`: symlink installer for `~/.codex/skills/canvax`

### Docs

- `README.md`: public project overview
- `docs/INSTALL.md`: installation and setup
- `docs/USAGE.md`: operator-facing usage guide
- `canvax-live-collaboration-plan.md`: roadmap and future collaboration design

## State Model

The browser app keeps the working session in local browser storage and in memory.

Core state areas include:

- board metadata
- frames
- per-frame elements
- per-frame captures
- flow connections
- active frame and view mode
- tool selection, color, size, grid, autosnap

`web/app.js` is currently the main state owner.

Browser storage uses `version` for persistence migrations. Live exports, checkpoints, voice payloads, and live preview payloads now also carry explicit `schemaVersion` metadata so saved handoff files can evolve independently from the browser-storage format.

## Export Model

Primary outputs:

- `exports/canvax-live-latest.json`
- `exports/canvax-live-latest.md`

The JSON export currently contains:

- schema metadata
- board metadata
- frame metadata
- capture counts
- saved snapshot paths
- flow connections
- generated prompt text

The Markdown export contains the readable handoff prompt for Codex.

## Key Interaction Areas In Code

### Drawing and selection

Look in `web/app.js` for:

- pointer handlers
- tool definitions
- selection and grouping helpers
- label creation and attachment logic

### Flow view

Look in `web/app.js` for:

- flow board rendering
- connection creation
- entry frame handling
- auto layout logic

### Export and persistence

Look in:

- `web/app.js` for export package creation
- `scripts/canvax.mjs` for file writing and service endpoints
- `scripts/write-codex-output.mjs` for Codex-side output publishing from git status or explicit artifacts

## Current Design Boundary

Today, Canvax is a local browser companion for Codex.

It is not yet:

- a native embedded canvas inside the Codex composer
- a finished live preview/artifact feedback loop
- a finished multimodal sketch + voice collaboration surface

Those are intentional future layers, not hidden shipped features.

## Migration Path To A Richer Codex Client

The clean migration path is:

1. keep the board semantics, export schema, manifest schema, and rewrite queue logic
2. replace file-path transport with thread/artifact/event transport
3. replace browser-local Preview wiring with a richer Codex client surface
4. preserve `Materialize`, checkpoints, and output binding semantics across the transport swap

That is why the transport object exists now: the repo can describe what is transport-specific versus what is core Canvax behavior.

## Safe Extension Points

If you want to extend the project, the clean places to start are:

- new tools and interaction behavior in `web/app.js`
- layout and visual treatment in `web/styles.css`
- new endpoints or export files in `scripts/canvax.mjs`
- new Codex workflow guidance in `codex-skill/canvax/SKILL.md`

## Change Risk Areas

The highest-risk files are:

- `web/app.js` because it currently owns most state and interaction logic
- `scripts/canvax.mjs` because it controls service lifecycle and export persistence

Changes in these files should be validated carefully with `npm run check` and a manual browser smoke test.
