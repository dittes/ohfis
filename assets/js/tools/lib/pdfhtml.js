// pdfhtml.js — turn positioned text from pdf.js into simple, clean HTML (headings, paragraphs, lists).
// Input pages: [{ items: [{ str, x, y, size, w }] }] with y growing upwards as in PDF space.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BULLET = /^(?:[•◦▪●■□–—·*-]|•)\s+/, NUMBER = /^(?:\d{1,3}[.)])\s+/;

/** Group text items into lines (same baseline), left to right. */
export function toLines(items) {
  const its = items.filter(i => i.str && i.str.trim() !== '' || i.str === ' ').map(i => ({ ...i })); its.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const it of its) {
    const last = lines.at(-1);
    if (last && Math.abs(last.y - it.y) <= Math.max(2, 0.4 * Math.min(last.size, it.size || last.size))) last.items.push(it); else lines.push({ y: it.y, size: it.size, items: [it] });
  }
  return lines.map(l => {
    l.items.sort((a, b) => a.x - b.x); let text = '', prevEnd = null;
    for (const it of l.items) { if (prevEnd !== null && it.x - prevEnd > 0.15 * (it.size || l.size) && !text.endsWith(' ') && !it.str.startsWith(' ')) text += ' '; text += it.str; prevEnd = it.x + (it.w ?? it.str.length * (it.size || 10) * 0.5); }
    const sz = Math.max(...l.items.map(i => i.size || 0)); return { y: l.y, x: l.items[0].x, size: sz, text: text.replace(/\s+/g, ' ').trim() };
  }).filter(l => l.text);
}

/** Most common font size, weighted by the number of characters. */
export function bodySize(lines) { const m = new Map(); for (const l of lines) { const k = Math.round(l.size * 2) / 2; m.set(k, (m.get(k) || 0) + l.text.length); } let best = 12, n = 0; for (const [k, v] of m) if (v > n) { best = k; n = v; } return best; }

/** Convert pages to HTML body markup. opts: { headings = true, pageBreaks = false } */
export function pagesToHtml(pages, { headings = true, pageBreaks = false } = {}) {
  const all = pages.map(p => toLines(p.items)), body = bodySize(all.flat()), out = [];
  all.forEach((lines, pi) => {
    let para = [], list = null, prev = null;
    const flushPara = () => { if (para.length) { let s = ''; for (const t of para) s = !s ? t : /[A-Za-zÀ-ž]-$/.test(s) && /^[a-zà-ž]/.test(t) ? s.slice(0, -1) + t : s + ' ' + t; out.push(`<p>${esc(s)}</p>`); para = []; } };
    const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map(i => `<li>${esc(i)}</li>`).join('')}</${list.tag}>`); list = null; } };
    for (const l of lines) {
      const ratio = l.size / body, gap = prev ? prev.y - l.y : 0, lead = prev ? prev.size * 1.6 : 0, bullet = BULLET.test(l.text), num = NUMBER.test(l.text);
      if (headings && ratio >= 1.15 && l.text.length < 140) { flushPara(); flushList(); out.push(`<h${ratio >= 1.6 ? 1 : ratio >= 1.3 ? 2 : 3}>${esc(l.text)}</h${ratio >= 1.6 ? 1 : ratio >= 1.3 ? 2 : 3}>`); }
      else if (bullet || num) { flushPara(); const tag = bullet ? 'ul' : 'ol'; if (list && list.tag !== tag) flushList(); list ||= { tag, items: [] }; list.items.push(l.text.replace(bullet ? BULLET : NUMBER, '')); }
      else if (list && l.x > list.x0 - 1 && gap < lead && list.items.length) { list.items[list.items.length - 1] += ' ' + l.text; }
      else { flushList(); if (para.length && prev && (gap > lead || Math.abs(prev.size - l.size) > 0.5 * body * 0.2 && ratio >= 1.15)) flushPara(); para.push(l.text); }
      if ((bullet || num) && list && list.x0 === undefined) list.x0 = l.x; prev = l;
    }
    flushPara(); flushList(); if (pageBreaks && pi < all.length - 1) out.push('<hr class="page-break">');
  });
  return out.join('\n');
}

export function wrapDocument(body, { title = 'Document', lang = 'en' } = {}) {
  return `<!DOCTYPE html>\n<html lang="${esc(lang)}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${esc(title)}</title>\n<style>body{font-family:system-ui,sans-serif;line-height:1.55;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#1b1f27}h1,h2,h3{line-height:1.25}hr.page-break{border:0;border-top:1px dashed #bbb;margin:2rem 0}</style>\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
}
