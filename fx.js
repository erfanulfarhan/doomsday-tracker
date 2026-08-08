/* =============================================================
   ROAD TO DOOMSDAY — cinematic FX layer
   -------------------------------------------------------------
   A drifting starfield, anime.js entrance/scroll animations, and
   a stylized character roster. Purely visual — it never touches
   tracker state or storage. Degrades to a calm static backdrop
   when the visitor prefers reduced motion or anime.js is missing.
   ============================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var A = window.anime || null;

  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  /* ---------------------------------------- starfield */
  function starfield() {
    var c = document.createElement('canvas');
    c.id = 'fx-stars';
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    var ctx = c.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var stars = [], W = 0, H = 0;

    function seed() {
      W = c.width = Math.floor(innerWidth * dpr);
      H = c.height = Math.floor(innerHeight * dpr);
      c.style.width = innerWidth + 'px';
      c.style.height = innerHeight + 'px';
      var n = Math.max(60, Math.round((innerWidth * innerHeight) / 9000));
      stars = [];
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H,
          r: (Math.random() * 1.2 + 0.3) * dpr,
          a: Math.random() * 0.6 + 0.2,
          tw: Math.random() * 0.02 + 0.004,
          ph: Math.random() * Math.PI * 2,
          vy: (Math.random() * 0.12 + 0.02) * dpr,
          hue: Math.random() < 0.12 ? '200,160,70' : '210,220,235', // a few embers of brass
        });
      }
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var alpha = reduce ? s.a : s.a * (0.6 + 0.4 * Math.sin(t * s.tw + s.ph));
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + s.hue + ',' + alpha.toFixed(3) + ')';
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (!reduce) { s.y += s.vy; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } }
      }
      if (!reduce) requestAnimationFrame(draw);
    }

    seed();
    addEventListener('resize', debounce(seed, 200));
    if (reduce) draw(0); else requestAnimationFrame(draw);
  }

  /* ---------------------------------------- hero entrance */
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

  /* ---------------------------------------- character roster (stylized) */
  var ROSTER = [
    { m: 'DD', name: 'Doctor Doom', role: 'The threat at the end of the road', c1: '#2f6d4a', c2: '#0e2c1e' },
    { m: 'IM', name: 'Iron Man', role: 'Where the whole saga began', c1: '#c0392b', c2: '#b8860b' },
    { m: 'CA', name: 'Captain America', role: 'The shield, the sentinel', c1: '#2b5fa6', c2: '#8a1f2b' },
    { m: 'TH', name: 'Thor', role: 'God of thunder, king of Asgard', c1: '#4a7fb5', c2: '#c8993c' },
    { m: 'HK', name: 'Hulk', role: 'The strongest there is', c1: '#3b7a3b', c2: '#1f3320' },
    { m: 'DS', name: 'Doctor Strange', role: 'Keeper of the multiverse’s rules', c1: '#2f8f8f', c2: '#b8860b' },
    { m: 'SW', name: 'Scarlet Witch', role: 'Chaos magic, reality unwritten', c1: '#9b2b3a', c2: '#2a0d12' },
    { m: 'LK', name: 'Loki', role: 'Guardian of the timelines', c1: '#2f7d54', c2: '#c8993c' },
    { m: 'SM', name: 'Spider-Man', role: 'The kid who keeps showing up', c1: '#b53030', c2: '#22345f' },
    { m: 'BP', name: 'Black Panther', role: 'Protector of Wakanda', c1: '#5b3fa6', c2: '#141019' },
  ];

  function roster() {
    var finale = document.querySelector('.finale');
    if (!finale) return;

    var sec = document.createElement('section');
    sec.className = 'roster';
    sec.innerHTML =
      '<div class="roster__head">' +
        '<span class="roster__l">The roster</span>' +
        '<h2 class="roster__t">Who the road runs through</h2>' +
        '<p class="roster__d">The names the multiverse keeps circling back to. Stylized marks — no studio artwork.</p>' +
      '</div><div class="roster__grid"></div>';
    var grid = sec.querySelector('.roster__grid');

    ROSTER.forEach(function (r) {
      var card = document.createElement('article');
      card.className = 'hero-card';
      card.style.setProperty('--c1', r.c1);
      card.style.setProperty('--c2', r.c2);
      card.innerHTML =
        '<span class="hero-card__disc" aria-hidden="true"><span>' + r.m + '</span></span>' +
        '<h3 class="hero-card__name">' + r.name + '</h3>' +
        '<p class="hero-card__role">' + r.role + '</p>';
      grid.appendChild(card);
    });

    finale.parentNode.insertBefore(sec, finale.nextSibling);

    var cards = [].slice.call(grid.children);
    if (reduce || !A) { cards.forEach(function (el) { el.style.opacity = 1; }); return; }
    cards.forEach(function (el) { el.style.opacity = 0; });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var i = cards.indexOf(e.target);
        A({ targets: e.target, opacity: [0, 1], translateY: [24, 0], scale: [0.96, 1],
            duration: 650, delay: (i % 5) * 70, easing: 'easeOutCubic' });
      });
    }, { threshold: 0.2 });
    cards.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------- boot (each guarded) */
  try { starfield(); } catch (e) {}
  try { hero(); } catch (e) {}
  try { roster(); } catch (e) {}
}());
