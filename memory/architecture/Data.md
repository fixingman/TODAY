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
| `today_soon` | JSON array | SOON tasks: `{id, text, zone: 'soon', zoneChangedAt, revived?}` |
| `today_past` | JSON array | PAST tasks: `{id, text, zone: 'past', status, zoneChangedAt}` |

**Zone status values:** `done`, `let_go`, `aged`
**`revived`** (v2.27.0): count of PAST→SOON revives on this task — set by `reviveFromPast()`, rides the task object through all zones/merges. Future nudge/insight signal.

### Meeting

| Key | Type | Description |
|---|---|---|
| `today_user_names` | JSON array | First names used for meeting attribution (multi-name, captured inline at first mic tap since v2.31.0). LWW-merged via `user_names_at`. (Key is `today_user_names` — the backup payload field is `user_names`; do not confuse them.) |
| `user_names_at` | string | ISO timestamp of the last `user_names` write — newer wins on merge. |

### Integrations

| Key | Type | Description |
|---|---|---|
| `today_trello_cache` | JSON | Cached Trello cards (local, resets on fetch) |
| `today_trello_order` | JSON array | Trello card order IDs (synced via Dropbox) |
| `today_trello_order_at` | string | ISO stamp of the last reorder — newer wins on merge so order doesn't get clobbered cross-device (BUG-042, v2.18.4) |
| `today_trello_lastactive` | JSON object | `{trello_<id>: ms}` — last focus activity per card. Trello's analogue of a manual task's `lastActive`; age basis is `lastactive \|\| firstseen \|\| now`. **MAX-merges** (newest activity wins), unlike `firstseen`'s MIN-merge — persists across days, pruned when a card leaves the list (BUG-064, v2.43.6) |
| `today_trello_firstseen` | JSON object | `{trello_<id>: ms}` — when the card first entered YOUR list; age basis fallback. **MIN-merges** (earliest sighting wins). Persists across days, never cleared at midnight (BUG-049) |
| `today_trello_focus` | JSON object | `{cardId: sessionCount}` — daily-reset; a card with >0 reads as active (no age dimming, BUG-043) |
| `trello_config` | JSON | API key, token, board ID, list ID |
| `trello_token` | string | Trello OAuth token |
| `dropbox_token` | string | Dropbox access token |
| `dropbox_refresh_token` | string | Dropbox refresh token (PKCE) |
| `dropbox_token_expiry` | string | Epoch ms |
| `today_connections_privacy_seen` | string | Local-only `'1'` after the first Connections-panel open; gates the one-time privacy reassurance and is deliberately excluded from Dropbox backup/sync |

### AI

| Key | Type | Description |
|---|---|---|
| `today_ai_key_gemini` | string | Gemini API key, stored locally and excluded from Dropbox backup |
| `today_ai_key_claude` | string | Claude API key, stored locally and excluded from Dropbox backup |
| `today_ai_provider` | string | `'gemini'` or `'claude'` |
| `ai_last_open_date` | string | YYYY-MM-DD — for morning briefing |
| `ai_last_observation` | string | Last proactive observation type |
| `ai_last_observation_time` | string | Timestamp of last observation |
| `today_triage_history` | JSON array | Past triage decisions for AI learning |

**Triage history entry:**
```javascript
{
  text: "task text",
  decision: "done" | "kept" | "soon" | "letgo",  // "done" added v2.18.0
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
| `today_focus_session` | JSON object | `{taskId, rem, savedAt, paused}` — in-flight focus session; written every tick; cleared on complete/close; read by `_tryRestoreFocusSession()` on reload (v2.43.0) |
| `stat_focus_mins_yesterday_snapshot` | string | Transient: pre-midnight focus minutes saved by `completeFor()` when it detects a day boundary; consumed and removed by `applyNewDayCleanup()` (BUG-063) |
| `stat_focus_mins_date` | string | `_getAppDay()` string — date those minutes were earned; used as a guard on sync merge so yesterday's minutes are never restored as today's (BUG-024) |
| `stat_focus_mins_alltime` | string | Lifetime focus minutes |
| `morning_nudge_count` | string | Carried-over tasks from yesterday (set by `applyNewDayCleanup`) |
| `today_day_review` | JSON | Yesterday's day-end stats `{done, focusMins, habits, habitsTotal, streak, kept, soon, letgo, date}` — saved at triage, consumed by morning nudge, auto-cleared after noon |
| `day_nudge_ai_<date>` | string | Cached AI day nudge line (`_fetchDayNudgeAI`); one per day; read by the nudge strip and About's Today block. Stale keys are pruned on write; the current dated value lives until midnight. (v2.19.0 — unified from the separate `morning_nudge_ai_*` and `trello_nudge_ai_*` keys) |
| `day_nudge_dismissed_<date>` | string | Per-day dismiss flag for the unified day nudge — synced via `_DISMISS_SYNC` registry (v2.19.0). Legacy keys `morning_nudge_dismissed_*` and `trello_nudge_dismissed_*` remain as registry alias rows for pre-2.19.0 devices |

### History & Reports

| Key | Type | Description |
|---|---|---|
| `today_daily_history` | JSON array | Rolling 30-day snapshot `{date, tasksDone, tasksAdded, focusMins, habitsKept, habitsTotal, tasksAddedFixed?}` — one entry per day, written at midnight in `applyNewDayCleanup`. `tasksAddedFixed: true` is a one-time migration marker (v2.71.9) that marks an entry's `tasksAdded` as a per-day delta (not a cumulative total); migration runs in `renderMemoryPanel`, `_memoryAbstract`, and `_fetchWeekThemeAI`. `_sanitizeDailyTasksAdded()` treats values outside 0–30 as missing (`0`) before sync storage or completion-rate use, preventing cumulative migration artifacts from dominating Memory. Used by the About weekly grid and the Sunday evidence gate |
| `week_reflection_YYYY-MM-DD` | string | Cached AI-written Sunday line for one code-verified observation; absent when the evidence gate abstains |
| `week_policy_YYYY-MM-DD` | string | Sunday reflection policy/negative-cache marker (`earned-v1`). Current marker + no reflection text means “no qualifying insight”; Dropbox field `week_reflection_policy` prevents old-policy prose from being restored |
| `monday_intention_<date>` | string | Cached AI-generated Monday intention prompt for that date — `#sundayBlock` shows this on Mondays instead of the Sunday reflection; no rule-based fallback (v2.30.0) |
| `poem_splash_date` | string | YYYY-MM-DD — date the splash poem coda was last shown. Written at fade-in. Once-per-day gate — a second splash the same day skips the poem. Local only, not synced (v2.26.0) |
| `sunday_nudge_seen_<date>` | string | Per-date flag set when the About panel is opened on Sunday/Monday while the AI nudge block is visible; clears the pulse on `#infoBtn`. Extended to Monday nudge in v2.30.0 |

**Note:** Flow rate is calculated live using research-based diminishing returns formula: `100 × (1 - 0.8^done)`. First task = 20% (quick win), 5 tasks ≈ 67% (good day). Based on Endowed Progress Effect (Nunes & Dreze 2006) and Goal Gradient Hypothesis (Kivetz et al. 2006). Not stored.

**Note:** Habit strength uses asymmetric exponential smoothing over 90 days:
- `alpha_up = 0.90` — building is unchanged (7 days → ~52%, 14 days → ~77%)
- `alpha_down = 0.97` — misses are gentle (30-day streak miss: 3% drop, not 10%)
- Perfect streaks reach identical peaks. One bad day doesn't feel catastrophic.

### Memory (AI Companion)

| Key | Type | Description |
|---|---|---|
| `today_memory` | JSON | `appMemory` object — see schema below |

**`appMemory` schema:**
```javascript
{
  aiName: string,                    // AI companion name, picked once
  totalTasksCompleted: number,
  totalDaysActive: number,
  firstSeen: 'YYYY-MM-DD',
  patterns: {
    completionsByHour: {},           // { "9": 12, ... } — tasks completed per hour
    taskKeywords: {},                // { word: { completed: N } }
    focusMinutesTotal: number,       // lifetime focus minutes
    bestStreak: number,
    lateAdditions: number[],         // hours tasks were added reactively (rolling 50)
    taskLifespanSamples: number[],   // days from creation to done, rolling 20 (v2.43.4)
    dayStartCount: number|null,      // undone tasks at day start
    dayStartDate: 'YYYY-MM-DD'|null,
    dayShapeState: any,
    tasksAddedToday: number,         // tasks added today; resets to 0 at midnight (v2.71.9 — was a lifetime running total)
    inlineSuggestions: {             // AI task suggestion learning (v2.66.3, autoDismissed added v2.71.11)
      offered: number, applied: number, dismissed: number, autoDismissed: number
    },
  },
  preferences: {
    peakHour: number|null,           // hour with most completions
    dragKeywords: string[],
  },
  moments: [],                       // [{ type, value, date }] — milestones, big clears (last 20)
  suggestionCooldowns: {},           // { taskId: 'YYYY-MM-DD' } — 7-day cooldown
  suggestionHistory: [],             // [{ taskId, taskText, suggested, action }] (last 50)
  suggestionOutcomes: [{             // post-add inline outcome loop (last 100, v2.72.0)
    id, taskId, taskText, pattern,
    reason, reasonText, offeredAt, updatedAt,
    appliedAt?, dismissedAt?, ignoredAt?, helpedAt?, reversedAt?,
    resultTaskIds?, matchingTaskIdsAtApply?, reversalReason?
  }],
  recentConversations: [],           // [{ date, message }] (last 3)
  recentCompletedTasks: [],          // [{ text, date }] — rolling 30-day (last 50)
  meetingAttribution: { mineShown, mineKept, othersShown, othersSelected },
  // 12a — relational memory (v2.77.26 → v2.79.0)
  returningTasks: {},                // { taskId: { taskId, text, firstSeen, dayCount, focusSessions } } — on the list 5+ days; rebuilt on each _memoryForAI() call, trimmed on complete/delete/let-go
  obligationLanguageTally: { week, count, completed, tasks: [] },  // this week's obligation-framed tasks; resets Monday
  obligationHistory: [],             // [{ text, date, done }] — 90-day log of obligation-framed tasks; re-validated against the current detector on load. `date` is the ADD date, not an outcome date
  taskAgeBuckets: { d1to3, d4to6, d7to13, d14plus },
  spokenLines: [],                   // [{ surface, date, text, kind? }] — what TODAY said on its own initiative; 30 days, one per surface per day, cap 120 (v2.79.0; `kind` + cap 30→120 v2.80.0)
  // 12c — dated outcome log (v2.80.0), the observation pool's only input
  taskOutcomes: [],                  // [{ id, date, outcome: 'done'|'letgo'|'soon_pull'|'revive', obligation: true|false|null, focusSessions, reason?, backfilled?, key? }] — 90 days / 300 entries. No task text: id falls back to a djb2 hash of the text; `key` (v2.84.0) is that hash on every row, so done rows (keyed by live id) link to let-go/revive rows (keyed by hash); `_memoryStampOutcomeKeys()` (v2.84.1) back-fills it on older rows wherever the text is still resolvable, at the pool call sites rather than page load
  taskOutcomesBackfilled: boolean,   // one-time seed from recentCompletedTasks + dated letgo/revive day maps has run (v2.80.1)
  // clear watermark (BUG-096, v2.82.1) — makes "clear all memory" survive sync
  clearedAt: '',                     // ISO timestamp of the last full clear; max-wins across devices
  clearedHypothesisIds: [],          // ids of AI hypotheses cleared locally — they carry no date, so the merge tombstones them by id (cap 300)
}
```

**12a/12c slots are additive; backup schema unchanged.** `taskOutcomes` is written by `_memoryRecordOutcome()` from `_memoryOnTaskComplete`, `_memoryOnTaskLetgo`, `_memoryOnSoonPull` and `_memoryOnRevive`, one record per task per outcome per day. Unknowns stay unknown: backfilled rows carry `backfilled: true` (focus sessions unknown) and let-go/revive rows from the backfill carry `obligation: null` (framing unknown); consumers partition on `=== true` / `=== false`, never truthiness. `spokenLines` is written by `_memoryRecordSpokenLine(surface, text, kind?)` from the morning nudge, focus question, Sunday reflection, week theme and Monday intention — never the assistant chat, which is user-initiated dialogue rather than the app's unprompted voice.

**Clear watermark (BUG-096, v2.82.1).** `_memoryClearConfirm` wipes the 12a/12c slots and `recentConversations`, sets `clearedAt`, tombstones the cleared hypothesis ids, and pushes a backup. `_mergeAppMemory` adopts the max `clearedAt` across devices and drops rows dated before it in every dated-row union (`taskOutcomes`, `spokenLines`, `obligationHistory`, `moments`, `recentCompletedTasks`, `recentConversations`) on **both** sides, so a clear made on one device propagates rather than being undone. Rows carry a date-only field, so the compare is by day: a row from the clear's own day is accepted (documented edge, preferred over dropping fresh post-clear rows). `taskOutcomesBackfilled` stays true after a clear so the seed cannot resurrect what was just erased.

`suggestionOutcomes` is additive inside the existing `appMemory` payload, so backup schema 5.4 does not change. Task text and the model's visible reason line are stored because they are needed to explain the offer and detect an explicit recreation of the original; both were already inside TODAY's local/synced task-memory boundary. “Clear all memory” removes outcomes, legacy suggestion history, and suggestion cooldowns. Outcome records are capped at 100 newest offers.

---

## ID Conventions

| Type | Format | Example |
|---|---|---|
| Manual task | `manual_` + timestamp | `manual_1741234567890` |
| Habit | `habit_` + timestamp | `habit_1741234567890` |
| Trello task | Trello card ID | `5f3d...` |

---

## Backup Schema

**Version: 5.5** (authoritative schema in `architecture/Sync.md`)

### Post-Triage Reflection keys (v2.65.7)

| Key | Type | Notes |
|-----|------|-------|
| `today_reflection_policy` | JSON `{choice, updatedAt}` | `choice` is `"remember"` or `"not_for_me"`; LWW on sync |
| `today_reflections` | JSON array `[{date, feeling, updatedAt}]` | per-date LWW union on sync; pruned to 30 calendar days; `feeling` ∈ `{drained, tense, present, off, calm, alive}` |
| `today_reflections_cleared_at` | ISO string | deletion watermark; max-wins on sync; entries ≤ watermark are discarded |
| `today_reflection_intro_seen_at` | ISO string | **local-only** — 7-day cooldown before re-offering the intro; intentionally never backed up to Dropbox |

```javascript
{
  version: '5.4',
  manual: [...],
  habits: [...],
  habitCompletions: {...},
  habit_events: {...},         // v2.17.53 — LWW map for uncheck protection (BUG-026)
  done: [...],
  deleted: [...],              // {id, at} — 180d TTL, ≤2000 entries (BUG-054, v2.23.6)
  checked: [...],              // {id, at} — timestamped; drives _doneTodayCount (v2.18.21)
  unchecked: [...],
  deletedHabits: [...],
  trelloFocus: {...},
  today_trello_firstseen: {...},   // MIN-merge — earliest sighting wins (BUG-049)
  today_trello_lastactive: {...},  // MAX-merge — newest activity wins (BUG-064, v2.43.6)
  trello_order: [...],         // v5.2 — Trello card order
  memory: {...},               // v4.0; includes recentCompletedTasks rolling 30-day (v2.29.0)
  soon_tasks: [...],           // v5.0 — SOON zone
  past_tasks: [...],           // v5.0 — PAST zone
  triage_history: [...],       // v5.1 — AI triage learning
  daily_history: [...],        // v5.3 — per-day snapshots for week grid (BUG-036)
  user_names: [...],           // v2.31.0 — meeting attribution names, LWW via user_names_at
  user_names_at: 'ISO string', // v2.31.0 — timestamp for user_names LWW merge
  stat_focus_mins_date: '',    // v2.17.44 — date guard for focus minutes sync
  stat_streak_date: '',        // BUG-020 — prevents double-count on multi-device
  exportedAt: 'ISO string'
}
```

---

## Order Preservation

**Critical:** `manualTasks`, `habitsList`, and `trelloTasks` arrays preserve drag order. Never re-sort them programmatically.

Desktop and touch reorder are owned by `assets/drag.js`; both paths persist the same list-specific order contract before sync is allowed to run.

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
