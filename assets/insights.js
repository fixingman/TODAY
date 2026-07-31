// TODAY — Memory / insights system (Roadmap #3, sixth module extraction)
//
// The AI's persistent memory — patterns, wins, preferences learned over time —
// plus the behavioral-observation layer built on it (_memoryForAI context
// summary, _getProactiveObservations, _pickObservationToMention).
//
// Classic <script>, loaded after util.js and before the main inline script —
// the established extraction pattern, with ONE difference from the five prior
// modules: this one RUNS AT EVAL (the appMemory init IIFE + schema migration
// below). Its eval-time dependencies are only safeJSON and _localISO, both in
// util.js, which loads first — keep that order. Unlike trello.js, the state
// (appMemory) moves WITH the module: this file owns it; the main script only
// mutates properties (sync merge, lateAdditions, recentConversations) and
// never reassigns the binding. Classic scripts share the global lexical
// environment, so `let appMemory` here is visible to the main script exactly
// as before.
//
// Deliberately NOT here: applyNewDayCleanup (calls _memoryOnStreakUpdate /
// _memoryOnDaySummary but belongs to the day-boundary cluster), the appMemory
// merge block in mergeRemoteData (sync cluster, Non-Delegation), and the
// suggestion-cooldown pruning in the cleanup path.

const AI_NAMES = ['lu', 'kit', 'em', 'jo', 'pip', 'sol', 'rue', 'finn'];

function _pickAIName() {
  return AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
}

let appMemory = (() => {
  try {
    return safeJSON('today_memory', null) || {
      // AI identity — picked once, kept forever
      aiName: _pickAIName(),
      // Patterns observed over time
      patterns: {
        completionsByHour: {},    // { "9": 12, "14": 8, ... } — tasks completed per hour
        taskKeywords: {},         // { "email": { added: 5, avgDaysToComplete: 2.3 }, ... }
        focusMinutesTotal: 0,     // lifetime focus minutes
        bestStreak: 0,            // highest streak achieved
        taskLifespanSamples: [],  // rolling last-20 completed task ages (days)
      },
      // Moments worth remembering
      moments: [],                // [{ type: 'streak_milestone', value: 7, date: '2024-03-10' }, ...]
      // Inferred preferences
      preferences: {
        peakHour: null,           // hour with most completions
        dragKeywords: [],         // keywords that tend to linger
      },
      // AI suggestion cooldowns — prevents repeating the same task suggestion
      suggestionCooldowns: {},    // { taskId: 'YYYY-MM-DD' } — last suggested date
      // AI suggestion history — what was suggested and what action was taken
      suggestionHistory: [],      // [{ taskId, taskText, suggested: 'YYYY-MM-DD', action: 'break_down'|'move_soon'|'dismiss'|... }]
      // Recent completed task texts — rolling 30-day window for type summarization
      recentCompletedTasks: [],   // [{ text, date }]
      // Meta
      firstSeen: _localISO(),
      totalTasksCompleted: 0,
      totalDaysActive: 0,
    };
  } catch(e) { return null; }
})() || {
  aiName: _pickAIName(),
  patterns: { completionsByHour: {}, taskKeywords: {}, focusMinutesTotal: 0, bestStreak: 0 },
  moments: [],
  preferences: { peakHour: null, dragKeywords: [] },
  suggestionCooldowns: {},
  suggestionHistory: [],
  recentCompletedTasks: [],
  firstSeen: _localISO(),
  totalTasksCompleted: 0,
  totalDaysActive: 0,
};

// Ensure fields exist for users with older memory schema
if (!appMemory.aiName) {
  appMemory.aiName = _pickAIName();
  localStorage.setItem('today_memory', JSON.stringify(appMemory));
}
if (!appMemory.suggestionCooldowns)    appMemory.suggestionCooldowns = {};
if (!appMemory.suggestionHistory)      appMemory.suggestionHistory = [];
if (!appMemory.recentConversations)    appMemory.recentConversations = [];
if (!appMemory.recentCompletedTasks)   appMemory.recentCompletedTasks = [];
if (!appMemory.patterns.lateAdditions) appMemory.patterns.lateAdditions = [];
if (!appMemory.patterns.taskLifespanSamples) appMemory.patterns.taskLifespanSamples = [];
if (appMemory.patterns.dayStartCount === undefined) appMemory.patterns.dayStartCount = null;
if (appMemory.patterns.dayShapeState === undefined) appMemory.patterns.dayShapeState = null;
if (appMemory.patterns.dayStartDate  === undefined) appMemory.patterns.dayStartDate  = null;
if (!appMemory.meetingAttribution) appMemory.meetingAttribution = {
  mineShown: 0, mineKept: 0, othersShown: 0, othersSelected: 0,
};

// Cumulative accuracy counters for meeting mode's mine/others attribution — not
// a user-facing surface, just numbers to answer "am I getting the right tasks?"
// when asked. mineKept/mineShown ≈ precision (of what it called yours, how much
// you kept); othersSelected/othersShown ≈ recall of misses (how often you had to
// promote an "others" item back to your own). Synced max-wins like the other
// lifetime counters in this object (focusMinutesTotal, bestStreak, etc.) — see
// mergeRemoteData.
function _memoryOnMeetingAttribution(stats) {
  const m = appMemory.meetingAttribution;
  m.mineShown      += stats.mineShown;
  m.mineKept       += stats.mineKept;
  m.othersShown    += stats.othersShown;
  m.othersSelected += stats.othersSelected;
  _saveMemory();
}

function _saveMemory() {
  localStorage.setItem('today_memory', JSON.stringify(appMemory));
}

// Strip the "tag: " prefix before keyword-mining task text (same pattern
// taskHTML renders as a tag chip). A tag is how the user files a task, not
// what it's about — leaving it in guarantees noise like «"today:" keeps
// coming up this week» for anyone who tags consistently.
function _stripTag(text) {
  return (text || '').replace(/^[a-z0-9]{1,12}:\s+/i, '');
}

// Update memory when a task is completed
function _memoryOnTaskComplete(taskText, taskId) {
  const hour = new Date().getHours();
  
  // Track completions by hour
  appMemory.patterns.completionsByHour[hour] = (appMemory.patterns.completionsByHour[hour] || 0) + 1;
  
  // Find peak hour
  let maxCount = 0, peakHour = null;
  for (const [h, count] of Object.entries(appMemory.patterns.completionsByHour)) {
    if (count > maxCount) { maxCount = count; peakHour = parseInt(h); }
  }
  appMemory.preferences.peakHour = peakHour;
  
  // Track keywords (simple word extraction)
  const words = _stripTag(taskText).toLowerCase().split(/\s+/).filter(w => w.length > 3);
  for (const word of words) {
    if (!appMemory.patterns.taskKeywords[word]) {
      appMemory.patterns.taskKeywords[word] = { completed: 0 };
    }
    appMemory.patterns.taskKeywords[word].completed++;
  }
  
  appMemory.totalTasksCompleted++;

  // Record task lifespan — days from creation to completion
  if (taskId && typeof _getCreatedFromId === 'function') {
    const created = _getCreatedFromId(taskId);
    const lifespanDays = Math.floor((Date.now() - created) / 86400000);
    if (lifespanDays >= 0 && lifespanDays <= 365) {
      appMemory.patterns.taskLifespanSamples.push(lifespanDays);
      if (appMemory.patterns.taskLifespanSamples.length > 20)
        appMemory.patterns.taskLifespanSamples = appMemory.patterns.taskLifespanSamples.slice(-20);
    }
  }

  // Rolling 30-day completed task list for type summarization
  if (taskText) {
    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    appMemory.recentCompletedTasks = (appMemory.recentCompletedTasks || [])
      .filter(e => new Date(e.date) >= thirtyAgo)
      .slice(-49);
    appMemory.recentCompletedTasks.push({ text: taskText, date: _localISO() });
  }

  _saveMemory();
}

// Update memory when focus session completes
function _memoryOnFocusComplete(minutes) {
  appMemory.patterns.focusMinutesTotal += minutes;
  _saveMemory();
}

// Update memory on streak change
function _memoryOnStreakUpdate(streak) {
  if (streak > appMemory.patterns.bestStreak) {
    appMemory.patterns.bestStreak = streak;
    // Record milestone moments
    if (streak === 7 || streak === 14 || streak === 21 || streak === 30 || streak % 50 === 0) {
      appMemory.moments.push({
        type: 'streak_milestone',
        value: streak,
        date: _localISO()
      });
      // Keep only last 20 moments
      if (appMemory.moments.length > 20) appMemory.moments = appMemory.moments.slice(-20);
    }
    _saveMemory();
  }
}

// Update memory on big clear (many tasks done in one day)
function _memoryOnDaySummary(tasksCompleted) {
  appMemory.totalDaysActive++;
  if (tasksCompleted >= 5) {
    appMemory.moments.push({
      type: 'big_clear',
      count: tasksCompleted,
      date: _localISO()
    });
    if (appMemory.moments.length > 20) appMemory.moments = appMemory.moments.slice(-20);
    _saveMemory();
  }
}

// Get memory summary for AI context.
// scope 'nudge' omits lifetime trophies (best streak, total focus, moments, days
// active) — they can't change what's said about *today*, and at ~40% of the block
// they crowded out the actual list (v2.43.5). The conversational assistant still
// gets everything: there, "your best streak was 14" is legitimate color.
function _memoryForAI(scope) {
  const m = appMemory;
  const lines = [];
  const lifetime = scope !== 'nudge';

  // Peak productivity hour
  if (m.preferences.peakHour !== null) {
    const h = m.preferences.peakHour;
    const period = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    lines.push(`You tend to get most done in the ${period} (around ${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}).`);
  }
  
  // Best streak
  if (lifetime && m.patterns.bestStreak > 3) {
    lines.push(`Your best streak was ${m.patterns.bestStreak} days.`);
  }

  // Total focus time
  if (lifetime && m.patterns.focusMinutesTotal > 60) {
    const hours = Math.round(m.patterns.focusMinutesTotal / 60);
    lines.push(`You've focused for ${hours}+ hours total.`);
  }

  // Recent moments
  const recentMoments = lifetime ? m.moments.slice(-3) : [];
  for (const moment of recentMoments) {
    if (moment.type === 'streak_milestone') {
      lines.push(`You hit a ${moment.value}-day streak on ${moment.date}.`);
    } else if (moment.type === 'big_clear') {
      lines.push(`You cleared ${moment.count} things on ${moment.date}.`);
    }
  }
  
  // Days active
  if (lifetime && m.totalDaysActive > 7) {
    lines.push(`You've used TODAY for ${m.totalDaysActive} days.`);
  }
  
  // Suggestion history — what was suggested for each task, and what the user did
  // Grouped by taskText, last 30 days only, max 5 unique tasks
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent = (m.suggestionHistory || []).filter(h => new Date(h.suggested) >= thirtyDaysAgo);
  
  if (recent.length > 0) {
    // Group by taskText
    const byTask = {};
    for (const entry of recent) {
      if (!byTask[entry.taskText]) byTask[entry.taskText] = [];
      byTask[entry.taskText].push(entry);
    }
    const taskEntries = Object.entries(byTask).slice(0, 5);
    if (taskEntries.length > 0) {
      const historyLines = taskEntries.map(([text, entries]) => {
        const actions = entries.map(e => {
          const label = {
            break_down:  'asked to break it down',
            move_soon:   'parked it to Soon',
            delete_task: 'let it go',
            dismiss:     'dismissed the suggestion',
            start_focus: 'started focusing on it',
          }[e.action] || e.action;
          return `${label} (${e.suggested})`;
        });
        return `"${text}": ${actions.join(', ')}`;
      });
      lines.push(`Past suggestions:\n${historyLines.join('\n')}`);
    }
  }
  
  // Recent conversation history — last 3 sessions so AI can continue threads
  const recentConvos = (m.recentConversations || []).slice(0, 3);
  if (recentConvos.length > 0) {
    const convoLines = recentConvos.map(c => `[${c.date}] "${c.message}"`);
    lines.push(`Recent conversations:\n${convoLines.join('\n')}`);
  }

  // Recent completed task examples — lets the AI calibrate to the user's writing style
  const recentDone = (m.recentCompletedTasks || []);
  if (recentDone.length >= 3) {
    const examples = recentDone.slice(-5).map(e => '"' + _stripTag(e.text) + '"');
    lines.push('Recent completed tasks (shows how this person writes): ' + examples.join(', ') + '.');
  }


  // Current streak
  const currentStreak = parseInt(
    (typeof localStorage !== 'undefined' ? localStorage.getItem('stat_streak') : null) || '1'
  );
  if (currentStreak > 1) {
    lines.push(`Current streak: ${currentStreak} day${currentStreak === 1 ? '' : 's'}.`);
  }

  // Late-addition pattern — when tasks tend to get added reactively
  const lateAdds = m.patterns.lateAdditions || [];
  if (lateAdds.length >= 10) {
    const avgHour = Math.round(lateAdds.reduce((a, b) => a + b, 0) / lateAdds.length);
    const latePct = Math.round(lateAdds.filter(h => h >= 14).length / lateAdds.length * 100);
    if (latePct >= 40) {
      const period = avgHour < 12 ? 'morning' : avgHour < 17 ? 'afternoon' : 'evening';
      lines.push(`You tend to add tasks in the ${period} (${latePct}% after 2pm).`);
    }
  }

  // Task lifespan — how long tasks typically take from creation to done
  const lifespanSamples = m.patterns.taskLifespanSamples || [];
  if (lifespanSamples.length >= 5) {
    const avg = Math.round(lifespanSamples.reduce((a, b) => a + b, 0) / lifespanSamples.length);
    if (avg === 0) lines.push('You typically complete tasks the same day you add them.');
    else if (avg <= 2) lines.push(`You typically close tasks within a day or two.`);
    else lines.push(`You typically take about ${avg} days to complete a task.`);
  }

  // Daily history — last 7 days rhythm and trend
  const dailyHistory = (typeof safeJSON === 'function') ? safeJSON('today_daily_history', []) : [];
  const last7 = dailyHistory.slice(-7);
  if (last7.length >= 3) {
    const avgTasks = (last7.reduce((s, e) => s + (e.tasksDone || 0), 0) / last7.length).toFixed(1);
    const avgFocus = Math.round(last7.reduce((s, e) => s + (e.focusMins || 0), 0) / last7.length);
    const prev7 = dailyHistory.slice(-14, -7);
    let trend = '';
    if (prev7.length >= 3) {
      const prevAvg = prev7.reduce((s, e) => s + (e.tasksDone || 0), 0) / prev7.length;
      const diff = parseFloat(avgTasks) - prevAvg;
      if (diff > 0.5) trend = ', more than the week before';
      else if (diff < -0.5) trend = ', less than the week before';
    }
    const focusLine = avgFocus >= 5 ? ` and ${avgFocus} min focus` : '';
    lines.push(`Last 7 days: ${avgTasks} tasks/day average${focusLine}${trend}.`);
  }

  // Habit context — which habits exist, weekly rate, yesterday status
  if (typeof habitsList !== 'undefined' && typeof habitCompletions !== 'undefined') {
    const activeHabits = habitsList.filter(h => !h.archived);
    if (activeHabits.length > 0) {
      const todayISO = _localISO();
      const yesterdayISO = _localISO(new Date(Date.now() - 864e5));
      const last7Dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i); return _localISO(d);
      });
      const habitSummaries = activeHabits.map(h => {
        const done = new Set(habitCompletions[h.id] || []);
        const weekCount = last7Dates.filter(d => done.has(d)).length;
        const doneYest = done.has(yesterdayISO) ? ', done yesterday' : '';
        return `"${h.name}": ${weekCount}/7 this week${doneYest}`;
      });
      lines.push('Habits:\n' + habitSummaries.join('\n'));
    }
  }

  // Newline-joined: several entries are themselves multi-line (past suggestions,
  // conversations, habits) and a space join welded each one's tail to the next
  // entry's heading.
  return lines.length > 0 ? lines.join('\n') : '';
}

// Generate proactive observations — things the AI should notice and speak about
// These are "moments worth mentioning" — the companion noticing without being asked
function _getProactiveObservations(ctx) {
  const m = appMemory;
  const observations = [];
  const currentStreak = ctx.streak || parseInt(localStorage.getItem('stat_streak') || '1');
  const hour = new Date().getHours();
  const peakHour = m.preferences.peakHour;
  
  // ── STREAK OBSERVATIONS ──
  
  // New personal best streak
  if (currentStreak > m.patterns.bestStreak && currentStreak > 3) {
    observations.push({
      type: 'streak_record',
      priority: 'high',
      text: `You're on day ${currentStreak} — your longest streak yet.`
    });
  }
  // Notable streak milestones (7, 14, 21, 30, etc.)
  else if ([7, 14, 21, 30, 50, 100].includes(currentStreak)) {
    observations.push({
      type: 'streak_milestone',
      priority: 'high',
      text: `Day ${currentStreak}. That's worth noticing.`
    });
  }
  // Good streak going (always show if 3+)
  else if (currentStreak >= 3) {
    observations.push({
      type: 'streak_acknowledge',
      priority: 'low',
      text: `${currentStreak} days in a row now.`
    });
  }
  
  // ── TIME-OF-DAY OBSERVATIONS ──
  
  // It's their peak hour
  if (peakHour !== null && hour === peakHour) {
    observations.push({
      type: 'peak_hour',
      priority: 'medium',
      text: `It's ${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'pm' : 'am'} — your most productive hour.`
    });
  }
  // It's morning but their peak is afternoon
  else if (peakHour !== null && peakHour >= 14 && hour < 12) {
    observations.push({
      type: 'pace_suggestion',
      priority: 'low',
      text: `You usually pick up after ${peakHour > 12 ? peakHour - 12 : peakHour}pm. Start light.`
    });
  }
  
  // ── FOCUS TIME OBSERVATIONS ──
  
  const focusHours = Math.round(m.patterns.focusMinutesTotal / 60);
  // Focus time milestones (every 10 hours, or notable numbers)
  if (focusHours >= 5 && (focusHours % 10 === 0 || [5, 25, 50, 100].includes(focusHours))) {
    observations.push({
      type: 'focus_milestone',
      priority: 'medium',
      text: `${focusHours} hours of focused time. That's real.`
    });
  }
  
  // ── TASK COMPLETION OBSERVATIONS ──
  
  const totalCompleted = m.totalTasksCompleted || 0;
  // Task completion milestones (every 25, or notable numbers)
  if (totalCompleted >= 25 && (totalCompleted % 25 === 0 || [10, 50, 100, 200, 500].includes(totalCompleted))) {
    observations.push({
      type: 'tasks_milestone',
      priority: 'medium',
      text: `${totalCompleted} tasks completed since you started. Quietly adding up.`
    });
  }
  
  // ── RECENT WINS ──
  
  const recentMoments = m.moments.slice(-3);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = _localISO(yesterday);
  
  for (const moment of recentMoments) {
    // Big clear yesterday — already rare by construction (needs the 5+-in-a-day
    // moment AND falls on the one eligible calendar day), so it's high priority
    // rather than medium: a genuinely sparse signal shouldn't also lose a coin flip.
    if (moment.type === 'big_clear' && moment.date === yesterdayStr) {
      observations.push({
        type: 'yesterday_win',
        priority: 'high',
        text: `You cleared ${moment.count} things yesterday.`
      });
    }
  }

  // ── EMERGENT VS PLANNED INSIGHT ──
  // Unlike big_clear (a one-time event), this reads a standing behavioral state —
  // once someone's real habit settles into reactive or intentional, the threshold
  // can stay crossed for weeks. Gate on a state CHANGE (same mechanism as the
  // Noticed peak-hour signal: n.peakShown !== peak) so it's mentioned once when
  // the pattern first emerges or flips, not on a 20%-per-day lottery against the
  // same fact for as long as the habit holds.
  const lateAdditions = m.patterns.lateAdditions || [];
  if (lateAdditions.length >= 10) {
    // Calculate average hour of addition
    const avgHour = Math.round(lateAdditions.reduce((a, b) => a + b, 0) / lateAdditions.length);
    // Count how many are "late" (afternoon/evening: ≥ 14)
    const lateCount = lateAdditions.filter(h => h >= 14).length;
    const latePct = Math.round((lateCount / lateAdditions.length) * 100);

    if (latePct >= 60 && avgHour >= 15) {
      // Consistent pattern: tasks added late in the day
      if (m.patterns.dayShapeState !== 'reactive') {
        m.patterns.dayShapeState = 'reactive';
        _saveMemory();
        observations.push({
          type: 'reactive_pattern',
          priority: 'low',
          text: `A lot of your tasks get added in the afternoon. Reactive day, or just how you plan?`
        });
      }
    } else if (latePct <= 30 && avgHour <= 11) {
      // Consistent pattern: intentional morning planner
      if (m.patterns.dayShapeState !== 'intentional') {
        m.patterns.dayShapeState = 'intentional';
        _saveMemory();
        observations.push({
          type: 'intentional_pattern',
          priority: 'low',
          text: `You tend to add tasks in the morning. Good instinct — plans made early tend to stick.`
        });
      }
    }
  }

  return observations;
}

// Pick one observation to mention (probabilistic, respects cooldowns)
function _pickObservationToMention(observations) {
  if (!observations || observations.length === 0) return null;
  
  // Check cooldown — don't repeat same observation type within 24h
  const lastObservation = localStorage.getItem('ai_last_observation');
  const lastObservationTime = parseInt(localStorage.getItem('ai_last_observation_time') || '0');
  const hoursSinceLastObservation = (Date.now() - lastObservationTime) / (1000 * 60 * 60);
  
  // Filter out recently mentioned observation types
  let candidates = observations;
  if (hoursSinceLastObservation < 24 && lastObservation) {
    candidates = observations.filter(o => o.type !== lastObservation);
  }
  
  if (candidates.length === 0) return null;
  
  // Prioritize high priority observations
  const highPriority = candidates.filter(o => o.priority === 'high');
  if (highPriority.length > 0) {
    const picked = highPriority[0];
    localStorage.setItem('ai_last_observation', picked.type);
    localStorage.setItem('ai_last_observation_time', Date.now().toString());
    return picked;
  }
  
  // Medium priority — 50% chance
  const mediumPriority = candidates.filter(o => o.priority === 'medium');
  if (mediumPriority.length > 0 && Math.random() < 0.5) {
    const picked = mediumPriority[Math.floor(Math.random() * mediumPriority.length)];
    localStorage.setItem('ai_last_observation', picked.type);
    localStorage.setItem('ai_last_observation_time', Date.now().toString());
    return picked;
  }
  
  // Low priority — 20% chance
  const lowPriority = candidates.filter(o => o.priority === 'low');
  if (lowPriority.length > 0 && Math.random() < 0.2) {
    const picked = lowPriority[Math.floor(Math.random() * lowPriority.length)];
    localStorage.setItem('ai_last_observation', picked.type);
    localStorage.setItem('ai_last_observation_time', Date.now().toString());
    return picked;
  }
  
  return null;
}

// ─── Noticed — surfacing learned patterns (v2.35.0, Personalization.md G3) ────
// Lines for the About "Noticed" block. Delta-gated, never fact-stated: each
// line appears ONCE when something changes (milestone crossed, peak moved,
// theme emerged), then never again — appearing at all carries the information
// (Wallpaper escape 1); content derives from fresh data (escape 2); nothing
// new → empty array → the block doesn't render (escape 3).
//
// Two separate gates, on purpose:
// - appMemory.noticed (`n`) — "have I shown THIS device this yet." Device-
//   local, NOT synced (reverted BUG-058's sync, v2.39.3): syncing this meant
//   "shown once" became "shown once across all devices combined," so
//   whichever device opened About first silently consumed the notification
//   for every other device too.
// - appMemory.noticedDates — "when did this first fire, on ANY device."
//   Synced (v2.39.4), earliest-date-wins per key. Gives every device its own
//   honest chance to show a signal, but only within the SAME calendar day it
//   first fired anywhere — a device opened days later stays quiet instead of
//   resurfacing something stale. See _noticedEligible below.
//
// The underlying DATA each signal reads (habit completions, focus minutes,
// peak hour, week-theme text) is fully synced regardless, so any two devices
// that DO show a signal always show identical content.
function _noticedEligible(key, todayISO) {
  if (!appMemory.noticedDates) appMemory.noticedDates = {};
  const d = appMemory.noticedDates[key];
  return !d || d === todayISO;
}
function _noticedStamp(key, todayISO) {
  if (!appMemory.noticedDates) appMemory.noticedDates = {};
  if (!appMemory.noticedDates[key]) appMemory.noticedDates[key] = todayISO;
}
function _noticedLines() {
  if (!appMemory.noticed) appMemory.noticed = {};
  const n = appMemory.noticed;
  const lines = [];
  let dirty = false;
  const todayISO = _localISO();
  const _hr12 = h => (h > 12 ? h - 12 : h) + (h >= 12 ? 'pm' : 'am');

  // 0 · Season moment — fixed calendar dates, ~6/year (v2.37.0, Backlog: Season
  // moments). Meteorological season starts (Scandinavia convention) + solstices.
  // Solstices pinned to the 21st — off by a day in some years; fine for a quiet
  // line. Wallpaper escape 1 by construction: rare, and each date shows once.
  const SEASON_MOMENTS = {
    '03-01': 'First day of spring.',
    '06-01': 'First day of summer.',
    '06-21': 'Midsummer — the year’s longest day.',
    '09-01': 'First day of autumn.',
    '12-01': 'First day of winter.',
    '12-21': 'The year’s shortest day. The light turns back tomorrow.',
  };
  const seasonLine = SEASON_MOMENTS[todayISO.slice(5)];
  if (seasonLine && n.seasonDate !== todayISO) {
    const seasonElig = 'season:' + todayISO;
    if (_noticedEligible(seasonElig, todayISO)) {
      n.seasonDate = todayISO;
      dirty = true;
      _noticedStamp(seasonElig, todayISO);
      lines.push(seasonLine);
    }
  }

  // 1 · Habit streak milestone — once per habit per milestone
  if (typeof habitsList !== 'undefined' && typeof habitCompletions !== 'undefined') {
    if (!n.habitMilestones) n.habitMilestones = {};
    const yesterdayISO = _localISO(new Date(Date.now() - 864e5));
    for (const h of habitsList) {
      if (h.archived) continue;
      const done = new Set(habitCompletions[h.id] || []);
      // Run of consecutive days ending today or yesterday
      let run = 0;
      let d = done.has(todayISO) ? todayISO : (done.has(yesterdayISO) ? yesterdayISO : null);
      while (d && done.has(d)) { run++; d = _localISO(new Date(new Date(d + 'T12:00').getTime() - 864e5)); }
      // Past 100 days, keep noticing every 50 — a fixed list would otherwise
      // go silent forever once its top rung is passed (v2.40.0).
      const crossed = run >= 100
        ? Math.floor(run / 50) * 50
        : [50, 30, 14, 7].find(m => run >= m);
      if (crossed && (n.habitMilestones[h.id] || 0) < crossed) {
        const habitElig = 'habit:' + h.id + ':' + crossed;
        if (_noticedEligible(habitElig, todayISO)) {
          n.habitMilestones[h.id] = crossed;
          dirty = true;
          _noticedStamp(habitElig, todayISO);
          lines.push(h.name + ' — ' + crossed + ' days now.');
        }
      }
    }
  }

  // 2 · Best-streak proximity — once per day, only when close (1–2 away, 5+)
  const streak = parseInt(localStorage.getItem('stat_streak') || '1');
  const best = appMemory.patterns.bestStreak || 0;
  if (streak >= 5 && best - streak >= 1 && best - streak <= 2 && n.streakProxDate !== todayISO) {
    const streakElig = 'streakProx:' + todayISO;
    if (_noticedEligible(streakElig, todayISO)) {
      n.streakProxDate = todayISO;
      dirty = true;
      _noticedStamp(streakElig, todayISO);
      lines.push('Day ' + streak + '. Your best is ' + best + '.');
    }
  }

  // 3 · Peak hour established or moved — only at first solid signal or a shift
  const peak = appMemory.preferences.peakHour;
  const signal = Object.values(appMemory.patterns.completionsByHour || {}).reduce((a, b) => a + b, 0);
  if (peak !== null && signal >= 30 && n.peakShown !== peak) {
    const peakElig = 'peak:' + peak;
    if (_noticedEligible(peakElig, todayISO)) {
      const first = n.peakShown === undefined;
      n.peakShown = peak;
      dirty = true;
      _noticedStamp(peakElig, todayISO);
      lines.push(first
        ? 'Most things get done around ' + _hr12(peak) + '.'
        : 'Your peak moved — around ' + _hr12(peak) + ' lately.');
    }
  }

  // 4 · Theme of the week — AI-crafted observation from what was actually
  // completed, once/week (v2.39.0). Replaces a deterministic keyword-frequency
  // count ("'cleanup' keeps coming up") that read as a stat, not an insight —
  // the word alone never carried a story no matter how good the stopword list
  // got. The AI call itself (_fetchWeekThemeAI, index.html) and its cache/sync
  // wiring live in renderInfoStats() — this just reads the cached result and
  // delta-gates it, same as every other Noticed signal.
  const weekKey = todayISO.slice(0, 8) + Math.ceil(new Date().getDate() / 7);
  const themeText = localStorage.getItem('week_theme_ai_' + weekKey);
  if (themeText && n.themeWeek !== weekKey) {
    const themeElig = 'theme:' + weekKey;
    if (_noticedEligible(themeElig, todayISO)) {
      n.themeWeek = weekKey;
      dirty = true;
      _noticedStamp(themeElig, todayISO);
      lines.push(themeText);
    }
  }

  // 5 · Revived task finished — a task deliberately brought back got done today.
  // Extends v2.35.2's nudge signal ("the choice was theirs, already made") into
  // a one-time Noticed moment — rare by construction (needs a revive AND a same-
  // day completion), never restates once shown.
  if (typeof manualTasks !== 'undefined' && typeof doneIds !== 'undefined') {
    if (!n.revivedDone) n.revivedDone = {};
    const checkedIds = safeJSON('today_checked_ids', []);
    const allTasks = [...manualTasks, ...(typeof trelloTasks !== 'undefined' ? trelloTasks : [])];
    for (const t of allTasks) {
      if (!t.revived || !doneIds.has(t.id) || n.revivedDone[t.id]) continue;
      const entry = checkedIds.find(e => e.id === t.id);
      if (!entry || !entry.at || _localISO(new Date(entry.at)) !== todayISO) continue;
      const revivedElig = 'revived:' + t.id;
      if (!_noticedEligible(revivedElig, todayISO)) continue;
      n.revivedDone[t.id] = true;
      dirty = true;
      _noticedStamp(revivedElig, todayISO);
      lines.push('Brought back, and finished — “' + _stripTag(t.text).slice(0, 40) + '”.');
      break; // at most one per day — keep it rare
    }
  }

  // 6 · Total focus milestone — crossed a round number of lifetime focus hours,
  // once per threshold. Parallel structure to the habit-streak milestone above;
  // distinct from _memoryForAI()'s "you've focused for X+ hours" line, which
  // restates every AI call and is never shown verbatim to the user.
  const focusHoursTotal = Math.floor((appMemory.patterns.focusMinutesTotal || 0) / 60);
  // Past 100 hours, keep noticing every 100 — a fixed list would otherwise
  // go silent forever once its top rung is passed (v2.40.0).
  const focusCrossed = focusHoursTotal >= 100
    ? Math.floor(focusHoursTotal / 100) * 100
    : [50, 25, 10].find(m => focusHoursTotal >= m);
  if (focusCrossed && (n.focusMilestone || 0) < focusCrossed) {
    const focusElig = 'focus:' + focusCrossed;
    if (_noticedEligible(focusElig, todayISO)) {
      n.focusMilestone = focusCrossed;
      dirty = true;
      _noticedStamp(focusElig, todayISO);
      lines.push(focusCrossed + ' hours of focus, total.');
    }
  }

  if (dirty) _saveMemory();
  return lines.slice(0, 2);
}
