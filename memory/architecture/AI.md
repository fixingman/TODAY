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
3. Aging tasks + 30% roll → **Stale Awareness**
4. Overdue tasks → Overdue nudge
5. All done + tasks completed → **Celebrate**
6. Empty (no tasks, no done) → **Invitation**
7. Default → Standard contextual

---

## Special Moments

### Morning Briefing
> "Good morning. First look: 3 tasks waiting, 2 habits due, 1 been here a while. Day 5 of your streak."

### Stale Task Awareness (~30% chance)
> "I notice 'fix the bike' has been here 5 days. Still relevant, or ready to let it go?"

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
| `delete_task` | `{id}` | Remove task |
| `delete_done` | `{}` | Clear completed |
| `open_panel` | `{panel: 'habits'}` | Open habits |
| `dismiss` | `{}` | Close AI panel |

---

## Personality

- Calm, present friend — not a manager
- Brief, warm, never urgent
- No exclamation marks
- Acknowledges effort without gamification
- Weaves observations naturally, doesn't lead with them
