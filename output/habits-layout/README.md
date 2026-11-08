# Habit layout comparison

Open `/output/habits-layout/` through the workspace's existing preview server. Direct links use `?option=2`, `?option=3` or `?option=4`.

All three options use the same 420px pane, fictional habits, native habit markup, type, checkbox, strength indicator and original 21-dot fading history. No wider panel or seven-dot reduction is proposed.

- **2 — Title above history:** checkbox, name and strength on the first line; original dot spacing below the name.
- **3 — Compact inline:** retain the original four-column arrangement, with 8px horizontal row padding and 4px gaps between dots. Names can wrap naturally. Dot size and fade are unchanged.
- **4 — History + strength together:** give the name the upper line; pair the full dot trail with strength on the lower line.

The HTML snapshots the real component rendered by `assets/habits.js` with fictional stores in an isolated browser and the current native stylesheet from `index.html`. Prototype-only overrides follow that stylesheet. Normal row-hover treatment is preserved; there are no new permanent habit cards. Each option's history summary has a unique accessible ID.

Checkbox and row Enter/Space interactions update the shared fictional sample across the three layouts. Shorter/longer names and Reset help compare wrapping. Strength uses the existing asymmetric smoothing rule. This preview does not run the application, call an API or read/write localStorage. Fonts are served from the workspace.

Geometry, all 21 dots and fade, contained names/controls, accessible structure, keyboard/check/reset/name variants and no storage/API traffic were verified at 1440, 1024, 736 and 480px viewport widths. Each pane stays 420px; the comparison page stacks previews rather than changing them to the mobile layout. Evidence and captures: `.context/habits-layout-options/verification.json` and adjacent PNGs. These pages remain standalone prototypes. Production adopts the approved hybrid in v3.8.9. Claude review remains unavailable because the configured account reported its usage limit; no routing or account settings were changed.

## Combined 2 + 4 mock

Open `hybrid.html`. The title has the upper line. Below it, history starts at the title's left edge and expands through the available width, with strength directly after the final dot. The pane stays420px. At that width the fictional90-day sample supplies28 visible day dots rather than the fixed21; dot size stays5px, the recent seven days retain full opacity, and older days fade. Capacity is derived from measured space, retaining normal minimum dot spacing. A short-history toggle simulates only eight available days rather than inventing older records; the shorter trail remains title-aligned and strength follows it.

Option2 in the original comparison also now has2px more vertical title/history spacing:10px instead of8px. The combined mock carries that10px row gap. Both pages remain isolated prototypes; they do not alter app data collection, retention or stored history. Production implements the desktop hybrid separately in `assets/habits.js` and `index.html` in v3.8.9. Hybrid geometry, date order, alignment, full-width fill, trailing percentage, short-history behavior, keyboard/check/name/reset interaction, axe and no storage/API traffic are verified under `.context/habits-layout-options/hybrid-verification.json`.
