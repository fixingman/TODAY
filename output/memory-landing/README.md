# Memory landing — alternative proposal (isolated study)

Status: fictional design study, 3 November 2026; approved for native integration on 4 November. [Native v3.2 contract](../../docs/exploration-data-integration.md). The study below records the original review boundary. Claude authored it at Can's request to challenge the Memory overview *before* entering an exploration. The native implementation now uses actual TODAY records; this isolated study remains disconnected. Its review text describes the original proposal, not the current runtime status.

Everything here is fictional: records, readings, dreams and the scripted exchange. There are no app/API calls or browser storage; only local static files and fonts are requested. Restart (or reload) clears everything.

Open `index.html` directly, or serve the repository and visit `/output/memory-landing/`. The page opens on the **proposed** Memory landing with Memory already open.

## How to compare

Study bar (study chrome, not product navigation):

- **landing · current / proposal**: both render from the *same* record set.
- **records · full / sparse**: two fictional fixtures. *Full* is about three months of use with an exploration. *Sparse* is a new person nine days in, with no exploration, no readings, reflections not kept and no dreams.
- **nudge / list**: the daily-screen scene controls, unchanged from the approved exploration study.
- **play example**, **restart**: unchanged.

Dismiss, not me, show waiting, manage, feedback and clear all act on the shared records, so a change made in one landing shows in the other.

## The problem with the current landing

The current overview is a catalogue sorted by storage type: KNOWN, PATTERNS, LATELY, HOW DAYS FELT, WHAT TODAY HAS SEEN, DREAMS. Every block has the same weight. Someone who opens Memory to return to something meaningful or to understand something has to read six sections to answer three questions:

1. *What is still open with me?* The answer is split across KNOWN and the title-row **explore →**, which Can already found too hidden.
2. *What does TODAY think holds, and how sure is it?* Counted facts and AI readings are mixed in PATTERNS. Unconfirmed weekly AI readings sit in LATELY next to plain counts. Only the presence of a **not me** button tells you which rows are TODAY's interpretation.
3. *What is private, and does it leak?* Feelings and dreams sit in the middle and at the end of the same list as task counts, with nothing saying they stay separate.

Coverage numbers (WHAT TODAY HAS SEEN, and most of LATELY) take up a full block each. A count restates what is visible, and showing it as a peer of the readings invites reading it as a measure of the person.

## Proposed hierarchy

| Order | Block | Holds | Need it serves |
|---|---|---|---|
| 1 | **STILL OPEN** — your question, then what keeps returning | The exploration (question, latest recap, what it draws on, **continue →**), then the on-record returning tasks, open obligations, and Soon items under **show waiting (N)** | Return. The most personal and actionable thing leads, and it is the person's own question, not TODAY's claim. |
| 2 | **WHAT HOLDS** — counted facts first, then TODAY's readings | Computed timing/outcome facts, then confirmed stable AI readings, then this week's AI readings | Understand, with provenance on every row. |
| 3 | **KEPT APART** — private records, never mixed in | The HOW DAYS FELT reading or its consent state, and the dream index with "comes back" and manage | Privacy you can see: sensitive domains are grouped and fenced, and their controls stay put. |
| — | **what it has to go on** (closed disclosure) | Noticing since, lifetime totals, focus hours, the 30-day tally, and the former LATELY counts | Coverage as supporting context, "not a measure of you". |
| — | Footer | clear all memory · Connections → | Unchanged position. |

The order runs from what you came back for, to what TODAY makes of it, to what it keeps aside, to how much it has to go on. TODAY's readings deliberately do not lead: the trust model is "AI proposes, person confirms", so the first thing shown is the person's own question and plain records.

### How exploration fits

The exploration is a **row** inside STILL OPEN, not a new section, banner or dashboard. It sits above the task records it draws on, with no extra chrome. It shows:

- source line `exploring · your question`
- the question at task size, the one larger line on the landing
- the session's own recap (`#recap`), so after a reply or correction the landing shows the updated "where we left off"
- `draws on your notes and one task · no feelings or dreams`
- **continue →** (text colour, `aria-describedby` the question)

**continue →** opens the approved session unchanged. Its back action reads **← all memory** and returns focus to **continue →**. The linked returning task is labelled `· in your question`. That label comes from the stored source link (TASK-01), not from text matching. No journal step, prompt or "start exploring" invitation is added. If no exploration exists (sparse, or after forgetting), the row is absent and STILL OPEN shows only the records.

Memory doesn't become a task manager. Task rows still offer only **dismiss**, which removes the record from Memory, not the task. There is no check, reorder or schedule action.

## Every visible difference (proposal vs current), and why

1. **Six blocks become three blocks plus one disclosure.** This gives a reading order instead of a storage order. See the table above.
2. **Title-row `explore →` is removed in the proposal.** The exploration becomes the first row of STILL OPEN with **continue →**. Can found the title-row action too hidden, and the question belongs with what is still open. The current variant keeps the approved title-row entrance so the comparison isolates the landing.
3. **A source line on every row** reuses the approved notes' `.source-id`: `returning · on record`, `obligation · on record`, `in Soon · on record`, `counted from your tasks`, `TODAY's reading · recurred in 3 weeks, not confirmed by you`, `TODAY's reading · this week only`, `how days felt · TODAY's reading of evenings you reflected`, `dreams · your retellings`. This makes task facts, AI hypotheses, your own words and sensitive domains distinguishable without relying on which button a row has. The current inline prefix (`returning · …`) moves into this line.
4. **AI readings move together and come after the counted facts.** Weekly (episodic) readings leave LATELY and join WHAT HOLDS as `this week only`. Confirmed stable readings say they recurred in N weeks and were *not confirmed by you*. In the app, confirmation is automatic after three weeks of support, so recurrence is evidence coverage, not personal truth. **not me** is unchanged.
5. **LATELY counts and WHAT TODAY HAS SEEN go into the closed `what it has to go on` disclosure**, with "How much TODAY has seen. Not a measure of you." These are counts the person can already see. Coverage belongs in supporting context.
6. **HOW DAYS FELT and DREAMS are grouped under KEPT APART**, with the note "These stay in their own reading spaces. They are not added to your exploration automatically." This makes the existing separation visible and states that nothing is imported into an exploration automatically. The feeling block's consent state (`TODAY doesn't keep reflections.` + **remember reflections**), its feedback disclosure (shortened to **feedback** because the source line already names the domain) and dream **manage** are unchanged in behaviour.
7. **Block names are `h3`** (visually identical to `.memory-type-name`), so screen-reader heading navigation reaches each block. The current variant keeps its `span`s, as in production.
8. **Clear-all confirmation says what it actually erases.** The proposal reads *erase Memory's records?* and, when an exploration exists, adds *Your question stays. Forget it from its notes.* The current variant keeps *erase everything?*, which becomes inaccurate once an exploration lives in its own document. That is a finding for the integrated app as well.
9. **Focus after removal.** In the proposal, dismiss and not me move focus to the block heading. In the current variant focus goes to the Memory title, because the clicked row is gone.

Unchanged: the type, colour and spacing tokens; the `memory-type-block` / `memory-item` / `memory-item-btn` / `memory-conn-link` anatomy; the hover/focus reveal of dismiss and not me; header-placed disclosures; per-visit collapse; the reduced-motion-aware `revealDown` for newly revealed rows only; footer order; and the approved exploration session, notes, source fences, context consent, optional experiment/task, forget and origin-aware return.

No new colours, sizes, durations or chart/score elements were added. The one new emphasis is the question at `--text-task` and **continue →** in `--text`, the same treatment the approved list entrance uses.

## Fixture limits

- The full and sparse fixtures are hand-written to the shapes `memory-panel.js` produces, without running its thresholds. Example: the "1 in 4 let-go tasks comes back" line assumes a ≥10 cohort exists. They contain no insight beyond what those shapes allow. The sparse fixture has no readings because the app would have none, and nothing was invented to fill the gap.
- Sparse has no exploration. "Records with an exploration but little else" is reachable by forgetting the exploration on *full* (inverse case) or by clear all on *full* (exploration kept, records erased).
- Clear all mirrors `_memoryClearConfirm`: first-seen, lifetime totals and focus minutes remain. The global clear withdraws reflection remembering, matching the existing reflection clear contract.
- Illustrative only (they announce instead of acting): **remember reflections**, **Connections →**, and dream read/delete under **manage**. Feeling **landed / not really** shows pressed state but stores nothing.
- On touch, dismiss and not me are always visible in this study. The app reveals them on a row tap.
- The isNew dot, PATTERNS show-all over six rows (not reached by the fixture), and the feeling-feedback footer fallback are not exercised.

## Unresolved product choices

1. **Starting without a thread.** The sparse proposal has no exploration row and no replacement start action. A real landing would need a discoverable starting entrance before replacing the current title action. Clear Memory keeps the separate Dropbox document; the integrated confirmation now makes that boundary explicit.
2. **Multiple explorations.** One thread row fits. Several would need a cap or ordering rule, and the risk is STILL OPEN becoming a project list.
3. **"STILL OPEN" may read as obligation.** Alternatives: "OPEN", "RETURNING". It must not imply the person owes TODAY progress.
4. **Coverage closed by default** hides the "how much it has to go on" caveat from people who never open it. The source lines carry some of that weight, but is that enough?
5. **Wallpaper risk.** The thread row appears on every Memory visit. Its recap changes only when the conversation does. Watch whether it becomes skipped furniture.
6. **Should the linked-task label link?** `· in your question` is plain text. Making it open the exploration would duplicate **continue →**.

## What was inspected and edited

Inspected: this directory's `index.html`, `study.css`, `study.js` and `baseline.css` (read only); the supplied `assets/memory-panel.js`, Design.md, Components.md, Philosophy.md, Personalization.md and the approved exploration README (provided in the request); and the four fictional screenshots `.context/life-exploration-design/after-desktop-memory.png`, `.context/life-exploration-design/touch-day.png`, `.context/life-exploration-layout/touch-resume-final.png` and `.context/life-exploration-layout/touch-reply-final.png`.

Edited: `index.html` (study bar regrouped with landing/records controls, static six-block markup replaced by a render container and footer, title focusable, footnote), `study.js` (fixtures, shared visit state, current and proposed renderers, landing actions, opens on proposal, entrances follow exploration existence in both landings), and `study.css` (landing styles appended before the notes section). Created this README. `baseline.css` and everything outside this directory are unchanged.

Codex verification after the Claude pass: both landings share the same fictional records; continuing returns to the landing; source lines and question wrap at 320/390/736/1024px; axe reports no violations; sparse invents no readings; clearing app records retains the exploration. Browser storage remains empty and no API is called. Screenshots and the check receipt are in `.context/memory-landing/`. This verifies the isolated interactions, not product usefulness or installed-device behavior.
