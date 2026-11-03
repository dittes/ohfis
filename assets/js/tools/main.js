// main.js — mounts the utility tool named in #tool-root[data-tool] from its category module.
import { loadDict, h } from './kit.js';

const root = document.getElementById('tool-root');
if (root) {
  try {
    await loadDict();
    const mod = await import(`./${root.dataset.cat}.js`);
    const mount = mod.tools[root.dataset.tool];
    if (!mount) throw new Error(`Tool "${root.dataset.tool}" is not available yet.`);
    root.replaceChildren();
    await mount(root);
    root.dataset.ready = 'true';
  } catch (e) {
    console.error(e);
    root.replaceChildren(h('p', { class: 'pt-drop__error', role: 'alert' }, e.message || String(e)));
    root.dataset.ready = 'error';
  }
}
