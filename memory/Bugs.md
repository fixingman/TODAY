# Bugs

> Full history for verified bugs → `Bugs-archive.md`

## Status key

| Status | Meaning |
|---|---|
| ✅ Verified | Reported defect verified fixed by Can, deployed checks, or an authorized reproduction-equivalent automated check; separate account/usefulness acceptance is not implied |
| ⏳ Verify | Fix pushed; reported behavior still requires verification |
| 🔧 Local | Fix implemented locally; not pushed |
| ↪ Merged | Tracked under the bug shown in the Reference column |
| ⚠️ Stale | Old, unverified report that needs a fresh reproduction |
| 🚫 Rejected | Platform limitation or deliberately not being fixed |

## Status Summary

Current publication/CI evidence is maintained once in the [release contract](../docs/ci-release-evidence.md#recorded-full-release-proof). Historical local and failed-run receipts below remain history; they do not supersede that result. Installed/account/usefulness verdicts remain separate.

> Descriptions state the symptom; status and release/reference have separate columns. Local versions are unreleased candidates.

| # | Status | Description | Reference |
|---|---|---|---|
| 151 | ⏳ Verify | Focus header haze during entry; the earlier movement repair is shipped. | v3.5.3 follow-up |
| 150 | ⏳ Verify | Delete undo/reason bar stays centred on the window and overlaps Explore instead of following Today. | v3.5.1 |
| 149 | ⏳ Verify | Explore shows an earlier suggestion failure when reopening Something to try, without a new request. | v3.5.1 |
| 148 | ⏳ Verify | Functional runner accepts a timed-out child when its signal handler exits with code zero. | v3.5.0 tooling |
| 147 | ⏳ Verify | Desktop Explore covers Today, dismisses unexpectedly, and exposes competing inputs and chat controls. | v3.4.2 |
| 146 | ⏳ Verify | Linked Explore controls crowd daily/focus task rows. | v3.4.2 |
| 145 | ⏳ Verify | Living note hides unchanged interpretations when source records leave display windows, and puts a generic status under “A possibility”. | v3.5.0 |
| 144 | ⏳ Verify | Exploration opens late, flashes content and exposes unclear or redundant controls. | v3.3.0 |
| 143 | ⏳ Verify | Exploration rejects valid structured AI replies and suggestions. | v3.3.0 |
| 142 | ⏳ Verify | Full release visual gate samples the bottom input fade as page background at320px. | v3.2.2 |
| 141 | ⏳ Verify | Repeated dev CI failures: legacy feeling-feedback records survive source edits or withdrawal. | v3.0.8 |
| 140 | ✅ Verified | Morning-reading reason chips and wording panel cut off on phones after "not really". | v2.106.11 |
| 139 | ⏳ Verify | Accepted daily reading disappears from About after a completion shares a word with its prose. | v2.106.2 |
| 137 | ✅ Verified | Hosted regression gate fails pool feedback clearing and configured reflection display. Fixed; hosted dev run 41194963071 green. | v2.106.4 |
| 135 | 🔍 Open | Startup blocking and cold/warm load exceed performance limits. | v2.106.0 |
| 120 | ↪ Merged | Daily-nudge delivery follow-up; tracked with the strip/About mismatch. | BUG-118 |
| 118 | ⏳ Verify | Daily nudge can be missing or disagree between the task list and About. | v2.97.8 |
| 117 | ⏳ Verify | Gmail context includes automated booking and calendar notifications. | v2.93.20 |
| 107 | 🚫 Rejected | iPhone header buttons have a raised halo. | — |
| 105 | ⏳ Verify | Gmail context misses explicit email tasks. | v2.92.5 |
| 091 | ⏳ Verify | Gmail searches for a person when the task names a topic. | v2.82.3 |

---

*BUG-001–087 (all), verified BUG-088–119, 121–134, 136, 138 → `archive/Bugs-archive.md` (summary rows + detail). Below: open, awaiting-verification, rejected, and merge pointers only.*

---

## BUG-151 — Focus entrance moves or reveals the header

**Report (November 6):** entering desktop Focus makes the logo/chrome appear to move rather than blur; exit does not show the same noticed effect. Can clarified that a long list and a task toward the bottom make it worse, briefly showing TODAY; Explore can also be open.

**Two reproduced causes:** (1) Focus switches the sticky header to fixed positioning for scroll lock (BUG-098). Beside Explore, `width:100%` then resolves against the whole viewport. At1280px it gains419.33px and logo/navigation move209.67px in the first29ms. The same short-list control with Explore closed records zero drift. (2) On a42-task scrolled list without Explore, the header was already partially scrolled out (`top:-77.80px`, logo bottom:-5.80px). Focus forces `top:0`, moving it77.80px and bringing the logo back into view before dimming. The long-list before-control still fails after the width-only repair. Original traces/failures: `.context/focus-header-motion/before.log`, `before-closed.json`, `before-docked.json`, `scrolled-before.log`, `before-scrolled.json`.

**Local v3.5.1:** capture the header’s actual viewport top before pinning and clear that owned inline top on unlock. Keep its available Today width when Explore is docked. Preserve scroll lock, flow-space padding, task adjustment, blur/opacity sequence, timer and restored document scrolling. No background/lifecycle/sync change. Shorten stale shell comments without changing budgets.

**Haze follow-up (v3.5.3):** Can still sees a haze over TODAY during entry. Exact shipped v3.5.2 reproduction shows full6px blur on the first frame while header opacity is0.80; the SVG reference filter cannot interpolate from `none`, so its declared delay does not create a blur transition. Preserve geometry, background, scroll lock and recede timing; use interpolable CSS blur for the header alone. A native-click regression freezes the real transitions at0/60/120/150/180ms and checks dimming before gradual blur. It fails the shipped runtime (no filter transition, bright immediate blur). Before trace/screenshots/assertion: `.context/focus-haze/`. Other surfaces retain their existing noise treatment. Final fresh Focus/visual/invariant check passes3 suites without failures/flakes in36.4s (`.context/fresh-SmNAtk/receipt.json`); the earlier Focus/design/smoke/invariant check passes4 in32.9s (`.context/fresh-1nHLZq/receipt.json`). Final runtime/test file fingerprints still match. Before-control fails on shipped v3.5.2; entry screenshots and real-frame traces confirm blur stays0px during dimming after the repair. Dev publication authorized; hosted and installed acceptance remain separate. The previous published movement fix remains awaiting user acceptance.

**Coverage gap and repair:** earlier tests checked settled pinning/dimming/filter and a static sidebar, not the transition or a genuinely scrolled long list. New native tests sample actual header/logo/navigation on every animation frame, anchored to click/Escape, across entry/exit. Include closed/sidebar widths736/1024/1440px and42-task scrolled cases with and without Explore. Entry geometry must remain within1px. On deep exit the document legitimately restores its nudged scroll position, so offscreen chrome may move farther offscreen but cannot reappear; verify the restored scroll and retain all raw frames. The intermediate strict all-y exit assertion is retained in `scrolled-after.log` as test development evidence, not a runtime regression claim.

**Verification:** final fresh combined check passes12 suites with zero failures/flakes in78.2s (`.context/fresh-1h4UhX/receipt.json`), including Focus, Explore, task actions, triage, accessibility, visual, smoke/SW/component/AI-handler, design and invariants/payload. Both42-task entrance traces keep header/logo/navigation geometry unchanged across34 sampled frames, with and without Explore; exit restores the nudged scroll without revealing offscreen chrome. Captured runtime/test input hashes still match the workspace after the check. Owning initial width-only check and `.context/fresh-mLgaAF/` predate the long-list repair and remain historical. Earlier controls and the legitimate deep-exit test correction are retained. Dev publication authorized November6; hosted and installed acceptance remain separate.

---

## BUG-150 — Fixed task bars ignore the Explore column

**Report (November 6):** deleting a task with the sidebar open leaves the undo/reason bar at the window centre rather than shifting with Today.

**Cause:** desktop docking re-centres body content and the task composer; fixed `#undoToast` and `#triageBar` live outside that flow and retain `left:50%` and viewport-wide caps. At601px, the actual delete control produces a toast centred at300.5px while Today’s centre is165.28px. Its right edge reaches499.91px beyond the sidebar’s330.56px left edge; Edit, Undo and two reason buttons are covered. Before-control and screenshot: `.context/explore-undo-alignment/before.log`, `before-601.png`.

**Why tests missed it:** sidebar coverage asserted logo/header/list/composer placement and screenshots without a removal toast. Separate task-action tests checked removal/toast visibility/restoration without an open sidebar. Existing containment checks scoped to Explore descendants could not inspect a body-level fixed control. The combined delete-with-sidebar interaction was omitted; the old passing tests did not prove this layout.

**Local v3.5.1:** centre both fixed task bars in the same remaining Today column and bound their width to it; wrap the undo main row when narrow. Preserve existing positions at600px and below and with Explore closed. Left/width changes use existing motion tokens and reduced-motion handling. No delete, undo, reason, triage countdown, sync or persistence behavior changes. Extend the actual Explore test with native delete/reasons/keyboard Undo at601/736/1024/1440px, hit-testing every control, draft/sidebar preservation, screenshots and the real evening Review callout. The original undo assertion fails on the published layout. Closed-sidebar task-action coverage also asserts viewport centring.

**Verification:** final fresh combined check passes11 suites with zero failures/flakes in52.3s (`.context/fresh-e52gcO/receipt.json`): invariants/payload, Explore, task actions, triage, accessibility, design, smoke, service worker, visual, component and AI-handler checks. Native delete/reasons/keyboard Undo and evening Review alignment pass at601/736/1024/1440px. Earlier combined receipt `.context/fresh-6z69s3/` retains ten passing suites and a payload failure389 bytes over the existing raw limit; shortening480 bytes of outdated/redundant Explore-shell comments repairs it without changing budgets or behavior. Final payload1205.9KiB decoded /341.1KiB Brotli /38 eager scripts passes. Before/after601px captures and the failed original assertion remain under `.context/explore-undo-alignment/`. Dev publication authorized November6; hosted and installed acceptance remain separate.

---

## BUG-149 — Earlier suggestion error survives page navigation

**Report (November 6):** Can opened **Something to try** and “The suggestion could not be completed. Try again.” was already present. It was not a newly observed request timeout. Personal journal/credentials were not inspected.

**Reproduction:** a fictional real-component failure followed by Back and reopening the step page retains the old error despite no new request. The before-control fails the empty-status assertion in `.context/explore-suggestion-repair/stale-status-before.log`. Full Explore reopening already clears the page-held message; navigation inside the same open session did not.

**Local v3.5.1:** clear a terminal suggestion status on entering the step view, preserving an active request’s thinking state. Navigation makes no request/retry or journal write. Also distinguish fresh cutoff, timeout, changed support, missing bounds, unreadable/invalid output, credential or rate-limit failures beside the existing action. Both providers’ token-cap metadata gets an Explore-only incomplete-response code without partial prose; the actual-handler before-control returned200 for that capped result (`.context/explore-suggestion-repair/before.log`). This is a separate confirmed error-handling gap, not proof that the original attempt hit its cap. One explicit request,25-second deadline, output ceiling, existing prompt, strict validation and acknowledgements remain. A proposed brevity change was withdrawn after Can clarified that the error was already there on opening. No provider/routing/model/thinking, collection/schema or writing-policy change.

**Verification:** final fresh check passes seven suites with zero failures/flakes in22.5s (`.context/fresh-FiMufF/receipt.json`): invariants, native Explore, both-provider handler unit, design lint, smoke, service worker and component contracts. Actual-component assertions reproduce the old status on Back/reopen, then prove clearing with no request/write, retained thinking during a held request, all reason-specific failure cases and late-body rejection. Earlier seven-suite receipts (`.context/fresh-TUoPJn/`, `.context/fresh-1fxsxZ/`) precede the navigation fix and remain historical. Live writing and the older failed attempt’s cause remain unverified. Dev publication authorized November6; hosted and installed acceptance remain separate.

---

## BUG-148 — Timed-out child reported as passing

**Evidence (November 6):** `.context/fresh-F9H2cj/` reports ten passes, but its Exploration attempt records `timedOut:true` / exit0 after the runner deadline. This receipt is not accepted as a clean pass. The child handled the deadline signal and returned0; the runner checked only exit status.

**Local repair:** require zero exit, no spawn error and no signal for a passing attempt. Add a real child that handles SIGTERM by exiting0; it must still fail. Retain deadlines and retry/flake policy. Separately pin the Explore fixture to an advancing fictional morning for its morning-only nudge assertions and close fixture connections explicitly. No production deadline or nudge/sync behavior is changed by this test repair. Before/after actual-child control passes; the original exit-only control reports a false green, the repaired runner fails it even with exit0. Final fresh check passes13 suites with zero failures/flakes/timeouts in37.9s and unchanged inputs (`.context/fresh-eifc2b/receipt.json`). This is local verification, not deployed acceptance.

---

## BUG-147 — Persistent desktop Explore and responsive chat

**Report (Can, November 6):** the sidebar should push the logo, navigation and tasks aside, stay open until its header close control is used, and follow pointer location for dimming and the active input. Chat thinking lacks animation, sent messages render late, and repeated Sources/correction links crowd the conversation.

**Repair:** dock above600px, reserve space for the complete Today column, keep both desktop panes usable, and dim only the inactive pane without intercepting clicks. Pointer and keyboard focus select the visible/reachable composer; drafts remain separate. Header close is the sidebar dismissal; Escape only returns from secondary views. Move Chat/Living note/Earlier/Sources into header navigation and retain immutable wording changes in the note. Render submitted observations immediately while Dropbox confirms; request AI only after confirmation. Inline dots use token-timed WAAPI and respect reduced motion. Release waiting uses one logged watcher, without repeated status checks.

**Verification:** Five fresh first-attempt checks pass after scoping the composer fade to Explore: invariants, Exploration, Focus, design lint and visual regression (39.7s, zero flakes/failures). About and nudge-feedback passed in the preceding owning run. Final captures retain736/1024/1440px docking, complete header containment and both active panes. Evidence: `.context/explore-dock/local-verified/`; the original Focus regression and development failures remain retained. Hosted full proof is still required; no installed/live-account acceptance is claimed.


**Linux release follow-up:** Full Linux run42175964210 retained61 passing suites and failed Exploration twice before desktop Focus opened; performance correctly did not run. Native Linux headless hover was false, unlike the local browser. Reuse the established Focus fixture contract by explicitly pinning mouse hardware in JS and mapping only CSS hardware predicates, preserving selectors/declarations, native width/motion and all deadlines. Assert that desktop Focus is actually installed. A deliberately touch-only control rejects that assertion; it cannot silently skip Focus coverage. Runtime code and budgets are unchanged; the repaired exact commit needs new full hosted proof.

---

## BUG-146 — Linked Explore tasks crowd the daily task row

**Report (Can, November 6):** inline Explore buttons conflict with the existing task-row pattern; layout appears broken on desktop and mobile.

**Cause and coverage gap:** entry coordination appends a Memory-style button after the native task controls when a saved conversation references the task or an experiment creates it. The six canonical screenshot scenes do not load that saved conversation; Explore's containment checks inspect the Explore surface, not the daily rows after closing it.

**Follow-up (Can):** the permanent “explore this →” below the nudge and task-level CTA in desktop focus also feel scattered or break layout. Keep daily-reading exploration beside the revealed feedback actions in the nudge and About instead.

**Local repair:** remove row-button injection and the permanent below-nudge CTA; add a separate non-voting contextual Explore action beside the daily reading’s existing feedback in both places. Opening snapshots the exact clicked AI wording as optional, initially unselected context, without a vote, model request or journal write. Desktop focus keeps its native controls.

**Original task-row repair:** remove row-button injection; retain the normal list/Memory entrances and task references/experiments within Explore. Add actual-component coverage that creates a saved conversation and linked experiment, closes Explore, rerenders tasks at390/320/1024px, and checks native controls and containment. The original published implementation fails the new assertion with an unexpected `explore` action; receipts and fictional images are in `.context/task-row-explore/`. Verification: the published implementation fails the new row-control assertion. The isolated repair passes invariants, design lint, six-scene visual regression and Exploration (four first-attempt passes, zero flakes/failures,17.4s). The combined local candidate also passes those four checks in17.4s (`.context/fresh-80HWJv/receipt.json`). Phone/desktop fictional captures were inspected. No live personal journal is read or changed. Publication and any further layout reports remain separate.

**Final contextual-entry verification:** fresh receipt `.context/fresh-lP3saa/receipt.json` passes seven owning checks in44.0s with zero flakes/failures (invariants, Exploration, About, nudge feedback, Focus, design lint and visual regression). Actual-component coverage checks linked tasks in desktop Focus, no permanent below-nudge CTA, both reading-to-Explore handoffs, unselected exact AI wording, unchanged votes/model requests/journal entry count, stale-reading refusal and320/390/1024px action containment. Reading payload metadata uses its own attribute rather than the rendered-reading marker. Captures are retained under `ci-test-results/task-row-explore` so hosted artifacts and fresh-check receipts keep them. Source/app changes remain local and uncommitted.

---

## BUG-145 — Living-note interpretation disappears behind a generic warning

**Report (Can, November 6):** the living note repeatedly shows “The earlier reading is withheld because its sources changed. Your words remain.” under “A possibility”; no useful interpretation has been seen there.

**Reproduction:** fictional controls reproduce two false-unavailability paths: an unchanged returning record falls below Memory's five visible returns, or an unchanged manual task moves beyond the first100 selection candidates. Both still exist, but the source projection omits them and the reading fails its support check. This establishes a defect, not the exact cause in Can's document: native app observation was available, but navigation/console controls did not respond, and no personal journal or credential was read.

**Local v3.4.1:** check up to96 already-declared dependencies against the same permitted stores beyond presentation/candidate windows; retained rows are support-only and cannot enter a new selection, even via a prior pin. Keep the existing100-task/50-Memory candidate windows, eight-record/two-interpretation writer caps, no raw source copies and all source edit/deletion/revocation/expiry/clear/readiness/permission fences. Memory's visible windows stay unchanged. The living note shows “A possibility” only with an actual current interpretation; a separate quiet notice explains changed/unavailable records, imported notes or scope changes. Own notes and the actual open question stay visible. No automatic AI call, journal rewrite or privacy/schema expansion.

**Verification:** original failing controls and passing repairs are retained in `.context/living-note-investigation/`. Fresh-check receipt `.context/fresh-orivqh/receipt.json`: seven first-attempt passes, zero flakes/failures in20.2s (invariants, Exploration, Memory, design, component, smoke and service worker); inputs remain unchanged. Actual-component checks cover no extra AI call, source-window retention, true edit/deletion/revocation/clear/readiness/permission fences, a separate specific notice, no empty interpretation heading, the original open question and320/390/736/1024px containment/axe. A separate same-input component run passes and supplies inspected fictional phone/desktop captures. No full release/performance gate or account cause is claimed. Local v3.4.1, not published; Can's actual document remains unverified.

**November 6 journey review:** Can reports no active source change and has not experienced accumulated understanding or optional action. Separate fictional controls execute automatic Memory freshness updates and new-day task graduation: both still withhold a reading under the existing contract even after this narrow repair. The broader [journey review](../docs/exploration-journey-review.md) owns that product/source-policy gap; BUG-145's window repair must not be described as resolving every automatic invalidation or the feature's usefulness. No broader runtime policy changed during the review.

---

## BUG-144 — Exploration opening and control friction

**Report (November 4):** desktop Explore opens/content appears laggily; Start has no visible hover; question heading feels oversized; setup explanation, retry, Document tools and task-copy picker are unclear/redundant.

**Follow-up (Can):** remove the unsupported list arrow and count-sized topic, restore daily capture in both Memory/Explore, and correct prose/navigation type roles. Can approved the clarity study and explicitly requested production integration. Local v3.3.0 replaces the mixed Notes/source/admin view with focused pages and experience-first Send; Memory prepares code/styles ahead of use, increases prose/action sizing and removes routine repeated row labels. Claude reviewed both actual components and rendered before/after captures. Intentional entrance/capture changes refresh the six visual references without raising tolerances; the Memory scene waits for the actual lazy view and fonts.

**Local v3.3.0:** show the standard panel shell before lazy imports, keep cancellation/current-open fences, skip unrelated Memory rendering/preview and wait for CSS before replacing loading content. Loaded content fades and its height settles through shared motion tokens, with reduced-motion bypass. Use text-md for the question, token hover/focus for Start, Enter submission/Shift+Enter newline with IME/repeat guards and a small accessible send control. Preserve focus with readonly while waiting. Replace setup boilerplate with compact source scope; remove duplicate task-copy picker and generic tools while retaining old records and contextual recovery/export/clear. Retry is only shown for a failed/interrupted saved observation. Tests cover held imports/styles/downloads, cancellation, one canonical read, focus and keyboard, source safety and 320/390/736/1024px axe/containment. Local verification:46 affected checks passed with zero failures/flakes; the subsequent recovery changes pass nine final checks, including actual-component accessibility/visual and held stylesheet/write failure paths. Input fingerprints stay unchanged. Latest clarity follow-up:61 other full-run suites pass; the reflection feedback helper clicked beneath the restored task bar. A causal hit-test shows the task bar at the vote centre. Scrolling/hit-testing before the same vote preserves all feedback/privacy assertions; the suite and invariants pass separately. All five performance runs pass unchanged budgets. Original full failure and receipts stay in `.context/exploration-clarity/`. The current v3.3.0 full run has61 passes and one nudge browser-startup flake before navigation (diagnostic retry passes); it is not a green release gate. A final exact-native-title/first-save-export patch passes all six targeted checks, zero flakes/failures. Both frozen receipts are retained in `.context/memory-clarity/`; all five final performance runs pass unchanged limits at1197.6KiB decoded /339.2KiB Brotli /38 scripts. Installed smoothness remains a user verdict. Can authorized dev/master publication November 5; exact-commit hosted release proof remains required.

---

## BUG-143 — Exploration rejects the proxy's structured result

**Report (November 4):** Suggest something produced no suggestion. The unchanged ai-assist handler parses valid model JSON and returns it at top level; Exploration attempted to parse only content/message. A before-control with a fictional direct response times out waiting for a reading, preserving the failure in `.context/exploration-polish/direct-response-before.log`. This defect affects ordinary replies as well.

**Local v3.3.0:** validate both direct objects and wrapped JSON text. Preserve evidence-ID, source, epoch, revision and account fences. Requested suggestions must include all six bounds before any replacement reading is committed; pending, empty and failure states appear beside the action, and successful suggestions persist on resumption. The real handler runs against a fictional upstream response in an isolated VM; actual-component fixtures exercise both shapes and empty/failure/delayed results. No live provider request or personal record is used. Local verification:46 affected checks passed without failures/flakes, followed by nine final recovery checks, including real-handler direct JSON, wrapped JSON, empty/failure/pending suggestion states and retry after unconfirmed reading persistence. Input fingerprints remain unchanged. Live writing/usefulness and publication remain separate.

---

## BUG-142 — Mobile visual sampler overlaps the input fade

**Release blocker:** full Linux [41828799949](https://github.com/fixingman/TODAY/actions/runs/41828799949) at97fe749c passed61 suites but failed `visual-test` on both attempts: header14.67/page14.26. The v3.2.1 selected dev check had passed; it did not supply full promotion proof. Performance was skipped after the functional failure; master remains unchanged.

The point `lastRow.bottom +24` can enter the fixed add-bar fade after text wrapping. Pinned Chrome152 measurements place it at592.4px inside the589–599px fade. v3.2.2 samples beside a row wholly between header/footer fades and fails explicitly if no such row exists. Tolerance0.25, screenshot threshold/limit and all baselines remain unchanged; no product styling is changed. Two pinned-browser mobile captures pass at329.6px. A counterfactual restores the original BUG-113 noise CSS and is still rejected14.67 vs15.80. Original failure/control receipts: `.context/exploration-layout-restored/`. All five affected local suites pass with unchanged input fingerprints: invariants, design lint, smoke, six-scene/repeat visual and real service-worker checks. Can authorized the repair as part of master promotion. Hosted exact-candidate release verification is required before master promotion.

---

## BUG-141 — Legacy feeling-feedback withdrawal fails CI

**v3.0.8 dev publication (authorized November 3):** dev runs [41514801226](https://github.com/fixingman/TODAY/actions/runs/41514801226), [41517387062](https://github.com/fixingman/TODAY/actions/runs/41517387062) and [41519328533](https://github.com/fixingman/TODAY/actions/runs/41519328533) repeatedly fail `feedback-policy-unit-test.mjs:48`. v3.0.5 retained voted records on every evidence change; v3.0.7 distinguished feeling edits only for records carrying new fingerprints. Older records still bypassed the original edit/withdrawal fence. Latest hosted run: 60 passed, zero flaky, one failed. Its final memory-check error follows skipped steps after that functional failure.

Retain votes after recent evidence changes only when valid stored/current feeling fingerprints prove an outcome-only edit. Feeling edits, deletion and missing legacy/partial fingerprints invalidate the reading; source-readiness deferral, consent/clear fences and natural expiry stay intact. Original local failure: `.context/feedback-ci-fix/before-unit.log`. Policy regressions cover both record formats, outcome-only retention, feeling edits/deletion, missing metadata, startup deferral and expired-record convergence. A separate local reflection-fixture flake sampled before the request/result after a fixed 50ms; result assertions now await rendered acceptance/rejection within the existing 3s fixture bound. Initial logs and retry remain under `.context/feedback-ci-fix/initial-targeted/`. The frozen full local gate then reports 60 passes, zero flakes and one Focus fixture failure (`.context/feedback-ci-fix/full-gate/`). Its 25-minute synthetic jump crossed local midnight, so the subsequent partial session correctly reset the daily minute counter. A fixed 23:50 control reproduces the same one-minute-versus-26 result; that same-day sync test now starts at fixed noon, with existing midnight history coverage retained in `day-lifecycle-test`. Control: `.context/feedback-ci-fix/focus-midnight-control-seeded.log`. The earlier targeted run was invalidated by version metadata edits and is not accepted as final proof. The focused follow-up passes Focus but exposes a day-lifecycle flake: a triage reveal animation frame queued before incoming dismissal can run after a newer hide. A generation/state guard in `checkTriageBar` prevents that stale reveal. A controlled queued-frame test fails before and passes after (`.context/feedback-ci-fix/triage-frame-before.log`); all six affected invariant/smoke/Dropbox/triage/day-lifecycle checks pass with zero retries (`.context/feedback-ci-fix/triage-targeted/`). Final combined local validation (November 3): all 61 suites passed on the first attempt, zero failures/flakes, 422.4s, with runtime/test/policy fingerprints unchanged (Node24.14.0 / macOS arm64 / Chrome156.0.8078.79). Payload passes at1205.2KiB decoded /341.2KiB Brotli /38 scripts; syntax, memory inventory and whitespace pass. Final receipt: `.context/feedback-ci-fix/final-validation/summary.json`. This is local functional evidence; hosted exact-commit and five-run performance confirmation remain pending. Dev publication authorized November 3; hosted confirmation pending.

---

## BUG-139 — A completed-task word hides the accepted daily reading

**Report (Can, October 30):** a daily reading arrived after midnight, was voted on, then disappeared from About on all devices. Strip dismissal after voting is understood and is not this report. A subsequent task completion is a possible explanation; the exact historical task/reading relationship has not been inspected or established. No private reading, vote ledger or task was copied into the repository.

**Confirmed defect:** `_dayLineNamesDoneTask()` accepted any eligible shared word as proof that an accepted reading referred to a completed task. An unrelated completed task “Buy a library card” therefore hid a fictional reading about choosing a library book. Synced completions/recent-completion records apply the same inference on other devices. Voting in About itself does not dismiss the reading. The real-startup desktop before-control fails `complete-overlap: accepted reading remains in About`; original log: `.context/nudge-retention-fix/before.log`.

**Fix (v2.106.2 dev candidate):** both existing homes use the dated accepted cache without word-based completion retirement. Until a verified task relationship exists, local/synced completions cannot hide, replace or regenerate an accepted sentence; its existing feedback remains available. Writer selection, context, prompts, requests and model response format are unchanged; no forced task wording, model-reported task IDs, added metadata, new AI call, sync field or schema. Strip voting/dismissal/noon, actual day rollover, current-date sync adoption and explicit clear/data-loss boundaries retain their existing meaning. Completion still affects future generation's current task evidence. Future retirement needs an unchanged task/source identity plus evidence completion invalidates that reading; uncertain associations preserve it.

**Verification:** the original-code shared-word failure is retained. Updated regressions cover a single shared word, a literal task mention without a verified link, unrelated completion, local/synced completion, About vote survival, no replacement request, accepted cache at noon and next local day. Eight affected suites (`nudge-delivery`, `nudge`, `nudge-feedback`, `dropbox`, `about`, component contract, smoke and day lifecycle) plus design lint and CI invariants pass on Node24.14.0 / Chrome152.0.7977.75. The delivery suite covers56 desktop/touch cases; runtime/test/workflow inputs remain unchanged throughout. Current writer bytes match the original. Two intermediate new-test input failures are retained separately: the fixture clicked a closed/moving feedback row; a focused hit-test control shows the moving button centre hit a DIV, then the same real click after its existing animation settles records the vote. Production timing/deadlines were not changed. Full receipts and logs: `.context/nudge-retention-fix/verification.json`, `checks/`, `before.log` and `feedback-input-control.mjs`. This is targeted local verification, not full release approval; the dev candidate still requires hosted proof and installed pickup. General midnight delivery/real-use writing acceptance stays separate under BUG-118 and Backlog #15A.

---

## BUG-140 — Strip reason chips clipped on phones

**Status: ✅ v2.106.11 — verified.** Hosted CI green on dev (41229774117) and master (41230671193); Can confirmed on phone, October 31.

**Cause:** v2.106.7 replaced `display` toggling on `#dayNudgeReact` with a `max-height: 0 → 80px` fade. After "not really" the row holds landed / not really / wording plus four reason chips; measured content is 128px at 320/375/390px and 92px at 430px, so the bottom chips (and the wording panel, which opens in the same row) were clipped by `overflow: hidden`. Found when hosted CI on v2.106.7–.10 failed `pool-wording-test` at 51/53; bisected to `d92c2c28`.

**Fix:** `0fr → 1fr` grid reveal on a body wrapper, so the row opens to its content height with the same `--dur-fast` fade; collapsed controls are `visibility: hidden`. Measured unclipped at all four widths; `pool-wording-test` passes 53/53 without test changes.

## BUG-137 — Clean CI fixture failures

**Status: ✅ v2.106.4 — verified.** [Dev 41194963071](https://github.com/fixingman/TODAY/actions/runs/41194963071) on `d2f8a22d` passed the full hosted Linux gate: 61 suites, zero failures and zero flakes.

**Root causes (October 31):** both failures are timing-dependent, not timezone-dependent: the same SHA passes and fails at different wall-clock moments. (1) `reflections-test`: each case replaces `window.fetch` and keeps the last body. The startup morning reading ("You are the quiet companion…") normally fires ~75ms after load, before the stub. On a slow runner it lands after, overwrites the reflection request (CI signature `resultShown:true`, `aggregateOnly:false`, `insightPrompt:false`) or counts against `noAIRequest` (the v2.106.3 `dominant feeling → silence` failure). An injected late request reproduces the exact signature on the old fixture. Fix: `openPage` routes only reflection requests to test stubs. (2) `pool-wording-test` (`sunday incoming-clear` / `wording-revision` / `memory-clear`): a runtime defect. Every Sunday About render without a cache started a new request. On a slow runner the panel rendered twice; the duplicate got an unheld response and cached before the change, so the late-body fence was never reached. Fix: `about.js` reuses the in-flight request for the same source key. A source change still starts a new fenced request. At 4× CPU throttle the old code fails 3/3 and the fix passes 3/3 (52 groups). A new group counts 3 requests for three renders on old code and 1 with the fix.

**Failed verification (October 30):** [master41042013402](https://github.com/fixingman/TODAY/actions/runs/41042013402) on `946dc046` ends with 59 passing suites, one flaky and one failed. `pool-wording-test` fails `sunday incoming-clear` on its first attempt and passes only the diagnostic retry; it correctly fails the gate. `reflections-test` fails “configured AI + 16 reflections → reflection shown” on both attempts. The earlier Calendar/enrichment/Focus fixture failures no longer fail this run, but these two current failures are unresolved. No fixture/runtime/environment cause is assumed. Failure log retained in `.context/independent-bug-review/master-failures.log`; no passing reroll replaces it. BUG-137 therefore still awaits an accepted verification pass; CI-efficiency implementation remains complete.

**Current verification (October 30):** v2.106.0 full hosted dev run40962438500 passed all 61 suites with zero failures/flakes and all five performance runs. The original Calendar/enrichment/Focus CI failures and causal controls below are historical evidence; that earlier hosted confirmation is complete. The later pool/reflection failures above remain unresolved. Physical-device acceptance is not needed to diagnose this hosted regression gate.

**Phase-2 local follow-up:** Calendar/Gmail-feedback/Sound static servers decode encoded font paths; layout checks require all six shipped font faces. Node-seeded About/day/habit/nudge date keys share a fictional browser origin while elapsed deadlines advance. Pinned-browser and clean-checkout verification are separate from hosted Linux and installed acceptance; retain historical failures.

**Input-model repair (v2.103.5):** both v2.103.4 hosted runs (40661801217 / 40661801762) still pass 52 suites and fail Focus. Diagnostics reveal 13.333px Arial and wrapping: JS forces desktop while native CSS has no-hover capability, so text length is not the cause. Test-only CSSOM hardware predicates now match the JS fixture; selectors, declarations and width/motion predicates are preserved and checked. The 320px feedback case deliberately uses native no-hover hardware; inconsistent input fails locally before, all 29 groups pass after. Resizing retains native device settings. Production CSS/input guards and all deadlines/assertions remain unchanged. The frozen v2.103.5 candidate passes all 53 functional suites with zero flaky/failed results and all five performance runs with unchanged limits; payload passes at 1201.1 KiB decoded / 340.9 KiB Brotli / 38 eager scripts. All 149 runtime/test fingerprints stay unchanged across the gates. Original failures and no-hover before/after controls remain retained. Exact-commit hosted confirmation and installed acceptance are separate.

**Hosted follow-up (v2.103.4):** both v2.103.2 runs (40612299853 / 40612299919) pass 52 suites and fail the same resize-to-scroll fixture. The original 243.7px answer fits the 284px answer area on Linux; stationary text is correct. A longer 14-word fixture now checks desktop fit/no motion before retaining the narrow-scroll, widening, exact-reply/rating and native-overflow-reporting assertions. No runtime, deadline, retry or budget changes. A proportional-font control passes the revised fixture; it alone did not reproduce the hosted geometry with the original sentence. The actual hosted failure is retained as the negative evidence. The revised isolated gate passes 53 suites with zero flaky/failed results. All five v2.103.4 performance runs pass unchanged budgets: worst cold blocking 67 ms / 200 ms, cold FCP 6712 ms / 7000 ms, warm FCP 124 ms / 500 ms and Focus 38 ms / 300 ms. Payload is 1201.1 KiB decoded / 341.0 KiB Brotli with 38 eager scripts. Hosted results are checked against the exact published commit, separately from installed acceptance.

**Focus ledger isolation:** the second full gate also reports52 passes/one flake/zero failures, with a habit Ask timing out while waiting for exactly one new request. Its mock held every ai-assist surface, so an unrelated writer could increment the same ledger. An injected overlapping background writer reproduces the exact three-second timeout. Restricting the mock to the explicit Focus rubric passes that control and the complete Focus suite, forwards the unrelated request normally and keeps the original deadline. Timeout diagnostics now expose bounded request counts and owner/UI/configuration flags, never credentials or prior private text. The original failed gate and negative control remain retained.


**Additional local gate evidence:** initial candidate gate reports 52 passed/one flaky/zero failed. The triage-close case samples 450 ms after Escape without waiting for collapse completion. A controlled 250 ms delay to its existing 300 ms collapse timer reproduces the identical barBack=false result. The fixture now waits for the actual overlay-hidden completion using the existing state-wait bound, then checks bar restoration and unchanged morph assertions. This does not change triage runtime, motion durations or performance budgets. Original52/1 gate plus deterministic before/after controls are retained.


**Confirmed run:** dev 40605616074 / commit 9f012a5e reports 50 passed, zero flaky, three failed. Enrichment tries to write a screenshot below a directory absent from a fresh checkout. Calendar builds an event ten minutes from wall-clock now, which falls outside today near midnight; its expected one-event context then never arrives. Focus waits for a button narrower than 250px although a valid resized answer can be wider on another platform. The source/user-input contracts are unchanged. Original logs: .context/15g-reliability/dev-ci-failure.log.

**Local repair (v2.103.2):** create the artifact directory before screenshot; freeze the integration fixture at UTC noon and build its token/event dates from that clock; compare Focus width with the actual desktop width while retaining scrolling/reply/rating assertions and deadlines. Final local verification: 53 functional suites passed with zero flaky/failed results; all five performance runs pass unchanged budgets (worst cold blocking59ms/200, coldFCP6748ms/7000, warmFCP124ms/500, focus35.9ms/300; medianfocus33ms). Payload1201.1KiB decoded/341.0KiB Brotli/38scripts. The About-history-only copy correction has identical version/executable behavior and passes subsequent syntax/smoke/design/payload checks. Original failures and causal negative controls are retained. Published as a2357665; both v2.103.2 hosted runs passed 52 suites and exposed the overflow-fixture assumption followed up in v2.103.4. No timeout or budget raised.

---

## BUG-135 — Startup performance exceeds release budgets

**Release status (October 30):** v2.106.0 (`2b5f229c`) is published to dev/master. [Dev40962438500](https://github.com/fixingman/TODAY/actions/runs/40962438500) passed the exact-SHA full Linux gate: 61 suites, zero failures/flakes and all five performance runs. [Master40964846722](https://github.com/fixingman/TODAY/actions/runs/40964846722) verified reuse and passed in 15 seconds. Hosted release assurance is accepted; the retained local/deployed failures below and deployed/installed recovery remain open. CI efficiency completion does not close BUG-135.

**Configured comparison (same frozen source):** Node24.14.0 / Chrome for Testing152.0.7977.75 also fails its five-run gate: cold blocking511ms/200ms, FCP7148ms/7000ms, interactive7155.5ms/7000ms and warm FCP/LCP1348ms/500ms. Original attribution includes284.7ms in sound.js and other frame/layout work; it does not justify assigning every miss to audio. A post-run machine snapshot shows load averages20.03/13.80/9.36; this does not causally clear the benchmark. Neither browser/process settings nor limits were changed. Both failed measurements remain retained. The later accepted hosted proof and master reuse are recorded above; deployed/installed recovery is still unverified.

**v2.106.0 publication, original local run:** all 61 integrated functional checks pass on Node24.14.0 / machine Chrome156.0.8078.49. The retained five-run benchmark fails cold TBT381ms/200ms (381/27/20/0/11), cold FCP7044ms/7000ms and cold interactive7007.3ms/7000ms. Original-run attribution records416.1ms in unchanged sound.js, within a419ms long task. CI locks Chrome for Testing152.0.7977.75; the separately labelled configured-browser comparison above is retained without replacing this failure or claiming a new audio fix. Evidence: .context/15gd/publication/performance-failed.json.

**v2.106.0 dev continuation:** retained original deployed run 40861300900 records 397 ms cold blocking: sound.js accounts for a 200 ms long task and the main inline script 297 ms. The startup composition now yields between ordered owners, seals interaction until readiness, and preserves late load/DOMContentLoaded hooks and initial Dropbox ordering. A controlled coalesced-before / yielded-after browser check retains the same 200 ms limit; it establishes the grouping mechanism, not deployed recovery. Native audio initialization and all budgets remain unchanged. Final local gate evidence is recorded with the release; deployed/installed confirmation is still required.

**v2.105.1 CI integration, October28:** the original five-run local benchmark on Chrome152/Node20 fails cold TBT at244ms/200ms (runs244/0/0/0/0). Original-run attribution records225.5ms in unchanged sound.js and116.5ms in the page script. All58 functional suites passed on Node24 with zero failures/flakes. The benchmark shell selected unsupported Node20 in the isolated directory; a separately labelled explicit-Node24 comparison is retained without replacing this original or claiming it explains/fixes the browser stall. Published runtime bytes are unchanged; BUG-135 remains open. The explicit Node24.14.0/Chrome152 configured-environment comparison passes all five runs, worst cold TBT141ms/200ms. This does not erase the original Node20 failure or establish that Node caused or fixed the browser stall. All170 runtime/test inputs remain unchanged through both benchmarks; BUG-135 stays open.

**15G local repair (v2.103.2):** supported browsers first prepare a silent audio sink and asynchronously attach the system default; no device enumeration, permission request, tone shape or autoplay-policy change. Legacy/refused-option paths preserve existing behavior. A pending default-output connection cannot block Focus input; only the latest cue may wait, for at most one second, and closed/replaced contexts discard late work. The controlled 340 ms synchronous-default constructor fails the startup guard before and passes after; first-input and real native/default-output tests pass. A one-run diagnostic has cold TBT 81 ms and warm TBT 0 ms, but it is not the required five-run release result. Final verification: 53 functional suites passed with zero flaky/failed results; all five performance runs pass unchanged budgets (worst cold blocking59ms/200, coldFCP6748ms/7000, warmFCP124ms/500, focus35.9ms/300; medianfocus33ms). Payload1201.1KiB decoded/341.0KiB Brotli/38scripts. The About-history-only copy correction has identical version/executable behavior and passes subsequent syntax/smoke/design/payload checks. Original failures and causal negative controls are retained. Published as a2357665; both v2.103.2 hosted runs passed 52 suites and exposed the overflow-fixture assumption followed up in v2.103.4. Original failed evidence remains below.


**Discovery (October 28):** the stable isolated v2.103.0 candidate passes 53 functional suites with no flakes/failures and passes payload. Its retained five-run performance result fails cold FCP 7040 ms / 7000, cold TBT 492 ms / 200, cold DCL 7031.6 ms / 7000, cold interactive 7013.6 ms / 7000, warm FCP/LCP 704 ms / 500 and warm interactive 671.9 ms / 500. Input medians remain add 13 ms / focus 83.2 ms; worst focus 112.6 ms.

**Attribution/control:** the original first cold run records 434.8 ms in unchanged sound.js initialization. Chrome is 156.0.8078.49, compared with .48 in the prior passing baseline. One separate diagnostic run of published 512bc7b2 / v2.101.5 under the same current Chrome/Node also fails cold TBT 301 ms, with 338.6 ms sound initialization. This demonstrates a wider startup issue; it does not establish the browser update as cause, explain every load failure or clear the candidate. No enrichment/sound/harness/threshold workaround or successful reroll was substituted.

**15E publication status (historical):** investigating. Can requested publication to dev and master on October 28 after that failure was reported; it did not establish a performance pass. The subsequent v2.103.2 repair has the passing local evidence above. Preserve original failed benchmark in memory/performance-baseline.json and .context/15e-adaptation/isolated-final-performance.json, plus the single-run control, logs and 149 source fingerprints. In-progress parallel Focus changes are excluded from this candidate. A causal startup repair must preserve first-input behavior and satisfy unchanged five-run budgets; technical loop completion and actual writing usefulness remain separate.

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

**Independent verification (October 30):** technical BUG-127/128 ownership defects are verified and archived. Real connected-account relevance and writing usefulness remain under Backlog #15E and the still-open Gmail reports; they are not prerequisites for closing a reproduced stale-owner defect.
