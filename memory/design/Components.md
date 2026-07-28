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
- **Entrances (v2.36.0):** the evening callout bar (8pm–midnight, proactive) *and* an explicit ✦ request ("triage", "move these to soon", "I'll do these later" → `open_triage` action → `triageExpand()`). The hour gate governs when the app invites triage, not when it obliges a request — capability vs. invitation.

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
- Noon cutoff: `checkDayNudge()` hides the strip at `hour >= 12`. Since v2.33.0 the cached AI line (`day_nudge_ai_<date>`) survives past noon — it lives on in About's Today block and the ✦ brief until the dated key expires at midnight.

---

## Today Block (About panel, v2.33.0)

`#todayNudgeBlock` — the day's nudge line resurfaced above the stat tiles, the Roadmap #7 "first brick" (Dia's return-to-the-brief insight). The morning strip is dismiss-once-and-gone; this is the line's quiet second home until midnight.

- **Shell:** sibling of `#sundayBlock` — same padding/radius/margins, but plain `--border` (no accent tint) and a muted "Today" label (`.week-label` overridden to `--muted`). Reference, not announcement.
- **Rendered by:** `renderInfoStats()` from `localStorage['day_nudge_ai_<today>']`; hidden when no line exists (no AI key, generation failed, or new day). Escaped via `esc()`.
- **Live sync:** `mergeRemoteData` re-renders About when the panel is open and a remote nudge line lands (same pattern as the focus-tile live update).
- **Wallpaper Test:** W1 via freshness (line is AI-generated from fresh context daily — W2 escape 2). W3 due 2026-08-01: does Can actually glance at it during the day? Removal is fine if never revisited.

---

## Noticed Block (About panel, v2.35.0)

`#noticedBlock` — what TODAY has learned, surfaced as **deltas, never facts** (Personalization.md G3, resolved). Four line types from `_noticedLines()` in `insights.js`, max 2 shown: habit milestone crossings (7/14/30/50/100), best-streak proximity, peak hour established/moved, theme of the week.

- **Shell:** `#todayNudgeBlock`'s quiet shell — plain `--border`, muted "Noticed" label. Same register as Today block: reference, not announcement.
- **Delta-gating is the design:** each line fires once when something *changes* (show-once bookkeeping in `appMemory.noticed`, device-local), then never again. Empty → block hidden. Silence weeks are correct, not broken.
- **Day cache:** `noticed_lines_<date>` (`_pruneLS`-cleaned) keeps the day's lines visible on re-open so they don't vanish between morning and evening.
- **Wallpaper Test:** W1 by construction (a line exists only when something changed); W2 escapes 1+2+3. W3 due 2026-08-02: does a line land as "it knows me" or as noise?

---

## Poem Share (About panel, v2.40.0, settled at v2.42.0)

`#poemShareBtn` (now a `<span>`, not a `<button>` — see below) — a quiet action attached to the poem, not a CTA. Six rounds of iteration on Can's real-use feedback before landing; worth reading the arc, since most rounds are examples of what *not* to do:

- **v2.40.2 — color/weight:** borrowed the app's text-link convention (`.config-hint a` — `var(--highlight-ui)`, hover-underline), right for navigational links but loud next to a contemplative poem.
- **v2.40.3–v2.40.4 — hover-reveal + `.task-copy` mirroring, reverted:** chased hiding-until-engaged plus a full `.task-copy`-style corner button with a left accent line. Produced five concrete regressions, each a pattern mechanic that didn't survive being ported to different content: an accent line sized as a % of box height became a visually heavy long line against multi-line poem text (fine on a short single-line task row); `opacity: 0` hiding (not `display: none`) still reserved the button's own layout space, leaving a stray gap before the next divider; a `muted → text` hover color swap was nearly imperceptible at the reveal state's 45% opacity; the corner position didn't match anything else in `.panel-haiku`; and moving the trigger out of normal flow shifted where the browser anchored the native `navigator.share()` popover.
- **v2.40.5 — reverted to simple, but too simple:** always-visible, centered, in normal flow. Fixed the five regressions above, but Can wanted the interaction back, just correctly — not "no `.task-copy` influence," but "`.task-copy`'s influence without the bugs."
- **v2.40.6 — settled, exact spec:** Can gave four literal requirements rather than an open design direction, worth recording verbatim as the actual spec: (1) poem text itself highlights on hover, like a task; (2) share label sits on the right, like `.task-copy`; (3) label invisible unless hovering the poem; (4) clicking *anywhere* on the poem — not just the label — opens the share dialog; plus an explicit clarification that this is a **simplified** `.task-copy` reference — no bounding box / background-fill highlight, because the poem isn't draggable the way a task is. Resolved each of v2.40.4's failure modes individually rather than avoiding the pattern altogether: (a) "highlight" = the poem text's own `color` brightening (`var(--muted)` → `var(--text)` on `#dailyPoem` and `.poem-author`), not `.task:hover`'s literal `background`/`border-color` box — this is what "no bounding box" meant. (b) Label is `position: absolute; top: 0; right: 0` inside `.poem-block` — true `.task-copy` corner placement — but `.poem-block` carries a **permanent** `padding-right: 44px` gutter, present identically at rest and on hover, so the multi-line-overlap and reserved-space-on-reveal problems from v2.40.4 don't apply: nothing about the layout changes size when the label reveals, only its own opacity does. (c) The whole `.poem-block` is the click target (`role="button" tabindex="0"`, click + Enter/Space handlers calling `_shareDailyPoem()`) — the label itself is a plain `<span>`, not a nested `<button>`, so a click on it bubbles to the same single handler with no double-fire risk.
- **v2.40.7 — true property parity + share-sheet anchor:** v2.40.6's label *approximated* `.task-copy` (similar tokens) but wasn't actually identical — no `border`, so no bordered-box state when hovering the label itself (Can's "missing the click state"), `top:0; right:0` instead of `.task-copy`'s `var(--space-2)` inset, missing `line-height`/`white-space`/`pointer-events`. Diffed property-by-property and matched every declared value and every state (rest, parent-hover reveal at `var(--opacity-copy)`, own-hover sharpen to full opacity + border + text color, `.copied`) exactly — only the reveal *trigger* differs (whole poem vs. one task row), not the component itself. Separately: Can reported the native share sheet opening "many pixels off from the click area." `navigator.share()`'s popover position isn't settable from JS/CSS, but some browsers anchor it near `document.activeElement` rather than literal cursor coordinates — with the whole poem as the click target, that active element was a large multi-line block, an ambiguous anchor. Gave the small label `tabindex="-1"` (focusable via `.focus()`, not part of the poem block's own tab stop) and `_shareDailyPoem()` now focuses it immediately before calling `navigator.share()`, biasing the anchor toward a small, predictable point. Verified `document.activeElement` correctly resolves to the label after clicking anywhere on the poem — the actual on-screen popover position is OS-rendered and outside what headless automation can check, so this specific fix needs real-device confirmation before it's fully verified.
- **v2.40.8 — click feedback, and one thing left genuinely unfixed:** Can reported v2.40.7 gave no click feedback at all, and that the share-sheet anchor "fix" changed nothing. Root cause of the missing feedback: `_shareDailyPoem()`'s `navigator.share()` branch returns immediately after calling it, no completion signal exists to hook a `.copied`-style change to (the promise only resolves once the OS sheet is fully dismissed) — and every round of headless testing so far had forced `navigator.share` to `undefined` specifically to reach the *other* branch (clipboard fallback, the only one a real OS dialog-free environment can exercise), which meant this gap was invisible in every verification screenshot despite being the actual path real devices take. Fixed with an immediate `.clicked` class (same accent tokens as `.copied`) applied synchronously before either branch runs, reverting after 400ms — visible regardless of path or prior hover state. Separately, and more importantly: v2.40.7's theory that focusing the small label before calling `share()` would influence the native popover's position was directly falsified by real-device testing — the popup's position was reported unchanged, and it has, in fact, never changed across any of the seven prior versions' different trigger structures. That consistency across structurally very different DOM approaches is itself strong evidence the popover position is entirely OS/browser-controlled, independent of page DOM. Removed the disproven `.focus()` call and its now-purposeless `tabindex="-1"` rather than leave dead code with a comment claiming an effect it doesn't have. **This complaint is left open, not silently patched over** — worth remembering if it comes up again, so as not to re-attempt the same disproven DOM-based theory.
- **v2.42.0 — two-tap touch interaction:** the earlier rounds settled desktop (hover reveals, click shares) but touch never had an equivalent of "just glancing" — one tap always fired share immediately. Can's request: first tap reveals (same visual state hover gives desktop), second tap shares. `_onPoemTap()` branches on `matchMedia('(hover: hover)')` — desktop keeps single-tap-shares unchanged; touch toggles a plain `.revealed` class on first tap (mirrors the hover-sharpened state exactly — verified via computed style, not just visually) and only calls `_shareDailyPoem()` on a second tap while still revealed. A document-level listener collapses `.revealed` on any tap outside the poem, so a stale reveal never causes a later unrelated tap to accidentally share. Deliberately doesn't collapse `.revealed` right after sharing — the `.copied`/click-flash confirmation (v2.40.8) needs the label visible to actually show; collapsing immediately would hide the very feedback that fix added. Keyboard (Enter/Space) stays single-step — a two-press requirement would regress accessibility for a device class that already has a clear focus indicator without needing a reveal step.
- **The actual lesson:** when a user says "do exactly this, refer to X but simplified in these specific ways," that's a literal spec, not a jumping-off point for another design interpretation — implement precisely what's described, verify each stated requirement individually (not just "does it look similar"), and get confirmation from real testing before calling it done. "Same component" means diffing every property and state against the reference, not just borrowing the same token names. Porting a pattern safely means identifying which of its *mechanics* the new content can actually support (a permanent layout reservation vs. a state-dependent one; text-color highlight vs. background-fill highlight; a small precise anchor vs. a large ambiguous one for native browser APIs) rather than copying the whole thing or avoiding it entirely. And when verifying a multi-branch function, make sure test setup exercises *every* branch a real user actually hits — stubbing out an API to reach a testable fallback path can silently hide a real gap in the primary path nobody checked.

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

## Daily Brief (v2.31.x, removed v2.41.0)

Was triggered by tapping ✦ with an empty input — the same button rerouted to "here's what I'd tell you right now" (nudge line + today's poem) instead of "ask me something." `_showDailyBrief()`, gone; empty ✦ tap now just opens the AI panel plainly (`openAI()`), same as any other open — `_aiLoad()`'s existing proactive-suggestions default runs, nothing composed specially.

**Why removed, ahead of its own 2026-07-30 W3 due date:** two separate problems, surfaced the same day (2026-07-28). First, a placement/discoverability one — `#addAiBtn`'s stated identity is "Ask anything" (task entry / AI assistant); revealing a completely different feature only on an *empty* tap of that same control had no discoverable connection to what the button says it does ("doesn't really belong under that CTA"). Second, a content one — About's Today block (nudge) and Read Me (poem) already surface the identical underlying data, all day, through an honest and predictable path. Given both, the choice was between two real fixes — give the brief its own honest entry point, or accept it's redundant and cut it — and the redundancy won: fixing discoverability would only have made a duplicate surface easier to find, not a valuable one worth keeping. Same reasoning pattern as `Philosophy.md`'s week-narrative-lines removal (v2.17.66) — removal is a valid, sometimes correct outcome of a Wallpaper Test question, not just something to reach for when a feature is broken.

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
