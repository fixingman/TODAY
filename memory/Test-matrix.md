# TODAY — Test Matrix

> Test cases for releases. Run critical tests before every deploy.

---

## Pre-Release Checklist (REQUIRED)

Run these **before every GitHub push**:

| # | Test | Steps | Pass |
|---|------|-------|------|
| 1 | App loads | Open fresh tab, splash dismisses | ⬜ |
| 2 | Add task | Type + Enter | ⬜ |
| 3 | Check/uncheck | Click checkbox | ⬜ |
| 4 | Delete task | Click × | ⬜ |
| 5 | Dropbox sync | Connect, verify backup | ⬜ |
| 6 | Cross-device | Add on A, appears on B | ⬜ |
| 7 | Triage flow | After 8pm, process tasks | ⬜ |
| 8 | Focus mode | Click task, timer starts | ⬜ |
| 9 | No console errors | Check dev tools | ⬜ |

---

## Full Test Matrix

### 1. Manual Tasks (14 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 1.1 | Add task | Appears at top |
| 1.2 | Edit task | Text updated |
| 1.3 | Delete task | Removed + undo available |
| 1.4 | Reorder (drag) | Order preserved |
| 1.5 | Check task | Done state, strikethrough |
| 1.6 | Uncheck task | Restored |
| 1.7 | XSS: `<script>` | Escaped, no execution |
| 1.8 | Empty input | Rejected |
| 1.9 | Long text (500+) | Wraps |
| 1.10 | Delete last → empty | "A clean slate" |
| 1.11 | Check all → done | "✦ All done" |
| 1.12 | Shift+D | Clears done tasks |
| 1.13 | Rapid check/uncheck | No glitch |
| 1.14 | 100 tasks | All render |

### 2. Zones (15 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 2.1 | Triage: Keep | Stays in TODAY |
| 2.2 | Triage: Soon | Moves to SOON |
| 2.3 | Triage: Let go | Moves to PAST |
| 2.4 | Pull from SOON | Returns to TODAY |
| 2.5 | PAST purge (done 7d) | Auto-removed |
| 2.6 | PAST purge (letgo 30d) | Auto-removed |
| 2.7 | Morning nudge | Shows count |
| 2.8 | **SYNC: A→SOON, B has in TODAY** | B gets SOON (newer timestamp) |
| 2.9 | **SYNC: A pulls back, B has in SOON** | A's pull wins (newer) |
| 2.10 | **SYNC: Both move to zones** | Most recent zoneChangedAt wins |
| 2.11 | **SYNC: Delete + zone conflict** | Deleted task excluded from zones |
| 2.12 | **SYNC: Missing zoneChangedAt** | Graceful fallback (no crash) |
| 2.13 | **SYNC: Schema v5.0 vs v5.1** | Backward compatible |
| 2.14 | **SYNC: Race condition triage** | Last zoneChangedAt wins |
| 2.15 | **SYNC: PAST limit 100** | Only 100 most recent kept |

### 3. Habits (9 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 3.1 | Add habit | Appears in list |
| 3.2 | Complete today | Dot filled |
| 3.3 | Delete habit | Removed |
| 3.4 | Rename habit | Name updated |
| 3.5 | Reorder habits | Order preserved |
| 3.6 | **SYNC: Both add habits** | Union merge |
| 3.7 | **SYNC: Both complete same day** | Deduped |
| 3.8 | **SYNC: A deletes, B completes** | Habit deleted |
| 3.9 | Focus on habit | Session tracked |

### 4. Done/Check State (6 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 4.1 | A checks 10:00, B unchecks 10:05 | Unchecked (newer) |
| 4.2 | A unchecks 10:00, B checks 10:05 | Checked (newer) |
| 4.3 | No timestamp history | Union fallback |
| 4.4 | Trello card checked | Syncs via done_ids |
| 4.5 | Manual task checked | Persists across sync |
| 4.6 | **SYNC: Check/uncheck rapid toggle** | Final state correct |

### 5. Stats & Memory (7 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 5.1 | Focus minutes | Max wins |
| 5.2 | Streak | Max wins |
| 5.3 | Tasks done today | Max wins |
| 5.4 | Memory totalTasksCompleted | Max wins |
| 5.5 | Memory patterns | Merged |
| 5.6 | Memory moments | Union |
| 5.7 | AI name | Preserved |

### 6. Trello (6 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 6.1 | Trello connect | Cards load |
| 6.2 | Trello disconnect | Cards cleared |
| 6.3 | Trello in triage (keep) | Card visible |
| 6.4 | Trello in triage (letgo) | Card hidden locally |
| 6.5 | Trello config syncs | boardId/listId synced |
| 6.6 | Trello popup blocked | Error shown |

### 7. Focus Mode (5 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 7.1 | Start focus | Timer runs |
| 7.2 | Pause (click outside) | Timer pauses |
| 7.3 | Tab away, return | Wall-clock correct |
| 7.4 | PiP sync | Both displays match |
| 7.5 | Session complete | Chime + count increment |

### 8. Network Edge Cases (7 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 8.1 | Offline add, reconnect | Task syncs |
| 8.2 | Token expired | Re-auth prompt |
| 8.3 | Failed backup | Retry on tab focus |
| 8.4 | Rapid sync (both devices) | No data loss |
| 8.5 | Slow network (30s) | "Saving..." shown |
| 8.6 | **localStorage quota exceeded** | Silent fail (gap) |
| 8.7 | **localStorage disabled** | App loads, no persist |

### 9. Destructive Operations (4 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 9.1 | Shift+D clear done | Done tasks removed |
| 9.2 | Disconnect Dropbox | B keeps last sync |
| 9.3 | Clear localStorage | B maintains data |
| 9.4 | AI delete_task | Tracked in deleted_ids |

---

## Test Summary

| Category | Count | Critical |
|----------|-------|----------|
| Manual Tasks | 14 | 5 |
| Zones | 15 | 8 |
| Habits | 9 | 3 |
| Done State | 6 | 3 |
| Stats/Memory | 7 | 2 |
| Trello | 6 | 2 |
| Focus | 5 | 2 |
| Network | 7 | 4 |
| Destructive | 4 | 2 |
| **Total** | **73** | **31** |

---

## Known Issues

| Issue | Fixed | Notes |
|-------|-------|-------|
| Zone duplication | v2.12.13 | Tasks duplicated in TODAY |
| Backup fails silently | v2.12.2 | Retry on focus |
| Deleted tasks in zones | v2.12.14 | Ghost tasks in SOON/PAST |
| AI delete not synced | v2.12.14 | No _addDeletedId call |
| Zone tasks in deleted_ids | v2.12.17 | Sync adding zone task IDs |

---

## Edge Cases: Time & Timezone (needs testing)

| # | Scenario | Risk | Mitigation |
|---|----------|------|------------|
| T1 | **Timezone change (travel)** | Date string changes mid-day → unexpected cleanup | `stat_last_visit` is local-only, but date shift could trigger `applyNewDayCleanup()` |
| T2 | **DST spring forward** (2am→3am) | Skips 1am boundary | Cleanup runs at next tick after 1am — likely OK |
| T3 | **DST fall back** (2am→1am) | Could hit 1am twice | `stat_last_visit` should prevent double-run |
| T4 | **Multi-timezone sync** | Device A/B have different "today" | `stat_last_visit` not synced — each device manages own day |
| T5 | **Manual restore after travel** | Uses `toDateString()` not `_getAppDay()` | **BUG** — line 7423 should use `_getAppDay()` |

### Testing Instructions

**T1 — Timezone change:**
1. Open app, add tasks, check some done
2. Change system timezone forward/back several hours
3. Reload app
4. Verify: done tasks NOT cleared, streak intact

**T3 — DST fall back simulation:**
1. Open app at "1:30am" (simulated)
2. Change clock back to 12:30am
3. Wait for sync tick (7s)
4. Verify: cleanup doesn't run twice

---

*Last updated: Session 19 (v2.12.19)*
