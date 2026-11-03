// kit.js — small DOM helpers and tool factories shared by every utility tool.
// Tools never touch the network: everything is computed from what the visitor pastes or drops.

const LANG = document.documentElement.lang || 'en';
let DICT = {};
export const lang = LANG;
export async function loadDict() {
  if (LANG === 'en') { DICT = (await import('/assets/i18n/ut.en.js')).default; return; }
  try { DICT = (await import(`/assets/i18n/ut.${LANG}.js`)).default; } catch { DICT = (await import('/assets/i18n/ut.en.js')).default; }
}
export const t = (key, vars) => {
  let s = DICT[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
};

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const debounce = (fn, ms = 120) => { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; };
export const fmtNum = (n, d = 2, fixed = false) => Number.isFinite(n) ? n.toLocaleString(LANG === 'en' ? 'en-US' : LANG, { maximumFractionDigits: d, ...(fixed ? { minimumFractionDigits: d } : {}) }) : '–';

export function toast(msg) {
  let box = document.querySelector('.ut-toast');
  if (!box) { box = h('div', { class: 'ut-toast', role: 'status', 'aria-live': 'polite' }); document.body.append(box); }
  box.textContent = msg; box.classList.add('is-on');
  clearTimeout(box._t); box._t = setTimeout(() => box.classList.remove('is-on'), 1600);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }); ta.value = text; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); } finally { ta.remove(); }
  }
  toast(t('copied'));
}

export function download(name, data, mime = 'text/plain;charset=utf-8') {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export const readText = file => file.text();
export const readBytes = async file => new Uint8Array(await file.arrayBuffer());

/** A button that opens the file picker; also accepts drops on `zone`. */
export function filePicker({ accept = '*/*', multiple = false, label, onFiles, zone }) {
  const input = h('input', { type: 'file', accept, multiple, class: 'visually-hidden', tabindex: '-1' });
  const btn = h('button', { type: 'button', class: 's-btn s-btn--secondary', onClick: () => input.click() }, label || t('chooseFile'));
  input.addEventListener('change', () => { if (input.files.length) onFiles([...input.files]); input.value = ''; });
  if (zone) {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('is-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('is-over'); if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]); });
  }
  return h('span', {}, btn, input);
}

let uid = 0;
export function field(label, control, hint) {
  const id = control.id || `ut-f${++uid}`; control.id = id;
  return h('div', { class: 'ut-field' }, h('label', { for: id }, label), control, hint && h('small', {}, hint));
}
export const textInput = (value = '', props = {}) => h('input', { type: 'text', class: 'pt-input', value, ...props });
export const numInput = (value, props = {}) => h('input', { type: 'number', class: 'pt-input', value, ...props });
export const select = (options, value, props = {}) => h('select', { class: 'pt-input', ...props },
  options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, selected: String(v) === String(value) }, l); }));
export const check = (label, checked = false, props = {}) => {
  const input = h('input', { type: 'checkbox', checked, ...props });
  return Object.assign(h('label', { class: 'pt-check' }, input, h('span', {}, label)), { input });
};
export const area = (props = {}) => h('textarea', { class: 'pt-input ut-area', spellcheck: 'false', rows: 10, ...props });
export const btn = (label, onClick, kind = 'secondary', props = {}) => h('button', { type: 'button', class: `s-btn s-btn--${kind}`, onClick, ...props }, label);

export function stat(label, value) { return h('div', { class: 'ut-stat' }, h('span', {}, label), h('strong', {}, value)); }

export function copyBar(getText, filename, mime) {
  return h('div', { class: 'ut-actions' },
    btn(t('copy'), () => copyText(getText()), 'primary'),
    filename && btn(t('download'), () => download(filename, getText(), mime)));
}

/**
 * Text-in / text-out tool. spec = {
 *   options: [{ key, label, type: 'check'|'select'|'text'|'number', value, choices, min, max, step, hint }],
 *   run(text, opts) -> string | { text, stats: [[label, value]], html }
 *   inputLabel, outputLabel, placeholder, sample, file: 'text/*', filename, outputHtml
 * }
 */
export function textTool(root, spec) {
  const opts = {};
  const controls = (spec.options || []).map(o => {
    let ctl, node;
    if (o.type === 'check') { node = check(o.label, o.value, { onChange: update }); ctl = node.input; }
    else if (o.type === 'select') { ctl = select(o.choices, o.value, { onChange: update }); node = field(o.label, ctl, o.hint); }
    else { ctl = o.type === 'number' ? numInput(o.value, { min: o.min, max: o.max, step: o.step, onInput: update }) : textInput(o.value ?? '', { onInput: update, placeholder: o.placeholder || '' }); node = field(o.label, ctl, o.hint); }
    return { o, ctl, node };
  });
  const input = area({ placeholder: spec.placeholder || t('pasteHere'), 'aria-label': spec.inputLabel || t('input'), onInput: update });
  const output = spec.outputHtml ? h('div', { class: 'ut-out ut-richout', 'aria-live': 'polite' }) : area({ readonly: true, 'aria-label': spec.outputLabel || t('output') });
  const stats = h('div', { class: 'ut-stats' });
  const err = h('p', { class: 'pt-drop__error', role: 'alert', hidden: true });
  let last = '';

  function read() {
    for (const { o, ctl } of controls) opts[o.key] = o.type === 'check' ? ctl.checked : o.type === 'number' ? Number(ctl.value) : ctl.value;
  }
  function update() {
    read(); err.hidden = true;
    try {
      const r = spec.run(input.value, opts);
      const text = typeof r === 'string' ? r : r.text;
      last = text ?? '';
      if (spec.outputHtml) output.innerHTML = r.html ?? ''; else output.value = last;
      stats.replaceChildren(...(r.stats || spec.stats?.(input.value, opts) || []).map(([l, v]) => stat(l, v)));
    } catch (e) { err.textContent = e.message || String(e); err.hidden = false; }
  }
  const pick = spec.file ? filePicker({ accept: spec.file, label: t('openFile'), onFiles: async ([f]) => { input.value = await readText(f); update(); } }) : null;
  root.append(h('div', { class: 'ut' },
    controls.length && h('div', { class: 'ut-options' }, controls.map(c => c.node)),
    h('div', { class: 'ut-io' },
      h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, spec.inputLabel || t('input')),
        h('span', { class: 'ut-colbtns' }, spec.sample && btn(t('sample'), () => { input.value = spec.sample; update(); }, 'ghost'), pick, btn(t('clear'), () => { input.value = ''; update(); }, 'ghost'))), input),
      h('div', { class: 'ut-col' }, h('div', { class: 'ut-colhead' }, h('strong', {}, spec.outputLabel || t('output')),
        h('span', { class: 'ut-colbtns' }, btn(t('copy'), () => copyText(last), 'primary'), spec.filename && btn(t('download'), () => download(spec.filename, last)))), output)),
    stats, err));
  update();
  return { input, output, update, opts };
}

/** Slot for rich custom tools: returns the root element after adding a wrapper. */
export function wrap(root) { const el = h('div', { class: 'ut' }); root.append(el); return el; }

export function table(rows, { header = true, max = 500 } = {}) {
  const tb = h('table', { class: 'ut-table' });
  rows.slice(0, max).forEach((r, i) => tb.append(h('tr', {}, r.map(c => h(header && i === 0 ? 'th' : 'td', {}, c ?? '')))));
  return h('div', { class: 'ut-tablewrap' }, tb, rows.length > max && h('p', { class: 'pt-hint' }, t('showingRows', { n: max, total: rows.length })));
}
