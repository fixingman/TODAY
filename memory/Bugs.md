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
| 032 | Splash logo appears mid-way through splash animation (mobile) | ⏳ refix v2.17.130 — awaiting verification |
| 033 | Morning nudge missing on first cold-start of the day | ⏳ v2.17.125 — awaiting morning verify |
| 034 | Morning nudge AI text swaps mid-read (Tier 1→2 upgrade) | ⏳ v2.17.125 — awaiting morning verify |
| 035 | Trello cards never age visually (omission — type guard excluded them) | ✅ v2.17.127 |
| 036 | This Week data differs web vs mobile (daily_history local-only) | ✅ v2.17.132 |

---

*Verified bugs → `archive/Bugs-archive.md`. Below: bugs still awaiting verification.*

---

## BUG-030: Checkmark animation lags ~30s on iOS PWA open

**Status:** Fixed v2.17.105

**Symptom:** For the first ~20s after iOS cold start, checking a task produces a janky/stuttery checkmark animation. Smooth after ~20s.

**History:** Originally fixed v2.17.71/72 (stroke-dashoffset → WAAPI transform+opacity + `clearRect` pre-warm). Re-opened Jun 2026 — jank still reproducible on device.

**Root cause (remaining gaps after v2.17.71/72):**
1. Canvas pre-warm only ran `clearRect(0,0,1,1)` — warms the clear-rect Metal shader but not `createRadialGradient`, `arc`/`fill`, or `fillText`. Those compiled mid-animation on first `celebAnimate` RAF frame, causing GPU stalls during the 150ms `checkPop` WAAPI playback.
2. `_iosHaptic()` created `<input type="checkbox" switch>` lazily on first call — DOM append + style recalc inside the task check handler, before `svg.animate()`.

**Fix (v2.17.105):** Pre-warm now runs all three draw op types at off-screen coordinates (-1000,-1000). Haptic switch element created eagerly at IIFE init time.

**Verify:**
- Force-quit iOS PWA, reopen cold
- Within first 5 seconds, check a task → checkmark pops crisply, no stutter or jank
- Should feel identical at 5s and at 60s

**Verified fixed:** ✅ Jun 2026

---

## BUG-032: Splash logo appears mid-way through splash animation (mobile)

**Status:** Refixed v2.17.130 — awaiting verification (four passes: v2.17.97, v2.17.112, v2.17.126, v2.17.130; see notes below)

**Symptom:** Sometimes on mobile, the TODAY logo appears mid-way through the splash animation (partially improved from v2.17.97/112 which fixed the downward-shift variant). The letter-rise animation occasionally starts late or logo appears unexpectedly during the sequence. Intermittent on cold start. Never on desktop.

**Root cause (two parts):**
1. The logo letters' rise animation started immediately from page render (CSS `animation-delay` from .06s), but the typewriter waits for `document.fonts.ready`. On mobile cold starts Syne isn't loaded yet, so the logo rendered in the fallback font; when Syne arrived the swap changed the logo block's metrics, and `#splash` (`justify-content: center`) re-centered the column — a visible shift right before typing starts. Desktop has fonts cached → never reproduces.
2. `startSplash` could fire twice when fonts take >800ms: the fallback timeout fires it, then `fonts.ready.then()` fires it again (the `clearTimeout` only helps if fonts win the race) — restarting the star transition and double-running the typewriter rAF loop.

**Fix (v2.17.97):** Letter-rise animation moved behind a `#splash-logo.go` gate; `startSplash` adds the class after fonts are ready, so the logo only ever renders in Syne. `_splashStarted` guard makes `startSplash` idempotent.

**Recurrence + refix (v2.17.112):** v2.17.97 gated `.go` on `document.fonts.ready`, but iOS Safari is known to resolve `.ready` *before* custom fonts actually paint on cold start. So `.go` revealed the letters in the fallback font and Syne swapped in a frame later; with `#splash-logo` at `line-height: 1` and tall Syne 800 glyphs, the swap repositions glyphs *within* the (constant-height) line box — the residual downward shift. Refix: gate on the specific faces via `document.fonts.load('800 96px Syne', 'TODAY')` + `document.fonts.load('300 13px "DM Mono"', 'JANUARY')` (`FontFaceSet.load()` resolves only when those faces are truly loaded — reliable on Safari), keeping the 800ms cap + `_splashStarted` guard. Also added `<link rel="preload">` for both splash woff2 files so they fetch before first paint.

**Third pass — corrected mechanism + refix (v2.17.126):** Can reported the logo still "appears mid-way through the splash animation" intermittently on mobile. Re-investigation found the earlier diagnosis was wrong: all `@font-face` rules use `font-display: block`, which renders glyphs **invisibly** (never in a fallback face) until the real font paints — so there is no fallback→Syne *position* swap. The true mechanism is a **desync between the rise animation and font paint**: the `splashLetterRise .4s` animation starts when `.go` is added, but the glyphs stay invisible until Syne paints. If Syne lands *mid-animation*, the logo appears partway through its rise (partial opacity/position) → "appears mid-way." The v2.17.112 `document.fonts.load()` gate was correct *when it won the race*, but the blind `setTimeout(startSplash, 800)` fallback could fire first on a slow cold start, adding `.go` before Syne painted — the leak that kept the bug intermittent. **Fix:** replaced the load+800ms-timeout race with a `requestAnimationFrame` poll of `document.fonts.check('800 96px Syne') && check('300 13px "DM Mono"')` — `.go` is added only on a frame where both faces are genuinely usable, so the rise always plays from `opacity:0` with visible glyphs. Generous **2500ms** ceiling (replacing 800ms) makes the leak vanishingly rare and stays under the 6s dismiss safety net; the ceiling path reveals the logo statically via a new `#splash-logo.go.instant .l { animation:none; opacity:1; transform:none }` modifier rather than stalling — so even then there's no mid-rise pop. `startSplash` now takes an `animated` flag.

**Fourth pass — glyph raster pre-warm (v2.17.130):** Can reported the rise still wasn't smooth — the glyphs became visible on the *same frame* the animation starts. Root: `document.fonts.check()` confirms the *face* is loaded, but the glyph raster cache is **per-size** and the logo renders at `clamp(48px,9vw,96px)`, not the `96px` we check. So the first paint at the real rendered size landed on frame 1 of the rise → rasterisation and animation start collided (stutter). **Fix:** in `startSplash` (animated path only), paint the real `.l` letters once at `opacity:0.02` (imperceptible — only exactly `0` is compositor-skipped), force layout via `offsetWidth`, then on the next `requestAnimationFrame` revert opacity to the CSS base and add `.go`. The rise now runs on already-rasterised glyphs at the exact size. ~16ms (one frame) cost, no new assets. `instant` ceiling path unchanged (font not ready → nothing to warm). Canvas pre-warm was rejected: raster cache is keyed by element+size, so only warming the real letters at their real `clamp()` size populates the cache the rise paints from.

**Verify:**
- Mobile PWA cold start (force-quit first, ideally on slow network), repeat → logo rises smoothly from invisible to full; no glyph pop coinciding with the motion start
- Desktop / warm cache: fast rise, unchanged; no perceptible delay before the rise (warm frame ≈ 16ms)
- Slow network (DevTools throttle + disable cache): rise still clean; at worst the 2500ms ceiling reveals it statically

**Verified fixed:** ☐

---

## BUG-033: Morning nudge missing on first cold-start of the day

**Status:** Fixed v2.17.125

**Symptom:** Cold-start the app in the morning — nudge doesn't appear. Switch away and back → nudge appears via `_onWake()`.

**Root cause:** `morning_nudge_count` is set by `applyNewDayCleanup()`, which runs in the sync startup block *after* `init()` has already called `checkMorningNudge()`. If the user dismissed yesterday's nudge (click removes the key), `init()`'s call finds no count and hides the nudge. `applyNewDayCleanup()` recalculates the count from current tasks but `checkMorningNudge()` is not called afterward — nudge never appears until `_onWake()` fires on next focus. Dropbox restore path already fixed this for Dropbox users (line 8700 calls `checkMorningNudge()`); local-only path and Dropbox-failed-restore fallback were missing it.

**Fix:** Added `if (typeof checkMorningNudge === 'function') checkMorningNudge()` after `applyNewDayCleanup()` in the sync startup block (~line 8955). Idempotent — safe even if Dropbox path already ran it.

**Verify:**
- Click the nudge to dismiss it (removes `morning_nudge_count` from localStorage). Close the tab fully. Reopen the app before noon with undone tasks → nudge should appear immediately on first load, without needing to switch away and back.

**Verified fixed:** ☐

---

## BUG-034: Morning nudge AI text swaps mid-read (Tier 1→2 upgrade)

**Status:** Fixed v2.17.125

**Symptom:** User is reading the rule-based nudge message; 1–5 seconds later the text fades out and is replaced by the AI-generated version. Surprising/jarring even with the 200ms fade.

**Root cause:** `checkMorningNudge()` always performs the DOM swap when the AI fetch resolves, regardless of how long the nudge has been visible. No guard on elapsed time.

**Fix:** Added `const _nudgeShownAt = Date.now()` before the async `_fetchMorningNudgeAI()` call. In the `.then()` callback, if `Date.now() - _nudgeShownAt > 3000`, the DOM swap is skipped. AI text is still written to localStorage cache — shows immediately (no swap) on the next cold start.

**Verify:**
- Delete `morning_nudge_ai_<today>` from localStorage (DevTools → Application → Local Storage). Reload app before noon with undone tasks. Read the rule-based message. Wait 5+ seconds without switching away → message should NOT change. Reload → AI-cached message shows immediately, no transition.

**Verified fixed:** ☐

---

## BUG-036: This Week data differs between web app and mobile app

**Status:** Fixed v2.17.132

**Symptom:** The "This Week" grid in About shows different past-day tallies (tasks/focus/habits) on the web app vs the mobile app. Today's column matches; prior days diverge.

**Root cause:** The week grid reads per-day snapshots from `today_daily_history` for past days (today's column is computed live from counters, which ARE synced — hence today matches). But `today_daily_history` was **local-only**: it was never included in the Dropbox backup payload. Each device writes its own snapshot of "yesterday" in `applyNewDayCleanup()` when it first opens after midnight, and those snapshots never crossed devices — so each device accumulated its own independent week history.

**Fix:** Added `daily_history` to the Dropbox backup (schema **5.2 → 5.3**) and union-merged it on both restore paths (`mergeRemoteData()` and the full-restore block) via new helper `_mergeDailyHistory(local, remote)`: union by date, on a duplicate date keep the richer snapshot (higher `tasksDone`, tiebreak `focusMins`) so each entry stays internally consistent rather than mixing fields across devices; cap 30 days. Backward compatible — no schema-version gating exists, old clients ignore the field, new clients tolerate its absence (`|| []`).

**Verify:**
- On two devices both connected to Dropbox: confirm the week grid (and `_getWeeklyStats` totals) show identical past-day values after a sync cycle. A day one device missed (was off) should appear after the other device's history syncs in.

**Verified fixed:** ☐

