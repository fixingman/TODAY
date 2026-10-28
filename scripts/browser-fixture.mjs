// Small opt-in helpers for layout fixtures; performance measurements do not use these.
export const FONT_SPECS = ['300 16px "DM Mono"','400 16px "DM Mono"','500 16px "DM Mono"',
  '400 16px "Syne"','700 16px "Syne"','800 16px "Syne"'];

export async function waitForFonts(page) {
  const state = await page.evaluate(async specs => {
    let timer;
    const work = async () => {
    const loaded = await Promise.all(specs.map(async spec => {
      try { const faces = await document.fonts.load(spec,'TODAY fixture'); return {spec,loaded:faces.length > 0 && faces.every(face=>face.status==='loaded')}; }
      catch { return {spec,loaded:false}; }
    }));
    await document.fonts.ready;
    return loaded;
    };
    try {return await Promise.race([work(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Fixture font preparation timed out')),10000);})]);}
    finally {clearTimeout(timer);}
  },FONT_SPECS);
  if (state.some(font=>!font.loaded)) throw new Error('Fixture fonts failed to load: '+JSON.stringify(state));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  return state;
}

// Monotonic elapsed time continues advancing, so application/request deadlines
// and polling work normally. Only the calendar origin is fictional.
export async function installFixtureClock(page, epoch) {
  await page.evaluateOnNewDocument(now => {
    const NativeDate = Date, began = performance.now();
    const current = () => now + performance.now() - began;
    function FixtureDate(...args) {
      if (!new.target) return new NativeDate(current()).toString();
      return new NativeDate(...(args.length ? args : [current()]));
    }
    Object.setPrototypeOf(FixtureDate,NativeDate); FixtureDate.prototype=NativeDate.prototype;
    FixtureDate.now=()=>Math.floor(current()); window.Date=FixtureDate;
  },epoch);
}

export async function browserState(page) {
  return page.evaluate(()=>({
    timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,
    now:new Date().toISOString(), userAgent:navigator.userAgent,
    viewport:{width:innerWidth,height:innerHeight,scale:devicePixelRatio},
    input:Object.fromEntries(['(hover: hover)','(hover: none)','(pointer: fine)','(pointer: coarse)','(pointer: none)'].map(query=>[query,matchMedia(query).matches])),
    fonts:[...document.fonts].map(face=>({family:face.family,weight:face.weight,status:face.status})),
    bodyFont:getComputedStyle(document.body).fontFamily,
  }));
}
