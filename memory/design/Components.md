# UI Components

> Specifications for key UI components.

---

## Task Row

```
┌─────────────────────────────────────────┐
│ ○  Task text here                    ⋮  │
└─────────────────────────────────────────┘
```

- Checkbox: 18×18px, accent border on hover
- Text: `--text-task` (13.5px), DM Mono
- Drag handle: appears on hover (desktop) or long-press (mobile)
- Done state: strikethrough, muted opacity

### Task Aging

| Age | Opacity |
|-----|---------|
| Day 1-2 | 100% |
| Day 3-4 | 75% |
| Day 5-6 | 55% |
| Day 7+ | 35% |

Via `data-age-days` attribute. Hover restores to 85%.

---

## Habit Row

```
┌─────────────────────────────────────────┐
│ ○  Habit name                     3/7   │
└─────────────────────────────────────────┘
```

- Same structure as task
- Progress indicator: `done/7` for weekly view
- Resets daily, history preserved

---

## Add Task Bar

Fixed at bottom, outside `.app` container.

```
┌─────────────────────────────────────┬───┐
│ What's on your mind?                │ ✦ │
└─────────────────────────────────────┴───┘
```

- Input: full width minus button
- ✦ button: opens AI panel
- Enter: always adds task (no mode switching)

---

## AI Panel

Slides up from bottom with spring easing.

```
┌─────────────────────────────────────────┐
│ AI message here...                      │
│                                         │
│ [Action chip] [Action chip] [Dismiss]   │
└─────────────────────────────────────────┘
```

- Background: `--color-surface2`
- Border-top: accent glow
- Actions: rendered as chips, execute immediately

---

## Focus Mode Timer

```
┌─────────────────────────────────────────┐
│              25:00                      │
│ ════════════════════════════            │
│         [breathe]  [rest]               │
└─────────────────────────────────────────┘
```

- Timer: large accent text
- Progress bar: fills left to right
- Controls: appear on hover/tap

---

## Sticky Header

```
┌─────────────────────────────────────────┐
│           TODAY                    ⏱ ✦ i│
│ THURSDAY, MARCH 19       ═══════ 20/39  │
└─────────────────────────────────────────┘
```

- Logo: Syne font, accent color
- Progress bar: accent fill
- Icons: timer, AI, info

**Critical:** Must be BEFORE `.app` div, not inside it.

---

## Empty States

| State | Message |
|-------|---------|
| No tasks added | "Nothing added yet" |
| All done | "✦ Clear" (with breathing animation) |

---

## Idle Companion

Bottom-right corner, 60% opacity, DM Mono.

Creatures: Dino, Fish, Bird, Cat, Snail, Crab, Star

Appears after 45s idle, fades on activity.
