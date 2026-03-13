# Develop Canvax

## Goal Of These Docs

This file is for contributors and future maintainers.

Use it to understand:

- how to run the project locally
- where to make changes
- how to avoid breaking the sketch loop
- how to extend the current architecture safely

## Local Development

Start or reuse the service:

```bash
./canvax --open
```

Basic syntax check:

```bash
npm run check
```

Useful service commands:

```bash
./canvax --status
./canvax --stop
./canvax --restart --open
```

## Development Principles

- Keep the sketch loop fast.
- Avoid adding friction to the board startup flow.
- Preserve the difference between Frame view and Flow view.
- Prefer generic canvas behavior over screen-specific assumptions.
- Keep Codex integration path-based and explicit.

## Where To Change What

### Add or change a drawing tool

Edit:

- `web/app.js`

Likely areas:

- tool definitions
- pointer event handling
- render logic
- selection behavior

### Change layout or visual design

Edit:

- `web/index.html`
- `web/styles.css`

### Change export structure or save behavior

Edit:

- `web/app.js`
- `scripts/canvax.mjs`

Be careful to keep backward compatibility where possible because older live export files may still exist.

### Change how Codex should interpret the canvas

Edit:

- `codex-skill/canvax/SKILL.md`
- `README.md`
- `docs/USAGE.md`

## Manual Smoke Test Checklist

After interaction changes, check these manually:

- board opens at the expected local URL
- tools still switch correctly
- brush size updates correctly
- labels can be placed and edited
- selection, grouping, and deletion still work
- captures can be created and removed
- Flow view can create and remove links
- live export still writes to `exports/`

## Current Known Architectural Constraint

`web/app.js` currently carries most of the state and interaction logic in one file. That is acceptable for this stage of the project, but contributors should expect future refactoring into smaller modules as the collaboration loop grows.

## Planned Next Layers

The current roadmap is tracked in:

- `canvax-live-collaboration-plan.md`

The main next layers are:

- richer live collaboration state
- voice attached to canvas checkpoints
- preview/artifact feedback loop
- better thread-to-canvas coordination with Codex

## Attribution

This project is documented here as having been created collaboratively with OpenAI Codex. Keep that wording accurate in future docs unless the project owner wants a different attribution line.
