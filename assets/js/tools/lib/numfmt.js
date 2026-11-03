// numfmt.js — a practical subset of Excel number formats: sections, conditions, 0 # ? , . % E+, literals, @, dates and times.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function splitSections(fmt) {
  const out = []; let cur = '', q = false, br = false;
  for (let i = 0; i < fmt.length; i++) {
    const ch = fmt[i];
    if (ch === '\\') { cur += ch + (fmt[i + 1] ?? ''); i++; continue; }
    if (ch === '"') q = !q; else if (!q && ch === '[') br = true; else if (!q && ch === ']') br = false;
    if (ch === ';' && !q && !br) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur); return out;
}
function tokenize(sec) {
  const t = []; let i = 0;
  while (i < sec.length) {
    const ch = sec[i];
    if (ch === '"') { const j = sec.indexOf('"', i + 1); const end = j < 0 ? sec.length : j; t.push({ k: 'lit', v: sec.slice(i + 1, end) }); i = end + 1; }
    else if (ch === '\\') { t.push({ k: 'lit', v: sec[i + 1] ?? '' }); i += 2; }
    else if (ch === '_') { t.push({ k: 'lit', v: ' ' }); i += 2; }
    else if (ch === '*') { t.push({ k: 'fill', v: sec[i + 1] ?? ' ' }); i += 2; }
    else if (ch === '[') { const j = sec.indexOf(']', i); const body = sec.slice(i + 1, j < 0 ? sec.length : j); i = (j < 0 ? sec.length : j) + 1;
      if (/^(h+|m+|s+)$/i.test(body)) t.push({ k: 'elapsed', v: body.toLowerCase() }); else if (/^\$/.test(body)) { const m = body.match(/^\$([^-\]]*)/); if (m && m[1]) t.push({ k: 'lit', v: m[1] }); } else t.push({ k: 'meta', v: body }); }
    else if (/[0#?]/.test(ch)) { t.push({ k: 'dig', v: ch }); i++; }
    else if (ch === '.') { t.push({ k: 'dot' }); i++; }
    else if (ch === ',') { t.push({ k: 'comma' }); i++; }
    else if (ch === '%') { t.push({ k: 'pct' }); i++; }
    else if (/^[eE][+-]/.test(sec.slice(i, i + 2))) { t.push({ k: 'exp', v: sec[i] + sec[i + 1] }); i += 2; }
    else if (ch === '@') { t.push({ k: 'text' }); i++; }
    else if (/[yYdDhHsSmMaApP]/.test(ch)) {
      const m = sec.slice(i).match(/^(AM\/PM|A\/P|am\/pm|a\/p|y+|m+|d+|h+|s+|Y+|M+|D+|H+|S+)/i);
      if (m) { t.push({ k: 'date', v: m[1] }); i += m[1].length; } else { t.push({ k: 'lit', v: ch }); i++; }
    }
    else { t.push({ k: 'lit', v: ch }); i++; }
  }
  return t;
}
const group = s => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function fmtDate(serial, toks) {
  const days = Math.floor(serial); const frac = serial - days; let secs = Math.round(frac * 86400); let d = days;
  if (secs >= 86400) { secs -= 86400; d++; }
  const ms = d < 60 ? Date.UTC(1899, 11, 31) + d * 86400000 : Date.UTC(1899, 11, 30) + d * 86400000; const dt = new Date(ms);
  const Y = dt.getUTCFullYear(), M = dt.getUTCMonth(), D = dt.getUTCDate(), W = dt.getUTCDay();
  const h = Math.floor(secs / 3600), mi = Math.floor(secs % 3600 / 60), s = secs % 60; const ampm = toks.some(t => t.k === 'date' && /^(am|a\/p)/i.test(t.v));
  const out = []; const dates = toks.map((t, i) => [t, i]).filter(([t]) => t.k === 'date');
  return toks.map((t, i) => {
    if (t.k === 'lit') return t.v; if (t.k === 'comma') return ','; if (t.k === 'dot') return '.'; if (t.k === 'pct') return '%'; if (t.k === 'fill' || t.k === 'meta') return '';
    if (t.k === 'elapsed') { const total = days * 24 + h; const v = t.v[0] === 'h' ? total : t.v[0] === 'm' ? total * 60 + mi : total * 3600 + mi * 60 + s; return String(v).padStart(t.v.length, '0'); }
    if (t.k !== 'date') return ''; const v = t.v.toLowerCase();
    if (/^y/.test(v)) return v.length <= 2 ? String(Y % 100).padStart(2, '0') : String(Y);
    if (/^d/.test(v)) return v === 'd' ? String(D) : v === 'dd' ? String(D).padStart(2, '0') : v === 'ddd' ? DAYS[W].slice(0, 3) : DAYS[W];
    if (/^h/.test(v)) { const hh = ampm ? (h % 12 || 12) : h; return v === 'h' ? String(hh) : String(hh).padStart(2, '0'); }
    if (/^s/.test(v)) return v === 's' ? String(s) : String(s).padStart(2, '0');
    if (/^(am|a\/p)/.test(v)) return v.startsWith('am') ? (h < 12 ? (t.v === t.v.toUpperCase() ? 'AM' : 'am') : (t.v === t.v.toUpperCase() ? 'PM' : 'pm')) : (h < 12 ? 'A' : 'P');
    if (/^m/.test(v)) { // minute if directly after h or before s; else month
      const prev = toks.slice(0, i).reverse().find(x => x.k === 'date' || x.k === 'elapsed'); const next = toks.slice(i + 1).find(x => x.k === 'date' || x.k === 'elapsed');
      const isMin = (prev && /^h/i.test(prev.v)) || (next && /^s/i.test(next.v)); if (isMin && v.length <= 2) return v === 'm' ? String(mi) : String(mi).padStart(2, '0');
      return v === 'm' ? String(M + 1) : v === 'mm' ? String(M + 1).padStart(2, '0') : v === 'mmm' ? MONTHS[M].slice(0, 3) : v === 'mmmm' ? MONTHS[M] : MONTHS[M][0];
    }
    return '';
  }).join('');
}

function fmtNumber(val, toks, showSign) {
  const hasPct = toks.filter(t => t.k === 'pct').length; let v = Math.abs(val) * Math.pow(100, hasPct ? 1 : 0) * (hasPct > 1 ? Math.pow(100, hasPct - 1) : 1);
  const expTok = toks.find(t => t.k === 'exp');
  const dotAt = toks.findIndex(t => t.k === 'dot'); const firstDig = toks.findIndex(t => t.k === 'dig'); const lastDig = toks.map(t => t.k).lastIndexOf('dig');
  // scaling commas: commas after the last digit placeholder (before any non-comma) divide by 1000
  let scale = 0; for (let i = lastDig + 1; i < toks.length && toks[i].k === 'comma'; i++) scale++; for (let k = 0; k < scale; k++) v /= 1000;
  const thousands = toks.some((t, i) => t.k === 'comma' && i > firstDig && i < lastDig);
  const intPh = [], decPh = []; let after = false, expPh = [];
  toks.forEach((t, i) => { if (t.k === 'dot' && i === dotAt) after = true; if (t.k === 'dig') { if (expTok && i > toks.indexOf(expTok)) expPh.push(t.v); else (after ? decPh : intPh).push(t.v); } });
  let intStr, decStr, expStr = '';
  if (expTok) {
    const intDigits = Math.max(1, intPh.length); let exp = v === 0 ? 0 : Math.floor(Math.log10(v)) - (intDigits - 1); let mant = v / Math.pow(10, exp);
    mant = Number(mant.toFixed(decPh.length)); if (mant >= Math.pow(10, intDigits)) { mant /= 10; exp++; }
    const ms = mant.toFixed(decPh.length).split('.'); intStr = ms[0]; decStr = ms[1] || ''; expStr = expTok.v[0] + (exp < 0 ? '-' : expTok.v[1] === '+' ? '+' : '') + String(Math.abs(exp)).padStart(expPh.length || 2, '0');
  } else { const s = (Math.round((v + Number.EPSILON * v) * 10 ** decPh.length) / 10 ** decPh.length).toFixed(decPh.length).split('.'); intStr = s[0]; decStr = s[1] || ''; }
  // integer part
  let digits = intStr === '0' && intPh.length && intPh.every(p => p !== '0') ? '' : intStr;
  const need = intPh.length; let intOut = '';
  const chars = digits.split(''); const extra = Math.max(0, chars.length - need);
  const padded = []; for (let i = 0; i < Math.max(need, chars.length); i++) padded.push(null);
  // right-align digits to placeholders; leading placeholders pad per type
  const res = []; const total = Math.max(need, chars.length);
  for (let i = 0; i < total; i++) {
    const ph = intPh[i - (total - need)]; const ch = chars[i - (total - chars.length)];
    if (ch !== undefined) res.push(ch); else res.push(ph === '0' ? '0' : ph === '?' ? ' ' : '');
  }
  intOut = res.join(''); if (thousands) { const m = intOut.match(/^(\s*)(\d.*)$/); intOut = m ? m[1] + group(m[2].replace(/,/g, '')) : intOut; }
  // decimals: trim optional '#', pad '?'
  let dec = decStr.split(''); for (let i = dec.length - 1; i >= 0; i--) { if (decPh[i] === '#' && dec[i] === '0') dec[i] = ''; else if (decPh[i] === '?' && dec[i] === '0') dec[i] = ' '; else break; }
  const decOut = dec.join(''); const hasDot = dotAt >= 0 && (decOut.trim() !== '' || decPh.includes('0') || decPh.includes('?'));
  // assemble in token order
  let emittedInt = false; const out = [];
  toks.forEach((t, i) => {
    if (t.k === 'dig') { if (!emittedInt) { out.push(intOut); emittedInt = true; } return; }
    if (t.k === 'dot') { if (!showSign && false) return; out.push(hasDot ? '.' + decOut : ''); return; }
    if (t.k === 'comma' || t.k === 'meta') return; if (t.k === 'fill') { out.push(' '); return; }
    if (t.k === 'exp') { out.push(expStr); return; } if (t.k === 'pct') { out.push('%'); return; } if (t.k === 'lit') { out.push(t.v); return; } if (t.k === 'text') { out.push(String(val)); }
  });
  let s = out.join('');
  if (dotAt >= 0 && decPh.length) { /* decimal digits already appended after dot token */ }
  return s;
}

export function formatValue(value, fmt) {
  if (fmt.trim() === '' || fmt === 'General') return String(value);
  const secs = splitSections(fmt); let idx = 0; let isText = typeof value === 'string' && value !== '' && isNaN(Number(value));
  const cond = s => { const m = s.match(/\[(<=|>=|<>|<|>|=)\s*(-?[\d.]+)\]/); return m ? [m[1], Number(m[2])] : null; };
  const test = (c, n) => ({ '<': n < c[1], '>': n > c[1], '<=': n <= c[1], '>=': n >= c[1], '=': n === c[1], '<>': n !== c[1] })[c[0]];
  if (isText) { const sec = secs[3] ?? (secs.length === 1 && /@/.test(secs[0]) ? secs[0] : null); if (sec === null) return value; return tokenize(sec).map(t => t.k === 'text' ? value : t.k === 'lit' ? t.v : t.k === 'fill' ? ' ' : '').join(''); }
  const n = Number(value); if (!Number.isFinite(n)) return String(value);
  let sec = secs[0], neg = n < 0, useSign = false;
  const c0 = cond(secs[0] || ''), c1 = cond(secs[1] || '');
  if (c0 || c1) { if (c0 && test(c0, n)) idx = 0; else if (c1 && test(c1, n)) idx = 1; else idx = secs.length > 2 ? 2 : (c0 ? 1 : 0); sec = secs[idx]; neg = n < 0 && idx !== 1 ? true : false; useSign = idx === 0 && n < 0; }
  else if (secs.length >= 2 && n < 0) { sec = secs[1]; neg = false; } else if (secs.length >= 3 && n === 0) sec = secs[2]; else if (n < 0) { useSign = true; }
  const toks = tokenize(sec ?? ''); const isDate = toks.some(t => t.k === 'date' || t.k === 'elapsed');
  if (isDate) { if (n < 0) return '#'.repeat(10); return fmtDate(n, toks); }
  if (toks.some(t => t.k === 'dig' || t.k === 'exp' || t.k === 'pct')) { const body = fmtNumber(n, toks); return (useSign || (neg && n < 0 && secs.length === 1)) ? '-' + body : body; }
  return toks.map(t => t.k === 'lit' ? t.v : t.k === 'text' ? String(value) : '').join('');
}
