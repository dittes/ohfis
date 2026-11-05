import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/js/tools/lib/team.js';
const seeded = seed => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

test('shuffle keeps every element and does not touch the input', () => { const a = [1, 2, 3, 4, 5]; const s = T.shuffle(a, seeded(1)); assert.deepEqual([...s].sort(), a); assert.deepEqual(a, [1, 2, 3, 4, 5]); });
test('parsePeople reads optional skill levels', () => assert.deepEqual(T.parsePeople('Ann: 5\nBen\nCleo, 2,5'), [{ name: 'Ann', level: 5 }, { name: 'Ben', level: null }, { name: 'Cleo', level: 2.5 }]));
test('makeTeams: count and size modes are balanced', () => {
  const ppl = T.parsePeople('A\nB\nC\nD\nE\nF\nG'); const t = T.makeTeams(ppl, { mode: 'count', n: 3, rng: seeded(2) });
  assert.deepEqual(t.map(x => x.length).sort(), [2, 2, 3]); assert.equal(t.flat().length, 7);
  const t2 = T.makeTeams(ppl, { mode: 'size', n: 3, rng: seeded(3) }); assert.equal(t2.length, 3);
});
test('makeTeams: skill levels are balanced with a snake draft', () => {
  const ppl = T.parsePeople('A:5\nB:5\nC:1\nD:1'); const t = T.makeTeams(ppl, { n: 2, rng: seeded(4) });
  for (const team of t) assert.equal(team.reduce((s, p) => s + p.level, 0), 6);
});
test('makeTeams: pairs that should be apart are separated when possible', () => {
  for (let s = 1; s < 30; s++) { const t = T.makeTeams(T.parsePeople('A\nB\nC\nD'), { n: 2, rng: seeded(s), apart: [['A', 'B']] }); assert.ok(!t.some(x => x.some(p => p.name === 'A') && x.some(p => p.name === 'B')), `seed ${s}`); }
});
test('pokerStats: consensus, median and spread', () => {
  const s = T.pokerStats(['3', '5', '5', '8']); assert.equal(s.median, 5); assert.deepEqual(s.mode, ['5']); assert.equal(s.spread, 5); assert.ok(!s.consensus);
  assert.ok(T.pokerStats(['5', '5']).consensus); const q = T.pokerStats(['?', '3', '☕']); assert.equal(q.unsure, 1); assert.equal(q.pause, 1); assert.equal(q.mean, 3);
});
test('RACI: exactly one A and at least one R per task', () => {
  const { roles, rows } = T.parseRaci('Task;Ann;Ben;Cleo\nPlan;A;R;C\nBuild;;R;\nShip;A;A;R\nTest;A/R;;');
  assert.deepEqual(roles, ['Ann', 'Ben', 'Cleo']);
  const issues = T.raciCheck(rows); assert.deepEqual(issues.map(i => `${i.task}:${i.kind}`), ['Build:noA', 'Ship:manyA']);
});
test('agenda computes start and end times and the total', () => {
  const a = T.agenda('Welcome; 5\nStatus - 20\nDecisions | 25 min', '09:30'); assert.deepEqual(a.rows.map(r => r.start), ['09:30', '09:35', '09:55']); assert.equal(a.end, '10:20'); assert.equal(a.total, 50);
  assert.throws(() => T.agenda('x; 5', 'nine'), /start time/);
});
test('rotation cycles through people and skips absences', () => {
  const r = T.rotation(['Ann', 'Ben', 'Cleo'], '2026-01-05', { count: 4 }); assert.deepEqual(r.map(x => x.who), ['Ann', 'Ben', 'Cleo', 'Ann']); assert.equal(r[1].from, '2026-01-12'); assert.equal(r[1].to, '2026-01-18');
  const s = T.rotation(['Ann', 'Ben', 'Cleo'], '2026-01-05', { count: 3, skip: [{ person: 'Ben', from: '2026-01-12', to: '2026-01-18' }] }); assert.deepEqual(s.map(x => x.who), ['Ann', 'Cleo', 'Ann']);
});
test('impact/effort and Eisenhower quadrants', () => {
  const q = T.impactEffort('Search; 5; 2\nRedesign; 5; 5\nTypo; 1; 1\nRewrite; 2; 5'); assert.equal(q.quick[0].name, 'Search'); assert.equal(q.big[0].name, 'Redesign'); assert.equal(q.fill[0].name, 'Typo'); assert.equal(q.pit[0].name, 'Rewrite');
  assert.throws(() => T.impactEffort('Search; high; 2'), /Search/);
  const e = T.eisenhower('Bug; yes; yes\nPlan; no; yes\nEmail; yes; no\nScroll; no; no'); assert.deepEqual([e.do, e.plan, e.delegate, e.drop], [['Bug'], ['Plan'], ['Email'], ['Scroll']]);
});
