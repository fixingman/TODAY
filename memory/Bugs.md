# Bugs

> Full history for verified bugs → `Bugs-archive.md`

## Status Summary

| # | Description | Status |
|---|---|---|
| 001 | Triage dismissed cross-device | ✅ v2.12.59–60 |
| 002 | Dropbox sync fails silently | ✅ v2.12.58–61 |
| 003 | Red dot on network loss | ✅ v2.12.58–2.14.1 |
| 004 | App blank after sleep/wake | ✅ v2.17.24 |
| 005 | Trello pomodoro badge vanishing | ✅ v2.12.56–66 |
| 006 | _onWake() consolidation | ✅ v2.17.0 |
| 007 | Triage bar flash after triage | ✅ v2.13.2–2.16.6 |
| 008 | Drag jump-back on mobile | ✅ v2.12.72 |
| 009 | Task aging opacity broken | ✅ v2.12.73 |
| 010 | Habits didn't roll over | ✅ v2.12.74–77 |
| 011 | PiP ghost chime on wrong task | ✅ v2.16.9 |
| 012 | Overdue Trello card disappears on check | ✅ v2.16.5 |
| 013 | Focus timer jumps on restore | ✅ v2.14.9 |
| 014 | PiP not reappearing after restore | ✅ v2.15.5–2.16.19 |
| 015 | AI repeats same aging task | ✅ v2.15.2 |
| 016 | AI chip labels generic | ✅ v2.15.6 |
| 017 | Focus minutes only on full completion | ✅ v2.16.0 |
| 018 | Phantom SOON tasks reappear | ✅ v2.17.9 |
| 019 | Star explosion missing on mobile | ✅ v2.17.29 |
| 020 | Streak double-counts across devices | ✅ v2.17.26 |
| 021 | Splash explosion invisible / freezes after typewriter | ✅ v2.17.27–29 |
| 022 | Focus fill bar pulsates during active countdown | ✅ v2.17.36 |
| 023 | Top panels flash twice on desktop PWA restore | ✅ v2.17.37 |
| 024 | Focus minutes carry over to next day | ✅ v2.17.48 |
| 025 | PiP "Again" lost / shows 25:00 after sleep/wake | ✅ v2.17.52 |
| 026 | Habit re-checks itself after uncheck | ✅ v2.17.53 |
| 027 | Trello focus timer — re-open idle 25:00 + completed bar stops pulsing | ✅ v2.17.62 |
| 028 | Completed bar flash/pause on window return (final: WAAPI pulse) | ✅ v2.17.94 |
| 029 | `_aiSendFromInput` undefined — crash on ✦ submit with text | ✅ v2.17.64 |
| 029b | ✦ submit answer swapped by proactive load racing it | ✅ v2.17.93 |
| 030 | Checkmark animation lags ~30s on iOS PWA open | ✅ v2.17.105 |
| 031 | Red error dot invisible on mobile PWA (behind status bar) | ✅ v2.17.75 |
| 032 | Splash logo appears mid-way through splash animation (mobile) | ⏳ refix v2.17.133 — awaiting verification |
| 033 | Morning nudge missing on first cold-start of the day | ✅ v2.17.125 |
| 034 | Morning nudge AI text swaps mid-read (Tier 1→2 upgrade) | ✅ v2.17.125 |
| 035 | Trello cards never age visually (omission — type guard excluded them) | ✅ v2.17.127 |
| 036 | This Week data differs web vs mobile (daily_history local-only) | ✅ v2.17.132 |
| 037 | Task list appears stale on morning open (day-cleanup backup race) | ⏳ v2.17.135 — awaiting morning verify |
| 038 | Red dot appears on mobile when offline (SW update rejection) | ⏳ v2.17.136 — awaiting verify |
| 039 | All-habits-done celebration never fires (archived habit check) | ⏳ v2.17.137 — awaiting verify |

---

*Verified bugs → `archive/Bugs-archive.md`. Below: bugs still awaiting verification.*

---

## BUG-032: Splash logo appears mid-way through splash animation (mobile)

**Status:** Refixed v2.17.133 — awaiting verification (five passes: v2.17.97, v2.17.112, v2.17.126, v2.17.130, v2.17.133; see notes below)

**Symptom:** Sometimes on mobile, the TODAY logo appears mid-way through the splash animation (partially improved from v2.17.97/112 which fixed the downward-shift variant). The letter-rise animation occasionally starts late or logo appears unexpectedly during the sequence. Intermittent on cold start. Never on desktop.

**Root cause (two parts):**
1. The logo letters' rise animation started immediately from page render (CSS `animation-delay` from .06s), but the typewriter waits for `document.fonts.ready`. On mobile cold starts Syne isn't loaded yet, so the logo rendered in the fallback font; when Syne arrived the swap changed the logo block's metrics, and `#splash` (`justify-content: center`) re-centered the column — a visible shift right before typing starts. Desktop has fonts cached → never reproduces.
2. `startSplash` could fire twice when fonts take >800ms: the fallback timeout fires it, then `fonts.ready.then()` fires it again (the `clearTimeout` only helps if fonts win the race) — restarting the star transition and double-running the typewriter rAF loop.

**Fix (v2.17.97):** Letter-rise animation moved behind a `#splash-logo.go` gate; `startSplash` adds the class after fonts are ready, so the logo only ever renders in Syne. `_splashStarted` guard makes `startSplash` idempotent.

**Recurrence + refix (v2.17.112):** v2.17.97 gated `.go` on `document.fonts.ready`, but iOS Safari is known to resolve `.ready` *before* custom fonts actually paint on cold start. So `.go` revealed the letters in the fallback font and Syne swapped in a frame later; with `#splash-logo` at `line-height: 1` and tall Syne 800 glyphs, the swap repositions glyphs *within* the (constant-height) line box — the residual downward shift. Refix: gate on the specific faces via `document.fonts.load('800 96px Syne', 'TODAY')` + `document.fonts.load('300 13px "DM Mono"', 'JANUARY')` (`FontFaceSet.load()` resolves only when those faces are truly loaded — reliable on Safari), keeping the 800ms cap + `_splashStarted` guard. Also added `<link rel="preload">` for both splash woff2 files so they fetch before first paint.

**Third pass — corrected mechanism + refix (v2.17.126):** Can reported the logo still "appears mid-way through the splash animation" intermittently on mobile. Re-investigation found the earlier diagnosis was wrong: all `@font-face` rules use `font-display: block`, which renders glyphs **invisibly** (never in a fallback face) until the real font paints — so there is no fallback→Syne *position* swap. The true mechanism is a **desync between the rise animation and font paint**: the `splashLetterRise .4s` animation starts when `.go` is added, but the glyphs stay invisible until Syne paints. If Syne lands *mid-animation*, the logo appears partway through its rise (partial opacity/position) → "appears mid-way." The v2.17.112 `document.fonts.load()` gate was correct *when it won the race*, but the blind `setTimeout(startSplash, 800)` fallback could fire first on a slow cold start, adding `.go` before Syne painted — the leak that kept the bug intermittent. **Fix:** replaced the load+800ms-timeout race with a `requestAnimationFrame` poll of `document.fonts.check('800 96px Syne') && check('300 13px "DM Mono"')` — `.go` is added only on a frame where both faces are genuinely usable, so the rise always plays from `opacity:0` with visible glyphs. Generous **2500ms** ceiling (replacing 800ms) makes the leak vanishingly rare and stays under the 6s dismiss safety net; the ceiling path reveals the logo statically via a new `#splash-logo.go.instant .l { animation:none; opacity:1; transform:none }` modifier rather than stalling — so even then there's no mid-rise pop. `startSplash` now takes an `animated` flag.

**Fourth pass — glyph raster pre-warm (v2.17.130):** Can reported the rise still wasn't smooth — the glyphs became visible on the *same frame* the animation starts. Root: `document.fonts.check()` confirms the *face* is loaded, but the glyph raster cache is **per-size** and the logo renders at `clamp(48px,9vw,96px)`, not the `96px` we check. So the first paint at the real rendered size landed on frame 1 of the rise → rasterisation and animation start collided (stutter). **Fix:** in `startSplash` (animated path only), paint the real `.l` letters once at `opacity:0.02` (imperceptible — only exactly `0` is compositor-skipped), force layout via `offsetWidth`, then on the next `requestAnimationFrame` revert opacity to the CSS base and add `.go`. The rise now runs on already-rasterised glyphs at the exact size. ~16ms (one frame) cost, no new assets. `instant` ceiling path unchanged (font not ready → nothing to warm). Canvas pre-warm was rejected: raster cache is keyed by element+size, so only warming the real letters at their real `clamp()` size populates the cache the rise paints from.

**Fifth pass — transform-only reveal, fix the class not the timing (v2.17.133):** Can reported glyphs STILL paint *during* the animation. Root insight: all four prior passes tried to *time* `.go` to a `document.fonts` signal, but on iOS the API reports "loaded" before WebKit rasterises the glyphs at the real rendered size (`clamp(48px,9vw,96px)`; we checked at 96px), and `font-display:block` keeps the box blank until raster lands — so the per-letter **opacity** ramp always raced the real paint. The `opacity:0.02` warm (v2.17.130) was compositor-skippable. **Fix (eliminates the class):** (1) `#splash-logo` is `visibility:hidden` until ready — stays in layout so the FontFaceSet loads, but nothing paints (also kills the v2.17.97/112 fallback-metrics shift). (2) Gate switched from the `fonts.check()` poll back to the `fonts.load()` **promise** (reliable on Safari), raced against the 2000ms ceiling via `Promise.race`; `_splashStarted` makes a late resolve a no-op. (3) `startSplash` flips to `visible` at the start position with `.l` now `opacity:1`, forces an in-view raster across two `requestAnimationFrame`s (a genuine full-opacity paint, not 0.02), THEN fades the **whole container** in as one unit (all glyphs already rastered → none can paint mid-fade) while a **transform-only** keyframe runs the staggered rise (`from translateY(0.12em)` byte-identical to `.l` base → no 1-frame jump; no opacity in the keyframe). Star/cursor/typewriter start immediately; the double-rAF gates only `.go` → no perceptible startup delay. `.instant` ceiling path drops opacity (base is 1). Option B (container fade) chosen over pure solid-slide to keep the soft feel.

**Verify:**
- Mobile PWA cold start (force-quit first, ideally on slow network), repeat → logo appears solid (font already painted) and fades+rises as one unit; glyphs never paint/appear partway through the motion
- Desktop / warm cache: unchanged feel, no perceptible delay before the reveal
- Slow network (DevTools throttle + disable cache): reveal still clean; at worst the 2000ms ceiling reveals it statically (no rise)

**Verified fixed:** ☐

---

## BUG-037: Task list appears stale on morning open (day-cleanup backup race)

**Status:** Fixed v2.17.135 — awaiting morning verify

**Symptom:** On morning open (app resuming from background on a new day), the task list shows yesterday's state — tasks completed on another device are missing. Doesn't self-correct during use; only resolves when the other device makes another Dropbox write.

**Root cause:** The `visibilitychange` path calls `checkNewDay()` **before** `syncDropbox()`. When `checkNewDay()` detects a new day it calls `applyNewDayCleanup()`, which fires `dropboxBackup(true)` without `await`. If that upload completes before `syncDropbox()`'s metadata fetch returns, `syncDropbox()` then downloads the device's own just-uploaded (stale) data — `lastDropboxRev` is updated to the stale rev, and the 7-second ticker sees no further rev change, leaving the task list stuck until another device writes.

The `window.load` path is unaffected — it pulls Dropbox first, then calls `applyNewDayCleanup()`. `zoneChangedAt` timestamps protect done→PAST moves independently, so the delayed backup is safe.

**Fix (v2.17.135):** Wrapped the cleanup `dropboxBackup(true)` call in a `setTimeout(..., 3000)`, giving `syncDropbox()` time to complete its pull first. 3s matches the existing triage grace window (`_triageBarSilent`) — same race class, same fix.

**Verify:**
- Tomorrow morning, open mobile before touching the computer. Task list should immediately show the computer's latest tasks without needing any further interaction.

**Verified fixed:** ☐

---

## BUG-038: Red dot appears on mobile when offline (SW update rejection)

**Status:** Fixed v2.17.136 — awaiting verify

**Symptom:** Going offline on mobile PWA triggers the red error dot. Tapping it shows a message about sw.js failing to load.

**Root cause (two gaps):**
1. Both `reg.update()` calls (30-min interval and visibilitychange) had no `.catch()`. On iOS Safari, unhandled rejections from SW update checks can route through `window.onerror` instead of `unhandledrejection`.
2. `window.onerror` had no network-error filter — it always showed the red dot. The `unhandledrejection` handler already had the filter (including `'Failed to update a ServiceWorker'`), but `window.onerror` didn't.

**Fix (v2.17.136):** Added `.catch(() => {})` to both `reg.update()` calls. Added the same network-error string filter to `window.onerror` that already existed in `unhandledrejection`.

**Verify:**
- Go offline on mobile PWA. Switch away and back (triggers visibilitychange → reg.update()). Red dot should NOT appear.

**Verified fixed:** ☐

---

## BUG-039: All-habits-done celebration never fires

**Status:** Fixed v2.17.137 — awaiting verify

**Symptom:** Completing the last habit of the day produces no glow, no extra embers, no extra haptic — just the normal single-habit celebration.

**Root cause:** `toggleHabitDone()` checked `habitsList.every(h => ...)` which includes archived habits. Archived habits have no completion for today, so `allDone` was permanently `false` for any user who had ever archived a habit. Broke silently when habit archiving landed in v2.17.106.

**Fix (v2.17.137):** Added `const activeHabits = habitsList.filter(h => !h.archived)` before the check, then used `activeHabits` in both the length guard and `.every()`. Matches the pattern already used in `renderHabits()`.

**Verify:**
- Archive at least one habit. Complete all remaining (non-archived) habits. On the last check: accent glow should pulse, extra haptic fires, 3 ember bursts from the checkbox.

**Verified fixed:** ☐
