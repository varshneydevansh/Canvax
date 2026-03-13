# Use Canvax With Codex

## Core Mental Model

Canvax is a visual handoff surface for Codex.

The intended loop is:

1. open the board
2. draw, label, and connect screens
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
- a finished voice-plus-sketch collaboration surface

Those deeper integrations are part of the roadmap in `canvax-live-collaboration-plan.md`.
