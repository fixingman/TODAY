---
bump: patch
title: Limit mobile opening scroll-to-top to Habits
about: Only the Habits sheet scrolls the page to the top on your phone.
---
Can corrects the v3.11.3 scope: only the inline Habits sheet needs the viewport returned to its top-opening position. Restrict both immediate and generation-fenced layout resets to mobile Habits; remove the new reset from full-screen/loading panel entry. Remove Explore's new first-visit override and restore its original conversation-follow behavior. Retain Habits' free later reading/current-position close and desktop isolation. Update the platform/real-conversation regressions to require preservation of full-screen panel reading positions, alongside Habits opening/close tests. Installed phone acceptance remains separate.
