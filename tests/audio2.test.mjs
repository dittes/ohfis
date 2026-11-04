import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as A from '../assets/js/tools/lib/audio.js';
import { encodeMp3, toInt16 } from '../assets/js/tools/lib/mp3.js';

const sine = (f, sr, n, amp = 0.5) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin(2 * Math.PI * f * i / sr));
const rms = a => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);

test('reverse flips the samples and is its own inverse', () => {
  const c = [Float32Array.from([1, 2, 3, 4])]; assert.deepEqual([...A.reverse(c)[0]], [4, 3, 2, 1]); assert.deepEqual([...A.reverse(A.reverse(c))[0]], [1, 2, 3, 4]);
});
test('cutRange keeps or removes a time range', () => {
  const c = [Float32Array.from({ length: 10 }, (_, i) => i)]; // sr 10 → 1 s
  assert.deepEqual([...A.cutRange(c, 10, 0.2, 0.5)[0]], [2, 3, 4]);
  assert.deepEqual([...A.cutRange(c, 10, 0.2, 0.5, 'remove')[0]], [0, 1, 5, 6, 7, 8, 9]);
  assert.equal(A.cutRange(c, 10, 5, 9)[0].length, 0, 'out of range gives empty');
  assert.equal(A.cutRange(c, 10, 0.8, 0.2)[0].length, 0, 'end before start gives empty');
});
test('concat joins tracks, matches channels and crossfades', () => {
  const a = [Float32Array.from([1, 1, 1, 1])], b = [Float32Array.from([1, 1, 1, 1]), Float32Array.from([2, 2, 2, 2])];
  const j = A.concat([a, b], 1000); assert.equal(j.length, 2); assert.equal(j[0].length, 8); assert.deepEqual([...j[1].slice(0, 4)], [1, 1, 1, 1], 'mono track duplicated');
  const x = A.concat([[new Float32Array(1000).fill(1)], [new Float32Array(1000).fill(1)]], 1000, 100); assert.equal(x[0].length, 1900);
  for (let i = 900; i < 1000; i++) assert.ok(x[0][i] >= 0.99 && x[0][i] <= 1.42, `equal-power sum of two equal signals peaks at 1.414: ${x[0][i]}`);
});
test('biquad peak boosts the centre frequency by the requested dB and leaves far frequencies alone', () => {
  const k = A.biquad('peak', 44100, 1000, 6, 1); const db = f => 20 * Math.log10(A.biquadMagnitude(k, 44100, f));
  assert.ok(Math.abs(db(1000) - 6) < 0.05); assert.ok(Math.abs(db(50)) < 0.3); assert.ok(Math.abs(db(15000)) < 0.3);
});
test('shelves: low shelf lifts lows, high shelf lifts highs', () => {
  const lo = A.biquad('lowshelf', 44100, 100, 9, 0.707), hi = A.biquad('highshelf', 44100, 8000, -9, 0.707); const db = (k, f) => 20 * Math.log10(A.biquadMagnitude(k, 44100, f));
  assert.ok(db(lo, 20) > 8.5 && db(lo, 5000) < 0.5); assert.ok(db(hi, 18000) < -8.5 && db(hi, 200) > -0.5);
});
test('applyEq changes the level of a tone in the boosted band only', () => {
  const sr = 44100, t1k = [sine(1000, sr, sr)], t60 = [sine(60, sr, sr)]; const g = [0, 0, 12, 0, 0];
  const r1 = rms(A.applyEq(t1k, sr, g)[0].subarray(sr / 2)) / rms(t1k[0].subarray(sr / 2)); const r2 = rms(A.applyEq(t60, sr, g)[0].subarray(sr / 2)) / rms(t60[0].subarray(sr / 2));
  assert.ok(Math.abs(20 * Math.log10(r1) - 12) < 0.4, `1 kHz +12 dB, got ${20 * Math.log10(r1)}`); assert.ok(Math.abs(20 * Math.log10(r2)) < 0.8);
  assert.equal(A.applyEq(t1k, sr, [0, 0, 0, 0, 0])[0], t1k[0], 'flat curve returns the input untouched');
});
test('limitPeak only scales when the signal would clip', () => {
  assert.equal(A.limitPeak([Float32Array.from([0.5, -0.4])]).gain, 1);
  const r = A.limitPeak([Float32Array.from([2, -1])]); assert.ok(Math.abs(A.peak(r.chs) - 0.999) < 1e-6);
});
test('MP3 encoder produces frames with a valid header and a sensible size', async () => {
  const ctx = {}; vm.createContext(ctx); vm.runInContext(readFileSync(new URL('../assets/vendor/lamejs/lame.min.js', import.meta.url), 'utf8'), ctx);
  const sr = 44100, data = await encodeMp3([sine(440, sr, sr * 2), sine(660, sr, sr * 2)], sr, 128, ctx.lamejs);
  assert.ok(data[0] === 0xff && (data[1] & 0xe0) === 0xe0, 'frame sync');
  assert.ok(Math.abs(data.length - 2 * 128000 / 8) < 6000, `about 32 KB for 2 s at 128 kbps, got ${data.length}`);
  assert.equal(toInt16(Float32Array.from([1, -1, 0]))[0], 32767);
});
