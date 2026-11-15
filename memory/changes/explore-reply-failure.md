---
bump: patch
title: Explain Explore reply failures and the action needed before retry (BUG-{explore-reply-failure-bug})
about: Explore explains credit, billing and usage limits before you retry a saved message.
---
Normal chat failures previously discarded their specific reason, displaying a generic retry beside an unrelated earlier-reading context warning. Keep a fixed, page-held failure reason for the unanswered turn and show one actionable alert. The exploration-only proxy contract distinguishes explicit insufficient credit, billing, known spend/daily limits, credentials and ambiguous rate/usage limits; a token-capped response remains separate. Fixed copy keeps raw provider details out of UI/journal. Account problems offer AI connection and retry when ready; no immediate automatic retry or invented reset time. Explicit retry preserves the single original observation. Source withholding, saved history, data scope, providers/models/routing, request deadline and output budget are unchanged. Offline handler/browser coverage includes negative classification controls, explicit recovery, raw-data canaries, Connections navigation and existing late-response/withdrawal fences.
