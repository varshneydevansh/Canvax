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
7. Codex uses the skill to read the latest export and continue from the sketch.

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

## Export Model

Primary outputs:

- `exports/canvax-live-latest.json`
- `exports/canvax-live-latest.md`

The JSON export currently contains:

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

## Current Design Boundary

Today, Canvax is a local browser companion for Codex.

It is not yet:

- a native embedded canvas inside the Codex composer
- a finished live preview/artifact feedback loop
- a finished multimodal sketch + voice collaboration surface

Those are intentional future layers, not hidden shipped features.

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
