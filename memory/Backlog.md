# Backlog

> **Forward-looking only: what to build next, what's parked, and decisions made.**
> Shipped work → `Changelog.md` (+ `archive/Changelog-archive.md`). Fixed bugs → `archive/Bugs-archive.md`. History is not duplicated here.

---

## ◎ North star (agreed Jun 2026)

**Own the first 30 seconds of the day.** The morning is TODAY's signature beat — nudge (verdict 2026-07-18: kept, read every time), poem (#2), briefing (#7); everything else supports or follows. How intelligence and personalization serve this → `design/Personalization.md`.

---

## ▸ Roadmap (prioritised, Jun 2026 review)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2 | **Poem corpus growth** | Ongoing | Corpus 97, target ~100, three to go. Spring thinnest gap. A cut is final — detail ↓ |
| 3 | **Module extraction** | In progress | **Next:** `focus.js`. task-actions.js done (v2.65.5). assistant.js done (v2.65.2). Several post-Focus boundaries are feasible but require explicit test gates. Decision queue ↓ |
| 4 | **Push notifications — day boundaries only** | Not started | Evening triage + morning briefing only. Needs server infra — detail ↓ |
| 6 | **Todoist integration** | Not started | Highest task-integration priority after Trello. ~1.5× Trello effort — `research/Integrations.md`. |

**Awaiting device verification:** canonical list lives in `Rules.md` → Watch for.

**Gated:** WEEK companion — decide ~autumn 2026 (needs 3+ months data + #3 done; #1's learnings landed with the 2026-07-18 verdict). Detail ↓

**Parked:** idle companion artwork · AI prompt trimming · Trello checklist write-back. Detail ↓

---

## Details

### 2 · Daily Poem Corpus Growth
**Process:** curation rounds in chat — Claude proposes verified candidates, Can cuts by number. Accepted poems land in `assets/poems.js`.

**The brief:**
> 2–11 lines. Human-written, worldwide public domain (author AND translator d. pre-1956; rolls forward each year). Voice: spare, concrete, present-tense, clear/light/affirming — mornings, evenings, seasons, small noticed things. In: imagism, haiku, plain free verse, rhymed-lyrical if the feeling is real and resolves held/affirmed. Out: quaint, ornate, cutesy, preachy, bleak-unresolved, abstraction without an image.
> **App-moment test:** would this still feel right beside an undone task list? If it depends on being read in isolation, cut it.
> **Corpus-fit test:** does it sit comfortably next to Bashō and Marcus Aurelius in tone? The existing corpus is the style reference, not just a checklist.
> **PD check:** verify text verbatim against Wikisource / Gutenberg / archive.org — never from memory. Confirm death dates for author and translator.
> **Search process:** search by named PD anthology or translator, not by theme or region (`"[name]" site:gutenberg.org OR site:en.wikisource.org OR site:archive.org`). Region is a tiebreaker only — when two candidates tie on quality, prefer the one from a country not yet represented.

**Seasons:** W12 / Sp10 / Su11 / Au11 / year-round 53 — corpus 97, target ~100. Three to go; spring thinnest. Poet notes: Teasdale (*Stars To-night*) rich for future rounds. Crapsey fully cut.

**PD notes:** US-PD-only closed (v2.35.3) — worldwide PD is the bar. Five US-PD poems kept permanently (Frost ×3, Yang-ti, Po Chü-i 'After Lunch'). Future unlocks: Milne 2027 (taste caveat: canonical "cutesy"), cummings 2033, Frost/WCW worldwide 2034, Eliot 2036. China most-represented — country tiebreaker is a lean, not a wall.

**Curation rule: a cut is final.** Candidates not picked are dead — never re-proposed. (Not-picked so they aren't re-found: Ou-yang Hsiu 'Bell Hill', Yeats 'Cloths of Heaven', Landor 'Dying Speech', Moritake butterfly, Hokushi 'burnt out', Dickinson 'The Snow'.)

**Active leads:**
- Chamberlain 1902 (archive.org/details/basho-and-the-japanses-poetical-epigram) — productive; identifier confirmed
- Cranmer-Byng *A Feast of Lanterns* (archive.org `in.ernet.dli.2015.282424`) — Yuan Mei, Liu Tzu-hui unproposed, available when China tiebreaker lifts
- Prose at Marcus Aurelius length (2–5 sentences) works; Muir *First Summer* (d.1914) worth a targeted pass; Garnett-trans. Chekhov nature prose not yet searched
- Closed: London Snow (too long), Turkish/Sufi (no worldwide-PD English), Poe (anguished), Egyptian/African/Scandinavian (PD-translation bottleneck)

### 3 · Module Extraction

| Order | Module | Size | Gate |
|---|---|---:|---|
| **Next** | `focus.js` | ~1,332 | **High feasibility.** Strong automated invariant coverage already exists. Preserve the Focus/PiP hooks and private timer state. |
| Done ✓ | AI provider config → `connections.js` | ~164 inline | **Folded in v2.64.38.** 8 new exports (23 total). `_aiGetProvider`/`_aiGetKey`/`_aiIsConfigured` helpers, `_aiRenderConfig`/`saveAIKey`/`clearAIKey`/`setDefaultProvider` panel functions, constants, and `_aiInit` migration IIFE all in `_startConnections()` closure. 17 connections tests. |
| Assess | `nudge.js` | ~360 | **Medium-high feasibility.** Cohesive cache/race/dismissal controller with private session guards. Add deterministic tests for morning/noon windows, cached AI vs 1s fallback, later fallback upgrade, dismissal during fetch, stale-done invalidation, offline/no-key behavior, and version/Sunday/habit badges. |
| Done ✓ | `assistant.js` | ~1,246 | **Done v2.65.2.** AI panel + post-add suggestion controller. 8 exports. `_aiPanelOpen` and `_aiBadgeShown` stay inline. ESC listener stays inline. `scripts/assistant-test.mjs` (9 tests). |
| Done ✓ | `task-actions.js` | ~553 | **Done v2.65.5.** Add/check/delete/undo/clear/stats controller. 12 exports. `scripts/task-actions-test.mjs` (9 tests). `_archiveHabitUndo(h)` helper added for habits.js cross-module undo. |
| Assess | `day-lifecycle.js` | ~210 | **Medium-low feasibility.** New-day cleanup is cohesive but crosses Focus snapshots, habits, zones, memory, tombstones, and delayed backup. Dropbox extraction done; require midnight, 3am habit, cross-device check timestamps, purge tombstones, and delayed-backup tests. |

Completed module inventory, sizes, and test ownership live in `Performance-audit.md` §1; release history lives in `Changelog.md`.

**Dropbox coordination:** `dropbox.js` extracted (v2.64.36) — auth (PKCE), backup/restore, live sync cluster (syncTrello, syncDropbox, checkNewDay, ticker), wake handling, and all state helpers (checked/unchecked/deleted ID logs, Trello tracking maps); 27 exports; 1,975 lines. `_appReady` stays as an inline global (assets/splash.js writes it as a bare identifier). `task-actions.js` and `day-lifecycle.js` can now be assessed; the operation-log, autosave, wake, and day-boundary interfaces are stable and public.

**Keep inline:** startup/init and event wiring (~218 lines) are the composition root and gain little from extraction. Favicon rendering (~53 lines) is too small for a request/module boundary; fold it into a future stats/task controller if that boundary lands. Shared task state remains inline. Extraction is for ownership and navigation, not payload reduction; every module remains part of the same SW-cached app shell.

### 4 · Push Notifications
**Platform:** iOS 16.4+ (installed PWA only) + Android. Web Push API + VAPID keys.
**Stack:** `push` listener in `sw.js`, VAPID keys in Netlify env, two new Netlify functions (store subscription + scheduled send), permission UI in Connections panel.
**Key constraint:** iOS has no background sync — notifications must be server-sent via Netlify Scheduled Functions. The app cannot self-schedule.
**Scope:** day boundaries only — 8pm triage reminder + morning briefing. No habit nudges, no task chasing.

### Meeting mode follow-ons
**Scope boundary (permanent):** phone-call recording is impossible from any app on iOS — the OS never exposes call audio. Mobile meeting mode = in-room/speakerphone capture through the mic. Don't revisit; it's an OS wall, not a PWA limitation.

**Calendar-triggered capture — proposed 2026-08-02, not started.** Can's problem: forgets to click the button almost every time, or misses it mid-meeting when sharing screen. v2.44.0's auto-PiP doesn't solve it — it follows a capture you already started.

**Governing principle:** the calendar is INPUT, never OUTPUT. TODAY reads it to decide *when* to offer something and never renders it back — no agenda, no event list, no "next up". Write this down before any code exists; every future calendar idea will push on it.

**MVP shape:** read-only Google Calendar → the existing v2.44.0 pill appears at meeting start carrying **the join link and a record button**. Nothing else. No auto-record, no calendar data near the AI, nothing displayed. The join link matters as much as record — Can routinely hunts for links, so the pill pays rent on every meeting, not just captured ones.

**Auth:** needs a thin Netlify proxy (Google's ICS endpoint sends no CORS header — verified). OAuth over ICS because attendees aren't in ICS reliably. Cost: calendar read is a sensitive scope, so an unverified personal app has refresh tokens expiring every 7 days in testing mode.

**Open questions before building:** (1) can a link be opened *from* a PiP document — dropped in v2.44.0 as fragile, now load-bearing; (2) needs a clean no-link state (Zoom/Teams/no conferencing); (3) speakers vs headphones — mostly speakers, not a blocker; mic captures the room + call audio through speakers. Headphone upgrade path: mix mic + tab audio via Web Audio — belongs after MVP.

**Auto-record is a posture decision, not a technical one.** Recording by default changes Can's position toward others in the room. Not to be slipped in.

**Attendee names → attribution (deferred, high value).** Calendar attendees turn open-vocabulary name recognition into closed-set disambiguation — hand the AI the attendee list and "Shantano" against `Shantanu Desai` is trivial reasoning. Would also retire manual name entry in Connections.

**Transcription engine bake-off — not started.** Evaluate Gemini (current) vs Whisper vs Deepgram on real recordings. Judge on: task-extraction quality, accuracy on non-Western names/accented speech, cost, latency. Run *after* a few real meetings exist to test against. Capture and extraction are separable layers — engine can be swapped later.

**Granola integration path (researched 2026-08-03 — Can is on free plan, happy with capture).** Granola auto-detects meetings at OS level (PWA can't), outputs structured notes + action items. TODAY's role: task extraction from Granola's output. `get_meetings` (summaries + action items) is available free — enough without the transcript. **Integration MVP:** Granola MCP key in Connections → Netlify function calls `list_meetings` + `get_meetings` → AI extraction → task chips. Manual trigger: user finishes a meeting, opens TODAY, taps import. **Priority within meeting capture:** build Granola integration before investing further in native capture. (Todoist is the highest task-integration priority separately.)

**Gate (unchanged):** extraction quality — are the chips what you'd have written down yourself?

### WEEK — standalone weekly planning companion *(gated)*
**Vision:** separate lightweight weekly planning tool. TODAY = focus instrument, WEEK = planning surface. Predictive AI from observed behaviour — no manual energy ratings.
**Feeds on:** `today_daily_history` (focus sessions, completion times, habit patterns, peak hour — accumulating since v2.17.55).
**Revisit:** ~autumn 2026, with 3+ months of data.

---

## Parked / Someday

| Item | From | What it is | Unpark when / gate |
|------|------|------------|--------------------|
| **Pinch-to-zoom accessibility toggle** | v2.36.9 zoom lock | `user-scalable=no` prevents layout breakage but also disables iOS accessibility zoom. If needed, a toggle that swaps the viewport meta to `maximum-scale=5, user-scalable=yes` would re-enable it. Not in Connections — surface TBD. Not needed now. |
| **Sparse-context AI gate** | #1 verdict + first-run insight 2026-07-20 | When the AI has too little context for a real observation, stay silent — poem leads. Applies especially to first-run users who connect a key early (extends v2.34.0's quiet-first-open principle). | Watch-and-decide with W3 verdicts — a build item only if sparse output proves weak |
| **"How did today feel?" emoji** | Landscape.md (Momentum) | Once daily after triage, optional 5-point | Psychology.md check first — closest of the candidates to mood-tracking |
| **Idle companion artwork** | — | Higher-resolution creatures, consistency across the 7 | If they start mattering |
| **AI system-prompt trimming** | — | Cost <$0.01/day. Never cut: task/habit lists with IDs, JSON rules, personality block | Only if token cost ever matters |
| **Trello checklist write-back** | — | Write checklist state back to Trello | Only if editing is actually wanted |

---

## Decisions & boundaries *(reference — rarely changes)*

### Watching
| Decision | Current | Watch for |
|----------|---------|-----------|
| Modularization | `index.html` is ~8.3K lines with 20 same-origin assets; Dropbox extraction landed in v2.64.36 | Focus is next. After Focus: AI config fold-in → Nudge → Assistant → Task Actions → Day Lifecycle. Startup remains inline; shared state and merge boundaries stay test-gated. |
| Merge-anomaly observability | Dropbox emits a console-only `[merge-anomaly]` breadcrumb; there is no persisted counter or Connections metric | Revisit only if anomalies appear during debugging or WEEK needs a measurable conflict rate. Do not describe this as live product telemetry. |
| Dated AI-cache sync | Four fields are hand-plumbed: `day_nudge_ai`, `week_reflection`, `monday_intention`, and `week_theme_ai` | The rule-of-three threshold has been exceeded. Create one declarative cache registry before adding a fifth dated AI field. |
| Morning nudge usefulness | v2.43.5 rebalanced list vs memory context; generation runs after sync and the resulting line syncs cross-device | Ask for the About panel's Today line verbatim. Does it name a specific current task without biography drift, reflect the synced list, and stay quiet when nothing stands out? If not, cut `Past suggestions` + `Recent conversations` before more prompt tuning. |

### Wallpaper Test — W3 follow-ups (day-14 behavioral check)
> Resolve each row — **kept** (delivering), **iterated**, or **removed**.
> **Pre-registration (2026-07-20):** in the week before each verdict, note a one-word observation each time the surface is used or skipped.

| Surface | Shipped | W3 due | Status |
|---------|---------|--------|--------|
| Season moments (24/year) | v2.60.0 | next appearance 2026-08-23 | Open — rarity is the escape, so judge per appearance rather than after 14 days. Next line: “Mornings have an edge to them now.” Does it feel noticed or like a calendar readout? |
| Focus companion question | v2.65.0 | 2026-08-31 | Improved: taxonomy-based system prompt, drag-word + letgo-reason signals, worked-today / last-worked-N-days, word cap 18→22. Re-observe after a week of sessions — does the question now feel like a moment of clarity rather than a check-in? |
| About contextual CTAs | v2.64.10 | 2026-08-25 | Open — Focus Copy, `see more`, and poem `share` now share the bordered CTA treatment. Does the border make the actions clearer without pulling attention from the week/poem content? |
| Connections privacy reassurance | v2.64.11 | 2026-08-26 | Open — one appearance per device when fully disconnected. Does it feel like timely reassurance, or like policy copy interrupting setup? |
| Sunday recap + Monday intention (memory-enriched) | v2.65.1 | 2026-08-24 | Verdict (2026-08-17): Monday synthesis is nice, not unhappy with it. Data source fixed: now includes Soon + Trello cards (was manual only). Re-observe next Monday — does broader view produce a more relevant orientation line? |
| Memory panel quality gate | v2.47.0 | 2026-09-01 | Open — are AI-generated hypotheses earning confirmation or getting dismissed? High dismiss rate = prompting or data quality problem. |

### Not implementing
| Feature | Reason |
|---------|--------|
| Weather-aware nudges or suggestions | **Rejected 2026-08-17.** Weather and geolocation add an external-data dependency and a new Connections privacy boundary without a demonstrated need. Do not re-propose. |
| Truncating task text | **Rejected 2026-08-01.** Task text is primary content — hiding its tail trades legibility for tidiness. Wrapping is correct; do not re-propose clamping as a "tidiness" fix. |
| Keyboard shortcuts (desktop) | No demonstrated need — revisit only if a real workflow gap shows up. |
| Widget / Home Screen | Needs WidgetKit / native Android — not reachable from a PWA. |
| Quick capture (without opening app) | No good cross-platform path. iOS has no PWA share target; Siri needs a native app. |
| Microsoft Notes integration | No clear user need. |
| Momentum integration | No public API; ICS is inbound-only. |
| Calendar integration (as agenda) | Rejected as a *displayed* surface. Calendar-triggered capture in #9 reads it as INPUT only — never rendered back. Not as an agenda/time-blocker; that's planner drift. |
| Slack / Gmail / stream extraction | Wrong trust model + needs server-side token storage (breaks client-only posture) + renders other people's demands into the calm list. Task-unit integrations (Trello, Todoist #6) remain the open lane. |
| In-app analytics / session replay (including Umami Cloud) | **Rejected 2026-08-11.** TODAY promises no observation, not merely cookie-free analytics. A tracker creates observer-owned sessions and can expose Dropbox query codes or Trello hash tokens from OAuth callbacks. If acquisition analytics is ever useful, keep it on a separate public landing surface. Explicit opt-in, content-free aggregate diagnostics is the only in-app lane. |

### Rejected approaches
| Area | Rejected | Reason |
|------|----------|--------|
| Quick capture | iOS Share Sheet / Shortcuts | No PWA share-target support on iOS. |
| Quick capture | Web share target | Android-only, inconsistent. |
| Sync | Real-time WebSocket | Overkill for single-user; Dropbox polling is simpler. |
| Sync | Conflict-resolution UI | Union merge + timestamps handles 99% of cases. |
| Sound | Web Audio with `.then()` | Lag after inactivity; play immediately instead. |
| Idle creatures | Complex AI behaviours | Simple random movement is charming enough. |
| Habits | Streak penalties | Anxiety-inducing; acknowledge, don't punish. |

---

*History (shipped features, fixed bugs) lives in `Changelog.md`, `archive/Changelog-archive.md`, and `archive/Bugs-archive.md` — intentionally not mirrored here.*
