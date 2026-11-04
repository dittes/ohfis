// gif.js — GIF89a writer: a local colour table per frame, LZW compression, loop count and per-frame delay.
/** LZW-compress palette indices the way GIF wants it (variable code size, clear/end codes, 4096-entry table). */
export function lzw(indices, minCodeSize) {
  const clear = 1 << minCodeSize, eoi = clear + 1, out = []; let bits = 0, acc = 0;
  const emit = (code, size) => { acc |= code << bits; bits += size; while (bits >= 8) { out.push(acc & 255); acc >>>= 8; bits -= 8; } };
  let size = minCodeSize + 1, next = eoi + 1, dict = new Map(); emit(clear, size);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], key = prefix * 256 + k, found = dict.get(key);
    if (found !== undefined) { prefix = found; continue; }
    emit(prefix, size);
    if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; } else { emit(clear, size); dict = new Map(); size = minCodeSize + 1; next = eoi + 1; }
    prefix = k;
  }
  emit(prefix, size); emit(eoi, size); if (bits > 0) out.push(acc & 255);
  return Uint8Array.from(out);
}
/** frames: [{ indices: Uint8Array, palette: [[r,g,b], …] (2–256 entries) }]. delay in ms (number or array). loop: 0 = forever, n = repeat n times, -1 = play once. */
export function encodeGif({ width, height, frames, delay = 100, loop = 0 }) {
  if (!frames.length) throw new Error('No frames'); const parts = []; const u16 = n => [n & 255, (n >> 8) & 255];
  parts.push(Uint8Array.from([...'GIF89a'].map(c => c.charCodeAt(0)), x => x)); parts.push(Uint8Array.from([...u16(width), ...u16(height), 0x00, 0, 0]));
  if (frames.length > 1 && loop >= 0) parts.push(Uint8Array.from([0x21, 0xff, 0x0b, ...[...'NETSCAPE2.0'].map(c => c.charCodeAt(0)), 3, 1, ...u16(loop), 0]));
  frames.forEach((f, i) => {
    let bitsPerEntry = 1; while ((1 << bitsPerEntry) < f.palette.length) bitsPerEntry++; bitsPerEntry = Math.max(1, Math.min(8, bitsPerEntry)); const size = 1 << bitsPerEntry;
    const d = Math.max(0, Math.round((Array.isArray(delay) ? delay[i] ?? delay.at(-1) : delay) / 10));
    parts.push(Uint8Array.from([0x21, 0xf9, 4, 0x00, ...u16(d), 0, 0]));
    parts.push(Uint8Array.from([0x2c, 0, 0, 0, 0, ...u16(width), ...u16(height), 0x80 | (bitsPerEntry - 1)]));
    const table = new Uint8Array(size * 3); f.palette.forEach((c, k) => { table[k * 3] = c[0]; table[k * 3 + 1] = c[1]; table[k * 3 + 2] = c[2]; }); parts.push(table);
    const minCode = Math.max(2, bitsPerEntry), data = lzw(f.indices, minCode); parts.push(Uint8Array.from([minCode]));
    for (let o = 0; o < data.length; o += 255) { const chunk = data.subarray(o, o + 255); parts.push(Uint8Array.from([chunk.length])); parts.push(chunk); }
    parts.push(Uint8Array.from([0]));
  });
  parts.push(Uint8Array.from([0x3b]));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}
