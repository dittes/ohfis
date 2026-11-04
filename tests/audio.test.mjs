import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../assets/js/tools/lib/audio.js';

const sine = (n, amp = 0.5, f = 440, sr = 8000) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin(2 * Math.PI * f * i / sr));
test('peak gain normalises to target', () => {
  const chs = [sine(800, 0.25)]; const g = A.peakGain(chs, -1); const out = A.applyGain(chs, g); assert.ok(Math.abs(A.gainToDb(A.peak(out)) + 1) < 0.01);
});
test('rms gain never exceeds the ceiling', () => {
  const chs = [Float32Array.from([0.9, -0.9, 0.001, 0.001])]; const out = A.applyGain(chs, A.rmsGain(chs, -3, -1)); assert.ok(A.gainToDb(A.peak(out)) <= -0.99);
});
test('silence bounds trim edges and keep padding', () => {
  const sr = 1000, a = new Float32Array(3000); for (let i = 1000; i < 2000; i++) a[i] = 0.5; const b = A.silenceBounds([a], sr, -40, 100); assert.deepEqual(b, { start: 900, end: 2100 });
  assert.deepEqual(A.silenceBounds([new Float32Array(100)], sr), { start: 0, end: 0 });
});
test('removeSilences shortens long gaps only', () => {
  const sr = 1000, a = new Float32Array(4000); for (let i = 0; i < 500; i++) a[i] = 0.5; for (let i = 3500; i < 4000; i++) a[i] = 0.5; a[1000] = 0.5;
  const [o] = A.removeSilences([a], sr, -40, 500, 100); assert.ok(o.length < 4000 && o.length > 1200, String(o.length)); const short = new Float32Array(1000); short[0] = 1; short[999] = 1; assert.equal(A.removeSilences([short], sr, -40, 2000, 100)[0].length, 1000);
});
test('invert, mono, pan', () => {
  const [i] = A.invert([Float32Array.from([0.5, -0.25])]); assert.deepEqual([...i], [-0.5, 0.25]); assert.deepEqual([...A.toMono([Float32Array.from([1, 0]), Float32Array.from([0, 1])])[0]], [0.5, 0.5]);
  const [l, r] = A.pan([Float32Array.from([1])], -1); assert.ok(Math.abs(l[0] - 1) < 1e-6 && Math.abs(r[0]) < 1e-6); const [l2, r2] = A.pan([Float32Array.from([1])], 0); assert.ok(Math.abs(l2[0] - r2[0]) < 1e-6 && Math.abs(l2[0] ** 2 + r2[0] ** 2 - 1) < 1e-6);
});
test('resample changes length by the ratio and pitch', () => {
  const [o] = A.resample([sine(8000)], 2); assert.equal(o.length, 4000); assert.ok(Math.abs(A.semitonesToRatio(12) - 2) < 1e-12);
  let zc = 0; for (let i = 1; i < o.length; i++) if (o[i - 1] < 0 && o[i] >= 0) zc++; assert.ok(Math.abs(zc - 440) < 4, 'zero crossings ' + zc);
});
test('wav round trip', () => {
  const chs = [sine(100), sine(100, 0.25, 220)]; const w = A.encodeWav(chs, 8000); assert.equal(String.fromCharCode(...w.slice(0, 4)), 'RIFF'); assert.equal(w.length, 44 + 100 * 2 * 2); const d = A.decodeWav(w); assert.equal(d.sr, 8000); assert.equal(d.chs.length, 2);
  for (let i = 0; i < 100; i++) assert.ok(Math.abs(d.chs[0][i] - chs[0][i]) < 1e-3);
  const f = A.decodeWav(A.encodeWav(chs, 8000, 32)); assert.ok(Math.abs(f.chs[1][7] - chs[1][7]) < 1e-6);
});
test('fades reach zero at the ends', () => { const [o] = A.fadeInOut([new Float32Array(1000).fill(1)], 1000, 100, 100); assert.equal(o[0], 0); assert.equal(o[999], 0); assert.equal(o[500], 1); });
