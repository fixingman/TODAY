# TODAY — Performance & Security Audit
> v2.12.79 · April 2026  
> Runtime performance, security posture, and privacy review.
> Test cases: See `Test-matrix.md`

---

## 1. Bundle & Load

| Metric | Value | Notes |
|---|---|---|
| Total file size | 452 KB | Single HTML file — no build step |
| Lines of code | 10,517 | +30 since v2.12.74 (link extraction, unified clock, retry logic) |
| Functions | 219 | +1 (`_showErrorLog`) |
| Variables | 1,123 | const/let/var declarations |
| Event listeners | 58 | +1 (`window.focus` for PWA repaint/sync) |
| External scripts | 0 | No CDN, no analytics SDK |
| External fonts loaded on first visit | 6 files | Self-hosted, pre-cached by SW after first load |
| External fonts on repeat visits | 0 | All served from SW cache |
| Google Fonts requests | 0 | Fonts are self-hosted — zero external pings |

**Assessment:** File size grew from 433KB (v2.12.47) to 452KB (v2.12.79) — sync hardening, error handling, wake/sleep logic, focus reanchor, triage flash fix, drag race fix, age bucket refactor, midnight boundary alignment, unified clock, link extraction. Removed `contain: layout style` (was causing paint deferral). Fixed Trello patch path innerHTML thrashing (was rewriting every 7s). No minification — acceptable for a single-file project. All loads after first are fully offline-capable.

---

## 2. Runtime Performance

### DOM Query Optimization
| Metric | Count | Notes |
|---|---|---|
| Total DOM queries | 246 | getElementById + querySelector |
| Cached element usage | 68 | Via `$.element` pattern |
| localStorage accesses | 225 | Many are writes on user action |

**Opportunity:** ~178 uncached DOM queries. Most are in render functions (acceptable) or one-time init. Further caching would add complexity for minimal gain.

### Optimizations (v2.12.5+)
- **Cached DOM elements:** 26 frequently-queried elements cached at startup (`$` object)
- **Global `safeJSON()` helper:** Consolidates 10+ inline try/catch JSON parsing patterns
- **Mobile input bar (v2.12.36):** Uses GPU-accelerated `transform: translateY()` + `requestAnimationFrame` for smooth keyboard tracking

### Ticker (every 7s)
- `syncAll()` runs `_refreshSyncCache()` (2 localStorage reads), then `checkNewDay()`, `syncTrello()`, `syncDropbox()`.
- `_refreshSyncCache()` batches all localStorage reads into a single pass per tick.
- `syncTrello()`: fetches board `dateLastActivity` only (~1 KB). Full card fetch only if `date !== lastTrelloDate`.
- `syncDropbox()`: fetches file metadata only (~300 B). Full download only if `rev !== lastDropboxRev`.
- Ticker stops on `visibilitychange hidden`. On return: sync fires immediately, ticker resumes after 2s. Wake errors silenced for 3s (no red dot for transient network failures).

### Dropbox Sync Error Handling (v2.12.58+)
- **`_logSyncError(source, msg)`:** Routes sync failures to red dot error indicator + console. Tagged by source: Dropbox, Trello, Sync.
- **Token refresh retry:** `_dropboxEnsureToken()` retries once with 2s backoff (Netlify cold starts).
- **Wake sync silent:** `_wakeSyncSilent` flag suppresses red dot for 3s after tab return — transient network failures after sleep don't alarm user. Ticker retries handle recovery.
- **Silent catches remaining (4):** storage full, cross-origin poll, non-critical rev seed, offline reconnect fallback — all acceptable.
- **Pending backup tracking:** `_pendingBackup` flag tracks unsaved changes, retries on tab focus.

### DOM rendering
| Operation | Strategy | Notes |
|---|---|---|
| Initial manual task list | Full re-render (`list.innerHTML`) | Only runs once on page load |
| Add manual task | Incremental — `appendChild` | No list re-render |
| Delete manual task | Incremental — `el.remove()` | Animation first, DOM removal after 180ms |
| Trello task list (sync) | Diff patch | Text, badge, done state patched individually |
| Section counts | `textContent` writes via cached `$.manualCount` | Direct, no query |
| Empty state | `textContent` + `display` toggle | Uses cached `$.manualEmpty` |
| Favicon | Key-gated canvas redraw | 21 possible states max, redraws only on state change |

### Memory
- Ticker uses a single `setInterval` reference (`ticker`), cleared on hide.
- Focus mode: `taskStates` map holds one entry per active task — cleared on `esc` / task switch.
- PiP window: single reference, properly cleaned up via `pagehide` event.
- Celebration particles: two canvas systems (celeb + splash), RAF loops exit when idle.
- AudioContext: single shared context, reused across sounds.
- AI state: `_aiCurrentSuggestion` holds one reference, cleared on dismiss.
- Triage history: capped at 50 entries, oldest removed on overflow.
- PAST zone: auto-purged (done: 7 days, let_go/aged: 30 days).

### setTimeout/setInterval inventory (61 total)

**setInterval (persistent):**
| Interval | Purpose | Notes |
|---|---|---|
| 7s | Background sync ticker | Cleared on tab hide |
| 5s | Idle companion check | Runs continuously |
| 500ms | Trello auth poll | Only while OAuth popup open |
| 500ms | Dropbox auth poll | Only while OAuth popup open |
| 30min | SW update check | Runs continuously |

**setTimeout (single-fire):**
| Duration | Purpose |
|---|---|
| 0ms | Defer heavy sync on load, AI config render |
| 30–100ms | Panel transitions, input focus delays |
| 160–200ms | Animation timing (checkbox pulse, remove, focus cleanup) |
| 500ms | Splash font timeout fallback |
| 600ms | AI reload after action |
| 800ms | Dropbox autosave debounce, status message auto-hide |
| 1000ms | Dropbox retry on tab focus, focus tick, PiP delay |
| 1800ms | Config panel auto-close after Trello connect |
| 2000ms | Ticker resume after show/online, AI analyze debounce, token refresh retry |
| 3000ms | Wake sync silent window, triage check defer (BUG-001) |
| 12000ms | Proactive suggestion auto-dismiss |

No runaway timers. All single-fire timers are purpose-built and short-lived.

---

## 3. Security

### XSS
- `esc()` escapes `&`, `<`, `>`, `"` before any user content enters `innerHTML`.
- **All user-controlled content goes through `esc()`:** task.text, task.url, dueStr (Trello), board/list names.
- `task.url` validated with `/^https?:\/\//i` before use as `href` — prevents `javascript:` URLs.
- No `eval()`. No `new Function()`. No dynamic script injection.

### CSRF / OAuth
- Dropbox PKCE: `state` parameter generated and stored in `sessionStorage`, verified on callback.
- `sessionStorage` PKCE keys cleared immediately after exchange.
- Trello OAuth uses standard redirect flow. Token scope: `read` only.

### API keys
- `DROPBOX_APP_KEY` is client-visible — expected for PKCE OAuth (public client).
- App secret lives only in Netlify env vars (`DROPBOX_CLIENT_SECRET`).
- `TRELLO_APP_KEY` is client-visible — standard for Trello's OAuth model.
- AI API keys stored in localStorage, sent only through Netlify proxy function.

### Missing: Content Security Policy
- No CSP `<meta>` tag or header. Inline-heavy single-file app makes strict CSP difficult.
- **Low priority for personal tool.**

---

## 4. Privacy

- **No analytics in app code.** No user events, task content, or identifiers sent anywhere.
- **Netlify RUM** may be injected server-side (page-load timing only). Ad blockers prevent it.
- **Task content never leaves the device** except via explicit Dropbox sync to user's own account.
- **Triage history** stays local (50 entries max) — used only for AI hint patterns.
- Trello tokens scoped to `read` only.
- **No cookies set by app code.**

---

## 5. Test Coverage

> **All test cases moved to `Test-matrix.md`** — comprehensive test matrix with 71 cases covering sync, UI, security, zones, habits, and edge cases.

---

## 6. Known Issues & Gaps

| Issue | Severity | Notes |
|---|---|---|
| No CSP header | Low | Personal tool, inline styles/scripts |
| `localStorage` quota failures silent | Medium | Saves fail without feedback |
| `stat_alltime_done` increments on re-check | Low | Cosmetic stat inflation |
| Focus mode not on touch devices | By design | Documented in Design.md |

---

## 7. Summary Scorecard

| Area | Score | Notes |
|---|---|---|
| Load performance | ✅ Good | 452KB single file, fonts cached, offline-capable |
| Runtime performance | ✅ Good | Cached elements, cheap ticker, incremental DOM |
| XSS protection | ✅ Good | `esc()` on all user content |
| CSRF protection | ✅ Good | PKCE state verified |
| Privacy | ✅ Good | No analytics, data stays local |
| Error handling | ✅ Good | `_logSyncError` routes sync failures to red dot. Wake errors silenced 3s. 4 remaining silent catches are non-sync (acceptable). |
| Offline support | ✅ Good | SW cache, union merge, backup-on-reconnect |
| Token hygiene | ✅ Good | Secrets server-side only |
| Animation performance | ✅ Good | CSS animations, GPU compositing, rAF batching |
| CSP | ❌ Missing | Inline scripts/styles make it complex |

---

## 8. Recent Changes (v2.12.48 → v2.16.12)

| Feature | Version | Performance Impact |
|---|---|---|
| Sound delay fix | 2.12.48 | Immediate playback — no AudioContext promise wait |
| PiP closes on restore | 2.12.49 | Cleanup only — no runtime cost |
| Triage z-index | 2.12.50 | CSS only |
| Done Trello in triage | 2.12.51 | Re-check after sync — minor |
| SOON/PAST ghost tasks | 2.12.52 | Timestamp check in merge — O(n) |
| Trello done next day | 2.12.53 | `checked_ids` timestamp filter — cheap |
| Task order sync | 2.12.55 | ID sequence comparison in merge — O(n) |
| Trello session count | 2.12.56 | DOM patch in renderTrello — zero extra queries |
| Forced repaint on wake | 2.12.57 | `display` toggle + `offsetHeight` — one forced reflow per wake |
| `_logSyncError` + token retry | 2.12.58 | +1 retry (2s) on cold start. Error logging is cheap. |
| Immediate sync on return | 2.12.59 | Sync fires on `visibilitychange` instead of 2s delay. Rev reset forces metadata check. |
| Triage check deferred | 2.12.60 | 3s setTimeout — no runtime cost |
| `dropboxUpdateUI` fix | 2.12.61 | Bug fix — was throwing on every token refresh |
| Wake sync silent | 2.12.61 | `_wakeSyncSilent` flag — suppresses red dot for 3s. Negligible overhead. |
| Code cleanup | 2.12.62 | Dead code removed. `renderConnections()` guarded — skips if panel closed. |
| Trello tags + copy strip | 2.12.63 | Tag detection added to patch path. Copy strips `.task-tag`. Zero cost. |
| Session count jump fix | 2.12.64 | Removed premature `_logSession` call on restart. No perf change. |
| Focus timer reanchor | 2.12.65 | `_focusReanchor()` after `renderManual()` — one DOM query per rebuild. |
| Removed `contain: layout style` | 2.12.66 | **Removed** from `.task-list`. Was causing paint deferral (BUG-004). Negligible perf impact — lists are small (<20 items). Repaint on wake now targets `#main-app`. |
| Trello 🍅 in newText | 2.12.66 | Session badge included in patch comparison — stops innerHTML thrashing every 7s. Net performance gain. |
| Trello error handling | 2.12.67 | 405/429 status messages. Background errors route to red dot (non-network only). |
| Triage bar guard | 2.12.68–69 | `checkTriageBar` returns early when overlay is open. Prevents repeated `classList` toggles during triage. |
| Error log timestamps | 2.12.70 | `HH:MM:SS` prefix via `_fmtErrTime()`. Pure string concat — negligible. |
| Red dot clears on click | 2.12.71 | `_showErrorLog()` empties array after display. No memory leak. |
| Drag jump-back fix | 2.12.72 | `syncDropbox` returns early if `_pendingBackup === true`. One extra boolean check. |
| Age bucket refactor | 2.12.73 | Replaced 12 attribute-starts-with selectors with 3 explicit bucket selectors. Faster CSS matching. |
| Midnight boundary alignment | 2.12.74 | Removed 1am shift from `_getAppDay()`, date header, splash typewriter. Simpler logic, one less branch per call. `visibilitychange` now calls `checkNewDay()` immediately. |
| Cache cleanup | 2.12.75 | Removed 15 unused `_cacheElements` entries — 15 fewer DOM lookups at init. |
| Backup retry with backoff | 2.12.76 | Exponential backoff (2s→30s cap). Prevents `_pendingBackup` stuck state. |
| Local timezone fix | 2.12.77–78 | `_localISO()` replaces UTC `toISOString().slice()`. One helper, no perf change. |
| Link extraction | 2.12.79 | URL regex + `new URL()` on task add — one-time cost per task. Renamed `.trello-link` → `.task-link`. |
| AI personality overhaul | 2.13.0 | Removed `Math.random()` gates — replaced with deterministic modulo. Added 3 action handlers. No perf change. |
| Day-end review + morning reflection | 2.13.1 | One `localStorage.setItem` at triage completion. Morning nudge reads + clears. Negligible. |
| Triage bar rewrite | 2.13.2 | `_triageActive` boolean replaces `classList.contains` check — simpler branch, no DOM query. |
| Delete button hit target | 2.13.3 | CSS padding only. No perf change. |
| Network error suppression | 2.13.4 | `_logSyncError` string check before DOM update. Negligible. |
| PiP RAF clock | 2.13.5 | PiP now runs its own RAF loop. Runs only when PiP is open and timer is active — no always-on cost. |
| PiP chime fix | 2.13.6 | `completeFor` guard (`if !st.running return`) — one boolean check. |
| Triage summary legibility | 2.13.7–8 | CSS only. Token cleanup. |
| AI button hotfix | 2.13.9 | Missing `}` brace — CSS parse error fixed. No perf change. |
| Cross-device triage flash | 2.14.0 | `_triageBarSilent` flag — one boolean check per `checkTriageBar` call. 3s window on wake. |
| unhandledrejection filter | 2.14.1 | String check added. Negligible. |
| Red dot token + external label | 2.14.2 | CSS token swap, URL check in onerror. Negligible. |
| Error log panel | 2.14.3 | Panel DOM rendered on click — not on every error. `_showErrorDot()` helper. No always-on cost. |
| Triage summary redesign | 2.14.4 | CSS only — Syne font, simplified structure. Removed two CSS classes. |
| focusData loop hoisting | 2.16.4 | `today_trello_focus` was read + JSON.parsed inside `.map()` — N reads per render in `_fetchTriageHints` and `renderTriageList`. Hoisted to one read before loop. |
| safeJSON adoption | 2.16.4 | All `today_trello_focus` and `today_triage_history` reads now use `safeJSON()` — try/catch protection, no perf cost. |
| Trello silent cache load | 2.16.12 | `loadTrello()` wiped DOM and showed spinner even when cache had seeded `trelloTasks`. Added `hasCachedTasks` guard — cache-seeded loads now silent like `fromSync`. Eliminates ~1-3s visible spinner on every app open. |

---

## 9. Historical Changes (v2.12.40 → v2.12.47)

| Feature | Version | Performance Impact |
|---|---|---|
| Triage sync race fix | 2.12.40 | Read fresh localStorage — zero cost |
| Stale focus state fix | 2.12.41 | Class removal on init — zero cost |
| Zone changes sync | 2.12.42 | Adds backup calls to zone ops |
| Triage overlay sync | 2.12.43 | Zero cost — hides overlay on merge |
| Zone ops immediate sync | 2.12.44 | Removes 800ms debounce — faster but more Dropbox calls |
| CSS variable cleanup | 2.12.45 | -2 unused vars — minor size reduction |
| Skip splash on return | 2.12.46 | sessionStorage check — instant load on mobile return |
| Hide empty Trello section | 2.12.47 | Zero cost — display toggle in renderTrello |

---

*Last updated: Session 28 (v2.12.79)*
