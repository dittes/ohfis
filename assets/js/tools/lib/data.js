// data.js — table transformations. Rows are arrays of strings; the first row is usually the header.
import { pad } from './csv.js';

const isNum = s => /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/.test(s ?? '');
const num = s => parseFloat(String(s).replace(/\s/g, ''));
export const colLetter = i => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };
export const colIndex = L => [...L.toUpperCase()].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

// ── Leading zeros ───────────────────────────────────────────────────────────
export function restoreLeadingZeros(rows, { columns, width, header = true }) {
  const start = header ? 1 : 0; let fixed = 0;
  return { rows: rows.map((r, ri) => ri < start ? r : r.map((c, ci) => { const w = width[ci] ?? width['*']; if (!w || (columns && !columns.includes(ci)) || !/^\d+$/.test(c) || c.length >= w) return c; fixed++; return c.padStart(w, '0'); })), fixed };
}
export function guessWidths(rows, header = true) {
  const body = rows.slice(header ? 1 : 0); const w = {};
  for (let c = 0; c < (rows[0] || []).length; c++) { const vals = body.map(r => r[c]).filter(v => /^\d+$/.test(v ?? '')); if (!vals.length) continue; const lens = vals.map(v => v.length); const max = Math.max(...lens), min = Math.min(...lens); if (max > min && vals.filter(v => v.length === max).length / vals.length >= 0.5) w[c] = max; }
  return w;
}

// ── Excel dates ─────────────────────────────────────────────────────────────
const DAY = 86400000;
export function serialToDate(serial, { date1904 = false } = {}) {
  if (!Number.isFinite(serial) || serial < 0) return null;
  const days = Math.floor(serial); const frac = serial - days;
  let ms;
  if (date1904) ms = Date.UTC(1904, 0, 1) + days * DAY;
  else if (days < 60) ms = Date.UTC(1899, 11, 31) + days * DAY;
  else if (days === 60) return { feb29: true, d: new Date(Date.UTC(1900, 1, 28)), frac };
  else ms = Date.UTC(1899, 11, 30) + days * DAY;
  return { d: new Date(ms + Math.round(frac * DAY)), frac };
}
export function serialToISO(serial, opts = {}) {
  const r = serialToDate(serial, opts); if (!r) return null; if (r.feb29) return '1900-02-29 (Excel bug: this day never existed)';
  const iso = r.d.toISOString(); return r.frac > 0 ? iso.slice(0, 19).replace('T', ' ') : iso.slice(0, 10);
}
export function dateToSerial(input, { date1904 = false } = {}) {
  const m = String(input).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null; const [y, mo, d, h = 0, mi = 0, s = 0] = m.slice(1).map(x => x === undefined ? undefined : Number(x));
  const t = Date.UTC(y, mo - 1, d); if (new Date(t).getUTCMonth() !== mo - 1) return null;
  let days = (t - Date.UTC(1899, 11, 30)) / DAY;
  if (date1904) days = (t - Date.UTC(1904, 0, 1)) / DAY; else if (days < 61) days -= 1;
  return days + (h * 3600 + mi * 60 + s) / 86400;
}

// ── JSON ⇄ table ────────────────────────────────────────────────────────────
export function flatten(obj, { sep = '.', arrays = 'index' } = {}) {
  const out = {};
  const walk = (v, key) => {
    if (v !== null && typeof v === 'object') {
      if (Array.isArray(v)) {
        if (arrays === 'join' && v.every(x => x === null || typeof x !== 'object')) { out[key] = v.join('; '); return; }
        if (arrays === 'json') { out[key] = JSON.stringify(v); return; }
        if (!v.length) { out[key] = ''; return; }
        v.forEach((x, i) => walk(x, key ? `${key}${sep}${i}` : String(i)));
      } else { const keys = Object.keys(v); if (!keys.length) { out[key] = ''; return; } keys.forEach(k => walk(v[k], key ? `${key}${sep}${k}` : k)); }
    } else out[key] = v;
  };
  walk(obj, ''); return out;
}
export function jsonToRows(json, opts = {}) {
  let data = typeof json === 'string' ? JSON.parse(json) : json;
  if (!Array.isArray(data)) { const arr = Object.values(data).find(v => Array.isArray(v) && v.length && typeof v[0] === 'object'); data = opts.unwrap !== false && arr ? arr : [data]; }
  const flats = data.map(x => x !== null && typeof x === 'object' ? flatten(x, opts) : { value: x });
  const headers = []; const seen = new Set(); for (const f of flats) for (const k of Object.keys(f)) if (!seen.has(k)) { seen.add(k); headers.push(k); }
  const cell = v => v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return [headers, ...flats.map(f => headers.map(h => cell(f[h])))];
}
export function unflatten(flat, sep = '.') {
  const root = {};
  for (const [k, v] of Object.entries(flat)) {
    const parts = sep ? k.split(sep) : [k]; let cur = root;
    parts.forEach((p, i) => { const last = i === parts.length - 1; const nextIsIdx = /^\d+$/.test(parts[i + 1] ?? ''); if (last) cur[p] = v; else { cur[p] ??= nextIsIdx ? [] : {}; cur = cur[p]; } });
  }
  return root;
}
export function inferValue(s) {
  if (s === '') return null; if (/^(true|false)$/i.test(s)) return s.toLowerCase() === 'true';
  if (/^-?(0|[1-9]\d*)(\.\d+)?([eE][-+]?\d+)?$/.test(s) && Number.isFinite(Number(s)) && String(Number(s)).length <= 16) return Number(s);
  return s;
}
export function rowsToJson(rows, { types = true, nested = false, sep = '.', header = true } = {}) {
  const head = header ? rows[0] : rows[0].map((_, i) => `column${i + 1}`); const body = rows.slice(header ? 1 : 0);
  return body.map(r => { const o = {}; head.forEach((h, i) => { o[h || `column${i + 1}`] = types ? inferValue(r[i] ?? '') : (r[i] ?? ''); }); return nested ? unflatten(o, sep) : o; });
}

// ── Shape ───────────────────────────────────────────────────────────────────
export const transpose = rows => { const p = pad(rows); return p[0] ? p[0].map((_, c) => p.map(r => r[c])) : []; };

export function pivot(rows, { row, col = null, value, agg = 'sum', header = true }) {
  const body = rows.slice(header ? 1 : 0); const head = header ? rows[0] : rows[0].map((_, i) => `Column ${i + 1}`);
  const groups = new Map(); const cols = new Set();
  const reduce = vals => { const nums = vals.map(num).filter(Number.isFinite); switch (agg) {
    case 'count': return vals.length; case 'counta': return vals.filter(v => v !== '').length; case 'distinct': return new Set(vals).size;
    case 'sum': return nums.reduce((a, b) => a + b, 0); case 'avg': return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : ''; case 'min': return nums.length ? Math.min(...nums) : ''; case 'max': return nums.length ? Math.max(...nums) : ''; case 'median': { if (!nums.length) return ''; const s = [...nums].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; } } };
  for (const r of body) { const rk = r[row] ?? ''; const ck = col == null ? '' : (r[col] ?? ''); cols.add(ck); const g = groups.get(rk) ?? new Map(); const arr = g.get(ck) ?? []; arr.push(r[value] ?? ''); g.set(ck, arr); groups.set(rk, g); }
  const colKeys = [...cols].sort(); const round = x => typeof x === 'number' ? Math.round(x * 1e6) / 1e6 : x;
  if (col == null) return [[head[row], `${agg}(${head[value]})`], ...[...groups].sort((a, b) => String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true })).map(([k, g]) => [k, String(round(reduce(g.get('') || [])))])];
  const out = [[head[row], ...colKeys, 'Total']];
  for (const [k, g] of [...groups].sort((a, b) => String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true }))) out.push([k, ...colKeys.map(c => g.has(c) ? String(round(reduce(g.get(c)))) : ''), String(round(reduce([...g.values()].flat())))]);
  return out;
}

export function splitColumn(rows, { col, mode = 'delimiter', delimiter = ',', regex = false, positions = [], max = 0, header = true, keep = false, names = [] }) {
  const split = v => {
    v = v ?? '';
    if (mode === 'positions') { const p = [0, ...positions, v.length]; return p.slice(0, -1).map((s, i) => v.slice(s, p[i + 1]).trim()); }
    if (mode === 'pattern') { const m = v.match(new RegExp(delimiter)); return m ? (m.length > 1 ? m.slice(1) : [m[0]]) : []; }
    const re = regex ? new RegExp(delimiter) : null; let parts = re ? v.split(re) : v.split(delimiter);
    if (max > 1 && parts.length > max) { if (re) { const first = parts.slice(0, max - 1); const rest = v.split(re).length; parts = [...first, parts.slice(max - 1).join(delimiter)]; } else parts = [...parts.slice(0, max - 1), parts.slice(max - 1).join(delimiter)]; }
    return parts.map(p => p.trim());
  };
  const start = header ? 1 : 0; const body = rows.slice(start).map(r => split(r[col])); const n = Math.max(1, ...body.map(b => b.length));
  const base = header ? rows[0][col] : `Column ${col + 1}`;
  const newHead = Array.from({ length: n }, (_, i) => names[i] || `${base} ${i + 1}`);
  const build = (r, parts) => { const filled = Array.from({ length: n }, (_, i) => parts[i] ?? ''); return [...r.slice(0, col), ...(keep ? [r[col]] : []), ...filled, ...r.slice(col + 1)]; };
  const out = rows.slice(start).map((r, i) => build(r, body[i]));
  return header ? [build(rows[0], []).map((_, i) => i).length ? [...rows[0].slice(0, col), ...(keep ? [rows[0][col]] : []), ...newHead, ...rows[0].slice(col + 1)] : [], ...out] : out;
}

export function diffTables(a, b, { key = -1, header = true } = {}) {
  const changes = []; const idx = (rows) => { const m = new Map(); rows.slice(header ? 1 : 0).forEach((r, i) => m.set(key >= 0 ? r[key] : String(i), r)); return m; };
  const A = idx(a), B = idx(b); const headA = header ? a[0] : null, headB = header ? b[0] : null;
  const name = c => (headB?.[c] ?? headA?.[c] ?? `Column ${c + 1}`);
  let added = 0, removed = 0, changed = 0, same = 0;
  for (const [k, ra] of A) {
    if (!B.has(k)) { removed++; changes.push({ type: 'removed', key: k, row: ra }); continue; }
    const rb = B.get(k); const cells = []; const w = Math.max(ra.length, rb.length);
    for (let c = 0; c < w; c++) if ((ra[c] ?? '') !== (rb[c] ?? '')) cells.push({ col: c, name: name(c), from: ra[c] ?? '', to: rb[c] ?? '' });
    if (cells.length) { changed++; changes.push({ type: 'changed', key: k, cells, row: rb }); } else same++;
  }
  for (const [k, rb] of B) if (!A.has(k)) { added++; changes.push({ type: 'added', key: k, row: rb }); }
  return { changes, added, removed, changed, same, headerChanged: header && JSON.stringify(headA) !== JSON.stringify(headB) };
}

export function fillBlanks(rows, { mode = 'value', value = '', columns = null, header = true }) {
  const start = header ? 1 : 0; const out = rows.map(r => [...r]); let filled = 0; const w = Math.max(0, ...rows.map(r => r.length));
  for (let c = 0; c < w; c++) {
    if (columns && !columns.includes(c)) continue;
    const col = out.slice(start).map(r => r[c] ?? ''); const nums = col.filter(isNum).map(num);
    const calc = { average: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null, median: nums.length ? [...nums].sort((a, b) => a - b)[nums.length >> 1] : null,
      most: (() => { const m = {}; col.filter(v => v !== '').forEach(v => m[v] = (m[v] || 0) + 1); return Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''; })(), min: nums.length ? Math.min(...nums) : null, max: nums.length ? Math.max(...nums) : null }[mode];
    let prev = ''; for (let r = start; r < out.length; r++) {
      const v = out[r][c] ?? ''; if (v.trim() !== '') { prev = v; continue; }
      let rep = null;
      if (mode === 'value') rep = value; else if (mode === 'previous') rep = prev || null; else if (mode === 'next') { for (let k = r + 1; k < out.length; k++) if ((out[k][c] ?? '').trim() !== '') { rep = out[k][c]; break; } }
      else if (mode === 'zero') rep = '0'; else rep = calc == null ? null : String(Math.round(calc * 1e6) / 1e6);
      if (rep !== null) { out[r][c] = rep; filled++; }
    }
  }
  return { rows: out, filled };
}

// ── Cleaning ────────────────────────────────────────────────────────────────
export function trimCells(rows, { inner = false, nbsp = true, invisible = true } = {}) {
  let changed = 0;
  const fix = c => { let s = c; if (nbsp) s = s.replace(/[   　]/g, ' '); if (invisible) s = s.replace(/[​-‍﻿⁠­]/g, ''); s = s.trim(); if (inner) s = s.replace(/\s{2,}/g, ' '); if (s !== c) changed++; return s; };
  return { rows: rows.map(r => r.map(fix)), changed };
}
export function sanitizeHeaders(headers, { style = 'snake', maxLen = 0 } = {}) {
  const used = new Map(); const reserved = new Set('select from where table order group by user index key values default primary check'.split(' '));
  return headers.map((h, i) => {
    let s = String(h ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[%]/g, ' pct ').replace(/[&]/g, ' and ').replace(/#/g, ' number ').replace(/\+/g, ' plus ').replace(/@/g, ' at ');
    let parts = s.split(/[^A-Za-z0-9]+|(?<=[a-z0-9])(?=[A-Z])/).filter(Boolean).map(p => p.toLowerCase());
    let name = style === 'camel' ? parts.map((p, k) => k ? p[0].toUpperCase() + p.slice(1) : p).join('') : style === 'kebab' ? parts.join('-') : parts.join('_');
    if (!name) name = `column_${i + 1}`; if (/^\d/.test(name)) name = (style === 'camel' ? 'col' : 'col_') + name;
    if (reserved.has(name)) name += '_col'; if (maxLen && name.length > maxLen) name = name.slice(0, maxLen);
    const n = (used.get(name) || 0) + 1; used.set(name, n); return n > 1 ? `${name}_${n}` : name;
  });
}
export function mergeTables(tables, { header = true, mode = 'by-name' } = {}) {
  if (!tables.length) return { rows: [], warnings: [] };
  const warnings = []; const first = tables[0][0] || [];
  if (!header) return { rows: tables.flat(), warnings };
  if (mode === 'strict') { const out = [first]; tables.forEach((t, i) => { if (JSON.stringify(t[0]) !== JSON.stringify(first)) warnings.push(`File ${i + 1} has different headers`); out.push(...t.slice(1)); }); return { rows: out, warnings }; }
  const heads = []; const seen = new Set(); for (const t of tables) for (const h of t[0] || []) if (!seen.has(h)) { seen.add(h); heads.push(h); }
  const out = [heads]; tables.forEach((t, i) => { const idx = heads.map(h => (t[0] || []).indexOf(h)); if ((t[0] || []).length !== heads.length || idx.some((x, k) => x !== k)) warnings.push(`File ${i + 1}: columns aligned by name`); for (const r of t.slice(1)) out.push(idx.map(k => k < 0 ? '' : (r[k] ?? ''))); });
  return { rows: out, warnings };
}
export function unpivot(rows, { idCols = [1], varName = 'attribute', valName = 'value', skipEmpty = true, header = true }) {
  const head = header ? rows[0] : rows[0].map((_, i) => `Column ${i + 1}`); const ids = idCols.map(Number); const vals = head.map((_, i) => i).filter(i => !ids.includes(i));
  const out = [[...ids.map(i => head[i]), varName, valName]];
  for (const r of rows.slice(header ? 1 : 0)) for (const c of vals) { const v = r[c] ?? ''; if (skipEmpty && v === '') continue; out.push([...ids.map(i => r[i] ?? ''), head[c], v]); }
  return out;
}
export function normalizeColumns(rows, { columns, method = 'zscore', header = true, decimals = 4, sample = true }) {
  const out = rows.map(r => [...r]); const stats = [];
  for (const c of columns) {
    const vals = rows.slice(header ? 1 : 0).map(r => r[c]).filter(isNum).map(num); if (!vals.length) continue;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length; const dev = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, vals.length - (sample ? 1 : 0)));
    const min = Math.min(...vals), max = Math.max(...vals); stats.push({ col: c, mean, sd: dev, min, max, n: vals.length });
    const f = { zscore: x => dev ? (x - mean) / dev : 0, minmax: x => max === min ? 0 : (x - min) / (max - min), maxabs: x => x / (Math.max(Math.abs(min), Math.abs(max)) || 1) }[method];
    for (let r = header ? 1 : 0; r < out.length; r++) if (isNum(out[r][c])) out[r][c] = String(Math.round(f(num(out[r][c])) * 10 ** decimals) / 10 ** decimals);
    if (header) out[0][c] = `${rows[0][c]}_${method}`;
  }
  return { rows: out, stats };
}
export function percentChange(rows, { from, to, decimals = 1, header = true, suffix = false, name = '% change' }) {
  const out = rows.map((r, i) => { if (header && i === 0) return [...r, name]; const a = num(r[from]), b = num(r[to]); if (!isNum(r[from]) || !isNum(r[to])) return [...r, '']; if (a === 0) return [...r, b === 0 ? '0' : 'n/a']; const p = (b - a) / Math.abs(a) * 100; return [...r, p.toFixed(decimals) + (suffix ? ' %' : '')]; });
  return out;
}

export function parseMoney(raw, { hint = 'auto' } = {}) {
  let s = String(raw ?? '').trim(); if (!s) return null;
  let neg = /^\(.*\)$/.test(s) || /^-|-$|\bCR\b/i.test(s.replace(/[A-Za-z$€£¥]/g, m => m)) && /^-|-$|^\(/.test(s) || /^[^\d]*-\s*\d/.test(s);
  const code = (s.match(/\b(USD|EUR|GBP|CHF|PLN|CZK|SEK|NOK|DKK|JPY|CAD|AUD)\b/i)?.[1] || ({ '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', 'zł': 'PLN', 'Kč': 'CZK', 'kr': 'SEK' })[(s.match(/[$€£¥]|zł|Kč|kr/) || [])[0]] || '').toUpperCase();
  s = s.replace(/[^\d.,'’\s-]/g, '').replace(/[\s'’]/g, '').replace(/^-|-$/g, '');
  if (!/\d/.test(s)) return null;
  const lastDot = s.lastIndexOf('.'), lastCom = s.lastIndexOf(','); let dec = null;
  if (lastDot >= 0 && lastCom >= 0) dec = lastDot > lastCom ? '.' : ',';
  else if (lastDot >= 0 || lastCom >= 0) {
    const sep = lastDot >= 0 ? '.' : ','; const count = s.split(sep).length - 1; const after = s.length - s.lastIndexOf(sep) - 1;
    if (count > 1) dec = null; else if (hint === 'us') dec = sep === '.' ? '.' : (after === 3 ? null : ','); else if (hint === 'eu') dec = sep === ',' ? ',' : (after === 3 ? null : '.'); else dec = after === 3 ? null : sep;
  }
  let t = dec ? s.replace(dec === '.' ? /,/g : /\./g, '') : s.replace(/[.,]/g, ''); if (dec === ',') t = t.replace(',', '.');
  const v = parseFloat(t); if (!Number.isFinite(v)) return null; return { value: neg ? -v : v, currency: code };
}

// ── SQL / GeoJSON ───────────────────────────────────────────────────────────
export function inferType(values) {
  const v = values.filter(x => x !== ''); if (!v.length) return 'TEXT';
  if (v.every(x => /^-?\d+$/.test(x) && Math.abs(Number(x)) < 2 ** 53 && !/^-?0\d/.test(x))) return 'INTEGER';
  if (v.every(x => /^-?\d*\.\d+$|^-?\d+\.\d*$|^-?\d+$/.test(x) && !/^-?0\d/.test(x))) return 'DECIMAL';
  if (v.every(x => /^(true|false)$/i.test(x))) return 'BOOLEAN';
  if (v.every(x => /^\d{4}-\d{2}-\d{2}$/.test(x))) return 'DATE';
  if (v.every(x => /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?/.test(x))) return 'TIMESTAMP';
  return 'TEXT';
}
export function toSQL(rows, { table = 'my_table', dialect = 'mysql', mode = 'insert', key = [], batch = 100, create = false, header = true, emptyNull = true } = {}) {
  const Q = { mysql: n => '`' + n.replaceAll('`', '``') + '`', postgres: n => '"' + n.replaceAll('"', '""') + '"', sqlite: n => '"' + n.replaceAll('"', '""') + '"', mssql: n => '[' + n.replaceAll(']', ']]') + ']' }[dialect];
  const head = header ? rows[0] : rows[0].map((_, i) => `column_${i + 1}`); const body = rows.slice(header ? 1 : 0);
  const types = head.map((_, c) => inferType(body.map(r => r[c] ?? '')));
  const lit = (v, type) => { v = v ?? ''; if (v === '' && emptyNull) return 'NULL'; if ((type === 'INTEGER' || type === 'DECIMAL')) return v; if (type === 'BOOLEAN') return dialect === 'mssql' || dialect === 'mysql' || dialect === 'sqlite' ? (v.toLowerCase() === 'true' ? '1' : '0') : v.toLowerCase(); return (dialect === 'mssql' ? 'N' : '') + "'" + v.replaceAll("'", "''").replaceAll(dialect === 'mysql' ? '\\' : '\u0000', '\\\\') + "'"; };
  const out = []; const T = Q(table);
  if (create) out.push(`CREATE TABLE ${T} (\n${head.map((h, i) => `  ${Q(h)} ${({ TEXT: dialect === 'mssql' ? 'NVARCHAR(MAX)' : 'TEXT', INTEGER: 'BIGINT', DECIMAL: dialect === 'mssql' ? 'DECIMAL(18,6)' : 'NUMERIC', BOOLEAN: dialect === 'mssql' ? 'BIT' : dialect === 'mysql' ? 'TINYINT(1)' : dialect === 'sqlite' ? 'INTEGER' : 'BOOLEAN', DATE: 'DATE', TIMESTAMP: dialect === 'mssql' ? 'DATETIME2' : 'TIMESTAMP' })[types[i]]}`).join(',\n')}\n);`);
  if (mode === 'insert') {
    for (let i = 0; i < body.length; i += batch) out.push(`INSERT INTO ${T} (${head.map(Q).join(', ')}) VALUES\n${body.slice(i, i + batch).map(r => `  (${head.map((_, c) => lit(r[c], types[c])).join(', ')})`).join(',\n')};`);
  } else {
    const keys = key.length ? key : [0]; const sets = head.map((_, i) => i).filter(i => !keys.includes(i));
    for (const r of body) out.push(`UPDATE ${T} SET ${sets.map(c => `${Q(head[c])} = ${lit(r[c], types[c])}`).join(', ')} WHERE ${keys.map(c => `${Q(head[c])} = ${lit(r[c], types[c])}`).join(' AND ')};`);
  }
  return out.join('\n\n');
}
/** Strict coordinate parser: "52.5" and "52,5" are numbers; "52,5abc" or "1,234.5" are not. */
export function parseCoord(v) {
  const s = String(v ?? '').trim();
  if (/^[-+]?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (/^[-+]?\d+,\d+$/.test(s)) return Number(s.replace(',', '.'));
  return NaN;
}
export function toGeoJSON(rows, { lat, lon, header = true, props = null } = {}) {
  const head = header ? rows[0] : rows[0].map((_, i) => `column${i + 1}`); const features = []; const skipped = [];
  const f = parseCoord;
  rows.slice(header ? 1 : 0).forEach((r, i) => {
    const la = f(r[lat]), lo = f(r[lon]);
    if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) { skipped.push({ row: i + (header ? 2 : 1), lat: r[lat], lon: r[lon] }); return; }
    const p = {}; head.forEach((h, c) => { if (c !== lat && c !== lon && (!props || props.includes(c))) p[h] = r[c] ?? ''; });
    features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [lo, la] }, properties: p });
  });
  return { geojson: { type: 'FeatureCollection', features }, skipped };
}
export function guessLatLon(head) {
  const find = re => head.findIndex(h => re.test(h)); return { lat: find(/^(lat|latitude|breite|y)$/i), lon: find(/^(lon|lng|long|longitude|länge|x)$/i) };
}

// ── Markdown tables ─────────────────────────────────────────────────────────
export function formatMarkdownTable(text, { compact = false, align = null } = {}) {
  const lines = text.split(/\r?\n/).filter(l => l.trim()); if (!lines.length) return '';
  const cells = l => { let s = l.trim(); if (s.startsWith('|')) s = s.slice(1); if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1); const out = []; let cur = ''; for (let i = 0; i < s.length; i++) { if (s[i] === '\\' && s[i + 1] === '|') { cur += '\\|'; i++; } else if (s[i] === '|') { out.push(cur.trim()); cur = ''; } else cur += s[i]; } out.push(cur.trim()); return out; };
  const isDelim = l => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(l);
  const di = lines.findIndex((l, i) => i > 0 && isDelim(l)); let aligns = []; let rows;
  if (di > 0) { aligns = cells(lines[di]).map(c => /^:-+:$/.test(c) ? 'center' : /-:$/.test(c) ? 'right' : /^:-/.test(c) ? 'left' : 'none'); rows = lines.filter((_, i) => i !== di).map(cells); } else rows = lines.map(cells);
  const w = Math.max(...rows.map(r => r.length)); rows = rows.map(r => Array.from({ length: w }, (_, i) => r[i] ?? ''));
  const al = Array.from({ length: w }, (_, i) => align || aligns[i] || 'none');
  const wid = Array.from({ length: w }, (_, i) => Math.max(3, ...rows.map(r => [...r[i]].length)));
  const padc = (s, i) => { if (compact) return s; const gap = wid[i] - [...s].length; return al[i] === 'right' ? ' '.repeat(gap) + s : al[i] === 'center' ? ' '.repeat(Math.floor(gap / 2)) + s + ' '.repeat(Math.ceil(gap / 2)) : s + ' '.repeat(gap); };
  const line = r => '| ' + r.map(padc).join(' | ') + ' |';
  const delim = '| ' + al.map((a, i) => { const d = '-'.repeat(compact ? 3 : wid[i]); return a === 'center' ? ':' + d.slice(2) + ':' : a === 'right' ? d.slice(1) + ':' : a === 'left' ? ':' + d.slice(1) : d; }).join(' | ') + ' |';
  return [line(rows[0]), delim, ...rows.slice(1).map(line)].join('\n');
}

// ── Phone numbers ───────────────────────────────────────────────────────────
export const COUNTRIES = { US: ['1', 'United States'], CA: ['1', 'Canada'], GB: ['44', 'United Kingdom'], DE: ['49', 'Germany'], AT: ['43', 'Austria'], CH: ['41', 'Switzerland'], FR: ['33', 'France'], IT: ['39', 'Italy'], ES: ['34', 'Spain'], NL: ['31', 'Netherlands'], BE: ['32', 'Belgium'], PL: ['48', 'Poland'], CZ: ['420', 'Czechia'], SK: ['421', 'Slovakia'], SE: ['46', 'Sweden'], DK: ['45', 'Denmark'], NO: ['47', 'Norway'], FI: ['358', 'Finland'], IE: ['353', 'Ireland'], PT: ['351', 'Portugal'], AU: ['61', 'Australia'], NZ: ['64', 'New Zealand'], IN: ['91', 'India'], BR: ['55', 'Brazil'], MX: ['52', 'Mexico'], JP: ['81', 'Japan'], ZA: ['27', 'South Africa'], TR: ['90', 'Türkiye'], UA: ['380', 'Ukraine'], HU: ['36', 'Hungary'], RO: ['40', 'Romania'], GR: ['30', 'Greece'] };
const NO_TRUNK = new Set(['US', 'CA', 'PL', 'CZ', 'SK', 'ES', 'PT', 'IT', 'DK', 'NO', 'SE_', 'FI_', 'IE_']);
export function normalizePhone(raw, { country = 'US', style = 'e164' } = {}) {
  const orig = String(raw ?? '').trim(); if (!orig) return { ok: false, value: '', reason: 'empty' };
  let s = orig.replace(/(ext\.?|x|extension|durchwahl|dw)\s*\d+$/i, '').replace(/\(0\)/g, ''); const plus = /^\s*(\+|00)/.test(s); let d = s.replace(/\D/g, '');
  const [cc] = COUNTRIES[country] || COUNTRIES.US; let intl;
  if (plus) { d = s.trim().startsWith('00') ? d.slice(2) : d; intl = d; }
  else if (country === 'US' || country === 'CA') intl = d.length === 11 && d[0] === '1' ? d : d.length === 10 ? '1' + d : null;
  else { const trunk = !NO_TRUNK.has(country); intl = d.startsWith(cc) && d.length > cc.length + 6 && !d.startsWith('0') ? d : cc + (trunk ? d.replace(/^0/, '') : d); }
  if (!intl || intl.length < 8 || intl.length > 15) return { ok: false, value: orig, reason: 'length' };
  if ((intl.startsWith('1') && intl.length !== 11)) return { ok: false, value: orig, reason: 'NANP numbers have 10 digits after +1' };
  const e164 = '+' + intl;
  if (style === 'e164') return { ok: true, value: e164 };
  if (style === 'digits') return { ok: true, value: intl };
  const ccLen = intl.startsWith('1') ? 1 : (Object.values(COUNTRIES).map(c => c[0]).filter(c => intl.startsWith(c)).sort((a, b) => b.length - a.length)[0] || intl.slice(0, 2)).length; const rest = intl.slice(ccLen);
  if (ccLen === 1 && intl[0] === '1') return { ok: true, value: style === 'national' ? `(${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}` : `+1 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}` };
  const groups = rest.match(/^(\d{2,4})(\d{3,4})(\d{2,5})?$/) ? rest.replace(/^(\d{2,4})(\d{3,4})(\d{2,5})?$/, (m, a, b, c) => [a, b, c].filter(Boolean).join(' ')) : rest.replace(/(\d{3})(?=\d)/g, '$1 ');
  return { ok: true, value: `+${intl.slice(0, ccLen)} ${groups}` };
}

// ── Addresses ───────────────────────────────────────────────────────────────
const US_STATES = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' ');
export function parseAddress(line) {
  const raw = String(line ?? '').trim(); if (!raw) return { street: '', number: '', unit: '', city: '', state: '', zip: '', country: '', format: '' };
  let s = raw.replace(/\s+/g, ' '); let country = '';
  const cm = s.match(/,\s*(USA|U\.S\.A\.|United States|Deutschland|Germany|UK|United Kingdom|Canada|Austria|Österreich|Schweiz|Switzerland)$/i); if (cm) { country = cm[1]; s = s.slice(0, cm.index); }
  const unitRe = /(?:,?\s*)((?:Apt|Apartment|Unit|Suite|Ste|#|Floor|Fl|Room|Rm|Bldg|Building)\.?\s*#?\s*[\w-]+)/i; let unit = '';
  const um = s.match(unitRe); if (um) { unit = um[1].trim(); s = (s.slice(0, um.index) + s.slice(um.index + um[0].length)).replace(/\s+,/g, ',').replace(/^,|,\s*$/g, '').trim(); }
  let m = s.match(/^(.+?),\s*(.+?),?\s+([A-Za-z]{2})\.?\s+(\d{5})(?:-(\d{4}))?$/);
  if (m && US_STATES.includes(m[3].toUpperCase())) { const n = m[1].match(/^(\d+[A-Za-z]?(?:[-/]\d+)?)\s+(.+)$/); return { street: n ? n[2] : m[1], number: n ? n[1] : '', unit, city: m[2], state: m[3].toUpperCase(), zip: m[4] + (m[5] ? '-' + m[5] : ''), country: country || 'USA', format: 'US' }; }
  m = s.match(/^(.+?)\s+(\d+\s?[A-Za-z]?(?:\s?[-–/]\s?\d+[A-Za-z]?)?),?\s*(?:(?:[A-Z]{1,2}[-\s])?(\d{4,5}))\s+(.+)$/);
  if (m) return { street: m[1].replace(/,$/, ''), number: m[2], unit, city: m[4], state: '', zip: m[3], country, format: 'EU' };
  m = s.match(/^(.+?),\s*(.+?),?\s*([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/i);
  if (m) { const n = m[1].match(/^(\d+[A-Za-z]?)\s+(.+)$/); return { street: n ? n[2] : m[1], number: n ? n[1] : '', unit, city: m[2], state: '', zip: m[3].toUpperCase(), country: country || 'UK', format: 'UK' }; }
  const parts = s.split(',').map(p => p.trim()); return { street: parts[0] || '', number: '', unit, city: parts[1] || '', state: '', zip: '', country, format: 'unknown' };
}

// ── Sample size ─────────────────────────────────────────────────────────────
export function zScore(conf) { // conf in (0,100); inverse normal (Acklam)
  const p = 1 - (1 - conf / 100) / 2; const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00], b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01], c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00], d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const lo = 0.02425; let x;
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  else if (p <= 1 - lo) { const q = p - 0.5, r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  else { const q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  return x;
}
export function sampleSize({ population = Infinity, confidence = 95, margin = 5, proportion = 50 }) {
  const z = zScore(confidence), p = proportion / 100, e = margin / 100; const n0 = z * z * p * (1 - p) / (e * e);
  const n = Number.isFinite(population) ? n0 / (1 + (n0 - 1) / population) : n0; return { z, n0: Math.ceil(n0), n: Math.ceil(n) };
}
