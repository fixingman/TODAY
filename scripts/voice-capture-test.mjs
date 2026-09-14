// TODAY — Shift+Space quick voice capture regression test.
// Verifies the local-recognition preference, one-blob Gemini fallback,
// release-order handling, honest states, and input/repeat guards.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
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
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const URL_BASE = `http://127.0.0.1:${server.address().port}`;

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
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(opts => {
    localStorage.clear();
    localStorage.setItem('splash_shown_at', String(Date.now()));
    if (opts.gemini) localStorage.setItem('today_ai_key_gemini', 'test-gemini-key');

    const state = window.__voiceCaptureTest = {
      availableCalls: [], recognitions: [], localStarts: 0, localStops: 0,
      getUserMediaCalls: 0, streams: [], recorders: [], requests: [],
    };

    class FakeSpeechRecognition {
      static available(args) {
        state.availableCalls.push(args);
        return Promise.resolve(opts.local ? 'available' : 'unavailable');
      }
      constructor() {
        this.lang = ''; this.continuous = false; this.interimResults = true;
        this.maxAlternatives = 0; this.processLocally = false;
        this.onresult = null; this.onerror = null; this.onend = null;
        state.recognitions.push(this);
      }
      start() { state.localStarts++; }
      stop() {
        state.localStops++;
        setTimeout(() => {
          if (opts.localError) {
            this.onerror?.({ error: opts.localError });
            this.onend?.();
            return;
          }
          const pieces = opts.localPieces || ['Plan the', 'autumn trip'];
          const results = pieces.map(text => {
            const result = [{ transcript: text }];
            result.isFinal = true;
            return result;
          });
          this.onresult?.({ resultIndex: 0, results });
          this.onend?.();
        }, 30);
      }
    }
    window.SpeechRecognition = FakeSpeechRecognition;
    window.webkitSpeechRecognition = undefined;

    class FakeTrack {
      constructor() { this.readyState = 'live'; this.stops = 0; }
      stop() { this.readyState = 'ended'; this.stops++; }
    }
    class FakeStream {
      constructor() { this.track = new FakeTrack(); }
      getTracks() { return [this.track]; }
      getAudioTracks() { return [this.track]; }
    }
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: async () => {
        state.getUserMediaCalls++;
        if (opts.micError) throw new Error('denied');
        const stream = new FakeStream();
        state.streams.push(stream);
        return stream;
      },
    } });

    class FakeMediaRecorder {
      static isTypeSupported(type) { return type === 'audio/webm;codecs=opus'; }
      constructor(stream, recorderOptions = {}) {
        this.stream = stream; this.options = recorderOptions;
        this.mimeType = recorderOptions.mimeType || '';
        this.state = 'inactive'; this.listeners = {};
        state.recorders.push(this);
      }
      addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
      _emit(type, event = {}) { (this.listeners[type] || []).forEach(fn => fn(event)); }
      start() { this.state = 'recording'; }
      stop() {
        if (this.state !== 'recording') return;
        this.state = 'inactive';
        this._emit('dataavailable', {
          data: new Blob([new Uint8Array(24)], { type: this.mimeType }),
        });
        queueMicrotask(() => this._emit('stop'));
      }
    }
    window.MediaRecorder = FakeMediaRecorder;

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (url, fetchOptions = {}) => {
      if (!String(url).includes('/.netlify/functions/transcribe')) {
        return originalFetch(url, fetchOptions);
      }
      state.requests.push(JSON.parse(fetchOptions.body || '{}'));
      await new Promise(resolve => setTimeout(resolve, 30));
      const failed = !!opts.transcribeError;
      return {
        ok: !failed,
        status: failed ? 502 : 200,
        json: async () => failed
          ? { error: 'test transcription failure' }
          : { text: opts.transcript || 'Send the revised proposal' },
      };
    };
  }, options);

  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._startVoiceCapture === 'function'
    && typeof Today?.use('task-actions').addTaskFromText === 'function'
    && document.getElementById('voiceCapturePill'), { timeout: 15000 });
  await page.evaluate(() => {
    dropboxAutoSave = () => {};
    _aiAnalyzeTask = () => {};
    _haptic = () => {};
  });
  return { page, errors };
}

async function pressChord(page) {
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', {
    code: 'Space', key: ' ', shiftKey: true, bubbles: true,
  })));
  await page.waitForFunction(() => document.getElementById('voiceCapturePill')?.dataset.state === 'listening');
}

async function release(page, code) {
  await page.evaluate(releaseCode => document.dispatchEvent(new KeyboardEvent('keyup', {
    code: releaseCode, key: releaseCode.startsWith('Shift') ? 'Shift' : ' ',
    shiftKey: false, bubbles: true,
  })), code);
  await page.waitForFunction(() => document.getElementById('voiceCapturePill')?.dataset.state === 'transcribing');
}

try {
  // Verified local recognition wins even when Gemini is configured. It is continuous,
  // explicitly local, accumulates final segments, and Shift-first release still stops.
  {
    const { page, errors } = await openPage({ local: true, gemini: true });
    await pressChord(page);
    const listening = await page.evaluate(() => {
      const rec = __voiceCaptureTest.recognitions[0];
      return {
        localProbe: __voiceCaptureTest.availableCalls[0]?.processLocally === true,
        localLanguage: __voiceCaptureTest.availableCalls[0]?.langs?.[0] === navigator.language,
        processLocally: rec?.processLocally === true,
        continuous: rec?.continuous === true,
        finalOnly: rec?.interimResults === false,
        localStarted: __voiceCaptureTest.localStarts === 1,
        noMedia: __voiceCaptureTest.getUserMediaCalls === 0,
      };
    });
    await release(page, 'ShiftLeft');
    await page.waitForFunction(() => manualTasks.some(task => task.text === 'Plan the autumn trip'));
    const result = await page.evaluate(() => ({
      stoppedOnce: __voiceCaptureTest.localStops === 1,
      addedOnce: manualTasks.filter(task => task.text === 'Plan the autumn trip').length === 1,
      noGeminiRequest: __voiceCaptureTest.requests.length === 0,
      feedback: document.querySelector('#voiceCapturePill .vc-label')?.textContent === 'Added',
    }));
    await expectAll('on-device recognition', { ...listening, ...result, noErrors: errors.length === 0 });
    ok('on-device recognition is explicit, continuous, release-driven, and added once');
    await page.close();
  }

  // Without a local language pack, one self-contained blob uses the configured
  // Gemini route. Space release works even though shiftKey is already false.
  {
    const { page, errors } = await openPage({ local: false, gemini: true });
    await pressChord(page);
    await release(page, 'Space');
    await page.waitForFunction(() => manualTasks.some(task => task.text === 'Send the revised proposal'));
    const result = await page.evaluate(() => {
      const request = __voiceCaptureTest.requests[0];
      const rec = __voiceCaptureTest.recorders[0];
      return {
        oneStream: __voiceCaptureTest.getUserMediaCalls === 1,
        oneRecorder: __voiceCaptureTest.recorders.length === 1,
        oneRequest: __voiceCaptureTest.requests.length === 1,
        oneBlob: !!request?.audioData && request.audioData.length > 0,
        explicitKey: request?.apiKey === 'test-gemini-key',
        explicitMime: request?.mimeType === 'audio/webm;codecs=opus',
        speechBitrate: rec?.options?.audioBitsPerSecond === 32000,
        trackStopped: __voiceCaptureTest.streams[0]?.track?.stops === 1,
        noCloudRecognizer: __voiceCaptureTest.recognitions.length === 0,
        addedOnce: manualTasks.filter(task => task.text === 'Send the revised proposal').length === 1,
      };
    });
    await expectAll('Gemini one-blob fallback', { ...result, noErrors: errors.length === 0 });
    ok('Gemini fallback sends one ephemeral blob, stops media, and adds the task');
    await page.close();
  }

  // A failed transcription leaves no phantom task and gives visible feedback.
  {
    const { page, errors } = await openPage({ local: false, gemini: true, transcribeError: true });
    await pressChord(page);
    await release(page, 'Space');
    await page.waitForFunction(() => document.getElementById('voiceCapturePill')?.dataset.state === 'error');
    const result = await page.evaluate(() => ({
      noTask: manualTasks.length === 0,
      oneRequest: __voiceCaptureTest.requests.length === 1,
      trackStopped: __voiceCaptureTest.streams[0]?.track?.stops === 1,
      honestFeedback: document.querySelector('#voiceCapturePill .vc-label')?.textContent === 'Didn’t catch that',
    }));
    await expectAll('transcription failure', { ...result, noErrors: errors.length === 0 });
    ok('transcription failure is visible and creates no task');
    await page.close();
  }

  // Inputs and key-repeat remain inert; without a local pack or explicit Gemini
  // connection the shortcut explains the gate without opening the microphone.
  {
    const { page, errors } = await openPage({ local: false, gemini: false });
    const result = await page.evaluate(async () => {
      const input = document.getElementById('newTask');
      input.focus();
      document.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'Space', key: ' ', shiftKey: true, bubbles: true,
      }));
      input.blur();
      document.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'Space', key: ' ', shiftKey: true, repeat: true, bubbles: true,
      }));
      await new Promise(resolve => setTimeout(resolve, 20));
      const guarded = document.getElementById('voiceCapturePill').hidden
        && __voiceCaptureTest.getUserMediaCalls === 0;
      document.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'Space', key: ' ', shiftKey: true, bubbles: true,
      }));
      await new Promise(resolve => setTimeout(resolve, 20));
      return {
        guarded,
        unavailable: document.getElementById('voiceCapturePill')?.dataset.state === 'unavailable',
        explanation: document.querySelector('#voiceCapturePill .vc-label')?.textContent === 'Voice needs Gemini',
        noMedia: __voiceCaptureTest.getUserMediaCalls === 0,
        noRecognizer: __voiceCaptureTest.recognitions.length === 0,
        noTask: manualTasks.length === 0,
      };
    });
    await expectAll('guards and unavailable state', { ...result, noErrors: errors.length === 0 });
    ok('input/repeat guards hold; unavailable capture opens no hidden trust boundary');
    await page.close();
  }

  console.log('\nVoice capture tests passed (4 scenarios).');
} finally {
  if (browser) await browser.close();
  server.close();
}
