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
    const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token';
    const GMAIL_API_BASE  = 'https://gmail.googleapis.com/gmail/v1/users/me';
    const GMAIL_SCOPE     = 'https://www.googleapis.com/auth/gmail.readonly';

    // ── Stored values ─────────────────────────────────────────────────────────
    function _clientId()     { return localStorage.getItem('gmail_client_id') || ''; }
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
      const clientId = _clientId();
      if (!clientId) { showStatus('Enter your Google OAuth Client ID first.', 'error'); return; }

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

      const poll = setInterval(async function() {
        try {
          if (!popup || popup.closed) { clearInterval(poll); return; }
          const search = popup.location.search || '';
          if (search.includes('code=')) {
            clearInterval(poll);
            const params = new URLSearchParams(search);
            const code   = params.get('code');
            const ret    = params.get('state');
            const err    = params.get('error_description') || params.get('error');
            popup.close();
            if (err)   { showStatus('Google error: ' + err, 'error'); return; }
            if (!code) { showStatus('No auth code — check Client ID and redirect URI.', 'error'); return; }
            if (ret !== sessionStorage.getItem('gml_state')) {
              showStatus('State mismatch — try again.', 'error'); return;
            }
            await _gmailExchangeCode(code);
          } else if (search.includes('error=')) {
            clearInterval(poll);
            popup.close();
            const params = new URLSearchParams(search);
            showStatus('Google error: ' + (params.get('error_description') || params.get('error') || 'Unknown'), 'error');
          }
        } catch(e) { /* cross-origin — still on accounts.google.com */ }
      }, 500);
    }

    async function _gmailExchangeCode(code) {
      const verifier    = sessionStorage.getItem('gml_verifier');
      const redirectUri = sessionStorage.getItem('gml_redirect_uri');
      sessionStorage.removeItem('gml_verifier');
      sessionStorage.removeItem('gml_redirect_uri');
      sessionStorage.removeItem('gml_state');

      showStatus('Connecting…', 'success');
      try {
        const res = await fetch(GMAIL_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id:     _clientId(),
            code_verifier: verifier,
            redirect_uri:  redirectUri,
            grant_type:    'authorization_code',
          }),
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
        const res = await fetch(GMAIL_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            refresh_token: rt,
            client_id:     _clientId(),
            grant_type:    'refresh_token',
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return false;
        localStorage.setItem('gmail_access_token', data.access_token);
        localStorage.setItem('gmail_token_expiry', String(Date.now() + (data.expires_in - 60) * 1000));
        return true;
      } catch(e) { return false; }
    }

    function gmailDisconnect() {
      ['gmail_access_token','gmail_refresh_token','gmail_token_expiry']
        .forEach(k => localStorage.removeItem(k));
      Object.keys(localStorage)
        .filter(k => k.startsWith('gmail_enrichment_'))
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

    // Strip action words to extract the name/subject for Gmail search.
    function _buildQuery(taskText) {
      return taskText
        .replace(/\b(reply|email|answer|call|contact|follow[\s-]?up|message|write to|respond|ping|reach out|get back to|answer to|send)\b/gi, '')
        .replace(/\s+/g, ' ').trim();
    }

    async function _gmailSearch(taskText) {
      const query = _buildQuery(taskText);
      if (query.length < 2) return null;

      const listData = await _gmailFetch(
        GMAIL_API_BASE + '/threads?q=' + encodeURIComponent(query) + '&maxResults=1'
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

    // ── Pattern detection ──────────────────────────────────────────────────────
    function _isCommTask(text) {
      const hasVerb = /\b(reply|email|answer|call|contact|follow[\s-]?up|message|write to|respond|ping|reach out|get back to|answer to|send)\b/i.test(text);
      // Heuristic for a person name: capitalized word that isn't first word of sentence
      const hasName = text.split(/\s+/).slice(1).some(w => /^[A-ZÄÖÜ][a-zäöü]{1,}/.test(w));
      return hasVerb && hasName;
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
      if (!_isCommTask(taskText)) return;

      const cached = _getEnrichment(taskId);
      if (cached && (Date.now() - cached.fetchedAt) < 86400000) return;

      const result = await _gmailSearch(taskText);
      if (!result) return;

      localStorage.setItem('gmail_enrichment_' + taskId, JSON.stringify({
        ...result, taskText, fetchedAt: Date.now(),
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
      span.textContent = '✉';
      span.setAttribute('aria-label', 'Email context available — start a focus session');
      taskEl.querySelector('.task-body')?.appendChild(span);
    }

    function _gmailRestoreAllIndicators() {
      Object.keys(localStorage)
        .filter(k => k.startsWith('gmail_enrichment_'))
        .forEach(k => _gmailUpdateIndicator(k.replace('gmail_enrichment_', '')));
    }

    // ── Focus block ─────────────────────────────────────────────────────────────
    function _gmailRenderFocusBlock(taskId, taskText) {
      const block = document.getElementById('focusGmailBlock');
      if (!block) return;

      const enrichment = _getEnrichment(taskId);
      if (!enrichment) { block.hidden = true; block.innerHTML = ''; return; }

      const fromRaw = enrichment.from || '';
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
      const searchQ  = encodeURIComponent(_buildQuery(taskText || enrichment.taskText || ''));
      const gmailUrl = 'https://mail.google.com/mail/u/0/#search/' + searchQ;

      block.innerHTML =
        '<div class="focus-gmail-thread">' +
          '<div class="focus-gmail-meta">' +
            '<span class="focus-gmail-icon">✉</span>' +
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

    // ── Client ID input helper ─────────────────────────────────────────────────
    function _saveClientIdFromInput() {
      const input = document.getElementById('gmailClientIdInput');
      const val   = (input && input.value.trim()) || '';
      if (val) localStorage.setItem('gmail_client_id', val);
      return !!_clientId();
    }

    function _updateGmailConnectBtn() {
      const input = document.getElementById('gmailClientIdInput');
      const btn   = document.getElementById('gmailConnectBtn');
      if (btn) btn.disabled = !((input && input.value.trim()) || _clientId());
    }

    // ── Exports ────────────────────────────────────────────────────────────────
    window.gmailAuth = async function() {
      _saveClientIdFromInput();
      await _gmailDoAuth();
    };
    window.gmailDisconnect              = gmailDisconnect;
    window._gmailIsConnected            = _gmailIsConnected;
    window._gmailEnrichTask             = _gmailEnrichTask;
    window._gmailRenderFocusBlock       = _gmailRenderFocusBlock;
    window._gmailRestoreAllIndicators   = _gmailRestoreAllIndicators;
    window._gmailUpdateIndicator        = _gmailUpdateIndicator;
    window._updateGmailConnectBtn       = _updateGmailConnectBtn;
  };
})();
