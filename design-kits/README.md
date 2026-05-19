# Canvax Design Kits

Drop JSON files in this directory to make reusable design-system presets appear
in the Canvax `Design kit` dropdown.

```text
design-kits/*.json
  -> /api/status designKitGallery
  -> Canvax Design kit dropdown
  -> package-design-kits library export
  -> task/image/build/rewrite handoffs
```

Each kit is local and no-API. It is a lightweight file-based alternative to a
hosted skill gallery: designers can keep project-specific visual systems,
illustration rules, product UI rules, or campaign styles in version control.

Validate and package the local kit library with:

```bash
npm run validate-design-kits
npm run validate-design-kits -- --query poster
npm run package-design-kits
npm run package-design-kits -- --query storybook
```

`package-design-kits` writes a shareable no-API library artifact under
`exports/canvax-design-kit-library-latest.{json,md}`. Each packaged kit carries
a SHA-256 checksum, source path, local version, full kit JSON, and install notes
so another Canvax workspace can copy selected kits into `design-kits/` and
validate them before use.

Minimal shape:

```json
{
  "id": "my-kit",
  "label": "My kit",
  "summary": "Short designer-readable purpose.",
  "audience": "target surface or medium",
  "mood": "visual direction",
  "actionMode": "build-ui",
  "viewport": "desktop",
  "generation": {
    "direction": "product",
    "style": "studio",
    "focus": "balanced"
  },
  "frame": {
    "objective": "What this kit should help create.",
    "layout": "Layout rules.",
    "motion": "Motion rules.",
    "assets": "Asset/image rules.",
    "mobile": "Responsive or alternate surface rules."
  }
}
```
