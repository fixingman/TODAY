---
bump: patch
title: Make phone context directly callable
about: Phone context now offers a Call action for a clearly displayed international number.
---
The Focus web-context card can show a phone number while offering no calling action. Add a native, accessible “☎ Call” link for the first explicit, valid international number on a call-intended card, including existing cached cards. Keep any HTTPS source link, labelling it Website when it previously said Call. Only explicit activation opens the device's configured calling app; no automatic call, extra lookup, location inference, new retention or prompt change. Do not infer country codes from national numbers, parse hours/dates as phones, dial overlong numbers or optional-trunk notation, or use a possibly truncated number at the body cap. Existing hidden/current-card controls fence the action.

The real-component task-enrichment regression fails before this repair and covers cached rendering, intercepted native keyboard activation (no real call), no extra lookup, invalid/ambiguous input, source-link preservation, hide, desktop/320px layout, 24px target and axe. Device-specific dialer handling and live source-number accuracy remain separate acceptance checks.
