# TODAY — Changelog

> Entries older than ~20 application versions → `archive/Changelog-archive.md`

## Keep the next Sunday eligible after one missed weekly sentence (BUG-175) (app v3.13.1)

Can reported that only Today and Noticed appeared on November 22 in installed production v3.12.1. The saved Sunday audit found a retired soon-pullback candidate and a week-shape fallback blocked seven days after its previous reading; production policy bytes match the inspected checkout. A single missed sentence, including an older retained kindVerdicts miss, added a second week to the fallback cooldown. Keep week-shape at seven days after one miss. Preserve two-miss/persisted retirement, same-day suppression, fresh qualified seven-calendar-day evidence, grounding, request/cache/source fences and all other outcome-kind cooldowns. No feedback migration, new source/store, provider request shape, retry or forced generation. Regression checks cover both feedback stores and mounted block delivery/cache reuse; retain before-fix failures. Installed behavior and writing usefulness remain to verify after publication.

## Close BUG-135 after deployed measurements and installed-PWA confirmation (engineering, app v3.13.0 unchanged)

Live dev v3.13.0 / ae401c67 passes the unchanged five-run deployed budgets on a fresh pinned-browser Mac harness and on scheduled Ubuntu run45023287185, whose checkout log confirms the same candidate. Both use the existing deployed CPU1/network profile and complete SW-controlled warm visits. Preserve the earlier failures and fresh reports separately. Can confirmed on November 22 that installed-PWA startup is working fine; BUG-135 is verified and archived, with its fulfilled Backlog reminders removed; no runtime, hosting, cache strategy, provider or budget change. Manual dispatch403 is retained; hosted proof is the existing scheduled run, not an agent-dispatched workflow.

## Fix mobile bottom-edge pixel sample to avoid card-border anti-aliasing (engineering, app v3.13.0 unchanged)

Shift the bottom-edge pixel assertion from x=8..15 to x=0..7. At 390px width
the sidebar's scroll content places a card border at x=15 whose anti-aliased
edge reads as (23,29,30) instead of the background (23,23,26), failing the
exact-color check. The leftmost margin (x=0..7) is always background.

## Stabilise mobile bottom-edge paint assertion in sidebar-test (engineering, app v3.13.0 unchanged)

Stabilise mobile bottom-edge paint assertion: fitViewport uses rAF so layout
updates before paint flushes; add one extra rAF wait inside the viewport-height
loop so the screenshot lands after the compositor paints.

## Add habit-task-editor in-place swap invariant test (engineering, app v3.13.0 unchanged)

habit-task-editor.open() replaces #habitsContent directly without changing
sidebar.active, so isOpen('habits') true does not mean the habits list is
present. Added two new assertions to habits-test: one that documents the
invariant (sidebar stays on habits, #habitList gone, .ht-editor present,
title and habit name correct), and one that verifies back() restores the
full list and exits edit mode.

## Fix daily-task link test after habit-task-editor in-place swap (engineering, app v3.13.0 unchanged)

Habits-test daily-task-link check timed out waiting for `#habitList .habit`
because `habit-task-editor.open()` swaps `#habitsContent` in-place without
changing `sidebar.active`. The old code called `sidebar.open('habits')` which
either closed the panel (toggle, when active was still habits) or re-opened it
(when habit-task-editor had switched active), creating a timing race.

Fixed to check `#habitList .habit` directly and reopen with `{fromDailyTask:true}`
only when the list is gone. `{fromDailyTask:true}` bypasses the toggle guard.
Also restores `habitEditMode=true` directly so `toggleHabitEditMode()` takes the
exit path without needing edit-mode DOM elements that may not exist.

## Fix About-sidebar teardown check in smoke test connections section (engineering, app v3.13.0 unchanged)

Smoke test connections privacy check opened the About sidebar panel via
`Today.use('about').toggleInfo()` but closed it by checking
`infoPanel.classList.contains('open')` — the old API. `infoPanel` never
gets an `open` class now that About is sidebar-based, so the panel stayed
open. On macOS, CSS animations run in headless Chrome, so
`sidebar.close()` was async; `ex-open` remained on the body, hiding
`#addTaskBar` with `pointer-events:none` and causing `page.type()` to
silently fail. CI passed because headless Linux runs no CSS animations,
making close synchronous.

Fixed to `Today.use('sidebar').isOpen('about')` / `close(true)`.

## Replace waitForFunction with RAF wait in daily-link focus test (engineering, app v3.13.0 unchanged)

habits-test: waiting for habitsTitle to change to "Daily task" timed out on CI
because the habit task editor lazy-loads its module. Focus-lock is synchronous
on click; switched to two animation frames which is sufficient and always fast.

## Adaptive habit progression — variety, responsive direction, cumulative deepen (app v3.13.0)

Shipped November 21 (commit 4433f9b4) to origin/dev. Changes to `assets/habit-task-policy.js` and `assets/habit-tasks.js`:

- **`earlier` repetition avoidance** — `FRESH_RULES` now explicitly instructs the AI to use the `earlier` field (past occurrence texts) to avoid verbatim repetition. Previously the field was passed but ignored by the prompt.
- **`practice` threshold** — lowered from 3→1 completion. Variety begins after the first success; waiting for three made rotation nearly invisible in practice.
- **`return` on recent drift** — added condition: `checked >= 1 && recentChecked === 0 && known >= 3`. A week without completion suggests a lower-friction angle even before the sustained-miss threshold (5 known / ≤2 checked) fires.
- **Cumulative `lastStretch`** — `progression()` now tracks the most recent completed stretch-day AI occurrence text as `lastStretch`. The AI is instructed to build on `lastStretch` for `deepen` direction, enabling push-ups to grow 10→11→12 over time rather than always referring back to the original baseline.
- **`baseline` rewritten** — now starts from "a genuinely achievable step toward the note's goal." Reduction habits (note contains quit/stop/reduce) get a bounded constraint on current behavior, not full cessation as the first-day floor.
- **`practice` direction** — now "offer a fresh approach at the same effort level using recentPractice — vary the angle, not the difficulty" (was: consolidate a familiar appropriate action).

Unit test (`scripts/habit-task-policy-unit-test.mjs`) updated for changed thresholds. Browser test (`scripts/habits-test.mjs`) adds click-propagation assertion for `.habit-daily-link`. W3 checkpoint December 1.

## Error indicator click target too small on desktop (app v3.13.0)

On desktop (≥640px) the error indicator button was 12×12px with a 3px transparent border — 18×18px total, below the 24px minimum. Increased border-width from 3px to 6px; total click area is now 24×24px. Visible dot size unchanged.

Root cause: the mobile size (24×24px + 7px border) was fine; the desktop override shrank the border without compensating.

## Adaptive habit progression — variety, responsive direction, cumulative deepen (dev, app v3.12.1+)

November 21 refinements to the fresh daily habit task progression (shipped to origin/dev, commits 4433f9b4, ce800473, 1bb7ab01). Behavior changes from the November 17 implementation: practice threshold lowered from 3→1 completion so variety begins after the first success; a new `return` condition fires when checked≥1 but recentChecked=0 and known≥3 (a week without completion suggests a lower-friction angle before sustained-miss threshold); `deepen` now references `lastStretch` (the most recent completed stretch-day text) so push-ups can grow 10→11→12 cumulatively instead of always returning to the original baseline; `earlier` field now explicitly instructs the AI to avoid verbatim repetition across days; `baseline` starts from a genuinely achievable step and handles reduction habits (bounded constraint on current behavior, not full cessation as the first-day floor). The W3 checkpoint on December 1 evaluates this behavior. Also: `.habit-daily-link` added to the focus.js document click handler exclusion list (bug fix); click-propagation browser test added to `scripts/habits-test.mjs`.

## Master candidate for current v3.12.1 engineering updates (full validation) (engineering, app v3.12.1 unchanged)

Prepare the current dev changes for Can's authorized master promotion: verified-bug records, release-reference handling and opt-in checkout following after publication. App runtime and version remain identical to master. The prior selected dev run does not provide reusable full-release proof for this commit; the release cut requests all functional checks and all five performance runs through `CI-Validation: full`. Promote only the identical successful candidate after exact-commit preflight, preserving the existing publication, proof and permission boundaries.

## BUG-146, 147, 151 and 159 verified on device and archived (engineering, app v3.12.1 unchanged)

Can confirmed on November 19 on the installed app: linked Explore controls no longer crowd task rows (146), desktop Explore docking and controls (147), no offscreen header haze entering Focus (151), and the Connections header layout (159). All four move to the archive with the verification noted.

## Folder sync after publishing is opt-in (engineering, app v3.12.1 unchanged)

The first live run of `syncWorktrees` (v3.12.1 engineering) moved Can's `beirut` workspace as intended, but also four other sessions' Conductor workspaces and eight pinned `.context/` evidence snapshots that happened to be clean and behind. All twelve were restored to their previous commits from their own reflogs the same day (each checked clean). The sync is now opt-in: only checkouts holding an empty `.context/follow-dev` (gitignored) move; `beirut` has it. `release-publish-test` adds a clean, not-opted-in checkout that must stay put. Housekeeping updated.

## Publishing keeps other checkouts (Conductor workspaces) on the published commit (engineering, app v3.12.1 unchanged)

Can's workspace folder was 46 commits behind dev: since November 15 each session works in its own copy and pushes to dev, so nothing moved the folders people look at. After a successful publish, `release:publish` now runs `syncWorktrees`: every other checkout of the repository that is detached, clean (no tracked changes), not mid-merge/rebase, without its own commits (dev already contains its HEAD) and not under the temp directory is fast-forwarded with `git checkout --detach <sha>`. Everything else is listed as left unchanged with the reason; a failure there never fails the publish. `release-publish-test` covers all six cases with real Git. Housekeeping documents it.

## BUG-144 and BUG-154 verified on device and archived (engineering, app v3.12.1 unchanged)

Can confirmed on November 19: Explore opening/controls (144) and mobile panel header/bottom band (154). Both move to the archive with the verification noted.

## Engineering bug fixes keep their release reference; stale verified rows cleared (engineering, app v3.12.1 unchanged)

BUG-172 showed "—" as its reference because `release:cut` wrote "—" for any bug shipped in an engineering-only cut. Fixes in such cuts now record `v<current> (engineering)`; only rejected or open bugs get "—" (`release-cut-test` covers it). BUG-172's archive row now names v3.10.11 (engineering, CI-only fix).

Bugs.md still listed BUG-168 and 170–172 as ✅ after they were archived on November 17; those rows are removed. BUG-167 was marked verified but never archived; it moves to the archive with its detail. Bugs.md now holds only open, awaiting, rejected and merge rows, as its header says.

## BUG-152, 162, 165 and 169 verified on device and archived (engineering, app v3.12.1 unchanged)

Can confirmed on November 19 on the installed app: native window controls keep Today's base theme with a sidebar open (152), the desktop PWA title area with a sidebar (162), the iOS add-task bar above the keyboard (165), and no zoom when renaming a habit on iPhone (169). All four move to the archive, newest first, with the verification noted.

## BUG-118 verified and archived with merged BUG-120 (engineering, app v3.12.1 unchanged)

Can confirmed on November 19 that the morning strip and About show the same line; delivery was already met from the production backup (a line on 31 of 31 days, Oct 19–Nov 18, counts only). BUG-118 and its merged alias BUG-120 move to the archive with the verification noted; the Backlog delivery row is closed.

## Master candidate for v3.12.1 (full validation) (engineering, app v3.12.1 unchanged)

Can asked to promote dev to master on November 19. Dev's latest run was selected-only, so this engineering-only cut carries `CI-Validation: full` (every suite plus the five-run performance gate) for exact-commit proof before `release:publish --master`. Master moves from v3.11.3 to v3.12.1. App code is unchanged by this commit.

## Close overdue morning-line Watching rows from backup counts (engineering, app v3.12.1 unchanged)

Three overdue rows settled from Can's production backup (counts only, no line text): #15A daily nudge quality (landed 8/12 Oct 19–31 → 15/18 Nov 1–18) and #15A length recovery (31/31 lines ≤30 words) are closed; the BUG-118 delivery row records 31/31 days with a line, leaving only strip/About agreement for Can. Remaining overdue rows need Can's own judgement (pool/Sunday novelty, enrichment, booking email, Connections nudge, HOW DAYS FELT, triage countdown, PATTERNS, KNOWN).

## Backlog morning-line row names its shipped version (engineering, app v3.12.1 unchanged)

The #15A one-sentence Watching row said v3.11.4; the change shipped as v3.11.5 (the release tool assigned the number at publish time). Corrected so the 2026-12-02 comparison starts from the right release.

## Backlog #15F rows reflect the November 18 suggestion findings (engineering, app v3.12.1 unchanged)

The v3.11.6 release added a #15F visibility Watching row but left three rows saying suggestions had not been seen. The verdict-loop, sub-item and recovery rows now record the backup counts (50 offers: 29 ignored, mostly hidden under the add bar; 12 dismissed; 1 applied then reversed), BUG-173, and the 2026-12-02 re-judgement.

## Wait for settled Focus layout before comparing feedback geometry (engineering, app v3.12.1 unchanged)

Dev CI 44426188188 passed the enrichment checks but rejected focus-test's exact geometry assertion twice. Local reproduction records loaded fonts and identical x/width/height while y moves during startup/Focus entrance animations. Wait within a bounded three-second predicate for loaded fonts and existing finite layout-affecting motion to finish before and after feedback, excluding the independent progress-fill animation. Keep exact rectangle equality and report both rectangles on failure. Preserve the original failed run and controls; no product CSS, animation timing or geometry tolerance changes. The owning suite and an intentionally shifted feedback-answer control verify that real layout movement still fails.

## Task context recognizes natural lookup wording (app v3.12.1)

15E real-use diagnosis showed zero current tasks admitted by either lookup filter. Add bounded web check/view/track and specific shopping forms, plus Gmail artifact-lookup classification, without another judge call, broader source input or a change to provider/auth/relevance rules. Strip only recognized leading lookup scaffolding before the new Gmail fallback and relevance matching; preserve named evidence. Reconsider an old negative artifact classification once using lookupPolicy, then cache current declines normally. HTTP/response/network/timeout web failures emit content-free console stage/status and remain retryable rather than becoming false no-result cache entries. Tests cover natural eligible/ineligible cases, unchanged mailbox grounding, legacy/current rejection behavior and actual typed capture → source calls → indicators → Focus delivery with fictional responses. Live usefulness/account acceptance remains open.

## Focus offers help only when a suggestion is ready (app v3.12.0)

Can approved one automatic task-only/name-only preparation per deliberate desktop Focus entry. Ask is hidden during preparation, abstention, malformed output and failure; one closed-format question/action can earn the existing button's quiet ready breath. Reveal is cached, not another request, and only then records a shown line/enables feedback. Dismissal consumes the visit; pause/resume, restoration, re-anchor and feedback never generate. Current-source/config/day/wording fences cover pending, ready and revealed states; no retry or second judge call. Whole votes remain transient, optional fixed same-owner wording retains its approved caps, and no prepared prose enters persistence/sync/backup. Owning Focus and wording tests cover availability, abstention, timers, source withdrawal, delayed bodies, deadline, keyboard/reduced motion and exact-answer feedback. Real-model usefulness and installed feel remain acceptance work.

## Post-add suggestions appear where you can see them (BUG-173) (app v3.11.6)

See BUG-173. `assistant.js` gains one visible-band check (below the sticky header, above `#addTaskBar` and a shown `#triageBar`) used for delivery and exposure; geometry is rechecked on scroll, resize and visual-viewport resize as well as intersection changes. A just-added task sitting just below the band is scrolled into view with room for its row; a row that still lands under the bar is lifted by the minimum scroll. New outcome records carry `exposure: 2`; `suggestion-policy` counts an ignore only with it, so the 29 earlier timeouts stop throttling. Explicit dismissals, applies and reversals still count (the split reason keeps its 10 September dismissals).

Tests: `assistant-test` 1b (13 tasks at 390px: suggestion shown above the bar; pushed under the bar it is not "seen"; record marked), the delivery tests now keep tasks genuinely out of view, and `suggestion-policy-unit-test` covers legacy ignores. Both fail on v3.11.5. Docs: AI.md outcome definitions; Backlog #15F visibility row due 2026-12-02.

## platform-test waits for the app document before touching storage (engineering, app v3.11.5 unchanged)

The desktop app-window fixture wrote `localStorage` as soon as the `--app` target appeared; on CI the document could still be committing, so Chrome denied storage ("Access is denied for this document", dev CI 44317846300, passed on retry). It now waits for the real URL and a non-loading document first. Three consecutive local runs pass. App code unchanged.

## Morning line prefers one sentence and adds to a named task instead of restating it (app v3.11.5)

Prompted by Can's reading of HUMAN.md ("the sentence that ends one beat earlier") and checked against Can's actual votes (production backup, counts only; no line or task text read out): of 28 voted morning lines Oct 19–Nov 18, one-sentence lines landed 20 / missed 2 and two-sentence lines 2 / 4. Task mentions were not the problem in themselves (no mention 16 / 3, mention 6 / 3); all three task-mention misses were two-sentence restatements marked `already_knew`.

Both morning writers' system frames change "One or two sentences" to "One sentence, under 30 words; a second only when it adds something the first could not". The task-reading frame adds "If you name a task, say what reading it would not tell them; do not restate it." Principles only, no examples; the 30-word guard, grounding, length recovery and landed/missed steering are unchanged. #15A's open feedback checkpoint is closed with the numbers above; a new Watching row (due 2026-12-02) compares the next two weeks.

The memory-file validator now skips pending `memory/changes/` notes (they are consumed by `release:cut`) while still requiring the README in the File Guide.

## Retry transient release-proof artifact downloads before full-validation fallback (engineering, app v3.11.4 unchanged)

Master run44183475116 repeated full validation after GitHub returned HTTP503 downloading otherwise eligible dev proof. Retry only the selected artifact ZIP acquisition for selected transient server/transport errors, with at most two extra attempts and1/2-second backoff inside the existing30-second total budget. Keep artifact identity fixed, discard failed partial output and log only classification/attempt/delay. Leave source-run eligibility, digest/archive/provenance/SHA/policy/full-inventory/zero-flake/five-performance verification outside recovery; permanent or invalid evidence still refuses reuse. Offline virtual-clock and real-verifier controls cover fast success, both recovery opportunities, exhausted attempts/time, permanent errors, corrupt bytes and failed-test proof. No application/runtime or permissions change.

## Use the shared boot-readiness observer in the meeting fixture (engineering, app v3.11.4 unchanged)

Full dev run 44186586652 passed the scroll suites and performance gate but rejected meeting-test's startup timeout followed by a diagnostic retry pass. Replace its older animation-frame owner-only observer with the existing timer-polled waitForAppReady helper, requiring completed boot and the meeting API/button within the unchanged15-second deadline. Gate the first real startup yield and suspend animation-frame callbacks until readiness succeeds, then restore normal frames before exercising unchanged capability/media assertions. Preserve the original failure: its log lacks boot/visibility diagnostics, so the exact hosted cause cannot be established retroactively. The shared helper adds those diagnostics for future failures. No application/runtime change.

## Limit mobile opening scroll-to-top to Habits (app v3.11.4)

Can corrects the v3.11.3 scope: only the inline Habits sheet needs the viewport returned to its top-opening position. Restrict both immediate and generation-fenced layout resets to mobile Habits; remove the new reset from full-screen/loading panel entry. Remove Explore's new first-visit override and restore its original conversation-follow behavior. Retain Habits' free later reading/current-position close and desktop isolation. Update the platform/real-conversation regressions to require preservation of full-screen panel reading positions, alongside Habits opening/close tests. Installed phone acceptance remains separate.

## Align the inline Habits regression with mobile opening scroll behavior (engineering, app v3.11.3 unchanged)

Verification publication 82d4f942 incorporated the newer v3.11.3 mobile-panel opening behavior during release rebase. Hosted run 44180733130 retained the stale sidebar assertion that inline phone Habits should preserve the pre-open page scroll; it failed twice with 0 instead of 280, while the other functional checks passed. Update that fixture to require opening at the top, unlocked page scrolling, free subsequent reading and preservation of the current position on close. The earlier sidebar controller is rejected by the new opening check (retained negative receipt `.context/fresh-ks5pZ3/receipt.json`); the exact current runtime is restored afterward and passes Sidebar, Connections and invariants first try in27.8s with zero failures/flakes (`.context/fresh-A4p8cl/receipt.json`). No runtime, timeout, tolerance, app version or installed-device acceptance change.

## Verify BUG-168 and BUG-170–172 without device interaction (engineering, app v3.11.3 unchanged)

Verified the reported defects using existing actual-component/provider-contract checks and hosted evidence. Archived the full BUG-168/170/171/172 records with dated, scoped verification and retained historical failures. BUG-172 is confirmed by successful hosted single-worker run 43975777473; BUG-171 by stale-device merge/count/tick-log regressions; BUG-170 by both-provider error categories and browser recovery behavior. Expanded BUG-168's expired-sign-in regression from Gmail alone to Gmail, Dropbox and Calendar. The first six-suite fresh pass and the expanded Connections pass have zero failures/flakes. Physical iOS keyboard/zoom, native titlebar paint, live Gmail relevance and writing/usefulness verdicts remain open. No app runtime, account, permissions or app version change.

## Start mobile panels at the top when they open (app v3.11.3)

Can clarifies this is mobile-only: opening a panel should return both viewport and panel content to the beginning. Reset phone panel scroll, including inline Habits, after mounting and once after layout, fenced against close/replacement/desktop transitions; preserve later reading and close behavior. Start mobile Explore's first loaded conversation at the beginning rather than following existing content to its end; preserve subsequent reply-follow and navigation-return behavior. Add long-list/mounted-scroll, real repeated About/Habits/Memory opening and asynchronous real-conversation regressions, with shipped-runtime negative controls. Native iOS acceptance remains open.

## Guard title-area blend edges and actual sidebar panels; require installed visual acceptance (app v3.11.3)

Extend platform-test with horizontal/vertical rendered blend scans that reject sharp side/bottom boundaries even when top-area samples pass. Preserve deliberately broken hard-edge screenshots and recovery assertions. Mount actual About, Habits, Memory and Explore panels on first/repeated opens at both-ended Mac overlay geometry, checking continuity, clearance, soft edges and real close controls. Add the installed candidate/version/origin checklist covering cold/warm native frame, resizing, long-list scrolling, Focus and overlay fallback, explicitly separate from CI. The available production PWA has an active paused Focus session; installed dev-candidate acceptance remains pending and the live session was untouched. No application/runtime change.

## Give the synthetic desktop WCO fixture explicit desktop input capabilities (engineering, app v3.11.2 unchanged)

Full Linux run 44021829209 rejected the new Focus step: headless Chromium reports hover:none, so the application correctly skips desktop Focus registration. Give only the synthetic WCO geometry fixture hover/fine-pointer predicates and assert them before clicking; keep real standalone renderer predicates, mobile fixtures, production behavior and all existing assertions/deadlines unchanged. Preserve the failed hosted evidence separately from installed native-frame acceptance.

## Restore the integrated desktop PWA title area (BUG-162) (app v3.11.2)

Restore the WCO sidebar to the top edge with internal native clearance, and retain the existing desktop glass header. Blend only the occupied native-control regions into the pane using titlebar environment geometry and the existing base colour, without mutating theme metadata or reintroducing its origin-label trigger. Preserve the opaque title underlay against scrolling text, dragging, narrow-layout header treatment, Focus and sidebar input. Correct the platform fixture's obsolete below-titlebar/opaque-header assertions; add both-ended Mac control geometry, pane/control paint checks, old-gap/missing-blend controls, bounded glass transmission and actual WCO-layout Focus/close actions. Installed native-control composition remains separate acceptance.

## Guard desktop standalone header paint in a real app window (engineering, app v3.11.1 unchanged)

Extend platform-test with an isolated Chromium app window using actual standalone media predicates and desktop input, without rewriting matchMedia/CSS, installing a PWA or touching the user's browser profile. Exercise real Focus entry/exit, wide/compact desktop resizing, long-list sticky positioning and the actual About sidebar. Compare rendered viewport pixels over contrasting fictional backdrops as well as computed glass/blur/visibility. The exact old opaque override and a separate opaque underlay must both eliminate transmission; the latter preserves correct computed header styles, proving the need for pixel coverage. Keep existing WCO opacity/title pixel protection and ordinary browser/mobile tests unchanged. This is test-only coverage; native OS frame composition, Safari Add to Dock and installed appearance remain device acceptance, not automated claims.

## Restore glass on the standalone desktop header (app v3.11.1)

Adopt the other session's one-line removal of the desktop standalone sticky-header opacity/backdrop override. Preserve document growth and pinned long-list geometry, the WCO opaque header/title underlay and its pixel-leak contract, and ordinary browser/mobile behavior. Extend the existing platform fixture to assert computed glass/blur for desktop browser and non-WCO standalone; the original CSS fails that assertion before the change. Platform, focus and invariant checks validate the scoped fix. Native installed appearance remains separate from emulated checks.

## Bound fresh habit suggestions to gentle practice and occasional depth (app v3.11.0)

Can approved gradual depth without earning more work. A pure same-habit14-day policy selects baseline, consolidation, occasional small depth or familiar return, with no lifetime streak/level. Source-bound AI-written occurrences and effective habit checks support the policy; unknown/legacy/current/future days do not. Additive occurrence basis preserves exact setup/name support through normal backup/merge, without invented historical action completion. The fresh writer permits useful repetition, anchors effort to the saved routine and treats maintenance as steady; no varied-set progression. Source/config/history/AI/day/explicit-choice guards reject stale replies, with a12-second deadline and fallback on failure/overlong prose. Unit/browser checks cover evidence, spacing, misses, undo, rename, setup, key, detach and habit-day races, plus malformed/nontext/overlong replies and the actual timeout abort callback. Research, Claude critique and all six fictional paired outputs are retained with limitations; the weak learning pair is not an efficacy claim. No new UI, telemetry, provider/routing change or extra daily review call. Real-use relevance and effort acceptance remain open.

## Shift+D tidies finished tasks into Past (app v3.10.13)

Follow-up to v3.10.12, at Can's request: Shift+D returns on desktop, but moves finished tasks to Past exactly as evening triage does (zone `past`, status `done`, `zoneChangedAt` now) instead of deleting them. Their ids stay done and checked today, so the top bar and the tick log agree; nothing is tombstoned, so Past can revive them. It is ignored during Focus (the list never moves under a focused task), announces the result to screen readers, and backs up like other zone moves (`dropboxBackup(true)`).

`zones.moveDoneToPast()` owns the move; `accessibility.js` binds the key outside text fields. `task-actions-test` 10c presses the real key and requires agreement plus Past, not deleted. Test-matrix 1.12 restored with the new behaviour.

## Remove the Shift+D "clear done" shortcut (app v3.10.12)

Shift+D (`_clearAllDone`, since v1.6.39) deleted done tasks from TODAY. That made the top bar drop work the tick log still counted as done today (probe: top bar 1, tick log 2), unlike evening triage and midnight rollover, which move done tasks to PAST. Can chose removal over changing it to move to PAST. Nothing in the UI offered it.

Removed: the key handler (`accessibility.js`), `_clearAllDone` and its global (`task-actions.js`), its contract shim and task-actions test, and Test-matrix rows 1.12 / 9.1. The global compatibility cap drops from 122 to 121. `task-actions-test` 10c ("top bar matches the tick log") now covers every way done tasks leave the list.

## Share local and deployed performance version parsing (engineering, app v3.10.11 unchanged)

The November 16 deployed-performance run [43869978255](https://github.com/fixingman/TODAY/actions/runs/43869978255) stopped before measurement: its deployed parser accepted only single/curly quotes, while release:cut now writes double-quoted CHANGELOG keys. The live dev response is HTTP 200 and has the expected v3.10.11 key. Both local payload evidence and deployed preflight now use one parser accepting matching straight single/double quotes. Missing/mismatched versions, curly/mismatched quotes and non-OK HTTP responses remain failures. The performance harness covers both accepted formats and these negative controls. Budgets, profile and iteration count are unchanged; this repair does not establish a deployed performance pass or close BUG-135.

## Test that the top bar and the tick log agree on "done today" (engineering, app v3.10.11 unchanged)

BUG-171 slipped through partly because the app has two definitions of "done today": the top bar (`updateStats`) and the tick-log count About, the weekly graph and triage use (`_doneTodayCount`), each tested alone. `task-actions-test` 10c now requires the two to match after checking, unchecking, evening triage to PAST and a sync from a device that has not rolled over. On its own it fails on v3.10.9 (before the BUG-171 fixes).

Known remaining difference, not asserted: Shift+D (`_clearAllDone`) deletes done tasks, so the top bar drops them while the tick log still counts them (probe: top bar 1, tick log 2). Raised with Can as a product question.

## Handle single-artifact downloads in the CI result combiner (BUG-172) (engineering, app v3.10.11 unchanged)

The documentation-only README publication reached dev at 90ae004e, but its final gate failed in run 43774360676 after both functional checks passed. The single matched functional artifact was downloaded directly into `.context/ci-shards`, even with `merge-multiple: false`; the combiner searched only subdirectories and reported a missing shard. Normalize the flat layout only for a canonical one-worker plan, retaining nested transport and every existing suite/provenance/input/environment/first-attempt-log check. Reject incomplete flat evidence, mixed flat/nested artifacts and flat evidence for multiple workers. The real plan/worker/transport/merge fixture now reproduces two-suite selected runs alongside the existing 36-suite multiworker case; it failed before the correction and passes afterward. No workflow permissions, validation requirements, runtime app code or app version changed.

## Update README development and reflection experiment guidance (engineering, app v3.10.11 unchanged)

Linked the offline commitment-episode experiment from the Development section without presenting it as a shipped app capability. Replaced stale module/test counts with the canonical inventory, documented workspace setup and scoped fresh checks, corrected browser setup, and replaced manual release-metadata edits with the change-note/cut/publish workflow. No runtime or app version change.

## Implement an offline commitment-episode reflection experiment (engineering, app v3.10.11 unchanged)

Implemented `scripts/reflection-episode-experiment.mjs`: a read-only local analysis of existing opt-in thirty-day reflections and task outcomes. It excludes ambiguous linkage/order and unknown endings, separates resolution types, deduplicates shared dates, compares start/resolution/baseline feeling frequencies and removes each contributing date to test sensitivity. Aggregate stdout omits private text, identifiers, reasons and per-episode dates; there are no network/model calls, state changes or report files. Screening remains exploratory with source/feedback/usefulness review required; it does not certify statistical significance or personal writing. Registered fictional linkage, sensitivity, source-boundary and CLI-privacy tests in CI and documented the command. The raw feeling-history UI proposal remains rejected. No shipping code, retention or permissions changed.

## release:cut --full marks a master candidate for full CI (engineering, app v3.10.11 unchanged)

Can asked to push v3.10.11 to master. Its dev run was a selected run, so `release:preflight` found no full proof, and `release:dispatch` returns 403 for agent credentials (as recorded in the CI contract). The documented route is a dev commit carrying `CI-Validation: full`; `release:cut --full` now adds that trailer to the cut commit, so the normal dev push runs every suite plus the five-run performance gate and `release:publish --master` can promote the same SHA. Housekeeping's publish step names it; `release-cut-test` covers the trailer and unknown-option refusal.

## Sync no longer brings back earlier days' done marks (BUG-171, source fix) (app v3.10.11)

Follow-up to v3.10.10's display fix. `mergeRemoteData` now removes from the merged done set any id whose task is in PAST (and not in TODAY) unless it was checked today, matching what `applyNewDayCleanup` does when it graduates tasks. Earlier days' ids had lost their check history at rollover, so the no-history union fallback let a device that had not rolled over restore them. Today's evening-triaged tasks keep their done state (checked today); Trello and other ids are untouched. `dropbox-test` 9b fails on v3.10.10 and passes now; sync-merge, day-lifecycle, triage, task-actions, Trello, habits, habit-tasks, zones and timezone suites pass. Sync.md's done-ID rule records the change.

## The "x of y done" count only includes today's tasks (BUG-171) (app v3.10.10)

See BUG-171. `updateStats` counts PAST tasks only when they were checked today (`today_checked_ids`), which keeps evening-triaged work in the count and drops earlier days' done tasks. `task-actions-test` 10b fails on v3.10.9 (21 of 22) and passes now (1 of 2).

## The ✦ "fresh each day" mark matches the varied-set icon in size and alignment (app v3.10.9)

Can: the ✦ next to a habit with "daily task · fresh each day" looked misaligned and faint. Measured at 3× in the real list: the ✦ was a text glyph at 12px (7.2×12 box, about half the visual weight of the 14×14 list-in SVG), sat on the text baseline 1.5px below the name's centre, and the set icon sat 1.5px above it.

Both marks are now drawn 14px SVG icons in `currentColor` (`--muted`); the mark box is one line tall (`1lh`, `vertical-align: top`), so both centre on the name's first line (within 1px). The same drawn ✦ replaces the glyph in the edit-mode link and the setup cards. `habit-tasks-test` checks both marks for size and centring; it fails on v3.10.6. The phone-width edit-row check from v3.10.6 now waits until the panel has moved into its phone host before measuring (it flaked once locally).

## Explain Explore reply failures and the action needed before retry (BUG-170) (app v3.10.8)

Normal chat failures previously discarded their specific reason, displaying a generic retry beside an unrelated earlier-reading context warning. Keep a fixed, page-held failure reason for the unanswered turn and show one actionable alert. The exploration-only proxy contract distinguishes explicit insufficient credit, billing, known spend/daily limits, credentials and ambiguous rate/usage limits; a token-capped response remains separate. Fixed copy keeps raw provider details out of UI/journal. Account problems offer AI connection and retry when ready; no immediate automatic retry or invented reset time. Explicit retry preserves the single original observation. Source withholding, saved history, data scope, providers/models/routing, request deadline and output budget are unchanged. Offline handler/browser coverage includes negative classification controls, explicit recovery, raw-data canaries, Connections navigation and existing late-response/withdrawal fences.

## Preserve the habit edit height requirement across fractional translations (app v3.10.8)

Dev run43730735458 failed only the phone edit-field height assertion, then passed its diagnostic retry. A native 44px field translated by a fractional CSS pixel reproducibly reports a 43.999996px DOMRect. Require the actual layout height to remain at least 44px and permit only 0.001px coordinate rounding in the visual rectangle. Browser controls reproduce rejection by the original strict comparison and verify the repaired predicate still rejects a real 43px field. No input size, application logic, timeout, retry or performance limit changes.

## Completed habits quietly recede for today (app v3.10.7)

Apply the existing 25% completed-task opacity token only to completed-for-today habit names and checkboxes, on desktop and mobile. Keep the checked accent fill and checkmark. History dots, strength, row position and layout retain their existing treatment; no strikethrough. Edit inputs keep the recently shipped habit-edit styling. Uses the existing done-today class, so checking, unchecking, re-rendering and the existing 3am rollover share the same visual state without changing data or sync.

## Habit edit mode uses the app's field and link styles (BUG-169) (app v3.10.6)

Can found edit mode "terrible" and off-token. Investigation (desktop 1200px and phone 390px, real component):

- The name field was a 19px-tall outline hugging the text (`padding: 0 4px`, transparent, `--radius-md`, `box-sizing: content-box`), unlike every other field (44px, `--surface`, `--radius-lg`). Long names were clipped mid-word.
- On phones its font stayed 13.5px: a later base rule overrode the shared ≤600px 16px rule, so iOS zoomed on focus (Rule 5c; filed as BUG-169).
- Archive was a bare "×" glyph, 32×18px (under the 24px minimum target), with no accessible name beyond its title, in the strength slot.
- History dots and the strength ring stayed visible beside the field; on phones they squeezed it to ~175px. The hidden checkbox column left an empty indent.
- The daily-task link wrapped and centred on phones (button default `text-align`).

Now each row is a full-width 44px field matching `.habit-input`, then one row of quiet links (`daily task …` at the start, `archive` at the end, danger colour on hover/focus, `aria-label="Archive <habit>"`, 32px targets). Check, history and strength are hidden while editing and come back on Done; exiting now just saves names and lets `renderHabits()` rebuild. `habits-test` asserts the new contract at 1200px, a 360px sidebar and 390px (field height, full width, 16px phone text, hidden extras, actions below, targets, names) and fails on v3.10.4.

## Focus re-entry check asserts its real invariant at both scroll geometries (engineering, app v3.10.5 unchanged)

`focus-test`'s "An older exit cannot expose the new Focus header" failed intermittently (dev CI 43720860303, first attempt; every local run on Chrome 156). Probe: after Escape the restored scroll leaves the header fully above the viewport at 1280px (logo bottom −149px) but only 24px above it at 1024px with Explore docked (logo bottom +47px). In the second geometry the logo is legitimately visible before re-entry, so the old assertion (logo off screen or unpainted) could never hold; whether a run hit it depended on the restored scroll.

The check now records the logo before re-entry. Off screen: it must stay off screen or unpainted (the original condition, unchanged). Visible: it must not move (BUG-151's no-movement rule). Three consecutive local runs pass; app code is unchanged.

## Explore names why it cannot open, and opens by itself when you're back online (app v3.10.5)

Before, every failure to read the exploration said "Connect Dropbox or come back online to open your exploration." with a reload button, and nothing happened when the connection returned.

`exploration-files.js` now separates `offline` (the device reports offline; no request is made) and `not-connected` (no Dropbox grant) from `unavailable` (online, but Dropbox did not answer). Explore shows, in order: "You're offline. Your exploration is safe in Dropbox and opens when you're back." with no button; "Connect Dropbox to open your exploration." with **connect Dropbox** (opens Connections inside Explore; also used for an expired sign-in); "Dropbox didn't respond. Nothing was changed; try again." with **reload latest**. Sending and asking while offline say so too ("You're offline. Your text stays here; send it when you're back." / "…ask again when you're back.").

An `online` listener re-reads the document only while Explore is open and its last open failed for being offline. A failed reply is never retried automatically: that is an AI call the person chooses to make.

`exploration-test` covers the three openings, no request while offline, and a single read on reconnect; on v3.10.4 it times out waiting for the offline wording.

## Explore's Connections button carries the sign-in nudge (BUG-168) (app v3.10.5)

`_syncConnectionsNudge` now also sets `btn-icon-attention`, the WAAPI pulse and an explicit label ("Connections, a sign-in needs you") on Explore's `#exConnections`; Explore calls it after every header render. `_mountConfigPanel` marks `connections_nudge_seen_<day>` like the header path does. CSS keeps the accent colour under reduced motion. `connections-test` covers both; it fails on v3.10.4 at "the plug in Explore carries the nudge".

## Observe suite startup without depending on animation frames (engineering, app v3.10.4 unchanged)

Assistant, About, Explore and Sidebar still used frame-polled startup waits; the earlier Dropbox repair already demonstrated that a ready background device tab can stop notifying that observer. The five suites now share a timer-polled successful-boot prerequisite, including the interactive seal before component access. Each caller keeps its original total deadline and owner predicate; Sidebar mounting shares its existing 10-second budget. Common failure diagnostics identify the fixture, visibility, boot/seal state and errors. A held real MessageChannel startup and suspended driver frame observer prove the old wait misses completion while the repaired waits see readiness. Held startup and a missing owner still fail. Existing mobile Enter, viewport, painting and two-device sync assertions remain. No application, sync, splash, performance policy or retry behavior changes.

## Block the injected Netlify badge script with a deployment-scoped policy (app v3.10.4)

Add a script-element allowlist to the existing security header during Netlify's configuration preparation. Only this deployment's canonical, branch and immutable origins may load external scripts from /assets/; existing inline startup, service-worker, connection and other policy directives remain unchanged. Netlify documents that headers are read after the build command. Missing or invalid deployment URLs fail the deploy instead of broadening script access. The existing poem Edge Function preserves the returned headers. No new browser script, DOM-hiding loop, data collection or proxy is introduced. This blocks the current external HUD script, not arbitrary future inline injection by the host.

Verify the actual badge locally, then cover the generated header and build contexts, origin validation, permissive negative control, blocked requests/execution, app startup/capture/lazy panels, poem header preservation and offline PWA reload with deterministic fixtures. Verify actual dev and production headers and badge absence after deployment. Safari/PWA visual acceptance remains distinct from Chromium checks. Timing and payload limits stay unchanged.

## Releases are cut from notes; one worktree per session; dev runs no longer cancel each other (engineering, app v3.10.3 unchanged)

**Why (Can, November 15):** parallel sessions shared one checkout and all edited the same lines on every release (top of the About CHANGELOG, `sw.js`, the top of this file, the Bugs.md table and the next bug number). On November 14 that produced two v3.10.2s, BUG-162/163/166 each claimed twice, curly quotes from a hand-resolved conflict that stopped the app from starting, and a session stuck mid-rebase in the shared checkout. Ten days of dev CI: 33 passed, 36 failed, 9 cancelled.

**Release notes.** Sessions now describe a change in `memory/changes/<topic>.md` (format in its README) and new bugs in their own note, referred to as `BUG-{slug}`. `npm run release:cut --prefix scripts` (new `scripts/release-cut.mjs`) fetches dev, drops the session's own stale cut, rebases, then writes the version (largest `bump`), the three About CHANGELOG entries in double quotes, `sw.js`, the technical changelog sections and Bugs.md rows/details with the next free numbers, deletes the notes and commits with a `Release-Cut:` trailer. If another session publishes first, git refuses the stale push and the next `release:cut` re-cuts on current dev. `release-cut-test` covers note validation, version/bug numbering, the written files and a real two-session race against a bare origin.

**One worktree per session.** Rules 30/33 and Housekeeping now require each session to work in its own worktree; `release:publish` accepts a detached HEAD there (only one worktree can hold `dev`), and `.gitignore` also ignores a symlinked `scripts/node_modules`, which the publisher otherwise refuses as untracked work. Its fresh check reuses the pinned test browser cached in any worktree of the repository instead of requiring each new worktree to hold its own copy.

**CI.** Each dev push gets its own concurrency group and is never cancelled; only superseded PR runs are. `ci-plan` metadata, `smoke-test`, `performance-test`, `task-bounce-test` and `reflections-test` read CHANGELOG keys in straight single or double quotes only: the previous patterns accepted curly quotes as valid keys, which is how the November 14 syntax error passed smoke, and the November 14 double-quote switch had broken the planner's metadata parser, the payload check and two static-wiring checks that only read single quotes.

**Flaky `pool-wording-test` (first flake fixed at its cause).** Before its contrast scan the test waited for animations inside `#infoPanel`, an empty placeholder since About moved into the shared sidebar (v3.7.0), so the wait passed at once and axe sometimes measured the panel mid-fade (4.39:1 against 4.5:1; CI 42653402306 and twice locally on November 14). A control shows the old wait reporting done while `#sidebarRoot` is still `entering`; the test now waits for the sidebar sheet and the Sunday block to finish. Its `sunday()` helper also read the placeholder to decide whether to open About, so it always toggled and would have closed an already-open About; it now asks the sidebar. Three consecutive local runs pass 53/53.

## Documentation housekeeping (November 10, application unchanged)

Keep the newest20 distinct application versions across prose and release rows; move older material intact to the archive, preserving evidence and relative links. Refresh the canonical hosted receipt and point current-status notes at it. Keep deployed/installed startup follow-up and overdue product reviews open. DEV_HOURS uses Can’s confirmed estimate rather than an automatic per-release increment; the requested501h display remains a separate, unpublished app change.

## iOS keyboard positioning and explore button hide (app v3.10.2)

**BUG-165:** The add-task input bar stayed behind the iOS software keyboard in standalone PWA mode because `visualViewport.resize` is suppressed on iOS 18 when the keyboard opens. The 100ms `setTimeout` fallback ran before `vv.height` had changed. Fix: added a RAF polling loop on `input.focus` that detects the `vv.height` drop and calls `positionBar()` immediately when the keyboard opens.

**BUG-162:** The sidebar's `.ex-sheet` element bled its surface color into the WCO titlebar area on desktop PWA because it had no `top` override in the WCO media query. Fix: added `.ex-sheet { top: var(--window-titlebar-height); }` inside `@media (display-mode: window-controls-overlay)`.

**Release number:** committed as v3.9.2 with curly quotes in `CHANGELOG`, which broke the app on dev; renumbered v3.10.2 (it followed v3.10.1) and quotes restored.

**Explore button hidden:** `#explorationEntry` (the ✦ Explore button in the task list) is now hidden via `display: none` CSS. The exploration panel remains accessible from other entry points.

---

## Poem stays consistent across midnight (app v3.10.1)

BUG-163: an open About panel refreshes its poem at the day change. BUG-164: the splash coda records the day its poem was chosen for, so a coda fading in after midnight no longer suppresses the next morning's poem. Tests: `about-test` #21, `splash-test` midnight-crossing coda.

## Habit focus survives list re-render (app v3.10.3)

**BUG-167:** `renderHabits()` did `list.innerHTML = ''` to rebuild the habit list, which destroyed the focused `.habit` row and the `timerEl`/`kbdHint` inserted after it. Triggered by Dropbox sync, completing another habit, completing the focused habit's daily task, or crossing 3am. Fix: rescue `timerEl` and `kbdHint` to `document.body` before the wipe; after the rebuild, `_focusReanchorHabit(newRow)` updates `uiTaskEl`, re-adds `.focused`, reinserts the timer elements, and re-applies `_setFocusInert` on the new siblings.

---

## Habit daily tasks that change (app v3.10.0)

Can's audit of v3.9.0: the daily task repeated the same wording because AI only drafted a fixed list at setup, the setup screen ignored tokens and hierarchy, and nothing in the list showed which habits had a task. Prototyped in `output/habit-daily/`; Can approved both modes per habit with mode-specific marks.

**Two modes per habit.** *Fresh each day* (✦): the coordinator asks the connected AI once per habit per day per device for today's task, sending only the habit name, the user's note and up to 14 earlier task texts; the fallback task shows until it lands and stays if offline/unconnected. *A varied set, rotated* (list-in icon): up to 14 tasks prepared by AI (or added by hand); `choose()` skips recently used ids so the whole set rotates before repeating; the set refreshes weekly while removed wording is kept in `avoid` and excluded. No weekday scheduling in the UI (Can).

**List and edit.** A monochrome mark after the habit name (`aria-label` names the mode). Edit mode keeps rename · daily task · archive; the daily-task button becomes a quiet link naming the mode.

**Setup screen.** Rebuilt on tokens: switch row, mode cards (native radios), note, set chips with remove/add, three-day preview, sticky cancel/save. The per-action days/keywords/minutes fields and the "change today's action" select are gone; existing Calendar flags are preserved but no longer editable.

**Tests:** policy unit (14-cap, mode defaults, rotation, AI-written merge preference); browser suite pins the page clock to its fixture day (it failed on dev once the real date passed 2026-11-10) and adds marks, fresh AI writing (request carries habit/note/earlier only) and set prepare/remove/add.

---


## Update pulse and focus sidebar lock (app v3.9.1)

**BUG-161:** The CURRENT badge breath and ℹ-button pulse on new-version install stopped working in v3.7.0 when About was migrated to a lazy sidebar mount. `breatheVersionBadge()` queried `#changelogPanel .version-badge` before `_renderChangelog()` had injected it, so the IntersectionObserver was never attached. Fix: capture the `btn-icon-version` flag before removing it, run `_renderChangelog()` first, then call `breatheVersionBadge()` after the badge is in the DOM.

**BUG-160:** Focus mode left the sidebar (`#sidebarRoot`) interactive — its date/section headers were unblurred, items remained clickable, and the scroll container was scrollable. Root cause: `_setFocusInert` only marked `sticky-header` and `triageBar` when focusing a main-app task; `#sidebarRoot` is a sibling of `#main-app` at the DOM root and was never reached. The `.focusing` class was also not applied to `#sidebarRoot`. Fixes: include `sidebarRoot` in the initial inert list; add/remove `.focusing` on `#sidebarRoot` symmetrically with `#sbContent`.

---

## Habit daily tasks — opt-in (app v3.9.0, uncommitted)

Per-habit opt-in adds a task to Today each day; checking either the task or the habit marks both done. Action wording can vary by day of week, Calendar event title, or explicit rotation. Configuration, occurrences and completion state travel in the normal private Dropbox backup under `habit_tasks_v1`.

**New files (lazy-loaded):** `assets/habit-task-policy.js` (config sanitization, merge, deterministic action selection), `assets/habit-tasks.js` (coordinator: task generation, completion bridge, occurrence state machine), `assets/habit-task-editor.js` (editor form with optional AI suggestion). None are eager-loaded; `today_habit_tasks_v1` presence triggers the import chain. All three are precached for offline use.

**Modified files:** `assets/habits.js` (Daily task button in edit mode, lazy import chain, two-way completion hook, archive reconciliation), `assets/task-actions.js` (task completion bridge, dismissal on delete, occurrence restoration on undo), `assets/day-lifecycle.js` (generated tasks protected from midnight done-task graduation), `assets/dropbox.js` (export/merge/readiness for new field), `assets/calendar.js` (`habitSnapshot()` for title-aware selection), `assets/triage.js` (occurrence bridge, Soon detachment, Undo ordering), `assets/connections.js` (age calculation for generated tasks), `assets/focus.js` (generated tasks recognized as list members), `assets/insights.js` (age recognition for `habit_task_` prefix), `assets/runtime.js` (`Today.has(name)` guard), `index.html` and `sw.js` (lazy references, precache, v3.9.0 version bump), `assets/sidebar.css` (habit editor CSS and connections panel CSS moved from inline `<style>` to stay within payload budget).

**Key behaviors:** 3am renewal boundary (matches existing habit rollover). Midnight task cleanup protects still-current occurrences. Deletion dismisses the occurrence; Undo restores it. Archive expires the occurrence; Undo-archive restores it. Moving to Soon detaches the task. Triage Undo restores check logs before calling the completion bridge. Sync merge is commutative and idempotent: automatic choices first-write-wins; explicit edits LWW; explicit beats automatic.

**Tests:** `scripts/habit-task-policy-unit-test.mjs` (11 unit assertions: key/taskId, config sanitization, clean, merge modes, choose determinism/keywords), `scripts/habit-tasks-test.mjs` (12 browser assertions: lazy load, task generation, check/uncheck bridging, delete/undo, disable, archive/undo, editor entry and layout at desktop/mobile, static wiring). Both registered in `scripts/ci-policy.mjs` under the `habit-tasks` group.

## Critical HTML icon extraction (app v3.8.14)

The v3.8.13 full functional gate passed, but one cold first paint measured7,004ms against7,000ms; retain run42717829906 and its original evidence. Remove the34,098-character inline Apple touch icon from the HTML ahead of the app scripts. Serve the identical25557-byte PNG as a separately cached asset; no artwork, splash choreography, font or timing-budget change. Regression coverage pins the original image digest, external link, offline precache and absence of large embedded images. This reduces the critical HTML transfer rather than accepting a retry or raising the first-paint limit. All five local measured runs pass (cold FCP worst6,748ms); six focused fresh-checkout checks pass without failures/flakes. Hosted verification still needs this exact fix commit.

## Explore conversation typography (app v3.8.13)

Apply the reviewed speaker split: user messages keep DM Mono13.5/300 with1.85 leading and−0.02em tracking; TODAY reply text uses Bricolage Grotesque14/300 with1.75 leading, natural tracking and24px turn separation. Controls, metadata, source pages and composer remain unchanged. Self-host the original22,232-byte Latin font instance at optical size14/weight300, load it through the existing lazy Explore stylesheet and precache for offline use. The font asset allowance grows from100KiB to116KiB to accommodate this explicitly chosen new face (actual combined fonts115,648 bytes); runtime/timing/eager-script limits remain unchanged. No AI/data changes.

## Dropbox fixture readiness (engineering; application unchanged)

Investigate dev42714056520 at63ead175: `dropbox-test` times out in `openPage` while opening the second isolated device, then passes on diagnostic retry; the strict gate correctly rejects it. A controlled real startup yield reproduces a missing nudge-component lookup while Dropbox exports already exist; the poller can time out even though boot and memory become ready. Guard only that expected registration gap, poll this model predicate independently of animation frames, and retain the original15-second deadline. Add a held-boot/suspended-observer regression plus boot/visibility/readiness/page-error diagnostics on failure. No sync/merge/backup implementation, timing limits or retry policy changes. Original hosted logs and controls: `.context/ci-63ead175/`. The full corrected Dropbox suite passes against isolated63ead175, including real two-device convergence. Both controls reject the broken paths while boot/memory are actually ready. Receipt: `.context/ci-63ead175/repair-receipt.json`; ongoing habit/task work stays out.

## Sources hierarchy and controls (app v3.8.12)

Prioritise Next reply and group notes/last-reply evidence as Reference. Carry the same wording-first typography, quiet date/provenance, native chevrons,44px controls and labelled policy disclosures through every child page. Show inclusion state alongside editable context; keep recorded reply sources read-only, paginate twelve at a time, and use visible/total counts plus consistent empty states. Short records no longer repeat their text or expose an expansion control with no additional content. Preserve eligibility, consent, AI input, full wording, source retirement and private storage. Returning from Privacy reveals its disclosure and restores the visible opener. Explicit reduced-motion summary/icon guards remove a transient default-colour outline caused by the global duration override.

Four final owning/design/component/invariant checks pass without failures/flakes; surrounding smoke checks also pass. Actual-component coverage includes four-width axe/containment, native Tab/Enter and accent focus, expanded/saved content, a25-reference reply displayed12/24/25, withdrawal fences and zero AI/document writes on browsing. Prior failed assertions, the reduced-motion correction, source hashes and fictional-data captures are retained in `.context/sources-refinement/receipt.json`; final subpage proof is `.context/sources-refinement/final/.context/fresh-lEajq4/receipt.json`. Dev publication authorised; hosted validation must use this candidate.

## Original cold-response delivery evidence (engineering, app v3.8.11 unchanged)

Investigate the retained1.708s live cold first byte: most of the wait occurs after the request starts, before HTML arrives; no app script or service worker is active. Preserve bounded public HTTP/browser comparisons without substituting them for the failure. Capture allowlisted delivery/cache headers, Netlify request ID and numeric CDP phases from each original measured navigation, rather than relying on a later trace replay. No new requests in the benchmark, response-cookie/URL capture, runtime/header/hosting change, threshold adjustment or app/SW bump. The real-browser fixture deliberately delays an HTML response1100ms and must still reject it under1000ms while retaining its original metadata; private headers and query values are excluded. Netlify-side logs are unavailable, so exact CDN/origin attribution remains unverified. Four targeted/invariant checks pass first try with no flakes in `.context/cold-start-nov9/verification/.context/fresh-wHNwow/receipt.json`. Findings and evidence are indexed by `.context/cold-start-nov9/receipt.json`. No runtime/hosting fix is claimed. Dev publication is authorised; the new candidate needs its own hosted checks.

## Assistant fixture boundaries (engineering, app v3.8.11)

Before this release, concurrent dev42644240308 at988f5921 failed strict CI because assistant-test timed out at its startup API wait, then passed diagnostic retry. Preserve the original first/retry logs in `.context/release-nov9/concurrent-failure/`. This fixture shared default-context localStorage and workers across scenarios and considered the component API sufficient before successful boot. Give each ordinary scenario an owned browser context, close that context with its page, and require the successful interactive mark and completed boot seal inside the existing15-second wait. A real overlapping-page control demonstrates the old shared-context seed clears the earlier scenario’s storage, while the owned default preserves it. This establishes the fixture boundary, not a definitive cause for every original timeout; add labelled boot/error diagnostics to future startup failures. Runtime, budgets and retries stay unchanged. Targeted validation is recorded with this publication’s receipt; exact-candidate full CI remains mandatory.

## Installed warm startup and runner rebalancing (app v3.8.11)

Use all64 measured first-pass suite times from successful dev42614802326 for the existing five-worker scheduler: projected groups121.8–122.4s versus104–137s measured previously. Coverage, runner count, proof and retry rules stay intact. Serve declared public app-shell files from the exact active version cache before network, including canonical root/index aliases; never cache private/API/unknown responses or rewrite an installed version from a later network miss. Fresh tabs and manual refreshes keep the coherent active version until the existing last-window update activation. Benchmark warm preparation now requires a controlling active worker and complete installed shell, reports preparation separately, and preserves original numeric navigation phases. All budgets, profiles, five runs and input/cold assertions remain unchanged. The prior October measurement-only record is preserved with the newly authorised November9 scope appended. Eight targeted/invariant checks pass first try with no flakes (`.context/ci-followup-nov9/validation/final/.context/fresh-6vrSEV/receipt.json`). The isolated final five-run4×CPU source benchmark passes unchanged limits (worst warmFCP148ms, interactive119.6ms); an earlier five-run1×CPU slow-origin comparison with350ms HTML delay passes with warmFCP76ms and interactive37.5ms (separately labelled diagnostic, with overlapping functional checks). Preserve the intermediate tooling fixture failure: shell parsing initially ran in payload-only mode against its deliberately empty worker; parsing now occurs strictly for timed-load measurement. Complete source hashes, original deployed failure, controls and measurements live in `.context/ci-followup-nov9/implementation.json`. Publication authorised; hosted/deployed verification must use the exact release candidate.

## Explore source navigation (app v3.8.11)

Replace the dense Sources page with Next reply / Your notes / Last reply destinations. Show compact source previews with native full-text disclosures, six recent notes per page, and a separate searchable twelve-record picker. Keep exact last-reading provenance distinct from upcoming selection, use the sidebar’s shared controls/tokens, and restore parent scroll/focus. No source eligibility, consent, persistence or AI behavior changes. The first local run exposed an old fixture assumption: the first displayed note was always supporting the previous reading. With newest-first ordering, the driver now explicitly withdraws/re-includes an actual supporting observation. Preserve that failed run in `.context/fresh-D9MqK4/`. Explore, design lint, component contract, smoke and invariants pass without flakes in `.context/fresh-InUWuh/receipt.json`; the final control-before-long-text refinement passes Explore/design/invariants in `.context/fresh-EEpdZI/receipt.json`. Dense fictional-data screenshots and four-width axe/containment checks pass. No hosted/installed acceptance claim. Publication authorised; exact-candidate hosted verification remains required.

## Release fixture boundaries (engineering, app v3.8.10 unchanged)

Release42613038866 stopped before master: sidebar paint sampled an in-progress phone `fadeIn` because its old name filter included only `fadeInPlain`; the nudge reconnect scenario contained audit events from earlier scenarios; one cold LCP sample was10548ms against10500ms (median10096ms, separate diagnostic replay10084ms). Preserve every failed report and trace under `.context/habits-compact-proposal/failed-ci/`. Make sidebar paint wait for actual finite motion and hold a real entrance halfway to prove sampling cannot proceed early. Give each default nudge scenario its own browser context and close that owned context with its page; explicit two-device contexts retain their existing ownership. An overlapping-page storage regression rejects the old shared-context control (`firstRetained:false`). No application code, wait deadlines, timing limits, browser/network/CPU profile, retry acceptance or collection changes. New exact-candidate full release proof remains required; the original performance failure remains failed evidence.

## Compact Habits and mobile inline panel (app v3.8.10)

Implement the approved native previews: header plus/pencil/checkmark controls, desktop strength above the latest ring and full-width fitted history with6px title/history separation; compact phone rows put title, recent dots and trailing strength on one line. Restore seven visible recent days at≤480px (up to21 at481–600px), with wrapped names and nonoverlapping checkbox hit areas. Only inline phone Habits uses an upward collapse chevron; all other chevrons remain unchanged. Move only mobile Habits back below TODAY in its original rounded normal-flow host. The shared controller reparents its single root, preserving drafts while crossing600px, and keeps the other phone panels modal/full-screen. Retain names/order/strength,3am rollover, sync/persistence and real-history limits. Full description accompanies the compact evening countdown; no new nav row. Extend actual-component tests for geometry, nine-row desktop capacity,320px header/wrapping, keyboard/adding/editing, host lifecycle, breakpoint drafts and the unchanged other-panel paint/viewport contracts. Decoded-shell allowance increases4KiB (1240064→1244160) for this added layout/lifecycle; compressed, font, script-count and all timing limits stay unchanged. Isolated/installed phone acceptance remains distinct from local Chromium proof. Unrelated Focus edits in this checkout belong to the other agent. Verification and retained failures: `.context/habits-compact-proposal/implementation-receipt.json`. Habits/sidebar/platform/component/smoke/design pass in `.context/fresh-ukBSHa`; the completed-task fade remains an accepted exception outside the new panel’s scoped axe audit. The added test waits for triage’s actual hidden state before clicking the next control. Accessibility passes in `.context/fresh-wM8tt6`, and the other agent’s latest Focus revision passes its owning suite in `.context/fresh-NiIl9C`; each final run includes passing invariants. The subsequent compact phone-row/up-chevron revision passes five affected checks first try in31.1s (`.context/fresh-zydzpc/receipt.json`), with desktop geometry and other-panel directions retained. No installed-device or release-proof claim.

## Browser fixture readiness during publication (engineering, app v3.8.9 unchanged)

The first five-worker run42594905333 passed62 checks first try and2 on diagnostic retry; the strict gate failed and the new publisher stopped before master. Preserve its reports under `.context/publish-command/ci-42594905333/`. Sidebar opened after a mobile/touch emulation reload while Habits was registered but init had not cached `$.configPanel`. The shared fixture now waits for the successful interactive mark and completed boot seal inside the original total10-second bound. A controlled real startup yield reproduces the old uncached-DOM failure and verifies the helper before/after mobile-mode reload. Explore's phone Enter check raced media-query composer replacement; wait for the existing font/layout frames after the viewport change, assert native typing/Enter reaches the replacement, retain pending/completed keyboard-focus assertions, and preserve key/composer diagnostics. No runtime, deadline, budget or retry acceptance change. Earlier owning checks pass locally; the authorised new candidate needs complete hosted proof. Receipt: `.context/publish-command/ci-repair-receipt.json`.

## One-command publication and measured five-worker scheduling (engineering, app v3.8.9 unchanged)

Add `release:publish` for a reviewed, committed, clean dev candidate: existing fresh validation, ordinary dev push, quiet exact-SHA CI watch, and—only with an authorised `--master` option—existing full proof/preflight, normal master promotion and master CI. Preserve explicit commit review, full-trigger semantics, source/ref/remote guards and stopped-run receipts; never dispatch/retry CI, amend or force. Offline publication fixtures simulate every remote write and exercise refusal/race/resume/lock paths. Increase the sharding maximum from three to five, replacing approximate weights with all measured suite durations from the successful first parallel release42530842799. Coverage increases only by the new publisher suite; performance budgets/profiles, deadlines and proof contracts are unchanged. Target about 110 seconds per functional worker and around three minutes overall; hosted speed remains unverified. Evidence: `.context/publish-command/receipt.json`. No app/SW version bump. Dev/master publication authorised; exact-candidate hosted proof is required before promotion.

## Parallel hosted CI (engineering, app v3.8.9)

Measure the actual bottleneck: dev42528361401 took555.1 seconds for sequential functional checks, versus seconds for setup. Run the unchanged selected/full inventory across up to three balanced, isolated Ubuntu jobs, overlap the unchanged five-run performance gate on a separate runner, and check payload before setup. Keep the final `test` check and exact-candidate proof reuse on master. Verify and retain every shard's original report/logs; reject incomplete, duplicate, failed/flaky, changed-input/environment and mismatched-SHA/run-attempt evidence. Synthetic actual-CLI transport and existing proof/final-gate fixtures cover refusal paths. Let the workspace launcher deduplicate the identical Node pin across jobs, and classify the reviewed isolated habit mock so fresh checks do not need an ad hoc exclusion. Evidence: `.context/ci-optimization/receipt.json`; hosted activation and speed await the authorized full dev run. Publish with the desktop habit change as v3.8.9; master requires exact-candidate proof.

## Desktop habit layout (app v3.8.9)

Finish the approved option 2+4 prototype: checkbox/name above a title-aligned full-width fading history trail, with strength at its end and 10px title/history separation. Fit additional existing days to the current sidebar width, stop at the earliest valid stored creation/completion date, and keep short histories compact. Observe the actual lazily mounted habit list and disconnect on unmount; retain edit drafts during resize. Preserve phone layout, habit-day rollover, ordering, strength and persistence. Update the completion summary and strength tooltip in the existing surgical check path, and contain desktop edit inputs. Reclaim redundant comments to retain the existing decoded payload budget. Regression coverage and screenshots use the actual component; verification evidence stays under `.context/habits-layout-options/`. Nine surrounding checks and the final expanded habit suite pass locally without failures/flakes. Dev/master publication authorized; require complete hosted proof before promotion.

## Connections action cleanup (app v3.8.8)

Dev42516176175 at12411c75 passes62/63 functional checks and fails only the component contract: the v3.8.6 Dropbox Save removal left `click:connections.dropbox-backup` registered without owned markup. Remove that obsolete registration, preserving the contract, automatic backup, Restore/Forget and all other connection behavior. The earlier v3.8.6 run42515783010 exceeded decoded payload by108 bytes; v3.8.7 already passes that gate. An isolated original-source control reproduces the orphan action, and the one-line cleanup passes five selected/invariant checks without failures/flakes in9.7s (`.context/mobile-panel-row-removal/ci-cleanup-validation/receipt.json`). Pending Habits edits are excluded. Release-metadata candidate verification is recorded under `.context/ci-connections-cleanup/`; hosted CI remains separate.

## Panel icon row removed (app v3.8.7)

The v3.8.3 entry recorded removing the section-icon row under phone panel titles, but the code change stayed uncommitted, so dev kept the row (Can, November 8). This ships it: `renderPanelNav` and its `.sb-panel-*` styles are removed; panels are reached from the Today header. `sidebar-test` asserts no icon row at every width.

## Quieter Connections controls (app v3.8.6)

Can, November 8: Dropbox's manual Save is removed (sync saves on every change; Restore and Forget stay). The default AI is a state, not an action: the chosen provider shows a read-only accent `default` label in the row-status token, and the other offers `make default`. The Your name card uses the connection-row card, title and status tokens, and its chips use the neutral reason-chip tokens (border, `--radius-sm`, 32px) instead of an accent fill. On phones, connected rows still show only Forget.

## Lighter connections icon (app v3.8.5)

Explore's connections button used a link icon drawn on a 14-unit grid but shown at 20px, so its 1.5 stroke rendered about 2.1px, heavier than the hide chevron and mic. Can chose a plug (November 8), now drawn on the 20-unit grid at the shared 1.5px stroke.

## Readable chat history (app v3.8.4)

Earlier-visit AI replies that can no longer be supported (because the data they depended on has changed) previously showed a verbose "withheld" notice in every slot. They now render as the actual reply text at reduced opacity (`ex-turn-stale`, 38% opacity, non-interactive), so the shape of the conversation stays intact and both sides remain visible. The "Now" divider between prior visits and the current conversation is restyled as a chat-style horizontal rule with flanking lines, matching the visual language of every major chat app. No data changes — purely a rendering fix for `earlierHTML()` in `exploration.js`.

## Phone panel nav removed (app v3.8.3)

Phone panels no longer show a redundant row of section-nav icons at the bottom. The `.sb-panel-nav` / `.sb-panel-btn` styles and `renderPanelNav()` call were removed; `followPointer()` replaces the previous `hoverPane` initialization, and the `focusin` handler skips elements with `tabindex="-1"` to prevent spurious pane switches on programmatic focus.

## Connections inside Explore (app v3.8.0)

Connections settings and service management (Trello, Dropbox, Gmail, Calendar, AI keys) are now accessible from within Explore via a dedicated Connections view, reached by the link icon (⚡) in the Explore nav. When you open the Connections view, the existing `#configPanel` node is teleported into Explore's scroll area and given the `.open` class so all existing render functions (`renderConnections()`, `_aiRenderConfig()`, `loadTrelloBoards()`) continue to work without change. On leave/hide/go, the panel is restored to its original DOM position. The standalone `#trelloBtn` already opened Explore (since v3.7.0); the floating config panel trigger (`toggleConfig`) is no longer exposed in the top bar — connections live exclusively under Explore from here.

## November 8 CI repair (engineering, app v3.7.11)

Dev42474274958 and deployed-performance42475191526 fail only the decoded-shell limit:1240065 bytes against1240064. The deployed five-run timings pass. Reclaim557 bytes of redundant shell comments instead of raising payload/timing limits; preserve the phone diagnosis and behavior. Earlier dev42471710091 has60 passes and three diagnostic-retry flakes: Reflection mounts Memory before init fills `$`; Explore's phone fixture sends Enter while the captured focus is its heading; and the worker fixture can reopen a controlled client before last-window activation. Wait for successful startup, reuse the explicit input-focus Send helper, and observe the waiting worker's activated state from an out-of-scope blank page before reopening. Preserve all functional assertions, deadlines, baselines and failure evidence. Controlled pre-init delay, heading focus and delayed last-client closure compare old/repaired drivers. Targeted checks pass four suites without flakes; final combined checks, controls and publication status live in `.context/latest-ci-repair/receipt.json`. Hosted validation of the eventual committed candidate remains separate. The pending Explore output allowance has its own application entry below.

## Application releases

| Version | Key change |
|---|---|
| **3.8.10** | **Compact Habits; inline on phones.** Put New/Edit beside Hide, desktop strength above full-width history; compact phone rows place strength after recent dots and collapse upward. Restore only phone Habits below TODAY, with normal page scrolling and single-owner lifecycle; desktop and other panels retain their shells. Nine affected local checks pass with zero flakes; installed iPhone acceptance pending; dev/master publication authorised and exact-candidate release proof required. |
| **3.8.9** | **Desktop habit history.** Finish the approved hybrid at the existing panel width: full-width names, title-aligned fading dots fitted to stored history, trailing strength and 10px separation. Preserve mobile, edit/focus/reorder,3am and persistence contracts; cover mounted-panel geometry and lifecycle in the habit suite. Includes parallel CI scheduling with unchanged coverage/proof gates. Dev/master publication authorized; hosted verification pending. |
| **3.8.8** | **Connections action cleanup.** Remove the unreachable Dropbox Save registration after the control was removed; retain the component reachability guard and automatic backup/Restore/Forget. Preserve original hosted failures and isolated before/five-pass proof. Dev publication authorized; unrelated Habits work stays local. |
| **3.8.2** | **Phone header order and page backing (BUG-154 follow-up).** Put the protected title/close row before mobile navigation in actual DOM order, including Explore/Connections redraws; hide navigation until a loading header exists. Paint both narrow coarse-pointer page backings in the sidebar surface only while open, restoring Today on close without native theme changes or an invented screen-height viewport. Correct cold Explore panel selection toggling itself closed; save task-list scroll before open-panel clipping resets it. Reclaim redundant sidebar comments to retain the existing payload ceiling. Preserve keyboard fitting, privacy/data, modal focus, drafts and desktop behavior. Actual phone evidence is812px viewport versus874px screen,62px safe inset,61px header offset and zero scroll; screenshots share a186px band. Extend safe-inset geometry, backing, keyboard, redraw, close and scroll regression coverage. The isolated staged candidate passes12 suites without failures/flakes in103.1s (`.context/mobile-sidebar-investigation/staged-validation/receipt.json`), excluding the other session’s unfinished changes. Preserve earlier combined proof, controls and failed narrow-desktop run. Dev publication authorized; physical installed-PWA background fill remains unverified. |
| **3.8.1** | **Connections sidebar consistency (BUG-159).** Use a native44px link/Hide action group with Hide rightmost; keep one Connections title and place the quiet SVG return below the header. Apply existing type, border and spacing tokens; wrap service details/actions to the sidebar's width, avoiding mobile flex-basis height gaps. Preserve the mounted settings node during source/viewport redraws and correct its accessibility state. Return/close restores the original node, opener focus and unsent exploration draft. Actual-component regression checks connected and disconnected/key-entry states, offline status, five widths, header/control geometry, form lifetime, axe and no AI calls. Claude reviewed the actual component/proposal; fictional before/after captures and original failures remain in `.context/connections-ui/`. Remove an unused Earlier icon and reclaim redundant eager-shell comments without raising the payload limit. The fixture waits for a visible, non-inert writable composer after pane activation before typing. No connection/auth, source, journal/schema or provider-policy change. |
| **3.7.12** | **Wide-screen pane swap is the same on every panel.** Hover chooses the active input (task bar over the list, the panel's own input over the panel), but the swap was skipped whenever any text field had focus — so after clicking into the empty Habits field or Explore's reply, moving back over the list never restored the task bar. Now only daily capture's caret, or a panel field with text in it, holds the pane; an empty panel field does not. |
| **3.7.11** | **Explore output allowance (BUG-158).** Can reports the explicit provider-cutoff error on Suggest something. Give the exact Explore surface2048 output tokens on both existing providers rather than the512-token short-helper cap for its combined reply, summary, question, evidence and six-field experiment. Preserve one call per explicit turn, no automatic retries,25-second deadline, disabled thinking, models/routing, input/field/source/acknowledgement fences and content-free cutoff failure. Ordinary helpers/daily policy stay unchanged; client overrides remain ignored. Both-provider handler fixtures reject the old allowance and verify complete results, exact markers, fixed ceiling and existing capped-result rejection. Offline checks do not establish live latency or writing usefulness. Local evidence: `.context/explore-output-budget/`. |
| **3.7.10** | **Phone sheet offset, second pass.** v3.7.8 did not fix Can's iPhone: the sheet still sat ~62pt low (header low, unpainted bottom band) — an offset equal to the status-bar inset, with the sheet a direct child of body and no desktop titlebar rule active. Likely iOS home-screen behaviour drawing fixed layers offset by the page scroll: the page is now locked at the top while a sheet is open on phones (body fixed at −scrollY, restored on close). **Temporary diagnostic:** tapping a sheet title shows sheet/head/viewport/scroll/safe-area numbers; remove once the phone result is confirmed. |
| **3.7.9** | **Earlier folds into Chat (Can, November 8).** The Earlier tab (a landing with one 'saved conversation' button) is removed. Earlier visits render above the current one in Chat, last 24 turns with 'show earlier' growing the window (scroll position kept), separated by quiet date dividers and a 'Now' divider. Old replies follow the current rule: shown while still supported, otherwise one 'withheld' line; your words always stay. The separate saved-conversation page and its 'read saved conversation' link are gone; the raw document stays readable via Document → read Markdown. No extra Dropbox read or AI context. |
| **3.7.8** | **Phone sheet fills the screen and holds still.** `fitViewport` pinned the sheet's top/height to the visual viewport at all times; iOS leaves a pan offset after the keyboard closes, so the sheet slid ~60pt down (low header, unpainted band at the bottom) and jumped on every focus/blur. Now it follows the visual viewport only while the keyboard is up (height < innerHeight − 120), otherwise is pinned to all four edges, resets the leftover pan on keyboard close, and locks root scroll while open. Verified with a driven visualViewport: open, leftover pan, keyboard and close all give correct bounds. |
