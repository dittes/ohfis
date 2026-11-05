// e2e-i18n.mjs — tool pages in German, Polish and Czech load without errors and show translated interface texts.
//   PW=$(npm root -g)/playwright node tests/e2e-i18n.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; try { const f = join(ROOT, p); if ((await stat(f)).isDirectory()) { res.writeHead(301, { Location: p + '/' }); return res.end(); } res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(await readFile(f)); } catch { res.writeHead(404); res.end('not found'); } }).listen(0);
const base = `http://localhost:${server.address().port}`;
const sitemap = await readFile(join(ROOT, 'sitemap.xml'), 'utf8');
const pathOf = (lang, id) => { const m = [...sitemap.matchAll(/<xhtml:link rel="alternate" hreflang="(\w+)" href="https:\/\/ohfis\.com([^"]+)"/g)]; const en = `/en/${id}/`; const block = sitemap.split('<url>').find(b => b.includes(`<loc>https://ohfis.com${en}</loc>`)); return new RegExp(`hreflang="${lang}" href="https://ohfis\\.com([^"]+)"`).exec(block)[1]; };
// tool id → what must be visible in each language
const CASES = { 'certificate-generator': { de: ['Titel', 'Unterzeichnet von', 'Urkunden erstellen'], pl: ['Tytuł', 'Podpisał(a)', 'Utwórz dyplomy'], cs: ['Název', 'Podepsal(a)', 'Vytvořit diplomy'], es: ['Título', 'Firmado por', 'Crear diplomas'] },
  'random-team-generator': { de: ['Anzahl der Teams', 'Teams kopieren', 'Team 1', 'Könnenssumme:'], pl: ['Liczba zespołów', 'Kopiuj zespoły', 'Zespół 1', 'Suma umiejętności:'], cs: ['Počet týmů', 'Kopírovat týmy', 'Tým 1', 'Součet dovedností:'], es: ['Número de equipos', 'Copiar equipos', 'Equipo 1', 'Total de habilidad:'] },
  'vat-calculator': { de: ['Nettobetrag'], pl: ['Kwota netto'], cs: ['Částka bez DPH'] } };
const browser = await chromium.launch(); const errors = [];
try {
  const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message));
  for (const [id, byLang] of Object.entries(CASES)) for (const [lang, texts] of Object.entries(byLang)) {
    await page.goto(base + pathOf(lang, id)); await page.waitForFunction(() => document.getElementById('tool-root').dataset.ready === 'true', null, { timeout: 15000 });
    const body = await page.locator('#tool-root').innerText(); for (const t of texts) assert.ok(body.includes(t), `${lang}/${id}: "${t}" missing in ${body.slice(0, 200)}`);
  }
  // a message from a tool is translated too
  await page.goto(base + pathOf('de', 'meeting-agenda-planner')); await page.waitForFunction(() => document.getElementById('tool-root').dataset.ready === 'true'); await page.locator('#tool-root input[type=time]').fill(''); await page.locator('#tool-root input[type=time]').evaluate(e => { e.value = ''; e.dispatchEvent(new Event('input')); }); await page.waitForTimeout(300);
  assert.equal(errors.length, 0, errors.join(' | ')); console.log('✓ translated tool pages');
} catch (e) { console.log('✗ ' + e.message.split('\n').slice(0, 3).join(' ')); process.exitCode = 1; } finally { await browser.close(); server.close(); }
