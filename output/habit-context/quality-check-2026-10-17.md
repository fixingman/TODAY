# Habit question — three configured-AI checks

October 17, 2026. Can explicitly approved three fictional-input calls using the desktop TODAY app's existing AI connection. This checks candidate wording, not deployment or real-use usefulness.

## Method and boundaries

- Installed app: v2.96.4, existing configured Claude connection and same-origin `/.netlify/functions/ai-assist` route; no provider/key/model/routing settings changed and no credential printed or exported.
- Candidate: the exact separate habit prompt in local v2.97.0 `assets/focus.js`, SHA-256 `cca2f2322668cab9e0b346fe19eaa9788a9236ebd265b22a910339ed8873ed63`. The guarded, prepared console probe verified this hash and the installed version before calling. The candidate feature was not injected into or deployed over the live focus function.
- Three sequential calls, no retries. Each user message contains only one JSON-quoted fictional habit name. No real tasks/habits/history/Memory/Calendar context was sent.
- Direct replies were inspected, not passed to app action execution, the focus UI or spoken-line recording. No app-write functions were called by the probe. Expected failures were locally caught by the prepared diagnostic wrapper.
- Local comparisons before/after the probe reported unchanged habit list/completion/events, task state, spoken-line feedback, watched nudge keys and visible nudge text. Those private values remained inside the browser; only equality booleans were logged. Normal app startup preceded this snapshot, so this does not claim the app performed no ordinary startup/background work outside the probe.

## Results — fictional inputs only

| Habit | Reply | Words | Latency |
|---|---|---:|---:|
| Read | What kind of reading feels right to focus on right now — fiction, nonfiction, or something else entirely? | 18 | 1936 ms |
| Walk | What kind of walk are you picturing—a brisk loop, a slow wander, or something in between? | 16 | 2045 ms |
| Charge phone outside the bedroom | Where outside the bedroom will the charger live so it's actually easy to use? | 14 | 1331 ms |

All three pass the implemented one-question/under-20-word shape check. No invented personal routine, behavioral statistic or Calendar availability is asserted in these samples. This is a small manual reading, not a general semantic-safety guarantee.

## Judgment

**Mixed; not release-quality approval.** The charger question concerns a concrete setup choice and is the strongest. “Actually” adds unnecessary corrective emphasis. Read and Walk are grounded in the supplied names, but both become a “what kind / options / something else” menu. Repeating that shape would risk the Wallpaper Test and does not establish useful recognition.

**Can's subsequent judgment:** Read and Phone are slightly in the right direction, but can be better. This qualifies the agent's initial critique: Read has a modest positive usefulness signal, not a wholesale rejection. Preserve the invitation to choose reading and the practical charging arrangement while refining specificity/ease. This is not approval of a fixed question template, routine inference or release. No further calls or runtime prompt changes were made in response to this feedback.

The name-only boundary stays valuable. The limitation is not permission to invent motives/routines, import more private context, add a Moment field or force cue planning. If revised, judge one bounded principles-only candidate against these outputs before further rollout; do not restart an open-ended wording loop or silently change the ordinary task/daily writer. No additional AI calls, prompt edit, commit or deployment is authorized by this three-call check alone.

## Bounded revision — subsequently approved October 17

Can approved one prompt revision and three fresh fictional checks. The local habit-only prompt now invites the person's own preference or a practical arrangement rather than providing a menu; it respects the named intention and excludes corrective emphasis. No worked examples/templates or task/daily prompt changes. Exact revised prompt SHA-256: `bac958404330c62f1a9bec5032244de426a778642b29f954e460f465662acbea`.

The same installed v2.96.4 Claude connection and guarded direct endpoint method were used; the local feature remains undeployed. Exactly three sequential calls, no retries. The hash was verified before any call. No live action, focus or spoken-line function was invoked. All five before/after comparisons (habits, tasks, feedback, watched nudge keys, visible nudge) remained unchanged; private values stayed in the browser. The created DevTools window was closed afterward, leaving TODAY open.

| Habit | Fresh AI reply | Words | Latency |
|---|---|---:|---:|
| Read | What book or material are you looking forward to picking up for this? | 13 | 2416 ms |
| Walk | What's a route you'd enjoy walking right now? | 8 | 1048 ms |
| Charge phone outside the bedroom | Where outside the bedroom would it feel most natural to set up that charging spot? | 15 | 886 ms |

**Agent judgment: a modest improvement, not a general quality guarantee or Can's release verdict.** Walk is more concrete without an options menu. Phone preserves the useful setup choice and loses “actually.” Read invites an individual choice rather than genres, but “book or material” and “for this” still feel mechanical; “looking forward” also presumes some enthusiasm. The samples do not invent past behavior, a problem or a schedule. All three pass the format guard. Stop this bounded pass here rather than optimizing indefinitely against three names. Candidate is ready for Can's wording judgment; commit/dev deployment and real-use usefulness remain separate gates. No extra calls, context expansion or morning nudge changes.

## Subsequent Read revision — not AI-tested

Can agrees Read is still not good and asked to revise the previous version. The local principles-only prompt now asks naturally about what would suit the person, not for an inventory of materials, and explicitly avoids assuming enthusiasm. It preserves the earlier open invitation without its options menu; no fixed Read question or worked example is added. Practical arrangements remain available for habits such as phone charging. This supersedes the sampled prompt as the local candidate: the six replies above are historical results, not outputs of this newest wording. No further live AI calls, real-data writes, commit or push.

Latest prompt SHA-256: `99a819b5b85f209681e92fe79320a3bdb06e363df3eadd3dc6938642f6208988`. Syntax, 24-group focus regression, design lint and payload preflight pass (1199.7 KB decoded / 345.8 KB Brotli / 38 scripts). These checks do not establish the new wording's quality.
