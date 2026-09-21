# Argon Remotion Promo

The repo now contains a 1:1 Remotion composition driven by the current `script.md`, `idea.md`, and files in `assets/`.

## Composition

- ID: `ArgonPromo`
- Size: `1080x1080`
- FPS: `60`
- BPM: `85`
- Duration: `130 beats ≈ 91.765 seconds`
- Music: `assets/audio/Tame_Impala_-_Loser.mp3`
- Font stack: SF Pro first, system fallback second

## Beat-aligned scene map

| Scene | Beat range | Approx time |
| --- | ---: | ---: |
| Hook | 0–10 | 0.000–7.059s |
| Problem | 10–31 | 7.059–21.882s |
| Reveal | 31–43 | 21.882–30.353s |
| Drop it once | 43–60 | 30.353–42.353s |
| Write it once | 60–78 | 42.353–55.059s |
| One click | 78–99 | 55.059–69.882s |
| 4 → 1 | 99–116 | 69.882–81.882s |
| Close | 116–130 | 81.882–91.765s |

The original story order is preserved, but scene boundaries are snapped to the 85 BPM grid so transitions land musically.

## Preview

```bash
npm install
npm run studio
```

Open the `ArgonPromo` composition.

## Render

```bash
npm run render
```

Output path:

```
out/argon-promo-1x1.mp4
```

The composition uses the existing repo assets directly by setting `assets/` as Remotion's public directory.
