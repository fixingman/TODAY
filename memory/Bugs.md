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
| 030 | Checkmark animation lags ~30s on iOS PWA open | ⏳ v2.17.105 |
| 031 | Red error dot invisible on mobile PWA (behind status bar) | ✅ v2.17.75 |
| 032 | Splash logo shifts down before date typing starts (mobile) | ⏳ v2.17.97 |

---

*Verified bugs → `archive/Bugs-archive.md`. Below: bugs still awaiting verification.*

---

## BUG-030: Checkmark animation lags ~30s on iOS PWA open

**Status:** Fixed v2.17.105 — awaiting re-verification

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

**Verified fixed:** ☐

---

## BUG-032: Splash logo shifts down before date typing starts (mobile)

**Status:** Fixed v2.17.97 — awaiting verification

**Symptom:** Sometimes on mobile, the TODAY logo visibly shifts down during the splash, just before the date typewriter begins. Never seen on desktop.

**Root cause (two parts):**
1. The logo letters' rise animation started immediately from page render (CSS `animation-delay` from .06s), but the typewriter waits for `document.fonts.ready`. On mobile cold starts Syne isn't loaded yet, so the logo rendered in the fallback font; when Syne arrived the swap changed the logo block's metrics, and `#splash` (`justify-content: center`) re-centered the column — a visible shift right before typing starts. Desktop has fonts cached → never reproduces.
2. `startSplash` could fire twice when fonts take >800ms: the fallback timeout fires it, then `fonts.ready.then()` fires it again (the `clearTimeout` only helps if fonts win the race) — restarting the star transition and double-running the typewriter rAF loop.

**Fix (v2.17.97):** Letter-rise animation moved behind a `#splash-logo.go` gate; `startSplash` adds the class after fonts are ready, so the logo only ever renders in Syne. `_splashStarted` guard makes `startSplash` idempotent.

**Verify:**
- Mobile PWA cold start (force-quit first, ideally after clearing cache or on slow network) → logo rises once in place, no downward jump before the date types
- Desktop: splash unchanged
- Slow network (DevTools throttle): splash starts at ~800ms in fallback at worst, but never double-types the date

**Verified fixed:** ☐

