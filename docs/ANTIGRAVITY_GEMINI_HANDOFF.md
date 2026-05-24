# Antigravity Gemini Handoff

Use this as the opening brief for Gemini in Antigravity 2.0.

## Copy-Paste Prompt

Paste this into Gemini in Antigravity 2.0:

```text
You are taking over Canvax, a local Codex visual workbench at /Users/devanshvarshney/Canvax. Your job is to align it with the best parts of Google Stitch, then push it far beyond Stitch.

Do not build a marketing page or a prettier chat sidebar. Build the actual usable design workbench.

Core product thesis:
- Canvax should let me design anything visually: UI/UX screens, app flows, websites, book pages, comic/storyboard pages, posters, brand layouts, image-generation prompts, and image-editing directions.
- The primary interaction is canvas-first: I sketch or mark up a big canvas, speak or type into a simple scratchpad, press Reply/Make, and the generated result appears under or inside the same canvas so I can draw corrections directly on top.
- It should feel simpler than Stitch for everyday work, because the first screen is just canvas + scratchpad + clear action controls.
- It should be more powerful than Stitch for implementation, because every generated output is bound to frames, manifests, rewrite requests, Codex output contracts, and real files/artifacts.

Current local path:
- Run ./canvax from /Users/devanshvarshney/Canvax.
- Open http://localhost:3210.
- Workbench is the default surface. Advanced mode is an inspector/deck for the same objects, not a separate product.
- Do not require OPENAI_API_KEY. Hosted image/model capabilities must remain optional host lanes, not local requirements.

What I want you to do:
1. Study the existing repo, especially web/index.html, web/app.js, web/styles.css, docs/CANVAX_PARITY_AUDIT.md, docs/STITCH_GAP_ROADMAP.md, docs/CHATGPT_APP_BRIDGE.md, docs/DESIGNER_WALKTHROUGH.md, and codex-skill/canvax/SKILL.md.
2. Redesign and implement the Workbench so it has one clean canvas-first loop:
   Sketch -> Talk/Type -> Reply/Make -> generated output appears in the same canvas -> draw corrections -> Reply again.
3. Redesign and implement Advanced too. It should feel like Workbench with inspectors open:
   - same visual system, same command language, same active frame/output/design-kit context
   - tighter project rail, canvas deck, map controls, inspector fields, manifests, and generation panels
   - grouped controls with clear primary, secondary, destructive, disabled, busy, success, and error states
   - proper alignment for every button, text input, textarea, select, chip, swatch, slider, badge, and card
   - no giant first-viewport command stack that pushes the actual canvas too far down in the Codex in-app browser
4. Treat the scratchpad as a first-class right-side Codex app surface, not a floating toy. It should be compact, calm, and always useful.
5. Make generated results editable canvas citizens:
   - generated UI screens
   - generated variants
   - book/page layouts
   - image prompt candidates
   - imported/generated images
   - real implementation previews
6. Make output binding real:
   Every generated output must carry frame ids, manifest target, outputEditBinding, checkpoint/export context, and rewrite/build linkage.
7. Preserve the no-API local workflow:
   The local deterministic generators and executors must work without paid keys. If host image generation exists, prepare prompt packs and return slots, but never require it.
8. Improve visual taste:
   Make Canvax feel like a serious creative/code tool: dense but not cluttered, restrained but expressive, high-clarity controls, no marketing hero, no decorative blobs, no generic AI-purple UI, no oversized empty cards.
9. Add motion and visual feedback deliberately:
   Use CSS transform/opacity motion, not heavy dependencies. Buttons should press, selections should settle, busy actions should visibly run, new activity should enter gracefully, drop targets should respond, and reduced-motion users should get still but clear feedback.
10. Verify rendered behavior:
   Use the in-app/browser workflow or Playwright. Check desktop and mobile. Run self-test routes and project scripts. Fix regressions instead of only documenting them.

Important product bar:
- Canvax should be usable for a designer sketching a SaaS screen, a writer laying out a book spread, an artist planning an image edit, and a developer turning a sketch into a real implementation target.
- Do not optimize only for a demo. Optimize for repeated daily iteration.
- Do not hide the workflow in Advanced mode.
- Do not make Advanced look or behave like a separate app. It is create/reply/correct plus inspectors, not a competing workflow.
- Do not leave Reply as a disconnected preview. It must become a live canvas/output rewrite loop.

Before committing:
- Run node --check web/app.js.
- Run node --check scripts/canvax.mjs.
- Run node --check scripts/write-codex-output.mjs.
- Run http://localhost:3210/?selftest=1 and confirm document.body.dataset.selftestPassed is true.
- Prefer npm run browser-regression when UI changes are meaningful.

Commit coherent slices with clear messages. Keep docs honest about what is local, what is Codex skill behavior, and what still needs native host bridge support.
```

## Mission

You are taking over Canvax as a designer-first Codex visual workbench. The goal is not a prettier chat sidebar. The goal is a real canvas-native collaboration surface where a user can sketch, speak, generate, correct directly over the output, and keep iterating without leaving the canvas.

Push Canvax beyond Stitch-class workflows while keeping it simpler for everyday use:

- One primary Workbench surface for sketch, voice, generated output, corrections, variants, and implementation handoff.
- Advanced mode remains an inspector/debug layer, not the default path.
- Advanced still matters: it must be beautiful, aligned, animated with restraint, accessible, and efficient for long sessions.
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

## Unified Workbench + Advanced UX

Use this mental model:

```text
Workbench = create / reply / correct
Advanced = inspect / tune / debug / export
```

Both modes must operate on the same active frame, generated output, design kit, image assets, rewrite request, manifest binding, checkpoint history, and Codex output contract.

Do not let Advanced become a dumping ground for every control at equal weight. It should be the same design instrument with more precise inspectors open.

Advanced requirements:

- The first viewport must expose the active canvas quickly, especially inside the Codex in-app browser where width can be narrow.
- The command deck should be compact and grouped: tools, ink, status, primary generation actions, and project context should not wrap into a noisy wall.
- The project rail should scan cleanly: current project, frame stack, captures, and workspace actions must use consistent spacing and clear target sizes.
- The canvas/map deck should feel tactile: selected frames, output objects, lasso, panning, dragging, drop zones, and timeline selections should have visible state changes.
- The handoff inspector should use section dividers and compact field groups instead of nested cards everywhere.
- Buttons, inputs, textareas, selects, swatches, sliders, badges, and chips must align to a shared control system.
- Use 44px-ish minimum touch targets where practical, visible focus states, `aria-live` for status text, and `aria-busy` or equivalent state for long actions.
- Motion should be purposeful: press, busy, saved, selected, dropped, connected, refreshed. Avoid infinite decorative loops.
- Respect `prefers-reduced-motion`.

Visual system direction:

- Keep the Canvax identity: warm paper, charcoal canvas, rust primary action, mint sync/selection, muted blue for generated output/reference, amber for story/book/checkpoints, muted plum for variants.
- Prefer solid primary buttons over gradient buttons.
- Reserve pill shapes for small badges/chips. Use calmer 8-16px radii for ordinary buttons, inputs, panels, and command groups.
- Keep expressive serif typography for brand/editorial/book moments only. Tool UI should stay clean sans plus mono metadata.
- One app background wash is enough. Avoid stacking radial gradients on every panel.
- The right scratchpad should feel like a native Codex-side surface: Brief, Actions, Activity. Do not scatter the same commands across unrelated floating widgets.

## Stitch++ Benchmark

Use Google Stitch as a baseline, not the ceiling.

Canvax should match the useful Stitch feeling:

- fast visual ideation from rough natural-language intent
- immediate generated screen/page candidates
- easy iteration without writing long specs
- approachable controls for non-engineers

Canvax should exceed Stitch in these ways:

- **Canvas-native iteration:** output appears under the same drawing surface, so correction marks are spatial and immediate.
- **Broader surfaces:** UI screens, websites, mobile app views, book pages, comics, storyboards, posters, decks, image prompt boards, and image-editing plans are all first-class.
- **Real implementation binding:** every generated artifact can bind to frames, files, manifests, code maps, build requests, patch tasks, and Codex output.
- **No-API local proof:** deterministic local generation, export, rewrite, and preview flows work without a paid key.
- **Advanced spatial memory:** generated variants, outputs, references, images, and checkpoints live as editable objects on the Map, not just as chat history.
- **Host-lane ready:** when Codex/ChatGPT image or code capabilities exist, Canvax already has prompt packs, return slots, and manifest contracts ready.

The highest-level UX requirement is:

```text
The user should feel they are drawing, speaking, and directly shaping the artifact, not managing a chat transcript.
```

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

3. Make Advanced feel like the same professional design tool.
   Compact the command deck, align every control, reduce equal-weight buttons, group map/inspector actions, improve touch targets and focus states, and add purposeful visual feedback for busy/selected/dropped/refreshed states.

4. Upgrade correction-to-implementation.
   When a user marks over output and replies/applies, the generated or real implementation target should update from the frame-bound output binding rather than creating an unrelated new screen.

5. Improve visual verification.
   Use the Codex in-app Browser when available. Check desktop and mobile breakpoints, console health, popover interactions, output underlay alignment, and canvas drawing after generated output is mounted.

6. Keep docs honest.
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
