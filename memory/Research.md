# TODAY — Product Research
> Living reference. Add to this whenever something is discovered, validated, or decided through research.  
> Not implementation detail — that lives in Architecture.md. This is the thinking behind the product.

---

## 1. User Research

### Who uses this
- Single user, personal productivity tool
- Opens the app first thing in the morning, often on mobile
- Primary workflow: brain-dump intentions for the day, then progressive completion
- Works in a dark environment — dark UI is a functional preference, not aesthetic
- Moves between desktop (work) and mobile (on the go) — cross-device sync is essential, not optional
- Already uses Trello for work task management — doesn't want to re-enter work tasks manually

### Key behavioural insights
- The anxiety of accumulation is real. Todo apps that carry tasks forward create guilt. A hard daily reset removes this entirely.
- Completion should feel like a moment, not an administrative act. The empty state and the celebration particle effect are responses to this.
- Focus mode (Pomodoro) emerged from the need to go deeper on a single task, not just track it.
- Mobile is the first-open device. The morning brain-dump happens on the phone. Desktop is where focused work happens.

---

## 2. Market Landscape

### Positioning
TODAY occupies a specific gap: **single-day, zero-accumulation, offline-first, no account required**. Most tools in this space fail on at least one of these.

### Tools reviewed

| Tool | Gap |
|---|---|
| Todoist, Things, Linear | Multi-project, accumulation-based — the opposite of TODAY's philosophy |
| Apple Reminders | Carries tasks forward, tied to Apple ecosystem |
| Google Tasks | Accumulation, requires Google account |
| Structured | Calendar-based, not a brain-dump tool |
| Complice | Closest in philosophy — daily intentions — but requires account, subscription |
| Paper / notebook | No cross-device, no Trello pull, no Pomodoro |

### What TODAY does that nothing else does cleanly
- Hard daily reset with no carry-forward, by design
- Trello pull-in without re-entry
- Dropbox sync with no account — user owns their data entirely
- Offline-first, works without internet after first load
- Single HTML file — forkable, self-hostable in minutes

---

## 3. Integration Research

### Trello
- **Auth model:** standard OAuth redirect, token returned in URL hash fragment. No PKCE needed — read-only scope reduces risk.
- **Key constraint:** `window.open()` must be called synchronously (not after `await`) or iOS Safari blocks the popup.
- **Sync strategy:** cheap activity check first (`dateLastActivity` on the board, ~1KB). Full card fetch only if activity changed. Avoids unnecessary API calls on every 7s tick.
- **Scope:** `read` only. The app never writes to Trello — intentional product decision, not a technical limitation.
- **Card structure used:** `name`, `url`, `due`, `dueComplete`, `idList`. Due date rendered as a badge when present.
- **Rate limits:** Trello allows 300 requests per 10s per token. The cheap activity check + conditional full fetch keeps TODAY well within limits.

### Dropbox
- **Auth model:** PKCE OAuth — chosen because it works from a public client (no server secret needed client-side). App secret stays in Netlify env vars, never exposed to the browser.
- **Sync file:** single JSON file (`/today-backup.json` on production, `/today-backup-{hostname}.json` on preview deploys to avoid collisions).
- **Cheap sync check:** metadata endpoint (`/files/get_metadata`) returns `rev` field in ~300B. Full download only when rev changes. This is the key to keeping the 7s ticker cheap.
- **Token refresh:** access tokens expire in ~4 hours. Refresh token is long-lived. `_dropboxEnsureToken()` checks expiry before every backup/restore and refreshes silently if needed.
- **PKCE state parameter:** generated per session, stored in `sessionStorage`, verified on callback. Prevents CSRF. Keys cleaned up immediately after exchange.
- **Backup schema v3.0:** union merge fields added in v1.6.12. `deleted_ids`, `checked_ids`, `unchecked_ids` — each an array of `{id, at}` objects. Missing fields on restore default to `[]` safely.

### Web Audio API
- Used for the Pomodoro completion chime. No audio files — synthesised entirely in JS.
- `AudioContext` created fresh per chime, closed via `osc.onended`. No persistent audio graph.
- `window.AudioContext || window.webkitAudioContext` — webkit prefix still needed for some older Safari versions.
- Wrapped in try/catch — browsers may block AudioContext creation without a user gesture. Silent failure is the correct behaviour here.
- Sine wave chosen for warmth. Frequency drop (432→320 Hz) signals completion without urgency. See Design.md §5 for full spec.

### Service Worker
- Network-first strategy — ensures users always get the latest version when online, falls back to cache when offline.
- Pre-caches app shell (`/`) and all 6 font files at install. Fonts are self-hosted specifically because cross-origin fonts (Google Fonts) cannot be SW-cached.
- `BYPASS_ORIGINS` list: Trello, Dropbox, Google APIs — these always go to network, never cache. Caching API responses would break sync.
- Cache version tied to `APP_VERSION` — on deploy, old cache is invalidated and new assets are fetched.

---

## 4. Technical Decisions Log

### Why a single HTML file
No build step, no bundler, no dependencies. Anyone can fork the repo, deploy to Netlify, and have a running app in under 5 minutes. The constraint forces simplicity — if something feels too complex to fit in one file, it's probably too complex for this product.

### Why Dropbox over Google Drive
- Dropbox's PKCE flow is well-documented and works cleanly from a public client
- `rev` field on file metadata makes cheap sync checks trivial
- Google Drive requires `OAuth2` with more complex scope negotiation
- iCloud (CloudKit JS) is Apple-only — rules out Android users
- Dropbox was the path of least resistance that also has a clean abstraction path for future alternatives (see Architecture.md §4)

### Why no server-side database
- Eliminates the need for user accounts, authentication, and data management
- User owns their data entirely — it lives in their browser and their Dropbox
- Massively reduces operational complexity and cost
- The constraint (single Dropbox file, union merge) is solvable and has been solved in v3.0

### Why union merge over last-write-wins
Last-write-wins silently discards changes when two devices edit concurrently. With a single user across two devices (desktop and mobile), this is a real daily scenario — not an edge case. Union merge with operation timestamps means no edit is ever silently lost.

### Why tasks don't carry over
The core product hypothesis: accumulation creates anxiety, and anxiety reduces completion. A hard daily reset means the list is always today's list — not a backlog disguised as a daily list. Validated through use.

### Why Pomodoro sessions are not persisted across reloads
Session state (timer position, running/paused) is intentionally ephemeral. Reloading the page is a natural break point. `focusSessions` (completed count) is persisted — the record of work survives, the in-progress state does not. A fresh page load is a fresh start.

---


---

## 6. Habits — Research & Decision Log
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

## 7. Open Questions

| Question | Status | Notes |
|---|---|---|
| Should streak logic account for weekend gaps? | ✅ Resolved v1.6.31 | Replaced streak entirely with habit strength % (exponential smoothing). No consecutive counter exists. Weekend gaps reduce score slightly but do not reset it. |
| Should Trello done state persist across new day? | By design — yes | Trello tasks are external — their done state is managed in Trello |
| Multi-user / shared lists? | Not planned | Would require accounts, server, fundamentally different architecture |
| Google Drive as alternative sync provider | Future | Architecture prepared, not yet implemented |
| Halfway chime for Pomodoro sessions? | Open | Design.md notes this as a future sound — same sine/decay pattern, different pitch |
