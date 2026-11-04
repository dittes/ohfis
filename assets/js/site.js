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
const hoverCapable = matchMedia('(min-width: 1181px) and (hover: hover)');
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
