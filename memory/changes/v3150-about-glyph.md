---
bump: none
title: Text-presentation ↩ in the v3.15.0 About line (Rule 20)
---
The v3.15.0 About/CHANGELOG line used a bare ↩, which design-lint flags as emoji-capable (Rule 20) and failed the dev functional shard (run 45224246598). Added U+FE0E in `index.html` CHANGELOG and its `memory/Changelog.md` mirror. The lint passed locally before the cut because the About line is only written by `release:cut`.
