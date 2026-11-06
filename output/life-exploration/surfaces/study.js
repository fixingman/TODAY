'use strict';
const frames = [...document.querySelectorAll('iframe')];
const controls = Object.fromEntries(['layout','width','dimming','windowBar','speakers','promptStructure'].map(id=>[id,document.getElementById(id)]));
const requested = new URLSearchParams(location.search).get('option');
if (['1','2'].includes(requested)) controls.layout.value=requested;
if(requested==='2') controls.windowBar.checked=false;
function settings() { return {type:'surface-settings',dimming:controls.dimming.value,bar:controls.windowBar.checked,speakers:controls.speakers.value,prompt:controls.promptStructure.checked}; }
function fit() {
  document.body.classList.toggle('single',controls.layout.value!=='compare');
  for (const frame of frames) {
    const section=frame.closest('.comparison');
    section.hidden=controls.layout.value!=='compare'&&section.dataset.option!==controls.layout.value;
    if(section.hidden)continue;
    const width=Number(controls.width.value),height=width<=600?844:820;
    const scale=Math.min(1,frame.parentElement.clientWidth/width);
    frame.style.width=width+'px';frame.style.height=height+'px';frame.style.transform=`scale(${scale})`;
    frame.parentElement.style.height=Math.ceil(height*scale)+'px';
    frame.contentWindow.postMessage(settings(),location.origin);
  }
}
for(const control of Object.values(controls)) control.addEventListener('change',fit);
for(const frame of frames) { frame.addEventListener('load',fit);new ResizeObserver(fit).observe(frame.parentElement); }
fit();
