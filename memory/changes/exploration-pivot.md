---
bump: minor
title: Add question pivot to Explore
---
Let users change the exploration question without losing history. A pivot appends
a 'pivot' entry (kind, from, to) and updates doc.question in place. The old
question becomes a chapter marker in the conversation ("New question" divider +
text). A "change question" link appears below the title once the conversation has
started. Full history — observations, readings, pivots — survives across sessions.
