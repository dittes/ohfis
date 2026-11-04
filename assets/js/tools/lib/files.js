// files.js — recognise file types from their first bytes, and draw folder trees. Pure, unit-tested.
const ascii = (b, o, n) => String.fromCharCode(...b.subarray(o, o + n));
const eq = (b, o, arr) => arr.every((v, i) => b[o + i] === v);
const SIGS = [
  ['png', 'PNG image', 'image/png', 'png', b => eq(b, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  ['jpeg', 'JPEG image', 'image/jpeg', 'jpg', b => eq(b, 0, [0xff, 0xd8, 0xff])],
  ['gif', 'GIF image', 'image/gif', 'gif', b => ascii(b, 0, 6) === 'GIF87a' || ascii(b, 0, 6) === 'GIF89a'],
  ['webp', 'WebP image', 'image/webp', 'webp', b => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP'],
  ['bmp', 'BMP image', 'image/bmp', 'bmp', b => ascii(b, 0, 2) === 'BM' && b.length > 30 && b[6] === 0 && b[7] === 0],
  ['ico', 'Windows icon', 'image/x-icon', 'ico', b => eq(b, 0, [0, 0, 1, 0]) && b[4] > 0 && b[4] < 64],
  ['tiff', 'TIFF image', 'image/tiff', 'tif', b => eq(b, 0, [0x49, 0x49, 0x2a, 0]) || eq(b, 0, [0x4d, 0x4d, 0, 0x2a])],
  ['psd', 'Photoshop document', 'image/vnd.adobe.photoshop', 'psd', b => ascii(b, 0, 4) === '8BPS'],
  ['pdf', 'PDF document', 'application/pdf', 'pdf', b => ascii(b, 0, 5) === '%PDF-'],
  ['ps', 'PostScript', 'application/postscript', 'ps', b => ascii(b, 0, 2) === '%!'],
  ['rar', 'RAR archive', 'application/vnd.rar', 'rar', b => ascii(b, 0, 4) === 'Rar!'],
  ['7z', '7-Zip archive', 'application/x-7z-compressed', '7z', b => eq(b, 0, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])],
  ['gz', 'GZIP compressed data', 'application/gzip', 'gz', b => eq(b, 0, [0x1f, 0x8b])],
  ['bz2', 'BZIP2 compressed data', 'application/x-bzip2', 'bz2', b => ascii(b, 0, 3) === 'BZh'],
  ['xz', 'XZ compressed data', 'application/x-xz', 'xz', b => eq(b, 0, [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0])],
  ['zst', 'Zstandard compressed data', 'application/zstd', 'zst', b => eq(b, 0, [0x28, 0xb5, 0x2f, 0xfd])],
  ['tar', 'TAR archive', 'application/x-tar', 'tar', b => ascii(b, 257, 5) === 'ustar'],
  ['sqlite', 'SQLite database', 'application/vnd.sqlite3', 'sqlite', b => ascii(b, 0, 15) === 'SQLite format 3'],
  ['wasm', 'WebAssembly module', 'application/wasm', 'wasm', b => eq(b, 0, [0, 0x61, 0x73, 0x6d])],
  ['class', 'Java class file', 'application/java-vm', 'class', b => eq(b, 0, [0xca, 0xfe, 0xba, 0xbe]) && b[7] >= 44],
  ['macho', 'Mach-O executable (macOS)', 'application/x-mach-binary', '', b => eq(b, 0, [0xcf, 0xfa, 0xed, 0xfe]) || eq(b, 0, [0xce, 0xfa, 0xed, 0xfe]) || eq(b, 0, [0xca, 0xfe, 0xba, 0xbe])],
  ['elf', 'ELF executable (Linux)', 'application/x-elf', '', b => eq(b, 0, [0x7f, 0x45, 0x4c, 0x46])],
  ['exe', 'Windows executable (EXE/DLL)', 'application/vnd.microsoft.portable-executable', 'exe', b => ascii(b, 0, 2) === 'MZ'],
  ['ole', 'Legacy Microsoft Office file (DOC/XLS/PPT) or installer', 'application/x-ole-storage', 'doc', b => eq(b, 0, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])],
  ['rtf', 'Rich Text document', 'application/rtf', 'rtf', b => ascii(b, 0, 5) === '{\\rtf'],
  ['mp3', 'MP3 audio', 'audio/mpeg', 'mp3', b => ascii(b, 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && (b[1] & 0x06) !== 0)],
  ['wav', 'WAV audio', 'audio/wav', 'wav', b => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WAVE'],
  ['avi', 'AVI video', 'video/x-msvideo', 'avi', b => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'AVI '],
  ['flac', 'FLAC audio', 'audio/flac', 'flac', b => ascii(b, 0, 4) === 'fLaC'],
  ['ogg', 'Ogg container (audio/video)', 'application/ogg', 'ogg', b => ascii(b, 0, 4) === 'OggS'],
  ['midi', 'MIDI music', 'audio/midi', 'mid', b => ascii(b, 0, 4) === 'MThd'],
  ['mkv', 'Matroska / WebM video', 'video/x-matroska', 'mkv', b => eq(b, 0, [0x1a, 0x45, 0xdf, 0xa3])],
  ['woff', 'WOFF web font', 'font/woff', 'woff', b => ascii(b, 0, 4) === 'wOFF'],
  ['woff2', 'WOFF2 web font', 'font/woff2', 'woff2', b => ascii(b, 0, 4) === 'wOF2'],
  ['otf', 'OpenType font', 'font/otf', 'otf', b => ascii(b, 0, 4) === 'OTTO'],
  ['ttf', 'TrueType font', 'font/ttf', 'ttf', b => eq(b, 0, [0, 1, 0, 0, 0]) || ascii(b, 0, 4) === 'true'],
  ['iso', 'ISO disc image', 'application/x-iso9660-image', 'iso', b => b.length > 0x8006 && ascii(b, 0x8001, 5) === 'CD001'],
  ['pem', 'PEM key or certificate', 'application/x-pem-file', 'pem', b => ascii(b, 0, 11) === '-----BEGIN '],
  ['lnk', 'Windows shortcut', 'application/x-ms-shortcut', 'lnk', b => eq(b, 0, [0x4c, 0, 0, 0, 0x01, 0x14, 0x02, 0])],
];
const BRANDS = { heic: ['HEIC image', 'image/heic', 'heic'], heix: ['HEIC image', 'image/heic', 'heic'], hevc: ['HEIC image', 'image/heic', 'heic'], mif1: ['HEIF image', 'image/heif', 'heif'], msf1: ['HEIF image', 'image/heif', 'heif'], avif: ['AVIF image', 'image/avif', 'avif'], avis: ['AVIF image', 'image/avif', 'avif'],
  'qt  ': ['QuickTime movie', 'video/quicktime', 'mov'], M4A: ['M4A audio', 'audio/mp4', 'm4a'], 'M4A ': ['M4A audio', 'audio/mp4', 'm4a'], M4V: ['M4V video', 'video/x-m4v', 'm4v'], 'M4V ': ['M4V video', 'video/x-m4v', 'm4v'], '3gp4': ['3GP video', 'video/3gpp', '3gp'], '3gp5': ['3GP video', 'video/3gpp', '3gp'], crx: ['Chrome extension', 'application/x-chrome-extension', 'crx'] };
const OOXML = [['word/', 'Word document (DOCX)', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'], ['xl/', 'Excel workbook (XLSX)', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'], ['ppt/', 'PowerPoint presentation (PPTX)', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'pptx'], ['META-INF/MANIFEST.MF', 'Java archive (JAR)', 'application/java-archive', 'jar'], ['AndroidManifest.xml', 'Android app (APK)', 'application/vnd.android.package-archive', 'apk'], ['mimetypeapplication/epub+zip', 'EPUB e-book', 'application/epub+zip', 'epub'], ['mimetypeapplication/vnd.oasis.opendocument.text', 'OpenDocument text (ODT)', 'application/vnd.oasis.opendocument.text', 'odt'], ['mimetypeapplication/vnd.oasis.opendocument.spreadsheet', 'OpenDocument spreadsheet (ODS)', 'application/vnd.oasis.opendocument.spreadsheet', 'ods'], ['mimetypeapplication/vnd.oasis.opendocument.presentation', 'OpenDocument presentation (ODP)', 'application/vnd.oasis.opendocument.presentation', 'odp']];
/** Is this text? Returns the encoding name or null. */
export function textKind(b) {
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return 'UTF-8 with BOM'; if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) return 'UTF-16 LE'; if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) return 'UTF-16 BE';
  const n = Math.min(b.length, 4096); if (!n) return null; let ctrl = 0; for (let i = 0; i < n; i++) if (b[i] === 0 || (b[i] < 9) || (b[i] > 13 && b[i] < 32)) ctrl++; if (ctrl / n > 0.02) return null;
  try { new TextDecoder('utf-8', { fatal: true }).decode(b.subarray(0, n)); return [...b.subarray(0, n)].some(x => x > 127) ? 'UTF-8' : 'ASCII'; } catch { return 'Text in a legacy encoding'; }
}
/** Identify a file. Returns { id, description, mime, ext, details[], extensionMatches } from the content, not the name. */
export function detectFile(bytes, name = '') {
  const b = bytes.subarray(0, 40000), details = []; let hit = null;
  if (b.length >= 12 && ascii(b, 4, 4) === 'ftyp') { const brand = ascii(b, 8, 4); const br = BRANDS[brand] || BRANDS[brand.trim()]; hit = br ? { id: 'iso-bmff', description: br[0], mime: br[1], ext: br[2] } : { id: 'mp4', description: 'MP4 video', mime: 'video/mp4', ext: 'mp4' }; details.push(`Brand "${brand.trim()}"`); }
  if (!hit && b.length > 4 && eq(b, 0, [0x50, 0x4b, 3, 4]) || !hit && eq(b, 0, [0x50, 0x4b, 5, 6])) { const head = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 65536))); const o = OOXML.find(x => head.includes(x[0])); hit = o ? { id: o[3], description: o[1], mime: o[2], ext: o[3] } : { id: 'zip', description: 'ZIP archive', mime: 'application/zip', ext: 'zip' }; }
  if (!hit) { for (const [id, description, mime, ext, test] of SIGS) { try { if (b.length >= 2 && test(b)) { hit = { id, description, mime, ext }; break; } } catch { /* too short */ } } }
  if (hit?.id === 'mkv') { const s = new TextDecoder('latin1').decode(b.subarray(0, 64)); if (s.includes('webm')) hit = { id: 'webm', description: 'WebM video', mime: 'video/webm', ext: 'webm' }; }
  if (!hit) { const tk = textKind(b); if (tk) { const s = new TextDecoder().decode(b.subarray(0, 2000)).trimStart(); const lower = s.slice(0, 200).toLowerCase();
    if (/^<\?xml/.test(lower) && /<svg[\s>]/.test(lower + s.slice(200, 800).toLowerCase())) hit = { id: 'svg', description: 'SVG image', mime: 'image/svg+xml', ext: 'svg' }; else if (/<svg[\s>]/.test(lower)) hit = { id: 'svg', description: 'SVG image', mime: 'image/svg+xml', ext: 'svg' };
    else if (/^<!doctype html|^<html/.test(lower)) hit = { id: 'html', description: 'HTML document', mime: 'text/html', ext: 'html' }; else if (/^<\?xml/.test(lower) || /^<[a-z][\w:-]*[\s>]/.test(lower) && s.includes('</')) hit = { id: 'xml', description: 'XML document', mime: 'application/xml', ext: 'xml' };
    else if (/^[[{]/.test(s) && (() => { try { JSON.parse(new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 2e6)))); return true; } catch { return false; } })()) hit = { id: 'json', description: 'JSON data', mime: 'application/json', ext: 'json' };
    else if (/^#!/.test(s)) hit = { id: 'script', description: 'Script with a shebang line (' + s.split('\n')[0].slice(0, 40) + ')', mime: 'text/x-script', ext: 'sh' }; else hit = { id: 'text', description: 'Plain text', mime: 'text/plain', ext: 'txt' }; details.push(`Encoding: ${tk}`); } }
  if (!hit) hit = { id: 'unknown', description: 'Unknown binary data', mime: 'application/octet-stream', ext: '' };
  const extGiven = (name.match(/\.([A-Za-z0-9]+)$/) || [])[1]?.toLowerCase() || '';
  const sameFamily = (a, b) => a === b || (['jpg', 'jpeg'].includes(a) && ['jpg', 'jpeg'].includes(b)) || (['tif', 'tiff'].includes(a) && ['tif', 'tiff'].includes(b)) || (['htm', 'html'].includes(a) && ['htm', 'html'].includes(b)) || (['mid', 'midi'].includes(a) && ['mid', 'midi'].includes(b)) || (['mkv', 'webm'].includes(a) && ['mkv', 'webm'].includes(b)) || (['heic', 'heif'].includes(a) && ['heic', 'heif'].includes(b)) || (['doc', 'xls', 'ppt', 'msi'].includes(a) && hit.id === 'ole') || (['dll', 'exe', 'sys'].includes(a) && hit.id === 'exe') || (['mp4', 'm4v', 'mov', 'm4a', '3gp', 'heic', 'avif'].includes(a) && hit.id === 'iso-bmff') || (['md', 'csv', 'log', 'ini', 'cfg', 'conf', 'yml', 'yaml', 'js', 'ts', 'css', 'py', 'sh', 'sql', 'tsv', 'toml', 'rss', 'svg'].includes(a) && ['text', 'script', 'json', 'xml', 'html', 'svg'].includes(hit.id)) || (['gz', 'tgz'].includes(a) && hit.id === 'gz') || (['zip', 'jar', 'apk', 'epub', 'docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'xpi'].includes(a) && ['zip'].includes(hit.id)) || (['ttf', 'ttc'].includes(a) && hit.id === 'ttf');
  return { ...hit, details, extGiven, extensionMatches: !extGiven ? null : sameFamily(extGiven, hit.ext) || extGiven === hit.id, size: bytes.length };
}

// ── Folder tree ─────────────────────────────────────────────────────────────
/** entries: [{ path: "a/b/c.txt", size }]. Returns { text, files, folders, bytes }. opts: { maxDepth, filesOnly: false, foldersOnly, ignore: string[], sizes, sort: 'name'|'size' }. */
export function folderTree(entries, { maxDepth = 0, foldersOnly = false, ignore = [], sizes = false, sort = 'name', rootName = '' } = {}) {
  const root = { name: rootName, dir: true, kids: new Map(), size: 0 }; const ig = ignore.map(s => s.trim()).filter(Boolean).map(g => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'));
  let files = 0, bytes = 0;
  for (const e of entries) {
    const parts = e.path.replace(/\\/g, '/').split('/').filter(Boolean); if (!parts.length || parts.some(p => ig.some(r => r.test(p)))) continue;
    let node = root; parts.forEach((p, i) => { const last = i === parts.length - 1 && !e.dir; if (!node.kids.has(p)) node.kids.set(p, { name: p, dir: !last, kids: new Map(), size: 0 }); node = node.kids.get(p); if (last) { node.size = e.size || 0; files++; bytes += e.size || 0; } });
  }
  const total = n => n.dir ? [...n.kids.values()].reduce((a, k) => a + total(k), 0) : n.size; const calc = n => { if (n.dir) { n.size = [...n.kids.values()].reduce((a, k) => a + calc(k), 0); } return n.size; }; calc(root);
  const fmt = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(2)} GB`; void total;
  const lines = [rootName ? rootName + '/' : '.']; let folders = 0;
  const walk = (n, prefix, depth) => {
    let kids = [...n.kids.values()].filter(k => !(foldersOnly && !k.dir)); kids.sort((a, b) => (b.dir - a.dir) || (sort === 'size' ? b.size - a.size : a.name.localeCompare(b.name, undefined, { numeric: true })));
    kids.forEach((k, i) => { const last = i === kids.length - 1; if (k.dir) folders++; lines.push(`${prefix}${last ? '└── ' : '├── '}${k.name}${k.dir ? '/' : ''}${sizes && (k.size || !k.dir) ? `  (${fmt(k.size)})` : ''}`); if (k.dir && (!maxDepth || depth < maxDepth)) walk(k, prefix + (last ? '    ' : '│   '), depth + 1); });
  };
  walk(root, '', 1); return { text: lines.join('\n'), files, folders, bytes };
}
