// canvasboard.js — sticky-note canvases: notes live in sections, can be edited, coloured, dragged between sections,
// saved in this browser and exported as PNG, Markdown or a file. Definitions and pure helpers: lib/canvas.js.
import { tr, h, btn, copyText, download, toast, wrap, filePicker, readText } from './kit.js';
import * as C from './lib/canvas.js';

const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } } };

export function boardTool(root, id) {
  const spec = C.BOARDS[id], key = `fo-canvas-${id}`, ui = wrap(root); ui.classList.add('cv');
  let board = (() => { const saved = store.get(key); if (saved && Array.isArray(saved.notes)) { try { return C.parseBoard(id, JSON.stringify(saved)); } catch { /* fall through */ } } return C.sampleBoard(id, tr); })();
  const save = () => store.set(key, board);
  const title = h('input', { type: 'text', class: 'pt-input cv-title', placeholder: 'Name of this board (optional)', 'aria-label': 'Board name', value: board.title, onInput: () => { board.title = title.value; save(); } });
  const grid = h('div', { class: 'cv-grid' }); grid.style.gridTemplateColumns = `${spec.axes ? '30px ' : ''}repeat(${spec.grid[0]}, minmax(0, 1fr))`; if (spec.axes) grid.style.gridTemplateRows = `auto repeat(${spec.grid[1]}, minmax(150px, auto))`;
  const off = spec.axes ? 1 : 0; let dragId = null;

  const move = (noteId, sec, beforeId) => { const n = board.notes.find(x => x.id === noteId); if (!n) return; board.notes = board.notes.filter(x => x !== n); n.sec = sec; const i = beforeId ? board.notes.findIndex(x => x.id === beforeId) : -1; i >= 0 ? board.notes.splice(i, 0, n) : board.notes.push(n); save(); draw(); };
  function noteEl(n) {
    const ta = h('textarea', { class: 'cv-text', rows: 2, 'aria-label': 'Note', value: n.text, onInput: () => { n.text = ta.value; ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight}px`; save(); } });
    const dest = h('select', { class: 'cv-move', 'aria-label': tr('Move to'), title: tr('Move to'), onChange: () => move(n.id, dest.value) }, spec.sections.map(s => h('option', { value: s.key, selected: s.key === n.sec }, tr(s.title)))); const moveWrap = h('span', { class: 'cv-movewrap' }, '⇄', dest);
    const grip = h('span', { class: 'cv-grip', draggable: 'true', title: tr('Drag to move'), 'aria-hidden': 'true' }, '⠿');
    const el = h('div', { class: 'cv-note', style: { background: n.color }, 'data-id': n.id }, ta,
      h('div', { class: 'cv-notebar' }, grip, h('button', { type: 'button', class: 'cv-dot', 'aria-label': tr('Change colour'), title: tr('Change colour'), onClick: () => { n.color = C.COLORS[(C.COLORS.indexOf(n.color) + 1) % C.COLORS.length]; save(); el.style.background = n.color; } }), moveWrap,
        h('button', { type: 'button', class: 'cv-del', 'aria-label': tr('Delete note'), title: tr('Delete note'), onClick: () => { board.notes = board.notes.filter(x => x !== n); save(); draw(); } }, '×')));
    grip.addEventListener('dragstart', e => { dragId = n.id; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', n.id); e.dataTransfer.setDragImage(el, 12, 12); } catch { /* old browsers */ } el.classList.add('is-dragging'); });
    grip.addEventListener('dragend', () => { dragId = null; el.classList.remove('is-dragging'); });
    queueMicrotask(() => { ta.style.height = 'auto'; ta.style.height = `${Math.max(40, ta.scrollHeight)}px`; });
    return { el, ta };
  }
  function draw(focusId) {
    grid.replaceChildren();
    if (spec.axes) { spec.axes.top.forEach((a, i) => grid.append(h('div', { class: 'cv-axis cv-axis--top', style: { gridColumn: `${i + 2} / span 1`, gridRow: '1' } }, tr(a)))); spec.axes.left.forEach((a, i) => grid.append(h('div', { class: 'cv-axis cv-axis--left', style: { gridColumn: '1', gridRow: `${i + 2} / span 1` } }, h('span', {}, tr(a))))); }
    let focus = null;
    for (const s of spec.sections) {
      const [c, r, cs, rs] = s.at; const list = h('div', { class: 'cv-notes' });
      for (const n of board.notes.filter(x => x.sec === s.key)) { const { el, ta } = noteEl(n); list.append(el); if (n.id === focusId) focus = ta; }
      const add = h('button', { type: 'button', class: 'cv-add', 'aria-label': `${tr('Add note')}: ${tr(s.title)}`, onClick: () => { const n = C.newNote(s.key, '', C.COLORS[board.notes.length % C.COLORS.length]); board.notes.push(n); save(); draw(n.id); } }, `+ ${tr('Add note')}`);
      const sec = h('section', { class: 'cv-sec', style: { gridColumn: `${c + off} / span ${cs}`, gridRow: `${r + off} / span ${rs}` }, 'data-sec': s.key }, h('h3', {}, tr(s.title)), h('p', { class: 'cv-hint' }, tr(s.hint)), list, add);
      sec.addEventListener('dragover', e => { if (dragId) { e.preventDefault(); sec.classList.add('is-over'); } });
      sec.addEventListener('dragleave', e => { if (!sec.contains(e.relatedTarget)) sec.classList.remove('is-over'); });
      sec.addEventListener('drop', e => { e.preventDefault(); sec.classList.remove('is-over'); if (!dragId) return; const over = e.target.closest?.('.cv-note'); move(dragId, s.key, over && over.dataset.id !== dragId ? over.dataset.id : null); });
      grid.append(sec);
    }
    if (focus) focus.focus();
  }

  function png() {
    const W = 2000, [cols, rows] = spec.grid, cw = W / cols, rh = rows <= 2 ? 520 : rows === 3 ? 400 : 250, top = 110, foot = 70, H = top + rows * rh + foot;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); g.fillStyle = '#171b24'; g.font = '700 44px Inter, Arial, sans-serif'; g.textBaseline = 'alphabetic'; g.fillText(board.title || tr(root.closest('main')?.querySelector('h1')?.textContent || ''), 30, 70);
    const wrapText = (txt, x, y, maxW, lh, maxY) => { const words = txt.split(/\s+/); let line = ''; for (const w of words) { const test = line ? `${line} ${w}` : w; if (g.measureText(test).width > maxW && line) { if (y > maxY) return; g.fillText(line, x, y); y += lh; line = w; } else line = test; } if (line && y <= maxY) g.fillText(line, x, y); };
    for (const s of spec.sections) {
      const [c, r, cs, rs] = s.at; const x = (c - 1) * cw, y = top + (r - 1) * rh, w = cs * cw, hh = rs * rh;
      g.strokeStyle = '#98a0b0'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, hh - 2); g.fillStyle = '#171b24'; g.font = '700 26px Inter, Arial, sans-serif'; g.fillText(tr(s.title), x + 14, y + 36);
      g.fillStyle = '#6b7385'; g.font = '400 18px Inter, Arial, sans-serif'; wrapText(tr(s.hint), x + 14, y + 62, w - 28, 22, y + 62);
      const boxes = C.placeNotes({ x, y: y + 78, w, h: hh - 78 }, board.notes.filter(n => n.sec === s.key && n.text.trim()));
      for (const { note, x: bx, y: by, w: bw, h: bh } of boxes) { g.fillStyle = note.color; g.fillRect(bx, by, bw, bh); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; g.strokeRect(bx + .5, by + .5, bw - 1, bh - 1); const fs = Math.max(11, Math.min(24, Math.floor(bh / 4.2))); g.fillStyle = '#171b24'; g.font = `500 ${fs}px Inter, Arial, sans-serif`; wrapText(note.text.trim(), bx + 8, by + fs + 6, bw - 16, fs * 1.25, by + bh - 6); }
    }
    g.fillStyle = '#6b7385'; g.font = '400 17px Inter, Arial, sans-serif'; const cr = C.CREDITS[spec.credit]; wrapText(`${cr.text}${cr.url ? ` ${cr.link}: ${cr.url}` : ''}`, 30, H - 46, W - 60, 22, H - 8);
    return cv;
  }
  const slug = () => (board.title || id).toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, '-').replace(/^-|-$/g, '') || id;
  const importer = filePicker({ accept: '.json,application/json', label: tr('Open saved board'), onFiles: async ([f]) => { try { board = C.parseBoard(id, await readText(f)); title.value = board.title; save(); draw(); toast(tr('Board loaded')); } catch (e) { toast(tr(e.message)); } } });
  const cr = C.CREDITS[spec.credit];
  ui.append(
    h('div', { class: 'ut-options cv-toolbar' }, h('div', { class: 'ut-field' }, h('label', {}, tr('Board name')), title),
      btn('Copy as Markdown', () => copyText(C.toMarkdown(id, board, tr)).then(() => toast(tr('Copied'))), 'primary'),
      btn('Download PNG', () => png().toBlob(b => download(`${slug()}.png`, b, 'image/png')), 'secondary'),
      btn('Save as file', () => download(`${slug()}.json`, JSON.stringify(board, null, 1), 'application/json'), 'secondary'), importer,
      btn('Print', () => window.print(), 'ghost'),
      btn('Start over', () => { if (confirm(tr('Remove all notes and start with an empty board?'))) { board = { title: '', notes: [] }; title.value = ''; save(); draw(); } }, 'ghost'),
      btn('Load the example', () => { board = C.sampleBoard(id, tr); title.value = ''; save(); draw(); }, 'ghost')),
    grid,
    h('p', { class: 'pt-hint cv-credit' }, tr(cr.text), ' ', cr.url ? h('a', { href: cr.url, rel: 'noopener license' }, cr.link) : null),
    h('p', { class: 'pt-hint' }, tr('Your board is saved in this browser only. Drag notes between the boxes or use the menu on a note to move it.')));
  draw();
}
