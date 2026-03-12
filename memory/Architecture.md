# TODAY — Architecture & Product Logic
> Single source of truth for how the app works internally.  
> Every product logic change must be reflected here before or alongside the code change.

---

## 1. App Model

TODAY is a **single-file, client-side web app** (`index.html`). No build step. No framework. Deployed to Netlify.

### Data model
All state lives in `localStorage`. There is no server-side database.

| Key | Type | Description |
|---|---|---|
| `today_manual` | JSON array | Manual tasks added by the user |
| `today_done` | JSON array | IDs of completed tasks (both manual and Trello) |
| `today_deleted_ids` | JSON array | `{id, at}` — explicit deletes with timestamps, for union merge |
| `today_checked_ids` | JSON array | `{id, at}` — explicit checks with timestamps |
| `today_unchecked_ids` | JSON array | `{id, at}` — explicit unchecks with timestamps |
| `today_trello_cache` | JSON | Cached Trello cards from last fetch |
| `today_trello_focus` | JSON object | `{cardId: sessionCount}` — Pomodoro counts for Trello tasks. Reset on new day. |
| `today_habits` | JSON array | `{id, name, created_at}` — habit definitions |
| `today_habit_completions` | JSON object | `{habitId: ['YYYY-MM-DD', ...]}` — append-only completion history |
| `today_deleted_habit_ids` | JSON array | IDs of deleted habits — for union merge across devices |
| `trello_config` | JSON | Trello API key, token, board ID, list ID |
| `trello_token` | string | Trello OAuth token |
| `dropbox_token` | string | Dropbox access token |
| `dropbox_refresh_token` | string | Dropbox refresh token (PKCE) |
| `dropbox_token_expiry` | string | Epoch ms — when access token expires |
| `dropbox_token_expired` | string | Flag set when 401 detected |
| `last_local_change` | ISO string | Timestamp of last local mutation |
| `last_successful_backup` | ISO string | Timestamp of last successful Dropbox write |
| `stat_alltime_done` | string | Lifetime completed task count |
| `stat_streak` | string | Current daily streak |
| `stat_last_visit` | string | Last date the app was opened (local device only — never synced) |

### Task ID conventions
- Manual tasks: `manual_` + `Date.now()` — e.g. `manual_1741234567890`
- Trello tasks: Trello card ID — e.g. `5f3d...`
- Habits: `habit_` + `Date.now()` — e.g. `habit_1741234567890`

---

## 2. Habits

### Data model
Habits are stored separately from tasks. They persist across days — only their completion state changes day to day.

```
today_habits            = [{ id, name, created_at }]
today_habit_completions = { habitId: ['YYYY-MM-DD', ...] }
today_deleted_habit_ids = ['id1', 'id2', ...]
```

- `habitsList` and `habitCompletions` are loaded into memory at startup.
- Completions are **append-only ISO date strings** — never deleted. This is what makes the 21-day history strip possible without extra storage.
- Streak is computed on-the-fly via `_getStreak(id)` — never stored.
- `_habitTodayISO()` returns `new Date().toISOString().slice(0,10)` — always fresh, never cached.

### 21-day strip
`_getHabitDates()` returns the last 21 ISO dates. Dot opacity fades linearly: `i >= 14` → 1.0 (last 7 days fully opaque); `i < 14` → `0.12 + (i/14) * 0.70`.

### Edit mode
Edit mode is toggled globally. It patches the DOM surgically — swapping the name `<div>` ↔ `<input>` and streak `<div>` ↔ delete `<button>` in place, without rebuilding any rows. No `renderHabits()` call on mode toggle — no flash, no layout shift.

### Sync
Habits are included in the Dropbox backup (schema v4.0). Merge strategy:
- **Habit definitions:** union merge — habits added on either device both survive. Deletions tracked in `deleted_habit_ids`.
- **Completions:** union merge per habit ID — dates from both devices are combined. Completions are never deleted during merge.

---

## 3. Multi-Device Sync — Design Principles

### The core problem
TODAY has no server-side database. Dropbox holds a **single JSON file** shared between all devices. When two devices edit concurrently or one device edits offline, a naive last-write-wins strategy will silently discard changes.

### Devices and edit types
Both mobile and desktop are first-class devices. Either can at any time:
- Add or delete a manual task
- Check or uncheck a task (manual or Trello)
- Add, delete, or complete a habit
- Be offline while editing, then reconnect

### Merge strategy — by operation type

#### Manual task list (adds and deletes)
**Union merge with explicit delete tracking:**
- All devices union their `manual_tasks` lists — tasks added on any device survive
- Deletions tracked in `deleted_ids` as `{id, at}`. A task is removed if its ID appears in `deleted_ids`
- Delete wins over presence — if device A deletes while device B is offline, task is removed when B syncs

#### Done state (check / uncheck)
- Both tracked explicitly with timestamps in `checked_ids` / `unchecked_ids`
- Most recent timestamp wins per task ID

#### Trello done state
- Same as manual done state — synced via `done_ids`
- Trello task list is always authoritative from Trello's API — never merged locally

#### Habits
- Definitions: union merge with `deleted_habit_ids` tracking
- Completions: union per habit — append-only, never removed during merge

### Conflict resolution rules

| Scenario | Resolution |
|---|---|
| Both devices add different tasks offline | Union — both appear |
| Device A deletes a task, Device B still has it | Delete wins |
| Device A checks a task, Device B unchecks it | Most recent timestamp wins |
| Both devices add different habits offline | Union — both appear |
| Device A deletes a habit, Device B completed it | Delete wins |
| Both devices complete the same habit on the same day | Union — one date entry (deduped by Set) |

---

## 4. Sync Flow — Current Implementation

### Startup sequence
```
1. init() runs immediately — renders from localStorage (fast, synchronous)
2. Splash animation plays in parallel
3. load event fires:
   a. Seed Trello lastTrelloDate baseline
   b. Check last_local_change vs last_successful_backup:
      YES (unsynced) → pull remote → mergeRemoteData() → dropboxBackup() → renderManual()
      NO             → dropboxRestore(fromSync=true)
   c. applyNewDayCleanup() — always runs AFTER Dropbox restore
   d. renderManual(), updateStats()
   e. startTicker()
   f. signal _onAppLoadDone()
4. Splash dismisses only when BOTH animation AND load are complete (two-flag gate)
```

The two-flag gate (`_splashAnimDone` + `_appLoadDone`) ensures the app is never frozen or unresponsive when it becomes visible — all heavy async work completes behind the splash.

### Live ticker (every 7s)
```
syncAll() →
  checkNewDay()     // computes date fresh every tick — catches midnight without reload
  syncTrello()      // cheap board activity check, full fetch only if changed
  syncDropbox()     // cheap rev check, restore only if file changed
```

### Reconnect (online event)
```
1. last_local_change > last_successful_backup?
   YES → pull remote → mergeRemoteData() → dropboxBackup() → renderManual()
   NO  → skip
2. updateStats()
3. Reload Trello if configured
4. Resume ticker after 2s delay
```

### dropboxRestore — two modes

| Mode | Trigger | Merge behaviour | UI messages |
|---|---|---|---|
| `fromSync=true` | Ticker, startup, online event | Union merge via `mergeRemoteData()` → pushes merged state back | Silent |
| `fromSync=false` | Manual Restore button | Full overwrite — tasks, done, habits, config, stats | Shows progress |

### mergeRemoteData — render guarantee
`mergeRemoteData()` calls `renderManual()` internally when the task list changes. All call sites also call `renderManual()` unconditionally afterward — the DOM is always current after any merge path.

### Rev baseline (`lastDropboxRev`)
In-memory only. Set on startup. Updated by `_dbxSetRev()` after every backup. Prevents re-restoring our own writes.

---

## 5. New Day Logic

### Trigger
`checkNewDay()` runs on every ticker tick (every 7s). It computes `new Date().toDateString()` fresh each tick — **never uses a cached value**. This ensures midnight is caught automatically within 7 seconds even if the app was left open overnight without a reload.

### Cleanup sequence
```
1. Compute today = new Date().toDateString()
2. Guard: if stat_last_visit === today → return (already cleaned)
3. Update streak counter (streak + 1 if last visit was yesterday, else reset to 1)
4. Remove manual tasks that were marked done
5. Clear manual done IDs (Trello done IDs preserved across days)
6. Clear stale caches: today_trello_cache, today_trello_focus,
   today_deleted_ids, today_unchecked_ids, today_checked_ids
7. renderHabits() — new day dot appears, yesterday's checks show as history
8. Set stat_last_visit = today
9. Push clean state to Dropbox
```

### Habits on new day
Habit completions are **not deleted** on new day — they are the history. `renderHabits()` recomputes today's ISO date, so all checkboxes render unchecked and the new day's dot appears in the strip automatically.

### stat_last_visit
Local device state only. **Never backed up, never restored from Dropbox.** Restoring it would cause `applyNewDayCleanup()` to skip cleanup on a device that hadn't been opened since yesterday.

---

## 6. Backup File Schema (v4.0)

```json
{
  "version": "4.0",
  "saved_at": "ISO timestamp",
  "manual_tasks": [...],
  "done_ids": [...],
  "deleted_ids": [{ "id": "...", "at": "ISO" }],
  "checked_ids": [{ "id": "...", "at": "ISO" }],
  "unchecked_ids": [{ "id": "...", "at": "ISO" }],
  "habits": [{ "id": "...", "name": "...", "created_at": "YYYY-MM-DD" }],
  "habit_completions": { "habitId": ["YYYY-MM-DD"] },
  "deleted_habit_ids": ["id1"],
  "trello_config": {},
  "stat_alltime_done": "42",
  "stat_streak": "5"
}
```

**Not included:** `stat_last_visit`, `today_trello_cache`, `today_trello_focus`, `dropbox_token`, `trello_token`.

**Version history:**
| Version | Change |
|---|---|
| `2.0` | Tasks + done IDs |
| `3.0` | Union merge: `deleted_ids`, `checked_ids`, `unchecked_ids` |
| `4.0` | Habits: `habits`, `habit_completions`, `deleted_habit_ids` |

---

## 7. Trello Integration

- **Read-only.** Scope: `read`.
- OAuth redirect flow (not PKCE).
- Pulls cards from a selected board + list. Cards due today are also included.
- Cached in `today_trello_cache` — cleared on new day.
- Sync: board `dateLastActivity` checked every 7s — full card fetch only if changed.
- No manual refresh button — the ticker handles it automatically within 7s.
- Card links styled with `--color-highlight` (#579dff).

---

## 8. Offline Behaviour

- **Service worker** (`sw.js`): network-first, cache version `today-v{version}`
- **Pre-cached at install:** `/` + all 6 font files
- **BYPASS_ORIGINS:** Trello API, Dropbox API, Google APIs — always network
- All sync functions guard with `if (!navigator.onLine) return`
- Ticker stops on `visibilitychange hidden`, resumes 2s after visible
- Offline mutations tracked via `last_local_change` — pushed on next online/startup

---

## 9. Netlify Functions

| Function | Purpose |
|---|---|
| `dropbox-token.js` | Exchanges PKCE auth code for access + refresh tokens |
| `dropbox-refresh.js` | Refreshes expired access token using refresh token |

**Environment variables:** `DROPBOX_APP_KEY`, `DROPBOX_CLIENT_SECRET`

---

## 10. Key Product Rules

1. **Never overwrite unsynced local changes** — always check `last_local_change` vs `last_successful_backup`.
2. **The ticker is cheap** — metadata/rev checks only; full fetches only when something changed.
3. **Background tabs are silent** — ticker stops on hide, resumes on show.
4. **New day detection must use a fresh date** — never cache `new Date()` at module load. The app may stay open past midnight.
5. **New day cleanup runs after Dropbox restore** — ensures the freshest data is cleaned, not overwritten by a subsequent pull.
6. **Completed tasks do not carry over** — removed on new day cleanup.
7. **Habit completions are append-only** — never deleted. The history is what makes the strip work.
8. **`stat_last_visit` is local device state** — never backed up, never restored.
9. **Trello is read-only** — the app never writes to Trello.
10. **Backup file schema changes require a version bump** — current version is `4.0`.
11. **`@font-face` declarations must use raw font name strings** — CSS variables are not resolved inside `@font-face`.
12. **CSS animations must not be on base element rules** — animation fill values override everything including `!important`. Apply via a class removed on `animationend`.
13. **Done state visuals are applied via inline style in `toggleDone()`** — not CSS class alone. Avoids mobile Safari paint deferral on opacity transitions.
14. **`init()` runs before the splash IIFE** — local data renders immediately. The splash is cosmetic, not a loading gate.
15. **Sync logic must be provider-agnostic** — prepared for Google Drive / iCloud as future alternatives.
16. **TODAY is focus-first, not organiser-first** — one day, one list. Labels, priorities, and projects are out of scope.

---

## 11. File Structure

```
/
├── index.html
├── sw.js
├── netlify.toml
├── README.md
├── netlify/functions/
│   ├── dropbox-token.js
│   └── dropbox-refresh.js
├── fonts/
│   ├── syne/
│   └── DM Mono/
└── memory/
    ├── Design.md
    ├── Architecture.md
    ├── Research.md
    ├── Performance-audit.md
    └── Changelog.md
```

---

## 12. Release Checklist

### When to bump
- **Every logical unit of work gets its own bump** — a bug fix, a layout fix, a behaviour change, a new feature. Each is a version.
- **Never batch unrelated fixes into one bump** just because they happened in the same session.
- **Never end a work block without asking:** has everything since the last bump been versioned? If not, bump before moving on.
- "It's just CSS" or "it's a small fix" are not reasons to skip a bump. If it changes what the user sees or experiences, it gets a version.

### What to update on every bump
- [ ] `APP_VERSION` constant in `index.html`
- [ ] `DEV_HOURS` constant in `index.html`
- [ ] `CHANGELOG` object in `index.html` — one entry, `|` separated, no implementation detail
- [ ] `CACHE_VERSION` in `sw.js` — must match `APP_VERSION` exactly
- [ ] `Changelog.md` — one table row, terse
- [ ] `Architecture.md` — if sync, data model, or product logic changed
- [ ] `Design.md` — if animation, audio, interaction, or token rules changed

---

## 13. Housekeeping Rules

After every bug fix or function rework:

1. **Check for empty rules** — if a CSS rule block has no declarations (only comments or nothing), delete it. Empty rules are noise and can mask future bugs.
2. **Check for dead functions** — if a fix extracted logic into a helper, or replaced a function's role, check whether the old function is still called anywhere. If not, delete it.
3. **Check for orphaned CSS classes** — if a fix removed a DOM element or changed a class name, check whether the old CSS selector is still referenced in HTML or JS. If not, delete it.
4. **Check for stale comments** — if a comment describes behaviour that was just changed, update or remove it. Stale comments are worse than no comments.
