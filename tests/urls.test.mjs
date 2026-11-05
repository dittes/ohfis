// Checks the generated site: translated URLs, working internal links, redirects from the old URLs, simplified chrome.
// Run `node build/build.mjs` first (the output is committed, so this reads the built files).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['en', 'de', 'pl', 'cs', 'es', 'fr'];
const read = p => readFileSync(join(ROOT, p), 'utf8');
const pagesOf = lang => readdirSync(join(ROOT, lang)).filter(d => statSync(join(ROOT, lang, d)).isDirectory() && existsSync(join(ROOT, lang, d, 'index.html')));
const isRedirect = html => html.includes('http-equiv="refresh"');
const canonical = html => /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];

test('every real page has a unique canonical URL that matches its folder', () => {
  const seen = new Set();
  for (const lang of LANGS) for (const d of pagesOf(lang)) {
    const html = read(`${lang}/${d}/index.html`);
    if (isRedirect(html)) continue;
    const c = canonical(html);
    assert.equal(c, `https://ohfis.com/${lang}/${d}/`, `${lang}/${d}`);
    assert.ok(!seen.has(c), `duplicate ${c}`); seen.add(c);
  }
  assert.ok(seen.size > 900);
});

test('translated pages use translated URLs (no English tool slugs outside /en/)', () => {
  const en = new Set(pagesOf('en').filter(d => !isRedirect(read(`en/${d}/index.html`))));
  for (const lang of ['de', 'pl', 'cs', 'es', 'fr']) {
    const real = pagesOf(lang).filter(d => !isRedirect(read(`${lang}/${d}/index.html`)));
    const same = real.filter(d => en.has(d));
    // international loan words (e.g. "ocr-pdf", "qr-code-generator", "kanban-board") are legitimately identical
    assert.ok(same.length <= 16, `${lang}: ${same.length} URLs identical to English: ${same.join(', ')}`);
  }
});

test('old URLs redirect to existing pages', () => {
  let n = 0;
  for (const lang of LANGS) for (const d of pagesOf(lang)) {
    const html = read(`${lang}/${d}/index.html`);
    if (!isRedirect(html)) continue;
    const to = /url=([^"]+)"/.exec(html)[1];
    assert.ok(existsSync(join(ROOT, to, 'index.html')), `${lang}/${d} -> ${to}`);
    n++;
  }
  assert.ok(n > 400, `only ${n} redirects`);
});

test('all internal links on all pages resolve', () => {
  const broken = [];
  for (const lang of LANGS) for (const d of ['', ...pagesOf(lang)]) {
    const file = d ? `${lang}/${d}/index.html` : `${lang}/index.html`;
    const html = read(file);
    if (isRedirect(html)) continue;
    for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
      const href = m[1];
      if (href.startsWith('/assets/') || /\.(png|svg|webmanifest|txt|xml|ico)$/.test(href)) continue;
      if (!existsSync(join(ROOT, href, 'index.html'))) broken.push(`${file} -> ${href}`);
    }
  }
  assert.deepEqual(broken.slice(0, 10), []);
});

test('navigation has 12 plain section links, the footer only legal links and no language links', () => {
  for (const lang of LANGS) {
    const html = read(`${lang}/index.html`);
    const nav = /<nav class="s-nav"[^>]*>([\s\S]*?)<\/nav>/.exec(html)[1];
    assert.equal((nav.match(/<a /g) || []).length, 12, lang);
    assert.ok(!/<details/.test(nav));
    const footer = /<footer[\s\S]*?<\/footer>/.exec(html)[0];
    assert.equal((footer.match(/<a /g) || []).length, 2, `${lang} footer links`);
    assert.ok(!footer.includes('data-set-lang'));
  }
});

test('merge and compress are listed under the PDF section, not as own nav items', () => {
  const html = read('en/pdf-tools/index.html');
  assert.ok(html.includes('href="/en/merge-pdf/"') && html.includes('href="/en/compress-pdf/"'));
  const nav = /<nav class="s-nav"[^>]*>([\s\S]*?)<\/nav>/.exec(html)[1];
  assert.ok(!nav.includes('merge-pdf') && !nav.includes('compress-pdf'));
});

test('sitemap lists only real pages', () => {
  const urls = [...read('sitemap.xml').matchAll(/<loc>https:\/\/ohfis\.com([^<]+)<\/loc>/g)].map(m => m[1]);
  for (const u of urls) assert.ok(existsSync(join(ROOT, u, 'index.html')) || u === '/', u);
  assert.ok(urls.length > 900);
});
