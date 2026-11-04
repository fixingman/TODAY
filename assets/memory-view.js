// Native Memory presentation, loaded ahead of use. All rows come from the existing records.
(function(){
'use strict';
let hooks, previewEpoch=0, visit=0, preparedVisit=-1,freshVisit=true;
const h=value=>esc(String(value??''));
function model() {
 const m=appMemory;
 if(!m)return {known:[],waiting:[],patterns:[],lately:[],coverage:[]};
      const _dowNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const _parseDowLocal = iso => { const [y,mo,d] = iso.split('-').map(Number); return new Date(y, mo-1, d).getDay(); };
      const allDailyHistory = safeJSON('today_daily_history', []);
      if (allDailyHistory.length > 0 && !allDailyHistory[0].tasksAddedFixed) {
        allDailyHistory.sort((a, b) => a.date.localeCompare(b.date));
        for (let _i = allDailyHistory.length - 1; _i >= 0; _i--) {
          const _prev = _i > 0 ? allDailyHistory[_i - 1].tasksAdded : 0;
          const _raw  = allDailyHistory[_i].tasksAdded || 0;
          const _delta = Math.max(0, _raw - _prev);
          allDailyHistory[_i].tasksAdded = _delta;
          allDailyHistory[_i].tasksAddedFixed = true;
        }
        localStorage.setItem('today_daily_history', JSON.stringify(allDailyHistory));
      }
      if (!localStorage.getItem('today_tasksAdded_v2')) {
        let _dirty = false;
        for (const _e of allDailyHistory) {
          if (_e.tasksAddedFixed) { _e.tasksAdded = 0; _dirty = true; }
          _e.tasksAddedFixed = true;
        }
        if (_dirty) localStorage.setItem('today_daily_history', JSON.stringify(allDailyHistory));
        localStorage.setItem('today_tasksAdded_v2', '1');
      }
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoISO = _localISO(weekAgo);
      const weekHistory = allDailyHistory.filter(e => e.date >= weekAgoISO);

      const semanticItems = [];
      const peakHour = m.preferences?.peakHour;
      if (peakHour !== null && peakHour !== undefined) {
        const _fmtH = h => h === 0 ? 'midnight' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`;
        const _hourCounts = typeof _memoryHourCounts === 'function' ? _memoryHourCounts() : (m.patterns?.completionsByHour || {});
        const _peakCount = _hourCounts[String(peakHour)] || 1;
        const _thresh = _peakCount * 0.5;
        const _activeHours = Object.entries(_hourCounts)
          .filter(([, c]) => c >= _thresh).map(([h]) => parseInt(h)).sort((a, b) => a - b);
        const _runs = []; let _run = [_activeHours[0]];
        for (let i = 1; i < _activeHours.length; i++) {
          if (_activeHours[i] - _activeHours[i-1] <= 1) { _run.push(_activeHours[i]); }
          else { _runs.push(_run); _run = [_activeHours[i]]; }
        }
        _runs.push(_run);
        const _peakRun = _runs.find(r => r.includes(parseInt(peakHour))) || [parseInt(peakHour)];
        if (_peakRun.length >= 2) {
          const _s = _peakRun[0], _e = _peakRun[_peakRun.length - 1];
          semanticItems.push({ record_id:'fact:peak-hour',text: `most tasks done between ${_fmtH(_s)}–${_fmtH(_e)}` });
        } else {
          const h = parseInt(peakHour);
          semanticItems.push({ record_id:'fact:peak-hour',text: `most tasks done around ${_fmtH(h)}` });
        }
      }
      const samples = m.patterns?.taskLifespanSamples || [];
      if (samples.length >= 5) {
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        let lifespanText;
        if (avg < 0.5) lifespanText = 'most tasks close the same day';
        else if (avg < 1.5) lifespanText = 'tasks typically take about a day to close';
        else lifespanText = `tasks typically close in about ${Math.round(avg)} day${Math.round(avg) === 1 ? '' : 's'}`;
        semanticItems.push({ record_id:'fact:lifespan',text: lifespanText });
      }
      const best = m.patterns?.bestStreak || 0;
      const _curStreak = parseInt(localStorage.getItem('stat_streak') || '0');
      if (best >= 3 && best > _curStreak) semanticItems.push({ record_id:'fact:streak',text: `longest streak: ${best} day${best === 1 ? '' : 's'}` });
      if (allDailyHistory.length >= 14) {
        const byDow = {};
        allDailyHistory.forEach(e => {
          const dow = _parseDowLocal(e.date);
          if (!byDow[dow]) byDow[dow] = [];
          byDow[dow].push(e.tasksDone);
        });
        const dowAvgs = Object.entries(byDow)
          .filter(([, vals]) => vals.length >= 2)
          .map(([dow, vals]) => [parseInt(dow), vals.reduce((s, v) => s + v, 0) / vals.length]);
        if (dowAvgs.length >= 3) {
          const [bestDow, bestAvg] = dowAvgs.sort(([, a], [, b]) => b - a)[0];
          const secondAvg = dowAvgs[1][1];
          if (bestAvg >= 2 && bestAvg > secondAvg * 1.2) {
            semanticItems.push({ record_id:'fact:weekday',text: `most done on ${_dowNames[bestDow]}s` });
          }
        }
      }

      const episodicItems = [];
      const recent = (m.recentCompletedTasks || []);
      const thisWeek = recent.filter(e => e.date >= weekAgoISO);
      if (thisWeek.length > 0) {
        episodicItems.push({ text: `${thisWeek.length} task${thisWeek.length === 1 ? '' : 's'} done in the last 7 days` });
      }

      if (weekHistory.length >= 2) {
        const bestDay = weekHistory.reduce((a, b) => b.tasksDone > a.tasksDone ? b : a);
        if (bestDay.tasksDone >= 3) {
          const dayName = _dowNames[_parseDowLocal(bestDay.date)];
          episodicItems.push({ text: `best day this week: ${dayName} (${bestDay.tasksDone} tasks)` });
        }
      }
      const activeDays = weekHistory.filter(e => e.tasksDone > 0);
      if (activeDays.length >= 3) {
        const avg = activeDays.reduce((s, e) => s + e.tasksDone, 0) / activeDays.length;
        episodicItems.push({ text: `averaging ${avg.toFixed(1)} tasks on active days this week` });
      }
      const _startedStillOpen = Object.values(m.returningTasks || {})
        .filter(t => t && (parseInt(t.focusSessions) || 0) > 0);
      if (_startedStillOpen.length >= 2) {
        const _sn = _startedStillOpen.length;
        episodicItems.push({ text: `${_sn} task${_sn === 1 ? '' : 's'} started — still open` });
      }
      (m.memory?.episodic || []).filter(i => hooks.live(i)).forEach(i => {
        episodicItems.push({ text: i.text, isNew: i.isNew, rejectKey: `episodic:${i.id}`, basis: [i.lastSeen,i.seenWeeks], source: 'TODAY’s reading · this week only' });
      });

      semanticItems.push(...hooks.outcomes(m).map(row=>({...row,record_id:row.text.startsWith('most common')?'fact:letgo-reason':row.text.startsWith('obligation')?'fact:obligation-outcomes':'fact:returns'})));
      hooks.computed(semanticItems.map(i => i.text));
      for (const i of hooks.inferences()) {
        semanticItems.push({ text: i.text, isNew: i.isNew, rejectKey: `${i.type}:${i.id}`, basis: [i.lastSeen,i.seenWeeks], source: `TODAY’s reading · recurred in ${i.seenWeeks.length} weeks · unconfirmed by you` });
      }

      const metaItems = [];
      if (m.firstSeen) {
        const _calDays = Math.round((Date.now() - new Date(m.firstSeen + 'T12:00:00').getTime()) / 86400000);
        const _activeDays = Math.min(m.totalDaysActive || 0, _calDays);
        const _dayStr = _activeDays > 0 && _calDays > 0
          ? `active on ${_activeDays} of ${_calDays} day${_calDays === 1 ? '' : 's'}`
          : `${_calDays} day${_calDays === 1 ? '' : 's'} so far`;
        let _sinceStr = m.firstSeen;
        try {
          const _d = new Date(m.firstSeen + 'T12:00:00');
          _sinceStr = _d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (_) {}
        metaItems.push({ text: `noticing since ${_sinceStr} — ${_dayStr}` });
      }
      if (m.totalTasksCompleted > 0) {
        metaItems.push({ text: `${m.totalTasksCompleted} tasks done in all` });
      }
      if ((m.patterns?.focusMinutesTotal || 0) > 0) {
        const hrs = (m.patterns.focusMinutesTotal / 60).toFixed(1);
        metaItems.push({ text: `${hrs} hours of focus so far` });
      }

      const _fmtDay = iso => {
        const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
        return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };
      const _strip = t => (typeof _stripTag === 'function' ? _stripTag(t || '') : String(t || '')).trim();
      const knownItems = [];

      const _revoked = m.revokedKnownItems || {};
      const _returning = Object.entries(m.returningTasks || {})
        .filter(([id, t]) => t && t.text && !_revoked['rt:' + id])
        .sort(([, a], [, b]) => Number((parseInt(b.focusSessions) || 0) > 0) - Number((parseInt(a.focusSessions) || 0) > 0)
          || (b.dayCount || 0) - (a.dayCount || 0))
        .slice(0, 5);
      for (const [_rtId, t] of _returning) {
        const n = parseInt(t.focusSessions) || 0;
        knownItems.push({ text: `returning · "${_strip(t.text)}" — on the list ${t.dayCount} days, ` +
          (n > 0 ? `${n} focus session${n > 1 ? 's' : ''}` : 'no focus sessions recorded'),
          revokeKey: 'rt:' + _rtId });
      }

      const _soonList = typeof soonTasks !== 'undefined' && Array.isArray(soonTasks) ? soonTasks : [];
      const _soonWaiting = _soonList
        .filter(t => t && t.id && t.text && t.zoneChangedAt && !_revoked['sn:' + t.id])
        .map(t => ({ t, days: Math.floor((Date.now() - new Date(t.zoneChangedAt).getTime()) / 86400000) }))
        .filter(e => e.days >= 7)
        .sort((a, b) => b.days - a.days)
        .slice(0, 5);
      const waitingItems = _soonWaiting.map(({ t, days }) => ({
        text: `in Soon · "${_strip(t.text)}" — kept here ${days} days`, revokeKey: 'sn:' + t.id,
      }));

      const _pendingObl = (m.obligationHistory || [])
        .filter(e => e && e.text && !e.done && !e.letgo)
        .filter(e => !_revoked['oh:' + e.date + '|' + (e.text || '').slice(0, 40)])
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 5);
      for (const e of _pendingObl) {
        knownItems.push({ text: `obligation · "${_strip(e.text)}" — added ${_fmtDay(e.date)}, still open`,
          revokeKey: 'oh:' + e.date + '|' + (e.text || '').slice(0, 40) });
      }

      const _floor = new Date(); _floor.setDate(_floor.getDate() - 30);
      const _win = (m.taskOutcomes || []).filter(e => e && e.date && new Date(e.date) >= _floor);
      if (_win.length) {
        const c = k => _win.filter(e => e.outcome === k).length;
        metaItems.push({ text: `30 days · ${c('done')} done · ${c('letgo')} let go · ${c('soon_pull')} to Soon · ${c('revive')} brought back` });
      }


 return {known:knownItems,waiting:waitingItems,patterns:semanticItems,lately:episodicItems,coverage:metaItems};
}
function records() {
 const m=model();
 return [...m.known,...m.waiting,...m.patterns].map(row=>({
   id:row.rejectKey?'memory:'+row.rejectKey:row.revokeKey?'known:'+row.revokeKey:row.record_id||'fact:'+row.text,
   signature_text:row.revokeKey?row.text.replace(/on the list \d+ days|kept here \d+ days|\d+ focus sessions?/g,'recorded activity'):row.text,
   text:row.text,source_type:row.source || (row.rejectKey?'AI reading · unconfirmed':row.revokeKey?'task record':'counted from tasks'),
   evidence_kind:row.rejectKey?'AI interpretation':row.revokeKey?'task record':'counted fact',basis:row.basis || [],cleared_at:appMemory?.clearedAt || ''
 }));
}
      function itemRow(item, extraClass = '') {
        return `<div class="memory-item${extraClass ? ' ' + extraClass : ''}">` +
                (item.isNew ? `<span class="memory-item-new"></span>` : '') +
                `<span class="memory-item-text"><span class="memory-item-body">${esc(item.text)}</span>${item.rejectKey ? `<span class="memory-source">${esc(item.source ? item.source.includes("unconfirmed") ? item.source : item.source + " · unconfirmed by you" : "TODAY’s reading · unconfirmed by you")}</span>` : ''}</span>` +
                (item.action ? `<button type="button" class="memory-item-btn" data-today-click="memory.kind-restore" data-kind="${esc(item.action.kind)}">${esc(item.action.label)}</button>` : '') +
                (item.revokeKey ? `<button type="button" class="memory-item-btn" data-today-click="memory.item-revoke" data-revoke-key="${esc(item.revokeKey)}">dismiss</button>` : '') +
                (item.rejectKey ? `<button type="button" class="memory-item-btn" data-today-click="memory.hypothesis-reject" data-hypothesis="${esc(item.rejectKey)}" aria-label="Not true about me: ${esc(item.text)}">not me</button>` : '') +
                `</div>`;
      }

function block(id,name,rows,extra='') {
 return `<section class="memory-type-block" id="${id}"><div class="memory-type-header"><h3 class="memory-type-name" id="${id}Title" tabindex="-1">${name}</h3>${extra}</div>${rows}</section>`;
}
async function thread() {
 const target=document.getElementById('memoryThread');if(!target||!document.getElementById('memoryPanel')?.classList.contains('open'))return;
 const token=++previewEpoch,read=preparedVisit!==visit;preparedVisit=visit;
 try {
  await import('/assets/exploration-entry.js');
  const preview=await Today.use('exploration-entry').preview(read);
  if(token!==previewEpoch||!target.isConnected)return;
  const button=`<button type="button" class="memory-item-btn" id="memoryContinue" data-today-click="exploration.open">${preview.doc?'continue →':preview.unavailable?'retry exploration →':'explore a question →'}</button>`;
  const focused=target.contains(document.activeElement);
  const anchor=document.getElementById('memoryPanel').contains(document.activeElement)&&!focused?document.activeElement:null;
  const top=anchor?.getBoundingClientRect().top;
  target.innerHTML=preview.doc?`<span class="memory-item-text"><span class="memory-thread-question" id="memoryThreadQuestion">${h(preview.doc.question)}</span><span class="memory-thread-recap">${h(preview.summary)}</span>${preview.reading?'<span class="memory-source">TODAY · unconfirmed by you</span>':''}</span>${button}`:`<span class="memory-item-text memory-empty">${h(preview.message || 'A question you can return to, with your notes in Dropbox.')}</span>${button}`;
  if(anchor?.isConnected)window.scrollBy(0,anchor.getBoundingClientRect().top-top);
  if(focused)target.querySelector('button')?.focus({preventScroll:true});
  target.querySelector('button')?.setAttribute('aria-describedby',preview.doc?'memoryThreadQuestion':'memoryOpenTitle');
 } catch(_) { if(token===previewEpoch&&target.isConnected)target.innerHTML='<span class="memory-item-text memory-empty">Your exploration could not be opened.</span><button type="button" class="memory-item-btn" data-today-click="exploration.open">try exploration →</button>'; }
}
function render(options) {
 hooks=options;
 const el=document.getElementById('memoryContent');if(!el)return;
 const data=model();const coverageOpen=!freshVisit&&!!document.getElementById('memoryCoverage')?.open;freshVisit=false;
 const reveal=hooks.patternsOpen&&el.querySelector('[data-today-click="memory.patterns-more"]')?.getAttribute('aria-expanded')!=='true';
 const waiting=data.waiting.length?`<button type="button" class="memory-item-btn" data-today-click="memory.known-waiting" aria-expanded="${hooks.waitingOpen}">${hooks.waitingOpen?'less':`show waiting (${data.waiting.length})`}</button>`:'';
 const more=data.patterns.length>6?`<button type="button" class="memory-item-btn" data-today-click="memory.patterns-more" aria-expanded="${hooks.patternsOpen}">${hooks.patternsOpen?'less':`show all (${data.patterns.length})`}</button>`:'';
 const patterns=[...data.patterns.slice(0,hooks.patternsOpen?undefined:6),...data.lately.filter(row=>row.rejectKey)];
 el.innerHTML=block('memoryOpen','STILL OPEN',
  '<div class="memory-item memory-thread" id="memoryThread"><span class="memory-item-text memory-empty">A question you can return to.</span><button type="button" class="memory-item-btn" id="memoryContinue" data-today-click="exploration.open">open exploration →</button></div>'+(data.known.map(row=>itemRow(row)).join('')||'<p class="memory-pending">nothing on record yet</p>')+(hooks.waitingOpen?data.waiting.map(row=>itemRow(row,'memory-item--extra')).join(''):''),waiting)+
 block('memoryHolds','WHAT HOLDS',patterns.map((row,index)=>itemRow(row,index>=6&&reveal?'memory-item--extra':'')).join('')||'<p class="memory-pending">patterns appear as more evidence builds</p>',more)+
 block('memoryKept','KEPT APART','<p class="memory-landing-note">Feelings and dreams stay in their own reading spaces. They are not added to exploration automatically.</p>')+
 `<details id="memoryCoverage"${coverageOpen?' open':''}><summary>what it has to go on</summary><p class="memory-landing-note">How much TODAY has seen. Not a measure of you.</p>${[...data.coverage,...data.lately.filter(row=>!row.rejectKey)].map(row=>itemRow({...row,source:'coverage · on record'})).join('')||'<p class="memory-empty">nothing on record yet</p>'}</details>`;
 const kept=document.getElementById('memoryKept');
 Today.use('reflections')._reflectionRenderMemory(kept);Today.use('dreambank').renderMemory(kept);
 const footer=document.getElementById('memoryFooter');
 if(footer)footer.innerHTML=hooks.clearPending?'<div class="memory-footer"><span class="memory-confirm-msg">erase app records? Dropbox files stay.</span><span class="memory-confirm-actions"><button class="memory-clear-btn memory-clear-confirm" data-today-click="memory.clear-confirm">yes, clear</button><button class="btn-ghost memory-conn-link" data-today-click="memory.clear-cancel">cancel</button></span></div><p class="memory-empty">Dependent exploration readings are withheld. Their history stays in Dropbox until you forget the exploration.</p>':'<div class="memory-footer"><button class="memory-clear-btn" data-today-click="memory.clear-request">clear all memory</button><button type="button" class="memory-conn-link" data-today-click="memory.connections">Connections →</button></div>';
 Today.use('reflections').renderFeedbackFooter();thread();
}
function configure(options){hooks=options;}
function begin(){visit++;previewEpoch++;freshVisit=true;}
function clearPreview(){previewEpoch++;preparedVisit=-1;const row=document.getElementById('memoryThread');if(row)row.replaceChildren();}
Today.define('memory-view',{render,records,configure,begin,clearPreview});
})();
