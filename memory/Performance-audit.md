# TODAY — Performance & Security Audit
> v2.17.40 · May 2026  
> Runtime performance, security posture, and privacy review.
> Test cases: See `Test-matrix.md`

---

## 1. Bundle & Load

| Metric | Value | Notes |
|---|---|---|
| Total file size | ~476 KB | Single HTML file — no build step |
| Lines of code | 11,382 | +40 since last audit (token audit, PiP :root, micro interactions) |
| Functions | 235 | 197 named + 38 top-level arrow functions |
| Event listeners | 63 | +5 since v2.12.79 (window.focus, PiP handlers, AI threading) |
| External scripts | 0 | No CDN, no analytics SDK |
| External fonts loaded on first visit | 6 files | Self-hosted, pre-cached by SW after first load |
| External fonts on repeat visits | 0 | All served from SW cache |
| Google Fonts requests | 0 | Fonts are self-hosted — zero external pings |

**@font-face declarations:** 9 total — 6 in main document (DM Mono ×3, Syne ×3), 2 injected into PiP window (DM Mono 300, Syne 700), 1 in offline fallback HTML in SW.

**Assessment:** File grew from 461 KB to 476 KB since last audit. Additions: AI conversation threading, micro-interactions (SVG checkmark, streak pulse, habit run cascade), PiP RAF loop, BUG-022/023 fixes, splash reliability, CSS token audit. No minification — acceptable for a single-file project. All loads after first are fully offline-capable.

---

## 2. Runtime Performance

### DOM Query Inventory

| Metric | Count | Notes |
|---|---|---|
| `getElementById` | 179 | |
| `querySelector` | 43 | |
| `querySelectorAll` | 19 | |
| **Total DOM queries** | **241** | Down from 246 (cache cleanup removed 15 stale entries) |
| `innerHTML =` assignments | 37 | Most in render functions, not hot paths |
| Cached element usage | via `$` object | 26 elements cached at init in `_cacheElements()` |

**Opportunity:** ~215 uncached queries remain. Most are in one-time render functions or low-frequency paths (sync, panel open). Further caching adds complexity for minimal gain.

### localStorage Inventory

| Metric | Count | Notes |
|---|---|---|
| `localStorage.getItem` | 74 | |
| `localStorage.setItem` | 120 | Majority are writes on user action (task check, habit check, backup) |
| Raw `JSON.parse(localStorage` | 0 | All reads go through `safeJSON()` — the grep hit is `safeJSON()`'s own body |
| `safeJSON()` call sites | 45 | Centralises try/catch + fallback for all reads |

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

**setTimeout count: 64** (+3 since v2.12.79 — micro-interaction staggers, BUG-023 repaint scheduling)

**requestAnimationFrame count: 17** — includes: splash typewriter, star explosion, focus fill sync, PiP RAF clock, mobile input bar, mobile toolbar, celebration particles. All RAF loops exit when idle or on task completion.

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
| CSS custom properties in `:root` | 103 vars (v2.17.40, post-audit) |
| `transition: all` | 0 — all replaced with specific properties |
| Hardcoded hex/rgba outside `:root` | 0 CSS violations — remaining hex: `<meta>` attribute, JS canvas constants (`COLOR_ACCENT`, `COLOR_BG`, etc.), SVG `stroke` attribute (CSS vars unsupported there), PiP `:root` literals (isolated document, intentional) |

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
| `localStorage` quota failures silent | Medium | Saves fail without feedback |
| `stat_alltime_done` increments on re-check | Low | Cosmetic stat inflation |
| Focus mode not on touch devices | By design | Documented in Design.md |
| 9 `@font-face` declarations | Low | 2 in PiP block duplicate main doc; loaded in isolated window so no waste |

---

## 7. Summary Scorecard

| Area | Score | Notes |
|---|---|---|
| Load performance | ✅ Good | 476 KB single file, fonts cached, offline-capable |
| Runtime performance | ✅ Good | Cached elements, cheap ticker, incremental DOM |
| CSS token hygiene | ✅ Good | 103 `:root` vars, 0 CSS violations after v2.17.40 audit |
| XSS protection | ✅ Good | `esc()` on all user content |
| CSRF protection | ✅ Good | PKCE state verified |
| Privacy | ✅ Good | No analytics, data stays local |
| Error handling | ✅ Good | `_logSyncError` routes sync failures to red dot. Wake errors silenced 3s. |
| Offline support | ✅ Good | SW cache, union merge, backup-on-reconnect |
| Token hygiene | ✅ Good | Secrets server-side only |
| Animation performance | ✅ Good | CSS animations, GPU compositing, rAF loops exit when idle |
| CSP | ❌ Missing | Inline scripts/styles make strict CSP complex |

---

## 8. Recent Changes (v2.12.79 → v2.17.40)

| Feature | Version | Performance Impact |
|---|---|---|
| Splash rAF typewriter | 2.17.19 | rAF replaces setTimeout — frame-accurate, no drift |
| BUG-019/021 splash DPR strip | 2.17.29 | Removed accumulating `sctx.scale()`. ~1.4s shorter splash. |
| CHANGELOG trimmed | 2.17.12 | 235→3 entries in-app. ~10 KB saved on every page load. |
| safeJSON + transition:all | 2.17.13 | 11 raw `JSON.parse(localStorage)` → `safeJSON()`. 2 `transition:all` → specific properties. |
| Micro interactions | 2.17.34 | SVG `stroke-dashoffset` (CSS only, 150ms). `box-shadow` ripple cascade (CSS animation, 40ms stagger via setTimeout). No layout triggers. |
| PiP RAF completion | 2.17.35 | `_pipDone` flag — stops RAF on completion instead of looping forever. |
| BUG-022 class cleanup | 2.17.36 | `.complete` class removal paths — boolean check cost only. |
| BUG-023 panel flash | 2.17.37 | Inline `animation:none` suppression after repaint. `panel.style.animation = ''` on open. Zero runtime cost. |
| CSS token audit | 2.17.40 | 3 new `:root` tokens. PiP gets isolated `:root` block. Zero runtime cost. |
| AI conversation threading | 2.17.23 | `_aiThread` array — capped per session, cleared on close. Negligible memory. |
| AI chip label resolution | 2.17.5 | Task name lookup by ID in `_aiSetChips` — O(n) over manualTasks (n < 100). |
| Multi-task AI actions | 2.17.6 | `ids` array iteration in handlers — O(n) over selection. |
| Streak double-count guard | 2.17.26 | One extra localStorage read per `checkNewDay()` call. Negligible. |
| `_appReady` flag | 2.17.14/17 | Boolean check at top of `_onWake()`. Prevents repaint passes during splash. |
| Focus time date guard | 2.17.15/16 | One extra date string comparison per merge. Negligible. |
| Trello silent cache load | 2.16.12 | Cache-seeded loads skip spinner — eliminates ~1–3s visible flash on every open. |
| focusData loop hoisting | 2.16.4 | `today_trello_focus` read hoisted outside `.map()` — N→1 reads per render. |

---

## 9. Historical Changes (v2.12.40 → v2.12.79)

See previous audit entries — archived for reference.

| Highlight | Version | Impact |
|---|---|---|
| Cache cleanup | 2.12.75 | 15 unused `_cacheElements` entries removed |
| Trello patch diff | 2.12.66 | Session badge in comparison — stopped innerHTML thrashing every 7s |
| Age bucket refactor | 2.12.73 | 12 attribute selectors → 3 explicit — faster CSS matching |
| `_refreshSyncCache` | Earlier | All localStorage reads batched into single pass per tick |

---

*Last updated: v2.17.40 · May 2026*
