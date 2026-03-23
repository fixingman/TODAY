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
- [ ] **Aging: TODAY → PAST** — 7+ days inactive → auto-archive (status: `aged`)
- [ ] **Aging: SOON → PAST** — 30+ days → auto-archive (status: `aged`)
- [ ] **Purge: PAST cleanup** — remove `let_go`/`aged` items after 30 days
- [ ] **Morning nudge** — "3 still here from yesterday" if undone tasks carried over

### ⬜ TODO: Polish
- [ ] **`returnedFrom: 'soon'` badge** — show indicator when task pulled from SOON
- [ ] **AI triage suggestions** — context-aware hints ("this had 2 pomodoros...")
- [ ] **Trello cards in triage?** — decide if Trello tasks should participate

### ⬜ TODO: Edge Cases
- [ ] What if user never does triage? (currently: tasks stay, age naturally)
- [ ] Triage with 0 undone tasks (shouldn't show, but verify)
- [ ] PAST section performance with 100+ items (currently showing last 20)

---

## Pending Features

### PWA Install Prompt (Android)
**From:** Session 16, implemented v2.11.7
**Status:** ✅ Complete
**Details:** Android users see "Install App" button in About panel. Uses native `beforeinstallprompt` API. Coffee/dev-hours hidden in installed PWA. iOS left alone (no API support).

### iOS Keyboard Fix
**From:** Session 11, implemented v2.11.2
**Status:** Implemented, needs testing on real iOS device
**Details:** visualViewport API positions input bar above keyboard. Black fill below bar when not focused.

### Todoist Integration
**From:** Research.md §2
**Priority:** Highest integration priority
**Status:** Not started

### "Not Today" Evolution
**From:** Research.md §18
**Status:** Superseded by Zones (§19)
**Note:** Original concept evolved into Past/Today/Soon model

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
