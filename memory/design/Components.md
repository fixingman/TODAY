# UI Components

> Specifications for key UI components.

## Shared accessibility contract (v2.68.0)

- Reachable icon-only controls are native buttons with explicit accessible names. Stateful controls expose `aria-pressed`, `aria-expanded`, `aria-busy`, or progress semantics as appropriate.
- Header panels are disclosures. Closed panels and parked/closed overlays are both untabbable and absent from the accessibility tree.
- Triage and meeting review are modal dialogs with initial focus, focus containment, temporary background `inert`, Escape handling, and focus restoration. The meeting-name prompt is nonmodal.
- Shared visually-hidden live regions report meaningful completion, focus, recording, reordering, sharing, and asynchronous results without narrating every drag movement.
- Interactive controls have a 24×24px minimum target and visible `:focus-visible` treatment. Hover-revealed PiP controls also reveal with `:focus-within`. Memory actions retain that minimum with the quiet bordered CTA styling; footer actions keep `--space-2` vertical padding.
- Full findings and the accepted completed-task contrast and pointer-drag exceptions are in `memory/Accessibility-audit.md`.

---

## Runtime ownership contract (v2.82.5)

- `assets/runtime.js` loads before every component and exposes one frozen `window.Today` namespace. Components publish frozen APIs with `Today.define(name, api)`; consumers resolve them with `Today.use(name)`.
- UI markup declares actions with `data-today-click`, `data-today-change`, `data-today-input`, `data-today-keydown`, `data-today-pointerdown`, or `data-today-focusout`. A single document listener per event type dispatches to the registered component owner. Static and generated markup must not use inline event attributes.
- `scripts/component-contract-test.mjs` checks script/precache order, action declaration/registration parity, zero inline handler attributes, unique global ownership, and the transitional compatibility-assignment ceiling defined by that test.
- Compatibility globals still connect the startup composition root and older cross-module paths. They are transitional: new component APIs belong on `Today`, and the compatibility count must not grow.
- Deterministic seams live outside their DOM/network controllers: `sync-merge.js`, `suggestion-policy.js`, `noticed-model.js`, and `focus-session.js`. Their owning controllers keep rendering, persistence, provider calls, and browser lifecycle work.
- Calendar foundation (v2.94.0): `connections.js` owns the existing-style Connect/Reconnect/Retry/Forget row and imports `calendar.js` lazily. `Today.use('calendar')` owns separate consent/tokens, bounded reads and transient timing context; no new compatibility global, eager script, agenda or recording trigger. Live Google/PWA verification is owed before the meeting-start UI slice.
- Calendar daily support (v2.96.0 release): nudge owns the bounded optional-read/response lifecycle; lazy `calendar-nudge.js` owns reader/evidence orchestration and `calendar-nudge-policy.js` owns pure constraint/evidence/projection checks shared with offline tooling. `calendar.timingSnapshot()` exposes timing/provenance only on-device. No new UI/global/eager script; the existing writer, About and reaction controls own the accepted line. Pool/Sunday/focus are not Calendar consumers.

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

Same interaction family as task rows. Read layout: compact checkbox → habit name → history dots → separate strength column. History covers 21 habit-days on desktop; at ≤480px only the last 7 dots are visible. Filled dots use accent; today's dot has an outline. Strength is the forgiving percentage indicator, not a `done/7` counter. Completion resets at the 3am habit-day boundary; history is preserved. Rows have transparent borders at rest and reveal the surface/border on hover-capable pointers, not permanent separators.

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
- Horizontal scrolling: the mirror follows native desktop `scrollLeft`, including zero; only iOS uses the canvas/caret fallback when its native offset is unavailable (BUG-132).
- Enter: always adds task
- Voice Note and Meeting buttons appear beside the input when those capabilities are available. Inline suggestions and the focus companion remain the task-level AI surfaces; the unreachable legacy AI sheet was fully removed in v2.83.1.

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
- During focus, it keeps its receded visual treatment but is inert and hidden from assistive technology; Review returns to keyboard navigation when focus ends
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
- **Keyboard entry (v2.90.49):** opening the modal focuses its static title, not the bulk Keep all action. Enter on entry is harmless; Tab reaches Keep all, Shift+Tab wraps to the last visible action, and Escape returns to Review. The title is not in the ordinary tab order and has no action-style focus ring.
- **Header alignment (v2.90.50):** `.triage-header` uses `--space-3` inline padding so its title and Keep all action align with the task cards' inner text and action edges on desktop and narrow screens. Keep the spacing token rather than a one-off offset.
- The leading `○` checkbox marker was removed (v2.18.1) so the four buttons get the full row width and stay one line on phones; rows are flush to the section edge.
- Backdrop tap → `triageMinimize()` → returns to callout bar.
- **Entrance:** the evening callout bar appears from 8pm–midnight; tapping Review opens the overlay. The former hidden AI `open_triage` action (v2.36.0) was removed in v2.64.28, so natural-language requests no longer open triage.

### Triage Summary (v2.14.4)

After all decisions, replaces task list for 3s before auto-close:

**Countdown pause (v2.95.3):** mouse hover over the completion content pauses; on touch, hold any non-button area of the completion panel and release to resume from the remaining time. The progress bar pauses too. Buttons remain native actions. Release outside and pointer cancellation resume; multiple holds and a reflection timer reset stay paused until the final hold ends. Closing/Undo/new triage clears pause state; no extra control, preference or saved value.

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
│  [  joyful  ]   [ scattered  ]          │
│  [  alive   ]   [   tense    ]          │
│  [ content  ]   [ frustrated ]          │
│  [   calm   ]   [  drained   ]          │
│  [ present  ]   [    sad     ]          │
└─────────────────────────────────────────┘
```

Two columns (v2.93.14): lighter feelings on the left, heavier on the right, each column
ordered lightest on top to heaviest at the bottom, so the grid runs from *joyful* to *sad*.
DOM order is row by row. *off* is no longer offered; evenings already marked *off* stay valid.

After selection: the chosen whole word acknowledges the tap, travels into its
confirmation, and the other choices recede. The state is already saved while this
plays; reduced motion swaps directly to the confirmation. Auto-close resets to 3s.

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
- Ask stays in its existing muted button with the accessible name “Ask for focus help”; task age/returns no longer accent it. Requested task help may be one question, supported step or acknowledgement; accepted prose is the button’s accessible name. A current task request failure shows “No reply to show. Try again.” in the same button, with no automatic retry or recording; exit/dismiss restores Ask. The Ask-to-answer transformation stays. Local v2.101.0 adds a Gmail-styled feedback button at the right end of the accepted answer’s fixed-height row, with a reserved text area. It expands one separate landed/not-landed action row; landed adds no extra row. Undo/clear stay in that row. Clicking the answer hides the answer and all feedback, restoring the counter/progress without pausing or voting. Native controls, real hidden states and 24px targets support keyboard/320px layouts; non-scrolling outer clipping prevents focus from shifting the answer while expansion animates. Ratings guide only the next explicit same-owner/session Ask; no persistent collection.

### Gmail and web enrichment

- Gmail classification distinguishes explicit correspondents from topic-based follow-ups. Person tasks use `from:`/`to:`; topic tasks may use quoted keywords, `subject:`, `in:sent`, and date operators. The classifier and fallback must never invent a person from topic prose.
- **Booking tasks (v2.93.19):** *book, reserve, appointment, schedule* pass the Gmail pre-filter alongside the contact verbs (Can: same realm). The useful thread is the last booking or confirmation for that service — classifier prompt and fallback (`{subject:booking subject:confirmation …} <service words>`) search confirmations, never inventing a business. Looked up on device like any thread; no email content leaves it. The block shows the thread and its open link but **no Draft reply**, and the focus Ask button stays Ask (`focus.js` only short-circuits to the draft when a draft button exists).
- **Calendar notifications (v2.93.20, BUG-117):** across all Gmail task lookups, `calendar-notification@google.com` is excluded by grouped query, exact message sender, and cache read. If necessary, inspect up to five threads; skip automated messages within a mixed thread and open the selected non-calendar Message-ID. Do not blanket-exclude “reminder” subjects, calendar words or `.ics` attachments—genuine service correspondence can contain them. Calendar-as-input is unchanged. Other calendar sources need observed sender evidence; this is filtering, not proof that the remaining email is the right service/provider.
- **Local relevance (v2.93.21):** MiniSearch 7.2.0 ranks a transient set of at most five threads × ten recent messages (subject/sender/snippet weights 3/2/1, all meaningful task terms required). Strip action/filler words, not a communication task's topic. Bookings require booking evidence; an explicit at/with provider must match the correspondent. Unnamed bookings across distinct senders abstain, as do near-tied cross-sender results (top score less than 1.25 × runner-up). Same-score results prefer newer messages. This is lexical evidence, not a semantic model or learned preferred salon. The pinned same-origin library is lazy-imported, SW-precached, and has no new eager script, mailbox index or candidate retention. Missing library → no card, not a first-hit fallback. Existing cards must carry `matchPolicy: minisearch-v1` and the unchanged task text; old cards are looked up again.
- The Gmail draft action reserves its initial label width and crossfades the inner text through Draft reply, drafting…, then **Show draft in Mail ↗** when the sender's address is known (opens a prefilled reply via `mailto:` in the same context, BUG-089), else Copy / Copied ✓ (v2.90.41). Since v2.101.0 there is no second appended "Open in Mail ↗" link — on a Mac the thread link already reads that, and two identical CTAs made no sense (Can, Oct 27). Async feedback must not shift the neighboring controls.
- **Opening the thread (v2.93.18):** on a desktop Mac the link reads **Open in Mail ↗** and opens the selected message in Apple Mail via `message://%3C<Message-ID>%3E` — same-context navigation (delegated `gmail.open-mail`), no browser. Everywhere else, and for lookups cached before the Message-ID was fetched, it reads **Open in Gmail ↗** (Gmail web search). The draft button's **Show draft in Mail ↗** is a separate `mailto:` reply action (BUG-089).
- **Web/Trello context (v2.99.0 local):** success/no-result caches require the current manual task text, source board and query policy; 30-day expiry and bounded local retention. Transient/network/malformed failures stay retryable. Only HTTPS source actions render. The existing focus action row adds **not useful**; it hides this exact card/arrow/source shortcut and shows **undo**, with **show context** on later visits. Restoring clears that local hide without a call. Native buttons retain the CTA typography/tokens, a 24px minimum target and visible keyboard outline; the row wraps, long card text breaks at 320px, and focus moves to the replacement control. Background list/storage refresh retains the unchanged card/Undo node and restores native focus after timer reattachment. Accessible names contain visible labels; explicit hide/restore uses the existing live announcer, while later hidden visits stay quiet. Space on a native control activates it rather than toggling the timer. Hiding is neutral local control, not model feedback or learned taste. No new panel or feedback survey. Close/switch and task/source changes fence late UI delivery; source links/completions imply no satisfaction.
- **Web/Trello next-use controls (v2.103.0):** the existing action row keeps its source and not useful control and adds a quiet wording disclosure. Its optional row offers hard to follow / too formal, Undo and clear all using the existing native quiet-button/selection tokens. Selecting a concern changes no current answer/card and makes no request. Fixed concerns can guide future context on this device; the row explains that earlier card text stays private. A selected concern can be toggled off for its task; clear all removes every web/Trello wording record, with transient Undo limited to current eligible owners. A hidden card retains Undo/show context and offers try other context once per focus visit; empty/error keeps the original recoverable. All actions remain separate from the unchanged Ask-to-answer row and Gmail controls. Background updates preserve disclosure state and topic focus; controls have truthful labels, pressed/expanded states, true hiding, live feedback, 24px targets and 320px wrapping; an open card recalculates timer height on viewport resize so the concern choices remain visible. The lazy UI is SW-cached and adds no eager script. Wording guidance and all clear/late-response rules are in AI/Data/Sync; local implementation is not a real-use keep verdict.
- **Gmail ownership (v2.99.1 local):** existing card/actions/labels stay unchanged. Exact current task/text, mail grant, selected cache and focus visit govern context and draft delivery; exit cancels focus-origin work synchronously. Valid same-owner refresh preserves current native controls. Delayed replies/Copy cannot migrate across tasks or sign-ins. Booking context still has no Draft reply; Mail links retain their platform behavior.
- **Gmail feedback (v2.104.0 dev):** keep the existing thread, one draft Mail/Copy action and thread link. Add quiet not-this-thread / Undo/show-email and an explicit same-query alternative only while hidden. Once a draft is actually shown, wording opens an optional sibling row with hard-to-follow / too-formal, Undo and clear-all wording, plus one explicit replacement per visit. No row appears in the task/Ask answer. Current wording scope is future Gmail drafts on this device/up-to-one-day, explicitly approved by Can and explained before a choice; thread rejection remains task-local. Native pressed/expanded/hidden semantics, muted feedback/primary selected text, 24px targets and wrapping preserve keyboard focus and timer behavior. Desktop/320px/axe controls were reviewed; real usefulness remains a separate release+14day verdict.
- Both indicators are screen-reader named and stay attached before the task tail across renders. Dedicated coverage lives in `gmail-test.mjs` and `task-enrich-test.mjs`.
- **Indicator arrival (v2.93.20, BUG-116):** fresh email/web context flashes once through the shared `_playEnrichmentArrival()` WAAPI utility; wake repaints do not restart it. Cached restoration stays quiet. Desktop hover reveals the settled muted arrow; reduced motion skips the arrival cue.

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
- Icons: habits, connections, About. Their button fill, border, size and focus treatment are app-owned; `appearance: none` and `box-shadow: none` suppress native control styling but did not by themselves resolve the iPhone halo report.
- At ≤600px the sticky header is solid `--bg` without backdrop blur; desktop retains the frosted layer. This avoids compositing the mobile logo and controls through the shared backdrop layer while preserving the same spacing, safe-area handling and bottom fade.

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
- **AI tier 2** (`_fetchDayNudgeAI`) — sees both manual tasks (with ages) and Trello cards (with overdue/checklist markers) in one prompt; asked to name the single most important thing. Waits up to 5s (`_NUDGE_AI_WAIT_MS`) via `_raceAINudge`, showing nothing meanwhile; the strip opens once, with the AI line, and eases the list down (`nudgeOpen`, one-shot, off under reduced motion). The fallback shows only when AI fails or is unavailable (immediately) or is slower than the cap. Until v2.92.11 the window was 1s, which the round trip routinely lost — the plain count showed on every first open of the day and the AI line waited for the next open. A day rollover on a live page hides yesterday's line at once (`_nudgeOnNewDay`). Cached per day either way; no mid-race swap (BUG-034) — but see v2.42.3 below, a fallback specifically *can* still upgrade to the AI line later that day, once, via a genuinely separate later call site (never a same-instant swap).
- **Fallback→AI upgrade (v2.42.3)** — diagnosed from real usage: the AI line was generating and caching correctly every day (proven by About's Today block, which reads the identical cache with no race and showed it fine), but the task-list nudge was stuck on the fallback because `_nudgeRendered` blocked *any* further render once anything had shown, forever, for that page load — even after the real line arrived in the same cache moments later. New `_nudgeIsFallback` flag narrows that lock: once the real AI text has shown, nothing can ever replace it (BUG-034 stays fully intact); but if only the fallback has shown, a later, separate call site (wake, a later sync tick) may still pick up the AI line if it's arrived by then.
- **Delivery recovery (v2.93.22):** transient network/timeout/408/429/5xx failures release the request lock and can retry on a later natural wake/reconnect, after 30s then 2m, at most three attempts per device/day. Rejected prose is diagnosed, not automatically regenerated. Accepted recovery saves the existing cache for About; the completion cannot replace a visible fallback mid-read. Dismissal/noon and midnight isolation still apply. Diagnostics have no new UI or private wording: `Today.use('nudge').generationAudit()` is read-only and device-local.
- **Dismiss** — tap sets `day_nudge_dismissed_<date>` (per-day, clears at midnight). Synced cross-device via `_DISMISS_SYNC` registry. Legacy `trello_nudge_dismissed` / `morning_nudge_dismissed` fields kept as transition rows in registry for mixed-version devices — remove once all devices ≥ v2.19.0.
- **Reaction strip in focus:** `#dayNudgeReact` is a sibling of the nudge button so it can hold real buttons. If opened before focus, it recedes and becomes inert/hidden from assistive technology with the nudge, then returns on focus exit (v2.90.47).
- **Late answer (v2.97.5, Can's option B, Oct 19):** the default appears after the 5s wait so the strip is never blank; if the AI answer lands within 20s of that and the strip is untouched (no press, not dismissed, before noon) it replaces the default **once** with a `--dur-slow` crossfade. Otherwise About shows it and closing About / returning to the app upgrades the strip. Phone-first mornings were the case: the phone's own request missed 5s, desktop then showed the synced line.
- **Delivery readout:** tap About's muted "Today" label → one content-free line from this device's generation audit (e.g. `07:12 asked · 07:12 default 5.0s · 07:12 answered 6.8s · 07:12 swapped 6.9s`); tap again to hide. A plain tap, not long-press (iOS PWAs turn long presses into text selection). Never synced; no prose.
- **Presence:** same `.morning-nudge` CSS as before — `--surface` panel, 2px `--accent-dim` left edge, `radius-md`, `padding: 7px var(--space-3)`. Breathing `--accent` dot via `_breathe(_KF_BREATHE_SMALL, 2400ms)` (opacity 1→0.5 + scale 1→0.85 — small-element treatment per Motion.md).
- Noon cutoff: `checkDayNudge()` hides the strip at `hour >= 12`. Since v2.33.0 the cached AI line (`day_nudge_ai_<date>`) survives past noon — it lives on in About's Today block until the dated key expires at midnight. (The ✦ brief also used to read this cache — removed v2.41.0, see the Daily Brief section below.)

---

## Today Block (About panel, v2.33.0)

`#todayNudgeBlock` — the day's nudge line resurfaced above the stat tiles, the Roadmap #7 "first brick" (Dia's return-to-the-brief insight). The morning strip is dismiss-once-and-gone; this is the line's quiet second home until midnight.

- **Shell:** sibling of `#sundayBlock` — same padding/radius/margins, but plain `--border` (no accent tint) and a muted "Today" label (`.week-label` overridden to `--muted`). Reference, not announcement.
- **Rendered by:** `renderInfoStats()` through `Today.use('nudge').currentLine()` — the same staleness rule as the strip (v2.97.2), so the two homes never disagree; hidden when no current line exists (no AI key, generation failed, line retired by a named completion, or new day). Closing About hands its line to an undismissed fallback strip; tapping the muted "Today" label shows the temporary delivery readout (v2.97.5). Escaped via `esc()`.
- **Live sync:** `mergeRemoteData` re-renders About when the panel is open and a remote nudge line lands (same pattern as the focus-tile live update).
- **Wallpaper Test:** W1 via freshness (line is AI-generated from fresh context daily — W2 escape 2). Kept — the reflect-during-the-day pattern was confirmed (Roadmap #1 verdict).

---

## Noticed Block (About panel, v2.35.0)

`#noticedBlock` — what TODAY has learned, surfaced as **deltas, never facts** (Personalization.md G3, resolved). Four line types from `_noticedLines()` in `insights.js`, max 2 shown: habit milestone crossings (7/14/30/50/100), best-streak proximity, peak hour established/moved, theme of the week.

- **Shell:** `#todayNudgeBlock`'s quiet shell — plain `--border`, muted "Noticed" label. Same register as Today block: reference, not announcement.
- **Delta-gating is the design:** each line fires once when something *changes* (show-once bookkeeping in `appMemory.noticed`, device-local), then never again. Empty → block hidden. Silence weeks are correct, not broken.
- **Day cache:** `noticed_lines_<date>` (`_pruneLS`-cleaned) keeps the day's lines visible on re-open so they don't vanish between morning and evening.
- **Wallpaper Test:** W1 by construction (a line exists only when something changed); W2 escapes 1+2+3. W3 due 2026-08-02: does a line land as "it knows me" or as noise?

---

## Memory Panel — shared styling (Oct 2026 pass)

Block names (`.memory-type-name`) use the shared panel section-label treatment — `--text-xs`, 0.12em tracking, uppercase, `--muted` — so content, not headings, carries the weight. Every action is a `.memory-item-btn` text button on its row (HOW DAYS FELT's **remember** included; no borrowed pill). Quiet states (`.memory-empty`, `.memory-pending`) are muted upright DM Mono — only the upright face ships, so no synthetic italic. Footer: **clear all memory** and **Connections →** share `--text-xs`, sit flush with the content edge, and both have hover/`:focus-visible` colour (danger / text). Order: KNOWN, PATTERNS, LATELY, HOW DAYS FELT, WHAT TODAY HAS SEEN, then DREAMS. Coverage holds the 30-day outcome tally alongside tenure, lifetime completions and focus totals; Dreams closes the content list.

## Memory Panel — KNOWN (revised v2.97.4)

Returning tasks with recorded focus lead, followed by other returning tasks (age breaks ties within each group); at most five returning rows. A missing focus record says “no focus sessions recorded”, never “not started”. Open obligation-language records remain plain facts. Soon items kept at least seven days remain inspectable under **show waiting (N)** / **less**, collapsed on each visit; age reads “kept here N days”. Expanding preserves keyboard focus, and dismissing a record keeps its task in Soon. Existing five-row cap and revocation keys remain. No readiness or actionability is inferred from task age, wording or absence of focus.

## Memory Panel — PATTERNS (merged v2.95.5)

One **PATTERNS** block — *what holds over time* — replaces PATTERNS + HOW YOU WORK (the two read as the same thing at different resolutions). `renderMemoryPanel()` order: timing/pace facts (peak hours — last 90 days once they hold 20 completions, lifetime until then; task lifespan, best weekday, longest streak), then outcome contrasts from `_memoryOutcomePatterns()` (let-go reason → obligation comparison → returns), then at most **3** confirmed AI inferences of both stable types, newest support first (`_memoryShownInferences()`; task focus excludes person-wide inferences as of v2.97.10) (`semantic`, `procedural`; storage types unchanged, `rejectKey` keeps the original type so **not me** still removes, tombstones and teaches the prompt). First **6** rows; `show all (N)` / `less` (`memory.patterns-more`, focus stays on the button, resets on each open). Empty state: "patterns appear as more evidence builds".

Outcome contrasts compare like with like:
- **Let-go reason** — share among let-gos where a reason was picked (≥ 8, top ≥ 35%); ties name every top reason ("not relevant and no energy (40% each)").
- **Obligation vs other tasks** — `taskOutcomes` (90 days), each task once by its latest done/let-go, framing from that row; unknown framing (`obligation: null`, backfill) excluded. ≥ 8 resolved per side, shown when the gap is ≥ 15 points. (The old line divided resolved obligations by a daily-workload rate that re-counted carried tasks every day.)
- **Returns** — let-gos 30–90 days old, one per task `key`, linked to a later bring-back of the same key within 30 days; ≥ 10 in the cohort, rate ≥ 15% → "1 in N let-go tasks comes back within a month". (The old line divided returns by let-gos + returns, with no linkage.)

Removed: "often works on" (restates the list), "adds most tasks after the day has started / sets most tasks before the day begins" (always one of the two; 40% called "most"), "tends to defer" (word counts with no baseline or window). Their stores stay — focus and `_memoryForAI` still read them.

AI restatements: confirmed items that near-duplicate a computed line (or each other) are not rendered, and `_memoryAbstract` receives the computed lines as `computed_on_record` and drops new items that restate one. Lexical stem matching is the fallback, not a guarantee.

---

## Memory Panel — "HOW DAYS FELT" (revised v2.95.1)

**Feedback (v2.98.0):** the sentence becomes a native button with unchanged paragraph typography, disclosing the existing landed/not-really pattern. Its group label names the feeling insight. Before the first saved vote, inline copy explains up-to-30-day insight/feedback storage on-device and in connected Dropbox. Viewing does not enroll an existing user. A miss saves first and gives Undo with focus; next visit withholds the unchanged claim. A native `feeling feedback` disclosure sits with the visible insight, with a Memory-footer fallback that keeps revision/clear reachable when the insight is absent. It is collapsed by default; no count/subtitle or new panel. Rows wrap and hidden controls leave the accessibility tree. No recurring animation is added.

Appended after the main Memory blocks by `reflections._reflectionRenderMemory(el)`, in its separate `.reflection-memory-block`. No evening count or technical subtitle. The **RETIRED** block is removed; feedback records, ordinary-nudge misses and category retirement retain their existing behavior and distinct meanings.

| Condition | Content |
|-----------|---------|
| Policy absent or `not_for_me` | “TODAY doesn’t keep reflections.” + “Remember reflections” |
| Opted in, no qualified relationship, AI unavailable or reply rejected | Section hidden |
| Qualified relationship, request queued or pending | Brief “reflecting…” state |
| Current, grounded result | One complete sentence, at most 40 words |

Selection stays on-device: join reflected dates to task outcomes and compare obligation-framed/chosen completions, letting go/finishing without release, handling a task with recorded focus/handling tasks without recorded focus, or bringing a task back from Past/finishing without bringing one back. Each side needs four reflected evenings, three matching feelings on the stronger side and a ≥30 percentage-point difference. Mixed obligation/chosen evenings and unknown backfilled focus remain excluded from those comparisons.

The AI phrases only the winning aggregate. It receives no dates, task text, identifiers, full feeling distribution or alternate candidates. Local `reflected-days-v2` wording starts “In your evening reflections,” and names the feeling more often **on days** with one action than **on days** with the other. The focus context names a recorded focus session on the task, not a claim that it happened that day. Legacy “On evenings you reflected,” prose remains valid for unchanged supported readings. Stable claim identity keeps the original contexts, so copy changes do not evade withholding. Both formats preserve the comparison and avoid causes or advice. Overlong, incomplete, multi-feeling or swapped replies hide the section. The extra word allowance makes bringing a task back from Past recognizable; it adds no invented takeaway.

**Optional wording feedback (Can approved October 27, local v2.100.0):** within the opened reaction, a collapsed native **wording** disclosure offers **hard to follow** and **too formal** with named pressed-state buttons, immediate Undo and clear. First-use copy explains the narrowly scoped next-writer guidance and existing retention/Dropbox boundary; once a wording event exists it does not repeat. Review includes wording-only records and remains reachable in the block or footer when withheld. Controls wrap at 320px; saved/revised actions restore focus and use the existing live announcer. No new panel, settings, mandatory rating or animation. `reflection-wording.js` is lazily imported after the pure feedback policy and SW-precached; no eager script or provider call is added. The reading remains stable when feedback changes.

Active requests are session-bound to the canonical evidence snapshot: local date/window, consent, deletion watermark, eligible reflections and relevant outcomes. Changes invalidate results; late responses cannot replace newer work. Open Memory reconciles local changes, sync, rollover and foreground return. After explained feedback consent, displayed readings can persist in their separate bounded sensitive store with private source digests, allowing valid wording reuse. Global clear removes both source and feedback and fences late replies. Raw source retention stays thirty days; additive backup fields follow v5.5 conventions.

---

## About contextual CTAs (v2.40.0–v2.64.10)

`Focus → copy`, About → `see more`, and About → poem `share` use the shared `.copy-cta` visual component. The component owns the one-pixel transparent border, `--radius-md`, mono type, letter spacing, compact padding, line height, and muted/bordered/accent states. Each surface owns only its positioning, reveal trigger, and pointer behavior.

- Desktop: focusing a task or hovering the relevant About block reveals its CTA at `--opacity-copy`; hovering the CTA sharpens it and shows `--border`.
- Touch: the About block's existing reveal state shows the CTA at full opacity with `--border`, because there is no hover step. Poem sharing remains two taps: reveal, then share.
- The poem keeps a permanent 64px right gutter so the absolute CTA never overlaps text and does not create a reveal-time layout shift.

### Poem Share

`#poemShareBtn` (a `<span>`, not a `<button>`) — quiet contextual CTA attached to the poem block. Settled design (v2.64.10): poem text brightens on hover (`--muted` → `--text`), share label at `position: absolute; top: var(--space-2); right: var(--space-2)` inside `.poem-block`, which carries a permanent `padding-right: 44px` gutter so no layout shift on reveal. Whole block is the click target; label is a plain `<span>` (no nested button, no double-fire). Both About controls use the actual `.copy-cta` component including bordered hover/click affordance. Touch: first tap reveals, second tap shares. Native share-sheet popover position is fully OS-controlled — do not attempt to influence it via DOM focus.

**Key lesson from eight rounds of iteration (v2.40.2–v2.64.10):** "do exactly this, refer to X but simplified in these specific ways" is a literal spec — implement precisely what's described, verify each stated requirement individually, and confirm with real testing. "Same component" means diffing every property and state against the reference. Porting a pattern safely means identifying which of its *mechanics* the new content can actually support. When verifying a multi-branch function, make sure test setup exercises *every* branch a real user hits — stubbing out an API to reach a testable fallback can silently hide a gap in the primary path. Full version history in `archive/Design.md` → Poem Share history.

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
| `#trelloBtn` ✧ | `.btn-icon-attention` | A connection needs the user: `gmail_token_expired` or `dropbox_token_expired` (v2.93.18) | `connections_nudge_seen_<date>` — opening Connections stops it for the day; it returns the next day while the sign-in is still expired; Reconnect or Forget clears it |

Habits panel additionally shows a muted countdown line (`.habit-countdown`, rendered by `renderHabits()`): `Xh Ym left today` 10pm–midnight, then `before 3am` midnight–3am — deliberately no ticking minutes after midnight (surfaces the boundary without clock anxiety). Hidden when all done or outside the window.

---

## Meeting Mode (v2.22.0 desktop, v2.28.0 mobile)

Listens to a meeting through the mic; the only artifact is tasks. No transcript, no meeting history, no voice ID — fully ephemeral (state lives in module-level `_mtg`, nulled in `_meetingTeardown()`; zero meeting localStorage keys).

**Entry:** mic SVG button (`#meetingBtn`, `.add-mic-btn`) in the add bar between input and ✦. Revealed by `_meetingInit()` only when: `_meetingSupported()` passes (capability-only gate: `getUserMedia` present + `MediaRecorder` present + at least one supported MIME — `webm/opus` on desktop, `audio/mp4` on iOS) AND Gemini key set (`_aiGetKey() && _aiGetProvider()==='gemini'` — Anthropic has no audio input). Re-checked after AI connect/forget. Phone-call recording is impossible on iOS — the OS never exposes call audio to any app; meeting mode = in-room/speakerphone only.

**Listening (non-blocking):** `#meetingPill` fixed above the add bar — breathing **red** dot (`--danger`, `_KF_BREATHE_SMALL`, 2400ms; red = universal recording signal), elapsed `MM:SS`, `stop` button (labelled "stop" not "×" — × reads as delete in this app). The app stays fully usable; tasks can be added mid-meeting. Can explicitly rejected the full-screen listening mockup. Mic button gets `.live` (accent) while recording; clicking it again also stops.

**Pipeline:** `getUserMedia` → `MediaRecorder` at **32 kbps** (`audioBitsPerSecond: 32000`) via recorder **stop/restart** (never `timeslice` — later chunks aren't independently decodable). MIME: `webm/opus` on desktop (6-min chunks ≈ 1.9MB base64, under Netlify's 6MB limit); `audio/mp4` on iOS (iOS ignores `audioBitsPerSecond`, AAC can hit ~192 kbps → **2-min chunks** (`_mtg.chunkMs = 120000`) ≈ 3.95MB worst case; pre-send `blob.size > 4300000` size guard drops oversized chunks). Each chunk → base64 → `netlify/functions/meeting-extract.js` → Gemini 2.5 Flash (audio inline, transcribe-internally prompt, transcript never in the response) → `{actionItems:[{text,owner,mine}], updatedContext}`. Items are phrased in the meeting's spoken language (auto-detect, prompt-enforced — v2.27.2); attribution works cross-language. Rolling context string (speaker hints, open threads, ≤150 words) carries attribution across chunks — in memory only. Chunk failure: retry once (retries reuse the originally captured `_mtg` so a discarded meeting's chunk can't write into a new one), then drop + `_logSyncError('Meeting', …)` — a lost chunk beats a dead meeting.

**Review panel (v2.23.7):** `#meetingOverlay` (fixed scrim, bottom sheet, slideUp). Three states rendered by `_meetingRenderReview()`:
- **State 1 — digesting, no prior items:** eyebrow **Voice**, title "Digesting…" (white 15px), sub hidden, Add disabled; centred focal loader (5px dots + "last X min" below).
- **State 2 — digesting + prior items showing:** title "From what you said", sub visible; inset strip `.meeting-processing-strip` ("Still digesting last X min") above items.
- **State 3 — review ready:** eyebrow **Tasks**, title "From what you said", sub visible; thin `--border` rule separates header from items.
- **Empty result:** eyebrow **Voice**, "Nothing came up" (no star prefix). Title: "From what you said".
- **Dream:** eyebrow **Dream** — see Dream sheet below.

**One mic, three kinds of capture (v2.93.7):** the same button hears an in-room meeting, a dream, or a note to self on the phone, so no visible or spoken label assumes a meeting. The eyebrow names what was found once it is known (**Voice** while digesting or empty → **Tasks** / **Dream**); the button, pill, and PiP say "Start recording" / "Stop recording" / "Recording" / "Elapsed time". Internal names (`meeting.js`, `#meetingBtn`, `_mtg`) are unchanged.
Header: `.meeting-eyebrow` (9px muted caps) + `.meeting-review-title` (15px white, state-driven) + `.meeting-review-sub` (muted xs, conditional). Items with `mine: true` start pre-selected (v2.32.0 — reliable once names captured at tap via v2.31.0; was unselected in v2.25.4 when name was often missing). Owner shown as muted hint label. Tap to toggle; Add-count updates live. Accept → `manualTasks.push` + `renderManual()` + `dropboxAutoSave()`.

**Attribution without voice ID:** `today_user_name` ("Your first name…" input in the AI config section; fill-if-empty on merge, in backup payload) tells the prompt whose commitments to flag. The review tap is the final identity filter — AI optimizes recall, Can's tap is precision.

**Mobile (v2.28.0) — Screen Wake Lock + suspension handling:** `_meetingWakeLock()` acquires `navigator.wakeLock.request('screen')` on iOS 16.4+ (non-fatal on failure); acquired on meeting start and reacquired in `_meetingHealthCheck` (Wake Lock auto-releases on page hide — must reacquire each time). Released in `_meetingStop` and defensively in `_meetingTeardown`. Backgrounding or screen lock kills the iOS `getUserMedia` stream silently — audio tracks report `readyState === 'ended'` on resume. Detection: `visibilitychange` handler stamps `_mtg.hiddenAt` on hide; on visible calls `_meetingHealthCheck()`. Health check: dead tracks → `_meetingSuspendEnd()` (honest note, stops meeting); alive + `paused` → `rec.stop()` (onstop ships partial, restarts); alive + `inactive`/null → restart chunk. Honest-note UI: `.meeting-suspend-note` (muted xs text) prepended in all review states when `state.suspendNote` set. `finalChunkSecs` computed from `hiddenAt` when suspended so "Digesting last X min" counts pre-lock audio only. onstop identity guard (`_mtg.recorder === rec`) prevents double-restart from preempted recorder's late callback. Pending: real-device verify (iPhone PWA + Gemini key).

---

### Dream sheet (v2.92.0; kept since v2.93.0, components-only v2.93.4)

Recounting a dream into the mic produces a reading instead of tasks, and the dream is kept (`assets/dreambank.js`; Backlog § 13). Built **only from existing components**:

- **Header** — the meeting sheet's three slots, each saying something different: `.meeting-eyebrow` **Dream** · `.meeting-review-title` = the day it was told (*Sunday, Oct 4*) · `.meeting-review-sub` = where it is kept (*Kept in your Dropbox* · *Kept on this phone* · *Kept on this phone until you're online* · *Saving to your Dropbox*). The sub patches in place as the save state changes. Never a second "Your dream".
- **Body** — the reading leads (`.dream-reading`, `--text-task`), the retelling below in muted type with a left rule (`.dream-told`); `reading` dots while waiting; a failed call says *Can't read it right now. Your dream is kept.*
- **No date or thought controls** (v2.93.8) — a dream is dated by the day it was told; which night it happened is neither asked nor guessed, and there is no thought field.
- **Actions** — keeping is the default, so it carries the sheet's primary button: `.meeting-review-add` **Keep** beside the secondary `.meeting-review-drop` **Don't keep**. When a waking-life commitment was also stated, the primary reads **Add N tasks** (accepting keeps the dream too) and **Done** returns as a secondary. Every way out (Keep, Add tasks, Done, Discard while digesting) keeps the dream; only Don't keep removes it.
- Late replies patch their own nodes (reading slot, title, sub); the list is never rebuilt under the reader.
- **Touch scroll stays in the sheet** (BUG-111) — `#meetingOverlay` takes `touch-action: none`; only `#meetingItems` pans (`pan-y`, `overscroll-behavior: contain`). `inert` alone blocks focus, not touch scrolling.

### Memory → Dreams (v2.93.0, one line since v2.93.8, what comes back since v2.95.0)

A `.memory-type-block` (**DREAMS**) showing one `.memory-item`: *N dreams kept in your Dropbox* (no folder path since the Oct 2026 styling pass) with a `.memory-item-btn` **manage** / **less** (empty: *a dream you tell the mic lands here*). The list stays reachable because deleting a file in Dropbox does not remove its synced summary — per-dream delete is the in-app way out. Under **manage**, each dream is a `.memory-item`: *day — opening words…* with **read** / **less**. Opened: `.dream-reading`, `.dream-told`, then one `.memory-item` — *kept in your Dropbox* / *kept on this phone* with **delete**. Since v2.93.10, **read** fetches a pruned or second-device file from Dropbox on demand, displays any legacy note read-only, and keeps the raw body only while Memory is open. Missing/offline/invalid files show a short retryable status, not an empty reading. Delete confirms with the footer's pattern: `.memory-confirm-msg` + `.memory-clear-btn.memory-clear-confirm` **yes, delete** + `.btn-ghost.memory-conn-link` **cancel**; it removes the Dropbox file too.

**What comes back (M2, revised v2.95.1):** under the summary, one `.memory-item` — *comes back: company (2)*, up to five items, ordered by frequency then recency. Count distinct dream IDs, once per thing per dream. No duplicate recurrence rows and no per-item controls: **manage** lists the dreams (read/delete), it does not touch the recurrence line (hide and its explanation were removed in v2.95.5 — deleting a dream already removes what it contributed). The visible count has a spoken “in N dreams” equivalent, and re-rendering retains keyboard focus. Labels wrap at 320px. Recurrence is computed on-device from recorded images/people, with no AI call or new collection.

## Quick Voice Capture (v2.90.18)

**Entry:** hold Shift+Space outside text fields; release either key to finish. Window blur also finishes so a lost keyup cannot leave the microphone active. This is one spoken task, not a voice-memo library or meeting mode.

**Capture order:** the pill appears immediately as `Getting ready…`, becomes `Listening…` only after capture starts, then `Finding the words…` on release and finally `Added`. Empty audio, missing capability/connection, and transcription failure remain visible briefly instead of disappearing silently. The app behind the pill stays usable; no modal or review step is introduced for a single task.

**Privacy and fallback:** use Web Speech only when the browser confirms the active language is installed for `processLocally: true`; the recognition instance is also explicitly marked local and continuous. Otherwise, with a Gemini connection, capture one self-contained MediaRecorder blob (32 kbps, 45-second ceiling) and send it to the existing `/transcribe` function. Never use the legacy browser-cloud recognition default, never split a quick note into meeting chunks, and never persist its audio or transcript. The returned text enters through `Today.use('task-actions').addTaskFromText()` so it follows the same storage, sync, memory, motion, and enrichment path as typing.

**Silence guard (v2.90.19):** while the recorder fallback is active, an in-memory Web Audio analyser samples RMS every 40ms. At least 160ms of detected activity must clear the 0.012 speech floor before the blob can leave the device; otherwise the outcome is `Nothing heard`. A quick-capture-only request flag also instructs Gemini to return a no-speech marker for silence or unintelligible noise, and the endpoint converts that marker to empty text. The analyser is disconnected and its AudioContext closed on every finish path. Mobile Voice Note does not send this flag and is unchanged.

**Motion:** the 8px listening dot uses the established small-element breath, `_breathe(..., _KF_BREATHE_SMALL, 2400)`, through WAAPI; processing and outcome states cancel it. After a confirmed add, its red fill becomes a small accent check before the pill fades (v2.90.40). The check has a one-shot CSS transition; reduced motion shows it immediately.

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
- Splash was shown within the last **30 minutes on the same local date** → skip (covers iOS background kill + restore, which happens within seconds)
- The local date changed → show, even inside that cooldown, so the new day’s first poem is available (v2.97.6, BUG-121)
- Splash was shown more than 30 minutes ago → show (genuine desktop close + reopen)
- localStorage cleared → always show

This 30-minute window replaced an earlier date-key approach (`splash_shown_date`) which was once-per-day and blocked desktop PWA close + reopen from seeing the splash. (The poem coda's `poem_splash_date` is a separate, deliberately once-per-day key — the poem is a morning moment; the splash itself follows the 30-minute rule within each local day.)

---

## Browser Platform Behaviors (v2.64.26)

`assets/platform.js` owns the browser-facing shell integrations behind one idempotent `window._startPlatform()` call at the end of the main script: service-worker registration/update activation, coarse-pointer `visualViewport` keyboard positioning, PWA install events and browser-specific promotion, and persisted `pageshow` wake recovery. `installPWA`, `_pwaShowSteps`, and `_pwaCopyLink` remain explicit `window` functions because static/generated buttons call them by name.

The module owns behavior only. PWA and keyboard HTML/CSS remain in `index.html`; installation instructions, row dimensions, service-worker policy, and `_onWake` behavior are unchanged by the extraction.

On coarse-pointer devices, the add bar follows `visualViewport` above the software keyboard while the document's task-list scroll position stays put. Do not call `scrollIntoView()` on the fixed input: it can move the list behind the bar and leave it there after blur. The platform test exercises focus, keyboard resize, and blur from a scrolled list; physical iPhone PWA behavior still needs device verification.

**Memory controls (v2.101.0):** expand/collapse actions sit in their section header. Dismiss/not-me are revealed by row hover, touch activation or keyboard focus; extra rows use reduced-motion-aware entrance animation. HOW DAYS FELT retains its feedback block when prior feedback exists without a currently eligible insight. DREAMS Manage, PATTERNS Show all and feeling-feedback review use the same entrance for newly revealed rows (v2.101.5). The first six pattern rows stay static; reading a dream or refreshing an already open list/review does not replay the entrance.

**SOON/PAST list disclosure (v2.101.5):** opening either section uses the same reduced-motion-aware fade/slide as Memory. Animate the list container so task/status opacity stays unchanged; refreshing its children while open does not replay the entrance. Collapse remains immediate and retains the existing hidden/ARIA behavior.

**Focus feedback (v2.101.0):** the lazy `focus-ask` component preserves the answer row and reserves an end-aligned feedback button. Its independently expandable landed/not-landed row supports direct revision and one right-aligned **clear vote** action; the selected vote is white and the other muted gray. It keeps 24px native targets, keyboard activation, announcements and 320px wrapping. The counter is inert/hidden from accessibility while the answer is displayed; dismissing the answer restores it. Votes affect only the next explicit same-owner/source/session Ask and are never stored or synced. See `architecture/Focus.md` for ownership and invalidation.

**Sound delivery (15G v2.103.2):** audio output preparation must not block startup or first input. Keep gesture unlocking, the five existing sine cues, haptics and ready-state overlap. Default-output readiness may retain only the latest cue for at most one second; expired or replaced-context work stays silent. Legacy API/refusal paths remain usable. This changes no visual component or preference UI.

### Pool/Sunday wording reactions — v2.105.0

Keep the spoken sentence isolated. In the existing reactions on an actually displayed pool morning or Sunday line, a quiet native wording button opens a sibling explanation/choices row (hard to follow / too formal, optional Undo/clear all). No extra row or request is mandatory after landed; the whole vote is independent. Ordinary task nudges do not expose these pool controls. Scope and 30-day synced support appear before choosing; earlier sentences stay private. Revisions/toggle clear preserve the reading and whole vote. Native expanded/pressed/group/description semantics, Escape-to-toggle focus, 24px targets and wrapped320px choices use existing tokens. Unchanged About redraw retains focus/disclosure; source replacement invalidates stale controls. Opening wording on the morning strip cancels its miss timeout; normal sentence-dismiss behavior remains. No new motion, panel, settings or typography token.

**October 29 implementation:** Focus wording v2.106.0: preserve the isolated 34 px answer row and end feedback action. An optional wording button inside the existing reaction row opens a sibling explanation/choice group only on demand. Landed adds no visible row. Same-owner/device 7-day scope and earlier-answer privacy appear before choosing; native labels/group/expanded/pressed/Escape, 24 px targets and 320 px wrapping use existing tokens. Selected wording is white, others muted; clear all wording is independent of the right-aligned clear vote. No settings panel, extra motion or automatic request.
