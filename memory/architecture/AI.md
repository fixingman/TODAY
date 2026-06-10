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

Morning nudge (before noon) shows yesterday's review if available:

> Yesterday: 5 done, 1h focused, 2 habits · 3 carried over

Falls back to simple carried-over count if no review exists. Auto-clears after noon. Tap to dismiss.

**AI upgrade (v2.17.73):** the rule-based line renders instantly, then `_fetchMorningNudgeAI(review, carriedOver)` fires one background call and swaps the text in place (200ms fade) when the response arrives.

- **Context sent:** weekday, streak, yesterday's review line, carried-over count, up to 6 pending task names with ages (≥2 days shown).
- **Insight gate (in prompt):** "If something non-obvious is worth noticing — an aging task, a pattern, a gentle nudge — say that, naming the task naturally. Otherwise state the morning plainly."
- **Voice:** one sentence, under 18 words, no quotes/exclamations/emoji. Same system-prompt style as the Sunday reflection.
- **Cache:** `morning_nudge_ai_YYYY-MM-DD` — one generation per day. Stale keys pruned on write; today's key cleared at noon alongside the other nudge keys.
- **Guards:** dismissed-while-fetching → response discarded. No key / offline / API error → silent null, rule-based message stays (mirrors `_fetchWeekReflection`).

---

## Sunday Weekly Reflection (v2.17.56)

On Sundays, `#sundayBlock` appears above the stat tiles in the About panel. Shows an AI-generated one-sentence reflection (warm, honest, under 15 words) based on the week's stats (tasks done, focus time, habits kept).

**Cache:** stored as `week_reflection_YYYY-MM-DD` in localStorage, regenerated once per day.

**Fallback:** if no AI key or offline, shows a rule-based summary ("3 tasks done. 90m of focus. 4/5 habits.").

**Entry point:** `_fetchWeekReflection({wT, wF, wHK, wHT})` via `/.netlify/functions/ai-assist`.

System prompt: *"One sentence only. No quotes. Under 15 words. Plain, warm, grounded."*

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
