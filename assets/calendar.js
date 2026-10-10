// 10b foundation. Lazy, device-local credentials and transient primary-calendar
// timing only. No agenda, calendar writes, AI context or recording trigger.
(function initCalendar() {
  'use strict';
  const SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';
  const TOKEN_URL = '/.netlify/functions/calendar-token';
  const PREFIX = 'calendar_';
  const read = key => localStorage.getItem(PREFIX + key) || '';
  const write = (key, value) => localStorage.setItem(PREFIX + key, String(value));
  let epoch = 0, pendingAuth = null, refreshPromise = null, readPromise = null;
  let events = [], lastRead = 0, day = '', state = 'idle', timer = null;

  function dayWindow(now = new Date()) {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  function connectionState() {
    if (!read('refresh_token')) return 'disconnected';
    if (read('token_expired') === '1') return 'expired';
    return state === 'unavailable' ? 'unavailable' : 'connected';
  }
  function render() { Today.use('connections').renderConnections(); }
  function clearEvents() { events = []; lastRead = 0; day = ''; }
  function expire() {
    write('token_expired', '1'); clearEvents(); state = 'idle'; render();
  }
  async function requestToken(body, signal) {
    const response = await fetch(TOKEN_URL, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000) });
    const data = await response.json();
    return { ok: response.ok, data };
  }
  function saveToken(data) {
    if (!data.access_token || !Number.isFinite(data.expires_in) || data.expires_in <= 0) return false;
    if (!data.refresh_token && !read('refresh_token')) return false;
    write('access_token', data.access_token);
    if (data.refresh_token) write('refresh_token', data.refresh_token);
    write('token_expiry', Date.now() + data.expires_in * 1000);
    localStorage.removeItem(PREFIX + 'token_expired');
    return true;
  }
  async function ensureToken(force = false) {
    if (!navigator.onLine || !read('refresh_token') || read('token_expired') === '1') return '';
    if (!force && read('access_token') && Date.now() < Number(read('token_expiry')) - 60000) return read('access_token');
    if (refreshPromise) return refreshPromise;
    const captured = epoch;
    const promise = (async () => {
      try {
        const { ok, data } = await requestToken({ refresh_token: read('refresh_token') });
        if (epoch !== captured) return '';
        if (!ok) {
          if (['invalid_grant', 'unauthorized_client'].includes(data.error)) expire();
          return '';
        }
        return saveToken(data) ? read('access_token') : '';
      } catch { return ''; }
    })();
    refreshPromise = promise;
    try { return await promise; } finally { if (refreshPromise === promise) refreshPromise = null; }
  }
  function safeJoinUrl(value) {
    if (typeof value !== 'string' || value.length > 2048) return null;
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
    catch { return null; }
  }
  function normalize(items, window) {
    return items.flatMap(item => {
      if (!item || item.status === 'cancelled' || item.transparency === 'transparent' ||
          (item.eventType && item.eventType !== 'default') || !item.start?.dateTime || !item.end?.dateTime ||
          item.attendees?.some(a => a.self && a.responseStatus === 'declined')) return [];
      if (![item.start.dateTime, item.end.dateTime].every(value => /(?:Z|[+-]\d{2}:\d{2})$/i.test(value))) return [];
      const start = Date.parse(item.start.dateTime), end = Date.parse(item.end.dateTime);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start ||
          end <= Date.parse(window.start) || start >= Date.parse(window.end)) return [];
      const video = item.conferenceData?.entryPoints?.find(p => p.entryPointType === 'video');
      return [{ start, end, joinUrl: safeJoinUrl(video?.uri) }];
    }).sort((a, b) => a.start - b.start);
  }
  async function refresh(force = false) {
    const window = dayWindow();
    if (day && day !== window.start) clearEvents();
    if (document.hidden || !navigator.onLine || connectionState() === 'disconnected' || connectionState() === 'expired') {
      clearEvents(); return false;
    }
    if (readPromise) return readPromise;
    if (!force && lastRead && Date.now() - lastRead < 300000) return true;
    const captured = epoch;
    const promise = (async () => {
      try {
        let token = await ensureToken();
        if (epoch !== captured) return false;
        if (!token) {
          clearEvents();
          if (read('token_expired') !== '1') { state = 'unavailable'; render(); }
          return false;
        }
        const query = new URLSearchParams({ timeMin: window.start, timeMax: window.end,
          singleEvents: 'true', orderBy: 'startTime', showDeleted: 'false', maxResults: '100', maxAttendees: '1',
          fields: 'nextPageToken,items(status,eventType,start,end,transparency,attendees(self,responseStatus),conferenceData(entryPoints(entryPointType,uri)))' });
        const collected = [];
        let retried401 = false;
        // Complete snapshot or no snapshot. Never silently treat a truncated day as complete.
        for (let page = 0; page < 5; page++) {
          const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?' + query;
          let response = await fetch(url, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(12000), cache: 'no-store' });
          if (response.status === 401 && !retried401) {
            retried401 = true; token = await ensureToken(true);
            if (epoch !== captured) return false;
            if (!token) {
              clearEvents();
              if (read('token_expired') !== '1') { state = 'unavailable'; render(); }
              return false;
            }
            response = await fetch(url, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(12000), cache: 'no-store' });
          }
          if (epoch !== captured) return false;
          if (response.status === 401) { expire(); return false; }
          if (!response.ok) throw new Error('calendar_read_failed');
          const data = await response.json();
          if (epoch !== captured || dayWindow().start !== window.start || document.hidden) return false;
          if (!Array.isArray(data.items)) throw new Error('invalid_calendar_response');
          collected.push(...data.items);
          if (!data.nextPageToken) {
            events = normalize(collected, window); day = window.start; lastRead = Date.now(); state = 'idle'; render(); return true;
          }
          if (typeof data.nextPageToken !== 'string') throw new Error('invalid_calendar_response');
          query.set('pageToken', data.nextPageToken);
        }
        throw new Error('calendar_read_incomplete');
      } catch {
        if (epoch === captured) { clearEvents(); state = 'unavailable'; render(); }
        return false;
      }
    })();
    readPromise = promise;
    try { return await promise; } finally { if (readPromise === promise) readPromise = null; }
  }
  function context() {
    // Fail closed after hide, midnight, disconnect, or an old snapshot.
    if (document.hidden || !navigator.onLine || connectionState() !== 'connected' ||
        day !== dayWindow().start || !lastRead || Date.now() - lastRead > 300000) return [];
    return events.filter(e => e.end > Date.now()).map(e => ({ ...e }));
  }
  function stopAuth() {
    if (!pendingAuth) return;
    pendingAuth.abort.abort(); clearTimeout(pendingAuth.timer);
    window.removeEventListener('message', pendingAuth.listener);
    try { pendingAuth.popup.close(); } catch {}
    pendingAuth = null;
  }
  async function auth(popup) {
    stopAuth(); epoch++; refreshPromise = null; readPromise = null; clearEvents();
    const captured = epoch, abort = new AbortController();
    const attempt = { popup, abort, listener: null, timer: null };
    pendingAuth = attempt;
    attempt.timer = setTimeout(() => { if (pendingAuth === attempt) stopAuth(); }, 300000);
    try {
      const res = await fetch(TOKEN_URL, { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(12000)]), cache: 'no-store' });
      const data = await res.json();
      if (pendingAuth !== attempt || !res.ok) return;
      if (!data.client_id) throw new Error('not_configured');
      const encode = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const verifier = encode(crypto.getRandomValues(new Uint8Array(48)));
      const challenge = encode(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
      const stateValue = encode(crypto.getRandomValues(new Uint8Array(32)));
      const redirect = window.location.origin + '/';
      attempt.listener = async event => {
        if (event.origin !== window.location.origin || event.source !== popup || event.data?.type !== 'oauth_callback') return;
        const params = new URLSearchParams(event.data.search);
        if (params.get('state') !== stateValue || pendingAuth !== attempt) return;
        window.removeEventListener('message', attempt.listener); clearTimeout(attempt.timer);
        if (params.has('error') || !params.get('code')) { stopAuth(); showStatus('Calendar connection not completed.', 'error'); return; }
        try {
          const { ok, data: tokens } = await requestToken({ code: params.get('code'), code_verifier: verifier, redirect_uri: redirect }, abort.signal);
          if (epoch !== captured || pendingAuth !== attempt) return;
          // A new account must bring its own refresh token, never inherit the old account's.
          if (!ok || !tokens.refresh_token || !saveToken(tokens)) throw new Error('exchange_failed');
          pendingAuth = null; state = 'idle'; render();
          showStatus('Google Calendar connected.', 'success');
          init(); await refresh(true);
        } catch {
          if (epoch === captured && pendingAuth === attempt) { stopAuth(); showStatus('Can\'t connect Calendar. Try again.', 'error'); }
        }
      };
      if (pendingAuth !== attempt) return;
      window.addEventListener('message', attempt.listener);
      popup.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
        client_id: data.client_id, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent',
        code_challenge: challenge, code_challenge_method: 'S256', redirect_uri: redirect, state: stateValue,
      });
    } catch {
      if (pendingAuth === attempt) { stopAuth(); showStatus('Calendar is unavailable. Check its Google setup and your connection.', 'error'); }
    }
  }
  function forget() {
    epoch++; stopAuth(); refreshPromise = null; readPromise = null;
    clearEvents(); clearInterval(timer); timer = null; state = 'idle';
    ['access_token', 'refresh_token', 'token_expiry', 'token_expired'].forEach(k => localStorage.removeItem(PREFIX + k));
    render(); showStatus('Google Calendar forgotten.', 'success');
  }
  function init() {
    if (!timer) timer = setInterval(() => { if (!document.hidden) refresh(); }, 60000);
    return refresh();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearEvents(); else if (read('refresh_token')) refresh(); });
  window.addEventListener('online', () => { if (read('refresh_token')) refresh(); });
  window.addEventListener('offline', clearEvents);
  window.addEventListener('focus', () => { if (read('refresh_token')) refresh(); });
  Today.define('calendar', { auth, forget, init, refresh, context, connectionState, dayWindow, normalize });
})();
