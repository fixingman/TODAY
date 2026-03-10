# TODAY

A single-day task manager. One screen, one list, one day.

Nothing carries over. Nothing accumulates. The morning is a clean slate.

**[today-here.netlify.app](https://today-here.netlify.app)**

---

## What it does

- Add tasks for today, check them off as you go
- Pull in cards from a Trello board so you don't re-enter work tasks
- Sync state across devices via your own Dropbox
- Focus mode (desktop) — click any task to start a 25-minute Pomodoro session
- Works offline after the first load
- No account. No server. Your data stays in your browser and your Dropbox.

---

## Stack

Single HTML file. No framework, no build step, no bundler.

- Vanilla JS + CSS
- Service worker for offline support
- Two Netlify Functions for Dropbox OAuth token exchange
- Fonts self-hosted (Syne + DM Mono)

---

## Deploy your own

### 1. Fork and connect to Netlify

Fork this repo, then create a new Netlify site from it.

```
Build command:   (leave empty)
Publish dir:     .
Functions dir:   netlify/functions
```

### 2. Set up a Dropbox app

Dropbox sync is optional but recommended for multi-device use.

1. Go to [dropbox.com/developers/apps](https://www.dropbox.com/developers/apps)
2. Create a new app — **Scoped access**, **Full Dropbox** or **App folder**
3. Under **OAuth 2**, set the redirect URI to your Netlify URL: `https://your-site.netlify.app/`
4. Note your **App key** and **App secret**

In Netlify → Site settings → Environment variables, add:

```
DROPBOX_APP_KEY      = your app key
DROPBOX_CLIENT_SECRET = your app secret
```

Redeploy after adding the env vars.

When you open the app, go to the Dropbox panel (cloud icon) and enter your App key to connect.

### 3. Connect Trello (optional)

Trello pulls in cards from a board and list of your choice. Read-only.

1. Get your Trello API key at [trello.com/power-ups/admin](https://trello.com/power-ups/admin)
2. Open `index.html` and replace the `TRELLO_API_KEY` constant near the top of the `<script>` block with your own key
3. In the app, open the Trello panel (⚡ icon) and follow the connect flow

---

## How the sync works

Each device stores state in `localStorage`. Dropbox holds a single JSON backup file (`/today-backup.json`). On startup and every 7 seconds the app does a cheap metadata check — a full sync only happens if the file actually changed.

Concurrent edits are handled with union merge: tasks added on two devices offline both survive. Deletes and check/uncheck operations carry timestamps so the most recent intent wins. Backup schema version `3.0`.

Full detail in `Architecture.md`.

---

## Development

No build step. Open `index.html` in a browser — or better, deploy a preview branch to Netlify since absolute paths (`/fonts/`, `/.netlify/functions/`) don't resolve from `file:///`.

Fonts are in `/fonts/`. The service worker is `sw.js`. Netlify functions are in `/netlify/functions/`.

When making changes:
- Bump `APP_VERSION` and `DEV_HOURS` in `index.html`
- Update `sw.js` cache version to match `APP_VERSION`
- Add a row to `Changelog.md`
- Update `Design.md` or `Architecture.md` if the change affects design decisions or system behaviour

---

## Licence

MIT
