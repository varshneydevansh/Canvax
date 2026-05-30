# Canvax UI/UX Surface Checksheet

Generated: 2026-05-30

This checklist keeps Canvax understandable for designers. The product rule is simple: the user should be able to point at a visual target, mark it, say what should change, and accept or discard the result without needing implementation terms.

## Designer Workflow

- Sketch: the scratchpad accepts drawing, notes, pasted images, and rough composition.
- Say intent: the instruction field, voice, or pasted dictation explains what should change.
- Make: the current frame gets a generated output bound back to the frame.
- Live Edit: the user picks the exact region, adds marks or comments, generates variants, and accepts or discards.
- Apply: Canvax writes the latest checkpoint and handoff for Codex.

## Live Edit Terms

- `Pick target`: choose the exact object, output region, image area, or canvas region to change.
- `Change target`: replace the current picked target with a better one.
- `Scratch / Output`: appears only while picking. It chooses whether the next pick happens on the scratchpad or generated output.
- `Go`: create variants for the picked target.
- `Accept`: keep the selected variant and bind it to the frame/output manifest.
- `Discard`: remove the temporary pick or variants and restore the original surface.

## Visual Target Rules

- Picked targets render as a thin outline with a small label, not as a filled shape that covers the design.
- Comment pins stay inside or near the selected target and are draggable where supported.
- Variants may hot-swap in output, map, or object surfaces, but the scratchpad must remain editable and readable.
- Escape, Close, or Discard must leave no stale target overlay.

## Surface Checks

| Surface | Must Stay True |
| --- | --- |
| Sketch | Internally scrollable and zoomable; rail and composer do not cover the editable canvas. |
| Split | Scratch and output can be inspected together; zoom follows the last touched surface. |
| Output | Generated output scrolls and zooms independently from the scratchpad. |
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
