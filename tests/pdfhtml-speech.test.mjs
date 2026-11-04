import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../assets/js/tools/lib/pdfhtml.js';
import * as S from '../assets/js/tools/lib/speech.js';

const it = (str, x, y, size = 12, w) => ({ str, x, y, size, w: w ?? str.length * size * 0.5 });
const page = [
  it('Annual Report', 72, 750, 24), it('1. Summary', 72, 700, 16),
  it('This is the first line of a paragraph', 72, 670), it('that continues here and ends.', 72, 656),
  it('Second paragraph starts after a gap.', 72, 620),
  it('• first point', 80, 590), it('• second point', 80, 576), it('wrapped text of second', 90, 562),
  it('Total', 72, 520), it('1,234', 200, 520),
];
test('headings, paragraphs and lists are recognised', () => {
  const html = P.pagesToHtml([{ items: page }]);
  assert.match(html, /<h1>Annual Report<\/h1>/); assert.match(html, /<h2>1\. Summary<\/h2>/);
  assert.match(html, /<p>This is the first line of a paragraph that continues here and ends\.<\/p>/);
  assert.match(html, /<p>Second paragraph starts after a gap\.<\/p>/);
  assert.match(html, /<ul><li>first point<\/li><li>second point wrapped text of second<\/li><\/ul>/);
  assert.match(html, /<p>Total 1,234<\/p>/, 'items on one baseline become one line');
});
test('hyphenated line ends are joined, text is escaped, headings can be switched off', () => {
  const html = P.pagesToHtml([{ items: [it('A very inter-', 72, 700), it('national <b> & more', 72, 686)] }], { headings: false });
  assert.match(html, /<p>A very international &lt;b&gt; &amp; more<\/p>/);
  assert.ok(!P.pagesToHtml([{ items: page }], { headings: false }).includes('<h1>'));
});
test('page breaks and the document wrapper', () => {
  const body = P.pagesToHtml([{ items: [it('one', 72, 700)] }, { items: [it('two', 72, 700)] }], { pageBreaks: true }); assert.match(body, /<hr class="page-break">/);
  const doc = P.wrapDocument(body, { title: 'A & B', lang: 'de' }); assert.match(doc, /<title>A &amp; B<\/title>/); assert.match(doc, /<html lang="de">/);
});
test('splitForSpeech keeps sentences together up to the limit and never loses text', () => {
  const text = 'One short sentence. Another one follows! And a third? ' + 'word '.repeat(100) + 'End.';
  const parts = S.splitForSpeech(text, 80); assert.ok(parts.every(p => p.length <= 80), parts.map(p => p.length).join(','));
  assert.equal(parts.join(' ').replace(/\s+/g, ' ').trim(), text.replace(/\s+/g, ' ').trim());
  assert.deepEqual(S.splitForSpeech('Hi. There.', 200), ['Hi. There.']);
  assert.deepEqual(S.splitForSpeech('', 50), []);
});
test('sortVoices puts the page language first; readingSeconds scales with the rate', () => {
  const v = [{ name: 'B', lang: 'en-US' }, { name: 'A', lang: 'de-DE' }, { name: 'C', lang: 'de-AT' }]; assert.deepEqual(S.sortVoices(v, 'de').map(x => x.name), ['A', 'C', 'B']);
  assert.equal(S.readingSeconds('word '.repeat(150), 1), 60); assert.equal(S.readingSeconds('word '.repeat(150), 2), 30);
});
