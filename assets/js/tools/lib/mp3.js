// mp3.js — MP3 encoding with the bundled LAME build (lamejs, LGPL). Loaded on demand as a classic script.
export const toInt16 = f => { const o = new Int16Array(f.length); for (let i = 0; i < f.length; i++) { const s = Math.max(-1, Math.min(1, f[i])); o[i] = s < 0 ? s * 0x8000 : s * 0x7fff; } return o; };
let loading = null;
export function loadLame() {
  if (globalThis.lamejs?.Mp3Encoder) return Promise.resolve(globalThis.lamejs);
  return loading ||= new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = '/assets/vendor/lamejs/lame.min.js';
    s.onload = () => globalThis.lamejs?.Mp3Encoder ? resolve(globalThis.lamejs) : reject(new Error('MP3 encoder did not start')); s.onerror = () => { loading = null; reject(new Error('MP3 encoder could not be loaded')); }; document.head.append(s);
  });
}
/** Encode up to two channels. kbps: 64–320. `lame` is injectable for tests. onProgress(0..1). */
export async function encodeMp3(chs, sr, kbps = 192, lame, onProgress) {
  lame ||= await loadLame(); const ch = Math.min(2, chs.length), enc = new lame.Mp3Encoder(ch, sr, kbps), L = toInt16(chs[0]), R = ch === 2 ? toInt16(chs[1]) : null, parts = [], blk = 1152 * 20;
  for (let i = 0; i < L.length; i += blk) {
    const a = ch === 2 ? enc.encodeBuffer(L.subarray(i, i + blk), R.subarray(i, i + blk)) : enc.encodeBuffer(L.subarray(i, i + blk));
    if (a.length) parts.push(new Uint8Array(a)); if (onProgress && (i / blk) % 25 === 0) { onProgress(i / L.length); await new Promise(r => setTimeout(r)); }
  }
  const end = enc.flush(); if (end.length) parts.push(new Uint8Array(end));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}
