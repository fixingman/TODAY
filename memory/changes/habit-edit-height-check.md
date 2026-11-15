---
bump: none
title: Preserve the habit edit height requirement across fractional translations
---
Dev run43730735458 failed only the phone edit-field height assertion, then passed its diagnostic retry. A native 44px field translated by a fractional CSS pixel reproducibly reports a 43.999996px DOMRect. Require the actual layout height to remain at least 44px and permit only 0.001px coordinate rounding in the visual rectangle. Browser controls reproduce rejection by the original strict comparison and verify the repaired predicate still rejects a real 43px field. No input size, application logic, timeout, retry or performance limit changes.
