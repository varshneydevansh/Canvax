# Design System: Canvax Visual Workbench

> Canvax is a Codex-first visual design workbench — a professional tactile scratchpad for UI/UX, storyboards, posters, image direction, and implementation handoff. Every token and design principle listed here drives the visual system of the Canvax workspace.

---

## 1. Visual Theme & Atmosphere

**Vibe & Texture Archetype: Tactile Editorial Sanctuary (Variance 8, Motion 6, Density 5)**

Canvax moves away from the sterile, rigid boxes of standard wireframing apps to embrace a visual language that feels clinical yet warm — like a well-lit architect's studio or a high-end editorial desk. The layout is driven by asymmetrical spatial balance and confident whitespace, framing your rough sketches and generated previews as primary pieces of art.

We reject flat, digital-only surfaces. The visual tone relies on **Tonal Layering** and **Machined Enclosures** (the "Double-Bezel" technique), combining semi-transparent warm paper tones, glass backdrops, ultra-light precision lines, and dynamic spring-physics motion to simulate haptic depth.

---

## 2. Color Palette & Roles

Our colors are calibrated to prevent visual fatigue while prioritizing readability and focused creation. We use exactly **one accent color** for primary actions, reserving high-contrast semantics exclusively for status, selection, and sync feedback.

### 2.1 Surfaces & Canvas (Warm Neutrals)
*   **Canvas Warmth** (`#faf9f6` / `--bg-canvas` / `--bg-top`) — The global workspace backdrop; a light, natural warm paper surface.
*   **Muted Paper** (`#f5f3f0` / `--bg-mid`) — Transition shade for workspace backgrounds, keeping gradients soft and natural.
*   **Aged Parchment** (`#e4e0db` / `--bg-bottom`) — Grounding baseline surface for full workspace depth.
*   **Machined Surface** (`rgba(255, 252, 248, 0.94)` / `--bg-raised` / `--paper`) — Card and panel base; an elevated core layer providing clean lift.
*   **Core Panel** (`rgba(255, 255, 255, 0.98)` / `--paper-strong`) — Concentric inner Core layers.
*   **Tactile Inset** (`rgba(245, 241, 236, 0.72)` / `--bg-inset`) — Pressed fields, slider tracks, and compact containers.
*   **Onyx Overlay** (`rgba(22, 21, 20, 0.88)` / `--bg-overlay`) — Dark theme workbench chrome, floating rails, and high-z-index agent logs.

### 2.2 Typography & Ink
*   **Obsidian Ink** (`#1a1714` / `--ink`) — Primary high-contrast text; deep slate charcoal, never pure black.
*   **Charcoal Soft** (`rgba(26, 23, 20, 0.64)` / `--ink-soft` / `--ink-secondary`) — Labels, secondary subtitles, metadata, and helper text.
*   **Ghost Ink** (`rgba(26, 23, 20, 0.38)` / `--ink-disabled`) — Disabled control states.
*   **Ethereal Ink** (`#faf6f0` / `--ink-on-dark`) — Primary white text on Onyx overlay surfaces.
*   **Ethereal Muted** (`rgba(250, 246, 240, 0.64)` / `--ink-on-dark-secondary`) — Secondary label text on dark surfaces.

### 2.3 Semantic Accent & Signals
*   **Oxygen Accent** (`#e8553a` / `--accent`) — The single, high-contrast action color (saturation < 80%) for Make, Apply, active tools, and primary CTAs.
*   **Deep Oxygen** (`#d44a32` / `--accent-deep` / `--accent-hover`) — Accent color hover state.
*   **Oxygen Whisper** (`rgba(232, 85, 58, 0.12)` / `--accent-muted`) — Active background highlight tint.
*   **Pine Mint** (`#0c8d7b` / `--mint`) — Sync state, successful validation, and selection signals.
*   **Pine Whisper** (`rgba(12, 141, 123, 0.12)` / `--mint-muted`) — Selection backgrounds.
*   **Warm Amber** (`#d49218` / `--amber`) — Warnings and queued or pending states.
*   **Amber Whisper** (`rgba(212, 146, 24, 0.12)` / `--amber-muted`) — Pending highlight backgrounds.
*   **Cobalt Blue** (`#2364aa` / `--blue`) — Info, guides, and system status cues.
*   **Cobalt Whisper** (`rgba(35, 100, 170, 0.12)` / `--blue-muted`) — Reference / info backgrounds.
*   **Crimson Danger** (`#c5371f` / `--danger`) — Destructive actions and critical validation errors.
*   **Crimson Whisper** (`rgba(197, 55, 31, 0.10)` / `--danger-muted`) — Error backgrounds.
*   **Imperial Plum** (`#9b47a0` / `--plum`) — Variant branches and storyboard tags.

### 2.4 Precision Hairlines & Borders
*   **Ghost Line** (`rgba(26, 23, 20, 0.08)` / `--line`) — The default border; a subtle boundary felt rather than seen.
*   **Tactile Line** (`rgba(26, 23, 20, 0.18)` / `--line-strong`) — Hovered borders and focus rings.
*   **Onyx Line** (`rgba(255, 255, 255, 0.10)` / `--line-dark`) — Borders on dark surfaces.
*   **Onyx Strong** (`rgba(255, 255, 255, 0.24)` / `--line-dark-strong`) — Hovered borders on dark surfaces.

---

## 3. Typography Rules

Canvax establishes distinct character using a high-end typography stack, completely banning generic digital web defaults.

*   **Display / Headings:** `Plus Jakarta Sans` (`--font-display`) — Confident, geometric letterforms set with slightly tight letter spacing (`tracking-tight`) and weight-driven hierarchy instead of shouting sizes.
*   **UI / Body Text:** `Manrope` (`--font-body`) — Exceptional modern legibility with friendly, rounded terminals. Body copy is constrained to a comfortable `65ch` maximum width and relaxed leading.
*   **Data / Code:** `JetBrains Mono` (`--font-mono`) — Precision monospace for numbers, labels, active coordinates, files, and metadata.
*   **Strict Font Ban:** The standard font **Inter** is strictly **BANNED** in creative and workbench layouts. Generic serif fonts (`Times New Roman`, `Georgia`, `Garamond`) are BANNED inside software dashboard containers.

### 3.1 Typographic Scale

| Token Name | Font Size | Weight | Line-Height | Main Usage |
|:---|:---|:---|:---|:---|
| `xs` | `0.72rem` (11px) | 600 | 1.3 | Badges, tags, coordinates, mono details |
| `sm` | `0.82rem` (13px) | 500 | 1.4 | Helper context, metadata text, code blocks |
| `base` | `0.92rem` (15px) | 450 | 1.5 | General labels, field inputs, body copy |
| `md` | `1.05rem` (17px) | 600 | 1.3 | Subsection titles, workspace card headers |
| `lg` | `1.35rem` (22px) | 650 | 1.2 | Workbench panel headers, focus panel titles |
| `xl` | `1.80rem` (29px) | 700 | 1.1 | Canvas deck headers, primary dashboard hero |

---

## 4. Component Stylings

### 4.1 Machined Panels & Cards (The "Double-Bezel" Rule)
*   Containers must never sit flat. They use a double-bezel nested architecture:
    *   **Outer Shell:** A wrapper `div` with border `rgba(26,23,20,0.08)` and padding `p-1.5` or `p-2`. Radius is set to `--radius-lg` (`1rem`) or `--radius-xl` (`1.25rem`).
    *   **Inner Core:** Content inside the shell with a clean white base, dynamic inner highlight shadow `shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]`, and a mathematically computed smaller radius (`rounded-[calc(var(--radius-lg)-0.25rem)]`).
*   Elevation is communicated via deep, highly-diffused ambient shadows tinted slightly to the background hue:
    *   `--shadow-sm` = `0 1px 3px rgba(26,23,20,0.05)`
    *   `--shadow-md` = `0 4px 16px rgba(26,23,20,0.06)` (for core panels)
    *   `--shadow-lg` = `0 12px 40px rgba(26,23,20,0.08)` (for modals and overlays)
*   **High-Density Replace:** For data grids or crowded tool views, cards are replaced by pure whitespace or fine border-top lines (`--line`).

### 4.2 Interactive Buttons & CTAs
*   **Tactile Active State:** All buttons feature standard physical click transitions:
    *   `:hover` -> `translateY(-1px)` with smooth focus ring transition.
    *   `:active` -> `scale(0.98)` or `translateY(1px)` with immediate pressed shadow (`--shadow-inset`).
*   **Button-in-Button Icons:** CTA button icons are placed within a dedicated small circular capsule `w-8 h-8 rounded-full flex items-center justify-center bg-black/5` sitting flush with the button's right margin.
*   **Accent Buttons:** Oxygen Accent background, solid high-contrast text, flat base with zero neon outer glow.

### 4.3 Form Inputs
*   Labels are consistently placed **above** the input element (`gap-2`).
*   No floating labels. Input fields utilize a subtle `rgba(26, 23, 20, 0.04)` fill with an inner border.
*   Focus state adds a 2px outer outline of `var(--accent-muted)` with zero pixel overlap.
*   Error messages are placed clearly **below** the input in a standard monospace capsule.

### 4.4 Loaders & Empty States
*   **Skeletal Shimmers:** Loading cards use animated shimmers (`@keyframes shimmer`) matching their exact dimensions. Circular spinning wheels are strictly banned.
*   **Curated Empty States:** Empty queues or workspaces contain beautifully framed prompt illustrations accompanied by direct, actionable guidance.

---

## 5. Layout Principles

*   **Grid-First Framework:** Standardize complex spatial layout grids using CSS Grid. Banish flexbox mathematical percentage hacks (`w-[calc(33%-1rem)]`).
*   **Viewport Integrity:** Full-screen sections or modals must use `min-h-[100dvh]` to bypass layout jumping on mobile browsers.
*   **Absolute Spatial Separation:** Elements must never overlap on the canvas unless explicitly styled as draggable, floating cards (z-index `var(--z-card)`). Text must never overlap other elements.
*   **Asymmetry:** Workbench layouts split space asymmetrically (e.g. left panel `18rem`, central canvas `1fr`, right inspector `24rem`) to break visual monotony.
*   **Tonal Sectioning:** Boundaries are defined exclusively by shifting backgrounds (Canvas warm paper vs. pure card surface) rather than heavy borders.

---

## 6. Motion & Interaction

Canvax is a living companion. Its movement must feel deliberate, weighty, and high-performance.

*   **Spring Physics DEFAULT:** Every hover, active state, modal, and drawer slide relies on custom spring easing.
    *   *Formula:* `cubic-bezier(0.16, 1, 0.3, 1)` (Enter transition / ease-out).
    *   *System spring equivalents:* `stiffness: 100, damping: 20`.
*   **Hardware Acceleration:** Transitions occur exclusively via `transform` and `opacity`. Never animate `top`, `left`, `width`, or `height` as it triggers complete DOM reflows.
*   **Perpetual Micro-Loops:** Draggable nodes, status badges, and active voice queues use infinite, low-frequency breath states (`opacity: 0.8` to `1` or `translateY(-2px)` floating over a 4s loop) so the workbench feels alive.
*   **Sequential Reveal (Stagger Children):** Dynamic panels, frame lists, and output shelf objects do not mount instantly. They reveal in a staggered sequence using a `100ms` cascade delay.

---

## 7. Anti-Patterns (AI Tells & Slop Banned)

To maintain $150k+ agency-level execution, the following styles and implementations are strictly **FORBIDDEN**:

1.  **No Emojis:** Replace all emojis in UI controls, headers, code, and transcripts with precise vector SVGs or lightweight Radix icons.
2.  **No Inter Font:** Banned in creative headers and body elements.
3.  **No Generic Serif Fonts:** Times New Roman, Georgia, and Garamond are banned in workbench containers.
4.  **No Pure Black:** Never use `#000000`. Use Onyx (`#1a1714` or Zinc-950) to preserve organic warmth.
5.  **No Neon / Glow Shadows:** Banish purple/blue glowing buttons, oversaturated accents, and laser drop shadows.
6.  **No Symmetry Boredom:** Banish plain 3-column Bootstrap-style grid cards.
7.  **No Overlapping Text:** Text blocks must reside in distinct boundaries to guarantee legibility and layout safety.
8.  **No Generic Copywriting:** Banish AI buzzwords ("Seamless", "Elevate", "Unleash", "Next-Gen"). Use precise nouns and concrete action verbs.
9.  **No Fake Data:** Avoid predictable mock names ("John Doe", "Acme Corp") or perfectly rounded counts ("100%", "99.9%"). Use organic, messy data points ("Active Project Frame 3B", "47.2% completed").
10. **No Custom Mouse Cursors:** They are bad for accessibility and drag accuracy.
11. **No Scroll Indicators:** Banish generic chevrons or "Scroll to explore" text. Let the natural visual layout pull the user's eye.
12. **No Broken Links:** Use reliable mock avatar vectors or absolute placeholders.
