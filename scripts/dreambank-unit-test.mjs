// DreamBank unit test — pure helpers (night resolution, grounding, file format) and the
// queue's loss, upload, tombstone, prune, and backoff rules, with fake I/O.
// Run: node scripts/dreambank-unit-test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SRC = readFileSync(new URL('../assets/dreambank.js', import.meta.url), 'utf8');
const ok = msg => console.log('  ✓ ' + msg);

function boot({ seed, aiConfigured = true } = {}) {
  const store = new Map();
  if (seed) store.set('today-dream-queue', JSON.stringify(seed));
  const defined = {};
  const calls = { ai: [], upload: [], move: [], del: [], autosave: 0 };
  const io = { ai: [], upload: [], del: [] }; // queued responses (or gates) per call type
  const window = {
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k),
    },
    navigator: { onLine: true },
    setTimeout: () => 0, // flushes are driven explicitly below
    clearTimeout: () => {},
    fetch: async (_url, opts) => {
      const body = JSON.parse(opts.body);
      calls.ai.push(body);
      const next = io.ai.shift() || { content: '' };
      if (next.gate) await next.gate;
      if (next.throw) throw new Error(next.throw);
      return { ok: true, json: async () => next.body || next };
    },
    appMemory: {},
    _saveMemory: () => {},
    _setLastLocalChange: () => {},
    dropboxAutoSave: () => { calls.autosave++; },
    safeJSON: (k, fb) => { try { return JSON.parse(store.get(k)) ?? fb; } catch { return fb; } },
    esc: s => String(s),
    Today: {
      define: (name, api) => { defined[name] = api; },
      use: name => {
        if (name === 'connections') return { _aiGetProvider: () => 'claude', _aiGetKey: () => 'k', _aiIsConfigured: () => aiConfigured };
        if (name === 'dropbox-files') return {
          dreamsDir: '/Dreams-test',
          upload: async (path, text) => { calls.upload.push({ path, text }); return io.upload.shift() || { ok: true, notFound: false }; },
          move: async (from, to) => { calls.move.push({ from, to }); return { ok: true, notFound: false }; },
          remove: async path => { calls.del.push(path); return io.del.shift() || { ok: true, notFound: false }; },
        };
        if (!defined[name]) throw new Error('not available: ' + name);
        return defined[name];
      },
      ui: { register: () => {} },
    },
  };
  window.window = window;
  window.localStorage.setItem('dropbox_token', 'dbx');
  vm.runInNewContext(SRC, window);
  defined['dream-core'].start();
  return { window, defined, calls, io, store, queue: () => JSON.parse(store.get('today-dream-queue') || '[]') };
}
const tick = () => new Promise(r => setImmediate(r));
const settleAll = async () => { for (let i = 0; i < 8; i++) await tick(); };

// ── Pure core ─────────────────────────────────────────────────────────────────
{
  const { defined } = boot();
  const { resolveNight: r, nightLabel, groundImages: g, fileName, toMarkdown } = defined['dream-core'];
  const wed7 = new Date(2026, 8, 30, 7, 0);   // Wed 30 Sep 2026, 07:00
  const wed0030 = new Date(2026, 8, 30, 0, 30);
  assert.deepEqual({ ...r('last_night', wed7) }, { night: '2026-09-29', certainty: 'exact' });
  assert.deepEqual({ ...r('last_night', wed0030) }, { night: '2026-09-29', certainty: 'exact' });
  assert.equal(r('nights_ago:2', wed7).night, '2026-09-28');
  assert.equal(r('weekday:sun', wed7).night, '2026-09-27');
  assert.equal(r('weekday:wed', wed7).night, '2026-09-23', 'same weekday means last week, never today');
  assert.deepEqual({ ...r('', wed7) }, { night: '2026-09-29', certainty: 'approx' });
  assert.deepEqual({ ...r('long_ago', wed7) }, { night: null, certainty: 'approx' });
  assert.deepEqual({ ...r('unknown', wed7) }, { night: null, certainty: 'unknown' });
  assert.deepEqual({ ...r('nights_ago:15', wed7) }, { night: null, certainty: 'unknown' });
  assert.deepEqual({ ...r('2026-09-01', wed7) }, { night: null, certainty: 'unknown' }, 'a model-supplied date is not a hint');
  ok('resolveNight: last night at 07:00 and 00:30, N nights, weekdays, no hint, long ago, garbage');

  assert.equal(nightLabel('2026-09-29', wed7), 'last night');
  assert.equal(nightLabel('2026-09-28', wed7), 'the night before last');
  assert.equal(nightLabel('2026-09-26', wed7), 'Saturday night');
  assert.equal(nightLabel('2026-09-01', wed7), 'Sep 1');
  assert.equal(nightLabel(null, wed7), 'a while ago');
  ok('nightLabel reads relative nights');

  const told = "I was in my grandmother's kitchen and the floor was water. I felt calm.";
  assert.deepEqual([...g(["grandmother's kitchen", 'floor was water', 'kitchen full of Martian soldiers'], told, 'en')],
    ["grandmother's kitchen", 'floor was water']);
  const tr = 'Rüyamda büyükannemin mutfağındaydım. Masada eski bir kitabı ve bahçede bir ağacı gördüm. İstanbul uzaktaydı.';
  assert.deepEqual([...g(['büyükannemin mutfağı', 'eski kitap', 'ağaç', 'İstanbul', 'mor ejderha'], tr, 'tr')],
    ['büyükannemin mutfağı', 'eski kitap', 'ağaç', 'İstanbul']);
  assert.deepEqual([...g(['sea', 'sky'], 'I swam in the sea.', 'en')], ['sea'], 'short images ground as a phrase');
  assert.equal(g(['a', 'b', 'c', 'd', 'e', 'f'].map(x => 'water'), 'water water', 'en').length, 5, 'capped at five');
  ok('grounding: every substantive word must match; Turkish softening and İ/I; invented modifiers dropped');

  const e = { id: 'dream_x', night: '2026-09-29', nightCertainty: 'exact', recordedAt: '2026-09-30T05:00:00.000Z',
    lang: 'tr', images: ['a "quoted" door'], people: [], role: 'waits', retelling: 'Told.', reading: '', thought: 'mine' };
  assert.equal(fileName(e), '2026-09-29_dream_x.md');
  assert.equal(fileName({ ...e, night: null }), 'undated_dream_x.md');
  const md = toMarkdown(e);
  assert.match(md, /^---\nid: "dream_x"\nnight: "2026-09-29"\nnight_certainty: "exact"\n/);
  assert.match(md, /images: \["a \\"quoted\\" door"\]/);
  assert.match(md, /## Retelling\n\nTold\.\n\n## Reading\n\n\n\n## My thought\n\nmine\n$/);
  assert.match(toMarkdown({ ...e, night: null }), /\nnight: null\n/);
  ok('file name and Markdown format (empty sections kept, quotes escaped, undated)');
}

// ── Queue ─────────────────────────────────────────────────────────────────────
{
  const { defined, calls, io, queue } = boot();
  const bank = defined.dreambank;
  const id = bank.capture({ retelling: 'Part one.', hint: 'nights_ago:3' });
  assert.equal(queue().length, 1, 'kept before any AI call');
  assert.equal(calls.ai.length, 0);
  bank.setNight(id, '2026-09-20');
  bank.capture({ id, retelling: 'Part one.\n\nPart two.', hint: 'last_night', lang: 'en' });
  let e = queue()[0];
  assert.equal(e.retelling, 'Part one.\n\nPart two.');
  assert.equal(e.night, '2026-09-20', 'a later hint never overrides the night the user chose');
  assert.equal(e.lang, 'en');
  ok('capture: entry exists before any AI call; later chunks extend it; user night wins');

  // Lost upload reply → backoff; remotePath already recorded; overwrite retry is idempotent.
  io.upload.push({ ok: false, notFound: false });
  await bank.flush();
  e = queue()[0];
  assert.equal(calls.upload.length, 1);
  assert.equal(e.uploadTries, 1);
  assert.ok(e.uploadNextAt > Date.now());
  assert.equal(e.remotePath, '/Dreams-test/2026-09-20_' + id + '.md');
  await bank.flush();
  assert.equal(calls.upload.length, 1, 'backoff holds the next tick');
  bank._list()[0].uploadNextAt = 0;
  await bank.flush();
  assert.equal(calls.upload.length, 2);
  assert.equal(queue()[0].uploadedRev, queue()[0].rev);
  ok('upload: path recorded before the write, backoff on failure, retry overwrites the same path');

  // Night correction renames before re-uploading.
  bank.setNight(id, '2026-09-21');
  await bank.flush();
  assert.deepEqual(calls.move[0], { from: '/Dreams-test/2026-09-20_' + id + '.md', to: '/Dreams-test/2026-09-21_' + id + '.md' });
  assert.equal(calls.upload.at(-1).path, '/Dreams-test/2026-09-21_' + id + '.md');
  ok('a corrected night renames the file, then re-uploads');

  // Discard after upload → remote delete (retried until it succeeds), then gone.
  io.del.push({ ok: false, notFound: false });
  bank.discard(id);
  assert.equal(queue()[0].retelling, '', 'tombstone keeps no dream text');
  await bank.flush();
  assert.equal(calls.del.length, 1);
  assert.equal(queue().length, 1, 'failed delete keeps the tombstone');
  bank._list()[0].uploadNextAt = 0;
  await bank.flush();
  assert.equal(calls.del.length, 2);
  assert.equal(queue().length, 0);
  ok('"Don\'t keep": tombstone, remote delete retried, then removed');
}

{
  const { defined, calls, io, queue } = boot();
  const bank = defined.dreambank;
  let release;
  io.ai.push({ gate: new Promise(r => { release = r; }), content: 'A reading.' });
  io.ai.push({ body: { images: ['door'], people: [], role: 'waits' } });
  const id = bank.capture({ retelling: 'A door.' });
  bank.settle(id);
  await settleAll();
  assert.equal(calls.ai.length, 2, 'reading and extraction start together');
  bank.discard(id);
  release();
  await settleAll();
  assert.equal(queue()[0].reading, '', 'a reading that lands after discard is fenced out');
  await bank.flush();
  assert.equal(queue().length, 0, 'never uploaded → removed without a remote call');
  assert.equal(calls.del.length, 0);
  ok('tombstone fences a late reading; unuploaded discard needs no remote delete');
}

{
  const { defined, calls, io, queue, window } = boot();
  const bank = defined.dreambank;
  io.ai.push({ content: 'A reading.' });
  io.ai.push({ body: { images: ['red door', 'invented dragon'], people: ['a stranger'], role: 'opens it' } });
  const id = bank.capture({ retelling: 'A red door opened.' });
  bank.settle(id);
  await settleAll();
  await bank.flush();
  let e = queue()[0];
  assert.equal(e.reading, 'A reading.');
  assert.deepEqual(e.images, ['red door']);
  assert.equal(e.pruned, false, 'not pruned while the sheet is open (not ready)');
  const row = window.appMemory.dreams.index[0];
  assert.deepEqual([row.id, row.role, row.images.length], [id, 'opens it', 1]);
  assert.ok(!('retelling' in row), 'index never holds the retelling');
  assert.ok(calls.autosave >= 1, 'index change schedules a backup');
  bank.keep(id);
  await bank.flush();
  e = queue()[0];
  assert.equal(e.pruned, true);
  assert.equal(e.retelling, '');
  ok('extraction grounds into the synced index; prune waits for ready + settled + uploaded');
}

{
  const { defined, io, queue } = boot();
  const bank = defined.dreambank;
  io.ai.push({ content: 'ok' }, { content: 'not json at all' });
  const id = bank.capture({ retelling: 'A door.' });
  bank.settle(id);
  await settleAll();
  let e = queue()[0];
  assert.equal(e.extraction, 'pending');
  assert.equal(e.extractionTries, 1);
  assert.ok(e.extractionNextAt > Date.now());
  for (let i = 0; i < 2; i++) {
    bank._list()[0].extractionNextAt = 0;
    io.ai.push({ content: 'still not json' });
    await bank.flush();
    await settleAll();
  }
  e = queue()[0];
  assert.equal(e.extraction, 'failed');
  assert.equal(e.extractionTries, 3);
  ok('bad extraction JSON backs off, then gives up after three tries');
}

{
  const { defined, calls, queue } = boot({ aiConfigured: false });
  const id = defined.dreambank.capture({ retelling: 'A door.' });
  defined.dreambank.settle(id);
  await settleAll();
  assert.equal(calls.ai.length, 0);
  assert.equal(queue()[0].readingState, 'failed');
  assert.equal(queue()[0].extraction, 'failed');
  ok('no AI configured: kept, jobs fail without calls');
}

{
  const seed = [{ id: 'dream_old', retelling: 'Old.', settled: false, ready: false, deleted: false, pruned: false,
    readingState: 'pending', extraction: 'pending', rev: 1, uploadedRev: 0 }];
  const { queue } = boot({ seed });
  assert.equal(queue()[0].settled, true);
  assert.equal(queue()[0].ready, true);
  ok('a dream left by a killed session is settled and kept on next start');
}

console.log('\nDreamBank unit tests passed.');
