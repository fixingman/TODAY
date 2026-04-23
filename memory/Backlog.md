# Backlog

> Feature TODOs, prototype gaps, and future work.

---

## Pending Features

### Idle Companion Design Refinement
**Status:** Not started
**Goal:** Develop the design of idle companion to higher resolution and more consistency.

### Keyboard Shortcuts (Desktop Only)
**Status:** Not started
**Notes:** Needs exploration both in UX and UI. Desktop only.

### AI Improvements
**Status:** Partially done (v2.13.0–2.13.1)
**Done:** Morning briefings, end-of-day summaries, stale task awareness (always-on), behavioral insights (deterministic), break_down/move_soon/reflect actions, day-end review in triage, morning reflection nudge.
**Remaining:** Deeper personality (weather/energy awareness beyond peak hour), conversation memory across AI sessions, richer habit streak celebrations.

### Notifications
**Status:** Not started
**Goal:** Optional gentle nudges from AI for habits or focus sessions.

### Widget/Home Screen Integration
**Status:** Not started
**Goal:** Mobile widget showing today's task count, progress.

### Weekly Reports
**Status:** Not started
**Goal:** Weekly productivity reports, habit streaks over time.

### Microsoft Notes Integration
**Status:** Not started

### Quick Task Capture (Without Opening App)
**Research:** `memory/research/Quick-capture.md`  
**Status:** Researched — **Not implementing**  
**Reason:** No intuitive cross-platform solution. iOS has no PWA shortcut/share target support. Siri integration requires native app.

### Todoist Integration
**From:** Research.md §2
**Priority:** Highest integration priority
**Status:** Not started

### Document Connections Panel & First-Run Flow
**Status:** Not started
**Goal:** Document the UX and technical flow for connecting Trello, Dropbox, and AI — both the first-time setup experience and the reconnect/forget flows. Nothing currently in memory about this. Relevant for onboarding decisions and future integrations.

---

## Technical Debt

### Performance Audit Update
**Priority:** Low
**Status:** ✅ Updated to v2.12.7 (Session 18)
**Notes:** Audit doc updated from v2.3.4 to v2.12.7 with current metrics

### Further Element Caching
**Priority:** Low
**Status:** ✅ Extended from 13 → 26 elements (v2.12.8)
**Notes:** Cached triage, habits, trello, status elements

### Console Error Monitoring
**Priority:** Low
**Status:** ✅ Implemented (v2.12.8), extended (v2.12.58)
**Notes:** Red pulsing dot appears on errors, click to view log. v2.12.58 added `_logSyncError()` to route sync failures (Dropbox, Trello) to the same red dot. Wake errors silenced for 3s to avoid false alarms.

### Consolidate Wake Handlers into `_onWake()`
**Priority:** Low — refactor when a wake-related bug next surfaces
**Status:** Not started
**Notes:** 5 `visibilitychange` listeners + `window.focus` handler all fire on wake, each with different delays. Changing wake behaviour requires updating multiple scattered listeners. See `Bugs.md` for full wake sequence table. Proposed: single `_onWake()` orchestrator, modules register callbacks. SW, focus timer, and PiP listeners can stay separate.

---

## Watch Decisions

Decisions that may need revisiting based on real usage:

| Decision | Current | Watch For |
|----------|---------|-----------|
| Modularization | Single file (10K+ lines) | App is mature — might benefit from eventual modularization if it grows further |

---

## Rejected Approaches

Captures what we tried or considered and why we didn't proceed — institutional knowledge.

| Feature | Rejected Approach | Reason |
|---------|------------------|--------|
| Quick Capture | iOS Share Sheet / Shortcuts | No PWA share target support on iOS; Siri needs native app |
| Quick Capture | Web-based share target | Android-only, inconsistent across browsers |
| Sync | Real-time WebSocket sync | Overkill for single-user; Dropbox polling is simpler |
| Sync | Conflict resolution UI | Too complex; union merge + timestamps handles 99% of cases |
| Sound | Web Audio API with .then() | Caused delay after long inactivity; fixed by playing immediately |
| PiP | Keep PiP open on return | Confusing UX; PiP should only show when app is hidden |
| Idle creatures | Complex AI behaviors | Overthinking; simple random movement is charming enough |
| Habits | Habit streaks with penalties | Anxiety-inducing; we acknowledge streaks without punishment |

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
| Triage summary redesign (Option 1) | 2.14.4 | Apr 2026 |
| Trello overdue re-filter (BUG-012) | 2.14.5 | Apr 2026 |
| Triage bar sticky once shown | 2.14.6 | Apr 2026 |

---

*Last updated: Session 31 (v2.14.6)*
