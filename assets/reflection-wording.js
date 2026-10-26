// Lazy feeling-wording controls. Persistence and requests stay with reflections.
(function() {
  'use strict';
  let hooks, undo;
  const opened = new Set();
  const policy = () => Today.use('feedback-policy');
  const hasUndo = row => undo?.id === row.id && undo.at === row.wordingAt;
  function render(reading, records) {
    const row = records.find(r => r.id === reading.id) || reading;
    if (row.expired) return '';
    return `<details class="reflection-wording" data-wording-reading="${row.id}"${opened.has(row.id) ? ' open' : ''}><summary class="memory-conn-link">wording</summary>` +
      (records.some(r => r.wordingAt) ? '' : `<p class="memory-empty">Your choice guides future AI feeling insights. Earlier sentences stay private. Kept up to 30 days here and in connected Dropbox.</p>`) +
      `<div class="nudge-react open reflection-reaction" role="group" aria-label="Feedback on the wording of this feeling insight">` +
      Object.entries(policy().wordingLabels).map(([value,label]) => `<button type="button" class="nudge-react-btn${row.wordingReaction === value ? ' on' : ''}" aria-pressed="${row.wordingReaction === value}" data-today-click="reflections.wording" data-reading-id="${row.id}" data-wording="${value}">${label}</button>`).join('') +
      (row.wordingReaction ? `<button type="button" class="nudge-react-btn" data-today-click="reflections.wording" data-reading-id="${row.id}" data-wording="clear">clear wording</button>` : '') +
      (hasUndo(row) ? `<button type="button" class="nudge-react-btn" data-today-click="reflections.wording" data-reading-id="${row.id}" data-wording="undo">undo</button>` : '') + '</div></details>';
  }
  function preserve() {
    document.querySelectorAll('[data-wording-reading][open]').forEach(el=>opened.add(el.dataset.wordingReading));
    const manageOpen=document.getElementById('reflectionFeedbackManage')?.open;
    const active=document.activeElement, id=active.closest('[data-wording-reading]')?.dataset.wordingReading;
    const control=id && (active.tagName==='SUMMARY' ? 'summary' : `[data-wording="${active.dataset.wording}"]`);
    const review=!!active.closest('#reflectionFeedbackManage');
    return ()=>{
      const manage=document.getElementById('reflectionFeedbackManage');
      if(manageOpen && manage)manage.open=true;
      if(control)document.querySelector(`${review ? '#reflectionFeedbackManage' : '#reflectionMemoryBlock'} [data-wording-reading="${id}"] ${control}`)?.focus();
    };
  }
  function vote(button) {
    const evidence = hooks.evidence(), id = button.dataset.readingId;
    if (!evidence.options.sourcesReady || evidence.policy?.choice !== 'remember') return;
    const row = evidence.feedback.records.find(r => r.id === id) || (hooks.current()?.id === id ? hooks.current() : null);
    if (!row || row.expired) return;
    let choice = button.dataset.wording;
    const undoing = choice === 'undo';
    if (undoing) {
      if (undo?.id !== id || undo.at !== row.wordingAt) return;
      choice = undo.previous;
    } else choice = choice === 'clear' || choice === row.wordingReaction ? null : choice;
    if (choice !== null && !Object.hasOwn(policy().wordingLabels, choice)) return;
    const at = hooks.stamp([row.createdAt,row.wordingAt || ''].sort().at(-1));
    const updated = {...row, wordingReaction:choice, wordingAt:at};
    const records = policy().mergeRecords(evidence.feedback.records.filter(r => r.id !== id),[updated],evidence.options);
    if (!records.some(r => r.id === id && r.wordingAt === at) ||
        !hooks.save({...evidence.feedback, consentAt:evidence.feedback.consentAt || at, records})) {
      hooks.announce('Couldn’t save wording feedback. Try again.'); return;
    }
    undo = undoing ? null : {id, previous:row.wordingReaction || null, at};
    opened.add(id);
    const review = !!button.closest('#reflectionFeedbackManage');
    hooks.refresh(); hooks.sync();
    const scope = review ? '#reflectionFeedbackManage' : '#reflectionMemoryBlock';
    const target = undoing ? choice || Object.keys(policy().wordingLabels)[0] : 'undo';
    document.querySelector(`${scope} [data-wording-reading="${id}"] [data-wording="${target}"]`)?.focus();
    hooks.announce(choice ? 'Wording feedback saved for a later feeling insight.' : 'Wording feedback cleared.');
  }
  Today.define('reflection-wording', {
    init(value) { hooks = value; Today.ui.register('click','reflections.wording',(_event,button) => vote(button)); },
    render, hasUndo, preserve,
    endVisit() { undo = null; opened.clear(); },
  });
})();
