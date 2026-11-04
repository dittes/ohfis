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
