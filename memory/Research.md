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

**Known gotcha:** `window.open()` must be called synchronously — not inside an `await`. iOS Safari blocks popups opened after async operations. Affects all OAuth flows that open a popup.

---

### Dropbox (backup)
*Status: Implemented (v1.6.0+)*

PKCE OAuth flow. Access tokens expire — refresh handled via `dropbox-refresh` Netlify function. Two Netlify functions required: token exchange and token refresh.

**Implemented behaviour:**
- Single JSON file (`/today-backup.json`) per user in their Dropbox
- Cheap metadata-only rev check every 7s — full download only if rev changed
- Union merge on restore — both devices' changes survive concurrent offline edits
- Backup schema v3.0: `manual_tasks`, `done_ids`, `deleted_ids`, `checked_ids`, `unchecked_ids`
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
