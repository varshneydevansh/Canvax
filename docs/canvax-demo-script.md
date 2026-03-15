# Canvax Demo Script

This is a short operator script for showing Canvax to another developer, maintainer, or potential upstream reviewer.

This project was created collaboratively with OpenAI Codex.

## Setup

Run:

```bash
./canvax --open
```

Optional validation:

```bash
npm run check
npm run regression
```

## Demo Goal

Show that Canvax lets a user sketch first, keep thinking out loud, and let Codex work from that visual handoff without forcing the user to translate the whole idea into text up front.

## Demo Flow

1. Show the board.
   Explain that this is a generic scratchpad, not a website-only wireframe tool.

2. Draw two or three rough frames.
   Use labels, notes, and one or two flow links.

3. Add a voice note.
   Explain that the spoken context is preserved in the handoff files too.

4. Freeze or autosnap.
   Point out that the live handoff is written under `exports/`.

5. Open Preview.
   Show the sketch side and the output side in the separate preview window.

6. Materialize one frame.
   Explain that this is a deterministic local “make it feel real” pass, not a paid API feature.

7. Publish or inspect output context.
   Show artifacts, changed files, activity, output badges, and the rewrite queue.

8. Push a checkpoint.
   Explain that checkpoints preserve a specific collaboration moment for Codex.

## Talking Points

- `./canvax` is the local command.
- `/canvax` and `$canvax` are the skill-backed Codex entry points.
- Current transport is local companion mode: files, manifests, and browser mirroring.
- Future richer-client mode is explicitly planned as an App Server path, not hidden magic.
- The Preview window is separate on purpose so the sketch surface stays uncluttered.

## Good Evidence To Show

- `exports/canvax-live-latest.json`
- `exports/canvax-checkpoint-latest.json`
- `exports/canvax-preview-manifest.json`
- `artifacts/canvax/codex-output.json`
- frame-level output badges
- rewrite queue items
- changed-region overlays after rematerialize

## Demo Close

End by summarizing the core point:

Canvax already works as a shareable local Codex companion today, and it is structured so a richer native Codex client could replace the transport later without throwing away the collaboration model.
