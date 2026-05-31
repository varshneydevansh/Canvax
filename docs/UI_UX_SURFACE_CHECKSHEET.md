# Canvax UI/UX Surface Checksheet

Generated: 2026-05-30

This checklist keeps Canvax understandable for designers. The product rule is simple: the user should be able to point at a visual target, mark it, say what should change, and accept or discard the result without needing implementation terms.

## Designer Workflow

- Sketch: the sketch pad accepts drawing, notes, pasted images, and rough composition.
- Say intent: the instruction field, voice, or pasted dictation explains what should change.
- Make: the current frame gets a generated output bound back to the frame.
- Live Edit: the user picks the exact region, adds marks or comments, generates variants, and accepts or discards.
- Apply: Canvax writes the latest checkpoint and handoff for Codex.

## Live Edit Terms

- `Pick target`: choose the exact object, output region, image area, or canvas region to change.
- `Change target`: replace the current picked target with a better one. Picked scratchpad and output outlines can also be moved from their border or resized from corner handles before variants are generated.
- `Sketch pad / Generated output`: appears only while picking. It chooses which visible surface receives the next pick.
- `Go`: create variants for the picked target.
- Variant controller: after `Go`, output-backed targets show a small in-canvas controller for previous/next, variant count, Accept, and Discard.
- `Accept`: keep the selected version with the current screen and save it for Codex.
- `Discard`: remove the temporary pick, temporary variants, and target-bound marks from that Live Edit pass, then restore the original surface.
- Action chips:
  `Freeform` follows the written note, `Layout` changes placement/spacing/structure, `Typeset` improves type rhythm, `Colorize` changes color and contrast, and `Clarify` / `Bolder` / `Quieter` / `Animate` steer the variant mood.

## Visual Target Rules

- Picked targets render as a thin outline with a small label, not as a filled shape that covers the design.
- Target outlines are direct manipulation controls: drag the outline border to move and drag corner dots to resize. Pins should remain attached to the same relative point inside the target.
- If a scratchpad canvas-object target is moved or resized before `Accept`, `Discard` or `Escape` must restore that object's original geometry.
- Canvas pill labels must clamp their radius; a label like `Clarity target` must never expand into a large yellow canvas object.
- Comment pins stay inside or near the selected target and are draggable where supported.
- Variants may preview in place on output, map, or object surfaces, but the sketch pad must remain editable and readable.
- Output variants must expose the in-canvas controller near the selected target; the dock may mirror controls but should not be the only way to choose a variant.
- Escape, Close, or Discard must leave no stale target overlay or unaccepted target-bound correction marks.
- The picked target outline must explain removal in plain language: use `Discard` or `Escape` for active Live Edit target/variant/mark residue, and `Undo` / `Erase` / `Clear marks` for normal strokes.

## Surface Checks

| Surface | Must Stay True |
| --- | --- |
| Sketch | Internally scrollable and zoomable; rail and composer do not cover the editable canvas. |
| Split | Sketch pad and generated output can be inspected together; zoom follows the last touched surface and labels the active one. |
| Output | Generated output scrolls and zooms independently from the sketch pad. |
| Map | Cards, shelves, minimap, filters, and search remain readable and do not overlap. |
| Help | Explains user actions in designer language, not engineering language. |
| Project browser | Light dialog has dark readable text and visible actions. |
| Codex sidecar | Compact layout keeps canvas, composer, and rail inside the viewport. |

## Regression Checklist

- Workbench default at `http://localhost:3210/`
- Codex sidecar at `http://localhost:3210/?host=codex-sidecar`
- Agent log fixture at `http://localhost:3210/?visualfixture=workbench-agent-log`
- Map fixture at `http://localhost:3210/?visualfixture=advanced-map`
- Preview at `http://localhost:3210/preview.html`
- Browser snapshots under `artifacts/canvax/browser-snapshots/latest/`

## Acceptance Bar

- No clipped primary controls.
- No unreadable low-contrast text.
- No full-surface overlays unless the user explicitly opens a modal.
- Every visible designer command has a plain-language purpose.
- Sketch, output, and map surfaces can handle larger-than-window content without breaking layout.
- No visible Live Edit control says `Retarget`.
