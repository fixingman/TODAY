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
| 028 | Completed bar flash/pause on window return (final: WAAPI pulse) | ⏳ v2.17.94 |
| 029 | `_aiSendFromInput` undefined — crash on ✦ submit with text | ✅ v2.17.64 |
| 029b | ✦ submit answer swapped by proactive load racing it | ⏳ v2.17.93 |
| 030 | Checkmark animation lags ~30s on iOS PWA open | ✅ v2.17.71 |
| 031 | Red error dot invisible on mobile PWA (behind status bar) | ⏳ v2.17.75 |

---

*Verified bugs → `archive/Bugs-archive.md`. Below: bugs still awaiting verification.*

---

## BUG-028: Completed focus bar — four sub-fixes

**Status:** Fixed across v2.17.63 / v2.17.65 / v2.17.68 / v2.17.94 — D awaiting verification

**Sub-fix A — v2.17.63: "again?" shown a tick late (all task types)**
`tickFor` hit 0, drew "00:00" + full bar, then scheduled another tick; `completeFor` only ran on the *next* tick (~1s later). Fix: call `completeFor` in the same tick that reaches zero and `return` — skip the dead "00:00" frame.

**Sub-fix B — v2.17.65: bar holds static ~1.5s on window return**
`_forceRepaint` suppressed `.complete` animation on every wake pass but only restored after 1500ms. Fix: restore infinite animations (`.complete`, `.ai-badge`, `.done-star`) on the very next `rAF` inside `_forceRepaint` itself.

**Sub-fix C — v2.17.68: bar flashes 2–3× on window return**
Sub-fix B's per-pass rAF created rapid suppress→restore cycles (each of the 4 passes suppressed then immediately restored). Fix: restore moved outside `_forceRepaint`; animations suppressed 0–500ms across all passes, then restored **once** at 520ms in a single external rAF. The 1500ms slow-GPU pass gets `skipAnimSuppression=true`.

**Sub-fix D — v2.17.94: still one flash on window return (reported after C was verified)**
Architectural dead end: with a CSS animation, every `display:none/block` repaint pass restarts it from keyframe 0 (opacity 1) — if the bar is mid-pulse (0.65) at wake, one visible jump is *guaranteed*; suppress/restore only relocates it. Fix: pulse converted to Web Animations API (`_pulseComplete(fillEl, on)` beside the fillEl definition; same approach as the v2.17.72 checkmark). A WAAPI timeline is unaffected by display toggles — measured continuous (opacity 0.766 → 0.760 across the exact `_forceRepaint` cycle, headless Chrome). CSS `timerCompletePulse` keyframes deleted; `.complete` removed from `_resumeAfterRepaint`; reduced-motion preference respected via `matchMedia` gate.

**Verify (all three — see Test-matrix 7.8 and 7.9):**
- (A) Complete a focus session → bar fills and **immediately** pulses "again?" — no static pause
- (B+C) Leave a session completed, switch away then return → bar pulses on return with **no flash and no long pause**
- (D) Same as B+C, while the bar is mid-dim at the moment of return → no single flash either

**Verified fixed (A–C):** ✅ (Can, Jun 2026) — then one residual flash surfaced → Sub-fix D, ⏳

---

## BUG-031: Red error dot invisible on mobile PWA

**Status:** Fixed v2.17.75 — awaiting verification

**Symptom:** When a sync/storage error fires on the installed iOS PWA, the red dot never appears in view — errors go unnoticed on mobile.

**Root cause:** `#errorIndicator` was `position: fixed; top: 8px`. The viewport uses `viewport-fit=cover`, so the standalone PWA canvas extends under the iOS status bar (~47–59px tall). The dot rendered behind the status bar — present in the DOM, outside the visible safe area. Other fixed elements (sticky header, add bar) already compensate with `env(safe-area-inset-top/bottom)`; the error dot and `#errorPanel` were missed.

**Fix (v2.17.75):** `top: calc(env(safe-area-inset-top, 0px) + 8px)` on the dot, `+ 24px` on the panel. Desktop unaffected (inset is 0).

**Verify:**
- On iOS PWA, trigger an error (e.g. airplane mode mid-sync, or wait for any sync failure) → red dot visible below the status bar, top-right
- Tap the dot → error panel opens fully visible
- Desktop PWA: dot still at top-right, unchanged position

**Verified fixed:** ☐
