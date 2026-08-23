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
  if (typeof module === 'object' && module.exports) module.exports = policy;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function _buildWeekReflectionInsight(stats) {
    const days = (stats.days || []).filter(d => d && d.tasks !== null && d.tasks !== undefined);
    if (days.length < 4) return null;

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
          meaning: 'Focus days coincided with a stronger completion rhythm this week.',
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
          meaning: 'Habit consistency and task momentum moved together this week.',
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
          meaning: `${dayName} is becoming a reliably strong day, not just a one-off.`,
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
        meaning: 'The week moved in concentrated bursts rather than at an even pace.',
      });
    }

    return candidates.sort((a, b) => b.score - a.score)[0] || null;
  }

  function _weekReflectionTextIsGrounded(text) {
    if (!text || /^none\.?$/i.test(text.trim())) return false;
    // Identity and causal claims outrun the observational evidence supplied to
    // this surface. Reject them even if the model ignores the prompt.
    if (/\bwho you are\b|\bthat(?:'s| is) (?:just )?you\b|\byou(?:'re| are) (?:the kind|the type|someone who|a person who)\b/i.test(text)) return false;
    if (/\b(?:caused|made you|because of)\b/i.test(text)) return false;
    if (/\b\d{2,4}\s+days? in\b/i.test(text)) return false;
    return text.trim().split(/\s+/).length <= 26;
  }

  return { _buildWeekReflectionInsight, _weekReflectionTextIsGrounded };
});
