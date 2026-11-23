---
bug: Generic task-context failures obscure their cause in the console
status: ⏳ Verify
summary: Distinct enrichment failures all return a generic502, leaving the console unable to distinguish the cause.
---
**Report (Can, November23):** repeated production task-context502 errors during Focus entry; the Response body is `{"error":"Enrichment unavailable"}`. The deployed handlers are reachable and safely reject malformed JSON without any provider request. No actual credential, task payload or provider request was replayed. The separate Calendar token400 has not been classified.

**Diagnosis:** this exact generic error arises from multiple task-enrichment fallback paths; it does not identify whether the live failure is transport, invalid/empty card, truncated output, exhausted turns or deadline. Earlier request limits and provider configuration are retained.

**Change:** add fixed categorical reason codes to the existing response/console path; expose only a whitelisted reason plus numeric HTTP statuses. Ignore arbitrary upstream/error data and fence late error-body reads after source changes. Remove raw provider HTTP-error-body logging. No new telemetry/store, extra call, retry or changed generation policy. This makes a future natural failure diagnosable; its underlying live cause remains open.

**Tests:** actual handler cases for request failure, malformed/unexpected provider response, empty answer, invalid card JSON/shape, output cap, malformed/unsupported tool stop, exhausted turns, deadline and upstream HTTP status. Browser checks reject private/unknown fields, do not cache failures and withhold diagnostics after task rename while an error body is held. The pre-repair test fails on the absent reason code. Preserve raw evidence in `.context/enrichment-failure-diagnostics-20261123/`.

**Local verification:** `fresh-IZV8u7` passes invariants and task-enrich with0 failures/flakes in9.6s, including actual-handler cases and browser privacy/staleness checks. Payload, memory inventory and whitespace pass. The original reason-code assertion fails before the change. Installed reason-code verification awaits publication; no live provider call or credential use.
