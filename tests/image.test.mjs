import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../assets/js/tools/lib/image.js';

const bytes = (...parts) => Uint8Array.from(parts.flat());
const str = s => [...s].map(c => c.charCodeAt(0));
const be16 = n => [n >> 8, n & 255], le32 = n => [n & 255, n >> 8 & 255, n >> 16 & 255, n >>> 24], be32 = n => [n >>> 24, n >> 16 & 255, n >> 8 & 255, n & 255];

// A TIFF block with Make, Orientation and GPS (52°30'N, 13°24'E, 34 m)
function exifTiff(le = false) {
  const w16 = n => le ? [n & 255, n >> 8] : be16(n), w32 = n => le ? le32(n) : be32(n); const e = (tag, type, count, val) => [...w16(tag), ...w16(type), ...w32(count), ...val];
  const make = str('Canon\0'); const ifd0Off = 8; const nIfd0 = 3; const ifd0Len = 2 + nIfd0 * 12 + 4; const makeOff = ifd0Off + ifd0Len; const gpsOff = makeOff + make.length; const ifd0 = [...w16(nIfd0), ...e(0x010F, 2, make.length, w32(makeOff)), ...e(0x0112, 3, 1, [...w16(6), 0, 0]), ...e(0x8825, 4, 1, w32(gpsOff)), ...w32(0)];
  const rat = (n, d) => [...w32(n), ...w32(d)]; const nG = 5; const gLen = 2 + nG * 12 + 4; const latOff = gpsOff + gLen, lonOff = latOff + 24, altOff = lonOff + 24;
  const gps = [...w16(nG), ...e(1, 2, 2, [78, 0, 0, 0]), ...e(2, 5, 3, w32(latOff)), ...e(3, 2, 2, [69, 0, 0, 0]), ...e(4, 5, 3, w32(lonOff)), ...e(6, 5, 1, w32(altOff)), ...w32(0)];
  return [...(le ? str('II') : str('MM')), ...w16(42), ...w32(8), ...ifd0, ...make, ...gps, ...rat(52, 1), ...rat(30, 1), ...rat(0, 1), ...rat(13, 1), ...rat(24, 1), ...rat(0, 1), ...rat(34, 1)];
}
const jpegWith = (le) => { const exif = [...str('Exif\0\0'), ...exifTiff(le)]; return bytes([0xFF, 0xD8], [0xFF, 0xE0, ...be16(16), ...str('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0], [0xFF, 0xE1, ...be16(exif.length + 2), ...exif], [0xFF, 0xE1, ...be16(2 + 29 + 4), ...str('http://ns.adobe.com/xap/1.0/\0'), ...str('abcd')], [0xFF, 0xED, ...be16(8), ...str('Phot'), 0, 0], [0xFF, 0xFE, ...be16(7), ...str('hello')], [0xFF, 0xDB, ...be16(4), 1, 2], [0xFF, 0xC0, ...be16(4), 1, 2], [0xFF, 0xDA, ...be16(4), 0, 0], [1, 2, 3, 0xFF, 0x00, 4], [0xFF, 0xD9]); };

test('EXIF reading: camera, orientation and GPS in both byte orders', () => {
  for (const le of [false, true]) { const x = M.readExif(jpegWith(le)); assert.equal(x.Make, 'Canon'); assert.equal(x.Orientation, 6); assert.deepEqual(x.gps, { lat: 52.5, lon: 13.4, alt: 34 }); }
  assert.equal(M.readExif(bytes([0xFF, 0xD8, 0xFF, 0xD9])), null); assert.equal(M.readExif(bytes(str('not an image'))), null);
});
test('JPEG metadata stripping removes EXIF, XMP, IPTC and comments but keeps pixels and structure', () => {
  const src = jpegWith(false); const r = M.stripMetadata(src, { keepOrientation: false }); assert.equal(r.type, 'jpeg'); assert.deepEqual(r.removed.sort(), ['Comment', 'EXIF (camera, date, GPS)', 'IPTC / Photoshop', 'XMP'].sort());
  assert.equal(M.readExif(r.bytes), null); assert.ok(r.bytes.length < src.length); assert.equal(r.bytes[0], 0xFF); assert.equal(r.bytes[1], 0xD8); const s = String.fromCharCode(...r.bytes); assert.ok(s.includes('JFIF'), 'APP0 kept'); assert.ok(!s.includes('Canon') && !s.includes('hello') && !s.includes('adobe'));
  const tail = [0xFF, 0xDA, ...be16(4), 0, 0, 1, 2, 3, 0xFF, 0x00, 4, 0xFF, 0xD9]; assert.deepEqual([...r.bytes.slice(-tail.length)], tail, 'scan data identical');
  const kept = M.stripMetadata(src); const ex = M.readExif(kept.bytes); assert.equal(ex.Orientation, 6, 'orientation survives so the picture is not rotated'); assert.equal(ex.gps, undefined); assert.equal(ex.Make, undefined);
  assert.throws(() => M.stripMetadata(bytes([0xFF, 0xD8, 0x00, 0x00])), /unexpected structure/);
});
test('PNG and WebP metadata stripping', () => {
  const chunk = (t, d) => [...be32(d.length), ...str(t), ...d, 0, 0, 0, 0]; const png = bytes([0x89, ...str('PNG'), 13, 10, 26, 10], chunk('IHDR', Array(13).fill(0)), chunk('tEXt', str('Author\0Ann')), chunk('eXIf', exifTiff()), chunk('iCCP', str('icc')), chunk('tIME', Array(7).fill(0)), chunk('IDAT', [1, 2, 3]), chunk('IEND', []));
  let r = M.stripMetadata(png); assert.equal(r.type, 'png'); assert.deepEqual(r.removed.sort(), ['EXIF (camera, GPS)', 'Modification time', 'Text comments'].sort()); const s = String.fromCharCode(...r.bytes); assert.ok(!s.includes('Author') && s.includes('iCCP') && s.includes('IDAT') && s.endsWith('\0\0\0\0')); assert.deepEqual(M.readExif(png).gps, { lat: 52.5, lon: 13.4, alt: 34 }); assert.equal(M.readExif(r.bytes), null);
  assert.ok(!String.fromCharCode(...M.stripMetadata(png, { keepIcc: false }).bytes).includes('iCCP'));
  const rc = (t, d) => [...str(t), ...le32(d.length), ...d, ...(d.length & 1 ? [0] : [])]; const body = [...str('WEBP'), ...rc('VP8X', [0x2C, 0, 0, 0, 1, 0, 0, 1, 0, 0]), ...rc('VP8 ', [9, 9, 9, 9]), ...rc('EXIF', [...str('Exif\0\0'), ...exifTiff()]), ...rc('XMP ', str('xmpdata'))]; const webp = bytes(str('RIFF'), le32(body.length), body);
  r = M.stripMetadata(webp); assert.equal(r.type, 'webp'); assert.deepEqual(r.removed.sort(), ['EXIF (camera, GPS)', 'XMP']); assert.equal(String.fromCharCode(...r.bytes.slice(0, 4)), 'RIFF'); assert.equal(new DataView(r.bytes.buffer).getUint32(4, true), r.bytes.length - 8); assert.equal(r.bytes[20] & 0x0C, 0, 'VP8X flags for EXIF and XMP cleared'); assert.ok(!String.fromCharCode(...r.bytes).includes('xmpdata')); assert.equal(M.readExif(webp).Make, 'Canon');
  assert.equal(M.stripMetadata(bytes(str('GIF89a'), [1, 2])).type, 'gif'); assert.equal(M.detectType(bytes([1, 2, 3])), 'unknown');
});
test('palette extraction finds the dominant colours', () => {
  const px = new Uint8ClampedArray(100 * 4); for (let i = 0; i < 100; i++) { const c = i < 60 ? [200, 30, 30] : i < 90 ? [30, 30, 200] : [240, 240, 240]; px.set([...c, 255], i * 4); } const p = M.extractPalette(px, 3);
  assert.equal(p.length, 3); assert.deepEqual([p[0].r, p[0].g, p[0].b], [200, 30, 30]); assert.ok(Math.abs(p[0].share - 0.6) < 1e-9); assert.deepEqual([p[1].r, p[1].g, p[1].b], [30, 30, 200]); assert.equal(M.extractPalette(new Uint8ClampedArray(0), 3).length, 0);
  const t = new Uint8ClampedArray([10, 10, 10, 0, 50, 60, 70, 255]); assert.equal(M.extractPalette(t, 4).length, 1); assert.equal(M.extractPalette(new Uint8ClampedArray(40).fill(255), 5).length, 1);
});
test('pixel operations', () => {
  const w = 4, h = 4; const mk = () => { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < 16; i++) d.set([i * 16, 0, 0, 255], i * 4); return d; };
  let d = mk(); M.pixelate(d, w, h, 0, 0, 2, 2, 2); assert.equal(d[0], d[4]); assert.equal(d[0], (0 + 16 + 64 + 80) / 4); assert.equal(d[(2 * 4 + 2) * 4], mk()[(2 * 4 + 2) * 4], 'outside untouched');
  d = mk(); M.fillRect(d, w, h, 1, 1, 3, 3, [0, 255, 0]); assert.deepEqual([...d.slice(20, 24)], [0, 255, 0, 255]); assert.deepEqual([...d.slice(0, 4)], [0, 0, 0, 255]); M.fillRect(d, w, h, -5, -5, 100, 100, [1, 2, 3]); assert.deepEqual([...d.slice(60, 64)], [1, 2, 3, 255]);
  d = new Uint8ClampedArray(5 * 1 * 4); for (let i = 0; i < 5; i++) d.set([i === 2 ? 255 : 0, 0, 0, 255], i * 4); M.boxBlur(d, 5, 1, 0, 0, 5, 1, 1); assert.ok(d[2 * 4] < 255 && d[1 * 4] > 0 && d[3 * 4] > 0); const sum = [0, 1, 2, 3, 4].reduce((s, i) => s + d[i * 4], 0); assert.ok(Math.abs(sum - 255) < 40, 'blur roughly preserves brightness: ' + sum);
  const a = new Uint8ClampedArray([10, 10, 10, 255, 100, 100, 100, 255]), b = new Uint8ClampedArray([10, 10, 10, 255, 200, 100, 100, 255]); const r = M.diffImages(a, b, 2, 1); assert.equal(r.changed, 1); assert.equal(r.percent, 50); assert.deepEqual([...r.data.slice(4, 8)], [255, 0, 255, 255]); assert.equal(M.diffImages(a, a, 2, 1).changed, 0); assert.equal(M.diffImages(a, b, 2, 1, { threshold: 200 }).changed, 0);
  const t = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]); M.duotone(t, [10, 20, 30], [200, 210, 220]); assert.deepEqual([...t], [10, 20, 30, 255, 200, 210, 220, 255]); M.invert(t); assert.deepEqual([...t.slice(0, 4)], [245, 235, 225, 255]);
});
test('geometry helpers', () => {
  assert.deepEqual(M.fitSize(4000, 3000, { maxW: 1000 }), { w: 1000, h: 750 }); assert.deepEqual(M.fitSize(4000, 3000, { maxW: 1000, maxH: 500 }), { w: 667, h: 500 }); assert.deepEqual(M.fitSize(800, 600, { maxW: 1000 }), { w: 800, h: 600 }); assert.deepEqual(M.fitSize(800, 600, { percent: 50 }), { w: 400, h: 300 }); assert.deepEqual(M.fitSize(800, 600, { exactW: 400 }), { w: 400, h: 300 }); assert.deepEqual(M.fitSize(800, 600, { exactW: 100, exactH: 100 }), { w: 100, h: 100 }); assert.deepEqual(M.fitSize(800, 600, { exactW: 1600 }), { w: 1600, h: 1200 }); assert.deepEqual(M.fitSize(10, 10, { maxW: 0 }), { w: 10, h: 10 });
  assert.deepEqual(M.padToRatio(1000, 1000, 16 / 9), { w: 1778, h: 1000, x: 389, y: 0 }); assert.deepEqual(M.padToRatio(1600, 600, 1), { w: 1600, h: 1600, x: 0, y: 500 }); assert.deepEqual(M.padToRatio(1600, 900, 16 / 9), { w: 1600, h: 900, x: 0, y: 0 }); assert.deepEqual(M.rotatedBounds(100, 50, 90), { w: 50, h: 100 }); assert.deepEqual(M.rotatedBounds(100, 100, 45), { w: 141, h: 141 });
  const ico = M.buildICO([{ size: 16, png: bytes([1, 2, 3]) }, { size: 256, png: bytes([4, 5]) }]); const dv = new DataView(ico.buffer); assert.equal(dv.getUint16(2, true), 1); assert.equal(dv.getUint16(4, true), 2); assert.equal(ico[6], 16); assert.equal(ico[22], 0); assert.equal(dv.getUint32(6 + 12, true), 38); assert.equal(dv.getUint32(22 + 12, true), 41); assert.deepEqual([...ico.slice(38)], [1, 2, 3, 4, 5]); assert.equal(M.mimeToExt('image/webp'), 'webp');
});
