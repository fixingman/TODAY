# TODAY — Performance & Security Audit
> v2.18.24 · Jul 2026  
> Runtime performance, security posture, and privacy review.
> Test cases: See `Test-matrix.md`

---

## 1. Bundle & Load

| Metric | Value | Notes |
|---|---|---|
| index.html size | 539 KB (157 KB gzip) | Single HTML file — no build step |
| `sw.js` | 6.2 KB (2.5 KB gzip) | Service worker — cache strategy, precache list, offline fallback |
| `assets/util.js` | 3.7 KB (1.9 KB gzip) | Pure utility helpers extracted v2.17.122–123; SW-precached |
| `assets/idle.js` | 6.2 KB (2.1 KB gzip) | Idle companion IIFE extracted v2.17.124; SW-precached |
| `assets/poems.js` | 25 KB (9.0 KB gzip) | Daily poem corpus (78 poems), SW-precached |
| Lines of code | 12,334 index.html + 367 extracted (12,701 total) | util.js: 79 lines; idle.js: 288 lines; poems.js: 508 lines |
| Event listeners | ~62 | index.html: 60; idle.js: 2 |
| External scripts | 0 | All assets same-origin, SW-cached; no CDN, no analytics SDK |
| External fonts loaded on first visit | 6 files | Self-hosted, pre-cached by SW after first load |
| External fonts on repeat visits | 0 | All served from SW cache |
| Google Fonts requests | 0 | Fonts are self-hosted — zero external pings |

**@font-face declarations:** 9 total — 6 in main document (DM Mono ×3, Syne ×3), 2 injected into PiP window (DM Mono 300, Syne 700), 1 in offline fallback HTML in SW.

**Assessment:** index.html grew 536 → 539 KB (+3 KB net) since v2.17.134, across 25 versions (v2.18.0–v2.18.24) — a wash between real additions (Trello first-seen tracking, cross-device sync wiring for three separate maps, `apple-touch-startup-image` meta tags) and a full counter-retirement removal (BUG-045: 3 increment sites + merge branch + restore branch + 2 payload fields all deleted). poems.js grew 20 → 25 KB (corpus 68 → 78, ten poems added across several curation rounds). `_cacheElements()` now caches 13 elements (was 26 in the prior audit) — worth a follow-up check on whether recently-added hot-path elements (e.g. `$.morningNudge`/`$.trelloNudge`, still cached) cover current usage; not investigated further this pass. All loads after first are fully offline-capable.

---

## 2. Runtime Performance

### DOM Query Inventory

| Metric | Count | Notes |
|---|---|---|
| `getElementById` | 195 | +2 since v2.17.134 |
| `querySelector` | 53 | +2 since v2.17.134 |
| `querySelectorAll` | 26 | unchanged |
| **Total DOM queries** | **274** | |
| `innerHTML =` assignments | 42 | Most in render functions, not hot paths |
| Cached element usage | via `$` object | 13 elements cached at init in `_cacheElements()` |

**Opportunity:** ~260 uncached queries remain. Most are in one-time render functions or low-frequency paths. Further caching adds complexity for minimal gain.

### localStorage Inventory

| Metric | Count | Notes |
|---|---|---|
| `localStorage.getItem` | 84 (index.html) + 1 (util.js/safeJSON) | +3 since v2.17.134 |
| `localStorage.setItem` | 145 | +8 since v2.17.134 — net of additions (BUG-047/048/049/051 sync wiring) and removals (BUG-045 counter retirement deleted 3 increment sites) |
| Raw `JSON.parse(localStorage` | 0 outside `safeJSON()` | `safeJSON()` still lives in util.js |
| `safeJSON()` call sites | 54 | Centralises try/catch + fallback for all reads |
| **Quota failures** | **caught (v2.17.70)** | `localStorage.setItem` wrapped globally; quota errors route to red dot |

**New keys since v2.17.134:**
- `today_trello_focus` / `today_trello_focus_date` — now synced via Dropbox backup + `mergeRemoteData()` (BUG-043/048, v2.18.17). Previously local-only.
- `today_trello_firstseen` — new map, age basis for Trello cards (BUG-049, v2.18.22). MIN-merge, no date guard, persists across days.
- `trello_nudge_dismissed_<date>` — now synced via backup payload (BUG-051, v2.18.23). Was local-only.
- `stat_tasks_done_today` / `stat_tasks_done_today_date` — **removed** (BUG-045, v2.18.21). Superseded by on-demand `_doneTodayCount()` derived from `checked_ids`/`unchecked_ids`.
- `today_merge_anomalies` — **removed** (v2.17.140, predates this audit's range but confirmed still gone). `_logMergeAnomaly()` is now a `console.warn` breadcrumb only, no persistence — see Memory section below, which was stale on this point.

### Timer Inventory

**setInterval (persistent):**

| Interval | Purpose | Notes |
|---|---|---|
| 7s | Background sync ticker | Cleared on `visibilitychange hidden` |
| 5s | Idle companion check | Lives in idle.js (extracted v2.17.124); renders only when idle threshold met |
| 500ms | Trello auth poll | Only while OAuth popup open |
| 500ms | Dropbox auth poll | Only while OAuth popup open |
| 30min | SW update check | Runs continuously |

**setInterval count: 5** (unchanged — idle.js owns the 5s companion interval)

**setTimeout count: 64** (index.html: 61, idle.js: 3; +2 since v2.17.134)

**requestAnimationFrame count: 20** (index.html: 19, idle.js: 1; unchanged since v2.17.134)

**WAAPI animations: 6 `el.animate()` call sites** (index.html, unchanged). `_breathe()`: 10 call sites (+2 since v2.17.134 — the morning + Trello nudge dots, each with its own call site, v2.18.24). `_pulseComplete()`: 8 call sites. All compositor-driven; all survive `_forceRepaint` display toggles. Handles stored for `_pulseComplete` only; `_breathe` callers rely on element/`innerHTML` replacement to discard the animation (documented invariant in `util.js`) — the nudge dot follows this pattern exactly: called fresh inside `_showNudge()` after `innerHTML` is set, so a stale animation is never orphaned.

### Ticker (every 7s)
- `syncAll()` → `_refreshSyncCache()` (2 localStorage reads) → `checkNewDay()` → `syncTrello()` → `syncDropbox()`
- `syncTrello()`: fetches `dateLastActivity` only (~1 KB). Full card fetch only if date changed. Age-bucket calc switched from `_getCreatedFromTrelloId()` (hex-decode) to `_trelloAgeBasis()` (plain object lookup on `today_trello_firstseen`, BUG-049 v2.18.22) — marginally cheaper, still O(n), n≤20.
- **`renderTrello()` now runs unconditionally every tick** (BUG-012-class fix, v2.18.12 — predates this audit's stated range but not previously captured here). Previously gated on `syncTrello()` detecting a `dateLastActivity` change; now called every 7s regardless, to keep age-bucket dimming and focus un-dim in sync across devices. It's a diff-patch render (see DOM Rendering below), so cost is bounded by card count (≤20 typical) and only touches nodes that actually changed — but this is the one item in recent history that increases *baseline* per-tick work rather than staying purely reactive. Worth watching if card counts grow much larger.
- `syncDropbox()`: fetches file metadata only (~300 B). Full download only if `rev` changed.
- Ticker stops on `visibilitychange hidden`. On return: sync fires immediately, ticker resumes after 2s.

### DOM Rendering
| Operation | Strategy | Notes |
|---|---|---|
| Initial manual task list | Full re-render (`list.innerHTML`) | Once on page load only |
| Add manual task | Incremental — `appendChild` | No list re-render |
| Delete manual task | Incremental — `el.remove()` | Animation first, DOM removal after 180ms |
| Trello task list (sync) | Diff patch | Text, badge, done state, session count, age-bucket patched individually |
| Habit list | Full re-render | `renderHabits` filters to `activeHabits` (O(n) pass), then rebuilds list |
| Section counts | `textContent` via cached `$.manualCount` | Direct, no query |
| Empty state | `textContent` + `display` toggle | Uses cached `$.manualEmpty` |
| Favicon | Key-gated canvas redraw | 21 possible states, redraws only on state change |
| PiP window | Injected HTML + RAF loop | Single window reference, cleaned up on `pagehide` |
| Week-grid (About open) | Full re-render | `_getWeeklyStats()` one O(n) habits pass per render; composite score for best-day dot |

### CSS Token Health
| Metric | Status |
|---|---|
| CSS custom properties in `:root` | 114 vars (unchanged since v2.17.106) |
| `transition: all` | 0 — all replaced with specific properties |
| Hardcoded hex/rgba outside `:root` | 0 CSS violations — remaining hex: `<meta>` attribute, JS canvas constants, SVG `stroke` attribute, PiP `:root` literals (isolated document, intentional) |
| Undefined-token uses | 0 — v2.17.98 audit caught `#triageBar` using nonexistent `--shadow-panel`; fixed |

### Memory
- Ticker: single `setInterval` reference, cleared on hide.
- Focus mode: `taskStates` map — one entry per active task, cleared on `esc` / task switch.
- PiP window: single reference, cleaned up via `pagehide` event.
- Celebration particles: two canvas systems (celeb + splash), RAF loops exit when idle.
- AudioContext: single shared context, reused across sounds.
- AI state: `_aiThread` accumulates messages per session, cleared on panel close. Last 3 sessions stored (200 char cap, 5 session max).
- Triage history: capped at 50 entries.
- PAST zone: auto-purged (done: 7 days, let_go/aged: 30 days).
- Merge anomalies: **no longer persisted** (removed v2.17.140) — `_logMergeAnomaly()` is a `console.warn` breadcrumb only now; `today_merge_anomalies` key and its UI counter are gone. *(This audit's prior revision still listed it as "capped at 50 entries, local-only" — stale by several versions; corrected here.)*
- Habit archive undo: `_archivedHabitStack` (in-memory, max 10, cleared after 5s toast).
- Done-today count: **no longer stored** (BUG-045, v2.18.21) — `_doneTodayCount()` derives it on read from `checked_ids`/`unchecked_ids`, which are already retained for other reasons (sync LWW). No new memory footprint.

---

## 3. Security

### XSS
- `esc()` escapes `&`, `<`, `>`, `"` before any user content enters `innerHTML`.
- All user-controlled content goes through `esc()`: task.text, task.url, dueStr (Trello), board/list names.
- `task.url` validated with `/^https?:\/\//i` before use as `href` — prevents `javascript:` URLs.
- No `eval()`. No `new Function()`. No dynamic script injection.

### CSRF / OAuth
- Dropbox PKCE: `state` parameter generated and stored in `sessionStorage`, verified on callback.
- `sessionStorage` PKCE keys cleared immediately after exchange.
- Trello OAuth uses standard redirect flow. Token scope: `read` only.

### API Keys
- `DROPBOX_APP_KEY` is client-visible — expected for PKCE OAuth (public client).
- App secret lives only in Netlify env vars (`DROPBOX_CLIENT_SECRET`).
- `TRELLO_APP_KEY` is client-visible — standard for Trello's OAuth model.
- AI API keys stored in localStorage, sent only through Netlify proxy function.

### Missing: Content Security Policy
- No CSP `<meta>` tag or header. Inline-heavy single-file app makes strict CSP complex.
- **Low priority for personal tool.**

---

## 4. Privacy

- **No analytics in app code.** No user events, task content, or identifiers sent anywhere.
- **Task content never leaves the device** except via explicit Dropbox sync to user's own account.
- Triage history stays local (50 entries max) — used only for AI hint patterns.
- AI conversation thread cleared on panel close — not persisted beyond last 3 session summaries.
- Trello tokens scoped to `read` only.
- **No cookies set by app code.**

### Egress table — every destination data leaves to

> The audit value is destination-by-destination: what leaves, to whom, when, carrying what.
> Everything below is user-initiated (connect a service, ask ✦) except RUM. No third destination exists.

| Destination | Data sent | When | Notes |
|---|---|---|---|
| **Dropbox API** (`*.dropboxapi.com`) | Full backup JSON — tasks, habits, completions, zones, stats, daily_history (schema 5.3) | On sync tick (7s) only if local state changed; on manual backup | User's own Dropbox account. PKCE OAuth, no app secret on client. Content never seen by us. |
| **Trello API** (`api.trello.com`) | OAuth token + board/list IDs (outbound); receives card data | On sync tick if `dateLastActivity` changed | Token scoped `read` only. Inbound card text is the user's own Trello content. |
| **Netlify AI proxy** (same-origin function) | Prompt text (task names, ages, streak, yesterday's review) + provider AI key | Only on an ✦ call or the daily morning-nudge fetch | Key stored in localStorage, relayed server-side to the provider; never to a third party from the client. One nudge call/day max, cached. |
| **Netlify RUM** (server-injected) | Page-load timing only — no user content, no identifiers | Page load, if not ad-blocked | The only non-user-initiated egress. Injected server-side; ad blockers prevent it. |

**Stays local, never egresses:** triage history, AI conversation thread, daily history (`today_daily_history`) — synced to Dropbox (schema 5.3) but does NOT leave to any other destination. (Merge-anomaly log no longer exists as a stored artifact — see Memory section.)

---

## 5. Test Coverage

> **All test cases in `Test-matrix.md`** — comprehensive test matrix covering sync, UI, security, zones, habits, and edge cases.

---

## 6. Known Issues & Gaps

| Issue | Severity | Notes |
|---|---|---|
| No CSP header | Low | Personal tool, inline styles/scripts |
| `localStorage` quota failures | ~~Medium~~ → **Low** | Writes now wrapped globally; quota errors route to red dot (v2.17.70) |
| Focus mode not on touch devices | By design | Documented in Design.md |
| 9 `@font-face` declarations | Low | 2 in PiP block duplicate main doc; loaded in isolated window so no waste |
| `habitsKept` snapshot — 1–3am edge case | Very low | Check at 1–3am counts toward yesterday (3am boundary) but midnight snapshot already ran; live strip always correct |
| `localStorage` disabled | Low | `safeJSON` reads catch SecurityError; but global `setItem` wrapper IIFE runs at startup — if localStorage is fully blocked, IIFE may throw before wrapper installs. App loads with red dot, data not persisted. |
| `renderTrello()` now runs every 7s tick unconditionally | Low | v2.18.12 traded a purely-reactive render for always-current cross-device dimming (see Ticker section). Diff-patch bounds the cost; revisit if Trello card counts grow much larger than ~20. |

---

## 7. Summary Scorecard

| Area | Score | Notes |
|---|---|---|
| Load performance | ✅ Good | 539 KB single file + 10 KB extracted modules, fonts cached, offline-capable |
| Runtime performance | ✅ Good | Cached elements, cheap ticker, incremental DOM, `_onWake` debounced |
| CSS token hygiene | ✅ Good | 114 `:root` vars, 0 CSS violations |
| XSS protection | ✅ Good | `esc()` on all user content |
| CSRF protection | ✅ Good | PKCE state verified |
| Privacy | ✅ Good | No analytics, data stays local or in user's own Dropbox |
| Error handling | ✅ Good | `_logSyncError` routes sync/storage failures to red dot |
| Offline support | ✅ Good | SW cache, union merge, backup-on-reconnect, offline mode UI |
| Token hygiene | ✅ Good | Secrets server-side only |
| Animation performance | ✅ Good | WAAPI at 6 `el.animate()` sites (compositor-driven, survive display toggles); rAF loops exit when idle |
| localStorage reliability | ✅ Good | Quota failures caught and surfaced (v2.17.70) |
| CSP | ❌ Missing | Inline scripts/styles make strict CSP complex |

---

## 8. Recent Changes (v2.17.134 → v2.18.24)

| Feature | Version | Performance Impact |
|---|---|---|
| Triage Done action + `_persistDone` crash fix | 2.18.0 | New `_markDoneInTriage()` path, O(1) per task. Also fixes a latent `ReferenceError` (undefined `_persistDone`) that aborted `triageApplyAll` mid-run whenever a Trello card was let go — removes a crash path, not just a feature add. |
| Triage checkbox marker removed | 2.18.1 | CSS-only. Zero runtime cost. |
| BUG-041 white flash, first pass | 2.18.2 | `<meta color-scheme>` + inline `<html>` bg. Pre-CSS paint fix, zero runtime cost. |
| Nudge consistency pass | 2.18.3 | CSS-only (padding, dot color, tracking). Zero runtime cost. |
| BUG-042 Trello order recency-merge + BUG-043 first pass | 2.18.4 | +1 ISO-stamp field in backup payload, O(1) merge comparison. Age-bucket now reads a daily-reset focus map, O(1) per card. Negligible. |
| Housekeeping (docs sync, DEV_HOURS) | 2.18.5 | No functional change. |
| BUG-044 zombie focus session | 2.18.6 | `closeUI` now stops session state on every close path. Correctness fix — prevents a spurious future `completeFor` call; marginal win, not a cost. |
| BUG-041 white flash, second pass (Android/Arc) | 2.18.7 | Inline `<body>` bg + `:root` `color-scheme`. Zero runtime cost. |
| BUG-043 root cause — partial focus sessions un-dim | 2.18.8 | `today_trello_focus` now set on any focus time, not just a full pomodoro. One extra `localStorage.setItem` + `dataset` delete per un-dim event. Negligible. |
| PAST zone `slice(0,20)` removed | 2.18.9 | Full list now renders (was capped, badge showed true count regardless — display mismatch, not a perf fix). Instant at realistic personal task volumes; PAST is auto-purged (see Memory). |
| Morning nudge AI prefix | 2.18.10 | String concatenation only. Zero runtime cost. |
| BUG-043 parity for manual tasks | 2.18.11 | Same `closeUI` change, mirrored for `type==='manual'`. Negligible. |
| Trello age-bucket dimming every tick | 2.18.12 | **Notable:** `renderTrello()` now called unconditionally every 7s (was gated on `dateLastActivity` change) to keep cross-device dimming in sync. Diff-patch bounds the cost (≤20 cards typical) but this is the one change in the range that adds baseline per-tick work rather than staying purely reactive — flagged in the Ticker section above and Known Issues. |
| BUG-041 white flash, third pass (OS launch screen) | 2.18.13 | New `apple-touch-startup-image` static assets, SW-precached. Zero runtime JS cost; one-time SW cache growth of a few KB per iPhone resolution. |
| BUG-045 date guard (superseded) | 2.18.14 | One extra backup field + date comparison. Fully replaced by v2.18.21's counter retirement below — net effect on current code is zero (this intermediate step no longer exists). |
| BUG-046 Trello board-selector render loop | 2.18.15 | **Perf win:** removed a `renderConnections()` call from inside `loadTrelloBoards()` that created a self-reinforcing fetch→render→fetch loop, one iteration per board API response (~200–500ms). Eliminates unbounded-in-practice render/fetch churn. |
| BUG-047 Dropbox fresh-install auto-restore | 2.18.16 | One `get_metadata` probe (~300 B) on first connect only, gated on empty local state. Negligible, one-time. |
| BUG-043 cross-device sync + BUG-048 | 2.18.17 | Two new fields in backup payload (`today_trello_focus`, `_date`), one O(n) union-merge pass (n = cards focused today, small). Negligible. |
| BUG-032 sixth pass — splash rise tuning | 2.18.18 | CSS easing/timing only (splash runs once per app load). Zero ongoing cost. |
| Triage Done button restyle | 2.18.19 | CSS-only. |
| "Read Me" label | 2.18.20 | Text-only. |
| BUG-045 counter retirement | 2.18.21 | **Perf/code win:** `stat_tasks_done_today` removed entirely — 3 increment call sites, a daily-reset branch, a `Math.max` merge branch, a restore branch, and 2 backup payload fields all deleted. Replaced by `_doneTodayCount()`, computed on-demand (O(n) over `checked_ids`, only when read — triage summary, weekly stats, daily_history snapshot) rather than maintained on every write. Net: fewer writes per check/uncheck, smaller backup payload. |
| BUG-049 Trello first-seen aging | 2.18.22 | New `today_trello_firstseen` map, written in `loadTrello()` (O(n) scan + prune of departed cards, runs once per Trello fetch, not per tick). Age-calc switched from hex-decode (`_getCreatedFromTrelloId`) to a plain object lookup (`_trelloAgeBasis`) — marginally cheaper. One new backup field, one O(n) MIN-merge pass on restore. |
| BUG-051 Trello nudge dismiss sync | 2.18.23 | One new backup field (string), one O(1) comparison in `mergeRemoteData()`. Negligible. |
| Morning nudge presence redesign | 2.18.24 | CSS-only frame change (surface panel, border) + one new `_breathe()` call site (dot now animates instead of sitting static). Called fresh inside both `_showNudge()` closures (morning + Trello) right after `innerHTML` is set — old animation instance is discarded with the replaced DOM, no explicit cancel needed, consistent with the existing `_breathe` invariant. Two call sites added (morning + Trello nudge each get their own `_showNudge` closure): `_breathe` call-site count 8 → 10. |

---

## 9. Historical Changes (v2.12.79 → v2.17.134)

| Feature | Version | Impact |
|---|---|---|
| WAAPI splash completion | 2.17.107 | `splashCursorBlink` + `splashStarBreath` CSS infinite → WAAPI (`cursor.animate`, `_breathe(star)`). Both `@keyframes` deleted. All infinite CSS loops now WAAPI except `errorPulse` (outside `#main-app`, explicitly exempt — Motion.md). |
| APP_VERSION derivation + smoke-test SW assert | 2.17.113 | No runtime cost. Smoke test now fails pre-commit if `sw.js CACHE_VERSION` drifts from app version. |
| Habit archive undo snackbar | 2.17.116 | `_archivedHabitStack` in-memory (max 10). One extra `localStorage.setItem` on archive (same as existing habit save path). `_undoLast()` dispatch adds one branch. Negligible. |
| About stat order + Psalm 118 removal | 2.17.118 | poems.js: −1 poem, corpus 65→(cumulative with 2.17.131: 68). CSS stat reorder only. |
| Week-grid composite best-day metric | 2.17.121 | `_getWeeklyStats()` now derives `habitsKept`/`habitsTotal` per day (O(n) habits pass). Extra fields on `_days` object. Runs only on About open — not a hot path. |
| Module extraction: `util.js` + `idle.js` | 2.17.122–124 | **Architecture win:** ~367 lines moved out of index.html. SW precaches both. No behavior change. Idle companion's 5s interval now lives in idle.js. |
| Morning nudge reliability (BUG-033/034) | 2.17.125–129 | All-or-nothing AI race (1s timeout) replaces swap-after-display. `checkMorningNudge()` self-heals from live task count. One extra `localStorage.setItem` (self-heal re-persist). Negligible. |
| Trello card ageing (BUG-035) | 2.17.127 | `_getCreatedFromTrelloId()` called per Trello card on every 7s patch tick. `parseInt(hex.slice(0,8), 16)` is µs-level; n≤20 cards typical. One extra `dataset.ageBucket` write per card per tick. Negligible. (Superseded v2.18.22 — see section 8.) |
| Adlestrop removed | 2.17.131 | poems.js: −1 poem, −12 lines, −0.5 KB. |
| BUG-036: daily_history sync | 2.17.132 | `today_daily_history` (≤30 day snapshots, ~1–2 KB) added to Dropbox backup payload. `_mergeDailyHistory(local, remote)` on restore: O(n) union, n≤30. One extra field in each backup write. Negligible per-tick cost; backup still gated on state change. Schema 5.2 → 5.3. |
| BUG-032 fifth pass — transform-only reveal | 2.17.133 | CSS: opacity ramp removed from `.l` base + keyframe (transform-only, no opacity). `visibility:hidden` base. JS: `fonts.load()` promise + 2-rAF in-view warm before `.go`. **Net splash path: cleaner** — removes the `opacity:0.02` warm+revert cycle (v2.17.130). Double-rAF adds ~32ms before `.go`; star+typewriter start immediately. Zero ongoing cost (splash runs once). |
| Splash ceiling tightened | 2.17.134 | 2500ms → 2000ms. SW-cached fonts load <100ms warm. Static fallback fires 500ms sooner on truly stalled loads. Zero other impact. |
| Input bar discoverability | 2.17.99 | `ai_bar_tip_seen` localStorage key (local-only, one write ever). Placeholder update on 4 events — `textContent` set, negligible. |
| Smoke test + TDZ crash fix | 2.17.100 | `scripts/smoke-test.mjs` (dev-only). TDZ fix: moved `_aiPanelOpen` declaration earlier — zero runtime cost. |
| Merge-anomaly counter | 2.17.101 | O(n²) scan over checked/unchecked maps per sync tick — bounded by 50-cap on anomaly store. Negligible in practice. `today_merge_anomalies` key, local-only. |
| Conflict count UI | 2.17.102 | CSS layout change only. Zero runtime cost. |
| WAAPI migration complete | 2.17.103 | **Perf win:** `_breathe` helper (4 new WAAPI sites) + `_pulseComplete` (existing). `starBreath`/`aiBadgeBreath`/`blink` CSS keyframes deleted. `_resumeAfterRepaint` array + 520ms restore block removed from `_onWake`. One RAF pass eliminated. WAAPI count: 2 → 6 `el.animate()` sites. |
| Mobile habit row padding | 2.17.104 | CSS `@media` block only. Zero runtime cost. |
| BUG-030 canvas pre-warm expansion | 2.17.105 | Pre-warm now exercises `createRadialGradient`, `arc`/`fill`, `fillText` at off-screen coords. Haptic `<input switch>` created at IIFE init. Eliminates GPU stalls on first celebration. |
| Habit archive | 2.17.106 | `archiveHabit()` sets a flag — O(1) write. `renderHabits` adds one O(n) `activeHabits` filter pass per render (n < 10 typical). Negligible. |
| Checkmark WAAPI (`checkPop`) | 2.17.71–72 | `stroke-dashoffset` → `transform+opacity`. Compositor-animated. Canvas pre-warm at 2s idle. |
| AI morning nudge | 2.17.73 | One AI call per day max, cached in `morning_nudge_ai_<date>`; silent rule-based fallback. Prior-day keys pruned on write. |
| Error dot safe-area offset | 2.17.75 | CSS only (`env(safe-area-inset-top)`). Zero runtime cost. |
| Daily poem | 2.17.79–89 | New 19 KB script (7 KB gz), SW-precached. Selection = pure date math; renders only on About open. No storage, no timers, no network. |
| Touch-drag ghost fixes | 2.17.90–91 | `classList.add` vs className rebuild; CSS user-select guards. Negligible. |
| Morning nudge second device | 2.17.92 | One O(n) filter over manual tasks inside the Dropbox restore handler (fires only on remote change). Negligible. |
| AI request seq (`_aiReqSeq`) | 2.17.93 | **Perf win:** ✦-with-text no longer fires the proactive load — one fewer AI API call per submit. Stale responses dropped, no wasted renders. |
| Completed-bar WAAPI pulse | 2.17.94 | CSS keyframe anim deleted; `el.animate()` handle cancelled on remove — no suppress/restore work in `_forceRepaint` for `.complete` anymore. Small wake-path win. |
| Splash font gate + start guard | 2.17.97 | **Perf win:** typewriter rAF loop can no longer double-run on slow font loads. Letter animation deferred to fonts.ready — no fallback-font layout pass. |
| Tokenisation fixes | 2.17.98 | CSS only. Zero runtime cost. |
| localStorage quota catch | 2.17.70 | Global `setItem` wrapper — negligible per-write cost. |
| `_onWake` 200ms debounce | 2.17.69 | Duplicate wake sequence eliminated (8→4 repaint passes). |
| BUG-028 `_forceRepaint` restore | 2.17.65/68 | Animations suppressed 0–520ms, single rAF restore. |
| Habits 3am rollover / Trello checklists / daily history | 2.17.55–62 | All negligible — see git history for detail. |
| `habitEvents` LWW map | 2.17.53 | O(n) merge per sync tick, ~30d cap. |
| Offline mode | 2.17.42 | Two listeners (`online`/`offline`). Negligible. |
| Splash rAF typewriter | 2.17.19 | rAF replaces setTimeout — frame-accurate. |
| BUG-019/021 splash DPR strip | 2.17.29 | Removed accumulating `sctx.scale()`. ~1.4s shorter splash. |
| safeJSON + transition:all | 2.17.13 | 11 raw JSON.parse → safeJSON. 2 transition:all → specific. |
| Micro interactions | 2.17.34 | CSS-only — no layout triggers. |
| CSS token audit | 2.17.40 | Zero runtime cost. |
| focusData loop hoisting | 2.16.4 | N→1 localStorage reads per render. |
| Trello silent cache load | 2.16.12 | Eliminates ~1–3s flash on open. |
| Cache cleanup | 2.12.75 | 15 unused `_cacheElements` entries removed. |
| Trello patch diff | 2.12.66 | Stopped innerHTML thrashing every 7s. |

---

*Last updated: v2.18.24 · Jul 2026*
