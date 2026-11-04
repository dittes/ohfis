import test from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../assets/js/tools/lib/bizdocs.js';

test('every language has all labels and reminder texts of the same shape', () => {
  const keys = Object.keys(B.L.en).sort(); for (const l of B.LANGS) { assert.deepEqual(Object.keys(B.L[l]).sort(), keys, l); assert.equal(B.REMINDER[l].length, 3); assert.ok(B.GREETING[l] && B.CLOSING[l]); for (const t of B.REMINDER[l]) for (const v of ['{invoice}', '{amount}', '{due}', '{deadline}']) assert.ok(t.includes(v), `${l} misses ${v}`); }
});
test('VAT split: gross → net + VAT with rounding that adds up', () => {
  assert.deepEqual(B.splitVat(119, 19), { net: 100, vat: 19, gross: 119 }); assert.deepEqual(B.splitVat(100, 0), { net: 100, vat: 0, gross: 100 }); const s = B.splitVat(9.99, 7); assert.equal(Math.round((s.net + s.vat) * 100), 999); assert.equal(s.net, 9.34);
});
test('late interest and date helpers', () => {
  assert.equal(B.lateInterest(1000, 9, 73), 18); assert.equal(B.lateInterest(1000, 9, -5), 0); assert.equal(B.lateInterest(0, 9, 30), 0);
  assert.equal(B.daysBetween('2025-01-01', '2025-03-01'), 59); assert.equal(B.addDaysISO('2025-02-20', 14), '2025-03-06'); assert.equal(B.addDaysISO('2024-12-25', 10), '2025-01-04');
  assert.equal(B.fmtDate('2025-03-06', 'de'), '6. März 2025'); assert.equal(B.fmtDate('2025-03-06', 'en'), '6 March 2025'); assert.equal(B.fmtDate('oops', 'en'), 'oops');
});
test('template filling keeps unknown placeholders', () => assert.equal(B.fillTemplate('Pay {amount} by {deadline} {x}', { amount: '10 €', deadline: '1 May' }), 'Pay 10 € by 1 May {x}'));
