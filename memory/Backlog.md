# Backlog

> Feature TODOs, prototype gaps, and future work.

---

## Pending Features

### Idle Companion Design Refinement
**Status:** Not started
**Goal:** Develop the design of idle companion to higher resolution and more consistency.

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
**Status:** ✅ Implemented (v2.12.8)
**Notes:** Red pulsing dot appears on errors, click to view log

---

## Watch Decisions

Decisions that may need revisiting based on real usage:

| Decision | Current | Watch For |
|----------|---------|-----------|
| PAST read-only | Yes | Need restore for accidentally archived items? |
| Triage trigger time | 8pm | Too early? Too late? User-configurable? |
| Habit strength curve | Linear display | Above 70%, should progress feel harder? Diminishing returns curve like flow rate? |

---

## Completed Features

| Feature | Version | Date |
|---------|---------|------|
| Idle companion (7 creatures) | 2.10.0 | Mar 2026 |
| Memory compartmentalization | — | Mar 2026 |
| Zones prototype | 2.11.0 | Mar 2026 |

---

*Last updated: Session 22 (v2.12.47)*
