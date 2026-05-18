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
- Treat Codex Browser Use / Atlas as the first-class viewer. When Browser Use is available, navigate the in-app browser to the board URL after the local service is running.
- Do not run an external browser command by default. The shell launcher cannot directly control Codex's in-app browser; this skill is the Codex-side instruction that makes `/canvax` open the board inside Codex.
- Run `./canvax --open-external` or `./canvax --open` only when the user explicitly wants the board opened in the default macOS browser.
- Run `./canvax --chrome` only when the user explicitly wants Google Chrome.
- Run `./canvax --status` to reuse the existing board URL instead of starting another port.

Treat `./canvax` as an attach command, not a fresh launch every time:

- It keeps one Canvax service alive at a time.
- If a service already exists, reuse it.
- If a different port is requested while one is already running, do not create a second server. Reuse the current one unless the user explicitly wants `--restart`.

After `/canvax` is invoked in a thread, assume that thread is attached to the live canvas and use the latest Canvax export automatically until the user switches context.

If the user says "open Canvax", "use /canvax", or "make Canvax available here", the expected behavior is:

1. start or reuse the service with `./canvax`
2. open `http://localhost:3210` in Codex Browser Use / Atlas
3. keep reading `exports/canvax-checkpoint-latest.json` and `exports/canvax-live-latest.json` for that thread

If the user says "open in Chrome", "external browser", or "outside Codex", use the explicit external flags instead.

Canvax now has `Workbench` as the simple path:

- the user chooses desktop, mobile, tablet, poster, slide, book spread, storyboard, comic page, square, or free canvas without opening Advanced mode
- the user chooses the current action: build UI, refine UI, write spec, image prompt, or variations
- the user creates a new frame or connected section without leaving Workbench
- the user draws rough placement
- the user dictates or pastes a quick spoken note
- the user can run the local `Make real` generation pass
- the user can run `Build code` / `Build with Codex`, which saves a Codex-readable implementation request and now immediately binds a local no-API preview plus implementation starter bundle through the output manifest
- the user can draw correction marks over the connected generated output
- the user can select drawn elements and assign prototype hotspot targets for Preview Play
- the user can hide the context tray and keep working from the floating designer rail
- the user can save an `Image pack` with normalized coordinates and an HTML/CSS placement scaffold for host-side image generation
- `Apply to Codex` freezes the frame, writes a `focus-apply` checkpoint, and runs the local no-API rewrite executor so the attached output can refresh from the latest sketch/voice/correction context

When the user says they used Workbench, prefer the latest checkpoint over older advanced-board context because it represents the specific sketch + voice + output-correction edit they meant Codex to act on.

If the repo root contains `DESIGN.md`, treat it as the reusable design contract for Canvax. It is exposed through the service and included in task/image prompt packs, so use it before inventing visual style from scratch.

If the user wants Canvax to create that design contract, tell them to use `Create DESIGN.md` in Advanced mode. It generates a starter file from board mood, palette, labels, frame notes, and generation direction, and it does not overwrite an existing file.

If the user asks about microphone integration, be precise: the local board can use browser speech recognition or pasted macOS/Codex dictation. It cannot directly read the Codex chat microphone stream unless Canvax becomes a native Codex client surface or gains a first-party transcript bridge.

This repo now includes that practical transcript bridge. When `/canvax` is active and the user speaks design intent into the Codex chat instead of into the Canvax page, queue the transcript into Canvax with:

```bash
./canvax --transcript "spoken user text" --scope frame
```

Use `--scope session` when the spoken instruction applies to the whole board. The board imports queued transcript entries into its voice notes through preview-state polling, and Codex should also read `exports/canvax-transcript-bridge.json` if the board has not imported it yet.

If the user asks how this becomes native to ChatGPT/Codex, use `docs/CHATGPT_APP_BRIDGE.md` as the boundary. The local skill remains the current working path; a future host bridge would expose Canvax through MCP/App tools such as `get_latest_frame`, `create_task_pack`, `create_image_prompt_pack`, `attach_generated_asset`, `publish_codex_output`, and `append_transcript`. Do not claim that localhost Canvax can directly control ChatGPT, invoke ChatGPT Images, or read the Codex microphone without that host bridge.

## Use saved exports

Prefer these files when they exist:

- `exports/canvax-live-latest.json`
- `exports/canvax-live-latest.md`
- `exports/canvax-voice-latest.md`
- `exports/canvax-task-pack-latest.json`
- `exports/canvax-task-pack-latest.md`
- `exports/canvax-rewrite-request-latest.json`
- `exports/canvax-rewrite-request-latest.md`
- `exports/canvax-image-prompt-pack-latest.json`
- `exports/canvax-image-prompt-pack-latest.md`
- `exports/canvax-asset-candidates-latest.json`
- `exports/canvax-asset-candidates-latest.md`
- `exports/canvax-image-generation-brief-latest.json`
- `exports/canvax-image-generation-brief-latest.md`
- `exports/canvax-image-host-task-latest.json`
- `exports/canvax-image-host-task-latest.md`
- `exports/canvax-transcript-bridge.json`
- `exports/canvax-transcript-bridge-latest.md`
- `exports/canvax-checkpoint-latest.json`
- `exports/canvax-preview-manifest.json`
- `artifacts/canvax/codex-output.json`
- `exports/canvax-storyboard-latest.json`
- `exports/canvax-storyboard-latest.md`

The live JSON export is the primary source because it includes frame metadata and the saved image paths.

The task pack and image prompt pack may include `actionMode`, `hostLane`, and `designContext`. Use those fields to decide whether the user is asking for implementation, refinement, specs, image prompting, or variations, and to avoid promising native host features that the current local board does not expose.

If the user says they marked corrections, changed a generated output, or wants Codex to refresh an existing output from the latest sketch/voice, read `exports/canvax-rewrite-request-latest.json` after the live export. In Workbench, `Apply to Codex` already calls the local executor through `/api/execute-rewrite-request`. For a deterministic terminal refresh, run:

```bash
npm run execute-rewrite
```

That writes a refreshed frame-bound preview artifact under `artifacts/preview/codex-rewrite/frames/...` and publishes the standard Codex output manifest. It is local and does not require an API key.

If the user asks for image generation, illustration, poster composition, book spreads, or "where should the image model place things", read `exports/canvax-image-prompt-pack-latest.json` or `.md` after the live export. This pack is no-API by design: it gives Codex/ChatGPT host capabilities the prompt, coordinates, safe zones, and HTML/CSS placement scaffold without requiring Canvax to call a paid API.

When host image generation is available in the current chat/client, use `exports/canvax-image-host-task-latest.json` as the execution checklist. It turns each candidate into a hosted-image task with prompt, placement contract, output slot, return instructions, and acceptance criteria. Use the image prompt pack, asset candidate pack, and image generation brief as supporting context, then attach the resulting file back through Canvax as an editable image element or asset candidate choice. When host image generation is not available, still produce the prompt pack and placement map; do not introduce an `OPENAI_API_KEY` requirement.

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

When Browser Use / Atlas is available, use it as the preferred visual inspection path:

- open the board at `http://localhost:3210`
- open Preview from the board or at the preview route exposed by the service
- inspect any generated local app preview Codex binds through the output manifest
- fix visible layout issues in code, then publish output back with `write-codex-output.mjs`

If the user presses `Build code` in Workbench, Canvax writes `exports/canvax-build-real-latest.*` and calls its local no-API executor so the output manifest has a frame-bound preview plus `implementation/` starter files. Treat that bundle as a bound starter target for visual inspection and Codex porting, but do not mistake it for production implementation unless the user explicitly accepts it.

If the user presses `Apply to Codex` in Workbench, Canvax writes the checkpoint and calls the local no-API rewrite executor so the output manifest can point at `artifacts/preview/codex-rewrite/frames/...`. Treat that as a refreshed bound preview artifact, not as final production code.

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
