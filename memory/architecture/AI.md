# AI Companion System

> AI assistant architecture, context, actions, and personality.

---

## Overview

The AI companion is accessed via the ✦ button. It reads app state, provides contextual messages, and offers action chips.

**Providers:**
- Gemini 2.5 Flash (default, free)
- Claude Haiku (private option)

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
  weeklyStats,
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

| Action | Parameters | Effect |
|---|---|---|
| `start_focus` | `{id}` | Begin pomodoro |
| `check_task` | `{id}` | Mark done |
| `check_habit` | `{id}` | Mark habit done |
| `add_task` | `{text}` | Add new task |
| `break_down` | `{id}` | Ask AI to split big task into 2-4 subtasks |
| `move_soon` | `{id}` | Park task in SOON zone |
| `delete_task` | `{id}` | Remove task |
| `delete_done` | `{}` | Clear completed |
| `open_panel` | `{panel: 'habits'}` | Open habits |
| `reflect` | `{}` | Ask AI for warm day reflection |
| `dismiss` | `{}` | Close AI panel |

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

## Morning Reflection (v2.13.1)

Morning nudge (before noon) shows yesterday's review if available:

> Yesterday: 5 done, 1h focused, 2 habits · 3 carried over

Falls back to simple carried-over count if no review exists. Auto-clears after noon. Tap to dismiss.
