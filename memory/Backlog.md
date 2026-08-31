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
| 12a | **Companion — relational memory foundation** | Shipped v2.78.0 | `appMemory` gets relational slots: returning-task registry, obligation-language tally with 90-day named history, task-age buckets. Tightened false-positive detection. Prerequisite for 12b–12d. Detail ↓ |
| 12b | **Companion — voice** | Shipped v2.78.1 | Nudge instruction explicitly names what "About you" contains and invites behavioral pattern observation; "what not why" rule added. Requires 12a. Detail ↓ |
| 12c | **Companion — showing** | Not started | Noticed block carries one relational line; task view shows add-date when a task has waited 7+ days. No AI — pure transparency. Requires 12a. Detail ↓ |
| 11 | **Task agent — enrichment at add-time** | Stages 1 & 2 shipped; Stage 3 next | External context enrichment (Gmail, web search, soon: contacts, calendar, Trello). Distinct from companion arc — enriches the task, not understanding of you. Detail ↓ |
| 10 | **Meeting mode & calendar capture** | In progress / gated | Granola integration MVP before native capture. Calendar = input only, never output. Detail ↓ |
| 9 | **Google Drive sync** | Parked — spec ready | Second sync backend alongside Dropbox; user picks one. Full spec ↓ |
| 12d | **Companion — memory surface** | Not started | "What TODAY knows about you" in Connections. Inspectable, clearable. Requires 12a + 12b to have something worth showing. Detail ↓ |
| — | **WEEK companion** | Gated | Gate is now: *12b is working and feels like a companion, not a feature.* Data accumulation is necessary but not sufficient. Detail ↓ |
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

#### 12a · Relational Memory Foundation *(prerequisite for all)*

`appMemory` currently stores behavioral snapshots (peakHour, recentCompletedTasks). It does not remember your relationship with individual tasks across sessions. The AI starts fresh every morning. This stage changes that.

**`appMemory` slots shipped:**
- `returningTasks` — `{ taskId, text, firstSeen, dayCount, focusSessions }` for each task on the list 5+ days (manual + Trello). Written on each `_memoryForAI()` call. Trimmed when tasks complete or are deleted.
- `obligationLanguageTally` — `{ week, count, completed, tasks[] }` — rolling weekly tally with all task texts for the current week. Resets each Monday. False-positive detection tightened: min 3 words; "should/must be [adj]" excluded.
- `obligationHistory` — rolling 90-day log of `{ text, date, done }`. One entry per obligation-language task added. `done` marked on completion. Retroactively pruned against current detection on every load. Surfaces long-term completion rate when 10+ entries over 30 days.
- `taskAgeBuckets` — `{ d1to3, d4to6, d7to13, d14plus }` summary counts. Cheap to compute; surfaces `d14plus` count as cognitive-weight signal in `_memoryForAI()`.

**What this unlocks:** `_memoryForAI()` now surfaces returning tasks by name, pending obligation tasks by name, long-term obligation completion rate, list growth direction, and cognitive weight — the companion has specific, named memory between sessions.

**Shipped:** v2.77.26 (foundation), v2.78.0 (obligation history + tighter detection).

---

#### 12b · Companion Voice *(requires 12a)*

The morning nudge already runs. This stage gives it relational context and one explicit instruction.

**What shipped (v2.78.1):**
1. Nudge instruction updated: explicitly names what "About you" contains (returning tasks, unstarted, pending obligation-framed tasks); gives Claude permission to lead with a behavioral observation when a pattern points to a specific task — *"they can read their list, but they can't see the pattern."*
2. "What not why" rule added to instruction: *"Show what you notice — don't diagnose. 'X has been here 9 days without a start' is right; 'you're avoiding X' is not."*
3. System prompt: "a friend noticing, not a coach" → "notice the pattern, don't diagnose the person" — more precise framing for the new signal types.
4. No new UI, no new API call.

**Test for success:** the morning nudge names a specific task alongside its behavioral pattern — not "you have stuck tasks" but "call insurance has been framed as a 'have to' for 5 days." The test is: does it feel like being *seen*, not coached?

**What to watch:** Wallpaper test, 2 weeks. Does the relational observation add weight or noise? Does it appear on days when the context warrants it, or force observations on clean slates?

---

#### 12c · Companion Showing *(requires 12a)*

The companion shows rather than speaks. Two surfaces — neither uses AI. Noticed is where this lives: one line about you, not the world. Factual, not interpretive. A mirror held up without comment.

**Noticed block:** when `returningTasks` contains a task 7+ days old, one Noticed line: *"One task has been waiting since [day]."* Appears at most once per day. The filter: not *could we notice this?* — but *does this help you see yourself more clearly?*

**Task view — age signal:** tasks 7+ days old display their add-date in muted text below the task name. No icons, no color change. The user sees time passing without the app editorializing about it.

**Wallpaper test required before shipping.** The Noticed line must feel observational, not accusatory. Test: would this still feel right after 20 appearances?

---

#### 12d · Memory Surface *(requires 12a + 12b)*

What TODAY knows about you, made visible and clearable.

**In the Connections panel:** a new "What I know about you" row. Expands to show current inferences — returning tasks, obligation language patterns, focus habits. Each inference individually dismissible (clears from `appMemory` and stops influencing AI context). Full-clear option.

**Constraints (non-negotiable):** individual inferences are viewable and revocable, not just bulk-deletable. Deletion traces through derived data — if a returning-task inference is dismissed, that task stops appearing in `returningTasks`. No surveillance posture: the panel confirms what TODAY sees, it does not speculate beyond the data.

**Test for success:** a user reading the panel should think *"yes, that's accurate"* — not be surprised or feel observed.

---

### WEEK — Companion Surface *(gated)*

**Vision (revised Aug 2026):** not a planning tool — a longitudinal companion surface. The same relational awareness as 12a–12d, extended to a weekly rhythm. TODAY = the daily moment; WEEK = the accumulated pattern.

**Gate (revised):** 12b is working and genuinely feels like a companion — not a feature. Data accumulation matters but the emotional test is the gate, not the calendar.

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
