import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as N from '../assets/js/tools/lib/notes.js';
import { parseOutline } from '../assets/js/tools/lib/text.js';
import list from '../assets/vendor/eff/eff-large-wordlist.js';

test('password generation honours the rules', () => {
  for (let i = 0; i < 200; i++) { const p = N.generatePassword({ length: 12, lower: true, upper: true, digits: true, symbols: true }); assert.equal(p.length, 12); assert.match(p, /[a-z]/); assert.match(p, /[A-Z]/); assert.match(p, /\d/); assert.match(p, /[^A-Za-z0-9]/); }
  assert.match(N.generatePassword({ length: 40, lower: true, upper: false, digits: false, symbols: false }), /^[a-z]{40}$/); const amb = N.generatePassword({ length: 500, lower: true, upper: true, digits: true, symbols: false, excludeAmbiguous: true }); assert.doesNotMatch(amb, /[Il1O0o]/); assert.equal(N.generatePassword({ length: 3, lower: true, upper: true, digits: true, symbols: true }).length, 4);
  assert.match(N.generatePassword({ length: 30, symbols: true, symbolSet: '!?' }), /^[!?]{30}$/); assert.throws(() => N.generatePassword({ length: 10 }), /at least one/); assert.equal(N.generatePassword({ length: 600, lower: true }).length, 512);
  const seen = {}; for (let i = 0; i < 6000; i++) { const c = N.generatePassword({ length: 1, lower: true }, undefined)[0]; seen[c] = (seen[c] || 0) + 1; } assert.equal(Object.keys(seen).length, 26); assert.ok(Math.min(...Object.values(seen)) > 150 && Math.max(...Object.values(seen)) < 320, 'uniform');
  const fixed = N.generatePassword({ length: 6, lower: true, upper: false, digits: false, symbols: false }, () => 0); assert.equal(fixed, 'aaaaaa');
});
test('entropy, crack time and strength', () => {
  assert.equal(Math.round(N.entropyBits(12, 94)), 79); assert.equal(N.strengthLabel(30), 'weak'); assert.equal(N.strengthLabel(50), 'fair'); assert.equal(N.strengthLabel(70), 'good'); assert.equal(N.strengthLabel(90), 'strong'); assert.equal(N.strengthLabel(128), 'excellent'); assert.equal(N.crackTime(20), 'instantly'); assert.match(N.crackTime(60), /years|days/); assert.match(N.crackTime(128), /billion years/); assert.match(N.crackTime(45), /minutes|hours|seconds/);
});
test('passphrases come from the EFF list', () => {
  assert.equal(list.length, 7776); assert.equal(new Set(list).size, 7776); assert.ok(list.includes('abacus') && list.includes('zoom'));
  const p = N.passphrase({ words: 6, list }); assert.equal(p.text.split('-').length, 6); assert.ok(p.text.split('-').every(w => list.includes(w))); assert.ok(Math.abs(p.bits - 6 * Math.log2(7776)) < 1e-9); assert.equal(Math.round(p.bits * 10) / 10, 77.5);
  const q = N.passphrase({ words: 4, sep: ' ', capitalize: true, number: true, list }); assert.match(q.text, /^([A-Z][a-z-]+\d? ){3}[A-Z][a-z-]+\d?$/); assert.match(q.text, /\d/); assert.ok(q.bits > 4 * 12.9); assert.throws(() => N.passphrase({ list: [] }));
});
test('encrypted notes round-trip and detect tampering', async () => {
  const msg = 'Geheimnis: Wörld 👋\nzeile 2'; const a = await N.encryptNote(msg); assert.match(a.payload, /^v1\.k\./); assert.ok(a.key.length >= 43); assert.equal(await N.decryptNote(a.payload, a.key), msg);
  await assert.rejects(() => N.decryptNote(a.payload, 'A'.repeat(43)), /Wrong key/); const bad = a.payload.split('.'); bad[3] = bad[3].slice(0, -2) + (bad[3].endsWith('AA') ? 'BB' : 'AA'); await assert.rejects(() => N.decryptNote(bad.join('.'), a.key), /Wrong key/); await assert.rejects(() => N.decryptNote('garbage', a.key), /not an OHFIS/);
  const b = await N.encryptNote(msg, { password: 'correct horse' }); assert.match(b.payload, /^v1\.p\./); assert.equal(b.key, null); assert.equal(await N.decryptNote(b.payload, 'correct horse'), msg); await assert.rejects(() => N.decryptNote(b.payload, 'wrong'), /Wrong key or password/); const c = await N.encryptNote(msg, { password: 'correct horse' }); assert.notEqual(b.payload, c.payload, 'fresh salt and IV every time');
});
test('JWT decoding and HMAC verification', async () => {
  const tok = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const d = N.decodeJWT(tok); assert.deepEqual(d.header, { alg: 'HS256', typ: 'JWT' }); assert.equal(d.payload.name, 'John Doe'); assert.equal(d.claims[0].iso, '2018-01-18T01:30:22.000Z'); assert.equal(d.status, 'no expiry claim'); assert.ok(d.warnings.some(w => /never expires/.test(w)));
  assert.equal(await N.verifyHS(tok, 'your-256-bit-secret'), true); assert.equal(await N.verifyHS(tok, 'wrong'), false); assert.equal(N.decodeJWT('Bearer ' + tok).payload.sub, '1234567890');
  const mk = (h, p) => `${btoa(JSON.stringify(h)).replace(/=/g, '')}.${btoa(JSON.stringify(p)).replace(/=/g, '')}.`; const exp = N.decodeJWT(mk({ alg: 'none' }, { exp: 1000 })); assert.equal(exp.status, 'expired'); assert.ok(exp.warnings.some(w => /unsigned/.test(w))); assert.equal(N.decodeJWT(mk({ alg: 'HS256' }, { exp: 9999999999 })).status, 'valid (time claims)'); assert.equal(N.decodeJWT(mk({ alg: 'HS256' }, { nbf: 9999999999, exp: 9999999999 })).status, 'not yet valid');
  assert.throws(() => N.decodeJWT('abc'), /three parts/); assert.throws(() => N.decodeJWT('a.b.c'), /not valid Base64URL/); await assert.rejects(() => N.verifyHS(mk({ alg: 'RS256' }, {}), 'x'), /Only HS256/); assert.equal(N.relTime(-3600), '1 hour ago'); assert.equal(N.relTime(172800), '2 days from now');
});
test('QR payloads', () => {
  const wpw = 'pa:ss"word' + String.fromCharCode(92); assert.equal(N.wifiPayload({ ssid: 'Cafe;Net', password: wpw, type: 'WPA' }), 'WIFI:T:WPA;S:Cafe' + String.fromCharCode(92) + ';Net;P:pa' + String.fromCharCode(92) + ':ss' + String.fromCharCode(92) + '"word' + String.fromCharCode(92, 92) + ';;'); assert.equal(N.wifiPayload({ ssid: 'Open', type: 'nopass' }), 'WIFI:T:nopass;S:Open;;'); assert.equal(N.wifiPayload({ ssid: 'H', password: 'x', hidden: true }), 'WIFI:T:WPA;S:H;P:x;H:true;;'); assert.throws(() => N.wifiPayload({ ssid: '' }), /network name/); assert.throws(() => N.wifiPayload({ ssid: 'a' }), /password/);
  const v = N.vcardPayload({ first: 'Ann', last: 'Lee', org: 'Acme, Inc.', phone: '+49 30 1234-567', email: 'ann@example.com', street: 'Main St 1', city: 'Berlin', zip: '10115', country: 'Germany', note: 'a;b\nc' }); assert.ok(v.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\nN:Lee;Ann;;;\r\nFN:Ann Lee')); assert.match(v, /ORG:Acme\\, Inc\./); assert.match(v, /TEL;TYPE=WORK,VOICE:\+49301234567/); assert.match(v, /ADR;TYPE=WORK:;;Main St 1;Berlin;;10115;Germany/); { const B = String.fromCharCode(92); assert.ok(v.includes('NOTE:a' + B + ';b' + B + 'nc'), 'NOTE is escaped'); } assert.ok(v.endsWith('END:VCARD')); assert.throws(() => N.vcardPayload({}), /name or a company/);
  assert.equal(N.mailtoPayload({ to: 'a@b.co', subject: 'Hi there', body: 'x&y' }), 'mailto:a@b.co?subject=Hi%20there&body=x%26y'); assert.equal(N.mailtoPayload({ to: 'a@b.co' }), 'mailto:a@b.co'); assert.equal(N.smsPayload({ number: '+49 170 123', body: 'Hallo' }), 'SMSTO:+49170123:Hallo');
});
test('markdown table of contents', () => {
  const md = '# Title\n\nintro\n\n## Setup & Install\n```bash\n# not a heading\n```\n### `code` and *style*\n## Setup & Install\n#### too deep\n## [Link](http://x.y) text ##\n## Ünïcode Überschrift';
  const r = N.tocFromMarkdown(md, { minLevel: 1, maxLevel: 3 }); assert.deepEqual(r.items.map(i => i.slug), ['title', 'setup--install', 'code-and-style', 'setup--install-1', 'link-text', 'ünïcode-überschrift']); assert.equal(r.text.split('\n')[0], '- [Title](#title)'); assert.equal(r.text.split('\n')[1], '  - [Setup & Install](#setup--install)'); assert.equal(r.text.split('\n')[2], '    - [code and style](#code-and-style)');
  assert.equal(N.tocFromMarkdown('## A\n### B\n## C', { numbered: true }).text, '1. [A](#a)\n  1. [B](#b)\n2. [C](#c)'); assert.equal(N.tocFromMarkdown('no headings').text, ''); assert.equal(N.tocFromMarkdown('# A\n## B', { minLevel: 2 }).text, '- [B](#b)'); assert.equal(N.ghSlug('Hello, World! 2024'), 'hello-world-2024');
});
test('PERT estimation', () => {
  const t = N.pertTask({ o: 2, m: 5, p: 14 }); assert.equal(t.expected, 6); assert.equal(t.sd, 2); assert.equal(t.variance, 4); assert.equal(N.pertTask({ o: 4, m: 4, p: 4 }).sd, 0); assert.throws(() => N.pertTask({ o: 5, m: 2, p: 9 }), /optimistic ≤/);
  const p = N.pertProject([{ o: 2, m: 5, p: 14 }, { o: 1, m: 3, p: 5 }]); assert.equal(p.expected, 9); assert.ok(Math.abs(p.sd - Math.sqrt(4 + 4 / 9)) < 1e-9); assert.ok(Math.abs(p.intervals[95][0] - (9 - 1.96 * p.sd)) < 1e-9); assert.ok(Math.abs(p.probabilityBy(9) - 0.5) < 1e-6); assert.ok(p.probabilityBy(9 + p.sd) > 0.84 && p.probabilityBy(9 + p.sd) < 0.85); assert.ok(p.probabilityBy(0) < 0.01); assert.ok(Math.abs(p.percentile(90) - (9 + 1.2816 * p.sd)) < 1e-9);
  assert.ok(Math.abs(N.normalCdf(0) - 0.5) < 1e-14); assert.ok(Math.abs(N.normalCdf(1.96) - 0.9750021048517795) < 1e-12); assert.ok(Math.abs(N.normalCdf(-1) - 0.15865525393145707) < 1e-12); assert.ok(Math.abs(N.normalCdf(3) - 0.9986501019683699) < 1e-12); assert.equal(N.normalCdf(-9), 0); assert.equal(N.normalCdf(9), 1);
});
test('Secret Santa draws are valid derangements and respect exclusions', () => {
  const names = ['Ann', 'Ben', 'Cy', 'Di', 'Ed', 'Flo']; for (let i = 0; i < 200; i++) { const m = N.secretSanta(names); assert.deepEqual(Object.keys(m).sort(), [...names].sort()); assert.deepEqual(Object.values(m).sort(), [...names].sort()); assert.ok(names.every(n => m[n] !== n)); }
  for (let i = 0; i < 100; i++) { const m = N.secretSanta(names, { exclude: [['Ann', 'Ben'], ['Ben', 'Ann'], ['Cy', 'Di']] }); assert.notEqual(m.Ann, 'Ben'); assert.notEqual(m.Ben, 'Ann'); assert.notEqual(m.Cy, 'Di'); }
  assert.deepEqual(N.secretSanta(['A', 'B']), { A: 'B', B: 'A' }); assert.throws(() => N.secretSanta(['A', 'B'], { exclude: [['A', 'B']] }), /No valid assignment/); assert.throws(() => N.secretSanta(['A']), /at least two/);
  const counts = {}; for (let i = 0; i < 3000; i++) { const m = N.secretSanta(['A', 'B', 'C']); counts[m.A] = (counts[m.A] || 0) + 1; } assert.ok(counts.B > 1200 && counts.C > 1200, 'both derangements of three people occur equally: ' + JSON.stringify(counts));
});
test('tournament brackets', () => {
  assert.deepEqual(N.seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]); assert.deepEqual(N.seedOrder(4), [1, 4, 2, 3]); const b = N.singleElimination(['A', 'B', 'C', 'D', 'E', 'F']); assert.equal(b.size, 8); assert.equal(b.byes, 2); assert.equal(b.matches, 5); assert.equal(b.rounds.length, 3); assert.equal(b.rounds[0].filter(m => m.bye).length, 2);
  assert.equal(b.rounds[0][0].a.name, 'A'); assert.equal(b.rounds[0][0].bye, true); assert.equal(b.rounds[1][0].a.name, 'A', 'seed 1 advances on a bye'); assert.equal(b.rounds[0][1].a.seed, 4); assert.equal(b.rounds[0][1].b.seed, 5); const full = N.singleElimination(['1', '2', '3', '4']); assert.equal(full.byes, 0); assert.deepEqual(full.rounds.map(r => r.length), [2, 1]); assert.throws(() => N.singleElimination(['x']), /at least two/);
  const rr = N.roundRobin(['A', 'B', 'C', 'D']); assert.equal(rr.length, 3); const pairs = new Set(rr.flat().map(([a, b]) => [a, b].sort().join('-'))); assert.equal(pairs.size, 6); assert.ok(rr.every(r => new Set(r.flat()).size === 4)); const odd = N.roundRobin(['A', 'B', 'C', 'D', 'E']); assert.equal(odd.length, 5); assert.equal(new Set(odd.flat().map(([a, b]) => [a, b].sort().join('-'))).size, 10);
});
test('org chart layout', () => {
  const tree = parseOutline('CEO\n  CTO\n    Dev 1\n    Dev 2\n  CFO\n    Accountant'); const l = N.layoutTree(tree); assert.equal(l.nodes.length, 6); const by = Object.fromEntries(l.nodes.map(n => [n.text, n]));
  assert.equal(by.CEO.y, 0); assert.ok(by.CTO.y > by.CEO.y && by['Dev 1'].y > by.CTO.y); assert.equal(by.CTO.x, (by['Dev 1'].x + by['Dev 2'].x) / 2); assert.equal(by.CEO.x, (by.CTO.x + by.CFO.x) / 2); assert.equal(l.edges.length, 5);
  for (const row of Object.values(Object.groupBy ? Object.groupBy(l.nodes, n => n.depth) : {})) { const xs = row.map(n => n.x).sort((a, b) => a - b); for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= l.nodeW + 24 - 1e-9, 'no overlap'); }
  assert.equal(Math.min(...l.nodes.map(n => n.x)), 0); const forest = N.layoutTree(parseOutline('A\nB\n  B1')); assert.equal(forest.nodes.length, 3); assert.equal(forest.edges.length, 1); assert.ok(forest.width > 0 && forest.height > 0);
});
