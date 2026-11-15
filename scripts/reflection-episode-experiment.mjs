// Offline research tool. Never imported by TODAY; no network, AI or output files.
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FEELINGS = ['joyful', 'scattered', 'alive', 'tense', 'content', 'frustrated', 'calm', 'drained', 'present', 'sad', 'off'];
const STARTS = ['soon_pull', 'revive'];
const TERMINALS = ['done', 'letgo'];
const DAY = 86400000;
const day = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(value)) return NaN;
  const n = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === value ? n : NaN;
};
const stamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value)
  && Number.isFinite(day(value.slice(0, 10))) && Number.isFinite(Date.parse(value));
const fraction = (rows, feeling) => rows.length ? rows.filter(r => r === feeling).length / rows.length : null;
const unique = values => [...new Set(values)];
const count = (object, key) => { object[key] = (object[key] || 0) + 1; };

function components(pairs) {
  const parent = new Map();
  const root = d => { if (!parent.has(d)) parent.set(d, d); if (parent.get(d) !== d) parent.set(d, root(parent.get(d))); return parent.get(d); };
  for (const p of pairs) parent.set(root(p.from), root(p.to));
  return new Set([...parent.keys()].map(root)).size;
}

function measures(pairs, baseline, feelings, feeling) {
  const from = unique(pairs.map(p => p.from)).map(d => feelings.get(d));
  const to = unique(pairs.map(p => p.to)).map(d => feelings.get(d));
  const other = baseline.map(d => feelings.get(d));
  const endRate = fraction(to, feeling), startRate = fraction(from, feeling), baselineRate = fraction(other, feeling);
  return { startDays: from.length, resolutionDays: to.length, baselineDays: other.length,
    disjointDateComponents: components(pairs), startCount: from.filter(f => f === feeling).length,
    resolutionCount: to.filter(f => f === feeling).length, baselineCount: other.filter(f => f === feeling).length,
    episodeGap: endRate === null || startRate === null ? null : endRate - startRate,
    baselineGap: endRate === null || baselineRate === null ? null : endRate - baselineRate };
}

// Screening thresholds are conservative research rules, not confidence intervals.
function screen(m) {
  const failures = [];
  if (Math.min(m.startDays, m.resolutionDays, m.baselineDays) < 4) failures.push('fewer_than_four_days_per_group');
  if (m.disjointDateComponents < 4) failures.push('fewer_than_four_disjoint_date_components');
  if (m.episodeGap === null || m.baselineGap === null || Math.abs(m.episodeGap) < .30 || Math.abs(m.baselineGap) < .30)
    failures.push('difference_below_30_percentage_points');
  if (!m.episodeGap || Math.sign(m.episodeGap) !== Math.sign(m.baselineGap)) failures.push('ordinary_day_comparison_disagrees');
  const strongerCount = m.episodeGap > 0 ? m.resolutionCount : m.startCount;
  if (strongerCount < 3) failures.push('fewer_than_three_occurrences_on_stronger_side');
  return failures;
}

export function analyzeEpisodes(backup, today) {
  if (!Number.isFinite(day(today))) throw new Error('Use a valid --today YYYY-MM-DD.');
  if (!backup || typeof backup !== 'object' || !Array.isArray(backup.reflections)
      || !Array.isArray(backup.memory?.taskOutcomes) || !stamp(backup.saved_at))
    throw new Error('Expected a TODAY backup with saved_at, reflections and memory.taskOutcomes.');
  const floor = new Date(day(today) - 29 * DAY).toISOString().slice(0, 10);
  const report = { experiment: 'commitment-episodes-v1', today, windowDays: 30,
    snapshotAgeDays: Math.floor((day(today) - day(backup.saved_at.slice(0, 10))) / DAY),
    status: 'exploratory_only', coverage: {}, exclusions: {}, routes: [], signals: [],
    limitations: [
      'A snapshot is not proof of current installed state; bounded outcome history can omit events.',
      'Text-hash linkage is approximate; renamed tasks and hash collisions cannot be resolved here.',
      'Date-only events do not establish within-day order or when a focus session happened.',
      'Different feeling words are not an ordered wellbeing scale; associations are not causes.',
      'Screening many hypotheses can find coincidences. No statistical significance or confirmed usefulness is claimed.',
      'Signals require source-linkage, existing-feedback and usefulness review; none are displayed or sent to a model.'
    ] };
  if (backup.reflection_policy?.choice !== 'remember' || !stamp(backup.reflection_policy?.updatedAt)) {
    report.status = 'not_opted_in'; return report;
  }
  if (report.snapshotAgeDays < 0) throw new Error('The snapshot is newer than --today.');
  const clear = backup.reflections_cleared_at || '';
  if (clear && !stamp(clear)) throw new Error('Invalid reflection clear watermark.');
  const memoryClear = backup.memory.clearedAt || '';
  if (memoryClear && !stamp(memoryClear)) throw new Error('Invalid Memory clear watermark.');
  const latest = new Map(), ambiguous = new Set();
  for (const row of backup.reflections) {
    if (!row || !Number.isFinite(day(row.date)) || !FEELINGS.includes(row.feeling) || !stamp(row.updatedAt)
        || row.date < floor || row.date > today || (clear && row.updatedAt <= clear)
        || Date.parse(row.updatedAt) >= day(today) + DAY) { count(report.exclusions, 'ineligibleReflection'); continue; }
    const old = latest.get(row.date);
    if (!old || row.updatedAt > old.updatedAt) { latest.set(row.date, row); ambiguous.delete(row.date); }
    else if (old.updatedAt === row.updatedAt && old.feeling !== row.feeling) ambiguous.add(row.date);
  }
  const feelings = new Map([...latest].filter(([d]) => !ambiguous.has(d)).map(([d, r]) => [d, r.feeling]));
  report.coverage.reflectedDays = feelings.size;
  report.coverage.ambiguousReflectionDays = ambiguous.size;
  const byKey = new Map(), seen = new Set(), allEpisodeDates = new Set(), observedResolutionDates = new Set();
  for (const row of backup.memory.taskOutcomes) {
    if (!row || ![...STARTS, ...TERMINALS].includes(row.outcome) || !Number.isFinite(day(row.date))
        || row.date < floor || row.date > today || (memoryClear && row.date < memoryClear.slice(0, 10)) || row.backfilled) {
      count(report.exclusions, 'ineligibleOutcome'); continue;
    }
    if (STARTS.includes(row.outcome)) allEpisodeDates.add(row.date);
    else observedResolutionDates.add(row.date);
    // Never reconstruct linkage from task titles or general Memory.
    if (typeof row.key !== 'string' || !row.key || row.key.length > 200) { count(report.exclusions, 'missingLinkKey'); continue; }
    const id = JSON.stringify([row.key, row.date, row.outcome, row.id]);
    if (seen.has(id)) continue;
    seen.add(id);
    if (!byKey.has(row.key)) byKey.set(row.key, []);
    byKey.get(row.key).push({ date: row.date, outcome: row.outcome, id: row.id });
  }
  const pairs = [];
  for (const [link, rows] of byKey) {
    if (rows.some(r => STARTS.includes(r.outcome))) for (const r of rows) allEpisodeDates.add(r.date);
    // Multiple live completion ids for one text-key are ambiguous, not repeated proof.
    const liveIds = unique(rows.filter(r => r.outcome === 'done' && typeof r.id === 'string' && !r.id.startsWith('txt_')).map(r => r.id));
    if (liveIds.length > 1) { count(report.exclusions, 'ambiguousTaskKey'); continue; }
    const days = new Map();
    for (const r of rows) { if (!days.has(r.date)) days.set(r.date, new Set()); days.get(r.date).add(r.outcome); }
    const dates = [...days.keys()].sort();
    for (const from of dates) {
      const kinds = [...days.get(from)].filter(k => STARTS.includes(k));
      if (!kinds.length) continue;
      allEpisodeDates.add(from);
      if (kinds.length !== 1 || [...days.get(from)].some(k => TERMINALS.includes(k))) { count(report.exclusions, 'sameDayOrderUnknown'); continue; }
      const to = dates.find(d => d > from);
      if (!to) { count(report.exclusions, 'noLaterRecordedOutcome'); continue; }
      allEpisodeDates.add(to);
      const next = [...days.get(to)];
      if (next.some(k => STARTS.includes(k))) { count(report.exclusions, 'restartedOrAmbiguousBeforeResolution'); continue; }
      if (next.length !== 1 || !TERMINALS.includes(next[0])) { count(report.exclusions, 'ambiguousResolution'); continue; }
      if (!feelings.has(from) || !feelings.has(to)) { count(report.exclusions, 'missingEndpointFeeling'); continue; }
      pairs.push({ from, to, start: kinds[0], end: next[0], link });
    }
  }
  const baseline = [...feelings.keys()].filter(d => observedResolutionDates.has(d) && !allEpisodeDates.has(d));
  report.coverage.linkedEpisodes = pairs.length;
  report.coverage.distinctDatePairs = unique(pairs.map(p => JSON.stringify([p.from, p.to]))).length;
  report.coverage.baselineDays = baseline.length;
  report.coverage.hypothesesExamined = STARTS.length * TERMINALS.length * FEELINGS.length;
  for (const start of STARTS) for (const end of TERMINALS) {
    const selected = [...new Map(pairs.filter(p => p.start === start && p.end === end)
      .map(p => [JSON.stringify([p.from, p.to]), p])).values()];
    const routePairs = pairs.filter(p => p.start === start && p.end === end);
    const route = { start, resolution: end, linkedTasks: unique(routePairs.map(p => p.link)).length, linkedEpisodes: routePairs.length,
      datePairs: selected.length, disjointDateComponents: components(selected), baselineDays: baseline.length,
      failureCounts: {} };
    for (const feeling of FEELINGS) {
      const m = measures(selected, baseline, feelings, feeling), failures = screen(m);
      if (!failures.length) {
        // Remove every pair sharing a date, not merely one task or one pair.
        const sharedDates = unique([...selected.flatMap(p => [p.from, p.to]), ...baseline]);
        const stable = sharedDates.every(d => {
          const reduced = measures(selected.filter(p => p.from !== d && p.to !== d), baseline.filter(b => b !== d), feelings, feeling);
          return !screen(reduced).length && Math.sign(reduced.episodeGap) === Math.sign(m.episodeGap);
        });
        if (stable) report.signals.push({ start, resolution: end, feeling, ...m, status: 'review_only',
          leaveOneDateOut: 'passed', feedbackReview: 'required', usefulnessVerdict: 'unverified' });
        else count(route.failureCounts, 'depends_on_shared_date_or_minimum_support');
      } else for (const reason of failures) count(route.failureCounts, reason);
    }
    report.routes.push(route);
  }
  report.status = report.signals.length ? 'review_only_signals' : 'no_supported_reading';
  return report;
}

export function main(args) {
  if (args.length !== 4 || args[0] !== '--backup' || args[2] !== '--today')
    throw new Error('Usage: node scripts/reflection-episode-experiment.mjs --backup /outside/repo/today-backup.json --today YYYY-MM-DD');
  const path = realpathSync(args[1]), root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const rel = relative(root, path);
  if (!isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep))
    throw new Error('Keep personal backup input outside the repository.');
  const backup = JSON.parse(readFileSync(path, 'utf8'));
  return analyzeEpisodes(backup, args[3]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(main(process.argv.slice(2)), null, 2)); }
  catch (error) {
    // Filesystem/parser errors may contain private paths or source fragments.
    const safe = /^(Use a valid|Usage:|Expected a TODAY|Invalid .* watermark\.|The snapshot|Keep personal)/.test(error.message);
    console.error(safe ? error.message : 'Could not read the backup. Check the path and JSON format.');
    process.exitCode = 1;
  }
}
