# Historical engineering structure and operating snapshots

## Hierarchy

```
memory/
├── Rules.md           (~50 lines)   ← ALWAYS READ FIRST
├── Changelog.md       (~130 lines)  ← Version history only
│
├── design/
│   ├── Tokens.md      (~200 lines)  ← CSS variables, colors, fonts
│   ├── Components.md  (~300 lines)  ← UI component specs
│   ├── Motion.md      (~150 lines)  ← Animation rules
│   └── Layout.md      (~200 lines)  ← Structure, z-index, positioning
│
├── architecture/
│   ├── Data.md        (~200 lines)  ← localStorage schema, IDs
│   ├── Sync.md        (~200 lines)  ← Dropbox, merge logic
│   ├── AI.md          (~200 lines)  ← AI companion system
│   └── Build.md       (~50 lines)   ← Build system docs
│
└── research/
    ├── Integrations.md (~300 lines) ← API research (Trello, Todoist)
    ├── Psychology.md   (~400 lines) ← User behavior, emotional design
    └── Features.md     (~500 lines) ← Feature explorations
```

## Reading Strategy

| Task | Files to Read |
|------|---------------|
| Any change | `Rules.md` (always) |
| CSS/visual | `Rules.md` → `design/Tokens.md` |
| New component | `Rules.md` → `design/Components.md` |
| Animation | `Rules.md` → `design/Motion.md` |
| Data/storage | `Rules.md` → `architecture/Data.md` |
| Sync logic | `Rules.md` → `architecture/Sync.md` |
| AI features | `Rules.md` → `architecture/AI.md` |
| New feature | `Rules.md` → relevant `research/*.md` |

## Token Savings

| Before | After |
|--------|-------|
| Read 945-line Design.md | Read ~200-line specific file |
| Read 635-line Architecture.md | Read ~200-line specific file |
| Read 1273-line Research.md | Read ~400-line specific file |

**Estimated savings: 60-70% per task**

## Quick Reference (in Rules.md)

Rules.md should contain pointers:
```markdown
## File Guide
- CSS tokens → design/Tokens.md
- Component specs → design/Components.md
- Data schema → architecture/Data.md
- AI system → architecture/AI.md
```


## Operating context snapshot 2026-11-05

Moved from Rules during the agreed documentation cleanup. This is historical context, not current policy. Current rules remain in [Rules](../Rules.md), procedures in [Housekeeping](../Housekeeping.md), active work in [Backlog](../Backlog.md), defects in [Bugs](../Bugs.md), and release proof in [the CI contract](../../docs/ci-release-evidence.md). No failed evidence or unresolved verdict was erased.

## Current Focus (reviewed 2026-10-30)

Versioned checkpoints below preserve earlier publication boundaries and test evidence. The current release state and accepted CI proof above supersede their then-pending release gates; product/installed acceptance remains separate.

- **Top product priority (Can, October 25): AI continuous improvement, Backlog #15.** Can explicitly chose **3.0.0** as the target for the complete update (start of 3.x.x); retain actual prerequisite version history and cut app/SW/changelogs together only for the agreed release scope. Item letters A–G are identifiers, not execution order; use Backlog’s execution column. `docs/ai-improvement-cycle.md` owns the reviewed lifecycle, privacy/style decisions and delivery dependencies; Backlog’s #15A–15G table owns the single work queue. Ordinary nudge/feelings/pool/Focus/enrichment improvement is consolidated there, with post-add outcomes retained. Shared contracts do not mean shared raw history or another AI orchestrator. Style adaptation is a first-class unfinished requirement, not established by reuse, changed sentences or tests.
- **Release state:** v2.106.2 is the dev candidate for BUG-139 accepted-reading stability; v2.106.1 (`946dc046`) is published on master. The accepted v2.106.0 proof does not approve either newer SHA. Master41042013402 failed with59 passing suites/one flaky/one failed under BUG-137 (pool-wording clearing and reflection display). Preserve that failure and the retained local/deployed performance failures under BUG-135; its current investigation remains separate. Automatic critic/instruction self-editing stays off, and complete v3.0.0 acceptance remains open.
- **15D v2.106.0 dev:** Can approved optional hard-to-follow / too-formal feedback on October 29 for the same unchanged task or habit on this device for 7 days (20 owners / 16 KiB). Only fixed concerns guide a later explicit Ask; earlier answers stay private across sessions, whole votes remain session-only, and no sync/backup or automatic request is added. Preserve the isolated answer line, right-edge feedback, optional disclosure and neutral dismissal. Source edits/deletion/completion, expiry, clear and AI Forget withdraw influence and fence late responses. See `docs/focus-feedback-plan.md`; real-use writing acceptance remains open.
- **15C wording, v2.105.0:** Can explicitly approved optional hard-to-follow / too-formal choices and same-surface fixed-concern writer guidance on October 28. Prior pool prose and private miss reasons stay out of guidance; whole votes retain selection/cooldown/retirement meanings. Existing synced spokenLines supply exact-reading support for 30 days / 120 rows; optional metadata adds at most 32 KiB to schema 5.5. Revision/clear/Undo, independent event clocks, withdrawn-source markers and max-wins clears protect sync/late replies. Feedback makes no request and accepted daily caches stay stable. See `docs/pool-wording-plan.md`; the isolated 55-suite/zero-flake and five-run gates pass, and actual Root integration checks pass. Separate pending Root changes still need their own combined release gate. Real writing quality/usefulness and the full 3.0.0 scope remain open. Automatic critic stays off.
- **v2.105.1 pool verification:** encoded font paths must be decoded and DM Mono 300/400/500 loaded/checked before pool layout assertions. Original server fails the check; fixed 52 groups, local 55-suite/zero-flake gate and all five performance runs pass unchanged limits. Same product runtime/feedback contract. Can reserved 105.1 for this correction; the parallel CI release rebases afterward.
- **15E Gmail v2.104.0 dev:** exact-thread rejection/explicit same-query replacement and optional exact-draft wording feedback reach the next eligible result. Can explicitly approved device-local cross-task Gmail wording on October 28; thread rejection remains task-local and old task-only votes keep their scope. Feedback stays within the existing 24h cache, 20 supported owners/16KiB, separate from other surfaces and backup. Preserve writer/owner/source/expiry/clear/grant/visit fences, no calls on reactions, one explicit alternative per visit and unchanged accepted drafts on empty/identical/failure. Existing 42 Gmail checks and 37 new actual-component groups pass. Combined local release checks pass: 54 suites, zero flaky/failed results, all five performance runs and unchanged payload budgets (1200.7 KiB decoded / 340.8 KiB Brotli / 38 eager scripts). Real writing/account acceptance remains separate. No live model quality claim without an approved workspace credential. The scoped Gmail dev candidate also passes all 54 suites (zero flaky/failed) and all five performance runs with unchanged budgets: 1200.5 KiB decoded / 340.8 KiB Brotli / 38 eager scripts. All 157 runtime/test fingerprints remain unchanged. This release excludes the pending Focus/accessibility and oil-splitting edits.
- **15E v2.103.0:** Can explicitly approved device-local cross-task web/Trello wording guidance using only fixed concerns in the existing capped cache; previous card prose stays private. Preserve optional native disclosure, no call/rewrite on feedback, clear all/eligible Undo, source/deletion/expiry/incoming-memory-clear fences and one explicit alternative per focus visit. The eight-output actual-Haiku writing comparison is mixed/iterate, not evidence of broad quality or learned taste. Automatic evaluator revision remains off; Gmail and the complete 3.0.0 scope remain separate. 53-suite/payload gates pass in the isolated candidate; the five-run performance gate fails (BUG-135). Can requested publication to dev and master after that failure was reported; BUG-135 remains open. Parallel Focus edits are excluded. Can explicitly requested “push to dev and master” on October 28; publish only the verified scoped candidate, preserving the parallel Focus changes.
- **15G v2.103.5 input fixture:** the v2.103.4 hosted runs still failed because JS forced desktop while native CSS had no hover. Test-only JS/CSS hardware predicates now agree without changing production declarations or width/motion queries; the exact-answer 320px case deliberately starts on native no-hover hardware. Before-control fails, all 29 Focus groups pass after. The frozen v2.103.5 candidate passes all 53 functional suites with zero flaky/failed results and all five performance runs with unchanged limits; payload passes at 1201.1 KiB decoded / 340.9 KiB Brotli / 38 eager scripts. All 149 runtime/test fingerprints stay unchanged across the gates. Original failures and no-hover before/after controls remain retained. Exact-commit hosted confirmation and installed acceptance are separate. BUG-138 later closed October 30: Can disabled RUM, and deployed HTML checks verified its removal on both origins. Rule 32 still excludes analytics SDKs.
- **Earlier 15G v2.103.4 evidence:** startup audio readiness and failed-precache rollback have causal before/after coverage; clean-CI fixtures, actual triage-close/request-ledger races and the hosted short-answer overflow assumption are repaired. The isolated revised gate passes all 53 suites with zero flaky/failed results; the proportional-font Focus control passes all 29 groups. v2.103.2 passed the five-run performance gate and was published to dev/master, where both runs exposed the remaining overflow assumption. Retain those failures and verify exact-release hosted/deployed evidence separately. Parallel Focus/accessibility and task-splitting changes are excluded. All five v2.103.4 performance runs pass unchanged budgets: worst cold blocking 67 ms / 200 ms, cold FCP 6712 ms / 7000 ms, warm FCP 124 ms / 500 ms and Focus 38 ms / 300 ms. Payload is 1201.1 KiB decoded / 341.0 KiB Brotli with 38 eager scripts. Installed acceptance and writing quality stay open.
- **Other open checks:** observation-pool usefulness (October 15), enrichment/Connections attention (October 20), daily-nudge quality/delivery (October 23), HOW DAYS FELT (October 25), PATTERNS/length recovery/triage touch (October 27), Calendar-supported writer (October 28), KNOWN (November 1), and task Focus Ask (provisional November 7 after deployment). Desktop habit Ask was kept by Can on October 25 for consistency despite low use; do not reopen the obsolete October 31 keep/removal checkpoint. Its future feedback is #15D, and a new morning habit contribution remains separately gated. Real-use/account/device checks stay distinct from implementation. DreamBank M2 waits for natural exposure; M3, WEEK and New week are not unlocked by implementation or an unrelated positive reading.
- **Life Exploration and native Memory, v3.2.0 (November 4):** v3.1 shipped to dev; Can approved integrating the landing and actual TODAY data. [Native contract](../../docs/exploration-data-integration.md). Keep personal data in Dropbox, not source. TODAY context is explicit, bounded and source-linked; feelings/dreams/mail/Calendar stay separate. Schema 2 protects linked readings from older writers; source withdrawal withholds replies without deleting their raw history. Existing #15, real-use and installed acceptance gates stay separate. v3.2.1 restores the approved conversation hierarchy: checkpoints can evolve outside TODAY, optional imports/sources/tools live in Notes, and explained creation enables context only for new documents.
- **Recent:** see `Changelog.md` (last ~20 versions) for exact behavior.
- **Module extraction: COMPLETE.** Runtime ownership and the startup composition boundary are documented in `design/Components.md`; new behavior belongs in the owning module and its component contract.
- **10b foundation live (v2.94.0, dev + production):** separate read-only Google Calendar connection and transient primary-calendar timing; Cloud API/scope configuration verified. **v2.96.0 release approved (2026-10-14):** optional derived same-task timing support for the ordinary daily writer, only on explicit duration/deadline evidence; no raw event details/times in AI, title import, new scopes, calendar writes, agenda or automatic recording. Ordinary input stays unchanged without support; pool/Sunday/focus unchanged. Real consent, refresh and Forget checks on desktop/phone remain owed before the meeting-start offer; Granola remains separate/not started.
- **Machine routing guard:** before any agent changes Headroom, a model provider/base URL, proxy/wrapper, port/mode, runtime override, or Headroom version, read `/Users/can/.headroom/ROUTING-GUARD.md` and obtain Can's explicit approval for that exact change. Keep Codex on explicit `127.0.0.1`, not `localhost`. Do not run `headroom learn --verbosity --apply`: v0.35.0 learns from Claude history only but hot-enables a proxy-global output shaper that can also affect Codex.
- **Watch for (open items only — verified history lives in Changelog.md / archives):**
  - **v3.3.3 nudge release fixture:** Linux41934464822 passes61 suites including Explore/Assistant but records a nudge fallback-upgrade flake. Wait for the actual cache prerequisite, then invoke the real backstop inside the unchanged overall bound. Keep old/after/broken-backstop controls and failed hosted receipts; no runtime/policy/budget change. The authorized master push still waits for this exact candidate’s full proof.
  - **v3.3.2 full release checkpoint:** explicit Actions dispatch is403 and browser control is unavailable; a documented shell-comment checkpoint uses the existing conservative foundation full fallback. All62 suites, five performance runs and exact-SHA preflight remain mandatory; no policy/budget/access changes.
  - **v3.3.1 release check repair:** dev41932445980 at1a9f9716 failed on an Exploration screenshot parent absent in a fresh checkout, plus a separate Assistant startup flake. Save the screenshot under the suite-created directory; preserve all original evidence/assertions/deadlines. New exact-commit full Linux and five-run proof must pass before the already-authorized master push.
  - **BUG-143/144 🔧 local v3.3.0 — Exploration replies and interaction.** Accept the existing proxy’s direct/wrapped structured output with unchanged source/bounds checks. Open the native shell before imports, preserve cancellation/focus, settle loaded content, simplify controls and show suggestion outcomes. Local component/accessibility/visual checks and all five performance runs pass. Retain the prior footer-vote fixture failure/scroll repair and current full-run nudge browser-startup flake (retry passed; strict gate failed). All six final title/save-recovery/component checks pass separately. The approved clarity prototype is now integrated locally: first-experience Send and focused note/source/document views; Memory prepares code/CSS only and removes redundant display labels without changing source signatures. Installed/live usefulness and publication remain separate.
  - **BUG-142 ⏳ v3.2.2 dev candidate — release visual sampler.** Full release41828799949 failed only the mobile background comparison. The below-last-row point enters the fixed footer fade; sample beside an uncovered row without raising tolerances or changing baselines/CSS. Original noise regression remains detected. Master promotion waits for new exact-SHA full Linux/five-run proof.
  - **BUG-139 ⏳ v2.106.2 dev candidate — accepted daily reading.** Remove completion-word retirement: without a verified task link, keep the accepted local-day reading and feedback in About. Preserve the current writer and strip dismissal/noon/sync/day boundaries. Eight affected suites (including56 delivery lifecycles), lint and invariants pass with unchanged inputs; receipts live under `.context/nudge-retention-fix/`. Publication and normal morning acceptance remain separate.
  - **BUG-137 ⏳ v2.106.1 — hosted regression gate.** The earlier Calendar/enrichment/Focus fixtures pass, but master41042013402 records59 passes/one flake/one failure: pool-wording Sunday incoming-clear and configured reflection display. Preserve original failures; cause is unestablished and targeted green suites do not clear this gate.
  - **BUG-135 🔍 v2.106.0 — startup performance.** The integrated 61-suite functional gate passes, but original Chrome156 and configured Chrome for Testing152 local benchmarks fail unchanged timing limits. Ordered startup and previous audio fixes do not establish complete recovery. Both failed measurements remain retained; hosted v2.106.0 release proof is accepted, while deployed/installed verification remains open.
  - **BUG-118 ⏳ v2.97.8 — daily nudge delivery/recovery (includes former BUG-120).** Shipped fixes through v2.97.5 cover transport/length recovery, strip/About agreement and gentle late delivery. **v2.97.8:** removes the word-pattern recap veto and allows legacy recap rejections to resume inside the original attempt budget; no rewrite loop. Real delivery/usefulness verification remains open. Use the content-free generation audit to distinguish rejection from delivery failure. Verify phone/desktop delivery and strip/About agreement after completions/sync; real AI dismissals remain final.
  - **v2.64.23 ⏳** — verify appMemory convergence across two devices after a few 7s sync cycles: `today_memory.semantic.length` and newly confirmed inferences should match without manual Restore Backup.
  - **v2.64.22 ⏳** — verify overnight sync hardening: streak does not re-inflate from yesterday, newest check/uncheck wins, and Trello configuration reaches the second device.
  - **v2.62.1 ⏳** — verify: `appMemory.patterns.triageUndos` increments on triage undo; `soonPulls` increments on pull-from-soon; `reviveReasons` populated on revive; letting the undo toast expire records letgoReasons.
  - **v2.62.0 ⏳** — verify: triage → completion screen → list is already clean behind overlay → Undo button visible → tap Undo → state fully restored → triage bar reappears. Also: wait 3s without tapping Undo → overlay closes → list stays clean.
  - **Meeting attribution accuracy — ask Can:** after a few real meetings, ask "how's meeting attribution doing?" and read `appMemory.meetingAttribution` (`mineKept/mineShown` precision, `othersSelected/othersShown` recall).
  - **Noticed 7-signal expansion (v2.38.0)** — if it still reads as noise, ask whether Noticed needs a different shape.

---


## Housekeeping snapshot 2026-11-05

The procedure below is retained for history; use the current Housekeeping file for commands.

# Housekeeping & Maintenance

> Routines to keep the codebase and documentation optimized.

**CI efficiency complete (October 30, v2.106.0 dev/master):** routine dev work uses affected-suite selection with full fallbacks. Exact-SHA full Linux dev proof passed 61 suites, zero failures/flakes and all five performance runs; master verified reuse in 15 seconds, skipping duplicate suites/benchmark and dependency/browser setup while running cheap invariants and the final dependency check. Missing/incompatible proof restores the full gate; master-targeting PRs remain full. Local work stays targeted; after pushing, share the link/status and end the turn. [Accepted proof and operating contract](../../docs/ci-release-evidence.md); [phase-2 shadow checkpoints](../../docs/ci-shadow-checkpoints.md). Deployed/installed BUG-135 remains open. Hosting RUM BUG-138 is verified closed October 30 after Can disabled the setting and both origins stopped injecting the script.

---

## Pre-Session Checklist

Before starting work:

### 0. Log the session (3 lines, forces the scan)
```
Session N — vX.X.X · Nh
Unverified bugs: BUG-XXX, BUG-XXX
Goal: [what we're doing today]
```

### 1. Read Tier 1 files
1. `Rules.md` — Critical constraints + File Guide
2. `Housekeeping.md` — This file (routines, checklists)
3. `Backlog.md` — Pending work, watch decisions
4. `Bugs.md` — Known bugs, fix status, verification steps
5. `Changelog.md` — Recent changes

Then read Tier 2 files relevant to the task (see `Rules.md` File Guide).

---

## Post-Session Checklist

> **Ownership:** The agent maintains docs and performs independent verification. A reported technical defect may close with deployed checks or reproduction-equivalent actual-component tests when those cover its symptom and withdrawal/failure paths. Can verifies flows that depend on his live accounts, installed PWA or real-device experience; those product/account verdicts stay separate from a technically verified bug. Do not close an unresolved hosted failure from a different local pass.

### 1. Update both Changelogs (per version bump — not just at session end)
**The two changelogs have different audiences — write them differently:**

**a) `memory/Changelog.md`** — for dev sessions. Technical detail welcome: root causes, function names, design rationale.
```markdown
| **X.X.X** | **Feature name** — Brief description. |
```
After adding the new entry, count the rows. If there are more than 20, move the oldest excess rows (bottom of the table) to the top of `memory/archive/Changelog-archive.md` (after its `|---|---|` line). Do this in the same commit — not a separate session.

**b) `index.html` CHANGELOG object** — **user-facing** (renders in the About panel). Short, plain language, no lingo. Say what changed for the user, not how. One sentence, two max. No function names, no CSS properties, no root-cause archaeology, no version cross-references.
```javascript
'X.X.X': 'Feature name — what changed, in plain words.',
```
✗ `'Fix: #errorIndicator sat at top:8px but viewport-fit=cover draws under the status bar — offset by env(safe-area-inset-top).'`
✓ `'Fix: error dot was hidden behind the status bar on mobile — now visible.'`

### 2. Review & Update Memory Files
**Every change should trigger a memory review.** Ask: "Does this change affect any documented behavior?"
**If the change adds/modifies a recurring surface** (message, badge, panel, animation, AI feature): run the Wallpaper Test gates W1–W2 (`Test-matrix.md` → Design Review Gate). **Passing W1–W2 creates a dated row in `Backlog.md` → Watching** — `Surface | shipped vX.X.X | W3 due <ship date + 14d>` — so the day-14 check is an artifact, not something to remember. The loop only closes when that row is resolved (kept / iterated / removed).
- Bug fix → `Bugs.md` (update status, add verification steps)
- New rule → `Rules.md`
- Data/localStorage change → `architecture/Data.md`
- Sync behavior → `architecture/Sync.md`
- AI companion → `architecture/AI.md`
- Focus/timer → `architecture/Focus.md`
- UI components → `design/Components.md`
- Animation → `design/Motion.md`
- Design philosophy → `design/Philosophy.md`
- Colors/tokens → `design/Tokens.md`
- User psychology → `research/Psychology.md`
- Time/zones → `research/Temporal.md`
- Integrations → `research/Integrations.md`
- Prototype work → `Backlog.md`

### 3. Version Bump
- `index.html`: **`APP_VERSION` is derived** — `Object.keys(CHANGELOG)[0]`. Don't hand-type it;
  add the new entry at the **top** of the `CHANGELOG` object and it follows automatically.
- `index.html`: Update `DEV_HOURS` (add session time to current value)
- `sw.js`: Update `CACHE_VERSION` to `today-v{newest version}` — the one value still hand-synced.
  The smoke test asserts it matches and fails the pre-commit gate on drift, so it can't be forgotten.

**Which digit → `Rules.md` § Version Bumping (vA.BB.CC).** Consult the table **before** writing the
new number — 2.17.x ran 100+ patches (Jun 2026) because bumps were done reflexively without checking
it; the daily poem should have been 2.18.0. No retroactive renumbering — the next qualifying feature
rolls the minor.

**Commit type → segment** (so the type and the bump never disagree):

| Commit type | Segment | |
|---|---|---|
| `feat` | **BB** (minor) | new feature / UI section / integration — reset CC to 0 |
| `fix` `refactor` `style` `chore` `docs` | **CC** (patch) | fix / polish / cleanup / docs |
| breaking / redesign / migration | **A** (major) | reset BB and CC to 0 |

**Mixed commit → the highest applicable segment wins** (a feat+fix is a minor). When in doubt,
round up — a patch that should have been a minor is the cheaper mistake than the reverse.

### 4. Commit Format
```
type: brief description (vX.X.X)
```
Types: `feat`, `fix`, `docs`, `refactor`, `style`, `chore`

**Committing and pushing are human-gated** — prep the bump/changelog/doc updates automatically, but
wait for Can to say so. When he does, commit and immediately push to `dev` — no separate
confirmation needed for the push. Push to `master` only when explicitly asked.
See `Rules.md` § Operating Mode for the full discipline-vs-gate split.

### 5. Reflect
- What broke or was harder than expected?
- Any pattern worth adding to `Rules.md`?
- Any routine that failed? Fix it now, not later.

---

## Production Tests (Can's responsibility)

> Run after deploying to production. Local automation covers many flows, while connected-account and real-device checks still need Can.
> **See `Test-matrix.md` → Pre-Release Checklist (9 tests)**

Quick smoke test after any deploy:
- [ ] App loads, splash dismisses
- [ ] Add task, check task, delete task
- [ ] Sync triggers (if Dropbox connected)
- [ ] No red dot appears
- [ ] Visual intact — no broken layout

---

## Periodic Maintenance

> These run on a best-effort basis — not a hard schedule. Do them when the session is light or things feel cluttered.

### Occasionally: Quality Check
- Run from repo root: `bash memory/validate-files.sh` — checks all memory files are in File Guide
- Review `Backlog.md` — any stale items to close or move to Not Implementing?
- Check `Bugs.md` — any "awaiting" bugs that have been soaking for 3+ sessions? Follow up with Can.
- **Wallpaper audit (W3):** any recurring surface shipped ~2+ weeks ago — ask Can whether it still delivers each time it appears, or has become skippable. Iterate or remove (removal is a valid outcome).

### Occasionally: Documentation Audit
- Any architecture doc drifting from reality? Spot-check against code
- Update version references in performance audit, component docs

---

## File Size Guidance

No hard limits — but when files get large they slow down Tier 1 reads. Use judgement:

| File | Note |
|------|------|
| `Rules.md` | Keep focused — if a rule belongs in a Tier 2 doc, move it there |
| `Bugs.md` | Grows naturally — archive verified bugs older than ~3 months if file exceeds 400 lines |
| `Changelog.md` | Keep last ~20 versions. Older entries → `Changelog-archive.md` |
| Architecture docs | Split if over 200 lines |
| Research docs | Keep concise — decided research should be < 50 lines |

---

## Research and session conventions

| Context | Use |
|---------|-----|
| Searching Coda | `/browse` skill — not raw WebFetch or grep |
| Poem display in chat | Real line breaks, one per line, in a blockquote. Never `/` as an inline separator. |

**Poem curation search process:** Broaden discovery before narrowing candidates — national libraries, university digital collections, regional/bilingual anthologies, oral-literature archives, historical journals, author/translator archives. Generic poetry sites only as leads or cross-checks; Gutenberg, Wikisource, and Internet Archive for exact text and PD verification. WebSearch to identify a specific poem or collection → targeted fetch of the relevant page only; no bulk-fetching. Work inline in the main conversation, not via agents.

---

## Code Reading Discipline

- Search filenames and symbols before opening large files; use `rg` when available, otherwise `grep`/`find`.
- Read a useful surrounding range once. Re-read it if another session or an edit may have changed it.
- Inspect the final diff before handoff, especially in files shared with another session.

---

## Code Hygiene

### Before Committing

**CI handoff (Can, October 28):** after an authorized push, confirm the branch/commit, share the CI run link and current status, then end the turn. CI continues independently. Do not poll, run background watches, sleep or send repeated progress messages while waiting for hosted CI. A later status request gets one concise check; continuous monitoring requires an explicit request. When inspecting results, read the compact summary and only necessary failure logs. Existing validation and publication gates remain required.
- [ ] **Hosting privacy check after hosting/analytics-setting changes:** keep Netlify RUM disabled. Verify fresh `/` and `/index.html` responses on dev and production contain no injected `netlify-rum-container` or `/.netlify/scripts/rum` script. BUG-138 was verified closed October 30; this external setting is independent of CI proof and performance budgets.
- [ ] **Run affected checks for routine dev work:** `npm run test:changed --prefix scripts` (use `-- --base origin/dev` for a committed candidate). Inspect the plan/summary; shared or unknown inputs still run everything. Payload and invariants remain included. Selected passes are not release approval.
- [ ] **After phase3 activation, release/master gate:** run affected local checks, then require one successful full Linux functional/five-run report for the exact committed dev candidate. Check `release:preflight` immediately before an authorized identical-SHA master fast-forward. Reuse a qualifying automatic full dev result; dispatch only when proof is missing. Master verifies proof plus cheap invariants, with full fallback. Do not repeat full local/dev/master gates by habit. Until activation is published, the existing full local/release gate remains in force. Payload limits and all timing budgets stay unchanged.
- [ ] Run syntax check: `node -e "const fs=require('fs');const c=fs.readFileSync('index.html','utf8');const s=c.slice(c.indexOf('<script>')+8,c.lastIndexOf('</script>'));try{new Function(s);console.log('OK')}catch(e){console.log('ERROR:',e.message)}"`
- [ ] **Run smoke test** (any change touching index.html/sw.js/assets): `node scripts/smoke-test.mjs` — boots the app headless, splash dismisses, add+check a task, zero uncaught errors. ~10s. First-time setup: `cd scripts && npm install`. Caught a real boot-killing TDZ crash on its first ever run (v2.17.99 dev).
- [ ] **Run drag test** (any change touching `drag.js`, manual/Trello/habit reorder, or their persistence): `node scripts/drag-test.mjs` — covers desktop and touch reorder for all three lists, persistence/recency/autosave signals, guards, cross-list rejection, long-press cancellation, ghost/class cleanup, module wiring, and SW precaching.
- [ ] **Run platform test** (any change touching `platform.js`, PWA installation, mobile keyboard positioning, service-worker registration, or bfcache handling): `node scripts/platform-test.mjs` — covers native install events, Safari/Firefox promotion, fixed-height instructions, standalone suppression, `visualViewport`, `/sw.js` registration, and persisted `pageshow` wake dispatch.
- [ ] **Run service-worker test** (any change touching `sw.js`, the app-shell list, registration/update behavior, or offline fallback): `node scripts/service-worker-test.mjs` — installs the real worker, verifies every shell resource is cached, exercises update takeover and stale-cache purge, then loads both the cached app and branded fallback through failed network paths.
- [ ] **Run timezone test** (any change touching `_getAppDay`, `_localISO`, habit rollover, or date boundaries): `node scripts/timezone-test.mjs` — fixed instants across Los Angeles, Kiritimati, and Kathmandu, including spring-forward and both fall-back 1am hours.
- [ ] **Run voice capture test** (any change touching `voice-capture.js`, its Shift+Space gesture, microphone fallback, or transcription states): `node scripts/voice-capture-test.mjs` — verifies explicit on-device recognition, the one-blob Gemini fallback, both modifier-release orders, input/repeat guards, media cleanup, success, and honest failure.
- [ ] **Run focus test** (any change touching the focus IIFE, `trello.js`, or the renderers): `node scripts/focus-test.mjs` — ~40s, silent on success. **How it works:** focus mode has exactly two legal states — OFF (no `.focused`, no `.focusing`, no persisted session, timer parked in `<body>`) and ON (exactly one `.focused` task that owns the timer, the persisted session and `.focusing`). Anything else is a bug, and every focus bug on record is one of those two being violated. The test defines both states once and re-checks after *every* operation, so it catches bugs we have not had yet — rather than scripting one assertion per past bug. A 12-row operation matrix walks all four reachable exit paths (escape, click-outside, task switch, check-off — BUG-065's root cause was that *every* exit leaked, so testing one would miss the rest), interleaving a render tick after each, plus rapid A→B→A inside the 200ms teardown window. Then: the invariant survives a reload, a render never resurrects focus (cold-start-only restore), cold-start restore still works, a session for an already-done task is discarded, background auto-complete records 25 min silently, and post-midnight completion preserves yesterday (BUG-063). Section 4 adds a **cross-device axis**: `mergeRemoteData()` takes a plain object, so another device is simulated with no Dropbox and no network — a value adopted from another device must arrive stamped as today's and survive the cleanup that runs after the restore (BUG-066), max must still win, and remote's yesterday total must never restore as today (BUG-024). **Why this area:** focus is 16 of 59 recorded bugs (27%). Teeth verified by reverting each of the four real fixes independently — all produce exit 1. Document PiP is behaviorally faked in-page to cover open-on-hide, mirrored state/accessibility, Open, Breathe/Resume, complete/Again, restart, Rest, close, and storage cleanup; real browser PiP remains a manual release check. Not covered (needs `taskStates` internals): `.complete` bleed (BUG-022/028), frozen 00:00 on re-open (BUG-027) — human checks in `Test-matrix.md`. Skip for docs/poem/prompt-only commits. If it goes flaky, delete it rather than nurse it.
- [ ] **Run design lint** (any change touching CSS or user-facing strings): `node scripts/design-lint.mjs` — static analysis, no browser, ~1s. Catches hardcoded hex/rgba outside `:root` (Rule 19), `transition: all`, undefined CSS vars, banned vocabulary (Philosophy.md), exclamation marks in strings, missing `U+FE0E` emoji selectors (Rule 20, self-calibrated — flags a glyph if the *same* glyph carries the selector elsewhere in the file but this occurrence doesn't), and a soft Rule 27 render-path parity check. Mechanical only — it does not judge voice, taste, or philosophy fit.
- [ ] **Run accessibility test** (any change touching reachable UI, semantics, contrast, focus, dialogs, or reordering): `node scripts/accessibility-test.mjs` — axe-core plus keyboard/state, hidden-tree, zoom, target-size, and 320px reflow assertions. Manual VoiceOver and real PiP passes remain required for releases that touch those surfaces.
- [ ] **For anything touching voice, a new/changed recurring surface, or component design** — review against `Design.md` and its linked Philosophy, Tokens, Components, Motion, and Psychology notes, including the Wallpaper Test for recurring surfaces. Claude sessions may use `.claude/commands/design-review.md` for the same judgment review. This complements the mechanical gates.
- [ ] No console.log debugging left
- [ ] No hardcoded test values (like 10s idle timer)
- [ ] Version numbers match across files
- [ ] SW cache version updated

### Naming Conventions
- Functions: `camelCase`, prefix private with `_`
- CSS tokens: `--kebab-case`
- localStorage keys: `snake_case` with `today_` prefix
- IDs: `type_timestamp` (e.g., `manual_1234567890`)

**v2.106.0 release integration:** retain the published release-evidence.mjs, release-status.mjs and ci-final.mjs ownership. Retain the separately published v2.105.7 activation; this candidate requires its own verified full dev proof before master promotion. The default branch already contains the v2.105.6 workflow. No automatic branch promotion or post-push monitoring; unavailable proof requests full validation. The parallel unpublished CI alternative is archived under .context/15gd.
