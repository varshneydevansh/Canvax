# Canvax

Canvax is a Mac-first sketch companion for Codex. It gives you a local canvas to draw rough UI, flows, motion ideas, Qt layouts, image directions, or raw visual notes, then keeps a live export in the workspace so Codex can work from the sketch instead of forcing you to translate everything into text first.

This project was created collaboratively with OpenAI Codex.

## What Canvax Is

Canvax has two surfaces:

- `./canvax`: the local command that starts or reuses the browser canvas service.
- `/canvax` or `$canvax`: the Codex skill entry that attaches the current chat to the live Canvax export.

That means Canvax is **a local command plus a Codex skill**. It is not currently a native first-party built-in Codex command.

## What It Does Today

- Opens a browser-based canvas optimized for Mac trackpad, mouse, or stylus use.
- Supports freehand sketching, shapes, labels, selection, grouping, captures, and flow links between frames.
- Autosaves the latest handoff under `exports/`.
- Generates a live Markdown prompt alongside the structured JSON export.
- Captures board-scoped or frame-scoped voice notes, using browser speech recognition when available and manual pasted dictation when it is not.
- Supports a preview manifest that can bind a live implementation target, changed files, and generated artifacts to the current sketch workflow.
- Surfaces Codex output context directly in the Canvax inspector, including connected preview targets, generated artifacts, and changed files.
- Lets the board auto-publish current git workspace changes back into the Codex output manifest with `Publish changes`.
- Auto-publishes the current workspace change list whenever the board writes a fresh live export, so autosnap/freeze keeps the Codex output manifest closer to current state.
- Mirrors current git workspace changes into board and Preview polling even before a manual publish, so the changed-file list can keep following Codex edits while you keep sketching.
- Adds a live output activity feed in the board and Preview, so output-context changes are visible while you keep sketching.
- Adds frame-level output status badges in the board and Preview, so stale, synced, materialized, and global-target states stay visible across longer flows.
- Adds a rewrite queue in the board and Preview, so frames that need first output, a frame binding, a target, or a refresh are surfaced explicitly instead of being inferred from scattered badges.
- Reloads same-URL Preview targets with a digest-based revision key when connected implementation context changes, which keeps local app previews closer to live Codex edits.
- Adds preview compare modes and frame-aware highlighting when Codex output is tagged to specific frames.
- Lets you save preview compare snapshots into the workspace for later review.
- Materializes the active frame into a styled local HTML preview artifact without changing the sketch board.
- Reuses a stable per-frame materialized preview target so repeated updates refresh the same output surface instead of spawning unrelated preview routes.
- Refreshes an existing materialized frame automatically after freeze/autosnap so the generated preview stays closer to the sketch without reopening Preview.
- Tracks Materialize refinements with changed-region metadata, so Preview can call out what shifted between sketch revisions instead of only showing a stale/synced badge.
- Reuses cached frame thumbnails/snapshots when rebuilding live preview/export payloads, which reduces repeated long-session render work.
- Writes that rewrite queue into the live handoff payloads, so Codex can read which frames currently need attention next.
- Installs a Codex skill so the canvas can be invoked from Codex as `/canvax` or `$canvax`.
- Requires no extra OpenAI API key for the core sketch-to-Codex workflow.

## Why It Ships This Way

The official Codex docs currently give us reliable support for skills, slash-command surfacing, scripting, and App Server based custom clients. They do not currently document a native embedded arbitrary drawing surface inside the first-party Codex app itself. Because of that, Canvax ships today as a local companion app plus a skill wrapper instead of pretending there is a hidden internal canvas API.

Relevant docs:

- [Codex app commands](https://developers.openai.com/codex/app/commands)
- [Codex CLI features](https://developers.openai.com/codex/cli/features)
- [Codex config reference](https://developers.openai.com/codex/config-reference)
- [Codex App Server](https://developers.openai.com/codex/app-server/)

## Quick Start

### 1. Start the board

```bash
./canvax --open
```

That ensures one Canvax service is running on `http://localhost:3210` by default and opens it in your browser.

### 2. Install the Codex skill

```bash
node scripts/install-canvax-skill.mjs
```

This creates a symlink at `~/.codex/skills/canvax`.

Restart Codex if it is already open.

### 3. Use it from Codex

In Codex:

- invoke `/canvax` from the slash list if it appears there
- or invoke `$canvax`

Then sketch in the browser board and continue the same chat with prompts like:

- `use my current Canvax`
- `read the latest Canvax`
- `implement this sketch`
- `turn this into a spec`

## Install Guides

- [Install guide](docs/INSTALL.md)
- [Usage guide](docs/USAGE.md)
- [Architecture guide](docs/ARCHITECTURE.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Upstream proposal](docs/upstream-proposal.md)
- [Demo script](docs/canvax-demo-script.md)
- [Execution status](docs/EXECUTION_STATUS.md)
- [Live collaboration plan](canvax-live-collaboration-plan.md)

## Feature Matrix

| Area | Canvax today | Native Codex future |
| --- | --- | --- |
| Sketch input | Browser board started with `./canvax` | Embedded canvas panel inside a richer Codex client |
| Live handoff | File exports under `exports/` | Thread-bound handoff items and live multimodal state |
| Output binding | Preview manifest plus Codex-output manifest | First-party artifact, preview, and event wiring |
| Live preview | Separate Preview tab/window | Same-thread split canvas + output surface |
| Transport | Local companion via files, manifests, and browser session mirroring | App Server or equivalent JSON-RPC transport |

The current repo is intentionally optimized for the first column while keeping the second column reachable instead of blocked by hardcoded assumptions.

## Service Commands

```bash
./canvax
./canvax --open
./canvax --status
./canvax --stop
./canvax --restart --open
```

Behavior:

- `./canvax` starts or reuses the existing service.
- `./canvax --open` starts or reuses the service and opens the board.
- `./canvax --status` prints the current board URL and live export paths.
- `./canvax --stop` stops the running service.
- `./canvax --restart --open` restarts the service cleanly and opens the board again.

Canvax is intentionally single-service. If one board is already running, it is reused instead of spawning another port by default.

## Verification

For local validation:

```bash
npm run check
npm run regression
```

`npm run regression` now adds a headless browser pass against both the board and Preview self-test routes when a running Canvax service and local Chrome binary are available.

If you want that browser pass to fail hard instead of skipping on host-level Chrome timeouts, run:

```bash
CANVAX_BROWSER_STRICT=1 npm run browser-regression
```

## Live Export Files

Canvax writes live handoff files under `exports/`:

- `exports/canvax-live-latest.json`
- `exports/canvax-live-latest.md`
- `exports/canvax-voice-latest.md`
- `exports/canvax-checkpoint-latest.json`
- `exports/canvax-session-events.jsonl`
- `exports/canvax-preview-manifest.json`
- `artifacts/canvax/codex-output.json`
- `artifacts/canvax/checkpoints/`
- `artifacts/preview/materialized/`

Legacy compatibility files may also exist:

- `exports/canvax-storyboard-latest.json`
- `exports/canvax-storyboard-latest.md`

The JSON export is the main handoff file for Codex because it contains structured frame metadata plus image paths.

The preview manifest is the bridge for generated output. It can describe:

- the current implementation preview target
- generated artifacts like specs or exported HTML
- changed workspace files Codex wants to surface in the preview window

If the manifest contains a generated HTML artifact, Canvax can now use that as the implementation preview target automatically even when no explicit preview URL was attached.

Materialize mode uses that same preview path. When you click `Materialize` in the board, Canvax writes a styled HTML artifact plus a serialized frame payload under `artifacts/preview/materialized/...` and updates `exports/canvax-preview-manifest.json` so Preview can open it immediately.

When you rematerialize a frame, Canvax now also saves a refinement delta into the materialize metadata and manifest target. Preview uses that to render changed-region overlays and a refinement summary for the current frame.

The canonical Codex-written output file is:

- `artifacts/canvax/codex-output.json`

That file is merged automatically with the manual preview manifest so Canvax can show:

- generated preview targets
- changed files
- artifacts like specs, notes, or exported HTML

For Codex-side publishing, the preferred helper is now:

```bash
node scripts/write-codex-output.mjs --from-git-status
```

Add `--preview-path` or `--url` when Codex also has a concrete implementation preview to bind.

Checkpoint mode now adds:

- `exports/canvax-checkpoint-latest.json` as the latest merged sketch + voice + output handoff
- `exports/canvax-session-events.jsonl` as the append-only checkpoint event log
- `artifacts/canvax/checkpoints/` as durable saved checkpoint records

## Current Workflow

1. Open Canvax with `./canvax --open`.
2. Install the skill once with `node scripts/install-canvax-skill.mjs`.
3. Invoke `/canvax` or `$canvax` in Codex.
4. Sketch frames, label regions, and connect screens in Flow view.
5. Capture spoken intent with `Voice notes` if you want Canvax to preserve what you are saying while drawing.
6. Pause for autosnap or press `Freeze frame`.
7. Use `Push checkpoint` if you want to preserve the current sketch + voice + output context as a durable handoff moment.
8. Press `Materialize` if you want a styled local preview of the current frame before writing app code.
9. Keep sketching. Autosnap and freeze now refresh the live export, auto-publish the current workspace change list, and silently rematerialize frames that already have a generated target.
10. Use `Publish changes` only when you want to force a manual refresh of the current workspace change list from the board.
11. Even without that manual publish step, board and Preview polling now mirror current git workspace changes live while you keep sketching.
12. When Codex changes files from chat, let it run `node scripts/write-codex-output.mjs --from-git-status` so the board and preview also keep the richer persisted manifest metadata.
13. Ask Codex to use the current Canvax.
14. Codex reads the latest live export or checkpoint and works from that visual handoff.

## Current Limits

- The board lives in a browser tab, not inside the native Codex composer.
- A first deterministic Materialize loop exists, but the richer live AI rewrite loop is still not finished.
- The core workflow does not depend on a separate paid OpenAI API key.
- Board-side voice notes now exist, but the richer voice+sketch checkpoint/event-log loop is still not finished.
- Strict headless browser regression still skips on this host unless you force `CANVAX_BROWSER_STRICT=1`.

## Repo Layout

- `web/`: browser UI for the drawing board.
- `scripts/canvax.mjs`: local service launcher and export server.
- `scripts/install-canvax-skill.mjs`: skill installer.
- `codex-skill/canvax/`: Codex skill wrapper.
- `exports/`: live and archived handoff files.

## Publishing Intention

This repo is meant to be usable as-is by other Codex users, but it is also a reasonable prototype for future upstream work:

- a first-party canvas surface in Codex
- a richer App Server based Codex client with split chat + canvas
- or a more tightly integrated sketch-to-implementation workflow
