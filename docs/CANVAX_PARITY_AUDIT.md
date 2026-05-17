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
| Unified Workbench / Advanced experience | Partial | Shared dark workspace language, sticky Advanced deck, shared Frame/Map/Preview data model in `web/app.js` and `web/styles.css`; docs explain mode boundary. | Advanced still feels denser and can diverge from Workbench mental model; needs a tighter shared navigation/information hierarchy. |
| True infinite spatial canvas | Partial / stronger local | Workbench `Map`, pan/zoom, left/top edge expansion, trailing workspace room, frame cards, variant cards, spatial objects, selected-object and multi-selected-object actions, Shift-drag Map lasso selection, selected-set dragging/resizing with a combined transform box, group movement, selected group contents inspection, group duplication, context export in `web/app.js`; docs in `docs/STITCH_GAP_ROADMAP.md`. | Not a full arbitrary-object infinite canvas yet: no rich nested group editing, no inertial canvas feel, no history lanes. |
| Generated variants as editable canvas objects | Strong local | `Create variants`, variant branch cards, matching `variant-branch` Map objects, `Use variant` directly in Map, primary-state export through `spatialWorkspace.variantBranches` and `spatialWorkspace.objects`; self-test covers variant creation, object rendering/export, Map action, promotion, and export. | Still not a semantic AI variant generator with a full per-property style inspector, but variants are now editable spatial objects in the local Map. |
| Codex-built real app/screen generation with manifest binding | Partial / strong local | `Build with Codex` request, deterministic local executor, implementation bundle, frame-to-code ownership map, `artifacts/canvax/codex-output.json`, preview manifest binding; `npm run e2e-workflow` verifies rough frame to build/rewrite manifest chain. | Real production implementation still depends on Codex acting on the request; local executor is a smoke/scaffold path, not a high-fidelity production generator. |
| Live sketch-and-voice rewrite loop | Partial / stronger local | Voice segments, transcript bridge, Apply/Live rewrite, rewrite request, local rewrite executor, output annotations, affected-region to component-target mapping, checkpoints, e2e workflow proof. | Not a continuous first-party Codex live co-edit loop; native Codex microphone and live ChatGPT/Codex host bridge require first-party integration. |
| Richer image / asset candidate handling | Partial / strong local | `Image pack`, placement-map asset candidates, output slots, asset candidate tray, editable pasted/dropped images, Map asset objects, Copy context, per-object `contextMarkdown`; no API key required. | Direct ChatGPT image generation / image editing is not available from localhost without host bridge; candidate review is local and prompt-based. |
| Documentation proving workflow | Strong | `README.md`, `docs/USAGE.md`, `docs/FEATURES.md`, `docs/ARCHITECTURE.md`, `docs/EXECUTION_STATUS.md`, `docs/STITCH_GAP_ROADMAP.md`, `canvax-stitch-like-workbench-plan.md`, this audit. | Keep docs synchronized as features change; add screenshots/short walkthrough once UI stabilizes. |
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
| Unified Workbench / Advanced experience | Shared visual language and data model, Advanced as inspector/debug layer, Workbench as default | `web/styles.css`, `docs/STITCH_GAP_ROADMAP.md`, `canvax-stitch-like-workbench-plan.md` | Advanced still needs tighter information hierarchy and should not feel like a separate product |
| True infinite spatial canvas | Map pan/zoom, edge expansion, trailing room, lasso, multi-select, groups, spatial objects, context export | `web/app.js` `computeFlowSurfaceSize`, `ensureFlowWorkspaceMargin`, `buildSpatialWorkspaceExport`; browser self-test and docs | Still missing richer nested group editing, history lanes, and inertial canvas feel |
| Generated variants as editable canvas objects | Variant branch frames and matching `variant-branch` Map objects with `Use variant` and primary state | `web/app.js`, live export `spatialWorkspace.variantBranches`, browser self-test | Semantic AI variant generation and property-level style inspection remain future work |
| Codex-built real app/screen generation with manifest binding | Build request, local executor, preview artifact, implementation bundle, frame-to-code map, Codex output manifest | `exports/canvax-build-real-latest.json`, `scripts/execute-build-request.mjs`, `npm run e2e-workflow` | High-fidelity production code generation is not proven by the deterministic smoke scaffold |
| Live sketch-and-voice rewrite loop | Voice export, transcript bridge, rewrite request, Apply/Live rewrite, changed region/component targeting, checkpoints | `exports/canvax-voice-latest.md`, `exports/canvax-rewrite-request-latest.json`, `scripts/execute-rewrite-request.mjs`, e2e rewrite proof | Continuous first-party Codex co-edit while sketching remains blocked on host integration |
| Rich image/asset candidate handling | Image prompt pack, placement-map asset candidates, output slots, local attach/accept/review, Map asset objects | `exports/canvax-image-prompt-pack-latest.json`, `exports/canvax-asset-candidates-latest.json`, `web/app.js`, endpoint regression | Direct ChatGPT image generation/editing remains host-provided, not localhost-provided |
| Documentation/tests proving full rough-sketch-to-real-output workflow | Usage, features, architecture, roadmap, execution status, audit, e2e workflow, browser regression | `README.md`, `docs/*.md`, `npm run check`, `npm run regression`, `npm run e2e-workflow` | Keep docs synchronized after every feature chunk |
| End to end without requiring paid API keys | All local requests/packs mark `requiresOpenAiApiKey: false`; no app flow requires `OPENAI_API_KEY` | Regression and e2e checks validate no-API paths; docs state host-capability boundary | Future adapters must stay optional and cannot become a core requirement |

## Latest Verification

Verified locally on May 17, 2026 after the spatial edge-expansion pass:

```text
npm run check      -> pass
npm run regression -> pass
```

The regression run includes service lifecycle checks, the no-API e2e workflow,
board/Preview browser self-tests, and responsive board/Preview screenshots at
1440, 1024, 768, and 430 pixel widths.

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
