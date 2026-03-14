# Canvax Execution Status

Updated: March 14, 2026

This file tracks what is actually implemented from `canvax-live-collaboration-plan.md` so work does not drift between chat turns.

## Sprint Status

### Sprint 1: Stabilize the collaboration surface

Status: In progress

- [x] Generic canvas direction instead of hero-section-specific framing
- [x] Frame view and Flow view both exist
- [x] Core drawing tools, labels, grouping, flow links, captures, help
- [x] Separate preview button in the main board
- [x] Visible single-selection delete action
- [x] Preview follows the active frame viewport more closely
- [ ] Formal versioned session schema
- [ ] Full interaction regression pass with browser validation
- [ ] Remaining rough edges in large-session behavior

### Sprint 2: Add voice as a native Canvax input

Status: In progress

- [x] Dictation UI in Canvax
- [x] Transcript capture pipeline
- [x] Transcript-to-handoff structuring
- [ ] Checkpoint rules for sketch + voice handoff

### Sprint 3: Build the live Codex collaboration loop

Status: Started

- [x] Live exports under `exports/`
- [x] Preview window route and preview-state endpoint
- [x] Live board-to-preview session mirroring path
- [x] Preview manifest save/load path
- [x] Preview manifest now supports richer targets, artifacts, and changed-file metadata
- [x] Canonical Codex-output manifest path and writer CLI
- [ ] Session event log
- [ ] Artifact manifest written automatically by Codex workflow
- [x] Artifact inbox in the main board
- [x] Automatic preview target binding from Codex-written artifacts

### Sprint 4: Add a preview surface for what Codex builds

Status: In progress

- [x] `Preview` button opens a separate window/tab
- [x] Preview shows sketch and generated surface in a viewport-matched compare layout
- [x] Preview can follow the active frame
- [x] Manual local preview URL attachment
- [x] Persisted generated preview binding through the preview manifest
- [x] Preview now surfaces connected target details, generated artifacts, and changed files
- [x] Automatic generated preview resolution from Codex-produced HTML artifact entries
- [x] Live compare affordances for generated files, compare modes, and frame-aware manifest highlighting
- [x] Preview snapshot workflows
- [x] First `Materialize` action that writes a styled local HTML preview artifact from the active frame
- [x] Rematerialize now reuses a stable per-frame artifact path and refreshes preview via versioned URLs
- [x] Preview target resolution now prefers the currently selected frame when multiple generated targets exist

### Sprint 5: Prepare for a richer Codex client future

Status: Not started

- [ ] Transport abstraction for current local mode vs future App Server mode
- [ ] Upstream proposal assets
- [ ] Demo script and feature matrix

## Current Priority Tasks

These are the next tasks to keep executing in order:

1. Let Codex write generated preview manifests automatically as part of the implementation workflow.
2. Improve Materialize so generated surfaces can be refined iteratively and compared against changed regions more precisely.
3. Formalize the session event log and richer sketch + voice checkpoint history.
4. Finish the formal versioned session schema.
5. Complete the broader browser regression pass for large-session behavior.

## Notes

- Today the preview is no longer only export-driven, preview targets can persist through the manifest with richer artifact/change metadata, HTML preview artifacts can auto-resolve as generated targets, Codex-written output manifests can bind preview targets automatically, the preview has frame-aware compare modes for generated files, compare checkpoints can now be saved into the workspace, a first deterministic Materialize loop can now generate a styled local preview artifact from the active frame, and board-side voice notes now flow into the live JSON export, prompt markdown, and a dedicated `exports/canvax-voice-latest.md` handoff file.
- The current Materialize loop is intentionally local and deterministic. It now reuses a stable per-frame artifact path and exposes freshness metadata so Preview can tell when the sketch is newer than the generated surface. The richer “Codex rewrites the generated surface live while you keep sketching” loop is still the next layer, not the current state.
