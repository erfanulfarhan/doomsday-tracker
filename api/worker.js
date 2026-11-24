/**
 * Accounts for Road to Doomsday, on a Cloudflare Worker and KV.
 *
 * Replaces the Supabase project, which the free plan paused and would not
 * resume while two other free projects were active. The browser talks to it
 * through supa-lite.js, which keeps the handful of Supabase calls account.js
 * makes, so the page itself barely changed.
 *
 * Passwords never arrive here. The browser stretches each one with PBKDF2
 * (150,000 rounds, salted with the email) and sends only the result; this
 * stores a salted SHA-256 of that. A stolen copy of the store still costs an
 * attacker the full PBKDF2 per guess, and a Worker on the free plan, held to
 * 10 ms of CPU a request, never has to do the slow part itself.
 *
 * KV layout:
 *   user:<email>      { id, email, salt, hash, created }
 *   uid:<id>          email
 *   sess:<token>      user id, 30 days
 *   recover:<token>   user id, 1 hour
 *   prog:<id>         { data, display_name, group_code, watched_count, updated_at }
 *   group:<code>      [user ids]
 */

const SESSION_TTL = 60 * 60 * 24 * 30;
const RECOVER_TTL = 60 * 60;
const SENDER = { name: 'Road to Doomsday', email: 'doomsday@erfanul.me' };

const json = (body, status = 200, cors = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors } });

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const token = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const sha = async (s) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

/** Constant-time comparison, so a wrong guess takes as long as a near miss. */
function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i += 1) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const validEmail = (e) => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const validKey = (k) => typeof k === 'string' && /^[0-9a-f]{64}$/.test(k);
const validCode = (c) => c === null || (typeof c === 'string' && /^[A-Z0-9]{6}$/.test(c));

async function session(env, userId, email) {
  const t = token();
  await env.KV.put(`sess:${t}`, userId, { expirationTtl: SESSION_TTL });
  return { access_token: t, user: { id: userId, email } };
}

async function whoami(env, request) {
  const auth = request.headers.get('authorization') || '';
  const t = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!/^[0-9a-f]{64}$/.test(t)) return null;
  const id = await env.KV.get(`sess:${t}`);
  if (!id) return null;
  const email = await env.KV.get(`uid:${id}`);
  return email ? { id, email, token: t } : null;
}

async function setGroup(env, userId, from, to) {
  if (from === to) return;
  if (from) {
    const list = JSON.parse((await env.KV.get(`group:${from}`)) || '[]').filter((x) => x !== userId);
    if (list.length) await env.KV.put(`group:${from}`, JSON.stringify(list));
    else await env.KV.delete(`group:${from}`);
  }
  if (to) {
    const list = JSON.parse((await env.KV.get(`group:${to}`)) || '[]');
    if (!list.includes(userId)) list.push(userId);
    await env.KV.put(`group:${to}`, JSON.stringify(list));
  }
}

async function sendRecovery(env, email, link) {
  if (!env.BREVO_API_KEY) return false;
  const text = `Someone asked to reset the password for your Road to Doomsday account.\n\nSet a new one here (the link works for one hour):\n${link}\n\nIf it was not you, ignore this email and nothing changes.`;
  const html = `<p>Someone asked to reset the password for your Road to Doomsday account.</p><p><a href="${link}">Set a new password</a>. The link works for one hour.</p><p>If it was not you, ignore this email and nothing changes.</p>`;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: SENDER, to: [{ email }], subject: 'Reset your Road to Doomsday password', textContent: text, htmlContent: html }),
  });
  if (!r.ok) console.warn('brevo', r.status, await r.text());
  return r.ok;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
    const cors = {
      'access-control-allow-origin': allowed.includes(origin) ? origin : allowed[0] || '*',
      'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type',
      vary: 'origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const path = url.pathname;
    const body = request.method === 'POST' || request.method === 'PUT' ? await request.json().catch(() => ({})) : {};
    const reply = (b, s) => json(b, s, cors);

    try {
      if (path === '/auth/signup' && request.method === 'POST') {
        const email = String(body.email || '').trim().toLowerCase();
        if (!validEmail(email) || !validKey(body.key)) return reply({ error: 'Enter a valid email and password.' }, 400);
        if (await env.KV.get(`user:${email}`)) return reply({ error: 'An account with this email already exists. Sign in instead.' }, 409);
        const id = crypto.randomUUID();
        const salt = token();
        await env.KV.put(`user:${email}`, JSON.stringify({ id, email, salt, hash: await sha(salt + body.key), created: Date.now() }));
        await env.KV.put(`uid:${id}`, email);
        return reply({ session: await session(env, id, email) });
      }

      if (path === '/auth/signin' && request.method === 'POST') {
        const email = String(body.email || '').trim().toLowerCase();
        const rec = JSON.parse((await env.KV.get(`user:${email}`)) || 'null');
        if (!rec || !validKey(body.key) || !same(await sha(rec.salt + body.key), rec.hash)) {
          return reply({ error: 'Invalid email or password.' }, 400);
        }
        return reply({ session: await session(env, rec.id, rec.email) });
      }

      if (path === '/auth/recover' && request.method === 'POST') {
        const email = String(body.email || '').trim().toLowerCase();
        const back = String(body.redirectTo || '');
        // Same answer whether or not the account exists, so the form cannot
        // be used to find out who has one.
        const rec = validEmail(email) && JSON.parse((await env.KV.get(`user:${email}`)) || 'null');
        if (rec && allowed.some((o) => o && back.startsWith(o))) {
          const t = token();
          await env.KV.put(`recover:${t}`, rec.id, { expirationTtl: RECOVER_TTL });
          await sendRecovery(env, email, `${back}#recovery=${t}`);
        }
        return reply({ ok: true });
      }

      if (path === '/auth/recover/verify' && request.method === 'POST') {
        const t = String(body.token || '');
        const id = /^[0-9a-f]{64}$/.test(t) && (await env.KV.get(`recover:${t}`));
        if (!id) return reply({ error: 'This reset link has expired or was already used. Ask for a new one.' }, 400);
        await env.KV.delete(`recover:${t}`);
        return reply({ session: await session(env, id, await env.KV.get(`uid:${id}`)) });
      }

      const me = await whoami(env, request);
      if (!me) return reply({ error: 'Not signed in.' }, 401);

      if (path === '/auth/user' && request.method === 'GET') return reply({ user: { id: me.id, email: me.email } });

      if (path === '/auth/signout' && request.method === 'POST') {
        await env.KV.delete(`sess:${me.token}`);
        return reply({ ok: true });
      }

      if (path === '/auth/password' && request.method === 'PUT') {
        if (!validKey(body.key)) return reply({ error: 'Choose a password of at least 6 characters.' }, 400);
        const rec = JSON.parse(await env.KV.get(`user:${me.email}`));
        rec.salt = token();
        rec.hash = await sha(rec.salt + body.key);
        await env.KV.put(`user:${me.email}`, JSON.stringify(rec));
        return reply({ user: { id: me.id, email: me.email } });
      }

      if (path === '/progress/me' && request.method === 'GET') {
        return reply({ row: JSON.parse((await env.KV.get(`prog:${me.id}`)) || 'null') });
      }

      if (path === '/progress/me' && request.method === 'PUT') {
        const prev = JSON.parse((await env.KV.get(`prog:${me.id}`)) || '{}');
        const next = { ...prev, updated_at: new Date().toISOString() };
        if ('data' in body) {
          if (JSON.stringify(body.data).length > 64 * 1024) return reply({ error: 'Too large.' }, 413);
          next.data = body.data;
          next.watched_count = Array.isArray(body.data?.watched) ? body.data.watched.length : 0;
        }
        if ('display_name' in body) next.display_name = body.display_name === null ? null : String(body.display_name).slice(0, 24);
        if ('group_code' in body) {
          if (!validCode(body.group_code)) return reply({ error: 'Circle codes are 6 letters or digits.' }, 400);
          await setGroup(env, me.id, prev.group_code || null, body.group_code);
          next.group_code = body.group_code;
        }
        await env.KV.put(`prog:${me.id}`, JSON.stringify(next));
        return reply({ row: next });
      }

      const group = path.match(/^\/progress\/group\/([A-Z0-9]{6})$/);
      if (group && request.method === 'GET') {
        const ids = JSON.parse((await env.KV.get(`group:${group[1]}`)) || '[]');
        const rows = await Promise.all(
          ids.map(async (id) => {
            const p = JSON.parse((await env.KV.get(`prog:${id}`)) || 'null');
            return p && p.group_code === group[1]
              ? { user_id: id, display_name: p.display_name || null, watched_count: p.watched_count || 0, updated_at: p.updated_at }
              : null;
          }),
        );
        return reply({ rows: rows.filter(Boolean).sort((a, b) => b.watched_count - a.watched_count) });
      }

      return reply({ error: 'Not found.' }, 404);
    } catch (e) {
      console.error(e);
      return reply({ error: 'Something went wrong. Try again.' }, 500);
    }
  },
};
