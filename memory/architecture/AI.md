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

### Facts sent to the AI (v2.43.x)

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

## Sunday Weekly Reflection (v2.17.56)

On Sundays, `#sundayBlock` appears above the stat tiles in the About panel. Shows an AI-generated one-sentence reflection (warm, honest, under 15 words) based on the week's stats (tasks done, focus time, habits kept).

**Cache:** stored as `week_reflection_YYYY-MM-DD` in localStorage, regenerated once per day.

**Fallback:** if no AI key or offline, shows a rule-based summary ("3 tasks done. 90m of focus. 4/5 habits.").

**Entry point:** `_fetchWeekReflection({wT, wF, wHK, wHT})` via `/.netlify/functions/ai-assist`.

System prompt: *"One sentence only. No quotes. Under 15 words. Plain, warm, grounded."*

---

## Monday Intention (v2.30.0)

On Mondays, the same `#sundayBlock` slot shows an AI-generated intention prompt instead of the Sunday reflection. Different label ("New week") and different prompt framing — forward-looking rather than retrospective.

**Cache:** stored as `monday_intention_<date>` in localStorage, regenerated once per day.

**Fallback:** none — block is hidden if no AI key or offline (unlike Sunday which has a rule-based fallback).

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

**Task lifespan tracking:** `_memoryOnTaskComplete(taskText, taskId)` computes lifespan from `_getCreatedFromId(taskId)` on each completion and appends to `taskLifespanSamples` (capped at 20 entries).

## Focus Companion Question (v2.45.0)

`_focusAIFetch(taskText)` — called when the user taps ✦ in focus mode. Sends a ~40-word prompt with only the task text (no `_memoryForAI()`). The model returns one short question — either naming a challenge behind the task or asking what "done enough" looks like for this session. Response is stripped of any preface ("what question…") before display.

Sits outside the main `_aiThread`/`_aiCall` stack — a one-shot fetch with its own element (`.focus-ai-q`) and state flag (`ai-active` class on `.focus-kbd-hint`). Reset by `closeUI`. Silent fail when AI is not configured.

See `architecture/Focus.md` → Companion Question for UI/state details and the opacity gotcha (v2.45.1).

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
