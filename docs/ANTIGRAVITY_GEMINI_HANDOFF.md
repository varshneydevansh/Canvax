# Antigravity Gemini Handoff

Use this as the opening brief for Gemini in Antigravity 2.0.

## Mission

You are taking over Canvax as a designer-first Codex visual workbench. The goal is not a prettier chat sidebar. The goal is a real canvas-native collaboration surface where a user can sketch, speak, generate, correct directly over the output, and keep iterating without leaving the canvas.

Push Canvax beyond Stitch-class workflows while keeping it simpler for everyday use:

- One primary Workbench surface for sketch, voice, generated output, corrections, variants, and implementation handoff.
- Advanced mode remains an inspector/debug layer, not the default path.
- No paid API key requirement for the local workflow.
- Browser/Codex app integration should feel first-class, but do not claim native host capabilities that do not exist yet.

## Current Context

Start here:

- `README.md`
- `docs/CANVAX_PARITY_AUDIT.md`
- `docs/STITCH_GAP_ROADMAP.md`
- `docs/CHATGPT_APP_BRIDGE.md`
- `docs/DESIGNER_WALKTHROUGH.md`
- `codex-skill/canvax/SKILL.md`

Recent design consensus and implementation notes live under:

- `artifacts/canvax/subagents-skill-led/reports/`

The local board runs with:

```bash
./canvax
```

Open it at:

```text
http://localhost:3210
```

## Product Direction

Treat the right-side scratchpad/composer as the main Workbench command surface. It should be clean, docked, and predictable, not a floating gimmick.

The intended loop:

1. User sketches on the canvas.
2. User dictates or types design intent.
3. `Reply` snapshots the sketch, generates output, clears the drawing layer, and mounts the generated output under the same canvas.
4. User draws corrections directly over that generated output.
5. `Reply` again uses the output binding, correction marks, and voice context to update the same output.

The canvas reply should become a first-class frame state and export binding, not just a visual iframe.

## Open Hand

You have broad permission to improve Canvax aggressively if you preserve the core local workflow and tests.

You may:

- Redesign the Workbench layout if it makes the sketch/speak/reply loop clearer.
- Refactor UI state and renderer code when it reduces fragility.
- Replace awkward prototype UI with a better production interaction.
- Add focused tests for every meaningful behavior change.
- Update docs when behavior changes.

Do not:

- Require `OPENAI_API_KEY` for the default local path.
- Hide core work behind Advanced mode.
- Add decorative UI that competes with the canvas.
- Claim Codex/ChatGPT microphone or native host control unless a real host bridge exists.
- Leave generated output unbound from frames, exports, checkpoints, and rewrite/build requests.

## Immediate Priorities

1. Make same-canvas Reply robust end to end.
   It should preserve a source checkpoint, mount the generated output under the canvas, clear only the correction layer, export `canvasReply`, and include `outputEditBinding` in live export, task pack, rewrite request, and checkpoints.

2. Make Workbench feel like a professional design tool.
   Keep the scratchpad compact, keep Agent Log collapsed by default, avoid duplicate controls, and make the first screen usable without reading docs.

3. Upgrade correction-to-implementation.
   When a user marks over output and replies/applies, the generated or real implementation target should update from the frame-bound output binding rather than creating an unrelated new screen.

4. Improve visual verification.
   Use the Codex in-app Browser when available. Check desktop and mobile breakpoints, console health, popover interactions, output underlay alignment, and canvas drawing after generated output is mounted.

5. Keep docs honest.
   Canvax is currently a local companion plus Codex skill. Future native app-server integration belongs in `docs/CHATGPT_APP_BRIDGE.md`.

## Validation Baseline

Before committing meaningful changes, run at least:

```bash
node --check web/app.js
node --check scripts/canvax.mjs
node --check scripts/write-codex-output.mjs
```

For broader validation, prefer:

```bash
npm run browser-regression
npm run e2e-workflow
npm run check
```

Use the board self-test route when touching Workbench UI:

```text
http://localhost:3210/?selftest=1
```

Passing self-test should set `document.body.dataset.selftestPassed` to `true`.

## Taste Bar

This is a daily creative tool, not a landing page.

- Prefer restrained, dense, high-clarity UI.
- Keep the canvas visually dominant.
- Use controls that map to real actions: icons, toggles, buttons, menus, tabs, sliders.
- Avoid marketing copy, decorative blobs, and generic AI gradients.
- Make the user feel they are shaping the artifact directly, not negotiating with a chat transcript.
