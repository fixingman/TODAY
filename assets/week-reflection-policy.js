// TODAY — pure evidence policy for the Sunday weekly reflection.
//
// This file deliberately has no DOM, storage, network, or app-state dependencies.
// The browser receives the two helpers as globals; Node tests require the same
// implementation directly, so threshold/ranking tests do not need Puppeteer.
(function(root, factory) {
  'use strict';
  const policy = factory();
  root._buildWeekReflectionInsight = policy._buildWeekReflectionInsight;
  root._weekReflectionTextIsGrounded = policy._weekReflectionTextIsGrounded;
  root._buildObservationCandidates = policy._buildObservationCandidates;
  root._buildOutcomeCandidates = policy._buildOutcomeCandidates;
  root._observationNoveltyGate = policy._observationNoveltyGate;
  root._observationGateExplain = policy._observationGateExplain;
  root._observationTextIsGrounded = policy._observationTextIsGrounded;
  root._observationEligibleFor = policy._observationEligibleFor;
  if (typeof module === 'object' && module.exports) module.exports = policy;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function _buildWeekCandidates(stats) {
    const days = (((stats && stats.days) || [])).filter(d => d && d.tasks !== null && d.tasks !== undefined);
    if (days.length < 4) return [];

    const candidates = [];
    const avg = (items, field) => items.length
      ? items.reduce((sum, item) => sum + (Number(item[field]) || 0), 0) / items.length
      : 0;
    const oneDecimal = n => Number(n.toFixed(1));

    // Strongest weekly lever: a within-week relationship between focus and
    // completion. This is phrased as association, never causation.
    const focusDays = days.filter(d => (d.focus || 0) >= 5);
    const otherDays = days.filter(d => (d.focus || 0) < 5);
    if (focusDays.length >= 2 && otherDays.length >= 2) {
      const focusAvg = avg(focusDays, 'tasks');
      const otherAvg = avg(otherDays, 'tasks');
      if (focusAvg - otherAvg >= 1 && focusAvg >= Math.max(1.4 * otherAvg, 1.5)) {
        candidates.push({
          kind: 'focus-leverage',
          score: 110 + Math.min(20, Math.round((focusAvg - otherAvg) * 5)),
          evidence: `On ${focusDays.length} focus days this week, completions averaged ${oneDecimal(focusAvg)}; on ${otherDays.length} other recorded days, ${oneDecimal(otherAvg)}.`,
          contrast: 'Focus days coincided with a stronger completion rhythm this week.',
        });
      }
    }

    // Habit alignment is useful only with observations on both sides. A perfect
    // streak alone is praise; a repeatable relationship can teach something.
    const habitDays = days.filter(d => (d.habitsTotal || 0) > 0);
    const heldDays = habitDays.filter(d => d.habitsKept >= d.habitsTotal);
    const missedDays = habitDays.filter(d => d.habitsKept < d.habitsTotal);
    if (heldDays.length >= 2 && missedDays.length >= 2) {
      const heldAvg = avg(heldDays, 'tasks');
      const missedAvg = avg(missedDays, 'tasks');
      if (heldAvg - missedAvg >= 1 && heldAvg >= Math.max(1.4 * missedAvg, 1.5)) {
        candidates.push({
          kind: 'habit-alignment',
          score: 100 + Math.min(15, Math.round((heldAvg - missedAvg) * 4)),
          evidence: `On ${heldDays.length} days every habit held, completions averaged ${oneDecimal(heldAvg)}; on ${missedDays.length} other habit days, ${oneDecimal(missedAvg)}.`,
          contrast: 'Habit consistency and task momentum moved together this week.',
        });
      }
    }

    // A day earns personality when this week's standout repeats a longer-lived
    // rhythm. A single busy Tuesday is not a Tuesday pattern.
    const rankedDays = [...days].sort((a, b) => (b.tasks || 0) - (a.tasks || 0));
    const top = rankedDays[0];
    const uniqueTop = top && (rankedDays.length === 1 || (top.tasks || 0) > (rankedDays[1].tasks || 0));
    if (uniqueTop && (top.tasks || 0) >= 2) {
      const currentDates = new Set(days.map(d => d.iso));
      const prior = (stats.history || []).filter(e => e && e.date && !currentDates.has(e.date));
      const [year, month, date] = String(top.iso || '').split('-').map(Number);
      const topDow = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(date)
        ? new Date(year, month - 1, date).getDay() : -1;
      const sameDow = prior.filter(e => {
        const [entryYear, entryMonth, entryDate] = String(e.date).split('-').map(Number);
        return new Date(entryYear, entryMonth - 1, entryDate).getDay() === topDow;
      });
      const priorAvg = avg(prior, 'tasksDone');
      const sameAvg = avg(sameDow, 'tasksDone');
      const weekAvg = avg(days, 'tasks');
      if (topDow >= 0 && sameDow.length >= 2 && sameAvg >= Math.max(1.25 * priorAvg, 1) && (top.tasks || 0) >= Math.max(1.25 * weekAvg, 2)) {
        const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][topDow];
        candidates.push({
          kind: 'recurring-day',
          score: 90 + Math.min(10, sameDow.length),
          evidence: `${dayName} led this week with ${top.tasks} completions and has averaged ${oneDecimal(sameAvg)} across ${sameDow.length} earlier recorded ${dayName}s.`,
          contrast: `${dayName} is becoming a reliably strong day, not just a one-off.`,
        });
      }
    }

    // A lopsided week can reveal working rhythm, but this is deliberately the
    // weakest candidate: it loses to any relationship or recurring pattern.
    const totalTasks = days.reduce((sum, d) => sum + (d.tasks || 0), 0);
    const topTwoTasks = rankedDays.slice(0, 2).reduce((sum, d) => sum + (d.tasks || 0), 0);
    if (days.length >= 6 && totalTasks >= 8 && topTwoTasks / totalTasks >= 0.7) {
      candidates.push({
        kind: 'bursts',
        score: 65,
        evidence: `${topTwoTasks} of ${totalTasks} completions happened on the week's two busiest days.`,
        contrast: 'The week moved in concentrated bursts rather than at an even pace.',
      });
    }

    return candidates;
  }

  // Unchanged public behaviour for Sunday: the single best week-derived candidate.
  function _buildWeekReflectionInsight(stats) {
    return _buildWeekCandidates(stats || {}).sort((a, b) => b.score - a.score)[0] || null;
  }

  // ── 12c: candidates derived from appMemory.taskOutcomes ─────────────────────
  // Every kind here is a *windowed contrast*, which is why Phase 0 records dated
  // events rather than counters. Base scores are hand-assigned editorial judgment
  // about which kinds matter, not tuning — statistical significance is not
  // comparable across kinds with different null distributions, and is blind to
  // semantics. See memory/research/ObservationSelection.md.
  const _LETGO_LABELS = {
    not_relevant: 'not relevant any more',
    no_energy: 'no energy',
    lost_interest: 'lost interest',
    replaced: 'replaced by something else',
  };
  // Noun forms for naming the reasons that did NOT dominate.
  const _LETGO_SHORT = {
    not_relevant: 'relevance',
    no_energy: 'energy',
    lost_interest: 'interest',
    replaced: 'replacement',
  };

  function _outcomesWithin(outcomes, dayCount, todayISO) {
    if (!Array.isArray(outcomes)) return [];
    const base = todayISO ? new Date(todayISO) : new Date();
    if (isNaN(base.getTime())) return [];
    const floor = new Date(base);
    floor.setDate(floor.getDate() - dayCount);
    return outcomes.filter(e => {
      if (!e || !e.date) return false;
      const d = new Date(e.date);
      return !isNaN(d.getTime()) && d >= floor && d <= base;
    });
  }

  function _buildOutcomeCandidates(outcomes, todayISO, taskTexts) {
    const candidates = [];
    const win   = _outcomesWithin(outcomes, 30, todayISO);
    // letgo-return alone reads 45 days (below). The empty check must use the wider
    // window, or a log whose only events are 31–45 days old returns before reaching it.
    const win45 = _outcomesWithin(outcomes, 45, todayISO);
    if (!win45.length) return candidates;

    const sumFocus = list => list.reduce((n, e) => n + (Number(e.focusSessions) || 0), 0);
    // Strict equality, never truthiness: backfilled rows carry `obligation: null`
    // because they were reconstructed from dated counts with no text to test. A
    // `!e.obligation` test would silently file every unknown as "chosen".
    const obligation = win.filter(e => e.obligation === true);
    const chosen     = win.filter(e => e.obligation === false);

    // Where focus went, and where it did not. Observed rows only — backfilled ones
    // have no focus data, and counting their zeros would make this trivially true
    // ("all focus went to chosen work") out of missing data rather than evidence.
    const obligationObserved = obligation.filter(e => !e.backfilled);
    const chosenObserved     = chosen.filter(e => !e.backfilled);
    const obligationFocus = sumFocus(obligationObserved);
    const chosenFocus     = sumFocus(chosenObserved);
    if (obligationObserved.length >= 2 && chosenObserved.length >= 2 && chosenFocus >= 3 && obligationFocus === 0) {
      candidates.push({
        kind: 'focus-vs-obligation',
        score: 115,
        evidence: `Over 30 days, ${chosenFocus} focus sessions went to things you chose; the ${obligationObserved.length} framed as "have to" got none.`,
        contrast: 'Where focus went, and where it did not.',
      });
    }

    // Completion rate on the two kinds of commitment. Both sides need enough
    // samples for a rate to mean anything.
    if (obligation.length >= 4 && chosen.length >= 4) {
      const obligationDone = obligation.filter(e => e.outcome === 'done').length;
      const chosenDone     = chosen.filter(e => e.outcome === 'done').length;
      const gap = (chosenDone / chosen.length) - (obligationDone / obligation.length);
      if (gap >= 0.25) {
        candidates.push({
          kind: 'obligation-completion',
          score: 105,
          evidence: `You finished ${chosenDone} of ${chosen.length} things you chose, and ${obligationDone} of ${obligation.length} you framed as "have to".`,
          contrast: 'Two kinds of commitment, two different rates.',
        });
      }
    }

    // One reason accounting for most of what gets released — stated against how much
    // actually ended, so the let-go count reads as a share and not as a verdict on
    // volume. Can, on the first line this produced: "9 doesn't sound too bad to throw
    // away, considering how much tasks I usually consume." The contrast is the reasons
    // that did NOT fire — the second side this kind previously lacked; its old contrast
    // restated its own evidence.
    // Backfilled rows are fine here: reason and date are both genuinely observed.
    const allLetgos = win.filter(e => e.outcome === 'letgo');
    const letgos    = allLetgos.filter(e => e.reason);
    const ended     = win.filter(e => e.outcome === 'done').length + allLetgos.length;
    if (letgos.length >= 4) {
      const tally = {};
      for (const e of letgos) tally[e.reason] = (tally[e.reason] || 0) + 1;
      const [topReason, topCount] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
      if (topCount >= 3 && topCount / letgos.length >= 0.5) {
        const label  = _LETGO_LABELS[topReason] || String(topReason).replace(/_/g, ' ');
        const others = Object.keys(_LETGO_SHORT).filter(r => r !== topReason).map(r => _LETGO_SHORT[r]);
        const otherList = others.length > 1
          ? others.slice(0, -1).join(', ') + ' and ' + others[others.length - 1]
          : others.join('');
        candidates.push({
          kind: 'letgo-reason',
          score: 95,
          evidence: `You let go of ${allLetgos.length} of the ${ended} things that ended this month; ${topCount} of those were "${label}".`,
          contrast: otherList.charAt(0).toUpperCase() + otherList.slice(1) + ' barely figured.',
        });
      }
    }

    // Deferrals that come back. The person is the subject, not Soon.
    const pulls = win.filter(e => e.outcome === 'soon_pull');
    if (pulls.length >= 3) {
      candidates.push({
        kind: 'soon-pullback',
        score: 88,
        evidence: `You have pulled ${pulls.length} things back from Soon this month.`,
        contrast: 'What you defer tends to come back.',
      });
    }

    // What gets released, and what comes back — linked, not counted side by side.
    // A let-go and a revive of the same task share an id (a hash of the text, so it
    // matches across devices), which is what lets the log prove the relation without
    // storing any text. Backfilled rows carry synthetic ids and cannot link — an
    // unknown stays unknown. The release may precede the window, so it is looked up
    // across the whole log; only the return has to fall inside 45 days, and it has to
    // come after its release.
    //
    // 45 days, not 30: revive is a slow signal — a deliberate act, maybe once a month —
    // and slow signals earn a longer window rather than a lower floor. Cooldown is 30
    // so one window yields one firing. No release-volume floor: linking replaced it.
    //
    // Naming: the log has no text, but the caller may pass `taskTexts` ({ id: text })
    // hashed from the live lists. A revived task is usually still on one, so the loop
    // is named while it is on the list and falls back to counts once it is gone.
    const log = Array.isArray(outcomes) ? outcomes.filter(e => e && e.id && e.date) : [];
    const releasedBefore = (id, date) =>
      log.some(e => e.outcome === 'letgo' && e.id === id && e.date <= date);
    const returned = _outcomesWithin(outcomes, 45, todayISO)
      .filter(e => e.outcome === 'revive' && e.id && releasedBefore(e.id, e.date));
    if (returned.length >= 2) {
      const texts = (taskTexts && typeof taskTexts === 'object') ? taskTexts : {};
      const nameOf = id => {
        const t = String(texts[id] || '').trim();
        return t ? '"' + t.slice(0, 40) + '"' : null;
      };
      const perId = {};
      for (const e of returned) perId[e.id] = (perId[e.id] || 0) + 1;
      const [loopId, loopCount] = Object.entries(perId).sort((a, b) => b[1] - a[1])[0];
      if (loopCount >= 2) {
        // One task cycling is the sharper observation: released and retrieved, more than once.
        const name = nameOf(loopId);
        candidates.push({
          kind: 'letgo-return',
          score: 85,
          evidence: name
            ? `${name} has gone out and come back ${loopCount} times.`
            : `One thing you let go has come back ${loopCount} times.`,
          contrast: 'Let go, and back again.',
        });
      } else {
        const names = Object.keys(perId).map(nameOf).filter(Boolean).slice(0, 3);
        const list = names.length <= 1 ? names.join('')
          : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
        candidates.push({
          kind: 'letgo-return',
          score: 85,
          evidence: `Over 45 days, ${returned.length} things you had let go came back` + (list ? ' — ' + list : '') + '.',
          contrast: 'What you release, and what comes back.',
        });
      }
    }

    // What comes back, and whether it gets finished — the completion side of the loop
    // above, and the more useful one: it is evidence on whether letting go is safe.
    // Same linking (release → return), then a `done` for the same key on or after the
    // return. Done rows are keyed by the live task id, so from v2.84.0 every row also
    // carries `key` (the text hash) to link across that boundary; older done rows have
    // no key and simply do not link — the 45-day window heals it, no migration.
    // Threshold is 3 distinct tasks, stricter than letgo-return: two is a coincidence.
    // Replaces the same-day Noticed line "Brought back, and finished — …": a fact about
    // a task the user completed hours earlier, with no second side.
    const keyOf = e => e.key || e.id;
    const returnedKeys = [...new Set(returned.map(keyOf))];
    if (returnedKeys.length >= 3) {
      const finishedKeys = returnedKeys.filter(k =>
        returned.some(r => keyOf(r) === k &&
          log.some(e => e.outcome === 'done' && keyOf(e) === k && e.date >= r.date)));
      const total = returnedKeys.length, finished = finishedKeys.length;
      const texts = (taskTexts && typeof taskTexts === 'object') ? taskTexts : {};
      const names = finishedKeys.map(k => String(texts[k] || '').trim()).filter(Boolean)
        .map(t => '"' + t.slice(0, 40) + '"').slice(0, 3);
      const list = names.length <= 1 ? names.join('')
        : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
      if (finished === total) {
        candidates.push({
          kind: 'return-finished',
          score: 92,
          evidence: `Over 45 days, ${total} things you had let go came back` + (list ? ' — ' + list : '') + `. All ${total} got done.`,
          contrast: 'Let go, brought back, finished.',
        });
      } else if (finished >= 1) {
        candidates.push({
          kind: 'return-finished',
          score: 92,
          evidence: `Over 45 days, ${total} things you had let go came back; ${finished} of them got done` + (list ? ' — ' + list : '') + '.',
          contrast: 'Brought back is not the same as finished.',
        });
      }
      // finished === 0: silence. "Came back, none finished" is verdict-shaped.
    }

    // Same revives, sharper reading — never offer both in one build.
    if (candidates.some(c => c.kind === 'return-finished')) {
      return candidates.filter(c => c.kind !== 'letgo-return');
    }

    return candidates;
  }

  // ── 12c: novelty gate ───────────────────────────────────────────────────────
  // Subjective interestingness — novelty, actionability — cannot be computed without
  // an explicit model of what the user already knows (Geng & Hamilton; see
  // memory/research/ObservationSelection.md). That model is two things: `spokenLines`,
  // which is what TODAY has already said, and the fact that triage already prints every
  // task's age. This is the layer v2.79.0's voice memory belongs in — a filter that
  // eliminates candidates deterministically, rather than prompt text asking the model to
  // police itself.
  const _KIND_COOLDOWN_DAYS = {
    // Month-window observations. Saying one twice inside its own window is repetition,
    // not accumulation.
    'focus-vs-obligation': 21,
    'obligation-completion': 21,
    'letgo-reason': 21,
    'soon-pullback': 21,
    // 45-day window — see _buildOutcomeCandidates. 30 keeps one firing per window.
    'letgo-return': 30,
    'return-finished': 30,
    // Week-shaped observations belong to a weekly surface and may legitimately recur
    // week to week.
    'focus-leverage': 7,
    'habit-alignment': 7,
    'recurring-day': 14,
    'bursts': 14,
  };
  const _DEFAULT_COOLDOWN_DAYS = 14;

  // Age-as-content. Triage prints today / yesterday / N days for every task, so a tenure
  // claim restates a visible counter. Deliberately narrow: "Over 30 days, 5 focus
  // sessions…" states a *window* and must survive; "sat here 9 days" is a tenure claim
  // and must not.
  const _AGE_CLAIM = /\b\d+\s*days?\s*(?:old|ago|now|without|untouched)\b|\b(?:been|sat|sitting|waiting|unopened|untouched|still here)\b[^.]{0,24}\b\d+\s*days?\b/i;

  function _daysBetweenISO(fromISO, toISO) {
    const a = new Date(fromISO), b = new Date(toISO);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return Infinity;
    return Math.round((b - a) / 86400000);
  }

  // Returns null to keep, or a human-readable reason to drop. A reason rather than a
  // boolean so Phase 3 can log why a surface went quiet, and so 12d can show it — a
  // silent filter is untraceable when a surface unexpectedly says nothing.
  function _observationGateExplain(candidate, knowledge) {
    if (!candidate || !candidate.kind) return 'malformed candidate';
    const k = knowledge || {};
    const today = k.todayISO || new Date().toISOString().slice(0, 10);

    if (_AGE_CLAIM.test(String(candidate.evidence || '') + ' ' + String(candidate.contrast || ''))) {
      return 'restates task age, which triage already prints';
    }

    const cooldown = Object.prototype.hasOwnProperty.call(_KIND_COOLDOWN_DAYS, candidate.kind)
      ? _KIND_COOLDOWN_DAYS[candidate.kind]
      : _DEFAULT_COOLDOWN_DAYS;

    for (const line of (Array.isArray(k.spokenLines) ? k.spokenLines : [])) {
      if (!line || !line.date || line.kind !== candidate.kind) continue;
      const age = _daysBetweenISO(line.date, today);
      if (age >= 0 && age < cooldown) {
        const when = age === 0 ? 'today' : age + ' day' + (age === 1 ? '' : 's') + ' ago';
        return 'already said ' + when + ' on ' + (line.surface || 'another surface');
      }
    }
    return null;
  }

  // ── 12c: per-surface eligibility ─────────────────────────────────────────
  // Spec item 4, skipped in Phase 3 — and the direct cause of the first pool line
  // reading like a month insight at 8am. The morning nudge frames a day, so it may
  // only carry kinds that can point at something on the list right now. Sunday
  // frames a week and may carry anything. A kind eligible on both is still said
  // once: cooldowns are cross-surface.
  const _SURFACE_KINDS = {
    nudge:  new Set(['letgo-return', 'soon-pullback', 'focus-vs-obligation']),
    sunday: null, // null = every kind
  };

  function _observationEligible(candidate, surface, ctx) {
    if (!candidate || !candidate.kind) return false;
    const allowed = Object.prototype.hasOwnProperty.call(_SURFACE_KINDS, surface)
      ? _SURFACE_KINDS[surface] : null;
    if (allowed && !allowed.has(candidate.kind)) return false;
    // focus-vs-obligation is a 30-day aggregate. On the morning it needs a hook —
    // an obligation-framed task on today's list — or it is a month insight again.
    if (surface === 'nudge' && candidate.kind === 'focus-vs-obligation') {
      return !!(ctx && ctx.hasObligationOnList);
    }
    return true;
  }

  function _observationEligibleFor(candidates, surface, ctx) {
    if (!Array.isArray(candidates)) return [];
    return candidates.filter(c => _observationEligible(c, surface, ctx));
  }

  // Cross-surface by design: a kind narrated by the nudge is on cooldown for Noticed,
  // focus, Sunday and Monday too. The point is that the *person* does not hear the same
  // observation twice, not that each surface avoids repeating itself.
  function _observationNoveltyGate(candidates, knowledge) {
    if (!Array.isArray(candidates)) return [];
    return candidates.filter(c => _observationGateExplain(c, knowledge) === null);
  }

  // The pool: every candidate from every source, ranked. Callers apply gates and
  // per-surface eligibility; this function only proposes.
  function _buildObservationCandidates(input) {
    const inp = input || {};
    return _buildWeekCandidates(inp)
      .concat(_buildOutcomeCandidates(inp.outcomes, inp.todayISO, inp.taskTexts))
      .sort((a, b) => b.score - a.score);
  }

  // Generalized so every pool-fed surface shares one guard. The rules are the same
  // wherever a model is given evidence and asked only to phrase it: identity and
  // causal claims outrun the evidence, and are rejected even when the model ignores
  // the prompt. Word cap varies by surface.
  function _observationTextIsGrounded(text, maxWords) {
    if (!text || /^none\.?$/i.test(text.trim())) return false;
    if (/\bwho you are\b|\bthat(?:'s| is) (?:just )?you\b|\byou(?:'re| are) (?:the kind|the type|someone who|a person who)\b/i.test(text)) return false;
    if (/\b(?:caused|made you|because of)\b/i.test(text)) return false;
    if (/\b\d{2,4}\s+days? in\b/i.test(text)) return false;
    return text.trim().split(/\s+/).length <= (maxWords || 26);
  }

  // Sunday's contract, unchanged.
  function _weekReflectionTextIsGrounded(text) {
    return _observationTextIsGrounded(text, 26);
  }

  return { _buildWeekReflectionInsight, _weekReflectionTextIsGrounded, _observationTextIsGrounded, _buildWeekCandidates, _buildOutcomeCandidates, _buildObservationCandidates, _observationNoveltyGate, _observationGateExplain, _observationEligible, _observationEligibleFor };
});
