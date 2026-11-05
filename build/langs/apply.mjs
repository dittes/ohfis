// apply.mjs — merges the language overlays (build/langs/<lang>.mjs) into the registries, which hold only en, de, pl and cs inline.
// Anything an overlay leaves out falls back to the English text, so a language can be added step by step.
import { LANGS, CORE_LANGS, PAGES, TOOLS } from '../registry.mjs';
import { LI, UCATS, GROUPS, LINKS } from '../tools/registry.mjs';
import UTOOLS from '../tools/index.mjs';
import UI, { PAGE } from '../content/ui.mjs';

export const OVERLAYS = {};
for (const lang of LANGS.filter(l => !CORE_LANGS.includes(l))) {
  const ov = OVERLAYS[lang] = (await import(`./${lang}.mjs`)).default, i = LI[lang];
  for (const k of Object.keys(PAGES)) PAGES[k][lang] = k === 'home' ? '' : (ov.pages?.[k] ?? PAGES[k].en);
  for (const t of TOOLS) t.slugs[lang] = ov.pdfSlugs?.[t.id] ?? t.slugs.en;
  for (const t of UTOOLS) { const x = ov.tools?.[t.id]; t.names[i] = x?.[0] ?? t.names[0]; t.shorts[i] = x?.[1] ?? t.shorts[0]; }
  for (const [k, c] of Object.entries(UCATS)) { const x = ov.cats?.[k]; for (const f of ['name', 'short', 'h1']) c[f][i] = x?.[f] ?? c[f][0]; }
  for (const [g, c] of Object.entries(GROUPS)) { const x = ov.groups?.[g]; for (const f of ['name', 'short', 'h1']) if (c[f]) c[f][i] = x?.[f] ?? c[f][0]; if (c.slug) c.slug[i] = x?.slug ?? c.slug[0]; }
  for (const [k, l] of Object.entries(LINKS)) if (Array.isArray(l[2])) l[2][i] = ov.links?.[k] ?? l[2][0];
  for (const k of Object.keys(PAGE)) PAGE[k][i] = ov.page?.[k] ?? PAGE[k][0];
  UI[lang] = Object.fromEntries(Object.keys(UI.en).map(k => [k, ov.ui?.[k] ?? UI.en[k]]));
}
