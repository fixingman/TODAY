# Bugs

> Full history for verified bugs → `Bugs-archive.md`

## Status key

| Status | Meaning |
|---|---|
| ✅ Verified | Fixed and verified by Can, including an accepted reproduction-equivalent simulator run |
| ⏳ Verify | Fix pushed; awaiting Can’s verification |
| 🔧 Local | Fix implemented locally; not pushed |
| 🔍 Investigating | Cause or remaining fix is still under investigation |
| ↪ Merged | Tracked under the bug shown in the Reference column |
| ⚠️ Stale | Old, unverified report that needs a fresh reproduction |
| 🚫 Rejected | Platform limitation or deliberately not being fixed |

## Status Summary

> Descriptions state the symptom; status and release/reference have separate columns. Local versions are unreleased candidates.

| # | Status | Description | Reference |
|---|---|---|---|
| 138 | 🔍 Open | Hosting injects a Real User Monitoring SDK outside the repository. | Netlify setting |
| 137 | ⏳ Verify | Clean GitHub runs fail Calendar, enrichment screenshots and Focus resize fixtures. | v2.103.5 |
| 136 | ⏳ Verify | Dev service worker installs without the app-shell precache because a listed helper returns 404. | v2.103.0 |
| 135 | ⏳ Verify | Startup blocking and cold/warm load exceed performance limits. | v2.103.2 |
| 134 | ⏳ Verify | Sunday treats tied let-go reasons as a majority and generalizes missing reasons. | v2.101.1 |
| 131 | ⏳ Verify | Supported split actions are rejected; an old offer can replace a changed task. | v2.100.1 |
| 128 | ⏳ Verify | Gmail reuses old queries or caches replies after a task changes or disappears. | v2.99.1 |
| 127 | ⏳ Verify | Web/Trello context outlives its task, source or focus view. | v2.99.1 |
| 120 | ↪ Merged | Daily-nudge delivery follow-up; tracked with the strip/About mismatch. | BUG-118 |
| 118 | ⏳ Verify | Daily nudge can be missing or disagree between the task list and About. | v2.97.8 |
| 117 | ⏳ Verify | Gmail context includes automated booking and calendar notifications. | v2.93.20 |
| 107 | 🚫 Rejected | iPhone header buttons have a raised halo. | — |
| 105 | ⏳ Verify | Gmail context misses explicit email tasks. | v2.92.5 |
| 091 | ⏳ Verify | Gmail searches for a person when the task names a topic. | v2.82.3 |

---

*BUG-001–087 (all), verified BUG-088–119, 121–126, 129–130, 132–133 → `archive/Bugs-archive.md` (summary rows + detail). Below: open, awaiting-verification, rejected, and merge pointers only.*

---

## BUG-138 — Hosting appends Real User Monitoring

**Confirmed October 28:** fresh public dev and production v2.103.4 HTML responses append a netlify-rum-container script after the repository HTML. Removing only that identified append produces the exact committed HTML; deployed sound.js and sw.js match byte for byte. No personal account, task content or diagnostic metric history was read. This establishes SDK injection, not what data successfully reached a collector; CSP may constrain its requests.

**Action:** disable Real User Monitoring in Netlify’s today-here project, then verify the script is absent on both origins. Rule 32 excludes analytics SDKs even when anonymous. The [official Netlify instructions](https://docs.netlify.com/manage/monitoring/real-user-monitoring/#disable-real-user-monitoring) warn that disabling removes the RUM dashboard/metrics. The browser connector failed during setup and no Netlify credential/CLI configuration is available here; Can has been asked to change the setting. Do not broaden CSP, normalize the injected SDK into an accepted source baseline, or claim this is fixed before deployed verification.

---

## BUG-137 — Clean CI fixture failures

**Input-model repair (v2.103.5):** both v2.103.4 hosted runs (40661801217 / 40661801762) still pass 52 suites and fail Focus. Diagnostics reveal 13.333px Arial and wrapping: JS forces desktop while native CSS has no-hover capability, so text length is not the cause. Test-only CSSOM hardware predicates now match the JS fixture; selectors, declarations and width/motion predicates are preserved and checked. The 320px feedback case deliberately uses native no-hover hardware; inconsistent input fails locally before, all 29 groups pass after. Resizing retains native device settings. Production CSS/input guards and all deadlines/assertions remain unchanged. The frozen v2.103.5 candidate passes all 53 functional suites with zero flaky/failed results and all five performance runs with unchanged limits; payload passes at 1201.1 KiB decoded / 340.9 KiB Brotli / 38 eager scripts. All 149 runtime/test fingerprints stay unchanged across the gates. Original failures and no-hover before/after controls remain retained. Exact-commit hosted confirmation and installed acceptance are separate.

**Hosted follow-up (v2.103.4):** both v2.103.2 runs (40612299853 / 40612299919) pass 52 suites and fail the same resize-to-scroll fixture. The original 243.7px answer fits the 284px answer area on Linux; stationary text is correct. A longer 14-word fixture now checks desktop fit/no motion before retaining the narrow-scroll, widening, exact-reply/rating and native-overflow-reporting assertions. No runtime, deadline, retry or budget changes. A proportional-font control passes the revised fixture; it alone did not reproduce the hosted geometry with the original sentence. The actual hosted failure is retained as the negative evidence. The revised isolated gate passes 53 suites with zero flaky/failed results. All five v2.103.4 performance runs pass unchanged budgets: worst cold blocking 67 ms / 200 ms, cold FCP 6712 ms / 7000 ms, warm FCP 124 ms / 500 ms and Focus 38 ms / 300 ms. Payload is 1201.1 KiB decoded / 341.0 KiB Brotli with 38 eager scripts. Hosted results are checked against the exact published commit, separately from installed acceptance.

**Focus ledger isolation:** the second full gate also reports52 passes/one flake/zero failures, with a habit Ask timing out while waiting for exactly one new request. Its mock held every ai-assist surface, so an unrelated writer could increment the same ledger. An injected overlapping background writer reproduces the exact three-second timeout. Restricting the mock to the explicit Focus rubric passes that control and the complete Focus suite, forwards the unrelated request normally and keeps the original deadline. Timeout diagnostics now expose bounded request counts and owner/UI/configuration flags, never credentials or prior private text. The original failed gate and negative control remain retained.


**Additional local gate evidence:** initial candidate gate reports 52 passed/one flaky/zero failed. The triage-close case samples 450 ms after Escape without waiting for collapse completion. A controlled 250 ms delay to its existing 300 ms collapse timer reproduces the identical barBack=false result. The fixture now waits for the actual overlay-hidden completion using the existing state-wait bound, then checks bar restoration and unchanged morph assertions. This does not change triage runtime, motion durations or performance budgets. Original52/1 gate plus deterministic before/after controls are retained.


**Confirmed run:** dev 40605616074 / commit 9f012a5e reports 50 passed, zero flaky, three failed. Enrichment tries to write a screenshot below a directory absent from a fresh checkout. Calendar builds an event ten minutes from wall-clock now, which falls outside today near midnight; its expected one-event context then never arrives. Focus waits for a button narrower than 250px although a valid resized answer can be wider on another platform. The source/user-input contracts are unchanged. Original logs: .context/15g-reliability/dev-ci-failure.log.

**Local repair (v2.103.2):** create the artifact directory before screenshot; freeze the integration fixture at UTC noon and build its token/event dates from that clock; compare Focus width with the actual desktop width while retaining scrolling/reply/rating assertions and deadlines. Final local verification: 53 functional suites passed with zero flaky/failed results; all five performance runs pass unchanged budgets (worst cold blocking59ms/200, coldFCP6748ms/7000, warmFCP124ms/500, focus35.9ms/300; medianfocus33ms). Payload1201.1KiB decoded/341.0KiB Brotli/38scripts. The About-history-only copy correction has identical version/executable behavior and passes subsequent syntax/smoke/design/payload checks. Original failures and causal negative controls are retained. Published as a2357665; both v2.103.2 hosted runs passed 52 suites and exposed the overflow-fixture assumption followed up in v2.103.4. No timeout or budget raised.

---

## BUG-136 — Dev app-shell precache lists an unpublished helper

**Automated deployed verification (October 28):** fresh anonymous browser contexts on both dev and production return 200 for the actual helper; all 69 declared shell resources plus branded fallback are cached. Offline reload shows the app/add field and imports the actual helper. No personal account, tasks or installed device was accessed. Deployed v2.103.0 repairs the missing file; accepted real-device verification remains separate. Local v2.103.2 additionally rejects incomplete updates and removes their partial caches, preserving the old worker/cache for both missing-file and network failures. Those new regression cases fail before and pass after; healthy update and offline/fallback paths pass.


**Discovery (October 28):** origin/dev 5d97baa1 includes /assets/enrichment-feedback.js in sw.js, but that commit does not contain the file. Direct dev fetch returned HTTP 404. The parallel metadata push included a prepared entry before the enrichment runtime was committed.

**Impact:** cache.addAll rejects the missing resource. Its install handler catches the error, so installation can complete without the full app-shell cache; this is an offline-precache defect, not proof that update installation stops.

**Fix (v2.103.0):** include the actual lazy helper already named in the shell. The real service-worker suite confirms all shell resources cache and the actual helper imports offline; full 53-suite gate passes. Can requested dev/master publication October 28; deployed/offline acceptance remains pending. Performance failure is separately BUG-135.

---

## BUG-135 — Startup performance exceeds release budgets

**15G local repair (v2.103.2):** supported browsers first prepare a silent audio sink and asynchronously attach the system default; no device enumeration, permission request, tone shape or autoplay-policy change. Legacy/refused-option paths preserve existing behavior. A pending default-output connection cannot block Focus input; only the latest cue may wait, for at most one second, and closed/replaced contexts discard late work. The controlled 340 ms synchronous-default constructor fails the startup guard before and passes after; first-input and real native/default-output tests pass. A one-run diagnostic has cold TBT 81 ms and warm TBT 0 ms, but it is not the required five-run release result. Final verification: 53 functional suites passed with zero flaky/failed results; all five performance runs pass unchanged budgets (worst cold blocking59ms/200, coldFCP6748ms/7000, warmFCP124ms/500, focus35.9ms/300; medianfocus33ms). Payload1201.1KiB decoded/341.0KiB Brotli/38scripts. The About-history-only copy correction has identical version/executable behavior and passes subsequent syntax/smoke/design/payload checks. Original failures and causal negative controls are retained. Published as a2357665; both v2.103.2 hosted runs passed 52 suites and exposed the overflow-fixture assumption followed up in v2.103.4. Original failed evidence remains below.


**Discovery (October 28):** the stable isolated v2.103.0 candidate passes 53 functional suites with no flakes/failures and passes payload. Its retained five-run performance result fails cold FCP 7040 ms / 7000, cold TBT 492 ms / 200, cold DCL 7031.6 ms / 7000, cold interactive 7013.6 ms / 7000, warm FCP/LCP 704 ms / 500 and warm interactive 671.9 ms / 500. Input medians remain add 13 ms / focus 83.2 ms; worst focus 112.6 ms.

**Attribution/control:** the original first cold run records 434.8 ms in unchanged sound.js initialization. Chrome is 156.0.8078.49, compared with .48 in the prior passing baseline. One separate diagnostic run of published 512bc7b2 / v2.101.5 under the same current Chrome/Node also fails cold TBT 301 ms, with 338.6 ms sound initialization. This demonstrates a wider startup issue; it does not establish the browser update as cause, explain every load failure or clear the candidate. No enrichment/sound/harness/threshold workaround or successful reroll was substituted.

**15E publication status (historical):** investigating. Can requested publication to dev and master on October 28 after that failure was reported; it did not establish a performance pass. The subsequent v2.103.2 repair has the passing local evidence above. Preserve original failed benchmark in memory/performance-baseline.json and .context/15e-adaptation/isolated-final-performance.json, plus the single-run control, logs and 149 source fingerprints. In-progress parallel Focus changes are excluded from this candidate. A causal startup repair must preserve first-input behavior and satisfy unchanged five-run budgets; technical loop completion and actual writing usefulness remain separate.

---

## BUG-134 — Let-go reason selection overstates its evidence

**Discovery (15C review, October 27):** the existing builder selects a reason shared by three of six reasoned releases as a majority. Input order decides which tied reason wins. Four relevance reasons out of seven also produce an unsupported claim that competing energy reasons were rare. With three energy reasons, one relevance reason and twenty unreasoned releases, the selected insight generalizes across all releases rather than the four supplied reasons. Fictional controls reproduce these defects; no particular historical reading or quiet Sunday is diagnosed.

**Fix (v2.101.1 dev release):** require >50% of recorded reasons while retaining minimum four reasoned releases and three matching reasons. The aggregate audit uses the same boundary. Scope the four supported insights to reasons given/stated and remove the unsupported rare-competing-reason assertion. Unknown reasons remain unknown; no new coverage threshold. Kind identity, ranks, votes, retirement, cooldowns, material-change reopening, dated caches, existing writer and request count stay unchanged. Existing cached/spoken readings are preserved; the correction applies to new selections.

**Verification:** five new policy regressions and six relevant real-browser assertions fail before the fix. Afterward, all 130 policy checks and the complete About/Sunday browser suite pass in the working tree and against published dev 83aa057f plus only this patch. Coverage includes tie order, valid/narrow majority, plurality, missing reasons in all supported insights, competing candidates, fallback retirement, actual scoped writer input, no raw-record leakage and one existing call. Existing source/readiness/late-response and two-store sync controls still pass. Lint and unchanged payload budgets pass. Evidence: `.context/15c-reason-majority/`. Integrated gate: 53 passed, zero flaky/failed; all five performance runs and payload pass unchanged budgets, recorded in `combined-gate.log` and `integrated-performance.json` in that directory. Real-use usefulness remains iterate.

---

## BUG-131 — Post-add splitting loses valid actions and can apply an obsolete offer

**15F audit/reproduction (October 27):** the fixed English verb guard rejects the explicitly written “Install the shelves and paint the wall” and “Translate the document and send it”. The earlier fictional probe is retained in `.context/post-add-split-review-2026-10-26.json`. Requiring the model to repeat every source phrase also makes paraphrases ineligible; the frequency of that behavior on Can’s account is unmeasured. A new actual-component fixture shows an accepted split can remove a task after its text changes, recording application against the obsolete source. This is separate from BUG-129 transport recovery and does not explain every historical missing offer.

**Fix (v2.100.1 dev release):** expand supported English imperatives and ask the writer to confirm the complete zero-based source-clause index sequence. The client, not the model, supplies the child task wording. The same 2–3 complete verb-led clause guard remains; broad tasks, joined objects, unfamiliar/ambiguous syntax and unsupported languages stay conservative. Invalid indices or mixed invented text are rejected, with exact legacy-copy compatibility. No fuzzy semantic matching, inferred prep or unrelated task input. Applying the explicit offer rechecks its current identity, unchanged source and undone Today owner, revalidates the clauses, then preserves source text/tag inheritance. Stale application quietly dismisses the offer without a false miss or losing the owner.

**Verification:** policy regressions fail before and pass after for the confirmed verbs. The real browser reproduces stale edit/application before the fix. Actual Add → real proxy → fictional index-only provider → mobile keyboard Split covers two/three actions, exact spacing/case/punctuation/tags and one applied outcome. Reversed/duplicate/out-of-range/missing/sparse/wrong-type indices, invented mixed responses, legacy paraphrases, single activity/objects, and edit/check/move before Apply remain rejected. Existing offline/transient/deadline/terminal/owner recovery tests pass unchanged. Evidence is retained under `.context/15f-splitting/`. Final automated validation: 52/52 suites, zero flaky/failed; all five performance runs and payload pass unchanged budgets (1203.9 KiB decoded / 343.2 KiB Brotli / 38 scripts). Runtime/test source stayed unchanged. Installed acceptance and live model selection/usefulness are not established by mocked fixtures.

---

## BUG-128 — Gmail classifier and late lookup are not bound to the current task

**Audit (October 26, 15E):** isolated fictional actual-component probe (`.context/phase4-15e/gmail-audit-probe.mjs` / `.log`) seeds an earlier classification for a changed task. `_classifyTask()` reuses the AI-sourced query without matching task text; Gmail receives `from:previous-person` while the task now names Gaia. A held email-thread body is then released after removing the current manual owner; `_gmailEnrichTask()` still writes its selected email cache. No live mail/account or production incidence was inspected.

**Implementation (v2.99.1 dev release):** both existing caches bind exact retained task wording, ownership policy and a device-local origin-scoped digest of the current refresh grant. This is a sensitive connection marker, not an email address or proof of account identity; it never enters AI, diagnostics or backup. Access-token refresh stays within the same grant; reconnect/Forget and changed credentials fence old work. Late refresh/code-exchange responses cannot restore forgotten tokens. Requests require the current unchanged, undone Today owner, current AI configuration, cache adoption and request identity, with a 26s deadline. Focus-origin lookup/draft work is visit-bound and cancels on exit/switch; valid capture-origin lookups can still cache for their unchanged task. Current task text also governs indicators. Coalesced zone saves retain unchanged owners through moves and prune true deletion/edits; selected caches expire after 24h. No new scope, mail feedback, model instruction, collection or backup schema.

**Verification:** the original fictional audit shows old-query reuse and deleted-owner cache writes before, both fenced after. `gmail-test` uses real owners and preserves prior retrieval assertions, adding 24 classification/list/body races, visit/draft/cache-adoption guards, actual Focus Escape, real sync, token refresh versus Forget, cross-tab source changes, lookup/draft deadlines and Copy without regeneration. Final local validation: 41 Gmail checks, 37 enrichment checks and all 52 suites pass with zero flaky/failed tests. Five-run performance and payload pass unchanged budgets (1202.6 KiB decoded / 343.1 KiB Brotli / 38 scripts); audit refreshed. Final combined source hashes, 52-suite logs and five-run performance evidence are retained in `.context/dev-release-evidence/`; earlier Gmail failures remain in `.context/gmail-128/`. Dev release approved; installed-account and usefulness verification remain open. The stale-tab cache-pruning regression is reproduced/fixed; cache arrival preserves newer context from another tab. Existing booking/no-draft, MiniSearch ambiguity/calendar filtering and Apple Mail behavior remain covered. Actual connected-account/mobile acceptance and BUG-117 relevance stay separately open.

---

## BUG-127 — Web/Trello enrichment outlives its task/source and focus view

**Reproduced (October 26):** the real browser shows an old “white paint” card after the same owner is now “blue paint”. `_getCache()` ignored task text/source and successful cache policy. In-flight lookups can write after owner deletion/rename/connection change; cached focus visits fail to restamp ownership and close leaves the request’s dataset owner intact. Network/exhausted/malformed server results can become HTTP200 null cards and poison a permanent negative cache.

**Local v2.99.0:** v3 cache validates retained manual owner/exact text across Today/Soon/Past, source board, policy and 30-day age; limits the prefix to 60 entries / 200,000 UTF-8 bytes. Pending headers/body check source/credentials/cache adoption and request identity, with 26s abort and safe supersession. Focus has independent view ownership and synchronous close invalidation. Failures are retryable 502; only explicit no-result is cached. Existing card gains exact-card local withholding/Undo/show context with neutral link semantics. Hidden state is authoritative and success-ineligible in the previous client as well; unchanged zone moves retain it and true deletion removes it. No preference inference, new prompt, extra feedback call, new synced data or Gmail controls.

**Verification:** before-fix browser fixture fails; targeted real-component tests pass for source/policy/expiry, pending races, keyboard/Undo/retained hiding, closed focus and 320px wrapping. Focused Claude review completed and its reproduced Undo-focus/label/hidden-state findings are corrected. Earlier slice 52-suite runs pass; cleanup passes 37 component checks including axe/real zone transitions, plus zones/drag/Focus/smoke and payload. Final integrated v2.99.0 checks now pass 52/52 suites (zero flaky), all six visual scenes, accessibility and five-run performance/payload with unchanged budgets. Memory targets and absent-insight feedback access were repaired while retaining the parallel styling; commit/release remains pending. No installed-account/usefulness acceptance claimed.

---

## BUG-120 — Merged into BUG-118

Consolidated with BUG-118 at Can’s request, 2026-10-22. The strip/About agreement investigation and v2.97.2 fix are preserved under [BUG-118](#bug-118--daily-nudge-delivery-and-recovery). This number remains a reference; it is not a separately open or verified bug.

---

## BUG-118 — Daily nudge delivery and recovery

**Tracking decision (Can, 2026-10-22):** BUG-118 and BUG-120 are successive investigations of the same daily-nudge problem. Track delivery, rejection recovery and strip/About agreement here; preserve their distinct diagnosed causes and shipped fixes rather than counting two open bugs. BUG-120 remains an alias for older references.

**Current fix (prepared as v2.97.7, included in v2.97.8):** remove the word-pattern recap veto from ordinary/Calendar-supported output; a duration and waiting phrase without a contrast keyword cannot determine usefulness. Restore delivery through the existing grounding/30-word checks and writer, with feedback steering subsequent mornings. Old `rejected-recap` records may resume under the remaining original three-attempt budget; no new rewrite/retry loop or quota reset. Existing terminal grounding/format/permanent-error outcomes, noon, accepted lines, real dismissals, sync adoption and day epochs remain. One bounded rewrite was considered, then superseded by this regression repair.

**Still open:** accepted real-device/reproduction-equivalent verification of reliable morning delivery and strip/About agreement. The removed filter does not guarantee better prose; observe usefulness separately.

**Report:** Can, 2026-10-07: both desktop and mobile showed the non-AI daily fallback and no Today line in About, following the earlier quiet-after-misses changes.

**Evidence:** read-only inspection of desktop v2.93.21 found AI configured, no October 7 cache/spoken line, and an `ai-assist` connection reset in the console (Dropbox had connection resets too). This does not establish which request failed or explain every earlier missing line. A synthetic first-request network failure followed by a healthy re-check produced exactly one request: `_nudgeRacing` was set at generation start and only reset at day rollover, never on failure. The latch predates the quiet change. v2.93.9 introduced a three-miss pause; v2.93.16 removed it but retained the bare-recap guard, whose rejection also yields a rule-based strip with no saved About line. These causes must not be conflated.

**Fix (v2.93.22, shipped):** per-request 12s timeout and settlement unlock; transient network/timeout/408/429/5xx failures can retry on a later natural wake/online check after 30s then 2m, with three generation attempts per device/day persisted across reloads. Offline/no-key does not consume an attempt. Permanent HTTP errors, invalid/empty replies and length/grounding/recap rejections are separately diagnosed, not repeatedly regenerated. Prompts and wording guards are unchanged. A recovered accepted line saves to the existing cache/spoken record for About; it cannot replace an already-visible fallback in its completion. Dismissal/noon gates remain and day epochs fence old requests from writes/lock release. Device-local `today_nudge_generation_v1` contains at most 20 categorical events and no task, response, error, key or reaction wording; not synced or sent to AI. Read it without generating via `Today.use('nudge').generationAudit()`.

**Tests:** failure/rejection matrix, timeout abort, recovered cache → About → later natural strip upgrade, no parallel calls/mid-read swaps, backoff/three-attempt cap across reopening, offline reconnect, dismissal/noon, late requests across midnight, and diagnostics privacy. Personal tasks/votes are not fixtures.

**Verify:** after deployment, observe the next desktop/mobile morning. If fallback/empty About returns, read each device's generation audit to distinguish request failure from rejected prose before changing any prompt/guard. Do not clear a real dismissal or fake the device clock to force a production generation.

**Follow-up (2026-10-09):** desktop v2.93.22 retained an accepted October 8 audit, but October 9 had zero attempts, today's dismissal, and no AI cache/spoken line. Dropbox also held today's dismissal with no AI line. Can saw a plain count nudge and empty About. Dismissal blocked new generation as well as strip display; the first device's initial failure/rejection is not established.

**Follow-up fix (v2.93.23):** fallback dismissal now means hide the strip, not cancel missing-text recovery into About. An accepted cache or today's spoken record makes a real AI dismissal final, even if completions stale the cache or the cache is gone. Transient attempts schedule their own 30s/2m background callbacks before noon, still capped at three per device/day; offline/no-key, terminal rejection, noon and rollover gates remain. Timers never upgrade a visible fallback. Accepted recovery refreshes open About and queues normal Dropbox autosave, as does dismissal. A synced accepted line arriving during a local request wins over its late reply, preserving votes. Backup schema/merge policy is unchanged. Synthetic coverage uses two isolated device stores with the real backup serializer and merge, plus scheduled retries, cutoff/offline/rollover, real-AI dismissal and vote convergence. Daily Claude adaptive thinking is separately restored with bounded, text-only output. Do not mark delivery or quality verified from offline tests; the next real morning is still owed.

**October 13 report / diagnosis:** Can saw the default nudge and an empty About on both desktop and phone. Read-only desktop v2.95.2 audit: one request at 04:14:51–54 UTC, `task: rejected-length`, no cache or accepted spoken record; the fallback was dismissed afterwards. The request returned within ~3s. This confirms a >30-word reply was rejected and made generation terminal, not a transport failure. The phone audit has not been inspected. The rejected wording was not retained or recovered. No live generation, dismissal/cache reset or vote write was called.

**October 18 delivery report / initial investigation (superseded by BUG-120):** Can first saw the default strip on the phone while About held the full line, and dismissed only the strip. Desktop read-only evidence later showed today’s cache/spoken record and dismissal with a device-local October 17 audit; that audit could not establish the phone’s timing. Delayed-response tests reproduced one possible split after the five-second display deadline, but that was not sufficient to diagnose this report. The source-level staleness mismatch is documented and fixed under BUG-120, with completion/sync agreement and About-return coverage. No device audit is required to implement or verify that reproduced defect; the prior request for phone access was unnecessary.

**October 22 report / readout:** just after midnight, several checks/restarts left the default strip; by roughly 00:42 the proper line was present. About held a separate **Noticed** observation, not a daily **Today** line. Can’s content-free readout: 00:00 `answered`, `rejected recap`, `rejected recap`; 00:01/00:02 `default`; 00:42 `line`. `answered` maps to `response-valid` (transport/length/grounding passed), then the ordinary task path’s recap check rejected the text; its second rejection event is the attempt result, not another failed request. This rejection is deliberately terminal for uncached local generation that day, so restarts do not retry it. The later `line` is display, not proof of a new local request; the excerpt contains no later request. A synced accepted cache can still be shown, but the excerpt alone does not prove its origin. The temporary display label infers local ownership from any `response-valid` event, even one later rejected as a recap, so `line` versus `line from other device` is not reliable provenance in this case. This is a content rejection, not delayed midnight rollover. The initial diagnosis left policy unchanged; Can then authorized the regression review leading to the v2.97.7 fix described above. Missing poem: separately reproduced cooldown defect, BUG-121.

**Follow-up (v2.95.4):** one same-reading shortening pass for otherwise grounded overlong replies, within the existing attempt and strict 30-word cap. Grounding is checked before repair and after it; recap/unsafe/still-long replies still withhold. No new repair after noon/day change. A legacy length-only terminal state can recover at a natural morning check under the three-attempt quota, then persists `lengthRepair:true` to prevent repeated resets. Existing dismissal, About recovery and epoch/cache-adoption fences remain. Synthetic regression proves the mechanism; live phone/desktop delivery and quality still need verification through real use.

**Regression review / implementation (v2.97.7 prepared):** history traces the recap filter to v2.93.9 (October 4), then persisted terminal rejections to v2.93.22 (October 7). A fictional ordinary reading without a contrast keyword fails against the original source with `response-valid` → `rejected-recap`, and is delivered/cached/recorded without an extra request after removal. `nudge-delivery-test` now covers 46 desktop/touch lifecycles: midnight ordinary output; same-day legacy resume and the last remaining slot; exhausted quota, other terminal grounding rejection, noon, fallback/AI dismissal, existing cache, an unsafe recovery, prior-day reset; natural midnight wake and restart; existing delivery/sync/agreement cases. No live response or task is used as a fixture.

### Strip/About agreement — formerly BUG-120 (v2.97.2)

**Report:** Can, 2026-10-18: the task-list strip showed the default count line while About's Today block held the full AI line at the same time — on the phone first, then seen on desktop. "That is weird — at the same time the nudge was ready in About."

**Cause:** the two homes of today's line judged it by different rules. The strip (v2.39.1 guard, `day_nudge_done_count_<date>`) dropped the saved line as soon as *any* task was completed after it was written — locally or synced in — and fell back to the count line or a fresh request. About (kept by the v2.90.43 fix so the line would not vanish from storage) showed the saved line regardless. One completed task therefore split them for the rest of the morning. Reproduced with no AI call or delay: three tasks, a saved line, one completion → strip "2 tasks still here from yesterday", About the full line. The earlier five-second-deadline theory (the note under BUG-118) is a separate, real path: a late line lands in About while an undismissed fallback strip only upgraded on wake.

**Fix (v2.97.2):** one rule, `_currentDayLine()` in `nudge.js`, asked by both the strip and About (`Today.use('nudge').currentLine()`): the saved line retires only when it *names* a task completed today (distinctive task words matched in the line; done texts from the lists and the synced `recentCompletedTasks`). Unrelated completions keep it in both homes; a named completion retires it in both, at once (the strip leaves immediately and the replacement or fallback slides back in). The stored key is never deleted — Dropbox still reads it (v2.90.43 rationale). Completion (`today:reflection-evidence-change`) and every sync merge re-check a visible line. Closing About now hands its line to an undismissed fallback strip. `day_nudge_done_count_<date>` is retired.

**Tests:** `nudge-delivery-test` (default gate, 20 real-startup cases on desktop and touch): the About-close handoff is now an assertion, and new agreement cases — named completion, unrelated completion, a line arriving by sync, a completion arriving by sync — check "strip and About show the same line" with About open, after it closes and after returning to the app. Reverting About to the old read fails the suite. `nudge-test` §5 rewritten for the shared rule (unrelated keeps, named retires everywhere, failed retry keeps the key, success replaces everywhere).

**Verify:** next mornings on phone and desktop: after completing tasks, the strip and About always show the same line (or the strip shows the count line only when About has none).

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

**Dev release checkpoint (October 26):** BUG-127/128 are included in the approved v2.99.1 dev release; their earlier local implementation/verification notes above are historical checkpoints. Installation and accepted verification remain open.
