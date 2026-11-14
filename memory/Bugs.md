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
| 166 | 🚫 Rejected | After an overnight resume from the background, the morning shows no splash poem until the app fully restarts. | — |
| 165 | ⏳ Verify | Add-task input stays behind the keyboard on iOS PWA standalone — bar not repositioned when vv.resize is suppressed. | v3.10.2 |
| 162 | ⏳ Verify | Sidebar bleeds surface color into the WCO titlebar area on desktop PWA. | v3.10.0 |
| 159 | ⏳ Verify | Connections displaces Hide, repeats its title and crowds the Explore sidebar. | v3.8.1 |
| 158 | ⏳ Verify | Suggest something reports a provider token cutoff. | v3.7.11 |
| 154 | ⏳ Verify | Mobile panels have a low header and dark bottom band; prior desktop/sidebar continuity repairs remain recorded below. | v3.8.2 phone follow-up |
| 152 | ⏳ Verify | Native window controls turn gray only while a sidebar is open; retain Today’s dark base theme. | v3.7.6 |
| 151 | ⏳ Verify | Offscreen TODAY can flash as moving haze when entering Focus on a long list, with or without Explore. | v3.6.1 follow-up |
| 147 | ⏳ Verify | Desktop Explore covers Today, dismisses unexpectedly, and exposes competing inputs and chat controls. | v3.4.2 |
| 146 | ⏳ Verify | Linked Explore controls crowd daily/focus task rows. | v3.4.2 |
| 145 | ⏳ Verify | Living note hides unchanged interpretations when source records leave display windows, and puts a generic status under “A possibility”. | v3.5.0 |
| 144 | ⏳ Verify | Exploration opens late, flashes content and exposes unclear or redundant controls. | v3.3.0 |
| 135 | 🔍 Open | Startup blocking and cold/warm load exceed performance limits. | v2.106.0 |
| 120 | ↪ Merged | Daily-nudge delivery follow-up; tracked with the strip/About mismatch. | BUG-118 |
| 118 | ⏳ Verify | Daily nudge can be missing or disagree between the task list and About. | v2.97.8 |
| 117 | ⏳ Verify | Gmail context includes automated booking and calendar notifications. | v2.93.20 |
| 107 | 🚫 Rejected | iPhone header buttons have a raised halo. | — |
| 105 | ⏳ Verify | Gmail context misses explicit email tasks. | v2.92.5 |
| 091 | ⏳ Verify | Gmail searches for a person when the task names a topic. | v2.82.3 |

---

*BUG-001–087 (all), verified BUG-088–119, 121–134, 136–143, 148–150, 153, 155–157, 160, 161, 163, 164 → `archive/Bugs-archive.md` (summary rows + detail). Below: open, awaiting-verification, rejected, and merge pointers only.*

---

## BUG-166 — No splash poem after an overnight resume

**Status:** 🚫 Rejected by Can, 2026-11-14. The day's poem is in About and the empty-list echo, and the splash shows it on the day's first full restart; that is enough.

**Report (November 14):** Found while investigating BUG-164. If the phone keeps TODAY in memory overnight, coming back after midnight runs the new-day rollover but not the splash, so the poem coda waits until the app is next started from scratch.

---

## BUG-165 — Add-task input stays behind keyboard on iOS PWA

**Report (November 14):** On iOS in standalone PWA mode, focusing the add-task input bar does not reposition it above the software keyboard. The bar remains at its default bottom position, hidden behind the keyboard.

**Root cause:** `visualViewport.resize` is suppressed in iOS 18 standalone PWA mode when the software keyboard opens. The only fallback was `setTimeout(positionBar, 100)`, but at 100ms `vv.height` has not changed yet, so `positionBar()` runs against the pre-keyboard viewport height and places the bar at the bottom of the layout viewport rather than above the keyboard.

**Fix (platform.js):** Added a RAF polling loop that starts on `input.focus` and detects when `vv.height` actually decreases (keyboard open). When the height changes, `positionBar()` is called immediately. The poll runs at ~60fps for up to 1500ms and self-cancels once `keyboard-open` is removed (blur). `resetBar()` also cancels the polling RAF.

---

## BUG-162 — Sidebar bleeds surface color into WCO titlebar

**Report (November 14):** In desktop PWA with Window Controls Overlay active, the sidebar's `.ex-sheet` element starts at `top: 0`, causing it to bleed its surface background color up into the WCO-controlled titlebar area, creating a color mismatch with the native OS titlebar chrome.

**Root cause:** `.ex-sheet` had no `top` override in the WCO media query. The WCO titlebar height is exposed via `--window-titlebar-height`, but `.ex-sheet` did not consume it, so its background started at the top of the screen rather than below the titlebar.

**Fix (index.html):** Added `.ex-sheet { top: var(--window-titlebar-height); }` inside the existing `@media (display-mode: window-controls-overlay)` block so the sidebar pane is pinned below the native titlebar.

---

## BUG-159 — Connections header and embedded layout

**Report (November 8):** Can supplied desktop screenshots showing the link icon pushing Hide toward the centre, a duplicate Connections title and an inconsistent return control. Connected service controls must fit the sidebar with the app's existing tokens.

**v3.8.1:** group link/Hide as44px native header controls, with Hide rightmost and page navigation on its own row. Keep one Connections title, move the token-sized SVG return below the header, and scope the legacy title suppression to the embedded panel. Reflow service/status/actions within the actual sidebar width, preserve mobile-safe input type and use native typography/border/spacing roles. Keep the live config DOM node through context/viewport redraws, expose it accessibly while mounted, and restore/hide it on return, panel switch or close. Drafts and focus return to the exact opener; settings navigation makes no AI request. Claude reviewed the actual component, tokens and proposed correction; actual-component phone/desktop captures are inspected separately. The original implementation fails the standard Hide-inset assertion. Evidence and final verification: `.context/connections-ui/`. Parallel pointer-ownership and historical-reading changes remain separate.

---

## BUG-158 — Explore suggestion hits the short-helper output cap

**Report (November 8):** Can sees “The AI answer was cut short. You can ask again.” after requesting Something to try. This specific notice maps to provider token-cap metadata; no personal journal, provider key or raw answer was inspected.

**v3.7.11:** Explore's reply, cumulative summary, question, evidence IDs and six experiment fields shared the ordinary512-token ceiling. Give the exact Explore surface a fixed2048-token maximum on both existing providers. Preserve one request per explicit click, disabled thinking, model/routing,25-second deadline, field/input bounds, source fences and content-free rejection of capped results; no automatic retry or partial write. Other surfaces keep their limits. Both-provider offline checks fail the old512 request policy and verify the fixed ceiling, override refusal, intact six-field results, one call and retained cutoff rejection. Evidence and local verification live in `.context/explore-output-budget/`; live completion, latency and usefulness remain to verify.

---

## BUG-154 — Desktop header and sidebar continuity

**Installed feedback (November 8):** Can confirms the phone panel now paints the full background after the v3.8.2 repair. This accepts the background-fill part of this report. Can rejects the extra section-icon row; its removal is shipped to dev in v3.8.7. Keep unrelated desktop/header acceptance separate; do not describe the physical phone background fill as still unverified.

**Phone follow-up (v3.8.2):** Can confirms v3.7.8/3.7.10 did not correct the installed appearance. All four screenshots have the same186px/62pt bottom band. The supplied readout is `sheet 0–812 · head 61 · inner 812 · vv 812@0 · scroll 0 · safe 62 · screen 874 · lock 0`: the sheet fills its reported viewport, with no current/pre-lock scroll; the61px navigation row precedes the safe-area-padded header. Reorder the actual DOM so the protected header/close row leads and navigation follows, rebuilding that placement after Explore/Connections redraws. Paint both narrow coarse-pointer page backings with the panel surface while open, restoring original inline backgrounds on close and preserving native theme metadata. This treats the backing; it does not claim another62px of usable viewport. Keep keyboard fitting, modal focus and drafts. Capture task-list scroll before the open-panel overflow rule resets it; a controlled280→0 class toggle reproduces the prior lost return position. Correct the cold Explore panel-navigation entry so it enters rather than toggles itself shut; retain the normal repeated-header toggle.

**Verification scope:** the new native-safe-inset Chromium fixture rejects the old61px header offset and separately requires both document backing colours, DOM/visual ordering, redraws, native panel selection, keyboard dimensions, close restoration and desktop isolation. It cannot reproduce the physical iOS strip. Local evidence and Can's actual readout remain under `.context/mobile-sidebar-investigation/`; installed full-screen/keyboard acceptance remains required. Earlier combined validation passed12 suites (`.context/fresh-7YEOkO/receipt.json`). The isolated staged publication candidate also passes12 suites without failures/flakes in103.1s (`.context/mobile-sidebar-investigation/staged-validation/receipt.json`), excluding the other session’s pending changes. Preserve the initial narrow-desktop failure and its verified coarse-pointer scope correction. Dev publication authorized; installed phone acceptance remains required.

**Reported November 8:** transparent native-title area exposes scrolling tasks. Explore refocuses instead of toggling closed, cursor motion can hide the active composer, and changing from another panel replays shell entry. Can also requests a pinned desktop-PWA header and sidebar dimming during Focus, and reports a mobile bottom-edge paint gap.

**Repair (v3.7.3):** paint an opaque `--bg` title backdrop behind Today while retaining the continuous soft sidebar above it. Desktop standalone and window-controls-overlay documents grow to their content height so the full sticky header stays pinned; ordinary tabs and mobile standalone keep their existing scroll behavior. The mobile surface stays opaque and covers the layout viewport behind a composer fitted to the visual viewport. Explore closes on a repeated entrance click. Pointer movement activates only on a real pane crossing, leaves an editing caret alone, and explicit clicks/keyboard focus still choose a pane. Switching panels cancels obsolete shell motion, replaces content within the same root, and cancels an abandoned lazy import. Focus dims every desktop peer panel through the existing recede token; the active habit/timer inside Habits remains legible.

**Coverage gap:** the old platform fixture asserted transparent dragging and geometry without checking scrolled paint. Sidebar checks sampled settled panels, and the Explore fixture explicitly expected hover to park a focused composer; those checks encoded incomplete or superseded behavior. New checks exercise scrolling pixels, desktop-installed versus browser/mobile sticky bounds, cold/warm transitions and repeated toggles, caret ownership, Focus across all four panels and reduced motion. Final local checks pass nine affected suites without failures/flakes in51.6s, plus the final header-paint/invariant check in6.3s. Deliberate shipped-runtime, missing-title-backdrop and missing-mobile-backing controls are rejected. Native Chromium-owned controls remain a separate installed acceptance check. Local receipts and deliberate broken controls stay under `.context/sidebar-polish/`.

---

## BUG-152 — Desktop window controls sit on a mismatched background

**Origin-label correction (November8):** Can notes the hostname did not appear this way before and is exposed during sidebar actions soon after launch. Browser ownership alone does not establish that the app is uninvolved: Chromium’s [ThemeColorChange browser test](https://chromium.googlesource.com/chromium/src/+/005c6a2094b83a0c665fbcca0d3b40e1d6e45f57/chrome/browser/ui/views/web_apps/frame_toolbar/web_app_frame_toolbar_browsertest.cc#3199) requires origin text to reappear, and [SetColors](https://github.com/chromium/chromium/blob/main/chrome/browser/ui/views/web_apps/frame_toolbar/web_app_toolbar_button_container.cc#L313) passes color_changed as show_text. Our removed sidebar hook changed exactly that metadata. An actual cold/warm native-button fixture captures repeated base/surface mutations with the original hook and zero with local v3.7.6, without document replacement (`.context/native-title-theme/origin-control.log`, `.context/fresh-PO6mUh/receipt.json`; three suites pass in24.4s). This removes an app-controlled retrigger; it does not claim suppression of Chromium’s ordinary launch indicator or directly observed installed paint. The earlier blanket platform-only diagnosis was too strong.

**November 8 follow-up (v3.7.6):** Can confirms the gray top-left native patch appears only with a sidebar open. The platform hook still switches global theme-color from Today’s dark base to the softer sidebar surface. Remove that sidebar-dependent override; retain the manifest/meta base color through opening, switching, closing and overlay-mode changes. Preserve the opaque scrolling backdrop, sticky desktop header, continuous soft sidebar and native drag/control clearance. The updated existing geometry fixture rejects the original code specifically at controlsMatchToday; before log retained under `.context/native-title-theme/`. Native desktop/browser access is unavailable in this session, so installed Chromium paint still needs confirmation. This supersedes the pane-colored native-theme portion of the November7 contract below.

**November 7 correction (v3.6.1):** Can rejects the dark strip introduced in v3.5.6 and carried into v3.5.7–8. Its fixture asserted that strip and could not catch the design regression. Restore Explore to the top edge, place native clearance inside the header, and match native overlay theme colour to the pane while open/closing. Restore the original colour when closed or when Chromium exits overlay mode. No icon replacement or claim of native transparency. The corrected regression fails shipped v3.5.8 for both pane top and control/pane colour; retain `.context/window-overlay-correction/before.log`. Nine fresh suites pass with zero failures/flakes in62.1s (`.context/fresh-p9J3cr/receipt.json`). Installed icon paint remains acceptance work; the isolated installation attempt did not yield a stable PWA window.

**Report (November 7):** after enabling Chromium’s title-bar chevron in v3.5.2, the browser-owned controls form a dark rectangle over Explore’s softer surface. Screenshot: `.context/attachments/qYalXB/Screenshot 2026-11-07 at 11.42.41 AM.png`.

**Local v3.5.6:** keep one continuous `--bg` window-control strip, matching the existing manifest/meta theme colour. Start Explore below the native title-bar height and let it fill the remaining height, including narrow desktop windows. Retain ordinary header padding, softer panel/composer, native drag bounds and header/Focus clearance. Tabs and mobile retain their existing layout. No theme/provider/sync/storage change.

**Verification:** the old layout fails the new pane-below-strip assertion with the existing native geometry fixture. Preserve before evidence in `.context/window-strip/`. Test left/right controls, compact/narrow desktop windows, zero-height overlay and ordinary-tab fallback; screenshots emulate native geometry and cannot establish browser-owned control paint. Fresh check retains five first-attempt passes (platform, visual, design, smoke and invariants) and one Explore failure in21.2s (`.context/fresh-pnzufE/receipt.json`). The same pending-reply focus assertion fails at the same line on unchanged v3.5.5 (`fb95fb13`), without the title-bar patch; preserve `.context/window-strip/control.log`. No failed assertion was weakened. Owning runtime/test hashes still match. Installed browser control paint remains to be checked; this was the pre-publication local receipt.

**CI completion:** the strip layout is already present in the published v3.5.7 shell. Full Linux42367097472 passes61 suites and fails the obsolete pane-at-zero assertion; this follow-up commits the missing geometry regression and owning documentation. Native browser control paint remains manual acceptance.

---

## BUG-151 — Focus entrance moves or reveals the header

**November 7 offscreen-paint follow-up (v3.6.1):** Can still sees the offscreen logo as moving haze on long lists, with Explore both open and closed. On120 fictional tasks, geometry and a CPU4 screencast keep the logo offscreen; this does not reproduce the full installed rendering flash. The older test only compared rectangles and allowed offscreen chrome to enter the blur surface. Add paint eligibility assertions: exclude fully offscreen header groups before pinning; a wholly offscreen header creates no filter/transition layer. Keep visible/partially visible chrome on its existing fade/blur sequence. Restore normal visibility after exit animations, with the existing generation fence protecting rapid re-entry. Preserve scroll/anchor geometry, a11y for visible chrome, motion tokens and limits. The old runtime fails the offscreen-paint guard at42 tasks; include120-task and rapid-reentry cases with/without Explore. Final fresh combined check passes ten suites without failures/flakes in71.3s (`.context/fresh-AVMk3j/receipt.json`). Evidence `.context/focus-offscreen/`. Installed confirmation remains open.

**November 7 CI driver follow-up:** distinguish native pre-click preparation from Focus motion, and the app’s legitimate anchor correction from failed scroll restoration. Repair the fixture input boundary and verify visible task restoration without changing tolerances/deadlines. CPU4 and deliberately broken-runtime controls are recorded in Changelog and `.context/explore-ci-repair/`. This changes no runtime or installed acceptance verdict.

**Report (November 6):** entering desktop Focus makes the logo/chrome appear to move rather than blur; exit does not show the same noticed effect. Can clarified that a long list and a task toward the bottom make it worse, briefly showing TODAY; Explore can also be open.

**Two reproduced causes:** (1) Focus switches the sticky header to fixed positioning for scroll lock (BUG-098). Beside Explore, `width:100%` then resolves against the whole viewport. At1280px it gains419.33px and logo/navigation move209.67px in the first29ms. The same short-list control with Explore closed records zero drift. (2) On a42-task scrolled list without Explore, the header was already partially scrolled out (`top:-77.80px`, logo bottom:-5.80px). Focus forces `top:0`, moving it77.80px and bringing the logo back into view before dimming. The long-list before-control still fails after the width-only repair. Original traces/failures: `.context/focus-header-motion/before.log`, `before-closed.json`, `before-docked.json`, `scrolled-before.log`, `before-scrolled.json`.

**Local v3.5.1:** capture the header’s actual viewport top before pinning and clear that owned inline top on unlock. Keep its available Today width when Explore is docked. Preserve scroll lock, flow-space padding, task adjustment, blur/opacity sequence, timer and restored document scrolling. No background/lifecycle/sync change. Shorten stale shell comments without changing budgets.

**Haze follow-up (v3.5.3):** Can still sees a haze over TODAY during entry. Exact shipped v3.5.2 reproduction shows full6px blur on the first frame while header opacity is0.80; the SVG reference filter cannot interpolate from `none`, so its declared delay does not create a blur transition. Preserve geometry, background, scroll lock and recede timing; use interpolable CSS blur for the header alone. A native-click regression freezes the real transitions at0/60/120/150/180ms and checks dimming before gradual blur. It fails the shipped runtime (no filter transition, bright immediate blur). Before trace/screenshots/assertion: `.context/focus-haze/`. Other surfaces retain their existing noise treatment. Final fresh Focus/visual/invariant check passes3 suites without failures/flakes in36.4s (`.context/fresh-SmNAtk/receipt.json`); the earlier Focus/design/smoke/invariant check passes4 in32.9s (`.context/fresh-1nHLZq/receipt.json`). Final runtime/test file fingerprints still match. Before-control fails on shipped v3.5.2; entry screenshots and real-frame traces confirm blur stays0px during dimming after the repair. Dev publication authorized; hosted and installed acceptance remain separate. The previous published movement fix remains awaiting user acceptance.

**Coverage gap and repair:** earlier tests checked settled pinning/dimming/filter and a static sidebar, not the transition or a genuinely scrolled long list. New native tests sample actual header/logo/navigation on every animation frame, anchored to click/Escape, across entry/exit. Include closed/sidebar widths736/1024/1440px and42-task scrolled cases with and without Explore. Entry geometry must remain within1px. On deep exit the document legitimately restores its nudged scroll position, so offscreen chrome may move farther offscreen but cannot reappear; verify the restored scroll and retain all raw frames. The intermediate strict all-y exit assertion is retained in `scrolled-after.log` as test development evidence, not a runtime regression claim.

**Verification:** final fresh combined check passes12 suites with zero failures/flakes in78.2s (`.context/fresh-1h4UhX/receipt.json`), including Focus, Explore, task actions, triage, accessibility, visual, smoke/SW/component/AI-handler, design and invariants/payload. Both42-task entrance traces keep header/logo/navigation geometry unchanged across34 sampled frames, with and without Explore; exit restores the nudged scroll without revealing offscreen chrome. Captured runtime/test input hashes still match the workspace after the check. Owning initial width-only check and `.context/fresh-mLgaAF/` predate the long-list repair and remain historical. Earlier controls and the legitimate deep-exit test correction are retained. Dev publication authorized November6; hosted and installed acceptance remain separate.

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

**November 7 conversation-return follow-up (v3.5.4; regression added):** Can reports a task-source warning while returning to a conversation and does not report changing a task. The warning proves a parsed document has a source-dependent reading, not a failed document download. The exact cause of the missing live dependency remains unverified. A fictional missing-source control shows ordinary saved replies withheld with no readable conversation recovery. Add deliberate **read saved conversation** inspection with historical labelling and no current-reading marker/composer. Preserve normal-view/source/clear/permission fences and future-context filtering; the owner can inspect the same retained record already exposed as Markdown/export. No live journal was copied or changed and no live AI was called. Do not describe this as proving a task was completed/deleted or repairing every missing-source cause.

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

## BUG-135 — Startup performance exceeds release budgets

**November 10 status:** the [current hosted release receipt](../docs/ci-release-evidence.md#recorded-full-release-proof) verifies the published startup/icon fix and its unchanged local-source performance gate. This does not establish recovery of the separate live Netlify first-byte failure or installed startup; retain the measurements and follow-ups below.

**Cold delivery investigation, November9 (engineering, v3.8.11 unchanged):** retain the live post-release1.708s first-byte failure in `.context/release-nov9/publishing/.context/deployed-performance.json`. Its original navigation phases show15.7ms DNS,108.1ms connection establishment and1582.5ms from request start to first byte, with no service worker. Eight additional bounded browser delivery samples with page JavaScript disabled measure382–667ms and report Netlify cache misses/stale refreshes; these do not replace the failure or prove its exact server-side cause. Direct HTTP comparison confirms deployed HTML is byte-identical to the candidate, a cache hit around110ms, and normal static misses despite browser-facing no-store headers; do not infer a cache-header defect. The benchmark now captures allowlisted original-response Cache-Status, request ID, server timing and numeric CDP phases for each cold/warm visit. A deliberately1100ms delayed HTML response still breaches the unchanged1000ms limit. Browser/connector access to Netlify request logs is unavailable; precise attribution inside its delivery path remains open. No runtime/header/hosting/threshold change or fix claim. Evidence: `.context/cold-start-nov9/`.

**Local v3.8.11 repair, November9:** Can authorised an optimised runtime repair after reviewing the failed deployed run. Declared public shell files now come from the complete active version cache; HTML/index aliases do not wait for a network response. Known misses use network without rewriting that installed version, and private/API/unknown resources stay uncached. Complete updates retain normal last-window activation; fresh tabs and manual refresh keep the active version until then. A real network-first worker control stalls on a held origin with a complete cache; the repaired worker loads native warm navigation/runtime with every public origin response held. Offline, partial install, API/POST and complete-update controls pass. Warm benchmark preparation explicitly requires a complete active shell and records preparation separately; original navigation phases are retained. Final verification is recorded once in `.context/ci-followup-nov9/implementation.json`. The cache repair is published; the original deployed failure and BUG-135 stay open pending a successful deployed run and installed verification of the repaired candidate.

**November 9 deployed follow-up:** [42621095874](https://github.com/fixingman/TODAY/actions/runs/42621095874) on dev build v3.8.10 / `31ddcabf` fails unchanged warm FCP/LCP500ms and interactive500ms ceilings: FCP/LCP236/284/248/532/284ms; interactive222.6/264.3/224.6/520/265.5ms. All five warm runs are SW-controlled, with no recorded cold/warm long tasks or blocking. The fourth navigation TTFB is340.2ms versus37.1–51.3ms in the other four; this points to pre-response navigation/SW/network delay but does not establish its cause. Exact-commit local-source release [42614802326](https://github.com/fixingman/TODAY/actions/runs/42614802326) passes64 suites first try and all five benchmarks; warm FCP worst272ms under its4×CPU profile. Deployed check uses1×CPU, so these are distinct measurements. Preserve original JSON/logs and separately labelled diagnostic replay under `.context/ci-followup-nov9/`; no rerun, threshold, cache strategy or runtime change. BUG-135 remains open.

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
