# TODAY — Performance & Security Audit
> v2.12.45 · April 2026  
> Runtime performance, security posture, and privacy review.
> Test cases: See `Test-matrix.md`

---

## 1. Bundle & Load

| Metric | Value | Notes |
|---|---|---|
| Total file size | 432 KB | Single HTML file — no build step |
| Lines of code | 10,233 | Up from 10,181 in v2.12.40 |
| Functions | 217 | Stable from v2.12.40 |
| Variables | 1,087 | const/let/var declarations |
| Event listeners | 57 | addEventListener calls |
| External scripts | 0 | No CDN, no analytics SDK |
| External fonts loaded on first visit | 6 files | Self-hosted, pre-cached by SW after first load |
| External fonts on repeat visits | 0 | All served from SW cache |
| Google Fonts requests | 0 | Fonts are self-hosted — zero external pings |

**Assessment:** File size grew from 429KB (v2.12.40) to 432KB (v2.12.45) due to zone sync improvements and triage overlay sync fix. Cleaned up 2 unused CSS variables. No minification — acceptable for a single-file project. All loads after first are fully offline-capable.

---

## 2. Runtime Performance

### DOM Query Optimization
| Metric | Count | Notes |
|---|---|---|
| Total DOM queries | 228 | getElementById + querySelector |
| Cached element usage | 64 | Via `$.element` pattern |
| localStorage accesses | 204 | Many are writes on user action |

**Opportunity:** ~164 uncached DOM queries. Most are in render functions (acceptable) or one-time init. Further caching would add complexity for minimal gain.

### Optimizations (v2.12.5+)
- **Cached DOM elements:** 26 frequently-queried elements cached at startup (`$` object)
- **Global `safeJSON()` helper:** Consolidates 10+ inline try/catch JSON parsing patterns
- **Mobile input bar (v2.12.36):** Uses GPU-accelerated `transform: translateY()` + `requestAnimationFrame` for smooth keyboard tracking

### Ticker (every 7s)
- `syncAll()` runs `_refreshSyncCache()` (2 localStorage reads), then `checkNewDay()`, `syncTrello()`, `syncDropbox()`.
- `_refreshSyncCache()` batches all localStorage reads into a single pass per tick.
- `syncTrello()`: fetches board `dateLastActivity` only (~1 KB). Full card fetch only if `date !== lastTrelloDate`.
- `syncDropbox()`: fetches file metadata only (~300 B). Full download only if `rev !== lastDropboxRev`.
- Ticker stops on `visibilitychange hidden`, resumes 2s after visible. Background tabs produce zero network activity.

### Dropbox Sync (v2.12.2 fix)
- **Pending backup tracking:** `_pendingBackup` flag tracks unsaved changes
- **Retry on tab focus:** Failed silent backups retry when tab becomes visible
- **Console logging:** Silent failures now logged for debugging

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

### setTimeout/setInterval inventory (54 total)

**setInterval (persistent):**
| Interval | Purpose | Notes |
|---|---|---|
| 7s | Background sync ticker | Cleared on tab hide |
| 500ms | Trello auth poll | Only while OAuth popup open |
| 60min | SW update check | Runs continuously |
| 1s | Focus mode tick | Only while timer active |

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
| 2000ms | Ticker resume after show/online, AI analyze debounce |
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
| Load performance | ✅ Good | 429KB single file, fonts cached, offline-capable |
| Runtime performance | ✅ Good | Cached elements, cheap ticker, incremental DOM |
| XSS protection | ✅ Good | `esc()` on all user content |
| CSRF protection | ✅ Good | PKCE state verified |
| Privacy | ✅ Good | No analytics, data stays local |
| Error handling | ✅ Good | AI errors surfaced, sync retry on failure |
| Offline support | ✅ Good | SW cache, union merge, backup-on-reconnect |
| Token hygiene | ✅ Good | Secrets server-side only |
| Animation performance | ✅ Good | CSS animations, GPU compositing, rAF batching |
| CSP | ❌ Missing | Inline scripts/styles make it complex |

---

## 8. Recent Changes (v2.12.40 → v2.12.45)

| Feature | Version | Performance Impact |
|---|---|---|
| Triage overlay sync | 2.12.43 | Zero cost — hides overlay on merge |
| Zone ops immediate sync | 2.12.44 | Removes 800ms debounce — faster but more Dropbox calls |
| CSS variable cleanup | 2.12.45 | -2 unused vars — minor size reduction |

---

## 9. Historical Changes (v2.12.14 → v2.12.40)

| Feature | Version | Performance Impact |
|---|---|---|
| Zones (SOON/PAST) | 2.11.0 | +localStorage keys, minimal runtime |
| Evening triage | 2.11.0 | DOM rendered on-demand, auto-cleanup |
| Trello in triage | 2.12.1 | Included in existing render |
| AI triage hints | 2.12.0 | +1 API call per triage (async, non-blocking) |
| Triage history | 2.12.0 | 50 entries max, capped |
| PAST purge | 2.12.6 | Runs once per day, O(n) filter |
| Morning nudge | 2.12.7 | Single DOM element, tap to dismiss |
| Dropbox sync retry | 2.12.2 | Retry on tab focus if backup failed |
| PiP sync fix | 2.12.3 | Immediate sync on visibility change |
| Element caching | 2.12.5 | ~50 DOM lookups eliminated |
| safeJSON helper | 2.12.5 | Code consolidation, no runtime change |

---

*Last updated: Session 22 (v2.12.45)*
