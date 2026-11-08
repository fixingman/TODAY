// Lazy entry coordination; the main app only registers the open action.
(function(){
'use strict';
let explorationLoading=null,explorationUI=null,explorationDoc=null,baseLoading=null,previewGrant='',previewEpoch=0;
const account=()=>localStorage.getItem('dropbox_refresh_token')||localStorage.getItem('dropbox_token')||'';
function base(){return baseLoading ||= import('/assets/exploration-core.js').then(()=>import('/assets/exploration-files.js')).then(()=>import('/assets/exploration-context.js')).catch(error=>{baseLoading=null;throw error;});}
let previewRead=null,previewState=null;
async function preview(read=true){
 await base();const grant=account();
 if(grant!==previewGrant){previewEpoch++;previewRead=null;previewState=null;previewGrant=grant;rememberDocument(null);}
 if(!grant)return {doc:null,message:'Connect Dropbox to keep a question across devices.'};
 if(read){const token=++previewEpoch;previewRead=(async()=>{
  const result=await Today.use('exploration-files').read();if(token!==previewEpoch||grant!==account())return null;
  if(!result.ok){rememberDocument(null);return previewState={doc:null,unavailable:!result.notFound,message:result.notFound?'Start with a question or a Markdown checkpoint.':'Your Dropbox document is unavailable. Open exploration to retry.'};}
  try{rememberDocument(Today.use('exploration-core').parse(result.text));previewState=null;return true;}catch(_){rememberDocument(null);return previewState={doc:null,message:'Open exploration to import your Markdown document.'};}
 })();}
 const token=previewEpoch;if(previewRead)await previewRead;
 if(token!==previewEpoch||grant!==account())return {doc:null};
 if(previewState)return previewState;
 const doc=explorationDoc;if(!doc)return {doc:null};
 const sources=await Today.use('exploration-context').collect(Today.use('exploration-core').supportIds(doc));if(token!==previewEpoch||grant!==account())return {doc:null};
 const reading=Today.use('exploration-core').current(doc,sources);
 const own=reading&&Today.use('exploration-core').amendments(doc,reading.id).filter(row=>Today.use('exploration-core').included(doc,row.id)).at(-1);
 return {doc,reading:!!reading,summary:own?.text||reading?.summary||doc.entries.findLast(row=>row.kind==='observation'&&Today.use('exploration-core').included(doc,row.id))?.text||doc.question};
}
    function rememberDocument(doc) { explorationDoc = doc; }
    async function openExploration(event, button, place, isCurrent = ()=>true) {
      event.stopPropagation();
      // A late Memory preview must not replace the session’s newer document/link state.
      previewEpoch++;previewRead=null;previewState=null;
      const kind = button.dataset.exOrigin || 'memory';
      const clickedReading = button.dataset.exNudgeText;
      const recordedReading = kind === 'nudge' && typeof _memoryLineFor === 'function' ? _memoryLineFor('morning nudge',_localISO()) : null;
      const context = clickedReading && recordedReading?.text === clickedReading && Today.use('nudge').currentLine() === clickedReading
        ? {source_type:'AI reading',text:clickedReading} : null;
      place ||= {kind,button,wasOpen:kind === 'memory' && Today.use('sidebar').isOpen('memory'),label:kind === 'memory' ? '← memory' : '← today'};
      if (!explorationLoading) explorationLoading = base().then(()=>import('/assets/exploration.js')).then(()=>Today.use('exploration')).catch(error=>{explorationLoading=null;throw error;});
      try {
        explorationUI = await explorationLoading;
        if(!isCurrent())return;
        await explorationUI.open({
          changed(doc){previewEpoch++;previewRead=null;previewState=null;previewGrant=account();rememberDocument(doc);},
          // Explore sits beside Memory and the list, so closing it leaves both exactly as they were.
          restore(from){
            // Return focus to the opener; if it has gone (e.g. Memory closed meanwhile), the
            // always-present list entry.
            const visible = node => node?.isConnected && node.getClientRects().length;
            const target = [from.button, from.kind === 'memory' && document.getElementById('memoryContinue'), document.querySelector('#explorationEntry button')].find(visible);
            target?.focus();
          },
          sources:supportIds=>Today.use('exploration-context').collect(supportIds),
          connections:()=>Today.use('memory').openConnections(),
          addTask(text){
            const existing = manualTasks.find(task=>task.text === text && !doneIds.has(task.id));
            return existing?.id || Today.use('task-actions').addTaskFromText(text);
          }
        },place,context);
      } catch (error) { explorationLoading=null;throw error; }
    }
    const explorationObserver = new MutationObserver(()=>{
      explorationUI?.refreshSources();
    });
    explorationObserver.observe(document.getElementById('manualList'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    explorationObserver.observe(document.getElementById('dayNudge'),{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
    explorationObserver.observe(document.getElementById('sidebarRoot'),{childList:true});

function disconnect(){previewEpoch++;previewRead=null;previewState=null;previewGrant='';rememberDocument(null);document.querySelector('#memoryThread')?.replaceChildren();}
document.addEventListener('today:dropbox-disconnected',disconnect);
window.addEventListener('storage',event=>{if(['dropbox_refresh_token','dropbox_token'].includes(event.key)&&account()!==previewGrant)disconnect();});
Today.define('exploration-entry',{preview,open:openExploration,hide:()=>explorationUI?.hide(),isOpen:()=>!!explorationUI?.isOpen?.(),clearInfluence:()=>explorationUI?.clearInfluence()});
})();
