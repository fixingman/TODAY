# UI Components

> Specifications for key UI components.

## Shared accessibility contract (v2.68.0)

- Reachable icon-only controls are native buttons with explicit accessible names. Stateful controls expose `aria-pressed`, `aria-expanded`, `aria-busy`, or progress semantics as appropriate.
- Header panels are disclosures. Closed panels and parked/closed overlays are both untabbable and absent from the accessibility tree.
- Triage and meeting review are modal dialogs with initial focus, focus containment, temporary background `inert`, Escape handling, and focus restoration. The meeting-name prompt is nonmodal.
- Shared visually-hidden live regions report meaningful completion, focus, recording, reordering, sharing, and asynchronous results without narrating every drag movement.
- Interactive controls have a 24×24px minimum target and visible `:focus-visible` treatment. Hover-revealed PiP controls also reveal with `:focus-within`.
- Full findings and the accepted completed-task contrast and pointer-drag exceptions are in `memory/Accessibility-audit.md`.

---

## Runtime ownership contract (v2.82.5)

- `assets/runtime.js` loads before every component and exposes one frozen `window.Today` namespace. Components publish frozen APIs with `Today.define(name, api)`; consumers resolve them with `Today.use(name)`.
- UI markup declares actions with `data-today-click`, `data-today-change`, `data-today-input`, `data-today-keydown`, `data-today-pointerdown`, or `data-today-focusout`. A single document listener per event type dispatches to the registered component owner. Static and generated markup must not use inline event attributes.
- `scripts/component-contract-test.mjs` checks script/precache order, action declaration/registration parity, zero inline handler attributes, unique global ownership, and the transitional compatibility-assignment ceiling of 123.
- Compatibility globals still connect the startup composition root and older cross-module paths. They are transitional: new component APIs belong on `Today`, and the compatibility count must not grow.
- Deterministic seams live outside their DOM/network controllers: `sync-merge.js`, `suggestion-policy.js`, `noticed-model.js`, and `focus-session.js`. Their owning controllers keep rendering, persistence, provider calls, and browser lifecycle work.

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
- Done state: strikethrough and 25% row opacity to deliberately reduce completed-task noise; names/state remain available to assistive technology, but visible text/control contrast is an accepted exception
- Keyboard: focus the row; Enter starts focus, Space toggles completion, Option+Up/Down reorders and persists
- Completion particles receive checkbox client coordinates; the celebration canvas converts them to its backing-buffer coordinates so mobile viewport sizing cannot offset the visible burst
- Runtime ownership: `assets/task-actions.js` owns delegated copy/check/delete activation, copy feedback, mutations, aggregate task stats, and the progress favicon. Re-rendered manual/Trello rows require no per-row listener rebinding.
- Inline AI helper: rendered as a full-width sibling, owned by `data-taskid`; reorder and full-list render paths reattach the existing helper immediately after its task so DOM position never becomes ownership.

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

Completion is a named `aria-pressed` button. The row uses the same Enter, Space, and Option+Arrow contract as task rows, and the history strip has a screen-reader summary.

---

## Add Task Bar

Fixed at bottom, outside `.app` container.

```
┌─────────────────────────────────────┐
│ What's on your mind?                │
└─────────────────────────────────────┘
```

- Input: full width minus button
- The bounce mirror preserves the native input for focus, accessibility, IME, and storage. Its visual spans are split by Unicode grapheme cluster—not UTF-16 index—so emoji, modifiers, flags, and joined sequences shape intact.
- Enter: always adds task
- Voice Note and Meeting buttons appear beside the input when those capabilities are available. The former ✦ AI-sheet trigger was removed in v2.49.0; inline suggestions and the focus companion remain the reachable AI surfaces.

---

## AI Panel — unreachable legacy sheet

There is currently no visible or keyboard trigger for `#aiPanel`; closed markup is hidden from
the accessibility tree. `assets/assistant.js` still contains the sheet controller and the live
post-add inline-suggestion delivery controller; deterministic reason selection and outcome
weighting live separately in `assets/suggestion-policy.js`. Do not describe the sheet as a
reachable surface or delete the module wholesale. Restoring a trigger is a separate product
decision; separating/removing the dead sheet controller is a contained cleanup task.

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
- **Entrance:** the evening callout bar appears from 8pm–midnight; tapping Review opens the overlay. The former hidden AI `open_triage` action (v2.36.0) was removed in v2.64.28, so natural-language requests no longer open triage.

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

### Post-Triage Reflection (v2.65.7)

Rendered inside `#triageReflection` (between summary and Undo button). Three states:

**State 1 — intro (no policy yet, cooldown permits):** auto-close 10s

```
┌─────────────────────────────────────────┐
│  Remember how days felt?                │
│  TODAY can remember these reflections   │
│  for 30 days and notice patterns over   │
│  time. They stay on this device, and    │
│  in your Dropbox if you connect it.     │
│  Your AI sees a short summary only      │
│  when you ask.                          │
│                                         │
│  [ Remember ]     [ Not for me ]        │
└─────────────────────────────────────────┘
```

**State 2 — question (policy = remember, no response today):** auto-close 6s; resets to 8s on "Remember"

```
┌─────────────────────────────────────────┐
│  Beyond what got done, how did          │
│  today feel?                            │
│                                         │
│  [ drained ] [ tense ] [ present ]      │
│  [ off ]     [ calm ]  [ alive ]        │
└─────────────────────────────────────────┘
```

After selection: feeling button accent-selected, choices hidden, auto-close resets to 3s.

**Conditions where `#triageReflection` is empty:** policy = `not_for_me`, policy = `remember` and response already exists for today, or intro cooldown has not elapsed.

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
- Non-focused content recedes visually and becomes inert/hidden from assistive technology while focus mode is active
- The time is a named button; session progress is exposed as a progressbar
- Copy feedback is session-scoped: leaving focus immediately restores `copy` and clears the success treatment

### Gmail and web enrichment

- Gmail classification distinguishes explicit correspondents from topic-based follow-ups. Person tasks use `from:`/`to:`; topic tasks may use quoted keywords, `subject:`, `in:sent`, and date operators. The classifier and fallback must never invent a person from topic prose.
- Web enrichment caches both success and no-result responses; transient/network failures remain retryable. Only HTTPS actions are rendered.
- Both indicators are screen-reader named and stay attached before the task tail across renders. Dedicated coverage lives in `gmail-test.mjs` and `task-enrich-test.mjs`.

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
- **AI tier 2** (`_fetchDayNudgeAI`) — sees both manual tasks (with ages) and Trello cards (with overdue/checklist markers) in one prompt; asked to name the single most important thing. Races a 1s timeout via `_raceAINudge` — a real Netlify+LLM round trip routinely loses that race, so the fallback showing first is the *common* case, not rare. Cached per day either way; no mid-race swap (BUG-034) — but see v2.42.3 below, a fallback specifically *can* still upgrade to the AI line later that day, once, via a genuinely separate later call site (never a same-instant swap).
- **Fallback→AI upgrade (v2.42.3)** — diagnosed from real usage: the AI line was generating and caching correctly every day (proven by About's Today block, which reads the identical cache with no race and showed it fine), but the task-list nudge was stuck on the fallback because `_nudgeRendered` blocked *any* further render once anything had shown, forever, for that page load — even after the real line arrived in the same cache moments later. New `_nudgeIsFallback` flag narrows that lock: once the real AI text has shown, nothing can ever replace it (BUG-034 stays fully intact); but if only the fallback has shown, a later, separate call site (wake, a later sync tick) may still pick up the AI line if it's arrived by then.
- **Dismiss** — tap sets `day_nudge_dismissed_<date>` (per-day, clears at midnight). Synced cross-device via `_DISMISS_SYNC` registry. Legacy `trello_nudge_dismissed` / `morning_nudge_dismissed` fields kept as transition rows in registry for mixed-version devices — remove once all devices ≥ v2.19.0.
- **Presence:** same `.morning-nudge` CSS as before — `--surface` panel, 2px `--accent-dim` left edge, `radius-md`, `padding: 7px var(--space-3)`. Breathing `--accent` dot via `_breathe(_KF_BREATHE_SMALL, 2400ms)` (opacity 1→0.5 + scale 1→0.85 — small-element treatment per Motion.md).
- Noon cutoff: `checkDayNudge()` hides the strip at `hour >= 12`. Since v2.33.0 the cached AI line (`day_nudge_ai_<date>`) survives past noon — it lives on in About's Today block until the dated key expires at midnight. (The ✦ brief also used to read this cache — removed v2.41.0, see the Daily Brief section below.)

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

## Memory Panel — "HOW DAYS FELT" Block (v2.65.7)

Appended after the four main `typeBlock` sections by `_reflectionRenderMemory(el)`. Lives in a separate `div.reflection-memory-block` so it cannot be included in a memory-clear flow that doesn't also call `_reflectionClearFromAllMemory`.

**States rendered in the block:**

| Condition | Content |
|-----------|---------|
| Forget confirm pending | "Forget these reflections?" + Yes / Cancel |
| Policy = `not_for_me` or absent | "Reflections are not remembered." + "Remember reflections" button |
| Policy = `remember`, < 7 reflections | "Remembering the last 30 days." + count sentence |
| Policy = `remember`, ≥ 7 entries + AI configured | Count + on-device observation + "Reflect" button (AI, user-initiated, aggregate only) |
| `_reflectPending` | "reflecting…" spinner sentence in place of Reflect button |
| `_reflectResult` set | AI-generated text in place of Reflect button |

"Forget reflections" button shows whenever `list.length > 0`. "Remember reflections" button shows when policy is `not_for_me`. These two buttons are mutually exclusive.

---

## About contextual CTAs (v2.40.0–v2.64.10)

`Focus → copy`, About → `see more`, and About → poem `share` use the shared `.copy-cta` visual component. The component owns the one-pixel transparent border, `--radius-md`, mono type, letter spacing, compact padding, line height, and muted/bordered/accent states. Each surface owns only its positioning, reveal trigger, and pointer behavior.

- Desktop: focusing a task or hovering the relevant About block reveals its CTA at `--opacity-copy`; hovering the CTA sharpens it and shows `--border`.
- Touch: the About block's existing reveal state shows the CTA at full opacity with `--border`, because there is no hover step. Poem sharing remains two taps: reveal, then share.
- The poem keeps a permanent 64px right gutter so the absolute CTA never overlaps text and does not create a reveal-time layout shift.

### Poem Share history

`#poemShareBtn` (now a `<span>`, not a `<button>` — see below) — a quiet contextual action attached to the poem, not a primary CTA. Six rounds of iteration on Can's real-use feedback before landing; worth reading the arc, since most rounds are examples of what *not* to do:

- **v2.40.2 — color/weight:** borrowed the app's text-link convention (`.config-hint a` — `var(--highlight-ui)`, hover-underline), right for navigational links but loud next to a contemplative poem.
- **v2.40.3–v2.40.4 — hover-reveal + `.task-copy` mirroring, reverted:** chased hiding-until-engaged plus a full `.task-copy`-style corner button with a left accent line. Produced five concrete regressions, each a pattern mechanic that didn't survive being ported to different content: an accent line sized as a % of box height became a visually heavy long line against multi-line poem text (fine on a short single-line task row); `opacity: 0` hiding (not `display: none`) still reserved the button's own layout space, leaving a stray gap before the next divider; a `muted → text` hover color swap was nearly imperceptible at the reveal state's 45% opacity; the corner position didn't match anything else in `.panel-haiku`; and moving the trigger out of normal flow shifted where the browser anchored the native `navigator.share()` popover.
- **v2.40.5 — reverted to simple, but too simple:** always-visible, centered, in normal flow. Fixed the five regressions above, but Can wanted the interaction back, just correctly — not "no `.task-copy` influence," but "`.task-copy`'s influence without the bugs."
- **v2.40.6 — settled, exact spec:** Can gave four literal requirements rather than an open design direction, worth recording verbatim as the actual spec: (1) poem text itself highlights on hover, like a task; (2) share label sits on the right, like `.task-copy`; (3) label invisible unless hovering the poem; (4) clicking *anywhere* on the poem — not just the label — opens the share dialog; plus an explicit clarification that this is a **simplified** `.task-copy` reference — no bounding box / background-fill highlight, because the poem isn't draggable the way a task is. Resolved each of v2.40.4's failure modes individually rather than avoiding the pattern altogether: (a) "highlight" = the poem text's own `color` brightening (`var(--muted)` → `var(--text)` on `#dailyPoem` and `.poem-author`), not `.task:hover`'s literal `background`/`border-color` box — this is what "no bounding box" meant. (b) Label is `position: absolute; top: 0; right: 0` inside `.poem-block` — true `.task-copy` corner placement — but `.poem-block` carries a **permanent** `padding-right: 44px` gutter, present identically at rest and on hover, so the multi-line-overlap and reserved-space-on-reveal problems from v2.40.4 don't apply: nothing about the layout changes size when the label reveals, only its own opacity does. (c) The whole `.poem-block` is the click target (`role="button" tabindex="0"`, click + Enter/Space handlers calling `_shareDailyPoem()`) — the label itself is a plain `<span>`, not a nested `<button>`, so a click on it bubbles to the same single handler with no double-fire risk.
- **v2.40.7 — true property parity + share-sheet anchor:** v2.40.6's label *approximated* `.task-copy` (similar tokens) but wasn't actually identical — no `border`, so no bordered-box state when hovering the label itself (Can's "missing the click state"), `top:0; right:0` instead of `.task-copy`'s `var(--space-2)` inset, missing `line-height`/`white-space`/`pointer-events`. Diffed property-by-property and matched every declared value and every state (rest, parent-hover reveal at `var(--opacity-copy)`, own-hover sharpen to full opacity + border + text color, `.copied`) exactly — only the reveal *trigger* differs (whole poem vs. one task row), not the component itself. Separately: Can reported the native share sheet opening "many pixels off from the click area." `navigator.share()`'s popover position isn't settable from JS/CSS, but some browsers anchor it near `document.activeElement` rather than literal cursor coordinates — with the whole poem as the click target, that active element was a large multi-line block, an ambiguous anchor. Gave the small label `tabindex="-1"` (focusable via `.focus()`, not part of the poem block's own tab stop) and `_shareDailyPoem()` now focuses it immediately before calling `navigator.share()`, biasing the anchor toward a small, predictable point. Verified `document.activeElement` correctly resolves to the label after clicking anywhere on the poem — the actual on-screen popover position is OS-rendered and outside what headless automation can check, so this specific fix needs real-device confirmation before it's fully verified.
- **v2.40.8 — click feedback, and one thing left genuinely unfixed:** Can reported v2.40.7 gave no click feedback at all, and that the share-sheet anchor "fix" changed nothing. Root cause of the missing feedback: `_shareDailyPoem()`'s `navigator.share()` branch returns immediately after calling it, no completion signal exists to hook a `.copied`-style change to (the promise only resolves once the OS sheet is fully dismissed) — and every round of headless testing so far had forced `navigator.share` to `undefined` specifically to reach the *other* branch (clipboard fallback, the only one a real OS dialog-free environment can exercise), which meant this gap was invisible in every verification screenshot despite being the actual path real devices take. Fixed with an immediate `.clicked` class (same accent tokens as `.copied`) applied synchronously before either branch runs, reverting after 400ms — visible regardless of path or prior hover state. Separately, and more importantly: v2.40.7's theory that focusing the small label before calling `share()` would influence the native popover's position was directly falsified by real-device testing — the popup's position was reported unchanged, and it has, in fact, never changed across any of the seven prior versions' different trigger structures. That consistency across structurally very different DOM approaches is itself strong evidence the popover position is entirely OS/browser-controlled, independent of page DOM. Removed the disproven `.focus()` call and its now-purposeless `tabindex="-1"` rather than leave dead code with a comment claiming an effect it doesn't have. **This complaint is left open, not silently patched over** — worth remembering if it comes up again, so as not to re-attempt the same disproven DOM-based theory.
- **v2.42.0 — two-tap touch interaction:** the earlier rounds settled desktop (hover reveals, click shares) but touch never had an equivalent of "just glancing" — one tap always fired share immediately. Can's request: first tap reveals (same visual state hover gives desktop), second tap shares. `_onPoemTap()` branches on `matchMedia('(hover: hover)')` — desktop keeps single-tap-shares unchanged; touch toggles a plain `.revealed` class on first tap (mirrors the hover-sharpened state exactly — verified via computed style, not just visually) and only calls `_shareDailyPoem()` on a second tap while still revealed. A document-level listener collapses `.revealed` on any tap outside the poem, so a stale reveal never causes a later unrelated tap to accidentally share. Deliberately doesn't collapse `.revealed` right after sharing — the `.copied`/click-flash confirmation (v2.40.8) needs the label visible to actually show; collapsing immediately would hide the very feedback that fix added. Keyboard (Enter/Space) stays single-step — a two-press requirement would regress accessibility for a device class that already has a clear focus indicator without needing a reveal step.
- **v2.63.2 → v2.64.10 — unified About actions, then restored the bordered reference:** v2.63.2 flattened poem `share` to match the newly added unbordered `see more`. Can later chose the stronger existing reference instead: both About controls now use the actual Focus → Copy visual component, including its bordered hover/click affordance.
- **v2.64.12 — permalink availability guard:** shared `/poem.html?date=…` requests pass through a Netlify Edge Function for crawler-readable Open Graph metadata. Corpus parsing now accepts the real file's leading comments and validates its result before use; invalid or unavailable corpus data serves the untouched static page instead of allowing the preview layer to take the permalink down.
- **The actual lesson:** when a user says "do exactly this, refer to X but simplified in these specific ways," that's a literal spec, not a jumping-off point for another design interpretation — implement precisely what's described, verify each stated requirement individually (not just "does it look similar"), and get confirmation from real testing before calling it done. "Same component" means diffing every property and state against the reference, not just borrowing the same token names. Porting a pattern safely means identifying which of its *mechanics* the new content can actually support (a permanent layout reservation vs. a state-dependent one; text-color highlight vs. background-fill highlight; a small precise anchor vs. a large ambiguous one for native browser APIs) rather than copying the whole thing or avoiding it entirely. And when verifying a multi-branch function, make sure test setup exercises *every* branch a real user actually hits — stubbing out an API to reach a testable fallback path can silently hide a real gap in the primary path nobody checked.

---

## Connections Privacy Reassurance (v2.64.11)

`#connectionsPrivacyNote` is a one-time, local-first reassurance directly beneath the Connections title. It is plain muted text—no card, icon, CTA, dismiss button, or independent animation—so it reads as context for the connection choices rather than another setup step.

**Copy:** “Private by design: no account, no analytics. You own your data and choose every connection.”

**Gate:** first Connections-panel open on a device, only when Trello, Dropbox, Gemini, and Claude credentials are all absent. The seen flag is consumed even when credentials suppress the line. A qualifying line lasts for that panel visit only, hides on close or successful connection, and never returns on that device.

**Wallpaper Test:** W1 passes because the sentence answers the privacy question at the exact moment external services are offered. W2 uses rarity: one appearance per installation. W3 is due 2026-08-26—does it feel reassuring and organic, or like policy copy interrupting setup?

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
  already show the week's shape.
- **Sunday earned insight (v2.71.12):** the optional sentence above the grid appears only when
  code finds a supported relationship or recurring pattern that adds information. The AI adds
  personality to that selected observation; it never receives lifetime biography or a loose list
  of task titles. No pattern means no sentence — there is no counter-summary fallback.

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

Was triggered by tapping ✦ with an empty input — the same button rerouted to "here's what I'd tell you right now" (nudge line + today's poem) instead of "ask me something." `_showDailyBrief()` and its composed surface are gone. The remaining ✦ input trigger was removed in v2.49.0, leaving the legacy sheet unreachable; inline suggestions and focus questions are separate live paths.

**Why removed, ahead of its own 2026-07-30 W3 due date:** two separate problems, surfaced the same day (2026-07-28). First, a placement/discoverability one — `#addAiBtn`'s stated identity is "Ask anything" (task entry / AI assistant); revealing a completely different feature only on an *empty* tap of that same control had no discoverable connection to what the button says it does ("doesn't really belong under that CTA"). Second, a content one — About's Today block (nudge) and Read Me (poem) already surface the identical underlying data, all day, through an honest and predictable path. Given both, the choice was between two real fixes — give the brief its own honest entry point, or accept it's redundant and cut it — and the redundancy won: fixing discoverability would only have made a duplicate surface easier to find, not a valuable one worth keeping. Same reasoning pattern as `Philosophy.md`'s week-narrative-lines removal (v2.17.66) — removal is a valid, sometimes correct outcome of a Wallpaper Test question, not just something to reach for when a feature is broken.

---

## Idle Companion

Bottom-right corner, 60% opacity, `--font-mono`. Appears after 45s idle.

Creatures: Dino, Fish, Bird, Cat, Snail, Crab, Star

Fades in over 0.6s, fades out on activity.

---

## Splash Screen

Full-screen overlay (`z-index: 500`, `pointer-events: all`) shown on cold app open. Covers the task list while it loads — `pointer-events: all` prevents accidental taps reaching tasks below.

**Implementation (v2.64.25):** the complete controller lives in `assets/splash.js`, loaded as an inert classic script before the main inline script. `index.html` calls `window._startSplash()` immediately after `init()`, preserving the original startup order. The module owns the readiness flags and animation internals while retaining the existing `window._onAppLoadDone`, `window._onSplashAnimDone`, and `window._doSplashDismiss` hooks used by the load gate.

**Animation:** Typewriter date string at 38–60ms per character, then 500ms cursor hold, then dismiss.

**Poem coda (v2.26.0, Roadmap #2):** on the day's **first** splash (`poem_splash_date` in
localStorage vs `_localISO()`), after the cursor hold the day's poem (`_poemOfTheDay()`)
fades in under the date (`#splash-poem`, 900ms opacity) and holds for a read —
`min(max(5000, words×200), 8000)`ms, tap anywhere skips. Only then does `_onSplashAnimDone()`
fire. The key is written at fade-in, not at decision time, so an early bail doesn't burn
the day. `_splashPoemHold` tells the 6s anim-stall safety this is deliberate; a 17s
ceiling still backstops the whole coda. Splash content sits in `#splash-inner`
(`margin:auto 0` + `overflow-y:auto` on `#splash`) so a long poem scrolls on a phone
instead of clipping at the top — `justify-content:center` would clip invisibly.

**Dismissal (v2.65.3, BUG-076):** static `TO` and `DAY` wrappers fade as two word layers,
not five independently composited letters. TO runs for 250ms; DAY begins 150ms later; the
date begins at 200ms and the star bursts at 300ms. Explicit opacity endpoints plus a persisted
zero base style prevent Safari from exposing completed letters while the coda continues. Poem
lines retain their 700ms fade and 250ms stagger.

**Gate system:** Two parallel signals must both fire before dismiss:
- `_splashAnimDone` — set by the 500ms cursor timeout (or by the poem coda finishing)
- `_appLoadDone` — set after Dropbox pull + local render completes

**Skip logic (`splash_shown_at` in localStorage):**
- Splash was shown within the last **30 minutes** → skip (covers iOS background kill + restore, which happens within seconds)
- Splash was shown more than 30 minutes ago → show (genuine desktop close + reopen)
- localStorage cleared → always show

This 30-minute window replaced an earlier date-key approach (`splash_shown_date`) which was once-per-day and blocked desktop PWA close + reopen from seeing the splash. (The poem coda's `poem_splash_date` is a separate, deliberately once-per-day key — the poem is a morning moment; the splash itself still follows the 30-minute rule.)

---

## Browser Platform Behaviors (v2.64.26)

`assets/platform.js` owns the browser-facing shell integrations behind one idempotent `window._startPlatform()` call at the end of the main script: service-worker registration/update activation, coarse-pointer `visualViewport` keyboard positioning, PWA install events and browser-specific promotion, and persisted `pageshow` wake recovery. `installPWA`, `_pwaShowSteps`, and `_pwaCopyLink` remain explicit `window` functions because static/generated buttons call them by name.

The module owns behavior only. PWA and keyboard HTML/CSS remain in `index.html`; installation instructions, row dimensions, service-worker policy, and `_onWake` behavior are unchanged by the extraction.
