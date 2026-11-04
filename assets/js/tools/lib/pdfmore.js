// pdfmore.js — searching text in pages and comparing pages. Pure functions on page texts (use pdf.js to get them).
import { diffWords, diffStats } from './diff.js';
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Search an array of page texts. opts: { caseSensitive, wholeWord, regex, context }. Throws a readable error for a bad regex. */
export function searchPages(pages, query, { caseSensitive = false, wholeWord = false, regex = false, context = 45, limit = 2000 } = {}) {
  if (!query) return { hits: [], total: 0, pagesWith: 0 };
  let src = regex ? query : esc(query); if (wholeWord) src = `(?<![\\p{L}\\p{N}_])(?:${src})(?![\\p{L}\\p{N}_])`;
  let re; try { re = new RegExp(src, `gu${caseSensitive ? '' : 'i'}`); } catch (e) { throw new Error(String(e.message).replace(/^Invalid regular expression: /, '')); }
  const hits = []; let total = 0; const withHits = new Set();
  pages.forEach((raw, p) => { const text = raw.replace(/\s+/g, ' '); re.lastIndex = 0; let m; while ((m = re.exec(text))) { total++; withHits.add(p + 1); if (hits.length < limit) hits.push({ page: p + 1, match: m[0], before: text.slice(Math.max(0, m.index - context), m.index), after: text.slice(m.index + m[0].length, m.index + m[0].length + context) }); if (m[0] === '') re.lastIndex++; } });
  return { hits, total, pagesWith: withHits.size, truncated: total > hits.length };
}
/** Word-level difference of two page texts: { ops, added, removed, same, changedShare }. */
export function comparePage(a, b) {
  const A = a.replace(/\s+/g, ' ').trim(), B = b.replace(/\s+/g, ' ').trim(); if (A === B) return { ops: A ? [{ t: 'eq', v: A }] : [], added: 0, removed: 0, same: A ? A.split(' ').length : 0, changedShare: 0 };
  const ops = diffWords(A, B), s = diffStats(ops), words = ops.filter(o => /\S/.test(o.v)); const count = t => words.filter(o => o.t === t).length;
  const added = count('add'), removed = count('del'), same = count('eq'), total = added + removed + same;
  return { ops, added, removed, same, changedShare: total ? Math.round(1000 * (added + removed) / total) / 10 : 0, _s: s };
}
/** Settings from gentle to strong for "compress to a target size". */
export const COMPRESS_LADDER = [{ name: 'structure only', level: 'low' }, { name: '150 dpi', level: { dpi: 150, quality: 0.72 } }, { name: '120 dpi', level: { dpi: 120, quality: 0.62 } }, { name: '96 dpi', level: { dpi: 96, quality: 0.5 } }, { name: '72 dpi', level: { dpi: 72, quality: 0.42 } }, { name: '60 dpi', level: { dpi: 60, quality: 0.34 } }, { name: '48 dpi', level: { dpi: 48, quality: 0.28 } }];
/** Parse "2 MB", "500 KB", "1.5mb" or a plain number of megabytes into bytes. */
export function parseSize(text, defaultUnit = 'MB') { const m = /^\s*(\d+(?:[.,]\d+)?)\s*(kb|mb|gb|k|m|g)?\s*$/i.exec(String(text)); if (!m) return null; const n = parseFloat(m[1].replace(',', '.')), u = (m[2] || defaultUnit).toLowerCase()[0]; return Math.round(n * ({ k: 1024, m: 1048576, g: 1073741824 })[u]); }
