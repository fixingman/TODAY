# Research: Past, Today, Soon — A Temporal Model for Tasks

*Exploration: Mar 22, 2026*

---

## The Concept

Instead of traditional task management (inbox, projects, due dates), TODAY could embrace a **temporal trinity**:

| Zone | Meaning | Feeling |
|------|---------|---------|
| **PAST** | What didn't happen yesterday | Acknowledgment without guilt |
| **TODAY** | What matters right now | Focus, intention |
| **SOON** | What's coming, not yet urgent | Anticipation, preparation |

This is not a calendar. It's not scheduling. It's a **mindset model** — where does this task live in your consciousness?

---

## Philosophy

### Why This Fits TODAY

The app is called TODAY. But "today" only has meaning in relation to yesterday and tomorrow. By naming the zones **Past, Today, Soon**, we:

1. **Acknowledge time's passage** — tasks don't exist in a vacuum
2. **Reduce guilt** — Past isn't "failed", it's "acknowledged"
3. **Create gentle anticipation** — Soon isn't "overdue", it's "approaching"
4. **Keep focus on now** — Today remains the center

### The Emotional Journey

| Traditional | TODAY |
|-------------|-------|
| Overdue → anxiety | Past → "it didn't happen, and that's okay" |
| Due today → pressure | Today → "what matters right now" |
| Due later → forgotten | Soon → "it's coming, I'm aware" |

### Key Principle: No Hard Boundaries

Tasks don't "fail" by being in Past. They don't "expire". The zones are **fluid states of attention**, not deadlines.

---

## Design Exploration

### Option A: Three Sections (Vertical)

```
┌─────────────────────────────────────┐
│ PAST                           ← 2  │
│ · fix the bike                      │
│ · call mom                          │
├─────────────────────────────────────┤
│ TODAY                          ← 5  │
│ ○ finish report                     │
│ ○ email client                      │
│ ○ pack luggage                      │
│ ○ groceries                         │
│ ○ exercise                          │
├─────────────────────────────────────┤
│ SOON                           ← 3  │
│ · dentist appointment               │
│ · quarterly review                  │
│ · renew passport                    │
└─────────────────────────────────────┘
```

**Pros:** Clear separation, easy scanning
**Cons:** More visual complexity, departs from single-list simplicity

### Option B: Inline Badges (Current Style)

```
┌─────────────────────────────────────┐
│ 5 TODAY                             │
│ ○ finish report                     │
│ ○ email client                      │
│ ○ pack luggage                      │
│ ○ groceries                         │
│ ○ exercise                          │
│                                     │
│ PAST · fix the bike                 │
│ PAST · call mom                     │
│                                     │
│ SOON · dentist appointment          │
│ SOON · quarterly review             │
└─────────────────────────────────────┘
```

**Pros:** Maintains single list feel
**Cons:** Mixed zones might feel cluttered

### Option C: Swipe/Gesture Zones (Horizontal)

```
    ← PAST │ TODAY │ SOON →
           │       │
    Swipe left to  │  Swipe right to
    acknowledge    │  defer to soon
```

The main view is always TODAY. Swipe to see/move to other zones.

**Pros:** Clean TODAY focus, gesture-based
**Cons:** Hidden zones might be forgotten

### Option D: Collapsed Zones

```
┌─────────────────────────────────────┐
│ PAST (2) ▸                          │
├─────────────────────────────────────┤
│ 5 TODAY                             │
│ ○ finish report                     │
│ ○ email client                      │
│ ○ pack luggage                      │
│ ○ groceries                         │
│ ○ exercise                          │
├─────────────────────────────────────┤
│ SOON (3) ▸                          │
└─────────────────────────────────────┘
```

PAST and SOON are collapsed by default, expandable.

**Pros:** TODAY stays primary, zones accessible
**Cons:** Collapse/expand adds interaction complexity

---

## Interactions

### Moving Tasks Between Zones

| Gesture | Action |
|---------|--------|
| Swipe left | Move to PAST (acknowledge) |
| Swipe right | Move to SOON (defer) |
| Tap checkbox | Complete (removes from all zones) |
| Long press | Options menu |

### Automatic Zone Transitions

| Event | Behavior |
|-------|----------|
| Midnight | Uncompleted TODAY → PAST |
| Morning | SOON tasks due today → TODAY |
| User adds task | Goes to TODAY by default |
| User adds "soon: task" | Goes to SOON |

### AI Companion Integration

Evening (with PAST tasks):
> "2 things moved to past. Bring them back, or let them rest?"

Morning (with SOON tasks becoming due):
> "Dentist appointment is today now. 3 things waiting."

---

## Data Model

```javascript
// Task structure
{
  id: 'manual_123',
  text: 'finish report',
  zone: 'today',           // 'past' | 'today' | 'soon'
  zoneChangedAt: 'ISO',    // when it moved to current zone
  originalZone: 'today',   // where it started
  soonDate: null,          // optional: when SOON becomes TODAY
}

// localStorage
today_tasks_past: [...],   // or unified list with zone property
today_tasks_today: [...],
today_tasks_soon: [...],
```

---

## Visual Language

### Colors (using existing tokens)

| Zone | Color | Meaning |
|------|-------|---------|
| PAST | `--color-muted` (grey) | Acknowledged, dimmed |
| TODAY | `--color-accent` (lime) | Active, present |
| SOON | `--color-highlight` (blue) | Future, calm |

### Typography

| Zone | Style |
|------|-------|
| PAST | Normal weight, 50% opacity |
| TODAY | Normal weight, 100% opacity |
| SOON | Normal weight, 70% opacity, italic? |

### Section Headers

```
PAST        (not "Yesterday" — past is more forgiving)
TODAY       (not "Due today" — today is intention, not deadline)
SOON        (not "Upcoming" — soon is gentle anticipation)
```

---

## Principles

### 1. TODAY is Always Primary
The app opens to TODAY. Other zones are accessible but secondary.

### 2. No Zone is Punitive
PAST isn't "failed". SOON isn't "procrastinated". They're just different temporal states.

### 3. Movement is Intentional
Tasks don't automatically move without acknowledgment. The user stays in control.

### 4. Zones are Mindsets, Not Deadlines
"Soon" doesn't mean "due date". It means "I'm aware this is coming."

### 5. Simplicity Over Features
If zones add too much complexity, they're not worth it. The current single-list is valid.

---

## Open Questions

1. **Should PAST persist indefinitely?**
   - Option A: Forever (becomes archive)
   - Option B: 7 days, then auto-delete
   - Option C: User clears manually

2. **Should SOON have dates?**
   - Option A: No dates (just "soon")
   - Option B: Optional dates (becomes TODAY when due)
   - Option C: Required dates

3. **How explicit should zone transitions be?**
   - Option A: Silent (midnight auto-move)
   - Option B: Morning summary ("3 moved to past")
   - Option C: Require user action

4. **Does this replace or extend current model?**
   - Option A: Replace (all tasks have zones)
   - Option B: Extend (zones are optional layer)

---

## Alternative: Keep It Simple

Maybe zones are overengineering. The current model with AI-assisted "let go" might be enough:

| Current | With AI |
|---------|---------|
| Tasks linger forever | AI asks: "Still relevant?" |
| No past/future concept | AI notices aging, suggests action |
| Single list | Single list + AI awareness |

The temporal model could live **in the AI's awareness** rather than in the UI structure.

---

## Recommendation

**Start with Option D (Collapsed Zones)** as the least disruptive change:

1. Add PAST section (collapsed) at top
2. Add SOON section (collapsed) at bottom
3. TODAY remains the primary, always-visible list
4. Swipe gestures to move between zones
5. AI acknowledges zone changes naturally

This preserves TODAY's simplicity while adding temporal awareness.

---

## Next Steps

1. **Decide:** Is this worth the complexity?
2. **Prototype:** Build collapsed zones UI
3. **Test:** Does it feel right?
4. **Iterate:** Adjust based on usage

---
