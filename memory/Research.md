# TODAY — Research Log
> Technical findings, integration assessments, and implementation gotchas.  
> Updated as research happens. Product decisions live in Architecture.md § 9.

---

## 1. Market Landscape
*Researched: Mar 7, 2026*

Most-used todo apps in rough order of adoption:

- **Todoist** — #1 for power-user adoption. Natural language input, filters, deep integrations, every platform.
- **Microsoft To Do** — quiet giant. Massive install base from Microsoft 365/Outlook bundling. Free.
- **TickTick** — fast-growing challenger. Calendar, Eisenhower matrix, habit tracking, Pomodoro. Very feature-dense.
- **Things 3** — Apple-only design darling. Minimal, no subscription. Cult following.
- **Notion / Any.do / ClickUp** — blurry middle between todo and project management.

~47% user churn on todo apps — people get overwhelmed by feature weight and leave. TODAY's constraint-by-design is a differentiator, not a weakness.

~48% of users prefer apps with third-party integrations. Trello connection already addresses this. Todoist next would cover the biggest power-user overlap.

---

## 2. Integrations

Complexity ratings are relative to Trello (baseline = 1×).

### Priority ranking

| Integration | Complexity | Status | Verdict |
|---|---|---|---|
| Trello | 1× | ✅ Implemented | Baseline |
| Todoist | ~1.5× | Not built | Highest priority next |
| Microsoft To Do | ~2× | Not built | Best Microsoft 365 path |
| Microsoft Planner | ~2.5× | Not built | Work/school accounts only — build To Do first |
| Google Drive (backup) | ~2× | Not built | Best Dropbox alternative |
| TickTick | ~2× | Not built | Watch — API maturing |
| iCloud / CloudKit JS | ~2.5× | Not built | Apple-only, viable for right audience |
| Jira | ~2.5–3× | Not built | Feasible, needs product decisions first |
| Notion | ~3–4× | Not built | Avoid — unstable API, schema chaos |
| OneNote | ~4× | Not built | Do not build — use Microsoft To Do instead |

---

### Trello
*Status: Implemented (v1.6.0+)*

Direct browser CORS, no proxy needed. Read-only, `scope=read`. OAuth redirect flow (not PKCE) — token returned in URL hash. Baseline for all complexity comparisons.

**Implemented behaviour:**
- Pulls cards from a user-selected board and list
- Board `dateLastActivity` checked every 7s — full fetch only if changed
- Cards cached in `today_trello_cache`, cleared on new day
- Done state synced via `done_ids` — not written back to Trello
- Overdue cards (due before today) persist in the list until explicitly checked off — they are not cleared on new day

**Known gotcha:** `window.open()` must be called synchronously — not inside an `await`. iOS Safari blocks popups opened after async operations. Affects all OAuth flows that open a popup.

---

### Dropbox (backup)
*Status: Implemented (v1.6.0+)*

PKCE OAuth flow. Access tokens expire — refresh handled via `dropbox-refresh` Netlify function. Two Netlify functions required: token exchange and token refresh.

**Implemented behaviour:**
- Single JSON file (`/today-backup.json`) per user in their Dropbox
- Cheap metadata-only rev check every 7s — full download only if rev changed
- Union merge on restore — both devices' changes survive concurrent offline edits
- Backup schema v4.0: `manual_tasks`, `done_ids`, `deleted_ids`, `checked_ids`, `unchecked_ids`, `habits`, `habit_completions`, `deleted_habit_ids`
- Preview deploys use `/today-backup-{hostname}.json` to avoid polluting production data

**Known gotcha:** Dropbox PKCE requires the app key client-side — that's by design for PKCE. The app secret must never be client-side; it lives only in Netlify env vars.

---

### Todoist
*Researched: Mar 7, 2026*  
*Verdict: Highest priority next integration — ~1.5× Trello*

**Why it fits:** `GET /rest/v2/tasks?filter=today` returns all tasks due today across all projects — no schema mapping, no cross-list aggregation needed. The "today" concept is first-class in Todoist's own model.

**Auth:** Personal API token — user pastes token from Settings → Integrations → Developer. No OAuth flow. Tokens don't expire. Simplest auth of any integration researched.

**CORS:** Native — no Netlify proxy needed.

**Writeback:** `POST /rest/v2/tasks/{id}/close` — one call, no workflow logic.

**Data model fields:** `content`, `due`, `priority` (1–4), `is_completed`, `project_id`, `url`

**Rate limits:** 1000 requests / user / 15 minutes — generous for TODAY's use case.

**Recommendation:** Build this next. Lowest friction auth, no proxy, clean today endpoint, same power-user audience as Trello.

---

### Microsoft To Do
*Researched: Mar 7, 2026*  
*Verdict: Best Microsoft 365 integration — ~2× Trello*

**Why it fits:** Single destination for personal tasks across Outlook, Teams, and OneNote. Consistent schema across all users. Captures OneNote-flagged items automatically — better than integrating OneNote directly.

**Auth:** OAuth 2.0 via Microsoft Graph. Requires Azure AD app registration (Azure Portal). Access tokens expire ~1 hour — refresh pattern identical to Dropbox.

**CORS:** Native via Microsoft Graph — no proxy needed.

**Writeback:** `PATCH /me/todo/lists/{listId}/tasks/{taskId}` with `status: 'completed'` — clean, unambiguous.

**Data model fields:** `title`, `status`, `dueDateTime`, `importance`, `checklistItems`

**Today filter:** OData — `$filter=dueDateTime/dateTime le '{today}T23:59:59' and status ne 'completed'`

**UX consideration:** Users have multiple lists (Work, Personal, etc.) — needs a list-picker in config, same pattern as Trello's board/list selection.

**Recommendation:** Best path for Microsoft 365 users. Azure app registration is the only real friction.

---

### Google Drive (backup alternative)
*Researched: Mar 9, 2026*  
*Verdict: Best Dropbox alternative — ~2× Trello*

**Key discovery:** `drive.appdata` scope gives TODAY a hidden folder in the user's Google Drive — invisible in Drive UI, inaccessible to other apps. Classified as a non-sensitive scope by Google — no security review required. Consent screen reads: "View and manage its own configuration data in your Google Drive."

**Auth:** OAuth 2.0 with Google Identity Services. Client ID embedded in app — no user-facing setup required (unlike Dropbox which requires the user to paste an app key).

**CORS:** Native for all read/write operations. Only exception: token revocation needs one small Netlify function.

**Data model:** One JSON file in `appDataFolder`. Save = `POST`, restore = `GET`, update = `PATCH`. Identical pattern to Dropbox.

**Platform reach:** Near-universal — anyone with a Gmail address has Google Drive.

**vs Dropbox:**

| Dimension | Dropbox | Google Drive |
|---|---|---|
| User setup | Paste app key | Zero — just sign in |
| CORS | Needs Netlify proxy | Native (except revocation) |
| Platform reach | Requires Dropbox account | Universal |
| Data visibility | Visible in Dropbox folder | Hidden (`appDataFolder`) |

**Recommendation:** Better reach and simpler user setup than Dropbox. If building a second backup provider, this should be it.

---

### TickTick
*Researched: Mar 7, 2026*  
*Verdict: Watch — API maturing — ~2× Trello*

Good data model fit — structured tasks, priorities, due dates, built-in Today view. OAuth 2.0 only; developer portal registration may require approval.

CORS support unclear from official docs — likely needs a Netlify proxy. No single "due today across all lists" endpoint — would need to fetch all lists and filter client-side.

API is newer and less mature than Todoist. Popular unofficial libraries suggest the official API has historically been limited.

**Recommendation:** Todoist covers the same audience more cleanly. Revisit if TickTick-specific demand arises.

---

### Microsoft Planner
*Researched: Mar 2026*
*Verdict: Feasible but complex — ~2.5× Trello. Significant constraints to understand before building.*

**What it is:** Team task management built into Microsoft 365. Tasks live inside Plans, Plans live inside Microsoft 365 Groups (Teams, SharePoint, etc.). Deeply integrated into the Microsoft collaboration ecosystem but not a personal task tool.

**Auth:** OAuth 2.0 via Microsoft Graph. Requires Azure AD app registration — same setup as Microsoft To Do. However, unlike To Do, **personal Microsoft accounts are not supported**. The user must have a work or school Microsoft 365 account.

**CORS:** Native for read operations via `graph.microsoft.com` — no Netlify proxy needed.

**The data model problem — no "today" endpoint:**
Planner has a 3-level hierarchy: Group → Plan → Task. There is no flat endpoint for "all tasks assigned to me due today." The closest is `GET /me/planner/tasks` which returns all tasks assigned to the user across all plans — with no server-side due-date filter. Filtering to today must happen client-side after downloading everything. For users with many tasks across many plans this is a meaningful payload.

Compare to Todoist: `GET /rest/v2/tasks?filter=today` — one call, server-filtered, done.

**Minimum calls to get today's tasks:**
1. `GET /me/memberOf` — fetch user's groups
2. `GET /groups/{id}/planner/plans` — fetch plans per group (once per group)
3. `GET /planner/plans/{id}/tasks` — fetch tasks per plan (once per plan)
4. Filter client-side by `dueDateTime` and `assignments` containing current user

**Premium plans are a dead end:**
Planner Premium (the upgraded version with sprints, goals, and task history) does not work with the Graph API at all. Premium plan data is stored in Dataverse with an undocumented schema. If the user is on Planner Premium, the API cannot see their tasks.

**Writeback:** `PATCH /planner/tasks/{id}` with `percentComplete: 100`. Planner uses 0–100 progress, not binary done/not-done. Requires an `If-Match` header with the task's current etag — every write needs a prior read to get the etag.

**Data model fields:** `title`, `dueDateTime`, `percentComplete`, `assignments` (object keyed by user ID), `planId`, `bucketId`

**Key unresolved product question:** What does "done" mean in TODAY for a Planner task? Setting `percentComplete: 100` closes the task in Planner permanently. This may not be what the user intends when checking off a task for the day. Needs explicit product decision before any writeback is built.

**vs Microsoft To Do:**

| Dimension | Microsoft To Do | Microsoft Planner |
|---|---|---|
| Personal accounts | ✅ Yes | ❌ No — work/school only |
| "Today" endpoint | ✅ OData filter | ❌ Client-side filter only |
| Data model | Flat task list | Group → Plan → Task hierarchy |
| Premium tier API | N/A | ❌ Completely incompatible |
| Auth complexity | Same | Same |

**Recommendation:** If your brother uses a personal Microsoft account, Planner is not accessible via API. If he has a work Microsoft 365 account and uses Basic Planner (not Premium), it's feasible — but Microsoft To Do is simpler to build, works for more users, and captures the same Microsoft 365 audience. Build To Do first. Revisit Planner if there's specific team-task demand.

**Complexity rating:** ~2.5× Trello

---

### iCloud / CloudKit JS
*Researched: Mar 9, 2026*  
*Verdict: Viable for Apple-heavy audience — ~2.5× Trello*

**How it works:** CloudKit JS stores data in a private CloudKit database scoped to the user's Apple ID — invisible in iCloud Drive, persistent and cross-device. Conceptually identical to Dropbox backup, using iCloud as the storage layer instead.

**Auth:** API token created once in CloudKit Dashboard (embedded in app — no user setup). User signs in via Apple-hosted popup.

**CORS:** Native — no proxy needed.

**Developer requirement:** Apple Developer Program membership ($99/year). If the subscription lapses, the container may become inaccessible.

**iOS Safari:** Works correctly in standard mobile Safari. Earlier concerns about iOS Safari compatibility were based on outdated 2015 webview-specific issues — not applicable to a web app running directly in Safari.

**Key limitation:** Apple ID required — excludes Android, Windows, and non-Apple users entirely.

**Recommendation:** Worth building if the audience is confirmed Apple-heavy. Google Drive is the better choice for cross-platform reach.

---

### Jira
*Researched: Mar 7, 2026*  
*Verdict: Feasible, needs product decisions first — ~2.5–3× Trello*

**Auth:** OAuth 2.0 (3LO) recommended — supports CORS natively via `api.atlassian.com`. API Token + Basic Auth is simpler but does not support browser CORS — requires a Netlify proxy for all calls.

**Data model:** Rich — status, priority, assignee, sprint, labels, story points. JQL is powerful: `assignee = currentUser() AND statusCategory != Done`.

**Key unresolved question:** What does "done" mean in TODAY for a Jira issue? Status transitions vary per project workflow and require fetching transition IDs before any writeback.

**Recommendation:** Start read-only. Define done semantics before any writeback. Use OAuth 2.0 if proceeding.

---

### Notion
*Researched: Mar 7, 2026*  
*Verdict: Avoid — ~3–4× Trello*

No standard schema — every workspace is different. Property names for due date, status, and done vary per user. Would require field mapping config from the user — significant UX burden.

Notion API does not support direct browser requests — Netlify proxy required. API is actively breaking: 2025-09-03 version introduced multi-source databases with a non-backwards-compatible `database_id` → `data_source_id` migration.

**Recommendation:** Do not build. Todoist covers 80% of Notion's audience at 20% of the complexity.

---

### OneNote
*Researched: Mar 7, 2026*  
*Verdict: Do not build — ~4× Trello*

OneNote is a note-taking canvas, not a task manager. The API returns HTML page content — extracting tasks requires parsing arbitrary HTML to find checkboxes. No `GET /tasks?due=today` equivalent exists.

The Microsoft-recommended path for OneNote tasks is Power Automate to bridge into Microsoft To Do — which confirms how unintegrated they are natively.

**Recommendation:** Integrate Microsoft To Do instead. Captures the same audience (including OneNote-flagged items) at a fraction of the complexity.

---

## 3. Technical Gotchas

Findings from implementation — things not obvious from docs.

| Finding | Context |
|---|---|
| `window.open()` must be synchronous | iOS Safari blocks popups opened after `await`. Call `window.open()` before any async operation in OAuth flows. Affects Trello and Dropbox auth. |
| `@font-face` rejects CSS variables | `font-family: var(--font-mono)` inside `@font-face` registers a font literally named `"var(--font-mono)"`. Browser never matches it to usage sites. Always use raw strings in `@font-face` declarations. |
| Dropbox `rev` prevents restore loops | Without tracking the last-seen rev, every sync tick re-downloads our own writes. Seed `lastDropboxRev` on startup, update after every backup. |
| Union merge requires explicit delete tracking | Absence of a task is ambiguous — could mean "never added" or "deleted". Without `deleted_ids`, deletes are lost on merge. Same applies to unchecks via `unchecked_ids`. |
| `stat_last_visit` must never be restored from Dropbox | Restoring it would trigger `checkNewDay()` on the restoring device, wiping today's tasks. It is local device state only — excluded from backup/restore. |
| Trello OAuth token arrives in URL hash | `#token=xxx` — not a query param. Must read from `window.location.hash`, not `window.location.search`. |
| `new Date()` must never be cached at module load | If `new Date().toDateString()` is captured once at startup, it goes stale if the app is left open past midnight. `checkNewDay()` and `applyNewDayCleanup()` must call `new Date()` fresh on every invocation — never read from a module-level constant. |
| CSS animations override `!important` on opacity | A `animation: fadeIn` rule with `fill-mode: forwards` on `.task` will hold `opacity:1` as the fill value, silently defeating `.task.done { opacity: 0.25 !important }`. Never apply animations on the base element rule. Apply via a class removed on `animationend`, using `fill-mode: backwards`. |
| Done-state visuals must be applied on render, not only on toggle | `toggleDone()` applies inline styles (opacity, strikethrough, checkbox colour) directly on the element. But `renderManual()` and `renderTrello()` build HTML fresh — without calling the same style assignments, done tasks render at full opacity on every page load. Extract visual application into a shared helper (`_applyDoneStyles`) and call it from all render paths. |
| Splash must not gate on async work | If the splash dismisses only after async startup (Dropbox restore, Trello fetch), the app appears frozen during the wait. `init()` must run before the splash IIFE — rendering from localStorage synchronously. The splash is cosmetic; the two-flag gate (`_splashAnimDone` + `_appLoadDone`) ensures it dismisses only when both animation and async work are done, with no visible freeze. |
| HTML5 drag API does not fire on touch | `dragstart`, `dragover`, `drop` are mouse-only events. Touch devices need a completely separate engine: `touchstart` (long-press timer) → `touchmove` (move ghost clone) → `touchend` (commit). The two engines coexist but must not interfere — long-press fires after 380ms, so any touch movement before that cancels the press timer cleanly. |
| `e.target.closest()` throws on text nodes and SVG children | During drag and touch events, `e.target` can be a text node (`nodeType === 3`) or an SVG child element — neither has `.closest()`. Always guard with `if (!(e.target instanceof Element)) return` before any `.closest()` call in event handlers. |
| `draggable=true` on mousedown: balance drag reliability vs text selection | If `draggable` is deferred (set after 4px movement), `dragstart` fires before the attribute is set — the first drag attempt is silently ignored. If set immediately on mousedown, text selection is blocked. Resolution: set `draggable=true` immediately on mousedown for drag reliability, and suppress text selection with `row.style.userSelect = 'none'` while the button is held. Restore `userSelect` on mouseup (via `setTimeout(0)`) and on `dragend`. This preserves both behaviours. |
| `touchstart` passive:true prevents `preventDefault` in `touchmove` | If `touchstart` is registered as passive, calling `e.preventDefault()` in `touchmove` is silently ignored on iOS — the browser has already committed to scroll. Register `touchmove` as `{ passive: false }` and lock scroll prevention only after horizontal intent is confirmed (≥10px horizontal movement exceeding vertical). |
| `e.target.closest('a')` blocks drag on rows containing links | `closest('a')` walks up the DOM and returns true for any click anywhere inside a row that contains a link — including clicks on the row body far from the link. Use `e.target.tagName === 'A'` to block drag only when the link element itself is the click target. |
| `style.left/top` on drag ghost causes layout thrash | Setting `ghost.style.left` and `ghost.style.top` on every `touchmove` triggers layout recalculation up to 60 times per second. Replace with `ghost.style.transform = 'translate(Xpx, Ypx)'` — pure GPU compositing, zero layout cost. Combine with `will-change: transform` on the ghost element to promote it to its own layer before animation starts. |
| `background` in CSS `transition` causes repaint on hover | Including `background` in a transition list means the browser runs a repaint on every frame during hover enter/exit. If the background change is intended to be instant (fast snap), remove it from `transition` entirely — the value still changes immediately, but without the per-frame paint cost. |
| CSS `grab` cursor persists into focus mode | Drag-to-reorder sets `cursor: grab` on task rows. When focus mode activates, the grab cursor remains even though drag is disabled. Requires an explicit override: `.focusing .task.focused { cursor: default }`. Non-focused tasks are `pointer-events: none` and don't need overrides. |


---

## 4. Habits — Research & Decision Log
*Researched and decided: Mar 2026*

### Why habits fit TODAY despite the "one day" philosophy

TODAY's thesis is no accumulation, no carry-forward, clean slate. Habits are the opposite — they are explicitly multi-day and persistent. The tension was unresolved in the MVP.

**Resolution:** habits and tasks answer different questions. Tasks: what do I do today? Habits: who am I trying to become? They share the same morning context but operate on different time horizons. The panel separation (habits above tasks, in their own collapsible panel) enforces this distinction visually and conceptually.

### The streak anxiety problem

Initial implementation used a consecutive streak counter (`Nd`). Research confirmed this creates exactly the anxiety TODAY is designed to remove:

- Streaks create a single point of failure — one missed day resets everything
- As streaks grow, the fear of losing them replaces the intrinsic motivation for the habit itself
- Users report "racing through" habits just to preserve a number — the number becomes the goal, not the habit
- Studies show 80% consistency produces nearly identical long-term habit formation to 100% — but streaks punish anything below 100%

**Decision (v1.6.31):** removed streak counter entirely. No consecutive counter exists in the codebase.

### Habit strength % — the chosen approach

Replaced with **exponential smoothing score (0–100%)**, the same algorithm used by Loop Habit Tracker.

**Formula:**
```
score_today = score_yesterday × α + (1 if done, 0 if not) × (1 - α)
α = 0.9
```

**Why α = 0.9:**
- Strong memory of past behaviour — a long consistent run builds real weight
- Recent days matter more than old ones, but old days still count
- A few missed days cause a modest drop, not a reset
- Recovery after a gap is fast — a week back in the habit restores most of the score

**Observed behaviour at α = 0.9 over 90-day window:**

| Scenario | Score |
|---|---|
| Perfect 7 days (new habit) | ~52% |
| Perfect 30 days | ~96% |
| 30 perfect, missed last 3 | ~70% |
| 30 perfect, missed last week | ~46% |
| 5/7 days for 4 weeks | ~74% |
| Every other day, 40 days | ~52% |

**Hot threshold:** ≥ 70% — accent colour applied. Reachable with 5/7 consistency over a month. Not trivially earned, not impossibly high.

### Alternatives considered

| Option | Rejected because |
|---|---|
| Consecutive streak (original) | Single point of failure, anxiety-inducing |
| Weekly rate (X/7) | Loses long-term signal, resets too frequently |
| Dots only, no number | Considered — kept strength % as it adds precision the dots don't give |
| Year-in-pixels view | Interesting but doesn't fit TODAY's spatial constraints |

### What habit strength does NOT measure

- It does not know *why* you missed a day
- It does not distinguish a planned rest day from a forgotten day
- It does not account for habit frequency (daily vs 3x/week) — all habits are currently daily

### Open question: non-daily habits

The current model assumes every habit is a daily habit. A user might want "exercise 3x/week" rather than "exercise every day." The strength algorithm would need a `frequency` parameter to handle this correctly — a 3x/week habit at 100% would only have 3 completions in 7 days, which currently scores ~52%.

**Status:** not yet designed. Worth solving before habits are shared with other users.

---
