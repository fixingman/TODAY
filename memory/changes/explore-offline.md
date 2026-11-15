---
bump: patch
title: Explore names why it cannot open, and opens by itself when you're back online
about: Explore now tells you when you're offline instead of asking you to connect Dropbox, and opens your exploration on its own once you're back.
---
Before, every failure to read the exploration said "Connect Dropbox or come back online to open your exploration." with a reload button, and nothing happened when the connection returned.

`exploration-files.js` now separates `offline` (the device reports offline; no request is made) and `not-connected` (no Dropbox grant) from `unavailable` (online, but Dropbox did not answer). Explore shows, in order: "You're offline. Your exploration is safe in Dropbox and opens when you're back." with no button; "Connect Dropbox to open your exploration." with **connect Dropbox** (opens Connections inside Explore; also used for an expired sign-in); "Dropbox didn't respond. Nothing was changed; try again." with **reload latest**. Sending and asking while offline say so too ("You're offline. Your text stays here; send it when you're back." / "…ask again when you're back.").

An `online` listener re-reads the document only while Explore is open and its last open failed for being offline. A failed reply is never retried automatically: that is an AI call the person chooses to make.

`exploration-test` covers the three openings, no request while offline, and a single read on reconnect; on v3.10.4 it times out waiting for the offline wording.
