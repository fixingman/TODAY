// Optional web/Trello context feedback; loaded only when context is used.
(function() {
'use strict';
const CONCERNS = ['hard_to_follow','too_formal'];
const AGE = 30 * 86400000;
function create(hooks) {
  window.addEventListener('resize',() => {
    const view = hooks.view();
    if (view && hooks.current(view)) window._focusExpandTimer?.();
  });
  function wording(entry) {
    const w = entry?.wording, now = Date.now();
    const cleared = Date.parse(typeof appMemory !== 'undefined' ? appMemory?.clearedAt : '') || 0;
    return w && w.policy === 1 && CONCERNS.includes(w.concern) && Number.isFinite(w.at) && w.at > cleared && w.at <= now + 60000
      && Number.isFinite(w.expiresAt) && w.expiresAt > now && w.expiresAt <= w.at + AGE
      && /^[a-f0-9]{64}$/.test(w.cardId) ? w : null;
  }
  function snapshot() {
    const rows = hooks.entries().flatMap(({id,entry}) => {
      const w = wording(entry);
      if (entry.wording && !w) { delete entry.wording; hooks.set(id,entry); }
      return w ? [[id,w.concern,w.at,w.expiresAt,w.cardId]] : [];
    }).sort((a,b) => a[0].localeCompare(b[0]));
    return { stamp:JSON.stringify(rows), concerns:CONCERNS.filter(c => rows.some(row => row[1] === c)) };
  }
  function current(button) {
    const view = hooks.view(), entry = view && hooks.get(view.id);
    return view && hooks.current(view) && entry?.card && !button.closest('[hidden]')
      && document.getElementById('focusAgentBlock')?.contains(button)
      && button.dataset.cardId === hooks.identity(entry) ? {view,entry} : null;
  }
  function announce(text) { if (window._a11yAnnounce) _a11yAnnounce(text); }
  function stop(event) { event.preventDefault(); event.stopImmediatePropagation(); }
  function focus(action, concern) {
    const buttons = [...document.querySelectorAll('#focusAgentBlock button')];
    (buttons.find(b => b.dataset.todayClick === action && !b.closest('[hidden]') && !b.disabled && (!concern || b.dataset.concern === concern))
      || buttons.find(b => b.dataset.todayClick === 'enrichment.wording'))?.focus({preventScroll:true});
  }
  function render(entry, view, immediateUndo = false) {
    if (!hooks.current(view)) return;
    const block = document.getElementById('focusAgentBlock');
    if (!block) return;
    view.guidanceStamp = snapshot().stamp;
    entry = hooks.get(view.id);
    if (!entry?.card || !hooks.current(view)) return;
    const hidden = entry.state === 'hidden', card = entry.card, guide = wording(entry);
    block.innerHTML = '';
    function text(cls,value) { const el = document.createElement('div'); el.className = cls; el.textContent = value; block.append(el); return el; }
    if (hidden) text('focus-agent-body',view.message || 'Context hidden for this task.');
    else {
      const meta = text('focus-agent-meta','');
      const icon = document.createElement('span'); icon.className = 'focus-agent-icon'; icon.textContent = card.icon;
      const headline = document.createElement('span'); headline.className = 'focus-agent-headline'; headline.textContent = card.headline;
      meta.append(icon,headline);
      if (card.body) text('focus-agent-body',card.body);
    }
    const actions = text('focus-agent-actions','');
    if (!hidden && card.cta) {
      const link = document.createElement('a'); link.className = 'focus-agent-link'; link.textContent = card.cta.label + ' ↗';
      link.href = card.cta.href; link.target = '_blank'; link.rel = 'noopener'; actions.append(link);
    }
    function button(parent,label,action,name) {
      const el = document.createElement('button'); el.type = 'button'; el.className = 'focus-agent-feedback';
      el.textContent = label; el.dataset.todayClick = action; el.dataset.cardId = hooks.identity(entry);
      el.setAttribute('aria-label',name || label); parent.append(el); return el;
    }
    const hide = button(actions,hidden ? immediateUndo ? 'undo' : 'show context' : 'not useful','enrichment.feedback');
    hide.dataset.state = entry.state; hide.dataset.wording = JSON.stringify(entry.wording || null); hide.dataset.hide = String(!hidden);
    hide.setAttribute('aria-label',hide.textContent + (hidden ? ' — restore context for this task' : ' — hide this context for this task'));
    if (hidden) {
      const retry = button(actions,view.pending ? 'looking…' : 'try other context','enrichment.retry','Try other context for this task');
      retry.disabled = !!view.retryUsed;
      if (view.retryUsed && !view.pending) retry.setAttribute('aria-label','Try other context — available on your next focus visit');
    }
    const toggle = button(actions,'wording','enrichment.wording','Wording feedback for future web and Trello context');
    toggle.setAttribute('aria-expanded',String(!!view.wordingOpen)); toggle.setAttribute('aria-controls','enrichmentWording');
    const panel = text('focus-agent-body',''); panel.id = 'enrichmentWording'; panel.hidden = !view.wordingOpen;
    const explanation = document.createElement('div');
    explanation.textContent = 'Optional. Guides future web/Trello context on this device. Previous card text stays private.'; panel.append(explanation);
    const choices = document.createElement('div'); choices.className = 'focus-agent-actions'; choices.setAttribute('role','group');
    choices.setAttribute('aria-label','Wording for future web and Trello context'); panel.append(choices);
    for (const concern of CONCERNS) {
      const choice = button(choices,concern === 'hard_to_follow' ? 'hard to follow' : 'too formal','enrichment.concern');
      choice.dataset.concern = concern; choice.classList.add('focus-ask-reaction');
      choice.setAttribute('aria-pressed',String(guide?.concern === concern)); choice.classList.toggle('on',guide?.concern === concern);
    }
    const undo = button(choices,'undo','enrichment.wording-undo','Undo wording feedback for this task'); undo.hidden = !view.wordingUndo;
    const clear = button(choices,'clear all','enrichment.wording-clear','Clear all web and Trello wording feedback on this device');
    clear.hidden = !snapshot().concerns.length;
    block.hidden = false; _shortcut(hidden ? null : card.cta); window._focusExpandTimer?.();
  }
  Today.ui.register('click','enrichment.feedback',(event,button) => {
    stop(event); const value = current(button); if (!value) return;
    const {view,entry} = value, hide = button.dataset.hide === 'true';
    entry.state = hide ? 'hidden' : 'success'; delete entry.hiddenAt;
    if (!hooks.set(view.id,entry)) return;
    view.message = null; hooks.indicator(view.id,false); render(entry,view,hide);
    document.querySelector('#focusAgentBlock .focus-agent-feedback')?.focus();
    announce(hide ? 'Context hidden for this task. Undo is available.' : 'Context restored for this task.');
  });
  Today.ui.register('click','enrichment.wording',(event,button) => {
    stop(event); const value = current(button); if (!value) return;
    value.view.wordingOpen = !value.view.wordingOpen; render(value.entry,value.view); focus('enrichment.wording');
  });
  async function change(event,button,mode) {
    stop(event); const value = current(button); if (!value) return;
    const {view,entry} = value, previous = wording(entry), identity = hooks.identity(entry), stored = hooks.revision(view.id);
    const sequence = view.wordingSequence = (view.wordingSequence || 0) + 1;
    if (mode === 'undo' && !view.wordingUndo) return;
    if (mode === 'clear' || (mode === 'undo' && view.wordingUndo.rows)) {
      if (mode === 'clear') {
        const rows = hooks.entries().filter(row => wording(row.entry)).map(({id,entry}) =>
          ({id,text:entry.taskText,board:entry.boardId,wording:wording(entry)}));
        hooks.clear(); view.wordingUndo = {rows};
      } else {
        for (const row of view.wordingUndo.rows) {
          const latest = hooks.get(row.id);
          if (latest && !wording(latest) && latest.taskText === row.text && latest.boardId === row.board && wording({wording:row.wording})) {
            latest.wording = row.wording; hooks.set(row.id,latest);
          }
        }
        view.wordingUndo = null; hooks.changed();
      }
      const fresh = hooks.get(view.id);
      if (fresh?.card && hooks.current(view)) { render(fresh,view); focus('enrichment.wording'); }
      announce(mode === 'clear' ? 'Web and Trello wording feedback cleared on this device.' : 'Previous eligible wording feedback restored.');
      return;
    }
    const old = view.wordingUndo?.previous;
    let next = null;
    if (mode === 'vote') {
      if (!CONCERNS.includes(button.dataset.concern)) return;
      if (previous?.concern !== button.dataset.concern) {
        let bytes;
        try { bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity)); }
        catch (_) { announce('Can’t save wording feedback right now.'); return; }
        if (!hooks.current(view) || view.wordingSequence !== sequence || hooks.revision(view.id) !== stored) return;
        next = {policy:1,concern:button.dataset.concern,at:Date.now(),expiresAt:Math.min(entry.fetchedAt + AGE,Date.now() + AGE),
          cardId:Array.from(new Uint8Array(bytes),b => b.toString(16).padStart(2,'0')).join('')};
      }
    } else if (mode === 'undo') next = wording({wording:old});
    if (next) entry.wording = next; else delete entry.wording;
    if (!hooks.set(view.id,entry)) return;
    view.wordingUndo = mode === 'undo' ? null : {previous};
    hooks.changed(); render(entry,view);
    focus(mode === 'vote' ? 'enrichment.concern' : 'enrichment.wording',button.dataset.concern);
    announce(next ? 'Wording feedback will guide future web and Trello context on this device.' : 'Wording feedback from this task cleared.');
  }
  Today.ui.register('click','enrichment.concern',(event,button) => change(event,button,'vote'));
  Today.ui.register('click','enrichment.wording-clear',(event,button) => change(event,button,'clear'));
  Today.ui.register('click','enrichment.wording-undo',(event,button) => change(event,button,'undo'));
  Today.ui.register('click','enrichment.retry',async (event,button) => {
    stop(event); const value = current(button); if (!value || value.view.retryUsed || value.entry.state !== 'hidden') return;
    const {view,entry} = value; view.retryUsed = true; view.pending = true; view.message = 'Looking for other context…';
    render(entry,view); focus('enrichment.wording');
    const result = await hooks.retry(view,entry);
    if (!hooks.current(view)) return;
    view.pending = false;
    view.message = result === 'empty' ? 'No other context found.' : result === 'failed' ? 'Can’t look again right now. Try on your next focus visit.' : null;
    const fresh = hooks.get(view.id);
    if (fresh?.card) { render(fresh,view); hooks.indicator(view.id,false); }
    announce(result === 'updated' ? 'Other context is ready.' : view.message || 'Context changed.');
  });
  function _shortcut(cta) {
    const ai = document.querySelector('.focus-ai-timer-btn');
    if (!ai || ai.closest('.ai-active')) return;
    if (document.querySelector('#focusGmailBlock:not([hidden]) .focus-gmail-draft-btn')) cta = { label:'Draft reply' };
    ai.textContent = '✦︎ ' + (cta ? cta.label.toLowerCase() : 'ask');
    ai.setAttribute('aria-label', cta ? cta.label + ' context source' : 'Ask for focus help');
  }
  function avoidSource(entry) {
    try {
      const url = new URL(entry.card.cta.href);
      if (url.protocol !== 'https:') return '';
      const path = url.hostname === 'trello.com' && /^\/c\/[^/]+/.test(url.pathname)
        ? url.pathname.match(/^\/c\/[^/]+/)[0] : url.pathname.replace(/\/$/,'');
      return url.origin + path;
    } catch (_) { return ''; }
  }
  return {render,snapshot,wording,avoidSource,shortcut:_shortcut,focus};
}
Today.define('enrichment-feedback',{create});
})();
