# Explore continuity — earlier component prototype

**Superseded architecture, November 6:** Can rejected the two-request design. The current [single-request plan](../../../docs/exploration-continuity-plan.md) replaces it. In particular, this mock’s independently surviving personal note after live-context withdrawal is not part of the revised contract. Other fictional journey states remain design history, not runtime implementation or approval.

First deliverable of [the continuity proposal](../../../docs/exploration-continuity-plan.md), requested November 6. This is an isolated, scripted interaction review. **It does not implement the proposed app runtime, two-request writer, schema, Dropbox persistence or source enforcement.** No AI runs and no personal app state is read. The added-request cost remains a decision for review after Can asked about its downsides.

Open `index.html` through a repository-root local static server. The review controls sit outside the product frame. Choose a journey stage, then use the native-style living note, Sources, correction and step controls. “Fill example reply” puts fictional wording in the composer without sending it; Enter advances the scripted thread. Other wording appears literally without a fabricated model answer. Selecting a scene/reloading resets preview-only edits; nothing is saved.

The journey covers first conversation, a first note without a forced possibility, a counterexample, correction, ordinary overnight maintenance, later return, a natural-language request for a small step, an ordinary later reply retaining a chosen step, discussion of an outcome, withdrawal of live task context, and exclusion of personal words. The notes are deliberately authored to demonstrate the proposed behavior; they are not evidence that an AI writer achieves it.

## Existing component and visible differences

`native.css` snapshots both actual `index.html` style blocks; `component.css` snapshots `assets/exploration.css`. Snapshots avoid changes from another agent altering a review mid-check. They are developer artifacts, not loaded/pre-cached by TODAY. `surface.html`/`surface.js` use the actual Explore sheet/head/scroll/foot, composer, quiet Memory buttons, note sections, bounds and sub-navigation classes. Only fictional daily-list/review scaffolding has separate styling. Native dock/drawer/full-screen breakpoints, colors, type, spacing, density, chevron, 44px composer and edit affordances stay intact. No new product CSS hierarchy, columns, marks, palette, counters, badges or navigation are proposed.

Visible content/behavior changes:

- **Your account** becomes a short accumulated synthesis rather than the latest three messages. “AI summary of your words” distinguishes it from a quotation. **A possibility** appears only with a supported interpretation; **Still open** holds one meaningful question. These retain the existing section treatment.
- A later return leads with that account, then the existing composer question. Routine app housekeeping creates no status interruption. Source details stay behind **sources**.
- A withdrawn live task removes its dependent contextual reading, while the independently supported personal note stays. Withdrawing personal words removes the dependent note and step; re-inclusion does not revive them. These are scripted states, not a new privacy implementation.
- A natural request can reach the existing **Something to try** view. A suggestion can be kept, changed or left; a kept step remains reachable after an ordinary reply. Task copying is deliberate, and completion is not evidence of benefit.

## Cost choice still under review

The proposed live design adds a separately bounded personal synthesis request when the conversation also uses TODAY context. That means up to two provider requests per explicit turn within the shared 25-second deadline. It increases token cost, can produce different emphases between reply and note, and can leave a reply saved while the note update fails. It also requires more coordination and privacy testing. It does not guarantee better writing. No between-visit calls are proposed. This mock enables none of it.

## Verification

Receipts and fictional screenshots live in `.context/explore-continuity/`. Browser checks pass for every scene at 320/390/736/1024/1440px, keyboard/focus restoration, axe, plain-text corrections, selected-step continuity, withdrawal/re-inclusion behavior, Forget, no persistence/API traffic and unchanged prototype hashes during the run. An initial wrapper assertion raced an asynchronous preview message; the corrected check waits for the entered example. These checks exercise the prototype only; app/CAS/provenance/writing/release acceptance remain later implementation work.

The existing design-review requirement includes Claude critique. The configured Claude CLI was given the actual component, native shell, token/design rules and decisions in a read-only request; it returned a monthly spend-limit error. Input and failure are preserved in `.context/explore-continuity/claude-input.txt` and `claude-review.txt`. No critique, model-quality result or review approval is claimed. Codex inspected the actual desktop/phone renders. Claude review and Can's experience/cost choice remain pending; no account, provider or routing was changed to work around the limit.
