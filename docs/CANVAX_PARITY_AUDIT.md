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
| Simple everyday Workbench | Partial / strong | Workbench focus modes, bottom rail, composer, tray collapse, quick prompts in `web/index.html` and `web/app.js`; docs in `docs/USAGE.md` and `docs/FEATURES.md`; browser self-test covers Workbench controls. | Still needs more visual simplification for first-time designers and fewer visible advanced concepts in default sessions. |
| Unified Workbench / Advanced experience | Partial | Shared dark workspace language, sticky Advanced deck, shared Frame/Map/Preview data model in `web/app.js` and `web/styles.css`; docs explain mode boundary. | Advanced still feels denser and can diverge from Workbench mental model; needs a tighter shared navigation/information hierarchy. |
| True infinite spatial canvas | Partial | Workbench `Map`, pan/zoom, frame cards, variant cards, spatial objects, selected-object and multi-selected-object actions, Shift-drag Map lasso selection, selected-set dragging/resizing with a combined transform box, group movement, selected group contents inspection, group duplication, context export in `web/app.js`; docs in `docs/STITCH_GAP_ROADMAP.md`. | Not a full arbitrary-object infinite canvas yet: no rich nested group editing, no inertial canvas feel, no history lanes. |
| Generated variants as editable canvas objects | Partial / strong | `Create variants`, variant branch cards, `Use variant` directly in Map, primary-state export through `spatialWorkspace.variantBranches`; self-test covers variant creation, Map action, promotion, and export. | Variants are still frame cards rather than fully free spatial objects with object-level style/property controls. |
| Codex-built real app/screen generation with manifest binding | Partial / strong local | `Build with Codex` request, deterministic local executor, implementation bundle, frame-to-code ownership map, `artifacts/canvax/codex-output.json`, preview manifest binding; `npm run e2e-workflow` verifies rough frame to build/rewrite manifest chain. | Real production implementation still depends on Codex acting on the request; local executor is a smoke/scaffold path, not a high-fidelity production generator. |
| Live sketch-and-voice rewrite loop | Partial / stronger local | Voice segments, transcript bridge, Apply/Live rewrite, rewrite request, local rewrite executor, output annotations, affected-region to component-target mapping, checkpoints, e2e workflow proof. | Not a continuous first-party Codex live co-edit loop; native Codex microphone and live ChatGPT/Codex host bridge require first-party integration. |
| Richer image / asset candidate handling | Partial / strong local | `Image pack`, asset candidate tray, editable pasted/dropped images, Map asset objects, Copy context, per-object `contextMarkdown`; no API key required. | Direct ChatGPT image generation / image editing is not available from localhost without host bridge; candidate review is local and prompt-based. |
| Documentation proving workflow | Strong | `README.md`, `docs/USAGE.md`, `docs/FEATURES.md`, `docs/ARCHITECTURE.md`, `docs/EXECUTION_STATUS.md`, `docs/STITCH_GAP_ROADMAP.md`, `canvax-stitch-like-workbench-plan.md`, this audit. | Keep docs synchronized as features change; add screenshots/short walkthrough once UI stabilizes. |
| Tests proving rough sketch to real output, no paid API keys | Strong for local workflow | `npm run check`, `npm run regression`, `npm run e2e-workflow`, browser self-tests, service lifecycle tests, responsive snapshots. | Tests prove the local no-API pipeline and deterministic executors, not a hosted first-party ChatGPT image/Codex live surface. |
| No paid API key requirement | Strong | Export packs include `requiresOpenAiApiKey: false`; docs state host-driven/no-API boundary; tests validate no-API task/image/build/rewrite paths. | Future host image generation must remain optional and must not introduce an API-key dependency. |

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
