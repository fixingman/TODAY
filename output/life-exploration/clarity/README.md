# Explore clarity comparison

Status: accepted design study, 4 November 2026. Its experience-first conversation and focused-page flow are integrated into the production module in local v3.3.0; this separate study remains fictional. Open `index.html` through the local preview server. **Load example** starts a scripted fictional exchange; **Before** shows captured native Notes markup from before this clarity pass for comparison. Other text is never analysed. No storage, provider, Dropbox or API calls occur.

## What this tests

Can found the entry, sheet conventions, typography and submenus confusing, and could not see how Explore should help. Claude reviewed the current components and shared tokens. The useful design test is whether someone can bring an experience or uncertainty, see a tentative connection with inspectable support, and return to a readable note without managing a framework.

## Native fixes in the same local iteration

- The task-list entrance is ✦︎ Explore. Its unsupported arrow and the question in the 10px counter slot are removed; the question remains in Memory and the session.
- Normal daily capture and triage remain visible in both Memory and Explore. Focus and keyboard submission remain owned by their original inputs. No touch-only hiding exception is added.
- Exploration prose and source values use the task-size token (13.5px). Recap prose uses primary text. Navigation, disclosure controls and provenance use the existing 12px token; speaker provenance is sentence case. True section labels remain compact uppercase labels.

The first-use and focused-view flow below is also implemented in native code; this study remains a standalone comparison.

## Proposed flow

1. **Conversation:** start with something that happened or feels unresolved. One explicit Send is the starting action; no separate question-naming step or stage picker. AI drafts a tentative synthesis and one useful next question. The example is illustrative, not generated analysis.
2. **Living note:** readable account, tentative understanding and what remains open. Correction sits beside the interpretation. Earlier conversation is a separate reading intention. A possible experiment is optional.
3. **Sources:** one purpose per page. See what supported a reply and leave a source out. Re-inclusion never revives an old interpretation. Native implementation preserves the existing source/revision/account fences.
4. **Something to try:** show the action and bounds as readable rows, with an additional deliberate Add to Today. The selected action is added to the preview list; exact identical wording is reused rather than duplicated. Completion establishes no benefit.
5. **Document:** raw Markdown, export and privacy are deliberate destinations. They do not interrupt the conversation or masquerade as its main content. Daily capture remains the normal bottom input throughout.

The existing panel, palette, fonts and neutral button anatomy are retained. `native.css` copies current root tokens and shared neutral-button/capture/section-label rules. `before.css` and `baseline.js` preserve the actual pre-redesign native Notes presentation using fictional records. Same viewport, same palette and topic; the proposal changes hierarchy, control roles and navigation rather than inventing a second design system.

## AI and Life skill boundary

The reusable Life skill guides capable assistants; it is not an execution engine installed in TODAY. The native app currently supplies a fixed prompt, selected notes/current context and a prior reading. A private checkpoint must be deliberately made available before its content can inform a reply. The proposed interaction translates the skill's principles into the app: start from experience, AI holds the structure, interpretations stay tentative, one useful question at a time, and understanding or patience can be the outcome. It does not seed reconstructed stages or personal problems, promise background monitoring, or import other chats.

The user-approved experience-first creation and focused page navigation are now integrated into the production module in local v3.3.0. Editable question naming remains separate; native titles derive only from the first line of supplied words. This prototype supplies one scripted exchange and preserves additional user turns without inventing further replies. It is not a journal codec or sync adapter; no persistence, live writing quality or cross-tool continuity is claimed.

## Review and verification

Claude's initial component-based review is retained outside source in `.context/exploration-clarity/claude-review.txt`. It identified counter-style misuse, two independent capture-hiding rules, tiny prose and mixed reading/source/admin intentions. The proposal adopts its clearer page structure, while preserving capture across Memory too and using existing 12px neutral controls for navigation.

Four-width checks exercise start, conversation, note, sources, privacy, raw record, optional step, correction, Forget and baseline at 320/390/736/1024px. They cover axe, horizontal containment, capture visibility, source withdrawal/re-inclusion, independent task capture, plain text, no API/storage calls and no page errors. Screenshots and receipts live under `.context/exploration-clarity/`. Viewport and screenshot review do not establish real-device keyboard behavior or usefulness.


Claude also reviewed the rendered 390/1024px before/after comparison. It found the proposal easier to read and the use story concrete, then identified follow-up replacement, inconsistent correction text and a task action that only changed status. The final study appends further user turns, uses the same interpretation text in conversation/note/correction, resets dependent example state, actually adds the chosen step, and retains labelled user wording after withdrawal. Those cases pass the expanded four-width interaction checks. The full review remains in `.context/exploration-clarity/claude-prototype-review.txt`.
