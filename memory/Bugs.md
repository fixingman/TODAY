# Bugs

> Full history for verified bugs → `Bugs-archive.md`

## Status key

| Badge | Meaning |
|-------|---------|
| ✅ `vX.X.X`  | Fixed and verified by Can on real device |
| ⏳ `vX.X.X`  | Fix shipped — awaiting real-device verification |
| 🔍 Diagnosing | Root cause not yet confirmed — investigation in progress |
| ⚠️ Stale     | Fix shipped long ago, never verified, condition may no longer be reproducible |
| 🚫 Rejected  | Not a fixable app bug (platform limitation, won't fix) |

## Status Summary

| # | Description | Status |
|---|---|---|
| 095 | Task, habit and Ask inputs saved to the browser autofill store — no `autocomplete="off"` | 🔍 Diagnosing |
| 094 | "Undo" persists into the reflection step, reading as undoing the answer not the sorting | ⏳ v2.80.6 |
| 093 | ↩ and ↗ enrichment indicators flash on tap on mobile — hover rule unguarded | ⏳ v2.80.5 |
| 092 | Task cards don't age visually on mobile — desktop-only side effect of BUG-079 fix | ⏳ v2.80.3 |
| 091 | Gmail enrichment picks wrong email — forces person query for topic-based tasks | 🔍 Diagnosing |
| 090 | `task-enrich` Netlify function returns 500 on every call — enrichment never loads | ✅ v2.77.7 |
| 089 | "Open in Mail" opens browser instead of native Mail app | ⏳ v2.77.6 |
| 088 | Inline AI helper stays behind when its task is reordered | ✅ v2.77.3 |
| 087 | Emoji disappear or render broken in the animated task input | ⏳ v2.77.2 |
| 086 | Completion rate in Memory exceeds 100% — wrong denominator (4th root cause) | ✅ v2.75.13 |
| 084 | Checkmark confetti is vertically offset from its checkbox on mobile | ✅ v2.71.8 |
| 083 | Past→Soon revive causes black screen — interface unresponsive until refresh | ⏳ v2.77.10 |
| 082 | Post-triage done counter shows 0 after same-day triage | ✅ v2.71.34 |
| 078 | `TRIAGE_HISTORY_MAX` out of scope — `ReferenceError` on Dropbox pull/restore | ✅ v2.65.17 |
| 077 | Trello “Network error” flash on Dropbox reconnect or midnight boundary | ✅ v2.65.4 |
| 076 | Splash exit leaves `O` and `AY` visible while poem coda disappears | ✅ v2.65.3 |
| 075 | Tagged task flashes or shimmer-timing changes when hover overlaps arrival animation | ✅ v2.64.20 |
| 074 | Shared `/poem.html` links crash in Netlify Edge Function before static page loads | ✅ v2.64.12 |
| 073 | Focus Ask says “this late” without supplying the actual local time | ✅ v2.64.9 |
| 072 | Triage flow never completes — “Let go” tapped but completion screen never appears | ⏳ v2.61.6  |
| 071 | App goes blank on wake/PWA background return while in focus mode (BUG-004/056 recurrence) | ⏳ v2.61.5  |
| 070 | Undo toast reason chips unclickable on narrow screens | ✅ v2.61.4  |
| 069 | Poem OG preview may show wrong poem for southern-hemisphere users | 🚫 Rejected  |
| 068 | Trello card 🍅 session count resets every morning | ✅ v2.52.1  |
| 067 | Focused task jumps near top of viewport after focus ends | ✅ v2.44.1  |
| 066 | Focus minutes from another device read 0 on second-device open | ✅ v2.43.8  |
| 065 | Focus mode re-opened after leaving; timer bar torn loose on fast task switch | ✅ v2.43.7  |
| 064 | Focused Trello card un-ages for one day then returns at a heavier dim tier | ✅ v2.43.6  |
| 063 | Focus sessions near midnight wiped by new-day reset race | ✅ v2.42.4  |
| 062 | Native share-sheet popover opens far from the poem's click point, not fixable from page DOM | 🚫 Rejected  |
| 061 | Sunday/habit badges silently fail to show on a fresh device (same root cause as BUG-060) | ⚠️ Stale  |
| 060 | Completed Trello card reappears as active after daily sync | ✅ v2.40.1  |
| 059 | Task card age reset by sync after focus — card re-dims on refresh | ✅ v2.36.5  |
| 058 | Noticed block in About shows different content between devices | ✅ v2.36.3  |
| 057 | About "This week" / "New week" AI text differs between devices (cache never synced) | ✅ v2.36.1  |
| 056 | BUG-004 recurrence — blank app after long Mac sleep (GPU wakeup too slow for 1500ms repaint ceiling) | ✅ v2.31.9  |

---

*BUG-001 – BUG-055 → `archive/Bugs-archive.md` (summary table + full detail). Below: bugs still awaiting verification.*

---

## BUG-095 — Task, habit and Ask inputs are saved to the browser's autofill store

**Status:** 🔍 Diagnosing — fix identified, not yet applied

**Symptom:** A bubble appears above the add-task bar showing previously typed text. Reported by Can with a screenshot: *"there is a strange tooltip on top of the task input bar what is this, never seen it."* It is Chrome's own form-autofill suggestion list — it renders *above* the field because the add bar is pinned to the bottom of the viewport, which is why it does not look like the usual dropdown. It only appears once the browser has stored entries for that field and the typed prefix matches, which is why it had not been seen before.

**Root cause:** `#newTask` (index.html:4316), `#habitInput` (4141) and `#aiNlInput` (4392) carry no `autocomplete` attribute, so the browser stores and re-offers their values. The convention already exists in the codebase and is applied to the credential and name fields — `#meetingNamePromptInput` (4360), the dynamically rendered API-key inputs (`connections.js:616`) and `#meetingNameInput` (`meeting.js:64`) all set `autocomplete="off"`. The three fields that carry the user's *content* were simply missed.

**Why this is more than cosmetic:** Rule 32 states TODAY's promise is the absence of observation, and the privacy model is that task data is local and user-owned. Without `autocomplete="off"`, every task title, habit name and question asked of the AI is copied into the browser's own autofill store — outside the app, outside Dropbox, and outside anything the app can clear. It survives disconnecting Dropbox and the Connections "Forget" flows, and it syncs to the user's Google account when Chrome sync is on. The Ask input is the most exposed of the three, since it holds free-form questions about the user's life.

**Fix (identified):** add `autocomplete="off"` to the three inputs. Deliberately *not* copying the full attribute set used on the name/key fields — `spellcheck="false"` and `autocorrect="off"` make sense for names and API keys but not for task prose, where they are typing aids the user may want. That is a separate UX decision, not part of this defect.

**Not yet applied:** a concurrent agent held uncommitted changes in `index.html` at the time of filing; staging is per-file, so applying it then would have bundled unrelated work into the same commit.

---

## BUG-094 — "Undo" persists into the reflection step, where it reads as undoing the wrong thing

**Status:** ⏳ v2.80.6

**Symptom:** After triage completes, the "All sorted" screen shows the reflection prompt — either the one-time opt-in ("Remember how days felt?" with *Remember* / *Not for me*) or the feeling picker. An "Undo" button sits directly beneath those choices, reading as a third, quieter option in the same group. Reported by Can: *"i see undo, what does it undo? i am not sure if that is what i expect to see as a cta at these context."*

**Root cause:** `#triageUndoBtn` is shown when triage completes (`triage.js:455`) and only hidden once a feeling is selected (`reflections.js:202`), so it stays on screen through the whole reflection step — a step it has nothing to do with. Its label is the bare word "Undo" with no scope, while `triageUndo()` restores a full pre-triage snapshot: `manualTasks`, `doneIds`, `soonTasks`, `pastTasks` and the checked/unchecked id lists, then clears the dismissed flag, re-renders and pushes a Dropbox backup.

The combination is what makes it a real defect rather than a wording nit: the mislabelled affordance is also the destructive one. Read as "dismiss this question" or "undo my answer" — both natural readings in that position — it silently discards every sorting decision just made.

**Fix (v2.80.6):** Label changed to "Undo sorting" so the scope is explicit. Deliberately *not* hidden during the reflection step: the reflection appears immediately after triage, so those seconds are the main window in which a user would notice they mis-sorted. Removing the escape hatch to fix the ambiguity would trade one problem for another. Naming the scope fixes the reading without closing the exit.

---

## BUG-093 — ↩ and ↗ enrichment indicators flash on tap on mobile

**Status:** ⏳ v2.80.5

**Symptom:** On mobile, the Gmail (↩) and agent (↗) enrichment indicators briefly flash visible when tapping a task that has enrichment. The flash is random-feeling because users don't associate tapping with indicator visibility.

**Root cause:** Same class as BUG-079. `.task:hover .gmail-indicator` and `.task:hover .agent-indicator` were both outside any `@media (hover: hover)` block. Touch devices briefly fire `:hover` on tap, making the indicators momentarily visible.

**Fix (v2.80.4):** Both hover rules wrapped in `@media (hover: hover)`. On mobile, indicators are only visible during the arrive animation (on first enrichment) and inside focus mode.

**Verification:** On mobile, tap several tasks with ↗ or ↩ enrichment — no flash. Arrive animation should still play once when enrichment first lands.

---

## BUG-092 — Task cards don't age visually on mobile

**Status:** ⏳ v2.80.3

**Symptom:** Card aging (opacity 0.75/0.55/0.35 for young/mid/old tasks) visible on desktop PWA but absent on mobile — all cards render at full opacity regardless of age.

**Root cause:** BUG-079 (v2.66.1) wrapped the age-bucket opacity rules inside `@media (hover: hover)` to fix an iOS tap-flash: touch devices briefly fire `:hover` on tap, making the tapped task appear bright (0.85) while aged neighbours stayed at 0.35 — perceived as "tasks dimming when another is tapped." The fix removed the unintended hover-restore on mobile, but also silently removed aging entirely.

**Fix (v2.80.3):** Age-bucket opacity rules moved global (applied on both platforms). Only the `:hover` restore (0.85) stays inside `@media (hover: hover)` — touch devices have no `:hover` rule to misfire.

**Verification:** On mobile PWA, a task added 3+ days ago should render visibly muted; a 7+ day task should render at minimum opacity. Tapping should not cause a flash-to-bright.

---

## BUG-091 — Gmail enrichment picks wrong email for topic-based tasks

**Status:** 🔍 Diagnosing
**Files:** `assets/gmail.js` (`_classifyTask`, `_buildQueryFallback`, system prompt at line ~222)

**Symptom:** For tasks like "Follow up on the three proposals we sent last week", the Gmail focus block surfaces a random unrelated email instead of the actual proposal thread.

**Root cause:** The classification pipeline has two compounding flaws:

1. **The AI system prompt restricts queries to `from:`/`to:` operators only.** The prompt says: *"searchQuery must be a Gmail search string using from:/to: operators"*. For a task with no named person this forces the AI to invent a person-match query (e.g. `from:proposals`) that can never find the right thread.

2. **The fallback `_buildQueryFallback` produces garbage for non-person tasks.** It strips communication verbs then wraps everything that remains in `from:"..." OR to:"..."`. "Follow up on the three proposals we sent last week" becomes `from:"on the three proposals we sent last week" OR to:"on the three proposals we sent last week"` — which matches the most recent email with any of those words, not the actual proposal thread.

**What the AI should be doing instead:**
- For *person-targeted* tasks ("Reply to Maria about the contract") → `from:Maria subject:contract`
- For *topic-targeted* tasks ("Follow up on the three proposals we sent last week") → `subject:proposal after:2026/08/23` or `"proposal" in:sent after:2026/08/23`
- For tasks where no useful email search is possible → `isComm: false`

**Fix direction:** Rewrite the classification system prompt to allow the full Gmail operator set (`from:`, `to:`, `subject:`, keyword, `after:`, `in:sent`, etc.) and instruct the AI to pick the operator set that best matches the task semantics. Remove the person-operator restriction. Update `_buildQueryFallback` to attempt a subject/keyword search when no named person is found.

---

## BUG-090 — `task-enrich` Netlify function returns 500 on every call

**Status:** ✅ v2.77.7 — verified by Can
**Files:** `netlify/functions/task-enrich.js`, `assets/task-enrich.js`

**Symptom:** Every call to `/.netlify/functions/task-enrich` returns HTTP 500. Enrichment cards never appear on focus open or task add. The failure is consistent — not flaky — across both entry points:
- `addManual → _agentEnrichTask` (task add path)
- `_agentRenderFocusBlock → _agentEnrichTask` (focus mode open path)

The client treats 5xx as transient and does not cache the failure, so the error fires again on every subsequent open.

**Stack trace (representative):**
```
task-enrich.js:38  POST /.netlify/functions/task-enrich 500 (Internal Server Error)
_agentEnrichTask @ task-enrich.js:38
_agentRenderFocusBlock @ task-enrich.js:102
openUI @ focus.js:575
```

**Likely root causes (in priority order):**

1. **`ANTHROPIC_API_KEY` not set in Netlify production env** — the only explicit `statusCode: 500` in the function is the apiKey guard (line 30–32). All other failures fall through to `_nullCard` (200). Check Netlify → Site settings → Environment variables.

2. **`dev` fix not merged to `master`** — Netlify deploys from `master`. Commit `291da8e` updated the tool type from `web_search_20250305` → `web_search_20260209` on `dev` only. If `master` still has the old tool type, every Anthropic API call fails with a 4xx, which the function logs and breaks from — but the Anthropic error may be propagating as a 500 via a Netlify edge-layer bug.

3. **`anthropic-version: 2023-06-01` incompatible with `claude-sonnet-5` + `web_search_20260209`** — the API version header may need updating or a `anthropic-beta` header may be required for the new tool type on Sonnet 5. A previous fix (commit `6c9ceda`) dropped a beta header; Sonnet 5 + `web_search_20260209` may need one added back.

**Root cause confirmed:** `ANTHROPIC_API_KEY` is not set as a Netlify env var. The user's Claude key lives client-side in localStorage (connections panel). The function returned 500 before even parsing the body, so the client key was never reachable.

**Fix (v2.77.7):** Parse body first, then resolve `apiKey` as `process.env.ANTHROPIC_API_KEY || clientKey`. Client sends `apiKey: _aiGetKey('claude')` in the POST body. Changed the hard 500 to a 400 when neither source has a key.

---

## BUG-089 — "Open in Mail" opens browser instead of native Mail app

**Status:** ⏳ v2.77.6

**Symptom:** Clicking "Open in Mail ↗" in the Gmail draft block inside focus mode opens the browser (Chrome/Safari) instead of the system Mail app.

**Root cause:** The `<a href="mailto:...">` link had no `target` attribute. In a standalone PWA, Chrome handles `mailto:` navigation by opening a browser window rather than delegating to the OS protocol handler. Also, the link was gated behind `_isPWA` — unnecessary, since a `mailto:` link is useful in any context.

**Fix (v2.77.6):** Added `target="_blank"` to the anchor, which signals the PWA shell to open the URL externally via the OS handler. Removed the `_isPWA` guard so the link shows in browser context too.

---

## BUG-088 — Inline AI helper stays behind when its task is reordered

**Status:** ✅ v2.77.3 (verified on real device 2026-08-29)
**Introduced:** v2.72.0 (post-add inline outcome row)
**Files:** `assets/assistant.js`, `assets/drag.js`, `assets/connections.js`

**Symptom:** Moving a task while its inline AI helper is visible can leave the helper beneath a different task. Moving upward reproduces it reliably; a full list rebuild can remove the visible helper from the DOM.

**Root cause:** The helper is a full-width sibling inserted after `.task`, while reorder controllers intentionally move only task elements. The helper had no shown-state reattachment path; only not-yet-shown pending suggestions followed replacement task nodes.

**Fix (v2.77.3):** `_aiReanchorSuggestion()` resolves the visible helper's owner from `_aiCurrentSuggestion.taskId` and moves the existing helper immediately after the current task element. All persisted reorder paths and `renderManual()` call it. This preserves the existing exposure timer/outcome record and prevents duplicate offers.

---

## BUG-087 — Emoji disappear or render broken in the animated task input

**Status:** ⏳ v2.77.2 (fix complete locally — awaiting real-device verification)
**Introduced:** v2.67.0 (animated task-input mirror)
**File:** `assets/task-bounce.js`

**Symptom:** Emoji typed into the task input can disappear or render as broken glyphs. The native input value is still correct, but its text is transparent while motion is enabled, so only the broken visual mirror is visible.

**Root cause:** The mirror rebuilt text with `val[i]`, which indexes UTF-16 code units rather than visible characters. A surrogate-pair emoji—and the multiple code points used by modifiers, flags, and joined emoji—was split across separate DOM spans, preventing the browser from shaping it as one glyph. Length and insertion calculations used the same incorrect unit.

**Fix (v2.77.2):** Segment both old and new values into Unicode grapheme clusters with `Intl.Segmenter`, use those arrays for insertion/bulk math and mirror spans, and retain `Array.from(text)` as a surrogate-safe fallback. The native input, IME path, task value, storage, and sync formats are unchanged.

---

## BUG-071 — App blank on wake / PWA background return during focus mode

**Status:** ⏳ v2.61.5 (fix shipped — awaiting real-device verification)
**Family:** BUG-004 → BUG-056 → BUG-071 (third recurrence)
**File:** `index.html` — `_onWake`, `_forceRepaint`

**Triggers:** Two confirmed:
1. Mac sleeps with PWA in foreground while focus mode is active → wakes → app blank
2. PWA sent to background (Cmd+Tab or lock screen) while in focus mode → return → app blank

**Root cause:** GPU compositor layers go stale when the app is hidden. `_forceRepaint` toggles `display:none/''` to force layer invalidation, but the repaint schedule was capped at 5000ms — not enough for some GPU init times. The PWA-background case adds a second trigger path (short background, not a sleep) that was hitting the same blank via the same `visibilitychange → _onWake` flow.

**Fix (v2.61.5):**
- `_forceRepaint` now skips passes if `document.visibilityState === 'hidden'` (no point repainting while hidden)
- Repaint schedule extended: 500 / 1500 / 3000 / 5000 / 8000 / 12000ms
- `_wakeFocusCheck()` runs alongside every repaint: calls `_focusReanchor()` to re-attach `.focused` if sync re-rendered it away, and corrects `body.top` drift if the focused task scrolled out of viewport

---

## BUG-069 — Poem OG preview may show wrong poem for southern-hemisphere users

**Status:** 🚫 Rejected (platform limitation — won't fix)
**Introduced:** v2.59.1 (Netlify edge function for poem OG meta)
**File:** `netlify/edge-functions/poem.js`

`poem.html` uses `_SOUTHERN_TZ` to detect southern-hemisphere timezones client-side and flip the season by +6 months, so the poem matches the local season. The edge function runs server-side and has no access to the viewer's timezone — it can only use the date from the `?date=` param. As a result, the `og:description` (shown in OG link previews) is computed without the hemisphere flip, and may show a different poem than what the page renders for southern-hemisphere users.

Accepted edge case: affects a small minority of users, and only in the link preview — the page itself shows the correct poem. Server-side TZ detection would require a geolocation lookup, which is not worth the complexity.

---

---

## BUG-086 — Memory completion rate exceeds 100% (wrong denominator)

**Status:** ⏳ v2.75.13 (fix shipped — awaiting real-device verification)
**Introduced:** recurring — four distinct root causes across v2.71.9, v2.71.11, v2.71.38–44
**File:** `assets/memory-panel.js` — completion rate stat; `assets/day-lifecycle.js` — daily history write

**Symptom:** Memory panel shows "completes 163% of tasks added — 80 done of 49 added." Rate above 100% is mathematically impossible if the stat meant what the label says.

**Root cause (4th):** The numerator and denominator measure different task populations.
- `tasksDone` (numerator): counts every task checked on that day — manual tasks carried over from prior days, Trello tasks, and tasks added reactively that day.
- `tasksAdded` (denominator): only counts new tasks manually typed into the input bar that day (`tasksAddedToday` in `task-actions.js`). Carried-over tasks and Trello tasks are never included.

On any day where you check tasks that were already on your list at day start (or check Trello cards), `tasksDone > tasksAdded`. Over several days this compounds into an impossible rate.

**Prior passes:**
- v2.71.9: `tasksAddedToday` was a lifetime total, never reset at midnight — inflated denominator
- v2.71.11: migration guard missing in `_memoryAbstract()` — stale cumulative values in AI prompts
- v2.71.38–44: cumulative artifacts survived Dropbox sync via `Math.max`; sanitizer (30-task ceiling) added

**Fix direction:** At midnight, before `dayStartCount` is overwritten, save it into the daily history entry (`dayStartCount: appMemory.patterns.dayStartCount || 0`). Change the completion rate denominator to `e.dayStartCount + e.tasksAdded` for entries that have it, falling back to `e.tasksAdded` for old entries. This correctly represents "tasks you had available that day." Trello completions can still push the rate fractionally above 100% on heavy Trello days — acceptable, and far less misleading than the current state. Update `_mergeDailyHistory` in `dropbox.js` to merge `dayStartCount` with `Math.max`.

---

## BUG-083 — Past→Soon revive causes black screen, interface unresponsive

**Status:** 🧪 v2.71.13 (fix complete locally — awaiting deployment and real-device verification)
**Introduced:** unknown
**Affects:** PWA contexts with GPU compositing (confirmed: Chromium desktop; likely iOS Safari too)
**File:** `assets/zones.js` — `reviveFromPast()`
**Family:** BUG-004 → BUG-056 → BUG-071 → BUG-083

**Symptom:** After tapping "↩ soon" on a past task and selecting a reason, the interface goes black and is completely unresponsive. Only the task input bar is faintly visible but unclickable. After page refresh, the task has correctly moved to Soon (data saves fine).

**Root cause:** `renderSoon()` transitions `#soonSection` from `display:none` → `display:block` for the first time during a revive. iOS Safari's GPU compositor layer for `#main-app` goes stale on this visibility change and blacks out the screen — same mechanism as BUG-004/056/071.

**Fix (v2.71.13):** `reviveFromPast()` in `zones.js` runs an inline `#main-app` display-toggle IIFE after the renders. Equivalent to `_forceRepaint()` in `dropbox.js`, but inlined since that function is scoped inside `_onWake` and not exported. Diagnostic logging retained until real-device verification confirms fix.

**Regression (confirmed v2.77.10):** The display-toggle fix itself causes a new stuck state when focus mode is active during the revive. `display:none` on `#main-app` tears down the focus UI while leaving `.focusing` on the element — result: all tasks dimmed/blurred, focus panel gone, clicks in the zone-list area blocked by the existing `.zone-list` early-return guard so the user can't escape. Only clicking the add bar (outside `.zone-list`) triggers `closeUI(false)` and restores the DOM.

**Fix (v2.77.10):** Added `if (el.classList.contains('focusing')) return;` guard to the display-toggle IIFE. When the compositor is already engaged for focus mode, the `soonSection` flash risk is negligible; skipping the toggle prevents the regression.
