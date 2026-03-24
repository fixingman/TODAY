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

### Zones (v5.0)

| Key | Type | Description |
|---|---|---|
| `today_soon` | JSON array | SOON tasks: `{id, text, zone: 'soon', zoneChangedAt}` |
| `today_past` | JSON array | PAST tasks: `{id, text, zone: 'past', status, zoneChangedAt}` |

**Zone status values:** `done`, `let_go`, `aged`

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
| `today_triage_history` | JSON array | Past triage decisions for AI learning |

**Triage history entry:**
```javascript
{
  text: "task text",
  decision: "kept" | "soon" | "letgo",
  sessions: 2,           // focus sessions on task
  ageDays: 5,            // how old when triaged
  dayOfWeek: 0,          // 0=Sunday, 6=Saturday
  hour: 22,              // hour of decision
  ts: "ISO timestamp"    // for deduplication
}
```

### Stats

| Key | Type | Description |
|---|---|---|
| `stat_alltime_done` | string | Lifetime completed count |
| `stat_streak` | string | Current daily streak |
| `stat_last_visit` | string | Last date app opened |
| `stat_tasks_done_today` | string | Tasks completed today (for memory/AI) |
| `stat_focus_mins_today` | string | Focus minutes today |
| `stat_focus_mins_alltime` | string | Lifetime focus minutes |

**Note:** Flow rate is calculated live (`done / total` visible tasks), not stored. See Research.md § Stats.

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

**Version: 5.1**

```javascript
{
  version: '5.1',
  manual: [...],
  habits: [...],
  habitCompletions: {...},
  done: [...],
  deleted: [...],
  checked: [...],
  unchecked: [...],
  deletedHabits: [...],
  trelloFocus: {...},
  memory: {...},           // v4.0 addition
  soon_tasks: [...],       // v5.0 — SOON zone
  past_tasks: [...],       // v5.0 — PAST zone
  triage_history: [...],   // v5.1 — AI triage learning
  exportedAt: 'ISO string'
}
```

---

## Order Preservation

**Critical:** `manualTasks` and `habitsList` arrays preserve drag order. Never re-sort them programmatically.
