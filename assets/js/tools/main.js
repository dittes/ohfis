// main.js — mounts the utility tool named in #tool-root[data-tool] from its category module.
import { loadDict, h } from './kit.js';

const root = document.getElementById('tool-root');
/** Give every form control an accessible name: placeholder, else the nearest heading/label text, else the page title. */
function labelize(scope) {
  const title = document.querySelector('h1')?.textContent.trim() || '';
  scope.querySelectorAll('input:not([type=hidden]):not([type=file]), select, textarea').forEach(el => {
    if (el.disabled || el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.title) return;
    let name = el.getAttribute('placeholder') || '';
    if (!name) { const col = el.closest('.ut-col, .ut-field, .pt-field, li, tr, div'); const lab = col?.querySelector('strong, label, h3, h4, legend, .ut-colhead span'); name = lab && !lab.contains(el) ? lab.textContent.trim() : ''; }
    if (!name && el.type === 'range') name = el.closest('div')?.textContent.trim().slice(0, 40) || '';
    el.setAttribute('aria-label', (name || title).slice(0, 80));
  });
}
if (root) {
  try {
    await loadDict();
    const mod = await import(`./${root.dataset.cat}.js`);
    const mount = mod.tools[root.dataset.tool];
    if (!mount) throw new Error(`Tool "${root.dataset.tool}" is not available yet.`);
    root.replaceChildren();
    await mount(root);
    labelize(root); let tm; new MutationObserver(() => { clearTimeout(tm); tm = setTimeout(() => labelize(root), 150); }).observe(root, { childList: true, subtree: true });
    root.dataset.ready = 'true';
  } catch (e) {
    console.error(e);
    root.replaceChildren(h('p', { class: 'pt-drop__error', role: 'alert' }, e.message || String(e)));
    root.dataset.ready = 'error';
  }
}
