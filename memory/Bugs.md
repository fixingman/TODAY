# Bugs

> Full history for verified bugs → [Bugs archive](archive/Bugs-archive.md)

## Status key

| Status | Meaning |
|---|---|
| ✅ Verified | Reported defect verified fixed by Can, deployed checks, or an authorized reproduction-equivalent automated check; separate account/usefulness acceptance is not implied |
| ⏳ Verify | Fix pushed; reported behavior still requires verification |
| 🔍 Open | Reported defect remains under investigation; a reproduced repair does not establish the live cause |
| 🔧 Local | Fix implemented locally; not pushed |
| ↪ Merged | Tracked under the bug shown in the Reference column |
| ⚠️ Stale | Old, unverified report that needs a fresh reproduction |
| 🚫 Rejected | Platform limitation or deliberately not being fixed |

## Status Summary

Current publication/CI evidence is maintained once in the [release contract](../docs/ci-release-evidence.md#recorded-full-release-proof). Historical local and failed-run receipts below remain history; they do not supersede that result. Installed/account/usefulness verdicts remain separate. BUG-174–179 received accepted automated verification on November 26, 2026; BUG-176 reopened on November 28 after the focus-history symptom recurred. BUG-091/105/117/145/158 remain open.

> Descriptions state the symptom; status and release/reference have separate columns. Local versions are unreleased candidates.

| # | Status | Description | Reference |
|---|---|---|---|
| 176 | 🔍 Open | Yesterday’s focus time disappeared again after being visible in About; prior rollover fix is insufficient to close the symptom. | Reopened; v3.14.1 repair history below |
| 166 | 🚫 Rejected | After an overnight resume from the background, the morning shows no splash poem until the app fully restarts. | — |
| 158 | ⏳ Verify | Suggest something reports a provider token cutoff. | v3.7.11 |
| 145 | ⏳ Verify | Living note hides unchanged interpretations when source records leave display windows, and puts a generic status under “A possibility”. | v3.5.0 |
| 117 | ⏳ Verify | Gmail context includes automated booking and calendar notifications. | v2.93.20 |
| 107 | 🚫 Rejected | iPhone header buttons have a raised halo. | — |
| 105 | ⏳ Verify | Gmail context misses explicit email tasks. | v2.92.5 |
| 091 | ⏳ Verify | Gmail searches for a person when the task names a topic. | v2.82.3 |

---

*BUG-001–087 (all), verified BUG-088–119, 121–143, 148–150, 153, 155–157, 160, 161, 163, 164, 168, 170–175, 177–179 → `archive/Bugs-archive.md` (summary rows + detail). Below: open, awaiting-verification, rejected, and merge pointers only.*

---

## BUG-176 — Daily-history row can swallow unbanked focus minutes at rollover

**Reopened — November 28, 2026:** Can reports that Friday November 27 focus time disappeared again after it had been visible in About. Device, installed version, exact minutes and loss timing are not yet established. The November 26 automated verification below covers a narrower rollover defect; it does not close this recurring symptom. No personal history has been changed or estimated minutes restored.

**November 28 local investigation:** A new actual-component regression fails on the current runtime: after local rollover, an incoming backup can contain yesterday’s valid dated live counter (90 minutes) but no banked history row. Sync date-gates the counter out of today, then ignores it for yesterday too; an existing zero history row stays zero. Control `.context/fresh-uwfKct/receipt.json` fails `retained:false` while the date boundary, row uniqueness, task count and error checks pass. This is a separate reproduced defect, not the confirmed cause of Can’s November 27 loss.

**Local repair (unpublished):** Both automatic merge and manual Restore fold a valid past-day remote counter into existing daily history by per-field maximum before discarding it as a current-day counter. No new backup fields, requests, estimated totals or addition across devices. Current/future/invalid dates and invalid/non-positive minute values do not create historical rows. Preserve richer history and existing retention. The first five-suite pass is `.context/fresh-Qi2eU8/receipt.json`; final `.context/fresh-6IBBsE/receipt.json` passes all five suites (invariants, day lifecycle, Dropbox, sync-merge unit and About), with zero failures/flakes in28.7s. It includes absent/partial history, richer rows, replay and invalid/current/future date/value boundaries. Investigation report: `.context/focus-history-recurrence-20261128/report.md`. Exact installed symptom, old data recovery and deployment remain open.

**November 28 engineering audit (local, unpublished):** Read the existing value/date-unit contract (BUG-066), snapshot ordering (BUG-063), per-day maximum (BUG-036/176), mutation saves (BUG-124) and consumed-revision rules (BUG-130). Further red controls expose smaller/equal remote today totals losing to a stale local yesterday number (`fresh-dY00ug`), explicit Restore losing that dated pair (`fresh-5mN35W`), and a retained local history failing to heal a stale shared snapshot (`fresh-nJ0XtU`, repair-upload wait timed out). Bank dated past-day local evidence before adopting today’s pair regardless of numeric ordering, stamp Restore’s adopted/reset date, and queue normal focus-only repair when the incoming snapshot is poorer. No new accounting schema, summation, transport, polling, zone, tombstone, auth or model policy.

**Final scoped evidence:** all six affected suites pass in `.context/fresh-wfDqs7/receipt.json` (85.2s; zero failures/flakes): invariants, day lifecycle, Dropbox, sync-merge unit, About and Focus. Final lifecycle/invariant run `.context/fresh-lFnl8n/receipt.json` also passes (24.8s), adding actual polling/reconnect repair and quiet converged-pull checks; runtime/other-suite fingerprints are unchanged. The two isolated stores use actual restored focus completion and queued upload, writer/receiver-first rollover, rendered About, both reloads and stale shared-backup replay. Audit and limits: `.context/focus-sync-integrity-20261128/engineering-review.md`. This still does not identify Can’s actual Friday loss, recover data or establish deployed/installed acceptance.

**Pre-publication review — November 28:** Native specialist review found the earlier quiet-save spy watched a global property rather than Restore’s closure-local save function; that assertion was not valid proof. Replace it with the actual merge result: a converged shared snapshot must return false, while a negative control changing only Friday’s focus to0 must return true. Actual queued-upload, polling/reconnect and reload checks remain. Corrected lifecycle/invariant run `.context/fresh-ypJERl/receipt.json` passes with zero failures/flakes in22.5s. Runtime code is unchanged from the six-suite pass above. The review found no introduced runtime defect; installed cause and recovery remain open.

**Verified — November 26, 2026:** The two-context Friday/Saturday regression passes: both devices converge on 90 minutes and About shows 1h 30m, resisting stale-zero replay, duplicate rows and next-day carryover. About, merge and Dropbox fixture suites also pass. This verifies the rollover defect; Can’s historical loss cause, recovery and installed acceptance remain unverified. Can authorized marking this technical repair verified and archiving it after the automated pass.

**Current evidence:** revision `c761b6215ca5e8fe1dfaed04a21a79037703f8a0`; `.context/fresh-LxQ1m7/receipt.json` records all 14 selected suites passing, with 0 failures/flakes (142.8s). Full scope and command: `.context/bug-verification-20261126/report.md`. These local receipts are not hosted release or installed/account proof.

**Report (Can, November23):** Friday November20 focus minutes disappeared from About after previously showing approximately1–2h. Exact minutes, device sequence and when the disappearance occurred are unknown. Related repairs BUG-063 and BUG-066 cover midnight snapshot ordering and adopting synced counters with their dates; those fixes remain in place.

**Reproduction:** seed a fictional outgoing-day history row with focus0 and a correctly dated local live counter of90. `applyNewDayCleanup()` finds the existing row, skips the snapshot and resets the counter to0; About cannot show those minutes. The actual-component regression fails before repair with `minutesRetained:false`, other row/count/reset checks true and no app error. This establishes an independent defect, not the confirmed cause of Can’s historical data.

**Repair:** merge the outgoing-day snapshot before reset through existing `sync-merge.mergeDailyHistory` and `_sanitizeDailyTasksAdded`, preserving per-field maxima, fixed-count precedence, one row/date and30-row retention. Never add totals. Preserve richer rows and the BUG-063 distinction between yesterday’s snapshot and today’s minutes. No live history or backup was read/rewritten and no estimated minutes were restored.

**Verification:** retain failing control and final scoped evidence in `.context/friday-focus-history-20261123/`. Tests cover About’s visible1h30m, a richer120-minute row against90, corrected task/habit values, midnight45 versus today90 and repeated cleanup. Final fresh check `fresh-kCZ0Bs` passes all5 suites (invariants, day lifecycle, About, sync-merge unit and Dropbox) with0 failures/flakes in27.3s; payload, memory inventory and whitespace also pass. Actual Friday cause, recovery and installed acceptance remain unverified after publication.

**Stronger regression (November23):** the existing CI-owned day-lifecycle suite now runs Friday November20/Saturday November21 in two isolated browser contexts. One device banks0; the other merges that row before banking90. Both must converge on90 and display Friday1h30m; stale-zero replay, duplicate rows and next-day carryover are rejected. An isolated original-runtime control fails specifically with `syncedPartial:true`, `retained:false`, `todayReset:true`. The fixed same-test owning-suite run `fresh-FgosJa` passes both checks with0 flakes/failures in12.1s. The earlier five-suite pass remains recorded separately.

---

## BUG-166 — No splash poem after an overnight resume

**Status:** 🚫 Rejected by Can, 2026-11-14. The day's poem is in About and the empty-list echo, and the splash shows it on the day's first full restart; that is enough.

**Report (November 14):** Found while investigating BUG-164. If the phone keeps TODAY in memory overnight, coming back after midnight runs the new-day rollover but not the splash, so the poem coda waits until the app is next started from scratch.

---

## BUG-158 — Explore suggestion hits the short-helper output cap

**Report (November 8):** Can sees “The AI answer was cut short. You can ask again.” after requesting Something to try. This specific notice maps to provider token-cap metadata; no personal journal, provider key or raw answer was inspected.

**v3.7.11:** Explore's reply, cumulative summary, question, evidence IDs and six experiment fields shared the ordinary512-token ceiling. Give the exact Explore surface a fixed2048-token maximum on both existing providers. Preserve one request per explicit click, disabled thinking, model/routing,25-second deadline, field/input bounds, source fences and content-free rejection of capped results; no automatic retry or partial write. Other surfaces keep their limits. Both-provider offline checks fail the old512 request policy and verify the fixed ceiling, override refusal, intact six-field results, one call and retained cutoff rejection. Evidence and local verification live in `.context/explore-output-budget/`; live completion, latency and usefulness remain to verify.

---

## BUG-145 — Living-note interpretation disappears behind a generic warning

**November 7 conversation-return follow-up (v3.5.4; regression added):** Can reports a task-source warning while returning to a conversation and does not report changing a task. The warning proves a parsed document has a source-dependent reading, not a failed document download. The exact cause of the missing live dependency remains unverified. A fictional missing-source control shows ordinary saved replies withheld with no readable conversation recovery. Add deliberate **read saved conversation** inspection with historical labelling and no current-reading marker/composer. Preserve normal-view/source/clear/permission fences and future-context filtering; the owner can inspect the same retained record already exposed as Markdown/export. No live journal was copied or changed and no live AI was called. Do not describe this as proving a task was completed/deleted or repairing every missing-source cause.

**Report (Can, November 6):** the living note repeatedly shows “The earlier reading is withheld because its sources changed. Your words remain.” under “A possibility”; no useful interpretation has been seen there.

**Reproduction:** fictional controls reproduce two false-unavailability paths: an unchanged returning record falls below Memory's five visible returns, or an unchanged manual task moves beyond the first100 selection candidates. Both still exist, but the source projection omits them and the reading fails its support check. This establishes a defect, not the exact cause in Can's document: native app observation was available, but navigation/console controls did not respond, and no personal journal or credential was read.

**Local v3.4.1:** check up to96 already-declared dependencies against the same permitted stores beyond presentation/candidate windows; retained rows are support-only and cannot enter a new selection, even via a prior pin. Keep the existing100-task/50-Memory candidate windows, eight-record/two-interpretation writer caps, no raw source copies and all source edit/deletion/revocation/expiry/clear/readiness/permission fences. Memory's visible windows stay unchanged. The living note shows “A possibility” only with an actual current interpretation; a separate quiet notice explains changed/unavailable records, imported notes or scope changes. Own notes and the actual open question stay visible. No automatic AI call, journal rewrite or privacy/schema expansion.

**Verification:** original failing controls and passing repairs are retained in `.context/living-note-investigation/`. Fresh-check receipt `.context/fresh-orivqh/receipt.json`: seven first-attempt passes, zero flakes/failures in20.2s (invariants, Exploration, Memory, design, component, smoke and service worker); inputs remain unchanged. Actual-component checks cover no extra AI call, source-window retention, true edit/deletion/revocation/clear/readiness/permission fences, a separate specific notice, no empty interpretation heading, the original open question and320/390/736/1024px containment/axe. A separate same-input component run passes and supplies inspected fictional phone/desktop captures. No full release/performance gate or account cause is claimed. Local v3.4.1, not published; Can's actual document remains unverified.

**November 6 journey review:** Can reports no active source change and has not experienced accumulated understanding or optional action. Separate fictional controls execute automatic Memory freshness updates and new-day task graduation: both still withhold a reading under the existing contract even after this narrow repair. The broader [journey review](../docs/exploration-journey-review.md) owns that product/source-policy gap; BUG-145's window repair must not be described as resolving every automatic invalidation or the feature's usefulness. No broader runtime policy changed during the review.

---

## BUG-117 — Calendar reminder surfaced as focus email context

**Symptom:** Can, 2026-10-06: “Book haircut” surfaced a calendar reminder rather than useful correspondence. Can requested that calendar-generated reminders be ignored generally, not just for bookings.

**Cause:** `_gmailSearch` accepted the first thread and displayed its last message, without excluding calendar senders. Cached results were also accepted without this check. The reported sender has not been inspected directly; the bounded fix covers Google Calendar's known `calendar-notification@google.com` source, not every calendar provider.

**Fix (v2.93.20, shipped):** all Gmail enrichment queries, including AI queries, cached classifications and fallbacks, group the original query and exclude that sender. Message selection and cache reads enforce the same exact-address rule. Up to five threads are inspected if needed; mixed conversations skip the automated messages, and Apple Mail opens the selected message. Cached notifications are removed when read, hiding their arrows and preventing them from bypassing a new search. No subject-word or attachment blacklist, mailbox writes, extra AI call or change to calendar-as-input. Broader booking relevance is not claimed solved.

**Tests:** `gmail-test` covers calendar first / salon next, a mixed thread ending with a notification, calendar-only silence, a five-thread bound, exact/case-insensitive sender matching, harmless display names/lookalikes, old cached reminders, ordinary salon reminders, grouped OR queries, and content-free diagnostics.

**Verify:** after deployment, retry the haircut task in the desktop PWA; calendar notifications should not appear. A genuine confirmation may appear, or the block should stay quiet. If the reminder returns, inspect only its sender first: a different calendar source needs grounded coverage, not a broad “reminder” keyword ban.

---

## BUG-107 — Raised halo on mobile PWA header buttons

**Status:** 🚫 Rejected by Can, 2026-09-27. The observed top-edge blur is not being pursued as an app bug.

**Symptom:** On Can's iPhone screenshot, the three controls beside the TODAY logo show a soft raised edge/shadow absent from the intended flat design.

**First hypothesis failed (v2.92.2):** The custom `.btn-icon` background and border had no authored shadow, but the controls retained native `appearance: auto`. Explicitly disabling native appearance and box shadow passed the CSS contract test, yet Can still saw the halo on the physical iPhone PWA at v2.92.2. Native button chrome was not the whole cause.

**Second hypothesis failed (v2.92.3):** Mobile width uses a solid `--bg` header with no backdrop filter, leaving desktop glass and header geometry unchanged. Can's direct iPhone PWA screenshot at v2.92.3 still shows essentially the same halo. The backdrop-filter layer was not the whole cause.

**Current evidence (2026-09-27):** The iPhone screenshot softens the logo and three button borders over several physical pixels, while the bottom input border remains sharp. A local Chromium standalone app at a 393px mobile viewport and 3× device scale renders the same header sharply. After a USB connection, Safari exposed `dev--today-here.netlify.app` under the iPhone's Home Screen Web Apps. Can confirmed TODAY opens from its own Home Screen icon (added via Arc Search); [WebKit documents](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) that Home Screen web apps run separately from the browser that added them. The live page reported standalone mode, DPR 3, 393px viewport, scale 1, and no active filter, transform, backdrop filter, shadow, or reduced opacity on the header, buttons, logo, or ancestors. The header had an inline `opacity 300ms` transition, no running animation, and its own 393×180px WebKit layer. Disabling that transition, changing the header from sticky to static, and rounding its fractional 169.09375px height to 170px each left the halo unchanged. A source audit found no authored normal-state overlay above the header.

**Controlled physical-device probe:** Clones of the exact logo and icon-button markup rendered sharply at ~177px and ~350px below the viewport top, while the original at ~75px stayed blurred. A clone in a separate fixed overlay placed at the *original's exact screen coordinates* also blurred. This reverses the initial header-layer inference: the effect follows the top-screen location, not this header's CSS or artwork. A temporary opaque 11px fixed top strip did not remove it. All probes were removed (or cleared by page reload), and the normal page was verified restored. Apple [documents automatic scroll-edge blur](https://developer.apple.com/documentation/SwiftUI/ScrollEdgeEffectStyle) and [status-bar edge treatments](https://developer.apple.com/design/human-interface-guidelines/status-bars); an iOS 27 Home Screen PWA top-edge effect is the leading explanation, but WebKit's exact mechanism is unconfirmed. Do not ship another speculative header CSS change. Any workaround must first be demonstrated on the physical device without disrupting safe-area layout or focus/modals, then tested after a fresh launch and scrolling.

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
