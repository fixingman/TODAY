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
| `today_manual` | JSON array | Manual tasks |
| `today_done` | JSON array | IDs of completed tasks (manual + Trello) |
| `today_deleted_ids` | JSON array | `{id, at}` — explicit task deletions with timestamps |
| `today_unchecked_ids` | JSON array | `{id, at}` — explicit unchecks with timestamps |
| `today_checked_ids` | JSON array | `{id, at}` — explicit checks with timestamps |
| `today_trello_cache` | JSON | Cached Trello cards from last fetch |
| `trello_config` | JSON | Trello API key, token, board ID, list ID |
| `trello_token` | string | Trello OAuth token |
| `dropbox_token` | string | Dropbox access token |
| `dropbox_refresh_token` | string | Dropbox refresh token (PKCE) |
| `dropbox_token_expired` | string | Flag set when 401 detected |
| `last_local_change` | ISO string | Timestamp of last local mutation |
| `last_successful_backup` | ISO string | Timestamp of last successful Dropbox write |
| `stat_alltime_done` | string | Lifetime completed task count |
| `stat_streak` | string | Current daily streak |
| `stat_last_visit` | string | Last date the app was opened |

### Task ID conventions
- Manual tasks: `manual_` + `Date.now()` — e.g. `manual_1741234567890`
- Trello tasks: Trello card ID — e.g. `5f3d...`

---

## 2. Multi-Device Sync — Design Principles

### Devices and edit types
Both mobile and desktop are first-class devices. Either can at any time:
- Add a manual task
- Delete a manual task
- Check a task (manual or Trello)
- Uncheck a task (manual or Trello)

One device may also be offline while editing, then reconnect.

### Core approach: operation-level union merge (v3.0)
Rather than last-write-wins on the whole file, every edit type is tracked as an **operation with a timestamp**. On merge, each operation type is resolved independently:

| Operation | Merge rule |
|---|---|
| Task add | Union — tasks from both devices survive |
| Task delete | Delete wins — tracked in `deleted_ids` with timestamp |
| Check | Union — if either device checked, it's checked |
| Uncheck | Most-recent-operation wins — compared against `checked_ids` timestamp |

### Conflict resolution — all scenarios

| Scenario | Resolution |
|---|---|
| Both devices add different tasks offline | Union — both tasks appear |
| Device A deletes a task, Device B still has it | Delete wins — removed everywhere |
| Device A checks, Device B unchecks | Most recent timestamp wins |
| Device A adds a task, Device B is offline | Appears on B when it comes online |
| Both devices edit offline, both come online | Each pulls, merges, pushes — converges |

### Backup file schema (v3.0)
```json
{
  "version": "3.0",
  "saved_at": "<ISO timestamp>",
  "manual_tasks": [...],
  "done_ids": [...],
  "deleted_ids": [{ "id": "manual_123", "at": "<ISO>" }],
  "unchecked_ids": [{ "id": "manual_123", "at": "<ISO>" }],
  "checked_ids": [{ "id": "manual_123", "at": "<ISO>" }],
  "trello_config": {...},
  "stat_alltime_done": "42",
  "stat_streak": "3",
  "stat_last_visit": "Mon Mar 09 2026"
}
```

Operation logs (`deleted_ids`, `unchecked_ids`, `checked_ids`) are **day-scoped** — cleared on new day. They only need to exist long enough for both devices to sync within the same day, which the 7s ticker makes trivially likely.

---

## 3. Sync Flows

### Startup
```
1. Has Dropbox token?
   NO  → render local state, start ticker
   YES →
     last_local_change > last_successful_backup?
     YES → offline edits exist
           → pull remote → mergeRemoteData() → push merged result
     NO  → no offline edits
           → clear last_local_change temporarily
           → dropboxRestore(fromSync=true) — pull + merge
           → restore last_local_change
     → seed lastDropboxRev
     → start ticker
```

### Live ticker (every 7s)
```
syncAll() →
  checkNewDay()     — midnight cleanup
  syncTrello()      — cheap dateLastActivity check → full fetch only if changed
  syncDropbox()     — cheap rev check → mergeRemoteData() only if rev changed
```

The ticker never downloads the full file unless the rev changed. This keeps background sync extremely cheap — one small metadata request every 7s.

### Reconnect (online event)
```
1. last_local_change > last_successful_backup?
   YES → pull remote → mergeRemoteData() → push merged result
   NO  → skip (ticker will catch up)
2. Reload Trello if configured
3. Resume ticker after 2s delay
```

### dropboxRestore — two modes

| Mode | Trigger | Merge behaviour | UI |
|---|---|---|---|
| `fromSync=true` | Ticker, startup, reconnect | `mergeRemoteData()` — union merge, no overwrite | Silent |
| `fromSync=false` | Manual Restore button | Full overwrite — user explicitly requested it | Shows progress |

### mergeRemoteData() — the core merge function
Called by both the ticker path and the startup/reconnect path. Shared logic, single place to maintain.

```
1. Build Maps from remote and local: deletedMap, uncheckedMap, checkedMap
2. Merge maps: union of both sides (remote wins on timestamp ties)
3. Task list: union of local + remote, filtered through mergedDeletedMap
4. Done state: per-task, compare checkedAt vs uncheckedAt — most recent wins
5. Persist: today_manual, today_done, operation log keys
6. DOM: fade out removed tasks, slide in new tasks, toggle done classes
7. Push merged result back via dropboxAutoSave()
```

Step 7 (push after merge) is what makes both devices **converge** — after any merge, the merged result is written back so the other device will see it on its next tick.

---

## 4. Backup Provider Abstraction — Planned

Currently Dropbox is the only provider. The sync logic is written to be provider-agnostic — all provider-specific code is in `dropboxBackup`, `dropboxRestore`, and `_dropboxEnsureToken`. The merge logic (`mergeRemoteData`) is already fully provider-independent.

### Planned interface
```js
StorageProvider {
  read()           → Promise<backup_object | null>
  write(data)      → Promise<void>
  getRevision()    → Promise<string>   // cheap metadata check for ticker
  isConnected()    → boolean
  connect()        → Promise<void>
  disconnect()     → void
}
```

Switching providers = new implementation behind this interface. Merge logic untouched.

### Provider candidates
| Provider | Auth | Rev equivalent |
|---|---|---|
| Dropbox | PKCE OAuth (implemented) | `rev` |
| Google Drive | OAuth2, `drive.appdata` scope | `etag` |
| iCloud | CloudKit JS | `changeTag` |

---

## 5. Trello Integration

- **Read-only.** Scope: `read`.
- OAuth redirect flow (not PKCE).
- Pulls cards from a selected board + list.
- Cached in `today_trello_cache` — cleared on `checkNewDay()`.
- Sync: board `dateLastActivity` checked every 7s — full card fetch only if changed.
- Done state synced via `done_ids` same as manual tasks.

---

## 6. New Day Logic (`checkNewDay`)

Runs on every ticker tick and on startup. Triggers if `stat_last_visit` ≠ today's date.

```
1. Update streak counter
2. Remove manual tasks marked done (completed tasks don't carry over)
3. Clear manual done IDs (Trello done IDs preserved)
4. Clear today_trello_cache
5. Clear operation logs: today_deleted_ids, today_unchecked_ids, today_checked_ids
6. Push clean state to Dropbox
7. Update stat_last_visit to today
```

Operation logs are cleared daily because they are day-scoped. Yesterday's delete/check/uncheck operations are irrelevant once the day rolls over.

---

## 7. Offline Behaviour

- **Service worker** (`sw.js`): network-first, cache version `today-v{version}`
- **Pre-cached at install:** `/` + all 6 self-hosted font files
- **BYPASS_ORIGINS:** Trello API, Dropbox API — always network, never SW cache
- All sync functions guard with `if (!navigator.onLine) return`
- Ticker stops on `visibilitychange hidden`, resumes 2s after visible
- Offline mutations tracked via `last_local_change` — on reconnect, pull → merge → push

---

## 8. Netlify Functions

| Function | Purpose |
|---|---|
| `dropbox-token.js` | Exchanges PKCE auth code for access + refresh tokens |
| `dropbox-refresh.js` | Refreshes expired access token using refresh token |

**Environment variables:** `DROPBOX_APP_KEY`, `DROPBOX_CLIENT_SECRET`

---

## 9. Release Checklist
> Every version bump requires ALL of the following. No exceptions.

- [ ] `APP_VERSION` constant updated in `index.html`
- [ ] `CHANGELOG` object updated in `index.html` (shown in the app's info panel)
- [ ] `Changelog.md` updated with full description
- [ ] `Architecture.md` updated if any sync, data model, or product logic changed
- [ ] Dev hours updated in `index.html`

---

## 10. Key Product Rules

1. **Operation logs are the source of truth for conflict resolution** — not file timestamps.
2. **mergeRemoteData() is the single merge path** — ticker, startup, and reconnect all use it.
3. **After every merge, push the result** — this is what makes devices converge.
4. **The ticker is cheap** — rev check only; merge runs only when something changed.
5. **Background tabs are silent** — ticker stops on hide, resumes on show.
6. **New-day cleanup must run after Dropbox restore on startup** — `applyNewDayCleanup()` is called in the `load` event after the Dropbox pull completes. Running it before the restore caused done tasks to reappear because the pull overwrote the cleaned localStorage state.
7. **`applyNewDayCleanup()` is the single source of truth for new-day logic** — both the startup `load` event and the ticker's `checkNewDay()` call it. Never duplicate this logic.
8. **`_todayStr` is cached once at module load** — the ticker's `checkNewDay()` compares `stat_last_visit` against this in-memory value. `applyNewDayCleanup()` is never called on same-day ticks, making the 7s ticker zero-cost for date checking on normal usage days.
9. **`stat_last_visit` is local device state** — it is not written to the backup file and not restored from it. Restoring it would reset the date check and cause cleanup to re-run, deleting today's surviving tasks.
7. **Trello is read-only** — the app never writes to Trello.
8. **Operation logs are day-scoped** — cleared on new day; no accumulation over time.
9. **Backup file schema changes require a version bump** — currently v3.0.
10. **Sync logic must stay provider-agnostic** — mergeRemoteData() has no Dropbox dependency.

---

## 10. File Structure

```
/
├── index.html
├── sw.js
├── netlify.toml
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
