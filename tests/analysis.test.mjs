import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../assets/js/tools/lib/analysis.js';

const SR = 22050;
const rms = a => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
const rnd = (() => { let a = 12345; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 - 0.5; }; })();
const sine = (f, n, amp = 0.3, sr = SR) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin(2 * Math.PI * f * i / sr));

test('FFT: a sine lands in the right bin and the inverse restores the signal', () => {
  const n = 1024, re = Float32Array.from(sine(SR / 16, n, 1)), im = new Float32Array(n), orig = Float32Array.from(re); A.fft(re, im);
  const mags = re.map((r, i) => Math.hypot(r, im[i])); const peak = mags.indexOf(Math.max(...mags.slice(0, n / 2))); assert.equal(peak, 64); A.fft(re, im, true); for (let i = 0; i < n; i += 97) assert.ok(Math.abs(re[i] - orig[i]) < 1e-4);
});
test('STFT → ISTFT reconstructs the signal', () => {
  const x = Float32Array.from({ length: 10000 }, (_, i) => Math.sin(i / 7) * 0.5 + (rnd() * 0.1)), y = A.istft(A.stft(x, 1024, 256)); let err = 0; for (let i = 600; i < 9400; i++) err = Math.max(err, Math.abs(x[i] - y[i])); assert.ok(err < 1e-3, 'max error ' + err);
});
test('noise reduction lowers hiss in pauses a lot and keeps the tone', () => {
  const n = SR * 4, sig = new Float32Array(n); for (let i = 0; i < n; i++) { const tone = i >= SR && i < SR * 3 ? 0.4 * Math.sin(2 * Math.PI * 440 * i / SR) + 0.2 * Math.sin(2 * Math.PI * 880 * i / SR) : 0; sig[i] = tone + rnd() * 0.12; }
  const [out] = A.reduceNoise([sig], SR, { reductionDb: 20, sensitivity: 2.5 }); const hissBefore = rms(sig.subarray(0, SR / 2)), hissAfter = rms(out.subarray(0, SR / 2));
  assert.ok(20 * Math.log10(hissBefore / hissAfter) > 12, `hiss reduced by ${20 * Math.log10(hissBefore / hissAfter)} dB`);
  const toneBefore = rms(sine(440, SR, 0.4)), mid = out.subarray(SR + 4000, SR * 3 - 4000); const spec = A.stft(mid, 2048, 2048), k = Math.round(440 * 2048 / SR), m = Math.hypot(spec.re[2][k], spec.im[2][k]); const mb = (() => { const s2 = A.stft(sig.subarray(SR + 4000, SR * 3 - 4000), 2048, 2048); return Math.hypot(s2.re[2][k], s2.im[2][k]); })(); void toneBefore;
  assert.ok(20 * Math.log10(m / mb) > -2, 'tone kept within 2 dB: ' + 20 * Math.log10(m / mb)); assert.equal(out.length, sig.length);
});
test('noise reduction with a chosen noise segment, and short input does not crash', () => {
  const x = Float32Array.from({ length: SR * 2 }, (_, i) => (i > SR ? 0.3 * Math.sin(i / 9) : 0) + rnd() * 0.1); const [o] = A.reduceNoise([x], SR, { noiseRange: [0, 0.8] }); assert.ok(rms(o.subarray(0, SR / 2)) < rms(x.subarray(0, SR / 2)) * 0.5);
  assert.equal(A.reduceNoise([new Float32Array(500)], SR)[0].length, 500);
});
const clicks = (bpm, secs, swing = 0) => { const x = new Float32Array(SR * secs), step = 60 / bpm; for (let t = 0, b = 0; t < secs; t += step, b++) { const at = Math.floor((t + (b % 2 ? swing * step : 0)) * SR); for (let k = 0; k < 400 && at + k < x.length; k++) x[at + k] += Math.sin(k * 0.6) * Math.exp(-k / 60) * 0.8; } return x; };
test('tempo detection on click tracks', () => {
  for (const bpm of [120, 93, 140, 75]) { const r = A.detectBpm(clicks(bpm, 20), SR); assert.ok(r, 'result'); const err = Math.min(Math.abs(r.bpm - bpm), Math.abs(r.bpm - bpm * 2), Math.abs(r.bpm - bpm / 2)); assert.ok(err < 1.2, `${bpm} → ${r.bpm}`); }
  const r = A.detectBpm(clicks(128, 20), SR); assert.ok(Math.abs(r.bpm - 128) < 1.2, 'exact 128: ' + r.bpm); assert.ok(r.candidates.length >= 1);
  assert.equal(A.detectBpm(new Float32Array(SR), SR), null, 'too short'); assert.ok(A.detectBpm(clicks(110, 20, 0.15), SR).bpm > 50);
});
const chord = (freqs, secs) => { const n = SR * secs, x = new Float32Array(n); for (const f of freqs) for (let h = 1; h <= 4; h++) for (let i = 0; i < n; i++) x[i] += Math.sin(2 * Math.PI * f * h * i / SR) * 0.2 / h; return x; };
const hz = (note, oct) => 440 * Math.pow(2, ((['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(note) + 12 * (oct + 1)) - 69) / 12);
test('key detection: major and minor triads, transposed', () => {
  const prog = (...chords) => { const parts = chords.map(c => chord(c, 3)); const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
  const cMaj = prog([hz('C', 4), hz('E', 4), hz('G', 4)], [hz('F', 4), hz('A', 4), hz('C', 5)], [hz('G', 4), hz('B', 4), hz('D', 5)], [hz('C', 4), hz('E', 4), hz('G', 4)]); let k = A.detectKey(cMaj, SR); assert.equal(k.key, 'C major'); assert.equal(k.camelot, '8B');
  const aMin = prog([hz('A', 3), hz('C', 4), hz('E', 4)], [hz('D', 4), hz('F', 4), hz('A', 4)], [hz('E', 4), hz('G#', 4), hz('B', 4)], [hz('A', 3), hz('C', 4), hz('E', 4)]); k = A.detectKey(aMin, SR); assert.equal(k.key, 'A minor'); assert.equal(k.camelot, '8A');
  const dMaj = prog([hz('D', 4), hz('F#', 4), hz('A', 4)], [hz('G', 4), hz('B', 4), hz('D', 5)], [hz('A', 4), hz('C#', 5), hz('E', 5)], [hz('D', 4), hz('F#', 4), hz('A', 4)]); assert.equal(A.detectKey(dMaj, SR).key, 'D major'); assert.equal(A.detectKey(new Float32Array(SR), SR), null);
});
