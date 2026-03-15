# TODAY

A single-day task manager. One screen, one list, one day.

Nothing carries over. Nothing accumulates. The morning is a clean slate.

**[today-here.netlify.app](https://today-here.netlify.app)**

---

## What it does

- Add tasks for today, check them off as you go
- Drag to reorder tasks, Trello cards, and habits — desktop and mobile
- Track daily habits with a 21-day history strip and habit strength score
- Pull in cards from a Trello board so you don't re-enter work tasks
- Focus mode (desktop) — click any task or habit to start a 25-minute Pomodoro session
- Sync tasks and habits across devices via your own Dropbox
- Installs as a desktop or mobile app (PWA) — no App Store needed
- Works offline after the first load, updates automatically in the background
- No account. No server. Your data stays in your browser and your Dropbox.

---

## Stack

Single HTML file. No framework, no build step, no bundler.

- Vanilla JS + CSS
- Service worker for offline support and background updates
- `manifest.json` for PWA installation
- Two Netlify Functions for Dropbox OAuth token exchange
- Fonts self-hosted (Syne + DM Mono)

---

## Install as an app

TODAY is a PWA — it installs directly from the browser, no App Store or developer licence needed.

**macOS:** open in Safari → File → Add to Dock (Safari 17+ / macOS Sonoma+), or open in Chrome/Brave/Edge and click the install icon (⊕) in the address bar.

**iOS:** open in Safari → Share → Add to Home Screen.

**Android:** open in Chrome → menu → Add to Home Screen.

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
DROPBOX_APP_KEY       = your app key
DROPBOX_CLIENT_SECRET = your app secret
```

Redeploy after adding the env vars.

When you open the app, go to **✦ Connections** in the top bar and enter your App key to connect Dropbox.

### 3. Connect Trello (optional)

Trello pulls in cards from a board and list of your choice. Read-only.

1. Get your Trello API key at [trello.com/power-ups/admin](https://trello.com/power-ups/admin)
2. Open `index.html` and replace the `TRELLO_API_KEY` constant near the top of the `<script>` block with your own key
3. In the app, open **✦ Connections** in the top bar and follow the Trello connect flow

---

## How the sync works

Each device stores state in `localStorage`. Dropbox holds a single JSON backup file (`/today-backup.json`). On startup and every 7 seconds the app does a cheap metadata check — a full sync only happens if the file actually changed.

Concurrent edits are handled with union merge: tasks and habits added on two devices offline both survive. Deletes and check/uncheck operations carry timestamps so the most recent intent wins. Backup schema version `4.0`.

Full detail in `Architecture.md`.

---

## Development

No build step. Open `index.html` in a browser — or better, deploy a preview branch to Netlify since absolute paths (`/fonts/`, `/.netlify/functions/`) don't resolve from `file:///`.

Fonts are in `/fonts/`. Icons and social images are in `/assets/`. The service worker is `sw.js`. Netlify functions are in `/netlify/functions/`.

Memory files in the repo root (`Architecture.md`, `Design.md`, `Research.md`, `Changelog.md`) document all product decisions, data model, sync logic, and design rules. Read these before making changes.

When making changes:
- Bump `APP_VERSION` and `DEV_HOURS` in `index.html`
- Update `sw.js` cache version to match `APP_VERSION`
- Add a row to `Changelog.md`
- Use the trigger table in `Architecture.md §13` to determine which memory files need updating

---

## Licence

MIT
