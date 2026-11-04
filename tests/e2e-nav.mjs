// e2e-nav.mjs — the section dropdowns in the header: hover, click, keyboard, mobile.
//   PW=$(npm root -g)/playwright node tests/e2e-nav.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; try { const f = join(ROOT, p); if ((await stat(f)).isDirectory()) { res.writeHead(301, { Location: p + '/' }); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' }); res.end(await readFile(f)); } catch { res.writeHead(404); res.end(); } }).listen(0);
const base = `http://localhost:${server.address().port}`;
const browser = await chromium.launch(); const errors = [];
try {
  // desktop: hover opens, links are real, one open at a time, Escape closes
  let page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && !/favicon/.test(m.text()) && errors.push(m.text()));
  await page.goto(`${base}/de/`); const item = g => page.locator(`.s-navitem[data-group=${g}]`);
  await item('text').hover(); await page.waitForSelector('#drop-text:not([hidden])'); const links = await page.locator('#drop-text .s-drop__col a').count(); assert.ok(links > 40, 'text dropdown lists many tools: ' + links);
  assert.ok((await page.locator('#drop-text h3').allInnerTexts()).length === 2, 'two sub-headings (text, notes)'); assert.match(await page.locator('#drop-text .s-drop__all').innerText(), /Alle \d+ Tools ansehen/);
  await item('pdf').hover(); await page.waitForSelector('#drop-pdf:not([hidden])'); assert.ok(await page.locator('#drop-text').isHidden(), 'only one dropdown open'); assert.ok(await page.locator('#drop-pdf a[href="/de/pdf-zusammenfuegen/"]').count() === 1, 'Merge PDF is in the PDF menu');
  await page.keyboard.press('Escape'); await page.mouse.move(10, 600); await page.waitForTimeout(400); assert.ok(await page.locator('#drop-pdf').isHidden(), 'closes');
  // click on the arrow toggles; clicking a link goes there
  await item('time').locator('.s-navtoggle').click(); await page.waitForSelector('#drop-time:not([hidden])'); assert.equal(await item('time').locator('.s-navtoggle').getAttribute('aria-expanded'), 'true');
  await page.locator('#drop-time a', { hasText: 'Arbeitstage' }).first().click(); await page.waitForLoadState('load'); assert.match(page.url(), /\/de\/arbeitstage-rechner\//); assert.ok(await page.locator('.s-navitem[data-group=time] .s-navlink[aria-current=page]').count() === 1, 'current section highlighted');
  // the section name itself still goes to the hub
  await item('dev').locator('.s-navlink').click(); await page.waitForLoadState('load'); assert.match(page.url(), /\/de\/it-und-web-werkzeuge\/$/);
  // keyboard: Tab to the toggle, Enter opens, Escape closes and keeps focus on the toggle
  await item('data').locator('.s-navtoggle').focus(); await page.keyboard.press('Enter'); await page.waitForSelector('#drop-data:not([hidden])'); await page.keyboard.press('Escape'); assert.ok(await page.locator('#drop-data').isHidden()); assert.equal(await page.evaluate(() => document.activeElement.className), 's-navtoggle');
  // quick search: "/" opens, typing finds, arrows + Enter open, Escape closes; Ctrl+K works too
  await page.goto(`${base}/de/`); await page.keyboard.press('/'); await page.waitForSelector('dialog.s-sq[open]'); assert.ok(await page.locator('.s-sq__item').count() === 7, 'sections shown first');
  await page.keyboard.type('zeichenz'); await page.waitForSelector('.s-sq__item strong'); assert.match(await page.locator('.s-sq__item strong').first().innerText(), /Zeichenzähler/); await page.keyboard.press('Escape'); assert.equal(await page.locator('dialog.s-sq[open]').count(), 0, 'escape closes');
  await page.keyboard.press('Control+k'); await page.waitForSelector('dialog.s-sq[open]'); await page.keyboard.type('xqzxqz'); await page.waitForSelector('.s-sq__empty'); await page.fill('.s-sq__input', 'pdf zusammen'); await page.waitForSelector('.s-sq__item'); await page.keyboard.press('Enter'); await page.waitForURL(/pdf-zusammenfuegen/);
  assert.ok(!/\([^)]*\)\s*$/.test(await page.evaluate(async () => (await import('/assets/i18n/menu.de.js')).default.pdf.cols.at(-1)[1][0][0])), 'menu names carry no parenthetical');
  await page.close();
  // mobile: burger shows the sections, the arrow opens the list inline
  page = await browser.newPage({ viewport: { width: 390, height: 800 } }); page.on('pageerror', e => errors.push(e.message)); await page.goto(`${base}/pl/`);
  await page.locator('.s-burger').click(); await page.locator('.s-navitem[data-group=images] .s-navtoggle').click(); await page.waitForSelector('#drop-images:not([hidden])'); assert.ok(await page.locator('#drop-images .s-drop__col a').count() > 20); assert.ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'no horizontal scroll on mobile');
  assert.equal(errors.length, 0, errors.join(' | ')); console.log('✓ navigation dropdowns');
} catch (e) { console.log('✗ ' + e.message.split('\n')[0]); process.exitCode = 1; } finally { await browser.close(); server.close(); }
