---
bump: none
title: Give the synthetic desktop WCO fixture explicit desktop input capabilities
---
Full Linux run 44021829209 rejected the new Focus step: headless Chromium reports hover:none, so the application correctly skips desktop Focus registration. Give only the synthetic WCO geometry fixture hover/fine-pointer predicates and assert them before clicking; keep real standalone renderer predicates, mobile fixtures, production behavior and all existing assertions/deadlines unchanged. Preserve the failed hosted evidence separately from installed native-frame acceptance.
