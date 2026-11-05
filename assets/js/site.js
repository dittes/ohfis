// site.js
// Small behaviours shared by all generated pages: theme toggle, menus, service worker.
// Pages that run a legacy app wire the theme toggle through theme.js instead.

const root = document.documentElement;
function el(tag, cls, text) { const x = document.createElement(tag); if (cls) x.className = cls; if (text) x.textContent = text; return x; }

if (!document.currentScript?.dataset.noTheme) {
  document.querySelectorAll('[data-action="toggle-theme"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('fo-theme', next); } catch { /* private mode */ }
    });
  });
}

// Language menu: close on outside click and Escape
const menus = [...document.querySelectorAll('.s-lang')];
document.addEventListener('click', e => { menus.forEach(m => { if (m.open && !m.contains(e.target)) m.open = false; }); });

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  menus.forEach(m => { if (m.open) { m.open = false; m.querySelector('summary').focus(); } });
});

// Favourites and recently used tools, kept in this browser only
const MINE = (() => {
  const read = k => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v.filter(x => x && typeof x.u === 'string' && typeof x.n === 'string') : []; } catch { return []; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
  return { favs: () => read('fo-favs'), recent: () => read('fo-recent'),
    isFav: u => read('fo-favs').some(x => x.u === u),
    toggleFav(u, n) { const f = read('fo-favs'); const i = f.findIndex(x => x.u === u); if (i >= 0) f.splice(i, 1); else f.unshift({ u, n }); write('fo-favs', f.slice(0, 24)); return i < 0; },
    visit(u, n) { write('fo-recent', [{ u, n }, ...read('fo-recent').filter(x => x.u !== u)].slice(0, 8)); } };
})();
const headEl = document.querySelector('.s-toolhead'), sb = document.querySelector('.s-searchbtn');
if (headEl && sb && document.querySelector('.pt')) {
  const path = location.pathname, name = headEl.querySelector('h1')?.textContent.trim() || document.title;
  MINE.visit(path, name);
  const star = el('button', 's-fav'); star.type = 'button';
  const paint = on => { star.textContent = on ? '★' : '☆'; star.setAttribute('aria-pressed', String(on)); star.setAttribute('aria-label', on ? sb.dataset.favRemove : sb.dataset.favAdd); star.title = star.getAttribute('aria-label'); };
  paint(MINE.isFav(path)); star.addEventListener('click', () => paint(MINE.toggleFav(path, name)));
  headEl.querySelector('h1')?.after(star);
}
const heroEl = document.querySelector('.s-hero');
if (heroEl && sb) {
  const favs = MINE.favs(), recent = MINE.recent().filter(r => !favs.some(f => f.u === r.u)).slice(0, 6);
  if (favs.length || recent.length) {
    const sec = el('section', 's-section s-mine'), wrap = el('div', 's-wrap'); sec.append(wrap);
    for (const [title, list] of [[sb.dataset.favTitle, favs], [sb.dataset.recentTitle, recent]]) { if (!list.length) continue; wrap.append(el('h2', 's-mine__h', title)); const ul = el('ul', 's-mine__list'); for (const x of list) { const li = el('li'); const a = el('a', '', x.n); a.href = x.u; li.append(a); ul.append(li); } wrap.append(ul); }
    wrap.append(el('p', 's-mine__hint', sb.dataset.mineHint)); heroEl.after(sec);
  }
}

// Quick search palette: "/" or Ctrl/Cmd+K, or the search button. Index is loaded on first use.
const sbtn = document.querySelector('.s-searchbtn');
if (sbtn) {
  let dlg, input, list, index = null, items = [], active = -1;
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // One typo allowed (substitution, insertion, deletion, or two letters swapped) for words of four letters or more
  const near = (w, t) => { if (Math.abs(w.length - t.length) > 1) return false; if (w.startsWith(t) || t.startsWith(w) && w.length >= 4) return true; let i = 0; while (i < w.length && i < t.length && w[i] === t[i]) i++; const a = w.slice(i + 1), b = t.slice(i + 1); return a === b || w.slice(i) === b || a === t.slice(i) || (w[i] === t[i + 1] && w[i + 1] === t[i] && w.slice(i + 2) === t.slice(i + 2)); };
  const load = () => index ||= import(sbtn.dataset.search).then(m => m.default.map(e => ({ ...e, nn: norm(e.n), hay: norm(`${e.n} ${e.k || ''} ${e.d} ${e.c}`), words: [...new Set(norm(`${e.n} ${e.k || ''}`).split(/[^a-z0-9]+/).filter(w => w.length >= 4))] }))).catch(() => []);
  const setActive = i => { active = items.length ? (i + items.length) % items.length : -1; [...list.children].forEach((li, k) => { const on = k === active; li.firstChild.classList.toggle('is-active', on); li.firstChild.setAttribute('aria-selected', String(on)); if (on) li.scrollIntoView({ block: 'nearest' }); }); input.setAttribute('aria-activedescendant', active >= 0 ? `sq-${active}` : ''); };
  const link = (e, i) => { const li = el('li'); const a = el('a', 's-sq__item'); a.href = e.u; a.id = `sq-${i}`; a.setAttribute('role', 'option'); a.append(el('strong', '', e.n), el('small', '', e.d ? `${e.c} · ${e.d}` : e.c)); li.append(a); return li; };
  const showSections = () => { items = []; const mine = []; const favs = MINE.favs(), recent = MINE.recent().filter(r => !favs.some(f => f.u === r.u)).slice(0, 5);
    for (const [title, list] of [[sbtn.dataset.favTitle, favs.slice(0, 6)], [sbtn.dataset.recentTitle, recent]]) if (list.length) { mine.push(el('li', 's-sq__head', title), ...list.map(x => { const li = el('li'); const a = el('a', 's-sq__item'); a.href = x.u; a.append(el('strong', '', x.n)); li.append(a); return li; })); }
    const head = el('li', 's-sq__head', sbtn.dataset.sections); const links = [...document.querySelectorAll('.s-nav .s-navlink')].map(a => ({ n: a.textContent, c: '', d: '', u: a.href })); list.replaceChildren(...mine, head, ...links.map((e, i) => { const li = link(e, i); li.firstChild.removeAttribute('role'); return li; })); active = -1; };
  const run = async () => {
    const q = norm(input.value.trim()); if (!q) { showSections(); return; }
    const idx = await load(); const terms = q.split(/\s+/);
    const rank = fuzzy => idx.map(e => { let s = 0; for (const t of terms) { if (e.hay.includes(t)) s += e.nn.startsWith(t) ? 8 : e.nn.includes(` ${t}`) ? 6 : e.nn.includes(t) ? 4 : 1; else if (fuzzy && t.length >= 4 && e.words.some(w => near(w, t))) s += 1; else return null; } return { e, s }; }).filter(Boolean).sort((a, b) => b.s - a.s || a.e.n.length - b.e.n.length).slice(0, 12).map(x => x.e);
    items = rank(false); if (!items.length) items = rank(true);
    if (!items.length) { list.replaceChildren(el('li', 's-sq__empty', sbtn.dataset.empty)); active = -1; return; }
    list.replaceChildren(...items.map(link)); setActive(0);
  };
  const build = () => {
    dlg = el('dialog', 's-sq'); dlg.setAttribute('aria-label', sbtn.getAttribute('aria-label'));
    input = el('input', 's-sq__input'); input.type = 'text'; input.enterKeyHint = 'search'; input.placeholder = sbtn.dataset.ph; input.autocomplete = 'off'; input.spellcheck = false; input.setAttribute('role', 'combobox'); input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-controls', 's-sq-list'); input.setAttribute('aria-label', sbtn.getAttribute('aria-label'));
    list = el('ul', 's-sq__list'); list.id = 's-sq-list'; list.setAttribute('role', 'listbox');
    dlg.append(input, list, el('p', 's-sq__hint', sbtn.dataset.hint)); document.body.append(dlg);
    input.addEventListener('input', run);
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); } else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter') { const a = list.querySelector('.is-active') || list.querySelector('a'); if (a) { e.preventDefault(); location.href = a.href; } }
    });
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  };
  const open = () => { if (!dlg) build(); if (!dlg.open) dlg.showModal(); input.value = ''; showSections(); load(); input.focus(); };
  sbtn.addEventListener('click', open);
  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey)) { e.preventDefault(); open(); }
  });
}

const burger = document.querySelector('.s-burger');
const nav = document.querySelector('.s-nav');
burger?.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(open));
});

// Remember an explicit language choice for the root page
document.querySelectorAll('[data-set-lang]').forEach(a => {
  a.addEventListener('click', () => {
    try { localStorage.setItem('fo-lang', a.dataset.setLang); } catch { /* private mode */ }
  });
});

if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}
