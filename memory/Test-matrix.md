# TODAY — Test Matrix

> Test cases for releases. Run critical tests before every deploy.

---

## Pre-Release Checklist (REQUIRED)

Automated baseline: `node scripts/test-all.mjs` runs all 24 local suites. The live
`scripts/ai-test.mjs` remains the sole explicit exclusion because it requires an API key and
real provider calls. The runner verifies this inventory before execution. A suite that passes
only on its diagnostic retry is reported as flaky and fails the gate. Run `design-lint.mjs`
and `memory/validate-files.sh` separately; they are intentionally not part of `test-all.mjs`.

Run these **before every GitHub push**:

| # | Test | Steps | Pass |
|---|------|-------|------|
| 1 | App loads | Open fresh tab, splash dismisses | ⬜ |
| 2 | Add task | Type + Enter | ⬜ |
| 3 | Check/uncheck | Click checkbox | ⬜ |
| 4 | Delete task | Click × | ⬜ |
| 5 | Dropbox sync | Connect, verify backup | ⬜ |
| 6 | Cross-device | Add on A, appears on B | ⬜ |
| 7 | Triage flow | After 8pm, process tasks | ⬜ |
| 8 | Focus mode | Click task, timer starts | ⬜ |
| 9 | No console errors | Check dev tools | ⬜ |

---

## Quick Smoke Test (30 seconds)

Mental checklist after **any code change** — verify before moving on:

- [ ] **Add task** — Enter key adds task, appears at top
- [ ] **Check task** — Sound plays immediately (no delay)
- [ ] **Sync triggers** — Status shows "synced" (if Dropbox connected)
- [ ] **No console errors** — Red dot doesn't appear
- [ ] **Visual intact** — No broken layout, correct colors

If testing **focus mode** changes:
- [ ] Run `node scripts/focus-test.mjs` first — it covers the lifecycle automatically
      (cold-start restore, escape leaves no session, switch keeps the timer anchored,
      rapid A→B→A, render during a live session). The checks below are the ones it
      cannot reach.
- [ ] Timer counts down
- [ ] PiP opens on tab leave, closes on return
- [ ] Pause/resume works
- [ ] Complete a session, dismiss, re-click the task → fresh 25:00, not a frozen 00:00
      (BUG-027 — needs `taskStates` internals, not automatable)
- [ ] Complete a session, then start a different task → no `.complete` styling bleeds
      into the new session's bar (BUG-022/028 — same reason)

If testing **task or habit reorder** changes:
- [ ] Run `node scripts/drag-test.mjs` first — it covers desktop and touch ordering,
      persistence and sync timestamps, guards, long-press cancellation, and cleanup.

If testing **task actions** (add, copy, complete, delete, undo, or stats/favicon):
- [ ] Run `node scripts/task-actions-test.mjs` first — it covers direct mutations,
      delegated row controls, focus interception, feedback, accessibility state, and favicon refresh.

If testing **zone** changes:
- [ ] Triage bar appears 8pm–midnight
- [ ] Zone moves trigger sync
- [ ] Other device receives changes

---

## Design Review Gate: The Wallpaper Test

> Full principle: `design/Philosophy.md`. Not a per-deploy checkbox — that would itself become wallpaper. Triggered by the change type, not the release.

**When a change adds or modifies a recurring surface** (message, badge, panel, animation, stat, AI feature):

| Gate | Question | When |
|------|----------|------|
| W1 | Does it deliver value **every time** it appears — info the screen doesn't show, an action worth taking now, or a genuinely fresh feeling? | Before shipping |
| W2 | Which escape does it use — appear rarely (gated on signal), different each time (fresh context), or should it not exist? | Before shipping |
| W3 | Day-14 follow-up: is it still delivering, or has the user stopped reading/tapping/opening it? Behavioral symptoms (untapped chips, unopened panels) are the measurable signal. | ~2 weeks after ship |

A surface that fails W3 gets iterated or removed — removal is a valid outcome (`#weekNarrative`, v2.17.66).

**Tooling:** `/design-review` (`.claude/commands/design-review.md`) runs this gate (W1/W2, plus voice/token/component/motion/psychology consistency) against a diff or named surface — call it for anything landing here. It's judgment-based, not a script; `scripts/design-lint.mjs` covers the mechanical half (tokens, vocabulary, emoji selectors) and should be run first so the design review isn't spent re-deriving what a linter already caught.

---

## Full Test Matrix

### Shared Poem Permalink

- [ ] `/poem.html?date=2026-08-12` returns HTTP 200 and renders the dated poem.
- [ ] Initial response HTML contains non-placeholder `og:title`, `og:description`, `twitter:title`, and `twitter:description` values.
- [ ] Missing or malformed poem corpus falls through to the static page instead of returning an edge-function 500.

### 1. Manual Tasks (18 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 1.1 | Add task | Appears at top |
| 1.2 | Edit task | Text updated |
| 1.3 | Delete task | Removed + undo available |
| 1.4 | Reorder (drag) | Order preserved |
| 1.5 | Check task | Done state, strikethrough |
| 1.6 | Uncheck task | Restored |
| 1.7 | XSS: `<script>` | Escaped, no execution |
| 1.8 | Empty input | Rejected |
| 1.9 | Long text (500+) | Wraps |
| 1.10 | Delete last task → empty list | Day's poem appears (not static "A clean slate" — v2.26.0) |
| 1.11 | Check all tasks done | ✦ star above day's poem (not static "✦ All done" text — v2.26.0) |
| 1.12 | Shift+D | Clears done tasks |
| 1.13 | Rapid check/uncheck | No glitch |
| 1.14 | 100 tasks | All render |
| 1.15 | Add `work: task` while pointer is over the arriving row | Full two-pass arrival shimmer completes; hover does not replace it or flash midway |
| 1.16 | Hover tagged row after arrival settles | One forward pass uses the same muted/lime gradient, then returns to normal muted text |
| 1.17 | Type and save plain, skin-tone, flag, and joined emoji | Each grapheme remains visible as one shaped glyph in the input mirror and is stored/rendered without replacement characters |
| 1.18 | Reorder a task while its inline AI helper is visible, then rebuild the list | The same single helper remains directly below its owning task after upward/downward pointer or Option+Arrow moves and after render replacement |

### 2. Zones (17 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 2.1 | Triage: Keep | Stays in TODAY |
| 2.2 | Triage: Soon | Moves to SOON |
| 2.3 | Triage: Let go | Moves to PAST |
| 2.4 | Pull from SOON | Returns to TODAY |
| 2.5 | PAST purge (done 7d) | Auto-removed |
| 2.6 | PAST purge (letgo 30d) | Auto-removed |
| 2.7 | Morning nudge (no review) | Shows carried-over count |
| 2.7a | Morning nudge (with review) | Shows "Yesterday: X done, Ym focused" |
| 2.7b | Morning nudge after noon | Hidden, review cleared + AI cache cleared |
| 2.7c | Morning nudge AI upgrade (v2.17.73) | Rule-based line renders instantly, AI sentence fades in when ready; cached — same sentence on re-open that morning |
| 2.7d | Morning nudge AI — no key / offline | Rule-based line stays, no error, no loading state |
| 2.7e | Morning nudge dismissed while AI fetching | Stays dismissed — AI response does not resurrect it |
| 2.8 | **SYNC: A→SOON, B has in TODAY** | B gets SOON (newer timestamp) |
| 2.9 | **SYNC: A pulls back, B has in SOON** | A's pull wins (newer) |
| 2.10 | **SYNC: Both move to zones** | Most recent zoneChangedAt wins |
| 2.11 | **SYNC: Delete + zone conflict** | Deleted task excluded from zones |
| 2.12 | **SYNC: Missing zoneChangedAt** | Graceful fallback (no crash) |
| 2.13 | **SYNC: Schema v5.0 vs v5.1** | Backward compatible |
| 2.14 | **SYNC: Race condition triage** | Last zoneChangedAt wins |
| 2.16 | Triage summary (5+ done) | Shows "Solid day" + stats |
| 2.17 | Triage summary (0 done) | Shows "All sorted" |
| 2.18 | Triage summary saves review | `today_day_review` in localStorage |

### 3. Habits (12 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 3.1 | Add habit | Appears in list |
| 3.2 | Complete today | Dot filled |
| 3.3 | Delete habit | Removed |
| 3.4 | Rename habit | Name updated |
| 3.5 | Reorder habits | Order preserved |
| 3.6 | **SYNC: Both add habits** | Union merge |
| 3.7 | **SYNC: Both complete same day** | Deduped |
| 3.8 | **SYNC: A deletes, B completes** | Habit deleted |
| 3.9 | Focus on habit | Session tracked |
| 3.10 | **SYNC: A unchecks, B has checked (BUG-026)** | Stays unchecked — LWW timestamp wins |
| 3.11 | **Habit 3am rollover** — check habit at 1am | Counts for yesterday's date, not today's |
| 3.12 | **Habit 3am rollover** — open at 3:01am | Habit strip shows today fresh, yesterday's check preserved as past dot |

### 4. Done/Check State (7 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 4.1 | A checks 10:00, B unchecks 10:05 | Unchecked (newer) |
| 4.2 | A unchecks 10:00, B checks 10:05 | Checked (newer) |
| 4.3 | No timestamp history | Union fallback |
| 4.4 | Trello card checked | Syncs via done_ids |
| 4.5 | Manual task checked | Persists across sync |
| 4.6 | **SYNC: Check/uncheck rapid toggle** | Final state correct |
| 4.7 | **BUG-055: Second-device first-open** — tasks checked on device A today, device B opens for first time | Done tasks stay in TODAY, not moved to PAST (fix v2.30.1 — `today_checked_ids` timestamps distinguish today vs yesterday) |

### 5. Stats & Memory (16 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 5.1 | Focus minutes — same day, two devices | Max wins (higher of the two) |
| 5.2 | Focus minutes — after midnight reset | Remote yesterday's total NOT restored (date guard via `stat_focus_mins_date`) |
| 5.3 | Focus minutes — manual Restore button | Only restored if backup date matches today |
| 5.4 | Streak | Max wins; `stat_streak_date` guards against double-increment on multi-device (BUG-020) |
| 5.5 | Tasks done today | Max wins |
| 5.6 | Memory totalTasksCompleted | Max wins |
| 5.7 | Memory patterns | Merged |
| 5.8 | Memory moments | Union |
| 5.9 | AI name | Preserved |
| 5.10 | SOON phantom — complete/delete task in SOON, sync next day | Task does NOT reappear in SOON |
| 5.11 | Daily history — midnight snapshot | `today_daily_history` gains a new entry after midnight; capped at 30 entries |
| 5.12 | About weekly grid | "This week" section shows 7-day grid with bar heights matching task counts |
| 5.13 | Sunday earned reflection | On Sunday, a qualifying evidence-backed candidate is AI-written and cached; a flat week leaves the sentence hidden |
| 5.14 | Daily-history sync receives local, duplicate-date, and remote-only `tasksAdded` values | 0–30 preserved; values above 30 normalize to 0 before storage; other per-day fields still merge normally |
| 5.15 | Memory completion rate has five valid days plus one restored day with `tasksAdded: 31` | Invalid day is excluded; rate and evidence totals use only the five plausible days |
| 5.16 | Inline suggestion generation finishes while its task is off-screen, then the list re-renders and the task enters view | No row/offer/exposure before entry; pending delivery re-anchors by task ID; entry mounts and measures it; replacement/removal cancels; reason outcomes still learn and sync |

### 6. Trello (8 tests)

Run `node scripts/trello-test.mjs` for mocked-API coverage of board/list selection,
OAuth headers, card filtering, render/cache state, errors, reconciliation, and disconnect.

| # | Scenario | Expected |
|---|----------|----------|
| 6.1 | Trello connect | Cards load |
| 6.2 | Trello disconnect | Cards cleared |
| 6.3 | Trello in triage (keep) | Card visible |
| 6.4 | Trello in triage (letgo) | Card hidden locally |
| 6.5 | Trello config syncs | boardId/listId synced |
| 6.6 | Trello popup blocked | Error shown |
| 6.7 | Trello checklist badge | Card with checklist shows "N/M ✓" in meta row |
| 6.8 | Trello focus — complete, dismiss, re-click | Fresh 25:00 starts on first click (BUG-027) |

### 7. Focus Mode (11 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 7.1 | Start focus | Timer runs |
| 7.2 | Pause (click outside) | Timer pauses |
| 7.3 | Tab away, return | Wall-clock correct |
| 7.4 | PiP sync | Both displays match |
| 7.5 | Session complete | Chime + count increment |
| 7.6 | PWA cold open | Splash appears immediately — no white flash before it |
| 7.7 | PiP: timer completes while minimized | PiP shows 00:00, bar full, button switches Breathe→Again |
| 7.8 | Completion — bar state | Bar fills and immediately starts pulsing "again?" (no static pause, BUG-028) |
| 7.9 | Window return with completed bar | Bar pulses on return with no flash (BUG-028b) |
| 7.10 | AI send from input bar | Type text, tap ✦ → AI responds (no ReferenceError, BUG-029) |
| 7.11 | _onWake rapid double-fire | Alt-tab away and back quickly multiple times — no repaint glitches |

### 8. Network Edge Cases (7 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 8.1 | Offline add, reconnect | Task syncs |
| 8.2 | Token expired | Re-auth prompt |
| 8.3 | Failed backup | Retry on tab focus |
| 8.4 | Rapid sync (both devices) | No data loss |
| 8.5 | Slow network (30s) | "Saving..." shown |
| 8.6 | **localStorage quota exceeded** | Red dot shown with clear message (fixed v2.17.70) |
| 8.7 | **localStorage disabled** | App loads, no persist |

### 9. Destructive Operations (4 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 9.1 | Shift+D clear done | Done tasks removed |
| 9.2 | Disconnect Dropbox | B keeps last sync |
| 9.3 | Clear localStorage | B maintains data |
| 9.4 | AI delete_task | Tracked in deleted_ids |

### 10. Meeting Mode (8 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 10.1 | First mic tap — no name set | `#meetingNamePrompt` appears above add bar; meeting does not start yet |
| 10.2 | Name prompt — submit a name | Name saved, Connections chip updated, meeting starts, prompt hides |
| 10.3 | Name prompt — submit empty | Meeting starts without a name (user chose to proceed) |
| 10.4 | Name prompt — Escape | Prompt dismisses, no meeting starts |
| 10.5 | Meeting start → stop | Pill appears with elapsed time and red recording dot; stopping shows review panel |
| 10.6 | Review panel — items listed | "From your call" title; items in chronological order with owner hint labels |
| 10.7 | Review panel — auto-select | Items where `mine: true` start pre-selected; others start unticked; tapping toggles |
| 10.8 | Accept selected items | Selected items added to task list; sync fires; review panel closes |

### 11. Poem & Daily Brief (8 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 11.1 | Splash — first open of the day | After typewriter, day's poem fades in below the date; holds 4–9.5s; tap skips |
| 11.2 | Splash — second open same day | Poem coda skipped; splash dismisses normally |
| 11.3 | Empty task list | Day's poem displayed (clean-slate echo — not static text) |
| 11.4 | All tasks done | ✦ star above day's poem (done echo) |
| 11.5 | ✦ empty tap (no text in input) | Daily brief opens: AI nudge line + today's poem |
| 11.6 | ✦ empty tap — no nudge cache, no poem | Falls through to proactive AI suggestions |
| 11.7 | Run smoke guard against `assets/poems.js` | Exactly 129 reviewed entries; every entry has text/author/source, a valid season, and 2–11 nonblank lines; approved voices including Cotter's Rain Water pairing and audited season tags are pinned; final-cut passages remain absent |
| 11.8 | Open About on a solar-term date in Northern and Southern Hemisphere time zones | Noticed keeps the same transition-day cadence but rotates the term and observation by half a year (for example, June 21 is Summer Solstice in the north and Winter Solstice in the south) |

### 12. PAST Revive (3 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 12.1 | Aged or let-go task in PAST — hover | ↩ soon button appears on the row |
| 12.2 | Click ↩ soon | Task moves to SOON with same ID; `zoneChangedAt` refreshed; `revived` counter increments |
| 12.3 | Done task in PAST — hover | No ↩ soon button (done stays — PAST is acknowledgment) |

### 13. About — Sunday/Monday Layer (5 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 13.1 | Open About on Sunday with a qualifying pattern (AI key set) | Code selects one candidate; prompt contains its evidence/meaning only; grounded AI line cached in `week_reflection_<date>` with current `week_policy_<date>` |
| 13.2 | Open About on Monday (AI key set) | `#sundayBlock` shows "New week" label + AI intention prompt; cached in `monday_intention_<date>` |
| 13.3 | Open About on Sunday — no AI key / offline | Sunday block hidden; no generic counter-summary fallback and no false negative-cache stamp |
| 13.4 | Open About Tuesday–Saturday | No Sunday/Monday block shown |
| 13.5 | Flat week, identity/causal response, or old unmarked cache | Flat week abstains; overclaim rejected; old copy removed and cannot restore from Dropbox without current policy |

---

## Test Summary

| Category | Count | Critical |
|----------|-------|----------|
| Manual Tasks | 16 | 5 |
| Zones | 17 | 8 |
| Habits | 12 | 5 |
| Done State | 7 | 4 |
| Stats/Memory | 16 | 6 |
| Trello | 8 | 3 |
| Focus | 11 | 4 |
| Network | 7 | 4 |
| Destructive | 4 | 2 |
| Meeting Mode | 8 | 4 |
| Poem & Daily Brief | 8 | 3 |
| PAST Revive | 3 | 2 |
| About Sunday/Monday | 5 | 3 |
| **Total** | **120** | **53** |

---

## Edge Cases: Time & Timezone (needs testing)

| # | Scenario | Risk | Mitigation |
|---|----------|------|------------|
| T1 | **Timezone change (travel)** | Date string changes mid-day → unexpected cleanup | `stat_last_visit` is local-only, but date shift could trigger `applyNewDayCleanup()` |
| T2 | **DST spring forward** (2am→3am) | No risk — midnight boundary already passed | Cleanup ran at last midnight |
| T3 | **DST fall back** (2am→1am) | No risk — midnight boundary already passed | Cleanup ran at last midnight |
| T4 | **Multi-timezone sync** | Device A/B have different "today" | `stat_last_visit` not synced — each device manages own day |
| T5 | **Manual restore after travel** | `toDateString()` uses device timezone | Equivalent to `_getAppDay()` post-v2.12.74 — no separate bug |

### Testing Instructions

**T1 — Timezone change:**
1. Open app, add tasks, check some done
2. Change system timezone forward/back several hours
3. Reload app
4. Verify: done tasks NOT cleared, streak intact

**T3 — DST fall back simulation:**
1. Open app at "1:30am" (simulated)
2. Change clock back to 12:30am
3. Wait for sync tick (7s)
4. Verify: cleanup doesn't run twice

---

---

## 14. Post-Triage Reflections (v2.65.7)

### Consent lifecycle

| # | Scenario | Expected |
|---|----------|----------|
| 14.1 | Triage complete, no policy, cooldown permits | `#triageReflection` shows intro copy + Remember / Not for me |
| 14.2 | Triage complete, no policy, cooldown not elapsed | `#triageReflection` empty |
| 14.3 | Tap "Remember" | Policy saved `remember`, intro replaced by six-word buttons, timer reset to 8s |
| 14.4 | Tap "Not for me" | Policy saved `not_for_me`, `#triageReflection` cleared, timer reset to 3s |
| 14.5 | Triage complete, policy = `remember`, no today response | Question shown, timer 6s |
| 14.6 | Triage complete, policy = `remember`, today response exists | `#triageReflection` empty |
| 14.7 | Triage complete, policy = `not_for_me` | `#triageReflection` empty |

### Timer paths

| # | Scenario | Expected |
|---|----------|----------|
| 14.8 | Intro visible (10s), user hovers `#triageComplete` | Timer pauses |
| 14.9 | User taps "Remember" | Timer resets to 8s |
| 14.10 | User selects feeling | Timer resets to 3s |
| 14.11 | User taps "Not for me" | Timer resets to 3s |

### Response validation

| # | Scenario | Expected |
|---|----------|----------|
| 14.12 | Tap "present" | Entry `{date: today, feeling: 'present', updatedAt: ISO}` saved |
| 14.13 | Tap second feeling same day | Entry replaced (not appended) |
| 14.14 | 31 reflections across 31 days | Oldest entry pruned; list stays at 30 |
| 14.15 | Invalid `feeling` value passed to `reflectionSelect` | Silently ignored, no write |

### Memory panel & deletion

| # | Scenario | Expected |
|---|----------|----------|
| 14.16 | Open Memory panel, policy = `remember`, 3 entries | "Remembering last 30 days." shown; count sentence; no observation (< 14) |
| 14.17 | 14+ entries with dominant feeling (≥45%) | On-device observation shown |
| 14.18 | 7+ entries + AI configured | "Reflect" button shown |
| 14.19 | Tap "Forget reflections" → "Yes, forget" | Policy = `not_for_me`, `today_reflections` removed, `reflections_cleared_at` stamped |
| 14.20 | Policy = `not_for_me` in panel | "Remember reflections" button shown |
| 14.21 | Tap "Remember reflections" | Policy = `remember`, Memory block re-renders |

### Dropbox sync invariants

| # | Scenario | Expected |
|---|----------|----------|
| 14.22 | Remote has newer `reflection_policy.updatedAt` | Remote policy adopted |
| 14.23 | Local has newer `reflection_policy.updatedAt` | Local policy kept |
| 14.24 | Both have same `updatedAt` | Remote wins |
| 14.25 | Remote has a response for a date local doesn't | Entry merged in |
| 14.26 | Both have a response for same date; remote newer | Remote entry wins |
| 14.27 | Remote `reflections_cleared_at` newer | Watermark adopted; entries ≤ watermark discarded |
| 14.28 | Backup payload | `reflection_policy`, `reflections`, `reflections_cleared_at` present; `today_reflection_intro_seen_at` absent |

### Observation thresholds

| # | Scenario | Expected |
|---|----------|----------|
| 14.29 | 13 reflections | No observation |
| 14.30 | 14 reflections, top feeling 44% | No observation (below 45%) |
| 14.31 | 14 reflections, top feeling 45% | Observation: "On evenings you reflected, `<feeling>` was the most common feeling." |
| 14.32 | 14 reflections, no dominant, no focus history | No observation |

### AI reflection privacy

| # | Scenario | Expected |
|---|----------|----------|
| 14.33 | Tap "Reflect" | Network request body contains only `evenings_count`, `feeling_counts`, optional `on_device_observation`, optional `focus_groups` — no task text, no raw dates, no names |
| 14.34 | Result returned | Session-only; `_reflectResult` set; not written to localStorage |
| 14.35 | Page reload after AI reflection | No `_reflectResult` in fresh session |

### Static wiring

| # | Scenario | Expected |
|---|----------|----------|
| 14.36 | `reflections.js` file exists | node --check passes |
| 14.37 | `sw.js` precache | `'/assets/reflections.js'` present |
| 14.38 | `CACHE_VERSION` | Matches current `APP_VERSION` (smoke-test gate) |
| 14.39 | `index.html` script order | `reflections.js` after `dropbox.js`, before `triage.js` |
| 14.40 | `#triageReflection` DOM | Present between `#triageSummary` and `#triageUndoBtn` |

---

## 15. Accessibility (v2.68.0)

### Automated gate

| # | Scenario | Expected |
|---|---|---|
| 15.1 | Run `node scripts/accessibility-test.mjs` | axe-core reports no violations in representative main, disclosure, focus, triage, meeting-review, mobile, and poem states |
| 15.2 | Inspect reachable controls | Every control has a name and native/state semantics; closed UI is absent from tab order and accessibility tree |
| 15.3 | Open/close triage and meeting review | Initial focus enters, Tab/Shift+Tab stay contained, background is inert, Escape closes, invoking focus returns |
| 15.4 | Focus a manual/Trello/habit row; press Option+Up/Down | Item persists in the new order, retains focus, and announces position; first/last boundaries announce without moving |
| 15.5 | 320px viewport and zoom-capable metadata | No document-level horizontal overflow; viewport contains no zoom-disabling directives |
| 15.6 | Computed targets/tokens | Representative controls are at least 24×24px; muted text and interactive borders meet the documented contrast thresholds |
| 15.7 | Open Memory panel | “clear all memory” and “Connections →” retain 4px padding and at least 24px height |
| 15.8 | Copy a focused task, then leave/re-enter focus before 1.8s | Label resets immediately to `copy`; `.copied` does not leak into the next focus session |
| 15.9 | Complete a task | Row returns to exactly 25% opacity while completion button keeps its accessible name and pressed state |

### Manual keyboard and screen-reader gate

- [ ] macOS Safari keyboard-only: skip link; add, complete, delete, undo; disclosures; focus; triage; meeting selection/review; Option+Arrow reorder.
- [ ] macOS Chrome keyboard-only: repeat the same flow and confirm focus indication/restoration.
- [ ] VoiceOver in Safari and Chrome: names, headings/lists, pressed/expanded/busy/progress state, live announcements, dialog containment, and poem sharing.
- [ ] iPhone installed PWA with VoiceOver: task/habit actions, disclosures, triage, meeting/Voice Note, zoom, orientation, and narrow reflow.
- [ ] 200% browser zoom and 320 CSS-pixel reflow: no clipped actions, lost content, or horizontal document scrolling.
- [ ] Real focus and meeting PiP: keyboard controls, names/state, timer/progress output, focus reveal, and reduced-motion behavior.

### Known exception

Completed task rows intentionally use 25% opacity, so WCAG 2.2 criteria 1.4.3 and 1.4.11 remain unmet for that state. Pointer reorder remains drag-only, so criterion 2.5.7 also remains unmet. Do not record the product as fully WCAG-conformant. See `Accessibility-audit.md`.

*Last updated: v2.71.18 · Aug 2026*
