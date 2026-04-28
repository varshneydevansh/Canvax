---
name: canvax
description: Use when the user wants to open the Canvax sketch board, attach the current thread to the live canvas, turn the latest live Canvax export into a spec or prompt, or build code from sketch-driven visual input. This skill launches or reuses the local Canvax app (`./canvax`), reads the latest saved exports from `exports/`, and converts sketch frames into implementation work.
---

# Canvax

Use this skill when the user wants to collaborate visually instead of describing the design only with text.

This skill is the Codex-side wrapper for the local Canvax board. In practice:

- `./canvax` is the local command that runs the board
- `/canvax` is the slash entry Codex may show for this skill
- `$canvax` is the direct skill invocation form

## Open the board

From the repo root:

- Run `./canvax` when the user invokes `/canvax` and the board should be available at `http://localhost:3210`.
- Prefer opening `http://localhost:3210` in Codex Browser Use when that plugin is available, so the board, Preview, generated app, and chat stay in one Codex loop.
- Run `./canvax --open` only when the user explicitly wants the board opened in the default macOS browser.
- Run `./canvax --status` to reuse the existing board URL instead of starting another port.

Treat `./canvax` as an attach command, not a fresh launch every time:

- It keeps one Canvax service alive at a time.
- If a service already exists, reuse it.
- If a different port is requested while one is already running, do not create a second server. Reuse the current one unless the user explicitly wants `--restart`.

After `/canvax` is invoked in a thread, assume that thread is attached to the live canvas and use the latest Canvax export automatically until the user switches context.

## Use saved exports

Prefer these files when they exist:

- `exports/canvax-live-latest.json`
- `exports/canvax-live-latest.md`
- `exports/canvax-voice-latest.md`
- `exports/canvax-checkpoint-latest.json`
- `exports/canvax-preview-manifest.json`
- `artifacts/canvax/codex-output.json`
- `exports/canvax-storyboard-latest.json`
- `exports/canvax-storyboard-latest.md`

The live JSON export is the primary source because it includes frame metadata and the saved image paths.

If `exports/canvax-checkpoint-latest.json` exists and the user seems to be referring to a specific recent moment in the board workflow, prefer that checkpoint because it merges sketch, voice, and output context for that handoff moment.

When Codex has already produced an implementation target or changed files, also check:

- `artifacts/canvax/codex-output.json`
- `exports/canvax-preview-manifest.json`

Use the Codex output manifest as the canonical place to publish implementation results back to Canvax. The preview window and board inspector will merge it automatically with any manual preview attachment.

Even when no fresh manifest write has happened yet, the board and Preview will still mirror current git workspace changes live through preview-state polling. Use the manifest writer when you want that output context to be durable and richly annotated, not only transient.

If the user wants a quick styled local surface before any real app preview exists, tell them to use `Materialize` in the Canvax board. That writes a generated HTML preview under `artifacts/preview/materialized/...` and updates the manual preview manifest automatically.

If the user wants a more polished website/app-screen interpretation, prefer `Generate screen` in the board. That uses Canvax's local semantic renderer for hero-like frames: it infers navigation, headline, body copy, calls to action, proof chips, visual preview cards, and refinement notes from geometry, labels, frame notes, and voice context. It is still deterministic local generation, not a paid API call.

For a quick smoke demo of that path from the repo root:

```bash
npm run demo:hero
```

When Browser Use is available, use it as the preferred visual inspection path:

- open the board at `http://localhost:3210`
- open Preview from the board or at the preview route exposed by the service
- inspect any generated local app preview Codex binds through the output manifest
- fix visible layout issues in code, then publish output back with `write-codex-output.mjs`

Canvax now also writes explicit transport metadata into its live payloads, exports, and checkpoints. Treat that as a contract:

- current mode: `local-companion`
- current binding surfaces: file exports + manifests + browser session mirroring
- future mode: `app-server`

That transport metadata exists so future richer Codex-client work does not have to guess which pieces are Canvax behavior versus current local transport details.

Do not ask the user to paste the file path again once this skill is active. Default to `exports/canvax-live-latest.json`.

If the user asks whether Canvax is a skill or a command, answer precisely:

- it is a local command plus a skill
- the browser board is launched by the command
- the Codex chat attachment behavior comes from the skill

## How to reason from the canvas

- Treat frame order as sequence, variants, or state changes depending on the notes.
- Preserve the sketched hierarchy and flow, but refine clarity, responsiveness, and accessibility where relevant.
- Use the frame notes to infer components, motion, platform adaptation, and asset prompts.
- If the user asks for implementation, work from the latest export instead of asking them to re-explain the layout.
- If the user says "use Canvax", "read my canvas", "continue from the canvas", or similar, read the live export immediately.

## Publish Codex output back to Canvax

After you implement something from the canvas, write the Codex output manifest so the board and preview can show what changed.

Preferred command when Codex has changed files in the workspace:

```bash
node scripts/write-codex-output.mjs --from-git-status
```

Preferred command when Codex also has a preview target to bind:

```bash
node scripts/write-codex-output.mjs --from-git-status --preview-path artifacts/preview/home.html
```

If you have a running local preview instead of a workspace HTML file:

```bash
node scripts/write-codex-output.mjs --from-git-status --url http://localhost:3000
```

If a changed file or artifact is specific to one or more Canvax frames, append the frame ids in a third `::` segment so the preview can highlight the current-frame context:

```bash
node scripts/write-codex-output.mjs --from-git-status --artifact artifacts/preview/home.html::Generated home preview::frame-home --frame frame-home
```

That keeps the current chat, preview window, and board inspector aligned without asking the user to attach output manually.

Use `--dry-run --json` if you want to inspect the manifest that would be written before saving it.
