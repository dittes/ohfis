import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('coverage map references only tools that exist and TOOLS_COVERAGE.md is up to date', () => {
  const before = readFileSync(new URL('../TOOLS_COVERAGE.md', import.meta.url), 'utf8');
  const r = spawnSync('node', ['build/coverage.mjs'], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(new URL('../TOOLS_COVERAGE.md', import.meta.url), 'utf8'), before, 'run `node build/coverage.mjs` and commit TOOLS_COVERAGE.md');
});
test('every utility tool has all four language names and an explanation', async () => {
  const tools = (await import('../build/tools/index.mjs')).default;
  for (const t of tools) { assert.equal(t.names.length, 4, t.id); assert.equal(t.shorts.length, 4, t.id); assert.ok(t.about?.length >= 2, `${t.id}: about`); assert.ok(t.steps?.length >= 3, `${t.id}: steps`); assert.ok(t.faqs?.length >= 2, `${t.id}: faqs`); assert.ok(t.title && t.title.length <= 110, `${t.id}: title length ${t.title?.length}`); for (const n of [...t.names, ...t.shorts]) assert.ok(n && n.length > 3, `${t.id}: empty name`); }
});
test('related ids point at tools that exist', async () => {
  const tools = (await import('../build/tools/index.mjs')).default; const pdf = (await import('../build/registry.mjs')).TOOLS; const ids = new Set([...tools.map(t => t.id), ...pdf.map(t => t.id)]);
  const bad = []; for (const t of tools) for (const r of t.related || []) if (!ids.has(r)) bad.push(`${t.id} → ${r}`); assert.deepEqual(bad, []);
});
