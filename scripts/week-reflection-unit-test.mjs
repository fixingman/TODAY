// Direct unit tests for the DOM-free Sunday weekly-reflection evidence policy.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const {
  _buildWeekReflectionInsight,
  _weekReflectionTextIsGrounded,
} = require(join(ROOT, 'assets/week-reflection-policy.js'));

let passed = 0;
let failed = 0;
function test(label, assertion) {
  try {
    if (!assertion()) throw new Error('assertion returned false');
    console.log('  ✓ ' + label);
    passed++;
  } catch (error) {
    console.error('  ✗ ' + label + ' — ' + error.message);
    failed++;
  }
}

const day = (iso, tasks, focus = 0, habitsKept = 0, habitsTotal = 0) =>
  ({ iso, tasks, focus, habitsKept, habitsTotal });

console.log('\nweekly-reflection policy unit tests\n');

test('fewer than four recorded days abstains', () =>
  _buildWeekReflectionInsight({ days: [day('2026-08-21', 4), day('2026-08-22', 1), day('2026-08-23', 0)] }) === null);

test('flat visible-counter week abstains', () =>
  _buildWeekReflectionInsight({
    days: [17,18,19,20,21,22,23].map(date => day(`2026-08-${date}`, 1)), history: [],
  }) === null);

test('focus relationship requires observations on both sides and clears thresholds', () => {
  const insight = _buildWeekReflectionInsight({
    days: [
      day('2026-08-17', 5, 25), day('2026-08-18', 4, 20),
      day('2026-08-19', 1), day('2026-08-20', 1), day('2026-08-21', 0), day('2026-08-22', 1), day('2026-08-23', 0),
    ], history: [],
  });
  return insight?.kind === 'focus-leverage' && insight.evidence.includes('2 focus days') && insight.score > 110;
});

test('one focus day is not enough to infer focus leverage', () => {
  const insight = _buildWeekReflectionInsight({
    days: [
      day('2026-08-17', 6, 25), day('2026-08-18', 1), day('2026-08-19', 1),
      day('2026-08-20', 1), day('2026-08-21', 1), day('2026-08-22', 1), day('2026-08-23', 1),
    ], history: [],
  });
  return insight === null;
});

test('habit alignment beats the weaker burst observation', () => {
  const insight = _buildWeekReflectionInsight({
    days: [
      day('2026-08-17', 4, 0, 1, 1), day('2026-08-18', 4, 0, 1, 1),
      day('2026-08-19', 1, 0, 0, 1), day('2026-08-20', 1, 0, 0, 1),
      day('2026-08-21', 1), day('2026-08-22', 0), day('2026-08-23', 0),
    ], history: [],
  });
  return insight?.kind === 'habit-alignment' && insight.evidence.includes('every habit held');
});

test('recurring weekday requires earlier matching weekdays', () => {
  const days = [
    day('2026-08-17', 1), day('2026-08-18', 5), day('2026-08-19', 1),
    day('2026-08-20', 1), day('2026-08-21', 1), day('2026-08-22', 1), day('2026-08-23', 1),
  ];
  const withoutHistory = _buildWeekReflectionInsight({ days, history: [] });
  const withHistory = _buildWeekReflectionInsight({ days, history: [
    { date:'2026-08-04', tasksDone:4 }, { date:'2026-08-11', tasksDone:4 },
    { date:'2026-08-05', tasksDone:1 }, { date:'2026-08-06', tasksDone:1 },
    { date:'2026-08-07', tasksDone:1 }, { date:'2026-08-08', tasksDone:1 },
  ] });
  return withoutHistory === null && withHistory?.kind === 'recurring-day' && withHistory.evidence.startsWith('Tuesday');
});

test('concentrated two-day rhythm is the weakest qualifying candidate', () => {
  const insight = _buildWeekReflectionInsight({
    days: [
      day('2026-08-17', 5), day('2026-08-18', 3), day('2026-08-19', 0),
      day('2026-08-20', 0), day('2026-08-21', 0), day('2026-08-22', 0), day('2026-08-23', 0),
    ], history: [],
  });
  return insight?.kind === 'bursts' && insight.score === 65;
});

test('focus candidate outranks simultaneous habit and burst candidates', () => {
  const insight = _buildWeekReflectionInsight({
    days: [
      day('2026-08-17', 5, 25, 1, 1), day('2026-08-18', 5, 20, 1, 1),
      day('2026-08-19', 1, 0, 0, 1), day('2026-08-20', 1, 0, 0, 1),
      day('2026-08-21', 0), day('2026-08-22', 0), day('2026-08-23', 0),
    ], history: [],
  });
  return insight?.kind === 'focus-leverage';
});

for (const [label, text] of [
  ['empty output', ''],
  ['explicit abstention', 'none'],
  ['identity claim', "That is just who you are now."],
  ['personality inference', "You're the kind of person who saves the week on Tuesday."],
  ['causal claim', 'Focus caused you to finish more.'],
  ['tenure claim', '202 days in, Tuesdays still carry the week.'],
  ['overlong output', Array.from({ length: 27 }, () => 'word').join(' ')],
]) {
  test(`validator rejects ${label}`, () => !_weekReflectionTextIsGrounded(text));
}

test('validator accepts useful personality within the evidence boundary', () =>
  _weekReflectionTextIsGrounded('Focus days did the heavy lifting; the week moved differently when you made room for them.'));

console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
