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
| 118 | Daily nudge stays on its default and About has no AI line after a failed request — generation latch prevents recovery; response rejection was indistinguishable | ⏳ v2.93.22 |
| 117 | “Book haircut” showed a calendar-generated reminder as email context — automated notifications were eligible search results and caches | ⏳ v2.93.20 |
| 116 | Email and web context arrows blink repeatedly after returning to the desktop PWA — completed arrival animation replayed by wake repaints | ⏳ v2.93.20 |
| 115 | Gmail kept retrying a refused sign-in (`gmail-token` 400 in the console) while Connections still said "Connected" | ✅ v2.93.17 |
| 114 | "Work yesterday felt like a bad dream" was kept as a dream — the BUG-110 short-dream wording outweighed the waking-comparison rule | ✅ v2.93.13 |
| 113 | Header, section labels, and Soon/Past headers looked darker than the page (most on mobile) — a full-page noise overlay lifted the page under opaque --bg bands | ✅ v2.93.12 |
| 112 | A saved dream could not be reread in Memory after its local body was pruned or on another device | ✅ v2.93.10 |
| 111 | With the dream sheet open on mobile, swiping scrolled the task list behind it | ✅ v2.93.8 |
| 110 | A one-sentence dream told to the mobile mic came back as "Nothing came up" — silent empty result from meeting-extract | ✅ v2.93.13 |
| 109 | Task list bobbed up and down after refocusing the desktop PWA while the morning strip was showing — wake repaint replayed its CSS open animation | ✅ v2.93.2 |
| 108 | Dragging a task on mobile left a neighbouring task looking highlighted — row :hover rules unguarded on touch | ✅ v2.92.5 |
| 107 | Three header icon buttons have a raised halo in the iPhone PWA | 🚫 Rejected |
| 106 | Focus task ages, weekly aging list, and wake offline banner fell back silently — guards on functions moved into modules | ⏳ v2.91.1 |
| 105 | Gmail enrichment silently missed explicit email tasks — classifier and query fallback gaps after the original provider fix | ⏳ v2.92.5 |
| 104 | Web enrichment (↗) always empty — Haiku 4.5 sent an unsupported web search tool version; failures cached as no result | ✅ v2.90.53 |
| 103 | Yesterday’s undated Dropbox nudge dismissal can hide the new daily nudge after midnight | ✅ v2.90.54 |
| 102 | Triage review initially focused Keep all, making the bulk action look preselected and Enter-ready | ✅ v2.90.49 |
| 101 | Open morning-nudge reaction choices stayed bright and focusable during focus | ✅ v2.90.47 |
| 100 | Evening triage Review stayed keyboard-reachable and failed contrast while visually receded in focus mode | ✅ v2.90.46 |
| 099 | Completed triage can ask again on another device — first-open cleanup erased an adopted same-day dismissal | ✅ v2.90.44 |
| 098 | Header shoved off the top when a task near the bottom enters focus — sticky inside a fixed body | ✅ v2.82.4 |
| 097 | Header date stays on yesterday when the app is open across midnight — written once at init | ✅ v2.82.2 |
| 096 | "Clear all memory" left the companion slots intact; next sync undid the rest — no clear watermark | ✅ v2.82.1 |
| 095 | Task, habit and Ask inputs saved to the browser autofill store — no `autocomplete="off"` | ✅ v2.81.5 |
| 094 | "Undo" persists into the reflection step, reading as undoing the answer not the sorting | ✅ v2.80.6 |
| 093 | ↩ and ↗ enrichment indicators flash on tap on mobile — hover rule unguarded | ✅ v2.80.5 |
| 092 | Task cards don't age visually on mobile — desktop-only side effect of BUG-079 fix | ✅ v2.80.3 |
| 091 | Gmail enrichment picks wrong email — forces person query for topic-based tasks | ⏳ v2.82.3 |
| 090 | `task-enrich` Netlify function returns 500 on every call — enrichment never loads | ✅ v2.77.7 |
| 089 | "Open in Mail" opens the browser before the native Mail app | ✅ v2.81.5 |
| 088 | Inline AI helper stays behind when its task is reordered | ✅ v2.77.3 |

---

*BUG-001–087 → `archive/Bugs-archive.md` (summary rows + detail). Detail for every later ✅ bug is archived too. Below: open, awaiting-verification, and rejected bugs only.*

---

## BUG-118 — Failed daily nudge cannot recover; rejection looks like delivery failure

**Report:** Can, 2026-10-07: both desktop and mobile showed the non-AI daily fallback and no Today line in About, following the earlier quiet-after-misses changes.

**Evidence:** read-only inspection of desktop v2.93.21 found AI configured, no October 7 cache/spoken line, and an `ai-assist` connection reset in the console (Dropbox had connection resets too). This does not establish which request failed or explain every earlier missing line. A synthetic first-request network failure followed by a healthy re-check produced exactly one request: `_nudgeRacing` was set at generation start and only reset at day rollover, never on failure. The latch predates the quiet change. v2.93.9 introduced a three-miss pause; v2.93.16 removed it but retained the bare-recap guard, whose rejection also yields a rule-based strip with no saved About line. These causes must not be conflated.

**Fix (v2.93.22, local):** per-request 12s timeout and settlement unlock; transient network/timeout/408/429/5xx failures can retry on a later natural wake/online check after 30s then 2m, with three generation attempts per device/day persisted across reloads. Offline/no-key does not consume an attempt. Permanent HTTP errors, invalid/empty replies and length/grounding/recap rejections are separately diagnosed, not repeatedly regenerated. Prompts and wording guards are unchanged. A recovered accepted line saves to the existing cache/spoken record for About; it cannot replace an already-visible fallback in its completion. Dismissal/noon gates remain and day epochs fence old requests from writes/lock release. Device-local `today_nudge_generation_v1` contains at most 20 categorical events and no task, response, error, key or reaction wording; not synced or sent to AI. Read it without generating via `Today.use('nudge').generationAudit()`.

**Tests:** failure/rejection matrix, timeout abort, recovered cache → About → later natural strip upgrade, no parallel calls/mid-read swaps, backoff/three-attempt cap across reopening, offline reconnect, dismissal/noon, late requests across midnight, and diagnostics privacy. Personal tasks/votes are not fixtures.

**Verify:** after deployment, observe the next desktop/mobile morning. If fallback/empty About returns, read each device's generation audit to distinguish request failure from rejected prose before changing any prompt/guard. Do not clear a real dismissal or fake the device clock to force a production generation.

---

## BUG-117 — Calendar reminder surfaced as focus email context

**Symptom:** Can, 2026-10-06: “Book haircut” surfaced a calendar reminder rather than useful correspondence. Can requested that calendar-generated reminders be ignored generally, not just for bookings.

**Cause:** `_gmailSearch` accepted the first thread and displayed its last message, without excluding calendar senders. Cached results were also accepted without this check. The reported sender has not been inspected directly; the bounded fix covers Google Calendar's known `calendar-notification@google.com` source, not every calendar provider.

**Fix (v2.93.20, local):** all Gmail enrichment queries, including AI queries, cached classifications and fallbacks, group the original query and exclude that sender. Message selection and cache reads enforce the same exact-address rule. Up to five threads are inspected if needed; mixed conversations skip the automated messages, and Apple Mail opens the selected message. Cached notifications are removed when read, hiding their arrows and preventing them from bypassing a new search. No subject-word or attachment blacklist, mailbox writes, extra AI call or change to calendar-as-input. Broader booking relevance is not claimed solved.

**Tests:** `gmail-test` covers calendar first / salon next, a mixed thread ending with a notification, calendar-only silence, a five-thread bound, exact/case-insensitive sender matching, harmless display names/lookalikes, old cached reminders, ordinary salon reminders, grouped OR queries, and content-free diagnostics.

**Verify:** after deployment, retry the haircut task in the desktop PWA; calendar notifications should not appear. A genuine confirmation may appear, or the block should stay quiet. If the reminder returns, inspect only its sender first: a different calendar source needs grounded coverage, not a broad “reminder” keyword ban.

---

## BUG-116 — Enrichment arrows blink again on desktop PWA wake

**Symptom:** Can, 2026-10-06: the task enrichment arrow blinked seemingly at random in the desktop PWA.

**Root cause:** both ↩ email and ↗ web indicators retained `.agent-indicator-arrive` after their 1.4s CSS animation ended. `_onWake()` repaints `#main-app` by toggling its display immediately and at 0.5, 1.5, 3, 5, 8, and 12 seconds. Each toggle restarts that CSS animation, so existing context looks newly delivered. A browser probe reproduced both arrows becoming fully visible without hover or a new lookup; this dates to the August 30 arrival cue, before v2.93.19.

**Fix (v2.93.20):** both modules call the shared `_playEnrichmentArrival()` utility once when fresh context is inserted. WAAPI survives a repaint during the cue and is released when finished; the CSS keyframes and persistent arrival class are removed. The same muted/accent palette, 1.4s cue (`--dur-mid` × 7), and per-segment `--ease-out` are retained. Cached restoration is quiet, hover still reveals the arrow, and reduced motion skips the cue.

**Tests:** `task-enrich-test` uses both real indicator owners inside `#main-app`, repaints during and after arrival, invokes the real wake handler, and checks hover, cache restoration, and reduced motion. The new regression failed on the old CSS animation.

**Verification:** in the desktop PWA, let a newly found context arrow finish flashing, switch to another app, then return and watch for 12 seconds. Existing arrows should stay quiet; hovering still reveals them. A genuinely new result should flash once.

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
