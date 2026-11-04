// analysis.js — FFT, spectral noise reduction, tempo (BPM) and musical key detection. Pure, unit-tested.

// ── FFT (iterative radix-2, in place) ───────────────────────────────────────
export function fft(re, im, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = 2 * Math.PI / len * (inverse ? 1 : -1), wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr; re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
export const hann = n => Float32Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n));

/** Short-time Fourier transform of a mono signal: returns { re: Float32Array[], im: Float32Array[], frames, size, hop }. */
export function stft(x, size = 2048, hop = 512) {
  const win = hann(size), frames = Math.max(1, Math.ceil((x.length + size) / hop)), re = [], im = [];
  for (let f = 0; f < frames; f++) { const r = new Float32Array(size), i = new Float32Array(size), o = f * hop - size / 2 + hop; for (let k = 0; k < size; k++) { const p = o + k; r[k] = p >= 0 && p < x.length ? x[p] * win[k] : 0; } fft(r, i); re.push(r); im.push(i); }
  return { re, im, frames, size, hop, length: x.length };
}
export function istft(S) {
  const { re, im, frames, size, hop, length } = S, win = hann(size), out = new Float32Array(length + size * 2), norm = new Float32Array(length + size * 2), shift = size / 2 - hop;
  for (let f = 0; f < frames; f++) { const r = Float32Array.from(re[f]), i = Float32Array.from(im[f]); fft(r, i, true); const o = f * hop - size / 2 + hop; for (let k = 0; k < size; k++) { const p = o + k; if (p >= 0 && p < length) { out[p] += r[k] * win[k]; norm[p] += win[k] * win[k]; } } }
  void shift; for (let p = 0; p < length; p++) out[p] = norm[p] > 1e-6 ? out[p] / norm[p] : 0; return out.subarray(0, length);
}

// ── Noise reduction (spectral gating) ───────────────────────────────────────
/**
 * Reduce steady background noise (hiss, hum, fan). The noise level per frequency is learned from `noiseRange` (seconds, [a,b]) or, if
 * omitted, from the quietest 10 % of the recording. reductionDb: how far noise is pushed down (6–30). sensitivity: 1–5, higher removes more.
 */
export function reduceNoise(chs, sr, { reductionDb = 12, sensitivity = 2.5, noiseRange = null, size = 2048, hop = 512 } = {}) {
  const floorGain = Math.pow(10, -reductionDb / 20);
  return chs.map(x => {
    const S = stft(x, size, hop), bins = size / 2 + 1, mags = S.re.map((r, f) => { const m = new Float32Array(bins); for (let k = 0; k < bins; k++) m[k] = Math.hypot(r[k], S.im[f][k]); return m; });
    const energy = mags.map(m => { let e = 0; for (let k = 0; k < bins; k++) e += m[k] * m[k]; return e; });
    let noiseFrames; if (noiseRange) { const a = Math.max(0, Math.floor(noiseRange[0] * sr / hop)), b = Math.min(S.frames, Math.ceil(noiseRange[1] * sr / hop)); noiseFrames = []; for (let f = a; f < b; f++) noiseFrames.push(f); }
    if (!noiseFrames || noiseFrames.length < 3) { const idx = energy.map((e, f) => [e, f]).sort((p, q) => p[0] - q[0]); noiseFrames = idx.slice(0, Math.max(3, Math.floor(idx.length * 0.1))).map(p => p[1]); }
    const mean = new Float32Array(bins), sd = new Float32Array(bins); for (const f of noiseFrames) for (let k = 0; k < bins; k++) mean[k] += mags[f][k] / noiseFrames.length; for (const f of noiseFrames) for (let k = 0; k < bins; k++) sd[k] += (mags[f][k] - mean[k]) ** 2 / noiseFrames.length; for (let k = 0; k < bins; k++) sd[k] = Math.sqrt(sd[k]);
    const thr = mean.map((m, k) => m + sensitivity * sd[k]), gains = mags.map(m => { const g = new Float32Array(bins); for (let k = 0; k < bins; k++) g[k] = m[k] > thr[k] ? Math.max(floorGain, Math.sqrt(1 - (thr[k] / m[k]) ** 2)) : floorGain; return g; });
    // smooth the mask over frequency (3 bins) and time (attack fast, release slow) to avoid musical-noise artefacts
    const sm = gains.map(g => { const o = new Float32Array(bins); for (let k = 0; k < bins; k++) o[k] = (g[Math.max(0, k - 1)] + g[k] * 2 + g[Math.min(bins - 1, k + 1)]) / 4; return o; });
    for (let f = 1; f < sm.length; f++) for (let k = 0; k < bins; k++) { const prev = sm[f - 1][k]; sm[f][k] = sm[f][k] > prev ? sm[f][k] : prev * 0.8 + sm[f][k] * 0.2; }
    for (let f = 0; f < S.frames; f++) for (let k = 0; k < bins; k++) { const g = sm[f][k]; S.re[f][k] *= g; S.im[f][k] *= g; if (k > 0 && k < size / 2) { S.re[f][size - k] *= g; S.im[f][size - k] *= g; } }
    return istft(S);
  });
}

// ── Tempo ───────────────────────────────────────────────────────────────────
/** Onset strength envelope (spectral flux, half-wave rectified, log-compressed) at hop samples per value. */
export function onsetEnvelope(x, sr, size = 1024, hop = 256) {
  const S = stft(x, size, hop), bins = size / 2 + 1, env = new Float32Array(S.frames); let prev = new Float32Array(bins);
  const lo = Math.floor(30 * size / sr), hi = Math.min(bins - 1, Math.floor(8000 * size / sr));
  for (let f = 0; f < S.frames; f++) { let flux = 0; const cur = new Float32Array(bins); for (let k = lo; k <= hi; k++) { cur[k] = Math.log1p(10 * Math.hypot(S.re[f][k], S.im[f][k])); const d = cur[k] - prev[k]; if (d > 0) flux += d; } env[f] = flux; prev = cur; }
  const mean = env.reduce((a, b) => a + b, 0) / env.length; return { env: env.map(v => Math.max(0, v - mean)), rate: sr / hop };
}
/** Estimate the tempo in BPM: autocorrelation of the onset envelope with a prior around 120 BPM. Returns { bpm, confidence, candidates }. */
export function detectBpm(mono, sr, { min = 60, max = 190 } = {}) {
  const { env, rate } = onsetEnvelope(mono, sr); const n = env.length; if (n < rate * 4) return null;
  const minLag = Math.floor(rate * 60 / max), maxLag = Math.min(n - 2, Math.ceil(rate * 60 / min)), ac = new Float32Array(maxLag + 2);
  for (let lag = minLag - 1; lag <= maxLag + 1; lag++) { let s = 0; for (let i = 0; i + lag < n; i++) s += env[i] * env[i + lag]; ac[lag] = s / (n - lag); }
  const score = lag => { const bpm = 60 * rate / lag, prior = Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.8) ** 2); return ac[lag] * (0.5 + prior); };
  const cands = []; for (let lag = minLag; lag <= maxLag; lag++) if (ac[lag] > ac[lag - 1] && ac[lag] >= ac[lag + 1] && ac[lag] > 0) { const a = ac[lag - 1], b = ac[lag], c = ac[lag + 1], d = a - 2 * b + c, off = d ? 0.5 * (a - c) / d : 0; cands.push({ lag: lag + off, s: score(lag), raw: b }); }
  if (!cands.length) return null; cands.sort((p, q) => q.s - p.s); const best = cands[0], bpm = 60 * rate / best.lag, total = cands.reduce((a, c) => a + c.s, 0);
  return { bpm: Math.round(bpm * 10) / 10, confidence: Math.round(100 * best.s / total) / 100, candidates: cands.slice(0, 4).map(c => Math.round(60 * rate / c.lag * 10) / 10) };
}

// ── Key ─────────────────────────────────────────────────────────────────────
export const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const CAMELOT_MAJOR = ['8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B'], CAMELOT_MINOR = ['5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A'];
/** Average chroma vector (12 pitch classes) of a mono signal. */
export function chroma(x, sr, size = 8192, hop = 4096) {
  const S = stft(x, size, hop), c = new Float32Array(12), bins = size / 2 + 1;
  const pc = new Int8Array(bins).fill(-1); for (let k = 1; k < bins; k++) { const f = k * sr / size; if (f >= 65 && f <= 2100) pc[k] = ((Math.round(12 * Math.log2(f / 440) + 69) % 12) + 12) % 12; }
  for (let f = 0; f < S.frames; f++) { let tot = 0; const fr = new Float32Array(12); for (let k = 1; k < bins; k++) if (pc[k] >= 0) { const m = Math.hypot(S.re[f][k], S.im[f][k]); fr[pc[k]] += m; tot += m; } if (tot > 0) for (let i = 0; i < 12; i++) c[i] += fr[i] / tot; }
  return c;
}
const corr = (a, b) => { const ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length; let n = 0, da = 0, db = 0; for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return n / Math.sqrt(da * db || 1); };
/** Krumhansl–Schmuckler key finding. Returns { key: "A minor", tonic, mode, camelot, confidence, runnerUp }. */
export function detectKey(mono, sr) {
  const c = chroma(mono, sr); if (!c.some(v => v > 0)) return null; const scores = [];
  for (let t = 0; t < 12; t++) { const rot = Array.from({ length: 12 }, (_, i) => c[(i + t) % 12]); scores.push({ t, mode: 'major', r: corr(rot, MAJOR) }, { t, mode: 'minor', r: corr(rot, MINOR) }); }
  scores.sort((a, b) => b.r - a.r); const [b, s] = scores, name = x => `${NOTE_NAMES[x.t]} ${x.mode}`;
  return { key: name(b), tonic: NOTE_NAMES[b.t], mode: b.mode, camelot: b.mode === 'major' ? CAMELOT_MAJOR[b.t] : CAMELOT_MINOR[b.t], confidence: Math.round(Math.max(0, (b.r - s.r)) * 100) / 100 + 0, correlation: Math.round(b.r * 100) / 100, runnerUp: name(s) };
}
