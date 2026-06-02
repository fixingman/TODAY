# Backlog

> Feature TODOs, technical debt, decisions, and institutional knowledge.

---

## Pending Features

### AI Improvements
**Status:** Partially done (v2.13.0–2.17.11)
**Done:** Morning briefings, day-end review, stale task awareness, behavioral insights, break_down/move_soon/reflect actions, morning reflection nudge, suggestion cooldowns (7-day), suggestion history (Dropbox-synced), deterministic chips for aging tasks, suggestion history in AI context, conversation memory across sessions (v2.17.11).
**Remaining:** Deeper personality (weather/energy awareness beyond peak hour), richer habit streak celebrations.

### Push Notifications
**Status:** Not started
**Platform:** iOS 16.4+ (installed PWA only) + Android. Uses Web Push API + VAPID keys.
**Stack:** `push` listener in `sw.js`, VAPID keys in Netlify env, two new Netlify functions (store subscription + scheduled send), permission UI in Connections panel.
**Candidates:** 8pm triage reminder, habit nudge (custom time), morning briefing, peak hour focus suggestion.
**Key constraint:** iOS has no background sync — notifications must be server-sent via Netlify Scheduled Functions. App cannot self-schedule.
**Effort:** Medium. Code is straightforward; main decision is what to notify and when.

### Weekly Reports
**Status:** Done (v2.17.55–59)
**Done:** Daily history snapshots at midnight. 7-day grid in About panel (tasks + focus per day, today live). Pattern-based narrative below grid (reads trend/spike/weekend/depth — not totals). Sunday AI-generated reflection cached per day, with rule-based fallback if no AI key or offline. v2.17.59: grid activity bars (shape, not just numbers), standout-day dot, kind week-over-week line (`#weekCompare`), and a weekday-rhythm insight (`#weekRhythm`) — the first behaviour-predictive WEEK seed.
**Possible next:** habit consistency ribbon in the grid (evaluated, deferred — habit/streak anxiety risk needs careful framing).

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
**Status:** Done (v2.17.58) — Option D implemented
**Done:** Progress badge "N/M ✓" in task meta row. Read-only, pulls from `checklists=all` API param. Only shows when card has checklists.
**Future:** Option B (write-back) is the right long-term answer if bidirectional editing is ever needed.

---

### AI System Prompt Trimming
**Status:** Deferred — revisit if token cost becomes a real concern
**Analysis (session 37):** Prompt is ~700–800 static tokens + 50–400 dynamic (task/habit lists). Realistic trim is ~100–120 tokens per call. At personal productivity usage (10–30 AI calls/day) and current free Gemini tier, this is under $0.01/day on Claude — negligible.
**Risk:** The prompt has been carefully tuned through many sessions. The "name the task in message" rule, energy awareness examples, and philosophy block all fix real bugs or produce measurably better output. Trimming risks regression.
**What's safe to cut when needed:** Action type descriptions after `—` (~40 tokens), energy awareness sub-bullets with examples (~40 tokens), redundant message/rules overlap (~30 tokens).
**What must not be cut:** Task/habit lists with IDs, JSON format rules, "name the task" guideline, `ids` array docs, personality + philosophy block.
**Revisit when:** Token cost becomes a real concern, or prompt grows past 500 static lines.

### WEEK — Standalone Weekly Planning Companion
**Status:** Concept stage — not ready to build
**Vision:** A separate lightweight weekly planning tool. TODAY = focus instrument. WEEK = planning surface.
**The differentiator:** Predictive AI from user behaviour — no manual energy ratings. WEEK learns organically what tasks this user does Monday mornings, when they focus vs coast, what they defer. Plan adapts to observed rhythm.
**Relationship to TODAY:** TODAY data feeds WEEK's model. Focus sessions, task completion times, habit patterns, peak hour — all inputs.
**Why not build yet:** AI memory needs more depth. Needs a design session — stripped Momentum concept needs its own identity.
**First seed shipped (v2.17.59):** the weekday-rhythm line in the About week summary ("You tend to move most on Tuesdays.") is the first behaviour-predictive output, computed from `today_daily_history`. Proves the data can carry a WEEK-style insight. Reuse this aggregation pattern when WEEK gets built.
**When to revisit:** When TODAY has 3+ months of behavioural data and bug backlog is cleared.

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
| Momentum Integration | No public API. ICS is inbound-only to Momentum. Workflow pairing (plan in Momentum on Sunday, execute in TODAY daily) is the right answer. |

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
| Connections panel documented | 2.16.18 | May 2026 |
| _onWake() consolidation | 2.17.0 | May 2026 |
| AI multi-task actions (ids array) | 2.17.6 | May 2026 |
| Focus mode checkbox fill removed | 2.17.7 | May 2026 |
| Scroll position preserved on app return | 2.17.8 | May 2026 |
| Phantom SOON tasks fix (BUG-018) | 2.17.9 | May 2026 |
| Section count after label + pull in | 2.17.10 | May 2026 |
| AI conversation memory | 2.17.11 | May 2026 |
| CHANGELOG trimmed 235→3 entries | 2.17.12 | May 2026 |
| safeJSON + transition:all perf fixes | 2.17.13 | May 2026 |
| Splash rAF typewriter + DPR canvas | 2.17.19 | May 2026 |
| BUG-019/021 splash explosion fix (DPR strip + v2.1.0 dismiss restore) | 2.17.29 | May 2026 |
| AI observation-first rewrite, reduced chips | 2.17.25 | May 2026 |
| BUG-004 blank-on-wake fix | 2.17.24 | May 2026 |
| BUG-020 streak cross-device double-count fix | 2.17.26 | May 2026 |
| AI panel input size fix (--text-md, placeholder opacity) | 2.17.30 | May 2026 |
| Changelog expanded entry — bullet dots removed | 2.17.31 | May 2026 |
| Undo delete — restores to original list position | 2.17.33 | May 2026 |
| Micro interactions — checkmark stroke-draw, streak milestone pulse, habit run cascade | 2.17.34 | May 2026 |
| PiP froze at 00:01 — completion detection + Again CTA | 2.17.35 | May 2026 |
| BUG-022 focus fill bar pulsating during countdown | 2.17.36 | May 2026 |
| BUG-023 top panels flash twice on desktop PWA restore | 2.17.37 | May 2026 |
| Changelog alignment fix in About panel | 2.17.38 | May 2026 |
| PWA launch dim green flash — manifest background_color fix | 2.17.39 | May 2026 |
| CSS token audit — all hardcoded hex/rgba tokenised | 2.17.40 | May 2026 |
| Offline mode — AI CTA and connections panel disabled when offline | 2.17.42 | May 2026 |
| PiP CTAs always visible when session completes | 2.17.45 | May 2026 |
| BUG-026 habit re-check after uncheck — habitEvents LWW map | 2.17.53 | May 2026 |
| habitEvents full-restore gap + --text-xs2 token removed | 2.17.54 | May 2026 |
| Weekly retrospective in About panel + header/tooltip fixes | 2.17.55 | May 2026 |
| Week reflections — pattern narrative + AI Sunday block | 2.17.56–57 | May 2026 |
| Trello checklist progress badge (option D) | 2.17.58 | May 2026 |
| BUG-024 focus minutes carry fix (true root cause — applyNewDayCleanup early return) | 2.17.48 | May 2026 |
| BUG-025 PiP Again flash + re-open 00:00 + sleep/wake done state | 2.17.49–52 | May 2026 |
| _onWake animation audit — all persistent animations suppressed on repaint cycle | 2.17.50 | May 2026 |
| CSS token audit pass 2 — keyframes + CHK SVG currentColor | 2.17.51 | May 2026 |
| Habit checkmark color fix (color:var(--bg) for currentColor stroke) | 2.17.52 | May 2026 |
| BUG-026 habit re-check after uncheck — habitEvents LWW map | 2.17.53 | May 2026 |

---

*Last updated: v2.17.59*
