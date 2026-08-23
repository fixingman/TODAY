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
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
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
        if (response.throw) throw new Error(response.throw);
        const raw = response.raw !== undefined ? response.raw : JSON.stringify(response.body || response);
        return { ok: response.ok !== false, status: response.status || 200, text: async () => raw };
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
  await page.waitForFunction(() => typeof toggleMeeting === 'function'
    && typeof toggleVoiceNote === 'function' && document.getElementById('meetingBtn'), { timeout: 15000 });
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
      renderMeetingNames();
      const migratedRead = _getUserNames();
      const input = document.getElementById('meetingNameInput');
      input.value = '  Can,  ';
      addMeetingName();
      document.getElementById('meetingNameInput').value = 'Can';
      addMeetingName();
      const afterAdd = _getUserNames();
      removeMeetingName(0);
      const afterRemove = _getUserNames();

      localStorage.removeItem('today_user_names');
      localStorage.removeItem('today_user_name');
      window.__meetingTest.rejectGetUserMedia = true;
      toggleMeeting();
      const promptShown = document.getElementById('meetingNamePrompt').classList.contains('show');
      _meetingNamePromptKey({ key: 'Escape', preventDefault() {} });
      await new Promise(resolve => setTimeout(resolve, 320));
      const escapeClosed = !document.getElementById('meetingNamePrompt').classList.contains('show');
      toggleMeeting();
      document.getElementById('meetingNamePromptInput').value = 'Robin';
      _meetingNamePromptKey({ key: 'Enter', preventDefault() {} });
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
      toggleMeeting(); toggleMeeting();
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
      toggleMeeting();
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
      _meetingAccept();
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
      toggleMeeting();
      await new Promise(resolve => setTimeout(resolve, 10));
      const first = window.__meetingTest.recorders[0];
      const iosPolicy = first.options.audioBitsPerSecond === 32000 && first.options.mimeType === 'audio/mp4';
      first.stop();
      await new Promise(resolve => setTimeout(resolve, 30));
      const second = window.__meetingTest.recorders[1];
      second.stop();
      await new Promise(resolve => setTimeout(resolve, 30));
      const third = window.__meetingTest.recorders[2];
      toggleMeeting();
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
      toggleMeeting();
      await new Promise(resolve => setTimeout(resolve, 10));
      toggleMeeting();
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
      toggleMeeting();
      await new Promise(resolve => setTimeout(resolve, 0));
      toggleMeeting();
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
      toggleMeeting();
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
      toggleMeeting();
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
      toggleVoiceNote();
      await new Promise(resolve => setTimeout(resolve, 10));
      const rec = window.__meetingTest.recorders[0];
      const started = rec?.state === 'recording'
        && document.getElementById('voicePill').classList.contains('show')
        && document.getElementById('voiceNoteBtn').classList.contains('live');
      toggleVoiceNote();
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
      toggleVoiceNote();
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
      const requiredExports = ['toggleMeeting', '_meetingStop', 'renderMeetingNames', 'addMeetingName',
        'removeMeetingName', '_meetingNamePromptKey', '_meetingNamePromptSubmit', '_meetingAccept',
        '_meetingDiscard', '_meetingInit', '_meetingHealthCheck', 'toggleVoiceNote', '_voiceNoteStop',
        '_voiceNoteInit'];
      await expectAll('extracted Meeting module wiring', {
        moduleLoad: indexSrc.includes('<script src="assets/meeting.js"></script>'),
        initializer: indexSrc.includes('window._startMeeting();'),
        inlineRemoved: !indexSrc.includes('// ── Meeting mode (v2.22.0 desktop, v2.28.0 mobile)'),
        moduleInitializer: meetingSrc.includes('window._startMeeting = function()'),
        exports: requiredExports.every(name => meetingSrc.includes(`window.${name} = ${name};`)),
        privateState: !indexSrc.includes('let _mtg =') && !indexSrc.includes('let _vn ='),
        precached: swSrc.includes("'/assets/meeting.js'"),
      });
      ok('extracted Meeting/Voice wiring, globals, private state, and precache');
    }
  }

  console.log(`\nMeeting + Voice Note tests passed (${PRE_EXTRACTION ? 'inline baseline' : 'extracted module'}).`);
} finally {
  if (browser) await browser.close();
  server.close();
}
