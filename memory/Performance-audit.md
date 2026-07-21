# TODAY — Performance & Security Audit
> v2.36.4 · Jul 2026  
> Runtime performance, security posture, and privacy review.
> Test cases: See `Test-matrix.md`

---

## 1. Bundle & Load

| Asset | Raw | Gzip | Notes |
|---|---|---|---|
| `index.html` | 556 KB | 163 KB | Single HTML file — no build step |
| `sw.js` | 6.1 KB | 2.5 KB | Service worker — cache strategy, precache list, offline fallback |
| `assets/util.js` | 4.4 KB | 2.3 KB | Pure utility helpers; SW-precached |
| `assets/idle.js` | 6.2 KB | 2.1 KB | Idle companion IIFE; SW-precached |
| `assets/sound.js` | 10.0 KB | 3.5 KB | Sound + haptics module extracted v2.23.1 (Roadmap #3); SW-precached |
| `assets/celebration.js` | 6.1 KB | 2.2 KB | Ember drift + glow extracted v2.25.3 (Roadmap #3); SW-precached |
| `assets/trello.js` | 20.9 KB | 7.0 KB | Trello integration extracted v2.33.x (Roadmap #3); SW-precached |
| `assets/insights.js` | 20.5 KB | 6.7 KB | AI memory + pattern learning extracted v2.33.10 (Roadmap #3); SW-precached |
| `assets/poems.js` | 33.9 KB | 11.4 KB | Daily poem corpus (96 poems); SW-precached |
| **Total JS** | **655 KB** | **193 KB** | index.html + 8 extracted modules |

**Lines of code:** 12,895 index.html + 2,153 extracted (15,048 total)  
— util.js: 97 · idle.js: 289 · sound.js: 224 · celebration.js: 163 · trello.js: 474 · insights.js: 526 · poems.js: 641

**External scripts:** 0. All assets same-origin, SW-cached; no CDN, no analytics SDK.  
**External fonts on first visit:** 6 files (self-hosted, pre-cached by SW). Zero Google Fonts pings.  
**External fonts on repeat visits:** 0 — all served from SW cache.  
**@font-face declarations:** 9 total — 6 in main doc (DM Mono ×3, Syne ×3), 2 injected into PiP window, 1 in offline fallback HTML in SW.

**Assessment:** index.html shrank 578 KB → 556 KB (−22 KB) since v2.32.0, driven by trello.js and insights.js extractions (Roadmap #3, ~42 KB moved out). New features added since (Noticed block, open_triage, meeting attribution improvements, BUG-057/058 sync fixes) added ~20 KB back. Net: extraction wins, feature growth offsets partially. Total payload grew 641 → 655 KB (+14 KB) because both new modules are SW-precached. All loads after first are fully offline-capable.

---

## 2. Runtime Performance

### DOM Query Inventory

| Metric | Count | Δ from v2.32.0 | Notes |
|---|---|---|---|
| `getElementById` | 221 | −11 | Moved to trello.js/insights.js |
| `querySelector` | 55 | −4 | Moved to extracted modules |
| `querySelectorAll` | 27 | −3 | Moved to extracted modules |
| **Total DOM queries** | **303** | **−18** | Extraction reduced main-file query count |
| `innerHTML =` assignments | 43 | −8 | Meeting + insights render moved to modules |
| Cached element usage | via `$` object | — | Elements cached at init in `_cacheElements()` |
| `safeJSON()` call sites | 56 | 0 | Centralises try/catch + fallback for all reads |

### localStorage Inventory

| Metric | Count | Δ from v2.32.0 | Notes |
|---|---|---|---|
| `localStorage.getItem` | 97 | −1 | |
| `localStorage.setItem` | 155 | −8 | Several moved to insights.js |
| Raw `JSON.parse(localStorage…)` | 0 outside `safeJSON()` | — | `safeJSON()` centralises try/catch |
| **Quota failures** | **caught (v2.17.70)** | — | Global `setItem` wrapper; quota errors route to red dot |

**New keys since v2.32.0:**

| Key | Purpose | Scope |
|---|---|---|
| `noticed_lines_<date>` | Day-cache for Noticed block lines — keeps them visible on re-open (v2.35.0); pruned by `_pruneLS` | Local |
| `week_reflection_<date>` | Sunday reflection (AI-generated, cached per day) | Dropbox-synced (BUG-057, v2.36.1) |
| `monday_intention_<date>` | Monday intention (AI-generated, cached per day) | Dropbox-synced (BUG-057, v2.36.1) |

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

**setTimeout count: 72** (index.html; −2 since v2.32.0 — moved to extracted modules)

**requestAnimationFrame count: 23** (unchanged)

**WAAPI: `_breathe()` 11 call sites** (−1 since v2.32.0); **`_pulseComplete()` 8 call sites** (unchanged). All compositor-driven; all survive `_forceRepaint` display toggles.

### Ticker (every 7s) — unchanged from v2.32.0

`syncAll()` → `checkNewDay()` → `syncTrello()` → `syncDropbox()`. Trello: `dateLastActivity` only (~1 KB); full fetch only if changed. Dropbox: metadata only (~300 B); full download only if `rev` changed. **`renderTrello()` runs unconditionally every tick** (v2.18.12 — diff-patch, ≤20 cards typical; cost bounded but baseline). Ticker stops on hide; resumes after 2s on restore.

### DOM Rendering — unchanged since v2.32.0

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
| Noticed block | Computed on About open; day-cached in localStorage, re-rendered from cache on repeat opens |

### CSS Token Health

| Metric | Status |
|---|---|
| CSS custom properties in `:root` | 116 vars (unchanged) |
| `transition: all` | 0 |
| Hardcoded hex/rgba outside `:root` | 0 CSS violations (design-lint enforced) |
| Undefined-token uses | 0 (design-lint enforced) |

### Memory — changes since v2.32.0

- **`appMemory.noticed`** (v2.35.0): show-once bookkeeping for Noticed block — `habitMilestones`, `streakProxDate`, `peakShown`, `themeWord`, `themeWeek`. Small object, bounded by number of observable signal types (currently 4). Now Dropbox-synced (v2.36.3).
- **`appMemory.recentCompletedTasks`** (v2.29.0, now synced v2.36.3): rolling 30-day, entries bounded by 30-day filter on write. Now union-merged in `mergeRemoteData` across devices.
- All existing memory bounds unchanged from v2.32.0.

---

## 3. Security — unchanged since v2.32.0

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

## 4. Privacy — changes since v2.32.0

- No analytics in app code. No user events, task content, or identifiers sent anywhere.
- Task content never leaves the device except via explicit Dropbox sync to user's own account.
- AI conversation thread cleared on panel close (last 3 session summaries, 200-char cap).
- Trello tokens scoped to `read` only.
- No cookies set by app code.

### Egress table

| Destination | Data sent | When | Notes |
|---|---|---|---|
| **Dropbox API** | Full backup JSON — tasks, habits, zones, stats, appMemory (incl. noticed + recentCompletedTasks), checked_ids, AI day-cache, week_reflection, monday_intention, deleted_ids (schema 5.3) | On sync tick only if state changed; on manual backup | User's own account. PKCE. Content never seen by us. |
| **Trello API** | OAuth token + board/list IDs; receives card data | On tick if `dateLastActivity` changed | `read` scope only. |
| **Netlify AI proxy** | Prompt (task names, ages, patterns from appMemory) + provider key | On ✦ call, daily nudge, week reflection, monday intention, meeting chunk | One nudge/day max, cached. Key never sent to provider from client directly. |
| **Netlify meeting-extract** | Base64 audio chunk (~6min) + userName + rolling context + captured mine items | Per audio chunk during meeting mode | Gemini only. Transcript produced inside Gemini, never returned. Tasks only. |
| **Netlify RUM** (server-injected) | Page-load timing only — no user content | Page load, if not ad-blocked | Only non-user-initiated egress. Ad blockers prevent it. |

**Stays local, never egresses (beyond Dropbox):** triage history, AI conversation thread, poem splash date, Sunday/Monday nudge seen flags, noticed_lines day-cache.

**New since v2.32.0:** `week_reflection` and `monday_intention` added to Dropbox payload (BUG-057, v2.36.1). `appMemory.noticed` and `recentCompletedTasks` now included in memory merge (BUG-058, v2.36.3). `capturedMine` items sent to meeting-extract to prevent duplicate task capture.

---

## 5. Test Coverage

> **All test cases in `Test-matrix.md`** — comprehensive matrix covering sync, UI, security, zones, habits, and edge cases.

---

## 6. Known Issues & Gaps

| Issue | Severity | Notes |
|---|---|---|
| No CSP header | Low | Personal tool, inline scripts/styles |
| Pinch-to-zoom disabled | Accessibility tradeoff | `user-scalable=no` locks zoom to prevent layout breakage (v2.36.9). Also blocks iOS accessibility zoom gesture. Fine for a personal tool; if needed, a toggle to re-enable (surface TBD, not Connections) — see Backlog Parked. |
| `localStorage` quota failures | Low | Writes wrapped globally; quota errors route to red dot (v2.17.70) |
| Focus mode not on touch devices | By design | Timer UI is pointer-interaction dependent |
| 9 `@font-face` declarations | Low | 2 in PiP block duplicate main doc; loaded in isolated window, no waste |
| `habitsKept` snapshot 1–3am edge | Very low | Check at 1–3am counts toward yesterday (3am boundary); live strip always correct |
| `localStorage` disabled | Low | `safeJSON` reads catch SecurityError; global `setItem` wrapper IIFE may throw before installing if storage fully blocked. App loads with red dot, data not persisted. |
| `renderTrello()` runs every 7s tick unconditionally | Low | v2.18.12 — diff-patch bounds cost (≤20 cards). Only item in history that adds baseline per-tick work. Revisit if Trello card counts grow much larger than ~20. |
| BUG-004 repaint ceiling | Low | Extended to 5000ms (v2.31.9). If a very long sleep still leaves GPU unready past 5s, a 7th pass or a fallback `click` simulation may be needed. |
| index.html growth | Watch | 556 KB now; extraction (Roadmap #3) offsets feature growth. Next extraction candidate: sync.js (~510 lines) — needs risk discussion (Non-Delegation ceiling). |

---

## 7. Summary Scorecard

| Area | Score | Notes |
|---|---|---|
| Load performance | ✅ Good | 556 KB index.html + 99 KB extracted modules (655 KB total), fonts cached, offline-capable |
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

## 8. Changes since last audit (v2.32.0 → v2.37.3)

| Change | Version | Performance impact |
|---|---|---|
| `trello.js` extracted (Roadmap #3) | v2.33.x | ~21 KB out of index.html. SW-precached. Reduces main-file DOM queries and timers. |
| `insights.js` extracted (Roadmap #3) | v2.33.10 | ~21 KB out of index.html. Owns `appMemory`, all pattern learning, and Noticed block. SW-precached. Loads after util.js (state dependency). |
| Noticed block (About) | v2.35.0 | `_noticedLines()` runs on About open — O(n) over recentCompletedTasks (≤50 entries) + O(1) pattern checks. Day-cache (`noticed_lines_<date>`) prevents recompute on re-open. Negligible. |
| open_triage AI action | v2.36.0 | Vocabulary entry + one `_aiExecute` case. Zero ongoing cost. |
| BUG-057: week block sync | v2.36.1 | `week_reflection` + `monday_intention` added to Dropbox backup payload and `mergeRemoteData`. Two extra `localStorage.getItem` per backup, two extra `setItem` per merge. Negligible. |
| _stripTag() keyword fix | v2.36.2 | Regex replace on task text at 3 keyword-mining sites. O(1) per call. Negligible. |
| BUG-058: Noticed block sync | v2.36.3 | `recentCompletedTasks` and `noticed` now union-merged in `mergeRemoteData`. O(n) over remote entries on each sync merge. Bounded by 30-day window (~50 entries max). Negligible. |
| Monday intention fix | v2.36.4 | Removed `recentCompletedTasks` from `_fetchMondayIntention` prompt — shorter AI call, less context sent to Netlify. Marginal improvement. |
| BUG-059: task card age reset by sync | v2.36.5 | `mergeRemoteData` task data map now keeps max `lastActive` instead of blind remote-wins. One extra comparison per task per sync merge. Negligible. |
| Morning nudge prompt reframe | v2.36.6 | Prompt-only change. No runtime cost. |
| Poem corpus growth | v2.36.7 | poems.js grew ~0.5 KB (92 → 93 poems, Publilius Syrus). SW-precached. |
| Poem splash word-count timing | v2.36.8 | `poem.text.split(/\s+/).length` on each morning open — O(n) over poem words (~80 max). Negligible. |
| Pinch-to-zoom lock | v2.36.9 | Viewport meta change only. Zero runtime cost. |
| Poem corpus round 23 | v2.37.1 | poems.js +3 Teasdale poems (93 → 96), ~1 KB. SW-precached. Negligible. |
| Meeting mode: filter non-mine items at capture | v2.37.2 | One extra `if` guard per extracted item, client-side. Removed dead `.meeting-owner` CSS/render/selector code — net negative line count. Negligible. **Reverted v2.37.3 — see below.** |
| Meeting mode: v2.37.2 approach reverted, attribution fixed server-side | v2.37.3 | Client-side filter/CSS restored (net code change ~0). Server: one array `.split(',')` on name once per request, one string comparison per item. Negligible. |
| Season moments (Noticed) | v2.37.0 | One object lookup + string compare in `_noticedLines()` per About open. `noticed.seasonDate` scalar rides the existing noticed merge. Negligible. |
| Meeting attribution tightening | v2.36.x | Prompt-only changes to meeting-extract.js. No runtime cost change. |
| Meeting dedup (capturedMine) | v2.36.x | `state.items.filter(x => x.mine)` sent per chunk — O(n) filter over accumulated mine items (bounded by meeting length, typically <20). Negligible. |
| OG image update | v2.36.x | Static asset, no runtime impact. |

---

*Last updated: v2.37.3 · Jul 2026*
