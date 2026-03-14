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

- Run `./canvax --open` when the user invokes `/canvax` and wants the board opened in the default macOS browser.
- Run `./canvax` when the board only needs to stay running in the background.
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
- `exports/canvax-preview-manifest.json`
- `artifacts/canvax/codex-output.json`
- `exports/canvax-storyboard-latest.json`
- `exports/canvax-storyboard-latest.md`

The live JSON export is the primary source because it includes frame metadata and the saved image paths.

When Codex has already produced an implementation target or changed files, also check:

- `artifacts/canvax/codex-output.json`
- `exports/canvax-preview-manifest.json`

Use the Codex output manifest as the canonical place to publish implementation results back to Canvax. The preview window and board inspector will merge it automatically with any manual preview attachment.

If the user wants a quick styled local surface before any real app preview exists, tell them to use `Materialize` in the Canvax board. That writes a generated HTML preview under `artifacts/preview/materialized/...` and updates the manual preview manifest automatically.

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

Preferred command:

```bash
node scripts/write-codex-output.mjs --preview-path artifacts/preview/home.html --change web/app.js::Updated layout --artifact docs/spec.md::Generated handoff spec
```

If you have a running local preview instead of a workspace HTML file:

```bash
node scripts/write-codex-output.mjs --url http://localhost:3000 --change src/app.tsx::Implemented the sketch
```

If a changed file or artifact is specific to one or more Canvax frames, append the frame ids in a third `::` segment so the preview can highlight the current-frame context:

```bash
node scripts/write-codex-output.mjs --artifact artifacts/preview/home.html::Generated home preview::frame-home --change src/app.tsx::Implemented the home frame::frame-home
```

That keeps the current chat, preview window, and board inspector aligned without asking the user to attach output manually.
