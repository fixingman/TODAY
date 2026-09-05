# Motion & Animation

> Animation timing, easing, and philosophy.

---

## Philosophy

Motion in TODAY communicates state, not decoration. It's calm, functional, and deliberate.

**The Breath Pattern** — signature motion: slow, gentle pulse that says "I'm alive, I'm waiting."

```js
// WAAPI, never CSS — see "Looping animations" rule below
el.animate(
  [{ opacity: 1 }, { opacity: 0.65 }, { opacity: 1 }],
  { duration: 1800, easing: 'ease-in-out', iterations: Infinity }
);
```

Why 1.8s: slower than heartbeat, calmer than urgency, matches breathing rhythm.

**Small elements (≤ ~10px) pair opacity with scale — opacity alone doesn't read at that size.**
A shallow luminance dip on a handful of pixels is imperceptible; the scale component is what makes
a small breathe visible. Established treatment (done-star, AI badge, nudge dot as of v2.18.26):
`[{ opacity: 1, transform: 'scale(1)' }, { opacity: 0.5, transform: 'scale(0.85)' }, { opacity: 1, transform: 'scale(1)' }]`, 2400ms.
The opacity-only 1→0.65→1 / 1800ms form is for larger surfaces where luminance change has enough area to register.

**Looping animations must be WAAPI (`_breathe` / `_pulseComplete`), never CSS** (rule since v2.17.103). `_forceRepaint`'s `display:none/block` wake passes restart CSS animations from keyframe 0 — a guaranteed visible flash for anything mid-pulse; BUG-028 burned four sub-fixes proving suppress/restore can't hide it. A WAAPI timeline ignores display toggles. Both helpers gate on `prefers-reduced-motion` in JS. CSS animations remain correct for **one-shots** (slide-in, pop, ripple) — `_onWake` clears their classes mid-flight. The single CSS-suppression survivor in `_forceRepaint` is `.config-panel.open` (one-shot slide-up that would replay each pass, BUG-023). `#errorIndicator`'s `errorPulse` stays CSS by exception: it sits outside `#main-app`, untouched by repaint. Splash animations (`splashCursorBlink`, `splashStarBreath`) converted to WAAPI in v2.17.107 — migration complete.

---

## Timing Tokens

| Token | Value | Usage |
|---|---|---|
| `--dur-fast` | 0.15s | Enter snaps, hover, timer open |
| `--dur-base` | 0.18s | General UI transitions |
| `--dur-mid` | 0.20s | Focus mode exit, fades |
| `--dur-slow` | 0.30s | Recede/reveal, slide-up panels |

---

## Easing

| Token | Value | Usage |
|---|---|---|
| `--ease-out` | cubic-bezier(0.16, 1, 0.3, 1) | Overshoot-free deceleration |
| `--ease-spring` | cubic-bezier(0.34, 1.56, 0.64, 1) | Subtle overshoot for panels |
| `--ease-std` | ease | Generic |

---

## Animation Types

### Tag Shimmer (task-tag-shimmer)
One-shot gradient glint that fires when a tagged task (e.g. `work: ...`) is newly added to the list.

- **Technique:** `background-clip: text` + `background-size: 400% 100%` + `background-position` sweep
- **Gradient:** `--muted 0–47%, --accent 50%, --muted 53–100%` — tight accent peak so only a narrow band lights up
- **Arrival timing:** `500ms`, `100ms` delay, two alternate passes — lets the task's `fadeIn` get underway, catches light in both directions, then returns to neutral
- **Interaction timing:** `400ms`, no delay, one forward pass — desktop `mouseenter`; touch devices trigger once as the tag scrolls into view
- **Easing:** `ease-in-out` — symmetrical; glint accelerates in and decelerates out
- **Trigger/state:** `_queueTagArrivalShimmer()` reserves `data-tag-shimmer="arrival-pending"` synchronously, then starts in viewport. `_playTagShimmer()` owns both arrival and interaction classes and refuses a second animation while one is pending or active. This exclusivity prevents hover from replacing an arrival animation (BUG-075).
- **Colour parity:** `.task-tag-shimmer` and `._soon-shimmer` share one gradient rule. Their motion differs intentionally; their paint must not drift.
- **CSS rule:** looping animations must use WAAPI (see rule above); this is a one-shot, so CSS is correct here

### Task Completion
- Checkbox fills with accent color
- Checkmark SVG pops in: `scale(0.5)→scale(1)` + `opacity:0→1` (`checkPop`, 150ms, GPU-composited). Replaced `stroke-dashoffset` at v2.17.71 — paint-triggered stroke draw lagged during iOS JIT warmup (~30s window).
- Particles drift upward from the completed checkbox centre (ember drift). `fireEmberDrift()` converts CSS client coordinates through the live canvas rect before drawing, because mobile `100dvh` and the backing-buffer height may differ.
- Haptic feedback (success pattern)
- Sound: soft completion tone

### Task Input Bounce
- The native input remains authoritative; an `aria-hidden` mirror supplies the one-shot character bounce.
- Mirror spans and insertion ranges use Unicode grapheme clusters. Never split input with `value[i]` or raw `.length`: those are UTF-16 units and can break emoji, skin-tone modifiers, flags, and ZWJ sequences across DOM nodes.
- IME composition and bulk input remain unanimated; reduced motion skips the mirror module entirely.

### All-Done Celebration
- Accent glow pulse (radial, 1.2s fade)
- Extra particle burst
- Double haptic (150ms apart)

### Focus Mode
- Recede: non-focused tasks fade to 7% opacity, dim first (120ms) then noise-blur (60ms, 120ms delay); exit reverses — blur dissolves before opacity returns, so no opaque-blurry box at any point
- Chrome recedes on the same beat (v2.82.4): morning nudge, triage bar and the sticky header, to 8%. Only the add bar and mic stay crisp
- The header is pinned `position: fixed` for the scroll lock (BUG-098) so it neither disappears nor rides the enter nudge; the body is padded by its height so nothing jumps
- Timer bar pulses gently when complete
- Controls slide up with spring easing

### Date Tag at Midnight (v2.82.2, BUG-097)
- The header date is written once at init and refreshed by `checkNewDay()` at the day boundary via `window._dateTagRefresh(true)`, so a tab left open across midnight follows the day without a reload or a return to the splash.
- Crossfade, deliberately slower than the count flick: fade out `--dur-mid` ease-in, swap text, fade in `--dur-slow` `--ease-out` with a 3px rise. Tokens are read from `:root` at call time so JS and CSS share one clock.
- One-shot, so WAAPI is fine (the looping rule does not apply). `fill: forwards` on the exit is cancelled before the enter so it cannot re-assert. Reduced motion swaps the text with no animation; same-day calls are no-ops.

### New-Day Settle (v2.83.0)
- At the midnight boundary the list used to snap: done rows vanished into Past and age buckets stepped in one frame. Now two beats on the same clock as the date crossfade.
- **Graduation:** rows leaving for Past fade and collapse height and padding to zero over `--dur-slow` / `--ease-out`; the re-render waits for the last one. `fill: forwards` is fine because the rows are replaced wholesale.
- **Age:** after the re-render, rows whose bucket changed ease from the old opacity to the new over a deliberately long 1.2s. The old value is read from the stylesheet by briefly restoring the old bucket, so the opacities live in one place. This is the only time age dimming is visible as motion; every other day you only see its result.
- Both WAAPI: midnight often coincides with a wake repaint, whose display toggle would restart a CSS animation from keyframe 0. Reduced motion skips both. Helpers `_newDaySnapshot` / `_newDayCollapse` / `_newDaySettle` in `day-lifecycle.js`, wired in `checkNewDay()`.

### Idle Companion
- Fade in over 0.6s
- ASCII animation (creature-specific timing)
- Fade out on activity (0.6s)

### Week Grid Bars (v2.17.59)
- `.week-col-bar-fill` height transitions `--dur-slow` / `--ease-out` — bars settle into
  shape rather than snapping when the About panel opens. Communicates the week's rhythm.

---

### Splash Screen Sequence (v2.65.3)

Strict order — each step gates the next:

1. **Fonts ready** → `startSplash()` — star scales in (450ms), typewriter begins (rAF, ~38–60ms/char)
2. **Typewriter done** → cursor blinks 500ms → optional poem coda → `_onSplashAnimDone`
3. **App load done** (`_onAppLoadDone` from window.load sync) → `_doSplashDismiss`
4. **Dismiss fires** — `TO` fades for 250ms; `DAY` starts at 150ms; date starts at 200ms; `sBurst(_burstX, _burstY)` fires at 300ms
5. **Coda exits** — poem lines and author fade for 700ms each with a 250ms stagger, beginning at 300ms
6. **Overlay exits** — after the last coda fade (420ms fallback without coda), splash fades for 420ms
7. **450ms later** — splash DOM and particle canvas are removed; app children reveal with an 80ms stagger

**Canvas coordinate rules:**
- Buffer and drawing coordinates: `innerWidth × innerHeight` CSS pixels; width/height attributes are refreshed on resize
- Never use `inset:0` alone on canvas — some browsers use the `width` attribute as intrinsic CSS size
- Burst origin captured at `startSplash+600ms` (post-transition), not at dismiss time

**Logo reveal = single-unit opacity fade (v2.18.27, BUG-032 seventh pass).** The staggered
per-letter rise (`splashLetterRise`) was removed after six passes of fighting iOS glyph raster.
**Rule: never animate per-letter transforms on text.** Starting a CSS `transform` animation on
iOS/WebKit promotes each letter to its own compositing layer *at animation start* and re-rasters
the glyph at that moment — so glyphs can visibly repaint mid-motion no matter how the reveal is
timed; avoiding `will-change` does not prevent it (the animation itself promotes). Text may fade
(opacity) or appear (typewriter), but per-glyph motion is structurally unsafe. Current model:
`#splash-logo` base `visibility:hidden; opacity:0`; after the fonts gate, `startSplash` flips
visibility (nothing paints — still opacity 0) and fades the whole logo to 1 over `.5s
var(--ease-out)` — one unit, one layer, one raster. Ceiling path (fonts unconfirmed at 2000ms)
reveals statically with no fade.

**Logo exit = two word layers (v2.65.3, BUG-076).** `TO` and `DAY` each have one stable
wrapper and one opacity animation. Never return to separate per-letter opacity animations:
Safari/WebKit could retain `O` and `AY` after later sibling fill states were lost. Exit keyframes
are explicit `1 → 0`, and the underlying inline opacity is also set to zero so a compositor/fill
handoff cannot reveal a completed word. Letter markup remains separate only for the white/accent
colour split; individual letters own no animation.

---

## Rules

1. **Never block interaction** — animations complete async
2. **Meaningful, not decorative** — every motion communicates state
3. **Calm, not urgent** — prefer slow fades over snappy transitions
4. **Respect reduced-motion** — check `prefers-reduced-motion`
