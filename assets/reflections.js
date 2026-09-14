// TODAY — opt-in post-triage reflections.
// Inert until index.html calls window._startReflections() before init().
(function() {
  'use strict';
  let started = false;
  window._startReflections = function() {
    if (started) return;
    started = true;

    const VALID_FEELINGS  = ['drained', 'tense', 'present', 'off', 'calm', 'alive'];
    const POLICY_KEY      = 'today_reflection_policy';
    const DATA_KEY        = 'today_reflections';
    const CLEARED_KEY     = 'today_reflections_cleared_at';
    const INTRO_KEY       = 'today_reflection_intro_seen_at'; // local-only, never synced
    const MAX_DAYS        = 30;
    const OFFER_COOLDOWN_DAYS = 7;

    // Relationship thresholds — defined once here, covered by tests, never tuned
    // against live user data. A feeling frequency by itself is not an insight: both
    // sides must be commitment-shaped evenings before HOW DAYS FELT may speak.
    const INSIGHT_MIN_GROUP       = 4;
    const INSIGHT_MIN_FEELING     = 3;
    const INSIGHT_MIN_DIFF_RATIO  = 0.30;

    // Transient session-only state (never persisted)
    let _reflectResult  = null;
    let _reflectPending = false;
    let _reflectTriggered = false; // auto-trigger fires once per session

    function _parseAIText(data) {
      if (data.error) return null;
      return (data.content || data.message || '').trim().replace(/^["']+|["']+$/g, '') || null;
    }

    function _usableReflectionText(text, candidate) {
      const clean = text?.trim();
      if (!clean || clean.toLowerCase() === 'none') return null;
      if (clean.split(/\s+/).length > 24) return null;
      if (!/[.!?…]$/.test(clean)) return null;
      if (!/\b(reflected|reflections)\b/i.test(clean)) return null;
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
        `TODAY can remember these reflections for 30 days and notice patterns over time. They stay on this device, and in your Dropbox if you connect it. If you connect AI, it sees one combined pattern—not individual evenings—when you open Memory.</p>` +
        `<div class="reflection-consent-actions">` +
        `<button class="reflection-consent-btn accent" data-today-click="reflections.remember">Remember</button>` +
        `<button class="reflection-consent-btn neutral" data-today-click="reflections.decline">Not for me</button>` +
        `</div></div>`;
    }

    function _buildQuestionHTML() {
      return `<div class="reflection-question">Beyond what got done, how did today feel?</div>` +
        `<div class="reflection-feelings" role="group" aria-label="How today felt">` +
        VALID_FEELINGS.map(f =>
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

      // The selected whole word becomes the confirmation; storage and feedback are
      // immediate, while the visual transition remains non-blocking.
      const el = document.getElementById('triageReflection');
      const button = el?.querySelector(`.reflection-feeling-btn[data-feeling="${feeling}"]`);
      _animateReflectionChoice(el, button, feeling);
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

      const block = document.createElement('div');
      block.className = 'memory-type-block reflection-memory-block';
      block.id = 'reflectionMemoryBlock';

      let inner = `<div class="memory-type-header">` +
        `<span class="memory-type-name">HOW DAYS FELT</span>` +
        `<span class="memory-type-desc">— a separate sensitive record of evening reflections</span>` +
        `</div>`;

      if (!policy || policy.choice === 'not_for_me') {
        inner += `<div class="memory-item"><span class="memory-item-text">Reflections are not remembered.</span></div>` +
          `<div style="margin-top:var(--space-2);padding-bottom:var(--space-2)">` +
          `<button class="triage-undo-btn" data-today-click="reflections.remember-again">Remember reflections</button>` +
          `</div>`;
      } else {
        // policy.choice === 'remember'
        const s = list.length === 1 ? '' : 's';
        inner += `<div class="memory-item"><span class="memory-item-text">${
          list.length > 0
            ? `${list.length} evening${s} — last ${MAX_DAYS} days.`
            : `Remembering the last ${MAX_DAYS} days.`
        }</span></div>`;

        const candidate = _buildReflectionCandidate(list);
        const aiReady = Today.use('connections')._aiIsConfigured();
        if (candidate && aiReady) {
          if (_reflectPending) {
            inner += `<div class="memory-item"><span class="memory-item-text memory-abstracting">reflecting…</span></div>`;
          } else if (_reflectResult) {
            inner += `<div class="memory-item"><span class="memory-item-text">${esc(_reflectResult)}</span></div>`;
          } else if (!_reflectTriggered) {
            // Auto-trigger once per session — show placeholder immediately, fire async
            inner += `<div class="memory-item"><span class="memory-item-text memory-abstracting">reflecting…</span></div>`;
            _reflectTriggered = true;
            setTimeout(() => reflectionReflect(candidate), 0);
          }
        }
      }

      block.innerHTML = inner;
      container.appendChild(block);
    }

    // ── On-device relationship selection ────────────────────────────────────
    // The sensitive records are joined only here, by date, and never persisted.
    // A frequency table is not a candidate. Both sides must describe a different
    // relationship with commitments; the AI receives only the winning aggregate.

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

      // Cleanly separate evenings with only one kind of completed commitment.
      // Mixed evenings belong to neither side: assigning them to both would blur
      // the contrast and make a stronger-looking result out of ambiguous evidence.
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

      // Letting go is itself a decision about a commitment. Contrast it with
      // evenings that contain a completion and no release, not with inactive days.
      const letgo = group(rows => rows.some(e => e.outcome === 'letgo'));
      const finishedWithoutLetgo = group(rows =>
        rows.some(e => e.outcome === 'done') && !rows.some(e => e.outcome === 'letgo'));
      const releaseCandidate = _buildFeelingComparison(
        'feeling-vs-release', 100, letgo, finishedWithoutLetgo,
        'after letting something go',
        'after finishing without letting anything go');
      if (releaseCandidate) candidates.push(releaseCandidate);

      // Focus sessions are a distinct commitment signal — applying deliberate
      // attention to a task. Backfilled rows carry focusSessions: 0 (unknown),
      // so only evenings with at least one real (non-backfilled) outcome row
      // contribute to this partition; evenings with only backfilled rows are excluded.
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
        'after a focused day',
        'after a day without focus');
      if (focusCandidate) candidates.push(focusCandidate);

      // Reviving a task is re-committing to something previously released.
      // Contrast with evenings that had completions but no revivals.
      const reviveEvenings = group(rows => rows.some(e => e.outcome === 'revive'));
      const finishedNoRevive = group(rows =>
        rows.some(e => e.outcome === 'done') && !rows.some(e => e.outcome === 'revive'));
      const reviveCandidate = _buildFeelingComparison(
        'feeling-vs-revive', 90, reviveEvenings, finishedNoRevive,
        'after reviving something',
        'after finishing without reviving anything');
      if (reviveCandidate) candidates.push(reviveCandidate);

      return candidates.sort((a, b) => b.score - a.score)[0] || null;
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

    async function reflectionReflect(selectedCandidate) {
      const list = _loadReflections();
      const candidate = selectedCandidate || _buildReflectionCandidate(list);
      if (!candidate) return;
      if (!Today.use('connections')._aiIsConfigured()) return;
      if (!navigator.onLine) return;

      _reflectPending = true;
      _reflectResult  = null;
      _refreshMemoryBlock();

      try {
        // One code-selected aggregate relationship only — no task text, full
        // feeling distribution, raw dates, identifiers, or unselected candidates.
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
          'Write exactly one complete sentence under 24 words. ' +
          'Begin "On evenings you reflected," and say the named feeling appeared more often. ' +
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
        _reflectResult = _usableReflectionText(text, candidate);
      } catch (_e) {
        // silent
      } finally {
        _reflectPending = false;
        _refreshMemoryBlock();
      }
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
