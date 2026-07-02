# Backlog

> **Forward-looking only: what to build next, what's parked, and decisions made.**
> Shipped work → `Changelog.md` (+ `archive/Changelog-archive.md`). Fixed bugs → `archive/Bugs-archive.md`. History is not duplicated here.

---

## ◎ North star (agreed Jun 2026)

**Own the first 30 seconds of the day.** The morning is becoming TODAY's signature beat — nudge, poem, briefing. Roadmap items 1 and 2 serve it directly; everything else supports or follows.

---

## ▸ Roadmap (prioritised, Jun 2026 review)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | **Morning nudge — impressions week → iterate** | Shipped v2.17.73, collecting | Costs nothing, decides the AI-presence direction. Can collects real-morning impressions; then tune prompt/voice. Detail ↓ |
| 2 | **Promote poem to a daily moment** | Not started | Highest delight-per-effort. Corpus built (68); today it's buried in About. Candidate: first open of the day, shown once, quietly. Original plan foresaw this promotion. Corpus growth continues in parallel — detail ↓ |
| 3 | **Module extraction** | In progress | **Done:** `util.js` (v2.17.122 leaf utils; v2.17.123 folded in COLOR consts + `_breathe`/`_KF_BLINK` — pure extraction complete), `idle.js` (v2.17.124 idle companion). **Next, risk-ascending:** `sound.js` (sound+haptic ~245), `celebration.js` (ember/confetti ~125), `trello.js` (Trello API ~174, Rule 27 patch path), `insights.js` (AI memory/observations ~384), then `sync.js` (Dropbox+live sync ~510 — Non-Delegation, extra scrutiny). **Ceiling:** classic-script extraction keeps globals shared — fine for these cohesive feature modules (~11K file), but the coupled core (`_onWake`, focus IIFE incl. `_pulseComplete`, render/actions/habits + `$`) needs ES modules + a build step (breaks Rule 24) → separate decision; leave inline. Per-step procedure + couplings in the plan. |
| 4 | **Push notifications — day boundaries only** | Not started | Evening triage + morning briefing, nothing else — marks day boundaries without chasing tasks. Needs server infra. Detail ↓ |
| 5 | **Empty/peak states audit** | Not started | First-open, everything-done, brand-new-user. "Everything done" is the app's promise fulfilled — currently just an empty list. Polish session for a quiet week. |
| 6 | **Todoist integration** | Not started | Highest integration priority after Trello. ~1.5× Trello effort — `research/Integrations.md`. |
| 7 | **About — contextual digest layer** | Not started | A periodic, in-app surface in About that changes based on day/week: Sunday recap, Monday intention, contextual hints (e.g. "you haven't focused this week"), daily moment beyond the poem. No server infra — purely local data. Distinct from #4 (push = server-sent, external); complementary to #1 (nudge = task-list one-liner) and #2 (poem = static daily). Detail ↓ |

**Awaiting device verification:** WAAPI wake behaviour — watch for BUG-004 recurrence after long sleep (v2.17.103). *(Recurring-surface verifications now live in the dated Wallpaper Test W3 table below, not here.)*

**Gated:** WEEK companion — decide ~autumn 2026 (needs 3+ months behavioural data + #1 learnings + #3 extraction done). Detail ↓

**Parked:** idle companion artwork · AI prompt trimming · Trello checklist write-back. Detail ↓

---

## Details

### 1 · AI Improvements / Morning Nudge
**Done so far (v2.13.0–2.17.73):** morning briefings, day-end review, stale-task awareness, behavioral insights, break_down/move_soon/reflect actions, 7-day suggestion cooldowns, Dropbox-synced suggestion history, deterministic chips for aging tasks, conversation memory, AI morning nudge (one-sentence observation over the rule-based line; insight-gated, cached per day, silent fallback).
**Next:** collect a week of real-morning impressions → tune the prompt (more specific? quieter? ever suggest an action chip?). Then: deeper personality (weather/energy awareness beyond peak hour, richer habit-streak celebrations).

### 2 · Daily Poem Corpus Growth
**Process:** curation rounds in chat — Claude proposes candidates per the brief below, Can cuts by number. Accepted poems land in `assets/poems.js`.
**The brief (canonical, Can's wording, 2026-07-02):**
> Short poem (2–14 lines, fits an About-panel card), human-written, public domain (author + translator).
> Voice: spare, concrete, present-tense; clear/light/affirming; about this day being lived — mornings, evenings, seasons, small noticed things. In: imagism, haiku, plain free verse, rhymed-lyrical if the feeling is real, if it resolves held/affirmed, mindful resolution of anxiety. Out: quaint, ornate, cutesy, preachy-uplifting, bleak-unresolved, abstraction without an image. Prefer seasons the corpus is thin on (currently summer), authors/countries/centuries not yet represented.
> Before proposing: confirm the text verbatim against a primary source (Wikisource / Gutenberg / archive.org scan — never from model memory) and confirm PD status (author + translator death dates / publication year). Never propose an unverified text.
**Taste signal (12 rounds):** spare modern free verse + clear/light/affirming in; rhymed-quaint, ornate, cutesy, bleak out. Round 11 nuance: rhymed-lyrical with real feeling (Innisfree, Housman) beat imagist minis (Lowell/Pound/Crapsey cut) — "rhymed" alone isn't the disqualifier, quaintness is. Round 12 nuance: melancholy-but-held is IN (Rilke 'Autumn'), vast-serene is IN (Bashō Milky Way); calm-pastoral/evening-rest pieces (Goethe, Sappho, summer moor) cut — gravity beats gentleness.
**Seasons:** W9 / Sp12 / Su8 / Au11 / year-round 43 as of round 12 (corpus 82, target ~90; summer thinnest).
**PD rules (updated 2026-07-02):** worldwide-only — author AND translator dead 70+ years (currently: d. pre-1956; rolls forward each year). The US-PD-only category (pre-1931 pub, author d. post-1956, approved v2.17.82) is RETIRED for new additions — no more US-rule-based picks. 11 existing corpus poems were added under it (Frost ×3, WCW, Sandburg, H.D., Waley trans. ×5) — grandfathered pending Can's decision (keep or purge). No PD modern-English Rumi exists (declined to bundle copyrighted Barks).
**Future PD unlocks (Jan 1):** cummings 2033, Frost/WCW worldwide 2034, Eliot 2036.
**Leads:** CC-licensed living poets (verify each license), more Chamberlain haiku — scan FOUND: archive.org `basho-and-the-japanses-poetical-epigram`, ~100 numbered haiku, one added round 12, worth a dedicated pass; Teasdale 'February Twilight' (*Dark of the Moon* 1926 — needs verified source). Closed: Bridges 'London Snow' (37 lines — too long), Yeats 'Innisfree' (added round 11), Goethe/Sappho/Wharton explored round 12 (cut on taste, sources verified if ever revisited).

### 4 · Push Notifications
**Platform:** iOS 16.4+ (installed PWA only) + Android. Web Push API + VAPID keys.
**Stack:** `push` listener in `sw.js`, VAPID keys in Netlify env, two new Netlify functions (store subscription + scheduled send), permission UI in Connections panel.
**Key constraint:** iOS has no background sync — notifications must be server-sent via Netlify Scheduled Functions. The app cannot self-schedule.
**Scope decision (Jun 2026):** day boundaries only — 8pm triage reminder + morning briefing. No habit nudges, no task chasing.

### 7 · About — Contextual Digest Layer
**Concept:** A section in the About panel that surfaces periodic, context-aware content based on the current day and week. No push, no server — pure local data.
**Candidate moments:**
- **Sunday** — weekly recap: tasks done, focus time, habit streak, best day
- **Monday morning** — intention prompt: what's carried over, what's the week's shape
- **Daily hint** — one contextual observation (e.g. "you haven't used focus mode in 5 days", "3 tasks are ageing") — insight-gated, not repetitive
- **Milestone** — surface quietly when streak/focus milestones happen (currently only shown at check-time)
**Relationship to other items:**
- **#1 (nudge):** nudge is task-list, one-liner, morning only. Digest is About panel, richer, time-of-week aware.
- **#2 (poem):** poem is static per-day. Digest is dynamic per-context. Could live in the same About section, adjacent.
- **#4 (push):** push notifications would eventually carry the *same content* externally. Build the in-app version first — validates the content before adding server complexity.
**Open questions:** shown always vs shown once per period (like poem cooldown)? Can it replace the poem slot on Sundays, or always alongside?

### WEEK — standalone weekly planning companion *(gated)*
**Vision:** a separate lightweight weekly planning tool. TODAY = focus instrument, WEEK = planning surface.
**Differentiator:** predictive AI from observed behaviour — no manual energy ratings. WEEK learns what this user does Monday mornings, when they focus vs coast, what they defer.
**Feeds on TODAY data:** focus sessions, completion times, habit patterns, peak hour (`today_daily_history` accumulating since v2.17.55).
**Lesson (v2.17.59→66):** rule-based weekday-rhythm phrases became wallpaper and were removed; the aggregation logic is reusable but output must be AI-generated.
**Revisit:** ~autumn 2026, with 3+ months of data.

---

## Parked / Someday

- **Idle companion artwork** — higher-resolution creatures, consistency across the 7. Or reduce to one perfect creature. Revisit if they start mattering.
- **AI system-prompt trimming** — cost is <$0.01/day; only if token cost ever matters. Safe cuts: action-type descriptions, energy-awareness sub-bullets (~110 tokens). Never cut: task/habit lists with IDs, JSON rules, personality block.
- **Trello checklist write-back** — bidirectional checklist editing. Today read-only badge (v2.17.58). Build only if editing is actually wanted.

---

## Decisions & boundaries *(reference — rarely changes)*

### Watching
| Decision | Current | Watch for |
|----------|---------|-----------|
| Modularization | Single file (~12K lines) + `assets/poems.js` | Roadmap #3 (module extraction) is the plan; smoke test already guards the boot path. Revisit harder if growth continues. |
| Sync conflict rate | Merge-anomaly counter live since v2.17.101 (Connections → Dropbox) | If the count climbs above zero in normal use, revisit conflict handling before WEEK consumes the data. Zero for months = the "unhandled 1%" was theoretical. |

### Wallpaper Test — W3 follow-ups (day-14 behavioral check)
> Every recurring surface that passes W1–W2 at ship time lands here with a due date (ship + 14d).
> On the due date: is it still delivering, or has the user stopped reading/tapping/opening it?
> Resolve each row — **kept** (delivering), **iterated**, or **removed** (a valid outcome).

| Surface | Shipped | W3 due | Status |
|---------|---------|--------|--------|
| Input bar discoverability (placeholder + ✦ glow + tip) | v2.17.99 | overdue — review now | Awaiting device impressions |
| Merge-anomaly count line (Connections → Dropbox) | v2.17.101–102 | overdue — review now | Awaiting device impressions |
| Morning nudge AI line | v2.17.73 | collecting (Roadmap #1) | Open — a week of real-morning impressions, then tune |
| Week-grid "best day" dot (composite tasks+focus+habits) | v2.17.121 | 2026-06-30 | Collecting — does the dot land on a day that *feels* like your best, or does the composite pick surprise you? Tune weights (0.4/0.35/0.25) or revert to a single dimension if it reads wrong. |

### Not implementing
| Feature | Reason |
|---------|--------|
| Keyboard shortcuts (desktop) | Dropped from backlog (Can, Jun 2026). No demonstrated need — revisit only if a real workflow gap shows up. |
| Widget / Home Screen | Needs WidgetKit (iOS) or native Android — not reachable from a PWA. Revisit only with a native wrapper. |
| Quick capture (without opening app) | No good cross-platform path. iOS has no PWA share target; Siri needs a native app. |
| Microsoft Notes integration | No clear user need. |
| Momentum integration | No public API; ICS is inbound-only to Momentum. Workflow pairing (plan in Momentum, execute in TODAY) is the answer. |
| Calendar integration (Google/iCal) | Investigated Jul 2026. **No as an integration / agenda / time-blocker** — that's the "TODAY Planner" drift the north star rejects. The *reminders + prioritise* framing collides hardest: "remind me of calls" is per-event chasing (#4 is deliberately fenced to day-boundaries only), and "prioritise" is ranking (app has no priorities). The one philosophy-safe use is **passive, read-only timed context** — the Trello-due-date precedent (TODAY *displays* external times, never *manages* them) proves times-on-screen aren't the violation; chasing and ranking are. So the only version worth revisiting is a **private "day-shape" signal feeding the morning nudge (#1/#7)** ("busy afternoon — pick one thing"), never a pinging events panel — and only after the morning surface is validated. Meetings aren't tasks (no check/focus); the phone's calendar already out-reminds us, so a notifier version cedes our calm moat. Lightest MVP if ever: private ICS feed → one AI-summarised line via a CORS proxy, not Google OAuth. |

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

*History (shipped features, fixed bugs) lives in `Changelog.md`, `archive/Changelog-archive.md`, and `archive/Bugs-archive.md` — intentionally not mirrored here. Last reorganised: v2.17.102 (Jun 2026 roadmap review).*
