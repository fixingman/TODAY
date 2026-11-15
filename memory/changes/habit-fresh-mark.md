---
bump: patch
title: The ✦ "fresh each day" mark matches the varied-set icon in size and alignment
about: The ✦ beside a habit with a fresh daily task is now as clear as the other mark, and lines up with the habit's name.
---
Can: the ✦ next to a habit with "daily task · fresh each day" looked misaligned and faint. Measured at 3× in the real list: the ✦ was a text glyph at 12px (7.2×12 box, about half the visual weight of the 14×14 list-in SVG), sat on the text baseline 1.5px below the name's centre, and the set icon sat 1.5px above it.

Both marks are now drawn 14px SVG icons in `currentColor` (`--muted`); the mark box is one line tall (`1lh`, `vertical-align: top`), so both centre on the name's first line (within 1px). The same drawn ✦ replaces the glyph in the edit-mode link and the setup cards. `habit-tasks-test` checks both marks for size and centring; it fails on v3.10.6. The phone-width edit-row check from v3.10.6 now waits until the panel has moved into its phone host before measuring (it flaked once locally).
