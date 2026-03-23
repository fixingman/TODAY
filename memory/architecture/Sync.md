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

## Backup Schema (v5.0)

```javascript
{
  version: '5.0',
  saved_at: 'ISO string',
  // Tasks
  manual_tasks: [{id, text, lastActive?}, ...],
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
  memory: {totalTasksCompleted, patterns: {...}, aiName, moments: [...]}
}
```

**Zone status values:** `done`, `let_go`, `aged`

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
