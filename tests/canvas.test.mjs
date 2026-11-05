import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../assets/js/tools/lib/canvas.js';

test('every canvas has unique sections that fit the grid without overlapping', () => {
  for (const [id, spec] of Object.entries(C.BOARDS)) {
    const [cols, rows] = spec.grid; const used = new Set();
    for (const s of spec.sections) { const [c, r, cs, rs] = s.at; assert.ok(c >= 1 && r >= 1 && c + cs - 1 <= cols && r + rs - 1 <= rows, `${id}/${s.key} inside grid`); for (let i = c; i < c + cs; i++) for (let j = r; j < r + rs; j++) { assert.ok(!used.has(`${i},${j}`), `${id}/${s.key} overlaps`); used.add(`${i},${j}`); } }
    assert.equal(new Set(spec.sections.map(s => s.key)).size, spec.sections.length, id); assert.ok(C.CREDITS[spec.credit], id);
    for (const k of Object.keys(spec.sample)) assert.ok(spec.sections.some(s => s.key === k), `${id} sample key ${k}`);
  }
});
test('the business model canvas and the lean canvas have nine blocks, the Eisenhower matrix four', () => {
  assert.equal(C.BOARDS['business-model-canvas'].sections.length, 9); assert.equal(C.BOARDS['lean-canvas'].sections.length, 9); assert.equal(C.BOARDS['eisenhower-matrix-board'].sections.length, 4); assert.equal(C.BOARDS['porters-five-forces-board'].sections.length, 5);
});
test('sampleBoard fills the sections with notes', () => { const b = C.sampleBoard('lean-canvas'); assert.ok(b.notes.length >= 9); assert.ok(b.notes.every(n => C.BOARDS['lean-canvas'].sections.some(s => s.key === n.sec) && n.id)); });
test('parseBoard keeps valid notes and rejects other files', () => {
  const ok = C.parseBoard('lean-canvas', JSON.stringify({ title: 'T', notes: [{ id: 'a', sec: 'problem', text: 'x', color: '#fff3a3' }, { sec: 'nope', text: 'y' }, { sec: 'uvp', text: 3 }, { sec: 'uvp', text: 'z', color: 'red' }] }));
  assert.equal(ok.title, 'T'); assert.deepEqual(ok.notes.map(n => n.text), ['x', 'z']); assert.equal(ok.notes[1].color, C.COLORS[0]);
  assert.throws(() => C.parseBoard('lean-canvas', 'hello'), /not a saved board/); assert.throws(() => C.parseBoard('lean-canvas', '{}'), /not a saved board/);
});
test('toMarkdown lists notes per section', () => {
  const md = C.toMarkdown('eisenhower-matrix-board', { title: 'Week 3', notes: [C.newNote('do', 'Call\nclient'), C.newNote('drop', '  ')] });
  assert.ok(md.startsWith('# Week 3\n\n## Do first\n- Call client\n\n## Schedule\n-')); assert.ok(md.includes('## Drop\n-\n'));
});
test('placeNotes stays inside the rectangle and does not overlap', () => {
  const notes = Array.from({ length: 12 }, (_, i) => C.newNote('a', `n${i}`)); const rect = { x: 10, y: 20, w: 400, h: 260 }; const p = C.placeNotes(rect, notes);
  assert.equal(p.length, 12);
  for (const a of p) { assert.ok(a.x >= rect.x && a.y >= rect.y && a.x + a.w <= rect.x + rect.w && a.y + a.h <= rect.y + rect.h, 'inside'); }
  for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) { const a = p[i], b = p[j]; assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, 'no overlap'); }
  assert.deepEqual(C.placeNotes(rect, []), []);
});
