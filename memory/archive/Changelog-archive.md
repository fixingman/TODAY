# Changelog Archive

> Older entries archived from `Changelog.md` (rolling 20-version window).

| Version | Key change |
|---|---|
| **2.16.1** | **Fix: Splash on every mobile return** — `sessionStorage` cleared when iOS kills PWA page. Switched to `localStorage` with date key (`splash_shown_date`). Shows at most once per calendar day. |
| **2.16.0** | **Fix: BUG-017 — focus minutes only on full completion** — `_trackFocusTime` only called when `doResetState=true`. Escape, task-switch, and early close lost all minutes. Removed the condition — now tracks on every `closeUI`. |
| **2.15.9** | **SOON list alphabetical sort** — `renderSoon` sorts a shallow copy by `localeCompare`. Array order preserved for sync. |
| **2.15.8** | **Habit hot threshold 80%** — accent highlight raised from ≥70% to ≥80%. |
| **2.15.7** | **Fix: BUG-006 v3** — `_focusReanchor` only re-attached when element reference changed. Trello patch path repositions with `insertBefore`. Added check: also re-attach if `timerEl.previousElementSibling !== newTaskEl`. |
| **2.15.6** | **Fix: AI Sonnet inconsistencies** — `break_down` chips show actual step text. System prompt: banned mid-conversation openers and colon syntax in chip labels. |
| **2.15.5** | **Fix: BUG-014 — PiP not reappearing after restore** — `_pipRestoredFromButton` flag keeps PiP alive when user taps "open app" in PiP. Next minimize reuses existing window. |
| **2.15.4** | **AI suggestion history in context** — `_memoryForAI()` now includes past suggestions with action taken. |
| **2.15.3** | **AI aging task chips deterministic** — chips pre-set by app, not AI. 7+ days: "Break it down" + "Let it go". 3-6 days: "Park for later" + "Do it now" + "Let it go". |
| **2.15.2** | **Fix: AI repeats same aging task** — `suggestionCooldowns` pruning now includes `trelloTasks`. Trello task cooldowns no longer deleted nightly. |
| **2.15.1** | **AI upgraded to Claude Sonnet** — `claude-haiku-4-5-20251001` → `claude-sonnet-4-5`. |
| **2.15.0** | **Habit strength: asymmetric smoothing** — `alpha_down=0.97` (miss penalty much softer). 30-day streak miss: was 10% drop → now 3%. |
| **2.14.9** | **Fix: BUG-013 — focus timer jumps** — `st.wallStart += 1000` on every `tickFor` tick prevents double-counting between tick and wall-clock correction. |
| **2.14.8** | **Fix: BUG-006 regression** — Added `_focusReanchor()` to end of `renderTrello()`. v2.14.5 BUG-012 fix added standalone `renderTrello()` call in `mergeRemoteData` with no reanchor. |
| **2.14.7** | **Fix: Triage summary font** — Syne → DM Mono `--text-lg` weight 500. Syne all-caps/numbers only (Rule 27). |
| **2.14.6** | **Fix: Triage bar disappears on mutation** — `_triageBarShown` flag. Once bar appears, mutations no longer hide it. |
| **2.14.5** | **Fix: BUG-012 + in-app changelog catch-up** — `mergeRemoteData` re-filters `trelloTasks` after `doneIds` update. In-app CHANGELOG gap fixed (v2.13.7–v2.14.5). |
| **2.14.4** | **Triage summary redesign** — Syne 28px headline with full stop. Adaptive sub-line (max 2 parts). Triage breakdown removed. |
| **2.14.3** | **Error log panel** — Replaced `alert()` with panel anchored to red dot. No backdrop. Dot toggles open/close and clears log. |
| **2.14.2** | **Red dot cleanup** — `background: #ff4444` → `var(--danger)`. `window.onerror` labels external errors with `[external]` prefix. |
| **2.14.1** | **BUG-003 gap fix** — `unhandledrejection` had no network error filter. Added same filter as `_logSyncError`. |
| **2.14.0** | **Triage bar cross-device flash** — `_triageBarSilent` flag set for 3s on wake. Prevents ticker showing bar before sync settles. |
| **2.13.9** | **Hotfix: AI button broken** — Missing `}` on `.ai-provider-badge` CSS broke all CSS below including `#aiPanel`. |
| **2.13.7** | **Triage summary legibility** — `#triageComplete` flex column. `.triage-complete-msg` / `.triage-complete-detail` / `.triage-complete-breakdown` structure. |
| **2.13.6** | **Fix: PiP chime sync** — PiP RAF calls `completeFor()` directly at wall-clock zero. Guard added: `if (!st.running) return`. |
| **2.13.5** | **Fix: PiP timer lag** — PiP rewrote to own RAF loop with fixed reference point (`refTime + refRem`). Independent of main tab tick rate. |
| **2.13.4** | **Fix: Red dot on network loss (BUG-003)** — `_logSyncError` detects network errors and suppresses red dot. |
| **2.13.3** | **Delete button click target** — padding increased. Easier to hit on desktop. |
| **2.13.2** | **Fix: Triage bar (BUG-007 rewrite)** — `_triageActive` boolean flag replaces fragile overlay class checks. |
| **2.13.1** | **Day-end review + morning reflection** — Contextual acknowledgment. Stats line. Morning nudge enhanced with yesterday's data. |
| **2.13.0** | **AI personality overhaul** — Deterministic rotation, 3 new action types, energy/habit/time awareness, widened observation triggers. |
| **2.12.79** | **Link extraction** — URLs extracted from task input, stored as `task.url`, rendered as ↗. Domain used as display text for URL-only input. |
| **2.12.78** | **Unified internal clock** — `_localISO(d)` helper. All `toISOString().slice(0,10)` replaced with local-time equivalents. |
| **2.12.77** | **Fix: Habit rollover timezone** — `_habitTodayISO()` and date helpers switched to local date formatting. |
| **2.12.76** | **Drag fix robustness** — Exponential backoff retry. `visibilitychange` retry routed through `_scheduleBackup`. |
| **2.12.75** | **Cleanup** — Removed 15 unused cached elements. Fixed 1am shifts in date header + splash. |
| **2.12.74** | **Day boundary unified** — Tasks, triage, habits all roll over at midnight. Triage window 8pm–midnight. `checkNewDay()` called immediately on `visibilitychange`. |
| **2.12.73** | **Fix: Task aging opacity (BUG-009)** — `data-age-bucket` attribute (young/mid/old) replaces fragile string matching. |
| **2.12.72** | **Fix: Drag jump-back (BUG-008)** — `syncDropbox` returns early if `_pendingBackup === true`. Pull waits for upload first. |
| **2.12.71** | **Red dot clears on click** — `_errorLog` emptied, dot hidden on click. |
| **2.12.70** | **Error log timestamps** — `HH:MM:SS` prefix via `_fmtErrTime()`. |
| **2.12.69** | **Fix: Triage bar flash** — `checkTriageBar` returns early when overlay is open. |
| **2.12.68** | **Fix: Triage bar flashes after summary** — `triageDismissedToday` set immediately in `triageApplyAll()`. |
| **2.12.67** | **Trello error handling** — 405/429 status messages. Background errors route to `_logSyncError`. |
| **2.12.66** | **Fix: Blank task list + Trello badge (BUG-004 + BUG-005)** — removed `contain: layout style`, repaint targets `#main-app`, session badge in `newText` comparison. |
| **2.12.65** | **Fix: Focus timer splits (BUG-006)** — `_focusReanchor()` re-attaches timer after `renderManual()` DOM rebuild. |
| **2.12.64** | **Fix: Session count jump** — `_logSession` removed from "again?" click. Sessions only logged on completion or check. |
| **2.12.63** | **Tags on Trello tasks** — patch path detects `tag:` prefix. Copy strips `.task-tag`. |
| **2.12.62** | **Code cleanup** — Dead functions removed. `renderConnections()` skips rebuild when panel closed. |
| **2.12.61** | **Fix: `dropboxUpdateUI` undefined + wake sync silent** — 8 call sites updated. `_wakeSyncSilent` flag suppresses errors in first 3s. |
| **2.12.60** | **Fix: Triage cross-device** — `checkTriageBar()` deferred 3s on tab return. |
| **2.12.59** | **Fix: Sync on return** — Immediate `syncDropbox()` on tab return. Rev baseline reset to `null`. |
| **2.12.58** | **Fix: Sync errors visible** — All catch blocks route through `_logSyncError()`. Token refresh retries once. |
| **2.12.57** | **Fix: Task list blank (BUG-004)** — Forced repaint on `visibilitychange`, `window.focus`, `pageshow`. |
| **2.12.56** | **Fix: Trello session count (BUG-005)** — Session count update added to `renderTrello` patch path. |
| Older | See git history for pre-v2.12.56 changes. |
