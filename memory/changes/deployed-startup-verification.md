---
bump: none
title: Close BUG-135 after deployed measurements and installed-PWA confirmation
---
Live dev v3.13.0 / ae401c67 passes the unchanged five-run deployed budgets on a fresh pinned-browser Mac harness and on scheduled Ubuntu run45023287185, whose checkout log confirms the same candidate. Both use the existing deployed CPU1/network profile and complete SW-controlled warm visits. Preserve the earlier failures and fresh reports separately. Can confirmed on November 22 that installed-PWA startup is working fine; BUG-135 is verified and archived, with its fulfilled Backlog reminders removed; no runtime, hosting, cache strategy, provider or budget change. Manual dispatch403 is retained; hosted proof is the existing scheduled run, not an agent-dispatched workflow.
