# Use Canvax With Codex

## Core Mental Model

Canvax is a visual handoff surface for Codex.

The intended loop is:

1. open the board
2. draw, label, connect screens, and capture spoken notes when needed
3. let autosnap or `Freeze frame` save the latest state
4. tell Codex to use the current Canvax
5. let Codex work from the saved visual export instead of re-explaining the idea in text

## What To Draw

Canvax is intentionally generic. Use it for:

- websites
- web apps
- mobile screens
- Qt layouts
- desktop UI ideas
- image prompt composition
- product flow maps
- rough interaction sequences

It is not limited to a hero section or landing page flow.

## Frame View

Use Frame view when you want to sketch a single screen, state, or freeform visual sheet.

Use:

- drawing tools for rough structure
- labels for meaning, states, motion, and rules
- notes in the right inspector for interpretation
- captures for saved checkpoints of the current frame

## Flow View

Use Flow view when you want to connect frames into a lightweight prototype map.

Use it to:

- arrange screen order
- connect transitions
- define entry points
- describe branching or sequence

Codex should read both the frame sketches and the flow graph.

## Voice Notes

Use `Voice notes` in the inspector when you want Canvax to preserve what you are saying while sketching.

It supports two capture modes:

- `Current frame`: spoken notes attach to the active frame
- `Whole board`: spoken notes apply across the whole session

If browser speech recognition is available, `Start dictation` captures transcript segments live while you keep drawing. If it is not available in the current browser context, use `Manual voice note` and paste text from macOS dictation or your own notes.

Voice notes are included in:

- the live JSON export
- the live prompt markdown
- `exports/canvax-voice-latest.md`

## How Codex Should Use It

When `/canvax` or `$canvax` is active, Codex should default to:

- `exports/canvax-live-latest.json`
- `exports/canvax-live-latest.md`

The JSON file is the primary source because it contains:

- board metadata
- frame notes
- capture counts
- snapshot paths
- flow connections

## Useful Prompts In Codex

- `use my current Canvax`
- `read the latest Canvax and implement it`
- `turn this Canvax into a UI spec`
- `use the Canvax flow graph to plan the app`
- `extract image prompts from this Canvax`
- `build the first screen from the latest Canvax`

## What Gets Saved

The live export is written under `exports/`.

Important files:

- `exports/canvax-live-latest.json`
- `exports/canvax-live-latest.md`
- `exports/canvax-voice-latest.md`
- `exports/canvax-preview-manifest.json`
- `artifacts/canvax/codex-output.json`

Older compatibility files may also be written:

- `exports/canvax-storyboard-latest.json`
- `exports/canvax-storyboard-latest.md`

## Current Product Boundary

Today, Canvax is:

- a browser sketch board
- a local command
- a Codex skill wrapper

Today, Canvax is not yet:

- a native embedded drawing surface inside the Codex composer
- a full live preview-and-artifact panel for Codex outputs
- a finished voice-plus-sketch checkpoint/event-log surface

Those deeper integrations are part of the roadmap in `canvax-live-collaboration-plan.md`.

## Preview Manifest Workflow

The preview window can now read a richer preview manifest, not just a raw URL.

Useful cases:

- bind a local app preview to the current sketch flow
- surface changed files from a Codex implementation pass
- expose generated artifacts like a spec, HTML prototype, or notes file

The main Canvax inspector also reads that manifest now, so the board itself can show:

- the connected implementation target
- generated artifacts
- changed files from a Codex pass

The preview window now also supports compare modes:

- `Split` to see sketch and output together
- `Sketch` to focus only the input canvas
- `Output` to focus only the generated implementation

If artifacts or changed files include frame bindings, the preview highlights the items relevant to the currently selected frame and shows that frame context under the compare surface.

You can also save a compare checkpoint directly from the preview window with `Save snapshot`. Canvax writes those records under:

- `artifacts/preview/preview-snapshots.json`
- `artifacts/preview/snapshots/...`

Each saved snapshot records the current frame, compare mode, linked target, artifact/change context, and the current sketch image when available.

If the manifest includes an HTML artifact, Canvax can auto-use that as the preview target even without an explicit `--url` or `--preview-path`.

## Voice Handoff Files

Canvax now writes a dedicated voice export:

- `exports/canvax-voice-latest.md`

That file is useful when you or Codex want only the spoken context without re-reading the full JSON or prompt. The live JSON export also includes a `voice` block with:

- total segment counts
- board-scoped vs frame-scoped counts
- frame-grouped transcript segments

## Materialize

Use `Materialize` in the main board when you want Canvax itself to turn the active frame into a styled local preview before any real app code exists.

That flow:

1. reads the active frame geometry, labels, and notes
2. writes a local HTML artifact under `artifacts/preview/materialized/...`
3. writes the serialized frame payload next to it for debugging and iteration
4. updates `exports/canvax-preview-manifest.json`
5. opens or reuses the Preview window so the generated surface can be compared against the sketch

This is a deterministic local transformation, not a paid API call.

When you materialize the same frame again, Canvax now reuses the same per-frame artifact path and only updates the versioned preview URL. That means Preview can stay attached to one frame-specific target while still refreshing reliably after each rematerialize.

The generated materialized preview also includes a few lightweight interaction affordances:

- clickable generated components
- optional sketch overlay toggle
- optional free-note toggle

If Preview says the output is stale, it means the current sketch `updatedAt` is newer than the materialized target metadata. Rematerialize that frame to bring the generated surface back in sync.

Materialize is useful when you want a quick “make this sketch feel real” pass while keeping the original sketch board unchanged.

You can write that manifest manually with:

```bash
node scripts/write-preview-manifest.mjs --url http://localhost:3000 --change web/app.js::Updated layout --artifact docs/spec.md::Generated handoff spec
```

Or use a workspace HTML target:

```bash
node scripts/write-preview-manifest.mjs --preview-path artifacts/preview/home.html --label "Materialized home preview"
```

## Codex Output Manifest

For implementation results, prefer the canonical Codex output manifest:

```bash
node scripts/write-codex-output.mjs --preview-path artifacts/preview/home.html --change web/app.js::Updated layout --artifact docs/spec.md::Generated spec
```

To bind a file or artifact to a specific frame, add a third `::` segment with one or more frame ids:

```bash
node scripts/write-codex-output.mjs --change web/app.js::Updated home layout::frame-home --artifact artifacts/preview/home.html::Generated home preview::frame-home
```

That writes `artifacts/canvax/codex-output.json`. Canvax merges it automatically with any manual preview manifest, so both the board inspector and preview window can pick up:

- generated preview targets
- changed files
- generated artifacts

If the Codex output manifest contains an HTML artifact, Canvax can auto-use that artifact as the preview target even without an explicit preview URL.
