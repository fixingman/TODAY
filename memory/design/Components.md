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

## Button Nudges (v2.20.0–2.21.0)

Header buttons breathe (shared `icon-colour-pulse` keyframe: `color` muted→accent, 2.4s ease-in-out, colour-only — no scale, no badge) when something is waiting inside. Clears on panel open via a per-day localStorage key; never re-fires the same day.

| Button | Class | When | Clear key |
|---|---|---|---|
| `#infoBtn` ℹ︎ | `.btn-icon-sunday` | Sundays, `today_daily_history` non-empty | `sunday_nudge_seen_<date>` |
| `#infoBtn` ℹ︎ | `.btn-icon-version` | New app version (stored `today_seen_version` ≠ `APP_VERSION`); first run: silently adopts, no pulse | `today_seen_version` (per-version, not per-day) — on clear, CURRENT badge in changelog breathes ~3× via IntersectionObserver then stops (WAAPI, finite) |
| `#habitsBtn` ◎ | `.btn-icon-habits` | 10pm–3am, ≥1 active habit incomplete | `habit_nudge_opened_<habitISO>` (also clears instantly when last habit checked) |

Habits panel additionally shows a muted countdown line (`.habit-countdown`, rendered by `renderHabits()`): `Xh Ym left today` 10pm–midnight, then `before 3am` midnight–3am — deliberately no ticking minutes after midnight (surfaces the boundary without clock anxiety). Hidden when all done or outside the window.

---

## Meeting Mode (v2.22.0 desktop, v2.28.0 mobile)

Listens to a meeting through the mic; the only artifact is tasks. No transcript, no meeting history, no voice ID — fully ephemeral (state lives in module-level `_mtg`, nulled in `_meetingTeardown()`; zero meeting localStorage keys).

**Entry:** mic SVG button (`#meetingBtn`, `.add-mic-btn`) in the add bar between input and ✦. Revealed by `_meetingInit()` only when: `_meetingSupported()` passes (capability-only gate: `getUserMedia` present + `MediaRecorder` present + at least one supported MIME — `webm/opus` on desktop, `audio/mp4` on iOS) AND Gemini key set (`_aiGetKey() && _aiGetProvider()==='gemini'` — Anthropic has no audio input). Re-checked after AI connect/forget. Phone-call recording is impossible on iOS — the OS never exposes call audio to any app; meeting mode = in-room/speakerphone only.

**Listening (non-blocking):** `#meetingPill` fixed above the add bar — breathing **red** dot (`--danger`, `_KF_BREATHE_SMALL`, 2400ms; red = universal recording signal), elapsed `MM:SS`, `stop` button (labelled "stop" not "×" — × reads as delete in this app). The app stays fully usable; tasks can be added mid-meeting. Can explicitly rejected the full-screen listening mockup. Mic button gets `.live` (accent) while recording; clicking it again also stops.

**Pipeline:** `getUserMedia` → `MediaRecorder` at **32 kbps** (`audioBitsPerSecond: 32000`) via recorder **stop/restart** (never `timeslice` — later chunks aren't independently decodable). MIME: `webm/opus` on desktop (6-min chunks ≈ 1.9MB base64, under Netlify's 6MB limit); `audio/mp4` on iOS (iOS ignores `audioBitsPerSecond`, AAC can hit ~192 kbps → **2-min chunks** (`_mtg.chunkMs = 120000`) ≈ 3.95MB worst case; pre-send `blob.size > 4300000` size guard drops oversized chunks). Each chunk → base64 → `netlify/functions/meeting-extract.js` → Gemini 2.5 Flash (audio inline, transcribe-internally prompt, transcript never in the response) → `{actionItems:[{text,owner,mine}], updatedContext}`. Items are phrased in the meeting's spoken language (auto-detect, prompt-enforced — v2.27.2); attribution works cross-language. Rolling context string (speaker hints, open threads, ≤150 words) carries attribution across chunks — in memory only. Chunk failure: retry once (retries reuse the originally captured `_mtg` so a discarded meeting's chunk can't write into a new one), then drop + `_logSyncError('Meeting', …)` — a lost chunk beats a dead meeting.

**Review panel (v2.23.7):** `#meetingOverlay` (fixed scrim, bottom sheet, slideUp). Three states rendered by `_meetingRenderReview()`:
- **State 1 — digesting, no prior items:** title "Digesting…" (white 15px), sub hidden, Add disabled; centred focal loader (5px dots + "last X min" below).
- **State 2 — digesting + prior items showing:** title "From your call", sub visible; inset strip `.meeting-processing-strip` ("Still digesting last X min") above items.
- **State 3 — review ready:** title "From your call", sub visible; thin `--border` rule separates header from items.
- **Empty result:** "Nothing came up" (no star prefix). Title: "From your call".
Header: `.meeting-eyebrow` ("Meeting", 9px muted caps) + `.meeting-review-title` (15px white, state-driven) + `.meeting-review-sub` (muted xs, conditional). Items with `mine: true` start pre-selected (v2.32.0 — reliable once names captured at tap via v2.31.0; was unselected in v2.25.4 when name was often missing). Owner shown as muted hint label. Tap to toggle; Add-count updates live. Accept → `manualTasks.push` + `renderManual()` + `dropboxAutoSave()`.

**Attribution without voice ID:** `today_user_name` ("Your first name…" input in the AI config section; fill-if-empty on merge, in backup payload) tells the prompt whose commitments to flag. The review tap is the final identity filter — AI optimizes recall, Can's tap is precision.

**Mobile (v2.28.0) — Screen Wake Lock + suspension handling:** `_meetingWakeLock()` acquires `navigator.wakeLock.request('screen')` on iOS 16.4+ (non-fatal on failure); acquired on meeting start and reacquired in `_meetingHealthCheck` (Wake Lock auto-releases on page hide — must reacquire each time). Released in `_meetingStop` and defensively in `_meetingTeardown`. Backgrounding or screen lock kills the iOS `getUserMedia` stream silently — audio tracks report `readyState === 'ended'` on resume. Detection: `visibilitychange` handler stamps `_mtg.hiddenAt` on hide; on visible calls `_meetingHealthCheck()`. Health check: dead tracks → `_meetingSuspendEnd()` (honest note, stops meeting); alive + `paused` → `rec.stop()` (onstop ships partial, restarts); alive + `inactive`/null → restart chunk. Honest-note UI: `.meeting-suspend-note` (muted xs text) prepended in all review states when `state.suspendNote` set. `finalChunkSecs` computed from `hiddenAt` when suspended so "Digesting last X min" counts pre-lock audio only. onstop identity guard (`_mtg.recorder === rec`) prevents double-restart from preempted recorder's late callback. Pending: real-device verify (iPhone PWA + Gemini key).

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

Since v2.26.0 the calm states echo the day's poem (same `_poemOfTheDay()` the splash coda
and About panel show — the echo re-surfaces the morning's poem, that's the point):

| State | Content |
|-------|---------|
| No tasks added | The day's poem + author (`.empty-poem` + `.poem-author`); fallback "Nothing added yet" if corpus missing |
| All done | Breathing ✦ (`.done-star.echo-star`, block-level above the poem) + the day's poem; fallback "✦ All done" |

Built by `_poemEchoHTML()` inside `updateManualEmptyState()`. Poem text is `esc()`-escaped,
`\n` → `<br>`. Type: `--text-base`, weight 300, line-height 1.8 (`--text-sm2`/1.7 ≤600px).

---

## Daily Brief (v2.31.x)

Triggered by tapping ✦ with an empty input. The same ✦ button, rerouted — "here's what I'd tell you right now" instead of "ask me something."

**Two-part content:**
1. **AI nudge line** — the day's cached nudge sentence (`day_nudge_ai_<date>`) read back as a composed statement, not a conversational reply. Cached per day; same sentence the nudge strip shows.
2. **Today's poem** — `_poemOfTheDay()`, same corpus as the splash coda and empty-state echo. Re-surfaces the morning's poem mid-day.

**Fallback:** if no nudge cache AND no poem corpus, falls through to the standard proactive AI suggestion path.

**Entry condition:** `input.value.trim() === ''` at ✦ tap. Non-empty input still invokes the AI conversationally.

**Rendered by:** `_showDailyBrief()` inside the AI panel (`#aiPanel`).

**Wallpaper Test:** W3 verdict due 2026-07-30. Watching for: does the poem add to the moment after the nudge, or feel like filler? (Shape line removed v2.31.8 — brief is now nudge + poem only.)

---

## Idle Companion

Bottom-right corner, 60% opacity, `--font-mono`. Appears after 45s idle.

Creatures: Dino, Fish, Bird, Cat, Snail, Crab, Star

Fades in over 0.6s, fades out on activity.

---

## Splash Screen

Full-screen overlay (`z-index: 500`, `pointer-events: all`) shown on cold app open. Covers the task list while it loads — `pointer-events: all` prevents accidental taps reaching tasks below.

**Animation:** Typewriter date string at 38–66ms per character, then 500ms cursor hold, then dismiss.

**Poem coda (v2.26.0, Roadmap #2):** on the day's **first** splash (`poem_splash_date` in
localStorage vs `_localISO()`), after the cursor hold the day's poem (`_poemOfTheDay()`)
fades in under the date (`#splash-poem`, 900ms opacity) and holds for a read —
`min(4000 + lines×600, 9500)`ms, tap anywhere skips. Only then does `_onSplashAnimDone()`
fire. The key is written at fade-in, not at decision time, so an early bail doesn't burn
the day. `_splashPoemHold` tells the 6s anim-stall safety this is deliberate; an 18s
ceiling still backstops the whole coda. Splash content sits in `#splash-inner`
(`margin:auto 0` + `overflow-y:auto` on `#splash`) so a long poem scrolls on a phone
instead of clipping at the top — `justify-content:center` would clip invisibly.

**Gate system:** Two parallel signals must both fire before dismiss:
- `_splashAnimDone` — set by the 500ms cursor timeout (or by the poem coda finishing)
- `_appLoadDone` — set after Dropbox pull + local render completes

**Skip logic (`splash_shown_at` in localStorage):**
- Splash was shown within the last **30 minutes** → skip (covers iOS background kill + restore, which happens within seconds)
- Splash was shown more than 30 minutes ago → show (genuine desktop close + reopen)
- localStorage cleared → always show

This 30-minute window replaced an earlier date-key approach (`splash_shown_date`) which was once-per-day and blocked desktop PWA close + reopen from seeing the splash. (The poem coda's `poem_splash_date` is a separate, deliberately once-per-day key — the poem is a morning moment; the splash itself still follows the 30-minute rule.)
