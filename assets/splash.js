// TODAY — splash controller (Roadmap #3 module extraction)
//
// Loaded before the main script, but intentionally inert until index.html calls
// window._startSplash() immediately after init(). Cross-file dependencies resolve
// at call time through the shared classic-script global environment.
(function() {
  window._startSplash = function() {
// Two-flag gate: splash dismisses only when both animation AND init/load are done
let _splashAnimDone = false;
let _appLoadDone    = false;
let _splashPoemHold = false; // poem coda is holding the splash deliberately — not a stall
function _tryDismissSplash() {
  if (_splashAnimDone && _appLoadDone) window._doSplashDismiss && window._doSplashDismiss();
}
window._onSplashAnimDone = function() { _splashAnimDone = true; _tryDismissSplash(); };
window._onAppLoadDone    = function() { _appLoadDone    = true; _tryDismissSplash(); };
// Safety: if load chain stalls (network hang, token refresh, etc.) dismiss splash anyway
setTimeout(() => { if (!_appLoadDone)    window._onAppLoadDone    && window._onAppLoadDone();    }, 6000);
setTimeout(() => { if (!_splashAnimDone && !_splashPoemHold) window._onSplashAnimDone && window._onSplashAnimDone(); }, 6000);
// Poem-coda ceiling: typewriter + fade + longest reading hold stays well under this
setTimeout(() => { if (!_splashAnimDone) window._onSplashAnimDone && window._onSplashAnimDone(); }, 17000);

// ─── Splash screen ────────────────────────────────────────────────────────────
(function() {
  // Skip splash if shown within the last 30 minutes.
  // Using a timestamp (not a date key) so iOS background kill + restore
  // doesn't re-show the splash (kill happens within seconds/minutes),
  // but a genuine desktop close + reopen after a meaningful gap still does.
  const splashKey = 'splash_shown_at';
  const lastShown = parseInt(localStorage.getItem(splashKey) || '0', 10);
  const SPLASH_COOLDOWN = 30 * 60 * 1000; // 30 minutes
  if (Date.now() - lastShown < SPLASH_COOLDOWN) {
    const splash = document.getElementById('splash');
    if (splash) splash.remove();
    // init() runs renderManual() synchronously before this IIFE executes,
    // so tasks are already in the DOM — reveal immediately with no skeleton risk.
    const stickyHdr = document.getElementById('sticky-header');
    if (stickyHdr) stickyHdr.style.opacity = '1';
    const mainApp = document.getElementById('main-app');
    if (mainApp) mainApp.style.opacity = '1';
    const addBar = document.getElementById('addTaskBar');
    if (addBar) addBar.style.opacity = '1';
    const triageBar = document.getElementById('triageBar');
    if (triageBar) triageBar.classList.add('visible');
    const meetingPill = document.getElementById('meetingPill');
    if (meetingPill) meetingPill.classList.add('visible');
    const meetingOverlay = document.getElementById('meetingOverlay');
    if (meetingOverlay) meetingOverlay.classList.add('visible');
    _splashAnimDone = true;
    _appLoadDone = true;
    // Enable wake detection after load settles (no splash path — _appReady never set otherwise)
    window.addEventListener('load', () => { _appReady = true; }, { once: true });
    if (window.matchMedia('(hover: hover)').matches) {
      const inp = document.getElementById('newTask');
      if (inp) inp.focus();
    }
    return;
  }
  localStorage.setItem(splashKey, Date.now().toString());

  // Poem coda (Roadmap #2) — the day's poem joins the splash once per day, on the
  // first splash after midnight (Rule 16 day boundary via _localISO). Decided here,
  // before the 6s anim-stall safety fires, so the hold isn't mistaken for a stall.
  const _showPoemCoda = localStorage.getItem('poem_splash_date') !== _localISO()
    && typeof _poemOfTheDay === 'function' && !!_poemOfTheDay();
  if (_showPoemCoda) {
    _splashPoemHold = true;
    // Pre-populate poem content now so #splash-inner's margin:auto 0 centres
    // the full height (logo + date + poem) from frame one. The poem fades in
    // later via opacity only — no layout shift, no logo jerk.
    // (localStorage key is still written at fade-in so an interrupted open
    // doesn't burn the day's coda.)
    const _codaPoem = _poemOfTheDay();
    const _codaEl   = document.getElementById('splash-poem');
    if (_codaPoem && _codaEl) {
      _codaEl.querySelector('.splash-poem-text').innerHTML = _poemHTML(_codaPoem.text);
      _codaEl.querySelector('.poem-author').textContent    = _codaPoem.author;
    }
  }

  const CHARS = '01∆◊×+−░▒·~⌁⊕⊗'.split('');

  // Particle engine (separate canvas from celebCanvas)
  const splashCanvas = document.createElement('canvas');
  // position:fixed;top:0;left:0 only — width/height set explicitly in sResize as CSS px.
  // Do NOT use inset:0 (right:0;bottom:0): some browsers treat the canvas width attribute
  // as the intrinsic CSS size, making the display box innerWidth*dpr px wide instead of
  // innerWidth px, which doubles/triples all drawing coordinates and breaks burst placement.
  splashCanvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:600;';
  splashCanvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(splashCanvas);
  const sctx = splashCanvas.getContext('2d');
  let spp = [], srf = null;
  let _burstX = innerWidth / 2, _burstY = innerHeight / 3; // safe fallbacks; overwritten once star settles

  function sResize(){ splashCanvas.width=innerWidth; splashCanvas.height=innerHeight; }
  sResize(); addEventListener('resize', sResize);

  function spawnFrag(x,y,vx,vy,ch,sz,depth){
    spp.push({
      x,y,vx:vx+(Math.random()-.5)*0.7,vy:vy+(Math.random()-.5)*0.7,
      ch,sz,depth,
      col:depth===0?COLOR_ACCENT:Math.random()>.5?COLOR_ACCENT+'bb':COLOR_MUTED,
      rot:(Math.random()-.5)*.15,ang:0,
      life:1.1+Math.random()*.6,maxLife:1.7,
      trail:[],tt:0,split:false,
      update(){
        this.x+=this.vx;this.y+=this.vy;
        this.vx*=.97;this.vy=this.vy*.97+.012;
        this.ang+=this.rot;this.life-=.011;this.tt++;
        if(this.tt%2===0){this.trail.push({x:this.x,y:this.y});if(this.trail.length>8)this.trail.shift();}
        if(!this.split&&this.depth<2&&this.life<this.maxLife*.5){
          this.split=true;
          for(let f=0;f<1+Math.floor(Math.random()*2);f++)
            spawnFrag(this.x,this.y,this.vx*.6+(Math.random()-.5)*2,this.vy*.6+(Math.random()-.5)*2,
              CHARS[Math.floor(Math.random()*CHARS.length)],this.sz*.6,this.depth+1);
        }
      },
      draw(c){
        const a=Math.max(0,this.life/this.maxLife);
        this.trail.forEach((tp,ti)=>{
          const ta=(ti/this.trail.length)*a*.4,tr=(ti/this.trail.length)*this.sz*.8;
          const g=c.createRadialGradient(tp.x,tp.y,0,tp.x,tp.y,tr);
          g.addColorStop(0,COLOR_ACCENT+Math.round(ta*120).toString(16).padStart(2,'0'));
          g.addColorStop(1,'transparent');
          c.fillStyle=g;c.beginPath();c.arc(tp.x,tp.y,tr,0,Math.PI*2);c.fill();
        });
        c.save();c.globalAlpha=a;
        c.translate(this.x,this.y);c.rotate(this.ang);
        c.fillStyle=this.col;c.font=`bold ${this.sz}px 'DM Mono',monospace`;
        c.textAlign='center';c.textBaseline='middle';c.fillText(this.ch,0,0);
        c.restore();c.globalAlpha=1;
      }
    });
  }

  function sBurst(x,y,n=16,spd=3.8){
    spp.push({x,y,r:2,life:1,maxLife:1,
      update(){this.r+=2;this.life-=.05;},
      draw(c){
        const g=c.createRadialGradient(x,y,0,x,y,this.r);
        g.addColorStop(0,COLOR_ACCENT+Math.round(Math.max(0,this.life)*180).toString(16).padStart(2,'0'));
        g.addColorStop(1,'transparent');
        c.fillStyle=g;c.beginPath();c.arc(x,y,this.r,0,Math.PI*2);c.fill();
      }
    });
    for(let i=0;i<n;i++){
      const ang=(i/n)*Math.PI*2+(Math.random()-.5)*.3;
      const s=1.5+Math.random()*spd;
      spawnFrag(x,y,Math.cos(ang)*s,Math.sin(ang)*s,CHARS[Math.floor(Math.random()*CHARS.length)],6+Math.random()*4,0);
    }
    if(!srf) sLoop();
  }

  let sFrameCount = 0;
  const SPLASH_MAX_FRAMES = 240; // 4s at 60fps — hard stop
  function sLoop(){
    sctx.clearRect(0,0,splashCanvas.width,splashCanvas.height);
    spp=spp.filter(p=>p.life>0);
    spp.forEach(p=>{p.update();p.draw(sctx);});
    sFrameCount++;
    if(spp.length>0 && sFrameCount<SPLASH_MAX_FRAMES){
      srf=requestAnimationFrame(sLoop);
    } else {
      cancelAnimationFrame(srf);
      srf=null;
      sFrameCount=0;
      sctx.clearRect(0,0,splashCanvas.width,splashCanvas.height);
    }
  }

  // Typewriter — rAF-based for frame-accurate timing (setTimeout drifts on mobile)
  const splashNow = new Date();
  const dateStr = splashNow.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}).toUpperCase();
  const dateTxt = document.getElementById('splash-date');
  const cursor  = document.getElementById('splash-cursor');
  let tidx = 0, typeLastTs = 0;
  const TYPE_BASE = 38, TYPE_RAND = 22;
  let typeDelay = TYPE_BASE + Math.random() * TYPE_RAND;

  function typeFrame(ts) {
    if (!typeLastTs) typeLastTs = ts;
    if (ts - typeLastTs >= typeDelay) {
      typeLastTs = ts;
      typeDelay  = TYPE_BASE + Math.random() * TYPE_RAND;
      if (tidx < dateStr.length) {
        dateTxt.textContent = dateStr.slice(0, ++tidx);
      } else {
        cursor.className = 'on';
        cursor.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: 'step-end', iterations: Infinity });
        setTimeout(() => {
          cursor.className = 'off';
          if (_splashPoemHold) _runPoemCoda(); else window._onSplashAnimDone();
        }, 500);
        return; // stop rAF loop
      }
    }
    requestAnimationFrame(typeFrame);
  }

  // Poem coda — fade the day's poem in under the date, hold for a read, then hand
  // back to the normal dismiss gate. Tap anywhere skips the hold. The day is marked
  // shown at fade-in (not at decision time) so an early bail doesn't burn the day.
  function _runPoemCoda() {
    const splashEl = document.getElementById('splash');
    const poemEl   = document.getElementById('splash-poem');
    if (!splashEl || !poemEl || !poemEl.querySelector('.splash-poem-text').innerHTML) { window._onSplashAnimDone(); return; }
    const poem = _poemOfTheDay();
    if (!poem) { window._onSplashAnimDone(); return; }
    localStorage.setItem('poem_splash_date', _localISO());
    let holdTimer = null;
    const finish = () => {
      clearTimeout(holdTimer);
      splashEl.removeEventListener('click', finish);
      window._onSplashAnimDone();
    };
    setTimeout(() => {
      poemEl.classList.add('visible');
      // Reading hold scales with word count: floor 5s, ~200ms/word, ceiling 8s
      const words = poem.text.split(/\s+/).filter(Boolean).length;
      holdTimer = setTimeout(finish, Math.min(Math.max(5000, words * 200), 8000));
      splashEl.addEventListener('click', finish);
    }, 700);
  }

  // Transition: TO → DAY/date → burst/coda → fade splash → reveal app
  window._doSplashDismiss = function(){
    const wordTo     = document.getElementById('splash-word-to');
    const wordDay    = document.getElementById('splash-word-day');
    const dateWrap   = document.getElementById('splash-date-wrap');
    const poemEl     = document.getElementById('splash-poem');
    const poemTextEl = poemEl?.querySelector('.splash-poem-text');
    const authorEl   = poemEl?.querySelector('.poem-author');

    const _fade = (el, dur, ease = 'ease') => {
      if (!el) return;
      // Explicit endpoints keep WebKit from resolving several sibling animations
      // against different implicit compositor states. Persist the final base style
      // as well, so losing a fill state can never reveal faded content again.
      el.animate([{ opacity: '1' }, { opacity: '0' }], {
        duration: dur, easing: ease, fill: 'both'
      });
      el.style.opacity = '0';
    };

    // 1. "TO" fades first as one word layer (BUG-076)
    _fade(wordTo, 250);

    // 2. "DAY" + date row fade 150ms later; star bursts at 300ms total
    setTimeout(() => {
      _fade(wordDay, 250);
      setTimeout(() => _fade(dateWrap, 200), 50);
      setTimeout(() => sBurst(_burstX, _burstY), 150);
    }, 150);

    // 3. Coda lines staggered from 300ms — wrap each line in a span so they fade individually
    let codaEls = [];
    if (poemTextEl?.innerHTML.trim()) {
      const rawLines = poemTextEl.innerHTML.split('<br>');
      poemTextEl.innerHTML = rawLines.map(l => `<span class="splash-coda-line">${l}</span>`).join('<br>');
      codaEls = [...poemTextEl.querySelectorAll('.splash-coda-line')].filter(el => el.textContent.trim());
      if (authorEl) codaEls.push(authorEl);
    }
    const STAGGER = 250, CODA_DUR = 700;
    codaEls.forEach((el, i) => setTimeout(() => _fade(el, CODA_DUR, 'cubic-bezier(0,0,0.2,1)'), 300 + i * STAGGER));

    // 4. Splash overlay fades after all coda lines have started fading
    const overlayDelay = codaEls.length
      ? 300 + (codaEls.length - 1) * STAGGER + CODA_DUR
      : 750;

    setTimeout(() => {
      const splash  = document.getElementById('splash');
      const mainApp = document.getElementById('main-app');
      if (!splash || !mainApp) return;

      const FADE_OUT = 420;
      splash.style.transition = `opacity ${FADE_OUT}ms ease`;
      splash.style.opacity    = '0';

      setTimeout(() => {
        window.removeEventListener('resize', sResize);
        splash.remove();
        splashCanvas.remove();
        _appReady = true;

        const stickyHdr = document.getElementById('sticky-header');
        if (stickyHdr) { stickyHdr.style.transition = 'opacity 300ms ease'; stickyHdr.style.opacity = '1'; }
        mainApp.style.opacity = '1';
        const children = Array.from(mainApp.children);
        children.forEach((el, i) => {
          el.style.opacity = '0';
          el.style.transform = 'translateY(-8px)';
          el.style.transition = 'none';
          setTimeout(() => {
            el.style.transition = 'opacity 300ms ease, transform 300ms cubic-bezier(0.16,1,0.3,1)';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          }, i * 80);
        });

        const addTaskBar = document.getElementById('addTaskBar');
        const triageBar  = document.getElementById('triageBar');
        if (addTaskBar) { addTaskBar.style.transition = 'opacity 300ms ease'; addTaskBar.style.opacity = '1'; }
        if (triageBar)  triageBar.classList.add('visible');
        const _mtgPill = document.getElementById('meetingPill');
        const _mtgOvl  = document.getElementById('meetingOverlay');
        if (_mtgPill) _mtgPill.classList.add('visible');
        if (_mtgOvl)  _mtgOvl.classList.add('visible');

        setTimeout(() => { if (typeof updateStats === 'function') updateStats(); }, FADE_OUT + 30);
        if (window.matchMedia('(hover: hover)').matches) {
          setTimeout(() => {
            const inp = document.getElementById('newTask');
            if (inp && !document.querySelector('.focusing')) inp.focus();
          }, FADE_OUT + 80);
        }
      }, FADE_OUT + 30);
    }, overlayDelay);
  };

  // Wait for fonts to be truly ready before animating — prevents swap flash
  let _splashStarted = false;
  const startSplash = (animated) => {
    // Guard: the ceiling and the font-check poll can both reach startSplash — second
    // run would restart the typewriter mid-type (BUG-032)
    if (_splashStarted) return;
    _splashStarted = true;
    const star=document.getElementById('splash-star');
    if (!star) return;
    // BUG-041 (third symptom): pin the auto-centered column before anything becomes
    // visible. On iOS PWA cold start the viewport can settle (grow under the status
    // bar) a few frames after first paint; #splash is fixed inset:0, so the growth
    // re-centers #splash-inner's margin:auto — the logo slid DOWN mid-fade ("letters
    // coming down"). Freezing the resolved position as an explicit margin makes later
    // viewport growth a no-op. Guard t>0 keeps the long-poem overflow case (margin
    // collapsed to 0, content scrolls) untouched.
    const _sInner = document.getElementById('splash-inner');
    if (_sInner) {
      const t = _sInner.getBoundingClientRect().top;
      if (t > 0) { _sInner.style.marginTop = t + 'px'; _sInner.style.marginBottom = 'auto'; }
    }
    // Logo reveal — BUG-032 (7th pass): single-unit opacity fade, no letter motion.
    // Six passes tried to time a per-letter transform rise around iOS glyph raster;
    // structurally unwinnable — starting a CSS transform animation promotes each letter
    // to its own compositing layer and re-rasters the glyph at animation start, and the
    // 2-frame opaque "warm" paint was itself a visible flash at the lowered position.
    // Now: fonts are confirmed loaded before this runs, the logo rasters once as ONE
    // layer, and if that raster lands a frame into the fade it lands at near-zero
    // opacity with no motion to betray it.
    const slogo=document.getElementById('splash-logo');
    if (slogo && !animated) {
      // Ceiling path: fonts unconfirmed — static reveal, no fade (BUG-032).
      slogo.style.visibility = 'visible';
      slogo.style.opacity = '1';
      // Star immediate on ceiling path (no logo fade to sync with)
      star.style.transition='opacity .3s ease, transform .45s cubic-bezier(0.34,1.56,0.64,1)';
      star.style.opacity='1';
      star.style.transform='scale(1)';
    } else if (slogo) {
      slogo.style.visibility = 'visible';   // still opacity:0 — nothing paints visibly
      void slogo.offsetWidth;               // commit the opacity:0 baseline
      requestAnimationFrame(() => {
        slogo.style.transition = 'opacity .5s var(--ease-out)';
        slogo.style.opacity = '1';          // whole logo fades in as one unit
        // Star starts in the same frame as the logo fade — iOS composites it
        // inside the logo's opacity layer rather than promoting it independently.
        // When star was set outside this rAF, WebKit created its compositing
        // layer before the logo's opacity:0 baseline was established, causing the
        // star's white inner path to briefly flash visible (BUG-041 second pass).
        star.style.transition='opacity .3s ease, transform .45s cubic-bezier(0.34,1.56,0.64,1)';
        star.style.opacity='1';
        star.style.transform='scale(1)';
      });
    }
    _breathe(star, [
      { transform: 'scale(1) rotate(0deg)',    opacity: 1   },
      { transform: 'scale(1.08) rotate(3deg)', opacity: 0.8 },
      { transform: 'scale(1) rotate(0deg)',    opacity: 1   }
    ], 3200, 400);
    cursor.className='on';
    // Capture star center after transform+opacity transitions settle (450ms/300ms) — used as burst origin
    setTimeout(() => {
      const sr = star.getBoundingClientRect();
      if (sr.width > 0 && sr.height > 0) {
        _burstX = sr.left + sr.width / 2;
        _burstY = sr.top + sr.height / 2;
      }
    }, 600);
    requestAnimationFrame(typeFrame);
  };
  if (document.fonts && document.fonts.load) {
    // Gate the reveal on the FontFaceSet.load() PROMISE — it resolves only when the faces
    // are truly loaded, and is more reliable on iOS Safari than fonts.check()/ready (which
    // can report ready before the glyphs paint — the core of BUG-032). Race a non-competing
    // 2000ms ceiling so a stalled font never hangs the splash; the _splashStarted guard
    // makes a late resolve after the ceiling a no-op. startSplash then does an in-view warm
    // paint before animating, so reveal no longer depends on the API's paint timing.
    const fontsReady = Promise.all([
      document.fonts.load('800 96px Syne', 'TODAY'),
      document.fonts.load('300 13px "DM Mono"', 'JANUARY'),
    ]).then(() => 'ready');
    const ceiling = new Promise(res => setTimeout(() => res('ceiling'), 2000));
    Promise.race([fontsReady, ceiling]).then(o => startSplash(o === 'ready'));
  } else {
    setTimeout(() => startSplash(true), 500);
  }
})();
  };
})();
