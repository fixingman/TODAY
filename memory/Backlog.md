# Backlog

> **Forward-looking only: what to build next, what's parked, and decisions made.**
> Shipped work → `Changelog.md` (+ `archive/Changelog-archive.md`). Fixed bugs → `archive/Bugs-archive.md`. History is not duplicated here.

---

## ◎ North star (agreed Jun 2026)

**Own the first 30 seconds of the day.** The morning is becoming TODAY's signature beat — nudge, poem, briefing. Roadmap items 1 and 2 serve it directly; everything else supports or follows. How intelligence and personalization serve this → `design/Personalization.md`.

---

## ▸ Roadmap (prioritised, Jun 2026 review)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | **Morning nudge — iterate** | Verdict pending (Can) | 4 weeks collected (plan said one). Three questions decide the iteration — detail ↓ |
| 2 | **Poem corpus growth** | Ongoing | Splash coda + echo shipped v2.26.0. Corpus growth continues — detail ↓ |
| 3 | **Module extraction** | In progress | **Done:** util/idle/sound/celebration.js. **Next, risk-ascending:** `trello.js` (~174 lines, Rule 27 patch path), `insights.js` (~384), `sync.js` (~510, Non-Delegation). **Ceiling:** coupled core (`_onWake`, focus IIFE, render/actions/habits + `$`) stays inline — extracting it needs ES modules + build step (breaks Rule 24). |
| 4 | **Push notifications — day boundaries only** | Not started | Evening triage + morning briefing only. Needs server infra — detail ↓ |
| 5 | **First-run experience** | Narrowed (Jul 2026) | Empty morning + everything-done covered by the v2.26.0 poem echo. Remaining scope: brand-new-user first open only. Fold into a quiet week. |
| 6 | **Todoist integration** | Not started | Highest integration priority after Trello. ~1.5× Trello effort — `research/Integrations.md`. |
| 7 | **About — contextual digest layer** | Shipped v2.29.0 | Empty ✦ → daily brief (nudge + day shape + poem + Sunday/Monday layer). Task type summarization also ships as the data layer. W3 verdict due 2026-07-30. Detail ↓ |
| 8 | **Revive from PAST → SOON** | Shipped v2.27.0 | Hover `↩︎ soon` on aged/let-go PAST rows — same ID, `revived` counter, timestamp-aware merge guard. Verify on real devices. |
| 9 | **Meeting mode v2 — mobile + language** | Language shipped v2.27.2; mobile shipped v2.28.0 | In-room meetings on iOS PWA (phone calls impossible — iOS never exposes call audio, even to native apps). Awaiting real-device verify. Detail ↓ |

**Awaiting device verification:** WAAPI wake behaviour — watch for BUG-004 recurrence after long sleep.

**Gated:** WEEK companion — decide ~autumn 2026 (needs 3+ months data + #1 learnings + #3 done). Detail ↓

**Parked:** idle companion artwork · AI prompt trimming · Trello checklist write-back. Detail ↓

---

## Details

### 1 · Morning Nudge
**Verdict pending — three questions for Can (Jul 2026):**
1. Still read it, or do eyes slide over it? (W1 behavioural symptom)
2. Ever wrong — naming something that isn't the thing that matters?
3. Ever acted on — did it make you focus a task or move one to Soon?

**Iteration paths by answer:**
- Eyes slide → the *shape* is wallpaper, not the words ("X waiting N days" converges every morning). Fix is input variety: feed day-shape context (first-open time, weekday, habits state) so lines differ structurally, not just lexically. **Strongest candidate input (Jul 2026): read-only calendar busy/free shape** — "three meetings before noon" vs "clear day" makes lines differ from real context (the W2 escape the nudge lacks). Google Calendar read-only is client-side feasible (PKCE, same pattern as Dropbox — no server, no event content beyond busy/free). Reach for this before the action-chip experiment. Never an events panel — see Not-implementing table.
- Sometimes wrong → tighten facts: it currently sees the first 6 tasks in drag order, not the oldest 6.
- Never acted on → the action-chip question (focus / move to Soon attached to the line) — real feature step, own mock round.

**Parked idea (Jul 2026):** the nudge and poem both fire on first open but don't know about each other. On mornings with nothing insight-worthy, the nudge could stay silent and let the poem be the morning — its escape-1 gate can be stricter now that the poem covers "the morning has an opening moment."

**Later:** deeper personality (weather/energy awareness beyond peak hour, richer habit-streak celebrations).

### 2 · Daily Poem Corpus Growth
**Process:** curation rounds in chat — Claude proposes verified candidates, Can cuts by number. Accepted poems land in `assets/poems.js`.

**The brief:**
> 2–11 lines. Human-written, worldwide public domain (author AND translator d. pre-1956; rolls forward each year). Voice: spare, concrete, present-tense, clear/light/affirming — mornings, evenings, seasons, small noticed things. In: imagism, haiku, plain free verse, rhymed-lyrical if the feeling is real and resolves held/affirmed. Out: quaint, ornate, cutesy, preachy, bleak-unresolved, abstraction without an image.
> **App-moment test:** would this still feel right beside an undone task list? If it depends on being read in isolation, cut it.
> **Corpus-fit test:** does it sit comfortably next to Bashō and Marcus Aurelius in tone? The existing corpus is the style reference, not just a checklist.
> **PD check:** verify text verbatim against Wikisource / Gutenberg / archive.org — never from memory. Confirm death dates for author and translator.
> **Search process:** search by named PD anthology or translator, not by theme or region (`"[name]" site:gutenberg.org OR site:en.wikisource.org OR site:archive.org`). Region is a tiebreaker only — when two candidates tie on quality, prefer the one from a country not yet represented.

**Taste signal:** spare/clear/affirming in; quaint, ornate, bleak out. Rhyme is fine if the feeling is real — quaintness disqualifies, not rhyme. Melancholy-but-held is IN (Rilke 'Autumn'); calm-pastoral cut — gravity beats gentleness. Compressed Stoic prose works (Farquharson); diary-length doesn't. A poem that passes the brief but feels wrong beside a task list: cut on app-moment test.

**Seasons:** W9 / Sp11 / Su10 / Au10 / year-round 49 — corpus 89, target ~95.

**PD notes:** US-PD-only retired. 11 grandfathered poems pending Can's decision (keep or purge): Frost ×3, WCW, Sandburg, H.D., Waley trans. ×5. Future unlocks: cummings 2033, Frost/WCW worldwide 2034, Eliot 2036.

**Country balance:** China is most-represented (Li Po ×2, Tu Fu, Yang-ti, Po Chü-i, Lu Yün, Wen T'ung, anon 6th c.) — apply tiebreaker against further Chinese picks.

**Parked candidates (verified; re-run through app-moment/corpus-fit before proposing):**
- Ou-yang Hsiu 'Bell Hill' (Cranmer-Byng trans.) — 4 lines, year-round — passed both tests, held by China tiebreaker only
- Hardy 'In Time of The Breaking of Nations' (Wikisource) — 12 lines, year-round — not yet re-tested
- Dickinson 'To make a prairie' (Wikisource) — 5 lines, year-round — not yet re-tested
- Wordsworth 'My Heart Leaps Up' — 4-line excerpt already in corpus; full version not needed
- Edward Thomas 'Adlestrop' — 16 lines, over limit, skip

**Active leads:**
- Chamberlain 1902 (archive.org) — ~100 haiku, productive
- Teasdale 'February Twilight' (*Dark of the Moon* 1926) — needs source scan
- Aubrey Stewart (d.1918) trans. Seneca *Minor Dialogues* — worldwide PD, Standard Ebooks; two entries from round 17 need archive.org verify
- Cranmer-Byng *A Feast of Lanterns* (archive.org `in.ernet.dli.2015.282424`) — Ou-yang Hsiu, Yuan Mei, Liu Tzu-hui available when China tiebreaker lifts
- Prose at Marcus Aurelius length (2–5 sentences) works; Whitman/Thoreau too long but short entries worth seeking; Muir *First Summer* (d.1914) worth a targeted pass; Garnett-trans. Chekhov nature prose not yet searched
- Closed: London Snow (too long), Turkish/Sufi (no worldwide-PD English), Poe (anguished), Egyptian/African/Scandinavian (PD-translation bottleneck)

### 4 · Push Notifications
**Platform:** iOS 16.4+ (installed PWA only) + Android. Web Push API + VAPID keys.
**Stack:** `push` listener in `sw.js`, VAPID keys in Netlify env, two new Netlify functions (store subscription + scheduled send), permission UI in Connections panel.
**Key constraint:** iOS has no background sync — notifications must be server-sent via Netlify Scheduled Functions. The app cannot self-schedule.
**Scope:** day boundaries only — 8pm triage reminder + morning briefing. No habit nudges, no task chasing.

### 7 · About — Contextual Digest Layer
**Concept:** Periodic, context-aware content in About based on day/week. No push, no server — pure local data.
**Candidate moments:** Sunday weekly recap · Monday intention prompt · Daily contextual hint (insight-gated) · Milestone surfaces (streak/focus)
**Key relationships:** nudge (#1) is task-list one-liner, morning only; digest is About panel, richer, time-of-week aware. Push (#4) would carry the same content externally — build in-app first. Poem (#2) is static per-day; digest is dynamic per-context.
**Candidate first brick (Jul 2026, from Dia browser research):** after dismissal, the day's nudge line lives quietly in About until midnight. Dia's Morning Brief insight: people return to the morning framing all day — TODAY's nudge is dismiss-once-and-gone. Tiny build (AI line already cached per-day in `day_nudge_ai`), and it makes About the home of "today's context" — exactly what the digest layer needs. **Sequence after the #1 verdict** — if eyes slide over the nudge, persisting it just gives wallpaper a second home. Dia validates the #7 thesis overall (their Monday Brief is their most-praised feature); their aggregation/extraction model itself stays rejected (external-tool sprawl).
**Entry point — repurpose ✦ empty-tap into the brief (Jul 2026):** Can reports he almost never uses the ✦ ask path — the manual formulate-a-question entry failed its own Wallpaper Test while the passive AI surfaces (nudge, triage hints, chips, Sunday reflection) carry all the value. Instead of removing it: **empty-tap ✦ → today's brief** (day's nudge line, day shape, poem echo — composed, not conversational); text + ✦ still asks the AI, so Rule 7's route survives underneath. ✦ keeps meaning "AI presence," payoff flips from "type a question" to "here's what I'd tell you right now" — Dia's return-to-the-brief insight on a button we already own. Means #7 needs no new surface: the unused button becomes the door to the digest layer. Same gate: after the #1 verdict (the brief's main ingredient is the nudge line). Notification testing (the original prompt for this) stays out — dev harness, not user value; use a `?test=notif` query param when #4 nears.

### 8 · Revive from PAST → SOON *(shipped v2.27.0 — see Changelog.md / Sync.md)*
**Remaining:** real-device verify. Future: surface the `revived` counter to nudge/insights ("this one came back twice"). Philosophy guard held: no bulk revive, done items stay put.

### 9 · Meeting mode v2 — mobile + language *(agreed Jul 2026)*
**Scope boundary first:** phone-call recording is impossible from any app on iOS — the OS never exposes call audio (only Apple's own 18.1+ built-in recorder). Mobile meeting mode = in-room/speakerphone capture through the mic. Don't revisit this; it's an OS wall, not a PWA limitation.

**Mobile build (the v2 sketched in Components.md § Meeting Mode):**
1. Gate: `_meetingSupported()` currently excludes all touch devices (`!('ontouchstart' in window)`) — replace with a capability check.
2. MIME: iOS MediaRecorder produces `audio/mp4` (AAC), not webm/opus. Plumbing mostly exists (`_mtg.mime` per-meeting); re-verify the 32 kbps bitrate keeps a 6-min AAC chunk under Netlify's 6MB body limit.
3. **Suspension is the real design work:** iOS kills the recorder the moment the screen locks or the app backgrounds. Screen Wake Lock API (iOS 16.4+) keeps the screen on, but the contract is *phone on the table, screen on, app foreground for the whole meeting*. The dangerous failure is silent partial capture (user thinks they got an hour, got 10 min) — on resume, detect the dead recorder and say honestly what was captured. UX for this failure state is the bulk of the work.

**Language — shipped v2.27.2:** one prompt line in `netlify/functions/meeting-extract.js` ("phrase each item in the language spoken in the meeting — do not translate to English"). Auto-detect, no setting. Name attribution already worked cross-language. Verify with a real non-English meeting.

**Mobile — shipped v2.28.0:** capability-only gate, 2-min iOS AAC chunks (+ 4.3MB size guard), onstop identity guard, Screen Wake Lock, suspension health-check state machine, honest-note UI on lock. Awaiting real-device verify on iPhone PWA.

**Gate (unchanged from Components.md):** v1 extraction quality — Wallpaper Test: are the chips what you'd have written down yourself? Mobile multiplies the surface; confirm the extraction earns it first.

### WEEK — standalone weekly planning companion *(gated)*
**Vision:** separate lightweight weekly planning tool. TODAY = focus instrument, WEEK = planning surface. Predictive AI from observed behaviour — no manual energy ratings.
**Feeds on:** `today_daily_history` (focus sessions, completion times, habit patterns, peak hour — accumulating since v2.17.55).
**Revisit:** ~autumn 2026, with 3+ months of data.

---

## Parked / Someday

- **Idle companion artwork** — higher-resolution creatures, consistency across the 7. Revisit if they start mattering.
- **AI system-prompt trimming** — cost is <$0.01/day; only if token cost ever matters. Never cut: task/habit lists with IDs, JSON rules, personality block.
- **Trello checklist write-back** — build only if editing is actually wanted.

---

## Decisions & boundaries *(reference — rarely changes)*

### Watching
| Decision | Current | Watch for |
|----------|---------|-----------|
| Modularization | Single file (~12K lines) + `assets/poems.js` | Roadmap #3 is the plan; smoke test guards the boot path. Revisit harder if growth continues. |
| Sync conflict rate | Merge-anomaly counter live (Connections → Dropbox) | If count climbs above zero in normal use, revisit conflict handling before WEEK consumes the data. |

### Wallpaper Test — W3 follow-ups (day-14 behavioral check)
> Resolve each row — **kept** (delivering), **iterated**, or **removed**.

| Surface | Shipped | W3 due | Status |
|---------|---------|--------|--------|
| Morning nudge AI line | v2.17.73 | verdict pending | Open — 4 weeks collected; three questions in Roadmap #1 detail decide the iteration |
| Week-grid "best day" dot | v2.17.121 | 2026-06-30 | ✅ Kept — dot lands correctly, works well (verified 2026-07-15) |
| Poem splash coda + clean-slate echo | v2.26.0 | 2026-07-28 | Open — gift or gate? Does the echo add warmth or become invisible after the first week? |

### Not implementing
| Feature | Reason |
|---------|--------|
| Keyboard shortcuts (desktop) | No demonstrated need — revisit only if a real workflow gap shows up. |
| Widget / Home Screen | Needs WidgetKit / native Android — not reachable from a PWA. |
| Quick capture (without opening app) | No good cross-platform path. iOS has no PWA share target; Siri needs a native app. |
| Microsoft Notes integration | No clear user need. |
| Momentum integration | No public API; ICS is inbound-only. |
| Calendar integration (as agenda) | Not as an agenda/time-blocker — that's planner drift. The read-only day-shape signal version is now a conditional candidate in Roadmap #1's iteration paths (Jul 2026) — gated on the #1 verdict. Never a pinging events panel. |
| Slack / Gmail / stream extraction | Their native unit is a message stream, not a task — turning streams into tasks needs an AI extraction layer (Dia's whole company). Wrong trust model (TODAY reads nothing you didn't type or put on a board), needs server-side token storage (breaks the client-only posture), and renders other people's demands into the calm list — the exact chasing mechanic this table exists to block. Task-unit integrations (Trello, Todoist #6) remain the open lane. |

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
