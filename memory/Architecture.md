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
| `today_trello_focus` | JSON object | `{cardId: sessionCount}` — pomodoro counts for Trello tasks. Reset on new day. |
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
| `stat_last_visit` | string | Last date the app was opened |

### Task ID conventions
- Manual tasks: `manual_` + `Date.now()` — e.g. `manual_1741234567890`
- Trello tasks: Trello card ID — e.g. `5f3d...`

---

## 2. Multi-Device Sync — Design Principles

### The core problem
TODAY has no server-side database. Dropbox holds a **single JSON file** shared between all devices. When two devices edit concurrently or one device edits offline, a naive last-write-wins strategy will silently discard changes.

### Devices and edit types
Both mobile and desktop are first-class devices. Either can at any time:
- Add a manual task
- Delete a manual task
- Check a task (manual or Trello)
- Uncheck a task (manual or Trello)

Additionally, one device may have been offline while editing, then reconnect.

### Merge strategy — by operation type

#### Manual task list (adds and deletes)
**Union merge with explicit delete tracking** — implemented in v3.0:
- All devices union their `manual_tasks` lists — tasks added on any device survive
- Deletions tracked explicitly in `deleted_ids` as `{id, at}`. A task is removed if its ID appears in `deleted_ids`
- Delete wins over presence — if device A deletes while device B is offline, task is removed when B syncs

#### Done state (check / uncheck)
- Check and uncheck both tracked explicitly with timestamps in `checked_ids` / `unchecked_ids`
- Most recent timestamp wins — if device A checks at T1 and device B unchecks at T2 > T1, the task is unchecked

#### Trello done state
- Same as manual done state — check/uncheck synced via `done_ids`.
- Trello task list is always authoritative from Trello's API — never merged locally.

### Conflict resolution rules

| Scenario | Resolution |
|---|---|
| Both devices add different tasks offline | Union — both tasks appear |
| Both devices add the same task | Deduplicate by ID — impossible since IDs are `Date.now()` per device |
| Device A deletes a task, Device B still has it | Delete wins — task removed everywhere |
| Device A checks a task, Device B unchecks it | Most recent timestamp wins |
| Device A adds a task, Device B is offline | Task appears on B when it comes online |
| Device A deletes a task while Device B is offline editing it | Delete wins — task removed when B syncs |
| Both devices edit while offline, then both come online | Push local first, then pull and merge |

---

## 3. Sync Flow — Current Implementation

### Startup
```
1. Check: last_local_change > last_successful_backup?
   YES → unsynced offline changes exist
         → dropboxBackup(silent) — preserve offline edits
         → ticker starts
   NO  → no offline changes
         → dropboxRestore(fromSync=true) — pull latest from Dropbox
         → seed lastDropboxRev from response
         → ticker starts
```

### Live ticker (every 7s)
```
syncAll() →
  checkNewDay()     // midnight cleanup if date changed
  syncTrello()      // cheap board activity check, full fetch only if changed
  syncDropbox()     // cheap rev check, restore only if Dropbox file changed
```

**syncDropbox:** fetches metadata only → compares rev → only restores if rev changed → prevents re-restoring our own writes.

### Reconnect (online event)
```
1. last_local_change > last_successful_backup?
   YES → dropboxBackup(silent) — push offline edits first
   NO  → skip backup
2. Reload Trello if configured
3. Resume ticker after 2s delay
```

### dropboxRestore — two modes

| Mode | Trigger | Merge behaviour | UI messages |
|---|---|---|---|
| `fromSync=true` | Ticker, startup, online event | Union merge via `mergeRemoteData()` — then pushes merged state back | Silent |
| `fromSync=false` | Manual Restore button | Full overwrite — tasks, done, config, stats | Shows progress |

### Rev baseline (`lastDropboxRev`)
In-memory only. Set on startup. Updated by `_dbxSetRev()` after every backup. Prevents re-restoring our own writes.

---

## 4. Backup Provider Abstraction — Future

Currently Dropbox is the only backup provider. The architecture should be prepared for user-selectable providers (Google Drive, iCloud, etc.).

### Planned abstraction layer
Define a `StorageProvider` interface that any provider must implement:

```js
StorageProvider {
  read()           → Promise<backup_object | null>
  write(data)      → Promise<void>
  getRevision()    → Promise<string>   // cheap metadata check for sync ticker
  isConnected()    → boolean
  connect()        → Promise<void>
  disconnect()     → void
}
```

All sync logic (`syncDropbox`, `dropboxRestore`, `dropboxBackup`, startup flow) would call through this interface instead of Dropbox directly. Switching providers = swapping the implementation, not rewriting sync logic.

### Provider candidates
| Provider | Auth | Notes |
|---|---|---|
| Dropbox | PKCE OAuth | Currently implemented |
| Google Drive | OAuth2, `drive.appdata` scope | Hidden app folder, user can't accidentally delete |
| iCloud | CloudKit JS | Apple devices only, no Android |

### Migration considerations
- Backup file schema is provider-agnostic JSON — same format works for all providers
- Auth flows differ per provider — each needs its own Netlify function(s)
- Rev/etag equivalent exists in all three (Dropbox `rev`, Drive `etag`, CloudKit `changeTag`)

---

## 5. Trello Integration

- **Read-only.** Scope: `read`.
- OAuth redirect flow (not PKCE).
- Pulls cards from a selected board + list.
- Cached in `today_trello_cache` — cleared on `checkNewDay()`.
- Sync: board `dateLastActivity` checked every 7s — full card fetch only if changed.
- Card links styled with `--color-highlight` (#579dff).
- Button shows `⚡` when disconnected, `✦` when connected.

---

## 6. New Day Logic (`checkNewDay`)

Runs on every ticker tick and on startup. Triggers if `stat_last_visit` ≠ today's date.

```
1. Update streak counter
2. Remove manual tasks that were marked done
3. Clear done IDs for manual tasks (Trello done IDs preserved)
4. Clear today_trello_cache
5. Push clean state to Dropbox immediately
6. Update stat_last_visit to today
```

---

## 7. Offline Behaviour

- **Service worker** (`sw.js`): network-first, cache version `today-v{version}`
- **Pre-cached at install:** `/` + all 6 font files
- **BYPASS_ORIGINS:** Trello API, Dropbox API, Google APIs — always network
- All sync functions guard with `if (!navigator.onLine) return`
- Ticker stops on `visibilitychange hidden`, resumes 2s after visible
- Offline mutations tracked via `last_local_change` — pushed on next online/startup

---

## 8. Netlify Functions

| Function | Purpose |
|---|---|
| `dropbox-token.js` | Exchanges PKCE auth code for access + refresh tokens |
| `dropbox-refresh.js` | Refreshes expired access token using refresh token |

**Environment variables:** `DROPBOX_APP_KEY`, `DROPBOX_CLIENT_SECRET`

---

## 9. Key Product Rules

1. **Never overwrite unsynced local changes** — always check `last_local_change` vs `last_successful_backup`.
2. **The ticker is cheap** — metadata/rev checks only; full fetches only when something changed.
3. **Background tabs are silent** — ticker stops on hide, resumes on show.
4. **New day is client-side** — based on `stat_last_visit` vs current date string.
5. **Completed tasks do not carry over** — removed on new day cleanup.
6. **Trello is read-only** — the app never writes to Trello.
7. **Sync logic must be provider-agnostic** — prepare for Google Drive / iCloud as alternatives.
8. **Backup file schema changes require a version bump** — current version is `3.0`.
9. **`@font-face` declarations must use raw font name strings** — CSS variables are not resolved inside `@font-face`. Tokens are used everywhere else.
10. **TODAY is focus-first, not organiser-first** — one day, one list. The constraint is the feature. Complexity that serves organisation (labels, priorities, projects) is out of scope.
11. **Read-only pull is always the safe first step for integrations** — writeback adds product complexity and failure surface. Define "done" semantics per integration before building writeback.
12. **Checking off in TODAY means "done for today", not "done in the source system"** — this tension must be resolved explicitly before writeback is built for any integration.

---

## 10. File Structure

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
