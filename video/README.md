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
  `frame.md` (design tokens), `compositions/frames/` + `index.html` (the video),
  `storyboard.html` (the sketch sheet; `prepare.sh` rebuilds its `.sketch/` stills).
- `today-onboarding/` — the 79s walkthrough, same layout. Its bed is `audio/bed-80.wav`.

The footage is the real app, so a UI change dates a scene: re-capture it (`--scene <name>`),
re-run the project's `prepare.sh`, and re-render.

Captures, audio, `assets/` and renders are gitignored; everything that makes them is committed.

## Rebuild the promo

```sh
cd video && npm install
npm run capture && npm run capture:mobile   # real-app footage (needs Google Chrome)
npm run audio                               # beds (32s, 80s) + SFX
sh today-promo/prepare.sh                   # trim/crop clips into today-promo/assets/ (same for today-onboarding)
cd today-promo
npx hyperframes preview --background        # Studio at http://localhost:3002
npm run check                               # lint, layout, contrast
npx hyperframes render --quality high --output renders/today-promo-16x9.mp4
```

The published copies live in `docs/media/` (README links them). The onboarding video is published as a
web encode (`-c:v libx264 -preset slow -crf 26 -tune stillimage -c:a aac -b:a 128k -movflags +faststart`, ~3.4 MB).
The promo's README GIF is
the story in four beats — hook, check-offs, let go, reward + wordmark — joined by 0.5s fades:

```sh
ffmpeg -i renders/today-promo-16x9.mp4 -filter_complex "
[0:v]trim=1.0:4.2,setpts=PTS-STARTPTS,fps=12,scale=800:-1:flags=lanczos[a];
[0:v]trim=7.4:10.9,setpts=PTS-STARTPTS,fps=12,scale=800:-1:flags=lanczos[b];
[0:v]trim=22.3:26.0,setpts=PTS-STARTPTS,fps=12,scale=800:-1:flags=lanczos[c];
[0:v]trim=28.3:32.0,setpts=PTS-STARTPTS,fps=12,scale=800:-1:flags=lanczos[d];
[a][b]xfade=transition=fade:duration=0.5:offset=2.7[ab];
[ab][c]xfade=transition=fade:duration=0.5:offset=5.7[abc];
[abc][d]xfade=transition=fade:duration=0.5:offset=8.9[v];
[v]split[s1][s2];[s1]palettegen=max_colors=64:stats_mode=diff[p];[s2][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
  -loop 0 ../../docs/media/today-story.gif
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
