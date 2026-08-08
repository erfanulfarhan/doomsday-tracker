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

  // Original stroke emblems (viewBox 0 0 100 100). Symbolic, not logos:
  // idle = continuous CSS motion ('spin' | 'pulse' | '').
  var EMBLEMS = {
    'Doctor Doom':     { idle: '',      svg: '<path d="M28 26 H72 V54 C72 72 50 82 50 82 C50 82 28 72 28 54 Z"/><path d="M40 46 H46"/><path d="M54 46 H60"/>' },
    'Iron Man':        { idle: 'pulse', svg: '<circle cx="50" cy="50" r="30"/><circle cx="50" cy="50" r="15"/><path d="M50 35 L63 57 H37 Z"/>' },
    'Captain America': { idle: '',      svg: '<circle cx="50" cy="50" r="32"/><path d="M50 26 L57 44 L76 44 L61 56 L67 74 L50 63 L33 74 L39 56 L24 44 L43 44 Z"/>' },
    'Thor':            { idle: '',      svg: '<rect x="30" y="26" width="40" height="20" rx="3"/><path d="M50 46 V80"/><path d="M62 8 L53 27 L61 25 L51 45"/>' },
    'Hulk':            { idle: '',      svg: '<circle cx="50" cy="50" r="9"/><path d="M50 41 V22"/><path d="M50 59 V78"/><path d="M41 50 H22"/><path d="M59 50 H78"/><path d="M43 43 L30 30"/><path d="M57 43 L70 30"/><path d="M43 57 L30 70"/><path d="M57 57 L70 70"/>' },
    'Doctor Strange':  { idle: 'spin',  svg: '<circle cx="50" cy="50" r="30"/><circle cx="50" cy="50" r="17"/><circle cx="50" cy="50" r="5"/><path d="M50 33 V20"/><path d="M50 67 V80"/><path d="M33 50 H20"/><path d="M67 50 H80"/>' },
    'Scarlet Witch':   { idle: 'spin',  svg: '<path d="M50 22 C76 22 78 52 50 52 C30 52 30 74 50 78"/><path d="M50 52 C62 52 64 66 50 68"/>' },
    'Loki':            { idle: '',      svg: '<path d="M42 72 C31 52 31 32 24 20 C41 27 45 46 50 62"/><path d="M58 72 C69 52 69 32 76 20 C59 27 55 46 50 62"/>' },
    'Spider-Man':      { idle: 'spin',  svg: '<path d="M50 20 V80"/><path d="M20 50 H80"/><path d="M29 29 L71 71"/><path d="M71 29 L29 71"/><path d="M50 33 A21 21 0 0 1 67 50"/><path d="M50 33 A21 21 0 0 0 33 50"/>' },
    'Black Panther':   { idle: '',      svg: '<path d="M35 22 C41 44 43 60 41 80"/><path d="M50 20 C54 44 54 60 50 82"/><path d="M65 22 C59 44 57 60 59 80"/>' },
  };

  function drawIn(svg, start) {
    if (!svg || !A) return;
    var shapes = svg.querySelectorAll('path, line, circle, rect, polygon, polyline');
    A({ targets: shapes, strokeDashoffset: [A.setDashoffset, 0],
        duration: 850, delay: A.stagger(70, { start: start }), easing: 'easeInOutSine' });
  }

  var COLOR = {};
  ROSTER.forEach(function (r) { COLOR[r.name] = { c1: r.c1, c2: r.c2 }; });

  /* ---------------------------------------- hero "stage": orbiting characters */
  function orbiters(ring, names, rFrac) {
    var N = names.length;
    names.forEach(function (name, i) {
      var ang = (i / N) * 2 * Math.PI - Math.PI / 2;
      var em = EMBLEMS[name] || { svg: '' };
      var col = COLOR[name] || { c1: '#888', c2: '#333' };
      var o = document.createElement('div');
      o.className = 'orbiter';
      o.style.left = (50 + rFrac * 100 * Math.cos(ang)) + '%';
      o.style.top = (50 + rFrac * 100 * Math.sin(ang)) + '%';
      o.innerHTML = '<span class="orbiter__disc" style="--c1:' + col.c1 + ';--c2:' + col.c2 + '">' +
        '<svg viewBox="0 0 100 100">' + em.svg + '</svg></span>';
      ring.appendChild(o);
    });
  }

  function stage() {
    var main = document.querySelector('main');
    if (!main) return;
    var sec = document.createElement('section');
    sec.className = 'stage';
    sec.setAttribute('aria-hidden', 'true');
    sec.innerHTML =
      '<div class="stage__aura"></div>' +
      '<div class="stage__orbit">' +
        '<div class="stage__core"></div>' +
        '<div class="orbit orbit--outer"></div>' +
        '<div class="orbit orbit--inner"></div>' +
      '</div>' +
      '<div class="stage__cap">' +
        '<p class="stage__l">The multiverse is collapsing</p>' +
        '<h2 class="stage__t">Assemble before Doomsday</h2>' +
      '</div>';
    main.insertBefore(sec, main.firstChild);

    var names = Object.keys(EMBLEMS);
    orbiters(sec.querySelector('.orbit--outer'), names.slice(0, 6), 0.46);
    orbiters(sec.querySelector('.orbit--inner'), names.slice(6).concat(names.slice(0, 1)), 0.24);
  }

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
      var em = EMBLEMS[r.name] || { idle: '', svg: '<span>' + r.m + '</span>' };
      card.innerHTML =
        '<span class="hero-card__disc ' + em.idle + '" aria-hidden="true"><svg viewBox="0 0 100 100">' + em.svg + '</svg></span>' +
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
        var d = (i % 5) * 70;
        A({ targets: e.target, opacity: [0, 1], translateY: [24, 0], scale: [0.96, 1],
            duration: 650, delay: d, easing: 'easeOutCubic' });
        drawIn(e.target.querySelector('svg'), d + 150);
      });
    }, { threshold: 0.2 });
    cards.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------- boot (each guarded) */
  try { starfield(); } catch (e) {}
  try { hero(); } catch (e) {}
  try { roster(); } catch (e) {}
}());
