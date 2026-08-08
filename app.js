/* =============================================================
   ROAD TO DOOMSDAY — tracker
   Progress lives in localStorage. No account, no server.
   ============================================================= */

(function () {
  'use strict';

  const STORE = {
    watched: 'rtd.watched',
    route: 'rtd.route',
    order: 'rtd.order',
    hide: 'rtd.hideWatched',
  };

  // Stable id order — the share code is a bitmask against this, so it must
  // never be re-sorted. New titles append; ids are never reused.
  const IDS = CATALOGUE.map((e) => e.id);
  const BY_ID = new Map(CATALOGUE.map((e) => [e.id, e]));

  const state = {
    watched: new Set(read(STORE.watched, [])),
    route: read(STORE.route, 'mcu'),
    order: read(STORE.order, 'release'),
    hide: read(STORE.hide, false),
    incoming: null, // progress from a shared link, awaiting a decision
  };

  if (!ROUTES[state.route]) state.route = 'mcu';
  if (state.order !== 'chrono') state.order = 'release';

  const $ = (sel) => document.querySelector(sel);

  const el = {
    list: $('#list'),
    route: $('#route'),
    orderToggle: $('#order-toggle'),
    hide: $('#hide-watched'),
    hint: $('#controls-hint'),
    share: $('#share'),
    reset: $('#reset'),
    pct: $('#pct'),
    tally: $('#tally'),
    remaining: $('#remaining'),
    fill: $('#gauge-fill'),
    upNext: $('#uptonext'),
    upNextText: $('#uptonext .uptonext__t'),
    toast: $('#toast'),
    finale: $('#finale'),
    finaleNote: $('#finale-note'),
    banner: $('#import-banner'),
    bannerSummary: $('#import-summary'),
    accept: $('#import-accept'),
    dismiss: $('#import-dismiss'),
  };

  /* ------------------------------------------------ storage */

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* private mode, quota — the session still works, it just won't persist */
    }
  }

  function persist() {
    write(STORE.watched, [...state.watched]);
    write(STORE.route, state.route);
    write(STORE.order, state.order);
    write(STORE.hide, state.hide);
    // Optional cloud sync (account.js) hooks in here. No-op when signed out.
    if (window.RTD && typeof window.RTD.onPersist === 'function') {
      window.RTD.onPersist(window.RTD.exportState());
    }
  }

  /* ------------------------------------------------ share codes */

  // One bit per catalogue entry, packed into bytes, then base64url.
  function encodeProgress(set) {
    const bytes = new Uint8Array(Math.ceil(IDS.length / 8));
    IDS.forEach((id, i) => {
      if (set.has(id)) bytes[i >> 3] |= 1 << (i & 7);
    });
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeProgress(code) {
    try {
      const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
      const bin = atob(b64);
      const set = new Set();
      IDS.forEach((id, i) => {
        const byte = bin.charCodeAt(i >> 3);
        if (byte && (byte >> (i & 7)) & 1) set.add(id);
      });
      return set;
    } catch (err) {
      return null;
    }
  }

  /* ------------------------------------------------ selectors */

  function routeEntries(route) {
    const paths = ROUTES[route].paths;
    return CATALOGUE.filter((e) => paths.includes(e.path));
  }

  function sorted(entries) {
    const copy = entries.slice();
    if (state.order === 'chrono') {
      copy.sort((a, b) => a.chrono - b.chrono || a.year - b.year);
    } else {
      copy.sort((a, b) => a.year - b.year || IDS.indexOf(a.id) - IDS.indexOf(b.id));
    }
    return copy;
  }

  function stats(entries, set) {
    let done = 0;
    let leftMins = 0;
    entries.forEach((e) => {
      if (set.has(e.id)) done += 1;
      else leftMins += e.mins;
    });
    return {
      done,
      total: entries.length,
      leftMins,
      pct: entries.length ? Math.round((done / entries.length) * 100) : 0,
    };
  }

  /* ------------------------------------------------ formatting */

  function hoursLabel(mins) {
    if (mins <= 0) return 'nothing left';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h >= 24) {
      const d = Math.floor(h / 24);
      return `${h}h left · about ${d} full ${d === 1 ? 'day' : 'days'}`;
    }
    if (h === 0) return `${m}m left`;
    return `${h}h ${m}m left`;
  }

  // Compact form for the share message, where the gauge's "· about N days"
  // tail reads badly mid-sentence.
  function hoursShort(mins) {
    if (mins <= 0) return 'nothing left to watch';
    const h = Math.round(mins / 60);
    return `${h}h to go`;
  }

  function runtimeLabel(entry) {
    const h = Math.floor(entry.mins / 60);
    const m = entry.mins % 60;
    const t = h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
    return entry.eps ? `${entry.eps} ep · ${t}` : t;
  }

  function kindLabel(entry) {
    if (entry.kind === 'series') return 'Series';
    if (entry.kind === 'special') return 'Special';
    return 'Film';
  }

  /* ------------------------------------------------ render */

  function render() {
    const entries = sorted(routeEntries(state.route));
    const s = stats(entries, state.watched);

    renderHeader(s, entries);
    renderControls();
    renderList(entries);
    renderFinale(s);
  }

  function renderHeader(s, entries) {
    el.pct.textContent = `${s.pct}%`;
    el.tally.textContent = `${s.done} of ${s.total} watched`;
    el.remaining.textContent = hoursLabel(s.leftMins);
    el.fill.style.width = `${s.pct}%`;

    const next = entries.find((e) => !state.watched.has(e.id));
    if (next) {
      el.upNext.hidden = false;
      el.upNextText.textContent = `${next.title} (${next.year}) — ${runtimeLabel(next)}`;
      el.upNext.dataset.target = next.id;
    } else {
      el.upNext.hidden = true;
      delete el.upNext.dataset.target;
    }
  }

  function renderControls() {
    if (!el.route.children.length) {
      Object.keys(ROUTES).forEach((key) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pill';
        b.setAttribute('role', 'radio');
        b.dataset.route = key;
        b.textContent = ROUTES[key].label;
        el.route.appendChild(b);
      });
    }
    [...el.route.children].forEach((b) => {
      b.setAttribute('aria-checked', String(b.dataset.route === state.route));
    });

    const chrono = state.order === 'chrono';
    el.orderToggle.setAttribute('aria-pressed', String(chrono));
    el.hide.setAttribute('aria-pressed', String(state.hide));

    el.hint.textContent = `${ROUTES[state.route].blurb} ${chrono
      ? 'Sorted by when it happens on the timeline — a rewatch order, and it gives away reveals.'
      : 'Release order, with the reveals intact.'}`;
  }

  function renderList(entries) {
    const frag = document.createDocumentFragment();

    if (state.order === 'chrono') {
      frag.appendChild(buildGroup(null, entries));
    } else {
      PHASES.forEach((phase) => {
        const inPhase = entries.filter((e) => e.phase === phase.key);
        if (inPhase.length) frag.appendChild(buildGroup(phase, inPhase));
      });
    }

    el.list.replaceChildren(frag);

    if (!el.list.querySelector('.row')) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = state.hide
        ? 'Everything on this route is watched. Untick “Hide watched” to see the list again.'
        : 'Nothing to show on this route.';
      el.list.replaceChildren(p);
    }
  }

  function buildGroup(phase, entries) {
    const section = document.createElement('section');
    section.className = 'phase';

    const done = entries.filter((e) => state.watched.has(e.id)).length;

    const head = document.createElement('div');
    head.className = 'phase__head';

    const h2 = document.createElement('h2');
    h2.className = 'phase__name';
    h2.textContent = phase ? phase.name : 'In-universe order';
    head.appendChild(h2);

    const sub = document.createElement('span');
    sub.className = 'phase__sub';
    sub.textContent = phase ? phase.sub : 'Approximate. Sorted by when it happens, not when it released.';
    head.appendChild(sub);

    const count = document.createElement('span');
    count.className = 'phase__count' + (done === entries.length ? ' is-done' : '');
    count.textContent = `${done}/${entries.length}`;
    head.appendChild(count);

    section.appendChild(head);

    const rows = document.createElement('div');
    rows.className = 'rows';
    entries.forEach((e) => {
      if (state.hide && state.watched.has(e.id)) return;
      rows.appendChild(buildRow(e));
    });
    section.appendChild(rows);

    return section;
  }

  // Spoiler notes stay gated until asked for. Revealed ids persist across
  // re-renders (kept in memory only — a fresh visit re-hides them).
  const revealed = new Set();

  function buildRow(entry) {
    const watched = state.watched.has(entry.id);

    const row = document.createElement('div');
    row.className = 'row' + (watched ? ' is-watched' : '');
    row.id = `e-${entry.id}`;

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'row__box';
    box.checked = watched;
    box.id = `c-${entry.id}`;
    box.dataset.id = entry.id;
    box.setAttribute('aria-label', `Mark ${entry.title} as watched`);
    row.appendChild(box);

    const main = document.createElement('div');
    main.className = 'row__main';

    const label = document.createElement('label');
    label.className = 'row__title';
    label.htmlFor = box.id;
    label.textContent = entry.title;
    main.appendChild(label);

    const meta = document.createElement('div');
    meta.className = 'row__meta';
    meta.appendChild(text('span', String(entry.year)));
    meta.appendChild(text('span', kindLabel(entry)));
    if (entry.path === 'core') meta.appendChild(tag('Essential', 'tag--core'));
    if (entry.earth && entry.earth !== '616') {
      meta.appendChild(tag(entry.earth === 'multi' ? 'Multiverse' : `Earth-${entry.earth}`, 'tag--earth'));
    }
    if (entry.upcoming) meta.appendChild(tag('Not out yet', 'tag--soon'));
    main.appendChild(meta);

    if (entry.note) {
      const shown = revealed.has(entry.id);

      const spoiler = document.createElement('div');
      spoiler.className = 'spoiler';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'spoiler__btn';
      btn.dataset.id = entry.id;
      btn.setAttribute('aria-expanded', String(shown));
      btn.textContent = 'How it ties in';
      btn.hidden = shown;

      const note = document.createElement('p');
      note.className = 'row__note spoiler__text';
      note.textContent = entry.note;
      note.hidden = !shown;

      spoiler.appendChild(btn);
      spoiler.appendChild(note);
      main.appendChild(spoiler);
    }

    row.appendChild(main);

    const time = document.createElement('span');
    time.className = 'row__time';
    time.textContent = runtimeLabel(entry);
    row.appendChild(time);

    return row;
  }

  function text(tagName, content) {
    const n = document.createElement(tagName);
    n.textContent = content;
    return n;
  }

  function tag(content, cls) {
    const n = document.createElement('span');
    n.className = `tag ${cls}`;
    n.textContent = content;
    return n;
  }

  function renderFinale(s) {
    const ready = s.total > 0 && s.done === s.total;
    el.finale.classList.toggle('is-ready', ready);
    el.finaleNote.textContent = ready
      ? 'Route complete. There is nothing left between you and the theatre.'
      : `${s.total - s.done} to go on this route. Finish the list and this is all that's left.`;
  }

  /* ------------------------------------------------ countdown */

  const target = new Date(RELEASE.date).getTime();

  function tickClock() {
    const diff = target - Date.now();
    const out = document.querySelectorAll('[data-cd]');

    if (diff <= 0) {
      out.forEach((n) => { n.textContent = '0'; });
      return;
    }

    const secs = Math.floor(diff / 1000);
    const values = {
      days: Math.floor(secs / 86400),
      hours: Math.floor((secs % 86400) / 3600),
      mins: Math.floor((secs % 3600) / 60),
      secs: secs % 60,
    };
    out.forEach((n) => {
      const v = values[n.dataset.cd];
      n.textContent = n.dataset.cd === 'days' ? String(v) : String(v).padStart(2, '0');
    });
  }

  /* ------------------------------------------------ actions */

  let toastTimer;
  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('is-up');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('is-up'), 2600);
  }

  function toggle(id, on) {
    if (!BY_ID.has(id)) return;
    if (on) state.watched.add(id);
    else state.watched.delete(id);
    persist();
    render();
  }

  function shareLink() {
    const base = location.origin + location.pathname;
    const code = encodeProgress(state.watched);
    return `${base}#s=${code}&r=${state.route}`;
  }

  async function doShare() {
    const s = stats(routeEntries(state.route), state.watched);
    const url = shareLink();
    const message = `${s.pct}% ready for ${RELEASE.title} — ${s.done} of ${s.total} watched, ${hoursShort(s.leftMins)}.`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Road to Doomsday', text: message, url });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${message}\n${url}`);
      toast('Link copied');
    } catch (err) {
      prompt('Copy your progress link:', url);
    }
  }

  function doReset() {
    if (!state.watched.size) { toast('Nothing to reset'); return; }
    if (!confirm('Clear every tick on this device? This cannot be undone.')) return;
    state.watched.clear();
    persist();
    render();
    toast('Progress cleared');
  }

  /* ------------------------------------------------ shared link intake */

  function readHash() {
    const hash = location.hash.replace(/^#/, '');
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const code = params.get('s');
    const route = params.get('r');

    if (route && ROUTES[route]) {
      state.route = route;
      write(STORE.route, route);
    }
    if (!code) return;

    const set = decodeProgress(code);
    if (!set) return;

    // Nothing of their own to protect — just adopt it.
    if (!state.watched.size) {
      state.watched = set;
      persist();
      clearHash();
      return;
    }
    state.incoming = set;
  }

  // Drop the share code once it has been dealt with, so a reload doesn't
  // re-offer progress the visitor already accepted or declined.
  function clearHash() {
    history.replaceState(null, '', location.pathname + location.search);
  }

  function renderBanner() {
    if (!state.incoming) return;
    const s = stats(routeEntries(state.route), state.incoming);
    el.bannerSummary.textContent = `Progress at ${s.pct}% (${s.done}/${s.total})`;
    el.banner.hidden = false;
  }

  /* ------------------------------------------------ wiring */

  el.list.addEventListener('change', (ev) => {
    const box = ev.target.closest('.row__box');
    if (box) toggle(box.dataset.id, box.checked);
  });

  el.list.addEventListener('click', (ev) => {
    const b = ev.target.closest('.spoiler__btn');
    if (!b) return;
    ev.preventDefault();
    // Two-step: first tap arms a warning, second tap reveals.
    if (b.dataset.armed !== '1') {
      b.dataset.armed = '1';
      b.classList.add('is-armed');
      b.textContent = 'Spoilers ahead — tap to reveal';
      return;
    }
    revealed.add(b.dataset.id);
    b.setAttribute('aria-expanded', 'true');
    b.hidden = true;
    const note = b.parentNode.querySelector('.spoiler__text');
    note.hidden = false;
    note.classList.add('is-revealing');
  });

  el.route.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-route]');
    if (!b) return;
    state.route = b.dataset.route;
    persist();
    render();
  });

  el.orderToggle.addEventListener('click', () => {
    state.order = state.order === 'chrono' ? 'release' : 'chrono';
    persist();
    render();
  });

  el.hide.addEventListener('click', () => {
    state.hide = !state.hide;
    persist();
    render();
  });

  el.share.addEventListener('click', doShare);
  el.reset.addEventListener('click', doReset);

  el.upNext.addEventListener('click', () => {
    const id = el.upNext.dataset.target;
    if (!id) return;
    const row = document.getElementById(`e-${id}`);
    if (!row) return;
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row.classList.remove('is-target');
    void row.offsetWidth; // restart the flag animation
    row.classList.add('is-target');
  });

  el.accept.addEventListener('click', () => {
    if (!state.incoming) return;
    state.watched = state.incoming;
    state.incoming = null;
    el.banner.hidden = true;
    persist();
    render();
    clearHash();
    toast('Progress imported');
  });

  el.dismiss.addEventListener('click', () => {
    state.incoming = null;
    el.banner.hidden = true;
    clearHash();
  });

  /* ------------------------------------------------ cloud bridge */

  // A tiny surface so account.js (Supabase sync) can read/replace the whole
  // of the user's progress without reaching into internals. onPersist is set
  // by account.js while signed in, and left null otherwise.
  window.RTD = {
    exportState() {
      return {
        watched: [...state.watched],
        route: state.route,
        order: state.order,
        hide: state.hide,
      };
    },
    importState(data) {
      if (!data) return;
      if (Array.isArray(data.watched)) {
        state.watched = new Set(data.watched.filter((id) => BY_ID.has(id)));
      }
      if (data.route && ROUTES[data.route]) state.route = data.route;
      state.order = data.order === 'chrono' ? 'chrono' : 'release';
      state.hide = !!data.hide;
      persist();
      render();
    },
    onPersist: null,
  };

  /* ------------------------------------------------ boot */

  readHash();

  document.getElementById('release-date').textContent = RELEASE.dateLabel;
  document.getElementById('finale-date').textContent = RELEASE.dateLabel;
  document.querySelector('.finale__t').textContent = RELEASE.title;
  document.title = `Road to Doomsday — ${RELEASE.title} watch tracker`;

  render();
  renderBanner();
  tickClock();
  setInterval(tickClock, 1000);

  // The old offline service worker was serving stale copies of the site, so
  // it's retired: actively unregister any previously-installed worker and wipe
  // its caches so every visit loads the latest build straight from the network.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
  }
}());
