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
  function memory() {
    $('memoryView').hidden = false; $('explorationView').hidden = true;
    $('memoryTitle').hidden = false; $('memoryPanel').setAttribute('aria-labelledby', 'memoryTitle');
    $('exploreEntry').hidden = !proposal || forgotten; $('memoryReturn').hidden = true;
    $('exploreEntry').textContent = shownExample ? 'return to exploration →' : 'explore →';
    if (notesOpen) setNotes(false, false);
    $('notesToggle').hidden = true;
    pendingRef = null; $('entryContext').hidden = true;
  }
  function explore() {
    $('memoryView').hidden = true; $('explorationView').hidden = false;
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
    if (from.kind === 'memory') { if (proposal && !forgotten) $('exploreEntry').focus(); return; }
    if (!from.panelWasOpen) setPanel(false);
    const usable = node => node && node.isConnected && node.getClientRects().length > 0;
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
    const live = proposal && !forgotten;
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
      setPanel(open);
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
    baseline() { proposal = false; origin = null; memory(); refresh(); syncControls(); },
    proposal() { proposal = true; origin = null; memory(); refresh(); syncControls(); },
    // Study-bar control: opens the exploration if needed and places scripted text; the person still replies.
    example() {
      if (forgotten) { announce('Restart to play the example again.'); return; }
      if (!proposal) { announce('Switch to proposal to play the example.'); return; }
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
  refresh(); update();
})();
