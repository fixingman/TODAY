// Sidebar shell — single panel container with content routing.
// Each panel registers a mount/unmount adapter; this module owns the shell
// lifecycle (open/close animation, surface, viewport sizing, back-gesture).
// Panels write their own .ex-sheet-head / .ex-sheet-scroll / .ex-sheet-foot
// into the content container; the shell provides the outer fixed frame.
(function () {
'use strict';

const phone = matchMedia('(max-width: 600px)');
let root = null, active = null;
const registry = new Map(); // id → { mount, unmount, label, icon, order }

function getRoot() {
  if (!root) {
    root = document.getElementById('sidebarRoot');
    if (!root) {
      root = document.createElement('aside');
      root.id = 'sidebarRoot';
      root.hidden = true;
      document.body.append(root);
    }
  }
  root.className = 'ex-sheet';
  return root;
}

// Returns (or creates) the content sub-container inside the root.
// Panels render into this; the panel nav is a persistent sibling above it.
function getContent() {
  let el = root.querySelector('#sbContent');
  if (el) return el;
  renderPanelNav();
  el = document.createElement('div');
  el.id = 'sbContent';
  el.style.cssText = 'display:contents';
  root.append(el);
  return el;
}

function surface(open) {
  document.body.classList.toggle('ex-open', open);
  if (!open) document.body.classList.remove('ex-closing');
  fitViewport();
}

function fitViewport() {
  if (!root) return;
  const fit = !!active && !root.hidden && phone.matches && window.visualViewport;
  root.style.height = fit ? (visualViewport.height + 'px') : '';
  root.style.top    = fit ? (visualViewport.offsetTop + 'px') : '';
}

function motion(cls) {
  if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
  root.classList.remove('entering', 'leaving');
  void root.offsetWidth;
  root.classList.add(cls);
  const running = root.getAnimations({ subtree: true })
    .filter(a => /^(ex|fadeInPlain)/.test(a.animationName || ''));
  return Promise.all(running.map(a => a.finished.catch(() => {})))
    .then(() => root.classList.remove(cls));
}

function modality(open) {
  const modal = open && phone.matches;
  const app = document.getElementById('main-app');      if (app) app.inert = modal;
  const hdr = document.getElementById('sticky-header'); if (hdr) hdr.inert = modal;
  let scrim = document.getElementById('exScrim');
  if (!scrim && open) {
    scrim = document.createElement('div');
    scrim.id = 'exScrim'; scrim.className = 'ex-scrim'; scrim.hidden = true;
    document.body.append(scrim);
  }
  if (scrim) scrim.hidden = !open || modal;
  if (!root) return;
  root.setAttribute('role', modal ? 'dialog' : 'complementary');
  if (modal) root.setAttribute('aria-modal', 'true');
  else root.removeAttribute('aria-modal');
}

// Renders the mobile panel-switching nav (only shown on phones, only when 2+ panels).
function renderPanelNav() {
  const existing = root.querySelector('.sb-panel-nav');
  const panels = [...registry.entries()].sort(([,a],[,b]) => (a.order||99) - (b.order||99));
  if (panels.length < 2) { existing?.remove(); return; }
  const nav = existing || (() => {
    const el = document.createElement('nav');
    el.className = 'sb-panel-nav';
    el.setAttribute('aria-label', 'Sections');
    root.prepend(el);
    return el;
  })();
  nav.innerHTML = panels.map(([id, p]) =>
    `<button type="button" class="sb-panel-btn" data-sidebar-panel="${id}" ${id === active ? 'aria-current="page"' : ''} aria-label="${p.label}">${p.icon}</button>`
  ).join('');
}

function register(id, adapter) {
  registry.set(id, adapter);
}

function open(id, ctx) {
  const panel = registry.get(id);
  if (!panel) return;
  getRoot();

  if (active === id) { close(); return; }

  const wasOpen = !!active;
  const prev = active ? registry.get(active) : null;
  active = id;

  if (wasOpen) {
    // Swap content: unmount current panel, mount new one with rise-fade.
    prev?.unmount?.();
    const content = root.querySelector('#sbContent');
    if (content) content.replaceChildren();
    const target = content || getContent();
    panel.mount(target, ctx);
    target.querySelector('.ex-sheet-scroll')?.classList.add('ex-view-in');
    renderPanelNav();
  } else {
    // Open from closed.
    root.hidden = false;
    root.setAttribute('aria-busy', 'true');
    if (phone.matches && !history.state?.sidebar) history.pushState({ sidebar: true }, '');
    surface(true);
    const content = getContent();
    panel.mount(content, ctx);
    root.removeAttribute('aria-busy');
    motion('entering');
  }
}

function close() {
  if (!active) return;
  const panel = registry.get(active);
  document.body.classList.add('ex-closing');
  motion('leaving').then(() => {
    panel?.unmount?.();
    active = null;
    if (root) { root.hidden = true; root.replaceChildren(); }
    modality(false);
    surface(false);
  });
}

function isOpen(id) {
  return id ? active === id : !!active;
}

// Back gesture on mobile closes the sidebar.
window.addEventListener('popstate', () => {
  if (active && phone.matches) close();
});

// Mobile keyboard resize.
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', fitViewport);
  window.visualViewport.addEventListener('scroll', fitViewport);
}

// Panel-nav click delegation (mobile).
document.addEventListener('click', event => {
  const btn = event.target.closest('[data-sidebar-panel]');
  if (!btn || !btn.closest('.sb-panel-nav')) return;
  event.stopPropagation();
  open(btn.dataset.sidebarPanel);
}, true);

// Shared close button — any element with data-sidebar-close inside the sidebar closes it.
document.addEventListener('click', event => {
  if (!event.target.closest('[data-sidebar-close]')) return;
  event.stopPropagation();
  close();
}, true);

Today.define('sidebar', { register, open, close, isOpen, getRoot, surface, fitViewport, motion, modality });
})();
