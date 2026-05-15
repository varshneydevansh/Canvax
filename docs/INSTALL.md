# Install Canvax

## Install Flow

```text
clone repo
   |
   v
run ./canvax
   |
   +--> starts or reuses local service
   `--> serves board at localhost:3210
   |
   v
run node scripts/install-canvax-skill.mjs
   |
   v
restart Codex once
   |
   v
use /canvax or $canvax
```

```mermaid
flowchart TD
    A[Project root] --> B[./canvax]
    B --> C[Local service on localhost:3210]
    C --> D[Open board in Codex Browser Use / Atlas]
    A --> E[node scripts/install-canvax-skill.mjs]
    E --> F[Symlink into ~/.codex/skills/canvax]
    F --> G[Restart Codex]
    G --> H[/canvax or $canvax]
```

## Prerequisites

- macOS as the primary supported platform
- Node.js installed
- Codex desktop app or Codex CLI already working

Canvax does not require a separate OpenAI API key for the core sketch-to-Codex workflow.

## Local Setup

From the project root:

```bash
./canvax
```

This starts or reuses the local Canvax service.

By default the board runs at:

```text
http://localhost:3210
```

### Preferred Codex Desktop Setup

If Codex Desktop has the Browser Use / Atlas tab available, invoke `/canvax` or `$canvax` and keep `http://localhost:3210` inside the Codex in-app browser.

That is the preferred mode because:

- the sketch board stays next to the Codex chat
- Codex can inspect the board, Preview, and generated app with Browser Use / Atlas
- the workflow avoids bouncing between Codex and a separate macOS browser
- the local service and export files still work exactly the same

Use these only when you explicitly want the board outside Codex:

```bash
./canvax --open-external
./canvax --chrome
```

## Install the Codex Skill

Run:

```bash
node scripts/install-canvax-skill.mjs
```

This creates a symlink from:

```text
codex-skill/canvax
```

to:

```text
~/.codex/skills/canvax
```

If Codex is already open, restart it once after installing the skill.

## Verify the Install

Check service status:

```bash
./canvax --status
```

You should see:

- the board URL
- the live JSON export path
- the live Markdown export path

Then open Codex and check that one of these works:

- `/canvax`
- `$canvax`

## Command vs Skill

This is the most important distinction:

- `./canvax` is the local command that runs the board service.
- `/canvax` is the skill-backed slash entry inside Codex and should open the board in Browser Use / Atlas.
- `$canvax` is the direct skill invocation form.

So Canvax is not only a browser app and not only a skill. It is both.

```mermaid
flowchart LR
    Cmd["./canvax command"] --> Service["Local service"]
    Service --> Browser["Codex Browser Use / Atlas"]
    Skill["/canvax or $canvax skill"] --> Handoff["Latest handoff files"]
    Browser --> Handoff
    Handoff --> Codex["Codex work in chat"]

    classDef command fill:#fff7db,stroke:#f0a202,color:#18110e
    classDef service fill:#eaf7f5,stroke:#0c8d7b,color:#18110e
    classDef browser fill:#eef3ff,stroke:#2364aa,color:#18110e
    classDef skill fill:#ffede8,stroke:#ff5d3a,color:#18110e
    classDef codex fill:#f7edfb,stroke:#b246a8,color:#18110e

    class Cmd command
    class Service,Handoff service
    class Browser browser
    class Skill skill
    class Codex codex
```

## Daily Startup

Typical startup flow:

```bash
./canvax
```

Then in Codex:

```text
/canvax
```

or:

```text
$canvax
```

Then use `/canvax` or `$canvax` so Codex opens `http://localhost:3210` with Browser Use / Atlas when available. Draw in the board and continue the same Codex thread.

## Startup Model

```text
terminal                Codex browser           Codex
   |                       |                      |
   | ./canvax              |                      |
   |---------------------->| service boots        |
   |                       | board loads          |
   |                       |                      |
   |                       | draw and freeze      |
   |                       |--------------------->| /canvax
   |                       |                      | reads latest handoff
```

```mermaid
sequenceDiagram
    participant T as Terminal
    participant S as Canvax service
    participant B as Codex Browser board
    participant C as Codex
    T->>S: ./canvax
    S->>B: serve board
    B->>S: save live export
    C->>S: /canvax skill reads latest handoff
```

## Service Management

```bash
./canvax
./canvax --open-external
./canvax --chrome
./canvax --status
./canvax --stop
./canvax --restart
```

Notes:

- Canvax uses one running service at a time by default.
- If Canvax is already running, it reuses the existing board instead of starting another copy.
- `--restart` is the explicit way to move or recover the service.
- `--open-external` opens the default macOS browser.
- `--chrome` opens Google Chrome explicitly.
- `--open` is kept as a legacy alias for `--open-external`.

## Common Install Problems

### The skill does not show up in Codex

- restart Codex after installing the skill
- verify the symlink exists at `~/.codex/skills/canvax`

### The board is not opening

- run `./canvax --status`
- confirm `http://localhost:3210` is reachable in Codex Browser Use / Atlas or your browser
- if needed, run `./canvax --restart`
- use `./canvax --open-external` or `./canvax --chrome` only if you want an external browser opened automatically

### I see an older board state

The browser may still have old local state loaded. Refresh the board and let the current Canvax export resync.

## Installed Pieces

```text
1. local launcher      -> ./canvax
2. local service       -> scripts/canvax.mjs
3. browser board       -> web/index.html + web/app.js
4. browser Preview     -> web/preview.html + web/preview.js
5. Codex skill         -> ~/.codex/skills/canvax symlink
```
