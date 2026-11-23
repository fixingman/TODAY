---
bump: patch
title: Distinguish safe failure reasons for task context (BUG-{enrichment-failure-reasons-bug})
about: Task context failures now include a more specific diagnostic reason in the developer console.
---
The current generic502 combines provider transport/response failures, missing or malformed cards, output limits, exhausted tool turns and deadline exits. Return fixed reason codes through the existing error response and allowlist them in the existing console warning, with numeric upstream status only for provider HTTP errors. Retain legacy error text/status, no-result and retry/cache semantics, owner/source/epoch guards and client deadline; recheck ownership after reading error bodies. Remove raw provider HTTP error-body logging. No stored diagnostics, telemetry, extra request, retry, provider/model/tool/limit/configuration change. Actual-handler and browser regressions cover categorical separation, original request caps, unknown/private error rejection and a held stale error body. Underlying live enrichment failure and Calendar400 cause remain unverified; this is a diagnostic improvement, not a claimed retrieval repair.
