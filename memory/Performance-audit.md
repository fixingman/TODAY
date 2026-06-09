# TODAY — Performance & Security Audit
> v2.17.69 · Jun 2026  
> Runtime performance, security posture, and privacy review.
> Test cases: See `Test-matrix.md`

---

## 1. Bundle & Load

| Metric | Value | Notes |
|---|---|---|
| Total file size | ~490 KB | Single HTML file — no build step |
| Lines of code | 11,817 | +435 since last audit |
| Event listeners | ~65 | +2 since v2.17.40 (offline online/offline, `_onWake` debounce) |
| External scripts | 0 | No CDN, no analytics SDK |
| External fonts loaded on first visit | 6 files | Self-hosted, pre-cached by SW after first load |
| External fonts on repeat visits | 0 | All served from SW cache |
| Google Fonts requests | 0 | Fonts are self-hosted — zero external pings |

**@font-face declarations:** 9 total — 6 in main document (DM Mono ×3, Syne ×3), 2 injected into PiP window (DM Mono 300, Syne 700), 1 in offline fallback HTML in SW.

**Assessment:** File grew from 476 KB to 490 KB since last audit. Major additions: weekly retrospective (daily history snapshots, 7-day grid), habitEvents LWW map (BUG-026), offline mode, focus timer bug fixes (BUG-024/025/027/028), `_onWake` debounce, design token additions. No minification — acceptable for a single-file project. All loads after first are fully offline-capable.

---

## 2. Runtime Performance

### DOM Query Inventory

| Metric | Count | Notes |
|---|---|---|
| `getElementById` | 188 | +9 (week grid, offline UI, checklist badge, Sunday block) |
| `querySelector` | 47 | +4 |
| `querySelectorAll` | 26 | +7 (animation audit, staleChildren filter) |
| **Total DOM queries** | **261** | |
| `innerHTML =` assignments | ~40 | Most in render functions, not hot paths |
| Cached element usage | via `$` object | 26 elements cached at init in `_cacheElements()` |

**Opportunity:** ~220 uncached queries remain. Most are in one-time render functions or low-frequency paths. Further caching adds complexity for minimal gain.

### localStorage Inventory

| Metric | Count | Notes |
|---|---|---|
| `localStorage.getItem` | 77 | +3 |
| `localStorage.setItem` | 128 | +8 (habitEvents, daily history, focus date guard, streak date) |
| Raw `JSON.parse(localStorage` | 0 | All reads go through `safeJSON()` |
| `safeJSON()` call sites | ~47 | Centralises try/catch + fallback for all reads |
| **Quota failures** | **caught (v2.17.70)** | `localStorage.setItem` wrapped globally; quota errors route to red dot |

**New keys since v2.17.40:** `today_habit_events` (LWW map), `today_daily_history` (30-day snapshot), `stat_focus_mins_date` (BUG-024 guard), `stat_streak_date` (BUG-020 guard), `week_reflection_YYYY-MM-DD` (Sunday AI cache).

### Timer Inventory

**setInterval (persistent):**

| Interval | Purpose | Notes |
|---|---|---|
| 7s | Background sync ticker | Cleared on `visibilitychange hidden` |
| 5s | Idle companion check | Runs continuously, renders only when idle threshold met |
| 500ms | Trello auth poll | Only while OAuth popup open |
| 500ms | Dropbox auth poll | Only while OAuth popup open |
| 30min | SW update check | Runs continuously |

**setInterval count: 5** (unchanged)

**setTimeout count: 63** (−1 since v2.17.40 — `_onWake` debounce eliminates one redundant 1500ms restore call)

**requestAnimationFrame count: 18** (+1 — `_onWake` single-restore rAF at 520ms). Includes: splash typewriter, star explosion, focus fill sync, PiP RAF clock, mobile input bar, mobile toolbar, celebration particles. All RAF loops exit when idle or on task completion.

### Ticker (every 7s)
- `syncAll()` → `_refreshSyncCache()` (2 localStorage reads) → `checkNewDay()` → `syncTrello()` → `syncDropbox()`
- `syncTrello()`: fetches `dateLastActivity` only (~1 KB). Full card fetch only if date changed.
- `syncDropbox()`: fetches file metadata only (~300 B). Full download only if `rev` changed.
- Ticker stops on `visibilitychange hidden`. On return: sync fires immediately, ticker resumes after 2s.

### DOM Rendering
| Operation | Strategy | Notes |
|---|---|---|
| Initial manual task list | Full re-render (`list.innerHTML`) | Once on page load only |
| Add manual task | Incremental — `appendChild` | No list re-render |
| Delete manual task | Incremental — `el.remove()` | Animation first, DOM removal after 180ms |
| Trello task list (sync) | Diff patch | Text, badge, done state, session count patched individually |
| Section counts | `textContent` via cached `$.manualCount` | Direct, no query |
| Empty state | `textContent` + `display` toggle | Uses cached `$.manualEmpty` |
| Favicon | Key-gated canvas redraw | 21 possible states, redraws only on state change |
| PiP window | Injected HTML + RAF loop | Single window reference, cleaned up on `pagehide` |

### CSS Token Health
| Metric | Status |
|---|---|
| CSS custom properties in `:root` | 115 vars (v2.17.69) — added `--text-micro`, `--color-danger-pulse`, focus-timer aliases, highlight/muted utility tokens |
| `transition: all` | 0 — all replaced with specific properties |
| Hardcoded hex/rgba outside `:root` | 0 CSS violations — remaining hex: `<meta>` attribute, JS canvas constants, SVG `stroke` attribute, PiP `:root` literals (isolated document, intentional) |

### Memory
- Ticker: single `setInterval` reference, cleared on hide.
- Focus mode: `taskStates` map — one entry per active task, cleared on `esc` / task switch.
- PiP window: single reference, cleaned up via `pagehide` event.
- Celebration particles: two canvas systems (celeb + splash), RAF loops exit when idle.
- AudioContext: single shared context, reused across sounds.
- AI state: `_aiThread` accumulates messages per session, cleared on panel close. Last 3 sessions stored (200 char cap, 5 session max).
- Triage history: capped at 50 entries.
- PAST zone: auto-purged (done: 7 days, let_go/aged: 30 days).

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
- **Netlify RUM** may be injected server-side (page-load timing only). Ad blockers prevent it.
- **Task content never leaves the device** except via explicit Dropbox sync to user's own account.
- Triage history stays local (50 entries max) — used only for AI hint patterns.
- AI conversation thread cleared on panel close — not persisted beyond last 3 session summaries.
- Trello tokens scoped to `read` only.
- **No cookies set by app code.**

---

## 5. Test Coverage

> **All test cases in `Test-matrix.md`** — comprehensive test matrix covering sync, UI, security, zones, habits, and edge cases.

---

## 6. Known Issues & Gaps

| Issue | Severity | Notes |
|---|---|---|
| No CSP header | Low | Personal tool, inline styles/scripts |
| `localStorage` quota failures | ~~Medium~~ → **Low** | Writes now wrapped globally; quota errors route to red dot (v2.17.70) |
| `stat_alltime_done` increments on re-check | Low | Cosmetic stat inflation |
| Focus mode not on touch devices | By design | Documented in Design.md |
| 9 `@font-face` declarations | Low | 2 in PiP block duplicate main doc; loaded in isolated window so no waste |
| `habitsKept` snapshot edge case | Very low | Check at 1–3am may miss that day's midnight snapshot; live strip always correct |

---

## 7. Summary Scorecard

| Area | Score | Notes |
|---|---|---|
| Load performance | ✅ Good | 490 KB single file, fonts cached, offline-capable |
| Runtime performance | ✅ Good | Cached elements, cheap ticker, incremental DOM, `_onWake` debounced |
| CSS token hygiene | ✅ Good | 115 `:root` vars, 0 CSS violations (v2.17.67 audit) |
| XSS protection | ✅ Good | `esc()` on all user content |
| CSRF protection | ✅ Good | PKCE state verified |
| Privacy | ✅ Good | No analytics, data stays local |
| Error handling | ✅ Good | `_logSyncError` routes sync/storage failures to red dot |
| Offline support | ✅ Good | SW cache, union merge, backup-on-reconnect, offline mode UI |
| Token hygiene | ✅ Good | Secrets server-side only |
| Animation performance | ✅ Good | CSS animations, GPU compositing, rAF loops exit when idle |
| localStorage reliability | ✅ Good | Quota failures caught and surfaced (v2.17.70) |
| CSP | ❌ Missing | Inline scripts/styles make strict CSP complex |

---

## 8. Recent Changes (v2.17.41 → v2.17.69)

| Feature | Version | Performance Impact |
|---|---|---|
| Offline mode | 2.17.42 | `navigator.onLine` guard + `_applyOfflinePanel()`. Two event listeners (`online`/`offline`). Negligible. |
| `habitEvents` LWW map | 2.17.53 | New `today_habit_events` key. O(n) merge per sync tick where n = habit×day entries (cap ~30d). |
| Daily history snapshots | 2.17.55 | `today_daily_history` written once at midnight; 30-entry cap. `renderInfoStats()` reads it on About open. |
| Trello `checklists=all` | 2.17.58 | Adds checklist data to existing cards API payload — slightly larger response, no extra request. |
| Habits 3am rollover | 2.17.61 | `_habitNow()` = `Date.now() - 3h` on every habit-day read. Negligible. |
| `renderTrello` stableChildren | 2.17.62 | `.filter(c => c.matches('.task[data-taskid]'))` — same cost as previous filter, more correct. |
| BUG-028 `_forceRepaint` restore | 2.17.65/68 | Animations suppressed 0–520ms, single rAF restore. Removed extra 1500ms restore timeout. Net neutral. |
| `_onWake` 200ms debounce | 2.17.69 | Eliminates duplicate wake sequence (8→4 repaint passes on desktop PWA). Small steady-state win. |
| `--text-micro` token | 2.17.67 | Zero runtime cost — CSS token addition only. |
| localStorage quota catch | 2.17.70 | Global `setItem` wrapper — try/catch cost on every write, negligible. |

---

## 9. Historical Changes (v2.12.79 → v2.17.40)

| Feature | Version | Impact |
|---|---|---|
| Splash rAF typewriter | 2.17.19 | rAF replaces setTimeout — frame-accurate |
| BUG-019/021 splash DPR strip | 2.17.29 | Removed accumulating `sctx.scale()`. ~1.4s shorter splash. |
| safeJSON + transition:all | 2.17.13 | 11 raw JSON.parse → safeJSON. 2 transition:all → specific. |
| Micro interactions | 2.17.34 | CSS-only — no layout triggers |
| CSS token audit | 2.17.40 | Zero runtime cost |
| focusData loop hoisting | 2.16.4 | N→1 localStorage reads per render |
| Trello silent cache load | 2.16.12 | Eliminates ~1–3s flash on open |
| Cache cleanup | 2.12.75 | 15 unused `_cacheElements` entries removed |
| Trello patch diff | 2.12.66 | Stopped innerHTML thrashing every 7s |

---

*Last updated: v2.17.69 · Jun 2026*
