# TODAY — Changelog

| Version | Key change |
|---|---|
| **2.15.4** | **AI suggestion history in context** — `_memoryForAI()` now includes past suggestions (last 30 days, up to 5 tasks) with action taken. AI can reference: "You dismissed this twice" or "You parked this to Soon last week." Data already stored and Dropbox-synced. AI.md updated. |
| **2.15.3** | **AI aging task chips deterministic (Option B)** — chips for aging tasks pre-set by app, not AI. 7+ days: "Break it down" + "Let it go" + Dismiss. 3-6 days: "Park for later" + "Do it now" + "Let it go" + Dismiss. AI writes message only. |
| **2.15.2** | **Fix: AI repeats same aging task** — `suggestionCooldowns` pruning only checked `manualTasks`, so Trello task cooldowns were deleted nightly and the same card appeared weekly. Fixed to include `trelloTasks`. |
| **2.15.1** | **AI upgraded to Claude Sonnet** — `claude-haiku-4-5-20251001` → `claude-sonnet-4-5` in `ai-assist.js`. UI label updated in Connections panel. Comment updated. AI.md + Integrations.md updated. |
| **2.15.0** | **Habit strength: asymmetric smoothing** — Split alpha into `alpha_up=0.90` (build rate unchanged) and `alpha_down=0.97` (miss penalty much softer). 30-day streak miss: was 10% drop → now 3%. |
| **2.14.9** | **Fix: BUG-013 — focus timer jumps 8-10s on minimize/restore** — double-counting between `tickFor` (`st.rem--`) and `visibilitychange` wall-clock correction. `wallStart` never advanced during ticks so correction recounted time already counted. Fix: `st.wallStart += 1000` on every `tickFor` tick. |
| **2.14.8** | **Fix: BUG-006 regression** — `_focusReanchor()` was only called from `renderManual()`. v2.14.5 BUG-012 fix added `renderTrello()` standalone call in `mergeRemoteData` with no reanchor — focused Trello tasks could orphan the timer bar. Added `_focusReanchor()` to end of `renderTrello()`. |
| **2.14.7** | **Fix: Triage summary font** — `.triage-complete-msg` switched from Syne 28px weight 700 to DM Mono `--text-lg` weight 500. Syne in lowercase looks wrong — it's for all-caps/numbers only. Rule 27 added to Rules.md. |
| **2.14.6** | **Fix: Triage bar disappears on task mutation** — added `_triageBarShown` flag. Once bar appears, mutations (delete, zone moves) no longer hide it. Hides only when all tasks gone, dismissed, or outside window. Reset on new day. |
| **2.14.5** | **Fix: BUG-012 + in-app changelog catch-up** — `mergeRemoteData` re-filters `trelloTasks` after `doneIds` update. In-app CHANGELOG entries added for v2.13.7–v2.14.5. Housekeeping step 2b reinforced. |
| **2.13.6** | **Fix: PiP completion chime sync** — With v2.13.5, the PiP RAF correctly shows `00:00` at wall-clock zero, but `completeFor()` (chime + session log) was still triggered by the throttled `tickFor` — firing seconds late. Now PiP RAF calls `completeFor()` directly when `currentRem <= 0`. Guard added to `completeFor()`: `if (!st.running) return` prevents double chime/session if `tickFor` also fires. |
| **2.14.4** | **Triage summary redesign (Option 1)** — Headline now uses Syne display font at 28px, weight 700, tracking -0.02em. Full stop added ("Solid day."). Adaptive sub-line: max 2 parts, habits only shown if no tasks done, streak fills in if room. Triage breakdown removed entirely — user just made those decisions. Old CSS classes (`triage-complete-detail`, `triage-complete-breakdown`) replaced with single `triage-complete-sub` at `--text-sm2` muted. |
| **2.14.3** | **Error log panel** — Replaced `alert()` with a compact panel anchored to the red dot. Panel fades in (`fadeIn 0.18s`) below the dot, matches `config-panel` animation. No backdrop. Dot is the toggle — tap to open, tap again to close and clear. Errors listed with timestamp, source badge (Dropbox/Trello/External/App), message. Extracted `_showErrorDot()` helper. Added `source-*` CSS badge classes. |
| **2.14.2** | **Red dot cleanup** — `background: #ff4444` → `var(--danger)`. `window.onerror` now detects external errors (non-app URL) and prefixes log entry with `[external]`. Both in red dot log and console. |
| **2.14.1** | **BUG-003 gap fix** — `unhandledrejection` handler had no network error filter. "Promise: Failed to fetch" was reaching the red dot directly. Added same network error filter as `_logSyncError`. Logged to console with `[network-promise]` prefix. |
| **2.14.0** | **Triage bar cross-device flash** — Added `_triageBarSilent` flag set for 3s on wake (visibilitychange + focus). `checkTriageBar()` hides bar unconditionally while silent. Prevents ticker from showing bar before sync settles and mergeRemoteData applies remote dismissal. |
| **2.13.9** | **Hotfix: AI button broken** — Missing `}` closing brace on `.ai-provider-badge` CSS rule introduced in v2.13.8 token cleanup. Broke all CSS below that point including `#aiPanel`, making the AI panel unclickable. |
| **2.13.7** | **Triage summary legibility** — Complete visual rewrite of the triage done screen. New CSS structure: `#triageComplete` as flex column with proper padding and gap. `.triage-complete-msg` for headline (16px, 500 weight). `.triage-complete-detail` for stats (14px, `var(--text)`, `var(--opacity-strong)`). `.triage-complete-breakdown` for triage counts (12px, `var(--muted)`). JS updated to render separate divs with correct classes. |
| **2.13.6** | **Fix: PiP completion chime sync** — PiP RAF now calls `completeFor()` directly when wall-clock hits zero, instead of waiting for throttled `tickFor`. Chime fires at the right moment. Guard added to `completeFor()` (`if (!st.running) return`) prevents double chime/session if `tickFor` also fires. |
| **2.13.5** | **Fix: PiP timer lag** — PiP was mirroring throttled `setTimeout` ticks from the hidden main tab. When the tab is hidden, browsers throttle `setTimeout` — ticks come slower than 1s, causing accumulated lag. Rewrote PiP display to use its own `requestAnimationFrame` loop with a fixed reference point (`refTime + refRem`). Real remaining = `refRem - (Date.now() - refTime)`. Handles pause/resume by re-anchoring reference point on resume. Completely independent of main tab tick rate. |
| **2.13.4** | **Fix: Red dot on network loss (BUG-003)** — `_logSyncError` now detects network errors ("Failed to fetch", "NetworkError", "Load failed", "CORS") and suppresses the red dot for them. Logged to console with `[network]` prefix for debugging. Red dot now only shows for real problems (401, 405, server errors, code bugs). Previously every WiFi drop triggered visible errors that alarmed the user. |
| **2.13.3** | **Delete button click target** — Padding increased from `0 2px` to `var(--space-2) var(--space-3)` with negative margin to keep row height. Easier to hit on desktop. |
| **2.13.2** | **Fix: Triage bar stays visible (BUG-007 rewrite)** — Previous fixes (v2.12.68 early dismiss, v2.12.69 overlay-open guard) were fragile — they checked `overlay.classList.contains('hidden')` which could race with other DOM changes. Replaced with explicit `_triageActive` boolean flag. `triageExpand()` sets it `true` (bar unconditionally hidden), `triageClose()` and `triageMinimize()` clear it. `checkTriageBar()` respects the flag as a hard lock — won't touch bar visibility while triage is in progress. Clean three-state model: bar visible → triage active (bar locked hidden) → dismissed (bar hidden via `triageDismissedToday`). |
| **2.13.1** | **Day-end review + morning reflection** — Triage summary now shows contextual acknowledgment based on what happened: "Solid day" (5+ done), "Deep work today" (3+ done with 50m+ focus), "You showed up" (1-2 done), "Habits held" (only habits, no tasks). Below the headline: stats line (done, focus time, habits, streak) + muted triage breakdown. Summary display time extended from 2s to 3s for this reflective moment. Morning nudge enhanced: shows "Yesterday: 5 done, 1h focused, 2 habits · 3 carried over" instead of just the task count. Day review saved to `today_day_review` in localStorage at triage completion, consumed by morning nudge, auto-cleared after noon. |
| **2.13.0** | **AI personality overhaul** — Removed random gates from `_aiIntroMessage`: stale task awareness and behavioral insights now always fire when data exists, with deterministic rotation (day+hour modulo) instead of `Math.random()`. Added 3 new action types to system prompt and `_aiExecute`: `break_down` (asks AI to split big task into subtasks), `move_soon` (parks task in SOON zone), `reflect` (asks for warm pattern reflection). Fallback message now varies by time of day, progress, energy, and task count instead of always "What should I focus on?" System prompt rules expanded to guide time-aware, habit-aware, energy-aware responses with explicit "don't always suggest start_focus" guidance. Widened observation triggers: streak 3+ (was 5+ with 20% random), focus milestones every 10h (was exact round numbers), task milestones every 25 (was exact 50/100/etc). |
| **2.12.79** | **Link extraction for manual tasks** — URLs typed in the task input are extracted, stored as `task.url`, and rendered as a ↗ arrow link (same pattern as Trello tasks). If only a URL is pasted with no text, the domain is used as display text. Renamed `.trello-link` → `.task-link` across CSS, `taskHTML`, `renderTrello` patch path, copy handler, and focus click guard. Title attribute is dynamic: "Open link" for manual, "Open in Trello" for Trello. URL syncs via Dropbox automatically (part of task JSON). |
| **2.12.78** | **Unified internal clock** — Created `_localISO(d)` helper returning local YYYY-MM-DD. Replaced all 7 `toISOString().slice(0,10)` usages across habits, AI memory (`firstSeen`), moments (`date`), and morning nudge (`yesterdayStr`). The app now has one consistent local-time date system: `_getAppDay()` for human-readable day strings, `_localISO()` for YYYY-MM-DD strings, and `_habitTodayISO()` (which wraps `_localISO()`). Full ISO timestamps (`zoneChangedAt`, `ts`) remain UTC — correct for cross-timezone sync ordering. |
| **2.12.77** | **Fix: Habit rollover timezone bug (BUG-010 deeper cause)** — `_habitTodayISO()`, `_getHabitDates()`, and `_getHabitStrength()` all used `toISOString().slice(0,10)` which returns **UTC** date. In Stockholm (UTC+2), between midnight and 2am local time, UTC was still yesterday — habits wouldn't roll over. `_getAppDay()` uses `toDateString()` (local time) so tasks rolled over correctly but habits didn't. Fixed all three functions to use local date formatting (`getFullYear/getMonth/getDate`). |
| **2.12.76** | **Drag fix robustness (BUG-008 follow-up)** — v2.12.72 introduced `_pendingBackup` check that blocks sync pulls during local upload. But if the upload failed (bad network, etc.), `_pendingBackup` stayed `true` forever — sync remained blocked indefinitely, never pulling other devices' changes. Added exponential backoff retry (2s, 5s, 15s, 30s, then cap at 30s, retries forever). Routed `visibilitychange` retry through the same `_scheduleBackup` helper to prevent concurrent uploads when both fire close together. |
| **2.12.75** | **Cleanup** — Removed 15 unused entries from `_cacheElements()` (trelloList, trelloEmpty, triageList, aiApiKey, aiSaveBtn, installBtn, listSelect, boardSelect, habitsBtn, trelloBtn, infoBtn, habitAddRow, habitNewBtn, statusMsg, undoToast) — they were cached at init but never read via `$`. Fixed two remaining 1am shifts missed in v2.12.74: date header in `init()` and splash typewriter. Removed 1am logic from streak calculation. Updated stale doc references (`data-age-days` → `data-age-bucket`) in Focus.md and Components.md. Updated Performance-audit to v2.12.74 baseline. |
| **2.12.74** | **Day boundary aligned + habit rollover fix (BUG-010)** — Tasks, triage, and habits all roll over at **midnight** now. Previously tasks used `_getAppDay()` with 1am shift; habits used `_habitTodayISO()` at midnight — creating a 1-hour window where habits had flipped but tasks hadn't, blocking `checkNewDay` from running `renderHabits`. Unified at midnight. Triage window narrowed to 8pm-midnight. Also added `checkNewDay()` call directly in `visibilitychange` handler so rollover happens immediately on app return (was waiting 2s + 7s for ticker). Rule 16 & 17 updated. |
| **2.12.73** | **Fix: Task aging opacity (BUG-009)** — CSS was using attribute-starts-with selectors like `[data-age-days^="1"]` to match day 10+. But `^="1"` also matches `"1"` (day 1), so day-1 tasks immediately got the day-7+ opacity (0.35). Same for `^="2"`, `^="3"` etc. Replaced fragile string matching with `data-age-bucket` attribute (young/mid/old) set in JS — clean three-stage fade with no false positives. Also updated `_logSession` to clear the new attribute. |
| **2.12.72** | **Fix: Drag jump-back (BUG-008)** — Race condition on mobile PWA: user drags task → `_pendingBackup = true`, `dropboxAutoSave` schedules upload in 800ms. During that window, iOS can fire `visibilitychange` which resets `lastDropboxRev = null` and triggers immediate `syncDropbox`. The pull fetched stale remote data (old order), `mergeRemoteData` overwrote local order → task jumped back. Fix: `syncDropbox` returns early if `_pendingBackup === true`. Pull waits for our upload to complete first. |
| **2.12.71** | **Red dot clears on click** — Clicking the error indicator now shows the log, then empties `_errorLog` and hides the dot. Fresh errors get captured cleanly, no mixing old with new. Full error history remains in browser console via `console.warn` calls in `_logSyncError`. |
| **2.12.70** | **Error log timestamps** — All entries in `_errorLog` now prefixed with `HH:MM:SS` via `_fmtErrTime()` helper. Covers `_logSyncError`, `window.onerror`, and `unhandledrejection` handlers. Debug aid for BUG-003 — timestamps reveal when errors occur and cluster around wake events. |
| **2.12.69** | **Fix: Triage bar flash (deeper cause)** — v2.12.68 set `triageDismissedToday` early but missed the real issue: during triage, `checkTriageBar()` fires every ~7s from `loadTrello` sync. Each call was removing `hidden` from the bar (dismissed was still false, tasks still undone). Bar was hidden behind the overlay — but when overlay closed, bar was briefly visible until the next tick hid it. Fix: `checkTriageBar` returns early when overlay is open — bar stays hidden during the whole triage flow. |
| **2.12.68** | **Fix: Triage bar flashes after summary** — `triageDismissedToday` was only set in `triageClose()` (2s after summary). During those 2s, any `checkTriageBar()` call would show the bar because dismissed was still `false`. Now set immediately in `triageApplyAll()` along with `localStorage`. |
| **2.12.67** | **Trello error handling** — Added 405 ("Method Not Allowed") and 429 (rate limit) status messages to `loadTrello` catch block. Background Trello load errors now route to `_logSyncError` → red dot (non-network errors only, respects wake silent flag). Previously background Trello errors were completely invisible. |
| **2.12.66** | **Fix: Blank task list + Trello 🍅 badge** — BUG-004: removed `contain: layout style` from `.task-list` (was giving browser permission to skip repainting), repaint on wake now targets `#main-app` instead of just `#manualList` (both manual and Trello lists were going blank). BUG-005: `renderTrello` patch path was overwriting `.task-text` innerHTML every 7s tick — `newText` didn't include session badge, so comparison always failed, destroying the badge. Session badge now included in `newText` construction. |
| **2.12.65** | **Fix: Focus timer splits from task on sync** — `renderManual()` does `innerHTML` rebuild which destroys the task element the timer bar was anchored to via `taskEl.after(timerEl)`. Added `_focusReanchor()` — exposed from focus IIFE, called after every `renderManual()`. Finds new task element by ID, re-attaches timer bar and kbd hint, updates `uiTaskEl` reference. |
| **2.12.64** | **Fix: Session count jump** — Clicking "again?" to start next pomodoro was calling `_logSession` immediately, incrementing the counter before the session ran. Removed — sessions now only logged on timer completion (`completeFor`) or task check mid-session (`_focusOnCheck`). Applies to manual, Trello, and habit tasks. |
| **2.12.63** | **Tags on Trello tasks** — `renderTrello` patch path now detects `"label: text"` tag pattern (was only in `taskHTML` for new tasks). Copy button in focus mode now strips `.task-tag` element so copied text doesn't include the tag prefix. |
| **2.12.62** | **Code cleanup** — Removed dead `_aiDismissProactive()` function, 3 unused CSS tokens (`--text-xl`, `--space-10`, `--space-12`), 2 debug helpers (`_dbxGetRev`, `_dbxTickerRunning`). `renderConnections()` now skips rebuild if panel is closed — eliminates ~16 wasted HTML rebuilds per sync cycle. |
| **2.12.61** | **Fix: `dropboxUpdateUI` undefined + wake sync silent** — Function was renamed to `renderConnections()` but 8 call sites weren't updated, breaking token refresh entirely. Also added `_wakeSyncSilent` flag — sync errors in the first 3s after tab return are logged to console but don't show red dot, since network may not be ready after sleep. Ticker retries handle recovery. |
| **2.12.60** | **Fix: Triage cross-device** — `checkTriageBar()` deferred 3s on tab return so `syncDropbox()` can pull dismissal state first. Previously triage check ran synchronously before async sync completed, showing a stale bar that got hidden moments later. `mergeRemoteData` already handles hiding the bar when remote has `triage_dismissed` for today. |
| **2.12.59** | **Fix: Sync on return** — Immediate `syncDropbox()` + `syncTrello()` on tab return (was 2s delay). Rev baseline (`lastDropboxRev`) reset to `null` on return so Dropbox CDN lag doesn't skip sync. PWA `window.focus` also triggers sync + rev reset as fallback when `visibilitychange` doesn't fire in standalone mode. |
| **2.12.58** | **Fix: Sync errors visible** — All sync `catch` blocks now route through `_logSyncError()` which pushes to the red dot error indicator. Token refresh (`_dropboxEnsureToken`) retries once with 2s backoff for Netlify cold starts. Errors tagged by source: Dropbox, Trello, Sync. |
| **2.12.57** | **Fix: Task list blank after inactivity** — Forced repaint on tab return (`visibilitychange`), window focus (PWA standalone), and bfcache restore (`pageshow`). Browser paint deferral combined with `contain: layout style` on `.task-list` was causing stale compositor layer. Desktop PWA only. |
| **2.12.56** | **Fix: Trello session count** — 🍅 badge now updates on existing Trello tasks after focus session. `renderTrello` patch path was only updating text, due badge, and done state — session count was skipped. |
| **2.12.55** | **Fix: Task order sync** — `mergeRemoteData` was only detecting add/remove, not reorder. Now checks ID sequence and re-renders when order differs. Also added `last_sync_read` for accurate status display. |
| **2.12.53** | **Fix: Trello done next day** — Done Trello cards in today list now hide the next day. Uses `checked_ids` timestamp to show only if checked today. |
| **2.12.52** | **Fix: SOON/PAST ghost tasks** — Zone merge now checks if task was pulled back to TODAY with newer timestamp. Tasks no longer resurrect after being moved or deleted. |
| **2.12.51** | **Fix: Done Trello in triage** — Race condition fixed: triage re-checks after sync/cleanup complete. AI context filter also corrected (was double-prefixing Trello IDs). |
| **2.12.50** | **Fix: Triage overlay z-index** — Raised to 999 to prevent callout bar showing through on mobile. |
| **2.12.49** | **Fix: PiP closes on restore** — PiP now closes when window is restored from minimized state. |
| **2.12.48** | **Fix: Sound delay** — Sound plays immediately instead of waiting for AudioContext resume promise. |
| **2.12.47** | **Hide Trello section** — When connected but no tasks, section is hidden for cleaner UI. |
| **2.12.46** | **Skip splash on return** — Uses sessionStorage to skip splash animation when returning from background on mobile. |
| **2.12.45** | **Code cleanup** — Removed unused CSS variables (`--color-noise-overlay`, `--shadow-divider`). |
| **2.12.44** | **Zone changes sync immediately** — `pullFromSoon`, `moveToSoon`, `moveToPast`, triage now call `dropboxBackup` directly (no 800ms debounce). |
| **2.12.43** | **Fix: Triage overlay sync** — Triage overlay (not just bar) now hides on other device when sync receives dismissal. |
| **2.12.42** | **Fix: Zone changes now sync** — `pullFromSoon`, `moveToSoon`, `moveToPast`, triage decisions, and `triageClose` all trigger Dropbox backup. Prevents ghost tasks reappearing. |
| **2.12.41** | **Fix: Stale focus state after sleep/wake** — Clears `.focusing` class on init and bfcache restore. Prevents empty task list appearance. |
| **2.12.40** | **Fix: Triage sync race condition** — Reads fresh from localStorage on tab return, not stale cached variable. |
| **2.12.39** | **All done messaging** — Tasks and habits both show "✦ All done" (not "Clear"). Consistent, not a CTA. |
| **2.12.38** | **All habits done celebration** — Accent glow + extra ember burst from the completing habit row (not icon). |
| **2.12.37** | (Initial habit celebration — replaced by 2.12.38) |
| **2.12.36** | **Fix: Mobile input bar vibration** — Uses GPU-accelerated transform + requestAnimationFrame for smooth keyboard tracking. |
| **2.12.35** | **Fix: Deleted tasks stay deleted** — `deleted_ids` no longer cleared daily. Sync cannot resurrect deleted tasks. Entries auto-purge after 30 days. |
| **2.12.34** | **Quieter AI connect** — No "Connecting…" message, no button text change. Just disables during request. |
| **2.12.33** | **Habits use midnight boundary** — Simpler than 1am. Tasks/triage still use 1am app day. |
| **2.12.32** | **Fix: Trello overdue cleanup** — Done Trello cards with past due dates disappear the next day. |
| **2.12.31** | **Triage on tab return** — Triage bar now checks on tab visibility (no timer). Zero performance cost. |
| **2.12.30** | **Flow rate redesign** — Research-based diminishing returns formula. 1st task = 20% (quick win), 5 tasks = 67% (good day). Based on Endowed Progress Effect (Nunes & Dreze 2006) and Goal Gradient Hypothesis (Kivetz et al. 2006). |
| **2.12.29** | **Fix: Habit dots day boundary** — `_getHabitDates()` now uses 1am boundary to match `_habitTodayISO()`. No more misaligned dots between midnight and 1am. |
| **2.12.28** | **Trello sync fixes** — Done Trello cards stay visible until end of day. Trello order now syncs across devices (backup schema v5.2). |
| **2.12.27** | **Fix: Triage sync** — Triage dismissal now syncs across devices — no repeat prompts on other devices. |
| **2.12.26** | **Fix: Habit order sync** — Habit order now syncs across devices (remote order wins, like tasks). |
| **2.12.25** | **Tooltips + Tag fix** — ✦ button → "Ask anything", SOON ← → "Grab for today". SOON and PAST sections now render task tags. |
| **2.12.24** | **PAST alignment fix** — PAST tasks now use same HTML structure as YOUR TASKS. Token audit — zone list opacity uses design tokens. |
| **2.12.23** | **AI meta-prompt** — ~5% chance asks engaged users (7+ days) for app improvement suggestions. |
| **2.12.22** | **AI awareness** — suggests breaking down 7+ day old tasks. Behavioral insights: peak hour, focus time, streak progress, task patterns. |
| **2.12.21** | **SOON aging** — tasks in SOON for 30+ days auto-archive to PAST with status "aged". Runs on new day. |
| **2.12.20** | **Fix: Day boundary consistency** — all day-boundary logic uses `_getAppDay()` (triage dismissed, manual restore). Prevents timezone/DST edge case bugs. |
| **2.12.19** | **Day boundary at 1am** — triage window 8pm–1am, app day rolls over at 1am (not midnight). Habits, stats, cleanup all align. |
| **2.12.18** | **Zone hover UX** — chevron (+/−) and pull button (←) follow focus mode copy button pattern: border on hover, no background change. |
| **2.12.17** | **Sync fix: Zone task protection** — `_addDeletedId()` now checks if task exists in SOON/PAST before marking deleted. Cleanup on init removes invalid deleted_ids. Prevents zone tasks from being deleted by stale devices. |
| **2.12.16** | **Pull button UX** — shows on hover (desktop) / dimmed (mobile). Fixed black screen when clicking SOON tasks. |
| **2.12.15** | **SOON/PAST UI polish** — removed border separators, cleaner +/− expand icons with hover state. |
| **2.12.14** | **Sync hardening** — deleted tasks excluded from zone merge, AI delete_task now tracks deletion. |
| **2.12.13** | **Zone-aware sync** — tasks moved to SOON/PAST on one device no longer duplicate when synced. Uses zoneChangedAt timestamps for conflict resolution. |
| **2.12.12** | **Token audit** — breathe overlay, modal overlay, panel shadows now use CSS vars. 6 new tokens added. |
| **2.12.11** | **Fix: _aiViewingProvider initialization** — moved declaration to state section to avoid "Cannot access before initialization" error. |
| **2.12.10** | **Fix: _cacheElements placement** — now runs at start of init(). Removed misplaced code from renderInfoStats(). |
| **2.12.9** | **Fix: cached element fallbacks** — prevent crash when functions called before cache populated. |
| **2.12.8** | **Dev tools + Performance** — Error indicator (red pulsing dot) shows JS errors. Extended element caching (13→26 elements). |
| **2.12.7** | **Morning nudge** — "3 tasks are still here from yesterday" — gentle reminder of carried-over tasks. Shows before noon, tap to dismiss. |
| **2.12.6** | **PAST purge** — done items auto-removed after 7 days, let_go/aged items after 30 days. Keeps PAST section clean. |
| **2.12.5** | **Performance** — cached DOM elements + global safeJSON helper. Eliminates ~50 redundant DOM lookups. |
| **2.12.4** | **About panel cleanup** — removed duplicate version display (already shown in changelog as CURRENT). |
| **2.12.3** | **PiP timer sync** — countdown now syncs immediately when returning to app tab (was waiting for next tick). |
| **2.12.2** | **Dropbox sync retry** — pending backup flag + visibilitychange listener retries failed syncs on tab focus. |
| **2.12.1** | **Trello in triage** — Evening triage now includes Trello cards with Keep/Let go options. Yellow accent distinguishes them from manual tasks. |
| **2.12.0** | **AI triage hints** — Evening triage shows contextual AI suggestions per task (focus sessions, task age, patterns). Tracks triage history to learn from past decisions. Synced via Dropbox. |
| **2.11.8** | **Nav scroll fix** — Panel toggle no longer jumps to top. Scroll position preserved when opening Habits/Connections/About. |
| **2.11.7** | **PWA install** — Android users see "Install App" button in About panel. Coffee/dev-hours hidden in installed PWA. |
| **2.11.6** | **Housekeeping** — Removed orphaned `stat_tasks_added_today` code, updated schema docs to v5.0. |
| **2.11.5** | **PiP polish** — Window title shows "✦ TODAY". Improved reliability with dual-attempt open strategy. |
| **2.11.4** | **Splash polish** — addTaskBar/triageBar hidden during splash (no flash), revealed after dismissal. |
| **2.11.3** | **Critical bug fix** — Missing `_escapeHtml` (renamed to `esc`) and `_getAgeDays` functions caused app freeze at splash and triage failure. |
| **2.11.2** | **Mobile keyboard fix** — Input bar stays visible above keyboard (visualViewport API). Black fill below bar when not focused. |
| **2.11.1** | **Zones Dropbox sync** — SOON/PAST now sync cross-device (schema v5.0). Union merge by task ID, newer `zoneChangedAt` wins. PAST capped at 100 items. |
| **2.11.0** | **Zones + Flow fix** — SOON/PAST sections (collapsed). Per-task evening triage after 8pm. Flow rate fixed: `done / total` visible tasks. PiP: delay before open, reopens on every minimize. |
| **2.10.0** | **Idle companion** — After 45s of inactivity, a random ASCII creature appears (dino, fish, bird, cat, snail, crab, or star). DM Mono, accent glow. Inspired by cli-spinners. Pure delight. |
| **2.9.9** | **All-done reward** — Finishing feels felt. Accent glow pulse, extra particle burst, double haptic, and variable warm AI messages: "8 tasks cleared. Impressive." Not gamification — just acknowledgment. |
| **2.9.8** | **Energy rhythm awareness** — AI considers peak hour when suggesting tasks. Pre-peak: "start light". Peak time: "good moment for deep work". Post-peak: "wind down with quick ones". No lecture, just smarter suggestions. |
| **2.9.7** | **Focus time formatting** — Shows "1h 25m" when >= 60 minutes, "45m" otherwise. Cleaner stats display. Applied to info panel and weekly reflection. |
| **2.9.6** | **Empty state invitation** — AI invites warmly when list is empty. Pattern-aware prompts: "Day 5. What's on your mind?" vs generic "Add a task". The void becomes an invitation. |
| **2.9.5** | **Memory speaks** — AI proactively notices patterns from memory: streak records, peak hour awareness, focus milestones, recent wins. Probabilistic with 24h cooldown per observation type. The companion observes without being asked. |
| **2.9.4** | **AI awareness** — Morning briefing (first open), stale task noticing (3+ days: "still relevant?"), Sunday evening reflection. AI acts as a companion that observes patterns. New `delete_task` action for "let it go". |
| **2.9.3** | **Visual aging** — tasks gradually fade as they age (75% at day 3-4, 55% at 5-6, 35% at 7+). Acknowledgment without action. Hover restores readability. Pomodoro resets age. |
| **2.9.2** | **Visual tags** — tasks starting with `tag: ` render the tag as muted uppercase prefix. Pure styling — no filtering, no grouping, no tag management. Pattern: 1-12 alphanumeric chars + `: `. |
| **2.9.1** | **Fix: habit sync** — edits (name changes, new habits, completions, reorder) now trigger Dropbox sync. Previously only saved to localStorage. |
| **2.9.0** | **Flow rate simplified** — now calculated live as `done / added × 100%` for today only. Resets daily. No more exponential smoothing or accumulated values >100%. Matches clean slate philosophy. |
| **2.8.9** | **PiP improvements** — Open button to return to main app from widget. iOS keyboard positioning fix (visualViewport.offsetTop). |
| **2.8.8** | **Critical fix: sync broken** — missing `localIds` variable in `mergeRemoteData()` caused silent ReferenceError. Also: immediate sync on page load (always pull→merge→push), PiP reopens on second tab leave, star button size increased, tooltip shows AI name. |
| **2.8.7** | **Bug fixes + Motion audit** — Undo toast clickable (z-index fix). Focus mode: edge nudge only if task clipped by header/footer. Motion tokens: added `--ease-spring`, aligned transitions to duration tokens. |
| **2.8.6** | **Mobile fixes + Stats sync** — Input bar stays above keyboard (visualViewport API). ✦ button single star on mobile. Stats sync across devices (focus mins, streak, flow rate). Focus time tracks actual minutes spent, not just completed sessions. |
| **2.8.5** | **Picture-in-Picture focus widget** — auto-opens when leaving tab during focus mode, auto-closes on return. Shows task name + progress bar + time. Hover reveals Breathe/Rest controls. Chrome/Edge 116+, Firefox 148+ (behind flag). |
| **2.4.0** | **Dashboard simplified** — 3 metrics only: Completed, Streak, Flow. Flow rate uses exponential smoothing (`rate × 0.85 + today × 0.15`) — rewards consistency, recent days matter more. |
| 2.3.6 | Animation simplification — `taskSlideIn` → pure fade (no transform), ✦ button → subtle opacity pulse (removed width expansion), splash → faster/tighter timing. Removed shadow-divider from mobile bar. |
| 2.3.5 | Accessibility: `prefers-reduced-motion` support — disables breathing animations, reduces transitions for users who prefer reduced motion. |
| 2.3.4 | Fade gradients on sticky header and add-task bar — content softens before clipping under chrome. |
| 2.3.3 | Motion refinement: breathing animations on proactive CTA button (`gentleBreath`) and "All done" star (`starBreath`). Motion Philosophy documented in Design.md. |
| **2.3.2** | **Token audit** — `--z-header`, `--accent-hover`, `--shadow-float`, `--shadow-divider` added. All hardcoded rgba/z-index replaced with tokens. `#trelloSection` padding-top for header clearance. |
| 2.3.1 | Proactive suggestion copy: "Nice — tidy up?" / "✦ All done" with "Tidy" / "Start fresh" buttons |
| **2.3.0** | **AI proactive suggestions** — after checking off ≥3 tasks, offers to clear done tasks. No API call, pure client-side. Auto-dismisses 12s, once per session. |
| **2.2.16** | **First interaction freeze fix** — defer heavy sync work with setTimeout(0) to yield to event loop after paint. App now responds instantly. |
| 2.2.15 | Fix intermittent null style error in splash animation — add guards for logo/dateWrap/splash/mainApp |
| 2.2.14 | Mobile drag fix: disable text selection on manual tasks (pointer:coarse) for smoother drag gestures |
| 2.2.13 | Replace deprecated apple-mobile-web-app-capable with mobile-web-app-capable |
| 2.2.12 | AI config layout redesign: input + Connect inline, status + link below, cleaner spacing |
| 2.2.11 | AI config: hide empty error banner when switching tabs or reopening panel |
| 2.2.10 | AI config: Forget button first, then "Connected" status (no checkmark, no provider name) |
| 2.2.9 | AI error handling: detect HTML responses, show human-friendly errors |
| 2.2.8 | AI config UX: Connect button disabled until input, label layout fixed, connected state inline |
| 2.2.7 | Bottom bar stroke removed (cleaner visual) |
| 2.2.6 | Header polish: remove shadow and bottom padding, progress bar flush at bottom |
| 2.2.5 | Copy revision: tonality applied throughout — "Get tasks", "Forget", "Save", "Bring back", "One moment…" |
| **2.2.4** | **Tonality** — Focus mode hints now say "breathe" / "rest". Tonality guidelines added to Design.md §2. Human language for humans, not robots. |
| 2.2.3 | Focus mode: Esc closes UI without resetting timer (keeps running in background) |
| 2.2.2 | Focus mode: kbd hint appears below timer bar, not fixed at bottom (avoids overlap with add-task bar) |
| 2.2.1 | Focus mode: click blinking timer bar to restart pomodoro (cursor:pointer on complete state) |
| **2.2.0** | **AI Post-Add Enhancement** — after adding a task, AI analyzes in background and offers to break down complex tasks into 2-3 subtasks. Non-blocking, auto-dismisses after 10s. |
| 2.1.3 | AI config: explicit hasKey check to prevent false "connected" state |
| 2.1.2 | Fix `_todayStr is not defined` — use `_habitTodayISO()` instead |
| 2.1.1 | Fix unnecessary scroll on short lists — `overflow-y: auto`, removed `min-height: 100vh` |
| 2.1.0 | AI function overhaul — all responses JSON, CORS headers, proper error handling for HTML responses |
| **2.0.9** | AI system prompt improvements — prioritize overdue tasks, suggest focus sessions, stricter output rules (≤15 words, 2-3 chips), prevent done-item suggestions |
| 2.0.8 | Fix ByteString error — strip non-ASCII chars from API key on client + server |
| 2.0.7 | Guard against HTML error responses — friendly message if Gemini/Anthropic return HTML |
| 2.0.6 | AI error clarity — specific messages (invalid key / quota / network), allow retry without reload |
| 2.0.5 | Fix AI key lost on SW reload — save before async validation, remove on failure |
| 2.0.4 | Re-add .task-copy exclusion to focus click handler |
| 2.0.3 | Fix AI key error visibility — .status-msg className handling |
| 2.0.2 | Fix task text overlapping copy button — padding-right in focus mode |
| 2.0.1 | Focus mode complete state — accent fill + pulse, "restart" label, one-click restart |
| **2.0.0** | Scroll reset on reload (scrollRestoration=manual), focus exit scrolls task into view |
| 1.9.9 | Fix Gemini 404 — model string updated to stable gemini-2.5-flash |
| 1.9.0 | Fix first-click freeze — AudioContext pre-warmed on first pointerdown/touchstart |
| 1.8.4 | Fix fake key validation — real API test call before saving, surfaces actual error message |
| 1.8.3 | Fix AI button persistent active state — was driven by key presence, now panel-open only |
| 1.8.2 | AI UX: active = panel open only, chip actions close immediately not linger |
| 1.8.1 | AI UX rethink — inline panel (no modal overlay), suggestion chips, task list stays visible |
| **1.8.0** | **AI Assistant — Gemini 2.5 Flash (free default) + Claude Haiku (private). Provider selector, Netlify proxy, structured actions.** |
| 1.7.3 | Progress bar fix | Sticky header mobile-only | Sticky add bar bottom | Viewport lock | No black strip |
| 1.7.3 | Token audit — all hardcoded colours, opacities, and spacing replaced with design tokens |
| 1.7.2 | Fix sticky header (outside .app, no overflow conflict) | Fix iOS haptics (drop switch trick, use vibrate directly) |
| 1.7.1 | Fix sticky header — full viewport width, was constrained to 680px app column |
| **1.7.0** | **Habits system** — 21-day strip, habit strength %, Dropbox sync, focus mode on habits | **Drag-to-reorder** — all three lists, desktop + mobile long-press | **PWA** — installable on macOS + iOS, offline fallback, auto-update | Rendering optimisations — GPU compositing, font smoothing, touch-action | Copy button on focused tasks | Shift+D shortcut |
| **1.7.0** | **Version bump — habits, drag-to-reorder, focus on habits, haptics, sticky header. Three missed minors corrected. Versioning rules enforced going forward.** |
| 1.6.54 | Fix iOS haptics (in-viewport switch + state tracking) | Sticky header with backdrop blur |
| 1.6.53 | Fix copy button visible on mobile — hidden globally, shown only on hover-capable devices |
| 1.6.52 | Haptics overhaul — iOS switch trick + differentiated Android patterns across 5 interaction types |
| 1.6.51 | Habit check in focus mode closes UI with same transition as tasks |
| 1.6.50 | Focus mode: cursor fixed to default | Copy button on focused tasks |
| 1.6.49 | Fix OG image paths to /assets/ | today-og.png added to SW cache |
| 1.6.48 | Housekeeping: images moved to assets/ folder, manifest + SW paths updated |
| 1.6.47 | Rendering: transition:all removed, width→scaleX, will-change, contain:layout |
| 1.6.47 | Rendering optimisations — font smoothing, touch-action, overscroll, GPU compositing for drag ghost |
| 1.6.46 | Fix drag first-grab miss — draggable set on mousedown, not after 4px movement |
| 1.6.45 | Focus mode extended to habits — click row starts Pomodoro, session count badge, full recede/focus CSS |
| 1.6.44 | Auto-update — SW polls every 60min, activates on next app focus, reloads seamlessly |
| 1.6.43 | Sound volume +60% — all gains raised, character unchanged |
| 1.6.43 | Swipe-to-complete removed |
| 1.6.42 | Mobile drag-to-reorder — long-press + touch ghost for all three lists |
| 1.6.41 | Fix text selection on drag | Fix swipe intent detection on iOS | Fix Trello card drag blocked by link element |
| 1.6.40 | Drag-to-reorder all three lists — manual tasks, Trello cards, habits |
| 1.6.39 | Fix drag TypeError — instanceof Element guard on all drag and swipe handlers |
| 1.6.38 | Drag handle removed — row itself is the drag target, grab cursor + left accent line on hover |
| 1.6.37 | Fix swipe track ✓ visible on desktop |
| 1.6.36 | Drag-to-reorder manual tasks | Swipe-right-to-complete on mobile | Shift+D clears all done tasks |
| 1.6.35 | Fix Trello refresh loop (stat_last_visit never set on first open) | Fix manual restore wiped by next-tick new-day cleanup |
| 1.6.34 | PWA manifest — installable via Safari Add to Dock or Chrome install prompt, no developer account needed |
| 1.6.33 | Offline cold start fallback — blinking ✦ replaces white screen |
| 1.6.32 | Trello overdue cards persist until checked off |
| 1.6.31 | Habit strength % replaces streak — exponential smoothing over 90 days, missing days don't zero progress |
| 1.6.30 | Done state visuals restored on load — _applyDoneStyles called from renderManual + renderTrello |
| 1.6.29 | Mobile habits: 7-dot strip, tighter padding, gap tokens | Edit mode persists after delete | Streak column alignment fixed | Empty .task.done rule removed |
| 1.6.28 | Edit mode surgical DOM patch | Midnight cleanup fresh date fix | Habits new-day reset | Future due dates hidden | Mobile done state inline styles | Sync renderManual guarantee | Splash parallel load two-flag gate | Trello refresh button removed |
| 1.6.27 | Housekeeping: SW cache synced, duplicate CSS removed, ember burst on habit check, no layout shift in edit mode, hover-only row reveal, surgical toggleHabitDone. |
| 1.6.26 | Habits Dropbox sync: union merge, deleted_habit_ids, backup schema v4.0. |
| 1.6.25 | Habits panel: 21-day dot strip with fade, streak counter, edit mode, add habit, habit done sound (heavier sibling of task complete). |
| 1.6.24 | Fix: Dropbox ticker silently failing after long absence. syncDropbox now calls _dropboxEnsureToken() before metadata fetch. |
| 1.6.23 | Top bar: Habits button (stub), Connections, About. Trello ↻ Refresh moved into config panel. Refresh button removed. |
| 1.6.22 | Chime redesigned to match sound family — three ascending sine notes then a settling fade. |
| 1.6.21 | Persistent shared AudioContext primed on session start. Chime and sounds now play when tab is in background. |
| 1.6.20 | Sound design language established. Complete task sound (warm descending two-step). Resume sound (soft rising nudge). Chime revised to low organic two-oscillator growl with beating wobble. |
| 1.6.19 | Trello tasks track pomodoro session counts (`today_trello_focus`). Counts reset on new day, same as manual tasks. |
| 1.6.18 | Focus mode: chime plays from background tab via `AudioContext.resume()`. Click completed timer resets and starts new session. Start sound on new session. |
| 1.6.17 | Trello popup-blocked error shown. Performance, bug & safety audit documented. |
| 1.6.16 | Font-family tokens applied everywhere. `--opacity-dim` corrected to 0.25. Opacity scale tokenised. `Shift+;` focuses add input. All-done empty state: ✦ All done for today. Section headers: count leads, no dot, no pill. Design.md restructured. |
| 1.6.15 | Focus mode: dismiss pauses, click resumes. `paused` flag added. Checkbox during focus logs partial session. `--dur-mid` token. Delete button vertically centred. |
| 1.6.14 | Focus mode (Pomodoro) — 25min sessions, timer bar, recede animation, chime, session count `N 🍅` |
| 1.6.13 | Fix new-day cleanup: done tasks now cleared correctly. Runs after Dropbox restore. `_todayStr` cached in memory |
| 1.6.12 | Union merge sync: `deleted_ids`, `checked_ids`, `unchecked_ids` with timestamps. Backup schema v3.0 |
| 1.6.11 | Favicon ✦ redesign: ring fills with progress. Scrollbar hidden. Uncheck neutral |
| 1.6.10 | Self-hosted fonts: SW-cacheable, works offline. Null crash fix in splash |
| 1.6.8 | All spacing tokenised, no hardcoded px outside `:root` |
| 1.6.7 | Housekeeping: circular tokens, ghost vars, dead sync writes, SW accent |
| 1.6.6 | Offline SW cache, persistent mutation tracking, backup-first reconnect |
| 1.6.5 | iOS Safari popup fix, session expired UX cleanup |
| 1.6.4 | Dropbox reconnect UX, Netlify functions, spacing polish |
| 1.6.3 | Design system tokens, iOS safe-area, GPU animations, dev hours tracker |
| 1.6.2 | Battery/mobile optimisation, splash DOM cleanup, theme-color |
| 1.6.1 | Trello card update animations, surgical DOM diff |
| 1.6.0 | Dropbox PKCE OAuth, Netlify functions |
| 1.5.2 | Dropbox expired token detection, accurate UI state |
