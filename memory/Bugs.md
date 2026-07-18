# Bugs

> Full history for verified bugs → `Bugs-archive.md`

## Status Summary

| # | Description | Status |
|---|---|---|
| 056 | BUG-004 recurrence — blank app after long Mac sleep (GPU wakeup too slow for 1500ms repaint ceiling) | ✅ v2.31.9 |
| 055 | Done tasks from today wiped on second-device first-open | ✅ v2.30.1 |
| 054 | Phantom old tasks resurrect in TODAY list via sync merge | ✅ v2.23.6 |
| 053 | Morning nudge dismissal not synced across devices | ✅ v2.18.38 |
| 052 | Splash dismissal slow — sync bookkeeping held the gate | ✅ v2.18.36 |
| 051 | Trello nudge dismissal not synced across devices | ✅ v2.18.23 |
| 050 | Sticky section headers broken — too low / mid-page snap, then mobile jitter, then iOS safe area, then residual jitter | ⏳ v2.33.1 |
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

## BUG-050: Sticky section headers broken — too low / snap to mid-page on deep scroll

**Symptom:** Section headers (Soon, Trello tasks, Your tasks, Past) stick at `top: var(--sec-sticky-top)`, which is set to the sticky-header's height (~150px on mobile). Two failure modes: (1) "sticks too low" — on first scroll, section headers appeared floating far below their correct position. (2) "snaps to middle of the page" — after scrolling deeper, the main sticky-header (logo + progress bar) would exit the viewport, and section headers then appeared at their fixed offset in empty space.

**Root cause:** `--sec-sticky-top` was set to `sticky-header.offsetHeight` (a static measurement). When the sticky-header scrolled off screen on deep scroll (expected, intentional behavior), section headers kept their `top: offsetHeight` offset, floating in empty space — "too low" at first encounter, "mid-page snap" deeper.

**Fix (v2.27.1):** Replaced static `offsetHeight` measurement with a scroll-aware `getBoundingClientRect().bottom` so section headers track the visible bottom of the sticky-header and fall back to `top: 0` once it has scrolled away.

**Second pass (v2.27.3) — mobile jitter:** the v2.27.1 rect measurement shook section headers a few px during mobile scroll. iOS moves sticky elements on the compositor thread; `getBoundingClientRect()` on a stuck element reads a few px behind the real position mid-scroll, so the var oscillated. Fix: compute analytically from `scrollY` — `max(0, min(headerHeight, body.offsetHeight − scrollY))` (header is body's first child; body is 100vh, so the header stays pinned until `scrollY > bodyHeight − headerHeight`, then its bottom recedes as `bodyHeight − scrollY`) — with rAF-coalesced scroll updates. While pinned the value is constant → zero style churn; during departure it follows scroll position smoothly. Desktop was never affected (main-thread scrolling keeps rects in sync).

**Third pass (v2.31.6) — iOS safe area:** `--sec-sticky-top` correctly reaches 0 when the main header scrolls away, but on iOS PWA the viewport extends under the status bar (~47–59px). With `top: 0`, section headers sit behind the status bar, appearing clipped. Fix: `.section-header { top: max(var(--sec-sticky-top, 0px), env(safe-area-inset-top, 0px)); }` — the `max()` CSS function floors the sticky offset at the safe area inset. Desktop: `env(safe-area-inset-top, 0px)` is 0, no effect. No JS change.

**Verify:** On iOS PWA with a long list: (1) section headers pin just below the logo header with no trembling during scroll; (2) as the logo header departs, section headers ride its bottom edge and settle at the safe area top (below the status bar, not behind it); (3) never floating mid-page; (4) desktop unaffected.

**Fourth pass (v2.32.1) — scroll-driven animation:** Third pass verified on mobile — safe-area fix landed, but jitter persisted (reduced, not gone). Root cause of the residual jitter: *any* JS-driven update is structurally too late. iOS scrolls on the compositor thread; scroll events + rAF callbacks run on the main thread ≥1 frame behind, so the `--sec-sticky-top` value the compositor uses to position the stuck headers always describes where the scroll *was*, not where it is — the headers chase the finger through the whole departure window. (The v2.31.6 `max()` clamp is why it got "less jittery": values below the ~47px safe-area inset became constant, silencing the last third of the window.) Fix: CSS scroll-driven animation — `@supports (animation-timeline: scroll())` gives `.section-header` a `sec-hdr-depart` animation on `scroll(root)` with `animation-range: calc(100dvh − var(--hdr-h)) → 100dvh` (the exact departure window: sticky-header is sticky in body, body = 100% viewport), animating `top` from header height down to the safe-area inset. The browser samples progress from the scroll offset inside the same rendering update that paints the scroll — no lag by construction. `--hdr-h` is published by the existing ResizeObserver (resize-only writes). The per-scroll JS listener is not attached at all on supporting browsers (iOS 26+ / Chrome 115+). **Fallback for older browsers replaced too:** instead of the v2.27.3 continuous tracking (which is the jitter), `--sec-sticky-top` now snaps between two constants — header height while pinned, 0 at departure start (`max()` clamps to safe area). A constant can't jitter; the crossing write lands while the section header is hidden behind the departing sticky-header's 92%-opaque blurred backdrop, so it's revealed in place as the header slides away rather than visibly jumping. Tradeoff: old browsers lose the smooth edge-riding during the ~150px departure window — invisible in practice because the header covers it. Not a Motion.md WAAPI-rule violation: progress derives from scroll position, so `_forceRepaint`'s display toggle re-samples rather than restarts it — no flash.

**Verify (fourth pass):** On iOS 26+ PWA with a long list, scroll slowly and with momentum through the header's departure — section labels should ride its bottom edge with zero trembling, then sit at the safe-area top. Desktop unchanged.

**Fifth pass (v2.33.1) — animation removed, scrim added.** Fourth pass failed verification (2026-07-18): jitter persisted, and a new symptom surfaced — content visible in the safe-area strip *above* the section header after the main header departs. Two root causes: (1) The scroll-driven animation animated `top`, a **layout property** — WebKit can't run those on the compositor, so it sampled on the main thread one frame behind the compositor scroll, the exact lag the fourth pass claimed to eliminate; and with `fill: both` the animation held `top` under animation control through the entire scroll, re-resolving style every frame. The "compositor-synchronous by construction" premise only holds for accelerated properties (transform/opacity), neither of which can drive a sticky pin point. (2) The v2.31.6 `max()` safe-area clamp pins section headers *below* the status bar — the 0→inset strip above them was never covered by anything once the main header departed, so raw list content showed through under the status bar. Fix: the `@supports` animation block and `sec-hdr-depart` keyframes are deleted (with `--hdr-h`); the constant-snap fallback is now the universal behavior on all browsers (two constant states, one write at the crossing, hidden behind the departing header's backdrop — a constant can't jitter); and a new `#statusBarScrim` (fixed, `height: env(safe-area-inset-top)`, `--bg`, z 5 — above content, below the glass header and section headers) covers the strip. Desktop: inset 0 → zero-height scrim, no change.

**Verify (fifth pass):** On iOS PWA with a long list: (1) section labels rock-steady during all scrolling; (2) at the header's departure the label is revealed in place at the safe-area top (no visible jump); (3) no content visible under the status bar at any scroll depth; (4) desktop unchanged.

---

## BUG-041: White flash / splash logo from top on mobile (second pass)

**Symptom:** Brief white flash at the very beginning of the splash animation, and the logo / star appears to come from the top of the screen rather than fading in at its final centered position. Reported after v2.27.0 on iOS PWA.

**Root cause (second pass — v2.27.0 fix):** The `#splash-star` element's `opacity` and `transform` CSS transitions were set *outside* the `requestAnimationFrame` callback that queues the logo's opacity fade. iOS WebKit immediately promotes the star to its own compositing layer when a `transform` transition starts. Because this happened one frame before the logo's `opacity: 0 → 1` baseline was committed, the star composited *independently* — its own `opacity: 0 → 1` ran at full brightness without being multiplied by the parent logo's `opacity: 0`. The star has a `fill="white"` inner path (`opacity=".18"` in SVG), and at `transform: scale(0.3)` (initial state, top-right corner of logo) this briefly flashed white against the dark background. That flash + the growing transform from small to large read as "something white coming from the top."

**First pass (v2.18.13):** Fixed the pre-web-content cold-start white frame (system launch image → WebView transition). Different symptom, same bug family.

**Fix (v2.27.0 second pass):** Moved the star's `transition`/`opacity`/`transform` assignments inside the `requestAnimationFrame` callback alongside the logo's opacity transition. Both transitions now start in the same frame, so iOS composites them together under the logo's `opacity: 0` baseline. Ceiling path (no animation) keeps immediate star reveal.

**Verify:** Open app on iOS PWA from cold start (or after clearing the day's splash cache). No white flash, no logo/star appearing from the top — smooth single-unit fade from black.

**Third pass (v2.32.1) — persists on iPhone 14 Pro after PWA re-add (2026-07-17).** Two symptoms reported: (a) brief white flash in light mode only, (b) logo letters appear to come down from above during the reveal. 14 Pro (393×852@3x) IS in the startup-image list and the PWA was re-added, so the launch-image path should now be active — (a) needs a fresh light-mode cold-start test. For (b): the reveal code has no letter motion (single-unit opacity fade since v2.18.27), so visible downward motion can only come from the whole column moving mid-fade. Mechanism: `#splash` is `fixed; inset: 0` and `#splash-inner` centers via `margin: auto 0` — on iOS PWA cold start the viewport settles (grows under the status bar) a few frames after first paint, and since fonts are SW-cached the fade starts inside that window; the growth re-centers the column downward by half the delta, mid-fade. Fix: `startSplash` now pins the column — reads `#splash-inner`'s resolved `rect.top` before anything becomes visible and freezes it as an explicit `margin-top` (+ `margin-bottom: auto`), making later viewport growth a no-op. `t > 0` guard preserves the long-poem overflow case (margin collapses to 0, content scrolls). If letters still move after this, the remaining suspect is the OS launch-frame→WebView handoff itself, which no in-page code can reach.

**Verify (third pass):** iPhone 14 Pro, light mode, cold start (swipe app away first): (a) no white flash; (b) TODAY letters fade in with zero vertical motion.

---




