// TODAY — Gmail PKCE OAuth, thread search, and focus-session enrichment.
// Inert until index.html calls window._startGmail() before init().
(function() {
  'use strict';
  let started = false;
  window._startGmail = function() {
    if (started) return;
    started = true;

    // ── Constants ─────────────────────────────────────────────────────────────
    const GMAIL_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
    const GMAIL_API_BASE  = 'https://gmail.googleapis.com/gmail/v1/users/me';
    const GMAIL_SCOPE     = 'https://www.googleapis.com/auth/gmail.readonly';
    const GMAIL_DIAGNOSTICS_KEY = 'gmail_diagnostics_v1';
    const GMAIL_OPERATOR_RE = /\b(?:from:|to:|subject:|label:|in:|after:|before:|newer:|older:|is:|has:|filename:)/;

    // Local, bounded and deliberately content-free: a deleted task can still be
    // diagnosed without retaining its text, Gmail query, message or credentials.
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

    // ── Stored values ─────────────────────────────────────────────────────────
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

    // ── PKCE helpers ───────────────────────────────────────────────────────────
    function _mkVerifier() {
      const arr = new Uint8Array(48);
      crypto.getRandomValues(arr);
      return btoa(String.fromCharCode(...arr)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
    }
    async function _mkChallenge(v) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
      return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
    }

    // ── Auth ───────────────────────────────────────────────────────────────────
    async function _gmailDoAuth() {
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
        if (!res.ok || data.error) {
          showStatus('Connection failed: ' + (data.error_description || data.error || res.status), 'error');
          return;
        }
        localStorage.setItem('gmail_access_token', data.access_token);
        if (data.refresh_token) localStorage.setItem('gmail_refresh_token', data.refresh_token);
        localStorage.setItem('gmail_token_expiry', String(Date.now() + (data.expires_in - 60) * 1000));
        Today.use('connections').renderConnections();
        showStatus('Gmail connected', 'success');
        _gmailRestoreAllIndicators();
      } catch(e) {
        showStatus('Can\'t reach Google — check your connection.', 'error');
      }
    }

    async function _gmailRefreshTokens() {
      const rt = _refreshToken();
      if (!rt) return false;
      try {
        const res = await fetch('/.netlify/functions/gmail-token', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ refresh_token: rt }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return false;
        localStorage.setItem('gmail_access_token', data.access_token);
        localStorage.setItem('gmail_token_expiry', String(Date.now() + (data.expires_in - 60) * 1000));
        return true;
      } catch(e) { return false; }
    }

    function gmailDisconnect() {
      _cachedClientId = null;
      ['gmail_access_token','gmail_refresh_token','gmail_token_expiry','gmail_client_id']
        .forEach(k => localStorage.removeItem(k));
      Object.keys(localStorage)
        .filter(k => k.startsWith('gmail_enrichment_') || k.startsWith('gmail_classify_'))
        .forEach(k => localStorage.removeItem(k));
      localStorage.removeItem(GMAIL_DIAGNOSTICS_KEY);
      document.querySelectorAll('.gmail-indicator').forEach(el => el.remove());
      Today.use('connections').renderConnections();
      showStatus('Gmail disconnected.', 'success');
    }

    // ── Gmail API ──────────────────────────────────────────────────────────────
    async function _gmailFetch(url, retry) {
      if (retry === undefined) retry = true;
      if (_isExpired()) {
        const ok = await _gmailRefreshTokens();
        if (!ok) return { data: null, status: 'auth-refresh-failed' };
      }
      let res;
      try { res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + _accessToken() } }); }
      catch(e) { return { data: null, status: 'network-error' }; }
      if (res.status === 401 && retry) {
        const ok = await _gmailRefreshTokens();
        if (!ok) return { data: null, status: 'auth-refresh-failed' };
        return _gmailFetch(url, false);
      }
      if (!res.ok) return { data: null, status: 'http-' + res.status };
      try { return { data: await res.json(), status: 'ok' }; }
      catch(e) { return { data: null, status: 'invalid-json' }; }
    }

    // Conservative query for AI failure, false negatives and no-match retries.
    function _buildQueryFallback(taskText) {
      const text = String(taskText || '').replace(/\s+/g, ' ').trim();
      if (!text) return '';
      const quote = value => value.includes(' ') ? ('"' + value.replace(/"/g, '') + '"') : value;

      // "Follow up on/about …" names a subject, not a correspondent. Keep the
      // useful noun phrase and, when the task refers to something we sent, search
      // Sent rather than inventing a person from the remaining words (BUG-091).
      const topicMatch = text.match(/\b(?:follow[\s-]?up|check\s+in)\s+(?:on|about)\s+(.+)$/i);
      if (topicMatch) {
        const sent = /\b(?:i|we)\s+(?:sent|shared)\b|\bour\b/i.test(topicMatch[1]);
        const topic = topicMatch[1]
          .replace(/\b(?:i|we)\s+(?:sent|shared)(?:\s+(?:last|this))?\s+(?:week|month|year)?\s*$/i, '')
          .replace(/\b(?:last|this)\s+(?:week|month|year)\s*$/i, '')
          .replace(/^the\s+/i, '').trim();
        if (topic) return sent ? (quote(topic) + ' in:sent') : ('subject:' + quote(topic));
      }

      // Explicit addressee forms are safe to express as from:/to:. "For …"
      // introduces a topic after an explicit "to"/"with" recipient; without
      // that cue it can be part of an organisation's name ("Center for …").
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

      // A communication verb without a trustworthy addressee is still better as
      // a subject query than as from:"the whole task".
      const topic = text
        .replace(/\b(reply|email|answer|call|contact|follow[\s-]?up|message|write\s+to|respond|ping|reach\s+out|get\s+back\s+to|answer\s+to|send)\b/gi, '')
        .replace(/^\s*(to|with|for|about|on)\s+/i, '')
        .replace(/^the\s+/i, '').trim();
      return topic ? ('subject:' + quote(topic)) : '';
    }

    // AI-backed classification — returns { isComm, searchQuery }.
    // Fast verb pre-filter avoids the AI call for clearly non-comm tasks.
    // Falls back to the conservative query when AI is unavailable or invalid;
    // _gmailFindThread records the outcome without retaining email content.
    async function _classifyTask(taskId, taskText) {
      const hasVerb = /\b(reply|email|answer|call|contact|follow[\s-]?up|message|write to|respond|ping|reach out|get back to|answer to|send)\b/i.test(taskText);
      if (!hasVerb) return { isComm: false, searchQuery: '', source: 'pre-filter' };

      try {
        const raw = localStorage.getItem('gmail_classify_' + taskId);
        if (raw) {
          const hit = JSON.parse(raw);
          // Invalidate old-format cache entries (plain name, no from:/to: operators)
          // so existing wrong matches get re-queried with the correct Gmail operators.
          const hasOp = !hit.searchQuery || GMAIL_OPERATOR_RE.test(hit.searchQuery);
          // Before v2.90.52 the classifier never reached the AI (stale global guard) and
          // cached its regex fallback; only AI-sourced entries are trusted.
          if (typeof hit.isComm === 'boolean' && hasOp && hit.source === 'ai') {
            // Old AI false negatives must not suppress an explicit email task
            // forever; reclassify under the clarified prompt below.
            if (hit.isComm || !/^\s*(?:email|reply|respond|write\s+to)\b/i.test(taskText)) return hit;
          }
          // Old format or explicit-email false negative — retry classification.
          try { localStorage.removeItem('gmail_classify_' + taskId); } catch(e) {}
          try { localStorage.removeItem('gmail_enrichment_' + taskId); } catch(e) {}
        }
      } catch(e) {}

      let failure = 'ai-unavailable';
      try {
        const connections = Today.use('connections');
        const provider = connections._aiGetProvider();
        const apiKey   = connections._aiGetKey();
        const res = await fetch('/.netlify/functions/ai-assist', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider,
            apiKey,
            systemPrompt: 'Return ONLY valid JSON: {"isComm":true,"searchQuery":"gmail_query"}. isComm=true when the task explicitly says email, or involves contacting, replying, or following up by email. Build the query from what the task actually names. In "email to NAME for TOPIC", NAME is the correspondent and TOPIC is the subject matter; never include "for TOPIC" in the contact name. Person-targeted: use from:/to: plus topic terms when useful. Topic-targeted: use subject:, quoted keywords, in:sent, and date operators such as after: when useful; never invent a person. Include at least one Gmail operator. If no useful email search is possible, set isComm=false and searchQuery to "".',
            messages:     [{ role: 'user', content: taskText }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.isComm === 'boolean' && typeof data.searchQuery === 'string') {
            const fallback = _buildQueryFallback(taskText);
            // An explicit email task should not silently vanish because the AI
            // declined it or supplied a blank query.
            if ((!data.isComm || !data.searchQuery.trim()) && /^\s*(?:email|reply|respond|write\s+to)\b/i.test(taskText) && fallback) {
              return { isComm: true, searchQuery: fallback, source: 'fallback', failure: 'ai-declined-email' };
            }
            if (data.isComm && !GMAIL_OPERATOR_RE.test(data.searchQuery)) {
              return { isComm: true, searchQuery: fallback, source: 'fallback', failure: 'ai-invalid-query' };
            }
            const hit = { isComm: data.isComm, searchQuery: data.searchQuery, source: 'ai' };
            try { localStorage.setItem('gmail_classify_' + taskId, JSON.stringify(hit)); } catch(e) {}
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

    async function _gmailSearch(searchQuery) {
      if (!searchQuery || searchQuery.length < 2) return { result: null, status: 'no-query' };

      const list = await _gmailFetch(
        GMAIL_API_BASE + '/threads?q=' + encodeURIComponent(searchQuery) + '&maxResults=1'
      );
      if (!list.data) return { result: null, status: list.status };
      if (!list.data.threads || !list.data.threads.length) return { result: null, status: 'no-thread' };

      const threadId = list.data.threads[0].id;
      const thread = await _gmailFetch(
        GMAIL_API_BASE + '/threads/' + threadId
          + '?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date'
      );
      if (!thread.data) return { result: null, status: thread.status };
      if (!thread.data.messages || !thread.data.messages.length) return { result: null, status: 'no-messages' };

      const lastMsg = thread.data.messages[thread.data.messages.length - 1];
      const headers = (lastMsg.payload && lastMsg.payload.headers) || [];
      const hdr = (name) => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';

      return { status: 'found', result: {
        threadId,
        subject: hdr('Subject'),
        from:    hdr('From'),
        date:    hdr('Date'),
        snippet: lastMsg.snippet || '',
      } };
    }

    // ── Enrichment ─────────────────────────────────────────────────────────────
    function _getEnrichment(taskId) {
      try {
        const raw = localStorage.getItem('gmail_enrichment_' + taskId);
        return raw ? JSON.parse(raw) : null;
      } catch(e) { return null; }
    }

    async function _gmailFindThread(taskId, taskText) {
      const classification = await _classifyTask(taskId, taskText);
      if (!classification.isComm) {
        if (classification.source !== 'pre-filter') _gmailNote(taskId, 'not-communication', classification.source, []);
        return null;
      }

      const attempts = [];
      let searchQuery = classification.searchQuery;
      let searched = await _gmailSearch(searchQuery);
      attempts.push({ path: classification.source === 'fallback' ? 'fallback' : 'ai', status: searched.status });

      // A syntactically valid AI query can still be too narrow. Only retry a
      // genuine no-match, never an auth/network/API failure; the fallback keeps
      // the named person and topic rather than broadening to an unrelated thread.
      if (!searched.result && (searched.status === 'no-thread' || searched.status === 'no-query') && classification.source === 'ai') {
        const fallback = _buildQueryFallback(taskText);
        if (fallback && fallback !== searchQuery) {
          searchQuery = fallback;
          searched = await _gmailSearch(searchQuery);
          attempts.push({ path: 'fallback', status: searched.status });
        }
      }

      _gmailNote(taskId, searched.result ? 'found' : searched.status, classification.source, attempts, classification.failure);
      return searched.result ? { result: searched.result, searchQuery } : null;
    }

    async function _gmailEnrichTask(taskId, taskText) {
      if (!_gmailIsConnected()) {
        if (/\b(?:email|reply|respond|follow[\s-]?up|write\s+to|message)\b/i.test(taskText))
          _gmailNote(taskId, 'gmail-disconnected', null, []);
        return;
      }

      const cached = _getEnrichment(taskId);
      if (cached && (Date.now() - cached.fetchedAt) < 86400000) return;

      const found = await _gmailFindThread(taskId, taskText);
      if (!found) return;

      localStorage.setItem('gmail_enrichment_' + taskId, JSON.stringify({
        ...found.result, taskText, searchQuery: found.searchQuery, fetchedAt: Date.now(),
      }));
      _gmailUpdateIndicator(taskId, true);
    }

    // ── Task row indicator ─────────────────────────────────────────────────────
    function _gmailUpdateIndicator(taskId, fresh) {
      const taskEl = document.querySelector('.task[data-taskid="' + CSS.escape(taskId) + '"]');
      if (!taskEl) return;
      taskEl.querySelector('.gmail-indicator')?.remove();
      if (!_getEnrichment(taskId) || !_gmailIsConnected()) return;

      const span = document.createElement('span');
      span.className = fresh ? 'gmail-indicator agent-indicator-arrive' : 'gmail-indicator';
      span.textContent = '↩';
      span.setAttribute('aria-label', 'Email context available — start a focus session');
      const textEl = taskEl.querySelector('.task-text');
      const tail   = textEl && textEl.querySelector('.task-tail');
      if (tail) textEl.insertBefore(span, tail);
      else if (textEl) textEl.appendChild(span);
    }

    function _gmailRestoreAllIndicators() {
      Object.keys(localStorage)
        .filter(k => k.startsWith('gmail_enrichment_'))
        .forEach(k => _gmailUpdateIndicator(k.replace('gmail_enrichment_', '')));
    }

    // ── Focus block ─────────────────────────────────────────────────────────────
    function _doRenderBlock(block, taskText, enrichment) {
      const fromRaw  = enrichment.from || '';
      const fromName = fromRaw.replace(/<[^>]+>/g, '').replace(/"/g, '').trim();
      const _emailM  = fromRaw.match(/<([^>]+@[^>]+)>/);
      block.dataset.fromEmail = _emailM ? _emailM[1] : (fromRaw.includes('@') ? fromRaw.trim() : '');
      block.dataset.subject   = enrichment.subject || '';
      const dateStr  = enrichment.date
        ? (function() {
            try { return new Date(enrichment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
            catch(e) { return ''; }
          })()
        : '';
      const snippet  = (enrichment.snippet || '')
        .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c))
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .slice(0, 200);
      const searchQ  = encodeURIComponent(enrichment.searchQuery || _buildQueryFallback(taskText || enrichment.taskText || ''));
      const gmailUrl = 'https://mail.google.com/mail/u/0/#search/' + searchQ;

      block.innerHTML =
        '<div class="focus-gmail-thread">' +
          '<div class="focus-gmail-meta">' +
            '<span class="focus-gmail-icon">↩</span>' +
            esc(fromName) + (dateStr ? ' — ' + esc(dateStr) : '') +
          '</div>' +
          '<div class="focus-gmail-snippet">&ldquo;' + esc(snippet) + (snippet.length >= 200 ? '…' : '') + '&rdquo;</div>' +
          '<div class="focus-gmail-actions">' +
            '<button class="focus-gmail-draft-btn"><span class="focus-gmail-draft-label">Draft reply</span></button>' +
            '<a class="focus-gmail-open" href="' + esc(gmailUrl) + '" target="_blank" rel="noopener">Open ↗</a>' +
          '</div>' +
          '<div class="focus-gmail-draft" hidden></div>' +
        '</div>';

      block.hidden = false;
      if (window._focusExpandTimer) _focusExpandTimer();
      const _aiBtn = document.querySelector('.focus-ai-timer-btn');
      if (_aiBtn) _aiBtn.textContent = '✦︎ draft reply';
      block.querySelector('.focus-gmail-draft-btn').addEventListener('click', function() {
        _fetchDraft(taskText || enrichment.taskText || '', snippet, block);
      });
    }

    function _gmailRenderFocusBlock(taskId, taskText) {
      const block = document.getElementById('focusGmailBlock');
      if (!block || !_gmailIsConnected()) return;

      const enrichment = _getEnrichment(taskId);
      if (enrichment) { _doRenderBlock(block, taskText, enrichment); return; }

      // No cache yet — classify then fetch on demand.
      // Clear stale content immediately; stamp the block so async renders can
      // bail if the user has already switched to a different task's focus session.
      if (!taskText) return;
      block.hidden = true;
      block.innerHTML = '';
      block.dataset.focusTaskId = taskId;
      const requestTaskId = taskId;
      _gmailFindThread(taskId, taskText).then(function(found) {
        if (!found) return;
        const data = Object.assign({}, found.result, { taskText, searchQuery: found.searchQuery, fetchedAt: Date.now() });
        try { localStorage.setItem('gmail_enrichment_' + taskId, JSON.stringify(data)); } catch(e) {}
        _gmailUpdateIndicator(taskId, true);
        const b = document.getElementById('focusGmailBlock');
        // Guard: abort if user switched to a different task while we were fetching
        if (b && b.dataset.focusTaskId === requestTaskId) _doRenderBlock(b, taskText, data);
      });
    }

    function _setBtnLabel(btn, text) {
      const label = btn.querySelector('.focus-gmail-draft-label');
      if (!label) { btn.textContent = text; return; }
      if (!btn.dataset.minWidthLocked) {
        btn.style.minWidth = btn.getBoundingClientRect().width + 'px';
        btn.dataset.minWidthLocked = '1';
      }
      label.classList.add('changing');
      setTimeout(() => { label.textContent = text; label.classList.remove('changing'); }, 150);
    }

    async function _fetchDraft(taskText, snippet, block) {
      const btn     = block.querySelector('.focus-gmail-draft-btn');
      const draftEl = block.querySelector('.focus-gmail-draft');
      if (!btn || !draftEl) return;

      _setBtnLabel(btn, 'drafting…');
      btn.disabled    = true;

      try {
        const res = await fetch('/.netlify/functions/ai-assist', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider:     Today.use('connections')._aiGetProvider(),
            apiKey:       Today.use('connections')._aiGetKey(),
            messages:     [{ role: 'user', content: 'My task: "' + taskText + '". Their last message: "' + snippet + '"' }],
            systemPrompt: 'Draft a brief, natural reply. Under 3 sentences. Use first name only if greeting. No subject line. No sign-off.',
          }),
        });
        if (!res.ok) {
          res.json().then(e => console.warn('[draft reply]', res.status, e?.error)).catch(() => {});
          _setBtnLabel(btn, 'Draft reply'); btn.disabled = false; return;
        }
        const data  = await res.json();
        const draft = (data.content || data.message || '').trim().replace(/^["']+|["']+$/g, '');
        if (!draft)  { _setBtnLabel(btn, 'Draft reply'); btn.disabled = false; return; }

        draftEl.textContent = draft;
        draftEl.hidden      = false;
        if (window._focusExpandTimer) _focusExpandTimer();
        _setBtnLabel(btn, 'Copy');
        btn.disabled        = false;
        btn.addEventListener('click', function copyOnce() {
          navigator.clipboard?.writeText(draft).then(() => {
            _setBtnLabel(btn, 'Copied ✓');
            setTimeout(() => { _setBtnLabel(btn, 'Copy'); }, 2000);
          });
          btn.removeEventListener('click', copyOnce);
        });

        const _toEmail   = block.dataset.fromEmail || '';
        const _rawSubj   = block.dataset.subject || '';
        const _subject   = _rawSubj ? 'Re: ' + _rawSubj : '';
        const _actionsEl = block.querySelector('.focus-gmail-actions');
        if (_actionsEl && _toEmail && !_actionsEl.querySelector('.focus-gmail-mailto')) {
          // Address goes in the mailto path, where '@' is legal and expected. Running the
          // whole address through encodeURIComponent produced 'notifications%40kry.se';
          // most clients decode it, but it is not the correct form and not all do.
          // Address form, 2 KB cap and grapheme-safe trimming → _mailtoDraftHref in
          // util.js, where it is unit-tested (scripts/mailto-test.mjs).
          const _mLink = document.createElement('a');
          _mLink.className   = 'focus-gmail-mailto focus-gmail-open';
          _mLink.textContent = 'Open in Mail ↗';
          _mLink.href        = _mailtoDraftHref(_toEmail, _subject, draft);
          // Deliberately no target="_blank" (BUG-089, v2.77.6). That asks for a new
          // browsing context, so the browser opens first and only then hands the
          // scheme to Mail — the two-step hop Can observed. A same-context navigation
          // is intercepted by the OS protocol handler before any page load, so no
          // browser is needed. The href stays on the anchor so long-press and
          // right-click → copy address still work.
          _mLink.addEventListener('click', function(ev) {
            ev.preventDefault();
            window.location.href = _mLink.href;
          });
          _actionsEl.appendChild(_mLink);
          if (window._focusExpandTimer) _focusExpandTimer();
        }
      } catch(e) {
        btn.textContent = 'Draft reply';
        btn.disabled    = false;
      }
    }

    // ── Exports ────────────────────────────────────────────────────────────────
    window.gmailAuth                    = _gmailDoAuth;
    window.gmailDisconnect              = gmailDisconnect;
    window._gmailIsConnected            = _gmailIsConnected;
    window._gmailEnrichTask             = _gmailEnrichTask;
    window._gmailRenderFocusBlock       = _gmailRenderFocusBlock;
    window._gmailRestoreAllIndicators   = _gmailRestoreAllIndicators;
    window._gmailUpdateIndicator        = _gmailUpdateIndicator;
    window._gmailBuildQueryFallback     = _buildQueryFallback;
    Today.define('gmail', { observationAudit: _gmailObservationAudit });
  };
})();
