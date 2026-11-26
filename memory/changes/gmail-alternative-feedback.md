---
bump: patch
title: Visible feedback when another email cannot be shown (BUG-{gmail-alternative-feedback-bug})
about: Trying another email now explains when a replacement cannot be shown.
---
The Gmail context retry announced an unavailable replacement only through the screen-reader announcer, then returned to a disabled action with no visible explanation. Show a visit-local status beside the existing controls for empty/failed lookups, expose the pending busy state, and retain the original email's restoration action. Do not infer a no-match result from a transport failure, broaden the search or add retries/storage. The existing real-component empty/error/held-request regressions now cover visible feedback, accessibility, narrow layout, request bounds and restoration; the empty case fails before the repair.
