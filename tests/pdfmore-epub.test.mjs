import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../assets/js/tools/lib/pdfmore.js';
import * as E from '../assets/js/tools/lib/epub.js';

test('searchPages: case, whole word, regex, context and counts', () => {
  const pages = ['The cat sat on the mat. Cat food.', 'No match here', 'concatenate CAT scan cat'];
  const r = P.searchPages(pages, 'cat'); assert.equal(r.total, 5); assert.deepEqual([...new Set(r.hits.map(h => h.page))], [1, 3]); assert.equal(r.pagesWith, 2); assert.equal(r.hits[0].before, 'The '); assert.equal(r.hits[0].after, ' sat on the mat. Cat food.');
  assert.equal(P.searchPages(pages, 'cat', { caseSensitive: true }).total, 3); assert.equal(P.searchPages(pages, 'cat', { wholeWord: true }).total, 4); assert.equal(P.searchPages(pages, 'c.t', { regex: true, wholeWord: true }).total, 4);
  assert.equal(P.searchPages(pages, 'c.t').total, 0, 'dot is literal unless regex'); assert.throws(() => P.searchPages(pages, '(', { regex: true }), /Unterminated|Invalid|parenthes/i); assert.equal(P.searchPages(pages, '').total, 0);
  assert.equal(P.searchPages(['ÄÖÜ äöü Über'], 'über', { wholeWord: true }).total, 1);
});
test('comparePage: identical, word changes and the share changed', () => {
  assert.equal(P.comparePage('same text', 'same   text').changedShare, 0);
  const r = P.comparePage('the price is 10 euros per month', 'the price is 12 euros per year'); assert.equal(r.removed, 2); assert.equal(r.added, 2); assert.equal(r.same, 5); assert.equal(r.changedShare, 44.4);
  assert.equal(P.comparePage('', 'new page text').added, 3);
});
test('parseSize understands units and decimals', () => {
  assert.equal(P.parseSize('2 MB'), 2097152); assert.equal(P.parseSize('500kb'), 512000); assert.equal(P.parseSize('1,5'), 1572864); assert.equal(P.parseSize('abc'), null); assert.equal(P.parseSize('1 GB'), 1073741824);
});
const fakeEpub = {
  'META-INF/container.xml': '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  'OEBPS/content.opf': '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>My &amp; Book</dc:title><dc:creator>A. Writer</dc:creator><dc:language>en</dc:language></metadata><manifest><item id="n" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="c1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/><item id="img" href="i.png" media-type="image/png"/></manifest><spine><itemref idref="n" linear="no"/><itemref idref="c1"/><itemref idref="c2"/></spine></package>',
  'OEBPS/text/ch1.xhtml': '<?xml version="1.0"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title><style>p{}</style></head><body><h1>Chapter&nbsp;One</h1><p>First <em>para</em> with&mdash;dash and <a href="#">link</a>.</p><ul><li>one</li><li>two</li></ul><blockquote><p>Quoted.</p></blockquote><pre>a  b\n c</pre><hr/><img src="i.png"/></body></html>',
  'OEBPS/text/ch2.xhtml': '<html xmlns="http://www.w3.org/1999/xhtml"><body><h2>Second</h2><p>Second chapter text.</p></body></html>',
};
test('EPUB structure: metadata, reading order without the nav document, relative paths', () => {
  const s = E.epubStructure(p => fakeEpub[p] ?? null); assert.equal(s.title, 'My & Book'); assert.equal(s.author, 'A. Writer'); assert.equal(s.lang, 'en'); assert.deepEqual(s.spine, ['OEBPS/text/ch1.xhtml', 'OEBPS/text/ch2.xhtml']);
  assert.throws(() => E.epubStructure(() => null), /not an EPUB/);
});
test('XHTML → blocks: headings, entities, lists, quotes, pre, no images or scripts', () => {
  const b = E.xhtmlToBlocks(fakeEpub['OEBPS/text/ch1.xhtml']);
  assert.deepEqual(b, [{ t: 'h1', text: 'Chapter One' }, { t: 'p', text: 'First para with—dash and link.' }, { t: 'li', text: 'one', ordered: false, n: 1 }, { t: 'li', text: 'two', ordered: false, n: 2 }, { t: 'quote', text: 'Quoted.' }, { t: 'pre', text: 'a  b\n c' }, { t: 'hr' }]);
});
test('pagination: wraps lines to the width, breaks pages, starts chapters on a new page, title page first', () => {
  const widthOf = (t, size) => t.length * size * 0.5; const long = 'word '.repeat(400).trim();
  const pages = E.paginate([[{ t: 'h1', text: 'One' }, { t: 'p', text: long }], [{ t: 'h1', text: 'Two' }, { t: 'p', text: 'short' }]], widthOf, { pageW: 300, pageH: 400, margin: 30, size: 10, title: 'Book', author: 'Me' });
  assert.ok(pages.length >= 4, 'pages ' + pages.length); assert.equal(pages[0][0].text, 'Book'); assert.ok(pages.every(p => p.every(l => widthOf(l.text, l.size) <= 300 - 60 + 0.01 && l.y <= 400)), 'inside the page');
  const last = pages.at(-1), chap2 = pages.findIndex(p => p.some(l => l.text === 'Two')); assert.equal(chap2, pages.length - 1); assert.equal(last[0].text, 'Two');
  const words = pages.slice(1, -1).flat().filter(l => l.size === 10).map(l => l.text).join(' ').split(' ').length; assert.equal(words, 400, 'no text lost');
});
