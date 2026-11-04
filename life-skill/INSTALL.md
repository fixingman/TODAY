# Install and use

This ZIP contains one portable skill folder, life-exploration/. It works as instructions and templates; it does not install an app connector, schedule reminders, or provide automatic memory. No routing or model settings need to change.

## Codex

Extract the ZIP. Copy the entire life-exploration folder into ~/.agents/skills/ for personal use, or .agents/skills/ inside a chosen repository for project use. Preserve references/ and templates/. If a same-named skill exists, compare and back it up first; do not overwrite blindly. Start a new chat if discovery has not refreshed. Invoke `$life-exploration` and provide your private exploration folder or relevant files.

Official guide: https://learn.chatgpt.com/docs/build-skills

## Claude Code

Copy the same life-exploration folder into ~/.claude/skills/ for personal use, or .claude/skills/ in a chosen repository. Keep the whole folder. Start a new session if needed and invoke `/life-exploration`.

Official guide: https://code.claude.com/docs/en/skills

## Claude web / Desktop skill upload

Where custom skills are available and enabled, open Customize > Skills, choose the upload/add option, and upload the supplied ZIP. The ZIP has life-exploration/ as its only top-level folder. Enable the skill. Account/organization settings may govern availability. Local Claude Code skill installation alone does not make private journal files available in a cloud chat; attach the current export separately.

Official guide: https://support.claude.com/en/articles/12512198-how-to-create-custom-skills

## Initialize private portable state

For TODAY, choose a private folder in the approved Dropbox space, outside the repository and installed skill, named for example my-life-exploration. Keep one canonical record across devices. Copy templates/state.json there as state.json and templates/experiment-journal.md as journal.md. Reviews and handoffs are optional files. The assistant can do this when asked and given access; otherwise attach edited copies in chat. Do not commit personal data to a shared repository.

Suggested first prompt:

“Use Life Exploration with the attached state and journal. The seeded stages and candidate problems are provisional. Help me confirm or replace them, and capture one recent observation. Keep my words separate from your hypotheses. Save the updated files if you have access; otherwise give me a portable export.”

To continue elsewhere, supply the latest state.json, journal.md, relevant reviews and optional handoff.md. A skill installation does not convey previous chat memory. With no file access, ask the assistant to return updated attachments or copyable content and save them yourself.

## Quick checks

1. Ask what the four candidate problems are: it should flag them as unconfirmed provisional additions, not remembered facts about you.
2. Share “I enjoyed a conversation yesterday”: it should capture the account without requiring a form or declaring a cause.
3. Say an experiment was not completed: it should explore circumstances without judgment and preserve unknowns.
4. Ask when reminders run: it should say no reminders exist unless actually configured separately.
5. Move a complete private export to the other tool: it should resume from the files and disclose anything missing.

## Update or uninstall

Replace only reusable skill files after comparing changes; keep private state outside the skill. Uninstall by removing the installed life-exploration skill folder or disabling it in the skill settings. Private journal data remains separately managed. Review source-notes.md before relying on reconstructed source content.
