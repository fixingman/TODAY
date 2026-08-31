# Backlog

> **Forward-looking only: what to build next, what's parked, and decisions made.**
> Shipped work → `Changelog.md` (+ `archive/Changelog-archive.md`). Fixed bugs → `archive/Bugs-archive.md`. History is not duplicated here.

---

## Claude session conventions

| Context | Use |
|---------|-----|
| Searching Coda | `/browse` skill — not raw WebFetch or grep |
| Poem curation search | Broaden discovery before narrowing candidates: national libraries, university digital collections, regional/bilingual anthologies, oral-literature archives, historical journals, and author/translator archives. Use generic poetry sites only as leads or cross-checks; use Gutenberg, Wikisource, and Internet Archive mainly for exact text and public-domain verification. WebSearch to identify a specific poem or collection → targeted fetch of the relevant page; no indiscriminate bulk-fetching. Work inline in the main conversation, not via agents. |
| Poem display in chat | Always use real line breaks — one line per line, in a blockquote. Never use `/` as an inline line separator. |

---

## ◎ North star (updated Aug 2026)

**TODAY is a longitudinal companion.** It accumulates real understanding of you — not your productivity stats, but your relationship with your own commitments. Over time it helps you see yourself more clearly, so you can make different choices.

The experience is calm. Opening TODAY in the morning shows an imprint of your life — choices you've made, not obligations staring back. No pressure, no shame, no guilt. A companion that speaks when it matters, holds space when it doesn't, and catches the blind corners you can't see yourself.

**The morning is TODAY's signature beat** — nudge (verdict 2026-07-18: kept, read every time), poem (#2), briefing (#7); everything else supports or follows. How intelligence and personalization serve this → `design/Personalization.md`.

---

## ▸ Roadmap

| # | Item | Status | Notes |
|---|------|--------|-------|
| 12a | **Companion — relational memory foundation** | Shipped v2.79.1 | `appMemory` gets relational slots: returning-task registry, obligation-language tally with 90-day named history, task-age buckets. Plus `spokenLines` (what TODAY has said), which becomes 12c's novelty-gate input. Prerequisite for the rest of the arc. Detail ↓ |
| 12b | **Companion — voice** | Shipped v2.78.1 — **superseded by 12c** | Built the inverse of the AI/data contract: raw signals dumped into the nudge prompt, model left to judge. Not fixable in isolation; 12c is the fix. Detail ↓ |
| 12c | **Companion — observation pool** | Not started — **next** | One ranked candidate pool feeding every surface: code selects through 4 gates, model only phrases it. Extends `week-reflection-policy.js` rather than starting fresh. Fixes 12b, replaces voice memory's post-hoc dedup, retires the age-display idea. Requires 12a. Detail ↓ |
| 11 | **Task agent — enrichment at add-time** | Stages 1 & 2 shipped; Stage 3 next | External context enrichment (Gmail, web search, soon: contacts, calendar, Trello). Distinct from companion arc — enriches the task, not understanding of you. Detail ↓ |
| 10 | **Meeting mode & calendar capture** | In progress / gated | Granola integration MVP before native capture. Calendar = input only, never output. Detail ↓ |
| 9 | **Google Drive sync** | Parked — spec ready | Second sync backend alongside Dropbox; user picks one. Full spec ↓ |
| 12d | **Companion — memory surface** | Not started | "What TODAY knows about you" in the Memory panel (`#memoryPanel`, not Connections — see `design/Personalization.md` hard constraint). Inspectable, clearable. Requires 12c to have ranked observations worth showing. Detail ↓ |
| — | **WEEK companion** | Gated | Gate is now: *12c is working and feels like a companion, not a feature.* Data accumulation is necessary but not sufficient. Detail ↓ |
| 2 | **Poem corpus — iterate** | In progress | Expand geography, voice, and forms of self-recognition. Corpus 119 reviewed poems (2026-08-31). Detail ↓ |
| 7 | **Season moments — solar term label** | Shipped v2.71.0 | Solar term label above evocative line; season owns full Noticed block. Wallpaper test → table below. |

---

## Item details

### 2 · Poem Corpus — Iterate

**The brief:**
> 2–6 displayed lines for every candidate from the next search round onward. Previously reviewed longer selections remain grandfathered. Human-written. Two licensing paths: (A) worldwide public domain — author AND translator both d. pre-1956; (B) CC0 / explicit public-domain dedication by the author — verify the specific license on the source page, never assume. Voice: spare, concrete, present-tense, clear/light/affirming — mornings, evenings, seasons, small noticed things. In: imagism, haiku, plain free verse, rhymed-lyrical if the feeling is real and resolves held/affirmed. Out: quaint, ornate, cutesy, preachy, bleak-unresolved, abstraction without an image.
> **App-moment test:** would this still feel right beside an undone task list? If it depends on being read in isolation, cut it.
> **Corpus-fit test:** does it sit comfortably next to Bashō and Marcus Aurelius in tone? The existing corpus is the style reference, not just a checklist.
> **PD check:** for path A — confirm death dates for author and translator. For path B — quote the exact license statement from the source page.

> **Search process:** Start with source diversity, not a familiar-poet query loop. Search national libraries, university collections, regional or bilingual historical anthologies, oral-literature archives, historical journals, and specialist author/translator archives. Generic poetry sites can identify leads but should not define the candidate pool; Gutenberg, Wikisource, Internet Archive, and original scans remain useful for exact wording and worldwide-PD verification. Once a specific poem or collection is identified, fetch only the relevant page or passage. Each round should deliberately vary poets, translators, poetic structures, and kinds of thought; do not return several familiar voices merely because they are easy to source. Region is a tiebreaker—not a quality substitute or a flags-on-a-map exercise.

**Seasons:** W14 / Sp16 / Su12 / Au10 / year-round 67 — corpus 119 reviewed poems (2026-08-31).

**Rotation verdict (2026-08-22):** No repetition observed — shuffle algorithm is not the lever.

**New direction:** continue geographic balance, but candidates require Can's review before entering `assets/poems.js`. Africa, Latin America, the Middle East, and Southeast Asia remain thin relative to East Asia and Europe. Region remains a tiebreaker, never a reason to lower the bar. Untapped poets and contemporary CC-licensed work remain open paths.

**Next search theme — an imprint of commitments:** the updated North Star adds a thematic axis alongside geography. Look for short poems about choosing, keeping, loosening, returning, and recognizing one's relationship to commitments. They should create self-recognition without pressure, shame, or a productivity moral: an imprint, not an instruction. Reject duty sermons, generic perseverance slogans, and poems that tell the reader what kind of person to be.

**Curation learning (2026-08-31):** the Syria/Persia/Armenia round was the strongest of the recent rounds because broadening the discovery destinations broke the repeated-poet/repeated-tone pattern. Its three approved selections offered different intellectual shapes—quiet usefulness over spectacle, a question about genuine value, and hope through weather and endurance. Future rounds should optimize for diversity of thought and voice as well as geography, and treat repeated poets, translators, images, or emotional conclusions as a warning that the search pool is too narrow.

Poet notes: Teasdale (*Stars To-night*) rich for future rounds. Crapsey fully cut.

**PD notes:** US-PD-only closed (v2.35.3) — worldwide PD is the bar. Five US-PD poems kept permanently (Frost ×3, Yang-ti, Po Chü-i 'After Lunch'). Future unlocks: Milne 2027 (taste caveat: canonical "cutesy"), cummings 2033, Frost/WCW worldwide 2034, Eliot 2036. China most-represented — country tiebreaker is a lean, not a wall.

**Curation rule: a cut is final.** Candidates not picked are dead — never re-proposed. (Not-picked so they aren't re-found: Ou-yang Hsiu 'Bell Hill', Yeats 'Cloths of Heaven', Landor 'Dying Speech', Moritake butterfly, Hokushi 'burnt out', Dickinson 'The Snow', Nervo 'Revenge', Nervo 'What matter hours' [untitled], Storni 'The Piety of the Cypress', Contardo 'Home of Peace and Purity', Lugones 'The Palm Tree' [32 lines, grave/loss], Lugones 'The Gift of Day' [12 lines], José Rizal 'To the Flowers of Heidelberg' [first stanza, trans. Charles Derbyshire], Manuel José Othón 'The Bell' [opening stanza, trans. Alice Stone Blackwell], the traditional Malay turi-tree pantun [trans. John Crawfurd], the traditional Nyanja night-jar song [recorded by R. S. Rattray], Egbert Martin 'A Shaded Spot' [excerpt], Sarojini Naidu 'Spring' [opening stanza], Gladys May Casely-Hayford 'Rejoice' [excerpt], and Narciso Tondreau 'Yesterday and Today' [excerpt]; all reviewed and skipped by 2026-08-31.)

**Active leads:**
- Chamberlain 1902 (archive.org/details/basho-and-the-japanses-poetical-epigram) — productive; identifier confirmed
- Cranmer-Byng *A Feast of Lanterns* (archive.org `in.ernet.dli.2015.282424`) — Yuan Mei, Liu Tzu-hui unproposed, available when China tiebreaker lifts
- Carlyle, *Specimens of Arabian Poetry* (Cambridge, 1796; Carlyle d.1804) — worldwide PD, but the first targeted pass ('On Temper', 'Barmecides', 'To the Khaliph', 'On a Thunder-Storm', 'To a Dove', 'On Moderation in Our Pleasures') was ornate, preachy, bleak, or over the line limit. Do not re-propose those; other titles remain open.
- Tirukkural (Thiruvalluvar, trans. G. U. Pope, 1886) — Wikisource has Ch. 131–133 verbatim; Ch. 110, 121–130 are redlinks. Book III love chapters have strong candidates (K1095, K1227). Pope d. 1908, worldwide PD.
- Prose at Marcus Aurelius length (2–5 sentences): Muir *First Summer* (d.1914) worth a targeted pass; Garnett-trans. Chekhov nature prose not yet searched
- Africa: traditional !kun 'Prayer to the Young Moon' (recited by !nanni, recorded by L.C. Lloyd in 1880) approved by Can and shipped as its contiguous closing excerpt in v2.77.5. Digital Bleek & Lloyd metadata resolves the attribution separately from Dia!kwain's nearby 1875 Moon-and-Hare narrative.
- Middle East / Armenia: al-Ma'arri's quiet-rain couplet (trans. Ameen Rihani), Abu-Yshac's complete 'The Roses' (trans. E. Powys Mathers), and the first two stanzas of Raphael Patkanian's 'The Sure Hope' (trans. Alice Stone Blackwell) approved by Can and prepared for v2.77.27.
- Jamaica / Spain: the closing stanza of Claude McKay's 'Joy in the Woods' and Antonio Machado's 'Counsels' (trans. Thomas Walsh) approved by Can and prepared for v2.77.27. The six-line ceiling begins with the next search round; these already-reviewed longer selections are grandfathered.
- Southeast Asia: José Rizal's 'To the Flowers of Heidelberg' first stanza (trans. Charles Derbyshire) was reviewed and skipped; do not re-propose it. Continue searching beyond the Philippines.
- Closed: London Snow (too long), Turkish/Sufi (no worldwide-PD English), Poe (anguished), 'The Broken String' (bleak/unresolved)
- Modern CC0: no viable candidates found after exhaustive search. Path exists in principle.

---

### 7 · Season Moments — ✅ Shipped v2.71.0

Solar term label (`処暑 · End of Heat`) above the evocative line. Season moments own the full Noticed block when they appear. Stored as `{ term, line }` object; own render path.

**Wallpaper test:** tracked in table below. Due 2026-09-05.

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

**Shipped:** Gmail enrichment (v2.75.1+) — AI-classified comm tasks get a ↩ indicator; focus session surfaces thread snippet + "Draft reply" button. AI classification (v2.75.17) replaced regex. Race fixes (v2.75.21). Personalized AI surfaces shipped incrementally: focus companion sees other tasks (v2.74.3), week theme sees aging tasks (v2.74.2), nudge already task-specific.

**Stage 1 shipped (v2.76.0+):** Tool-use agent fires on task add for actionable tasks. Netlify function calls `claude-sonnet-5` with `web_search_20250305` server tool; handles multi-turn `pause_turn`/`tool_use` continuation; returns validated card `{ icon, headline, body, cta }`. ↗ indicator in task row; card renders in `#focusAgentBlock` on focus open. Timeout set to 26s (v2.76.4), beta header dropped, focus block clip fixed (v2.76.2).

**Next: Stage 3 — expand tool registry**

`search_contacts`, `read_calendar`, `search_trello`. One task can trigger multiple tools; Claude decides the sequence.

**Out of scope:** autonomous execution without review · importing others' email as tasks · always-on background agent (trigger-on-add only)

**Framing note (Aug 2026):** Stage 3 enriches tasks with *external* context. The companion arc (Items 12a–12d) builds *internal* understanding of you. Both are valid; they are different directions. Don't conflate them — Stage 3 makes a task richer, the companion arc makes *you* more visible to yourself.

---

### 12 · Companion Arc

The four stages are sequenced — each builds on the previous. The arc as a whole is what delivers the north star; no individual stage alone is the companion.

---

#### 12a · Relational Memory Foundation — **shipped** *(prerequisite for all)*

`appMemory` stored behavioral snapshots (peakHour, recentCompletedTasks) but nothing about your relationship with individual tasks across sessions. 12a added that. It owns every `appMemory` slot in the arc; 12c consumes them.

**Slots shipped:**
- `returningTasks` — `{ taskId, text, firstSeen, dayCount, focusSessions }` for each task on the list 5+ days (manual + Trello). Written on each `_memoryForAI()` call. Trimmed on complete/delete.
- `obligationLanguageTally` — `{ week, count, completed, tasks[] }`, resets Monday. Detection tightened: min 3 words; "should/must be [adj]" excluded.
- `obligationHistory` — rolling 90-day log of `{ text, date, done }`, retroactively re-validated against current detection on load. **This is the slot that enables the category contrast** ("focus went to chosen work, not to the obligations") — which is what passes all four of 12c's gates. Built to name individual stuck tasks; its real value turned out to be the category comparison.
- `taskAgeBuckets` — `{ d1to3, d4to6, d7to13, d14plus }` summary counts.
- `spokenLines` — `{ surface, date, text }`, 30 entries / 30 days, one per surface per day. What TODAY has said on its own initiative across every surface. Merged across devices in `dropbox.js`.

**`spokenLines` is the novelty gate's knowledge model, not a dedup patch.** Geng & Hamilton: subjective interestingness (novelty, actionability) cannot be computed without an explicit model of what the user already knows. `spokenLines` plus the triage age display (`assets/triage.js:118`) constitute that model. v2.79.0 routed it into the prompt as text, where it can only ask the model to self-police; 12c moves it into the gate, where it eliminates candidates deterministically. The data was right, the layer was wrong.

**Known debt, deliberately deferred:** `obligationHistory` stores raw events, which `design/Personalization.md` warns against (*"don't store behavior — store conclusions"*). Not worth fixing before 12c, because 12c's candidate builder **is** the transformation step — raw events become its input rather than prompt material. Fixing storage first would be work redone.

**Shipped:** v2.77.26 (foundation) · v2.78.0 (obligation history, tighter detection) · v2.79.0 (`spokenLines` + cross-device merge, which also fixed `obligationHistory` never having been added to `_mergeAppMemory`) · v2.79.1 (stopped emitting the same waiting task under two headings — repetition was manufacturing salience in an unranked prompt).

---

#### 12b · Companion Voice — *superseded by 12c (2026-09-01)*

**What shipped (v2.78.1):** three lines added to the nudge instruction telling the model to use accumulated history as judgment rather than report it as counts. System prompt left at its pre-12b baseline. Kept as a holding position until 12c lands; harmless, but not the fix.

**Why it is superseded, not iterated.** 12b handed the morning nudge a dump of raw `appMemory` signals and asked it to decide what mattered — inverting the AI/data contract in `design/Personalization.md`: *"code selects and describes the observation; the LLM is a writer, not the epistemologist."* Four successive prompt revisions could not repair it, which `Personalization.md` also predicts: *"when a surface starts going stale, the fix is a fresh signal, not a better prompt."* External evidence for why prompt-only repair fails on a **selection** problem: Castro Ferreira et al. (EMNLP 2019) find explicit intermediate steps beat end-to-end generation and generalize better to unseen inputs — see `research/ObservationSelection.md`. Unseen input is TODAY's production case; every morning is new data.

**Kept as durable lessons:**
- **Insight vs. count.** An insight catches a blind corner — *"this one has a deadline you haven't clocked."* A count restates something visible — *"this has been here 5 days."* Age in particular is already printed by triage (`assets/triage.js:118`), so age-as-content fails the novelty gate everywhere in the app.
- **Worked examples anchor.** Three examples all shaped `task + days + implication` collapsed the output space to one template — the Wallpaper Test failure mode written into the prompt. State the principle; never demonstrate the form.
- **Negative instructions cost warmth.** Replacing *"a friend noticing, not a coach"* with *"notice the pattern, don't diagnose the person"* removed the license for acknowledgment lines (focus time, what got done) that were landing well. The positive frame already forbids diagnosis; naming diagnosis invites thinking in those terms.
- **Salience is selection.** When a model picks from an unranked list, the most-repeated fact wins. See the v2.79.1 fix — a defect invisible in code review, obvious the moment a real payload was captured. **Capture the actual request before theorising about output.**

Voice memory (`spokenLines`) shipped alongside 12b but belongs to 12a ↑.

---

#### 12c · Observation Pool *(requires 12a — the fix for 12b)*

**One ranked candidate pool feeding every surface.** Code selects the observation; the model only phrases it. `design/Personalization.md`'s own prescription (*"share candidates across surfaces"*).

**Start by extending `assets/week-reflection-policy.js`, not by writing a new module.** That file is already ~60% of the pool: a pure policy layer with no DOM, storage, network, or app-state dependency; it builds scored `candidates[]` with `{ kind, score, evidence, meaning }`, applies minimum-evidence thresholds, requires observations on *both sides* of a comparison, and is directly testable in Node without Puppeteer. Its `meaning` strings are already phrased as association, never causation (*"Focus days coincided with a stronger completion rhythm"*). **Preserve all four properties** — purity, thresholds, two-sided evidence, Node-testability. What it lacks: `appMemory` inputs, a novelty gate, cross-surface eligibility and cooldowns, and any consumer besides Sunday.

**Shape:**
1. **Candidate builder** — extend the existing one to read 12a slots alongside weekly stats. Lifecycle evidence only (revive, Soon-return, focus-session, let-go reason, obligation outcome), never noun themes. Rename `meaning` → `contrast` for honesty; the existing content already qualifies.
2. **Four gates.** Three from `Personalization.md`: **evidence** (repeated behavior or a clear self-comparison), **novelty** (not already said by the list, grid, counters, triage, or `spokenLines`), **usefulness** (changes self-understanding). Plus **single-reading (added 2026-09-01):** a candidate must be statable as a bare contrast; if it only lands with an interpretation attached, the interpretation is doing the work and the app cannot support it. Any gate fails → dropped.
   - **Candidates carry a contrast, never a cause.** Per `research/Psychology.md` — *"the observation creates space; the user fills in the meaning."* Moving causal judgment from the LLM into code relocates the overreach rather than fixing it. *"What's stopping it isn't time — it's starting"* fits the evidence; so does *"work got priority over a dreaded obligation."* When the app picks one, the user either agrees and learns nothing, or disagrees and feels misread.
   - **Prefer category contrasts over single-task, and months over weeks.** *"12 focus sessions this month, all on tasks you chose; the 4 you framed as 'have to' got none"* is a pattern the user resolves themselves. The same contrast over one week is a coincidence. Category contrasts also clear the single-reading gate more often.
3. **Ranking — `impact × significance`,** after Tang et al. (SIGMOD 2017). **Impact** = how much of the user's month the observation covers. **Significance** = deviation from *their own* baseline, never a population's — self-comparison keeps the claim conservative per the AI/data contract. Replaces the hand-tuned score constants currently in the file.
   - **Reject that literature's objective function.** It maximises *surprisingness*; a surprising claim about a person is exactly what the single-reading gate forbids. Take the machinery, not the goal.
4. **Eligibility + cooldowns** — each surface (nudge, Noticed, focus, Sunday, Monday) declares which kinds it can carry and its cooldown. A candidate narrated by one surface is on cooldown for all. Notification research (`research/ObservationSelection.md`) finds receptivity is governed by volume and timing over per-message quality.
5. **Delivery** — the winner goes to the model as evidence + contrast, phrase-only, leaving the contrast unresolved. No raw signal dump.
6. **Output guard** — reject added facts, identity claims, causation. `_weekReflectionTextIsGrounded()` already exists; generalize it.
7. **Abstention** — no qualifying candidate means the surface says nothing. A design primitive, never a fallback for failed generation.

**What this replaces:** 12b's signal dump; `spokenLines` as prompt material (becomes a gate input); and the original 12c (add-date on 7+ day tasks, a Noticed age line) — both were age-as-content, which fails novelty because triage already prints it.

**Suggested first cut:** wire the nudge only, leave the other four surfaces on their current paths, and judge real captured payloads before generalizing. Smaller bet, same information.

**Test for success:** the same pattern is never narrated twice across surfaces in a week, and surfaces genuinely go quiet on thin days rather than reaching. Does a line feel *chosen* rather than generated?

**Prior art:** `research/ObservationSelection.md`.

**Wallpaper test required before shipping.**

---

#### 12d · Memory Surface *(requires 12c)*

What TODAY knows about you, made visible and clearable.

**In the Connections panel:** a new "What I know about you" row. Expands to show current inferences — returning tasks, obligation language patterns, focus habits. Each inference individually dismissible (clears from `appMemory` and stops influencing AI context). Full-clear option.

**Constraints (non-negotiable):** individual inferences are viewable and revocable, not just bulk-deletable. Deletion traces through derived data — if a returning-task inference is dismissed, that task stops appearing in `returningTasks`. No surveillance posture: the panel confirms what TODAY sees, it does not speculate beyond the data.

**Test for success:** a user reading the panel should think *"yes, that's accurate"* — not be surprised or feel observed.

---

### WEEK — Companion Surface *(gated)*

**Vision (revised Aug 2026):** not a planning tool — a longitudinal companion surface. The same relational awareness as 12a–12d, extended to a weekly rhythm. TODAY = the daily moment; WEEK = the accumulated pattern.

**Gate (revised):** 12c is working and genuinely feels like a companion — not a feature. Data accumulation matters but the emotional test is the gate, not the calendar.

**Feeds on:** `today_daily_history` accumulating since v2.17.55. Three months of data gives the weekly view meaningful signal.

---

## Watching

| Decision | Current | Watch for |
|----------|---------|-----------|
| AI/data outcome loop | **Shipped v2.72.0; viewport delivery fixed v2.72.1.** Post-add row records reason provenance and downstream outcomes after the task reaches view. Reason-level policy (`_suggestionShouldOffer`) throttles underperforming categories to 1-in-4 exploration after 4+ decisions. | Check `appMemory.suggestionOutcomes` length — if past 12 resolved offers, inspect reason totals and whether any reason is flagged `underperforming`. Did the recommendation mix change? Only extend to another action (tab focus, habit prompts) if it did and without adding noise. |
| Morning nudge usefulness | v2.43.5 rebalanced list vs memory context; generation runs after sync and result syncs cross-device. The right instrument is now `appMemory.suggestionOutcomes` reason stats, not About panel prose. | If reason-level policy is firing (any reason throttled), check whether it changed the mix before tuning prompts further. |
| Dated AI-cache sync | Four fields hand-plumbed: `day_nudge_ai`, `week_reflection`, `monday_intention`, `week_theme_ai`. `gmail_classify_*` uses a different pattern (keyed by taskId, not date) — not a fifth. | Create one declarative cache registry before a genuinely fifth dated AI field lands (e.g. `focus_companion_ai_*`). Not yet. |
| Merge-anomaly observability | Dropbox emits a console-only `[merge-anomaly]` breadcrumb; no persisted counter or Connections metric. | Revisit only if anomalies appear during debugging or a conflict rate becomes measurable. Not live product telemetry. |
| Chrome Built-in AI (Prompt API) | Research — not started | Chrome 127+ ships Gemini Nano on-device (`window.ai.languageModel`). Still in Origin Trial (Chrome-only, needs registration). Ideal long-term destination for Gmail comm-task classification: on-device, free, no API key, offline. Current approach uses `ai-assist` proxy. When Chrome Built-in AI reaches stable / broad availability, progressive enhancement: try `window.ai` first, fall back to `ai-assist`. Polyfill exists for non-Chrome browsers. Revisit when out of Origin Trial (~2026 or later). |

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
| Morning nudge — history-informed (12b) | v2.78.1 | 2026-09-15 | Open — does the accumulated history make the insight sharper, or does the nudge drift into restating counts? Watch for: template repetition (same sentence shape each morning), loss of the acknowledgment nudges that were landing, any sentence that reports a number back rather than catching a blind corner. |
| Obligation language tip | v2.77.20 | 2026-09-14 | Open — "Have to — or choosing to?" Does it land as a genuine moment of reflection, or does it feel like an interruption? Watch: dismissed immediately vs. paused on. Regex tightened v2.78.0: min 3 words + "should/must be [adj]" excluded. |

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
