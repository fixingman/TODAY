/* Isolated layout study: Explore as a side panel (wide), drawer (medium), full screen (phone).
   Scripted fictional replies; no network, storage, model or personal records. */
(() => {
'use strict';
const by = id => document.getElementById(id);
const h = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wide = matchMedia('(min-width: 1120px)'), phone = matchMedia('(max-width: 600px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const sheet = by('exSheet'), scrim = by('exScrim'), body = by('exBody'), reply = by('exReply');

const script = [
  { you: 'I was excited about a pottery class, but I keep putting off the studio email.',
    take: 'Interest and finding a workable time may be different questions. Timing is one possibility, not an established explanation.',
    next: 'When you picture sending it, what is the first thing that makes you stop?' },
  { you: 'Probably that the evening slots clash with the days I already feel tired.',
    take: 'So the hesitation may sit with energy on those evenings rather than with the class itself. That is still your account to confirm.',
    next: 'Is there a time in the week when you would actually want to go?' },
];
let turns = [], view = 'conversation', origin = null, opener = null, thinking = false, promptShown = '', arrived = -1, dictating = null;

const subNav = () => '<button type="button" class="memory-item-btn ex-subnav" data-action="conversation"><span aria-hidden="true">‹ </span>conversation</button>';
function conversationHTML() {
  let html = `<h3 id="exViewTitle" tabindex="-1">${turns.length ? 'Making room for pottery' : 'Start with an experience'}</h3>`;
  if (!turns.length) html += '<p>You don’t need a finished question. Bring something that happened, or something you’re unsure about.</p><p class="meta">Try: <em>I was excited about a pottery class, but I keep putting off the studio email.</em></p>';
  for (const t of turns) {
    html += `<div class="turn you"><span class="meta">You</span><p>${h(t.you)}</p></div>`;
    if (t.take) html += `<div class="turn${turns.indexOf(t) === arrived ? ' arriving' : ''}"><span class="meta">TODAY · a possibility</span><p>${h(t.take)}</p></div>`;
  }
  if (thinking) html += '<div class="turn thinking"><span class="meta">TODAY</span><p>Thinking…</p></div>';
  if (turns.length && !thinking) html += '<div class="links"><button type="button" class="memory-item-btn" data-action="notes">living note</button><button type="button" class="memory-item-btn" data-action="sources">sources</button></div>';
  return html;
}
function notesHTML() {
  return `${subNav()}<h3 id="exViewTitle" tabindex="-1">Living note</h3>
    <div class="note-section"><h4>Your account</h4>${turns.map(t => `<p>${h(t.you)}</p>`).join('') || '<p>No observation recorded yet.</p>'}</div>
    <div class="note-section"><h4>A possibility</h4><p>${h(turns.at(-1)?.take || 'Nothing yet.')}</p></div>
    <div class="note-section"><h4>Still open</h4><p>${h(turns.at(-1)?.next || 'What brought this up?')}</p></div>`;
}
function sourcesHTML() {
  return `${subNav()}<h3 id="exViewTitle" tabindex="-1">Sources</h3><p>What supported the latest reply.</p>
    <div class="note-section"><span class="meta">Your words</span><p>${h(turns.at(-1)?.you || '—')}</p></div>
    <div class="note-section"><span class="meta">Your task</span><p>Email the pottery studio</p></div>`;
}
function render(focusTitle) {
  body.innerHTML = view === 'notes' ? notesHTML() : view === 'sources' ? sourcesHTML() : conversationHTML();
  by('exComposer').hidden = view !== 'conversation';
  // The header control only ever hides Explore. Sub-pages carry their own way back.
  by('exBack').setAttribute('aria-label', origin === 'memory' ? 'Hide Explore, back to Memory' : 'Hide Explore');
  by('exBackPath').setAttribute('d', phone.matches ? 'M5 8l5 5 5-5' : 'M12 5l-5 5 5 5');
  arrived = -1;
  if (focusTitle) by('exViewTitle')?.focus({ preventScroll: true });
  if (view === 'conversation') body.scrollTop = body.scrollHeight;
}

// ── TODAY's next question: shown when a reply arrives (or on a fresh start), folded away
// as soon as you start answering. The textarea keeps it as its description either way.
function showPrompt(text) {
  const wrap = by('exPromptWrap');
  by('exPrompt').textContent = text; promptShown = text;
  wrap.classList.remove('show'); void wrap.offsetWidth; wrap.classList.add('show');
}
function hidePrompt() { by('exPromptWrap').classList.remove('show'); }

// ── Modality follows layout: docked = page stays usable; drawer/phone = page is inert.
function applyModality() {
  const open = !sheet.hidden, modal = open && !wide.matches;
  by('page').inert = modal;
  scrim.hidden = !modal || phone.matches;
  sheet.setAttribute('role', modal ? 'dialog' : 'complementary');
  if (modal) sheet.setAttribute('aria-modal', 'true'); else sheet.removeAttribute('aria-modal');
}
function animate(cls, then) {
  if (reduced.matches) { then?.(); return; }
  sheet.classList.remove('entering', 'leaving'); void sheet.offsetWidth; sheet.classList.add(cls);
  // Wide: the sheet slides. Phone: its head/body rise while the composer crossfades. Wait for all.
  const running = sheet.getAnimations({ subtree: true }).filter(a => a.animationName?.startsWith('ex'));
  Promise.all(running.map(a => a.finished.catch(() => {}))).then(() => { sheet.classList.remove(cls); then?.(); });
}
function open(from, trigger) {
  if (!sheet.hidden) { by('exTitle').focus(); return; }
  origin = from; opener = trigger; view = 'conversation';
  sheet.hidden = false; document.body.classList.add('ex-open');
  document.querySelectorAll('[data-action=open]').forEach(b => b.setAttribute('aria-expanded', 'true'));
  applyModality(); render();
  // The question unfolds after the panel settles, so the input row holds still while it rises.
  animate('entering', () => showPrompt(turns.at(-1)?.next || 'What happened, or what feels unresolved?'));
  (phone.matches ? by('exTitle') : reply).focus({ preventScroll: true });
  if (phone.matches) history.pushState({ explore: true }, ''); // the phone's back gesture closes Explore
}
function close(fromHistory) {
  if (sheet.hidden) return;
  document.body.classList.remove('ex-open');
  animate('leaving', () => {
    sheet.hidden = true; applyModality();
    document.querySelectorAll('[data-action=open]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    // Return to the invoking place: Memory stays open, the list keeps its position.
    if (origin === 'memory') by('memoryPanel').hidden = false;
    opener?.focus({ preventScroll: true });
  });
  if (!fromHistory && history.state?.explore) history.back();
}
function back() { if (view !== 'conversation') { view = 'conversation'; render(true); reply.focus({ preventScroll: true }); } else close(); }
function send() {
  const text = reply.value.trim(); if (!text || thinking) return;
  const scripted = script[turns.length];
  stopDictation();
  turns.push({ you: text }); reply.value = ''; fitReply(); thinking = true; hidePrompt(); render();
  setTimeout(() => {
    thinking = false;
    const t = turns.at(-1);
    if (scripted) { t.take = scripted.take; t.next = scripted.next; }
    else t.take = 'The scripted study ends here; your words remain in this page only.';
    arrived = turns.length - 1; render();
    by('exLive').textContent = t.take;
    if (t.next) showPrompt(t.next);
    reply.focus({ preventScroll: true });
  }, reduced.matches ? 0 : 900);
}
function toggleMemory() {
  const panel = by('memoryPanel'), show = panel.hidden;
  panel.hidden = !show; panel.classList.toggle('open', show);
  document.querySelector('.today-logo').setAttribute('aria-expanded', String(show));
}

// ── Phone keyboard: keep the pinned composer above it. 100dvh does not shrink for the
// iOS keyboard, so size the sheet to the visual viewport while it is open.
function fitViewport() {
  if (!phone.matches || sheet.hidden || !window.visualViewport) { sheet.style.height = ''; sheet.style.top = ''; return; }
  sheet.style.height = visualViewport.height + 'px';
  sheet.style.top = visualViewport.offsetTop + 'px';
}
window.visualViewport?.addEventListener('resize', fitViewport);
window.visualViewport?.addEventListener('scroll', fitViewport);

document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]'); if (!b) return;
  const a = b.dataset.action;
  if (a === 'open') open(b.dataset.origin, b);
  else if (a === 'close') close();
  else if (a === 'back') close();
  else if (a === 'conversation') back();
  else if (a === 'memory') toggleMemory();
  else if (a === 'notes' || a === 'sources') { view = a; render(true); }
  else if (a === 'dictate') dictating ? stopDictation() : startDictation();
});
by('exComposer').addEventListener('submit', e => { e.preventDefault(); send(); });
function fitReply() { reply.style.height = ''; reply.style.height = Math.min(reply.scrollHeight + 2, innerHeight * 0.4) + 'px'; }
reply.addEventListener('input', () => { fitReply(); if (reply.value.trim()) hidePrompt(); else if (promptShown && !thinking) showPrompt(promptShown); });
// No visible send button: Enter sends (the phone keyboard shows "send" via enterkeyhint);
// Shift+Enter adds a line on a hardware keyboard.
reply.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });

// ── Dictation (simulated). The real control follows voice-capture.js: on-device speech
// recognition only, otherwise the user's own AI connection; audio is never stored.
function startDictation() {
  const mic = by('exMic'), words = (script[turns.length]?.you || 'Something I keep coming back to.').split(' ');
  mic.classList.add('live'); mic.setAttribute('aria-pressed', 'true'); mic.setAttribute('aria-label', 'Stop dictating');
  by('exLive').textContent = 'Listening'; hidePrompt();
  reply.value = ''; let i = 0;
  dictating = setInterval(() => { reply.value += (i ? ' ' : '') + words[i++]; fitReply(); if (i >= words.length) stopDictation(); }, reduced.matches ? 0 : 140);
  reply.focus({ preventScroll: true });
}
function stopDictation() {
  if (!dictating) return;
  clearInterval(dictating); dictating = null;
  const mic = by('exMic'); mic.classList.remove('live'); mic.setAttribute('aria-pressed', 'false'); mic.setAttribute('aria-label', 'Dictate your reply');
  by('exLive').textContent = 'Stopped listening. Press Enter to send.';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) { e.preventDefault(); back(); } });
addEventListener('popstate', () => { if (!sheet.hidden) close(true); });
[wide, phone].forEach(q => q.addEventListener('change', () => { applyModality(); fitViewport(); if (!sheet.hidden) render(); }));
// Keep focus inside while modal (drawer/phone).
sheet.addEventListener('keydown', e => {
  if (e.key !== 'Tab' || wide.matches) return;
  const f = [...sheet.querySelectorAll('button:not([disabled]),textarea')].filter(n => n.offsetParent && n.tabIndex >= 0);
  if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
  else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
});
})();
