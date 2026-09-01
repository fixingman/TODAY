# AI Companion System

> AI assistant architecture, context, actions, and personality.

---

## Overview

The AI companion is accessed via the ✦ button. It reads app state, provides contextual messages, and offers action chips.

**Providers:**
- Gemini 2.5 Flash (default, free)
- Claude Sonnet (private option)

**Proxy:** `/.netlify/functions/ai-assist`

---

## Context Object

```javascript
{
  timeOfDay: 'morning'|'afternoon'|'evening',
  date, dayOfWeek, isWeekend,
  isFirstOpenToday,        // via ai_last_open_date
  streak,
  tasks: {
    pending, pendingWithAge,
    aging,                 // tasks with ageDays >= 3
    done, trello, overdueCount
  },
  habits,
  progress,
  weeklyStats,             // from today_daily_history — last 7 days (tasksDone, focusMins)
  proactiveObservation,    // from _getProactiveObservations()
}
```

---

## Intro Message Priority

1. Morning + first open → **Morning Briefing**
2. Sunday evening → **Weekly Reflection**
3. Aging tasks (3+ days) → **Stale Awareness** (always, not random)
4. Behavioral insight (patterns exist) → **Insight** (deterministic rotation by day+hour)
5. Overdue tasks → Overdue nudge
6. All done + tasks completed → **Celebrate**
7. Empty (no tasks, no done) → **Invitation**
8. Default → **Contextual** (varies by time, progress, energy)

---

## Special Moments

### Morning Briefing
> "Good morning. First look: 3 tasks waiting, 2 habits due, 1 been here a while. Day 5 of your streak."

### Stale Task Awareness (always when aging tasks exist)
> "fix the bike" has been here 5 days. Still relevant, or ready to let it go?
> (7+ days: suggests break_down instead)

### Sunday Reflection
> "Sunday evening. This week: 12 tasks done, 2 hours focused, streak at 7. How did it feel?"

### All-Done Celebration
Variable warm messages:
- "5 things done. The list is clear."
- "8 things handled. That's a solid day."
- "All clear. Day 7 of your streak."

### Empty State Invitation
> "Day 5. What's on your mind?"

---

## Proactive Observations

| Type | Priority | Example |
|---|---|---|
| `streak_record` | High | "Day 12 — your longest streak yet." |
| `streak_milestone` | High | "Day 14. That's worth noticing." |
| `peak_hour` | Medium | "It's 2pm — your most productive hour." |
| `focus_milestone` | Medium | "50 hours focused. That's real." |
| `yesterday_win` | Medium | "You cleared 8 things yesterday." |

24h cooldown per observation type.

---

## Energy Rhythm

Based on peak hour from memory:

| State | Context |
|---|---|
| Peak time (±1h) | "Good moment for demanding tasks." |
| Pre-peak (1-3h before) | "Still warming up. Light tasks." |
| Post-peak (1-2h after) | "Winding down. Quick wins." |

---

## Actions

Active chips (v2.17.25 — observation-first redesign):

| Action | Parameters | Effect | When |
|---|---|---|---|
| `start_focus` | `{id}` or `{ids:[...]}` | Begin pomodoro | When one task clearly fits the moment |
| `check_habit` | `{id}` or `{ids:[...]}` | Mark habit done | When habits are pending |
| `add_task` | `{text}` | Add new task | Empty state only |
| `move_soon` | `{id}` or `{ids:[...]}` | Park task to SOON | **Explicit user request only** (v2.17.74) — never proactive. Manual tasks only; handler ignores non-`manual_` ids |
| `reflect` | `{}` | Ask AI for reflection | Rarely — only with specific pattern insight |
| `dismiss` | `{}` | Close AI panel | Always last |

Multi-task actions use an `ids` array (v2.17.6) — handler iterates and applies the action to each ID. Chip label shows the count and first task name.

Available in handlers but not offered by AI (kept for edge cases):

| Action | Notes |
|---|---|
| `delete_task` | Deterministic aging chips only (7+ days old) |
| `check_task` | Handler exists, not in AI chip set |
| `break_down` | Handler exists, removed from AI — was never used |
| `delete_done` | Handler exists, not in AI chip set |
| `open_panel` | Handler exists, error state only |

**Chip limits:** 1–2 max per response (was 2–4). Always ends with dismiss.

---

## Personality

- Calm, present friend — not a manager
- Brief, warm, never urgent
- No exclamation marks
- Acknowledges effort without gamification
- Weaves observations naturally, doesn't lead with them

---

## Focus Companion (`_focusAskAI`)

A separate AI surface that lives inside the focus timer bar. Triggered by the ✦ ask button (dynamically created inside the focus IIFE). Returns a single question under 18 words that the user reads before starting a 25-minute session.

**Does NOT use** `_memoryForAI()` or the main AI panel's context object — it builds its own `_ctx` array.

### Signals sent (as `_ctx` array in user message)

| Signal | Source | When |
|---|---|---|
| Total pomodoros on task | `manualTask.focusSessions` or `_getTrelloFocusTotal()[id]` | sessions > 0 |
| Worked on task today | `manualTask.lastActive` date vs. today's local date | when sessions > 0 and worked today |
| Last session N days ago | `manualTask.lastActive` timestamp | sessions > 0, not worked today, gap ≥ 2 days |
| Task age | `_getCreatedFromId(id)` or `lastActive` | ageDays >= 3 |
| Revived | `manualTask.revived` | true |
| Deferred | `manualTask.zoneChangedAt` | truthy |
| Drag-word match | `appMemory.preferences.dragKeywords` intersect task words | any word length > 3 with freq ≥ 2 in drag list |
| Dominant letgo reason | `appMemory.patterns.letgoReasons` | one reason ≥ 35% of total, total ≥ 8 |
| Local time | `new Date()` + locale clock formatting | always — exact local hour/minute plus morning/afternoon/evening/late night |
| Peak hour match | `appMemory.preferences.peakHour ± 1h` | when peak hour is set |
| Today's sessions (other tasks) | `stat_focus_mins_today ÷ 25` | count ≥ 1 |

### Behavioral inferences (appended to system prompt)

Up to 4 confirmed inferences from `appMemory.memory` (semantic + episodic + procedural, `status === 'confirmed'`) are appended as `\n\nWhat we know about this person: ...` — added v2.53.0.

### System prompt character (v2.65.0)

“Focus catalyst” — not a friendly check-in, not a coach. Produces one question that creates a moment of clarity. Uses an explicit taxonomy of question types mapped to context signals:
- **Scope-setter** (first session): what does done look like for these 25 minutes?
- **Obstacle-surfacer** (2–3 sessions): what's actually in the way?
- **Scope-challenger** (4+ sessions): is there a smaller version that would close it?
- **Pick-up** (gap ≥ 2 days since last session): what do you need to pick up?
- **Pivot** (worked today already): what shifted since the last session?
- **Revival check** (revived): what's different this time?
- **Deferred check** (deferred): is this the right moment, or is energy the real issue?
- **Avoidance probe** (drag-word match): names the avoidance pattern directly
- **Energy fit** (letgo = no_energy): check if energy fits this task right now
- **Peak lever** (peak hour): what's the hardest part to tackle while sharp?
- **Wind-down** (3+ sessions today or late evening): is this the right task for now?

Word cap increased to 22 (was 18). Bad-question list added to system prompt: vague check-ins, affirmations, obvious yes/no questions. If the question mentions time, must use the supplied exact local time.

### Note on orphaned AI panel

`toggleAI()`, `openAI()`, `_aiSendFromInput()` exist but are unreachable since v2.49.0 removed the ✦ button from the input bar. The `#aiPanel` DOM element exists but has no trigger. The TODAY logo opens the Memory panel (`toggleMemory()`). These functions are dead code — left in place to avoid regressions if any edge path references them.

---

## Day-End Review (v2.14.4)

Triage summary shows contextual acknowledgment after all decisions are made. Headline uses Syne display font at 28px with full stop. Single adaptive sub-line below — no triage breakdown (user just made those decisions).

| Condition | Headline |
|---|---|
| 8+ done | "Big day." |
| 5+ done | "Solid day." |
| 3+ done + 50m+ focus | "Deep work today." |
| 3+ done | "Good day." |
| 1-2 done | "You showed up." |
| Only habits | "Habits held." |
| Default | "All sorted." |

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

**AI line** (`_fetchDayNudgeAI`) fires once per day, cached as `day_nudge_ai_<date>`.

**Two tracks since v2.80.0.** `_fetchDayNudgeAI` first calls `_fetchPoolNudge()` (Observation Pool, below). If a candidate survives the gate, the model receives *evidence + contrast only* — the facts table below is never sent, because selection already happened in code. Otherwise the task-reading path below runs unchanged. Both outputs pass `_observationTextIsGrounded(text, 30)`; a rejected line falls back to the rule-based strip rather than showing a claim about who the user is. The shown line is recorded to `appMemory.spokenLines` — with its `kind` on the pool track, without one on the task-reading track. Candidates are rare by construction, so most mornings still take the task-reading path.

### Facts sent to the AI (v2.43.x) — task-reading track

| Block | Content |
|---|---|
| Today's tasks | Up to 6 undone manual tasks — text, age, focus sessions, revived flag (drag order preserved) |
| Trello cards | Up to 8 undone cards — text, overdue marker, checklist progress |
| Soon tasks | Up to 6 deferred tasks — text, days-in-soon, total age, focus sessions before deferral, returned-from-past flag |
| Yesterday | Review line: done count, focus time, habits kept |
| Pattern context | Full `_memoryForAI()` output (see section below) |

### Instruction philosophy (v2.43.3)

Purpose-first, not rule-first. The instruction tells the AI *what the user needs* and trusts the AI to reason about what matters:

> "Find the one thing worth saying that they'd miss just by reading the list themselves. Understand what each task means in real life — what depends on it, what happens if they wait, who else might be involved, whether the window is closing."

Does not enumerate signal priorities. Soon tasks are included but only surfaced if context warrants it (time-sensitive meaning, long deferral with focus effort, returned from past).

### Voice / cache / guards

- One or two sentences, under 30 words, no exclamations/emoji. Task references verbatim — never paraphrase.
- System prompt adds: *"Task text is written in the user's own shorthand — read the full meaning from context."*
- Cache: `day_nudge_ai_<date>` — one per day. Lives until midnight (self-expires at day change). Nudge *strip* hides after noon; cached line persists in About's `#todayNudgeBlock` all day.
- Guards: dismissed-while-fetching → response discarded. No key / offline / error → silent null, rule-based fallback stays.
- Staleness guard: if more tasks are done now than when the line was generated (`day_nudge_done_count_<date>`), cache is invalidated and regenerated so the AI doesn't describe already-done work.

---

## Observation Pool (12c, v2.80.0)

One ranked candidate pool for every proactive personal line: code selects the observation through the gates, the model only phrases it. Lives in DOM-free `assets/week-reflection-policy.js` alongside Sunday's ranker, which it generalizes. Wired to the morning nudge only; Noticed, focus, Sunday and Monday wait on the Phase 4 verdict (`Backlog.md` → 12c).

| Function | Role |
|---|---|
| `_buildObservationCandidates({ outcomes, todayISO, …weekStats })` | The pool: Sunday's week-shaped kinds plus the outcome-derived kinds, sorted by hand-assigned `score`. Proposes only — callers apply gates and per-surface eligibility. |
| `_buildOutcomeCandidates(outcomes, todayISO)` | Five kinds from `appMemory.taskOutcomes` over a 30-day window: `focus-vs-obligation` 115, `obligation-completion` 105, `letgo-reason` 95, `soon-pullback` 88, `letgo-return` 85 (v2.81.0). Each is `{ kind, score, evidence, contrast }` — a contrast, never a cause; the person supplies the meaning. |
| `_observationGateExplain(candidate, { spokenLines, todayISO })` | `null` to keep, or a human-readable drop reason: age-as-content (triage already prints every task's age) or a per-kind cooldown hit against `spokenLines` entries with the same `kind`. Cooldowns are cross-surface — a kind narrated anywhere is on cooldown everywhere: 21 days for month-window kinds, 7–14 for week-shaped. |
| `_observationNoveltyGate(candidates, knowledge)` | Filters by the above. |
| `_observationTextIsGrounded(text, maxWords)` | Output guard shared by every pool-fed surface and by the nudge's task-reading track: rejects identity, causal and tenure claims and overlong text. `_weekReflectionTextIsGrounded` is this at 26 words. |

**Ranking is editorial, not statistical.** Base scores are hand-assigned judgment about which kinds matter; deviation from the user's own baseline is only a within-kind qualifying threshold. Cross-kind p-values are not comparable and are blind to semantics — `research/ObservationSelection.md`.

**Unknowns stay unknown.** Backfilled rows (`backfilled: true`) are excluded from `focus-vs-obligation`; rows with `obligation: null` fall out of both partitions. **Abstention is per surface:** the nudge falls through to its task-reading track; a surface that exists only to observe goes silent.

**Tests:** `scripts/observation-pool-test.mjs` (50) plus pool coverage in `nudge-test`, `insights-test` and `dropbox-test`. They assert the silences as well as the firings.

---

## Sunday Weekly Reflection (v2.17.56; evidence contract v2.71.12)

On Sundays, `#sundayBlock` may appear above the stat tiles in the About panel. The sentence is now signal-gated: `_buildWeekReflectionInsight()` ranks deterministic candidates from the same seven calendar days shown in the grid. Current candidates are focus/completion association, habit/completion association, a standout weekday that repeats across earlier instances, and concentrated two-day bursts. Relationships require observations on both sides; the burst candidate is deliberately weakest. The ranker and `_weekReflectionTextIsGrounded()` live in DOM-free `assets/week-reflection-policy.js`; the browser uses their globals while `week-reflection-unit-test.mjs` requires the same implementation directly for threshold/ranking tests.

The winning object contains `{kind, score, evidence, contrast}` (`meaning` renamed v2.80.0 when the pool generalized the ranker). `_fetchWeekReflection()` sends only that object to the AI. It no longer sends `_memoryForAI('weekly')`, lifetime days active, or `recentCompletedTasks`; the model gives a verified observation voice rather than deciding what is true from raw personal history.

**Voice:** one sentence, under 22 words; intentional, smart, useful, and quietly human. Light metaphor or dry wit is welcome when it clarifies the pattern. Identity claims, causal claims from correlation, tenure language, invented facts, and visible-counter paraphrases are forbidden. `_weekReflectionTextIsGrounded()` rejects identity/causal/tenure overclaims even if the model ignores the prompt.

**Abstention:** no qualifying candidate, `none`, missing AI, offline, or an invalid response hides the sentence. There is no factual fallback; the week grid already carries that information.

**Cache:** text remains `week_reflection_YYYY-MM-DD`. `week_policy_YYYY-MM-DD = earned-v1` is a policy/negative-cache companion, Dropbox-backed as `week_reflection_policy`. A current marker with no text means the evidence gate intentionally abstained. Old reflection text without the current marker is deleted and ignored during sync, preventing the reported “202 days in … that's who you are” line from surviving the new contract.

**Entry point:** `_fetchWeekReflection({days, history, insight})` via `/.netlify/functions/ai-assist`.

---

## Monday Intention (v2.30.0)

On Mondays, the same `#sundayBlock` slot shows an AI-generated intention prompt instead of the Sunday reflection. Different label ("New week") and different prompt framing — forward-looking rather than retrospective.

**Cache:** stored as `monday_intention_<date>` in localStorage, regenerated once per day.

**Fallback:** none — block is hidden if no AI key or offline.

**Task sources (v2.65.1):** manual tasks (undone, up to 5, done/past filtered), Soon tasks (up to 4), Trello cards (up to 4) — all included as labeled sections in the user message.

---

## Daily Brief — ✦ Empty-Tap

**Removed in v2.41.0.** `_showDailyBrief()` and its CSS (`.brief-container` etc.) were cut entirely. Empty ✦ tap now calls plain `openAI()` — the button does what it says ("Ask anything"), no special composed surface. Removal rationale: the brief lived under a CTA whose identity is "AI assistant," making it undiscoverable; its content (day nudge + poem) is already available in About through a predictable path.

---

## `_memoryForAI()` — Behavioral Context (v2.43.4)

Defined in `assets/insights.js`. Called from `_fetchDayNudgeAI()` (morning nudge) and from the main AI assistant context builder. Returns a plain-text paragraph of behavioral signals.

| Signal | Source | Notes |
|---|---|---|
| Peak productivity hour | `appMemory.preferences.peakHour` | Derived from `completionsByHour` |
| Best streak | `appMemory.patterns.bestStreak` | Historical high |
| Current streak | `localStorage.stat_streak` | More morning-relevant than best |
| Total focus time | `appMemory.patterns.focusMinutesTotal` | Shown when >60 min |
| Recent moments | `appMemory.moments` | Last 3: streak milestones, big clears |
| Days active | `appMemory.totalDaysActive` | Shown when >7 |
| Past suggestion history | `appMemory.suggestionHistory` | Last 30d, up to 5 tasks — what was suggested + what user did |
| Recent conversations | `appMemory.recentConversations` | Last 3 sessions |
| Recent completions (verbatim) | `appMemory.recentCompletedTasks` | Last 5 task texts — lets AI calibrate to user's writing style |
| Late-addition pattern | `appMemory.patterns.lateAdditions` | Shown when ≥40% of tasks added after 2pm |
| Task lifespan | `appMemory.patterns.taskLifespanSamples` | Rolling 20-sample average — "you typically close tasks in N days" |
| 7-day rhythm | `localStorage.today_daily_history` | Avg tasks/day + focus/day, trend vs. prior week |
| Habit context | `habitsList` + `habitCompletions` | Active habits, 7-day completion rate per habit, done-yesterday flag |
| Returning tasks (12a) | `appMemory.returningTasks` | Tasks on the list 5+ days, by name with day count; "never opened" marker at 7+ days and zero sessions. One emission per task since v2.79.1 — repetition was manufacturing salience |
| Obligation framing (12a) | `appMemory.obligationLanguageTally` + `obligationHistory` | Pending obligation-framed tasks by name; long-term completion rate once 10+ entries over 30 days (v2.78.0) |
| Voice memory (12a) | `appMemory.spokenLines` | Last 8 lines TODAY said, with surface and date — "do not repeat these, do not reuse their sentence shape" (v2.79.0). The pool track uses this deterministically instead, via the novelty gate |

**Task lifespan tracking:** `_memoryOnTaskComplete(taskText, taskId)` computes lifespan from `_getCreatedFromId(taskId)` on each completion and appends to `taskLifespanSamples` (capped at 20 entries).

## Focus Companion Question

See the canonical Focus Companion section above for its current context and prompt behavior, and `architecture/Focus.md` → Companion Question for UI/state details.

---

## Sending Messages from the Main Input Bar (v2.17.64)

`_aiSendFromInput(text)` — companion to `_aiAskFromPanel`. Called when the user types text in the main task input bar and submits to AI (✦ tap with text, or Enter while AI panel is open).

Same `_aiThread` / `_aiCall` / `_aiRenderResult` pattern as `_aiAskFromPanel`, but takes the already-extracted text as a parameter instead of reading `#aiNlInput`. Sets `_aiLoadedOnce = true` to prevent the concurrent panel auto-load from clobbering the response.

---

## Suggestion Cooldown + History

Prevents the AI from repeatedly suggesting the same aging task.

**Cooldown (`appMemory.suggestionCooldowns`):**
- Format: `{ taskId: 'YYYY-MM-DD' }` — date last suggested
- 7-day cooldown — task skipped for 7 days after suggestion
- Pruned nightly in `applyNewDayCleanup`: removes IDs not in `manualTasks` OR `trelloTasks`
- Bug fixed v2.15.2: was only checking `manualTasks` — Trello IDs were pruned every night, resetting cooldown
- Synced via Dropbox

**History (`appMemory.suggestionHistory`):**
- Format: `[{ taskId, taskText, suggested: 'YYYY-MM-DD', action: 'break_down'|'move_soon'|'delete_task'|'dismiss' }]`
- Recorded when user taps a chip action on a suggested task
- Max 50 entries, newest first
- Synced via Dropbox
- **Sent to AI via `_memoryForAI()` (v2.15.4)** — last 30 days, up to 5 tasks, grouped by taskText with action labels. AI uses this to write contextually aware messages.

## Post-add Inline Outcome Loop (v2.72.0)

This is separate from the assistant panel's aging-task history above. It learns on the existing row shown after a newly added task; it adds no panel, badge, setting, or recurring message.

Each shown offer appends one `appMemory.suggestionOutcomes` record with a stable ID, task/pattern, explicit reason (`multiple_actions`, `long_complex_task`, `vague_task`, or `other_complexity`), the visible reason text, and an ISO `offeredAt`. The model is asked for the enum; deterministic text/type rules classify older or malformed responses.

**Viewport delivery (v2.72.1):** generation and delivery are separate. The provider may finish while a newly added task is outside the viewport, but the result stays in closure-only pending state: no DOM row, animation, `offered` count, persisted outcome, or exposure timer exists yet. The task row is observed with a 64px bottom reserve so the action has room to appear; on entry, the row mounts and the normal outcome lifecycle begins. A mutation observer re-anchors the pending result when task rendering or sync replaces the DOM node. Pending delivery is discarded if a newer analysis supersedes it, the task text changes, the task is completed/removed/moved, or the user opens the AI panel. Provider responses carry an analysis sequence guard, preventing an older slow response from surfacing after a newer task. Browsers without `IntersectionObserver` use the same geometry check on scroll, resize, and foreground return.

**Visible-row ownership (v2.77.3):** once shown, the full-width helper remains a sibling of its task but is owned by stable task ID rather than DOM position. `_aiReanchorSuggestion()` runs after pointer/touch/Option+Arrow persistence and after `renderManual()` rebuilds, moving the existing helper element immediately after its owner without creating a second offer or restarting its outcome lifecycle.

**Outcome evidence:**

- **Applied:** the split chip was used; generated task IDs are attached to the offer.
- **Dismissed:** the explicit close chip was used.
- **Ignored:** the row accumulated ten seconds while both intersecting the viewport and in a visible document, then auto-expired. Off-screen time, background-tab time, and programmatic replacement are not counted.
- **Helped:** at least one generated step was later completed. This is the positive preference signal; application alone is weaker intent evidence.
- **Later reversed:** after a ten-minute undo grace, the original task was recreated or every generated step was deleted/let go before any generated step completed. Duplicate originals already present at apply time are excluded. Moving a step to Soon is not reversal.

**Reason policy:** no category judgment before four resolved offers. At four or more, a reason whose `(dismissed + ignored + reversed) / (applied + dismissed + ignored)` is at least 70% is reduced to deterministic one-in-four exploration. It is not permanently disabled, so changed behavior can produce recovery evidence. Categories with at least one completed generated step are described to the task-analysis model as preferred when multiple reasons genuinely fit. This replaces the old all-or-nothing global suppression ratio.

Records cap at 100. Dropbox merges them by stable offer ID, unions result IDs and monotonic event timestamps, and treats completion evidence as stronger than a conflicting reversal from another device. The aggregate reason evidence is sent only with the post-add analysis request to the user's configured provider; there is no analytics or TODAY server telemetry.
