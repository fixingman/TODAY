# AI Companion System

> AI assistant architecture, context, actions, and personality.

---

## Overview

**Improvement lifecycle:** [cross-surface contract and status inventory](../../docs/ai-improvement-cycle.md). All surfaces share feedback meanings, result ownership and next-use/invalidation rules; adapters keep separate factual inputs and privacy domains. This document describes runtime behavior; the linked delivery sequence explicitly marks unimplemented Focus, enrichment and feeling-style work. Claude’s review narrows the first candidates to same-session prior-reply handling and exact-card ownership/control; neither is claimed to learn taste. The assumed private feeling-style projection is not established; source-readiness BUG-123 is a recorded unfixed safety issue.

Reachable AI surfaces: the post-add inline task suggestion, the focus companion question, the daily (morning) nudge, About's Sunday reflection and Memory's feeling relationship, meeting/voice extraction, DreamBank readings and extraction, and Gmail/web task enrichment. Code selects what is true; the model phrases it (see Observation Pool). Prompts state principles, never worked examples.

Deterministic policy lives in DOM-free modules with direct unit tests: `assets/suggestion-policy.js` (suggestion reasons, exploration, underperformance), `assets/noticed-model.js` (solar-term and milestone selection), `assets/week-reflection-policy.js` (observation pool and guards). `assistant.js`, `insights.js`, `nudge.js`, `about.js`, `focus.js` and `dreambank.js` own UI, storage, outcome recording and provider calls.

**Providers:** Claude (Sonnet, `claude-sonnet-5`) or Gemini 2.5 Flash, chosen in Connections. This build defaults to Claude (`AI_BUILD_PROVIDER = 'claude'` in `connections.js`); public forks default to Gemini (`AI_DEFAULT_PROVIDER`). Audio (meeting mode, voice notes, dream detection) always uses Gemini — the only provider with native audio input.

**Proxy:** `/.netlify/functions/ai-assist` for text; `meeting-extract` and `transcribe` for audio. Valid JSON replies come back top-level, anything else wrapped as `{content}` — callers that expect JSON must accept both.

**Removed surfaces:** the ✦ AI sheet (input-bar trigger removed v2.49.0, controller/markup deleted v2.83.1), its chat thread, and the ✦ empty-tap Daily Brief (v2.41.0). The TODAY logo opens Memory; no replacement chat exists. Design record: `archive/Architecture.md` → Retired ✦ AI sheet.

**Daily-nudge reasoning (v2.93.23):** both morning tracks send the exact `surface: 'daily-nudge'` marker. The proxy enables Claude Sonnet 5 adaptive thinking only for this marker, with a fixed 2048-token ceiling for thinking plus the answer (other Claude callers keep thinking disabled and 512 tokens; Gemini is unchanged). Client-supplied model/thinking/token overrides are not forwarded. The final line still has its existing 30-word and grounding guards. Only text blocks are returned; thinking/redacted blocks never reach the client or memory. A `max_tokens` stop returns content-free HTTP 502 rather than accepting a partial line, using bounded transient recovery. The 5s display race and 12s request timeout remain; live reasoning latency and usefulness must be re-observed, not inferred from mocked tests. The September 27 disable was a workaround accompanying the now-correct text-block parser, not a measured daily-nudge quality decision. No prompt, selection, provider/model or machine routing change. Delivery/dismissal recovery is a separate fix below. Reference: [Anthropic thinking support and token-limit troubleshooting](https://platform.claude.com/docs/en/build-with-claude/thinking-troubleshooting).

---

## Memory → HOW DAYS FELT relationship (v2.95.1)

**Feedback/evaluation (v2.98.0):** [implementation plan](../../docs/feedback-learning-plan.md). HOW DAYS FELT has explained first-vote consent, exact-reading reactions, Undo/block-or-footer review, source-bound reuse and separate sensitive sync/deletion. A miss withholds the claim until at least one newly reflected evening in each group supports an independently qualifying result; date rollover, paraphrase and editing an old evening do not count. Natural expiry erases source values/wording and retains only bounded user withholding. Historical feeling wording never becomes model feedback. v2.98.1 activates the narrow ordinary-nudge loop: at the next natural generation, project up to two landed and two missed prior ordinary readings from fourteen local calendar days, keeping the existing writer instructions. This is the tested positive-only arm; the combined instruction-change candidate is not promoted. The earlier pickup showed supported use once; the broader comparison does not establish a general quality improvement. Existing votes/revisions/clears update this bounded context automatically after initial sync; never regenerate an accepted line because its vote changes. No private reasons, pool/Sunday votes or feeling history enter it. The optional helper loads alongside the bounded Calendar read and falls back to legacy misses-only context after error or 300ms. Backlog #15 records the release decision and evidence. The development evaluator stays out of the runtime; offline tests do not establish live semantic accuracy. The reviewed plan assigns #15A ordinary nudges, #15B feelings, #15C pool/Sunday, #15D Focus, #15E enrichment, #15F existing suggestion outcomes and #15G shared contracts/checks. Wording-policy changes cannot evade a rejected claim; adapter failures must preserve consent and withholding, including hiding feeling prose when those checks are unavailable.

`assets/reflections.js` chooses one aggregate from opted-in, retained reflected evenings joined to same-date outcomes on-device. The writer gets only the chosen feeling, both action contexts and group counts. Local writing policy `reflected-days-v2` starts “In your evening reflections,” says the user marked that feeling more often, and compares explicit “on days” action contexts in one complete sentence of at most 40 words. It distinguishes daytime actions from the evening report; it does not measure an immediate emotional response. Legacy valid text/contexts stay usable under the same stable claim identity, so copy updates cannot reset withholding. Bringing a task back from Past replaces opaque “reviving” wording; task-focused comparisons name recorded focus rather than claiming a whole focused day. The output guard rejects incomplete, overlong, causal, multi-feeling or swapped comparisons; rejected replies leave the opted-in section hidden, without stats.

The transient canonical evidence key includes local day/window, consent choice/version, deletion watermark, valid retained reflections and relevant same-date outcomes (outcome, obligation, focus sessions, backfill). It excludes unrelated outcomes and storage order. Each snapshot gets at most one attempt per session. Changes invalidate queued/pending work; epoch and current-source checks fence replies after newer requests, deletion or withdrawal. Local changes, sync, rollover and foreground return reconcile. A valid relationship may reuse its wording. With feedback consent, bounded displayed readings and private support-date/digest metadata now persist in the separate feedback store; raw source values are not copied there. Neither source identity nor rows enter AI input. Provider/auth stays unchanged; the two additive backup fields follow existing v5.5 conventions.

---

**Approved optional wording loop (October 27, local v2.100.0):** an explicit `hard to follow` or `too formal` choice on an exact reading supplies one code-owned instruction on the next naturally eligible feeling generation. Whole-insight votes supply no wording cause. Earlier prose, source metadata and general profiles remain private; no extra model call. Null/Undo, independent per-reading revisions, source expiry/deletion and global feedback clear remove future influence. Accepted wording stays stable; a pending guided answer is fenced after guidance changes. The person/feeling phrase has wording freedom inside the existing factual population/action/comparison guards. Lazy `reflection-wording.js` owns optional controls; `feedback-policy` owns pure validation, merge and projection. Normal use/real writing must establish usefulness; mocked tests do not establish a style win.

## Focus Companion (`_focusAskAI`)

A desktop-only, explicitly requested line inside the existing focus timer bar. Task Ask clarifies a consequential unknown before proposing work; otherwise it may offer one supported step or acknowledge an already-sufficient action/wait. Gmail Draft reply and web-link shortcuts retain their separate paths. No general chat, answer field, new collection or background generation.

### Task input (v2.97.10)

The factual input is only `Task: <JSON-quoted task text>`. v2.101.0 may append the same task’s bounded, exact-source/session prior replies and explicit whole-reply ratings as untrusted presentation history (see below). Session/age/return counts, person-wide let-go reasons, drag-word matches, clock/peak-hour/daily-session context, other tasks and confirmed Memory inferences are excluded. They cannot establish the task's actual stage or reason for waiting. The request does not use `_memoryForAI()`. Ask keeps neutral muted availability; history no longer highlights it.

### Session-only next-use feedback (v2.101.0 / 15D)

`focus.js` retains request/owner/timer control; lazy `focus-ask.js` owns both unchanged base prompts, bounded reply context and exact-answer reactions. The reviewed component keeps Ask turning into an answer; feedback sits at its right end and opens one independent action row. Landed adds no extra row. Clicking the answer dismisses all rows and restores counter/progress without casting a vote. Undo/revision/clear affect the exact shown reply only and never trigger generation. Accessibility descriptions explain that influence ends with the current Focus session.

At the next explicit Ask only, send up to three accepted replies (800 characters each) with current whole-reply landed/not-landed ratings, scoped to exact owner type/id, displayed name/raw source, date/habit day and AI configuration. Unrated replies are neutral; sparse/conflicting ratings establish no preference. Prior model wording/ratings are untrusted presentation history, never extra facts/instructions or evidence of a reason, style preference or task completion. This is a bounded usefulness/repetition loop, not persistent personal writing adaptation. No feelings, nudge votes, other tasks or other habits enter it. Request count and 25s deadline are unchanged; lazy load is inside that deadline. Missing helper/invalid sources fail without generating or inventing context.

Source edits, withdrawal, sync deletion, completion, day/config changes, session exit/switch/restart and reload erase this influence; late responses and old reaction controls cannot restore it. Existing private spoken-line recording remains separate. No feedback record is persisted, synced or backed up, and rollback drops all new guidance immediately. A technically closed loop does not establish live writing improvement; installed usefulness remains to be reviewed.

### Task response (principles, no examples or taxonomy)

Ask only if a specific unknown materially changes the next action; do not manufacture an uncertainty. The question is the whole reply for the person to settle, not a promise of a subsequent chat turn. A concrete step is appropriate only when supported without choosing an unknown intention or stage of work. Preserve named choices and deliberate waits; no destructive operation, substituted outcome, manufactured obligation, urgency or missed-promise claim. If the action or wait is already sufficient, acknowledge only that task rather than declaring the person has nothing else to do. No generic useful-progress, priority, first-step or 25-minute finish-line question. Age, sessions and returns do not establish avoidance, an unmade decision or unrecorded work never happening.

One question, action or acknowledgement under 20 words. Runtime accepts only nonempty, single-line prose below 20 whitespace-delimited words, without exclamation marks; a question must have exactly one terminal question mark. Invalid replies and transport/HTTP/timeout failures stop loading without recording or an automatic retry. For the still-current task, the same button says “No reply to show. Try again.”; one tap requests again. Stale/renamed/exited/config-changed owners reset quietly and cannot paint a failure onto another request. Habit failure behavior stays quiet. These are format checks, not semantic grounding or usefulness certification. Accepted text keeps the historical private `spokenLines` “focus question” type even when it is a step/acknowledgement; no schema change.

The October 24 comparison used 72 fictional outputs on the existing local Claude CLI, not the deployed model: current 3 useful, narrower question 16 useful, action-first 14 useful + 5 appropriate acknowledgements. Action-first also chose unsupported deletion/statement constraints and never asked a question. The revised clarification-first combined prompt is a new iteration, not the measured winner. `Backlog.md` owns real-use re-observation; repetition remains a real-use quality check; the later session-only association does not certify novelty or useful wording. UI/state: `architecture/Focus.md` → Companion Help.

### Habit-specific request (v2.97.0; release approved October 17)

The same explicit Ask action resolves an active habit by its existing ID and uses its authoritative name, excluding session badges. The factual input is only `Habit: <JSON-quoted name>`; v2.101.0 may append that exact habit’s same-session replies/ratings as untrusted presentation history; no completion/history/check times, other tasks, confirmed Memory, clock or Calendar context. Existing configured provider/key and AI route are unchanged. A habit is not treated as a new 25-minute task or as overdue.

The separate principles-only prompt asks for a useful, concrete choice grounded in the named action/object: the person's own preference or a practical arrangement, not a menu of supplied alternatives or an inventory of materials. Use natural language about what would suit them; do not assume enthusiasm. Respect the named intention without corrective emphasis. A routine or setting can matter, but cue planning is not the compulsory shape. No invented routines, difficulties, motives, availability, behavior or completion claims; no reporting/saving an answer. The name is untrusted data, not instructions. Output must be one question under 20 words; empty, malformed, multiline, multiple-question and exclamatory replies reset quietly. These syntactic checks do not certify grounding or usefulness; configured-AI wording review and real-use judgment remain separate gates.

Requests for both task help and habit questions belong to the current focus interaction. Dismiss/close aborts and invalidates them; late headers/body/errors cannot paint or record into another request. Habit delivery rechecks name, active status, completion and the 3am habit-day; both paths recheck the configured AI connection. Accepted prose uses the existing private `spokenLines` focus-question record, not a saved cue/answer or a new analytics store. No daily writer, pool, Sunday or mobile-focus expansion.

---

## Web/Trello task enrichment — 15E (v2.99.0 local)

`assets/task-enrich.js` owns the existing task-add/focus lookup, local card and arrow; `netlify/functions/task-enrich.js` keeps the same Haiku/web/Trello tools, prompts, request limits and routing. No feedback enters the model. Code now binds cache v3 to a retained manual owner ID/exact text across Today/Soon/Past, query policy and connected source board. Valid cards remain usable offline; credentials are transient fences for pending calls, not stored card data. Legacy unbound caches refresh once on the next eligible use. Source accuracy/relevance still require their own judgment.

A pending request rechecks owner/text, connection credentials/board, cache adoption and request identity after headers and body. Replacement requests supersede old work without allowing old finally cleanup to remove new ownership. The 26-second client abort adds no retry; transient, malformed or exhausted server responses are 502, while an explicit valid no-result remains cacheable. Focus delivery belongs to a separate current view; exit/switch invalidates it even if the task-level request legitimately finishes caching. Zone persistence coalesces cache cleanup after the synchronous move, while list re-render and cross-tab storage changes reconcile visible context. Intermediate source saves cannot erase a retained owner’s hide. Unchanged card/state keeps its existing DOM and immediate Undo label; the list renderer restores a focused timer control after reattachment. Hidden state is authoritative; the redundant pre-release hiddenAt timestamp is no longer collected, and older metadata cannot lift a hide.

**Permitted feedback projection:** none. **Not useful** withholds only the exact displayed card in its current local cache entry; immediate **undo** or later **show context** clears the hide. No record/wording transfer, model call, telemetry, preference inference or completion/click satisfaction signal. True owner deletion, task-text/source/policy change or 30-day expiry removes the cache/hide; moving an unchanged task between Today/Soon/Past retains it. Only Today generates context or shows its arrow; bounds are 60 entries / 200,000 UTF-8 bytes. Cards/withholding are excluded from backup/sync; full data rules are in Data/Sync. Hidden cards have no source CTA, arrow or timer shortcut; Ask returns to its normal action. Existing component geometry/tokens and native keyboard behavior are preserved.

**Release card:** owner #15E / #11; factual input remains only the current task plus already-connected Trello source; no new collection or consent surface. The hidden state also uses `state: hidden`, so the previous client’s success-only renderer withholds it during rollback rather than redisplaying a rejected card. Rollback retains stored cache data; it cannot provide the new restore controls or source guards. The complete 3.0.0 learning/style roadmap remains unfinished. W3 is due fourteen days after actual release, not after a test run. Gmail ownership repair is a separate local v2.99.1 slice below; email feedback controls and cross-task adaptation remain unimplemented.

---

## Gmail ownership — 15E / BUG-128 (v2.99.1 local)

Existing `gmail_classify_*` and `gmail_enrichment_*` caches require the retained manual owner’s exact current text, `ownerPolicy: owner-v2` and `connectionKey`: a locally computed origin-scoped SHA-256 refresh-grant digest. The marker is sensitive credential-derived provenance, not an account address or learned preference; never send it to AI/diagnostics or backup. Raw credentials are not copied into caches. Access-token renewal preserves this grant; changed refresh grants invalidate old caches even after reload. Reconnect clears caches, Forget clears credentials/caches and invalidates pending auth/lookup/draft work. Late token responses cannot restore a forgotten connection. Legacy unbound caches refresh once on eligible use. Selected context expires after 24h in list and focus; classifier retention stays owner/policy/grant-bound.

The real Today owner must exist, match the exact task text and remain undone before requests and delivery. Per-task work coalesces and rechecks grant, AI configuration, both adopted caches and request identity through classification, list/thread bodies and ranking. The whole chain has a 26s deadline without a new retry policy. Focus-origin lookups and drafts have separate visit identity; exit/switch cancels them synchronously. An already-running capture-origin lookup may finish for its unchanged task but cannot paint a departed view. Draft bodies, delayed labels, repeated Copy and Mail actions remain attached to the exact current view/cache/configuration; Copy does not generate again. Same-owner refresh preserves current card/draft DOM. Zone cleanup runs after complete moves, retaining unchanged Today/Soon/Past owners while removing true deletion/edit influence. Storage updates reconcile source/caches and indicators; cache-arrival events do not prune owners against an older tab’s task snapshot. Owner pruning waits for completed local persistence, while mismatched grants are still removed. Normal token refresh does not withdraw context.

Gmail query fallback, MiniSearch relevance/ambiguity, calendar sender exclusion, booking without drafts, Apple Mail links, model/system prompts, read-only consent and explicit draft action stay unchanged. No new scopes, API account lookup, feedback store, mailbox ingestion or autonomous sending. Rollback to an older client requires discarding the local classification/selected-email prefixes because older code ignores these ownership fields. Functional fixtures establish ownership/freshness, not mail usefulness; BUG-117 and real-account checks remain distinct.

---

## Day-End Review (v2.14.4)

Not an AI call — a rule-based acknowledgment in `triage.js` once all decisions are made. Syne headline at 28px (rendered with a trailing full stop: `headline + '.'`), one adaptive sub-line, no triage breakdown (the person just made those decisions).

| Condition | Headline |
|---|---|
| 8+ done | "Big day" |
| 5+ done | "Solid day" |
| 3+ done + 50m+ focus | "Deep work today" |
| 3+ done | "Good day" |
| 1-2 done | "You showed up" |
| Only habits | "Habits held" |
| Default | "All sorted" |

**Sub-line** (adaptive, max 2 parts, `--text-sm2` muted):
- Shows `done count` if any tasks completed
- Shows `focus time` if 25m+ focused
- Shows `habits` only if no tasks done
- Shows `day N` streak if room and streak ≥ 3
- Empty if nothing to show

Displays for 3s then auto-closes. Saves `today_day_review` to localStorage for morning reflection.

---

## Morning Reflection (v2.13.1) + AI Morning Nudge (v2.17.73)

Morning nudge strip (before noon) shows yesterday's review if available. Falls back to simple carried-over count. Auto-clears after noon. Tap to dismiss.

**AI line** (`_fetchDayNudgeAI`) is cached as `day_nudge_ai_<date>`. Since v2.93.22, transient delivery failures allow bounded retries; accepted/rejected prose is not repeatedly regenerated to seek a passing answer.

**Two tracks since v2.80.0.** `_fetchDayNudgeAI` first calls `_fetchPoolNudge()` (Observation Pool, below). If a candidate survives the gate, the model receives *evidence + the code-owned supported insight only* — the facts table below is never sent, because selection and interpretation already happened in code. Otherwise the task-reading path below runs unchanged. Both outputs pass `_observationTextIsGrounded(text, 30)`; a rejected line falls back to the rule-based strip rather than showing a claim about who the user is. The shown line is recorded to `appMemory.spokenLines` — with its `kind` on the pool track, without one on the task-reading track. Candidates are rare by construction, so most mornings still take the task-reading path.

### Facts sent to the AI (v2.43.x) — task-reading track

| Block | Content |
|---|---|
| Today's tasks | Up to 6 undone manual tasks — text, age, focus sessions, revived flag (drag order preserved) |
| Trello cards | Up to 8 undone cards — text, overdue marker, checklist progress |
| Soon tasks | Up to 6 deferred tasks — text, days-in-soon, total age, focus sessions before deferral, returned-from-past flag |
| Yesterday | Review line: done count, focus time, habits kept |
| Pattern context | Full `_memoryForAI()` output (see section below) |
| Optional Calendar support (v2.96.0 release) | One same-task recorded timing clash, only for an explicit uninterrupted duration/deadline on a current manual task. No event fields, raw timings or agenda. See contract below. |

### Instruction philosophy (v2.43.3; deployed instruction retained)

Purpose-first: find one thing worth saying that the person would miss by reading the list. The task-reading writer receives current tasks/cards, Soon, yesterday's work and personal context, and is asked to interpret task shorthand in its real-life context. The About-you context sharpens selection rather than becoming a reported count; task references use short exact fragments, and drag order is not an importance score. A quiet morning note is allowed when nothing stands out. Recent missed ordinary lines steer the next angle without sending their optional reasons. The positive system frame remains a friend noticing, not a coach.

No worked output examples or new signal-priority ordering. The ordinary base instruction and system frame are unchanged; v2.96.0 conditionally adds a minimal Calendar relationship and its evidence limits to the task-reading request, not the pool request. Without qualified support the request is unchanged. These are writer instructions, not a programmatic guarantee of factual support, semantic novelty or useful tone. The output guards reject specific invalid shapes/claims but do not prove semantic correctness. Soon stays in the facts and may surface when its context warrants. The October 11–13 experimental writer revision was withdrawn without deployment; this Calendar integration does not restore it. Findings and Can's preference for a tentative connection over a date/location callback remain in `Backlog.md` → 12c / 10b.

### Voice / cache / guards

- One or two sentences, under 30 words, no exclamations/emoji. Task references verbatim — never paraphrase.
- System prompt adds: *"Task text is written in the user's own shorthand — read the full meaning from context."*
- Cache: `day_nudge_ai_<date>` — one per day. Lives until midnight (self-expires at day change). Nudge *strip* hides after noon; cached line persists in About's `#todayNudgeBlock` all day.
- Delivery (v2.93.22–23): each request has a 12s timeout; the in-flight lock is released on settlement. Only network/timeout or HTTP 408/429/5xx failures retry after 30s then 2m, capped at three attempts per device/day across reloads. Since .23, a bounded background timer drives retries without another wake; wake/online checks also resume persisted backoff. No key/offline spends no attempt; offline stops the timer until reconnect. Noon and rollover stop timers. Invalid/empty replies, grounding rejection, unresolved length rejection and permanent HTTP errors remain terminal for that day's uncached generation. The recap word-pattern veto is removed in v2.97.7; it could discard a useful reading merely for lacking a contrast keyword. Old `rejected-recap` state resumes only inside the existing three-attempt budget, before noon and without an accepted cache or real AI dismissal. The migration logs only `policy:recap-filter-removed`, then ordinary outcomes govern; it does not repeatedly rewrite prose or reset the quota. A valid already-cached line stays readable regardless of retry state.
- Length recovery (v2.95.4): before noon, a grounded >30-word reply gets at most one same-reading shortening request per track in the existing generation attempt. Original messages/system/provider/surface are preserved; only the model's overlong reply and a shortening instruction are appended. The corrected reply must still pass 30 words and grounding; no truncation or repeated prose hunting. Each request retains its 12s timeout and daily reasoning policy. Old length-only terminal states without `lengthRepair:true` may resume once at a natural check within the existing three-attempt quota; every new attempt sets the device-local marker. New-policy failures remain terminal. Epoch checks block old-day repair starts/writes, noon blocks new repair starts, and sync/adopted lines still win. Neither rejected nor corrected draft wording is stored in diagnostics; only an accepted final line enters cache/spoken history.
- Privacy/diagnosis: `Today.use('nudge').generationAudit()` returns the device-local current-day snapshot, including up to 20 categorical events (optional HTTP status), no tasks, response/error text, keys or votes. Not synced or sent to AI. A failed request and an intentionally rejected response no longer have indistinguishable diagnostic outcomes.
- Display (v2.93.23): dismissal always hides the strip, but without an accepted cache/spoken line it no longer prevents missing-text recovery into About. A real AI dismissal never regenerates, even if the cache becomes stale or disappears. Noon blocks new generation, not saving an already-in-flight accepted answer. Accepted recovery refreshes open About and queues ordinary Dropbox autosave, as does dismissal. Since v2.97.5, a late answer may crossfade an untouched, undismissed fallback once within 20 seconds of its appearance, before noon. Outside that window or after a press, later natural wake/sync/About-close checks may upgrade an undismissed fallback. A dismissed strip remains hidden. A day epoch fences all late cache/spoken writes and lock release after midnight. A synced accepted cache arriving during a local request wins over its late reply, preserving its voted record.
- Staleness rule (v2.97.2, former BUG-120, consolidated into BUG-118): one `_currentDayLine()` for the strip and About — the saved line retires only when it names a task completed today (distinctive task words; done texts from the lists and synced `recentCompletedTasks`). The stored key is kept for Dropbox; completion and sync merges re-check a visible line; closing About hands its line to an undismissed fallback strip. Replaces the v2.39.1 done-count stamp.

---

## Calendar → daily writer (v2.96.0 release)

Can authorized a first integration after the ordinary-writer experiment close-out. `assets/calendar-nudge.js` owns lazy reader/evidence orchestration; `assets/calendar-nudge-policy.js` is its pure evidence policy shared with offline tooling. Both are precached and neither adds an eager script. Only the ordinary daily writer consumes them; pool/Sunday/focus remain unchanged. No new provider configuration, model/thinking override, sync field or recurring surface. Calendar nudge input requires v2.96.0; connection status alone does not establish that the installed app has this wiring.

This is **timing support, not event/task title matching or general day-shape interpretation**. Among the same first 6 undone non-Past manual tasks already sent to the ordinary writer, code requires an explicit uninterrupted duration and same-day 24-hour deadline. It never infers either from a noun, Trello due date or another task. Do not introduce task syntax or coach the person to supply constraints just to trigger this feature; ordinary shorthand keeps its ordinary behavior. Sparse-but-relevant events can qualify; an event-count threshold cannot. Empty/unrelated/unavailable/stale data is omitted, never interpreted as availability. Focus/Sunday need separate contracts.

- `constraint()` recognizes anchored affirmative declarations across punctuation and clause order, including explicit uninterrupted/continuous minutes, minutes without interruptions, and minutes in one stretch. Captured label/duration/deadline source spans are frozen provenance and never enter AI. Quiet-only wording, missing requirements, estimates, negation, conditions/reported requirements, unsupported dates, extra clocks/durations/tasks and DST skipped/repeated hours abstain. Same-day 24-hour clocks only; this is not a general-language extractor or a new task schema.
- `calendar.timingSnapshot()` returns a detached timing-only projection with complete/fresh/local-day/connection provenance and an account epoch; no join link or event detail. `buildEvidence()` requires connected/visible/online state, local-midnight bounds and at most 5-minute freshness. It merges clipped normalized intervals. Only a clash with the same task's stated duration/deadline qualifies. Empty input, a long unscheduled interval, unknown constraints and passed/impossible deadlines produce no support. Unscheduled time never proves availability.
- `_calendarSupport()` runs only for opt-in credentials and potentially explicit constraints. The entire lazy import/read has an 800ms cap; a late read may warm the existing reader but cannot alter this request or replace a line. Ordinary facts are built after that bounded wait, so task changes during the read are reflected. Unqualified payloads retain the original facts/instruction/system/provider/surface byte-for-byte in synthetic matching cases.
- `writerContext()` projects only the task label, its own duration/deadline and the code-qualified relationship. `writerInstruction` makes support optional and keeps attendance/availability unknown; no worked examples. It uses the existing daily AI call and thinking policy, not a separate Calendar decision or a fixed renderer. The person still judges usefulness through the same landed/not-really record; no new kind or Calendar history field.
- Enriched replies revalidate the live task text/current-list membership, snapshot freshness/day/state/account epoch and relationship before saving. Conservative negative checks reject known unsupported timing/availability/attendance/rescheduling shapes. They do **not** prove arbitrary prose semantics. Stale or rejected supplemental replies get one ordinary generation with freshly rebuilt facts, not another Calendar attempt; normal same-reading length repair remains bounded per request track. Retryable transport errors keep the existing three-attempt recovery lifecycle. Midnight/noon block new fallback starts; sync-adopted text, dismissals, About/cache/vote convergence and no mid-read swaps retain their existing ownership.
- Raw events, titles, participants, links, IDs and provenance are never sent to AI or persisted. The accepted final nudge—including a derived Calendar relationship if used—still enters the existing private spoken-line/cache/Dropbox flow. Forget clears credentials/transient context and fences pending enriched replies; it does not erase an already-spoken line or its vote. An accepted daily cache is not an agenda and is not refreshed whenever Calendar changes.

### Earlier protection/voice prototypes (dev-only)

`scripts/lib/calendar-nudge-policy.cjs` imports the shared evidence functions but retains the earlier decision/renderer only for experiments/tests; those templates are not loaded or precached by the app:
- `buildDecisionPrompt()` projects only the task label, declared duration/deadline and the code-owned qualified relationship. It excludes raw blocks, event fields/URLs, task IDs and positive gap data. Actual availability stays unknown.
- `resolveDecision()` revalidates current task/snapshot evidence before accepting a strict one-field JSON choice: `check`, `notice` or `abstain`. Prose and extra fields fail closed. Code, not the model, renders a continuity acknowledgment or an unresolved commitment-fit reading with unchanged duration/deadline. This is bounded expression, not an unrestricted creative writer or a semantic proof via keyword guards. The ordinary creative task-reading path remains untouched.
- `buildEvidence()` optionally accepts at most 3 validated `recentReadings` supplied by an experimental caller. A matching task id / declared duration / deadline withholds the relationship, and history arriving during the decision invalidates delivery. Accepted results return a frozen `reading` descriptor for that pure comparison. No history is automatically retrieved, recorded or synced; no descriptors enter AI. A real window/cooldown and integration with existing private spoken history remain design work, not shipped behavior.

Tests: `calendar-nudge-policy-unit-test` — 20 groups, including writer projection/known-overreach checks, plus the independent 100-schedule interval oracle. `nudge-test` adds 17 synthetic runtime cases covering the conditional payload, byte-identical omission, bounded read, task removal/edit/completion, Forget/account change/hide/midnight, invalid replies, ordinary recovery, About/votes and privacy. `calendar-test` covers snapshot provenance/field minimization and lifecycle withholding; `service-worker-test` covers offline lazy-policy import. All use fictional data/mocked responses, not a live usefulness verdict.

**Status:** Can authorized release to dev and master on October 14. Verify the deployed v2.96.0 before attributing installed-PWA behavior to it. Earlier fixed-template/free-writer experiments did not establish voice variety or personal usefulness. This first integration keeps the ordinary writer and adds input only when supported; it is not a keep verdict, general Calendar parsing/matching, or proof of better nudges. Observe real eligible use after deployment; do not manufacture a match or replace an existing daily line to force exposure. Log/next gate: `Backlog.md` → 10b.

---

## Observation Pool (12c, v2.80.0)

One ranked candidate pool for proactive personal lines: code selects the observation through the gates, the model only phrases it. It lives in DOM-free `assets/week-reflection-policy.js` and feeds the morning nudge and Sunday reflection; Noticed and focus retain their separate jobs. The former Monday intention is paused.

| Function | Role |
|---|---|
| `_buildObservationCandidates({ outcomes, todayISO })` | Six outcome kinds sorted by hand-assigned `score`; the old week-grid productivity kinds are retired. Proposes only — callers apply gates and per-surface eligibility. |
| `_buildOutcomeCandidates(outcomes, todayISO)` | Six kinds from `appMemory.taskOutcomes`: `focus-vs-obligation` 115, `obligation-completion` 105, `letgo-reason` 95, `return-finished` 92, `soon-pullback` 88, and `letgo-return` 85. Return kinds link release → revive (and optionally done) by privacy-safe text hash over 45 days; the others use 30 days. Each candidate carries `{ kind, score, evidence, insight, signal }`. `evidence` proves the qualifying relationship; `insight` is its bounded, code-owned human reading; `signal` is aggregate, text-free material-change evidence. The AI receives evidence + insight, never the signal or raw log. This explicit interpretation stage keeps the model in the writer role. |
| `_observationGateExplain(candidate, { spokenLines, outcomes, surface, todayISO })` | `null` to keep, or a human-readable drop reason. Same-surface repetition stays blocked for the full per-kind cooldown (21 days for month-window kinds, 30 for return kinds). A different surface can revisit the kind only after 7 days and only if rebuilding the earlier candidate from the retained outcome log proves a material per-kind delta; no extra snapshot is stored. The newest matching line is reported as the blocker. Age-as-content, reactions, and permanent verdicts still take precedence: one `missed` disables the material override and adds seven days to the base cooldown (v2.97.3: 21 → 28 days for month-window kinds, 30 → 37 for returns); two misses retire the kind. `landed` never blocks. |
| `_observationNoveltyGate(candidates, knowledge)` | Filters by the above. |
| `_observationTextIsGrounded(text, maxWords)` | Output guard shared by every pool-fed surface and by the nudge's task-reading track: rejects identity, causal and tenure claims and overlong text. `_weekReflectionTextIsGrounded` is this at 26 words. |

**Ranking is editorial, not statistical.** Base scores are hand-assigned judgment about which kinds matter; deviation from the user's own baseline is only a within-kind qualifying threshold. Cross-kind p-values are not comparable and are blind to semantics — `research/ObservationSelection.md`.

**Unknowns stay unknown.** Backfilled rows (`backfilled: true`) are excluded from `focus-vs-obligation`; rows with `obligation: null` fall out of both partitions. **Abstention is per surface:** the nudge falls through to its task-reading track; a surface that exists only to observe goes silent.

**Cold-start ordering (v2.90.35):** the morning may display a synced cached line immediately, but it cannot generate a new one until Dropbox's initial merge has settled and `checkDayNudge._setMemoryReady()` opens the internal gate. Trello finishing early can no longer select against stale device-local `spokenLines`.

**Tests:** `scripts/observation-pool-test.mjs` plus pool coverage in `nudge-test`, `insights-test` and `dropbox-test`. They assert silences, firings, material deltas, strict same-surface cooldown, and post-sync generation ordering.

---

## Sunday Weekly Reflection (v2.17.56; evidence contract v2.71.12; pool-only v2.85.0)

On Sundays, `#sundayBlock` may appear above the stat tiles in the About panel. The sentence is signal-gated: `_pickSundayInsight()` in `about.js` runs the 12c pool — `_buildObservationCandidates()` over `appMemory.taskOutcomes`, then `_observationEligibleFor(…, 'sunday')` and the novelty gate — and takes the top candidate. Every kind is an outcome kind about the person's commitments (obligation completion, let-go reasons, what returns and whether it gets finished, soon pull-backs, focus versus obligation). The week grid's day counts are no longer an input: the four statistical kinds (focus/completion, habit/completion, recurring weekday, bursts) were retired in v2.85.0 as productivity stats. When no candidate survives, or the pool is missing or throws, `_pickSundayInsight()` returns null and the block hides. The ranker and `_weekReflectionTextIsGrounded()` live in DOM-free `assets/week-reflection-policy.js`; the browser uses their globals while `observation-pool-test.mjs` requires the same implementation directly.

**Quiet-surface diagnostic (v2.90.34):** `_observationPoolAudit()` mirrors the Sunday evidence windows, thresholds, eligibility and novelty gate but returns aggregate counts and kind names only. `_debugSundayAudit(date)` stores that report locally as `sunday_observation_audit_<date>` on Sunday startup, after the sync re-check, and when About renders. AI request stages update the same report (`blocked-no-insight`, cooldown/gate reason, missing key, offline, HTTP/rejection/exception, or accepted). It adds no network call and changes no selection or silence behavior. An explicit historical date can reconstruct Sunday while the underlying 30/45-day outcome window remains in `appMemory`; audit records are not synced and contain no task text, ids, candidate prose, or spoken prose.

v2.90.35 labels a candidate when material cross-surface evidence reopened it, and adds observed/backfilled revive provenance. v2.90.36 distinguishes `survivesGate` from the one highest-ranked `selected` candidate. This distinguishes legacy synthetic revive rows—which cannot link by design—from observed revives whose missing release pair would indicate a current extraction problem.

The winning object contains `{kind, score, evidence, insight}`. `_fetchWeekReflection()` sends only its `kind` and code-owned `insight` to the AI; the numerical evidence remains inside the deterministic policy and diagnostic. It no longer sends `_memoryForAI('weekly')`, lifetime days active, `recentCompletedTasks`, or evidence counts. The model phrases the selected reading rather than deciding what is true or meaningful from raw personal history.

**Reactions (12e, v2.86.0; optional reasons v2.93.1):** tapping the sentence (Sunday and Today blocks in About; the morning strip, where the states open in the sibling `#dayNudgeReact` instead of dismissing) reveals two states, *landed* / *not really*, written to the line's `spokenLines` entry by `_memoryReactToLine`. After *not really*, the vote saves immediately and a skippable reason choice offers *not true*, *already knew*, *doesn't help*, or *wrong moment*. The reason is kept only on the private synced spoken line (`reactionReason`), can be changed or cleared, and never enters a model prompt or public note. The morning strip closes after a choice, Done, or a short timeout; About allows later revision. Monday supported the same reaction before its v2.92.13 pause. This is the usefulness gate with the person as judge: pool votes change kind selection; ordinary task-reading votes have the separate wording-context path below. The reason is for private review, not automatic gating. A control renders only when a spokenLines entry exists for that surface today; rule-based fallback lines get none.

**Local v2.98.1 revision:** bounded two-landed/two-missed context replaces the misses-only projection below while preserving the deployed writing instruction; this is prepared locally, not deployed. See the improvement-cycle status and Backlog §15.

**Task-reading feedback (v2.93.9; steering since v2.93.16):** ordinary morning lines are `spokenLines` with no pool `kind`, so pool verdict retirement cannot govern them. A miss no longer silences the morning (v2.93.9 paused the path for two mornings after three misses; Can, 2026-10-06: tomorrow's list differs, and a quiet morning yields no vote to learn from). Instead `_taskPathMisses()` sends up to three of the most recent missed task-reading lines from the last 14 days — the model's own wording only — under *Recent morning lines the person marked "not really"*, with the principle not to repeat their angle, shape, or subject. Since v2.97.7, ordinary output is no longer discarded by a word-pattern recap test: presence of a duration/waiting phrase and absence of a short contrast-word list did not establish whether the reading was useful. The existing writer still asks for something beyond the list, permits a quiet orientation, and learns from the person's reactions. Grounding/length checks remain; their passing does not certify semantic quality or usefulness. The optional reason stays private: never sent to a model, diagnostic only.

**Voice (earned-v5 local; prior earned-v4 shipped):** one or two short sentences, under 24 words total, in clear everyday language. Express the supported insight, not totals, ratios, percentages, sample sizes, or time windows. Preserve app actions (`let go`, not `closed out`). Warmth, rhythm, dry wit, and a light clarifying metaphor remain available when they improve comprehension; they may not replace the literal relationship. `_weekReflectionTextIsGrounded(text, candidate)` rejects generic epistemic failures and numerals, then checks kind-specific semantic anchors so a fluent line that drops the selected relationship is also withheld.

**Sunday fallback integration (Phase 3, local release pending / BUG-126):** v2.98.2 added a `week-shape` fallback after ordinary pool kinds are gated. It remains Sunday-only and never overrides a same-day current/voted Sunday line. The local integration correction selects exactly today plus six prior calendar dates; at least three recorded done/let-go/Soon-pull events are required. Directional wording requires a strict majority; a mixed reading requires all three observed actions. Two-way ties without a majority abstain. Its seven-day base cooldown allows a later Sunday, one miss adds seven days, and two misses/permanent retirement block it just like other kinds. The fallback passes the same novelty/feedback gate; a new week alone cannot override a rejection. `signal.shape` is an ephemeral deterministic wording-validation discriminator, not a new stored or model-input field. The writer still sees only the selected kind/insight, never raw outcomes or counts. This fixes wiring/truth, not the open usefulness verdict for a week-shape summary.

**Abstention:** no qualified pool or fallback, `none`, missing AI, offline, or invalid prose hides the sentence. Week-shape prose must carry the selected action/direction; generic unrelated wording is rejected. It does not re-enable retired productivity-stat kinds or unlock WEEK/New week.

**Cache:** text remains `week_reflection_YYYY-MM-DD`. `week_policy_YYYY-MM-DD = earned-v5` (local integration correction) is a policy/negative-cache companion, Dropbox-backed as `week_reflection_policy`. A current marker with no text means the evidence gate intentionally abstained. Old reflection text without the current marker is deleted and ignored during sync. Sunday `spokenLines` carry the wording policy; only an **unvoted** same-day stale-policy line is ignored for replacement. Explicit old votes retain their effect, while the current-policy line resumes normal cooldown. Existing sync policy compatibility rejects old-policy caches; new policy/prose does not reset kind retirement.

**Entry point:** `_fetchWeekReflection({days, history, insight})` via `/.netlify/functions/ai-assist`.

**Request/source fences (local Phase 3 correction):** new generation waits for initial memory readiness. A transient canonical source key covers local day, readiness/Memory clear, relevant outcome rows, kind-linked spoken feedback and kind verdicts; it is never persisted or sent. Responses and late errors are discarded after a relevant source/feedback/day/credential/cache change. An adopted daily cache wins; a quiet stale response does not hide that cache. Ordinary unrelated Focus lines and storage-row reorder leave a valid result current. The dated outer cache write also checks day and clear generation.

**Audit parity:** the existing local-only Sunday audit now includes a fallback candidate and its actual gate reason/selection when normal kinds yield none, including same-day suppression. It still emits aggregates/kinds only, without task ids/text or candidate/spoken prose. Its result is delivery/eligibility evidence, not a model-quality score.

---

## Monday Intention (paused since v2.92.13)

The former "New week" line used `#sundayBlock` with today's tasks, Soon, Trello and `_memoryForAI('weekly')` but no code-selected week-scale observation, so it repeated the Today nudge (same task, age, peak hour) plus a streak. Monday now leaves the block hidden and generates nothing; the week grid and Today's cached line still render. `monday_intention_<date>` caches and the sync field stay only for mixed-version compatibility. Return gate: `Backlog.md` → New week. Do not extend the observation pool to Monday before 12c Phase 4's verdict.

---

## `_memoryForAI()` — Behavioral Context (v2.43.4)

Defined in `assets/insights.js`. Called by the daily nudge's task-reading track (`_memoryForAI('nudge')` in `nudge.js`). Returns a plain-text paragraph of behavioral signals. The focus companion, Sunday reflection and observation pool deliberately do not use it.

| Signal | Source | Notes |
|---|---|---|
| Peak productivity hour | `appMemory.preferences.peakHour` | `_memoryDerivePeakHour()`: last 90 days of `completionHourDays` once they hold ≥ 20 completions, lifetime `completionsByHour` until then (v2.95.7) |
| Best streak | `appMemory.patterns.bestStreak` | Historical high |
| Current streak | `localStorage.stat_streak` | More morning-relevant than best |
| Total focus time | `appMemory.patterns.focusMinutesTotal` | Shown when >60 min |
| Recent moments | `appMemory.moments` | Last 3: streak milestones, big clears |
| Days active | `appMemory.totalDaysActive` | Shown when >7 |
| Past suggestion history | `appMemory.suggestionHistory` | Last 30d, up to 5 tasks — what was suggested + what user did |
| Recent conversations | `appMemory.recentConversations` | Last 3 of the up to 5 stored (legacy sheet context; no new entries) |
| Recent completions (verbatim) | `appMemory.recentCompletedTasks` | Last 5 task texts — lets AI calibrate to user's writing style |
| Late-addition pattern | `appMemory.patterns.lateAdditions` | Shown when ≥40% of tasks added after 2pm |
| Task lifespan | `appMemory.patterns.taskLifespanSamples` | Rolling 20-sample average — "you typically close tasks in N days" |
| 7-day rhythm | `localStorage.today_daily_history` | Avg tasks/day + focus/day, trend vs. prior week |
| Habit context | `habitsList` + `habitCompletions` | Active habits, 7-day completion rate per habit, done-yesterday flag |
| Returning tasks (12a) | `appMemory.returningTasks` | Tasks on the list 5+ days, by name with day count; "never opened" marker at 7+ days and zero sessions. One emission per task since v2.79.1 — repetition was manufacturing salience |
| Obligation framing (12a) | `appMemory.obligationLanguageTally` + `obligationHistory` | Pending obligation-framed tasks by name; long-term completion rate once 10+ entries over 30 days (v2.78.0) |
| Voice memory (12a) | `appMemory.spokenLines` | Last 8 lines TODAY said, with surface and date — "do not repeat these, do not reuse their sentence shape" (v2.79.0). The pool track uses this deterministically instead, via the novelty gate |

**Task lifespan tracking:** `_memoryOnTaskComplete(taskText, taskId)` computes lifespan from `_getCreatedFromId(taskId)` on each completion and appends to `taskLifespanSamples` (capped at 20 entries).

---

## Legacy Suggestion Cooldown + History

These fields were written by the removed sheet's aging-task suggestions. They remain readable,
mergeable, and clearable for backup compatibility and for context from older installations, but
the current app does not append new entries to them.

**Cooldown (`appMemory.suggestionCooldowns`):**
- Format: `{ taskId: 'YYYY-MM-DD' }` — date last suggested
- 7-day cooldown — task skipped for 7 days after suggestion
- Pruned nightly in `applyNewDayCleanup`: removes IDs not in `manualTasks` OR `trelloTasks`
- Pruning checks both manual and Trello IDs (checking only manual reset Trello cooldowns nightly)
- Synced via Dropbox

**History (`appMemory.suggestionHistory`):**
- Format: `[{ taskId, taskText, suggested: 'YYYY-MM-DD', action: 'break_down'|'move_soon'|'delete_task'|'dismiss' }]`
- Recorded when user taps a chip action on a suggested task
- Max 50 entries, newest first
- Synced via Dropbox
- **Sent to AI via `_memoryForAI()` (v2.15.4)** — last 30 days, up to 5 tasks, grouped by taskText with action labels. AI uses this to write contextually aware messages.

## DreamBank (v2.93.0)

Three model calls, all in `assets/dreambank.js` except detection; full design in `Backlog.md` § 13.

- **Detection** — inside the Gemini `meeting-extract` call: a dream account is one the speaker places in their sleep; once that is said, one plain sentence is enough; comparing a waking day to a dream, or an ambition called a dream, is not one (BUG-110, BUG-114). Returns a faithful first-person retelling and `lang`; `responseMimeType: 'application/json'`; a blocked/empty/unreadable reply returns a `note` that reaches the red dot instead of a silent "Nothing came up".
- **Reading** — `DREAM_SYSTEM`: start from the detail that doesn't fit, follow one or two threads, connect to waking life only as far as the dream points, tentative by wording, end with exactly one unlabelled question as the last sentence, in the dream's language, ≤ 80 words. Measured by `scripts/dream-reading-eval.mjs` (head-to-head vs `scripts/dream-prompts/candidate-1.txt`).
- **Extraction** — `EXTRACT_SYSTEM` JSON `{images, people, role}`; an image survives only if every substantive word stem-matches the retelling (Turkish softening folded), so invented details never reach `appMemory.dreams.index`. The recurring-image list (M2) is computed on the device from that index — no model call.

Only the retelling goes to the model; readings and retellings live in the user's Dropbox files, never in the synced backup.

---

## Post-add Inline Outcome Loop (v2.72.0)

This learns on the existing row shown after a newly added task; it adds no panel, badge, setting, or recurring message.

Each shown offer appends one `appMemory.suggestionOutcomes` record with a stable ID, task/pattern, explicit reason (`multiple_actions`, `long_complex_task`, `vague_task`, or `other_complexity`), the visible reason text, and an ISO `offeredAt`. The model is asked for the enum; deterministic text/type rules classify older or malformed responses.

**Split accuracy (v2.92.12):** the post-add model sees only the newly added task, not neighboring tasks or lifetime preference statistics. It may suggest a split only for 2–3 independently finishable actions explicitly written in that task; a single activity's implied preparation or workflow is not evidence. The client independently accepts only 2–3 verb-led action clauses copied from the task in order. An ungrounded model split is discarded without showing or recording an offer; the original task is untouched. Split offers use `multiple_actions`; historical `long_complex_task` records remain for compatibility.

**Source selection (local v2.100.1 / 15F, BUG-131):** the client derives 2–3 unambiguous English verb-led clauses from the newly captured task, preserving original text and removing only a leading tag and separators. The model receives that same task plus its candidate clauses and returns `action_indices` confirming every candidate exactly once in source order. It remains responsible for whether these are independently finishable rather than objects or parts of one activity. The client never guesses synonyms or accepts missing/invented actions: it validates the complete index sequence and creates tasks from source strings, retaining case, spacing, punctuation and inherited tags. Exact legacy `subtasks` replies still validate, but their text is also replaced with the corresponding source strings; legacy paraphrases and mixed protocols are rejected. Supported imperative coverage now includes install/paint/translate and other common omitted actions. This remains a conservative bounded English guard, not a general language parser.

The existing Split control remains explicit. Before replacement, require the still-current displayed offer, exact captured text and an undone manual Today owner; stale edits/checks/moves dismiss quietly without application or a negative feedback event. Revalidate original clauses at Apply. Recovery, two-second debounce, frequency, source-only privacy, outcome events, retention and provider transport stay unchanged. This slice closes the confirmed eligibility/source-fidelity gaps; it does not change offer frequency, infer personal wording preferences, or reconsider old tasks. Rollback retains normal source-authored child tasks/outcomes; transient index replies/offers are not persisted. An old client asks for its own legacy reply format. No backup-schema change or new collection.

**Transport recovery (BUG-129, combined local v2.99.0 candidate):** the latest newly captured manual task can survive a brief connection failure in closure-only state for at most two minutes. The initial debounce stays two seconds; request plus body has a twelve-second deadline; network/timeout/408/429/5xx failure permits one retry after five seconds. Offline/hidden waiting consumes no attempt; online/foreground resumes only the same unchanged/undone task and credentials. New capture, edits, removal, completion, zone move, expiry or key/provider change fence requests/results. Model abstention, malformed/ungrounded output, reason suppression and permanent HTTP errors are terminal. No offer/negative outcome is written for a failed or deferred request. Existing viewport delivery starts only after a valid accepted result; no persistent retry queue, prompt/frequency change or model call for old tasks is introduced.

**Viewport delivery (v2.72.1):** generation and delivery are separate. The provider may finish while a newly added task is outside the viewport, but the result stays in closure-only pending state: no DOM row, animation, `offered` count, persisted outcome, or exposure timer exists yet. The task row is observed with a 64px bottom reserve so the action has room to appear; on entry, the row mounts and the normal outcome lifecycle begins. A mutation observer re-anchors the pending result when task rendering or sync replaces the DOM node. Pending delivery is discarded if a newer analysis supersedes it, the task text changes, or the task is completed, removed, or moved. Provider responses carry an analysis sequence guard, preventing an older slow response from surfacing after a newer task. Browsers without `IntersectionObserver` use the same geometry check on scroll, resize, and foreground return.

**Visible-row ownership (v2.77.3):** once shown, the full-width helper remains a sibling of its task but is owned by stable task ID rather than DOM position. `_aiReanchorSuggestion()` runs after pointer/touch/Option+Arrow persistence and after `renderManual()` rebuilds, moving the existing helper element immediately after its owner without creating a second offer or restarting its outcome lifecycle.

**Outcome evidence:**

- **Applied:** the split chip was used; generated task IDs are attached to the offer.
- **Dismissed:** the explicit close chip was used.
- **Ignored:** the row accumulated ten seconds while both intersecting the viewport and in a visible document, then auto-expired. Off-screen time, background-tab time, and programmatic replacement are not counted.
- **Helped:** at least one generated step was later completed. This is the positive preference signal; application alone is weaker intent evidence.
- **Later reversed:** after a ten-minute undo grace, the original task was recreated or every generated step was deleted/let go before any generated step completed. Duplicate originals already present at apply time are excluded. Moving a step to Soon is not reversal.

**Reason policy:** no category judgment before four resolved offers. At four or more, a reason whose `(dismissed + ignored + reversed) / (applied + dismissed + ignored)` is at least 70% is reduced to deterministic one-in-four exploration. It is not permanently disabled, so changed behavior can produce recovery evidence. Outcome history controls delivery, not the model's judgment of what actions were written. This replaces the old all-or-nothing global suppression ratio.

Records cap at 100. Dropbox merges them by stable offer ID, unions result IDs and monotonic event timestamps, and treats completion evidence as stronger than a conflicting reversal from another device. No aggregate reason evidence is sent with post-add analysis; there is no analytics or TODAY server telemetry.

**Ask source boundary (v2.101.0):** factual task input comes from the authoritative stored wording, preserving its tags and URLs while excluding rendered session badges and link labels. A separate display snapshot strips presentation metadata and still invalidates on displayed-text changes. Deleting a focused owner closes the detached timer as well as discarding feedback.
