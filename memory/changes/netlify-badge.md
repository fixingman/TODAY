---
bump: patch
title: Block the injected Netlify badge script with a deployment-scoped policy
about: TODAY blocks the hosting badge script before it can load.
---
Add a script-element allowlist to the existing security header during Netlify's configuration preparation. Only this deployment's canonical, branch and immutable origins may load external scripts from /assets/; existing inline startup, service-worker, connection and other policy directives remain unchanged. Netlify documents that headers are read after the build command. Missing or invalid deployment URLs fail the deploy instead of broadening script access. The existing poem Edge Function preserves the returned headers. No new browser script, DOM-hiding loop, data collection or proxy is introduced. This blocks the current external HUD script, not arbitrary future inline injection by the host.

Verify the actual badge locally, then cover the generated header and build contexts, origin validation, permissive negative control, blocked requests/execution, app startup/capture/lazy panels, poem header preservation and offline PWA reload with deterministic fixtures. Verify actual dev and production headers and badge absence after deployment. Safari/PWA visual acceptance remains distinct from Chromium checks. Timing and payload limits stay unchanged.
