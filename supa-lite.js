/**
 * A stand-in for the few Supabase client calls account.js makes, talking to
 * the accounts Worker in api/worker.js instead. Same shapes in and out, so
 * account.js only had to change the line that creates the client.
 *
 * The password never leaves the browser: it is stretched here with PBKDF2,
 * salted with the email, and only the result is sent.
 */

const SESSION_KEY = 'rtd.session';

async function stretch(email, password) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('road-to-doomsday:' + email.trim().toLowerCase()), iterations: 150000 },
    base,
    256,
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function createClient(api) {
  api = api.replace(/\/$/, '');
  let current = null;
  const listeners = [];
  try { current = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { current = null; }

  const emit = (event) => listeners.forEach((fn) => { try { fn(event, current); } catch (e) { console.warn(e); } });
  const keep = (s) => {
    current = s;
    try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch { /* private mode */ }
  };

  async function call(method, path, body) {
    try {
      const r = await fetch(api + path, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(current ? { authorization: 'Bearer ' + current.access_token } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const out = await r.json().catch(() => ({}));
      if (r.status === 401 && current) { keep(null); emit('SIGNED_OUT'); }
      return r.ok ? { data: out, error: null } : { data: null, error: { message: out.error || 'Request failed.' } };
    } catch {
      return { data: null, error: { message: 'Could not reach the server. Check your connection.' } };
    }
  }

  // Arriving from a reset email: swap the link's token for a session, then
  // tell account.js so it can ask for the new password.
  const recovery = location.hash.match(/recovery=([0-9a-f]{64})/);
  const ready = (async () => {
    if (!recovery) return;
    history.replaceState(null, '', location.pathname + location.search);
    const { data, error } = await call('POST', '/auth/recover/verify', { token: recovery[1] });
    if (error) { alert(error.message); return; }
    keep(data.session);
    setTimeout(() => { emit('PASSWORD_RECOVERY'); emit('SIGNED_IN'); }, 0);
  })();

  const auth = {
    async getSession() {
      await ready;
      return { data: { session: current } };
    },
    onAuthStateChange(fn) {
      listeners.push(fn);
      return { data: { subscription: { unsubscribe() { listeners.splice(listeners.indexOf(fn), 1); } } } };
    },
    async signUp({ email, password }) {
      const { data, error } = await call('POST', '/auth/signup', { email, key: await stretch(email, password) });
      if (error) return { data: { session: null }, error };
      keep(data.session); emit('SIGNED_IN');
      return { data: { session: data.session, user: data.session.user }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const { data, error } = await call('POST', '/auth/signin', { email, key: await stretch(email, password) });
      if (error) return { data: null, error };
      keep(data.session); emit('SIGNED_IN');
      return { data, error: null };
    },
    async resetPasswordForEmail(email, { redirectTo } = {}) {
      return call('POST', '/auth/recover', { email, redirectTo: redirectTo || location.origin + location.pathname });
    },
    async updateUser({ password }) {
      if (!current) return { data: null, error: { message: 'Not signed in.' } };
      return call('PUT', '/auth/password', { key: await stretch(current.user.email, password) });
    },
    async signOut() {
      if (current) await call('POST', '/auth/signout');
      keep(null); emit('SIGNED_OUT');
      return { error: null };
    },
  };

  /**
   * from('progress') for the three shapes account.js uses: read your own row,
   * upsert your own row, and list a circle by group_code.
   */
  function from() {
    const q = { filter: null };
    const builder = {
      select() { return builder; },
      eq(col, val) { q.filter = [col, val]; return builder; },
      order() { return builder; },
      async maybeSingle() {
        const { data, error } = await call('GET', '/progress/me');
        return { data: data ? data.row : null, error };
      },
      async upsert(row) {
        const { user_id, updated_at, watched_count, ...fields } = row;
        const { error } = await call('PUT', '/progress/me', fields);
        return { error };
      },
      then(resolve, reject) {
        // Awaiting the builder directly: the circle list.
        const code = q.filter && q.filter[0] === 'group_code' ? q.filter[1] : null;
        return call('GET', '/progress/group/' + encodeURIComponent(code || ''))
          .then(({ data, error }) => ({ data: data ? data.rows : null, error }))
          .then(resolve, reject);
      },
    };
    return builder;
  }

  return { auth, from };
}
