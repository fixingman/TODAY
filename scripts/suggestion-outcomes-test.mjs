// TODAY — inline AI suggestion outcome-loop regression test
//
// Covers reason classification, applied/dismissed/ignored measurement,
// completion evidence, conservative reversal detection, and reason-level
// reduction/preference policy. No live provider calls.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.woff2':'font/woff2', '.css':'text/css' };

let puppeteer;
try { puppeteer = (await import('puppeteer-core')).default; }
catch { console.error('✗ puppeteer-core not installed — run: cd scripts && npm install'); process.exit(1); }

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';
  try {
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, resolve));
const URL_BASE = `http://localhost:${server.address().port}`;

let browser;
const ok = message => console.log('  ✓ ' + message);
const fail = async (label, detail) => {
  console.error('✗ FAIL — ' + label);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  if (browser) await browser.close();
  server.close();
  process.exit(1);
};
const expectAll = async (label, result) => {
  const failed = Object.entries(result).filter(([, value]) => !value);
  if (failed.length) await fail(label, result);
};

browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(() => {
    localStorage.clear();
    localStorage.setItem('splash_shown_at', String(Date.now()));
  });
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    () => typeof _suggestionOutcomeRecord === 'function' &&
          typeof _suggestionReconcileOutcomes === 'function' &&
          typeof _suggestionPerformanceContext === 'function',
    { timeout: 15000 }
  );

  // 1. Reasons are explicit when supplied and deterministic when old/model
  // responses omit the new enum.
  {
    const result = await page.evaluate(() => ({
      explicit: _suggestionReason(
        { type: 'break_down', reason: 'long_complex_task' },
        'Draft and review the report'
      ) === 'long_complex_task',
      multiple: _suggestionReason(
        { type: 'break_down' },
        'Draft and review the report'
      ) === 'multiple_actions',
      long: _suggestionReason(
        { type: 'break_down' },
        'Prepare detailed quarterly report covering the latest customer feedback carefully'
      ) === 'long_complex_task',
      vague: _suggestionReason(
        { type: 'clarify' },
        'work stuff'
      ) === 'vague_task',
    }));
    await expectAll('reason classification', { ...result, noErrors: errors.length === 0 });
    ok('reason classification: explicit enum plus deterministic legacy fallbacks');
  }

  // 2. The four requested outcomes remain distinguishable by reason; completing
  // a generated step supplies stronger positive evidence than applying alone.
  {
    const result = await page.evaluate(() => {
      appMemory.suggestionOutcomes = [];
      const details = taskId => ({
        taskId,
        taskText: 'Draft and review launch notes',
        type: 'break_down',
        reason: 'multiple_actions',
        message: 'This combines drafting and review',
      });
      const dismissedId = _suggestionOutcomeRecord(details('manual_dismissed'));
      _suggestionOutcomeDismiss(dismissedId, 'user');
      const ignoredId = _suggestionOutcomeRecord(details('manual_ignored'));
      _suggestionOutcomeDismiss(ignoredId, 'auto');
      const appliedId = _suggestionOutcomeRecord(details('manual_applied'));
      _suggestionOutcomeApply(appliedId, ['manual_generated_1', 'manual_generated_2']);
      _memoryOnTaskComplete('Draft launch notes', 'manual_generated_1');
      const stats = _suggestionOutcomeStats('multiple_actions');
      const applied = appMemory.suggestionOutcomes.find(entry => entry.id === appliedId);
      return {
        offered: stats.offered === 3,
        applied: stats.applied === 1,
        dismissed: stats.dismissed === 1,
        ignored: stats.ignored === 1,
        helped: stats.helped === 1,
        reasonRecorded: applied?.reason === 'multiple_actions',
        whyRecorded: applied?.reasonText === 'This combines drafting and review',
        generatedIdsRecorded: applied?.resultTaskIds?.length === 2,
        persisted: JSON.parse(localStorage.getItem('today_memory')).suggestionOutcomes.length === 3,
      };
    });
    await expectAll('outcome lifecycle', { ...result, noErrors: errors.length === 0 });
    ok('outcome lifecycle: applied, dismissed, ignored and completed-step evidence measured by reason');
  }

  // 3. Reversal is conservative: all generated steps discarded or the original
  // recreated. A suggestion that already produced a completed step cannot flip.
  {
    const result = await page.evaluate(() => {
      appMemory.suggestionOutcomes = [];
      localStorage.setItem('today_deleted_ids', JSON.stringify([
        { id: 'manual_discard_1', at: new Date().toISOString() },
        { id: 'manual_discard_2', at: new Date().toISOString() },
        { id: 'manual_helped_1', at: new Date().toISOString() },
        { id: 'manual_immediate_1', at: new Date().toISOString() },
      ]));

      const discardedId = _suggestionOutcomeRecord({
        taskId: 'manual_original_1', taskText: 'Plan and send launch',
        type: 'break_down', reason: 'multiple_actions', message: 'Two actions',
      });
      _suggestionOutcomeApply(discardedId, ['manual_discard_1', 'manual_discard_2']);
      appMemory.suggestionOutcomes.find(entry => entry.id === discardedId).appliedAt = '2026-08-20T09:00:00.000Z';

      const restoredId = _suggestionOutcomeRecord({
        taskId: 'manual_original_2', taskText: 'Prepare detailed client launch plan',
        type: 'break_down', reason: 'long_complex_task', message: 'Several steps',
      });
      _suggestionOutcomeApply(restoredId, ['manual_missing_step']);
      appMemory.suggestionOutcomes.find(entry => entry.id === restoredId).appliedAt = '2026-08-20T09:00:00.000Z';
      manualTasks.push({ id: 'manual_restored', text: 'Prepare detailed client launch plan' });

      const helpedId = _suggestionOutcomeRecord({
        taskId: 'manual_original_3', taskText: 'Write and edit summary',
        type: 'break_down', reason: 'multiple_actions', message: 'Two actions',
      });
      _suggestionOutcomeApply(helpedId, ['manual_helped_1']);
      _suggestionOutcomeOnTaskComplete('manual_helped_1');

      const immediateId = _suggestionOutcomeRecord({
        taskId: 'manual_original_4', taskText: 'Outline and revise proposal',
        type: 'break_down', reason: 'multiple_actions', message: 'Two actions',
      });
      _suggestionOutcomeApply(immediateId, ['manual_immediate_1']);

      manualTasks.push({ id: 'manual_existing_duplicate', text: 'Plan and review release' });
      const duplicateId = _suggestionOutcomeRecord({
        taskId: 'manual_original_5', taskText: 'Plan and review release',
        type: 'break_down', reason: 'multiple_actions', message: 'Two actions',
      });
      _suggestionOutcomeApply(duplicateId, ['manual_missing_duplicate_step']);
      appMemory.suggestionOutcomes.find(entry => entry.id === duplicateId).appliedAt = '2026-08-20T09:00:00.000Z';

      _suggestionReconcileOutcomes();
      const byId = id => appMemory.suggestionOutcomes.find(entry => entry.id === id);
      return {
        discardedReversed: byId(discardedId)?.outcome === 'reversed' &&
          byId(discardedId)?.reversalReason === 'all_steps_discarded',
        restoredReversed: byId(restoredId)?.outcome === 'reversed' &&
          byId(restoredId)?.reversalReason === 'original_restored',
        helpedWins: byId(helpedId)?.outcome === 'helped' && !byId(helpedId)?.reversedAt,
        undoGracePreserved: byId(immediateId)?.outcome === 'applied' && !byId(immediateId)?.reversedAt,
        baselineDuplicatePreserved: byId(duplicateId)?.outcome === 'applied' && !byId(duplicateId)?.reversedAt,
      };
    });
    await expectAll('reversal reconciliation', { ...result, noErrors: errors.length === 0 });
    ok('reversal reconciliation: only strong downstream rejection flips an applied outcome');
  }

  // 4. Four repeated failures reduce a reason to deterministic one-in-four
  // exploration, while a reason with completion evidence is described as one
  // to prefer when it fits.
  {
    const result = await page.evaluate(() => {
      appMemory.suggestionOutcomes = [];
      const add = (reason, index, outcome) => {
        const id = _suggestionOutcomeRecord({
          taskId: reason + '_' + index,
          taskText: reason + ' example task',
          type: 'break_down', reason, message: reason,
        });
        if (outcome === 'dismissed') _suggestionOutcomeDismiss(id, 'user');
        if (outcome === 'applied') _suggestionOutcomeApply(id, ['generated_' + reason + '_' + index]);
        if (outcome === 'helped') {
          _suggestionOutcomeApply(id, ['generated_' + reason + '_' + index]);
          _suggestionOutcomeOnTaskComplete('generated_' + reason + '_' + index);
        }
      };
      for (let i = 0; i < 4; i++) add('vague_task', i, 'dismissed');
      add('multiple_actions', 1, 'helped');
      add('multiple_actions', 2, 'applied');
      add('multiple_actions', 3, 'applied');

      const reducedOffers = Array.from({ length: 40 }, (_, i) =>
        _suggestionShouldOffer('vague_task', 'candidate_' + i)
      ).filter(Boolean).length;
      const healthyOffers = Array.from({ length: 40 }, (_, i) =>
        _suggestionShouldOffer('multiple_actions', 'candidate_' + i)
      ).filter(Boolean).length;
      const context = _suggestionPerformanceContext();
      return {
        markedUnderperforming: _suggestionOutcomeStats('vague_task').underperforming,
        reducedNotBanned: reducedOffers >= 5 && reducedOffers <= 15,
        healthyUnreduced: healthyOffers === 40,
        weakReasonNamed: context.includes('vague_task') && context.includes('use rarely'),
        helpfulReasonNamed: context.includes('multiple_actions') && context.includes('prefer when it genuinely fits'),
      };
    });
    await expectAll('learning policy', { ...result, noErrors: errors.length === 0 });
    ok('learning policy: repeated failures reduce exposure; completed-step patterns earn preference context');
  }

  console.log('\nSuggestion outcome tests passed (4 groups).');
  await page.close();
} finally {
  if (browser) await browser.close();
  server.close();
}
