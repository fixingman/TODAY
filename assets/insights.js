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
const SUGGESTION_OUTCOME_LIMIT = 100;
const SUGGESTION_REVERSAL_GRACE_MS = 10 * 60 * 1000;
const SUGGESTION_REASONS = [
  'multiple_actions',
  'long_complex_task',
  'vague_task',
  'other_complexity',
  'obligation_language',
];

function _aiCheckObligationLanguage(text) {
  const t = (text || '').trim();
  if (t.split(/\s+/).filter(Boolean).length < 3) return false;
  // Exclude descriptive "should/must be [adj]" — these describe task difficulty, not obligation framing
  if (/\b(should|must)\s+be\s+(quick|easy|fast|simple|fine|short|straightforward|ready|good|ok|done|small|trivial)\b/i.test(t)) return false;
  return /\bhave to\b|\bneed to\b|\bshould\b|\bmust\b|\bought to\b|\bsupposed to\b|\bhave got to\b/i.test(t);
}

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
        letgoReasons: {},         // { not_relevant: N, no_energy: N, lost_interest: N, replaced: N }
        triageUndos: 0,           // how many times triage was undone
        soonPulls: 0,             // how many times a task was pulled back from Soon
        reviveReasons: {},        // { triage_undo: N, not_done_yet: N, ... } reason for reviving from Past
        inlineSuggestions: { offered: 0, applied: 0, dismissed: 0, autoDismissed: 0 }, // inline AI breakdown tracking
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
      // Post-add inline suggestion outcomes — reason-level learning, newest first
      suggestionOutcomes: [],     // [{ id, taskId, reason, offeredAt, appliedAt|dismissedAt|ignoredAt, helpedAt?, reversedAt? }]
      // Recent completed task texts — rolling 30-day window for type summarization
      recentCompletedTasks: [],   // [{ text, date }]
      // Typed memory slots — AI-proposed, user-confirmed inferences
      memory: { semantic: [], episodic: [], procedural: [] },
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
  suggestionOutcomes: [],
  recentCompletedTasks: [],
  memory: { semantic: [], episodic: [], procedural: [] },
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
if (!Array.isArray(appMemory.suggestionOutcomes)) appMemory.suggestionOutcomes = [];
if (!appMemory.recentConversations)    appMemory.recentConversations = [];
if (!appMemory.recentCompletedTasks)   appMemory.recentCompletedTasks = [];
if (!appMemory.patterns.lateAdditions) appMemory.patterns.lateAdditions = [];
// Migrate plain-number entries to {h, date} objects — old format had no date
if (appMemory.patterns.lateAdditions.some(e => typeof e === 'number')) {
  appMemory.patterns.lateAdditions = appMemory.patterns.lateAdditions.map(e =>
    typeof e === 'number' ? { h: e, date: '' } : e
  );
  localStorage.setItem('today_memory', JSON.stringify(appMemory));
}
if (!appMemory.patterns.taskLifespanSamples) appMemory.patterns.taskLifespanSamples = [];
if (!appMemory.patterns.letgoReasons)   appMemory.patterns.letgoReasons = {};
if (appMemory.patterns.triageUndos === undefined) appMemory.patterns.triageUndos = 0;
if (appMemory.patterns.soonPulls   === undefined) appMemory.patterns.soonPulls   = 0;
if (!appMemory.patterns.reviveReasons) appMemory.patterns.reviveReasons = {};
if (appMemory.patterns.dayStartCount === undefined) appMemory.patterns.dayStartCount = null;
if (appMemory.patterns.dayShapeState === undefined) appMemory.patterns.dayShapeState = null;
if (appMemory.patterns.dayStartDate  === undefined) appMemory.patterns.dayStartDate  = null;
if (!appMemory.patterns.inlineSuggestions) appMemory.patterns.inlineSuggestions = { offered: 0, applied: 0, dismissed: 0, autoDismissed: 0 };
if (appMemory.patterns.inlineSuggestions.autoDismissed === undefined) appMemory.patterns.inlineSuggestions.autoDismissed = 0;
if (!appMemory.meetingAttribution) appMemory.meetingAttribution = {
  mineShown: 0, mineKept: 0, othersShown: 0, othersSelected: 0,
};
if (!appMemory.memory) appMemory.memory = { semantic: [], episodic: [], procedural: [] };
if (!appMemory.memory.semantic)   appMemory.memory.semantic = [];
if (!appMemory.memory.episodic)   appMemory.memory.episodic = [];
if (!appMemory.memory.procedural) appMemory.memory.procedural = [];
// 12a: Relational memory slots — task-age awareness, obligation language tally
if (!appMemory.returningTasks)              appMemory.returningTasks = {};
if (!appMemory.obligationLanguageTally)     appMemory.obligationLanguageTally = { week: '', count: 0, completed: 0, tasks: [] };
if (appMemory.obligationLanguageTally.completed === undefined) appMemory.obligationLanguageTally.completed = 0;
if (!appMemory.obligationLanguageTally.tasks) appMemory.obligationLanguageTally.tasks = [];
if (!appMemory.obligationHistory)           appMemory.obligationHistory = [];
if (!appMemory.taskAgeBuckets)              appMemory.taskAgeBuckets = { d1to3: 0, d4to6: 0, d7to13: 0, d14plus: 0 };
// 12b: What TODAY has said on its own initiative — the app's memory of its own voice.
if (!appMemory.spokenLines)                 appMemory.spokenLines = [];
// 12c Phase 0: dated task-outcome log. Every approved 12c candidate is a windowed
// contrast, and the pre-existing stores (letgoReasons, soonPulls) are undated lifetime
// counters — counters cannot produce a contrast.
if (!appMemory.taskOutcomes)                appMemory.taskOutcomes = [];
// Retroactive fix: drop any history entries that no longer pass the current (tightened) detection
appMemory.obligationHistory = appMemory.obligationHistory.filter(e => _aiCheckObligationLanguage(e.text));

// 12c: one-time backfill of taskOutcomes from dated history that predates Phase 0.
//
// taskOutcomes started empty, and the candidate builders use 30-day windows with
// 4+ samples per side — so without this the pool stays silent for roughly a month
// while several weeks of usable dated history sit unused in appMemory.
//
// What is knowable differs by source, and pretending otherwise would manufacture
// the app's most confident observation out of missing data:
//   • focusSessions is unknown for every backfilled row. Writing 0 would make
//     focus-vs-obligation trivially true ("all focus went to chosen work") because
//     every value is zero. Rows carry `backfilled: true` and focus-derived
//     candidates exclude them.
//   • obligation is unknown for let-go and revive rows, which are stored as dated
//     counts with no text to test. Those carry `obligation: null` — not false —
//     and candidates that partition by obligation match on `=== true` / `=== false`
//     so unknowns are excluded rather than silently counted as chosen.
// obligationHistory is deliberately NOT a source: its `date` is the add date, not
// the outcome date, so importing it would place events at the wrong times.
function _memoryBackfillOutcomes() {
  if (appMemory.taskOutcomesBackfilled) return;
  appMemory.taskOutcomesBackfilled = true;

  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
  const rows = [];
  const seen = new Set((appMemory.taskOutcomes || []).map(e => e.id + '|' + e.outcome + '|' + e.date));
  const add = row => {
    const key = row.id + '|' + row.outcome + '|' + row.date;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  // Completions carry their own text and a true completion date, so obligation is
  // recoverable here even though focus is not.
  for (const e of (appMemory.recentCompletedTasks || [])) {
    if (!e || !e.date || new Date(e.date) < cutoff) continue;
    add({
      id: _memoryTextKey(e.text), date: e.date, outcome: 'done',
      obligation: !!_aiCheckObligationLanguage(e.text),
      focusSessions: 0, backfilled: true,
    });
  }

  // Dated counts per reason: { reason: { days: { ISO: n } } }. No text, so obligation
  // stays unknown. '_legacy' holds a pre-dating lifetime total and has no date.
  const fromReasonMap = (map, outcome) => {
    for (const [reason, entry] of Object.entries(map || {})) {
      const days = (entry && entry.days) || {};
      for (const [iso, count] of Object.entries(days)) {
        if (iso === '_legacy' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
        if (new Date(iso) < cutoff) continue;
        for (let i = 0; i < (parseInt(count) || 0); i++) {
          add({
            id: 'bf_' + outcome + '_' + reason + '_' + iso + '_' + i,
            date: iso, outcome, obligation: null,
            focusSessions: 0, reason, backfilled: true,
          });
        }
      }
    }
  };
  fromReasonMap(appMemory.patterns.letgoReasons,  'letgo');
  fromReasonMap(appMemory.patterns.reviveReasons, 'revive');

  if (rows.length) {
    appMemory.taskOutcomes = (appMemory.taskOutcomes || [])
      .concat(rows)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .slice(-300);
  }
  _saveMemory();
}
_memoryBackfillOutcomes();

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

// 12a: Scan current task list (manual + Trello) and update relational memory slots.
// Called at the top of _memoryForAI() when manualTasks is available.
function _updateReturningTasksMemory(manualArr, trelloArr) {
  const now      = Date.now();
  const todayISO = _localISO();
  const prior    = appMemory.returningTasks || {};
  const updated  = {};
  const buckets  = { d1to3: 0, d4to6: 0, d7to13: 0, d14plus: 0 };

  // Trello age/focus maps exposed by dropbox.js
  const trelloFS = (typeof window !== 'undefined' && typeof window._getTrelloFirstSeen === 'function')
    ? window._getTrelloFirstSeen() : {};
  const trelloFT = (typeof window !== 'undefined' && typeof window._getTrelloFocusTotal === 'function')
    ? window._getTrelloFocusTotal() : {};

  // A finished task is not waiting. Every other context builder filters these
  // (nudge.js, about.js x2, focus.js) and this one did not, so a task completed
  // yesterday kept its full age and was reported the next morning as still
  // waiting — observed in production as "still waiting after 56 days" for
  // something closed the day before. pastTasks is excluded defensively for the
  // same reason nudge.js does it: a stale sync can put an archived task back into
  // manualTasks after midnight cleanup has already cleared doneIds.
  const _doneSet = (typeof doneIds !== 'undefined' && doneIds && typeof doneIds.has === 'function')
    ? doneIds : null;
  const _pastSet = new Set(
    (typeof pastTasks !== 'undefined' && Array.isArray(pastTasks) ? pastTasks : [])
      .map(t => t && t.id).filter(Boolean)
  );

  const entries = [
    ...((Array.isArray(manualArr) ? manualArr : []).map(t => ({ t, source: 'manual' }))),
    ...((Array.isArray(trelloArr) ? trelloArr : []).map(t => ({ t, source: 'trello' }))),
  ];

  for (const { t, source } of entries) {
    if (!t.id) continue;
    // Skipped before the age buckets too: a completed task is not ambient load.
    if (_doneSet && _doneSet.has(t.id)) continue;
    if (_pastSet.has(t.id)) continue;
    let created, focusSessions;
    if (source === 'manual') {
      if (!t.id.startsWith('manual_')) continue;
      created       = typeof _getCreatedFromId === 'function'
        ? _getCreatedFromId(t.id)
        : parseInt(t.id.replace('manual_', '')) || now;
      focusSessions = parseInt(t.focusSessions) || 0;
    } else {
      created       = trelloFS[t.id] || now;
      focusSessions = trelloFT[t.id] || 0;
    }

    const ageDays = Math.max(0, Math.floor((now - created) / 86400000));

    if      (ageDays <= 3)  buckets.d1to3++;
    else if (ageDays <= 6)  buckets.d4to6++;
    else if (ageDays <= 13) buckets.d7to13++;
    else                    buckets.d14plus++;

    if (ageDays >= 5) {
      updated[t.id] = {
        text:          t.text || '',
        firstSeen:     prior[t.id] ? prior[t.id].firstSeen : todayISO,
        dayCount:      ageDays,
        focusSessions,
      };
    }
  }

  appMemory.returningTasks = updated;
  appMemory.taskAgeBuckets = buckets;
  _saveMemory();
}

// 12a: Increment obligation-language tally for the current week and append to rolling history.
// Called by assistant.js when obligation language is detected at task add.
function _incrementObligationTally(taskText) {
  const now    = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekKey = _localISO(monday);
  const tally   = appMemory.obligationLanguageTally || { week: '', count: 0, completed: 0, tasks: [] };
  if (tally.week !== weekKey) { tally.week = weekKey; tally.count = 0; tally.completed = 0; tally.tasks = []; }
  tally.count++;
  if (taskText && !tally.tasks.includes(taskText)) tally.tasks.push(taskText);
  appMemory.obligationLanguageTally = tally;

  // Rolling 90-day history — one entry per task addition
  if (taskText) {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
    appMemory.obligationHistory = (appMemory.obligationHistory || []).filter(e => new Date(e.date) >= cutoff);
    appMemory.obligationHistory.push({ text: taskText, date: _localISO(), done: false });
  }

  _saveMemory();
}

// 12b: Record a line TODAY said on its own initiative — morning nudge, focus question,
// Sunday reflection, week theme, Monday intention, Noticed. Every generative surface
// used to speak in isolation: none knew what the others had said, or what it had said
// yesterday, so the same observation could surface four times in one morning and the
// voice could never accumulate. _memoryForAI() feeds these back to every surface.
// Deliberately NOT the assistant chat — that's user-initiated dialogue, not the app's
// unprompted voice, and its replies are long and situational.
function _memoryRecordSpokenLine(surface, text, kind) {
  if (!surface || !text) return;
  const clean = String(text).trim();
  if (!clean) return;
  const today  = _localISO();
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const lines  = (appMemory.spokenLines || []).filter(l => l && l.date && new Date(l.date) >= cutoff);
  // 12c: `kind` links the line back to the candidate that produced it, which is what
  // lets the novelty gate put a *kind* on cooldown rather than string-matching prose.
  // Optional — lines from surfaces not yet wired to the pool simply carry no kind.
  const entry = { surface, date: today, text: clean.slice(0, 200) };
  if (kind) entry.kind = kind;
  // One entry per surface per day — a regenerated line replaces, never stacks
  const i = lines.findIndex(l => l.surface === surface && l.date === today);
  if (i >= 0) lines[i] = entry; else lines.push(entry);
  // Cap raised from 30 with the gate (v2.80.x): cooldowns reach 21 days, and at one
  // entry per surface per day across five surfaces a 30-entry cap held barely six
  // days of history — a kind would leave cooldown purely by eviction.
  appMemory.spokenLines = lines.slice(-120);
  _saveMemory();
}

// 12c Phase 0 — dated record of how each task ended.
//
// Why events and not conclusions: `design/Personalization.md` says store conclusions, not
// behavior. That is right for stable traits (peakHour) and wrong here. Every observation the
// pool is allowed to make is a *windowed contrast* — focus that went to chosen work vs.
// obligations over 30 days, completion rate on each, how often deferrals come back. A
// conclusion computed at write time has already discarded the window. So: bounded dated
// events in, and the candidate builder is the transformation step.
//
// Deliberately does NOT store task text. Nothing downstream needs it — the contrasts are
// computed from the obligation flag, the focus count, and the outcome — so there is no reason
// to hold another 90-day copy of what the user wrote.
function _memoryFocusSessionsFor(taskId, taskText) {
  const pools = [
    typeof manualTasks !== 'undefined' ? manualTasks : [],
    typeof soonTasks   !== 'undefined' ? soonTasks   : [],
    typeof pastTasks   !== 'undefined' ? pastTasks   : [],
  ];
  if (taskId) {
    for (const pool of pools) {
      for (const t of pool) if (t && t.id === taskId) return parseInt(t.focusSessions) || 0;
    }
  }
  // Fallback: the let-go and Soon-pull paths receive text only. Same normalized-text match
  // obligationHistory already uses for its done-marking.
  const stripped = _stripTag(taskText || '').trim();
  if (!stripped) return 0;
  for (const pool of pools) {
    for (const t of pool) if (t && _stripTag(t.text || '').trim() === stripped) return parseInt(t.focusSessions) || 0;
  }
  return 0;
}

// Stable, deterministic, non-crypto hash — used only as a dedup key, and identical across
// devices for the same text so the sync union works. Keeps the log from becoming a second
// 90-day copy of everything the user wrote.
function _memoryTextKey(text) {
  const t = _stripTag(text || '').trim().toLowerCase();
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return 'txt_' + (h >>> 0).toString(36);
}

// 12c: the pool's outcome log stores no text, only ids (a hash of the text for
// let-go and revive). letgo-return can name the task it is about only if the
// caller hands it a map back from those ids to what is on the lists right now.
// Built fresh per call from the live lists; nothing is persisted.
function _memoryTaskTexts() {
  const map = {};
  const pools = [
    typeof manualTasks !== 'undefined' ? manualTasks : [],
    typeof soonTasks   !== 'undefined' ? soonTasks   : [],
    typeof pastTasks   !== 'undefined' ? pastTasks   : [],
  ];
  for (const pool of pools) {
    for (const t of (Array.isArray(pool) ? pool : [])) {
      if (!t || !t.text) continue;
      const text = _stripTag(t.text).trim();
      if (!text) continue;
      map[_memoryTextKey(text)] = text;
      if (t.id) map[t.id] = text;
    }
  }
  return map;
}

function _memoryRecordOutcome(outcome, taskText, taskId, reason) {
  if (!outcome) return;
  const date   = _localISO();
  const id     = taskId || _memoryTextKey(taskText);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
  const log = (appMemory.taskOutcomes || []).filter(e => e && e.date && new Date(e.date) >= cutoff);
  // One record per task per outcome per day — a re-check or a repeated Soon pull on the same
  // day is the same event, not two.
  const key = id + '|' + outcome + '|' + date;
  if (!log.some(e => (e.id + '|' + e.outcome + '|' + e.date) === key)) {
    const entry = {
      id, date, outcome,
      obligation: typeof _aiCheckObligationLanguage === 'function'
        ? !!_aiCheckObligationLanguage(taskText) : false,
      focusSessions: _memoryFocusSessionsFor(taskId, taskText),
    };
    if (reason) entry.reason = reason;
    log.push(entry);
  }
  appMemory.taskOutcomes = log.slice(-300);
  // Saves here rather than relying on callers: _memoryOnTaskLetgo has an early return that
  // skips its own _saveMemory() when a task text yields no keywords.
  _saveMemory();
}

// ── Inline suggestion outcome loop ──────────────────────────────────────────
// suggestionHistory predates the post-add inline row and records actions taken
// in the assistant panel. suggestionOutcomes is deliberately separate: every
// inline offer has one stable record, one explicit reason, and downstream
// evidence that can change an initially applied suggestion into helped/reversed.

function _suggestionNormalizeTaskText(text) {
  return _stripTag(text || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function _suggestionReason(data, taskText) {
  const explicit = data?.reason;
  if (SUGGESTION_REASONS.includes(explicit)) return explicit;
  if (data?.type === 'clarify') return 'vague_task';

  const clean = _suggestionNormalizeTaskText(taskText);
  if (/\b(and|then|plus|after|before)\b|[,;/+]/.test(clean)) return 'multiple_actions';
  if (clean.split(/\s+/).filter(Boolean).length > 8) return 'long_complex_task';
  return 'other_complexity';
}

function _suggestionOutcomeRecord(details) {
  if (!appMemory || !details?.taskId) return null;
  if (!Array.isArray(appMemory.suggestionOutcomes)) appMemory.suggestionOutcomes = [];
  const now = new Date().toISOString();
  const id = 'inline_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  appMemory.suggestionOutcomes.unshift({
    id,
    taskId: details.taskId,
    taskText: details.taskText || '',
    pattern: details.type || 'break_down',
    reason: _suggestionReason(details, details.taskText),
    reasonText: (details.message || '').slice(0, 120),
    offeredAt: now,
    updatedAt: now,
  });
  appMemory.suggestionOutcomes = appMemory.suggestionOutcomes.slice(0, SUGGESTION_OUTCOME_LIMIT);
  _saveMemory();
  return id;
}

function _suggestionOutcomeUpdate(id, changes) {
  if (!id || !Array.isArray(appMemory?.suggestionOutcomes)) return false;
  const record = appMemory.suggestionOutcomes.find(entry => entry.id === id);
  if (!record) return false;
  Object.assign(record, changes, { updatedAt: new Date().toISOString() });
  _saveMemory();
  return true;
}

function _suggestionOutcomeDismiss(id, source) {
  if (source !== 'user' && source !== 'auto') return false;
  const record = appMemory?.suggestionOutcomes?.find(entry => entry.id === id);
  if (!record || record.appliedAt || record.dismissedAt || record.ignoredAt) return false;
  const now = new Date().toISOString();
  return _suggestionOutcomeUpdate(id, source === 'user'
    ? { dismissedAt: now, outcome: 'dismissed' }
    : { ignoredAt: now, outcome: 'ignored' });
}

function _suggestionOutcomeApply(id, resultTaskIds) {
  const record = appMemory?.suggestionOutcomes?.find(entry => entry.id === id);
  if (!record || record.dismissedAt || record.ignoredAt) return false;
  const now = new Date().toISOString();
  const resultSet = new Set((resultTaskIds || []).filter(Boolean));
  const current = [
    ...(typeof manualTasks !== 'undefined' ? manualTasks : []),
    ...(typeof soonTasks !== 'undefined' ? soonTasks : []),
    ...(typeof pastTasks !== 'undefined' ? pastTasks : []),
  ];
  const originalText = _suggestionNormalizeTaskText(record.taskText);
  return _suggestionOutcomeUpdate(id, {
    appliedAt: record.appliedAt || now,
    outcome: 'applied',
    resultTaskIds: [...resultSet],
    matchingTaskIdsAtApply: originalText ? current
      .filter(task => !resultSet.has(task.id) &&
        _suggestionNormalizeTaskText(task.text || task.name) === originalText)
      .map(task => task.id)
      : [],
  });
}

function _suggestionOutcomeOnTaskComplete(taskId) {
  if (!taskId || !Array.isArray(appMemory?.suggestionOutcomes)) return false;
  let changed = false;
  const now = new Date().toISOString();
  for (const record of appMemory.suggestionOutcomes) {
    if (!record.appliedAt || record.reversedAt || record.helpedAt) continue;
    if (!(record.resultTaskIds || []).includes(taskId)) continue;
    record.helpedAt = now;
    record.outcome = 'helped';
    record.updatedAt = now;
    changed = true;
  }
  if (changed) _saveMemory();
  return changed;
}

function _suggestionReconcileOutcomes() {
  if (!Array.isArray(appMemory?.suggestionOutcomes)) return false;
  const current = [
    ...(typeof manualTasks !== 'undefined' ? manualTasks : []),
    ...(typeof soonTasks !== 'undefined' ? soonTasks : []),
    ...(typeof pastTasks !== 'undefined' ? pastTasks : []),
  ];
  const currentById = new Map(current.map(task => [task.id, task]));
  const deletedIds = new Set((typeof _getDeletedIds === 'function'
    ? _getDeletedIds()
    : safeJSON('today_deleted_ids', [])).map(entry => entry.id));
  const completedIds = typeof doneIds !== 'undefined' ? doneIds : new Set();
  let changed = false;
  const now = new Date().toISOString();

  for (const record of appMemory.suggestionOutcomes) {
    if (!record.appliedAt || record.reversedAt || record.helpedAt) continue;
    const resultIds = (record.resultTaskIds || []).filter(Boolean);
    if (!resultIds.length) continue;

    if (resultIds.some(id => completedIds.has(id))) {
      record.helpedAt = now;
      record.outcome = 'helped';
      record.updatedAt = now;
      changed = true;
      continue;
    }

    const appliedMs = Date.parse(record.appliedAt);
    if (!Number.isFinite(appliedMs) || Date.now() - appliedMs < SUGGESTION_REVERSAL_GRACE_MS) continue;

    const resultSet = new Set(resultIds);
    const baselineMatches = new Set(record.matchingTaskIdsAtApply || []);
    const originalText = _suggestionNormalizeTaskText(record.taskText);
    const originalRestored = originalText && current.some(task =>
      !resultSet.has(task.id) && !baselineMatches.has(task.id) &&
      _suggestionNormalizeTaskText(task.text || task.name) === originalText
    );
    const allDiscarded = resultIds.every(id => {
      if (deletedIds.has(id)) return true;
      const task = currentById.get(id);
      return !!task && task.zone === 'past' && task.status === 'let_go';
    });

    if (originalRestored || allDiscarded) {
      record.reversedAt = now;
      record.reversalReason = originalRestored ? 'original_restored' : 'all_steps_discarded';
      record.outcome = 'reversed';
      record.updatedAt = now;
      changed = true;
    }
  }

  if (changed) _saveMemory();
  return changed;
}

function _suggestionOutcomeStats(reason) {
  const records = (appMemory?.suggestionOutcomes || []).filter(record => !reason || record.reason === reason);
  const stats = {
    offered: records.length,
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
  for (const record of records) {
    if (record.appliedAt) stats.applied++;
    if (record.dismissedAt) stats.dismissed++;
    if (record.ignoredAt) stats.ignored++;
    if (record.reversedAt && !record.helpedAt) stats.reversed++;
    if (record.helpedAt) stats.helped++;
    if (record.appliedAt && (!record.reversedAt || record.helpedAt)) stats.retained++;
  }
  stats.decisions = stats.applied + stats.dismissed + stats.ignored;
  stats.failures = stats.dismissed + stats.ignored + stats.reversed;
  stats.underperforming = stats.decisions >= 4 && stats.failures / stats.decisions >= 0.7;
  return stats;
}

function _suggestionStableBucket(value) {
  let hash = 0;
  for (const char of String(value || '')) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 4;
}

function _suggestionShouldOffer(reason, taskId) {
  const stats = _suggestionOutcomeStats(reason);
  if (!stats.underperforming) return true;
  // Keep one-in-four exploration so a category can recover if the person's
  // behavior changes; repeated failures reduce noise without becoming a ban.
  return _suggestionStableBucket(reason + ':' + taskId) === 0;
}

function _suggestionPerformanceContext() {
  const lines = [];
  for (const reason of SUGGESTION_REASONS) {
    const stats = _suggestionOutcomeStats(reason);
    if (stats.decisions < 3) continue;
    const evidence = `${stats.applied}/${stats.decisions} applied, ${stats.helped} led to a completed step, ${stats.reversed} later reversed`;
    if (stats.underperforming) lines.push(`${reason}: ${evidence}; use rarely`);
    else if (stats.helped > 0) lines.push(`${reason}: ${evidence}; prefer when it genuinely fits`);
    else lines.push(`${reason}: ${evidence}`);
  }
  return lines.length ? ' Reason performance: ' + lines.join('. ') + '.' : '';
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
  // Guard: don't double-count a re-check (uncheck then check again on the same day).
  // recentCompletedTasks deduplicates by text+date — if this text is already there for
  // today, all the counters were already incremented on the first check.
  if (taskText) {
    const today = _localISO();
    if ((appMemory.recentCompletedTasks || []).some(e => e.text === taskText && e.date === today)) {
      return;
    }
  }
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
  const _kStopWords = new Set(['about','after','also','back','been','before','call','check','done','from','have','into','just','make','more','need','send','some','take','than','that','them','then','they','this','were','what','when','will','with','your']);
  const words = _stripTag(taskText).toLowerCase().split(/\s+/)
    .map(w => w.replace(/[^a-z]/g, ''))
    .filter(w => w.length >= 5 && !_kStopWords.has(w));
  const _kwDay = _localISO();
  const _kwCutoff = _localISO(new Date(Date.now() - 90 * 86400000));
  for (const word of words) {
    if (!appMemory.patterns.taskKeywords[word]) appMemory.patterns.taskKeywords[word] = { days: {} };
    const kw = appMemory.patterns.taskKeywords[word];
    if (!kw.days) { kw.days = {}; if (kw.completed) kw.days['_legacy'] = kw.completed; }
    kw.days[_kwDay] = (kw.days[_kwDay] || 0) + 1;
    for (const d of Object.keys(kw.days)) { if (d < _kwCutoff) delete kw.days[d]; }
  }
  
  appMemory.totalTasksCompleted++;

  // A completed generated step is stronger evidence than accepting the chip:
  // it is the positive signal used to prefer useful recommendation patterns.
  _suggestionOutcomeOnTaskComplete(taskId);

  // Record task lifespan — days from creation to completion (manual tasks only)
  if (taskId && taskId.startsWith('manual_') && typeof _getCreatedFromId === 'function') {
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

  // 12a: Track obligation-language completions — weekly tally + history done flag
  if (taskText && typeof _aiCheckObligationLanguage === 'function' && _aiCheckObligationLanguage(taskText)) {
    const _oblNow    = new Date();
    const _oblMonday = new Date(_oblNow);
    _oblMonday.setDate(_oblNow.getDate() - ((_oblNow.getDay() + 6) % 7));
    const _oblWeek = _localISO(_oblMonday);
    const _oblTally = appMemory.obligationLanguageTally || { week: '', count: 0, completed: 0, tasks: [] };
    if (_oblTally.week === _oblWeek) {
      _oblTally.completed = (_oblTally.completed || 0) + 1;
      appMemory.obligationLanguageTally = _oblTally;
    }
    // Mark matching history entry done — find by normalized text, most recent first
    const _stripped = _stripTag(taskText).trim();
    const _hist = appMemory.obligationHistory || [];
    for (let i = _hist.length - 1; i >= 0; i--) {
      if (!_hist[i].done && _stripTag(_hist[i].text || '').trim() === _stripped) {
        _hist[i].done = true;
        break;
      }
    }
  }

  _memoryRecordOutcome('done', taskText, taskId);
  _saveMemory();
}

// Update memory when focus session completes
// Update memory when a task is let go at triage — captures deferred vocabulary
function _memoryOnTaskLetgo(taskText, reason, outcome) {
  if (!taskText) return;
  // Recorded before the keyword logic below, which returns early when a task yields no
  // usable words. `outcome` lets the Soon-pull path route through here without producing
  // two records for one event.
  _memoryRecordOutcome(outcome || 'letgo', taskText, null, reason);
  if (reason) {
    if (!appMemory.patterns.letgoReasons) appMemory.patterns.letgoReasons = {};
    const _lrToday = _localISO();
    const _lrEntry = appMemory.patterns.letgoReasons[reason];
    if (!_lrEntry || typeof _lrEntry === 'number') {
      appMemory.patterns.letgoReasons[reason] = { days: { [_lrToday]: 1 + (typeof _lrEntry === 'number' ? 0 : 0) } };
      if (typeof _lrEntry === 'number') appMemory.patterns.letgoReasons[reason].days['_legacy'] = _lrEntry;
    } else {
      if (!_lrEntry.days) _lrEntry.days = {};
      _lrEntry.days[_lrToday] = (_lrEntry.days[_lrToday] || 0) + 1;
    }
  }
  // Same stale-premise bug as returningTasks: a task you let go is no longer pending,
  // but obligationHistory only ever learned about completions, so an abandoned
  // obligation kept showing up under "Still pending" until the 90-day prune.
  // Deliberately a separate `letgo` flag rather than reusing `done` — a let-go is a
  // real outcome and belongs in the completion-rate denominator, so marking it done
  // would silently inflate the rate it feeds.
  if (typeof _aiCheckObligationLanguage === 'function' && _aiCheckObligationLanguage(taskText)) {
    const _lgStripped = _stripTag(taskText).trim();
    const _lgHist = appMemory.obligationHistory || [];
    for (let i = _lgHist.length - 1; i >= 0; i--) {
      if (!_lgHist[i].done && !_lgHist[i].letgo
          && _stripTag(_lgHist[i].text || '').trim() === _lgStripped) {
        _lgHist[i].letgo = true;
        break;
      }
    }
  }

  const _kStopWords = new Set(['about','after','also','back','been','before','call','check','done','from','have','into','just','make','more','need','send','some','take','than','that','them','then','they','this','were','what','when','will','with','your']);
  const words = _stripTag(taskText).toLowerCase().split(/\s+/)
    .map(w => w.replace(/[^a-z]/g, ''))
    .filter(w => w.length >= 5 && !_kStopWords.has(w));
  if (!words.length) return;
  if (!appMemory.preferences.dragKeywords) appMemory.preferences.dragKeywords = [];
  appMemory.preferences.dragKeywords.push(...words);
  if (appMemory.preferences.dragKeywords.length > 100)
    appMemory.preferences.dragKeywords = appMemory.preferences.dragKeywords.slice(-100);
  _saveMemory();
}

function _memoryOnTriageUndo() {
  appMemory.patterns.triageUndos = (appMemory.patterns.triageUndos || 0) + 1;
  _saveMemory();
}

function _memoryOnSoonPull(taskText) {
  appMemory.patterns.soonPulls = (appMemory.patterns.soonPulls || 0) + 1;
  _memoryOnTaskLetgo(taskText, '', 'soon_pull');
}

function _memoryOnRevive(taskText, reason) {
  // Pulling something back from Past is among the most deliberate acts in the app —
  // a commitment you had abandoned and chose again. design/Personalization.md names
  // Revive first in the evidence worth preferring; Phase 0 recorded done, letgo and
  // soon_pull but missed it.
  _memoryRecordOutcome('revive', taskText, null, reason);
  if (reason) {
    if (!appMemory.patterns.reviveReasons) appMemory.patterns.reviveReasons = {};
    const _rvToday = _localISO();
    const _rvEntry = appMemory.patterns.reviveReasons[reason];
    if (!_rvEntry || typeof _rvEntry === 'number') {
      appMemory.patterns.reviveReasons[reason] = { days: { [_rvToday]: 1 } };
      if (typeof _rvEntry === 'number') appMemory.patterns.reviveReasons[reason].days['_legacy'] = _rvEntry;
    } else {
      if (!_rvEntry.days) _rvEntry.days = {};
      _rvEntry.days[_rvToday] = (_rvEntry.days[_rvToday] || 0) + 1;
    }
  }
  _saveMemory();
}

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
  if (typeof manualTasks !== 'undefined') {
    _updateReturningTasksMemory(
      manualTasks,
      typeof trelloTasks !== 'undefined' ? trelloTasks : []
    );
  }
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
    lines.push('Recent completed tasks (shows how the user writes): ' + examples.join(', ') + '.');
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
    const _lh = e => typeof e === 'object' ? e.h : e;
    const avgHour = Math.round(lateAdds.reduce((s, e) => s + _lh(e), 0) / lateAdds.length);
    const latePct = Math.round(lateAdds.filter(e => _lh(e) >= 14).length / lateAdds.length * 100);
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

  // Soon pull-back pattern — optimistic deferrals that keep coming back
  const soonPulls = m.patterns.soonPulls || 0;
  if (soonPulls >= 3) {
    lines.push(`You often pull tasks back from Soon — tends to overestimate future availability.`);
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

  // Confirmed AI-proposed inferences (Step 5) — user has ratified these via Memory panel
  const confirmed = ['semantic', 'procedural', 'episodic'].flatMap(t =>
    (m.memory?.[t] || []).filter(i => i.status === 'confirmed').map(i => i.text)
  );
  if (confirmed.length > 0) {
    lines.push(`Confirmed patterns (ratified by user):\n${confirmed.map(t => `- ${t}`).join('\n')}`);
  }

  // Returning tasks — waiting 5+ days. Focus avoidance (7+ days, zero sessions) is carried
  // as an inline marker rather than a second block. Emitting the same task under two headings
  // ("keep waiting" and "not yet started") made it the most-repeated string in the prompt —
  // and a model selecting from an unranked list selects on salience, so repetition was doing
  // the choosing. Verified in a captured payload 2026-09-01: one task appeared 3 times.
  // Fixes the symptom only; ranking properly is 12c's job.
  const returning = Object.values(m.returningTasks || {}).sort((a, b) => b.dayCount - a.dayCount);
  if (returning.length > 0) {
    const items = returning.slice(0, 3).map(t => {
      const marker = t.focusSessions > 0
        ? `, ${t.focusSessions} focus session${t.focusSessions > 1 ? 's' : ''}`
        : (t.dayCount >= 7 ? ', never opened' : ', not yet started');
      return `"${_stripTag(t.text)}" (${t.dayCount} days${marker})`;
    });
    lines.push(`Tasks that keep waiting:\n${items.join('\n')}`);
  }

  // Signal 2: List growth direction — are more tasks being added than completed?
  const _growthHistory = (typeof safeJSON === 'function') ? safeJSON('today_daily_history', []) : [];
  const _last7h = _growthHistory.slice(-7);
  if (_last7h.length >= 3) {
    const _added = _last7h.reduce((s, e) => s + (e.tasksAdded || 0), 0);
    const _done  = _last7h.reduce((s, e) => s + (e.tasksDone  || 0), 0);
    const _surplus = _added - _done;
    if (_surplus >= 3)       lines.push(`List is growing: ${_added} tasks added, ${_done} completed over the last ${_last7h.length} days.`);
    else if (_surplus <= -3) lines.push(`List is shrinking: ${_done} completed, ${_added} added over the last ${_last7h.length} days.`);
  }

  // Signal 3: Obligation language — task names this week + long-term completion rate
  const oblTally = m.obligationLanguageTally;
  const _oblHistory = m.obligationHistory || [];
  if (oblTally && oblTally.count >= 2) {
    const oblCompleted = oblTally.completed || 0;
    // Pending obligation tasks: history entries from this week not yet done
    const _wkMonday = new Date(); _wkMonday.setDate(_wkMonday.getDate() - ((_wkMonday.getDay() + 6) % 7));
    const _wkStart  = _localISO(_wkMonday);
    const _pendingObl = _oblHistory
      .filter(e => e.date >= _wkStart && !e.done && !e.letgo)
      .map(e => `"${_stripTag(e.text)}"`);
    if (_pendingObl.length > 0) {
      lines.push(`This week: ${oblTally.count} obligation-framed tasks — ${oblCompleted} completed. Still pending: ${_pendingObl.slice(0, 5).join(', ')}.`);
    } else {
      lines.push(`This week: ${oblTally.count} obligation-framed tasks — ${oblCompleted} completed.`);
    }
  }
  // Long-term completion rate — only surface when statistically meaningful (10+ entries, 30+ days)
  const _oblCutoff = new Date(); _oblCutoff.setDate(_oblCutoff.getDate() - 30);
  const _oblRecent = _oblHistory.filter(e => new Date(e.date) >= _oblCutoff);
  if (_oblRecent.length >= 10) {
    const _oblDone = _oblRecent.filter(e => e.done).length;
    lines.push(`Over 30 days: ${Math.round(_oblDone / _oblRecent.length * 100)}% of obligation-framed tasks completed (${_oblDone}/${_oblRecent.length}).`);
  }

  // Signal 4: Cognitive weight — tasks sitting 14+ days (ambient load, not just list size)
  const _old14 = (m.taskAgeBuckets || {}).d14plus || 0;
  if (_old14 >= 2) {
    lines.push(`${_old14} tasks have been on the list for more than 2 weeks.`);
  }

  // 12b: What TODAY has already said, across every surface. Without this each
  // generator spoke blind — the nudge could not know it made the same observation
  // yesterday, and the focus question at 2pm could not know the nudge had already
  // named that task at 8am. Last 8 is enough to cover roughly a week of mornings
  // plus the current day's other surfaces.
  const spoken = (m.spokenLines || []).slice(-8);
  if (spoken.length > 0) {
    const spokenLines = spoken.map(l => `[${l.date} · ${l.surface}] ${l.text}`);
    lines.push(
      `Already said to them recently — do not repeat these observations, and do not reuse their sentence shape:\n${spokenLines.join('\n')}`
    );
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
// that DO show a signal always show identical content. Season moments are the
// intentional exception: their wording follows the viewer's local hemisphere.
function _noticedEligible(key, todayISO) {
  if (!appMemory.noticedDates) appMemory.noticedDates = {};
  const d = appMemory.noticedDates[key];
  return !d || d === todayISO;
}
function _noticedStamp(key, todayISO) {
  if (!appMemory.noticedDates) appMemory.noticedDates = {};
  if (!appMemory.noticedDates[key]) appMemory.noticedDates[key] = todayISO;
}

// 24 sekki solar terms in calendar order. Southern-hemisphere viewers receive
// the term half a year opposite (12 entries), matching their local season while
// preserving the same sparse transition-day cadence.
const _SEASON_MOMENTS = [
  { date: '01-06', term: '小寒 · Minor Cold',          line: 'The light is back — a minute more each day.' },
  { date: '01-20', term: '大寒 · Major Cold',          line: 'Coldest weeks. The world is very still.' },
  { date: '02-04', term: '立春 · Start of Spring',     line: 'Halfway between solstice and equinox. Spring is on its way.' },
  { date: '02-19', term: '雨水 · Rain Water',          line: 'The thaw begins.' },
  { date: '03-06', term: '啓蟄 · Awakening of Insects', line: 'Something is waking underground.' },
  { date: '03-21', term: '春分 · Spring Equinox',      line: 'Day and night in balance. The year tips into light.' },
  { date: '04-05', term: '清明 · Clear and Bright',    line: 'The air is clear. Light is landing differently now.' },
  { date: '04-20', term: '穀雨 · Grain Rain',          line: 'April rain, the long kind.' },
  { date: '05-06', term: '立夏 · Start of Summer',     line: 'Summer starts by the old measure. Trees are finally green.' },
  { date: '05-21', term: '小満 · Grain Buds',          line: 'Long evenings now. Light stays past dinner.' },
  { date: '06-06', term: '芒種 · Grain in Ear',        line: 'The longest light before the solstice.' },
  { date: '06-21', term: '夏至 · Summer Solstice',     line: "Midsummer — the year's longest day." },
  { date: '07-07', term: '小暑 · Minor Heat',          line: 'The warmest weeks. Summer at its fullest.' },
  { date: '07-23', term: '大暑 · Major Heat',          line: 'Peak summer. The days are already shortening.' },
  { date: '08-07', term: '立秋 · Start of Autumn',     line: 'The sun pulls back. Autumn is on its way.' },
  { date: '08-23', term: '処暑 · End of Heat',         line: 'Mornings have an edge to them now.' },
  { date: '09-08', term: '白露 · White Dew',           line: 'Dew on the grass. The year is cooling.' },
  { date: '09-23', term: '秋分 · Autumnal Equinox',    line: 'Day and night equal again. The year tips toward dark.' },
  { date: '10-08', term: '寒露 · Cold Dew',            line: 'The leaves are turning. Cold mornings.' },
  { date: '10-23', term: "霜降 · Frost's Descent",    line: 'First frosts. The year is giving in to winter.' },
  { date: '11-07', term: '立冬 · Start of Winter',     line: 'The light is leaving quickly. Winter is here.' },
  { date: '11-22', term: '小雪 · Minor Snow',          line: 'Snow possible any morning now.' },
  { date: '12-07', term: '大雪 · Major Snow',          line: 'Dark midwinter. Almost at the stillest point of the year.' },
  { date: '12-21', term: '冬至 · Winter Solstice',     line: "The year's shortest day. The light turns back tomorrow." },
];

function _seasonMomentForDate(todayISO, southern) {
  const index = _SEASON_MOMENTS.findIndex(moment => moment.date === String(todayISO).slice(5));
  if (index < 0) return null;
  const isSouthern = southern === undefined
    ? (typeof _isSouthernTimezone === 'function' && _isSouthernTimezone())
    : southern;
  return _SEASON_MOMENTS[(index + (isSouthern ? 12 : 0)) % _SEASON_MOMENTS.length];
}

function _noticedLines() {
  if (!appMemory.noticed) appMemory.noticed = {};
  const n = appMemory.noticed;
  const lines = [];
  let dirty = false;
  const todayISO = _localISO();
  const _hr12 = h => (h > 12 ? h - 12 : h) + (h >= 12 ? 'pm' : 'am');

  // 0 · Season moment — 24 sekki solar terms (v2.60.0, expanded from 6 in v2.37.0).
  // Astronomical — sun’s ecliptic longitude every 15°. Dates pinned to typical MM-DD;
  // off by ±1 day in some years, fine for a quiet line. Wallpaper escape by
  // construction: each date shows once, ~24 appearances per year.
  // Each entry is { term, line } — term is the Japanese sekki name + English gloss,
  // rendered as a muted label above the evocative line. Season gets the full
  // Noticed block; other signals are deferred to the next panel open (v2.70.1).
  const seasonMoment = _seasonMomentForDate(todayISO);
  if (seasonMoment && n.seasonDate !== todayISO) {
    const seasonElig = 'season:' + todayISO;
    if (_noticedEligible(seasonElig, todayISO)) {
      n.seasonDate = todayISO;
      _noticedStamp(seasonElig, todayISO);
      _saveMemory();
      // Season owns the full Noticed block — return early, other signals deferred
      return [{ _season: true, term: seasonMoment.term, line: seasonMoment.line }];
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
