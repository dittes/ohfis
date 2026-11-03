// data.js — UI for the spreadsheet and CSV tools. Logic lives in lib/ (unit-tested).
import { h, t, area, btn, select, check, field, numInput, textInput, filePicker, readBytes, readText, copyText, download, table, stat, debounce, fmtNum, wrap, textTool, copyBar } from './kit.js';
import { tableTool, OUT_DELIMS } from './tabletool.js';
import { parseCSV, detectDelimiter, toCSV, pad, DELIMS, ENCODINGS, guessEncoding, decodeBytes, fixMojibake } from './lib/csv.js';
import * as D from './lib/data.js';
import { formatValue } from './lib/numfmt.js';
import * as F from './lib/formula.js';
import { splitTable } from './lib/text.js';

const SAMPLE = 'Name,City,Qty,Price\nAnn Lee,Berlin,3,19.90\nBo Chen,Paris,12,5.50\nCleo Diaz,Berlin,7,12.00';
const wrapInt = (rows, fn) => rows;

export const tools = {
  'csv-delimiter-converter'(root) {
    tableTool(root, { header: undefined, sample: 'name;city;note\nAnn;Berlin;"likes cats; dogs"\nBo;Paris;ok', outDelim: 'comma', filename: 'converted.csv',
      run: (rows, o, ctx) => ({ rows, notes: [`Input separator: ${({ ',': 'comma', ';': 'semicolon', '\t': 'tab', '|': 'pipe' })[ctx.delimiter]}. Quotes and line breaks inside cells are preserved.`] }) });
  },
  'leading-zero-fixer'(root) {
    tableTool(root, { header: true, sample: 'employee_id,zip,city\n42,2134,Boston\n1007,10115,Berlin\n7,501,Holtsville\n9,90210,Beverly Hills\n11,60601,Chicago',
      options: [{ key: 'width', label: 'Pad numbers to this many digits (0 = detect from the data)', type: 'number', value: 0, min: 0, max: 30 }, { key: 'cols', label: 'Columns to repair', type: 'cols', value: 'all' }],
      run: (rows, o) => { const w = o.width > 0 ? { '*': o.width } : D.guessWidths(rows, o.header); const r = D.restoreLeadingZeros(rows, { columns: o.cols, width: w, header: o.header });
        return { rows: r.rows, stats: [['Cells repaired', r.fixed]], notes: [Object.keys(w).length ? `Widths used: ${Object.entries(w).map(([c, n]) => `${c === '*' ? 'all' : `column ${+c + 1}`} = ${n}`).join(', ')}. Open the downloaded file via Data → From Text and set the column to "Text" so Excel keeps the zeros.` : 'No column looked like it had lost leading zeros. Enter a width to force it.'] }; } });
  },
  'vlookup-formula-generator'(root) {
    const ui = wrap(root); const v = {};
    const mk = (k, label, val, hint, type = 'text') => { v[k] = type === 'number' ? numInput(val, { min: 1, onInput: run }) : textInput(val, { onInput: run }); return field(label, v[k], hint); };
    const lang = select(Object.entries(F.SHEET_LANG_NAMES), 'en', { onChange: run }), wrapErr = check('Wrap in IFERROR', true, { onChange: run }), exact = check('Exact match', true, { onChange: run });
    const out = h('div', { class: 'ut-formulas' });
    function row(title, formula, note) { return formula ? h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, title), btn(t('copy'), () => copyText(formula), 'primary')), h('pre', { class: 'ut-pre' }, formula)) : h('p', { class: 'pt-notice pt-notice--error' }, `${title}: ${note}`); }
    function run() {
      const val = k => v[k].value.trim(); const sc = val('sc').replace(/\d/g, '').toUpperCase() || 'D', rc = val('rc').replace(/\d/g, '').toUpperCase() || 'F';
      if (!/^[A-Z]{1,3}$/.test(sc) || !/^[A-Z]{1,3}$/.test(rc)) { out.replaceChildren(h('p', { class: 'pt-notice pt-notice--error' }, 'Enter column letters such as D or AB.')); return; }
      const r = F.lookupFormulas({ lookup: val('lookup') || 'A2', searchCol: sc, returnCol: rc, firstRow: Number(v.first.value) || 2, lastRow: Number(v.last.value) || 100, sheet: val('sheet'), notFound: val('nf'), wrap: wrapErr.input.checked, exact: exact.input.checked });
      const L = f => f && lang.value !== 'en' ? F.translateFormula(f, 'en', lang.value).formula : f;
      out.replaceChildren(row('XLOOKUP (Excel 365/2021, Google Sheets uses a different syntax)', L(r.xlookup)), row('VLOOKUP', L(r.vlookup), 'not possible with these columns.'), row('INDEX + MATCH (works everywhere, also looks left)', L(r.indexMatch)), h('p', { class: 'pt-hint' }, r.note));
    }
    ui.append(h('div', { class: 'ut-options' }, mk('lookup', 'Cell with the value to look up', 'A2', 'e.g. A2'), mk('sc', 'Column to search in', 'D', 'e.g. D'), mk('rc', 'Column to return', 'F', 'e.g. F'), mk('first', 'First data row', 2, '', 'number'), mk('last', 'Last data row', 100, '', 'number'), mk('sheet', 'Sheet name (optional)', '', 'Lookup table on another sheet'), mk('nf', 'Text if not found', 'Not found'), field('Spreadsheet language', lang), wrapErr, exact), out); run();
  },
  'excel-date-converter'(root) {
    textTool(root, { options: [{ key: 'm', label: 'Date system', type: 'select', value: '1900', choices: [['1900', 'Windows Excel (1900)'], ['1904', 'Mac Excel 2008 and older (1904)']] }],
      sample: '45231\n44927.5\n2024-02-29\n2023-07-04 15:30\n60', inputLabel: 'Serial numbers or ISO dates (one per line)', outputLabel: 'Converted', placeholder: '45231  or  2024-02-29',
      run: (s, o) => ({ text: s.split(/\r?\n/).map(l => { const x = l.trim(); if (!x) return ''; const opt = { date1904: o.m === '1904' }; if (/^-?\d+(\.\d+)?$/.test(x)) return D.serialToISO(Number(x), opt) ?? '⚠ not a valid serial'; const r = D.dateToSerial(x, opt); return r === null ? '⚠ use YYYY-MM-DD or YYYY-MM-DD hh:mm' : String(r); }).join('\n'),
        stats: [['Today as serial', String(Math.floor(D.dateToSerial(new Date().toISOString().slice(0, 10), { date1904: o.m === '1904' })))]] }) });
  },
  'json-to-csv'(root) {
    tableTool(root, { header: undefined, inputLabel: 'JSON', placeholder: 'Paste a JSON array of objects, or an object that contains one', accept: '.json,application/json,.txt', outDelim: 'comma', filename: 'data.csv',
      sample: '[{"id":1,"name":"Ann","address":{"city":"Berlin","zip":"10115"},"tags":["a","b"]},{"id":2,"name":"Bo","address":{"city":"Paris"}}]',
      options: [{ key: 'sep', label: 'Key separator for nested objects', type: 'text', value: '.' }, { key: 'arrays', label: 'Arrays', type: 'select', value: 'index', choices: [['index', 'One column per item (tags.0, tags.1)'], ['join', 'Join values with ;'], ['json', 'Keep as JSON text']] }],
      parse: (text, o) => text.trim() ? D.jsonToRows(text, { sep: o.sep || '.', arrays: o.arrays }) : [], run: rows => rows });
  },
  'csv-to-json'(root) {
    tableTool(root, { header: true, text: true, sample: 'id,name,address.city,active\n1,Ann,Berlin,true\n2,Bo,Paris,false', outputLabel: 'JSON', filename: 'data.json',
      options: [{ key: 'types', label: 'Convert numbers, true/false and empty cells', type: 'check', value: true }, { key: 'nested', label: 'Turn dotted headers (a.b) into nested objects', type: 'check', value: false }, { key: 'pretty', label: 'Pretty print', type: 'check', value: true }, { key: 'lines', label: 'JSON Lines (one object per line)', type: 'check', value: false }],
      run: (rows, o) => { const data = D.rowsToJson(rows, { types: o.types, nested: o.nested, header: o.header }); const text = o.lines ? data.map(x => JSON.stringify(x)).join('\n') : JSON.stringify(data, null, o.pretty ? 2 : 0); return { text, mime: 'application/json', filename: o.lines ? 'data.jsonl' : 'data.json', stats: [['Objects', data.length]] }; } });
  },
  'transpose-table'(root) { tableTool(root, { header: undefined, sample: 'Quarter,Q1,Q2,Q3\nRevenue,100,120,150\nCosts,60,70,80', outDelim: 'tab', filename: 'transposed.csv', run: rows => D.transpose(rows) }); },
  'pivot-table-generator'(root) {
    tableTool(root, { header: true, sample: 'region,quarter,product,sales\nNorth,Q1,A,100\nNorth,Q2,A,120\nSouth,Q1,B,80\nNorth,Q1,B,60\nSouth,Q2,A,90', filename: 'pivot.csv',
      options: [{ key: 'row', label: 'Rows (group by)', type: 'col', value: 0 }, { key: 'col', label: 'Columns (optional)', type: 'col', none: '— none —', value: -1 }, { key: 'val', label: 'Values', type: 'col', value: 3 },
        { key: 'agg', label: 'Calculate', type: 'select', value: 'sum', choices: [['sum', 'Sum'], ['avg', 'Average'], ['count', 'Count rows'], ['counta', 'Count non-empty'], ['distinct', 'Distinct count'], ['min', 'Minimum'], ['max', 'Maximum'], ['median', 'Median']] }],
      run: (rows, o) => ({ rows: D.pivot(rows, { row: o.row, col: o.col < 0 ? null : o.col, value: o.val, agg: o.agg, header: o.header }) }) });
  },
  'split-column'(root) {
    tableTool(root, { header: true, sample: 'name,phone\nAnn Marie Lee,+49 30 1234\nBo Chen,+33 1 5555', filename: 'split.csv',
      options: [{ key: 'col', label: 'Column to split', type: 'col', value: 0 }, { key: 'mode', label: 'Split by', type: 'select', value: 'delimiter', choices: [['delimiter', 'Delimiter'], ['positions', 'Character positions'], ['pattern', 'Regular expression (capture groups)']] },
        { key: 'sep', label: 'Delimiter / pattern', type: 'text', value: ' ', hint: 'For positions: numbers like 2,5' }, { key: 'regex', label: 'Delimiter is a regular expression', type: 'check', value: false }, { key: 'max', label: 'Maximum parts (0 = all)', type: 'number', value: 0, min: 0 }, { key: 'keep', label: 'Keep the original column', type: 'check', value: false }],
      run: (rows, o) => ({ rows: D.splitColumn(rows, { col: o.col, mode: o.mode, delimiter: o.sep, regex: o.regex, positions: o.mode === 'positions' ? o.sep.split(/[,\s]+/).map(Number).filter(Number.isFinite) : [], max: o.max, header: o.header, keep: o.keep }) }) });
  },
  'csv-compare'(root) {
    const ui = wrap(root); const a = area({ placeholder: 'Original CSV', rows: 8, onInput: debounce(run, 200) }), b = area({ placeholder: 'Changed CSV', rows: 8, onInput: debounce(run, 200) });
    let picked = false; const key = select([['-1', 'Compare row by row (no key)']], '-1', { onChange: () => { picked = true; run(); } }), hdr = check('First row is a header', true, { onChange: () => { fillKeys(); run(); } }); const out = h('div'), stats = h('div', { class: 'ut-stats' }); let last = null;
    const parse = s => s.trim() ? pad(parseCSV(s, detectDelimiter(s))) : [];
    function fillKeys() { const A = parse(a.value); const hs = (A[0] || []).map((x, i) => [String(i), `Match rows by: ${hdr.input.checked ? x : 'Column ' + (i + 1)}`]); const cur = key.value; key.replaceChildren(...[['-1', 'Compare row by row (no key)'], ...hs].map(([v, l]) => h('option', { value: v }, l))); key.value = picked && [...key.options].some(o => o.value === cur) ? cur : (hs.length ? '0' : '-1'); }
    function run() { const A = parse(a.value), B = parse(b.value); if (!A.length || !B.length) { out.replaceChildren(); stats.replaceChildren(); return; }
      if (key.options.length <= 1) fillKeys(); const r = D.diffTables(A, B, { key: Number(key.value), header: hdr.input.checked }); last = r;
      stats.replaceChildren(stat('Added', r.added), stat('Removed', r.removed), stat('Changed', r.changed), stat('Identical', r.same));
      const head = hdr.input.checked ? B[0] : B[0].map((_, i) => `Column ${i + 1}`); const tb = h('table', { class: 'ut-table' }); tb.append(h('tr', {}, h('th', {}, 'Status'), head.map(x => h('th', {}, x))));
      for (const c of r.changes) { if (c.type === 'changed') tb.append(h('tr', {}, h('td', { class: 'ut-hl-chg' }, 'changed'), head.map((_, i) => { const cell = c.cells.find(x => x.col === i); return cell ? h('td', { class: 'ut-hl-chg', title: `was: ${cell.from}` }, h('del', {}, cell.from), ' → ', cell.to) : h('td', {}, c.row[i] ?? ''); }))); else tb.append(h('tr', {}, h('td', { class: c.type === 'added' ? 'ut-hl-add' : 'ut-hl-del' }, c.type), head.map((_, i) => h('td', { class: c.type === 'added' ? 'ut-hl-add' : 'ut-hl-del' }, c.row[i] ?? '')))); }
      out.replaceChildren(r.changes.length ? h('div', { class: 'ut-tablewrap' }, tb) : h('p', { class: 'pt-notice' }, 'The two tables are identical.')); }
    const pick = (ta, label) => filePicker({ accept: '.csv,.tsv,.txt', label, onFiles: async ([f]) => { const bt = await readBytes(f); ta.value = decodeBytes(bt, guessEncoding(bt)); fillKeys(); run(); } });
    ui.append(h('div', { class: 'ut-options' }, hdr, field('Match rows', key)), h('div', { class: 'ut-io' }, h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, 'Original'), pick(a, t('openFile'))), a), h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, 'Changed'), pick(b, t('openFile'))), b)),
      h('div', { class: 'ut-actions' }, btn(t('sample'), () => { a.value = 'id,name,city\n1,Ann,Berlin\n2,Bo,Paris\n3,Cleo,Rome'; b.value = 'id,name,city\n1,Ann,Berlin\n2,Bo,Lyon\n4,Dev,Oslo'; fillKeys(); run(); }, 'ghost'), btn('Download report (CSV)', () => last && download('differences.csv', toCSV([['status', 'key', 'column', 'from', 'to'], ...last.changes.flatMap(c => c.type === 'changed' ? c.cells.map(x => ['changed', c.key, x.name, x.from, x.to]) : [[c.type, c.key, '', '', '']])])))), stats, out);
    a.addEventListener('change', fillKeys); a.addEventListener('blur', fillKeys);
  },
  'csv-to-sql'(root) {
    tableTool(root, { header: true, text: true, sample: "id,name,price,active,added\n1,O'Brien,9.5,true,2024-01-05\n2,Müller,10,false,2024-02-11", outputLabel: 'SQL', filename: 'import.sql',
      options: [{ key: 'table', label: 'Table name', type: 'text', value: 'my_table' }, { key: 'dialect', label: 'Database', type: 'select', value: 'postgres', choices: [['postgres', 'PostgreSQL'], ['mysql', 'MySQL / MariaDB'], ['sqlite', 'SQLite'], ['mssql', 'SQL Server']] }, { key: 'mode', label: 'Statement', type: 'select', value: 'insert', choices: [['insert', 'INSERT'], ['update', 'UPDATE (needs a key column)']] },
        { key: 'key', label: 'Key column for UPDATE', type: 'col', value: 0 }, { key: 'create', label: 'Add CREATE TABLE (types guessed from data)', type: 'check', value: true }, { key: 'batch', label: 'Rows per INSERT', type: 'number', value: 100, min: 1 }, { key: 'nulls', label: 'Empty cells become NULL', type: 'check', value: true }],
      run: (rows, o) => ({ text: D.toSQL(rows, { table: o.table || 'my_table', dialect: o.dialect, mode: o.mode, key: [o.key], batch: o.batch || 100, create: o.create, header: o.header, emptyNull: o.nulls }), mime: 'application/sql', filename: `${o.table || 'import'}.sql`, notes: ['Values are escaped, but review generated SQL before running it on a production database.'] }) });
  },
  'markdown-table-formatter'(root) {
    textTool(root, { options: [{ key: 'compact', label: 'Compact (no padding)', type: 'check', value: false }, { key: 'align', label: 'Force alignment', type: 'select', value: '', choices: [['', 'Keep as written'], ['left', 'Left'], ['center', 'Centre'], ['right', 'Right']] }],
      sample: '|Name|Qty|Notes|\n|:-|-:|:-:|\n|Pen|10|blue|\n|Notebook|3|A5, lined|', inputLabel: 'Messy Markdown table', outputLabel: 'Aligned table', filename: 'table.md', run: (s, o) => D.formatMarkdownTable(s, { compact: o.compact, align: o.align || null }) });
  },
  'excel-number-format-tester'(root) {
    const ui = wrap(root); const PRESETS = [['#,##0.00', 'Thousands, 2 decimals'], ['0.0%', 'Percent'], ['$#,##0.00', 'Dollars'], ['_($* #,##0_);_($* (#,##0);_("-"_);_(@_)', 'Accounting'], ['0.00E+00', 'Scientific'], ['000000', 'Leading zeros'], ['#,##0,"K"', 'Thousands as K'], ['0.0,,"M"', 'Millions as M'], ['[>=1000000]0.0,,"M";[>=1000]0.0,"K";0', 'Auto K / M'], ['yyyy-mm-dd', 'ISO date'], ['dddd, mmmm d, yyyy', 'Long date'], ['hh:mm:ss', 'Time'], ['[h]:mm', 'Hours over 24'], ['0.00;[Red]-0.00', 'Negative in red'], ['+0;-0;0', 'Always show sign'], ['@" (text)"', 'Text suffix']];
    const fmt = textInput(PRESETS[3][0], { onInput: run, 'aria-label': 'Number format' }); const preset = select(PRESETS.map(([f, l]) => [f, l]), PRESETS[3][0], { onChange: () => { fmt.value = preset.value; run(); } });
    const vals = area({ rows: 6, onInput: run, 'aria-label': 'Test values' }); vals.value = '1234.5\n-1234.5\n0\n0.256\n45231\n1234567\ntext'; const out = h('div');
    function run() { const rows = [['Value', 'Displayed as']]; for (const l of vals.value.split(/\r?\n/)) { if (l.trim() === '') continue; const n = Number(l); let r; try { r = formatValue(Number.isFinite(n) && l.trim() !== '' ? n : l, fmt.value); } catch (e) { r = '⚠ ' + e.message; } rows.push([l, r]); } out.replaceChildren(table(rows)); }
    ui.append(h('div', { class: 'ut-options' }, field('Format code', fmt, 'Same codes as Format Cells → Custom'), field('Presets', preset)), h('div', { class: 'ut-col' }, h('strong', {}, 'Test values (one per line)'), vals), out,
      h('p', { class: 'pt-hint' }, 'Supports 0 # ? placeholders, thousands separators, scaling commas, %, E+, text in quotes, _ and * spacing, up to four sections, [>100] conditions, colours (ignored), dates and times. Fractions (# ?/?) are not supported.')); run();
  },
  'csv-to-geojson'(root) {
    tableTool(root, { header: true, text: true, sample: 'name,latitude,longitude,type\nBrandenburg Gate,52.5163,13.3777,landmark\nEiffel Tower,"48,8584","2,2945",landmark\nBroken,abc,1,x', outputLabel: 'GeoJSON', filename: 'points.geojson',
      options: [{ key: 'lat', label: 'Latitude column', type: 'col', value: 1 }, { key: 'lon', label: 'Longitude column', type: 'col', value: 2 }, { key: 'pretty', label: 'Pretty print', type: 'check', value: true }],
      run: (rows, o) => { const r = D.toGeoJSON(rows, { lat: o.lat, lon: o.lon, header: o.header }); return { text: JSON.stringify(r.geojson, null, o.pretty ? 2 : 0), mime: 'application/geo+json', stats: [['Points', r.geojson.features.length], ['Skipped', r.skipped.length]], notes: r.skipped.length ? [`Skipped ${r.skipped.length} row(s) with missing or invalid coordinates: ${r.skipped.slice(0, 5).map(s => `row ${s.row} ("${s.lat}", "${s.lon}")`).join('; ')}${r.skipped.length > 5 ? '…' : ''}. GeoJSON order is [longitude, latitude].`] : ['GeoJSON order is [longitude, latitude]. Paste the result into geojson.io or any GIS tool.'] }; } });
  },
  'reorder-csv-columns'(root) {
    const ui = wrap(root); const input = area({ rows: 6, placeholder: 'Paste CSV here', onInput: debounce(load, 150) }); let rows = [], order = [], delim = ','; const cards = h('div', { class: 'ut-colcards' }), prev = h('div'), hdr = check('First row is a header', true, { onChange: load }); let dragIdx = null;
    function load() { delim = detectDelimiter(input.value); rows = input.value.trim() ? pad(parseCSV(input.value, delim)) : []; order = rows[0] ? rows[0].map((_, i) => ({ i, on: true })) : []; draw(); }
    function draw() { cards.replaceChildren(...order.map((c, p) => { const name = hdr.input.checked ? rows[0][c.i] : `Column ${c.i + 1}`; const card = h('div', { class: 'ut-colcard', draggable: 'true' }, check(name || `Column ${c.i + 1}`, c.on, { onChange: e => { c.on = e.target.checked; render(); } }), h('button', { type: 'button', class: 's-btn s-btn--icon', 'aria-label': 'Move left', onClick: () => move(p, p - 1) }, '←'), h('button', { type: 'button', class: 's-btn s-btn--icon', 'aria-label': 'Move right', onClick: () => move(p, p + 1) }, '→'));
      card.addEventListener('dragstart', () => { dragIdx = p; card.classList.add('is-drag'); }); card.addEventListener('dragend', () => card.classList.remove('is-drag')); card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('is-over'); }); card.addEventListener('dragleave', () => card.classList.remove('is-over')); card.addEventListener('drop', e => { e.preventDefault(); move(dragIdx, p); }); return card; })); render(); }
    function move(a, b) { if (b < 0 || b >= order.length || a == null) return; const [x] = order.splice(a, 1); order.splice(b, 0, x); draw(); }
    function result() { const keep = order.filter(c => c.on); return rows.map(r => keep.map(c => r[c.i] ?? '')); }
    function render() { prev.replaceChildren(rows.length ? table(result(), { header: hdr.input.checked, max: 100 }) : ''); }
    ui.append(h('div', { class: 'ut-options' }, hdr), h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, t('input')), btn(t('sample'), () => { input.value = SAMPLE; load(); }, 'ghost')), input), h('strong', {}, 'Drag columns, use the arrows, untick to delete'), cards, h('div', { class: 'ut-actions' }, btn(t('copy'), () => copyText(toCSV(result(), { delimiter: ',' })), 'primary'), btn('Copy for Excel (tab)', () => copyText(toCSV(result(), { delimiter: '\t' }))), btn(t('download'), () => download('columns.csv', toCSV(result())))), prev);
  },
  'zscore-normalizer'(root) {
    tableTool(root, { header: true, sample: 'name,height,weight\nA,170,65\nB,180,80\nC,165,55\nD,190,95', filename: 'normalized.csv',
      options: [{ key: 'cols', label: 'Numeric columns to normalise', type: 'cols', value: [1, 2] }, { key: 'm', label: 'Method', type: 'select', value: 'zscore', choices: [['zscore', 'Z-score (mean 0, standard deviation 1)'], ['minmax', 'Min–max scaling (0 to 1)'], ['maxabs', 'Max-abs scaling (−1 to 1)']] }, { key: 'sample', label: 'Sample standard deviation (n−1)', type: 'check', value: true }, { key: 'dec', label: 'Decimals', type: 'number', value: 4, min: 0, max: 12 }],
      run: (rows, o) => { const r = D.normalizeColumns(rows, { columns: o.cols, method: o.m, header: o.header, decimals: o.dec, sample: o.sample }); return { rows: r.rows, notes: r.stats.map(s => `${o.header ? rows[0][s.col] : 'Column ' + (s.col + 1)}: n=${s.n}, mean=${fmtNum(s.mean, 4)}, SD=${fmtNum(s.sd, 4)}, min=${s.min}, max=${s.max}`) }; } });
  },
  'phone-number-formatter'(root) {
    const countries = Object.entries(D.COUNTRIES).map(([c, [cc, n]]) => [c, `${n} (+${cc})`]);
    tableTool(root, { header: true, sample: 'name,phone\nAnn,(415) 555-0132\nBo,+49 (0)30 1234567\nCleo,0044 20 7946 0958\nDev,12345', filename: 'phones.csv',
      options: [{ key: 'col', label: 'Phone column', type: 'col', value: 1 }, { key: 'cc', label: 'Default country (for numbers without +)', type: 'select', value: 'US', choices: countries }, { key: 'style', label: 'Output', type: 'select', value: 'e164', choices: [['e164', 'E.164  +14155550132'], ['international', 'International  +1 415 555 0132'], ['national', 'National (US/CA only)'], ['digits', 'Digits only']] }, { key: 'flag', label: 'Add a "valid" column', type: 'check', value: true }],
      run: (rows, o) => { let bad = 0; const out = rows.map((r, i) => { if (o.header && i === 0) return o.flag ? [...r, 'phone_valid'] : r; const res = D.normalizePhone(r[o.col], { country: o.cc, style: o.style }); if (!res.ok && r[o.col]) bad++; const n = [...r]; n[o.col] = res.value; return o.flag ? [...n, res.ok ? 'yes' : (r[o.col] ? `no (${res.reason})` : '')] : n; });
        return { rows: out, stats: [['Invalid', bad]], notes: ['Formatting follows common numbering rules and checks length only. It does not confirm that a number is in service.'] }; } });
  },
  'fill-blank-cells'(root) {
    tableTool(root, { header: true, sample: 'month,sales,region\nJan,100,North\nFeb,,\nMar,140,South\nApr,,', filename: 'filled.csv',
      options: [{ key: 'mode', label: 'Fill with', type: 'select', value: 'previous', choices: [['previous', 'Value from the cell above'], ['next', 'Value from the cell below'], ['value', 'A fixed value'], ['zero', 'Zero'], ['average', 'Column average (numbers)'], ['median', 'Column median (numbers)'], ['most', 'Most frequent value'], ['min', 'Column minimum'], ['max', 'Column maximum']] }, { key: 'value', label: 'Fixed value', type: 'text', value: 'N/A' }, { key: 'cols', label: 'Columns to fill', type: 'cols', value: 'all' }],
      run: (rows, o) => { const r = D.fillBlanks(rows, { mode: o.mode, value: o.value, columns: o.cols, header: o.header }); return { rows: r.rows, stats: [['Cells filled', r.filled]] }; } });
  },
  'excel-formula-formatter'(root) {
    textTool(root, { options: [{ key: 'w', label: 'Break lines longer than', type: 'number', value: 60, min: 20, max: 200 }, { key: 'i', label: 'Indent (spaces)', type: 'number', value: 2, min: 1, max: 8 }],
      sample: '=IFERROR(INDEX(Sheet2!$B$2:$B$500,MATCH(1,(Sheet2!$A$2:$A$500=A2)*(Sheet2!$C$2:$C$500=B2),0)),IF(ISBLANK(A2),"",VLOOKUP(A2,Sheet3!$A$1:$D$900,4,FALSE)))', inputLabel: 'Formula', outputLabel: 'Formatted formula', run: (s, o) => F.formatFormula(s, { width: o.w, indent: o.i }) });
  },
  'address-parser'(root) {
    tableTool(root, { header: false, sample: '123 Main St Apt 4B, Springfield, IL 62704\nHauptstraße 12a, 10115 Berlin\n10 Downing Street, London, SW1A 2AA\n742 Evergreen Terrace, Springfield, OR 97477-1234, USA', inputLabel: 'Addresses (one per line)', placeholder: 'One address per line', filename: 'addresses.csv', outDelim: 'comma',
      parse: text => text.split(/\r?\n/).filter(l => l.trim()).map(l => [l.trim()]),
      run: rows => { const out = [['original', 'street', 'number', 'unit', 'city', 'state', 'zip', 'country', 'format']]; let weak = 0; for (const [l] of rows) { const a = D.parseAddress(l); if (a.format === 'unknown') weak++; out.push([l, a.street, a.number, a.unit, a.city, a.state, a.zip, a.country, a.format]); } return { rows: out, stats: [['Not recognised', weak]], notes: ['Works for US, UK and German-style addresses. Check the "format" column: "unknown" means the line was only split at commas.'] }; },
      options: [], delimiterless: true });
  },
  'currency-normalizer'(root) {
    tableTool(root, { header: true, sample: 'item,price\nA,"$1,234.56"\nB,"1.234,56 €"\nC,(500.00)\nD,"CHF 1\'234.50"\nE,"12,5 zł"\nF,n/a', filename: 'clean.csv',
      options: [{ key: 'cols', label: 'Columns with amounts', type: 'cols', value: [1] }, { key: 'hint', label: 'A lone comma or dot with 3 digits after it, like 1,234', type: 'select', value: 'auto', choices: [['auto', 'Treat as thousands separator'], ['us', 'US style (comma = thousands, dot = decimal)'], ['eu', 'European style (dot = thousands, comma = decimal)']] }, { key: 'dec', label: 'Round to decimals (-1 = keep)', type: 'number', value: -1, min: -1, max: 8 }, { key: 'cur', label: 'Add a currency column', type: 'check', value: false }],
      run: (rows, o) => { let bad = []; const out = rows.map((r, ri) => { if (o.header && ri === 0) return o.cur ? [...r, 'currency'] : r; const n = [...r]; let cur = ''; for (const c of o.cols) { const p = D.parseMoney(r[c], { hint: o.hint === 'auto' ? 'auto' : o.hint }); if (!p) { if (String(r[c] ?? '').trim()) bad.push(`row ${ri + 1}: "${r[c]}"`); n[c] = ''; continue; } n[c] = String(o.dec >= 0 ? Math.round(p.value * 10 ** o.dec) / 10 ** o.dec : p.value); cur ||= p.currency; } return o.cur ? [...n, cur] : n; });
        return { rows: out, stats: [['Not a number', bad.length]], notes: bad.length ? [`Could not read: ${bad.slice(0, 6).join('; ')}${bad.length > 6 ? '…' : ''}`] : [] }; } });
  },
  'percentage-change-calculator'(root) {
    tableTool(root, { header: true, sample: 'product,2023,2024\nA,100,125\nB,80,60\nC,0,15\nD,50,50', filename: 'percent-change.csv',
      options: [{ key: 'from', label: 'Old value column', type: 'col', value: 1 }, { key: 'to', label: 'New value column', type: 'col', value: 2 }, { key: 'dec', label: 'Decimals', type: 'number', value: 1, min: 0, max: 8 }, { key: 'sfx', label: 'Add a % sign', type: 'check', value: false }],
      run: (rows, o) => ({ rows: D.percentChange(rows, { from: o.from, to: o.to, decimals: o.dec, suffix: o.sfx, header: o.header }), notes: ['Formula: (new − old) ÷ |old| × 100. When the old value is 0 the change is undefined and shown as n/a.'] }) });
  },
  'trim-whitespace-csv'(root) {
    tableTool(root, { header: undefined, sample: 'name,city\n"  Ann  ","Berlin "\n"Bo​","  New   York"', filename: 'trimmed.csv',
      options: [{ key: 'inner', label: 'Collapse repeated spaces inside cells', type: 'check', value: false }, { key: 'nbsp', label: 'Treat no-break spaces as spaces', type: 'check', value: true }, { key: 'inv', label: 'Remove zero-width characters', type: 'check', value: true }],
      run: (rows, o) => { const r = D.trimCells(rows, { inner: o.inner, nbsp: o.nbsp, invisible: o.inv }); return { rows: r.rows, stats: [['Cells changed', r.changed]] }; } });
  },
  'csv-header-sanitizer'(root) {
    tableTool(root, { header: true, sample: 'First Name,Zip/Postal Code,2024 Sales (€),% Change,userID,Name,Name\nAnn,10115,100,5,1,x,y', filename: 'sanitized.csv',
      options: [{ key: 'style', label: 'Style', type: 'select', value: 'snake', choices: [['snake', 'snake_case'], ['camel', 'camelCase'], ['kebab', 'kebab-case']] }, { key: 'max', label: 'Max length (0 = none)', type: 'number', value: 0, min: 0, max: 128 }],
      run: (rows, o) => { const names = D.sanitizeHeaders(rows[0], { style: o.style, maxLen: o.max }); return { rows: [names, ...rows.slice(1)], notes: [`Renamed: ${rows[0].map((x, i) => x === names[i] ? null : `"${x}" → ${names[i]}`).filter(Boolean).join(', ') || 'nothing needed changing'}`] }; } });
  },
  'merge-csv-files'(root) {
    const ui = wrap(root); let files = []; const list = h('div', { class: 'ut-checks' }), out = h('div'), stats = h('div', { class: 'ut-stats' }), mode = select([['by-name', 'Match columns by header name'], ['strict', 'Files have identical headers'], ['stack', 'No headers: just stack rows']], 'by-name', { onChange: run }); let merged = []; const notes = h('div', { class: 'ut-notes' }); const addName = check('Add a "source_file" column', false, { onChange: run });
    const drop = h('div', { class: 'ut-drop' }, h('p', {}, 'Drop several CSV files here, or'), filePicker({ accept: '.csv,.tsv,.txt', multiple: true, label: 'Choose CSV files', zone: null, onFiles: add }));
    async function add(fs) { for (const f of fs) { const b = await readBytes(f); const text = decodeBytes(b, guessEncoding(b)); files.push({ name: f.name, rows: pad(parseCSV(text, detectDelimiter(text))) }); } run(); }
    ['dragover', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop') add([...e.dataTransfer.files]); }));
    function run() { list.replaceChildren(...files.map((f, i) => h('span', { class: 'ut-colcard' }, `${f.name} · ${f.rows.length} rows`, h('button', { type: 'button', class: 's-btn s-btn--icon', 'aria-label': 'Remove', onClick: () => { files.splice(i, 1); run(); } }, '×')))); if (!files.length) { out.replaceChildren(); stats.replaceChildren(); notes.replaceChildren(); merged = []; return; }
      const tables = files.map(f => addName.input.checked ? f.rows.map((r, i) => [...r, i === 0 && mode.value !== 'stack' ? 'source_file' : f.name]) : f.rows); const r = D.mergeTables(tables, { header: mode.value !== 'stack', mode: mode.value }); merged = r.rows;
      stats.replaceChildren(stat('Files', files.length), stat('Rows', Math.max(0, merged.length - (mode.value === 'stack' ? 0 : 1))), stat('Columns', merged[0]?.length || 0)); notes.replaceChildren(...r.warnings.map(w => h('p', { class: 'pt-notice' }, w))); out.replaceChildren(table(merged, { max: 200 })); }
    ui.append(drop, list, h('div', { class: 'ut-options' }, field('How to combine', mode), addName), stats, notes, h('div', { class: 'ut-actions' }, btn(t('download'), () => download('merged.csv', toCSV(merged)), 'primary'), btn(t('copy'), () => copyText(toCSV(merged))), btn('Clear files', () => { files = []; run(); }, 'ghost'), btn(t('sample'), () => { files = [{ name: 'jan.csv', rows: parseCSV('id,amount\n1,10\n2,20') }, { name: 'feb.csv', rows: parseCSV('id,amount,note\n3,30,late') }]; run(); }, 'ghost')), out);
  },
  'sample-size-calculator'(root) {
    const ui = wrap(root); const pop = numInput('', { min: 1, placeholder: 'Leave empty if very large', onInput: run }), conf = select([['80', '80%'], ['85', '85%'], ['90', '90%'], ['95', '95%'], ['98', '98%'], ['99', '99%'], ['99.9', '99.9%']], '95', { onChange: run }), margin = numInput(5, { min: 0.1, max: 50, step: 0.1, onInput: run }), prop = numInput(50, { min: 1, max: 99, onInput: run }); const out = h('div', { class: 'ut-cards' }), note = h('p', { class: 'pt-hint' });
    function run() { const r = D.sampleSize({ population: pop.value ? Number(pop.value) : Infinity, confidence: Number(conf.value), margin: Number(margin.value), proportion: Number(prop.value) }); out.replaceChildren(h('div', { class: 'ut-card' }, h('span', {}, 'Required sample size'), h('strong', {}, fmtNum(r.n, 0))), h('div', { class: 'ut-card' }, h('span', {}, 'Without population correction'), h('strong', {}, fmtNum(r.n0, 0))), h('div', { class: 'ut-card' }, h('span', {}, 'z-score'), h('strong', {}, r.z.toFixed(3))));
      note.textContent = `To estimate a proportion within ±${margin.value} percentage points at ${conf.value}% confidence${pop.value ? ` in a population of ${fmtNum(Number(pop.value), 0)}` : ''}, survey ${fmtNum(r.n, 0)} people (assuming ${prop.value}% expected proportion; 50% is the most cautious choice).`; }
    ui.append(h('div', { class: 'ut-options' }, field('Population size', pop), field('Confidence level', conf), field('Margin of error (± %)', margin), field('Expected proportion (%)', prop, '50 = most cautious')), out, note); run();
  },
  'csv-encoding-fixer'(root) {
    const ui = wrap(root); let bytes = null; const enc = select([['auto', 'Detect automatically'], ...ENCODINGS.map(e => [e, e])], 'auto', { onChange: run }), fixMoji = check('Also repair text that is already garbled (MÃ¼ller → Müller)', true, { onChange: run }), bom = check('Save with UTF-8 BOM (for Excel)', true); const text = area({ rows: 10, placeholder: 'Open a file, or paste garbled text (e.g. MÃ¼ller, GrÃ¶ÃŸe)', onInput: () => { bytes = null; run(); } }); const out = area({ readonly: true, rows: 10, 'aria-label': 'Fixed text' }), stats = h('div', { class: 'ut-stats' });
    function run() { let s; if (bytes) { const e = enc.value === 'auto' ? guessEncoding(bytes) : enc.value; s = decodeBytes(bytes, e); stats.replaceChildren(stat('Encoding used', e), stat('Size', fmtNum(bytes.length, 0) + ' bytes')); } else { s = text.value; stats.replaceChildren(); } const fixed = fixMoji.input.checked ? fixMojibake(s) : s; out.value = fixed; if (fixed !== s) stats.append(stat('Garbled text repaired', 'yes')); if (bytes) text.value = s.slice(0, 20000); }
    ui.append(h('div', { class: 'ut-options' }, field('File encoding', enc), fixMoji, bom), h('div', { class: 'ut-actions' }, filePicker({ accept: '*/*', label: 'Open file', onFiles: async ([f]) => { bytes = await readBytes(f); run(); } }), btn(t('sample'), () => { bytes = null; text.value = 'MÃ¼ller; GrÃ¶ÃŸe; cafÃ© â€“ naÃ¯ve; ZaÅ¼Ã³Å‚Ä‡'; run(); }, 'ghost')), h('div', { class: 'ut-io' }, h('div', { class: 'ut-col' }, h('strong', {}, 'Original (as read)'), text), h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, 'Fixed (UTF-8)')), out)), stats,
      h('div', { class: 'ut-actions' }, btn(t('copy'), () => copyText(out.value), 'primary'), btn('Download UTF-8 file', () => download('fixed.csv', (bom.input.checked ? '﻿' : '') + out.value, 'text/csv;charset=utf-8')))); run();
  },
  'excel-formula-translator'(root) {
    const names = Object.entries(F.SHEET_LANG_NAMES); const ui = wrap(root);
    const from = select(names, 'en', { onChange: run }), to = select(names, 'de', { onChange: run }); const input = area({ rows: 5, placeholder: '=IF(A1>0.5,SUM(B1:B5),"no")', onInput: run }); const out = area({ readonly: true, rows: 5, 'aria-label': 'Translated formula' }), note = h('div', { class: 'ut-notes' });
    function run() { const lines = input.value.split(/\r?\n/); const res = lines.map(l => l.trim() ? F.translateFormula(l, from.value, to.value) : { formula: '', unknown: [] }); out.value = res.map(r => r.formula).join('\n'); const unk = [...new Set(res.flatMap(r => r.unknown))]; note.replaceChildren(...(unk.length ? [h('p', { class: 'pt-notice' }, `Not translated (unknown or custom function): ${unk.join(', ')}`)] : [])); }
    ui.append(h('div', { class: 'ut-options' }, field('Formula is written in', from), field('Translate to', to), btn('⇄ Swap', () => { [from.value, to.value] = [to.value, from.value]; input.value = out.value; run(); }, 'ghost')), h('div', { class: 'ut-io' }, h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, 'Formula'), btn(t('sample'), () => { input.value = '=IFERROR(VLOOKUP(A2,Sheet2!$A$1:$C$100,3,FALSE),"n/a")\n=SUMIFS(C:C,A:A,">"&0.5,B:B,"x")'; run(); }, 'ghost')), input), h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, 'Translated'), btn(t('copy'), () => copyText(out.value), 'primary')), out)), note,
      h('p', { class: 'pt-hint' }, 'Function names, argument separators (, or ;) and decimal marks are converted. Google Sheets uses the English names with the separators of your locale. Array constants {…} and text in quotes are left untouched.')); run();
  },
  'unpivot-table'(root) {
    tableTool(root, { header: true, sample: 'product,Jan,Feb,Mar\nA,10,12,\nB,7,,9', filename: 'unpivoted.csv',
      options: [{ key: 'ids', label: 'Columns to keep as identifiers', type: 'cols', value: [0] }, { key: 'vn', label: 'Name of the new "attribute" column', type: 'text', value: 'month' }, { key: 'vv', label: 'Name of the new "value" column', type: 'text', value: 'amount' }, { key: 'skip', label: 'Skip empty cells', type: 'check', value: true }],
      run: (rows, o) => ({ rows: D.unpivot(rows, { idCols: o.ids, varName: o.vn || 'attribute', valName: o.vv || 'value', skipEmpty: o.skip, header: o.header }) }) });
  },
  async 'csv-viewer'(root) {
    const ui = wrap(root); const ROW = 28, MAXH = 24e6; let worker, total = 0, header = [], cache = new Map(), pending = new Set(), hits = null, view = null, reqId = 0, scale = 1, colCount = 0;
    const status = h('div', { class: 'ut-stats' }), prog = h('div', { class: 'ut-bar' }, h('i', { style: { width: '0%' } })), q = textInput('', { placeholder: 'Search all columns…', 'aria-label': 'Search' }), err = h('p', { class: 'pt-drop__error', role: 'alert', hidden: true });
    const grid = h('div', { class: 'ut-vgrid', tabindex: '0', hidden: true }); const space = h('div', { class: 'ut-vgrid__space' }); const headRow = h('div', { class: 'ut-vgrid__row ut-vgrid__head', style: { top: '0', position: 'sticky' } }); grid.append(headRow, space);
    const drop = h('div', { class: 'ut-drop' }, h('p', {}, 'Drop a CSV file of any size here, or'), filePicker({ accept: '.csv,.tsv,.txt', label: 'Choose a CSV file', onFiles: ([f]) => open(f) }), h('p', { class: 'pt-hint' }, 'The file is indexed in a background thread and only the rows you scroll to are read, so 200 MB+ files stay responsive.'));
    ['dragover', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' && e.dataTransfer.files[0]) open(e.dataTransfer.files[0]); }));
    function open(f) {
      worker?.terminate(); worker = new Worker(new URL('./csv-worker.js', import.meta.url), { type: 'module' }); cache.clear(); pending.clear(); hits = null; err.hidden = true; grid.hidden = true; q.value = '';
      status.replaceChildren(stat('File', `${f.name} (${fmtNum(f.size / 1048576, 1)} MB)`), stat('Status', 'Indexing…'));
      worker.onmessage = ({ data: m }) => {
        if (m.type === 'progress') { prog.firstChild.style.width = Math.min(100, m.bytes / m.size * 100) + '%'; status.replaceChildren(stat('File', f.name), stat('Rows found so far', fmtNum(m.rows, 0))); }
        else if (m.type === 'ready') { total = m.rows; header = m.header; colCount = header.length; prog.firstChild.style.width = '100%'; status.replaceChildren(stat('File', f.name), stat('Rows', fmtNum(Math.max(0, total - 1), 0)), stat('Columns', colCount), stat('Separator', ({ ',': 'comma', ';': 'semicolon', '\t': 'tab', '|': 'pipe' })[m.delimiter] || m.delimiter)); start(); }
        else if (m.type === 'rows') { for (let i = 0; i < m.rows.length; i++) cache.set(m.start + i, m.rows[i]); pending.delete(m.start); if (cache.size > 6000) { for (const k of cache.keys()) { cache.delete(k); if (cache.size < 3000) break; } } render(); }
        else if (m.type === 'search-progress') status.lastChild.querySelector('strong').textContent = `${fmtNum(m.hits, 0)} matches (${Math.round(m.done / m.total * 100)}%)`;
        else if (m.type === 'search-done') { hits = m.hits; status.replaceChildren(...[...status.children].slice(0, 4), stat('Matches', fmtNum(hits.length, 0) + (hits.length >= 100000 ? '+' : ''))); resize(); grid.scrollTop = 0; render(); }
        else if (m.type === 'error') { err.textContent = m.message; err.hidden = false; }
      }; worker.postMessage({ type: 'open', file: f });
    }
    function count() { return hits ? hits.length : Math.max(0, total - 1); }
    function resize() { const h2 = count() * ROW; scale = Math.max(1, h2 / MAXH); space.style.height = Math.min(h2, MAXH) + ROW + 'px'; space.style.width = (80 + colCount * 170) + 'px'; headRow.replaceChildren(h('span', {}, '#'), ...header.map(x => h('span', { title: x }, x))); }
    function start() { grid.hidden = false; resize(); render(); }
    function first() { return Math.min(Math.max(0, count() - 1), Math.floor(grid.scrollTop * scale / ROW)); }
    function render() {
      if (grid.hidden) return; const f = first(); const vis = Math.ceil(grid.clientHeight / ROW) + 2; const base = grid.scrollTop; const frag = [];
      const need = []; for (let i = f; i < Math.min(count(), f + vis); i++) { const idx = hits ? hits[i] : i + 1; const row = cache.get(idx); const el = h('div', { class: 'ut-vgrid__row', style: { top: (scale > 1 ? base + (i - f) * ROW + ROW : (i + 1) * ROW) + 'px' } }, h('span', {}, String(idx)), ...(row || []).slice(0, colCount).map(c => h('span', { title: c }, c))); frag.push(el); if (!row) need.push(idx); }
      [...space.querySelectorAll('.ut-vgrid__row')].forEach(n => n.remove()); space.append(...frag);
      if (need.length) { const start = Math.max(1, need[0] - 50); const key = Math.floor(start / 100) * 100; if (!pending.has(key)) { pending.add(key); worker.postMessage({ type: 'rows', start: key, n: 300, id: ++reqId }); } }
    }
    grid.addEventListener('scroll', () => requestAnimationFrame(render));
    const go = debounce(() => { const v = q.value.trim(); if (!worker || !total) return; if (!v) { hits = null; resize(); render(); return; } status.replaceChildren(...[...status.children].slice(0, 4), stat('Searching', '0 matches')); worker.postMessage({ type: 'search', q: v, id: ++reqId }); }, 350);
    q.addEventListener('input', go);
    const gotoRow = numInput('', { min: 1, placeholder: 'Row #', 'aria-label': 'Go to row', style: { width: '110px' } }); gotoRow.addEventListener('change', () => { const n = Number(gotoRow.value); if (n >= 1) { grid.scrollTop = (n - 1) * ROW / scale; render(); } });
    ui.append(drop, prog, status, err, h('div', { class: 'ut-options' }, field('Search', q), field('Go to row', gotoRow)), grid);
  },
};
