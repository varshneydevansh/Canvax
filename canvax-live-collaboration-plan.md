# Plan: Canvax Live Collaboration Surface

**Generated**: March 13, 2026
**Estimated Complexity**: High

## Overview

This plan turns Canvax from a strong local sketch pad into a full live collaboration surface for Codex: persistent scratch canvas, multimodal input (drawing + voice dictation + notes), richer live exports, and an implementation preview loop that lets Codex react to evolving sketches without forcing the user to translate everything into text first.

The core product decision in this plan is:

- Keep the current **local companion app + Codex skill** architecture for near-term delivery.
- Treat **voice dictation as a Canvax-native capability**, not as something borrowed from the Codex app chat input.
- Add a **preview/runtime window** opened from Canvax as a first-class optional surface for generated implementations.
- Preserve the current lightweight live export flow, but extend it into a durable session model with structured events and artifacts.
- Keep the **core collaboration loop free of any separate paid OpenAI API requirement** beyond the user already having Codex access through their ChatGPT plan.

## Recommended Live Collaboration Loop

The right behavior is not “borrow the Codex chat microphone button and hope Canvax can see it.” The safer and more complete model is:

1. User opens `/canvax` and starts sketching on a free canvas or frame-based flow.
2. User starts **Canvax dictation** while continuing to draw.
3. Canvax timestamps:
   - active frame
   - current tool state
   - autosnaps and manual freeze captures
   - transcript segments as they arrive
4. Every idle gap or explicit freeze produces a session checkpoint, not just an image snapshot.
5. Codex reads the latest combined session state:
   - current canvas/frame graph
   - captures
   - transcript
   - notes
   - existing generated artifacts
6. Codex writes back outputs in known locations:
   - implementation notes
   - markdown spec
   - changed file manifest
   - preview outputs
7. Canvax exposes a `Preview` action that opens a dedicated browser tab/window for generated output so the user can compare sketch, spoken intent, and implementation without crowding the input board.

This means the experience should support three useful operating modes:

- `Sketch only`: fast scratchpad with live export.
- `Sketch + dictate`: rough drawing plus thinking aloud.
- `Sketch + dictate + preview window`: full live collaboration loop where Canvax launches a dedicated output surface for what Codex produced.

## Preview Model

The preview should not take over the main Canvax drawing surface.

The recommended interaction is:

1. The main Canvax window stays optimized for sketching, notes, flow, and capture.
2. A visible `Preview` button opens a separate browser tab or window.
3. That preview surface reads the latest artifact manifest and local preview targets.
4. The preview surface can refresh independently while the user keeps sketching in the main board.

This is the right tradeoff because:

- the sketch UI stays focused and uncluttered
- implementation output can use more space without squeezing tools or inspector controls
- users can place the preview on another monitor or alongside the board
- the architecture still works with the current local companion-app shape

The existing Codex chat dictation button can still be used manually in conversation, but this plan should **not** depend on it as the system integration point because there is no documented surface that exposes that live voice stream to a local Canvax skill or board.

For voice input, the zero-extra-API baseline should be:

- browser or OS-level speech recognition when available
- a transcript field that works with macOS system dictation
- manual pasted transcript as fallback

This is sufficient for the core “draw + think aloud + let Codex read the latest state” workflow.

True sketch-to-image generation like dedicated image apps is a different product layer. It should be treated as optional because it likely requires either:

- a separate model/API-backed image generation surface, or
- a local model runtime with significantly higher implementation complexity

For Canvax, the first preview worth building is a **live implementation/spec preview**, not a raster image renderer.

This approach matches the current repo and current documented Codex surfaces:

- Codex skills and slash surfaces are documented, but not a native embedded arbitrary drawing widget inside the first-party app.
- App Server is the documented path for building a richer custom Codex client later.
- Codex usage under a ChatGPT plan is separate from Voice feature limits.
- ChatGPT macOS voice was retired effective January 15, 2026, so relying on a macOS ChatGPT voice surface as the voice path for Canvax is not a safe foundation.

Sources for these assumptions:

- [Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)
- [Unlocking the Codex harness: how we built the App Server](https://openai.com/index/unlocking-the-codex-harness/)
- [Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/)
- [ChatGPT release notes: Voice on macOS desktop app is retiring](https://help.openai.com/en/articles/6825453-chatgpt-accessibility)

## Prerequisites

- Existing Canvax repo structure:
  - [web/index.html](/Users/devanshvarshney/Canvax/web/index.html)
  - [web/app.js](/Users/devanshvarshney/Canvax/web/app.js)
  - [web/styles.css](/Users/devanshvarshney/Canvax/web/styles.css)
  - [scripts/canvax.mjs](/Users/devanshvarshney/Canvax/scripts/canvax.mjs)
  - [codex-skill/canvax/SKILL.md](/Users/devanshvarshney/Canvax/codex-skill/canvax/SKILL.md)
- Current single-service architecture at `http://localhost:3210`
- No assumption of a private embedded Codex desktop extension API
- Browser APIs available on macOS:
  - Pointer events
  - Clipboard
  - Local audio capture
  - Optional speech recognition where supported
- Optional future dependency review if a stronger transcription path is chosen

## Assumptions

- In scope:
  - Local web surface on macOS as primary support
  - Live structured exports that Codex can read immediately
  - Voice dictation inside Canvax itself
  - Separate preview window/tab for generated UI/code output
  - Better persistence, replay, and traceability of user intent
  - Zero-extra-API operation for the core sketch + voice + Codex loop
- Out of scope for the first implementation:
  - Deep first-party Codex desktop embedding inside the native composer
  - Cross-user realtime collaboration over networked shared sessions
  - Full Figma parity
  - OS-wide freehand drawing over the whole desktop
  - AI raster image rendering as a required part of the core loop
- Recommended default save strategy:
  - `exports/canvax-live-latest.json`
  - `exports/canvax-live-latest.md`
  - `exports/canvax-session-events.jsonl`
  - `exports/canvax-voice-latest.md`
  - `exports/canvax-preview-manifest.json`
  - `artifacts/preview/` for generated previews and snapshots
  - `exports/canvax-checkpoint-latest.json` for the latest merged sketch + voice + capture checkpoint

## Sprint 1: Stabilize the Collaboration Surface
**Goal**: Make the current canvas feel complete and mode-correct before adding new modalities.
**Demo/Validation**:
- Launch `./canvax --open`
- Verify Frame view and Flow view have distinct controls and guidance
- Verify select, lasso, group, duplicate, copy/paste, pan/zoom, captures, and help all work without broken state

### Task 1.1: Introduce explicit canvas session schema
- **Location**:
  - [web/app.js](/Users/devanshvarshney/Canvax/web/app.js)
  - [scripts/canvax.mjs](/Users/devanshvarshney/Canvax/scripts/canvax.mjs)
- **Description**: Replace ad hoc persisted view state with a formal session document that tracks frames, elements, links, captures, transcript segments, preview outputs, and event metadata.
- **Complexity**: 6
- **Dependencies**: None
- **Acceptance Criteria**:
  - Session state has a versioned schema
  - Migration path exists from current localStorage/export format
  - Future dictation and preview artifacts fit without schema churn
- **Validation**:
  - Load old saved state and verify migration
  - Save new export and inspect JSON keys

### Task 1.2: Normalize frame-only vs flow-only controls
- **Location**:
  - [web/index.html](/Users/devanshvarshney/Canvax/web/index.html)
  - [web/styles.css](/Users/devanshvarshney/Canvax/web/styles.css)
  - [web/app.js](/Users/devanshvarshney/Canvax/web/app.js)
- **Description**: Fully split toolbar/state affordances between frame work and flow work so the UI stops feeling like one mode wearing another mode’s clothes.
- **Complexity**: 5
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Frame view exposes drawing, zoom, underlay, label, selection controls
  - Flow view exposes only flow controls and flow-specific status
  - Help content mirrors the separation
- **Validation**:
  - Manual mode toggle sweep
  - Screenshot inspection at desktop and narrow widths

### Task 1.3: Finish interaction completeness pass
- **Location**:
  - [web/app.js](/Users/devanshvarshney/Canvax/web/app.js)
  - [web/styles.css](/Users/devanshvarshney/Canvax/web/styles.css)
- **Description**: Close the remaining rough edges in selection, group resize, clipboard behavior, pan/zoom bounds, label attachment updates, and capture management.
- **Complexity**: 7
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Multi-selection resize behaves consistently
  - Copy/paste preserves groups and attached labels
  - Pan/zoom does not break pointer mapping
  - Capture delete/clear updates thumbnails and exports correctly
- **Validation**:
  - Expand browser self-test coverage
  - Manual regression checklist for all tools

## Sprint 2: Add Voice as a Native Canvax Input
**Goal**: Let users sketch and think out loud at the same time, with voice preserved as structured design intent.
**Demo/Validation**:
- Open Canvax, start dictation, sketch while speaking, stop dictation
- Verify transcript is attached to current frame/session and saved to exports
- Ask Codex to use latest Canvax and confirm it can read both sketch and transcript context

### Task 2.1: Design the dictation UX
- **Location**:
  - [web/index.html](/Users/devanshvarshney/Canvax/web/index.html)
  - [web/styles.css](/Users/devanshvarshney/Canvax/web/styles.css)
- **Description**: Add a visible dictation control strip with record state, transcript status, and frame/session attachment mode.
- **Complexity**: 5
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - Dictation can target current frame or whole session
  - UI communicates recording, paused, error, and finalizing states
  - Transcript view is readable and non-invasive
- **Validation**:
  - Manual UX walkthrough on desktop and smaller widths

### Task 2.2: Implement transcript capture pipeline
- **Location**:
  - [web/app.js](/Users/devanshvarshney/Canvax/web/app.js)
  - [scripts/canvax.mjs](/Users/devanshvarshney/Canvax/scripts/canvax.mjs)
- **Description**: Add browser-side dictation ingestion with provider abstraction so Canvax can support:
  - browser speech recognition when available
  - pasted/system dictation text as fallback
  - future transcription provider without redesign
  - checkpointing transcript segments against active frame and latest capture boundary
- **Complexity**: 8
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Transcript segments store timestamps, frame linkage, and raw/final text
  - Partial transcript updates do not corrupt autosave
  - Provider failures degrade cleanly to manual fallback
  - Each freeze/autosnap can be correlated with the speech that happened around it
- **Validation**:
  - Mock provider tests
  - Manual recording simulation and export inspection

### Task 2.4: Define checkpoint rules for dynamic Codex handoff
- **Location**:
  - [web/app.js](/Users/devanshvarshney/Canvax/web/app.js)
  - [scripts/canvax.mjs](/Users/devanshvarshney/Canvax/scripts/canvax.mjs)
- **Description**: Formalize when Canvax should emit a new “latest handoff checkpoint” for Codex to consume:
  - idle after drawing
  - manual freeze
  - dictation stop
  - optional “push current thinking to Codex” action
- **Complexity**: 6
- **Dependencies**: Task 2.2, Task 2.3
- **Acceptance Criteria**:
  - Checkpoints merge latest frame graph, captures, and transcript summary
  - Handoff generation does not require the user to manually describe what changed
  - The latest checkpoint is durable across board refreshes
- **Validation**:
  - Manual mixed sketch + dictation run
  - Inspect `exports/canvax-checkpoint-latest.json`

### Task 2.3: Make transcript semantically useful for Codex
- **Location**:
  - [web/app.js](/Users/devanshvarshney/Canvax/web/app.js)
  - [scripts/canvax.mjs](/Users/devanshvarshney/Canvax/scripts/canvax.mjs)
  - [codex-skill/canvax/SKILL.md](/Users/devanshvarshney/Canvax/codex-skill/canvax/SKILL.md)
- **Description**: Convert transcript segments into structured handoff content:
  - frame commentary
  - implementation constraints
  - asset notes
  - explicit “thinking aloud” annotations
- **Complexity**: 6
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - Live markdown and JSON exports include transcript sections
  - Transcript can be filtered by frame
  - Codex skill guidance instructs the agent to use transcript as primary intent source alongside sketch
- **Validation**:
  - Export fixture review
  - Prompt quality review against sample spoken sessions

## Sprint 3: Build the Live Codex Collaboration Loop
**Goal**: Make Canvax feel connected to Codex as an active collaborator, not just a file drop.
**Demo/Validation**:
- Draw, speak, save, ask Codex to continue
- Watch Canvax reflect code/spec outputs generated in the workspace
- Verify artifacts remain navigable after reopening the board

### Task 3.1: Add session event log and artifact manifest
- **Location**:
  - [scripts/canvax.mjs](/Users/devanshvarshney/Canvax/scripts/canvax.mjs)
  - new file: `/Users/devanshvarshney/Canvax/exports/canvax-session-events.jsonl`
  - new file: `/Users/devanshvarshney/Canvax/exports/canvax-preview-manifest.json`
- **Description**: Persist a replayable event stream for user input, captures, transcript updates, preview builds, and Codex-written artifacts.
- **Complexity**: 7
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - Every significant user or preview event writes a compact event entry
  - Manifest points to latest markdown, json, preview, transcript, and code outputs
  - Reopening Canvax reconstructs the latest collaboration state
  - Checkpoint events clearly indicate what Codex should consume next
- **Validation**:
  - Event log replay test
  - Manual reopen scenario

### Task 3.2: Define a Codex artifact inbox inside Canvax
- **Location**:
  - [web/index.html](/Users/devanshvarshney/Canvax/web/index.html)
  - [web/app.js](/Users/devanshvarshney/Canvax/web/app.js)
  - [scripts/canvax.mjs](/Users/devanshvarshney/Canvax/scripts/canvax.mjs)
- **Description**: Add a panel showing Codex outputs produced from the canvas:
  - latest implementation notes
  - generated spec markdown
  - changed files
  - preview launch links
- **Complexity**: 8
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Canvax can read a manifest of generated files from the workspace
  - User can see “what Codex changed” without leaving the board
  - Latest markdown output is visible in-app
- **Validation**:
  - Create sample artifacts and verify rendering
  - Reopen app and confirm persistence

### Task 3.3: Make the skill speak the live-collaboration model
- **Location**:
  - [codex-skill/canvax/SKILL.md](/Users/devanshvarshney/Canvax/codex-skill/canvax/SKILL.md)
  - [README.md](/Users/devanshvarshney/Canvax/README.md)
- **Description**: Update skill and docs so the mental model becomes:
  - `/canvax` attaches the thread to a live multimodal session
  - Codex should read sketch, transcript, and artifact manifest together
  - Codex should write outputs back into a known artifact location
- **Complexity**: 4
- **Dependencies**: Task 3.1, Task 3.2
- **Acceptance Criteria**:
  - Documentation is explicit about input/output paths
  - Skill tells Codex where to look and where to write back
  - No extra file-path repetition required in the chat loop
- **Validation**:
  - Readme walkthrough review
  - Sample skill invocation review

## Sprint 4: Add a Preview Surface for What Codex Builds
**Goal**: Let users compare rough sketch against generated implementation or spec output without disrupting the main Canvax input UI.
**Demo/Validation**:
- Draw a rough screen
- Ask Codex to implement it
- Click `Preview`
- View the output in a dedicated browser tab/window while keeping the sketch board unchanged

### Task 4.1: Add preview launch button and dedicated preview page
- **Location**:
  - [web/index.html](/Users/devanshvarshney/Canvax/web/index.html)
  - [web/styles.css](/Users/devanshvarshney/Canvax/web/styles.css)
- **Description**: Add a `Preview` action in Canvax that opens a separate browser tab/window backed by a dedicated preview route/page.
- **Complexity**: 6
- **Dependencies**: Sprint 3
- **Acceptance Criteria**:
  - Main Canvax board layout does not need to switch into split-view
  - Preview window can render HTML preview, images, or markdown output
  - Preview launch is obvious and stable from the main board
- **Validation**:
  - Manual open/close test
  - Screenshot review of both board and preview surfaces

### Task 4.2: Connect preview window to generated artifacts
- **Location**:
  - [web/app.js](/Users/devanshvarshney/Canvax/web/app.js)
  - new file: `/Users/devanshvarshney/Canvax/web/preview.html`
  - new file: `/Users/devanshvarshney/Canvax/web/preview.js`
  - [scripts/canvax.mjs](/Users/devanshvarshney/Canvax/scripts/canvax.mjs)
- **Description**: Load preview targets from the artifact manifest:
  - static HTML preview
  - rendered markdown/spec
  - generated screenshot/image
- **Complexity**: 7
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - Preview window updates when manifest changes
  - Broken preview states fail gracefully
  - Preview metadata shows source file/path and last update time
- **Validation**:
  - Simulate artifact updates
  - Verify live refresh

### Task 4.3: Add compare and handoff workflows across board and preview
- **Location**:
  - [web/app.js](/Users/devanshvarshney/Canvax/web/app.js)
  - [web/index.html](/Users/devanshvarshney/Canvax/web/index.html)
  - new file: `/Users/devanshvarshney/Canvax/web/preview.js`
- **Description**: Add compare affordances:
  - “open preview”
  - “open generated spec”
  - “show changed files”
  - “freeze preview snapshot”
  - selected-frame awareness between board and preview where practical
- **Complexity**: 6
- **Dependencies**: Task 4.2
- **Acceptance Criteria**:
  - User can visually compare sketch intent and preview output across two surfaces
  - Snapshot can be preserved as a new artifact entry
  - Generated markdown/spec is accessible from the board or preview window
- **Validation**:
  - Manual compare workflow
  - Preview snapshot artifact test

## Sprint 5: Prepare for a Richer Codex Client Future
**Goal**: Make the current app production-ready while leaving a path to a true same-thread custom client later.
**Demo/Validation**:
- Repo is installable, documented, and reviewable as a prototype
- Clear path exists for local companion mode now and App Server client later

### Task 5.1: Introduce transport abstraction for current skill mode vs future App Server mode
- **Location**:
  - [scripts/canvax.mjs](/Users/devanshvarshney/Canvax/scripts/canvax.mjs)
  - new file: `/Users/devanshvarshney/Canvax/docs/architecture.md`
- **Description**: Separate:
  - local file export transport
  - artifact manifest transport
  - future JSON-RPC / App Server transport
- **Complexity**: 6
- **Dependencies**: Sprint 4
- **Acceptance Criteria**:
  - Architecture docs explicitly define the future migration path
  - Current implementation does not hardcode assumptions that block an App Server client later
- **Validation**:
  - Architecture review
  - Dependency mapping sanity check

### Task 5.2: Packaging, docs, and upstream proposal assets
- **Location**:
  - [README.md](/Users/devanshvarshney/Canvax/README.md)
  - new file: `/Users/devanshvarshney/Canvax/docs/upstream-proposal.md`
  - new file: `/Users/devanshvarshney/Canvax/docs/canvax-demo-script.md`
- **Description**: Turn the repo into a shareable prototype with:
  - product framing
  - demo script
  - upstream proposal narrative
  - installation and feature matrix
- **Complexity**: 5
- **Dependencies**: Task 5.1
- **Acceptance Criteria**:
  - New contributors understand current state vs target state
  - Proposal explains why local Canvax exists and what native Codex integration would replace
- **Validation**:
  - Documentation review
  - Dry-run demo script

## Testing Strategy

- Extend the existing browser self-test in [web/app.js](/Users/devanshvarshney/Canvax/web/app.js) to cover:
  - lasso selection
  - multi-resize
  - grouping/ungrouping
  - duplicate and reorder
  - capture deletion
  - dictation state transitions with mocked provider
  - preview manifest loading
  - preview window launch behavior
- Add export contract fixtures to validate:
  - JSON schema versioning
  - transcript embedding
  - artifact manifest paths
  - replayable session events
- Manual validation per sprint:
  - cold start
  - stale saved state migration
  - long-running sketch session
  - reopen after crash
  - mobile/narrow layout sanity check for help, inspector, and preview launch controls

## Potential Risks & Gotchas

- **No documented native embedded Codex canvas API**:
  - Near-term solution must remain local companion app + skill wrapper.
  - Mitigation: keep transport abstraction clean for future App Server migration.
- **Voice surface ambiguity**:
  - The Codex/ChatGPT chat voice button is not a documented integration point for Canvax.
  - Mitigation: implement Canvax-native dictation UI and treat chat voice as separate.
- **macOS voice product volatility**:
  - ChatGPT macOS voice was retired on January 15, 2026.
  - Mitigation: do not anchor the plan to a macOS ChatGPT voice dependency.
- **Browser speech recognition reliability**:
  - Browser support and partial transcript behavior can be inconsistent.
  - Mitigation: provider abstraction and graceful fallback to pasted/system dictation text.
- **Large exports and memory growth**:
  - Images, captures, and transcript events can bloat localStorage/export files.
  - Mitigation: move heavy session persistence to file-backed exports and compact local state.
- **Clipboard interop**:
  - System clipboard should not silently override image paste behavior.
  - Mitigation: parse Canvax JSON payload first, then fall back to images/text.
- **Preview security**:
  - Previewing generated HTML in a separate local window still creates local script/security concerns.
  - Mitigation: dedicated preview route, sandbox boundaries where possible, and explicit source constraints.
- **Session drift between Codex and Canvax**:
  - Codex may change code while the sketch evolves.
  - Mitigation: artifact timestamps, event log, and “latest generated from session state X” metadata.

## Rollback Plan

- Keep current `exports/canvax-live-latest.json` and `exports/canvax-live-latest.md` contract valid while adding new files.
- Gate new voice and preview surfaces behind additive UI, not destructive rewrites.
- Preserve current `./canvax` single-service lifecycle.
- If dictation or preview becomes unstable:
  - disable those panels behind feature flags
  - keep core sketch + export + flow workflow intact

## Recommended Priority Order

1. Finish Sprint 1 interaction stability and session schema
2. Build Sprint 2 dictation inside Canvax
3. Build Sprint 3 artifact inbox and live collaboration loop
4. Add Sprint 4 preview surface
5. Document Sprint 5 future App Server migration path

## Summary Answer To The Product Question

For Canvax to feel like a real live Codex collaborator, the biggest missing pieces are:

- a formal session model instead of only “latest export”
- voice dictation inside the board itself
- structured transcript + sketch fusion in exports
- an artifact inbox showing what Codex wrote back
- a preview/runtime window for generated output
- durable event logging and replay

So yes: **voice dictation is a meaningful next step**, but it should be built into Canvax itself rather than assuming the Codex chat voice button can be shared with the board.

And yes: **a preview surface is also worth building**, but it should open as a separate browser tab/window so the main drawing UI stays focused. The highest-value loop is:

1. user sketches
2. user speaks intent
3. Codex reads sketch + transcript
4. Codex writes code/spec/artifacts
5. Canvax opens or refreshes the preview window with the new output while the sketch board remains intact

That is the point where Canvax stops being only a scratch pad and becomes a real collaborative design-to-build surface.
