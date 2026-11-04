import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../assets/js/tools/lib/textmore.js';
import * as Fl from '../assets/js/tools/lib/files.js';
import * as F from '../assets/vendor/fflate/fflate.js';

test('sentences: abbreviations and decimals do not split; counts', () => {
  assert.deepEqual(T.sentencesOf('Dr. Smith paid 3.5 euros. Then he left! Why? Because.'), ['Dr. Smith paid 3.5 euros.', 'Then he left!', 'Why?', 'Because.']);
  assert.equal(T.wordsOf("It's a well-known fact, isn't it?").length, 6);
});
test('syllables: English silent e, German diphthongs', () => {
  const e = w => T.syllables(w, 'en'), d = w => T.syllables(w, 'de');
  assert.deepEqual(['cat', 'make', 'table', 'beautiful', 'reading', 'the'].map(e), [1, 1, 2, 3, 2, 1]); assert.deepEqual(['Haus', 'Fenster', 'Mädchen', 'Beispiel', 'Freude'].map(d), [1, 2, 2, 2, 2]);
});
test('Flesch reading ease on a known sentence equals the formula', () => {
  const r = T.readability('The cat sat on the mat.', 'en'); assert.equal(r.words, 6); assert.equal(r.sentences, 1); assert.equal(r.syllables, 6);
  assert.equal(r.fleschReadingEase, Math.round((206.835 - 1.015 * 6 - 84.6 * 1) * 10) / 10); assert.equal(r.fleschKincaidGrade, Math.round((0.39 * 6 + 11.8 * 1 - 15.59) * 10) / 10);
});
test('harder text scores lower than easier text in every scale', () => {
  const easy = 'I like my dog. He is big. We play in the park. It is fun.', hard = 'Notwithstanding considerable methodological heterogeneity, interdisciplinary investigations demonstrate statistically significant correlations between socioeconomic circumstances and educational attainment.';
  const a = T.readability(easy, 'en'), b = T.readability(hard, 'en'); assert.ok(a.fleschReadingEase > 80 && b.fleschReadingEase < 10, `${a.fleschReadingEase} ${b.fleschReadingEase}`); assert.ok(a.lix < b.lix && a.ari < b.ari && a.gunningFog < b.gunningFog && a.smog < b.smog);
  const d = T.readability('Das ist ein Haus. Es ist groß. Wir wohnen dort.', 'de'), dh = T.readability('Die Verantwortlichkeitsverteilung innerhalb mehrschichtiger Organisationsstrukturen erfordert differenzierte Betrachtungsweisen.', 'de'); assert.ok(d.amstad > 70 && dh.amstad < 20 && d.wiener < dh.wiener, `${d.amstad} ${dh.amstad}`);
  assert.equal(T.readability('', 'en'), null); assert.equal(T.readability('anything here', 'pl').fleschReadingEase, undefined);
});
test('longSentences lists sentences above the limit, longest first', () => {
  const l = T.longSentences('Short one. ' + 'word '.repeat(30).trim() + '. ' + 'word '.repeat(26).trim() + '.', 25); assert.deepEqual(l.map(x => x.n), [30, 26]);
});
test('summarize keeps the key sentences in original order', () => {
  const text = 'Solar power is growing fast. Many homes now use solar panels on the roof. Solar panels convert sunlight into electricity. The weather was nice yesterday. Cheap solar panels make solar power popular. My cat likes fish.';
  const s = T.summarize(text, 2, 'en'); assert.equal(s.length, 2); assert.ok(s.every(x => /solar/i.test(x)), s.join(' | ')); assert.ok(text.indexOf(s[0]) < text.indexOf(s[1])); assert.equal(T.summarize('One. Two.', 5).length, 2);
  assert.equal(T.topKeywords(text, 1)[0][0], 'solar');
});
test('similarity: identical, partial copy and different texts', () => {
  const a = 'The quick brown fox jumps over the lazy dog near the river bank every single morning before sunrise.';
  assert.equal(T.similarity(a, a).jaccard, 100); assert.equal(T.similarity(a, a).cosine, 100);
  const b = 'Yesterday I read that the quick brown fox jumps over the lazy dog near the river bank and then went home.'; const s = T.similarity(a, b); assert.ok(s.sharedPassages[0].text.startsWith('the quick brown fox jumps over the lazy dog near the river bank'), s.sharedPassages[0].text); assert.ok(s.sharedShareOfA > 50 && s.sharedShareOfA < 90);
  const c = T.similarity(a, 'Completely unrelated sentence about cooking pasta with tomatoes and basil in a small kitchen.'); assert.ok(c.jaccard < 5 && c.sharedPassages.length === 0); assert.equal(T.similarity('', a), null);
});
test('docx text counting from document.xml', () => {
  const xml = '<w:document><w:body><w:p><w:r><w:t>Hello </w:t></w:r><w:r><w:t xml:space="preserve">big</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>world &amp; co.</w:t></w:r></w:p><w:p/><w:p><w:r><w:t>Second paragraph here.</w:t></w:r></w:p></w:body></w:document>';
  const p = T.docxTextFromXml(xml); assert.deepEqual(p, ['Hello big world & co.', '', 'Second paragraph here.']); const c = T.docCounts(p); assert.equal(c.words, 7); assert.equal(c.paragraphs, 2); assert.equal(c.sentences, 2);
});
test('file detection from magic bytes (and not from the name)', () => {
  const mk = (...parts) => Uint8Array.from(parts.flatMap(p => typeof p === 'string' ? [...p].map(c => c.charCodeAt(0)) : p));
  assert.equal(Fl.detectFile(mk([0x89], 'PNG\r\n', [0x1a, 0x0a], new Array(30).fill(0)), 'x.jpg').id, 'png'); assert.equal(Fl.detectFile(mk([0x89], 'PNG\r\n', [0x1a, 0x0a], new Array(30).fill(0)), 'x.jpg').extensionMatches, false);
  assert.equal(Fl.detectFile(mk([0xff, 0xd8, 0xff, 0xe0], new Array(30).fill(0)), 'photo.jpeg').extensionMatches, true); assert.equal(Fl.detectFile(mk('%PDF-1.7\n', new Array(30).fill(0x20)), 'a.pdf').id, 'pdf');
  assert.equal(Fl.detectFile(mk([0, 0, 0, 0x18], 'ftypheic', new Array(30).fill(0)), 'x.heic').id, 'iso-bmff'); assert.equal(Fl.detectFile(mk([0, 0, 0, 0x18], 'ftypheic', new Array(30).fill(0))).description, 'HEIC image'); assert.equal(Fl.detectFile(mk([0, 0, 0, 0x18], 'ftypisom', new Array(30).fill(0))).ext, 'mp4');
  assert.equal(Fl.detectFile(mk('RIFF', [0, 0, 0, 0], 'WEBPVP8 ', new Array(20).fill(0))).id, 'webp'); assert.equal(Fl.detectFile(mk('RIFF', [0, 0, 0, 0], 'WAVEfmt ', new Array(20).fill(0))).id, 'wav');
  assert.equal(Fl.detectFile(mk('SQLite format 3', [0], new Array(30).fill(0))).id, 'sqlite'); assert.equal(Fl.detectFile(mk('MZ', new Array(60).fill(0)), 'a.dll').extensionMatches, true); assert.equal(Fl.detectFile(mk([0x1a, 0x45, 0xdf, 0xa3], new Array(20).fill(0), 'webm', new Array(20).fill(0))).id, 'webm');
});
test('ZIP-based formats are told apart by their entries; text kinds by content', () => {
  const docx = F.zipSync({ '[Content_Types].xml': new Uint8Array([60]), 'word/document.xml': new Uint8Array([60]) }, { level: 0 }), xlsx = F.zipSync({ 'xl/workbook.xml': new Uint8Array([60]) }, { level: 0 }), plain = F.zipSync({ 'a.txt': new Uint8Array([97]) }, { level: 0 }), epub = F.zipSync({ mimetype: new TextEncoder().encode('application/epub+zip') }, { level: 0 });
  assert.equal(Fl.detectFile(docx, 'x.zip').id, 'docx'); assert.equal(Fl.detectFile(xlsx).id, 'xlsx'); assert.equal(Fl.detectFile(plain).id, 'zip'); assert.equal(Fl.detectFile(epub).id, 'epub'); assert.equal(Fl.detectFile(plain, 'a.zip').extensionMatches, true);
  const t = s => new TextEncoder().encode(s); assert.equal(Fl.detectFile(t('{"a":[1,2]}')).id, 'json'); assert.equal(Fl.detectFile(t('<!DOCTYPE html><html></html>')).id, 'html'); assert.equal(Fl.detectFile(t('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>')).id, 'svg'); assert.equal(Fl.detectFile(t('<?xml version="1.0"?><a><b/></a>')).id, 'xml');
  assert.equal(Fl.detectFile(t('#!/bin/bash\necho hi')).id, 'script'); assert.equal(Fl.detectFile(t('just some text, 100% plain\n'), 'notes.md').extensionMatches, true); assert.equal(Fl.detectFile(new Uint8Array(200).map((_, i) => i * 7 % 256)).id, 'unknown');
  assert.equal(Fl.textKind(new Uint8Array([0xef, 0xbb, 0xbf, 65])), 'UTF-8 with BOM'); assert.equal(Fl.textKind(t('Grüße')), 'UTF-8');
});
test('folder tree drawing, ignore patterns, depth, sizes', () => {
  const e = [{ path: 'src/app.js', size: 100 }, { path: 'src/lib/util.js', size: 2048 }, { path: 'README.md', size: 10 }, { path: 'node_modules/x/index.js', size: 5 }, { path: 'src/lib/', dir: true }];
  const r = Fl.folderTree(e, { rootName: 'proj', ignore: ['node_modules'] }); assert.equal(r.text, 'proj/\n├── src/\n│   ├── lib/\n│   │   └── util.js\n│   └── app.js\n└── README.md'); assert.equal(r.files, 3); assert.equal(r.folders, 2);
  assert.equal(Fl.folderTree(e, { maxDepth: 1, ignore: ['node_modules'] }).text, '.\n├── src/\n└── README.md'); assert.match(Fl.folderTree(e, { sizes: true, ignore: ['node_modules'] }).text, /util\.js {2}\(2\.0 KB\)/); assert.ok(!Fl.folderTree(e, { foldersOnly: true, ignore: ['node_modules'] }).text.includes('.js'));
  assert.match(Fl.folderTree(e, { ignore: ['*.md'] }).text, /^(?!.*README)/s);
});
