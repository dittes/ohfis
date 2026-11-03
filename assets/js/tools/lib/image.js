// image.js — metadata stripping, EXIF reading, palettes and pixel maths. Pure functions (typed arrays in, typed arrays out).

const u16 = (b, o, le) => le ? b[o] | b[o + 1] << 8 : b[o] << 8 | b[o + 1];
const u32 = (b, o, le) => le ? (b[o] | b[o + 1] << 8 | b[o + 2] << 16 | b[o + 3] << 24) >>> 0 : (b[o] << 24 | b[o + 1] << 16 | b[o + 2] << 8 | b[o + 3]) >>> 0;
const ascii = (b, o, n) => String.fromCharCode(...b.subarray(o, o + n));

export function detectType(b) {
  if (b[0] === 0xFF && b[1] === 0xD8) return 'jpeg'; if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG') return 'png'; if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp'; if (ascii(b, 0, 3) === 'GIF') return 'gif'; return 'unknown';
}

// ── EXIF reading ────────────────────────────────────────────────────────────
const TAGS = { 0x010F: 'Make', 0x0110: 'Model', 0x0131: 'Software', 0x0132: 'DateTime', 0x013B: 'Artist', 0x8298: 'Copyright', 0x0112: 'Orientation', 0xA434: 'LensModel', 0xA431: 'BodySerialNumber', 0xA435: 'LensSerialNumber', 0x9003: 'DateTimeOriginal', 0x9004: 'DateTimeDigitized', 0x010E: 'ImageDescription', 0x9286: 'UserComment' };
function readIFD(b, base, off, le, names) {
  const out = {}; if (off + 2 > b.length) return out; const n = u16(b, base + off, le);
  for (let i = 0; i < Math.min(n, 200); i++) { const e = base + off + 2 + i * 12; if (e + 12 > b.length) break; const tag = u16(b, e, le), type = u16(b, e + 2, le), count = u32(b, e + 4, le); const size = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }[type] || 1; const total = size * count; const vo = total <= 4 ? e + 8 : base + u32(b, e + 8, le); if (vo + total > b.length) continue; let v;
    if (type === 2) v = ascii(b, vo, Math.max(0, count - 1)).replace(/\0.*$/, ''); else if (type === 3) v = count === 1 ? u16(b, vo, le) : Array.from({ length: count }, (_, k) => u16(b, vo + k * 2, le)); else if (type === 4) v = count === 1 ? u32(b, vo, le) : Array.from({ length: count }, (_, k) => u32(b, vo + k * 4, le)); else if (type === 5) v = Array.from({ length: count }, (_, k) => { const d = u32(b, vo + k * 8 + 4, le); return d ? u32(b, vo + k * 8, le) / d : 0; }); else continue;
    out[names?.[tag] ?? '0x' + tag.toString(16)] = v; if (tag === 0x8769) out.__exif = Number(v); if (tag === 0x8825) out.__gps = Number(v); }
  return out;
}
export function readExif(bytes) {
  const b = bytes; let tiff = -1;
  if (detectType(b) === 'jpeg') { let o = 2; while (o + 4 < b.length && b[o] === 0xFF) { const m = b[o + 1]; if (m === 0xDA || m === 0xD9) break; const len = u16(b, o + 2, false); if (m === 0xE1 && ascii(b, o + 4, 4) === 'Exif') { tiff = o + 10; break; } o += 2 + len; } }
  else if (detectType(b) === 'png') { let o = 8; while (o + 8 < b.length) { const len = u32(b, o, false), type = ascii(b, o + 4, 4); if (type === 'eXIf') { tiff = o + 8; break; } o += 12 + len; } }
  else if (detectType(b) === 'webp') { let o = 12; while (o + 8 <= b.length) { const type = ascii(b, o, 4), len = u32(b, o + 4, true); if (type === 'EXIF') { tiff = o + 8 + (ascii(b, o + 8, 4) === 'Exif' ? 6 : 0); break; } o += 8 + len + (len & 1); } }
  if (tiff < 0 || tiff + 8 > b.length) return null;
  const le = ascii(b, tiff, 2) === 'II'; if (!le && ascii(b, tiff, 2) !== 'MM') return null; const ifd0 = readIFD(b, tiff, u32(b, tiff + 4, le), le, TAGS); const res = { ...Object.fromEntries(Object.entries(ifd0).filter(([k]) => !k.startsWith('__'))) };
  if (ifd0.__exif) Object.assign(res, Object.fromEntries(Object.entries(readIFD(b, tiff, ifd0.__exif, le, TAGS)).filter(([k]) => !k.startsWith('__'))));
  if (ifd0.__gps) { const g = readIFD(b, tiff, ifd0.__gps, le, { 1: 'LatRef', 2: 'Lat', 3: 'LonRef', 4: 'Lon', 5: 'AltRef', 6: 'Alt' }); const dms = a => Array.isArray(a) && a.length === 3 ? a[0] + a[1] / 60 + a[2] / 3600 : null;
    if (dms(g.Lat) !== null && dms(g.Lon) !== null) { res.gps = { lat: dms(g.Lat) * (g.LatRef === 'S' ? -1 : 1), lon: dms(g.Lon) * (g.LonRef === 'W' ? -1 : 1) }; if (g.Alt !== undefined) res.gps.alt = Array.isArray(g.Alt) ? g.Alt[0] : g.Alt; } }
  return res;
}

// ── Metadata stripping (lossless: pixels are copied byte for byte) ──────────
/** Returns { bytes, removed: [labels], type }. Colour profiles (ICC) and the orientation tag are kept by default so images do not change appearance. */
export function stripMetadata(bytes, { keepIcc = true, keepOrientation = true } = {}) {
  const type = detectType(bytes); const removed = [];
  if (type === 'jpeg') {
    const out = [bytes.subarray(0, 2)]; let o = 2; let orient = null; let sawScan = false; const exif = readExif(bytes); if (keepOrientation && exif?.Orientation > 1) orient = exif.Orientation;
    while (o + 4 <= bytes.length) {
      if (bytes[o] !== 0xFF) throw new Error('This JPEG has an unexpected structure');
      const m = bytes[o + 1]; if (m === 0xD8 || (m >= 0xD0 && m <= 0xD7) || m === 0x01) { out.push(bytes.subarray(o, o + 2)); o += 2; continue; }
      if (m === 0xDA) { out.push(bytes.subarray(o)); sawScan = true; break; }
      const len = u16(bytes, o + 2, false); const seg = bytes.subarray(o, o + 2 + len); let drop = false;
      if (m === 0xE1) { drop = true; removed.push(ascii(bytes, o + 4, 4) === 'Exif' ? 'EXIF (camera, date, GPS)' : 'XMP'); }
      else if (m === 0xED) { drop = true; removed.push('IPTC / Photoshop'); } else if (m === 0xFE) { drop = true; removed.push('Comment'); } else if (m === 0xE2 && !keepIcc && ascii(bytes, o + 4, 11) === 'ICC_PROFILE') { drop = true; removed.push('ICC colour profile'); } else if (m >= 0xE3 && m <= 0xEF && m !== 0xEE) { drop = true; removed.push(`Application data (APP${m - 0xE0})`); }
      if (!drop) out.push(seg); o += 2 + len;
    }
    if (!sawScan) throw new Error('This JPEG has an unexpected structure or is incomplete');
    if (orient) { // re-insert a minimal EXIF segment that carries only the orientation
      const t = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0, 0, 0x4D, 0x4D, 0, 0x2A, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orient, 0, 0, 0, 0, 0, 0]); const seg = new Uint8Array(4 + t.length); seg.set([0xFF, 0xE1, (t.length + 2) >> 8, (t.length + 2) & 255]); seg.set(t, 4); out.splice(1, 0, seg); }
    return { bytes: concat(out), removed: [...new Set(removed)], type };
  }
  if (type === 'png') {
    const out = [bytes.subarray(0, 8)]; let o = 8; const drop = new Set(['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME', 'pHYs'].filter(x => x !== 'pHYs')); if (!keepIcc) drop.add('iCCP');
    while (o + 12 <= bytes.length) { const len = u32(bytes, o, false), t = ascii(bytes, o + 4, 4); const chunk = bytes.subarray(o, o + 12 + len); if (drop.has(t)) removed.push({ tEXt: 'Text comments', iTXt: 'Text comments (XMP)', zTXt: 'Text comments', eXIf: 'EXIF (camera, GPS)', tIME: 'Modification time', iCCP: 'ICC colour profile' }[t]); else out.push(chunk); o += 12 + len; if (t === 'IEND') break; }
    return { bytes: concat(out), removed: [...new Set(removed)], type };
  }
  if (type === 'webp') {
    const out = []; let o = 12; let flags = 0, vp8x = -1;
    while (o + 8 <= bytes.length) { const t = ascii(bytes, o, 4), len = u32(bytes, o + 4, true), size = 8 + len + (len & 1); const chunk = bytes.subarray(o, o + size); if (t === 'EXIF') removed.push('EXIF (camera, GPS)'); else if (t === 'XMP ') removed.push('XMP'); else { out.push(chunk); if (t === 'VP8X') vp8x = out.length - 1; } o += size; }
    if (vp8x >= 0) { const c = new Uint8Array(out[vp8x]); c[8] &= ~(0x08 | 0x04); out[vp8x] = c; } const body = concat(out); const res = new Uint8Array(12 + body.length); res.set(bytes.subarray(0, 4)); new DataView(res.buffer).setUint32(4, 4 + body.length, true); res.set(bytes.subarray(8, 12), 8); res.set(body, 12); return { bytes: res, removed: [...new Set(removed)], type };
  }
  return { bytes, removed: [], type };
}
function concat(parts) { const n = parts.reduce((s, p) => s + p.length, 0); const o = new Uint8Array(n); let k = 0; for (const p of parts) { o.set(p, k); k += p.length; } return o; }

// ── Palette (histogram + weighted k-means with farthest-point initialisation) ──
export function extractPalette(rgba, n = 6, { sampleStep = 1, ignoreTransparent = true } = {}) {
  const hist = new Map(); let total = 0;
  for (let i = 0; i < rgba.length; i += 4 * sampleStep) { if (ignoreTransparent && rgba[i + 3] < 128) continue; const key = (rgba[i] >> 3) << 10 | (rgba[i + 1] >> 3) << 5 | (rgba[i + 2] >> 3); let e = hist.get(key); if (!e) hist.set(key, e = { r: 0, g: 0, b: 0, w: 0 }); e.r += rgba[i]; e.g += rgba[i + 1]; e.b += rgba[i + 2]; e.w++; total++; }
  if (!total) return [];
  const pts = [...hist.values()].map(e => ({ r: e.r / e.w, g: e.g / e.w, b: e.b / e.w, w: e.w })); const d2 = (a, b) => (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
  const k = Math.min(n, pts.length); const cent = [pts.reduce((a, b) => (b.w > a.w ? b : a))].map(p => ({ ...p }));
  while (cent.length < k) { let best = null, score = -1; for (const p of pts) { const d = Math.min(...cent.map(c => d2(p, c))); const sc = d * Math.sqrt(p.w); if (sc > score) { score = sc; best = p; } } if (score <= 0) break; cent.push({ ...best }); }
  let assign = new Array(pts.length).fill(0);
  for (let it = 0; it < 12; it++) {
    assign = pts.map(p => { let bi = 0, bd = Infinity; cent.forEach((c, i) => { const d = d2(p, c); if (d < bd) { bd = d; bi = i; } }); return bi; });
    const sums = cent.map(() => ({ r: 0, g: 0, b: 0, w: 0 })); pts.forEach((p, i) => { const s = sums[assign[i]]; s.r += p.r * p.w; s.g += p.g * p.w; s.b += p.b * p.w; s.w += p.w; }); let moved = 0;
    sums.forEach((s, i) => { if (s.w) { const nr = s.r / s.w, ng = s.g / s.w, nb = s.b / s.w; moved += Math.abs(nr - cent[i].r) + Math.abs(ng - cent[i].g) + Math.abs(nb - cent[i].b); cent[i].r = nr; cent[i].g = ng; cent[i].b = nb; } }); if (moved < 0.5) break;
  }
  const weight = cent.map(() => 0); pts.forEach((p, i) => { weight[assign[i]] += p.w; });
  return cent.map((c, i) => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), share: weight[i] / total })).filter(c => c.share > 0).sort((a, b) => b.share - a.share);
}

// ── Pixel operations (RGBA Uint8ClampedArray, in place unless noted) ────────
export function pixelate(d, w, h, x0, y0, x1, y1, size) { x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0); x1 = Math.min(w, x1 | 0); y1 = Math.min(h, y1 | 0); for (let by = y0; by < y1; by += size) for (let bx = x0; bx < x1; bx += size) { let r = 0, g = 0, b = 0, n = 0; const ex = Math.min(bx + size, x1), ey = Math.min(by + size, y1); for (let y = by; y < ey; y++) for (let x = bx; x < ex; x++) { const i = (y * w + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; } r = r / n; g = g / n; b = b / n; for (let y = by; y < ey; y++) for (let x = bx; x < ex; x++) { const i = (y * w + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; } } }
export function boxBlur(d, w, h, x0, y0, x1, y1, radius) { x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0); x1 = Math.min(w, x1 | 0); y1 = Math.min(h, y1 | 0); const rw = x1 - x0, rh = y1 - y0; if (rw <= 0 || rh <= 0) return; const src = new Uint8ClampedArray(rw * rh * 4); for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) { const si = ((y0 + y) * w + x0 + x) * 4, di = (y * rw + x) * 4; src[di] = d[si]; src[di + 1] = d[si + 1]; src[di + 2] = d[si + 2]; src[di + 3] = d[si + 3]; }
  const pass = (inp, out, horizontal) => { const len = horizontal ? rw : rh, lines = horizontal ? rh : rw; for (let l = 0; l < lines; l++) for (let c = 0; c < 3; c++) { let sum = 0, cnt = 0; const at = k => (horizontal ? (l * rw + k) : (k * rw + l)) * 4 + c; for (let k = 0; k <= Math.min(radius, len - 1); k++) { sum += inp[at(k)]; cnt++; } for (let k = 0; k < len; k++) { out[at(k)] = sum / cnt; const add = k + radius + 1, rem = k - radius; if (add < len) { sum += inp[at(add)]; cnt++; } if (rem >= 0) { sum -= inp[at(rem)]; cnt--; } } } };
  const tmp = new Uint8ClampedArray(src.length); for (let i = 0; i < 3; i++) { pass(src, tmp, true); pass(tmp, src, false); }
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) { const si = (y * rw + x) * 4, di = ((y0 + y) * w + x0 + x) * 4; d[di] = src[si]; d[di + 1] = src[si + 1]; d[di + 2] = src[si + 2]; } }
export function fillRect(d, w, h, x0, y0, x1, y1, [r, g, b]) { for (let y = Math.max(0, y0 | 0); y < Math.min(h, y1 | 0); y++) for (let x = Math.max(0, x0 | 0); x < Math.min(w, x1 | 0); x++) { const i = (y * w + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; } }
export function diffImages(a, b, w, h, { threshold = 10, color = [255, 0, 255], dim = 0.35 } = {}) {
  const out = new Uint8ClampedArray(a.length); let changed = 0; const thr = threshold * 3;
  for (let i = 0; i < a.length; i += 4) { const dd = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) + Math.abs(a[i + 3] - b[i + 3]) / 4; if (dd > thr) { changed++; out[i] = color[0]; out[i + 1] = color[1]; out[i + 2] = color[2]; out[i + 3] = 255; } else { const g = (b[i] * 0.3 + b[i + 1] * 0.59 + b[i + 2] * 0.11) * dim + 255 * (1 - dim); out[i] = out[i + 1] = out[i + 2] = g; out[i + 3] = 255; } }
  return { data: out, changed, percent: changed / (w * h) * 100 };
}
export function duotone(d, dark, light) { for (let i = 0; i < d.length; i += 4) { const l = (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) / 255; d[i] = dark[0] + (light[0] - dark[0]) * l; d[i + 1] = dark[1] + (light[1] - dark[1]) * l; d[i + 2] = dark[2] + (light[2] - dark[2]) * l; } }
export function invert(d) { for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; } }

// ── Geometry ────────────────────────────────────────────────────────────────
export function fitSize(w, h, { maxW = 0, maxH = 0, percent = 0, exactW = 0, exactH = 0, noUpscale = true } = {}) {
  let s = 1; if (percent) s = percent / 100; else if (exactW && exactH) return { w: Math.round(exactW), h: Math.round(exactH) }; else if (exactW) s = exactW / w; else if (exactH) s = exactH / h; else { const sx = maxW ? maxW / w : Infinity, sy = maxH ? maxH / h : Infinity; s = Math.min(sx, sy); if (!Number.isFinite(s)) s = 1; }
  if (noUpscale && s > 1 && !percent && !exactW && !exactH) s = 1; return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}
export function padToRatio(w, h, ratio) { const r = w / h; if (Math.abs(r - ratio) < 1e-6) return { w, h, x: 0, y: 0 }; if (r > ratio) { const nh = Math.round(w / ratio); return { w, h: nh, x: 0, y: Math.round((nh - h) / 2) }; } const nw = Math.round(h * ratio); return { w: nw, h, x: Math.round((nw - w) / 2), y: 0 }; }
export function rotatedBounds(w, h, deg) { const r = deg * Math.PI / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r)); return { w: Math.round(w * c + h * s), h: Math.round(w * s + h * c) }; }
/** PNG-in-ICO container for multiple PNG sizes: [{size, png:Uint8Array}] */
export function buildICO(images) { const n = images.length; const head = new Uint8Array(6 + n * 16); const dv = new DataView(head.buffer); dv.setUint16(2, 1, true); dv.setUint16(4, n, true); let off = head.length; images.forEach((im, i) => { const e = 6 + i * 16; head[e] = im.size >= 256 ? 0 : im.size; head[e + 1] = im.size >= 256 ? 0 : im.size; dv.setUint16(e + 4, 1, true); dv.setUint16(e + 6, 32, true); dv.setUint32(e + 8, im.png.length, true); dv.setUint32(e + 12, off, true); off += im.png.length; }); return concat([head, ...images.map(i => i.png)]); }
export const mimeToExt = m => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif' })[m] || 'img';
export const PAPER = { A0: [841, 1189], A1: [594, 841], A2: [420, 594], A3: [297, 420], A4: [210, 297], A5: [148, 210], A6: [105, 148], B4: [250, 353], B5: [176, 250], Letter: [215.9, 279.4], Legal: [215.9, 355.6], Tabloid: [279.4, 431.8], Executive: [184.15, 266.7] };
