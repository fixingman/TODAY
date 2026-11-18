---
bug: Post-add suggestions hidden behind the input bar but counted as ignored
status: ⏳ Verify
summary: New tasks land at the bottom of the list, so their suggestion row sat behind the fixed input bar; the app still counted 10 seconds there as "seen and ignored" and throttled all suggestions.
---
**Report (Can, November 18):** never sees post-add suggestions or splits, yet the backup holds 50 offers (Aug 28–Nov 16): 29 ignored, 12 dismissed, 1 applied then reversed.

**Root cause:** the exposure check counted a row as visible when 1% of it intersected the viewport, without regard to the fixed add bar. Reproduced at 390px with 13 tasks: the row rendered at 782–817px under the bar (top 776px), and `elementFromPoint` hit the input. On desktop the new task itself landed under the bar, so delivery (which waited for viewport entry) never fired. The policy then read those timeouts as rejections: every reason reached ≥70% and dropped to one in four.

**Fix:** see the release changelog entry. Verify: on phone and desktop, add a task with two actions or a vague wording; the suggestion appears above the input bar and the list scrolls just enough to show it.

**Still open:** between 8pm and midnight the evening review bar also covers the end of the list, and the page has no extra room to scroll above it, so a task added then (and its suggestion) can stay hidden. The suggestion now waits rather than being miscounted; the list layout itself is unchanged.
