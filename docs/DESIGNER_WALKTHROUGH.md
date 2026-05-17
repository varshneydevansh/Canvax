# Designer Walkthrough

This is the short path for using Canvax as a designer-first Codex workbench.

Use this when you want to move from a rough sketch to a generated surface, then keep correcting it with drawing, voice, and local artifacts without adding an API key.

## Mental Model

```text
sketch the intent
  + say or paste the design note
  + attach reference/image context if needed
        |
        v
press Make / Build / Apply
        |
        v
generated output appears as a local preview/reference
        |
        v
draw correction marks or edit the frame
        |
        v
Codex reads the latest handoff and refines the result
```

```mermaid
flowchart LR
    D[Draw] --> T[Talk or paste note]
    T --> M[Make / Build / Apply]
    M --> O[Generated output]
    O --> C[Correction marks]
    C --> R[Rewrite handoff]
    R --> O

    classDef input fill:#ffede8,stroke:#ff5d3a,color:#211815;
    classDef action fill:#fff7e6,stroke:#f0a202,color:#211815;
    classDef output fill:#eaf7f5,stroke:#0c8d7b,color:#10201d;
    classDef codex fill:#eef3ff,stroke:#2364aa,color:#101828;

    class D,T,C input;
    class M action;
    class O output;
    class R codex;
```

## Start

Run:

```bash
./canvax
```

Preferred viewing path:

```text
Codex app -> in-app Browser / Atlas -> http://localhost:3210
```

Use an external browser only when you explicitly want it:

```bash
./canvax --open-external
```

## Everyday Workbench Loop

1. Keep `Workbench` selected.
2. Pick `Surface` such as desktop, mobile, free canvas, book spread, storyboard, comic page, poster, or slide.
3. Pick `Action` such as Build UI, Refine UI, Write spec, Image prompt, or Variations.
4. Draw rough placement on the current frame.
5. Use `Talk` or paste a manual voice note.
6. Press `Make` for a local generated surface.
7. Press `Build` when you want a Codex-readable real implementation request and local starter output.
8. Press `Apply` when the generated output should refresh from your latest sketch, voice note, and correction marks.
9. Use `Focus canvas` when the tray feels too busy; use `Show brief` to bring it back.

## Output Correction Loop

```text
generated output exists
        |
        v
switch to Split or Output focus
        |
        v
draw arrows / notes / correction marks over output
        |
        v
Apply to Codex
        |
        v
local rewrite preview updates
```

When `Live rewrite` is enabled, autosnap/freeze can run the local rewrite executor automatically. If another autosnap/freeze happens while a rewrite is already running, Canvax queues the newest handoff and runs it after the current rewrite finishes.

## Image And Book/Illustration Loop

Use this for children-book spreads, posters, comic panels, UI image slots, icons, or reference-art directions.

1. Choose a surface such as `Book spread`, `Storyboard`, `Comic page`, `Poster`, or `Free canvas`.
2. Draw regions for characters, backgrounds, props, panels, or image slots.
3. Add labels or notes describing style, continuity, mood, and safe text areas.
4. Press `Image` / `Image pack`.
5. Use `exports/canvax-image-generation-brief-latest.md` when you want one copy-ready brief for ChatGPT/Codex image-generation hosts.
6. In the `Asset candidates` tray, use `Copy prompt` for one slot when you want to paste only that candidate's prompt and placement contract.
7. Attach the generated file back to that candidate with `Attach image` or `Attach path`.
8. Use `Accept` to mark the chosen image candidate.

The image path stays local-first:

```text
Canvax exports prompt + placement + style lock + image brief
        |
        v
host image tool generates an image when available
        |
        v
user/Codex attaches image back to Canvax
        |
        v
Canvax preserves chosen candidate and placement
```

Canvax itself does not require `OPENAI_API_KEY`.

## Map Mode

Use `Map` when one frame is not enough.

Map is the spatial project memory:

- frame cards
- variant branches
- generated output references
- asset candidate cards
- reference files/images
- notes
- checkpoint history
- output shelf

Generated output cards in Map:

```text
Frame card                 = an editable sketch/design surface
Generated preview card     = a local output/reference produced by Make, Build, or Materialize
Generated file card        = a spec, HTML, prompt, image note, or other output file
Code change card           = a workspace file changed by Codex
Output shelf               = the lane that groups generated previews/files/changes
```

Those output cards are references, not extra frames. Use `Open output` to inspect one, `Edit as frame` when it should become an editable correction branch, `Pin` when it should stay visible, or `Clear outputs` when stale generated references are crowding the map.

Designer actions:

- drag cards and objects
- pan the background
- pinch or Ctrl/Cmd-wheel to zoom
- Shift-drag to lasso objects
- group related context
- lock important references
- use `Tidy map` when the board gets noisy
- use `Fit map` when you lose the visible project area

## Visual Review Path

Run the regression snapshot pass:

```bash
npm run regression
```

Then inspect:

```text
artifacts/canvax/browser-snapshots/latest/index.json
artifacts/canvax/browser-snapshots/latest/board-desktop-1440x1024.png
artifacts/canvax/browser-snapshots/latest/board-laptop-1024x820.png
artifacts/canvax/browser-snapshots/latest/board-tablet-768x900.png
artifacts/canvax/browser-snapshots/latest/board-narrow-430x840.png
artifacts/canvax/browser-snapshots/latest/board-advanced-map-desktop-1440x1024.png
artifacts/canvax/browser-snapshots/latest/board-advanced-map-tablet-768x900.png
artifacts/canvax/browser-snapshots/latest/preview-desktop-1440x1024.png
artifacts/canvax/browser-snapshots/latest/preview-laptop-1024x820.png
artifacts/canvax/browser-snapshots/latest/preview-tablet-768x900.png
artifacts/canvax/browser-snapshots/latest/preview-narrow-430x840.png
```

Use those screenshots to review:

- first-view complexity
- clipped labels
- overlapping controls
- whether `Focus canvas` meaning is clear
- whether Workbench and Advanced feel like the same product
- whether generated output references look like references, not extra sketch frames
- whether the Advanced sticky command deck remains solid while scrolled over frame/map content

## What To Ask Codex

```text
use my current Canvax
read the latest Canvax checkpoint
build this frame into the app
turn this Canvax into a UI spec
use the Image pack for image generation prompts
refine the generated output from my correction marks
```

Codex should read:

```text
exports/canvax-checkpoint-latest.json
exports/canvax-live-latest.json
exports/canvax-task-pack-latest.json
exports/canvax-rewrite-request-latest.json
exports/canvax-image-prompt-pack-latest.json
exports/canvax-asset-candidates-latest.json
artifacts/canvax/codex-output.json
```

## Current Limits

Canvax is not yet:

- a first-party embedded Codex canvas
- a direct reader of the Codex chat microphone stream
- a direct caller of ChatGPT Images from localhost
- a full Figma/Canva replacement
- a guaranteed one-click production app generator

The current strength is the local, no-API collaboration loop: draw, speak, save, generate local previews, attach outputs, and let Codex read precise visual handoff files.
