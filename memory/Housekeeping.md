# Development routines

Rules owns durable constraints; this file owns procedures. Current priorities are in Backlog, defects in Bugs, release history in Changelog, and proof requirements in the [CI contract](../docs/ci-release-evidence.md). The [previous routines](archive/Structure.md#housekeeping-snapshot-2026-11-05) remain available for historical detail.

## Start a task

1. Read Rules and the current Backlog priority. Consult the relevant defect, component and architecture entries.
2. Work in your own worktree, never in a checkout another session uses (Rule 33). In a fresh Conductor workspace you already have one; otherwise `git worktree add --detach ../today-<topic> origin/dev`, then `bash scripts/dev.sh setup` there (or symlink `scripts/node_modules`). Remove it with `git worktree remove` when published.
3. Identify the intended behavior and the smallest useful verification. Design changes use the actual native component/tokens and the agreed design review workflow.

## Workspace hooks

`bash scripts/dev.sh setup` prepares dependencies in this workspace only. It never pulls into the shared repository root and never swallows failures. A matching lockfile/install is reused. The launcher selects the already-installed CI Node for this command; it does not install Node or alter global runtime/routing settings.

`bash scripts/dev.sh archive` runs the existing invariants, including all runtime/tooling syntax checks, payload, release-metadata parity, memory inventory and whitespace. It replaces the old single-inline-script compilation.

Conductor reads shared repository settings from the remote default branch for local workspaces. Local edits to the hooks require the normal authorized publication before Conductor uses them; direct commands can be tested immediately. The development server and its allocated port remain unchanged.

## Fast local verification

- `npm run check:fresh --prefix scripts` runs smoke plus cheap invariants.
- `npm run check:fresh --prefix scripts -- --suites exploration-test` runs that owning suite plus invariants. Multiple explicit suites are comma-separated.
- The fresh snapshot includes current tracked edits, additions and deletions. It excludes ignored personal/generated state; unknown untracked paths are refused. It reuses Git objects, installed dependencies and the cached locked browser. It does not reinstall packages, download a browser or silently expand to the full gate.
- Results are compact; detailed evidence stays in `.context/fresh-*/`. Temporary checkouts are removed. This is a local preflight, never hosted release proof.
- Use affected-suite planning for wider verification when warranted. Shared or unknown changes retain existing full fallbacks. Five-run performance remains a release gate, not a routine fresh-check cost.

## CI execution and evidence

Hosted functional checks use up to five independent runners, balanced by advisory suite weights. The existing planner still chooses coverage, and the final `test` gate checks every result. Five-run performance stays on a separate runner; verified master reuse skips both jobs. Payload fails before browser setup. See the [CI contract](../docs/ci-release-evidence.md#parallel-execution-november-8) for evidence and failure handling. A failed parallel workflow needs **Re-run all jobs**, since reports from separate run attempts cannot be mixed. Keep local fresh checks scoped to affected suites; do not run the full inventory locally just to duplicate the hosted release gate.

## Dependable tests

Wait for the actual prerequisite and then assert the observable outcome inside a bounded deadline. Use existing fixture clocks/fonts/readiness helpers. When a demonstrated timing bug appears, preserve the failure, build a causal control, repair the driver or product, and verify that a deliberately broken path is still rejected. Do not expand deadlines, remove tests or accept diagnostic retries simply to make the gate green. Track unresolved flake causes honestly.

Each fixture owns its output directories and cleanup. Tests must not depend on earlier `.context` files, a live account or another test's browser state. A fresh owning-suite run before publication catches this class of mistake cheaply.

## Documentation and versioning

- Update the owning behavior contract when behavior changes. Keep durable constraints in Rules, procedures here, current work/verification in Backlog/Bugs and release history in Changelog.
- Record engineering-only changes in Changelog's engineering notes. They do not need an app/SW bump or an About announcement. Application changes follow Rules' existing semantic version scale and keep app/SW metadata aligned.
- For every change, add a note in `memory/changes/` (format in its README): `bump`, a technical-changelog `title` and body, and for app changes one plain-language `about` line. New bugs get their own note and a `BUG-{slug}` placeholder. Do not edit the version, About CHANGELOG, `sw.js`, the top of the technical changelog or the Bugs.md table by hand; `release:cut` writes them. DEV_HOURS stays a manual edit, only with Can's figure. Keep the newest twenty distinct application versions across technical changelog notes and table rows; move all older associated notes/rows to the archive in the same change. Check links after moving them and preserve the original text and evidence. About copy describes the user-visible change in plain language. Engineering-only commit messages need no new app version.
- `DEV_HOURS` is an approximate cumulative estimate supplied or confirmed by Can, not a release counter. Do not add one hour automatically per release. Use the wording and figure Can confirms; a confirmed display value need not carry an approximation marker.
- Link a single release receipt instead of copying evolving CI narratives across files. Preserve historical receipts and evidence; do not silently close unrelated acceptance gates.
- After moving documentation, verify critical rules and open reminders survived, relative links resolve and `bash memory/validate-files.sh` passes.

## Publish according to the request

1. Review final/staged diffs and run the appropriate local checks. Commit/push only within the user's authorization.
2. For a dev-only push, provide commit, CI link and current status, then hand off.
3. For dev and master, request full dev validation on the committed candidate. Existing shared/unknown fallbacks remain. An explicit commit trailer `CI-Validation: full` requests all suites and all five performance runs on a normal dev push, without changing API permissions or application files just to select CI. It does not authorize master publication.
4. Require complete successful exact-commit Linux evidence with no failed/flaky suites and all performance budgets passing. Run `release:preflight` immediately before the authorized identical-SHA fast-forward to master. Never amend or add a metadata commit between proof and promotion.
5. Give one concise final receipt: version/commit, branches, CI links/status and remaining acceptance limits. During an end-to-end operation report useful milestones, not repeated descriptions of an unchanged wait. Be token mindful: start one CI watcher with output redirected to local logs, wait for completion, and inspect the final result once. Do not repeatedly query an unchanged run, reread logs or send waiting updates. Recheck only on a failure, an actionable change or a user status request.

**From your own worktree:** commit your work and its note, run the affected checks (`npm run test:changed --prefix scripts` plus `node scripts/performance-test.mjs --payload-only`), then `npm run release:cut --prefix scripts`. It fetches dev, rebases your commits onto it, writes the release and prints the commit to publish. For a release that will go to master, use `release:cut -- --full`: it adds `CI-Validation: full`, so the dev push runs every suite and the performance gate, which `release:publish --master` requires (`release:dispatch` is not available to agent credentials). If another session published first, the publisher refuses the stale push; run `release:cut` again (it drops its own earlier cut and takes the next version and bug numbers), then publish the new commit. Each dev commit keeps its own CI run; a later push no longer cancels it. After a successful publish, `release:publish` moves the checkouts that opted in with an empty `.context/follow-dev` file (Can's `beirut` workspace) to the published commit, so the folder Can looks at does not fall behind dev. Other sessions' workspaces and pinned `.context/` evidence snapshots never move. Even an opted-in checkout stays put, with the reason listed, if it is on a branch, has uncommitted changes, is mid-merge/rebase, has its own commits or is under the temp directory.

Use `npm run release:publish --prefix scripts -- FULL_SHA [--master] [--suites name,name] [--run RUN_ID]` after reviewing and committing the candidate on dev or in your detached worktree. It validates locally, pushes dev and waits quietly. Only an authorised `--master` request invokes exact-SHA full proof/preflight, normal promotion and master CI. Add `CI-Validation: full` before committing a new master candidate. Default local validation is smoke plus invariants; pass the affected suites explicitly. The command preserves existing work, refuses stale/dirty/mismatched candidates and keeps raw logs with one `.context/publish-*/receipt.json`. Resume using the same SHA/run rather than starting duplicate CI. The existing status/preflight/dispatch commands remain authoritative; no background publishing service is enabled.

Netlify’s deploy skip check compares `CACHED_COMMIT_REF` with `COMMIT_REF`, not just `HEAD^` with `HEAD`: a validation-only promotion can contain earlier app changes that production has not built. Missing/equal/invalid baselines must build. Verify the public production version/source after promotion separately from GitHub CI. The actual ignore command has a real-Git regression in `netlify-security-test`.

## Product acceptance and maintenance

CI does not establish installed-device feel, live account access or useful AI writing. Retain the relevant manual/account checks in Bugs/Backlog. Recurring surfaces still require W1/W2 review in Test-matrix and a dated Backlog Watching row with the surface, shipped version and W3 due date (ship date + 14 days); do not infer that exposure or a positive unrelated reading unlocks deferred features.

For desktop PWA titlebar/header/overlay changes, complete the [installed title-area checklist](Test-matrix.md#installed-desktop-pwa-title-area-check) before marking the visual defect verified. Record the loaded candidate and installation origin separately from CI. A browser tab, another deployed branch or a synthetic overlay capture cannot satisfy this check. If the installed candidate is unavailable, keep that acceptance pending; do not interrupt a live Focus session to manufacture a pass.

Keep hosting privacy settings and the no-in-app-analytics rule. When those external settings change, verify fresh dev/production responses for unwanted injected scripts. Poem curation, rights checks, design judgments and existing privacy/sync boundaries retain their owning contracts.

### Research and session conventions

Poem curation broadens discovery through library, university, regional/bilingual and author/translator archives before narrowing candidates. Use generic poetry sites as leads; verify exact text and public-domain rights. Search for a specific poem/collection before targeted fetching; do not bulk-fetch. Work inline, without agents. Display poems with real line breaks in blockquotes. Coda searches use the established browse skill rather than raw fetching.

Periodically review stale Backlog items, unresolved verification and due Wallpaper audits; do not close them because documentation moved. Review the final diff, especially files shared with another session.

When a repeated failure appears, fix or automate the demonstrated cause before adding another rule. Keep raw technical logs outside the always-read instruction files. File size and reading effort are maintenance signals, not reasons to discard unresolved evidence.
