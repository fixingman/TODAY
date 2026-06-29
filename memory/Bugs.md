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
| 037 | Task list appears stale on morning open (day-cleanup backup race) | ✅ v2.17.135 |
| 038 | Red dot appears on mobile when offline (SW update rejection) | ✅ v2.17.136 |
| 039 | All-habits-done celebration never fires (archived habit check) | ✅ v2.17.137 |
| 040 | Morning nudge reappears after dismiss on every wake (self-heal regression) | ✅ v2.17.139 |
| 041 | White flash before dark on mobile cold start (no pre-CSS dark canvas) | ✅ v2.18.7 |
| 042 | Trello card order scrambles across devices (remote-wins, no recency) | ✅ v2.18.4 |
| 043 | Aged Trello card won't un-dim after a focus session (creation-only age) | ⏳ v2.18.8 — second pass awaiting verify |
| 044 | Delayed focus chime when not in focus mode (zombie session on closeUI) | ⏳ v2.18.6 — awaiting verify |

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

## BUG-042: Trello card order scrambles across devices

**Status:** Fixed v2.18.4 — awaiting verify

**Symptom:** Custom Trello card order holds locally during the day but scrambles when a new day arrives / across two devices. Reordering on one device doesn't reliably stick on the other.

**Root cause (long-standing, not a regression — unchanged since v2.12.28):** `trello_order` is written into **every** backup, and `mergeRemoteData` adopted it unconditionally ("remote wins", no recency). So any unrelated write from the other device (checking a task, etc.) re-asserted that device's possibly-stale order, overwriting a fresh local reorder. The two devices never converge on "the latest order." It surfaces hardest at the **day boundary**: `applyNewDayCleanup()` removes `today_trello_cache` (forcing a re-fetch in Trello's native order) and both devices re-fetch + re-sync at once, so the clobber lands visibly.

**Fix (v2.18.4):** Added `today_trello_order_at` (ISO stamp set on reorder), carried in the payload. `mergeRemoteData` now adopts the remote order only if `remote.trello_order_at > local` **or** the device has no local order yet (bootstrap). Empty-string defaults: an untimestamped old-client backup never clobbers a timestamped local order. Full-restore path carries the stamp. Additive field — backward compatible, no schema bump. Neither `today_trello_order` nor `_at` is cleared at day rollover (order persists; re-fetch re-applies it).

**Verify:**
- Two devices, both with Dropbox + same board. Reorder cards on A → B reflects it after a sync. Reorder on B → A reflects it (newest reorder wins, not last writer). Cross a day boundary (or run `applyNewDayCleanup`) → custom order survives on both.

**Verified fixed:** ✅ Jun 2026

**Latent follow-ups (not blocking — fix worked):** (1) `mergeRemoteData` adopts the order in-memory but doesn't rewrite `today_trello_cache`, and the cache-seed path (line ~4988) doesn't re-apply `today_trello_order` — so a freshly-adopted order can look stale for one reload until the next live fetch. (2) The "newer reorder wins" comparison uses each device's own wall clock (`new Date().toISOString()`), so significant clock skew between devices could mis-order adoption. Both are robustness hardening only; revisit if order sync ever regresses.

---

## BUG-043: Aged Trello card won't un-dim after a focus session

**Status:** Fixed v2.18.8 (second pass) — awaiting verify

**Symptom:** A Trello card dimmed by age (3+ days → 75%, etc.) stays dimmed even after a focus session on it. Manual tasks brighten back to full opacity; Trello cards don't.

**Root cause:** The `data-age-bucket` opacity is driven by task age. For **manual** tasks age = `task.lastActive || created`, so activity resets it. For **Trello** tasks age = `_getCreatedFromTrelloId(id)` (creation timestamp, immutable) — so the daily-reset `today_trello_focus` map (`taskId → count`) was introduced as the activity signal. But `today_trello_focus` was only incremented in `_logSession`, which is called by `completeFor` (full 25-min pomodoro) and `_focusOnCheck` (task checked off while focusing). Closing focus via **Escape or task-switch without completing the pomodoro** — the common case — never called `_logSession`, so the count stayed 0 and the card stayed dimmed.

**Fix (v2.18.4 → incomplete):** Wired `today_trello_focus` into `taskHTML` and the 7s patch path to gate the age bucket. Correct logic, but the count was never set for partial focus sessions.

**Fix (v2.18.8 — root cause):** `closeUI` now marks the card engaged (`today_trello_focus[id] = 1`) whenever any focus time was spent (`st.rem < TOTAL`) and the count is still 0. Guard prevents double-increment when a completed pomodoro or `_focusOnCheck` already logged the session (`count > 0` → skip). Instant visual un-dim via `delete closingTask.dataset.ageBucket`; the 7s patch cycle confirms on its next pass.

**Verify:**
- Let a Trello card age ≥3 days (dimmed). Open focus, immediately Escape (< 1 min). Card should un-dim instantly. Full pomodoro path: count should be 1, not 2. Next day with no focus → dimmed again.

**Verified fixed:** ☐

---

## BUG-044: Delayed focus chime when not in focus mode

**Status:** Fixed v2.18.6 — awaiting verify

**Symptom:** On desktop, a focus-session completion chime played — delayed — while the app was not in focus mode (no timer UI showing).

**Root cause:** `closeUI(false)` (focus IIFE, ~line 11341) clears the tick timer (`clearTimeout(tickHandle)`), closes PiP, and nulls `uiTaskId`/`_focusUIActive` — but does **not** set `st.running = false`. With `doResetState=false` the task state persists, leaving a **zombie session**: not ticking, no UI, but still `running` with a live `wallStart`. The click-outside handler stops the session before `closeUI` (lines 11624–11628), but **Escape** (11699), **task-switch** (11262), and line 11983 don't. Later the `visibilitychange` correction (11567–11581) iterates all running states, finds the zombie, jumps `rem` to ≤0, and calls `completeFor` → `playChime()` (11521, unconditional) — a late chime with no focus UI active.

**Fix (v2.18.6):** `closeUI` now stops the closing task's session (`running=false, paused=false, wallStart=null`) right after `_trackFocusTime`, so no zombie survives any closeUI path. `continueTicking` has no callers (no intended background tick) and PiP is closed by closeUI, so after any closeUI there must be no running session — correctness fix, not a behavior change. `_trackFocusTime` (keys on `rem`/`tracked`) and resume-on-reclick (keys on `rem`, 11667) unaffected. Also fixes a latent "switch A→B leaves A running." No `_focusUIActive` guard on the chime (would mute the legitimate PiP completion chime, line 12102).

**Verify:**
- Start a focus session, press Escape (UI closes). Re-open the task → resumes at its remaining time, no double state. No completion fires.
- Chime case (needs `rem` to cross 0 while away): temporarily lower `TOTAL` or set `st.rem` small via DevTools, start a session, Escape, switch tabs past zero, return → **no chime**. Before the fix it fired on return.
- Regression: foreground completion (and hidden-tab pomodoro with UI open) still chimes; PiP completion still chimes.

**Verified fixed:** ☐
