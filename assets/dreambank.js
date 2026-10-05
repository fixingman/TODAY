// TODAY — DreamBank (v2.93.0). A dream told to the mic is kept: dated to the day it was
// told, written to the user's own Dropbox as a plain Markdown file, and summarised
// into appMemory.dreams.index (images, role, people — never the retelling).
// Design + locked decisions: memory/Backlog.md § 13 · DreamBank.
//
// Pure helpers load with the file (Today 'dream-core', unit-tested alone). The stateful
// queue is inert until index.html calls Today.use('dream-core').start() before
// _startMeeting(). Dropbox I/O comes from Today 'dropbox-files' (assets/dropbox.js).
//
// Queue entry lifecycle (localStorage 'today-dream-queue'):
//
//   capture ──► kept on phone ──upload ok──► in Dropbox ──ready + reading/extraction
//      │          ▲    │ patch (rev++)          │ patch → re-upload     settled + upload ok──► pruned {id, night}
//      │          └────┘                        │                                              └─ 7 days ─► removed
//      └──── "Don't keep" ──► tombstone (fences late jobs) ──remote delete ok / never uploaded──► removed
//
// The entry exists from the first chunk that carries a dream — before any Claude call —
// so closing, locking, or killing the app cannot lose a dream that was told.
(function() {
  'use strict';

  // ── Pure core ────────────────────────────────────────────────────────────────

  // Same algorithm as util.js _localISO — duplicated so the unit test can load this file alone.
  function _iso(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function _shift(d, days) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days); }
  function _fromISO(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }

  // A dream is dated by the day it was told (v2.93.8). Which night it happened is not
  // asked and not guessed: the field keeps its name `night` so existing files, synced
  // index rows, and file names stay valid.
  function dayLabel(day, now) {
    if (!day) return 'undated';
    const today = new Date(now == null ? Date.now() : now);
    const days = Math.round((_shift(today, 0) - _fromISO(day)) / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    const d = _fromISO(day);
    if (days > 1 && days < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Grounding (eng review D16): an extracted image survives only if every substantive
  // word in it appears in the retelling. Words compare on a locale-lowercased 4-letter
  // stem with Turkish final-consonant softening folded (kitap/kitabı, ağaç/ağacı), so an
  // inflected form still grounds while an invented modifier does not.
  const STOPWORDS = new Set([
    'about', 'also', 'around', 'away', 'back', 'been', 'each', 'even', 'from', 'full', 'have',
    'into', 'just', 'like', 'more', 'most', 'much', 'only', 'onto', 'over', 'some', 'still',
    'that', 'their', 'them', 'then', 'there', 'they', 'this', 'through', 'upon', 'very', 'were',
    'what', 'when', 'where', 'which', 'while', 'with',
    'gibi', 'olan', 'için', 'daha', 'sonra', 'kadar', 'bana', 'beni', 'benim', 'onun', 'bütün',
  ]);
  const SOFTEN = { b: 'p', c: 'ç', d: 't', ğ: 'k' };

  function _words(text, lang) {
    let lower;
    try { lower = String(text || '').toLocaleLowerCase(lang || undefined); }
    catch (_) { lower = String(text || '').toLowerCase(); }
    return lower.match(/[\p{L}\p{M}]+/gu) || [];
  }
  function _stem(word) { return [...word].slice(0, 4).map(ch => SOFTEN[ch] || ch).join(''); }

  function groundImages(images, retelling, lang) {
    const told = _words(retelling, lang);
    const stems = new Set(told.filter(w => [...w].length >= 4).map(_stem));
    const joined = told.join(' ');
    return (Array.isArray(images) ? images : [])
      .map(img => String(img || '').trim())
      .filter(Boolean)
      .filter(img => {
        const words = _words(img, lang);
        const substantive = words.filter(w => [...w].length >= 4 && !STOPWORDS.has(w));
        if (!substantive.length) return words.length > 0 && joined.includes(words.join(' '));
        return substantive.every(w => stems.has(_stem(w)));
      })
      .slice(0, 5);
  }

  function fileName(entry) {
    return `${entry.night || 'undated'}_${entry.id}.md`;
  }

  // The file is the spin-off contract: plain Markdown with JSON-compatible YAML
  // frontmatter, documented in README § DreamBank files.
  function toMarkdown(entry) {
    const q = v => JSON.stringify(v == null ? '' : v);
    const list = a => '[' + (Array.isArray(a) ? a : []).map(q).join(', ') + ']';
    return [
      '---',
      `id: ${q(entry.id)}`,
      `night: ${entry.night ? q(entry.night) : 'null'}`,
      `recorded_at: ${q(entry.recordedAt)}`,
      `lang: ${q(entry.lang || '')}`,
      `images: ${list(entry.images)}`,
      `people: ${list(entry.people)}`,
      `role: ${q(entry.role || '')}`,
      '---',
      '',
      '## Retelling',
      '',
      String(entry.retelling || '').trim(),
      '',
      '## Reading',
      '',
      String(entry.reading || '').trim(),
      '',
      // Dreams kept before v2.93.8 could carry a written thought; it stays in their file.
      ...(String(entry.thought || '').trim() ? ['## My thought', '', String(entry.thought).trim(), ''] : []),
    ].join('\n');
  }

  // Read the file we wrote, not arbitrary Markdown from a Dropbox path. In
  // particular, the frontmatter id must match the selected synced index row.
  // Legacy files may have a final, read-only `My thought` section.
  function fromMarkdown(markdown, expectedId) {
    const source = String(markdown || '').replace(/\r\n?/g, '\n');
    const front = source.match(/^---\n([\s\S]*?)\n---\n/);
    if (!front) return null;
    const idLine = front[1].match(/^id:\s*(.+)$/m);
    let id;
    try { id = JSON.parse(idLine && idLine[1]); } catch (_) { return null; }
    if (id !== expectedId) return null;
    const body = source.slice(front[0].length).replace(/^\n+/, '');
    const toldAt = body.indexOf('## Retelling\n');
    const readAt = body.indexOf('\n## Reading\n', toldAt);
    if (toldAt !== 0 || readAt < 0) return null;
    const retelling = body.slice('## Retelling\n'.length, readAt).trim();
    if (!retelling) return null;
    const afterReading = body.slice(readAt + '\n## Reading\n'.length);
    const thoughtAt = afterReading.indexOf('\n## My thought\n');
    return {
      retelling,
      reading: (thoughtAt < 0 ? afterReading : afterReading.slice(0, thoughtAt)).trim(),
      thought: thoughtAt < 0 ? '' : afterReading.slice(thoughtAt + '\n## My thought\n'.length).trim(),
    };
  }

  // Measured with scripts/dream-reading-eval.mjs: preferred 12/12 over the first prompt
  // in a head-to-head judge, at half the length (128 → 65 words). v2.93.0 drops the
  // "just woken up" framing: a dream can be told hours or days later.
  const DREAM_SYSTEM =
    'Someone has told you a dream they had. Give them a short reading of it. Start from the ' +
    'detail that stands out most, where a feeling does not fit what happened or where someone or ' +
    'something is not what it should be, and follow one or two threads instead of touching every ' +
    'image. Connect them to waking life only as far as the dream itself points; do not guess at their ' +
    'work, relationships, or circumstances. Keep readings tentative through your wording, not through ' +
    'reassurances or disclaimers. End with exactly one question, as your last sentence and with no ' +
    'label or lead-in, in the dream\'s own terms, that they could carry into today. Speak to them directly, plainly and warmly, like a calm friend. Answer in the ' +
    'language the dream was told in. At most 80 words, no headings or lists, no exclamation marks.';

  const EXTRACT_SYSTEM =
    'You will read the retelling of a dream and list what it is made of, for a private record the ' +
    'dreamer keeps. Use only what the retelling says, in its own words and language; never add a ' +
    'detail, merge in something new, or interpret. Reply only with JSON: ' +
    '{"images":[],"people":[],"role":""}. images: three to five concrete things, places, or ' +
    'situations from the dream, each a short phrase. people: the people who appear, as the retelling ' +
    'names or describes them. role: at most eight words on what the dreamer does or fails to do.';

  // ── Stateful queue ───────────────────────────────────────────────────────────

  let started = false;
  function start() {
    if (started) return;
    started = true;

    const QUEUE_KEY = 'today-dream-queue';
    const CONTENT = ['retelling', 'reading', 'night', 'lang', 'images', 'people', 'role'];
    const PRUNED_TTL_MS = 7 * 86400000;
    // Backoff per entry (eng review D7): the sync tick can call flush() every few seconds;
    // a Dropbox or AI outage must not turn into a retry every tick.
    const UPLOAD_BACKOFF = [30e3, 120e3, 600e3, 3600e3];
    const JOB_BACKOFF = [60e3, 3600e3];
    const JOB_MAX_TRIES = 3;

    const _listeners = new Set();
    const _running = new Set(); // `${id}:${job}` in flight this session
    let _flushing = false;
    let _kickTimer = null;
    let _openId = null;          // Memory panel: which dream row is expanded
    let _confirmDeleteId = null; // Memory panel: which row is asking "delete?"
    let _listOpen = false;       // Memory panel: per-dream list shown under the one-line summary
    let _remoteRead = null;      // One transient Dropbox body; never saved or synced
    let _readEpoch = 0;          // Ignore a download after collapse, deletion, or switching rows

    function _load() {
      const q = safeJSON(QUEUE_KEY, []);
      return Array.isArray(q) ? q.filter(e => e && e.id) : [];
    }
    let _queue = _load();
    function _save() { localStorage.setItem(QUEUE_KEY, JSON.stringify(_queue)); }
    function _find(id) { return _queue.find(e => e.id === id) || null; }
    function _emit(id) { _listeners.forEach(fn => { try { fn(id); } catch (_) {} }); }

    // Content changes bump rev so the next flush re-uploads the whole file; bookkeeping
    // (tries, remote path) never does.
    function _update(id, fields) {
      const e = _find(id);
      if (!e || e.deleted) return null;
      const content = CONTENT.some(k => k in fields && JSON.stringify(fields[k]) !== JSON.stringify(e[k]));
      Object.assign(e, fields);
      if (content) { e.rev = (e.rev || 0) + 1; e.updatedAt = new Date().toISOString(); }
      _save();
      _emit(id);
      if (content) _kick();
      return e;
    }

    function _kick(delay = 1200) {
      clearTimeout(_kickTimer);
      _kickTimer = setTimeout(flush, delay);
    }

    function _newId() {
      return 'dream_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    // First dream chunk creates the entry; later chunks replace the assembled retelling.
    function capture({ id, retelling, lang } = {}) {
      const text = String(retelling || '').trim();
      if (!text) return id || null;
      const existing = id ? _find(id) : null;
      if (existing) {
        if (existing.deleted) return existing.id;
        const fields = { retelling: text };
        if (lang && !existing.lang) fields.lang = lang;
        _update(existing.id, fields);
        return existing.id;
      }
      const now = new Date();
      const recordedAt = now.toISOString();
      const e = {
        id: _newId(), retelling: text, night: _iso(now), lang: lang || '', reading: '',
        readingState: 'pending', readingTries: 0, readingNextAt: 0, images: [], people: [], role: '',
        extraction: 'pending', extractionTries: 0, extractionNextAt: 0, recordedAt,
        updatedAt: recordedAt, rev: 1, uploadedRev: 0, remotePath: '', uploadTries: 0,
        uploadNextAt: 0, settled: false, ready: false, deleted: false, pruned: false, prunedAt: '',
      };
      _queue.push(e);
      _save();
      _emit(e.id);
      _kick(0);
      return e.id;
    }

    // Capture is complete: every chunk has answered, so the retelling is final and the
    // reading and extraction can start — together, not one after the other.
    function settle(id) {
      const e = _find(id);
      if (!e || e.deleted || e.settled) return;
      e.settled = true;
      _save();
      _runJobs(e, true);
    }

    // The sheet closed with the dream kept (Done, Add tasks, or Discard while digesting).
    function keep(id) {
      const e = _find(id);
      if (!e || e.deleted) return;
      e.ready = true;
      _save();
      _kick(0);
    }

    // "Don't keep this one": a tombstone, not a splice. It fences any reading, extraction,
    // or upload still in flight, and keeps retrying the remote delete when an earlier
    // upload's fate is unknown (a lost response can leave a file behind).
    function discard(id) {
      const e = _find(id);
      if (!e) return;
      e.deleted = true;
      e.retelling = ''; e.reading = ''; e.thought = '';
      e.uploadTries = 0; e.uploadNextAt = 0;
      if (_remoteRead && _remoteRead.id === id) { _remoteRead = null; _readEpoch++; }
      _save();
      _indexRemove(e);
      _emit(id);
      _kick(0);
    }

    // Memory panel delete for a dream whose body was already pruned: rebuild a tombstone
    // from the index so the remote file is removed too.
    function discardIndexed(id) {
      if (_find(id)) return discard(id);
      const row = _indexRows().find(r => r.id === id);
      if (!row) return;
      if (_remoteRead && _remoteRead.id === id) { _remoteRead = null; _readEpoch++; }
      const dir = _files() ? _files().dreamsDir : '';
      _queue.push({ id, deleted: true, night: row.night || null, remotePath: dir ? `${dir}/${fileName(row)}` : '',
        uploadTries: 0, uploadNextAt: 0, recordedAt: row.recordedAt || '' });
      _save();
      _indexRemove(row);
      _kick(0);
    }

    function get(id) { const e = _find(id); return e && !e.deleted ? e : null; }
    function onChange(fn) { _listeners.add(fn); return () => _listeners.delete(fn); }

    function statusText(id) {
      const e = _find(id);
      if (!e || e.deleted) return '';
      if (e.uploadedRev && e.uploadedRev === e.rev) return 'Kept in your Dropbox';
      if (!localStorage.getItem('dropbox_token')) return 'Kept on this phone';
      if (!navigator.onLine || e.uploadTries > 0) return 'Kept on this phone until you’re online';
      return 'Saving to your Dropbox';
    }

    // ── AI jobs ────────────────────────────────────────────────────────────────

    // One door to ai-assist for both calls. Its reply shape differs by content: valid
    // JSON comes back top-level, anything else wrapped as { content } — so JSON mode
    // accepts either, and a reply without the expected fields counts as a failure.
    async function _ask(systemPrompt, content, { json = false } = {}) {
      const connections = Today.use('connections');
      const res = await fetch('/.netlify/functions/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: connections._aiGetProvider(),
          apiKey: connections._aiGetKey(),
          systemPrompt,
          messages: [{ role: 'user', content }],
        }),
      });
      if (!res.ok) throw new Error('ai-assist ' + res.status);
      const data = await res.json();
      if (data.error) throw new Error(String(data.error));
      if (!json) {
        const text = String(data.content || data.message || '').trim();
        if (!text) throw new Error('empty reading');
        return text;
      }
      let obj = Array.isArray(data.images) ? data : null;
      if (!obj && typeof data.content === 'string') {
        const m = data.content.match(/\{[\s\S]*\}/);
        try { obj = m ? JSON.parse(m[0]) : null; } catch (_) { obj = null; }
      }
      if (!obj || !Array.isArray(obj.images) || typeof obj.role !== 'string') throw new Error('bad extraction');
      return obj;
    }

    function _runJobs(e, force) {
      if (!e.settled || e.deleted) return;
      _runJob(e, 'reading', force);
      _runJob(e, 'extraction', force);
    }

    async function _runJob(e, job, force) {
      const stateKey = job === 'reading' ? 'readingState' : 'extraction';
      const triesKey = job + 'Tries';
      const nextKey = job + 'NextAt';
      const key = e.id + ':' + job;
      if (e[stateKey] !== 'pending' || _running.has(key)) return;
      if (!force && Date.now() < (e[nextKey] || 0)) return;
      if (!Today.use('connections')._aiIsConfigured()) {
        _update(e.id, { [stateKey]: 'failed' });
        _maybePrune(_find(e.id));
        return;
      }
      _running.add(key);
      try {
        if (job === 'reading') {
          const reading = await _ask(DREAM_SYSTEM, e.retelling);
          if (!get(e.id)) return; // discarded while waiting
          _update(e.id, { reading, readingState: 'done' });
        } else {
          const out = await _ask(EXTRACT_SYSTEM, e.retelling, { json: true });
          const cur = get(e.id);
          if (!cur) return;
          const clip = (s, n) => String(s || '').trim().slice(0, n);
          _update(e.id, {
            images: groundImages(out.images, cur.retelling, cur.lang),
            people: (Array.isArray(out.people) ? out.people : []).map(p => clip(p, 60)).filter(Boolean).slice(0, 6),
            role: clip(out.role, 80),
            extraction: 'done',
          });
          _indexPut(_find(e.id));
        }
      } catch (_) {
        const cur = get(e.id);
        if (!cur) return;
        const tries = (cur[triesKey] || 0) + 1;
        _update(e.id, tries >= JOB_MAX_TRIES
          ? { [triesKey]: tries, [stateKey]: 'failed' }
          : { [triesKey]: tries, [nextKey]: Date.now() + JOB_BACKOFF[Math.min(tries - 1, JOB_BACKOFF.length - 1)] });
      } finally {
        _running.delete(key);
        _maybePrune(_find(e.id));
      }
    }

    // ── Synced index (appMemory.dreams.index) ──────────────────────────────────

    function _indexRows() {
      if (typeof appMemory === 'undefined' || !appMemory) return [];
      if (!appMemory.dreams || !Array.isArray(appMemory.dreams.index)) appMemory.dreams = { index: [] };
      return appMemory.dreams.index;
    }
    function _indexSave() {
      if (typeof _saveMemory === 'function') _saveMemory();
      // _saveMemory is local only; the index has to reach the other devices.
      if (typeof _setLastLocalChange === 'function') _setLastLocalChange();
      if (typeof dropboxAutoSave === 'function') dropboxAutoSave();
    }
    function _indexPut(e) {
      if (!e || e.deleted || e.extraction !== 'done') return;
      const rows = _indexRows();
      const row = {
        id: e.id, night: e.night, recordedAt: e.recordedAt,
        updatedAt: new Date().toISOString(), lang: e.lang || '', images: e.images || [],
        people: e.people || [], role: e.role || '',
      };
      const i = rows.findIndex(r => r.id === e.id);
      if (i >= 0) rows[i] = row; else rows.push(row);
      _indexSave();
    }
    // A tombstone row, so the union merge on the other device cannot resurrect it.
    function _indexRemove(e) {
      const rows = _indexRows();
      const i = rows.findIndex(r => r.id === e.id);
      const tomb = { id: e.id, deleted: true, recordedAt: e.recordedAt || '', updatedAt: new Date().toISOString() };
      if (i >= 0) rows[i] = tomb; else rows.push(tomb);
      _indexSave();
    }

    // ── Upload, rename, delete ─────────────────────────────────────────────────

    // Dropbox file I/O (assets/dropbox.js). Absent only in harnesses that boot without it.
    function _files() {
      try { return Today.use('dropbox-files'); } catch (_) { return null; }
    }
    function _canReachDropbox() {
      return navigator.onLine && !!localStorage.getItem('dropbox_token') && !!_files();
    }

    function _backoff(e) {
      e.uploadTries = (e.uploadTries || 0) + 1;
      e.uploadNextAt = Date.now() + UPLOAD_BACKOFF[Math.min(e.uploadTries - 1, UPLOAD_BACKOFF.length - 1)];
      _save();
      _emit(e.id);
    }

    async function _upload(e) {
      const files = _files();
      const path = `${files.dreamsDir}/${fileName(e)}`;
      // A file whose name changed is moved rather than copied (D14) — kept for dreams re-dated before v2.93.8.
      if (e.remotePath && e.remotePath !== path) {
        const moved = await files.move(e.remotePath, path);
        if (!moved.ok && !moved.notFound) return _backoff(e);
      }
      if (e.deleted) return;
      e.remotePath = path; // recorded before the write, so a delete can find a file whose upload reply was lost
      _save();
      const rev = e.rev;
      const res = await files.upload(path, toMarkdown(e));
      const cur = _find(e.id);
      if (!cur || cur.deleted) return;
      if (!res.ok) return _backoff(cur);
      cur.uploadedRev = Math.max(cur.uploadedRev || 0, rev);
      cur.uploadTries = 0; cur.uploadNextAt = 0;
      _save();
      _emit(cur.id);
    }

    async function _deleteRemote(e) {
      if (e.remotePath) {
        if (!_canReachDropbox()) return;
        const res = await _files().remove(e.remotePath);
        if (!res.ok && !res.notFound) return _backoff(e);
      }
      _queue = _queue.filter(x => x.id !== e.id);
      _save();
    }

    // Prune only when nothing can still change the file: the sheet has closed, both AI
    // jobs have settled, and the latest revision is acknowledged by Dropbox.
    function _maybePrune(e) {
      if (!e || e.deleted || e.pruned || !e.ready) return;
      if (e.readingState === 'pending' || e.extraction === 'pending') return;
      if (!e.uploadedRev || e.uploadedRev !== e.rev) return;
      e.retelling = ''; e.reading = ''; e.thought = '';
      e.pruned = true; e.prunedAt = new Date().toISOString();
      _save();
      _emit(e.id);
    }

    // Called on every sync tick (dropbox.js syncAll), on Done, and after edits. With an
    // empty queue it is one localStorage read. Single-flight: a slow upload cannot
    // overlap the next tick.
    async function flush() {
      if (_flushing || !_queue.length) return;
      _flushing = true;
      try {
        const now = Date.now();
        for (const e of [..._queue]) {
          if (e.deleted) {
            if (now >= (e.uploadNextAt || 0)) await _deleteRemote(e);
            continue;
          }
          if (e.pruned) {
            if (now - Date.parse(e.prunedAt || 0) > PRUNED_TTL_MS) _queue = _queue.filter(x => x.id !== e.id);
            continue;
          }
          _runJobs(e, false);
          if (e.rev > (e.uploadedRev || 0) && now >= (e.uploadNextAt || 0) && _canReachDropbox()) {
            try { await _upload(e); } catch (_) { _backoff(e); }
          }
          _maybePrune(_find(e.id));
        }
        _save();
      } finally {
        _flushing = false;
      }
    }

    // A previous session ended: any dream it left behind was told, so it is kept and
    // its capture is complete (the sheet that could have discarded it is gone).
    for (const e of _queue) {
      if (!e.deleted && !e.pruned) { e.settled = true; e.ready = true; }
    }
    _save();

    // ── Memory panel block ─────────────────────────────────────────────────────

    function _rows() {
      const live = _queue.filter(e => !e.deleted);
      const ids = new Set(live.map(e => e.id));
      const indexed = _indexRows().filter(r => !r.deleted && !ids.has(r.id));
      return [...live.map(e => ({ e })), ...indexed.map(r => ({ r }))]
        .sort((a, b) => String((b.e || b.r).recordedAt).localeCompare(String((a.e || a.r).recordedAt)));
    }

    function _memoryBody(content) {
      return (content.reading
        ? `<p class="dream-reading">${esc(content.reading)}</p>`
        : '<div class="memory-pending">no reading was kept</div>') +
        `<p class="dream-told">${esc(content.retelling)}</p>` +
        (content.thought ? `<p class="dream-told">earlier note · ${esc(content.thought)}</p>` : '');
    }

    async function _readFromDropbox(id, epoch) {
      const e = _find(id);
      const row = _indexRows().find(r => r.id === id && !r.deleted);
      const files = _files();
      const record = e && !e.deleted ? e : row;
      const safeId = /^dream_[a-z0-9]+$/.test(id);
      const safeDay = record && (record.night == null || /^\d{4}-\d{2}-\d{2}$/.test(record.night));
      let result = { ok: false, notFound: false };
      if (safeId && safeDay && files && files.download && navigator.onLine && localStorage.getItem('dropbox_token')) {
        const path = (e && e.remotePath) || `${files.dreamsDir}/${fileName(record)}`;
        result = await files.download(path);
      }
      if (epoch !== _readEpoch || _openId !== id || !_rows().some(x => (x.e || x.r).id === id)) return;
      const content = result.ok ? fromMarkdown(result.text, id) : null;
      _remoteRead = { id, content, error: content ? ''
        : !navigator.onLine ? 'you’re offline — try again when connected'
        : !localStorage.getItem('dropbox_token') || localStorage.getItem('dropbox_token_expired') ? 'reconnect Dropbox to read this dream'
        : result.notFound ? 'this dream file is missing from Dropbox'
        : result.ok ? 'this dream file could not be read here'
        : 'can’t read it right now — try again' };
      _rerenderMemory();
    }

    // A row is the panel's own item: text (day — opening words) with a per-item action,
    // like KNOWN's "dismiss". Opened, it shows the reading and the retelling, then one
    // item row: where it is kept, and "delete".
    function _memoryRow({ e, r }) {
      const id = (e || r).id;
      const day = dayLabel((e || r).night);
      const where = e && !e.pruned && !(e.uploadedRev && e.uploadedRev === e.rev) ? 'kept on this phone' : 'kept in your Dropbox';
      const first = e && e.retelling ? e.retelling.split(/\s+/).slice(0, 9).join(' ') + '…'
        : ((e || r).images || []).slice(0, 3).join(' · ') || 'kept';
      const open = _openId === id;
      let html = `<div class="memory-item"><span class="memory-item-text">${esc(day)} — ${esc(first)}</span>` +
        `<button type="button" class="memory-item-btn" data-today-click="dream.memory-open" data-dream-id="${esc(id)}" aria-expanded="${open}">${open ? 'less' : 'read'}</button></div>`;
      if (!open) return html;
      const content = e && e.retelling ? e : _remoteRead && _remoteRead.id === id ? _remoteRead.content : null;
      html += content ? _memoryBody(content)
        : `<div class="memory-pending" role="status">${_remoteRead && _remoteRead.id === id && _remoteRead.error
          ? esc(_remoteRead.error) + ' <button type="button" class="memory-item-btn" data-today-click="dream.memory-retry" data-dream-id="' + esc(id) + '">retry</button>'
          : 'opening from Dropbox…'}</div>`;
      if (_confirmDeleteId === id) {
        return html + `<div class="memory-item"><span class="memory-confirm-msg">delete this dream and its file?</span>` +
          `<button type="button" class="memory-clear-btn memory-clear-confirm" data-today-click="dream.memory-delete-confirm" data-dream-id="${esc(id)}">yes, delete</button>` +
          `<span class="memory-confirm-actions"><button type="button" class="btn-ghost memory-conn-link" data-today-click="dream.memory-delete-cancel">cancel</button></span></div>`;
      }
      return html + `<div class="memory-item"><span class="memory-item-text">${esc(where)}</span>` +
        `<button type="button" class="memory-item-btn" data-today-click="dream.memory-delete" data-dream-id="${esc(id)}">delete</button></div>`;
    }

    // One line until stage 2 gives the collection something to say. "manage" keeps every
    // dream inspectable and deletable here — deleting a file in Dropbox does not remove
    // its synced summary, so the per-dream delete must stay reachable.
    function renderMemory(container) {
      if (!container) return;
      const old = document.getElementById('dreamMemoryBlock');
      const rows = _rows();
      const dir = _files() ? _files().dreamsDir : '/Dreams';
      const n = rows.length;
      const summary = n
        ? `${n} dream${n === 1 ? '' : 's'} kept in your Dropbox, ${dir}`
        : 'a dream you tell the mic lands here';
      const html = `<div class="memory-type-block dream-memory-block" id="dreamMemoryBlock">` +
        `<div class="memory-type-header"><span class="memory-type-name">DREAMS</span></div>` +
        `<div class="memory-item"><span class="memory-item-text">${esc(summary)}</span>` +
        (n ? `<button type="button" class="memory-item-btn" data-today-click="dream.memory-manage" aria-expanded="${_listOpen}">${_listOpen ? 'close' : 'manage'}</button>` : '') +
        `</div>` +
        (n && _listOpen ? rows.map(_memoryRow).join('') : '') +
        `</div>`;
      if (old) old.outerHTML = html;
      else container.insertAdjacentHTML('beforeend', html);
    }
    function _rerenderMemory() {
      const el = document.getElementById('dreamMemoryBlock');
      if (el) renderMemory(el.parentElement);
    }

    if (window.Today) {
      Today.define('dreambank', {
        capture, settle, keep, discard, get, onChange, flush,
        statusText, renderMemory,
        _list: () => _queue.slice(),
      });
      Today.ui.register('click', 'dream.memory-manage', () => {
        _readEpoch++; _remoteRead = null;
        _listOpen = !_listOpen;
        _openId = null; _confirmDeleteId = null;
        _rerenderMemory();
      });
      Today.ui.register('click', 'dream.memory-open', (_e, el) => {
        const id = el.dataset.dreamId;
        _readEpoch++; _remoteRead = null;
        _openId = _openId === id ? null : id;
        _confirmDeleteId = null;
        _rerenderMemory();
        if (_openId === id && !_find(id)?.retelling) _readFromDropbox(id, _readEpoch);
      });
      Today.ui.register('click', 'dream.memory-retry', (_e, el) => {
        const id = el.dataset.dreamId;
        if (_openId !== id) return;
        _readEpoch++; _remoteRead = null;
        _rerenderMemory();
        _readFromDropbox(id, _readEpoch);
      });
      Today.ui.register('click', 'dream.memory-delete', (_e, el) => { _confirmDeleteId = el.dataset.dreamId; _rerenderMemory(); });
      Today.ui.register('click', 'dream.memory-delete-cancel', () => { _confirmDeleteId = null; _rerenderMemory(); });
      Today.ui.register('click', 'dream.memory-delete-confirm', (_e, el) => {
        discardIndexed(el.dataset.dreamId);
        _confirmDeleteId = null; _openId = null;
        _rerenderMemory();
      });
      const memoryPanel = typeof document === 'undefined' ? null : document.getElementById('memoryPanel');
      if (memoryPanel && typeof MutationObserver !== 'undefined') {
        new MutationObserver(() => {
          if (memoryPanel.classList.contains('open')) return;
          _readEpoch++; _remoteRead = null; _openId = null; _confirmDeleteId = null; _listOpen = false;
          _rerenderMemory();
        }).observe(memoryPanel, { attributes: true, attributeFilter: ['class'] });
      }
    }

    _kick(0);
  }

  const core = { dayLabel, groundImages, fileName, toMarkdown, fromMarkdown, DREAM_SYSTEM, EXTRACT_SYSTEM, start };
  if (window.Today) window.Today.define('dream-core', core);
})();
