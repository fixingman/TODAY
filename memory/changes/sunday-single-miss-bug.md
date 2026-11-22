---
bug: One rejected weekly sentence silences the following Sunday
status: ⏳ Verify
summary: A single weekly-reading miss adds a second quiet week even when fresh weekly evidence qualifies.
---
**Report (Can, November 22, 2026):** installed production v3.12.1 shows Today and Noticed but no Sunday reading. Its saved aggregate audit is online with AI configured, no cached weekly reading and blocked-no-insight. soon-pullback is retired on October 25; week-shape is blocked as “already said 7 days ago on Sunday reflection”. Inspected live production policy bytes match the checkout. A one-miss line or retained one-miss kind verdict reproduces that exact gate; no provider request is made.

**Repair:** keep the existing weekly fallback cooldown at seven days after one sentence-level miss. Preserve historical feedback, two-miss/persisted retirement, same-day/less-than-seven-day suppression, qualifying fresh weekly evidence and the six other outcome kinds’ feedback gates. Do not force generation or restore a retired topic.

**Verification:** new pure-policy and actual About block checks cover a previous missed line and an older retained single-miss verdict, writer/cached-line delivery once, prior-text exclusion and feedback retention. Before the repair, two policy assertions and the mounted component eligibility assertion fail. Final scoped fresh check `fresh-SkAjwT` passes all five suites (invariants, observation pool, About, nudge and design) with zero flakes/failures in60.5s; payload, memory inventory and whitespace pass. Preserve those controls and the receipt under `.context/sunday-missing-20261122/`. Installed acceptance remains pending after publication.
