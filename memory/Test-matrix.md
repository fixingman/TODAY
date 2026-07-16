# TODAY — Test Matrix

> Test cases for releases. Run critical tests before every deploy.

---

## Pre-Release Checklist (REQUIRED)

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
- [ ] Timer counts down
- [ ] PiP opens on tab leave, closes on return
- [ ] Pause/resume works

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

### 1. Manual Tasks (14 tests)

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

### 5. Stats & Memory (13 tests)

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
| 5.13 | Sunday AI reflection | On Sunday, `#sundayBlock` shows AI-generated sentence; cached in `week_reflection_YYYY-MM-DD` |

### 6. Trello (8 tests)

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

### 11. Poem & Daily Brief (6 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 11.1 | Splash — first open of the day | After typewriter, day's poem fades in below the date; holds 4–9.5s; tap skips |
| 11.2 | Splash — second open same day | Poem coda skipped; splash dismisses normally |
| 11.3 | Empty task list | Day's poem displayed (clean-slate echo — not static text) |
| 11.4 | All tasks done | ✦ star above day's poem (done echo) |
| 11.5 | ✦ empty tap (no text in input) | Daily brief opens: AI nudge line + today's poem |
| 11.6 | ✦ empty tap — no nudge cache, no poem | Falls through to proactive AI suggestions |

### 12. PAST Revive (3 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 12.1 | Aged or let-go task in PAST — hover | ↩ soon button appears on the row |
| 12.2 | Click ↩ soon | Task moves to SOON with same ID; `zoneChangedAt` refreshed; `revived` counter increments |
| 12.3 | Done task in PAST — hover | No ↩ soon button (done stays — PAST is acknowledgment) |

### 13. About — Sunday/Monday Layer (4 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 13.1 | Open About on Sunday (AI key set) | `#sundayBlock` shows "This week" label + AI-generated reflection; cached in `week_reflection_<date>` |
| 13.2 | Open About on Monday (AI key set) | `#sundayBlock` shows "New week" label + AI intention prompt; cached in `monday_intention_<date>` |
| 13.3 | Open About on Sunday — no AI key / offline | Sunday block hidden (no fallback for Monday intention; Sunday has rule-based fallback) |
| 13.4 | Open About Tuesday–Saturday | No Sunday/Monday block shown |

---

## Test Summary

| Category | Count | Critical |
|----------|-------|----------|
| Manual Tasks | 14 | 5 |
| Zones | 17 | 8 |
| Habits | 12 | 5 |
| Done State | 7 | 4 |
| Stats/Memory | 13 | 5 |
| Trello | 8 | 3 |
| Focus | 11 | 4 |
| Network | 7 | 4 |
| Destructive | 4 | 2 |
| Meeting Mode | 8 | 4 |
| Poem & Daily Brief | 6 | 3 |
| PAST Revive | 3 | 2 |
| About Sunday/Monday | 4 | 2 |
| **Total** | **114** | **51** |

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

*Last updated: v2.32.0 · Jul 2026*
