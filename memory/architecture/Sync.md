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

## Backup Schema (v4.0)

```javascript
{
  version: '4.0',
  manual: [{id, text, lastActive?}, ...],
  habits: [{id, name, created_at, focusSessions?}, ...],
  habitCompletions: {habitId: ['YYYY-MM-DD', ...]},
  done: ['id1', 'id2', ...],
  deleted: [{id, at}, ...],
  checked: [{id, at}, ...],
  unchecked: [{id, at}, ...],
  deletedHabits: ['id1', ...],
  trelloFocus: {cardId: sessionCount},
  memory: {totalTasksCompleted, patterns: {...}},
  exportedAt: 'ISO string'
}
```

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
| Task list | Union by ID |
| Done IDs | Union |
| Deleted IDs | Union (excluded from tasks) |
| Stats | Last-write-wins |
| Memory | Merge patterns, sum totals |

---

## Offline Behavior

1. App fully functional offline
2. Mutations queued in localStorage
3. Sync resumes on connectivity
4. SW caches app shell for offline access
