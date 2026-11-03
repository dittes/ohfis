// make-icons.mjs
// Renders the logo to PNG (app icons, favicon, social card). Needs Playwright with Chromium:
//   PW=$(npm root -g)/playwright node build/make-icons.mjs
// The SVG itself is written by build.mjs; PNGs only change when the logo does.

import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOGO_SVG, LOGO_MARK } from './icons.mjs';

const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(ROOT, 'assets/icons'), { recursive: true });

const browser = await chromium.launch();

async function shot(html, width, height, out, { transparent = false } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0;background:${transparent ? 'transparent' : '#fff'}}svg{display:block}</style>${html}`);
  await page.screenshot({ path: join(ROOT, out), omitBackground: transparent });
  await page.close();
}

const sized = (svg, px) => svg.replace('<svg ', `<svg width="${px}" height="${px}" `);
for (const px of [192, 512]) await shot(sized(LOGO_SVG, px), px, px, `assets/icons/icon-${px}.png`, { transparent: true });
await shot(sized(LOGO_SVG, 32), 32, 32, 'favicon-32.png', { transparent: true });

// Apple touch icon: iOS rounds the corners itself, so fill the whole square
const fullBleed = px => `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 32 32">${LOGO_MARK.replace('rx="8"', 'rx="0"')}</svg>`;
await shot(fullBleed(180), 180, 180, 'assets/icons/apple-touch-icon.png');
// Maskable: logo inside the 80% safe zone on a full-bleed tile
await shot(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 32 32">${LOGO_MARK.replace('rx="8"', 'rx="0"').replace(/<g transform="translate\(16 16\) scale\(1\.16\)/, '<g transform="translate(16 16) scale(1.16)')}<rect width="32" height="32" fill="none"/></svg>`.replace('viewBox="0 0 32 32"', 'viewBox="-4 -4 40 40"').replace('<rect width="32" height="32" rx="0" fill="url(#ohfis-g)"/>', '<rect x="-4" y="-4" width="40" height="40" fill="url(#ohfis-g)"/>'), 512, 512, 'assets/icons/maskable-512.png');

// Social card
const card = `<div style="width:1200px;height:630px;box-sizing:border-box;padding:80px;display:flex;flex-direction:column;justify-content:space-between;font-family:'Inter Variable',Inter,system-ui,sans-serif;color:#171b24;background:radial-gradient(ellipse 80% 70% at 85% 0%,#dde7fb 0%,#fff 62%)">
  <div style="display:flex;align-items:center;gap:22px">${sized(LOGO_SVG, 84)}<span style="font-size:52px;font-weight:700;letter-spacing:-.03em">OHFIS</span></div>
  <div>
    <div style="font-size:78px;line-height:1.04;font-weight:700;letter-spacing:-.04em;max-width:960px">Every PDF tool you need,<br><span style="color:#2557d6">right in your browser.</span></div>
    <div style="margin-top:28px;font-size:30px;color:#3d4452">Free · No upload · No account · EN · DE · PL · CS</div>
  </div></div>`;
await shot(card, 1200, 630, 'assets/icons/og-image.png');
await browser.close();
console.log('Icons written to assets/icons and favicon-32.png');
