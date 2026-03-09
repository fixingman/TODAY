# TODAY — Product Research Log

> Running notes on integrations, market landscape, and product decisions.
> Updated as research happens across sessions.

---

## Todo App Market Landscape
*Researched: Mar 7, 2026*

Most used todo apps in rough order of adoption:

- **Todoist** — #1 for actual power-user adoption. Natural language input, filters, deep integrations, every platform.
- **Microsoft To Do** — quiet giant. Massive install base from Microsoft 365/Outlook bundling. Free.
- **TickTick** — fast-growing challenger. Calendar, Eisenhower matrix, habit tracking, Pomodoro. Very feature-dense.
- **Things 3** — Apple-only design darling. Minimal, no subscription. Cult following.
- **Notion / Any.do / ClickUp** — blurry middle between todo and project management.

**Key insight:** ~47% user churn on todo apps — people get overwhelmed by feature weight and leave.
TODAY's constraint-by-design (focus-first, not organiser-first) is a differentiator, not a weakness.

**Key insight:** ~48% of users prefer apps with third-party integrations.
Trello connection already addresses this. Todoist next would cover the biggest power-user overlap.

---

## Integration Research

---

### Jira
*Researched: Mar 7, 2026*
*Verdict: Feasible, ~2.5–3× complexity of Trello*

**Auth:**
- API Token + Basic Auth (email:token) — simplest, same UX pattern as Trello config. Tokens expire in ~1 year.
- OAuth 2.0 (3LO) — proper flow, needs Atlassian developer console app registration + Netlify function for token exchange.
- PAT — Server/Data Center only, not Cloud.

**CORS:** Jira Cloud does NOT support browser CORS for API token auth.
Requires a Netlify proxy function for all API calls.
OAuth 2.0 via `api.atlassian.com` does support CORS natively.

**Data model:** Rich — status, priority, assignee, sprint, labels, story points. JQL is powerful.
Key product question: what does "done" mean in TODAY for a Jira issue?
- Check off = mark Done in Jira? Or just local dismiss for today?
- Status transitions vary per project workflow (need to fetch transition IDs).

**Complexity breakdown:**
| Dimension | Rating |
|-----------|--------|
| Auth setup | Medium |
| CORS | Needs 1–2 Netlify functions |
| Data mapping | Requires product decisions |
| Sync conflict handling | Complex (status workflows) |
| Overall | ~2.5–3× Trello |

**Recommendation:** Start read-only (JQL: `assignee = currentUser() AND statusCategory != Done`).
Define "done" semantics before building writeback. OAuth 2.0 worth doing right if proceeding.

---

### Notion
*Researched: Mar 7, 2026*
*Verdict: Most complex, ~3–4× Trello — proceed with caution*

**How users store todos:** No standard schema. Notion offers 3 official templates (simple list, projects+tasks, projects+tasks+sprints) but in practice every workspace is different. Property names for due date, status, done vary per user.

Notion has a "My Tasks" aggregation feature but requires databases to be explicitly designated as Task databases with specific property types.

**Auth:** Simple — internal integration token, created at `notion.so/my-integrations`. User pastes token in config + shares specific databases. No OAuth redirect needed for basic integration.

**CORS:** Notion API does NOT support direct browser requests. Needs a Netlify proxy function.

**Data model problem:** No guaranteed field names. Would need user to configure a field mapping in TODAY's config panel:
- Which property is their due date?
- Which property is their status?
- Which value means "done"?
This is a non-trivial config UX burden.

**API stability:** Actively breaking — 2025-09-03 version introduced multi-source databases, not backwards compatible. `database_id` → `data_source_id` migration required.

**Complexity breakdown:**
| Dimension | Rating |
|-----------|--------|
| Auth setup | Low (token paste) |
| CORS | Needs 1–2 Netlify functions |
| Schema consistency | None — fully user-defined |
| Config complexity | High — user maps own fields |
| API stability | Poor — actively evolving |
| Overall | ~3–4× Trello |

**Recommendation:** Read-only only, due-date filtered, with simple field mapping in config panel.
Do NOT attempt writeback. Consider Todoist first — 80% of Notion audience overlap at 20% complexity.

---

### Todoist
*Researched: Mar 7, 2026*
*Verdict: Best-in-class integration candidate — ~1.5× Trello complexity*

**How users store todos in Todoist:**
Todoist is structured and consistent — every user has the same schema. Tasks live in projects, have due dates, priority levels (p1–p4), labels, and sections. The "Today" view is a first-class concept in Todoist itself, surfacing all tasks due today across all projects. This maps almost perfectly to TODAY's model.

**Auth:**
Two options:
- **Personal API token** — user copies token from Settings → Integrations → Developer. Simple paste into config panel, no OAuth flow. Tokens don't expire. Perfect for a personal-use app like TODAY.
- **OAuth 2.0** — full redirect flow via `todoist.com/oauth/authorize`. Requires app registration in the Todoist App Management Console (client ID + secret). Cleaner UX for multi-user scenarios.

For TODAY, the personal API token path is the simplest possible auth story — even easier than Dropbox or Trello.

**CORS:**
Todoist API supports CORS from any origin for all endpoints except the initial OAuth flow. Direct browser requests work natively — no Netlify proxy needed. This is a major advantage.

**Data model — excellent fit:**
`GET /rest/v2/tasks?filter=today` returns all tasks due today across all projects. Clean, simple, no schema mapping needed. Each task has:
- `content` — task text
- `due` — due date object with date, datetime, timezone
- `priority` — 1 (normal) to 4 (urgent)
- `is_completed` — boolean
- `project_id` — which project it belongs to
- `url` — deep link back to Todoist

Writeback is equally clean: `POST /rest/v2/tasks/{id}/close` marks a task complete. One call, no workflow logic.

**Sync API bonus:**
Todoist also offers a Sync API for incremental updates — only fetching what's changed since last sync. Efficient for the background sync pattern already built in TODAY.

**Rate limits:** 1000 requests per user per 15 minutes — generous for TODAY's use case.

**API stability:** Stable REST API v2, actively maintained, well documented.

**Complexity breakdown:**
| Dimension | Rating |
|-----------|--------|
| Auth setup | Very low — personal token paste |
| CORS | ✓ Native, no proxy needed |
| Data model fit | Excellent — today filter built-in |
| Writeback | Trivial — one POST call |
| API stability | Stable, actively maintained |
| Overall | ~1.5× Trello |

**Recommendation:** The highest priority integration after Trello. Shares the same power-user audience, has a built-in "today" filter that maps perfectly to TODAY's model, requires no proxy, and the personal token auth is the simplest of any integration researched. If only one more integration gets built, this is it.

---

### TickTick
*Researched: Mar 7, 2026*
*Verdict: Possible but limited API access — ~2× Trello, gated developer portal*

**How users store todos in TickTick:**
TickTick is structured similarly to Todoist — tasks in lists/projects, due dates, priorities, tags. It also has a built-in "Today" view. Data model is a good fit for TODAY.

**Auth:**
OAuth 2.0 only. Requires registering an app at `developer.ticktick.com` to get a client ID and secret. The developer portal is less polished than Todoist's — access may require approval. Scopes are `tasks:read` and `tasks:write`.

**CORS:**
TickTick's official API (`api.ticktick.com/open/v1/`) uses OAuth Bearer tokens. CORS support is unclear from official docs — most third-party integrations go via Pipedream or similar proxy platforms, which suggests direct browser access may not be supported. A Netlify proxy function is likely needed.

**Data model:**
Clean and consistent — tasks have title, due date, priority, status, project ID. `GET /open/v1/project/{projectId}/data` fetches tasks per list. There's no single "due today across all lists" endpoint like Todoist — you'd need to fetch all lists then filter client-side.

**API maturity concern:**
The official API is relatively new and not as well documented as Todoist. There's a popular unofficial Python library (`ticktick-py`) suggesting the official API has historically been limited. No webhook support natively.

**Complexity breakdown:**
| Dimension | Rating |
|-----------|--------|
| Auth setup | Medium — developer portal registration |
| CORS | Uncertain — likely needs proxy |
| Data model fit | Good but no cross-list today filter |
| Writeback | Supported |
| API stability | Less mature than Todoist |
| Overall | ~2× Trello |

**Recommendation:** Worth watching but Todoist covers the same audience more cleanly. If TickTick-specific demand arises, revisit — the API is maturing. Not a priority over Todoist.

---

### OneNote (Microsoft 365)
*Researched: Mar 7, 2026*
*Verdict: Not recommended — wrong tool for the job, ~4× Trello complexity*

**How users store todos in OneNote:**
OneNote is fundamentally a note-taking canvas, not a task manager. Users store todos in three loose ways:
- Checkbox items on notebook pages (no due date, no structure)
- Flagged items using the "To Do" tag — these can sync to Microsoft To Do via Outlook Tasks on Windows only
- Free-form meeting notes with action items buried in prose

There is no centralised, queryable task database. Tasks don't have consistent due dates, statuses, or IDs. The recommended Microsoft path is Power Automate to bridge OneNote and Microsoft To Do — which tells you something about how unintegrated they are natively.

**Key structural problem:**
OneNote is a page/notebook hierarchy, not a task list. The API returns HTML page content — you'd have to parse arbitrary HTML to find checkboxes. There's no `GET /tasks?due=today` equivalent.

**Auth:**
OAuth 2.0 via Microsoft Graph (`graph.microsoft.com`). Requires registering an app in Azure Active Directory (Azure Portal) — significantly more complex than Dropbox or Trello. As of March 31, 2025, the OneNote API no longer supports app-only authentication — delegated (user) auth only. Full OAuth redirect flow required, similar to Dropbox PKCE.

**CORS:**
Microsoft Graph supports CORS for browser requests with a valid OAuth token — no Netlify proxy needed for API calls. However Azure app registration and OAuth flow adds its own complexity layer.

**Data model:**
The API exposes notebooks, sections, section groups, and pages — not tasks. To get anything resembling a task list you'd need to:
1. Fetch all pages across all notebooks
2. Parse the HTML content of each page
3. Extract checkbox elements
4. Try to infer due dates from surrounding text

This is fragile, slow, and breaks on any non-standard formatting.

**The Microsoft To Do angle (better path):**
Microsoft To Do is the single destination for personal tasks in Microsoft 365 — integrated with Outlook, Teams, and OneNote flags. If someone uses OneNote for todos, they almost certainly also have Microsoft To Do. Integrating with To Do directly (`/me/todo/lists` via Graph) captures the same audience much more cleanly with proper due dates, status, and IDs.

**API stability:** Stable for Microsoft Graph v1.0. Breaking change in Mar 2025 (dropping app-only auth) is a one-time migration, not ongoing churn.

**Complexity breakdown:**
| Dimension | Rating |
|-----------|--------|
| Auth setup | High — Azure AD app registration |
| CORS | ✓ Supported natively via Graph OAuth |
| Data model fit | Very poor — pages not tasks |
| Parsing complexity | Very high — HTML scraping |
| API stability | Stable (v1.0) |
| Overall | ~4× Trello, not recommended |

**Recommendation:** Do not integrate OneNote directly. If Microsoft 365 users are the target, integrate **Microsoft To Do** instead — proper task layer, clean Graph API, catches OneNote-flagged items automatically. Same audience, fraction of the complexity.

---

### Microsoft To Do
*Researched: Mar 7, 2026*
*Verdict: Strong candidate — cleanest Microsoft 365 integration, ~2× Trello complexity*

**How users store todos in Microsoft To Do:**
Microsoft To Do is the single destination for personal tasks in Microsoft 365 — deeply integrated with Outlook, Teams, and OneNote. Tasks created in those products sync with To Do automatically. Unlike Notion or OneNote, the data model is consistent and structured across all users. Every task has a title, due date, status, importance flag, and optional reminder. Task lists are the top-level container — similar to Trello boards.

**Auth:**
OAuth 2.0 via Microsoft Graph (`graph.microsoft.com`). Requires Azure AD app registration (Azure Portal) — same as OneNote, which is the main complexity overhead. Two permissions needed: `Tasks.Read` for read-only, `Tasks.ReadWrite` for writeback. Access tokens are short-lived (typically 1 hour) — refresh token required for persistent access. Token refresh pattern is identical to what's already built for Dropbox.

**CORS:**
Microsoft Graph supports CORS natively for browser requests with a valid OAuth token. No Netlify proxy needed for API calls — a significant advantage over Jira and Notion.

**Data model — very clean fit for TODAY:**
A `todoTaskList` is a logical container of `todoTask` resources. To get all task lists: `GET /me/todo/lists`. To get tasks from a list: `GET /me/todo/lists/{listId}/tasks`.

Each `todoTask` has:
- `title` — task text
- `status` — `notStarted`, `inProgress`, `completed`, `waitingOnOthers`, `deferred`
- `dueDateTime` — structured date + timezone object
- `importance` — `low`, `normal`, `high`
- `isReminderOn`, `reminderDateTime`
- `checklistItems` — subtasks

Filtering tasks due today is straightforward with OData: `$filter=dueDateTime/dateTime le '2026-03-07T23:59:59'&$filter=status ne 'completed'`

**Writeback — well supported:**
`PATCH /me/todo/lists/{listId}/tasks/{taskId}` with a JSON body updates any task property. Marking done means setting `status: 'completed'` — clean and unambiguous, unlike Jira's workflow-dependent transitions.

**Key UX consideration:**
Users have multiple lists (Work, Personal, Shopping etc.). TODAY would need to either:
- Let the user pick which list(s) to pull from — same pattern as Trello board selection
- Or pull from all lists filtered by due date — simpler but noisier

**API stability:** Stable on Graph v1.0. The Microsoft Graph Toolkit is being deprecated (retirement Aug 2026) but that's a UI component library, not the Graph API itself — no impact on a custom integration.

**Complexity breakdown:**
| Dimension | Rating |
|-----------|--------|
| Auth setup | Medium — Azure AD app registration |
| CORS | ✓ Supported natively, no proxy needed |
| Data model fit | Excellent — structured tasks with due dates |
| Writeback | Clean — single PATCH call |
| API stability | Stable (Graph v1.0) |
| Overall | ~2× Trello |

**Recommendation:** The best Microsoft 365 integration by far. Captures Outlook, Teams, and OneNote-flagged tasks in one place. Auth setup is the only real friction (Azure app registration). If the audience includes Microsoft 365 users, this is worth building — cleaner data model than Notion, simpler writeback than Jira, and no proxy needed.

---

### Trello
*Status: Already integrated (v1.0.0+)*
*Notes: Simplest API, direct browser CORS, no proxy needed. Baseline for all complexity comparisons.*

---

### iCloud / CloudKit JS
*Researched: Mar 9, 2026*
*Verdict: Viable for backup/restore — but invisible to the user and Apple-ecosystem only. ~2.5× Trello complexity.*

**How iCloud backup actually works in apps:**
This is the key distinction. There are two completely different things:

1. **iCloud Drive** — file storage the user can browse (like Dropbox). No public API. Not accessible from a web app. Dead end.
2. **CloudKit JS** — Apple's official JavaScript SDK for web apps. This IS what apps use for backup/restore/settings sync. It stores data in a private CloudKit database scoped to the user's Apple ID — invisible in iCloud Drive, but persistent, cross-device, and backed by iCloud storage. This is exactly how apps like Things 3, Bear, and Fantastical sync settings and data.

**How CloudKit JS backup would work for TODAY:**
- User signs in with Apple ID via a popup (Apple-hosted, TODAY never sees credentials)
- TODAY saves a JSON record to the user's private CloudKit database (their iCloud, invisible to us)
- On restore or new device, user signs in again, TODAY fetches the record back
- Automatic cross-device sync is possible via subscriptions

This is conceptually identical to Dropbox backup — just using iCloud as the storage layer instead.

**Auth:**
CloudKit JS uses an API token (created once in CloudKit Dashboard, embedded in the app — no user setup required) plus Apple ID sign-in via popup. No OAuth dance, no redirect URI configuration, no user-facing app key. The sign-in experience is: click "Connect iCloud" → Apple popup → done. Cleaner than Dropbox from the user's perspective.

**Setup requirements (developer side):**
- Apple Developer Program membership ($99/year) — required to create a CloudKit container
- Register a container in CloudKit Dashboard (e.g. `iCloud.com.yourapp.today`)
- Generate an API token in the dashboard
- Embed the token and container ID in the app — no user configuration needed

**CORS:** CloudKit JS is hosted at `cdn.apple-cloudkit.com` and handles CORS natively. No Netlify proxy needed.

**Data model — perfect fit:**
CloudKit stores structured records with typed fields. A TODAY backup would be a single record per user in their private database:
```json
{
  "recordType": "TodayBackup",
  "fields": {
    "tasks": { "value": "<JSON string>", "type": "STRING" },
    "settings": { "value": "<JSON string>", "type": "STRING" },
    "backedUpAt": { "value": <timestamp>, "type": "TIMESTAMP" }
  }
}
```
Save = `saveRecord()`, restore = `fetchRecord()`. Same pattern as Dropbox.

**Key limitations:**
- **Apple ecosystem only** — requires an Apple ID. Android users, Windows users, and people without iCloud accounts are excluded entirely.
- **Invisible to the user** — data is not accessible outside TODAY. No way to browse, export, or manually restore from iCloud.com. If TODAY disappears, the backup is stranded.
- **Apple Developer Program required** — $99/year. If the subscription lapses, the container may become inaccessible.
- **Auth on iOS Safari works** — Apple's own documentation explicitly states CloudKit JS is supported on Safari across all platforms. The sign-in flow opens an Apple-hosted popup which works in standard mobile Safari. The only caveat Apple notes is for webviews inside native apps (e.g. Ionic), which must launch the sign-in page in a native browser — irrelevant to TODAY since it runs directly in Safari, not inside a native app wrapper.

**Complexity breakdown:**
| Dimension | Rating |
|-----------|--------|
| Developer setup | Medium — Apple Dev Program + CloudKit Dashboard |
| User auth | Low UX complexity (Apple popup) but broken on iOS browsers |
| CORS | ✓ Native, no proxy needed |
| Data model fit | Excellent — private records per user |
| Platform reach | Medium — Apple ID only, but works on all browsers incl. iOS Safari |
| Overall | ~2.5× Trello, but iOS blocker is severe |

**Recommendation:**
CloudKit JS is a genuine contender for TODAY's backup layer. The data model fits perfectly, auth works on iOS Safari (contrary to earlier notes — that concern was based on outdated 2015 webview-specific issues, not standard browsers), and no Netlify proxy is needed. The main constraints are that it requires an Apple Developer Program membership ($99/year) and only serves users with an Apple ID. For an app whose primary audience is likely iPhone users, that's actually a reasonable assumption. Worth building if the audience is confirmed Apple-heavy. Google Drive is the better choice for cross-platform reach.

---

### Google Drive
*Researched: Mar 9, 2026*
*Verdict: Excellent backup candidate — the `drive.appdata` scope is purpose-built for this exact use case. ~2× Trello complexity.*

**The key discovery — `drive.appdata` scope:**
Google Drive has a purpose-built scope for exactly what TODAY needs: `https://www.googleapis.com/auth/drive.appdata`. This gives your app a hidden `appDataFolder` in the user's Google Drive — invisible in the Drive UI, inaccessible to other apps, only readable/writable by TODAY. It's the Google equivalent of CloudKit's private database. Critically, it's classified as a **non-sensitive scope** by Google, which means no security review or verification process is required to use it.

The consent screen just says "View and manage its own configuration data in your Google Drive" — a minimal, non-scary permission that users are comfortable granting.

**Auth:**
OAuth 2.0 with Google Identity Services. User clicks "Connect Google Drive" → Google-hosted consent popup → done. Requires a Google Cloud project and OAuth client ID (free, no paid tier needed). Client ID is embedded in the app — no user-facing setup required, similar to CloudKit.

Token management: access tokens expire in 1 hour, refresh tokens are long-lived. Same refresh pattern already built for Dropbox. The token revocation endpoint doesn't support CORS so token revocation (disconnect) needs a small Netlify function — but all actual read/write API calls work directly from the browser.

**CORS:**
The Drive REST API (`googleapis.com/drive/v3/`) supports CORS natively with a valid OAuth token. Direct browser requests work for all file operations. The only exception is token revocation — minor, one Netlify function needed only for the disconnect button.

**Data model — perfect fit:**
Save: `POST` a `config.json` to `appDataFolder` — one file, one call.
Restore: `GET /drive/v3/files?spaces=appDataFolder` to find the file ID, then `GET` the file contents.
Update: `PATCH` the existing file.

```json
GET /drive/v3/files?spaces=appDataFolder&fields=files(id,name,modifiedTime)
GET /drive/v3/files/{fileId}?alt=media
```

Each user's backup sits in their own Google Drive — you never see it, it counts against their quota (15GB free), and it persists across devices and cache clears. Identical model to Dropbox and CloudKit.

**Platform reach:**
Google accounts are essentially universal — far broader reach than Apple ID (iCloud). Works on iOS, Android, desktop, all browsers. Anyone with a Gmail address already has Google Drive.

**Developer setup:**
- Create a Google Cloud project (free)
- Enable the Drive API
- Create an OAuth 2.0 client ID (web application type)
- Add `drive.appdata` scope to the consent screen
- No paid tier, no approval process needed for this scope

**Comparison to Dropbox (current implementation):**
| Dimension | Dropbox | Google Drive |
|-----------|---------|--------------|
| Auth complexity | Medium — PKCE + Netlify functions | Medium — OAuth popup, token refresh |
| User setup | Paste app key | Zero — just sign in |
| CORS | Needs Netlify proxy | ✓ Native (except revocation) |
| Platform reach | Requires Dropbox account | Universal (Google account) |
| Data visibility | Visible in Dropbox folder | Hidden (appDataFolder) |
| Cost to developer | Free | Free |

**Complexity breakdown:**
| Dimension | Rating |
|-----------|--------|
| Developer setup | Low — free Google Cloud project |
| User auth | Low — standard Google sign-in popup |
| CORS | ✓ Native for all read/write ops |
| Data model fit | Excellent — purpose-built appDataFolder |
| Platform reach | Excellent — near-universal |
| Overall | ~2× Trello |

**Recommendation:**
Google Drive with `drive.appdata` is arguably a **better backup solution than Dropbox** for TODAY — broader reach (no Dropbox account needed), cleaner user setup (no app key to paste), and the `appDataFolder` keeps data private and invisible. The auth complexity is similar to Dropbox. If building a second backup provider, this should be it. Could eventually replace Dropbox as the primary backup option.

---

## Product Decisions Log

- **TODAY philosophy:** Focus-first, not organiser-first. One day, one list. Done fades, never disappears. Morning resets.
- **Writeback caution:** Checking off in TODAY should mean "done for today" not necessarily "done in source system" — this tension needs resolving per integration.
- **Integration pattern:** Read-only pull is always the safe first step. Writeback adds product complexity and failure surface.
