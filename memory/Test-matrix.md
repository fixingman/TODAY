# TODAY — Test Matrix

> Test cases for releases. Run critical tests before every deploy.

---

## Pre-Release Checklist (REQUIRED)

### Live console diagnostics

Agent-run probes in a live TODAY window must use the dev-only preparation tool:

```sh
node scripts/prepare-console-probe.mjs .context/probe-input.js .context/probe-prepared.js source-check
```

Input is one expression (usually an async IIFE); the command validates syntax without executing it and writes a new private output file. Paste only that output. The wrapper awaits completion and catches diagnostic failures as labelled `completed`/`stopped` console statuses, without patching the app or printing unknown error content. Every nested request must be awaited; detached promises remain the probe author's responsibility. Capture live functions as explicit arguments before defining copies. Version/source guards remain mandatory for prepared comparisons; if they stop the probe, rebuild against the new source before proceeding. Do not reuse old unwrapped snippets from Console history. Existing consent/privacy boundaries still apply.

`node scripts/console-probe-test.mjs` uses an isolated browser with the real error monitor: both reported guard failures, a deferred failure and unknown rejection settle without a red dot; a successful probe runs once; genuine unhandled errors with the same message strings still light the dot. It is included in `test-all.mjs`. This is development tooling only, with no runtime integration. Publishing follows the repository patch/cache-version discipline.

### Release checks

Automated baseline: `node scripts/test-all.mjs` runs the design lint followed by all registered local
test suites, including the content-free error-monitor unit test, Calendar foundation contract test, experimental Calendar nudge policy unit test, six-scene visual regression coverage, the DreamBank
queue/day/grounding/file-format unit test (`dreambank-unit-test`) and the `meeting-extract` handler unit
test. `dropbox-test` and `meeting-test` also cover on-demand retrieval of a pruned dream on a second device: the selected file must reopen without entering synced/local storage, preserve older saved notes, and show retryable offline/missing-file states. The live `scripts/ai-test.mjs`, the live `scripts/dream-live-test.mjs`, and five-run
`scripts/performance-test.mjs` are explicit exclusions: the first two require API keys and real
provider calls; the last runs as its own push/nightly gate. `ai-test` uses fixed historical synthetic prompts and tests provider transport/response shape, not current production prompt fidelity, daily thinking or usefulness. `dream-live-test` (macOS: `say` +
ffmpeg) speaks scripted clips — English and Turkish dreams, a dream plus a real commitment, a
plain one-sentence dream (BUG-110), dreams told late ("the night before last", "dün gece", "years
ago" — still recognised as dreams), plain planning, figurative "bad dream" talk — through the real `meeting-extract` and
`ai-assist` handlers and checks detection, task separation, language (`lang`),
grounded images, and reading tone. `--say="…"` prints Gemini's raw answer for any one phrase.
Run it after any change to the dream or meeting prompts:
`GEMINI_API_KEY=… ANTHROPIC_API_KEY=… node scripts/dream-live-test.mjs`. Reading
*quality* is measured separately by `scripts/dream-reading-eval.mjs` (not a `*-test`, so outside
the gate): 12 retellings in similar-theme pairs, each reading scored by a Claude judge through the
same `ai-assist` handler — swap accuracy (can the judge tell the reading's dream from its twin;
~50% means interchangeable readings), specificity 1–5, usefulness 1–5, and quoted generic phrases.
`--versus=<prompt>` runs a head-to-head against another prompt; `--extract` checks the DreamBank
extraction prompt (≥3 grounded images per dream, dropped images printed, drop rate per language).
Position is alternated so judge bias cancels. `--prompt=file` scores a candidate against the
current prompt; `--runs=N` and `--out=file` for comparisons. Compare prompts only on equal runs. The runner verifies the test
inventory and the explicitly registered non-test check before execution. A check that passes
only on its diagnostic retry is reported as flaky and fails the gate; each attempt is capped at
120 seconds. Every attempt retains its full stdout/stderr and exit/signal in `.context/ci-test-results/`; failure summaries include the complete error and both failed attempts, rather than only the tail of a stack. Push/PR CI uploads these logs, the benchmark JSON and any diagnostic traces for 30 days, including when earlier steps fail. `ci-tooling-test` exercises clean, flaky and failed runs against synthetic suites and payload limits without Chrome; it also regenerates launch images in a dependency-free fixture and compares decoded dimensions/pixels, and stubs the live-provider smoke to ensure full `content` is checked before a truncated `message`. `splash-test` reads its coda ceiling from the existing `cold.splashDismissed` performance budget (23s), avoiding a separate obsolete 20s cap. Two-device nudge fixtures await initial sync and response state, and fake retry timers honor cancellation; meeting/voice rollover, retry, recording, PiP and cleanup use observable state instead of short sleeps. Both use 150ms simulated latency. The smoke browser uses a DevTools pipe so startup does not depend on discovering a WebSocket URL in process output; startup/app failures still fail. Tooling requires Node >=22.12 and Puppeteer 25. The last dual-runtime assurance
pass was clean on Node 22.23.2 and 24.14.0; current measured performance evidence is in
`Performance-audit.md`. GitHub Actions runs the same gate plus `npm run performance --prefix scripts`
on pushes and pull requests to `dev`/`master`. A scheduled workflow measures the deployed dev
URL and retains its JSON for 30 days. Run
`memory/validate-files.sh` separately; it remains outside `test-all.mjs`.

### Performance evidence gate

- `npm run performance --prefix scripts` runs five cold/warm mobile-like load pairs and five
  desktop interaction passes, then checks worst-run timing and deterministic payload budgets.
- `npm run performance:write --prefix scripts` refreshes `performance-baseline.json` and the
  generated block in `Performance-audit.md`; use it for a deliberate evidence refresh or budget
  calibration, not mechanically for every app-version bump.
- The push/PR gate uses `--no-audit-check`: it still measures all five runs and enforces every
  payload and timing budget, but a dated audit snapshot does not fail each intervening release.
  Refresh the tracked audit deliberately when reviewing performance, not as a prerequisite for
  every app-version bump.
- `--payload-only` checks deterministic byte/font/script ceilings without launching Chrome; CI runs it before browser suites, and the full performance gate still repeats those checks.
- Original runs retain bounded long-animation-frame script/layout attribution (first 128 frames per page), explicit browser support and source URLs without query/fragment values. These accompany the measured cold/warm/input evidence; a faster later replay cannot replace them. No observer is installed in normal app sessions.
- Reflection feedback merges cover unready outcome versions, actual Dropbox merge/manual Restore, ready withdrawal and deletion before readiness. Eight writing controls cover all four relationships in both directions with explicit day/evening framing; legacy valid text and stable claim suppression remain supported.
- Reflection freshness fixtures wait for actual reading/request states, with an intentionally delayed first cryptographic digest; consent, deletion, source and overlap assertions stay unchanged.
- Diagnostic reads drain pending PerformanceObserver records and allow at most 250ms for native attribution covering the already settled input interval; delayed delivery stays outside the measured duration. A queued-callback regression holds records past the first frame while preserving the original blocking failure.
- Diagnostic reads drain pending PerformanceObserver records before snapshotting. A real-browser regression queues callback delivery and still requires the original blocking attribution and unchanged timing failure; observer scheduling cannot turn that into a missing diagnostic.
- Add/focus response timing starts at actual keydown/pointerdown and ends on the next frame after the expected state appears. Window capture runs before document audio warmup, so its synchronous cost stays in the measurement. Automation wait is separate. `performance-harness-test` deliberately blocks startup/pointerdown and delays automation to verify attribution, unchanged ceilings and unsupported-API fallback using fictional browser fixtures.
- `--trace-on-failure DIR` keeps the original verdict and, only after a budget failure, launches a fresh Chrome process for a separate cold/warm-load/focus replay. It saves DevTools traces without screenshots and separate replay metrics. Tracing never changes the original five-run evidence or its worst-run budgets; replay need not reproduce an intermittent stall.
- Nightly checks out `dev`, requires the deployed version to match, and warms Chrome on a blank
  page before cold navigation. It still clears cache and origin storage for every measured run;
  long-task timings are retained in the JSON when a worst-run outlier needs diagnosis.
- Cold/warm evidence includes TTFB, FCP, LCP, CLS, total blocking time, long tasks, load timing,
  TODAY's four lifecycle marks, transferred/encoded/decoded bytes, and service-worker control.
  Interaction evidence measures task addition and entry into focus. Benchmark JSON also records Chrome/Node versions, platform and architecture so runner updates can be compared.
- The 1.8s FCP, 2.5s LCP, and 0.1 CLS targets remain visible separately from calibrated
  regression ceilings. The splash-dismiss ceiling covers the corpus's longest intentional
  poem reading hold and line-by-line exit; compare interactive timing separately. A current
  target miss cannot disappear behind a generous regression budget.

### Visual regression gate

- `npm run visual --prefix scripts` compares six canonical states with tracked PNG baselines:
  morning, populated tasks, focus, triage, Memory, and the 320px mobile layout.
- The suite disables motion, freezes the complete local clock to 2026-09-14, waits for fonts,
  and takes two captures per scene. Each capture must match its baseline and repeat 2 must also
  match repeat 1, tolerating only anti-aliasing noise plus 200 changed pixels. Missing baselines,
  clock drift, viewport drift, larger visual differences, or uncaught page errors fail the test.
- The triage scene waits until its sheet entrance and content reveal finish, then captures the
  full review. `triage-test.mjs` also checks token-based header-to-card alignment at 1200px and 390px.
- `platform-test.mjs` checks the mobile header's solid background/no-backdrop CSS contract alongside
  the three icon controls' custom appearance. Chromium cannot validate the iPhone PWA's compositor,
  so the real-device halo check remains in `Bugs.md`.
- `npm run visual:update --prefix scripts` deliberately replaces the baselines after a reviewed
  design change; it is never run by CI.

Run these **before every GitHub push**:

| # | Test | Steps | Pass |
|---|------|-------|------|
| 1 | App loads | Open fresh tab, splash dismisses | ⬜ |
| 2 | Add task | Type + Enter | ⬜ |
| 3 | Check/uncheck | Click checkbox | ⬜ |
| 4 | Delete task | Click × | ⬜ |
| 5 | Dropbox sync | Connect, verify backup | ⬜ |
| 6 | Cross-device | Add on A, appears on B | ⬜ |
| 7 | Triage flow | After 8pm, process tasks | ⬜ |
| 8 | Focus mode | Click task, timer starts | ⬜ |
| 9 | No console errors | Check dev tools | ⬜ |

---

## Quick Smoke Test (30 seconds)

Mental checklist after **any code change** — verify before moving on:

- [ ] **Add task** — Enter key adds task, appears at top
- [ ] **Check task** — Sound plays immediately (no delay)
- [ ] **Sync triggers** — Status shows "synced" (if Dropbox connected)
- [ ] **No console errors** — Red dot doesn't appear
- [ ] **Visual intact** — No broken layout, correct colors

If testing **focus mode** changes:
- [ ] Run `node scripts/focus-test.mjs` first — it covers the lifecycle automatically
- [ ] Run `node scripts/accessibility-test.mjs` — with the evening triage bar present and spoken morning-nudge reactions open, Review and “landed / not really” must recede and leave keyboard/assistive-technology navigation during focus, then return on exit
      (cold-start restore, escape leaves no session, switch keeps the timer anchored,
      rapid A→B→A, render during a live session). The checks below are the ones it
      cannot reach.
- [ ] Timer counts down
- [ ] PiP opens on tab leave, closes on return
- [ ] Pause/resume works
- [ ] Complete a session, dismiss, re-click the task → fresh 25:00, not a frozen 00:00
      (BUG-027 — needs `taskStates` internals, not automatable)
- [ ] Complete a session, then start a different task → no `.complete` styling bleeds
      into the new session's bar (BUG-022/028 — same reason)

If testing **task or habit reorder** changes:
- [ ] Run `node scripts/drag-test.mjs` first — it covers desktop and touch ordering,
      keyboard ordering, persistence and sync timestamps, guards, long-press
      cancellation, token-driven FLIP/ghost settle, reduced motion, and cleanup.

If testing **task actions** (add, copy, complete, delete, undo, or stats/favicon):
- [ ] Run `node scripts/task-actions-test.mjs` first — it covers direct mutations,
      delegated row controls, long desktop Delete → Edit scrolling and leading-text saves,
      focus interception, feedback, accessibility state, and favicon refresh.

If testing **new task reorder and delayed AI tips**:
- [ ] Run `node scripts/assistant-test.mjs` and `node scripts/dropbox-test.mjs` — actual Add/desktop drag/touch long-press must retain the new task’s position through an older snapshot, whether the tip arrives before or after sync (BUG-133). Check remote reorder recency, remote additions, deletions and zone-move controls too.

If testing **zone** changes:
- [ ] Triage bar appears 8pm–midnight
- [ ] Zone moves trigger sync
- [ ] Other device receives changes

If testing **triage review keyboard entry**:
- [ ] Run `node scripts/accessibility-test.mjs` — the dialog opens on its static title; Enter does not apply Keep all, Tab reaches the first action, Shift+Tab stays inside the visible action loop, and Escape returns to Review.

If testing **new-day nudge sync**:
- [ ] Run `node scripts/dropbox-test.mjs` — yesterday’s dated or undated dismissal must not suppress today’s nudge; a current-day dismissal must still sync, and uploads must include its source-local date.

---

## Design Review Gate: The Wallpaper Test

> Full principle: `design/Philosophy.md`. Not a per-deploy checkbox — that would itself become wallpaper. Triggered by the change type, not the release.

**When a change adds or modifies a recurring surface** (message, badge, panel, animation, stat, AI feature):

| Gate | Question | When |
|------|----------|------|
| W1 | Does it deliver value **every time** it appears — info the screen doesn't show, an action worth taking now, or a genuinely fresh feeling? | Before shipping |
| W2 | Which escape does it use — appear rarely (gated on signal), different each time (fresh context), or should it not exist? | Before shipping |
| W3 | Day-14 follow-up: is it still delivering, or has the user stopped reading/tapping/opening it? Behavioral symptoms (untapped chips, unopened panels) are the measurable signal. | ~2 weeks after ship |

A surface that fails W3 gets iterated or removed — removal is a valid outcome (`#weekNarrative`, v2.17.66).

**Tooling:** `/design-review` (`.claude/commands/design-review.md`) runs this gate (W1/W2, plus voice/token/component/motion/psychology consistency) against a diff or named surface — call it for anything landing here. It's judgment-based, not a script; `scripts/design-lint.mjs` covers the mechanical half (tokens, vocabulary, emoji selectors) and should be run first so the design review isn't spent re-deriving what a linter already caught.

---

## Full Test Matrix

### Shared Poem Permalink

- [ ] `/poem.html?date=2026-08-12` returns HTTP 200 and renders the dated poem.
- [ ] Initial response HTML contains non-placeholder `og:title`, `og:description`, `twitter:title`, and `twitter:description` values.
- [ ] Missing or malformed poem corpus falls through to the static page instead of returning an edge-function 500.

### 1. Manual Tasks (18 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 1.1 | Add task | Appears at top |
| 1.2 | Edit task | Text updated |
| 1.3 | Delete task | Removed + undo available |
| 1.4 | Reorder (drag) | Order preserved |
| 1.5 | Check task | Done state, strikethrough |
| 1.6 | Uncheck task | Restored |
| 1.7 | XSS: `<script>` | Escaped, no execution |
| 1.8 | Empty input | Rejected |
| 1.9 | Long text (500+) | Wraps |
| 1.10 | Delete last task → empty list | Day's poem appears (not static "A clean slate" — v2.26.0) |
| 1.11 | Check all tasks done | ✦ star above day's poem (not static "✦ All done" text — v2.26.0) |
| 1.12 | Shift+D | Clears done tasks |
| 1.13 | Rapid check/uncheck | No glitch |
| 1.14 | 100 tasks | All render |
| 1.15 | Add `work: task` while pointer is over the arriving row | Full two-pass arrival shimmer completes; hover does not replace it or flash midway |
| 1.16 | Hover tagged row after arrival settles | One forward pass uses the same muted/lime gradient, then returns to normal muted text |
| 1.17 | Type and save plain, skin-tone, flag, and joined emoji | Each grapheme remains visible as one shaped glyph in the input mirror and is stored/rendered without replacement characters |
| 1.18 | Reorder a task while its inline AI helper is visible, then rebuild the list | The same single helper remains directly below its owning task after upward/downward pointer or Option+Arrow moves and after render replacement |

### 2. Zones (17 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 2.1 | Triage: Keep | Stays in TODAY |
| 2.2 | Triage: Soon | Moves to SOON |
| 2.3 | Triage: Let go | Moves to PAST |
| 2.4 | Pull from SOON | Returns to TODAY |
| 2.5 | PAST purge (done 7d) | Auto-removed |
| 2.6 | PAST purge (letgo 30d) | Auto-removed |
| 2.7 | Morning nudge (no review) | Shows carried-over count |
| 2.7a | Morning nudge (with review) | Shows "Yesterday: X done, Ym focused" |
| 2.7b | Morning nudge after noon | Hidden, review cleared; dated AI line remains available in About until midnight |
| 2.7f | **SYNC: new day after yesterday’s nudge dismissal** | Prior-day or undated remote flag cannot become today’s dismissal; same-day dated flag still applies |
| 2.7c | Morning nudge AI delivery (v2.93.22) | Waits up to 5s for AI; fallback on delay/failure. Late/recovered AI saves for About; an untouched fallback may crossfade once within 20s (v2.97.5), otherwise a later natural check may upgrade it; dismissal remains final |
| 2.7n | Real startup and strip/About handoff | `nudge-delivery-test` (default gate): 46 desktop/touch-emulated cases run actual init/post-sync readiness without calling nudge/render/wake helpers. Controlled response/body/deadline ordering covers fast AI, late body, shortening, dismissal and noon; closing About upgrades an undismissed fallback (asserted). v2.97.7 adds ordinary readings without contrast keywords, legacy recap recovery with quota/noon/grounding/dismissal/cache safeguards, and natural midnight wake/restart. Agreement cases (former BUG-120, now BUG-118) — named completion, unrelated completion, a line by sync, a completion by sync — require strip and About to show the same line with About open, after closing and after returning. Mocked AI, fictional data. |
| 2.7d | Morning nudge AI — no key / offline | Rule-based line stays, no error, no loading state |
| 2.7e | Morning nudge dismissed while AI fetching | Stays dismissed — AI response does not resurrect it |
| 2.7g | Morning nudge transient recovery (v2.93.23) | `nudge-test` covers network/timeout/408/429/5xx, no parallel requests, scheduled 30s/2m background retries and three attempts per device/day across reopening; noon/offline/rollover stop timers. Fallback dismissal permits About recovery, never strip resurrection; accepted-AI dismissal prevents regeneration even with a stale/missing cache |
| 2.7m | Nudge length recovery (v2.95.4) | `nudge-test` covers one same-reading correction, failed/unsafe correction, original unsafe prose, legacy terminal recovery, unchanged provider/thinking route, strict 30-word limit, cache/About, fallback dismissal, no mid-read swap and epoch rollover before/during repair. No live private response is a fixture. |
| 2.7h | Morning nudge diagnostics / rejected prose | Read-only `Today.use('nudge').generationAudit()` distinguishes unreadable/empty/length/grounding/recap rejection from request failures; no private wording/keys/errors/reasons, no automatic retries for rejected prose |
| 2.7i | Morning nudge request spans midnight | Old replies cannot cache/speak for either day or unlock the new request; new-day attempt budget starts fresh and accepted new-day line reaches About |
| 2.7j | Daily Claude reasoning (v2.93.23) | `ai-assist-unit-test` pins adaptive thinking + 2048-token ceiling only for the exact daily marker, text-only extraction and capped-reply 502; other Claude callers and Gemini unchanged. `nudge-test` checks the marker on pool/task/retry requests and existing slow-delivery/timeout behaviour. Live provider latency/quality remains a manual check. |
| 2.7k | Two-device daily recovery (v2.93.23) | Isolated browser stores use the real Dropbox serializer and merge: failed request → count fallback → synced dismissal → timed recovery → live About on both devices. A competing late local reply cannot replace the synced line/vote; repeated merge leaves one voted record. Dismissal/recovery queue existing autosave; no new sync fields |
| 2.7l | Calendar daily support (v2.96.0 release) | `calendar-nudge-policy-unit-test`: 20 groups + 100-schedule oracle; shared pure evidence/constraints and minimal writer projection, known-overreach checks. Earlier strict decision/renderer stays dev-only. `nudge-test`: 17 synthetic runtime cases for qualified support, byte-identical omission on empty/unrelated/stale/incomplete/disconnected/slow reads, edit/completion/removal, Forget/account change/hide/midnight, rejected/empty replies, ordinary recovery, About/votes/privacy. `calendar-test`: detached timing-only snapshot + lifecycle fencing. SW test: offline lazy import. No live AI quality/semantic guarantee or title matching; observe actual usefulness after deployment. |
| 2.8 | **SYNC: A→SOON, B has in TODAY** | B gets SOON (newer timestamp) |
| 2.9 | **SYNC: A pulls back, B has in SOON** | A's pull wins (newer) |
| 2.10 | **SYNC: Both move to zones** | Most recent zoneChangedAt wins |
| 2.11 | **SYNC: Delete + zone conflict** | Deleted task excluded from zones |
| 2.12 | **SYNC: Missing zoneChangedAt** | Graceful fallback (no crash) |
| 2.13 | **SYNC: Schema v5.0 vs v5.1** | Backward compatible |
| 2.14 | **SYNC: Race condition triage** | Last zoneChangedAt wins |
| 2.14a | **SYNC: all-Keep triage completion** | Stores today's dismissal and immediately queues retrying autosave |
| 2.14b | **SYNC: stale blank triage dismissal** | Local same-day completion survives and marks merge changed so Dropbox is healed |
| 2.14c | **SYNC: first open after phone triage** | Yesterday's desktop visit plus today's remote dismissal survives cold-start cleanup, keeps the prompt hidden, and remains in the next Dropbox upload; yesterday's dismissal still clears |
| 2.16 | Triage summary (5+ done) | Shows "Solid day" + stats |
| 2.17 | Triage summary (0 done) | Shows "All sorted" |
| 2.18 | Triage summary saves review | `today_day_review` in localStorage |

### 3. Habits (12 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 3.1 | Add habit | Appears in list |
| 3.2 | Complete today | Dot filled |
| 3.3 | Delete habit | Removed |
| 3.4 | Rename habit | Name updated |
| 3.5 | Reorder habits | Order preserved |
| 3.6 | **SYNC: Both add habits** | Union merge |
| 3.7 | **SYNC: Both complete same day** | Deduped |
| 3.8 | **SYNC: A deletes, B completes** | Habit deleted |
| 3.9 | Focus on habit | Session tracked |
| 3.10 | **SYNC: A unchecks, B has checked (BUG-026)** | Stays unchecked — LWW timestamp wins |
| 3.11 | **Habit 3am rollover** — check habit at 1am | Counts for yesterday's date, not today's |
| 3.12 | **Habit 3am rollover** — open at 3:01am | Habit strip shows today fresh, yesterday's check preserved as past dot |

### 4. Done/Check State (7 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 4.1 | A checks 10:00, B unchecks 10:05 | Unchecked (newer) |
| 4.2 | A unchecks 10:00, B checks 10:05 | Checked (newer) |
| 4.3 | No timestamp history | Union fallback |
| 4.4 | Trello card checked | Syncs via done_ids |
| 4.5 | Manual task checked | Persists across sync |
| 4.6 | **SYNC: Check/uncheck rapid toggle** | Final state correct |
| 4.7 | **BUG-055: Second-device first-open** — tasks checked on device A today, device B opens for first time | Done tasks stay in TODAY, not moved to PAST (fix v2.30.1 — `today_checked_ids` timestamps distinguish today vs yesterday) |

### 5. Stats & Memory (19 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 5.1 | Focus minutes — same day, two devices | Max wins (higher of the two) |
| 5.2 | Focus minutes — after midnight reset | Remote yesterday's total NOT restored (date guard via `stat_focus_mins_date`) |
| 5.3 | Focus minutes — manual Restore button | Only restored if backup date matches today |
| 5.4 | Streak | Max wins; `stat_streak_date` guards against double-increment on multi-device (BUG-020) |
| 5.5 | Tasks done today | Max wins |
| 5.6 | Memory totalTasksCompleted | Max wins |
| 5.7 | Memory patterns | Merged |
| 5.8 | Memory moments | Union |
| 5.9 | AI name | Preserved |
| 5.10 | SOON phantom — complete/delete task in SOON, sync next day | Task does NOT reappear in SOON |
| 5.11 | Daily history — midnight snapshot | `today_daily_history` gains a new entry after midnight; capped at 30 entries |
| 5.12 | About weekly grid | "This week" section shows 7-day grid with bar heights matching task counts |
| 5.13 | Sunday earned reflection | On Sunday, a qualifying evidence-backed candidate is AI-written and cached; a flat week leaves the sentence hidden |
| 5.14 | Daily-history sync receives local, duplicate-date, and remote-only `tasksAdded` values | 0–30 preserved; values above 30 normalize to 0 before storage; other per-day fields still merge normally |
| 5.15 | Memory completion rate has five valid days plus one restored day with `tasksAdded: 31` | Invalid day is excluded; rate and evidence totals use only the five plausible days |
| 5.16 | Inline suggestion generation finishes while its task is off-screen, then the list re-renders and the task enters view | No row/offer/exposure before entry; pending delivery re-anchors by task ID; entry mounts and measures it; replacement/removal cancels; reason outcomes still learn and sync |
| 5.17 | Manual task has more completed pomodoros on one device; sync an older copy, including a concurrent Today/Soon/Past move (BUG-124) | Higher count/newest activity survive independently of the winning zone; incoming higher progress updates storage and badge; stale remote is healed; converged copies stay quiet. Full/partial focus queues backup without another edit. `dropbox-test` and `focus-test` automate fictional coverage; installed two-device acceptance remains open. |
| 5.18 | Post-add split has a transient request/body failure, or capture happens offline/just before hiding (BUG-129) | Actual Add/proxy/fake-upstream and reconnect/foreground tests (post-add fixture responses/counts exclude unrelated writers sharing the proxy): latest unchanged task can recover within two minutes, twelve-second deadline, one retry after five seconds. Edit/delete/check/move/key/new capture/expiry fences; permanent/invalid/abstained/suppressed output stays terminal; failures never become ignored votes. Installed delivery acceptance remains open. |
| 5.19 | Post-add index-only split, malformed/legacy replies, or task changes after offer (15F / BUG-131) | Real Add/proxy/mobile keyboard: two/three complete English action clauses become exact source-authored tasks with tag/case/spacing/punctuation intact. Reject missing/duplicate/reordered/out-of-range indices, mixed invented text, legacy paraphrases, single-task/implied-workflow/object controls. Recheck offer/source/undone Today owner at Apply; edit/check/move cannot lose data or create a false miss. Recovery/frequency/outcomes stay unchanged. |

### 6. Trello (9 tests)

Run `node scripts/trello-test.mjs` for mocked-API coverage of board/list selection,
OAuth headers, card filtering, render/cache state, errors, reconciliation, and disconnect.

| # | Scenario | Expected |
|---|----------|----------|
| 6.1 | Trello connect | Cards load |
| 6.2 | Trello disconnect | Cards cleared |
| 6.3 | Trello in triage (keep) | Card visible |
| 6.4 | Trello in triage (letgo) | Card hidden locally |
| 6.5 | Trello config syncs | boardId/listId synced |
| 6.6 | Trello popup blocked | Error shown |
| 6.7 | Trello checklist badge | Card with checklist shows "N/M ✓" in meta row |
| 6.8 | Trello focus — complete, dismiss, re-click | Fresh 25:00 starts on first click (BUG-027) |
| 6.9 | Saved Trello connection receives network, 429 or 5xx failure without cached cards (BUG-125) | Star remains; background failure keeps Connections closed. 401/404 or Forget still show lightning. `trello-test` automates manual/background failures; installed reconnect behavior remains open. |

### 7. Focus Mode (14 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 7.1 | Start focus | Timer runs |
| 7.2 | Pause (click outside) | Timer pauses |
| 7.3 | Tab away, return | Wall-clock correct |
| 7.4 | PiP sync | Both displays match |
| 7.5 | Session complete | Chime + count increment |
| 7.6 | PWA cold open | Splash appears immediately — no white flash before it |
| 7.7 | PiP: timer completes while minimized | PiP shows 00:00, bar full, button switches Breathe→Again |
| 7.8 | Completion — bar state | Bar fills and immediately starts pulsing "again?" (no static pause, BUG-028) |
| 7.9 | Window return with completed bar | Bar pulses on return with no flash (BUG-028b) |
| 7.10 | Focus companion with AI configured | Start focus and use “✦ ask”; one bounded task-specific question, supported step or acknowledgement appears inline; no history-based highlight or new surface |
| 7.10a | Habit focus companion (v2.97.0 local implementation) | `focus-test`: explicit Ask sends only the selected active habit name; no automatic request, history/Memory/other-task context or forced cue/25-minute framing. Correct accessible question/Ask labels; timer untouched; accepted prose uses existing private spoken history. Separate habit prompt stays unchanged |
| 7.10b | Pending habit question changes/fails | `focus-test`: dismiss/exit/switch, rename/archive/delete/check, 3am day change, AI Forget, DOM replacement and delayed response body withhold display/history; old rejection cannot clear a newer answer. Timeout/malformed/empty/non-question/overlong/network/HTTP replies reset; retry, content-first/legacy message and touch/no-key boundaries. Synthetic safety coverage is not live AI quality |
| 7.10c | Task focus help (v2.97.10) | `focus-test`: only JSON-quoted focused task; history and unrelated task/person/inference context excluded. Explicit question/action/wait acknowledgement delivery, accessible dismissal, strict format rejection without recording, current-only retry status, timeout/retry, rename/exit fencing and a paused timer remain correct. Synthetic checks do not certify usefulness or a destructive-action semantic guard. |
| 7.10d | Exact-answer Focus feedback (v2.101.0) | `focus-test`: unchanged answer row before/after keyboard expansion/voting; one landed/not-landed row, Undo/revision/clear, positive/missed/neutral next-explicit-Ask pickup, cap three, no storage/call/pause, task/habit/owner separation, neutral answer dismissal restoring counter/progress, edit/delete/real sync deletion/day/key/exit/completion/restart fences and late responses. Actual controls/axe, hidden states, 24px targets, 320px reflow and confined long-answer scrolling. v2.101.1 additionally reproduces desktop-fit → narrow scrolling → wide static text with the same rating, native pause activation and actual lazy request readiness. v2.101.2 adds a clipped-text compatibility control where native button scrollWidth equals clientWidth; the same reply and rating survive, scrolling starts when narrow and stops when widened. Failed marquee waits report geometry/motion/state. Installed VoiceOver and real-writing usefulness remain separate. |
| 7.10e | First-input audio preparation (v2.101.1) | `sound-test`: a deliberately slow constructor reproduces the cold first-Focus stall before the fix; context preparation precedes trusted input and plays/resumes nothing. Real input remains under the original 300ms gate; gesture resumes the existing context; all five tone schedules, closed-context recreation and refused/unsupported fallbacks remain. Real Chrome policy verifies suspended-before-input → running-after-input; installed iOS/background playback still needs device verification. |
| 7.11 | _onWake rapid double-fire | Alt-tab away and back quickly multiple times — no repaint glitches |
| 7.12 | Start focus among rows at different distances | Nearby rows recede before farther rows; the full delay wave spans exactly `--dur-fast` and the selected row stays stable |
| 7.13 | Start focus with reduced motion | Focus state applies without per-row wave delays |
| 7.14 | Focus with mocked Document PiP, then hide the page | PiP opens once; mirrors task/time and accessible controls; Open, pause/resume, complete/Again, restart, and Rest remain synchronized with the main session and clean up storage |

### 8. Network Edge Cases (7 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 8.1 | Offline add, reconnect | Task syncs |
| 8.2 | Token expired | Re-auth prompt |
| 8.3 | Failed backup | Retry on tab focus |
| 8.4 | Rapid sync (both devices) | No data loss |
| 8.5 | Slow network (30s) | "Saving..." shown |
| 8.6 | **localStorage quota exceeded** | Red dot shown with clear message (fixed v2.17.70) |
| 8.7 | **localStorage disabled** | App loads, no persist |

### 9. Destructive Operations (4 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 9.1 | Shift+D clear done | Done tasks removed |
| 9.2 | Disconnect Dropbox | B keeps last sync |
| 9.3 | Clear localStorage | B maintains data |
| 9.4 | AI delete_task | Tracked in deleted_ids |

### 10. Meeting Mode (8 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 10.1 | First mic tap — no name set | `#meetingNamePrompt` appears above add bar; meeting does not start yet |
| 10.2 | Name prompt — submit a name | Name saved, Connections chip updated, meeting starts, prompt hides |
| 10.3 | Name prompt — submit empty | Meeting starts without a name (user chose to proceed) |
| 10.4 | Name prompt — Escape | Prompt dismisses, no meeting starts |
| 10.5 | Meeting start → stop | Pill appears with elapsed time and red recording dot; stopping shows review panel |
| 10.6 | Review panel — items listed | "From your call" title; items in chronological order with owner hint labels |
| 10.7 | Review panel — auto-select | Items where `mine: true` start pre-selected; others start unticked; tapping toggles |
| 10.8 | Accept selected items | Selected items added to task list; sync fires; review panel closes |

### 11. Poem & sharing (8 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 11.1 | Splash — first open of the day, including a restart within 30 minutes of a pre-midnight open | New local date bypasses yesterday’s cooldown; after typewriter, day’s poem fades in below the date and holds 5–8s after its fade; tap skips. The next restart on the same date keeps the cooldown. Automated desktop/touch coverage pins 23:55 → 00:02 in Istanbul. |
| 11.2 | Splash — second open same day | Poem coda skipped; splash dismisses normally |
| 11.3 | Empty task list | Day's poem displayed (clean-slate echo — not static text) |
| 11.4 | All tasks done | ✦ star above day's poem (done echo) |
| 11.5 | Share today's poem where native sharing is available | Native share receives the poem, author, and canonical dated URL; visible and announced feedback begins immediately |
| 11.6 | Share today's poem without native sharing | Clipboard receives the same text and URL; the control reports copied state without stale feedback |
| 11.7 | Run smoke guard against `assets/poems.js` | Exactly 135 reviewed entries; every entry has text/author/source, a valid season, and 2–11 nonblank lines; approved selections including Dickinson's four-line 'Forever is composed of Nows', Gilder's six-line closing stanza, the ordinary-time round, Cotter's Rain Water pairing, and audited season tags are pinned; final-cut passages remain absent |
| 11.8 | Open About on a solar-term date in Northern and Southern Hemisphere time zones | Noticed keeps the same transition-day cadence but rotates the term and observation by half a year (for example, June 21 is Summer Solstice in the north and Winter Solstice in the south) |

### 12. PAST Revive (3 tests)

| # | Scenario | Expected |
|---|----------|----------|
| 12.1 | Aged or let-go task in PAST — hover | ↩ soon button appears on the row |
| 12.2 | Click ↩ soon | Task moves to SOON with same ID; `zoneChangedAt` refreshed; `revived` counter increments |
| 12.3 | Done task in PAST — hover | No ↩ soon button (done stays — PAST is acknowledgment) |

### 12A. Task enrichment ownership and exact-card control (v2.99.0 local)

| # | Scenario | Expected |
|---|---|---|
| 12A.1 | Current task text/source board/query policy differs from a cached web/Trello card, or owner is removed | Stale entry/arrow/view and hide influence are removed; old-policy caches refresh only at a next eligible use |
| 12A.2 | Hold response body while task is renamed/deleted, board/key changes or another cache is adopted | No stale cache/indicator/view write; replacement request remains independently owned after old completion |
| 12A.3 | Keyboard Enter/Space on not useful, Undo and later show context | Exact card hides/restores without a call; source link/shortcut/arrow withheld while hidden; focus transfers to replacement control; native Space does not toggle the timer. Interleaved list/storage refresh retains the same Undo node/focus/label; state:hidden works without a redundant timestamp; real move APIs preserve hiding across their intermediate saves |
| 12A.4 | Close/switch Focus while context is pending | Valid task-level cache may finish; the old focus view cannot reopen/repaint or change another owner’s shortcut |
| 12A.5 | Reopen hidden card, expire it or exceed retention limits | Hidden state persists across visits and unchanged Today/Soon/Past moves/return; true owner deletion clears it, while per-card show context clears only the hide. Max 30 days, 60 entries / 200,000 UTF-8 bytes; previous-client success-only renderer also withholds state:hidden |
| 12A.6 | Network/provider/exhausted/malformed server result versus explicit no-result | Failure is retryable 502; only a valid explicit no-result caches. Client abort is bounded at 26s without automatic retry |
| 12A.7 | Populated existing component at 320px, max-length unbroken headline/body, reduced motion and keyboard focus | Actions/text wrap without horizontal overflow; named native targets and visible focus; no new animation or panel. Desktop-only Focus eligibility stays unchanged |

Automated owner: `scripts/task-enrich-test.mjs`; `scripts/gmail-test.mjs` separately covers local BUG-128 ownership: held classification/list/thread/draft bodies, edits/deletion/moves/checks/key/grant/cache adoption, actual Escape, real sync, cross-tab sign-in changes, access refresh versus Forget, 26s deadlines and Copy without regeneration. Manual installed-account/VoiceOver and W3 usefulness checks remain distinct from browser fixtures.

### 13. About — Sunday Layer and Monday Silence

| # | Scenario | Expected |
|---|----------|----------|
| 13.1 | Open About on Sunday with a qualifying pattern (AI key set) | Code selects one candidate; prompt contains its evidence/meaning only; grounded AI line cached in `week_reflection_<date>` with current `week_policy_<date>` |
| 13.2 | Open About on Monday, including with an old `monday_intention_<date>` cache | `#sundayBlock` stays hidden; the week grid and Today's cached nudge remain available, and no Monday AI call fires |
| 13.3 | Open About on Sunday — no AI key / offline | Sunday block hidden; no generic counter-summary fallback and no false negative-cache stamp |
| 13.4 | Open About Tuesday–Saturday | No Sunday reflection block shown |
| 13.5 | Flat week, identity/causal response, or old unmarked cache | Flat week abstains; overclaim rejected; old copy removed and cannot restore from Dropbox without current policy |
| 13.6 | Sunday fallback eligibility/feedback | Existing gate enforces weekly cooldown, extra week after a miss and permanent retirement; stale unvoted policy may replace, explicit old votes remain authoritative; audit reports the actual fallback/rejection |
| 13.7 | Sunday seven-date evidence and prose | Today plus six preceding dates across DST; strict majority before a more/most claim, all three actions before mixed wording, two-way ties abstain; actual semantic guard rejects unrelated/wrong-direction prose |
| 13.8 | Held Sunday responses and two browser stores | Source/vote/clear/day/key/adopted-cache/readiness changes fence late success/error; irrelevant Focus/reordered source rows stay valid. Real merge carries retirement; only current-policy cache is adopted. No initial generation before readiness |

---

## Test Summary

The numbered scenarios below are the manual acceptance catalogue, not a hand-maintained test
count. The executable inventory is authoritative: `test-all.mjs` runs the registered checks and
fails if a new `*-test.mjs` suite is omitted. This avoids the old summary drifting whenever a
later section or automated suite was added.

---

## Edge Cases: Time & Timezone (partly automated)

| # | Scenario | Risk | Mitigation |
|---|----------|------|------------|
| T1 | **Timezone change (travel)** | Date string changes mid-day → unexpected cleanup | `stat_last_visit` is local-only, but date shift could trigger `applyNewDayCleanup()` |
| T2 | **DST spring forward** (2am→3am) | Habit grace must still roll at local 3am | Automated in `timezone-test.mjs` |
| T3 | **DST fall back** (2am→1am) | Repeated 1am hour must not roll habits twice | Automated in `timezone-test.mjs` |
| T4 | **Multi-timezone sync** | Device A/B have different "today" | `stat_last_visit` not synced — each device manages own day |
| T5 | **Manual restore after travel** | `toDateString()` uses device timezone | Equivalent to `_getAppDay()` post-v2.12.74 — no separate bug |

### Testing Instructions

**T1 — Timezone change:**
1. Open app, add tasks, check some done
2. Change system timezone forward/back several hours
3. Reload app
4. Verify: done tasks NOT cleared, streak intact

**T3 — DST fall back simulation:**
1. Open app at "1:30am" (simulated)
2. Change clock back to 12:30am
3. Wait for sync tick (7s)
4. Verify: cleanup doesn't run twice

---

---

## 14. Post-Triage Reflections (v2.65.7)

### Consent lifecycle

| # | Scenario | Expected |
|---|----------|----------|
| 14.1 | Triage complete, no policy, cooldown permits | `#triageReflection` shows intro copy + Remember / Not for me |
| 14.2 | Triage complete, no policy, cooldown not elapsed | `#triageReflection` empty |
| 14.3 | Tap "Remember" | Policy saved `remember`, intro replaced by six-word buttons, timer reset to 8s |
| 14.4 | Tap "Not for me" | Policy saved `not_for_me`, `#triageReflection` cleared, timer reset to 3s |
| 14.5 | Triage complete, policy = `remember`, no today response | Question shown, timer 6s |
| 14.6 | Triage complete, policy = `remember`, today response exists | `#triageReflection` empty |
| 14.7 | Triage complete, policy = `not_for_me` | `#triageReflection` empty |

### Timer paths

| # | Scenario | Expected |
|---|----------|----------|
| 14.8 | Intro visible (10s), user hovers `#triageComplete` | Timer pauses |
| 14.8a | Mobile completion: hold non-button panel area past original deadline, then release/cancel | Timer and progress stay paused while held; release outside/cancel resumes remaining time. Native Undo/reflection buttons act normally. `triage-test` covers native touch, cancellation, reset while held and desktop hover; physical iPhone/PWA pass remains owed. |
| 14.9 | User taps "Remember" | Timer resets to 8s |
| 14.10 | User selects feeling | Timer resets to 3s |
| 14.11 | User taps "Not for me" | Timer resets to 3s |

### Response validation

| # | Scenario | Expected |
|---|----------|----------|
| 14.12 | Tap "present" | Entry `{date: today, feeling: 'present', updatedAt: ISO}` saved |
| 14.13 | Tap second feeling same day | Entry replaced (not appended) |
| 14.14 | 31 reflections across 31 days | Oldest entry pruned; list stays at 30 |
| 14.15 | Invalid `feeling` value passed to `reflectionSelect` | Silently ignored, no write |
| 14.15a | Select a feeling with motion enabled | Other words recede; the selected whole word acknowledges the tap and settles into the confirmation using `--dur-fast/base/mid`, `--ease-out`, and `--ease-spring` |
| 14.15b | Select a feeling with reduced motion | Entry still saves; confirmation replaces the question immediately and no flight clone is created |

### Memory panel & deletion

| # | Scenario | Expected |
|---|----------|----------|
| 14.16 | Open Memory panel, policy = `remember`, 3 entries | HOW DAYS FELT hidden; no count, subtitle or inferred message |
| 14.17 | Dominant feeling but no qualifying commitment comparison | HOW DAYS FELT hidden; no AI request |
| 14.18 | AI configured + qualifying commitment relationship | Panel sends only the selected aggregate; one complete relationship sentence replaces `reflecting…` |
| 14.19 | AI returns over 40 words, no terminal punctuation, multiple feelings, causal language, or swaps the supplied contexts | Output withheld; opted-in block hides; no clipped or ungrounded prose shown |
| 14.19a | Change supporting outcomes or sync a different feeling while Memory is open | Old sentence disappears immediately; regenerate from current aggregate only |
| 14.19b | Withdraw supporting records, consent or roll past a supporting date | Old result invalidated; no relationship = hidden opted-in block |
| 14.19c | Deliver older request after newer request, deletion or re-consent | Old reply neither restores deleted insight nor overwrites/clears newer loading/result |
| 14.19d | Reopen with unchanged evidence; reorder storage or add unrelated outcomes | Valid wording stays; no manufactured variation or repeated request |
| 14.19e | Open Dreams, then manage by keyboard at 320px | One recurrence line with distinct-dream counts and spoken count labels; long labels wrap, manage retains focus, read/delete remain reachable; no hide controls or reappearance explanation |
| 14.19f | Load legacy dismissed recurrences and duplicate index rows | Legacy dismissals do not hide recurrence; count each distinct dream ID once (v2.95.5); compatibility map remains available for sync |
| 14.19g | Vote “not really” on ordinary nudge and typed category observations | Ordinary feedback persists separately; two category misses still retire it; no RETIRED section |
| 14.19h | Run `node scripts/reflection-feedback-test.mjs`; view then vote by keyboard | Viewing alone saves no derived reading; first vote explains storage, saves immediately, retains valid text, offers Undo on a miss; no general-memory/model history leakage |
| 14.19i | Reopen a missed feeling claim or roll to tomorrow without new support | Withheld; collapsed footer review/clear stays reachable. At least one new reflected evening in each group and existing qualification are required for reappearance |
| 14.19j | Revise/clear on another device, replay old backup, clear history during a held reply | Latest null wins, no old vote resurrection; source/consent/deletion generations fence late replies; first-sync readiness precedes generation |
| 14.19k | Open reaction/footer at 320px and with screen reader | Wrapping, native disclosure, named reaction groups, pressed state, visible focus and reachable clear above the fixed input; axe covered, real VoiceOver still required before release |
| 14.19l | Run `node scripts/feedback-policy-unit-test.mjs` and `node scripts/nudge-feedback-test.mjs` | Bounded same-surface recent examples, reasons excluded, sparse history neutral; recent landed/missed context uses the unchanged writer instruction; no extra AI call. Natural startup proves next-day votes, synced revision/clear and retained accepted lines; missing/hanging helper loads and failed projections preserve ordinary delivery |

| 14.20 | Policy = `not_for_me` in panel | "Remember reflections" button shown |
| 14.21 | Tap "Remember reflections" | Policy = `remember`, Memory block re-renders |

### Dropbox sync invariants

**BUG-130 transport/revision regression (`scripts/dropbox-test.mjs`):** metadata succeeds but content fails with 503/network/invalid JSON → unchanged read timestamp and retry the same revision next tick; upload followed by another device’s write → download its completion; manual restore with valid/missing/malformed metadata and cold start → seed only consumed content revisions. Two independent stores use actual task check/uncheck, queued backup and wake/poll to converge against a fictional shared Dropbox. Installed network/background timing remains a separate acceptance check.

| # | Scenario | Expected |
|---|----------|----------|
| 14.22 | Remote has newer `reflection_policy.updatedAt` | Remote policy adopted |
| 14.23 | Local has newer `reflection_policy.updatedAt` | Local policy kept |
| 14.24 | Both have same `updatedAt` | Remote wins |
| 14.25 | Remote has a response for a date local doesn't | Entry merged in |
| 14.26 | Both have a response for same date; remote newer | Remote entry wins |
| 14.27 | Remote `reflections_cleared_at` newer | Watermark adopted; entries ≤ watermark discarded |
| 14.28 | Backup payload | Source fields plus separate `reflection_feedback` / `reflection_feedback_cleared_at`; intro cooldown absent. Missing old-client feedback fields do not clear local votes; full clear/withdrawal does |

### Relationship thresholds

| # | Scenario | Expected |
|---|----------|----------|
| 14.29 | Fewer than 4 reflected evenings on either comparison side | Count only |
| 14.30 | Two groups of 4+, but feeling-rate gap <30 pp | Count only |
| 14.31 | Gap ≥30 pp, but named feeling appears fewer than 3 times on stronger side | Count only |
| 14.32 | Obligation and chosen completion groups qualify; mixed evenings also exist | Mixed evenings excluded; one strongest supported candidate at most |

### AI reflection privacy

| # | Scenario | Expected |
|---|----------|----------|
| 14.33 | Qualified relationship auto-reflects | Network request contains `reflected_evenings_count` plus one aggregate `relationship`; no task text, raw dates, identifiers, full distribution, or alternate candidates |
| 14.34 | Result returned | Session-only; `_reflectResult` set; not written to localStorage |
| 14.35 | Page reload after AI reflection | No `_reflectResult` in fresh session |

### Static wiring

| # | Scenario | Expected |
|---|----------|----------|
| 14.36 | `reflections.js` file exists | node --check passes |
| 14.37 | `sw.js` precache | `'/assets/reflections.js'` present |
| 14.38 | `CACHE_VERSION` | Matches current `APP_VERSION` (smoke-test gate) |
| 14.39 | `index.html` script order | `reflections.js` after `dropbox.js`, before `triage.js` |
| 14.40 | `#triageReflection` DOM | Present between `#triageSummary` and `#triageUndoBtn` |

---

## 15. Accessibility (v2.68.0)

### Automated gate

| # | Scenario | Expected |
|---|---|---|
| 15.1 | Run `node scripts/accessibility-test.mjs` | axe-core reports no violations in representative main, disclosure, focus, triage, meeting-review, mobile, and poem states |
| 15.2 | Inspect reachable controls | Every control has a name and native/state semantics; closed UI is absent from tab order and accessibility tree |
| 15.3 | Open/close triage and meeting review | Initial focus enters, Tab/Shift+Tab stay contained, background is inert, Escape closes, invoking focus returns |
| 15.4 | Focus a manual/Trello/habit row; press Option+Up/Down | Item persists in the new order, retains focus, and announces position; first/last boundaries announce without moving |
| 15.5 | 320px viewport and zoom-capable metadata | No document-level horizontal overflow; viewport contains no zoom-disabling directives |
| 15.6 | Computed targets/tokens | Representative controls are at least 24×24px; muted text and interactive borders meet the documented contrast thresholds |
| 15.7 | Open Memory panel | “clear all memory” and “Connections →” retain 4px padding and at least 24px height |
| 15.8 | Copy a focused task, then leave/re-enter focus before 1.8s | Label resets immediately to `copy`; `.copied` does not leak into the next focus session |
| 15.9 | Complete a task | Row returns to exactly 25% opacity while completion button keeps its accessible name and pressed state |

### Manual keyboard and screen-reader gate

Safari 26.6 WebDriver baseline (2026-09-04): 14 checks passed for startup, semantic state, main/poem axe scans, complex emoji, focus isolation/Escape, disclosures, sharing support, and overflow at Safari's 336px minimum content width. This supplements rather than closes the keyboard, VoiceOver, sleep/wake, and installed-PWA items below.

Mobile Safari 26.3 on an iPhone 17e simulator (2026-09-04): 10 targeted checks passed for touch/non-hover media state, mobile card aging, enrichment-indicator taps, complex emoji shaping/persistence, repeated Past → Soon revive responsiveness, and post-triage “Undo sorting”. Can accepted this reproduction-equivalent run to verify BUG-094/093/092/087/083. Simulator evidence does not replace the remaining VoiceOver, physical-PWA wake/background, AutoFill, live-account, or OS-handoff checks.

- [ ] macOS Safari keyboard-only: skip link; add, complete, delete, undo; disclosures; focus; triage; meeting selection/review; Option+Arrow reorder.
- [ ] macOS Chrome keyboard-only: repeat the same flow and confirm focus indication/restoration.
- [ ] VoiceOver in Safari and Chrome: names, headings/lists, pressed/expanded/busy/progress state, live announcements, dialog containment, and poem sharing.
- [ ] iPhone installed PWA with VoiceOver: task/habit actions, disclosures, triage, meeting/Voice Note, zoom, orientation, and narrow reflow.
- [ ] iPhone installed PWA add field: from halfway down a long task list, open the keyboard, type, dismiss it, and confirm the list returns to the same place; repeat after deliberately scrolling while typing (that new position should be kept).
- [ ] 200% browser zoom and 320 CSS-pixel reflow: no clipped actions, lost content, or horizontal document scrolling.
- [ ] Real focus and meeting PiP: keyboard controls, names/state, timer/progress output, focus reveal, and reduced-motion behavior.

### Known exception

Completed task rows intentionally use 25% opacity, so WCAG 2.2 criteria 1.4.3 and 1.4.11 remain unmet for that state. Pointer reorder remains drag-only, so criterion 2.5.7 also remains unmet. Do not record the product as fully WCAG-conformant. See `Accessibility-audit.md`.

---

## 16. Component contracts and deterministic cores (v2.82.5)

| # | Scenario | Expected |
|---|---|---|
| 16.1 | Run `node scripts/component-contract-test.mjs` | `runtime.js` loads first, is precached, and every declared `data-today-*` action has exactly one registered owner with no unused registrations |
| 16.2 | Scan static and generated runtime markup | No inline event-handler attributes are present |
| 16.3 | Audit top-level compatibility assignments | No duplicate owner outside the explicit transitional allowlist; total assignments remain within the ceiling enforced by `component-contract-test.mjs` |
| 16.4 | Run `node scripts/sync-merge-unit-test.mjs` | Daily history and suggestion outcomes merge deterministically without DOM, storage, or Dropbox access |
| 16.5 | Run `node scripts/suggestion-policy-unit-test.mjs` | Reason classification, performance context, exploration, and underperformance decisions are deterministic |
| 16.6 | Run `node scripts/noticed-model-unit-test.mjs` | Solar-term hemisphere mapping, milestone thresholds, and time formatting are deterministic |
| 16.7 | Run `node scripts/focus-session-unit-test.mjs` | Session creation, wall-clock restore, elapsed time, and serialization are deterministic |
| 16.8 | Run `node scripts/token-parity-test.mjs` | Canvas constants and focus/meeting PiP colors derive from canonical computed tokens; poem/offline literals stay in parity |
| 16.9 | Run `node scripts/assistant-test.mjs` | Reachable post-add suggestions work; retired AI sheet code, state, CSS, backdrop, and markup remain absent |
| 16.10 | Run `node scripts/dropbox-test.mjs` cadence case | Unchanged seven-second sync performs no Trello render; a day boundary and wake each reconcile once |

*Component-contract cases above were recorded at v2.83.1; newer cases follow below.*

## 17. Observation pool, memory record, mailto builder (v2.80.x–v2.82.x)

| # | Scenario | Expected |
|---|---|---|
| 17.1 | Run `node scripts/observation-pool-test.mjs` | Pure, no browser. Candidate kinds fire on seeded outcomes and stay silent below threshold; backfilled rows never produce `focus-vs-obligation`; unknown obligation is never counted as chosen; eligibility restricts the morning to today-hook kinds; novelty gate drops a kind inside its cross-surface cooldown and any age claim; explain returns a reason |
| 17.2 | Run `node scripts/memory-panel-test.mjs` | KNOWN puts focus-backed returning tasks first; zero focus is not called unstarted. Waiting Soon records collapse on each visit; expand/less preserves focus, and dismissing a record retains its task. The 30-day tally appears only in WHAT TODAY HAS SEEN; DREAMS remains last after re-render. SAID stays absent; full-clear wipes companion slots, tombstones hypotheses and sets the watermark |
| 17.3 | Run `node scripts/mailto-test.mjs` | Pure, no browser. `_mailtoDraftHref`: literal `@`, exact production form, 1900 cap with a body that decodes and is a prefix of the original, grapheme-safe trimming on emoji and ZWJ sequences, lone surrogates dropped not thrown, null inputs, the 20-grapheme floor from both sides |
| 17.4 | `dropbox-test` merge cases (11b, 11c) | `taskOutcomes` / `spokenLines` / `obligationHistory` union, dedup, prune; clear watermark drops pre-clear rows in both directions and accepts same-day rows; hypothesis tombstones honoured |

---

## 18. Platform lifecycle (v2.90.16)

| # | Scenario | Expected |
|---|----------|----------|
| 18.1 | Run `node scripts/service-worker-test.mjs` | Real worker controls a fresh page, caches every declared shell resource, purges a legacy cache, activates an updated worker, and serves both the app shell and branded navigation fallback without network access |
| 18.2 | Run `node scripts/timezone-test.mjs` | Pinned Los Angeles, Kiritimati, and Kathmandu processes use local dates; spring-forward, both fall-back 1am hours, date-line, and fractional-offset cases preserve the local 3am habit boundary |

---

## 19. Quick voice capture (v2.90.18)

| # | Scenario | Expected |
|---|----------|----------|
| 19.1 | Run `node scripts/voice-capture-test.mjs` | Shift+Space prefers explicitly on-device continuous recognition; otherwise one ephemeral blob uses the configured Gemini transcription route. Releasing Shift or Space ends capture, input focus and repeats stay inert, media and metering are stopped, audible speech adds exactly one task, silence makes no request and shows “Nothing heard,” the endpoint converts its no-speech marker to empty text, and a failure adds no task while remaining visible. |
| 19.2 | Manual reduced-motion check | A successful add changes the listening dot into an accent check before the pill disappears; empty, unavailable, and failure paths never show success. With reduced motion, the state remains clear without a transition. |

**15B optional wording loop (local v2.100.0):** actual browser coverage includes first-use choice, no immediate rewrite, Undo, guidance on a new eligible evening, clear while pending, late guided-answer rejection, the next unguided answer, real sync/stale-backup clear, both concern types, private history canaries, keyboard/axe and 320px. Pure tests cover field-independent LWW/null and old-client absence, source readiness/withdrawal, natural expiry and ordinary-vote isolation. Offline SW coverage imports the lazy helper. Live writer quality remains separately unmeasured.

**v2.101.0 combined release checks:** `focus-test` covers exact-answer feedback, next explicit Ask, Undo/revision/clear, no persistent writes, owner/source/day/key/session/completion fences, keyboard/320px/axe and answer layout. `memory-panel-test` covers keyboard reveal and native dismissal of quiet row actions; `gmail-test` checks distinct draft/thread actions and the no-address Copy fallback. The enrichment revisit fixture activates the focused native button after Undo and asserts the hidden write before closing, avoiding a pointer coordinate race during resize.

**15C reason-majority correction (v2.101.1 / BUG-134):** `observation-pool-test` covers ties in both input orders, strict majority/minimum-count boundaries, three-way plurality, incomplete reasons for all four supported insights, competing candidates and retained retirement/cooldown behavior. `about-test` checks actual Sunday selection/audit, fallback retirement, scoped writer input, private-record exclusion and one existing request. Original pre-fix failures and published-baseline controls are retained under `.context/15c-reason-majority/`; fictional cases do not establish real-use usefulness.

**15E next-use loop (v2.103.0):** task-enrich-test exercises the actual optional controls and ordinary next-task lookup, fixed-enum-only projection/no supporting prose, revision/per-task toggle/clear all/eligible Undo, cache non-regeneration, source/expiry/deletion/board/policy withdrawal, two-concern cap, incoming memory-clear/stale-cache replay, late headers/bodies, one requested alternative per visit, no-result/error/identical-source preservation, exit/clear cancellation, actual server conditional prompts/tools/canonical source exclusion and Trello Open normalization. Native keyboard, retained topic focus, settled axe, 24px targets, 320px reflow and unclipped choices after viewport resize remain covered. Existing mail/Ask/arrival/zone/legacy-hide controls stay active. `node scripts/enrichment-writing-check.mjs` is a no-network dry run; `--live` requires an explicitly supplied development ANTHROPIC_API_KEY, uses four controlled fictional source cases × original/concern, and caps all provider work at sixteen requests / three minutes. It uses the actual handler/model without routing changes, controls retrieval to isolate writing, and retains originals/blinded pairs. The October 27 live run used eight calls/eight outputs; quality verdict iterate. These are not telemetry, a product ritual, source-relevance proof or real-use acceptance.

**15E release evidence (October 28):** Isolated v2.103.0 candidate: 53 suites passed with zero flaky/failed tests; payload passed (1203.7 KiB decoded / 342.1 KiB Brotli / 38 eager scripts). The five-run performance gate failed: cold blocking 492 ms against 200 ms, alongside cold/warm load overruns. A separate one-run published v2.101.5 control also fails startup blocking (301 ms), with original attribution to unchanged sound initialization; it does not clear the candidate or explain every failure. Can requested dev/master publication after this failed gate was reported; BUG-135 remains open and the failed evidence is retained. Pending parallel Focus source/tests/CSS are excluded; all 149 candidate runtime/test fingerprints stayed unchanged. The service-worker suite imports the actual optional enrichment helper offline; this protects BUG-136 after the missing file is published. No installed-device, VoiceOver or broad writing-quality acceptance is inferred.

**15G reliability (v2.103.2):** sound-test reproduces a 340 ms synchronous default-output initialization and verifies startup/input limits, held output, intact tone envelopes/overlap, expired/latest-only cues, closed-context fences, rejected/unsupported options and real native gesture/default routing. service-worker-test proves missing-file and network-failed updates retain the prior worker/cache and remove partial caches, then verifies healthy replacement and offline modules/fallback. Calendar integration uses a fixed UTC-noon clock, enrichment creates its own screenshot directory and Focus checks actual relative width while retaining marquee/reply/rating assertions. Deployed .context/15g-reliability/deployed-offline-results.json records both origins’ complete 69-resource shells and offline helper import; it is not installed-device or personal-account acceptance. 53 functional suites passed with zero flaky/failed results; all five performance runs pass unchanged budgets (worst cold blocking59ms/200, coldFCP6748ms/7000, warmFCP124ms/500, focus35.9ms/300; medianfocus33ms). Payload1201.1KiB decoded/341.0KiB Brotli/38scripts. The About-history-only copy correction has identical version/executable behavior and passes subsequent syntax/smoke/design/payload checks. Original failures and causal negative controls are retained. Published as a2357665; both v2.103.2 hosted runs passed 52 suites and exposed the overflow-fixture assumption followed up in v2.103.4.

**15G triage fixture:** a delayed-collapse control reproduces premature bar sampling. Wait for actual overlay closure before the original handoff assertions; retain mid-morph visibility, no-replay, bar/focus and reduced-motion controls. The initial 52-pass/one-flake gate remains retained; final gate passes53 suites with zero flaky/failed results.

**15G Focus fixture isolation:** an overlapping unrelated writer reproduces the original three-second ledger timeout before the scoped mock and passes after. The unrelated request is forwarded, not suppressed; the Focus reply is still validated/displayed. Full-suite timing/assertions remain unchanged; bounded failure diagnostics exclude credentials/content. Both initial52-pass/one-flake gates remain diagnostic evidence.


**15G overflow fixture (BUG-137):** verify desktop fit/no motion, narrow scrolling and widening using a valid 14-word answer long enough for Linux’s narrow answer area. Preserve 320px, exact text/reaction, native-overflow reporting and deadlines.

**15G final local release evidence (v2.103.4):** isolated 53-suite gate passes with zero flaky/failed results; all 29 proportional-font Focus groups pass. All five v2.103.4 performance runs pass unchanged budgets: worst cold blocking 67 ms / 200 ms, cold FCP 6712 ms / 7000 ms, warm FCP 124 ms / 500 ms and Focus 38 ms / 300 ms. Payload is 1201.1 KiB decoded / 341.0 KiB Brotli with 38 eager scripts. Only the version key/cache literal changed after the full gate; equivalence and subsequent smoke/lint/payload checks are retained. Hosted and deployed results belong to the exact published release.

**15G input fixture (v2.103.5):** no portable launch-flag assumption. JS and test-page CSSOM resolve the same hover/pointer capabilities while keeping production selectors/declarations and width/motion conditions. Assert CSS input sentinels and unchanged declarations; the critical 320px case deliberately uses native no-hover hardware, preserves it on resize, and checks desktop fit, narrow scrolling, widening, keyboard/rating/layout and native overflow-reporting. Before-control fails; all 29 groups pass after. Both v2.103.4 hosted failures remain evidence. External BUG-138 requires absence of the hosting-injected RUM script on both actual deployments; local-source lint cannot certify that setting.

**15G final input-model release evidence:** The frozen v2.103.5 candidate passes all 53 functional suites with zero flaky/failed results and all five performance runs with unchanged limits; payload passes at 1201.1 KiB decoded / 340.9 KiB Brotli / 38 eager scripts. All 149 runtime/test fingerprints stay unchanged across the gates. Original failures and no-hover before/after controls remain retained. Exact-commit hosted confirmation and installed acceptance are separate. No post-gate runtime, test, version or About-copy mutation. BUG-138 remains an external hosting-setting action.

**15E Gmail next-result loop (v2.104.0 dev):** existing 42 Gmail checks plus 37 actual-component feedback groups cover same-query exclusion, no request on votes, empty/error/identical replacement, exact writer/owner/source/draft identities, next-visit/device-local pickup, combined concerns, legacy task-only scope, withdrawn cross-task support, Focus shortcut/answer isolation, one-per-visit limits, revision/toggle/Undo/clear, original expiry/caps, source edits, held headers/list/draft bodies, Memory/AI/Gmail Forget, access refresh, incoming clear, cross-tab focus and native320px/24px/axe controls. The actual backup payload is unchanged before/after a vote, including schema/size and absence of email/draft identities. Service-worker checks import the actual lazy Gmail controls offline. Keep standalone-component mounts distinct from real Focus UI/exit checks. Combined local release checks pass: 54 suites, zero flaky/failed results, all five performance runs and unchanged payload budgets (1200.7 KiB decoded / 340.8 KiB Brotli / 38 eager scripts). Original fixture/audit failures are retained in `.context/15e-gmail/`. Fictional fixtures use no real account or provider calls; prose-quality claims need actual outputs and usefulness remains a release+14day verdict.
