import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as D from '../assets/js/tools/lib/devtools.js';
import yaml from '../assets/vendor/js-yaml/js-yaml.mjs';

test('formatJson formats, minifies, sorts and reports the error position', () => {
  assert.equal(D.formatJson('{"b":1,"a":[1,2]}', { indent: 2 }).text, '{\n  "b": 1,\n  "a": [\n    1,\n    2\n  ]\n}');
  assert.equal(D.formatJson('{ "a" : 1 }', { minify: true }).text, '{"a":1}'); assert.equal(D.formatJson('{"b":1,"a":2}', { sortKeys: true, minify: true }).text, '{"a":2,"b":1}'); assert.equal(D.formatJson('{"a":1}', { indent: 'tab' }).text, '{\n\t"a": 1\n}');
  const bad = D.formatJson('{\n  "a": 1,\n  "b": ,\n}'); assert.equal(bad.ok, false); assert.equal(bad.error.line, 3); assert.equal(bad.error.col, 8); assert.match(bad.error.message, /Unexpected ","/);
  const pos = t => D.formatJson(t).error; assert.match(pos('{"a":1,}').message, /Trailing comma/); assert.match(pos('[1,2,]').message, /Trailing comma/); assert.match(pos('{"a" 1}').message, /Expected ":"/); assert.match(pos('{"a":1').message, /Expected "," or "}"|end of the text/); assert.match(pos("{'a':1}").message, /property name in quotes/); assert.match(pos('"abc').message, /Unterminated/); assert.match(pos('[1] x').message, /after the end/); assert.equal(pos('{\n  "a": tru\n}').line, 2);
  for (const ok of ['[]', '{}', '0', '-1.5e3', '"x\\u00e9"', '[{"a":[null,true,false]}]', ' \n 1 ']) assert.equal(D.formatJson(ok).ok, true, ok);
  const s = D.formatJson('{"a":{"b":[1,2,{"c":3}]}}').stats; assert.equal(s.keys, 3); assert.equal(s.depth, 5);
});
test('lenient mode accepts comments and trailing commas but not inside strings', () => {
  const r = D.formatJson('{ // note\n "url": "http://x.y/*not a comment*/", /* c */ "a": [1,2,], }', { lenient: true, minify: true }); assert.equal(r.text, '{"url":"http://x.y/*not a comment*/","a":[1,2]}');
  assert.equal(D.formatJson('{"a":1,}').ok, false, 'strict mode rejects trailing commas');
});
test('XML parsing: attributes, text, arrays, entities, CDATA, self-closing, errors', () => {
  const j = D.xmlToJson('<?xml version="1.0"?><!-- c --><shop name="A &amp; B"><item id="1">Pen &lt;blue&gt;</item><item id="2"/><note><![CDATA[x < y]]></note><count>3</count></shop>');
  assert.deepEqual(j, { shop: { '@name': 'A & B', item: [{ '@id': '1', '#text': 'Pen <blue>' }, { '@id': '2' }], note: 'x < y', count: '3' } });
  assert.throws(() => D.parseXml('<a><b></a>'), /does not match/); assert.throws(() => D.parseXml('<a>'), /Missing closing/); assert.throws(() => D.parseXml('<a/><b/>'), /More than one root/); assert.throws(() => D.parseXml('text'), /Text outside|No XML/);
});
test('JSON → XML → JSON round trip keeps structure', () => {
  const v = { shop: { '@name': 'A & B', item: [{ '@id': '1', '#text': 'Pen <blue>' }, { '@id': '2' }], count: '3' } };
  const xml = D.valueToXml(v); assert.match(xml, /<shop name="A &amp; B">/); assert.match(xml, /<item id="1">Pen &lt;blue&gt;<\/item>/); assert.deepEqual(D.xmlToJson(xml), v);
  assert.match(D.valueToXml([1, 2], { declaration: false }), /<root>1<\/root>\n<root>2<\/root>/);
});
test('YAML ↔ JSON with js-yaml keeps types', () => {
  const v = yaml.load('name: Ohfis\nlist:\n  - 1\n  - true\n  - null\nnested: {a: 1.5}\n'); assert.deepEqual(v, { name: 'Ohfis', list: [1, true, null], nested: { a: 1.5 } });
  assert.equal(yaml.dump(v, { lineWidth: -1 }), 'name: Ohfis\nlist:\n  - 1\n  - true\n  - null\nnested:\n  a: 1.5\n');
});
test('SQL formatter from the vendored library works with the global export', () => {
  const ctx = {}; vm.createContext(ctx); vm.runInContext(readFileSync(new URL('../assets/vendor/sql-formatter/sql-formatter.min.js', import.meta.url), 'utf8'), ctx);
  const out = ctx.sqlFormatter.format('select a,b from t where x=1 and y=2 order by a', { language: 'postgresql', keywordCase: 'upper' }); assert.match(out, /^SELECT\n  a,\n  b\nFROM\n  t\nWHERE\n  x = 1\n  AND y = 2\nORDER BY\n  a$/);
});
test('findMatches: positions, groups, named groups, empty matches and errors', () => {
  const r = D.findMatches('(?<k>\\w+)=(\\d+)', 'g', 'a=1\nbb=22'); assert.equal(r.matches.length, 2); assert.deepEqual(r.matches[1], { index: 4, end: 9, text: 'bb=22', line: 2, col: 1, groups: ['bb', '22'], named: { k: 'bb' } });
  assert.equal(D.findMatches('x*', 'g', 'ab').matches.length, 3, 'empty matches advance'); assert.throws(() => D.findMatches('(', '', 'x'), /Unterminated group|Invalid|parenthes/i); assert.equal(D.findMatches('a', 'g', 'a'.repeat(50), 10).truncated, true);
  assert.equal(D.replaceAll('(\\d+)', 'g', 'a1b22', '<$1>'), 'a<1>b<22>');
});
test('minifiers shrink CSS and HTML without breaking strings and pre blocks', () => {
  const css = '/* c */\nbody {\n  margin: 0px;\n  color: #ffffff;\n  content: "a  b";\n  padding: 0.5em ;\n}\n\n.a > .b , .c { margin : 0 auto; }\n'; const m = D.minifyCss(css);
  assert.equal(m, 'body{margin:0;color:#fff;content:"a  b";padding:.5em}.a>.b,.c{margin:0 auto}');
  const html = D.minifyHtml('<!-- hi -->\n<div>\n  <p>Hello   <b>world</b></p>\n  <pre>  keep\n   this </pre>\n</div>'); assert.equal(html, '<div><p>Hello <b>world</b></p><pre>  keep\n   this </pre></div>');
  assert.equal(D.minifyJson('{ "a" : [1, 2] , // x\n}'), '{"a":[1,2]}');
});
test('lorem ipsum: counts, classic start, determinism', () => {
  assert.equal(D.lorem({ unit: 'words', count: 12 }).split(' ').length, 12); assert.match(D.lorem({ unit: 'sentences', count: 3 }), /^Lorem ipsum dolor sit amet/); assert.equal(D.lorem({ unit: 'paragraphs', count: 4 }).split('\n\n').length, 4);
  assert.equal(D.lorem({ seed: 5 }), D.lorem({ seed: 5 })); assert.notEqual(D.lorem({ seed: 5 }), D.lorem({ seed: 6 })); assert.doesNotMatch(D.lorem({ classicStart: false, unit: 'words', count: 20 }), /^Lorem ipsum dolor/);
});

test('markdown: headings, emphasis, code, links, images, quotes, hr', () => {
  const h = D.markdownToHtml('# Title\n\nSome **bold**, *em*, ~~gone~~ and `code <b>`.\n\n> quote\n> more\n\n---\n\n[x](https://a.b "T") ![i](https://a.b/i.png) <script>alert(1)</script>');
  assert.match(h, /<h1>Title<\/h1>/); assert.match(h, /<strong>bold<\/strong>, <em>em<\/em>, <del>gone<\/del> and <code>code &lt;b&gt;<\/code>/); assert.match(h, /<blockquote><p>quote\nmore<\/p><\/blockquote>/); assert.match(h, /<hr>/);
  assert.match(h, /<a href="https:\/\/a.b" title="T">x<\/a>/); assert.match(h, /<img src="https:\/\/a.b\/i.png" alt="i">/); assert.match(h, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/); assert.ok(!h.includes('<script>'));
});
test('markdown: unsafe links are neutralised', () => {
  assert.match(D.markdownToHtml('[a](javascript:alert(1))'), /href="#"/); assert.match(D.markdownToHtml('![a](data:text/html;base64,xx)'), /^<p>a<\/p>$/);
});
test('markdown: lists (nested, ordered, tasks), code blocks and tables', () => {
  assert.equal(D.markdownToHtml('- a\n- b\n  - c\n- d'), '<ul><li>a</li><li>b<ul><li>c</li></ul></li><li>d</li></ul>'); assert.equal(D.markdownToHtml('1. x\n2. y'), '<ol><li>x</li><li>y</li></ol>');
  assert.match(D.markdownToHtml('- [x] done\n- [ ] todo'), /<li><input type="checkbox" disabled checked> done<\/li><li><input type="checkbox" disabled> todo<\/li>/);
  assert.equal(D.markdownToHtml('```js\nlet a = "<";\n```'), '<pre><code class="language-js">let a = &quot;&lt;&quot;;\n\n</code></pre>'.replace('\n\n</code>', '\n</code>'));
  const t = D.markdownToHtml('| A | B |\n|:--|--:|\n| 1 | 2 |\n| 3 |'); assert.match(t, /<th style="text-align:left">A<\/th><th style="text-align:right">B<\/th>/); assert.match(t, /<td style="text-align:right"><\/td>/);
});
