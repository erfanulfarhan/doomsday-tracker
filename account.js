/* =============================================================
   ROAD TO DOOMSDAY — optional accounts + cloud sync
   -------------------------------------------------------------
   Auth and storage are Supabase. Progress is one JSON row per
   user in the `progress` table, guarded by row-level security so
   a signed-in user can only ever read or write their own row.

   With no config (or no session) the tracker behaves exactly as
   before — everything lives in localStorage, no network calls.

   Signing in never destroys local ticks: on sign-in we UNION the
   local and cloud watched-sets, apply the result, and push it up.
   ============================================================= */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

(function () {
  'use strict';

  const CFG = window.SUPA || {};
  const configured =
    CFG.url && CFG.anon && !/PLACEHOLDER/.test(String(CFG.url) + String(CFG.anon));

  injectStyles();
  const ui = buildUI();

  if (!configured) {
    // Accounts aren't wired up yet — hide the control, stay local-only.
    ui.chip.hidden = true;
    return;
  }

  const sb = createClient(CFG.url, CFG.anon, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  let user = null;
  let applyingRemote = false;
  let pushTimer = null;

  // Leaderboard / circle state.
  let me = { display_name: null, group_code: null };
  let lbEl = null;
  let boardTimer = null;

  /* ---- cloud read / write ---- */

  async function pull() {
    const { data, error } = await sb
      .from('progress')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) { console.warn('pull failed', error.message); return null; }
    return data ? data.data : null;
  }

  async function push(stateData) {
    if (!user) return;
    const { error } = await sb.from('progress').upsert({
      user_id: user.id,
      data: stateData,
      watched_count: (stateData.watched || []).length,
      updated_at: new Date().toISOString(),
    });
    if (error) { console.warn('push failed', error.message); setSaved('error'); }
    else {
      setSaved('ok');
      if (me.group_code) { clearTimeout(boardTimer); boardTimer = setTimeout(renderBoard, 1500); }
    }
  }

  function schedulePush(stateData) {
    setSaved('saving');
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => push(stateData), 700);
  }

  function applyRemote(data) {
    applyingRemote = true;
    try { window.RTD.importState(data); }
    finally { applyingRemote = false; }
  }

  // Called by app.js after every local change while signed in.
  function onLocalChange(stateData) {
    if (applyingRemote) return;   // don't echo a cloud snapshot back up
    schedulePush(stateData);
  }

  /* ---- sign-in / sign-out lifecycle ---- */

  async function onSignedIn(session) {
    user = session.user;
    window.RTD.onPersist = onLocalChange;

    const local = window.RTD.exportState();
    const cloud = await pull();

    // Union watched so no tick is ever lost by signing in on a new device.
    const merged = {
      watched: Array.from(new Set([
        ...(local.watched || []),
        ...((cloud && cloud.watched) || []),
      ])),
      route: (cloud && cloud.route) || local.route,
      order: (cloud && cloud.order) || local.order,
      hide: cloud ? !!cloud.hide : !!local.hide,
    };

    applyRemote(merged);   // updates the UI + localStorage
    await push(merged);    // seed / reconcile the cloud row
    renderAuthed();
    await loadProfile();
    renderBoard();
  }

  function onSignedOut() {
    user = null;
    me = { display_name: null, group_code: null };
    window.RTD.onPersist = null;
    clearTimeout(pushTimer);
    renderAnon();
    renderBoard();
  }

  sb.auth.getSession().then(({ data }) => {
    if (data.session) onSignedIn(data.session);
    else renderAnon();
  });
  sb.auth.onAuthStateChange((event, session) => {
    // Arriving from a reset-password email: let them set a new password.
    if (event === 'PASSWORD_RECOVERY') ui.openModal('newpw');
    if (session && !user) onSignedIn(session);
    else if (!session && user) onSignedOut();
  });

  lbEl = buildBoard();
  renderBoard();

  /* ---- auth form actions ---- */

  async function doAuth(mode, email, password) {
    email = email.trim();
    if (!email || !password) return err('Enter an email and password.');
    if (password.length < 6) return err('Password must be at least 6 characters.');

    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) return err(error.message);
        if (!data.session) {
          // Email confirmation is on for this project.
          return err('Account created — check your email to confirm, then sign in.', 'ok');
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return err(error.message);
      }
      closeModal();
    } finally {
      setBusy(false);
    }
  }

  /* ---- leaderboard / circles ---- */

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function code6() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
    return s;
  }

  async function loadProfile() {
    const { data, error } = await sb.from('progress')
      .select('display_name, group_code').eq('user_id', user.id).maybeSingle();
    if (!error && data) { me.display_name = data.display_name; me.group_code = data.group_code; }
  }

  async function saveProfile(fields) {
    const row = Object.assign({ user_id: user.id, updated_at: new Date().toISOString() }, fields);
    const { error } = await sb.from('progress').upsert(row);
    if (error) { console.warn('profile save failed', error.message); return false; }
    Object.assign(me, fields);
    return true;
  }

  async function loadBoard() {
    if (!me.group_code) return [];
    const { data, error } = await sb.from('progress')
      .select('user_id, display_name, watched_count, updated_at')
      .eq('group_code', me.group_code)
      .order('watched_count', { ascending: false });
    if (error) { console.warn('board failed', error.message); return []; }
    return data || [];
  }

  function buildBoard() {
    const main = document.querySelector('main');
    const finale = document.querySelector('.finale');
    if (!main || !finale) return null;
    const sec = document.createElement('section');
    sec.className = 'lb';
    sec.innerHTML =
      '<div class="lb__head"><span class="lb__l">Circle</span>' +
      '<h2 class="lb__t">Friends &amp; family leaderboard</h2></div>' +
      '<div class="lb__body"></div>';
    main.insertBefore(sec, finale);
    return sec;
  }

  function boardErr(m) {
    const e = lbEl && lbEl.querySelector('.lb__err');
    if (e) { e.hidden = false; e.textContent = m; }
  }

  async function renderBoard() {
    if (!lbEl) return;
    const body = lbEl.querySelector('.lb__body');

    if (!user) {
      body.innerHTML = '<p class="lb__msg">Sign in (top-right) to compare your progress with friends and family.</p>';
      return;
    }

    if (!me.group_code) {
      body.innerHTML =
        '<p class="lb__msg">Start a circle and share the code, or join one you were given.</p>' +
        '<div class="lb__form">' +
          '<input class="lb__name" type="text" maxlength="24" placeholder="Your name" value="' + escapeHtml(me.display_name) + '">' +
          '<div class="lb__row">' +
            '<button class="lb__btn lb__create" type="button">Create a circle</button>' +
            '<span class="lb__or">or</span>' +
            '<input class="lb__code" type="text" maxlength="6" placeholder="CODE" autocapitalize="characters">' +
            '<button class="lb__btn lb__join" type="button">Join</button>' +
          '</div>' +
          '<p class="lb__err" hidden></p>' +
        '</div>';
      const nameOf = () => body.querySelector('.lb__name').value.trim();
      body.querySelector('.lb__create').onclick = async () => {
        if (!nameOf()) return boardErr('Enter your name first.');
        if (await saveProfile({ display_name: nameOf(), group_code: code6() })) renderBoard();
      };
      body.querySelector('.lb__join').onclick = async () => {
        const c = body.querySelector('.lb__code').value.trim().toUpperCase();
        if (!nameOf()) return boardErr('Enter your name first.');
        if (!/^[A-Z0-9]{6}$/.test(c)) return boardErr('Enter the 6-character circle code.');
        if (await saveProfile({ display_name: nameOf(), group_code: c })) renderBoard();
      };
      return;
    }

    const rows = await loadBoard();
    const total = (window.RTD && window.RTD.total) || 0;
    const items = rows.map((r, i) => {
      const mine = r.user_id === user.id ? ' is-me' : '';
      const c = r.watched_count || 0;
      const pct = total ? Math.round((c / total) * 100) : 0;
      return '<li class="lb__item' + mine + '">' +
        '<span class="lb__rank">' + (i + 1) + '</span>' +
        '<span class="lb__who">' + escapeHtml(r.display_name || 'Anonymous') + '</span>' +
        '<span class="lb__bar"><span style="width:' + pct + '%"></span></span>' +
        '<span class="lb__n">' + c + ' / ' + total + '</span></li>';
    }).join('');
    body.innerHTML =
      '<ol class="lb__list">' + (items || '<p class="lb__msg">No one here yet.</p>') + '</ol>' +
      '<div class="lb__foot"><span class="lb__share">Invite code: <strong>' + me.group_code + '</strong></span>' +
      '<button class="lb__btn lb__copy" type="button">Copy</button>' +
      '<button class="lb__btn lb__leave" type="button">Leave</button></div>';
    body.querySelector('.lb__copy').onclick = () => {
      navigator.clipboard && navigator.clipboard.writeText(me.group_code);
      body.querySelector('.lb__copy').textContent = 'Copied';
    };
    body.querySelector('.lb__leave').onclick = async () => {
      if (await saveProfile({ group_code: null })) { me.group_code = null; renderBoard(); }
    };
  }

  async function sendReset(email) {
    email = (email || '').trim();
    if (!email) return err('Enter your email.');
    setBusy(true);
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + location.pathname,
      });
      if (error) return err(error.message);
      return err("If that email has an account, a reset link is on its way. Check your inbox.", 'ok');
    } finally {
      setBusy(false);
    }
  }

  async function setNewPassword(password) {
    if (!password || password.length < 6) return err('Password must be at least 6 characters.');
    setBusy(true);
    try {
      const { error } = await sb.auth.updateUser({ password });
      if (error) return err(error.message);
      err("Password updated — you're signed in.", 'ok');
      setTimeout(closeModal, 1300);
    } finally {
      setBusy(false);
    }
  }

  /* ================= UI ================= */

  function buildUI() {
    // Account chip (fixed, top-right) — independent of the page layout.
    const chip = document.createElement('button');
    chip.className = 'acct-chip';
    chip.type = 'button';
    chip.innerHTML = '<span class="acct-chip__dot"></span><span class="acct-chip__t">Sign in</span>';
    document.body.appendChild(chip);

    // Modal
    const overlay = document.createElement('div');
    overlay.className = 'acct-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="acct-modal" role="dialog" aria-modal="true" aria-label="Account">
        <button class="acct-x" type="button" aria-label="Close">&times;</button>
        <h2 class="acct-h">Save your progress</h2>
        <p class="acct-sub">Create an account to sync your ticks across every device — phone, laptop, anywhere.</p>
        <div class="acct-tabs">
          <button class="acct-tab is-on" data-mode="signin" type="button">Sign in</button>
          <button class="acct-tab" data-mode="signup" type="button">Create account</button>
        </div>
        <form class="acct-form">
          <label class="acct-f-email">Email<input type="email" name="email" autocomplete="email"></label>
          <label class="acct-f-pass">Password<input type="password" name="password" autocomplete="current-password" minlength="6"></label>
          <p class="acct-msg" hidden></p>
          <button class="acct-go" type="submit">Sign in</button>
          <button class="acct-forgot" type="button">Forgot password?</button>
          <button class="acct-back" type="button" hidden>&larr; Back to sign in</button>
        </form>
      </div>`;
    document.body.appendChild(overlay);

    const modal = overlay.querySelector('.acct-modal');
    const form = overlay.querySelector('.acct-form');
    const msg = overlay.querySelector('.acct-msg');
    const goBtn = overlay.querySelector('.acct-go');
    const heading = overlay.querySelector('.acct-h');
    const sub = overlay.querySelector('.acct-sub');
    const tabsWrap = overlay.querySelector('.acct-tabs');
    const emailLabel = overlay.querySelector('.acct-f-email');
    const passLabel = overlay.querySelector('.acct-f-pass');
    const forgot = overlay.querySelector('.acct-forgot');
    const back = overlay.querySelector('.acct-back');
    const tabs = [...overlay.querySelectorAll('.acct-tab')];

    const SUB_DEFAULT = 'Create an account to sync your ticks across every device — phone, laptop, anywhere.';
    const MODES = {
      signin: { go: 'Sign in',         tabs: true,  email: true,  pass: true,  forgot: true,  back: false, h: 'Save your progress',   s: SUB_DEFAULT },
      signup: { go: 'Create account',  tabs: true,  email: true,  pass: true,  forgot: false, back: false, h: 'Save your progress',   s: SUB_DEFAULT },
      reset:  { go: 'Send reset link', tabs: false, email: true,  pass: false, forgot: false, back: true,  h: 'Reset your password',  s: "Enter your email and we'll send you a link to set a new one." },
      newpw:  { go: 'Update password', tabs: false, email: false, pass: true,  forgot: false, back: false, h: 'Set a new password',   s: 'Choose a new password for your account.' },
    };
    let mode = 'signin';
    let goLabel = MODES.signin.go;

    function setMode(m) {
      const c = MODES[m] || MODES.signin;
      mode = m; goLabel = c.go;
      tabs.forEach((t) => t.classList.toggle('is-on', t.dataset.mode === m));
      tabsWrap.hidden = !c.tabs;
      emailLabel.hidden = !c.email;
      passLabel.hidden = !c.pass;
      forgot.hidden = !c.forgot;
      back.hidden = !c.back;
      goBtn.textContent = c.go;
      heading.textContent = c.h;
      sub.textContent = c.s;
      form.password.autocomplete = (m === 'signup' || m === 'newpw') ? 'new-password' : 'current-password';
      form.password.placeholder = m === 'newpw' ? 'New password' : '';
      hideMsg();
    }
    tabs.forEach((t) => (t.onclick = () => setMode(t.dataset.mode)));
    forgot.onclick = () => setMode('reset');
    back.onclick = () => setMode('signin');

    chip.onclick = () => { if (user) return openMenu(); openModal(); };
    overlay.querySelector('.acct-x').onclick = closeModal;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) closeModal(); });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (mode === 'reset') return sendReset(form.email.value);
      if (mode === 'newpw') return setNewPassword(form.password.value);
      doAuth(mode, form.email.value, form.password.value);
    });

    function openModal(m) {
      setMode(m || 'signin');
      overlay.hidden = false;
      setTimeout(() => (emailLabel.hidden ? form.password : form.email).focus(), 50);
    }
    function closeModal() { overlay.hidden = true; form.reset(); setMode('signin'); }
    function showMsg(text, kind) { msg.hidden = false; msg.textContent = text; msg.className = 'acct-msg' + (kind === 'ok' ? ' is-ok' : ' is-err'); }
    function hideMsg() { msg.hidden = true; msg.textContent = ''; }

    // menu (sign out) for the signed-in chip
    const menu = document.createElement('div');
    menu.className = 'acct-menu';
    menu.hidden = true;
    menu.innerHTML = '<div class="acct-menu__email"></div><button class="acct-menu__out" type="button">Sign out</button>';
    document.body.appendChild(menu);
    menu.querySelector('.acct-menu__out').onclick = async () => { menu.hidden = true; await sb.auth.signOut(); };
    function openMenu() { menu.hidden = !menu.hidden; }
    document.addEventListener('click', (e) => {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== chip && !chip.contains(e.target)) menu.hidden = true;
    });

    return { chip, overlay, openModal, closeModal, setMode, showMsg, hideMsg, setBusy: (b) => { goBtn.disabled = b; goBtn.textContent = b ? '…' : goLabel; }, menu };
  }

  // helpers bound to the built UI
  function err(text, kind) { ui.showMsg(text, kind || 'err'); return false; }
  function setBusy(b) { ui.setBusy(b); }
  function closeModal() { ui.closeModal(); }

  function renderAnon() {
    ui.chip.classList.remove('is-authed');
    ui.chip.querySelector('.acct-chip__t').textContent = 'Sign in';
    ui.menu.hidden = true;
  }
  function renderAuthed() {
    ui.chip.classList.add('is-authed');
    const short = (user.email || 'account').split('@')[0];
    ui.chip.querySelector('.acct-chip__t').textContent = short;
    ui.menu.querySelector('.acct-menu__email').textContent = user.email || '';
  }

  function setSaved(kind) {
    // subtle colour pulse on the chip dot: saving / ok / error
    ui.chip.dataset.save = kind;
  }

  /* ================= styles ================= */

  function injectStyles() {
    const css = `
    .acct-chip{position:fixed;top:.7rem;right:.7rem;z-index:50;display:inline-flex;align-items:center;gap:.5rem;
      font:600 .82rem/1 var(--body);color:var(--type);background:var(--plate-2);border:1px solid var(--rule);
      border-radius:999px;padding:.5rem .8rem;cursor:pointer;box-shadow:var(--shadow);transition:border-color .2s,transform .1s}
    .acct-chip:hover{border-color:var(--brass)}
    .acct-chip:active{transform:translateY(1px)}
    .acct-chip__dot{width:8px;height:8px;border-radius:50%;background:var(--type-faint);transition:background .3s}
    .acct-chip.is-authed .acct-chip__dot{background:var(--green)}
    .acct-chip[data-save="saving"] .acct-chip__dot{background:var(--brass)}
    .acct-chip[data-save="ok"] .acct-chip__dot{background:var(--green)}
    .acct-chip[data-save="error"] .acct-chip__dot{background:#b4553f}
    .acct-chip__t{max-width:9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

    .acct-menu{position:fixed;top:3rem;right:.7rem;z-index:51;background:var(--plate-2);border:1px solid var(--rule);
      border-radius:12px;padding:.6rem;box-shadow:var(--shadow);min-width:12rem}
    .acct-menu__email{font:500 .78rem/1.3 var(--body);color:var(--type-dim);padding:.2rem .3rem .5rem;
      word-break:break-all;border-bottom:1px solid var(--rule-soft);margin-bottom:.5rem}
    .acct-menu__out{width:100%;font:600 .85rem/1 var(--body);color:var(--type);background:var(--plate);
      border:1px solid var(--rule);border-radius:8px;padding:.55rem;cursor:pointer}
    .acct-menu__out:hover{border-color:var(--brass);color:var(--brass)}

    .acct-overlay{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:1rem;
      background:rgba(0,0,0,.62);backdrop-filter:blur(3px)}
    .acct-modal{position:relative;width:min(24rem,100%);background:var(--plate);border:1px solid var(--rule);
      border-radius:16px;padding:1.6rem 1.4rem 1.5rem;box-shadow:var(--shadow);animation:acct-pop .2s ease}
    @keyframes acct-pop{from{opacity:0;transform:translateY(10px) scale(.98)}}
    .acct-x{position:absolute;top:.6rem;right:.8rem;background:none;border:0;color:var(--type-dim);font-size:1.5rem;
      line-height:1;cursor:pointer}
    .acct-x:hover{color:var(--type)}
    .acct-h{font:700 1.35rem/1.1 var(--body);color:var(--type);margin:0 0 .3rem}
    .acct-sub{font:400 .88rem/1.45 var(--body);color:var(--type-dim);margin:0 0 1.1rem}
    .acct-tabs{display:flex;gap:.4rem;background:var(--plate-2);border:1px solid var(--rule-soft);
      border-radius:10px;padding:.25rem;margin-bottom:1rem}
    .acct-tab{flex:1;font:600 .85rem/1 var(--body);color:var(--type-dim);background:none;border:0;border-radius:7px;
      padding:.55rem;cursor:pointer;transition:.15s}
    .acct-tab.is-on{background:var(--plate);color:var(--type);box-shadow:0 1px 3px rgba(0,0,0,.3)}
    .acct-form{display:flex;flex-direction:column;gap:.7rem}
    .acct-form label{display:flex;flex-direction:column;gap:.3rem;font:600 .78rem/1 var(--body);color:var(--type-dim)}
    .acct-form input{font:400 .95rem/1 var(--body);color:var(--type);background:var(--plate-2);
      border:1px solid var(--rule);border-radius:9px;padding:.65rem .75rem;outline:none;transition:border-color .15s}
    .acct-form input:focus{border-color:var(--brass)}
    .acct-msg{font:500 .82rem/1.4 var(--body);margin:.1rem 0 0;padding:.5rem .65rem;border-radius:8px}
    .acct-msg.is-err{color:#e69a86;background:rgba(180,85,63,.14)}
    .acct-msg.is-ok{color:var(--stamp);background:var(--brass-glow)}
    .acct-go{margin-top:.3rem;font:700 .95rem/1 var(--body);color:var(--ink);background:var(--brass);
      border:0;border-radius:10px;padding:.75rem;cursor:pointer;transition:filter .15s}
    .acct-go:hover{filter:brightness(1.08)}
    .acct-go:disabled{opacity:.6;cursor:default}
    .acct-forgot,.acct-back{align-self:center;background:none;border:0;color:var(--type-dim);
      font:500 .8rem/1 var(--body);cursor:pointer;padding:.35rem;margin-top:.15rem;
      text-decoration:underline;text-underline-offset:2px}
    .acct-forgot:hover,.acct-back:hover{color:var(--brass)}
    /* explicit display on these beats the UA [hidden] rule, so hide them by hand */
    .acct-tabs[hidden],.acct-form label[hidden],.acct-forgot[hidden],.acct-back[hidden]{display:none}
    @media(max-width:520px){.acct-chip__t{max-width:6rem}}
    `;
    const tag = document.createElement('style');
    tag.textContent = css;
    document.head.appendChild(tag);
  }
}());
