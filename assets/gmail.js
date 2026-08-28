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
        renderConnections();
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
      document.querySelectorAll('.gmail-indicator').forEach(el => el.remove());
      renderConnections();
      showStatus('Gmail disconnected.', 'success');
    }

    // ── Gmail API ──────────────────────────────────────────────────────────────
    async function _gmailFetch(url, retry) {
      if (retry === undefined) retry = true;
      if (_isExpired()) {
        const ok = await _gmailRefreshTokens();
        if (!ok) return null;
      }
      const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + _accessToken() } });
      if (res.status === 401 && retry) {
        const ok = await _gmailRefreshTokens();
        if (!ok) return null;
        return _gmailFetch(url, false);
      }
      if (!res.ok) return null;
      return res.json();
    }

    // Regex fallback for when AI classification is unavailable.
    function _buildQueryFallback(taskText) {
      return taskText
        .replace(/\b(reply|email|answer|call|contact|follow[\s-]?up|message|write to|respond|ping|reach out|get back to|answer to|send)\b/gi, '')
        .replace(/^\s*(to|with|for|about)\s+/i, '')
        .replace(/\s+/g, ' ').trim();
    }

    // AI-backed classification — returns { isComm, searchQuery }.
    // Fast verb pre-filter avoids the AI call for clearly non-comm tasks.
    // Falls back to regex silently if AI is unavailable or returns bad output.
    async function _classifyTask(taskId, taskText) {
      const hasVerb = /\b(reply|email|answer|call|contact|follow[\s-]?up|message|write to|respond|ping|reach out|get back to|answer to|send)\b/i.test(taskText);
      if (!hasVerb) return { isComm: false, searchQuery: '' };

      try {
        const raw = localStorage.getItem('gmail_classify_' + taskId);
        if (raw) {
          const hit = JSON.parse(raw);
          if (typeof hit.isComm === 'boolean') return hit;
        }
      } catch(e) {}

      try {
        const provider = typeof _aiGetProvider === 'function' ? _aiGetProvider() : 'gemini';
        const apiKey   = typeof _aiGetKey === 'function' ? _aiGetKey() : '';
        const res = await fetch('/.netlify/functions/ai-assist', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider:     provider || 'gemini',
            apiKey,
            systemPrompt: 'Return ONLY valid JSON: {"isComm":true,"searchQuery":"name"}. isComm=true when the task involves contacting or replying to a specific person or organization. searchQuery is the person/org name extracted cleanly — no verbs, no prepositions. If isComm=false, set searchQuery to "".',
            messages:     [{ role: 'user', content: taskText }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.isComm === 'boolean' && typeof data.searchQuery === 'string') {
            try { localStorage.setItem('gmail_classify_' + taskId, JSON.stringify(data)); } catch(e) {}
            return data;
          }
        }
      } catch(e) {}

      const result = { isComm: true, searchQuery: _buildQueryFallback(taskText) };
      try { localStorage.setItem('gmail_classify_' + taskId, JSON.stringify(result)); } catch(e) {}
      return result;
    }

    async function _gmailSearch(searchQuery) {
      if (!searchQuery || searchQuery.length < 2) return null;

      const listData = await _gmailFetch(
        GMAIL_API_BASE + '/threads?q=' + encodeURIComponent(searchQuery) + '&maxResults=1'
      );
      if (!listData || !listData.threads || !listData.threads.length) return null;

      const threadId   = listData.threads[0].id;
      const threadData = await _gmailFetch(
        GMAIL_API_BASE + '/threads/' + threadId
          + '?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date'
      );
      if (!threadData || !threadData.messages || !threadData.messages.length) return null;

      const lastMsg = threadData.messages[threadData.messages.length - 1];
      const headers = (lastMsg.payload && lastMsg.payload.headers) || [];
      const hdr = (name) => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';

      return {
        threadId,
        subject: hdr('Subject'),
        from:    hdr('From'),
        date:    hdr('Date'),
        snippet: lastMsg.snippet || '',
      };
    }

    // ── Enrichment ─────────────────────────────────────────────────────────────
    function _getEnrichment(taskId) {
      try {
        const raw = localStorage.getItem('gmail_enrichment_' + taskId);
        return raw ? JSON.parse(raw) : null;
      } catch(e) { return null; }
    }

    async function _gmailEnrichTask(taskId, taskText) {
      if (!_gmailIsConnected()) return;

      const cached = _getEnrichment(taskId);
      if (cached && (Date.now() - cached.fetchedAt) < 86400000) return;

      const { isComm, searchQuery } = await _classifyTask(taskId, taskText);
      if (!isComm) return;

      const result = await _gmailSearch(searchQuery);
      if (!result) return;

      localStorage.setItem('gmail_enrichment_' + taskId, JSON.stringify({
        ...result, taskText, searchQuery, fetchedAt: Date.now(),
      }));
      _gmailUpdateIndicator(taskId);
    }

    // ── Task row indicator ─────────────────────────────────────────────────────
    function _gmailUpdateIndicator(taskId) {
      const taskEl = document.querySelector('.task[data-taskid="' + CSS.escape(taskId) + '"]');
      if (!taskEl) return;
      taskEl.querySelector('.gmail-indicator')?.remove();
      if (!_getEnrichment(taskId) || !_gmailIsConnected()) return;

      const span = document.createElement('span');
      span.className = 'gmail-indicator';
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
            '<button class="focus-gmail-draft-btn">Draft reply</button>' +
            '<a class="focus-gmail-open" href="' + esc(gmailUrl) + '" target="_blank" rel="noopener">Open ↗</a>' +
          '</div>' +
          '<div class="focus-gmail-draft" hidden></div>' +
        '</div>';

      block.hidden = false;
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
      _classifyTask(taskId, taskText).then(function(classification) {
        if (!classification.isComm) return;
        return _gmailSearch(classification.searchQuery).then(function(result) {
          if (!result) return;
          const data = Object.assign({}, result, { taskText, searchQuery: classification.searchQuery, fetchedAt: Date.now() });
          try { localStorage.setItem('gmail_enrichment_' + taskId, JSON.stringify(data)); } catch(e) {}
          _gmailUpdateIndicator(taskId);
          const b = document.getElementById('focusGmailBlock');
          // Guard: abort if user switched to a different task while we were fetching
          if (b && b.dataset.focusTaskId === requestTaskId) _doRenderBlock(b, taskText, data);
        });
      });
    }

    async function _fetchDraft(taskText, snippet, block) {
      const btn     = block.querySelector('.focus-gmail-draft-btn');
      const draftEl = block.querySelector('.focus-gmail-draft');
      if (!btn || !draftEl) return;

      btn.textContent = 'drafting…';
      btn.disabled    = true;

      try {
        const res = await fetch('/.netlify/functions/ai-assist', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider:     _aiGetProvider(),
            apiKey:       _aiGetKey(),
            messages:     [{ role: 'user', content: 'My task: "' + taskText + '". Their last message: "' + snippet + '"' }],
            systemPrompt: 'Draft a brief, natural reply. Under 3 sentences. Use first name only if greeting. No subject line. No sign-off.',
          }),
        });
        if (!res.ok) { btn.textContent = 'Draft reply'; btn.disabled = false; return; }
        const data  = await res.json();
        const draft = (data.content || data.message || '').trim().replace(/^["']+|["']+$/g, '');
        if (!draft)  { btn.textContent = 'Draft reply'; btn.disabled = false; return; }

        draftEl.textContent = draft;
        draftEl.hidden      = false;
        btn.textContent     = 'Copy';
        btn.disabled        = false;
        btn.addEventListener('click', function copyOnce() {
          navigator.clipboard?.writeText(draft).then(() => {
            btn.textContent = 'Copied ✓';
            setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
          });
          btn.removeEventListener('click', copyOnce);
        });
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
  };
})();
