// csv-worker.js — indexes a (very large) CSV file without loading it into memory.
// It scans the bytes once, records where every record starts, and then reads only the slices the viewer asks for.
import { parseCSV, detectDelimiter } from './lib/csv.js';

let file = null, offsets = new Float64Array(1 << 16), count = 0, delimiter = ',', dec = new TextDecoder('utf-8');
const post = (m) => self.postMessage(m);

async function open(f) {
  file = f; count = 0; offsets = new Float64Array(1 << 16);
  const head = new Uint8Array(await f.slice(0, 65536).arrayBuffer());
  delimiter = detectDelimiter(dec.decode(head)); const size = f.size;
  let pos = 0, rowStart = 0, inQ = false, lastCR = false; if (head[0] === 0xEF && head[1] === 0xBB && head[2] === 0xBF) { rowStart = 3; }
  const push = (v) => { if (count === offsets.length) { const n = new Float64Array(offsets.length * 2); n.set(offsets); offsets = n; } offsets[count++] = v; };
  const reader = f.stream().getReader(); let lastReport = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    for (let i = 0; i < value.length; i++) {
      const b = value[i];
      if (b === 34) inQ = !inQ;
      else if (!inQ && (b === 10 || b === 13)) {
        const at = pos + i;
        if (b === 10 && lastCR && at === rowStart) { rowStart = at + 1; lastCR = false; continue; }
        if (at > rowStart) push(rowStart);
        rowStart = at + 1; lastCR = b === 13;
        continue;
      }
      lastCR = false;
    }
    pos += value.length;
    if (pos - lastReport > 8e6) { lastReport = pos; post({ type: 'progress', rows: count, bytes: pos, size }); }
  }
  if (rowStart < size) push(rowStart);
  offsets[count] = size;
  const first = count ? parseCSV(await slice(0, 1), delimiter)[0] || [] : [];
  post({ type: 'ready', rows: count, delimiter, header: first });
}
async function slice(a, b) { // rows [a,b) as text
  const end = b >= count ? file.size : offsets[b];
  return dec.decode(new Uint8Array(await file.slice(offsets[a], end).arrayBuffer()));
}
async function rows(a, n, id) {
  a = Math.max(0, a); const b = Math.min(count, a + n); if (a >= b) return post({ type: 'rows', id, start: a, rows: [] });
  post({ type: 'rows', id, start: a, rows: parseCSV(await slice(a, b), delimiter) });
}
let searchToken = 0;
async function search(q, id) {
  const token = ++searchToken; const needle = q.toLowerCase(); const hits = []; const BLOCK = 5000;
  for (let a = 0; a < count && hits.length < 100000; a += BLOCK) {
    if (token !== searchToken) return;
    const b = Math.min(count, a + BLOCK); const buf = new Uint8Array(await file.slice(offsets[a], b >= count ? file.size : offsets[b]).arrayBuffer()); const base = offsets[a];
    for (let r = a; r < b; r++) {
      const s = offsets[r] - base, e = (r + 1 >= count ? file.size : offsets[r + 1]) - base;
      if (dec.decode(buf.subarray(s, e)).toLowerCase().includes(needle)) hits.push(r);
    }
    post({ type: 'search-progress', id, done: b, total: count, hits: hits.length });
  }
  post({ type: 'search-done', id, hits });
}
self.onmessage = async ({ data: m }) => {
  try {
    if (m.type === 'open') await open(m.file); else if (m.type === 'rows') await rows(m.start, m.n, m.id); else if (m.type === 'search') await search(m.q, m.id); else if (m.type === 'cancel') searchToken++;
  } catch (e) { post({ type: 'error', message: e.message || String(e) }); }
};
