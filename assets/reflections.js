// TODAY — opt-in reflections; start before init.
(function() {
  'use strict';
  let started = false;
  window._startReflections = function() {
    if (started) return;
    started = true;

    // Lighter feelings left, heavier right; DOM order follows rows.
    const OFFERED_FEELINGS = [
      'joyful',  'scattered',
      'alive',   'tense',
      'content', 'frustrated',
      'calm',    'drained',
      'present', 'sad',
    ];
    // Legacy off remains valid in storage and sync.
    const VALID_FEELINGS  = [...OFFERED_FEELINGS, 'off'];
    const POLICY_KEY      = 'today_reflection_policy';
    const DATA_KEY        = 'today_reflections';
    const CLEARED_KEY     = 'today_reflections_cleared_at';
    const INTRO_KEY       = 'today_reflection_intro_seen_at'; // local-only, never synced
    const MAX_DAYS        = 30;
    const OFFER_COOLDOWN_DAYS = 7;

    // Require observed commitment comparisons; never tune thresholds to live data.
    const INSIGHT_MIN_GROUP       = 4;
    const INSIGHT_MIN_FEELING     = 3;
    const INSIGHT_MIN_DIFF_RATIO  = 0.30;

    // Transient session-only state (never persisted)
    let _reflectResult  = null;
    let _reflectPending = false;
    let _reflectTriggered = false; // at most one attempt per evidence snapshot
    let _reflectAttempted = false;
    let _reflectEvidence = null;
    let _reflectEpoch = 0;

    function _parseAIText(data) {
      if (data.error) return null;
      return (data.content || data.message || '').trim().replace(/^["']+|["']+$/g, '') || null;
    }

    function _usableReflectionText(text, candidate) {
      const clean = text?.trim();
      if (!clean || clean.toLowerCase() === 'none') return null;
      if (clean.split(/\s+/).length > 40) return null;
      if (!/[.!?…]$/.test(clean)) return null;
      if (!/^On evenings you reflected,/i.test(clean)) return null;
      if ((clean.match(/[.!?…](?:\s|$)/g) || []).length !== 1) return null;
      if (!candidate || !new RegExp('\\b' + candidate.feeling + '\\b', 'i').test(clean)) return null;
      const comparisonAt = clean.search(/\bmore often\b|\bmore common\b|\bshowed up more\b|\bstood out more\b/i);
      if (comparisonAt < 0) return null;
      if (/\b(?:caused|made you|because of|means you|should|try to|diagnos)/i.test(clean)) return null;
      const namedFeelings = VALID_FEELINGS.filter(feeling =>
        new RegExp('\\b' + feeling + '\\b', 'i').test(clean));
      if (namedFeelings.length !== 1) return null;
      const normalize = value => String(value).toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
      const normalized = normalize(clean);
      const moreAt = normalized.indexOf(normalize(candidate.more_context));
      const lessAt = normalized.indexOf(normalize(candidate.less_context));
      if (moreAt < comparisonAt || lessAt <= moreAt) return null;
      if (!/\bthan\b/i.test(clean.slice(moreAt, lessAt))) return null;
      return clean;
    }

    // Storage helpers
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

    // Intro cooldown
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

    // Main triage hook
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

    // HTML builders
    function _buildIntroHTML() {
      return `<div class="reflection-intro">` +
        `<p class="reflection-intro-copy"><strong>Remember how days felt?</strong><br>` +
        `TODAY can remember these reflections for 30 days and notice patterns over time. They stay on this device, and in your Dropbox if you connect it. If you connect AI, it sees one combined pattern—not individual evenings—when you open Memory.</p>` +
        `<div class="reflection-consent-actions">` +
        `<button class="reflection-consent-btn accent" data-today-click="reflections.remember">Remember</button>` +
        `<button class="reflection-consent-btn neutral" data-today-click="reflections.decline">Not for me</button>` +
        `</div></div>`;
    }

    function _buildQuestionHTML() {
      return `<div class="reflection-question">Beyond what got done, how did today feel?</div>` +
        `<div class="reflection-feelings" role="group" aria-label="How today felt">` +
        OFFERED_FEELINGS.map(f =>
          `<button class="reflection-feeling-btn" aria-pressed="false" data-today-click="reflections.select" data-feeling="${f}">${f}</button>`
        ).join('') +
        `</div>`;
    }

    function _buildConfirmedHTML(feeling) {
      const count = _loadReflections().length;
      const hint  = count < 7
        ? `<div class="reflection-confirmed-hint">${count} of 7 evenings — patterns unlock soon.</div>`
        : '';
      return `<div class="reflection-confirmed">` +
        `today felt <span class="reflection-confirmed-word">${feeling}</span>.` +
        `</div>${hint}`;
    }

    // Consent actions
    function reflectionRemember() {
      _savePolicy('remember');
      _refreshOpenMemory();
      if (typeof _setLastLocalChange === 'function') _setLastLocalChange();
      if (typeof dropboxAutoSave === 'function') dropboxAutoSave();

      const el = document.getElementById('triageReflection');
      if (el) el.innerHTML = _buildQuestionHTML();

      if (typeof window._triageResetAutoClose === 'function') window._triageResetAutoClose(8000);
    }

    function reflectionDecline() {
      _savePolicy('not_for_me');
      _refreshOpenMemory();
      if (typeof _setLastLocalChange === 'function') _setLastLocalChange();
      if (typeof dropboxAutoSave === 'function') dropboxAutoSave();

      const el = document.getElementById('triageReflection');
      if (el) el.innerHTML = '';

      if (typeof window._triageResetAutoClose === 'function') window._triageResetAutoClose(3000);
    }

    // Feeling selection
    function _showReflectionConfirmation(el, feeling) {
      if (el) el.innerHTML = _buildConfirmedHTML(feeling);
    }

    function _animateReflectionChoice(el, button, feeling) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!el || !button || reduced || typeof button.animate !== 'function') {
        _showReflectionConfirmation(el, feeling);
        return;
      }

      el.querySelectorAll('.reflection-feeling-btn').forEach(choice => { choice.disabled = true; });
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');

      const fast   = _motionDuration('--dur-fast');
      const base   = _motionDuration('--dur-base');
      const mid    = _motionDuration('--dur-mid');
      const out    = _motionEasing('--ease-out');
      const spring = _motionEasing('--ease-spring');
      const exits  = [...el.querySelectorAll('.reflection-feeling-btn:not(.selected), .reflection-question')]
        .map(node => node.animate(
          [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.96)' }],
          { duration: fast, easing: out, fill: 'forwards' }
        ));
      const choice = button.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }],
        { duration: base, easing: spring, fill: 'none' }
      );

      Promise.allSettled([...exits.map(a => a.finished), choice.finished]).then(() => {
        if (!button.isConnected) return;
        const source = button.getBoundingClientRect();
        _showReflectionConfirmation(el, feeling);
        const target = el.querySelector('.reflection-confirmed-word');
        if (!target) return;
        const destination = target.getBoundingClientRect();
        target.style.opacity = '0';

        const flight = document.createElement('span');
        flight.className = 'reflection-choice-flight';
        flight.textContent = feeling;
        flight.style.left   = source.left + 'px';
        flight.style.top    = source.top + 'px';
        flight.style.width  = source.width + 'px';
        flight.style.height = source.height + 'px';
        document.body.appendChild(flight);

        const dx = destination.left + destination.width / 2 - (source.left + source.width / 2);
        const dy = destination.top  + destination.height / 2 - (source.top  + source.height / 2);
        const targetReveal = target.animate(
          [{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.65 }, { opacity: 1, offset: 1 }],
          { duration: mid, easing: out, fill: 'forwards' }
        );
        const settle = flight.animate(
          [
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.86)`, opacity: 1, offset: 0.72 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.86)`, opacity: 0 },
          ],
          { duration: mid, easing: out, fill: 'forwards' }
        );
        const finish = () => {
          if (target.isConnected) {
            targetReveal.cancel();
            target.style.opacity = '';
          }
          flight.remove();
        };
        settle.onfinish = finish;
        settle.oncancel = finish;
      });
    }

    function reflectionSelect(feeling) {
      if (!OFFERED_FEELINGS.includes(feeling)) return;

      const today = _localISO();
      let list    = _loadReflections();
      const idx   = list.findIndex(r => r.date === today);
      const entry = { date: today, feeling, updatedAt: new Date().toISOString() };
      if (idx >= 0) { list[idx] = entry; } else { list.push(entry); }
      list = _pruneReflections(list);
      _saveReflections(list);
      _refreshOpenMemory();

      if (typeof _setLastLocalChange === 'function') _setLastLocalChange();
      if (typeof dropboxAutoSave === 'function') dropboxAutoSave();
      if (typeof _haptic === 'function') _haptic('light');

      // Save immediately; animate the whole selected word without blocking.
      const el = document.getElementById('triageReflection');
      const button = el?.querySelector(`.reflection-feeling-btn[data-feeling="${feeling}"]`);
      _animateReflectionChoice(el, button, feeling);
      const undoBtn = document.getElementById('triageUndoBtn');
      if (undoBtn) undoBtn.style.display = 'none';

      // Leave 3 s for Undo
      if (typeof window._triageResetAutoClose === 'function') window._triageResetAutoClose(3000);
    }

    // Memory block
    function _reflectionRenderMemory(container) {
      if (!container) return;

      const evidence = _reconcileEvidence();
      const { policy, candidate } = evidence;
      const remembers = policy?.choice === 'remember';
      const canReflect = candidate && Today.use('connections')._aiIsConfigured() && navigator.onLine;
      if (remembers) {
        if (!candidate) return;
        if (!_reflectResult && !_reflectPending && !_reflectTriggered && canReflect) {
          _reflectTriggered = true;
          const key = evidence.key;
          setTimeout(() => reflectionReflect(key), 0);
        }
        // Qualified comparisons may load briefly; unavailable/rejected lines stay silent.
        if (!_reflectResult && !_reflectPending && !(_reflectTriggered && canReflect && !_reflectAttempted)) return;
      }

      const block = document.createElement('div');
      block.className = 'memory-type-block reflection-memory-block';
      block.id = 'reflectionMemoryBlock';
      let inner = `<div class="memory-type-header"><span class="memory-type-name">HOW DAYS FELT</span></div>`;
      if (!remembers) {
        inner += `<div class="memory-item"><span class="memory-item-text">TODAY doesn’t keep reflections.</span></div>` +
          `<div class="memory-block-action">` +
          `<button class="triage-undo-btn" data-today-click="reflections.remember-again">Remember reflections</button></div>`;
      } else {
        inner += `<div class="memory-item"><span class="memory-item-text${_reflectResult ? '' : ' memory-abstracting'}">${
          _reflectResult ? esc(_reflectResult) : 'reflecting…'
        }</span></div>`;
      }

      block.innerHTML = inner;
      container.appendChild(block);
    }

    // Join sensitive dates on-device; send only the winning aggregate.

    function _buildFeelingComparison(kind, baseScore, groupA, groupB, contextA, contextB) {
      if (groupA.length < INSIGHT_MIN_GROUP || groupB.length < INSIGHT_MIN_GROUP) return null;
      let winner = null;
      for (const feeling of VALID_FEELINGS) {
        const countA = groupA.filter(r => r.feeling === feeling).length;
        const countB = groupB.filter(r => r.feeling === feeling).length;
        const diff   = (countA / groupA.length) - (countB / groupB.length);
        if (Math.abs(diff) < INSIGHT_MIN_DIFF_RATIO) continue;
        const moreIsA  = diff > 0;
        const moreCount = moreIsA ? countA : countB;
        if (moreCount < INSIGHT_MIN_FEELING) continue;
        const candidate = {
          kind,
          feeling,
          score: baseScore + Math.round(Math.abs(diff) * 100),
          more_context: moreIsA ? contextA : contextB,
          less_context: moreIsA ? contextB : contextA,
          more_count: moreCount,
          more_total: moreIsA ? groupA.length : groupB.length,
          less_count: moreIsA ? countB : countA,
          less_total: moreIsA ? groupB.length : groupA.length,
        };
        if (!winner || candidate.score > winner.score) winner = candidate;
      }
      return winner;
    }

    function _buildReflectionCandidate(list) {
      if (list.length < INSIGHT_MIN_GROUP * 2 || typeof appMemory === 'undefined') return null;
      const reflectionByDate = new Map(list.map(r => [r.date, r]));
      const outcomesByDate   = new Map();
      for (const outcome of (appMemory.taskOutcomes || [])) {
        if (!outcome || !reflectionByDate.has(outcome.date)) continue;
        if (!outcomesByDate.has(outcome.date)) outcomesByDate.set(outcome.date, []);
        outcomesByDate.get(outcome.date).push(outcome);
      }

      const candidates = [];
      const group = predicate => list.filter(r => predicate(outcomesByDate.get(r.date) || []));

      // Exclude mixed chosen/obligation evenings from both groups.
      const obligationDone = group(rows =>
        rows.some(e => e.outcome === 'done' && e.obligation === true) &&
        !rows.some(e => e.outcome === 'done' && e.obligation === false));
      const chosenDone = group(rows =>
        rows.some(e => e.outcome === 'done' && e.obligation === false) &&
        !rows.some(e => e.outcome === 'done' && e.obligation === true));
      const obligationCandidate = _buildFeelingComparison(
        'feeling-vs-obligation', 110, obligationDone, chosenDone,
        'after finishing a "have to"',
        'after finishing something you chose');
      if (obligationCandidate) candidates.push(obligationCandidate);

      // Compare release with completion-only evenings, excluding inactivity.
      const letgo = group(rows => rows.some(e => e.outcome === 'letgo'));
      const finishedWithoutLetgo = group(rows =>
        rows.some(e => e.outcome === 'done') && !rows.some(e => e.outcome === 'letgo'));
      const releaseCandidate = _buildFeelingComparison(
        'feeling-vs-release', 100, letgo, finishedWithoutLetgo,
        'when you let a task go',
        'when you finished tasks without letting one go');
      if (releaseCandidate) candidates.push(releaseCandidate);

      // Backfilled focus is unknown; require real outcome rows.
      const focusEvenings = group(rows => {
        const real = rows.filter(e => !e.backfilled);
        return real.length > 0 && real.some(e => e.focusSessions > 0);
      });
      const noFocusEvenings = group(rows => {
        const real = rows.filter(e => !e.backfilled);
        return real.length > 0 && real.every(e => e.focusSessions === 0);
      });
      const focusCandidate = _buildFeelingComparison(
        'feeling-vs-focus', 105, focusEvenings, noFocusEvenings,
        'after handling a task with recorded focus',
        'after handling tasks without recorded focus');
      if (focusCandidate) candidates.push(focusCandidate);

      // Compare bringing back with completion-only evenings.
      const reviveEvenings = group(rows => rows.some(e => e.outcome === 'revive'));
      const finishedNoRevive = group(rows =>
        rows.some(e => e.outcome === 'done') && !rows.some(e => e.outcome === 'revive'));
      const reviveCandidate = _buildFeelingComparison(
        'feeling-vs-revive', 90, reviveEvenings, finishedNoRevive,
        'when you brought a task back from Past',
        'when you finished tasks without bringing one back');
      if (reviveCandidate) candidates.push(reviveCandidate);

      return candidates.sort((a, b) => b.score - a.score)[0] || null;
    }

    // Private source identity includes all eligible evidence, even with the same winner.
    function _reflectionEvidence() {
      const policy = _loadPolicy();
      const cleared = localStorage.getItem(CLEARED_KEY) || '';
      const list = _pruneReflections(_loadReflections()).filter(r =>
        r.date <= _localISO() && (!cleared || r.updatedAt > cleared));
      const dates = new Set(list.map(r => r.date));
      const outcomes = (typeof appMemory === 'undefined' ? [] : appMemory.taskOutcomes || [])
        .filter(r => r && dates.has(r.date))
        .map(r => [r.date, r.outcome, r.obligation, r.focusSessions, !!r.backfilled]);
      const canonical = rows => rows.map(r => JSON.stringify(r)).sort();
      const key = JSON.stringify([_localISO(), policy?.choice, policy?.updatedAt, cleared,
        canonical(list.map(r => [r.date, r.feeling, r.updatedAt])), canonical(outcomes)]);
      return { key, policy, list, candidate: policy?.choice === 'remember' ? _buildReflectionCandidate(list) : null };
    }

    function _reconcileEvidence() {
      const evidence = _reflectionEvidence();
      if (_reflectEvidence !== evidence.key) {
        _reflectEvidence = evidence.key;
        _reflectEpoch++;
        _reflectResult = null;
        _reflectPending = false;
        _reflectTriggered = false;
        _reflectAttempted = false;
      }
      return evidence;
    }

    function _refreshOpenMemory() {
      const previous = _reflectEvidence;
      const evidence = _reconcileEvidence();
      if (previous !== evidence.key && document.getElementById('memoryPanel')?.classList.contains('open')) _refreshMemoryBlock();
    }

    function _reflectionClearFromAllMemory() {
      localStorage.setItem(CLEARED_KEY, new Date().toISOString());
      localStorage.removeItem(DATA_KEY);
      _savePolicy('not_for_me');
      _refreshOpenMemory();

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
        else existing.remove();
      } else if (document.getElementById('memoryPanel')?.classList.contains('open')) {
        const container = document.getElementById('memoryContent');
        if (!container) return;
        const tmp = document.createElement('div');
        _reflectionRenderMemory(tmp);
        if (tmp.firstChild) container.insertBefore(tmp.firstChild, document.getElementById('dreamMemoryBlock'));
      }
    }

    // Remember again (reverse opt-out)
    function reflectionRememberAgain() {
      _savePolicy('remember');
      _refreshOpenMemory();
      if (typeof _setLastLocalChange === 'function') _setLastLocalChange();
      if (typeof dropboxAutoSave === 'function') dropboxAutoSave();
    }

    // AI reflection
    async function reflectionReflect(expectedKey) {
      const evidence = _reconcileEvidence();
      const { list, candidate } = evidence;
      if (expectedKey && expectedKey !== evidence.key) return;
      if (!candidate || _reflectPending || _reflectAttempted) return;
      if (!Today.use('connections')._aiIsConfigured() || !navigator.onLine) return;

      const epoch = _reflectEpoch;
      const isCurrent = () => epoch === _reflectEpoch && evidence.key === _reflectionEvidence().key;
      _reflectTriggered = true;
      _reflectAttempted = true;
      _reflectPending = true;
      _reflectResult = null;
      _refreshMemoryBlock();

      try {
        // Only the selected aggregate leaves the device; no raw records or alternate candidates.
        const payload = {
          reflected_evenings_count: list.length,
          relationship: {
            kind:         candidate.kind,
            feeling:      candidate.feeling,
            more_context: candidate.more_context,
            less_context: candidate.less_context,
            more_evenings: { matching: candidate.more_count, total: candidate.more_total },
            less_evenings: { matching: candidate.less_count, total: candidate.less_total },
          },
        };

        const systemPrompt =
          'Code has selected one evidence-backed relationship between evening reflections and how the user handled commitments that day. ' +
          'Phrase only that relationship; do not search for another pattern. ' +
          'Write exactly one complete sentence of at most 40 words. ' +
          'Begin "On evenings you reflected," and say you marked the named feeling more often. ' +
          'Copy more_context and less_context verbatim, in that order, joined by "than". ' +
          'Do not narrate the numbers or mention any other feeling. ' +
          'Forbidden: causal language, diagnosis, scores, streaks, advice, predictions, clinical interpretation. ' +
          'Do not make up specific dates or tasks. ' +
          'Reply only as valid JSON in the exact shape {"message":"your sentence"}.';

        const key      = Today.use('connections')._aiGetKey();
        const provider = Today.use('connections')._aiGetProvider();
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
        if (!res.ok) {
          res.json().then(e => console.warn('[reflection]', res.status, e?.error)).catch(() => {});
          return;
        }

        const data = await res.json();
        const text = _parseAIText(data)?.trim();
        if (isCurrent()) _reflectResult = _usableReflectionText(text, candidate);
      } catch (_e) {
        // silent
      } finally {
        // An old response must not overwrite a new result or clear its pending state.
        if (isCurrent()) {
          _reflectPending = false;
          _refreshMemoryBlock();
        } else {
          _refreshOpenMemory();
        }
      }
    }

    // Dropbox sync
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

      // Outcome-only sync updates can change the relationship too.
      _refreshOpenMemory();

      return changed;
    }

    document.addEventListener('today:reflection-evidence-change', _refreshOpenMemory);
    window.addEventListener('storage', event => {
      if ([POLICY_KEY, DATA_KEY, CLEARED_KEY, 'today_memory'].includes(event.key)) _refreshOpenMemory();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) _refreshOpenMemory();
    });

    // Public API
    if (window.Today) {
      Today.define('reflections', {
        _reflectionShowAfterTriage,
        _reflectionMountInTriage,
        reflectionRemember,
        reflectionDecline,
        reflectionSelect,
        _reflectionRenderMemory,
        reflectionRememberAgain,
        reflectionReflect,
        _reflectionBackupFields,
        _reflectionMergeRemote,
        _reflectionClearFromAllMemory,
      });
      Today.ui.register('click', 'reflections.remember', reflectionRemember);
      Today.ui.register('click', 'reflections.decline', reflectionDecline);
      Today.ui.register('click', 'reflections.select', (_event, button) => reflectionSelect(button.dataset.feeling));
      Today.ui.register('click', 'reflections.remember-again', reflectionRememberAgain);
    }

  };
})();
