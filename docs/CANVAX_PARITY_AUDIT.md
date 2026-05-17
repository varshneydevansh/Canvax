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
| Simple everyday Workbench | Partial / stronger local | Workbench focus modes, bottom rail, composer, tray collapse, quick prompts, `More actions` disclosure in `web/index.html` and `web/app.js`; docs in `docs/USAGE.md` and `docs/FEATURES.md`; browser self-test covers Workbench controls. | Still needs manual design review for first-time designers and fewer visible advanced concepts in default sessions. |
| Unified Workbench / Advanced experience | Partial / stronger local | Shared dark workspace language, solid sticky Advanced command deck, collapsed Workbench context summary, shared Frame/Map/Preview data model, and a visible mode guide that maps Workbench to `Sketch` / `Talk` / `Make / Apply` and Advanced to `Project rail` / `Canvas deck` / `Handoff inspector`; docs explain mode boundary. | Advanced is still denser by design and still needs manual design review, but the shared hierarchy is now clearer. |
| True infinite spatial canvas | Partial / stronger local | Workbench `Map`, bounded internal map viewport, `Tidy map`, pan/zoom, minimap click-to-pan navigator, `spatialWorkspace.viewport` export, `Fit map` recovery, left/top edge expansion, trailing workspace room, frame cards, variant cards, spatial objects, selection-created group regions, selecting group contents, fitting group bounds, ungrouping, front/back layer ordering, output/history lane earlier/later ordering, collapsible output shelf lane, object focus filtering, object pinning, object locking against accidental transform/reorder/duplicate/delete, selected-object and multi-selected-object actions, single-object Title/Note/Status/Prompt editing and per-type read-only details, selected-object `spatialContext` in task/image/rewrite/build handoffs, Shift-drag Map lasso selection, selected-set dragging/resizing with a combined transform box, group movement that skips locked child objects, selected group contents inspection, group duplication of unlocked contained objects, collapsible checkpoint history lane export, lock/layer/lane/context export in `web/app.js`; docs in `docs/STITCH_GAP_ROADMAP.md`. | Not a full arbitrary-object infinite canvas yet: no rich nested group editing, no inertial canvas feel, only output/history lane ordering rather than deeper multi-lane/timeline editing, and no structured deep per-type inspectors. |
| Generated variants as editable canvas objects | Strong local | `Create variants`, variant branch cards, matching `variant-branch` Map objects, `Use variant` directly in Map, `Edit as frame` output-preview branches, primary-state export through `spatialWorkspace.variantBranches`, `spatialWorkspace.variantBranches[].outputBinding`, task/rewrite/build `outputEditBinding`, and `spatialWorkspace.objects`; self-test covers variant creation, object rendering/export, Map action, output-preview to editable frame creation, promotion, export, and request binding. | Still not a semantic AI variant generator with a full per-property style inspector, but variants and output-edit branches are now editable spatial objects in the local Map. |
| Codex-built real app/screen generation with manifest binding | Partial / strong local | `Build with Codex` request, deterministic local executor, implementation bundle, frame-to-code ownership map, `artifacts/canvax/codex-output.json`, preview manifest binding, and `Edit as frame` from generated output preview to an `Output edit` frame preserving the generated target through request/executor `outputEditBinding`; `npm run e2e-workflow` verifies rough frame to build/rewrite manifest chain. | Real production implementation still depends on Codex acting on the request; local executor is a smoke/scaffold path, not a high-fidelity production generator. |
| Local semantic screen generation | Partial / stronger local | `Generate screen` creates polished local HTML from both rectangle-heavy wireframes and stroke-first sketches with arrows, ovals, image slots, and labels; browser self-test verifies the stroke-first path. | This is deterministic local rendering, not hosted AI design generation, and it does not replace a real production implementation pass. |
| Live sketch-and-voice rewrite loop | Partial / stronger local | Voice segments, transcript bridge, Apply/Live rewrite, rewrite request, local rewrite executor, output annotations with normalized changed-region bounds, output eraser deletion semantics, affected-region to component-target mapping, checkpoints, e2e workflow proof, and future host bridge boundary in `docs/CHATGPT_APP_BRIDGE.md`. | Not a continuous first-party Codex live co-edit loop; native Codex microphone and live ChatGPT/Codex host bridge require first-party integration. |
| Richer image / asset candidate handling | Partial / stronger local | `Image pack`, `canvax-style-lock`, placement-map asset candidates, output slots, asset candidate tray, editable pasted/dropped images, file attach, workspace-path attach, thumbnails, accept/review state, Map asset objects, Copy context, per-object `contextMarkdown`, future host image handoff tools in `docs/CHATGPT_APP_BRIDGE.md`; no API key required. | Direct ChatGPT image generation / image editing is not available from localhost without host bridge; candidate review is local and prompt-based. |
| Documentation proving workflow | Strong | `README.md`, `docs/USAGE.md`, `docs/FEATURES.md`, `docs/ARCHITECTURE.md`, `docs/CHATGPT_APP_BRIDGE.md`, `docs/EXECUTION_STATUS.md`, `docs/STITCH_GAP_ROADMAP.md`, `canvax-stitch-like-workbench-plan.md`, this audit. | Keep docs synchronized as features change; add screenshots/short walkthrough once UI stabilizes. |
| Tests proving rough sketch to real output, no paid API keys | Strong for local workflow | `npm run check`, `npm run regression`, `npm run e2e-workflow`, browser self-tests, service lifecycle tests, responsive snapshots. | Tests prove the local no-API pipeline and deterministic executors, not a hosted first-party ChatGPT image/Codex live surface. |
| No paid API key requirement | Strong | Export packs include `requiresOpenAiApiKey: false`; docs state host-driven/no-API boundary; tests validate no-API task/image/build/rewrite paths. | Future host image generation must remain optional and must not introduce an API-key dependency. |

## Prompt-To-Artifact Checklist

This checklist maps each explicit goal phrase to concrete repo artifacts and
verification gates. It is the source of truth before claiming the goal is done.

| Goal phrase | Required artifact / behavior | Current evidence | Gate before completion |
| --- | --- | --- | --- |
| Designer-first Codex visual workbench | Default Workbench with sketch, voice/manual note, Make/Apply, Preview/Map focus, and no required Advanced panels for normal work | `web/index.html`, `web/app.js`, `web/styles.css`, `docs/USAGE.md`; browser self-test covers Workbench controls | Manual visual review must confirm the first-use surface is still not overwhelming |
| Simpler than Stitch for everyday use | Canvas-first mode, quick prompt chips, collapsed tray, bottom rail, readable output cards, no API setup | `docs/EXECUTION_STATUS.md` Sprint 1; responsive smoke screenshots under `artifacts/canvax/browser-snapshots/latest/` | Add a short designer walkthrough and compare screenshots after final UI pass |
| More powerful for real implementation | Build/rewrite requests, local executors, component map, manifest publishing, output cards, Preview binding | `scripts/execute-build-request.mjs`, `scripts/execute-rewrite-request.mjs`, `scripts/write-codex-output.mjs`, `artifacts/canvax/codex-output.json`; `npm run e2e-workflow` | Real production app edits still depend on Codex acting on the request, so this is not complete as a fully autonomous app builder |
| Unified Workbench / Advanced experience | Shared visual language and data model, Advanced as inspector/debug layer, Workbench as default, visible role guide for both modes | `web/index.html`, `web/app.js`, `web/styles.css`, `docs/STITCH_GAP_ROADMAP.md`, `canvax-stitch-like-workbench-plan.md`; browser self-test covers mode guide rendering | Advanced still needs manual design review so the denser inspector does not feel like a separate product |
| True infinite spatial canvas | Map pan/zoom, bounded internal viewport, `Tidy map`, minimap click-to-pan navigator, viewed-region export through `spatialWorkspace.viewport`, `Fit map` recovery, edge expansion, trailing room, lasso, multi-select, selection-created groups, selecting group contents, fitting group bounds, ungrouping, spatial objects, front/back object layering, output/history lane earlier/later ordering, collapsible output shelf lane, object pinning, object locking, lightweight object Title/Note/Status/Prompt editing and per-type details, object focus filtering, collapsible checkpoint history lane, lock/layer/lane/context export | `web/app.js` `computeFlowSurfaceSize`, `ensureFlowWorkspaceMargin`, `renderFlowNavigator`, `onFlowNavigatorPointerDown`, `buildSpatialViewportExport`, `fitFlowMapToContent`, `buildSpatialWorkspaceExport`; browser self-test and docs | Still missing richer nested group editing, structured deep per-type object inspectors, deeper multi-lane/timeline editing, and inertial canvas feel |
| Generated variants as editable canvas objects | Variant branch frames and matching `variant-branch` Map objects with `Use variant`, primary state, `Output edit` branches created from output preview cards, and explicit `outputEditBinding` in task/rewrite/build handoffs | `web/app.js`, live export `spatialWorkspace.variantBranches`, browser self-test | Semantic AI variant generation and property-level style inspection remain future work |
| Codex-built real app/screen generation with manifest binding | Build request, local executor, preview artifact, implementation bundle, frame-to-code map, Codex output manifest, editable output branch creation from a generated target, and request/executor target binding | `exports/canvax-build-real-latest.json`, `scripts/execute-build-request.mjs`, `scripts/execute-rewrite-request.mjs`, `web/app.js`, `npm run e2e-workflow` | High-fidelity production code generation is not proven by the deterministic smoke scaffold |
| Live sketch-and-voice rewrite loop | Voice export, transcript bridge, rewrite request, Apply/Live rewrite, output correction bounds, output eraser deletion semantics, changed region/component targeting, checkpoints | `exports/canvax-voice-latest.md`, `exports/canvax-rewrite-request-latest.json`, `scripts/execute-rewrite-request.mjs`, browser self-test, e2e rewrite proof | Continuous first-party Codex co-edit while sketching remains blocked on host integration |
| Rich image/asset candidate handling | Image prompt pack, style-lock block, placement-map asset candidates, output slots, local file/path attach, accept/review, Map asset objects | `exports/canvax-image-prompt-pack-latest.json`, `exports/canvax-asset-candidates-latest.json`, `web/app.js`, endpoint regression and browser self-test | Direct ChatGPT image generation/editing remains host-provided, not localhost-provided |
| Documentation/tests proving full rough-sketch-to-real-output workflow | Usage, features, architecture, ChatGPT/Codex bridge boundary, roadmap, execution status, audit, e2e workflow, browser regression | `README.md`, `docs/*.md`, `npm run check`, `npm run regression`, `npm run e2e-workflow` | Keep docs synchronized after every feature chunk |
| End to end without requiring paid API keys | All local requests/packs mark `requiresOpenAiApiKey: false`; no app flow requires `OPENAI_API_KEY` | Regression and e2e checks validate no-API paths; docs state host-capability boundary | Future adapters must stay optional and cannot become a core requirement |

## Latest Verification

Verified locally on May 18, 2026 after the Workbench focus wording, ChatGPT/App bridge documentation, and atomic latest-handoff write hardening passes:

```text
npm run check      -> pass
npm run regression -> pass
npm run e2e-workflow -> pass through npm run regression
```

The regression run includes service lifecycle checks, the no-API e2e workflow,
board browser self-test with 91 assertions, Preview browser self-test with 16
assertions, responsive board/Preview screenshots at 1440, 1024, 768, and 430
pixel widths, plus the Map viewport/tidy, lane-order, object prompt/context,
compact spatial-context assertions, opt-in materialized review overlays, and
latest handoff schema validation.

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
- stronger default-designer UX simplification across Workbench and Advanced

## Gate Commands

Run these before claiming a parity milestone:

```bash
npm run check
npm run regression
npm run e2e-workflow
```

For UI review, inspect the latest browser snapshot index:

```text
artifacts/canvax/browser-snapshots/latest/index.json
```
