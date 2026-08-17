# Bugs

> Full history for verified bugs → `Bugs-archive.md`

## Status key

| Badge | Meaning |
|-------|---------|
| ✅ `vX.X.X`  | Fixed and verified by Can on real device |
| ⏳ `vX.X.X`  | Fix shipped — awaiting real-device verification |
| 🧪 `vX.X.X`  | Fix complete locally — awaiting deployment and real-device verification |
| ⚠️ Stale     | Fix shipped long ago, never verified, condition may no longer be reproducible |
| 🚫 Rejected  | Not a fixable app bug (platform limitation, won't fix) |

## Status Summary

| # | Description | Status |
|---|---|---|
| 076 | Splash exit intermittently leaves `O` and `AY` visible while the poem coda disappears | ⏳ v2.65.3 |
| 075 | Tagged task flashes or changes shimmer timing when hover overlaps its arrival animation | ✅ v2.64.20 |
| 074 | Shared `/poem.html` links crash in the Netlify Edge Function before the static page loads | ✅ v2.64.12 |
| 073 | Focus Ask question says “this late” without supplying the actual local time | ✅ v2.64.9 |
| 072 | Triage flow never completes — "Let go" tapped but completion screen never appears | ⏳ v2.61.6  |
| 071 | App goes blank on wake from sleep or when PWA returns from background while in focus mode — third recurrence of BUG-004/056 family | ⏳ v2.61.5  |
| 070 | Undo toast reason chips unclickable on narrow screens — column layout fix + chip highlight/auto-dismiss feedback | ✅ v2.61.4  |
| 069 | Poem OG preview may show wrong poem for southern-hemisphere users — edge function has no viewer TZ, skips southern-hemisphere flip | 🚫 Rejected  |
| 068 | Trello card 🍅 session count resets every morning | ✅ v2.52.1  |
| 067 | Focused task jumps near top of viewport after focus ends | ✅ v2.44.1  |
| 066 | Focus minutes from another device read 0 on second-device open | ✅ v2.43.8  |
| 065 | Focus mode re-opened after leaving; timer bar torn loose on fast task switch | ✅ v2.43.7  |
| 064 | Focused Trello card un-ages for one day then returns at a heavier dim tier | ✅ v2.43.6  |
| 063 | Focus sessions near midnight wiped by new-day reset race | ✅ v2.42.4  |
| 062 | Native share-sheet popover opens far from the poem's click point, not fixable from page DOM | 🚫 Rejected  |
| 061 | Sunday/habit badges silently fail to show on a fresh device (same root cause as BUG-060) | ⚠️ Stale  |
| 060 | Completed Trello card reappears as active after daily sync | ✅ v2.40.1  |
| 059 | Task card age reset by sync after focus — card re-dims on refresh | ✅ v2.36.5  |
| 058 | Noticed block in About shows different content between devices | ✅ v2.36.3  |
| 057 | About "This week" / "New week" AI text differs between devices (cache never synced) | ✅ v2.36.1  |
| 056 | BUG-004 recurrence — blank app after long Mac sleep (GPU wakeup too slow for 1500ms repaint ceiling) | ✅ v2.31.9  |
| 055 | Done tasks from today wiped on second-device first-open | ✅ v2.30.1  |
| 054 | Phantom old tasks resurrect in TODAY list via sync merge | ✅ v2.23.6  |
| 053 | Morning nudge dismissal not synced across devices | ✅ v2.18.38  |
| 052 | Splash dismissal slow — sync bookkeeping held the gate | ✅ v2.18.36  |
| 051 | Trello nudge dismissal not synced across devices | ✅ v2.18.23  |
| 050 | Sticky section headers — too low / mid-page snap / jitter / safe area / departure snap (seven passes) | ✅ v2.33.8  |
| 049 | New Trello card looks aged on arrival | ✅ v2.18.22  |
| 048 | Trello card aging not synced across devices | ✅ v2.18.17  |
| 047 | Dropbox connect on fresh install doesn't auto-restore | ✅ v2.18.16  |
| 046 | Trello board selector / Dropbox buttons flicker | ✅ v2.18.15  |
| 045 | Done-today count inflates | ✅ v2.18.21  |
| 044 | Delayed focus chime after Escape/task-switch | ✅ v2.18.6  |
| 043 | Aged card won't un-dim after focus session | ✅ v2.18.11, v2.18.17  |
| 042 | Trello card order scrambles across devices | ✅ v2.18.4  |
| 041 | White flash / splash logo from top on mobile (second pass) | ✅ v2.17.29  |
| 040 | Morning nudge reappears after dismiss | ✅ v2.17.139  |
| 039 | All-habits-done celebration never fires | ✅ v2.17.137  |
| 038 | Red dot on mobile when offline | ✅ v2.17.136  |
| 037 | Task list stale on morning open | ✅ v2.17.135  |
| 036 | This Week differs web vs mobile | ✅ v2.17.132  |
| 035 | Trello cards never age visually | ✅ v2.17.127  |
| 034 | Morning nudge AI text swaps mid-read | ✅ v2.17.125  |
| 033 | Morning nudge missing on first cold-start | ✅ v2.17.125  |
| 032 | Splash logo appears mid-animation on mobile | ✅ v2.18.27  |
| 031 | Red error dot invisible on mobile PWA | ✅ v2.17.75  |
| 030 | Checkmark animation lags ~30s on iOS PWA open | ✅ v2.17.105  |
| 029b | ✦ submit answer swapped by proactive load race | ✅ v2.17.93  |
| 029 | `_aiSendFromInput` undefined — crash on ✦ submit | ✅ v2.17.64  |
| 028 | Completed bar flash/pause on window return | ✅ v2.17.94  |
| 027 | Trello focus timer resets on re-open | ✅ v2.17.62  |
| 026 | Habit re-checks itself after uncheck | ✅ v2.17.53  |
| 025 | PiP "Again" lost / shows 25:00 after sleep/wake | ✅ v2.17.52  |
| 024 | Focus minutes carry over to next day | ✅ v2.17.48  |
| 023 | Top panels flash twice on desktop PWA restore | ✅ v2.17.37  |
| 022 | Focus fill bar pulsates during active countdown | ✅ v2.17.36  |
| 021 | Splash explosion invisible / freezes after typewriter | ✅ v2.17.27–29  |
| 020 | Streak double-counts across devices | ✅ v2.17.26  |
| 019 | Star explosion missing on mobile | ✅ v2.17.29  |
| 018 | Phantom SOON tasks reappear | ✅ v2.17.9  |
| 017 | Focus minutes only on full completion | ✅ v2.16.0  |
| 016 | AI chip labels generic | ✅ v2.15.6  |
| 015 | AI repeats same aging task | ✅ v2.15.2  |
| 014 | PiP not reappearing after restore | ✅ v2.15.5–2.16.19  |
| 013 | Focus timer jumps on restore | ✅ v2.14.9  |
| 012 | Overdue Trello card disappears on check | ✅ v2.16.5  |
| 011 | PiP ghost chime on wrong task | ✅ v2.16.9  |
| 010 | Habits didn't roll over | ✅ v2.12.74–77  |
| 009 | Task aging opacity broken | ✅ v2.12.73  |
| 008 | Drag jump-back on mobile | ✅ v2.12.72  |
| 007 | Triage bar flash after triage | ✅ v2.13.2–2.16.6  |
| 006 | `_onWake()` consolidation | ✅ v2.17.0  |
| 005 | Trello pomodoro badge vanishing | ✅ v2.12.56–66  |
| 004 | App blank after sleep/wake | ✅ v2.17.24  |
| 003 | Red dot on network loss | ✅ v2.12.58–2.14.1  |
| 002 | Dropbox sync fails silently | ✅ v2.12.58–61  |
| 001 | Triage dismissed cross-device | ✅ v2.12.59–60  |

---

*Verified bugs → `archive/Bugs-archive.md`. Below: bugs still awaiting verification.*

---

## BUG-076 — Splash exit leaves `O` / `AY` visible

**Status:** ⏳ v2.65.3 (fix shipped — awaiting Safari/iPhone verification)
**Introduced:** v2.64.24 (per-letter WAAPI exit)
**Files:** `index.html`, `assets/splash.js`, `scripts/splash-test.mjs`

**Symptom:** During the staged splash dismissal, `TO` and `DAY` normally fade smoothly before
the star burst, but Safari can leave `O` and `AY` visible while the poem lines continue fading.
The residue is intermittent and was not reproducible in 24 instrumented Chromium runs.

**Root cause:** The exit created five accelerated opacity animations in two same-turn sibling
batches: T/O, then D/A/Y 150ms later. Their final invisibility existed only in WAAPI
`fill: 'forwards'`; no underlying opacity was written. The exact surviving letters match the
later siblings in each batch, consistent with a WebKit compositor/fill handoff race. The prior
test checked only eventual splash removal and static letter counts, so it could not detect a
visible residue during the longer coda exit.

**Fix (v2.65.3):**
- Static `#splash-word-to` and `#splash-word-day` wrappers now own one animation each.
- `_fade()` uses explicit opacity `1 → 0` keyframes and persists `style.opacity = '0'` beneath
  the animation, preventing a lost fill state from revealing completed content.
- TO/DAY/date/burst/coda timing is unchanged; individual letter spans own no animations.
- The splash suite repeats desktop and 375px exits and verifies ownership, order, and final state.

**Device verification:** On macOS Safari and the iPhone PWA, force both coda and no-coda splash
paths. Across at least ten coda exits, confirm TO fades together, DAY fades together 150ms later,
the star burst remains aligned, and `O` / `AY` never remain visible while the poem disappears.

---

## BUG-072 — Triage flow never completes after "Let go" is tapped

**Status:** ⏳ v2.61.6 (fix shipped — awaiting real-device verification)
**File:** `index.html` — `triageShowReason`, `renderTriageList`

**Symptom:** After making all triage decisions including "Let go" on one or more tasks, the completion screen never appears. The overlay stays open with decided tasks showing badges.

**Root cause:** `triageShowReason(id)` (added v2.54.0 to show reason chips) only manipulated the DOM — it replaced the card's action buttons with reason chips but never set `triageDecisions[id]`. When any other card was decided, `renderTriageList()` re-rendered the entire list from scratch, wiping the reason chips. The "Let go" intent was lost. The task remained undecided, so `remaining` never reached 0 and `triageApplyAll()` never fired. Affects any session where "Let go" is not the very last decision made.

**Fix (v2.61.6):**
- `triageShowReason(id)` now commits `triageDecisions[id] = 'letgo'` immediately (fires `_haptic`, recalculates remaining, calls `triageApplyAll()` or `renderTriageList()` via the normal path). DOM manipulation removed.
- `renderTriageList()` decided-card template now injects optional reason chips inline for any letgo task that has no reason yet (chips call new `triageSetReason(id, reason)`).
- New `triageSetReason(id, reason)` — just records the reason and re-renders (no decision logic).
- Edge case: if "Let go" is the LAST undecided task, `triageApplyAll()` fires immediately (reason = '', which is handled correctly by `triageApplyAll`'s `|| ''` fallback).

---

## BUG-071 — App blank on wake / PWA background return during focus mode

**Status:** ⏳ v2.61.5 (fix shipped — awaiting real-device verification)
**Family:** BUG-004 → BUG-056 → BUG-071 (third recurrence)
**File:** `index.html` — `_onWake`, `_forceRepaint`

**Triggers:** Two confirmed:
1. Mac sleeps with PWA in foreground while focus mode is active → wakes → app blank
2. PWA sent to background (Cmd+Tab or lock screen) while in focus mode → return → app blank

**Root cause:** GPU compositor layers go stale when the app is hidden. `_forceRepaint` toggles `display:none/''` to force layer invalidation, but the repaint schedule was capped at 5000ms — not enough for some GPU init times. The PWA-background case adds a second trigger path (short background, not a sleep) that was hitting the same blank via the same `visibilitychange → _onWake` flow.

**Fix (v2.61.5):**
- `_forceRepaint` now skips passes if `document.visibilityState === 'hidden'` (no point repainting while hidden)
- Repaint schedule extended: 500 / 1500 / 3000 / 5000 / 8000 / 12000ms
- `_wakeFocusCheck()` runs alongside every repaint: calls `_focusReanchor()` to re-attach `.focused` if sync re-rendered it away, and corrects `body.top` drift if the focused task scrolled out of viewport

---

## BUG-069 — Poem OG preview may show wrong poem for southern-hemisphere users

**Status:** 🚫 Rejected (platform limitation — won't fix)
**Introduced:** v2.59.1 (Netlify edge function for poem OG meta)
**File:** `netlify/edge-functions/poem.js`

`poem.html` uses `_SOUTHERN_TZ` to detect southern-hemisphere timezones client-side and flip the season by +6 months, so the poem matches the local season. The edge function runs server-side and has no access to the viewer's timezone — it can only use the date from the `?date=` param. As a result, the `og:description` (shown in OG link previews) is computed without the hemisphere flip, and may show a different poem than what the page renders for southern-hemisphere users.

Accepted edge case: affects a small minority of users, and only in the link preview — the page itself shows the correct poem. Server-side TZ detection would require a geolocation lookup, which is not worth the complexity.

---
