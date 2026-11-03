// Fictional, scripted interaction study. No app runtime, persistence, or API calls.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const example = "I sketched while the kettle boiled. The book was already open, and I didn't have a picture in mind.";
  const originalHypothesis = 'Having materials ready and no finished picture in mind may have made starting easier. One experience leaves both explanations open.';
  const nextQuestion = 'Was having no finished picture in mind also part of the earlier sketches?';
  const withheldQuestion = "A source changed, so TODAY's reading is withheld. Anything you'd add in your own words?";
  let proposal = true;
  let notesOpen = false;
  let tryOpen = false;
  let shownExample = false;
  let synthesisCurrent = false;
  let turns = [];
  let amendments = [];
  let savedDrafts = [];
  let taskApproved = false;
  let forgotten = false;
  // Entrance study: where the exploration was opened from, and a context reference not yet chosen.
  let origin = null;
  let pendingRef = null;
  let refs = [];
  let nudgeScene = 'linked';
  let listScene = 'tasks';
  let nudgeDismissed = false;
  // Landing study: one fictional record set drives both landings. Shapes follow memory-panel.js:
  // returning/obligation/Soon records, computed facts, confirmed stable and live episodic AI readings,
  // the separate feeling reading, the dream index and coverage. Nothing here is a new model output.
  const fixtures = {
    full: () => ({
      known: [
        {id: 'rt:2', kind: 'returning', text: 'Draft the garden plan', days: 7, focus: 2},
        {id: 'rt:1', kind: 'returning', text: 'Sketch by the window', days: 5, focus: 1, linked: true},
        {id: 'rt:3', kind: 'returning', text: 'Renew library card', days: 9, focus: 0},
        {id: 'oh:1', kind: 'obligation', text: 'Call the boiler engineer', added: 'Oct 28'}
      ],
      waiting: [
        {id: 'sn:1', kind: 'waiting', text: 'Repaint the hallway shelf', days: 12},
        {id: 'sn:2', kind: 'waiting', text: 'Plan a weekend walk', days: 8}
      ],
      facts: ['most tasks done between 9am–11am', 'tasks typically close in about 2 days',
        'most common let-go reason: no energy (41%)', '1 in 4 let-go tasks comes back within a month'],
      readings: [{id: 'semantic:a', text: 'chosen tasks tend to get a focus session sooner than ones framed as obligations', weeks: 3}],
      episodic: [{id: 'episodic:b', text: 'tasks brought back from Past this week were finished within a day'}],
      lately: ['6 tasks done in the last 7 days', 'best day this week: Tuesday (3 tasks)',
        'averaging 2.0 tasks on active days this week', '2 tasks started — still open'],
      feelings: {policy: 'remember', sentence: 'In your evening reflections, you named calm more often on days you let a task go than on days you finished without releasing one.'},
      dreams: {count: 3, comesBack: [{label: 'a train station', n: 2}],
        list: ['Oct 30 — waiting on a platform while the trains…', 'Oct 19 — a station café that kept changing…', 'Oct 6 — carrying a ladder through a library…']},
      coverage: ['noticing since Aug 4, 2026 — active on 61 of 91 days', '214 tasks done in all',
        '38.5 hours of focus so far', '30 days · 41 done · 9 let go · 6 to Soon · 2 brought back']
    }),
    // A new person, nine days in: no exploration, no readings, reflections not kept, no dreams.
    sparse: () => ({
      known: [{id: 'rt:9', kind: 'returning', text: 'Renew library card', days: 5, focus: 0}],
      waiting: [], facts: [], readings: [], episodic: [],
      lately: ['4 tasks done in the last 7 days'],
      feelings: {policy: null, sentence: null},
      dreams: {count: 0, comesBack: [], list: []},
      coverage: ['noticing since Oct 25, 2026 — active on 7 of 9 days', '18 tasks done in all',
        '30 days · 18 done · 2 let go · 1 to Soon · 0 brought back']
    })
  };
  let fixtureName = 'full';
  let data = fixtures.full();
  let visit;
  let animateNext = null;
  // Disclosures reset on each Memory visit, as in the app.
  const resetVisit = () => { visit = {waiting: false, holds: false, dreams: false, feel: false, vote: null, coverage: false, clear: false}; };
  resetVisit();
  const hasExploration = () => fixtureName === 'full' && !forgotten;
  const nudgeLines = {
    linked: '“Sketch by the window” is still here from Monday.',
    overlap: '“Order sketchbook refills” is still here from Monday.'
  };
  // The back action is the only breadcrumb: it names the place you return to.
  const origins = {
    memory: {back: '← all memory'},
    list: {back: '← today'},
    nudge: {back: '← morning line'},
    task: {back: '← your tasks'}
  };
  const selectedSources = new Set(['NOTE-01', 'NOTE-02']);
  const announce = text => { $('status').textContent = text; };
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const button = (text, action) => {
    const node = element('button', text, 'memory-item-btn');
    node.type = 'button'; node.dataset.action = action; return node;
  };
  function record() {
    const lines = [
      '---', 'workspace_id: "69b0d575-b14b-4d21-8501-6bfa95514c82"', 'schema_version: "study-1"',
      `revision: ${turns.length + amendments.length + savedDrafts.length + refs.length}`, 'persistence: "preview-only"', '---', '',
      '# Exploration — fictional preview', '',
      '## Question', 'What makes room for sketching?', '',
      '## Context', 'Problem framing; possible explanations remain open.', '',
      '## Observations',
      '- NOTE-01: "I liked making a quick sketch without deciding what it should become."',
      '- NOTE-02: "I drew again when the sketchbook happened to be on the table."',
      ...turns.map((text, index) => `- NOTE-${String(index + 3).padStart(2, '0')}: ${JSON.stringify(text)}`), '',
      '## Linked evidence',
      '- TASK-01: one recorded focus session on "Sketch by the window".',
      '- Task activity supplies context; the person supplies how it felt.', '',
      ...(refs.length ? ['## Context references', ...refs.map(ref => `- ${ref.id}: ${ref.label}, ${JSON.stringify(ref.text)}. Chosen when opening from ${ref.from}; TODAY's wording, not an observation or endorsement. Not analyzed in this study.`), ''] : []),
      '## Working interpretation',
      synthesisCurrent
        ? (amendments.length
          ? `${amendments.at(-1)}\nSource: explicit user correction; no inherited AI evidence claim.\nStatus: meaning remains open.`
          : `${originalHypothesis}\nStatus: AI hypothesis, unconfirmed.\nMaterials: NOTE-02, NOTE-03.\nNo finished picture: NOTE-01, NOTE-03.\nTiming: NOTE-03 only; open.\nActivity size: NOTE-01, NOTE-03; duration unknown, open.`)
        : 'No new synthesis in this preview. Materials, timing, and activity size remain open; source inclusion must support any reply.',
      ...(amendments.length ? ['', '## Amendment history', `- Initial AI hypothesis: ${originalHypothesis}`, ...amendments.map(text => `- User correction: ${JSON.stringify(text)}`)] : []),
      ...(savedDrafts.length ? ['', '## Additional thoughts', ...savedDrafts.map(note => `- ${note.id}: User wording: ${JSON.stringify(note.text)}; not analyzed in this study.`)] : []), '',
      '## Source inclusion for replies', `Selected: ${[...selectedSources].join(', ') || 'none'}.\nOmitted sources stay in the private record; their use is withheld.`, '',
      '## Next open thread', synthesisCurrent ? nextQuestion : 'Reconsider the question using the selected evidence.', '',
      '## Experiments', taskApproved ? 'Proposed, not run: leave a page open for an ordinary day.\nQuestion: does reducing preparation help?\nEffort: one setup, less than a minute; no daily log.\nReview: when returning to this exploration.\nStop: if it becomes another obligation.\nFictional daily action linked; completion and benefit remain unknown.' : 'None agreed. An observation can remain useful without an action.', '',
      '## Storage', 'This preview has not saved or synced anything.'
    ];
    $('recordText').textContent = lines.join('\n');
  }
  // Human-readable notes are derived from the same state as the Markdown record.
  const sourceRow = (label, text) => {
    const row = element('li', null, 'memory-item');
    const body = element('span', null, 'memory-item-text');
    body.append(element('span', label, 'source-id'), text);
    row.append(body); return row;
  };
  const pad = n => String(n).padStart(2, '0');
  function renderNotes() {
    const corrected = amendments.length > 0;
    $('hypothesisLabel').hidden = !synthesisCurrent;
    $('hypothesisLabel').textContent = corrected ? 'Your wording · replaces the earlier reading' : 'TODAY · unconfirmed';
    $('hypothesisText').textContent = !synthesisCurrent
      ? (shownExample ? 'Withheld. A source was left out, so the reading that relied on it is not shown. Your words and corrections stay in the Markdown record.' : 'No reading yet. Materials, timing and activity size remain open.')
      : (corrected ? amendments.at(-1) : originalHypothesis);
    $('hypothesisText').classList.toggle('quiet', !synthesisCurrent);
    $('correctStart').hidden = !synthesisCurrent;
    if (!synthesisCurrent) $('correction').hidden = true;
    $('correctionNote').hidden = !(synthesisCurrent && corrected);
    // Earlier versions are shown only beside a current reading; withheld history stays in the raw record.
    const history = $('amendmentList'); history.replaceChildren();
    history.hidden = !(synthesisCurrent && corrected);
    if (!history.hidden) {
      history.append(sourceRow('Earlier · TODAY, unconfirmed', originalHypothesis));
      amendments.slice(0, -1).forEach(text => history.append(sourceRow('Earlier · your wording', text)));
    }
    $('changesBlock').hidden = !synthesisCurrent;
    const added = $('addedSources'); added.replaceChildren();
    turns.forEach((text, index) => added.append(sourceRow(`NOTE-${pad(index + 3)} · your words, this conversation`, `“${text}”`)));
    savedDrafts.forEach(note => added.append(sourceRow('your words · kept, not analysed in this study', `“${note.text}”`)));
    refs.forEach(ref => added.append(sourceRow(`${ref.id} · TODAY's wording, brought by you`, `“${ref.text}”`)));
    // Something to try appears only when asked, and only beside a current reading.
    $('tryAsk').hidden = !synthesisCurrent || tryOpen || taskApproved;
    $('tryView').hidden = !((tryOpen && synthesisCurrent) || taskApproved);
    $('tryUnavailable').hidden = synthesisCurrent || taskApproved;
  }
  const update = () => { record(); renderNotes(); };
  function setNotes(open, focusId) {
    notesOpen = open;
    $('sessionView').hidden = open; $('notesView').hidden = !open;
    $('notesToggle').hidden = open || forgotten;
    $('notesToggle').setAttribute('aria-expanded', String(open));
    $('memoryReturn').textContent = open ? '← conversation' : origins[origin ? origin.kind : 'memory'].back;
    if (open) { renderNotes(); $(focusId || 'notesTitle').focus(); }
    else if (focusId !== false) $('notesToggle').focus();
  }
  // Earlier exchanges fold away on each visit so the opening leads with resuming and replying.
  const syncResume = () => { $('resume').hidden = $('currentTurns').children.length > 0; };
  function foldTurns() {
    $('earlierList').append(...$('currentTurns').children);
    $('earlierTurns').hidden = !$('earlierList').children.length;
    $('earlierTurns').open = false;
    syncResume();
  }
  // ── Memory landing: current catalogue and proposed hierarchy, from the same records ──
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const knownPrefix = {returning: 'returning', obligation: 'obligation', waiting: 'in Soon'};
  const knownBody = k => k.kind === 'returning'
    ? `“${k.text}” — on the list ${k.days} days, ${k.focus > 0 ? plural(k.focus, 'focus session') : 'no focus sessions recorded'}`
    : k.kind === 'obligation' ? `“${k.text}” — added ${k.added}, still open` : `“${k.text}” — kept here ${k.days} days`;
  function row(text, {source, actions = [], extra = false, quiet = false} = {}) {
    const node = element('div', null, `memory-item${extra ? ' memory-item--extra' : ''}${quiet ? ' is-quiet' : ''}`);
    const body = element('span', null, 'memory-item-text');
    if (source) body.append(element('span', source, 'source-id'));
    body.append(text);
    node.append(body, ...actions); return node;
  }
  const rowAction = (label, action, key, name) => {
    const node = button(label, action); node.classList.add('row-action');
    node.dataset.key = key; node.setAttribute('aria-label', name); return node;
  };
  const dismiss = k => rowAction('dismiss', 'dismiss', k.id, `dismiss “${k.text}” from Memory`);
  const notMe = r => rowAction('not me', 'not-me', r.id, `not me: ${r.text}`);
  const disclosure = (label, action, expanded) => {
    const node = button(label, action); node.setAttribute('aria-expanded', String(expanded)); return node;
  };
  function block({name, desc, rows, empty, pending = true, more, heading = 'span', id}) {
    const node = element('div', null, 'memory-type-block');
    const head = element('div', null, 'memory-type-header');
    const title = element(heading, name, 'memory-type-name');
    if (id) { title.id = id; title.tabIndex = -1; }
    head.append(title);
    if (desc) head.append(element('span', desc, 'memory-type-desc'));
    if (more) head.append(more);
    node.append(head);
    if (rows.length) node.append(...rows);
    else if (empty && !more) node.append(element('div', empty, pending ? 'memory-pending' : 'memory-empty'));
    return node;
  }
  const waitingButton = () => data.waiting.length
    ? disclosure(visit.waiting ? 'less' : `show waiting (${data.waiting.length})`, 'waiting', visit.waiting) : null;
  // Only rows newly revealed by this action animate; refreshing an open list does not replay it.
  const extra = name => animateNext === name;
  function feelingRows(withSource) {
    const f = data.feelings;
    if (!f.policy) return [row('TODAY doesn’t keep reflections.', {source: withSource && 'how days felt', quiet: true, actions: [button('remember reflections', 'feel-remember')]})];
    if (!f.sentence) return [];
    const rows = [row(f.sentence, {
      source: withSource && 'how days felt · TODAY’s reading of evenings you reflected',
      actions: [disclosure(withSource ? 'feedback' : 'feeling feedback', 'feel-feedback', visit.feel)]
    })];
    if (visit.feel) {
      const group = element('div', null, `memory-item feel-react${extra('feel') ? ' memory-item--extra' : ''}`);
      group.setAttribute('role', 'group'); group.setAttribute('aria-label', 'How this reading landed');
      ['landed', 'not really'].forEach(label => {
        const vote = button(label, 'feel-vote'); vote.dataset.value = label;
        vote.setAttribute('aria-pressed', String(visit.vote === label)); group.append(vote);
      });
      group.append(element('span', visit.vote === 'not really'
        ? 'study: not stored. In the app this reading is withheld next visit, with undo.'
        : visit.vote ? 'study: not stored' : '', 'react-note'));
      rows.push(group);
    }
    return rows;
  }
  function dreamRows(withSource) {
    const d = data.dreams;
    if (!d.count) return [row('a dream you tell the mic lands here', {source: withSource && 'dreams', quiet: true})];
    const rows = [row(`${d.count} dreams kept in your Dropbox`, {
      source: withSource && 'dreams · your retellings',
      actions: [disclosure(visit.dreams ? 'less' : 'manage', 'dreams', visit.dreams)]
    })];
    if (d.comesBack.length) {
      const back = element('div', null, 'memory-item');
      const text = element('span', 'comes back: ', 'memory-item-text');
      d.comesBack.forEach((item, index) => {
        if (index) text.append(', ');
        const count = element('span', `(${item.n})`); count.setAttribute('aria-hidden', 'true');
        text.append(`${item.label} `, count, element('span', `in ${item.n} dreams`, 'visually-hidden'));
      });
      back.append(text); rows.push(back);
    }
    if (visit.dreams) {
      rows.push(...d.list.map(text => row(text, {extra: extra('dreams')})),
        row('read and delete work as in the app; not part of this study', {extra: extra('dreams'), quiet: true}));
    }
    return rows;
  }
  function currentBlocks() {
    const d = data;
    const patterns = [...d.facts.map(text => row(text)), ...d.readings.map(r => row(r.text, {actions: [notMe(r)]}))];
    const feel = feelingRows(false);
    return [
      block({name: 'KNOWN', desc: '— what today has on record, not what it concludes',
        rows: [...d.known.map(k => row(`${knownPrefix[k.kind]} · ${knownBody(k)}`, {actions: [dismiss(k)]})),
          ...(visit.waiting ? d.waiting.map(k => row(`${knownPrefix[k.kind]} · ${knownBody(k)}`, {actions: [dismiss(k)], extra: extra('waiting')})) : [])],
        empty: 'nothing on record yet — this fills as tasks come and go', more: waitingButton()}),
      block({name: 'PATTERNS', desc: '— what holds over time', rows: visit.holds ? patterns : patterns.slice(0, 6),
        empty: 'patterns appear as more evidence builds',
        more: patterns.length > 6 ? disclosure(visit.holds ? 'less' : `show all (${patterns.length})`, 'holds-more', visit.holds) : null}),
      block({name: 'LATELY', desc: '— the last week or so',
        rows: [...d.lately.map(text => row(text)), ...d.episodic.map(r => row(r.text, {actions: [notMe(r)]}))],
        empty: 'nothing new this week'}),
      feel.length ? block({name: 'HOW DAYS FELT', rows: feel}) : null,
      block({name: 'WHAT TODAY HAS SEEN', desc: '— how much it has to go on', rows: d.coverage.map(text => row(text)), empty: 'nothing here yet', pending: false}),
      block({name: 'DREAMS', rows: dreamRows(false)})
    ].filter(Boolean);
  }
  // Proposed: return to what is open, then what seems to hold, then what is kept apart; coverage is supporting.
  function threadRow() {
    const node = element('div', null, 'memory-item thread-item');
    const body = element('span', null, 'memory-item-text');
    const question = element('span', 'What makes room for sketching?', 'thread-question');
    question.id = 'threadQuestion';
    body.append(element('span', 'exploring · your question', 'source-id'), question,
      element('span', $('recap').textContent, 'thread-recap'),
      element('span', 'draws on your notes and one task · no feelings or dreams', 'thread-basis'));
    const go = button('continue →', 'continue');
    go.id = 'landingContinue'; go.setAttribute('aria-describedby', 'threadQuestion');
    node.append(body, go); return node;
  }
  function proposedBlocks() {
    const d = data;
    const record = k => row(knownBody(k), {
      source: `${knownPrefix[k.kind]} · on record${k.linked && hasExploration() ? ' · in your question' : ''}`,
      actions: [dismiss(k)], extra: k.kind === 'waiting' && extra('waiting')
    });
    const holds = [
      ...d.facts.map(text => row(text, {source: 'counted from your tasks'})),
      ...d.readings.map(r => row(r.text, {source: `TODAY’s reading · recurred in ${r.weeks} weeks, not confirmed by you`, actions: [notMe(r)]})),
      ...d.episodic.map(r => row(r.text, {source: 'TODAY’s reading · this week only', actions: [notMe(r)]}))
    ];
    const kept = block({name: 'KEPT APART', desc: '— private records, never mixed in', heading: 'h3', id: 'keptTitle',
      rows: [...feelingRows(true), ...dreamRows(true)]});
    kept.append(element('p', 'These stay in their own reading spaces. They are not added to your exploration automatically.', 'landing-note'));
    const coverage = element('details'); coverage.id = 'coverage'; coverage.open = visit.coverage;
    coverage.addEventListener('toggle', () => { visit.coverage = coverage.open; });
    const inner = element('div');
    inner.append(element('p', 'How much TODAY has seen. Not a measure of you.', 'landing-note'),
      ...d.coverage.map(text => row(text)));
    if (d.lately.length) inner.append(element('p', 'last 7 days', 'eyebrow'), ...d.lately.map(text => row(text)));
    coverage.append(element('summary', 'what it has to go on'), inner);
    return [
      block({name: 'STILL OPEN', desc: '— your question, then what keeps returning', heading: 'h3', id: 'openTitle',
        rows: [...(hasExploration() ? [threadRow()] : []), ...d.known.map(record), ...(visit.waiting ? d.waiting.map(record) : [])],
        empty: 'nothing on record yet — this fills as tasks come and go', more: waitingButton()}),
      block({name: 'WHAT HOLDS', desc: '— counted facts first, then TODAY’s readings', heading: 'h3', id: 'holdsTitle',
        rows: visit.holds ? holds : holds.slice(0, 6), empty: 'patterns appear as more evidence builds',
        more: holds.length > 6 ? disclosure(visit.holds ? 'less' : `show all (${holds.length})`, 'holds-more', visit.holds) : null}),
      kept, coverage
    ];
  }
  function renderFooter() {
    const footer = element('div', null, 'memory-footer landing-footer');
    if (visit.clear) {
      const yes = element('button', 'yes, clear', 'memory-conn-link is-danger');
      const no = element('button', 'cancel', 'memory-conn-link');
      [yes, no].forEach(node => { node.type = 'button'; });
      yes.dataset.action = 'clear-confirm'; no.dataset.action = 'clear-cancel'; no.id = 'clearCancel';
      const choices = element('span', null, 'memory-confirm-actions'); choices.append(yes, no);
      footer.append(element('span', proposal ? 'erase Memory’s records?' : 'erase everything?', 'memory-confirm-msg'), choices);
    } else {
      const clear = element('button', 'clear all memory', 'memory-conn-link is-danger');
      const connections = element('button', 'Connections →', 'memory-conn-link');
      clear.type = connections.type = 'button'; clear.id = 'clearRequest';
      clear.dataset.action = 'clear-request'; connections.dataset.action = 'connections';
      footer.append(clear, connections);
    }
    $('memoryFooter').replaceChildren(footer);
    // The proposal says exactly what clearing leaves: the exploration has its own forget.
    if (visit.clear && proposal && hasExploration()) $('memoryFooter').append(element('p', 'Your question stays. Forget it from its notes.', 'landing-note'));
  }
  function renderLanding() {
    const view = $('memoryView');
    view.dataset.landing = proposal ? 'proposal' : 'current';
    view.replaceChildren(...(proposal ? proposedBlocks() : currentBlocks()));
    renderFooter();
    animateNext = null;
  }
  // Re-render after a landing action and put focus back on a stable control.
  function rerender(selector) {
    renderLanding();
    const target = selector && document.querySelector(selector);
    (target || $('memoryTitle')).focus();
  }
  function memory() {
    $('memoryView').hidden = false; $('memoryFooter').hidden = false; $('explorationView').hidden = true;
    $('memoryTitle').hidden = false; $('memoryPanel').setAttribute('aria-labelledby', 'memoryTitle');
    // Current keeps the approved title-row entrance; the proposal resumes from the question in STILL OPEN.
    $('exploreEntry').hidden = proposal || !hasExploration(); $('memoryReturn').hidden = true;
    $('exploreEntry').textContent = shownExample ? 'return to exploration →' : 'explore →';
    if (notesOpen) setNotes(false, false);
    $('notesToggle').hidden = true;
    pendingRef = null; $('entryContext').hidden = true;
    renderLanding();
  }
  function explore() {
    $('memoryView').hidden = true; $('memoryFooter').hidden = true; $('explorationView').hidden = false;
    $('memoryTitle').hidden = true; $('memoryPanel').setAttribute('aria-labelledby', 'explorationTitle');
    $('exploreEntry').hidden = true; $('memoryReturn').hidden = false;
    if (notesOpen) setNotes(false, false);
    $('notesToggle').hidden = forgotten;
    foldTurns();
    $('explorationTitle').focus();
  }
  const panelOpen = () => $('memoryPanel').classList.contains('open');
  function setPanel(open) {
    $('memoryPanel').classList.toggle('open', open);
    $('memoryToggle').classList.toggle('active', open);
    $('memoryToggle').setAttribute('aria-expanded', String(open));
  }
  // Every route opens the same exploration; only the breadcrumb and the offered context differ.
  function openFrom(kind, control) {
    origin = {kind, control, panelWasOpen: origin ? origin.panelWasOpen : panelOpen()};
    setPanel(true);
    $('memoryReturn').textContent = origins[kind].back;
    showContext(kind, control);
    explore();
  }
  function showContext(kind, control) {
    pendingRef = null;
    const box = $('entryContext');
    box.hidden = forgotten || (kind !== 'nudge' && kind !== 'task');
    if (box.hidden) return;
    if (kind === 'task') {
      const row = control.closest('.task');
      $('entryContextId').textContent = 'From your list';
      $('entryContextBody').textContent = `“${row.querySelector('.task-text').textContent}”`;
      $('entryContextNote').textContent = row.dataset.linkNote === 'added from this exploration' ? 'Added from this exploration.' : 'Already connected to this exploration.';
      $('entryContextToggle').hidden = true;
      return;
    }
    const text = nudgeLines.linked;
    const kept = refs.find(ref => ref.text === text);
    if (!kept) pendingRef = {from: "this morning's line", label: 'Morning line', text, include: false};
    renderNudgeContext(kept);
  }
  function renderNudgeContext(kept) {
    $('entryContextId').textContent = kept ? 'Morning reading · already in notes'
      : `Morning reading · ${pendingRef.include ? 'included with your reply' : 'not included'}`;
    $('entryContextBody').textContent = `“${nudgeLines.linked}”`;
    $('entryContextNote').textContent = "AI wording, not a statement from you.";
    $('entryContextToggle').hidden = Boolean(kept);
    if (pendingRef) $('entryContextToggle').textContent = pendingRef.include ? 'leave out' : 'include in reply';
  }
  // A reference joins the record only when the person chose it and then replied.
  function commitRef() {
    if (!pendingRef?.include) return;
    const ref = {...pendingRef, id: `REF-${String(refs.length + 1).padStart(2, '0')}`};
    refs.push(ref); pendingRef = null; renderNudgeContext(ref);
  }
  function leave() {
    // One back at a time: notes → conversation → the place the exploration was opened from.
    if (notesOpen) { setNotes(false); return; }
    const from = origin || {kind: 'memory'};
    origin = null; memory();
    const usable = node => node && node.isConnected && node.getClientRects().length > 0;
    // The landing re-renders on return, so a replaced continue button falls back to its successor.
    if (from.kind === 'memory') { [from.control, $('landingContinue'), $('exploreEntry'), $('memoryTitle')].find(usable).focus(); return; }
    if (!from.panelWasOpen) setPanel(false);
    const target = [from.control, $('listEntry'), $('memoryToggle')].find(usable);
    target.focus();
  }
  function setReact(open) {
    $('dayNudgeReact').classList.toggle('open', open);
    $('dayNudge').classList.toggle('react-open', open);
    $('dayNudge').setAttribute('aria-expanded', String(open));
    $('nudgeHint').textContent = open ? ' — dismiss for today' : ' — show reactions';
  }
  // Recomputes which entrances may appear. Invitations need a verified, current link.
  function refresh() {
    // Entrances exist in both landings whenever there is an exploration to return to.
    const live = hasExploration();
    const sceneRows = [...document.querySelectorAll('[data-scene-row]')];
    sceneRows.forEach(row => { row.hidden = listScene === 'empty'; });
    const visibleRows = [...document.querySelectorAll('#manualList .task')].filter(row => !row.hidden);
    $('manualCount').textContent = visibleRows.length;
    $('manualEmpty').hidden = visibleRows.length > 0;
    // An empty list has nothing for the rule tier to say, so no strip; the list entrance is unchanged.
    const nudgeOn = nudgeScene !== 'none' && listScene === 'tasks' && !nudgeDismissed;
    $('dayNudge').classList.toggle('show', nudgeOn); $('dayNudge').classList.toggle('visible', nudgeOn);
    if (!nudgeOn) setReact(false);
    const linkCurrent = nudgeScene === 'linked' && !$('taskLinked').classList.contains('done');
    $('nudgeExplore').hidden = !(live && nudgeOn && linkCurrent);
    document.querySelectorAll('.task-explore').forEach(control => { control.hidden = !live; });
    $('exploreSection').hidden = !live;
  }
  // kind: you (preserved wording), reply (scripted synthesis), note (preview status)
  function addTurn(who, text, kind) {
    const turn = element('article', null, `turn turn-${kind}`);
    turn.append(element('h3', who, 'eyebrow'), element('p', text));
    $('currentTurns').append(turn); syncResume();
    return turn;
  }
  // The reading stays in the conversation; its next question becomes the reply box's label, and
  // everything inspectable (interpretation, evidence, correction, something to try) lives in notes.
  function showExample() {
    shownExample = true; turns.push(example);
    addTurn('You', example, 'you');
    if (selectedSources.size !== 2) {
      addTurn('Preview note', 'Your words are kept. A source is left out, so the reading that relies on both earlier notes is withheld.', 'note');
      $('nextThread').textContent = withheldQuestion;
      update(); return;
    }
    synthesisCurrent = true;
    const reply = addTurn('TODAY · scripted reading', 'An open page and no picture to live up to both recur in your notes. This time there was also a natural pause while the kettle boiled. Materials, expectations, timing and activity size remain separate possibilities.', 'reply');
    const meta = element('p', null, 'turn-meta');
    meta.append(element('span', 'Added to notes, unconfirmed'), button('what changed →', 'changes'));
    reply.append(meta);
    $('recap').textContent = 'An unplanned sketch added a natural pause to the picture. Materials in reach, an open-ended result, timing and activity size all remain open.';
    $('nextThread').textContent = nextQuestion;
    update(); announce('Scripted reading added. Its next question labels the reply box. Nothing was saved.');
  }
  function send() {
    const text = $('thought').value.trim(); if (!text) return;
    commitRef();
    if (text === example && !shownExample) showExample();
    else {
      savedDrafts.push({id: crypto.randomUUID(), text}); addTurn('You', text, 'you');
      addTurn('Preview note', 'Kept in this page as you wrote it. This study has one scripted exchange; a live reply would need a separate implementation.', 'note');
      update(); announce('Your words are kept in this preview only.');
    }
    $('thought').value = ''; $('sendThought').disabled = true;
    $('thought').scrollIntoView({block: 'nearest'});
  }
  const actions = {
    memory: leave,
    explore() { openFrom('memory', $('exploreEntry')); },
    'open-from'(event) { const control = event.target.closest('button'); openFrom(control.dataset.origin, control); },
    panel() {
      const open = !panelOpen();
      if (!open && !$('explorationView').hidden) { origin = null; memory(); }
      if (open && $('explorationView').hidden) { resetVisit(); renderLanding(); }
      setPanel(open);
    },
    'continue'() { openFrom('memory', $('landingContinue')); },
    fixture(event) {
      fixtureName = event.target.closest('button').dataset.value;
      data = fixtures[fixtureName](); resetVisit(); origin = null;
      memory(); refresh(); syncControls();
      announce(`${fixtureName === 'full' ? 'Full' : 'Sparse'} fictional records on both landings.`);
    },
    // Landing actions mirror memory-panel.js: dismiss revokes a record, not me removes and tombstones a reading.
    dismiss(event) {
      const key = event.target.closest('button').dataset.key;
      data.known = data.known.filter(k => k.id !== key); data.waiting = data.waiting.filter(k => k.id !== key);
      rerender(proposal ? '#openTitle' : null);
      announce('Dismissed from Memory in this preview. The task itself stays where it is.');
    },
    'not-me'(event) {
      const key = event.target.closest('button').dataset.key;
      data.readings = data.readings.filter(r => r.id !== key); data.episodic = data.episodic.filter(r => r.id !== key);
      rerender(proposal ? '#holdsTitle' : null);
      announce('Removed. TODAY won’t suggest this reading again. Study: in this page only.');
    },
    waiting() { visit.waiting = !visit.waiting; animateNext = visit.waiting && 'waiting'; rerender('#memoryView [data-action="waiting"]'); },
    'holds-more'() { visit.holds = !visit.holds; rerender('#memoryView [data-action="holds-more"]'); },
    dreams() { visit.dreams = !visit.dreams; animateNext = visit.dreams && 'dreams'; rerender('#memoryView [data-action="dreams"]'); },
    'feel-feedback'() { visit.feel = !visit.feel; animateNext = visit.feel && 'feel'; rerender('#memoryView [data-action="feel-feedback"]'); },
    'feel-vote'(event) {
      const value = event.target.closest('button').dataset.value;
      visit.vote = visit.vote === value ? null : value;
      rerender(`#memoryView [data-action="feel-vote"][data-value="${value}"]`);
      announce(visit.vote ? `${value} · not stored in this study.` : 'Vote cleared.');
    },
    'feel-remember'() { announce('Illustrative. In the app this first explains 30-day storage on this device and in Dropbox.'); },
    connections() { announce('Illustrative. Connections is not part of this study.'); },
    'clear-request'() { visit.clear = true; renderFooter(); $('clearCancel').focus(); },
    'clear-cancel'() { visit.clear = false; renderFooter(); $('clearRequest').focus(); },
    'clear-confirm'() {
      // Mirrors _memoryClearConfirm: records, readings, outcomes, reflections and the dream index go;
      // first-seen, lifetime totals and focus minutes stay. The exploration is a separate document here.
      data = {...data, known: [], waiting: [], facts: [], readings: [], episodic: [], lately: [],
        feelings: {policy: false, sentence: null},
        dreams: {count: 0, comesBack: [], list: []},
        coverage: data.coverage.filter(text => !text.startsWith('30 days'))};
      resetVisit(); rerender(null);
      announce(hasExploration() ? 'Memory records erased in this preview. Your question stays.' : 'Memory records erased in this preview.');
    },
    bring() {
      if (!pendingRef) return;
      pendingRef.include = !pendingRef.include; renderNudgeContext();
      announce(pendingRef.include ? "This morning's line joins as context when you reply." : "This morning's line won't be brought.");
    },
    nudge() {
      if (!$('dayNudge').classList.contains('react-open')) { setReact(true); return; }
      nudgeDismissed = true; refresh(); $('manualSection').focus();
      announce('Morning line dismissed for today in this preview.');
    },
    react(event) {
      const control = event.target.closest('button');
      const on = control.getAttribute('aria-pressed') !== 'true';
      document.querySelectorAll('[data-action="react"]').forEach(node => node.setAttribute('aria-pressed', 'false'));
      control.setAttribute('aria-pressed', String(on));
      $('reactNote').textContent = on ? 'study: shown here only, not stored' : '';
    },
    check(event) {
      const control = event.target.closest('button'); const row = control.closest('.task');
      const done = !row.classList.contains('done');
      row.classList.toggle('done', done); control.setAttribute('aria-pressed', String(done));
      refresh(); announce(`${row.querySelector('.task-text').textContent} ${done ? 'done' : 'back on the list'} in this preview.`);
    },
    'scene-nudge'(event) {
      nudgeScene = event.target.closest('button').dataset.value; nudgeDismissed = false;
      document.querySelectorAll('[data-action="react"]').forEach(node => node.setAttribute('aria-pressed', 'false'));
      $('reactNote').textContent = ''; $('nudgeText').textContent = nudgeLines[nudgeScene] || '';
      setReact(false); refresh(); syncControls();
    },
    'scene-list'(event) { listScene = event.target.closest('button').dataset.value; refresh(); syncControls(); },
    baseline() { proposal = false; visit.clear = false; origin = null; memory(); refresh(); syncControls(); announce('Current Memory landing, same records.'); },
    proposal() { proposal = true; visit.clear = false; origin = null; memory(); refresh(); syncControls(); announce('Proposed Memory landing, same records.'); },
    // Study-bar control: opens the exploration if needed and places scripted text; the person still replies.
    example() {
      if (forgotten) { announce('Restart to play the example again.'); return; }
      if (!hasExploration()) { announce('Switch records to full to play the example.'); return; }
      if (shownExample) { announce('The example has already played. Restart to play it again.'); return; }
      if ($('explorationView').hidden) openFrom('list', $('listEntry'));
      if (notesOpen) setNotes(false, false);
      $('thought').value = example; $('sendThought').disabled = false; $('thought').focus();
      announce('Scripted example placed in the reply box. Choose reply to play it.');
    },
    send,
    notes() { setNotes(!notesOpen); },
    changes() { setNotes(true, 'changesTitle'); },
    'try'() { tryOpen = true; renderNotes(); $('tryText').focus(); },
    record() {
      const opening = $('recordView').hidden; $('recordView').hidden = !opening;
      $('recordToggle').setAttribute('aria-expanded', String(opening));
      record(); if (opening) $('recordTitle').focus(); else $('recordToggle').focus();
    },
    correct() { $('correction').hidden = false; $('correctionText').value = amendments.at(-1) || originalHypothesis; $('correctionText').focus(); },
    'amend-cancel'() { $('correction').hidden = true; $('correctStart').focus(); },
    amend() {
      const text = $('correctionText').value.trim(); if (!text) return;
      amendments.push(text);
      $('recap').textContent = `Your latest correction: ${text}`;
      $('correction').hidden = true; update(); announce('Correction kept. The earlier reading stays in the history.');
      $('correctStart').focus();
    },
    task() {
      if (taskApproved) return;
      taskApproved = true;
      // The new row carries a verified link: it was created from this exploration.
      const row = $('taskLinked').cloneNode(true);
      row.removeAttribute('id'); row.removeAttribute('data-scene-row'); row.hidden = false; row.classList.remove('done');
      row.dataset.linkNote = 'added from this exploration';
      row.querySelector('.task-text').textContent = 'Leave a page open';
      row.querySelector('.task-check').setAttribute('aria-label', 'done: Leave a page open');
      row.querySelector('.task-check').setAttribute('aria-pressed', 'false');
      row.querySelector('.task-explore').setAttribute('aria-label', 'explore “Leave a page open”');
      $('manualList').append(row); refresh();
      $('taskAdd').textContent = 'added in preview'; $('taskAdd').disabled = true;
      update(); announce('Fictional action added to the preview list. No experiment result recorded.');
    },
    source(event) {
      const control = event.target.closest('button[data-source]');
      const id = control.dataset.source;
      if (selectedSources.has(id)) selectedSources.delete(id); else selectedSources.add(id);
      // Button names the next action; the row states the current inclusion.
      const included = selectedSources.has(id);
      control.textContent = included ? 'leave out' : 'include';
      control.closest('li').classList.toggle('is-left-out', !included);
      control.closest('li').querySelector('.source-state').hidden = included;
      // Leaving a source out withdraws the dependent reading; including it again does not bring it back.
      const withdrawn = shownExample && synthesisCurrent;
      if (withdrawn) {
        synthesisCurrent = false;
        $('conversation').querySelectorAll('.turn-reply').forEach(node => node.remove());
        $('earlierTurns').hidden = !$('earlierList').children.length;
        addTurn('Preview note', 'A source was left out, so TODAY\'s reading is withheld. Your words and corrections stay in the Markdown record.', 'note');
        $('recap').textContent = 'A source changed, so the earlier reading needs review. Your words and corrections remain in the Markdown record.';
        $('nextThread').textContent = withheldQuestion;
      }
      update();
      const stale = shownExample && !synthesisCurrent && !withdrawn && included ? ' The earlier reading stays withheld.' : '';
      announce(`${id} ${included ? 'included' : 'left out'} for replies in this preview.${withdrawn ? ' The reading that relied on it is withheld.' : stale}`);
    },
    privacy() {
      const opening = $('privacyView').hidden; $('privacyView').hidden = !opening;
      $('privacyToggle').setAttribute('aria-expanded', String(opening));
      if (opening) $('privacyTitle').focus();
    },
    forget() { $('forgetConfirm').hidden = false; $('forgetStart').hidden = true; $('forgetCancel').focus(); },
    'forget-cancel'() { $('forgetConfirm').hidden = true; $('forgetStart').hidden = false; $('forgetStart').focus(); },
    'forget-confirm'() {
      turns = []; amendments = []; savedDrafts = []; refs = []; pendingRef = null; shownExample = false; synthesisCurrent = false;
      // No exploration left to link to: every daily entrance withdraws until restart.
      forgotten = true; $('entryContext').hidden = true; refresh();
      $('earlierList').replaceChildren(); $('currentTurns').replaceChildren(); $('earlierTurns').hidden = true;
      $('thought').value = ''; $('correctionText').value = ''; $('sendThought').disabled = true;
      $('recap').textContent = '';
      renderNotes();
      $('recordText').textContent = 'No exploration document in this preview.';
      setNotes(false, false);
      $('sessionView').hidden = true; $('notesToggle').hidden = true; $('forgottenNote').hidden = false;
      $('explorationTitle').textContent = 'Exploration forgotten';
      $('explorationTitle').focus(); announce('Exploration forgotten in this preview.');
    },
    reset() { window.location.reload(); }
  };
  function syncControls() {
    document.querySelector('[data-action="baseline"]').setAttribute('aria-pressed', String(!proposal));
    document.querySelector('[data-action="proposal"]').setAttribute('aria-pressed', String(proposal));
    document.querySelectorAll('[data-action="scene-nudge"]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.value === nudgeScene)));
    document.querySelectorAll('[data-action="scene-list"]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.value === listScene)));
    document.querySelectorAll('[data-action="fixture"]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.value === fixtureName)));
  }
  document.addEventListener('click', event => {
    const control = event.target.closest('button[data-action]');
    if (control && !control.disabled) actions[control.dataset.action]?.(event);
  });
  $('thought').addEventListener('input', () => { $('sendThought').disabled = !$('thought').value.trim(); });
  $('thought').addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.isComposing) { event.preventDefault(); send(); }
  });
  $('nudgeText').textContent = nudgeLines[nudgeScene];
  // The study opens on the proposed Memory landing.
  refresh(); update(); memory(); setPanel(true);
})();
