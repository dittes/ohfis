import test from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../assets/js/tools/lib/bizdocs.js';

test('every language has all labels of the same shape', () => {
  const keys = Object.keys(B.L.en).sort(); for (const l of B.LANGS) { assert.deepEqual(Object.keys(B.L[l]).sort(), keys, l); }
});
test('VAT split: gross → net + VAT with rounding that adds up', () => {
  assert.deepEqual(B.splitVat(119, 19), { net: 100, vat: 19, gross: 119 }); assert.deepEqual(B.splitVat(100, 0), { net: 100, vat: 0, gross: 100 }); const s = B.splitVat(9.99, 7); assert.equal(Math.round((s.net + s.vat) * 100), 999); assert.equal(s.net, 9.34);
});
test('date helpers', () => {
  assert.equal(B.addDaysISO('2025-02-20', 14), '2025-03-06'); assert.equal(B.addDaysISO('2024-12-25', 10), '2025-01-04');
  assert.equal(B.fmtDate('2025-03-06', 'de'), '6. März 2025'); assert.equal(B.fmtDate('2025-03-06', 'en'), '6 March 2025'); assert.equal(B.fmtDate('oops', 'en'), 'oops');
});
