// TODAY — idle companion (Roadmap #3 module extraction)
//
// Fully self-contained IIFE: registers its own activity listeners + idle interval
// on load, appends its element to document.body only when idle. Zero app-state or
// app-function coupling (verified) — uses CSS vars + browser APIs only. Loaded as a
// classic <script> alongside util.js/poems.js; load order is irrelevant.

// ─── Idle Companion — a little friend who appears when you're away ────────────
// Inspired by cli-spinners (https://github.com/sindresorhus/cli-spinners)
// A mini creature that shows up after inactivity — delight, not productivity
(function() {
  const _idleH = new Date().getHours();
  const IDLE_THRESHOLD = (_idleH >= 22 || _idleH < 5) ? 25000 : 45000; // 25s at night, 45s otherwise
  const IDLE_CHECK_INTERVAL = 5000; // check every 5 seconds
  
  let lastActivity = Date.now();
  let idleCompanion = null;
  let animationFrame = null;
  let frameIndex = 0;
  let currentCreature = null;
  
  // ── CREATURES ──────────────────────────────────────────────────────────────
  
  // Mini dino — shifting weight
  const DINO = {
    name: 'dino',
    interval: 400,
    frames: [
      `    ✦▀▄
   ▄██▀
  ▀▀▀▀`,
      `    ✦▀▄
   ▄██▀
   ▀▀▀`,
      `    ✦▀▄
   ▄██▀
  ▀ ▀▀`,
      `    ✦▀▄
   ▄██▀
   ▀▀▀`,
    ]
  };
  
  // Fish — swimming (inspired by cli-spinners)
  const FISH = {
    name: 'fish',
    interval: 120,
    frames: [
      `✦><(((°>`,
      ` ✦><(((°>`,
      `  ✦><(((°>`,
      `   ✦><(((°>`,
      `    ✦><(((°>`,
      `     ✦><(((°>`,
      `    ✦><(((°>`,
      `   ✦><(((°>`,
      `  ✦><(((°>`,
      ` ✦><(((°>`,
    ]
  };
  
  // Bird — hopping
  const BIRD = {
    name: 'bird',
    interval: 300,
    frames: [
      `  ✦
 (°>
 /|
 / \\`,
      `  ✦
 (°>
 /|\\
 / `,
      `  ✦
 (°>
 /|
   \\`,
      `  ✦
 (°>
 /|\\
   /`,
    ]
  };
  
  // Cat — tail swishing
  const CAT = {
    name: 'cat',
    interval: 350,
    frames: [
      ` ✦ /\\___/\\
  ( o.o )
   > ^ <~`,
      ` ✦ /\\___/\\
  ( o.o )
   > ^ <`,
      ` ✦ /\\___/\\
  ( -.- )
   > ^ <`,
      ` ✦ /\\___/\\
  ( o.o )
   > ^ <~`,
    ]
  };
  
  // Snail — slow crawl
  const SNAIL = {
    name: 'snail',
    interval: 500,
    frames: [
      `✦  @/
 _(__\\__`,
      `✦   @/
  _(__\\__`,
      `✦    @/
   _(__\\__`,
      `✦   @/
  _(__\\__`,
    ]
  };
  
  // Crab — sideways shuffle
  const CRAB = {
    name: 'crab',
    interval: 250,
    frames: [
      `✦
(\\/)  (\\/)
 \\/____\\/
  |    |`,
      ` ✦
(\\/)  (\\/)
 \\/____\\/
 |      |`,
      `  ✦
(\\/)  (\\/)
 \\/____\\/
  |    |`,
      ` ✦
(\\/)  (\\/)
 \\/____\\/
 |      |`,
    ]
  };
  
  // Star — twinkling
  const STAR = {
    name: 'star',
    interval: 200,
    frames: [
      `    ✦
   ╱|╲
  ╱ | ╲
 ───✦───
  ╲ | ╱
   ╲|╱`,
      `    ✧
   ╱|╲
  ╱ | ╲
 ───✧───
  ╲ | ╱
   ╲|╱`,
      `    ✦
   ╱|╲
  ╱ | ╲
 ───✦───
  ╲ | ╱
   ╲|╱`,
      `    ·
   ╱|╲
  ╱ | ╲
 ───·───
  ╲ | ╱
   ╲|╱`,
    ]
  };
  
  // All available creatures
  const CREATURES = [DINO, FISH, BIRD, CAT, SNAIL, CRAB, STAR];
  
  // Track user activity
  function recordActivity() {
    lastActivity = Date.now();
    hideCompanion();
  }
  
  // Pick a random creature
  function pickCreature() {
    return CREATURES[Math.floor(Math.random() * CREATURES.length)];
  }
  
  // Create and show the companion
  function showCompanion() {
    if (idleCompanion) return;
    
    // Pick a random creature each time
    currentCreature = pickCreature();
    frameIndex = 0;
    
    idleCompanion = document.createElement('div');
    idleCompanion.id = 'idleCompanion';
    idleCompanion.setAttribute('aria-hidden', 'true');
    idleCompanion.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 20px;
      font-family: var(--font-mono, 'DM Mono', monospace);
      font-size: 12px;
      line-height: 1.2;
      color: var(--accent);
      opacity: 0;
      transition: opacity 0.6s ease;
      pointer-events: none;
      white-space: pre;
      z-index: 50;
      text-shadow: 0 0 8px var(--color-accent-glow);
    `;
    document.body.appendChild(idleCompanion);
    
    // Fade in — guard against hideCompanion() racing the rAF (tab backgrounded)
    requestAnimationFrame(() => {
      if (idleCompanion) idleCompanion.style.opacity = '0.6';
    });
    
    // Start animation
    animateCompanion();
  }
  
  function animateCompanion() {
    if (!idleCompanion || !currentCreature) return;
    
    frameIndex = (frameIndex + 1) % currentCreature.frames.length;
    idleCompanion.textContent = currentCreature.frames[frameIndex];
    
    animationFrame = setTimeout(animateCompanion, currentCreature.interval);
  }
  
  function hideCompanion() {
    if (!idleCompanion) return;
    
    clearTimeout(animationFrame);
    animationFrame = null;
    currentCreature = null;
    
    idleCompanion.style.opacity = '0';
    setTimeout(() => {
      if (idleCompanion) {
        idleCompanion.remove();
        idleCompanion = null;
      }
    }, 600);
  }
  
  // Check for idle state
  function checkIdle() {
    const now = Date.now();
    const idleTime = now - lastActivity;
    
    if (idleTime > IDLE_THRESHOLD && !idleCompanion) {
      showCompanion();
    }
  }
  
  // Listen for activity events
  const activityEvents = ['click', 'touchstart', 'keydown', 'scroll', 'mousemove'];
  
  // Throttle mousemove to avoid constant resets
  let mouseMoveThrottle = null;
  function handleMouseMove() {
    if (mouseMoveThrottle) return;
    mouseMoveThrottle = setTimeout(() => {
      mouseMoveThrottle = null;
    }, 1000);
    recordActivity();
  }
  
  activityEvents.forEach(event => {
    if (event === 'mousemove') {
      document.addEventListener(event, handleMouseMove, { passive: true });
    } else {
      document.addEventListener(event, recordActivity, { passive: true });
    }
  });
  
  // Start idle checker
  setInterval(checkIdle, IDLE_CHECK_INTERVAL);
  
  // Initial activity timestamp
  recordActivity();
})();
