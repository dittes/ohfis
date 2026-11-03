// diff.js — Myers O(ND) diff over arrays of tokens. Returns ops: {t:'eq'|'add'|'del', v}.
export function myers(a, b) {
  const n = a.length, m = b.length, max = n + m;
  if (!max) return [];
  const v = new Int32Array(2 * max + 2); const trace = [];
  const off = max;
  for (let d = 0; d <= max; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x = (k === -d || (k !== d && v[off + k - 1] < v[off + k + 1])) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x++; y++; }
      v[off + k] = x;
      if (x >= n && y >= m) return backtrack(trace, a, b, off, d);
    }
  }
  return [];
}
function backtrack(trace, a, b, off, dEnd) {
  const ops = []; let x = a.length, y = b.length;
  for (let d = dEnd; d > 0; d--) {
    const v = trace[d]; const k = x - y;
    const prevK = (k === -d || (k !== d && v[off + k - 1] < v[off + k + 1])) ? k + 1 : k - 1;
    const prevX = v[off + prevK], prevY = prevX - prevK;
    while (x > prevX && y > prevY) { ops.push({ t: 'eq', v: a[x - 1] }); x--; y--; }
    if (x === prevX) ops.push({ t: 'add', v: b[y - 1] }); else ops.push({ t: 'del', v: a[x - 1] });
    x = prevX; y = prevY;
  }
  while (x > 0 && y > 0) { ops.push({ t: 'eq', v: a[x - 1] }); x--; y--; }
  return ops.reverse();
}
const lines = s => s === '' ? [] : s.split(/\r\n|\r|\n/);
const tokens = s => s.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) || [];

export function diffLines(a, b, { ignoreWhitespace = false, ignoreCase = false } = {}) {
  const norm = l => { let s = l; if (ignoreWhitespace) s = s.trim().replace(/\s+/g, ' '); if (ignoreCase) s = s.toLowerCase(); return s; };
  const A = lines(a), B = lines(b);
  const ops = myers(A.map(norm), B.map(norm));
  // restore original text for display
  let i = 0, j = 0; return ops.map(o => { if (o.t === 'eq') { const r = { t: 'eq', v: B[j], old: A[i] }; i++; j++; return r; } if (o.t === 'del') return { t: 'del', v: A[i++] }; return { t: 'add', v: B[j++] }; });
}
export function diffWords(a, b, { chars = false } = {}) { return myers(chars ? [...a] : tokens(a), chars ? [...b] : tokens(b)); }
export function diffStats(ops) { const s = { added: 0, removed: 0, same: 0 }; for (const o of ops) s[o.t === 'add' ? 'added' : o.t === 'del' ? 'removed' : 'same']++; return s; }
export function unifiedPatch(ops, nameA = 'a', nameB = 'b', ctx = 3) {
  const out = [`--- ${nameA}`, `+++ ${nameB}`]; let ai = 1, bi = 1; const idx = [];
  ops.forEach((o, i) => { if (o.t !== 'eq') idx.push(i); });
  if (!idx.length) return out.join('\n') + '\n';
  const hunks = []; let cur = null;
  for (const i of idx) { if (cur && i - cur.end <= ctx * 2 + 1) cur.end = i; else { cur && hunks.push(cur); cur = { start: i, end: i }; } }
  hunks.push(cur);
  const pos = []; for (const o of ops) { pos.push([ai, bi]); if (o.t !== 'add') ai++; if (o.t !== 'del') bi++; }
  for (const h of hunks) {
    const s = Math.max(0, h.start - ctx), e = Math.min(ops.length - 1, h.end + ctx); const slice = ops.slice(s, e + 1);
    const aCount = slice.filter(o => o.t !== 'add').length, bCount = slice.filter(o => o.t !== 'del').length;
    out.push(`@@ -${pos[s][0]},${aCount} +${pos[s][1]},${bCount} @@`);
    for (const o of slice) out.push((o.t === 'eq' ? ' ' : o.t === 'add' ? '+' : '-') + o.v);
  }
  return out.join('\n') + '\n';
}
