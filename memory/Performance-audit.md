# TODAY — Performance & Security Audit
> v2.17.106 · Jun 2026  
> Runtime performance, security posture, and privacy review.
> Test cases: See `Test-matrix.md`

---

## 1. Bundle & Load

| Metric | Value | Notes |
|---|---|---|
| index.html size | ~516 KB (152 KB gzip) | Single HTML file — no build step |
| `assets/poems.js` | 21 KB (7.5 KB gzip) | Daily poem corpus (corpus 70, round 10), SW-precached |
| Lines of code | 12,196 (+95 since v2.17.98) | poems.js: 454 lines |
| Event listeners | ~62 | Stable; grep-count method |
| External scripts | 0 | poems.js is same-origin, SW-cached; no CDN, no analytics SDK |
| External fonts loaded on first visit | 6 files | Self-hosted, pre-cached by SW after first load |
| External fonts on repeat visits | 0 | All served from SW cache |
| Google Fonts requests | 0 | Fonts are self-hosted — zero external pings |

**@font-face declarations:** 9 total — 6 in main document (DM Mono ×3, Syne ×3), 2 injected into PiP window (DM Mono 300, Syne 700), 1 in offline fallback HTML in SW.

**Assessment:** index.html grew 509 → 516 KB since v2.17.98. Major additions: AI bar discoverability (v2.17.99), smoke test TDZ fix (v2.17.100), merge-anomaly counter (v2.17.101), WAAPI migration machinery (v2.17.103), BUG-030 pre-warm expansion (v2.17.105), habit archive logic (v2.17.106). poems.js grew 19 → 21 KB (rounds 9–10 added 8 poems to reach corpus 70). No minification — acceptable for a single-file project. All loads after first are fully offline-capable.

---

## 2. Runtime Performance

### DOM Query Inventory

| Metric | Count | Notes |
|---|---|---|
| `getElementById` | 193 | +1 since v2.17.98 |
| `querySelector` | 51 | +3 since v2.17.98 |
| `querySelectorAll` | 26 | unchanged |
| **Total DOM queries** | **270** | |
| `innerHTML =` assignments | ~45 | Most in render functions, not hot paths |
| Cached element usage | via `$` object | 26 elements cached at init in `_cacheElements()` |

**Opportunity:** ~225 uncached queries remain. Most are in one-time render functions or low-frequency paths. Further caching adds complexity for minimal gain.

### localStorage Inventory

| Metric | Count | Notes |
|---|---|---|
| `localStorage.getItem` | 82 | +2 since v2.17.98 |
| `localStorage.setItem` | 134 | +1 since v2.17.98 |
| Raw `JSON.parse(localStorage` | 0 outside `safeJSON()` | The single occurrence *is* the `safeJSON()` helper body |
| `safeJSON()` call sites | ~48 | Centralises try/catch + fallback for all reads |
| **Quota failures** | **caught (v2.17.70)** | `localStorage.setItem` wrapped globally; quota errors route to red dot |

**New keys since v2.17.98:**
- `ai_bar_tip_seen` (v2.17.99) — local-only flag, one-time input bar tip
- `today_merge_anomalies` (v2.17.101) — local-only, latest 50 conflict events, console.warn mirror

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

**setTimeout count: 66** (+2 since v2.17.98)

**requestAnimationFrame count: 17** (−1 — WAAPI migration in v2.17.103 removed one CSS animation management RAF pass)

**WAAPI animations: 6 `el.animate()` call sites** (up from 2 — v2.17.103 migration added `_breathe` helper covering `.ai-badge`, `.done-star`, `.loading-dots span`, `.ai-thinking-dots`; `_pulseComplete` covers the focus bar). `_breathe`/`_pulseComplete`/`_pulseAnim` helper call sites: ~27. All compositor-driven; all survive `_forceRepaint` display toggles without flashing. Handles stored for `_pulseComplete` only (needs explicit cancel on remove); `_breathe` callers rely on element removal to discard the timeline.

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
| Habit list | Full re-render | `renderHabits` filters to `activeHabits` (one O(n) pass), then rebuilds list |
| Section counts | `textContent` via cached `$.manualCount` | Direct, no query |
| Empty state | `textContent` + `display` toggle | Uses cached `$.manualEmpty` |
| Favicon | Key-gated canvas redraw | 21 possible states, redraws only on state change |
| PiP window | Injected HTML + RAF loop | Single window reference, cleaned up on `pagehide` |

### CSS Token Health
| Metric | Status |
|---|---|
| CSS custom properties in `:root` | 114 vars (grep-line count, v2.17.106) |
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
- Merge anomalies: capped at 50 entries (`today_merge_anomalies`, local-only).

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
| `habitsKept` snapshot — 1–3am edge case | Very low | Check at 1–3am counts toward yesterday (3am boundary) but midnight snapshot already ran; live strip always correct |
| `localStorage` disabled | Low | `safeJSON` reads catch SecurityError; but global `setItem` wrapper IIFE runs at startup — if localStorage is fully blocked, IIFE may throw before wrapper installs. App loads with red dot, data not persisted. |

---

## 7. Summary Scorecard

| Area | Score | Notes |
|---|---|---|
| Load performance | ✅ Good | 516 KB single file, fonts cached, offline-capable |
| Runtime performance | ✅ Good | Cached elements, cheap ticker, incremental DOM, `_onWake` debounced |
| CSS token hygiene | ✅ Good | 114 `:root` vars, 0 CSS violations |
| XSS protection | ✅ Good | `esc()` on all user content |
| CSRF protection | ✅ Good | PKCE state verified |
| Privacy | ✅ Good | No analytics, data stays local |
| Error handling | ✅ Good | `_logSyncError` routes sync/storage failures to red dot |
| Offline support | ✅ Good | SW cache, union merge, backup-on-reconnect, offline mode UI |
| Token hygiene | ✅ Good | Secrets server-side only |
| Animation performance | ✅ Good | WAAPI at 6 sites (compositor-driven, survive display toggles); rAF loops exit when idle |
| localStorage reliability | ✅ Good | Quota failures caught and surfaced (v2.17.70) |
| CSP | ❌ Missing | Inline scripts/styles make strict CSP complex |

---

## 8. Recent Changes (v2.17.99 → v2.17.106)

| Feature | Version | Performance Impact |
|---|---|---|
| Input bar discoverability | 2.17.99 | `ai_bar_tip_seen` localStorage key (local-only, one write ever). Placeholder update on 4 events (init, key connect/clear, panel close) — `textContent` set, negligible. |
| Smoke test + TDZ crash fix | 2.17.100 | `scripts/smoke-test.mjs` (dev-only). TDZ fix: moved `_aiPanelOpen` declaration earlier — zero runtime cost. |
| Merge-anomaly counter | 2.17.101 | O(n²) scan over checked/unchecked maps per sync tick — bounded by 50-cap on anomaly store. Negligible in practice (conflict events are rare). `today_merge_anomalies` key, local-only. |
| Conflict count UI | 2.17.102 | CSS layout change only. Zero runtime cost. |
| WAAPI migration complete | 2.17.103 | **Perf win:** `_breathe` helper (4 new WAAPI sites) + `_pulseComplete` (existing). `starBreath`/`aiBadgeBreath`/`blink` CSS keyframes deleted — shorter style block. `_resumeAfterRepaint` array + 520ms restore block removed from `_onWake` — each wake sequence is ~5 operations lighter. One RAF pass eliminated. WAAPI count: 2 → 6 `el.animate()` sites. |
| Mobile habit row padding | 2.17.104 | CSS `@media` block only. Zero runtime cost. |
| BUG-030 canvas pre-warm expansion | 2.17.105 | Pre-warm now exercises `createRadialGradient`, `arc`/`fill`, `fillText` in addition to `clearRect` — all at off-screen coords (−1000,−1000). Haptic `<input switch>` created at IIFE init (one DOM append moved from first-tap to boot). Eliminates GPU stalls on first celebration. |
| Habit archive | 2.17.106 | `archiveHabit()` sets a flag instead of splicing — O(1) write. `renderHabits` adds one O(n) `activeHabits` filter pass per render (n = total habit count, typically <10). `applyNewDayCleanup` snapshot uses the same filtered array. Negligible. |

---

## 9. Historical Changes (v2.12.79 → v2.17.98)

| Feature | Version | Impact |
|---|---|---|
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

*Last updated: v2.17.106 · Jun 2026*
