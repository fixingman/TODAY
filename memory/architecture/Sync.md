# Sync & Backup

> Dropbox sync, merge rules, and the backup schema — the authoritative copy. Each rule keeps a one-line *why* and its bug number; the full history of how a rule came about lives in `Bugs.md` / `archive/Bugs-archive.md` and the changelogs, not here.

---

## Design Principles

1. **Local-first** — the app works offline and syncs when it can.
2. **Union merge** — additions from both devices survive.
3. **Explicit deletes** — tracked with timestamps, never inferred from absence.
4. **A synced key's merge rule is its meaning** — MIN (earliest wins), MAX (newest wins), union (any device's presence wins), LWW (last writer wins). A new kind of value that needs a different rule needs its own key (BUG-026 `habit_events`, BUG-064 Trello aging, BUG-058 Noticed — the same lesson three times).
5. **Deterministic** — no conflict prompts; the merge always produces one answer.
6. **`init()` runs before sync lands.** `init()` is synchronous; the Dropbox pull and `mergeRemoteData()` arrive later. Anything `init()` reads that the merge can reassign (`doneIds`, habits, `today_daily_history`…) is stale on a fresh device and needs a re-check **at every place that state can change**, not just cold start. There are four such places: the 7s `syncDropbox()` tick (`fromSync`), manual Restore (`dropboxRestore(!fromSync)`, a wholesale overwrite that does not call `mergeRemoteData()`), the `online` reconnect handler, and cold start. Trace each consumer's call graph — some self-correct through another path, some never do. Example: Trello's own re-fetch is gated on `dateLastActivity`, which a local completion never changes, so the 7s tick was the everyday trigger for BUG-060, while the `online` handler already self-corrected through its own `loadTrello()` (BUG-060, BUG-061; full trace in the BUG-060 entry).

---

**Focus feedback boundary (v2.101.0):** exact-answer Focus reactions/replies/Undo are active-session memory only. They never enter Dropbox payloads, merge, manual Restore or old-client replay. Existing sync changes to the owning task/habit invalidate their local influence; no schema or merge rule changes. Source-bound lifecycle and limits are in Focus.md / Data.md.

**Enrichment boundary (v2.99.0 local):** web/Trello `agent_enrichment_*` cards and optional exact-card withholding remain device-local. They are absent from backup/merge/restore; no schema bump, LWW map, clear watermark or old-client replay is introduced. True task deletion/text/source changes invalidate the card; unchanged Today/Soon/Past moves retain its hide; Undo/show context clears only that device’s hide. That exact-card hide is not cross-device feedback or cross-task learning; the explicit wording extension below is separate. Gmail keeps its separate existing mail cache/draft domain. Local v2.99.1 binds both existing Gmail caches to exact retained task text and sensitive local refresh-grant provenance, with current-owner/source/cache/visit fences for pending work. Normal sync edits/deletion invalidate them; source tokens/digests, email data and drafts remain excluded from backup. Zone cleanup waits until a complete move, preserving unchanged owners. No backup-schema change.

**15E wording extension (v2.103.0; Can authorized October 27):** explicit wording concerns may guide future web/Trello context across tasks on this device, within the same existing source-board/cache scope and unchanged aggregate caps. Optional per-entry wording metadata stays excluded from backup/merge/Restore; backup schema remains 5.5 and its size budget increases by zero. No synced map, event replay or remote clear watermark is introduced. Old clients ignore optional fields and may discard them on an actual cache replacement; they must never infer feedback from a legacy hidden state. Incoming task edits/deletion invalidate support before the next request and fence late guided responses. A cross-tab cache/feedback change updates controls and invalidates pending influence; local clear removes that source record and advances the transient request epoch. The existing appMemory.clearedAt watermark also invalidates/prunes older wording after incoming memory clear or stale local replay. No history survives in an independently saved derived profile. Gmail and other feedback stores remain separate.

## Dropbox Integration

### Files

All paths are relative to TODAY's Dropbox app access; `{env}` is empty on production (`today-here.netlify.app`) and `-<subdomain>` elsewhere (e.g. `-dev` on `dev--today-here.netlify.app`).

| What | Path |
|------|------|
| Backup snapshot (one JSON, overwritten) | `/today-backup{env}.json` |
| DreamBank dream files (one Markdown per dream, not part of the backup) | `/Dreams{env}/{day|undated}_{id}.md` — see `Data.md` → DreamBank keys |

### Sync Flow

```
1. On load: pull + merge right after init() (behind the splash, not gated on window.load)
2. On mutation: debounced save (dropboxAutoSave, 800ms default), retry with backoff
3. On tab return / PWA focus: immediate sync; wake-time errors silenced for 3s
4. Every 7s (INTERVAL_MS): metadata rev check; full pull only if the rev changed;
   skipped while _pendingBackup; dreambank.flush() rides the same tick
5. On 'online': pull + merge, then push local offline changes
6. On 'offline': stop the ticker
```

**Metadata timeouts and zone diagnostics (October 22).** A failed metadata poll, including HTTP 504, returns without reading its body, downloading, changing the revision baseline or editing tasks; the next active sync tick checks again. A browser resource error alone does not establish a failed upload. Zone anomaly warnings require different destinations as well as distinct operation timestamps newer than the last sync read. Same-zone timestamps reconcile quietly. Soon exclusion checks Past stamps from both devices, so a provably newer remote Past entry removes an older local Soon copy while a newer revive still wins. Existing local-tie and missing-timestamp rules remain.

**Cold-start ordering.** The pull starts after synchronous `init()` inside `setTimeout(0)`, without waiting for subresources. The sequence remains pull+merge → nudge/triage re-checks → `_onAppLoadDone()` → revision bookkeeping/optional merged push-back → ticker. The download response supplies its own revision; bookkeeping no longer makes another metadata request. Splash dismissal still depends on sync finishing.

**Revision acknowledgement (BUG-130, v2.98.6).** `lastDropboxRev` represents content actually applied or uploaded, not merely observed metadata. An active poll changes the baseline and `last_sync_read` only after download/parse/merge succeeds; failed content leaves that same revision retryable next tick. Backup seeds from its upload response JSON. Manual restore and cold start seed from their download response's `Dropbox-API-Result`; missing/malformed metadata leaves the baseline unknown. A successful polling download can fall back to the revision checked before downloading. Never sample metadata after a content operation to acknowledge it: another device can write in between, and that would skip unread content. Removing those extra round trips also avoids holding queued saves/startup bookkeeping on them. Existing 800ms debounce, seven-second active polling, hidden-device suspension and merge policies remain; slow requests, pending saves and backoff still affect elapsed delivery time.

**Save timing.** Every synced mutation must schedule a save — `_saveMemory()` and similar local writes do not upload on their own, so a change that skips `dropboxAutoSave()` waits for an unrelated mutation (votes did, BUG fixed v2.92.14). The default debounce suits most state: line votes, daily-nudge dismissal/recovery and dream-index changes use it. `dropboxAutoSave(0)` is reserved for triage completion, close and undo, where another device may check within seconds. Zone moves call `dropboxBackup(true)` directly (see Zone-Aware Sync).

**Daily nudge recovery (v2.93.23).** Strip dismissal and accepted recovery reuse the dated dismissal, AI-cache and spoken-line fields — no schema change. A synced *fallback* dismissal still allows missing-text recovery into About without reopening the strip; once an accepted line exists, a real AI dismissal is final. If sync supplies an accepted line while a local generation is pending, the late local reply cannot replace that line or its vote. Covered by two isolated browser stores in `nudge-test`.

### Wake Sequence — `window._onWake()`

Called from the sync module's `visibilitychange` handler, `window.focus` (PWA fallback — standalone windows may skip `visibilitychange`), and persisted `pageshow` (bfcache). Skipped until `_appReady`; debounced 200ms because `visibilitychange` and `focus` fire together on desktop restore. SW update check, timer wall-clock correction and PiP show/hide keep their own handlers (they need private state).

**Sequence:**
1. `_forceRepaint()` + `_wakeFocusCheck()` immediately, on the next rAF, the rAF after, and at 500 / 1500 / 3000 / 5000 / 8000 / 12000ms — PWA standalone defers painting after sleep, and Mac GPU compositor wake can take >5s (BUG-004/056/071). Each pass toggles `#main-app` display while preserving scroll; skipped while hidden or just after focus exit.
2. Looping animations are WAAPI, so they survive the display toggles; the only suppression left is the one-shot `.config-panel.open` slide-up (BUG-023), restored on the next user open. One-shot CSS animations that restart on toggle are a known hazard (BUG-109) — prefer WAAPI.
3. Single-play classes cleared once: `.task-slide-in`, `.removing`, `.just-checked`, `.milestone-pulse`, `.dot-ripple`, `#manualEmpty.fading-in`.
4. Stale `.focusing` cleared by `_clearStaleFocusing()` now, at 350ms and at 1000ms — skipped while `window._focusUIActive` (set in focus `openUI()`, cleared in `closeUI()`), because a sync-triggered `renderManual()` can destroy `.focused` moments before `_focusReanchor()` re-attaches it.
5. `checkDayNudge()`; once-a-day memory abstraction if not yet run.
6. Triage silent window: `setBarSilent(true)`, then after 3s re-read `triage_dismissed` and `checkTriageBar()` (BUG-001).
7. Retry `_pendingBackup` through `_scheduleBackup(1000)` (BUG-002).
8. `_applyOfflinePanel()` — connectivity may have changed while asleep.

The sync module's `visibilitychange` runs before `_onWake()`: `clearTimeout(wakeTimer)`, `checkNewDay()`, `lastDropboxRev = null` (Dropbox CDN can lag, so the rev may look unchanged — BUG-002) + `_refreshSyncCache()`, `_wakeSyncSilent = true` → `syncDropbox()` + `syncTrello()`, one `renderTrello()` to reconcile age buckets, then `startTicker()` via `wakeTimer` after 2s. The `window.focus` fallback does the same reset/silent sync before calling `_onWake()`.

### Error Handling

`_logSyncError()` routes problems to the red dot, with two filters: during the 3s wake window errors are suppressed entirely (the network may not be up yet), and network failures ("Failed to fetch", "NetworkError", "Load failed", "CORS") go to the console only. `unhandledrejection` applies the same network filter. The red dot is for real problems: expired tokens (401), API rejections (405/429), server errors, code bugs.

### Merge Ownership

`assets/dropbox.js` owns network, persistence and merge orchestration. Deterministic, DOM-free primitives live in `assets/sync-merge.js` (daily history, suggestion outcomes, dream index, dismissed dream images), loaded before Dropbox and tested by `scripts/sync-merge-unit-test.mjs`.

```javascript
// Arrays: union by ID, prefer the newer timestamp; deleted IDs excluded
merged = [...local, ...remote].reduce((acc, item) => {
  const existing = acc.find(i => i.id === item.id);
  if (!existing) return [...acc, item];
  return acc.map(i => i.id === item.id && item.at > i.at ? item : i);
}, []).filter(item => !deletedIds.includes(item.id));
```

---

## Backup Schema (v5.5)

```javascript
{
  version: '5.5',
  saved_at: 'ISO string',
  // Tasks
  manual_tasks: [{id, text, focusSessions?, lastActive?, zone?, zoneChangedAt?}, ...],
  manual_order_at: 'ISO',  // 5.4 — newer reorder stamp keeps local order; '' (old backup) → remote order wins
  done_ids: ['id1', ...],
  deleted_ids: [{id, at}, ...],
  checked_ids: [{id, at}, ...],
  unchecked_ids: [{id, at}, ...],
  // Zones (5.0)
  soon_tasks: [{id, text, zone: 'soon', zoneChangedAt}, ...],
  past_tasks: [{id, text, zone: 'past', status, zoneChangedAt}, ...],  // status: done | let_go | aged
  // Trello
  trello_config: {apiKey, boardId, todayList},  // apiToken is stripped before upload; the token stays device-local
  trello_order: ['trello_id1', ...],   // 5.2
  trello_order_at: 'ISO',              // newer wins (BUG-042)
  today_trello_focus: {trelloCardId: 1, ...},   // focus sessions today, union, daily reset
  today_trello_focus_date: 'YYYY-MM-DD',        // date guard
  today_trello_firstseen: {'trello_<id>': ms},  // MIN wins, persists across days (BUG-049)
  today_trello_lastactive: {'trello_<id>': ms}, // MAX wins, persists across days (BUG-064)
  // Habits
  habits: [{id, name, created_at, focusSessions?, archived?}, ...],
  habit_completions: {habitId: ['YYYY-MM-DD', ...]},
  habit_events: {'habitId::YYYY-MM-DD': {type: 'check'|'uncheck', at: ISO}},  // LWW (BUG-026); purged after 30 days
  deleted_habit_ids: ['id1', ...],
  // Stats
  stat_focus_mins_today: '0',
  stat_focus_mins_date: 'YYYY-MM-DD',  // date guard — yesterday's total never restores (BUG-024)
  stat_streak: '1',
  stat_streak_date: 'YYYY-MM-DD',      // prevents double-increment across devices (BUG-020)
  // Memory — appMemory; Noticed bookkeeping travels inside but only noticedDates is merged
  memory: {...},
  // Triage (5.1)
  triage_history: [{id, decision, at}, ...],
  triage_dismissed: 'YYYY-MM-DD',
  per_day_dismiss_date: 'YYYY-MM-DD',  // source-local date for the per-day dismissal flags
  // Daily history (5.3, BUG-036)
  daily_history: [{date, tasksDone, tasksAdded, focusMins, habitsKept, habitsTotal, tasksAddedFixed?}],
  // Reflections (5.5) — the intro cooldown stays local-only
  reflection_policy: {choice: 'remember'|'not_for_me', updatedAt},
  reflections: [{date, feeling, updatedAt}],
  reflections_cleared_at: 'ISO',
  reflection_feedback: {version: 1, consentAt, records: []}, // separate sensitive store, never appMemory
  reflection_feedback_cleared_at: 'ISO',
  // Also carried (additive, no schema bump): today_trello_focus_total (MAX), day_review
  // (fill-if-empty), user_names / user_names_at (meeting attribution, LWW) plus the legacy
  // user_name compat field, the per-day dismissal flags, synced AI surface texts,
  // week_reflection_policy.
}
```

Additive keys do not bump the version; `Rules.md` #12 records which keys arrived in which schema. The done-today count is **not** stored — it derives from `checked_ids` (see Stats).

---

## Conflict Resolution

| Data | Rule |
|------|------|
| Task list | Union by ID; remote order wins unless a strictly newer `manual_order_at` keeps the local order (all eligible local tasks, including unsynced additions, retain their positions; remote-only additions append — BUG-133). When remote order wins, local-only tasks append and the device adopts the remote stamp so the next merge doesn't re-win off a stale local one (mirrors Trello, BUG-042). Per field remote wins, except `focusSessions` and `lastActive`: MAX across all Today/Soon/Past copies, independent of the winning zone record (BUG-124). Progress differences refresh the badge and trigger merged autosave to heal stale remote copies. Ties → remote |
| Task order change | Detected by comparing the ID sequence, not just set membership, so a reorder alone re-renders |
| Habit list | Union by ID, remote order wins |
| Trello order | Newer `trello_order_at` wins; bootstrap if local is empty (BUG-042) |
| Trello focus map | Union by card (max), date-guarded |
| Trello first-seen | Union by card, **MIN** wins, no date guard (BUG-049) |
| Trello last-active | Union by card, **MAX** wins, no date guard (BUG-064) |
| Trello focus total | `today_trello_focus_total` — lifetime sessions per card; union by card, MAX wins, no date guard (the daily map handles activity) |
| Day review | `day_review` fill-if-empty — local is the current-session record |
| Trello config | Fill-if-empty: `remote.trello_config` applies when local is absent, so Connections entered on one device reaches the other |
| Done IDs | True LWW per id: `Math.max(checkedAt, uncheckedAt)` across both maps decides the winning op (`mergedDoneIds`). The checked/unchecked maps themselves are persisted as a plain union, so a stale check can outlive an uncheck there — readers must apply the same most-recent-wins rule |
| Deleted IDs | Union, excluded from every task list and zone; see Deletion Persistence |
| SOON / PAST | Union by ID, newer `zoneChangedAt` wins (see Zone-Aware Sync). PAST purges by age only — done >7 days, let_go/aged >30 days, no count cap |
| Reflections | Policy LWW by `updatedAt` (ties → remote); entries per-date LWW; entries ≤ `reflections_cleared_at` dropped; 30-calendar-day window; watermark max-wins |
| `daily_history` | `_mergeDailyHistory` (primitive in `sync-merge.js`): by date, per-field `Math.max`; `tasksAddedFixed` propagates; every local, remote-only and duplicate-date `tasksAdded` goes through `_sanitizeDailyTasksAdded()` first (outside 0–30 → 0) so a cumulative migration artifact cannot be restored or spread |
| Stats | See Stats below |
| Triage dismissed | If remote = today, apply locally (see Triage) |
| Per-day dismissal flags (`_DISMISS_SYNC`: `day_nudge_dismissed`, legacy aliases, `sunday_nudge_seen`) | Adopted only when `per_day_dismiss_date` equals the receiving device's local day; stale or undated snapshots ignored; local same-day flags never cleared by stale data (BUG-103). Legacy `trello_nudge_dismissed` / `morning_nudge_dismissed` map to the unified day-nudge key |
| Memory | `_mergeAppMemory()` — see Memory Merge |

### Deletion Persistence

**`deleted_ids` must persist across days — never clear it in new-day cleanup** (clearing it let sync resurrect yesterday's deletions). Each entry is `{id, at}`. `_cleanupDeletedIds()` drops entries older than **180 days** and entries whose ID is back in a zone, and as a backstop keeps only the newest 2000; the TTL is long so a device that was offline for months still syncs before the tombstone expires (a 30-day TTL let stale devices resurrect deleted tasks — BUG-054). AI `delete_task` goes through `_addDeletedId()` like any delete. PAST-purge tombstones follow the same rule so a purged task cannot return via sync within the window (BUG-054).

### Stats

- **Focus minutes** — `stat_focus_mins_date` is written whenever minutes are earned or reset; the backup uses that stored date (never `_getAppDay()` — BUG-024) with `''` as fallback, which fails the guard. Merge: `remoteFocusDate === _getAppDay() ? remoteFocusMins : 0`, then max.
- **Streak** — `stat_streak_date` is set to `_localISO()` on increment. Merge: `remoteStreakDate >= localStreakDate ? Math.max(local, remote) : local`, so a device that already rolled to today is not re-inflated by a stale remote. `applyNewDayCleanup()` skips only the *increment* when `streakDate === today`; it must not return early, because focus reset and the rest of cleanup still run (BUG-024).
- **Done-today count — derived, not stored.** `_doneTodayCount(dayISO?)` counts `checked_ids` on that local day whose check is the winning op (no later `unchecked_ids` entry) — the same rule as `mergedDoneIds`. The retired `stat_tasks_done_today` counter only ever increased and merged by max, so re-checks and two devices inflated it without bound (BUG-045's date guard could not fix that). No backup field, merge or restore branch, or daily reset: the day boundary comes from the date filter plus the `checked_ids` clear in `applyNewDayCleanup()`. Readers: the evening triage summary, the `applyNewDayCleanup()` daily-history snapshot (passes `yesterdayISO`), `_getWeeklyStats`. Gotcha: the unchecked map is built as `.map(u => [u.id, u.at])`, so its value *is* the timestamp string — compare `c.at > uAt`, not `c.at > u.at`.

### Noticed: one blob, two rules

`appMemory.noticed` ("has THIS device shown this line") travels in the backup but is **never read back** — device-local (reverting BUG-058's earlier sync). `appMemory.noticedDates` ("when did this occurrence first fire anywhere", keyed per value, e.g. `'peak:14'`, `'habit:<id>:30'`, so a later occurrence gets a fresh key) **is merged**, earliest date wins; `_noticedEligible()` / `_noticedStamp()` in `assets/insights.js` check it before a signal fires locally. It carries only dates, never text, so it cannot recreate BUG-058 (devices showing different content for one pattern): a signal shows on every device that opens About on the day it first fired anywhere, then goes quiet.

### Trello aging: two maps

Age basis is `lastactive || firstseen || now`, mirroring manual `lastActive || created`. `firstseen` is MIN because a card is as old as its first sighting; `lastactive` is MAX because activity should un-age it. Pushing `firstseen` forward on focus looks right locally and is silently reverted by the next MIN merge — that is why activity has its own key (BUG-064).

---

## Triage

**Do not check triage immediately on tab return** — sync needs to pull another device's dismissal first. `mergeRemoteData()` applies `triage_dismissed` and hides the bar/overlay; `_onWake()` holds a 3s silent window, then re-reads the stored dismissal (never a stale variable) and re-checks. `_triageBarSilent` stops the 7s ticker from flashing the bar during that window (BUG-001).

- **Completion is the sync event.** `triageApplyAll()` queues `dropboxAutoSave(0)` after persisting, including an all-Keep pass; close and undo use the same retry-aware path. Triage **Done** marks via the normal check path (`doneIds` + `_addCheckedId`), so it merges like any check.
- **New-day cleanup backup** is delayed 3s on wake; uploading immediately raced `syncDropbox()`'s metadata fetch and could leave a device on its own stale write. `zoneChangedAt` protects the done→PAST move independently.
- **First open of the day** pulls and merges before `applyNewDayCleanup()`, so cleanup removes `triage_dismissed` only when its stored day is not today — otherwise the push-back would erase another device's same-day dismissal.
- **Self-healing same-day merge.** Remote `triage_dismissed === today` applies locally (`mergeRemoteData()` sets `triageDismissedToday`); a local one for today against a blank or older remote also counts as a change, so `dropboxRestore(true)` schedules the merged snapshot back. Needed because Dropbox holds one overwritten snapshot that a stale device can briefly blank.

### Triage bar state flags

All three default `false` and live in module scope.

| Flag | Set by | Cleared by | Purpose |
|---|---|---|---|
| `_triageActive` | `triageExpand()` | `triageClose()`, `triageMinimize()` | Bar hidden while the overlay is open (BUG-007) |
| `_triageBarSilent` | wake (`visibilitychange` / `focus`) | 3s timer | No bar before sync settles (BUG-001) |
| `_triageBarShown` | first show in `checkTriageBar()` | `applyNewDayCleanup()`, all tasks gone, midnight | Once shown, deletes/zone moves don't hide it mid-evening |

`checkTriageBar()` priority: `_triageActive` → hide and refresh the overlay list; `_triageBarSilent` → hide (no list refresh); otherwise `inTriageWindow && totalUndone > 0 && !triageDismissedToday`; `_triageBarShown` keeps it up when nothing changed.

---

## Zone-Aware Sync

A task in SOON/PAST must not reappear in TODAY, and a task pulled back must not be swallowed by a zone. `zoneChangedAt` decides:

- **Moved to SOON on A, B still has it in TODAY:** remote zone stamp newer → it leaves B's `manualTasks`; local task stamp newer → it was pulled back, stays.
- **Pulled back on B, A still has it in SOON:** local zone stamp newer → stays in the zone; remote task stamp newer → moves to `manualTasks`.
- **Deleted tasks** are skipped in both SOON and PAST merges via `mergedDeletedMap` (no ghost tasks).
- **Revive from PAST → SOON** (`reviveFromPast(id)`, aged/let_go only, never done): keeps the ID, clears `status`, fresh `zoneChangedAt`, increments `revived`, immediate backup. The SOON merge admits a remote entry that also sits in local PAST only if its `zoneChangedAt` is **strictly newer** (`_stillPast`); the PAST cleanup then drops the local copy. A stale remote SOON entry stays blocked.

**Zone operations back up immediately** with `dropboxBackup(true)`, not the debounced save: `pullFromSoon()`, `moveToSoon()`, `moveToPast()`, `reviveFromPast()`. (Triage uses `dropboxAutoSave(0)` — see Triage.)

---

## Timestamps & Tracked Events

Sync ordering uses full ISO strings (`toISOString()`, UTC). Date-only values (habits, memory, stat guards) use `_localISO()`. Never mix them.

| Event | Key |
|-------|-----|
| Task deleted / checked / unchecked | `today_deleted_ids` / `today_checked_ids` / `today_unchecked_ids` |
| Habit deleted | `today_deleted_habit_ids` |
| Local mutation | `last_local_change` |
| Successful backup (write) / sync (read) | `last_successful_backup` / `last_sync_read` — the Connections status shows the newer of the two |

Every reorder (desktop drop, touch long-press via `_saveOrder`, Trello and manual alike) writes its order key, its stamp (`today_manual_order_at` → payload `manual_order_at`; `today_trello_order_at` → `trello_order_at`), `last_local_change`, and schedules the autosave — otherwise an in-flight initial or reconnect pull, which does not check `_pendingBackup`, snaps the drag back.

---

## Memory Merge — `_mergeAppMemory(remote)`

Called from `mergeRemoteData(data)` → `_mergeAppMemory(data.memory)` on every tick and from manual Restore (`dropboxRestore(!fromSync)`), so the two paths cannot drift.

**Clear watermark first:** `appMemory.clearedAt` is max-wins; every dated union below drops rows from before it on both sides, so "clear all memory" on one device clears the other (BUG-096). `_mergeAppMemory`'s filter compares **by day** — every row's date is sliced to YYYY-MM-DD, even full timestamps such as `kindVerdicts.updated` — so same-day pre-clear rows survive (a documented edge). Only the DreamBank merges (`dreams.index`, `dreams.dismissed`) compare full timestamps.

| Field | Rule |
|-------|------|
| `patterns` | Counted objects union by key, numeric max (triageUndos, soonPulls, letgoReasons, reviveReasons, …). Exceptions: `lateAdditions` union by `date:h` (legacy plain numbers normalized), sorted by date, newest 50; `taskLifespanSamples` concatenated local then remote, last 20 kept (no dedupe) |
| `semantic` / `episodic` / `procedural` | Union by `id`; cleared hypothesis ids are tombstoned |
| `moments` | Union deduped by `type + date`, last 20 kept |
| `patterns.taskKeywords` | Per word, per-day MAX in `days{}`; legacy entries without `days` become a `_legacy` floor |
| `patterns.completionHourDays` | Per day, per hour MAX; pre-clear days drop on both sides; `peakHour` re-derived by `_memoryDerivePeakHour()` after the merge (v2.95.7) |
| Lifetime counters | Max |
| `recentConversations` | Union by date + message prefix, newest 5 |
| `recentCompletedTasks` | Union by text + date, 30-day window |
| `aiName` | Remote wins when present |
| `suggestionOutcomes` | Union by offer `id`; event stamps and result ids union so a stale device cannot erase later evidence; newest metadata wins; completion evidence wins a conflict; newest 100 kept |
| `obligationHistory` | Union by `date|text[0:40]`, `done` OR'd, 90 days |
| `spokenLines` | Union by `date|surface` (one per surface per day), newest 120 — large enough that a kind leaves cooldown by time, not eviction; on collision the newer `reactedAt` wins, including a cleared vote |
| `kindVerdicts` | Per kind, newer `updated` wins |
| `taskOutcomes` | Union by `id|outcome|date`, 90 days, newest 300 — accumulated events cannot self-heal, so a missing merge would split the log per device |
| `dreams.index` | Union by `id`, later `updatedAt` wins; a delete is a tombstone row; clear watermark compared on full `recordedAt`, not the dream's day, so an old dream told after a clear survives (`sync-merge.mergeDreamIndex`) |
| `dreams.dismissed` | Per image key, later timestamp wins; pre-clear entries drop (`mergeDreamDismissed`). Passive since v2.95.5 (hide retired) — kept so older devices merge cleanly. The recurring-image list is never stored — each device derives it from the merged index |
| `noticed` / `noticedDates` | See Noticed above |

Dream files are not in the backup; `dreambank.flush()` uploads each from the sync tick, and Memory reads one on demand without persisting it.

---

## Reflection Merge

`_reflectionMergeRemote(data)` runs from both `mergeRemoteData()` and Restore: (1) clear watermark MAX; (2) policy LWW by `updatedAt`, remote on ties; (3) responses union by date, newer `updatedAt` wins, entries ≤ watermark dropped; (4) thirty-calendar-day pruning. Outcome-only changes invalidate stale wording; consent/watermark changes fence pending replies. Active requests remain transient. After explained feedback consent, displayed derived readings use the separate fields below; unchanged valid wording can be reused without a request. Main-memory outcomes merge before reflection feedback is validated. Local v2.100.0 additionally makes source readiness explicit in feedback merges: incomplete versions cannot erase a reading/vote, while generation/consent, clear, LWW reactions and bounds remain enforced. Natural expiry strips prose/support immediately; the ready event reconciles recent edits/withdrawal. This applies to lazy imports, actual periodic merges and manual Restore without a persisted queue or schema change.

First Dropbox connection after local reflections exist uploads the full array and policy; other devices union them on their next sync. Memory's global clear calls `_reflectionClearFromAllMemory()`: stamp the watermark, remove local data, set policy to `not_for_me`, immediate silent backup.

**Feedback loop (v2.98.0):** the two feedback fields are additive under v5.5's existing extensibility rule. Missing old-client fields do not erase local feedback. The lazy `feedback-policy` merges reading ids with immutable support/wording identity, first-display MIN, latest `reactedAt` including null; equal-time null wins, then lexical reaction. Clear watermarks apply before merge; records must match the current source/consent generation. Feedback consent cannot predate the current reflection policy/deletion generation. Canonical text uses latest explicit reaction, otherwise earliest display, then id. Source edits/withdrawal invalidate readings; natural expiry removes wording/source values while retaining only bounded user withholding. Clear-all propagates through both stores. Post-import reconciliation fences pending writers and can reuse a valid synced sentence without a request. No feeling text/vote enters `appMemory` or another surface's prompt.

**Approved wording extension (Can, October 27; local v2.100.0):** optional `wordingReaction` (`unclear`/`formal`/null) and `wordingAt` are additive per-reading fields inside the existing v1 feedback payload. Merge them independently of the whole-insight reaction: newer wording timestamp wins; equal-time null wins, then deterministic lexical choice. Missing fields from an older client mean no wording event, never a clear. A newer ordinary vote cannot erase a locally known wording clear; old-client round trips preserve the known event when merged back. An old client alone may drop optional wording fields; rollback therefore disables adaptation, not invents a signal. Existing reading generation and feedback clear watermark prevent stale-backup resurrection; expiry/withdrawal strips wording influence, including during unready merges. The latest active explicit concern across retained readings controls one bounded next-writer instruction. Per-reading null removes that concern; a separate still-active concern may then apply. Clearing all feeling feedback removes every concern. Existing record/byte/retention limits cover the fields; no schema bump or extra store.

---

## Offline Behavior

The app is fully functional offline; mutations persist to localStorage and `last_local_change`; on reconnect the `online` handler pulls, merges, and pushes; the service worker serves the app shell.

**Gmail next-result feedback (v2.104.0 dev):** optional per-cache context rejection and exact-draft concern stay local to the existing mail cache/grant. No email, draft, digest, rejected-thread list, derived profile or feedback field enters Dropbox backup/merge/Restore; backup schema remains 5.5 and added backup bytes are zero. Incoming task edits/deletion/source changes remove support. Existing appMemory.clearedAt excludes older independent context/wording sub-events and fences pending work; explicit full Memory clear removes both, while AI Forget removes wording. Cross-tab cache/feedback changes reconcile the same current card and invalidate pending support; no synced LWW map or remote feedback replay exists. Retention/caps and rollback are in Data.md / docs/gmail-feedback-plan.md.
