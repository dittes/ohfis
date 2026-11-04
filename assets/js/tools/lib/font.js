// font.js — convert TrueType/OpenType fonts to WOFF and back, and read basic font details.
// WOFF (1.0) wraps the same tables in zlib streams. WOFF2 needs Brotli and is not supported here.
const u32 = (v, o) => v.getUint32(o, false), tag = (v, o) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
const pad4 = n => (n + 3) & ~3;
const put32 = (v, o, x) => v.setUint32(o, x >>> 0, false), putTag = (v, o, t) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, t.charCodeAt(i)); };

export function detect(bytes) {
  if (bytes.length < 12) return 'unknown'; const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), t = tag(v, 0);
  if (t === 'wOFF') return 'woff'; if (t === 'wOF2') return 'woff2'; if (t === 'ttcf') return 'ttc'; if (t === 'OTTO') return 'otf'; if (u32(v, 0) === 0x00010000 || t === 'true') return 'ttf'; return 'unknown';
}

export function readTables(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), n = v.getUint16(4, false), tables = [];
  for (let i = 0; i < n; i++) { const o = 12 + i * 16; tables.push({ tag: tag(v, o), checksum: u32(v, o + 4), offset: u32(v, o + 8), length: u32(v, o + 12) }); }
  return tables;
}

export function sfntToWoff(F, bytes) {
  const kind = detect(bytes); if (kind === 'woff' || kind === 'woff2') throw new Error('This file is already a web font.'); if (kind === 'ttc') throw new Error('Font collections (.ttc) are not supported. Extract a single font first.'); if (kind === 'unknown') throw new Error('This does not look like a TrueType or OpenType font.');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), flavor = u32(v, 0), tables = readTables(bytes).sort((a, b) => a.tag < b.tag ? -1 : 1);
  const blocks = tables.map(t => { const raw = bytes.subarray(t.offset, t.offset + t.length), z = F.zlibSync(raw, { level: 9 }); return { ...t, data: z.length < raw.length ? z : raw, comp: z.length < raw.length }; });
  const dirEnd = 44 + 20 * blocks.length; let off = dirEnd; for (const b of blocks) { b.woffOffset = off; off += pad4(b.data.length); }
  const sfntSize = 12 + 16 * blocks.length + tables.reduce((n, t) => n + pad4(t.length), 0);
  const out = new Uint8Array(off), o = new DataView(out.buffer);
  putTag(o, 0, 'wOFF'); put32(o, 4, flavor); put32(o, 8, off); o.setUint16(12, blocks.length, false); o.setUint16(14, 0, false); put32(o, 16, sfntSize); o.setUint16(20, 1, false); o.setUint16(22, 0, false);
  blocks.forEach((b, i) => { const p = 44 + i * 20; putTag(o, p, b.tag); put32(o, p + 4, b.woffOffset); put32(o, p + 8, b.data.length); put32(o, p + 12, b.length); put32(o, p + 16, b.checksum); out.set(b.data, b.woffOffset); });
  return out;
}

export function woffToSfnt(F, bytes) {
  const kind = detect(bytes); if (kind === 'woff2') throw new Error('WOFF2 uses Brotli compression, which this tool cannot unpack. Use a WOFF or TTF/OTF file.'); if (kind !== 'woff') throw new Error('This is not a WOFF file.');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), flavor = u32(v, 4), n = v.getUint16(12, false), tables = [];
  for (let i = 0; i < n; i++) { const p = 44 + i * 20, off = u32(v, p + 4), comp = u32(v, p + 8), orig = u32(v, p + 12); const chunk = bytes.subarray(off, off + comp); tables.push({ tag: tag(v, p), checksum: u32(v, p + 16), data: comp < orig ? F.unzlibSync(chunk) : chunk.slice(), length: orig }); }
  for (const t of tables) if (t.data.length !== t.length) throw new Error(`Table ${t.tag} is damaged.`);
  let off = 12 + 16 * n; const offsets = tables.map(t => { const o = off; off += pad4(t.length); return o; });
  const out = new Uint8Array(off), o = new DataView(out.buffer); put32(o, 0, flavor); o.setUint16(4, n, false);
  let pow = 1, log = 0; while (pow * 2 <= n) { pow *= 2; log++; } o.setUint16(6, pow * 16, false); o.setUint16(8, log, false); o.setUint16(10, n * 16 - pow * 16, false);
  tables.forEach((t, i) => { const p = 12 + i * 16; putTag(o, p, t.tag); put32(o, p + 4, t.checksum); put32(o, p + 8, offsets[i]); put32(o, p + 12, t.length); out.set(t.data, offsets[i]); });
  return out;
}

/** Family, style, glyph count and format of a TTF/OTF/WOFF file (WOFF is unpacked first). */
export function fontInfo(F, bytes) {
  let kind = detect(bytes), sfnt = bytes; if (kind === 'woff') sfnt = woffToSfnt(F, bytes); else if (kind === 'woff2') return { kind, family: '', style: '', glyphs: 0, tables: 0 }; else if (kind === 'unknown' || kind === 'ttc') return { kind, family: '', style: '', glyphs: 0, tables: 0 };
  const v = new DataView(sfnt.buffer, sfnt.byteOffset, sfnt.byteLength), tables = readTables(sfnt), find = t => tables.find(x => x.tag === t); const info = { kind, family: '', style: '', full: '', glyphs: 0, tables: tables.length, flavor: tag(v, 0) === 'OTTO' ? 'CFF (OpenType)' : 'TrueType' };
  const maxp = find('maxp'); if (maxp) info.glyphs = v.getUint16(maxp.offset + 4, false);
  const nm = find('name'); if (nm) {
    const count = v.getUint16(nm.offset + 2, false), so = nm.offset + v.getUint16(nm.offset + 4, false), got = {};
    for (let i = 0; i < count; i++) { const r = nm.offset + 6 + i * 12, plat = v.getUint16(r, false), id = v.getUint16(r + 6, false), len = v.getUint16(r + 8, false), off = v.getUint16(r + 10, false); if (![1, 2, 4, 16, 17].includes(id)) continue; let s = ''; if (plat === 3 || plat === 0) for (let k = 0; k < len; k += 2) s += String.fromCharCode(v.getUint16(so + off + k, false)); else if (plat === 1) for (let k = 0; k < len; k++) s += String.fromCharCode(v.getUint8(so + off + k)); if (s && (plat === 3 || !got[id])) got[id] = s; }
    info.family = got[16] || got[1] || ''; info.style = got[17] || got[2] || ''; info.full = got[4] || '';
  }
  return info;
}
