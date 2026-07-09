// TODAY — celebration (ember drift + accent glow flash) (Roadmap #3 module extraction)
//
// Self-contained: canvas APIs + COLOR_ACCENT/COLOR_MUTED (from assets/util.js).
// Loaded as a classic <script> after util.js; top-level globals (_flashAccentGlow,
// window.fireEmberDrift) are visible everywhere via the shared lexical environment.
// Depends on: #celebCanvas in HTML, COLOR_ACCENT + COLOR_MUTED from util.js.

// ── Accent glow flash — subtle visual reward for "all done" moment ──
function _flashAccentGlow() {
  const existing = document.getElementById('accentGlowOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'accentGlowOverlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    background: radial-gradient(ellipse at center, var(--accent) 0%, transparent 70%);
    opacity: 0;
    animation: accentGlowPulse 1.2s ease-out forwards;
  `;
  document.body.appendChild(overlay);

  if (!document.getElementById('accentGlowStyles')) {
    const style = document.createElement('style');
    style.id = 'accentGlowStyles';
    style.textContent = `
      @keyframes accentGlowPulse {
        0% { opacity: 0; transform: scale(0.8); }
        15% { opacity: 0.15; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.2); }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => overlay.remove(), 1300);
}

// ── Ember drift — particle burst on task/habit completion ──
(function() {
  const celebCanvas = document.getElementById('celebCanvas');
  const celebCtx    = celebCanvas.getContext('2d');
  let celebParticles = [];
  let celebFrame     = null;
  const CHARS = '01∆◊×+−░▒·~⌁⊕⊗'.split('');
  const CELEB_MAX_PARTICLES = 60;
  const isMobileDevice = window.matchMedia('(hover: none)').matches;

  function resizeCeleb() {
    celebCanvas.width  = window.innerWidth;
    celebCanvas.height = window.innerHeight;
  }
  resizeCeleb();
  window.addEventListener('resize', resizeCeleb);

  let celebFrameCount = 0;
  const CELEB_MAX_FRAMES = 300; // 5s at 60fps — hard stop
  function celebAnimate() {
    celebCtx.clearRect(0, 0, celebCanvas.width, celebCanvas.height);
    celebParticles = celebParticles.filter(p => p.life > 0);
    celebParticles.forEach(p => { p.update(); p.draw(celebCtx); });
    celebFrameCount++;
    if (celebParticles.length > 0 && celebFrameCount < CELEB_MAX_FRAMES) {
      celebFrame = requestAnimationFrame(celebAnimate);
    } else {
      cancelAnimationFrame(celebFrame);
      celebFrame = null;
      celebFrameCount = 0;
      celebCtx.clearRect(0, 0, celebCanvas.width, celebCanvas.height);
    }
  }
  function celebStart() { if (!celebFrame) celebFrame = requestAnimationFrame(celebAnimate); }

  function spawnFragment(fx, fy, fvx, fvy, char, size, depth) {
    if (celebParticles.length >= CELEB_MAX_PARTICLES) return;
    const trail = [];
    celebParticles.push({
      x: fx, y: fy,
      vx: fvx + (Math.random()-0.5)*1.5,
      vy: fvy + (Math.random()-0.5)*1.5,
      char, size, depth,
      color: depth === 0 ? COLOR_ACCENT : (Math.random() > 0.5 ? COLOR_ACCENT + 'bb' : COLOR_MUTED),
      rot: (Math.random()-0.5)*0.4, charAngle: 0,
      life: 0.8 + Math.random()*0.5, maxLife: 1.3,
      trail, trailTimer: 0, fragmented: false,
      update() {
        this.x += this.vx; this.y += this.vy;
        this.vx *= 0.95; this.vy = this.vy * 0.95 + 0.03;
        this.charAngle += this.rot;
        this.life -= 0.022;
        this.trailTimer++;
        if (this.trailTimer % 2 === 0) {
          this.trail.push({ x: this.x, y: this.y });
          if (this.trail.length > 8) this.trail.shift();
        }
        if (!isMobileDevice && !this.fragmented && depth < 2 && this.life < this.maxLife * 0.5) {
          this.fragmented = true;
          const frags = 2 + Math.floor(Math.random()*2);
          for (let f = 0; f < frags; f++) {
            spawnFragment(
              this.x, this.y,
              this.vx * 0.6 + (Math.random()-0.5)*2,
              this.vy * 0.6 + (Math.random()-0.5)*2,
              CHARS[Math.floor(Math.random()*CHARS.length)],
              this.size * 0.6, depth + 1
            );
          }
        }
      },
      draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        if (!isMobileDevice) {
          this.trail.forEach((tp, ti) => {
            const ta = (ti / this.trail.length) * alpha * 0.4;
            const tr = (ti / this.trail.length) * this.size * 0.8;
            const g  = ctx.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, tr);
            g.addColorStop(0, COLOR_ACCENT + Math.round(ta*120).toString(16).padStart(2,'0'));
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(tp.x, tp.y, tr, 0, Math.PI*2); ctx.fill();
          });
        }
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y); ctx.rotate(this.charAngle);
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size}px 'DM Mono', monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.char, 0, 0);
        ctx.restore(); ctx.globalAlpha = 1;
      }
    });
  }

  window.fireEmberDrift = function(cx, cy) {
    const count = 14;
    celebParticles.push({
      x: cx, y: cy, r: 2, life: 1, maxLife: 1,
      update() { this.r += 3; this.life -= 0.08; },
      draw(ctx) {
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
        g.addColorStop(0, COLOR_ACCENT + Math.round(Math.max(0,this.life)*180).toString(16).padStart(2,'0'));
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI*2); ctx.fill();
      }
    });
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI*2 + (Math.random()-0.5)*0.3;
      const speed = 2.5 + Math.random()*4;
      spawnFragment(
        cx, cy,
        Math.cos(angle)*speed, Math.sin(angle)*speed,
        CHARS[Math.floor(Math.random()*CHARS.length)],
        11 + Math.random()*6, 0
      );
    }
    celebStart();
  };
})();
