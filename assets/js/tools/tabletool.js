// tabletool.js — factory for tools that read a table (CSV/TSV/pasted cells) and produce a table or text.
import { h, t, area, btn, select, check, field, numInput, textInput, filePicker, readBytes, copyText, download, table, stat, debounce, fmtNum } from './kit.js';
import { parseCSV, detectDelimiter, toCSV, pad, DELIMS, guessEncoding, decodeBytes } from './lib/csv.js';

export const DELIM_CHOICES = [['auto', 'Detect automatically'], ['comma', 'Comma ,'], ['semicolon', 'Semicolon ;'], ['tab', 'Tab'], ['pipe', 'Pipe |']];
export const OUT_DELIMS = [['comma', 'Comma ,'], ['semicolon', 'Semicolon ;'], ['tab', 'Tab (paste into Excel)'], ['pipe', 'Pipe |']];

/**
 * spec = {
 *   options: [{ key, label, type: 'check'|'select'|'text'|'number'|'col'|'cols', value, choices, min, max, step, hint, none }],
 *   header: true | false | undefined (no header toggle),
 *   parse?(text, o) -> rows           custom reader (e.g. JSON)
 *   run(rows, o) -> rows | { rows, notes[], stats[[l,v]], text, filename, mime, highlight(rowIdx,colIdx) }
 *   outDelim: 'comma'..., sample, inputLabel, outputLabel, filename, accept, text (output is text only)
 * }
 */
export function tableTool(root, spec) {
  const o = {}; let rows = [], delimiter = ',', lastOut = null, parseError = null;
  const input = area({ placeholder: spec.placeholder || 'Paste CSV or cells copied from Excel / Google Sheets here, or open a file', rows: 8, 'aria-label': spec.inputLabel || t('input'), onInput: debounce(() => load(), 150) });
  const inDelim = spec.parse ? null : select(DELIM_CHOICES, 'auto', { onChange: () => load() });
  const hdr = spec.header === undefined ? null : check('First row is a header', spec.header !== false, { onChange: () => { buildColumnControls(); update(); } });
  const outDelim = select(OUT_DELIMS, spec.outDelim || 'comma', { onChange: update }); const quoteAll = check('Quote every value', false, { onChange: update }); const bom = check('Add UTF-8 BOM (helps Excel with accents)', false, { onChange: update });
  const eol = select([['\n', 'LF (Mac, Linux)'], ['\r\n', 'CRLF (Windows)']], '\n', { onChange: update });
  const notes = h('div', { class: 'ut-notes' }), stats = h('div', { class: 'ut-stats' }), err = h('p', { class: 'pt-drop__error', role: 'alert', hidden: true });
  const preview = h('div'), textOut = area({ readonly: true, rows: 10, 'aria-label': spec.outputLabel || t('output') });
  const ctl = {};  // key -> { el, def }
  const optBox = h('div', { class: 'ut-options' }); const colBox = h('div', { class: 'ut-options', hidden: true });

  function headers() { const w = Math.max(0, ...rows.map(r => r.length)); const first = rows[0] || []; return Array.from({ length: w }, (_, i) => hdr?.input.checked !== false && first[i] ? `${i + 1}. ${first[i]}` : `Column ${i + 1}`); }
  function buildColumnControls() {
    const hs = headers(); colBox.replaceChildren(); let any = false;
    for (const d of (spec.options || []).filter(x => x.type === 'col' || x.type === 'cols')) {
      const prev = ctl[d.key]; any = true;
      // keep what the user picked, but only if they actually touched it and the table still has the same width
      const keep = prev?.touched && prev.n === hs.length;
      if (d.type === 'col') {
        const initial = keep ? prev.el.value : String(d.value ?? (d.none ? -1 : 0));
        const sel = select([...(d.none ? [['-1', d.none]] : []), ...hs.map((x, i) => [String(i), x])], initial, { onChange: () => { ctl[d.key].touched = true; update(); } });
        if (!hs.length) sel.value = d.none ? '-1' : '0';
        ctl[d.key] = { el: sel, d, touched: keep, n: hs.length }; colBox.append(field(d.label, sel, d.hint));
      } else {
        const chosen = new Set(keep ? prev.el.selected : (d.value === 'all' ? hs.map((_, i) => i) : (d.value ?? [])).filter(i => i < hs.length));
        const entry = { d, touched: keep, n: hs.length, el: { get selected() { return [...chosen].sort((a, b) => a - b); } } }; ctl[d.key] = entry;
        const wrapEl = h('div', { class: 'ut-checks' }, hs.map((x, i) => { const c = check(x, chosen.has(i), { onChange: () => { entry.touched = true; if (c.input.checked) chosen.add(i); else chosen.delete(i); update(); } }); return c; }));
        colBox.append(h('div', { class: 'ut-field ut-field--wide' }, h('label', {}, d.label), wrapEl, d.hint && h('small', {}, d.hint)));
      }
    }
    colBox.hidden = !any;
  }
  for (const d of (spec.options || []).filter(x => !['col', 'cols'].includes(x.type))) {
    let el, node;
    if (d.type === 'check') { node = check(d.label, d.value, { onChange: update }); el = node.input; }
    else if (d.type === 'select') { el = select(d.choices, d.value, { onChange: update }); node = field(d.label, el, d.hint); }
    else { el = d.type === 'number' ? numInput(d.value, { min: d.min, max: d.max, step: d.step, onInput: debounce(update, 200) }) : textInput(d.value ?? '', { onInput: debounce(update, 200), placeholder: d.placeholder || '' }); node = field(d.label, el, d.hint); }
    ctl[d.key] = { el, d }; optBox.append(node);
  }
  if (hdr) optBox.prepend(hdr); if (inDelim) optBox.prepend(field('Input separator', inDelim));
  optBox.hidden = !optBox.children.length;

  function readOpts() {
    for (const [k, { el, d }] of Object.entries(ctl)) o[k] = d.type === 'check' ? el.checked : d.type === 'number' ? Number(el.value) : d.type === 'col' ? Number(el.value) : d.type === 'cols' ? el.selected : el.value;
    o.header = hdr ? hdr.input.checked : spec.header ?? true;
  }
  function load() {
    parseError = null;
    try {
      readOpts();
      if (spec.parse) rows = spec.parse(input.value, o);
      else { delimiter = inDelim.value === 'auto' ? detectDelimiter(input.value) : DELIMS[inDelim.value]; rows = input.value.trim() ? pad(parseCSV(input.value, delimiter)) : []; }
    } catch (e) { rows = []; parseError = e.message || String(e); }
    buildColumnControls(); update();
  }
  function showErr(e) { err.textContent = e.message || String(e); err.hidden = false; }
  function update() {
    readOpts(); err.textContent = parseError || ''; err.hidden = !parseError; notes.replaceChildren(); stats.replaceChildren(); preview.replaceChildren(); textOut.value = ''; lastOut = null;
    if (!rows.length) return;
    try {
      let r = spec.run(rows, o, { delimiter, headers: headers() }); if (Array.isArray(r)) r = { rows: r };
      const sep = DELIMS[outDelim.value] ?? ','; const csv = r.rows ? toCSV(r.rows, { delimiter: sep, quoteAll: quoteAll.input.checked, eol: eol.value, escapeFormulas: false }) : null;
      const text = r.text ?? csv; lastOut = { text, csv, rows: r.rows, filename: r.filename || spec.filename || 'table.csv', mime: r.mime || 'text/csv;charset=utf-8' };
      if (r.rows && !r.text) preview.replaceChildren(table(r.rows, { header: o.header !== false, max: 300 })); else { textOut.value = text; preview.replaceChildren(textOut); }
      const auto = delimiter ? [[ 'Detected', ({ ',': 'comma', ';': 'semicolon', '\t': 'tab', '|': 'pipe' })[delimiter] || delimiter ]] : [];
      stats.replaceChildren(...[...(spec.parse ? [] : auto), ['Rows', fmtNum(rows.length - (o.header !== false ? 1 : 0), 0)], ['Columns', fmtNum(rows[0].length, 0)], ...(r.stats || [])].map(([l, v]) => stat(l, v)));
      notes.replaceChildren(...(r.notes || []).map(n => h('p', { class: 'pt-notice' }, n)));
    } catch (e) { showErr(e); }
  }
  function content() { const sep = DELIMS[outDelim.value] ?? ','; return (bom.input.checked ? '﻿' : '') + (lastOut?.text ?? ''); }
  const pick = filePicker({ accept: spec.accept || '.csv,.tsv,.txt,.tab,text/*,.json', label: t('openFile'), onFiles: async ([f]) => { const b = await readBytes(f); input.value = decodeBytes(b, guessEncoding(b)); load(); } });
  const showOut = !spec.text;
  root.append(h('div', { class: 'ut' }, optBox, colBox,
    h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, spec.inputLabel || t('input')), h('span', { class: 'ut-colbtns' }, spec.sample && btn(t('sample'), () => { input.value = spec.sample; load(); }, 'ghost'), pick, btn(t('clear'), () => { input.value = ''; load(); }, 'ghost'))), input),
    err, stats, notes,
    h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, spec.outputLabel || t('output')), h('span', { class: 'ut-colbtns' }, btn(t('copy'), () => lastOut && copyText(lastOut.text), 'primary'), btn(t('download'), () => lastOut && download(lastOut.filename, (bom.input.checked ? '﻿' : '') + lastOut.text, lastOut.mime)))), preview),
    !spec.text && h('details', { class: 'ut-more' }, h('summary', {}, 'Output format'), h('div', { class: 'ut-options' }, field('Output separator', outDelim), field('Line endings', eol), quoteAll, bom))));
  if (spec.sample && spec.autoSample) { input.value = spec.sample; }
  load();
  return { input, load, update, get out() { return lastOut; } };
}
