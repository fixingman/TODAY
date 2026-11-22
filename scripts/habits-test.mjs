import { installFixtureClock, waitForFonts } from './browser-fixture.mjs';
// TODAY — Habits regression test
//
// Full flow invariant suite: 3am rollover, render, toggleHabitDone check/uncheck,
// addHabit, toggleHabitEditMode, archiveHabit+undo, _getHabitStrength,
// focus integration, and module wiring.
//
// Run from repo root:
//   node scripts/habits-test.mjs --pre-extraction
//   node scripts/habits-test.mjs

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURE_NOW = new Date(2026,9,28,12).getTime();
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PRE_EXTRACTION = process.argv.includes('--pre-extraction');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.woff2':'font/woff2', '.css':'text/css' };

let puppeteer;
try { puppeteer = (await import('puppeteer-core')).default; }
catch { console.error('✗ puppeteer-core not installed — run: cd scripts && npm install'); process.exit(1); }

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';
  try {
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, resolve));
const URL_BASE = `http://127.0.0.1:${server.address().port}`;

let browser;
const ok = message => console.log('  ✓ ' + message);
const fail = async (message, detail) => {
  console.error('✗ FAIL — ' + message);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  if (browser) await browser.close();
  server.close();
  process.exit(1);
};
const expectAll = async (label, result) => {
  const failed = Object.entries(result).filter(([, value]) => !value);
  if (failed.length) await fail(label, result);
};

browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

// Compute seed dates in local time (equivalent to _localISO)
const localISO = (d = new Date()) => {
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  return `${Y}-${M}-${D}`;
};
const DAY_MS = 24 * 60 * 60 * 1000;
// Use TWO_DAYS_AGO + YESTERDAY so habit_a shows ≥2 dots regardless of 3am rollover.
// _getHabitDates() 21-day window always includes both; _getHabitStrength uses real
// Date.now() and always sees both in the 90-day lookback.
const TWO_DAYS_AGO = localISO(new Date(FIXTURE_NOW - 2 * DAY_MS));
const YESTERDAY    = localISO(new Date(FIXTURE_NOW - DAY_MS));

const HABIT_A = { id: 'habit_a', name: 'Read', archived: false };
const HABIT_B = { id: 'habit_b', name: 'Walk', archived: false };

async function openPage(now = FIXTURE_NOW) {
  const page = await browser.newPage();
  await installFixtureClock(page,now);
  await page.setViewport({ width: 1200, height: 900 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(
    (habitsSeed, completionsSeed) => {
      localStorage.clear();
      localStorage.setItem('splash_shown_at', String(Date.now()));
      localStorage.setItem('today_habits',             JSON.stringify(habitsSeed));
      localStorage.setItem('today_habit_completions',  JSON.stringify(completionsSeed));
      localStorage.setItem('today_habit_events',       JSON.stringify({}));
    },
    [HABIT_A, HABIT_B],
    { habit_a: [TWO_DAYS_AGO, YESTERDAY], habit_b: [] }
  );
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    () => !document.body.hasAttribute('data-booting') && performance.getEntriesByName('today:interactive').length > 0 && typeof Today?.use('habits')._saveHabits === 'function',
    { timeout: 15000 }
  );
  await page.evaluate(()=>Today.use('sidebar').open('habits'));
  await page.evaluate(() => {
    window.dropboxAutoSave = () => {};
    window.playHabitDoneSound = () => {};
    // Guard: checkHabitNudge may be called when all habits are done
    if (typeof window.checkHabitNudge === 'undefined') window.checkHabitNudge = () => {};
  });
  return { page, errors };
}

try {
  // 1. 3am rollover: _habitTodayISO() returns yesterday at 2:59am, today at 3:01am.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const origNow = Date.now.bind(Date);

      const d259 = new Date();
      d259.setHours(2, 59, 0, 0);
      Date.now = () => d259.getTime();
      const result259 = _habitTodayISO();
      const yesterday = new Date(d259);
      yesterday.setDate(yesterday.getDate() - 1);
      const yISO = yesterday.getFullYear() + '-' +
        String(yesterday.getMonth() + 1).padStart(2, '0') + '-' +
        String(yesterday.getDate()).padStart(2, '0');

      const d301 = new Date();
      d301.setHours(3, 1, 0, 0);
      Date.now = () => d301.getTime();
      const result301 = _habitTodayISO();
      const todayISO = d301.getFullYear() + '-' +
        String(d301.getMonth() + 1).padStart(2, '0') + '-' +
        String(d301.getDate()).padStart(2, '0');

      Date.now = origNow;
      return {
        at259am_is_yesterday: result259 === yISO,
        at301am_is_today:     result301 === todayISO,
        debug: { result259, yISO, result301, todayISO },
      };
    });
    if (!result.at259am_is_yesterday || !result.at301am_is_today) {
      await fail('3am rollover', result);
    }
    ok('3am rollover: _habitTodayISO() returns yesterday at 2:59am, today at 3:01am');
    await page.close();
  }

  // 2. renderHabits: empty state — shows "No habits" text.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      habitsList = [];
      Today.use('habits').renderHabits();
      const empty = document.getElementById('habitEmpty');
      return {
        showsEmpty: !!(empty && empty.classList.contains('show')),
        emptyText:  !!(empty && empty.textContent.includes('No habits')),
      };
    });
    await expectAll('renderHabits empty', { ...result, noErrors: errors.length === 0 });
    ok('renderHabits: empty state shows "No habits" message');
    await page.close();
  }

  // 3. renderHabits: with habits — 2 rows, habit_a has ≥2 filled dots.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('habits').renderHabits();
      const rows        = document.querySelectorAll('#habitList .habit');
      const habitARow   = document.querySelector('.habit[data-habit-id="habit_a"]');
      const filledDots  = habitARow ? habitARow.querySelectorAll('.week-dot.filled').length : 0;
      const hasCheckEl  = !!(habitARow && habitARow.querySelector('.habit-check'));
      return {
        rowCount:            rows.length === 2,
        habitARendered:      !!habitARow,
        filledDotsAtLeastTwo: filledDots >= 2,
        hasCheckEl,
      };
    });
    await expectAll('renderHabits with habits', { ...result, noErrors: errors.length === 0 });
    ok('renderHabits: 2 rows rendered, habit_a has ≥2 filled dots');
    await page.close();
  }

  // 4. toggleHabitDone: check — adds today's date to completions, saves, records event.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('habits').renderHabits();
      Today.use('habits').toggleHabitDone('habit_b');
      const today  = _habitTodayISO();
      const comps  = habitCompletions['habit_b'] || [];
      const ls     = JSON.parse(localStorage.getItem('today_habit_completions') || '{}');
      const row    = document.querySelector('.habit[data-habit-id="habit_b"]');
      const event  = habitEvents['habit_b::' + today] || {};
      return {
        dateAdded:      comps.includes(today),
        lsSaved:        (ls['habit_b'] || []).includes(today),
        rowDone:        !!(row && row.classList.contains('done-today')),
        eventRecorded:  typeof event === 'object' && event !== null,
        eventTypeCheck: event.type === 'check',
      };
    });
    await expectAll('toggleHabitDone check', { ...result, noErrors: errors.length === 0 });
    ok('toggleHabitDone (check): date added, localStorage saved, DOM updated, event recorded');
    await page.close();
  }

  // 5. toggleHabitDone: uncheck — removes date from completions, records uncheck event.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('habits').renderHabits();
      Today.use('habits').toggleHabitDone('habit_b'); // check
      Today.use('habits').toggleHabitDone('habit_b'); // uncheck
      const today   = _habitTodayISO();
      const comps   = habitCompletions['habit_b'] || [];
      const ls      = JSON.parse(localStorage.getItem('today_habit_completions') || '{}');
      const row     = document.querySelector('.habit[data-habit-id="habit_b"]');
      const event   = habitEvents['habit_b::' + today] || {};
      return {
        dateRemoved:    !comps.includes(today),
        lsUpdated:      !(ls['habit_b'] || []).includes(today),
        rowNotDone:     !!(row && !row.classList.contains('done-today')),
        eventTypeUncheck: event.type === 'uncheck',
      };
    });
    await expectAll('toggleHabitDone uncheck', { ...result, noErrors: errors.length === 0 });
    ok('toggleHabitDone (uncheck): date removed, localStorage updated, DOM reflects uncheck');
    await page.close();
  }

  // 6. addHabit — new habit in habitsList, saved to localStorage, rendered in DOM.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const input     = document.getElementById('habitInput');
      if (input) input.value = 'Meditate';
      const beforeLen = habitsList.length;
      Today.use('habits').addHabit();
      const newHabit  = habitsList.find(h => h.name === 'Meditate');
      const ls        = JSON.parse(localStorage.getItem('today_habits') || '[]');
      const lsHabit   = ls.find(h => h.name === 'Meditate');
      const rendered  = newHabit ? !!document.querySelector('.habit[data-habit-id="' + newHabit.id + '"]') : false;
      return {
        addedToList:  !!newHabit,
        hasId:        !!(newHabit && newHabit.id.startsWith('habit_')),
        lsSaved:      !!lsHabit,
        rendered,
        inputCleared: !!(input && input.value === ''),
        listGrew:     habitsList.length === beforeLen + 1,
      };
    });
    await expectAll('addHabit', { ...result, noErrors: errors.length === 0 });
    ok('addHabit: new habit in habitsList, saved to localStorage, rendered in DOM');
    await page.close();
  }

  // 7. toggleHabitEditMode — enters edit mode (inputs), saves name change on exit.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('habits').renderHabits();
      Today.use('habits').toggleHabitEditMode();
      const modeEntered = habitEditMode === true;
      const inputs      = document.querySelectorAll('#habitList .habit-edit-input');
      const editBtn     = document.getElementById('habitEditBtn');
      // Rename habit_b via its input
      const inputB = document.querySelector('.habit-edit-input[data-id="habit_b"]');
      if (inputB) inputB.value = 'Run';
      Today.use('habits').toggleHabitEditMode();
      const modeExited   = habitEditMode === false;
      const savedHabit   = habitsList.find(h => h.id === 'habit_b');
      const ls           = JSON.parse(localStorage.getItem('today_habits') || '[]');
      const lsHabit      = ls.find(h => h.id === 'habit_b');
      return {
        modeEntered,
        inputsAppeared: inputs.length === 2,
        modeExited,
        nameSaved:   savedHabit ? savedHabit.name === 'Run' : false,
        lsNameSaved: lsHabit   ? lsHabit.name   === 'Run' : false,
        btnText:     editBtn   ? editBtn.getAttribute('aria-label') === 'Edit habits' && editBtn.getAttribute('aria-pressed') === 'false' : true,
      };
    });
    await expectAll('toggleHabitEditMode', { ...result, noErrors: errors.length === 0 });
    ok('toggleHabitEditMode: enters edit (inputs), saves name change on exit');
    await page.close();
  }

  // 8. archiveHabit + undo — habit archived, toast shown, _undoLast restores it.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('habits').renderHabits();
      Today.use('habits').archiveHabit('habit_a');
      // Capture booleans immediately — habitA is a live reference; undo will mutate it.
      const habitA       = habitsList.find(h => h.id === 'habit_a');
      const habitArchived = !!(habitA && habitA.archived === true);
      const toast        = document.getElementById('undoToast');
      const toastShown   = !!(toast && toast.classList.contains('show'));
      const ls1          = JSON.parse(localStorage.getItem('today_habits') || '[]');
      const lsArchivedA  = ls1.find(h => h.id === 'habit_a');

      Today.use('task-actions')._undoLast();
      const habitAAfter    = habitsList.find(h => h.id === 'habit_a');
      const ls2            = JSON.parse(localStorage.getItem('today_habits') || '[]');
      const lsUnarchivedA  = ls2.find(h => h.id === 'habit_a');
      return {
        habitArchived,
        lsArchived:     !!(lsArchivedA && lsArchivedA.archived === true),
        toastShown,
        undoRestored:   !!(habitAAfter && habitAAfter.archived === false),
        lsRestored:     !!(lsUnarchivedA && lsUnarchivedA.archived === false),
      };
    });
    await expectAll('archiveHabit + undo', { ...result, noErrors: errors.length === 0 });
    ok('archiveHabit: archived + toast shown; _undoLast restores it');
    await page.close();
  }

  // 9. _getHabitStrength — > 0 for habit_a (has completions), 0 for habit_b (none).
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const strengthA = Today.use('habits')._getHabitStrength('habit_a');
      const strengthB = Today.use('habits')._getHabitStrength('habit_b');
      return {
        habitAPositive:  strengthA > 0,
        habitBZero:      strengthB === 0,
        habitAInRange:   strengthA >= 0 && strengthA <= 100,
        strengthANumber: typeof strengthA === 'number',
      };
    });
    await expectAll('_getHabitStrength', { ...result, noErrors: errors.length === 0 });
    ok('_getHabitStrength: > 0 for habit_a (completions), 0 for habit_b (none)');
    await page.close();
  }

  // 10. Focus integration — window._focusOnCheck is called with habit ID on check.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('habits').renderHabits();
      let focusCalledWith = null;
      window._focusOnCheck = id => { focusCalledWith = id; };
      Today.use('habits').toggleHabitDone('habit_b'); // habit_b has no completions → isNowDone = true
      window._focusOnCheck = null;
      return { focusCalled: focusCalledWith === 'habit_b' };
    });
    await expectAll('focus integration', { ...result, noErrors: errors.length === 0 });
    ok('focus integration: window._focusOnCheck called with habit ID on check');
    await page.close();
  }

  // Desktop history uses the actual mounted sidebar, not an isolated CSS mock.
  {
    const { page, errors } = await openPage();
    await waitForFonts(page);
    const shots = join(ROOT,'.context/ci-test-results/habits-layout');
    await mkdir(shots,{recursive:true});
    await page.evaluate(() => {
      const day = ago => { const d = _habitNow(); d.setDate(d.getDate()-ago); return _localISO(d); };
      habitsList = [
        {id:'habit_old',name:'Practice piano without distractions and read a few pages before bed',created_at:day(89),focusSessions:3},
        {id:'habit_short',name:'Walk outside after lunch',created_at:day(7)},
        {id:'habit_legacy',name:'Read for twenty minutes',created_at:'invalid'},
        {id:'habit_unknown',name:'A habit without an earlier recorded date'}
      ];
      habitCompletions = {
        habit_old: Array.from({length:90},(_,i)=>day(i)).filter((_,i)=>i%3),
        habit_short:[day(7),day(1)],habit_legacy:[day(40)],habit_unknown:[]
      };
      window.__layoutStrength = habitsList.map(h=>Today.use('habits')._getHabitStrength(h.id));
      Today.use('habits').renderHabits();
    });
    async function settled(width) {
      await page.setViewport({width,height:900});
      await page.waitForFunction(() => [...document.querySelectorAll('#habitList .habit')].every(row=>{
        const history=row.querySelector('.habit-history');
        const inset=parseFloat(getComputedStyle(history).paddingInlineEnd)||0;
        const capacity=Math.max(1,Math.floor((history.clientWidth-inset+5)/10));
        const available={habit_old:90,habit_short:8,habit_legacy:41,habit_unknown:1}[row.dataset.habitId];
        const expected=Math.min(capacity,available);
        const last=row.querySelector('.week-dot:last-child').getBoundingClientRect();
        return row.querySelectorAll('.week-dot').length===expected&&Math.abs(history.getBoundingClientRect().right-last.right-inset)<1;
      }),{timeout:3000});
    }
    async function layoutGeometry(width, editing=false) {
      const result=await page.evaluate(editing=>{
        const rows=[...document.querySelectorAll('#habitList .habit')];
        return rows.map(row=>{
          const title=row.querySelector('.habit-body').getBoundingClientRect();
          const rail=row.querySelector('.habit-history').getBoundingClientRect();
          const dots=[...row.querySelectorAll('.week-dot')];
          const first=dots[0].getBoundingClientRect(),last=dots.at(-1).getBoundingClientRect();
          const end=row.querySelector('.habit-streak').getBoundingClientRect();
          const box=row.getBoundingClientRect(),input=row.querySelector('input');
          const short=row.dataset.habitId==='habit_short'||row.dataset.habitId==='habit_unknown';
          return {
            id:row.dataset.habitId,count:dots.length,actualGap:first.top-title.bottom,
            aligned:innerWidth<=600?title.right<=first.left:short||Math.abs(title.left-first.left)<1,
            below:innerWidth<=600?Math.abs((title.top+title.bottom-last.top-last.bottom)/2)<1:title.bottom<first.top,
            spacing:parseFloat(getComputedStyle(row).rowGap)===(innerWidth>600?6:8),
            trailing:innerWidth<=600?Math.abs(end.left-last.right-8)<1:end.bottom<last.top&&Math.abs(end.right-last.right-4)<1,
            fills:(innerWidth<=600?Math.abs(last.right-rail.right)<1:Math.abs(end.right-rail.right)<1)&&Math.abs(last.right-row.querySelector('.habit-week').getBoundingClientRect().right)<1,
            contained:rail.right<=box.right&&(!input||input.getBoundingClientRect().right<=title.right+1),
            fading:dots.length<8||Number(dots[0].style.opacity)===.12&&dots.slice(-7).every(d=>Number(d.style.opacity)===1),
            today:dots.at(-1).classList.contains('is-today'),
            editState:editing===row.classList.contains('editing')
          };
        });
      },editing);
      for(const row of result) {
        const {id,count,actualGap,...checks}=row;
        if (!checks.trailing) await fail("strength placement", {id,count,actualGap});
        await expectAll('desktop habit layout '+width+' '+id,{...checks,noErrors:!errors.length});
        if(width>=1024&&id==='habit_old'&&count<=21)await fail('full-width desktop history should show more than21 days',row);
      }
      return result;
    }
    for(const width of [1440,1024,736,601]) {
      await settled(width);
      await layoutGeometry(width);
      await page.screenshot({path:join(shots,'desktop-'+width+'.png')});
    }
    // Edit rows: a full-width 44px name field (16px text on phones) and one row of quiet
    // actions; check, history and strength step aside until editing ends.
    // History is hidden while editing, so wait on layout frames rather than on dot fitting.
    // At ≤600px the panel moves into its phone host; measure only once it has arrived there.
    const editSettled=async width=>{await page.setViewport({width,height:900});
      await page.waitForFunction(phone=>innerWidth<=600===phone&&!!document.getElementById('habitsPanel')?.contains(document.getElementById('habitList'))===phone,{timeout:3000},width<=600);
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
    // Translated DOMRects can round 44px down to 43.999996px. Require the
    // real 44px layout height and allow only 0.001px coordinate rounding.
    const editFieldHeight=(rectHeight,layoutHeight)=>layoutHeight>=44&&rectHeight>=44-0.001;
    async function editGeometry(label) {
      const rows=await page.evaluate(()=>[...document.querySelectorAll('#habitList .habit')].map(row=>{
        const box=row.getBoundingClientRect(),input=row.querySelector('.habit-edit-input').getBoundingClientRect(),style=getComputedStyle(row);
        const link=row.querySelector('.habit-daily-link'),archive=row.querySelector('.habit-edit-delete'),a=archive.getBoundingClientRect(),l=link.getBoundingClientRect();
        const pad=parseFloat(style.paddingLeft)+row.clientLeft; // inside the 1px row border
        return {editing:row.classList.contains('editing'),fieldHeight:input.height,layoutHeight:row.querySelector('.habit-edit-input').offsetHeight,fullWidth:Math.abs(input.left-box.left-pad)<1&&Math.abs(box.right-pad-input.right)<1,
          phoneText:innerWidth>600||parseFloat(getComputedStyle(row.querySelector('.habit-edit-input')).fontSize)>=16,
          hidden:['.habit-check','.habit-history','.habit-streak'].every(sel=>!row.querySelector(sel)||getComputedStyle(row.querySelector(sel)).display==='none'),
          actionsBelow:l.top>=input.bottom&&Math.abs(a.top-l.top)<1,archiveEnd:a.right<=box.right&&a.left>l.right,
          targets:[a,l].every(r=>r.height>=24),named:archive.getAttribute('aria-label')?.startsWith('Archive ')&&!!row.querySelector('.habit-edit-input').getAttribute('aria-label')};
      }));
      for(const {fieldHeight,layoutHeight,...row} of rows)await expectAll('habit edit row '+label,{...row,fieldHeight:editFieldHeight(fieldHeight,layoutHeight),noErrors:!errors.length});
    }
    await settled(1200);
    await page.evaluate(()=>Today.use('habits').toggleHabitEditMode());
    const heightControl=await page.evaluate(()=>{
      const input=document.querySelector('.habit-edit-input').cloneNode();
      Object.assign(input.style,{position:'fixed',top:'8px',left:'8px',width:'120px',height:'44px',minHeight:'44px'});document.body.append(input);
      try{
        let rounding=null;
        for(let i=1;i<2000;i++){input.style.transform=`translateY(${i/97}px)`;const rectHeight=input.getBoundingClientRect().height;if(rectHeight<44){rounding={rectHeight,layoutHeight:input.offsetHeight};break;}}
        Object.assign(input.style,{transform:'none',height:'43px',minHeight:'43px'});
        return {rounding,undersized:{rectHeight:input.getBoundingClientRect().height,layoutHeight:input.offsetHeight}};
      }finally{input.remove();}
    });
    await expectAll('edit height coordinate-rounding and undersized controls',{
      reproduced:!!heightControl.rounding,
      oldRejectsValid:!!heightControl.rounding&&heightControl.rounding.rectHeight<44,
      repairedAcceptsValid:!!heightControl.rounding&&editFieldHeight(heightControl.rounding.rectHeight,heightControl.rounding.layoutHeight),
      undersizedStillRejected:!editFieldHeight(heightControl.undersized.rectHeight,heightControl.undersized.layoutHeight)
    });
    ok('44px translated field reproduces strict-height failure; real 43px field still fails the repaired check');
    await editGeometry(1200);
    await page.screenshot({path:join(shots,'desktop-edit.png')});
    await page.$eval('.habit-edit-input[data-id="habit_short"]',n=>{n.value='Walk after breakfast';});
    // Content width can change independently of the page; never rebuild the unsaved input.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.evaluate(()=>document.getElementById('sidebarRoot').style.width='360px');
    await editSettled(1200);await editGeometry('360px sidebar');
    await expectAll('resize retains the edit draft',await page.$eval('.habit-edit-input[data-id="habit_short"]',n=>({draft:n.value==='Walk after breakfast'})));
    await editSettled(390);await editGeometry(390);await page.screenshot({path:join(shots,'phone-edit.png')});
    await expectAll('phone edit keeps the draft',await page.$eval('.habit-edit-input[data-id="habit_short"]',n=>({draft:n.value==='Walk after breakfast'})));
    await page.evaluate(()=>document.getElementById('sidebarRoot').style.removeProperty('width'));
    await editSettled(1200);
    // Clicking the daily-task link must not enter focus mode.
    // This guards against a missing exclusion in the focus.js document click handler.
    // Focus-lock happens synchronously; two RAFs are enough to let it settle.
    await page.click('.habit[data-habit-id="habit_old"] .habit-daily-link');
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const dailyLinkFocusLock=await page.evaluate(()=>document.body.classList.contains('focus-locked'));
    // The click handler turns off habitEditMode synchronously. The habit-task-editor may then
    // open asynchronously, unmounting the habits panel. Re-open habits if needed, then restore
    // habitEditMode directly (no DOM call) so line 491's toggleHabitEditMode() exits cleanly.
    // habit-task-editor swaps #habitsContent in-place (sidebar stays on 'habits').
    // Reopen with {fromDailyTask:true} to remount the habits list; ctx bypasses toggle.
    await page.evaluate(()=>{if(!document.querySelector('#habitList .habit'))Today.use('sidebar').open('habits',{fromDailyTask:true});});
    await page.waitForFunction(()=>!!document.querySelector('#habitList .habit'),{timeout:3000});
    await page.evaluate(()=>{habitEditMode=true;});
    await expectAll('daily-task link in edit mode does not enter focus mode',{noFocusLock:!dailyLinkFocusLock});
    await page.evaluate(()=>Today.use('habits').toggleHabitEditMode());
    await settled(1200);await layoutGeometry(1200);
    await expectAll('layout preserves names, strength and order',await page.evaluate(()=>({
      name:habitsList[1].name==='Walk after breakfast',
      strength:JSON.stringify(habitsList.map(h=>Today.use('habits')._getHabitStrength(h.id)))===JSON.stringify(window.__layoutStrength),
      order:[...document.querySelectorAll('#habitList .habit')].map(n=>n.dataset.habitId).join(',')==='habit_old,habit_short,habit_legacy,habit_unknown'
    })));
    await page.click('.habit[data-habit-id="habit_short"] .habit-check');
    await expectAll('completion patches history and accessible summary',await page.evaluate(()=>{
      const row=document.querySelector('[data-habit-id="habit_short"]');
      return {done:row.classList.contains('done-today'),today:row.querySelector('.is-today').classList.contains('filled'),
        summary:row.querySelector('.visually-hidden').textContent.startsWith('3 of the last 8 days')};
    }));
    // habit-task-editor swaps #habitsContent in-place without changing sidebar.active.
    // Document the invariant: isOpen('habits') true does NOT mean #habitList is present.
    await page.evaluate(()=>Today.use('habits').toggleHabitEditMode());
    await page.click('.habit[data-habit-id="habit_old"] .habit-daily-link');
    await page.waitForSelector('#habitsContent .ht-editor',{timeout:3000});
    await expectAll('habit-task-editor in-place swap: sidebar stays on habits, list gone',await page.evaluate(()=>({
      sidebarStillHabits:Today.use('sidebar').isOpen('habits'),
      habitListGone:document.querySelectorAll('#habitList .habit').length===0,
      editorPresent:!!document.querySelector('#habitsContent .ht-editor'),
      titleIsEditor:document.getElementById('habitsTitle')?.textContent==='Daily task',
      habitNameShown:document.querySelector('.ht-title')?.textContent===habitsList.find(h=>h.id==='habit_old')?.name,
    })));
    await page.click('#habitsContent .ht-back');
    await page.waitForSelector('#habitList .habit',{timeout:3000});
    await expectAll('habit-task-editor back restores habits list',await page.evaluate(()=>({
      sidebarOpen:Today.use('sidebar').isOpen('habits'),
      listRestored:document.querySelectorAll('#habitList .habit').length>0,
      editModeOff:!habitEditMode,
    })));
    // Reopening creates a new list; fitting must survive that lifecycle.
    await page.evaluate(()=>Today.use('sidebar').open('about'));
    await page.evaluate(()=>Today.use('sidebar').open('habits'));
    await settled(1024);await layoutGeometry(1024);
    await settled(736);await layoutGeometry(736);
    for(const width of [600,481,480,390,320]) {
      await settled(width);
      await layoutGeometry(width);
      await expectAll('mobile Habits returns below TODAY at'+width,await page.evaluate(()=>{
        const root=document.getElementById('sidebarRoot'),host=document.getElementById('habitsPanel');
        const head=root.querySelector('.habit-head'),buttons=[...head.querySelectorAll('button')],title=document.getElementById('habitsTitle').getBoundingClientRect();
        return {inline:root.parentElement===host&&getComputedStyle(root).position==='static',
          afterLogo:host.getBoundingClientRect().top>=document.getElementById('sticky-header').getBoundingClientRect().bottom-1,
          usablePage:!document.getElementById('main-app').inert&&!document.getElementById('sticky-header').inert&&!document.getElementById('addTaskBar').inert,
          collapseUp:root.querySelector('[data-sidebar-close] path').getAttribute('d')==='M5 12l5-5 5 5',
          recentDays:[...document.querySelectorAll('#habitList .habit')].every(row=>row.querySelectorAll('.week-dot').length<= (innerWidth<=480?7:21)),
          noModal:!root.hasAttribute('aria-modal')&&!document.body.classList.contains('ex-open'),
          controls:buttons.map(b=>b.id||'hide').join(',')==='habitNewBtn,habitEditBtn,hide'&&buttons.every(b=>b.getBoundingClientRect().width>=44),
          headerFits:buttons[0].getBoundingClientRect().left>=title.right&&head.scrollWidth<=head.clientWidth,
          noOverflow:host.scrollWidth<=host.clientWidth&&document.documentElement.scrollWidth<=innerWidth};
      }));
      await page.screenshot({path:join(shots,'mobile-'+width+'.png')});
    }
    // The 3am boundary also controls the last displayed dot and available-day count.
    await page.evaluate(()=>{
      const d=new Date();d.setHours(2,59,0,0);Date.now=()=>d.getTime();
      Today.use('habits').renderHabits();
    });
    await page.setViewport({width:1200,height:900});
    await page.waitForFunction(()=>document.querySelector('[data-habit-id="habit_short"]').querySelectorAll('.week-dot').length===7,{timeout:3000});
    await expectAll('history stays on yesterday before3am',await page.evaluate(()=>{
      const row=document.querySelector('[data-habit-id="habit_short"]');
      return {sevenDays:row.querySelectorAll('.week-dot').length===7,
        yesterdayFilled:row.querySelector('.is-today').classList.contains('filled')};
    }));
    await page.close();
    ok('desktop habit layout: native sidebar geometry, stored-history capacity, fade, edit, completion, lazy remount/resize, mobile inline panel and3am boundary');
  }

  // Approved compact layout, evening header and one live owner across the breakpoint.
  {
    const {page,errors}=await openPage(new Date(2026,9,28,22,15).getTime());
    await waitForFonts(page);
    await page.evaluate(()=>{
      const names=['Read','Walk outside','Stretch','Practice piano','Drink water','Write a few lines','Practice a language','Draw something','Put the phone away'];
      const d=_habitNow();d.setDate(d.getDate()-89);
      habitsList=names.map((name,i)=>({id:'habit_compact_'+i,name,created_at:_localISO(d)}));
      habitCompletions=Object.fromEntries(habitsList.map((h,n)=>[h.id,Array.from({length:89},(_,i)=>{const d=_habitNow();d.setDate(d.getDate()-i-1);return _localISO(d);}).filter((_,i)=>(i+n)%4)]));Today.use('habits').renderHabits();
    });
    for(const [width,height]of [[1200,640],[390,800],[360,740],[320,700]]){
      await page.setViewport({width,height});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect.getTiming().iterations)).map(a=>a.finished.catch(()=>{}))));
      await expectAll('compact habits '+width,await page.evaluate(()=>{
        const head=document.querySelector('.habit-head'),title=document.getElementById('habitsTitle').getBoundingClientRect(),
          timer=document.getElementById('habitCountdown'),t=timer.getBoundingClientRect(),buttons=[...head.querySelectorAll('button')],
          rows=[...document.querySelectorAll('#habitList .habit')],last=rows.at(-1).getBoundingClientRect();
        return {header:head.scrollWidth<=head.clientWidth&&title.right<=t.left&&t.right<=buttons[0].getBoundingClientRect().left,
          countdown:/4h 4[45]m left today/.test(timer.textContent)&&getComputedStyle(timer).display!=='none',
          nine:rows.length===9&&(innerWidth<=600||last.bottom<=innerHeight),
          mobileCompact:innerWidth>600||rows[0].getBoundingClientRect().height<40,
          checkboxTargets:innerWidth>600||rows.slice(1).every((row,i)=>row.querySelector('.habit-check').getBoundingClientRect().top-rows[i].querySelector('.habit-check').getBoundingClientRect().top>=42),
          targets:buttons.every(b=>b.getBoundingClientRect().width>=44&&b.getBoundingClientRect().height>=44&&b.getAttribute('aria-label')),
          oneOwner:document.querySelectorAll('#habitList').length===1&&document.querySelectorAll('#habitInput').length===1,
          bodyFlows:innerWidth>600||!document.body.style.position&&!document.body.classList.contains('ex-open'),
          noOverflow:document.documentElement.scrollWidth<=innerWidth};
      }));
      await page.screenshot({path:join(ROOT,'.context/ci-test-results/habits-layout/compact-'+width+'.png')});
    }
    await page.click('#habitEditBtn');await page.$eval('.habit-edit-input',n=>{n.value='An unsaved mobile name';});
    await page.setViewport({width:1200,height:640});
    await page.waitForFunction(()=>document.getElementById('sidebarRoot').parentElement===document.body);
    await expectAll('mobile to desktop keeps its draft',await page.evaluate(()=>({
      parent:document.getElementById('sidebarRoot').parentElement===document.body,
      draft:document.querySelector('.habit-edit-input').value==='An unsaved mobile name',
      editor:document.getElementById('habitEditBtn').getAttribute('aria-pressed')==='true'
    })));
    await page.setViewport({width:390,height:800});
    await page.waitForFunction(()=>document.getElementById('sidebarRoot').parentElement.id==='habitsPanel');
    await page.click('#habitEditBtn');
    await expectAll('header checkmark saves the name',await page.evaluate(()=>({name:habitsList[0].name==='An unsaved mobile name',label:document.getElementById('habitEditBtn').getAttribute('aria-label')==='Edit habits'})));
    await page.click('#habitNewBtn');await page.waitForFunction(()=>document.activeElement.id==='habitInput');
    await page.keyboard.type('A new fictional habit');await page.keyboard.press('Enter');
    await expectAll('mobile header plus adds a habit',await page.evaluate(()=>({added:habitsList.at(-1).name==='A new fictional habit',closed:document.getElementById('habitNewBtn').getAttribute('aria-expanded')==='false'})));
    await page.evaluate(()=>Today.use('sidebar').close(true));
    await expectAll('mobile close restores the page',await page.evaluate(()=>({host:document.getElementById('habitsPanel').hidden,closed:document.getElementById('sidebarRoot').hidden,opener:document.activeElement.id==='habitsBtn'||document.activeElement===document.body})));
    if(errors.length)await fail('compact habits runtime errors',errors);
    await page.close();ok('compact desktop capacity, mobile header/spacing, editing and adding survive panel placement');
  }

  // 11. Static ownership checks.
  {
    const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
    const swSrc    = await readFile(join(ROOT, 'sw.js'), 'utf8');
    if (PRE_EXTRACTION) {
      await expectAll('inline habits baseline wiring', {
        inlineSection: indexSrc.includes('// ─── Habits ───'),
        noModuleLoad:  !indexSrc.includes('<script src="assets/habits.js"></script>'),
        noPrecache:    !swSrc.includes("'/assets/habits.js'"),
      });
      ok('inline habits baseline');
    } else {
      const habitsSrc = await readFile(join(ROOT, 'assets/habits.js'), 'utf8');
      await expectAll('extracted habits module wiring', {
        moduleLoad:              indexSrc.includes('<script src="assets/habits.js"></script>'),
        initializer:             indexSrc.includes('window._startHabits();'),
        sectionRemoved:          !indexSrc.includes('function _saveHabits()'),
        moduleInitializer:       habitsSrc.includes('window._startHabits = function()'),
        api:                     habitsSrc.includes("Today.define('habits'"),
        habitsListInline:        indexSrc.includes('let habitsList'),
        habitCompletionsInline:  indexSrc.includes('let habitCompletions'),
        habitEventsInline:       indexSrc.includes('let habitEvents'),
        habitEditModeInline:     indexSrc.includes('let habitEditMode'),
        getHabitDatesNotExported: !habitsSrc.includes('window._getHabitDates'),
        precached:               swSrc.includes("'/assets/habits.js'"),
      });
      ok('extracted habits module wiring, exports, inline state vars preserved, precache');
    }
  }

  console.log(`\nHabits tests passed (${PRE_EXTRACTION ? 'inline baseline' : 'extracted module'}).`);
} finally {
  if (browser) await browser.close();
  server.close();
}
