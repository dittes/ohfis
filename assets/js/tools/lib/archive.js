// archive.js — ZIP helpers on top of fflate (passed in, so the same code runs in the browser and in tests).

/** Make an archive path safe to use as a download name: no drive letters, no leading slashes, no "..". */
export function safePath(p) {
  const parts = String(p).replace(/\\/g, '/').replace(/^[a-zA-Z]:/, '').split('/').filter(x => x && x !== '.' && x !== '..');
  return parts.join('/');
}
export const baseOf = p => p.slice(p.lastIndexOf('/') + 1);
export const extOf = p => { const b = baseOf(p), i = b.lastIndexOf('.'); return i > 0 ? b.slice(i + 1).toLowerCase() : ''; };
const STORED = new Set(['zip', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'mp3', 'mp4', 'm4a', 'aac', 'ogg', 'opus', 'webm', 'mkv', 'mov', 'avi', '7z', 'rar', 'gz', 'bz2', 'xz', 'woff', 'woff2', 'docx', 'xlsx', 'pptx', 'odt', 'epub', 'pdf', 'heic', 'avif']);
export const isCompressed = p => STORED.has(extOf(p));

/** List a ZIP without extracting anything. Returns entries [{ path, size, packed, dir }] sorted by path. */
export function listZip(F, bytes) {
  const out = [];
  F.unzipSync(bytes, { filter: f => { out.push({ path: f.name, size: f.originalSize, packed: f.size, dir: f.name.endsWith('/') }); return false; } });
  return out.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
}
/** Extract one entry's bytes. */
export function readEntry(F, bytes, path) { const z = F.unzipSync(bytes, { filter: f => f.name === path }); return z[path]; }

/** Entries that would be written outside the target folder or that look like a zip bomb. */
export function warnings(entries, { maxTotal = 2 * 1024 ** 3, maxRatio = 1000 } = {}) {
  const w = [];
  const unsafe = entries.filter(e => safePath(e.path) !== e.path.replace(/\\/g, '/').replace(/\/$/, '') && !e.dir);
  if (unsafe.length) w.push({ type: 'path', count: unsafe.length });
  const total = entries.reduce((n, e) => n + e.size, 0); if (total > maxTotal) w.push({ type: 'size', total });
  const bomb = entries.find(e => e.packed > 0 && e.size / e.packed > maxRatio && e.size > 50 * 1024 * 1024); if (bomb) w.push({ type: 'ratio', path: bomb.path });
  return w;
}

/** Build a ZIP from [{ name, data: Uint8Array }]. Duplicate names get " (2)". Files that are already compressed are stored. */
export function buildZip(F, files, level = 6) {
  const used = new Set(), entries = {};
  for (const f of files) {
    let name = safePath(f.name) || 'file', n = name, i = 2;
    while (used.has(n.toLowerCase())) { const dot = baseOf(name).lastIndexOf('.'), cut = dot > 0 ? name.length - (baseOf(name).length - dot) : name.length; n = `${name.slice(0, cut)} (${i++})${name.slice(cut)}`; }
    used.add(n.toLowerCase()); entries[n] = [f.data, { level: isCompressed(n) ? 0 : level, mtime: f.mtime ? new Date(f.mtime) : new Date() }];
  }
  return F.zipSync(entries);
}

// ── TAR (read only, enough for plain and ustar archives) ─────────────────────
const cstr = (b, a, n) => { let e = a; while (e < a + n && b[e]) e++; return new TextDecoder().decode(b.subarray(a, e)); };
export const isTar = b => b.length > 512 && cstr(b, 257, 5) === 'ustar';
/** List entries of an (uncompressed) tar: [{ path, size, dir, offset }]. */
export function listTar(b) {
  const out = []; let o = 0;
  while (o + 512 <= b.length) {
    if (!b[o]) break; // end marker
    let name = cstr(b, o, 100); const size = parseInt(cstr(b, o + 124, 12).trim() || '0', 8) || 0, type = String.fromCharCode(b[o + 156] || 48), prefix = cstr(b, o + 345, 155);
    if (prefix) name = prefix + '/' + name;
    if (type === 'L') { name = cstr(b, o + 512, size); o += 512 + Math.ceil(size / 512) * 512; const h = o; const sz = parseInt(cstr(b, h + 124, 12).trim() || '0', 8) || 0; out.push({ path: name, size: sz, dir: String.fromCharCode(b[h + 156] || 48) === '5', offset: h + 512 }); o = h + 512 + Math.ceil(sz / 512) * 512; continue; }
    if (type === '0' || type === '\0' || type === '5' || type === '7') out.push({ path: name, size, dir: type === '5' || name.endsWith('/'), offset: o + 512 });
    o += 512 + Math.ceil(size / 512) * 512;
  }
  return out;
}
export const readTarEntry = (b, e) => b.subarray(e.offset, e.offset + e.size);
/** What kind of archive are these bytes? */
export function sniff(b) {
  if (b[0] === 0x50 && b[1] === 0x4b) return 'zip'; if (b[0] === 0x1f && b[1] === 0x8b) return 'gz'; if (isTar(b)) return 'tar';
  if (b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21) return 'rar'; if (b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf) return '7z'; if (b[0] === 0x42 && b[1] === 0x5a && b[2] === 0x68) return 'bz2'; if (b[0] === 0xfd && b[1] === 0x37 && b[2] === 0x7a && b[3] === 0x58) return 'xz'; return 'unknown';
}
