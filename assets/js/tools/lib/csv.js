// csv.js — RFC 4180 CSV parsing/writing, delimiter sniffing, encodings.

export const DELIMS = { comma: ',', semicolon: ';', tab: '\t', pipe: '|' };

export function parseCSV(text, delimiter = ',') {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = []; let row = [], field = '', inQ = false, i = 0; const n = text.length; let any = false;
  while (i < n) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === '"' && field === '') { inQ = true; any = true; i++; continue; }
    if (ch === delimiter) { row.push(field); field = ''; any = true; i++; continue; }
    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = ''; any = false; i++; continue;
    }
    field += ch; any = true; i++;
  }
  if (any || field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function detectDelimiter(text) {
  const sample = text.slice(0, 100000).replace(/^﻿/, '');
  const lines = []; let cur = '', q = false;
  for (const ch of sample) { if (ch === '"') q = !q; if ((ch === '\n' || ch === '\r') && !q) { if (cur) lines.push(cur); cur = ''; if (lines.length >= 30) break; } else cur += ch; }
  if (cur && lines.length < 30) lines.push(cur);
  let best = ',', bestScore = -1;
  for (const d of [',', ';', '\t', '|']) {
    const counts = lines.map(l => { let c = 0, inq = false; for (const ch of l) { if (ch === '"') inq = !inq; else if (ch === d && !inq) c++; } return c; });
    const nz = counts.filter(c => c > 0); if (!nz.length) continue;
    const mode = Object.entries(nz.reduce((m, c) => (m[c] = (m[c] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1])[0];
    const consistent = nz.filter(c => c === Number(mode[0])).length / lines.length;
    const score = consistent * 100 + Math.min(Number(mode[0]), 20) * 0.1;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}

export function toCSV(rows, { delimiter = ',', quoteAll = false, eol = '\n', escapeFormulas = false } = {}) {
  const q = v => {
    let s = v == null ? '' : String(v);
    if (escapeFormulas && /^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = "'" + s;
    return quoteAll || /["\r\n]/.test(s) || s.includes(delimiter) || /^\s|\s$/.test(s) && s.trim() !== s && false ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return rows.map(r => r.map(q).join(delimiter)).join(eol);
}

export function pad(rows) { const w = Math.max(0, ...rows.map(r => r.length)); return rows.map(r => r.length === w ? r : [...r, ...Array(w - r.length).fill('')]); }

export const ENCODINGS = ['utf-8', 'windows-1252', 'iso-8859-1', 'iso-8859-2', 'windows-1250', 'windows-1251', 'macintosh', 'utf-16le', 'utf-16be'];
export function decodeBytes(bytes, enc = 'utf-8') { return new TextDecoder(enc, { fatal: false }).decode(bytes); }
/** Guess between UTF-8 and Windows-1252 by checking whether the bytes are valid UTF-8. */
export function guessEncoding(bytes) {
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return 'utf-8';
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) return 'utf-16le'; if (bytes[0] === 0xFE && bytes[1] === 0xFF) return 'utf-16be';
  try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return 'utf-8'; } catch { return 'windows-1252'; }
}
const CP1252 = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F };
/** Repair "MÃ¼ller" style text: UTF-8 bytes that were decoded as Windows-1252/Latin-1. */
export function fixMojibake(s) {
  const dec = new TextDecoder('utf-8', { fatal: true });
  const once = str => {
    const bytes = []; for (const ch of str) { const c = ch.codePointAt(0); if (c < 0x100) bytes.push(c); else if (CP1252[c]) bytes.push(CP1252[c]); else return null; }
    try { return dec.decode(Uint8Array.from(bytes)); } catch { return null; }
  };
  const suspicious = /[ÃÂâÐÑ][\u0080-¿ŒœŠšŸŽžƒˆ˜–—‘-„†-•…‰‹›€™]|ï»¿/;
  // fix per line/token so good text next to broken text is untouched
  return s.replace(/[^\s]*[\u0080-ÿŒœŠšŸŽžƒˆ˜–—‘-„†-•…‰‹›€™][^\s]*/gu, tok => {
    let cur = tok;
    for (let i = 0; i < 3 && suspicious.test(cur); i++) { const f = once(cur); if (!f || f === cur) break; cur = f; }
    return cur;
  });
}
