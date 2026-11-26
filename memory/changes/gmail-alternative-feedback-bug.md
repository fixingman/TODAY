---
bug: Try other email finishes without visible feedback
status: ⏳ Verify
summary: Show a visible status when Gmail cannot supply another email, while retaining the previous email.
---
Can reported that try other email appeared to do nothing in desktop Focus. The unavailable-result path announced only to assistive technology, left the action disabled for the current visit and swallowed rejected promises. The screenshot alone cannot distinguish no match from a network, credential or provider failure.

The repair displays a visit-local accessible status on an unavailable result, preserves pending feedback and allows the original email to be restored without a call. Existing search limits, source fences, one retry per visit and privacy boundaries remain in effect. Extended fictional actual-component tests reproduce the missing visible status before the repair and check empty/error/pending, restoration, narrow layout and accessibility. Local automated proof and the user's installed/live-mailbox acceptance remain separate; no live mailbox has been accessed.
