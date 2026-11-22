---
bump: none
title: Add habit-task-editor in-place swap invariant test
---
habit-task-editor.open() replaces #habitsContent directly without changing
sidebar.active, so isOpen('habits') true does not mean the habits list is
present. Added two new assertions to habits-test: one that documents the
invariant (sidebar stays on habits, #habitList gone, .ht-editor present,
title and habit name correct), and one that verifies back() restores the
full list and exits edit mode.
