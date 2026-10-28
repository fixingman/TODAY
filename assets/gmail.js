// TODAY — Gmail PKCE OAuth, thread search, and focus-session enrichment.
// Inert until index.html calls window._startGmail() before init().
(function() {
  'use strict';
  let started = false;
  window._startGmail = function() {
    if (started) return;
    started = true;

    // Constants.
    const GMAIL_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
    const GMAIL_API_BASE  = 'https://gmail.googleapis.com/gmail/v1/users/me';
    const GMAIL_SCOPE     = 'https://www.googleapis.com/auth/gmail.readonly';
    const GMAIL_DIAGNOSTICS_KEY = 'gmail_diagnostics_v1';
    const GMAIL_OPERATOR_RE = /\b(?:from:|to:|subject:|label:|in:|after:|before:|newer:|older:|is:|has:|filename:)/;
    // Exclude calendar notifications by actual sender.
    const CALENDAR_NOTIFICATION_SENDER = 'calendar-notification@google.com';
    const GMAIL_MATCH_POLICY = 'minisearch-v1';
    const OWNER_POLICY = 'owner-v2';
    const MAIL_AGE = 86400000, DRAFT_WRITER='gmail-draft-v1';
    const _lookups = new Map();
    let _feedbackEpoch = 0;
    const _memoryClear = () => Date.parse(typeof appMemory !== 'undefined' ? appMemory?.clearedAt : '') || 0;
    function _feedbackRecord(entry) {
      const f=entry?.feedback, now=Date.now(), cleared=_memoryClear();
      if (!f || f.policy!==1 || !Number.isFinite(entry.fetchedAt) || !Number.isFinite(f.expiresAt) || f.expiresAt<=now || f.expiresAt>entry.fetchedAt+MAIL_AGE) return null;
      const validAt=at=>Number.isFinite(at)&&at>cleared&&at<=now+60000&&at<f.expiresAt;
      const out={policy:1,expiresAt:f.expiresAt}, c=f.context, w=f.wording;
      if (c && validAt(c.at) && typeof c.hidden==='boolean' && Array.isArray(c.rejectedThreads)
          && c.rejectedThreads.length>0 && c.rejectedThreads.length<=5
          && c.rejectedThreads.every(id=>typeof id==='string'&&id.length>0&&id.length<=128)
          && (!c.hidden || c.rejectedThreads.includes(entry.threadId)))
        out.context={at:c.at,hidden:c.hidden,rejectedThreads:[...new Set(c.rejectedThreads)]};
      if (w && validAt(w.at) && w.writer===DRAFT_WRITER && ['task','device'].includes(w.scope) && ['hard_to_follow','too_formal'].includes(w.concern)
          && typeof w.draftId==='string' && typeof w.sourceId==='string'
          && /^[a-f0-9]{64}$/.test(w.draftId) && /^[a-f0-9]{64}$/.test(w.sourceId))
        out.wording={at:w.at,concern:w.concern,draftId:w.draftId,sourceId:w.sourceId,writer:w.writer,scope:w.scope};
      return out.context||out.wording ? out : null;
    }
    const _hidden = entry => !!_feedbackRecord(entry)?.context?.hidden;
    const _identity = (entry,id) => JSON.stringify([id,entry.taskText,entry.connectionKey,entry.threadId,entry.messageId,
      entry.subject,entry.from,entry.date,entry.snippet,entry.fetchedAt]);
    function _feedbackChanged() {
      _feedbackEpoch++;
      for (const request of _lookups.values()) request.controller.abort();
      _focusView?.draft?.abort();
    }
    function _clearFeedback(wordingOnly=false) {
      _feedbackChanged();
      for (const key of Object.keys(localStorage).filter(k=>k.startsWith('gmail_enrichment_'))) {
        try {
          const entry=JSON.parse(localStorage.getItem(key));
          if (!entry?.feedback) continue;
          if (wordingOnly) { delete entry.feedback.wording; if (!entry.feedback.context) delete entry.feedback; }
          else delete entry.feedback;
          localStorage.setItem(key,JSON.stringify(entry));
        } catch (_) {}
      }
      _feedbackComponent?.cleared();
      _cleanup();
    }
    let _focusView = null, _authEpoch = 0, _connectionEpoch = -1, _connectionToken = '', _connectionKey = '', _connectionPromise;
    const _task = id => manualTasks.find(t => t.id === id);
    const _owner = id => _task(id) || soonTasks.find(t => t.id === id) || pastTasks.find(t => t.id === id);
    const _aiSource = () => JSON.stringify([Today.use('connections')._aiGetProvider(), Today.use('connections')._aiGetKey()]);
    const _source = () => _connectionKey && _gmailIsConnected() && _connectionToken === _refreshToken()
      ? JSON.stringify([_connectionKey, _connectionToken, _authEpoch]) : '';
    async function _ensureConnection() {
      if (!_gmailIsConnected()) return '';
      const token = _refreshToken(), epoch = _authEpoch;
      if (_connectionToken !== token || _connectionEpoch !== epoch) {
        _connectionEpoch = epoch;
        _connectionToken = token; _connectionKey = '';
        _connectionPromise = crypto.subtle.digest('SHA-256', new TextEncoder().encode(location.origin + '\0' + token))
          .then(bytes => {
            if (epoch !== _authEpoch || !_gmailIsConnected() || token !== _refreshToken()) return '';
            return _connectionKey = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
          }).catch(() => '');
      }
      return _connectionKey || await _connectionPromise || '';
    }
    function _current(request) {
      return _lookups.get(request.id) === request && !request.controller.signal.aborted
        && _task(request.id)?.text === request.text && !doneIds.has(request.id)
        && (!request.view || request.view === _focusView) && request.source === _source() && request.ai === _aiSource()
        && request.feedbackEpoch === _feedbackEpoch && request.memoryClear === _memoryClear()
        && request.cache === localStorage.getItem('gmail_enrichment_' + request.id)
        && request.classify === localStorage.getItem('gmail_classify_' + request.id);
    }
    async function _bounded(controller, work) {
      let timer, stop;
      try {
        return await Promise.race([work(), new Promise(resolve => {
          stop = () => resolve(null);
          controller.signal.addEventListener('abort', stop, { once:true });
          timer = setTimeout(() => controller.abort(), 26000);
        })]);
      } finally { clearTimeout(timer); controller.signal.removeEventListener('abort', stop); }
    }
    function _closeFocus() {
      _focusView?.draft?.abort();
      const pending = _focusView && _lookups.get(_focusView.id);
      if (pending?.view === _focusView) pending.controller.abort();
      _focusView = null;
      const block = document.getElementById('focusGmailBlock');
      if (block) { block.hidden = true; block.innerHTML = ''; delete block.dataset.focusTaskId; }
      const ask = document.querySelector('.focus-ai-timer-btn');
      if (ask && !ask.closest('.ai-active') && /draft reply/i.test(ask.textContent)) {
        ask.textContent = '✦︎ ask'; ask.setAttribute('aria-label','Ask for focus help');
        Today.use('task-enrich').refreshShortcut();
      }
    }
    function _viewCurrent(view) {
      return !!view && view === _focusView && (!view.expires || Date.now() < view.expires) && _task(view.id)?.text === view.text && !doneIds.has(view.id)
        && view.source === _source() && view.cache === localStorage.getItem('gmail_enrichment_' + view.id);
    }
    function _cleanup(prune = true) {
      for (const key of Object.keys(localStorage)) {
        if (!/^gmail_(?:enrichment|classify)_/.test(key)) continue;
        const id = key.replace(/^gmail_(?:enrichment|classify)_/, ''), owner = _owner(id);
        try {
          const entry = JSON.parse(localStorage.getItem(key));
          if (!_gmailIsConnected() || entry.ownerPolicy !== OWNER_POLICY
              || (_connectionKey && entry.connectionKey !== _connectionKey)
              || (prune && (!owner || entry.taskText !== owner.text))) localStorage.removeItem(key);
          else if (key.startsWith('gmail_enrichment_') && entry.feedback) {
            const feedback=_feedbackRecord(entry);
            if (JSON.stringify(feedback)!==JSON.stringify(entry.feedback)) {
              if (feedback) entry.feedback=feedback; else delete entry.feedback;
              localStorage.setItem(key,JSON.stringify(entry));
            }
          }
        } catch (_) { localStorage.removeItem(key); }
      }
      _gmailRestoreAllIndicators(prune);
      for (const request of _lookups.values()) if (!_current(request)) request.controller.abort();
      if (_focusView && !_viewCurrent(_focusView)) {
        const entry=_getEnrichment(_focusView.id);
        if (entry && _focusView.identity===_identity(entry,_focusView.id) && _focusView.source===_source()
            && _task(_focusView.id)?.text===_focusView.text && !doneIds.has(_focusView.id)) {
          _focusView.cache=localStorage.getItem('gmail_enrichment_'+_focusView.id);
          _feedbackComponent?.reconcile(entry,_focusView);
        } else _closeFocus();
      }
      if (_focusView && _viewCurrent(_focusView)) _feedbackComponent?.reconcile(_getEnrichment(_focusView.id),_focusView);
    }
    let _miniSearchPromise;
    function _gmailSender(from) {
      const value = String(from || '').trim();
      return (value.match(/<([^<>]+)>\s*$/)?.[1] || value).trim().toLowerCase();
    }
    function _isCalendarNotification(from) {
      return _gmailSender(from) === CALENDAR_NOTIFICATION_SENDER;
    }

    // Transient, lazy local index; no mailbox ingestion or vectors.
    async function _gmailRankCandidates(taskText, candidates) {
      const tokenize = text => String(text || '').normalize('NFKD').replace(/\p{M}/gu, '')
        .toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
      const processTerm = term => term.length > 4 && /[^s]s$/.test(term) ? term.slice(0, -1) : term;
      const booking = _isBookingTask(taskText);
      const ignored = new Set(('a an the my our your i we it this that to of at with in on for about regarding '
        + 'next new another last today tomorrow yesterday week month year morning afternoon evening').split(' '));
      let content = String(taskText || '').replace(new RegExp('^\\s*' + (booking ? BOOKING_RE.source : CONTACT_RE.source), 'i'), '');
      if (booking) content = content.replace(new RegExp(BOOKING_RE.source, 'gi'), ' ');
      // Strip actions, retaining all named person/topic evidence.
      const terms = [...new Set(tokenize(content).filter(t => !ignored.has(t) && !/^\d+$/.test(t)).map(processTerm))];
      if (!terms.length) return { result: null, status: 'weak-match' };
      const provider = booking && String(taskText).match(/\b(?:at|with)\s+(.+)$/i);
      const providerTerms = provider ? tokenize(provider[1]).filter(t => !ignored.has(t) && !/^\d+$/.test(t)).map(processTerm) : [];
      const eligible = candidates.filter(c => {
        if (_isCalendarNotification(c.from)) return false;
        if (!booking) return true;
        if (!/\b(?:confirmation|confirmed|booked|reserved|booking|appointment|reservation)\b/i.test(c.subject + ' ' + c.snippet)) return false;
        // Named booking providers must match the correspondent.
        const senderTerms = tokenize(c.from).map(processTerm);
        return providerTerms.every(t => senderTerms.includes(t));
      }).slice(0, 50);
      if (!eligible.length) return { result: null, status: 'weak-match' };
      let MiniSearch;
      try {
        if (!_miniSearchPromise) _miniSearchPromise = import('./vendor/minisearch-7.2.0.js').catch(error => {
          _miniSearchPromise = null;
          throw error;
        });
        MiniSearch = (await _miniSearchPromise).default;
      } catch(e) { return { result: null, status: 'ranking-unavailable' }; }
      const index = new MiniSearch({ fields: ['subject', 'from', 'snippet'], tokenize, processTerm });
      index.addAll(eligible.map((c, id) => ({ id, subject: c.subject || '', from: c.from || '', snippet: c.snippet || '' })));
      const hits = index.search(terms.join(' '), { combineWith: 'AND', prefix: false, fuzzy: false,
        boost: { subject: 3, from: 2, snippet: 1 } });
      if (!hits.length) return { result: null, status: 'weak-match' };
      hits.sort((a, b) => b.score - a.score || (Date.parse(eligible[b.id].date) || 0) - (Date.parse(eligible[a.id].date) || 0));
      const first = eligible[hits[0].id];
      // Abstain on ambiguous correspondents; scores are not preferences.
      if (booking && !providerTerms.length && hits.some(h => _gmailSender(eligible[h.id].from) !== _gmailSender(first.from)))
        return { result: null, status: 'ambiguous-match' };
      const rival = hits.find(h => eligible[h.id].threadId !== first.threadId && _gmailSender(eligible[h.id].from) !== _gmailSender(first.from));
      if (rival && hits[0].score < rival.score * 1.25) return { result: null, status: 'ambiguous-match' };
      return { result: { ...first, matchPolicy: GMAIL_MATCH_POLICY }, status: 'found' };
    }

    // Keep only twenty local content-free diagnostic records.
    function _gmailNote(taskId, status, source, attempts, reason) {
      try {
        const previous = JSON.parse(localStorage.getItem(GMAIL_DIAGNOSTICS_KEY) || '[]');
        const entries = Array.isArray(previous) ? previous : [];
        entries.push({ taskId, status, source: source || null, reason: reason || null, attempts: attempts || [], at: Date.now() });
        localStorage.setItem(GMAIL_DIAGNOSTICS_KEY, JSON.stringify(entries.slice(-20)));
      } catch(e) {}
    }

    function _gmailObservationAudit() {
      let entries = [];
      try {
        const stored = JSON.parse(localStorage.getItem(GMAIL_DIAGNOSTICS_KEY) || '[]');
        if (Array.isArray(stored)) entries = stored;
      } catch(e) {}
      return { schema: 1, capturedAt: new Date().toISOString(), entries };
    }

    // Stored values.
    let _cachedClientId = null;
    async function _getClientId() {
      if (_cachedClientId) return _cachedClientId;
      try {
        const res = await fetch('/.netlify/functions/gmail-token');
        const data = await res.json();
        _cachedClientId = data.client_id || '';
      } catch(e) { _cachedClientId = ''; }
      return _cachedClientId;
    }
    function _accessToken()  { return localStorage.getItem('gmail_access_token') || ''; }
    function _refreshToken() { return localStorage.getItem('gmail_refresh_token') || ''; }
    function _isExpired()    {
      const exp = parseInt(localStorage.getItem('gmail_token_expiry') || '0');
      return Date.now() >= exp - 60000;
    }

    function _gmailIsConnected() {
      return !!_accessToken() && !!_refreshToken();
    }

    // PKCE helpers.
    function _mkVerifier() {
      const arr = new Uint8Array(48);
      crypto.getRandomValues(arr);
      return btoa(String.fromCharCode(...arr)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
    }
    async function _mkChallenge(v) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
      return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
    }

    // Auth.
    async function _gmailDoAuth() {
      ++_authEpoch; _closeFocus();
      const clientId = await _getClientId();
      if (!clientId) { showStatus('Gmail not configured — set GMAIL_CLIENT_ID in Netlify env vars.', 'error'); return; }

      const popup = window.open('about:blank', 'gmail_auth', 'width=600,height=700,left=200,top=100');

      const verifier    = _mkVerifier();
      const challenge   = await _mkChallenge(verifier);
      const redirectUri = window.location.origin + '/';
      const stateBytes  = new Uint8Array(16);
      crypto.getRandomValues(stateBytes);
      const state = Array.from(stateBytes, b => b.toString(16).padStart(2,'0')).join('');

      sessionStorage.setItem('gml_verifier',     verifier);
      sessionStorage.setItem('gml_redirect_uri', redirectUri);
      sessionStorage.setItem('gml_state',        state);

      const authUrl = GMAIL_AUTH_URL
        + '?client_id='             + encodeURIComponent(clientId)
        + '&response_type=code'
        + '&scope='                 + encodeURIComponent(GMAIL_SCOPE)
        + '&access_type=offline'
        + '&prompt=consent'
        + '&code_challenge='        + encodeURIComponent(challenge)
        + '&code_challenge_method=S256'
        + '&redirect_uri='          + encodeURIComponent(redirectUri)
        + '&state='                 + encodeURIComponent(state);

      if (popup) { popup.location.href = authUrl; }
      else { showStatus('Popup blocked — allow popups for this site.', 'error'); return; }

      // postMessage-based callback — avoids COOP cross-origin popup access
      function onOAuthMessage(event) {
        if (event.origin !== window.location.origin) return;
        if (!event.data || event.data.type !== 'oauth_callback') return;
        window.removeEventListener('message', onOAuthMessage);
        clearTimeout(cleanupTimer);
        const params = new URLSearchParams(event.data.search);
        const code   = params.get('code');
        const ret    = params.get('state');
        const err    = params.get('error_description') || params.get('error');
        if (err)   { showStatus('Google error: ' + err, 'error'); return; }
        if (!code) { showStatus('No auth code — check Client ID and redirect URI.', 'error'); return; }
        if (ret !== sessionStorage.getItem('gml_state')) {
          showStatus('State mismatch — try again.', 'error'); return;
        }
        _gmailExchangeCode(code);
      }
      window.addEventListener('message', onOAuthMessage);

      // Clean up listener if user dismisses the popup without completing auth
      const cleanupTimer = setTimeout(function() {
        window.removeEventListener('message', onOAuthMessage);
      }, 300000); // 5-minute window
    }

    async function _gmailExchangeCode(code) {
      const epoch = ++_authEpoch, previousToken = _refreshToken();
      const verifier    = sessionStorage.getItem('gml_verifier');
      const redirectUri = sessionStorage.getItem('gml_redirect_uri');
      sessionStorage.removeItem('gml_verifier');
      sessionStorage.removeItem('gml_redirect_uri');
      sessionStorage.removeItem('gml_state');

      showStatus('Connecting…', 'success');
      try {
        const res = await fetch('/.netlify/functions/gmail-token', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ code, code_verifier: verifier, redirect_uri: redirectUri }),
        });
        const data = await res.json();
        if (epoch !== _authEpoch || previousToken !== _refreshToken()) return;
        if (!res.ok || data.error) {
          showStatus('Connection failed: ' + (data.error_description || data.error || res.status), 'error');
          return;
        }
        if (!data.access_token || !data.refresh_token) { showStatus('Connection incomplete — reconnect Gmail.', 'error'); return; }
        _closeFocus();
        Object.keys(localStorage).filter(k => /^gmail_(?:enrichment|classify)_/.test(k)).forEach(k => localStorage.removeItem(k));
        localStorage.setItem('gmail_access_token', data.access_token);
        if (data.refresh_token) localStorage.setItem('gmail_refresh_token', data.refresh_token);
        localStorage.setItem('gmail_token_expiry', String(Date.now() + (data.expires_in - 60) * 1000));
        localStorage.removeItem('gmail_token_expired');
        Today.use('connections').renderConnections();
        showStatus('Gmail connected', 'success');
        _connectionToken = ''; await _ensureConnection();
        _gmailRestoreAllIndicators();
      } catch(e) {
        if (epoch === _authEpoch && previousToken === _refreshToken()) showStatus('Can\'t reach Google — check your connection.', 'error');
      }
    }

    async function _gmailRefreshTokens() {
      const rt = _refreshToken(), epoch = _authEpoch;
      if (!rt) return false;
      try {
        const res = await fetch('/.netlify/functions/gmail-token', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ refresh_token: rt }),
        });
        const data = await res.json().catch(() => ({}));
        if (epoch !== _authEpoch || rt !== _refreshToken() || !_gmailIsConnected()) return false;
        if (!data.access_token && !data.error) return false;
        if (!res.ok || data.error) {
          // BUG-115: stop repeated invalid-grant calls; offer Reconnect.
          if (data.error === 'invalid_grant' || data.error === 'unauthorized_client') _gmailMarkExpired();
          return false;
        }
        localStorage.setItem('gmail_access_token', data.access_token);
        localStorage.setItem('gmail_token_expiry', String(Date.now() + (data.expires_in - 60) * 1000));
        return true;
      } catch(e) { return false; }
    }

    function _gmailIsExpired() { return localStorage.getItem('gmail_token_expired') === '1'; }
    function _gmailMarkExpired() {
      if (_gmailIsExpired()) return;
      localStorage.setItem('gmail_token_expired', '1');
      if (typeof _logSyncError === 'function') _logSyncError('Gmail', 'Gmail sign-in expired — reconnect in Connections');
      Today.use('connections').renderConnections();
    }

    function gmailDisconnect() {
      ++_authEpoch; _connectionToken = ''; _connectionKey = ''; _connectionPromise = null;
      for (const request of _lookups.values()) request.controller.abort();
      _closeFocus();
      _cachedClientId = null;
      ['gmail_access_token','gmail_refresh_token','gmail_token_expiry','gmail_client_id','gmail_token_expired']
        .forEach(k => localStorage.removeItem(k));
      Object.keys(localStorage)
        .filter(k => k.startsWith('gmail_enrichment_') || k.startsWith('gmail_classify_'))
        .forEach(k => localStorage.removeItem(k));
      localStorage.removeItem(GMAIL_DIAGNOSTICS_KEY);
      document.querySelectorAll('.gmail-indicator').forEach(el => el.remove());
      Today.use('connections').renderConnections();
      showStatus('Gmail disconnected.', 'success');
    }

    // Gmail API.
    async function _gmailFetch(url, retry, request) {
      if (retry === undefined) retry = true;
      if (request && !_current(request)) return { data:null, status:'stale' };
      if (_gmailIsExpired()) return { data: null, status: 'auth-expired' };
      if (_isExpired()) {
        const ok = await _gmailRefreshTokens();
        if (!ok) return { data: null, status: 'auth-refresh-failed' };
      }
      if (request && !_current(request)) return { data:null, status:'stale' };
      let res;
      try { res = await fetch(url, { signal:request?.controller.signal, headers: { 'Authorization': 'Bearer ' + _accessToken() } }); }
      catch(e) { return { data: null, status: 'network-error' }; }
      if (request && !_current(request)) return { data:null, status:'stale' };
      if (res.status === 401 && retry) {
        const ok = await _gmailRefreshTokens();
        if (!ok) return { data: null, status: 'auth-refresh-failed' };
        return _gmailFetch(url, false, request);
      }
      if (!res.ok) return { data: null, status: 'http-' + res.status };
      try { const data = await res.json(); return request && !_current(request) ? { data:null, status:'stale' } : { data, status:'ok' }; }
      catch(e) { return { data: null, status: 'invalid-json' }; }
    }

    // Booking context is a prior confirmation, without a reply action.
    const BOOKING_RE = /\b(?:re-?book|book|booking|reserve|reservation|appointment|schedule)\b/i;
    const CONTACT_RE = /\b(reply|email|answer|call|contact|follow[\s-]?up|message|write to|respond|ping|reach out|get back to|answer to|send)\b/i;
    function _isBookingTask(taskText) {
      const text = String(taskText || '');
      return BOOKING_RE.test(text) && !CONTACT_RE.test(text);
    }

    // Conservative query for AI failure, false negatives and no-match retries.
    function _buildQueryFallback(taskText) {
      const text = String(taskText || '').replace(/\s+/g, ' ').trim();
      if (!text) return '';
      const quote = value => value.includes(' ') ? ('"' + value.replace(/"/g, '') + '"') : value;

      // A booking task: the service words, among booking/confirmation emails.
      if (_isBookingTask(text)) {
        const service = text.replace(new RegExp(BOOKING_RE.source, 'gi'), '')
          .replace(/\b(?:a|an|the|my|for|next|new|another)\b/gi, ' ').replace(/\s+/g, ' ').trim();
        const kinds = '{subject:booking subject:confirmation subject:appointment subject:reservation subject:booked}';
        return service ? (kinds + ' ' + quote(service)) : '';
      }

      // Topic follow-ups search subject/Sent, never an invented person (BUG-091).
      const topicMatch = text.match(/\b(?:follow[\s-]?up|check\s+in)\s+(?:on|about)\s+(.+)$/i);
      if (topicMatch) {
        const sent = /\b(?:i|we)\s+(?:sent|shared)\b|\bour\b/i.test(topicMatch[1]);
        const topic = topicMatch[1]
          .replace(/\b(?:i|we)\s+(?:sent|shared)(?:\s+(?:last|this))?\s+(?:week|month|year)?\s*$/i, '')
          .replace(/\b(?:last|this)\s+(?:week|month|year)\s*$/i, '')
          .replace(/^the\s+/i, '').trim();
        if (topic) return sent ? (quote(topic) + ' in:sent') : ('subject:' + quote(topic));
      }

      // Only explicit recipient cues split person/topic; preserve organization names.
      const personMatch = text.match(/\b(?:email|reply|respond|answer|write|get\s+back|call|contact|message|ping)\s+to\s+(.+?)(?=\s+for\b)/i)
        || text.match(/\bfollow[\s-]?up\s+with\s+(.+?)(?=\s+for\b)/i)
        || text.match(/\b(?:reply|respond|answer|write|get\s+back)\s+to\s+(.+?)(?=\s+(?:about|regarding|on)\b|$)/i)
        || text.match(/\bfollow[\s-]?up\s+with\s+(.+?)(?=\s+(?:about|regarding|on)\b|$)/i)
        || text.match(/\b(?:email|call|contact|message|ping)\s+(?:to\s+)?(.+?)(?=\s+(?:about|regarding|on)\b|$)/i)
        || text.match(/\breach\s+out\s+to\s+(.+?)(?=\s+(?:about|regarding|on)\b|$)/i);
      if (personMatch && personMatch[1].trim()) {
        const q = quote(personMatch[1].trim());
        const rest = text.slice(personMatch.index + personMatch[0].length);
        const topicMatch = rest.match(/^\s+(?:about|regarding|on|for)\s+(.+)$/i);
        const topic = topicMatch?.[1].replace(/^the\s+/i, '').trim();
        if (topic) return '{from:' + q + ' to:' + q + '} ' + quote(topic);
        return 'from:' + q + ' OR to:' + q;
      }

      // Without a trustworthy addressee, use a subject query.
      const topic = text
        .replace(/\b(reply|email|answer|call|contact|follow[\s-]?up|message|write\s+to|respond|ping|reach\s+out|get\s+back\s+to|answer\s+to|send)\b/gi, '')
        .replace(/^\s*(to|with|for|about|on)\s+/i, '')
        .replace(/^the\s+/i, '').trim();
      return topic ? ('subject:' + quote(topic)) : '';
    }

    // AI-backed classification — returns { isComm, searchQuery }.
    async function _classifyTask(taskId, taskText, request) {
      const hasVerb = CONTACT_RE.test(taskText) || BOOKING_RE.test(taskText);
      if (!hasVerb) return { isComm: false, searchQuery: '', source: 'pre-filter' };

      try {
        const raw = localStorage.getItem('gmail_classify_' + taskId);
        if (raw) {
          const hit = JSON.parse(raw);
          // Require operators and current owner/grant/policy.
          const hasOp = !hit.searchQuery || GMAIL_OPERATOR_RE.test(hit.searchQuery);
          // Only validated AI classifications persist; fallbacks retry.
          if (hit.ownerPolicy === OWNER_POLICY && hit.connectionKey === _connectionKey && hit.taskText === taskText
              && typeof hit.isComm === 'boolean' && hasOp && hit.source === 'ai') {
            // Reclassify explicit-email false negatives.
            if (hit.isComm || !/^\s*(?:email|reply|respond|write\s+to)\b/i.test(taskText)) return hit;
          }
          // Old format or explicit-email false negative — retry classification.
          try { localStorage.removeItem('gmail_classify_' + taskId); } catch(e) {}
          request.classify = localStorage.getItem('gmail_classify_' + taskId);
        }
      } catch(e) {}

      let failure = 'ai-unavailable';
      try {
        const connections = Today.use('connections');
        const provider = connections._aiGetProvider();
        const apiKey   = connections._aiGetKey();
        const res = await fetch('/.netlify/functions/ai-assist', {
          method:  'POST', signal:request.controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider,
            apiKey,
            systemPrompt: 'Return ONLY valid JSON: {"isComm":true,"searchQuery":"gmail_query"}. isComm=true when the task explicitly says email, or involves contacting, replying, or following up by email. Build the query from what the task actually names. In "email to NAME for TOPIC", NAME is the correspondent and TOPIC is the subject matter; never include "for TOPIC" in the contact name. Person-targeted: use from:/to: plus topic terms when useful. Topic-targeted: use subject:, quoted keywords, in:sent, and date operators such as after: when useful; never invent a person. A task to book, reserve, or schedule a service counts too: the useful thread is the previous booking or confirmation for that service, so search booking and confirmation emails for the service words; never invent a business name. Include at least one Gmail operator. If no useful email search is possible, set isComm=false and searchQuery to "".',
            messages:     [{ role: 'user', content: taskText }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (!_current(request)) return { isComm:false };
          if (typeof data.isComm === 'boolean' && typeof data.searchQuery === 'string') {
            const fallback = _buildQueryFallback(taskText);
            // Explicit email intent retains its conservative fallback.
            if ((!data.isComm || !data.searchQuery.trim()) && /^\s*(?:email|reply|respond|write\s+to)\b/i.test(taskText) && fallback) {
              return { isComm: true, searchQuery: fallback, source: 'fallback', failure: 'ai-declined-email' };
            }
            if (data.isComm && !GMAIL_OPERATOR_RE.test(data.searchQuery)) {
              return { isComm: true, searchQuery: fallback, source: 'fallback', failure: 'ai-invalid-query' };
            }
            const hit = { isComm: data.isComm, searchQuery: data.searchQuery, source: 'ai', taskText,
              ownerPolicy:OWNER_POLICY, connectionKey:_connectionKey };
            try { localStorage.setItem('gmail_classify_' + taskId, JSON.stringify(hit)); request.classify = localStorage.getItem('gmail_classify_' + taskId); } catch(e) {}
            return hit;
          }
          failure = 'ai-invalid-response';
        } else {
          failure = 'ai-http-' + res.status;
        }
      } catch(e) { failure = 'ai-network-or-parse'; }

      // Not cached: a failed classification should be retried, not kept.
      return { isComm: true, searchQuery: _buildQueryFallback(taskText), source: 'fallback', failure };
    }

    async function _gmailSearch(searchQuery, taskText, request) {
      if (!searchQuery || searchQuery.length < 2) return { result: null, status: 'no-query' };

      const list = await _gmailFetch(
        // Group the original query so the exclusion applies to every OR branch.
        GMAIL_API_BASE + '/threads?q=' + encodeURIComponent('(' + searchQuery + ') -from:' + CALENDAR_NOTIFICATION_SENDER) + '&maxResults=5', true, request
      );
      if (!list.data) return { result: null, status: list.status };
      if (!list.data.threads || !list.data.threads.length) return { result: null, status: 'no-thread' };

      let excluded = false;
      const candidates = [];
      for (const candidate of list.data.threads.slice(0, 5)) {
        const threadId = candidate.id;
        const thread = await _gmailFetch(
          GMAIL_API_BASE + '/threads/' + threadId
          + '?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=Message-ID', true, request
        );
        if (!thread.data) return { result: null, status: thread.status };
        const messages = (thread.data.messages || []).slice(-10);
        // Filter notifications again inside each returned conversation.
        for (let i = messages.length - 1; i >= 0; i--) {
          const message = messages[i];
          const headers = (message.payload && message.payload.headers) || [];
          const hdr = (name) => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';
          if (_isCalendarNotification(hdr('From'))) { excluded = true; continue; }
          candidates.push({
            threadId,
            subject: hdr('Subject'),
            from:    hdr('From'),
            date:    hdr('Date'),
            // Opens the selected non-calendar message, not the thread's reminder.
            messageId: hdr('Message-ID').trim().replace(/^<|>$/g, ''),
            snippet: message.snippet || '',
          });
        }
      }
      if (!candidates.length) return { result: null, status: excluded ? 'excluded-calendar' : 'no-messages' };
      return _gmailRankCandidates(taskText, candidates.filter(c=>!request.rejected?.includes(c.threadId)));
    }

    // Enrichment.
    function _getEnrichment(taskId, taskText, prune = true) {
      if (_gmailIsConnected() && (!_connectionKey || _connectionToken !== _refreshToken())) return null;
      try {
        const raw = localStorage.getItem('gmail_enrichment_' + taskId);
        const cached = raw ? JSON.parse(raw) : null;
        const owner = _owner(taskId);
        if (cached && !owner && prune) { localStorage.removeItem('gmail_enrichment_'+taskId); return null; }
        if (cached && ((owner && cached.taskText !== owner.text) || !_gmailIsConnected()
            || cached.ownerPolicy !== OWNER_POLICY || cached.connectionKey !== _connectionKey
            || !Number.isFinite(cached.fetchedAt) || Date.now() - cached.fetchedAt > 86400000
            || cached.fetchedAt > Date.now() + 60000 || _isCalendarNotification(cached.from)
            || cached.matchPolicy !== GMAIL_MATCH_POLICY
            || (taskText && cached.taskText !== taskText))) {
          if (prune) localStorage.removeItem('gmail_enrichment_' + taskId);
          return null;
        }
        return owner ? cached : null;
      } catch(e) { return null; }
    }

    async function _gmailFindThread(taskId, taskText, request) {
      const classification = await _classifyTask(taskId, taskText, request);
      if (!_current(request)) return null;
      if (!classification.isComm) {
        if (classification.source !== 'pre-filter') _gmailNote(taskId, 'not-communication', classification.source, []);
        return null;
      }

      const attempts = [];
      let searchQuery = classification.searchQuery;
      let searched = await _gmailSearch(searchQuery, taskText, request);
      attempts.push({ path: classification.source === 'fallback' ? 'fallback' : 'ai', status: searched.status });

      // Retry only genuine no-match with a grounded fallback, never transport/auth errors.
      if (!searched.result && (searched.status === 'no-thread' || searched.status === 'no-query') && classification.source === 'ai') {
        const fallback = _buildQueryFallback(taskText);
        if (fallback && fallback !== searchQuery) {
          searchQuery = fallback;
          searched = await _gmailSearch(searchQuery, taskText, request);
          attempts.push({ path: 'fallback', status: searched.status });
        }
      }

      if (!_current(request)) return null;
      _gmailNote(taskId, searched.result ? 'found' : searched.status, classification.source, attempts, classification.failure);
      return searched.result ? { result: searched.result, searchQuery } : null;
    }

    async function _gmailEnrichTask(taskId, taskText, view, alternative) {
      if (_task(taskId)?.text !== taskText || doneIds.has(taskId)) return null;
      if (!_gmailIsConnected()) {
        if (CONTACT_RE.test(taskText)) _gmailNote(taskId, 'gmail-disconnected', null, []);
        return null;
      }
      const token = _refreshToken(), epoch = _authEpoch;
      if (!await _ensureConnection() || token !== _refreshToken() || epoch !== _authEpoch || _task(taskId)?.text !== taskText || doneIds.has(taskId)) return null;
      if (view && view !== _focusView) return null;
      if (view) view.source = _source();
      const cached = _getEnrichment(taskId, taskText);
      if (cached && !alternative) return cached;
      if (alternative && (!cached || !view || !_viewCurrent(view) || !_hidden(cached))) return null;
      const prior = _lookups.get(taskId);
      if (prior && _current(prior)) return prior.promise;
      prior?.controller.abort();
      const request = { id:taskId, text:taskText, view, source:_source(), ai:_aiSource(), controller:new AbortController(),
        feedbackEpoch:_feedbackEpoch,memoryClear:_memoryClear(),rejected:alternative ? _feedbackRecord(cached)?.context?.rejectedThreads : [],
        cache:localStorage.getItem('gmail_enrichment_' + taskId), classify:localStorage.getItem('gmail_classify_' + taskId) };
      _lookups.set(taskId, request);
      request.promise = _bounded(request.controller, async () => {
        const found = alternative ? await (async () => {
          const query=cached.searchQuery||_buildQueryFallback(taskText);
          const searched=await _gmailSearch(query,taskText,request);
          if (!_current(request)) return null;
          _gmailNote(taskId,searched.result?'found':searched.status,'feedback',[{path:'same-query',status:searched.status}]);
          return searched.result ? {result:searched.result,searchQuery:query} : null;
        })() : await _gmailFindThread(taskId, taskText, request);
        if (!found || !_current(request)) return null;
        const data = { ...found.result, taskText, searchQuery:found.searchQuery, fetchedAt:Date.now(),
          ownerPolicy:OWNER_POLICY, connectionKey:_connectionKey };
        if (alternative && _feedbackRecord(cached)?.context) data.feedback={policy:1,expiresAt:cached.feedback.expiresAt,
          context:{...cached.feedback.context,hidden:false}};
        try { localStorage.setItem('gmail_enrichment_' + taskId, JSON.stringify(data)); } catch (_) { return null; }
        _gmailUpdateIndicator(taskId, true);
        return data;
      }).catch(() => null).finally(() => {
        if (_lookups.get(taskId) === request) _lookups.delete(taskId);
      });
      return request.promise;
    }

    // Task row indicator.
    function _gmailUpdateIndicator(taskId, fresh, prune = true) {
      const taskEl = document.querySelector('.task[data-taskid="' + CSS.escape(taskId) + '"]');
      if (!taskEl) return;
      taskEl.querySelector('.gmail-indicator')?.remove();
      const enrichment = _getEnrichment(taskId, undefined, prune);
      if (!_task(taskId) || doneIds.has(taskId) || !enrichment || _hidden(enrichment) || !_gmailIsConnected()) return;

      const span = document.createElement('span');
      span.className = 'gmail-indicator';
      span.textContent = '↩';
      span.setAttribute('aria-label', 'Email context available — start a focus session');
      const textEl = taskEl.querySelector('.task-text');
      const tail   = textEl && textEl.querySelector('.task-tail');
      if (tail) textEl.insertBefore(span, tail);
      else if (textEl) textEl.appendChild(span);
      if (fresh) _playEnrichmentArrival(span);
    }

    function _gmailRestoreAllIndicators(prune = true) {
      document.querySelectorAll('.gmail-indicator').forEach(el => el.remove());
      Object.keys(localStorage)
        .filter(k => k.startsWith('gmail_enrichment_'))
        .forEach(k => _gmailUpdateIndicator(k.replace('gmail_enrichment_', ''), false, prune));
    }

    // Focus block.
    let _feedbackComponent, _feedbackLoading;
    function _feedback() {
      return _feedbackLoading ||= import('/assets/gmail-feedback.js').then(() =>
        _feedbackComponent = Today.use('gmail-feedback').create({view:()=>_focusView,current:_viewCurrent,
          writer:DRAFT_WRITER,booking:_isBookingTask,query:_buildQueryFallback,ai:_aiSource,bounded:_bounded,close:_closeFocus,
          record:_feedbackRecord,identity:_identity,get:_getEnrichment,changed:_feedbackChanged,
          epoch:()=>_feedbackEpoch,memoryClear:_memoryClear,indicator:_gmailUpdateIndicator,
          entries:()=>Object.keys(localStorage).filter(k=>k.startsWith('gmail_enrichment_'))
            .map(k=>({id:k.slice(17),entry:_getEnrichment(k.slice(17),undefined,false)})).filter(row=>row.entry),
          alternative:(view)=>_gmailEnrichTask(view.id,view.text,view,true)}))
        .catch(error => { _feedbackLoading=null; throw error; });
    }
    function _doRenderBlock(block,text,entry) {
      const view=_focusView;
      view.identity=_identity(entry,view.id);
      if (_feedbackComponent) _feedbackComponent.render(block,text,entry);
      else _feedback().then(help => { if (_viewCurrent(view)) help.render(block,text,entry); }).catch(()=>{});
    }

    function _gmailRenderFocusBlock(taskId, taskText) {
      const block = document.getElementById('focusGmailBlock');
      if (_focusView?.id === taskId && _focusView.text === taskText && _viewCurrent(_focusView) && (!block?.hidden || _lookups.has(taskId))) return;
      _closeFocus();
      if (!block || !_gmailIsConnected() || _task(taskId)?.text !== taskText || doneIds.has(taskId)) return;
      const view = { id:taskId, text:taskText, source:_source(), cache:localStorage.getItem('gmail_enrichment_' + taskId) };
      _focusView = view; block.dataset.focusTaskId = taskId;
      const cached = _connectionKey && _getEnrichment(taskId, taskText);
      view.cache = localStorage.getItem('gmail_enrichment_' + taskId);
      if (cached && _viewCurrent(view)) { _doRenderBlock(block, taskText, cached); return; }
      _gmailEnrichTask(taskId, taskText, view).then(data => {
        if (!data || view !== _focusView || _task(taskId)?.text !== taskText || doneIds.has(taskId)) return;
        view.source = view.source || _source();
        view.cache = JSON.stringify(data);
        if (_viewCurrent(view)) _doRenderBlock(block, taskText, data);
      });
    }

    // Message links also use same-context Mail navigation.
    if (window.Today) Today.ui.register('click', 'gmail.open-mail', (ev, link) => {
      ev.preventDefault();
      if (_viewCurrent(_focusView)) window.location.href = link.href;
    });

    // Exports.
    window.gmailAuth                    = _gmailDoAuth;
    window.gmailDisconnect              = gmailDisconnect;
    window._gmailIsConnected            = _gmailIsConnected;
    window._gmailEnrichTask             = _gmailEnrichTask;
    window._gmailRenderFocusBlock       = _gmailRenderFocusBlock;
    window._gmailRestoreAllIndicators   = _gmailRestoreAllIndicators;
    window._gmailUpdateIndicator        = _gmailUpdateIndicator;
    window._gmailBuildQueryFallback     = _buildQueryFallback;
    Today.define('gmail', { observationAudit:_gmailObservationAudit, rankCandidates:_gmailRankCandidates,
      closeFocus:_closeFocus, cleanup:_cleanup,clearFeedback:_clearFeedback });
    window.addEventListener('storage', event => {
      if (event.key === null || /^gmail_(?:access_token|refresh_token)$/.test(event.key || '')) {
        if (!_gmailIsConnected() || _connectionToken !== _refreshToken()) {
          _closeFocus(); for (const request of _lookups.values()) request.controller.abort();
          _ensureConnection().then(() => _cleanup(false));
        }
      } else if (/^gmail_(?:enrichment|classify)_/.test(event.key || '')) { _feedbackChanged(); _cleanup(false); }
    });
    _ensureConnection().then(_gmailRestoreAllIndicators);
  };
})();
