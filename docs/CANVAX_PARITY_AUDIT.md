# Canvax Parity Audit

This audit maps the current Canvax goal to concrete evidence in the repo.
It is intentionally strict: a passing test or shipped feature is only counted
when it covers the stated requirement directly.

## Objective

Drive Canvax from a Stitch-inspired prototype to a designer-first Codex visual
workbench that is simpler than Stitch for everyday use and more powerful for
real implementation.

## Checklist

| Requirement | Current state | Evidence | Remaining gap |
| --- | --- | --- | --- |
| Simple everyday Workbench | Partial / stronger local | Workbench focus modes, `Start here` actions for Sketch/Talk/Make/Map, Focus canvas rail/composer, tray collapse, quick prompts, `More actions` disclosure in `web/index.html` and `web/app.js`; docs in `docs/USAGE.md`, `docs/FEATURES.md`, and `docs/DESIGNER_WALKTHROUGH.md`; browser self-test covers Workbench controls and start actions. | Still needs manual design review for first-time designers, but the default brief now has a short guided path and no longer shows the fixed bottom rail/composer until Focus canvas is active. |
| Unified Workbench / Advanced experience | Partial / stronger local | Shared dark workspace language, solid Advanced command deck, collapsed Workbench context summary, shared Frame/Map/Preview data model, and a visible mode guide that maps Workbench to `Sketch` / `Talk` / `Make / Apply` and Advanced to `Project rail` / `Canvas deck` / `Handoff inspector`; docs explain mode boundary; browser regression now captures a `visualfixture=advanced-map` state and asserts the deck is opaque. | Advanced is still denser by design and still needs manual design review, but the shared hierarchy is now clearer. |
| True infinite spatial canvas | Partial / stronger local | Workbench `Map`, bounded internal map viewport, `Tidy map`, pan/zoom with background momentum/coast, minimap click-to-pan navigator, compact `Map timeline` with frame/branch/output/checkpoint tracks, `spatialWorkspace.viewport`, `spatialWorkspace.interaction`, `spatialWorkspace.timeline`, and `spatialWorkspace.groupHierarchy` export, `Fit map` recovery, left/top edge expansion, trailing workspace room, frame cards, variant cards, spatial objects, selection-created group regions, selecting group contents, fitting group bounds, ungrouping, front/back layer ordering, output/history lane earlier/later ordering, branch earlier/later ordering, branch drag-position ordering with visible drop targets, collapsible output shelf lane, object focus filtering, object pinning, object locking against accidental transform/reorder/duplicate/delete, selected-object and multi-selected-object actions, single-object Title/Note/Status/Prompt editing, custom `key: value` properties, safe type-detail overrides, structured per-type inspector sections/export, selected-object `spatialContext` in task/image/rewrite/build handoffs, Shift-drag Map lasso selection, selected-set dragging/resizing with a combined transform box, group movement that skips locked child objects, recursive nested group movement/resizing for geometry-contained groups, selected group contents inspection, nested group path export, group duplication of unlocked contained objects, collapsible checkpoint history lane export, lock/layer/lane/branch/context/inspector export in `web/app.js`; docs in `docs/STITCH_GAP_ROADMAP.md`. | Not a full arbitrary-object infinite canvas yet: custom properties are a local schema layer, but fully arbitrary property panels and a full nested object model remain open. |
| Generated variants as editable canvas objects | Strong local | `Create variants`, deterministic semantic recipes for Structure/Visual/Adaptive branches, variant style knobs for palette/typography/density/motion/imagery, variant branch cards, matching `variant-branch` Map objects, `Use variant` directly in Map, `Edit as frame` output-preview branches, primary-state export through `spatialWorkspace.variantBranches`, `spatialWorkspace.variantBranches[].semanticRecipe`, `spatialWorkspace.variantBranches[].styleProperties`, `spatialWorkspace.variantBranches[].outputBinding`, task/rewrite/build `outputEditBinding`, and `spatialWorkspace.objects`; self-test covers variant creation, recipe export, style edit/export, object rendering/export, Map action, output-preview to editable frame creation, promotion, export, and request binding. | Still not a hosted semantic AI variant generator or a full arbitrary design-token editor, but variants and output-edit branches are now meaningful editable spatial objects in the local Map. |
| Codex-built real app/screen generation with manifest binding | Partial / strong local | `Build with Codex` request, designer `implementationContext`, deterministic local executor that now consumes that context and active `designKit` for preview/starter theming, theme-specific atmosphere layers, and a visible `Designer context` panel, implementation bundle with standalone HTML/CSS/JS plus React-ready `CanvaxScreen.jsx`/CSS, Vite/Next adapter stubs, framework adapter notes, frame-to-code ownership map, `canvax-build-contract.json` integration contract, `codex-port-task.json` production-port task, `INTEGRATION.md` porting guide, `ACCEPTANCE.md` production-readiness checklist, `artifacts/canvax/codex-output.json`, preview manifest binding, and `Edit as frame` from generated output preview to an `Output edit` frame preserving the generated target through request/executor `outputEditBinding`; `npm run e2e-workflow` verifies rough frame to build/rewrite manifest chain plus design-kit preservation, the integration contract, Codex port task, acceptance checklist, and themed/atmospheric preview output. | Real production implementation still depends on Codex acting on the request; local executor is a smoke/scaffold path, not a high-fidelity production generator. |
| Local semantic screen generation | Partial / stronger local | `Generate screen` creates polished local HTML from both rectangle-heavy wireframes and stroke-first sketches with arrows, ovals, image slots, and labels; browser self-test verifies the stroke-first path. | This is deterministic local rendering, not hosted AI design generation, and it does not replace a real production implementation pass. |
| Live sketch-and-voice rewrite loop | Partial / stronger local | Voice segments, transcript bridge, Apply/Live rewrite, rewrite request, local rewrite executor, output annotations with normalized changed-region bounds, output eraser deletion semantics, affected-region to component-target mapping, attached build-contract `visualDirection` preservation for themed rewrite previews, attached Codex port task preservation for production-port context, in-flight Live rewrite queueing for newer handoffs, checkpoints, e2e workflow proof, and future host bridge boundary in `docs/CHATGPT_APP_BRIDGE.md`. | Not a continuous first-party Codex live co-edit loop; native Codex microphone and live ChatGPT/Codex host bridge require first-party integration. |
| Richer image / asset candidate handling | Partial / stronger local | `Image pack`, `canvax-style-lock`, placement-map asset candidates, output slots, `canvax-asset-candidate-review` frame queues, consolidated image generation brief with copy-ready host prompts, no-API image host task with return-slot binding, asset candidate tray, per-candidate prompt/placement copy, per-candidate host-task copy, editable pasted/dropped images, file attach, workspace-path attach, thumbnails, accept/review state, Map asset objects, Copy context, per-object `contextMarkdown`, future host image handoff tools in `docs/CHATGPT_APP_BRIDGE.md`; no API key required. | Direct ChatGPT image generation / image editing is not available from localhost without host bridge; candidate review is local and prompt-based. |
| Open Design-style skill/design-system layer | Partial / stronger visible | Root `DESIGN.md` detection, starter `DESIGN.md` generation, a visible `Design kit` summary in Workbench/Advanced, a compact local preset gallery for product apps, poster systems, book spreads, dashboards, and storyboards, local current-frame sketch token extraction, locally readable placed/reference-image color sampling, `npm run extract-tokens` for URL/file/generated-artifact CSS token extraction, Advanced `Import external` for the latest external token pack, `npm run verify-tokens` for local implementation artifact palette enforcement, no-API style locks, semantic variant recipes, image prompt packs, and Codex build/rewrite handoff contracts that now export the active `designKit` source, preset, recipe, action mode, board mood, surface, frame notes, style knobs, and extracted sketch/reference-token cues. Open Design is tracked as an external reference in `docs/STITCH_GAP_ROADMAP.md`. | Canvax does not yet have a full file-based skill gallery like Open Design, rendered screenshot/app semantic extraction, or strict token enforcement after arbitrary real production ports. |
| Documentation proving workflow | Strong | `README.md`, `docs/USAGE.md`, `docs/FEATURES.md`, `docs/DESIGNER_WALKTHROUGH.md`, `docs/ARCHITECTURE.md`, `docs/CHATGPT_APP_BRIDGE.md`, `docs/EXECUTION_STATUS.md`, `docs/STITCH_GAP_ROADMAP.md`, `canvax-stitch-like-workbench-plan.md`, this audit, and `npm run goal-audit` output. | Keep docs synchronized as features change and keep visual-review screenshots current. |
| Tests proving rough sketch to real output, no paid API keys | Strong for local workflow | `npm run check`, `npm run regression`, `npm run e2e-workflow`, `npm run goal-audit`, browser self-tests, service lifecycle tests, responsive snapshots. | Tests prove the local no-API pipeline and deterministic executors, not a hosted first-party ChatGPT image/Codex live surface. |
| No paid API key requirement | Strong | Export packs include `requiresOpenAiApiKey: false`; docs state host-driven/no-API boundary; tests validate no-API task/image/build/rewrite paths. | Future host image generation must remain optional and must not introduce an API-key dependency. |

## Prompt-To-Artifact Checklist

This checklist maps each explicit goal phrase to concrete repo artifacts and
verification gates. It is the source of truth before claiming the goal is done.

| Goal phrase | Required artifact / behavior | Current evidence | Gate before completion |
| --- | --- | --- | --- |
| Designer-first Codex visual workbench | Default Workbench with Start here actions, sketch, voice/manual note, Make/Apply, Preview/Map focus, and no required Advanced panels for normal work | `web/index.html`, `web/app.js`, `web/styles.css`, `docs/USAGE.md`; browser self-test covers Workbench controls and start actions | Manual visual review must confirm the first-use surface is still not overwhelming |
| Simpler than Stitch for everyday use | Start here strip, canvas-first mode, quick prompt chips, collapsed tray, Focus canvas rail/composer, readable output cards, no API setup, short designer walkthrough | `docs/EXECUTION_STATUS.md` Sprint 1; `docs/DESIGNER_WALKTHROUGH.md`; responsive smoke screenshots under `artifacts/canvax/browser-snapshots/latest/` | Continue manual visual review as the UI evolves |
| More powerful for real implementation | Build/rewrite requests, local executors, React/framework handoff, component map, manifest publishing, output cards, Preview binding | `scripts/execute-build-request.mjs`, `scripts/execute-rewrite-request.mjs`, `scripts/write-codex-output.mjs`, `artifacts/canvax/codex-output.json`; `npm run e2e-workflow` | Real production app edits still depend on Codex acting on the request, so this is not complete as a fully autonomous app builder |
| Unified Workbench / Advanced experience | Shared visual language and data model, Advanced as inspector/debug layer, Workbench as default, visible role guide for both modes | `web/index.html`, `web/app.js`, `web/styles.css`, `docs/STITCH_GAP_ROADMAP.md`, `canvax-stitch-like-workbench-plan.md`; browser self-test covers mode guide rendering | Advanced still needs manual design review so the denser inspector does not feel like a separate product |
| True infinite spatial canvas | Map pan/zoom with background momentum/coast, bounded internal viewport, `Tidy map`, minimap click-to-pan navigator, compact `Map timeline` with frame/branch/output/checkpoint tracks, viewed-region export through `spatialWorkspace.viewport`, interaction export through `spatialWorkspace.interaction`, timeline export through `spatialWorkspace.timeline`, group hierarchy export through `spatialWorkspace.groupHierarchy`, `Fit map` recovery, edge expansion, trailing room, lasso, multi-select, selection-created groups, selecting group contents, fitting group bounds, ungrouping, spatial objects, front/back object layering, output/history lane earlier/later ordering, branch earlier/later ordering, branch drag-position ordering with visible drop targets, default-compressed output/history lanes, collapsible output shelf lane, object pinning, object locking, lightweight object Title/Note/Status/Prompt/custom-property editing, safe type-detail overrides, structured per-type inspector sections, object focus filtering, recursive nested group movement/resizing, collapsible checkpoint history lane, lock/layer/lane/branch/context/inspector/custom-property export | `web/app.js` `STORAGE_VERSION = 4`, `updateSelectedSpatialObjectCustomProperties`, `startFlowPanMomentum`, `stepFlowPanMomentum`, `buildMapObjectInspectorContract`, `updateSelectedSpatialObjectDetail`, `canReorderSelectedVariantBranches`, `reorderSelectedVariantBranches`, `reorderVariantBranchesByMapPosition`, `renderBranchDropTargetMarkup`, `buildSpatialTimeline`, `buildSpatialGroupHierarchy`, `collectSpatialGroupMemberOrigins`, `resizeSpatialGroupMembers`, `computeFlowSurfaceSize`, `ensureFlowWorkspaceMargin`, `renderFlowNavigator`, `onFlowNavigatorPointerDown`, `buildSpatialViewportExport`, `fitFlowMapToContent`, `buildSpatialWorkspaceExport`; browser self-test and docs | Still missing fully arbitrary schema-specific property panels and a full nested object model |
| Generated variants as editable canvas objects | Variant branch frames and matching `variant-branch` Map objects with semantic recipes, prompts, design moves, style knobs, custom properties, `Use variant`, primary state, `Output edit` branches created from output preview cards, and explicit `outputEditBinding` in task/rewrite/build handoffs | `web/app.js`, live export `spatialWorkspace.variantBranches[].semanticRecipe`, `spatialWorkspace.variantBranches[].styleProperties`, browser self-test | Hosted AI-generated variants and full arbitrary design-token editing remain future work |
| Codex-built real app/screen generation with manifest binding | Build request, local executor, preview artifact, implementation bundle, React/framework handoff, frame-to-code map, Codex port task, Codex output manifest, editable output branch creation from a generated target, request/executor target binding, and context-aware starter theming from variant/style/Map guidance | `exports/canvax-build-real-latest.json`, `scripts/execute-build-request.mjs`, `scripts/execute-rewrite-request.mjs`, `web/app.js`, `npm run e2e-workflow` | High-fidelity production code generation is not proven by the deterministic smoke scaffold |
| Live sketch-and-voice rewrite loop | Voice export, transcript bridge, rewrite request, Apply/Live rewrite, in-flight handoff queueing, output correction bounds, output eraser deletion semantics, changed region/component targeting, build visual direction preservation, Codex port task preservation, checkpoints | `exports/canvax-voice-latest.md`, `exports/canvax-rewrite-request-latest.json`, `scripts/execute-rewrite-request.mjs`, browser self-test, e2e rewrite proof | Continuous first-party Codex co-edit while sketching remains blocked on host integration |
| Rich image/asset candidate handling | Image prompt pack, style-lock block, placement-map asset candidates, output slots, frame-grouped review queue, image generation brief, image host task, local file/path attach, per-candidate prompt/placement copy, per-candidate host-task copy, accept/review, Map asset objects | `exports/canvax-image-prompt-pack-latest.json`, `exports/canvax-asset-candidates-latest.json`, `exports/canvax-image-generation-brief-latest.json`, `exports/canvax-image-host-task-latest.json`, `web/app.js`, endpoint regression and browser self-test | Direct ChatGPT image generation/editing remains host-provided, not localhost-provided |
| Documentation/tests proving full rough-sketch-to-real-output workflow | Designer walkthrough, usage, features, architecture, ChatGPT/Codex bridge boundary, roadmap, execution status, audit, e2e workflow, browser regression, strict goal audit | `README.md`, `docs/*.md`, `npm run check`, `npm run regression`, `npm run e2e-workflow`, `npm run goal-audit` | Keep docs synchronized after every feature chunk |
| End to end without requiring paid API keys | All local requests/packs mark `requiresOpenAiApiKey: false`; no app flow requires `OPENAI_API_KEY` | Regression and e2e checks validate no-API paths; docs state host-capability boundary | Future adapters must stay optional and cannot become a core requirement |

## Latest Verification

Verified locally on May 18, 2026 after the React/framework build handoff, no-API image generation brief, no-API image host task, and strict prompt-to-artifact goal-audit passes:

```text
npm run check      -> pass
npm run regression -> pass
npm run e2e-workflow -> pass through npm run regression
npm run goal-audit -> evidence pass, overallComplete false
```

The regression run includes service lifecycle checks, the no-API e2e workflow,
board browser self-test with 92 assertions, Preview browser self-test with 16
assertions, responsive board/Preview screenshots at 1440, 1024, 768, and 430
pixel widths, plus the Map viewport/tidy, lane-order, object prompt/context,
compact spatial-context assertions, opt-in materialized review overlays,
in-flight Live rewrite queueing, per-candidate image prompt copy, and latest
handoff schema validation including the machine-readable image host task.

The goal audit writes `artifacts/canvax/goal-audit/latest/result.json` and
`artifacts/canvax/goal-audit/latest/result.md`. It is intentionally stricter
than a green test run: the evidence checklist can pass while the overall goal
remains incomplete because native host bridges and high-fidelity autonomous
production generation are still not proven.

## Current Verdict

Canvax is no longer just a sketch prototype. It is a local Codex visual
workbench with a strong no-API handoff pipeline, Map memory, variant branches,
generated-output binding, asset candidates, voice notes, and regression
coverage.

It is not complete against the full objective yet. The main remaining gaps are:

- true arbitrary-object infinite canvas behavior
- first-party live Codex/ChatGPT host bridges for mic, image generation, and
  continuous co-editing
- higher-fidelity production UI generation beyond deterministic local
  scaffolds
- richer Open Design-style reusable skill/design-system discovery without
  turning Workbench into a prompt-only artifact generator
- strict token enforcement after Codex ports a screen into arbitrary real app
  files, beyond the current local implementation-artifact verifier
- stronger default-designer UX simplification across Workbench and Advanced

## Gate Commands

Run these before claiming a parity milestone:

```bash
npm run check
npm run regression
npm run e2e-workflow
npm run goal-audit
```

For UI review, inspect the latest browser snapshot index:

```text
artifacts/canvax/browser-snapshots/latest/index.json
```
