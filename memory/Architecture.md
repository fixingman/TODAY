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
| `today_habits` | JSON array | `{id, name, created_at, focusSessions?}` — habit definitions. `focusSessions` added when habit is used in focus mode |
| `today_habit_completions` | JSON object | `{habitId: ['YYYY-MM-DD', ...]}` — append-only completion history |
| `today_deleted_habit_ids` | JSON array | IDs of deleted habits — for union merge across devices |
| `today_ai_key` | string | AI API key (Gemini or Anthropic) — stored locally, sent only through Netlify proxy |
| `today_ai_provider` | string | AI provider: `'gemini'` (default) or `'anthropic'` |
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
| `stat_flow_rate` | string | Exponential smoothed completion rate (0-100) |
| `stat_tasks_added_today` | string | Tasks added today (reset on new day) |
| `stat_tasks_done_today` | string | Tasks completed today (reset on new day) |

### Task ID conventions
- Manual tasks: `manual_` + `Date.now()` — e.g. `manual_1741234567890`
- Trello tasks: Trello card ID — e.g. `5f3d...`
- Habits: `habit_` + `Date.now()` — e.g. `habit_1741234567890`

---

### CSS design tokens
All visual values are tokenised in `:root` in `index.html`. Short-name aliases (`--bg`, `--accent`, etc.) map to semantic `--color-*` primitives. Full token set documented in `Design.md` §2.

**Notable tokens added in v1.7.x (token audit):**
- `--bg-glass` (`rgba(14,14,16,0.92)`) — frosted background for sticky header. CSS cannot apply alpha to a `var()` colour directly, so this is its own token.
- `--accent-focus-bg/border`, `--accent-check`, `--accent-check-hover/glow`, `--accent-timer-bg/fill/paused` — 8 alpha variants of the accent colour used exclusively in focus mode. Centralised so an accent colour change propagates to all focus states automatically.
- `--opacity-recede`, `--opacity-recede-done`, `--opacity-recede-chrome` — focus mode recede opacities (0.07, 0.035, 0.08).
- `--opacity-copy` (0.45) — copy button at-rest opacity during focus mode.

**Notable tokens added in v2.3.x (token audit):**
- `--z-header` (10) — sticky header and add-task bar z-index.
- `--accent-hover` (`rgba(200,240,96,0.18)`) — accent background on hover states.
- `--shadow-float` — floating element shadow (drag ghost).
- `--shadow-divider` — subtle top divider (mobile add-task bar).

**Rule:** no hardcoded hex, rgba, opacity, px-spacing, or z-index values outside `:root`. Every visual constant must have a token. See `Design.md` §11 Development Rules for enforcement.

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

### 21-day dot strip
`_getHabitDates()` returns the last 21 ISO dates. Dot opacity fades linearly: `i >= 14` → 1.0 (last 7 days fully opaque); `i < 14` → `0.12 + (i/14) * 0.70`. On mobile (≤480px), only the last 7 dots are shown via CSS — older dots hidden, column width fixed at 65px.

### Habit strength algorithm
Streak counters are not used. Habit strength (0–100%) is computed via **exponential smoothing** over the last 90 days:

```js
score = score * α + (done ? 1 : 0) * (1 - α)   // α = 0.9
```

- Walks the full 90-day window from oldest to newest on every call
- Uses `habitCompletions[id]` — the append-only date array already stored
- Missing days reduce the score gradually — they do not reset it
- `hot` class (accent colour) applied at ≥ 70%
- Implemented in `_getHabitStrength(id)` — replaces the former `_getStreak(id)`

See Research.md §4 for the full decision log and scenario data.

### Edit mode
Edit mode is toggled globally. It patches the DOM surgically — swapping the name `<div>` ↔ `<input>` and streak `<div>` ↔ delete `<button>` in place, without rebuilding any rows. No `renderHabits()` call on mode toggle — no flash, no layout shift.

### Focus mode
Habit rows support focus mode (desktop only) — clicking a habit row starts a 25-minute Pomodoro session, identical to task rows. Session counts are stored in `h.focusSessions` on the habit object and persisted via `_saveHabits()`. The unified `_logSession(id)` helper handles all three row types (manual task → Trello → habit) by checking each in order.

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

### Startup sequence (v2.8.8+)
```
1. init() runs immediately — renders from localStorage (fast, synchronous)
2. Splash animation plays in parallel
3. load event fires:
   a. Seed Trello lastTrelloDate baseline
   b. ALWAYS pull remote from Dropbox (no conditional logic)
   c. mergeRemoteData() — union merge handles conflicts
   d. Seed rev via _dbxSetRev() — prevents ticker re-trigger
   e. If merge changed anything → dropboxBackup() to push merged state
   f. applyNewDayCleanup() — always runs AFTER Dropbox restore
   g. renderManual(), updateStats()
   h. startTicker()
   i. signal _onAppLoadDone()
4. Splash dismisses only when BOTH animation AND load are complete (two-flag gate)
```

**Key change (v2.8.8):** Removed conditional `last_local_change` vs `last_successful_backup` check. Now every page load pulls remote first, merges, then pushes if needed. This ensures refresh always gets fresh data.

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

## 8. PWA & Auto-Update

### PWA installation
TODAY is a fully installable Progressive Web App. Requirements are met:
- Served over HTTPS (Netlify)
- `manifest.json` with `display: standalone`, name, icons
- Service worker with offline fallback

**Install paths:**
- macOS Safari: File → Add to Dock (Safari 17+ / macOS Sonoma+)
- Chrome/Brave/Edge: install icon (⊕) in address bar
- iOS: Share → Add to Home Screen

**Icons:** `/assets/icon-192.png`, `/assets/icon-512.png`, `/assets/apple-touch-icon.png` (also embedded as base64 in `index.html` for `<link rel="apple-touch-icon">`)

### Auto-update flow
New deploys reach users without any manual action:

```
1. Netlify deploys new index.html + sw.js
2. On next page load or 60-minute poll: SW detects new version
3. New SW downloads in background (installing state)
4. User switches away (visibilitychange → hidden) → nothing happens
5. User switches back (visibilitychange → visible) → postMessage('SKIP_WAITING')
6. New SW activates → controllerchange → window.location.reload()
7. User sees new version — feels instant, happens at a natural break point
```

**Design decision:** activation happens on next focus, not immediately. Activating mid-session would interrupt a Pomodoro timer, a Dropbox sync, or a drag operation.

### Offline fallback
When the SW is installed but the network fails on a navigation request, a branded offline screen is served — a single `✦` pulsing at 12–35% opacity on `#0e0e10`. Baked into `sw.js` as an inline HTML string (no external file dependency). The fallback is unavailable on the very first visit before SW installs — that is a browser constraint.

### Sticky header
The header (TODAY logo + CTAs + date + progress bar) uses `position: sticky; top: 0` on mobile only. On desktop it is `position: static`.

**Critical:** the sticky element must live **outside** any ancestor with `overflow` set (other than `visible`). `.app` has `overflow-x: hidden` — placing the sticky header inside `.app` silently breaks sticky. The `.sticky-header` div is a sibling of `.app` in the DOM, not a child.

**Mobile only:** sticky is activated inside `@media (max-width: 480px)` with `position: sticky`. Desktop keeps `position: static` (default). This avoids the sticky bar taking up viewport space on desktop where scrolling is less common.

### Haptics system
`_haptic(preset)` is a unified haptic helper. Routing:
- **Android Chrome / Firefox:** `navigator.vibrate(pattern)` — differentiated patterns per preset
- **iOS Safari (17.4+):** `navigator.vibrate()` also works — confirmed March 2026. Direct call, no tricks needed.
- **Desktop:** silent no-op — `typeof navigator.vibrate !== 'function'`

**Presets and patterns:**
| Preset | Pattern (ms) | Used for |
|---|---|---|
| `success` | `[40, 60, 80]` | Task/habit check done, Pomodoro complete |
| `warning` | `[30, 40, 30]` | Task delete |
| `heavy` | `[65]` | Long-press drag activation |
| `selection` | `[12]` | Drag row snaps to new slot |
| `medium` | `[40]` | General fallback |

**What was tried and abandoned:** `<input type=checkbox switch>` programmatic `.click()` trick — Safari only fires system haptics on real hardware touch events, not JS-dispatched synthetic events. Removed in v1.7.2.

## 9. Offline Behaviour

- **Service worker** (`sw.js`): network-first, cache version `today-v{version}`
- **Pre-cached at install:** `/`, `manifest.json`, all 6 font files, `/assets/icon-192.png`, `/assets/icon-512.png`, `/assets/today-og.png`
- **BYPASS_ORIGINS:** Trello API, Dropbox API, Google APIs — always network
- All sync functions guard with `if (!navigator.onLine) return`
- Ticker stops on `visibilitychange hidden`, resumes 2s after visible
- Offline mutations tracked via `last_local_change` — pushed on next online/startup

---

## 10. Netlify Functions

| Function | Purpose |
|---|---|
| `dropbox-token.js` | Exchanges PKCE auth code for access + refresh tokens |
| `dropbox-refresh.js` | Refreshes expired access token using refresh token |
| `ai-assist.js` | Provider-agnostic AI proxy — Gemini 2.5 Flash or Claude Haiku |

**Environment variables:**
- `DROPBOX_APP_KEY`, `DROPBOX_CLIENT_SECRET` — Dropbox OAuth
- `GEMINI_API_KEY` — Google AI Studio key (free tier). Falls back to client-supplied key if not set.
- `ANTHROPIC_API_KEY` — Claude API key (private deployments only). Falls back to client-supplied key if not set.

### AI Assistant architecture
- Client builds context (tasks, habits, time of day) → POST to `/.netlify/functions/ai-assist`
- Function resolves key: env var first, then `apiKey` field from request body (user-supplied)
- Returns `{ message, actions[] }` — structured JSON, never raw prose
- Actions: `add_task`, `check_task`, `check_habit`, `delete_done`, `start_focus`, `open_panel`, `dismiss`
- Provider selected at runtime in Connections panel, stored in `localStorage('today_ai_provider')`
- API key validated with a real test call before saving — not accepted unless the API responds 200

### AI build constants
```js
const AI_BUILD_PROVIDER   = 'claude';   // maintainer's deploy default
const AI_DEFAULT_PROVIDER = 'gemini';   // open-source fork default (always Gemini)
```
On first load, `AI_BUILD_PROVIDER` seeds `localStorage`. Public forks set this to `'gemini'`.

### AI Post-Add Enhancement (v2.2+)

**Flow:**
1. `addManualTask()` completes → calls `_aiAnalyzeTask(taskId)` (async, non-blocking)
2. `_aiAnalyzeTask()` debounces 2s (don't fire on rapid entry) → calls AI with minimal prompt
3. AI returns `{ suggest: true, type: 'break_down'|'clarify'|'duplicate', message, actions[] }` or `{ suggest: false }`
4. If `suggest: true`, inject `.task-suggestion` row below the task
5. Row auto-dismisses after 10s inactivity or on next task add
6. Chip tap → `_aiExecute()` (same as panel chips)

**Prompt strategy:**
- Minimal context: just the new task text + list of existing task names
- No habits, no Trello, no time-of-day — keep tokens low
- Ask: "Is this task complex enough to break down? Vague? Duplicate?"

**Rate limiting:**
- Debounce: 2s after last keystroke/Enter before calling AI
- Skip if task text < 3 chars
- Skip if AI panel is already open (user is explicitly using AI)
- Max 1 pending analysis at a time

**Actions available:**
- `replace_with_subtasks` — delete original task, add 2-3 subtasks
- `update_task` — modify the task text in place (clarify)
- `dismiss` — close suggestion row

### AI Proactive Suggestions (v2.3+)

**Purpose:** Offer contextual actions without user opening the AI panel. Pure client-side — no API call.

**Trigger conditions:**
- AI is configured (has API key)
- ≥3 manual tasks are done
- Proactive suggestion not already showing
- AI panel not open
- User hasn't dismissed this session

**Messages:**
| Context | Message | Button |
|---|---|---|
| Some pending, ≥3 done | "Nice — tidy up?" | Tidy |
| All done | "✦ All done" | Start fresh |

**Behavior:**
- Appears as inline row below section header
- Auto-dismisses after 12s (`_aiProactiveTimeout`)
- If user clicks ✕, sets `_aiProactiveDismissedThisSession = true` — won't show again until reload
- Clicking action executes `_clearAllDone()` and dismisses

**State:**
- `_aiProactiveEl` — current suggestion element (null if none)
- `_aiProactiveTimeout` — auto-dismiss timer handle
- `_aiProactiveDismissedThisSession` — flag to prevent repeat after dismiss

---

## 11. Key Product Rules

1. **Never overwrite unsynced local changes** — always check `last_local_change` vs `last_successful_backup`.
2. **The ticker is cheap** — metadata/rev checks only; full fetches only when something changed.
3. **Background tabs are silent** — ticker stops on hide, resumes on show.
4. **New day detection must use a fresh date** — never cache `new Date()` at module load. The app may stay open past midnight.
5. **New day cleanup runs after Dropbox restore** — ensures the freshest data is cleaned, not overwritten by a subsequent pull.
6. **Completed tasks do not carry over** — removed on new day cleanup.
7. **Habit completions are append-only** — never deleted. The history is what `_getHabitStrength()` walks to compute the score. Deleting completions would silently corrupt strength scores.
8. **`stat_last_visit` is local device state** — never backed up, never restored.
9. **Trello is read-only** — the app never writes to Trello.
10. **Backup file schema changes require a version bump** — current version is `4.0`.
11. **`@font-face` declarations must use raw font name strings** — CSS variables are not resolved inside `@font-face`.
12. **CSS animations must not be on base element rules** — animation fill values override everything including `!important`. Apply via a class removed on `animationend`.
13. **Done state visuals are applied via inline style in `toggleDone()`** — not CSS class alone. Avoids mobile Safari paint deferral on opacity transitions.
14. **`init()` runs before the splash IIFE** — local data renders immediately. The splash is cosmetic, not a loading gate.
15. **Sync logic must be provider-agnostic** — prepared for Google Drive / iCloud as future alternatives.
16. **TODAY is focus-first, not organiser-first** — one day, one list. Labels, priorities, and projects are out of scope.
17. **Task and habit order is user-controlled** — `manualTasks` and `habitsList` arrays are sorted by the user via drag-to-reorder and persisted in that order to localStorage and Dropbox. Never re-sort these arrays alphabetically or by date — the user's manual order is the source of truth. Trello card order is also locally overridable but resets on the next full board fetch.
18. **Gestures must not replace visible controls** — swipe-to-complete was removed because the checkbox is the correct affordance for completion. Gesture alternatives are only appropriate when the primary control is genuinely hard to reach. See Design.md §7 for the full decision record.
19. **The AI is a companion, not a command-line** — AI should observe and occasionally speak unprompted (e.g., noticing stale tasks, celebrating milestones), not just respond to explicit queries. The goal is a relationship, not a tool.
20. **Time-of-day awareness matters** — Morning opens, afternoon opens, and evening opens serve different emotional needs. AI tone and observations should reflect where the user is in their day.

---

## 11b. Why Open TODAY? — Internal Triggers

*See Research.md § 10 for full research. This section captures the product principles.*

The most important product question: **What emotional state or context makes someone instinctively reach for TODAY?**

### Confirmed Emotional Positioning (Mar 2026)

**Primary:** "I feel scattered → I want to feel intentional"  
**Secondary:** "I feel alone in my productivity → I want a companion"

These two work together: Opening TODAY makes you feel *deliberate about your day*, and when you're there, a gentle companion *notices your patterns* without pressure.

The name itself suggests this: **TODAY**. Not "someday." Not "everything." Just *today*. Present. Intentional. Contained.

### The Opportunity

Different moments in the day have different emotional needs. TODAY should answer each:

| Moment | Emotional Need | TODAY's Answer |
|---|---|---|
| **Morning** | Clarity, intention | "Here's your clean slate. What matters today?" |
| **Mid-day scattered** | Reset, grounding | "Return to your list. Find your focus." |
| **Decision fatigue** | Direction | "Just do this one next." |
| **Accomplished something** | Acknowledgment | "Check it off. Feel the progress." |
| **Evening** | Closure, reflection | "Here's what you did. The day is done." |
| **Task lingering in mind** | Relief | "Add it to TODAY so you can let it go." |

### Implemented AI Awareness Features (v2.9.4)

1. **✓ Morning briefing** — First open of the day triggers special AI context. AI summarizes: tasks carried over, habits due, aging items, streak. Brief and warm.

2. **✓ Stale task awareness** — AI notices tasks sitting 3+ days. Probabilistic (~30% of panel opens). Asks "still relevant, or ready to let it go?" with `delete_task` action.

3. **✓ Sunday reflection** — Sunday evening triggers weekly reflection mode. AI offers gentle acknowledgment of the week: tasks done, focus time, streak status.

4. **✓ Visual aging** — Tasks fade over time (75% at day 3-4, 55% at 5-6, 35% at 7+). UI reflects what the brain already knows.

5. **✓ Memory that speaks** — AI context includes `_memoryForAI()` output: peak hours, best streak, total focus time, recent milestones.

### Implementation Details

Context flags passed to AI:
- `isFirstOpenToday` — tracks via `ai_last_open_date` in localStorage
- `dayOfWeek` — for Sunday detection
- `tasks.aging` — array of tasks with `ageDays >= 3`
- `streak` — current streak count
- `weeklyStats` — focus minutes, tasks completed, etc.

System prompt includes "Special moments to notice" section that guides AI behavior for morning briefing, Sunday reflection, and stale awareness.

### Not Yet Implemented

1. **Mid-day reset** — Opening after being away could acknowledge the return.

2. **"Pick one for me"** — When overwhelmed, user taps ✦ and AI suggests one task to start with. (Current AI already does this somewhat.)

3. **Evening closure** — Optional ritual showing what happened. (Sunday reflection covers part of this.)

### What TODAY Should *Not* Become

- A notification machine that interrupts the user
- A guilt engine that pressures completion
- A complex system that requires learning
- A passive list that waits to be remembered

The goal is an app that feels like a *companion who knows you* — one you want to check in with, not one you're told to open.

---

## 12. File Structure

```
/
├── index.html
├── sw.js
├── manifest.json
├── netlify.toml
├── README.md
├── assets/
│   ├── icon-192.png         ← PWA icon (manifest + SW cache)
│   ├── icon-512.png         ← PWA icon large
│   ├── apple-touch-icon.png ← iOS home screen (also embedded as base64 in index.html)
│   └── today-og.png         ← Open Graph / Twitter social preview image
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

## 13. Release Checklist

### Version semantics

| Segment | When to use | Example |
|---|---|---|
| **Patch** `x.x.N` | Bug fix, CSS tweak, housekeeping, copy change — anything the user doesn't intentionally notice | `1.6.48 → 1.6.49` |
| **Minor** `x.N.0` | New user-facing feature, new integration, meaningful UX addition — something the user would notice and value | `1.6.x → 1.7.0` |
| **Major** `N.0.0` | Breaking data model change, complete redesign, fundamental product shift — changes what TODAY fundamentally is | `1.x.x → 2.0.0` |

**Enforcement:** at the end of every work block, before closing — check: does what just shipped qualify as a minor? If yes, bump before moving on. Do not defer. The 1.6.x era (1.6.25–1.6.54) violated this rule three times — habits, drag-to-reorder, and focus-on-habits all warranted minor bumps and were patched instead. 1.7.0 corrects that.

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

### Doc freshness — which change triggers which file

| Change type | Update |
|---|---|
| New localStorage key, backup schema change, sync flow change, new data model | `Architecture.md` §1 Data model or §4 Sync flow |
| New product rule, merge strategy change, new-day logic change | `Architecture.md` §5 or §10 Key Product Rules |
| New UI component, token added/changed, animation rule, sound design | `Design.md` relevant section |
| Interaction pattern added, changed, or deliberately removed | `Design.md` §7 Interaction Decisions |
| Bug fix that reveals a non-obvious browser constraint or gotcha | `Research.md` §3 Technical Gotchas |
| New integration researched or complexity rating updated | `Research.md` §2 Integrations |
| Product decision made with explicit reasoning (e.g. feature removed, scope defined) | `Research.md` relevant section or new section |
| Habit algorithm, strength formula, or scoring change | `Research.md` §4 Habits |

**The test:** after every change, ask — *if someone read only the memory files, would they understand why this exists and how it works?* If the answer is no, the docs are stale.

**What "stale" looks like in practice:**
- A function exists in code that no memory file explains
- A decision was made that no memory file records the reasoning for
- A gotcha was hit that no memory file warned about
- A product rule exists in Architecture.md that the code no longer follows

---

## 14. Housekeeping Rules

After every bug fix or function rework:

1. **Check for empty rules** — if a CSS rule block has no declarations (only comments or nothing), delete it. Empty rules are noise and can mask future bugs.
2. **Check for dead functions** — if a fix extracted logic into a helper, or replaced a function's role, check whether the old function is still called anywhere. If not, delete it.
3. **Check for orphaned CSS classes** — if a fix removed a DOM element or changed a class name, check whether the old CSS selector is still referenced in HTML or JS. If not, delete it.
4. **Check for stale comments** — if a comment describes behaviour that was just changed, update or remove it. Stale comments are worse than no comments.
5. **Check doc freshness** — use the trigger table in §12 to determine whether the change warrants a memory file update. A fix that hits a new browser gotcha goes in Research.md. A removed feature goes in Design.md §7. A new product rule goes in Architecture.md. Do this before closing the work item, not at the end of a session.
