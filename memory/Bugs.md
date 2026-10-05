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

> Status cells join badge and version with a non-breaking space, so a long description can't squeeze the Status column into wrapping the badge.

| # | Description | Status |
|---|---|---|
| 113 | Header, section labels, and Soon/Past headers looked darker than the page (most on mobile) — a full-page noise overlay lifted the page under opaque --bg bands | ⏳ v2.93.12 |
| 112 | A saved dream could not be reread in Memory after its local body was pruned or on another device | ⏳ v2.93.10 |
| 111 | With the dream sheet open on mobile, swiping scrolled the task list behind it | ⏳ v2.93.8 |
| 114 | "Work yesterday felt like a bad dream" was kept as a dream — the BUG-110 short-dream wording outweighed the waking-comparison rule | ✅ v2.93.13 |
| 110 | A one-sentence dream told to the mobile mic came back as "Nothing came up" — silent empty result from meeting-extract | ✅ v2.93.13 |
| 109 | Task list bobbed up and down after refocusing the desktop PWA while the morning strip was showing — wake repaint replayed its CSS open animation | ⏳ v2.93.2 |
| 108 | Dragging a task on mobile left a neighbouring task looking highlighted — row :hover rules unguarded on touch | ⏳ v2.92.5 |
| 107 | Three header icon buttons have a raised halo in the iPhone PWA | 🚫 Rejected |
| 106 | Focus task ages, weekly aging list, and wake offline banner fell back silently — guards on functions moved into modules | ⏳ v2.91.1 |
| 105 | Gmail enrichment silently missed explicit email tasks — classifier and query fallback gaps after the original provider fix | ⏳ v2.92.5 |
| 104 | Web enrichment (↗) always empty — Haiku 4.5 sent an unsupported web search tool version; failures cached as no result | ✅ v2.90.53 |
| 103 | Yesterday’s undated Dropbox nudge dismissal can hide the new daily nudge after midnight | ✅ v2.90.54 |
| 102 | Triage review initially focused Keep all, making the bulk action look preselected and Enter-ready | ✅ v2.90.49 |
| 101 | Open morning-nudge reaction choices stayed bright and focusable during focus | ✅ v2.90.47 |
| 100 | Evening triage Review stayed keyboard-reachable and failed contrast while visually receded in focus mode | ✅ v2.90.46 |
| 099 | Completed triage can ask again on another device — first-open cleanup erased an adopted same-day dismissal | ⏳ v2.90.44 |
| 098 | Header shoved off the top when a task near the bottom enters focus — sticky inside a fixed body | ✅ v2.82.4 |
| 097 | Header date stays on yesterday when the app is open across midnight — written once at init | ✅ v2.82.2 |
| 096 | "Clear all memory" left the companion slots intact; next sync undid the rest — no clear watermark | ✅ v2.82.1 |
| 095 | Task, habit and Ask inputs saved to the browser autofill store — no `autocomplete="off"` | ✅ v2.81.5 |
| 094 | "Undo" persists into the reflection step, reading as undoing the answer not the sorting | ✅ v2.80.6 |
| 093 | ↩ and ↗ enrichment indicators flash on tap on mobile — hover rule unguarded | ✅ v2.80.5 |
| 092 | Task cards don't age visually on mobile — desktop-only side effect of BUG-079 fix | ✅ v2.80.3 |
| 091 | Gmail enrichment picks wrong email — forces person query for topic-based tasks | ⏳ v2.82.3 |
| 090 | `task-enrich` Netlify function returns 500 on every call — enrichment never loads | ✅ v2.77.7 |
| 089 | "Open in Mail" opens the browser before the native Mail app | ⏳ v2.81.5 |
| 088 | Inline AI helper stays behind when its task is reordered | ✅ v2.77.3 |

---

*BUG-001–087 → `archive/Bugs-archive.md` (summary rows + detail). Detail for every later ✅ bug is archived too. Below: open, awaiting-verification, and rejected bugs only.*

---

## BUG-113 — Header and section labels darker than the page

**Symptom:** Can, 2026-10-05: the "tabs" (top header, sticky section labels, Soon/Past headers) had a darker background than the app, clearly on mobile and slightly on desktop.

**Root cause:** `body::before` laid a fixed fractal-noise texture over the whole page at z-index 0 (~1 level of lift: 15.8 vs 14.67 mean RGB). Every element painted with an opaque `var(--bg)` sat above it and showed the true `#0e0e10` — a darker strip. Mobile showed it most because the header is solid there since v2.92.3. The bands did use the tokens; the page did not render the token colour.

**Fix (v2.93.12):** the noise overlay is removed; the page renders exactly `--color-bg`, matching the inline `<html>`/`<body>` base and `theme-color`. The focus-mode SVG `#noise` filter is unrelated and stays. `visual-test` mobile-320 compares the header band to the page beside the rows (fails at 14.67 vs 15.93 on the old CSS).

**Verification:** on the phone and desktop, the header and section labels should be indistinguishable from the page behind the tasks.

---

## BUG-112 — Memory could not reopen a saved dream on another device

**Symptom:** Can's first kept dream was present in Dropbox and its summary reached desktop Memory, but **read** on a device with only the synced index showed a pointer to the Dropbox folder instead of the interpretation. The same happened on the capture device after the acknowledged local body was pruned.

**Cause:** `dreambank.js` intentionally removes raw retelling/reading from localStorage after upload, while `appMemory.dreams.index` stores only abstracted fields. Memory had no Dropbox download path; its **read** action only expanded that local/index row.

**Fix (v2.93.10):** **read** downloads only the selected Markdown file on demand, checks its id and sections, and displays its retelling, reading, and any legacy note as escaped, read-only text. The body is not saved or synced and is cleared when Memory closes. Offline, missing, malformed, and transient responses are visible and retryable; late downloads cannot reopen a collapsed or deleted dream. Browser and Dropbox tests cover cross-device retrieval and the privacy boundary.

**Verification:** after this version reaches a second device, open Memory → Dreams → manage → read on a dream saved from the phone. The interpretation should appear; close Memory, reopen, and read it again. If offline, the panel should say so without implying the file is lost.

---

## BUG-111 — Task list scrolls behind the open dream sheet (mobile)

**Symptom:** Can, 2026-10-04: with the dream result sheet open on mobile, swiping scrolled the task list behind it.

**Root cause:** `#meetingOverlay` makes the background `inert` for keyboard and assistive tech, but inert does not stop touch scrolling. A pan on the backdrop or the sheet's head/actions scrolled the document, and a pan inside `#meetingItems` past its end chained to the page.

**Fix (v2.93.8):** `#meetingOverlay { touch-action: none }` and `#meetingItems { touch-action: pan-y; overscroll-behavior: contain }` — only the sheet's list pans and keeps its overscroll. `meeting-test` asserts both computed styles (fails without them). Headless Chrome cannot simulate an iOS swipe.

**Not yet changed:** `#triageOverlay` is built the same way and likely has the same gap.

**Verification:** on the phone, open a dream result and swipe on the backdrop, the header, and past the end of the text; the task list must not move.

---


## BUG-109 — List bobs while the morning strip is showing (desktop PWA)

**Symptom:** Can, with a screen recording, 2026-09-30: with the morning nudge on screen, the task list jumped up ~17px and eased back several times after the PWA window regained focus. Frame analysis matched the wake repaint schedule (jumps at 0.33s, 0.80s, 1.80s, 3.30s).

**Root cause:** `window.focus` runs `_onWake`, whose `_forceRepaint` toggles `#main-app` `display` about nine times over 12s (BUG-004/056/071). A display toggle restarts CSS animations from keyframe 0. The strip's `nudgeOpen` (a one-shot CSS animation collapsing padding/margin/max-height, added after the BUG-028 WAAPI rule) replayed on every pass, and the list moved with it.

**Fix (v2.93.2):** the CSS animation is removed; `_showNudge` runs the same open motion once via WAAPI (`--dur-slow`, `--ease-out`), which display toggles do not restart. Reduced motion skips it. `nudge-test` 11 shows the strip, toggles `#main-app` display like the repaint, and asserts the height is unchanged and no CSS animation is attached — failing on the old code.

**Verification:** on desktop PWA before noon with the strip showing, switch to another app and back. The list should stay still.

---

## BUG-108 — Neighbouring task looks highlighted after a mobile drag

**Symptom:** Can, 2026-09-27: dragging a task on mobile sometimes left another task looking highlighted; intermittent.

**Root cause:** touch has no real hover, but mobile browsers apply `:hover` to the last element hit-tested under the finger and keep it there. During a drag reorder rows slide under the finger, so a neighbour could keep `:hover` — its left drag-cue line, surface background and border stayed painted. Several row `:hover` rules (task/habit rows, the drag cue, Soon/Past fades, delete and session-count reveals, the pull button) sat outside `@media (hover: hover)`. Same class as BUG-093.

**Fix (v2.92.5):** every task/habit row `:hover` rule is inside `@media (hover: hover)`; touch keeps its always-visible delete and pull controls. `drag-test` walks the live stylesheet and fails on any unguarded row `:hover` rule — it listed the offenders on the old CSS.

**Verification:** on a phone, long-press and drag tasks up and down several times; no other row should stay highlighted.

---

## BUG-107 — Raised halo on mobile PWA header buttons

**Status:** 🚫 Rejected by Can, 2026-09-27. The observed top-edge blur is not being pursued as an app bug.

**Symptom:** On Can's iPhone screenshot, the three controls beside the TODAY logo show a soft raised edge/shadow absent from the intended flat design.

**First hypothesis failed (v2.92.2):** The custom `.btn-icon` background and border had no authored shadow, but the controls retained native `appearance: auto`. Explicitly disabling native appearance and box shadow passed the CSS contract test, yet Can still saw the halo on the physical iPhone PWA at v2.92.2. Native button chrome was not the whole cause.

**Second hypothesis failed (v2.92.3):** Mobile width uses a solid `--bg` header with no backdrop filter, leaving desktop glass and header geometry unchanged. Can's direct iPhone PWA screenshot at v2.92.3 still shows essentially the same halo. The backdrop-filter layer was not the whole cause.

**Current evidence (2026-09-27):** The iPhone screenshot softens the logo and three button borders over several physical pixels, while the bottom input border remains sharp. A local Chromium standalone app at a 393px mobile viewport and 3× device scale renders the same header sharply. After a USB connection, Safari exposed `dev--today-here.netlify.app` under the iPhone's Home Screen Web Apps. Can confirmed TODAY opens from its own Home Screen icon (added via Arc Search); [WebKit documents](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) that Home Screen web apps run separately from the browser that added them. The live page reported standalone mode, DPR 3, 393px viewport, scale 1, and no active filter, transform, backdrop filter, shadow, or reduced opacity on the header, buttons, logo, or ancestors. The header had an inline `opacity 300ms` transition, no running animation, and its own 393×180px WebKit layer. Disabling that transition, changing the header from sticky to static, and rounding its fractional 169.09375px height to 170px each left the halo unchanged. A source audit found no authored normal-state overlay above the header.

**Controlled physical-device probe:** Clones of the exact logo and icon-button markup rendered sharply at ~177px and ~350px below the viewport top, while the original at ~75px stayed blurred. A clone in a separate fixed overlay placed at the *original's exact screen coordinates* also blurred. This reverses the initial header-layer inference: the effect follows the top-screen location, not this header's CSS or artwork. A temporary opaque 11px fixed top strip did not remove it. All probes were removed (or cleared by page reload), and the normal page was verified restored. Apple [documents automatic scroll-edge blur](https://developer.apple.com/documentation/SwiftUI/ScrollEdgeEffectStyle) and [status-bar edge treatments](https://developer.apple.com/design/human-interface-guidelines/status-bars); an iOS 27 Home Screen PWA top-edge effect is the leading explanation, but WebKit's exact mechanism is unconfirmed. Do not ship another speculative header CSS change. Any workaround must first be demonstrated on the physical device without disrupting safe-area layout or focus/modals, then tested after a fresh launch and scrolling.

---

## BUG-106 — Three more features guarded on functions that moved into modules

**Symptom:** The focus companion never mentioned how long other tasks had waited; the offline banner could stay stale after the app woke from sleep.

**Root cause:** same pattern as BUG-105 — `typeof _getCreatedFromId === 'function'` (`focus.js`, `about.js`) and `typeof _applyOfflinePanel === 'function'` (`dropbox.js`) name functions that live only inside `connections.js` since the 2026-09-05 refactor, so the guard is always false. Focus sent every task's age as 0; About ignored `createdAt`; the wake handler skipped the offline refresh.

**Fix (v2.91.1):** call `Today.use('connections')` directly; ages use `lastActive || createdAt || _getCreatedFromId(id)`, as triage does. `meeting.js:169` was checked and is correct (same-closure function). `component-contract-test` now rejects any `typeof _x === 'function'` guard whose name is not declared in the same file or published as a property.

---

## BUG-105 — Gmail enrichment misses explicit email tasks

**Follow-up report (2026-09-27):** Can added “email to gaia for reservation” on desktop with Gmail connected and saw no email enrichment; an existing Gaia reservation thread was in that account. The task has since been deleted. BUG-105 remains unverified. The desktop TODAY app pointed to production v2.91.1, whose `gmail.js` included the original BUG-105 provider/key fix, so this was not explained by that fix being absent from deployment. The local insertion path calls `_gmailEnrichTask`, so neither a disconnected task-entry device nor the absence of a thread explains the report. At diagnosis, the fallback parser treated `gaia for reservation` as the entire addressee, producing `from:"gaia for reservation" OR to:"gaia for reservation"` if AI classification failed. This was a definite query defect, but there is no evidence that the failed attempt actually took the fallback path; AI classification, its cached query, Gmail search/auth failure, and silent no-result handling remain possible. The nine tests then in place passed but covered neither this `for …` phrasing nor a real Gmail search. Enrichment runs on local manual-task insertion and on focus demand; sync/render only restores already-cached indicators.

**Symptom:** Communication tasks rarely showed ↩ or matched the wrong thread, with no error.

**Root cause:** the 2026-09-05 boundary refactor (`906e71b6`) removed the `_aiGetProvider`/`_aiGetKey` globals. `_classifyTask()` still guarded on `typeof _aiGetProvider === 'function'`, so it sent provider `gemini` with an empty key; `ai-assist` returned 400 and the regex fallback query was cached as the task's classification. `gmail-test` mocked `ai-assist` as succeeding whatever it was sent.

**Fix (v2.90.53):** read provider and key from `Today.use('connections')`; cache only AI results (`source: 'ai'`), reclassify unmarked entries once, never cache the fallback. The test mock now rejects calls without the configured provider and key. Four more suspect guards were found at the same time; three were real and are fixed as BUG-106, `meeting.js:169` was a false positive.

**Follow-up fix (v2.92.5, awaiting live Gmail verification):** an explicit email task is still searched when AI returns `isComm:false` or an empty query, including when an older false negative was cached. The fallback parses “email to Gaia for reservation” as contact Gaia plus topic reservation, not a four-word contact, while preserving “Center for Reproductive Rights” as a name without an explicit `to`. If a valid AI query finds no thread, one person-plus-topic fallback runs; auth/network/API failures never trigger that retry. Task-add and focus-on-demand share this path. `Today.use('gmail').observationAudit()` keeps the last 20 local outcomes and stage/status codes with no task text, query, message or credentials. Mocked-browser regressions cover the exact wording and thread, AI decline, cached decline, no-match retry, focus, API errors and redaction. The original report's exact AI/Gmail response was not retained, so this fixes proven gaps without claiming which one caused that deleted task's miss.

**Live verification:** On an updated desktop with Gmail connected and an existing thread, add an explicit email task naming the correspondent and topic; ↩ should appear after the lookup. If not, `Today.use('gmail').observationAudit()` in that device's console shows the recent redacted attempt status. Do not include the task text, email query or message in a shared report.

---

## BUG-099 — Completed triage asks again on another device

**Symptom:** Triage was completed on one device, then appeared again on another device during the same evening. First reported 2026-09-21; an all-`Keep` pass was the likely path.

**Root cause:** completion stored `triage_dismissed` locally, but `triageApplyAll()` made its immediate one-shot Dropbox upload conditional on a task moving or being marked done. All-`Keep` therefore waited for `triageClose()` after the completion-summary timer; suspending or closing the first device in that interval left no remote dismissal. The direct `dropboxBackup(true)` calls also bypassed the normal pending/retry queue. Separately, merge only adopted a remote dismissal: if a stale device overwrote the single Dropbox snapshot with a blank field, a device that still held today's completion did not mark the merge changed and therefore did not restore the remote copy.

**First fix (v2.90.37):** completion, close, and undo queue the retrying autosave path immediately. Same-day dismissal merge works in both directions: a remote completion applies locally, while a local completion against a blank remote reports a merge change and heals Dropbox. Browser tests cover all-`Keep` immediate scheduling and both merge directions.

**Recurrence (2026-09-23):** phone completed triage, but the computer's prompt stayed visible beyond 10 seconds. On a desktop's first open since the previous day, cold-start sync merged today's dismissal, then `applyNewDayCleanup()` unconditionally removed it. Deferred sync bookkeeping could upload that blank field back to Dropbox. A failing browser reproduction confirmed both the lost local dismissal and the blank upload. This ordering and reset predate module extraction; the v2.90.37 merge's changed flag could make the blank upload sooner, but was not the underlying bug.

**Follow-up fix (v2.90.44):** new-day cleanup retains a dismissal dated today and clears only older/invalid dates. The browser regression runs the real first-open pull → cleanup → backup sequence with mocked Dropbox and checks the local flag, hidden prompt, and upload payload. A separate test confirms yesterday's dismissal still clears. Targeted suites passed; the full gate recorded an unrelated focus-mode accessibility flake. Real two-device verification remains open.

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
