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

### Document Connections Panel & First-Run Flow
**Status:** ✅ Done — `architecture/Connections.md`
**Covers:** Trello OAuth flow + board selection, Dropbox PKCE flow + token lifecycle, AI key entry + provider selection, first-run experience, all localStorage keys.

### Energy-Aware AI Suggestions
**Status:** ✅ Done (v2.16.16)
**Shipped:** AI now names specific tasks tied to energy moment instead of generic guidance. Peak time → names a demanding task. Pre-peak → names an easier one. Post-peak → names a quick win.

### 5-7 Task Soft Cap (AI nudge)
**Status:** ✅ Done (v2.16.16)
**Shipped:** LIST_HEAVY flag set at 6+ pending tasks. AI acknowledges the full plate warmly, focuses on one task, may suggest moving something to SOON. Option A (AI-driven, no UI).

### Emergent vs Planned Insight (Memory-Driven)
**Status:** ✅ Done (v2.16.17)
**Shipped:** `appMemory.patterns.lateAdditions` tracks hour of each task addition. `dayStartCount` snapshotted at midnight. After 10+ data points, AI notices: ≥60% afternoon adds → "reactive day?" observation; ≤30% afternoon adds → "intentional planner" observation. Data compounds over weeks.

### "Calm Technology" Copy Audit
**Status:** ✅ Done (v2.16.18)
**Shipped:** README rewritten with explicit "What it deliberately doesn't do" section. AI prompt updated with TODAY design philosophy (no due dates, priorities, ranking — AI will never suggest these). Info panel title humanised.

### Momentum + TODAY Integration (Research)
**Status:** Not started — research only
**Goal:** Explore whether Momentum (momentumplanner.co) and TODAY can be complementary rather than competing tools. Hypothesis: plan the week in Momentum on Sunday, use TODAY daily for focus execution.
**Questions to answer:**
- Does Momentum have an API or ICS export that TODAY could read?
- Could TODAY import "today's Momentum plan" as the task list for the day?
- Would the user experience of moving between apps feel natural or fragmented?
- Is this a pairing to document/recommend, or an integration to build?
**First step:** Check Momentum's API availability. Their Pro plan mentions ICS calendar import — that's inbound to Momentum, not outbound. Check if they expose any data.
**Note:** Don't over-engineer. A "Pair with Momentum" section in the README might be the right answer over a technical integration.

### WEEK — Standalone Weekly Planning Companion
**Status:** Concept stage — not ready to build
**Vision:** A separate lightweight weekly planning tool that complements TODAY rather than competing with it. TODAY = focus instrument for execution. WEEK = planning surface for intention.
**Core idea:** Momentum has many things right but risks feature creep (energy sizing, capacity ratios, time blocks, skip reasons, theme tags, progress dashboards, reflect history). WEEK could be the stripped version — same philosophy, radical simplicity.
**The differentiator:** Predictive AI generated from user behaviour, not manual input. Instead of asking users to rate task energy (S/M/L/XL) or set daily energy manually, WEEK learns organically: what tasks does this user typically do on Monday mornings? When do they focus vs when do they coast? What kind of tasks do they defer? The plan adapts to observed rhythm rather than requiring the user to configure it.
**Key principle:** Users still have full control (can override, add, remove) but the default is AI-shaped by their history. The "personalisation" happens invisibly over time, not via onboarding questionnaires.
**Relationship to TODAY:** TODAY data feeds WEEK's model. Focus sessions, task completion times, habit patterns, peak hour — all inputs. WEEK doesn't re-collect what TODAY already knows.
**Why not build yet:**
- TODAY needs to be more stable first (bugs 006/012/014 awaiting)
- TODAY's AI memory needs more depth before WEEK can leverage it meaningfully
- Needs a design session before any code — the stripped Momentum concept needs a proper identity
**When to revisit:** When TODAY has 3+ months of behavioural data and the bug backlog is cleared.

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
| SW error filter (red dot) | 2.16.3 | May 2026 |
| Loop hoisting + safeJSON protection | 2.16.4 | May 2026 |
| BUG-012 overdue card timing fix | 2.16.5 | May 2026 |
| BUG-007 mobile triage bar flash | 2.16.6 | May 2026 |
| Splash pointer-events fix | 2.16.7 | May 2026 |
| AI message 20→30 words + task naming | 2.16.8 | May 2026 |
| BUG-011 ghost chime fix | 2.16.9 | May 2026 |
| Task link inline (manual) + ↗ only (Trello) | 2.16.15 | May 2026 |
| AI energy-aware suggestions + soft cap | 2.16.16 | May 2026 |
| Emergent vs planned insight | 2.16.17 | May 2026 |
| Copy audit (README, AI prompt, info panel) | 2.16.18 | May 2026 |

---

*Last updated: Session 35 (v2.16.18)*
