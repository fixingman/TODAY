# TODAY — Changelog

> Entries older than ~20 versions → `archive/Changelog-archive.md`

| Version | Key change |
|---|---|
| **3.0.10** | CI reliability: synchronization waits in 4 test files replaced with condition-polling (2s cap) or 200ms fixed margins. |
| **3.0.8** | **Repair repeated feedback-policy CI failures.** Preserve voted withholding after task-outcome edits only when valid feeling-only fingerprints prove feelings unchanged. Legacy/missing fingerprints retain the original edit/withdrawal fence; startup deferral and natural expiry remain. Add policy coverage for outcome-only changes, feeling edits, deletion, legacy callers, partial fingerprints and merge convergence. Replace fixed 50ms reflection-result samples with bounded waits for actual rendered acceptance/rejection. Freeze the Focus completed/partial sync fixture at noon after a deterministic 23:50 control reproduced its midnight counter reset; retain real rollover coverage. Guard queued triage-bar reveals against superseding checks/dismissal; deterministic before/after coverage reproduces the incoming-sync race. Final local functional gate:61/61 first-attempt passes, zero flakes/failures in422.4s; runtime/test inputs unchanged. Payload1205.2KiB decoded /341.2KiB Brotli /38 scripts passes unchanged limits. Dev publication authorized November 3; hosted confirmation remains pending. |
| **3.0.9** | CI timing: dropbox sync wait 30→200ms, nudge upgrade deadline buffer 1500→3000ms. |
| **3.0.8** | Feeling feedback follows edits and deletions correctly. A synced dismissal keeps the evening prompt hidden. |
| **3.0.7** | HOW DAYS FELT voted records now distinguish genuine feeling edits (drop) from task-outcome-only changes (expire) via a feeling-only fingerprint. |
| **3.0.6** | Soon list open no longer flashes: entrance animation moved to WAAPI so first paint is always after opacity: 0 is established. |
| **3.0.5** | HOW DAYS FELT "not really" vote now survives evidence changes: voted records expire instead of being dropped when task data updates. |
| **3.0.4** | HOW DAYS FELT unchosen button uses color dimming instead of opacity (contrast fix); focus-test wave-clear timing corrected. |
| **3.0.3** | WHAT TODAY HAS SEEN no longer shows "still learning" diagnostic notes; absent data already implies it. |
| **3.0.2** | HOW DAYS FELT voting buttons use plain-text style matching the Focus Ask evaluation pattern; selected choice highlighted in accent, unchosen dims. |
| **3.0.1** | HOW DAYS FELT "not really" vote now reliably suppresses the insight from reappearing; focus exit wave stagger matches entry rhythm. |
| **3.0.0** | AI continuous improvement: daily nudges, HOW DAYS FELT insights, pool and Sunday readings, Focus Ask, task enrichment and post-add suggestions all learn from your feedback across sessions. |
| **2.106.16** | Selected state for all reaction and wording buttons uses the accent green token consistently across the app. |
| **2.106.14** | **One motion vocabulary, enforced.** Timing scale: `--dur-base` 0.20s absorbs 0.18s and the former `--dur-mid`; new `--dur-exit` 0.12s, `--dur-emphasis` 0.60s, `--ease-in`, `--ease-in-out`; every hardcoded 120/600/180 and near-copy now uses them. `design-lint` fails literal durations/curves/bare easing keywords; deliberate rhythms carry `motion-literal:`. Bare `ease-out` keyword uses move to the `--ease-out` token (visible: quicker arrival, softer settle). Reduced motion now also gates the checkmark pop and splash cursor blink. Dead `moveToSoon` / `moveToPast` removed (tests now move tasks as triage does). Also: Rows: `_rowEnter` / `_rowExit` (util.js) replace five removal paths (delete, clear-done, sync, Trello, AI replacement) and new-day graduation; exits fade while height closes over `--dur-slow` / `--ease-out` so rows below glide instead of jumping, and removal waits for the animation's `finished` instead of copied 180/200ms timers. Trello, synced, AI-breakdown and habit rows enter like typed tasks. Entries: `--motion-rise` / `--motion-drop` tokens; `fadeIn` / `revealDown` / `fadeInPlain` replace `taskSlideIn`, `slideDown`, `memory-item-in`, `_nudgeBlockIn`, `_nudgeTextIn`; `fadeOut`, `.task-new`, `.habit-new`, `.task-slide-in` removed. Loops: header attention, error dot and PWA pulses move from CSS to WAAPI (`_loopPulse`) so wake repaints cannot restart them; reduced motion holds header accent. |
| **2.106.13** | "wording" button in Sunday reflection uses unified mono xs tokens. |
| **2.106.12** | Task list nudge reaction row joins the card visually on expand. |
| **2.106.11** | **BUG-140: strip reaction row fits its content; tests follow v2.106.7–.10.** The v2.106.7 fade-in capped `#dayNudgeReact` at 80px; after "not really" the row needs 92–128px on 320–430px phones, so reason chips and the wording panel were clipped and untappable. It now opens 0fr→1fr to its own height, keeps the fade, and hides collapsed controls from keyboard/AT. Stale suites rewritten to the new intended behaviour: reason choice closes its row, second tap collapses, About starts collapsed and restores the chosen reason, Focus wording closes after a choice and clears by re-tap. Strip clicks wait for the open transition. Motion literals equal to tokens now use the tokens (no visual change). |
| **2.106.10** | About voted nudge collapses on load; reason chips restore on re-expand. |
| **2.106.9** | Raise triage sheet max-height to 90vh so feeling grid fits without scroll. |
| **2.106.8** | Focus wording feedback — consistent tokens, remove help text and clear-all. |
| **2.106.7** | Task list nudge UX — toggle, fade-in, reason auto-dismisses. |
| **2.106.6** | Unify landed/not-really tokens across all surfaces. |
| **2.106.5** | Collapse reason chips when tapping reading in About. |
