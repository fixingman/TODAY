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
- Day changes at **1am**, not midnight
- Use `_getAppDay()` for all day logic
- Keeps late-night work feeling like "today"

### Evening Triage (8pm–1am)
- Per-task decisions: Keep / Soon / Let go
- AI hints based on task age, focus sessions, patterns
- Dismissed state resets at new app day

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
