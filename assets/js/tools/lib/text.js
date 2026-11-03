// text.js — pure text functions (no DOM). Covered by tests/text.test.mjs.

const lines = s => s.split(/\r\n|\r|\n/);

// ── Invisible characters ────────────────────────────────────────────────────
export const INVISIBLES = {
  '​': 'zero width space', '‌': 'zero width non-joiner', '‍': 'zero width joiner', '⁠': 'word joiner',
  '﻿': 'byte order mark', ' ': 'no-break space', ' ': 'narrow no-break space', ' ': 'figure space',
  ' ': 'thin space', ' ': 'hair space', ' ': 'en space', ' ': 'em space', '­': 'soft hyphen',
  '᠎': 'mongolian vowel separator', '‎': 'left-to-right mark', '‏': 'right-to-left mark', '　': 'ideographic space',
  ' ': 'line separator', ' ': 'paragraph separator',
};
export function cleanInvisible(text, { nbsp = true, keepJoiners = false } = {}) {
  const found = {};
  const out = [...text].map(ch => {
    if (!(ch in INVISIBLES)) return ch;
    found[ch] = (found[ch] || 0) + 1;
    if (keepJoiners && (ch === '‍' || ch === '‌')) return ch;
    if (/[       　]/.test(ch)) return nbsp ? ' ' : ch;
    if (ch === ' ' || ch === ' ') return '\n';
    return '';
  }).join('');
  return { text: out, found };
}

// ── Case ────────────────────────────────────────────────────────────────────
const SMALL = new Set('a an and as at but by for in nor of on or per the to vs via'.split(' '));
export function words(text) {
  return text.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}
export function convertCase(text, mode) {
  const cap = w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  switch (mode) {
    case 'upper': return text.toUpperCase();
    case 'lower': return text.toLowerCase();
    case 'sentence': return text.toLowerCase().replace(/(^\s*|[.!?]\s+|\n\s*)(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
    case 'title': return text.toLowerCase().replace(/\p{L}[\p{L}\p{N}']*/gu, (w, i) => (i > 0 && SMALL.has(w)) ? w : cap(w));
    case 'capitalize': return text.replace(/\p{L}[\p{L}\p{N}']*/gu, cap);
    case 'camel': return words(text).map((w, i) => i ? cap(w) : w.toLowerCase()).join('');
    case 'pascal': return words(text).map(cap).join('');
    case 'snake': return words(text).map(w => w.toLowerCase()).join('_');
    case 'constant': return words(text).map(w => w.toUpperCase()).join('_');
    case 'kebab': return words(text).map(w => w.toLowerCase()).join('-');
    case 'dot': return words(text).map(w => w.toLowerCase()).join('.');
    case 'alternating': return [...text].map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join('');
    case 'inverse': return [...text].map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('');
    default: return text;
  }
}

// ── Lists ───────────────────────────────────────────────────────────────────
export function dedupe(text, { ignoreCase = false, trim = true, dropEmpty = true, sortBy = 'first' } = {}) {
  const map = new Map(); const order = [];
  for (let line of lines(text)) {
    if (trim) line = line.trim();
    if (dropEmpty && !line) continue;
    const key = ignoreCase ? line.toLowerCase() : line;
    if (!map.has(key)) { map.set(key, { line, count: 0 }); order.push(key); }
    map.get(key).count++;
  }
  let items = order.map(k => map.get(k));
  if (sortBy === 'count') items.sort((a, b) => b.count - a.count);
  if (sortBy === 'alpha') items.sort((a, b) => a.line.localeCompare(b.line));
  const total = [...map.values()].reduce((n, x) => n + x.count, 0);
  return { items, total, unique: items.length, removed: total - items.length };
}

export function sortLines(text, mode = 'alpha', { reverse = false, ignoreCase = true, dropEmpty = true } = {}) {
  let ls = lines(text); if (dropEmpty) ls = ls.filter(l => l.trim() !== '');
  const coll = new Intl.Collator(undefined, { sensitivity: ignoreCase ? 'base' : 'variant', numeric: mode === 'natural' });
  const num = l => parseFloat(l.replace(/[^\d.\-]/g, ''));
  const cmp = { alpha: coll.compare, natural: coll.compare, length: (a, b) => a.length - b.length || coll.compare(a, b),
    number: (a, b) => (num(a) || 0) - (num(b) || 0) }[mode] || coll.compare;
  ls = ls.slice().sort(cmp); if (reverse) ls.reverse();
  return ls.join('\n');
}

export function shuffleLines(text, rand = secureRandom) {
  const ls = lines(text).filter(l => l.trim() !== '');
  for (let i = ls.length - 1; i > 0; i--) { const j = rand(i + 1); [ls[i], ls[j]] = [ls[j], ls[i]]; }
  return ls.join('\n');
}
export function secureRandom(n) { // unbiased integer in [0,n)
  const max = Math.floor(0x100000000 / n) * n; const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= max);
  return buf[0] % n;
}

export function filterLines(text, query, { mode = 'contains', invert = false, ignoreCase = true, regex = false } = {}) {
  if (!query) return lines(text).join('\n');
  let test;
  if (regex) { const re = new RegExp(query, ignoreCase ? 'i' : ''); test = l => re.test(l); }
  else { const q = ignoreCase ? query.toLowerCase() : query; const n = l => ignoreCase ? l.toLowerCase() : l;
    test = { contains: l => n(l).includes(q), starts: l => n(l).startsWith(q), ends: l => n(l).endsWith(q), equals: l => n(l) === q }[mode]; }
  return lines(text).filter(l => test(l) !== invert).join('\n');
}

export function prefixSuffix(text, { prefix = '', suffix = '', numbered = false, start = 1, pad = 0, skipEmpty = true, step = 1 } = {}) {
  let n = start;
  return lines(text).map(l => {
    if (skipEmpty && l === '') return l;
    const num = numbered ? String(n).padStart(pad, '0') : ''; n += step;
    return prefix.replaceAll('{n}', num) + l + suffix.replaceAll('{n}', num);
  }).join('\n');
}

export function mergeColumns(a, b, { sep = '\t', pad = false } = {}) {
  const A = lines(a), B = lines(b); const n = Math.max(A.length, B.length);
  const w = pad ? Math.max(0, ...A.map(x => x.length)) : 0;
  return Array.from({ length: n }, (_, i) => (pad ? (A[i] ?? '').padEnd(w) : (A[i] ?? '')) + sep + (B[i] ?? '')).join('\n');
}

export function delimiterConvert(text, { to = 'comma', quote = 'none', trim = true, dropEmpty = true, wrap = 'none', from = 'newline' } = {}) {
  const splitter = { newline: /\r\n|\r|\n/, comma: /,/, semicolon: /;/, tab: /\t/, space: /\s+/, pipe: /\|/ }[from];
  let items = text.split(splitter); if (trim) items = items.map(s => s.trim()); if (dropEmpty) items = items.filter(Boolean);
  const q = { none: s => s, double: s => `"${s.replaceAll('"', '\\"')}"`, single: s => `'${s.replaceAll("'", "\\'")}'`, backtick: s => '`' + s + '`' }[quote];
  items = items.map(q);
  const sep = { newline: '\n', comma: ',', 'comma-space': ', ', semicolon: ';', tab: '\t', space: ' ', pipe: '|' }[to];
  const joined = items.join(sep);
  return { array: '[' + items.join(', ') + ']', sql: '(' + items.join(', ') + ')', none: joined }[wrap];
}

// ── Cleaning ────────────────────────────────────────────────────────────────
export function normalizeQuotes(text, { dashes = true, ligatures = true, ellipsis = true, spaces = true, bullets = false } = {}) {
  let s = text.replace(/[‘’‚‛′ʼ]/g, "'").replace(/[“”„‟″«»]/g, '"');
  if (dashes) s = s.replace(/[–−‒]/g, '-').replace(/[—―]/g, '--').replace(/‑/g, '-');
  if (ellipsis) s = s.replace(/…/g, '...');
  if (ligatures) s = s.replace(/ﬀ/g, 'ff').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').replace(/ﬃ/g, 'ffi').replace(/ﬄ/g, 'ffl').replace(/Ĳ/g, 'IJ').replace(/ĳ/g, 'ij').replace(/Œ/g, 'OE').replace(/œ/g, 'oe').replace(/Æ/g, 'AE').replace(/æ/g, 'ae');
  if (spaces) s = s.replace(/[  -  　]/g, ' ').replace(/[​﻿­]/g, '');
  if (bullets) s = s.replace(/[•◦⁃▪]/g, '*');
  return s;
}

export function unwrapLines(text, { keepParagraphs = true, fixHyphens = true, bullets = true } = {}) {
  let s = text.replace(/\r\n?/g, '\n');
  if (fixHyphens) s = s.replace(/(\p{L})[-­]\n(\p{Ll})/gu, '$1$2');
  const keep = '\u0000';
  if (keepParagraphs) s = s.replace(/\n{2,}/g, keep);
  if (bullets) s = s.replace(/\n(?=\s*(?:[-*•]|\d+[.)])\s)/g, keep);
  s = s.replace(/[ \t]*\n[ \t]*/g, ' ').replace(/ {2,}/g, ' ');
  return s.replaceAll(keep, '\n\n').replace(/\n\n(?=\s*(?:[-*•]|\d+[.)])\s)/g, '\n').trim();
}

const EMOJI_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}️‍⃣]|[\u{1F3FB}-\u{1F3FF}]/gu;
export function stripEmoji(text, { asciiOnly = false, replacement = '' } = {}) {
  let n = 0; let s = text.replace(EMOJI_RE, () => { n++; return replacement; });
  if (asciiOnly) { s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\x00-\x7F]/g, c => { n++; return replacement; }); }
  return { text: s, removed: n };
}

export function slugify(text, { sep = '-', lower = true, maxLen = 0, stopWords = false } = {}) {
  const map = { 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'đ': 'd', 'ł': 'l', 'þ': 'th', 'ð': 'd', 'ı': 'i', 'Æ': 'AE', 'Œ': 'OE', 'Ø': 'O', 'Đ': 'D', 'Ł': 'L' };
  let s = text.replace(/[ßæœøđłþðıÆŒØĐŁ]/g, c => map[c]).normalize('NFKD').replace(/[̀-ͯ]/g, '');
  if (lower) s = s.toLowerCase();
  let parts = s.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (stopWords) parts = parts.filter(w => !SMALL.has(w.toLowerCase()) && !['is', 'it', 'be', 'are', 'was', 'with', 'that', 'this'].includes(w.toLowerCase()));
  let out = parts.join(sep);
  if (maxLen && out.length > maxLen) { out = out.slice(0, maxLen); const i = out.lastIndexOf(sep); if (i > maxLen * 0.5) out = out.slice(0, i); }
  return out;
}

// ── Extraction ──────────────────────────────────────────────────────────────
export const PATTERNS = {
  email: { label: 'Email addresses', re: /[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}/g },
  url: { label: 'URLs', re: /\bhttps?:\/\/[^\s<>"'`)\]}]+[^\s<>"'`)\]}.,;:!?]/g },
  phone: { label: 'Phone numbers', re: /(?<![\w])(?:\+|00)?\d{1,3}?[\s.\-]?\(?\d{2,4}\)?[\s.\-]?\d{3,4}[\s.\-]?\d{3,4}(?![\w])/g },
  uuid: { label: 'UUIDs', re: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi },
  ipv4: { label: 'IPv4 addresses', re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g },
  hex: { label: 'Hex colors', re: /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})\b/gi },
  hashtag: { label: 'Hashtags', re: /(?<![\w&])#[\p{L}][\p{L}\p{N}_]*/gu },
  mention: { label: '@mentions', re: /(?<![\w@.])@[A-Za-z0-9_]{2,}/g },
  date: { label: 'Dates (ISO or D.M.Y)', re: /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}[./]\d{2,4})\b/g },
  number: { label: 'Numbers', re: /-?\d+(?:[.,]\d+)*/g },
  iban: { label: 'IBANs', re: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g },
};
export function extract(text, key, { unique = true, custom = '', flags = 'g' } = {}) {
  const re = key === 'custom' ? new RegExp(custom, flags.includes('g') ? flags : flags + 'g') : new RegExp(PATTERNS[key].re.source, PATTERNS[key].re.flags);
  const all = text.match(re) || [];
  const items = unique ? [...new Set(all)] : all;
  return { items, total: all.length };
}
export function extractEmails(text) {
  const { items, total } = extract(text, 'email', { unique: false });
  const clean = [...new Set(items.map(e => e.toLowerCase().replace(/^[.\-_]+|[.\-]+$/g, '')))].sort();
  const byDomain = {};
  for (const e of clean) (byDomain[e.split('@')[1]] ||= []).push(e);
  return { emails: clean, total, byDomain };
}
const TRACKING = /^(utm_[a-z0-9_]+|fbclid|gclid|gclsrc|dclid|msclkid|mc_cid|mc_eid|igshid|yclid|_hsenc|_hsmi|hsa_[a-z]+|mkt_tok|ref|ref_src|ref_url|s_cid|spm|vero_id|oly_enc_id|oly_anon_id|wickedid|twclid|ttclid|li_fat_id|cmpid|campaign_id|sr_share|si|feature|share)$/i;
export function cleanUrl(raw, { removeAll = false, hash = false } = {}) {
  try {
    const u = new URL(raw); const removed = [];
    if (removeAll) { u.search = ''; } else for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) { removed.push(k); u.searchParams.delete(k); }
    if (hash) u.hash = '';
    return { url: u.toString().replace(/\?$/, ''), removed };
  } catch { return { url: raw, removed: [] }; }
}
export function extractUrls(text, opts = {}) {
  const raw = extract(text, 'url', { unique: false }).items;
  const seen = new Set(); const out = [];
  for (const r of raw) { const c = cleanUrl(r, opts); if (!seen.has(c.url)) { seen.add(c.url); out.push(c); } }
  return out;
}
export function cleanUrlsInText(text, opts = {}) { return text.replace(PATTERNS.url.re, u => cleanUrl(u, opts).url); }

// ── Counting ────────────────────────────────────────────────────────────────
export function utf8Bytes(s) { return new TextEncoder().encode(s).length; }
export function graphemes(s) { return typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].length : [...s].length; }
const GSM = new Set("@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà");
const GSM_EXT = new Set('^{}\\[~]|€');
export function smsInfo(s) {
  let units = 0, gsm = true;
  for (const ch of s) { if (GSM.has(ch)) units += 1; else if (GSM_EXT.has(ch)) units += 2; else { gsm = false; break; } }
  if (!gsm) { units = 0; for (const ch of s) units += ch.codePointAt(0) > 0xFFFF ? 2 : 1; }
  const single = gsm ? 160 : 70, multi = gsm ? 153 : 67;
  const parts = units === 0 ? 0 : units <= single ? 1 : Math.ceil(units / multi);
  return { units, gsm, parts, perPart: parts > 1 ? multi : single };
}
export const LIMITS = [
  ['X / Twitter post', 280], ['LinkedIn post', 3000], ['LinkedIn headline', 220], ['Instagram caption', 2200], ['Facebook post (recommended)', 477],
  ['Google Ads headline', 30], ['Google Ads description', 90], ['Meta title (≈ 600 px)', 60], ['Meta description', 160], ['YouTube title', 100], ['TikTok caption', 2200],
];
export function wordCount(s) { const m = s.trim().match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu); return m ? m.length : 0; }
export function sentenceCount(s) { const m = s.match(/[^.!?…]+[.!?…]+(?=\s|$)/g); return m ? m.length : (s.trim() ? 1 : 0); }
export const PACES = { slow: 110, natural: 150, energetic: 180 };
export function speakingTime(s, wpm = 150, { pauses = 0 } = {}) {
  const w = wordCount(s); const secs = Math.round(w / wpm * 60 + pauses * 2 * (s.match(/\n\s*\n/g)?.length || 0) / 1);
  return { words: w, seconds: secs };
}
export function formatDuration(sec) { const m = Math.floor(sec / 60), s = sec % 60; return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m ${s}s` : `${m}m ${String(s).padStart(2, '0')}s`; }

const STOP = {
  en: 'a about above after again all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its just me more most my no nor not now of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up us very was we were what when where which while who whom why will with would you your',
  de: 'aber alle als also am an auch auf aus bei bin bis bist da damit dann das dass dein der die dies doch dort du durch ein eine einen einer er es für hat hatte ich ihr im in ist ja kann mein mit nach nicht noch nur oder ohne sehr sein sich sie sind so über um und uns von vor war was wenn wir wird wo zu zum zur',
  none: '',
};
export function wordFrequency(text, { stop = 'en', n = 1, min = 1, ignoreNumbers = false, limit = 100 } = {}) {
  const stops = new Set((STOP[stop] || '').split(' '));
  const tokens = (text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu) || []).map(w => w.replace(/['’]s$/, ''));
  const counts = new Map(); let total = 0;
  if (n === 1) { for (const w of tokens) { if (stops.has(w) || (ignoreNumbers && /^\d/.test(w)) || w.length < 2 && !/\p{N}/u.test(w)) continue; total++; counts.set(w, (counts.get(w) || 0) + 1); } }
  else for (let i = 0; i + n <= tokens.length; i++) { const g = tokens.slice(i, i + n); if (stops.has(g[0]) || stops.has(g[n - 1])) continue; total++; const k = g.join(' '); counts.set(k, (counts.get(k) || 0) + 1); }
  const rows = [...counts].filter(([, c]) => c >= min).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit)
    .map(([w, c]) => ({ word: w, count: c, pct: total ? c / total * 100 : 0 }));
  return { rows, total, unique: counts.size, tokens: tokens.length };
}

// ── Splitting ───────────────────────────────────────────────────────────────
export function chunkText(text, max, { overlap = 0, byWords = true, byParagraph = false } = {}) {
  if (max < 1) throw new Error('Chunk size must be at least 1');
  const chunks = [];
  if (byParagraph) {
    let cur = '';
    for (const p of text.split(/\n{2,}/)) { if (cur && (cur + '\n\n' + p).length > max) { chunks.push(cur); cur = p; } else cur = cur ? cur + '\n\n' + p : p; if (cur.length > max) { chunks.push(...chunkText(cur, max, { byWords })); cur = ''; } }
    if (cur) chunks.push(cur); return chunks;
  }
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + max, text.length);
    if (byWords && end < text.length) { const sp = text.lastIndexOf(' ', end); const nl = text.lastIndexOf('\n', end); const cut = Math.max(sp, nl); if (cut > i) end = cut; }
    const piece = text.slice(i, end).trim(); if (piece) chunks.push(piece);
    if (end >= text.length) break;
    i = Math.max(end - (overlap > 0 ? overlap : 0), i + 1);
    while (byWords && /\s/.test(text[i] || '') ) i++;
  }
  return chunks;
}

// ── Whitespace ──────────────────────────────────────────────────────────────
export function tabsSpaces(text, { mode = 'tabs-to-spaces', size = 4, trailing = false, leadingOnly = true } = {}) {
  const fix = l => {
    if (mode === 'tabs-to-spaces') {
      if (leadingOnly) return l.replace(/^\t+/, m => ' '.repeat(size * m.length));
      let col = 0; return [...l].map(c => c === '\t' ? ' '.repeat(size - col % size) : (col++, c)).map((c, i, a) => c).join('');
    }
    return l.replace(/^[ \t]+/, m => { const w = [...m].reduce((n, c) => n + (c === '\t' ? size - n % size : 1), 0); return '\t'.repeat(Math.floor(w / size)) + ' '.repeat(w % size); });
  };
  return lines(text).map(l => { l = fix(l); return trailing ? l.replace(/[ \t]+$/, '') : l; }).join('\n');
}

// ── Encoders ────────────────────────────────────────────────────────────────
export function rot(text, shift = 13, { digits = false } = {}) {
  const s = ((shift % 26) + 26) % 26;
  return text.replace(/[a-z]/gi, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + s) % 26 + b); })
    .replace(/\d/g, d => digits ? String((Number(d) + shift % 10 + 10) % 10) : d);
}
export const NATO = { A: 'Alfa', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf', H: 'Hotel', I: 'India', J: 'Juliett', K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November', O: 'Oscar', P: 'Papa', Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango', U: 'Uniform', V: 'Victor', W: 'Whiskey', X: 'X-ray', Y: 'Yankee', Z: 'Zulu',
  0: 'Zero', 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', '.': 'Stop', '-': 'Dash', '@': 'At', '_': 'Underscore', '/': 'Slash', ',': 'Comma' };
export function nato(text, { showCase = true } = {}) {
  const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'SS');
  return lines(text).map(l => [...fold(l)].map(c => {
    if (c === ' ') return '/'; const u = c.toUpperCase(); const w = NATO[u]; if (!w) return c;
    return showCase && /[a-z]/.test(c) ? w.toLowerCase() : w;
  }).join(' ')).join('\n');
}
export function convertBase(text, { from = 'text', to = 'hex', sep = ' ' } = {}) {
  const enc = new TextEncoder(), dec = new TextDecoder('utf-8', { fatal: true });
  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bytes;
  const tokens = () => text.trim().split(/[\s,;:]+/).filter(Boolean);
  if (from === 'text') bytes = enc.encode(text);
  else if (from === 'hex') bytes = Uint8Array.from(text.replace(/0x/gi, '').match(/[0-9a-f]{1,2}/gi)?.map(h => parseInt(h.padStart(2, '0'), 16)) || []);
  else if (from === 'binary') bytes = Uint8Array.from(tokens().map(b => { if (!/^[01]{1,8}$/.test(b)) throw new Error(`Not a binary byte: ${b}`); return parseInt(b, 2); }));
  else if (from === 'decimal') bytes = Uint8Array.from(tokens().map(d => { const n = Number(d); if (!Number.isInteger(n) || n < 0 || n > 255) throw new Error(`Not a byte (0–255): ${d}`); return n; }));
  else if (from === 'octal') bytes = Uint8Array.from(tokens().map(o => { if (!/^[0-7]{1,3}$/.test(o) || parseInt(o, 8) > 255) throw new Error(`Not an octal byte: ${o}`); return parseInt(o, 8); }));
  else if (from === 'base32') {
    let bits = ''; for (const c of text.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')) { const i = B32.indexOf(c); if (i < 0) throw new Error(`Not Base32: ${c}`); bits += i.toString(2).padStart(5, '0'); }
    bytes = Uint8Array.from(bits.match(/.{8}/g)?.map(b => parseInt(b, 2)) || []);
  } else if (from === 'base64') bytes = Uint8Array.from(atob(text.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const fmt = {
    text: () => dec.decode(bytes), hex: () => [...bytes].map(b => b.toString(16).padStart(2, '0')).join(sep), binary: () => [...bytes].map(b => b.toString(2).padStart(8, '0')).join(sep),
    decimal: () => [...bytes].join(sep), octal: () => [...bytes].map(b => b.toString(8).padStart(3, '0')).join(sep),
    base32: () => { let bits = [...bytes].map(b => b.toString(2).padStart(8, '0')).join(''); while (bits.length % 5) bits += '0'; let o = bits.match(/.{5}/g)?.map(b => B32[parseInt(b, 2)]).join('') || ''; while (o.length % 8) o += '='; return o; },
    base64: () => btoa(String.fromCharCode(...bytes)),
  }[to];
  return fmt();
}

// ── Morse ───────────────────────────────────────────────────────────────────
export const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.' };
const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
export function toMorse(text) {
  const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'SS').replace(/Ä/gi, 'AE').toUpperCase();
  return lines(text).map(l => l.trim().split(/\s+/).map(w => [...fold(w)].map(c => MORSE[c]).filter(Boolean).join(' ')).filter(Boolean).join(' / ')).join('\n');
}
export function fromMorse(code) {
  return lines(code).map(l => l.trim().split(/\s*(?:\/|\|)\s*|\s{3,}/).map(w => w.trim().split(/\s+/).map(s => MORSE_REV[s.replace(/[·•]/g, '.').replace(/[–—−_]/g, '-')] ?? (s ? '?' : '')).join('')).join(' ')).join('\n');
}
/** Timeline of [on, ms] pairs for audio. Unit = dot length in ms. */
export function morseTimeline(code, unit = 80) {
  const ev = [];
  for (const ch of code) {
    if (ch === '.') ev.push([true, unit], [false, unit]);
    else if (ch === '-') ev.push([true, unit * 3], [false, unit]);
    else if (ch === ' ') ev.push([false, unit * 2]);
    else if (ch === '/') ev.push([false, unit * 4]);
    else if (ch === '\n') ev.push([false, unit * 6]);
  }
  return ev;
}

// ── Tables, outlines, placeholders ──────────────────────────────────────────
export function splitTable(text, delim = 'auto') {
  const ls = lines(text).filter(l => l.trim() !== '');
  const d = delim !== 'auto' ? { tab: '\t', comma: ',', semicolon: ';', pipe: '|', spaces: /\s{2,}/ }[delim] : ls.some(l => l.includes('\t')) ? '\t' : ls.some(l => l.includes('|')) ? '|' : ls.some(l => l.includes(';')) ? ';' : ls.some(l => /\s{2,}/.test(l)) ? /\s{2,}/ : ',';
  let rows = ls.map(l => l.split(d).map(c => c.trim()));
  if (d === '|') rows = rows.map(r => r.filter((c, i) => !(c === '' && (i === 0 || i === r.length - 1))));
  const w = Math.max(0, ...rows.map(r => r.length));
  return rows.map(r => Array.from({ length: w }, (_, i) => r[i] ?? ''));
}
const md = s => s.replaceAll('|', '\\|').replace(/\n/g, '<br>');
export function tableToMarkdown(rows, { align = 'left', pretty = true, header = true } = {}) {
  if (!rows.length) return '';
  const head = header ? rows[0] : rows[0].map((_, i) => `Column ${i + 1}`); const body = header ? rows.slice(1) : rows;
  const all = [head, ...body].map(r => r.map(md)); const w = head.map((_, i) => Math.max(3, ...all.map(r => (r[i] ?? '').length)));
  const sep = w.map(n => { const dashes = '-'.repeat(pretty ? n : 3); return align === 'center' ? ':' + dashes.slice(2) + ':' : align === 'right' ? dashes.slice(1) + ':' : ':' + dashes.slice(1); });
  const row = r => '| ' + r.map((c, i) => pretty ? (align === 'right' ? c.padStart(w[i]) : align === 'center' ? c.padStart(Math.floor((w[i] + c.length) / 2)).padEnd(w[i]) : c.padEnd(w[i])) : c).join(' | ') + ' |';
  return [row(all[0]), '| ' + sep.join(' | ') + ' |', ...all.slice(1).map(row)].join('\n');
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function tableToHtml(rows, { header = true, indent = '  ' } = {}) {
  const tr = (r, tag) => `${indent}${indent}<tr>${r.map(c => `<${tag}>${esc(c)}</${tag}>`).join('')}</tr>`;
  const head = header ? `${indent}<thead>\n${tr(rows[0], 'th')}\n${indent}</thead>\n` : '';
  return `<table>\n${head}${indent}<tbody>\n${(header ? rows.slice(1) : rows).map(r => tr(r, 'td')).join('\n')}\n${indent}</tbody>\n</table>`;
}
export function parseOutline(text, tab = 2) {
  const root = { text: 'root', children: [] }; const stack = [{ depth: -1, node: root }];
  for (const raw of lines(text)) {
    if (!raw.trim()) continue;
    const m = raw.match(/^([ \t]*)(?:[-*+•]\s+|\d+[.)]\s+)?(.*)$/); const ind = m[1].replace(/\t/g, ' '.repeat(tab)).length;
    const node = { text: m[2].trim(), children: [] };
    while (stack.length > 1 && stack[stack.length - 1].depth >= ind) stack.pop();
    stack[stack.length - 1].node.children.push(node); stack.push({ depth: ind, node });
  }
  return root.children;
}
const toObj = n => n.children.length ? { [n.text]: n.children.map(toObj) } : n.text;
export function outlineTo(text, format = 'json', tab = 2) {
  const tree = parseOutline(text, tab);
  if (format === 'json') return JSON.stringify(tree.map(function f(n) { return n.children.length ? { text: n.text, children: n.children.map(f) } : { text: n.text }; }), null, 2);
  const ul = (ns, d) => `${'  '.repeat(d)}<ul>\n${ns.map(n => `${'  '.repeat(d + 1)}<li>${esc(n.text)}${n.children.length ? '\n' + ul(n.children, d + 2) + '\n' + '  '.repeat(d + 1) : ''}</li>`).join('\n')}\n${'  '.repeat(d)}</ul>`;
  const xml = (ns, d) => ns.map(n => n.children.length ? `${'  '.repeat(d)}<item title="${esc(n.text)}">\n${xml(n.children, d + 1)}\n${'  '.repeat(d)}</item>` : `${'  '.repeat(d)}<item title="${esc(n.text)}"/>`).join('\n');
  if (format === 'html') return ul(tree, 0);
  if (format === 'xml') return `<?xml version="1.0" encoding="UTF-8"?>\n<outline>\n${xml(tree, 1)}\n</outline>`;
  if (format === 'markdown') { const md = (ns, d) => ns.map(n => `${'  '.repeat(d)}- ${n.text}` + (n.children.length ? '\n' + md(n.children, d + 1) : '')).join('\n'); return md(tree, 0); }
  if (format === 'yaml') { const y = (ns, d) => ns.map(n => n.children.length ? `${'  '.repeat(d)}- ${JSON.stringify(n.text)}:\n${y(n.children, d + 1)}` : `${'  '.repeat(d)}- ${JSON.stringify(n.text)}`).join('\n'); return y(tree, 0); }
  throw new Error('Unknown format');
}
export function fillTemplate(template, values) {
  const names = [...new Set([...template.matchAll(/\{\{\s*([\w .\-]+?)\s*\}\}/g)].map(m => m[1]))];
  return { names, text: template.replace(/\{\{\s*([\w .\-]+?)\s*\}\}/g, (m, k) => values[k] !== undefined && values[k] !== '' ? values[k] : m) };
}

// ── Plain-language checker ──────────────────────────────────────────────────
export const BUZZWORDS = [
  ['synergy', 'teamwork'], ['leverage', 'use'], ['circle back', 'follow up'], ['touch base', 'talk'], ['low-hanging fruit', 'easy wins'], ['move the needle', 'make a difference'],
  ['paradigm shift', 'big change'], ['deep dive', 'detailed look'], ['bandwidth', 'time'], ['take offline', 'discuss later'], ['best of breed', 'best'], ['core competency', 'main strength'],
  ['value add', 'benefit'], ['going forward', 'from now on'], ['at the end of the day', 'in the end'], ['think outside the box', 'be creative'], ['drill down', 'look closer'],
  ['ideate', 'brainstorm'], ['actionable', 'practical'], ['stakeholder buy-in', 'agreement'], ['win-win', 'good for everyone'], ['holistic', 'complete'], ['robust', 'strong'],
  ['scalable', 'able to grow'], ['seamless', 'smooth'], ['streamline', 'simplify'], ['pivot', 'change direction'], ['disrupt', 'change'], ['ecosystem', 'network'], ['alignment', 'agreement'],
  ['empower', 'enable'], ['proactive', 'ahead of time'], ['mission critical', 'essential'], ['thought leader', 'expert'], ['boil the ocean', 'try to do too much'], ['double click on', 'look closer at'],
  ['reach out', 'contact'], ['ping', 'message'], ['loop in', 'include'], ['offline', 'later'], ['onboard', 'bring in'], ['utilize', 'use'], ['facilitate', 'help'], ['optimize', 'improve'],
  ['mindshare', 'attention'], ['sync up', 'meet'], ['north star', 'main goal'], ['table stakes', 'basic requirement'], ['pain point', 'problem'], ['quick win', 'easy win'], ['unpack', 'explain'],
  ['one-stop shop', 'all in one place'], ['game changer', 'big improvement'], ['cutting-edge', 'modern'], ['state of the art', 'modern'], ['best practice', 'good way'], ['learnings', 'lessons'], ['ask', 'request'],
];
export function findBuzzwords(text) {
  const hits = [];
  for (const [w, r] of BUZZWORDS) {
    const esc = x => x.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
    const multi = w.includes(' ') || w.includes('-');
    const pat = multi ? `${esc(w)}(?:s|es|ed|ing)?` : /[^aeiou]e$/.test(w) ? `${esc(w.slice(0, -1))}(?:e|es|ed|ing)` : `${esc(w)}(?:s|es|ed|ing)?`;
    const re = new RegExp(`(?<![\\p{L}])${pat}(?![\\p{L}])`, 'giu');
    for (const m of text.matchAll(re)) hits.push({ word: w, replacement: r, index: m.index, length: m[0].length });
  }
  return hits.sort((a, b) => a.index - b.index);
}
export const TONE_RULES = [
  ['As per my last email', 'As mentioned earlier', 'passive-aggressive'], ['per my last email', 'as mentioned earlier', 'passive-aggressive'], ['as I already said', 'to repeat', 'passive-aggressive'],
  ['as previously stated', 'as mentioned', 'passive-aggressive'], ['not sure if you saw', 'in case you missed it', 'passive-aggressive'], ['friendly reminder', 'quick reminder', 'passive-aggressive'],
  ['going forward', 'from now on', 'cliché'], ['with all due respect', '(say it directly)', 'passive-aggressive'], ['no offense', '(say it directly)', 'passive-aggressive'],
  ['I\'m sorry to bother you', 'Quick question', 'over-apologising'], ['sorry to bother', 'quick question', 'over-apologising'], ['just wanted to', '(remove "just")', 'softener'],
  ['I just', 'I', 'softener'], ['sorry for', 'thanks for your patience with', 'over-apologising'], ['sorry, but', '(remove the apology)', 'over-apologising'], ['does that make sense', 'what questions do you have', 'softener'],
  ['I\'m no expert', '(state your point)', 'softener'], ['whenever you get a chance', 'by [date]', 'vague'], ['as soon as possible', 'by [date]', 'vague'], ['ASAP', 'by [date]', 'vague'],
  ['I would have thought', 'I expected', 'passive-aggressive'], ['you should have', 'next time, please', 'blaming'], ['you always', '(be specific)', 'blaming'], ['you never', '(be specific)', 'blaming'],
  ['I\'m disappointed', 'I was hoping', 'guilt-tripping'], ['after all I\'ve done', '(state the need)', 'guilt-tripping'], ['if you\'d bothered', '(state the need)', 'blaming'], ['obviously', '(remove)', 'condescending'],
  ['clearly', '(remove)', 'condescending'], ['simply', '(remove)', 'condescending'], ['as you know', '(remove)', 'condescending'], ['to be honest', '(remove)', 'filler'], ['thanks in advance', 'thank you', 'presumptuous'],
  ['kindly', 'please', 'passive-aggressive'], ['I hope this email finds you well', '(start with your point)', 'cliché'], ['per our conversation', 'as we discussed', 'cliché'],
];
export function auditTone(text) {
  const hits = [];
  for (const [phrase, fix, kind] of TONE_RULES) {
    const re = new RegExp(`(?<![\\p{L}])${phrase.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&')}(?![\\p{L}])`, 'giu');
    for (const m of text.matchAll(re)) hits.push({ phrase: m[0], fix, kind, index: m.index, length: m[0].length });
  }
  const sorry = (text.match(/\b(sorry|apologi[sz]e|apologies)\b/gi) || []).length;
  const excl = (text.match(/!/g) || []).length; const caps = (text.match(/\b[A-Z]{4,}\b/g) || []).length;
  const notes = [];
  if (sorry >= 3) notes.push(`"sorry/apologise" appears ${sorry} times. One is enough.`);
  if (excl >= 4) notes.push(`${excl} exclamation marks can read as shouting or forced cheer.`);
  if (caps >= 2) notes.push(`${caps} words in ALL CAPS can read as shouting.`);
  return { hits: hits.sort((a, b) => a.index - b.index), notes };
}
