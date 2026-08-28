# ✦ TODAY

A daily task app built around one question: *what actually matters today?*

Most task apps have the same bug: they remember everything, and opening them feels like being told off. TODAY is a list that ends. One day, one screen. In the evening it asks — once, gently — what didn't happen: keep it, park it, or let it go. Tomorrow starts clean. The empty state is the reward, not the failure.

**[today-here.netlify.app](https://today-here.netlify.app)**

---

## What it does

**The day**
- Add tasks for today, check them off, drag to reorder — desktop and mobile
- **Evening triage** — review what didn't happen: keep, move to soon, or let go. Ask ✦ to open it any time ("help me go through what's left")
- **Zones** — SOON holds deferred tasks, PAST holds the finished and the let-go. Parked tasks quietly age away if you never reach for them; anything you bring back from PAST is treated as important *because you rescued it*
- **Morning nudge** — one AI line about what carried over, quoting your tasks verbatim. Read it, dismiss it, done
- **Focus mode** — tap any task for a 25-minute timer with Picture-in-Picture; sessions count toward the task
- **Habits** — daily checks with a 21-day strip and a strength score. Streaks are acknowledgment, never pressure

**The companion (optional AI — Gemini free tier or Claude)**
- **✦ ask anything** — type in the task bar and tap ✦: add steps, break a task down, park things, start focus, open triage
- **✦ daily brief** — tap ✦ empty: this morning's nudge and the day's poem, all day
- **About digest** — the day's line, a weekly reflection on Sundays, an intention on Mondays, and a "Noticed" block that surfaces what TODAY has learned (peak hour, streak proximity, recurring themes) — only when something changes, never as filler
- **Meeting mode** — record an in-room meeting (desktop or iPhone), get action items extracted in the meeting's own language, with your items pre-selected
- The AI observes, it never coaches: "usually", never "should"

**The frame**
- **Daily poem** — human-written, worldwide public domain, rotating by day and season (90+ poems, Bashō to Dickinson); greets you on the day's first open
- Pull in cards from a Trello board (read-only) so work tasks aren't re-typed
- **Gmail enrichment** — add a task with a name and action verb ("email Johannes about the invoice") and TODAY finds the matching thread; focus mode surfaces the snippet and offers a draft reply
- Idle companions — small creatures that wander the screen when you step away
- Sync across devices via **your own Dropbox** — no account, no server-side data
- Installs as a desktop or mobile app (PWA), works offline after first load

---

## What it deliberately doesn't do

- No due dates — urgency lives in your head, not the app
- No priorities, projects, or labels — a flat list forces honest reckoning
- No history to audit — PAST fades out on its own schedule
- No notifications by default — you come to it, it doesn't chase you
- No gamification — no points, no guilt mechanics
- No cloud account — your data stays in your browser and your Dropbox

---

## Stack

No framework, no build step, no bundler. Vanilla JS + CSS.

- `index.html` — the app (~13K lines), plus small classic-script modules in `/assets/`: `util`, `poems`, `idle`, `sound`, `celebration`, `trello`, `insights`
- `sw.js` — service worker: offline support, background updates
- `manifest.json` — PWA installation
- Six Netlify Functions: Dropbox OAuth (`dropbox-token`, `dropbox-refresh`), Gmail OAuth (`gmail-token`), AI proxy (`ai-assist`), meeting extraction (`meeting-extract`), voice transcription (`transcribe`)
- Fonts self-hosted (Syne + DM Mono)
- `scripts/` — headless smoke test and design lint, run as a pre-commit gate

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

When you open the app, go to **✧ Connections** in the top bar and enter your App key to connect Dropbox.

### 3. Connect Trello (optional)

Trello pulls in cards from a board and list of your choice. Read-only.

1. Get your Trello API key at [trello.com/power-ups/admin](https://trello.com/power-ups/admin)
2. Open `index.html` and replace the `TRELLO_API_KEY` constant with your own key
3. In the app, open **✧ Connections** and follow the Trello connect flow

### 4. Connect Gmail (optional)

Gmail enrichment finds email threads that match your tasks and surfaces them in focus mode.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Enable the **Gmail API** for your project
3. Create an OAuth 2.0 Client ID — type **Web application**
4. Add your Netlify URL as an Authorized redirect URI: `https://your-site.netlify.app/`
5. Add your Netlify URL (no trailing slash) as an Authorized JavaScript origin

In Netlify → Site settings → Environment variables, add:

```
GMAIL_CLIENT_ID     = your OAuth client ID
GMAIL_CLIENT_SECRET = your OAuth client secret
```

Redeploy, then open **✧ Connections** in the app and click Connect under Gmail.

### 5. Enable the AI companion (optional)

1. Get an API key:
   - **Gemini (free tier):** [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   - **Claude:** [console.anthropic.com/keys](https://console.anthropic.com/keys) (paid)
2. In the app, open **✧ Connections** → AI Assistant
3. Select your provider, paste your key, and click Connect

Your key is stored locally in your browser and sent only through your own Netlify function — never to any third party. Meeting mode and voice notes need a Gemini key (audio transcription).

---

## How the sync works

Each device stores state in `localStorage`. Dropbox holds a single JSON backup file (`/today-backup.json`). On startup and every 7 seconds the app does a cheap metadata check — a full sync only happens if the file actually changed.

Concurrent edits are handled with union merge: tasks and habits added on two devices offline both survive. Deletes, check/uncheck operations, and zone moves carry timestamps so the most recent intent wins; purged tasks leave tombstones so stale devices can't resurrect them. Backup schema version `5.3`.

---

## Development

No build step. Open `index.html` in a browser — or better, deploy a preview branch to Netlify since absolute paths (`/fonts/`, `/.netlify/functions/`) don't resolve from `file:///`.

Documentation lives in `/memory/`. Start with `Rules.md` — it has a file guide for what to read based on your task.

When making changes:
- Add the new version as the **top entry of the `CHANGELOG` object** in `index.html` — `APP_VERSION` is derived from it, never edited directly
- Update the `CACHE_VERSION` in `sw.js` to match (the one hand-synced value; the smoke test fails on drift)
- Mirror the entry into `memory/Changelog.md`
- Run `node scripts/smoke-test.mjs` and `node scripts/design-lint.mjs` (both also run pre-commit)

---

## Licence

MIT
