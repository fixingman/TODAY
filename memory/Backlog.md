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
| 2 | **Poem corpus growth** | Ongoing | Corpus 95, target ~100. A cut is final — detail ↓ |
| 3 | **Module extraction** | In progress | **Done:** util/idle/sound/celebration/trello/insights.js (insights v2.33.10, ~415 lines — first module that owns its state and runs at eval; must load after util.js). **Next:** `sync.js` (~510, Non-Delegation) — needs a risk discussion before touching. **Ceiling:** coupled core (`_onWake`, focus IIFE, render/actions/habits + `$`) stays inline — extracting it needs ES modules + build step (breaks Rule 24). |
| 4 | **Push notifications — day boundaries only** | Not started | Evening triage + morning briefing only. Needs server infra — detail ↓ |
| 6 | **Todoist integration** | Not started | Highest integration priority after Trello. ~1.5× Trello effort — `research/Integrations.md`. |
| 7 | **About — contextual digest layer** | In progress | Brief (v2.29.0) + Today block (v2.33.0) shipped; next bricks gated on W3 verdicts: brief 2026-07-30, Today block 2026-08-01. Detail ↓ |
| 9 | **Meeting mode v2** | Mobile awaiting device verify | Language ✅ done. In-room meetings on iOS PWA — detail ↓ |

*Shipped & closed (2026-07-18): #1 morning nudge (verdict: kept, verbatim quotes v2.32.3), #5 first-run (v2.34.0), #8 PAST revive (v2.27.0). History in `Changelog.md`; numbers stay retired.*

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

**Taste signal:** spare/clear/affirming in; quaint, ornate, bleak out. Rhyme is fine if the feeling is real — quaintness disqualifies, not rhyme. Melancholy-but-held is IN (Rilke 'Autumn'); calm-pastoral cut — gravity beats gentleness. Compressed Stoic prose works (Farquharson); diary-length doesn't. A poem that passes the brief but feels wrong beside a task list: cut on app-moment test.

**Seasons:** W11 / Sp11 / Su10 / Au10 / year-round 53 — corpus 95 (round 20: Ransetsu, Seibu — v2.33.7; target reached), new target ~100.

**PD notes:** US-PD-only retired. 11 grandfathered poems pending Can's decision (keep or purge): Frost ×3, WCW, Sandburg, H.D., Waley trans. ×5. Future unlocks: cummings 2033, Frost/WCW worldwide 2034, Eliot 2036.

**Country balance:** China is most-represented (Li Po ×2, Tu Fu, Yang-ti, Po Chü-i, Lu Yün, Wen T'ung, anon 6th c.) — apply tiebreaker against further Chinese picks.

**Curation rule (2026-07-18): a cut is final.** Candidates Can didn't pick are dead — never re-proposed, no parked list. Each round proposes fresh finds only. (Not-picked, for the record so they aren't re-found: Ou-yang Hsiu 'Bell Hill', Yeats 'Cloths of Heaven', Landor 'Dying Speech', Moritake butterfly, Hokushi 'burnt out'.)

**Active leads:**
- Chamberlain 1902 (archive.org/details/basho-and-the-japanses-poetical-epigram) — productive; identifier confirmed
- Cranmer-Byng *A Feast of Lanterns* (archive.org `in.ernet.dli.2015.282424`) — Yuan Mei, Liu Tzu-hui unproposed, available when China tiebreaker lifts
- Prose at Marcus Aurelius length (2–5 sentences) works; Muir *First Summer* (d.1914) worth a targeted pass; Garnett-trans. Chekhov nature prose not yet searched
- Closed: London Snow (too long), Turkish/Sufi (no worldwide-PD English), Poe (anguished), Egyptian/African/Scandinavian (PD-translation bottleneck)

### 4 · Push Notifications
**Platform:** iOS 16.4+ (installed PWA only) + Android. Web Push API + VAPID keys.
**Stack:** `push` listener in `sw.js`, VAPID keys in Netlify env, two new Netlify functions (store subscription + scheduled send), permission UI in Connections panel.
**Key constraint:** iOS has no background sync — notifications must be server-sent via Netlify Scheduled Functions. The app cannot self-schedule.
**Scope:** day boundaries only — 8pm triage reminder + morning briefing. No habit nudges, no task chasing.

### 7 · About — Contextual Digest Layer
**Concept:** Periodic, context-aware content in About based on day/week. No push, no server — pure local data.
**Candidate moments:** Sunday weekly recap · Monday intention prompt · Daily contextual hint (insight-gated) · Milestone surfaces (streak/focus) · **Learned patterns** ("what TODAY has noticed" — peak hour, themes, best streak; Personalization.md G3, un-gated by the #1 verdict; needs a Wallpaper-proof design — a static line is wallpaper in three readings)
**Open question (from chips discovery, Jul 2026):** the ✦ brief's chips fallback now fires only on genuine failure (no key / offline / API error) — in that rare state, is poem-only or nothing better than chips? Fold into the first #7 brick after the W3 verdicts.
**Key relationships:** nudge (#1) is task-list one-liner, morning only; digest is About panel, richer, time-of-week aware. Push (#4) would carry the same content externally — build in-app first. Poem (#2) is static per-day; digest is dynamic per-context.
**Shipped so far:** ✦ brief (v2.29.0) and Today block in About (v2.33.0) — nudge+poem available all day. Implementation history → `Changelog.md`. About is becoming the home of "today's context" — exactly what the digest layer needs; Dia's Monday Brief validates the thesis (their aggregation/extraction model stays rejected — external-tool sprawl).
**Next bricks gated on the two W3 verdicts** (brief 2026-07-30, Today block 2026-08-01): if both earn their place, the candidate moments above are the menu. Notification testing stays out — dev harness, not user value; use a `?test=notif` query param when #4 nears.

### 9 · Meeting mode v2 — mobile
**Scope boundary (permanent):** phone-call recording is impossible from any app on iOS — the OS never exposes call audio (only Apple's own 18.1+ built-in recorder). Mobile meeting mode = in-room/speakerphone capture through the mic. Don't revisit this; it's an OS wall, not a PWA limitation.

**Open:** mobile (v2.28.0) awaiting real-device verify — a real in-room meeting on iPhone PWA (contract: phone on the table, screen on, app foreground). Implementation → `Changelog.md` v2.28.0.

**Gate (unchanged from Components.md):** v1 extraction quality — Wallpaper Test: are the chips what you'd have written down yourself? Mobile multiplies the surface; confirm the extraction earns it first.

### WEEK — standalone weekly planning companion *(gated)*
**Vision:** separate lightweight weekly planning tool. TODAY = focus instrument, WEEK = planning surface. Predictive AI from observed behaviour — no manual energy ratings.
**Feeds on:** `today_daily_history` (focus sessions, completion times, habit patterns, peak hour — accumulating since v2.17.55).
**Revisit:** ~autumn 2026, with 3+ months of data.

---

## Parked / Someday

- **Idle companion artwork** — higher-resolution creatures, consistency across the 7. Revisit if they start mattering.
- **Nudge: silent-morning gate** (from #1) — on mornings with nothing insight-worthy, stay silent and let the poem be the morning. Gate can be stricter now that the poem owns the opening moment.
- **Nudge: deeper personality** (from #1) — weather/energy awareness beyond peak hour, richer habit-streak celebrations.
- **Surface `revived` counter** (from #8) — feed revive history to nudge/insights. No bulk revive, done items stay put.
- **Candidates from tier-2 mining (2026-07-19, Can to cut):** *(learned patterns promoted to #7 candidate moments)*
  - *Skip-reason on letgo* (Landscape.md, from Momentum) — one-tap reason picker on letgo (*not relevant / no energy / lost interest / replaced*). Low friction, high AI-context leverage. Landscape claimed "tracked in Backlog" — it wasn't; restored here.
  - *Energy-aware AI suggestions* (Landscape.md) — tighten the system prompt to tie suggestions to `peakHour` explicitly ("save the report for 2pm"). Prompt-only change, smallest item on this list. Same stale-claim restore.
  - *"How did today feel?" emoji* (Landscape.md, Momentum's 5-point) — once daily after triage, optional. Philosophy caveat: closest of the four to mood-tracking; needs a Psychology.md check before building.
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
| Morning nudge AI line | v2.17.73 | verdict 2026-07-18 | ✅ Kept + iterated — read every time; task references now verbatim (v2.32.3). Detail → `Changelog.md` v2.32.3 |
| Week-grid "best day" dot | v2.17.121 | 2026-06-30 | ✅ Kept — dot lands correctly, works well (verified 2026-07-15) |
| Poem splash coda + clean-slate echo | v2.26.0 | 2026-07-28 | Open — gift or gate? Does the echo add warmth or become invisible after the first week? |
| Daily brief (✦ → nudge + poem) | v2.29.0 | 2026-07-30 | Open — brief iterated to nudge+poem only (shape line removed v2.31.8). Does the poem add to the moment or feel like filler after the nudge? |
| Today block in About (nudge second home) | v2.33.0 | 2026-08-01 | Open — do you actually glance at it during the day, or does the morning read cover it? Removal is fine if it's never revisited |

### Not implementing
| Feature | Reason |
|---------|--------|
| Keyboard shortcuts (desktop) | No demonstrated need — revisit only if a real workflow gap shows up. |
| Widget / Home Screen | Needs WidgetKit / native Android — not reachable from a PWA. |
| Quick capture (without opening app) | No good cross-platform path. iOS has no PWA share target; Siri needs a native app. |
| Microsoft Notes integration | No clear user need. |
| Momentum integration | No public API; ICS is inbound-only. |
| Calendar integration (as agenda) | Not as an agenda/time-blocker — that's planner drift. The read-only day-shape signal version was a conditional candidate for Roadmap #1's "eyes slide" path — the #1 verdict (2026-07-18) did not trigger it (nudge is read every time). Revisit only if a future W-check finds the nudge going stale. Never a pinging events panel. |
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
