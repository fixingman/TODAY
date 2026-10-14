// Lazy I/O boundary for optional daily Calendar support; pure policy is separate.
(function() {
  'use strict';
  async function support(tasks, isCurrent) {
    await import('./calendar-nudge-policy.js');
    const policy = Today.use('calendar-nudge-policy');
    const eligible = tasks.filter(task => policy.constraint(task, Date.now()));
    if (!eligible.length) return null;
    let calendar;
    try { calendar = Today.use('calendar'); }
    catch { calendar = await Today.use('connections').calendarForNudge(); }
    await calendar.refresh();
    if (!isCurrent()) return null;
    const snapshot = calendar.timingSnapshot();
    for (const task of eligible) {
      const evidence = policy.buildEvidence({ task, snapshot, now: Date.now() });
      if (evidence) return { policy, calendar, evidence, snapshotEpoch: snapshot.epoch };
    }
    return null;
  }
  function stillCurrent(support, tasks) {
    const task = tasks.find(t => t.id === support.evidence.taskId);
    const snapshot = support.calendar.timingSnapshot();
    if (!snapshot || snapshot.epoch !== support.snapshotEpoch) return false;
    const fresh = support.policy.buildEvidence({ task, snapshot, now: Date.now() });
    return !!fresh && JSON.stringify(fresh) === JSON.stringify(support.evidence);
  }
  Today.define('calendar-nudge', { support, stillCurrent });
})();
