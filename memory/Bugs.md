# Bugs

> Full history for verified bugs → `Bugs-archive.md`

## Status Summary

| # | Description | Status |
|---|---|---|
| 061 | Sunday/habit badges silently fail to show on a fresh device (same root cause as BUG-060) | ⏳ v2.37.8 |
| 060 | Completed Trello card (overdue) reappears as active on a fresh device connect | ⏳ v2.37.7 |
| 059 | Task card age reset by sync after focus — card re-dims on refresh | ✅ v2.36.5 |
| 058 | Noticed block in About shows different content between devices | ✅ v2.36.3 |
| 057 | About "This week" / "New week" AI text differs between devices (cache never synced) | ✅ v2.36.1 |
| 056 | BUG-004 recurrence — blank app after long Mac sleep (GPU wakeup too slow for 1500ms repaint ceiling) | ✅ v2.31.9 |
| 055 | Done tasks from today wiped on second-device first-open | ✅ v2.30.1 |
| 054 | Phantom old tasks resurrect in TODAY list via sync merge | ✅ v2.23.6 |
| 053 | Morning nudge dismissal not synced across devices | ✅ v2.18.38 |
| 052 | Splash dismissal slow — sync bookkeeping held the gate | ✅ v2.18.36 |
| 051 | Trello nudge dismissal not synced across devices | ✅ v2.18.23 |
| 050 | Sticky section headers — too low / mid-page snap / jitter / safe area / departure snap (seven passes) | ✅ v2.33.8 |
| 049 | New Trello card looks aged on arrival | ✅ v2.18.22 |
| 048 | Trello card aging not synced across devices | ✅ v2.18.17 |
| 047 | Dropbox connect on fresh install doesn't auto-restore | ✅ v2.18.16 |
| 046 | Trello board selector / Dropbox buttons flicker | ✅ v2.18.15 |
| 045 | Done-today count inflates | ✅ v2.18.21 |
| 044 | Delayed focus chime after Escape/task-switch | ✅ v2.18.6 |
| 043 | Aged card won't un-dim after focus session | ✅ v2.18.11, v2.18.17 |
| 042 | Trello card order scrambles across devices | ✅ v2.18.4 |
| 041 | White flash / splash logo from top on mobile (second pass) | ⏳ v2.27.0 |
| 040 | Morning nudge reappears after dismiss | ✅ v2.17.139 |
| 039 | All-habits-done celebration never fires | ✅ v2.17.137 |
| 038 | Red dot on mobile when offline | ✅ v2.17.136 |
| 037 | Task list stale on morning open | ✅ v2.17.135 |
| 036 | This Week differs web vs mobile | ✅ v2.17.132 |
| 035 | Trello cards never age visually | ✅ v2.17.127 |
| 034 | Morning nudge AI text swaps mid-read | ✅ v2.17.125 |
| 033 | Morning nudge missing on first cold-start | ✅ v2.17.125 |
| 032 | Splash logo appears mid-animation on mobile | ✅ v2.18.27 |
| 031 | Red error dot invisible on mobile PWA | ✅ v2.17.75 |
| 030 | Checkmark animation lags ~30s on iOS PWA open | ✅ v2.17.105 |
| 029b | ✦ submit answer swapped by proactive load race | ✅ v2.17.93 |
| 029 | `_aiSendFromInput` undefined — crash on ✦ submit | ✅ v2.17.64 |
| 028 | Completed bar flash/pause on window return | ✅ v2.17.94 |
| 027 | Trello focus timer resets on re-open | ✅ v2.17.62 |
| 026 | Habit re-checks itself after uncheck | ✅ v2.17.53 |
| 025 | PiP "Again" lost / shows 25:00 after sleep/wake | ✅ v2.17.52 |
| 024 | Focus minutes carry over to next day | ✅ v2.17.48 |
| 023 | Top panels flash twice on desktop PWA restore | ✅ v2.17.37 |
| 022 | Focus fill bar pulsates during active countdown | ✅ v2.17.36 |
| 021 | Splash explosion invisible / freezes after typewriter | ✅ v2.17.27–29 |
| 020 | Streak double-counts across devices | ✅ v2.17.26 |
| 019 | Star explosion missing on mobile | ✅ v2.17.29 |
| 018 | Phantom SOON tasks reappear | ✅ v2.17.9 |
| 017 | Focus minutes only on full completion | ✅ v2.16.0 |
| 016 | AI chip labels generic | ✅ v2.15.6 |
| 015 | AI repeats same aging task | ✅ v2.15.2 |
| 014 | PiP not reappearing after restore | ✅ v2.15.5–2.16.19 |
| 013 | Focus timer jumps on restore | ✅ v2.14.9 |
| 012 | Overdue Trello card disappears on check | ✅ v2.16.5 |
| 011 | PiP ghost chime on wrong task | ✅ v2.16.9 |
| 010 | Habits didn't roll over | ✅ v2.12.74–77 |
| 009 | Task aging opacity broken | ✅ v2.12.73 |
| 008 | Drag jump-back on mobile | ✅ v2.12.72 |
| 007 | Triage bar flash after triage | ✅ v2.13.2–2.16.6 |
| 006 | `_onWake()` consolidation | ✅ v2.17.0 |
| 005 | Trello pomodoro badge vanishing | ✅ v2.12.56–66 |
| 004 | App blank after sleep/wake | ✅ v2.17.24 |
| 003 | Red dot on network loss | ✅ v2.12.58–2.14.1 |
| 002 | Dropbox sync fails silently | ✅ v2.12.58–61 |
| 001 | Triage dismissed cross-device | ✅ v2.12.59–60 |

---

*Verified bugs → `archive/Bugs-archive.md`. Below: bugs still awaiting verification.*

---

## BUG-061: Sunday/habit badges silently fail to show on a fresh device

**Symptom:** Found by audit after BUG-060, not yet reported in the wild. On a genuinely fresh device, the week-reflection badge (Sun/Mon) and the habits-button badge (10pm–3am) can silently fail to light up even when real, synced data exists that should trigger them.

**Root cause:** Same family as BUG-060. `checkSundayNudge()` reads `today_daily_history` and `checkHabitNudge()` reads `habitsList`/`habitCompletions` — both genuinely Dropbox-synced (backup payload + merge logic in `mergeRemoteData`), both module-level variables initialized once from local (pre-sync) `localStorage` at script-parse time. Both functions are called only from `init()` (`index.html:5251-5252`), which runs before the Dropbox restore lands — so on a fresh device they read empty/stale local state and simply return early (`if (!...length) return`), no badge. Unlike BUG-060, this is a false negative (something that should show, doesn't) rather than a false positive (something that shouldn't show, does) — same architectural gap, softer symptom. Neither function was ever added to the post-merge re-check pattern already established for `checkTriageBar()`/`checkDayNudge()`.

**Fix (v2.37.8):** added `checkSundayNudge()` and `checkHabitNudge()` calls alongside the existing `checkDayNudge()` re-check, at both post-merge points (Dropbox restore path and the primary cold-start load handler).

**Verify:** On a Sunday, Monday, or during 10pm–3am with real synced habit/week data, do a fresh PWA install / fresh Dropbox connect on a new device. The relevant badge should appear once sync settles, not require a manual refresh or reopen.

---

## BUG-060: Completed Trello card reappears as active on a fresh device connect

**Symptom:** Can connected TODAY on a new desktop PWA; an old Trello task — already completed in TODAY, with a due date well in the past — showed up on the list as if still active.

**Root cause:** `loadTrello()` fires from `init()` (`index.html:5269`), which runs before the Dropbox restore lands. On a genuinely fresh device, `doneIds` (`index.html:3900`) is still an empty `Set` at that moment — nothing has restored `today_checked_ids` yet. The Trello fetch's own done-filter (`assets/trello.js`) checks `doneIds.has(id)`, finds nothing, and the overdue card passes the "overdue, not done → show" branch. It gets cached to `today_trello_cache` and rendered as active.

This would normally self-correct within one 7-second ticker cycle, except it can't: `syncTrello()` only re-fetches Trello when the board's own `dateLastActivity` changes, and that gets *seeded* to the current value right at load (`index.html:9115`), before the Dropbox merge even runs. Since the task was only ever completed inside TODAY — the actual Trello card was never archived or moved on the real board — `dateLastActivity` never changes again. The phantom card is stuck showing until something else happens to touch that board, or the user manually clicks Refresh.

Same bug class as `checkTriageBar()`/`checkDayNudge()` needing a post-merge re-check (see the `window 'load'` handler's existing "init() ran too early" comments) — `loadTrello()` had just never been given the same treatment.

**Fix (v2.37.7):** new `_reconcileTrelloAfterMerge()` in `trello.js`, called right after `mergeRemoteData()` in the load handler. Re-filters the already-loaded `trelloTasks` against the now-correct `doneIds`, using the identical done+grace-window rule `loadTrello()` itself uses (done, but checked today → still show; done and not checked today → hide). No extra Trello API call — purely a local re-filter of what's already in memory.

**Verify:** On a device where a Trello task was completed in TODAY (but never archived on the actual Trello board) and has a due date in the past, do a fresh PWA install / fresh Dropbox+Trello connect on a new device. The card should not appear, even momentarily.

---

## BUG-041: White flash / splash logo from top on mobile (second pass)

**Symptom:** Brief white flash at the very beginning of the splash animation, and the logo / star appears to come from the top of the screen rather than fading in at its final centered position. Reported after v2.27.0 on iOS PWA.

**Root cause (second pass — v2.27.0 fix):** The `#splash-star` element's `opacity` and `transform` CSS transitions were set *outside* the `requestAnimationFrame` callback that queues the logo's opacity fade. iOS WebKit immediately promotes the star to its own compositing layer when a `transform` transition starts. Because this happened one frame before the logo's `opacity: 0 → 1` baseline was committed, the star composited *independently* — its own `opacity: 0 → 1` ran at full brightness without being multiplied by the parent logo's `opacity: 0`. The star has a `fill="white"` inner path (`opacity=".18"` in SVG), and at `transform: scale(0.3)` (initial state, top-right corner of logo) this briefly flashed white against the dark background. That flash + the growing transform from small to large read as "something white coming from the top."

**First pass (v2.18.13):** Fixed the pre-web-content cold-start white frame (system launch image → WebView transition). Different symptom, same bug family.

**Fix (v2.27.0 second pass):** Moved the star's `transition`/`opacity`/`transform` assignments inside the `requestAnimationFrame` callback alongside the logo's opacity transition. Both transitions now start in the same frame, so iOS composites them together under the logo's `opacity: 0` baseline. Ceiling path (no animation) keeps immediate star reveal.

**Verify:** Open app on iOS PWA from cold start (or after clearing the day's splash cache). No white flash, no logo/star appearing from the top — smooth single-unit fade from black.

**Third pass (v2.32.1) — persists on iPhone 14 Pro after PWA re-add (2026-07-17).** Two symptoms reported: (a) brief white flash in light mode only, (b) logo letters appear to come down from above during the reveal. 14 Pro (393×852@3x) IS in the startup-image list and the PWA was re-added, so the launch-image path should now be active — (a) needs a fresh light-mode cold-start test. For (b): the reveal code has no letter motion (single-unit opacity fade since v2.18.27), so visible downward motion can only come from the whole column moving mid-fade. Mechanism: `#splash` is `fixed; inset: 0` and `#splash-inner` centers via `margin: auto 0` — on iOS PWA cold start the viewport settles (grows under the status bar) a few frames after first paint, and since fonts are SW-cached the fade starts inside that window; the growth re-centers the column downward by half the delta, mid-fade. Fix: `startSplash` now pins the column — reads `#splash-inner`'s resolved `rect.top` before anything becomes visible and freezes it as an explicit `margin-top` (+ `margin-bottom: auto`), making later viewport growth a no-op. `t > 0` guard preserves the long-poem overflow case (margin collapses to 0, content scrolls). If letters still move after this, the remaining suspect is the OS launch-frame→WebView handoff itself, which no in-page code can reach.

**Verify (third pass):** iPhone 14 Pro, light mode, cold start (swipe app away first): (a) no white flash; (b) TODAY letters fade in with zero vertical motion.

**Fourth pass (2026-07-22) — white flash only persists, letters-motion (b) confirmed fixed.** Reported again on iPhone 14 Pro after the third-pass fix shipped. Investigation this pass ruled out every explanation reachable from app code: (1) all 11 `apple-touch-startup-image` PNGs sampled at (14,14,16) RGB — correctly dark, matches `--bg`, not a color mismatch; (2) 14 Pro's exact spec (393×852@3x) confirmed present in the startup-image media-query list (`splash-1179x2556.png`) — not a missing-device gap; (3) user confirmed running the latest deployed version — not a stale-cache/SW issue; (4) `<head>` order checked — no `<script>` before `<style>`, font `preload` hints are non-blocking, inline `background-color` on `<html>` is already the first thing set — no render-blocking resource widening the flash window. Light/dark system-appearance mode was asked but not confirmed by the user this pass.

With those four theories closed, what remains is exactly what the third pass already named: the gap between iOS's static launch image ending and the WebView's first painted frame — a handoff that happens before any in-page HTML/CSS/JS runs, with no hook available from web content. Treating this as a probable **iOS platform limitation** rather than an open app-code bug unless new evidence reopens a lead — e.g. confirmation of light-vs-dark mode correlation, or the flash appearing even on a warm/backgrounded reopen rather than only true cold start (which would point back at in-page code instead of the OS handoff).

---




