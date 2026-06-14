# Data Model

> localStorage schema, ID conventions, and data structures.

---

## localStorage Keys

### Tasks & Habits

| Key | Type | Description |
|---|---|---|
| `today_manual` | JSON array | Manual tasks: `{id, text, url?, lastActive?, focusSessions?}` |
| `today_done` | JSON array | IDs of completed tasks |
| `today_deleted_ids` | JSON array | `{id, at}` — explicit deletes |
| `today_checked_ids` | JSON array | `{id, at}` — explicit checks |
| `today_unchecked_ids` | JSON array | `{id, at}` — explicit unchecks |
| `today_habits` | JSON array | `{id, name, created_at, focusSessions?, archived?}` |
| `today_habit_completions` | JSON object | `{habitId: ['YYYY-MM-DD', ...]}` |
| `today_habit_events` | JSON object | `{"habitId::YYYY-MM-DD": {type: 'check'|'uncheck', at: ISO}}` — LWW map preventing sync from re-checking unchecked habits (BUG-026) |
| `today_deleted_habit_ids` | JSON array | IDs of hard-deleted habits (no current UI path — archiving uses `archived:true` on the object instead) |

### Zones (v5.0)

| Key | Type | Description |
|---|---|---|
| `today_soon` | JSON array | SOON tasks: `{id, text, zone: 'soon', zoneChangedAt}` |
| `today_past` | JSON array | PAST tasks: `{id, text, zone: 'past', status, zoneChangedAt}` |

**Zone status values:** `done`, `let_go`, `aged`

### Integrations

| Key | Type | Description |
|---|---|---|
| `today_trello_cache` | JSON | Cached Trello cards (local, resets on fetch) |
| `today_trello_order` | JSON array | Trello card order IDs (synced via Dropbox) |
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
| `stat_streak_date` | string | YYYY-MM-DD local — date streak was last incremented; guards against double-count on multi-device sync (BUG-020) |
| `stat_last_visit` | string | Last date app opened |
| `stat_tasks_done_today` | string | Tasks completed today (for memory/AI) |
| `stat_focus_mins_today` | string | Focus minutes today |
| `stat_focus_mins_date` | string | `_getAppDay()` string — date those minutes were earned; used as a guard on sync merge so yesterday's minutes are never restored as today's (BUG-024) |
| `stat_focus_mins_alltime` | string | Lifetime focus minutes |
| `morning_nudge_count` | string | Carried-over tasks from yesterday (set by `applyNewDayCleanup`) |
| `today_day_review` | JSON | Yesterday's day-end stats `{done, focusMins, habits, habitsTotal, streak, kept, soon, letgo, date}` — saved at triage, consumed by morning nudge, auto-cleared after noon |
| `morning_nudge_ai_YYYY-MM-DD` | string | Cached AI-rewritten morning nudge for that date — generated once per morning by `_fetchMorningNudgeAI`; stale keys pruned on write, today's cleared at noon (v2.17.73) |

### History & Reports

| Key | Type | Description |
|---|---|---|
| `today_daily_history` | JSON array | Rolling 30-day snapshot `{date, tasksDone, focusMins, habitsKept, habitsTotal}` — one entry per day, written at midnight in `applyNewDayCleanup`, used by the About weekly grid and the Sunday AI reflection (v2.17.55) |
| `week_reflection_YYYY-MM-DD` | string | Cached AI-generated Sunday reflection for that date — regenerated at most once per day; falls back to rule-based summary if no AI key (v2.17.56) |

**Note:** Flow rate is calculated live using research-based diminishing returns formula: `100 × (1 - 0.8^done)`. First task = 20% (quick win), 5 tasks ≈ 67% (good day). Based on Endowed Progress Effect (Nunes & Dreze 2006) and Goal Gradient Hypothesis (Kivetz et al. 2006). Not stored.

**Note:** Habit strength uses asymmetric exponential smoothing over 90 days:
- `alpha_up = 0.90` — building is unchanged (7 days → ~52%, 14 days → ~77%)
- `alpha_down = 0.97` — misses are gentle (30-day streak miss: 3% drop, not 10%)
- Perfect streaks reach identical peaks. One bad day doesn't feel catastrophic.

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

**Version: 5.2**

```javascript
{
  version: '5.2',
  manual: [...],
  habits: [...],
  habitCompletions: {...},
  habit_events: {...},         // v2.17.53 — LWW map for uncheck protection (BUG-026)
  done: [...],
  deleted: [...],
  checked: [...],
  unchecked: [...],
  deletedHabits: [...],
  trelloFocus: {...},
  trello_order: [...],         // v5.2 — Trello card order
  memory: {...},               // v4.0 addition
  soon_tasks: [...],           // v5.0 — SOON zone
  past_tasks: [...],           // v5.0 — PAST zone
  triage_history: [...],       // v5.1 — AI triage learning
  stat_focus_mins_date: '',    // v2.17.44 — date guard for focus minutes sync
  stat_streak_date: '',        // BUG-020 — prevents double-count on multi-device
  exportedAt: 'ISO string'
}
```

---

## Order Preservation

**Critical:** `manualTasks`, `habitsList`, and `trelloTasks` arrays preserve drag order. Never re-sort them programmatically.

- Manual tasks: order stored in `today_manual` array
- Habits: order stored in `today_habits` array  
- Trello: order stored separately in `today_trello_order` (applied after each Trello fetch)

## Trello Card Visibility

Cards appear if: **in today list** OR **due today/overdue**.

Cleanup rules:
- Due today + done → stays visible until day ends
- Overdue + NOT done → stays visible (still needs action)
- Overdue + done → **hidden** (completed, move on)

## Day Boundaries

Tasks, zones, streak, and focus roll at midnight. **Habits roll at 3am** (v2.17.61) — a late-night check (e.g. 12:30am) still counts toward the day that's ending.

| Purpose | Function | Format | Timezone |
|---------|----------|--------|----------|
| Task/streak/focus day boundary | `_getAppDay()` | `"Fri Apr 18 2026"` | Local midnight |
| Date-only strings (YYYY-MM-DD) | `_localISO(d)` | `"2026-04-18"` | Local |
| Habit today (3am roll) | `_habitTodayISO()` | `_localISO(_habitNow())` | Local — `_habitNow()` = `Date.now() - 3h` |
| Habit 21-day strip | `_getHabitDates()` | uses `_habitNow()` | Same shift — **must stay in lockstep with `_habitTodayISO()`** |
| Full timestamps (sync ordering) | `new Date().toISOString()` | `"2026-04-18T01:23:45Z"` | UTC |

**Never use `toISOString().slice(0,10)` for date logic** — returns UTC, diverges from local near midnight (BUG-010).

**Never split `_habitTodayISO()` and `_getHabitDates()`** — both must use `_habitNow()` or the 21-day strip refreshes on a different boundary than checking (this exact mismatch caused BUG-010's original regression in v2.12.74).

## Deletion Persistence

**Critical:** `deleted_ids` persists across days. Never clear it on new-day cleanup.

- Delete a task → it's gone forever
- Sync cannot resurrect deleted tasks (merge checks `deleted_ids`)
- Entries auto-purge after 30 days to prevent bloat
- Applies to tasks from TODAY, SOON, or anywhere
