# Codex Browser Workflow

This document describes the preferred near-term Canvax workflow inside Codex Desktop.

Canvax still runs as a local service. The difference is where the board is viewed and inspected:

```text
preferred today
  ./canvax service
      |
      v
  /canvax opens localhost:3210 in Codex Browser Use / Atlas
      |
      +--> user sketches
      +--> Codex inspects board and Preview
      +--> Codex edits workspace files
      `--> Canvax shows output context
```

## Why This Is The Default

Using Codex Browser Use / Atlas keeps the collaboration loop in one place:

- the user sketches in Canvax
- Codex reads the live export
- Codex can read the task pack or image prompt pack when the request is build/spec/image-placement work
- Codex can forward chat microphone transcripts into Canvax voice notes with `./canvax --transcript "..." --scope frame`
- Codex uses Browser Use to inspect the board, Preview, and generated app
- Codex changes real files in the workspace
- Codex publishes output context back to Canvax
- the user keeps sketching corrections

This is closer to the intended Canvax product than bouncing between Codex and a separate external browser.

## Startup

Start or reuse the local service:

```bash
./canvax
```

Then invoke `/canvax` or `$canvax` so Codex opens this URL in Browser Use / Atlas:

```text
http://localhost:3210
```

Use these only when you explicitly want a separate macOS browser window:

```bash
./canvax --open-external
./canvax --chrome
```

## Working Loop

```mermaid
sequenceDiagram
    participant U as User
    participant B as Codex Browser Use / Atlas
    participant C as Codex
    participant S as Canvax service
    participant W as Workspace
    U->>B: sketch, label, speak
    B->>S: autosnap or freeze
    C->>S: read latest export/checkpoint
    C->>W: edit app/spec/assets
    C->>B: inspect generated UI
    C->>S: publish output manifest
    S->>B: Preview updates
    U->>B: sketch corrections
```

```mermaid
flowchart TD
    A["Open board in Browser Use / Atlas"] --> B["Draw / label / voice"]
    B --> C["Generate screen"]
    C --> D["Inspect generated route"]
    D --> E{"Needs change?"}
    E -->|"yes"| B
    E -->|"no"| F["Ask Codex to build real code"]
    F --> G["Publish output manifest"]
    G --> D

    classDef browser fill:#eef3ff,stroke:#2364aa,color:#18110e
    classDef input fill:#ffede8,stroke:#ff5d3a,color:#18110e
    classDef output fill:#eaf7f5,stroke:#0c8d7b,color:#18110e
    classDef decision fill:#fff7db,stroke:#f0a202,color:#18110e
    classDef codex fill:#f7edfb,stroke:#b246a8,color:#18110e

    class A,D browser
    class B input
    class C,G output
    class E decision
    class F codex
```

## What Codex Should Inspect

In Browser Use / Atlas, Codex should inspect:

- the board at `http://localhost:3210`
- the Preview window opened from the board
- any generated local app or HTML artifact bound through the output manifest
- layout clipping, broken controls, stale output, and generated UI mismatches
- `exports/canvax-image-prompt-pack-latest.md` when the user wants image generation or composition-preserving prompt guidance

## Image Prompt Pack Flow

```text
draw rough layout
    -> press Image / Image pack
    -> Canvax writes prompt + coordinates + HTML/CSS scaffold
    -> Codex/ChatGPT host image generation can use that pack
```

This remains local-first. Canvax does not need `OPENAI_API_KEY` for this path; it prepares the spatial handoff and lets the current Codex/ChatGPT host capability do the generation when available.

## What Codex Should Publish

After changing workspace files, Codex should run:

```bash
node scripts/write-codex-output.mjs --from-git-status
```

If there is a concrete preview target:

```bash
node scripts/write-codex-output.mjs --from-git-status --url http://localhost:3000
```

Or for a workspace HTML artifact:

```bash
node scripts/write-codex-output.mjs --from-git-status --preview-path artifacts/preview/home.html
```

## Skill Vs Plugin Direction

The current repo is a local command plus a skill:

```text
./canvax  -> service
/canvax   -> Codex skill behavior
```

The next packaging step should be a Canvax plugin that bundles:

- the existing skill instructions
- MCP-style tools for reading the current frame/checkpoint
- a tool to open the board in Browser Use / Atlas
- a tool to create a `Build real screen` task
- a tool to publish output manifests after Codex changes files

The skill should remain as the lightweight fallback. The plugin should become the richer installable Codex integration.
