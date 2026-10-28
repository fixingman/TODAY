# CI phase 2 coverage and fixture audit

Implementation audit, October 28, 2026. This records reviewed dependency boundaries and known fixture hazards, not a claim that CI-only failures are eliminated. The workflow remains in shadow mode and executes the full inventory. Activation requires clean Linux results and two normal candidate shadow runs; local synthetic controls do not count as those two checkpoints.

## Path and consumer policy

`scripts/ci-policy.mjs` owns the canonical inventory, explicit runtime/server owners and dependents. `ci-plan-test` audits every tracked path and every literal `Today.use()` consumer against the selected coverage. Global variables, DOM/events, storage and clear contracts were reviewed separately and are covered by explicit dependencies or a full boundary. Unknown/new files, manifests, workflows and test infrastructure broaden to full. A changed registered suite selects its owner and dependents; an unregistered suite fails inventory validation.

| Group | Files | Root policy / dependents | Fixture review |
|---|---|---|---|
| contracts | registered suites / classified tooling | selected | Static token/component contracts plus real boot/Add/check smoke. No live account or writer. |
| accessibility | `assets/accessibility.js` | full | Loaded six shipped font faces before measurement; native targets/keyboard/axe and pixel thresholds remain. Focus explicitly maps hardware predicates in JS and CSS. |
| startup | `assets/sound.js`, `assets/splash.js`, `assets/idle.js`, `assets/celebration.js` | full + five-run performance | Real audio/splash lifecycle; fictional constructor/failure clocks. Sound server now decodes encoded font paths. Cold performance remains a separate real-clock gate. |
| platform | `assets/platform.js`, `manifest.json` | full + five-run performance | Native events and real service-worker caches; failed-update/offline controls. Worker fixtures close contexts and use isolated origins. |
| foundation | `index.html`, `sw.js`, `assets/feedback-policy.js`, `assets/runtime.js`, `assets/util.js` | full + five-run performance | Shared shell, registry, utilities and feedback policy: full fallback. Literal-only release metadata is the sole bounded exception. |
| clock | `assets/day-lifecycle.js` | full | One fictional noon shared by Node date keys and advancing browser clocks. Explicit rollover/DST tests retain their own instants; performance is unaffected. |
| connections | `assets/connections.js`, `netlify/functions/dropbox-token.js`, `netlify/functions/dropbox-refresh.js`, `netlify/functions/gmail-token.js`, `netlify/functions/calendar-token.js` | full | Shared task rendering, auth and global state: full fallback. Remaining short deferred-render sleeps are audited risks, not established failures or reasons to skip coverage. |
| sync | `assets/dropbox.js`, `assets/sync-merge.js` | full | Real sync/merge functions with fictional stores; full fallback. Network mocks never use real credentials. Cross-device clear/LWW checks stay required. |
| tasks | `assets/task-actions.js`, `assets/zones.js`, `assets/drag.js`, `assets/triage.js` | full | Task ownership/order/triage crosses render, focus and persistence: full fallback. Existing triage-close readiness repair retained; gesture/animation delays remain intentional. |
| assistant | `assets/assistant.js`, `assets/suggestion-policy.js` | selected; tasks, sync, focus, memory, connections | Actual Add/proxy/Apply and bounded recovery. Writer-specific request ledger excludes overlapping background writers; source-index assertion remains. |
| focus | `assets/focus.js`, `assets/focus-ask.js`, `assets/focus-session.js` | selected; gmail, enrichment, trello, habits, memory, tasks | Exact-answer/session/PiP fixtures retain JS+CSS input mapping and native-touch control. Fonts now load explicitly. Ask/request/body waits and deadline assertions stay intact. |
| nudge | `assets/nudge.js` | selected; about, memory, calendar | Node/browser origin is fixed for day-key fixtures; delivery/feedback suites already use explicit clocks. Real startup/request observations and bounded recovery assertions remain. |
| calendar | `assets/calendar.js`, `assets/calendar-nudge.js`, `assets/calendar-nudge-policy.js` | selected; nudge, connections | Existing fixed UTC Calendar event window retained. Decode DM Mono font URLs and require all shipped faces before viewport/overflow checks. |
| trello | `assets/trello.js` | selected; focus, enrichment, tasks, memory, sync | Fictional task/card fixtures test actual renderer and owner/cache behavior; selects Focus/enrichment/tasks/memory/sync dependents. |
| gmail | `assets/gmail.js`, `assets/gmail-feedback.js` | selected; focus, connections | Fictional mailbox/grant/draft stores and actual controls. Feedback server now decodes font URLs; missing fonts fail instead of silently using fallback metrics. |
| enrichment | `assets/task-enrich.js`, `assets/enrichment-feedback.js`, `netlify/functions/task-enrich.js` | selected; focus, connections | Existing clean-checkout mkdir repair retained; handlers and actual cards use fictional tasks/responses. Owner-specific background writer isolation remains. |
| memory | `assets/memory-panel.js` | selected; about, reflections, gmail, enrichment, dreams, insights, sync | Clear/Forget affects all feedback stores and synced state; conservative consumer closure includes reflections, Gmail, enrichment, dreams, insights and sync. |
| reflections | `assets/reflections.js`, `assets/reflection-wording.js`, `assets/week-reflection-policy.js` | selected; nudge, about, memory, sync | Fictional stores with async readiness/source digest and held response controls. Existing animation-aware contrast waits retained. Broad unrelated-writer stubs remain isolated to their component fixture; not evidence of production behavior. |
| insights | `assets/insights.js`, `assets/noticed-model.js` | selected; nudge, reflections, memory, about | Fictional current memory/outcomes, relative dates mostly constructed inside the page. Body/request readiness observable; date-boundary risk remains a future-clock audit item. |
| dreams | `assets/dreambank.js` | selected; meeting, sync, memory | Pure fictional storage/retention and owner tests; no live reading. Real speech/provider suite explicitly excluded. |
| meeting | `assets/meeting.js`, `netlify/functions/meeting-extract.js` | selected; voice, dreams, tasks, connections | Fictional MediaRecorder/stream/audio lifecycle and handler responses; timing for recording/gesture controls is intentional. Production request deadlines unchanged. |
| voice | `assets/voice-capture.js`, `netlify/functions/transcribe.js` | selected; meeting | Fictional microphone/recognition/transcription responses and explicit cleanup. Selects recording dependents. |
| about | `assets/about.js` | full | Consumed by splash, sync and nudge, including Sunday writing: full fallback. Node/browser day keys now share a fictional noon. |
| habits | `assets/habits.js` | selected; focus, memory, tasks, clock | Node completion date seeds share advancing browser calendar origin; explicit 03:00 rollover remains. Includes day-lifecycle consumer. |
| bounce | `assets/task-bounce.js` | selected; assistant, tasks, sync | Pure source-level contracts and source-selected follow-up consumers; includes assistant/tasks/sync. |
| poems | `assets/poems.js`, `assets/poem-utils.js`, `poem.html`, `netlify/edge-functions/poem.js` | selected + five-run performance; startup | Asset and seasonal/startup dependency: performance plus startup coverage. No media-authoring scripts execute in app runtime. |
| errors | `assets/error-monitor.js` | full | Shared global error contract: full fallback. Diagnostic wrapper checks still fail real application errors. |
| ai-proxy | `netlify/functions/ai-assist.js` | selected; assistant, focus, nudge, reflections, meeting, dreams, about | Handler mocks do not make live model calls. All existing AI consumer groups are explicitly selected; no provider or routing changes. |
| tooling | registered suites / classified tooling | full | Fixture repositories exercise pass/fail/flaky/timeout/selection/shadow. Unknown tooling and CI changes require the full gate. Browser probe retains native input/font/clock evidence. |

Other path categories: vendored assets/fonts/icons/hosting config use the foundation fallback; visual baselines use accessibility coverage; `scripts/**`, `.github/**`, memory validation and root repository tooling use full validation. `memory/performance-baseline.json` and `memory/Performance-audit.md` also require performance. Markdown, docs/media, video authoring and the two isolated output/habit studies are non-shipping inputs; executable application/tooling changes cannot use that prose path. Unknown future paths remain full.

## Entire suite inventory

Every registered suite is listed below. “Date reads” and “timed waits” are scan aids, not findings that a fixture is defective. A timer may deliberately exercise a deadline or animation; it is not replaced simply to reduce execution. Browser suites keep their existing cleanup and failures; no browser-suite concurrency was added.

| Suite | Owner | Browser | Date reads | Timed waits |
|---|---|---|---:|---:|
| `ci-invariants` | contracts | no | 0 | 0 |
| `design-lint` | contracts | no | 0 | 0 |
| `token-parity-test` | contracts | no | 0 | 0 |
| `timezone-test` | clock | no | 0 | 0 |
| `component-contract-test` | contracts | no | 0 | 0 |
| `smoke-test` | contracts | yes | 1 | 3 |
| `accessibility-test` | accessibility | yes | 4 | 2 |
| `visual-test` | accessibility | yes | 4 | 4 |
| `splash-test` | startup | yes | 7 | 0 |
| `platform-test` | platform | yes | 1 | 5 |
| `service-worker-test` | platform | yes | 1 | 2 |
| `connections-test` | connections | yes | 2 | 3 |
| `trello-test` | trello | yes | 3 | 1 |
| `gmail-test` | gmail | yes | 16 | 11 |
| `gmail-feedback-test` | gmail | yes | 8 | 0 |
| `calendar-test` | calendar | yes | 2 | 0 |
| `calendar-nudge-policy-unit-test` | calendar | no | 0 | 0 |
| `task-enrich-test` | enrichment | yes | 11 | 8 |
| `dropbox-test` | sync | yes | 15 | 11 |
| `sync-merge-unit-test` | sync | no | 0 | 0 |
| `dreambank-unit-test` | dreams | no | 3 | 0 |
| `meeting-extract-unit-test` | meeting | no | 0 | 0 |
| `error-monitor-unit-test` | errors | no | 0 | 0 |
| `console-probe-test` | tooling | yes | 0 | 1 |
| `ci-plan-test` | tooling | no | 0 | 0 |
| `browser-fixture-test` | tooling | yes | 4 | 0 |
| `ci-tooling-test` | tooling | no | 0 | 0 |
| `performance-harness-test` | tooling | yes | 0 | 2 |
| `sound-test` | startup | yes | 2 | 0 |
| `zones-test` | tasks | yes | 9 | 0 |
| `task-actions-test` | tasks | yes | 1 | 3 |
| `task-bounce-test` | bounce | no | 0 | 0 |
| `assistant-test` | assistant | yes | 1 | 8 |
| `ai-assist-unit-test` | ai-proxy | no | 0 | 0 |
| `writing-evaluator-test` | tooling | no | 0 | 0 |
| `feedback-policy-unit-test` | reflections | no | 0 | 0 |
| `suggestion-policy-unit-test` | assistant | no | 0 | 0 |
| `suggestion-outcomes-test` | assistant | yes | 5 | 0 |
| `nudge-test` | nudge | yes | 12 | 47 |
| `nudge-feedback-test` | nudge | yes | 2 | 0 |
| `nudge-delivery-test` | nudge | yes | 0 | 1 |
| `habits-test` | habits | yes | 5 | 0 |
| `triage-test` | tasks | yes | 1 | 16 |
| `meeting-test` | meeting | yes | 4 | 29 |
| `voice-capture-test` | voice | yes | 1 | 4 |
| `memory-panel-test` | memory | yes | 4 | 0 |
| `observation-pool-test` | reflections | no | 0 | 0 |
| `mailto-test` | gmail | no | 0 | 0 |
| `about-test` | about | yes | 12 | 6 |
| `reflections-test` | reflections | yes | 52 | 11 |
| `reflection-feedback-test` | reflections | yes | 6 | 2 |
| `day-lifecycle-test` | clock | yes | 4 | 5 |
| `drag-test` | tasks | yes | 3 | 8 |
| `focus-test` | focus | yes | 6 | 5 |
| `focus-session-unit-test` | focus | no | 0 | 0 |
| `insights-test` | insights | yes | 10 | 0 |
| `noticed-model-unit-test` | insights | no | 0 | 0 |

Explicit exclusions: `ai-test` and `dream-live-test` require approved credentials/live calls; `performance-test` remains the unchanged five-run release/nightly gate. They are not silently removed from release coverage.

## Reproduction and evidence

CI pins Ubuntu 24.04, Node 24.14.0, locked Puppeteer 25.10.0 and its Chrome for Testing 152.0.7977.75; UTC and locale are explicit. Runner image versions and effective browser input, fonts, viewport and clock are retained with the report. The Ubuntu AppArmor exception is limited to that test binary on the ephemeral hosted runner; it follows [Chromium’s scoped profile workaround](https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md). It does not change the developer machine. Browser installation uses the [Puppeteer installer’s exact build ID](https://pptr.dev/browsers-api/browsers.installoptions).

Local commands: `npm test --prefix scripts` is still full; `npm run test:shadow --prefix scripts` records selection but runs all; `npm run test:plan --prefix scripts -- --base <ref>` writes reasons. `test:changed` and `--suites` are explicit development diagnostics, never release approval. Shadow failures outside selection remain red and are named as selection misses. A final input fingerprint change invalidates a result. Full first/retry logs and original failures remain retained.

Confirmed controls: a font failure still resolves `document.fonts.ready`, while the new real-face check rejects it; working fonts pass. Local staged/unstaged cancellation, multi-commit push, PR merge base, forced/new/missing history, rename/delete, unknown paths, changed/new tests, unsafe metadata and invalid runner arguments have deterministic controls. Shadow deliberately failing outside its selection remains a failing full run. Day fixtures share one fictional origin while elapsed time continues advancing.

No Linux VM/container engine is installed in this workspace. Hosted Linux verification and the two normal candidate shadow reports remain owed before activation. No selection savings are claimed from a full fallback; remaining fixed waits and date-relative fixtures are documented risks, not silently waived failures. BUG-135 deployed startup failure remains open.

Local CI-only candidate evidence:57/57 checks pass, zero flakes/failures in308.5s; full shadow fallback selects/executes57 with zero misses. All five performance runs pass unchanged budgets (1200.4KiB decoded /340.8KiB Brotli /38 scripts; median cold FCP6672ms and Focus40ms). All168 runtime/test fingerprints remain unchanged through functional and performance gates. Complete child output77,356 bytes; runner terminal output1,941 bytes. The eight-check runtime invariant set totals8.488s in this macOS run; the docs subset totals2.703s. These are local measurements, not Linux promises or evidence of activated selection savings. Actual raw-font-path before controls and initial inventory failure are retained. Clean hosted Linux and two normal candidate shadow checkpoints remain pending; this local run does not count as either checkpoint.

Publication candidate v2.105.1: the published pool/Sunday module and `pool-wording-test` are retained under the About full boundary. The integrated inventory is58 checks. Prior local57-check evidence belongs to the earlier CI-only snapshot; integrated validation and exact-commit Linux results are recorded separately.

**v2.105.1 CI integration, October28:** the original five-run local benchmark on Chrome152/Node20 fails cold TBT at244ms/200ms (runs244/0/0/0/0). Original-run attribution records225.5ms in unchanged sound.js and116.5ms in the page script. All58 functional suites passed on Node24 with zero failures/flakes. The benchmark shell selected unsupported Node20 in the isolated directory; a separately labelled explicit-Node24 comparison is retained without replacing this original or claiming it explains/fixes the browser stall. Published runtime bytes are unchanged; BUG-135 remains open.

The explicit Node24.14.0/Chrome152 configured-environment comparison passes all five runs, worst cold TBT141ms/200ms. This does not erase the original Node20 failure or establish that Node caused or fixed the browser stall. All170 runtime/test inputs remain unchanged through both benchmarks; BUG-135 stays open.

Final publication integration: the pool session reserved and published v2.105.1 (05bde9eb), so this CI release is v2.105.2. Compared with the validated58-suite CI integration, only literal release metadata and the published three-line pool font-test strengthening differ in runtime/test inputs. Application code outside supported metadata declarations is byte-identical. Revised pool, metadata/smoke/About/offline and CI invariants are checked locally; hosted Linux runs the full58 checks and unchanged five-run performance on the final committed SHA. Prior full and failed timing evidence stays retained; no automatic release-proof reuse or selective CI activation is introduced.

Final v2.105.2 local integration validation: exact app-shell/SW metadata-normalized equality passes, all other runtime/test inputs match the prior full58-check result except the published pool font fixture. The revised pool suite plus smoke/About/offline/design and CI invariants/planner/tooling pass8/8, zero flakes/failures, with unchanged inputs. The configured Node24/Chrome152 five-run performance evidence applies to identical runtime bytes outside literal metadata; original Node20 failure remains retained. The pushed commit still requires its complete hosted Linux gate.
