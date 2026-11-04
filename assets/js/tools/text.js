// text.js — UI for the text tools. Logic lives in lib/text.js (unit-tested).
import { tr, h, t, textTool, wrap, field, select, check, numInput, textInput, area, btn, copyText, download, stat, table, fmtNum, copyBar, debounce } from './kit.js';
import * as T from './lib/text.js';
import * as TM from './lib/textmore.js';
import * as D from './lib/diff.js';
import { generate } from './lib/dummy.js';

const num = v => fmtNum(v, 0);
const choices = (...a) => a.map(x => Array.isArray(x) ? x : [x, x]);

export const tools = {
  'zero-width-character-remover'(root) {
    textTool(root, {
      options: [{ key: 'nbsp', label: 'Replace no-break spaces with normal spaces', type: 'check', value: true }, { key: 'joiners', label: 'Keep joiners inside emoji (ZWJ)', type: 'check', value: false }],
      sample: 'Order​ ID: A1﻿23‍', inputLabel: 'Text with hidden characters', outputLabel: 'Cleaned text',
      run: (s, o) => { const r = T.cleanInvisible(s, { nbsp: o.nbsp, keepJoiners: o.joiners }); const rows = Object.entries(r.found);
        return { text: r.text, stats: rows.length ? rows.map(([c, n]) => [`U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} ${T.INVISIBLES[c]}`, n]) : [[t('found'), 0]] }; },
    });
  },
  'case-converter'(root) {
    const modes = [['upper', 'UPPER CASE'], ['lower', 'lower case'], ['title', 'Title Case'], ['sentence', 'Sentence case'], ['capitalize', 'Capitalize Each Word'], ['camel', 'camelCase'], ['pascal', 'PascalCase'], ['snake', 'snake_case'], ['constant', 'CONSTANT_CASE'], ['kebab', 'kebab-case'], ['dot', 'dot.case'], ['alternating', 'aLtErNaTiNg'], ['inverse', 'iNVERSE']];
    textTool(root, { options: [{ key: 'mode', label: 'Convert to', type: 'select', choices: modes, value: 'title' }], sample: 'the quick brown fox jumps over the lazy dog', run: (s, o) => T.convertCase(s, o.mode) });
  },
  'remove-duplicate-lines'(root) {
    textTool(root, {
      options: [{ key: 'ci', label: 'Ignore upper/lower case', type: 'check', value: false }, { key: 'trim', label: 'Trim spaces around lines', type: 'check', value: true }, { key: 'empty', label: 'Drop empty lines', type: 'check', value: true },
        { key: 'sort', label: 'Order', type: 'select', value: 'first', choices: [['first', 'Keep original order'], ['count', 'Most frequent first'], ['alpha', 'A–Z']] }, { key: 'counts', label: 'Show how often each line occurred', type: 'check', value: false }],
      sample: 'apple\nbanana\nApple\napple\ncherry\nbanana', outputLabel: 'Unique lines',
      run: (s, o) => { const r = T.dedupe(s, { ignoreCase: o.ci, trim: o.trim, dropEmpty: o.empty, sortBy: o.sort });
        return { text: r.items.map(i => o.counts ? `${i.count}\t${i.line}` : i.line).join('\n'), stats: [[t('lines'), num(r.total)], ['Unique', num(r.unique)], ['Removed', num(r.removed)]] }; },
    });
  },
  'list-to-comma-separated'(root) {
    textTool(root, {
      options: [{ key: 'from', label: 'Input separator', type: 'select', value: 'newline', choices: choices('newline', 'comma', 'semicolon', 'tab', 'space', 'pipe') },
        { key: 'to', label: 'Output separator', type: 'select', value: 'comma-space', choices: choices('comma', 'comma-space', 'newline', 'semicolon', 'tab', 'space', 'pipe') },
        { key: 'quote', label: 'Wrap each item in', type: 'select', value: 'none', choices: [['none', 'nothing'], ['single', "'single quotes'"], ['double', '"double quotes"'], ['backtick', '`backticks`']] },
        { key: 'wrap', label: 'Wrap the result as', type: 'select', value: 'none', choices: [['none', 'plain text'], ['array', 'array [ … ]'], ['sql', 'SQL list ( … )']] }],
      sample: 'red\ngreen\nblue', run: (s, o) => T.delimiterConvert(s, o),
    });
  },
  'regex-extractor'(root) {
    const keys = Object.keys(T.PATTERNS);
    textTool(root, {
      options: [{ key: 'kind', label: 'Find', type: 'select', value: 'email', choices: [...keys.map(k => [k, T.PATTERNS[k].label]), ['custom', 'Custom regular expression…']] },
        { key: 'custom', label: 'Custom pattern (JavaScript regex)', type: 'text', placeholder: '\\b[A-Z]{3}-\\d+\\b' }, { key: 'unique', label: 'Remove duplicates', type: 'check', value: true }],
      sample: 'Ping ann@example.com or +49 30 1234567. Ticket: 123e4567-e89b-12d3-a456-426614174000, server 10.0.0.12, see https://example.com/a.',
      run: (s, o) => { if (o.kind === 'custom' && !o.custom) return { text: '', stats: [] }; const r = T.extract(s, o.kind, { unique: o.unique, custom: o.custom }); return { text: r.items.join('\n'), stats: [['Matches', num(r.total)], ['Shown', num(r.items.length)]] }; },
    });
  },
  'text-diff-checker'(root) {
    const ui = wrap(root);
    const a = area({ placeholder: 'Original text', rows: 12, 'aria-label': 'Original' }), b = area({ placeholder: 'Changed text', rows: 12, 'aria-label': 'Changed' });
    const mode = select([['lines', 'Line by line'], ['words', 'Word by word'], ['chars', 'Character by character']], 'lines', { onChange: run });
    const ws = check('Ignore whitespace', false, { onChange: run }), ci = check('Ignore case', false, { onChange: run });
    const out = h('div', { class: 'ut-diff', 'aria-live': 'polite' }), stats = h('div', { class: 'ut-stats' });
    let patch = '';
    function run() {
      out.replaceChildren();
      if (mode.value === 'lines') {
        const ops = D.diffLines(a.value, b.value, { ignoreWhitespace: ws.input.checked, ignoreCase: ci.input.checked });
        patch = D.unifiedPatch(ops.map(o => ({ t: o.t, v: o.t === 'eq' ? o.old : o.v })));
        ops.forEach(o => out.append(h('div', { class: `ut-dl ut-dl--${o.t}` }, h('span', { class: 'ut-dl__sign' }, o.t === 'add' ? '+' : o.t === 'del' ? '−' : ' '), h('span', {}, o.v || ' '))));
        const s = D.diffStats(ops); stats.replaceChildren(stat('Added lines', s.added), stat('Removed lines', s.removed), stat('Unchanged', s.same));
      } else {
        const ops = D.diffWords(a.value, b.value, { chars: mode.value === 'chars' }); patch = '';
        const p = h('p', { class: 'ut-dw' }); ops.forEach(o => p.append(o.t === 'eq' ? document.createTextNode(o.v) : h(o.t === 'add' ? 'ins' : 'del', {}, o.v))); out.append(p);
        const s = D.diffStats(ops); stats.replaceChildren(stat('Added', s.added), stat('Removed', s.removed), stat('Unchanged', s.same));
      }
    }
    a.addEventListener('input', debounce(run, 150)); b.addEventListener('input', debounce(run, 150));
    ui.append(h('div', { class: 'ut-options' }, field('Compare', mode), ws, ci),
      h('div', { class: 'ut-io' }, h('div', { class: 'ut-col' }, h('strong', {}, 'Original'), a), h('div', { class: 'ut-col' }, h('strong', {}, 'Changed'), b)),
      h('div', { class: 'ut-actions' }, btn('Swap', () => { [a.value, b.value] = [b.value, a.value]; run(); }), btn('Sample', () => { a.value = tr('Dear team,\nThe launch is on Monday.\nPlease send the slides.\nThanks'); b.value = tr('Dear team,\nThe launch is on Tuesday.\nPlease send the final slides.\nThanks,\nAnn'); run(); }, 'ghost'),
        btn('Copy patch', () => copyText(patch)), btn('Download .patch', () => download('changes.patch', patch))),
      stats, out); run();
  },
  'table-to-markdown'(root) {
    const ui = wrap(root);
    const input = area({ placeholder: 'Paste cells copied from Excel, Google Sheets, CSV or a Markdown table', 'aria-label': 'Table data', onInput: update });
    const fmt = select([['md', 'Markdown table'], ['html', 'HTML table']], 'md', { onChange: update }), al = select([['left', 'Left'], ['center', 'Centre'], ['right', 'Right']], 'left', { onChange: update });
    const dl = select([['auto', 'Auto-detect'], ['tab', 'Tab'], ['comma', 'Comma'], ['semicolon', 'Semicolon'], ['pipe', 'Pipe |'], ['spaces', '2+ spaces']], 'auto', { onChange: update });
    const hd = check('First row is the header', true, { onChange: update }), pretty = check('Align columns in the source', true, { onChange: update });
    const out = area({ readonly: true, 'aria-label': 'Output' }), prev = h('div', { class: 'ut-tablewrap' });
    function update() {
      const rows = T.splitTable(input.value, dl.value); if (!rows.length) { out.value = ''; prev.replaceChildren(); return; }
      out.value = fmt.value === 'md' ? T.tableToMarkdown(rows, { align: al.value, pretty: pretty.input.checked, header: hd.input.checked }) : T.tableToHtml(rows, { header: hd.input.checked });
      prev.replaceChildren(table(rows, { header: hd.input.checked }));
    }
    ui.append(h('div', { class: 'ut-options' }, field('Output', fmt), field('Input separator', dl), field('Alignment', al), hd, pretty),
      h('div', { class: 'ut-io' }, h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, 'Table data'), btn('Sample', () => { input.value = tr('Item\tQty\tPrice\nPen\t10\t1.50\nNotebook\t3\t4.20'); update(); }, 'ghost')), input),
        h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, 'Result'), copyBar(() => out.value, 'table.' + (fmt.value === 'md' ? 'md' : 'html'))), out)), h('strong', {}, 'Preview'), prev);
  },
  'character-counter'(root) {
    const ui = wrap(root); const input = area({ placeholder: t('pasteHere'), rows: 9, 'aria-label': 'Text' });
    const stats = h('div', { class: 'ut-stats' }), limits = h('div', { class: 'ut-limits' });
    function run() {
      const s = input.value, chars = [...s].length, sms = T.smsInfo(s);
      stats.replaceChildren(stat('Characters', num(chars)), stat('Without spaces', num([...s.replace(/\s/g, '')].length)), stat('Words', num(T.wordCount(s))), stat('Sentences', num(T.sentenceCount(s))),
        stat('Lines', num(s ? s.split(/\n/).length : 0)), stat('Visible symbols (graphemes)', num(T.graphemes(s))), stat('UTF-8 bytes', num(T.utf8Bytes(s))));
      limits.replaceChildren(...T.LIMITS.map(([name, max]) => { const pct = Math.min(100, chars / max * 100); const over = chars > max;
        return h('div', { class: `ut-limit${over ? ' is-over' : ''}` }, h('div', { class: 'ut-limit__row' }, h('span', {}, name), h('strong', {}, `${num(chars)} / ${num(max)}`)), h('div', { class: 'ut-bar' }, h('i', { style: { width: pct + '%' } }))); }),
        h('div', { class: `ut-limit${sms.parts > 1 ? ' is-over' : ''}` }, h('div', { class: 'ut-limit__row' }, h('span', {}, `SMS (${sms.gsm ? 'GSM-7' : 'Unicode'}, ${sms.perPart} per part)`), h('strong', {}, `${sms.parts} ${sms.parts === 1 ? 'message' : 'messages'} · ${sms.units} units`)), h('div', { class: 'ut-bar' }, h('i', { style: { width: Math.min(100, sms.units / (sms.parts <= 1 ? sms.perPart : sms.parts * sms.perPart) * 100) + '%' } }))));
    }
    input.addEventListener('input', run); ui.append(input, h('div', { class: 'ut-actions' }, btn(t('clear'), () => { input.value = ''; run(); }, 'ghost')), stats, h('h2', { class: 'ut-h' }, 'Platform limits'), limits); run();
  },
  'speech-time-calculator'(root) {
    const ui = wrap(root); const input = area({ placeholder: 'Paste your speech or script here', rows: 10, 'aria-label': 'Script', onInput: run });
    const custom = numInput(140, { min: 60, max: 300, onInput: run }), pause = numInput(0, { min: 0, max: 10, step: 0.5, onInput: run });
    const out = h('div', { class: 'ut-cards' });
    function run() {
      const s = input.value, w = T.wordCount(s), paras = (s.match(/\n\s*\n/g) || []).length; const extra = Number(pause.value) * paras;
      const card = (label, wpm) => h('div', { class: 'ut-card' }, h('span', {}, `${label} · ${wpm} wpm`), h('strong', {}, T.formatDuration(Math.round(w / wpm * 60 + extra))));
      out.replaceChildren(card('Slow', T.PACES.slow), card('Natural', T.PACES.natural), card('Energetic', T.PACES.energetic), card('Your pace', Number(custom.value) || 140), stat('Words', num(w)));
    }
    ui.append(h('div', { class: 'ut-options' }, field('Your pace (words per minute)', custom), field('Pause per paragraph (seconds)', pause, 'Added after every blank line')), input,
      h('div', { class: 'ut-actions' }, btn('Sample', () => { input.value = Array(4).fill('Good morning everyone. Thank you for joining us today. I would like to walk you through our results for the quarter and what they mean for the year ahead.').join('\n\n'); run(); }, 'ghost')), out); run();
  },
  'dummy-data-generator'(root) {
    const ui = wrap(root); const all = ['name', 'first', 'last', 'email', 'company', 'title', 'phone', 'street', 'city', 'state', 'zip', 'country', 'date', 'amount', 'id'];
    const boxes = all.map(f => Object.assign(check(f, ['name', 'email', 'company', 'phone'].includes(f), { onChange: run }), { f }));
    const loc = select([['en', 'English (US)'], ['de', 'Deutsch (Germany)']], 'en', { onChange: run }), n = numInput(10, { min: 1, max: 1000, onInput: run }), fmt = select(['table', 'CSV', 'JSON'], 'table', { onChange: run });
    const out = h('div'), raw = area({ readonly: true, rows: 8, 'aria-label': 'Generated data' }); let seed = Date.now();
    function run() {
      const fields = boxes.filter(b => b.input.checked).map(b => b.f); if (!fields.length) { out.replaceChildren(); raw.value = ''; return; }
      const rows = generate({ locale: loc.value, count: Math.min(1000, Math.max(1, Number(n.value) || 1)), fields, seed });
      const csv = [fields.join(','), ...rows.map(r => fields.map(f => /[",\n]/.test(r[f]) ? `"${r[f].replaceAll('"', '""')}"` : r[f]).join(','))].join('\n');
      raw.value = fmt.value === 'JSON' ? JSON.stringify(rows, null, 2) : csv; out.replaceChildren(fmt.value === 'table' ? table([fields, ...rows.map(r => fields.map(f => r[f]))], { max: 50 }) : raw);
    }
    ui.append(h('div', { class: 'ut-options' }, field('Language of names', loc), field('How many', n), field('Format', fmt)), h('div', { class: 'ut-checks' }, boxes),
      h('div', { class: 'ut-actions' }, btn('Generate new data', () => { seed = Date.now(); run(); }, 'primary'), btn(t('copy'), () => copyText(raw.value)), btn(t('download'), () => download('dummy-data.' + (fmt.value === 'JSON' ? 'json' : 'csv'), raw.value))),
      out, h('p', { class: 'pt-hint' }, 'Emails use the reserved domain example.com and phone numbers use fictional ranges, so nothing reaches a real inbox or phone.')); run();
  },
  'smart-quotes-to-ascii'(root) {
    textTool(root, { options: [{ key: 'dashes', label: 'Dashes: – → -  and — → --', type: 'check', value: true }, { key: 'ellipsis', label: 'Ellipsis … → ...', type: 'check', value: true }, { key: 'lig', label: 'Ligatures ﬁ ﬂ æ → fi fl ae', type: 'check', value: true }, { key: 'spaces', label: 'Special spaces → normal space, drop zero-width', type: 'check', value: true }, { key: 'bullets', label: 'Bullets • → *', type: 'check', value: false }],
      sample: '“Smart” quotes — it’s a ‘test’… ﬁne text', run: (s, o) => T.normalizeQuotes(s, { dashes: o.dashes, ellipsis: o.ellipsis, ligatures: o.lig, spaces: o.spaces, bullets: o.bullets }) });
  },
  'remove-line-breaks'(root) {
    textTool(root, { options: [{ key: 'para', label: 'Keep paragraph breaks (blank lines)', type: 'check', value: true }, { key: 'hy', label: 'Re-join words split by a hyphen at line end', type: 'check', value: true }, { key: 'bul', label: 'Keep bullet and numbered list items on their own lines', type: 'check', value: true }],
      sample: 'This sentence was copied from a PDF and is broken into\nseveral short lines with hyphen-\nation in the middle.\n\nA new paragraph starts here.', run: (s, o) => T.unwrapLines(s, { keepParagraphs: o.para, fixHyphens: o.hy, bullets: o.bul }) });
  },
  'add-prefix-suffix-to-lines'(root) {
    textTool(root, { options: [{ key: 'prefix', label: 'Text before each line', type: 'text', value: '' }, { key: 'suffix', label: 'Text after each line', type: 'text', value: '' }, { key: 'numbered', label: 'Insert counter wherever {n} appears', type: 'check', value: false },
      { key: 'start', label: 'Counter starts at', type: 'number', value: 1 }, { key: 'pad', label: 'Counter digits (zero padded)', type: 'number', value: 0, min: 0, max: 10 }, { key: 'skip', label: 'Skip empty lines', type: 'check', value: true }],
      sample: 'alpha\nbeta\ngamma', run: (s, o) => T.prefixSuffix(s, { prefix: o.prefix, suffix: o.suffix, numbered: o.numbered, start: o.start, pad: o.pad, skipEmpty: o.skip }) });
  },
  'sort-lines'(root) {
    textTool(root, { options: [{ key: 'mode', label: 'Sort by', type: 'select', value: 'alpha', choices: [['alpha', 'Alphabetical (A–Z)'], ['natural', 'Natural numbers (v2 before v10)'], ['length', 'Line length'], ['number', 'Numeric value in the line']] }, { key: 'rev', label: 'Reverse order', type: 'check', value: false }, { key: 'ci', label: 'Ignore case', type: 'check', value: true }],
      sample: 'file10.txt\nfile2.txt\nFile1.txt\nfile20.txt', run: (s, o) => T.sortLines(s, o.mode, { reverse: o.rev, ignoreCase: o.ci }) });
  },
  'email-extractor'(root) {
    const ui = wrap(root); const input = area({ placeholder: 'Paste any text, HTML source or a mailbox export', rows: 9, onInput: run }); const grp = check('Group by domain', false, { onChange: run }); const out = area({ readonly: true, rows: 9, 'aria-label': 'Emails' }); const stats = h('div', { class: 'ut-stats' });
    function run() { const r = T.extractEmails(input.value); out.value = grp.input.checked ? Object.entries(r.byDomain).map(([d, e]) => `# ${d} (${e.length})\n${e.join('\n')}`).join('\n\n') : r.emails.join('\n'); stats.replaceChildren(stat('Found', num(r.total)), stat('Unique', num(r.emails.length)), stat('Domains', num(Object.keys(r.byDomain).length))); }
    ui.append(h('div', { class: 'ut-options' }, grp), h('div', { class: 'ut-io' }, h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, t('input')), btn(t('sample'), () => { input.value = tr('Contact: Ann <ann@example.com>, BOB@Example.com; sales@shop.example.org.\nCC: ann@example.com'); run(); }, 'ghost')), input), h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, 'Unique emails'), copyBar(() => out.value, 'emails.txt')), out)), stats); run();
  },
  'url-extractor-tracking-remover'(root) {
    const ui = wrap(root); const input = area({ placeholder: 'Paste text with links, or a single messy URL', rows: 9, onInput: run });
    const all = check('Remove the whole query string', false, { onChange: run }), hash = check('Remove #fragments', false, { onChange: run }), mode = select([['clean', 'Clean the links inside my text'], ['list', 'List unique clean URLs only']], 'list', { onChange: run });
    const out = area({ readonly: true, rows: 9 }), stats = h('div', { class: 'ut-stats' });
    function run() {
      const o = { removeAll: all.input.checked, hash: hash.input.checked }; const found = T.extractUrls(input.value, o);
      out.value = mode.value === 'clean' ? T.cleanUrlsInText(input.value, o) : found.map(f => f.url).join('\n');
      const removed = new Set(found.flatMap(f => f.removed)); stats.replaceChildren(stat('URLs found', num(found.length)), stat('With tracking removed', num(found.filter(f => f.removed.length).length)), stat('Parameters stripped', [...removed].join(', ') || '–'));
    }
    ui.append(h('div', { class: 'ut-options' }, field('Output', mode), all, hash), h('div', { class: 'ut-io' }, h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, t('input')), btn(t('sample'), () => { input.value = tr('Read https://example.com/post?id=7&utm_source=news&utm_medium=email&fbclid=IwAR1 and https://example.org/?gclid=abc#top'); run(); }, 'ghost')), input), h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, t('output')), copyBar(() => out.value, 'urls.txt')), out)), stats); run();
  },
  'slug-generator'(root) {
    textTool(root, { options: [{ key: 'sep', label: 'Separator', type: 'select', value: '-', choices: [['-', 'Hyphen -'], ['_', 'Underscore _'], ['', 'None']] }, { key: 'lower', label: 'Lower case', type: 'check', value: true }, { key: 'stop', label: 'Drop small words (a, the, of …)', type: 'check', value: false }, { key: 'max', label: 'Max length (0 = no limit)', type: 'number', value: 0, min: 0 }],
      sample: 'Crème Brûlée & Straße: The 10 Best Ideas for 2025!', inputLabel: 'Titles (one per line)', outputLabel: 'Slugs', run: (s, o) => s.split(/\n/).map(l => T.slugify(l, { sep: o.sep, lower: o.lower, stopWords: o.stop, maxLen: o.max })).join('\n') });
  },
  'rot13-encoder'(root) {
    textTool(root, { options: [{ key: 'shift', label: 'Shift (13 = ROT13, same to encode and decode)', type: 'number', value: 13, min: -25, max: 25 }, { key: 'dig', label: 'Also rotate digits (ROT5)', type: 'check', value: false }], sample: 'Hello, World!', run: (s, o) => T.rot(s, o.shift, { digits: o.dig }) });
  },
  'emoji-remover'(root) {
    textTool(root, { options: [{ key: 'ascii', label: 'Also convert to plain ASCII (café → cafe, drop everything else)', type: 'check', value: false }, { key: 'rep', label: 'Replace with', type: 'text', value: '', placeholder: 'nothing' }],
      sample: 'Great job 👍🏽! See you 🇩🇪 at 9 ☕ — café', run: (s, o) => { const r = T.stripEmoji(s, { asciiOnly: o.ascii, replacement: o.rep }); return { text: r.text, stats: [['Removed', num(r.removed)]] }; } });
  },
  'nato-phonetic-alphabet'(root) {
    textTool(root, { options: [{ key: 'case', label: 'Show lower-case letters in lower case', type: 'check', value: true }], sample: 'Order K7-29 ß', inputLabel: 'Text to spell', outputLabel: 'NATO phonetic spelling', run: (s, o) => T.nato(s, { showCase: o.case }) });
  },
  'shuffle-lines'(root) {
    const tool = textTool(root, { sample: 'Ann\nBen\nCleo\nDev\nEli\nFay', run: s => T.shuffleLines(s), outputLabel: 'Shuffled lines' });
    root.querySelector('.ut').append(h('div', { class: 'ut-actions' }, btn('Shuffle again', () => tool.update(), 'primary')));
  },
  'filter-lines'(root) {
    textTool(root, { options: [{ key: 'q', label: 'Search for', type: 'text', placeholder: 'error' }, { key: 'mode', label: 'Line…', type: 'select', value: 'contains', choices: [['contains', 'contains'], ['starts', 'starts with'], ['ends', 'ends with'], ['equals', 'equals']] }, { key: 'inv', label: 'Keep lines that do NOT match', type: 'check', value: false }, { key: 'ci', label: 'Ignore case', type: 'check', value: true }, { key: 're', label: 'Use regular expression', type: 'check', value: false }],
      sample: 'INFO started\nERROR disk full\nINFO done\nerror retry', run: (s, o) => { const out = T.filterLines(s, o.q, { mode: o.mode, invert: o.inv, ignoreCase: o.ci, regex: o.re }); const n = out ? out.split('\n').length : 0; return { text: out, stats: [['Lines kept', num(n)], ['Of', num(s ? s.split(/\r\n|\r|\n/).length : 0)]] }; } });
  },
  'merge-columns'(root) {
    const ui = wrap(root); const a = area({ placeholder: 'List A (one item per line)', rows: 8, onInput: run }), b = area({ placeholder: 'List B (one item per line)', rows: 8, onInput: run });
    const sep = select([['\t', 'Tab (paste into Excel)'], [', ', 'Comma + space'], [' | ', 'Pipe'], [' - ', 'Dash'], [' ', 'Space'], [';', 'Semicolon']], '\t', { onChange: run }), pad = check('Pad column A so columns line up', false, { onChange: run }); const out = area({ readonly: true, rows: 8, 'aria-label': 'Merged' });
    function run() { out.value = T.mergeColumns(a.value, b.value, { sep: sep.value, pad: pad.input.checked }); }
    ui.append(h('div', { class: 'ut-options' }, field('Separator', sep), pad), h('div', { class: 'ut-io' }, h('div', { class: 'ut-col' }, h('strong', {}, 'List A'), a), h('div', { class: 'ut-col' }, h('strong', {}, 'List B'), b)),
      h('div', { class: 'ut-actions' }, btn(t('sample'), () => { a.value = tr('Ann\nBen\nCleo'); b.value = tr('Berlin\nParis\nRome'); run(); }, 'ghost'), btn(t('copy'), () => copyText(out.value), 'primary')), out); run();
  },
  'tabs-to-spaces'(root) {
    textTool(root, { options: [{ key: 'mode', label: 'Convert', type: 'select', value: 'tabs-to-spaces', choices: [['tabs-to-spaces', 'Tabs → spaces'], ['spaces-to-tabs', 'Spaces → tabs']] }, { key: 'size', label: 'Spaces per tab', type: 'select', value: '4', choices: ['2', '3', '4', '8'] }, { key: 'trail', label: 'Trim trailing whitespace', type: 'check', value: false }, { key: 'lead', label: 'Only change indentation (not tabs inside lines)', type: 'check', value: true }],
      sample: 'if (x) {\n\treturn 1;\n\t\treturn 2;\n}', run: (s, o) => T.tabsSpaces(s, { mode: o.mode, size: Number(o.size), trailing: o.trail, leadingOnly: o.lead }) });
  },
  'word-frequency-counter'(root) {
    const ui = wrap(root); const input = area({ placeholder: t('pasteHere'), rows: 9, onInput: run }); const n = select([['1', 'Single words'], ['2', 'Two-word phrases'], ['3', 'Three-word phrases']], '1', { onChange: run }), stop = select([['en', 'English'], ['de', 'German'], ['none', 'None']], 'en', { onChange: run }), min = numInput(1, { min: 1, onInput: run });
    const out = h('div'), stats = h('div', { class: 'ut-stats' }); let csv = '';
    function run() { const r = T.wordFrequency(input.value, { n: Number(n.value), stop: stop.value, min: Number(min.value) || 1, limit: 200 }); csv = 'term,count,percent\n' + r.rows.map(x => `${x.word},${x.count},${x.pct.toFixed(2)}`).join('\n');
      stats.replaceChildren(stat('Total terms', num(r.total)), stat('Distinct', num(r.unique)), stat('Words in text', num(r.tokens)));
      out.replaceChildren(table([['Term', 'Count', 'Density'], ...r.rows.map(x => [x.word, num(x.count), x.pct.toFixed(2) + ' %'])], { max: 200 })); }
    ui.append(h('div', { class: 'ut-options' }, field('Count', n), field('Ignore common words in', stop), field('Minimum count', min)), input, h('div', { class: 'ut-actions' }, btn(t('sample'), () => { input.value = tr('Remote work changed how teams work. Teams that work remotely need clear goals, clear communication and regular check-ins. Remote work works when goals are clear.'); run(); }, 'ghost'), btn('Download CSV', () => download('word-frequency.csv', csv, 'text/csv'))), stats, out); run();
  },
  'text-splitter'(root) {
    const ui = wrap(root); const input = area({ placeholder: 'Paste the long text to split', rows: 9, onInput: run }); const max = numInput(2000, { min: 1, onInput: run }), ov = numInput(0, { min: 0, onInput: run }), bp = check('Prefer paragraph boundaries', false, { onChange: run }), bw = check('Never cut inside a word', true, { onChange: run }); const out = h('div', { class: 'ut-chunks' }), stats = h('div', { class: 'ut-stats' }); let chunks = [];
    function run() { try { chunks = T.chunkText(input.value, Math.max(1, Number(max.value) || 1), { overlap: Number(ov.value) || 0, byWords: bw.input.checked, byParagraph: bp.input.checked }); } catch { chunks = []; }
      stats.replaceChildren(stat('Chunks', num(chunks.length)), stat('Longest', num(Math.max(0, ...chunks.map(c => c.length)))));
      out.replaceChildren(...chunks.slice(0, 200).map((c, i) => h('div', { class: 'ut-chunk' }, h('div', { class: 'ut-colhead' }, h('strong', {}, `Part ${i + 1}`), h('span', { class: 'pt-hint' }, `${num(c.length)} characters`), btn(t('copy'), () => copyText(c), 'ghost')), h('pre', {}, c)))); }
    ui.append(h('div', { class: 'ut-options' }, field('Max characters per chunk', max), field('Overlap (characters)', ov), bw, bp), input, h('div', { class: 'ut-actions' }, btn(t('sample'), () => { input.value = tr('Lorem ipsum dolor sit amet. ').repeat(40); max.value = 300; run(); }, 'ghost'), btn('Download all (.txt)', () => download('chunks.txt', chunks.map((c, i) => `--- Part ${i + 1} ---\n${c}`).join('\n\n')))), stats, out); run();
  },
  'buzzword-detector'(root) {
    const ui = wrap(root); const input = area({ placeholder: 'Paste your email, report or job post', rows: 9, onInput: run }); const out = h('div', { class: 'ut-richout' }), list = h('div'), stats = h('div', { class: 'ut-stats' });
    function run() { const s = input.value; const hits = T.findBuzzwords(s); const parts = []; let pos = 0; for (const x of hits) { if (x.index < pos) continue; parts.push(s.slice(pos, x.index)); parts.push(h('mark', { title: `Try: ${x.replacement}` }, s.slice(x.index, x.index + x.length))); pos = x.index + x.length; } parts.push(s.slice(pos)); out.replaceChildren(...parts);
      const by = {}; hits.forEach(x => { (by[x.word] ||= { r: x.replacement, n: 0 }).n++; }); stats.replaceChildren(stat('Buzzwords', num(hits.length)), stat('Words', num(T.wordCount(s))), stat('Per 100 words', T.wordCount(s) ? fmtNum(hits.length / T.wordCount(s) * 100, 1) : '0'));
      list.replaceChildren(Object.keys(by).length ? table([['Jargon', 'Say instead', 'Times'], ...Object.entries(by).map(([w, v]) => [w, v.r, v.n])]) : h('p', { class: 'pt-hint' }, 'No jargon found.')); }
    ui.append(input, h('div', { class: 'ut-actions' }, btn(t('sample'), () => { input.value = tr('Going forward we will leverage our core competencies to move the needle. Let us circle back after a deep dive into the low-hanging fruit and align stakeholders.'); run(); }, 'ghost')), stats, h('h2', { class: 'ut-h' }, 'Highlighted'), out, h('h2', { class: 'ut-h' }, 'Plain-language alternatives'), list); run();
  },
  'outline-converter'(root) {
    textTool(root, { options: [{ key: 'fmt', label: 'Convert to', type: 'select', value: 'json', choices: [['json', 'JSON'], ['html', 'HTML nested list'], ['xml', 'XML'], ['markdown', 'Markdown list'], ['yaml', 'YAML']] }, { key: 'tab', label: 'Spaces per tab', type: 'number', value: 2, min: 1, max: 8 }],
      sample: 'Company\n  Engineering\n    Frontend\n    Backend\n  Sales\n    EMEA', inputLabel: 'Indented outline', run: (s, o) => T.outlineTo(s, o.fmt, o.tab) });
  },
  'text-base-converter'(root) {
    const f = ['text', 'hex', 'binary', 'decimal', 'octal', 'base32', 'base64'];
    textTool(root, { options: [{ key: 'from', label: 'From', type: 'select', value: 'text', choices: f }, { key: 'to', label: 'To', type: 'select', value: 'hex', choices: f }, { key: 'sep', label: 'Separator between bytes', type: 'select', value: ' ', choices: [[' ', 'space'], [',', 'comma'], ['', 'none'], ['\n', 'new line']] }],
      sample: 'Hello', run: (s, o) => T.convertBase(s, { from: o.from, to: o.to, sep: o.sep }) });
  },
  'morse-code-translator'(root) {
    const ui = wrap(root); const input = area({ placeholder: 'Type text, or paste Morse code (dots, dashes, / between words)', rows: 6, onInput: run });
    const dir = select([['auto', 'Detect automatically'], ['to', 'Text → Morse'], ['from', 'Morse → text']], 'auto', { onChange: run }), wpm = numInput(15, { min: 5, max: 40, onInput: () => {} }), freq = numInput(600, { min: 300, max: 1000, step: 50 });
    const out = area({ readonly: true, rows: 6, 'aria-label': 'Result' }); let ctx, playing = false, stop = () => {};
    const isMorse = s => /^[\s.\-\/|·•–—_]+$/.test(s) && /[.\-·•–—]/.test(s);
    function run() { const s = input.value, d = dir.value === 'auto' ? (isMorse(s) ? 'from' : 'to') : dir.value; out.value = d === 'to' ? T.toMorse(s) : T.fromMorse(s); out.dataset.mode = d; }
    async function play() {
      if (playing) { stop(); return; } const code = out.dataset.mode === 'to' ? out.value : input.value; if (!code.trim()) return;
      ctx ||= new (window.AudioContext || window.webkitAudioContext)(); await ctx.resume(); const unit = 1200 / (Number(wpm.value) || 15) / 1000; const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
      const osc = ctx.createOscillator(); osc.frequency.value = Number(freq.value) || 600; osc.connect(gain); osc.start(); let at = ctx.currentTime + 0.05;
      for (const [on, ms] of T.morseTimeline(code, unit * 1000)) { if (on) { gain.gain.setTargetAtTime(0.4, at, 0.004); gain.gain.setTargetAtTime(0, at + ms / 1000 - 0.01, 0.004); } at += ms / 1000; }
      playing = true; playBtn.textContent = tr('Stop'); const timer = setTimeout(done, (at - ctx.currentTime) * 1000 + 100);
      function done() { osc.stop(); gain.disconnect(); playing = false; playBtn.textContent = tr('Play as sound'); } stop = () => { clearTimeout(timer); done(); };
    }
    const playBtn = btn('Play as sound', play, 'primary');
    ui.append(h('div', { class: 'ut-options' }, field('Direction', dir), field('Speed (words per minute)', wpm), field('Pitch (Hz)', freq)), h('div', { class: 'ut-io' }, h('div', { class: 'ut-col' }, h('strong', {}, t('input')), input), h('div', { class: 'ut-col' }, h('strong', {}, t('output')), out)),
      h('div', { class: 'ut-actions' }, playBtn, btn(t('copy'), () => copyText(out.value)), btn(t('sample'), () => { input.value = tr('SOS Help'); run(); }, 'ghost'))); run();
  },

  'readability-score'(root) {
    const lab = { fleschReadingEase: ['Flesch Reading Ease', '0–100, higher = easier. 60–70 is plain English'], fleschKincaidGrade: ['Flesch–Kincaid grade', 'US school grade needed to understand the text'], gunningFog: ['Gunning Fog index', 'years of education needed'], smog: ['SMOG index', 'years of education needed'], amstad: ['Flesch score for German (Amstad)', '0–100, higher = easier'], wiener: ['Wiener Sachtextformel', 'school grade (4 = very easy, 15 = very hard)'], lix: ['LIX', 'under 30 very easy, 40 easy, 50 medium, 60+ difficult (any language)'], ari: ['Automated Readability Index', 'US school grade (any language)'], colemanLiau: ['Coleman–Liau index', 'US school grade (any language)'] };
    textTool(root, { inputLabel: 'Text', outputLabel: 'Scores', sample: 'Plain language helps everyone. Short sentences are easier to read. However, notwithstanding considerable methodological heterogeneity, interdisciplinary investigations demonstrate statistically significant correlations.',
      options: [{ key: 'lang', label: 'Language of the text', type: 'select', value: document.documentElement.lang === 'de' ? 'de' : 'en', choices: [['en', 'English'], ['de', 'German'], ['other', 'Another language (language-independent scores only)']] }, { key: 'limit', label: 'Flag sentences longer than (words)', type: 'number', value: 25, min: 8, max: 80 }],
      run(s, o) { const r = TM.readability(s, o.lang); if (!r) return { text: '', stats: [] }; const lines = Object.keys(lab).filter(k => r[k] !== undefined).map(k => `${lab[k][0]}: ${r[k]}  (${lab[k][1]})`); const ls = TM.longSentences(s, o.limit); const text = [`Level: ${r.level}`, '', ...lines, '', `Average sentence length: ${r.avgSentenceLength} words`, `Average syllables per word: ${r.avgSyllablesPerWord}`, `Long words (over 6 letters): ${r.longWordShare} %`, ...(ls.length ? ['', `Sentences over ${o.limit} words (${ls.length}):`, ...ls.slice(0, 10).map(x => `• (${x.n}) ${x.s.length > 160 ? x.s.slice(0, 160) + '…' : x.s}`)] : ['', `No sentence is longer than ${o.limit} words.`])].join('\n'); return { text, stats: [['Level', r.level], ['Words', r.words], ['Sentences', r.sentences], ['Words per sentence', r.avgSentenceLength]] }; } });
  },
  'text-summarizer'(root) {
    textTool(root, { inputLabel: 'Text to summarise', outputLabel: 'Summary', sample: 'Solar power is growing fast. Many homes now use solar panels on the roof. Solar panels convert sunlight into electricity. The weather was nice yesterday. Cheap solar panels make solar power popular. My cat likes fish. Governments support solar power with subsidies.',
      options: [{ key: 'n', label: 'Sentences in the summary', type: 'number', value: 3, min: 1, max: 30, step: 1 }, { key: 'lang', label: 'Language', type: 'select', value: document.documentElement.lang || 'en', choices: [['en', 'English'], ['de', 'German'], ['pl', 'Polish'], ['cs', 'Czech']] }],
      run(s, o) { if (!s.trim()) return { text: '', stats: [] }; const all = TM.sentencesOf(s), sum = TM.summarize(s, Math.max(1, Math.round(o.n)), o.lang), kw = TM.topKeywords(s, 6, o.lang); const text = sum.join(' '); return { text, stats: [['Sentences', `${sum.length} of ${all.length}`], ['Shorter by', `${all.length ? Math.round((1 - text.length / s.length) * 100) : 0} %`], ['Key words', kw.map(k => k[0]).join(', ') || '–']] }; } });
  },
  'text-similarity-checker'(root) {
    const ui = wrap(root); const a = area({ rows: 8, placeholder: 'Text A (for example the original)', 'aria-label': 'Text A', onInput: debounce(run, 250) }), b = area({ rows: 8, placeholder: 'Text B (for example the text to check)', 'aria-label': 'Text B', onInput: debounce(run, 250) }), minRun = numInput(5, { min: 3, max: 30, step: 1, onInput: debounce(run, 250) }), out = h('div'), info = h('div', { class: 'ut-stats' });
    function run() { out.replaceChildren(); info.replaceChildren(); if (!a.value.trim() || !b.value.trim()) return; const r = TM.similarity(a.value, b.value, 3, Math.max(3, Number(minRun.value) || 5)); if (!r) return; info.replaceChildren(stat('Word sequences in common', `${r.jaccard} %`), stat('Word-use similarity', `${r.cosine} %`), stat('Shared passages cover A', `${r.sharedShareOfA} %`), stat('Shared passages cover B', `${r.sharedShareOfB} %`), stat('Words', `${r.wordsA} / ${r.wordsB}`));
      out.replaceChildren(r.sharedPassages.length ? h('div', {}, h('strong', {}, `Passages found in both texts (at least ${minRun.value} words in a row)`), table([['Words', 'Passage'], ...r.sharedPassages.slice(0, 100).map(p => [p.words, p.text])], { max: 100 })) : h('p', { class: 'pt-hint', 'data-result': 'ready' }, 'No passage of that length appears in both texts.')); }
    ui.append(h('div', { class: 'ut-io' }, h('div', { class: 'ut-col' }, h('strong', {}, 'Text A'), a), h('div', { class: 'ut-col' }, h('strong', {}, 'Text B'), b)), h('div', { class: 'ut-options' }, field('Shortest shared passage (words in a row)', minRun)), info, out, h('p', { class: 'pt-hint' }, 'Compares only the two texts you paste: it counts shared three-word sequences and finds long identical passages, ignoring case and punctuation. It is not a plagiarism checker against the internet, and it does not recognise reworded text.'));
  },
};
