/* Catalogue sanity check:  node check.mjs  */

import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('./data.js', import.meta.url), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + ';({RELEASE,PHASES,CATALOGUE,ROUTES})', ctx);
const { RELEASE, PHASES, CATALOGUE, ROUTES } = vm.runInContext(
  '({RELEASE,PHASES,CATALOGUE,ROUTES})', ctx);

const problems = [];
const phaseKeys = new Set(PHASES.map((p) => p.key));
const routePaths = new Set(Object.values(ROUTES).flatMap((r) => r.paths));
const seen = new Set();

for (const e of CATALOGUE) {
  const where = e.id || e.title;
  if (!e.id) problems.push(`missing id: ${e.title}`);
  if (seen.has(e.id)) problems.push(`duplicate id: ${e.id}`);
  seen.add(e.id);
  if (!/^[a-z0-9-]+$/.test(e.id || '')) problems.push(`id not a slug: ${e.id}`);
  if (!phaseKeys.has(e.phase)) problems.push(`unknown phase "${e.phase}" on ${where}`);
  if (!routePaths.has(e.path)) problems.push(`path "${e.path}" on ${where} is in no route`);
  if (!Number.isFinite(e.mins) || e.mins <= 0) problems.push(`bad runtime on ${where}`);
  if (!Number.isFinite(e.chrono)) problems.push(`missing chrono on ${where}`);
  if (!Number.isFinite(e.year)) problems.push(`missing year on ${where}`);
  if (!['film', 'series', 'special'].includes(e.kind)) problems.push(`bad kind on ${where}`);
  if (e.kind === 'series' && !e.eps) problems.push(`series without episode count: ${where}`);
}

if (Number.isNaN(new Date(RELEASE.date).getTime())) problems.push('RELEASE.date unparseable');

// Report
const total = CATALOGUE.reduce((n, e) => n + e.mins, 0);
console.log(`entries      ${CATALOGUE.length}`);
console.log(`total runtime ${Math.round(total / 60)}h across all routes`);
for (const [key, r] of Object.entries(ROUTES)) {
  const items = CATALOGUE.filter((e) => r.paths.includes(e.path));
  const mins = items.reduce((n, e) => n + e.mins, 0);
  console.log(`  ${key.padEnd(10)} ${String(items.length).padStart(3)} titles  ${String(Math.round(mins / 60)).padStart(3)}h`);
}

if (problems.length) {
  console.error('\nFAIL');
  problems.forEach((p) => console.error('  - ' + p));
  process.exit(1);
}
console.log('\nOK');
