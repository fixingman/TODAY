'use strict';
const scenes = [
  ['first','An experience gets a reply. The note starts small; no explanation is forced.'],
  ['first-note','The first note separates your account from what is still unknown.'],
  ['refined','A counterexample changes the understanding. Earlier words remain available.'],
  ['correction','Your correction refines the possibility without declaring it true.'],
  ['overnight','A Memory freshness date updates and a completed task moves to Past. The independently supported personal note stays; no AI runs.'],
  ['return','Days later, a concise resumption and one relevant question lead. Opening generates nothing.'],
  ['request','An ordinary request for something to try reaches the same optional-step view.'],
  ['step-return','A later ordinary reply keeps the chosen step. On return it remains optional; it is not a reminder.'],
  ['outcome','A real account can change the note and retire a step. Task completion alone cannot establish benefit.'],
  ['task-withdrawn','Live task context is withdrawn. Its dependent reading disappears; the independently supported personal note remains. Inspect Sources.'],
  ['note-withdrawn','Leaving out a personal note withholds its dependent synthesis and step. Including it again does not revive them.']
];
const selector=document.getElementById('scene'),frame=document.getElementById('preview');
function show() {
  const position=scenes.findIndex(([key])=>key===selector.value);
  document.getElementById('previous').disabled=position===0;
  document.getElementById('next').disabled=position===scenes.length-1;
  document.getElementById('sceneDetail').textContent=scenes[position][1];
  frame.src='surface.html?scene='+encodeURIComponent(selector.value);
  history.replaceState(null,'','#'+selector.value);
}
selector.addEventListener('change',show);
for(const [id,delta] of [['previous',-1],['next',1]])document.getElementById(id).addEventListener('click',()=>{selector.selectedIndex+=delta;show();});
document.getElementById('size').addEventListener('change',event=>{frame.className=event.target.value;});
document.getElementById('example').addEventListener('click',()=>frame.contentWindow.postMessage({type:'fill-fictional-example'},location.origin));
window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.type==='unscripted-preview')document.getElementById('sceneDetail').textContent='Your text appears only in this preview. It has no scripted AI response. Use “fill example reply” to follow the fictional journey.';});
if(scenes.some(([key])=>key===location.hash.slice(1)))selector.value=location.hash.slice(1);
show();
