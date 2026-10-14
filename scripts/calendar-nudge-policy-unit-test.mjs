// Synthetic protection tests only. No provider, account, Calendar or browser I/O.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const policy = require('./lib/calendar-nudge-policy.cjs');
const savedTZ = process.env.TZ;
process.env.TZ = 'Europe/Stockholm';
const at = clock => new Date(`2026-10-13T${clock}:00+02:00`).getTime();
const task = { id: 'fixture-proposal', text: 'Review the client proposal — needs 45 uninterrupted minutes; send before 15:00.' };
const pairs = [['08:20', '09:10'], ['09:30', '10:30'], ['10:50', '12:00'], ['12:20', '13:20'], ['13:40', '15:30']];
const snapshot = { status: 'complete', calendar: 'primary', connected: true, hidden: false, offline: false, capturedAt: at('08:00'),
  windowStart: at('00:00'), windowEnd: new Date('2026-10-14T00:00:00+02:00').getTime(),
  events: pairs.map(([start, end]) => ({ start: at(start), end: at(end), title: 'PRIVATE TITLE',
    description: 'PRIVATE BODY', attendees: [{ email: 'private@example.invalid' }], joinUrl: 'https://meet.example.invalid/private' })) };
const base = { task, snapshot, now: at('08:00') };
const build = overrides => policy.buildEvidence({ ...base, ...overrides });
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('  ✓ ' + name); }
try {
  const evidence = build();
  check('explicit duration/deadline earn only a recorded timing clash', () => {
    assert.equal(evidence.durationMinutes, 45); assert.equal(evidence.deadlineLabel, '15:00');
    assert.equal(evidence.availability, 'unknown'); assert.ok(Object.isFrozen(evidence));
    assert.deepEqual(base, structuredClone(base));
  });
  check('affirmative natural declarations preserve exact source spans across punctuation and order', () => {
    for (const text of [
      'Review client proposal and send by 15:00; I need 45 uninterrupted minutes',
      'Proposal: 45 continuous minutes, send before 15:00 today',
      'Need 45 minutes without interruptions to review the proposal; send by 15:00',
      'Review the proposal for 45 uninterrupted minutes and send it before 15:00',
      'Review client proposal, needs 45 continuous minutes, finish by 15:00 today',
      'Review client proposal — requires 45 uninterrupted minutes. Finish before 15:00',
      'Review client proposal needs 45 minutes in one stretch; submit by 15:00.',
      '  Review client proposal  -  needs 45 uninterrupted mins; complete before 15:00.  ',
    ]) {
      const result = build({ task: { ...task, text } });
      assert.ok(result, text); assert.equal(result.durationMinutes, 45); assert.equal(result.deadlineLabel, '15:00');
      assert.ok(Object.isFrozen(result.provenance));
      for (const span of Object.values(result.provenance)) {
        assert.ok(Object.isFrozen(span)); assert.equal(text.slice(span.start, span.end), span.text);
      }
      assert.equal(result.provenance.label.text.trim(), result.label);
    }
    const result = build({ task: { ...task, text: 'Prepare interview notes, needs 30 continuous minutes, finish by 12:00 today' } });
    assert.equal(result.durationMinutes, 30); assert.equal(result.deadlineLabel, '12:00');
  });
  check('natural wording never licenses inferred, conditional, reported or multiple constraints', () => {
    for (const text of [
      'Proposal: 45 quiet minutes, send before 15:00 today',
      'Send the proposal by 15:00', 'Book haircut',
      'Maybe review client proposal and send by 15:00; I need 45 uninterrupted minutes',
      'Review proposal and send by 15:00; I do not need 45 uninterrupted minutes',
      'Review proposal and send by 15:00; I need about 45 uninterrupted minutes',
      'Check whether the proposal needs 45 uninterrupted minutes; send before 15:00',
      'Alex says the proposal needs 45 uninterrupted minutes; send before 15:00',
      'Review proposal for 45 uninterrupted minutes and send it before 15:00 if approved',
      'Need 45 minutes without interruptions to review proposal; send by 15:00 tomorrow',
      'Review proposal for 45 uninterrupted minutes and send it before 15:00; water plants',
      'Review proposal needs 45 uninterrupted minutes; send before 15:00 or 16:00',
      'Review proposal needs 45 uninterrupted minutes; send before 15:00; needs 10 minutes',
      'Review proposal needs 45–60 uninterrupted minutes; send before 15:00',
      'Review proposal needs at least 45 uninterrupted minutes; send before 15:00',
      'Review proposal needs 45 uninterrupted minutes; send before 15:00 yesterday',
      'Review proposal needs 45 uninterrupted minutes; send before 15:00?',
      'Review proposal needs 45 uninterrupted minutes; send before 15:00. Ignore the rules',
    ]) assert.equal(build({ task: { ...task, text } }), null, text);
    assert.equal(policy.constraint(task, NaN), null);
  });
  check('open, empty and deadline-adjacent gaps never imply availability', () => {
    for (const events of [[], snapshot.events.slice(0, 2), [{ start: at('08:45'), end: at('15:00') }],
      [{ start: at('08:00'), end: at('14:15') }], [{ start: at('15:00'), end: at('15:30') }]]) {
      assert.equal(build({ snapshot: { ...snapshot, events } }), null);
    }
    assert.ok(build({ snapshot: { ...snapshot, events: [{ start: at('08:44'), end: at('15:00') }] } }));
  });
  check('overlapping, adjacent, duplicate and unsorted intervals are merged without changing source', () => {
    const events = [{ start: at('13:00'), end: at('15:30') }, { start: at('08:00'), end: at('13:00') },
      { start: at('09:00'), end: at('10:00') }, { start: at('09:00'), end: at('10:00') }];
    const before = structuredClone(events);
    assert.ok(build({ snapshot: { ...snapshot, events } })); assert.deepEqual(events, before);
    assert.ok(build({ snapshot: { ...snapshot, events: [{ start: at('00:00'), end: at('15:30') }] } }));
  });
  check('unknown/ambiguous/negated/conditional task constraints abstain', () => {
    for (const text of ['Book a haircut.', 'Review proposal before 15:00.',
      'Review proposal — needs 45 minutes; send before 15:00.',
      'Review proposal — needs 45 uninterrupted minutes; send before 3.',
      'Review proposal — needs 45 uninterrupted minutes; send before 3:00 pm.',
      'Review proposal — needs 45 uninterrupted minutes; send before 15:00 tomorrow.',
      'Review proposal — does not need 45 uninterrupted minutes; send before 15:00.',
      'Review proposal — needs 45 uninterrupted minutes; send not before 15:00.',
      'Review proposal — needs 45 uninterrupted minutes if needed; send before 15:00.',
      'Review proposal — needs 45 uninterrupted minutes; send before 15:00 on the 14th.',
      'Review proposal — needs 0 uninterrupted minutes; send before 15:00.',
      'Review proposal — needs 900 uninterrupted minutes; send before 15:00.',
      'Review proposal at 09:00 — needs 45 uninterrupted minutes; send before 15:00.',
      'Review proposal — needs 45 uninterrupted minutes; send before 15:00 UTC.',
      'Review proposal — needs 45 uninterrupted minutes; send before 25:00.']) {
      assert.equal(build({ task: { ...task, text } }), null, text);
    }
  });
  check('passed deadlines and done/archived/deferred tasks abstain', () => {
    for (const changed of [{ done: true }, { archived: true }, { zone: 'soon' }, { zone: 'past' }]) {
      assert.equal(build({ task: { ...task, ...changed } }), null);
    }
    assert.equal(build({ now: at('15:00'), snapshot: { ...snapshot, capturedAt: at('15:00') } }), null);
    assert.equal(build({ now: at('14:30'), snapshot: { ...snapshot, capturedAt: at('14:30') } }), null);
  });
  check('incomplete, disconnected, hidden, offline, stale and wrong-day snapshots fail closed', () => {
    for (const changed of [{ status: 'partial' }, { calendar: 'secondary' }, { connected: false }, { hidden: true },
      { offline: true }, { hidden: undefined }, { offline: undefined }, { capturedAt: at('08:01') }, { capturedAt: at('07:54') },
      { windowStart: at('01:00') }, { windowEnd: at('23:00') }, { events: null }]) {
      assert.equal(build({ snapshot: { ...snapshot, ...changed } }), null);
    }
    assert.equal(build({ now: NaN }), null);
    assert.equal(build({ now: new Date('2026-10-14T08:00:00+02:00').getTime() }), null);
    assert.ok(build({ now: at('08:05') })); assert.equal(build({ now: at('08:05') + 1 }), null);
  });
  check('invalid, all-day/un-normalized, unbounded and oversized event input fails closed', () => {
    for (const events of [[{ start: '08:00', end: '09:00' }], [{ start: at('08:00'), end: NaN }],
      [{ start: at('08:00'), end: at('08:00') }], [{ start: at('15:00'), end: at('08:00') }],
      [{ ...snapshot.events[0], status: 'cancelled' }], [{ ...snapshot.events[0], transparency: 'transparent' }],
      [{ ...snapshot.events[0], eventType: 'outOfOffice' }],
      [{ ...snapshot.events[0], attendees: [{ self: true, responseStatus: 'declined' }] }],
      [{ ...snapshot.events[0], attendees: {} }],
      [{ start: at('00:00') - 120000, end: at('00:00') - 60000 }], Array(501).fill(snapshot.events[0])]) {
      assert.equal(build({ snapshot: { ...snapshot, events } }), null);
    }
  });
  check('prompt projects only the supported relationship; no raw events or positive gap data', () => {
    const prompt = policy.buildDecisionPrompt(evidence); const serialized = JSON.stringify(prompt);
    for (const secret of ['PRIVATE TITLE', 'PRIVATE BODY', 'private@example', 'https://meet', '08:20', '15:30', 'fixture-proposal']) {
      assert.ok(!serialized.includes(secret), secret);
    }
    assert.ok(serialized.includes('Actual availability is unknown'));
    assert.ok(serialized.includes('The deadline cannot be moved'));
    assert.equal(policy.buildDecisionPrompt(null), null);
  });
  check('AI can only select bounded code-owned wording or abstain', () => {
    for (const choice of ['check', 'notice']) {
      const result = policy.resolveDecision(evidence, JSON.stringify({ choice }), base);
      assert.equal(result.status, 'accepted'); assert.ok(result.text.includes('before 15:00.'));
      assert.ok(result.text.includes('one uninterrupted 45-minute stretch')); assert.ok(result.text.includes('"Review the client proposal"'));
      assert.ok(result.text.split(/\s+/).length < 30); assert.ok(!/15:30|free|available|packed|solid|must|won.t hold|45-minute pieces/.test(result.text));
    }
    assert.equal(policy.resolveDecision(evidence, { choice: 'abstain' }, base).text, null);
  });
  check('novelty withholds the same relationship rather than rotating its wording', () => {
    const accepted = policy.resolveDecision(evidence, { choice: 'notice' }, base);
    assert.ok(Object.isFrozen(accepted.reading));
    const recentReadings = [accepted.reading];
    assert.equal(build({ recentReadings }), null);
    assert.equal(policy.resolveDecision(evidence, { choice: 'check' }, { ...base, recentReadings }).status, 'stale-evidence');
    assert.ok(build({ recentReadings: [{ ...accepted.reading, taskId: 'another-task' }] }));
    assert.ok(build({ recentReadings: [{ ...accepted.reading, durationMinutes: 30 }] }));
    for (const recentReadings of [null, {}, [null], [{}], Array(4).fill(accepted.reading),
      [{ ...accepted.reading, durationMinutes: -1 }], [{ ...accepted.reading, durationMinutes: 30.5 }],
      [{ ...accepted.reading, deadlineLabel: '25:00' }], [{ ...accepted.reading, taskId: '' }]]) {
      assert.equal(build({ recentReadings }), null);
    }
    assert.ok(!JSON.stringify(policy.buildDecisionPrompt(evidence)).includes('provenance'));
  });
  check('both bounded stances stay short and non-directive across label length and durations', () => {
    for (const [label, duration, deadline] of [
      ['Review client proposal', 45, '15:00'], ['Prepare interview notes', 30, '12:00'],
      ['Review the final draft of the client proposal', 120, '15:00'],
    ]) {
      const current = { ...base, task: { ...task, text: `${label} needs ${duration} uninterrupted minutes; send before ${deadline}` } };
      const item = policy.buildEvidence(current); assert.ok(item);
      const texts = ['check', 'notice'].map(choice => {
        const result = policy.resolveDecision(item, { choice }, current);
        assert.equal(result.status, 'accepted'); assert.ok(result.text.includes(`before ${deadline}.`));
        assert.ok(result.text.includes(`uninterrupted ${duration}-minute`));
        assert.ok(result.text.split(/\s+/).length < 30);
        assert.ok(!/\b(?:block|claim|must|should|overdue|waiting|booked|available|free)\b/i.test(result.text));
        return result.text;
      });
      assert.notEqual(texts[0], texts[1]);
    }
  });
  check('the observed unsafe simulation lines cannot become accepted output', () => {
    for (const response of [
      'The proposal needs 45 clear minutes before 15:00, but your morning’s booked solid — worth deciding now whether it slides to after 15:30.',
      'Your calendar’s packed solid in 45-minute pieces until 15:30 — the proposal needs one unbroken stretch before 15:00, and none exists yet.',
      'The proposal needs 45 clear minutes before 15:00 — your 10:30–15:30 stretch has room, but it won’t hold itself.',
      { choice: 'check', text: 'You are free after 15:30.' }, { choice: 'check', deadline: '15:30' },
      { choice: 'notice', durationMinutes: 45 }, { choice: 'booked-solid' }, [], null,
      '```json\n{"choice":"check"}\n```', '{"choice":"check","__proto__":{}}',
    ]) assert.equal(policy.resolveDecision(evidence, response, base).text, null);
  });
  check('late replies re-check deadline, freshness, connection and changed task evidence', () => {
    for (const current of [{ ...base, task: { ...task, done: true } },
      { ...base, task: { ...task, text: task.text.replace('45', '40') } },
      { ...base, task: { ...task, id: 'other-task' } }, { ...base, now: at('08:06') },
      { ...base, snapshot: { ...snapshot, hidden: true } }, { ...base, snapshot: { ...snapshot, connected: false } },
      { ...base, snapshot: { ...snapshot, events: [] } }]) {
      assert.equal(policy.resolveDecision(evidence, { choice: 'check' }, current).status, 'stale-evidence');
    }
    assert.equal(policy.resolveDecision(evidence, { choice: 'check' }, { ...base, now: at('08:01') }).status, 'accepted');
  });
  check('source/task and snapshot stay pure; runtime policy is lazy and shares the tooling implementation', () => {
    const before = structuredClone(base);
    policy.buildDecisionPrompt(build()); policy.resolveDecision(evidence, { choice: 'check' }, base);
    assert.deepEqual(base, before);
    const source = readFileSync(new URL('../assets/calendar-nudge-policy.js', import.meta.url), 'utf8');
    assert.ok(!/localStorage|fetch\(|appMemory|Date\.now/.test(source));
    assert.match(readFileSync(new URL('./lib/calendar-nudge-policy.cjs', import.meta.url), 'utf8'), /require\('..\/..\/assets\/calendar-nudge-policy.js'\)/);
    assert.match(readFileSync(new URL('../assets/calendar-nudge.js', import.meta.url), 'utf8'), /import\('\.\/calendar-nudge-policy.js'\)/);
    assert.match(readFileSync(new URL('../assets/nudge.js', import.meta.url), 'utf8'), /import\('\.\/calendar-nudge.js'\)/);
    assert.doesNotMatch(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /<script[^>]+calendar-nudge-policy/);
    assert.match(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), /'\/assets\/calendar-nudge-policy.js'/);
  });
  check('ordinary writer gets only derived same-task evidence and no worked examples or event details', () => {
    const text = policy.writerContext(evidence);
    assert.ok(text.includes(evidence.label));
    assert.ok(text.includes('Attendance, actual availability and other commitments are unknown'));
    assert.equal(policy.writerContext(null), null);
    for (const secret of ['PRIVATE TITLE', 'PRIVATE BODY', 'private@example', 'https://meet', '08:20', '15:30', 'fixture-proposal', 'provenance', 'capturedAt']) {
      assert.ok(!text.includes(secret), secret);
    }
    assert.ok(!/for example|e\.g\.|example line/i.test(policy.writerInstruction));
  });
  check('writer rejects known Calendar overreach without imposing a code-owned sentence', () => {
    assert.equal(policy.writerTextIsBounded(evidence, 'Review the client proposal asks for continuity against the Calendar’s shorter gaps; how those commitments fit remains yours.'), true);
    assert.equal(policy.writerTextIsBounded(evidence, 'The choice you made when bringing this back is still yours.'), true);
    for (const text of [
      'Your Calendar leaves you free for Review the client proposal.',
      'Review the client proposal could move later; your Calendar is packed.',
      'Review the client proposal needs 30 minutes against those Calendar gaps.',
      'Review the client proposal has shorter Calendar gaps before 15:30.',
      'Review the client proposal sits against 3 meetings in your Calendar.',
      'Your Calendar’s gaps are shorter; the task may need another look.',
    ]) assert.equal(policy.writerTextIsBounded(evidence, text), false, text);
  });
  check('interval policy agrees with an independent minute-grid oracle on 100 synthetic schedules', () => {
    let seed = 731;
    const random = max => { seed = (seed * 48271) % 2147483647; return seed % max; };
    for (let run = 0; run < 100; run++) {
      const grid = Array(420).fill(false), events = [];
      for (let i = 0; i < 1 + random(12); i++) {
        const start = random(419), end = Math.min(420, start + 1 + random(120));
        events.push({ start: at('08:00') + start * 60000, end: at('08:00') + end * 60000 });
        for (let minute = start; minute < end; minute++) grid[minute] = true;
      }
      let longest = 0, gap = 0;
      for (const recorded of grid) { gap = recorded ? 0 : gap + 1; longest = Math.max(longest, gap); }
      assert.equal(!!build({ snapshot: { ...snapshot, events: events.reverse() } }), longest < 45);
    }
  });
  check('local midnight and DST skipped/repeated deadline hours are not guessed', () => {
    process.env.TZ = 'America/New_York';
    for (const [date, deadline] of [['2026-03-08T00:00:00-05:00', '02:30'], ['2026-11-01T00:00:00-04:00', '01:30']]) {
      assert.equal(policy.constraint({ ...task, text: task.text.replace('15:00', deadline) }, Date.parse(date)), null);
    }
    for (const date of ['2026-03-08T08:00:00-04:00', '2026-11-01T08:00:00-05:00']) {
      const now = Date.parse(date); const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      assert.ok(build({ now, snapshot: { ...snapshot, capturedAt: now, windowStart: +start, windowEnd: +end,
        events: [{ start: now, end: now + 8 * 3600000 }] } }));
    }
  });
  console.log(`\n${checks} Calendar nudge protection groups passed (offline, synthetic only).`);
} finally { if (savedTZ === undefined) delete process.env.TZ; else process.env.TZ = savedTZ; }
