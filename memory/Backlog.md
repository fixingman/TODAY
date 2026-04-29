# Backlog

> Feature TODOs, technical debt, decisions, and institutional knowledge.

---

## Pending Features

### AI Improvements
**Status:** Partially done (v2.13.0–2.15.4)
**Done:** Morning briefings, day-end review, stale task awareness (always-on), behavioral insights (deterministic), break_down/move_soon/reflect actions, morning reflection nudge, suggestion cooldowns (7-day), suggestion history (Dropbox-synced), deterministic chips for aging tasks, suggestion history in AI context.
**Remaining:** Deeper personality (weather/energy awareness beyond peak hour), conversation memory across AI sessions, richer habit streak celebrations.

### Push Notifications
**Status:** Not started
**Platform:** iOS 16.4+ (installed PWA only) + Android. Uses Web Push API + VAPID keys.
**Stack:** `push` listener in `sw.js`, VAPID keys in Netlify env, two new Netlify functions (store subscription + scheduled send), permission UI in Connections panel.
**Candidates:** 8pm triage reminder, habit nudge (custom time), morning briefing, peak hour focus suggestion.
**Key constraint:** iOS has no background sync — notifications must be server-sent via Netlify Scheduled Functions. App cannot self-schedule.
**Effort:** Medium. Code is straightforward; main decision is what to notify and when.

### Weekly Reports
**Status:** Not started
**Goal:** Weekly productivity summary — tasks done, habits kept, focus time, streak trend.

### Todoist Integration
**Status:** Not started
**Priority:** Highest integration priority after Trello.

### Idle Companion Design Refinement
**Status:** Not started
**Goal:** Higher resolution artwork and more visual consistency across the 7 creatures.

### Keyboard Shortcuts (Desktop)
**Status:** Not started
**Goal:** Keyboard-first power user flow. Needs UX + UI exploration.

### Trello Checklist Support
**Status:** Not started — design decision pending
**Options evaluated:**
- A: Read-only display (low complexity)
- B: Write back to Trello (bidirectional, right long-term answer)
- C: Explode into TODAY tasks (loses Trello connection)
- D: Progress badge only — "3/5 ✓" on task row (minimal, fits aesthetic)
**Next step:** Decide between D (visibility) or B (editable) before building anything.
**Status:** Not started
**Goal:** Document the UX and technical flow for connecting Trello, Dropbox, and AI — first-time setup, reconnect, and forget flows. Relevant for onboarding decisions and future integrations.

---

## Technical Debt

### Consolidate Wake Handlers into `_onWake()`
**Priority:** Low — refactor when a wake-related bug next surfaces
**Status:** Not started
**Notes:** 5 `visibilitychange` listeners + `window.focus` handler all fire on wake, each with different delays. Changing wake behaviour requires updating multiple scattered listeners. Proposed: single `_onWake()` orchestrator, modules register callbacks. SW, focus timer, and PiP listeners can stay separate.

---

## Watch Decisions

| Decision | Current | Watch For |
|----------|---------|-----------|
| Modularization | Single file (~11K lines) | Might benefit from modularization if it grows significantly further |

---

## Not Implementing

| Feature | Reason |
|---------|--------|
| Widget/Home Screen | True widgets require WidgetKit (iOS) or native Android code — not accessible from a PWA. Revisit only if TODAY has a native wrapper. |
| Quick Task Capture (without opening app) | No intuitive cross-platform solution. iOS has no PWA share target. Siri requires native app. |
| Microsoft Notes Integration | Low priority, no clear user need identified. |

---

## Rejected Approaches

| Feature | Rejected Approach | Reason |
|---------|------------------|--------|
| Quick Capture | iOS Share Sheet / Shortcuts | No PWA share target support on iOS |
| Quick Capture | Web-based share target | Android-only, inconsistent |
| Sync | Real-time WebSocket sync | Overkill for single-user; Dropbox polling is simpler |
| Sync | Conflict resolution UI | Too complex; union merge + timestamps handles 99% of cases |
| Sound | Web Audio API with `.then()` | Delay after long inactivity; fixed by playing immediately |
| Idle creatures | Complex AI behaviours | Simple random movement is charming enough |
| Habits | Streak penalties | Anxiety-inducing; acknowledge streaks without punishment |

---

## Completed Features

| Feature | Version | Date |
|---------|---------|------|
| Idle companion (7 creatures) | 2.10.0 | Mar 2026 |
| Memory compartmentalization | — | Mar 2026 |
| Zones prototype | 2.11.0 | Mar 2026 |
| Link extraction for tasks | 2.12.79 | Apr 2026 |
| Unified internal clock | 2.12.78 | Apr 2026 |
| AI personality overhaul | 2.13.0 | Apr 2026 |
| Day-end review + morning reflection | 2.13.1 | Apr 2026 |
| Error log panel (replaced alert()) | 2.14.3 | Apr 2026 |
| Triage summary redesign | 2.14.4 | Apr 2026 |
| Trello overdue re-filter | 2.14.5 | Apr 2026 |
| Triage bar sticky once shown | 2.14.6 | Apr 2026 |
| Habit asymmetric smoothing | 2.15.0 | Apr 2026 |
| AI upgraded to Claude Sonnet | 2.15.1 | Apr 2026 |
| AI deterministic aging task chips | 2.15.3 | Apr 2026 |
| AI suggestion history in context | 2.15.4 | Apr 2026 |
| PiP re-open after restore (BUG-014) | 2.15.5 | Apr 2026 |
| AI chip label + opener fixes | 2.15.6 | Apr 2026 |
| BUG-006 v3 fix (timer repositioning) | 2.15.7 | Apr 2026 |
| Habit hot threshold raised to 80% | 2.15.8 | Apr 2026 |
| SOON list alphabetical sort | 2.15.9 | Apr 2026 |
| BUG-017 focus minutes fix | 2.16.0 | Apr 2026 |
| Splash localStorage (mobile PWA) | 2.16.1 | Apr 2026 |

---

*Last updated: Session 32 (v2.16.2)*
