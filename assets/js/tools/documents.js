// documents.js — UI for document and print tools. PDFs are read and written with pdf-lib in the browser; nothing is uploaded.
import { h, t, area, btn, select, check, field, numInput, textInput, filePicker, readBytes, copyText, download, table, stat, debounce, fmtNum, wrap } from './kit.js';
import { calcTool } from './calctool.js';
import { pdfLib, fontkit, fflate, openPdfjs } from '../pdf/lib.js';
import * as M from './lib/image.js';
import * as D from './lib/docs.js';

const sizeFmt = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;
const baseName = n => n.replace(/\.[^.]+$/, '');
const mm = v => v * D.MM;
const PAPER_CHOICES = ['A4', 'A3', 'A5', 'Letter', 'Legal', 'Tabloid'].map(k => [k, k]);
let fontCache = null;
async function embedUnicode(doc, bold = false) {
  const PL = await pdfLib(); doc.registerFontkit(await fontkit());
  const bytes = await (await fetch(`/assets/vendor/fonts/DejaVuSans${bold ? '-Bold' : ''}.ttf`)).arrayBuffer(); void PL; return doc.embedFont(bytes, { subset: true });
}

/** File → options → processed PDF. spec.process(srcDoc, opts, ctx) returns a PDFDocument; ctx = { PDFLib, bytes, file }. */
function pdfTool(root, spec) {
  const ui = wrap(root); const ctl = {}; const opts = {}; let file = null, bytes = null;
  const info = h('div', { class: 'ut-stats' }), err = h('p', { class: 'pt-drop__error', role: 'alert', hidden: true }), out = h('div', { class: 'ut-actions' });
  const nodes = (spec.options || []).map(o => {
    let el, node;
    if (o.type === 'check') { node = check(o.label, o.value); el = node.input; }
    else if (o.type === 'select') { el = select(o.choices, o.value); node = field(o.label, el, o.hint); }
    else if (o.type === 'number') { el = numInput(o.value, { min: o.min, max: o.max, step: o.step ?? 'any' }); node = field(o.label, el, o.hint); }
    else { el = textInput(o.value ?? '', { placeholder: o.placeholder || '' }); node = field(o.label, el, o.hint); }
    ctl[o.key] = { el, o }; return node;
  });
  const read = () => { for (const [k, { el, o }] of Object.entries(ctl)) opts[k] = o.type === 'check' ? el.checked : o.type === 'number' ? Number(el.value) : el.value; return opts; };
  const go = btn(spec.button || 'Create PDF', run, 'primary'); go.disabled = true;
  const drop = h('div', { class: 'ut-drop' }, h('p', {}, 'Drop a PDF here, or'), filePicker({ accept: 'application/pdf,.pdf', label: t('chooseFile'), onFiles: async ([f]) => { file = f; bytes = await readBytes(f); go.disabled = false; err.hidden = true; out.replaceChildren(); info.replaceChildren(stat('File', f.name), stat('Size', sizeFmt(f.size))); if (spec.onLoad) spec.onLoad(bytes, f).catch(() => {}); }, zone: null }));
  ['dragover', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' && e.dataTransfer.files[0]) { const f = e.dataTransfer.files[0]; drop.querySelector('input').files = e.dataTransfer.files; drop.querySelector('input').dispatchEvent(new Event('change')); void f; } }));
  async function run() {
    err.hidden = true; out.replaceChildren(); go.disabled = true; go.textContent = t('processing');
    try {
      const PDFLib = await pdfLib(); let src;
      try { src = await PDFLib.PDFDocument.load(bytes); } catch (e) { throw new Error(/encrypt/i.test(e.message) ? 'This PDF is password-protected. Remove the password first with the Unlock PDF tool.' : 'This file could not be read as a PDF: ' + e.message); }
      const doc = await spec.process(src, read(), { PDFLib, bytes, file });
      doc.setProducer('OHFIS'); const data = await doc.save(); const name = (spec.suffix ? baseName(file.name) + spec.suffix : file.name) + '.pdf'.replace(/^(\.pdf)$/, '$1');
      const fname = `${baseName(file.name)}${spec.suffix || '-new'}.pdf`;
      info.replaceChildren(stat('Input pages', src.getPageCount()), stat('Output pages', doc.getPageCount()), stat('Output size', sizeFmt(data.length)));
      out.append(btn(`${t('download')} ${fname}`, () => download(fname, new Blob([data], { type: 'application/pdf' })), 'primary'), h('span', { class: 'pt-hint', 'data-result': 'ready' }, `${doc.getPageCount()} pages`)); void name;
    } catch (e) { err.textContent = e.message || String(e); err.hidden = false; } finally { go.disabled = false; go.textContent = spec.button || 'Create PDF'; }
  }
  ui.append(drop, nodes.length ? h('div', { class: 'ut-options' }, nodes) : null, h('div', { class: 'ut-actions' }, go), info, err, out, spec.note ? h('p', { class: 'pt-hint' }, spec.note) : null);
}

const sheetSize = v => v === 'same' ? null : D.PAPER[v];

/** Render every page with pdf.js, process the pixels, and rebuild an image-based PDF. */
function pdfRaster(root) {
  const ui = wrap(root); let file = null, bytes = null; const dpi = select([['100', '100 dpi (smallest)'], ['150', '150 dpi (screen and office print)'], ['200', '200 dpi (good print)'], ['300', '300 dpi (sharp, large)']], '150'), mode = select([['gray', 'Grayscale'], ['bw', 'Black and white (scans of text)']], 'gray'), quality = numInput(75, { min: 30, max: 95, step: 5 }), contrast = check('Boost contrast (helps faded scans)', false);
  const info = h('div', { class: 'ut-stats' }), err = h('p', { class: 'pt-drop__error', role: 'alert', hidden: true }), out = h('div', { class: 'ut-actions' }), bar = h('progress', { max: 100, value: 0, hidden: true, style: { width: '100%' } }); const go = btn('Convert to grayscale', run, 'primary'); go.disabled = true;
  async function run() { err.hidden = true; out.replaceChildren(); go.disabled = true; bar.hidden = false; bar.value = 0; try { const pdf = await openPdfjs(bytes); const PL = await pdfLib(); const doc = await PL.PDFDocument.create(); const sc = Number(dpi.value) / 72; for (let p = 1; p <= pdf.numPages; p++) { const page = await pdf.getPage(p); const vp = page.getViewport({ scale: sc }), base = page.getViewport({ scale: 1 }); const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height); const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); await page.render({ canvasContext: g, viewport: vp }).promise; const id = g.getImageData(0, 0, c.width, c.height); M.grayscale(id.data); if (contrast.input.checked) M.brightnessContrast(id.data, 0, 60); if (mode.value === 'bw') M.threshold(id.data, 150); g.putImageData(id, 0, 0); const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', Number(quality.value) / 100)); const img = await doc.embedJpg(new Uint8Array(await blob.arrayBuffer())); doc.addPage([base.width, base.height]).drawImage(img, { x: 0, y: 0, width: base.width, height: base.height }); bar.value = Math.round(p / pdf.numPages * 100); }
      doc.setProducer('OHFIS'); const data = await doc.save(); const fn = `${baseName(file.name)}-gray.pdf`; info.replaceChildren(stat('Pages', doc.getPageCount()), stat('Before', sizeFmt(file.size)), stat('After', sizeFmt(data.length)), stat('Change', `${((data.length / file.size - 1) * 100).toFixed(0)} %`)); out.append(btn(`${t('download')} ${fn}`, () => download(fn, new Blob([data], { type: 'application/pdf' })), 'primary'), h('span', { class: 'pt-hint', 'data-result': 'ready' }, `${doc.getPageCount()} pages`)); } catch (e) { err.textContent = /password/i.test(e.message) ? 'This PDF is password-protected. Remove the password first with the Unlock PDF tool.' : 'Conversion failed: ' + (e.message || e); err.hidden = false; } finally { go.disabled = false; bar.hidden = true; } }
  const drop = h('div', { class: 'ut-drop' }, h('p', {}, 'Drop a PDF here, or'), filePicker({ accept: 'application/pdf,.pdf', label: t('chooseFile'), onFiles: async ([f]) => { file = f; bytes = await readBytes(f); go.disabled = false; out.replaceChildren(); err.hidden = true; info.replaceChildren(stat('File', f.name), stat('Size', sizeFmt(f.size))); } })); ['dragover', 'drop'].forEach(ev => drop.addEventListener(ev, async e => { e.preventDefault(); if (ev === 'drop' && e.dataTransfer.files[0]) { file = e.dataTransfer.files[0]; bytes = await readBytes(file); go.disabled = false; info.replaceChildren(stat('File', file.name), stat('Size', sizeFmt(file.size))); } }));
  ui.append(drop, h('div', { class: 'ut-options' }, field('Mode', mode), field('Resolution', dpi), field('JPEG quality (%)', quality), contrast), h('div', { class: 'ut-actions' }, go), bar, info, err, out, h('p', { class: 'pt-hint' }, 'Every page is rendered as a picture and rebuilt as a PDF of the same page size, so the result no longer has selectable text, links or form fields. Run the OCR tool afterwards if you need searchable text. Colour is removed from text, images and backgrounds alike; vector graphics become pixels.'));
}

export const tools = {
  'booklet-maker'(root) {
    pdfTool(root, {
      suffix: '-booklet', button: 'Create booklet PDF', note: 'Print double-sided, flip on the short edge, then fold the stack in half. The page count is padded with blank pages to a multiple of 4.',
      options: [{ key: 'sheet', label: 'Sheet size (landscape)', type: 'select', value: 'auto', choices: [['auto', 'Two pages side by side (automatic)'], ['A4', 'A4'], ['A3', 'A3'], ['Letter', 'US Letter'], ['Tabloid', 'Tabloid']] }, { key: 'rtl', label: 'Right-to-left binding (Arabic, Hebrew, manga)', type: 'check', value: false }],
      async process(src, o, { PDFLib }) {
        const n = src.getPageCount(); const order = D.bookletOrder(n); const out = await PDFLib.PDFDocument.create(); const emb = await out.embedPdf(src, src.getPageIndices());
        const [pw, ph] = [emb[0].width, emb[0].height]; let W = pw * 2, H = ph; if (o.sheet !== 'auto') { const [a, b] = D.PAPER[o.sheet]; W = mm(Math.max(a, b)); H = mm(Math.min(a, b)); }
        for (let [l, r] of order) { if (o.rtl) [l, r] = [r, l]; const pg = out.addPage([W, H]); [[l, { x: 0, y: 0, w: W / 2, h: H }], [r, { x: W / 2, y: 0, w: W / 2, h: H }]].forEach(([idx, cell]) => { if (idx === null) return; const e = emb[idx]; const f = D.fitInto(e.width, e.height, cell); pg.drawPage(e, { x: f.x, y: f.y, xScale: f.scale, yScale: f.scale }); }); }
        return out;
      },
    });
  },
  'n-up-pdf'(root) {
    pdfTool(root, {
      suffix: '-nup', button: 'Create n-up PDF',
      options: [{ key: 'cols', label: 'Columns', type: 'number', value: 2, min: 1, max: 6 }, { key: 'rows', label: 'Rows', type: 'number', value: 2, min: 1, max: 6 }, { key: 'sheet', label: 'Sheet size', type: 'select', value: 'A4', choices: [...PAPER_CHOICES] }, { key: 'orient', label: 'Orientation', type: 'select', value: 'auto', choices: [['auto', 'Automatic'], ['portrait', 'Portrait'], ['landscape', 'Landscape']] }, { key: 'margin', label: 'Outer margin (mm)', type: 'number', value: 8, min: 0, max: 50 }, { key: 'gap', label: 'Gap between pages (mm)', type: 'number', value: 4, min: 0, max: 30 }, { key: 'border', label: 'Draw a thin border around each page', type: 'check', value: true }],
      async process(src, o, { PDFLib }) {
        const cols = Math.max(1, Math.round(o.cols)), rows = Math.max(1, Math.round(o.rows)); const out = await PDFLib.PDFDocument.create(); const emb = await out.embedPdf(src, src.getPageIndices());
        let [a, b] = D.PAPER[o.sheet].map(mm); const land = o.orient === 'landscape' || (o.orient === 'auto' && cols > rows); const W = land ? Math.max(a, b) : Math.min(a, b), H = land ? Math.min(a, b) : Math.max(a, b);
        const cells = D.nupCells(W, H, cols, rows, mm(o.margin), mm(o.gap)); const per = cols * rows;
        for (let i = 0; i < emb.length; i += per) { const pg = out.addPage([W, H]); for (let k = 0; k < per && i + k < emb.length; k++) { const e = emb[i + k]; const f = D.fitInto(e.width, e.height, cells[k]); pg.drawPage(e, { x: f.x, y: f.y, xScale: f.scale, yScale: f.scale }); if (o.border) pg.drawRectangle({ x: f.x, y: f.y, width: f.w, height: f.h, borderColor: PDFLib.rgb(0.6, 0.6, 0.6), borderWidth: 0.5 }); } }
        return out;
      },
    });
  },
  'bates-numbering'(root) {
    pdfTool(root, {
      suffix: '-bates', button: 'Add Bates numbers',
      options: [{ key: 'prefix', label: 'Prefix', type: 'text', value: 'ACME-', placeholder: 'CASE-' }, { key: 'start', label: 'Start number', type: 'number', value: 1, min: 0 }, { key: 'digits', label: 'Digits (zero-padded)', type: 'number', value: 6, min: 1, max: 10 }, { key: 'suffix', label: 'Suffix', type: 'text', value: '' }, { key: 'pos', label: 'Position', type: 'select', value: 'br', choices: [['br', 'Bottom right'], ['bc', 'Bottom centre'], ['bl', 'Bottom left'], ['tr', 'Top right'], ['tc', 'Top centre'], ['tl', 'Top left']] }, { key: 'size', label: 'Font size (pt)', type: 'number', value: 10, min: 6, max: 24 }, { key: 'margin', label: 'Distance from the edge (mm)', type: 'number', value: 10, min: 2, max: 40 }, { key: 'box', label: 'White background behind the number', type: 'check', value: true }],
      async process(src, o, { PDFLib }) {
        const font = await embedUnicode(src); const { rgb } = PDFLib; const pages = src.getPages();
        pages.forEach((p, i) => {
          const label = D.batesLabel(o.prefix, o.start, Math.round(o.digits), i, o.suffix); const { width: pw, height: ph } = p.getSize(); const w = font.widthOfTextAtSize(label, o.size), m = mm(o.margin);
          const x = o.pos[1] === 'l' ? m : o.pos[1] === 'c' ? (pw - w) / 2 : pw - m - w; const y = o.pos[0] === 'b' ? m : ph - m - o.size;
          if (o.box) p.drawRectangle({ x: x - 3, y: y - 2.5, width: w + 6, height: o.size + 5, color: rgb(1, 1, 1), opacity: 0.9 });
          p.drawText(label, { x, y, size: o.size, font, color: rgb(0, 0, 0) });
        });
        return src;
      },
    });
  },
  'add-margins-to-pdf'(root) {
    pdfTool(root, {
      suffix: '-margins', button: 'Add margins',
      options: [{ key: 'top', label: 'Top (mm)', type: 'number', value: 0, min: 0, max: 300 }, { key: 'right', label: 'Right (mm)', type: 'number', value: 60, min: 0, max: 300 }, { key: 'bottom', label: 'Bottom (mm)', type: 'number', value: 0, min: 0, max: 300 }, { key: 'left', label: 'Left (mm)', type: 'number', value: 0, min: 0, max: 300 }, { key: 'lines', label: 'Draw ruled lines for notes in the added margins', type: 'check', value: true }],
      async process(src, o, { PDFLib }) {
        const out = await PDFLib.PDFDocument.create(); const emb = await out.embedPdf(src, src.getPageIndices()); const [L, R, T, B] = [o.left, o.right, o.top, o.bottom].map(mm);
        emb.forEach(e => {
          const W = e.width + L + R, H = e.height + T + B; const pg = out.addPage([W, H]); pg.drawPage(e, { x: L, y: B }); const col = PDFLib.rgb(0.78, 0.8, 0.85);
          if (o.lines) for (const [x0, x1] of [[0, L], [L + e.width, W]]) if (x1 - x0 > 20) for (let y = B + mm(8); y < H - mm(4); y += mm(8)) pg.drawLine({ start: { x: x0 + 6, y }, end: { x: x1 - 6, y }, thickness: 0.5, color: col });
        });
        return out;
      },
    });
  },
  'paper-size-calculator'(root) {
    const names = Object.keys(D.PAPER);
    calcTool(root, {
      fields: [{ key: 'mode', label: 'What do you want to know?', type: 'select', value: 'size', choices: [['size', 'Size of a paper format in mm, inches and pixels'], ['pixels', 'Print size of an image with given pixels']] },
        { key: 'paper', label: 'Paper format', type: 'select', value: 'A4', choices: [...names.map(n => [n, n]), ['custom', 'Custom size (mm)']], show: v => v.mode === 'size' },
        { key: 'w', label: 'Width (mm)', value: 210, min: 1, show: v => v.mode === 'size' && v.paper === 'custom' }, { key: 'h', label: 'Height (mm)', value: 297, min: 1, show: v => v.mode === 'size' && v.paper === 'custom' },
        { key: 'ppi', label: 'Resolution (pixels per inch)', type: 'select', value: '300', choices: [['72', '72 (PDF points, screen)'], ['96', '96 (CSS pixels)'], ['150', '150 (draft print)'], ['300', '300 (photo / magazine)'], ['600', '600 (fine line art)']] },
        { key: 'px', label: 'Image width (pixels)', value: 3000, min: 1, show: v => v.mode === 'pixels' }, { key: 'py', label: 'Image height (pixels)', value: 2000, min: 1, show: v => v.mode === 'pixels' }],
      run(v) {
        const ppi = Number(v.ppi);
        if (v.mode === 'pixels') { const w = D.pxToMm(v.px, ppi), hh = D.pxToMm(v.py, ppi); const fits = names.filter(n => { const [a, b] = D.PAPER[n]; return (w >= Math.min(a, b) - 0.5 && hh >= Math.max(a, b) - 0.5) || (hh >= Math.min(a, b) - 0.5 && w >= Math.max(a, b) - 0.5); }).slice(0, 8); const best = [72, 150, 300].map(p => [p, `${fmtNum(D.pxToMm(v.px, p) / 10, 1)} × ${fmtNum(D.pxToMm(v.py, p) / 10, 1)} cm`]);
          return { cards: [['Print size', `${fmtNum(w, 1)} × ${fmtNum(hh, 1)} mm`, 'good'], ['In inches', `${fmtNum(w / 25.4, 2)} × ${fmtNum(hh / 25.4, 2)} in`], ['In centimetres', `${fmtNum(w / 10, 1)} × ${fmtNum(hh / 10, 1)} cm`]], rows: [['Resolution', 'Print size'], ...best.map(([p, s]) => [p + ' ppi', s])], notes: [`At ${ppi} ppi this image fills ${fits.length ? 'a full page of: ' + fits.join(', ') : 'less than the smallest listed paper size'}.`, 'For sharp photo prints aim for 300 ppi; 150 ppi is acceptable for posters viewed from a distance.'] }; }
        const [a, b] = v.paper === 'custom' ? [v.w, v.h] : D.PAPER[v.paper]; const rows = [['Resolution', 'Width (px)', 'Height (px)', 'Megapixels'], ...[72, 96, 150, 300, 600].map(p => [p + ' ppi', D.mmToPx(a, p), D.mmToPx(b, p), fmtNum(D.mmToPx(a, p) * D.mmToPx(b, p) / 1e6, 2)])];
        return { cards: [['Millimetres', `${fmtNum(a, 1)} × ${fmtNum(b, 1)} mm`, 'good'], ['Inches', `${fmtNum(a / 25.4, 2)} × ${fmtNum(b / 25.4, 2)} in`], ['PDF points', `${fmtNum(D.mmToPt(a), 1)} × ${fmtNum(D.mmToPt(b), 1)} pt`], [`Pixels at ${ppi} ppi`, `${D.mmToPx(a, ppi)} × ${D.mmToPx(b, ppi)} px`], ['Aspect ratio', fmtNum(b / a, 3) + ' : 1'], ['Area', fmtNum(a * b / 100, 0) + ' cm²']], rows, notes: ['A-series sizes keep the ratio 1 : √2, so halving a sheet gives the next smaller size with the same proportions.'] };
      },
    });
  },
  'mailing-labels'(root) {
    const ui = wrap(root); const tpl = select(Object.entries(D.LABELS).map(([k, v]) => [k, v.name]), 'avery-l7160'); const skip = numInput(0, { min: 0, max: 99 }), copies = numInput(1, { min: 1, max: 99 }), size = numInput(11, { min: 5, max: 20 }), border = check('Draw thin label outlines (for test prints on plain paper)', false);
    const text = area({ rows: 9, placeholder: 'Anna Example\n12 High Street\nLondon SW1A 1AA\n\nBen Sample\n3 Park Road\nManchester M1 1AA', 'aria-label': 'Addresses' });
    const info = h('div', { class: 'ut-stats' }), err = h('p', { class: 'pt-drop__error', role: 'alert', hidden: true }), out = h('div', { class: 'ut-actions' });
    const csvIn = filePicker({ accept: '.csv,.txt,text/*', label: 'Load a text/CSV file', onFiles: async ([f]) => { const s = await f.text(); text.value = /,/.test(s.split('\n')[0]) && !/\n\s*\n/.test(s) ? s.trim().split('\n').map(l => l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim()).filter(Boolean).join('\n')).join('\n\n') : s; } });
    async function make() {
      err.hidden = true; out.replaceChildren(); try {
        const blocks = D.parseLabelBlocks(text.value); if (!blocks.length) throw new Error('Enter at least one address. Separate labels with a blank line.'); const T = D.LABELS[tpl.value]; const [pw, ph] = D.PAPER[T.paper]; const PL = await pdfLib(); const doc = await PL.PDFDocument.create(); const font = await embedUnicode(doc);
        const labels = [...Array(Math.max(0, Math.round(skip.value))).fill(null), ...blocks.flatMap(b => Array(Math.max(1, Math.round(copies.value))).fill(b))]; const rects = D.labelRects(T, ph); const pad = mm(3); let pages = 0;
        for (let i = 0; i < labels.length; i += rects.length) { const pg = doc.addPage([mm(pw), mm(ph)]); pages++; for (let k = 0; k < rects.length && i + k < labels.length; k++) { const r = rects[k], b = labels[i + k]; if (border.input.checked) pg.drawRectangle({ x: r.x, y: r.y, width: r.w, height: r.h, borderColor: PL.rgb(0.7, 0.7, 0.7), borderWidth: 0.4 }); if (!b) continue; const s = D.fitFont(b, r.w - 2 * pad, r.h - 2 * pad, (l, sz) => font.widthOfTextAtSize(l, sz), Number(size.value) || 11); const total = b.length * s * 1.2; let y = r.y + (r.h + total) / 2 - s; b.forEach(l => { pg.drawText(l, { x: r.x + pad, y, size: s, font, color: PL.rgb(0, 0, 0) }); y -= s * 1.2; }); } }
        const data = await doc.save(); info.replaceChildren(stat('Labels', blocks.length * Math.round(copies.value)), stat('Sheets', pages), stat('Size', sizeFmt(data.length)));
        out.append(btn(`${t('download')} labels.pdf`, () => download('labels.pdf', new Blob([data], { type: 'application/pdf' })), 'primary'), h('span', { class: 'pt-hint', 'data-result': 'ready' }, `${pages} page(s) on ${T.paper}`));
      } catch (e) { err.textContent = e.message; err.hidden = false; }
    }
    ui.append(h('div', { class: 'ut-options' }, field('Label sheet', tpl), field('Skip labels already used', skip, 'Start on a partly used sheet'), field('Copies of each', copies), field('Largest font size (pt)', size, 'Shrinks automatically to fit'), border), h('div', { class: 'ut-colhead' }, h('strong', {}, 'Addresses (blank line between labels)'), csvIn), text, h('div', { class: 'ut-actions' }, btn('Create label sheet PDF', make, 'primary')), info, err, out,
      h('p', { class: 'pt-hint' }, 'Always print one test sheet on plain paper at 100 % scale ("Actual size", not "Fit to page") and hold it against a label sheet to check the alignment. Other label brands with the same size use the same layout.'));
  },
  'invoice-builder'(root) {
    const ui = wrap(root); const cur = textInput('€', { 'aria-label': 'Currency' }); const sheet = select([['A4', 'A4'], ['Letter', 'US Letter']], 'A4');
    const from = area({ rows: 4, value: 'Your Company Ltd\n1 Example Street\n12345 Sample City\nVAT ID: 123456789' }), to = area({ rows: 4, value: 'Client Name\nClient Street 5\n54321 Client City' }); from.value = 'Your Company Ltd\n1 Example Street\n12345 Sample City\nVAT ID: 123456789'; to.value = 'Client Name\nClient Street 5\n54321 Client City';
    const no = textInput('2025-001'), issue = h('input', { type: 'date', class: 'pt-input', value: new Date().toISOString().slice(0, 10) }), due = h('input', { type: 'date', class: 'pt-input', value: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10) });
    const tax = numInput(20, { min: 0, max: 100, step: 'any' }), disc = numInput(0, { min: 0, max: 100, step: 'any' }), title = textInput('Invoice');
    const items = area({ rows: 6, 'aria-label': 'Items' }); items.value = 'Website design; 10; 85\nHosting for 12 months; 1; 120\nDomain registration; 1; 15';
    const notes = area({ rows: 3, 'aria-label': 'Notes' }); notes.value = 'Payment within 14 days to IBAN DE00 0000 0000 0000 0000 00.\nThank you for your business!';
    const sum = h('div', { class: 'ut-cards' }), err = h('p', { class: 'pt-drop__error', role: 'alert', hidden: true }), out = h('div', { class: 'ut-actions' }); let lastTotals = null;
    const f2 = v => fmtNum(v, 2, true);
    function calc() { err.hidden = true; try { const it = D.parseInvoiceItems(items.value); const tt = D.invoiceTotals(it, Number(tax.value) || 0, Number(disc.value) || 0); lastTotals = { it, tt }; sum.replaceChildren(...[['Subtotal', `${cur.value} ${f2(tt.subtotal)}`], ['Discount', `${cur.value} ${f2(tt.discount)}`], [`Tax ${tax.value || 0} %`, `${cur.value} ${f2(tt.tax)}`], ['Total', `${cur.value} ${f2(tt.total)}`, 'good']].map(([l, v, k]) => h('div', { class: 'ut-card' + (k ? ' ut-card--' + k : '') }, h('span', {}, l), h('strong', {}, v)))); return true; } catch (e) { err.textContent = e.message; err.hidden = false; sum.replaceChildren(); lastTotals = null; return false; } }
    async function make() {
      out.replaceChildren(); if (!calc()) return; const { it, tt } = lastTotals; const PL = await pdfLib(); const doc = await PL.PDFDocument.create(); const reg = await embedUnicode(doc), bold = await embedUnicode(doc, true); const [pw, ph] = D.PAPER[sheet.value].map(mm); const M = mm(18); const ink = PL.rgb(0.1, 0.1, 0.15), grey = PL.rgb(0.4, 0.42, 0.48), line = PL.rgb(0.8, 0.82, 0.86);
      let pg = doc.addPage([pw, ph]), y = ph - M; const w = (s, sz, f = reg) => f.widthOfTextAtSize(s, sz); const text = (s, x, yy, sz = 10, f = reg, c = ink) => pg.drawText(s, { x, y: yy, size: sz, font: f, color: c }); const right = (s, xr, yy, sz = 10, f = reg) => text(s, xr - w(s, sz, f), yy, sz, f);
      text(title.value || 'Invoice', M, y - 22, 26, bold); right(`No. ${no.value}`, pw - M, y - 8, 11, bold); right(`Date: ${issue.value}`, pw - M, y - 24, 10); right(`Due: ${due.value}`, pw - M, y - 38, 10); y -= 70;
      const block = (label, txt, x) => { text(label.toUpperCase(), x, y, 8, bold, grey); let yy = y - 14; D.wrapText(txt, (pw - 2 * M) / 2 - 12, s => w(s, 10)).forEach(l => { text(l, x, yy, 10); yy -= 13; }); return yy; };
      const y1 = block('From', from.value, M), y2 = block('Bill to', to.value, M + (pw - 2 * M) / 2); y = Math.min(y1, y2) - 18;
      const cDesc = M, cQty = pw - M - 190, cPrice = pw - M - 100, cTot = pw - M; const head = () => { pg.drawRectangle({ x: M, y: y - 6, width: pw - 2 * M, height: 20, color: PL.rgb(0.93, 0.95, 0.98) }); text('Description', cDesc + 6, y, 9, bold); right('Qty', cQty + 30, y, 9, bold); right('Unit price', cPrice + 20, y, 9, bold); right('Amount', cTot - 6, y, 9, bold); y -= 24; }; head();
      for (const r of it) { const lines = D.wrapText(r.desc, cQty - cDesc - 50, s => w(s, 10)); const hgt = Math.max(1, lines.length) * 13 + 6; if (y - hgt < M + 120) { pg = doc.addPage([pw, ph]); y = ph - M; head(); } lines.forEach((l, k) => text(l, cDesc + 6, y - k * 13, 10)); right(fmtNum(r.qty, 3), cQty + 30, y, 10); right(f2(r.price), cPrice + 20, y, 10); right(f2(r.total), cTot - 6, y, 10); y -= hgt; pg.drawLine({ start: { x: M, y: y + 8 }, end: { x: pw - M, y: y + 8 }, thickness: 0.5, color: line }); }
      y -= 8; const sumRow = (l, v, b) => { if (y < M + 40) { pg = doc.addPage([pw, ph]); y = ph - M; } text(l, cPrice - 40, y, b ? 12 : 10, b ? bold : reg); right(`${cur.value} ${f2(v)}`, cTot - 6, y, b ? 12 : 10, b ? bold : reg); y -= b ? 20 : 16; };
      sumRow('Subtotal', tt.subtotal); if (tt.discount) sumRow(`Discount ${disc.value} %`, -tt.discount); if (Number(tax.value)) sumRow(`Tax ${tax.value} %`, tt.tax); pg.drawLine({ start: { x: cPrice - 40, y: y + 12 }, end: { x: pw - M, y: y + 12 }, thickness: 1, color: ink }); y -= 4; sumRow('Total due', tt.total, true);
      if (notes.value.trim()) { y -= 16; D.wrapText(notes.value, pw - 2 * M, s => w(s, 9.5)).forEach(l => { if (y < M) { pg = doc.addPage([pw, ph]); y = ph - M; } text(l, M, y, 9.5, reg, grey); y -= 12.5; }); }
      const data = await doc.save(); const fn = `invoice-${(no.value || 'new').replace(/[^\w.-]+/g, '_')}.pdf`; out.append(btn(`${t('download')} ${fn}`, () => download(fn, new Blob([data], { type: 'application/pdf' })), 'primary'), h('span', { class: 'pt-hint', 'data-result': 'ready' }, `${doc.getPageCount()} page(s), total ${cur.value} ${f2(tt.total)}`));
    }
    [items, tax, disc, cur].forEach(el => el.addEventListener('input', debounce(calc, 150)));
    ui.append(h('div', { class: 'ut-options' }, field('Document title', title), field('Invoice number', no), field('Issue date', issue), field('Due date', due), field('Currency symbol', cur), field('Tax / VAT %', tax), field('Discount %', disc), field('Paper', sheet)), h('div', { class: 'ut-io' }, h('div', { class: 'ut-col' }, h('strong', {}, 'From'), from), h('div', { class: 'ut-col' }, h('strong', {}, 'Bill to'), to)), field('Items (one per line: description; quantity; unit price)', items), field('Notes and payment details', notes), sum, err, h('div', { class: 'ut-actions' }, btn('Create invoice PDF', make, 'primary')), out,
      h('p', { class: 'pt-hint' }, 'Check the amounts and the legal requirements for invoices in your country (tax ID, sequential number, service date). This tool lays out the document; it does not give tax advice.'));
    calc();
  },
  'certificate-generator'(root) {
    const ui = wrap(root); const title = textInput('Certificate of Achievement'), names = area({ rows: 4, placeholder: 'One name per line (one certificate each)' }), reason = area({ rows: 3 }), date = textInput(new Date().toISOString().slice(0, 10)), signer = textInput('Jane Doe, Director'), org = textInput('Your Organisation');
    names.value = 'Alex Example\nSam Sample'; reason.value = 'in recognition of outstanding dedication and a job well done.';
    const theme = select([['#1f4e9e', 'Blue'], ['#8a1c2b', 'Burgundy'], ['#1f6f4a', 'Green'], ['#333333', 'Charcoal'], ['#9a6b00', 'Gold']], '#1f4e9e'); const sheet = select([['A4', 'A4 landscape'], ['Letter', 'US Letter landscape']], 'A4');
    const prev = h('div', { class: 'ut-out' }), out = h('div', { class: 'ut-actions' });
    const W = 1754;
    function draw(name, paper = 'A4') {
      const [a, b] = D.PAPER[paper]; const w = W, hgt = Math.round(W * Math.min(a, b) / Math.max(a, b)); const c = Object.assign(document.createElement('canvas'), { width: w, height: hgt }); const g = c.getContext('2d'); const col = theme.value;
      g.fillStyle = '#fffdf7'; g.fillRect(0, 0, w, hgt); g.strokeStyle = col; g.lineWidth = 14; g.strokeRect(40, 40, w - 80, hgt - 80); g.lineWidth = 3; g.strokeRect(70, 70, w - 140, hgt - 140);
      g.textAlign = 'center'; g.fillStyle = col; const fit = (txt, font, max, start) => { let s = start; do { g.font = font(s); s -= 2; } while (g.measureText(txt).width > max && s > 14); return txt; };
      fit(title.value, s => `bold ${s}px Georgia, 'Times New Roman', serif`, w - 340, 92); g.fillText(title.value, w / 2, hgt * 0.27);
      g.fillStyle = '#555'; g.font = `italic 34px Georgia, serif`; g.fillText('is proudly presented to', w / 2, hgt * 0.38);
      g.fillStyle = '#111'; fit(name, s => `bold ${s}px Georgia, serif`, w - 360, 100); g.fillText(name, w / 2, hgt * 0.53); g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(w * 0.25, hgt * 0.56); g.lineTo(w * 0.75, hgt * 0.56); g.stroke();
      g.fillStyle = '#333'; g.font = '36px Georgia, serif'; const words = reason.value.split(/\s+/); let ln = '', y = hgt * 0.66; for (const wd of words) { const t2 = ln ? ln + ' ' + wd : wd; if (g.measureText(t2).width > w - 460) { g.fillText(ln, w / 2, y); y += 50; ln = wd; } else ln = t2; } g.fillText(ln, w / 2, y);
      g.font = '30px Georgia, serif'; g.textAlign = 'left'; g.fillText(date.value, 190, hgt - 170); g.beginPath(); g.lineWidth = 2; g.moveTo(180, hgt - 150); g.lineTo(520, hgt - 150); g.stroke(); g.fillStyle = '#777'; g.font = '22px Georgia, serif'; g.fillText('Date', 190, hgt - 118);
      g.textAlign = 'right'; g.fillStyle = '#333'; g.font = '30px Georgia, serif'; g.fillText(signer.value, w - 190, hgt - 170); g.beginPath(); g.moveTo(w - 520, hgt - 150); g.lineTo(w - 180, hgt - 150); g.stroke(); g.fillStyle = '#777'; g.font = '22px Georgia, serif'; g.fillText(org.value, w - 190, hgt - 118);
      return c;
    }
    const list = () => names.value.split('\n').map(s => s.trim()).filter(Boolean);
    function render() { const n = list(); prev.replaceChildren(); if (!n.length) return; const c = draw(n[0], sheet.value); c.style.cssText = 'max-width:100%;height:auto;border:1px solid var(--s-border,#ccc)'; prev.append(c, h('p', { class: 'pt-hint' }, `Preview of the first of ${n.length} certificate(s).`)); }
    async function make() {
      out.replaceChildren(); const n = list(); if (!n.length) return; const PL = await pdfLib(); const doc = await PL.PDFDocument.create(); const [a, b] = D.PAPER[sheet.value].map(mm); const W2 = Math.max(a, b), H2 = Math.min(a, b);
      for (const name of n.slice(0, 200)) { const c = draw(name, sheet.value); const blob = await new Promise(r => c.toBlob(r, 'image/png')); const img = await doc.embedPng(new Uint8Array(await blob.arrayBuffer())); doc.addPage([W2, H2]).drawImage(img, { x: 0, y: 0, width: W2, height: H2 }); }
      const data = await doc.save(); out.append(btn(`${t('download')} certificates.pdf`, () => download('certificates.pdf', new Blob([data], { type: 'application/pdf' })), 'primary'), btn('Download first as PNG', async () => download('certificate.png', await new Promise(r => draw(n[0], sheet.value).toBlob(r, 'image/png'))), 'secondary'), h('span', { class: 'pt-hint', 'data-result': 'ready' }, `${n.length} certificate(s)`));
    }
    [title, names, reason, date, signer, org, theme, sheet].forEach(el => el.addEventListener('input', debounce(render, 200))); [theme, sheet].forEach(el => el.addEventListener('change', render));
    ui.append(h('div', { class: 'ut-options' }, field('Title', title), field('Date', date), field('Signed by', signer), field('Organisation', org), field('Colour', theme), field('Paper', sheet)), field('Recipients (one per line)', names), field('Text', reason), prev, h('div', { class: 'ut-actions' }, btn('Create certificates (PDF)', make, 'primary')), out); render();
  },
  'markdown-to-docx'(root) {
    const ui = wrap(root); const ta = area({ rows: 14, placeholder: '# Title\n\nWrite or paste Markdown here…', 'aria-label': 'Markdown' }); const title = textInput('Document'), font = select([['Calibri', 'Calibri'], ['Arial', 'Arial'], ['Times New Roman', 'Times New Roman'], ['Georgia', 'Georgia']], 'Calibri'); const info = h('div', { class: 'ut-stats' }), out = h('div', { class: 'ut-actions' });
    const sample = '# Project report\n\nThis is **bold**, this is *italic*, and this is `code`. A [link](https://example.com).\n\n## Tasks\n\n- Write the draft\n- Review with the team\n  - Collect comments\n\n1. First\n2. Second\n\n> A quote from a customer.\n\n| Item | Cost |\n|------|------|\n| Design | 400 |\n| Build | 900 |\n';
    async function make() {
      out.replaceChildren(); if (!ta.value.trim()) { out.append(h('span', { class: 'pt-hint' }, 'Enter some Markdown first.')); return; } const { zipSync, strToU8 } = await fflate(); const files = D.docxFiles(ta.value, { title: title.value, font: font.value });
      const entries = {}; for (const [k, v] of Object.entries(files)) entries[k] = strToU8(v); const data = zipSync(entries, { level: 6 }); const fn = (title.value || 'document').replace(/[^\w.-]+/g, '_') + '.docx';
      info.replaceChildren(stat('Words', (ta.value.match(/\S+/g) || []).length), stat('Size', sizeFmt(data.length))); out.append(btn(`${t('download')} ${fn}`, () => download(fn, new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })), 'primary'), h('span', { class: 'pt-hint', 'data-result': 'ready' }, 'DOCX ready'));
    }
    ui.append(h('div', { class: 'ut-options' }, field('Document title', title), field('Font', font)), h('div', { class: 'ut-colhead' }, h('strong', {}, 'Markdown'), h('span', { class: 'ut-colbtns' }, btn(t('sample'), () => { ta.value = sample; }, 'ghost'), filePicker({ accept: '.md,.markdown,.txt,text/*', label: t('openFile'), onFiles: async ([f]) => { ta.value = await f.text(); title.value = baseName(f.name); } }), btn(t('clear'), () => { ta.value = ''; }, 'ghost'))), ta, h('div', { class: 'ut-actions' }, btn('Create Word document', make, 'primary')), info, out,
      h('p', { class: 'pt-hint' }, 'Supported: headings, bold, italic, inline code, links, bullet and numbered lists (nested), quotes, code blocks, tables and rules. Images are not included.'));
  },
  'docx-to-markdown'(root) {
    const ui = wrap(root); const out = area({ rows: 16, readonly: true, 'aria-label': 'Markdown output' }); const info = h('div', { class: 'ut-stats' }), err = h('p', { class: 'pt-drop__error', role: 'alert', hidden: true }); let name = 'document';
    async function load([f]) {
      err.hidden = true; try {
        const { unzipSync, strFromU8 } = await fflate(); const z = unzipSync(new Uint8Array(await f.arrayBuffer())); if (!z['word/document.xml']) throw new Error('This is not a .docx file (no word/document.xml). Old .doc files must be saved as .docx first.');
        const P = new DOMParser(); const parse = s => P.parseFromString(strFromU8(s), 'application/xml'); const rels = {}; if (z['word/_rels/document.xml.rels']) for (const r of parse(z['word/_rels/document.xml.rels']).getElementsByTagName('Relationship')) rels[r.getAttribute('Id')] = r.getAttribute('Target');
        const md = D.docxToMarkdown(parse(z['word/document.xml']), { numbering: z['word/numbering.xml'] ? parse(z['word/numbering.xml']) : null, rels }); out.value = md; name = baseName(f.name);
        info.replaceChildren(stat('File', f.name), stat('Words', (md.match(/\S+/g) || []).length), stat('Images skipped', (strFromU8(z['word/document.xml']).match(/<w:drawing/g) || []).length));
      } catch (e) { err.textContent = e.message || String(e); err.hidden = false; }
    }
    const drop = h('div', { class: 'ut-drop' }, h('p', {}, 'Drop a Word (.docx) file here, or'), filePicker({ accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: t('chooseFile'), onFiles: load }));
    ['dragover', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' && e.dataTransfer.files[0]) load([e.dataTransfer.files[0]]); }));
    ui.append(drop, info, err, h('div', { class: 'ut-colhead' }, h('strong', {}, 'Markdown'), h('span', { class: 'ut-colbtns' }, btn(t('copy'), () => copyText(out.value), 'primary'), btn(t('download'), () => download(name + '.md', out.value), 'secondary'))), out,
      h('p', { class: 'pt-hint' }, 'Headings, bold, italic, links, lists, tables and quotes are kept. Images, comments, footnotes and text boxes are not converted.'));
  },

  'pdf-annotation-extractor'(root) {
    const ui = wrap(root); const info = h('div', { class: 'ut-stats' }), err = h('p', { class: 'pt-drop__error', role: 'alert', hidden: true }), out = h('div'); let list = [], name = 'pdf';
    const kinds = { highlight: check('Highlights, underlines, strike-outs', true, { onChange: show }), notes: check('Notes and text boxes', true, { onChange: show }) };
    function show() { const rows = list.filter(a => (['Highlight', 'Underline', 'Strike-out', 'Squiggly'].includes(a.kind) ? kinds.highlight.input.checked : kinds.notes.input.checked)); const md = D.annotationsMarkdown(rows, name); out.replaceChildren(rows.length ? table([['Page', 'Type', 'Author', 'Marked text', 'Comment'], ...rows.map(a => [a.page, a.kind, a.author, a.text, a.comment])], { max: 500 }) : h('p', { class: 'pt-hint' }, 'No matching annotations found. Annotations that are only drawn into the page (flattened) cannot be extracted.'), rows.length ? h('div', { class: 'ut-actions' }, btn('Copy as Markdown', () => copyText(md), 'primary'), btn('Download .md', () => download(name + '-annotations.md', md), 'secondary'), btn('Download CSV', () => download(name + '-annotations.csv', [['Page', 'Type', 'Author', 'Text', 'Comment'], ...rows.map(a => [a.page, a.kind, a.author, a.text, a.comment])].map(r => r.map(c => `"${String(c ?? '').replaceAll('"', '""')}"`).join(',')).join('\n'), 'text/csv'), 'secondary'), h('span', { class: 'pt-hint', 'data-result': 'ready' }, `${rows.length} annotation(s)`)) : null); }
    async function load([f]) { err.hidden = true; out.replaceChildren(h('p', { class: 'pt-hint' }, t('processing'))); list = []; name = baseName(f.name); try { const pdf = await openPdfjs(await readBytes(f)); let skipped = 0; for (let p = 1; p <= pdf.numPages; p++) { const page = await pdf.getPage(p); const annots = (await page.getAnnotations()).filter(a => D.ANNOT_KIND[a.subtype]); if (!annots.length) continue; const items = (await page.getTextContent()).items; for (const a of annots) { const kind = D.ANNOT_KIND[a.subtype]; const marks = ['Highlight', 'Underline', 'StrikeOut', 'Squiggly'].includes(a.subtype); const text = marks ? D.textInRects(items, D.quadsToRects(a.quadPoints, a.rect)) : ''; const comment = (a.contentsObj?.str ?? a.contents ?? '').toString().trim(); if (!marks && !comment && !text) { skipped++; continue; } list.push({ page: p, kind, author: (a.titleObj?.str ?? a.title ?? '').toString(), text, comment }); } }
        info.replaceChildren(stat('File', f.name), stat('Pages', pdf.numPages), stat('Annotations', list.length), stat('Highlights', list.filter(a => a.text).length)); show(); } catch (e) { err.textContent = /password/i.test(e.message) ? 'This PDF is password-protected. Remove the password first with the Unlock PDF tool.' : 'Could not read this PDF: ' + (e.message || e); err.hidden = false; out.replaceChildren(); } }
    const drop = h('div', { class: 'ut-drop' }, h('p', {}, 'Drop a PDF with highlights and comments here, or'), filePicker({ accept: 'application/pdf,.pdf', label: t('chooseFile'), onFiles: load })); ['dragover', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' && e.dataTransfer.files[0]) load([e.dataTransfer.files[0]]); }));
    ui.append(drop, h('div', { class: 'ut-options' }, ...Object.values(kinds)), info, err, out, h('p', { class: 'pt-hint' }, 'The marked text is the text that lies under each highlight, so it is only available for PDFs with a text layer. Annotations made by some apps (for example ink drawings) are not listed. Everything runs in your browser.'));
  },
  'pdf-grayscale-converter'(root) {
    pdfRaster(root);
  },
  'printer-test-sheet'(root) {
    const ui = wrap(root); const paper = select(PAPER_CHOICES, 'A4'), duplex = check('Add a second page for checking duplex alignment', true), out = h('div', { class: 'ut-actions' });
    async function make() { out.replaceChildren(); const PL = await pdfLib(); const doc = await PL.PDFDocument.create(); doc.registerFontkit(await fontkit()); const font = await embedUnicode(doc), bold = await embedUnicode(doc, true); const [W, H] = D.PAPER[paper.value].map(mm); const { rgb } = PL; const ink = rgb(0, 0, 0), grey = rgb(0.6, 0.6, 0.6);
      const pages = [doc.addPage([W, H])]; if (duplex.input.checked) pages.push(doc.addPage([W, H]));
      pages.forEach((pg, pi) => { const T = (s, x, y, size = 9, f = font, c = ink) => pg.drawText(s, { x, y, size, font: f, color: c }); const L = (x0, y0, x1, y1, w = 0.5, c = ink) => pg.drawLine({ start: { x: x0, y: y0 }, end: { x: x1, y: y1 }, thickness: w, color: c });
        for (let x = 0; x <= W; x += mm(10)) L(x, 0, x, H, 0.25, rgb(0.85, 0.88, 0.92)); for (let y = 0; y <= H; y += mm(10)) L(0, y, W, y, 0.25, rgb(0.85, 0.88, 0.92));
        pg.drawRectangle({ x: mm(5), y: mm(5), width: W - mm(10), height: H - mm(10), borderColor: ink, borderWidth: 1 }); for (const [cx, cy] of [[mm(5), mm(5)], [W - mm(5), mm(5)], [mm(5), H - mm(5)], [W - mm(5), H - mm(5)]]) { L(cx - 12, cy, cx + 12, cy, 0.7); L(cx, cy - 12, cx, cy + 12, 0.7); pg.drawCircle({ x: cx, y: cy, size: 5, borderColor: ink, borderWidth: 0.7 }); }
        T(pi === 0 ? 'PRINTER TEST SHEET – FRONT' : 'PRINTER TEST SHEET – BACK (hold both sheets to the light)', mm(14), H - mm(18), 15, bold); T(`${paper.value} · print at 100 % / "Actual size" (not "Fit to page")`, mm(14), H - mm(25), 10, font, grey);
        let y = H - mm(40); T('1. Scale: this bar must measure exactly 100 mm with a ruler', mm(14), y, 9, bold); y -= mm(7); L(mm(14), y, mm(114), y, 1.2); for (let i = 0; i <= 10; i++) { const x = mm(14 + i * 10); L(x, y - 5, x, y + 5, 0.8); if (i % 5 === 0 || i === 10) T(String(i * 10), x - 4, y + 8, 7); } y -= mm(14);
        T('2. Margins: all four edges of the frame (5 mm from the paper edge) should be visible and equally thick', mm(14), y, 9, bold); y -= mm(14); T('3. Grey steps (0–100 % black)', mm(14), y, 9, bold); y -= mm(11); for (let i = 0; i <= 10; i++) { pg.drawRectangle({ x: mm(14 + i * 14), y, width: mm(14), height: mm(9), color: rgb(1 - i / 10, 1 - i / 10, 1 - i / 10), borderColor: grey, borderWidth: 0.3 }); T(String(i * 10), mm(14 + i * 14) + 5, y - 9, 7); } y -= mm(20);
        T('4. Colour blocks (RGB, compare with the screen)', mm(14), y, 9, bold); y -= mm(11); [['Cyan', [0, 1, 1]], ['Magenta', [1, 0, 1]], ['Yellow', [1, 1, 0]], ['Black', [0, 0, 0]], ['Red', [1, 0, 0]], ['Green', [0, 0.7, 0]], ['Blue', [0, 0, 1]]].forEach(([n, c], i) => { pg.drawRectangle({ x: mm(14 + i * 20), y, width: mm(18), height: mm(10), color: rgb(...c) }); T(n, mm(14 + i * 20), y - 9, 7); }); y -= mm(20);
        T('5. Line thickness (0.1 to 1.0 pt): none should be missing or broken', mm(14), y, 9, bold); y -= mm(6); [0.1, 0.25, 0.5, 0.75, 1].forEach((w, i) => { L(mm(14), y - i * 6, mm(100), y - i * 6, w); T(`${w} pt`, mm(104), y - i * 6 - 2, 7); }); y -= mm(18);
        T('6. Text sharpness', mm(14), y, 9, bold); y -= 14; [6, 8, 10, 12, 14].forEach(sz => { T(`${sz} pt: The quick brown fox jumps over the lazy dog 0123456789`, mm(14), y, sz); y -= sz + 4; }); y -= 8;
        T('7. Banding / clogged nozzles: the solid black bar below should be uniform without light stripes', mm(14), y, 9, bold); y -= mm(10); pg.drawRectangle({ x: mm(14), y, width: W - mm(28), height: mm(7), color: ink }); y -= mm(10); T(`Generated ${new Date().toISOString().slice(0, 10)}`, mm(14), mm(10), 7, font, grey); });
      const data = await doc.save(); out.append(btn(`${t('download')} printer-test-sheet.pdf`, () => download('printer-test-sheet.pdf', new Blob([data], { type: 'application/pdf' })), 'primary'), h('span', { class: 'pt-hint', 'data-result': 'ready' }, `${pages.length} page(s)`)); }
    ui.append(h('div', { class: 'ut-options' }, field('Paper', paper), duplex), h('div', { class: 'ut-actions' }, btn('Create test sheet (PDF)', make, 'primary')), out, h('p', { class: 'pt-hint' }, 'Print at 100 % without scaling, then check the scale bar with a ruler, the frame on all four sides, the grey steps, the text and the black bar. For a quick on-screen print test page you can also use test.institute.'));
  },
  'scan-separator-sheets'(root) {
    const ui = wrap(root); const count = numInput(10, { min: 1, max: 500, step: 1 }), prefix = textInput('DOC-'), start = numInput(1, { min: 0, step: 1 }), digits = numInput(3, { min: 1, max: 8, step: 1 }), title = textInput('SEPARATOR SHEET'), paper = select(PAPER_CHOICES, 'A4'), qr = check('Add a QR code with the label (for scan software that reads codes)', true), out = h('div', { class: 'ut-actions' });
    async function make() { out.replaceChildren(); const n = Math.max(1, Math.min(500, Math.round(count.value))); const PL = await pdfLib(); const doc = await PL.PDFDocument.create(); doc.registerFontkit(await fontkit()); const bold = await embedUnicode(doc, true), font = await embedUnicode(doc); const [W, H] = D.PAPER[paper.value].map(mm); const Q = qr.input.checked ? (await import('/assets/vendor/qrcode/qrcode.mjs')).default : null;
      for (let i = 0; i < n; i++) { const pg = doc.addPage([W, H]); const label = D.batesLabel(prefix.value, start.value, Math.round(digits.value), i); const draw = (txt, size, y, f = bold, color = PL.rgb(0, 0, 0)) => { let s = size; while (f.widthOfTextAtSize(txt, s) > W - mm(30) && s > 12) s -= 2; pg.drawText(txt, { x: (W - f.widthOfTextAtSize(txt, s)) / 2, y, size: s, font: f, color }); }; pg.drawRectangle({ x: 0, y: H - mm(60), width: W, height: mm(60), color: PL.rgb(0, 0, 0) }); draw(title.value || 'SEPARATOR SHEET', 30, H - mm(38), bold, PL.rgb(1, 1, 1)); draw(label, 72, H / 2 + mm(10)); draw('Place between documents. Do not file. Remove after scanning.', 13, H / 2 - mm(8), font, PL.rgb(0.35, 0.35, 0.4));
        if (Q) { const q = Q(0, 'M'); q.addData(label, 'Byte'); q.make(); const m = q.getModuleCount(), cell = mm(45) / m, x0 = (W - mm(45)) / 2, y0 = mm(40); pg.drawRectangle({ x: x0 - cell * 2, y: y0 - cell * 2, width: cell * (m + 4), height: cell * (m + 4), color: PL.rgb(1, 1, 1) }); for (let r = 0; r < m; r++) for (let c = 0; c < m; c++) if (q.isDark(r, c)) pg.drawRectangle({ x: x0 + c * cell, y: y0 + (m - 1 - r) * cell, width: cell + 0.1, height: cell + 0.1, color: PL.rgb(0, 0, 0) }); }
        pg.drawText(`${i + 1} / ${n}`, { x: mm(12), y: mm(12), size: 10, font, color: PL.rgb(0.4, 0.4, 0.45) }); }
      const data = await doc.save(); out.append(btn(`${t('download')} separator-sheets.pdf`, () => download('separator-sheets.pdf', new Blob([data], { type: 'application/pdf' })), 'primary'), h('span', { class: 'pt-hint', 'data-result': 'ready' }, `${n} sheet(s)`)); }
    ui.append(h('div', { class: 'ut-options' }, field('Number of sheets', count), field('Title on the black band', title), field('Label prefix', prefix), field('First number', start), field('Digits', digits), field('Paper', paper), qr), h('div', { class: 'ut-actions' }, btn('Create separator sheets (PDF)', make, 'primary')), out, h('p', { class: 'pt-hint' }, 'Print on coloured paper if you can: the stack is then easy to split by eye. The large label (for example DOC-001) shows the batch, the QR code contains the same text for scanners and software that split documents at barcodes.'));
  },
};
