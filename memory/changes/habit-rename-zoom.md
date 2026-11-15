---
bug: Renaming a habit on iPhone zooms the page
status: ⏳ Verify
summary: The habit name field in edit mode stayed 13.5px on phones, so iOS zooms when it is focused.
---
**Found (November 15)** while investigating Can's report that habit edit mode looks off-token: computed font-size of `.habit-edit-input` at 390px was 13.5px.

**Root cause:** the shared ≤600px rule sets `.habit-edit-input` to `--text-lg` (Rule 5c), but the component's own base rule, later in `index.html`, set `--text-task` with equal specificity and won. The exit path's viewport `maximum-scale` reset existed to undo that zoom.

**Fix:** the component repeats the 16px rule in its own ≤600px query; `habits-test` asserts ≥16px at 390px. Verify on iPhone: tap a habit name in edit mode; the page should not zoom.
