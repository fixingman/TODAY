# Temporal Model — Zones

> Past, Today, Soon — A mindset model for tasks

**Status:** Implemented (v2.11.0)  
**Date:** March 2026

---

## Decision

**Collapsed Zones** — PAST and SOON are collapsed sections, TODAY is primary.

- PAST: collapsed at top, shows completed/let-go tasks
- TODAY: main list, always visible
- SOON: collapsed at bottom, deferred tasks

---

## Philosophy

### The Temporal Trinity

| Zone | Meaning | Feeling |
|------|---------|---------|
| **PAST** | What didn't happen | Acknowledgment without guilt |
| **TODAY** | What matters now | Focus, intention |
| **SOON** | What's coming | Gentle anticipation |

### Key Principles

1. **No zone is punitive** — PAST isn't "failed", SOON isn't "procrastinated"
2. **Zones are mindsets, not deadlines** — fluid states of attention
3. **TODAY is always primary** — other zones are accessible but secondary
4. **Movement is intentional** — user decides via evening triage

---

## Implementation Rules

### Day Boundary
- Tasks / triage / streak / focus roll at **midnight** (v2.12.74), unified clock (v2.12.78)
- **Habits roll at 3am** (v2.17.61) — `_habitTodayISO()` → `_localISO(_habitNow())`, `_habitNow() = Date.now() - 3h`. A late-night check counts toward the day that's ending (the day ends when you sleep, not when the clock flips). See `research/Psychology.md` → *Habit deadline & the 3am grace*.
- `_getAppDay()` for task-day checks (human-readable), `_localISO()` for YYYY-MM-DD strings. `_getHabitDates()` uses the same `_habitNow()` so the 21-day strip refreshes in lockstep with checking — never split these (that mismatch was the v2.12.74 lag bug).
- All local time — never use `toISOString().slice(0,10)` (UTC, diverges near midnight). The 3am grace shifts a Date object then derives the local date via `_localISO`, so it stays local too.
- Full ISO timestamps (`zoneChangedAt`, `ts`) stay UTC for cross-timezone sync
- **Edge:** the `today_daily_history` habit snapshot runs on the midnight cleanup; a check made between the first post-midnight open and 3am may not land in that day's snapshot `habitsKept` (live strip is always correct).

### Evening Triage (8pm–midnight)
- Per-task decisions: Keep / Soon / Let go
- AI hints based on task age, focus sessions, patterns
- Dismissed state resets at new day

### Aging
| Zone | Condition | Action |
|------|-----------|--------|
| TODAY | 7+ days | Visual fade only (CSS opacity) |
| SOON | 30+ days | → PAST (status: "aged") |
| PAST (done) | 7 days | Purged |
| PAST (let_go/aged) | 30 days | Purged |

### Data Model
```javascript
{
  id: 'manual_123',
  text: 'task text',
  zone: 'today',           // 'today' | 'soon' | 'past'
  zoneChangedAt: 'ISO',    // when moved to current zone
  status: 'done',          // for PAST: 'done' | 'let_go' | 'aged'
}
```

---

## What Was Explored (Archived)

Options considered before deciding on collapsed zones:
- Three vertical sections (too complex)
- Inline badges (cluttered)
- Swipe/gesture horizontal zones (hidden = forgotten)

Collapsed zones won because it preserves TODAY's simplicity while adding temporal awareness.
