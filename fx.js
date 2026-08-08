/* =============================================================
   ROAD TO DOOMSDAY — FX layer
   -------------------------------------------------------------
   An interactive particle web (a drifting constellation whose
   nodes link to each other and to your pointer) plus the hero
   entrance animation. Dark-mode only for the web (it reuses the
   #fx-stars hide rule); calm and static under reduced-motion.
   Purely visual — never touches tracker state or storage.
   ============================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var A = window.anime || null;

  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  /* ---------------------------------------- interactive particle web */
  function web() {
    var c = document.createElement('canvas');
    c.id = 'fx-stars'; // reuse the dark-mode-only hide CSS
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    var ctx = c.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pts = [], W = 0, H = 0, LINK = 0, MLINK = 0;
    var mouse = { x: null, y: null };

    function seed() {
      W = c.width = Math.floor(innerWidth * dpr);
      H = c.height = Math.floor(innerHeight * dpr);
      c.style.width = innerWidth + 'px';
      c.style.height = innerHeight + 'px';
      LINK = Math.min(150, innerWidth / 9) * dpr;
      MLINK = 175 * dpr;
      var n = Math.max(36, Math.min(90, Math.round((innerWidth * innerHeight) / 16000)));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.28 * dpr,
          vy: (Math.random() - 0.5) * 0.28 * dpr,
          r: (Math.random() * 1.1 + 0.6) * dpr,
          brass: Math.random() < 0.18,
        });
      }
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      var i, j, a, b, dx, dy, d;

      for (i = 0; i < pts.length; i++) {
        a = pts[i];
        if (!reduce) {
          a.x += a.vx; a.y += a.vy;
          if (a.x < 0 || a.x > W) a.vx *= -1;
          if (a.y < 0 || a.y > H) a.vy *= -1;
        }
        ctx.beginPath();
        ctx.fillStyle = a.brass ? 'rgba(200,160,80,.9)' : 'rgba(210,220,235,.7)';
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (i = 0; i < pts.length; i++) {
        a = pts[i];
        for (j = i + 1; j < pts.length; j++) {
          b = pts[j]; dx = a.x - b.x; dy = a.y - b.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx.strokeStyle = 'rgba(150,160,180,' + ((1 - d / LINK) * 0.5).toFixed(3) + ')';
            ctx.lineWidth = dpr * 0.6;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        if (mouse.x != null) {
          dx = a.x - mouse.x; dy = a.y - mouse.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < MLINK) {
            ctx.strokeStyle = 'rgba(200,153,60,' + ((1 - d / MLINK) * 0.7).toFixed(3) + ')';
            ctx.lineWidth = dpr * 0.85;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
            if (!reduce) { a.vx += (mouse.x - a.x) * 0.00002; a.vy += (mouse.y - a.y) * 0.00002; }
          }
        }
      }

      if (!reduce) requestAnimationFrame(frame);
    }

    seed();
    addEventListener('resize', debounce(seed, 200));
    addEventListener('mousemove', function (e) { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; });
    addEventListener('mouseout', function () { mouse.x = mouse.y = null; });
    addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) { mouse.x = t.clientX * dpr; mouse.y = t.clientY * dpr; } }, { passive: true });
    addEventListener('touchend', function () { mouse.x = mouse.y = null; });
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------- hero entrance (anime.js) */
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

  try { web(); } catch (e) {}
  try { hero(); } catch (e) {}
}());
