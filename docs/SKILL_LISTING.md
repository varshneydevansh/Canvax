# Canvax Skill Listing

Use this copy when publishing or refreshing the Codex skill listing.

## Skill Details

- Skill name: `canvax`
- Short tagline: `Sketch-to-Codex canvas for UI, books, images, and voice edits`
- Description:

```text
Canvax is a Codex-first visual sketch companion. Use /canvax as the preferred slash-listed skill entry to start or reuse the local service, run the `./canvax --open-codex` helper when available, and target the full Canvax board in Codex's in-app browser. Draw rough UI screens, app flows, book spreads, storyboards, comic pages, posters, image directions, or visual notes; capture voice/text intent; then Canvax writes live exports, checkpoints, task packs, image prompt packs, and output manifests so Codex can build, rewrite, review, and bind generated work back to the same canvas without a separate OpenAI API key.
```

- Tags: `codex, skill, canvas, design, ui-ux, sketch, voice, prototyping, image-generation, book-design, storyboard, workflow`

## Repository And Install

- Skill repository URL: `https://github.com/varshneydevansh/Canvax`
- Install command: `node scripts/install-canvax-skill.mjs`

Leave the npm install command blank until Canvax has a real published npm package.

## Expected Slash Behavior

`/canvax` is the preferred command-style skill entry in Codex. It should start or reuse the local service and target:

```text
http://localhost:3210/
```

The local helper for that behavior is:

```bash
./canvax --open-codex
```

To hide the Codex browser panel when it is open:

```bash
./canvax --close-codex
```

The full-board fallback remains:

```text
http://localhost:3210
```

`$canvax` remains the explicit skill invocation fallback and should perform the same handoff if the slash entry is unavailable.
