# Sync & Backup

> Dropbox sync, merge logic, and backup schema.

---

## Design Principles

1. **Local-first** — app works offline, syncs when possible
2. **Union merge** — additions from both sides preserved
3. **Explicit deletes** — tracked with timestamps
4. **Last-write-wins** — for simple values (stats)
5. **No conflicts** — merge is deterministic

---

## Dropbox Integration

### Files

| Environment | File |
|-------------|------|
| Production | `/today-backup.json` |
| Dev | `/today-backup-dev--today-here.json` |

### Sync Flow

```
1. On load: fetch remote, merge with local
2. On mutation: debounced save (2s)
3. On focus: check for remote changes
4. Every 7s: background sync check
```

### Merge Algorithm

```javascript
// Arrays: union by ID, prefer newer timestamps
merged = [...local, ...remote].reduce((acc, item) => {
  const existing = acc.find(i => i.id === item.id);
  if (!existing) return [...acc, item];
  // Keep the one with newer timestamp
  return acc.map(i => i.id === item.id && item.at > i.at ? item : i);
}, []);

// Deleted items: exclude from merge
merged = merged.filter(item => !deletedIds.includes(item.id));
```

---

## Backup Schema (v5.1)

```javascript
{
  version: '5.1',
  saved_at: 'ISO string',
  // Tasks
  manual_tasks: [{id, text, lastActive?, zone?, zoneChangedAt?}, ...],
  done_ids: ['id1', 'id2', ...],
  deleted_ids: [{id, at}, ...],
  checked_ids: [{id, at}, ...],
  unchecked_ids: [{id, at}, ...],
  // Zones (v5.0)
  soon_tasks: [{id, text, zone: 'soon', zoneChangedAt}, ...],
  past_tasks: [{id, text, zone: 'past', status, zoneChangedAt}, ...],
  // Habits
  habits: [{id, name, created_at, focusSessions?}, ...],
  habit_completions: {habitId: ['YYYY-MM-DD', ...]},
  deleted_habit_ids: ['id1', ...],
  // Stats
  stat_focus_mins_today: '0',
  stat_streak: '1',
  stat_tasks_done_today: '0',
  // Memory
  memory: {totalTasksCompleted, patterns: {...}, aiName, moments: [...]},
  // Triage (v5.1)
  triage_history: [{id, decision, at}, ...]
}
```

**Zone status values:** `done`, `let_go`, `aged`

---

## Zone-Aware Sync (v2.12.13+)

When merging `manualTasks` with remote data, tasks that exist in zones (SOON/PAST) are handled specially to prevent duplication:

### Scenario: Task moved to SOON on Device A
1. Device A: moves task to SOON → removed from manualTasks, added to soonTasks
2. Device A: backs up to Dropbox
3. Device B: restores → task is in remote's `soon_tasks` but NOT in `manual_tasks`
4. Device B's local `manualTasks` still has the task

**Resolution:** Compare `zoneChangedAt` timestamps:
- If remote zone timestamp is newer → task stays OUT of manualTasks (was moved to zone)
- If local task timestamp is newer → task was pulled BACK to TODAY, keep in manualTasks

### Scenario: Task pulled back from SOON on Device B
1. Device B: pulls task from SOON back to TODAY → `zoneChangedAt` updated
2. Device B: backs up to Dropbox
3. Device A: restores → local soonTasks has the task, remote manualTasks has it too

**Resolution:** Compare timestamps:
- If local zone timestamp is newer → task stays in zone (local zone move is more recent)
- If remote task timestamp is newer → task was pulled back, move to manualTasks

### Deleted Tasks in Zones (v2.12.14)
Deleted tasks are excluded from zone merge to prevent ghost tasks:
- When merging SOON: skip tasks in `mergedDeletedMap`
- When merging PAST: skip tasks in `mergedDeletedMap`
- AI `delete_task` action now calls `_addDeletedId()` for proper sync

---

## Timestamps

All timestamps are **ISO strings** (`new Date().toISOString()`).

### Tracked Events

| Event | Storage Key |
|-------|-------------|
| Task deleted | `today_deleted_ids` |
| Task checked | `today_checked_ids` |
| Task unchecked | `today_unchecked_ids` |
| Habit deleted | `today_deleted_habit_ids` |
| Local mutation | `last_local_change` |
| Successful backup | `last_successful_backup` |

---

## Conflict Resolution

| Data Type | Resolution |
|-----------|------------|
| Task list | Union by ID, remote order wins |
| Done IDs | Union with check/uncheck timestamps |
| Deleted IDs | Union (excluded from tasks) |
| SOON tasks | Union by ID, newer zoneChangedAt wins |
| PAST tasks | Union by ID, newer zoneChangedAt wins, keep last 100 |
| Stats | Max wins |
| Memory | Merge patterns, max of counters, union of moments |

---

## Offline Behavior

1. App fully functional offline
2. Mutations queued in localStorage
3. Sync resumes on connectivity
4. SW caches app shell for offline access
