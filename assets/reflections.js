(function() {
  'use strict';
  let started = false;
  window._startReflections = function() {
    if (started) return;
    started = true;

    const OFFERED_FEELINGS = [
      'joyful',  'scattered',
      'alive',   'tense',
      'content', 'frustrated',
      'calm',    'drained',
      'present', 'sad',
    ];
    const VALID_FEELINGS  = [...OFFERED_FEELINGS, 'off'];
    const POLICY_KEY      = 'today_reflection_policy';
    const DATA_KEY        = 'today_reflections';
    const CLEARED_KEY     = 'today_reflections_cleared_at';
    const INTRO_KEY       = 'today_reflection_intro_seen_at'; // local-only, never synced
    const FEEDBACK_KEY = 'today_reflection_feedback';
    const FEEDBACK_CLEAR_KEY = 'today_reflection_feedback_cleared_at';
    const MAX_DAYS        = 30;
    const OFFER_COOLDOWN_DAYS = 7;

    const INSIGHT_MIN_GROUP       = 4;
    const INSIGHT_MIN_FEELING     = 3;
    const INSIGHT_MIN_DIFF_RATIO  = 0.30;

    let _reflectResult  = null;
    let _reflectPending = false;
    let _reflectTriggered = false; // at most one attempt per evidence snapshot
    let _reflectAttempted = false;
    let _reflectEvidence = null;
    let _reflectEpoch = 0;
    let _feedbackPolicy, _feedbackLoading, _currentReading, _wording;
    let _feedbackOpen = false, _feedbackAck = null, _feedbackError = false;
    let _sourceReady = !localStorage.getItem('dropbox_token');
    function _loadFeedbackPolicy() {
      if (!_feedbackLoading) _feedbackLoading = import('./feedback-policy.js').then(() => {
        _feedbackPolicy = Today.use('feedback-policy');
        import('./reflection-wording.js').then(() => {
          _wording = Today.use('reflection-wording');
          _wording.init({evidence:_reconcileEvidence, current:()=>_currentReading, save:_saveFeedback,
            stamp:_feedbackStamp, refresh:()=>{_refreshOpenMemory();_refreshMemoryBlock();},
            sync:_feedbackSaveRemote, announce:text=>window._a11yAnnounce?.(text)});
          if (document.getElementById('memoryPanel')?.classList.contains('open')) _refreshMemoryBlock();
        }).catch(()=>{});
        _refreshOpenMemory();
        return _feedbackPolicy;
      }).catch(() => { _feedbackLoading = null; return null; });
      return _feedbackLoading;
    }
    function _feedbackStore() {
      const raw = safeJSON(FEEDBACK_KEY, null);
      return raw?.version === 1 && Array.isArray(raw.records)
        ? { version:1, consentAt:typeof raw.consentAt === 'string' ? raw.consentAt : '',
          records:raw.records.filter(r => r && typeof r === 'object').slice(0,120) }
        : { version:1, consentAt:'', records:[] };
    }
    function _saveFeedback(store) {
      try { localStorage.setItem(FEEDBACK_KEY, JSON.stringify(store)); return true; }
      catch (_) { return false; }
    }
    function _feedbackSaveRemote() {
      if (typeof _setLastLocalChange === 'function') _setLastLocalChange();
      if (typeof dropboxAutoSave === 'function') dropboxAutoSave();
    }
    function _feedbackStamp(previous = '') {
      return new Date(Math.max(Date.now(), Date.parse(previous) + 1 || 0)).toISOString();
    }

    function _parseAIText(data) {
      if (data.error) return null;
      return (data.content || data.message || '').trim().replace(/^["']+|["']+$/g, '') || null;
    }

    function _usableReflectionText(text, candidate) {
      return _feedbackPolicy?.usableReflectionText(text, candidate, VALID_FEELINGS);
    }

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

    function _reflectionShowAfterTriage() {
      const policy = _loadPolicy();

      if (policy && policy.choice === 'not_for_me') {
        return { visible: false };
      }
      if (policy && policy.choice === 'remember') {
        return _getTodayReflection() ? { visible: false } : { visible: true, timeoutMs: 6000 };
      }
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

    function _buildIntroHTML() {
      return `<div class="reflection-intro">` +
        `<p class="reflection-intro-copy"><strong>Remember how days felt?</strong><br>` +
        `TODAY can remember these reflections for 30 days and notice patterns over time. They stay on this device, and in your Dropbox if you connect it. If you connect AI, it sees one combined pattern—not individual evenings—when you open Memory. You can also save feedback on an insight for up to 30 days.</p>` +
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
      _clearFeedback();
      _savePolicy('not_for_me');
      _refreshOpenMemory();
      if (typeof _setLastLocalChange === 'function') _setLastLocalChange();
      if (typeof dropboxAutoSave === 'function') dropboxAutoSave();

      const el = document.getElementById('triageReflection');
      if (el) el.innerHTML = '';

      if (typeof window._triageResetAutoClose === 'function') window._triageResetAutoClose(3000);
    }

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

      const el = document.getElementById('triageReflection');
      const button = el?.querySelector(`.reflection-feeling-btn[data-feeling="${feeling}"]`);
      _animateReflectionChoice(el, button, feeling);
      const undoBtn = document.getElementById('triageUndoBtn');
      if (undoBtn) undoBtn.style.display = 'none';

      if (typeof window._triageResetAutoClose === 'function') window._triageResetAutoClose(3000);
    }

    function _reflectionRenderMemory(container) {
      if (!container) return;

      if (!_feedbackPolicy) _loadFeedbackPolicy();

      const evidence = _reconcileEvidence();
      const { policy, candidate } = evidence;
      const remembers = policy?.choice === 'remember';
      if (remembers && !_sourceReady) return;
      const canReflect = candidate && Today.use('connections')._aiIsConfigured() && navigator.onLine;
      if (remembers) {
        if (_feedbackAck && document.getElementById('memoryPanel')?.classList.contains('open')) {
          const ack = document.createElement('div'); ack.id = 'reflectionMemoryBlock'; ack.className = 'memory-type-block reflection-memory-block';
          ack.innerHTML = `<div class="memory-type-header"><span class="memory-type-name">HOW DAYS FELT</span></div>` +
            (_reflectResult ? `<div class="memory-item"><span class="memory-item-text" style="color:var(--muted)">${esc(_reflectResult)}</span></div>` : '') +
            `<div class="nudge-react open reflection-reaction"><span class="memory-empty" role="status">not really</span><button class="nudge-react-btn" data-today-click="reflections.feedback-undo">undo</button></div>`;
          container.appendChild(ack); return;
        }
        if (!candidate) return;
        if (!_reflectResult && !_reflectPending && !_reflectTriggered && canReflect) {
          _reflectTriggered = true;
          const key = evidence.key;
          setTimeout(() => reflectionReflect(key), 0);
        }
        if (!_reflectResult && !_reflectPending && !(_reflectTriggered && canReflect && !_reflectAttempted)) return;
      }

      const block = document.createElement('div');
      block.className = 'memory-type-block reflection-memory-block';
      block.id = 'reflectionMemoryBlock';
      let inner = `<div class="memory-type-header"><span class="memory-type-name">HOW DAYS FELT</span></div>`;
      if (!remembers) {
        inner += `<div class="memory-item"><span class="memory-item-text">TODAY doesn’t keep reflections.</span>` +
          `<button type="button" class="memory-item-btn" data-today-click="reflections.remember-again">remember</button></div>`;
      } else {
        if (_reflectResult && _currentReading) {
          const r = _currentReading;
          // Persist only a reading actually rendered after explicit feedback consent.
          const store = evidence.feedback;
          if (store.consentAt && !store.records.some(row => row.id === r.id)
              && document.getElementById('memoryPanel')?.classList.contains('open')) {
            const records = _feedbackPolicy.mergeRecords([...store.records,r],[],evidence.options);
            if (records.some(row => row.id === r.id) && _saveFeedback({ ...store, records })) _feedbackSaveRemote();
          }
          inner += `<div class="memory-item"><button type="button" class="memory-item-text reflection-reading" data-today-click="reflections.feedback-open" aria-expanded="${_feedbackOpen}" aria-controls="reflectionReaction">${esc(_reflectResult)}</button></div>` +
            `<div id="reflectionReaction"${_feedbackOpen ? '' : ' hidden'}>` +
            (!store.consentAt ? `<p class="memory-empty">Your vote keeps this insight for up to 30 days, on this device and in Dropbox if connected.</p>` : '') +
            `<div class="nudge-react open reflection-reaction" role="group" aria-label="Did this feeling insight land?">` +
            ['landed','missed'].map(choice => `<button type="button" class="nudge-react-btn${r.reaction === choice ? ' on' : ''}" aria-pressed="${r.reaction === choice}" data-today-click="reflections.feedback-vote" data-reaction="${choice}" data-reading-id="${r.id}">${choice === 'landed' ? 'landed' : 'not really'}</button>`).join('') + `</div>` +
            (_feedbackError ? `<p class="memory-empty" role="status">Couldn’t save feedback. Try again.</p>` : '') + (_wording?.render(r, store.records) || '') + `</div>`;
        } else inner += `<div class="memory-item"><span class="memory-item-text memory-abstracting">${_reflectResult ? esc(_reflectResult) : 'reflecting…'}</span></div>`;
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
          more_dates: (moreIsA ? groupA : groupB).map(r => r.date),
          less_dates: (moreIsA ? groupB : groupA).map(r => r.date),
        };
        if (!winner || candidate.score > winner.score) winner = candidate;
      }
      return winner;
    }

    function _buildReflectionCandidate(list, feedback = []) {
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

      const reviveEvenings = group(rows => rows.some(e => e.outcome === 'revive'));
      const finishedNoRevive = group(rows =>
        rows.some(e => e.outcome === 'done') && !rows.some(e => e.outcome === 'revive'));
      const reviveCandidate = _buildFeelingComparison(
        'feeling-vs-revive', 90, reviveEvenings, finishedNoRevive,
        'when you brought a task back from Past',
        'when you finished tasks without bringing one back');
      if (reviveCandidate) candidates.push(reviveCandidate);

      return candidates.sort((a, b) => b.score - a.score)
        .find(candidate => !_feedbackPolicy?.suppressed(candidate, feedback)) || null;
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
      const versions = Object.fromEntries(list.map(r => {
        const value = JSON.stringify([r.feeling,canonical(outcomes.filter(row => row[0] === r.date))]);
        return [r.date,_feedbackPolicy ? _feedbackPolicy.fingerprint(value) : value];
      }));
      const raw = _feedbackStore();
      const feedbackCleared = localStorage.getItem(FEEDBACK_CLEAR_KEY) || '';
      const generation = JSON.stringify([policy?.updatedAt || '', cleared, feedbackCleared]);
      const options = { today:_localISO(), generation, clearedAt:feedbackCleared, versions, sourcesReady:_sourceReady };
      const consentAt = _feedbackPolicy?.stamp(raw.consentAt) && raw.consentAt >= (policy?.updatedAt || '')
        && (!cleared || raw.consentAt > cleared) ? raw.consentAt : '';
      const feedback = { version:1, consentAt, records: policy?.choice === 'remember' && consentAt && _feedbackPolicy
        ? _feedbackPolicy.mergeRecords(raw.records, [], options) : [] };
      const key = JSON.stringify([_localISO(), _sourceReady, policy?.choice, policy?.updatedAt, cleared,
        canonical(list.map(r => [r.date, r.feeling, r.updatedAt])), canonical(outcomes), feedbackCleared,
        consentAt, feedback.records.map(r => [r.id,r.reactedAt,r.reaction])]);
      return { key, policy, list, versions, generation, options, feedback,
        candidate: policy?.choice === 'remember' ? _buildReflectionCandidate(list, feedback.records) : null };
    }

    function _reconcileEvidence() {
      const evidence = _reflectionEvidence();
      if (_feedbackPolicy && _sourceReady && localStorage.getItem(FEEDBACK_KEY)
          && JSON.stringify(_feedbackStore()) !== JSON.stringify(evidence.feedback)) _saveFeedback(evidence.feedback);
      if (_reflectEvidence !== evidence.key) {
        _reflectEvidence = evidence.key;
        _reflectEpoch++;
        _reflectResult = null;
        _currentReading = null;
        _reflectPending = false;
        _reflectTriggered = false;
        _reflectAttempted = false;
      }
      if (!_reflectResult && evidence.candidate && _feedbackPolicy) {
        const kept = _feedbackPolicy.canonicalReading(evidence.candidate, evidence.versions, evidence.feedback.records);
        if (kept && _usableReflectionText(kept.text, evidence.candidate)) {
          _currentReading = kept; _reflectResult = kept.text; _reflectAttempted = true;
        }
      }
      return evidence;
    }

    function _refreshOpenMemory() {
      if (_loadPolicy()?.choice !== 'remember' && localStorage.getItem(FEEDBACK_KEY)) {
        localStorage.removeItem(FEEDBACK_KEY); endFeedbackVisit();
      }
      const previous = _reflectEvidence;
      const evidence = _reconcileEvidence();
      if (_feedbackAck && !evidence.feedback.records.some(r => r.id === _feedbackAck.id && r.reaction === 'missed')) _feedbackAck = null;
      if (previous !== evidence.key && document.getElementById('memoryPanel')?.classList.contains('open')) _refreshMemoryBlock();
    }

    function _reflectionClearFromAllMemory() {
      _clearFeedback();
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
      const restoreWording = _wording?.preserve();
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
        const coverage = [...container.children].find(el => el.querySelector('.memory-type-name')?.textContent === 'WHAT TODAY HAS SEEN');
        if (tmp.firstChild) container.insertBefore(tmp.firstChild, coverage || document.getElementById('dreamMemoryBlock'));
      }
      renderFeedbackFooter();
      restoreWording?.();
    }

    function endFeedbackVisit() { _feedbackAck = null; _feedbackOpen = false; _feedbackError = false; _wording?.endVisit(); }
    function _clearFeedback(keepConsent = false) {
      const store = _feedbackStore();
      const previous = [localStorage.getItem(FEEDBACK_CLEAR_KEY) || '',
        ...store.records.flatMap(r => [r.createdAt || '',r.reactedAt || '',r.wordingAt || ''])].sort().at(-1);
      localStorage.setItem(FEEDBACK_CLEAR_KEY, _feedbackStamp(previous));
      _saveFeedback({ version:1, consentAt:keepConsent ? store.consentAt : '', records:[] });
      endFeedbackVisit();
    }
    function feedbackOpen() {
      _feedbackOpen = !_feedbackOpen; _refreshMemoryBlock();
      document.querySelector('#reflectionMemoryBlock .reflection-reading')?.focus();
    }
    function feedbackVote(id, choice) {
      const evidence = _reconcileEvidence();
      if (!_sourceReady || evidence.policy?.choice !== 'remember' || !_feedbackPolicy) return;
      const row = evidence.feedback.records.find(r => r.id === id) || (_currentReading?.id === id ? _currentReading : null);
      if (!row || (row.expired && choice !== null)) return;
      const next = choice === row.reaction ? null : choice;
      if (![null,'landed','missed'].includes(next)) return;
      const at = _feedbackStamp([row.reactedAt,row.createdAt].sort().at(-1));
      const updated = { ...row, reaction:next, reactedAt:at,
        votedThrough:Object.keys(evidence.versions).sort().at(-1) || row.seenThrough };
      const records = _feedbackPolicy.mergeRecords(evidence.feedback.records.filter(r => r.id !== id),[updated],evidence.options);
      const store = { ...evidence.feedback, consentAt:evidence.feedback.consentAt || at, records };
      if (!records.some(r => r.id === id && r.reaction === next) || !_saveFeedback(store)) {
        _feedbackError = true; _refreshMemoryBlock(); return;
      }
      _feedbackError = false;
      _feedbackAck = next === 'missed' ? { id } : null;
      _feedbackOpen = true;
      _refreshOpenMemory(); _refreshMemoryBlock(); _feedbackSaveRemote();
      const target = _feedbackAck ? '[data-today-click="reflections.feedback-undo"]'
        : `#reflectionMemoryBlock [data-reaction="${choice}"]`;
      document.querySelector(target)?.focus();
    }
    function feedbackUndo() {
      const id = _feedbackAck?.id;
      if (id) feedbackVote(id, null);
    }
    function feedbackClear() {
      _clearFeedback(true); _refreshOpenMemory(); _refreshMemoryBlock(); _feedbackSaveRemote();
      document.querySelector('#memoryFooter .memory-clear-btn')?.focus();
    }
    function renderFeedbackFooter() {
      const wasOpen = document.querySelector('#reflectionFeedbackManage')?.open || false;
      document.querySelector('#reflectionFeedbackManage')?.remove();
      const evidence = _reflectionEvidence();
      const rows = evidence.feedback.records.filter(r => (r.reactedAt && r.reaction !== null) || r.wordingReaction || _wording?.hasUndo(r));
      if (!_sourceReady || evidence.policy?.choice !== 'remember' || !rows.length) return;
      const block = document.getElementById('reflectionMemoryBlock') || document.getElementById('memoryFooter');
      if (!block) return;
      const details = document.createElement('details'); details.id = 'reflectionFeedbackManage'; details.open = wasOpen;
      details.className = 'reflection-feedback-manage';
      details.innerHTML = `<summary class="memory-conn-link">feeling feedback</summary>` + rows.map(r =>
        `<div class="memory-type-block"><p class="memory-item-text">${r.expired ? 'Earlier feeling insight — source records have expired.' : esc(r.text)}</p>` +
        `<div class="nudge-react open reflection-reaction" role="group" aria-label="Review feedback on this feeling insight">` +
        (r.expired ? '' : ['landed','missed'].map(choice => `<button type="button" class="nudge-react-btn${r.reaction === choice ? ' on' : ''}" aria-pressed="${r.reaction === choice}" data-today-click="reflections.feedback-review" data-reading-id="${r.id}" data-reaction="${choice}">${choice === 'landed' ? 'landed' : 'not really'}</button>`).join('')) +
        `<button type="button" class="nudge-react-btn" data-today-click="reflections.feedback-review" data-reading-id="${r.id}" data-reaction="clear">clear vote</button></div>${_wording?.render(r, rows) || ''}</div>`).join('') +
        `<button type="button" class="memory-clear-btn" data-today-click="reflections.feedback-clear">clear feeling feedback</button>`;
      block.appendChild(details);
    }

    function reflectionRememberAgain() {
      _savePolicy('remember');
      _refreshOpenMemory();
      if (typeof _setLastLocalChange === 'function') _setLastLocalChange();
      if (typeof dropboxAutoSave === 'function') dropboxAutoSave();
    }

    async function reflectionReflect(expectedKey) {
      if (!_feedbackPolicy && !await _loadFeedbackPolicy()) return;
      const evidence = _reconcileEvidence();
      const { list, candidate } = evidence;
      if (expectedKey && expectedKey !== evidence.key) return;
      if (!_sourceReady || !candidate || _reflectPending || _reflectAttempted) return;
      if (!Today.use('connections')._aiIsConfigured() || !navigator.onLine) return;

      const epoch = _reflectEpoch;
      const guidance = _feedbackPolicy.wordingGuidance(evidence.feedback.records);
      const isCurrent = () => epoch === _reflectEpoch && evidence.key === _reflectionEvidence().key
        && guidance === _feedbackPolicy.wordingGuidance(_reflectionEvidence().feedback.records);
      _reflectTriggered = true;
      _reflectAttempted = true;
      _reflectPending = true;
      _reflectResult = null;
      _refreshMemoryBlock();

      try {
        const payload = {
          reflected_evenings_count: list.length,
          relationship: {
            kind:         candidate.kind,
            feeling:      candidate.feeling,
            more_context: _feedbackPolicy.dayContext(candidate.more_context),
            less_context: _feedbackPolicy.dayContext(candidate.less_context),
            more_evenings: { matching: candidate.more_count, total: candidate.more_total },
            less_evenings: { matching: candidate.less_count, total: candidate.less_total },
          },
        };

        const systemPrompt =
          'Code has selected one evidence-backed relationship between evening reflections and how the user handled commitments that day. ' +
          'Phrase only that relationship; do not search for another pattern. ' +
          'Write exactly one complete sentence of at most 40 words. ' +
          'Writing policy: reflected-days-v2. Begin "In your evening reflections," and clearly name the reported feeling and how often it appeared in the comparison. ' +
          'The contexts describe actions during the day; the feeling is the person’s evening report, not a feeling measured immediately after an action. ' +
          'Copy more_context and less_context verbatim, in that order, joined by "than". ' +
          'Do not narrate the numbers or mention any other feeling. ' +
          'Forbidden: causal language, diagnosis, scores, streaks, advice, predictions, clinical interpretation. ' +
          'Do not make up specific dates or tasks. ' +
          'Reply only as valid JSON in the exact shape {"message":"your sentence"}.' + (guidance ? ' ' + guidance : '');

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
        if (isCurrent()) {
          const accepted = _usableReflectionText(text, candidate);
          if (accepted) {
            const reading = await _feedbackPolicy.makeReading(candidate, evidence.versions, accepted, evidence.generation,
              _feedbackStamp(localStorage.getItem(FEEDBACK_CLEAR_KEY) || ''));
            if (isCurrent()) { _reflectResult = accepted; _currentReading = reading; }
          }
        }
      } catch (_e) {
      } finally {
        if (isCurrent()) {
          _reflectPending = false;
          _refreshMemoryBlock();
        } else {
          _refreshOpenMemory();
          if (epoch === _reflectEpoch) { _reflectPending = false; _refreshMemoryBlock(); }
        }
      }
    }

    function _reflectionBackupFields() {
      if (!_feedbackPolicy && localStorage.getItem(FEEDBACK_KEY)) _loadFeedbackPolicy().then(policy => { if (policy) _feedbackSaveRemote(); });
      const evidence = _reconcileEvidence();
      return {
        reflection_policy:      safeJSON(POLICY_KEY, null),
        reflections:            safeJSON(DATA_KEY,   []),
        reflections_cleared_at: localStorage.getItem(CLEARED_KEY) || '',
        reflection_feedback: evidence.policy?.choice !== 'remember' ? { version:1,consentAt:'',records:[] }
          : _feedbackPolicy ? (_sourceReady ? evidence.feedback : _feedbackStore()) : { version:1,consentAt:'',records:[] },
        reflection_feedback_cleared_at: localStorage.getItem(FEEDBACK_CLEAR_KEY) || '',
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

      merged = _pruneReflections(merged);

      const sorted       = list => list.slice().sort((a, b) => a.date.localeCompare(b.date));
      const localSerial  = JSON.stringify(sorted(localList));
      const mergedSerial = JSON.stringify(sorted(merged));
      if (mergedSerial !== localSerial) {
        _saveReflections(merged);
        changed = true;
      }

      const mergeFeedback = () => {
        if (!_feedbackPolicy) return false;
        const previousClear = localStorage.getItem(FEEDBACK_CLEAR_KEY) || '';
        const clear = [previousClear, data.reflection_feedback_cleared_at]
          .filter(value => _feedbackPolicy.stamp(value)).sort().at(-1) || '';
        if (clear) localStorage.setItem(FEEDBACK_CLEAR_KEY, clear);
        const local = _feedbackStore(), remote = data.reflection_feedback;
        const current = _reflectionEvidence();
        const consentAt = [local.consentAt,remote?.version === 1 ? remote.consentAt : '']
          .filter(value => _feedbackPolicy.stamp(value)).sort().at(-1) || '';
        const permitted = consentAt >= (current.policy?.updatedAt || '') && consentAt > (localStorage.getItem(CLEARED_KEY) || '');
        const records = current.policy?.choice === 'remember' && permitted
          ? _feedbackPolicy.mergeRecords(local.records, remote?.version === 1 ? remote.records : [], current.options) : [];
        const mergedStore = { version:1, consentAt:current.policy?.choice === 'remember' && permitted ? consentAt : '', records };
        const changed = JSON.stringify(mergedStore) !== JSON.stringify(local);
        if (changed) _saveFeedback(mergedStore);
        return changed || clear !== previousClear;
      };
      if (_feedbackPolicy) { if (mergeFeedback()) changed = true; }
      else if (data.reflection_feedback || data.reflection_feedback_cleared_at || localStorage.getItem(FEEDBACK_KEY)) {
        _loadFeedbackPolicy().then(() => { if (mergeFeedback()) { _refreshOpenMemory(); _refreshMemoryBlock(); _feedbackSaveRemote(); } });
      }
      _refreshOpenMemory();
      if (changed) _refreshMemoryBlock();
      renderFeedbackFooter();

      return changed;
    }

    document.addEventListener('today:reflection-evidence-change', _refreshOpenMemory);
    document.addEventListener('today:memory-ready', event => {
      _sourceReady = !!event.detail?.ready; _refreshOpenMemory();
    });
    window.addEventListener('storage', event => {
      if ([POLICY_KEY, DATA_KEY, CLEARED_KEY, FEEDBACK_KEY, FEEDBACK_CLEAR_KEY, 'today_memory'].includes(event.key)) {
        _refreshOpenMemory(); if (event.key === FEEDBACK_KEY) _refreshMemoryBlock(); renderFeedbackFooter();
      }
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
        renderFeedbackFooter,
        endFeedbackVisit,
      });
      Today.ui.register('click', 'reflections.remember', reflectionRemember);
      Today.ui.register('click', 'reflections.decline', reflectionDecline);
      Today.ui.register('click', 'reflections.select', (_event, button) => reflectionSelect(button.dataset.feeling));
      Today.ui.register('click', 'reflections.remember-again', reflectionRememberAgain);
      Today.ui.register('click', 'reflections.feedback-open', feedbackOpen);
      Today.ui.register('click', 'reflections.feedback-vote', (_event, button) => feedbackVote(button.dataset.readingId, button.dataset.reaction));
      Today.ui.register('click', 'reflections.feedback-undo', feedbackUndo);
      Today.ui.register('click', 'reflections.feedback-clear', feedbackClear);
      Today.ui.register('click', 'reflections.feedback-review', (_event, button) => {
        feedbackVote(button.dataset.readingId, button.dataset.reaction === 'clear' ? null : button.dataset.reaction);
        const details = document.getElementById('reflectionFeedbackManage');
        if (details) { details.open = true; details.querySelector('summary')?.focus(); }
        else document.querySelector('#memoryFooter .memory-clear-btn')?.focus();
      });
    }
    // Existing derived data must expire even if Memory is never opened again.
    if (localStorage.getItem(FEEDBACK_KEY)) _loadFeedbackPolicy().then(() => _reconcileEvidence());

  };
})();
