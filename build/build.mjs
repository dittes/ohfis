// build.mjs
// Generates the static site: /en, /de, /pl and /cs with localized URLs, plus the root
// chooser, sitemap, redirects and service worker. Run with `npm run build`; the output is
// committed because GitHub Pages serves the repository as it is. No dependencies.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SITE, LANGS, LANG_NAMES, LOCALES, PAGES, CATEGORIES, TOOLS, SISTER_SITES, CONVERT_TO_PDF,
  sisterUrl, pagePath, toolPath,
} from './registry.mjs';
import { ICONS, LOGO, LOGO_SVG } from './icons.mjs';
import { UCATS, UCAT_ORDER, GROUPS, GROUP_ORDER, GROUP_OF, LINKS, SITES, SITE_NAMES, LI } from './tools/registry.mjs';
import { slugify } from '../assets/js/tools/lib/text.js';
import UTOOLS from './tools/index.mjs';
import UI, { PAGE } from './content/ui.mjs';
import { disclaimerFor, imprintExtras } from './content/legal-notes.mjs';

const BUILD = dirname(fileURLToPath(import.meta.url));
const ROOT = join(BUILD, '..');

const content = {};
for (const lang of LANGS) content[lang] = (await import(`./content/${lang}.mjs`)).default;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const e = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fill = (s, params) => Object.entries(params).reduce((out, [k, v]) => out.replaceAll(`{${k}}`, v), s);

function assetUrl(path) {
  const hash = createHash('sha1').update(readFileSync(join(ROOT, path))).digest('hex').slice(0, 8);
  return `/${path}?v=${hash}`;
}

function write(path, html) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, html);
}

const THEME_BOOT = `(function(){try{var t=localStorage.getItem('ohfis-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`;
const inlineHash = src => `'sha256-${createHash('sha256').update(src).digest('base64')}'`;

/** Pages without CDN libraries get a policy that makes "no upload" verifiable. */
// Tools whose WebAssembly library builds functions at run time (Emscripten/embind) need 'unsafe-eval' on their own page.
// connect-src stays 'self', so nothing can be sent anywhere.
const NEEDS_EVAL = new Set(['heic-to-jpg']);
function csp(inlineScripts = [THEME_BOOT], { unsafeEval = false } = {}) {
  return [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval'${unsafeEval ? " 'unsafe-eval'" : ''} ${inlineScripts.map(inlineHash).join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self' data: blob:",
    "connect-src 'self' blob: data:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
}

const iconSvg = (name, cls = 's-card__icon') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.file}</svg>`;

const toolById = id => TOOLS.find(t => t.id === id);
const utilById = id => UTOOLS.find(t => t.id === id);
const utilsOf = cat => UTOOLS.filter(t => t.cat === cat);
const pdfSlugs = new Set(TOOLS.flatMap(t => Object.values(t.slugs)));
for (const t of UTOOLS) if (pdfSlugs.has(t.id)) throw new Error(`Tool id collides with a PDF tool slug: ${t.id}`);
// Localised URL segments for the utility tools: the translated tool name, slugified.
// English keeps the tool id. Collisions with other pages get a numeric suffix.
const usedSlugs = Object.fromEntries(LANGS.map(l => [l, new Set([...TOOLS.map(t => t.slugs[l]), ...Object.values(PAGES).map(p => p[l]).filter(Boolean), ...Object.values(GROUPS).map(g => g.slug?.[LI[l]]).filter(Boolean)])]));
for (const t of UTOOLS) { t.slugs = { en: t.id }; usedSlugs.en.add(t.id); }
const slugName = (name, l) => slugify((l === 'de' ? name.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue') : name), { maxLen: 56 });
for (const l of ['de', 'pl', 'cs']) for (const t of UTOOLS) {
  const name = t.names[LI[l]];
  const short = slugName(name.replace(/\s*\([^)]*\)/g, ''), l), full = slugName(name, l);
  let n = [short, full].find(x => x && !usedSlugs[l].has(x)) || `${short || t.id}`, i = 2; const base = n;
  while (usedSlugs[l].has(n)) n = `${base}-${i++}`;
  usedSlugs[l].add(n); t.slugs[l] = n;
}
const utilPath = (tool, lang) => `/${lang}/${tool.slugs[lang]}/`;
const groupTools = g => UTOOLS.filter(t => GROUP_OF[t.cat] === g);
const groupName = (g, lang) => GROUPS[g].name[LI[lang]];
const hubPath = (g, lang) => g === 'pdf' ? pagePath('pdfTools', lang) : `/${lang}/${GROUPS[g].slug[LI[lang]]}/`;
const P = (key, lang, vars) => { let v = PAGE[key][LI[lang]]; if (vars) for (const [k, x] of Object.entries(vars)) v = v.replaceAll(`{${k}}`, x); return v; };

// ─── Shared page parts ────────────────────────────────────────────────────────

function head({ lang, title, desc, paths, jsonLd = [], useCsp = true, extraCss = [], ogType = 'website', noindex = false, unsafeEval = false }) {
  const url = `${SITE}${paths[lang]}`;
  const alternates = LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${SITE}${paths[l]}">`).join('\n  ');
  const ogAlt = LANGS.filter(l => l !== lang).map(l => `<meta property="og:locale:alternate" content="${LOCALES[l]}">`).join('\n  ');
  const scripts = jsonLd.map(data => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`).join('\n  ');
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${useCsp ? `<meta http-equiv="Content-Security-Policy" content="${e(csp([THEME_BOOT], { unsafeEval }))}">` : ''}
  <title>${e(title)}</title>
  <meta name="description" content="${e(desc)}">
  ${noindex ? '<meta name="robots" content="noindex">' : ''}
  <link rel="canonical" href="${url}">
  ${alternates}
  <link rel="alternate" hreflang="x-default" href="${SITE}${paths.en}">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0f1218" media="(prefers-color-scheme: dark)">
  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="Ohfis">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${e(title)}">
  <meta property="og:description" content="${e(desc)}">
  <meta property="og:locale" content="${LOCALES[lang]}">
  ${ogAlt}
  <meta property="og:image" content="${SITE}/assets/icons/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/icons/icon-192.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <script>${THEME_BOOT}</script>
  <link rel="preload" href="/assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  ${extraCss.map(c => `<link rel="stylesheet" href="${assetUrl(c)}">`).join('\n  ')}
  <link rel="stylesheet" href="${assetUrl('assets/css/site.css')}">
  ${scripts}
</head>`;
}

function themeButton(c) {
  return `<button class="s-icon-btn" type="button" data-action="toggle-theme" aria-label="${e(c.nav.toggleTheme)}" title="${e(c.nav.toggleTheme)}">
          <svg class="icon-moon" viewBox="0 0 16 16" fill="none" aria-hidden="true" width="16" height="16"><path d="M13.5 9.5A5.5 5.5 0 016.5 2.5a5.5 5.5 0 107 7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
          <svg class="icon-sun" viewBox="0 0 16 16" fill="none" aria-hidden="true" width="16" height="16"><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>`;
}

const CARET = '<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
function header(lang, paths, current) {
  const c = content[lang];
  return `<a class="s-skip" href="#main">${e(c.nav.skip)}</a>
  <header class="s-header">
    <div class="s-wrap s-header__row">
      <a class="s-logo" href="/${lang}/">${LOGO}<span>Ohfis</span></a>
      <nav class="s-nav" aria-label="${e(c.nav.main)}" data-menu="/assets/i18n/menu.${lang}.js">
        ${GROUP_ORDER.map(g => `<div class="s-navitem" data-group="${g}"><a class="s-navlink" href="${hubPath(g, lang)}"${current === g ? ' aria-current="page"' : ''}>${e(groupName(g, lang))}</a><button class="s-navtoggle" type="button" aria-expanded="false" aria-controls="drop-${g}" aria-label="${e(P('menuOf', lang, { name: groupName(g, lang) }))}">${CARET}</button><div class="s-drop" id="drop-${g}" hidden></div></div>`).join('')}
      </nav>
      <div class="s-actions">
        <button class="s-searchbtn" type="button" data-search="/assets/i18n/search.${lang}.js" data-ph="${e(P('searchPlaceholder', lang))}" data-empty="${e(P('searchEmpty', lang))}" data-hint="${e(P('searchHint', lang))}" data-sections="${e(P('searchSections', lang))}" aria-label="${e(P('searchOpen', lang))}"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span class="s-searchbtn__t">${e(P('searchPlaceholder', lang))}</span><kbd>/</kbd></button>
        <details class="s-lang">
          <summary aria-label="${e(c.nav.language)}">${lang}</summary>
          <ul>
            ${LANGS.map(l => `<li><a href="${paths[l]}" hreflang="${l}" lang="${l}" data-set-lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${LANG_NAMES[l]}</a></li>`).join('')}
          </ul>
        </details>
        ${themeButton(c)}
        <button class="s-icon-btn s-burger" type="button" aria-label="${e(c.nav.menu)}" aria-expanded="false"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
      </div>
    </div>
  </header>`;
}

function footer(lang, paths, { noTheme = false } = {}) {
  const c = content[lang];
  return `<footer class="s-footer">
    <div class="s-wrap">
      <div class="s-footer__bottom">
        <a href="${pagePath('privacy', lang)}">${e(c.nav.privacy)}</a>
        <a href="${pagePath('imprint', lang)}">${e(c.nav.imprint)}</a>
        <span class="s-footer__note">${e(c.footer.note)}</span>
      </div>
    </div>
  </footer>
  <script src="${assetUrl('assets/js/site.js')}" defer${noTheme ? ' data-no-theme="true"' : ''}></script>`;
}

const stamp = c => `<span class="s-stamp">${e(c.stamp.main)}<small>${e(c.stamp.sub)}</small></span>`;

function breadcrumbs(items) {
  return `<ol class="s-crumbs">${items.map(([label, href]) => `<li>${href ? `<a href="${href}">${e(label)}</a>` : `<span aria-current="page">${e(label)}</span>`}</li>`).join('')}</ol>`;
}

function card(lang, tool) {
  const t = content[lang].tools[tool.id];
  return `<a class="s-card" data-cat="${tool.cat}" href="${toolPath(tool, lang)}">
          ${iconSvg(tool.icon)}
          <span class="s-card__title">${e(t.name)}</span>
          <span class="s-card__desc">${e(t.short)}</span>
        </a>`;
}

function toolGrid(lang, headingTag = 'h3') {
  const c = content[lang];
  return CATEGORIES.map(cat => `<div class="s-cat">
        <div class="s-cat__head"><${headingTag}>${e(c.cats[cat])}</${headingTag}></div>
        <div class="s-cards">${TOOLS.filter(t => t.cat === cat).map(t => card(lang, t)).join('')}</div>
      </div>`).join('');
}

function sisterLinks(lang, keys) {
  const c = content[lang];
  return `<div class="s-links">${keys.map(key => {
    const [site] = key.split(':');
    return `<a href="${sisterUrl(key, lang)}" rel="noopener"><strong>${e(c.sisterLabels[key])}</strong><small>${e(SISTER_SITES[site].name)} ↗</small></a>`;
  }).join('')}</div>`;
}

function sisterSection(lang, keys) {
  if (!keys?.length) return '';
  const c = content[lang];
  return `<section class="s-section">
    <div class="s-wrap">
      <h2>${e(c.toolPage.sisterTitle)}</h2>
      <p class="s-section__lede">${e(c.toolPage.sisterLede)}</p>
      ${sisterLinks(lang, keys)}
    </div>
  </section>`;
}

function faqSection(c, faqs, title) {
  return `<section class="s-section" id="faq">
    <div class="s-wrap">
      <h2>${e(title || c.toolPage.faqTitle)}</h2>
      <div class="s-faq">
        ${faqs.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join('\n        ')}
      </div>
    </div>
  </section>`;
}

function howToSection(title, steps) {
  return `<section class="s-section s-section--tint" id="how">
    <div class="s-wrap">
      <h2>${e(title)}</h2>
      <ol class="s-steps">${steps.map(step => `<li><p>${e(step)}</p></li>`).join('')}</ol>
    </div>
  </section>`;
}

function benefitsSection(c) {
  return `<section class="s-section">
    <div class="s-wrap">
      <h2>${e(c.toolPage.benefitsTitle)}</h2>
      <div class="s-benefits">
        ${c.toolPage.benefits.map(([h, p]) => `<div><h3>${e(h)}</h3><p>${e(p)}</p></div>`).join('')}
      </div>
    </div>
  </section>`;
}

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

const ldOrg = { '@context': 'https://schema.org', '@type': 'Organization', '@id': `${SITE}/#org`, name: 'Ohfis', url: `${SITE}/`, logo: `${SITE}/assets/icons/icon-512.png` };

function ldApp(lang, name, desc, path, features = []) {
  return {
    '@context': 'https://schema.org', '@type': ['SoftwareApplication', 'WebApplication'],
    name, url: `${SITE}${path}`, description: desc, inLanguage: lang,
    applicationCategory: 'UtilitiesApplication', operatingSystem: 'Windows, macOS, Linux, Android, iOS',
    browserRequirements: 'Requires a modern web browser with JavaScript enabled',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    publisher: { '@id': `${SITE}/#org` },
    ...(features.length ? { featureList: features } : {}),
  };
}

function ldCrumbs(items) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, href], i) => ({ '@type': 'ListItem', position: i + 1, name, ...(href ? { item: `${SITE}${href}` } : {}) })),
  };
}

const ldFaq = faqs => ({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});

const ldHowTo = (name, steps) => ({
  '@context': 'https://schema.org', '@type': 'HowTo', name,
  step: steps.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text })),
});

// ─── Pages ────────────────────────────────────────────────────────────────────

const pathsFor = key => Object.fromEntries(LANGS.map(l => [l, pagePath(key, l)]));
const toolPaths = tool => Object.fromEntries(LANGS.map(l => [l, toolPath(tool, l)]));

function homePage(lang) {
  const c = content[lang];
  const h = c.home;
  const paths = pathsFor('home');
  const chipIds = ['merge', 'compress', 'jpg-to-pdf', 'case-converter', 'character-counter', 'remove-duplicate-lines', 'csv-delimiter-converter', 'unix-timestamp-converter'];
  const chips = chipIds.map(id => toolById(id) ? [toolPath(toolById(id), lang), c.tools[id].name] : utilById(id) ? [utilPath(utilById(id), lang), utilById(id).names[LI[lang]]] : null).filter(Boolean);
  return `${head({ lang, title: h.title, desc: h.desc, paths, jsonLd: [ldOrg, ldApp(lang, 'Ohfis', h.desc, paths[lang]), ldFaq(h.faqs)] })}
<body class="s-page">
  ${header(lang, paths, 'home')}
  <main id="main">
    <section class="s-hero">
      <div class="s-wrap s-hero__grid">
        <div class="s-hero__inner">
          <h1>${h.h1Html}</h1>
          <p class="s-hero__lede">${e(h.lede)}</p>
          <div class="s-search" role="search"><input type="search" id="tool-search" class="s-search__input" placeholder="${e(h.search)}" aria-label="${e(h.search)}" autocomplete="off" data-lang="${lang}"><ul class="s-search__list" id="tool-search-list" hidden></ul></div>
          <nav class="s-shortcuts" aria-label="${e(h.popularTitle)}">${chips.map(([href, name]) => `<a class="s-chip" href="${href}">${e(name)}</a>`).join('')}</nav>
        </div>
      </div>
    </section>

    <section class="s-section" id="categories">
      <div class="s-wrap">
        <h2>${e(P('browse', lang))}</h2>
        <div class="s-cards s-cards--cats">
          ${GROUP_ORDER.map(g => `<a class="s-card" data-cat="${g === 'pdf' ? 'organize' : GROUPS[g].cats[0]}" href="${hubPath(g, lang)}">${iconSvg(GROUPS[g].icon)}<span class="s-card__title">${e(groupName(g, lang))}</span><span class="s-card__desc">${e(g === 'pdf' ? P('pdfShort', lang) : GROUPS[g].short[LI[lang]])}</span><span class="s-card__count">${e(P('count', lang, { n: groupTools(g).length + (g === 'pdf' ? TOOLS.length : 0) }))}</span></a>`).join('')}
        </div>
      </div>
    </section>

    <section class="s-section s-section--tint">
      <div class="s-wrap">
        <h2>${e(h.popularTitle)}</h2>
        <p class="s-section__lede">${e(h.popularLede)}</p>
        ${toolGrid(lang, 'h3')}
      </div>
    </section>

    <section class="s-section" id="privacy">
      <div class="s-wrap s-privacy">
        ${stamp(c)}
        <div class="s-prose">
          <h2>${e(h.privacyTitle)}</h2>
          <p>${e(h.privacyText)}</p>
          <p><a href="${pagePath('privacy', lang)}">${e(h.privacyLink)} →</a></p>
        </div>
      </div>
    </section>

    <section class="s-section">
      <div class="s-wrap">
        <h2>${e(h.familyTitle)}</h2>
        <p class="s-section__lede">${e(h.familyLede)}</p>
        <div class="s-sisters">
          ${Object.entries(SISTER_SITES).map(([key, s]) => `<a class="s-sister" href="${s.host}/${lang}/" rel="noopener"><strong>${e(s.name)}</strong><span>${e(c.sisterSites[key])}</span><small>${e(s.host.replace('https://', ''))} ↗</small></a>`).join('')}
        </div>
      </div>
    </section>

    ${faqSection(c, h.faqs)}
  </main>
  ${footer(lang, paths)}
  <script type="module" src="${assetUrl('assets/js/search.js')}"></script>
</body>
</html>
`;
}

function hubPage(lang) {
  const c = content[lang];
  const h = c.hub;
  const paths = pathsFor('pdfTools');
  const crumbs = [[c.nav.home, `/${lang}/`], [h.name]];
  return `${head({ lang, title: h.title, desc: h.desc, paths, jsonLd: [ldApp(lang, h.name, h.desc, paths[lang], [...TOOLS.map(t => c.tools[t.id].name), ...groupTools('pdf').map(t => t.names[LI[lang]])]), ldCrumbs(crumbs), ldFaq(h.faqs)] })}
<body class="s-page">
  ${header(lang, paths, 'pdf')}
  <main id="main">
    <div class="s-wrap">
      ${breadcrumbs(crumbs)}
      <div class="s-toolhead">
        <h1>${e(h.h1)}</h1>
        <p>${e(h.lede)}</p>
      </div>
    </div>
    <section class="s-section" style="border-top:0;padding-top:0">
      <div class="s-wrap">${toolGrid(lang, 'h2')}
        <div class="s-cat">
          <div class="s-cat__head"><h2>${e(UCATS.documents.name[LI[lang]])}</h2></div>
          <div class="s-cards">${groupTools('pdf').map(t => ucard(lang, t)).join('')}</div>
        </div>
      </div>
    </section>
    ${CONVERT_TO_PDF.length ? `<section class="s-section s-section--tint">
      <div class="s-wrap">
        <h2>${e(h.convertTitle)}</h2>
        <p class="s-section__lede">${e(h.convertLede)}</p>
        ${sisterLinks(lang, CONVERT_TO_PDF)}
      </div>
    </section>` : ''}
    ${benefitsSection(c)}
    ${faqSection(c, h.faqs)}
  </main>
  ${footer(lang, paths)}
</body>
</html>
`;
}

function toolPage(lang, tool) {
  const c = content[lang];
  const t = c.tools[tool.id];
  const paths = toolPaths(tool);
  const isImage = tool.accept === 'image';
  const faqs = [...t.faqs, ...c.toolPage.sharedFaqs];
  const crumbs = [[c.nav.home, `/${lang}/`], [c.nav.pdfTools, pagePath('pdfTools', lang)], [t.name]];
  const jsonLd = [ldApp(lang, t.name, t.desc, paths[lang]), ldCrumbs(crumbs), ldHowTo(t.how, t.steps), ldFaq(faqs)];
  return `${head({ lang, title: t.title, desc: t.desc, paths, jsonLd })}
<body class="s-page">
  ${header(lang, paths, 'pdf')}
  <main id="main">
    <div class="s-wrap">
      ${breadcrumbs(crumbs)}
      <div class="s-toolhead">
        <h1>${e(t.h1)}</h1>
        <p>${e(t.lede)}</p>
      </div>
      <div class="pt" id="pdf-tool" data-tool="${tool.id}">
        <div class="pt-drop" data-accept="${isImage ? 'image/*' : '.pdf,application/pdf'}" data-multiple="${!!tool.multiple}">
          ${stamp(c)}
          ${iconSvg(tool.icon, 'pt-drop__icon')}
          <button class="s-btn s-btn--primary pt-drop__btn" type="button">${e(isImage ? (tool.multiple ? c.toolPage.chooseImages : c.toolPage.chooseImage) : (tool.multiple ? c.toolPage.choosePdfs : c.toolPage.choosePdf))}</button>
          <p class="pt-drop__or">${e(c.toolPage.orDrop)}</p>
          <p class="pt-drop__error" role="alert" hidden></p>
          <noscript><p class="pt-drop__error">${e(c.toolPage.noJs)}</p></noscript>
        </div>
        <div class="pt-stage" hidden></div>
        <ul class="s-trust">${c.toolPage.trust.map(x => `<li>${e(x)}</li>`).join('')}</ul>
        ${disclaimerFor(lang, tool) ? `<p class="s-disclaimer" role="note">${e(disclaimerFor(lang, tool))}</p>` : ''}
      </div>
    </div>

    <section class="s-section">
      <div class="s-wrap s-prose">
        <h2>${e(t.aboutTitle)}</h2>
        ${t.about.map(p => `<p>${e(p)}</p>`).join('')}
      </div>
    </section>
    ${howToSection(t.how, t.steps)}
    ${benefitsSection(c)}
    ${faqSection(c, faqs)}
    ${sisterSection(lang, tool.sister)}
    <section class="s-section s-section--tint">
      <div class="s-wrap">
        <h2>${e(c.toolPage.relatedTitle)}</h2>
        <div class="s-cards" style="margin-top:16px">${tool.related.map(id => card(lang, toolById(id))).join('')}</div>
      </div>
    </section>
  </main>
  ${footer(lang, paths)}
  <script type="module" src="${assetUrl('assets/js/pdf/main.js')}"></script>
</body>
</html>
`;
}


// ─── Utility tools ────────────────────────────────────────────────────────────

const ucard = (lang, t) => `<a class="s-card" data-cat="${t.cat}" href="${utilPath(t, lang)}">
          ${iconSvg(t.icon || UCATS[t.cat].icon)}
          <span class="s-card__title">${e(t.names[LI[lang]])}</span>
          <span class="s-card__desc">${e(t.shorts[LI[lang]])}</span>
        </a>`;
const anyCard = (lang, id) => toolById(id) ? card(lang, toolById(id)) : utilById(id) ? ucard(lang, utilById(id)) : '';
const exists = id => !!(toolById(id) || utilById(id));

function linkKeyUrl(key, lang) {
  const [site, path] = LINKS[key];
  const p = typeof path === 'string' ? path : path[lang];
  return `${SITES[site]}/${lang}/${p}`;
}
function utilLinksSection(lang, keys) {
  const list = (keys || []).filter(k => LINKS[k]);
  if (!list.length) return '';
  return `<section class="s-section">
    <div class="s-wrap">
      <h2>${e(P('alsoTitle', lang))}</h2>
      <p class="s-section__lede">${e(P('alsoLede', lang))}</p>
      <div class="s-links">${list.map(k => `<a href="${linkKeyUrl(k, lang)}" rel="noopener"><strong>${e(LINKS[k][2][LI[lang]])}</strong><small>${e(SITE_NAMES[LINKS[k][0]])} ↗</small></a>`).join('')}</div>
    </div>
  </section>`;
}

function utilTitle(lang, t) {
  const name = t.names[LI[lang]];
  return lang === 'en' ? (t.title || `${name} – ${P('suffix', 'en')}`) : `${name} – ${P('suffix', lang)}`;
}

const I18N = {};
for (const l of ['de', 'pl', 'cs']) { I18N[l] = {}; const d = new URL(`./tools/i18n/${l}/`, import.meta.url); if (existsSync(d)) for (const f of readdirSync(d).filter(x => x.endsWith('.mjs')).sort()) Object.assign(I18N[l], (await import(new URL(f, d).href)).default); }

function utilityPage(lang, tool0) {
  const c = content[lang];
  const tr = I18N[lang]?.[tool0.id];
  const tool = tr ? { ...tool0, about: tr[0], steps: tr[1], faqs: tr[2] } : tool0;
  const li = LI[lang];
  const name = tool.names[li], short = tool.shorts[li];
  const paths = Object.fromEntries(LANGS.map(l => [l, utilPath(tool, l)]));
  const title = utilTitle(lang, tool), desc = `${short} ${P('priv', lang)}`;
  const la = lang === 'en' || tr ? '' : ' lang="en"';
  const grp = GROUP_OF[tool.cat];
  const crumbs = [[c.nav.home, `/${lang}/`], [groupName(grp, lang), hubPath(grp, lang)], [name]];
  const faqs = [...tool.faqs, ...c.toolPage.sharedFaqs];
  const nOwn = tool.faqs.length;
  const related = (tool.related || []).filter(exists).slice(0, 4);
  const jsonLd = [ldApp(lang, name, desc, paths[lang]), ldCrumbs(crumbs), ldHowTo(`${P('howToUse', lang)}: ${name}`, tool.steps), ldFaq(faqs)];
  return `${head({ lang, title, desc, paths, jsonLd, unsafeEval: NEEDS_EVAL.has(tool.id) })}
<body class="s-page">
  ${header(lang, paths, grp)}
  <main id="main">
    <div class="s-wrap">
      ${breadcrumbs(crumbs)}
      <div class="s-toolhead">
        <h1>${e(name)}</h1>
        <p>${e(short)}</p>
      </div>
      <div class="pt">
        <div id="tool-root" data-tool="${tool.id}" data-cat="${tool.cat}"><p class="pt-hint">${e(P('loading', lang))}</p><noscript><p class="pt-drop__error">${e(c.toolPage.noJs)}</p></noscript></div>
        <ul class="s-trust">${c.toolPage.trust.map(x => `<li>${e(x)}</li>`).join('')}</ul>
        ${disclaimerFor(lang, tool) ? `<p class="s-disclaimer" role="note">${e(disclaimerFor(lang, tool))}</p>` : ''}
      </div>
    </div>

    <section class="s-section">
      <div class="s-wrap s-prose">
        <h2>${e(P('howItWorks', lang, { name }))}</h2>
        ${lang === 'en' || tr ? '' : `<p class="pt-hint">${e(P('note', lang))}</p>`}
        ${tool.about.map(p => `<p${la}>${e(p)}</p>`).join('')}
      </div>
    </section>
    <section class="s-section s-section--tint" id="how">
      <div class="s-wrap">
        <h2>${e(P('howToUse', lang))}</h2>
        <ol class="s-steps">${tool.steps.map(st => `<li><p${la}>${e(st)}</p></li>`).join('')}</ol>
      </div>
    </section>
    <section class="s-section" id="faq">
      <div class="s-wrap">
        <h2>${e(c.toolPage.faqTitle)}</h2>
        <div class="s-faq">
          ${faqs.map(([q, a], i) => { const l2 = i < nOwn ? la : ''; return `<details${i === 0 ? ' open' : ''}><summary${l2}>${e(q)}</summary><p${l2}>${e(a)}</p></details>`; }).join('\n          ')}
        </div>
      </div>
    </section>
    ${utilLinksSection(lang, tool.links)}
    ${related.length ? `<section class="s-section s-section--tint">
      <div class="s-wrap">
        <h2>${e(c.toolPage.relatedTitle)}</h2>
        <div class="s-cards" style="margin-top:16px">${related.map(id => anyCard(lang, id)).join('')}</div>
      </div>
    </section>` : ''}
  </main>
  ${footer(lang, paths)}
  <script type="module" src="${assetUrl('assets/js/tools/main.js')}"></script>
</body>
</html>
`;
}

function utilHubPage(lang, g) {
  const c = content[lang];
  const li = LI[lang];
  const grp = GROUPS[g];
  const paths = Object.fromEntries(LANGS.map(l => [l, hubPath(g, l)]));
  const items = groupTools(g);
  const title = lang === 'en' ? `${grp.h1[0]} – ${items.length} Free Tools, No Upload` : `${grp.h1[li]} – ${P('suffix', lang)}`;
  const desc = `${grp.short[li]} ${P('priv', lang)}`;
  const crumbs = [[c.nav.home, `/${lang}/`], [grp.name[li]]];
  const jsonLd = [ldCrumbs(crumbs), ldFaq(c.toolPage.sharedFaqs), {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: grp.h1[li], description: desc, url: `${SITE}${paths[lang]}`, inLanguage: lang,
    mainEntity: { '@type': 'ItemList', itemListElement: items.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}${utilPath(t, lang)}`, name: t.names[li] })) },
  }];
  const sections = grp.cats.map(cat => ({ cat, list: utilsOf(cat) })).filter(x => x.list.length);
  return `${head({ lang, title, desc, paths, jsonLd })}
<body class="s-page">
  ${header(lang, paths, g)}
  <main id="main">
    <div class="s-wrap">
      ${breadcrumbs(crumbs)}
      <div class="s-toolhead">
        <h1>${e(grp.h1[li])}</h1>
        <p>${e(grp.short[li])} ${e(P('hubLede', lang))}</p>
      </div>
    </div>
    <section class="s-section" style="border-top:0;padding-top:0">
      <div class="s-wrap">${sections.map(({ cat, list }) => `<div class="s-cat">
        ${sections.length > 1 ? `<div class="s-cat__head"><h2>${e(UCATS[cat].name[li])}</h2></div>` : ''}
        <div class="s-cards">${list.map(t => ucard(lang, t)).join('')}</div>
      </div>`).join('')}</div>
    </section>
    ${faqSection(c, c.toolPage.sharedFaqs)}
  </main>
  ${footer(lang, paths)}
</body>
</html>
`;
}

function llmsText(full) {
  const en = content.en; const lines = [];
  lines.push('# Ohfis', '', `> Free online tools that run entirely in your browser: PDF tools, text tools, CSV and spreadsheet tools, image tools, time and calendar tools, business calculators, IT and web helpers, notes and privacy tools, and team tools. Files and text are processed on the visitor's device and are never uploaded. No account, no watermark, no limits. Available in English, German, Polish and Czech.`, '');
  lines.push('## About', '', `- Site: ${SITE}/`, '- Languages: English (/en/), German (/de/), Polish (/pl/), Czech (/cs/). Every URL is translated: the tool name in each language is the URL, for example /en/case-converter/ and /de/gross-und-kleinschreibung-umwandeln/.', '- Privacy: all processing happens in the browser using JavaScript, Canvas, Web Crypto and WebAssembly. There is no server that receives files.', '- Operator: Andreas Dittes, Berlin, Germany. Contact: ohfis@dittes.info', `- Sitemap: ${SITE}/sitemap.xml`, '');
  lines.push('## PDF tools', '');
  for (const t of TOOLS) lines.push(`- [${en.tools[t.id].name}](${SITE}${toolPath(t, 'en')}): ${en.tools[t.id].desc}`);
  for (const cat of UCAT_ORDER) {
    const items = utilsOf(cat); if (!items.length) continue;
    lines.push('', `## ${UCATS[cat].name[0]}`, '', `${UCATS[cat].short[0]} Hub: ${SITE}${hubPath(GROUP_OF[cat], 'en')}`, '');
    for (const t of items) {
      lines.push(`- [${t.names[0]}](${SITE}${utilPath(t, 'en')}): ${t.shorts[0]}`);
      if (full) lines.push(`  ${t.about[0]}`, `  How to use: ${t.steps.join(' ')}`);
    }
  }
  lines.push('', '## Related sites by the same operator', '', ...Object.entries(SITE_NAMES).map(([k, n]) => `- [${n}](${SITES[k]}/): ${({ files: 'More PDF tools and file utilities', open: 'Open and view almost any file format in the browser', culators: 'Hundreds of calculators', test: 'Hardware, browser and ability tests' })[k]}`), '');
  return lines.join('\n');
}

function legalPage(lang, key) {
  const c = content[lang];
  const p = c[key];
  const paths = pathsFor(key);
  return `${head({ lang, title: p.title, desc: p.desc, paths })}
<body class="s-page">
  ${header(lang, paths)}
  <main id="main">
    <div class="s-wrap s-legal">
      <h1>${e(p.h1)}</h1>
      ${p.html}${key === 'imprint' ? imprintExtras(lang) : ''}
    </div>
  </main>
  ${footer(lang, paths)}
</body>
</html>
`;
}

// Tools added after the URLs were translated never lived at their English id in other languages, so they need no redirect.
const NEVER_PUBLISHED_AT_OLD_URL = new Set(['audio-cutter', 'audio-joiner', 'audio-volume-changer', 'audio-reverser', 'audio-equalizer', 'audio-converter', 'webcam-video-recorder', 'text-to-speech', 'zip-extractor', 'zip-creator', 'pdf-to-html', 'font-converter']);

function redirectPage(to) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Redirecting…</title>
  <meta name="robots" content="noindex">
  <link rel="canonical" href="${SITE}${to}">
  <meta http-equiv="refresh" content="0; url=${to}">
</head>
<body><p><a href="${to}">${to}</a></p><script>location.replace(${JSON.stringify(to)}+location.search+location.hash)</script></body>
</html>
`;
}

// ─── Site-level files ─────────────────────────────────────────────────────────

function rootPage() {
  const paths = pathsFor('home');
  const boot = `var L=${JSON.stringify(LANGS)},l='en';try{var v=localStorage.getItem('ohfis-lang');if(L.indexOf(v)>-1){l=v}else{var n=navigator.languages||[navigator.language||l];for(var i=0;i<n.length;i++){var c=String(n[i]).slice(0,2).toLowerCase();if(L.indexOf(c)>-1){l=c;break}}}}catch(e){}if(location.hash!=='#choose'){location.replace('/'+l+'/'+location.search+location.hash)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="${e(csp([THEME_BOOT, boot]))}">
  <title>Ohfis – PDF &amp; file tools · PDF- &amp; Datei-Tools · Narzędzia PDF · PDF nástroje</title>
  <meta name="description" content="${e(LANGS.map(l => content[l].home.short).join(' · '))}">
  <link rel="canonical" href="${SITE}/">
  ${LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${SITE}${paths[l]}">`).join('\n  ')}
  <link rel="alternate" hreflang="x-default" href="${SITE}/">
  <link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml">
  <script>${THEME_BOOT}</script>
  <link rel="stylesheet" href="${assetUrl('assets/css/site.css')}">
  <script>${boot}</script>
</head>
<body class="s-page">
  <main class="s-chooser">
    <div class="s-chooser__box">
      ${LOGO.replace('<svg', '<svg width="52" height="52"')}
      <h1>Ohfis</h1>
      <p>Choose your language · Sprache wählen · Wybierz język · Vyberte jazyk</p>
      <ul>
        ${LANGS.map(l => `<li><a href="/${l}/" hreflang="${l}" lang="${l}" data-set-lang="${l}">${LANG_NAMES[l]}<small>${e(content[l].home.short)}</small></a></li>`).join('\n        ')}
      </ul>
    </div>
  </main>
  <script src="${assetUrl('assets/js/site.js')}" defer></script>
</body>
</html>
`;
}

function notFoundPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Page not found – Ohfis</title>
  <link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml">
  <script>${THEME_BOOT}</script>
  <link rel="stylesheet" href="/assets/css/site.css">
</head>
<body class="s-page">
  <main class="s-chooser">
    <div class="s-chooser__box">
      ${LOGO.replace('<svg', '<svg width="52" height="52"')}
      <h1>404</h1>
      <p>Page not found · Seite nicht gefunden · Nie znaleziono strony · Stránka nenalezena</p>
      <ul>
        ${LANGS.map(l => `<li><a href="${pagePath('pdfTools', l)}" hreflang="${l}" lang="${l}">${e(content[l].nav.pdfTools)}<small>${LANG_NAMES[l]}</small></a></li>`).join('\n        ')}
      </ul>
    </div>
  </main>
</body>
</html>
`;
}

function sitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const groups = [
    ...Object.keys(PAGES).map(pathsFor),
    ...TOOLS.map(toolPaths),
    ...GROUP_ORDER.filter(g => g !== 'pdf').map(g => Object.fromEntries(LANGS.map(l => [l, hubPath(g, l)]))),
    ...UTOOLS.map(t => Object.fromEntries(LANGS.map(l => [l, utilPath(t, l)]))),
  ];
  const entries = [];
  for (const paths of groups) {
    const links = LANGS.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${paths[l]}"/>`).join('\n');
    const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${paths.en}"/>`;
    for (const lang of LANGS) {
      entries.push(`  <url>\n    <loc>${SITE}${paths[lang]}</loc>\n    <lastmod>${today}</lastmod>\n${links}\n${xDefault}\n  </url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;
}

function listFiles(dir, filter) {
  const out = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...listFiles(rel, filter));
    else if (filter(rel)) out.push(`/${rel}`);
  }
  return out;
}

function serviceWorker() {
  const shell = [
    '/',
    '/manifest.webmanifest',
    '/assets/icons/icon.svg',
    ...listFiles('assets/css', () => true),
    ...listFiles('assets/fonts', () => true),
    ...listFiles('assets/i18n', () => true),
    ...listFiles('assets/js', f => !f.endsWith('tests.js')),
  ];
  const fingerprint = createHash('sha1');
  for (const f of shell.filter(f => f.startsWith('/assets'))) fingerprint.update(readFileSync(join(ROOT, f.slice(1))));
  return readFileSync(join(BUILD, 'service-worker.template.js'), 'utf8')
    .replace('__VERSION__', fingerprint.digest('hex').slice(0, 10))
    .replace('__SHELL_FILES__', JSON.stringify(shell, null, 2));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

for (const lang of LANGS) rmSync(join(ROOT, lang), { recursive: true, force: true });

// Runtime URL table for "continue with" links, read by the PDF tools
for (const lang of LANGS) {
  const routes = Object.fromEntries(TOOLS.map(t => [t.id, { url: toolPath(t, lang), name: content[lang].tools[t.id].name }]));
  write(`assets/i18n/routes.${lang}.js`, `// Generated by build/build.mjs\nexport default ${JSON.stringify(routes)};\n`);
}

let pages = 0;
for (const lang of LANGS) {
  write(`${lang}/index.html`, homePage(lang));
  write(`${lang}/${PAGES.pdfTools[lang]}/index.html`, hubPage(lang));
  for (const tool of TOOLS) write(`${lang}/${tool.slugs[lang]}/index.html`, toolPage(lang, tool));
  write(`${lang}/${PAGES.privacy[lang]}/index.html`, legalPage(lang, 'privacy'));
  write(`${lang}/${PAGES.imprint[lang]}/index.html`, legalPage(lang, 'imprint'));
  for (const g of GROUP_ORDER) if (g !== 'pdf') { write(`${lang}/${GROUPS[g].slug[LI[lang]]}/index.html`, utilHubPage(lang, g)); pages++; }
  for (const tool of UTOOLS) { write(`${lang}/${tool.slugs[lang]}/index.html`, utilityPage(lang, tool)); pages++; }
  // Old URLs (English tool id in every language, the ten former category hubs) forward to the new ones
  const taken = new Set([...UTOOLS.map(t => t.slugs[lang]), ...GROUP_ORDER.filter(g => g !== 'pdf').map(g => GROUPS[g].slug[LI[lang]])]);
  for (const t of UTOOLS) if (!taken.has(t.id) && !NEVER_PUBLISHED_AT_OLD_URL.has(t.id) && t.cat !== 'video') write(`${lang}/${t.id}/index.html`, redirectPage(utilPath(t, lang)));
  for (const cat of UCAT_ORDER) if (!taken.has(UCATS[cat].slug)) write(`${lang}/${UCATS[cat].slug}/index.html`, redirectPage(hubPath(GROUP_OF[cat], lang)));
  pages += TOOLS.length + 4;
}

// Search index for the tool finder on the home page
for (const lang of LANGS) {
  const li = LI[lang]; const idx = [
    ...TOOLS.map(t => ({ n: content[lang].tools[t.id].name, d: content[lang].tools[t.id].short, u: toolPath(t, lang), c: content[lang].nav.pdfTools })),
    ...UTOOLS.map(t => ({ n: t.names[li], d: t.shorts[li], u: utilPath(t, lang), c: groupName(GROUP_OF[t.cat], lang), k: t.names[0] })),
  ];
  write(`assets/i18n/search.${lang}.js`, `// Generated by build/build.mjs\nexport default ${JSON.stringify(idx)};\n`);
}
// UI labels for the utility tools, read at runtime by assets/js/tools/kit.js
for (const lang of LANGS) write(`assets/i18n/ut.${lang}.js`, `// Generated by build/build.mjs from build/content/ui.mjs\nexport default ${JSON.stringify(UI[lang])};\n`);
// Translations of the English texts written inside the tools (labels, buttons, options, hints, sample texts).
// build/tools/ui/keys.json lists the English strings; build/tools/ui/<lang>.txt holds one translation per line, in the same order
// (a line break inside a text is written as ⏎; an empty line means "not translated yet", the tool then shows the English text).
{
  const keys = JSON.parse(readFileSync(join(BUILD, 'tools/ui/keys.json'), 'utf8'));
  for (const lang of LANGS.filter(l => l !== 'en')) {
    const file = join(BUILD, `tools/ui/${lang}.txt`), map = {};
    if (existsSync(file)) readFileSync(file, 'utf8').split('\n').forEach((line, i) => { const v = line.replaceAll('⏎', '\n'); if (keys[i] != null && v.trim() && v !== keys[i]) map[keys[i]] = v; });
    write(`assets/i18n/tr.${lang}.js`, `// Generated by build/build.mjs from build/tools/ui\nexport default ${JSON.stringify(map)};\n`);
  }
}

// Content of the navigation dropdowns, loaded on first open: { group: { all, url, cols: [[heading, [[name, url], …]], …] } }
for (const lang of LANGS) {
  const li = LI[lang], c = content[lang], menu = {};
  for (const g of GROUP_ORDER) {
    const cols = [];
    if (g === 'pdf') {
      for (const cat of CATEGORIES) cols.push([c.cats[cat], TOOLS.filter(t => t.cat === cat).map(t => [c.tools[t.id].name, toolPath(t, lang)])]);
      cols.push([UCATS.documents.name[li], utilsOf('documents').map(t => [t.names[li], utilPath(t, lang)])]);
    } else {
      const multi = GROUPS[g].cats.length > 1;
      for (const cat of GROUPS[g].cats) cols.push([multi ? UCATS[cat].name[li] : '', utilsOf(cat).map(t => [t.names[li], utilPath(t, lang)])]);
    }
    const short = nm => nm.replace(/\s*\([^)]*\)\s*$/, '');
    for (const col of cols) col[1] = col[1].map(([nm, u]) => [short(nm), u]);
    const n = cols.reduce((k, x) => k + x[1].length, 0);
    menu[g] = { all: P('showAll', lang, { n }), url: hubPath(g, lang), cols: cols.filter(x => x[1].length) };
  }
  write(`assets/i18n/menu.${lang}.js`, `// Generated by build/build.mjs\nexport default ${JSON.stringify(menu)};\n`);
}
write('llms.txt', llmsText(false));
write('llms-full.txt', llmsText(true));
// Related ids that point nowhere yet (tools planned but not built)
const dangling = [...new Set(UTOOLS.flatMap(t => (t.related || []).filter(id => !exists(id))))];
if (dangling.length) console.log(`Note: ${dangling.length} related tool ids are not built yet: ${dangling.join(', ')}`);

write('index.html', rootPage());
write('assets/icons/icon.svg', LOGO_SVG);
write('favicon.svg', LOGO_SVG);
write('manifest.webmanifest', JSON.stringify({
  name: 'Ohfis', short_name: 'Ohfis', description: content.en.home.short, id: '/', start_url: '/en/', scope: '/',
  display: 'standalone', background_color: '#ffffff', theme_color: '#2557d6', lang: 'en', categories: ['productivity', 'utilities'],
  icons: [
    { src: '/assets/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/assets/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/assets/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: '/assets/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
  ],
}, null, 2) + '\n');
write('404.html', notFoundPage());
write('sitemap.xml', sitemap());
write('robots.txt', ['User-agent: *', 'Allow: /', '', ...['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider'].flatMap(b => [`User-agent: ${b}`, 'Allow: /', '']), `Sitemap: ${SITE}/sitemap.xml`, ''].join('\n'));
write('service-worker.js', serviceWorker());


console.log(`Built ${pages} pages in ${LANGS.length} languages (${TOOLS.length} PDF tools).`);
