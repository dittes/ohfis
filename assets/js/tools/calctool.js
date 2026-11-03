// calctool.js — form → results factory for calculators, plus a small dependency-free SVG chart.
import { h, t, field, select, check, numInput, textInput, btn, copyText, download, table, fmtNum, debounce } from './kit.js';

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, ...kids) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); kids.forEach(k => el.append(k)); return el; };

/** series: [{ name, points: [[x, y], ...] }]; options: { yFmt, xFmt, bar, height } */
export function chart(series, { yFmt = v => fmtNum(v, 0), xFmt = v => String(v), height = 280, bar = false, xLabel = '', yLabel = '' } = {}) {
  const W = 760, H = height, m = { l: 64, r: 16, t: 14, b: 42 }; const pts = series.flatMap(x => x.points); if (!pts.length) return h('div');
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs); let y0 = Math.min(0, ...ys), y1 = Math.max(...ys); if (y1 === y0) y1 = y0 + 1;
  const nice = (lo, hi) => { const step = Math.pow(10, Math.floor(Math.log10((hi - lo) / 5))); const k = [1, 2, 5, 10].find(f => (hi - lo) / (f * step) <= 6) * step; return { lo: Math.floor(lo / k) * k, hi: Math.ceil(hi / k) * k, k }; };
  const ny = nice(y0, y1); y0 = ny.lo; y1 = ny.hi; const X = x => m.l + (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0)) * (W - m.l - m.r), Y = y => H - m.b - (y - y0) / (y1 - y0) * (H - m.t - m.b);
  const colors = ['var(--s-blue)', 'var(--s-orange)', 'var(--s-green)', 'var(--s-pink)', 'var(--s-stamp)'];
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ut-chart', role: 'img', 'aria-label': series.map(x => x.name).join(', ') });
  for (let v = y0; v <= y1 + 1e-9; v += ny.k) { svg.append(s('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: 'ut-chart__grid' })); const tx = s('text', { x: m.l - 8, y: Y(v) + 4, class: 'ut-chart__tick', 'text-anchor': 'end' }); tx.textContent = yFmt(v); svg.append(tx); }
  const xt = Math.min(8, new Set(xs).size); const stepX = (x1 - x0) / Math.max(1, xt - 1); for (let i = 0; i < xt; i++) { const v = x0 + i * stepX; const tx = s('text', { x: X(v), y: H - m.b + 18, class: 'ut-chart__tick', 'text-anchor': 'middle' }); tx.textContent = xFmt(Math.round(v * 100) / 100); svg.append(tx); }
  series.forEach((ser, i) => {
    const c = colors[i % colors.length];
    if (bar) { const bw = Math.max(2, (W - m.l - m.r) / ser.points.length * 0.6 / series.length); ser.points.forEach(([x, y]) => svg.append(s('rect', { x: X(x) - bw * series.length / 2 + i * bw, y: Math.min(Y(y), Y(0)), width: bw, height: Math.abs(Y(y) - Y(0)), fill: c, rx: 2 }))); }
    else { svg.append(s('path', { d: ser.points.map((p, k) => `${k ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(''), fill: 'none', stroke: c, 'stroke-width': 2.5, 'stroke-linejoin': 'round' })); if (ser.points.length <= 40) ser.points.forEach(p => svg.append(s('circle', { cx: X(p[0]), cy: Y(p[1]), r: 3, fill: c }, s('title', {}, `${ser.name}: ${xFmt(p[0])} → ${yFmt(p[1])}`)))); }
  });
  const legend = h('div', { class: 'ut-legend' }, series.map((x, i) => h('span', {}, h('i', { style: { background: colors[i % colors.length] } }), x.name)));
  return h('figure', { class: 'ut-figure' }, svg, series.length > 1 || series[0].name ? legend : null);
}

/**
 * spec = { fields: [{ key, label, type: 'number'|'select'|'check'|'text'|'date'|'textarea', value, min, max, step, choices, hint, show(v) }],
 *   run(v) -> { cards: [[label, value, kind?]], rows: [[...]], chart, notes: [], text, copy }, presets?: [{ label, values }] }
 */
export function calcTool(root, spec) {
  const ctl = {}; const out = h('div', { class: 'ut-result' }); const err = h('p', { class: 'pt-drop__error', role: 'alert', hidden: true });
  const nodes = spec.fields.map(f => {
    let el, node;
    if (f.type === 'check') { node = check(f.label, f.value, { onChange: update }); el = node.input; }
    else if (f.type === 'select') { el = select(f.choices, f.value, { onChange: update }); node = field(f.label, el, f.hint); }
    else if (f.type === 'textarea') { el = h('textarea', { class: 'pt-input ut-area', rows: f.rows || 5, spellcheck: 'false', onInput: debounce(update, 150) }); el.value = f.value ?? ''; node = field(f.label, el, f.hint); node.classList.add('ut-field--wide'); }
    else if (f.type === 'date' || f.type === 'datetime-local' || f.type === 'time') { el = h('input', { type: f.type, class: 'pt-input', value: f.value, onInput: update, onChange: update }); node = field(f.label, el, f.hint); }
    else if (f.type === 'text') { el = textInput(f.value ?? '', { onInput: debounce(update, 150), placeholder: f.placeholder || '' }); node = field(f.label, el, f.hint); }
    else { el = numInput(f.value, { min: f.min, max: f.max, step: f.step ?? 'any', onInput: debounce(update, 120), placeholder: f.placeholder || '' }); node = field(f.label, el, f.hint); }
    ctl[f.key] = { el, f, node }; return node;
  });
  function values() { const v = {}; for (const [k, { el, f }] of Object.entries(ctl)) v[k] = f.type === 'check' ? el.checked : (f.type === 'number' || !f.type) ? (el.value === '' ? null : Number(el.value)) : el.value; return v; }
  function update() {
    err.hidden = true; const v = values(); for (const { f, node } of Object.values(ctl)) if (f.show) node.hidden = !f.show(v);
    try {
      const r = spec.run(v) || {}; out.replaceChildren();
      if (r.cards) out.append(h('div', { class: 'ut-cards' }, r.cards.map(([l, val, kind]) => h('div', { class: `ut-card${kind ? ' ut-card--' + kind : ''}` }, h('span', {}, l), h('strong', {}, val)))));
      if (r.notes?.length) out.append(...r.notes.map(n => h('p', { class: 'pt-notice' }, n)));
      if (r.chart) out.append(chart(r.chart.series, r.chart));
      if (r.rows) out.append(table(r.rows, { max: 400 }), h('div', { class: 'ut-actions' }, btn(t('copy'), () => copyText(r.rows.map(x => x.join('\t')).join('\n')), 'secondary'), btn('CSV', () => download('table.csv', r.rows.map(x => x.map(c => /[",\n]/.test(c) ? `"${String(c).replaceAll('"', '""')}"` : c).join(',')).join('\n'), 'text/csv'))));
      if (r.text) out.append(h('pre', { class: 'ut-pre' }, r.text), h('div', { class: 'ut-actions' }, btn(t('copy'), () => copyText(r.copy ?? r.text), 'primary')));
      last = r;
    } catch (e) { out.replaceChildren(); err.textContent = e.message || String(e); err.hidden = false; }
  }
  let last = null;
  root.append(h('div', { class: 'ut' }, spec.presets && h('div', { class: 'ut-actions' }, spec.presets.map(p => btn(p.label, () => { for (const [k, val] of Object.entries(p.values)) { const c = ctl[k]; if (!c) continue; if (c.f.type === 'check') c.el.checked = val; else c.el.value = val; } update(); }, 'ghost'))),
    h('div', { class: 'ut-options' }, nodes), err, out));
  update();
  return { update, values, ctl, get last() { return last; } };
}
export const money = (v, cur = '', d = 2) => (Number.isFinite(v) ? (cur ? cur + ' ' : '') + fmtNum(v, d, true) : '–');
export const pct = (v, d = 1) => Number.isFinite(v) ? fmtNum(v, d, true) + ' %' : '–';
