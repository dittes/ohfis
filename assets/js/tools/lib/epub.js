// epub.js — read an EPUB (a ZIP of XHTML files) and lay its text out into pages. Pure functions; images are not carried over.
import { parseXml } from './devtools.js';
const NAMED = { nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', laquo: '«', raquo: '»', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', copy: '©', reg: '®', trade: '™', euro: '€', times: '×', middot: '·', bull: '•', deg: '°', sect: '§', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç' };
const fixEntities = s => s.replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)([A-Za-z][A-Za-z0-9]*);/g, (m, n) => NAMED[n] ?? ' ');
const dir = p => p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '';
const resolve = (base, href) => { const parts = (base + decodeURIComponent(href.split('#')[0])).split('/'); const out = []; for (const x of parts) { if (x === '..') out.pop(); else if (x !== '.' && x !== '') out.push(x); } return out.join('/'); };
const first = (node, name) => { for (const c of node.children) { if (typeof c === 'string') continue; if (c.name === name || c.name.endsWith(':' + name)) return c; const d = first(c, name); if (d) return d; } return null; };
const all = (node, name, acc = []) => { for (const c of node.children) { if (typeof c === 'string') continue; if (c.name === name || c.name.endsWith(':' + name)) acc.push(c); all(c, name, acc); } return acc; };
const textOf = n => typeof n === 'string' ? n : n.children.map(textOf).join('');

/** Titles, author, language and the reading order (list of file paths inside the ZIP). `read(path)` returns the text of a file or null. */
export function epubStructure(read) {
  const container = read('META-INF/container.xml'); if (!container) throw new Error('This is not an EPUB (META-INF/container.xml is missing).');
  const rf = first(parseXml(container), 'rootfile'); const opfPath = rf?.attrs['full-path']; if (!opfPath) throw new Error('The EPUB has no package file.');
  const opfText = read(opfPath); if (!opfText) throw new Error('The EPUB package file is missing.'); const opf = parseXml(fixEntities(opfText)), base = dir(opfPath);
  const meta = k => { const n = first(opf, k); return n ? textOf(n).trim() : ''; };
  const manifest = {}; for (const it of all(opf, 'item')) manifest[it.attrs.id] = { href: resolve(base, it.attrs.href), type: it.attrs['media-type'] || '', props: it.attrs.properties || '' };
  const spine = all(opf, 'itemref').filter(r => r.attrs.linear !== 'no').map(r => manifest[r.attrs.idref]).filter(m => m && /xhtml|html|xml/.test(m.type) && !/nav/.test(m.props)).map(m => m.href);
  if (!spine.length) throw new Error('The EPUB has no readable chapters.');
  return { title: meta('title'), author: meta('creator'), lang: meta('language'), spine };
}
/** XHTML → [{ t: 'h1'|'h2'|'h3'|'p'|'li'|'quote'|'pre'|'hr', text, ordered?, n? }]. */
export function xhtmlToBlocks(xhtml) {
  let root; try { root = parseXml(fixEntities(xhtml.replace(/<!DOCTYPE[^>]*>/i, ''))); } catch { return [{ t: 'p', text: xhtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }]; }
  const body = first(root, 'body') || root, blocks = [];
  const inline = n => typeof n === 'string' ? n : (/^(?:script|style|svg|img)$/i.test(n.name) ? '' : n.name.toLowerCase() === 'br' ? '\n' : n.children.map(inline).join(''));
  const clean = s => s.replace(/[ \t\r\n ]+/g, ' ').trim();
  const walk = (n, ctx = {}) => {
    if (typeof n === 'string') { const t = clean(n); if (t) blocks.push({ t: 'p', text: t }); return; }
    const name = n.name.toLowerCase().replace(/^.*:/, '');
    if (/^(?:script|style|head|nav|svg)$/.test(name)) return;
    if (/^h[1-6]$/.test(name)) { const t = clean(inline(n)); if (t) blocks.push({ t: name[1] === '1' ? 'h1' : name[1] === '2' ? 'h2' : 'h3', text: t }); return; }
    if (name === 'p' || name === 'div' && n.children.every(c => typeof c === 'string' || /^(?:span|a|em|i|b|strong|small|sup|sub|br|code)$/.test(c.name))) { const t = clean(inline(n)); if (t) blocks.push({ t: ctx.quote ? 'quote' : 'p', text: t }); return; }
    if (name === 'pre') { const t = inline(n).replace(/\r/g, '').replace(/\n+$/, ''); if (t.trim()) blocks.push({ t: 'pre', text: t }); return; }
    if (name === 'hr') { blocks.push({ t: 'hr' }); return; }
    if (name === 'ul' || name === 'ol') { let i = 0; for (const li of n.children) if (typeof li !== 'string' && li.name.toLowerCase() === 'li') { const t = clean(inline(li)); if (t) blocks.push({ t: 'li', text: t, ordered: name === 'ol', n: ++i }); } return; }
    if (name === 'blockquote') { for (const c of n.children) walk(c, { ...ctx, quote: true }); return; }
    if (name === 'tr') { const t = clean(n.children.filter(c => typeof c !== 'string').map(c => clean(inline(c))).join(' | ')); if (t) blocks.push({ t: 'p', text: t }); return; }
    for (const c of n.children) walk(c, ctx);
  };
  for (const c of body.children) walk(c); return blocks;
}

/**
 * Lay blocks out on pages. widthOf(text, size, bold) → width in points. Returns pages: [[{ text, x, y, size, bold }]] with y measured from the top.
 * opts: { pageW, pageH, margin, size, leading, firstPageTitle: { title, author } }
 */
export function paginate(chapters, widthOf, { pageW = 420, pageH = 595, margin = 50, size = 11, leading = 1.45, title = '', author = '', pageBreakPerChapter = true } = {}) {
  const pages = []; let cur = [], y = margin; const textW = pageW - 2 * margin;
  const newPage = () => { if (cur.length) pages.push(cur); cur = []; y = margin; };
  const wrap = (text, sz, bold, w) => { const lines = []; for (const para of text.split('\n')) { let line = ''; for (const word of para.split(/ +/).filter(Boolean)) { let wd = word; while (widthOf(wd, sz, bold) > w && wd.length > 1) { let k = wd.length - 1; while (k > 1 && widthOf(wd.slice(0, k), sz, bold) > w) k--; if (line) { lines.push(line); line = ''; } lines.push(wd.slice(0, k)); wd = wd.slice(k); } const t = line ? line + ' ' + wd : wd; if (widthOf(t, sz, bold) <= w) line = t; else { lines.push(line); line = wd; } } lines.push(line); } return lines; };
  const put = (text, sz, bold, indent = 0, extraBefore = 0, w = textW - indent, marker = '') => { const lines = wrap(text, sz, bold, w), lh = sz * leading; y += extraBefore; lines.forEach((l, i) => { if (y + lh > pageH - margin) newPage(); if (i === 0 && marker) cur.push({ text: marker, x: margin + 2, y: y + sz, size: sz, bold: false }); cur.push({ text: l, x: margin + indent, y: y + sz, size: sz, bold }); y += lh; }); };
  if (title) { y = pageH * 0.3; for (const l of wrap(title, size * 2.2, true, textW)) { cur.push({ text: l, x: margin, y, size: size * 2.2, bold: true }); y += size * 2.2 * 1.3; } if (author) { y += size; cur.push({ text: author, x: margin, y, size: size * 1.3, bold: false }); } newPage(); }
  chapters.forEach((blocks, ci) => {
    if (ci > 0 && pageBreakPerChapter) newPage(); let hadHeading = false;
    for (const b of blocks) {
      if (b.t === 'h1' || b.t === 'h2' || b.t === 'h3') { const sz = size * (b.t === 'h1' ? 1.8 : b.t === 'h2' ? 1.4 : 1.15); if (y + sz * leading * 3 > pageH - margin) newPage(); put(b.text, sz, true, 0, y > margin ? size * 1.2 : 0); y += size * 0.5; hadHeading = true; }
      else if (b.t === 'p') put(b.text, size, false, 0, size * 0.5);
      else if (b.t === 'quote') put(b.text, size, false, 18, size * 0.5, textW - 18);
      else if (b.t === 'li') put(b.text, size, false, 16, size * 0.15, textW - 16, b.ordered ? `${b.n}.` : '•');
      else if (b.t === 'pre') put(b.text, size * 0.85, false, 8, size * 0.5, textW - 8);
      else if (b.t === 'hr') { y += size; }
    }
    void hadHeading;
  });
  if (cur.length) pages.push(cur); return pages;
}
