// e2e-nav.mjs — header navigation (twelve flat links), quick search, favourites and recently used.
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
  let page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/de/`);
  // twelve plain links, no dropdowns, no horizontal overflow
  assert.deepEqual(await page.locator('.s-nav > a').allInnerTexts(), ['PDF', 'Dokumente', 'Text', 'Notizen', 'Tabellen', 'Bilder', 'Video', 'Audio', 'Zeit', 'Business', 'Rechner', 'Team', 'IT']);
  assert.equal(await page.locator('.s-drop, .s-navtoggle').count(), 0, 'no dropdowns');
  assert.ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'no overflow at 1280');
  await page.locator('.s-nav > a', { hasText: 'Notizen' }).click(); await page.waitForLoadState('load'); assert.match(page.url(), /\/de\/notizen-werkzeuge\/$/); assert.ok((await page.locator('.s-card').count()) > 10, 'hub lists tools');
  assert.equal(await page.locator('.s-nav > a[aria-current=page]').innerText(), 'Notizen');
  // every hub opens and lists tools; old hub addresses forward
  for (const l of await page.locator('.s-nav > a').evaluateAll(a => a.map(x => x.href))) { await page.goto(l); assert.ok((await page.locator('.s-card').count()) >= 3, l); }
  await page.goto(`${base}/de/bild-und-medien-werkzeuge/`); await page.waitForURL(/bild-werkzeuge/);
  // quick search: "/" opens, typing finds, typos and synonyms work, Escape closes, Ctrl+K opens
  await page.goto(`${base}/de/`); await page.waitForLoadState('load'); await page.waitForTimeout(300); await page.keyboard.press('/'); await page.waitForSelector('dialog.s-sq[open]'); assert.equal(await page.locator('.s-sq__item').count(), 13, 'thirteen sections shown first');
  await page.keyboard.type('zeichenz'); await page.waitForSelector('.s-sq__item strong'); assert.match(await page.locator('.s-sq__item strong').first().innerText(), /Zeichenzähler/);
  await page.fill('.s-sq__input', 'zusamenfügen'); await page.waitForTimeout(250); assert.match(await page.locator('.s-sq__item strong').first().innerText(), /zusammenfügen/i, 'one typo tolerated');
  await page.fill('.s-sq__input', 'unterschrift'); await page.waitForTimeout(250); assert.match((await page.locator('.s-sq__item strong').allInnerTexts()).join('|'), /unterschreiben/i, 'synonym');
  await page.keyboard.press('Escape'); assert.equal(await page.locator('dialog.s-sq[open]').count(), 0);
  await page.keyboard.press('Control+k'); await page.waitForSelector('dialog.s-sq[open]'); await page.fill('.s-sq__input', 'xqzxqz'); await page.waitForSelector('.s-sq__empty'); await page.fill('.s-sq__input', 'pdf zusammen'); await page.waitForSelector('.s-sq__item'); await page.keyboard.press('Enter'); await page.waitForURL(/pdf-zusammenfuegen/);
  // favourites and recently used (kept in this browser)
  await page.goto(`${base}/de/mwst-rechner/`); await page.click('.s-fav'); assert.equal(await page.getAttribute('.s-fav', 'aria-pressed'), 'true');
  await page.goto(`${base}/de/`); const mine = await page.locator('.s-mine').innerText(); assert.match(mine, /Favoriten[\s\S]*MwSt/); assert.match(mine, /Zuletzt benutzt[\s\S]*zusammenfügen/);
  await page.close();
  // mobile: burger shows the twelve links
  page = await browser.newPage({ viewport: { width: 390, height: 800 } }); page.on('pageerror', e => errors.push(e.message)); await page.goto(`${base}/pl/`);
  assert.ok(await page.locator('.s-nav > a').first().isHidden()); await page.locator('.s-burger').click(); assert.equal(await page.locator('.s-nav > a:visible').count(), 13);
  assert.ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'no overflow on mobile');
  assert.equal(errors.length, 0, errors.join(' | ')); console.log('✓ navigation, search, favourites');
} catch (e) { console.log('✗ ' + e.message.split('\n').slice(0, 3).join(' ')); process.exitCode = 1; } finally { await browser.close(); server.close(); }
