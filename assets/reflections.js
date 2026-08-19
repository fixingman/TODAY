// TODAY — opt-in post-triage reflections.
// Inert until index.html calls window._startReflections() before init().
(function() {
  'use strict';
  let started = false;
  window._startReflections = function() {
    if (started) return;
    started = true;

    const VALID_FEELINGS  = ['drained', 'tense', 'steady', 'calm', 'alive'];
    const POLICY_KEY      = 'today_reflection_policy';
    const DATA_KEY        = 'today_reflections';
    const CLEARED_KEY     = 'today_reflections_cleared_at';
    const INTRO_KEY       = 'today_reflection_intro_seen_at'; // local-only, never synced
    const MAX_DAYS        = 30;
    const OFFER_COOLDOWN_DAYS = 7;

    // Observation thresholds — defined once here, covered by tests, never tuned
    // against live user data.
    const OBS_MIN_TOTAL          = 14;   // reflections needed before any observation
    const OBS_MIN_GROUP          = 4;    // per comparison group
    const OBS_DISTRIBUTION_RATE  = 0.45; // one feeling ≥ 45% = clearly recurrent
    const OBS_FOCUS_DIFF_RATIO   = 0.30; // focus groups must differ by ≥ 30 pp

    // Transient session-only state (never persisted)
    let _reflectResult  = null;
    let _reflectPending = false;
    let _forgetPending  = false;

    // ── Storage helpers ──────────────────────────────────────────────────────

    function _loadPolicy() {
      const raw = safeJSON(POLICY_KEY, null);
      if (!raw || typeof raw !== 'object') return null;
      if (raw.choice !== 'remember' && raw.choice !== 'not_for_me') return null;
      if (typeof raw.updatedAt !== 'string') return null;
      return raw;
    }

    function _savePolicy(choice) {
      const policy = { choice, updatedAt: new Date().toISOString() };
      localStorage.setItem(POLICY_KEY, JSON.stringify(policy));
      return policy;
    }

    function _loadReflections() {
      const raw = safeJSON(DATA_KEY, []);
      if (!Array.isArray(raw)) return [];
      return raw.filter(r =>
        r && typeof r === 'object' &&
        VALID_FEELINGS.includes(r.feeling) &&
        typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
        typeof r.updatedAt === 'string'
      );
    }

    function _saveReflections(list) {
      localStorage.setItem(DATA_KEY, JSON.stringify(list));
    }

    function _pruneReflections(list) {
      // Prune by calendar date (not elapsed ms) so DST changes don't shift the window.
      const today  = _localISO();
      const cutoff = _calendarOffset(today, -(MAX_DAYS - 1));
      return list.filter(r => r.date >= cutoff);
    }

    function _calendarOffset(isoDate, offsetDays) {
      const [y, mo, d] = isoDate.split('-').map(Number);
      const dt = new Date(y, mo - 1, d + offsetDays);
      return dt.getFullYear() + '-' +
        String(dt.getMonth() + 1).padStart(2, '0') + '-' +
        String(dt.getDate()).padStart(2, '0');
    }

    function _getTodayReflection() {
      return _loadReflections().find(r => r.date === _localISO()) || null;
    }

    // ── Intro cooldown ───────────────────────────────────────────────────────

    function _introOfferPermitted() {
      const raw = localStorage.getItem(INTRO_KEY);
      if (!raw) return true;
      const dateStr = raw.slice(0, 10);
      const [iy, imo, id] = dateStr.split('-').map(Number);
      const offered = new Date(iy, imo - 1, id);
      const today   = new Date(); today.setHours(0, 0, 0, 0);
      return Math.round((today - offered) / 86400000) >= OFFER_COOLDOWN_DAYS;
    }

    function _stampIntroSeen() {
      localStorage.setItem(INTRO_KEY, new Date().toISOString());
    }

    // ── Main triage hook ─────────────────────────────────────────────────────

    function _reflectionShowAfterTriage() {
      const policy = _loadPolicy();

      if (policy && policy.choice === 'not_for_me') {
        return { visible: false };
      }
      if (policy && policy.choice === 'remember') {
        return _getTodayReflection() ? { visible: false } : { visible: true, timeoutMs: 6000 };
      }
      // No policy yet
      return _introOfferPermitted() ? { visible: true, timeoutMs: 10000 } : { visible: false };
    }

    function _reflectionMountInTriage(show) {
      const el = document.getElementById('triageReflection');
      if (!el) return;
      if (!show.visible) { el.innerHTML = ''; return; }

      const policy = _loadPolicy();
      if (policy && policy.choice === 'remember') {
        el.innerHTML = _buildQuestionHTML();
      } else {
        _stampIntroSeen();
        el.innerHTML = _buildIntroHTML();
      }
    }

    // ── HTML builders ────────────────────────────────────────────────────────

    function _buildIntroHTML() {
      return `<div class="reflection-intro">` +
        `<p class="reflection-intro-copy"><strong>Remember how days felt?</strong><br>` +
        `TODAY can remember these reflections for 30 days and notice patterns over time. They stay on this device, and in your Dropbox if you connect it. Your AI sees a short summary only when you ask.</p>` +
        `<div class="reflection-consent-actions">` +
        `<button class="reflection-consent-btn accent" onclick="reflectionRemember()">Remember</button>` +
        `<button class="reflection-consent-btn neutral" onclick="reflectionDecline()">Not for me</button>` +
        `</div></div>`;
    }

    function _buildQuestionHTML() {
      return `<div class="reflection-question">Beyond what got done, how did today feel?</div>` +
        `<div class="reflection-feelings" role="group" aria-label="How today felt">` +
        VALID_FEELINGS.map(f =>
          `<button class="reflection-feeling-btn" aria-pressed="false" onclick="reflectionSelect('${f}')">${f}</button>`
        ).join('') +
        `</div>`;
    }

    function _buildConfirmedHTML(feeling) {
      return `<div class="reflection-confirmed">` +
        `today felt <span class="reflection-confirmed-word">${feeling}</span>.` +
        `</div>`;
    }

    // ── Consent actions ──────────────────────────────────────────────────────

    function reflectionRemember() {
      _savePolicy('remember');
      if (typeof _setLastLocalChange === 'function') _setLastLocalChange();
      if (typeof dropboxAutoSave === 'function') dropboxAutoSave();

      const el = document.getElementById('triageReflection');
      if (el) el.innerHTML = _buildQuestionHTML();

      if (typeof window._triageResetAutoClose === 'function') window._triageResetAutoClose(8000);
    }

    function reflectionDecline() {
      _savePolicy('not_for_me');
      if (typeof _setLastLocalChange === 'function') _setLastLocalChange();
      if (typeof dropboxAutoSave === 'function') dropboxAutoSave();

      const el = document.getElementById('triageReflection');
      if (el) el.innerHTML = '';

      if (typeof window._triageResetAutoClose === 'function') window._triageResetAutoClose(3000);
    }

    // ── Feeling selection ────────────────────────────────────────────────────

    function reflectionSelect(feeling) {
      if (!VALID_FEELINGS.includes(feeling)) return;

      const today = _localISO();
      let list    = _loadReflections();
      const idx   = list.findIndex(r => r.date === today);
      const entry = { date: today, feeling, updatedAt: new Date().toISOString() };
      if (idx >= 0) { list[idx] = entry; } else { list.push(entry); }
      list = _pruneReflections(list);
      _saveReflections(list);

      if (typeof _setLastLocalChange === 'function') _setLastLocalChange();
      if (typeof dropboxAutoSave === 'function') dropboxAutoSave();
      if (typeof _haptic === 'function') _haptic('light');

      // Replace question+buttons with a brief confirmation of the selected feeling
      const el = document.getElementById('triageReflection');
      if (el) {
        el.innerHTML = _buildConfirmedHTML(feeling);
      }
      const undoBtn = document.getElementById('triageUndoBtn');
      if (undoBtn) undoBtn.style.display = 'none';

      // Leave 3 s for Undo
      if (typeof window._triageResetAutoClose === 'function') window._triageResetAutoClose(3000);
    }

    // ── Memory block ─────────────────────────────────────────────────────────

    function _reflectionRenderMemory(container) {
      if (!container) return;

      const policy   = _loadPolicy();
      const list     = _loadReflections();
      const provider = _getProviderDisplayName();

      const block = document.createElement('div');
      block.className = 'memory-type-block reflection-memory-block';
      block.id = 'reflectionMemoryBlock';

      let inner = `<div class="memory-type-header">` +
        `<span class="memory-type-name">HOW DAYS FELT</span>` +
        `<span class="memory-type-desc">— a separate sensitive record of evening reflections</span>` +
        `</div>`;

      if (_forgetPending) {
        inner += `<div class="memory-item">` +
          `<span class="memory-item-text">Forget these reflections?</span>` +
          `</div>` +
          `<div style="display:flex;gap:var(--space-3);margin-top:var(--space-2);padding:0 0 var(--space-2)">` +
          `<button class="memory-clear-btn" style="opacity:1;color:var(--danger)" onclick="reflectionForgetConfirm()">Yes, forget</button>` +
          `<button class="btn-ghost memory-conn-link" onclick="reflectionForgetCancel()">Cancel</button>` +
          `</div>`;
      } else if (!policy || policy.choice === 'not_for_me') {
        inner += `<div class="memory-item"><span class="memory-item-text">Reflections are not remembered.</span></div>` +
          `<div style="margin-top:var(--space-2);padding-bottom:var(--space-2)">` +
          `<button class="triage-undo-btn" onclick="reflectionRememberAgain()">Remember reflections</button>` +
          `</div>`;
      } else {
        // policy.choice === 'remember'
        inner += `<div class="memory-item"><span class="memory-item-text">Remembering the last ${MAX_DAYS} days.</span></div>`;

        if (list.length > 0) {
          inner += `<div class="memory-item"><span class="memory-item-text">${list.length} evening${list.length === 1 ? '' : 's'} remembered.</span></div>`;
        }

        const obs = _computeObservation(list);
        if (obs) {
          inner += `<div class="memory-item"><span class="memory-item-text">${obs}</span></div>`;
        }

        const aiReady = typeof _aiIsConfigured === 'function' && _aiIsConfigured();
        if (list.length >= 7 && aiReady) {
          if (_reflectPending) {
            inner += `<div class="memory-item"><span class="memory-item-text memory-abstracting">reflecting…</span></div>`;
          } else if (_reflectResult) {
            inner += `<div class="memory-item"><span class="memory-item-text">${_reflectResult}</span></div>`;
          } else {
            inner += `<div class="memory-item" style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">` +
              `<button class="triage-undo-btn" onclick="reflectionReflect()">Reflect</button>` +
              `<span style="font-size:var(--text-xs);color:var(--muted)">Shares a brief summary with ${provider} only when you ask.</span>` +
              `</div>`;
          }
        }

        if (list.length > 0) {
          inner += `<div style="margin-top:var(--space-2);padding-bottom:var(--space-2)">` +
            `<button class="memory-clear-btn" onclick="reflectionForgetRequest()">Forget reflections</button>` +
            `</div>`;
        }
      }

      block.innerHTML = inner;
      container.appendChild(block);
    }

    function _getProviderDisplayName() {
      if (typeof _aiGetProvider !== 'function') return 'your AI';
      const p = _aiGetProvider();
      if (!p) return 'your AI';
      const names = { anthropic: 'Claude', claude: 'Claude', gemini: 'Gemini', openai: 'ChatGPT' };
      return names[p] || 'your AI';
    }

    // ── On-device observation ────────────────────────────────────────────────
    // Deterministic — no AI, no tuning. Thresholds are fixed constants above.

    function _computeObservation(list) {
      if (list.length < OBS_MIN_TOTAL) return null;

      // Priority 1: one feeling is clearly recurrent
      const counts = {};
      VALID_FEELINGS.forEach(f => { counts[f] = 0; });
      list.forEach(r => { if (r.feeling in counts) counts[r.feeling]++; });
      const [topFeeling, topCount] = Object.entries(counts).sort(([,a],[,b]) => b - a)[0];
      if (topCount / list.length >= OBS_DISTRIBUTION_RATE) {
        return `On evenings you reflected, ${topFeeling} was the most common feeling.`;
      }

      // Priority 2: focus association
      const history = safeJSON('today_daily_history', []);
      if (!history.length) return null;
      const histByDate = new Map(history.map(e => [e.date, e]));
      const lowGroup  = []; // focusMins === 0
      const longGroup = []; // focusMins >= 60
      list.forEach(r => {
        const h = histByDate.get(r.date);
        if (!h) return;
        const mins = h.focusMins || 0;
        if (mins === 0) lowGroup.push(r.feeling);
        else if (mins >= 60) longGroup.push(r.feeling);
      });
      if (lowGroup.length >= OBS_MIN_GROUP && longGroup.length >= OBS_MIN_GROUP) {
        const DRAINING = ['drained', 'tense'];
        const lowRate  = lowGroup.filter(f  => DRAINING.includes(f)).length / lowGroup.length;
        const longRate = longGroup.filter(f => DRAINING.includes(f)).length / longGroup.length;
        const diff     = longRate - lowRate;
        if (Math.abs(diff) >= OBS_FOCUS_DIFF_RATIO) {
          return diff > 0
            ? `On evenings you reflected, longer focus days have more often felt draining.`
            : `On evenings you reflected, focus days have more often felt calm or alive.`;
        }
      }

      return null;
    }

    // ── Forget flow ──────────────────────────────────────────────────────────

    function reflectionForgetRequest() {
      _forgetPending = true;
      _refreshMemoryBlock();
    }

    function reflectionForgetCancel() {
      _forgetPending = false;
      _refreshMemoryBlock();
    }

    function reflectionForgetConfirm() {
      _forgetPending = false;
      _reflectionClearFromAllMemory();
      _refreshMemoryBlock();
    }

    function _reflectionClearFromAllMemory() {
      localStorage.setItem(CLEARED_KEY, new Date().toISOString());
      localStorage.removeItem(DATA_KEY);
      _savePolicy('not_for_me');
      _reflectResult  = null;
      _reflectPending = false;

      if (typeof _setLastLocalChange === 'function') _setLastLocalChange();
      // Immediate silent backup so deletion propagates promptly when connected
      const token = localStorage.getItem('dropbox_token');
      if (token && typeof dropboxBackup === 'function') dropboxBackup(true);
    }

    function _refreshMemoryBlock() {
      const existing = document.getElementById('reflectionMemoryBlock');
      if (existing) {
        const tmp = document.createElement('div');
        _reflectionRenderMemory(tmp);
        const newBlock = tmp.firstChild;
        if (newBlock) existing.replaceWith(newBlock);
      } else if (typeof renderMemoryPanel === 'function') {
        renderMemoryPanel();
      }
    }

    // ── Remember again (reverse opt-out) ────────────────────────────────────

    function reflectionRememberAgain() {
      _savePolicy('remember');
      if (typeof _setLastLocalChange === 'function') _setLastLocalChange();
      if (typeof dropboxAutoSave === 'function') dropboxAutoSave();
      _refreshMemoryBlock();
    }

    // ── AI reflection ────────────────────────────────────────────────────────

    async function reflectionReflect() {
      const list = _loadReflections();
      if (list.length < 7) return;
      if (typeof _aiIsConfigured !== 'function' || !_aiIsConfigured()) return;
      if (!navigator.onLine) return;

      _reflectPending = true;
      _reflectResult  = null;
      _refreshMemoryBlock();

      try {
        // Aggregate counts only — no task text, raw dates, identifiers
        const counts = {};
        VALID_FEELINGS.forEach(f => { counts[f] = 0; });
        list.forEach(r => { if (r.feeling in counts) counts[r.feeling]++; });

        const obs      = _computeObservation(list);
        const focusTot = _buildFocusGroupTotals(list);

        const payload = {
          evenings_count:  list.length,
          feeling_counts:  counts,
          ...(obs      ? { on_device_observation: obs }       : {}),
          ...(focusTot ? { focus_groups:          focusTot }  : {}),
        };

        const systemPrompt =
          'You see aggregate data from a personal productivity app\'s post-triage reflection feature. ' +
          'The user opted in to reflect on how evenings felt after completing task triage. ' +
          'Write one short (2–3 sentence), tentative, non-clinical reflection based only on the patterns visible in the data. ' +
          'Forbidden: causal language, diagnosis, scores, streaks, advice, predictions, clinical interpretation. ' +
          'Do not make up specific dates or tasks. ' +
          'Begin with a framing like "Looking at evenings you reflected…" or similar.';

        const key      = typeof _aiGetKey      === 'function' ? _aiGetKey()      : null;
        const provider = typeof _aiGetProvider === 'function' ? _aiGetProvider() : null;
        if (!key || !provider) return;

        const res = await fetch('/.netlify/functions/ai-assist', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            provider, apiKey: key,
            messages:     [{ role: 'user', content: JSON.stringify(payload) }],
            systemPrompt,
          }),
        });
        if (!res.ok) return;

        const data = await res.json();
        const text = typeof _parseAIText === 'function' ? _parseAIText(data)?.trim() : null;
        _reflectResult = text || null;
      } catch (_e) {
        // silent
      } finally {
        _reflectPending = false;
        _refreshMemoryBlock();
      }
    }

    function _buildFocusGroupTotals(list) {
      const history = safeJSON('today_daily_history', []);
      if (!history.length) return null;
      const histByDate = new Map(history.map(e => [e.date, e]));
      const low  = { count: 0, feelings: Object.fromEntries(VALID_FEELINGS.map(f => [f, 0])) };
      const long = { count: 0, feelings: Object.fromEntries(VALID_FEELINGS.map(f => [f, 0])) };
      list.forEach(r => {
        const h = histByDate.get(r.date);
        if (!h) return;
        const mins = h.focusMins || 0;
        if (mins === 0)    { low.count++;  if (r.feeling in low.feelings)  low.feelings[r.feeling]++;  }
        else if (mins >= 60) { long.count++; if (r.feeling in long.feelings) long.feelings[r.feeling]++; }
      });
      if (low.count < OBS_MIN_GROUP && long.count < OBS_MIN_GROUP) return null;
      return { low_focus_evenings: low, long_focus_evenings: long };
    }

    // ── Dropbox sync ─────────────────────────────────────────────────────────

    function _reflectionBackupFields() {
      return {
        reflection_policy:      safeJSON(POLICY_KEY, null),
        reflections:            safeJSON(DATA_KEY,   []),
        reflections_cleared_at: localStorage.getItem(CLEARED_KEY) || '',
        // today_reflection_intro_seen_at intentionally excluded — local-only cooldown
      };
    }

    function _reflectionMergeRemote(data) {
      let changed = false;

      // 1. Max cleared-at watermark
      const localCleared  = localStorage.getItem(CLEARED_KEY) || '';
      const remoteCleared = typeof data.reflections_cleared_at === 'string' ? data.reflections_cleared_at : '';
      const mergedCleared = localCleared > remoteCleared ? localCleared : remoteCleared;
      if (mergedCleared && mergedCleared !== localCleared) {
        localStorage.setItem(CLEARED_KEY, mergedCleared);
        changed = true;
      }

      // 2. Policy LWW by updatedAt — ties → remote wins
      const localPolicy  = _loadPolicy();
      const rp           = data.reflection_policy;
      const remotePolicy = (rp && typeof rp === 'object' &&
        (rp.choice === 'remember' || rp.choice === 'not_for_me') &&
        typeof rp.updatedAt === 'string') ? rp : null;
      if (remotePolicy) {
        if (!localPolicy || remotePolicy.updatedAt >= localPolicy.updatedAt) {
          if (!localPolicy || localPolicy.choice !== remotePolicy.choice ||
              localPolicy.updatedAt !== remotePolicy.updatedAt) {
            localStorage.setItem(POLICY_KEY, JSON.stringify(remotePolicy));
            changed = true;
          }
        }
      }

      // 3. Union responses by date — newest valid updatedAt wins
      const localList  = _loadReflections();
      const remoteList = Array.isArray(data.reflections)
        ? data.reflections.filter(r =>
            r && typeof r === 'object' &&
            VALID_FEELINGS.includes(r.feeling) &&
            typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
            typeof r.updatedAt === 'string'
          )
        : [];

      const byDate = new Map();
      localList.forEach(r  => byDate.set(r.date, r));
      remoteList.forEach(r => {
        const existing = byDate.get(r.date);
        if (!existing || r.updatedAt > existing.updatedAt) byDate.set(r.date, r);
      });

      // 4. Discard entries ≤ merged clear watermark
      let merged = Array.from(byDate.values())
        .filter(r => !mergedCleared || r.updatedAt > mergedCleared);

      // 5. Prune to 30-day calendar window
      merged = _pruneReflections(merged);

      // 6. Persist if changed; refresh open Memory panel
      const sorted       = list => list.slice().sort((a, b) => a.date.localeCompare(b.date));
      const localSerial  = JSON.stringify(sorted(localList));
      const mergedSerial = JSON.stringify(sorted(merged));
      if (mergedSerial !== localSerial) {
        _saveReflections(merged);
        changed = true;
      }

      if (changed && document.getElementById('memoryPanel')?.classList.contains('open')) {
        _refreshMemoryBlock();
      }

      return changed;
    }

    // ── Public API ───────────────────────────────────────────────────────────

    window._reflectionShowAfterTriage    = _reflectionShowAfterTriage;
    window._reflectionMountInTriage      = _reflectionMountInTriage;
    window.reflectionRemember            = reflectionRemember;
    window.reflectionDecline             = reflectionDecline;
    window.reflectionSelect              = reflectionSelect;
    window._reflectionRenderMemory       = _reflectionRenderMemory;
    window.reflectionForgetRequest       = reflectionForgetRequest;
    window.reflectionForgetCancel        = reflectionForgetCancel;
    window.reflectionForgetConfirm       = reflectionForgetConfirm;
    window.reflectionRememberAgain       = reflectionRememberAgain;
    window.reflectionReflect             = reflectionReflect;
    window._reflectionBackupFields       = _reflectionBackupFields;
    window._reflectionMergeRemote        = _reflectionMergeRemote;
    window._reflectionClearFromAllMemory = _reflectionClearFromAllMemory;
  };
})();
