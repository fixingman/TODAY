# Exploration — isolated design study

Status: interaction proposal, 3 November 2026. This directory contains fictional records and scripted replies. No personal checkpoint content is copied here. It is separate from TODAY's runtime, service worker, accounts, AI requests, and personal storage.

Open `index.html` directly, or serve the repository and visit `/output/life-exploration/`. Fonts are local. The study starts on a fictional daily screen. To try it:

1. Press **play example** in the study bar. It opens the exploration and puts scripted text in the reply box. You can also open it yourself first with **Explore** above your tasks.
2. The session shows the question, **Where we left off**, the next question and the reply box. Press **reply →**.
3. Your words and TODAY's scripted reading appear. The next question moves into the reply box label. Under the reading, **what changed →** opens **notes & sources**. That view holds the current reading, its correction and history, what changed, the included sources, **Something to try** (only on request), the **Markdown record**, and **privacy & forget**. **← conversation** goes back.
4. The back action names where you came from (**← today**, **← morning line**, **← your tasks**, **← all memory**). Reopen to see the updated recap; earlier exchanges collapse into **earlier in this conversation**.

The other entrances are unchanged: **explore this →** under the linked morning line, a linked task's **explore** (hover/focus on desktop, visible on touch), and TODAY → Memory → **explore →**. Restart or reload clears all entered text. **play example**, **current/proposal** and the nudge/list scene controls are study controls, not proposed app navigation.

## Design question

Can a person resume a meaningful exploration, contribute naturally, and inspect how their understanding changes, with little maintenance effort?

## Proposed interaction

*History: the session layout described here has been superseded by "Session information hierarchy" at the end of this file. The entrances and fences below still apply.*

- A visible **Explore** row above the daily list, a relevant nudge's separate action, a linked task's explicit action and Memory's quiet **explore** action all open the same ongoing exploration. The invoking place is named and restored on return. The current Memory sections keep their order, typography, row spacing and content treatment.
- The opening offers a question, brief recap, unresolved thread and optional source disclosure. No mandatory stage selection, daily score or experiment setup.
- A dedicated text composer supports back-and-forth inside the exploration. This deliberately proposes a new interaction; current TODAY does not provide it. The main task input keeps its task-only behavior.
- The scripted exchange shows one raw observation, an explicitly uncertain interpretation and one question. **What changed** explains the document update and offers correction. The living record preserves the original interpretation and amendments.
- Source controls demonstrate leaving out an input. A synthesis dependent on omitted evidence is withheld; raw observations/amendments remain in the private record. Re-including a source does not revive a stale reply. Per-claim references preserve the open timing/activity-size explanations.
- A suggested experiment stays optional and has a question, effort bound, review point and stop condition. **Add to Today** changes only the fictional preview list. Neither adding nor completing an action establishes benefit.
- Ordinary typed text is shown and held in page memory only. The study does not pretend to analyze it. There is no microphone or live model in this study.
- **Leave here** returns to Memory without an exchange quota. **Document and privacy** explains proposed separate-document clearing and simulates forgetting the exploration, with daily actions retained.

## Existing component baseline and visible differences

`baseline.css` snapshots the actual font faces, root tokens, shell and Memory selectors from `index.html`. No production scripts are imported. The current variant uses fictional KNOWN, PATTERNS, LATELY, HOW DAYS FELT, coverage and DREAMS sections; it is not a screenshot of anyone's account.

Deliberate differences:

1. Memory's title receives a right-aligned **explore** action with the existing `memory-item-btn` treatment. The existing section hierarchy is retained below it.
2. Opening exploration replaces the panel body with a bounded conversation; **← memory** restores the existing sections. No new header icon, dashboard or persistent banner is proposed.
3. A 16px question and a dedicated composer are added only inside exploration. Mobile inputs use at least 16px; native keyboard/multiline editing remain available. Buttons have visible keyboard focus.
4. Source and change disclosures use native details. The proposed Markdown view exposes the record without requiring the person to edit a framework.
5. Study chrome identifies fiction, scripted behavior and lack of saving. The daily list below the panel is a contextual placeholder. Neither is proposed production content.

## Review

Judge whether the recap helps resume, the exchange produces a useful distinction, and the record is understandable and correctable. These are product questions; successful browser checks cannot establish personal benefit. The study demonstrates one finite scripted exchange, not live retrieval, model quality, real Dropbox writes, offline sync or multi-device continuity.

The implementation/design boundary, selective context and proposed Dropbox contract are in [the design note](../../docs/life-exploration-design.md).

### Review and checks — 3 November 2026

Claude reviewed the supplied actual component rules, design documents and fictional study source. This was source critique, not screenshot review or design approval. Revisions preserve open explanations and per-claim support, label user corrections separately, permit source omission, withhold dependent/stale synthesis, distinguish the composer from task capture, provide a voluntary session exit and explain separate-document forgetting. Its proposed compulsory one-exchange session limit was not adopted: fluid conversation remains the requirement, with an explicit way to leave.

Local Chrome verification passed at 320/390/736/1024px: source/response withholding, correction history, session-only return, inspectable record, optional task with unresolved learning, forget without deleting the task, safe plain-text entry, reload clearing, mobile input size, reduced-motion layout and axe checks in the exercised states. Native Memory typography, colors and row-style metrics match production CSS on the same fictional markup. Captures were inspected at desktop/phone widths. No page errors, unexpected network requests, account/API calls or browser-storage writes were observed. The evidence receipt and captures are under `.context/life-exploration/`; the private-free Claude source critique is `.context/life-exploration-claude-review.txt`.

These checks cover the isolated study. They do not verify actual AI relevance, natural-use usefulness, real Dropbox persistence/conflicts, a physical phone keyboard, or installed-PWA behavior. Production files and app versions are unchanged; no full application release gate was needed for this study.

### Claude design pass — 3 November 2026

Scope: `index.html`, `study.css`, `study.js` and this README only. `baseline.css` and the Memory list markup are unchanged. Inputs were the four earlier captures under `.context/life-exploration/` and the current source. The captures predate this pass. Nothing was rendered or tested after editing, so browser verification is still owed.

Aim: the session should read like one more Memory sub-view, with less visible administration. Changes:

1. **Way back in the title row.** The separate `← memory` / `living record` row is gone. The title-row slot shows **explore →** in Memory and **← all memory** in a session (`#memoryReturn`, same `memory-item-btn`). Title-row actions now sit flush with the content edge.
2. **Memory block rhythm.** Question, conversation and composer use the `memory-type-block` pattern (content, then `--space-4` and a hairline). The boxed hairlines around both disclosures are removed.
3. **Text-button disclosures.** `what this draws on`, `what changed` and `explore an experiment` remain native `details`. Their summaries now look like Memory's text actions (`--text-xs`, 0.06em, transparent border, `--border` on hover/focus, 24px minimum). The ▶ marker is hidden.
4. **Sources as Memory rows.** Each source is a `.memory-item` with its text and an action at the end of the row. IDs remain visible but muted because "what changed" cites them per claim. **Accessibility change:** the toggle no longer uses `aria-pressed`. Before, the button read "leave out, pressed" while the source was included. Now the button names the next action and the row says "· left out" in real text. Test selectors that relied on `aria-pressed` need updating.
5. **Separate treatment for the person's wording.** Your turns use a 2px `--border` left rule. The scripted reading and its question use `--text-task`, and preview notes are muted. This follows the documented Dream sheet split (reading leads, retelling has a left rule); those values come from the Components.md description, not from CSS I read. The uncertain interpretation has its own label (**Interpretation · unconfirmed**). After a correction it reads **Your wording · earlier version kept in the record**.
6. **Composer split.** Product controls share one row: **leave here** on the left, **continue →** on the right. Study scaffolding (hint and **try example**) sits below a *dashed* rule. Dashed marks study-only content; solid hairlines remain product structure. The textarea's fixed 100px minimum is removed, so `rows="3"` sets its height.
7. **Footer like Memory's.** **living record** and **document & privacy** use `.memory-conn-link` in a `.memory-footer`. Privacy is now a button disclosure (`aria-expanded`, focus moves to its heading). **forget exploration** hovers to `--danger`. Confirming moves focus to **keep it**, and cancelling returns focus to the forget button.
8. **Record and focus.** The Markdown preview now sits in an inset document (`--bg`, `--border`, `--radius-md`). Focus targets get `scroll-margin-top`, so the sticky header no longer covers headings it scrolls to. The record capture showed that covering.
9. **Motion.** A one-shot `revealDown` (`--motion-drop`, `--dur-slow`, `--ease-out`) plays when the session, record, privacy panel or a new turn appears. It is removed under reduced motion. The keyframe follows Motion.md's description; I did not read production CSS for it.

Tokens: no new colours, sizes or durations. The remaining literals are `2px` padding and the 0.06em/0.12em tracking, both copied from baseline `memory-item-btn`/`memory-type-name`, and the existing 32px primary/study-control height. `scroll-margin-top` is `calc(var(--space-20) + var(--space-8))`, an estimate of the header height.

Unchanged: IDs and `data-action` hooks (added: `privacy`, `#memoryReturn`, `#privacyView`, `#privacyToggle`, `#forgetStart`, `#forgetCancel`, `#hypothesisLabel`), source-withdrawal fences, no revival of stale synthesis, correction history, task added only on explicit choice, forget confirmation, no persistence or network, and no analysis of arbitrary text.

Still to check in the browser: 320/390px wrapping of the title row and the study note, axe on the new privacy disclosure and the source rows, whether the dashed study rule reads as intended, and whether hiding the summary markers costs discoverability.

### Entrance comparison — 3 November 2026

Can's follow-up: **explore →** inside Memory is too hidden. This pass compares entrances from the daily screen. It is a candidate for review, not a design approval, and it leaves production unchanged. Scope: `index.html`, `study.css`, `study.js` and this README. `baseline.css` is unchanged. A separate `entry-baseline.css` could not be created in this pass, so the native daily-list rules Can supplied (`.section-header`, `.section-label`, `.section-count`, `.task`, `.task-check`, `.task-body`, `.task-text`, `.morning-nudge*`, `.morning-nudge-react*`) are copied verbatim, with a few comments trimmed, into a fenced block at the top of `study.css`. Overrides come after that block. As before, nothing was rendered or tested after editing.

**Layout of the screen.** The page now opens on a fictional Today screen with Memory closed. In the study, **TODAY** opens and closes the Memory panel (`aria-expanded`). This is a stand-in, not a proposal for the logo. Below are the morning strip, **Your tasks** with three fictional rows, and the new **Exploring** row. All routes open the same exploration in the Memory panel, and the visual pass is unchanged.

**Routes and what is visibly different**

| Route | Appearance | Proposed trigger conditions |
|---|---|---|
| 1. Daily list: **EXPLORING · what makes room for sketching? →** | A `section-header`-shaped button below the task sections (in production, after Past). Uppercase label plus the question in the muted section-count voice. No count, badge or motion. It does not pin, since a single row needs no sticky label. | An exploration exists and has not been forgotten. Nothing else. It looks the same with a full list, an empty list (**list: empty**), with or without a nudge, and on phones. It never gets louder when the list is short: an empty list is not evidence of free time or readiness. |
| 2. Nudge sibling: **this task is context in an exploration · explore this →** | A muted line tucked under the strip, outside the button. The strip keeps its own tap: the first tap shows reactions, the next dismisses for the day. Reactions are a show/hide demo with nothing stored. | The line names a task that is a **verified source** of the exploration (a stored source ID, not text matching), and that task is still on today's list and not done. **nudge: word overlap** shows "sketchbook" in the line with no sibling: shared wording is not enough. Completing "Sketch by the window" withdraws the sibling. No nudge → no sibling; route 1 still works. |
| 3. Task action: **explore** at a row's end | Revealed on hover or keyboard focus on pointer devices, like the row's delete ×. Always visible, muted, on touch screens. It is a separate button that doesn't change row tap, Enter/Space or Focus, and doesn't require Focus mode (which is desktop-only). | Only rows that are verified sources. That covers "Sketch by the window" (TASK-01) and an experiment task created by **add to Today**. Unlinked rows, including "Order sketchbook refills", get nothing. The study never generates a problem per task. |
| 4. Memory: **explore →** | Unchanged. | As before. Hidden after forgetting, together with the daily routes (a deliberate change: it used to reopen the forgotten state). |

**Source and breadcrumb.** The eyebrow names the route ("Exploration · from your list / this morning's line / a task"). The title-row back action names the place you return to (**← today**, **← morning line**, **← your tasks**, **← all memory**). Leaving puts the panel back the way it was before entry: it closes again if it was closed. Focus goes back to the control that opened the exploration. If that control has gone (the nudge was dismissed, the row was completed, the list emptied), focus falls back to the Exploring row, then to TODAY.

**What an entrance offers to bring.** Above the composer:
- **From the nudge:** this morning's line, marked *not brought*, with **bring as context / don't bring**. It joins the living record as `REF-NN` under *Context references* only if the person chose it **and** then pressed continue. The record labels it as TODAY's wording, not an observation or endorsement, and not analyzed. Leaving without continuing discards it. Nothing is sent or analyzed, and the personal journal is not touched.
- **From a task:** says the task is already context (TASK-01) or was added from this exploration. It brings nothing new and says nothing about how the task felt.
- **Not recorded:** opening an exploration. Which route was used is not logged in the record.

**Why this combination.** Route 1 is the only always-present entrance, which answers Can's "too hidden" directly. It works without a nudge, on phones and without Focus, and its weight matches every other section label. Routes 2 and 3 are contextual and rare by construction because they need a verified link, which is Wallpaper Test escape 1. They appear at the moment the linked task is in front of the person. All three appear together on one screen because, in this example, they don't crowd it: one row label, one muted line and one hover-revealed word. The scene controls let a reviewer switch the nudge or list off to see each route on its own.

**Critique: what this candidate may get wrong**
- **Route 1 may become wallpaper.** It shows every day, with fixed wording and the same takeaway, so by day 14 the eye may slide over it. That is acceptable for navigation, but it is the first thing to watch. An alternative is to show it only while the exploration has an open thread, accepting that it is less findable.
- **Uppercase "EXPLORING" reads like a list section.** It may suggest the exploration is part of the day's work, close to the "productivity ledger" Philosophy.md rules out. A sentence-case muted line could be quieter but would be less native.
- **The nudge sibling adds height to the strip on relevant mornings.** It also sits close to the reaction area. Putting it inside the reaction strip would be quieter but hidden behind a tap, which is the original complaint.
- **Touch rows show "explore" constantly** on linked tasks. With many linked tasks this becomes clutter. Real use would need a cap or a different touch reveal.
- **Unlinked tasks have no "bring to exploration".** This is deliberate to avoid per-row clutter. Bringing an arbitrary task from inside the exploration remains an open question.
- **Many conditions are faked.** The verified link is hard-coded, and real trigger evaluation (source IDs, current eligibility, sync) is not implemented. The nudge interaction is simplified: the real strip's reveal motion, star breathing, noon cutoff and synced dismissal are absent. Section headers pin under the study header because `--sec-sticky-top` is not measured here. `.empty` styling is approximate (no native rule supplied).

Unchanged from earlier passes: source withdrawal fences, no revival of stale synthesis, correction history, optional experiment, forget/clear, the raw record, and no storage, network or API use. New hooks: `data-action` `panel`, `open-from` (`data-origin` list/nudge/task), `bring`, `nudge`, `react`, `check`, `scene-nudge`, `scene-list`. New IDs: `#memoryPanel`, `#memoryToggle`, `#explorationEyebrow`, `#entryContext*`, `#dayNudge`, `#dayNudgeReact`, `#nudgeExplore`, `#taskLinked`, `#listEntry`, `#exploreSection`. `#dailyPreview` is removed: **add to Today** now appends a real row to `#manualList`. `data-action="memory"` still means "leave", now origin-aware.

Still to check in the browser: 320/390px wrapping of the nudge sibling and the Exploring row ellipsis; touch vs hover reveal of the row action; focus return from each route, including after dismissing, completing and emptying the list; axe on the strip's hidden hint text and the reaction group; and whether the three routes together feel calm or busy.

### Verified revision after Claude's design passes

The two Claude passes inspected the fictional screenshots, refined the isolated session's design, then authored the daily/nudge/task entrance comparison. Their design rationale and critiques above are retained as history, not approval.

Codex made one further entrance refinement after inspecting the phone capture: the daily row moves **above** the tasks, says **Explore**, and gives the question the existing 12px token with wrapping. The action label uses the existing primary text color. This addresses discoverability with long lists; it adds no badge, new palette or automatic opening. The original below-list placement and ellipsis described in Claude's section are superseded by this revision.

The final source passed isolated Chrome checks at 320/390/736/1024px: all routes, return focus, nudge reactions/dismissal, no invitation from word overlap, empty-list/no-nudge access, a 25-row list, optional context committed only on Continue, raw wording versus AI references, corrections/history, optional task with unknown benefit, privacy/forget, safe text, mobile input size, axe and no persistence/API/production requests. A separate true no-hover/touch check covers task and nudge entry, source removal after a generated scripted reply, no stale-synthesis revival on re-inclusion, and fallback focus after completing the origin task. Current Memory typography/color/row metrics still match native production CSS on the same fictional markup. Source hashes were stable through the main verification. Desktop/phone captures were inspected.

Receipts/captures: `.context/life-exploration-design/`. Claude's authored summaries: `.context/life-exploration-claude-design.txt` and `.context/life-exploration-claude-entry-design.txt`. This verifies the prototype interactions and rendering, not live AI relevance, real Dropbox continuity, physical iPhone/WebKit behavior, or personal usefulness. No production runtime, app version, provider/routing configuration, personal journal, commit or deployment was changed.

### Session information hierarchy — Claude, 3 November 2026

Can's verdict: the entrances and how they link work well. The UI and micro-UX under Memory were hard to grasp, and the order and information layout were confusing. This pass changes only the exploration session inside Memory. The four entrances, their source/context/return behaviour, and the Memory overview (KNOWN, PATTERNS, LATELY, HOW DAYS FELT, WHAT TODAY HAS SEEN, DREAMS) are unchanged. Scope: `index.html`, `study.css`, `study.js` and this README. `baseline.css` is untouched. Nothing was rendered or tested after editing. This is source reasoning plus the four earlier captures, not a verified result.

**Diagnosis.** In the captures, about twelve things competed with nearly the same low weight: the Memory title, an Exploration eyebrow with the route, the question, a recap of several possibilities, "Next thread", sources, the context block, the transcript, a generic "Add to this exploration" composer, continue/leave, study scaffolding, and the record/privacy footer. After a reply, more stacked up inside the reply itself: the question repeated, "what changed", the interpretation, a correction form and an experiment. The person saw the machinery before they saw how to carry on.

**New order.** The conversation view shows one thing at each level:

| Level | First open | After a reply |
|---|---|---|
| Header | **← today** (names where you return) · **notes & sources** | same |
| Title | the question | the question |
| Context | **Where we left off**: one short recap | the current exchange: your words, then TODAY's reading with one link, **what changed →** |
| Ask | the next question, as the reply box's label | the reading's next question, now the label |
| Answer | reply box, **reply →**, optional compact entrance context | same |

Everything you might inspect is in **notes & sources**, a sub-view that replaces the conversation. Its back action is **← conversation**: one back at a time, never two backs on screen.

**What moved or went, and why**

1. **Competing titles.** In a session the "✦ Memory" title is hidden and the panel is labelled by the question (`aria-labelledby` switches to `#explorationTitle`, now an `h2`). The origin eyebrow (`#explorationEyebrow`) is removed because the back action already names the origin. Why: one title and one way back.
2. **The question's place.** The next question used to appear three times: "Next thread", inside the reply, and implied by a generic composer label. It now appears once, as the `<label>` of the reply box (`#nextThread`). The answer field sits directly under what is asked, and assistive technology reads the question as the field's name.
3. **Recap vs. exchange.** **Where we left off** (`#resume`) shows only while nothing has been said in this visit. Once you reply, the exchange takes its place, so background doesn't stay as a preamble above every new reply. On each reopen, earlier exchanges fold into a closed native **earlier in this conversation** disclosure, and the updated recap leads. There is no turn limit; you can keep replying.
4. **Inspection in one place.** These were all removed from the conversation: the *what this draws on* disclosure, *what changed*, the labelled interpretation, the correction form, *explore an experiment*, the living-record toggle and the privacy toggle. They now live in **notes & sources**, built from Memory's own block anatomy:
   - **Current reading**: labelled *TODAY · unconfirmed* or *Your wording · replaces the earlier reading*. **correct this** sits right there, with cancel. After a correction, a muted line says it doesn't confirm the evidence, and earlier versions are listed underneath.
   - **What changed**: per-claim evidence (NOTE-01/02/03).
   - **What it draws on**: the include/leave-out source rows, plus words and brought references added in this conversation, each labelled as yours or TODAY's.
   - **Something to try — only if you ask**: hidden behind **suggest something**, shown only beside a current reading. **add to Today** is unchanged.
   - Footer: **Markdown record** (the raw document, now described as "the same notes as one portable document") and **privacy & forget**.

   The reading's one link, *Added to notes, unconfirmed · what changed →*, shows how the conversation relates to the notes.
5. **Human note first, raw second.** The notes view renders from the same state as the Markdown (`renderNotes()` runs alongside `record()`). Markdown is a deliberate deeper step.
6. **Delete moved away from reply.** Forget confirmation and focus behave exactly as before, but they live two steps away, under notes → privacy & forget. The conversation view no longer has a footer.
7. **Leave here removed.** It duplicated the header back action. The composer row now holds a quiet *kept as you write it* and **reply →** (renamed from *continue →*, because it answers the question above). ⌘/Ctrl+Enter still sends.
8. **Study scaffolding out of the product flow.** The dashed study note and **try example** are gone from the session. A single **play example** in the study bar opens the exploration if needed and fills the reply box. The person still presses reply. `#previewHint` moved to the study bar and stays the textarea's description. Arbitrary text is still kept unanalysed with a preview note.
9. **Entrance context.** It is now a compact inset under the reply box, sharing the box's background, because it travels with the reply. The labels are shorter: *bring along* / *don't bring*; *joins when you reply*; *TODAY's wording, not yours or agreed with*. The rules are unchanged: opening writes nothing, a nudge line joins only if it is chosen **and** a reply is sent, and leaving clears what's pending.

**Fences kept.** Leaving out a source removes every rendered reading (`.turn-reply` in current and earlier exchanges) and hides the current reading, what changed and something-to-try in notes. Including it again announces that the earlier reading stays withheld; nothing is revived. Earlier versions are shown only beside a current reading, while the raw amendment history always stays in the Markdown. A task action never records a benefit. Session-only behaviour, plain-text safety, and no network or storage are unchanged.

**Selector changes for checks.** Removed: `#explorationEyebrow`, `.question-block`, `.source-note`, `.study-note`, `.exploration-footer`, `.turn-question`, the in-session `data-action="memory"` *leave here*, and the in-session `data-action="example"`. Now static in notes (they were generated in the reply before): `#hypothesisLabel`, `#hypothesisText`, `#correction`, `#correctionText`, `[data-action="correct"]` (`#correctStart`), `[data-action="task"]` (`#taskAdd`). Changed meaning: `#nextThread` is now the reply box's `<label>` with the bare question; `#explorationTitle` is an `h2`; `[data-action="record"][aria-controls]` is `#recordToggle` ("Markdown record"); `#privacyToggle` reads "privacy & forget"; `data-action="memory"` (`#memoryReturn`) steps back from notes before leaving. Added: `#notesToggle` (`data-action="notes"`, `aria-expanded`/`aria-controls`), `#sessionView`, `#notesView`, `#notesTitle`, `#resume`, `#currentTurns`, `#earlierTurns`/`#earlierList`, `#readingBlock`, `#correctionNote`, `#amendmentList`, `#changesBlock`/`#changesTitle`/`#changesText`, `#addedSources`, `#tryBlock`/`#tryAsk`/`#tryView`/`#tryText`/`#tryUnavailable`, `#forgottenNote`, and actions `changes`, `try`, `amend-cancel`. `example` is now in the study bar.

**Tokens and motion.** No new colours, sizes or durations. The reveal is the existing one-shot `revealDown`, now also on `#sessionView`, `#notesView` and `#tryView`. It is skipped for folded earlier turns and removed under reduced motion. New buttons use `memory-item-btn` / `memory-conn-link` (24px minimum). Phone inputs stay at 16px.

**Honest limits and open questions**
- **Not rendered.** Wrapping at 320/390px, `:has()` on the composer hairline, focus order after each back action, and axe on the new `h2`/`h3`/`h4` structure all need checking.
- **Two steps to inspect.** "What changed" and correction are one tap further away than before. **what changed →** under each reading is meant to offset this. If people don't find correction, a direct **correct this** on the reading would be the next thing to try.
- **"notes & sources" is a guess.** Alternatives are "notes" or "what's kept". It should be judged on whether a first-time reader expects corrections and privacy to be there.
- **Folding on reopen.** This hides the transcript from the previous visit behind a disclosure. That suits resuming, but someone mid-thought who leaves briefly may want the last exchange still showing.
- **Composer label after withdrawal.** The label becomes a sentence about a changed source plus a question. That is honest but long, and wording should be reviewed.
- **Heading levels** are h1 (logo button) → h2 (question) → h3 (turns/notes) → h4 (notes blocks). Turn headings as h3 may be noisy for screen-reader heading navigation.

### Session revision verification

Can confirmed the confusing part was the exploration session after opening, while liking the entrances and their links. The existing Memory overview and daily entrances are retained. Claude's hierarchy revision is implemented in this isolated study; its design/usefulness verdict remains open for review.

Small follow-up refinements: the study hint is shorter, the reply row has a single action without a save-like hint, and incoming nudge context uses **include in reply / leave out**. Already-linked task context uses ordinary wording; its internal ID stays in notes. Forget now also clears generated hidden note/history content, the correction input and the recap, not just the visible conversation and raw document.

The final source passed desktop and 320/390/736px layout/axe checks, plus a separate true no-hover/touch run. Coverage includes the direct question-to-reply order, current exchange versus resumption, notes replacing conversation, two-level back/focus restoration, each liked entrance, explicit context inclusion, correction/cancel/amendment history, per-claim uncertainty, voluntary experiment/task, source withdrawal from both current and folded earlier replies, no revival on re-inclusion, plain-text safety, deletion of entered wording from hidden views/inputs, and keeping daily tasks after forgetting. Example text is not recorded until Reply. No browser-storage writes, API/production requests or page errors were observed; source hashes stayed stable through verification.

Receipts and inspected desktop/phone captures: `.context/life-exploration-layout/`. Claude's source/design summary: `.context/life-exploration-claude-layout-design.txt`. These are prototype checks, not live AI, Dropbox, physical iPhone/WebKit or natural-use acceptance. Personal records remain outside reusable source; no production runtime/version or deployment changed.

### Integration approval

Can approved this revised session for integration and asked for a separate challenge to the Memory landing. Local v3.1.0 implements the approved flow with a real canonical Dropbox document and configured-AI requests; [integration contract](../../docs/exploration-integration.md). This isolated study remains fictional and disconnected. The [Memory landing comparison](../memory-landing/index.html) remains a separate proposal and is not applied to the native landing.
