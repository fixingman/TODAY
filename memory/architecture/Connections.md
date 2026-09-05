# Connections Panel

> Documents the UX and technical flows for connecting Trello, Dropbox, and AI. The panel lives at `#configPanel` (the ✦ icon in the header). Rendered through the frozen `Today.use('connections')` component API; `assets/connections.js` owns its state, actions, and markup helpers.

---

## Layout Logic

The panel uses two layouts depending on connection state:

**Both disconnected** → side-by-side card grid (`.connections-grid`). Two equal cards, each with Connect button.

**At least one connected** → stacked rows (`.connection-row` or `.connection-expanded`). Each service is a compact row with status + actions. Trello expands when connected but board not yet selected.

`renderConnections()` is called by:
- Panel open event
- `dropboxBackup()` and `dropboxRestore()` on completion
- Sync tick (every 7s) — but returns immediately if panel is closed (performance guard)
- Token expiry detection

### One-time privacy reassurance (v2.64.11)

On the first panel open per device, a fully disconnected installation shows one quiet line immediately below the title:

> Private by design: no account, no analytics. You own your data and choose every connection.

The gate checks Trello token/config credentials, Dropbox access/refresh/expired state, and both AI provider key slots. If any exists, the first-open opportunity is silently consumed without showing the line. PWA installation and meeting-name state do not count as external connections.

`today_connections_privacy_seen=1` is written at the start of that first panel visit and remains local-only: it is not part of the Dropbox payload or merge. The line stays for that one open visit, hides on panel close or a successful in-panel AI connection, and never returns on that device. It has no CTA, dismiss control, network call, or independent animation.

### Install app row (v2.64.5–v2.64.7, module v2.64.26)

PWA installation is contextual platform help, not a data connection. Android Chromium uses the deferred native `beforeinstallprompt`; iOS/macOS Safari show their native menu instruction in place; iOS non-Safari and Firefox offer a copy-link route. Installed/standalone mode suppresses promotion. The instruction button keeps the row's computed height unchanged when its text is revealed. Runtime ownership lives in `assets/platform.js`; no install state enters Dropbox backup or sync.

---

## Trello

### API Key

`TRELLO_API_KEY` is a constant in `assets/trello.js`. If you fork and self-host, replace it with your own key from [trello.com/power-ups/admin](https://trello.com/power-ups/admin). The key is public — it identifies the app, not the user.

### Auth Flow (OAuth implicit grant)

```
trelloAuth()
  → opens trello.com/1/authorize in a popup
      key=TRELLO_API_KEY
      response_type=token
      scope=read
      expiration=never
      return_url=today-here.netlify.app/
  → popup returns to this origin with #token=XXX
  → trelloAuth() polls until the popup is same-origin
      extracts token from the popup hash
      stores localStorage('trello_token')
      closes the popup and calls loadTrelloBoards()
```

### Board Selection Flow

After auth, `loadTrelloBoards()` fetches the user's open boards and populates `#boardSelect`. On selection (`onBoardChange()`), `loadTrelloLists()` fetches lists for that board and populates `#listSelect`. User picks a list (defaults to "due today only"). `saveAndLoad()` saves config to `trello_config` in localStorage and calls `loadTrello()`.

**Trello config in localStorage:**
```json
{
  "apiKey": "TRELLO_API_KEY",
  "apiToken": "user's OAuth token",
  "boardId": "abc123",
  "todayList": "Today"
}
```

### Connected State

Shows: `Board Name → List Name` | Refresh + Forget buttons.

**Refresh** → calls `loadTrello()` (same as 7s tick but immediate).
**Forget** → `clearTrello()`: removes `trello_token`, `trello_config`, and `today_trello_cache` from localStorage. Clears `trelloTasks = []`, calls `renderTrello()`. Historical focus/aging maps remain governed by their own daily/pruning paths.

### Disconnect Recovery

Manual load failures reopen Connections and map common 401/404/405/429 responses to actionable status. Background-sync failures do not interrupt the user; non-network failures are logged to the diagnostic red dot. Cached cards remain readable during a transient network failure.

### Automated coverage (v2.71.17)

`scripts/trello-test.mjs` uses mocked Trello responses to cover board/list selection and escaping, OAuth headers without token-bearing URLs, list/due/completion-grace filtering, synced order, checklist/tag/link/done rendering, cache and first-seen state, manual/background failures, post-Dropbox reconciliation, disconnect cleanup, popup failure, and module/precache wiring.

---

## Dropbox

### App Key

`DROPBOX_APP_KEY` is a constant in `index.html` (line 3035). Used to identify the app in the OAuth flow. If self-hosting, replace with your own from [dropbox.com/developers/apps](https://www.dropbox.com/developers/apps).

Token exchange happens via Netlify function (`/.netlify/functions/dropbox-token`). The function holds the App Secret. The client only ever sees the access token and refresh token.

### Auth Flow (OAuth PKCE)

```
dropboxAuth()
  → generates PKCE code_verifier + code_challenge
  → stores code_verifier in sessionStorage
  → redirects to dropbox.com/oauth2/authorize
      response_type=code
      code_challenge=...
      redirect_uri=today-here.netlify.app/
  → on return, URL has ?code=XXX
  → _checkDropboxOAuthReturn()
      sends code + code_verifier to /.netlify/functions/dropbox-token
      receives { access_token, refresh_token, expires_in }
      stores both in localStorage
      if local data is empty (fresh install): probes Dropbox for existing backup → calls dropboxRestore(false) if found
      if local data exists (reconnect): calls dropboxAutoSave() — sync ticker will merge (v2.18.16)
```

### Token Lifecycle

- Access token: expires in ~4 hours. Stored as `dropbox_token`.
- Refresh token: long-lived. Stored as `dropbox_refresh_token`.
- `_dropboxEnsureToken()` checks expiry before each API call. If expired, calls `/.netlify/functions/dropbox-refresh` with the refresh token. On success, updates `dropbox_token`. On failure, sets `dropbox_token_expired = '1'`.

### Connected State

Shows: `Saved Xm ago` (most recent of last backup write or sync read) | Save + Restore + Forget buttons.

**Save** → `dropboxBackup()`: serialises full app state to JSON, uploads to `/today-backup.json`.
**Restore** → `dropboxRestore()`: downloads backup, calls `mergeRemoteData()`.
**Forget** → `dropboxDisconnect()`: removes all `dropbox_*` keys from localStorage. Does NOT delete the remote backup file.

### Expired State

If `dropbox_token_expired = '1'`, shows "Session expired" in danger color with Reconnect button. `dropboxAuth()` flow repeats.

### Sync Behaviour

See `architecture/Sync.md` for the full sync loop. The panel shows last activity time from `last_successful_backup` and `last_sync_read` localStorage keys.

---

## AI provider configuration

The Connections panel at `#configPanel` configures AI alongside Trello, Gmail, and Dropbox. The legacy `#aiPanel` sheet has had no trigger since v2.49.0; reachable AI behavior is inline task help and the focus companion.

### Provider Selection

Two providers: **Gemini** (Gemini 2.5 Flash, free) and **Claude** (Claude Sonnet 4.6, paid). User selects via toggle buttons (`setAIProvider('gemini'|'claude')`).

**UI state per provider:**

| Provider | Status line | Key link |
|---|---|---|
| Gemini | "Free tier — no credit card needed" | "Get free key →" → aistudio.google.com/apikey |
| Claude | "Paid API" | "Get key →" → platform.claude.com/login |

### Key Entry Flow

```
User selects provider → pastes API key into input
→ saveAIKey()
    validates key not empty
    shows "Testing…" in button
    makes test call to /.netlify/functions/ai-assist
    on success: stores key in localStorage('ai_api_key')
               stores provider in localStorage('ai_provider')
               updates button label + panel state
    on fail: shows error message, clears input
```

**Key storage:**
- `ai_api_key` — the raw API key (never sent to any third party — routes only through Netlify function)
- `ai_provider` — `'gemini'` or `'claude'`

### Connected State

Shows provider badge (Gemini/Claude) with key partially masked. Forget button removes both localStorage keys.

Provider state also controls the focus-companion affordance and background/inline AI calls. It does not reveal the orphaned `#aiPanel` sheet.

### Your Name (meeting mode, v2.22.0 + v2.31.0 inline capture)

**Connections panel:** Below the AI key rows, a "Your first name…" input (`#meetingNameInput`, `saveMeetingName()` on change) persists the name between meetings. Used as the attribution anchor in the meeting-extract prompt ("which action items are Can's").

**Inline capture (v2.31.0):** On the first mic tap ever (no name set), `#meetingNamePrompt` appears above the add bar — a focused name input that starts the meeting on submit, skips if empty, or dismisses on Escape. Captures identity at point of need rather than requiring Connections setup upfront.

**Storage:** `user_names` (JSON array of known first names, allows multiple) + `user_names_at` (ISO timestamp). LWW-merged via timestamp on Dropbox sync — a newer write from any device wins. In the Dropbox payload.

### Meeting Mode Privacy Stance (v2.22.0, deliberate)

- **Nothing persisted, except four numbers.** Audio chunks, extracted items, and the rolling context live only in the module-level `_mtg` variable and are nulled in `_meetingTeardown()`. Accepted items become ordinary manual tasks — indistinguishable from typed ones. **Deliberate exception (v2.37.4):** `appMemory.meetingAttribution` keeps four cumulative integer counters (items shown as mine and kept, items shown as others' and reclaimed) so attribution accuracy can be checked over time — no item text, no owner names, no transcript. This is the one meeting-related thing that survives `_meetingTeardown()`.
- **No transcript, ever.** `meeting-extract.js` instructs Gemini to transcribe internally and return only `{actionItems, updatedContext}`; the transcript is never in the HTTP response, never rendered, never stored.
- **No voice ID, ever.** Attribution comes from `today_user_name` + conversational content + the user's review tap. Storing a voice fingerprint was explicitly rejected — it would be the most privacy-hostile artifact the feature could create.
- **Audio leaves the device only as in-flight chunks** to the user's own Netlify function → Gemini, using the user's own key. Same trust model as every other AI call in the app.

---

## First-Run / Onboarding

There is no onboarding flow. The connections panel is the first-run experience. On the first open:

1. App renders with empty task list
2. Header shows ✦ icon (Connections) and ℹ icon (About)
3. Connections panel shows the two-card grid (both disconnected)
4. User can start adding tasks immediately — no connection required
5. Connections are additive: Dropbox for sync, Trello for card import, AI for companion

**Recommended sequence** (not enforced):
1. Add a few tasks to see the app
2. Connect Dropbox to keep data safe and sync across devices
3. Connect Trello if you use it
4. Connect AI if you want the companion

Nothing blocks task entry. The app is fully functional without any connection.

---

## localStorage Keys Summary

| Key | Set by | Cleared by |
|---|---|---|
| `trello_token` | OAuth return | `clearTrello()` |
| `trello_config` | `saveAndLoad()` | `clearTrello()` |
| `today_trello_cache` | `loadTrello()` | `clearTrello()`, new day |
| `today_trello_focus` | focus sessions | `clearTrello()`, new day |
| `dropbox_token` | OAuth token exchange | `dropboxDisconnect()` |
| `dropbox_refresh_token` | OAuth token exchange | `dropboxDisconnect()` |
| `dropbox_token_expired` | `_dropboxEnsureToken()` on fail | `dropboxAuth()` on success |
| `last_successful_backup` | `dropboxBackup()` | — |
| `last_sync_read` | `dropboxRestore()` | — |
| `today_ai_key_gemini` | `saveAIKey('gemini')` | Gemini Forget button |
| `today_ai_key_claude` | `saveAIKey('claude')` | Claude Forget button |
| `today_ai_provider` | `saveAIKey()` / `setDefaultProvider()` | AI forget button when no provider remains |
| `user_names` | `saveMeetingName()` / inline name prompt | clearing the name input |
| `user_names_at` | `saveMeetingName()` / inline name prompt | clearing the name input |
| `today_connections_privacy_seen` | first Connections-panel open | never automatically; local-only and not synced |
