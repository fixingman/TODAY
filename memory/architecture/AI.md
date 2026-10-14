# AI Companion System

> AI assistant architecture, context, actions, and personality.

---

## Overview

Reachable AI surfaces: the post-add inline task suggestion, the focus companion question, the daily (morning) nudge, About's Sunday reflection and Memory's feeling relationship, meeting/voice extraction, DreamBank readings and extraction, and Gmail/web task enrichment. Code selects what is true; the model phrases it (see Observation Pool). Prompts state principles, never worked examples.

Deterministic policy lives in DOM-free modules with direct unit tests: `assets/suggestion-policy.js` (suggestion reasons, exploration, underperformance), `assets/noticed-model.js` (solar-term and milestone selection), `assets/week-reflection-policy.js` (observation pool and guards). `assistant.js`, `insights.js`, `nudge.js`, `about.js`, `focus.js` and `dreambank.js` own UI, storage, outcome recording and provider calls.

**Providers:** Claude (Sonnet, `claude-sonnet-5`) or Gemini 2.5 Flash, chosen in Connections. This build defaults to Claude (`AI_BUILD_PROVIDER = 'claude'` in `connections.js`); public forks default to Gemini (`AI_DEFAULT_PROVIDER`). Audio (meeting mode, voice notes, dream detection) always uses Gemini — the only provider with native audio input.

**Proxy:** `/.netlify/functions/ai-assist` for text; `meeting-extract` and `transcribe` for audio. Valid JSON replies come back top-level, anything else wrapped as `{content}` — callers that expect JSON must accept both.

**Removed surfaces:** the ✦ AI sheet (input-bar trigger removed v2.49.0, controller/markup deleted v2.83.1), its chat thread, and the ✦ empty-tap Daily Brief (v2.41.0). The TODAY logo opens Memory; no replacement chat exists. Design record: `archive/Architecture.md` → Retired ✦ AI sheet.

**Daily-nudge reasoning (v2.93.23):** both morning tracks send the exact `surface: 'daily-nudge'` marker. The proxy enables Claude Sonnet 5 adaptive thinking only for this marker, with a fixed 2048-token ceiling for thinking plus the answer (other Claude callers keep thinking disabled and 512 tokens; Gemini is unchanged). Client-supplied model/thinking/token overrides are not forwarded. The final line still has its existing 30-word and grounding guards. Only text blocks are returned; thinking/redacted blocks never reach the client or memory. A `max_tokens` stop returns content-free HTTP 502 rather than accepting a partial line, using bounded transient recovery. The 5s display race and 12s request timeout remain; live reasoning latency and usefulness must be re-observed, not inferred from mocked tests. The September 27 disable was a workaround accompanying the now-correct text-block parser, not a measured daily-nudge quality decision. No prompt, selection, provider/model or machine routing change. Delivery/dismissal recovery is a separate fix below. Reference: [Anthropic thinking support and token-limit troubleshooting](https://platform.claude.com/docs/en/build-with-claude/thinking-troubleshooting).

---

## Memory → HOW DAYS FELT relationship (v2.95.1)

`assets/reflections.js` chooses one aggregate from opted-in, retained reflected evenings joined to same-date outcomes on-device. The writer gets only the chosen feeling, both action contexts and group counts. It must start “On evenings you reflected,” say the user marked that feeling more often, copy the selected comparison in order, and write one complete sentence of at most 40 words. Bringing a task back from Past replaces opaque “reviving” wording; task-focused comparisons name recorded focus rather than claiming a whole focused day. The output guard rejects incomplete, overlong, causal, multi-feeling or swapped comparisons; rejected replies leave the opted-in section hidden, without stats.

The transient canonical evidence key includes local day/window, consent choice/version, deletion watermark, valid retained reflection values/versions and relevant same-date outcome fields (outcome, obligation, focus sessions, backfill status). It excludes unrelated outcomes and storage order. Each evidence snapshot gets at most one attempt in the current session state. Changes invalidate both the result and queued/pending requests; an epoch plus current-source check fences replies after newer requests, deletion or consent withdrawal. Local outcome/reflection changes, sync including outcome-only merges, new-day cleanup and foreground return reconcile the source. An unchanged valid relationship keeps its wording. Neither source identity nor source rows are persisted, synced or included in AI input. Existing provider/auth route and backup schema remain unchanged.

---

## Focus Companion (`_focusAskAI`)

A question inside the focus timer bar, from the ✦ ask button. One question under 20 words that should change how the next 25 minutes go. If the task already has Gmail or web context in focus, the button acts on that instead (Draft reply / open the link). It builds its own `_ctx` list; it does not use `_memoryForAI()`.

### Signals (user message, `_ctx`)

| Signal | When |
|---|---|
| N earlier focus sessions on this task (`focusSessions`, or `_getTrelloFocusTotal()` for cards) — "one of them earlier today", or "last session N days ago" when ≥2 days | sessions > 0; otherwise "never focused on before" |
| On the list N days | age ≥ 3 days |
| Once let go, then brought back | `revived` |
| Put off to Soon, then pulled back | `returnedFrom === 'soon'` |
| Contains words they usually put off | task words (len > 3) with frequency ≥ 2 in `appMemory.preferences.dragKeywords` |
| Most common let-go reason | one reason ≥ 35% of ≥ 8 let-gos (`appMemory.patterns.letgoReasons`) |
| Local time + period | always — exact local time, morning / afternoon / evening / late night |
| Peak productive hour | `peakHour` ± 1h |
| Other focus sessions today | `stat_focus_mins_today ÷ 25` ≥ 1 |

The confirmed inferences Memory → PATTERNS shows (`Today.use('memory').shownInferences()` — at most 3, newest support first, restatements of computed lines dropped; v2.95.7) are appended to the system prompt as "What we know about the user: …". The button gains a quiet `high-signal` state when stuck/returning signals align.

### Prompt (principles, no taxonomy)

The question belongs to this task and is built from its own words; one that would fit any task is a failure. History aims the question and is never read back (no counts, day numbers or labels). A returning or long-worked task usually hides one unmade decision or unclear first step; a new task needs its finish line for these 25 minutes; the rest of the list matters only if something should come first. About the work, not mood: no check-ins, encouragement or obvious yes/no. Time references use the supplied exact local time. The earlier v2.65 question-type taxonomy was replaced by these principles (v2.92.5). UI/state: `architecture/Focus.md` → Companion Question.

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
- Delivery (v2.93.22–23): each request has a 12s timeout; the in-flight lock is released on settlement. Only network/timeout or HTTP 408/429/5xx failures retry after 30s then 2m, capped at three attempts per device/day across reloads. Since .23, a bounded background timer drives retries without another wake; wake/online checks also resume persisted backoff. No key/offline spends no attempt; offline stops the timer until reconnect. Noon and rollover stop timers. Invalid/empty replies, grounding/recap rejection, unresolved length rejection and permanent HTTP errors remain terminal for that day's uncached generation. A valid already-cached line stays readable regardless of retry state.
- Length recovery (v2.95.4): before noon, a grounded >30-word reply gets at most one same-reading shortening request per track in the existing generation attempt. Original messages/system/provider/surface are preserved; only the model's overlong reply and a shortening instruction are appended. The corrected reply must still pass 30 words, grounding and task recap; no truncation or repeated prose hunting. Each request retains its 12s timeout and daily reasoning policy. Old length-only terminal states without `lengthRepair:true` may resume once at a natural check within the existing three-attempt quota; every new attempt sets the device-local marker. New-policy failures remain terminal. Epoch checks block old-day repair starts/writes, noon blocks new repair starts, and sync/adopted lines still win. Neither rejected nor corrected draft wording is stored in diagnostics; only an accepted final line enters cache/spoken history.
- Privacy/diagnosis: `Today.use('nudge').generationAudit()` returns the device-local current-day snapshot, including up to 20 categorical events (optional HTTP status), no tasks, response/error text, keys or votes. Not synced or sent to AI. A failed request and an intentionally rejected response no longer have indistinguishable diagnostic outcomes.
- Display (v2.93.23): dismissal always hides the strip, but without an accepted cache/spoken line it no longer prevents missing-text recovery into About. A real AI dismissal never regenerates, even if the cache becomes stale or disappears. Noon blocks new generation, not saving an already-in-flight accepted answer. Accepted recovery refreshes open About and queues ordinary Dropbox autosave, as does dismissal. Neither completion nor a background timer replaces a visible fallback; only a later natural check can upgrade an undismissed fallback. A day epoch fences all late cache/spoken writes and lock release after midnight. A synced accepted cache arriving during a local request wins over its late reply, preserving its voted record.
- Staleness guard: if more tasks are done now than when the line was generated (`day_nudge_done_count_<date>`), the strip skips the cached line and regenerates so the AI doesn't describe already-done work. The cached line is never deleted — About's Today block and the Dropbox upload read the same key — and is overwritten only when a fresh line arrives (v2.90.43). A Dropbox merge that brings a different line clears the local stamp, since it described this device's line.

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
| `_observationGateExplain(candidate, { spokenLines, outcomes, surface, todayISO })` | `null` to keep, or a human-readable drop reason. Same-surface repetition stays blocked for the full per-kind cooldown (21 days for month-window kinds, 30 for return kinds). A different surface can revisit the kind only after 7 days and only if rebuilding the earlier candidate from the retained outcome log proves a material per-kind delta; no extra snapshot is stored. The newest matching line is reported as the blocker. Age-as-content, reactions, and permanent verdicts still take precedence: one `missed` doubles the cooldown and disables the material override; two misses retire the kind until “bring back.” `landed` never blocks. |
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

**Reactions (12e, v2.86.0; optional reasons v2.93.1):** tapping the sentence (Sunday and Today blocks in About; the morning strip, where the states open in the sibling `#dayNudgeReact` instead of dismissing) reveals two states, *landed* / *not really*, written to the line's `spokenLines` entry by `_memoryReactToLine`. After *not really*, the vote saves immediately and a skippable reason choice offers *not true*, *already knew*, *doesn't help*, or *wrong moment*. The reason is kept only on the private synced spoken line (`reactionReason`), can be changed or cleared, and never enters a model prompt or public note. The morning strip closes after a choice, Done, or a short timeout; About allows later revision. Monday supported the same reaction before its v2.92.13 pause. This is the usefulness gate with the person as judge: the vote changes which kinds get chosen, never how a line is phrased; the reason is for private review, not automatic gating. A control renders only when a spokenLines entry exists for that surface today; rule-based fallback lines get none.

**Task-reading feedback (v2.93.9; steering since v2.93.16):** ordinary morning lines are `spokenLines` with no pool `kind`, so pool verdict retirement cannot govern them. A miss no longer silences the morning (v2.93.9 paused the path for two mornings after three misses; Can, 2026-10-06: tomorrow's list differs, and a quiet morning yields no vote to learn from). Instead `_taskPathMisses()` sends up to three of the most recent missed task-reading lines from the last 14 days — the model's own wording only — under *Recent morning lines the person marked "not really"*, with the principle not to repeat their angle, shape, or subject. A conservative output floor still rejects a bare waiting-age recap with no contrast or choice; it is not cached or recorded as spoken, and the rule-based line shows instead of an empty strip. The optional reason stays private: never sent to a model, diagnostic only.

**Voice (earned-v4, v2.90.36):** one or two short sentences, under 24 words total, in clear everyday language. Express the supported insight, not totals, ratios, percentages, sample sizes, or time windows. Preserve app actions (`let go`, not `closed out`). Warmth, rhythm, dry wit, and a light clarifying metaphor remain available when they improve comprehension; they may not replace the literal relationship. `_weekReflectionTextIsGrounded(text, candidate)` rejects generic epistemic failures and numerals, then checks kind-specific semantic anchors so a fluent line that drops the selected relationship is also withheld.

**Abstention:** no qualifying candidate, `none`, missing AI, offline, or an invalid response hides the sentence. There is no factual fallback; the week grid already carries that information.

**Cache:** text remains `week_reflection_YYYY-MM-DD`. `week_policy_YYYY-MM-DD = earned-v4` is a policy/negative-cache companion, Dropbox-backed as `week_reflection_policy`. A current marker with no text means the evidence gate intentionally abstained. Old reflection text without the current marker is deleted and ignored during sync. Sunday `spokenLines` carry the wording policy; only a same-day stale-policy line is ignored so the replacement can be generated, then the current-policy line resumes normal cooldown behavior.

**Entry point:** `_fetchWeekReflection({days, history, insight})` via `/.netlify/functions/ai-assist`.

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
