// e2e.mjs — opens every utility tool in headless Chromium, types its sample input and checks the output.
//   PW=$(npm root -g)/playwright node tests/e2e.mjs [tool-id ...]
// Custom interactions for tools that need more than "type text" live in tests/e2e-custom.mjs.

import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import UTOOLS from '../build/tools/index.mjs';
import custom from './e2e-custom.mjs';

const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.gz': 'application/gzip' };

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  try { const file = join(ROOT, path); if ((await stat(file)).isDirectory()) { res.writeHead(301, { Location: path + '/' }); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file)); }
  catch { res.writeHead(404); res.end('not found'); }
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const only = process.argv.slice(2);
const tools = UTOOLS.filter(t => !only.length || only.includes(t.id));
const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--auto-select-desktop-capture-source=Entire screen', '--autoplay-policy=no-user-gesture-required'] });
let failed = 0;

async function run(tool) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write', 'microphone', 'camera'] });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource.*(404)/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !r.url().includes('favicon')) errors.push(`HTTP ${r.status()} ${r.url().replace(base, '')}`); });
  try {
    await page.goto(`${base}/en/${tool.id}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('tool-root')?.dataset.ready, null, { timeout: 15000 });
    const state = await page.evaluate(() => document.getElementById('tool-root').dataset.ready);
    if (state !== 'true') throw new Error('tool failed to mount: ' + await page.locator('#tool-root').innerText());
    if (!['encrypted-note-link'].includes(tool.id)) { const shown = await page.locator('#tool-root .pt-drop__error:visible, #tool-root [role=alert]:visible').allInnerTexts(); if (shown.some(t => t.trim())) throw new Error('error shown on first render: ' + shown.join(' | ').slice(0, 200)); }
    if (custom[tool.id]) await custom[tool.id](page, base);
    else if (tool.test) {
      const [input, expect] = tool.test;
      if (input) { const ta = page.locator('#tool-root textarea:not([readonly])').first(); await ta.fill(input); }
      await page.waitForTimeout(400);
      const text = await page.evaluate(() => { const r = document.getElementById('tool-root'); return r.innerText + '\n' + [...r.querySelectorAll('textarea,input')].map(x => x.value).join('\n'); });
      if (!text.includes(expect)) throw new Error(`expected output to contain ${JSON.stringify(expect)}; got ${JSON.stringify(text.slice(0, 300))}`);
    }
    // the German page must load too (localised chrome, same tool)
    await page.goto(`${base}/de/${tool.id}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('tool-root')?.dataset.ready, null, { timeout: 15000 });
    if (errors.length) throw new Error(errors.join(' | '));
    return null;
  } catch (e) { return e.message.split('\n')[0].slice(0, 400); }
  finally { await ctx.close(); }
}

for (const tool of tools) {
  const err = await run(tool);
  if (err) { failed++; console.log(`✗ ${tool.id}: ${err}`); } else console.log(`✓ ${tool.id}`);
}
console.log(`\n${tools.length - failed}/${tools.length} tools passed`);
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
