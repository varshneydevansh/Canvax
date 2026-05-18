# Canvax Brand

Canvax now has an original mark for the local Codex canvas companion.

![Canvax logo](assets/canvax-logo.svg)

## Identity Rule

The logo is intentionally **not** the ChatGPT, OpenAI, or Codex logo.

It uses a new Canvax mark built from shared workflow ideas:

- browser window: Canvax runs as a local visual surface
- pen stroke: the user sketches intent directly
- code brackets: Codex turns the sketch into implementation work
- central C: Canvax is the bridge between canvas and Codex

```text
Canvax mark

  +-----------------------------+
  | browser chrome              |
  |                             |
  |   <      C + stroke      >  |
  |          canvas -> code     |
  +-----------------------------+
```

## Brand Flow

```mermaid
flowchart LR
    Sketch["Sketch stroke"] --> Canvas["Canvas surface"]
    Canvas --> Code["Code brackets"]
    Code --> Codex["Codex handoff"]
    Codex --> Preview["Generated screen"]
    Preview --> Sketch

    classDef sketch fill:#ffede8,stroke:#ff5d3a,color:#18110e
    classDef canvas fill:#fffaf3,stroke:#f0a202,color:#18110e
    classDef code fill:#eaf7f5,stroke:#0c8d7b,color:#18110e
    classDef codex fill:#eef3ff,stroke:#2364aa,color:#18110e
    classDef preview fill:#f7edfb,stroke:#b246a8,color:#18110e

    class Sketch sketch
    class Canvas canvas
    class Code code
    class Codex codex
    class Preview preview
```

## Assets

```text
web/assets/canvax-logo.svg   -> app and Preview UI
docs/assets/canvax-logo.svg  -> documentation rendering
```

Use the SVG directly when possible. If a raster icon is needed later, export from the SVG rather than redrawing it.
