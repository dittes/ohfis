// site.js
// Small behaviours shared by all generated pages: theme toggle, menus, service worker.
// Pages that run a legacy app wire the theme toggle through theme.js instead.

const root = document.documentElement;

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

// Section dropdowns: fill from the menu file on first open; hover (desktop), click or keyboard
const navItems = [...document.querySelectorAll('.s-navitem')];
const navEl = document.querySelector('.s-nav');
let menuData = null;
const loadMenu = () => menuData ||= import(navEl.dataset.menu).then(m => m.default).catch(() => ({}));
function el(tag, cls, text) { const x = document.createElement(tag); if (cls) x.className = cls; if (text) x.textContent = text; return x; }
function fillDrop(item, data) {
  const drop = item.querySelector('.s-drop'); if (drop.dataset.filled) return; const d = data[item.dataset.group]; if (!d) return;
  const inner = el('div', 's-wrap s-drop__in'), grid = el('div', 's-drop__grid');
  for (const [label, links] of d.cols) { const col = el('div', 's-drop__col'); if (label) col.append(el('h3', '', label)); for (const [name, url] of links) { const a = el('a', '', name); a.href = url; col.append(a); } grid.append(col); }
  const all = el('a', 's-drop__all', d.all + ' →'); all.href = d.url; inner.append(grid, all); drop.append(inner); drop.dataset.filled = '1';
}
async function openItem(item) {
  navItems.forEach(o => { if (o !== item) closeItem(o); });
  item._want = true; const data = await loadMenu(); if (!item._want) return; fillDrop(item, data);
  item.querySelector('.s-drop').hidden = false; item.classList.add('is-open'); item.querySelector('.s-navtoggle').setAttribute('aria-expanded', 'true');
}
function closeItem(item) { item._want = false; item.classList.remove('is-open'); item.querySelector('.s-drop').hidden = true; item.querySelector('.s-navtoggle').setAttribute('aria-expanded', 'false'); }
const hoverCapable = matchMedia('(min-width: 1261px) and (hover: hover)');
navItems.forEach(item => {
  const btn = item.querySelector('.s-navtoggle'); let timer;
  btn.addEventListener('click', () => { clearTimeout(timer); item.classList.contains('is-open') ? closeItem(item) : openItem(item); });
  item.addEventListener('mouseenter', () => { if (!hoverCapable.matches) return; clearTimeout(timer); loadMenu(); timer = setTimeout(() => openItem(item), 90); });
  item.addEventListener('mouseleave', () => { if (!hoverCapable.matches) return; clearTimeout(timer); timer = setTimeout(() => closeItem(item), 220); });
  item.addEventListener('focusin', () => loadMenu());
});
document.addEventListener('click', e => { if (!e.target.closest('.s-navitem')) navItems.forEach(closeItem); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  menus.forEach(m => { if (m.open) { m.open = false; m.querySelector('summary').focus(); } });
  navItems.forEach(i => { if (i.classList.contains('is-open')) { closeItem(i); i.querySelector('.s-navtoggle').focus(); } });
});

// Quick search palette: "/" or Ctrl/Cmd+K, or the search button. Index is loaded on first use.
const sbtn = document.querySelector('.s-searchbtn');
if (sbtn) {
  let dlg, input, list, index = null, items = [], active = -1;
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const load = () => index ||= import(sbtn.dataset.search).then(m => m.default.map(e => ({ ...e, nn: norm(e.n), hay: norm(`${e.n} ${e.k || ''} ${e.d} ${e.c}`) }))).catch(() => []);
  const setActive = i => { active = items.length ? (i + items.length) % items.length : -1; [...list.children].forEach((li, k) => { const on = k === active; li.firstChild.classList.toggle('is-active', on); li.firstChild.setAttribute('aria-selected', String(on)); if (on) li.scrollIntoView({ block: 'nearest' }); }); input.setAttribute('aria-activedescendant', active >= 0 ? `sq-${active}` : ''); };
  const link = (e, i) => { const li = el('li'); const a = el('a', 's-sq__item'); a.href = e.u; a.id = `sq-${i}`; a.setAttribute('role', 'option'); a.append(el('strong', '', e.n), el('small', '', e.d ? `${e.c} · ${e.d}` : e.c)); li.append(a); return li; };
  const showSections = () => { items = []; const head = el('li', 's-sq__head', sbtn.dataset.sections); const links = [...document.querySelectorAll('.s-nav .s-navlink')].map(a => ({ n: a.textContent, c: '', d: '', u: a.href })); list.replaceChildren(head, ...links.map((e, i) => { const li = link(e, i); li.firstChild.removeAttribute('role'); return li; })); active = -1; };
  const run = async () => {
    const q = norm(input.value.trim()); if (!q) { showSections(); return; }
    const idx = await load(); const terms = q.split(/\s+/);
    items = idx.map(e => { let s = 0; for (const t of terms) { if (!e.hay.includes(t)) return null; s += e.nn.startsWith(t) ? 8 : e.nn.includes(` ${t}`) ? 6 : e.nn.includes(t) ? 4 : 1; } return { e, s }; }).filter(Boolean).sort((a, b) => b.s - a.s || a.e.n.length - b.e.n.length).slice(0, 12).map(x => x.e);
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
  const open = () => { if (!dlg) build(); navItems.forEach(closeItem); if (!dlg.open) dlg.showModal(); input.value = ''; showSections(); load(); input.focus(); };
  sbtn.addEventListener('click', open);
  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey)) { e.preventDefault(); open(); }
  });
}

const burger = document.querySelector('.s-burger');
const nav = navEl;
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
