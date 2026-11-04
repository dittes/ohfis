import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../assets/js/tools/lib/docs.js';

test('booklet order for 8 pages', () => {
  assert.deepEqual(D.bookletOrder(8), [[7, 0], [1, 6], [5, 2], [3, 4]]);
});
test('booklet pads to a multiple of 4 with blanks', () => {
  const o = D.bookletOrder(5); assert.equal(o.length, 4);
  assert.deepEqual(o[0], [null, 0]); assert.deepEqual(o[1], [1, null]); assert.deepEqual(o[2], [null, 2]); assert.deepEqual(o[3], [3, 4]);
  const used = o.flat().filter(x => x !== null).sort(); assert.deepEqual(used, [0, 1, 2, 3, 4]);
});
test('every page appears exactly once for many sizes', () => {
  for (let n = 1; n <= 37; n++) { const used = D.bookletOrder(n).flat().filter(x => x !== null).sort((a, b) => a - b); assert.deepEqual(used, [...Array(n).keys()]); }
});
test('nup cells', () => {
  const c = D.nupCells(200, 100, 2, 1, 10, 10); assert.equal(c.length, 2);
  assert.equal(c[0].w, 85); assert.equal(c[1].x, 105); assert.equal(c[0].y, 10); assert.equal(c[0].h, 80);
  const c2 = D.nupCells(100, 200, 1, 2, 0, 0); assert.equal(c2[0].y, 100); assert.equal(c2[1].y, 0);
});
test('fitInto centres and scales', () => {
  const f = D.fitInto(100, 200, { x: 0, y: 0, w: 100, h: 100 }); assert.equal(f.scale, 0.5); assert.equal(f.x, 25);
});
test('bates labels', () => {
  assert.equal(D.batesLabel('ABC-', 1, 6, 0), 'ABC-000001'); assert.equal(D.batesLabel('X', 99, 3, 2, '-Z'), 'X101-Z'); assert.equal(D.batesLabel('', 5, 2, 0), '05');
});
test('paper conversion', () => {
  assert.equal(D.mmToPx(210, 300), 2480); assert.equal(D.mmToPx(297, 72), 842); assert.ok(Math.abs(D.mmToIn(215.9) - 8.5) < 1e-9);
});
test('label templates fit their paper', () => {
  for (const [k, t] of Object.entries(D.LABELS)) { const [pw, ph] = D.PAPER[t.paper]; assert.ok(t.left + (t.cols - 1) * t.px + t.w <= pw + 0.01, k + ' width'); assert.ok(t.top + (t.rows - 1) * t.py + t.h <= ph + 0.01, k + ' height'); }
  const r = D.labelRects(D.LABELS['avery-l7160'], 297); assert.equal(r.length, 21);
});
test('label blocks', () => {
  assert.deepEqual(D.parseLabelBlocks('A\nB\n\n\nC\r\nD\n'), [['A', 'B'], ['C', 'D']]);
});
test('fitFont shrinks to fit', () => {
  const w = (l, s) => l.length * s * 0.5; assert.equal(D.fitFont(['abcd'], 100, 50, w), 12); assert.ok(D.fitFont(['a'.repeat(100)], 100, 50, w) < 12);
});
test('markdown → docx body', () => {
  const { body, links } = D.markdownToDocxBody('# Title\n\nHello **bold** and *it* and [site](https://x.com).\n\n- a\n- b\n\n1. one\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```\ncode & <x>\n```');
  assert.match(body, /Heading1/); assert.match(body, /<w:b\/>/); assert.match(body, /<w:i\/>/); assert.equal(links.length, 1);
  assert.match(body, /<w:numId w:val="1"\/>/); assert.match(body, /<w:numId w:val="2"\/>/); assert.match(body, /<w:tbl>/); assert.match(body, /code &amp; &lt;x&gt;/);
});
test('docx files are well-formed enough', () => {
  const f = D.docxFiles('# Hi\n\ntext'); for (const k of ['[Content_Types].xml', 'word/document.xml', 'word/styles.xml', 'word/numbering.xml']) assert.ok(f[k].startsWith('<?xml'), k);
  assert.match(f['word/document.xml'], /<w:sectPr>/);
});
test('invoice items and totals', () => {
  const it = D.parseInvoiceItems('Web design; 10; 85\nHosting; 12,50\nA; B; 2; 3');
  assert.deepEqual(it.map(i => [i.desc, i.qty, i.price, i.total]), [['Web design', 10, 85, 850], ['Hosting', 1, 12.5, 12.5], ['A; B', 2, 3, 6]]);
  assert.deepEqual(D.invoiceTotals(it, 20, 10), { subtotal: 868.5, discount: 86.85, net: 781.65, tax: 156.33, total: 937.98 });
  assert.throws(() => D.parseInvoiceItems('Only a description'));
  assert.throws(() => D.parseInvoiceItems('x; abc'));
});
test('wrapText', () => {
  const w = s => s.length; assert.deepEqual(D.wrapText('aaa bbb ccc', 7, w), ['aaa bbb', 'ccc']); assert.deepEqual(D.wrapText('abcdefghij', 4, w), ['abcd', 'efgh', 'ij']);
});
