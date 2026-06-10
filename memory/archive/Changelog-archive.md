# Changelog Archive

> Older entries archived from `Changelog.md` (rolling 20-version window).

| Version | Key change |
|---|---|
| **2.17.52** | **Fix: BUG-025 extension + habit checkmark** — (1) PiP `visibilitychange` restore path always syncs PiP including done sessions; `st.rem<=0` guard moved to hide-only path so sleep/wake correctly shows "Again". (2) `pipTick` running branch now updates PiP display immediately on completion (was stopping RAF before done-state could render). (3) `syncDisplay` re-applies `.complete` state instead of overwriting `again?` with `00:00`. (4) Habit checkmark: `color: var(--bg)` added so `stroke=currentColor` matches task checkmark. |
| **2.17.51** | **Fix: CSS token audit** — `@keyframes errorPulse` and `dotRipple` now use tokens (`--color-danger-pulse`, `--color-accent-check`) instead of hardcoded rgba. CHK SVG `stroke` changed from `#0e0e10` to `currentColor` (inherits `color: var(--bg)` from `.task.done .task-check`). |
| **2.17.50** | **Fix: `_onWake` animation audit** — `_forceRepaint()` now suppresses all persistent animations (`.ai-badge`, `.done-star`, `#errorIndicator.open`, `.loading-dots span`, `.ai-suggestion-msg.thinking`) matching the BUG-023/025 pattern. Single-play classes (`.task-slide-in`, `.removing`, `.just-checked`, `.milestone-pulse`, `.dot-ripple`, `#manualEmpty.fading-in`) cleared once on wake. `_clearStaleFocusing` guards against the re-anchor race via `window._focusUIActive` flag set in `openUI`/`closeUI`. Offline panel state re-applied on wake. |
| **2.17.49** | **Fix: BUG-025 + re-open stuck at 00:00** — (1) `_forceRepaint()` now suppresses `.complete` animation on each `display:none/block` pass, same as BUG-023 did for panels; animation restored after the final 1500ms pass. (2) `openUI()` calls `clearState(taskId)` when the session is done (`rem=0 && !running`), so re-opening a completed task shows fresh 25:00 instead of frozen 00:00. |
| **2.17.48** | **Fix: BUG-024 true root cause** — `applyNewDayCleanup()` had an early `return` when `stat_streak_date` already matched today (the BUG-020 fix). This silently skipped the focus-minutes reset whenever another device had synced the streak first. Restructured so only the streak increment is conditional — daily counter reset always runs. |
| **2.17.47** | **Fix: PAST 100-task cap removed** — sync merge no longer slices to 100 after union. Only retention limit is `_purgePast()` age-based expiry: done tasks >7d, let_go/aged tasks >30d. |
| **2.17.46** | **Fix: BUG-024 focus minutes carry (complete fix)** — backup payload fallback for `stat_focus_mins_date` was `_getAppDay()`, meaning users without the key in localStorage (upgrading from pre-v2.17.44) got today's date stamped on stale minutes, bypassing the date guard. Fallback changed to `''` so the guard rejects unknown-date data and treats remote minutes as 0. |
| **2.17.45** | **Feat: PiP CTAs visible on session complete** — `pip-bar` gains `.complete` class when `_pipDone = true` (set in both `_pipSync` and `pipTick`). CSS `.pip-bar.complete .pip-controls { opacity:1 }` keeps controls permanently visible after completion, no hover required. Cleared on Again restart. |
| **2.17.44** | **Fix: BUG-024 focus minutes carry across day boundary** — `stat_focus_mins_date` was always generated as `_getAppDay()` in the backup payload, even when the stored minutes were from yesterday. On Day 2 startup: pre-cleanup backup stamped yesterday's minutes with today's date → next sync's date guard passed → `Math.max(0, 90) = 90` restored. Fix: save `stat_focus_mins_date` to localStorage whenever minutes are earned or reset, so the backup date reflects when minutes were actually accumulated. |
| **2.17.43** | **Fix: PAST count stuck at 100** — `mergeRemoteData()` now calls `_purgePast()` immediately after the union+100-cap, so age-expired items (done >7d, let_go/aged >30d) are removed rather than resurrected from the Dropbox backup on every sync tick. |
| **2.17.42** | **Feature: Offline mode** — AI CTA (`#addAiBtn`) switches to `✧` + `.offline` class (muted style, pointer-events none) when `navigator.onLine` is false. Connections panel gets `.offline-banner` above `#connectionsContainer` and all panel buttons + AI key input are disabled. `_applyOfflinePanel()` helper toggles state. Wired to `online`/`offline` events and applied on `init()`. Restored on reconnect. |
| **2.17.41** | **Style: version-badge ghost** — changed from solid `--accent` fill + `--bg` text to `--accent-dim` bg + `--accent-glow` border + `--accent` text. Quieter, token-native. |
| **2.17.40** | **Style: CSS token audit** — all hardcoded hex/rgba eliminated outside `:root`. New tokens: `--color-highlight-dim` / `--color-highlight-border` / `--color-muted-dim`. Error-panel badges now use tokens. PiP injected stylesheet gets its own `:root` block with `--pip-*` literals (PiP is a separate document and cannot inherit parent vars). Idle companion: removed redundant `#c8f060` fallback from `var(--accent)`, replaced `rgba(200,240,96,0.3)` text-shadow with `var(--color-accent-glow)`. |
| **2.17.39** | **Fix: PWA launch dim green flash** — `manifest.json` `background_color`/`theme_color` was `#161a14` (breathe overlay tint, dark green cast), mismatching the app's `#0e0e10` background. Chrome shows the manifest colour as a native splash before the page paints. Both aligned to `#0e0e10`. |
| **2.17.38** | **Fix: Changelog alignment in About panel** — current entry restructured to same flex layout as old entries (version left, body right) so text left-edges align. Old entries get `v` prefix. Text split corrected from `,` to ` \| ` delimiter. |
| **2.17.37** | **Fix: BUG-023 top panels flash on desktop PWA restore** — `_forceRepaint()` `display:none/block` restarted CSS `fadeIn` animation on open panels (Habits/Connections/About) every repaint pass (500ms + 1500ms = two visible flashes). Fix: suppress `animation` inline after each repaint; clear inline style on next user-open so fadeIn still plays. |
| **2.17.36** | **Fix: BUG-022 focus fill bar pulsates during countdown** — `.complete` class left stranded on shared `fillEl` by two paths: PiP "Again" handler (v2.17.35) and `closeUI(false)` on task-switch. Fixed in PiP "Again" (clears classes + resets fill display) and `openUI` (strips `.complete` before `syncDisplay`). |
| **2.17.35** | **Fix: PiP froze at 00:01** — `pipTick` paused-branch now detects completion (`rem=0 && !paused`): shows `00:00`, fills bar, switches Breathe→Again, stops RAF. "Again" restarts session. `_pipSync` also triggers completion UI on window restore. |
| **2.17.34** | **Delight: Micro interactions** — (1) Checkmark stroke-draw: SVG `stroke-dashoffset` 13→0 on check (150ms, `.just-checked` class). (2) Streak milestone pulse at 7/14/30/60/100d: stat value dims then returns (600ms). (3) Habit consecutive-run dot cascade: box-shadow ripple left→right across run, 40ms stagger, 320ms each. |
| **2.17.33** | **Fix: Undo delete position** — task restored to its exact original slot. `deleteManual` captures array index; `_undoDelete` splices back at that index (falls back to end if out of bounds). |
| **2.17.32** | **Fix: Undo delete placement** — restored task now appended at bottom of list instead of top. |
| **2.17.31** | **Fix: Changelog bullet dots** — removed `·` decorators from expanded current-version entries. Lines now display flush and consistent with old-entry style. |
| **2.17.30** | **Style: AI panel input** — font-size `--text-sm` → `--text-md` (11px → 14px, matches task input). Placeholder `opacity:0.5` removed. |
| **2.17.29** | **Fix: BUG-019/021 splash explosion** — Strip DPR from canvas (CSS px direct, matches `celebCanvas`). Restore v2.1.0 dismiss structure: burst → 180ms → fade → canvas removed at 630ms. Explosion plays over fading splash. Removes `_sBurstComplete` + 2s premature-cancel timeout. Total splash ~2.2s restored. |
| **2.17.28** | **Fix: Splash gate timeout symmetry** — `_splashAnimDone` now has the same 6s safety timeout as `_appLoadDone`. A stalled typewriter rAF (tab hidden on iOS PWA launch) can no longer freeze the splash from the animation side. |
| **2.17.27** | **Fix: Splash animation reliability** — `sctx.scale()` was accumulating on every resize event, making the transform `dpr²` after first resize and corrupting all drawing coordinates. Replaced with `sctx.setTransform()` which resets each call. Added 6s safety timeout on the two-flag splash gate so a stalled Dropbox token fetch can no longer freeze the splash permanently. |
| **2.17.26** | **Fix: BUG-020 streak double-counts across devices** — added `stat_streak_date` guard (YYYY-MM-DD local). `checkNewDay()` skips increment if streak was already bumped today. Merge adopts newer date from remote. Full restore also restores `stat_streak_date`. |
| **2.17.25** | **AI: Observation-first rewrite** — system prompt rewritten from task-manager framing to companion-that-notices. Available chips reduced to `start_focus`, `check_habit`, `add_task`, `reflect` (rare), `dismiss`. Max chips 1–2 (was 2–4). Message cap 25 words. Aging chip tiers simplified: 7+ days → park or let go (removed break-down); 3–6 days → start or park (removed let-go). |
| **2.17.24** | **Fix: BUG-004 recurrence** — blank UI on return when focus timer completed in background. `timerCompletePulse` (infinite CSS animation) created a GPU compositor layer while tab was hidden; on restore, layer rendered at wrong position masking tasks. Fix: toggle `animationPlayState` on restore to destroy/recreate the layer. Also: `_clearStaleFocusing` extended to 1000ms, `_forceRepaint` pass added at 1500ms. |
| **2.17.23** | **AI: Conversation threading** — `_aiThread` accumulates message history per session. Intro message seeds the thread; each user/assistant exchange appends. Thread cleared on panel close. Enables genuine back-and-forth without re-stating context. |
| **2.17.22** | **AI: No task chips on conversational questions** — system prompt rule added: if user's message is a question/reflection/chat (not asking for task help), AI returns only a dismiss chip, no task actions. |
| **2.17.21** | **Fix: Splash overhaul** — white flash fixed; animation sequence enforced (typewriter→explosion→tasks); canvas DPR bug fixed; dark pause removed; explosion loop stops on visual completion. `_appReady` fixed in no-splash path. |
| **2.17.20** | **Fix: BUG-019 — star explosion not visible on mobile** — canvas removed too early (T+630ms). Now removed 500ms later so explosion plays over the appearing app. |
| **2.17.19** | **Splash fixes** — typewriter switched to `requestAnimationFrame`. Canvas made DPR-aware. |
| **2.17.18** | **Fix: Syntax error crashing app** — `const today` declared twice in `mergeRemoteData` scope. App crashed before splash completed. Replaced with inline `_getAppDay()` call. |
| **2.17.17** | **Fix: `_appReady` timing** — was set at end of `init()` (~50ms) but splash shows 2-3s. Now set inside splash dismiss callback. `_onWake()` safely blocked until splash is fully gone. |
| **2.17.16** | **Fix: Focus mins restore gap** — full Restore path (Dropbox Connections panel) lacked date guard. Added same check as `mergeRemoteData`. Test-matrix 73→77 tests. |
| **2.17.15** | **Fix: Focus time carries over to next day** — `mergeRemoteData` used `Math.max(local, remote)` for `stat_focus_mins_today`. Added `stat_focus_mins_date` guard to backup. |
| **2.17.14** | **Fix: White screen before splash on PWA open** — `window.focus` triggers `_onWake()` during splash. Added `_appReady` flag; `_onWake()` returns immediately if not ready. |
| **2.17.13** | **Perf** — 11 raw `JSON.parse(localStorage...)` → `safeJSON()`. 2 `transition: all` → specific properties. AI system prompt trimming deferred to Backlog. |
| **2.17.12** | **Perf** — in-app `CHANGELOG` trimmed from 235→3 entries. ~10KB saved on every page load. |
| **2.17.11** | **AI conversation memory** — last AI message saved to `appMemory.recentConversations`. Last 3 sessions in memory context. Max 5 sessions, 200 char cap. Synced via Dropbox. |
| **2.17.10** | **Copy** — section counts moved after labels. SOON pull button: `← grab` → `← pull in`. |
| **2.17.9** | **Fix: Phantom SOON tasks reappear after day** — `mergeRemoteData` excluded `pastTasks` IDs from SOON merge. |
| **2.17.8** | **Fix: Scroll resets on app return** — `_forceRepaint()` `display:none` cleared scroll. Now saves/restores all list `scrollTop` + `window.scrollY`. |
| **2.17.7** | **UI: Focus mode checkbox fill removed** — `::before` fill on `.task-check`/`.habit-check` removed. Checkbox stays clear during focus. |
| **2.17.6** | **AI multi-task actions** — `move_soon` and `delete_task` accept `ids` array. |
| **2.17.5** | **Fix: AI chip acts on wrong task** — `_aiSetChips` now resolves task name from payload ID and appends to label so user sees which task is affected. |
| **2.17.4** | **Fix: `break_down` deletes original task** — secondary AI call used full system prompt (including `delete_task`). AI returned `delete_task` for the original alongside subtask chips. Fix: `break_down` uses minimal direct fetch with restricted system prompt (`add_task` only) + client-side filter strips any non-`add_task` actions. |
| **2.17.3** | **Fix: AI errors** — (1) Gemini 2.5 Flash thinking mode causes 15-30s responses, exceeding Netlify 10s timeout → `thinkingBudget: 0` added. (2) Claude model was `claude-sonnet-4-5` (old) → updated to `claude-sonnet-4-6`. Old model returns intermittent 500s under larger context. |
| **2.17.2** | **Fix: `ReferenceError: syncDropbox` in `_aiExecute`** — `syncDropbox()` is private to the Dropbox sync closure. `_aiExecute` (global scope) called it directly when adding a task via AI chip. Replaced with `_setLastLocalChange()` + `dropboxAutoSave()` — the correct public API for all mutations. |
| **2.17.1** | **Fix: BUG-004 — blank after long sleep (clicking restores)** — synchronous repaint trick (`display:none/offsetHeight`) fires before GPU compositor layers are ready after hours of sleep. Now runs repaint at: immediate + rAF + second rAF + 500ms deferred. Covers full GPU warmup window. |
| **2.17.0** | **Refactor: `_onWake()` consolidation (minor bump)** — repaint, `.focusing` cleanup (immediate + 350ms deferred), `checkMorningNudge()`, triage silent window, pending backup all in `window._onWake()`. Called from 3 entry points: sync module `visibilitychange`, `window.focus` (PWA fallback), `pageshow` (bfcache). SW update, timer wall-clock, PiP handlers stay in their closures. Also fixes: returning users after overnight now correctly see morning nudge. |
| **2.16.21** | **Fix: BUG-004 continued** — v2.16.20 immediate check missed the async gap. `renderManual()` destroys `.focused` element; `_focusReanchor` re-attaches 10-100ms later. During that window: `.focusing` on but no `.focused` → 7% opacity → blank screen. Added 350ms deferred `_clearStaleFocusing()`. |
| **2.16.20** | **Fix: BUG-004 regression** — `.focusing` class cleared on `pageshow` but not on `visibilitychange`. Added cleanup: if `.focusing` set but no `.focused` element in DOM, clear it. |
| **2.16.19** | **Fix: BUG-014 — PiP manual restore path** — `_hadPiP` flag added; on restore, reopen PiP using dock-click gesture. `_hadPiP` cleared on explicit close or focus end. |
| **2.16.18** | **Copy audit** — README rewritten with "What it deliberately doesn't do" section. AI prompt: TODAY design philosophy block added. Info panel title humanised. |
| **2.16.17** | **Emergent vs planned insight** — `appMemory.patterns.lateAdditions` tracks hour of each task addition. `dayStartCount` snapshotted at midnight. After 10+ data points, AI notices reactive vs intentional patterns. |
| **2.16.16** | **AI: energy-aware + soft cap** — Energy suggestions name specific tasks tied to the moment. `LIST_HEAVY` flag at 6+ tasks. |
| **2.16.15** | **Task link UX overhaul** — Trello: `link ↗` → `↗` only. Manual: URL inline in `task.text`. |
| **2.16.14** | **Connections panel** — AI key status inline on one line. |
| **2.16.13** | **Token audit** — `--accent-glow` alias added to `:root`. |
| **2.16.12** | **Fix: Trello loading flash** — `hasCachedTasks` check added; API update silent when cache rendered. |
| **2.16.11** | **Fix: Splash not showing on desktop PWA reopen** — 30-minute timestamp guard (`splash_shown_at`) replaces date-key guard. |
| **2.16.10** | **Task link UX** — `↗` → `link ↗`. Copy CTA appends `task.url`. |
| **2.16.9** | **Fix: BUG-011 ghost chime** — `clockTaskId` captured by value; RAF stops if `uiTaskId !== clockTaskId`. |
| **2.16.8** | **AI context** — message word limit 20→30 words. Added: name the task in the message. |
| **2.16.7** | **Fix: Splash click-through** — `pointer-events: none` → `pointer-events: all`. |
| **2.16.6** | **Fix: BUG-007 mobile** — `triageMinimize()` now calls `triageClose()` if `triageDismissedToday` true. |
| **2.16.5** | **Fix: BUG-012 continued** — both `loadTrello` filter and `mergeRemoteData` check `today_checked_ids` timestamp. |
| **2.16.4** | **Perf + safety** — `today_trello_focus` hoisted. All related reads use `safeJSON()`. |
| **2.16.3** | **Fix: SW update error in red dot** — "Failed to update a ServiceWorker" added to network error filter. |
| **2.16.2** | **Splash cursor hold** — reduced from 800ms to 500ms. |
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
