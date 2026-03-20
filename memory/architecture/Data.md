# Data Model

> localStorage schema, ID conventions, and data structures.

---

## localStorage Keys

### Tasks & Habits

| Key | Type | Description |
|---|---|---|
| `today_manual` | JSON array | Manual tasks: `{id, text, lastActive?}` |
| `today_done` | JSON array | IDs of completed tasks |
| `today_deleted_ids` | JSON array | `{id, at}` — explicit deletes |
| `today_checked_ids` | JSON array | `{id, at}` — explicit checks |
| `today_unchecked_ids` | JSON array | `{id, at}` — explicit unchecks |
| `today_habits` | JSON array | `{id, name, created_at, focusSessions?}` |
| `today_habit_completions` | JSON object | `{habitId: ['YYYY-MM-DD', ...]}` |
| `today_deleted_habit_ids` | JSON array | IDs of deleted habits |

### Integrations

| Key | Type | Description |
|---|---|---|
| `today_trello_cache` | JSON | Cached Trello cards |
| `today_trello_focus` | JSON object | `{cardId: sessionCount}` |
| `trello_config` | JSON | API key, token, board ID, list ID |
| `trello_token` | string | Trello OAuth token |
| `dropbox_token` | string | Dropbox access token |
| `dropbox_refresh_token` | string | Dropbox refresh token (PKCE) |
| `dropbox_token_expiry` | string | Epoch ms |

### AI

| Key | Type | Description |
|---|---|---|
| `today_ai_key` | string | API key (Gemini or Anthropic) |
| `today_ai_provider` | string | `'gemini'` or `'anthropic'` |
| `ai_last_open_date` | string | YYYY-MM-DD — for morning briefing |
| `ai_last_observation` | string | Last proactive observation type |
| `ai_last_observation_time` | string | Timestamp of last observation |

### Stats

| Key | Type | Description |
|---|---|---|
| `stat_alltime_done` | string | Lifetime completed count |
| `stat_streak` | string | Current daily streak |
| `stat_last_visit` | string | Last date app opened |
| `stat_flow_rate` | string | Completion rate (0-100) |
| `stat_tasks_added_today` | string | Tasks added today |
| `stat_tasks_done_today` | string | Tasks completed today |
| `stat_focus_mins_today` | string | Focus minutes today |
| `stat_focus_mins_alltime` | string | Lifetime focus minutes |

### Memory (AI Companion)

| Key | Type | Description |
|---|---|---|
| `today_memory` | JSON | `{totalTasksCompleted, patterns: {...}}` |

---

## ID Conventions

| Type | Format | Example |
|---|---|---|
| Manual task | `manual_` + timestamp | `manual_1741234567890` |
| Habit | `habit_` + timestamp | `habit_1741234567890` |
| Trello task | Trello card ID | `5f3d...` |

---

## Backup Schema

**Version: 4.0**

```javascript
{
  version: '4.0',
  manual: [...],
  habits: [...],
  habitCompletions: {...},
  done: [...],
  deleted: [...],
  checked: [...],
  unchecked: [...],
  deletedHabits: [...],
  trelloFocus: {...},
  memory: {...},        // v4.0 addition
  exportedAt: 'ISO string'
}
```

---

## Order Preservation

**Critical:** `manualTasks` and `habitsList` arrays preserve drag order. Never re-sort them programmatically.
