---
bump: patch
title: Habit edit mode uses the app's field and link styles (BUG-{habit-rename-zoom})
about: Editing habits is cleaner: each name gets a proper full-width field, with daily task and archive as quiet links beneath it.
---
Can found edit mode "terrible" and off-token. Investigation (desktop 1200px and phone 390px, real component):

- The name field was a 19px-tall outline hugging the text (`padding: 0 4px`, transparent, `--radius-md`, `box-sizing: content-box`), unlike every other field (44px, `--surface`, `--radius-lg`). Long names were clipped mid-word.
- On phones its font stayed 13.5px: a later base rule overrode the shared ≤600px 16px rule, so iOS zoomed on focus (Rule 5c; filed as BUG-{habit-rename-zoom}).
- Archive was a bare "×" glyph, 32×18px (under the 24px minimum target), with no accessible name beyond its title, in the strength slot.
- History dots and the strength ring stayed visible beside the field; on phones they squeezed it to ~175px. The hidden checkbox column left an empty indent.
- The daily-task link wrapped and centred on phones (button default `text-align`).

Now each row is a full-width 44px field matching `.habit-input`, then one row of quiet links (`daily task …` at the start, `archive` at the end, danger colour on hover/focus, `aria-label="Archive <habit>"`, 32px targets). Check, history and strength are hidden while editing and come back on Done; exiting now just saves names and lets `renderHabits()` rebuild. `habits-test` asserts the new contract at 1200px, a 360px sidebar and 390px (field height, full width, 16px phone text, hidden extras, actions below, targets, names) and fails on v3.10.4.
