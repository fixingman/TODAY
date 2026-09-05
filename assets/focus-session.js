// TODAY — pure focus-session state and wall-clock correction.
(function initFocusSession(global) {
  'use strict';

  function create(totalSeconds) {
    return { rem: totalSeconds, running: false, paused: false, wallStart: null, tracked: false };
  }

  function restore(saved, now = Date.now()) {
    if (!saved?.taskId || !Number.isFinite(Number(saved.rem))) return null;
    const elapsed = saved.paused ? 0 : Math.max(0, Math.floor((now - Number(saved.savedAt || now)) / 1000));
    return {
      taskId: saved.taskId,
      rem: Math.max(0, Number(saved.rem) - elapsed),
      running: !saved.paused,
      paused: !!saved.paused,
      wallStart: saved.paused ? null : now,
      tracked: false,
    };
  }

  function serialize(taskId, state, now = Date.now()) {
    return { taskId, rem: state.rem, savedAt: now, paused: !!state.paused };
  }

  function wallElapsed(state, now = Date.now()) {
    return state?.wallStart ? Math.max(0, Math.floor((now - state.wallStart) / 1000)) : 0;
  }

  if (global.Today) global.Today.define('focus-session', { create, restore, serialize, wallElapsed });
})(window);
