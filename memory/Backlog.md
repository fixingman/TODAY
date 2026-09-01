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
| 12c | **Companion — observation pool** | Phases 0–3 shipped; **Phase 4 = judge** | Ranked candidate pool feeding every surface: code selects through 4 gates, model only phrases. Wired to the morning nudge only. Phase 4 is a verdict, not code. Detail ↓ |
| 11 | **Task agent — enrichment at add-time** | Stages 1 & 2 shipped; Stage 3 next | External context enrichment (Gmail, web search, soon: contacts, calendar, Trello). Distinct from companion arc — enriches the task, not understanding of you. Detail ↓ |
| 10 | **Meeting mode & calendar capture** | In progress / gated | Granola integration MVP before native capture. Calendar = input only, never output. Detail ↓ |
| 9 | **Google Drive sync** | Parked — spec ready | Second sync backend alongside Dropbox; user picks one. Full spec ↓ |
| 12d | **Companion — memory surface** | Not started | "What TODAY knows about you" in the Memory panel (`#memoryPanel`, not Connections — see `design/Personalization.md` hard constraint). Inspectable, clearable. Requires 12c to have ranked observations worth showing. Detail ↓ |
| — | **WEEK companion** | Gated | Gate is now: *12c is working and feels like a companion, not a feature.* Data accumulation is necessary but not sufficient. Detail ↓ |
| 2 | **Poem corpus — iterate** | In progress | Expand geography, voice, and forms of self-recognition. Corpus 123 reviewed poems (2026-09-01). Detail ↓ |

---

## Item details

### 2 · Poem Corpus — Iterate

**The brief:**
> 2–6 displayed lines for every candidate from the next search round onward. Previously reviewed longer selections remain grandfathered. Human-written. Two licensing paths: (A) worldwide public domain — author AND translator both d. pre-1956; (B) CC0 / explicit public-domain dedication by the author — verify the specific license on the source page, never assume. Voice: spare, concrete, present-tense, clear/light/affirming — mornings, evenings, seasons, small noticed things. In: imagism, haiku, plain free verse, rhymed-lyrical if the feeling is real and resolves held/affirmed. Out: quaint, ornate, cutesy, preachy, bleak-unresolved, abstraction without an image.
> **App-moment test:** would this still feel right beside an undone task list? If it depends on being read in isolation, cut it.
> **Corpus-fit test:** does it sit comfortably next to Bashō and Marcus Aurelius in tone? The existing corpus is the style reference, not just a checklist.
> **PD check:** for path A — confirm death dates for author and translator. For path B — quote the exact license statement from the source page.

> **Search process:** Start with source diversity, not a familiar-poet query loop. Search national libraries, university collections, regional or bilingual historical anthologies, oral-literature archives, historical journals, and specialist author/translator archives. Generic poetry sites can identify leads but should not define the candidate pool; Gutenberg, Wikisource, Internet Archive, and original scans remain useful for exact wording and worldwide-PD verification. Once a specific poem or collection is identified, fetch only the relevant page or passage. Each round should deliberately vary poets, translators, poetic structures, and kinds of thought; do not return several familiar voices merely because they are easy to source. Region is a tiebreaker—not a quality substitute or a flags-on-a-map exercise.

**Seasons:** W14 / Sp16 / Su12 / Au10 / year-round 71 — corpus 123 reviewed poems (2026-09-01).

**Rotation verdict (2026-08-22):** No repetition observed — shuffle algorithm is not the lever.

**New direction:** continue geographic balance, but candidates require Can's review before entering `assets/poems.js`. Africa, Latin America, the Middle East, and Southeast Asia remain thin relative to East Asia and Europe. Region remains a tiebreaker, never a reason to lower the bar. Untapped poets and contemporary CC-licensed work remain open paths.

**Next search theme — an imprint of commitments:** the updated North Star adds a thematic axis alongside geography. Look for short poems about choosing, keeping, loosening, returning, and recognizing one's relationship to commitments. They should create self-recognition without pressure, shame, or a productivity moral: an imprint, not an instruction. Reject duty sermons, generic perseverance slogans, and poems that tell the reader what kind of person to be.

**Curation learning (2026-08-31):** the Syria/Persia/Armenia round was the strongest of the recent rounds because broadening the discovery destinations broke the repeated-poet/repeated-tone pattern. Its three approved selections offered different intellectual shapes—quiet usefulness over spectacle, a question about genuine value, and hope through weather and endurance. Future rounds should optimize for diversity of thought and voice as well as geography, and treat repeated poets, translators, images, or emotional conclusions as a warning that the search pool is too narrow.

**Curation learning (2026-09-01):** the first commitment-imprint round approved the traditional Asante stream/path verse, Olive Schreiner's deliberate choice, Ricardo Jaimes Freyre's self-defeating pursuit image, and Kahlil Gibran's complete 'The Fox'. Shortness cannot come at the cost of comprehension: Gibran's cropped ending made its camel-to-mouse recalibration unintelligible without the sunrise setup and all-morning search. The complete fable still fits the ceiling at five displayed lines, so preserve it whole rather than manufacturing brevity with stitched fragments or ellipses.

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

#### 12c · Observation Pool — Phases 0–3 shipped, **Phase 4 next**

**One ranked candidate pool feeding every surface.** Code selects the observation through four gates; the model only phrases it. Built by extending `assets/week-reflection-policy.js`, which stays pure and Node-testable. Currently wired to the **morning nudge only**. Implementation detail → `Changelog.md` (2.80.0–2.80.4); prior art → `research/ObservationSelection.md`; prompt rules → `design/Personalization.md`.

**Phase 4 — judge, then generalize.** A verdict, not code. Two weeks of real mornings on the nudge alone; only on a pass do Noticed, focus, Sunday and Monday get wired, with cooldowns. Tracked in the Wallpaper Test table below.

- **The pool is silent for a while by design.** `taskOutcomes` began recording 2026-09-01 and the backfill reaches only as far as existing dated history. Thirty-day windows with 4+ samples per side mean most mornings still take the task-reading path. A quiet fortnight is expected, not a failed threshold.
- **Distinguish the two failure modes before changing anything.** *Never fires* and *fires but feels like a verdict* have different fixes. Check `spokenLines` for entries carrying a `kind` — that is the pool speaking. None at all points at thresholds or thin `taskOutcomes`, not at the prompt.

**Standing rules for wiring any further surface:**

1. **Four gates.** **Evidence** (repeated behaviour or a clear self-comparison), **novelty** (not already said by the list, grid, counters, triage, or `spokenLines`), **usefulness** (changes self-understanding), **single-reading** (statable as a bare contrast — if it only lands with an interpretation attached, the interpretation is doing the work).
2. **Candidates carry a contrast, never a cause.** *"The observation creates space; the user fills in the meaning"* (`research/Psychology.md`). Moving causal judgment from the model into code relocates the overreach rather than fixing it.
3. **Prefer category contrasts over single-task, and months over weeks.** A one-week contrast is a coincidence.
4. **Ranking is editorial, not statistical.** Hand-assigned base scores stay. P-values are not comparable across kinds with different null distributions and are blind to semantics; deviation from the user's own baseline is a within-kind threshold only.
5. **Abstention is per surface.** Where a surface exists only to observe (Noticed, Sunday) it goes silent. Where it also has a factual job, it abstains *to that job* — the nudge falls back to its rule-based line, because the morning is the signature beat.
6. **Cooldowns are cross-surface.** A kind narrated anywhere is on cooldown everywhere; the point is that the person does not hear the same observation twice.

### Candidate kinds — settled with Can 2026-09-01

Sorted by reacting to sample output lines rather than score constants, which is the artifact worth putting in front of a person. Everything that survived is a **relationship** or **lifecycle** kind; both cuts were count-shaped.

| Score | Kind | |
|---|---|---|
| 115 | `focus-vs-obligation` | where focus went, and where it did not |
| 110 | `focus-leverage` | pre-existing |
| 105 | `obligation-completion` | rate on obligation-framed vs chosen |
| 100 | `habit-alignment` | pre-existing |
| 95 | `letgo-reason` | one reason accounts for most of what is released |
| 90 | `recurring-day` | pre-existing |
| 88 | `soon-pullback` | what you defer tends to come back |
| 65 | `bursts` | pre-existing, last resort — same container-subject shape as the cuts. Task context may rescue it: naming *what* filled the busy days would give it a subject |
| — | `list-growth`, `cognitive-weight` | **cut** — container subject, and a count of what triage already prints |

**Two rules the cuts produced**, now also in `design/Personalization.md`: the person is the subject, never a container; and name the actual list, or the observation is not sayable.

**Backfilled rows carry unknowns, and unknowns must stay unknown.** `focusSessions` is unknown for reconstructed history — written as `0`, `focus-vs-obligation` becomes trivially true. `obligation` is unknown for let-go and revive rows — written as `false`, they are silently counted as *chosen*. Rows carry `backfilled: true` and `obligation: null`, and partitions match on `=== true` / `=== false`, never truthiness.

**Tests:** `scripts/observation-pool-test.mjs` (42, in `test-all`), plus pool coverage in `insights-test`, `dropbox-test` and `nudge-test`. They assert the silences as well as the firings.

**Two verification hazards, both hit more than once:**
- **Capture the real payload before theorising about output.** The v2.79.1 duplicate-emission defect was invisible in code review and obvious the moment the request was intercepted.
- **Verify on a port not used earlier in the session.** A reused port serves cached JS, so new code reads as `undefined` or silently inert and looks broken. `spokenLines` and the Phase 0 merge both appeared dead this way and were fine.

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
| AI/data outcome loop | Shipped v2.72.0/v2.72.1. | Check `appMemory.suggestionOutcomes` — past 12 resolved offers, inspect whether any reason is flagged `underperforming` and whether the mix actually changed. Only extend to another action if it did. |
| Morning nudge usefulness | **Superseded by 12c (v2.80.x).** The nudge now has two tracks: a pool-selected observation when a candidate survives the gate, otherwise the task-reading path. The instrument is no longer `suggestionOutcomes` — it is `appMemory.spokenLines` (what was said, and which `kind` produced it) and `appMemory.taskOutcomes` (what the pool had to work with). | Read `spokenLines` entries carrying a `kind`: that is the pool speaking. None after two weeks means the thresholds are too strict or `taskOutcomes` is too thin — check which before touching any prompt. |
| Dated AI-cache sync | Four fields hand-plumbed: `day_nudge_ai`, `week_reflection`, `monday_intention`, `week_theme_ai`. `gmail_classify_*` uses a different pattern (keyed by taskId, not date) — not a fifth. | Create one declarative cache registry before a genuinely fifth dated AI field lands (e.g. `focus_companion_ai_*`). Not yet. |
| Merge-anomaly observability | Dropbox emits a console-only `[merge-anomaly]` breadcrumb; no persisted counter or Connections metric. | Revisit only if anomalies appear during debugging or a conflict rate becomes measurable. Not live product telemetry. |
| Chrome Built-in AI (Prompt API) | Research — not started | Chrome 127+ ships Gemini Nano on-device (`window.ai.languageModel`). Still in Origin Trial (Chrome-only, needs registration). Ideal long-term destination for Gmail comm-task classification: on-device, free, no API key, offline. Current approach uses `ai-assist` proxy. When Chrome Built-in AI reaches stable / broad availability, progressive enhancement: try `window.ai` first, fall back to `ai-assist`. Polyfill exists for non-Chrome browsers. Revisit when out of Origin Trial (~2026 or later). |

---

## Wallpaper Test

> **Rule:** resolve each row — **kept**, **iterated**, or **removed** — at the due date.
> **Pre-registration:** in the week before each verdict, note a one-word observation each time the surface is used or skipped.
>
> **⚠ Overdue as of 2026-09-01 — six rows past their due date and unresolved.** These need Can's verdict, not a guess; each is marked below. An unresolved row is not a neutral state — it is a surface still shipping on an untested assumption, and the longer it sits the more it looks like a decision that was made rather than one that was skipped.

| Surface | Shipped | Due | Status |
|---------|---------|-----|--------|
| Monday intention (memory-enriched) | v2.65.1 | ⚠ 2026-08-24 | Verdict (2026-08-17): synthesis is nice. Data source fixed: now includes Soon + Trello. Re-observe next Monday. |
| About contextual CTAs | v2.64.10 | ⚠ 2026-08-25 | Open — does the bordered CTA treatment make actions clearer without pulling attention? |
| Connections privacy reassurance | v2.64.11 | ⚠ 2026-08-26 | Open — one appearance per device when fully disconnected. Timely reassurance or policy copy interrupting setup? |
| Focus companion question | v2.65.0 | ⚠ 2026-08-31 | Improved: taxonomy system prompt, drag-word + letgo-reason signals, word cap 18→22. Re-observe — does the question now feel like clarity rather than a check-in? |
| Post-triage reflections | v2.65.7 | ⚠ 2026-08-31 | Open — real pause or rote wallpaper? Watch for: avoidance on hard days, selection bias, feeling rote after first week. |
| Memory panel quality gate | v2.47.0 | ⚠ 2026-09-01 | Open — are AI-generated hypotheses earning confirmation or getting dismissed? |
| Season moments — solar term label | v2.71.0 | 2026-09-05 | Open — does `処暑 · End of Heat` feel like context or noise after a few appearances? |
| Sunday earned insight | v2.71.12 | 2026-09-06 | Open — does it reveal a real lever rather than paraphrasing the grid? Track abstentions as healthy. |
| Obligation language tip | v2.77.20 | 2026-09-14 | Open — "Have to — or choosing to?" Does it land as a genuine moment of reflection, or does it feel like an interruption? Watch: dismissed immediately vs. paused on. Regex tightened v2.78.0: min 3 words + "should/must be [adj]" excluded. |
| Morning nudge — pool-selected observation (12c Phase 3) | v2.80.1 | 2026-09-15 | Open — **this is Phase 4.** Does a pool line feel *chosen* rather than generated? Watch for: whether any pool line appears at all (check `spokenLines` for entries with a `kind`); whether it lands as recognition or as a verdict; whether the task-reading path on other mornings still feels as good as before. A pool line that never fires and a pool line that feels like judgment are different failures with different fixes — distinguish them before changing anything. |

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
