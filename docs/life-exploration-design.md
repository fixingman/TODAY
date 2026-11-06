# Life Exploration in TODAY — first design study

Status: the session shipped to dev as v3.1.0; Can approved integrating the Memory landing and real TODAY data on 4 November. The native v3.2 implementation is specified in [the data integration contract](exploration-data-integration.md). The studies remain fictional design history. [Runtime/file contract](exploration-integration.md). The first study is [output/life-exploration/index.html](../output/life-exploration/index.html). It contains only fictional examples. No personal record, stage assignment, candidate endorsement, observation or checkpoint is stored in this document.

## Problem and success signal

Help a person return to meaningful exploration, use relevant evidence to understand or choose something, and keep the ongoing record light enough to revisit. The assistant handles synthesis, documentation and continuity; the person owns meaning and decisions.

Three product tracks share this question: continuity between sessions; relevant connections among existing records and lived experience; optional learning through action. The study tests their interaction using one ongoing thread. They are product options, not replacement life stages or lenses.

## Approved interaction

Use a clear **Explore** row above the daily list, with further routes from an opened daily-reading feedback tray and Memory’s first block. Task connections stay inside Explore. All routes open the same ongoing exploration with a short recap and current open question. Opening identifies and offers any optional context; it makes no new observation or endorsement. Return restores the invoking place. A separate composer allows natural conversation within the exploration. Preserve the task input's existing task-only Enter behavior, the approved Memory hierarchy and ordinary day-boundary AI surfaces.

**Latest design verdict:** Can approved the revised session for integration after the Claude layout pass. The session leads with a short resumption and one clear place to reply, gives the current exchange priority after a response, and groups record/source/change inspection in Notes & sources. Can separately requested a challenge to the Memory overview; [that alternative](../output/memory-landing/index.html) compares the existing storage-oriented sections with an open-question-first hierarchy. Can subsequently approved this alternative for native integration with real data; the study itself stays fictional.

The assistant updates one inspectable living Markdown document as observations and corrections arrive. Raw observations retain their wording and provenance in an append-only evidence/amendment section; AI edits are bounded to interpretation and current-summary sections. Validate the proposed write against retained raw records before committing. Interpretations, endorsement, uncertainty and counterevidence remain explicit, with per-claim source links. The current session revision leads with one question/title, a brief resumption and a directly labelled reply field. A reply replaces the recap in the main flow. **Notes & sources** opens a secondary view for current interpretation, correction/history, changes, included evidence, an explicitly requested experiment, and deeper Markdown/privacy controls. A reading's **what changed** action links into those notes. This makes updates inspectable without requiring approval of every administrative edit. Meaningful ambiguity is surfaced; explicit personal corrections are not silently resolved by recency. Corrections do not inherit unverified AI citations.

At the next opening, read the current acknowledged document revision and show where the discussion actually stopped. Returning does not create a review obligation, automatic AI request, schedule, new experiment or stage transition. Loading/resuming, adding an observation and generating a reply are separate operations. A person can **leave here** after any exchange, retaining the recap/open thread; no compulsory exchange quota is proposed.

The first study's outcome signal is a person's judgment that a connection or distinction helped them understand something, make a choice, or deliberately leave a question open. Corrections count as useful learning when they improve the record. Return counts, transcript length, task completion and UI fluency alone do not establish value. Before shipping, apply the existing W1/W2 gates and record the W3 review at 14 days; no reminder is scheduled by this document. An unwanted or burdensome surface is revised or removed rather than made more persistent.

### Making the conversation bidirectional

TODAY's current surfaces largely offer bounded readings and optional reactions. A sustained exploration needs new user-authored observations and replies. A text composer inside this deliberate context supplies that interaction. The proposed conversation is bounded by the ongoing exploration; provider configuration alone does not open a general chat surface. Voice capture is a possible later input after text usefulness is demonstrated, with separate transcription/preview handling.

## Entrance design — expanded study request

The initial quiet action inside Memory was too hidden. Two Claude design passes now refine the session and compare daily-list, nudge and task entrances. These are alternate routes to the same ongoing exploration, not new personal frameworks. The current tested candidate places the stable action above the tasks so it remains findable on long lists; contextual routes are additional deliberate openings.

- **Stable daily entrance:** visible text near the existing task-list header, reachable on desktop and touch without a nudge, a badge or an automatic open.
- **Nudge entrance:** `explore` sits beside landed/not really in the revealed nudge reaction tray and About’s Today reading actions. The exact clicked AI wording is offered as optional context, initially excluded. Opening neither votes nor generates nor appends a journal entry. No permanent action is placed below the strip.
- **Task references:** tasks support the exploration through reviewable TODAY context and linked experiments inside Explore. Daily/focused task rows do not gain another inline action.
- **Memory entrance:** a further way to return and inspect the record.

Opening should identify the route/context, and returning should restore the invoking place and focus. A contextual invitation appears only when it has a reason; the stable entrance covers deliberate visits. A sparse or empty list does not establish emotional readiness, available time or attention.

The first study and separate landing comparison remain isolated fictional artifacts. The integrated session preserves the existing Memory hierarchy, nudge writer/feedback contracts and task ordering. Its bounded source choices and explicit configured-model request are specified in the runtime contract; it adds no background generation or general profile.

## Foundation and future evidence connections

Existing component/runtime ownership, AI request mechanisms, inspectable Memory, source/clear fences, feedback conventions and Dropbox account access are useful foundations. The integration adds the explicit session and revision-conditional document updates. Broad automatic evidence retrieval and semantic multiwriter merging remain future design work.

Selection should start with the current question and supported sources, rather than require the person to know the whole storage inventory. The app proposes relevant records with short reasons and inspectable references; the person can omit or correct them. Distinguish availability, permission, relevance and interpretation. A source being stored in TODAY does not by itself authorize cross-surface model use.

| Source | Proposed contribution | Boundary |
|---|---|---|
| Current living exploration | Question, latest understanding, corrections, unresolved threads | Read an acknowledged revision; preserve evidence and unknowns |
| Tasks and supported outcomes | Concrete commitments, returns and recorded actions | Activity does not establish motivation, emotional value, or free time |
| Existing Memory patterns | Candidate relationships to examine | Preserve provenance/status; repeated AI prose is not independent evidence |
| New user observations | Experiences and meaning the app cannot observe | Retain original words; optional links; no required ratings |
| Feeling records or dreams | Selected material relevant to a defined question | Separate explained inclusion, current retention/deletion/consent; no automatic import or retention extension |
| Earlier AI reactions | Existing scoped writer/selection guidance | Keep current surface boundaries; no general profile or raw-vote ingestion |
| Gmail, Calendar or therapy material | No first-study input | Existing grants and caches do not establish exploration access |

The implemented bounded context projection uses the chosen opening Markdown and up to twelve included observations/context snapshots; the broader source table is future direction, not enabled collection. Before widening it, define and test a new bounded context projection. Record source IDs, provenance, current eligibility and material actually included. Missing evidence remains unknown. A withdrawn or expired source must stop influencing pending and future replies. If a selected interpretation was retained from now-missing evidence, show that limitation rather than fabricate refreshed support. Existing personal fields must not be sent to a new prompt by reusing a broad `_memoryForAI()` export.

## Proposed personal storage contract

Dropbox is the canonical personal destination across devices. A device path is only a transport/cache location, never workspace identity. Source code holds reusable instructions, templates and fictional fixtures.

The integration uses one living Markdown document, including its journal, at `/Life Exploration/living.md` on production (environment-suffixed elsewhere), relative to the Dropbox grant. The document contains a stable workspace UUID. The creation screen discloses the destination before an explicit Start action. Check the account/scope first: the app must not assume agents or other clients can access an app-folder-scoped file merely because TODAY can. A portable export/handoff remains available when direct shared access is absent.

Agent tools have not created a personal document or imported a checkpoint. Production and preview environments must not share records implicitly. Deliberate access to the same personal workspace from another client is an explicit choice, distinct from automatic development-environment discovery.

Proposed document metadata includes stable workspace UUID, schema version, document revision, timezone, updated time and evidence IDs. The human-readable document is authoritative. If a structured state is later necessary, derive it from the same committed document or define an explicit transaction/repair contract before adding another independently editable copy. Reading or installing a skill does not migrate personal history.

Persist raw observations and amendments durably before acknowledging them. Use Dropbox revision-conditional replacement and reread after conflict; preserve both alternatives for interpretation conflicts. The implemented transport performs conditional writes and preserves drafts on conflict; it does not merge competing interpretations automatically. Ordinary cloud-file syncing does not provide safe concurrent semantic merging. Browser working copies and any unsent queue must be visibly pending until Dropbox acknowledges the write; a temporary offline copy must not become a competing canonical record.

Proposed clear/retention behavior: own-authored exploration observations remain until explicitly deleted, subject to the person's chosen destination policy. Clearing Memory removes its app-side exploration links/derived influence but leaves the separate document intact, disclosed before confirmation. **Forget exploration** deliberately removes the document and clears app-side working copies, pending writes and influence; existing daily tasks remain. The study shows this distinction and simulates forgetting its page-held document. Implementation must define anti-replay markers, recovery and Dropbox version/deletion retention limitations before claiming deletion across replicas/backups. Do not inherit 30-day reflection retention or copy sensitive sources into a permanent journal implicitly. Do not put the exploration document into the general task backup or `appMemory`.

Cross-tool agents must honor the same stable IDs, revision checks and correction history. The installed skill's provisional framework/schema does not faithfully encode the recovered four-stage framework; do not seed or migrate that provisional personal state. The integration preserves a deliberately chosen checkpoint as opening text; it does not assign a stage or endorse candidate problems. Agents modifying native exports must follow the runtime codec/revision contract. The personal checkpoint remains outside reusable source files.

## Small experiment → optional task

An experiment has a question, expected signal, effort limit, review point and stop condition. The person may choose to add its action to Today. The exploration keeps any association privately; no task metadata field is invented in this study. Task completion provides execution context only. Review can lead to action, patience, understanding, adaptation or stopping. Noncompletion and missing observations do not establish failure or avoidance.

## Validation and remaining judgments

The approved session is implemented locally; its canonical file, explicit inputs, revision protection, recovery, clear/Forget and tests are described in [the integration contract](exploration-integration.md). There is no durable offline journal queue in this first version; the privacy view discloses the need for a connection and offers draft export.

The historical Memory landing prototype offers current/proposed and full/sparse comparisons. Its hierarchy is now integrated using native records. It prioritizes the person's question, separates counted facts from unconfirmed AI readings, groups feeling/dream records and moves coverage into a disclosure. The native sparse state adds a discoverable starting action. No fictional record is imported into the app.

Local functional/layout/accessibility checks establish implementation behavior. Real configured-provider writing quality, account/installed-device behavior, and whether returning feels worthwhile remain separate judgments. W1/W2 and the deployment-dependent W3 review are recorded in Backlog. Ordinary use can establish whether to keep, revise or remove the recurring surface; novelty and task completion do not establish benefit.

No machine provider/routing/model/Headroom setting, reminder, commit or deployment was changed by this work.
