import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import * as F from '../assets/vendor/fflate/fflate.js';
import * as Z from '../assets/js/tools/lib/archive.js';
import * as T from '../assets/js/tools/lib/font.js';

const enc = s => new TextEncoder().encode(s);

test('safePath removes traversal, drive letters and leading slashes', () => {
  assert.equal(Z.safePath('../../etc/passwd'), 'etc/passwd'); assert.equal(Z.safePath('C:\\Windows\\a.txt'), 'Windows/a.txt'); assert.equal(Z.safePath('/abs/x'), 'abs/x'); assert.equal(Z.safePath('a/./b//c'), 'a/b/c'); assert.equal(Z.safePath('..'), '');
});
test('zip round trip: build, list without extracting, read one entry, duplicate names, stored types', () => {
  const big = enc('hello '.repeat(1000));
  const zip = Z.buildZip(F, [{ name: 'a.txt', data: big }, { name: 'a.txt', data: enc('second') }, { name: 'pics/x.jpg', data: enc('jpgdata') }, { name: '../evil.txt', data: enc('x') }]);
  const list = Z.listZip(F, zip); assert.deepEqual(list.map(e => e.path), ['a (2).txt', 'a.txt', 'evil.txt', 'pics/x.jpg']);
  const a = list.find(e => e.path === 'a.txt'); assert.equal(a.size, big.length); assert.ok(a.packed < 200, 'text is compressed');
  const j = list.find(e => e.path === 'pics/x.jpg'); assert.equal(j.size, j.packed, 'jpg is stored');
  assert.equal(new TextDecoder().decode(Z.readEntry(F, zip, 'a (2).txt')), 'second');
  assert.deepEqual(Z.warnings(list), []);
});
test('warnings flag unsafe paths and absurd compression ratios', () => {
  assert.equal(Z.warnings([{ path: '../x', size: 1, packed: 1, dir: false }])[0].type, 'path');
  assert.equal(Z.warnings([{ path: 'a', size: 100 * 1024 * 1024 * 10, packed: 1000, dir: false }]).some(w => w.type === 'ratio'), true);
});
test('WOFF round trip keeps every table byte for byte and the font valid', () => {
  const ttf = new Uint8Array(readFileSync(new URL('../assets/vendor/fonts/DejaVuSans.ttf', import.meta.url)));
  assert.equal(T.detect(ttf), 'ttf'); const woff = T.sfntToWoff(F, ttf); assert.equal(T.detect(woff), 'woff'); assert.ok(woff.length < ttf.length * 0.7, `woff smaller: ${woff.length} vs ${ttf.length}`);
  const back = T.woffToSfnt(F, woff), a = T.readTables(ttf), b = T.readTables(back); assert.deepEqual(b.map(t => t.tag), a.map(t => t.tag).sort());
  for (const t of a) { const u = b.find(x => x.tag === t.tag); assert.deepEqual(back.subarray(u.offset, u.offset + u.length), ttf.subarray(t.offset, t.offset + t.length), t.tag); }
  const info = T.fontInfo(F, woff); assert.equal(info.family, 'DejaVu Sans'); assert.ok(info.glyphs > 3000);
});
test('the generated WOFF is accepted by fontTools (independent reader), if installed', t => {
  let py; try { execFileSync('python3', ['-c', 'import fontTools']); py = true; } catch { py = false; } if (!py) return t.skip('fontTools not installed');
  const ttf = new Uint8Array(readFileSync(new URL('../assets/vendor/fonts/DejaVuSans.ttf', import.meta.url))), dir = mkdtempSync(join(tmpdir(), 'font-')); const wf = join(dir, 'a.woff'); writeFileSync(wf, T.sfntToWoff(F, ttf));
  const out = execFileSync('python3', ['-c', 'import sys;from fontTools.ttLib import TTFont;f=TTFont(sys.argv[1]);print(f.flavor, f["name"].getDebugName(1), len(f.getGlyphOrder()))', wf]).toString().trim(); assert.match(out, /^woff DejaVu Sans \d+$/);
  const ttfBack = join(dir, 'b.ttf'); writeFileSync(ttfBack, T.woffToSfnt(F, T.sfntToWoff(F, ttf))); assert.match(execFileSync('python3', ['-c', 'import sys;from fontTools.ttLib import TTFont;f=TTFont(sys.argv[1]);print(f.flavor, f["head"].unitsPerEm)', ttfBack]).toString(), /^None 2048/);
});
test('font errors are clear', () => {
  assert.throws(() => T.sfntToWoff(F, enc('this is not a font file at all')), /does not look like/);
  const w2 = new Uint8Array(40); w2.set(enc('wOF2')); assert.throws(() => T.woffToSfnt(F, w2), /Brotli/); assert.throws(() => T.woffToSfnt(F, new Uint8Array(40)), /not a WOFF/);
});

test('tar reading: names, sizes, folders, long names, and format sniffing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tar-')); execFileSync('sh', ['-c', `cd ${dir} && mkdir -p sub && echo hello > sub/a.txt && head -c 3000 /dev/zero > b.bin && mkdir -p ${'x'.repeat(60)}/${'y'.repeat(60)} && echo long > ${'x'.repeat(60)}/${'y'.repeat(60)}/file-with-a-long-name.txt && tar --format=gnu -cf t.tar sub b.bin x* && tar --format=ustar -cf u.tar sub b.bin && gzip -k t.tar`]);
  const t = new Uint8Array(readFileSync(join(dir, 't.tar'))), u = new Uint8Array(readFileSync(join(dir, 'u.tar')));
  assert.equal(Z.sniff(u), 'tar'); const lu = Z.listTar(u); assert.deepEqual(lu.filter(e => !e.dir).map(e => e.path).sort(), ['b.bin', 'sub/a.txt']);
  assert.equal(new TextDecoder().decode(Z.readTarEntry(u, lu.find(e => e.path === 'sub/a.txt'))), 'hello\n'); assert.equal(lu.find(e => e.path === 'b.bin').size, 3000);
  const lt = Z.listTar(t); assert.ok(lt.some(e => e.path.endsWith('file-with-a-long-name.txt') && e.path.length > 120), 'GNU long name');
  assert.equal(Z.sniff(new Uint8Array(readFileSync(join(dir, 't.tar.gz')))), 'gz'); assert.equal(Z.sniff(F.zipSync({ a: enc('x') })), 'zip'); assert.equal(Z.sniff(new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 7, 0])), 'rar');
});
