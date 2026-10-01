// TODAY — Meeting mode + Voice Note regression test
//
// Runs the media controllers against the real app DOM with browser media, wake-lock,
// PiP, and Netlify calls replaced by deterministic in-page fakes.
//
// Run from repo root:
//   node scripts/meeting-test.mjs --pre-extraction
//   node scripts/meeting-test.mjs

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PRE_EXTRACTION = process.argv.includes('--pre-extraction');
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
const fail = async (message, detail) => {
  console.error('✗ FAIL — ' + message);
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

async function openPage(options = {}) {
  const page = await browser.newPage();
  await page.setViewport(options.viewport || { width: 1200, height: 900,
    isMobile: !!options.touch, hasTouch: !!options.touch });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(opts => {
    localStorage.clear();
    localStorage.setItem('splash_shown_at', String(Date.now()));
    if (opts.seedQueue) localStorage.setItem('today-dream-queue', JSON.stringify(opts.seedQueue));
    if (opts.claude) { localStorage.setItem('today_ai_provider', 'claude'); localStorage.setItem('today_ai_key_claude', 'claude-key'); }
    if (opts.gemini !== false) localStorage.setItem('today_ai_key_gemini', 'test-gemini-key');
    if (opts.names !== false) {
      localStorage.setItem('today_user_names', JSON.stringify(opts.names || ['Can']));
      localStorage.setItem('today_user_name', (opts.names || ['Can'])[0]);
    }
    if (opts.touch) Object.defineProperty(window, 'ontouchstart', { configurable: true, value: null });

    const state = window.__meetingTest = {
      supported: opts.supported || ['audio/webm;codecs=opus', 'audio/mp4'],
      getUserMediaCalls: 0, deferGetUserMedia: false, rejectGetUserMedia: false,
      streams: [], recorders: [], wakeRequests: 0, wakeReleases: 0,
      meetingResponses: [], voiceResponses: [], meetingRequests: [], voiceRequests: [],
      aiResponses: [], aiRequests: [],
      errors: [], pipRequests: 0, pipWindows: [], nextBlobSize: 16,
    };

    class FakeTrack {
      constructor() { this.readyState = 'live'; this.muted = false; this.stops = 0; }
      stop() { this.readyState = 'ended'; this.stops++; }
    }
    class FakeStream {
      constructor() { this.track = new FakeTrack(); }
      getTracks() { return [this.track]; }
      getAudioTracks() { return [this.track]; }
    }
    state.makeStream = () => { const stream = new FakeStream(); state.streams.push(stream); return stream; };
    state.resolveGetUserMedia = () => {
      const stream = state.makeStream();
      if (state._gumResolve) state._gumResolve(stream);
      state._gumResolve = null;
      return stream;
    };

    class FakeMediaRecorder {
      static isTypeSupported(type) { return state.supported.includes(type); }
      constructor(stream, recorderOptions = {}) {
        this.stream = stream; this.options = recorderOptions; this.mimeType = recorderOptions.mimeType || '';
        this.state = 'inactive'; this.listeners = {}; this.ondataavailable = null;
        this.onstop = null; this.onerror = null; this.starts = 0; this.stops = 0;
        state.recorders.push(this);
      }
      addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
      _emit(type, event = {}) {
        const handler = this['on' + type];
        if (typeof handler === 'function') handler(event);
        (this.listeners[type] || []).forEach(fn => fn(event));
      }
      start() { this.state = 'recording'; this.starts++; }
      pause() { this.state = 'paused'; }
      stop() {
        if (this.state === 'inactive') return;
        this.state = 'inactive'; this.stops++;
        const size = state.nextBlobSize;
        if (size > 0) this._emit('dataavailable', { data: new Blob([new Uint8Array(size)], { type: this.mimeType }) });
        queueMicrotask(() => this._emit('stop'));
      }
      fail() { this._emit('error', { error: new Error('recorder failed') }); }
    }
    window.MediaRecorder = FakeMediaRecorder;
    // _micGlow consumes the real Web Audio surface. Keep the lifecycle test
    // deterministic while still exercising its setup/stop contract.
    class FakeAudioContext {
      createMediaStreamSource() { return { connect() {} }; }
      createAnalyser() {
        return {
          fftSize: 0,
          smoothingTimeConstant: 0,
          frequencyBinCount: 128,
          getByteTimeDomainData(buffer) { buffer.fill(128); },
        };
      }
      close() { return Promise.resolve(); }
    }
    window.AudioContext = FakeAudioContext;

    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: () => {
        state.getUserMediaCalls++;
        if (state.rejectGetUserMedia) return Promise.reject(new Error('denied'));
        if (state.deferGetUserMedia) return new Promise(resolve => { state._gumResolve = resolve; });
        return Promise.resolve(state.makeStream());
      },
    } });
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: {
      request: async () => {
        state.wakeRequests++;
        return { release: async () => { state.wakeReleases++; } };
      },
    } });

    let visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => visibility === 'hidden' });
    state.setVisibility = value => { visibility = value; document.dispatchEvent(new Event('visibilitychange')); };

    if (opts.pip) {
      Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: {
        _meetingTestMock: true,
        requestWindow: async () => {
          state.pipRequests++;
          const pipDoc = document.implementation.createHTMLDocument('TODAY');
          const listeners = {};
          const pip = {
            document: pipDoc, closed: false, focusCalls: 0,
            focus() { this.focusCalls++; },
            close() { this.closed = true; (listeners.pagehide || []).forEach(fn => fn()); },
            addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
          };
          state.pipWindows.push(pip);
          return pip;
        },
      } });
    }

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (url, fetchOptions = {}) => {
      if (String(url).includes('/.netlify/functions/meeting-extract')) {
        const body = JSON.parse(fetchOptions.body || '{}');
        state.meetingRequests.push(body);
        const response = state.meetingResponses.shift() || { actionItems: [], updatedContext: body.rollingContext || '' };
        if (response.gate) await response.gate;
        if (response.throw) throw new Error(response.throw);
        const raw = response.raw !== undefined ? response.raw : JSON.stringify(response.body || response);
        return { ok: response.ok !== false, status: response.status || 200, text: async () => raw };
      }
      if (String(url).includes('/.netlify/functions/ai-assist')) {
        const body = JSON.parse(fetchOptions.body || '{}');
        state.aiRequests.push(body);
        const response = state.aiResponses.shift() || { content: '' };
        if (response.gate) await response.gate;
        return { ok: response.ok !== false, status: response.status || 200, json: async () => response.body || response };
      }
      if (String(url).includes('/.netlify/functions/transcribe')) {
        const body = JSON.parse(fetchOptions.body || '{}');
        state.voiceRequests.push(body);
        const response = state.voiceResponses.shift() || { text: '' };
        if (response.throw) throw new Error(response.throw);
        return { ok: true, status: 200, json: async () => response.body || response };
      }
      return originalFetch(url, fetchOptions);
    };
  }, options);

  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof Today?.use('meeting').toggleMeeting === 'function'
    && document.getElementById('meetingBtn'), { timeout: 15000 });
  await page.evaluate(() => {
    window.__meetingTest.autosaves = 0;
    window.__meetingTest.attribution = null;
    window.__meetingTest.haptics = [];
    dropboxAutoSave = () => { window.__meetingTest.autosaves++; };
    _memoryOnMeetingAttribution = stats => { window.__meetingTest.attribution = stats; };
    _logSyncError = (where, message) => { window.__meetingTest.errors.push({ where, message }); };
    window._haptic = preset => { window.__meetingTest.haptics.push(preset); };
  });
  return { page, errors };
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

try {
  // Capability and provider gates, including the mobile Voice Note fallback.
  for (const testCase of [
    { label: 'Gemini absent', options: { gemini: false }, meeting: false, voice: false },
    { label: 'unsupported media', options: { supported: [], touch: false }, meeting: false, voice: false },
    { label: 'WebM meeting', options: { supported: ['audio/webm;codecs=opus'] }, meeting: true, voice: false },
    { label: 'iOS MP4 meeting', options: { supported: ['audio/mp4'], touch: true }, meeting: true, voice: false },
    { label: 'mobile voice fallback', options: { supported: [], touch: true }, meeting: false, voice: true },
  ]) {
    const { page, errors } = await openPage(testCase.options);
    const result = await page.evaluate(() => ({
      meeting: getComputedStyle(document.getElementById('meetingBtn')).display !== 'none',
      voice: getComputedStyle(document.getElementById('voiceNoteBtn')).display !== 'none',
    }));
    await expectAll(`${testCase.label} capability gate`, {
      meeting: result.meeting === testCase.meeting,
      voice: result.voice === testCase.voice,
      noErrors: errors.length === 0,
    });
    await page.close();
  }
  ok('provider, WebM, MP4, unsupported-media, and Voice Note gates');

  // Name migration, exact normalization/deduplication, removal, prompt Escape/Enter.
  {
    const { page, errors } = await openPage({ names: false });
    const result = await page.evaluate(async () => {
      localStorage.setItem('today_user_name', 'Legacy');
      Today.use('meeting').renderMeetingNames();
      const migratedRead = Today.use('meeting')._getUserNames();
      const input = document.getElementById('meetingNameInput');
      input.value = '  Can,  ';
      Today.use('meeting').addMeetingName();
      document.getElementById('meetingNameInput').value = 'Can';
      Today.use('meeting').addMeetingName();
      const afterAdd = Today.use('meeting')._getUserNames();
      Today.use('meeting').removeMeetingName(0);
      const afterRemove = Today.use('meeting')._getUserNames();

      localStorage.removeItem('today_user_names');
      localStorage.removeItem('today_user_name');
      window.__meetingTest.rejectGetUserMedia = true;
      Today.use('meeting').toggleMeeting();
      const promptShown = document.getElementById('meetingNamePrompt').classList.contains('show');
      Today.use('meeting')._meetingNamePromptKey({ key: 'Escape', preventDefault() {} });
      await new Promise(resolve => setTimeout(resolve, 320));
      const escapeClosed = !document.getElementById('meetingNamePrompt').classList.contains('show');
      Today.use('meeting').toggleMeeting();
      document.getElementById('meetingNamePromptInput').value = 'Robin';
      Today.use('meeting')._meetingNamePromptKey({ key: 'Enter', preventDefault() {} });
      await new Promise(resolve => setTimeout(resolve, 0));
      return {
        migratedRead: migratedRead.join('|') === 'Legacy',
        addAndDedupe: afterAdd.join('|') === 'Legacy|Can',
        remove: afterRemove.join('|') === 'Can',
        primarySynced: localStorage.getItem('today_user_name') === 'Robin',
        namesSynced: JSON.parse(localStorage.getItem('today_user_names')).join('|') === 'Robin',
        timestamped: !Number.isNaN(Date.parse(localStorage.getItem('user_names_at'))),
        promptShown, escapeClosed,
        enterStartedOnce: window.__meetingTest.getUserMediaCalls === 1,
        autosaved: window.__meetingTest.autosaves === 3,
      };
    });
    await expectAll('meeting names and first-use prompt', { ...result, noErrors: errors.length === 0 });
    ok('meeting names migrate, normalize, deduplicate, remove, and gate first use');
    await page.close();
  }

  // Start/stop, double-start guard, recorder policy, review, attribution, acceptance, teardown.
  {
    const { page, errors } = await openPage({ supported: ['audio/webm;codecs=opus'], pip: true });
    const result = await page.evaluate(async () => {
      window.__meetingTest.deferGetUserMedia = true;
      Today.use('meeting').toggleMeeting(); Today.use('meeting').toggleMeeting();
      const guarded = window.__meetingTest.getUserMediaCalls === 1;
      window.__meetingTest.resolveGetUserMedia();
      await new Promise(resolve => setTimeout(resolve, 20));
      const rec = window.__meetingTest.recorders[0];
      const started = rec?.state === 'recording'
        && document.getElementById('meetingPill').classList.contains('show')
        && document.getElementById('meetingBtn').classList.contains('live');
      const policy = rec?.options.audioBitsPerSecond === 32000
        && rec?.options.mimeType === 'audio/webm;codecs=opus';

      window.__meetingTest.meetingResponses.push({ updatedContext: 'kept context', actionItems: [
        { text: 'Send the notes', owner: 'Can', mine: true },
        { text: 'Book the room', owner: 'Robin', mine: false },
      ] });
      Today.use('meeting').toggleMeeting();
      // FileReader + mocked fetch + final render cross several async queues.
      // Wait for the observable review state instead of assuming 40ms is enough.
      for (let i = 0; i < 30 && document.querySelectorAll('#meetingItems .meeting-item').length < 2; i++) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      const rows = [...document.querySelectorAll('#meetingItems .meeting-item')];
      const review = !document.getElementById('meetingOverlay').classList.contains('hidden')
        && rows.length === 2 && rows[0].classList.contains('selected') && !rows[1].classList.contains('selected');
      const ephemeralBeforeAccept = ![...Array(localStorage.length).keys()]
        .map(i => localStorage.getItem(localStorage.key(i)) || '')
        .some(value => value.includes('Send the notes') || value.includes('kept context'));
      if (rows[1]) rows[1].click();
      const count = document.getElementById('meetingAddBtn').textContent.trim() === 'Add 2 tasks';
      Today.use('meeting')._meetingAccept();
      const stored = JSON.parse(localStorage.getItem('today_manual') || '[]');
      return {
        guarded, started, policy,
        webmChunk: window.__meetingTest.meetingRequests[0]?.mimeType === 'audio/webm;codecs=opus',
        namesSent: window.__meetingTest.meetingRequests[0]?.userName === 'Can',
        wakeAcquired: window.__meetingTest.wakeRequests >= 1,
        wakeReleased: window.__meetingTest.wakeReleases >= 1,
        streamStopped: window.__meetingTest.streams[0].track.stops === 1,
        review, count, ephemeralBeforeAccept,
        accepted: stored.some(x => x.text === 'Send the notes') && stored.some(x => x.text === 'Book the room'),
        attribution: JSON.stringify(window.__meetingTest.attribution) === JSON.stringify({
          mineShown: 1, mineKept: 1, othersShown: 1, othersSelected: 1,
        }),
        autosaved: window.__meetingTest.autosaves === 1,
        pipClosed: !window.__meetingTest.pipWindows.length || window.__meetingTest.pipWindows.every(x => x.closed),
      };
    });
    await expectAll('meeting lifecycle and acceptance', { ...result, noErrors: errors.length === 0 });
    ok('meeting lifecycle, review attribution, acceptance, sync, and teardown');
    await page.close();
  }

  // DreamBank (v2.93.0): a recounted dream is kept from its first chunk — one queue
  // entry before any Claude call — then read and extracted in parallel. The reading
  // leads, the retelling sits below; Done keeps it. Invented images never reach memory.
  {
    const { page, errors } = await openPage({ supported: ['audio/webm;codecs=opus'] });
    const result = await page.evaluate(async () => {
      const t = window.__meetingTest;
      const until = async fn => { for (let i = 0; i < 80 && !fn(); i++) await new Promise(r => setTimeout(r, 10)); };
      localStorage.setItem('today_ai_provider', 'claude');
      localStorage.setItem('today_ai_key_claude', 'claude-key');
      Today.use('meeting').toggleMeeting();
      await new Promise(r => setTimeout(r, 20));
      const dream = 'I was in my grandmother\'s kitchen and the floor was water. I felt calm.';
      t.meetingResponses.push({ updatedContext: '', actionItems: [], dream, night_hint: 'last_night', lang: 'en' });
      let release; t.aiResponses.push({ gate: new Promise(r => { release = r; }), content: 'The water floor may point to something that feels unsettled yet safe.' });
      t.aiResponses.push({ body: { images: ['grandmother\'s kitchen', 'floor was water', 'kitchen full of Martian soldiers'], people: ['grandmother'], role: 'stands calmly on water' } });
      Today.use('meeting').toggleMeeting();
      await until(() => t.aiRequests.length === 2);
      const queue = () => JSON.parse(localStorage.getItem('today-dream-queue') || '[]');
      const keptBeforeReading = queue().length === 1 && queue()[0].retelling === dream;
      const loading = document.getElementById('meetingReviewTitle').textContent === 'Last night'
        && !!document.querySelector('#meetingItems .loading-dots');
      release();
      await until(() => !!document.querySelector('#meetingItems .dream-reading'));
      const [readReq, extractReq] = t.aiRequests;
      const dropBtn = document.getElementById('meetingDropBtn');
      const reviewText = document.getElementById('meetingItems').textContent;
      const entry = queue()[0];
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const shown = {
        readingFirst: document.querySelector('#meetingItems .dream-reading').textContent.startsWith('The water floor'),
        toldShown: reviewText.includes('grandmother'),
        noTaskRows: !document.querySelector('#meetingItems .meeting-item'),
        keepPrimary: document.getElementById('meetingAddBtn').style.display !== 'none'
          && document.getElementById('meetingAddBtn').textContent === 'Keep'
          && document.querySelector('.meeting-review-discard').style.display === 'none',
        dontKeepShown: !dropBtn.hidden && dropBtn.textContent === 'Don’t keep',

        header: document.querySelector('#meetingPanel .meeting-eyebrow').textContent === 'Dream'
          && document.getElementById('meetingReviewTitle').textContent === 'Last night'
          && document.getElementById('meetingReviewSub').textContent === 'Kept on this phone'
          && document.getElementById('meetingReviewSub').style.display !== 'none',
        noDropdownUntilAsked: !document.querySelector('#meetingItems select'),
        ctas: [...document.querySelectorAll('#dreamCtas .copy-cta')].map(b => b.textContent).join('|') === 'add a thought|change night',
        noBackfillInSheet: !document.querySelector('#meetingItems .memory-pending'),
      };
      // Only the queue holds the retelling; memory holds grounded images, never the dream text.
      const holders = [...Array(localStorage.length).keys()].map(i => localStorage.key(i))
        .filter(k => (localStorage.getItem(k) || '').includes('grandmother'));
      const memoryText = localStorage.getItem('today_memory') || '';
      document.getElementById('meetingAddBtn').click(); // Keep
      await new Promise(r => setTimeout(r, 350));
      const row = (JSON.parse(memoryText || '{}').dreams || { index: [] }).index[0] || {};
      return {
        keptBeforeReading, loading, ...shown,
        onlyQueueAndIndex: holders.every(k => k === 'today-dream-queue' || k === 'today_memory'),
        noRetellingInMemory: !memoryText.includes('floor was water. I felt calm'),
        twoRequests: t.aiRequests.length === 2,
        readingPrompt: /do not guess at their/.test(readReq.systemPrompt) && /At most 80 words/.test(readReq.systemPrompt)
          && !/just woken up/.test(readReq.systemPrompt) && readReq.messages?.[0]?.content === dream
          && readReq.provider === 'claude' && readReq.apiKey === 'claude-key',
        extractPrompt: /Reply only with JSON/.test(extractReq.systemPrompt) && extractReq.messages?.[0]?.content === dream,
        exactNight: entry.nightCertainty === 'exact' && entry.lang === 'en',
        grounded: JSON.stringify(row.images) === JSON.stringify(['grandmother\'s kitchen', 'floor was water']) && row.role === 'stands calmly on water',
        indexSynced: t.autosaves >= 1,
        keptOnDone: queue()[0].ready === true,
        noTasks: JSON.parse(localStorage.getItem('today_manual') || '[]').length === 0,
        clearedOnClose: document.getElementById('meetingItems').innerHTML === '',
      };
    });
    const meetingChrome = await page.evaluate(async () => {
      const t = window.__meetingTest;
      Today.use('meeting').toggleMeeting();
      await new Promise(r => setTimeout(r, 20));
      t.meetingResponses.push({ updatedContext: '', actionItems: [{ text: 'Send the notes', owner: '', mine: true }] });
      Today.use('meeting').toggleMeeting();
      for (let i = 0; i < 60 && !document.querySelector('#meetingItems .meeting-item'); i++) await new Promise(r => setTimeout(r, 10));
      return {
        meetingEyebrowRestored: document.querySelector('#meetingPanel .meeting-eyebrow').textContent === 'Meeting',
        dontKeepHiddenAgain: document.getElementById('meetingDropBtn').hidden,
        discardRestored: document.querySelector('.meeting-review-discard').textContent === 'Discard'
          && document.querySelector('.meeting-review-discard').style.display !== 'none',
        subRestored: document.getElementById('meetingReviewSub').textContent.startsWith('Yours are pre-selected'),
        noExtraAiCall: t.aiRequests.length === 2,
        stillOneDream: JSON.parse(localStorage.getItem('today-dream-queue') || '[]').length === 1,
      };
    });
    await expectAll('dream kept', { ...result, ...meetingChrome, noErrors: errors.length === 0 });
    ok('a recounted dream is kept before any reading, read and extracted in parallel, grounded, and kept on Done');
    await page.close();
  }

  // BUG-110: an empty result Gemini did not mean (blocked, unreadable) is reported, not
  // passed off as "Nothing came up" in silence.
  {
    const { page, errors } = await openPage({ supported: ['audio/webm;codecs=opus'] });
    const result = await page.evaluate(async () => {
      const t = window.__meetingTest;
      Today.use('meeting').toggleMeeting();
      await new Promise(r => setTimeout(r, 20));
      t.meetingResponses.push({ updatedContext: '', actionItems: [], dream: '', note: 'empty: safety' });
      Today.use('meeting').toggleMeeting();
      for (let i = 0; i < 60 && !document.querySelector('.meeting-review-empty'); i++) await new Promise(r => setTimeout(r, 10));
      return {
        reported: t.errors.some(e => e.where === 'Meeting' && /nothing usable — empty: safety/.test(e.message)),
        emptyShown: !!document.querySelector('.meeting-review-empty'),
      };
    });
    await expectAll('empty reply reported', { ...result, noErrors: errors.length === 0 });
    ok('a blocked or unreadable Gemini reply is reported instead of a silent "Nothing came up"');
    await page.close();
  }

  // Dream + a real task in one capture: the task is still offered, nothing but the dream
  // is stored before acceptance, and Add tasks keeps the dream.
  {
    const { page, errors } = await openPage({ supported: ['audio/webm;codecs=opus'] });
    const result = await page.evaluate(async () => {
      const t = window.__meetingTest;
      const until = async fn => { for (let i = 0; i < 80 && !fn(); i++) await new Promise(r => setTimeout(r, 10)); };
      Today.use('meeting').toggleMeeting();
      await new Promise(r => setTimeout(r, 20));
      t.meetingResponses.push({ updatedContext: '', dream: 'I missed a flight at an airport that kept moving.', night_hint: 'nights_ago:2',
        actionItems: [{ text: 'Call mum', owner: '', mine: true }] });
      Today.use('meeting').toggleMeeting();
      await until(() => !!document.querySelector('#meetingItems .meeting-item'));
      const stored = [...Array(localStorage.length).keys()].map(i => localStorage.getItem(localStorage.key(i)) || '');
      const offered = document.querySelector('#meetingItems .meeting-item-text').textContent === 'Call mum'
        && document.getElementById('meetingAddBtn').style.display !== 'none';
      const onlyDreamStored = !stored.some(v => v.includes('Call mum')) && stored.some(v => v.includes('airport that kept moving'));
      Today.use('meeting')._meetingAccept();
      await new Promise(r => setTimeout(r, 350));
      const q = JSON.parse(localStorage.getItem('today-dream-queue') || '[]');
      const twoAgo = new Date(); twoAgo.setDate(twoAgo.getDate() - 2);
      return {
        offered, onlyDreamStored,
        taskAdded: JSON.parse(localStorage.getItem('today_manual') || '[]').some(x => x.text === 'Call mum'),
        dreamKept: q.length === 1 && q[0].ready === true && q[0].night === _localISO(twoAgo),
      };
    });
    await expectAll('dream plus task', { ...result, noErrors: errors.length === 0 });
    ok('a dream and a real task in one capture: task offered, only the dream stored first, both kept');
    await page.close();
  }

  // The sheet is patched, not rebuilt: a reading that lands mid-typing keeps the thought
  // field (same node, same value); the night chip and "Don't keep this one" work.
  {
    const { page, errors } = await openPage({ supported: ['audio/webm;codecs=opus'] });
    const result = await page.evaluate(async () => {
      const t = window.__meetingTest;
      const until = async fn => { for (let i = 0; i < 80 && !fn(); i++) await new Promise(r => setTimeout(r, 10)); };
      Today.use('meeting').toggleMeeting();
      await new Promise(r => setTimeout(r, 20));
      t.meetingResponses.push({ updatedContext: '', actionItems: [], dream: 'The stairs never ended and the house kept growing.' });
      let release; t.aiResponses.push({ gate: new Promise(r => { release = r; }), content: 'The stairs keep going.' });
      Today.use('meeting').toggleMeeting();
      await until(() => !!document.querySelector('[data-today-click="meeting.dream-thought-open"]'));
      document.querySelector('[data-today-click="meeting.dream-thought-open"]').click();
      const field = document.getElementById('dreamThought');
      const textField = field.classList.contains('config-input');
      const focused = document.activeElement === field;
      const ctaGone = !document.querySelector('[data-today-click="meeting.dream-thought-open"]');
      field.value = 'my old house';
      field.dispatchEvent(new Event('input', { bubbles: true }));
      release();
      await until(() => !!document.querySelector('#meetingItems .dream-reading'));
      const q = () => JSON.parse(localStorage.getItem('today-dream-queue') || '[]');
      const sameField = document.getElementById('dreamThought') === field && field.value === 'my old house';
      const thoughtSaved = q()[0].thought === 'my old house';
      document.querySelector('[data-today-click="meeting.dream-night-open"]').click();
      const select = document.querySelector('#dreamNightSlot select.config-input');
      const twoAgo = new Date(); twoAgo.setDate(twoAgo.getDate() - 2);
      select.value = _localISO(twoAgo);
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await until(() => document.getElementById('meetingReviewTitle').textContent === 'The night before last');
      const nightSet = q()[0].night === _localISO(twoAgo) && q()[0].nightByUser === true
        && document.getElementById('meetingReviewTitle').textContent === 'The night before last';
      document.getElementById('meetingDropBtn').click();
      await until(() => q().length === 0);
      await new Promise(r => setTimeout(r, 350));
      return {
        focused, textField, ctaGone, sameField, thoughtSaved, nightSet,
        dropped: q().length === 0,
        closed: document.getElementById('meetingOverlay').classList.contains('hidden'),
        goneFromStorage: ![...Array(localStorage.length).keys()].some(i => (localStorage.getItem(localStorage.key(i)) || '').includes('stairs never ended')),
      };
    });
    await expectAll('dream sheet patching, night, and discard', { ...result, noErrors: errors.length === 0 });
    ok('thought and night open on tap; a late reading keeps the thought; the title follows the night; "Don\'t keep" removes it');
    await page.close();
  }

  // Chunk barrier: an earlier chunk that answers after the final one still lands, in
  // order, and nothing is read until every chunk has answered.
  {
    const { page, errors } = await openPage({ supported: ['audio/webm;codecs=opus'], claude: true });
    const result = await page.evaluate(async () => {
      const t = window.__meetingTest;
      const until = async fn => { for (let i = 0; i < 80 && !fn(); i++) await new Promise(r => setTimeout(r, 10)); };
      Today.use('meeting').toggleMeeting();
      await new Promise(r => setTimeout(r, 20));
      let releaseFirst;
      t.meetingResponses.push(
        { gate: new Promise(r => { releaseFirst = r; }), updatedContext: '', actionItems: [], dream: 'Part one by the sea.' },
        { updatedContext: '', actionItems: [], dream: 'Part two in the lighthouse.' },
      );
      t.recorders[0].stop(); // chunk 1 (live) — its reply is held
      await new Promise(r => setTimeout(r, 30));
      Today.use('meeting').toggleMeeting(); // chunk 2 (final) answers first
      await new Promise(r => setTimeout(r, 80));
      const waited = t.aiRequests.length === 0;
      releaseFirst();
      await until(() => t.aiRequests.length >= 1);
      const q = JSON.parse(localStorage.getItem('today-dream-queue') || '[]');
      return {
        waited,
        ordered: q.length === 1 && q[0].retelling === 'Part one by the sea.\n\nPart two in the lighthouse.',
        readFinal: t.aiRequests[0].messages[0].content === 'Part one by the sea.\n\nPart two in the lighthouse.',
      };
    });
    await expectAll('chunk barrier and order', { ...result, noErrors: errors.length === 0 });
    ok('late earlier chunks assemble in order and the reading waits for every chunk');
    await page.close();
  }

  // Dropbox: uploads from capture, re-uploads on edits, renames on a night correction,
  // and says "Kept in Dropbox" live.
  {
    const { page, errors } = await openPage({ supported: ['audio/webm;codecs=opus'] });
    const result = await page.evaluate(async () => {
      const t = window.__meetingTest;
      const until = async fn => { for (let i = 0; i < 300 && !fn(); i++) await new Promise(r => setTimeout(r, 10)); };
      localStorage.setItem('dropbox_token', 'dbx');
      t.uploads = []; t.moves = [];
      // dropbox-files is a frozen component; patch its functions through their owners' contract instead.
      const files = Today.use('dropbox-files');
      window.__origFetch = window.fetch;
      const inner = window.fetch;
      window.fetch = async (url, opts = {}) => {
        const u = String(url);
        if (u.endsWith('/2/files/upload')) {
          t.uploads.push({ path: JSON.parse(opts.headers['Dropbox-API-Arg']).path, text: opts.body });
          return new Response('{}', { status: 200 });
        }
        if (u.endsWith('/2/files/move_v2')) {
          const a = JSON.parse(opts.body); t.moves.push({ from: a.from_path, to: a.to_path });
          return new Response('{}', { status: 200 });
        }
        return inner(url, opts);
      };
      const dreamsDir = files.dreamsDir;
      Today.use('meeting').toggleMeeting();
      await new Promise(r => setTimeout(r, 20));
      t.meetingResponses.push({ updatedContext: '', actionItems: [], dream: 'A red door in a white field.', night_hint: 'last_night' });
      t.aiResponses.push({ content: 'The door waits.' });
      Today.use('meeting').toggleMeeting();
      await until(() => document.getElementById('meetingReviewSub').textContent === 'Kept in your Dropbox');
      const first = t.uploads[t.uploads.length - 1] || { path: '', text: '' };
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      document.querySelector('[data-today-click="meeting.dream-night-open"]').click();
      const select = document.querySelector('#dreamNightSlot select');
      const threeAgo = new Date(); threeAgo.setDate(threeAgo.getDate() - 3);
      select.value = _localISO(threeAgo);
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await until(() => t.moves.length === 1 && t.uploads.some(u => u.path.includes(_localISO(threeAgo))));
      const last = t.uploads[t.uploads.length - 1];
      return {
        status: true,
        path: new RegExp('^' + dreamsDir + '/' + _localISO(yesterday) + '_dream_[a-z0-9]+\\.md$').test(first.path),
        format: /^---\nid: "dream_/.test(first.text) && first.text.includes('## Retelling\n\nA red door in a white field.'),
        renamed: t.moves[0].from === first.path && t.moves[0].to === last.path && last.path.includes(_localISO(threeAgo)),
        frontmatterNight: last.text.includes('night: "' + _localISO(threeAgo) + '"'),
      };
    });
    await expectAll('dream upload and rename', { ...result, noErrors: errors.length === 0 });
    ok('dreams upload from capture, rename on a corrected night, and show "Kept in Dropbox"');
    await page.close();
  }

  // A dream left by a previous session (app killed before Done) is kept, gets its reading,
  // and can be opened and deleted from the Memory panel.
  {
    const now = new Date().toISOString();
    const seed = [{ id: 'dream_seed1', retelling: 'A whale sang under the bridge.', hint: '', night: '2026-09-01',
      nightCertainty: 'approx', nightByUser: false, lang: 'en', reading: '', readingState: 'pending', readingTries: 0,
      readingNextAt: 0, images: [], people: [], role: '', extraction: 'pending', extractionTries: 0, extractionNextAt: 0,
      thought: '', recordedAt: now, updatedAt: now, rev: 1, uploadedRev: 0, remotePath: '', uploadTries: 0,
      uploadNextAt: 0, settled: false, ready: false, deleted: false, pruned: false, prunedAt: '' }];
    const { page, errors } = await openPage({ supported: ['audio/webm;codecs=opus'], seedQueue: seed, claude: true });
    const result = await page.evaluate(async () => {
      const t = window.__meetingTest;
      const until = async fn => { for (let i = 0; i < 300 && !fn(); i++) await new Promise(r => setTimeout(r, 10)); };
      const q = () => JSON.parse(localStorage.getItem('today-dream-queue') || '[]');
      await until(() => t.aiRequests.length >= 1);
      const keptAfterReload = q()[0].ready === true && q()[0].settled === true;
      const readRequested = t.aiRequests[0].messages[0].content === 'A whale sang under the bridge.';
      Today.use('memory').toggle();
      const block = () => document.getElementById('dreamMemoryBlock');
      const row = block().querySelector('.memory-item');
      const listed = !!row && row.querySelector('.memory-item-text').textContent.startsWith('Sep 1 — A whale sang')
        && row.querySelector('.memory-item-btn').textContent === 'read';
      row.querySelector('[data-today-click="dream.memory-open"]').click();
      const opened = block().querySelector('.dream-told')?.textContent === 'A whale sang under the bridge.';
      const items = [...block().querySelectorAll('.memory-item')];
      const foot = items[items.length - 1];
      const quietFoot = foot.querySelector('.memory-item-text').textContent === 'kept on this phone'
        && [...foot.querySelectorAll('.memory-item-btn')].map(b => b.textContent).join('|') === 'change night|delete'
        && !block().querySelector('select');
      foot.querySelector('[data-today-click="dream.memory-night-open"]').click();
      const nightOnDemand = !!block().querySelector('select.config-input');
      const backfillHint = /older dreams count too/.test(block().textContent);
      document.querySelector('[data-today-click="dream.memory-delete"]').click();
      document.querySelector('[data-today-click="dream.memory-delete-confirm"]').click();
      await until(() => q().length === 0);
      return {
        keptAfterReload, readRequested, listed, opened, quietFoot, nightOnDemand, backfillHint,
        deleted: q().length === 0 && !document.querySelector('#dreamMemoryBlock [data-today-click="dream.memory-open"]'),
      };
    });
    await expectAll('dream from a previous session', { ...result, noErrors: errors.length === 0 });
    ok('a dream from a killed session is kept, read, listed in Memory, and deletable');
    await page.close();
  }

  // Chunk rollover keeps rolling context, deduplicates actions, and preserves chronology.
  {
    const { page, errors } = await openPage({ supported: ['audio/mp4'], touch: true });
    const result = await page.evaluate(async () => {
      window.__meetingTest.meetingResponses.push(
        { updatedContext: 'after one', actionItems: [{ text: 'First action', owner: 'Can', mine: true }] },
        { updatedContext: 'after two', actionItems: [
          { text: 'First action!', owner: 'Can', mine: true },
          { text: 'Second action', owner: 'Can', mine: true },
        ] },
        { updatedContext: 'final', actionItems: [] },
      );
      Today.use('meeting').toggleMeeting();
      await new Promise(resolve => setTimeout(resolve, 10));
      const first = window.__meetingTest.recorders[0];
      const iosPolicy = first.options.audioBitsPerSecond === 32000 && first.options.mimeType === 'audio/mp4';
      first.stop();
      await new Promise(resolve => setTimeout(resolve, 30));
      const second = window.__meetingTest.recorders[1];
      second.stop();
      await new Promise(resolve => setTimeout(resolve, 30));
      const third = window.__meetingTest.recorders[2];
      Today.use('meeting').toggleMeeting();
      await new Promise(resolve => setTimeout(resolve, 40));
      const texts = [...document.querySelectorAll('#meetingItems .meeting-item .meeting-item-text')]
        .map(el => el.textContent.trim());
      return {
        iosPolicy,
        rolledTwice: !!second && !!third && window.__meetingTest.recorders.length === 3,
        contextRolled: window.__meetingTest.meetingRequests[1]?.rollingContext === 'after one'
          && window.__meetingTest.meetingRequests[2]?.rollingContext === 'after two',
        capturedMineRolled: window.__meetingTest.meetingRequests[1]?.capturedMine?.join('|') === 'First action',
        chronologicalAndDeduped: texts.join('|') === 'First action|Second action',
        allMp4: window.__meetingTest.meetingRequests.every(x => x.mimeType === 'audio/mp4'),
      };
    });
    await expectAll('meeting chunk rollover', { ...result, noErrors: errors.length === 0 });
    ok('AAC rollover preserves context, chronology, and normalized deduplication');
    await page.close();
  }

  // Retry once, quota short-circuit, oversize rejection, and permission denial.
  for (const testCase of [
    { label: 'single retry', responses: [{ throw: 'network' }, { actionItems: [] }], blobSize: 16,
      requests: 2, error: false },
    { label: 'quota', responses: [{ error: '429 quota exceeded' }], blobSize: 16,
      requests: 1, error: true },
    { label: 'oversize', responses: [], blobSize: 4300001,
      requests: 0, error: true },
  ]) {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async cfg => {
      window.__meetingTest.meetingResponses.push(...cfg.responses);
      window.__meetingTest.nextBlobSize = cfg.blobSize;
      Today.use('meeting').toggleMeeting();
      await new Promise(resolve => setTimeout(resolve, 10));
      Today.use('meeting').toggleMeeting();
      await new Promise(resolve => setTimeout(resolve, 60));
      return {
        requests: window.__meetingTest.meetingRequests.length,
        logged: window.__meetingTest.errors.length > 0,
        trackStopped: window.__meetingTest.streams[0].track.readyState === 'ended',
      };
    }, testCase);
    await expectAll(`meeting ${testCase.label}`, {
      requestPolicy: result.requests === testCase.requests,
      errorPolicy: result.logged === testCase.error,
      trackStopped: result.trackStopped,
      noErrors: errors.length === 0,
    });
    ok(`meeting ${testCase.label} policy`);
    await page.close();
  }
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      window.__meetingTest.rejectGetUserMedia = true;
      Today.use('meeting').toggleMeeting();
      await new Promise(resolve => setTimeout(resolve, 0));
      Today.use('meeting').toggleMeeting();
      await new Promise(resolve => setTimeout(resolve, 0));
      return {
        retriable: window.__meetingTest.getUserMediaCalls === 2,
        honestError: window.__meetingTest.errors.every(x => x.where === 'Meeting'
          && x.message.includes('Mic access declined')),
        notLive: !document.getElementById('meetingBtn').classList.contains('live'),
      };
    });
    await expectAll('meeting permission denial', { ...result, noErrors: errors.length === 0 });
    ok('permission denial resets the start guard and remains retriable');
    await page.close();
  }

  // Visibility recovery: surviving capture stays live; paused capture restarts; dead track ends honestly.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      Today.use('meeting').toggleMeeting();
      await new Promise(resolve => setTimeout(resolve, 10));
      const first = window.__meetingTest.recorders[0];
      window.__meetingTest.setVisibility('hidden');
      window.__meetingTest.setVisibility('visible');
      await new Promise(resolve => setTimeout(resolve, 10));
      const survived = first.state === 'recording' && window.__meetingTest.recorders.length === 1;

      first.pause();
      window.__meetingTest.setVisibility('hidden');
      window.__meetingTest.setVisibility('visible');
      await new Promise(resolve => setTimeout(resolve, 30));
      const restarted = window.__meetingTest.recorders.length === 2
        && window.__meetingTest.recorders[1].state === 'recording';

      window.__meetingTest.streams[0].track.readyState = 'ended';
      window.__meetingTest.setVisibility('hidden');
      window.__meetingTest.setVisibility('visible');
      await new Promise(resolve => setTimeout(resolve, 40));
      return {
        survived, restarted,
        noFalseLive: !document.getElementById('meetingBtn').classList.contains('live'),
        reviewShown: !document.getElementById('meetingOverlay').classList.contains('hidden'),
        honestNote: document.querySelector('.meeting-suspend-note')?.textContent.includes('Listening stopped when the screen locked'),
        wakeReacquired: window.__meetingTest.wakeRequests >= 3,
      };
    });
    await expectAll('meeting suspension recovery', { ...result, noErrors: errors.length === 0 });
    ok('visibility recovery never leaves a dead recorder falsely live');
    await page.close();
  }

  // Document PiP opens on tab leave, mirrors state, and can stop capture.
  {
    const { page, errors } = await openPage({ pip: true });
    const result = await page.evaluate(async () => {
      Today.use('meeting').toggleMeeting();
      await new Promise(resolve => setTimeout(resolve, 10));
      window.__meetingTest.setVisibility('hidden');
      await new Promise(resolve => setTimeout(resolve, 30));
      const pip = window.__meetingTest.pipWindows[0];
      const button = pip?.document.getElementById('mpBtn');
      const live = pip?.document.getElementById('mpDot')?.classList.contains('live')
        && button?.textContent === 'stop';
      button?.click();
      await new Promise(resolve => setTimeout(resolve, 30));
      return {
        openedOnce: window.__meetingTest.pipRequests === 1,
        live,
        stopped: !document.getElementById('meetingBtn').classList.contains('live'),
        closed: pip?.closed === true,
      };
    });
    await expectAll('meeting Document PiP', { ...result, noErrors: errors.length === 0 });
    ok('Document PiP auto-opens, mirrors capture, and stops cleanly');
    await page.close();
  }

  // Voice Note success, failure restoration, media cleanup, and 90-second cap.
  for (const testCase of [
    { label: 'success', response: { text: 'Call the dentist' }, expected: 'Call the dentist' },
    { label: 'failure', response: { throw: 'offline' }, expected: 'draft task' },
  ]) {
    const { page, errors } = await openPage({ supported: [], touch: true });
    const result = await page.evaluate(async cfg => {
      const input = document.getElementById('newTask');
      input.value = 'draft task';
      window.__meetingTest.voiceResponses.push(cfg.response);
      Today.use('meeting').toggleVoiceNote();
      await new Promise(resolve => setTimeout(resolve, 10));
      const rec = window.__meetingTest.recorders[0];
      const started = rec?.state === 'recording'
        && document.getElementById('voicePill').classList.contains('show')
        && document.getElementById('voiceNoteBtn').classList.contains('live');
      Today.use('meeting').toggleVoiceNote();
      await new Promise(resolve => setTimeout(resolve, 40));
      return {
        started,
        requestMime: window.__meetingTest.voiceRequests[0]?.mimeType === 'audio/webm',
        restored: input.value === cfg.expected && !input.disabled,
        trackStopped: window.__meetingTest.streams[0].track.readyState === 'ended',
        buttonClean: !document.getElementById('voiceNoteBtn').classList.contains('live'),
      };
    }, testCase);
    await expectAll(`Voice Note ${testCase.label}`, { ...result, noErrors: errors.length === 0 });
    ok(`Voice Note ${testCase.label} restores input and tears down media`);
    await page.close();
  }
  {
    const { page, errors } = await openPage({ supported: [], touch: true });
    const result = await page.evaluate(async () => {
      const realNow = Date.now;
      const base = realNow();
      Today.use('meeting').toggleVoiceNote();
      await new Promise(resolve => setTimeout(resolve, 20));
      Date.now = () => base + 91000;
      await new Promise(resolve => setTimeout(resolve, 1100));
      Date.now = realNow;
      await new Promise(resolve => setTimeout(resolve, 30));
      return {
        stopped: window.__meetingTest.recorders[0].state === 'inactive',
        sent: window.__meetingTest.voiceRequests.length === 1,
        cleaned: window.__meetingTest.streams[0].track.readyState === 'ended'
          && !document.getElementById('voiceNoteBtn').classList.contains('live'),
      };
    });
    await expectAll('Voice Note 90-second cap', { ...result, noErrors: errors.length === 0 });
    ok('Voice Note stops automatically at the 90-second cap');
    await page.close();
  }

  // Static ownership checks differ only while establishing the inline baseline.
  {
    const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
    const swSrc = await readFile(join(ROOT, 'sw.js'), 'utf8');
    if (PRE_EXTRACTION) {
      await expectAll('inline Meeting baseline wiring', {
        inlineController: indexSrc.includes('// ── Meeting mode (v2.22.0 desktop, v2.28.0 mobile)'),
        noModuleLoad: !indexSrc.includes('<script src="assets/meeting.js"></script>'),
        noPrecache: !swSrc.includes("'/assets/meeting.js'"),
      });
      ok('inline Meeting/Voice ownership baseline');
    } else {
      const meetingSrc = await readFile(join(ROOT, 'assets/meeting.js'), 'utf8');
      await expectAll('extracted Meeting module wiring', {
        moduleLoad: indexSrc.includes('<script src="assets/meeting.js"></script>'),
        initializer: indexSrc.includes('window._startMeeting();'),
        inlineRemoved: !indexSrc.includes('// ── Meeting mode (v2.22.0 desktop, v2.28.0 mobile)'),
        moduleInitializer: meetingSrc.includes('window._startMeeting = function()'),
        api: meetingSrc.includes("Today.define('meeting'"),
        privateState: !indexSrc.includes('let _mtg =') && !indexSrc.includes('let _vn ='),
        precached: swSrc.includes("'/assets/meeting.js'"),
      });
      const dreambankSrc = await readFile(join(ROOT, 'assets/dreambank.js'), 'utf8');
      const extractSrc = await readFile(join(ROOT, 'netlify/functions/meeting-extract.js'), 'utf8');
      const hint = src => (src.match(/const NIGHT_HINT = (\/.*\/);/) || [])[1];
      await expectAll('DreamBank module wiring', {
        dreambankLoad: indexSrc.includes('<script src="assets/dreambank.js"></script>\n<script src="assets/meeting.js"></script>'),
        dreambankInit: indexSrc.includes("Today.use('dream-core').start();\nwindow._startMeeting();"),
        dreambankPrecached: swSrc.includes("'/assets/dreambank.js'"),
        promptMoved: !meetingSrc.includes('_DREAM_SYSTEM') && dreambankSrc.includes('const DREAM_SYSTEM ='),
        nightHintMirrored: !!hint(dreambankSrc) && hint(dreambankSrc) === hint(extractSrc),
      });
      ok('extracted Meeting/Voice wiring, globals, private state, and precache');
    }
  }

  console.log(`\nMeeting + Voice Note tests passed (${PRE_EXTRACTION ? 'inline baseline' : 'extracted module'}).`);
} finally {
  if (browser) await browser.close();
  server.close();
}
