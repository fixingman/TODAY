// Lazy entry coordination; the main app only registers the open action.
(function(){
'use strict';
let explorationLoading=null,explorationUI=null,explorationDoc=null,baseLoading=null,previewGrant='',previewEpoch=0;
const account=()=>localStorage.getItem('dropbox_refresh_token')||localStorage.getItem('dropbox_token')||'';
function base(){return baseLoading ||= import('/assets/exploration-core.js').then(()=>import('/assets/exploration-files.js')).then(()=>import('/assets/exploration-context.js')).catch(error=>{baseLoading=null;throw error;});}
let previewRead=null,previewState=null;
async function preview(read=true){
 await base();const grant=account();
 if(grant!==previewGrant){previewEpoch++;previewRead=null;previewState=null;previewGrant=grant;explorationLinks(null);}
 if(!grant)return {doc:null,message:'Connect Dropbox to keep a question across devices.'};
 if(read){const token=++previewEpoch;previewRead=(async()=>{
  const result=await Today.use('exploration-files').read();if(token!==previewEpoch||grant!==account())return null;
  if(!result.ok){explorationLinks(null);return previewState={doc:null,unavailable:!result.notFound,message:result.notFound?'Start with a question or a Markdown checkpoint.':'Your Dropbox document is unavailable. Open exploration to retry.'};}
  try{explorationLinks(Today.use('exploration-core').parse(result.text));previewState=null;return true;}catch(_){explorationLinks(null);return previewState={doc:null,message:'Open exploration to import your Markdown document.'};}
 })();}
 const token=previewEpoch;if(previewRead)await previewRead;
 if(token!==previewEpoch||grant!==account())return {doc:null};
 if(previewState)return previewState;
 const doc=explorationDoc;if(!doc)return {doc:null};
 const sources=await Today.use('exploration-context').collect();if(token!==previewEpoch||grant!==account())return {doc:null};
 const reading=Today.use('exploration-core').current(doc,sources);
 return {doc,summary:reading?.summary || 'Bring an experience, a contradiction, or something you want to understand.'};
}
    function explorationLinks(doc = explorationDoc) {
      explorationDoc = doc;
      const title = document.getElementById('explorationQuestion');
      if (title) title.textContent = doc?.question || '';
      const linked = new Set((doc?.entries || []).flatMap(entry => entry.kind === 'context' && entry.source_type === 'task' ? [entry.source_id] : entry.kind === 'task' ? [entry.task_id] : entry.kind === 'reading' && doc.today_context?.enabled ? (entry.today_sources||[]).filter(ref=>ref.id.startsWith('task:')&&!doc.today_context.excluded.includes(ref.id)).map(ref=>ref.id.slice(5)) : []));
      document.querySelectorAll('#manualList .task[data-taskid]').forEach(row => {
        const existing = row.querySelector('.exploration-task-action');
        if (!linked.has(row.dataset.taskid) || row.classList.contains('done')) { existing?.remove(); return; }
        if (existing) return;
        const button = document.createElement('button'); button.type = 'button'; button.className = 'memory-item-btn exploration-task-action';
        button.dataset.todayClick = 'exploration.open'; button.dataset.exOrigin = 'task'; button.dataset.taskid = row.dataset.taskid;
        button.textContent = 'explore'; button.setAttribute('aria-label','Explore this task'); row.append(button);
      });
      const nudge = document.getElementById('dayNudge');
      const entry = document.getElementById('explorationNudge');
      if (entry) entry.hidden = !(doc && nudge?.classList.contains('visible') && Today.use('nudge').currentLine());
    }
    async function openExploration(event, button) {
      event.stopPropagation();
      const kind = button.dataset.exOrigin || 'memory';
      const place = {kind,button,wasOpen:kind === 'memory' && $.memoryPanel.classList.contains('open'),label:kind === 'memory' ? '← memory' : '← today'};
      let context = null;
      if (kind === 'task') {
        const task = manualTasks.find(item=>item.id === button.dataset.taskid);
        if (task && !doneIds.has(task.id)) context = {source_type:'task',source_id:task.id,text:task.text};
      } else if (kind === 'nudge') {
        const line = Today.use('nudge').currentLine();
        if (line) context = {source_type:'AI reading',text:line};
      }
      if (!explorationLoading) explorationLoading = base().then(()=>import('/assets/exploration.js')).then(()=>Today.use('exploration')).catch(error=>{explorationLoading=null;throw error;});
      try {
        explorationUI = await explorationLoading;
        if (!$.memoryPanel.classList.contains('open')) Today.use('memory').toggle();
        await explorationUI.open({
          changed(doc){previewEpoch++;previewRead=null;previewState=null;previewGrant=account();explorationLinks(doc);},
          restore(from){
            Today.use('memory').render();
            if (!from.wasOpen) $.memoryPanel.classList.remove('open');
            Today.use('connections').syncActiveButtons();
            const target = from.button?.isConnected && from.button.getClientRects().length ? from.button : document.getElementById(from.kind === 'memory' ? 'memoryContinue' : 'explorationEntry');
            target?.focus();
          },
          sources:()=>Today.use('exploration-context').collect(),
          connections:()=>Today.use('memory').openConnections(),
          availableTasks(){return manualTasks.filter(task=>!doneIds.has(task.id)).slice(0,6).map(task=>({id:task.id,text:task.text}));},
          addTask(text){
            const existing = manualTasks.find(task=>task.text === text && !doneIds.has(task.id));
            return existing?.id || Today.use('task-actions').addTaskFromText(text);
          }
        },place,context);
      } catch (_) { if (window._a11yAnnounce) _a11yAnnounce('Exploration could not open. Try again.'); }
    }
    const explorationObserver = new MutationObserver(()=>{
      if (explorationUI && !$.memoryPanel.classList.contains('open') && $.memoryPanel.classList.contains('exploration-active')) explorationUI.hide();
      if (explorationDoc) explorationLinks();
      explorationUI?.refreshSources();
    });
    explorationObserver.observe(document.getElementById('manualList'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    explorationObserver.observe(document.getElementById('dayNudge'),{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
    explorationObserver.observe($.memoryPanel,{attributes:true,attributeFilter:['class']});

function disconnect(){previewEpoch++;previewRead=null;previewState=null;previewGrant='';explorationLinks(null);document.querySelector('#memoryThread')?.replaceChildren();}
document.addEventListener('today:dropbox-disconnected',disconnect);
window.addEventListener('storage',event=>{if(['dropbox_refresh_token','dropbox_token'].includes(event.key)&&account()!==previewGrant)disconnect();});
Today.define('exploration-entry',{preview,open:openExploration,hide:()=>explorationUI?.hide(),clearInfluence:()=>explorationUI?.clearInfluence()});
})();
