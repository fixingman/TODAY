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
| 3 | **Module extraction** | In progress | 16 modules extracted. Next: `focus.js`. The complete reviewed extraction queue is tracked below. Direct sync extraction is deferred. Inventory and decision gates ↓ |
| 4 | **Push notifications — day boundaries only** | Not started | Evening triage + morning briefing only. Needs server infra — detail ↓ |
| 6 | **Todoist integration** | Not started | Highest task-integration priority after Trello. ~1.5× Trello effort — `research/Integrations.md`. |
| 9 | **Meeting mode v2** | Mobile awaiting device verify | Language ✅ done. In-room meetings on iOS PWA — detail ↓ |

*Shipped & closed: #1 morning nudge (verdict: kept, verbatim quotes v2.32.3), #5 first-run (v2.34.0), #7 About contextual digest layer (feature-complete v2.48.2), #8 PAST revive (v2.27.0). History in `Changelog.md`; numbers stay retired.*

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

**Extracted (16):** `util.js` · `idle.js` · `sound.js` · `celebration.js` · `trello.js` · `insights.js` · `error-monitor.js` · `poem-utils.js` · `splash.js` · `platform.js` · `drag.js` · `meeting.js` · `memory-panel.js` · `triage.js` · `zones.js` · `habits.js`. Exact sizes, versions, and runtime ownership live in `Performance-audit.md` §1.

| Order | Module | Size | Gate |
|---|---|---:|---|
| Done | `meeting.js` | ~715 | Extracted v2.64.29. Physical baseline on v2.64.28 confirmed; post-extraction test on deployed v2.64.29 still pending (Can to run). |
| Done | `memory-panel.js` | ~520 | Extracted v2.64.30. `scripts/memory-panel-test.mjs` written; all 9 assertions pass. Post-extraction physical test pending. |
| Done | `triage.js` | ~545 | Extracted v2.64.31. `scripts/triage-test.mjs` written; all 10 assertions pass (pre and post). |
| Done | `zones.js` | ~293 | Extracted v2.64.32. `scripts/zones-test.mjs` written; all 11 assertions pass (pre and post). soonTasks/pastTasks/triageDismissedToday stay as inline globals — wholesale-reassigned by merge layer. |
| 1 | `focus.js` | ~1,332 | Ready—strong automated invariant coverage. |
| 3 | `about.js` | ~585 | Test poem sharing, weekly stats, Noticed, Sunday reflection, and Monday intention. |
| 4 | `connections.js` | ~430 | Test credential combinations, privacy gate, offline state, and provider rendering. |
| Done | `habits.js` | ~403 | Extracted v2.64.33. `scripts/habits-test.mjs` written; all 11 assertions pass (pre and post). All 4 state vars stay as inline globals — wholesale-reassigned by merge layer. `_getHabitDates` private. |

**Deferred:** do not extract the ~1,968-line sync/wake cluster wholesale. First separate and test merge rules, Dropbox transport, persistence timestamps, and wake orchestration; only a resulting low-coupling unit becomes a module.

**Ceiling:** AI orchestration, shared task state, task rendering/actions, nudges, and startup/day orchestration remain inline until they gain explicit state APIs or materially better regression coverage. Candidate modules above move only after their listed gates pass. Zones is a controller-only boundary: its shared arrays stay inline. Extraction is for ownership and navigation, not payload reduction; every module remains part of the same SW-cached app shell.

### 4 · Push Notifications
**Platform:** iOS 16.4+ (installed PWA only) + Android. Web Push API + VAPID keys.
**Stack:** `push` listener in `sw.js`, VAPID keys in Netlify env, two new Netlify functions (store subscription + scheduled send), permission UI in Connections panel.
**Key constraint:** iOS has no background sync — notifications must be server-sent via Netlify Scheduled Functions. The app cannot self-schedule.
**Scope:** day boundaries only — 8pm triage reminder + morning briefing. No habit nudges, no task chasing.

### 9 · Meeting mode v2 — mobile
**Scope boundary (permanent):** phone-call recording is impossible from any app on iOS — the OS never exposes call audio. Mobile meeting mode = in-room/speakerphone capture through the mic. Don't revisit; it's an OS wall, not a PWA limitation.

**Open:** post-extraction physical test on v2.64.29 pending (meeting mode on iPhone PWA). Automated baseline green — all 14 meeting-test.mjs assertions pass.

**Device gate:** run a named Gemini-backed recording beyond the two-minute AAC boundary with distinct tasks spoken before and after rollover; verify chronological attribution/selection, non-blocking task entry, acceptance/sync, foreground wake lock, and clean teardown. Then lock/background a second recording and confirm it either resumes safely or stops with the honest suspension note—never falsely live. Repeat the critical paths on `dev` after extraction before advancing to `focus.js`.

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
| **Weather awareness** | #1 deeper-personality | Weather-aware nudge/suggestions | Needs geolocation + weather API = new Connections data-boundary row. Decide deliberately if ever |
| **Idle companion artwork** | — | Higher-resolution creatures, consistency across the 7 | If they start mattering |
| **AI system-prompt trimming** | — | Cost <$0.01/day. Never cut: task/habit lists with IDs, JSON rules, personality block | Only if token cost ever matters |
| **Trello checklist write-back** | — | Write checklist state back to Trello | Only if editing is actually wanted |

*(Left this list 2026-07-19: learned patterns → v2.35.0, energy-aware suggestions → v2.35.1, revived counter to AI → v2.35.2. Left 2026-08-08: skip-reason on letgo → v2.54.0/v2.55.0; Sekki season moments → v2.60.0.)*

---

## Decisions & boundaries *(reference — rarely changes)*

### Watching
| Decision | Current | Watch for |
|----------|---------|-----------|
| Modularization | Single file (~13.9K lines) + `assets/poems.js` + extracted modules | Roadmap #3 in progress; 11 modules extracted. Meeting is active behind its physical iPhone gate; reviewed queue: Focus → Memory panel → About → Connections → Zones → Habits → Triage. Direct sync extraction stays deferred. Meeting, drag, platform, splash, focus, and smoke tests guard the affected paths. |
| Sync conflict rate | Merge-anomaly counter live (Connections → Dropbox) | If count climbs above zero in normal use, revisit conflict handling before WEEK consumes the data. |
| Dated AI-cache sync | 2 instances hand-plumbed (nudge v2.27.0b, weekly block v2.36.1/BUG-057) | **Rule of three:** the next AI-generated daily text must trigger a registry instead of a third hand-plumbing — same payload + remote-wins-merge pattern each time. |
| open_triage second use | Shipped v2.36.0 from Can's own request | ⚠️ Mid-Aug deadline reached (2026-08-08) — ask Can whether he's used `open_triage` unprompted, or if discoverability should be improved / feature removed. |
| Morning nudge quality | v2.38.6 — removed the "position 1 = priority" framing that caused top-task echo | Does it now genuinely surface a different task when one is stuck/revived/overdue, and go quiet when nothing stands out? **When asked "how's the nudge doing?" — ask for the About panel's Today line verbatim.** That block renders the same `day_nudge_ai_<date>` string. If it drifts generic, next cut is `Past suggestions` + `Recent conversations`, not more instruction tuning. |
| Morning nudge context balance | v2.43.5 — rebalanced after `_memoryForAI()` was 56% of the prompt vs 35% for the actual list | Does the nudge still name a specific task in the user's own words, or drift toward generic biography filler? Watch on real device with a key. |
| Morning nudge staleness | v2.37.6 — generation moved to post-sync re-check | Does the nudge reflect the freshest cross-device list on cold start? If still behind, widen `_raceAINudge`'s 1s timeout. |
| Monday intention prompt | v2.36.4 fix (pending-only) | Watch for same echo pattern as nudge — does it synthesize or restate? |
| Meeting `mine` attribution | v2.37.4 — attribution now tracks who's speaking, not just whether a name was said | Ask after a handful of real meetings: read `appMemory.meetingAttribution` (`mineKept/mineShown` for precision, `othersSelected/othersShown` for recall). |

### Wallpaper Test — W3 follow-ups (day-14 behavioral check)
> Resolve each row — **kept** (delivering), **iterated**, or **removed**.
> **Pre-registration (2026-07-20):** in the week before each verdict, note a one-word observation each time the surface is used or skipped.

| Surface | Shipped | W3 due | Status |
|---------|---------|--------|--------|
| Morning nudge AI line | v2.17.73 | 2026-07-18 | ✅ Kept + iterated — read every time; task references now verbatim (v2.32.3). |
| Week-grid "best day" dot | v2.17.121 | 2026-06-30 | ✅ Kept — works well (verified 2026-07-15). |
| Poem splash coda | v2.26.0 | 2026-07-28 | ✅ Kept + iterated — coda never became wallpaper; timing fix v2.36.8; poem share shipped v2.40.0. |
| Daily brief (✦ brief) | v2.29.0 | 2026-07-28 | ❌ Removed v2.40.9 — content redundant with About; fixing discoverability would have made a redundant feature easier to find. |
| Today block in About | v2.33.0 | 2026-08-01 | ✅ Kept (2026-07-31) — adds value as a content layer; About is where the nudge actually lands and gets read. |
| Season moments (6/year) | v2.37.0 | first appearance 2026-09-01 | Open — 14-day window doesn't apply (fires ~6×/year); judge per appearance. Sep 1 "First day of autumn.": does it land as noticed or as calendar readout? |
| Focus companion question | v2.45.0 / v2.53.0 / v2.64.9 | 2026-08-16 | Open — does the question feel like a thoughtful friend or a template? v2.64.9 makes time references concrete after “this late” landed without a clock value. Does exact time improve the observation, or does it feel overly literal? |
| About contextual CTAs | v2.64.10 | 2026-08-25 | Open — Focus Copy, `see more`, and poem `share` now share the bordered CTA treatment. Does the border make the actions clearer without pulling attention from the week/poem content? |
| Connections privacy reassurance | v2.64.11 | 2026-08-26 | Open — one appearance per device when fully disconnected. Does it feel like timely reassurance, or like policy copy interrupting setup? |
| Sunday recap + Monday intention (memory-enriched) | v2.48.2 | 2026-08-17 | Open — does the Monday line name something specific to how you work, or still feel generic? Quality improves as confirmed memory inferences accumulate. |
| Memory panel quality gate | v2.47.0 | 2026-09-01 | Open — are AI-generated hypotheses earning confirmation or getting dismissed? High dismiss rate = prompting or data quality problem. |
| Noticed block in About | v2.35.0–v2.39.0 | 2026-08-09 | ✅ Kept (2026-08-03). **Hypothesis:** as Memory panel accumulates confirmed inferences, Noticed observations will become more specific without new code — watch whether Noticed content shifts character after the first batch of confirmed memory inferences. |
| Memory auto-sync (patterns, inferences, moments) | v2.64.23 | 2026-08-29 | Open — does appMemory now converge across devices without manual Restore Backup? Check that `today_memory` on both devices has matching `semantic.length` after a few auto-sync cycles (7s ticker). BUG-073 side-effect: focus minutes (BUG-066) and cross-device keyword counts should also now reconcile automatically. |
| Sync hardening (streak, checked_ids LWW, Trello config, Trello maps pruning) | v2.64.22 | 2026-08-29 | Open — does the streak stay accurate after leaving the app open overnight? On the weaker device (ticker runs first), the streak should no longer re-inflate to yesterday's count after midnight reset. |

### Not implementing
| Feature | Reason |
|---------|--------|
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
