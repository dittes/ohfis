import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/js/tools/lib/text.js';

test('cleanInvisible removes zero-width chars and normalises NBSP', () => {
  const r = T.cleanInvisible('a​b﻿c d e');
  assert.equal(r.text, 'abc d\ne');
  assert.equal(r.found['​'], 1);
  assert.equal(T.cleanInvisible('a b', { nbsp: false }).text, 'a b');
  assert.equal(T.cleanInvisible('👨‍👩', { keepJoiners: true }).text, '👨‍👩');
});

test('convertCase covers the common styles', () => {
  assert.equal(T.convertCase('the quick BROWN fox of the world', 'title'), 'The Quick Brown Fox of the World');
  assert.equal(T.convertCase('hello. how are you? fine', 'sentence'), 'Hello. How are you? Fine');
  assert.equal(T.convertCase('Hello World foo-bar', 'camel'), 'helloWorldFooBar');
  assert.equal(T.convertCase('helloWorld HTTPServer', 'snake'), 'hello_world_http_server');
  assert.equal(T.convertCase('Hello World', 'kebab'), 'hello-world');
  assert.equal(T.convertCase('hello world', 'pascal'), 'HelloWorld');
  assert.equal(T.convertCase('straße', 'upper'), 'STRASSE');
  assert.equal(T.convertCase('Hello', 'inverse'), 'hELLO');
});

test('dedupe counts and keeps first-seen order', () => {
  const r = T.dedupe('b\na\nB\na\n\n b ', { ignoreCase: true });
  assert.deepEqual(r.items.map(i => [i.line, i.count]), [['b', 3], ['a', 2]]);
  assert.equal(r.removed, 3);
  assert.equal(T.dedupe('x\nx\ny', { sortBy: 'count' }).items[0].line, 'x');
});

test('sortLines: natural, length, reverse', () => {
  assert.equal(T.sortLines('v10\nv2\nv1', 'natural'), 'v1\nv2\nv10');
  assert.equal(T.sortLines('v10\nv2\nv1', 'alpha'), 'v1\nv10\nv2');
  assert.equal(T.sortLines('ccc\na\nbb', 'length'), 'a\nbb\nccc');
  assert.equal(T.sortLines('a\nb', 'alpha', { reverse: true }), 'b\na');
  assert.equal(T.sortLines('$10\n$9\n$100', 'number'), '$9\n$10\n$100');
});

test('shuffleLines keeps the same lines and is unbiased enough', () => {
  const src = Array.from({ length: 30 }, (_, i) => 'l' + i).join('\n');
  const out = T.shuffleLines(src);
  assert.deepEqual(out.split('\n').sort(), src.split('\n').sort());
  const first = {}; for (let i = 0; i < 3000; i++) { const f = T.shuffleLines('a\nb\nc').split('\n')[0]; first[f] = (first[f] || 0) + 1; }
  for (const k of 'abc') assert.ok(first[k] > 800 && first[k] < 1200, `${k}: ${first[k]}`);
  for (let i = 0; i < 200; i++) assert.ok(T.secureRandom(7) < 7);
});

test('filterLines supports modes, invert, regex', () => {
  const s = 'apple\nBanana\ncherry\napricot';
  assert.equal(T.filterLines(s, 'AP'), 'apple\napricot');
  assert.equal(T.filterLines(s, 'ap', { invert: true }), 'Banana\ncherry');
  assert.equal(T.filterLines(s, 'ry', { mode: 'ends' }), 'cherry');
  assert.equal(T.filterLines(s, '^a.*t$', { regex: true }), 'apricot');
  assert.equal(T.filterLines(s, 'banana', { mode: 'equals', ignoreCase: false }), '');
});

test('prefixSuffix numbering', () => {
  assert.equal(T.prefixSuffix('a\n\nb', { prefix: '{n}. ', numbered: true, pad: 2 }), '01. a\n\n02. b');
  assert.equal(T.prefixSuffix('a\nb', { prefix: "'", suffix: "'," }), "'a',\n'b',");
});

test('mergeColumns pads shorter lists', () => {
  assert.equal(T.mergeColumns('a\nbb', '1\n2\n3', { sep: ' | ', pad: true }), 'a  | 1\nbb | 2\n | 3'.replace('\n | 3', '\n   | 3'));
});

test('delimiterConvert', () => {
  assert.equal(T.delimiterConvert('a\nb\n\nc', { to: 'comma-space', quote: 'single' }), "'a', 'b', 'c'");
  assert.equal(T.delimiterConvert('a, b, c', { from: 'comma', to: 'newline' }), 'a\nb\nc');
  assert.equal(T.delimiterConvert('a\nb', { quote: 'double', wrap: 'array', to: 'comma' }), '["a", "b"]');
  assert.equal(T.delimiterConvert('1\n2', { wrap: 'sql', to: 'comma' }), '(1, 2)');
});

test('normalizeQuotes', () => {
  assert.equal(T.normalizeQuotes('“Hi” – it’s… ﬁne — ok'), '"Hi" - it\'s... fine -- ok');
  assert.equal(T.normalizeQuotes('a b​c'), 'a bc');
});

test('unwrapLines keeps paragraphs, fixes hyphenation, keeps list items', () => {
  const src = 'This is a long line that was\nwrapped by a PDF viewer and hy-\nphenated here.\n\nSecond paragraph\ncontinues.\n- item one\n- item two';
  const out = T.unwrapLines(src);
  assert.equal(out, 'This is a long line that was wrapped by a PDF viewer and hyphenated here.\n\nSecond paragraph continues.\n- item one\n- item two');
  assert.equal(T.unwrapLines('a\n\nb', { keepParagraphs: false }), 'a b');
});

test('stripEmoji handles ZWJ sequences, flags, skin tones', () => {
  assert.equal(T.stripEmoji('Hi 👨‍👩‍👧 there 🇩🇪 ok 👍🏽!').text, 'Hi  there  ok !');
  assert.equal(T.stripEmoji('digits 1 2 3 # *').text, 'digits 1 2 3 # *');
  assert.equal(T.stripEmoji('Café ☕ naïve', { asciiOnly: true }).text, 'Cafe  naive');
});

test('slugify removes accents and punctuation', () => {
  assert.equal(T.slugify('  Crème Brûlée & Straße — für 100% Spaß! '), 'creme-brulee-strasse-fur-100-spass');
  assert.equal(T.slugify('The Art of the Deal', { stopWords: true }), 'art-deal');
  assert.equal(T.slugify('Hello World', { sep: '_', lower: false }), 'Hello_World');
  assert.equal(T.slugify('one two three four five', { maxLen: 12 }), 'one-two');
  assert.equal(T.slugify('Łódź żółć'), 'lodz-zolc');
});

test('extract patterns', () => {
  const s = 'Mail a.b+c@ex-ample.co.uk, x@y.io or bad@. See https://a.com/x?y=1, (http://b.org). id 123e4567-e89b-12d3-a456-426614174000 ip 10.0.0.255 999.1.1.1 #fff #12345g';
  assert.deepEqual(T.extract(s, 'email').items, ['a.b+c@ex-ample.co.uk', 'x@y.io']);
  assert.deepEqual(T.extract(s, 'url').items, ['https://a.com/x?y=1', 'http://b.org']);
  assert.equal(T.extract(s, 'uuid').items.length, 1);
  assert.deepEqual(T.extract(s, 'ipv4').items, ['10.0.0.255']);
  assert.deepEqual(T.extract(s, 'hex').items, ['#fff']);
  assert.deepEqual(T.extract('a1 b22 a1', 'custom', { custom: '[a-z]\\d+' }).items, ['a1', 'b22']);
  assert.deepEqual(T.extract('Call +49 30 1234567 or 030-12345678', 'phone').items.length, 2);
});

test('extractEmails groups by domain, lowercases, dedupes', () => {
  const r = T.extractEmails('A@X.com, a@x.com; b@y.org\nc@x.com');
  assert.deepEqual(r.emails, ['a@x.com', 'b@y.org', 'c@x.com']);
  assert.deepEqual(Object.keys(r.byDomain), ['x.com', 'y.org']);
  assert.equal(r.total, 4);
});

test('cleanUrl strips tracking only', () => {
  const r = T.cleanUrl('https://shop.com/p?id=7&utm_source=a&fbclid=z&color=red#top');
  assert.equal(r.url, 'https://shop.com/p?id=7&color=red#top');
  assert.deepEqual(r.removed, ['utm_source', 'fbclid']);
  assert.equal(T.cleanUrl('https://a.com/?utm_x=1').url, 'https://a.com/');
  assert.equal(T.cleanUrl('https://a.com/?q=1#h', { removeAll: true, hash: true }).url, 'https://a.com/');
  assert.equal(T.cleanUrl('not a url').url, 'not a url');
  assert.equal(T.cleanUrlsInText('see https://a.com/?utm_a=1&b=2 now'), 'see https://a.com/?b=2 now');
});

test('counting: bytes, graphemes, SMS', () => {
  assert.equal(T.utf8Bytes('aé€😀'), 1 + 2 + 3 + 4);
  assert.equal(T.graphemes('a👨‍👩‍👧é'), 3);
  assert.deepEqual(T.smsInfo('a'.repeat(160)), { units: 160, gsm: true, parts: 1, perPart: 160 });
  assert.equal(T.smsInfo('a'.repeat(161)).parts, 2);
  assert.equal(T.smsInfo('€'.repeat(80)).parts, 1);
  assert.equal(T.smsInfo('€'.repeat(81)).parts, 2);
  const u = T.smsInfo('héllo ✓'); assert.equal(u.gsm, false); assert.equal(u.perPart, 70);
  assert.equal(T.wordCount("Don't stop — it's well-known 42"), 5);
  assert.equal(T.sentenceCount('One. Two! Three?'), 3);
});

test('speakingTime', () => {
  const text = Array(300).fill('word').join(' ');
  assert.equal(T.speakingTime(text, 150).seconds, 120);
  assert.equal(T.formatDuration(125), '2m 05s');
  assert.equal(T.formatDuration(3725), '1h 2m 5s');
});

test('wordFrequency with stop words and bigrams', () => {
  const s = 'The cat and the dog. The cat sat. Cats are not cat. cat';
  const r = T.wordFrequency(s, { stop: 'en' });
  assert.equal(r.rows[0].word, 'cat'); assert.equal(r.rows[0].count, 4);
  assert.ok(!r.rows.some(x => x.word === 'the'));
  const b = T.wordFrequency('big red car and big red bus', { n: 2, stop: 'en' });
  assert.deepEqual(b.rows[0], { word: 'big red', count: 2, pct: b.rows[0].pct });
});

test('chunkText never cuts words and respects limit', () => {
  const text = 'alpha beta gamma delta epsilon zeta eta theta iota kappa';
  const chunks = T.chunkText(text, 15);
  assert.ok(chunks.every(c => c.length <= 15), JSON.stringify(chunks));
  assert.equal(chunks.join(' '), text);
  assert.deepEqual(T.chunkText('abcdefghij', 4, { byWords: false }), ['abcd', 'efgh', 'ij']);
  const ov = T.chunkText('abcdefghij', 4, { byWords: false, overlap: 1 }); assert.equal(ov[1][0], 'd');
  assert.throws(() => T.chunkText('x', 0));
  assert.ok(T.chunkText('p1 text\n\np2 text\n\np3 text', 20, { byParagraph: true }).length >= 2);
});

test('tabsSpaces', () => {
  assert.equal(T.tabsSpaces('\tfoo\n\t\tbar', { size: 2 }), '  foo\n    bar');
  assert.equal(T.tabsSpaces('    foo\n      bar', { mode: 'spaces-to-tabs', size: 4 }), '\tfoo\n\t  bar');
  assert.equal(T.tabsSpaces('a  \nb\t', { mode: 'tabs-to-spaces', trailing: true }), 'a\nb');
});

test('rot13 is its own inverse; rot47-style shifts', () => {
  assert.equal(T.rot('Hello, World!'), 'Uryyb, Jbeyq!');
  assert.equal(T.rot(T.rot('Round Trip 123')), 'Round Trip 123');
  assert.equal(T.rot('abc', 3), 'def'); assert.equal(T.rot('xyz', -3), 'uvw');
  assert.equal(T.rot('a1', 13, { digits: true }), 'n4');
});

test('nato spelling', () => {
  assert.equal(T.nato('Ab 1'), 'alfa bravo / One'.replace('alfa bravo', 'Alfa bravo'));
  assert.equal(T.nato('ÄB', {}), 'Alfa Bravo');
});

test('convertBase round-trips', () => {
  const s = 'Héllo, 世界!';
  for (const f of ['hex', 'binary', 'decimal', 'octal', 'base32', 'base64']) {
    const enc = T.convertBase(s, { from: 'text', to: f }); assert.equal(T.convertBase(enc, { from: f, to: 'text' }), s, f);
  }
  assert.equal(T.convertBase('Hi', { to: 'hex' }), '48 69');
  assert.equal(T.convertBase('foobar', { to: 'base32' }), 'MZXW6YTBOI======');
  assert.equal(T.convertBase('48,69', { from: 'hex', to: 'decimal' }).length > 0, true);
  assert.throws(() => T.convertBase('300', { from: 'decimal', to: 'text' }));
  assert.throws(() => T.convertBase('102', { from: 'binary', to: 'text' }));
});

test('morse round trip and timeline', () => {
  assert.equal(T.toMorse('SOS'), '... --- ...');
  assert.equal(T.toMorse('Hi you'), '.... .. / -.-- --- ..-');
  assert.equal(T.fromMorse('.... .. / -.-- --- ..-'), 'HI YOU');
  assert.equal(T.fromMorse('... --- ...'), 'SOS');
  assert.equal(T.fromMorse('.-.-.-.-.-.-'), '?');
  const ev = T.morseTimeline('.-', 100); assert.deepEqual(ev, [[true, 100], [false, 100], [true, 300], [false, 100]]);
  assert.equal(T.toMorse('Größe'), '--. .-. --- ... ... .');
});

test('table conversion', () => {
  const rows = T.splitTable('Name\tAge\nAnn\t30\nBob|x\t4');
  assert.deepEqual(rows[0], ['Name', 'Age']); assert.equal(rows.length, 3);
  assert.deepEqual(T.splitTable('| a | b |\n|---|---|\n| 1 | 2 |')[0], ['a', 'b']);
  const md = T.tableToMarkdown([['Name', 'Qty'], ['Pen', '10'], ['A|B', '2']], { align: 'right' });
  assert.equal(md, '| Name | Qty |\n| ---: | --: |\n|  Pen |  10 |\n| A\\|B |   2 |');
  assert.match(T.tableToHtml([['a', '<b>'], ['1', '2']]), /<th>a<\/th><th>&lt;b&gt;<\/th>/);
  assert.equal(T.tableToMarkdown([]), '');
});

test('outline conversion', () => {
  const src = 'Animals\n  Cats\n    Siamese\n  Dogs\nPlants';
  const j = JSON.parse(T.outlineTo(src, 'json'));
  assert.equal(j[0].children[0].children[0].text, 'Siamese'); assert.equal(j[1].text, 'Plants');
  assert.match(T.outlineTo(src, 'html'), /<li>Dogs<\/li>/);
  assert.match(T.outlineTo('A\n\tB', 'xml'), /<item title="A">\n {4}<item title="B"\/>/);
  assert.equal(T.outlineTo('- A\n  - B', 'markdown'), '- A\n  - B');
});

test('fillTemplate', () => {
  const r = T.fillTemplate('Hi {{ name }}, {{team.lead}} says {{name}}', { name: 'Ann' });
  assert.deepEqual(r.names, ['name', 'team.lead']); assert.equal(r.text, 'Hi Ann, {{team.lead}} says Ann');
});

test('buzzwords and tone audit', () => {
  const b = T.findBuzzwords('Let us leverage synergy and circle back. Leveraging more.');
  assert.deepEqual(b.map(x => x.word), ['leverage', 'synergy', 'circle back', 'leverage']);
  const a = T.auditTone('Sorry, but as per my last email you never reply! ASAP. Sorry. Sorry.');
  const kinds = a.hits.map(h => h.kind); assert.ok(kinds.includes('passive-aggressive') && kinds.includes('blaming') && kinds.includes('vague'));
  assert.ok(a.notes.some(n => n.includes('sorry')));
  assert.equal(T.auditTone('Thanks, see you at 3.').hits.length, 0);
});
