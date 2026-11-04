// audio.js — pure audio processing on arrays of Float32Array channels (no Web Audio needed, so it is unit-testable).
export const dbToGain = db => Math.pow(10, db / 20);
export const gainToDb = g => (g > 0 ? 20 * Math.log10(g) : -Infinity);
export const peak = chs => { let p = 0; for (const c of chs) for (let i = 0; i < c.length; i++) { const v = Math.abs(c[i]); if (v > p) p = v; } return p; };
export const rms = chs => { let s = 0, n = 0; for (const c of chs) { for (let i = 0; i < c.length; i++) s += c[i] * c[i]; n += c.length; } return n ? Math.sqrt(s / n) : 0; };

/** Gain (linear) that brings the peak to targetDb (dBFS). */
export const peakGain = (chs, targetDb = -1) => { const p = peak(chs); return p > 0 ? dbToGain(targetDb) / p : 1; };
/** Gain that brings the RMS level to targetDb, limited so the peak never exceeds ceilingDb. */
export const rmsGain = (chs, targetDb = -16, ceilingDb = -1) => { const r = rms(chs), p = peak(chs); if (!r) return 1; return Math.min(dbToGain(targetDb) / r, p ? dbToGain(ceilingDb) / p : Infinity); };
export const applyGain = (chs, g) => chs.map(c => { const o = new Float32Array(c.length); for (let i = 0; i < c.length; i++) o[i] = Math.max(-1, Math.min(1, c[i] * g)); return o; });

/** Find the sample range [start, end) that remains after removing leading/trailing silence (keepMs of padding stays). */
export function silenceBounds(chs, sr, thresholdDb = -50, keepMs = 100) {
  const thr = dbToGain(thresholdDb), n = chs[0]?.length || 0; let a = 0, b = n;
  const loud = i => { for (const c of chs) if (Math.abs(c[i]) > thr) return true; return false; };
  while (a < n && !loud(a)) a++; if (a === n) return { start: 0, end: 0 };
  while (b > a && !loud(b - 1)) b--; const keep = Math.round(keepMs / 1000 * sr);
  return { start: Math.max(0, a - keep), end: Math.min(n, b + keep) };
}
/** Remove silent stretches longer than minMs inside the audio, keeping keepMs of each. Returns new channels. */
export function removeSilences(chs, sr, thresholdDb = -50, minMs = 500, keepMs = 150) {
  const thr = dbToGain(thresholdDb), n = chs[0].length, minLen = Math.round(minMs / 1000 * sr), keep = Math.round(keepMs / 1000 * sr); const cut = new Uint8Array(n);
  let i = 0; while (i < n) { let loud = false; for (const c of chs) if (Math.abs(c[i]) > thr) { loud = true; break; } if (loud) { i++; continue; } let j = i; while (j < n) { let l = false; for (const c of chs) if (Math.abs(c[j]) > thr) { l = true; break; } if (l) break; j++; } if (j - i >= minLen) for (let k = i + keep; k < j - keep; k++) cut[k] = 1; i = j; }
  let m = 0; for (let k = 0; k < n; k++) if (!cut[k]) m++; return chs.map(c => { const o = new Float32Array(m); let p = 0; for (let k = 0; k < n; k++) if (!cut[k]) o[p++] = c[k]; return o; });
}
export const slice = (chs, a, b) => chs.map(c => c.slice(a, b));
export const invert = chs => chs.map(c => c.map(v => -v));
export const toMono = chs => { const n = chs[0].length, o = new Float32Array(n); for (const c of chs) for (let i = 0; i < n; i++) o[i] += c[i] / chs.length; return [o]; };
/** Equal-power pan of a (mono-summed) signal: pan -1 (left) … +1 (right). */
export function pan(chs, p) { const m = chs.length === 1 ? chs[0] : toMono(chs)[0]; const a = (p + 1) * Math.PI / 4, l = Math.cos(a), r = Math.sin(a); return [m.map(v => v * l), m.map(v => v * r)]; }
/** Resample by playback ratio (>1 faster and higher). Linear interpolation. */
export function resample(chs, ratio) { return chs.map(c => { const n = Math.max(1, Math.floor(c.length / ratio)), o = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * ratio, k = Math.floor(x), f = x - k; o[i] = c[k] * (1 - f) + (c[k + 1] ?? c[k]) * f; } return o; }); }
export const semitonesToRatio = st => Math.pow(2, st / 12);
export const fadeInOut = (chs, sr, inMs = 0, outMs = 0) => chs.map(c => { const o = c.slice(), a = Math.round(inMs / 1000 * sr), b = Math.round(outMs / 1000 * sr); for (let i = 0; i < Math.min(a, o.length); i++) o[i] *= i / a; for (let i = 0; i < Math.min(b, o.length); i++) o[o.length - 1 - i] *= i / b; return o; });

/** Encode channels as a 16-bit PCM (or 32-bit float) WAV file. */
export function encodeWav(chs, sr, bits = 16) {
  const ch = chs.length, n = chs[0].length, bps = bits / 8, data = n * ch * bps, buf = new ArrayBuffer(44 + data), v = new DataView(buf); const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + data, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, bits === 32 ? 3 : 1, true); v.setUint16(22, ch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * ch * bps, true); v.setUint16(32, ch * bps, true); v.setUint16(34, bits, true); w(36, 'data'); v.setUint32(40, data, true);
  let o = 44; for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, chs[c][i])); if (bits === 32) { v.setFloat32(o, s, true); } else v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += bps; }
  return new Uint8Array(buf);
}
/** Minimal WAV reader for tests (PCM16/float32). */
export function decodeWav(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); const ch = v.getUint16(22, true), sr = v.getUint32(24, true), bits = v.getUint16(34, true), fmt = v.getUint16(20, true); const n = (v.getUint32(40, true)) / (ch * bits / 8); const chs = Array.from({ length: ch }, () => new Float32Array(n)); let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { chs[c][i] = fmt === 3 ? v.getFloat32(o, true) : v.getInt16(o, true) / (v.getInt16(o, true) < 0 ? 0x8000 : 0x7fff); o += bits / 8; }
  return { chs, sr };
}
/** Level of a signal frame in dBFS (rms). */
export const frameDb = (arr) => { let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i] * arr[i]; const r = Math.sqrt(s / (arr.length || 1)); return r > 0 ? 20 * Math.log10(r) : -120; };

// ── Cut, join, reverse, equaliser ───────────────────────────────────────────
export const reverse = chs => chs.map(c => { const o = new Float32Array(c.length); for (let i = 0, n = c.length; i < n; i++) o[i] = c[n - 1 - i]; return o; });

/** Keep the part between two times (seconds). With mode "remove" the part is cut out instead and the rest is joined. */
export function cutRange(chs, sr, startS, endS, mode = 'keep') {
  const n = chs[0].length, a = Math.max(0, Math.min(n, Math.round(startS * sr))), b = Math.max(a, Math.min(n, Math.round(endS * sr)));
  if (mode === 'keep') return chs.map(c => c.slice(a, b));
  return chs.map(c => { const o = new Float32Array(n - (b - a)); o.set(c.subarray(0, a), 0); o.set(c.subarray(b), a); return o; });
}

/** Make mono tracks stereo (or any track match the widest one) so that tracks can be joined. */
export function matchChannels(tracks) {
  const w = Math.max(...tracks.map(t => t.length));
  return tracks.map(t => t.length === w ? t : Array.from({ length: w }, (_, i) => t[Math.min(i, t.length - 1)]));
}

/** Join tracks one after another; crossfadeMs > 0 overlaps neighbouring tracks with an equal-power fade. All tracks must share a sample rate. */
export function concat(tracks, sr, crossfadeMs = 0) {
  tracks = matchChannels(tracks); const w = tracks[0].length;
  const xf = Math.round(crossfadeMs / 1000 * sr);
  let total = 0; tracks.forEach((t, i) => { total += t[0].length; if (i && xf) total -= Math.min(xf, t[0].length, tracks[i - 1][0].length); });
  const out = Array.from({ length: w }, () => new Float32Array(total)); let pos = 0;
  tracks.forEach((t, i) => {
    const len = t[0].length, ov = i && xf ? Math.min(xf, len, tracks[i - 1][0].length) : 0; pos -= ov;
    for (let c = 0; c < w; c++) {
      const o = out[c], s = t[c];
      if (ov) { const prev = tracks[i - 1][c], plen = prev.length; for (let k = 0; k < ov; k++) { const a = (k + 0.5) / ov; o[pos + k] = prev[plen - ov + k] * Math.cos(a * Math.PI / 2) + s[k] * Math.sin(a * Math.PI / 2); } }
      for (let k = ov; k < len; k++) o[pos + k] = s[k];
    }
    pos += len;
  });
  return out;
}

/** RBJ cookbook biquad coefficients, normalised so a0 = 1. type: peak | lowshelf | highshelf | lowpass | highpass. */
export function biquad(type, fs, f0, gainDb = 0, q = 1) {
  const A = Math.pow(10, gainDb / 40), w0 = 2 * Math.PI * Math.min(f0, fs * 0.49) / fs, cos = Math.cos(w0), sin = Math.sin(w0), alpha = sin / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'peak') { b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A; }
  else if (type === 'lowshelf') { const s = 2 * Math.sqrt(A) * alpha; b0 = A * ((A + 1) - (A - 1) * cos + s); b1 = 2 * A * ((A - 1) - (A + 1) * cos); b2 = A * ((A + 1) - (A - 1) * cos - s); a0 = (A + 1) + (A - 1) * cos + s; a1 = -2 * ((A - 1) + (A + 1) * cos); a2 = (A + 1) + (A - 1) * cos - s; }
  else if (type === 'highshelf') { const s = 2 * Math.sqrt(A) * alpha; b0 = A * ((A + 1) + (A - 1) * cos + s); b1 = -2 * A * ((A - 1) + (A + 1) * cos); b2 = A * ((A + 1) + (A - 1) * cos - s); a0 = (A + 1) - (A - 1) * cos + s; a1 = 2 * ((A - 1) - (A + 1) * cos); a2 = (A + 1) - (A - 1) * cos - s; }
  else if (type === 'lowpass') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; }
  else if (type === 'highpass') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; }
  else throw new Error(`Unknown filter type ${type}`);
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}
/** Magnitude (linear) of a biquad at a frequency. */
export function biquadMagnitude(k, fs, f) {
  const w = 2 * Math.PI * f / fs, c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
  const nr = k.b0 + k.b1 * c1 + k.b2 * c2, ni = -(k.b1 * s1 + k.b2 * s2), dr = 1 + k.a1 * c1 + k.a2 * c2, di = -(k.a1 * s1 + k.a2 * s2);
  return Math.hypot(nr, ni) / Math.hypot(dr, di);
}
export function applyBiquad(chs, k) {
  return chs.map(c => { const o = new Float32Array(c.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < c.length; i++) { const x = c[i], y = k.b0 * x + k.b1 * x1 + k.b2 * x2 - k.a1 * y1 - k.a2 * y2; o[i] = y; x2 = x1; x1 = x; y2 = y1; y1 = y; } return o; });
}
export const EQ_BANDS = [[60, 'lowshelf'], [250, 'peak'], [1000, 'peak'], [4000, 'peak'], [12000, 'highshelf']];
/** gainsDb: one value per EQ_BANDS entry. Bands at 0 dB are skipped. */
export function applyEq(chs, sr, gainsDb) {
  let out = chs; EQ_BANDS.forEach(([f, type], i) => { if (gainsDb[i]) out = applyBiquad(out, biquad(type, sr, f, gainsDb[i], type === 'peak' ? 0.9 : 0.707)); }); return out;
}
/** Scale down only if the signal would clip; returns the channels and the gain used. */
export function limitPeak(chs, ceiling = 0.999) { const p = peak(chs); if (p <= ceiling) return { chs, gain: 1 }; const g = ceiling / p; return { chs: applyGain(chs, g), gain: g }; }
