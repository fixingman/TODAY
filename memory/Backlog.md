# Backlog

> **Forward-looking only: what to build next, what's parked, and decisions made.**
> Shipped work → `Changelog.md` (+ `archive/Changelog-archive.md`). Fixed bugs → `archive/Bugs-archive.md`. History is not duplicated here.

---

## Claude session conventions

| Context | Use |
|---------|-----|
| Searching Coda | `/browse` skill — not raw WebFetch or grep |
| Poem curation search | WebSearch to identify candidate by title/poet → single targeted WebFetch on that poem's page. No bulk-fetching anthologies. Do inline in main conversation, not via agents. Better sources than Gutenberg/Wikisource/archive.org: `poetryfoundation.org` (searchable by country), `lyrikline.org` (world poetry in translation), `banipal.co.uk` (Arabic lit in translation), `asymptotejournal.com` (world lit, often CC-licensed), `poemhunter.com` (searchable by poet nationality). |
| Poem display in chat | Always use real line breaks — one line per line, in a blockquote. Never use `/` as an inline line separator. |

---

## ◎ North star (agreed Jun 2026)

**Own the first 30 seconds of the day.** The morning is TODAY's signature beat — nudge (verdict 2026-07-18: kept, read every time), poem (#2), briefing (#7); everything else supports or follows. How intelligence and personalization serve this → `design/Personalization.md`.

---

## ▸ Roadmap (prioritised, Jun 2026 review)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2 | **Poem corpus — iterate** | In progress | Rotation verdict: no repetition, shuffle fine. Problem: 101 not enough; some poems sound alike. New direction: expand geography, untapped poets, contemporary CC-licensed work. Detail ↓ |
| 7 | **Season moments — solar term label** | Shipped v2.71.0 | Solar term label above evocative line; season owns full Noticed block. Detail ↓ |
| 8 | **Noticed block — expand** | Not started | No problem now, but growth area. What else could TODAY notice that earns a line? Detail ↓ |

**Awaiting device verification:** canonical list lives in `Rules.md` → Watch for.

**Gated:** WEEK companion — decide ~autumn 2026 (needs 3+ months data + #3 done; nudge verdict 2026-07-18 landed). Detail ↓

**Parked:** idle companion artwork · AI prompt trimming · Trello checklist write-back. Detail ↓

---

## Details

### 2 · Poem Corpus — Iterate
**Process:** curation rounds in chat — Claude proposes verified candidates, Can cuts by number. Accepted poems land in `assets/poems.js`.

**The brief:**
> 2–11 lines. Human-written. Two licensing paths: (A) worldwide public domain — author AND translator both d. pre-1956; (B) CC0 / explicit public-domain dedication by the author — verify the specific license on the source page, never assume. Voice: spare, concrete, present-tense, clear/light/affirming — mornings, evenings, seasons, small noticed things. In: imagism, haiku, plain free verse, rhymed-lyrical if the feeling is real and resolves held/affirmed. Out: quaint, ornate, cutesy, preachy, bleak-unresolved, abstraction without an image.
> **App-moment test:** would this still feel right beside an undone task list? If it depends on being read in isolation, cut it.
> **Corpus-fit test:** does it sit comfortably next to Bashō and Marcus Aurelius in tone? The existing corpus is the style reference, not just a checklist.
> **PD check:** for path A — confirm death dates for author and translator. For path B — quote the exact license statement from the source page.
> **Search process:** WebSearch first to identify a specific poem by title/poet (fast, cheap) — then one targeted WebFetch on that poem's URL to pull verbatim text. Never bulk-fetch entire anthologies or book scans. Prefer `poetryfoundation.org`, `lyrikline.org`, `banipal.co.uk`, `asymptotejournal.com`, `poemhunter.com` over archive.org/Gutenberg for discovery. For PD verification still confirm death dates via Wikisource or archive.org, but on the specific page only. Region is a tiebreaker only — when two candidates tie on quality, prefer the one from a country not yet represented.

**Seasons:** W14 / Sp15 / Su10 / Au11 / year-round 60 — corpus 109 (2026-08-24).

**Rotation verdict (2026-08-22):** No repetition observed — shuffle algorithm is not the lever.

**New diagnosis:** 101 not enough; some poems sound similar to each other. The problem is sameness of voice and origin, not count. We haven't found original pieces — different geography, different sensibilities.

**New direction:**
- **Expand geography** — Africa, Latin America, the Middle East, Southeast Asia are underrepresented. Prioritise translators with confirmed PD status over themed searches.
- **Untapped poets** — dig into regions and anthologies not yet touched. Country tiebreaker becomes a country *requirement* for the next round.
- **Contemporary CC-licensed work** — poets who have explicitly released poems under CC0 or public domain dedication. Sources: Wikisource contemporary contributions, poets who publish under open licenses on their own sites. Vet each case individually; do not assume a blog post is freely usable.
- **The bar stays:** brief quality criteria unchanged (spare, concrete, present-tense, app-moment test). More poems only if they pass.

Poet notes: Teasdale (*Stars To-night*) rich for future rounds. Crapsey fully cut.

**PD notes:** US-PD-only closed (v2.35.3) — worldwide PD is the bar. Five US-PD poems kept permanently (Frost ×3, Yang-ti, Po Chü-i 'After Lunch'). Future unlocks: Milne 2027 (taste caveat: canonical "cutesy"), cummings 2033, Frost/WCW worldwide 2034, Eliot 2036. China most-represented — country tiebreaker is a lean, not a wall.

**Curation rule: a cut is final.** Candidates not picked are dead — never re-proposed. (Not-picked so they aren't re-found: Ou-yang Hsiu 'Bell Hill', Yeats 'Cloths of Heaven', Landor 'Dying Speech', Moritake butterfly, Hokushi 'burnt out', Dickinson 'The Snow', Nervo 'Revenge', Nervo 'What matter hours' [untitled], Storni 'The Piety of the Cypress', Contardo 'Home of Peace and Purity'.)

**Active leads:**
- Chamberlain 1902 (archive.org/details/basho-and-the-japanses-poetical-epigram) — productive; identifier confirmed
- Cranmer-Byng *A Feast of Lanterns* (archive.org `in.ernet.dli.2015.282424`) — Yuan Mei, Liu Tzu-hui unproposed, available when China tiebreaker lifts
- Carlyle, *Specimens of Arabian Poetry* (Cambridge, 1796; Carlyle d.1804) — ~50 short Arabic poems (8–12 lines each), many unproposed. Multiple 8-liners remain: 'On Temper' (Nabegat), 'Barmecides', 'To the Khaliph' (Ibrahim Ben Adham), 'To a Female Cupbearer', 'Epigram on Taher'. Poet death dates all pre-820 CE. Reprinted in Clouston *Arabian Poetry for English Readers* (Glasgow, 1881). Worldwide PD confirmed.
- Korea Review (1901–1906) — checked vols 1–6; 'The Seasons' (vol 6 p.1, trans. Mikson) was the only poem under 10 lines. Rich in articles but sparse in verse.
- Prose at Marcus Aurelius length (2–5 sentences) works; Muir *First Summer* (d.1914) worth a targeted pass; Garnett-trans. Chekhov nature prose not yet searched
- Closed: London Snow (too long), Turkish/Sufi (no worldwide-PD English), Poe (anguished), Egyptian/African (PD-translation bottleneck; /Xam poem in Bleek & Lloyd 1911 p.231–233 confirmed but sacred-texts.com blocks all fetches — try HathiTrust next)
- Modern CC0 (1970+): poetrysoup.com 'public domain' = topic not license (all poems © authors); openpoet.org = classic pre-1923 only; no contemporary CC0 poems found after exhaustive search. The path exists in principle but no viable candidates surfaced.

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

**Granola integration path (researched 2026-08-03 — Can is on free plan, happy with capture).** Granola auto-detects meetings at OS level (PWA can't), outputs structured notes + action items. TODAY's role: task extraction from Granola's output. `get_meetings` (summaries + action items) is available free — enough without the transcript. **Integration MVP:** Granola MCP key in Connections → Netlify function calls `list_meetings` + `get_meetings` → AI extraction → task chips. Manual trigger: user finishes a meeting, opens TODAY, taps import. **Priority within meeting capture:** build Granola integration before investing further in native capture. (Todoist rejected 2026-08-21 — no demonstrated need.)

**Gate (unchanged):** extraction quality — are the chips what you'd have written down yourself?

### WEEK — standalone weekly planning companion *(gated)*
**Vision:** separate lightweight weekly planning tool. TODAY = focus instrument, WEEK = planning surface. Predictive AI from observed behaviour — no manual energy ratings.
**Feeds on:** `today_daily_history` (focus sessions, completion times, habit patterns, peak hour — accumulating since v2.17.55).
**Revisit:** ~autumn 2026, with 3+ months of data.

---

## Parked / Someday

| Item | From | What it is | Unpark when / gate |
|------|------|------------|--------------------|
| **Sparse-context AI gate** | #1 verdict + first-run insight 2026-07-20 | When the AI has too little context for a real observation, stay silent — poem leads. Applies especially to first-run users who connect a key early (extends v2.34.0's quiet-first-open principle). | Watch-and-decide with W3 verdicts — a build item only if sparse output proves weak |
| **Idle companion artwork** | — | Higher-resolution creatures, consistency across the 7 | If they start mattering |
| **AI system-prompt trimming** | — | Cost <$0.01/day. Never cut: task/habit lists with IDs, JSON rules, personality block | Only if token cost ever matters |
| **Trello checklist write-back** | — | Write checklist state back to Trello | Only if editing is actually wanted |

---

## Decisions & boundaries *(reference — rarely changes)*

### Season moments · Iteration spec
**Verdict 2026-08-21:** iterate. The evocative line is right — don't touch it. The problem is the seasonal turning-point meaning didn't land from the line alone. Need a second layer that signals "something is changing in the season" without replacing the poem or becoming a calendar readout.

**Constraint:** whatever is added must feel as light as the line itself. A label that explains too much kills the moment.

**Open question:** what form should the second layer take? Options worth exploring:
- A short framing word or phrase above the line — e.g. "end of summer" in a muted style, smaller than the line
- The solar term name — e.g. "処暑 · End of Heat" (Japanese 24-term system these lines already follow)
- A visual signal only — a subtle color shift, a different background tone, something ambient
- Nothing textual — just surface it differently (full-bleed, centred, no task list context)

**Decided 2026-08-21:**
- Solar term label above the line: `処暑 · End of Heat` (muted, `week-label` style) + evocative line below it
- Season moments get the full Noticed block when they appear — other Noticed lines are suppressed that day
- Store as `{ term, line }` object instead of plain string; give season entries their own render path in the Noticed block

### 8 · Noticed block — expand
No problem with the current lines. Growth question: what else could TODAY notice that earns a line? Open for ideas — don't force it. Candidates must pass the Wallpaper Test before shipping: would this still feel right after 20 appearances?

---

### Watching
| Decision | Current | Watch for |
|----------|---------|-----------|
| Merge-anomaly observability | Dropbox emits a console-only `[merge-anomaly]` breadcrumb; there is no persisted counter or Connections metric | Revisit only if anomalies appear during debugging or WEEK needs a measurable conflict rate. Do not describe this as live product telemetry. |
| Dated AI-cache sync | Four fields are hand-plumbed: `day_nudge_ai`, `week_reflection`, `monday_intention`, and `week_theme_ai` | The rule-of-three threshold has been exceeded. Create one declarative cache registry before adding a fifth dated AI field. |
| Morning nudge usefulness | v2.43.5 rebalanced list vs memory context; generation runs after sync and the resulting line syncs cross-device | Ask for the About panel's Today line verbatim. Does it name a specific current task without biography drift, reflect the synced list, and stay quiet when nothing stands out? If not, cut `Past suggestions` + `Recent conversations` before more prompt tuning. |
| AI/data outcome loop | Inline suggestions record offered/applied/dismissed, but most AI surfaces stop at generation | Before collecting new signals, prototype provenance + one evaluable recommendation loop on an existing surface. Do not add another recurring panel. See `design/Personalization.md` → “Where the existing symbiosis can compound next.” |

### Wallpaper Test — W3 follow-ups (day-14 behavioral check)
> Resolve each row — **kept** (delivering), **iterated**, or **removed**.
> **Pre-registration (2026-07-20):** in the week before each verdict, note a one-word observation each time the surface is used or skipped.

| Surface | Shipped | W3 due | Status |
|---------|---------|--------|--------|
| Season moments (24/year) | v2.60.0 | — | **Iterate (2026-08-21).** The line itself is right — don't change it. But the seasonal turning-point meaning didn't land from the line alone. Need a second layer that makes the transition explicit without replacing the evocative line. Detail ↓ |
| Season moments — solar term label | v2.71.0 | 2026-09-05 | Open — does the `処暑 · End of Heat` label above the line make the seasonal turning-point land? Does it feel like context or noise after a few appearances? |
| Focus companion question | v2.65.0 | 2026-08-31 | Improved: taxonomy-based system prompt, drag-word + letgo-reason signals, worked-today / last-worked-N-days, word cap 18→22. Re-observe after a week of sessions — does the question now feel like a moment of clarity rather than a check-in? |
| About contextual CTAs | v2.64.10 | 2026-08-25 | Open — Focus Copy, `see more`, and poem `share` now share the bordered CTA treatment. Does the border make the actions clearer without pulling attention from the week/poem content? |
| Connections privacy reassurance | v2.64.11 | 2026-08-26 | Open — one appearance per device when fully disconnected. Does it feel like timely reassurance, or like policy copy interrupting setup? |
| Sunday earned insight | v2.71.12 | 2026-09-06 | Open — when it appears, does it reveal a real lever or pattern rather than paraphrasing the grid? Does the personality feel earned? Track abstentions as healthy, not missing content. |
| Monday intention (memory-enriched) | v2.65.1 | 2026-08-24 | Verdict (2026-08-17): synthesis is nice, not unhappy with it. Data source fixed: now includes Soon + Trello cards. Re-observe next Monday — does the broader view produce a relevant orientation line? |
| Memory panel quality gate | v2.47.0 | 2026-09-01 | Open — are AI-generated hypotheses earning confirmation or getting dismissed? High dismiss rate = prompting or data quality problem. |
| Post-triage reflections | v2.65.7 | 2026-08-31 | Open — does the prompt create a real pause to name the day, or does it become rote wallpaper / a source of quiet guilt? Watch for: selection bias (only tapping on "good" days), avoidance on hard days, feeling rote after the first week. See `research/Psychology.md` for the evidence boundary. |

### Not implementing

| Decision | Rationale |
|---|---|
| Full-contrast completed tasks | Completed rows deliberately recede to 25% opacity to reduce finished-work noise. WCAG 1.4.3/1.4.11 are accepted exceptions for that state; semantics remain intact. |
| Visible pointer reorder controls | Pointer reorder remains drag-only. Option+Arrow is available for keyboards, but WCAG 2.2 criterion 2.5.7 remains an accepted exception; see `Accessibility-audit.md`. |
| Weather-aware nudges or suggestions | **Rejected 2026-08-17.** Weather and geolocation add an external-data dependency and a new Connections privacy boundary without a demonstrated need. Do not re-propose. |
| Truncating task text | **Rejected 2026-08-01.** Task text is primary content — hiding its tail trades legibility for tidiness. Wrapping is correct; do not re-propose clamping as a "tidiness" fix. |
| Keyboard shortcuts (desktop) | No demonstrated need — revisit only if a real workflow gap shows up. |
| Widget / Home Screen | Needs WidgetKit / native Android — not reachable from a PWA. |
| Quick capture (without opening app) | No good cross-platform path. iOS has no PWA share target; Siri needs a native app. |
| Microsoft Notes integration | No clear user need. |
| Momentum integration | No public API; ICS is inbound-only. |
| Calendar integration (as agenda) | Rejected as a *displayed* surface. Calendar-triggered capture in #9 reads it as INPUT only — never rendered back. Not as an agenda/time-blocker; that's planner drift. |
| Slack / Gmail / stream extraction | Wrong trust model + needs server-side token storage (breaks client-only posture) + renders other people's demands into the calm list. |
| Todoist integration | **Rejected 2026-08-21.** Trello machinery exists — that's not a reason. No demonstrated need for a second task-integration lane. Do not re-propose. |
| Push notifications | **Rejected 2026-08-21.** No demonstrated need — never felt the absence. Needs server infra with no validated payoff. Do not re-propose. |
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
