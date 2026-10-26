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
| 130 | ⏳ Verify | Completed tasks can reach other devices late after a failed read or overlapping write. | v2.98.6 |
| 129 | ⏳ Verify | Split suggestions disappear after a temporary failure or offline capture. | v2.99.1 |
| 128 | ⏳ Verify | Gmail reuses old queries or caches replies after a task changes or disappears. | v2.99.1 |
| 127 | ⏳ Verify | Web/Trello context outlives its task, source or focus view. | v2.99.1 |
| 126 | ⏳ Verify | Sunday fallback bypasses feedback and overstates weekly evidence. | v2.99.1 |
| 125 | ⏳ Verify | Temporary Trello failures show a disconnected icon. | v2.98.5 |
| 124 | ⏳ Verify | Manual-task pomodoro counts revert after syncing. | v2.98.5 |
| 123 | ⏳ Verify | Feeling feedback can be lost before its source data finishes loading. | v2.98.3 |
| 122 | ⏳ Verify | Sync warns when zones agree, or keeps an older Soon copy after a Past move. | v2.97.8 |
| 121 | ⏳ Verify | Opening shortly before midnight can suppress the next day’s poem. | v2.97.8 |
| 120 | ↪ Merged | Daily-nudge delivery follow-up; tracked with the strip/About mismatch. | BUG-118 |
| 118 | ⏳ Verify | Daily nudge can be missing or disagree between the task list and About. | v2.97.8 |
| 117 | ⏳ Verify | Gmail context includes automated booking and calendar notifications. | v2.93.20 |
| 107 | 🚫 Rejected | iPhone header buttons have a raised halo. | — |
| 106 | ⏳ Verify | Focus ages, weekly aging and wake banners silently fall back. | v2.91.1 |
| 105 | ⏳ Verify | Gmail context misses explicit email tasks. | v2.92.5 |
| 091 | ⏳ Verify | Gmail searches for a person when the task names a topic. | v2.82.3 |

---

*BUG-001–087 (all) and BUG-088–119 (verified ✅) → `archive/Bugs-archive.md` (summary rows + detail). Below: open, awaiting-verification, rejected, and merge pointers only.*

---

## BUG-130 — Sync acknowledges revisions whose content was never applied

**Report (Can, October 26):** a task marked done appears completed on another device minutes later rather than seconds; possibly both while visible and after reopening. Slow internet may contribute, but the exact historical device sequence has not been observed.

**Reproduced causes:** (1) `syncDropbox()` assigned `lastDropboxRev` before `dropboxRestore(true)` downloaded/merged successfully. HTTP 503, a network rejection or invalid JSON then left the same revision skipped on subsequent healthy polls, while incorrectly advancing `last_sync_read`. (2) backup, manual restore and cold-start bookkeeping sampled metadata after uploading/downloading. Another device could write between the content operation and that metadata sample, causing an unread completion to be acknowledged. A slow metadata follow-up also unnecessarily delayed releasing a queued backup/startup bookkeeping.

**History:** both the pre-download assignment and post-upload metadata sampling exist in March 5/6 history (`34fcc62f`, `5f14aa67`) and in March 19 `439480cf`; August 17 `ba100923` moved the code into `assets/dropbox.js`. This is an existing failure-path gap, not evidence that the recent AI work or BUG-124 fix introduced it. Previous metadata-504 coverage did not exercise successful metadata followed by failed content or intervening writes.

**Fix (v2.98.6):** a polling revision/read timestamp advances only after successful download and merge. Backups seed only the revision in their own upload response; restore/startup seed only the downloaded content's `Dropbox-API-Result`. Missing or malformed content metadata keeps a subsequent poll eligible; polling can safely fall back to the revision observed before that successful download. Removes extra metadata round trips. No faster polling, new extraction, schema/provider change or retry framework; existing check/uncheck timestamp merge and the 800ms save / seven-second active poll remain.

**Automated verification:** `scripts/dropbox-test.mjs` reproduces failed-content and upload-race behavior before the fixes. It covers 503/network/invalid JSON recovery on the next same-revision poll, rendered completion, intervening writes after upload, manual restore with valid/missing/malformed metadata, startup, and actual check/uncheck plus wake/poll convergence across two isolated browser stores against a fictional Dropbox. The exact v2.98.6 release passes all 52 suites with zero flaky/failed tests and unchanged payload budgets. Release validation also restores documented Memory action target sizing and updates the reviewed visual baseline and Dreams manage fixture to match the preceding layout commits. Artifacts: `.context/sync-2986-gate.log`, `.context/sync-2986-payload.log`; original failure reproductions remain in `.context/sync-latency-*.log`.

**Remaining:** dev release; installed/account acceptance and the precise cause of Can's historical delay remain open. On healthy visible devices the designed path is an 800ms debounce plus the next seven-second poll and network time, not a guaranteed delivery SLA. Background/suspended devices do not poll until return. Slow/unbounded requests, pending-backup deferral and retry backoff can add delay; this patch addresses confirmed unread-revision stalls, not every cause of latency. Release details: `.context/sync-latency-release-note.md`.

---

## BUG-129 — Post-add split delivery cannot recover from a transient request failure

**Report (Can, October 26):** no split suggestions seen for at least ten days, including remembered compound tasks; a tentative two-action example passes the split guard. The historical causes on his device remain unconfirmed.

**Mechanical reproduction:** a fictional mobile browser uses the real Add/Enter action, actual `ai-assist` proxy and a mocked upstream model. Healthy request: 1 request → 1 visible offer. First request HTTP 503, then healthy connection: 1 request → 0 offers, including after `online`. Offline capture then reconnect: 0 upstream requests → 0 offers. A rapid subsequent ordinary capture also cancels the earlier compound analysis; that is the separately retained newest-capture contract, not evidence of a broken provider. Artifacts: `.context/postadd-mechanics-before.json`, `.context/postadd-mechanics-results.json`.

**Cause:** the controller attempts one request, silently returns on transport/non-OK failure, has no whole-response deadline and retains no recent eligible analysis for reconnect. Passing the split predicate alone does not establish delivery.

**Implementation (included in v2.99.1 dev release):** retain only the latest capture in memory for two minutes; keep the two-second debounce; bound request plus body to twelve seconds. Network/timeout/408/429/5xx failures may retry once after five seconds. Offline/hidden deferral consumes no provider attempt; online/foreground can resume after the same backoff. Before a request or result, require the same existing, unchanged, undone manual task and AI credentials. Edit/delete/complete/move/new capture/expiry/config change cancels recovery; stale queued callbacks cannot start a newer capture early. A model abstention, malformed/ungrounded response, reason suppression or permanent HTTP error is terminal. Existing prompt, exact-copy/verb guard, frequency policy, viewport delivery and explicit application remain unchanged. Failed attempts do not create offers or negative outcomes. No persistent queue, telemetry, extra UI, provider/model/routing or backup change.

**Verification:** `assistant-test` adds real Add → real proxy → fictional provider recovery and actual offline reconnect; whole-body timeout/late reply; terminal-result/two-attempt cap; and source/credential/age/supersession fences. No personal task wording enters fixtures. Assistant capture/recovery/fence tests, suggestion policy/outcomes, smoke, component contract, design lint and payload checks pass. The combined v2.99.0 gate now passes 52/52 suites with zero flaky tests, plus all five performance runs and unchanged payload budgets; both release changelogs include this fix. Commit/release, installed behavior and the precise cause of each past missed offer remain open. W1 useful capture-time help survives a brief outage; W2 only the still-current recent capture can recover, with existing frequency and viewport limits.

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

## BUG-126 — Sunday fallback bypasses feedback and overstates weekly evidence

**Discovery (Phase 3 integration, October 25):** fictional source/component probes reproduced independent gaps in the v2.98.2 week-shape fallback: `_pickSundayInsight()` returns `week-shape` even when that kind is permanently retired; the audit reports no selected candidate while the UI picks that fallback; 5 let-go events versus 4 done + 2 Soon pulls are described as more than the others, and a 2/2 tie also claims more; unrelated prose passes the unknown-kind wording guard. The claimed seven-day inclusive window also includes the preceding Sunday. No real-user votes, keys or source history were read; these are deterministic integration findings, not a personal-usefulness verdict.

**Correction (included in v2.99.1 dev release):** route fallback through the existing kind feedback/novelty gate, using a seven-day base cooldown plus the existing extra week after one miss and retirement after two. Require a strict majority for directional claims; mixed wording needs all three actions, otherwise abstain. Use exactly today plus six preceding calendar dates with timezone-independent date arithmetic. Add week-shape action/direction anchors and include fallback selection/rejection in the existing content-free audit. Bump the Sunday evidence policy to earned-v5; replace only unvoted stale-policy same-day lines, retaining explicit old votes as gate evidence. Wait for initial memory readiness; fence late success/failure against relevant outcomes/feedback, Memory clear, day, credentials and an adopted cache. Unrelated Focus wording and source-row order do not cancel a valid response. A late quiet response cannot hide an already accepted synced/current cache.

**Verification:** pure policy cases cover minority/tie/presence claims, real wording guard, exactly seven dates/DST, weekly cooldown/miss/retirement and audit parity. Actual About browser cases cover voted policy migration, held response bodies and late failures after source/vote/clear/day/key/cache/readiness changes, initial sync, and two isolated stores through the real sync merge. Targeted suites and the full 52-suite run pass (0 flaky); payload is 1200.7 KiB decoded / 342.9 KiB Brotli / 38 scripts, within unchanged budgets. One five-run performance measurement passes (`.context/phase3-performance.json`); it does not resolve the retained earlier first-focus failure. The other session released ownership after committing v2.98.5; this correction is included in local v2.99.0, whose combined 52-suite and five-run performance/payload gates now pass with the audit refreshed; commit/release remains pending; no deployed/installed or product keep verdict is claimed.

---

## BUG-125 — Temporary Trello failures show a disconnected connection icon

**Report (Can, October 25):** Connections showed lightning instead of the star; manually refreshing Trello restored the star, alongside network-change/DNS errors.

**Reproduced:** with saved Trello credentials and no cached cards, a rejected network fetch changes the icon to lightning. HTTP 429 and 5xx failures do the same. A successful read sets the star again. A temporary read failure does not remove the credentials.

**Fix (v2.98.5; installed verification pending):** temporary network/rate-limit/server failures keep the configured connection star. Actual 401 credentials / 404 board failures still show lightning; Forget still clears the connection. The empty-cache network message explains temporary reachability rather than suggesting the user's credentials are wrong. No new indicator, animation or retry loop. W1: the existing icon describes the connection; W2: ordinary network interruptions do not demand reconnection.

**Coverage / verification:** `trello-test` exercises manual/background network, 429, 500 and 503 failures without cached cards, plus 401 attention and existing 404/Forget behavior. Installed behavior remains to be verified after release.

---

## BUG-124 — Manual task pomodoro progress overwritten by stale sync records

**Report (Can, October 25):** a manual TODAY task's completed pomodoro count decreases after sync.

**Reproduced:** local `focusSessions:3` merged with the same task's remote `focusSessions:1` becomes 1 in memory/storage. The task merge spreads remote fields over local fields and protects only `lastActive`; badge changes are not detected when IDs/order stay identical. A later render exposes the lower count. Focus completion/exit also lacked the normal local-change stamp and autosave request, leaving the new progress local until another mutation caused an upload.

**Fix:** completion and partial exit now stamp the local change and queue retrying autosave (included in the concurrent v2.98.4 commit). The remaining merge fix is **v2.98.5; installed verification pending**: preserve the maximum completed-session count and newest activity across every copy of the task in Today/Soon/Past, independently of the winning text/order/zone record. A progress difference refreshes the row and schedules the ordinary merged backup, healing a stale remote snapshot. Deletes, zone precedence, manual Restore's explicit overwrite and the backup schema are unchanged. Counts are cumulative per task; this is MAX reconciliation, not addition of concurrent sessions from equal starting counts. Already-lost counts cannot be reconstructed when no surviving copy has them.

**Coverage / verification:** the new `dropbox-test` regression fails before the fix; checks stale/repeated snapshots, storage/badge agreement, newer remote progress and 36 zone/direction/progress combinations. `focus-test` checks completion and partial exit queue sync without another edit. After release, verify a completed manual-task pomodoro survives sync, restart and another device with an older copy; confirm the other device receives the higher badge count. Real-account/device acceptance remains open.

---

## BUG-123 — Feeling feedback pruned against not-yet-ready source evidence

**Discovery (2026-10-25):** Claude’s independent #15 plan review flagged that `_reconcileEvidence()` can persist pruned feedback before the `_sourceReady` display/generation guard. Source review also found the backup path calls reconciliation. This is a source-readiness correctness issue to resolve before expanding feeling feedback, not evidence that Can’s actual votes were lost.

**Isolated reproduction:** use the actual reflection component in a fictional browser; create a qualified insight and mark it missed; mark source readiness false; temporarily remove the fixture’s outcome evidence; call the real `_reflectionBackupFields()`; restore outcomes/readiness. The stored missed-record count is **1 → 0 → 0**. The record is not recovered by returning the sources. No live account, private reflection, network model call or production-state access was used. Exact probe/log: `.context/feedback-loops/claude-plan-review/source-readiness-probe.mjs` and `.log`.

**Cause:** `_reflectionEvidence()` projects source-valid records; `_reconcileEvidence()` writes that projection to storage without checking source readiness. `mergeRecords()` treats a missing/changed recent source version as withdrawal. `_refreshOpenMemory()` also removes feedback when policy is absent/not remember; startup/restore ordering needs review before relying only on a single write guard.

**Fix (v2.98.3):** Two-line guard. (1) `_reconcileEvidence()` write condition gains `&& _sourceReady` — prevents `_saveFeedback()` from persisting pruned records while outcome versions are incomplete. (2) `_reflectionBackupFields()` falls back to raw `_feedbackStore()` for the Dropbox export when `!_sourceReady` — prevents pushing pruned records to the remote backup. The explicit `feedbackClear()` / `feedbackVote()` / `_refreshOpenMemory()` delete paths are unaffected (they each guard `_sourceReady` independently or go through `localStorage.removeItem`, not `_saveFeedback`). The `_reflectionMergeRemote()` incoming-sync write uses the same `versions` issue and remains a known gap; fencing it conflicts with being the event that establishes coherence and is deferred to a follow-up.

**Tests:** `reflection-feedback-test.mjs` adds a BUG-123 regression case: vote missed → fire `today:memory-ready` with `ready:false` + clear outcomes → call `_reflectionBackupFields()` → assert storage still has the missed record; assert backup export also preserves it; restore readiness → assert vote still there.

**Follow-up (local v2.100.0):** incoming feedback now merges with explicit source readiness. While evidence is incomplete, valid bounded records/revisions are retained without interpreting missing outcome versions as withdrawal. Consent/generation, clear watermarks and retention/caps remain live; natural expiry still strips prose/support. Readiness reconciles against the completed source snapshot, removing true edits/withdrawal. Unit and actual-browser reproductions fail before the change and pass afterward; real Dropbox merge and manual Restore preserve supported misses. Source withdrawal and deletion before readiness remain covered. No new persisted queue or backup fields.

**Status:** initial fix shipped v2.98.3; incoming-merge follow-up implemented locally in v2.100.0, awaiting release and installed verification.

---

## BUG-122 — Zone agreement warned as a conflict; remote Past did not fence older Soon

**Report (Can, 2026-10-22):** Dropbox metadata returned HTTP 504; a separate zone anomaly showed both copies in Past with different timestamps. Those messages do not by themselves show a failed upload or a lost task.

**Causes:** the zone logger compared operation timestamps without requiring different destinations, so same-zone reconciliation produced a conflict warning. An adjacent regression fixture found a separate merge defect: Soon exclusion checked only local Past stamps. A newer remote move to Past could therefore retain an older local Soon copy alongside the winning Past entry. This second defect is reproduced with fictional data, not established for Can’s reported task.

**Fix (v2.97.8):** zone warnings require different destinations; existing timestamp/freshness gates remain. Soon exclusion uses the newest Past timestamp from both devices. Newer revives still win, older duplicates are excluded, and same-zone stamps retain the newer entry. Metadata poll behavior is unchanged: a 504 skips that check and the next active tick retries.

**Tests:** `dropbox-test` adds sixteen zone cases (same-zone local/remote wins, contradictory moves in both directions, newer revives, stale operations, echoes, equal-time ties and legacy missing timestamps) and a mocked metadata 504 followed by a healthy check. The old code fails the same-zone cases and retains both zone copies in the remote-Past case. Fixtures use no live credentials or task data.

**Release:** included in v2.97.8 with the nudge/poem fixes. Real-device verification remains open: same-zone sync should stay quiet, and the newer zone move should converge on both devices.

---

## BUG-121 — Yesterday’s splash cooldown suppresses the new day’s poem

**Report:** Can, 2026-10-22 shortly after midnight: repeated restarts showed the default daily nudge and no opening poem; the proper nudge was present by about 00:42. The About observation was under **Noticed**, not **Today**, so this report does not establish BUG-120’s strip/About mismatch.

**Confirmed cause (poem only):** `splash.js` checked a rolling 30-minute `splash_shown_at` cooldown before checking `poem_splash_date`. A 23:55 open therefore skipped the entire splash at 00:02, including the unseen new-day poem. Both dates are local; this is cooldown ordering, not a UTC or 3am day boundary. The nudge does not depend on this cooldown.

**Fix (prepared as v2.97.6, included in v2.97.8):** apply the 30-minute cooldown only when the previous splash was on the same local date. Crossing midnight allows the normal splash and first daily poem; another restart that day still skips within the cooldown. No new timer, storage key, collection or sync change.

**Tests:** desktop and touch browser fixtures at Istanbul 00:02, seeded with yesterday’s 23:55 splash and poem date. The test fails on the old code, then checks populated/visible new-day poem, its dated shown marker, and the next restart’s cooldown. Existing coda/exit timing and reduced-motion behavior remain covered by the release suites.

**Verify after deployment:** open shortly before midnight, restart shortly afterwards, and see the new poem. Keep open until Can accepts real-device or reproduction-equivalent verification.

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

**Dev release checkpoint (October 26):** BUG-126/127/128/129 are included in the approved v2.99.1 dev release; their earlier local implementation/verification notes above are historical checkpoints. Installation and accepted verification remain open.
