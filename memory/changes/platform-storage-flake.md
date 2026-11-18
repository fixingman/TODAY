---
bump: none
title: platform-test waits for the app document before touching storage
---
The desktop app-window fixture wrote `localStorage` as soon as the `--app` target appeared; on CI the document could still be committing, so Chrome denied storage ("Access is denied for this document", dev CI 44317846300, passed on retry). It now waits for the real URL and a non-loading document first. Three consecutive local runs pass. App code unchanged.
