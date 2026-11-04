# Performance measurement review — October 30, 2026

**Authorized scope: measurement and documentation only.** Can stopped the BUG-135 runtime proposals and approved this review. Sync, Trello loading, splash, worker caching, enforced budgets and workflows are unchanged. The suggestions below are for review before changing test policy. Backlog owns follow-up work; this document records provenance and interpretation.

**Status: ⏳ v2.106.0 — verification still fails deployed timing limits (BUG-135).** The October 31 diagnostic below verifies installed-warm preparation in all five visits; complete installation alone does not clear the failures. Permanent benchmark/policy changes remain unimplemented, and deployed-limit applicability remains unresolved. Runtime proposals are withdrawn. No new lifecycle state, later phase, release waiver or verified-fix claim applies.

## October 31 verification

Can requested the check directly. One five-run set of live dev v2.106.4 uses locked Chrome152 / Node24.14.0, Mac arm64 and the existing deployed CPU1 / 1.6Mbps / 150ms profile. An isolated copy of the benchmark replaces the three-second readiness race with an activated, controlling worker and all72 expected shell paths present in the correct cache; preparation is reported separately and the whole subsequent navigation is timed. All five preparations and measured-version checks pass. Source/deployment fingerprints are stable before/after; the only raw source difference is the poem edge function's four expected social metadata values. No app code, tracked harness, workflow, budget or baseline changed.

Blocking117ms/200ms, coldFCP4568ms/7000ms, splash16072.3ms/23000ms, add11.9ms/100ms and Focus41.3ms/300ms pass. First byte1438.9ms/1000ms, repeatFCP/LCP3436ms/500ms and repeatInteractive3416.5ms/500ms fail. Repeat paints are716/740/972/3436/788ms despite complete installation. All repeat visits have zero blocking and6.6–7.3ms DOM-ready→bootstrap-interactive; worker responses use network, and the slowest repeat waits2119.6ms for poems.js delivery. This gives no evidence of a sync defect and authorizes no cache-strategy change. It does not clear the retained historical CPU4 Mac failures or constitute hosted release proof. Production was v2.106.3 at preflight, so this result applies to dev only.

Evidence and exact harness diff: `.context/bug135-verification-oct31/FINDINGS.md`, `installed-warm.json`, `installed-warm.json.runs.json`, `summary.json`, and before/after deployment manifests. Existing enforcement and all prior failures remain preserved. The proposed policy changes below remain proposals.

## Origin and authority

The coding assistant proposed a repeatable benchmark after the old performance snapshot became stale. Can approved the seven measurement steps, with an explicit stop before architectural optimization. The retained session transcript records the proposal/approval at lines 4331–4452 and Can's acceptance of the poem as a design trade-off at lines 4620–4674. Approval of the measurement system does not establish that Can selected each numerical limit.

[Commit dca05cbe](https://github.com/fixingman/TODAY/commit/dca05cbef92a95b3c599de03e42d9f38fd2479c9), September 19, introduced the budgets and committed the September 18 v2.90.30 baseline. Git records the user's author identity; the transcript attributes the implementation to the assistant. The limits are project regression policy. The checked-in record supplies no separate derivation for the exact 500ms warm or 1000ms first-byte limits and no measured connected-account baseline for them.

The original results are observations under one setup: five runs, local static server, fresh contexts, 4× CPU, 1.6Mbps download and 150ms configured latency. Original browser/Node metadata was not recorded. The chosen ceilings are distinct from the measured snapshot; neither is a universal statement of acceptable TODAY behavior.

## Limits and their evidence

Values below are milliseconds except CLS. Current enforcement remains in `scripts/performance-budgets.json`.

| Current timing limit | Original v2.90.30 measured worst | Provenance / interpretation |
|---|---:|---|
| Cold first byte: 1000 | 2.9 | Introduced in dca05cbe. The original local-server measurement does not calibrate DNS/TLS/CDN latency on a deployed origin. |
| Cold FCP: 7000 | 1184 | Initially 1800. October 5 / 6ba85ee1 recalibrated to 7000 after removing the decorative noise image exposed the later real-content paint. Can explicitly selected calibration; the 1800 reference goal remains visible. |
| Cold LCP: 10500 | 9484 | Includes the late intentional poem paint. The separate 2500 reference goal is not the accepted splash regression ceiling; Can accepted that design trade-off. |
| Cold and warm CLS: 0.1 | Cold 0.020 | Reference target and regression ceiling retained; it measures visual movement rather than completion of sync. |
| Cold blocking: 200 | 3 | App main-thread regression check. Preserve original long-task attribution and profile distinctions. |
| Cold DOM-ready / bootstrap interactive: 7000 each | 6075.6 / 6065 | End-of-document/startup marks; these do not establish that connected data finished loading. |
| Cold splash dismissed: 23000 | 17773.9 | Initially 19000. September 23 / d79871d6 covers longer approved poem holds and line exits. Deliberate presentation remains separately measured. |
| Warm FCP / LCP / interactive: 500 each | 108 / 144 / 129 | Original warm visit had worker control in 5/5 runs on a local server. Controller presence alone does not establish that responses came from Cache Storage. |
| Add-task response: 100 | 16.3 | Actual keydown to rendered state/frame; automation waiting is separate. |
| Focus-entry response: 300 | 176.3 | Actual input to rendered state/frame, including synchronous input work. |

Payload limits were also engineering choices: originally 1200KiB decoded shell, 350KiB Brotli shell, 70KiB Brotli HTML, 100KiB fonts and 37 eager scripts. Current decoded/script ceilings are 1204KiB/38 after separate changes. This review changes none of them. Five-run worst-case checking is the existing regression policy, not a real-user percentile or a statistical reliability estimate.

## What the retained evidence establishes

| Evidence | Scenario and result | Boundary |
|---|---|---|
| v2.90.30 / dca05cbe | Dated local baseline described above. | Original basis for regression ceilings; not a deployed or connected-account measurement. |
| v2.106.0 / 2b5f229c, dev40962438500 | Linux Chrome152 / Node24.14.0, CPU4: 61 functional suites and all five performance runs pass. | Certifies that exact source candidate; does not approve newer v2.106.1 or clear its separate BUG-137 functional failures. |
| October 30 live dev v2.106.0 | Mac Chrome152 / Node24.14.0, deployed workflow's CPU1 profile: blocking80/200 and Focus50.1/300 pass; first byte1588.6/1000 and warmFCP/LCP6964/500 fail. | Original failure retained. Different target, OS and CPU profile from source CI; no causal before/after comparison is established. |
| Warm worker state in that live measurement | Controlled in 3/5 visits; existing harness waits at most three seconds for worker readiness before reloading. | Label as repeat loads with mixed/unknown installation state. Do not claim five fully installed warm visits or erase their failures. |
| Separate installed-worker diagnostic | Complete cached shell, but online responses still use the worker's network path; one warm replay paints at392ms. | Explains a mechanism, not a replacement passing benchmark. Page-only offline emulation did not stop worker networking and is not offline evidence. |
| Nine actual-app fictional gate controls | Eight sync/splash cases plus held initial Trello cards. Reveal can precede initial cards; sync readiness can wait on metadata/refresh/body. | Coverage gaps and controlled behavior, not evidence of Can's private-account performance or authorization for a runtime redesign. |

Original tracked baseline and failed artifacts remain intact. Review-only summary: `.context/bug135-review/oct30/measurement-review.json`; raw evidence is retained beside it and under `.context/15gd/publication/`. RUM removal is separately verified under BUG-138; these older captures predate that removal and do not establish its performance effect.

## Proposed test-policy changes for review

| Area | Proposal | Current implementation |
|---|---|---|
| Source regression gate | Keep payload, blocking, input-response and existing source timing checks. Interpret each result under its recorded profile and exact source candidate. | Already enforced; no change requested here. |
| Deployed first byte | Report DNS/connect/first-byte and hosting context separately. Treat the deployed 1000ms comparison as a diagnostic pending a representative hosting baseline and an agreed release policy. | Still produces the existing failing verdict. No workflow exit, proof requirement or threshold changed. |
| Installed repeat loading | Add explicit preparation/outcome evidence for a complete installed worker/cache before a scenario is called installed-warm. Keep first-install/repeat-before-install results visible as their own scenario, with preparation time reported. Continue timing the entire measured navigation. | Three-second race and current labels unchanged pending review. |
| Initial connected list | Add fictional connected/cache/no-cache scenarios that report local bootstrap, required-source readiness and visible reveal independently. Record unavailable sources honestly. | Not covered by the generic account-free benchmark. `today:morning-ready` currently means synchronous local init completion. |
| Splash / poem | Retain the accepted choreography, cooldown, rescue behavior and separate presentation ceiling. | Unchanged. |

No active sync, authentication, splash or cache-strategy repair follows from this document. Moving metadata, changing refresh timeouts, coordinating runtime gates and adopting cache-first startup are withdrawn proposals. A later app change needs a demonstrated user problem and its own proportionate proposal. The current benchmark results are evidence to interpret, not an automatic instruction to change product behavior.

**Implementation status:** Can accepted the measurement-only direction. The deployed diagnostic classification and additional scenario labels/coverage are documented proposals; their tooling/enforcement changes have not been implemented. This remains the same unfinished measurement issue; no separate phase or automatic work cycle is introduced. No new numerical ceiling is proposed without representative evidence and a stated UX reason. Existing source/release checks remain authoritative. BUG-137's failures above are historical; it was subsequently verified fixed in v2.106.4. The November 4 v3.2.2 full hosted release gate passed; that does not close BUG-135's separate deployed/installed measurements.
