# UI Components

> Specifications for key UI components.

---

## Task Row

```
┌─────────────────────────────────────────┐
│ ○  Task text here                    ×  │
└─────────────────────────────────────────┘
```

- Checkbox: 16×16px circle, accent border on hover
- Text: `--text-task` (13.5px), `--font-mono`
- Delete button: `×`, appears on row hover (desktop), opacity 0→1
- Link arrow: ↗ (`.task-link`) — opens `task.url` in new tab. Trello tasks get URL from API; manual tasks extract URL from input at creation. Title: "Open in Trello" or "Open link"
- Done state: strikethrough, muted opacity

### Task Aging

| Age | CSS attribute | Opacity |
|-----|---------------|---------|
| Day 0–2 | none | 100% |
| Day 3–4 | `data-age-bucket="young"` | 75% |
| Day 5–6 | `data-age-bucket="mid"` | 55% |
| Day 7+ | `data-age-bucket="old"` | 35% |

Hover restores to 85%. Age resets to 0 on focus session complete.

---

## Habit Row

Same structure as task row. Progress indicator: `done/7` weekly view. Resets daily, history preserved.

---

## Add Task Bar

Fixed at bottom, outside `.app` container.

```
┌─────────────────────────────────────┬───┐
│ What's on your mind?                │ ✦ │
└─────────────────────────────────────┴───┘
```

- Input: full width minus button
- ✦ button: opens AI panel (or adds task if AI not configured)
- Enter: always adds task

---

## AI Panel

Slides up from bottom with spring easing (`--ease-spring`, `--dur-slow`).

```
┌─────────────────────────────────────────┐
│ AI message here...                      │
│                                         │
│ [Action chip] [Action chip] [Dismiss]   │
└─────────────────────────────────────────┘
```

- Background: `--color-surface`
- Max height: 45vh, scrollable
- Actions: rendered as chips, execute immediately

---

## Triage Callout Bar

Fixed, centered above the input bar. 8pm–midnight when undone tasks exist.

```
┌─────────────────────────────┐
│  3 didn't happen  [Review]  │
└─────────────────────────────┘
```

- Background: `--surface2`, border: `--accent-glow`
- Entire bar is tappable → opens triage overlay
- Controlled by `_triageActive`, `_triageBarSilent`, `_triageBarShown` flags
- Dismissed for the day on triage completion or `triageClose()`

---

## Triage Overlay

Slides up from bottom (same as AI panel). Full-screen backdrop.

```
┌──────────────────────────────────────────────────┐
│  3 didn't happen                  [Keep all]      │
│  ──────────────────────────────────────────────  │
│  Task one   [Keep] [↩ Soon] [Let go] [Done]      │
│  Task two   [Keep] [↩ Soon] [Let go] [Done]      │
└──────────────────────────────────────────────────┘
```

- **Done** (v2.18.0) = completed but never checked off → marks done (counts toward today's total via `_markDoneInTriage`), no celebration. Order: `Keep / ↩ Soon / Let go / Done` (Trello cards drop Soon → `Keep / Let go / Done`). **Done sits last and is neutral as of v2.18.19** — only Keep carries the accent treatment; Soon, Let go, and Done are neutral. (Previously Done led and shared Keep's accent green; moved + neutralised so the row's positive accent points only at "Keep".)
- The leading `○` checkbox marker was removed (v2.18.1) so the four buttons get the full row width and stay one line on phones; rows are flush to the section edge.
- Backdrop tap → `triageMinimize()` → returns to callout bar.

### Triage Summary (v2.14.4)

After all decisions, replaces task list for 3s before auto-close:

```
┌─────────────────────────────────────────┐
│                                         │
│           Solid day.                    │  ← DM Mono --text-lg (16px) weight 500
│         5 done · 1h focused             │  ← --text-sm2 muted
│                                         │
└─────────────────────────────────────────┘
```

---

## Focus Mode Timer

Appears below focused task, replaces task row bottom area.

```
┌─────────────────────────────────────────┐
│              25:00                      │
│ ════════════════════════════            │
│         [breathe]  [rest]               │
└─────────────────────────────────────────┘
```

- Timer: `--font-display`, large accent text
- Progress bar: fills left to right
- Controls: slide up on task hover/tap
- Non-focused tasks recede to 7% opacity

---

## Sticky Header

```
┌─────────────────────────────────────────┐
│           TODAY                    ⏱ ✦ i│
│ THURSDAY, MARCH 19       ═══════ 20/39  │
└─────────────────────────────────────────┘
```

- Logo: `--font-display`, `--accent`
- Progress bar: accent fill (flow rate)
- Icons: timer, AI, info

**Critical:** Must be BEFORE `.app` div in DOM.

---

## Error Log Dot + Panel (v2.14.3)

Fixed top-right. Pulses when errors exist.

```
●  ← red dot (10px, top: 8px, right: 8px, z: 9999)

┌──────────────────────────────┐  ← panel (z: 9998)
│ 00:21:16  [Dropbox]          │
│ Token refresh — 401          │
├──────────────────────────────┤
│ 00:22:01  [External]         │
│ Script error at chrome-ext   │
└──────────────────────────────┘
```

- Panel: 220px wide, anchored top-right below dot, flat top-right corner
- Fades in with `fadeIn --dur-base` (same as config panels)
- No backdrop — content stays interactive behind it
- Dot is the toggle: tap to open, tap again to close and clear log
- Source badges: Dropbox/Trello/Sync (blue), External (muted), App (red)

---

## Day Nudge (unified, v2.19.0)

Single `.morning-nudge` strip (`#dayNudge`) positioned **between the SOON and Trello sections**, visible before noon. Replaces the separate `#morningNudge` (under Your tasks) and `#trelloNudge` (under From Trello) that existed through v2.18.x — Can: "two nudges were too much to concentrate and focus on."

```
• 2 tasks still here from yesterday · 1 overdue in Trello
```

- **Rule-based tier 1** — leads with what's pressing: carried-over tasks first, then overdue Trello cards (or plain card count if none overdue); max two clauses joined with ` · `. Yesterday's review only appears when nothing is pressing (no carried-over tasks, no Trello cards). Falls back to hidden if nothing to say.
- **AI tier 2** (`_fetchDayNudgeAI`) — sees both manual tasks (with ages) and Trello cards (with overdue/checklist markers) in one prompt; asked to name the single most important thing. Same 1s race via `_raceAINudge` — cached per day, no mid-read swap (BUG-034).
- **Dismiss** — tap sets `day_nudge_dismissed_<date>` (per-day, clears at midnight). Synced cross-device via `_DISMISS_SYNC` registry. Legacy `trello_nudge_dismissed` / `morning_nudge_dismissed` fields kept as transition rows in registry for mixed-version devices — remove once all devices ≥ v2.19.0.
- **Presence:** same `.morning-nudge` CSS as before — `--surface` panel, 2px `--accent-dim` left edge, `radius-md`, `padding: 7px var(--space-3)`. Breathing `--accent` dot via `_breathe(_KF_BREATHE_SMALL, 2400ms)` (opacity 1→0.5 + scale 1→0.85 — small-element treatment per Motion.md).
- Noon cutoff: `checkDayNudge()` hides element and prunes legacy AI-cache keys at `hour >= 12`.

---

## Week Summary (About panel)

Lives in `#infoPanel` under "This week". Rendered by `renderInfoStats()`. Hidden entirely
until `today_daily_history` has any data (`_hasData` guard).

```
 S   M   T   W   T   F   S      ← #weekGrid (.week-col × 7)
 ▁   ▃   █   ▅   ·   ▂   ▄      ← .week-col-bar / -fill (height ∝ tasks vs week max)
 1   3   6   4   ·   2   3      ← .week-col-tasks (today = accent)
             •                  ← .week-col-dot (standout day only)
30m  1h  2h  1h      45m 1h     ← .week-col-focus
```

- **Bars (①):** track 6×26px, fill `--accent-dim` (today `--accent`), nonzero floor 14%,
  height transitions `--dur-slow`/`--ease-out`.
- **Your-day dot (②):** quiet accent dot under the single strict-max day (week total ≥4, not
  today). No label — recognition, not a trophy.
- **No text lines below the grid (v2.17.66):** `#weekNarrative`, `#weekCompare`, `#weekRhythm`
  were removed. Rule-based phrases became wallpaper after first reading — the visual bars
  already show the week's shape. The Sunday AI block handles the one case where words add value.

---

## Empty States

| State | Message |
|-------|---------|
| No tasks added | "Nothing added yet" |
| All done | "✦ Clear" (with breathing animation) |

---

## Idle Companion

Bottom-right corner, 60% opacity, `--font-mono`. Appears after 45s idle.

Creatures: Dino, Fish, Bird, Cat, Snail, Crab, Star

Fades in over 0.6s, fades out on activity.

---

## Splash Screen

Full-screen overlay (`z-index: 500`, `pointer-events: all`) shown on cold app open. Covers the task list while it loads — `pointer-events: all` prevents accidental taps reaching tasks below.

**Animation:** Typewriter date string at 38–66ms per character, then 500ms cursor hold, then dismiss.

**Gate system:** Two parallel signals must both fire before dismiss:
- `_splashAnimDone` — set by the 500ms cursor timeout
- `_appLoadDone` — set after Dropbox pull + local render completes

**Skip logic (`splash_shown_at` in localStorage):**
- Splash was shown within the last **30 minutes** → skip (covers iOS background kill + restore, which happens within seconds)
- Splash was shown more than 30 minutes ago → show (genuine desktop close + reopen)
- localStorage cleared → always show

This 30-minute window replaced an earlier date-key approach (`splash_shown_date`) which was once-per-day and blocked desktop PWA close + reopen from seeing the splash.
