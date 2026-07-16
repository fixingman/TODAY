# TODAY — Performance & Security Audit
> v2.32.0 · Jul 2026  
> Runtime performance, security posture, and privacy review.
> Test cases: See `Test-matrix.md`

---

## 1. Bundle & Load

| Asset | Raw | Gzip | Notes |
|---|---|---|---|
| `index.html` | 578 KB | 168 KB | Single HTML file — no build step |
| `sw.js` | 6.1 KB | 2.5 KB | Service worker — cache strategy, precache list, offline fallback |
| `assets/util.js` | 4.4 KB | 2.3 KB | Pure utility helpers; SW-precached |
| `assets/idle.js` | 6.2 KB | 2.1 KB | Idle companion IIFE; SW-precached |
| `assets/sound.js` | 10.0 KB | 3.5 KB | Sound + haptics module extracted v2.23.1 (Roadmap #3); SW-precached |
| `assets/celebration.js` | 6.1 KB | 2.2 KB | Ember drift + glow extracted v2.25.3 (Roadmap #3); SW-precached |
| `assets/poems.js` | 30.9 KB | 10.6 KB | Daily poem corpus (89 poems); SW-precached |
| **Total JS** | **641 KB** | **190 KB** | index.html + 6 extracted modules |

**Lines of code:** 13,577 index.html + 1,365 extracted (14,942 total)  
— util.js: 97 · idle.js: 289 · sound.js: 224 · celebration.js: 163 · poems.js: 592

**External scripts:** 0. All assets same-origin, SW-cached; no CDN, no analytics SDK.  
**External fonts on first visit:** 6 files (self-hosted, pre-cached by SW). Zero Google Fonts pings.  
**External fonts on repeat visits:** 0 — all served from SW cache.  
**@font-face declarations:** 9 total — 6 in main doc (DM Mono ×3, Syne ×3), 2 injected into PiP window, 1 in offline fallback HTML in SW.

**Assessment:** index.html grew 539 KB → 578 KB (+39 KB) across 13 minor versions (v2.18.24 → v2.32.0), covering meeting mode mobile, daily brief, Sunday/Monday layer, inline name capture, revive from PAST, splash poem coda, and several bug fixes. `sound.js` and `celebration.js` were extracted during this range (~16 KB moved out); without those extractions index.html would be ~594 KB. poems.js grew 25 → 31 KB as the corpus grew 78 → 89 poems. All loads after first are fully offline-capable.

---

## 2. Runtime Performance

### DOM Query Inventory

| Metric | Count | Notes |
|---|---|---|
| `getElementById` | 232 | +37 since v2.18.24 |
| `querySelector` | 59 | +6 since v2.18.24 |
| `querySelectorAll` | 30 | +4 since v2.18.24 |
| **Total DOM queries** | **321** | +47 since v2.18.24 |
| `innerHTML =` assignments | 51 | +9 since v2.18.24; most in render functions, not hot paths |
| Cached element usage | via `$` object | Elements cached at init in `_cacheElements()` |
| `safeJSON()` call sites | 56 | +2 since v2.18.24; centralises try/catch + fallback for all reads |

**Opportunity:** Most of the 321 queries are in one-time render functions or low-frequency paths. Further caching adds complexity for minimal gain on a personal-use tool.

### localStorage Inventory

| Metric | Count | Notes |
|---|---|---|
| `localStorage.getItem` | 98 | +13 since v2.18.24 |
| `localStorage.setItem` | 163 | +18 since v2.18.24 |
| Raw `JSON.parse(localStorage…)` | 0 outside `safeJSON()` | `safeJSON()` centralises try/catch |
| **Quota failures** | **caught (v2.17.70)** | Global `setItem` wrapper; quota errors route to red dot |

**New keys since v2.18.24:**

| Key | Purpose | Scope |
|---|---|---|
| `today_deleted_ids` | BUG-054 tombstone log — prevents phantom resurrection (180d TTL, ≤2000 entries) | Dropbox-synced |
| `user_names` / `user_names_at` | Meeting attribution names (multi-name array, LWW via timestamp) | Dropbox-synced |
| `day_nudge_ai_<date>` | Daily AI nudge line, one per day | Dropbox-synced |
| `day_review_<date>` | Yesterday's review sentence | Dropbox-synced |
| `week_reflection_<date>` | Sunday reflection (AI-generated, cached) | Dropbox-synced |
| `monday_intention_<date>` | Monday intention (AI-generated) | Dropbox-synced |
| `today_checked_ids` | Timestamped check log — BUG-055 second-device date guard | Dropbox-synced |
| `poem_splash_date` | Once-per-day splash poem coda gate | Local |
| `appMemory` | Pattern learning — `completionsByHour`, `taskKeywords`, `focusMinutesTotal`, `bestStreak`, `dayStartCount`, `lateAdditions`, `recentCompletedTasks` (rolling 30-day, ≤50 entries) | Dropbox-synced |
| `sunday_nudge_seen_<date>` | Per-date nudge seen flag (extended to Monday in v2.30.0) | Local |

### Timer Inventory

**setInterval (persistent):**

| Interval | Purpose | Notes |
|---|---|---|
| 7s | Background sync ticker | Cleared on `visibilitychange hidden` |
| 5s | Idle companion check | In idle.js; renders only when idle threshold met |
| 500ms | Trello auth poll | Only while OAuth popup open |
| 500ms | Dropbox auth poll | Only while OAuth popup open |
| 30min | SW update check | Runs continuously |

**setInterval count: 5** (unchanged)

**setTimeout count: 74** (index.html; +10 since v2.18.24 — notably, `_onWake` now has 7 repaint passes: 0ms, rAF, rAF(rAF), 500ms, 1500ms, 3000ms, 5000ms — one-time cost on wake, no-ops when GPU is ready)

**requestAnimationFrame count: 23** (index.html; +3 since v2.18.24)

**WAAPI: `_breathe()` 12 call sites** (+2 since v2.18.24); **`_pulseComplete()` 8 call sites** (unchanged). All compositor-driven; all survive `_forceRepaint` display toggles.

### Ticker (every 7s) — unchanged from v2.18.24

`syncAll()` → `checkNewDay()` → `syncTrello()` → `syncDropbox()`. Trello: `dateLastActivity` only (~1 KB); full fetch only if changed. Dropbox: metadata only (~300 B); full download only if `rev` changed. **`renderTrello()` runs unconditionally every tick** (v2.18.12 — diff-patch, ≤20 cards typical; cost bounded but baseline). Ticker stops on hide; resumes after 2s on restore.

**New on wake (v2.28.0):** if a meeting is active, `visibilitychange→visible` fires `_meetingHealthCheck()` — track `readyState` check + wake lock reacquire. In-meeting only, non-recurring outside that context.

### DOM Rendering — unchanged since v2.18.24

| Operation | Strategy |
|---|---|
| Initial manual task list | Full re-render (`list.innerHTML`) — once on load |
| Add / delete task | Incremental — `appendChild` / `el.remove()` |
| Trello sync | Diff patch — text, badge, done, session count, age-bucket patched individually |
| Habits | Full re-render — `renderHabits` filters `activeHabits` (O(n)), rebuilds list |
| Section counts | `textContent` via cached `$` element — direct, no query |
| Favicon | Key-gated canvas redraw — 21 states, redraws only on change |
| PiP window | Injected HTML + RAF loop; cleaned up on `pagehide` |
| Week-grid | Full re-render on About open; O(n) habits pass + composite best-day score |

### CSS Token Health

| Metric | Status |
|---|---|
| CSS custom properties in `:root` | 116 vars (+2 since v2.18.24: `--color-overlay-dim`, one other) |
| `transition: all` | 0 |
| Hardcoded hex/rgba outside `:root` | 0 CSS violations (design-lint enforced) |
| Undefined-token uses | 0 (design-lint enforced) |

### Memory — changes since v2.18.24

- **`appMemory.recentCompletedTasks`** (v2.29.0): rolling 30-day, ≤50 `{text, date}` entries. Written on task complete. Bounded.
- **`_checkedTodayIds` Set** (v2.30.1, BUG-055): built transiently in `applyNewDayCleanup()`, not stored. O(n) over `today_checked_ids` (bounded by daily check count). Discarded after cleanup.
- **Meeting `_mtg` object**: ephemeral — audio chunks, rolling context, items. Nulled in `_meetingTeardown()`. No meeting localStorage keys.
- **`_onWake` extra repaint timers** (v2.31.9): 3000ms and 5000ms `setTimeout` callbacks added per wake. Each holds a closure reference until fired; GC'd after. Negligible footprint.
- All existing memory bounds unchanged: `taskStates`, PiP reference, celebration canvases, AudioContext, `_aiThread` (last 3 sessions, 200-char cap), triage history (50 entries), PAST auto-purge (done: 7d, let_go/aged: 30d).

---

## 3. Security — unchanged since v2.18.24

### XSS
- `esc()` escapes `&`, `<`, `>`, `"` before any user content enters `innerHTML`.
- `task.url` validated with `/^https?:\/\//i` — prevents `javascript:` URLs.
- No `eval()`, no `new Function()`, no dynamic script injection.

### CSRF / OAuth
- Dropbox PKCE: `state` in `sessionStorage`, verified on callback, cleared after exchange.
- Trello OAuth redirect flow. Token scope: `read` only.

### API Keys
- `DROPBOX_APP_KEY` / `TRELLO_APP_KEY`: client-visible (standard for PKCE / Trello's model).
- App secret in Netlify env vars only (`DROPBOX_CLIENT_SECRET`).
- AI API keys: stored in localStorage, relayed via Netlify proxy — never sent directly from client to provider.

### Missing: Content Security Policy
- No CSP. Inline-heavy single-file app makes strict CSP complex. **Low priority for personal tool.**

---

## 4. Privacy — unchanged since v2.18.24

- No analytics in app code. No user events, task content, or identifiers sent anywhere.
- Task content never leaves the device except via explicit Dropbox sync to user's own account.
- AI conversation thread cleared on panel close (last 3 session summaries, 200-char cap).
- Trello tokens scoped to `read` only.
- No cookies set by app code.

### Egress table

| Destination | Data sent | When | Notes |
|---|---|---|---|
| **Dropbox API** | Full backup JSON — tasks, habits, zones, stats, appMemory, checked_ids, AI day-cache, deleted_ids (schema 5.3) | On sync tick only if state changed; on manual backup | User's own account. PKCE. Content never seen by us. |
| **Trello API** | OAuth token + board/list IDs; receives card data | On tick if `dateLastActivity` changed | `read` scope only. |
| **Netlify AI proxy** | Prompt (task names, ages, patterns from appMemory) + provider key | On ✦ call or daily nudge fetch | One nudge/day max, cached. Key never sent to provider from client directly. |
| **Netlify RUM** (server-injected) | Page-load timing only — no user content | Page load, if not ad-blocked | Only non-user-initiated egress. Ad blockers prevent it. |

**Stays local, never egresses (beyond Dropbox):** triage history, AI conversation thread, poem splash date, Sunday/Monday nudge seen flags.

---

## 5. Test Coverage

> **All test cases in `Test-matrix.md`** — comprehensive matrix covering sync, UI, security, zones, habits, and edge cases.

---

## 6. Known Issues & Gaps

| Issue | Severity | Notes |
|---|---|---|
| No CSP header | Low | Personal tool, inline scripts/styles |
| `localStorage` quota failures | Low | Writes wrapped globally; quota errors route to red dot (v2.17.70) |
| Focus mode not on touch devices | By design | Timer UI is pointer-interaction dependent |
| 9 `@font-face` declarations | Low | 2 in PiP block duplicate main doc; loaded in isolated window, no waste |
| `habitsKept` snapshot 1–3am edge | Very low | Check at 1–3am counts toward yesterday (3am boundary); live strip always correct |
| `localStorage` disabled | Low | `safeJSON` reads catch SecurityError; global `setItem` wrapper IIFE may throw before installing if storage fully blocked. App loads with red dot, data not persisted. |
| `renderTrello()` runs every 7s tick unconditionally | Low | v2.18.12 — diff-patch bounds cost (≤20 cards). Only item in history that adds baseline per-tick work. Revisit if Trello card counts grow much larger than ~20. |
| BUG-004 repaint ceiling | Low | Extended to 5000ms (v2.31.9). If a very long sleep still leaves GPU unready past 5s, a 7th pass or a fallback `click` simulation may be needed. |

---

## 7. Summary Scorecard

| Area | Score | Notes |
|---|---|---|
| Load performance | ✅ Good | 578 KB single file + 65 KB extracted modules, fonts cached, offline-capable |
| Runtime performance | ✅ Good | Cached elements, cheap ticker, incremental DOM, debounced `_onWake` |
| CSS token hygiene | ✅ Good | 116 `:root` vars, 0 violations (design-lint enforced) |
| XSS protection | ✅ Good | `esc()` on all user content |
| CSRF protection | ✅ Good | PKCE state verified |
| Privacy | ✅ Good | No analytics; data stays local or in user's own Dropbox |
| Error handling | ✅ Good | `_logSyncError` routes sync/storage failures to red dot |
| Offline support | ✅ Good | SW cache, union merge, backup-on-reconnect, offline mode UI |
| Token hygiene | ✅ Good | Secrets server-side only |
| Animation performance | ✅ Good | WAAPI (compositor-driven, survive display toggles); rAF loops exit when idle |
| localStorage reliability | ✅ Good | Quota failures caught and surfaced |
| CSP | ❌ Missing | Inline scripts/styles make strict CSP complex |

---

## 8. Changes since last audit (v2.18.24 → v2.32.0)

| Change | Version | Performance impact |
|---|---|---|
| `sound.js` extracted (Roadmap #3) | v2.23.1 | ~10 KB out of index.html. SW-precached. No behaviour change. |
| `celebration.js` extracted (Roadmap #3) | v2.25.3 | ~6 KB out of index.html. SW-precached. No behaviour change. |
| Meeting mode mobile (v2) | v2.28.0 | `visibilitychange→visible` now calls `_meetingHealthCheck()` in-meeting: track readyState + wake lock reacquire. In-meeting only. Screen Wake Lock acquired at meeting start — non-fatal on failure. |
| BUG-054 tombstone log | v2.23.6 | `_purgePast()` now returns tombstones; batch-appended to `today_deleted_ids` (180d TTL, ≤2000 entries). One extra batch write per cleanup run. Negligible. |
| Task type summarization | v2.29.0 | `appMemory.recentCompletedTasks` written on every task complete (≤50 entries, rolling). O(1) append + prune. One extra localStorage write per check. Negligible. |
| `applyNewDayCleanup()` BUG-055 fix | v2.30.1 | Builds `_checkedTodayIds` Set transiently — O(n) filter over `today_checked_ids`. Runs once per day per device, not on every tick. Negligible. |
| Splash poem coda | v2.26.0 | Once-per-day: poem DOM pre-populated before animation, held 4–9.5s then fades. Zero ongoing cost. |
| BUG-004 repaint extension | v2.31.9 | Two extra `setTimeout(_forceRepaint, …)` calls at 3000ms and 5000ms in `_onWake`. One-time cost on wake; each is a single display toggle + scroll restore. Negligible. |
| Meeting auto-select (`item.mine`) | v2.32.0 | Template literal change only — `${item.mine ? ' selected' : ''}`. Zero runtime cost. |
| Poems corpus growth | v2.26.x–v2.29.x | poems.js grew 25 KB → 31 KB (78 → 89 poems). SW-precached. |

---

*Last updated: v2.32.0 · Jul 2026*
