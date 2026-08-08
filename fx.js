/* =============================================================
   ROAD TO DOOMSDAY — FX layer (Marvel energy field)
   -------------------------------------------------------------
   An Infinity-Stone coloured particle field: nodes drift and
   link up, a glowing energy orb follows the pointer (nodes near
   it brighten and are pulled in), and a click fires a shockwave
   burst. Renders in both themes; calm + static under reduced
   motion. Purely visual — never touches tracker state.
   ============================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var A = window.anime || null;

  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function isDark() {
    var f = document.documentElement.getAttribute('data-theme');
    if (f === 'dark') return true;
    if (f === 'light') return false;
    return !(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
  }

  // Infinity-Stone palette, weighted toward Marvel red + gold.
  var STONES = ['#ff3b3b', '#ffd23b', '#a24bff', '#38b6ff', '#46e07a', '#ff8a3b'];
  function pick() {
    var r = Math.random();
    if (r < 0.42) return '#ff3b3b';   // reality red (Marvel brand)
    if (r < 0.64) return '#ffd23b';   // mind gold
    return STONES[2 + Math.floor(Math.random() * 4)];
  }

  function field() {
    var c = document.createElement('canvas');
    c.id = 'fx-stars';
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    var ctx = c.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pts = [], sparks = [], rings = [];
    var W = 0, H = 0, LINK = 0, RADIUS = 0;
    var mouse = { x: null, y: null };
    var dark = isDark();

    function seed() {
      W = c.width = Math.floor(innerWidth * dpr);
      H = c.height = Math.floor(innerHeight * dpr);
      c.style.width = innerWidth + 'px';
      c.style.height = innerHeight + 'px';
      LINK = Math.min(150, innerWidth / 9) * dpr;
      RADIUS = 210 * dpr;
      var n = Math.max(32, Math.min(78, Math.round((innerWidth * innerHeight) / 18000)));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3 * dpr,
          vy: (Math.random() - 0.5) * 0.3 * dpr,
          r: (Math.random() * 1.3 + 0.9) * dpr,
          col: pick(),
          tw: Math.random() * Math.PI * 2,
        });
      }
    }

    function burst(x, y) {
      rings.push({ x: x, y: y, r: 6 * dpr, life: 1 });
      var k = 22;
      for (var i = 0; i < k; i++) {
        var a = (i / k) * Math.PI * 2 + Math.random() * 0.3;
        var sp = (Math.random() * 2.6 + 1.4) * dpr;
        sparks.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: (Math.random() * 1.6 + 1) * dpr, col: pick(), life: 1 });
      }
      // shove nearby field nodes outward
      for (var j = 0; j < pts.length; j++) {
        var p = pts[j], dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
        if (d < RADIUS) { var f = (1 - d / RADIUS) * 3 * dpr; p.vx += (dx / d) * f; p.vy += (dy / d) * f; }
      }
    }

    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      var i, j, a, b, dx, dy, d;

      // energy orb at the pointer
      if (mouse.x != null) {
        var g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, RADIUS * 0.42);
        var pulse = 0.5 + 0.5 * Math.sin(t * 0.004);
        g.addColorStop(0, 'rgba(255,90,60,' + (dark ? 0.5 : 0.35) * (0.7 + 0.3 * pulse) + ')');
        g.addColorStop(0.4, 'rgba(255,180,60,' + (dark ? 0.18 : 0.14) + ')');
        g.addColorStop(1, 'rgba(255,120,60,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(mouse.x, mouse.y, RADIUS * 0.42, 0, Math.PI * 2); ctx.fill();
      }

      // nodes
      for (i = 0; i < pts.length; i++) {
        a = pts[i];
        if (!reduce) {
          a.x += a.vx; a.y += a.vy;
          a.vx *= 0.995; a.vy *= 0.995;                    // settle after a shove
          a.vx += (Math.random() - 0.5) * 0.01 * dpr;      // tiny drift
          if (a.x < 0 || a.x > W) a.vx *= -1;
          if (a.y < 0 || a.y > H) a.vy *= -1;
        }
        var near = 0;
        if (mouse.x != null) {
          dx = a.x - mouse.x; dy = a.y - mouse.y; d = Math.hypot(dx, dy);
          if (d < RADIUS) {
            near = 1 - d / RADIUS;
            if (!reduce) { a.vx -= (dx / (d || 1)) * near * 0.06 * dpr; a.vy -= (dy / (d || 1)) * near * 0.06 * dpr; } // pull in
            ctx.strokeStyle = a.col; ctx.globalAlpha = 0.15 + near * 0.6; ctx.lineWidth = dpr * (0.6 + near);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
        var tw = 0.6 + 0.4 * Math.sin(t * 0.003 + a.tw);
        ctx.fillStyle = a.col;
        ctx.globalAlpha = (dark ? 0.85 : 0.9) * (0.55 + 0.45 * tw) + near * 0.4;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r * (1 + near * 1.6), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // links between nodes
      for (i = 0; i < pts.length; i++) {
        a = pts[i];
        for (j = i + 1; j < pts.length; j++) {
          b = pts[j]; dx = a.x - b.x; dy = a.y - b.y; d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx.strokeStyle = dark ? 'rgba(180,150,150,' + ((1 - d / LINK) * 0.4).toFixed(3) + ')'
                                   : 'rgba(120,60,60,' + ((1 - d / LINK) * 0.5).toFixed(3) + ')';
            ctx.lineWidth = dpr * 0.6;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }

      // click rings
      for (i = rings.length - 1; i >= 0; i--) {
        var rg = rings[i]; rg.r += 6 * dpr; rg.life -= 0.02;
        if (rg.life <= 0) { rings.splice(i, 1); continue; }
        ctx.strokeStyle = 'rgba(255,90,60,' + (rg.life * 0.6).toFixed(3) + ')';
        ctx.lineWidth = dpr * 2;
        ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2); ctx.stroke();
      }

      // click sparks
      for (i = sparks.length - 1; i >= 0; i--) {
        var s = sparks[i]; s.x += s.vx; s.y += s.vy; s.vx *= 0.96; s.vy *= 0.96; s.life -= 0.022;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.fillStyle = s.col; ctx.globalAlpha = s.life;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.globalCompositeOperation = 'source-over';
      if (!reduce || sparks.length || rings.length) requestAnimationFrame(frame);
    }

    seed();
    addEventListener('resize', debounce(seed, 200));
    addEventListener('pointermove', function (e) { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; });
    addEventListener('pointerdown', function (e) { burst(e.clientX * dpr, e.clientY * dpr); });
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').addEventListener &&
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { dark = isDark(); });
    requestAnimationFrame(frame);
  }

  /* hero entrance (anime.js) */
  function hero() {
    if (reduce || !A) return;
    A({ targets: '.countdown .unit', translateY: [16, 0], opacity: [0, 1], duration: 700,
        delay: A.stagger(90, { start: 150 }), easing: 'easeOutCubic' });
    A({ targets: '.wordmark__title', translateY: [12, 0], opacity: [0, 1], duration: 800, easing: 'easeOutQuint' });
    A({ targets: '.wordmark__pre, .wordmark__date', opacity: [0, 1], duration: 900, delay: 250, easing: 'easeOutQuad' });
    var fill = document.getElementById('gauge-fill');
    if (fill) {
      var target = fill.style.width || '0%';
      fill.style.width = '0%';
      A({ targets: fill, width: target, duration: 1200, delay: 500, easing: 'easeInOutCubic' });
    }
  }

  try { field(); } catch (e) {}
  try { hero(); } catch (e) {}
}());
