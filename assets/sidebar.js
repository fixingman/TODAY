// Shared sidebar lifecycle; panels own their content and data.
(function () {
'use strict';
const phone=matchMedia('(max-width: 600px)'), registry=new Map();
let root=null, active=null, pending=null, generation=0, closing=false, pane='sidebar', returnFocus=null, pointerX=null, hoverPane=null;
function getRoot(){
  root ||= document.getElementById('sidebarRoot');
  return root;
}
function getContent(){
  let content=getRoot().querySelector('#sbContent');
  if(!content){content=document.createElement('div');content.id='sbContent';content.style.display='contents';root.append(content);}
  return content;
}
function setCloseIcon(button){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'), path=document.createElementNS(svg.namespaceURI,'path');
  for(const [name,value]of Object.entries({width:20,height:20,viewBox:'0 0 20 20',fill:'none','aria-hidden':'true',focusable:'false'}))svg.setAttribute(name,value);
  for(const [name,value]of Object.entries({d:phone.matches?'M5 8l5 5 5-5':'M8 5l5 5-5 5',stroke:'currentColor','stroke-width':1.5,'stroke-linecap':'round','stroke-linejoin':'round'}))path.setAttribute(name,value);
  svg.append(path);button.replaceChildren(svg);
}
// Fit the keyboard viewport; otherwise use the sheet's CSS edges.
let fitFrame=0,keyboardWasOpen=false;
function fitViewport(){
  cancelAnimationFrame(fitFrame);
  fitFrame=requestAnimationFrame(()=>{
    if(!root)return;
    const vv=window.visualViewport;
    const keyboard=!!(active&&phone.matches&&vv&&vv.height<window.innerHeight-120);
    root.style.height=keyboard?vv.height+'px':'';
    root.style.top=keyboard?vv.offsetTop+'px':'';
    root.style.bottom=keyboard?'auto':'';
    if(keyboardWasOpen&&!keyboard&&active&&phone.matches)window.scrollTo(0,0);
    keyboardWasOpen=keyboard;
  });
}
function modality(open=!!active){
  const modal=open&&phone.matches;
  for(const id of ['main-app','sticky-header']){const node=document.getElementById(id);if(node)node.inert=!!modal;}
  const bar=document.getElementById('addTaskBar');if(bar)bar.inert=!!modal||(open&&pane==='sidebar'&&active==='explore');
  const foot=root?.querySelector('.ex-sheet-foot');if(foot)foot.inert=open&&!modal&&pane==='tasks';
  document.body.classList.toggle('ex-task-active',open&&pane==='tasks');
  let scrim=document.getElementById('exScrim');
  if(!scrim&&open){scrim=document.createElement('div');scrim.id='exScrim';scrim.className='ex-scrim';document.body.append(scrim);}
  if(scrim)scrim.hidden=!open||modal;
  if(!root)return;
  root.setAttribute('role',modal?'dialog':'complementary');
  if(modal)root.setAttribute('aria-modal','true');else root.removeAttribute('aria-modal');
}
// Every panel, every opener: with a mouse, the side under the cursor owns input as soon as
// a panel opens or switches. Without a known pointer the panel keeps it.
function followPointer(){
  if(!active||phone.matches||pointerX===null||!matchMedia('(pointer: fine)').matches){hoverPane='sidebar';modality();return;}
  hoverPane=pointerPane(pointerX);pane=hoverPane;modality();
}
function activate(next){
  if(!active||phone.matches||pane===next)return;
  const focused=document.activeElement;
  if((next==='tasks'&&focused?.closest('.ex-sheet-foot'))||(next==='sidebar'&&focused?.closest('#addTaskBar')))focused.blur();
  pane=next;modality();
}
// Save scroll before .ex-open clips the page; restore it on close.
let lockedScroll=null;
function lockPage(open){
  const lock=open&&phone.matches;
  if(lock&&lockedScroll===null){
    lockedScroll=window.scrollY;
    Object.assign(document.body.style,{position:'fixed',top:-lockedScroll+'px',left:'0',right:'0'});
    window.scrollTo(0,0);
  }else if(!lock&&lockedScroll!==null){
    const y=lockedScroll;lockedScroll=null;
    Object.assign(document.body.style,{position:'',top:'',left:'',right:''});
    window.scrollTo(0,y);
  }
}
// Temporary: tap a sheet title to read the real viewport numbers (remove once confirmed).
document.addEventListener('click',event=>{
  const title=event.target.closest?.('.ex-sheet-head .config-title');if(!title||!root?.contains(title))return;
  let out=root.querySelector('#sheetReadout');
  if(out){out.remove();return;}
  const r=root.getBoundingClientRect(),h=root.querySelector('.ex-sheet-head')?.getBoundingClientRect(),vv=window.visualViewport,probe=document.createElement('div');
  probe.style.cssText='position:fixed;top:0;height:env(safe-area-inset-top,0px);visibility:hidden';document.body.append(probe);const safe=probe.getBoundingClientRect().height;probe.remove();
  out=document.createElement('p');out.id='sheetReadout';out.className='ex-muted';out.style.cssText='flex-basis:100%;margin:0;font-size:var(--text-xs)';
  out.textContent=`sheet ${Math.round(r.top)}–${Math.round(r.bottom)} · head ${Math.round(h?.top||0)} · inner ${innerHeight} · vv ${Math.round(vv?.height||0)}@${Math.round(vv?.offsetTop||0)} · scroll ${Math.round(scrollY)} · safe ${Math.round(safe)} · screen ${screen.height} · lock ${lockedScroll}`;
  root.querySelector('.ex-sheet-head')?.append(out);
});
function surface(open){
  if(open)lockPage(true);
  document.body.classList.toggle('ex-open',open);document.body.classList.remove('ex-closing');
  if(!open)lockPage(false);
  modality(open);fitViewport();
}
function motion(cls){
  const token=generation;
  if(!root||_motionReduced())return Promise.resolve();
  root.classList.remove('entering','leaving');void root.offsetWidth;root.classList.add(cls);
  return Promise.all(root.getAnimations({subtree:true}).filter(a=>/^(ex|fadeIn)/.test(a.animationName||'')).map(a=>a.finished.catch(()=>{}))).then(()=>{if(token===generation)root.classList.remove(cls);});
}
function sync(){Today.use('connections').syncActiveButtons();}
function register(id,adapter){registry.set(id,adapter);}
const pointerPane=x=>x>=innerWidth-root.offsetWidth?'sidebar':'tasks';
function prepare(id,label,cancel){
  const wasOpen=!!active&&!closing;
  generation++;closing=false;getRoot();if(active&&!pending){document.dispatchEvent(new CustomEvent('today:sidebar-unmount',{detail:getContent()}));registry.get(active)?.unmount?.();}returnFocus ||= document.activeElement;active=id;pending=cancel;pane='sidebar';root.hidden=false;root.setAttribute('aria-label',label);root.setAttribute('aria-busy','true');
  const content=getContent();content.className='';content.replaceChildren();surface(true);followPointer();if(wasOpen)root.classList.remove('entering','leaving');else motion('entering');return content;
}
function open(id,ctx){
  const panel=registry.get(id);if(!panel)return;
  if(active===id&&!pending&&!ctx&&!closing){close();return;}
  const wasOpen=!!active&&!closing;generation++;closing=false;getRoot();if(pending&&active!==id)pending();if(wasOpen)root.classList.remove('entering','leaving');
  if(!wasOpen)returnFocus=document.activeElement;
  if(active&&!pending){document.dispatchEvent(new CustomEvent('today:sidebar-unmount',{detail:getContent()}));registry.get(active)?.unmount?.();}
  active=id;pending=null;pane='sidebar';root.hidden=false;
  root.removeAttribute('aria-labelledby');root.setAttribute('aria-label',panel.label);
  const content=getContent();content.className='';content.replaceChildren();
  if(phone.matches&&!history.state?.sidebar)history.pushState({sidebar:true},'');
  surface(true);panel.mount(content,ctx);root.removeAttribute('aria-busy');followPointer();
  if(!wasOpen)motion('entering');else content.querySelector('.ex-sheet-scroll')?.classList.add('ex-view-in');
  sync();
}
function close(immediate=false){
  if(!active)return;
  closing=true;const id=active,token=++generation,cancel=pending;if(!cancel)document.dispatchEvent(new CustomEvent('today:sidebar-unmount',{detail:getContent()}));document.body.classList.add('ex-closing');
  const finish=()=>{
    if(token!==generation)return;
    active=null;pending=null;closing=false;cancel?.();if(!cancel)registry.get(id)?.unmount?.();
    root.hidden=true;root.replaceChildren();root.removeAttribute('aria-busy');surface(false);sync();
    if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;
  };
  if(immediate||cancel){finish();return Promise.resolve();}return motion('leaving').then(finish);
}
// Hover never pulls focus away from words being written. Daily capture's caret always
// holds its pane; an empty field inside a panel (Habits name, Explore reply) does not,
// so moving back over the list brings capture back on every tab.
const typing=()=>{const el=document.activeElement;if(!el?.matches('input,textarea,[contenteditable="true"]'))return false;if(el.closest('#addTaskBar'))return true;return el.isContentEditable?!!el.textContent.trim():!!el.value?.trim();};
const isOpen=id=>!closing&&(id?active===id:!!active);
document.addEventListener('pointermove',event=>{pointerX=event.clientX;if(!active||event.pointerType==='touch')return;const next=pointerPane(pointerX);if(next!==hoverPane&&!typing())activate(next);hoverPane=next;},{passive:true});
document.addEventListener('pointerdown',event=>{pointerX=event.clientX;if(active){hoverPane=pointerPane(pointerX);activate(hoverPane);}},{passive:true});
// Only a real control choosing focus moves input; a panel title focused for screen readers does not.
document.addEventListener('focusin',event=>{if(active&&!event.target.matches?.('[tabindex="-1"]'))activate(root.contains(event.target)?'sidebar':'tasks');});
document.addEventListener('click',event=>{
  const closeButton=event.target.closest('[data-sidebar-close]');
  if(!root?.contains(closeButton))return;
  event.stopPropagation();close();
},true);
document.addEventListener('keydown',event=>{
  if(!active||!phone.matches||event.key!=='Tab')return;
  const items=[...root.querySelectorAll('button:not([disabled]),textarea,input,summary,[href]')].filter(n=>n.getClientRects().length&&!n.closest('[inert]'));
  if(!items.length)return;
  if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1).focus();}
  else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0].focus();}
},true);
phone.addEventListener('change',()=>{lockPage(!!active);modality();fitViewport();root?.querySelectorAll('[data-sidebar-close]').forEach(setCloseIcon);});
window.addEventListener('popstate',()=>{if(active&&phone.matches)close();});
if(window.visualViewport)for(const event of ['resize','scroll'])visualViewport.addEventListener(event,fitViewport);
Today.define('sidebar',{register,prepare,open,close,isOpen,getRoot,surface,fitViewport,motion,modality,setCloseIcon});
})();
