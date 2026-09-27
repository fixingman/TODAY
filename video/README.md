# TODAY — video

Dev-only tooling for TODAY's promo and onboarding videos, built with
[HyperFrames](https://hyperframes.heygen.com) (HTML compositions rendered to MP4).
Never deployed: every Netlify build runs `rm -rf video`.

## Layout

- `capture.mjs` — drives the real app (seeded localStorage, fixed Monday) and records each
  scene to `captures/<desktop|mobile>/`. Scenes that lagged under headless Chrome (check-offs,
  focus blur, evening review) are recorded in slow motion and re-timed to real speed.
- `render-audio.mjs` — renders `audio/`: an ambient sine bed in the app's sound language, plus
  the app's own `playCompleteSound` / `playStartSound` / `playChime` from `assets/sound.js`.
  No third-party music.
- `today-promo/` — the 32s promo. `BRIEF.md` (why), `STORYBOARD.md` (what, frame by frame),
  `frame.md` (design tokens), `compositions/frames/` + `index.html` (the video).

Captures, audio, `assets/` and renders are gitignored; everything that makes them is committed.

## Rebuild the promo

```sh
cd video && npm install
npm run capture && npm run capture:mobile   # real-app footage (needs Google Chrome)
npm run audio                               # bed + SFX
sh today-promo/prepare.sh                   # trim/crop clips into today-promo/assets/
cd today-promo
npx hyperframes preview --background        # Studio at http://localhost:3002
npm run check                               # lint, layout, contrast
npx hyperframes render --quality high --output renders/today-promo-16x9.mp4
```

The published copy lives at `docs/media/today-promo.mp4` (README links it); the README GIF is
seconds 20–26 of the render:

```sh
ffmpeg -ss 20 -t 6 -i renders/today-promo-16x9.mp4 -vf "fps=12,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" -loop 0 ../../docs/media/today-let-it-go.gif
```

## Embedding, muted by default

The video reads completely without sound, so it can autoplay muted with an opt-in unmute:

```html
<figure class="promo">
  <video src="today-promo.mp4" autoplay muted loop playsinline preload="metadata"></video>
  <button type="button" aria-pressed="false" onclick="const v=this.previousElementSibling;v.muted=!v.muted;this.setAttribute('aria-pressed',String(!v.muted));this.textContent=v.muted?'Sound on':'Sound off'">Sound on</button>
</figure>
<style>
  .promo { position: relative; margin: 0; background: #0e0e10; }
  .promo video { display: block; width: 100%; }
  .promo button { position: absolute; right: 16px; bottom: 16px; font: 500 11px/1 "DM Mono", monospace;
    letter-spacing: .14em; text-transform: uppercase; color: #e8e8ec; background: #17171a;
    border: 1px solid #2a2a30; padding: 8px 10px; cursor: pointer; }
</style>
```
