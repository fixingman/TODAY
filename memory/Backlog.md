# Backlog

> **Forward-looking only: what to build next, what's parked, and decisions made.**
> Shipped work → `Changelog.md` (+ `archive/Changelog-archive.md`). Fixed bugs → `archive/Bugs-archive.md`. History is not duplicated here.

---

## Claude session conventions

| Context | Use |
|---------|-----|
| Searching Coda | `/browse` skill — not raw WebFetch or grep |
| Poem curation search | WebSearch to identify candidate by title/poet → single targeted WebFetch on that poem's URL to pull verbatim text. No bulk-fetching anthologies. Do inline in main conversation, not via agents. Better sources than Gutenberg/Wikisource/archive.org: `poetryfoundation.org` (searchable by country), `lyrikline.org` (world poetry in translation), `banipal.co.uk` (Arabic lit in translation), `asymptotejournal.com` (world lit, often CC-licensed), `poemhunter.com` (searchable by poet nationality). |
| Poem display in chat | Always use real line breaks — one line per line, in a blockquote. Never use `/` as an inline line separator. |

---

## ◎ North star (agreed Jun 2026)

**Own the first 30 seconds of the day.** The morning is TODAY's signature beat — nudge (verdict 2026-07-18: kept, read every time), poem (#2), briefing (#7); everything else supports or follows. How intelligence and personalization serve this → `design/Personalization.md`.

---

## ▸ Roadmap

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2 | **Poem corpus — iterate** | In progress | Expand geography and voice diversity. Corpus 115 (2026-08-25). Detail ↓ |
| 7 | **Season moments — solar term label** | Shipped v2.71.0 | Solar term label above evocative line; season owns full Noticed block. Wallpaper test → table below. |
| 8 | **Noticed block — expand** | Not started | Growth area. What else could TODAY notice that earns a line? Detail ↓ |
| 9 | **Google Drive sync** | Parked — spec ready | Second sync backend alongside Dropbox; user picks one. Full spec ↓ |
| 10 | **Meeting mode & calendar capture** | In progress / gated | Granola integration MVP before native capture. Calendar = input only, never output. Detail ↓ |
| 11 | **Task agent — enrichment at add-time** | Not started | When a task contains a trigger (call, email, answer, book + a name), TODAY enriches it inline: draft, number, or context. Stages ↓ |
| — | **WEEK companion** | Gated — autumn 2026 | Needs 3+ months data + #3 done. Detail ↓ |

---

## Item details

### 2 · Poem Corpus — Iterate

**The brief:**
> 2–11 lines. Human-written. Two licensing paths: (A) worldwide public domain — author AND translator both d. pre-1956; (B) CC0 / explicit public-domain dedication by the author — verify the specific license on the source page, never assume. Voice: spare, concrete, present-tense, clear/light/affirming — mornings, evenings, seasons, small noticed things. In: imagism, haiku, plain free verse, rhymed-lyrical if the feeling is real and resolves held/affirmed. Out: quaint, ornate, cutesy, preachy, bleak-unresolved, abstraction without an image.
> **App-moment test:** would this still feel right beside an undone task list? If it depends on being read in isolation, cut it.
> **Corpus-fit test:** does it sit comfortably next to Bashō and Marcus Aurelius in tone? The existing corpus is the style reference, not just a checklist.
> **PD check:** for path A — confirm death dates for author and translator. For path B — quote the exact license statement from the source page.

> **Search process:** WebSearch first to identify a specific poem by title/poet (fast, cheap) — then one targeted WebFetch on that poem's URL to pull verbatim text. Never bulk-fetch entire anthologies or book scans. Prefer `poetryfoundation.org`, `lyrikline.org`, `banipal.co.uk`, `asymptotejournal.com`, `poemhunter.com` over archive.org/Gutenberg for discovery. For PD verification still confirm death dates via Wikisource or archive.org, but on the specific page only. Region is a tiebreaker only — when two candidates tie on quality, prefer the one from a country not yet represented.

**Seasons:** W14 / Sp16 / Su11 / Au11 / year-round 63 — corpus 115 (2026-08-25).

**Rotation verdict (2026-08-22):** No repetition observed — shuffle algorithm is not the lever.

**New direction:** expand geography (Africa, Latin America, Middle East, Southeast Asia underrepresented) · untapped poets · contemporary CC-licensed work. Bar unchanged.

Poet notes: Teasdale (*Stars To-night*) rich for future rounds. Crapsey fully cut.

**PD notes:** US-PD-only closed (v2.35.3) — worldwide PD is the bar. Five US-PD poems kept permanently (Frost ×3, Yang-ti, Po Chü-i 'After Lunch'). Future unlocks: Milne 2027 (taste caveat: canonical "cutesy"), cummings 2033, Frost/WCW worldwide 2034, Eliot 2036. China most-represented — country tiebreaker is a lean, not a wall.

**Curation rule: a cut is final.** Candidates not picked are dead — never re-proposed. (Not-picked so they aren't re-found: Ou-yang Hsiu 'Bell Hill', Yeats 'Cloths of Heaven', Landor 'Dying Speech', Moritake butterfly, Hokushi 'burnt out', Dickinson 'The Snow', Nervo 'Revenge', Nervo 'What matter hours' [untitled], Storni 'The Piety of the Cypress', Contardo 'Home of Peace and Purity'.)

**Active leads:**
- Chamberlain 1902 (archive.org/details/basho-and-the-japanses-poetical-epigram) — productive; identifier confirmed
- Cranmer-Byng *A Feast of Lanterns* (archive.org `in.ernet.dli.2015.282424`) — Yuan Mei, Liu Tzu-hui unproposed, available when China tiebreaker lifts
- Carlyle, *Specimens of Arabian Poetry* (Cambridge, 1796; Carlyle d.1804) — ~50 short Arabic poems, multiple 8-liners unproposed: 'On Temper' (Nabegat), 'Barmecides', 'To the Khaliph' (Ibrahim Ben Adham), 'Epigram on Taher'. Reprinted in Clouston *Arabian Poetry for English Readers* (Glasgow, 1881). Worldwide PD confirmed.
- Tirukkural (Thiruvalluvar, trans. G. U. Pope, 1886) — Wikisource has Ch. 131–133 verbatim; Ch. 110, 121–130 are redlinks. Book III love chapters have strong candidates (K1095, K1227). Pope d. 1908, worldwide PD.
- Prose at Marcus Aurelius length (2–5 sentences): Muir *First Summer* (d.1914) worth a targeted pass; Garnett-trans. Chekhov nature prose not yet searched
- Closed: London Snow (too long), Turkish/Sufi (no worldwide-PD English), Poe (anguished), Egyptian/African (PD-translation bottleneck; /Xam poem in Bleek & Lloyd 1911 p.231–233 confirmed but sacred-texts.com blocks — try HathiTrust)
- Modern CC0: no viable candidates found after exhaustive search. Path exists in principle.

---

### 7 · Season Moments — ✅ Shipped v2.71.0

Solar term label (`処暑 · End of Heat`) above the evocative line. Season moments own the full Noticed block when they appear. Stored as `{ term, line }` object; own render path.

**Wallpaper test:** tracked in table below. Due 2026-09-05.

---

### 8 · Noticed Block — Expand

No problem with the current lines. Growth question: what else could TODAY notice that earns a line? Open for ideas — don't force it. Candidates must pass the Wallpaper Test before shipping: would this still feel right after 20 appearances?

---

### 9 · Google Drive Sync

**Motivation:** (1) Can has a second device on GDrive; (2) broadening reach — Google accounts are near-universal, Dropbox requires a separate account.
**Constraint:** user picks one provider at setup. Cannot have both active simultaneously. Dropbox stays unchanged.

#### Pre-build decisions (resolved)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Full API vs. file picker | **Full API** | File picker has no background sync — kills the core value prop |
| GDrive API scope | **`drive.appdata`** | Hidden app-specific folder, no picker UX needed. Equivalent to Dropbox's `/Apps/TODAY/`. Simpler auth. |
| Migration: Dropbox → GDrive | **Export JSON → re-import** | No automatic cross-provider migration. One-time setup act. |
| Existing Dropbox users on update | **No change, no prompt** | GDrive option only surfaces at first-run or via Connections "switch provider" flow. |

#### Architecture

**New file: `assets/gdrive.js`** — mirrors `dropbox.js` structure. Inert until `window._startGDrive()` is called. Same window API surface:

```
window.gdriveAuth()        ↔  dropboxAuth()
window.gdriveBackup()      ↔  dropboxBackup()
window.gdriveRestore()     ↔  dropboxRestore()
window.gdriveAutoSave()    ↔  dropboxAutoSave()
window._gdriveSyncNow()    ↔  window._dbxSyncNow()
window._gdriveResetRev()   ↔  window._dbxResetRev()
```

**Provider selection:** `localStorage.getItem('sync_provider')` → `'dropbox'` | `'gdrive'` | `null` (first-run). `index.html` reads this before `init()` and starts the right module.

**Merge logic: extract to `assets/sync-merge.js`** *(discrete task before building GDrive)*
`mergeRemoteData()` and its private helpers (`_mergeDailyHistory`, `_mergeAppMemory`, `_logMergeAnomaly`) are currently inside the `_startDropbox` closure. Extract all four as a unit. **Risks:** (1) private closure references must be untangled; (2) merge calls `dropboxAutoSave()` internally — must become a provider callback parameter `mergeRemoteData(data, { autoSave })`; (3) `sw.js` must include `sync-merge.js` or cached devices break silently. **Approach:** dedicated commit, no behaviour change, full test suite + real-device sync check before touching GDrive. **Alternative:** ship `gdrive.js` with its own copy of the merge logic, deduplicate later.

#### GDrive OAuth (`drive.appdata`)

- Scope: `https://www.googleapis.com/auth/drive.appdata`
- Auth: Google OAuth 2.0 PKCE (same pattern as `dropbox.js` lines 163–330)
- File: single `today-backup.json` in the appdata folder
- Read: list files → get ID → `GET .../files/{id}?alt=media`
- Write: multipart upload (create) or PATCH (update)
- Rev equivalent: `modifiedTime` from file metadata
- Token refresh: `POST https://oauth2.googleapis.com/token` with `refresh_token` grant
- localStorage keys: `gdrive_access_token`, `gdrive_refresh_token`, `gdrive_token_expiry`, `gdrive_file_id`, `gdrive_last_rev`, `last_successful_gdrive_backup`, `last_gdrive_sync_read`, `sync_provider`

#### Connections panel changes

1. `_connectionsHaveCredentials()` — check either provider's token
2. `renderConnections()` — render the active provider's row based on `sync_provider`
3. **First-run** (no provider set): two cards side by side — "Connect Dropbox" / "Connect Google Drive". User picks once.
4. **Switching:** "Switch to [other provider]" → export → disconnect → connect card for new provider. No auto-migration.
5. GDrive row: connected status · last-save time · Save / Restore / Forget buttons

#### Parity checklist

- [ ] OAuth connect / token refresh / token-expired state
- [ ] Auto-save on every state change (debounced)
- [ ] Wake sync on `visibilitychange` / `window.focus`
- [ ] Full merge via shared `sync-merge.js`
- [ ] Connections panel: first-run choice, connected row, Save / Restore / Forget
- [ ] Forget clears all `gdrive_*` keys and resets `sync_provider`
- [ ] `sw.js` CACHE includes `assets/gdrive.js` and `assets/sync-merge.js`

#### Out of scope
Dropbox + GDrive simultaneously · automatic cross-provider migration · OneDrive / iCloud · server-side OAuth credentials

---

### 10 · Meeting Mode & Calendar Capture

**Scope boundary (permanent):** phone-call recording is impossible from iOS — the OS never exposes call audio. Mobile meeting mode = in-room/speakerphone capture. Don't revisit.

**Governing principle:** the calendar is INPUT, never OUTPUT. TODAY reads it to decide *when* to offer something and never renders it back — no agenda, no event list, no "next up".

**Granola integration (priority path, not started):** Granola auto-detects meetings at OS level; outputs structured notes + action items. MVP: Granola MCP key in Connections → Netlify function calls `list_meetings` + `get_meetings` → AI extraction → task chips. Manual trigger: user finishes a meeting, opens TODAY, taps import. Build this before investing in native capture.

**Native capture MVP shape:** read-only Google Calendar → existing v2.44.0 pill appears at meeting start with the join link + a record button. Nothing else displayed.

**Auth:** thin Netlify proxy needed (Google ICS has no CORS header). OAuth over ICS because attendees aren't in ICS reliably. Unverified personal app = refresh tokens expire every 7 days in testing mode.

**Open questions before building native:** (1) can a link be opened from a PiP document? (2) clean no-link state (Zoom/Teams/no conferencing); (3) headphone upgrade path (mix mic + tab audio via Web Audio) — after MVP.

**Auto-record is a posture decision, not a technical one.** Recording by default changes Can's position toward others in the room.

**Transcription bake-off (not started):** Gemini vs. Whisper vs. Deepgram on real recordings — accuracy on non-Western names, cost, latency. Run after a few real meetings exist. Engine is a swappable layer.

**Gate:** extraction quality — are the chips what you'd have written down yourself?

---

### 11 · Task Agent — Enrichment at Add-Time

**Three scopes (A, B, C) — all part of the same agent vision:**

**A · Draft the communication** — for reply/call tasks, the agent doesn't just find the contact, it drafts the actual email or suggests what to say on the call. You review, edit, send. The task collapses from "I need to do this" to "approve and go."

**B · Personalized AI surfaces** — TODAY's existing AI (daily briefing, focus companion, week theme, day nudge) currently uses: task count, focus minutes, streak, memory patterns. The new layer: also use the actual task *text* and what you've been focusing on. "Call KRY for meniscus" sitting 8 days makes the briefing say something different than "Move travel costs to SEB." The AI knows your actual situation, not just your stats.

**C · Task enrichment at add-time** — when a task contains a trigger (call, email, answer, book + a name), TODAY enriches it inline: finds the number, pre-reads the URL, surfaces the draft. Agent does the legwork; you review and approve.

---

**Real examples from your list (all three scopes):**
- "Answer to Mäklare" → C: find thread / A: draft the reply → send
- "Call KRY for meniscus" → C: find KRY's number + what to say / A: draft call notes
- "Change iPhone battery https://phonehero.se/..." → C: pre-read the URL, show booking steps
- "Find a tile settler for the apartment bathroom" → C: research shortlist
- Daily briefing sees "Answer to Mäklare" is 13 days old → B: nudge is specific, not generic

---

**Architecture (all stages):** tool-use chain from day one. TODAY sends the task text → Claude decides which tools to call → returns enriched card. Tools added incrementally; the orchestration layer never needs redesigning.

---

#### Stage 1 — Tool-use agent, no-auth tools *(start here)*

Build the full tool-use architecture with the tools that need no connections. Useful immediately.

**Tools available at Stage 1 (no auth):**
- `search_web(query)` — finds phone numbers, addresses, booking pages, product comparisons
- `read_url(url)` — pre-reads a URL already in the task (e.g. phonehero.se booking flow)

**Real tasks this already solves:**
- "Call KRY for meniscus" → `search_web("KRY clinic phone number Stockholm")` → number + what to say
- "Change iPhone battery https://phonehero.se/..." → `read_url(url)` → booking steps
- "Find a tile settler for the apartment bathroom" → `search_web(...)` → 3 options with prices
- "Look into buying safe box" → `search_web(...)` → shortlist

**UX:** agent card appears below the task row (distinct from suggestion row — action, not advice). Card shows tool output + a one-tap action (call, open, copy).

Effort: S–M | Risk: Low | No external auth needed

---

#### Stage 2 — Gmail connected enrichment ✅ *shipped v2.75.1*

**Approach B (direct integration) built instead of full tool-use chain.** PKCE OAuth (`gmail.readonly` scope, client-side only, no server-side token storage). Pattern detection at add-time (`_isCommTask`): action verb + capitalised name triggers silent Gmail search. Thread snippet + sender + date cached in localStorage (`gmail_enrichment_{taskId}`) for 24h. `✉` indicator on task row. Draft reply generated on-demand inside focus session overlay.

**The prior Gmail rejection resolved:** rejection was about extraction (importing others' emails as tasks) + server-side storage. This is enrichment-only (surfaces below *your* task, never creates new tasks) + client-side PKCE (no server storage). Both concerns addressed.

**Real tasks this unlocks:**
- "Answer to Mäklare" → finds thread → draft reply in focus session
- "Eplanet: Answer Morvarid" → thread + context-aware draft

Effort: M (shipped) | Risk: Low (readonly scope, client-side)

---

#### Stage 3 — Expand tool registry *(when the pattern proves itself)*

Add tools as needs surface: `search_contacts`, `read_calendar`, `search_trello`. One task can trigger multiple tools. Claude decides the sequence.

Effort: incremental | Risk: Low (architecture already handles it)

---

#### Scope B — Personalized AI surfaces *(parallel track, separate implementation)*

TODAY's existing AI calls (day nudge, focus companion, week theme, morning briefing) get richer context: actual task text + what's been in focus, not just counts and streaks. No new architecture needed — extend the existing prompt payloads.

**What changes:** the system prompt for each AI surface receives a structured summary of the current task list (text, age, zone, focus sessions) so it can reason about *what you're actually dealing with*, not just *how many things you have*.

**Real difference:** today the nudge says "you've got 13 tasks, streak at 206." With this: "Answer to Mäklare has been sitting 13 days — someone's probably waiting." (This is already half-working — `day_nudge_ai` in your backup already says exactly that. Scope B is about making *all* AI surfaces this specific, not just the nudge.)

Effort: S–M (prompt enrichment, no new infra) | Risk: Low | Can run in parallel with Stage 1

---

**Out of scope for all stages:**
- Autonomous execution without review (agent surfaces, you act)
- Importing other people's email as new tasks (rejected extraction pattern)
- Always-on background agent (trigger-on-add only)

---

### WEEK — Standalone Weekly Companion *(gated)*

**Vision:** separate lightweight weekly planning tool. TODAY = focus instrument, WEEK = planning surface. Predictive AI from observed behaviour — no manual energy ratings.
**Feeds on:** `today_daily_history` (focus sessions, completion times, habit patterns, peak hour — accumulating since v2.17.55).
**Revisit:** ~autumn 2026, with 3+ months of data.

---

## Watching

| Decision | Current | Watch for |
|----------|---------|-----------|
| Merge-anomaly observability | Dropbox emits a console-only `[merge-anomaly]` breadcrumb; no persisted counter or Connections metric | Revisit only if anomalies appear during debugging or WEEK needs a measurable conflict rate. Not live product telemetry. |
| Dated AI-cache sync | Four fields hand-plumbed: `day_nudge_ai`, `week_reflection`, `monday_intention`, `week_theme_ai` | Rule-of-three exceeded. Create one declarative cache registry before adding a fifth dated AI field. |
| Chrome Built-in AI (Prompt API) | Research — not started | Chrome 127+ ships Gemini Nano on-device (`window.ai.languageModel`). Still in Origin Trial (Chrome-only, needs registration). Ideal long-term destination for Gmail comm-task classification: on-device, free, no API key, offline. Current approach uses `ai-assist` proxy. When Chrome Built-in AI reaches stable / broad availability, progressive enhancement: try `window.ai` first, fall back to `ai-assist`. Polyfill exists for non-Chrome browsers. Revisit when out of Origin Trial (~2026 or later). |
| Morning nudge usefulness | v2.43.5 rebalanced list vs memory context; generation runs after sync and result syncs cross-device | Ask for the About panel's Today line verbatim. Does it name a specific current task without biography drift? If not, cut `Past suggestions` + `Recent conversations` before more prompt tuning. |
| AI/data outcome loop | **Shipped v2.72.0; viewport delivery fixed v2.72.1.** Existing post-add row records reason provenance and downstream outcomes only after the task reaches view. | After 12+ resolved offers, inspect reason totals and reversal quality. Extend to another action only if this loop changes recommendation mix without adding noise. |

---

## Wallpaper Test

> **Rule:** resolve each row — **kept**, **iterated**, or **removed** — at the due date.
> **Pre-registration:** in the week before each verdict, note a one-word observation each time the surface is used or skipped.

| Surface | Shipped | Due | Status |
|---------|---------|-----|--------|
| Season moments (24/year) | v2.60.0 | — | **Iterate (2026-08-21).** Line is right. Need second layer for seasonal turning-point. Solar term label shipped v2.71.0. |
| Season moments — solar term label | v2.71.0 | 2026-09-05 | Open — does `処暑 · End of Heat` feel like context or noise after a few appearances? |
| Focus companion question | v2.65.0 | 2026-08-31 | Improved: taxonomy system prompt, drag-word + letgo-reason signals, word cap 18→22. Re-observe — does the question now feel like clarity rather than a check-in? |
| About contextual CTAs | v2.64.10 | 2026-08-25 | Open — does the bordered CTA treatment make actions clearer without pulling attention? |
| Connections privacy reassurance | v2.64.11 | 2026-08-26 | Open — one appearance per device when fully disconnected. Timely reassurance or policy copy interrupting setup? |
| Sunday earned insight | v2.71.12 | 2026-09-06 | Open — does it reveal a real lever rather than paraphrasing the grid? Track abstentions as healthy. |
| Monday intention (memory-enriched) | v2.65.1 | 2026-08-24 | Verdict (2026-08-17): synthesis is nice. Data source fixed: now includes Soon + Trello. Re-observe next Monday. |
| Memory panel quality gate | v2.47.0 | 2026-09-01 | Open — are AI-generated hypotheses earning confirmation or getting dismissed? |
| Post-triage reflections | v2.65.7 | 2026-08-31 | Open — real pause or rote wallpaper? Watch for: avoidance on hard days, selection bias, feeling rote after first week. |

---

## Decisions & Boundaries

### Not implementing

| Decision | Rationale |
|---|---|
| Full-contrast completed tasks | Completed rows deliberately recede to 25% opacity. WCAG 1.4.3/1.4.11 are accepted exceptions; semantics remain intact. |
| Visible pointer reorder controls | Drag-only. Option+Arrow available for keyboards. WCAG 2.2 criterion 2.5.7 accepted exception. |
| Weather-aware nudges | **Rejected 2026-08-17.** Adds external-data dependency + new privacy boundary with no demonstrated need. Do not re-propose. |
| Truncating task text | **Rejected 2026-08-01.** Task text is primary content. Wrapping is correct; do not re-propose clamping. |
| Keyboard shortcuts (desktop) | No demonstrated need — revisit only if a real workflow gap shows up. |
| Widget / Home Screen | Needs WidgetKit / native Android — not reachable from a PWA. |
| Quick capture (without opening app) | No good cross-platform path. iOS has no PWA share target; Siri needs a native app. |
| Microsoft Notes integration | No clear user need. |
| Momentum integration | No public API; ICS is inbound-only. |
| Calendar integration as agenda | Rejected as a displayed surface. Meeting mode reads calendar as INPUT only — never rendered back. Not a planner. |
| Slack / stream extraction | Wrong trust model + renders other people's demands into the calm list. Gmail *enrichment* (readonly, client-side PKCE, surfaces below your own task) shipped v2.75.1 — distinct from extraction. |
| Todoist integration | **Rejected 2026-08-21.** No demonstrated need for a second task-integration lane. Do not re-propose. |
| Push notifications | **Rejected 2026-08-21.** No demonstrated need. Needs server infra with no validated payoff. Do not re-propose. |
| In-app analytics / session replay | **Rejected 2026-08-11.** TODAY promises no observation. A tracker can expose OAuth tokens. Separate public landing surface only. |

### Rejected approaches

| Area | Rejected | Reason |
|------|----------|--------|
| Quick capture | iOS Share Sheet / Shortcuts | No PWA share-target support on iOS. |
| Quick capture | Web share target | Android-only, inconsistent. |
| Sync | Real-time WebSocket | Overkill for single-user; polling is simpler. |
| Sync | Conflict-resolution UI | Union merge + timestamps handles 99% of cases. |
| Sound | Web Audio with `.then()` | Lag after inactivity; play immediately instead. |
| Idle creatures | Complex AI behaviours | Simple random movement is charming enough. |
| Habits | Streak penalties | Anxiety-inducing; acknowledge, don't punish. |

---

*History (shipped features, fixed bugs) lives in `Changelog.md`, `archive/Changelog-archive.md`, and `archive/Bugs-archive.md` — intentionally not mirrored here.*
