---
bug: Netlify can skip pending app changes behind a validation-only promotion
status: ⏳ Verify
summary: The hosting skip rule compares only the final commit pair, missing app changes awaiting production deployment.
---
**Observed:** master4c5529c7 and its full exact-candidate CI pass, while fresh production responses still show3.14.1. The configured parent-only comparison returns0 for that exact tip; comparison with the previously deployed98c27fcb returns1. Hosting logs are unavailable, so the skip mechanism is reproduced rather than inferred from a Netlify log.

**Repair:** compare the hosting context’s last built commit with the target via Netlify’s documented read-only CACHED_COMMIT_REF and COMMIT_REF variables. Retain deployable paths. Missing/equal/invalid refs build safely; docs-only changes after an already-built app still skip. Application bytes and version remain3.15.1.

**Regression:** the actual configured Bash command runs against real Git commits in a disposable fixture. Old code fails the validation-only promotion assertion; corrected code passes pending app/function changes, genuinely unchanged app and absent/equal/unknown-ref cases. The Netlify CSP/badge/offline tests still pass. Evidence: `.context/enrichment-master-20261123/hosting-before.log`, `hosting-after.log`, `fresh-Ymcjaf/receipt.json`. Live production verification remains separate from CI.
