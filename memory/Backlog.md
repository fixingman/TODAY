# Backlog

> Feature TODOs, prototype gaps, and future work.

---

## Active: Zones Prototype (v2.11.0)

**Status:** In production code, needs completion before full release.

### ✅ Implemented
- [x] SOON section (collapsed, visible)
- [x] PAST section (collapsed, visible)
- [x] Per-task evening triage (Keep / ↩ Soon / Let go)
- [x] Done tasks auto-archive to PAST at new day
- [x] Pull from SOON back to TODAY (↩ button)
- [x] Basic localStorage for zones (`today_soon`, `today_past`)
- [x] Triage bar trigger (after 8pm)
- [x] Triage panel with per-task decisions
- [x] Visual feedback (decided tasks collapse with badge)
- [x] "Keep all" batch action
- [x] Auto-close after all decisions
- [x] **Flow rate fix** — now `done / total` (was `done / added`, always hit 100%)
- [x] **PiP fix** — delay before open (prevents Cmd+H focus steal), close+reopen on every minimize

### ⬜ TODO: Core Functionality
- [x] **Dropbox sync** — add `today_soon` and `today_past` to backup/restore ✓
- [x] **Backup schema update** — bump to v5.0, include zones ✓
- [x] **Purge: PAST cleanup** — done items after 7 days, let_go/aged after 30 days ✓ v2.12.6
- [x] **Morning nudge** — "3 still here from yesterday" if tasks carried over ✓ v2.12.7
- [ ] **Aging: TODAY → PAST** — 7+ days inactive → auto-archive (status: `aged`)
- [ ] **Aging: SOON → PAST** — 30+ days → auto-archive (status: `aged`)

### ⬜ TODO: Edge Cases
- [ ] What if user never does triage? (currently: tasks stay, age naturally)
- [ ] Triage with 0 undone tasks (shouldn't show, but verify)
- [ ] PAST section performance with 100+ items (currently showing last 20)

---

## Pending Features

### Todoist Integration
**From:** Research.md §2
**Priority:** Highest integration priority
**Status:** Not started

---

## Technical Debt

### GitHub Push
**Priority:** High
**Status:** Many commits ahead of origin — needs push
**Notes:** Local repo has significant changes not pushed to remote

### Performance Audit Update
**Priority:** Low
**Status:** ✅ Updated to v2.12.7 (Session 18)
**Notes:** Audit doc updated from v2.3.4 to v2.12.7 with current metrics

### Further Element Caching
**Priority:** Low
**Status:** 13 elements cached in v2.12.5
**Notes:** Could cache more frequently-queried elements if needed

### Console Error Monitoring
**Priority:** Low
**Status:** Not started
**Notes:** Add visible indicator in UI if JS errors occur (dev aid)

---

## Watch Decisions

Decisions that may need revisiting based on real usage:

| Decision | Current | Watch For |
|----------|---------|-----------|
| Midnight auto-move | No (user decides) | Too much friction? Trello cards already auto-refresh. |
| SOON visibility | Visible (collapsed) | Should it be hidden until AI surfaces items? |
| PAST read-only | Yes | Need restore for accidentally archived items? |
| Triage trigger time | 8pm | Too early? Too late? User-configurable? |

---

## Completed Features

| Feature | Version | Date |
|---------|---------|------|
| Idle companion (7 creatures) | 2.10.0 | Mar 2026 |
| Memory compartmentalization | — | Mar 2026 |
| Zones prototype | 2.11.0 | Mar 2026 |

---

*Last updated: Session 14*
