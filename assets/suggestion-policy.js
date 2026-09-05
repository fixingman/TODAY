// TODAY — pure policy for classifying and learning from inline AI suggestions.
(function initSuggestionPolicy(global) {
  'use strict';

  const reasons = Object.freeze([
    'obligation_language',
    'vague_task',
    'multiple_actions',
    'long_complex_task',
    'other_complexity',
  ]);

  function normalizeTaskText(text) {
    return String(text || '')
      .replace(/^[a-z0-9]{1,12}:\s+/i, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  function reason(data, taskText) {
    if (reasons.includes(data?.reason)) return data.reason;
    if (data?.type === 'clarify') return 'vague_task';
    const clean = normalizeTaskText(taskText);
    if (/\b(and|then|plus|after|before)\b|[,;/+]/.test(clean)) return 'multiple_actions';
    if (clean.split(/\s+/).filter(Boolean).length > 8) return 'long_complex_task';
    return 'other_complexity';
  }

  function stats(records, filterReason) {
    const selected = (Array.isArray(records) ? records : [])
      .filter(record => !filterReason || record.reason === filterReason);
    const result = {
      offered: selected.length,
      applied: 0,
      dismissed: 0,
      ignored: 0,
      reversed: 0,
      helped: 0,
      retained: 0,
      decisions: 0,
      failures: 0,
      underperforming: false,
    };
    for (const record of selected) {
      if (record.appliedAt) result.applied++;
      if (record.dismissedAt) result.dismissed++;
      if (record.ignoredAt) result.ignored++;
      if (record.reversedAt && !record.helpedAt) result.reversed++;
      if (record.helpedAt) result.helped++;
      if (record.appliedAt && (!record.reversedAt || record.helpedAt)) result.retained++;
    }
    result.decisions = result.applied + result.dismissed + result.ignored;
    result.failures = result.dismissed + result.ignored + result.reversed;
    result.underperforming = result.decisions >= 4 && result.failures / result.decisions >= 0.7;
    return result;
  }

  function stableBucket(value) {
    let hash = 0;
    for (const char of String(value || '')) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    return Math.abs(hash) % 4;
  }

  function shouldOffer(records, filterReason, taskId) {
    const evidence = stats(records, filterReason);
    return !evidence.underperforming || stableBucket(`${filterReason}:${taskId}`) === 0;
  }

  function performanceContext(records) {
    const lines = [];
    for (const filterReason of reasons) {
      const evidence = stats(records, filterReason);
      if (evidence.decisions < 3) continue;
      const summary = `${evidence.applied}/${evidence.decisions} applied, ${evidence.helped} led to a completed step, ${evidence.reversed} later reversed`;
      if (evidence.underperforming) lines.push(`${filterReason}: ${summary}; use rarely`);
      else if (evidence.helped > 0) lines.push(`${filterReason}: ${summary}; prefer when it genuinely fits`);
      else lines.push(`${filterReason}: ${summary}`);
    }
    return lines.length ? ` Reason performance: ${lines.join('. ')}.` : '';
  }

  if (global.Today) global.Today.define('suggestion-policy', {
    reasons,
    normalizeTaskText,
    reason,
    stats,
    stableBucket,
    shouldOffer,
    performanceContext,
  });
})(window);
