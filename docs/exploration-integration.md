# Exploration — native v3.2.0

The approved session and Memory landing now use native TODAY records. [The v3.2 data, layout and compatibility contract](exploration-data-integration.md) extends the v3.1 file/transport baseline below. The fictional [Memory landing study](../output/memory-landing/index.html) remains design history.

## Start and continue

Open **Explore** above the daily lists or **Continue** or **explore a question** in Memory’s first block. Opening does not create an exploration document or request an exploration reply. Connect Dropbox through existing Connections if necessary. Enter a question and optionally choose a Markdown checkpoint, then explicitly start the document. No repository attachment or personal history is imported automatically.

The canonical destination is `/Life Exploration/living.md` on production, relative to the Dropbox grant. Other hosts follow TODAY's existing environment separation (`/Life Exploration-<environment>/living.md`). All devices on the same environment/account read the same path and stable workspace UUID. There is no device path/workspace identity and no journal in `localStorage`, `appMemory`, task backup, analytics or repository fixtures.

A starting/imported document is preserved in the file. A supported native export keeps its UUID, history and unknown extension fields. An unsupported major schema does not replace the destination. Any existing destination is protected by its downloaded Dropbox revision. The destination is disclosed in the creation flow; clicking Start authorizes that write. Browser file selection authorizes only the chosen import.

Returning reads the canonical file again. The session shows a brief continuation and a directly labelled reply field. Your raw observation is committed before requesting AI; a failed model response leaves that observation available for retry. Current readings are tentative, and corrections are separate immutable amendments. Notes provides source inclusion, the current interpretation/history, an explicitly requested experiment, raw Markdown and privacy controls. Sources have readable IDs and original provenance. Long source lists reveal earlier rows on request.

The first implementation uses the chosen opening document (bounded to its beginning/end) and up to 12 included observations/context records. The original scope does not consume other Memory records. The explicit v3.2 TODAY connection adds a bounded selection of eligible task records and stable Memory interpretations. Feelings, dreams, email, Calendar and therapy stores remain separate. Imported text is quoted data, not privileged model instructions. Neither repeated AI wording nor task execution establishes personal truth or benefit. An imported checkpoint supplies its own framework; the app does not seed the skill package's provisional stages/problems or mark a personal stage complete.

## Entrances and actions

- The daily list and Memory commands remain available to start/open a document.
- A separate nudge action is available after an exploration is opened and a current accepted reading is visible. This is an explicit invitation to consider that AI wording, not a claim of a verified semantic connection. The person chooses whether to include it with their next reply. Existing nudge tap/reaction/dismissal behavior is unchanged; buttons are siblings.
- Notes offers up to six current tasks in existing manual order. Explicit inclusion records a historical task snapshot. Connected task IDs and actions deliberately created from an experiment get their own task entrance, including touch. No keyword match silently creates a link.
- An experiment is requested deliberately and includes question, action, signal, effort, review and stop condition. Only a further explicit action adds/links its task. No completion automatically records benefit, closes a review or changes a personal hypothesis. Existing identical undone task wording is linked rather than duplicated.

The native daily capture input is hidden during this deliberate conversation and restored on leaving. Its Enter/task behavior is preserved. Notes returns to conversation, then back returns to the invoking place. Other header panels/Focus can close the exploration without leaving hidden controls active.

## File format and cross-tool updates

One UTF-8 Markdown file is canonical. A first-line HTML comment contains metadata (`schema_version:2` for new/upgraded documents; schema 1 remains readable, `workspace_id`, revision, updated time, question and optional extension fields). The title repeats the question. The **Starting document** section holds the imported text as quoted Markdown. **Journal** holds records:

```
<!-- today-exploration-entry {"id":"OBS-fiction","kind":"observation","at":"2026-11-03T10:00:00Z"} -->
> Original words, as written.
<!-- /today-exploration-entry -->
```

Record kinds are observation, context, reading, amendment, source and task. Schema 2 additionally permits explicitly declared live-source citations and a shared context permission epoch; the extension contract defines validation and older-client refusal. Readings carry a brief continuation, next question and existing evidence IDs. Separate source IDs track every input used, including the prior interpretation’s dependencies; withdrawal does not rely on the model returning a complete citation list. Amendments/task links reference an existing reading; source events reference an existing observation/context and carry explicit inclusion. IDs are unique. Source/body delimiter text is quoted/escaped so user wording cannot become file structure. Metadata extensions survive parsing/rewriting.

Agents should read the current file/revision, retain the question/title agreement and starting material, append raw records/amendments instead of rewriting them, and preserve unknown fields. Use the same core codec if changing structured records; unrecognized native formats are rejected instead of overwritten. A plain external checkpoint can be chosen as the starting document. Installing the reusable skill alone does not move this personal record. A native export can be used as a manual cross-tool handoff without granting access to the app's Dropbox credentials.

## Writes, conflicts and recovery

The transport uses the existing Dropbox token/refresh grant, unchanged. Initial writes use strict `add`; updates use strict revision `update` with no autorename. Deletion includes `parent_rev`. Thus a stale writer cannot overwrite a newer document or recreate a deleted file. If a write acknowledgement is lost, the app reads back and acknowledges only the exact prepared document; it does not blindly replay. A conflict retains the draft and asks for a fresh read before another deliberate attempt. No automatic merge chooses between competing personal interpretations.

These behaviors follow Dropbox's [upload contract](https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/upload) and [revision-conditional deletion](https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/delete-v-2). One document avoids a partial state/journal multi-file transaction. There is no durable offline journal/queue in this first integration. Updates need a connection. Page-held drafts may be exported; closing/reloading before acknowledgement can lose unsent text. This limitation is disclosed in the document/privacy view. Daily tasks retain their existing offline behavior.

AI work is fenced by session, document revision/workspace, source events, grant, provider/key and explicit cancellation. Withdrawing a source retires the latest dependent reading; re-inclusion cannot revive it. Prior AI interpretations do not become new evidence. The connected model receives no previous feedback store or general profile. No automatic prompt changes, critic, reminders or background exploration generation are added.

## Retention and clear

AI reply history may quote chosen context and remains in the file even when withheld. Own-authored and deliberately included material remains in the canonical document until explicitly removed/forgotten. It is not silently given the reflection domain's 30-day lifetime or added to general Memory. **Clear Memory** aborts pending exploration influence and clears page-held links but leaves the separate Dropbox document intact; the confirmation now names app records and says Dropbox files stay. **Forget exploration** conditionally deletes the document, clears page-held journal/draft/correction state and withdraws connected entrances. Daily tasks remain. Dropbox's account-specific recoverable-version/deleted-file retention may still apply.

## Validation

`scripts/exploration-test.mjs` uses the actual app/components and fictional Dropbox/AI responses. It covers canonical round trips/extensions/delimiters, invalid references/versions, creation, raw-first persistence, amendments, optional actions, revision conflicts, lost acknowledgement, model failures/retry without duplicate observations, delayed-reply withdrawal, re-inclusion, conditional deletion, width containment and exclusion from local storage/general backup. Additional isolated axe/captures exercise the native setup/conversation/notes views. Full functional/payload/visual and performance results are recorded with the local candidate; account/provider quality and installed-device acceptance remain separate. All examples and test credentials are fictional. No real Dropbox document or personal checkpoint was written by agent tools.

Historical v3.1 local verification (3 November 2026): **62/62 functional suites passed, zero flakes/failures, 449.5 seconds**, with unchanged runtime/test/policy fingerprints. All five performance runs pass unchanged limits; startup payload is 1205.9 KiB decoded / 341.2 KiB Brotli / 38 eager scripts. The prior CI-plan failure and interrupted pre-fix runs remain retained separately. The return-to-Memory fix and conservative source-dependency regression are included in this final gate. The separate landing also passes both variants at 320/390/736/1024px, axe, return focus, sparse-state and no-storage/external-request checks. Receipts live under `.context/exploration-integration/` and `.context/memory-landing/`. Can authorized commit/push to dev on 4 November; hosted deployment remains unverified; BUG-135 installed/deployed acceptance and all real-use judgments remain open.
