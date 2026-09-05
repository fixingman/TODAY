# Bugs

> Full history for verified bugs → `Bugs-archive.md`

## Status key

| Badge | Meaning |
|-------|---------|
| ✅ `vX.X.X`  | Fixed and verified by Can on a real device, or by an accepted reproduction-equivalent simulator run |
| ⏳ `vX.X.X`  | Fix shipped — awaiting an accepted verification pass |
| 🔍 Diagnosing | Root cause not yet confirmed — investigation in progress |
| ⚠️ Stale     | Fix shipped long ago, never verified, condition may no longer be reproducible |
| 🚫 Rejected  | Not a fixable app bug (platform limitation, won't fix) |

## Status Summary

| # | Description | Status |
|---|---|---|
| 098 | Header shoved off the top when a task near the bottom enters focus — sticky inside a fixed body | ⏳ v2.82.4 |
| 097 | Header date stays on yesterday when the app is open across midnight — written once at init | ⏳ v2.82.2 |
| 096 | "Clear all memory" left the companion slots intact; next sync undid the rest — no clear watermark | ⏳ v2.82.1 |
| 095 | Task, habit and Ask inputs saved to the browser autofill store — no `autocomplete="off"` | ⏳ v2.81.5 |
| 094 | "Undo" persists into the reflection step, reading as undoing the answer not the sorting | ✅ v2.80.6 |
| 093 | ↩ and ↗ enrichment indicators flash on tap on mobile — hover rule unguarded | ✅ v2.80.5 |
| 092 | Task cards don't age visually on mobile — desktop-only side effect of BUG-079 fix | ✅ v2.80.3 |
| 091 | Gmail enrichment picks wrong email — forces person query for topic-based tasks | ⏳ v2.82.3 |
| 090 | `task-enrich` Netlify function returns 500 on every call — enrichment never loads | ✅ v2.77.7 |
| 089 | "Open in Mail" opens the browser before the native Mail app | ⏳ v2.81.5 |
| 088 | Inline AI helper stays behind when its task is reordered | ✅ v2.77.3 |
| 087 | Emoji disappear or render broken in the animated task input | ✅ v2.77.2 |
| 086 | Completion rate in Memory exceeds 100% — wrong denominator (4th root cause) | ✅ v2.75.13 |
| 084 | Checkmark confetti is vertically offset from its checkbox on mobile | ✅ v2.71.8 |
| 083 | Past→Soon revive causes black screen — interface unresponsive until refresh | ✅ v2.77.10 |
| 082 | Post-triage done counter shows 0 after same-day triage | ✅ v2.71.34 |
| 078 | `TRIAGE_HISTORY_MAX` out of scope — `ReferenceError` on Dropbox pull/restore | ✅ v2.65.17 |
| 077 | Trello “Network error” flash on Dropbox reconnect or midnight boundary | ✅ v2.65.4 |
| 076 | Splash exit leaves `O` and `AY` visible while poem coda disappears | ✅ v2.65.3 |
| 075 | Tagged task flashes or shimmer-timing changes when hover overlaps arrival animation | ✅ v2.64.20 |
| 074 | Shared `/poem.html` links crash in Netlify Edge Function before static page loads | ✅ v2.64.12 |
| 073 | Focus Ask says “this late” without supplying the actual local time | ✅ v2.64.9 |
| 072 | Triage flow never completes — “Let go” tapped but completion screen never appears | ✅ v2.61.6  |
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

## Verification batch — 2026-09-04

The complete Chromium gate passed **29/29 with 0 flaky** against v2.82.3. This re-exercised the automated portions of BUG-097/096/095/094/093/092/091/089/087/083/071: midnight refresh, clear/merge watermark, input attributes, triage wording/flow, touch-hover CSS, mobile age state, Gmail classification, mailto construction, grapheme preservation, zone/focus invariants, and wake handlers. These passes increase confidence but do not by themselves close bugs that still need a platform-specific reproduction.

Safari 26.6 remote automation was enabled with Can's approval. A real Safari WebDriver pass completed 14 checks: startup, names/roles/states, axe on the main and poem surfaces, complex emoji entry/persistence/rendering, focus isolation and Escape, all four header disclosures, poem semantics/sharing, and narrow-layout overflow. Safari's window chrome stopped at a 336px content viewport, so the exact 320px case remains covered in Chromium. The pass also caught and repaired a missing skip link plus its missing test assertion. Remaining batch:

An iPhone 17e simulator running Mobile Safari 26.3 then passed 10 targeted checks in WebDriver: a touch-sized non-hover environment; old-card opacity for BUG-092; a synthesized tap with both enrichment indicators present for BUG-093; BUG-087's complex emoji through WebKit input, storage, and animated rendering; two consecutive BUG-083 Past → Soon revives with the app still visible, non-inert, and responsive; and the exact BUG-094 completion state reading **Undo sorting**. Can accepted this reproduction-equivalent simulator pass on 2026-09-04, closing BUG-094, 093, 092, 087, and 083. The acceptance does not generalize to bugs whose defining behavior requires a physical installed PWA, browser AutoFill, GPU wake/background, a live account, or an OS handoff.

- iPhone installed PWA: BUG-095 and BUG-071.
- Safari/macOS UI: BUG-097 at a real midnight boundary and BUG-071 after a 5–15 minute sleep.
- External integrations: BUG-096 across two Dropbox devices, BUG-091 with real Gmail threads, and BUG-089 through the native Mail handoff.
- BUG-061 remains stale and needs a fresh-device Sunday/habit badge check before deciding whether to close or reproduce it.

---

## BUG-098 — Header shoved off the top when a task near the bottom enters focus

**Status:** ⏳ v2.82.4

**Symptom:** Desktop. Clicking a task near the bottom of the list to enter focus makes the top nav slide up and away while the task moves into place — an awkward double motion. Tasks near the top don't show it.

**Root cause:** Focus locks scroll with `body { position: fixed; top: -scrollY }` and animates `top` to nudge the task into view. The header is `position: sticky`, and sticky has nothing to stick to inside a fixed body: it sits at the top of the body, which is already off-screen by `scrollY`, and then rides the nudge. Near the top `scrollY` is small so it went unnoticed.

**Fix (v2.82.4):** The lock adds `body.focus-locked`; under it the header is `position: fixed; top: 0`, exactly where sticky had it, and the body is padded by the header's height so nothing below shifts when it leaves the flow. `_doUnfix()` clears both. Alongside, the recede now covers the chrome as asked: header, morning nudge and triage bar dim and blur on the row beat; only the add bar and its mic buttons stay crisp. The header keeps pointer-events so its buttons still exit focus. Test 3b in `focus-test`.

**Verification:** Scroll so a task sits near the bottom, click it. The header should stay put and soften; the task and timer should settle in one motion. Escape restores everything. Compare with a task near the top — same feel.

---

## BUG-097 — Header date stays on yesterday when the app is open across midnight

**Status:** ⏳ v2.82.2

**Symptom:** With the app open past midnight (common on desktop), tasks, habits and the nudge roll to the new day but the date under the TODAY logo keeps showing yesterday until a reload.

**Root cause:** `#dateTag` was written once inside `init()` and nowhere else. `checkNewDay()` handles everything else at the boundary but never touched the header.

**Fix (v2.82.2):** `window._dateTagRefresh(animate)` in `index.html` computes the same string and, when it differs, crossfades: fade out over `--dur-mid`, swap, fade in over `--dur-slow` with `--ease-out` and a 3px rise. `checkNewDay()` calls it with `animate = true` right after `applyNewDayCleanup()`. Reduced motion swaps without animating. Nothing reloads and the splash does not reappear. Motion notes in `design/Motion.md`; test 12 in `day-lifecycle-test`.

**Verification:** Leave the app open across midnight (or set the clock forward with the tab open). The date should fade to the new day within a second of the boundary, with no flash of the splash screen.

---

## BUG-096 — "Clear all memory" left the companion slots intact, and the next sync undid the rest

**Status:** ⏳ v2.82.1

**Symptom:** Found while scoping 12d. Tapping *clear all memory* in the Memory panel wiped the AI hypotheses and the older pattern counters but left `returningTasks`, `taskOutcomes`, `obligationHistory`, `obligationLanguageTally`, `taskAgeBuckets`, `spokenLines` and `recentConversations` untouched — the most personal data in `appMemory`, including what the user has asked the AI. Worse: even the parts it did clear came back on the next Dropbox sync, because `_mergeAppMemory` unions every dated row and every hypothesis id from the remote copy with no notion of a clear having happened.

**Root cause:** `_memoryClearConfirm` predates the 12a/12c slots and was never extended. And `appMemory` had no clear-watermark — reflections solved the same resurrection problem with `today_reflections_cleared_at`, but memory never got the equivalent, so "clear" was local-only and short-lived on any synced device. That violates the hard constraint in `design/Personalization.md`: memory must be clearable, and deletion must trace through.

**Fix (v2.82.1):**
- `_memoryClearConfirm` now clears all seven slots and `recentConversations`, keeps `taskOutcomesBackfilled` true (re-seeding would resurrect what was just cleared), sets `appMemory.clearedAt`, tombstones the cleared hypothesis ids in `clearedHypothesisIds`, and pushes a backup promptly.
- `_mergeAppMemory` takes the max watermark across devices and drops rows from before it in all six dated-row unions (`taskOutcomes`, `spokenLines`, `obligationHistory`, `moments`, `recentCompletedTasks`, `recentConversations`) — on **both** sides, so a clear on one device propagates to the other rather than being undone by it. Hypothesis items carry no date and use the id tombstones instead.

**Documented edge:** rows carry a date-only field, so the watermark compares by day; a row from the same day as the clear is accepted. A handful of same-day rows can therefore survive. Chosen over the alternative, which would drop fresh rows written after the clear.

**Not changed:** max-wins scalars (`bestStreak`, `focusMinutesTotal`) still merge back. They are not personal in the way the cleared slots are, and full-clear already kept `focusMinutesTotal` deliberately.

**Tests:** `memory-panel-test` seeds every slot and asserts each is cleared, tombstones recorded, watermark set. `dropbox-test` exercises the watermark in both directions and the tombstones on both sides. One assertion was initially written against `localStorage` and passed vacuously false — the harness stubs `_saveMemory`; removed.

---

## BUG-095 — Task, habit and Ask inputs are saved to the browser's autofill store

**Status:** ⏳ v2.81.5

**Symptom:** A bubble appears above the add-task bar showing previously typed text. Reported by Can with a screenshot: *"there is a strange tooltip on top of the task input bar what is this, never seen it."* It is Chrome's own form-autofill suggestion list — it renders *above* the field because the add bar is pinned to the bottom of the viewport, which is why it does not look like the usual dropdown. It only appears once the browser has stored entries for that field and the typed prefix matches, which is why it had not been seen before.

**Root cause:** `#newTask` (index.html:4316), `#habitInput` (4141) and `#aiNlInput` (4392) carry no `autocomplete` attribute, so the browser stores and re-offers their values. The convention already exists in the codebase and is applied to the credential and name fields — `#meetingNamePromptInput` (4360), the dynamically rendered API-key inputs (`connections.js:616`) and `#meetingNameInput` (`meeting.js:64`) all set `autocomplete="off"`. The three fields that carry the user's *content* were simply missed.

**Why this is more than cosmetic:** Rule 32 states TODAY's promise is the absence of observation, and the privacy model is that task data is local and user-owned. Without `autocomplete="off"`, every task title, habit name and question asked of the AI is copied into the browser's own autofill store — outside the app, outside Dropbox, and outside anything the app can clear. It survives disconnecting Dropbox and the Connections "Forget" flows, and it syncs to the user's Google account when Chrome sync is on. The Ask input is the most exposed of the three, since it holds free-form questions about the user's life.

**Fix (v2.81.5):** added `autocomplete="off"` to all three inputs. Deliberately *not* copying the full attribute set used on the name/key fields — `spellcheck="false"` and `autocorrect="off"` make sense for names and API keys but not for task prose, where they are typing aids the user may want. That is a separate UX decision, not part of this defect.

**Note:** stops future storage only. Values the browser has already saved must be cleared from Chrome's own autofill settings — the app cannot reach them, which is itself part of why the gap mattered.

---

## BUG-091 — Gmail enrichment picks wrong email for topic-based tasks

**Status:** ⏳ v2.82.3 — fix covered automatically; awaiting real Gmail verification
**Files:** `assets/gmail.js` (`_classifyTask`, `_buildQueryFallback`, system prompt at line ~222)

**Symptom:** For tasks like "Follow up on the three proposals we sent last week", the Gmail focus block surfaces a random unrelated email instead of the actual proposal thread.

**Root cause:** The classification pipeline has two compounding flaws:

1. **The AI system prompt restricts queries to `from:`/`to:` operators only.** The prompt says: *"searchQuery must be a Gmail search string using from:/to: operators"*. For a task with no named person this forces the AI to invent a person-match query (e.g. `from:proposals`) that can never find the right thread.

2. **The fallback `_buildQueryFallback` produces garbage for non-person tasks.** It strips communication verbs then wraps everything that remains in `from:"..." OR to:"..."`. "Follow up on the three proposals we sent last week" becomes `from:"on the three proposals we sent last week" OR to:"on the three proposals we sent last week"` — which matches the most recent email with any of those words, not the actual proposal thread.

**What the AI should be doing instead:**
- For *person-targeted* tasks ("Reply to Maria about the contract") → `from:Maria subject:contract`
- For *topic-targeted* tasks ("Follow up on the three proposals we sent last week") → `subject:proposal after:2026/08/23` or `"proposal" in:sent after:2026/08/23`
- For tasks where no useful email search is possible → `isComm: false`

**Fix (v2.82.3):** The classifier now distinguishes person-targeted and topic-targeted work. Its prompt allows `subject:`, quoted keywords, `in:sent`, and date operators and explicitly forbids inventing a person. The local fallback recognizes “follow up on/about” as a topic, trims phrases such as “we sent last week”, and uses `in:sent` when the wording points to outgoing mail; explicit addressee forms still use `from:`/`to:`. Cache validation accepts the wider Gmail operator set. `scripts/gmail-test.mjs` pins the production report, person queries, degraded fallback, cache reuse, non-communication abstention, and indicator semantics.

**Verification:** With Gmail connected, focus “Follow up on the three proposals we sent last week”. The surfaced thread should come from the proposals/topic search, not an unrelated sender. Also verify “Reply to Maria about the contract” still searches Maria.

---

## BUG-089 — "Open in Mail" opens the browser before the native Mail app

**Status:** ⏳ v2.81.5 — second attempt, awaiting real-device verification

**Symptom:** Tapping "Open in Mail ↗" opens Chrome first, which then hands off to the mail client. Can, 2026-09-02: *"first opened chrome then opened the mail client app, with an email draft"*, with `mailto:notifications%40kry.se?subject=…` visible in Chrome's address bar.

**Root cause:** the v2.77.6 attempt added `target="_blank"` on the reasoning that it would let the PWA shell delegate to the OS Mail handler. It does the opposite: `_blank` requests a new *browsing context*, so a browser is opened by definition; the browser then sees a scheme it cannot render and forwards it to Mail. That is the two-step hop.

**Fix (v2.81.5):** `target` removed; the click handler calls `window.location.href` instead. A same-context navigation to a non-HTTP scheme is intercepted by the OS protocol handler before any page load, so no browsing context is required. The `href` stays on the anchor so long-press and right-click → copy address still work.

Two adjacent defects fixed in the same place:
- **Address encoding.** The whole address was run through `encodeURIComponent`, producing `notifications%40kry.se`. Most clients decode it; it is not the correct form and not all do. `@` is now left intact in the mailto path.
- **Silent truncation.** Handlers commonly cut `mailto` around 2 KB, mid-sentence and without error. The body is now capped at ~1900 characters. The full draft stays visible in the block with its Copy button, so nothing is lost.

**Found while testing the cap:** trimming by string index can split a surrogate pair, and `encodeURIComponent` throws `URIError` on a lone surrogate — so a draft containing an emoji would have crashed the flow rather than shortened it. Now trims by grapheme via `Intl.Segmenter`, the same idiom `task-bounce.js` uses for BUG-087.

**Tests (post-v2.82.2):** the builder is extracted to `_mailtoDraftHref()` in `util.js` — pure, so `scripts/mailto-test.mjs` (17 cases) runs in Node with no browser: literal `@` in the address, the exact production-report form, the 1900 cap with a body that still decodes and is a prefix of the original, accents + emoji and a ZWJ family sequence trimmed on grapheme boundaries with no lone surrogate, null/empty inputs, and the 20-grapheme floor from both sides. One robustness addition beyond the refactor: a lone surrogate already present in the draft is dropped by a plain scan rather than thrown on — not a lookbehind regex, which is a parse-time error on older Safari and would take all of `util.js` down. Making `util.js` loadable in Node needed one change: its single top-level DOM write, `window.showStatus`, is now guarded.

**Caveat for verification:** if an iOS standalone PWA routes all outbound navigation through the default browser regardless of scheme, the hop may persist and would be a platform constraint rather than an app defect. `target="_blank"` guaranteed it, so removing it can only improve matters — but only a real device settles whether it is now direct.

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
