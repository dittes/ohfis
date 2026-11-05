// team.js — pure logic for the team and meeting tools (no DOM). Unit-tested in tests/team.test.mjs.

/** Fisher–Yates shuffle with an injectable random source (rng() → [0,1)). Returns a new array. */
export function shuffle(list, rng = Math.random) { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/** Parse "Name" or "Name: 3" (skill 1–5) lines. */
export function parsePeople(text) { return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => { const m = /^(.*?)\s*[:;,]\s*(\d+(?:[.,]\d+)?)\s*$/.exec(l); return m ? { name: m[1], level: Number(m[2].replace(',', '.')) } : { name: l, level: null }; }); }

/**
 * Split people into teams. mode "count": n teams; mode "size": teams of about n people.
 * With skill levels, people are dealt in a snake draft (strongest first) so teams are balanced; otherwise at random.
 * "apart" is a list of [nameA, nameB] pairs that should not share a team when avoidable.
 */
export function makeTeams(people, { mode = 'count', n = 2, rng = Math.random, apart = [] } = {}) {
  const count = Math.max(1, mode === 'size' ? Math.ceil(people.length / Math.max(1, n)) : Math.min(n, people.length || 1));
  const teams = Array.from({ length: count }, () => []);
  const leveled = people.some(p => p.level != null);
  let order = shuffle(people, rng);
  if (leveled) order = order.sort((a, b) => (b.level ?? 0) - (a.level ?? 0));
  const clash = (team, p) => apart.some(([a, b]) => (team.some(q => q.name === a) && p.name === b) || (team.some(q => q.name === b) && p.name === a));
  order.forEach((p, i) => {
    let k = leveled ? ((Math.floor(i / count) % 2) ? count - 1 - (i % count) : i % count) : i % count;
    if (clash(teams[k], p)) { const alt = teams.map((t, j) => j).filter(j => !clash(teams[j], p)).sort((x, y) => teams[x].length - teams[y].length)[0]; if (alt != null) k = alt; }
    teams[k].push(p);
  });
  return teams;
}

export const DECKS = { fibonacci: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '?', '☕'], tshirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'], powers: ['0', '1', '2', '4', '8', '16', '32', '?', '☕'] };

/** Summarise planning-poker votes (strings). Numeric cards give mean, median and spread; "?" and "☕" are counted but not averaged. */
export function pokerStats(votes) {
  const nums = votes.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  const counts = {}; for (const v of votes) counts[v] = (counts[v] || 0) + 1;
  const top = Math.max(0, ...Object.values(counts));
  const mode = Object.keys(counts).filter(k => counts[k] === top);
  const mean = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  const median = nums.length ? (nums.length % 2 ? nums[(nums.length - 1) / 2] : (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2) : null;
  return { counts, mode, mean, median, min: nums[0] ?? null, max: nums.at(-1) ?? null, consensus: votes.length > 0 && Object.keys(counts).length === 1, spread: nums.length ? nums.at(-1) - nums[0] : 0, unsure: (counts['?'] || 0), pause: (counts['☕'] || 0) };
}

/** RACI check. cells: rows of role letters per task, e.g. { task: 'Plan', roles: { Ann: 'A', Ben: 'R', Cleo: 'C' } }. */
export function raciCheck(rows) {
  const issues = [];
  for (const r of rows) {
    const v = Object.values(r.roles).map(x => (x || '').toUpperCase());
    const a = v.filter(x => x.includes('A')).length, rr = v.filter(x => x.includes('R')).length;
    if (a === 0) issues.push({ task: r.task, kind: 'noA' }); else if (a > 1) issues.push({ task: r.task, kind: 'manyA' });
    if (rr === 0 && !v.some(x => x.includes('A') && x.includes('R'))) issues.push({ task: r.task, kind: 'noR' });
  }
  return issues;
}
/** Parse "Task; Role1=R; Role2=A" lines or a matrix pasted as CSV with a header row of roles. */
export function parseRaci(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean); if (!lines.length) return { roles: [], rows: [] };
  const split = l => l.split(/\t|;|,/).map(x => x.trim());
  const head = split(lines[0]); const roles = head.slice(1);
  return { roles, rows: lines.slice(1).map(l => { const c = split(l); return { task: c[0], roles: Object.fromEntries(roles.map((r, i) => [r, (c[i + 1] || '').toUpperCase().replace(/[^RACI/]/g, '')])) }; }) };
}

const pad = n => String(n).padStart(2, '0');
export const toHM = m => `${pad(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${pad(((m % 60) + 60) % 60)}`;
export const fromHM = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim()); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
/** Agenda items "Title; minutes" (or "Title - 10") → start/end times from a start time. Returns rows, end time and total minutes. */
export function agenda(text, startHM = '09:00') {
  const start = fromHM(startHM); if (!Number.isFinite(start)) throw new Error('Enter a start time like 09:30.');
  let t = start; const rows = [];
  for (const l of text.split(/\r?\n/).map(x => x.trim()).filter(Boolean)) {
    const m = /^(.*?)\s*(?:[;|]|\s-\s|\t)\s*(\d+)\s*(?:min|m)?\s*$/i.exec(l) || [null, l, '5'];
    const minutes = Number(m[2]); rows.push({ title: m[1].trim(), minutes, start: toHM(t), end: toHM(t + minutes) }); t += minutes;
  }
  return { rows, end: toHM(t), total: t - start };
}

/** Rotation: who is on duty in each period. Returns [{ from: ISO date, to: ISO date, who }]. */
export function rotation(people, startISO, { period = 'week', count = 12, skip = [] } = {}) {
  if (!people.length) return []; const days = period === 'day' ? 1 : period === 'fortnight' ? 14 : 7; const out = [];
  const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
  let i = 0, turn = 0;
  while (out.length < count && turn < count * people.length * 2) { const who = people[i % people.length]; i++; turn++; const from = addDays(startISO, out.length * days); if (skip.some(s => s.person === who && s.from <= addDays(from, days - 1) && s.to >= from)) continue; out.push({ from, to: addDays(from, days - 1), who }); }
  return out;
}

/** Sort items "Name; impact 1-5; effort 1-5" into quick wins, big bets, fill-ins and money pits. */
export function impactEffort(text) {
  const items = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => { const p = l.split(';').map(x => x.trim()); const impact = Number(p[1]), effort = Number(p[2]); return { name: p[0], impact, effort }; });
  const bad = items.find(i => !Number.isFinite(i.impact) || !Number.isFinite(i.effort)); if (bad) throw new Error(`Check the line "${bad.name}": use "name; impact; effort" with numbers from 1 to 5.`);
  const q = { quick: [], big: [], fill: [], pit: [] };
  for (const i of items) { const hi = i.impact >= 3, lo = i.effort <= 3; (hi && lo ? q.quick : hi ? q.big : lo ? q.fill : q.pit).push(i); }
  for (const k in q) q[k].sort((a, b) => b.impact - b.effort - (a.impact - a.effort));
  return q;
}
/** Eisenhower: items "Name; urgent y/n; important y/n". */
export function eisenhower(text) {
  const yes = v => /^(y|yes|j|ja|t|tak|a|ano|1|true|x)/i.test((v || '').trim());
  const q = { do: [], plan: [], delegate: [], drop: [] };
  for (const l of text.split(/\r?\n/).map(x => x.trim()).filter(Boolean)) { const p = l.split(';'); const u = yes(p[1]), i = yes(p[2]); (u && i ? q.do : i ? q.plan : u ? q.delegate : q.drop).push(p[0].trim()); }
  return q;
}
