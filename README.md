# Plexity Video Brief

This repository is the source-of-truth workspace for an AI-assisted Remotion product video.

## Structure

- `script.md` — exact narrative, scenes, copy and timing.
- `idea.md` — creative direction and motion rules.
- `assets/manifest.json` — machine-readable asset index used by the website.
- `assets/screenshots/` — app/site screenshots.
- `assets/video/` — screen recordings and product clips.
- `assets/audio/` — voiceover, music and sound effects.
- `assets/logos/` — logos, icons and SVG brand assets.

The root website visualizes the brief on GitHub Pages.

## Adding assets

1. Put the real file in the matching `assets/` subfolder.
2. Add it to `assets/manifest.json`.
3. Reference that exact path from `script.md` when a scene needs it.

This structure is intentionally simple so the final Remotion project can be generated without guessing asset names or scene intent.
