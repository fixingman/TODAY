# Connections Panel

> Documents the UX and technical flows for connecting Trello, Dropbox, and AI. The panel lives at `#configPanel` (the ✦ icon in the header). Rendered by `renderConnections()`.

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

---

## Trello

### API Key

`TRELLO_API_KEY` is a constant in `index.html` (line 3034). If you fork and self-host, replace it with your own key from [trello.com/power-ups/admin](https://trello.com/power-ups/admin). The key is public — it identifies the app, not the user.

### Auth Flow (OAuth implicit grant)

```
trelloAuth()
  → redirects to trello.com/1/authorize
      key=TRELLO_API_KEY
      response_type=token
      scope=read
      expiration=never
      return_url=today-here.netlify.app/
  → on return, URL hash contains #token=XXX
  → init() calls _checkTrelloOAuthReturn()
      extracts token from hash
      stores in localStorage('trello_token')
      calls loadTrelloBoards()
```

### Board Selection Flow

After auth, `loadTrelloBoards()` fetches the user's open boards and populates `#boardSelect`. On selection (`onBoardChange()`), `loadTrelloLists()` fetches lists for that board and populates `#listSelect`. User picks a list (defaults to "due today only"). `saveAndLoad()` saves config to `today_trello_config` in localStorage and calls `loadTrello()`.

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
**Forget** → `clearTrello()`: removes `trello_token`, `today_trello_config`, `today_trello_cache`, `today_trello_focus` from localStorage. Clears `trelloTasks = []`, calls `renderTrello()`.

### Disconnect Recovery

If token is invalid (403 from Trello API), `loadTrello()` logs error to red dot and calls `clearTrello()` automatically.

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

## AI Assistant

The AI panel is separate from the connections panel — it lives at `#aiPanel` (slides up from the ✦ add button). The connections panel at `#configPanel` shows AI as a service alongside Trello and Dropbox.

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

The AI panel itself (`#aiPanel`) only shows when a key is connected. If not connected, the ✦ button routes to the connections panel (`toggleAI()` → `openConfigPanel()`).

### Your Name (meeting mode, v2.22.0 + v2.31.0 inline capture)

**Connections panel:** Below the AI key rows, a "Your first name…" input (`#meetingNameInput`, `saveMeetingName()` on change) persists the name between meetings. Used as the attribution anchor in the meeting-extract prompt ("which action items are Can's").

**Inline capture (v2.31.0):** On the first mic tap ever (no name set), `#meetingNamePrompt` appears above the add bar — a focused name input that starts the meeting on submit, skips if empty, or dismisses on Escape. Captures identity at point of need rather than requiring Connections setup upfront.

**Storage:** `user_names` (JSON array of known first names, allows multiple) + `user_names_at` (ISO timestamp). LWW-merged via timestamp on Dropbox sync — a newer write from any device wins. In the Dropbox payload.

### Meeting Mode Privacy Stance (v2.22.0, deliberate)

- **Nothing persisted.** Audio chunks, extracted items, and the rolling context live only in the module-level `_mtg` variable and are nulled in `_meetingTeardown()`. No meeting-related localStorage keys exist. Accepted items become ordinary manual tasks — indistinguishable from typed ones.
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
| `today_trello_config` | `saveAndLoad()` | `clearTrello()` |
| `today_trello_cache` | `loadTrello()` | `clearTrello()`, new day |
| `today_trello_focus` | focus sessions | `clearTrello()`, new day |
| `dropbox_token` | OAuth token exchange | `dropboxDisconnect()` |
| `dropbox_refresh_token` | OAuth token exchange | `dropboxDisconnect()` |
| `dropbox_token_expired` | `_dropboxEnsureToken()` on fail | `dropboxAuth()` on success |
| `last_successful_backup` | `dropboxBackup()` | — |
| `last_sync_read` | `dropboxRestore()` | — |
| `ai_api_key` | `saveAIKey()` | AI forget button |
| `ai_provider` | `saveAIKey()` / `setAIProvider()` | AI forget button |
| `user_names` | `saveMeetingName()` / inline name prompt | clearing the name input |
| `user_names_at` | `saveMeetingName()` / inline name prompt | clearing the name input |
