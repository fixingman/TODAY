# Backlog

> **Forward-looking only: what to build next, what's parked, and decisions made.**
> Shipped work → `Changelog.md` (+ `archive/Changelog-archive.md`). Fixed bugs → `archive/Bugs-archive.md`. History is not duplicated here.

---

## Claude session conventions

| Context | Use |
|---------|-----|
| Searching Coda | `/browse` skill — not raw WebFetch or grep |
| Poem display in chat | Real line breaks, one per line, in a blockquote. Never `/` as an inline separator. |

**Poem curation search process:** Broaden discovery before narrowing candidates — national libraries, university digital collections, regional/bilingual anthologies, oral-literature archives, historical journals, author/translator archives. Generic poetry sites only as leads or cross-checks; Gutenberg, Wikisource, and Internet Archive for exact text and PD verification. WebSearch to identify a specific poem or collection → targeted fetch of the relevant page only; no bulk-fetching. Work inline in the main conversation, not via agents.

---

## ◎ North star (updated Aug 2026)

**TODAY is a longitudinal companion.** It accumulates real understanding of you — not your productivity stats, but your relationship with your own commitments. Over time it helps you see yourself more clearly, so you can make different choices.

The experience is calm. Opening TODAY in the morning shows an imprint of your life — choices you've made, not obligations staring back. No pressure, no shame, no guilt. A companion that speaks when it matters, holds space when it doesn't, and catches the blind corners you can't see yourself.

**The morning is TODAY's signature beat** — nudge (verdict 2026-07-18: kept, read every time), poem (#2), briefing (#7); everything else supports or follows. How intelligence and personalization serve this → `design/Personalization.md`.

---

## ▸ Roadmap

| # | Item | Status | Notes |
|---|------|--------|-------|
| 12c | **Companion — observation pool** | Phases 0–3 shipped; **Phase 4 running** | Morning (today-hook kinds) + Sunday (all outcome kinds). Detail ↓ |
| 11 | **Task agent — enrichment at add-time** | Stages 1–3 shipped | Stage 3 (v2.90.0): `search_trello` custom tool. Contacts + calendar remain out of scope until those integrations exist. Detail ↓ |
| 10 | **Meeting mode & calendar capture** | In progress / gated | Granola MVP first; calendar = input only. Detail ↓ |
| 9 | **Google Drive sync** | Parked — spec ready | Second sync backend; user picks one provider. Full spec ↓ |
| — | **WEEK companion** | Gated | Gate: 12c must feel like a companion, not a feature. Detail ↓ |
| 2 | **Poem corpus — iterate** | In progress | Corpus 128; expand geography and voice. Detail ↓ |

---

## Item details

### 2 · Poem Corpus — Iterate

**The brief:**
> 2–6 displayed lines for every candidate from the next search round onward. Previously reviewed longer selections remain grandfathered. Human-written. Two licensing paths: (A) worldwide public domain — author AND translator both d. pre-1956; (B) CC0 / explicit public-domain dedication by the author — verify the specific license on the source page, never assume. Voice: spare, concrete, present-tense, clear/light/affirming — mornings, evenings, seasons, small noticed things. In: imagism, haiku, plain free verse, rhymed-lyrical if the feeling is real and resolves held/affirmed. Out: quaint, ornate, cutesy, preachy, bleak-unresolved, abstraction without an image.
> **App-moment test:** would this still feel right beside an undone task list? If it depends on being read in isolation, cut it.
> **Corpus-fit test:** does it sit comfortably next to Bashō and Marcus Aurelius in tone? The existing corpus is the style reference, not just a checklist.
> **PD check:** for path A — confirm death dates for author and translator. For path B — quote the exact license statement from the source page.

> **Search process:** Start with source diversity, not a familiar-poet query loop. Search national libraries, university collections, regional or bilingual historical anthologies, oral-literature archives, historical journals, and specialist author/translator archives. Generic poetry sites can identify leads but should not define the candidate pool; Gutenberg, Wikisource, Internet Archive, and original scans remain useful for exact wording and worldwide-PD verification. Once a specific poem or collection is identified, fetch only the relevant page or passage. Each round should deliberately vary poets, translators, poetic structures, and kinds of thought; do not return several familiar voices merely because they are easy to source. Region is a tiebreaker—not a quality substitute or a flags-on-a-map exercise.

**Seasons:** W14 / Sp18 / Su12 / Au12 / year-round 72 — corpus 128 reviewed poems (2026-09-18). Target is 16 per season: summer and autumn need 4 each, winter 2; spring is 2 over.

**Rotation verdict (2026-08-22):** No repetition observed — shuffle algorithm is not the lever.

**New direction:** continue geographic balance, but candidates require Can's review before entering `assets/poems.js`. Africa, Latin America, the Middle East, and Southeast Asia remain thin relative to East Asia and Europe. Region remains a tiebreaker, never a reason to lower the bar. Untapped poets and contemporary CC-licensed work remain open paths.

**Next search theme — an imprint of commitments:** the updated North Star adds a thematic axis alongside geography. Look for short poems about choosing, keeping, loosening, returning, and recognizing one's relationship to commitments. They should create self-recognition without pressure, shame, or a productivity moral: an imprint, not an instruction. Reject duty sermons, generic perseverance slogans, and poems that tell the reader what kind of person to be.

**Curation learning (2026-08-31):** the Syria/Persia/Armenia round was the strongest of the recent rounds because broadening the discovery destinations broke the repeated-poet/repeated-tone pattern. Its three approved selections offered different intellectual shapes—quiet usefulness over spectacle, a question about genuine value, and hope through weather and endurance. Future rounds should optimize for diversity of thought and voice as well as geography, and treat repeated poets, translators, images, or emotional conclusions as a warning that the search pool is too narrow.

**Curation learning (2026-09-01):** the first commitment-imprint round approved the traditional Asante stream/path verse, Olive Schreiner's deliberate choice, Ricardo Jaimes Freyre's self-defeating pursuit image, and Kahlil Gibran's complete 'The Fox'. Shortness cannot come at the cost of comprehension: Gibran's cropped ending made its camel-to-mouse recalibration unintelligible without the sunrise setup and all-morning search. The complete fable still fits the ceiling at five displayed lines, so preserve it whole rather than manufacturing brevity with stitched fragments or ellipses. The following round approved D. H. Lawrence's boundary against self-exhaustion, John Gould Fletcher's choice of sunlight over output, Chekhov and Constance Garnett's autumn sentence resolving into forgiveness and peace, and John Shaw Neilson's quiet arrival of love. The mix confirms that commitment-imprint work can include boundaries, attention, release, and relationship without converging on a productivity lesson.

**Season-tag audit (2026-09-01):** `season: null` explicitly means year-round, not unreviewed. Three literal seasonal signals had been missed or misfiled: Frost's first green/early leaf belongs to spring, Bashō's toad is a summer kigo, and Whitman's explicitly autumnal fruit belongs to autumn rather than summer. Prefer a poem's concrete scene, named season, or established kigo over a broad nature association when tagging future additions. Counts above reflect the corrected tags.

**Curation learning (2026-09-02):** two seasonal passes, 31 candidates, two approved — Fun'ya no Asayasu's dewdrops the autumn wind scatters "as I pass" (Porter no. 37) and Amy Lowell's 'Falling Snow', clog-holes the temple bell will see covered. Both put a person inside the season and let a small trace not last, without complaint. Everything cut was scene without a person in it (Jitō, Korenori, Akahito, the Chinese summer quatrains, Lowell's dragonfly-or-leaf) or a person without a season doing anything to them (the Greek invitations to rest, the Navajo rain chant, Noguchi by the fire). Lesson: for seasonal fills, the season has to act on someone. 'Falling Snow' is the first post-ceiling seven-line entry, admitted because the last two lines are the poem — the same reasoning as Gibran's 'The Fox'. The ceiling stays; the exception is per-poem and Can's.

**Curation learning (2026-09-08):** Po Chü-i's 'After Lunch' clarified another successful shape: an ordinary bodily rhythm, a noticed change in light or surroundings, then a philosophical turn that does not instruct the reader. Can approved González Martínez's inn offering rest without persuasion, Bhartrihari's earth-and-moon abundance, and Tagore's completed day at the tide. Search beyond those authors and translators next; the reusable quality is the movement from lived detail into perspective, not merely poems about rest, evening, or contentment.

**Present-moment follow-up (2026-09-13):** Can approved the four-line opening of Emily Dickinson's 'Forever is composed of Nows' after the corpus surfaced Le Gallienne's Khayyám line about the magic words "Here and Now." Dickinson is the quieter sister thought: not an instruction to seize the day, but a widening of the present into eternity. Added year-round; exact selection pinned in smoke coverage so another Dickinson poem cannot satisfy the check accidentally.

**Present-through-transience follow-up (2026-09-13):** Can also approved the complete closing stanza of Richard Watson Gilder's 'Because the Rose Must Fade'. Its rose, sunset, winter, and dying music reach the present moment through impermanence—a concrete complement to Khayyám and Dickinson rather than another direct instruction to seize the day. Added year-round; the exact six lines are pinned in smoke coverage.

**Existential follow-up (2026-09-18):** Can approved Nietzsche's quiet self-narration from 'Old and New Tables' in Thomas Common's translation: speaking to oneself "as one who hath time" and telling one's own story. Added year-round as a contiguous prose passage reflowed to three displayed lines and pinned exactly in smoke coverage. Continue with the narrower discovery lens: existential clarity that remains calm, concrete, and life-affirming—not bleakness used as gravitas. Copyright must be checked at the translation level; Nietzsche/Common are eligible, while Sartre and the principal twentieth-century existentialists are not yet compatible with the worldwide-PD rule.

**Life-as-poem follow-up (2026-09-18):** Can approved Thoreau's complete two-line passage from *A Week on the Concord and Merrimack Rivers*: a life can itself be the poem that living leaves no distance to write. Added year-round in the published 1849 wording—retaining the period word “writ,” not modernizing it—and pinned exactly in smoke coverage. Thoreau's earlier journal draft differs; the corpus follows the version he published in his lifetime.

**Nietzsche/Tille follow-up (2026-09-18):** Can approved the complete sentence “we love life, not because we are accustomed to life, but because we are accustomed to love” from 'Of Reading and Writing' in Alexander Tille's 1896 translation. Tille's wording removes the comprehension friction of Thomas Common's “wont” without silently modernizing the text. Added year-round as three displayed lines and pinned exactly in smoke coverage. Continue checking Tille directly: his earlier translation is worldwide-PD and sometimes plainer than Common, but its diction and interpretive choices still need selection-by-selection review.

**Tille search pass (2026-09-18):** Read the full 1896 *Thus Spake Zarathustra* OCR and checked the strongest short passages against their page scans. Can approved the sun-opening question (“Thou great star! What would be thy happiness…”); it is added year-round as two displayed lines and pinned exactly in smoke coverage. Still pending review: the two complete noon-field sentences from 'At Noon' and the two-sentence death/blossoming cycle from 'The Convalescent One'. Also surfaced but held back: Tille's 'Night-Song' opening (Common's wording is more musical), the present/past line from 'Of Great Longing' (too archaic), and “life was dearer unto me than all my wisdom” (strong conclusion, but loses its green-meadow scene when shortened to the line limit). Tille appears to have translated *Zarathustra* and edited the broader English Nietzsche series; do not attribute the other volumes' translations to him without checking their individual title pages.

**Archaic-language audit (2026-09-18):** Removed seven selections whose historical English now obstructs comprehension: Bashō's dragonfly (“whereon…essayed”), FitzGerald's Khayyám (“what boots it”), Cranmer-Byng's Li Po (“doth war”) and Chang Chih-ho (“liefer…ken…godhead”), Carlyle's Abd Alsalam (“'twere…draught…thine”) and Al-Shafi'i (“corse…yon…nor want”), and Blackwell's González Martínez (“This can mine inn give”). A source-by-source check found no materially clearer published English rendering that is also safely worldwide-PD: modern Bashō and Li Po versions are copyrighted; the two Arabic poems and Chang Chih-ho resolve to the same old translations; Blackwell is the only located published English version of González Martínez; and older Khayyám alternatives retain similarly archaic diction while duplicating the corpus's clearer “Here and Now” selection. These seven wordings are permanent cuts and are guarded in the smoke test; do not silently modernize them or re-add an unattributed web paraphrase.

**Archaic-language audit, second pass (2026-09-18):** Removed Shakespeare's winter excerpt (“blows his nail”) and Hopkins's *Pied Beauty* excerpt (“couple-colour…brinded…rose-moles…stipple”); both are English originals, so a clearer translation would be an invented modernization. Removed Thomas Walsh's Machado *Counsels* and Pope's Tirukkural 78 after no clearer worldwide-PD published rendering passed the same test—Aiyar's kural 78 is even more biblical (“loveth…putteth forth”). Replaced only Pope's syntactically opaque Tirukkural 1312 with V. V. S. Aiyar's complete 1916 prose rendering, which makes the sneeze-and-blessing joke explicit; exact wording is pinned in smoke coverage. The four removed wordings are permanent cuts.

**Solar-term pairing (2026-09-02):** the 24 terms are an editorial discovery lens, not an attribution claim. A poem may enter a term's seasonal pool when its concrete moment genuinely fits; documentation must say “editorially paired,” never imply that a poet wrote about the East Asian calendar. Joseph S. Cotter, Jr.'s complete opening stanza of 'Rain Music' is the first approved example, paired with Rain Water (雨水): rain changes the dusty ground and grows audibly from murmur to strain.

Poet notes: Teasdale (*Stars To-night*) rich for future rounds. Crapsey fully cut. Lowell's *Pictures of the Floating World* (Lacquer Prints) remains the richest short-form source found this round; the three cut Lowells are dead, the rest of the section is open.

**PD notes:** US-PD-only closed (v2.35.3) — worldwide PD is the bar. Five US-PD poems kept permanently (Frost ×3, Yang-ti, Po Chü-i 'After Lunch'). Future unlocks: Milne 2027 (taste caveat: canonical "cutesy"), cummings 2033, Frost/WCW worldwide 2034, Eliot 2036. China most-represented — country tiebreaker is a lean, not a wall.

**Curation rule: a cut is final.** Candidates not picked are dead — never re-proposed. (Not-picked so they aren't re-found: Ou-yang Hsiu 'Bell Hill', Yeats 'Cloths of Heaven', Landor 'Dying Speech', Moritake butterfly, Hokushi 'burnt out', Dickinson 'The Snow', Nervo 'Revenge', Nervo 'What matter hours' [untitled], Storni 'The Piety of the Cypress', Contardo 'Home of Peace and Purity', Lugones 'The Palm Tree' [32 lines, grave/loss], Lugones 'The Gift of Day' [12 lines], José Rizal 'To the Flowers of Heidelberg' [first stanza, trans. Charles Derbyshire], Manuel José Othón 'The Bell' [opening stanza, trans. Alice Stone Blackwell], the traditional Malay turi-tree pantun [trans. John Crawfurd], the traditional Nyanja night-jar song [recorded by R. S. Rattray], Egbert Martin 'A Shaded Spot' [excerpt], Sarojini Naidu 'Spring' [opening stanza], Gladys May Casely-Hayford 'Rejoice' [excerpt], Narciso Tondreau 'Yesterday and Today' [excerpt], the traditionally attributed 'Song of Maisuna' [opening stanza, trans. Joseph Dacre Carlyle], and John Muir's 26 August frost-and-irised-crystals sentence from *My First Summer in the Sierra*; all reviewed and skipped by 2026-09-01. Skipped 2026-09-02, seasonal round: Porter's Hyakunin Isshu nos. 2 [Jitō], 81 [Sanesada], 87 [Jakuren], 31 [Korenori], 4 [Akahito]; Giles 1898 'Summer Begins' [Chu Shu-chen] and 'Summer' [Tai Fu-ku]; Cranmer-Byng 1916 'On Waking from Sleep' [Liu Ch'ang, opening], 'Rain at Dawn' and 'At Forty-one' [Po Chü-i], 'Wild Geese' [Ou-yang Hsiu, first quatrain], 'Songs on the Night' III [Ou-yang Hsiu]; Mackail 'The Woodland Well' [Nature XII]; Curtis 1907 Navajo 'Song of the Rain-Chant' [corn stanza]; Chamberlain 1902 nos. 121 [Jōsō leaf], 71 [Sute-jo clogs] and the Keirin water-wheel epigram; second pass the same day: Fletcher 'Mid-Summer Dusk', 'Court Lady Standing Under a Plum Tree' and 'A Woman in Winter Costume' [Japanese Prints 1918]; Kalidasa's summer quatrain from the Shakuntala prologue [trans. Ryder]; the Japanese children's firefly song [trans. Hearn]; Antiphilus 'Under the Oak' [Mackail, Nature XVII]; Amy Lowell 'Autumn', 'Autumn Haze', 'Frosty Evening' and 'Constancy' [Pictures of the Floating World]; Li Po 'Autumn River Song' [trans. Lowell & Ayscough]; Yone Noguchi's morning-moon/snow couplet [Japanese Hokkus p. 81] and no. 72 snow-and-fireside.)

**Additional final cuts (solar-term round, 2026-09-02):** the traditional |Xam flower-opening song told by Dia!kwain and recorded/translated by Lucy Lloyd; the traditional Osage planting-song opening translated by Francis La Flesche; Archibald Lampman's cricket-and-grasshopper stanza from 'Heat'; the traditional Song of Annam 'Nocturne' opening shaped by Edward Powys Mathers; and the traditional Paiute Ghost Dance snow/Milky Way song recorded by James Mooney.

**Additional final cuts (solar-term round, 2026-09-03):** T. E. Hulme's 'Autumn' opening (cold in the autumn night; moon like a red-faced farmer); Thomas Hardy's 'Snow in the Suburbs' closing (the black cat comes in from the snow); Sarojini Naidu's 'June Sunset' opening (a heart finding haven as rain-fed streams awaken); H. Cordelia Ray's 'August' closing (turning from heat and turmoil to the ocean); E. Pauline Johnson's 'The Indian Corn Planter' seed-under-the-planter's-moon excerpt; and Ameen Rihani's 'It Was All for Him' rain-retouches-and-revises-writing excerpt. All six were reviewed and skipped; do not re-propose them.

**Additional final cuts (ordinary-time round, 2026-09-08):** the opening stanza of the traditional Song of Annam 'The Bamboo Garden' shaped by Edward Powys Mathers; the closing dove stanza from Manuel Gutiérrez Nájera's 'To Francisco de Garay Justiniani' translated by Alice Stone Blackwell; and the opening stanza of W. H. Davies's 'A Great Time'. All three were reviewed and skipped; do not re-propose them.

**Additional final cuts (ordinary-time follow-up, 2026-09-08):** Sumangalā's Mother's shade stanza translated by C. A. F. Rhys Davids; the distant-rays couplet from the Great Hymn to the Aten translated by James Henry Breasted; the closing goat-and-world-poem couplet from Alfonso Guillén Zelaya's 'Lord, I Ask a Garden' translated by William George Williams; the traditional Ndau dock-workers' 'Money in Kamben'' passage recorded from C. Kamba Simango; the opening movement of Uvavnuk's 'The Great Sea' translated through Knud Rasmussen's expedition; and the refreshed-by-sleep passage from Mary Lamb's 'Breakfast'. All six were reviewed and skipped; do not re-propose them.

**Additional final cuts (commitment-imprint follow-up, 2026-09-17):** the closing three lines of the traditional Kurdish love ballad 'Paradise' shaped by Edward Powys Mathers; the traditional Malay lamp-and-wick pantun recorded by William Marsden; the palm-frond couplet from Gladys May Casely Hayford's 'Nativity'; and the traditional Jambi pomegranate pantun translated by John Crawfurd. All four were reviewed and skipped; do not re-propose them.

**Active leads:**
- Chamberlain 1902 (archive.org/details/basho-and-the-japanses-poetical-epigram) — productive; identifier confirmed
- Cranmer-Byng *A Feast of Lanterns* (archive.org `in.ernet.dli.2015.282424`) — Yuan Mei, Liu Tzu-hui unproposed, available when China tiebreaker lifts
- Carlyle, *Specimens of Arabian Poetry* (Cambridge, 1796; Carlyle d.1804) — worldwide PD, but the first targeted pass ('On Temper', 'Barmecides', 'To the Khaliph', 'On a Thunder-Storm', 'To a Dove', 'On Moderation in Our Pleasures') was ornate, preachy, bleak, or over the line limit. Do not re-propose those; other titles remain open.
- Tirukkural (Thiruvalluvar, trans. G. U. Pope, 1886) — Wikisource has Ch. 131–133 verbatim; Ch. 110, 121–130 are redlinks. Book III love chapters have strong candidates (K1095, K1227). Pope d. 1908, worldwide PD.
- Prose at Marcus Aurelius length (2–5 sentences): Muir *First Summer* (d.1914) remains open except for the final-cut 26 August frost sentence; Garnett-translated Chekhov produced the approved autumn sentence from 'Ionitch', while other passages remain open.
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

**Stage 3 shipped (v2.90.0):** `search_trello` custom tool added. When Trello is connected, Claude checks the user's board first (existing card link > web result). `pause_turn` (server/web_search) and `tool_use` (custom/search_trello) are now handled in separate branches. MAX_TURNS 3 → 5. Client passes `trelloToken` + `trelloBoardId` on every call.

`search_contacts` and `read_calendar` remain deferred — those integrations don't exist yet.

**Out of scope:** autonomous execution without review · importing others' email as tasks · always-on background agent (trigger-on-add only)

**Framing note (Aug 2026):** Stage 3 enriches tasks with *external* context. The companion arc (Items 12a–12d) builds *internal* understanding of you. Both are valid; they are different directions. Don't conflate them — Stage 3 makes a task richer, the companion arc makes *you* more visible to yourself.

---

### 12 · Companion Arc

#### 12c · Observation Pool — Phases 0–3 shipped; **Phase 4 running** (restarted 2026-09-03)

**One ranked candidate pool feeding two surfaces.** Code selects through four gates; the model only phrases. `assets/week-reflection-policy.js`, pure and Node-testable, 68 tests. Consumers: the **morning nudge** (only kinds that can point at today's list) and the **Sunday reflection** (every kind). Cooldowns are cross-surface, so an observation is said once wherever it lands.

### Phase 4 — first sample, and what it changed (2026-09-02/03)

First real pool line, on the morning nudge:

> *"8 of 9 things you let go this month just stopped being relevant. Almost everything, one reason."*

Can: it read as a month insight on a surface that had been about today; the register went cold; *"i didnt think much of it."* And on the number: *"9 is not a relevant number considering how much I consume."*

**This is one sample, not a verdict — the plan says two weeks.** The first response was to park the pool entirely, which was wrong twice over: it removed the only feedback loop the north star has, and it treated n=1 as final. Reverted the next day. What the sample *did* expose were three concrete defects, all fixed 2026-09-03:

1. **Per-surface eligibility was in the spec (Shape item 4) and skipped in Phase 3.** Every outcome kind went to the morning. `letgo-reason` has no today-hook, so it read like a month insight at 8am — structural, not a wording problem, which is why the fix is not a prompt change. Now `_observationEligibleFor(candidates, surface, ctx)`: the morning carries `letgo-return`, `soon-pullback`, and `focus-vs-obligation` only when an obligation-framed task is on today's list; Sunday carries every kind.
2. **`letgo-reason` stated one thing twice** — its contrast restated its evidence. Now the evidence carries the base rate (*"You let go of 9 of the 60 things that ended this month"*) so the count reads as a share, and the contrast is the reasons that did **not** dominate (*"Energy, interest and replacement barely figured"*) — a real second side. Note the 9 was cleaner than it looked: the kind requires a chosen reason, so quick deletes and Edit-to-rewrite are excluded.
3. **`taskTexts` had no caller.** The parallel `letgo-return` work (v2.81.3) added the parameter so the loop could be named while the task is on the list, but the consumer had been removed under it. `_memoryTaskTexts()` in `insights.js` now builds the id→text map from the live lists for both consumers.

**~~Still owed — the usefulness gate.~~ Resolved by 12e (v2.86.0).** Three gates are code: evidence, novelty, single-reading. Usefulness was treated as an editorial decision about which kinds exist, not a per-candidate test, so nothing asked *does knowing this change what I do?* The second sample settled how: it cannot be code, because only the person can answer it. The person's reaction is the gate — see 12e below.

**Filed separately, not as a block:** Can does not visit the Memory panel and finds most of its AI hypotheses uninteresting. That is the overdue *Memory panel quality gate* verdict — a finding about generated hypotheses, not about the pool and not about 12d's plain data view. Watching row below.

### Phase 4 — second sample, and what it changed (2026-09-07)

Sunday reflection:

> *"You hit a 6.6 completions/day stride on 5 focus days this week, compared to just 0.5 on the other 2."*

Can: *"i dont like this statistics insight, especially for the week nudge on Sunday. absolutely useless. You know our northstar, we worked hard to deduct it, and this is the result?"*

He is right, and the cause is structural, not phrasing. The line was `focus-leverage` at its ceiling score of 130, above every commitment observation. Its subject is completions per day — a productivity stat, which the north star rules out in its first paragraph. The four "pre-existing" kinds in the table below were carried into the pool from the pre-north-star week reflection with the highest base scores and were never re-judged against it; the table itself already flagged `bursts` as "same container-subject shape as the cuts". **All four retired in v2.85.0.** The pool is outcome kinds only; Sunday holds space when none is sayable. This is also the concrete case for the still-owed usefulness gate: nothing asked *does knowing this change what I do?*

**Phase 4 window: two weeks from 2026-09-03, both surfaces.** Wallpaper row below.

### Candidate kinds — settled with Can 2026-09-01

Sorted by reacting to sample output lines rather than score constants, which is the artifact worth putting in front of a person. Everything that survived is a **relationship** or **lifecycle** kind; both cuts were count-shaped. *(2026-09-07: the four "pre-existing" statistical kinds that had been grandfathered in were cut too, after the second sample — see above.)*

| Score | Kind | Signal |
|---|---|---|
| 115 | `focus-vs-obligation` | where focus went, and where it did not |
| 105 | `obligation-completion` | rate on obligation-framed vs chosen |
| 95 | `letgo-reason` | dominant let-go reason vs. what didn't dominate |
| 92 | `return-finished` | what comes back, and whether it gets done (withholds `letgo-return` when both fire) |
| 88 | `soon-pullback` | what you defer tends to come back |
| 85 | `letgo-return` | what you release and what returns — linked by id, 45-day window |
| — | `list-growth`, `cognitive-weight` | **cut** — container subject |
| — | `focus-leverage`, `habit-alignment`, `recurring-day`, `bursts` | **cut v2.85.0** — productivity stats, never re-judged against the north star |

**Two rules the cuts produced**, now also in `design/Personalization.md`: the person is the subject, never a container; and name the actual list, or the observation is not sayable.

**Backfilled rows carry unknowns, and unknowns must stay unknown.** `focusSessions` is unknown for reconstructed history — written as `0`, `focus-vs-obligation` becomes trivially true. `obligation` is unknown for let-go and revive rows — written as `false`, they are silently counted as *chosen*. Rows carry `backfilled: true` and `obligation: null`, and partitions match on `=== true` / `=== false`, never truthiness.

**Tests:** `scripts/observation-pool-test.mjs` (80, in `test-all`), plus pool coverage in `insights-test`, `dropbox-test` and `nudge-test`. They assert the silences as well as the firings.

**Two verification hazards, both hit more than once:**
- **Capture the real payload before theorising about output.** The v2.79.1 duplicate-emission defect was invisible in code review and obvious the moment the request was intercepted.
- **Verify on a port not used earlier in the session.** A reused port serves cached JS, so new code reads as `undefined` or silently inert and looks broken. `spokenLines` and the Phase 0 merge both appeared dead this way and were fine.


### WEEK — Companion Surface *(gated)*

**Vision (revised Aug 2026):** not a planning tool — a longitudinal companion surface. The same relational awareness as 12c, extended to a weekly rhythm. TODAY = the daily moment; WEEK = the accumulated pattern.

**Gate (revised):** 12c is working and genuinely feels like a companion — not a feature. Data accumulation matters but the emotional test is the gate, not the calendar.

**Feeds on:** `today_daily_history` accumulating since v2.17.55. Three months of data gives the weekly view meaningful signal.

---

## Watching

**AI/data outcome loop** *(v2.72.0)* — `suggestionOutcomes` holds the last 12 resolved offers. Extend only if `underperforming` appears and the action mix actually changed.

**Morning nudge** *(superseded by 12c, v2.80.x)* — Instrument is now `spokenLines` (which `kind` produced each line) and `taskOutcomes` (what the pool had to work with). No pool line after two weeks means thresholds too strict or data too thin — check which before touching any prompt.

**Memory panel — AI hypotheses** — Can does not visit; most inferences uninteresting. Before any new hypothesis generation: read `appMemory.memory.semantic/episodic/procedural` statuses. If almost nothing confirmed, the generator is producing unrecognised guesses — diagnose that before adding sources.

**Dated AI-cache sync** — Four fields hand-plumbed: `day_nudge_ai`, `week_reflection`, `monday_intention`, `week_theme_ai`. (`gmail_classify_*` is keyed by taskId, not date — not a fifth.) Create a declarative registry before a genuinely fifth dated AI field lands. Not yet.

**Merge-anomaly observability** — Console-only `[merge-anomaly]` breadcrumb; no persisted counter. Revisit only if anomalies appear during debugging.

**Chrome Built-in AI (Prompt API)** — Chrome 127+ ships Gemini Nano on-device; still Origin Trial (Chrome-only). Ideal for Gmail comm-task classification: on-device, free, offline. Progressive enhancement when stable: try `window.ai` first, fall back to `ai-assist`. Revisit when out of trial (~2026 or later).

---

## Wallpaper Test

> **Rule:** resolve each row — **kept**, **iterated**, or **removed** — at the due date.
> **Pre-registration:** in the week before each verdict, note a one-word observation each time the surface is used or skipped.
>

| Surface | Due | Status |
|---------|-----|--------|
| Monday intention (memory-enriched) | 2026-10-01 | Re-observing — data source fixed (Soon + Trello added); extended after further updates. |
| About contextual CTAs | 2026-10-08 | Re-observing — extended 20 days from 2026-09-18. Do bordered CTAs clarify actions without pulling attention? |
| Connections privacy reassurance | 2026-10-01 | Deferred — Can has all connections active so the surface never triggers; can’t evaluate until a fresh setup. Re-check 2026-10-01. |
| Focus companion question | 2026-10-15 | Re-observing — v2.90.21 highlights the ask button when context signals align; extended to observe the updated CTA. |
| Post-triage reflections | 2026-10-01 | **Iterate (2026-09-14)** — countdown progress bar added (v2.90.12); re-observe. |
| Choice, reorder, and focus motion | 2026-10-15 | Open — do the transitions clarify where state went without becoming noticeable choreography? |
| Shift+Space quick voice capture | 2026-09-29 | Open — does holding the chord remain genuinely faster than typing, and do the brief capture states clarify progress without lingering? |
| HOW DAYS FELT insight | 2026-10-08 | Re-observing — extended 20 days from 2026-09-18 while data populates. A useful commitment relationship or silence, never a feeling-frequency recap? |
| Sunday earned insight | 2026-10-15 | Re-observing — was blocked lately; give more rounds before verdict. |
| Observation pool — morning + Sunday (12c Phase 4) | 2026-10-01 | Re-observing — not sure yet; extend to 2026-10-01. Reactions are the verdict channel. |
| Memory panel KNOWN + SAID (12d Phase A) | 2026-10-01 | Re-observing — reconstruction caveat removed (2026-09-14); outcome counts kept. Re-evaluate by 2026-10-01. |

---

## Decisions & Boundaries

### Open decisions

| Decision | Status | Notes |
|---|---|---|
| **First-run / onboarding** | Open — needs a decision before building | A new user sees an empty list, a poem, and no explanation. Triage is invisible until 8pm. SOON/PAST are hidden until populated. The `✦ ask` companion is discoverable only by chance. **The question:** is this deliberate (philosophy: fastest path to add, calm over instruction) or unbuilt? If deliberate, record it here and close. If not, define the minimum orientation surface — the decision shapes every future AI surface and feature introduction. Do not build onboarding before the decision is written down. |

---

### Not implementing

| Decision | Rationale |
|---|---|
| Full-contrast completed tasks | Rows recede to 25% opacity. WCAG 1.4.3/1.4.11 accepted exceptions; semantics intact. |
| Visible pointer reorder controls | Drag-only; Option+Arrow for keyboards. WCAG 2.2 criterion 2.5.7 accepted exception. |
| Weather-aware nudges | **Rejected 2026-08-17.** Adds external-data dependency + new privacy boundary with no demonstrated need. Do not re-propose. |
| Truncating task text | **Rejected 2026-08-01.** Task text is primary content. Wrapping is correct; do not re-propose clamping. |
| Keyboard shortcuts (desktop) | No demonstrated need — revisit only if a real workflow gap shows up. |
| Widget / Home Screen | Needs WidgetKit / native Android — not reachable from a PWA. |
| Quick capture (without opening app) | No good cross-platform path. iOS has no PWA share target; Siri needs a native app. |
| Microsoft Notes integration | No clear user need. |
| Momentum integration | No public API; ICS is inbound-only. |
| Calendar integration as agenda | Calendar = input only, never displayed. Meeting mode reads it; TODAY is not a planner. |
| Adaptive triage time | **Decided 2026-09-18.** 8pm is the fixed triage gate — no user-configurable time, no adaptive scheduling. The 8pm rhythm works as a day-closing ritual. Do not re-propose. |
| Slack / stream extraction | Wrong trust model; renders others' demands into the calm list. Gmail enrichment (v2.75.1) is readonly and distinct. |
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
