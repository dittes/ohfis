// docs.js — pure logic for document and print tools (page imposition, numbering, label grids, paper sizes, Markdown <-> Word).
export const MM = 72 / 25.4; // PDF points per millimetre

/** Paper sizes in millimetres (portrait). */
export const PAPER = {
  A0: [841, 1189], A1: [594, 841], A2: [420, 594], A3: [297, 420], A4: [210, 297], A5: [148, 210], A6: [105, 148], A7: [74, 105], A8: [52, 74],
  B4: [250, 353], B5: [176, 250], B6: [125, 176], C4: [229, 324], C5: [162, 229], DL: [110, 220],
  Letter: [215.9, 279.4], Legal: [215.9, 355.6], Tabloid: [279.4, 431.8], Executive: [184.15, 266.7], 'Half Letter': [139.7, 215.9],
  'Business card (EU)': [85, 55], 'Business card (US)': [88.9, 50.8], 'Photo 10×15': [102, 152], 'Photo 13×18': [127, 178],
};
export const mmToIn = mm => mm / 25.4;
export const mmToPt = mm => mm * MM;
export const mmToPx = (mm, ppi) => Math.round(mm / 25.4 * ppi);
export const pxToMm = (px, ppi) => px / ppi * 25.4;

/** Saddle-stitch booklet: list of sheet sides, each [leftPageIndex|null, rightPageIndex|null] in print order (front, back, front, back…). */
export function bookletOrder(n) {
  if (!(n >= 1)) return [];
  const total = Math.ceil(n / 4) * 4, out = [], pg = i => (i < n ? i : null);
  for (let i = 0; i < total / 4; i++) { out.push([pg(total - 1 - 2 * i), pg(2 * i)]); out.push([pg(2 * i + 1), pg(total - 2 - 2 * i)]); }
  return out;
}

/** Cells for n-up layout on a page (PDF coordinates, y from bottom). Row-major from the top-left. */
export function nupCells(pageW, pageH, cols, rows, margin = 0, gap = 0) {
  const cw = (pageW - 2 * margin - gap * (cols - 1)) / cols, ch = (pageH - 2 * margin - gap * (rows - 1)) / rows, cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ x: margin + c * (cw + gap), y: pageH - margin - (r + 1) * ch - r * gap, w: cw, h: ch });
  return cells;
}
/** Scale and position a w×h source page inside a cell (centred, never enlarged beyond `maxScale`). */
export function fitInto(w, h, cell, maxScale = Infinity) {
  const s = Math.min(cell.w / w, cell.h / h, maxScale);
  return { scale: s, x: cell.x + (cell.w - w * s) / 2, y: cell.y + (cell.h - h * s) / 2, w: w * s, h: h * s };
}

export function batesLabel(prefix, start, digits, i, suffix = '') { return `${prefix}${String(Number(start) + i).padStart(digits, '0')}${suffix}`; }

/** Label sheet templates (mm). cols×rows labels of w×h, first label at (left, top), pitch between label origins. */
export const LABELS = {
  'avery-5160': { name: 'Avery 5160 / 8160 (US Letter, 30 labels, 1″ × 2⅝″)', paper: 'Letter', cols: 3, rows: 10, w: 66.675, h: 25.4, left: 4.7625, top: 12.7, px: 69.85, py: 25.4 },
  'avery-5163': { name: 'Avery 5163 / 8163 (US Letter, 10 labels, 2″ × 4″)', paper: 'Letter', cols: 2, rows: 5, w: 101.6, h: 50.8, left: 3.97, top: 12.7, px: 107.95, py: 50.8 },
  'avery-5167': { name: 'Avery 5167 / 8167 (US Letter, 80 return-address labels, ½″ × 1¾″)', paper: 'Letter', cols: 4, rows: 20, w: 44.45, h: 12.7, left: 7.9, top: 12.7, px: 54.2, py: 12.7 },
  'avery-l7160': { name: 'Avery L7160 / J8160 (A4, 21 labels, 63.5 × 38.1 mm)', paper: 'A4', cols: 3, rows: 7, w: 63.5, h: 38.1, left: 7.2, top: 15.15, px: 66.0, py: 38.1 },
  'avery-l7163': { name: 'Avery L7163 / J8163 (A4, 14 labels, 99.1 × 38.1 mm)', paper: 'A4', cols: 2, rows: 7, w: 99.1, h: 38.1, left: 4.65, top: 15.15, px: 102.0, py: 38.1 },
  'avery-l7161': { name: 'Avery L7161 / J8161 (A4, 18 labels, 63.5 × 46.6 mm)', paper: 'A4', cols: 3, rows: 6, w: 63.5, h: 46.6, left: 7.2, top: 8.8, px: 66.0, py: 46.6 },
  'avery-l7162': { name: 'Avery L7162 / J8162 (A4, 16 labels, 99.1 × 33.9 mm)', paper: 'A4', cols: 2, rows: 8, w: 99.1, h: 33.9, left: 4.65, top: 12.9, px: 102.0, py: 33.9 },
};
/** Label rectangles in PDF points (origin bottom-left) for a template and page height in mm. */
export function labelRects(tpl, pageHmm) {
  const out = [];
  for (let r = 0; r < tpl.rows; r++) for (let c = 0; c < tpl.cols; c++) out.push({ x: (tpl.left + c * tpl.px) * MM, y: (pageHmm - tpl.top - r * tpl.py - tpl.h) * MM, w: tpl.w * MM, h: tpl.h * MM });
  return out;
}
/** Split address blocks (separated by blank lines) into labels; keeps up to maxLines lines each. */
export function parseLabelBlocks(text) {
  return String(text).replace(/\r/g, '').split(/\n\s*\n/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length);
}
/** Choose the largest font size (pt) at which `lines` fit into w×h with the given font-width function. */
export function fitFont(lines, w, h, widthOf, max = 12, min = 5) {
  for (let s = max; s >= min; s -= 0.25) if (lines.length * s * 1.2 <= h && Math.max(...lines.map(l => widthOf(l, s))) <= w) return s;
  return min;
}

// ---------- Markdown → DOCX ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Inline Markdown to runs. Returns { xml, links:[url] }. */
export function inlineRuns(text, ctx, base = {}) {
  let xml = '';
  const run = (t, o = {}) => { const f = { ...base, ...o }; const rpr = `${f.link ? '<w:rStyle w:val="Hyperlink"/>' : ''}${f.code ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>' : ''}${f.b ? '<w:b/>' : ''}${f.i ? '<w:i/>' : ''}${f.code ? '<w:shd w:val="clear" w:color="auto" w:fill="EEEEEE"/>' : ''}`; return `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`; };
  const re = /(\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*)\*|_([^_\s][^_]*)_|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0, m; const s = String(text);
  while ((m = re.exec(s))) {
    if (m.index > last) xml += run(s.slice(last, m.index));
    if (m[2]) xml += run(m[2], { b: 1, i: 1 }); else if (m[3] || m[4]) xml += run(m[3] || m[4], { b: 1 }); else if (m[5] || m[6]) xml += run(m[5] || m[6], { i: 1 });
    else if (m[7]) xml += run(m[7], { code: 1 });
    else { const id = `rIdL${ctx.links.length + 1}`; ctx.links.push({ id, url: m[9] }); xml += `<w:hyperlink r:id="${id}">${run(m[8], { link: 1 })}</w:hyperlink>`; }
    last = re.lastIndex;
  }
  if (last < s.length) xml += run(s.slice(last));
  return xml;
}
const para = (inner, style, extra = '') => `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${extra}</w:pPr>${inner}</w:p>`;
/** Convert Markdown to the body XML of a .docx plus hyperlink relationships. */
export function markdownToDocxBody(md) {
  const ctx = { links: [] }; const lines = String(md).replace(/\r/g, '').split('\n'); const out = []; let i = 0;
  const isRow = l => /^\s*\|.*\|\s*$/.test(l), isSep = l => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
  const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if (/^```/.test(l)) { const code = []; i++; while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]); i++; for (const c of code.length ? code : ['']) out.push(para(`<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr><w:t xml:space="preserve">${esc(c)}</w:t></w:r>`, 'Code')); continue; }
    if ((m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l))) { out.push(para(inlineRuns(m[2], ctx), `Heading${m[1].length}`)); i++; continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { out.push('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr></w:pPr></w:p>'); i++; continue; }
    if (isRow(l) && i + 1 < lines.length && isSep(lines[i + 1])) {
      const head = cells(l); const rows = []; i += 2; while (i < lines.length && isRow(lines[i])) rows.push(cells(lines[i++]));
      const tc = (t, hd) => `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>${hd ? '<w:shd w:val="clear" w:color="auto" w:fill="E8EEF7"/>' : ''}</w:tcPr>${para(inlineRuns(t, ctx, hd ? { b: 1 } : {}))}</w:tc>`;
      out.push(`<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(s => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="BBBBBB"/>`).join('')}</w:tblBorders></w:tblPr><w:tblGrid>${head.map(() => '<w:gridCol w:w="2000"/>').join('')}</w:tblGrid><w:tr>${head.map(c => tc(c, 1)).join('')}</w:tr>${rows.map(r => `<w:tr>${head.map((_, k) => tc(r[k] || '', 0)).join('')}</w:tr>`).join('')}</w:tbl>`, '<w:p/>'); continue;
    }
    if (/^>\s?/.test(l)) { const q = []; while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, '')); out.push(para(inlineRuns(q.join(' '), ctx), 'Quote')); continue; }
    if ((m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(l))) {
      while (i < lines.length && (m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i]))) { const lvl = Math.min(4, Math.floor(m[1].replace(/\t/g, '    ').length / 2)); const num = /\d/.test(m[2]); out.push(para(inlineRuns(m[3], ctx), 'ListParagraph', `<w:numPr><w:ilvl w:val="${lvl}"/><w:numId w:val="${num ? 2 : 1}"/></w:numPr>`)); i++; }
      continue;
    }
    const buf = []; while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>|\s*([-*+]|\d+[.)])\s)/.test(lines[i]) && !(isRow(lines[i]) && i + 1 < lines.length && isSep(lines[i + 1]))) buf.push(lines[i++].trim());
    out.push(para(inlineRuns(buf.join(' '), ctx)));
  }
  return { body: out.join(''), links: ctx.links };
}
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const headingStyle = (n, size, color = '1F3864') => `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${n === 1 ? 360 : 240}" w:after="80"/><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:b/><w:color w:val="${color}"/><w:sz w:val="${size}"/></w:rPr></w:style>`;
/** Files of a minimal but valid .docx (name → string). */
export function docxFiles(md, { title = '', font = 'Calibri' } = {}) {
  const { body, links } = markdownToDocxBody(md);
  const sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>';
  const bullets = [0, 1, 2, 3, 4].map(l => `<w:lvl w:ilvl="${l}"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="${['•', '◦', '▪', '•', '◦'][l]}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 + l * 360}" w:hanging="360"/></w:pPr></w:lvl>`).join('');
  const nums = [0, 1, 2, 3, 4].map(l => `<w:lvl w:ilvl="${l}"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%${l + 1}."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 + l * 360}" w:hanging="360"/></w:pPr></w:lvl>`).join('');
  return {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>',
    'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(title)}</dc:title></cp:coreProperties>`,
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>${links.map(l => `<Relationship Id="${l.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${esc(l.url)}" TargetMode="External"/>`).join('')}</Relationships>`,
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}${sect}</w:body></w:document>`,
    'word/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${headingStyle(1, 40)}${headingStyle(2, 32)}${headingStyle(3, 26)}${headingStyle(4, 24)}${headingStyle(5, 22)}${headingStyle(6, 22, '595959')}<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="40"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="BBBBBB"/></w:pBdr><w:ind w:left="360"/></w:pPr><w:rPr><w:i/><w:color w:val="595959"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/><w:spacing w:after="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/></w:rPr></w:style><w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style><w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/></w:style></w:styles>`,
    'word/numbering.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering ${NS}><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${bullets}</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${nums}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>`,
  };
}

// ---------- DOCX → Markdown (works on DOM documents from DOMParser) ----------
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const kids = (el, name) => [...el.childNodes].filter(n => n.nodeType === 1 && n.localName === name);
const kid = (el, name) => kids(el, name)[0];
const wval = el => el?.getAttributeNS(W, 'val') ?? el?.getAttribute('w:val');
const on = el => el && !['0', 'false', 'off', 'none'].includes(wval(el) ?? 'true');
/** Convert document.xml (+ optional numbering.xml) DOM documents to Markdown. rels: { rId: url } */
export function docxToMarkdown(doc, { numbering = null, rels = {} } = {}) {
  const numFmt = new Map(); // numId -> { ilvl -> fmt }
  if (numbering) {
    const abs = new Map(); for (const a of numbering.getElementsByTagNameNS(W, 'abstractNum')) { const lv = {}; for (const l of kids(a, 'lvl')) lv[l.getAttributeNS(W, 'ilvl')] = wval(kid(l, 'numFmt')); abs.set(a.getAttributeNS(W, 'abstractNumId'), lv); }
    for (const n of numbering.getElementsByTagNameNS(W, 'num')) numFmt.set(n.getAttributeNS(W, 'numId'), abs.get(wval(kid(n, 'abstractNumId'))) || {});
  }
  const mdEsc = s => s.replace(/([\\`*_[\]])/g, '\\$1');
  function runText(r) {
    let s = ''; for (const c of r.childNodes) { if (c.nodeType !== 1) continue; if (c.localName === 't') s += c.textContent; else if (c.localName === 'tab') s += '    '; else if (c.localName === 'br') s += '  \n'; }
    if (!s) return '';
    const rpr = kid(r, 'rPr'); let b = false, i = false, code = false;
    if (rpr) { b = on(kid(rpr, 'b')); i = on(kid(rpr, 'i')); const f = kid(rpr, 'rFonts'); code = !!f && /consolas|courier|mono/i.test(f.getAttributeNS(W, 'ascii') || f.getAttribute('w:ascii') || ''); }
    const lead = /^\s*/.exec(s)[0], trail = /\s*$/.exec(s)[0], core = s.trim(); if (!core) return s;
    let o = code ? '`' + core + '`' : mdEsc(core); if (i) o = `*${o}*`; if (b) o = `**${o}**`;
    return lead + o + trail;
  }
  function inline(p) {
    let s = '';
    for (const c of p.childNodes) { if (c.nodeType !== 1) continue; if (c.localName === 'r') s += runText(c); else if (c.localName === 'hyperlink') { const id = c.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || c.getAttribute('r:id'); const txt = kids(c, 'r').map(runText).join('').trim(); s += rels[id] && txt ? `[${txt}](${rels[id]})` : txt; } }
    return s.replace(/\*\*\s*\*\*|(?<!\*)\*\*(?=\*\*)/g, m => m.includes(' ') ? ' ' : m).replace(/\*\*\*\*/g, '');
  }
  function paragraph(p) {
    const ppr = kid(p, 'pPr'); const style = wval(kid(ppr || p, 'pStyle')) || ''; const text = inline(p).trim();
    const numPr = ppr && kid(ppr, 'numPr'); const hm = /^(?:Heading|heading|Titre)\s*(\d)$/.exec(style) || (style === 'Title' ? [0, '1'] : null);
    if (hm) return text ? `${'#'.repeat(Math.min(6, +hm[1]))} ${text}` : '';
    if (/^Code/i.test(style)) return { code: p.textContent };
    if (/quote/i.test(style)) return text ? `> ${text}` : '';
    if (numPr && text) { const id = wval(kid(numPr, 'numId')), lvl = wval(kid(numPr, 'ilvl')) || '0'; if (id === '0') return text; const fmt = (numFmt.get(id) || {})[lvl]; const ind = '  '.repeat(+lvl); return `${ind}${fmt && fmt !== 'bullet' ? '1.' : '-'} ${text}`; }
    if (/ListParagraph|ListBullet|List Bullet/i.test(style) && text) return `- ${text}`;
    return text;
  }
  function table(tbl) {
    const rows = kids(tbl, 'tr').map(tr => kids(tr, 'tc').map(tc => kids(tc, 'p').map(p => inline(p).trim()).filter(Boolean).join(' <br> ').replace(/\|/g, '\\|')));
    if (!rows.length) return ''; rows[0] = rows[0].map(c => c.replace(/^\*\*(.+)\*\*$/, '$1')); const n = Math.max(...rows.map(r => r.length)); const pad = r => [...r, ...Array(n - r.length).fill('')];
    const line = r => `| ${pad(r).join(' | ')} |`; return [line(rows[0]), `| ${Array(n).fill('---').join(' | ')} |`, ...rows.slice(1).map(line)].join('\n');
  }
  const body = doc.getElementsByTagNameNS(W, 'body')[0]; if (!body) throw new Error('This does not look like a Word document (no body found).');
  const blocks = []; let listRun = false, inCode = null;
  for (const el of body.childNodes) {
    if (el.nodeType !== 1) continue;
    let b = '';
    if (el.localName === 'p') b = paragraph(el); else if (el.localName === 'tbl') b = table(el); else continue;
    if (b && b.code !== undefined) { (inCode ||= []).push(b.code); continue; }
    if (inCode) { blocks.push('```\n' + inCode.join('\n') + '\n```'); inCode = null; }
    const isItem = typeof b === 'string' && /^\s*(-|1\.) /.test(b);
    if (!b) { listRun = false; continue; }
    if (isItem && listRun && blocks.length) blocks[blocks.length - 1] += '\n' + b; else blocks.push(b);
    listRun = isItem;
  }
  if (inCode) blocks.push('```\n' + inCode.join('\n') + '\n```');
  return blocks.join('\n\n') + '\n';
}

// ---------- Invoice helpers ----------
/** "Description; qty; unit price" per line (also tab or | separated). Quantity defaults to 1. */
export function parseInvoiceItems(text) {
  const items = [];
  for (const raw of String(text).replace(/\r/g, '').split('\n')) {
    const line = raw.trim(); if (!line) continue;
    const parts = line.split(/\s*[;|\t]\s*/); if (parts.length < 2) throw new Error(`Line "${line}" needs at least a description and a price, separated by ";".`);
    const num = s => { const v = Number(String(s).replace(/\s/g, '').replace(/,(?=\d{1,2}$)/, '.').replace(/,/g, '')); if (!Number.isFinite(v)) throw new Error(`"${s}" is not a number (line "${line}").`); return v; };
    const price = num(parts[parts.length - 1]); const qty = parts.length >= 3 ? num(parts[parts.length - 2]) : 1; const desc = parts.slice(0, parts.length >= 3 ? -2 : -1).join('; ');
    items.push({ desc, qty, price, total: Math.round(qty * price * 100) / 100 });
  }
  return items;
}
export function invoiceTotals(items, taxPct = 0, discountPct = 0) {
  const r = v => Math.round(v * 100) / 100; const subtotal = r(items.reduce((s, i) => s + i.total, 0)); const discount = r(subtotal * discountPct / 100);
  const net = r(subtotal - discount); const tax = r(net * taxPct / 100); return { subtotal, discount, net, tax, total: r(net + tax) };
}
/** Greedy word wrap using a width function (text, …) → points. */
export function wrapText(text, maxW, widthOf) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      let w = word; while (widthOf(w) > maxW && w.length > 1) { let k = w.length - 1; while (k > 1 && widthOf(w.slice(0, k)) > maxW) k--; if (line) { out.push(line); line = ''; } out.push(w.slice(0, k)); w = w.slice(k); }
      const t = line ? line + ' ' + w : w; if (widthOf(t) <= maxW) line = t; else { out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}

// ---------- PDF annotation helpers ----------
/** Flatten pdf.js quadPoints (array of {x,y}, or numbers in groups of 8) into rectangles {x0,y0,x1,y1}. */
export function quadsToRects(quad, fallbackRect) {
  const rects = []; if (quad && quad.length) {
    const pts = typeof quad[0] === 'object' && quad[0] !== null && 'x' in quad[0] ? quad.flatMap(p => [p.x, p.y]) : Array.from(quad.flat ? quad.flat() : quad);
    for (let i = 0; i + 7 < pts.length; i += 8) { const xs = [pts[i], pts[i + 2], pts[i + 4], pts[i + 6]], ys = [pts[i + 1], pts[i + 3], pts[i + 5], pts[i + 7]]; rects.push({ x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }); }
  }
  if (!rects.length && fallbackRect) rects.push({ x0: fallbackRect[0], y0: fallbackRect[1], x1: fallbackRect[2], y1: fallbackRect[3] });
  return rects;
}
// Relative advance widths of ASCII 32–126 in Helvetica/Arial (per 1000 em); other characters use 556.
const HELV = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const cw = ch => { const c = ch.charCodeAt(0); return c >= 32 && c <= 126 ? HELV[c - 32] : 556; };
/** Text of the items (pdf.js text content: {str, transform, width, height}) that lies inside one of the rects, in reading order.
 *  pdf.js often returns a whole line as one item, so partial items are cut at character level using proportional widths. */
export function textInRects(items, rects) {
  const pieces = [];
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue; const x = it.transform[4], y = it.transform[5], w = it.width || 0, h = it.height || Math.abs(it.transform[3]) || 10, cy = y + h / 2;
    const rs = rects.filter(r => cy >= r.y0 - 2 && cy <= r.y1 + 2); if (!rs.length) continue;
    const total = [...it.str].reduce((a, c) => a + cw(c), 0) || 1; let pos = x, out = '';
    for (const ch of it.str) { const cwid = cw(ch) / total * w, mid = pos + cwid / 2; if (rs.some(r => mid >= r.x0 - 0.5 && mid <= r.x1 + 0.5)) out += ch; pos += cwid; }
    if (out.trim()) pieces.push({ s: out, x, y });
  }
  pieces.sort((a, b) => Math.abs(b.y - a.y) > 3 ? b.y - a.y : a.x - b.x); let res = '', lastY = null;
  for (const p of pieces) { if (lastY !== null && Math.abs(p.y - lastY) > 3) res += ' '; else if (res && !/\s$/.test(res) && !/^\s/.test(p.s)) res += ' '; res += p.s; lastY = p.y; }
  return res.replace(/\s+/g, ' ').trim();
}
export const ANNOT_KIND = { Highlight: 'Highlight', Underline: 'Underline', StrikeOut: 'Strike-out', Squiggly: 'Squiggly', Text: 'Note', FreeText: 'Text box', Caret: 'Insertion', Stamp: 'Stamp' };
export function annotationsMarkdown(list, title = 'Annotations') {
  const out = [`# ${title}`, '']; let page = 0;
  for (const a of list) { if (a.page !== page) { page = a.page; out.push(`## Page ${page}`, ''); } const head = `**${a.kind}**${a.author ? ` (${a.author})` : ''}`; out.push(`- ${head}${a.text ? `: “${a.text}”` : ''}${a.comment ? `\n  - Comment: ${a.comment}` : ''}`); }
  return out.join('\n') + '\n';
}
