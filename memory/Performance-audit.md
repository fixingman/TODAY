# TODAY — Performance & Security Audit
> Current source-level snapshot: v2.82.5 · Sep 2026
> Runtime performance, security posture, and privacy review.
> Test cases: See `Test-matrix.md`

---

## 1. Bundle & Load

| Asset | Raw (decoded) | Brotli | Notes |
|---|---|---|---|
| `index.html` | 211 KB | 64 KB | HTML/CSS shell + startup composition root (Brotli q5) |
| `sw.js` | 7.2 KB | 2.5 KB | Service worker — cache strategy, precache list, offline fallback |
| `assets/runtime.js` | 2.0 KB | — | Frozen component namespace + one delegated listener per declared event type; loaded first and SW-precached |
| `assets/util.js` | 4.4 KB | 2.3 KB | Pure utility helpers extracted v2.17.122; SW-precached |
| `assets/accessibility.js` | 6.8 KB | — | Shared semantics, announcements, dialog/disclosure focus handling, and row keyboard layer; SW-precached |
| `assets/idle.js` | 6.2 KB | 2.1 KB | Idle companion IIFE extracted v2.17.124; SW-precached |
| `assets/sound.js` | 10.0 KB | 3.5 KB | Sound + haptics module extracted v2.23.1 (Roadmap #3); SW-precached |
| `assets/celebration.js` | 6.1 KB | 2.2 KB | Ember drift + glow extracted v2.25.3 (Roadmap #3); SW-precached |
| `assets/trello.js` | 20.9 KB | 7.0 KB | Trello integration extracted v2.33.x (Roadmap #3); SW-precached |
| `assets/insights.js` | 20.5 KB | 6.7 KB | AI memory + pattern learning extracted v2.33.10 (Roadmap #3); SW-precached |
| `assets/error-monitor.js` | 6.0 KB | 2.1 KB | Error logging + red dot/panel extracted v2.41.1 (Roadmap #3, seventh module); SW-precached |
| `assets/poem-utils.js` | 1.9 KB | 0.9 KB | Shared deterministic poem selection/render helpers extracted v2.61.2; SW-precached |
| `assets/splash.js` | 19.5 KB | 6.6 KB | Splash gate + animation controller extracted v2.64.25 (Roadmap #3); SW-precached |
| `assets/platform.js` | 12.1 KB | 3.2 KB | PWA, mobile keyboard, SW registration, and bfcache controller extracted v2.64.26 (Roadmap #3); SW-precached |
| `assets/drag.js` | 12.4 KB | 2.3 KB | Desktop + touch reorder controllers extracted v2.64.27 (Roadmap #3); SW-precached |
| `assets/meeting.js` | 35.7 KB | 10.4 KB | Meeting + Voice Note extracted v2.64.29; automated and desktop/mobile verified; tracked and SW-precached |
| `assets/memory-panel.js` | ~31 KB | ~8 KB | Memory panel; tracked, SW-precached, dedicated browser suite |
| `assets/triage.js` | ~30 KB | ~6 KB | Triage; tracked, SW-precached, dedicated browser suite |
| `assets/zones.js` | ~18 KB | ~4 KB | Soon/Past controller; tracked, SW-precached, dedicated browser suite |
| `assets/habits.js` | 18.8 KB | 5.7 KB | Habits controller extracted v2.64.33; tracked and tested |
| `assets/task-actions.js` | 26.9 KB | 7.2 KB | Task mutations, delegated row controls, stats, and private favicon renderer; SW-precached |
| `assets/sync-merge.js` | 4.0 KB | — | DOM-free daily-history and suggestion-outcome merge primitives; directly unit-tested |
| `assets/suggestion-policy.js` | 3.2 KB | — | DOM-free suggestion reason/performance policy; directly unit-tested |
| `assets/noticed-model.js` | 3.6 KB | — | DOM-free solar-term and milestone policy; directly unit-tested |
| `assets/focus-session.js` | 1.1 KB | — | DOM-free focus-session state and wall-clock math; directly unit-tested |
| `assets/week-reflection-policy.js` | 6.2 KB | 2.1 KB | DOM-free Sunday candidate ranker/output guard; browser global + direct Node unit-test boundary; SW-precached |
| `assets/poems.js` | 52 KB | 16 KB | Daily poem corpus (130 reviewed poems); SW-precached |
| **Runtime shell** | **1.11 MB** | **317 KB** | `index.html` + `sw.js` + all 36 same-origin JS modules (Brotli q5) |

**Shape:** `index.html` is 4,854 lines and remains the HTML/CSS shell plus intentional startup
composition root. Behavior lives in 36 classic-script modules; the largest are `dropbox.js`
(2,150 lines), `focus.js` (1,686), `assistant.js` (1,514), and `insights.js` (1,461).
Extraction reduced ownership ambiguity, not total payload.

**Third-party runtime scripts:** 0. All 36 scripts are same-origin and every one is present in
the service-worker precache. No CDN or analytics SDK. `scripts/design-lint.mjs` rejects external
runtime script tags and known analytics/replay markers (Rule 32).
**External fonts on first visit:** 6 files (self-hosted, pre-cached by SW). Zero Google Fonts pings.  
**External fonts on repeat visits:** 0 — all served from SW cache.  
**@font-face declarations:** 9 total — 6 in main doc (DM Mono ×3, Syne ×3), 2 injected into PiP window, 1 in offline fallback HTML in SW.

**Extraction status:** component behavior is file-separated; v2.82.5 adds an explicit runtime
ownership contract and extracts deterministic sync, suggestion, Noticed, and focus-session
cores. Large controllers remain where DOM/network/lifecycle orchestration is inherently coupled;
shared state, initialization, and startup sequencing remain inline as the intentional
composition root.

**Assessment (v2.82.5):** module loading and offline precache are in exact parity. Runtime-first
ordering, declarative-action ownership, and a 123-assignment compatibility ceiling are now
enforced. The current watch item is the 1.11 MB raw shell and the remaining transitional globals,
not a missing-asset failure.

---

## 2. Runtime Performance

### DOM Query Inventory

| Metric | Count | Δ from v2.32.0 | Notes |
|---|---|---|---|
| `getElementById` | 311 | — | Source-level call sites across `index.html` + `assets/*.js` |
| `querySelector` | 102 | — | Source-level call sites |
| `querySelectorAll` | 38 | — | Source-level call sites |
| **Total DOM queries** | **451** | — | Not runtime frequency; repeated render calls dominate |
| `innerHTML =` assignments | 77 | — | Free-text paths remain subject to the XSS review below |
| Cached element usage | via `$` object | — | Elements cached at init in `_cacheElements()` |
| `safeJSON()` call sites | 56 | 0 | Centralises try/catch + fallback for all reads |

### localStorage Inventory

| Metric | Count | Δ from v2.32.0 | Notes |
|---|---|---|---|
| `localStorage.getItem` | 149 | — | Source-level call sites across the current runtime |
| `localStorage.setItem` | 187 | — | Source-level call sites across the current runtime |
| Raw `JSON.parse(localStorage…)` | 0 outside `safeJSON()` | — | `safeJSON()` centralises try/catch |
| **Quota failures** | **caught (v2.17.70)** | — | Global `setItem` wrapper; quota errors route to red dot |

**New keys since v2.32.0:**

| Key | Purpose | Scope |
|---|---|---|
| `noticed_lines_<date>` | Day-cache for Noticed block lines — keeps them visible on re-open (v2.35.0); pruned by `_pruneLS` | Local |
| `week_reflection_<date>` | Sunday reflection (AI-generated, cached per day) | Dropbox-synced (BUG-057, v2.36.1) |
| `week_policy_<date>` | Sunday evidence-contract marker + negative cache (`earned-v1`) | Dropbox-synced as `week_reflection_policy`; rejects old-policy copy |
| `monday_intention_<date>` | Monday intention (AI-generated, cached per day) | Dropbox-synced (BUG-057, v2.36.1) |
| `today_manual_order_at` | ISO stamp of last manual reorder — recency-aware merge, prevents drag jump-back (v2.38.7) | Dropbox-synced (`manual_order_at`, schema 5.4) |
| `week_theme_ai_<weekKey>` | Noticed's week-theme AI text, cached once/week (v2.39.0) | Dropbox-synced (`week_theme_ai`) |
| `week_theme_tried_<weekKey>` | Negative-cache flag — a week with no genuine pattern doesn't retry the AI call on every open (v2.39.0) | Local |
| `day_nudge_done_count_<date>` | `doneIds.size` stamped at nudge-generation time — staleness guard, detects a task finished after generation but before the banner was seen (v2.39.1) | Local |

### Timer Inventory

**setInterval (persistent):**

| Interval | Purpose | Notes |
|---|---|---|
| 7s | Background sync ticker | Cleared on `visibilitychange hidden` |
| 5s | Idle companion check | In idle.js; renders only when idle threshold met |
| 500ms | Trello auth poll | Only while OAuth popup open |
| 500ms | Dropbox auth poll | Only while OAuth popup open |
| 30min | SW update check | Runs continuously |

**Source-level timing call sites:** 7 `setInterval`, 100 `setTimeout`, and 34
`requestAnimationFrame` across `index.html` + runtime modules. These are call sites, not the
number simultaneously active; transient OAuth, animation, and testable UI timers are included.

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

- **`appMemory.noticed`** (v2.35.0): show-once bookkeeping for Noticed block — `habitMilestones`, `streakProxDate`, `peakShown`, `themeWeek` (v2.39.0: theme-of-week is now AI-generated, keyed only by week, not a stored word), `seasonDate`, `revivedDone`, `focusMilestone`. Small object, bounded by number of observable signal types (7 as of v2.38.0). Synced v2.36.3 (BUG-058) → **reverted to device-local v2.39.3**: syncing meant "shown once" became "shown once across all devices combined," so one device's About-open silently consumed the notification for every other device too. The underlying data each signal reads stays fully synced, so two devices that do show a signal always show identical content — only the "have I shown you this yet" gate is per-device now.
- **`appMemory.noticedDates`** (v2.39.4): narrower companion field, IS synced (earliest-date-wins) — records only *when* each signal-occurrence first fired anywhere, keyed per-occurrence (e.g. `peak:14`), never the shown content. Restores same-day cross-device visibility without reintroducing BUG-058's content-divergence problem. Bounded the same way as `noticed` — a handful of keys.
- **`appMemory.recentCompletedTasks`** (v2.29.0, now synced v2.36.3): rolling 30-day, entries bounded by 30-day filter on write. Now union-merged in `mergeRemoteData` across devices.
- All existing memory bounds unchanged from v2.32.0.

---

## 3. Security — re-audited 2026-09-04 (v2.82.4), not just re-asserted

Previously flagged "unchanged since v2.32.0" without being re-checked against everything shipped since — many versions had landed (Noticed sync, poem share, meeting mode, error-monitor extraction, Trello template reorder). Re-verified every claim below against current code rather than trusting the old note.

### XSS
- `esc()` escapes `&`, `<`, `>`, `"` before any user content enters `innerHTML`. Swept every `.innerHTML =` assignment in `index.html` (42 sites) and all `assets/*.js` modules (9 sites) — every site rendering genuinely free-text content (task text, tags, meeting attendee names, AI-extracted meeting items, Trello board/list names, poem author, error-panel messages, PiP task title) routes through `esc()`. Sites interpolating raw, unescaped values are all internal IDs (task/habit/Trello card IDs) or numeric values — not attacker-controllable free text. A handful of `${task.text}` interpolations without `esc()` exist only in AI *prompt-building* strings (plain text sent to the AI backend, never rendered as HTML) — a different category (prompt injection into the user's own AI conversation about their own tasks, not a DOM/XSS vector), not a gap in this check.
- `task.url` validated with `/^https?:\/\//i` (`index.html:6123`) — confirmed still anchored at the start of the string, still prevents `javascript:` URLs.
- No `eval()`, no `new Function()`, no dynamic script injection anywhere in `index.html` or `assets/*.js` — confirmed via direct search, zero matches.

### CSRF / OAuth
- Dropbox PKCE: `state` in `sessionStorage`, verified on callback, cleared after exchange.
- Trello OAuth redirect flow. Token scope: `read` only.

### API Keys
- `DROPBOX_APP_KEY` / `TRELLO_APP_KEY`: client-visible (standard for PKCE / Trello's model).
- App secret in Netlify env vars only (`DROPBOX_CLIENT_SECRET`).
- AI API keys: stored in localStorage, relayed via Netlify proxy — never sent directly from client to provider.

### Development dependencies
- `scripts/` is development-only and does not ship with the PWA. Its reproducible tree is locked by `scripts/package-lock.json`.
- The 2026-09-04 audit found `extract-zip@2.0.1` through Puppeteer 23's browser helper (GHSA-jmr9-qjv8-65gv, high). Puppeteer Core moved to 25.10.0 / `@puppeteer/browsers` 3.2.2, which removes that package; Node >=22.12 is now explicit.
- The complete gate passed 29/29 with zero flakes under Node 22.23.2 and Node 24.14.0. npm's advisory endpoint remained intermittently unavailable, so the exact locked versions were also checked against OSV's batch API; all 26 package records returned no advisories.

### Missing: Content Security Policy
- No CSP. Inline-heavy single-file app makes strict CSP complex. **Low priority for personal tool.**

---

## 4. Privacy — re-audited 2026-07-29 (v2.42.2); changes since v2.32.0

- No analytics in app code. No user events, task content, or identifiers sent anywhere.
- Task content never leaves the device except via explicit Dropbox sync to user's own account.
- AI conversation thread cleared on panel close (last 3 session summaries, 200-char cap).
- Trello tokens scoped to `read` only.
- No cookies set by app code.

**Analytics boundary (2026-08-11):** Umami Cloud was evaluated and rejected for the task app. Cookie-free anonymous sessions still create third-party observation and contradict the literal “no account, no server” promise. Default URL tracking also creates an app-specific credential risk: Dropbox returns a PKCE code in the query string and Trello returns a long-lived token in the hash. Session replay and heatmaps are prohibited because rendered task text is sensitive content. Acquisition analytics remains acceptable only on a separate public landing surface; any future in-app diagnostics must be explicit opt-in, aggregate, and content/identifier-free.

### Egress table

| Destination | Data sent | When | Notes |
|---|---|---|---|
| **Dropbox API** | Full backup JSON — tasks, habits, zones, stats, appMemory (incl. noticed + noticedDates + recentCompletedTasks + meetingAttribution counters), checked_ids, AI day-cache, week_reflection, monday_intention, week_theme_ai, deleted_ids, manual_order_at (schema 5.4) | On sync tick only if state changed; on manual backup | User's own account. PKCE. Content never seen by us. |
| **Trello API** | OAuth token + board/list IDs; receives card data | On tick if `dateLastActivity` changed | `read` scope only. |
| **Netlify AI proxy** | Prompt (task names, ages, patterns from appMemory) + provider key | On ✦ call, daily nudge, week reflection, monday intention, meeting chunk | One nudge/day max, cached. Key never sent to provider from client directly. |
| **Netlify meeting-extract** | Base64 audio chunk (~6min) + userName + rolling context + captured mine items | Per audio chunk during meeting mode | Gemini only. Transcript produced inside Gemini, never returned. Tasks only. |
| **Netlify RUM** (server-injected) | Page-load timing only — no user content | Page load, if not ad-blocked | Only non-user-initiated egress. Ad blockers prevent it. |
| **OS share sheet / clipboard** (poem share, v2.40.0) | The day's poem text + author + app URL | Only when the user explicitly taps to share/copy the poem | Not a fixed server destination — user picks the recipient (Messages, Mail, Notes, etc.) via the OS, or it's copied to the local clipboard. No task/personal data involved, only the public poem text. Listed here for completeness, not because it's a new risk. |

**Stays local, never egresses (beyond Dropbox):** triage history, AI conversation thread, poem splash date, Sunday/Monday nudge seen flags, noticed_lines day-cache.

**New since v2.32.0:** `week_reflection` and `monday_intention` added to Dropbox payload (BUG-057, v2.36.1). `recentCompletedTasks` included in memory merge (BUG-058, v2.36.3); `appMemory.noticed` was too, but that part was reverted v2.39.3 — it's device-local again (still travels in the whole-appMemory backup blob, just no longer applied on read). `appMemory.noticedDates` (v2.39.4) — a narrower, date-only sibling field — IS merged, so a Noticed signal that fired on one device can still show on another the same day. `capturedMine` items sent to meeting-extract to prevent duplicate task capture.

**New in v2.64.21–23:** `appMemory.semantic`, `appMemory.episodic`, `appMemory.procedural` (AI inference arrays) now union-merged on every sync tick via `_mergeAppMemory()`. Pattern fields `triageUndos`, `soonPulls`, `letgoReasons`, `reviveReasons`, `lateAdditions`, `taskLifespanSamples` added to pattern merge (v2.64.21). `sunday_nudge_seen_<date>` key added to `_DISMISS_SYNC` registry (v2.64.22) — propagates Sunday nudge dismissal cross-device. `_pruneLS` now cleans `reflection_<date>`, `nudge_done_count_<date>`, `noticed_lines_<date>`, and `week_theme_tried_<week>` keys at 4 write sites. `_pruneTrelloMaps()` removes `today_trello_firstseen` and `today_trello_lastactive` entries for cards absent >90 days. `habit_events` tombstone cap: 200 entries max.

---

## 5. Test Coverage

> **All test cases in `Test-matrix.md`** — comprehensive matrix covering sync, UI, security, zones, habits, and edge cases.

The default v2.82.5 gate runs design lint plus 33 non-live suites: 24 browser suites and nine direct Node/static suites. Inventory is enforced, retries are reported as flakes and fail, and each attempt has a 120-second ceiling. The component contract checks runtime/precache order, declarative-action parity, inline-handler absence, global ownership, and the compatibility ceiling. Sync merge, suggestion policy, Noticed policy, and focus-session math now have direct unit coverage. A tracked lockfile and `CHROME_PATH` make the same gate runnable in GitHub Actions. Manual VoiceOver, installed-PWA behavior, and real Picture-in-Picture verification remain release gates.

---

## 6. Known Issues & Gaps

| Issue | Severity | Notes |
|---|---|---|
| No CSP header | Low | Personal tool, inline scripts/styles |
| Completed tasks use 25% opacity | Accepted accessibility exception | Deliberately reduces finished-work noise; visible text/control contrast in this state does not meet WCAG 1.4.3/1.4.11. Semantics and keyboard state remain available. |
| Pointer reorder requires dragging | Accepted accessibility exception | Option+Arrow supports keyboard reordering, but no single-pointer non-drag alternative is provided; WCAG 2.2 criterion 2.5.7 remains unmet. See `Accessibility-audit.md`. |
| `localStorage` quota failures | Low | Writes wrapped globally; quota errors route to red dot (v2.17.70) |
| Focus mode not on touch devices | By design | Timer UI is pointer-interaction dependent |
| 9 `@font-face` declarations | Low | 2 in PiP block duplicate main doc; loaded in isolated window, no waste |
| `habitsKept` snapshot 1–3am edge | Very low | Check at 1–3am counts toward yesterday (3am boundary); live strip always correct |
| `localStorage` disabled | Low | `safeJSON` reads catch SecurityError; global `setItem` wrapper IIFE may throw before installing if storage fully blocked. App loads with red dot, data not persisted. |
| `renderTrello()` runs every 7s tick unconditionally | Low | v2.18.12 — diff-patch bounds cost (≤20 cards). Only item in history that adds baseline per-tick work. Revisit if Trello card counts grow much larger than ~20. |
| BUG-004 repaint ceiling | Low | Extended to 5000ms (v2.31.9). If a very long sleep still leaves GPU unready past 5s, a 7th pass or a fallback `click` simulation may be needed. |
| Runtime shell growth | Watch | 1.11 MB decoded / 317 KB Brotli-q5 across the HTML, service worker, and 36 modules. `index.html` itself is 211 KB / 64 KB. All modules are tracked and precached; revisit payload only when first-load measurements show a real cost. |
| BUG-041: iOS PWA splash white flash | Platform limitation | Closed 2026-07-24 after a fourth investigation pass ruled out every app-code explanation: splash launch-image colors correct (RGB 14,14,16, matches `--bg`), iPhone 14 Pro's exact spec present in the `apple-touch-startup-image` list, latest build confirmed running, no render-blocking `<head>` resource. What remains is the gap between iOS's static launch image ending and the WebView's first painted frame — a handoff with no hook available from web content. Reopen only if light/dark-mode correlation is confirmed, or the flash appears on a warm/backgrounded reopen (not just true cold start) — either would point back at in-page code. Full four-pass history → `archive/Bugs-archive.md`. |

---

## 7. Summary Scorecard

| Area | Score | Notes |
|---|---|---|
| Load performance | ✅ Good | 211 KB index.html (64 KB Brotli); 1.11 MB / 317 KB complete runtime shell; same-origin and offline-cached |
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

## 8. Changes since last audit (v2.32.0 → v2.64.23)

### v2.64.21 – v2.64.23 additions

| Change | Version | Performance impact |
|---|---|---|
| AI inference + pattern field merge in `mergeRemoteData` | v2.64.21 | Union of `semantic`/`episodic`/`procedural` arrays by id, 6 new pattern fields merged. O(n) over inference arrays (bounded by 200-entry cap on inferences). Runs on every 7s tick — still negligible given bounded sizes. |
| Sync hardening: checked_ids true LWW, streak date-guard, trello_config fill-if-empty, `_pruneTrelloMaps`, `_pruneLS` at 4 sites, `habit_events` tombstone cap, `sunday_nudge_seen` in `_DISMISS_SYNC` | v2.64.22 | `_pruneTrelloMaps` is an O(n) loop over `today_trello_firstseen` + `today_trello_lastactive` on each sync tick — bounded by number of ever-seen Trello cards, expected < 500. `_pruneLS` adds 4 localStorage reads + conditional deletes per tick. Net negligible. |
| `_mergeAppMemory()` helper extracted; called from `mergeRemoteData()` on every 7s tick | v2.64.23 | Previously only `dropboxRestore` path merged appMemory. Adding it to the 7s tick increases merge work per tick by O(n) over patterns/inferences/moments (all bounded). Measured: no long tasks on benchmark (0 tasks >50ms), so the addition stays below 50ms threshold. |

---

### v2.32.0 – v2.42.3 (original audit entries)

| Change | Version | Performance impact |
|---|---|---|
| `trello.js` extracted (Roadmap #3) | v2.33.x | ~21 KB out of index.html. SW-precached. Reduces main-file DOM queries and timers. |
| `insights.js` extracted (Roadmap #3) | v2.33.10 | ~21 KB out of index.html. Owns `appMemory`, all pattern learning, and Noticed block. SW-precached. Loads after util.js (state dependency). |
| Noticed block (About) | v2.35.0 | `_noticedLines()` runs on About open — O(n) over recentCompletedTasks (≤50 entries) + O(1) pattern checks. Day-cache (`noticed_lines_<date>`) prevents recompute on re-open. Negligible. |
| `open_triage` AI action | v2.36.0–v2.64.28 | Vocabulary entry + `_aiExecute` case were removed in v2.64.28. Zero current runtime cost. |
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
| Meeting mode: v2.37.2 approach reverted, attribution fixed server-side | v2.37.3 | Client-side filter/CSS restored (net code change ~0). Server: one array `.split(',')` on name once per request, one string comparison per item. Negligible. **Refined v2.37.4 — see below.** |
| Meeting mode: speaker-tracked attribution + accuracy counters | v2.37.4 | Prompt-only refinement (speaker-turn tracking instead of blanket unnamed-defaults-to-me) — no runtime cost change. New `appMemory.meetingAttribution`: 4 integer counters, updated once per `_meetingAccept()` call (bounded — meetings are infrequent), merged max-wins on sync like the other lifetime counters. No new localStorage key — rides inside the existing `today_memory` blob already in the Dropbox payload. Negligible. |
| Season moments (Noticed) | v2.37.0; hemisphere fix v2.81.4 | One timezone-prefix check plus a bounded 24-entry lookup in `_noticedLines()` per About open. `noticed.seasonDate` scalar rides the existing noticed merge. Negligible. |
| Housekeeping: CHANGELOG trim + voice fix (Rule 31) | v2.37.5 | Docs/copy only, no runtime change. |
| Morning nudge staleness fix | v2.37.6 | `checkDayNudge()` gains one boolean param; one existing call site restricted. No new timers, no new network calls — just moves *when* the existing generation is permitted to fire. Negligible. |
| BUG-060: Trello done-state reconciliation after merge | v2.37.7 | One new function, called once per initial Dropbox merge (cold start only) — O(n) filter over `trelloTasks` (≤20 cards typical) against a Set lookup. No extra Trello API call. Negligible. |
| BUG-061: Sunday/habit badge re-check after merge | v2.37.8 | Two existing functions (`checkSundayNudge`/`checkHabitNudge`) now also called at the two post-merge points `checkDayNudge()` already uses. Both are cheap early-return checks (array length / gate hour). Negligible. |
| Theme-of-week stop-word expansion | v2.37.9 | 11 words added to a `Set` literal in `_noticedLines()`. Zero runtime cost. |
| Noticed: revived-task + focus-milestone signals | v2.38.0 | Revived check: O(n) scan over manualTasks+trelloTasks (≤50 typical) + one `checkedIds.find` per revived task, only on About open. Focus milestone: one division + array `.find()`. Both bounded, negligible. |
| Proactive observation tuning: yesterday_win priority + day-shape state gate | v2.38.1 | Priority string change (zero cost). New `dayShapeState` field: one string compare per evaluation, replacing an unconditional push. Net negative work. Negligible. |
| Fix: meeting accept ReferenceError + sticky panel head | v2.38.2 | `_mtg` swap is a variable-name fix, zero cost change. Sticky head: `display:flex` on the panel replaces `overflow-y:auto`, one new `overflow-y:auto` on `#meetingItems` — same total scroll work, just scoped to one element instead of the whole panel. Negligible. |
| Fix: top-task hover shadow (z-index) | v2.38.3 | One `z-index` property added to an existing `:hover` rule. Zero runtime cost. |
| Fix: morning nudge cross-call-site re-render | v2.38.4 | Two new module-level booleans, checked/set once per `checkDayNudge()` call. Net effect: fewer AI fetches (duplicate races now blocked), not more. Negligible. |
| Perf: sync kickoff moved off window.load | v2.38.5 | No new work added — same fetches, same internal sequence, just triggered earlier (after init() instead of after window.load). Expected effect: shorter time-to-ready on cold start, since sync now overlaps more of the splash window instead of starting after it. |
| Morning nudge prompt: remove position-as-priority contradiction | v2.38.6 | Prompt-only change. No runtime cost. |
| Fix: recency-aware manual order merge (drag jump-back) | v2.38.7 | One extra `localStorage.setItem` per manual reorder, two string comparisons + at most one array rebuild per merge (bounded by task count, ≤~30 typical). New `manual_order_at` field in backup payload (schema 5.4). Negligible. |
| Fix: nudge banner refresh on day rollover | v2.38.8 | `checkNewDay()` now also calls `checkDayNudge()` once per day boundary (ticker tick or wake) — same cost as any other checkDayNudge() call site, already accounted for. Negligible. |
| Feature: AI-crafted week theme replaces keyword count | v2.39.0 | One new AI call (`_fetchWeekThemeAI`), once per calendar week, gated by a negative-cache flag so a no-pattern week never retries. Removed: a per-render word-frequency loop over up to ~50 completed-task texts (bounded, was already negligible). Net: less per-render local compute, one small network call per week instead. New `week_theme_ai` field in Dropbox payload. |
| Fix: nudge staleness guard (done-count stamp) | v2.39.1 | One `localStorage.setItem` on generation, one `getItem` + integer comparison on every cache read. Negligible. New `day_nudge_done_count_<date>` local key. |
| Fix: Dropbox token-refresh non-JSON response crash | v2.39.2 | Swapped one `res.json()` call for `res.text()` + guarded `JSON.parse()` — same one fetch, no extra network cost. Negligible. |
| Fix: appMemory.noticed sync reverted to device-local | v2.39.3 | Removed one `Object.spread` merge step per sync (`mergeRemoteData`). Net negative work — nothing added. `remote.noticed` still arrives in the payload but is simply unused now. |
| Feature: Noticed cross-device same-day visibility (`appMemory.noticedDates`) | v2.39.4 | One new merge loop per sync over `remote.noticedDates` keys (bounded by signal-occurrence count, small — a handful of keys at most). Two tiny helper calls (`_noticedEligible`/`_noticedStamp`, object lookup + string compare) added per signal check in `_noticedLines()`, ×7. Negligible. |
| Feature: poem share | v2.40.0 | One button, one click handler (`_shareDailyPoem`). No network, no server, no share-count storage — `navigator.share()` or clipboard write on demand only. Negligible. |
| Fix: habit/focus milestone ceiling | v2.40.0 | Swapped a bounded `.find()` over a fixed array for one `Math.floor` division past the top tier — same or fewer ops per check. Negligible. |
| Fix: BUG-060 reconcile extended to two more merge sites | v2.40.1 | `_reconcileTrelloAfterMerge()` is a pure local read (bounded by `trelloTasks.length`, typically <20) with no network call — adding it to two more call sites is the same negligible cost as the one it already ran at, just paid more often (every ~7s tick when Dropbox's rev changes, versus once at cold start). |
| Poem share design iteration (color/weight, hover-reveal, `.task-copy` mirroring, click feedback) | v2.40.2–v2.40.8 | Pure CSS/small-DOM-handler changes throughout — no new network calls, no new storage keys, no measurable runtime cost at any point in the arc. Negligible. |
| Removed: ✦ Daily brief | v2.41.0 | Net negative work — one function (`_showDailyBrief()`) and its supporting CSS deleted outright. The remaining input-bar ✦ entry path was removed in v2.49.0; the legacy sheet controller is still bundled with live inline-suggestion code. |
| Roadmap #3: `error-monitor.js` extracted (seventh module) | v2.41.1 | ~6 KB moved out of `index.html` into an SW-precached file. Zero runtime cost change — same functions, same call sites, only the physical file boundary moved. First extraction with no Non-Delegation concerns at all (dev-aid only, no sync/merge logic). |
| Roadmap #3: `splash.js` extracted (ninth module) | v2.64.25 | ~20 KB moved out of `index.html` into an SW-precached classic script. It stays inert until called at the original post-`init()` boundary, so execution timing and runtime cost are unchanged. |
| Roadmap #3: `platform.js` extracted (tenth module) | v2.64.26 | ~12 KB moved out of `index.html` into an SW-precached classic script. One end-of-script initializer preserves listener timing and runtime work. Cost: one additional same-origin app-shell request on an uncached first load; repeat/offline loads come from the SW cache. |
| Roadmap #3: `drag.js` extracted (eleventh module) | v2.64.27 | ~12 KB moved out of `index.html` into an SW-precached classic script. Desktop and touch listeners remain delegated and inert until one initializer runs at the original boundary. The same patch adds missing local persistence/autosave work only when a touch Trello reorder completes; no baseline work is added. |
| Feature: two-tap poem share on touch | v2.42.0 | One new function (`_onPoemTap`), one `matchMedia` check per tap, one document-level click listener (bounded — fires on every click app-wide, but does only a cheap `classList.contains`/`.contains()` check unless a poem is actively revealed). Negligible. |
| Fix: Trello checklist/session badge order + spacing | v2.42.1–v2.42.2 | Pure CSS property swap (`inline`→`inline-block`, one `margin-top`) plus a template string reorder in both `taskHTML()` and `renderTrello()`'s patch path. Same string-building cost either way — zero net change. |
| Fix: Day Nudge fallback→AI upgrade | v2.42.3 | One new boolean flag (`_nudgeIsFallback`) and one changed condition in an existing guard — no new network calls, no new storage keys, no additional AI generation (reuses the exact same cached response that was already being generated and discarded). Negligible. |
| Meeting attribution tightening | v2.36.x | Prompt-only changes to meeting-extract.js. No runtime cost change. |
| Meeting dedup (capturedMine) | v2.36.x | `state.items.filter(x => x.mine)` sent per chunk — O(n) filter over accumulated mine items (bounded by meeting length, typically <20). Negligible. |
| OG image update | v2.36.x | Static asset, no runtime impact. |

---

*Last updated: v2.82.5 component boundary pass · Sep 2026*
