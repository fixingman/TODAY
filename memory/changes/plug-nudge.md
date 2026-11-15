---
bug: Connections nudge does not reach Explore's plug button
status: ⏳ Verify
summary: An expired sign-in makes ✧ breathe, but Explore's Connections button stays still, and opening Connections there never stops the nudge.
---
**Report (Can, November 15):** the ✧ button blinks for a connection problem, but the Connections (plug) icon inside Explore does not.

**Root cause:** since Connections moved inside Explore (v3.8.5), `_syncConnectionsNudge` only toggled `#trelloBtn`, and the shared attention observer only watches the three header buttons. Separately, the seen flag was only written by the old header `toggleConfig` path, so opening Connections from Explore never marked the nudge seen and ✧ kept breathing for the rest of the day.

**Fix:** see the v-release changelog entry. Verify on device with an expired Gmail, Dropbox or Calendar sign-in: ✧ and the plug both breathe; opening Connections in Explore stops both until the next day.
